#!/usr/bin/env node
// Item 20 resume (cs #740·AI): price the plan OFFLINE from the nightly QA copy, because bulk dry runs are refused on live
// (services/shared/agent-rate-cap.cjs: 100 dry-run calls/hour, BULK_DRY_RUN_ON_LIVE; Tom 2026-11-05). Reads only the #717
// QA-copy snapshots (~/ssi-evidence/.../paid-cleanup-717/snap/*.json, copy ssi_copy_20261118t033000z) and the plan ops.
// The route's own answers on 97 live dry runs (audio/price-cache.json, cs #740·AI) fix the rules this applies:
//   English (target1 / target2): words already recorded anywhere in English -> 0 chars (library hit in the cast voice, or
//     EXISTS_IN_LANGUAGE = link that existing clip, free); words never recorded -> rendered in BOTH slots
//     (Charlotte + Tom-006, Cartesia) = 2 x length. A line paid once is free for the other four courses (charged to the first).
//   known: words already recorded in the course's own language -> 0; else 1 x length in the course's cast known voice
//     (eng_for_ben: Cartesia Pooja; urd/pan/mar/guj: Azure, not on Kai's Cartesia budget).
// It then checks itself against every live answer in price-cache.json and prints the disagreements.
// usage: node estimate.cjs  -> ../audio/estimate.json
const fs = require('fs'); const path = require('path'); const os = require('os');
const L = require('./lib.cjs');
const COURSES = ['eng_for_urd', 'eng_for_pan', 'eng_for_ben', 'eng_for_mar', 'eng_for_guj'];
const KNOWN_PROV = { eng_for_ben: 'cartesia' };
const SNAP = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-717/snap');
const n = (t) => String(t || '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}]+/gu, ' ').trim();
const clips = (f) => { const d = JSON.parse(fs.readFileSync(path.join(SNAP, f), 'utf8')); const c = d.clips; return Array.isArray(c) ? c : Object.values(c || {}); };
// English library: every recorded English text in the QA copy: target text with a target clip in eng_for_* courses, known
// text with a known clip in *_for_eng courses (the library is per language, any voice, any course). Known library per course:
// its own known texts that carry a known clip. Compared case- and punctuation-blind.
const en = new Set(); const knownLib = {};
const rowsOf = (d) => [...(d.seeds || []), ...(d.legos || []), ...(d.phrases || [])];
for (const f of fs.readdirSync(SNAP).filter(f => f.endsWith('.json'))) {
  const d = JSON.parse(fs.readFileSync(path.join(SNAP, f), 'utf8')); const code = f.replace('.json', '');
  for (const c of clips(f)) if ((/^eng_for_/.test(code) && /^target/.test(c.role)) || (/_for_eng$/.test(code) && c.role === 'known')) en.add(n(c.text));
  for (const r of rowsOf(d)) {
    if (/^eng_for_/.test(code) && (r.t1 || r.t2)) en.add(n(r.target_text));
    if (/_for_eng$/.test(code) && r.ka) en.add(n(r.known_text));
    if (COURSES.includes(code) && r.ka) (knownLib[code] ||= new Set()).add(n(r.known_text));
  }
}
for (const c of COURSES) knownLib[c] ||= new Set();
const paidEn = new Set(); const per = {}; const tot = { cartesia: 0, azure: 0 };
for (const c of COURSES) {
  const files = ['plan'].map(b => path.join(L.ITEM_DIR, c, 'batches', `${b}.ops.json`)).filter(f => fs.existsSync(f)); // plan.ops.json already carries the hand-written #718 probe seeds
  const s = per[c] = { rows: 0, en_free: 0, en_new: 0, known_free: 0, known_new: 0, cartesia: 0, azure: 0 };
  const seenK = new Set();
  for (const f of files) for (const o of JSON.parse(fs.readFileSync(f, 'utf8')).ops) {
    const row = o.op === 'phrase.insert' ? o.row : o.op === 'phrase.update' ? o.set : null; if (!row) continue;
    s.rows++;
    const e = n(row.target_text);
    if (en.has(e) || paidEn.has(e)) s.en_free++; else { paidEn.add(e); s.en_new++; s.cartesia += 2 * [...e].length; }
    const k = n(row.known_text);
    if (seenK.has(k) || knownLib[c].has(k)) s.known_free++; else { seenK.add(k); s.known_new++; s[KNOWN_PROV[c] || 'azure'] += [...k].length; }
  }
  tot.cartesia += s.cartesia; tot.azure += s.azure;
}
// Self-check against the live route's answers.
const cacheF = path.join(L.ITEM_DIR, 'audio', 'price-cache.json');
const disagree = []; let checked = 0;
if (fs.existsSync(cacheF)) for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(cacheF, 'utf8')))) {
  if (v.code === 'BULK_DRY_RUN_ON_LIVE') continue;
  const [c, role, , ...rest] = k.split('|'); const t = n(rest.join('|')); checked++;
  const liveFree = v.source === 'library' || v.code === 'EXISTS_IN_LANGUAGE';
  const offFree = role === 'known' ? knownLib[c].has(t) : en.has(t);
  if (liveFree !== offFree) disagree.push({ c, role, t, live: v.source || v.code, offline: offFree ? 'free' : 'render' });
}
const out = { at: new Date().toISOString(), qa_copy: 'ssi_copy_20261118t033000z', per_course: per, total: tot, self_check: { checked, disagree } };
fs.writeFileSync(path.join(L.ITEM_DIR, 'audio', 'estimate.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ per_course: per, total: tot, self_check: { checked, disagree: disagree.length } }, null, 1));
for (const d of disagree.slice(0, 10)) console.log('DISAGREE', JSON.stringify(d));
