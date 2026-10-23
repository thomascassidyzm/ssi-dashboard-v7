#!/usr/bin/env node
'use strict';
// Aran 2026-10-23 (job #878): 'ar ôl rhan gynta' -> 'ar ôl y rhan gynta' in cym_nv2_for_eng (LEGO S1494L03 + its phrases).
// Only rows where 'ar ôl rhan gynt(a|af)' is NOT followed by a definite genitive (y sioe, ei llyfr ...) change.
// Reads/writes through Popty only. Dry run unless --apply. Every op carries `expect` on the old text.
const fs = require('fs');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-878';
const COURSES = ['cym_nv2_for_eng', 'cym_sv2_for_eng'];
const RX = /ar ôl rhan (gynta’|gyntaf)(?!\s+(y |yr |’r |ei |eu |ein |fy |ein ))/;
const fix = (t) => t.replace(/ar ôl rhan (gynta’|gyntaf)/g, 'ar ôl y rhan $1');
const apply = process.argv.includes('--apply');
const out = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.';
(async () => {
  for (const c of COURSES) {
    const data = await (await fetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: { 'x-agent-id': AGENT } })).json();
    const ops = []; const changed = [];
    const add = (o) => { ops.push(o); };
    for (const s of data.seeds) {
      if (RX.test(s.target_text)) add({ op: 'seed.update', seed_number: s.seed_number, set: { target_text: fix(s.target_text) }, expect: { target_text: s.target_text } });
      for (const l of s.legos) {
        if (RX.test(l.target_text)) {
          const comps = JSON.parse(JSON.stringify(l.components));
          if (comps[0].target === 'ar ôl' && comps[0].known === 'after') { comps[0] = { known: 'after the', target: 'ar ôl y' }; }
          add({ op: 'lego.update', lego_id: l.lego_id, set: { target_text: fix(l.target_text), components: comps }, expect: { target_text: l.target_text, components: l.components } });
          changed.push({ kind: 'lego', id: l.lego_id, old: l.target_text, new: fix(l.target_text), takes: [l.target1_audio_id, l.target2_audio_id].filter(Boolean).length });
        }
        for (const p of l.basket_phrases || []) {
          if (!RX.test(p.target_text)) continue;
          const dec = (p.decomposition || []).map((seg) => (seg.target && RX.test(seg.target) ? { ...seg, target: fix(seg.target) } : seg));
          const set = { target_text: fix(p.target_text), decomposition: dec };
          const expect = { target_text: p.target_text, decomposition: p.decomposition };
          add({ op: 'phrase.update', phrase_id: p.id, set, expect });
          changed.push({ kind: 'phrase', id: p.id, old: p.target_text, new: set.target_text, takes: [p.target1_audio_id, p.target2_audio_id].filter(Boolean).length });
        }
      }
    }
    fs.writeFileSync(`${out}/${c}.ops.json`, JSON.stringify({ ops, changed }, null, 1));
    console.log(c, 'ops', ops.length);
    if (!ops.length) continue;
    const r = await (await fetch(`${BASE}/api/production/${c}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ ops, apply }) })).json();
    fs.writeFileSync(`${out}/${c}.${apply ? 'applied' : 'dryrun'}.json`, JSON.stringify(r, null, 1));
    console.log(JSON.stringify(r).slice(0, 1500));
  }
})().catch((e) => { console.error(e); process.exit(1); });
