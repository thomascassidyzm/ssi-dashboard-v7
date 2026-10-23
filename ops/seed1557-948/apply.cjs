#!/usr/bin/env node
'use strict';
// Aran 2026-10-23 (job #948, follow-up to #946): English "I wish they wouldn't play" -> "I would like them not to play"
// on seed 1557, cym_nv2_for_eng + cym_sv2_for_eng (known text only; Welsh untouched). Through Popty edit-batch only.
// Dry run unless --apply. Writes <course>.ops.json (ops carry `expect` = old values, so the applied result's undo restores them).
const fs = require('fs');
const BASE = 'http://localhost:3470';
const AGENT = 'aran-watson-948';
const apply = process.argv.includes('--apply');
const Q = "[’']";
const fix = (t) => t
  .replace(/^if they didn[’']t play music$/, 'for them not to play music') // N B01: bare Welsh fragment, no 'it would be' to hang 'for' on
  .replace(new RegExp(`\\bI wish they wouldn${Q}t play\\b`, 'g'), 'I would like them not to play')
  .replace(new RegExp(`\\bif they wouldn${Q}t play\\b`, 'g'), 'for them not to play')
  .replace(new RegExp(`\\bthey wouldn${Q}t play\\b`, 'g'), 'them not to play')
  .replace(/\bI wish\b/g, 'I would like');
const fixCompKnown = { 'if they': 'them', 'not': 'not to' }; // North S1557L02 components
(async () => {
  for (const C of ['cym_nv2_for_eng', 'cym_sv2_for_eng']) {
    const data = await (await fetch(`${BASE}/api/production/${C}/seeds?status=all`, { headers: { 'x-agent-id': AGENT } })).json();
    const s = data.seeds.find((x) => x.seed_number === 1557);
    const ops = [], changed = [], left = [];
    const nk = fix(s.known_text);
    if (nk !== s.known_text) { ops.push({ op: 'seed.update', seed_number: 1557, set: { known_text: nk }, expect: { known_text: s.known_text } }); changed.push({ kind: 'seed', id: 1557, old: s.known_text, new: nk }); }
    for (const l of s.legos) {
      const north = C === 'cym_nv2_for_eng';
      if (/wish|wouldn/i.test(l.known_text) || (north && l.lego_id === 'S1557L02')) {
        const set = { known_text: fix(l.known_text) };
        if (north && l.lego_id === 'S1557L02') {
          set.known_text = 'them not to play';
          set.components = l.components.map((c) => ({ ...c, known: fixCompKnown[c.known] || c.known }));
        } else set.components = l.components.map((c) => ({ ...c, known: fix(c.known) }));
        ops.push({ op: 'lego.update', lego_id: l.lego_id, set, expect: { known_text: l.known_text, components: l.components } });
        changed.push({ kind: 'lego', id: l.lego_id, old: l.known_text, new: set.known_text });
      }
      for (const p of l.basket_phrases || []) {
        const set = {};
        if (p.id.endsWith('L02C01') && north) set.known_text = 'them';
        else if (p.id.endsWith('L02C02') && north) set.known_text = 'not to';
        else if (fix(p.known_text) !== p.known_text) set.known_text = fix(p.known_text);
        const dec = (p.decomposition || []).map((g) => (g.known && fix(g.known) !== g.known ? { ...g, known: fix(g.known) } : g));
        if (JSON.stringify(dec) !== JSON.stringify(p.decomposition || [])) set.decomposition = dec;
        if (!Object.keys(set).length) continue;
        const expect = {}; for (const k of Object.keys(set)) expect[k] = p[k];
        ops.push({ op: 'phrase.update', phrase_id: p.id, set, expect });
        changed.push({ kind: 'phrase', id: p.id, old: p.known_text, new: set.known_text || p.known_text, target: p.target_text });
      }
    }
    fs.writeFileSync(`${__dirname}/${C}.ops.json`, JSON.stringify({ ops, changed, left }, null, 1));
    console.log(C, 'ops', ops.length);
    for (const c of changed) console.log(' ', c.kind, c.id, '|', c.old, '=>', c.new);
    const r = await (await fetch(`${BASE}/api/production/${C}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ ops, apply }) })).json();
    fs.writeFileSync(`${__dirname}/${C}.${apply ? 'applied' : 'dryrun'}.json`, JSON.stringify(r, null, 1));
    console.log(JSON.stringify(r).slice(0, 1500));
  }
})().catch((e) => { console.error(e); process.exit(1); });
