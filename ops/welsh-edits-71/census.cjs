#!/usr/bin/env node
'use strict';
// Job #71 census (read-only, via Popty): rows in cym_nv2/sv2 matching edits A-D. Writes census.json next to this file.
const fs = require('fs');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const PATS = {
  A: /(^|[^\p{L}])at\s+lle(?![\p{L}])/iu,
  Anear: /\bat\b.{0,3}\blle\b|\blle\b/iu,
  B: /(^|[^\p{L}])dorri\s+o(?![\p{L}])/iu,
  Bnear: /dorri\s/iu,
  C: /gr[eêé]t|bendigedig|(^|[^\p{L}])(fendigedig|pendigedig|mendigedig)/iu,
  D: /ddim\b.{0,40}\bnunlle/iu,
};
const out = {};
(async () => {
  for (const c of ['cym_nv2_for_eng', 'cym_sv2_for_eng']) {
    const d = await (await fetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: { 'x-agent-id': 'aran-watson-71' } })).json();
    const rows = []; 
    const add = (kind, id, target, known, a, extra = {}) => rows.push({ kind, id, target, known, t1: a?.target1_audio_id || null, t2: a?.target2_audio_id || null, ...extra });
    for (const s of d.seeds) {
      add('seed', s.seed_number, s.target_text, s.known_text, s);
      for (const l of s.legos) {
        add(l.is_new ? 'lego' : 'lego_old', l.lego_id, l.target_text, l.known_text, l);
        (l.components || []).forEach((k, i) => add('comp', l.lego_id + '#' + i, k.target, k.known, null, { legoNew: !!l.is_new }));
        for (const p of l.basket_phrases || []) add('phrase', p.id, p.target_text, p.known_text, p, { decomp: (p.decomposition || []).map((x) => x.target || '') });
      }
    }
    out[c] = { total: rows.length, rows: rows.filter((r) => Object.values(PATS).some((rx) => rx.test(r.target))) };
    console.log(c, 'rows scanned', rows.length, 'matching any', out[c].rows.length);
  }
  fs.writeFileSync(__dirname + '/census.json', JSON.stringify(out));
})();
