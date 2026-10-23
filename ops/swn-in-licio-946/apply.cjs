#!/usr/bin/env node
'use strict';
// Aran 2026-10-23 (job #946): English 'I wish' -> 'I would like' where Welsh is ’swn i’n licio, cym_nv2_for_eng (known text only).
// Seed 1557's 'I wish they wouldn't play' rows (’swn i’n licio tasen nhw ddim…) are NOT touched: they are a real wish structure, reported to Aran.
// Reads/writes through Popty only. Dry run unless --apply.
const fs = require('fs');
const BASE = 'http://localhost:3470';
const AGENT = 'aran-watson-946';
const C = 'cym_nv2_for_eng';
const SKIP = /wouldn[’']t/i;
const fix = (t) => t.replace(/\bI wish\b/g, 'I would like');
const apply = process.argv.includes('--apply');
const out = __dirname;
(async () => {
  const data = await (await fetch(`${BASE}/api/production/${C}/seeds?status=all`, { headers: { 'x-agent-id': AGENT } })).json();
  const ops = [], changed = [], left = [];
  for (const s of data.seeds) for (const l of s.legos) {
    if (l.lego_id === 'S1557L01') {
      ops.push({ op: 'lego.update', lego_id: l.lego_id, set: { known_text: fix(l.known_text) }, expect: { known_text: l.known_text } });
      changed.push({ kind: 'lego', id: l.lego_id, old: l.known_text, new: fix(l.known_text) });
    }
    for (const p of l.basket_phrases || []) {
      const hit = /\bwish\b/i.test(p.known_text) || (p.decomposition || []).some((g) => /\bwish\b/i.test(g.known || ''));
      if (!hit) continue;
      if (SKIP.test(p.known_text)) { left.push({ id: p.id, known: p.known_text, target: p.target_text }); continue; }
      const dec = (p.decomposition || []).map((g) => (g.known ? { ...g, known: fix(g.known) } : g));
      ops.push({ op: 'phrase.update', phrase_id: p.id, set: { known_text: fix(p.known_text), decomposition: dec }, expect: { known_text: p.known_text, decomposition: p.decomposition } });
      changed.push({ kind: 'phrase', id: p.id, old: p.known_text, new: fix(p.known_text), target: p.target_text });
    }
  }
  fs.writeFileSync(`${out}/${C}.ops.json`, JSON.stringify({ ops, changed, left }, null, 1));
  console.log('ops', ops.length, 'left', left.length);
  const r = await (await fetch(`${BASE}/api/production/${C}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ ops, apply }) })).json();
  fs.writeFileSync(`${out}/${C}.${apply ? 'applied' : 'dryrun'}.json`, JSON.stringify(r, null, 1));
  console.log(JSON.stringify(r).slice(0, 1200));
})().catch((e) => { console.error(e); process.exit(1); });
