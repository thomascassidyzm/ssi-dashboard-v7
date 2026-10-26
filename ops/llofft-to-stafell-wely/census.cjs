#!/usr/bin/env node
'use strict';
// Read-only census (via Popty) of every row whose Welsh text carries llofft/lofft/llofftydd/'n llofft etc, with its English.
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const RX = /(^|[^\p{L}])(ll?offt\w*|Ll?offt\w*|nh?lofft\w*)/iu;
const RXS = /ll?offt|stafell\w* wely|stafelloedd gwely/i;
(async () => {
  for (const c of ['cym_nv2_for_eng', 'cym_sv2_for_eng']) {
    const data = await (await fetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: { 'x-agent-id': 'aran-watson-73' } })).json();
    console.log('##', c, 'seeds', data.seeds.length);
    const row = (k, id, t, e, takes) => console.log(`${k}\t${id}\t${t}\t|\t${e}\t|takes=${takes}`);
    for (const s of data.seeds) {
      if (RXS.test(s.target_text)) row('seed', s.seed_number, s.target_text, s.known_text, [s.target1_audio_id, s.target2_audio_id].filter(Boolean).length);
      for (const l of s.legos) {
        if (RXS.test(l.target_text) || RXS.test(JSON.stringify(l.components || []))) row('lego', l.lego_id + (l.is_new ? '' : '(ref)'), l.target_text, l.known_text, [l.target1_audio_id, l.target2_audio_id].filter(Boolean).length);
        for (const p of l.basket_phrases || []) if (RXS.test(p.target_text) || RXS.test(JSON.stringify(p.decomposition || []))) row('phrase', p.id, p.target_text, p.known_text, [p.target1_audio_id, p.target2_audio_id].filter(Boolean).length);
      }
    }
  }
})();
