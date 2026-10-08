#!/usr/bin/env node
/**
 * CROSS-COURSE WEAK-WINDOW MAP — reads the per-course measure JSONs that
 * measure-all.cjs wrote and renders (1) a heatmap HTML page, one row per
 * course and one cell per 20-seed window, shaded by the share of available
 * frames the window does NOT use (darker = weaker), and (2) a markdown table.
 * READ-ONLY on course content; writes evidence only (publish, never commit).
 *
 * Usage: node tools/frame-layer/v4/cross-course-report.cjs [--out dir]
 * Output: <out>/cross-course-heatmap.html, cross-course-table.md
 */
const fs = require('fs');
const path = require('path');
const { query } = require('./db.cjs');
const { EVIDENCE, WEAK } = require('./measure.cjs');

// Sequential blue ramp (dataviz reference palette, steps 100..700), binned by the
// share of available frames a window leaves unused. Darkest = coverage under 50%.
const BINS = [
  { max: 0.10, hex: '#cde2fb', label: 'under 10% unused' },
  { max: 0.20, hex: '#9ec5f4', label: '10–20%' },
  { max: 0.30, hex: '#6da7ec', label: '20–30%' },
  { max: 0.40, hex: '#3987e5', label: '30–40%' },
  { max: 0.50, hex: '#256abf', label: '40–50%' },
  { max: 1.01, hex: '#0d366b', label: '50% or more unused (weak)' },
];
const binOf = (gap) => BINS.find(b => gap < b.max) || BINS[BINS.length - 1];
const pct = (x) => (x == null ? '–' : `${Math.round(x * 100)}%`);
const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;');

function load() {
  const files = fs.readdirSync(EVIDENCE).filter(f => f.startsWith('measure-') && f.endsWith('.json'));
  const ms = files.map(f => JSON.parse(fs.readFileSync(path.join(EVIDENCE, f), 'utf8')));
  const status = new Map(query(`select course_code, status, new_app_status from courses`).map(r => [r.course_code, r]));
  return ms.map(m => ({ m, s: status.get(m.course) || {} }))
    .sort((a, b) => (a.m.summary.mean_w20 ?? 1) - (b.m.summary.mean_w20 ?? 1));
}

function heatmap(rows) {
  const maxWin = Math.max(...rows.map(r => r.m.windows.all.w20.length));
  const cell = 14, gap = 2, labelW = 190, top = 46;
  const W = labelW + maxWin * (cell + gap) + 120, H = top + rows.length * (cell + gap) + 80;
  const parts = [];
  rows.forEach((r, i) => {
    const y = top + i * (cell + gap);
    const live = r.s.new_app_status && r.s.new_app_status !== 'not_available';
    parts.push(`<text x="${labelW - 8}" y="${y + cell - 3}" text-anchor="end" class="lab${live ? ' live' : ''}">${esc(r.m.course)}${live ? ' ●' : ''}</text>`);
    r.m.windows.all.w20.forEach((w, j) => {
      const b = binOf(1 - (w.coverage ?? 0));
      parts.push(`<rect x="${labelW + j * (cell + gap)}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${b.hex}"><title>${esc(r.m.course)} seeds ${w.start}–${w.end}: ${pct(w.coverage)} of ${w.available} frames used (${w.phrases} phrases)</title></rect>`);
    });
    parts.push(`<text x="${labelW + maxWin * (cell + gap) + 6}" y="${y + cell - 3}" class="val">${pct(r.m.summary.mean_w20)}</text>`);
  });
  for (let j = 0; j < maxWin; j += 5) parts.push(`<text x="${labelW + j * (cell + gap)}" y="${top - 8}" class="ax">${j * 20 + 1}</text>`);
  const ly = top + rows.length * (cell + gap) + 22;
  BINS.forEach((b, k) => parts.push(`<rect x="${16 + (k % 3) * 220}" y="${ly + Math.floor(k / 3) * 20}" width="${cell}" height="${cell}" rx="2" fill="${b.hex}"/><text x="${16 + (k % 3) * 220 + cell + 6}" y="${ly + Math.floor(k / 3) * 20 + cell - 3}" class="ax">${b.label}</text>`));
  return `<!doctype html><meta charset="utf-8"><title>Frame coverage by course</title>
<style>body{margin:0;background:#fcfcfb;font:12px system-ui,sans-serif;color:#1a1a19}.lab{fill:#4a4a46;font-size:11px}.live{fill:#1a1a19;font-weight:600}.ax{fill:#6b6b66;font-size:10px}.val{fill:#4a4a46;font-size:11px}h1{font-size:15px;margin:14px 0 2px 16px}p{margin:0 0 0 16px;color:#4a4a46}</style>
<h1>Frame coverage by course — share of available frames each 20-seed window leaves unused</h1>
<p>One row per course, weakest mean first; columns are 20-seed windows from seed 1; darker = more frames unused. ● = available to learners. Right column: mean coverage.</p>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
}

function table(rows) {
  const L = ['| Course | Known | Live | Phrases | Mean coverage (20) | Weak 10-seed windows | Weakest windows | Frames most often missing |', '|---|---|---|---:|---:|---:|---|---|'];
  for (const { m, s } of rows) {
    const sm = m.summary;
    const live = s.new_app_status && s.new_app_status !== 'not_available' ? 'yes' : 'no';
    L.push(`| ${m.course} | ${m.known_language} | ${live} | ${m.rows} | ${pct(sm.mean_w20)} | ${sm.weak_w10}/${sm.w10_count} | ${sm.weakest_w10.slice(0, 3).map(w => `${w.start}–${w.end} ${pct(w.coverage)}`).join(' · ')} | ${sm.most_missing.slice(0, 4).map(x => x.id).join(' ')} |`);
  }
  return L.join('\n');
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const out = a.includes('--out') ? a[a.indexOf('--out') + 1] : EVIDENCE;
  const rows = load();
  fs.writeFileSync(path.join(out, 'cross-course-heatmap.html'), heatmap(rows));
  fs.writeFileSync(path.join(out, 'cross-course-table.md'), table(rows));
  console.log(`${rows.length} courses → ${out}/cross-course-heatmap.html, cross-course-table.md (weak = under ${WEAK * 100}% of available frames)`);
}
module.exports = { load, heatmap, table, BINS };
