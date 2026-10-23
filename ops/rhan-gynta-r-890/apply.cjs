#!/usr/bin/env node
'use strict';
// Aran 2026-10-23 (job #890): "rhan gynta’ y sioe" -> "rhan gynta’r sioe" in cym_nv2_for_eng (seed 1494 + 4 L04 phrases).
// Spelling only: the clips already say it, so each recorded clip's text is relabelled FIRST, then the row, in one
// edit-batch (nothing unlinks). Every op carries `expect` on the old text. Dry run unless --apply. Popty only.
const fs = require('fs');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const H = { 'content-type': 'application/json', 'x-agent-id': 'aran-watson-890' };
const C = 'cym_nv2_for_eng';
const OLD = /gynta’ y sioe/g, NEW = 'gynta’r sioe';
const fix = (t) => t.replace(OLD, NEW);
const apply = process.argv.includes('--apply');
const out = __dirname;
(async () => {
  const data = await (await fetch(`${BASE}/api/production/${C}/seeds?status=all`, { headers: H })).json();
  const seed = data.seeds.find((s) => s.seed_number === 1494);
  const clip = async (id, newText) => { // read current clip text via the DRIFT answer of a no-op-impossible expect
    const r = await (await fetch(`${BASE}/api/production/${C}/edit-batch`, { method: 'POST', headers: H,
      body: JSON.stringify({ ops: [{ op: 'audio.update', audio_id: id, set: { text: 'x' }, expect: { text: '\u0000' } }] }) })).json();
    const m = /found "(.*)"\)$/.exec(r.error || ''); if (!m) throw new Error('cannot read clip ' + id + ' ' + JSON.stringify(r));
    const old = m[1]; if (!OLD.test(old)) { OLD.lastIndex = 0; return null; } OLD.lastIndex = 0;
    const strip = (t) => t.toLowerCase().replace(/[?.,!]/g, '');
    return { op: 'audio.update', audio_id: id, set: { text: fix(old) }, expect: { text: old } };
  };
  const ops = []; const kept = [];
  const rows = [];
  if (OLD.test(seed.target_text)) { OLD.lastIndex = 0; rows.push({ kind: 'seed', obj: seed, ids: [seed.target1_audio_id, seed.target2_audio_id] }); } OLD.lastIndex = 0;
  for (const l of seed.legos) for (const p of l.basket_phrases || []) if (OLD.test(p.target_text)) { OLD.lastIndex = 0; rows.push({ kind: 'phrase', obj: p, ids: [p.target1_audio_id, p.target2_audio_id] }); } else OLD.lastIndex = 0;
  for (const r of rows) {
    for (const id of r.ids.filter(Boolean)) { const o = await clip(id, null); if (o) { ops.push(o); kept.push({ row: r.obj.id || r.obj.seed_id, clip: id, old: o.expect.text, new: o.set.text }); } else kept.push({ row: r.obj.id || r.obj.seed_id, clip: id, note: 'clip text does not match old form, untouched' }); }
    if (r.kind === 'seed') ops.push({ op: 'seed.update', seed_number: 1494, set: { target_text: fix(r.obj.target_text) }, expect: { target_text: r.obj.target_text } });
    else {
      const p = r.obj; const dec = p.decomposition.map((s) => (/^ ?y sioe$/.test(s.target) ? { ...s, target: 'r sioe' } : s));
      ops.push({ op: 'phrase.update', phrase_id: p.id, set: { target_text: fix(p.target_text), decomposition: dec }, expect: { target_text: p.target_text, decomposition: p.decomposition } });
    }
  }
  fs.writeFileSync(`${out}/${C}.ops.json`, JSON.stringify({ ops, kept }, null, 1));
  const res = await (await fetch(`${BASE}/api/production/${C}/edit-batch`, { method: 'POST', headers: H, body: JSON.stringify({ ops, apply }) })).json();
  fs.writeFileSync(`${out}/${C}.${apply ? 'applied' : 'dryrun'}.json`, JSON.stringify(res, null, 1));
  console.log(ops.length, 'ops', JSON.stringify(res).slice(0, 1800));
})().catch((e) => { console.error(e); process.exit(1); });
