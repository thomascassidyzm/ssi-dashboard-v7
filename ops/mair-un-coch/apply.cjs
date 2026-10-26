#!/usr/bin/env node
'use strict';
// Aran 2026-10-26 (job #107), cym_nv2_for_eng only (South is listed, never edited).
// EDIT 1: 'ddudon nhw yr un coch ydy o' -> 'ddudon nhw mai’r un coch ydy o'.
// EDIT 2: 'mai’r un coch' with no 'ydy o' after it -> 'mai’r un coch ydy o' (LEGO S1641L02, its components, its phrases).
// Through Popty only; dry run unless --apply.
const fs = require('fs');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-107';
const C = 'cym_nv2_for_eng';
const E1 = /ddudon nhw yr un coch ydy o/;
const E1S = (t) => t.replace('ddudon nhw yr un coch ydy o', 'ddudon nhw mai’r un coch ydy o');
const E2 = /mai’r un coch(?! ydy o)/;
const E2S = (t) => t.replace(/mai’r un coch(?! ydy o)/g, 'mai’r un coch ydy o');
const apply = process.argv.includes('--apply');
(async () => {
  const data = await (await fetch(`${BASE}/api/production/${C}/seeds?status=all`, { headers: { 'x-agent-id': AGENT } })).json();
  const ops = []; const changed = [];
  for (const s of data.seeds) for (const l of s.legos) {
    if (l.is_new && E2.test(l.target_text)) {
      const comps = [...(l.components || []), { known: 'it is', target: 'ydy o' }];
      ops.push({ op: 'lego.update', lego_id: l.lego_id, set: { target_text: E2S(l.target_text), components: comps }, expect: { target_text: l.target_text, components: l.components } });
      changed.push({ kind: 'lego', id: l.lego_id, old: l.target_text, new: E2S(l.target_text) });
    }
    for (const p of l.basket_phrases || []) {
      const fix = E1.test(p.target_text) ? E1S : E2.test(p.target_text) ? E2S : null;
      if (!fix) continue;
      // segments: fix the one text the same way; a segment that is only the tail 'mai’r un coch' gets the same suffix
      const dec = (p.decomposition || []).map((g) => (g.target && (E1.test(g.target) || E2.test(g.target)) ? { ...g, target: (E1.test(g.target) ? E1S : E2S)(g.target) } : g));
      // E1 phrases carry the frame in a ' yr un coch ydy o' segment
      const dec1 = fix === E1S ? (p.decomposition || []).map((g) => (g.legoId === 'S1640L01' && / yr un coch ydy o$/.test(g.target) ? { ...g, target: g.target.replace('yr un coch', 'mai’r un coch') } : g)) : dec;
      const nt = fix(p.target_text);
      ops.push({ op: 'phrase.update', phrase_id: p.id, set: { target_text: nt, decomposition: dec1 }, expect: { target_text: p.target_text, decomposition: p.decomposition } });
      changed.push({ kind: 'phrase', id: p.id, old: p.target_text, new: nt, takes: [p.target1_audio_id, p.target2_audio_id].filter(Boolean) });
    }
  }
  fs.writeFileSync(`${C}.ops.json`, JSON.stringify({ ops, changed }, null, 1));
  console.log('ops', ops.length); changed.forEach((c) => console.log(c.kind, c.id, '|', c.old, '->', c.new));
  const r = await (await fetch(`${BASE}/api/production/${C}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ ops, apply }) })).json();
  fs.writeFileSync(`${C}.${apply ? 'applied' : 'dryrun'}.json`, JSON.stringify(r, null, 1));
  console.log(JSON.stringify(r).slice(0, 1500));
})().catch((e) => { console.error(e); process.exit(1); });
