#!/usr/bin/env node
/**
 * audio-reuse-inventory — "what do we already own, and what must we render?"
 *
 * Read-only. Writes nothing, renders nothing, costs nothing. Run it as often
 * as you like.
 *
 *   node tools/audio-reuse-inventory.cjs fra_for_eng --rounds 10
 *   node tools/audio-reuse-inventory.cjs fra_for_eng --seeds 1-10 --measure
 *   node tools/audio-reuse-inventory.cjs fra_for_eng --rounds 10 --json out.json
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 *
 * The estate holds fifty-odd `*_for_eng` courses whose KNOWN side is English.
 * When a new course needs the English prompt "I want to speak French", that
 * clip very often already exists — rendered for Spanish, or Italian, or
 * Chinese. Rendering it again is money and CPU spent on an object we own.
 *
 * The content-addressed design (docs/architecture/
 * AUDIO_PIPELINE_CONTENT_ADDRESSED_DESIGN-2026-08-06.md) states the rule: a
 * clip's logical identity is `(language, text_normalized, voice_id)`, and
 * 236,908 of the estate's objects exist only because the same sentence was
 * rendered again for another course or side. This tool is the first thing that
 * ASKS that question against real data before a render is approved.
 *
 * It is deliberately a PRE-PASS, not a patch to phase8. It answers the question
 * and hands a human the numbers; it never relinks, never deletes, never
 * renders. What it would take for this to become phase8's default path is
 * written up in docs/architecture/AUDIO_REUSE_INVENTORY-2026-08-07.md.
 *
 * ── EXISTENCE IS NOT HEALTH ─────────────────────────────────────────────────
 *
 * A row saying the right thing is not evidence. `--measure` fetches the SERVED
 * bytes for every candidate and gates them:
 *
 *   - fetchable at all (a row pointing at a missing object is not a clip)
 *   - not zero-byte, not silent, not near-silent
 *   - duration plausible for the text (a clip chopped after "as" is not "as
 *     often as possible")
 *   - pace in step with its own (language, voice) siblings — see the note on
 *     PACE_RESIDUAL_FLOOR for the model and why a flat rate is wrong
 *
 * The pace check deserves a note, because tools/audio-pace-gate.cjs carries a
 * warning against exactly one misuse of it. It was written as an OUTPUT check
 * on a finished set, after two German clips passed whisper at CER 0 and were
 * still wrong — merely FAST (1.70s where the current generation delivers
 * 2.18s). Its header therefore says it must not be used as a replacement
 * SELECTOR: "this clip is fast, therefore re-render it" is not a conclusion it
 * supports.
 *
 * Here it is used differently and legitimately: as an INTAKE check on a
 * CANDIDATE offered for reuse. The question is not "should we replace the clip
 * we ship?" but "is this foreign clip good enough to adopt instead of
 * rendering?" — and a candidate that fails intake is simply not adopted, which
 * costs a render we were going to pay for anyway. Nothing is replaced on the
 * strength of a pace number. That distinction is the whole licence; do not
 * read this file as permission to widen it.
 *
 * ── THE LANGUAGE-SPELLING GAP THIS CLOSES ───────────────────────────────────
 *
 * services/shared/clip-identity-lookup.cjs offers voiceSpellings() but
 * deliberately no languageSpellings(), because a caller holding 'eng' cannot
 * enumerate the ways it might be stored ('en', 'en-GB', 'auto', …) without
 * either missing rows or inventing them. Its header calls that a KNOWN
 * REMAINING GAP.
 *
 * This tool closes it from the other end, and the inversion is the trick:
 * instead of GUESSING forward from a canonical code to its possible spellings,
 * it reads every distinct `language` value actually present in course_audio
 * (there are ~137 for ~60 languages), canonicalises each one, and builds the
 * reverse map. The result is derived from the data rather than assumed, so it
 * cannot invent a spelling that does not exist, and it cannot miss one that
 * does. Values that will not canonicalise ('auto', 'legacy_import') are
 * reported as UNREACHABLE rather than guessed at — they are a real hole in the
 * lookup's coverage and the migration's backlog, not a rounding error.
 *
 * Needs DATABASE_URL from .env.psql at the repo root (docs/secrets-vault.md).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const { execFile } = require('child_process');
const { Client } = require('pg');

const {
  tryCanonicalLanguage,
  tryCanonicalVoiceId,
} = require('../services/shared/clip-identity.cjs');
const { voiceSpellings } = require('../services/shared/clip-identity-lookup.cjs');

const REPO = path.join(__dirname, '..');
const FFPROBE = process.env.FFPROBE || 'ffprobe';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

// ─── config ──────────────────────────────────────────────────────────────────

const arg = (f) => {
  const i = process.argv.indexOf(f);
  return i > -1 ? process.argv[i + 1] : null;
};

/**
 * Health thresholds. Deliberately loose: this gate decides whether to ADOPT a
 * foreign clip, and the cost of a false reject is one render we were already
 * budgeting for, while the cost of a false accept is a bad clip in the course.
 * So it errs toward rejecting.
 */
const MIN_BYTES = 1024;          // below this it is not an mp3
const MIN_MS = 300;              // shorter than any real utterance in the estate
const SILENCE_DB = -45;          // ffmpeg silencedetect floor
const MAX_SILENT_FRACTION = 0.85; // mostly-silence is not a clip

/**
 * Pace is NOT a fixed chars-per-second band. A first cut of this tool used one
 * and failed 144 of 165 healthy clips, because a flat rate is wrong at both
 * ends: short clips are dominated by their onset and tail, long ones by their
 * steady rate. That is precisely the mistake tools/audio-pace-gate.cjs was
 * written to avoid, and its model is used here instead —
 *
 *     duration ≈ a + b·characters,  fitted by Theil–Sen (median of pairwise
 *     slopes) so a few outliers in the reference cannot drag the line,
 *
 * with a clip failing when its residual against that line is materially
 * negative: it is much shorter than clips of its own length, voice and
 * language actually are.
 *
 * The reference cohort here is the measured set itself, grouped by
 * (language, voice). Self-calibration is the right choice for an INTAKE check:
 * the question is "is this candidate out of step with its own siblings?", and
 * a cohort answers that without needing a blessed reference generation to
 * exist for every language — which, for French, it does not.
 */
const PACE_RESIDUAL_FLOOR = -0.30; // >30% shorter than its cohort predicts
const PACE_MIN_CHARS = 8;          // below this, onset/tail dominate — measured, not failed
const PACE_MIN_COHORT = 6;         // fewer siblings than this and the fit is not evidence

// ─── plumbing ────────────────────────────────────────────────────────────────

function databaseUrl() {
  const p = path.join(REPO, '.env.psql');
  if (!fs.existsSync(p)) {
    throw new Error('.env.psql not found at the repo root — see docs/secrets-vault.md §Provisioning');
  }
  const m = fs.readFileSync(p, 'utf8').match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
  if (!m) throw new Error('.env.psql has no DATABASE_URL');
  return m[1].trim();
}

function env(key) {
  const p = path.join(REPO, '.env');
  if (!fs.existsSync(p)) return null;
  const m = fs.readFileSync(p, 'utf8').match(new RegExp('^' + key + '\\s*=\\s*"?([^"\\n]+)"?', 'm'));
  return m ? m[1].trim() : null;
}

const n = (x) => Number(x).toLocaleString('en-GB');
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(0) + '%' : '—');

/**
 * The URL the app actually hands out. Popty derives it by convention from the
 * clip id (src/composables/useScriptPlayer.js, src/services/api.js); the
 * learner app resolves s3_key. For a clip written by the current path these
 * agree, and where they do not, s3_key is the truth — so s3_key wins here.
 */
function servedUrl(s3Key) {
  const bucket = env('S3_AUDIO_BUCKET') || env('S3_BUCKET');
  const region = env('AWS_REGION') || 'eu-west-1';
  if (!bucket) throw new Error('no S3_AUDIO_BUCKET / S3_BUCKET in .env');
  return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
}

function fetchBytes(url) {
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return resolve({ ok: false, status: res.statusCode });
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ ok: true, status: 200, buf: Buffer.concat(chunks) }));
      })
      .on('error', (e) => resolve({ ok: false, error: e.message }));
  });
}

const run = (cmd, args) =>
  new Promise((resolve) => {
    execFile(cmd, args, { maxBuffer: 32 * 1024 * 1024 }, (err, stdout, stderr) =>
      resolve({ err, stdout: stdout || '', stderr: stderr || '' })
    );
  });

// ─── the health gate ─────────────────────────────────────────────────────────

/**
 * Measure a candidate on its SERVED bytes and return a verdict.
 * @returns {{pass: boolean, reason: string, ms?: number, bytes?: number, cps?: number}}
 */
async function gateCandidate(url, text) {
  const got = await fetchBytes(url);
  if (!got.ok) return { pass: false, reason: `unfetchable (${got.status || got.error})` };
  const bytes = got.buf.length;
  if (bytes < MIN_BYTES) return { pass: false, reason: `zero/near-zero byte object (${bytes}B)`, bytes };

  const tmp = path.join(os.tmpdir(), `reuse-${process.pid}-${Math.abs(hash(url))}.mp3`);
  fs.writeFileSync(tmp, got.buf);
  try {
    const probe = await run(FFPROBE, [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', tmp,
    ]);
    const ms = Math.round(parseFloat(probe.stdout.trim()) * 1000);
    if (!Number.isFinite(ms) || ms <= 0) return { pass: false, reason: 'undecodable', bytes };
    if (ms < MIN_MS) return { pass: false, reason: `too short (${ms}ms)`, ms, bytes };

    // silence / near-silence
    const sil = await run(FFMPEG, [
      '-hide_banner', '-nostats', '-i', tmp,
      '-af', `silencedetect=noise=${SILENCE_DB}dB:d=0.1`, '-f', 'null', '-',
    ]);
    let silentMs = 0;
    for (const m of sil.stderr.matchAll(/silence_duration:\s*([0-9.]+)/g)) {
      silentMs += Math.round(parseFloat(m[1]) * 1000);
    }
    if (silentMs / ms > MAX_SILENT_FRACTION) {
      return { pass: false, reason: `silent (${pct(silentMs, ms)} silence)`, ms, bytes };
    }

    // Pace is judged later, against this clip's own cohort — see paceFlag().
    const chars = String(text || '').replace(/\s+/g, ' ').trim().length;
    return { pass: true, reason: 'ok', ms, bytes, silentMs, chars };
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

// ─── pace, the way audio-pace-gate.cjs does it ───────────────────────────────

const median = (xs) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Theil–Sen fit of y = a + b·x: median of pairwise slopes, then median intercept. */
function theilSen(points) {
  if (points.length < 2) return null;
  const slopes = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[j][0] - points[i][0];
      if (dx !== 0) slopes.push((points[j][1] - points[i][1]) / dx);
    }
  }
  if (!slopes.length) return null;
  const b = median(slopes);
  const a = median(points.map((p) => p[1] - b * p[0]));
  return { a, b };
}

/**
 * Flag clips materially shorter than their own (language, voice) cohort
 * predicts. Mutates each measurement's `health` in place, adding `paceResidual`
 * and — only where the evidence supports it — turning `pass` false.
 *
 * A cohort smaller than PACE_MIN_COHORT is not evidence, so its members are
 * reported with a null residual and left passing. Saying "not enough siblings
 * to judge" is the honest output; failing them would manufacture damage.
 */
function applyPaceGate(measurements) {
  const cohorts = new Map();
  for (const m of measurements) {
    if (!m.health || !m.health.pass || !m.health.ms) continue;
    const key = `${m.lang}|${m.voice}`;
    if (!cohorts.has(key)) cohorts.set(key, []);
    cohorts.get(key).push(m);
  }
  const fits = {};
  for (const [key, members] of cohorts) {
    const usable = members.filter((m) => m.health.chars >= PACE_MIN_CHARS);
    if (usable.length < PACE_MIN_COHORT) {
      fits[key] = { cohort: members.length, fitted: false };
      continue;
    }
    const fit = theilSen(usable.map((m) => [m.health.chars, m.health.ms]));
    if (!fit) { fits[key] = { cohort: members.length, fitted: false }; continue; }
    fits[key] = {
      cohort: members.length, fitted: true,
      intercept: Math.round(fit.a), msPerChar: Number(fit.b.toFixed(2)),
    };
    for (const m of members) {
      if (m.health.chars < PACE_MIN_CHARS) { m.health.paceResidual = null; continue; }
      const predicted = fit.a + fit.b * m.health.chars;
      const residual = predicted > 0 ? (m.health.ms - predicted) / predicted : 0;
      m.health.paceResidual = Number(residual.toFixed(3));
      m.health.predictedMs = Math.round(predicted);
      if (residual < PACE_RESIDUAL_FLOOR) {
        m.health.pass = false;
        m.health.reason = `pace: ${Math.round(residual * -100)}% shorter than its cohort predicts (${m.health.ms}ms vs ~${Math.round(predicted)}ms)`;
      }
    }
  }
  return fits;
}

// ─── what the identity key deliberately forgets ──────────────────────────────
//
// canonicalLanguage() drops region — 'fr-CA' → 'fra' — and the reasoning is
// sound: "the voice carries the accent", so region on the language column only
// splits the key. For DEDUP that is exactly right.
//
// For REUSE it is not sufficient on its own, and the difference matters. Two
// clips can share an identity's language and text and still be unusable as
// substitutes for one another, because the thing that differs is carried by
// the voice the key holds SEPARATELY: a Canadian-French Azure clip and a
// metropolitan-French xAI clip of "je veux" are one text, two accents, two
// generations. A reuse decision that reads only "same language, same text"
// adopts the wrong accent and calls it a saving.
//
// So the tool reports provider and region alongside voice, and never counts a
// different-voice candidate as reusable without saying what changed. Whether a
// given mix is acceptable is an ear judgement, not a query result.

/** Provider prefix of a voice id, canonicalised where possible. */
function provider(voiceId) {
  const c = tryCanonicalVoiceId(voiceId);
  if (!c) return null;
  const i = c.indexOf('_');
  return i > 0 ? c.slice(0, i) : null;
}

/**
 * Region subtag carried by the voice id itself, e.g. 'azure_fr-CA-SylvieNeural'
 * → 'CA'. Returns null for voices that carry no region (all xAI names), which
 * compares equal to other region-less voices and unequal to a regioned one.
 */
function region(voiceId) {
  const m = String(voiceId || '').match(/(?:^|_)([a-z]{2,3})-([A-Za-z]{2,4})-/);
  return m ? m[2].toUpperCase() : null;
}

// ─── the reverse language map (closes the lookup's known gap) ────────────────

/**
 * Read every distinct `language` value present in course_audio and group them
 * by the canonical code they resolve to. Derived from the data, never guessed.
 *
 * @returns {{map: Map<string,string[]>, unreachable: Array<{language: string, rows: number}>}}
 */
async function languageSpellingMap(client) {
  const rows = (await client.query(
    'select language, count(*)::bigint rows from course_audio group by 1'
  )).rows;
  const map = new Map();
  const unreachable = [];
  for (const r of rows) {
    const canonical = tryCanonicalLanguage(r.language);
    if (!canonical) {
      unreachable.push({ language: r.language, rows: Number(r.rows) });
      continue;
    }
    if (!map.has(canonical)) map.set(canonical, []);
    map.get(canonical).push(r.language);
  }
  return { map, unreachable };
}

// ─── slot enumeration ────────────────────────────────────────────────────────

/**
 * Every clip slot a learner will actually hear in range, from EVERY holder
 * column — course_legos, course_practice_phrases and lego_introductions.
 *
 * Enumerating from the course structure rather than from a staleness test is
 * the point: the clip the founder named on 2026-08-06 ("as often as possible",
 * chopped after "as") is an English practice-phrase clip held by
 * course_practice_phrases.known_audio_id, which a seed-range slot map over
 * course_legos alone cannot reach.
 */
const SLOT_SQL = `
with ordered as (
  select lego_id, seed_number, lego_index,
         row_number() over (order by seed_number, lego_index) rn
  from course_legos where course_code = $1
),
scope as (select * from ordered where ($2::int is null or rn <= $2)
                                  and ($3::int is null or seed_number between $3 and $4))
select * from (
  select 'course_legos' holder, 'known' role, s.lego_id, s.seed_number, s.lego_index,
         cl.known_audio_id id, cl.known_text txt
    from course_legos cl join scope s using (lego_id) where cl.course_code = $1
  union all
  select 'course_legos', 'target1', s.lego_id, s.seed_number, s.lego_index,
         cl.target1_audio_id, cl.target_text
    from course_legos cl join scope s using (lego_id) where cl.course_code = $1
  union all
  select 'course_legos', 'target2', s.lego_id, s.seed_number, s.lego_index,
         cl.target2_audio_id, cl.target_text
    from course_legos cl join scope s using (lego_id) where cl.course_code = $1
  union all
  select 'course_legos', 'presentation', s.lego_id, s.seed_number, s.lego_index,
         cl.presentation_audio_id::uuid, cl.known_text
    from course_legos cl join scope s using (lego_id) where cl.course_code = $1
  union all
  select 'course_practice_phrases', 'known', s.lego_id, s.seed_number, s.lego_index,
         p.known_audio_id, p.known_text
    from course_practice_phrases p
    join scope s on s.seed_number = p.seed_number and s.lego_index = p.lego_index
   where p.course_code = $1
  union all
  select 'course_practice_phrases', 'target1', s.lego_id, s.seed_number, s.lego_index,
         p.target1_audio_id, p.target_text
    from course_practice_phrases p
    join scope s on s.seed_number = p.seed_number and s.lego_index = p.lego_index
   where p.course_code = $1
  union all
  select 'course_practice_phrases', 'target2', s.lego_id, s.seed_number, s.lego_index,
         p.target2_audio_id, p.target_text
    from course_practice_phrases p
    join scope s on s.seed_number = p.seed_number and s.lego_index = p.lego_index
   where p.course_code = $1
  union all
  select 'lego_introductions', 'known', s.lego_id, s.seed_number, s.lego_index,
         li.audio_uuid, null
    from lego_introductions li join scope s using (lego_id) where li.course_code = $1
  union all
  select 'lego_introductions', 'presentation', s.lego_id, s.seed_number, s.lego_index,
         li.presentation_audio_id, null
    from lego_introductions li join scope s using (lego_id) where li.course_code = $1
) slots
order by seed_number, lego_index, holder, role`;

async function enumerateSlots(client, course, { rounds, seedFrom, seedTo }) {
  const { rows } = await client.query(SLOT_SQL, [
    course,
    rounds || null,
    seedFrom || null,
    seedTo || null,
  ]);
  return rows;
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const course = process.argv[2];
  if (!course || course.startsWith('--')) {
    console.error('usage: audio-reuse-inventory.cjs <course_code> [--rounds N | --seeds A-B] [--measure] [--json out]');
    process.exit(2);
  }
  const rounds = arg('--rounds') ? Number(arg('--rounds')) : null;
  const seedsArg = arg('--seeds');
  let seedFrom = null, seedTo = null;
  if (seedsArg) {
    const m = seedsArg.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error(`--seeds wants A-B, got ${seedsArg}`);
    seedFrom = Number(m[1]);
    seedTo = m[2] ? Number(m[2]) : seedFrom;
  }
  if (!rounds && !seedsArg) throw new Error('give --rounds N or --seeds A-B');
  const measure = process.argv.includes('--measure');
  const jsonPath = arg('--json');

  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();

  const scopeLabel = rounds ? `first ${rounds} rounds` : `seeds ${seedFrom}-${seedTo}`;
  console.log(`\n${course} — ${scopeLabel}\n${'='.repeat(60)}`);

  // 1. every slot the learner hears
  const slots = await enumerateSlots(client, course, { rounds, seedFrom, seedTo });
  const filled = slots.filter((s) => s.id);
  console.log(`slots enumerated: ${n(slots.length)}  (filled ${n(filled.length)}, empty ${n(slots.length - filled.length)})`);

  // 2. what each filled slot actually points at
  const ids = [...new Set(filled.map((s) => s.id))];
  const clipRows = (await client.query(
    `select id, course_code, text, text_normalized, language, voice_id, role,
            s3_key, duration_ms, veracity_pass
       from course_audio where id = any($1::uuid[])`,
    [ids]
  )).rows;
  const clipById = new Map(clipRows.map((r) => [r.id, r]));
  const dangling = ids.filter((i) => !clipById.has(i));

  // 3. the reverse language map, derived from the data
  const { map: langMap, unreachable } = await languageSpellingMap(client);

  // 4. group slots into the distinct IDENTITIES the course needs
  const identities = new Map();
  for (const s of filled) {
    const clip = clipById.get(s.id);
    if (!clip) continue;
    const lang = tryCanonicalLanguage(clip.language);
    const voice = tryCanonicalVoiceId(clip.voice_id);
    const key = [lang || `?${clip.language}`, clip.text_normalized, voice || `?${clip.voice_id}`].join('');
    if (!identities.has(key)) {
      identities.set(key, {
        key, lang, voice, rawLang: clip.language, rawVoice: clip.voice_id,
        text: clip.text, textNorm: clip.text_normalized,
        slots: [], current: clip,
      });
    }
    identities.get(key).slots.push(s);
  }
  console.log(`distinct clip identities behind them: ${n(identities.size)}`);
  if (dangling.length) console.log(`  !! ${n(dangling.length)} slot ids have NO course_audio row`);

  // 5. for each identity, what else does the estate own?
  const list = [...identities.values()];
  for (const idt of list) {
    if (!idt.lang) { idt.candidates = []; idt.unreachableIdentity = true; continue; }
    const langSpellings = langMap.get(idt.lang) || [idt.rawLang];
    const voiceSpell = idt.voice ? voiceSpellings(idt.voice) : [idt.rawVoice];
    const { rows } = await client.query(
      `select id, course_code, voice_id, language, s3_key, duration_ms, text, veracity_pass
         from course_audio
        where text_normalized = $1 and language = any($2::text[])
        order by course_code`,
      [idt.textNorm, langSpellings]
    );
    idt.candidates = rows.map((r) => ({
      ...r,
      sameVoice: voiceSpell.includes(r.voice_id) || tryCanonicalVoiceId(r.voice_id) === idt.voice,
      sameProvider: provider(r.voice_id) === provider(idt.rawVoice),
      sameRegion: region(r.voice_id) === region(idt.rawVoice),
      foreign: r.course_code !== course,
    }));
  }

  // 6. optional: gate the candidates on served bytes
  let paceFits = null;
  if (measure) {
    console.log('\nmeasuring served bytes (own clip + best foreign candidate per identity)…');
    let done = 0;
    const measured = [];
    for (const idt of list) {
      const targets = [idt.candidates.find((c) => c.id === idt.current.id)].filter(Boolean);
      const foreignSame = idt.candidates.find((c) => c.foreign && c.sameVoice);
      const foreignAny = idt.candidates.find((c) => c.foreign && !c.sameVoice);
      for (const t of [foreignSame, foreignAny]) if (t) targets.push(t);
      for (const t of targets) {
        t.health = await gateCandidate(servedUrl(t.s3_key), idt.text);
        measured.push({ lang: tryCanonicalLanguage(t.language) || t.language,
                        voice: tryCanonicalVoiceId(t.voice_id) || t.voice_id, health: t.health });
      }
      if (++done % 20 === 0) process.stdout.write(`  ${done}/${list.length}\r`);
    }
    console.log(`  ${list.length}/${list.length} measured (${measured.length} clips fetched)`);
    paceFits = applyPaceGate(measured);
    console.log('  pace cohorts:');
    for (const [k, f] of Object.entries(paceFits)) {
      console.log(`    ${k.padEnd(28)} n=${String(f.cohort).padStart(4)}  ${f.fitted ? `duration ≈ ${f.intercept}ms + ${f.msPerChar}ms/char` : 'too few siblings to fit — not judged'}`);
    }
  }

  // 7. classify and report
  const bySide = { known: [], target: [], other: [] };
  for (const idt of list) {
    const side = idt.lang === 'eng' ? 'known' : idt.lang ? 'target' : 'other';
    bySide[side].push(idt);
  }

  const summarise = (group) => {
    const own = (i) => i.candidates.find((c) => c.id === i.current.id);
    const ownHealthy = (i) => !measure || (own(i)?.health?.pass ?? null) === true;
    const reusableSame = (i) => i.candidates.some((c) => c.foreign && c.sameVoice && (!measure || c.health?.pass !== false));
    const reusableAny = (i) => i.candidates.some((c) => c.foreign && (!measure || c.health?.pass !== false));
    // A different-voice candidate is never counted as a straight saving. It is
    // reported with WHAT differs, because that is the question an ear has to
    // answer before it can be adopted.
    const otherVoiceOnly = (i) => !reusableSame(i) && reusableAny(i);
    const changes = (i) => {
      const c = i.candidates.filter((x) => x.foreign && !x.sameVoice);
      return {
        provider: c.some((x) => !x.sameProvider),
        region: c.some((x) => !x.sameRegion),
      };
    };
    const otherVoice = group.filter(otherVoiceOnly);
    return {
      identities: group.length,
      slots: group.reduce((s, i) => s + i.slots.length, 0),
      ownClipHealthy: measure ? group.filter(ownHealthy).length : null,
      ownClipDamaged: measure ? group.filter((i) => own(i)?.health?.pass === false).length : null,
      reusableMatchingVoice: group.filter(reusableSame).length,
      onlyOtherVoiceAvailable: otherVoice.length,
      ofWhichChangeProvider: otherVoice.filter((i) => changes(i).provider).length,
      ofWhichChangeRegion: otherVoice.filter((i) => changes(i).region).length,
      noReuseAnywhere: group.filter((i) => !reusableAny(i)).length,
      sourceCourses: [...new Set(group.flatMap((i) => i.candidates.filter((c) => c.foreign && c.sameVoice).map((c) => c.course_code)))].sort(),
      otherVoiceSourceCourses: [...new Set(otherVoice.flatMap((i) => i.candidates.filter((c) => c.foreign).map((c) => c.course_code)))].sort(),
    };
  };

  const report = {
    course, scope: scopeLabel, generatedFor: 'audio-reuse-inventory',
    slots: { total: slots.length, filled: filled.length, empty: slots.length - filled.length },
    danglingSlotIds: dangling.length,
    identities: identities.size,
    known: summarise(bySide.known),
    target: summarise(bySide.target),
    unresolvableIdentities: bySide.other.length,
    paceFits,
    languageSpellings: Object.fromEntries([...langMap].filter(([k]) => ['eng', 'fra', 'deu'].includes(k))),
    unreachableLanguageValues: unreachable,
    detail: list.map((i) => ({
      lang: i.lang, voice: i.voice, text: i.text,
      slots: i.slots.length,
      slotRefs: i.slots.map((s) => `${s.lego_id}/${s.holder}/${s.role}`),
      currentClip: i.current.id,
      currentHealth: measure ? (i.candidates.find((c) => c.id === i.current.id)?.health || null) : null,
      candidatesForeignSameVoice: i.candidates.filter((c) => c.foreign && c.sameVoice)
        .map((c) => ({ course: c.course_code, id: c.id, voice: c.voice_id, health: c.health || null })),
      candidatesForeignOtherVoice: i.candidates.filter((c) => c.foreign && !c.sameVoice)
        .map((c) => ({ course: c.course_code, id: c.id, voice: c.voice_id, health: c.health || null })),
    })),
  };

  const line = (label, v) => console.log(`  ${label.padEnd(34)} ${String(v ?? '—').padStart(8)}`);
  for (const [name, s] of [['KNOWN side (English)', report.known], ['TARGET side', report.target]]) {
    console.log(`\n${name}`);
    line('distinct identities', s.identities);
    line('slots they fill', s.slots);
    if (measure) {
      line('own clip passes health gate', s.ownClipHealthy);
      line('own clip FAILS health gate', s.ownClipDamaged);
    }
    line('REUSABLE now (matching voice)', `${s.reusableMatchingVoice} (${pct(s.reusableMatchingVoice, s.identities)})`);
    line('same text, DIFFERENT voice only', `${s.onlyOtherVoiceAvailable} (${pct(s.onlyOtherVoiceAvailable, s.identities)})`);
    if (s.onlyOtherVoiceAvailable) {
      line('  ..of which change TTS provider', s.ofWhichChangeProvider);
      line('  ..of which change accent/region', s.ofWhichChangeRegion);
    }
    line('MUST RENDER (nothing anywhere)', s.noReuseAnywhere);
    if (s.sourceCourses.length) {
      console.log(`  supplying courses (matching voice): ${s.sourceCourses.slice(0, 12).join(', ')}${s.sourceCourses.length > 12 ? ` +${s.sourceCourses.length - 12} more` : ''}`);
    }
    if (s.onlyOtherVoiceAvailable) {
      console.log(`  different-voice-only sources:       ${s.otherVoiceSourceCourses.slice(0, 12).join(', ')}`);
      console.log('  ^ NOT a saving. Adopting these changes accent and/or generation — Tom\'s ear, not a query result.');
    }
  }

  if (unreachable.length) {
    console.log(`\nlanguage values that will not canonicalise (lookup cannot reach these rows):`);
    for (const u of unreachable) console.log(`  ${u.language.padEnd(16)} ${n(u.rows)} rows`);
  }

  if (jsonPath) {
    fs.mkdirSync(path.dirname(path.resolve(jsonPath)), { recursive: true });
    fs.writeFileSync(path.resolve(jsonPath), JSON.stringify(report, null, 2));
    console.log(`\nwrote ${jsonPath}`);
  }

  await client.end();
}

main().catch((e) => {
  console.error(e.stack || e.message);
  process.exit(1);
});
