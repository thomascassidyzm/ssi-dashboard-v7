#!/usr/bin/env node
/**
 * RESTORE THE ROWS THE SECOND JUDGE CUT ONLY FOR "he/she is a guess" (job #555, Tom 2026-10-09).
 *
 * Tom: "they need to know that English DOES distinguish... So we have to be obvious by the
 * context. That's what ZUT is all about. No explanations or additional stuff. Have a look at how
 * the rest of the courses do this type of thing."
 *
 * What the live courses do (eng_for_pan/ben/hin, thousands of rows each): the known prompt carries
 * whatever the Indic sentence itself carries (a gendered verb, a gendered earlier clause) and
 * NOTHING is added when it is silent — ਉਸਨੇ/ਉਸਨੂੰ/সে/वह appear bare with he or she as the
 * English answer, and the learner learns from the course's sentences which one the context gives.
 * So a row whose only fault, in the judge's words, is "the pronoun doesn't mark gender" is
 * restored exactly as generated. A row cut for any other fault (ਜੀ→'sir', tense, 'had to') stays cut.
 *
 * Reads judge2-cuts.json + staged-<course>.pre-judge2.json (the full pre-judge set the cuts
 * numbered over), appends the selected rows to staged-<course>.json. Idempotent.
 * Usage: node tools/frame-layer/v4/restore-he-she.cjs <course> [--dry]
 */
const fs = require('fs');
const path = require('path');
const { keyOf } = require('./quality-judge.cjs');

const RUN_DIR = process.env.V4_RUN_DIR || path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '924-phrase-v4-all-courses');
const GENDERED = /\b(he|she|him|her|his|he's|she's)\b/i;

/** True when the judge's only stated fault is that the known pronoun leaves he/she a guess. */
function isHeSheOnly(why, row) {
  if (!/gender unmarked|ambiguous gender|ambiguous/i.test(why || '')) return false;
  if (!/\b(he|she|his|her|him)\b/i.test(why)) return false;
  if (/honorific|\bsir\b|\bhad to\b|pluperfect|tense/i.test(why)) return false;
  return GENDERED.test(row.target_text);
}

function selectRestores(cuts, preRows) {
  return cuts.filter(c => preRows[c.n - 1] && isHeSheOnly(c.why, preRows[c.n - 1])).map(c => preRows[c.n - 1]);
}

function main() {
  const course = process.argv[2];
  if (!course) throw new Error('usage: restore-he-she.cjs <course> [--dry]');
  const dir = path.join(RUN_DIR, course);
  const pre = JSON.parse(fs.readFileSync(path.join(dir, `staged-${course}.pre-judge2.json`), 'utf8'));
  const file = path.join(dir, `staged-${course}.json`);
  const staged = JSON.parse(fs.readFileSync(file, 'utf8'));
  const cuts = JSON.parse(fs.readFileSync(path.join(dir, 'judge2-cuts.json'), 'utf8')).cut;
  const have = new Set(staged.rows.map(keyOf));
  const add = selectRestores(cuts, pre.rows).filter(r => !have.has(keyOf(r)));
  console.log(`${course}: ${add.length} he/she rows to restore (${add.filter(r => r.phrase_role === 'build').length} BUILD / ${add.filter(r => r.phrase_role === 'use').length} USE); staged ${staged.rows.length} → ${staged.rows.length + add.length}`);
  if (process.argv.includes('--dry')) return;
  fs.writeFileSync(file, JSON.stringify({ ...staged, rows: [...staged.rows, ...add], he_she_restored: (staged.he_she_restored || 0) + add.length }, null, 1));
}

module.exports = { isHeSheOnly, selectRestores };
if (require.main === module) main();
