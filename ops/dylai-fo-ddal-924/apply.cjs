#!/usr/bin/env node
'use strict';
// Aran 2026-10-23 (job #924): 'ddylai o ddal y drws ar agor' -> 'dylai fo ddal y drws ar agor' in cym_nv2_for_eng.
// One phrase (S1512L02B02) carries it. Through Popty edit-batch, expect on old text; dry run unless --apply.
const fs = require('fs');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const C = 'cym_nv2_for_eng';
const H = { 'content-type': 'application/json', 'x-agent-id': 'aran-watson-924' };
const apply = process.argv.includes('--apply');
const out = __dirname;
(async () => {
  const d = await (await fetch(`${BASE}/api/production/${C}/seeds?status=all`, { headers: H })).json();
  const p = d.seeds.find((s) => s.seed_number === 1512).legos.flatMap((l) => l.basket_phrases || []).find((x) => x.id === `${C}:S1512L02B02`);
  if (p.target_text !== 'ddylai o ddal y drws ar agor') throw new Error('drifted: ' + p.target_text);
  const dec = p.decomposition.map((s) => (s.target === 'ddylai' ? { ...s, target: 'dylai' } : s.target === ' o' ? { ...s, target: ' fo' } : s));
  const ops = [{ op: 'phrase.update', phrase_id: p.id, set: { target_text: 'dylai fo ddal y drws ar agor', decomposition: dec }, expect: { target_text: p.target_text, decomposition: p.decomposition } }];
  fs.writeFileSync(`${out}/ops.json`, JSON.stringify({ ops }, null, 1));
  const r = await (await fetch(`${BASE}/api/production/${C}/edit-batch`, { method: 'POST', headers: H, body: JSON.stringify({ ops, apply }) })).json();
  fs.writeFileSync(`${out}/${apply ? 'applied' : 'dryrun'}.json`, JSON.stringify(r, null, 1));
  console.log(JSON.stringify(r).slice(0, 1800));
})().catch((e) => { console.error(e); process.exit(1); });
