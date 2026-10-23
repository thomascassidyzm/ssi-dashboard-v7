#!/usr/bin/env node
'use strict';
// Aran 2026-10-23 (job #932): a trailing tag ("wyt ti'n meddwl?") makes a statement a question, so its first word
// soft-mutates (byddan->fyddan, bydd->fydd, byddai'n->fyddai'n, daeth->ddaeth). Only the listed, unambiguous openers are
// edited; every other tag line is reported for Aran, never changed. Edits go through Popty edit-batch; dry run unless --apply.
// A plain text edit unlinks the old take, which puts it on the voice's Re-record card (spoken words changed).
const fs = require('fs');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-932';
const COURSES = ['cym_nv2_for_eng', 'cym_sv2_for_eng'];
const TAG = /^(.+\s)(wyt ti|dach chi|dych chi|ydych chi|ŷch chi)(’n|'n) (meddwl|credu)\s*\??$/;
const MUTATE = { 'byddai’n': 'fyddai’n', byddan: 'fyddan', bydd: 'fydd', daeth: 'ddaeth' };
const apply = process.argv.includes('--apply');
const out = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.';
const mut = (s) => s.replace(/^\s*(\S+)/, (m, w) => (MUTATE[w] ? m.replace(w, MUTATE[w]) : m));
(async () => {
  for (const c of COURSES) {
    const data = await (await fetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: { 'x-agent-id': AGENT } })).json();
    const ops = [], changed = [], leftForAran = [];
    for (const s of data.seeds) for (const l of s.legos) for (const p of l.basket_phrases || []) {
      if (!TAG.test(p.target_text.trim())) continue;
      const first = p.target_text.trim().split(/\s+/)[0];
      if (!MUTATE[first]) { leftForAran.push({ id: p.id, first, target: p.target_text, known: p.known_text }); continue; }
      const dec = (p.decomposition || []).slice(); let done = false;
      const nd = dec.map((seg) => (!done && seg.target && seg.target.trim().startsWith(first) ? (done = true, { ...seg, target: mut(seg.target) }) : seg));
      ops.push({ op: 'phrase.update', phrase_id: p.id, set: { target_text: mut(p.target_text), decomposition: nd }, expect: { target_text: p.target_text, decomposition: p.decomposition } });
      changed.push({ id: p.id, old: p.target_text, new: mut(p.target_text), known: p.known_text, takes: [p.target1_audio_id, p.target2_audio_id].filter(Boolean).length });
    }
    fs.writeFileSync(`${out}/${c}.ops.json`, JSON.stringify({ ops, changed, leftForAran }, null, 1));
    console.log(c, 'ops', ops.length, 'left', leftForAran.length);
    if (!ops.length) continue;
    const r = await (await fetch(`${BASE}/api/production/${c}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ ops, apply }) })).json();
    fs.writeFileSync(`${out}/${c}.${apply ? 'applied' : 'dryrun'}.json`, JSON.stringify(r, null, 1));
    console.log(JSON.stringify(r).slice(0, 600));
  }
})().catch((e) => { console.error(e); process.exit(1); });
