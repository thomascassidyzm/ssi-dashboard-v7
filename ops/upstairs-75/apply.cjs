#!/usr/bin/env node
'use strict';
// Aran 2026-10-26 (job #75): 'upstairs' = 'fyny grisiau' (North cym_nv2) / 'lan stâr' (South cym_sv2). Only rows whose ENGLISH says upstairs.
// Re-reads each course live at run time; expect{} aborts the batch on drift. Dry run unless --apply. Adapted from #34.
const fs = require('fs');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-75';
const RULES = {
  cym_nv2_for_eng: [/i fyny[’']r grisiau/g, 'fyny grisiau'],
  cym_sv2_for_eng: [/lan staer/g, 'lan stâr'],
};
const apply = process.argv.includes('--apply');
const out = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.';
const UP = /upstairs/i;
(async () => {
  for (const c of Object.keys(RULES)) {
    const [rx, to] = RULES[c];
    const fix = (t) => t.replace(rx, to);
    const has = (t) => !!t && (rx.lastIndex = 0, rx.test(t));
    const data = await (await fetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: { 'x-agent-id': AGENT } })).json();
    const ops = []; const changed = []; const leftAlone = [];
    for (const s of data.seeds) {
      if (UP.test(s.known_text)) {
        if (has(s.target_text)) {
          ops.push({ op: 'seed.update', seed_number: s.seed_number, set: { target_text: fix(s.target_text) }, expect: { target_text: s.target_text } });
          changed.push({ kind: 'seed', id: s.seed_number, old: s.target_text, new: fix(s.target_text), takes: [s.target1_audio_id, s.target2_audio_id].filter(Boolean).length });
        } else leftAlone.push({ kind: 'seed', id: s.seed_number, text: s.target_text, known: s.known_text });
      }
      for (const l of s.legos) {
        const compUp = (l.components || []).some((k) => UP.test(k.known));
        if (UP.test(l.known_text) || compUp) {
          if (has(l.target_text) || (l.components || []).some((k) => has(k.target))) {
            const comps = (l.components || []).map((k) => (has(k.target) ? { ...k, target: fix(k.target), known: k.known === 'up the stairs' ? 'upstairs' : k.known } : k));
            ops.push({ op: 'lego.update', lego_id: l.lego_id, set: { target_text: fix(l.target_text), components: comps }, expect: { target_text: l.target_text, components: l.components } });
            changed.push({ kind: 'lego', id: l.lego_id, old: l.target_text, new: fix(l.target_text), takes: [l.target1_audio_id, l.target2_audio_id].filter(Boolean).length });
          } else leftAlone.push({ kind: 'lego', id: l.lego_id, text: l.target_text, known: l.known_text });
        }
        for (const p of l.basket_phrases || []) {
          if (!UP.test(p.known_text)) continue;
          if (!has(p.target_text)) { leftAlone.push({ kind: 'phrase', id: p.id, text: p.target_text, known: p.known_text }); continue; }
          const dec = (p.decomposition || []).map((seg) => (seg.target && has(seg.target) ? { ...seg, target: fix(seg.target) } : seg));
          ops.push({ op: 'phrase.update', phrase_id: p.id, set: { target_text: fix(p.target_text), decomposition: dec }, expect: { target_text: p.target_text, decomposition: p.decomposition } });
          changed.push({ kind: 'phrase', id: p.id, old: p.target_text, new: fix(p.target_text), takes: [p.target1_audio_id, p.target2_audio_id].filter(Boolean).length });
        }
      }
    }
    fs.writeFileSync(`${out}/${c}.ops.json`, JSON.stringify({ ops, changed, leftAlone }, null, 1));
    console.log(c, 'ops', ops.length, 'leftAlone', JSON.stringify(leftAlone));
    if (!ops.length) continue;
    const r = await (await fetch(`${BASE}/api/production/${c}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ ops, apply }) })).json();
    fs.writeFileSync(`${out}/${c}.${apply ? 'applied' : 'dryrun'}.json`, JSON.stringify(r, null, 1));
    console.log(JSON.stringify(r).slice(0, 700));
  }
})().catch((e) => { console.error(e); process.exit(1); });
