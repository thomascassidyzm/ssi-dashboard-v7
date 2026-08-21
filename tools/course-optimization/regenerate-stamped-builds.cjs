#!/usr/bin/env node
/**
 * Regenerate template-stamped BUILD rows in place — the repair sweep for
 * docs/course-optimization/build-phrase-template-stamp-audit-2026-07-24.md.
 *
 * Scope: BUILD rows only (never seeds, LEGOs, USE, components, audio files).
 * A row is in scope iff it mechanically classifies as comma-tag or
 * use-stem+tag against its own lego + the lego's own USE stems — the same
 * classifier that now gates /seed/complete (validation.cjs, lockstep).
 *
 * Per stamped lego: generate replacement BUILD phrases via the Claude CLI
 * (Sonnet; 3-strike escalation to Opus), validate through the SAME gates the
 * live path uses (containment, whole-chunk vocab tiling, anti-template gate,
 * phrase-ZUT against the course map, dedupe), then UPDATE the stamped rows in
 * place (same id/position — floors and round structure untouched) with a
 * before-state assertion. Rows that survive every attempt un-regenerable are
 * left untouched and logged.
 *
 * Audio is never generated here: each course with applied rows ends by
 * QUEUEING an audio-pass request (approval-gated, repo convention).
 *
 * Resume-safe: applied rows no longer classify as stamped.
 *
 * Usage:
 *   node tools/course-optimization/regenerate-stamped-builds.cjs --course spa_for_eng [--dry-run] [--max-legos N] [--concurrency 3]
 *   node tools/course-optimization/regenerate-stamped-builds.cjs --all [--dry-run]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '../..');
require('dotenv').config({ path: path.join(REPO, '.env') });
// The .env ANTHROPIC_API_KEY is the dashboard env-switcher's, NOT valid CLI
// auth — if it leaks into the CLI's env it overrides the claude.ai login and
// every generation call 401s (see CLAUDE.md hard rules).
delete process.env.ANTHROPIC_API_KEY;
delete process.env.CLAUDECODE;

const { createClient } = require('@supabase/supabase-js');
const {
  classifyBuildPhrase, checkBuildRecombination, checkVocabViolations,
} = require(path.join(REPO, 'services/course-builder/lib/validation.cjs'));
const { normalizeForContainment, normalizeForZUT, checkWordContainment, checkSubstringContainment, extractVocab } = require(path.join(REPO, 'services/course-builder/lib/text-normalization.cjs'));
const { isChinese } = require(path.join(REPO, 'services/course-builder/lib/language-config.cjs'));
const { escalateBuildPhrases } = require(path.join(REPO, 'services/course-builder/lib/build-escalation.cjs'));
const { queueAudioPass } = require(path.join(REPO, 'services/shared/audio-pass-queue.cjs'));
const { isHumanVoiceCourse } = require(path.join(REPO, 'services/shared/human-voice-courses.cjs'));

// ── args ──
const args = process.argv.slice(2);
const getArg = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const DRY_RUN = args.includes('--dry-run');
const COURSE = getArg('--course');
const ALL = args.includes('--all');
const MAX_LEGOS = parseInt(getArg('--max-legos') || '0', 10) || Infinity;
const CONCURRENCY = parseInt(getArg('--concurrency') || '3', 10);
if (!COURSE && !ALL) { console.error('usage: --course <code> | --all  [--dry-run] [--max-legos N] [--concurrency N]'); process.exit(1); }

// ── clients ──
const DB = fs.readFileSync(path.join(REPO, '.env.psql'), 'utf8').match(/^DATABASE_URL=(.*)$/m)[1].trim();
const PSQL = '/opt/homebrew/bin/psql-17';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function q(sql) {
  const out = execSync(`${PSQL} "${DB}" -At --field-separator=$'\\x01' -c ${JSON.stringify(sql)}`, { maxBuffer: 1 << 28 }).toString();
  return out.split('\n').filter(Boolean).map(l => l.split('\x01'));
}

const LOG_DIR = path.join(REPO, 'scripts/build-audit/regen-logs');
fs.mkdirSync(LOG_DIR, { recursive: true });

// ── per-course sweep ──
async function sweepCourse(courseCode) {
  // Human-voice-only courses (Welsh cym_*) are never synthesised (Tom 2026-07-25):
  // don't even queue an audio-pass request the runner would only skip.
  if (isHumanVoiceCourse(courseCode)) {
    console.log(`\n═══ ${courseCode}: human-voice-only — SKIP (no TTS ever, Tom 2026-07-25)`);
    return { course: courseCode, skipped: 'human-voice-only', stamped_before: 0, applied: 0, failed: 0 };
  }
  const chinese = isChinese(courseCode);
  const stats = {
    course: courseCode, dry_run: DRY_RUN, stamped_before: 0, applied: 0, failed: 0, skipped_max: 0,
    sonnet_legos: 0, opus_legos: 0, unresolved_legos: [], rows: [],
  };

  // 1. Load legos in introduction order + cumulative chunk vocab
  const legos = q(`select seed_number, lego_index, known_text, target_text, type, components from course_legos where course_code='${courseCode}' order by seed_number, lego_index`)
    .map(r => ({ seed: +r[0], idx: +r[1], known: r[2], target: r[3], type: r[4], components: r[5] ? JSON.parse(r[5]) : null }));
  if (legos.length === 0) return stats;

  const chunksAt = new Map();     // seed:idx -> Set of chunks introduced BEFORE this lego
  const pairsAt = new Map();      // seed:idx -> [{known,target}] introduced BEFORE this lego
  let cumChunks = new Set(), cumPairs = [];
  for (const l of legos) {
    chunksAt.set(`${l.seed}:${l.idx}`, cumChunks);
    pairsAt.set(`${l.seed}:${l.idx}`, cumPairs);
    cumChunks = new Set(cumChunks);
    cumPairs = [...cumPairs, { known: l.known, target: l.target }];
    extractVocab(l.target, chinese).forEach(v => cumChunks.add(v));
    if (l.type === 'M' && l.components) for (const c of l.components) extractVocab(c.target, chinese).forEach(v => cumChunks.add(v));
  }
  const legoByKey = new Map(legos.map(l => [`${l.seed}:${l.idx}`, l]));

  // 2. Load phrases
  const phraseRows = q(`select id, seed_number, lego_index, position, phrase_role, known_text, target_text from course_practice_phrases where course_code='${courseCode}' and phrase_role in ('build','use') order by seed_number, lego_index, position`)
    .map(r => ({ id: r[0], seed: +r[1], idx: +r[2], position: +r[3], role: r[4], known: r[5], target: r[6] }));

  const useByLego = new Map(), buildByLego = new Map();
  for (const p of phraseRows) {
    const key = `${p.seed}:${p.idx}`;
    const m = p.role === 'use' ? useByLego : buildByLego;
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(p);
  }

  // Course-wide phrase-ZUT map (production direction): known_norm -> target_norm
  const zutMap = new Map();
  for (const p of phraseRows) {
    const k = normalizeForZUT(p.known, false), t = normalizeForZUT(p.target, chinese);
    if (k && !zutMap.has(k)) zutMap.set(k, t);
  }
  for (const l of legos) {
    const k = normalizeForZUT(l.known, false), t = normalizeForZUT(l.target, chinese);
    if (k && !zutMap.has(k)) zutMap.set(k, t);
  }

  // 3. Classify: find stamped rows, grouped by lego
  const stampedByLego = new Map();
  for (const [key, rows] of buildByLego) {
    const lego = legoByKey.get(key);
    if (!lego) continue;
    const useStemNorms = new Set((useByLego.get(key) || []).map(p => normalizeForContainment(p.target)));
    rows.forEach((p, i) => {
      const { cls } = classifyBuildPhrase(p.target, lego.target, useStemNorms, i === 0);
      if (cls === 'comma-tag' || cls === 'use-stem+tag') {
        if (!stampedByLego.has(key)) stampedByLego.set(key, []);
        stampedByLego.get(key).push({ ...p, cls });
        stats.stamped_before++;
      }
    });
  }
  console.log(`\n═══ ${courseCode}: ${stats.stamped_before} stamped rows across ${stampedByLego.size} legos${DRY_RUN ? ' [DRY RUN]' : ''}`);
  if (stats.stamped_before === 0) return stats;

  // 4. Regenerate per lego (bounded concurrency)
  const allKeys = [...stampedByLego.keys()];
  const legoKeys = allKeys.slice(0, MAX_LEGOS === Infinity ? allKeys.length : MAX_LEGOS);
  stats.skipped_max = allKeys.slice(legoKeys.length).reduce((n, k) => n + stampedByLego.get(k).length, 0);
  const worker = async () => {
    while (legoKeys.length > 0) {
      const key = legoKeys.shift();
      if (key === undefined) return;
      await regenLego(courseCode, key, stampedByLego.get(key), { legoByKey, chunksAt, pairsAt, useByLego, buildByLego, zutMap, chinese, stats });
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // 5. Log + queue audio pass
  const logFile = path.join(LOG_DIR, `${courseCode}-${DRY_RUN ? 'dryrun' : 'applied'}-log.json`);
  fs.writeFileSync(logFile, JSON.stringify(stats, null, 2));
  console.log(`  log → ${logFile}`);

  if (!DRY_RUN && stats.applied > 0) {
    try {
      await queueAudioPass(supabase, {
        courseCode,
        reason: `BUILD template-stamp regeneration — ${stats.applied} build rows re-texted (audit 2026-07-24); rows need (re)voicing`,
        requestedBy: '@fable-build-stamp-sweep',
        metadata: { rows_applied: stats.applied, sweep: 'template-stamp-2026-07-24' },
      });
      console.log(`  ✓ audio-pass request queued for ${courseCode}`);
    } catch (e) {
      console.log(`  ⚠ audio-pass queue failed for ${courseCode}: ${e.message}`);
    }
  }
  return stats;
}

async function regenLego(courseCode, key, stampedRows, ctx) {
  const { legoByKey, chunksAt, pairsAt, useByLego, buildByLego, zutMap, chinese, stats } = ctx;
  const lego = legoByKey.get(key);
  const [seedS] = key.split(':');
  const seedNumber = +seedS;
  const priorChunks = chunksAt.get(key) || new Set();
  const priorPairs = pairsAt.get(key) || [];
  const usePhrases = useByLego.get(key) || [];
  const allBuildRows = buildByLego.get(key) || [];
  const stampedIds = new Set(stampedRows.map(r => r.id));
  const keptRows = allBuildRows.filter(r => !stampedIds.has(r.id));

  // Chunks available to this lego's phrases: prior + the lego itself (+ components)
  const withLego = new Set(priorChunks);
  extractVocab(lego.target, chinese).forEach(v => withLego.add(v));
  if (lego.type === 'M' && lego.components) for (const c of lego.components) extractVocab(c.target, chinese).forEach(v => withLego.add(v));

  const existingNorms = new Set([...keptRows, ...usePhrases].map(p => normalizeForContainment(p.target)));
  const legoZutNormK = normalizeForZUT(lego.known, false);

  const validateCandidate = (cand, acceptedSoFar) => {
    const nT = normalizeForContainment(cand.target);
    if (!nT) return 'empty';
    if (existingNorms.has(nT) || acceptedSoFar.some(a => normalizeForContainment(a.target) === nT)) return 'duplicate';
    if (chinese ? !checkSubstringContainment(lego.target, cand.target, courseCode) : !checkWordContainment(lego.target, cand.target, courseCode)) return 'containment';
    if (checkVocabViolations([cand], withLego, courseCode).length > 0) return 'vocab';
    const useStemNorms = new Set(usePhrases.map(p => normalizeForContainment(p.target)));
    const { cls } = classifyBuildPhrase(cand.target, lego.target, useStemNorms, false);
    if (cls !== 'ok') return cls;
    const zk = normalizeForZUT(cand.known, false), zt = normalizeForZUT(cand.target, chinese);
    if (zk && zk !== legoZutNormK && zutMap.has(zk) && zutMap.get(zk) !== zt) return 'zut';
    return null;
  };

  const need = stampedRows.length;
  const accepted = [];
  let rejectedHistory = stampedRows.map(r => ({ target: r.target, class: r.cls }));
  let usedModel = null;

  const ATTEMPTS = [
    { model: 'sonnet' }, { model: 'sonnet' }, { model: 'sonnet' },
    { model: 'opus' }, { model: 'opus' },
  ];
  for (const [i, attempt] of ATTEMPTS.entries()) {
    if (accepted.length >= need) break;
    try {
      const fresh = await escalateBuildPhrases({
        courseCode,
        lego: { known: lego.known, target: lego.target },
        usePhrases: usePhrases.map(p => ({ known: p.known, target: p.target })),
        priorPairs,
        need: need - accepted.length,
        rejected: rejectedHistory.slice(-8),
      }, { model: attempt.model });
      for (const cand of fresh || []) {
        if (accepted.length >= need) break;
        const why = validateCandidate(cand, accepted);
        if (why) rejectedHistory.push({ target: cand.target, class: why });
        else {
          accepted.push(cand);
          if (attempt.model === 'opus') usedModel = 'opus';
          else if (!usedModel) usedModel = 'sonnet';
        }
      }
    } catch (e) {
      console.log(`  ⚠ ${courseCode} ${key}: attempt ${i + 1} (${attempt.model}) errored: ${e.message}`);
    }
  }

  if (accepted.length === 0) {
    stats.failed += stampedRows.length;
    stats.unresolved_legos.push({ lego: key, target: lego.target, stamped: stampedRows.length, rejected_tail: rejectedHistory.slice(-10) });
    console.log(`  ✗ S${String(seedNumber).padStart(4, '0')}L${String(lego.idx).padStart(2, '0')} "${lego.target}": no valid replacements after ${ATTEMPTS.length} attempts — rows left untouched`);
    return;
  }
  if (usedModel === 'opus') stats.opus_legos++; else stats.sonnet_legos++;

  // Apply: replace stamped rows in place, pairing row i with accepted i.
  for (let i = 0; i < stampedRows.length; i++) {
    const row = stampedRows[i];
    const repl = accepted[i];
    if (!repl) { stats.failed++; stats.rows.push({ id: row.id, status: 'unfilled', old_target: row.target }); continue; }
    const entry = {
      id: row.id, lego: key, class: row.cls, model: usedModel,
      old: { known: row.known, target: row.target },
      new: { known: repl.known, target: repl.target },
    };
    if (DRY_RUN) {
      entry.status = 'dryrun';
      stats.rows.push(entry);
      stats.applied++;
      continue;
    }
    // Before-state assertion: abort this row on drift.
    const { data: current, error: readErr } = await supabase
      .from('course_practice_phrases').select('target_text, metadata').eq('id', row.id).single();
    if (readErr || !current || current.target_text !== row.target) {
      entry.status = 'drift-skipped';
      stats.rows.push(entry); stats.failed++;
      console.log(`  ⚠ ${row.id}: before-state drift — skipped`);
      continue;
    }
    const { error: updErr } = await supabase.from('course_practice_phrases').update({
      known_text: repl.known,
      target_text: repl.target,
      word_count: repl.target.length,
      lego_count: ((repl.known || '').match(/\s+/g) || []).length + 1,
      metadata: { ...(current.metadata || {}), regenerated: 'template-stamp-2026-07-24', prev_target: row.target, regen_model: usedModel },
    }).eq('id', row.id);
    if (updErr) {
      entry.status = 'update-error'; entry.error = updErr.message;
      stats.rows.push(entry); stats.failed++;
      console.log(`  ⚠ ${row.id}: update failed — ${updErr.message}`);
      continue;
    }
    entry.status = 'applied';
    stats.rows.push(entry);
    stats.applied++;
  }
  console.log(`  ✓ S${String(seedNumber).padStart(4, '0')}L${String(lego.idx).padStart(2, '0')} "${lego.target}" [${usedModel}]: ${Math.min(accepted.length, stampedRows.length)}/${stampedRows.length} replaced`);
}

// ── main ──
(async () => {
  let courses;
  if (COURSE) courses = [COURSE];
  else {
    courses = q(`select course_code from (select course_code, count(*) n from course_practice_phrases where phrase_role='build' group by course_code) t where n > 200 order by course_code`).map(r => r[0]);
  }
  const summary = [];
  for (const c of courses) {
    try {
      const s = await sweepCourse(c);
      summary.push({ course: c, stamped_before: s.stamped_before, applied: s.applied, failed: s.failed, sonnet_legos: s.sonnet_legos, opus_legos: s.opus_legos });
    } catch (e) {
      console.error(`✗ ${c}: sweep error — ${e.message}`);
      summary.push({ course: c, error: e.message });
    }
  }
  console.log('\n══════ SWEEP SUMMARY ══════');
  for (const s of summary.filter(x => x.stamped_before || x.error)) console.log(JSON.stringify(s));
  fs.writeFileSync(path.join(LOG_DIR, `sweep-summary-${DRY_RUN ? 'dryrun' : 'applied'}.json`), JSON.stringify(summary, null, 2));
})();
