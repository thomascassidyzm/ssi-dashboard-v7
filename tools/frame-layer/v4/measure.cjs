#!/usr/bin/env node
/**
 * MEASURE a live course against the window-coverage metric — read-only.
 *
 * Per course: windows of 20 seeds (headline) and 10 seeds (secondary), scored
 * over all BUILD+USE rows. Where a course carries v3 rows
 * (metadata.pipeline = 'v3' — Irish is the only course with a real v3 body,
 * 3,034 rows) the same windows are scored three ways: everything, v3 rows
 * only, non-v3 rows only, so v3 and the old builder are compared inside the
 * same seeds with the same available frames.
 *
 * Usage: node tools/frame-layer/v4/measure.cjs fra_for_eng deu_for_eng gle_for_eng
 * Output: $EVIDENCE/measure-<course>.json
 */
const fs = require('fs');
const path = require('path');
const { loadCourse } = require('./db.cjs');
const { inventory, availableAt } = require('./frame-inventory.cjs');
const { scoreCourseWindows } = require('./window-coverage.cjs');

function measure(course) {
  const data = loadCourse(course);
  const inv = inventory(course, data);
  const avail = (seed) => availableAt(inv, seed);
  const maxSeed = Math.max(...data.phrases.map(p => p.seed_number));
  const sets = { all: data.phrases };
  const v3 = data.phrases.filter(p => p.pipeline === 'v3');
  if (v3.length) { sets.v3 = v3; sets.not_v3 = data.phrases.filter(p => p.pipeline !== 'v3'); }
  const out = { course, generated: new Date().toISOString(), max_seed: maxSeed, rows: data.phrases.length, v3_rows: v3.length, windows: {} };
  for (const [name, rows] of Object.entries(sets)) {
    out.windows[name] = { w20: scoreCourseWindows(rows, avail, { size: 20, maxSeed }), w10: scoreCourseWindows(rows, avail, { size: 10, maxSeed, rarefyN: 40 }) };
  }
  return out;
}

const mean = (xs) => xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(3) : null;
function summary(m) {
  const lines = [];
  for (const [name, w] of Object.entries(m.windows)) {
    const ws = w.w20;
    lines.push(`${m.course} [${name}] ${ws.length} windows of 20: mean coverage ${mean(ws.map(x => x.coverage))}, ` +
      `mean rarefied@60 ${mean(ws.filter(x => x.rarefied_frames_at_n != null).map(x => x.rarefied_frames_at_n))}, ` +
      `interjection rate ${mean(ws.map(x => x.interjection_rate))}, phrases ${ws.reduce((a, x) => a + x.phrases, 0)}`);
  }
  return lines.join('\n');
}

module.exports = { measure, summary };

if (require.main === module) {
  const outDir = process.env.V4_EVIDENCE || path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '468-frame-diversity');
  fs.mkdirSync(outDir, { recursive: true });
  for (const course of process.argv.slice(2)) {
    const m = measure(course);
    fs.writeFileSync(path.join(outDir, `measure-${course}.json`), JSON.stringify(m, null, 1));
    console.log(summary(m));
    for (const x of m.windows.all.w20) console.log(`  ${String(x.start).padStart(3)}-${String(x.end).padStart(3)} avail ${String(x.available).padStart(2)} used ${String(x.used).padStart(2)} cov ${x.coverage}  rare60 ${x.rarefied_frames_at_n ?? '-'}  n ${x.phrases}  interj ${x.interjection_rate}  missing ${x.missing_ids.join(' ')}`);
  }
}
