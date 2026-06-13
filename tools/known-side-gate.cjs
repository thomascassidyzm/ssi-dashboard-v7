#!/usr/bin/env node
/**
 * Both-sides tiling gate — adds KNOWN-side reconstructability to the existing
 * target-side checks. Principle 1 in full: a phrase must rebuild in BOTH languages.
 *
 * Known-side rule (pair-contract): every prompt composes from
 *   (a) known-glosses of LEGOs introduced by round R, +
 *   (b) the free class (glue words, -s/-ed/-ing inflection, NPI under negation), +
 *   (c) construction licenses whose carrier LEGO has debuted by R.
 * A construction matched but not yet licensed, or a residual content token with no
 * known-gloss, is a violation.
 *
 * Order-independent: carrier rounds are resolved from whatever order is supplied,
 * so this gate is valid under canon or any reorder.
 *
 * Usage: node tools/known-side-gate.cjs <phrases.json> [order.json]
 *   phrases.json: [{ "r": <round>, "known": "...", "target": "..." }]
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const C = require('../docs/pair-contracts/zho_for_eng.contract.cjs');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

function stem(tok) {
  let x = tok.toLowerCase().replace(/[^a-z']/g, '');
  if (!x) return '';
  for (const suf of ['ing', 'ed']) if (x.length > suf.length + 1 && x.endsWith(suf)) { x = x.slice(0, -suf.length); break; }
  for (const suf of ['s', 'e', 'd']) if (x.length > 2 && x.endsWith(suf)) { x = x.slice(0, -1); break; }
  return x;
}
const tokens = (s) => (s || '').toLowerCase().split(/[^a-z']+/).filter(Boolean);
const GLUE = new Set(C.freeGlue.map(stem));
const NPI = new Set(C.npiTokens.map(stem));
const NEG = new Set([...C.negationWords, ...C.negationWords.map(stem)]);
// grammar machinery tokens → governing construction id(s); covered iff a governor is active
const GRAMMAR = {
  do: ['do-support-q'], does: ['do-support-q'],
  been: ['have-you-been'], got: ['have-got'], going: ['going-to'],
  have: ['have-you-been', 'have-got', 'want-to-have'], "'ve": ['have-you-been', 'have-got', 'want-to-have'],
  ve: ['have-you-been', 'have-got', 'want-to-have'],
};

async function buildContext(orderPath) {
  const order = JSON.parse(fs.readFileSync(orderPath, 'utf8'));
  const posByLego = new Map(order.map((o) => [o.lego_id, o.round]));
  // fetch known glosses + components
  const legos = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('course_legos')
      .select('lego_id,target_text,known_text,components').eq('course_code', 'zho_for_eng').range(from, from + 999);
    if (error) throw new Error(error.message);
    legos.push(...data);
    if (data.length < 1000) break;
  }
  const byLego = new Map(legos.map((l) => [l.lego_id, l]));
  // round → cumulative set of available known-stems
  const stemFirstRound = new Map(); // stem → earliest round
  const addStem = (s, r) => { const k = stem(s); if (!k) return; if (!stemFirstRound.has(k) || stemFirstRound.get(k) > r) stemFirstRound.set(k, r); };
  for (const o of order) {
    const l = byLego.get(o.lego_id); if (!l) continue;
    for (const t of tokens(l.known_text)) addStem(t, o.round);
    for (const c of l.components || []) for (const t of tokens(c.known)) addStem(t, o.round);
  }
  // multi-gloss LEGOs (contract): register each synonym at its carrier's round
  for (const [carrier, syns] of Object.entries(C.glossSynonyms || {})) {
    const o = order.find((x) => byLego.get(x.lego_id)?.target_text === carrier);
    if (o) for (const syn of syns) addStem(syn, o.round);
  }
  // construction carrier rounds (min round of a lego whose target === carrier)
  const carrierRound = (carrier) => {
    let min = Infinity;
    for (const o of order) if (byLego.get(o.lego_id)?.target_text === carrier && o.round < min) min = o.round;
    return min;
  };
  const consRound = {};
  for (const con of C.constructions) {
    consRound[con.id] = con.cluster ? (C.clusterRounds[con.cluster] ?? Infinity) : carrierRound(con.carrier);
  }
  const unitRound = (C.glossUnits || []).map((u) => ({ ...u, round: carrierRound(u.carrier) }));
  return { stemFirstRound, consRound, unitRound };
}

function checkKnown(known, round, ctx) {
  const probs = [];
  const negated = ctx_negTest(known);
  // 1) full-pattern construction licenses
  for (const con of C.constructions) {
    if (con.test.test(known)) {
      const cr = ctx.consRound[con.id];
      if (cr == null || round < cr) probs.push(`construction '${con.id}' not licensed until R${cr === Infinity ? '∞' : cr}`);
    }
  }
  // 2) bound gloss-units (rule 3): mask matched span, check carrier available
  let masked = ' ' + known.toLowerCase() + ' ';
  for (const u of ctx.unitRound) {
    const re = new RegExp('\\b' + u.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
    if (re.test(masked)) {
      if (u.round == null || round < u.round) probs.push(`gloss-unit "${u.phrase}" not introduced until R${u.round === Infinity ? '∞' : u.round}`);
      masked = masked.replace(re, ' ');
    }
  }
  // 3) token coverage (on the masked remainder)
  for (const raw of tokens(masked)) {
    const s = stem(raw);
    if (!s) continue;
    if (GLUE.has(s)) continue;
    if (NEG.has(raw) || NEG.has(s)) { // negation words handled by the 'negation' construction check above
      const cr = ctx.consRound['negation'];
      if (cr == null || round < cr) probs.push(`negation "${raw}" not licensed until R${cr === Infinity ? '∞' : cr}`);
      continue;
    }
    if (NPI.has(s)) { if (negated) continue; probs.push(`NPI token "${raw}" without negation`); continue; }
    if (GRAMMAR[raw] || GRAMMAR[s]) {
      const govs = GRAMMAR[raw] || GRAMMAR[s];
      const ok = govs.some((g) => round >= (ctx.consRound[g] ?? Infinity));
      if (!ok) probs.push(`machinery "${raw}" needs ${govs.join('/')} (unlicensed)`);
      continue;
    }
    const fr = ctx.stemFirstRound.get(s);
    if (fr == null) probs.push(`unknown gloss "${raw}"`);
    else if (fr > round) probs.push(`gloss "${raw}" not introduced until R${fr}`);
  }
  return probs;
}
function ctx_negTest(s) { return C.negationMarkers.test(s); }

(async () => {
  const phrasesPath = process.argv[2];
  const orderPath = process.argv[3] || 'scripts/zho-course-order-FINAL.json';
  const ctx = await buildContext(orderPath);
  const phrases = JSON.parse(fs.readFileSync(phrasesPath, 'utf8'));
  let pass = 0, fail = 0;
  for (const p of phrases) {
    const probs = checkKnown(p.known, p.r ?? p.round, ctx);
    if (probs.length) { fail++; console.log(`✗ R${p.r ?? p.round} "${p.known}" → ${p.target}\n      ${probs.join('; ')}`); }
    else pass++;
  }
  console.log(`\nknown-side: ${pass} pass / ${fail} flagged of ${phrases.length}`);
  process.exit(fail ? 1 : 0);
})();
