#!/usr/bin/env node
/**
 * STAGE 2 — the reading stage.
 *
 * Everything the pre-filter could not clear is READ, in small batches, by a cheap model that is
 * asked one plain question per item: does this sentence use this word?
 *
 * WHY A READER AND NOT A RULE (Kai's ruling, 2026-08-28). The question "is 'wanted' the word
 * 'want'?" is a language question, and the old gate answered it with a hand-authored list of
 * endings per language. Four languages ever got a list; the other thirty-five returned zero and
 * the zero read as clean. A model can read that question in any language with no list at all,
 * so the list is gone and there is no per-language configuration anywhere in this tool.
 *
 * TIER: haiku by default, sonnet as the ceiling (--model sonnet). This is judging, not designing.
 *
 * The model is asked for one of three answers and is told explicitly that UNSURE is a respectable
 * answer, because a reader that feels obliged to decide is a reader that invents. UNSURE is
 * carried through to the report as its own column and is never counted as either a pass or a
 * defect.
 *
 * Usage:
 *   node tools/teaches-word/reader.cjs candidates.json --out verdicts.json [--model haiku]
 *        [--batch 12] [--concurrency 4] [--limit N] [--course spa_for_eng] [--side known]
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { claudeEnv } = require(path.resolve(__dirname, '../../services/shared/claude-config.cjs'));

const LANG = require('./langnames.cjs');

const langName = (code) => LANG[(code || '').split('_')[0]] || code || 'the language';
const knownLangOf = (c) => (c || '').replace(/_v\d+$/, '').split('_for_')[1] || null;
const targetLangOf = (c) => (c || '').replace(/_v\d+$/, '').split('_for_')[0] || null;

function buildPrompt(batch) {
  const c = batch[0].course;
  const lang = langName(batch[0].side === 'known' ? knownLangOf(c) : targetLangOf(c));
  const items = batch.map((b, i) => (
    `${i + 1}.\nWORD: ${b.taught}\nSENTENCE: ${b.sentence}`
  )).join('\n\n');

  return `You are checking language-course material written in ${lang}.

Each lesson teaches one word or phrase. Each practice sentence below was written to practise that
specific word. Your one job is to say, for each numbered item, whether the SENTENCE actually uses
the WORD.

Rules for your judgement:
- A different GRAMMATICAL FORM of the same word still counts as USES. Conjugation, tense, person,
  number, gender, case, mutation, contraction, an attached article or particle, a spelling change
  caused by inflection — all of these are the same word.
- A DIFFERENT WORD does not count, even if it means almost the same thing. A near-synonym,
  a paraphrase, or a more common everyday alternative is MISSING, not USES.
- If the WORD is a multi-word phrase, it counts as USES when the sentence uses that phrase, even
  if the parts are separated or reordered by normal grammar.
- Many languages routinely leave out a pronoun subject or object, or attach it to the verb. If the
  WORD spells out a pronoun that the sentence leaves implicit, and the sentence uses the rest of
  the word, that is USES. A dropped pronoun is not a missing word.
- Words the WORD carries only to mark who is speaking or which grammatical person is meant are
  part of that same allowance: judge on the content word, not on the person marker.
- Ignore anything in brackets in the WORD: that is a note to the author, not part of the word.
- If the WORD offers alternatives separated by a slash or a middle dot, using ANY ONE of them
  counts as USES.
- If the SENTENCE is not written in ${lang} at all, answer UNSURE and say so.

UNSURE is a respectable answer and you should use it whenever you genuinely cannot tell — a
wrong confident answer is much worse than an honest UNSURE.

Answer with one line of JSON per item and nothing else. No preamble, no code fence.
Each line: {"n": <item number>, "verdict": "USES" | "MISSING" | "UNSURE", "why": "<one short sentence>"}

ITEMS:

${items}`;
}

function runClaude(prompt, model) {
  return new Promise((resolve) => {
    const env = claudeEnv({ ...process.env });
    // The CLI installs to ~/.local/bin, which is not on a non-login shell's PATH. Without this
    // every spawn dies with ENOENT and — because a dead spawn returns no verdicts — the whole
    // run reports UNREAD, which looks like a shy model rather than a missing binary.
    env.PATH = `${path.join(process.env.HOME || '', '.local/bin')}:${env.PATH || ''}`;
    const proc = spawn('claude', ['--print', '--model', model], { env, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = ''; let err = '';
    proc.stdout.on('data', (d) => { out += d; });
    proc.stderr.on('data', (d) => { err += d; });
    proc.on('error', (e) => resolve({ ok: false, error: e.message }));
    proc.on('close', (code) => resolve(code === 0 ? { ok: true, out } : { ok: false, error: `exit ${code}: ${(err || out).slice(0, 300)}` }));
    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

function parseVerdicts(raw, size) {
  const found = new Map();
  for (const line of (raw || '').split('\n')) {
    const m = line.match(/\{[^{}]*"n"\s*:\s*(\d+)[^{}]*\}/);
    if (!m) continue;
    try {
      const o = JSON.parse(m[0]);
      const n = Number(o.n);
      if (n >= 1 && n <= size) found.set(n, { verdict: String(o.verdict || '').toUpperCase(), why: o.why || '' });
    } catch { /* a malformed line is a missing verdict, not a guess */ }
  }
  return found;
}

async function readBatch(batch, model) {
  const prompt = buildPrompt(batch);
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await runClaude(prompt, model);
    if (!r.ok) continue;
    const found = parseVerdicts(r.out, batch.length);
    if (found.size >= Math.ceil(batch.length * 0.6)) {
      return batch.map((b, i) => {
        const v = found.get(i + 1);
        return { ...b, verdict: v ? v.verdict : 'UNREAD', why: v ? v.why : 'the reader returned no verdict for this item', model };
      });
    }
  }
  return batch.map((b) => ({ ...b, verdict: 'UNREAD', why: 'the reader could not be run or returned nothing parseable', model }));
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function main() {
  const argv = process.argv.slice(2);
  const flag = (name, def) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : def;
  };
  const inFile = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== `--${flag}`) || argv[0];
  const model = flag('model', 'haiku');
  const batchSize = Number(flag('batch', 12));
  const concurrency = Number(flag('concurrency', 4));
  const outFile = flag("out", null);
  const courseFilter = flag('course', null);
  const sideFilter = flag('side', null);
  const limit = Number(flag('limit', 0));

  let cands = JSON.parse(fs.readFileSync(inFile, 'utf8')).candidates;
  if (courseFilter) cands = cands.filter((c) => courseFilter.split(',').includes(c.course));
  if (sideFilter) cands = cands.filter((c) => c.side === sideFilter);
  if (limit) cands = cands.slice(0, limit);

  // Batches never mix courses or sides: one batch, one language, one question.
  const groups = new Map();
  for (const c of cands) {
    const k = `${c.course}|${c.side}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(c);
  }
  const batches = [...groups.values()].flatMap((g) => chunk(g, batchSize));
  console.error(`${cands.length} candidates in ${batches.length} batches of <=${batchSize}, model=${model}, concurrency=${concurrency}`);

  const results = [];
  let done = 0;
  let next = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    for (;;) {
      const i = next++;
      if (i >= batches.length) return;
      const r = await readBatch(batches[i], model);
      results.push(...r);
      done++;
      if (done % 5 === 0 || done === batches.length) {
        console.error(`  ${done}/${batches.length} batches read`);
        // Checkpoint. A run of this length WILL sometimes be interrupted, and losing an hour of
        // reading to a restart is how a check quietly stops being run at all.
        if (outFile) fs.writeFileSync(`${outFile}.partial`, JSON.stringify({ model, results }, null, 1));
      }
    }
  }));

  const tally = {};
  for (const r of results) tally[r.verdict] = (tally[r.verdict] || 0) + 1;
  console.error('\nverdicts:', JSON.stringify(tally));
  if (outFile) { fs.writeFileSync(outFile, JSON.stringify({ model, results }, null, 1)); console.error(`-> ${outFile}`); }
}

main().catch((e) => { console.error(e); process.exit(1); });
