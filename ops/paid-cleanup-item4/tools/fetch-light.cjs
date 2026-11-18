#!/usr/bin/env node
// fetch.sh's fallback when the whole-course read (GET /seeds, one statement) hits the DB statement timeout
// under load (18 Nov from 13:08Z, every course). Same output shape, built from small Popty reads:
//   GET /api/production/<course>/seed/S####/baskets   every seed: LEGO texts/type/is_new/components + every phrase's
//                                                    texts (no ids) -> taught vocab and course-wide ZUT stay complete
//   GET /api/production/<course>/lego/<id>/basket     full rows (id, audio, updated_at, event) for the LEGOs to edit
// usage: node fetch-light.cjs <course> [fromSeed toSeed]   (full rows for the scan's LEGOs, or every LEGO in the range)
// Limits, stated: a LEGO with no phrases at all is absent from the per-seed read (not-new repeats, already taught);
// text-only rows carry a synthetic id "<course>:~S####L##P##" and are never edited.
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const [course, fromS, toS] = process.argv.slice(2);
const H = { 'x-agent-id': 'cs-item4-filler' };
// Popty restarted itself several times on 18 Nov afternoon: a dropped socket or refused connection waits and retries
// (up to ~4 min) rather than killing a 15-minute read.
const get = async (u) => {
  for (let i = 0; i < 12; i++) {
    try { const r = await fetch(u, { headers: H }); if (r.ok) return r.json(); if (r.status === 404) return null; }
    catch (e) { /* restart in progress */ }
    await new Promise(z => setTimeout(z, 20000));
  }
  throw new Error(`GET ${u} failed 12 times`);
};
(async () => {
  const scan = L.scanRows(course);
  const want = new Set([...scan.keys()].map(k => k.slice(0, 8)));
  const lo = Number(fromS || 0), hi = Number(toS || 0);
  const seeds = [];
  for (let n = 1; n <= 700; n++) {
    const sid = `S${String(n).padStart(4, '0')}`;
    const d = await get(`http://localhost:3470/api/production/${course}/seed/${sid}/baskets`);
    if (!d) { if (n > 50 && !seeds.some(s => s.seed_number > n - 20)) break; continue; }
    const s = { seed_number: n, known_text: d.seed_pair.known, target_text: d.seed_pair.target, legos: [] };
    for (const [lid, b] of Object.entries(d.baskets)) {
      const l = { lego_id: lid, lego_index: Number(lid.slice(6)), seed_number: n, known_text: b.lego.known, target_text: b.lego.target,
        type: b.type, is_new: b.is_new, components: b.components, basket_phrases: [] };
      const full = want.has(lid) || (hi && n >= lo && n <= hi);
      if (full) {
        const fb = await get(`http://localhost:3470/api/production/${course}/lego/${lid}/basket`);
        l.basket_phrases = (fb && fb.phrases) || [];
      } else {
        l.basket_phrases = b.practice_phrases.map(p => ({ id: `${course}:~${lid}P${String(p.position).padStart(2, '0')}`, position: p.position,
          known_text: p.known, target_text: p.target, phrase_role: 'unknown', updated_at: '' }));
      }
      s.legos.push(l);
    }
    seeds.push(s);
  }
  fs.mkdirSync(L.LIVE_DIR, { recursive: true });
  fs.writeFileSync(path.join(L.LIVE_DIR, `${course}.json`), JSON.stringify({ courseCode: course, count: seeds.length, light: true, at: new Date().toISOString(), seeds }));
  console.log(`${course}: ${seeds.length} seeds (light fetch), full rows for ${seeds.reduce((a, s) => a + s.legos.filter(l => !String((l.basket_phrases[0] || {}).id || '').includes(':~')).length, 0)} LEGOs`);
})();
