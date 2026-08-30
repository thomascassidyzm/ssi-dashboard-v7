#!/usr/bin/env node
/** Cheap self-test for the pattern matchers. No DB, no network, single process. */
const PATTERNS = require('./patterns.cjs');
const by = Object.fromEntries(PATTERNS.map(p => [p.id, p]));
let fail = 0;
const t = (id, text, want) => {
  const got = by[id].test(text);
  if (got !== want) { fail++; console.log(`FAIL ${id} ${want ? 'should' : 'should not'} match: ${text}`); }
};
// P1 want-chain
t('P1', 'I want to speak Spanish with you now', true);
t('P1', 'and I want you to speak Spanish with me tomorrow', true);
t('P1', 'you speak Spanish very well', false);
// P16 relative clause — must not fire on complementiser-that or interrogative who
t('P16', 'because I want to meet people who speak Spanish', true);
t('P16', 'I think that he needs to consider ten possible problems', false);
t('P16', 'who said that she\'s worried about the economy', false);
// P17 counterfactual
t('P17', "I'd have driven if you'd told me how tired you were", true);
t('P17', 'I want to speak Spanish with you now', false);
// P20 / P21
t('P20', 'Do you speak Spanish all day?', true);
t('P20', 'I speak a little Spanish now', false);
t('P21', 'Why are you learning her name?', true);
// P27
t('P27', "what's it like to live there?", true);
// ids unique, ordered, and each carries a shape
const ids = PATTERNS.map(p => p.id);
if (new Set(ids).size !== ids.length) { fail++; console.log('FAIL duplicate pattern ids'); }
for (const p of PATTERNS) if (!p.shape || !p.name) { fail++; console.log('FAIL missing shape/name', p.id); }
// --- pattern-diversity metric: it must FAIL the known-bad seed-600 basket ---
const { score, matrixClause, skeleton } = require('./pattern-diversity.cjs');
// The S7 matcher, taken from the split registry by SPLIT ID. It used to be taken
// by SEED ("spa_for_eng:600"), which asserted that seed 600's job was to cross
// this split. That was wrong — 600 admits one lego, "driven"/"conducido", and its
// job is lexical — so the lookup is now by split, and which seed must cross it is
// derived. What is tested here is the METRIC's split logic, not any seed's job.
const S7 = [require('./split-matchers.cjs').S7];
const live600 = [
  ['build','driven','conducido'],
  ['build',"I'd have driven home",'habría conducido a casa'],
  ['build',"I'd have driven",'habría conducido'],
  ['use',"I'd have driven in a safe way",'habría conducido de manera segura'],
  ['use',"I'd have driven if you'd told me",'habría conducido si me lo hubieras dicho'],
  ['use',"I'd have driven if you'd told me how tired you were",'habría conducido si me hubieras dicho lo cansado que estabas'],
  ['use',"I'd have driven but I was tired",'habría conducido pero estaba cansado'],
  ['use',"I'd have driven if you'd told me that",'habría conducido si me hubieras dicho eso'],
  ['use',"I'd have driven there",'habría conducido hasta allí'],
].map(([phrase_role, known_text, target_text]) => ({ phrase_role, known_text, target_text }));
const bad = score(live600, { lego: 'driven', splits: S7 });
if (bad.pass) { fail++; console.log('FAIL metric passes the known-bad tail-swap basket'); }
if (!bad.floor_failures.includes('frame')) { fail++; console.log('FAIL frame axis should floor-fail on nine copies of one matrix clause'); }
if (!bad.floor_failures.includes('split')) { fail++; console.log("FAIL split axis should floor-fail: 'd=had appears in one skeleton only"); }
if (!bad.splits[0].crossed_weak) { fail++; console.log('FAIL weak crossing should hold — both forms do occur'); }
if (matrixClause("I'd have driven if you'd told me") !== "I'd have driven") { fail++; console.log('FAIL matrixClause'); }
if (skeleton("I'd have driven if you'd told me") !== "i'd have driven | if you'd told me") { fail++; console.log('FAIL skeleton: ' + skeleton("I'd have driven if you'd told me")); }
// and it must PASS a hand-built set that genuinely crosses the split in varied shapes
const good = [
  ['build','driven','conducido'],
  ['build',"if I'd driven",'si hubiera conducido'],
  ['build',"you'd have driven",'habrías conducido'],
  ['use',"I'd have driven if it had been closer",'habría conducido si hubiera estado más cerca'],
  ['use',"if you'd driven we would have arrived earlier",'si hubieras conducido habríamos llegado antes'],
  ['use',"she'd have driven but nobody asked her",'ella habría conducido pero nadie se lo pidió'],
  ['use',"driven by someone else it would have been easier",'conducido por otra persona habría sido más fácil'],
  ['use',"if he'd driven the car I'd have been happier",'si él hubiera conducido el coche yo habría estado más contento'],
  ['use',"would you have driven that far?",'¿habrías conducido tan lejos?'],
].map(([phrase_role, known_text, target_text]) => ({ phrase_role, known_text, target_text }));
const g = score(good, { lego: 'driven', splits: S7 });
if (!g.splits[0].crossed) { fail++; console.log('FAIL a genuinely varied set should cross the split'); }
if (g.axes.frame <= bad.axes.frame) { fail++; console.log('FAIL varied set should out-score the tail-swap set on frames'); }

console.log(fail ? `${fail} failing assertion(s)` : `ok — ${PATTERNS.length} patterns, metric fails the bad basket (${bad.composite}) and clears the varied one (${g.composite}), all assertions pass`);
process.exit(fail ? 1 : 0);
