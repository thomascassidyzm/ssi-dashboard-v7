#!/usr/bin/env node
'use strict';
// Read-only census through Popty (job #942): every Welsh row mentioning miwsig (or its soft-mutated fiwsig), with clip ids.
const fs = require('fs');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const RX = /(miwsi|fiwsi|niwsi|miwsic)/i;
(async () => {
  for (const c of ['cym_nv2_for_eng', 'cym_sv2_for_eng']) {
    const data = await (await fetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: { 'x-agent-id': 'aran-watson-942' } })).json();
    fs.writeFileSync(`${process.argv[2]}/${c}.seeds.json`, JSON.stringify(data));
    const hits = [];
    for (const s of data.seeds) {
      if (RX.test(s.target_text)) hits.push({ k: 'seed', id: s.seed_number, t: s.target_text, a: [s.target1_audio_id, s.target2_audio_id] });
      for (const l of s.legos) {
        if (RX.test(l.target_text) || (l.components||[]).some(k=>RX.test(k.target))) hits.push({ k: 'lego', id: l.lego_id, new: l.is_new, t: l.target_text, comps: l.components, a: [l.target1_audio_id, l.target2_audio_id, l.presentation_audio_id] });
        for (const p of l.basket_phrases || []) if (RX.test(p.target_text)) hits.push({ k: 'phrase', id: p.id, t: p.target_text, a: [p.target1_audio_id, p.target2_audio_id] });
      }
    }
    console.log(c, data.seeds.length, 'seeds', hits.length, 'hits');
    for (const h of hits) console.log(h.k, h.id, h.new ?? '', '|', h.t, '|', JSON.stringify(h.a));
  }
})();
