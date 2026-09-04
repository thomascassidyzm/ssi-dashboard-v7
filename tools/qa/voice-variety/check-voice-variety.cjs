#!/usr/bin/env node
/**
 * CHECK 1 — does the variety a voice carries match the variety the course
 * claims to teach, on the TARGET side?
 *
 * READ-ONLY. It recasts nothing, renders nothing, deletes nothing. Which native
 * voice should replace a wrong one is Tom's ear and nobody else's; this only
 * says which pairings are making a false claim.
 *
 * The rule and the two hand-chosen defaults live in ./variety.cjs — read that
 * header first, it is the whole argument.
 *
 * ── SCOPE, STATED SO IT CAN BE OVERRULED ────────────────────────────────────
 * Roles judged: `target1` and `target2` only. `known` is exempt (Tom: the known
 * side may be anyone, because there is nothing there to acquire); `instruction`
 * and `encouragement` are the guide roles and resolve against the KNOWN
 * language — the app talking to the learner, not material; `presentation` is
 * the intro/clone voice and is excluded from the language cast already
 * (services/shared/language-voice-cast.cjs).
 *
 * ── THREE LAYERS, BECAUSE THEY DISAGREE AND THE DISAGREEMENT IS THE POINT ───
 * A voice reaches a learner through three separate statements, and on 2026-09-04
 * they do not say the same thing:
 *
 *   clips     — the voices actually linked to this course's target-side rows.
 *               WHAT THE LEARNER HEARS TODAY. The strongest statement there is.
 *   stored    — courses.voice_config: what the course says it renders in, and
 *               what the existing clips were rendered from.
 *   resolved  — services/shared/language-voice-cast.cjs, the one reader on the
 *               render path: what the NEXT render would choose.
 *
 * Judging only `resolved` would have missed the calibration specimen entirely:
 * job #446's 147 draft cast rows landed hours before this check was written and
 * overlay ara_for_eng's Azure Saudi config with Cartesia voices, so the Saudi
 * voices are invisible in `resolved` while every Saudi clip is still sitting in
 * the course a learner opens. A check that reported that course clean would
 * have been worse than no check.
 *
 * ── CALIBRATION ─────────────────────────────────────────────────────────────
 * `ara_for_eng` is Modern Standard Arabic wired to Azure ar-SA voices. A check
 * that runs clean over the estate while that sits in it is a broken check that
 * would then be trusted nightly, so --calibrate reproduces it explicitly and
 * refuses to report estate numbers if it cannot.
 *
 *   node tools/qa/voice-variety/check-voice-variety.cjs [--calibrate] [--json FILE] [--quiet]
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env.psql') });
const fs = require('fs');
const { Client } = require('pg');
const { COURSE_CAST_FIELDS, targetCastKey, baseLanguageOfCastKey, castKeySource } = require('../../../services/shared/cast-language-key.cjs');
const { applyLanguageCast } = require('../../../services/shared/language-voice-cast.cjs');
const { voiceSpellings } = require('../../../services/shared/clip-identity-lookup.cjs');
const { judge, sharedAcrossVarieties, VERDICT } = require('./variety.cjs');

/** The two roles a learner acquires the target language from. See the header. */
const TARGET_ROLES = Object.freeze(['target1', 'target2']);

/**
 * Which voices are actually LINKED to a course's target-side content rows.
 *
 * One grouped aggregate per content table rather than a row walk: the estate
 * carries ~2.6M course_audio rows and several other jobs share this Supabase
 * project, so this asks Postgres for the distinct (course, role, voice) triples
 * and nothing else.
 */
const LINKED_VOICES_SQL = `
  SELECT course_code, role, voice_id, sum(n)::bigint AS n FROM (
    SELECT t.course_code, 'target1' AS role, ca.voice_id, count(*) AS n
      FROM course_seeds t JOIN course_audio ca ON ca.id = t.target1_audio_id GROUP BY 1,3
    UNION ALL
    SELECT t.course_code, 'target2', ca.voice_id, count(*)
      FROM course_seeds t JOIN course_audio ca ON ca.id = t.target2_audio_id GROUP BY 1,3
    UNION ALL
    SELECT t.course_code, 'target1', ca.voice_id, count(*)
      FROM course_legos t JOIN course_audio ca ON ca.id = t.target1_audio_id GROUP BY 1,3
    UNION ALL
    SELECT t.course_code, 'target2', ca.voice_id, count(*)
      FROM course_legos t JOIN course_audio ca ON ca.id = t.target2_audio_id GROUP BY 1,3
    UNION ALL
    SELECT t.course_code, 'target1', ca.voice_id, count(*)
      FROM course_practice_phrases t JOIN course_audio ca ON ca.id = t.target1_audio_id GROUP BY 1,3
    UNION ALL
    SELECT t.course_code, 'target2', ca.voice_id, count(*)
      FROM course_practice_phrases t JOIN course_audio ca ON ca.id = t.target2_audio_id GROUP BY 1,3
  ) x GROUP BY 1,2,3`;

async function load(db) {
  const [courses, voices, roles, human, linked] = await Promise.all([
    db.query(`SELECT ${COURSE_CAST_FIELDS}, status, voice_config FROM courses ORDER BY course_code`),
    db.query('SELECT voice_id, display_name, human_name, gender, tts_engine, tts_locale, is_active, languages, type FROM voices'),
    db.query('SELECT language, gender, rank, voice_id, slot FROM voice_language_roles'),
    db.query(`SELECT language, dialect, voices FROM language_recording_policy`).catch(() => ({ rows: [] })),
    db.query(LINKED_VOICES_SQL),
  ]);
  return {
    courses: courses.rows, voices: voices.rows, roles: roles.rows,
    humanRows: human.rows, linked: linked.rows,
  };
}

/**
 * The two facts about the WORLD that decide whether a locale is saying
 * anything: which varieties this estate actually teaches, and how many locales
 * each provider publishes for a language. Both derived from the data — a course
 * that gains a voice_pool_key tomorrow changes this with no code edit.
 */
function buildWorld({ courses, voices }) {
  const estateVarieties = new Map();
  for (const c of courses) {
    const key = targetCastKey(c);
    if (!key) continue;
    const base = baseLanguageOfCastKey(key);
    if (!estateVarieties.has(base)) estateVarieties.set(base, new Set());
    estateVarieties.get(base).add(key);
  }
  const providerLocales = new Map();
  const { localeOf, baseOfLocale } = require('./variety.cjs');
  for (const v of voices) {
    const locale = localeOf(v);
    if (!locale) continue;
    const base = baseOfLocale(locale);
    if (!base) continue;
    if (!providerLocales.has(base)) providerLocales.set(base, new Set());
    providerLocales.get(base).add(locale);
  }
  return { estateVarieties, providerLocales };
}

/** Index the voices registry under every spelling of every id (bare/prefixed). */
function indexVoices(voices) {
  const byId = new Map();
  for (const v of voices) {
    for (const spelling of voiceSpellings(v.voice_id)) if (!byId.has(spelling)) byId.set(spelling, v);
    byId.set(v.voice_id, v);
  }
  return byId;
}

function assess({ courses, voices, roles, humanRows, linked = [] }) {
  const world = buildWorld({ courses, voices });
  const byId = indexVoices(voices);
  const findings = [];

  const linkedBy = new Map(); // `${course}|${role}` → [{voice_id, n}]
  for (const l of linked) {
    const k = `${l.course_code}|${l.role}`;
    if (!linkedBy.has(k)) linkedBy.set(k, []);
    linkedBy.get(k).push({ voice_id: l.voice_id, n: Number(l.n) });
  }

  for (const course of courses) {
    const claimed = targetCastKey(course);
    const { config, decisions } = applyLanguageCast({
      voiceConfig: course.voice_config, course, roles, voices, humanRows,
    });
    const decisionFor = new Map(decisions.map((d) => [d.role, d]));

    for (const role of TARGET_ROLES) {
      const decision = decisionFor.get(role) || {};
      const storedRole = (course.voice_config && course.voice_config.voices && course.voice_config.voices[role]) || null;
      const resolvedRole = (config && config.voices && config.voices[role]) || null;

      const add = (layer, voiceId, extra = {}) => {
        // A human recording is a native speaker by construction — it is a
        // person, not a vendor's locale — so it is not judged. It is counted,
        // so the report can say how much of the estate this never looks at.
        if (decision.source === 'human-recorded' && layer !== 'clips') {
          findings.push({ course_code: course.course_code, status: course.status, layer, role, claimed, verdict: 'human', voice_id: decision.voiceId || null, why: 'human recording — a person, not a vendor locale' });
          return;
        }
        const voice = voiceId ? (byId.get(voiceId) || { voice_id: voiceId, tts_engine: (storedRole && storedRole.provider) || null }) : null;
        findings.push({
          course_code: course.course_code,
          status: course.status,
          layer,
          role,
          claimed,
          claim_source: castKeySource(course),
          voice_id: voiceId,
          voice_name: (voice && (voice.display_name || voice.human_name)) || null,
          provider: (voice && voice.tts_engine) || (storedRole && storedRole.provider) || null,
          resolved_by: decision.source || 'stored',
          ...extra,
          ...judge({ claimed, voice, world }),
        });
      };

      add('resolved', (resolvedRole && (resolvedRole.voiceId || resolvedRole.voice_id)) || decision.voiceId || null);
      add('stored', (storedRole && (storedRole.voiceId || storedRole.voice_id)) || null);
      for (const { voice_id, n } of (linkedBy.get(`${course.course_code}|${role}`) || [])) {
        add('clips', voice_id, { clips: n });
      }
    }
  }

  const collisions = sharedAcrossVarieties(roles, baseLanguageOfCastKey)
    .map((c) => ({ ...c, voice_name: (byId.get(c.voice_id) || {}).display_name || null }));

  return { findings, collisions, world };
}

/** One plain-English sentence per finding — what the learner actually hears. */
function sentence(f) {
  if (f.verdict !== VERDICT.MISMATCH) return f.why;
  const heard = {
    clips: `${f.clips} clips a learner hears TODAY`,
    stored: 'what the course renders in',
    resolved: 'what the next render would choose',
  }[f.layer] || f.layer;
  return `${f.claimed} content read by a ${f.locale} voice — it sounds like ${f.carried} without being it (${heard}).`;
}

function tally(findings) {
  const t = {};
  for (const f of findings) t[f.verdict] = (t[f.verdict] || 0) + 1;
  return t;
}

/**
 * The known positive. `ara_for_eng` teaches Modern Standard Arabic and is wired
 * to Azure Saudi voices; if this check cannot see that, it must not be trusted
 * with anything else.
 */
function calibrate(result) {
  const rows = result.findings.filter((f) => f.course_code === 'ara_for_eng' && f.layer !== 'resolved');
  const bad = rows.filter((f) => f.verdict === VERDICT.MISMATCH);
  const ok = bad.length > 0 && bad.every((f) => f.claimed === 'ara' && String(f.locale || '').startsWith('ar-'));
  console.log('CALIBRATION ara_for_eng — Modern Standard Arabic on Azure Saudi voices:');
  for (const r of rows) console.log(`  ${r.layer.padEnd(9)} ${r.role.padEnd(8)} ${String(r.voice_id).padEnd(30)} ${r.verdict.padEnd(9)} ${sentence(r)}`);
  console.log(`  ${ok ? 'FIRES — the detector reproduces the known positive' : 'DOES NOT FIRE — the detector is wrong'}`);
  console.log('');
  return ok;
}

async function main(argv = process.argv) {
  const args = argv.slice(2);
  const quiet = args.includes('--quiet');
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  let data;
  try { data = await load(db); } finally { await db.end(); }

  const result = assess(data);
  const calOk = calibrateWanted(args) ? calibrate(result) : calibrateSilently(result);
  if (!calOk) {
    console.error('Refusing to report estate numbers from an uncalibrated detector (ara_for_eng did not fire).');
    process.exitCode = 2;
  }

  const mismatches = result.findings.filter((f) => f.verdict === VERDICT.MISMATCH);
  const unknown = result.findings.filter((f) => f.verdict === VERDICT.UNKNOWN);
  const snapshot = {
    generated_at: new Date().toISOString(),
    calibrated: calOk,
    totals: {
      pairings: result.findings.length,
      mismatches: mismatches.length,
      mismatch_courses: new Set(mismatches.map((f) => f.course_code)).size,
      mismatch_clips: mismatches.filter((f) => f.layer === 'clips').reduce((n, f) => n + (f.clips || 0), 0),
      by_layer: ['clips', 'stored', 'resolved'].reduce((o, l) => Object.assign(o, { [l]: mismatches.filter((f) => f.layer === l).length }), {}),
      collisions: result.collisions.length,
      ...tally(result.findings),
    },
    mismatches: mismatches.map((f) => ({ ...f, sentence: sentence(f) })),
    collisions: result.collisions,
    unknown: unknown.map((f) => ({ course_code: f.course_code, role: f.role, voice_id: f.voice_id, claimed: f.claimed, why: f.why })),
    findings: result.findings,
  };

  const jsonAt = args.indexOf('--json');
  if (jsonAt !== -1 && args[jsonAt + 1]) fs.writeFileSync(args[jsonAt + 1], JSON.stringify(snapshot, null, 2));

  if (!quiet) {
    console.log(`VARIETY MISMATCHES: ${mismatches.length} across ${snapshot.totals.mismatch_courses} courses (${result.findings.length} target-side pairings judged)`);
    console.log('');
    for (const f of mismatches) console.log(`  ${f.course_code.padEnd(20)} ${f.layer.padEnd(9)} ${f.role.padEnd(8)} ${String(f.voice_id).padEnd(30)} ${sentence(f)}`);
    console.log('');
    console.log(`ONE VOICE CAST ACROSS TWO OR MORE VARIETIES: ${result.collisions.length}`);
    for (const c of result.collisions) console.log(`  ${c.voice_id.padEnd(48)} ${c.varieties.join(', ')}`);
    console.log('');
    console.log('Buckets:', JSON.stringify(tally(result.findings)));
  }
  return snapshot;
}

function calibrateWanted(args) { return args.includes('--calibrate'); }
function calibrateSilently(result) {
  return result.findings.some((f) => f.course_code === 'ara_for_eng' && f.layer !== 'resolved' && f.verdict === VERDICT.MISMATCH);
}

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(2); });
} else {
  module.exports = { main, assess, buildWorld, sentence, tally, TARGET_ROLES };
}
