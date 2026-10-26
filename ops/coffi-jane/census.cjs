#!/usr/bin/env node
'use strict';
// Read-only census (via Popty) for Aran's job: A) 'drink without sugar' -> 'drink coffee without sugar'; B) Jane -> Siân.
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const SUG = /heb\s+(siw|sug)|without sugar/i, JANE = /jane/i;
(async () => {
  for (const c of ['cym_nv2_for_eng', 'cym_sv2_for_eng']) {
    const data = await (await fetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: { 'x-agent-id': 'aran-watson-105' } })).json();
    console.log('##', c, 'seeds', data.seeds.length);
    const row = (k, id, t, e, x) => { if (SUG.test(t + e) || JANE.test(t + e) || /sian|siân/i.test(t + e)) console.log(`${k}\t${id}\t${t}\t|\t${e}\t|${x}`); };
    for (const s of data.seeds) {
      row('seed', s.seed_number, s.target_text, s.known_text, '');
      for (const l of s.legos) {
        row(l.is_new ? 'lego' : 'lego(ref)', l.lego_id, l.target_text, l.known_text, JSON.stringify(l.components || []));
        for (const p of l.basket_phrases || []) row('phrase', p.id, p.target_text, p.known_text, '');
      }
    }
  }
})();
