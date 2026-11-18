#!/usr/bin/env node
'use strict';
// cs #690·AI read-back, LIVE through Popty only (shape of #519·AI's):
//  · every phrase/LEGO op in batch-A/C: GET .../seed/:n/baskets has text but no clip ids, so phrases are read from
//    GET .../lego/:id/basket (text + linked clip ids) and LEGO slots by re-sending their audio.link ops as a DRY RUN
//    (changed:false = already live); the deleted rows must be absent; intros via GET .../presentation/:legoId.
const fs = require('fs'); const path = require('path');
const H = { 'x-agent-id': 'cs #690·AI read-back', 'Content-Type': 'application/json' };
const BASE = 'http://localhost:3470/api/production/deu_for_eng';
const get = async (u) => (await fetch(BASE + u, { headers: H, signal: AbortSignal.timeout(120000) })).json();
(async () => {
  const want = new Map(); const legoOps = []; const deleted = [];
  for (const b of ['A', 'C']) for (const op of JSON.parse(fs.readFileSync(path.join(__dirname, `batch-${b}.ops.json`), 'utf8'))) {
    if (op.target === 'lego' || op.op === 'lego.update') { if (op.op === 'audio.link') legoOps.push(op); else legoOps.push({ ...op, set: undefined, expect: { known_text: op.set.known_text, target_text: op.set.target_text }, set: { known_text: op.set.known_text } }); continue; }
    if (op.op === 'phrase.delete') { deleted.push(op.phrase_id); continue; }
    const id = op.phrase_id || (op.row && op.row.id); const w = want.get(id) || {};
    if (op.set) Object.assign(w, op.set); if (op.row) Object.assign(w, { known_text: op.row.known_text, target_text: op.row.target_text });
    if (op.op === 'audio.link') w[`${op.slot}_audio_id`] = op.audio_id; want.set(id, w);
  }
  const out = { phrases: [], deleted: [], legos: null, intros: {} };
  const legos = [...new Set([...want.keys(), ...deleted].map((id) => id.split(':')[1].slice(0, 8)))];
  const live = {};
  for (const l of legos) { const bk = await get(`/lego/${l}/basket`); for (const p of bk.phrases || []) live[p.id] = p; }
  for (const [id, w] of want) {
    const p = live[id];
    const bad = p ? Object.entries(w).filter(([k, v]) => p[k] !== v).map(([k, v]) => `${k}: want ${v} live ${p[k]}`) : ['MISSING'];
    out.phrases.push({ id, ok: !bad.length, bad, known: p && p.known_text, target: p && p.target_text, known_audio_id: p && p.known_audio_id, target1_audio_id: p && p.target1_audio_id, target2_audio_id: p && p.target2_audio_id });
  }
  for (const id of deleted) out.deleted.push({ id, gone: !live[id] });
  // LEGO text: a lego.update whose expect is the NEW text (dry run) passes only if the new text is live.
  const r = await (await fetch(BASE + '/edit-batch', { method: 'POST', headers: H, body: JSON.stringify({ ops: legoOps, apply: false }), signal: AbortSignal.timeout(240000) })).json();
  out.legos = { ok: r.ok, error: r.error, results: (r.results || []).map((x, i) => ({ op: legoOps[i].op, lego_id: legoOps[i].lego_id, slot: legoOps[i].slot, audio_id: legoOps[i].audio_id, changed: x.changed })) };
  for (const l of ['S0654L01', 'S0657L02']) out.intros[l] = await get(`/presentation/${l}`);
  for (const s of [654, 660]) out[`seed${s}`] = await get(`/seed/${s}/baskets`);
  fs.writeFileSync(path.join(__dirname, 'out/readback.json'), JSON.stringify(out, null, 1));
  console.log('phrases', out.phrases.filter((x) => x.ok).length, '/', out.phrases.length, 'ok;', out.phrases.filter((x) => !x.ok).map((x) => x.id + ' ' + x.bad.join('; ')).join(' | '));
  console.log('deleted gone', out.deleted.filter((x) => x.gone).length, '/', out.deleted.length);
  console.log('lego text+links live (dry-run ok, links unchanged):', out.legos.ok, out.legos.error || '', out.legos.results.filter((x) => x.op === 'audio.link').every((x) => x.changed === false), out.legos.results.map((x) => `${x.lego_id}.${x.slot || 'text'}:${x.changed}`).join(' '));
  for (const [l, v] of Object.entries(out.intros)) console.log(l, v.audio_id, v.text);
  for (const s of [654, 660]) console.log(s, Object.entries(out[`seed${s}`].baskets).map(([k, v]) => `${k} new=${v.is_new} "${v.lego.known}"="${v.lego.target}" phrases=${v.practice_phrases.length}`).join(' ; '));
})();
