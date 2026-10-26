#!/usr/bin/env node
'use strict';
// Aran 2026-10-26 (job #105). A) 'yfed heb siwgr' -> 'yfed coffi heb siwgr' (EN 'drink without sugar' -> 'drink coffee without sugar');
// B) Jane -> Siân in English and Welsh. Popty edit-batch only; dry run unless --apply. Clips are NOT relabelled: the spoken words change,
// so the old takes must stay labelled with what they say and surface on the Re-record card (text_changed).
const fs = require('fs');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-105';
const COURSES = ['cym_nv2_for_eng', 'cym_sv2_for_eng'];
const apply = process.argv.includes('--apply');
const out = __dirname;
const A_RX = /yfed heb siwgr/, A_EN = /drink without sugar/;
const J_RX = /Jane/;
const fixA = (t) => t.replace(/yfed heb siwgr/g, 'yfed coffi heb siwgr').replace(/drink without sugar/g, 'drink coffee without sugar');
const fixJ = (t) => t.replace(/Jane/g, 'Siân');
const deepJ = (v) => (v == null ? v : JSON.parse(fixJ(JSON.stringify(v))));
const decA = (dec) => { // insert a ghost 'coffi' segment between 'yfed' and 'heb siwgr'
  const d = []; for (const seg of dec || []) {
    d.push(seg);
    if (seg.target && seg.target.trim() === 'yfed') d.push({ known: 'coffee', legoId: null, target: ' coffi', isGhost: true });
  } return d;
};
const fix = (t) => fixJ(fixA(t));
const needs = (t, k) => A_RX.test(t || '') || A_EN.test(k || '') || J_RX.test(t || '') || J_RX.test(k || '');
(async () => {
  for (const c of COURSES) {
    const data = await (await fetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: { 'x-agent-id': AGENT } })).json();
    const ops = [], changed = [], leftAlone = [];
    const takes = (r) => [r.target1_audio_id, r.target2_audio_id].filter(Boolean);
    for (const s of data.seeds) {
      if (needs(s.target_text, s.known_text)) {
        ops.push({ op: 'seed.update', seed_number: s.seed_number, set: { target_text: fix(s.target_text), known_text: fix(s.known_text) }, expect: { target_text: s.target_text, known_text: s.known_text } });
        changed.push({ kind: 'seed', id: s.seed_number, old: s.target_text, new: fix(s.target_text), oldK: s.known_text, newK: fix(s.known_text), takes: takes(s) });
      }
      for (const l of s.legos) {
        if (needs(l.target_text, l.known_text) || J_RX.test(JSON.stringify(l.components || []))) {
          if (!l.is_new) { leftAlone.push({ kind: 'lego(ref)', id: l.lego_id, text: l.target_text }); }
          else {
            const set = { target_text: fix(l.target_text), known_text: fix(l.known_text), components: deepJ(l.components) };
            if (l.known_gloss_segments && J_RX.test(JSON.stringify(l.known_gloss_segments))) set.known_gloss_segments = deepJ(l.known_gloss_segments);
            ops.push({ op: 'lego.update', lego_id: l.lego_id, set, expect: { target_text: l.target_text, known_text: l.known_text, components: l.components } });
            changed.push({ kind: 'lego', id: l.lego_id, old: l.target_text, new: set.target_text, oldK: l.known_text, newK: set.known_text, takes: takes(l) });
          }
        }
        for (const p of l.basket_phrases || []) {
          if (!needs(p.target_text, p.known_text)) continue;
          let dec = p.decomposition;
          if (A_RX.test(p.target_text)) dec = decA(dec);
          dec = deepJ(dec);
          const set = { target_text: fix(p.target_text), known_text: fix(p.known_text), decomposition: dec };
          if (p.known_gloss_segments && J_RX.test(JSON.stringify(p.known_gloss_segments))) set.known_gloss_segments = deepJ(p.known_gloss_segments);
          ops.push({ op: 'phrase.update', phrase_id: p.id, set, expect: { target_text: p.target_text, known_text: p.known_text, decomposition: p.decomposition } });
          changed.push({ kind: 'phrase', id: p.id, old: p.target_text, new: set.target_text, oldK: p.known_text, newK: set.known_text, takes: [p.known_audio_id, p.target1_audio_id, p.target2_audio_id].filter(Boolean) });
        }
      }
    }
    fs.writeFileSync(`${out}/${c}.ops.json`, JSON.stringify({ ops, changed, leftAlone }, null, 1));
    const by = {}; changed.forEach((x) => (by[x.kind] = (by[x.kind] || 0) + 1));
    console.log(c, 'ops', ops.length, JSON.stringify(by), 'leftAlone', JSON.stringify(leftAlone));
    if (!ops.length) continue;
    const r = await (await fetch(`${BASE}/api/production/${c}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ ops, apply }) })).json();
    fs.writeFileSync(`${out}/${c}.${apply ? 'applied' : 'dryrun'}.json`, JSON.stringify(r, null, 1));
    console.log(JSON.stringify({ ok: r.ok, code: r.code, error: r.error, applied: r.applied, n: (r.results || []).length }).slice(0, 600));
  }
})().catch((e) => { console.error(e); process.exit(1); });
