#!/usr/bin/env node
/**
 * THE RESIDUE — the one thing in the acceptance test that is not computable.
 *
 * Everything else score.cjs measures is arithmetic over a tiling: which words
 * were introduced, what the new LEGO touches, where it sits, what changes around
 * it, what it costs in syllables. This is the part that is not: **is this USE
 * phrase worth having?** A phrase can stand alone as a complete thought, clear
 * every floor, and still be a thing no human being would ever say.
 *
 * So it goes to a model, and to a model ONLY for this. Mechanical first,
 * judgement on the residue — not judgement dressed up as measurement.
 *
 * SONNET, not Opus. This audits somebody else's work, and per estate rule the
 * checking layer never runs at a higher tier than the work it checks.
 *
 * The judge is shown the phrases WITHOUT the arm label. It cannot know whether
 * it is reading the live course, Opus or Sonnet 5.
 *
 * All LLM calls go through the Claude CLI wrapper, never the Anthropic SDK.
 *
 * Usage:
 *   node tools/phrase-lab/judge-use.cjs --file arm-opus.json --out judged.json
 *   node tools/phrase-lab/judge-use.cjs --file arm-opus.json --sample 8
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const { claudeChat } = require('../../services/shared/claude-cli.cjs');

if (!process.env.PATH.includes('/.local/bin')) {
  process.env.PATH = `${process.env.HOME}/.local/bin:${process.env.PATH}`;
}

const SYSTEM = `You judge one thing and nothing else: is each of these Spanish-course
practice sentences WORTH HAVING — a thing a real person would actually say, in a
situation a learner will actually meet?

You are NOT checking grammar, vocabulary level, or whether the learner has been
taught the words. Those are checked elsewhere and are not your job. You are also
NOT rewarding complexity: a short ordinary sentence people say every day is worth
more than an elaborate one nobody says.

Judge each on the ENGLISH. Answer for every phrase, in order.

Return JSON only:
{"verdicts":[{"i":0,"worth":true,"why":"short reason"}, ...]}

worth=false for: sentences nobody would say, contrived scaffolding written to
satisfy an exercise, phrases that only make sense with context that isn't there,
and phrases that are essentially a previous one restated.`;

async function judgeSet(set, model) {
  const uses = set.phrases.filter((p) => p.role === 'use');
  if (!uses.length) return { ...set, judged: [], worthShare: null };
  const listing = uses.map((p, i) => `${i}. ${p.known}`).join('\n');
  const raw = await claudeChat(listing, { model, system: SYSTEM, timeout: 300000 });
  let parsed;
  try {
    const i = raw.indexOf('{');
    parsed = JSON.parse(raw.slice(i, raw.lastIndexOf('}') + 1));
  } catch (e) {
    return { ...set, judged: [], worthShare: null, judgeError: String(e.message).slice(0, 200) };
  }
  const verdicts = parsed.verdicts || [];
  const judged = uses.map((p, i) => ({
    known: p.known,
    target: p.target,
    worth: verdicts.find((v) => v.i === i)?.worth ?? null,
    why: verdicts.find((v) => v.i === i)?.why || null
  }));
  const decided = judged.filter((j) => j.worth !== null);
  return {
    seedNumber: set.seedNumber,
    legoIndex: set.legoIndex,
    legoKnown: set.legoKnown,
    judged,
    worthShare: decided.length ? Number((decided.filter((j) => j.worth).length / decided.length).toFixed(2)) : null
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
  const file = arg('--file');
  const model = arg('--model', 'claude-sonnet-5');
  const sample = Number(arg('--sample', '0'));
  if (!file) { console.error('usage: --file <sets.json> [--sample N] [--out out.json]'); process.exit(1); }

  let sets = JSON.parse(fs.readFileSync(file, 'utf8')).filter((s) => s.phrases?.length);
  if (sample > 0) {
    // Deterministic even spread across the course, not a random draw — the
    // sample must be the same LEGOs for every arm or the arms are not comparable.
    sets = sets.sort((a, b) => a.seedNumber - b.seedNumber)
      .filter((_, i, arr) => i % Math.max(1, Math.ceil(arr.length / sample)) === 0)
      .slice(0, sample);
  }

  const out = [];
  for (const s of sets) {
    const r = await judgeSet(s, model);
    out.push(r);
    console.error(`seed ${r.seedNumber} L${r.legoIndex} — worth ${r.worthShare === null ? 'n/a' : `${Math.round(r.worthShare * 100)}%`}${r.judgeError ? ` (judge error: ${r.judgeError})` : ''}`);
  }
  const shares = out.map((r) => r.worthShare).filter((x) => x !== null);
  const overall = shares.length ? shares.reduce((a, b) => a + b, 0) / shares.length : null;
  console.error(`\n${file}: ${out.length} sets judged, mean worth-having ${overall === null ? 'n/a' : overall.toFixed(2)}`);
  if (arg('--out')) fs.writeFileSync(arg('--out'), JSON.stringify({ file, model, overall, sets: out }, null, 2));
}

module.exports = { judgeSet };

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
