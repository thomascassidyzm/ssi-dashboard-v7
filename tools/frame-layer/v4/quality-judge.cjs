/**
 * QUALITY JUDGE — the gate the mechanical gates cannot be (job #924, 2026-10-08).
 *
 * Popty's gates prove vocabulary, containment, ZUT and the known-side contract;
 * they cannot hear a wrong tense, a calque, or a clunky English prompt. An Astra
 * cold read of 80 gated French rows cut 9 of them (#17·M: 4 French errors,
 * 5 tier-2 USE prompts). So every gated row also goes past a model judge that
 * applies the clunkiness law (Tom, 2026-07-04: USE is tier-1-or-die; BUILD may
 * be a fragment but must extend naturally) and the meaning check, and any row it
 * flags is CUT — "if in doubt, cut it out". The judge never repairs a row.
 *
 * Verdicts are cached per course (judge-<course>.jsonl, append-only), keyed by
 * role + known + target, so a re-run pays only for rows it has not judged.
 */
const fs = require('fs');
const path = require('path');
const { callModel, knownLanguageName } = require('../frame-tagger.cjs');

const MODEL = process.env.V4_JUDGE_MODEL || 'opus';
const BATCH = 40;
const keyOf = (r) => `${r.phrase_role}|${r.known_text}|${r.target_text}`;

function buildJudgePrompt(course, rows) {
  const KNOWN = knownLanguageName(course);
  const TARGET = knownLanguageName(`x_for_${course.split('_for_')[0].split('_')[0]}`);
  const lines = rows.map((r, i) => `${i + 1}. [${r.phrase_role.toUpperCase()}] LEGO "${r.lego_known}" = ${r.lego_target} || ${KNOWN}: ${r.known_text} || ${TARGET}: ${r.target_text}`).join('\n');
  return `These are machine-generated practice phrases for a course teaching ${TARGET} to ${KNOWN} speakers. The learner hears the ${KNOWN} line and must say the ${TARGET} line. Each practises the LEGO named. Vocabulary and one-prompt-one-answer have already been proved mechanically. Judge ONLY:
1. Is the ${TARGET} correct, natural ${TARGET} that means exactly the ${KNOWN} line? (grammar, tense, agreement, mood, idiom; no calques)
2. Is the ${KNOWN} line natural ${KNOWN}? A USE row must be one complete sentence a native speaker would say cold, out of context. Tier 1 = natural (keep). Tier 2 = possible but clunky, stilted, or needs a lot of context — arbitrary numbers, odd quotas, passive where nobody would use it (cut). Tier 3 = wrong (cut).
3. A BUILD row may be a fragment, but it must extend naturally into a full non-clunky sentence by adding words before or after (else cut).
4. Informal register is the default; plural or polite forms are fine only where the ${KNOWN} line marks them.
If in doubt, cut.

Reply with JSON only: {"cut":[{"n":<number>,"why":"<one line>"}]} — list only rows to cut; an empty list if none.

${lines}`;
}

function parseCuts(text, n) {
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error('judge: no JSON in reply');
  const cut = (JSON.parse(m[0]).cut || []).filter(c => Number.isInteger(+c.n) && +c.n >= 1 && +c.n <= n);
  return new Map(cut.map(c => [+c.n, String(c.why || 'judge cut')]));
}

async function judgeRows(course, rows, dir, { parallel = 4, log = console.log } = {}) {
  const file = path.join(dir, `judge-${course}.jsonl`);
  const cache = new Map();
  if (fs.existsSync(file)) for (const l of fs.readFileSync(file, 'utf8').split('\n')) if (l.trim()) { const j = JSON.parse(l); cache.set(j.k, j); }
  const todo = rows.filter(r => !cache.has(keyOf(r)));
  const batches = [];
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));
  let tokens = 0, next = 0;
  const worker = async () => {
    while (next < batches.length) {
      const b = batches[next++];
      const r = await callModel(buildJudgePrompt(course, b), { model: MODEL, system: 'You are a strict native-speaker editor for a language course. Reply with JSON only.' });
      const cuts = parseCuts(r.text, b.length);
      tokens += r.usage.total;
      const out = b.map((row, i) => ({ k: keyOf(row), cut: cuts.has(i + 1), why: cuts.get(i + 1) || null, model: r.usage.model }));
      fs.appendFileSync(file, out.map(o => JSON.stringify(o)).join('\n') + '\n');
      for (const o of out) cache.set(o.k, o);
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, batches.length) }, worker));
  if (todo.length) log(`  judge: ${todo.length} rows in ${batches.length} calls (${MODEL}), ${tokens} tokens`);
  return rows.map(r => cache.get(keyOf(r)));
}

module.exports = { judgeRows, buildJudgePrompt, parseCuts, keyOf, MODEL };
