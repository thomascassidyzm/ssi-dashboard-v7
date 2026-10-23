#!/usr/bin/env node
'use strict';
// #946: read-only census (via Popty) of rows whose ENGLISH says 'wish' or whose Welsh has licio/hoffi structures.
const BASE = 'http://localhost:3470';
const COURSES = ['cym_nv2_for_eng', 'cym_sv2_for_eng'];
const W = /\bwish(es|ed)?\b/i;
const LIC = /\b(s|f|b)?wn i['’]?n licio|\bsa i['’]?n licio|\bsen i['’]?n licio|licio/i;
const HOF = /hoffw|hoffi/i;
(async () => {
  for (const c of COURSES) {
    const data = await (await fetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: { 'x-agent-id': 'aran-watson-946' } })).json();
    const rows = [];
    const add = (kind, id, k, t) => { if (W.test(k) || LIC.test(t) || (HOF.test(t) && W.test(k))) rows.push({ c, kind, id, k, t }); };
    for (const s of data.seeds) {
      add('seed', s.seed_number, s.known_text, s.target_text);
      for (const l of s.legos) {
        add('lego', l.lego_id, l.known_text, l.target_text);
        for (const k of l.components || []) add('comp', l.lego_id, k.known || '', k.target || '');
        for (const p of l.basket_phrases || []) add('phrase', p.id, p.known_text, p.target_text);
      }
    }
    require('fs').writeFileSync(`${__dirname}/${c}.census.json`, JSON.stringify(rows, null, 1));
    console.log(c, rows.length);
  }
})();
