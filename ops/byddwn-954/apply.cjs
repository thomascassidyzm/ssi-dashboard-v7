#!/usr/bin/env node
'use strict';
// Aran 2026-10-23 (job #954): English 'we meet' -> 'we will meet' (or "we'll meet" where the row already contracts) for Welsh
// byddwn ni'n cyfarfod / cwrdd in cym_nv2/sv2_for_eng. Known text only; Welsh untouched. Dry run unless --apply.
// Left alone on purpose: 'next time we meet' and 'if we meet' rows (present tense is required English after 'next time'/'if').
const fs = require('fs');
const BASE = 'http://localhost:3470';
const AGENT = 'aran-watson-954';
const apply = process.argv.includes('--apply');
const SUB = /\b(next time|if|when)\b/i; // subordinate clause: 'will' would be ungrammatical
const RX = /\b[bf]yddwn\s+ni\b/i;
const fix = (t) => t.replace(/\bwe meet\b/g, /[’']/.test(t) ? 'we’ll meet' : 'we will meet');
(async () => {
  for (const C of ['cym_nv2_for_eng', 'cym_sv2_for_eng']) {
    const data = await (await fetch(`${BASE}/api/production/${C}/seeds?status=all`, { headers: { 'x-agent-id': AGENT } })).json();
    const ops = [], changed = [], left = [];
    for (const s of data.seeds) {
      if (RX.test(s.target_text)) left.push({ kind: 'seed', id: s.seed_number, e: s.known_text, why: 'subordinate' });
      for (const l of s.legos) {
        if (RX.test(l.target_text) && /\bwe meet\b/.test(l.known_text)) {
          const nk = 'we will meet';
          ops.push({ op: 'lego.update', lego_id: l.lego_id, set: { known_text: nk }, expect: { known_text: l.known_text } });
          changed.push({ kind: 'lego', id: l.lego_id, w: l.target_text, old: l.known_text, new: nk });
        }
        for (const p of l.basket_phrases || []) {
          if (!RX.test(p.target_text) || !/\bwe meet\b/.test(p.known_text)) continue;
          if (SUB.test(p.known_text)) { left.push({ kind: 'phrase', id: p.id, w: p.target_text, e: p.known_text, why: 'subordinate (next time/if/when)' }); continue; }
          const nk = fix(p.known_text);
          const dec = (p.decomposition || []).map((g) => (g.known && /\bwe meet\b/.test(g.known) ? { ...g, known: g.known.replace(/\bwe meet\b/g, /we’ll meet/.test(nk) ? 'we’ll meet' : 'we will meet') } : g));
          const set = { known_text: nk };
          if (JSON.stringify(dec) !== JSON.stringify(p.decomposition || [])) set.decomposition = dec;
          const expect = {}; for (const k of Object.keys(set)) expect[k] = p[k];
          ops.push({ op: 'phrase.update', phrase_id: p.id, set, expect });
          changed.push({ kind: 'phrase', id: p.id, w: p.target_text, old: p.known_text, new: nk });
        }
      }
    }
    fs.writeFileSync(`${__dirname}/${C}.ops.json`, JSON.stringify({ ops, changed, left }, null, 1));
    console.log(C, 'ops', ops.length);
    for (const c of changed) console.log(' ', c.kind, c.id, '|', c.old, '=>', c.new);
    if (!ops.length) continue;
    const r = await (await fetch(`${BASE}/api/production/${C}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ ops, apply }) })).json();
    fs.writeFileSync(`${__dirname}/${C}.${apply ? 'applied' : 'dryrun'}.json`, JSON.stringify(r, null, 1));
    console.log(JSON.stringify(r).slice(0, 600));
  }
})().catch((e) => { console.error(e); process.exit(1); });
