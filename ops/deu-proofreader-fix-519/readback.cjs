#!/usr/bin/env node
'use strict';
// cs #519·AI read-back, LIVE through Popty only:
//  · phrases: GET /api/production/deu_for_eng/lego/:id/basket — text + every linked clip id, compared to what the batches set;
//  · LEGO slots (no GET carries them): the same audio.link ops re-sent as an edit-batch DRY RUN; changed:false = already live.
//  · seed 634 (item 5) and 639 (item 7): GET .../seed/:n/baskets, to show the live LEGOs.
const fs = require('fs'); const path = require('path');
const H = { 'x-agent-id': 'cs #519·AI read-back', 'Content-Type': 'application/json' };
const get = async (u) => (await fetch(`http://localhost:3470${u}`, { headers: H, signal: AbortSignal.timeout(120000) })).json();
(async () => {
  const want = new Map(); const legoOps = [];
  for (const b of ['A', 'B', 'C', 'D']) for (const op of JSON.parse(fs.readFileSync(path.join(__dirname, `batch-${b}.ops.json`), 'utf8'))) {
    if (op.op === 'audio.link' && op.target === 'lego') { legoOps.push(op); continue; }
    const id = op.phrase_id || (op.row && op.row.id); if (!id) continue;
    const w = want.get(id) || {}; if (op.set) Object.assign(w, op.set); if (op.row) Object.assign(w, { known_text: op.row.known_text, target_text: op.row.target_text });
    if (op.op === 'audio.link') w[`${op.slot}_audio_id`] = op.audio_id; want.set(id, w);
  }
  const out = { phrases: [], legos: null, seeds: {} };
  const legos = [...new Set([...want.keys()].map((id) => id.split(':')[1].slice(0, 8)))];
  for (const l of legos) {
    const bk = await get(`/api/production/deu_for_eng/lego/${l}/basket`);
    for (const [id, w] of want) if (id.includes(l)) {
      const p = bk.phrases.find((x) => x.id === id);
      const bad = p ? Object.entries(w).filter(([k, v]) => p[k] !== v).map(([k, v]) => `${k}: want ${v} live ${p[k]}`) : ['MISSING'];
      out.phrases.push({ id, ok: !bad.length, bad, known: p && p.known_text, target: p && p.target_text, known_audio_id: p && p.known_audio_id, target1_audio_id: p && p.target1_audio_id, target2_audio_id: p && p.target2_audio_id, last_edit_event_id: p && p.last_edit_event_id });
    }
  }
  const r = await (await fetch('http://localhost:3470/api/production/deu_for_eng/edit-batch', { method: 'POST', headers: H, body: JSON.stringify({ ops: legoOps, apply: false }), signal: AbortSignal.timeout(240000) })).json();
  out.legos = { ok: r.ok, allUnchanged: (r.results || []).every((x) => x.changed === false), results: (r.results || []).map((x, i) => ({ ...legoOps[i], changed: x.changed })) };
  for (const s of [634, 639]) out.seeds[s] = await get(`/api/production/deu_for_eng/seed/${s}/baskets`);
  fs.writeFileSync(path.join(__dirname, 'out/readback.json'), JSON.stringify(out, null, 1));
  console.log('phrases', out.phrases.filter((x) => x.ok).length, '/', out.phrases.length, 'ok;', out.phrases.filter((x) => !x.ok).map((x) => x.id + ' ' + x.bad.join('; ')).join(' | '));
  console.log('lego links live (dry-run unchanged):', out.legos.allUnchanged, out.legos.results.map((x) => `${x.lego_id}.${x.slot}=${x.audio_id.slice(0, 8)}:${x.changed}`).join(' '));
  for (const s of [634, 639]) console.log(s, Object.entries(out.seeds[s].baskets).map(([k, v]) => `${k} "${v.lego.known}"="${v.lego.target}"`).join(' ; '));
})();
