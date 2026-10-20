#!/usr/bin/env node
'use strict';
// tools/quality-census/run.cjs — run the quality checks on one course, read-only, through Popty.
//
//   node tools/quality-census/run.cjs ita_for_eng                       # summary: hits per check, 3 samples each
//   node tools/quality-census/run.cjs ita_for_eng --json out.json       # every hit
//   node tools/quality-census/run.cjs ita_for_eng --check zut-lego --all
//   node tools/quality-census/run.cjs ita_for_eng --save raw.json       # keep the Popty snapshot …
//   node tools/quality-census/run.cjs ita_for_eng --offline raw.json    # … and re-run on it without fetching
//
// Hits are CANDIDATES. The census multiplies them by a hand-read precision (calibration.cjs) before calling
// anything a defect; never quote these counts as findings.
const fs = require('fs');
const { load, presentations } = require('./load.cjs');
const { CHECKS } = require('./checks.cjs');

function runAll(course, only) {
  const res = [];
  for (const ch of CHECKS) {
    if (only && ch.id !== only) continue;
    const t0 = Date.now();
    const hits = ch.run(course);
    const subs = {};
    for (const h of hits) if (h.sub) subs[h.sub] = (subs[h.sub] || 0) + 1;
    res.push({ id: ch.id, scan: ch.scan, rule: ch.rule, blocks: ch.blocks, count: hits.length, subs, ms: Date.now() - t0, hits });
  }
  return res;
}

async function main() {
  const argv = process.argv.slice(2);
  const code = argv[0];
  if (!code) { console.error('usage: run.cjs <course_code> [--json f] [--check id] [--all] [--save f] [--offline f]'); process.exit(2); }
  const opt = (k) => { const i = argv.indexOf(k); return i > -1 ? argv[i + 1] : null; };
  const t0 = Date.now();
  const course = await load(code, { offline: opt('--offline'), save: opt('--save') });
  const tLoad = Date.now() - t0;
  // K23: fetch the intros of the LEGOs in ZUT groups (a handful of Popty reads) so explained clashes are told apart.
  if (!opt('--offline') || opt('--presentations')) {
    const { zutLego } = require('./checks.cjs');
    const ids = [...new Set(zutLego(course).map((h) => h.ref))];
    course.presentations = opt('--presentations') ? JSON.parse(fs.readFileSync(opt('--presentations'), 'utf8')) : await presentations(code, ids);
    if (opt('--save-presentations')) fs.writeFileSync(opt('--save-presentations'), JSON.stringify(course.presentations));
  }
  const res = runAll(course, opt('--check'));
  console.log(`${code}: ${course.seeds.length} seeds, ${course.legos.length} LEGOs, ${course.phrases.length} phrases; loaded in ${tLoad} ms`);
  for (const r of res) {
    const subs = Object.keys(r.subs).length ? ' ' + JSON.stringify(r.subs) : '';
    console.log(`\n== ${r.id} (${r.scan}, ${r.rule}) — ${r.count} candidates${subs}, ${r.ms} ms`);
    for (const h of (argv.includes('--all') ? r.hits : r.hits.slice(0, 3))) console.log(`  S${h.seed} ${h.ref} [${h.kind}${h.sub ? '/' + h.sub : ''}] ${h.known} | ${h.target} — ${h.why}`);
  }
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify({ course: code, at: new Date().toISOString(), checks: res }, null, 1));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { runAll };
