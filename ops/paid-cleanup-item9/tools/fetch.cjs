#!/usr/bin/env node
// Read one course LIVE through Popty's own read routes, in the shape fetch.sh writes
// (GET /api/production/<c>/seeds), for courses where that whole-course read hits the 8 s
// statement cap (most of them on 18 Nov). No DB code of ours.
//   1. GET /api/production/<c>/script-view in 50-seed windows: every seed, LEGO (is_new, type,
//      index), component and BUILD/USE row (id, role, position, words) — enough for vocab and ZUT.
//   2. GET /api/production/<c>/lego/<lego_id>/basket for every LEGO of the DEEP seeds (the seeds
//      you are about to plan or edit): the full rows, with updated_at, last_edit_event_id and
//      audio ids, which build.cjs's collision rules need.
// usage: node fetch.cjs <course> [deepSeeds: "71,72,100-110" | "all"]
// writes ~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item9/live/<course>.json (+ "partial_rows": true
// on LEGOs whose rows came from script-view only)
const fs = require('fs');
const path = require('path');
const os = require('os');
const [course, deepArg = ''] = process.argv.slice(2);
const BASE = 'http://localhost:3470';
const H = { 'x-agent-id': 'cs-713-item9' };
const LIVE = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item9/live');
const deep = new Set();
let deepAll = deepArg === 'all';
if (!deepAll) for (const part of deepArg.split(',').filter(Boolean)) {
  const [a, b] = part.split('-').map(Number);
  for (let n = a; n <= (b || a); n++) deep.add(n);
}
const get = async (url) => {
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch(url, { headers: H }); const j = await r.json(); if (r.ok) return j; if (i === 3) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 200)}`); }
    catch (e) { if (i === 3) throw e; }
    await new Promise(res => setTimeout(res, 3000 * (i + 1)));
  }
};
(async () => {
  const seeds = [];
  for (let a = 1; a < 2000; a += 50) {
    const d = await get(`${BASE}/api/production/${course}/script-view?seedStart=S${String(a).padStart(4, '0')}&seedEnd=S${String(a + 49).padStart(4, '0')}`);
    for (const s of d.seeds || []) {
      seeds.push({ seed_number: s.seed_number, known_text: s.known_text, target_text: s.target_text, status: s.status,
        legos: (s.legos || []).map(l => ({ lego_id: l.lego_id, lego_index: l.lego_index, type: l.type, is_new: l.is_new,
          known_text: l.known_text, target_text: l.target_text, partial_rows: true,
          components: (l.phrases || []).filter(p => p.type === 'component').map(p => ({ known: p.known_text, target: p.target_text })),
          basket_phrases: (l.phrases || []).filter(p => p.type !== 'lego_debut').map(p => ({ id: p.id, phrase_role: p.type, position: p.position,
            known_text: p.known_text, target_text: p.target_text, target1_audio_id: p.target1_audio_uuid || null, known_audio_id: p.known_audio_uuid || null })) })) });
    }
    if (!d.pagination || d.pagination.seedEnd >= d.pagination.total || !(d.seeds || []).length) break;
  }
  let deepN = 0;
  for (const s of seeds) {
    if (!deepAll && !deep.has(s.seed_number)) continue;
    for (const l of s.legos) {
      const b = await get(`${BASE}/api/production/${course}/lego/${l.lego_id}/basket`);
      l.basket_phrases = b.phrases || [];
      l.partial_rows = false; deepN++;
    }
  }
  fs.mkdirSync(LIVE, { recursive: true });
  const f = path.join(LIVE, `${course}.json`);
  fs.writeFileSync(f + '.tmp', JSON.stringify({ courseCode: course, fetched_at: new Date().toISOString(), via: 'script-view+basket', count: seeds.length, seeds }));
  fs.renameSync(f + '.tmp', f);
  console.log(`${course}: ${seeds.length} seeds, ${deepN} LEGOs read in full -> ${f}`);
})().catch(e => { console.error(course, 'FAILED', e.message); process.exit(1); });
