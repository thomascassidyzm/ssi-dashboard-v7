#!/usr/bin/env node
/**
 * Run ONE ARM of the phrase-prompt comparison: generate BUILD + USE phrase sets
 * for a list of real LEGOs, with the v3 prompt, on one model.
 *
 * Every arm is assembled by build-prompt.cjs against the SAME inventory state.
 * Arms differ ONLY in the model id. If the arms saw different vocabulary the
 * comparison would be about the material rather than about the generator, and
 * the model decision would be made on a rigged experiment.
 *
 * ALL LLM CALLS GO THROUGH THE CLAUDE CLI, never the Anthropic SDK — hard estate
 * rule (a past SDK module silently billed ~$38/day).
 *
 * Extended thinking is ON here, unlike the wrapper's default. The default of 0 is
 * right for deterministic translation-flex work; this is genuinely generative
 * authoring, and switching it off for the Opus arm would be measuring a
 * handicapped Opus and calling it a ceiling.
 *
 * Concurrency is capped at 2. This is a 4-core box carrying Tom's own
 * conversations and other workers; saturating it slows all of them.
 *
 * RESUMABLE: an existing output file is read first and completed targets are
 * skipped, so a killed run costs only what it had not yet finished.
 *
 * Usage:
 *   node tools/phrase-lab/generate.cjs --course spa_for_eng --model claude-opus-5 \
 *     --targets targets.json --out opus.json
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const { buildPrompt } = require('./build-prompt.cjs');
const { claudeChat } = require('../../services/shared/claude-cli.cjs');

// The CLI lives in ~/.local/bin, which is not always on a spawned PATH.
if (!process.env.PATH.includes('/.local/bin')) {
  process.env.PATH = `${process.env.HOME}/.local/bin:${process.env.PATH}`;
}

// Three, not two: measured, a generation call spends 408 seconds of wall-clock
// and 2.3 seconds of CPU — it is waiting on the API, not computing. The 4-core
// box is not the binding constraint here, so three keeps the arms inside the
// time budget without touching the load that Tom's own conversations feel.
const CONCURRENCY = 3;

function parseModelJson(raw) {
  let s = String(raw || '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const i = s.indexOf('{');
  const j = s.lastIndexOf('}');
  if (i === -1 || j === -1) throw new Error(`no JSON object in model output (first 200 chars: ${s.slice(0, 200)})`);
  return JSON.parse(s.slice(i, j + 1));
}

/** Model output -> the scorer's phrase shape. Tolerant about shape, strict about content. */
function normalise(parsed) {
  const out = [];
  for (const role of ['build', 'use']) {
    for (const p of parsed[role] || []) {
      if (!p || !p.known || !p.target) continue;
      out.push({
        role,
        known: String(p.known),
        target: String(p.target),
        tiles: (p.tiles || []).map((t) => ({ known: t.known, target: t.target, legoId: t.legoId }))
      });
    }
  }
  return out;
}

async function generateOne(supabase, courseCode, model, target) {
  const { seed, lego } = target;
  const { prompt, lego: L } = await buildPrompt(supabase, courseCode, seed, lego);
  const started = Date.now();
  const raw = await claudeChat(prompt, { model, timeout: 600000, thinkingTokens: 10000 });
  const parsed = parseModelJson(raw);
  const phrases = normalise(parsed);
  return {
    courseCode,
    seedNumber: seed,
    legoIndex: lego,
    arm: model,
    legoId: L.lego_id,
    legoKnown: L.known_text,
    legoTarget: L.target_text,
    elapsedMs: Date.now() - started,
    phrases
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
  const courseCode = arg('--course');
  const model = arg('--model');
  const targetsFile = arg('--targets');
  const outFile = arg('--out');
  if (!courseCode || !model || !targetsFile || !outFile) {
    console.error('usage: --course <c> --model <id> --targets <json> --out <json>');
    process.exit(1);
  }

  const targets = JSON.parse(fs.readFileSync(targetsFile, 'utf8'));
  const done = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : [];
  const doneKeys = new Set(done.map((d) => `${d.seedNumber}:${d.legoIndex}`));
  const todo = targets.filter((t) => !doneKeys.has(`${t.seed}:${t.lego}`));

  const { supabase } = require('../../services/supabase-client.cjs');
  if (!supabase) throw new Error('no Supabase client — SUPABASE_URL / SUPABASE_SERVICE_KEY missing from .env');

  console.error(`[${model}] ${todo.length} to generate (${done.length} already done)`);
  const results = [...done];
  let cursor = 0;

  const save = () => fs.writeFileSync(outFile, JSON.stringify(results, null, 2));

  async function worker(id) {
    for (;;) {
      const i = cursor++;
      if (i >= todo.length) return;
      const t = todo[i];
      try {
        const r = await generateOne(supabase, courseCode, model, t);
        results.push(r);
        save();
        console.error(`[${model}] seed ${t.seed} L${t.lego} — ${r.phrases.length} phrases in ${(r.elapsedMs / 1000).toFixed(0)}s`);
      } catch (e) {
        // A failed target is recorded as a failure, never silently dropped: an
        // arm with holes in it must not look like an arm that scored badly.
        results.push({ courseCode, seedNumber: t.seed, legoIndex: t.lego, arm: model, error: String(e.message).slice(0, 400), phrases: [] });
        save();
        console.error(`[${model}] seed ${t.seed} L${t.lego} — FAILED: ${String(e.message).slice(0, 200)}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, (_, i) => worker(i)));
  save();
  const failed = results.filter((r) => r.error).length;
  console.error(`[${model}] done — ${results.length} sets, ${failed} failed, wrote ${outFile}`);
}

module.exports = { parseModelJson, normalise, generateOne };

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
