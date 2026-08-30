#!/usr/bin/env node
/**
 * THE LANDING CHECK, STAGE 2 — JUDGEMENT.
 *
 * Stage 1 (landing-check.cjs) is MECHANICAL: it can prove a learner HAS a hook, never that they
 * have none. Everything it could not clear arrives here, and a model rules on the only question
 * that matters (Tom, 2026-08-30):
 *
 *   "Once the v1/v2 model voices say it correctly, are they likely to go 'yes, ok, that's it'
 *    — or 'sorry, what???'"
 *
 * This is JUDGEMENT and the file says so: a matcher cannot rule on whether something lands.
 * LLM calls go through the Claude CLI, never the SDK (CLAUDE.md).
 *
 * READ-ONLY. Reads the course to build evidence; writes only its own verdict file.
 *
 * Usage:
 *   node tools/course-optimization/landing-judge.cjs <shortlist.json> --out verdicts.json [--limit N] [--model opus]
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const { execFile } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const { norm, toks } = require('./landing-check.cjs');
// The repo's one answer to auth + account pinning for a nested CLI call. Without it this box
// answers "Not logged in", and the ANTHROPIC_API_KEY dotenv loads is the dashboard's, not ours.
const { claudeEnv } = require('../../services/shared/claude-config.cjs');

const BATCH = 4;
const CONCURRENCY = 4;

function arg(flag, dflt) { const i = process.argv.indexOf(flag); return i > 0 ? process.argv[i + 1] : dflt; }

async function page(client, table, cols, filter, orderCols) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = client.from(table).select(cols);
    for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
    for (const c of orderCols) q = q.order(c, { ascending: true });
    const { data, error } = await q.range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data); if (data.length < 1000) return out;
  }
}

/** EVIDENCE, gathered mechanically so the judgement is made on facts rather than on vibes. */
async function buildEvidence(courseCode, shortlist) {
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const legos = await page(client, 'course_legos',
    'seed_number,lego_index,is_new,known_text,target_text,components', { course_code: courseCode },
    ['seed_number', 'lego_index']);
  let r = 0;
  for (const l of legos) { if (l.is_new !== false) r++; l.round = r; }
  // word -> earliest round it stands in any taught chunk, and the chunk that carried it
  const firstSeen = new Map();
  for (const l of legos) {
    const chunks = [{ t: l.target_text, k: l.known_text }];
    for (const c of (Array.isArray(l.components) ? l.components : [])) {
      const ct = c && (c.target || c.target_text); if (ct) chunks.push({ t: ct, k: (c.known || c.known_text || '') });
    }
    for (const ch of chunks) for (const w of toks(ch.t)) {
      if (!firstSeen.has(w)) firstSeen.set(w, { round: l.round, chunk: norm(ch.t), known: ch.k });
    }
  }
  const words = [...firstSeen.keys()];
  for (const p of shortlist) {
    for (const w of p.weak) {
      const seen = firstSeen.get(w.token);
      w.elsewhere_in_course = seen
        ? (seen.round <= p.round ? `stands in "${seen.chunk}" from round ${seen.round}` : `taught only LATER, round ${seen.round}, in "${seen.chunk}"`)
        : 'appears nowhere else in the course, in any chunk';
      // Nearest available forms: real evidence for "half-known", not a claim of teaching.
      const near = words
        .filter((x) => firstSeen.get(x).round <= p.round && x !== w.token)
        .map((x) => { let i = 0; while (i < x.length && i < w.token.length && x[i] === w.token[i]) i++; return { x, i }; })
        .filter((o) => o.i >= 3)
        .sort((a, b) => b.i - a.i).slice(0, 5).map((o) => o.x);
      w.available_lookalikes = near;
    }
  }
  return shortlist;
}

const BAR = `You are judging Spanish course phrases against ONE bar, in the course owner's words:

  "Once the v1/v2 model voices say it correctly, are they likely to go 'yes, ok, that's it' — or 'sorry, what???'"

How the course works, and why this bar and not another: the learner is given an ENGLISH prompt, they
attempt the Spanish out loud, and THEN they hear the model answer. They are never required to succeed.
So a phrase that is a slight reach is FINE, and often good. The ONLY genuine defect is the DERAILMENT:
the model voice says something the learner has no hook for at all, so they cannot map the answer onto
the prompt they were just given, and they lose the thread.

This is a LANDING check, not a coverage audit. A word that is half-known, or recoverable from a
contrast the learner has already met, or transparently a form of something they have, LANDS.

Rule on each item as LANDS or DERAILS.

LANDS (typical): a new word whose meaning the English prompt pins exactly and which is a visible
variant, compound or clitic-extension of something they already have; a small function word they can
absorb from the whole; a near-cognate; anything they can slot into the sentence shape they already know.

DERAILS (typical): unfamiliar material carrying the CORE of the sentence with no route to it; several
unknowns stacked in one phrase; a form so unlike anything they have that they cannot even tell which
English word it answers to; material they would hear as a different sentence from the one they attempted.

Be honest in both directions. Do not manufacture defects and do not wave things through.`;

function askClaude(model, prompt) {
  return new Promise((resolve, reject) => {
    const env = claudeEnv({ ...process.env }); delete env.CLAUDECODE;
    env.PATH = `${process.env.HOME}/.local/bin:${env.PATH}`;
    execFile(`${process.env.HOME}/.local/bin/claude`, ['--print', '--model', model], { env, maxBuffer: 20 * 1024 * 1024, timeout: 300000 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(`claude CLI: ${err.message} ${String(stderr).slice(0, 300)}`));
        resolve(stdout);
      }).stdin.end(prompt);
  });
}

function makePrompt(items) {
  const body = items.map((p, i) => {
    const weak = p.weak.map((w) => `      - "${w.token}" — mechanically unhooked (${w.why}); ${w.elsewhere_in_course}; similar Spanish they DO have: ${w.available_lookalikes.length ? w.available_lookalikes.join(', ') : 'none'}`).join('\n');
    return `ITEM ${i + 1} (id ${p.phrase_id})
  learner is at round ${p.round} of the course; ${p.context.chunks_available} taught chunks and ${p.context.pods_heard} pod sentences behind them
  they are being taught: "${p.lego_known}" = "${p.lego_target}"
  ENGLISH PROMPT they see: "${p.known}"
  MODEL ANSWER they then hear: "${p.target}"
  material with no mechanical hook:
${weak}`;
  }).join('\n\n');
  return `${BAR}

${body}

Answer with ONE line per item and nothing else, in this exact format:
ITEM <n> | LANDS or DERAILS | <one sentence of reasoning, concrete about this learner at this point>`;
}

function parse(out, items) {
  const res = [];
  for (const line of out.split('\n')) {
    const m = line.match(/ITEM\s+(\d+)\s*\|\s*(LANDS|DERAILS)\s*\|\s*(.+)/i);
    if (!m) continue;
    const p = items[Number(m[1]) - 1]; if (!p) continue;
    res.push({ ...p, verdict: m[2].toUpperCase(), reasoning: m[3].trim() });
  }
  return res;
}

async function main() {
  const inPath = process.argv[2];
  const outPath = arg('--out');
  const model = arg('--model', 'opus');
  const limit = Number(arg('--limit', '0'));
  if (!inPath || !outPath) { console.error('usage: landing-judge.cjs <shortlist.json> --out verdicts.json'); process.exit(2); }
  const loaded = JSON.parse(fs.readFileSync(inPath, 'utf8'));
  let shortlist = loaded.shortlist;
  if (limit) shortlist = shortlist.slice(0, limit);
  await buildEvidence(loaded.summary.course, shortlist);

  const batches = [];
  for (let i = 0; i < shortlist.length; i += BATCH) batches.push(shortlist.slice(i, i + BATCH));
  const verdicts = [];
  const failures = [];
  let done = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const b = batches.shift(); if (!b) return;
      try {
        const out = await askClaude(model, makePrompt(b));
        const parsed = parse(out, b);
        if (!parsed.length) failures.push({ ids: b.map((x) => x.phrase_id), raw: out.slice(0, 400) });
        verdicts.push(...parsed);
      } catch (e) { failures.push({ ids: b.map((x) => x.phrase_id), error: e.message }); }
      done += b.length;
      process.stderr.write(`judged ${verdicts.length}/${done} of ${shortlist.length}\n`);
    }
  }));

  // FAIL FAST: a file of zeroes is worse than no file.
  if (!verdicts.length) {
    console.error('ABORT: judgement produced nothing.', JSON.stringify(failures.slice(0, 2)));
    process.exit(4);
  }
  const derails = verdicts.filter((v) => v.verdict === 'DERAILS');
  const summary = {
    course: loaded.summary.course, model, generated: new Date().toISOString(),
    phrases_in_course: loaded.summary.phrases_considered,
    shortlisted: loaded.summary.shortlisted_for_judgement,
    judged: verdicts.length, unjudged_failures: shortlist.length - verdicts.length,
    lands: verdicts.length - derails.length, derails: derails.length,
    derail_share_of_course: +(100 * derails.length / loaded.summary.phrases_considered).toFixed(2),
  };
  fs.writeFileSync(outPath, JSON.stringify({ summary, verdicts, failures }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
