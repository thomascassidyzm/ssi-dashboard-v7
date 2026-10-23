#!/usr/bin/env node
'use strict';
// #952 census (read-only, via Popty): every row in cym_nv2/sv2 with a 'tasai o' near-match.
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const NEAR = /tasai\s+o/iu;
const HIT = /(^|[^\p{L}])(tasai\s+)([oO])(?![\p{L}])/giu;
const cases = {};
(async () => {
  for (const c of ['cym_nv2_for_eng', 'cym_sv2_for_eng']) {
    const d = await (await fetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: { 'x-agent-id': 'aran-watson-952' } })).json();
    const note = (k, id, t, extra = '') => { if (!NEAR.test(t)) return; const hit = [...t.matchAll(HIT)].length ? 'HIT ' : 'NEAR'; console.log(c, k, hit, id, '|', t, extra); };
    for (const s of d.seeds) {
      note('SEED', s.seed_number, s.target_text);
      for (const l of s.legos) {
        note(l.is_new ? 'LEGO' : 'LEGO(notnew)', l.lego_id, l.target_text);
        for (const k of l.components || []) note('COMP', l.lego_id, k.target);
        for (const p of l.basket_phrases || []) {
          note('PHR', p.id, p.target_text);
          const segs = (p.decomposition || []).map((x) => x.target || '');
          if (NEAR.test(p.target_text) && !segs.some((x) => NEAR.test(x))) console.log('   !! split decomposition', p.id, JSON.stringify(segs));
        }
      }
    }
  }
})();
