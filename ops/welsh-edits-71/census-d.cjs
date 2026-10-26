#!/usr/bin/env node
'use strict';
// Job #71 edit D census (READ-ONLY, nothing edited): every row with 'ddim' followed by 'nunlle' within 6 words, grouped by shape.
const fs = require('fs');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const W = "(?:n?unll[ae]|n?unman)";
const RX = new RegExp("(^|[^\\p{L}])ddim(\\s+\\S+){0,5}?\\s+" + W + "(?![\\p{L}])", "iu");
const ANY = new RegExp("(^|[^\\p{L}])" + W + "(?![\\p{L}])", "iu");
const out = {};
(async () => {
  for (const c of ['cym_nv2_for_eng', 'cym_sv2_for_eng']) {
    const d = await (await fetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: { 'x-agent-id': 'aran-watson-71' } })).json();
    const rows = [];
    const add = (kind, id, t, k, a) => { if (!ANY.test(t)) return; rows.push({ kind, id: String(id), target: t, known: k, adjacent: new RegExp("ddim\\s+" + W, "iu").test(t), near: RX.test(t), t1: !!a?.target1_audio_id, t2: !!a?.target2_audio_id }); };
    for (const s of d.seeds) {
      add('seed', s.seed_number, s.target_text, s.known_text, s);
      for (const l of s.legos) { add(l.is_new ? 'lego' : 'lego_old', l.lego_id, l.target_text, l.known_text, l); (l.components || []).forEach((k, i) => add('comp', l.lego_id + '#' + i, k.target, k.known, null)); for (const p of l.basket_phrases || []) add('phrase', p.id, p.target_text, p.known_text, p); }
    }
    out[c] = rows;
  }
  fs.writeFileSync(__dirname + '/D.census.json', JSON.stringify(out, null, 1));
  for (const c in out) { console.log(c, 'rows with nunlle', out[c].length, 'ddim..nunlle', out[c].filter((r) => r.near).length, 'adjacent', out[c].filter((r) => r.adjacent).length); }
})();
