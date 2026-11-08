#!/usr/bin/env node
'use strict';
// READ-ONLY: prove an English-side change left every WELSH id of Welsh Pod 1 untouched (job #891).
// Compares two snapshots, each a dir holding ps_n.json / ps_s.json (GET /api/pod-scripts/cym_{n,s}_for_eng answers) and
// drill_n.json / drill_s.json (ops/pod-drill/served/cym_{n,s}_for_eng.json). Per line: Welsh text, Welsh whole clip id +
// voice, Welsh sentence clip ids; per Drill piece: Welsh words, Welsh clip id, Welsh span. Prints the Welsh diff (must be
// empty) and, for the record, which ENGLISH ids moved.
//   node tools/pods/pod-drill/pieces/welsh-readback.cjs <beforeDir> <afterDir> [--out readback.json]   (exit 1 on any Welsh diff)
const fs = require('fs'), path = require('path');

function welshOf(ps, drill) {
  const out = {};
  for (const l of ps.scenes.flatMap((s) => s.lines)) {
    const t = l.audio.target || {};
    out[`line ${l.id}`] = JSON.stringify([l.target_text, t.id || null, t.voice_id || null, (l.audio.target_splits || []).map((x) => x.id)]);
  }
  for (const [turn, pieces] of Object.entries(drill.turns || {})) pieces.forEach((p, i) => { out[`drill ${turn} #${i}`] = JSON.stringify([p[0], p[2], p[4]]); });
  return out;
}
function englishOf(ps, drill) {
  const out = {};
  for (const l of ps.scenes.flatMap((s) => s.lines)) {
    const k = l.audio.known || {};
    out[`line ${l.id}`] = JSON.stringify([l.known_text, k.id || null, (l.audio.known_splits || []).map((x) => x.id)]);
  }
  for (const [turn, pieces] of Object.entries(drill.turns || {})) pieces.forEach((p, i) => { out[`drill ${turn} #${i}`] = JSON.stringify([p[1], p[3], p[5]]); });
  return out;
}
const diff = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]).map((k) => ({ key: k, before: a[k] ?? null, after: b[k] ?? null }));

function main() {
  const [bDir, aDir] = process.argv.slice(2).filter((x) => !x.startsWith('--'));
  const oi = process.argv.indexOf('--out'), outFile = oi >= 0 ? process.argv[oi + 1] : null;
  const read = (d, f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
  const res = { courses: {} };
  for (const c of ['n', 's']) {
    const [b, a] = [bDir, aDir].map((d) => ({ ps: read(d, `ps_${c}.json`), drill: read(d, `drill_${c}.json`) }));
    const wb = welshOf(b.ps, b.drill), wa = welshOf(a.ps, a.drill);
    res.courses[`cym_${c}_for_eng`] = { welshCompared: Object.keys(wb).length, welshDiff: diff(wb, wa), englishMoved: diff(englishOf(b.ps, b.drill), englishOf(a.ps, a.drill)) };
    const r = res.courses[`cym_${c}_for_eng`];
    console.log(`cym_${c}_for_eng: Welsh ${r.welshCompared} entries compared, ${r.welshDiff.length} differ; English ${r.englishMoved.length} entries moved`);
  }
  if (outFile) fs.writeFileSync(outFile, JSON.stringify(res, null, 1) + '\n');
  process.exit(Object.values(res.courses).some((r) => r.welshDiff.length) ? 1 : 0);
}
if (require.main === module) main();
module.exports = { welshOf, englishOf, diff };
