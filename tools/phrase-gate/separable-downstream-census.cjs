#!/usr/bin/env node
/**
 * READ-ONLY census: for every separable verb in the deu_for_eng lexicon, where
 * it is introduced and how often it recurs AFTER that, split and joined, over
 * seeds + LEGOs + practice phrases. Calibrates the reader first — a zero from
 * a detector that has not been shown a known hit is a claim about the query,
 * not the corpus (job #511, 2026-09-21).
 *
 *   node tools/phrase-gate/separable-downstream-census.cjs [--verbs a,b,c]
 */
require('dotenv').config({ quiet: true });
const { supabase } = require('../../services/supabase-client.cjs');
const SV = require('../../services/course-builder/lib/separable-verbs.cjs');
const COURSE = 'deu_for_eng';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const CALIBRATION = [
  ['Ich rufe dich in drei oder vier Minuten zurück', 'zurückrufen', 'split'],   // seed 524
  ['er will später mit allen anderen zurückkommen', 'zurückkommen', 'joined'],  // seed 16
  ['die meisten Leute, die ich kenne, sehen gern fern', 'fernsehen', 'split'], // seed 288
  ['Ich habe nicht vor zu verlieren', 'vorhaben', 'split'],
  ['Ich habe angefangen', 'anfangen', 'joined'],
  ['Ich gehe an der Ecke nach Hause', null, null],                              // control: preposition, must NOT hit
];

async function range(table, sel, step) {
  const out = [];
  for (let lo = 1; lo <= 700; lo += step) {
    const { data, error } = await supabase.from(table).select(sel).eq('course_code', COURSE).gte('seed_number', lo).lt('seed_number', lo + step);
    if (error) throw new Error(`${table} ${lo}: ${error.message}`);
    out.push(...data); await sleep(120);
  }
  return out;
}

async function main() {
  let bad = 0;
  for (const [text, lemma, shape] of CALIBRATION) {
    const r = SV.separableVerbsIn(text);
    const ok = lemma ? r.some(x => x.lemma === lemma && x.realisation === shape) : r.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? 'CAL ok  ' : 'CAL FAIL'}  "${text}" → ${JSON.stringify(r.map(x => `${x.lemma}/${x.realisation}`))}`);
  }
  if (bad) { console.error('reader failed calibration — no census is trustworthy'); process.exit(1); }

  const seeds = await range('course_seeds', 'seed_number, target_text', 200);
  const legos = await range('course_legos', 'lego_id, seed_number, target_text', 100);
  const phrases = await range('course_practice_phrases', 'id, seed_number, target_text', 25);
  const rows = [
    ...seeds.map(s => ({ kind: 'seed', seed: s.seed_number, id: `S${s.seed_number}`, text: s.target_text })),
    ...legos.map(l => ({ kind: 'lego', seed: l.seed_number, id: l.lego_id, text: l.target_text })),
    ...phrases.map(p => ({ kind: 'phrase', seed: p.seed_number, id: p.id.replace(`${COURSE}:`, ''), text: p.target_text })),
  ];
  const only = (process.argv.find(a => a.startsWith('--verbs=')) || '').slice(8).split(',').filter(Boolean);
  const hits = new Map();
  for (const r of rows) for (const v of SV.separableVerbsIn(r.text)) { if (!hits.has(v.lemma)) hits.set(v.lemma, []); hits.get(v.lemma).push({ ...r, shape: v.realisation }); }
  console.log(`\n${seeds.length} seeds, ${legos.length} LEGOs, ${phrases.length} phrases\n`);
  console.log('verb            intro  after-intro split/joined  phrases-after split/joined  seeds-after');
  const report = [];
  for (const lemma of SV.VERBS) {
    if (only.length && !only.includes(lemma)) continue;
    const h = (hits.get(lemma) || []).sort((a, b) => a.seed - b.seed);
    const introLego = legos.filter(l => SV.separableVerbsIn(l.target_text).some(v => v.lemma === lemma)).sort((a, b) => a.seed_number - b.seed_number)[0];
    const intro = introLego ? introLego.seed_number : (h[0] ? h[0].seed : null);
    const after = h.filter(x => x.seed > intro);
    const n = (arr, s) => arr.filter(x => x.shape === s).length;
    const ph = after.filter(x => x.kind === 'phrase');
    const seedsAfter = [...new Set(after.map(x => x.seed))];
    report.push({ lemma, intro, introLego: introLego?.lego_id, afterSplit: n(after, 'split'), afterJoined: n(after, 'joined'), seedsAfter });
    console.log(`${lemma.padEnd(15)} ${String(intro).padStart(5)}  ${String(n(after, 'split') + '/' + n(after, 'joined')).padStart(24)}  ${String(n(ph, 'split') + '/' + n(ph, 'joined')).padStart(27)}  ${seedsAfter.slice(0, 10).join(',')}${seedsAfter.length > 10 ? `…(${seedsAfter.length})` : ''}`);
  }
  const never = report.filter(r => r.afterSplit + r.afterJoined === 0).map(r => r.lemma);
  const neverSplit = report.filter(r => r.afterSplit === 0 && r.afterJoined > 0).map(r => r.lemma);
  console.log(`\nnever recur after introduction (${never.length}): ${never.join(', ')}`);
  console.log(`recur but never SPLIT (${neverSplit.length}): ${neverSplit.join(', ')}`);
}
main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
