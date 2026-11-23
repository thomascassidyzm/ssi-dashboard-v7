#!/usr/bin/env node
// cs #868 L1: which audio slots on rows item 5 edited (ops/paid-cleanup-item5/<course>/a.ops.json, applied 18 Nov) are
// EMPTY on the nightly copy. Offline: reads copy dumps made by ops/paid-cleanup-scan-447/copy-read.cjs dump. No DB.
//   node item5-count.cjs <dumpDir> <out.json>
const fs = require('fs'), path = require('path');
const [dumpDir, out] = process.argv.slice(2);
const ROOT = path.resolve(__dirname, '../../paid-cleanup-item5');
const res = { copy: null, courses: {}, slots: [] };
for (const c of fs.readdirSync(ROOT).filter((d) => fs.existsSync(path.join(ROOT, d, 'a.ops.json')))) {
  const df = path.join(dumpDir, `${c}.json`); if (!fs.existsSync(df)) { res.courses[c] = { error: 'no dump' }; continue; }
  const ops = JSON.parse(fs.readFileSync(path.join(ROOT, c, 'a.ops.json'), 'utf8')).ops;
  const applied = fs.existsSync(path.join(ROOT, c, 'a.apply.json')) || c === 'eng_for_jpn';
  const ids = new Set(), legos = new Set(), deleted = new Set();
  for (const o of ops) {
    if (o.op === 'phrase.update') ids.add(o.phrase_id);
    else if (o.op === 'phrase.insert') ids.add(o.row.id);
    else if (o.op === 'lego.update') legos.add(o.lego_id);
    else if (o.op === 'phrase.delete') deleted.add(o.phrase_id);
  }
  const d = JSON.parse(fs.readFileSync(df, 'utf8')); res.copy = d.copy_db;
  const seen = new Set(); let n = 0;
  for (const s of d.seeds) for (const l of s.legos) {
    const lgId = l.id;
    const debut = l.phrases.find((p) => p.type === 'lego_debut');
    if (legos.has(lgId)) {
      seen.add('LEGO:' + lgId);
      const row = debut || { ka: null, t1: null, t2: null };
      for (const [k, slot, txt] of [['ka', 'known', l.known], ['t1', 'target1', l.target], ['t2', 'target2', l.target]])
        if (!row[k]) { res.slots.push({ course: c, target: 'lego', id: lgId, slot, text: txt, is_new: l.is_new, seed: s.n }); n++; }
    }
    for (const p of l.phrases) {
      if (p.type === 'lego_debut' || !ids.has(p.id)) continue; seen.add(p.id);
      for (const [k, slot, txt] of [['ka', 'known', p.known], ['t1', 'target1', p.target], ['t2', 'target2', p.target]])
        if (!p[k]) { res.slots.push({ course: c, target: 'phrase', id: p.id, slot, text: txt, is_new: l.is_new, seed: s.n }); n++; }
    }
  }
  const missing = [...ids].filter((i) => !seen.has(i)).length + [...legos].filter((i) => !seen.has('LEGO:' + i)).length;
  res.courses[c] = { applied, ops: ops.length, touched_rows: ids.size + legos.size, empty_slots: n, rows_not_on_copy: missing,
    chars_if_all_rendered: res.slots.filter((x) => x.course === c).reduce((a, x) => a + (x.text || '').length, 0) };
}
fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.table(res.courses);
