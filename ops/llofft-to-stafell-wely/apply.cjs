#!/usr/bin/env node
'use strict';
// Aran 2026-10-26 (job #73): Welsh 'llofft' (bedroom) -> 'stafell wely' in cym_nv2/cym_sv2 (seeds, LEGOs, components, phrases). 's' does not soft-mutate, so only the noun changes.
// Census at write time: every hit is 'fy llofft' (my bedroom); no upstairs/loft sense. Any other llofft form is reported in leftAlone, never auto-changed.
// Reads/writes through Popty only. Dry run unless --apply.
const fs = require('fs');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-73';
const COURSES = ['cym_nv2_for_eng', 'cym_sv2_for_eng'];
const RX = /(^|[^\p{L}])ll?offt(?![\p{L}])/u;
const MUT = /(^|[^\p{L}])(ll?offt\p{L}+|nh?lofft\p{L}*)/u;
const fix = (t) => t.replace(/(^|[^\p{L}])ll?offt(?![\p{L}])/gu, '$1stafell wely');
const apply = process.argv.includes('--apply');
const out = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.';
(async () => {
  for (const c of COURSES) {
    const data = await (await fetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: { 'x-agent-id': AGENT } })).json();
    const ops = []; const changed = []; const leftAlone = [];
    for (const s of data.seeds) {
      if (MUT.test(s.target_text)) leftAlone.push({ kind: 'seed', id: s.seed_number, text: s.target_text });
      if (RX.test(s.target_text)) {
        ops.push({ op: 'seed.update', seed_number: s.seed_number, set: { target_text: fix(s.target_text) }, expect: { target_text: s.target_text } });
        changed.push({ kind: 'seed', id: s.seed_number, old: s.target_text, new: fix(s.target_text), takes: [s.target1_audio_id, s.target2_audio_id].filter(Boolean).length });
      }
      for (const l of s.legos) {
        if (MUT.test(l.target_text)) leftAlone.push({ kind: 'lego', id: l.lego_id, text: l.target_text });
        if (RX.test(l.target_text) && l.is_new) {
          const comps = (l.components || []).map((k) => (RX.test(k.target) ? { ...k, target: fix(k.target) } : k));
          ops.push({ op: 'lego.update', lego_id: l.lego_id, set: { target_text: fix(l.target_text), components: comps }, expect: { target_text: l.target_text, components: l.components } });
          changed.push({ kind: 'lego', id: l.lego_id, old: l.target_text, new: fix(l.target_text), takes: [l.target1_audio_id, l.target2_audio_id].filter(Boolean).length });
        }
        for (const p of l.basket_phrases || []) {
          if (MUT.test(p.target_text)) leftAlone.push({ kind: 'phrase', id: p.id, text: p.target_text });
          if (!RX.test(p.target_text)) continue;
          const dec = (p.decomposition || []).map((seg) => (seg.target && RX.test(seg.target) ? { ...seg, target: fix(seg.target) } : seg));
          ops.push({ op: 'phrase.update', phrase_id: p.id, set: { target_text: fix(p.target_text), decomposition: dec }, expect: { target_text: p.target_text, decomposition: p.decomposition } });
          changed.push({ kind: 'phrase', id: p.id, old: p.target_text, new: fix(p.target_text), takes: [p.target1_audio_id, p.target2_audio_id].filter(Boolean).length });
        }
      }
    }
    fs.writeFileSync(`${out}/${c}.ops.json`, JSON.stringify({ ops, changed, leftAlone }, null, 1));
    console.log(c, 'ops', ops.length, 'leftAlone', leftAlone.length);
    if (!ops.length) continue;
    const r = await (await fetch(`${BASE}/api/production/${c}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ ops, apply }) })).json();
    fs.writeFileSync(`${out}/${c}.${apply ? 'applied' : 'dryrun'}.json`, JSON.stringify(r, null, 1));
    console.log(JSON.stringify(r).slice(0, 800));
  }
})().catch((e) => { console.error(e); process.exit(1); });
