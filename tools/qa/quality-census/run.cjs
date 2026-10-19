#!/usr/bin/env node
'use strict';
// tools/qa/quality-census/run.cjs — run every quality check on one course snapshot. READ-ONLY: writes one JSON of
// candidates to the evidence store and prints a per-check count. A count is NOT a finding (checks.cjs header):
// --sample N prints N hits per check, drawn reproducibly at random, for a person to read and judge.
//
//   node tools/qa/quality-census/run.cjs <course> [--snapshot file.json] [--out file.json] [--sample N] [--only C01,LEN]
//
// Without --snapshot it takes a fresh one through Popty (snapshot.cjs).

const fs = require('fs');
const { CHECKS } = require('./checks.cjs');
const { take } = require('./snapshot.cjs');

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };

// reproducible sample: mulberry32 seeded by the check id, so two readers see the same rows
function sample(list, n, seedText) {
  let a = [...seedText].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pool = list.slice(); const out = [];
  while (pool.length && out.length < n) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}

function runAll(snap, only) {
  const t0 = Date.now();
  const results = [];
  for (const c of CHECKS) {
    if (only && !only.includes(c.id)) continue;
    const t = Date.now();
    const hits = c.run(snap);
    const buckets = {};
    for (const h of hits) buckets[h.bucket || 'all'] = (buckets[h.bucket || 'all'] || 0) + 1;
    results.push({ id: c.id, name: c.name, rule: c.rule, blocks: c.blocks, gap: c.needs ? c.needs(snap) : null, count: hits.length, buckets, ms: Date.now() - t, hits });
  }
  return { course: snap.course, snapshot_taken: snap.taken, rows: { seeds: snap.seeds.length, legos: snap.legos.length, phrases: snap.phrases.length }, ms: Date.now() - t0, results };
}

module.exports = { runAll, sample };

if (require.main === module) {
  (async () => {
    const course = process.argv[2];
    if (!course || course.startsWith('--')) { console.error('usage: run.cjs <course> [--snapshot f] [--out f] [--sample N] [--only ids]'); process.exit(64); }
    const snapFile = arg('--snapshot');
    const t = Date.now();
    const snap = snapFile ? JSON.parse(fs.readFileSync(snapFile, 'utf8')) : await take(course);
    const loadMs = Date.now() - t;
    const report = runAll(snap, arg('--only') ? arg('--only').split(',') : null);
    report.load_ms = loadMs;
    const out = arg('--out') || require('../../lib/evidence-path.cjs').evidencePath(`tools/qa/quality-census/${course}-${new Date().toISOString().slice(0, 10)}.json`);
    fs.writeFileSync(out, JSON.stringify(report, null, 1));
    const n = +arg('--sample', 0);
    for (const r of report.results) {
      console.log(`${r.id.padEnd(4)} ${String(r.count).padStart(6)}  ${r.name}  ${JSON.stringify(r.buckets)}${r.gap ? `  GAP: ${r.gap}` : ''}`);
      if (n) for (const h of sample(r.hits, n, r.id)) console.log(`        s${h.seed} ${h.ref} [${h.bucket || h.role}] ${h.known} | ${h.target}  — ${h.why}`);
    }
    console.log(`load ${loadMs} ms, checks ${report.ms} ms → ${out}`);
  })().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
}
