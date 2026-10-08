#!/usr/bin/env node
/**
 * GAP-FILL ONE COURSE, END TO END, WRITING EVIDENCE ONLY (job #924, 2026-10-08).
 *
 * Tom, 2026-10-08: "identify the weak places in the courses and create more
 * phrases ... using the Popty gates to ensure full compliance with the
 * methodology". Three stages, each resumable from its own output:
 *
 *   1. MEASURE  — measure.cjs (Haiku frame tags, cached estate-wide) → the
 *                 course's 10-seed windows and what each is missing.
 *   2. FILL     — every weak window (coverage < WEAK, seeds 11+; seeds 1-10 are
 *                 hand-tweaked, Tom 2026-09-20) gets generate-v4 --gaps: up to
 *                 two cumulative Opus passes. A window whose file already holds
 *                 two passes, or has nothing left missing, is skipped — so a
 *                 killed run resumes and nothing is generated twice.
 *   3. GATE     — every kept candidate is replayed through POPTY'S OWN gates
 *                 (tools/phrase-gate/gate-check.cjs = the /api/seed/complete
 *                 library functions) plus the course-wide checks a per-seed
 *                 gate cannot see. Anything that fails anything is DROPPED with
 *                 its reason, never repaired here ("if in doubt — cut it out").
 *                 Output: staged-<course>.json, the one file the applier reads.
 *
 * NOTHING HERE WRITES A COURSE ROW. Every paying course in this Supabase is
 * served to learners (status beta/released; there is no staging copy of
 * course_practice_phrases), so landing rows is apply-gap-fill.cjs's job and
 * needs Tom's go.
 *
 * Usage: node tools/frame-layer/v4/gap-fill-course.cjs <course> [--max-windows N] [--gate-only] [--no-fill]
 * Env:   V4_RUN_DIR (default ~/ssi-evidence/ssi-dashboard-v7/924-phrase-v4-all-courses)
 *        V4_MODEL defaults to opus here (the decision for this job); V4_WINDOW_BUDGET (default 200000)
 * Exit:  0 done · 75 the model refused (usage limit) — re-run later, it resumes.
 */
const fs = require('fs');
const path = require('path');

const MAIN = require.main === module;
const course = MAIN ? process.argv[2] : null;
if (MAIN && (!course || course.startsWith('--'))) { console.error('usage: gap-fill-course.cjs <course> [--max-windows N] [--gate-only]'); process.exit(1); }
const RUN_DIR = process.env.V4_RUN_DIR || path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '924-phrase-v4-all-courses');
const DIR = course ? path.join(RUN_DIR, course) : null;
if (MAIN) {
  fs.mkdirSync(DIR, { recursive: true });
  // generate-v4 and measure read these at require time
  process.env.V4_EVIDENCE = DIR;
  process.env.V4_MODEL = process.env.V4_MODEL || 'opus';
}

require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env'), quiet: true });
const { measure, WEAK } = require('./measure.cjs');
const { runGaps, knownHeardCheck } = require('./generate-v4.cjs');
const NO_SPACE_KNOWN = new Set(['zho', 'jpn', 'yue', 'hak', 'nan', 'tha']);
const { loadCourse } = require('./db.cjs');
const { scoreWindow } = require('./window-coverage.cjs');
const { norm } = require('../availability.cjs');

const FIRST_SEED = 11;
const MAX_PASSES = 2;

/** Weak 10-seed windows, weakest first. Pure, so the selection rule is testable. */
function pickWindows(m, { weak = WEAK, firstSeed = FIRST_SEED, max = Infinity } = {}) {
  return m.windows.all.w10
    .filter(w => w.start >= firstSeed && w.coverage < weak && w.available > 0)
    .sort((a, b) => a.coverage - b.coverage || a.start - b.start)
    .slice(0, max)
    .map(w => ({ start: w.start, end: w.end, coverage: w.coverage, missing: w.missing_ids }));
}

// ---------- register screen (tu-first, Tom 2026-07-04) ----------
// Formal or plural-polite address in the target, with nothing in the English
// insisting on it, is cut. Mid-sentence capital Sie/Ihnen is German formal;
// sentence-initial "Sie" is ambiguous, so it is cut too (if in doubt — cut it out).
const REGISTER = {
  fra: /\b(vous|votre|vos)\b/i,
  spa: /\b(usted|ustedes)\b/i,
  deu: /(^|[^.!?]\s)(Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem|Ihrer)\b/,
  por: /\b(o senhor|a senhora|os senhores|as senhoras)\b/i,
};
function registerBreach(courseCode, target, known, legoTarget = '') {
  const lang = courseCode.split('_for_')[0].split('_')[0];
  const re = REGISTER[lang];
  if (!re || !re.test(target)) return null;
  if (re.test(legoTarget)) return null; // the course itself teaches this form in the LEGO being practised
  // vocatively marked, or plainly plural in the English — context insists
  if (/\b(sir|madam|you all|all of you|you two|both of you|you guys)\b/i.test(known)) return null;
  const m = target.match(re);
  return `register: formal address "${(m[2] || m[0]).trim()}" without a vocative (tu-first)`;
}

/** Same English → more than one target anywhere in the candidate set: every one is cut. */
function batchZutConflicts(rows) {
  const byKnown = new Map();
  for (const r of rows) {
    const k = norm(r.known_text);
    if (!byKnown.has(k)) byKnown.set(k, new Set());
    byKnown.get(k).add(norm(r.target_text));
  }
  return new Set([...byKnown].filter(([, ts]) => ts.size > 1).map(([k]) => k));
}

async function fill(m) {
  const windows = pickWindows(m, { max: +(opt('--max-windows') || Infinity) });
  console.log(`${course}: ${windows.length} weak windows (coverage < ${WEAK}, seeds ${FIRST_SEED}+)`);
  fs.writeFileSync(path.join(DIR, 'windows.json'), JSON.stringify(windows, null, 1));
  const budget = +(process.env.V4_WINDOW_BUDGET || 200000);
  for (const w of windows) {
    const file = path.join(DIR, `v4gap-${course}-${w.start}-${w.end}.json`);
    for (;;) {
      const prior = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
      const passes = prior ? (prior.calls || []).length : 0;
      const left = prior ? (prior.after || prior.before).missing_ids : w.missing;
      if (passes >= MAX_PASSES || (prior && !left.length)) break;
      process.env.V4_LEDGER = `ledger-${w.start}.json`;
      try {
        await runGaps(course, w.start, w.end, { budget, missingIn: prior ? left : null });
      } catch (e) {
        console.log(`  ${w.start}-${w.end} FAILED: ${e.message.slice(0, 300)}`);
        if (/limit|rate|quota|overloaded|429|usage/i.test(e.message)) { console.log('model refused — stopping; re-run resumes'); process.exit(75); }
        break;
      }
    }
  }
  return windows;
}

async function gateStage() {
  const { supabase } = require('../../../services/supabase-client.cjs');
  const { makeCourseCtx, checkPhraseSet } = require('../../phrase-gate/gate-check.cjs');
  const { checkPhraseZUT, classifyBuildPhrase } = require('../../../services/course-builder/lib/validation.cjs');
  const { normalizeForContainment } = require('../../../services/course-builder/lib/text-normalization.cjs');
  const data = loadCourse(course);
  const ctx = makeCourseCtx(supabase, course);
  const files = fs.readdirSync(DIR).filter(f => /^v4gap-.*-\d+-\d+\.json$/.test(f)).sort((a, b) => +a.split('-').at(-2) - +b.split('-').at(-2));
  const windowsOut = [];
  const all = [];
  for (const f of files) {
    const w = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    for (const r of w.kept) all.push({ ...r, window: `${w.region[0]}-${w.region[1]}` });
    windowsOut.push(w);
  }
  const legoOf = (r) => data.legos.find(l => l.seed_number === r.seed_number && +l.lego_index === +r.lego_index);
  const liveUse = (r) => new Set(data.phrases.filter(p => p.seed_number === r.seed_number && +p.lego_index === +r.lego_index && p.phrase_role === 'use').map(p => normalizeForContainment(p.target_text)));
  const conflicts = batchZutConflicts(all);
  const seen = new Set();
  const accepted = [], dropped = [];
  for (const r of all) {
    const reasons = [];
    const lego = legoOf(r);
    if (!lego || lego.target_text !== r.lego_target || lego.known_text !== r.lego_known) reasons.push('LEGO changed or gone since generation');
    if (/[()]/.test(r.known_text + r.target_text)) reasons.push('parentheses');
    const reg = registerBreach(course, r.target_text, r.known_text, r.lego_target); if (reg) reasons.push(reg);
    const key = norm(r.known_text) + '|' + norm(r.target_text);
    if (seen.has(key)) reasons.push('duplicate of another candidate');
    if (conflicts.has(norm(r.known_text))) reasons.push('ZUT: same English given different targets across windows');
    if (!reasons.length) {
      const res = await checkPhraseSet({ courseCode: course, seedNumber: r.seed_number, legoIndex: r.lego_index, legoKnown: r.lego_known, legoTarget: r.lego_target,
        phrases: [{ role: r.phrase_role, known: r.known_text, target: r.target_text }] }, ctx);
      // Per-phrase gates are authoritative. Basket-shape gates (buildCountSpec,
      // buildUseFloors, buildRecombination's count, separableContrast) judge a
      // whole basket; the live basket already passed them and additive rows
      // cannot lower a floor.
      for (const g of ['bareLego', 'containment', 'vocab', 'zut']) if (res.gates[g] && res.gates[g].pass === false) reasons.push(`popty:${g} ${JSON.stringify(res.gates[g]).slice(0, 200)}`);
      if (res.gates.knownSide.pass === false) reasons.push(`popty:knownSide ${JSON.stringify(res.gates.knownSide.breaches).slice(0, 200)}`);
      if (res.gates.knownSide.pass === null) {
        // No pair-contract for this known language: the live route skips the check
        // silently. Here it never skips — every known word must already have been
        // heard in this course by the LEGO's seed, or the row is cut.
        const heard = [...data.seeds.filter(x => x.seed_number <= r.seed_number), ...data.legos, ...data.components]
          .filter(x => x.seed_number < r.seed_number || (x.seed_number === r.seed_number && (x.lego_index == null || +x.lego_index <= +r.lego_index)))
          .map(x => x.known_text);
        const bad = knownHeardCheck(r.known_text, heard, NO_SPACE_KNOWN.has(course.split('_for_')[1].split('_')[0]));
        if (bad.length) reasons.push(`knownSide (no contract; heard-words fallback): unheard ${bad.join(' ')}`);
      }
      if (r.phrase_role === 'build') {
        const { cls } = classifyBuildPhrase(r.target_text, r.lego_target, liveUse(r), false);
        if (['bare-repeat', 'comma-tag', 'use-stem+tag'].includes(cls)) reasons.push(`popty:buildTemplate ${cls}`);
      }
      // Popty's ZUT bounds to prior seeds; a USE row is eternal, so also the whole course, later seeds included.
      const whole = await checkPhraseZUT(supabase, course, [{ known: r.known_text, target: r.target_text }], null);
      if (whole.length) reasons.push(`ZUT whole course: "${whole[0].known}" is "${whole[0].existing_target}" at seed ${whole[0].existing_seed}`);
    }
    seen.add(key);
    (reasons.length ? dropped : accepted).push(reasons.length ? { ...r, reasons } : r);
  }
  const { tagCourse } = require('./tag-course.cjs');
  const { ensureTagged, knownLanguageName } = require('../frame-tagger.cjs');
  await tagCourse(course, data, { log: () => {} });
  await ensureTagged(accepted.map(a => a.known_text), { knownLanguage: knownLanguageName(course), log: () => {} });
  // Coverage per window: live alone vs live + accepted (frames re-derived by the tagger, never the model's claim)
  const perWindow = windowsOut.map(w => {
    const [s, e] = w.region;
    const live = data.phrases.filter(p => p.seed_number >= s && p.seed_number <= e);
    const mine = accepted.filter(a => a.seed_number >= s && a.seed_number <= e);
    const before = scoreWindow(live, w.available_frames, { rarefyN: 60 });
    const after = scoreWindow([...live, ...mine], w.available_frames, { rarefyN: 60 });
    return { start: s, end: e, live: live.length, accepted: mine.length, coverage_before: before.coverage, coverage_after: after.coverage,
      used_before: before.used, used_after: after.used, available: w.available_frames.length, still_missing: after.missing_ids };
  });
  const reasonCounts = {};
  for (const d of dropped) for (const r of d.reasons) { const k = r.split(/[ :]/).slice(0, 2).join(':'); reasonCounts[k] = (reasonCounts[k] || 0) + 1; }
  const tokens = windowsOut.reduce((a, w) => a + (w.calls || []).reduce((b, c) => b + (c.total || 0), 0), 0);
  const out = { course, generated: new Date().toISOString(), live_rows_at_gate: data.phrases.length, candidates: all.length,
    accepted: accepted.length, dropped: dropped.length, drop_reasons: reasonCounts, opus_tokens: tokens,
    by_role: { build: accepted.filter(a => a.phrase_role === 'build').length, use: accepted.filter(a => a.phrase_role === 'use').length },
    windows: perWindow, rows: accepted, dropped_rows: dropped };
  fs.writeFileSync(path.join(DIR, `staged-${course}.json`), JSON.stringify(out, null, 1));
  console.log(`${course} GATED: ${all.length} candidates → ${accepted.length} accepted (${out.by_role.build} BUILD / ${out.by_role.use} USE), ${dropped.length} dropped ${JSON.stringify(reasonCounts)}`);
  for (const w of perWindow) console.log(`  ${w.start}-${w.end}: ${w.coverage_before} → ${w.coverage_after} (+${w.accepted})`);
  return out;
}

function opt(k) { const a = process.argv; const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; }

async function main() {
  const has = (f) => process.argv.includes(f);
  if (!has('--gate-only')) {
    const mfile = path.join(DIR, `measure-${course}.json`);
    const m = fs.existsSync(mfile) ? JSON.parse(fs.readFileSync(mfile, 'utf8')) : await measure(course, { log: () => {} });
    fs.writeFileSync(mfile, JSON.stringify(m, null, 1));
    console.log(`${course}: mean w10 ${m.summary.mean_w10}, weak ${m.summary.weak_w10}/${m.summary.w10_count}`);
    if (!has('--no-fill')) await fill(m);
  }
  await gateStage();
}

module.exports = { pickWindows, registerBreach, batchZutConflicts };
if (MAIN) main().then(() => process.exit(0)).catch(e => { console.error(e.stack || e.message); process.exit(1); });
