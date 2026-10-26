#!/usr/bin/env node
'use strict';
// Read-only census (Popty) of Welsh text with mai'r / taw'r / 'un coch' frames, across seeds, LEGOs, components, phrases.
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const RX = new RegExp(process.argv[2] || "(^|[^\\p{L}])(mai|taw|mai[’']r|taw[’']r|un coch)(?![\\p{L}])", 'iu');
(async () => {
  for (const c of ['cym_nv2_for_eng', 'cym_sv2_for_eng']) {
    const data = await (await fetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: { 'x-agent-id': 'aran-watson-107' } })).json();
    console.log('##', c, 'seeds', data.seeds.length);
    const row = (k, id, t, e) => console.log(`${k}\t${id}\t${t}\t|\t${e}`);
    for (const s of data.seeds) {
      if (RX.test(s.target_text)) row('seed', s.seed_number, s.target_text, s.known_text);
      for (const l of s.legos) {
        if (RX.test(l.target_text) || RX.test(JSON.stringify(l.components || []))) row('lego', l.lego_id + (l.is_new ? '' : '(ref)'), l.target_text + ' || comps ' + JSON.stringify(l.components || []), l.known_text);
        for (const p of l.basket_phrases || []) if (RX.test(p.target_text)) row('phrase', p.id, p.target_text, p.known_text);
      }
    }
  }
})();
