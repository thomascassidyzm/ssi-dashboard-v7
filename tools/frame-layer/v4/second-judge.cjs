#!/usr/bin/env node
/**
 * SECOND INDEPENDENT JUDGE (job #533, Tom 2026-10-09 18:09Z: "As long as we've had 2 agent
 * processes checking them as well as the Popty course builder gates").
 *
 * A different process, model family tier and prompt from quality-judge.cjs, and it never reads
 * judge-<course>.jsonl: it sees only the staged rows. It reads every row as a native reader of
 * BOTH languages and cuts on doubt. A reply with no readable verdict cuts the whole batch.
 * Writes judge2-<course>.jsonl (append-only cache), keeps the untouched staged file as
 * staged-<course>.pre-judge2.json, and rewrites staged-<course>.json without the cut rows.
 *
 * Usage: node tools/frame-layer/v4/second-judge.cjs <course> [--dry]
 *   --print            print the numbered pairs (the judge's whole view) and exit
 *   --cuts <file.json> apply a verdict {"cut":[{"n","why"}]} made by an agent session over that
 *                      numbering instead of calling a model (the local CLI account can be limited)
 */
const fs = require('fs');
const path = require('path');
const { callModel, knownLanguageName } = require('../frame-tagger.cjs');
const { parseCuts, keyOf } = require('./quality-judge.cjs');

const MODEL = process.env.V4_JUDGE2_MODEL || 'sonnet';
const BATCH = 30;
const RUN_DIR = process.env.V4_RUN_DIR || path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '924-phrase-v4-all-courses');

function buildPrompt(course, rows) {
  const KNOWN = knownLanguageName(course);
  const TARGET = knownLanguageName(`x_for_${course.split('_for_')[0].split('_')[0]}`);
  const lines = rows.map((r, i) => `${i + 1}. [${r.phrase_role}] ${KNOWN}: ${r.known_text}\n   ${TARGET}: ${r.target_text}`).join('\n');
  return `You are a bilingual ${KNOWN}/${TARGET} reviewer. Below are numbered sentence pairs for a spoken-language course: a ${KNOWN} speaker hears the ${KNOWN} line and must produce the ${TARGET} line from it, so the ${TARGET} line is the single answer.
Read each pair as a real speaker of both languages would. Mark a pair for removal if ANY of these holds:
- the ${TARGET} does not mean exactly what the ${KNOWN} says (dropped or added meaning, wrong tense, wrong person, wrong gender or number, wrong who-does-what);
- either line is ungrammatical, a word-for-word calque, or something a native would not say cold, out of context (odd quotas, arbitrary numbers, stilted passives, contrived scenarios);
- the ${KNOWN} line is ambiguous in a way that makes the ${TARGET} answer a guess;
- a [build] line is a fragment that cannot extend naturally into a full sentence by adding words before or after it ([use] lines must already be a complete natural sentence).
When unsure, mark it for removal: a wrongly removed pair costs nothing, a wrongly kept pair teaches an error.

Reply with JSON only: {"cut":[{"n":<number>,"why":"<one line>"}]} listing only the pairs to remove (empty list if none).

${lines}`;
}

async function main() {
  const course = process.argv[2];
  if (!course) throw new Error('usage: second-judge.cjs <course> [--dry]');
  const file = path.join(RUN_DIR, course, `staged-${course}.json`);
  const backup = path.join(RUN_DIR, course, `staged-${course}.pre-judge2.json`);
  if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
  const staged = JSON.parse(fs.readFileSync(backup, 'utf8')); // always judge the pre-judge2 set
  const cacheFile = path.join(RUN_DIR, course, `judge2-${course}.jsonl`);
  const cache = new Map();
  if (fs.existsSync(cacheFile)) for (const l of fs.readFileSync(cacheFile, 'utf8').split('\n')) if (l.trim()) { const j = JSON.parse(l); cache.set(j.k, j); }
  if (process.argv.includes('--print')) { console.log(buildPrompt(course, staged.rows)); return; }
  const ci = process.argv.indexOf('--cuts');
  if (ci > 0) {
    const cuts = parseCuts(fs.readFileSync(process.argv[ci + 1], 'utf8'), staged.rows.length);
    if (!cuts) throw new Error('no readable {"cut":[...]} verdict in the cuts file');
    const out = staged.rows.map((row, i) => ({ k: keyOf(row), cut: cuts.has(i + 1), why: cuts.get(i + 1) || null, model: 'agent-session' }));
    fs.writeFileSync(cacheFile, out.map(o => JSON.stringify(o)).join('\n') + '\n');
    for (const o of out) cache.set(o.k, o);
  }
  const todo = staged.rows.filter(r => !cache.has(keyOf(r)));
  const batches = [];
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));
  let next = 0;
  const worker = async () => {
    while (next < batches.length) {
      const b = batches[next++];
      const r = await callModel(buildPrompt(course, b), { model: MODEL, system: 'You are a strict bilingual language-course editor. Reply with JSON only.' });
      const cuts = parseCuts(r.text, b.length);
      const out = b.map((row, i) => (cuts
        ? { k: keyOf(row), cut: cuts.has(i + 1), why: cuts.get(i + 1) || null, model: r.usage.model }
        : { k: keyOf(row), cut: true, why: 'judge reply carried no readable verdict', model: r.usage.model }));
      fs.appendFileSync(cacheFile, out.map(o => JSON.stringify(o)).join('\n') + '\n');
      for (const o of out) cache.set(o.k, o);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, batches.length) }, worker));
  const kept = staged.rows.filter(r => !cache.get(keyOf(r)).cut);
  const cut = staged.rows.length - kept.length;
  console.log(`${course}: ${staged.rows.length} staged → kept ${kept.length}, cut ${cut} by second judge (${MODEL})`);
  if (!process.argv.includes('--dry')) {
    fs.writeFileSync(file, JSON.stringify({ ...staged, rows: kept, judge2: { model: MODEL, at: new Date().toISOString(), before: staged.rows.length, cut } }, null, 1));
  }
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { buildPrompt };
