#!/usr/bin/env node
/**
 * Summarise the overnight tail-click + phonology audits into a report.
 * Reads tail-audit-results.jsonl + phono-audit-results.jsonl (detection only).
 * Emits counts by course/role + writes defect-id lists for the repair passes:
 *   - tail-defect-ids-<course>.json  -> feed to declick-tail.cjs --apply (DSP, no TTS)
 *   - phono-leak-ids-<course>.json    -> regenerate (TTS) through gated code
 *   node scripts/deepening/audit-report.cjs
 */
const fs = require('fs');
const path = require('path');
const read = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(l => l.trim()).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
const D = __dirname;
const tail = read(path.join(D, 'tail-audit-results.jsonl'));
const phono = read(path.join(D, 'phono-audit-results.jsonl'));

const group = (rows, pred) => rows.reduce((m, r) => { const k = `${r.course}/${r.role}`; m[k] = m[k] || { total: 0, hit: 0, err: 0 }; m[k].total++; if (r.error) m[k].err++; else if (pred(r)) m[k].hit++; return m; }, {});

console.log('=== TAIL-CLICK AUDIT ===');
console.log(`checked: ${tail.length} | defects: ${tail.filter(r => r.click).length} | errors: ${tail.filter(r => r.error).length}`);
const tg = group(tail, r => r.click);
Object.entries(tg).sort().forEach(([k, v]) => console.log(`  ${k}: ${v.hit}/${v.total} defect${v.err ? ` (${v.err} err)` : ''}`));

console.log('\n=== PHONOLOGY AUDIT ===');
console.log(`checked: ${phono.length} | leaks: ${phono.filter(r => r.defect).length} | errors: ${phono.filter(r => r.error).length}`);
const pg = group(phono, r => r.defect);
Object.entries(pg).sort().forEach(([k, v]) => console.log(`  ${k}: ${v.hit}/${v.total} leak${v.err ? ` (${v.err} err)` : ''}`));
// leak language breakdown
const leakLangs = phono.filter(r => r.defect).reduce((m, r) => { m[r.detected] = (m[r.detected] || 0) + 1; return m; }, {});
if (Object.keys(leakLangs).length) console.log('  leak detected-langs:', JSON.stringify(leakLangs));

// write repair id lists per course
for (const course of [...new Set([...tail, ...phono].map(r => r.course))]) {
  const tIds = tail.filter(r => r.course === course && r.click).map(r => r.id);
  const pIds = phono.filter(r => r.course === course && r.defect).map(r => r.id);
  if (tIds.length) fs.writeFileSync(path.join(D, `tail-defect-ids-${course}.json`), JSON.stringify(tIds));
  if (pIds.length) fs.writeFileSync(path.join(D, `phono-leak-ids-${course}.json`), JSON.stringify(pIds));
  console.log(`\n${course}: ${tIds.length} tail-defect ids, ${pIds.length} phono-leak ids written`);
}
console.log('\nNext: tail defects -> declick-tail.cjs --apply (DSP repair, no TTS); phono leaks -> regen via gated /regenerate-role or /generate.');
