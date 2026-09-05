#!/usr/bin/env node
/**
 * THE PER-BASKET QA REPORT — the declaration, run as an instrument.
 *
 * For every LEGO basket in the range, this computes the DECLARATION (what a
 * generator at that position would be built to instantiate: derived job, frame
 * pool, splits, floors) and judges the LIVE phrases against it, mechanically.
 * Nobody reads the target language: frames are re-derived from the matchers,
 * splits from their target-side regexes, floors from the declared pool.
 *
 * One row per basket — the basket is the unit (Tom, 2026-08-29: the seed is
 * invisible to the learner; the unit of learning is the LEGO). FAILING baskets
 * print first, each shortfall carrying its rewrite instruction; a clean course
 * is an empty screen above the summary line.
 *
 * READ-ONLY. Writes nothing anywhere.
 *
 * Usage:
 *   node tools/frame-layer/qa-report.cjs spa_for_eng --seed 599
 *   node tools/frame-layer/qa-report.cjs spa_for_eng --from 590 --to 610
 *   node tools/frame-layer/qa-report.cjs spa_for_eng --from 1 --to 668 --json report.json
 *
 * A full course is a few thousand read-only queries and some minutes — chunk
 * with --from/--to if you only need a region. Non-English known sides get one
 * honest "not applicable" line and no per-basket noise.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { loadCorpus, knownSideIsEnglish } = require('./corpus.cjs');
const { computeDeclaration, checkDeclaration } = require('./declaration.cjs');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

const arg = (name, dflt = null) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? dflt : process.argv[i + 1];
};

async function main() {
  const course = process.argv[2];
  if (!course || course.startsWith('--')) {
    console.error('usage: node tools/frame-layer/qa-report.cjs <course> [--seed N | --from N --to N] [--json out.json]');
    process.exit(2);
  }
  if (!knownSideIsEnglish(course)) {
    console.log(`${course}: NOT APPLICABLE — the known side is not English, and the frame layer's patterns are English regexes. No basket verdicts are produced; absence of findings here is blindness, not health.`);
    process.exit(0);
  }
  const one = arg('--seed');
  const from = +(one || arg('--from', 1));
  const to = +(one || arg('--to', from));
  const jsonOut = arg('--json');

  const rows = [];
  for (let seed = from; seed <= to; seed++) {
    let corpus;
    try { corpus = await loadCorpus(sb, course, seed); } catch (e) {
      rows.push({ seed, error: e.message }); continue;
    }
    if (!corpus.seedRow) continue;
    for (const l of corpus.ownLegos) {
      const decl = await computeDeclaration(sb, course, seed, +l.lego_index, { corpus });
      const mine = corpus.phrases.filter(p => +p.lego_index === +l.lego_index);
      const check = checkDeclaration(decl, mine);
      rows.push({
        seed, lego_index: +l.lego_index, lego_id: decl.lego_id,
        lego: `${l.known_text} / ${l.target_text}`,
        job: decl.job.verdict, pool: decl.frame_pool.total,
        pod_offered: (decl.frame_pool.pod || []).map(p => p.id),
        phrases: mine.filter(p => p.phrase_role !== 'component').length,
        pass: check.pass, composite: check.composite,
        axes: check.axes, floor_failures: check.floor_failures || [],
        splits: (check.splits || []).map(s => ({ id: s.id, crossed: s.crossed })),
        pod_instantiated: check.pod_frames ? check.pod_frames.instantiated : [],
        rewrite_instructions: check.rewrite_instructions || [],
        reason: check.reason || null,
      });
    }
  }

  const failing = rows.filter(r => r.pass === false);
  const passing = rows.filter(r => r.pass === true);
  for (const r of failing) {
    console.log(`FAIL ${r.lego_id}  "${r.lego}"  composite ${r.composite}  [${r.floor_failures.join(', ') || 'claims'}]  job ${r.job}, pool ${r.pool}, ${r.phrases} phrases`);
    for (const i of r.rewrite_instructions) console.log(`     ${i}`);
  }
  for (const r of rows.filter(x => x.error || x.reason)) {
    console.log(`SKIP seed ${r.seed}${r.lego_id ? ' ' + r.lego_id : ''} — ${r.error || r.reason}`);
  }
  console.log(`\n${course} seeds ${from}-${to}: ${rows.length} baskets — ${passing.length} pass their declaration, ${failing.length} fail.`);
  const podReach = rows.filter(r => (r.pod_offered || []).length);
  if (podReach.length) {
    const landed = podReach.filter(r => (r.pod_instantiated || []).length);
    console.log(`pod frames: offered in ${podReach.length} baskets, instantiated in ${landed.length} — reported, never gated.`);
  }
  if (jsonOut) { fs.writeFileSync(jsonOut, JSON.stringify({ course, from, to, rows }, null, 2)); console.log(`wrote ${jsonOut}`); }
}

main().catch(e => { console.error(e.message); process.exit(1); });
