#!/usr/bin/env node
'use strict';
// dull-pryd-scan.cjs — read-only scan for Aran's 2026-10-22 rulings (job #203): Welsh 'dull' rendered
// 'approach' on the known side, and 'pryd bwyd' → 'pryd o fwyd' on the target side.
//   node dull-pryd-scan.cjs <course> <outfile>
// Reads ONLY through Popty's GET routes (legos list, per-seed baskets, per-LEGO basket), one request at a time,
// because the whole-course tree times out. Writes candidate rows (seed / lego / phrase) with ids and audio ids.
const fs = require('fs');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const H = { 'x-agent-id': 'aran-ruling-dull-is-method' };
const DULL_T = /(^|[^\p{L}])(d|dd|n)?dull(iau)?(?![\p{L}])/iu;
const APPR_K = /approach/i;
const PRYD_T = /(^|[^\p{L}])(p|b|mh|ph)?ryd(au)?(?![\p{L}])|(^|[^\p{L}])(p|b|mh|ph)ryd/iu;
const PRYD_T2 = /[bfm]wyd/i; // any target row that says 'food' — filtered to pryd-bwyd shapes by eye/in the apply step
const hit = (k, t) => ({ dull: DULL_T.test(t || '') || APPR_K.test(k || ''), pryd: PRYD_T2.test(t || '') });
async function get(p) {
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch(BASE + p, { headers: H }); if (r.ok) return await r.json(); if (r.status === 404) throw new Error('404 ' + p); } catch (e) { if (/^404/.test(e.message)) throw e; }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error('GET failed ' + p);
}
(async () => {
  const [course, out] = process.argv.slice(2);
  const legos = (await get(`/api/production/${course}/legos`)).legos;
  const stats = (await get(`/api/production/${course}/stats`)).stats;
  const res = { course, seeds: [], legos: [], phrases: [] };
  for (const l of legos) if (hit(l.known_text, l.target_text).dull || hit(l.known_text, l.target_text).pryd) res.legos.push(l);
  const seedsWith = new Set();
  // seeds past the last LEGO exist as bare seed rows, so walk every number (a 404 is a fast miss)
  const seedNums = Array.from({ length: 1200 }, (_, i) => i + 1);
  for (const n of seedNums) {
    let b;
    try { b = await get(`/api/production/${course}/seed/S${String(n).padStart(4, '0')}/baskets`); } catch (e) { continue; }
    const sp = b.seed_pair || {};
    if (hit(sp.known, sp.target).dull || hit(sp.known, sp.target).pryd) res.seeds.push({ seed_number: n, known: sp.known, target: sp.target });
    for (const [lid, bk] of Object.entries(b.baskets || {})) {
      for (const p of bk.practice_phrases || []) {
        const h = hit(p.known, p.target);
        if (h.dull || h.pryd) { seedsWith.add(lid); }
      }
    }
  }
  for (const lid of seedsWith) {
    const bk = await get(`/api/production/${course}/lego/${lid}/basket`);
    for (const p of bk.phrases) if (hit(p.known_text, p.target_text).dull || hit(p.known_text, p.target_text).pryd) res.phrases.push(p);
  }
  fs.writeFileSync(out, JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ course, seeds: res.seeds.length, legos: res.legos.length, phrases: res.phrases.length }));
})().catch((e) => { console.error(e); process.exit(1); });
