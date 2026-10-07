#!/usr/bin/env node
/** Cheap self-test for the frame inventory and the pattern-diversity metric. No DB, no network, no model. */
const PATTERNS = require('./patterns.cjs');
let fail = 0;
// The frames are classified by Haiku reading frame-codex.json (r-2026-10-07-never-use-
// regex-to-classify-language), so whether a frame fires on a sentence is measured on the
// gold set (tools/frame-layer/gold/measure-gold.cjs), not asserted here: a unit test
// cannot call a model. What this file still checks is the metric, given the tags the
// codex calls for. Those tags are stated below, per text.
const { installTags } = require('./tag-fixtures.cjs');
installTags({
  'driven': [], "I'd have driven home": ['P17'], "I'd have driven": ['P17'], "I'd have driven in a safe way": ['P17'],
  "I'd have driven if you'd told me": ['P14', 'P17'], "I'd have driven if you'd told me how tired you were": ['P12', 'P14', 'P17', 'P22'],
  "I'd have driven but I was tired": ['P15', 'P17'], "I'd have driven if you'd told me that": ['P14', 'P17'], "I'd have driven there": ['P17'],
  "if I'd driven": ['P14', 'P17'], "you'd have driven": ['P17'], "I'd have driven if it had been closer": ['P14', 'P17', 'P24'],
  "if you'd driven we would have arrived earlier": ['P14', 'P17', 'P28'], "she'd have driven but nobody asked her": ['P15', 'P17', 'P23'],
  'driven by someone else it would have been easier': ['P17', 'P24', 'P30'], "if he'd driven the car I'd have been happier": ['P14', 'P17', 'P24'],
  'would you have driven that far?': ['P17', 'P20'],
  // matrix clauses pattern-diversity cuts out of the phrases above
  "she'd have driven": ['P17'], 'would you have driven': ['P17', 'P20'],
});
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
// (`ea80460ed` scoped the matchers by TARGET LANGUAGE — they are facts about
// Spanish, not about every course — so the bare `.S7` export this test used
// became undefined and the whole file died on load. Read it from `.spa` and
// re-attach the id `crossesSplit` reports under.)
const S7 = [{ id: 'S7', ...require('./split-matchers.cjs').spa.S7 }];
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
