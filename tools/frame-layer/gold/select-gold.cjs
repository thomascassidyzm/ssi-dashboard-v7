#!/usr/bin/env node
/**
 * GOLD SELECTION: ~300 texts from the pool (sample-pool.cjs), two parts.
 *   RANDOM (~60%): the first texts of each course's md5-ordered draw, in
 *     proportion to sample-pool's PLAN. Unbiased: recall measured here is honest.
 *   ENRICHED (~40%): for the frames a random draw sees least often, extra
 *     texts a Haiku pre-pass tagged with that frame, so every frame has enough
 *     positives to measure. The pre-pass only CHOOSES rows; Opus adjudicates
 *     every row from the codex, blind to the pre-pass tags.
 * Usage: node select-gold.cjs pool.json > selection.json
 */
const fs = require('fs');
const T = require('../frame-tagger.cjs');
const { PLAN } = require('./sample-pool.cjs');

function select(pool, { randomShare = 0.6, total = 340, perFrameFloor = 12 } = {}) {
  const chosen = [];
  const seen = new Set();
  const add = (r, why) => { const k = T.keyOf(r.known_text); if (seen.has(k)) return false; seen.add(k); chosen.push({ ...r, selected: why }); return true; };
  const byCourse = {};
  for (const r of pool) (byCourse[r.course] ||= []).push(r);
  for (const [c, n] of Object.entries(PLAN)) {
    const quota = Math.round(n * randomShare);
    // kinds interleaved in pool order: phrases first, then seeds, then legos
    const rows = byCourse[c] || [];
    const phrases = rows.filter(r => r.kind === 'phrase'), others = rows.filter(r => r.kind !== 'phrase');
    const want = { other: Math.max(1, Math.round(quota * 0.15)) };
    others.slice(0, want.other).forEach(r => add(r, 'random'));
    phrases.slice(0, quota - want.other).forEach(r => add(r, 'random'));
  }
  const count = (id) => chosen.filter(r => (T.defaultCache().get(r.known_text) || { frames: [] }).frames.includes(id)).length;
  // enrich: rarest frame first, top each up to the floor, until the total is reached
  const tagged = (r, id) => (T.defaultCache().get(r.known_text) || { frames: [] }).frames.includes(id);
  // round-robin across courses so enrichment draws from every known language, not the first course listed
  const lanes = Object.values(byCourse); const mixed = [];
  for (let i = 0; mixed.length < pool.length; i++) for (const l of lanes) if (l[i]) mixed.push(l[i]);
  for (const id of [...T.FRAME_IDS].sort((a, b) => count(a) - count(b))) {
    for (const cand of mixed) {
      if (chosen.length >= total || count(id) >= perFrameFloor) break;
      if (tagged(cand, id)) add(cand, 'enriched:' + id);
    }
  }
  return chosen;
}

if (require.main === module) {
  const pool = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const sel = select(pool);
  process.stdout.write(JSON.stringify(sel.map((r, i) => ({ gid: `G${String(i + 1).padStart(3, '0')}`, ...r })), null, 1));
}
module.exports = { select };
