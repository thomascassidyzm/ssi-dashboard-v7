#!/usr/bin/env node
/**
 * Per-course before/after table for a gap-fill fan-out (job #924): reads every
 * staged-<course>.json under the run dir and prints markdown. Read-only.
 * Usage: node tools/frame-layer/v4/fanout-summary.cjs [run dir] > summary.md
 */
const fs = require('fs');
const path = require('path');
const DIR = process.argv[2] || path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '924-phrase-v4-all-courses');
const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const pct = (x) => x == null ? '–' : `${Math.round(x * 100)}%`;

const rows = [];
for (const c of fs.readdirSync(DIR).sort()) {
  const f = path.join(DIR, c, `staged-${c}.json`);
  if (!fs.existsSync(f)) continue;
  const s = JSON.parse(fs.readFileSync(f, 'utf8'));
  const weak = fs.existsSync(path.join(DIR, c, 'windows.json')) ? JSON.parse(fs.readFileSync(path.join(DIR, c, 'windows.json'), 'utf8')).length : 0;
  const r = s.drop_reasons || {};
  const gate = Object.entries(r).filter(([k]) => !k.startsWith('judge')).reduce((a, [, v]) => a + v, 0);
  const judge = Object.entries(r).filter(([k]) => k.startsWith('judge')).reduce((a, [, v]) => a + v, 0);
  rows.push({ course: c, weak, live: s.live_rows_at_gate, cand: s.candidates, acc: s.accepted, build: s.by_role.build, use: s.by_role.use, gate, judge,
    before: mean(s.windows.map(w => w.coverage_before)), after: mean(s.windows.map(w => w.coverage_after)), tokens: s.opus_tokens || 0 });
}
const T = rows.reduce((a, x) => ({ cand: a.cand + x.cand, acc: a.acc + x.acc, gate: a.gate + x.gate, judge: a.judge + x.judge, weak: a.weak + x.weak, tokens: a.tokens + x.tokens }),
  { cand: 0, acc: 0, gate: 0, judge: 0, weak: 0, tokens: 0 });
const out = [];
out.push('| Course | Weak windows filled | Live rows | Candidates | Cut by Popty gates | Cut by judge | Staged (BUILD / USE) | Coverage of filled windows, before → after |');
out.push('|---|---:|---:|---:|---:|---:|---:|---|');
for (const x of rows.filter(r => r.weak)) out.push(`| ${x.course} | ${x.weak} | ${x.live} | ${x.cand} | ${x.gate} | ${x.judge} | ${x.acc} (${x.build} / ${x.use}) | ${pct(x.before)} → ${pct(x.after)} |`);
out.push(`| **all** | **${T.weak}** | | **${T.cand}** | **${T.gate}** | **${T.judge}** | **${T.acc}** | |`);
const none = rows.filter(r => !r.weak).map(r => r.course);
console.log(out.join('\n'));
if (none.length) console.log(`\nNo weak window (every 10-seed window already uses half or more of its available frames): ${none.join(', ')}.`);
console.log(`\nOpus generation tokens across the fan-out: ${(T.tokens / 1e6).toFixed(1)}M.`);
