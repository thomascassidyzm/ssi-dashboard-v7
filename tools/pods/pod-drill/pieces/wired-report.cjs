#!/usr/bin/env node
// Per-course table of what is wired and what was proved (job #252), from wired.json, clip-audit.json and the probe's JSON.
//   node tools/pods/pod-drill/pieces/wired-report.cjs <probe output dir> > <a report you publish>  (clip-audit.cjs first)
const fs = require('fs'), path = require('path');
const { DATA: dir } = require('./paths.cjs'), out = process.argv[2];
const wired = JSON.parse(fs.readFileSync(path.join(dir, 'wired.json'), 'utf8')).courses;
const audit = JSON.parse(fs.readFileSync(path.join(dir, 'clip-audit.json'), 'utf8')).courses;
const read = (b, c) => { const f = path.join(out, `${b}-${c}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const tier = (c) => (c.endsWith('_for_eng') ? 'Tier 1' : wired[c].turns === 24 ? '24-scene' : '15-scene');
const said = (r, full) => { if (!r) return ''; const n = r.walk.length, p = r.proved; return `${p}/${n} turns${r.errors ? `, ${r.errors} clip error` : ''}`; };
const order = Object.keys(wired).sort((a, b) => tier(a).localeCompare(tier(b)) || a.localeCompare(b));
console.log('| Course | Tier | Turns | Whole | Split | Pieces | Unresolved | Clips answering | Chromium, played | WebKit, played |\n|---|---|---:|---:|---:|---:|---:|---:|---|---|');
for (const c of order) {
  const s = wired[c], a = audit[c], cr = read('chromium', c), wk = read('webkit', c);
  console.log(`| ${c} | ${tier(c)} | ${s.turns} | ${s.whole} | ${s.split} | ${s.pieces} | ${s.unresolved.length} | ${a.answering}/${a.clips} | ${said(cr) || 'clips verified, not played'} | ${said(wk) || 'not played'} |`);
}
const n = Object.values(wired);
console.log(`\nTotal ${n.reduce((a, s) => a + s.split, 0)} split turns, ${n.reduce((a, s) => a + s.pieces, 0)} pieces.`);
