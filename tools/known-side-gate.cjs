#!/usr/bin/env node
/**
 * Both-sides tiling gate (CLI) — KNOWN-side reconstructability, round-indexed.
 * Thin wrapper over the pure checkKnownSide in services/course-builder/lib/validation.cjs
 * (one implementation, shared with generation which indexes by SEED instead of round).
 *
 * Usage: node tools/known-side-gate.cjs <phrases.json> [order.json]
 *   phrases.json: [{ "r": <round>, "known": "...", "target": "..." }]
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const C = require('../docs/pair-contracts/zho_for_eng.contract.cjs');
const {
  checkKnownSide, compileKnownContract, stemKnownGloss, tokenizeKnown,
} = require('../services/course-builder/lib/validation.cjs');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

// Build a round-indexed ctx from an order file + the live lego glosses + the contract.
async function buildContext(orderPath) {
  const order = JSON.parse(fs.readFileSync(orderPath, 'utf8'));
  const legos = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('course_legos')
      .select('lego_id,target_text,known_text,components').eq('course_code', 'zho_for_eng').range(from, from + 999);
    if (error) throw new Error(error.message);
    legos.push(...data);
    if (data.length < 1000) break;
  }
  const byLego = new Map(legos.map((l) => [l.lego_id, l]));
  const stemFirstPos = new Map();
  const addStem = (s, r) => { const k = stemKnownGloss(s); if (!k) return; if (!stemFirstPos.has(k) || stemFirstPos.get(k) > r) stemFirstPos.set(k, r); };
  for (const o of order) {
    const l = byLego.get(o.lego_id); if (!l) continue;
    for (const t of tokenizeKnown(l.known_text)) addStem(t, o.round);
    for (const c of l.components || []) for (const t of tokenizeKnown(c.known)) addStem(t, o.round);
  }
  for (const [carrier, syns] of Object.entries(C.glossSynonyms || {})) {
    const o = order.find((x) => byLego.get(x.lego_id)?.target_text === carrier);
    if (o) for (const syn of syns) addStem(syn, o.round);
  }
  const carrierRound = (carrier) => {
    let min = Infinity;
    for (const o of order) {
      const l = byLego.get(o.lego_id); if (!l) continue;
      const hit = l.target_text === carrier || (l.components || []).some(c => c.target === carrier);
      if (hit && o.round < min) min = o.round;
    }
    return min;
  };
  const consPos = {};
  for (const con of C.constructions) consPos[con.id] = con.cluster ? (C.clusterRounds[con.cluster] ?? Infinity) : carrierRound(con.carrier);
  const unitPos = (C.glossUnits || []).map((u) => ({ phrase: u.phrase, pos: carrierRound(u.carrier) }));
  return { ...compileKnownContract(C), stemFirstPos, consPos, unitPos };
}

if (require.main === module) {
  (async () => {
    const phrasesPath = process.argv[2];
    const orderPath = process.argv[3] || 'scripts/zho-course-order-FINAL.json';
    const ctx = await buildContext(orderPath);
    const phrases = JSON.parse(fs.readFileSync(phrasesPath, 'utf8'));
    let pass = 0, fail = 0;
    for (const p of phrases) {
      const probs = checkKnownSide(p.known, p.r ?? p.round, ctx);
      if (probs.length) { fail++; console.log(`✗ R${p.r ?? p.round} "${p.known}" → ${p.target}\n      ${probs.join('; ')}`); }
      else pass++;
    }
    console.log(`\nknown-side: ${pass} pass / ${fail} flagged of ${phrases.length}`);
    process.exit(fail ? 1 : 0);
  })();
}

module.exports = { buildContext };
