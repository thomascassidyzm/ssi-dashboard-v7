#!/usr/bin/env node
/**
 * scan-course Check 21 — MISSING QUESTION MARKS, both sides, as a runnable check.
 *
 *   node tools/check-question-marks.cjs <course_code>
 *   node tools/check-question-marks.cjs <course_code> --json
 *   node tools/check-question-marks.cjs <course_code> --calibrate    # recall only
 *   node tools/check-question-marks.cjs <course_code> --reading-list # write the list + brief
 *
 * READ-ONLY, WARN-ONLY. It never writes to course content, never generates audio,
 * never appends a `?`, and always exits 0. It is a reading list, not a verdict, and
 * the fixes are Kai's to approve because every one of them costs a re-render.
 *
 * WHY A `?` IS NOT COSMETIC, WHICH IS THE WHOLE REASON THIS CHECK IS WARN-ONLY.
 * Canon A7 (Kai, 2026-08-17): "Full stop makes no difference btw! Question marks can
 * make it sound different so they're significant enough to regenerate if needed."
 * A9: the mark must be present BEFORE the audio is generated, because it changes how
 * the line is read aloud. And the trap underneath both: `normalize_text()` STRIPS a
 * trailing `?`, so the A5 trigger looks at the edit, decides the clip still speaks the
 * new text, and KEEPS THE LINK. Adding the mark therefore does not unlink anything —
 * it leaves a statement-intoned clip attached to a question, with no error, no silence
 * and nothing anywhere that will complain. Every fix from this check obliges a queued
 * audio pass (O8), and the old Check 14 remediation snippet — which nulled the audio
 * ids by hand — is wrong twice over: the trigger owns the unlinking (A5), and a null
 * leaves the slot SILENT rather than stale (A19/O11, make-before-break).
 *
 * THE TWO PASSES. This is Kai's method, 2026-09-10, and both halves are required:
 *   1. the nets produce a candidate list, which a reader then reads IN FULL —
 *      "NEVER trust it on its own!". The opener net ran at 61% false positives on
 *      ita_for_eng, so applying its output unread would be applying a list that is
 *      mostly wrong.
 *   2. an INDEPENDENT read through spans of seeds in order, to catch what no pattern
 *      can. `--reading-list` writes both briefs. See the Check 21 section of
 *      .claude/commands/scan-course.md for how the reading agent is dispatched: this
 *      file is a CLI with no surface credentials and cannot spawn one itself.
 *
 * IT PRINTS ITS OWN RECALL NEXT TO ITS VERDICT, ALWAYS. Every course carries a free
 * set of known positives — the rows already marked on both sides. The check strips
 * their marks, re-runs itself over them, and reports how many it would have found.
 * A run below the recall floor is a FAILED run, not a clean course (canon A3; WC-F2).
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.psql'), quiet: true });
const { Client } = require('pg');
const { classify, calibrate, hasOpenerSet } = require('./question-marks/detect.cjs');

const RECALL_FLOOR = 98.0;

async function query(sql, params = []) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try { return (await c.query(sql, params)).rows; } finally { await c.end(); }
}

/**
 * One course, one round trip per table. Seeds and practice phrases are judged;
 * LEGOs and component tiles are loaded as FRAGMENTS so they are counted and named in
 * the report rather than quietly filtered out of the denominator.
 */
async function load(course) {
  const [meta] = await query('select known_lang, target_lang from courses where course_code = $1', [course]);
  const seeds = await query(
    `select seed_id as id, seed_number, known_text, target_text from course_seeds
      where course_code = $1 order by seed_number`, [course]);
  const legos = await query(
    `select id, seed_number, known_text, target_text from course_legos
      where course_code = $1 order by seed_number, lego_index`, [course]);
  const phrases = await query(
    `select id, seed_number, phrase_role, known_text, target_text from course_practice_phrases
      where course_code = $1 order by seed_number, position`, [course]);
  const rows = [
    ...seeds.map((r) => ({ ...r, kind: 'seed', is_fragment: false })),
    ...legos.map((r) => ({ ...r, kind: 'lego', is_fragment: true })),
    ...phrases.map((r) => ({ ...r, kind: r.phrase_role, is_fragment: r.phrase_role === 'component' })),
  ];
  return { meta, rows };
}

async function runCourse(course) {
  const { meta, rows } = await load(course);
  if (!meta) return { course, error: 'NO SUCH COURSE' };
  if (!rows.length) return { course, error: 'NO CONTENT — course absent or empty' };
  const opts = { knownLang: meta.known_lang, targetLang: meta.target_lang };
  const r = classify(rows, opts);
  const cal = calibrate(rows, opts);
  return { course, ...opts, ...r, calibration: cal };
}

// The two briefs the reading pass is dispatched with. They are written next to the
// candidate list so the list and the instruction for reading it never drift apart.
function briefs(r, listPath) {
  const nets = `Net 1 (sides disagree): ${r.netYield.mismatch}. Net 2 (known-side openers): ${r.netYield.opener_known}. `
    + `Net 2b (target-side openers): ${r.netYield.opener_target}. Net 3 (sibling frames): ${r.netYield.frame}. Net 4 (tail): ${r.netYield.tail}.`;
  return {
    pass1: [
      `READ EVERY LINE of ${listPath} and confirm or reject each one as a genuinely missing question mark on ${r.course}.`,
      `Known side is ${r.knownLang}, target side is ${r.targetLang}. ${nets}`,
      `A regex list is a READING LIST, never a verdict — Kai, 2026-09-10: "NEVER trust it on its own!".`,
      `CONFIRM only a COMPLETE, STANDALONE DIRECT QUESTION. REJECT a subordinate clause ("what you said",`,
      `"where it was"), an infinitive frame ("how to speak"), and a syntactically incomplete build fragment`,
      `("can you tell me what", "which of"). Where a short build step is question-shaped but you cannot tell`,
      `whether it is a whole question — "how much", "what happens", "can you tell me" — put it in a JUDGEMENT`,
      `list for Kai rather than confirming it: that is a content decision, not a pattern.`,
      `Report your FALSE-POSITIVE RATE from your own reading, and quote BOTH SIDES of every confirmed row so`,
      `Kai can check the target language himself. Propose, never apply: each fix costs a clip re-render.`,
    ].join('\n'),
    pass2: [
      `INDEPENDENTLY of any candidate list, read the seeds of ${r.course} in order, both sides, and then read`,
      `two or three full spans of practice phrases in seed order — one span where the nets found defects and`,
      `one where they found none. You are looking for questions with no question mark that no pattern would`,
      `catch, and the point of the pass is the COMPARISON: report what you found that the regex list did not,`,
      `and note anything else you see on the way, because a reader in order sees a class of defect no`,
      `punctuation check ever fires on.`,
    ].join('\n'),
  };
}

function writeReadingList(r, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const listPath = path.join(dir, `${r.course}-question-mark-candidates.tsv`);
  const line = (x, cls) => [cls, x.tier || 'A', x.kind, x.id, (x.nets || [x.side]).join(','), x.known_text, x.target_text].join('\t');
  fs.writeFileSync(listPath, [
    ['class', 'tier', 'kind', 'id', 'nets', 'known_text', 'target_text'].join('\t'),
    ...r.mismatches.map((x) => line(x, 'SIDES_DISAGREE')),
    ...r.pairedOpen.map((x) => line({ ...x, tier: 'A', nets: [`missing_opening_${x.mark}_on_${x.side}`] }, 'PAIRED_MARK')),
    ...r.candidates.map((x) => line(x, 'CANDIDATE')),
  ].join('\n') + '\n');
  const b = briefs(r, listPath);
  fs.writeFileSync(path.join(dir, `${r.course}-reading-brief-pass1.txt`), b.pass1 + '\n');
  fs.writeFileSync(path.join(dir, `${r.course}-reading-brief-pass2.txt`), b.pass2 + '\n');
  return listPath;
}

function print(r) {
  if (r.error) { console.log(`${r.course}: ${r.error}`); return; }
  const c = r.calibration;
  console.log(`[21] MISSING QUESTION MARKS: ${r.mismatches.length} sides-disagree + ${r.candidates.length} candidates to read`);
  console.log(`     recall: ${c.caught}/${c.knownPositives} of this course's own marked questions re-found when their marks are stripped (${c.recall}%)`);
  if (c.recall < RECALL_FLOOR) {
    console.log(`     ⚠️  recall below ${RECALL_FLOOR}% — treat this run as FAILED, not clean. The misses below name the classes the nets are blind to.`);
    for (const m of c.missed.slice(0, 20)) console.log(`     MISSED  ${m.id}  ${JSON.stringify(m.known_text)} || ${JSON.stringify(m.target_text)}`);
    if (c.missed.length > 20) console.log(`     … ${c.missed.length - 20} more misses`);
  }
  if (r.pairedLang) {
    const pct = r.pairedClosers ? ((100 * r.pairedOpen.length) / r.pairedClosers).toFixed(0) : 0;
    console.log(`     paired marks (${r.pairedLang}): ${r.pairedOpen.length} of ${r.pairedClosers} rows that close with ? are missing the opening ¿ (${pct}%)`);
    if (r.pairedClosers && r.pairedOpen.length / r.pairedClosers > 0.9) {
      console.log(`         ⚠️  that is nearly all of them — this is a HOUSE STYLE, not a defect list. Kai's call about the course, not a row-by-row fix.`);
    }
    for (const x of r.pairedOpen.slice(0, 10)) console.log(`       ¿ ${x.id.padEnd(26)} [${x.side}]  ${JSON.stringify(x.side === 'known' ? x.known_text : x.target_text)}`);
    if (r.pairedOpen.length > 10) console.log(`       … ${r.pairedOpen.length - 10} more`);
  }
  console.log(`     suppressed: ${r.suppressed.length} rows matched an opener but were withheld as never-a-question (wh + infinitive); counted, not dropped — see --json`);
  console.log(`     population: ${r.judged} judged of ${r.rows} rows — ${r.fragments} LEGOs and component tiles excluded as fragments (chunks never carry terminal punctuation)`);
  console.log(`     nets: sides-disagree ${r.netYield.mismatch} | known-openers(${r.knownLang}) ${r.knownOpeners ? r.netYield.opener_known : 'NO PATTERN SET'}` +
              ` | target-openers(${r.targetLang}) ${r.targetOpeners ? r.netYield.opener_target : 'NO PATTERN SET'}` +
              ` | sibling-frames ${r.netYield.frame} | tail ${r.netYield.tail}`);
  if (!r.knownOpeners && !r.targetOpeners) {
    console.log(`     ⚠️  no opener pattern set for either ${r.knownLang} or ${r.targetLang} — only the language-independent nets ran.`);
    console.log(`         This is NOT a clean course. Add a set to tools/question-marks/detect.cjs and re-run --calibrate.`);
  }
  console.log('');
  console.log(`     SIDES DISAGREE (${r.mismatches.length}) — the row's own two sides contradict each other, so this class needs no inference:`);
  for (const m of r.mismatches.slice(0, 30)) {
    console.log(`       ${m.id.padEnd(26)} [${m.side}]  ${JSON.stringify(m.known_text)} || ${JSON.stringify(m.target_text)}`);
  }
  if (r.mismatches.length > 30) console.log(`       … ${r.mismatches.length - 30} more`);
  console.log('');
  console.log(`     CANDIDATES (${r.candidates.length}) by tier: ${JSON.stringify(r.byTier)} — READ EVERY ONE, strongest first.`);
  console.log(`     This list is not a verdict. On ita_for_eng tier B ran at roughly one true in three and tier D at zero in 511.`);
  for (const x of r.candidates.slice(0, 30)) {
    console.log(`       ${x.tier} ${x.id.padEnd(26)} [${x.nets.join(',')}]  ${JSON.stringify(x.known_text)} || ${JSON.stringify(x.target_text)}`);
  }
  if (r.candidates.length > 30) console.log(`       … ${r.candidates.length - 30} more — use --reading-list to write the full list out`);
  console.log('');
  console.log(`     NOT DONE YET: this is pass 1 of 2. Run --reading-list and dispatch both reading briefs;`);
  console.log(`     a candidate list nobody has read is not a finding, and the independent span read is what`);
  console.log(`     catches the rows no pattern can reach.`);
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const course = args.find((a) => !a.startsWith('--'));
  if (!course) {
    console.error('usage: check-question-marks.cjs <course_code> [--json] [--calibrate] [--reading-list [dir]]');
    process.exit(2);
  }
  const r = await runCourse(course);
  if (args.includes('--calibrate')) {
    if (r.error) { console.log(`${course}: ${r.error}`); return; }
    const c = r.calibration;
    console.log(`CALIBRATION — ${course}: the course's own ${c.knownPositives} already-marked questions, with their marks stripped`);
    console.log(`  recall : ${c.caught}/${c.knownPositives} (${c.recall}%)${c.recall < RECALL_FLOOR ? '  ⚠️ BELOW FLOOR' : ''}`);
    for (const m of c.missed) console.log(`  MISSED  ${m.id}  ${JSON.stringify(m.known_text)} || ${JSON.stringify(m.target_text)}`);
    console.log(`  Read the misses as a list of CLASSES, not as individual failures — that is how the nets get extended.`);
    return;
  }
  if (args.includes('--reading-list')) {
    const i = args.indexOf('--reading-list');
    const dir = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1]
      : path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', 'question-marks');
    const p = writeReadingList(r, dir);
    console.log(`wrote ${r.mismatches.length + r.pairedOpen.length + r.candidates.length} rows to ${p}`);
    console.log(`and both reading briefs alongside it. Neither pass is done until a reader has read them.`);
    return;
  }
  if (json) { console.log(JSON.stringify(r, null, 1)); return; }
  print(r);
}

// Warn-only, always: this check never blocks a course. Exit 0 even on findings.
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { runCourse, load, briefs, RECALL_FLOOR };
