#!/usr/bin/env node
/**
 * STAGE 3 — the confirm pass. Turns RAW into CONFIRMED.
 *
 * Stage 2 reads a batch and says MISSING. This stage takes only those, one at a time, and asks a
 * SECOND reader to knock the accusation down: it is told the claim, told that the usual reason a
 * claim like this is wrong is that the sentence uses a different grammatical form of the same
 * word, and asked to overturn it if it can. Only a claim that survives is CONFIRMED.
 *
 * The reason for a second, adversarial look rather than a bigger first look: the failure mode of
 * this whole family of checks is crying wolf. The old gate cried wolf 91% of the time on Arabic
 * and 77% on Korean, and a check people learn to ignore is worse than no check. So the burden of
 * proof sits on the accusation, and the tie goes to the material.
 *
 * TIER: sonnet by default here — the confirm pass is the more careful read, and sonnet is the
 * ceiling. Never higher.
 *
 * Usage:
 *   node tools/teaches-word/confirm.cjs verdicts.json --out confirmed.json [--model sonnet]
 *        [--concurrency 6] [--batch 6]
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
    `${i + 1}.\nWORD THE LESSON TEACHES: ${b.taught}\nPRACTICE SENTENCE: ${b.sentence}\nFIRST READER'S REASON: ${b.why}`
  )).join('\n\n');

  return `You are the second reader on some ${lang} language-course material, and your job is to
knock down accusations that do not hold up.

A first reader has accused each practice sentence below of NOT using the word its lesson teaches.
Your job is to overturn that accusation wherever you can.

Overturn it (answer OVERTURNED) if ANY of these is true:
- The sentence does use the word, in a different grammatical form — a different tense, person,
  number, gender, case, mood, mutation, contraction, or an attached article or particle.
- The word is a phrase and the sentence uses that phrase with its parts separated or reordered.
- The word offers alternatives (separated by a slash or a middle dot) and the sentence uses any
  one of them.
- The difference is only a pronoun the language routinely drops, or a bracketed note to the
  author, or punctuation, or spacing.
- The first reader's reason is simply wrong about the language.

Uphold it (answer UPHELD) only when the sentence really does use a DIFFERENT WORD — a synonym, a
near-synonym, a paraphrase, or an unrelated word — where the taught word should have been.

If you cannot decide, answer OVERTURNED. The tie goes to the material: a check that accuses good
sentences is worse than no check at all.

Answer with one line of JSON per item and nothing else. No preamble, no code fence.
Each line: {"n": <item number>, "ruling": "UPHELD" | "OVERTURNED", "why": "<one short sentence>"}

ITEMS:

${items}`;
}

function runClaude(prompt, model) {
  return new Promise((resolve) => {
    const env = claudeEnv({ ...process.env });
    env.PATH = `${path.join(process.env.HOME || '', '.local/bin')}:${env.PATH || ''}`;
    const proc = spawn('claude', ['--print', '--model', model], { env, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = ''; let err = '';
    proc.stdout.on('data', (d) => { out += d; });
    proc.stderr.on('data', (d) => { err += d; });
    proc.on('error', (e) => resolve({ ok: false, error: e.message }));
    proc.on('close', (code) => resolve(code === 0 ? { ok: true, out } : { ok: false, error: `exit ${code}: ${(err || out).slice(0, 200)}` }));
    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

function parseRulings(raw, size) {
  const found = new Map();
  for (const line of (raw || '').split('\n')) {
    const m = line.match(/\{[^{}]*"n"\s*:\s*(\d+)[^{}]*\}/);
    if (!m) continue;
    try {
      const o = JSON.parse(m[0]);
      const n = Number(o.n);
      if (n >= 1 && n <= size) found.set(n, { ruling: String(o.ruling || '').toUpperCase(), why: o.why || '' });
    } catch { /* unparseable is not a ruling */ }
  }
  return found;
}

async function confirmBatch(batch, model) {
  const prompt = buildPrompt(batch);
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await runClaude(prompt, model);
    if (!r.ok) continue;
    const found = parseRulings(r.out, batch.length);
    if (found.size >= Math.ceil(batch.length * 0.6)) {
      return batch.map((b, i) => {
        const v = found.get(i + 1);
        // No ruling is not a confirmation. An unread accusation stays unconfirmed.
        return { ...b, ruling: v ? v.ruling : 'UNRULED', confirm_why: v ? v.why : 'the second reader returned no ruling', confirm_model: model };
      });
    }
  }
  return batch.map((b) => ({ ...b, ruling: 'UNRULED', confirm_why: 'the second reader could not be run', confirm_model: model }));
}

function chunk(a, n) { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; }

async function main() {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
  const inFile = argv[0];
  const model = flag('model', 'sonnet');
  const batchSize = Number(flag('batch', 6));
  const concurrency = Number(flag('concurrency', 6));
  const outFile = flag('out', null);

  const all = JSON.parse(fs.readFileSync(inFile, 'utf8')).results;
  const accused = all.filter((r) => r.verdict === 'MISSING');
  const groups = new Map();
  for (const c of accused) {
    const k = `${c.course}|${c.side}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(c);
  }
  const batches = [...groups.values()].flatMap((g) => chunk(g, batchSize));
  console.error(`${accused.length} raw accusations in ${batches.length} batches, model=${model}`);

  const results = [];
  let done = 0; let next = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    for (;;) {
      const i = next++;
      if (i >= batches.length) return;
      results.push(...await confirmBatch(batches[i], model));
      done++;
      if (done % 5 === 0 || done === batches.length) {
        console.error(`  ${done}/${batches.length}`);
        // Checkpoint, as the reader does. The confirm pass is the slower of the two — a batch of
        // ten on sonnet can run for minutes — so a run interrupted near the end used to lose
        // everything and leave no way to tell how far it had got.
        if (outFile) fs.writeFileSync(`${outFile}.partial`, JSON.stringify({ model, raw: accused.length, results }, null, 1));
      }
    }
  }));

  const tally = {};
  for (const r of results) tally[r.ruling] = (tally[r.ruling] || 0) + 1;
  const confirmed = results.filter((r) => r.ruling === 'UPHELD');
  console.error('\nrulings:', JSON.stringify(tally));
  console.error(`RAW ${accused.length} -> CONFIRMED ${confirmed.length}`);
  if (outFile) { fs.writeFileSync(outFile, JSON.stringify({ model, raw: accused.length, results }, null, 1)); console.error(`-> ${outFile}`); }
}

main().catch((e) => { console.error(e); process.exit(1); });
