#!/usr/bin/env node
/**
 * PRACTICE PHRASES FOR THE HADAU CREIDDIOL BLOCK of the North sandbox cym_nv2_for_eng (job #429,
 * Aran 2026-10-08). Not a generator: a driver over the two existing doors.
 *
 *   generate  services/course-builder/lib/phrase-generation.cjs (the v3 door behind
 *             POST /api/phrases/v3/generate — Opus, the real gates, retries, the scorer)
 *   write     POST /api/v2/phrases/cym_nv2_for_eng on the running course-builder (:3471), which
 *             re-runs its own vocab/containment/count gates and stamps an edit event
 *
 * "Already taught" is the course RUNNING ORDER (course_running_order): HC seed 1000+N plays after
 * old seed 137, so old 138+ are not available to it. The generator reads the order since #429's
 * fix to tools/phrase-lab/inventory.cjs, tools/phrase-gate/gate-check.cjs and
 * tools/frame-layer/corpus.cjs (test: tools/phrase-lab/running-order.test.cjs).
 *
 * Scope is HARD-CODED to cym_nv2_for_eng and to block seeds (id >= course_seed_weave.block_start)
 * whose LEGO is is_new and has no phrases yet, so a rerun resumes and never rewrites. A set the
 * gates still refuse after the door's retries is BLOCKED: recorded, never submitted.
 *
 * Usage:
 *   node tools/course-optimization/weave-cym-nv2-hc-phrases.cjs --seeds 20 [--concurrency 4]
 *   node tools/course-optimization/weave-cym-nv2-hc-phrases.cjs --only-seeds 1003,1006 [--concurrency 4]
 *   node tools/course-optimization/weave-cym-nv2-hc-phrases.cjs --all [--concurrency 4]
 *   node tools/course-optimization/weave-cym-nv2-hc-phrases.cjs --prompt 1003:3     (read-only)
 * Results (one JSON per LEGO) go to ~/ssi-evidence/ssi-dashboard-v7/job-429/results/.
 * Undo: tools/course-optimization/weave-cym-nv2-hc-phrases-undo.sql
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');
const { generateLegoPhrases, buildPhrasePrompt } = require('../../services/course-builder/lib/phrase-generation.cjs');

const COURSE = 'cym_nv2_for_eng';
const BUILDER = process.env.COURSE_BUILDER_URL || 'http://localhost:3471';
const AGENT = 'job-429-hc-phrases';
const OUT = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/job-429/results');

const arg = (k) => { const i = process.argv.indexOf(k); return i === -1 ? null : process.argv[i + 1]; };
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function pageAll(q) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q().range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

async function pending() {
  const { data: weave, error } = await sb.from('course_seed_weave').select('block_start').eq('course_code', COURSE).single();
  if (error || !weave) throw new Error(`no weave row for ${COURSE}: refusing (the running order is the whole point)`);
  const order = await pageAll(() => sb.from('course_running_order').select('seed_number,position').eq('course_code', COURSE).order('position'));
  const pos = new Map(order.map((r) => [r.seed_number, r.position]));
  const legos = await pageAll(() => sb.from('course_legos').select('seed_number,lego_index,known_text,target_text')
    .eq('course_code', COURSE).eq('is_new', true).gte('seed_number', weave.block_start).order('seed_number').order('lego_index'));
  const phr = await pageAll(() => sb.from('course_practice_phrases').select('seed_number,lego_index')
    .eq('course_code', COURSE).gte('seed_number', weave.block_start).order('id'));
  const done = new Set(phr.map((p) => `${p.seed_number}:${p.lego_index}`));
  return legos.filter((l) => pos.has(l.seed_number) && !done.has(`${l.seed_number}:${l.lego_index}`))
    .sort((a, b) => pos.get(a.seed_number) - pos.get(b.seed_number) || a.lego_index - b.lego_index);
}

// The course-builder restarts on every main deploy (ssi-auto-deploy), so a write can meet a closed
// socket. The write is an upsert on (course, seed, lego, position): retrying it is safe.
async function submitWithRetry(r) {
  for (let i = 1; ; i++) {
    try { return await submit(r); }
    catch (e) {
      if (i >= 8) return { status: 0, error: e.message };
      await new Promise((ok) => setTimeout(ok, 20000));
    }
  }
}

async function submit(r) {
  const body = { phrases: [{ seed_number: r.seedNumber, lego_index: r.legoIndex,
    build: r.build.map((p) => ({ known: p.known, target: p.target })),
    use: r.use.map((p) => ({ known: p.known, target: p.target })) }] };
  const res = await fetch(`${BUILDER}/api/v2/phrases/${COURSE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT, 'x-agent-role': 'phrase-builder' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function one(l) {
  const id = `S${String(l.seed_number).padStart(4, '0')}L${String(l.lego_index).padStart(2, '0')}`;
  const file = path.join(OUT, `${id}.json`);
  // A set already generated and passed, whose write never landed: write it, do not regenerate.
  if (fs.existsSync(file)) {
    const prev = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (prev.build && !prev.blocked && !prev.error) {
      prev.submit = await submitWithRetry({ seedNumber: l.seed_number, legoIndex: l.lego_index, build: prev.build, use: prev.use });
      fs.writeFileSync(file, JSON.stringify(prev, null, 2));
      return `${id} resubmitted ${prev.submit.status} ${prev.submit.body?.phrases_inserted ?? prev.submit.error ?? '?'} rows`;
    }
    if (prev.blocked && !process.argv.includes('--retry-blocked')) return `${id} skipped (blocked earlier; --retry-blocked to regenerate)`;
  }
  let r;
  try {
    r = await generateLegoPhrases(sb, COURSE, l.seed_number, l.lego_index);
  } catch (e) {
    fs.writeFileSync(file, JSON.stringify({ id, error: e.message }, null, 2));
    return `${id} ERROR ${e.message}`;
  }
  const rec = { id, blocked: r.blocked, failingGates: r.gate?.failingGates, attempts: r.attempts,
    legoKnown: r.legoKnown, legoTarget: r.legoTarget, seedKnown: r.seedKnown, seedTarget: r.seedTarget,
    build: r.build, use: r.use, score: r.score && { ...r.score, details: undefined }, declarationCheck: r.declarationCheck && { pass: r.declarationCheck.pass, floor_failures: r.declarationCheck.floor_failures } };
  // Saved BEFORE the write, so a set whose write fails is resubmitted, never regenerated.
  fs.writeFileSync(file, JSON.stringify(rec, null, 2));
  if (!r.blocked) {
    rec.submit = await submitWithRetry(r);
    fs.writeFileSync(file, JSON.stringify(rec, null, 2));
  }
  const wrote = rec.submit ? `written ${rec.submit.status} ${rec.submit.body?.phrases_inserted ?? '?'} rows${rec.submit.body?.errors ? ' ERR ' + JSON.stringify(rec.submit.body.errors) : ''}` : `BLOCKED (${(r.gate?.failingGates || []).join(',')})`;
  return `${id} ${r.build.length}B/${r.use.length}U ${wrote}`;
}

(async () => {
  const p = arg('--prompt');
  if (p) {
    const [s, l] = p.split(':').map(Number);
    const { prompt } = await buildPhrasePrompt(sb, COURSE, s, l);
    process.stdout.write(prompt);
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });
  let todo = await pending();
  const seedLimit = Number(arg('--seeds') || 0);
  const only = arg('--only-seeds');
  if (only) {
    const want = new Set(only.split(',').map(Number));
    todo = todo.filter((l) => want.has(l.seed_number));
  } else if (seedLimit) {
    const seeds = [...new Set(todo.map((l) => l.seed_number))].slice(0, seedLimit);
    todo = todo.filter((l) => seeds.includes(l.seed_number));
  } else if (!process.argv.includes('--all')) {
    throw new Error('say --seeds N or --all');
  }
  const conc = Number(arg('--concurrency') || 4);
  console.log(`[${AGENT}] ${todo.length} LEGOs over ${new Set(todo.map((l) => l.seed_number)).size} seeds, concurrency ${conc}`);
  let i = 0;
  let n = 0;
  await Promise.all(Array.from({ length: conc }, async () => {
    while (i < todo.length) {
      const l = todo[i++];
      let line;
      try { line = await one(l); } catch (e) { line = `S${l.seed_number}L${l.lego_index} FAILED ${e.message}`; }
      console.log(`[${++n}/${todo.length}] ${line}`);
    }
  }));
  console.log(`[${AGENT}] done`);
})().catch((e) => { console.error(e); process.exit(1); });
