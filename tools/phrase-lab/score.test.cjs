#!/usr/bin/env node
/**
 * Proof for the ZUT checker + edge scorer, IN BOTH DIRECTIONS.
 *
 * A verifier proven only in the direction it is supposed to fire is an untested
 * verifier: it is trivially easy to write a check that flags everything, and the
 * first draft of this one did exactly that — it failed 100% of live spa content
 * including the set Tom hand-graded as the GOOD one. So half of this file is
 * "stays silent on a clean set" and that half is the half that matters.
 *
 * Single process, no vitest, no DB for the synthetic half. The live half runs
 * only if Supabase credentials are present and SKIPS LOUDLY if not — a skipped
 * check announced is useful, a skipped check hidden is poison.
 *
 * Usage: node tools/phrase-lab/score.test.cjs
 */

require('dotenv').config({ quiet: true });
const { checkPhraseZut, scoreSet, positionOf, patternOf, useCompleteness } = require('./score.cjs');

let LAZY_SHORTFALLS = null;
let pass = 0;
let fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

// ---------------------------------------------------------------------------
// A synthetic course: enough vocabulary to build both a clean set and a lazy one.
// ---------------------------------------------------------------------------
const item = (legoId, seedNumber, known, target, extra = {}) => ({
  kind: 'lego', legoId, seedNumber, legoIndex: 1, type: 'A',
  known, target, recency: 0, deterministic: true, reason: null, detail: null, unlock: null, ...extra
});

const INV = {
  courseCode: 'spa_for_eng',
  seedNumber: 100,
  legoIndex: 1,
  targetLego: { lego_id: 'S0100L01', type: 'A', known_text: 'the top', target_text: 'la cima' },
  items: [
    item('S0010L01', 10, 'I want', 'quiero'),
    item('S0012L01', 12, 'to reach', 'llegar a'),
    item('S0020L01', 20, 'she could', 'podía'),
    item('S0030L01', 30, 'not', 'no'),
    item('S0090L01', 90, 'is difficult', 'es difícil'),
    item('S0095L01', 95, 'do you think', 'crees que'),
    item('S0098L01', 98, 'we saw', 'vimos'),
    item('S0060L01', 60, 'today', 'hoy'),
    item('S0061L01', 61, 'again', 'otra vez'),
    item('S0062L01', 62, 'quickly', 'rápido'),
    item('S0063L01', 63, 'later', 'más tarde'),
    item('S0064L01', 64, 'alone', 'solo'),
    // one item the course itself made ambiguous — LAYER 2, not layer 1
    item('S0040L01', 40, 'well', 'bien', {
      deterministic: false, reason: 'convergent-target',
      detail: '"bien" is reached from 2 different knowns: well / fine', unlock: 'not yet'
    })
  ]
};

const t = (known, target, legoId) => ({ known, target, legoId });

// ---------------------------------------------------------------------------
// DIRECTION 1 — it must FIRE on a known-bad set
// ---------------------------------------------------------------------------
console.log('\nDIRECTION 1 — fires on known-bad input');

// THE INFLECTION HOLE — Tom's ruling, 2026-08-28. These four tests are the ones
// that must never go green again by accident: the gate used to run every
// known-side comparison through `stem = w => w.replace(/(ing|ed|es|s)$/,'')`, so
// every one of these passed.
{
  const INF = { ...INV, items: [...INV.items, item('S0050L01', 50, 'I drink', 'bebo')] };

  const drinks = checkPhraseZut(INF, {
    known: 'he drinks the top', target: 'bebe la cima',
    tiles: [t('I drink', 'bebo', 'S0050L01'), t('the top', 'la cima', 'S0100L01')]
  });
  ok('an inflected known form fails the gate', !drinks.pass);
  ok('and it is named as a derived inflection',
    drinks.failures.some((f) => f.code === 'derived-inflection' && f.token === 'drinks'),
    JSON.stringify(drinks.failures));

  const drinking = checkPhraseZut(INF, {
    known: 'drinking again', target: 'bebo otra vez',
    tiles: [t('I drink', 'bebo', 'S0050L01'), t('again', 'otra vez', 'S0061L01')]
  });
  ok('-ing on a taught form is not a taught form', !drinking.pass);

  const exact = checkPhraseZut(INF, {
    known: 'I drink again', target: 'bebo otra vez',
    tiles: [t('I drink', 'bebo', 'S0050L01'), t('again', 'otra vez', 'S0061L01')]
  });
  ok('the EXACT introduced form still passes', exact.pass, JSON.stringify(exact.failures));

  // ATTESTATION, not introduction: a component of an M-LEGO is legitimate
  // vocabulary even though it was never a LEGO of its own (Tom, 2026-08-28).
  const WITHCOMP = { ...INV, items: [...INV.items,
    { kind: 'component', legoId: 'S0055L01', seedNumber: 55, legoIndex: 1, type: 'C',
      known: 'the bus', target: 'el autobús', recency: 0, deterministic: true,
      reason: null, detail: null, unlock: null }] };
  const comp = checkPhraseZut(WITHCOMP, {
    known: 'the bus is difficult', target: 'el autobús es difícil',
    tiles: [t('the bus', 'el autobús', 'S0055L01#c'), t('is difficult', 'es difícil', 'S0090L01')]
  });
  ok('a component of an M-LEGO counts as attested vocabulary', comp.pass, JSON.stringify(comp.failures));
}


{
  // The smuggle species, Tom's own live specimen shape: target carries meaning
  // the prompt never asks for.
  const r = checkPhraseZut(INV, {
    known: 'I want to reach the top',
    target: 'quiero llegar a la cima con mis amigos',
    tiles: [t('I want', 'quiero', 'S0010L01'), t('to reach', 'llegar a', 'S0012L01'),
            t('the top', 'la cima', 'S0100L01'), t('with my friends', 'con mis amigos', 'S0051L03')]
  });
  ok('smuggled target material fails the gate', !r.pass);
  ok('smuggle is named as such',
    r.failures.some((f) => f.code === 'target-not-asked-for' || f.code === 'not-introduced'),
    JSON.stringify(r.failures));
}

{
  const r = checkPhraseZut(INV, {
    known: 'I want to reach the summit',
    target: 'quiero llegar a la cumbre',
    tiles: [t('I want', 'quiero', 'S0010L01'), t('to reach', 'llegar a', 'S0012L01'), t('the summit', 'la cumbre', 'X')]
  });
  ok('un-introduced target fails the gate', !r.pass);
  ok('un-introduced is named', r.failures.some((f) => f.code === 'not-introduced'), JSON.stringify(r.failures));
}

{
  const r = checkPhraseZut(INV, { known: 'the top', target: 'la cima', tiles: [] });
  ok('an untileable phrase fails rather than passing silently', !r.pass);
}

{
  const r = checkPhraseZut(INV, {
    known: 'I want to reach the top',
    target: 'quiero llegar a la cima',
    tiles: [t('I want', 'quiero', 'S0010L01'), t('to reach', 'llegar a', 'S0012L01'), t('the top', 'la cima', 'S0100L01')]
  });
  ok('untiled target material is caught when tiles under-cover',
    checkPhraseZut(INV, {
      known: 'I want to reach the top now',
      target: 'quiero llegar a la cima ahora',
      tiles: r.resolved.map((x) => x.tile)
    }).failures.some((f) => f.code === 'untiled-target'));
}

{
  // THE CONDUCIDO DISEASE — the whole reason the functional exists. Six phrases,
  // one partner, tail swapped. Must score near zero on edges and on variety.
  const TAILS = [['today', 'hoy'], ['again', 'otra vez'], ['quickly', 'rápido'], ['later', 'más tarde'], ['alone', 'solo']];
  const lazy = TAILS.map(([k, tg]) => ({
    role: 'use',
    known: `I want to reach the top ${k}`,
    target: `quiero llegar a la cima ${tg}`,
    tiles: [t('I want', 'quiero', 'S0010L01'), t('to reach', 'llegar a', 'S0012L01'), t('the top', 'la cima', 'S0100L01'), t(k, tg, 'X')]
  }));
  const s = scoreSet(INV, lazy);
  ok('a tail-swapped set draws no gate failures — laziness is not a ZUT offence',
    s.use.gateFailed === 0, JSON.stringify(s.use.rows.flatMap((r) => r.zut.failures)));
  ok('tail-swapping earns exactly one pattern signature', s.use.distinctPatterns === 1, `got ${s.use.distinctPatterns}`);
  ok('tail-swapping varies zero of five axes', s.use.axesVaried === 0, `got ${s.use.axesVaried}`);
  ok('tail-swapping reaches one position only', s.use.positionSpread === 1, `got ${s.use.positionSpread}`);
  ok('tail-swapping is rejected on named axes, not on a score',
    !s.verdict.use.pass && s.verdict.use.shortfalls.some((x) => x.axis === 'axesVaried')
      && s.verdict.use.shortfalls.some((x) => x.axis === 'positionSpread'),
    JSON.stringify(s.verdict.use.shortfalls));
  ok('every shortfall carries a rewrite instruction', s.verdict.use.shortfalls.every((x) => !!x.instruction));
  LAZY_SHORTFALLS = s.verdict.use.shortfalls.length;
}

{
  // Only the reliable case is asserted. Mechanical standalone-detection on
  // English over-fires on exactly the varied openings the prompt asks for — see
  // the note on useCompleteness — so the real judgement lives in judge-use.cjs.
  ok('a three-word USE phrase is not counted as standalone', !useCompleteness('reach the top').complete);
  ok('a varied opening is NOT mistaken for a fragment',
    useCompleteness('on Sunday morning I enjoy speaking with you').complete
      && useCompleteness("let's talk about the top on Friday night").complete);
}

// ---------------------------------------------------------------------------
// DIRECTION 2 — it must STAY SILENT on a known-good set
// ---------------------------------------------------------------------------
console.log('\nDIRECTION 2 — stays silent on known-good input');

const GOOD = [
  { role: 'build', known: 'to reach the top', target: 'llegar a la cima',
    tiles: [t('to reach', 'llegar a', 'S0012L01'), t('the top', 'la cima', 'S0100L01')] },
  { role: 'build', known: 'the top is difficult', target: 'la cima es difícil',
    tiles: [t('the top', 'la cima', 'S0100L01'), t('is difficult', 'es difícil', 'S0090L01')] },
  { role: 'build', known: 'we saw the top', target: 'vimos la cima',
    tiles: [t('we saw', 'vimos', 'S0098L01'), t('the top', 'la cima', 'S0100L01')] },
  { role: 'use', known: 'she could not reach the top', target: 'no podía llegar a la cima',
    tiles: [t('not', 'no', 'S0030L01'), t('she could', 'podía', 'S0020L01'), t('to reach', 'llegar a', 'S0012L01'), t('the top', 'la cima', 'S0100L01')] },
  { role: 'use', known: 'do you think the top is difficult', target: 'crees que la cima es difícil',
    tiles: [t('do you think', 'crees que', 'S0095L01'), t('the top', 'la cima', 'S0100L01'), t('is difficult', 'es difícil', 'S0090L01')] },
  { role: 'use', known: 'I want to reach the top', target: 'quiero llegar a la cima',
    tiles: [t('I want', 'quiero', 'S0010L01'), t('to reach', 'llegar a', 'S0012L01'), t('the top', 'la cima', 'S0100L01')] }
];

{
  const s = scoreSet(INV, GOOD);
  ok('a clean set draws no layer-1 gate failures',
    s.headline.gateFailures === 0,
    JSON.stringify(s.build.rows.concat(s.use.rows).flatMap((r) => r.zut.failures)));
  ok('the new LEGO is found in the filling position', s.use.positions.filling > 0 || s.build.positions.filling > 0);
  ok('all three positions are reached across the set',
    new Set([...s.build.rows, ...s.use.rows].map((r) => r.position).filter((p) => p !== 'bare')).size === 3);
  ok('pattern variety is registered', s.use.distinctPatterns >= 2, `got ${s.use.distinctPatterns}`);
  ok('the question axis is registered', s.use.axisCoverage.mood === 2, JSON.stringify(s.use.axisCoverage));
  ok('the negation axis is registered', s.use.axisCoverage.polarity === 2, JSON.stringify(s.use.axisCoverage));
  // The scalar does NOT separate these two — see the header. The AXES do, and
  // that is what the acceptance test asserts.
  ok('a clean set clears more axes than the tail-swapped one',
    s.verdict.use.shortfalls.length < LAZY_SHORTFALLS,
    `clean ${s.verdict.use.shortfalls.length} shortfalls vs lazy ${LAZY_SHORTFALLS}`);
  ok('a clean set varies at least three of five axes', s.use.axesVaried >= 3, `got ${s.use.axesVaried}`);
  ok('a clean set touches more than one neighbour', s.use.distinctAdjacencies + s.build.distinctAdjacencies >= 3,
    `got ${s.use.distinctAdjacencies}+${s.build.distinctAdjacencies}`);
}

{
  // LAYER 2 must be reported and must NOT fail the phrase. The first draft of
  // this checker charged it and failed everything in the estate.
  const r = checkPhraseZut(INV, {
    known: 'the top is difficult well',
    target: 'la cima es difícil bien',
    tiles: [t('the top', 'la cima', 'S0100L01'), t('is difficult', 'es difícil', 'S0090L01'), t('well', 'bien', 'S0040L01')]
  });
  ok('inherited course ambiguity is reported', r.inherited.some((i) => i.code === 'convergent-target'), JSON.stringify(r.inherited));
  ok('inherited course ambiguity does not fail the phrase', r.pass, JSON.stringify(r.failures));
}

// ---------------------------------------------------------------------------
// Position and pattern primitives
// ---------------------------------------------------------------------------
console.log('\nprimitives');
ok('lego alone is bare', positionOf([{ isNew: true }]) === 'bare');
ok('partner after only is start', positionOf([{ isNew: true }, { isNew: false, item: {} }]) === 'start');
ok('partner before only is end', positionOf([{ isNew: false, item: {} }, { isNew: true }]) === 'end');
ok('partners either side is filling',
  positionOf([{ isNew: false, item: {} }, { isNew: true }, { isNew: false, item: {} }]) === 'filling');
ok('a question is detected', patternOf('do you think the top is difficult').mood === 'q');
ok('negation is detected', patternOf('she could not reach the top').polarity === 'neg');
ok('a conditional is detected', patternOf("I'd have driven home").tense === 'cond');

// ---------------------------------------------------------------------------
// LIVE REGRESSION — the two sets Tom graded by hand, 2026-08-27.
// ---------------------------------------------------------------------------
(async () => {
  console.log('\nlive regression against Tom\'s hand-graded specimens');
  let supabase = null;
  try { supabase = require('../../services/supabase-client.cjs').supabase; } catch (_) {}
  if (!supabase) {
    console.log('  SKIPPED — no Supabase credentials on this machine. The two synthetic');
    console.log('  directions above still ran; the live calibration did NOT.');
  } else {
    const { buildInventory } = require('./inventory.cjs');
    const { fetchLivePhrases } = require('./score.cjs');

    const good = await (async () => {
      const inv = await buildInventory(supabase, 'spa_for_eng', 358, 1);
      return scoreSet(inv, await fetchLivePhrases(supabase, 'spa_for_eng', 358, 1));
    })();
    const bad = await (async () => {
      const inv = await buildInventory(supabase, 'spa_for_eng', 206, 1);
      return scoreSet(inv, await fetchLivePhrases(supabase, 'spa_for_eng', 206, 1));
    })();

    // Tom on 358: four genuinely different pattern moves, but 100% end position.
    //
    // FLIPPED DELIBERATELY, 2026-08-28, under Tom's surface-form ruling. This
    // used to assert that his hand-graded GOOD set draws ZERO layer-1 gate
    // failures, and before the ruling it did: the known side was compared
    // through a stemmer and a folded ZUT key, so "to reach the top" -> "llegar
    // a la cima" was scored as gloss DRIFT and warned about rather than failed.
    // Under the ruling it is a failure and it always was one: "reach" appears
    // nowhere in seeds 1..358, not as a LEGO and not as a component, so the
    // learner is shown an English word they have never met and asked for a
    // Spanish word that was taught as "arrive". The estate's own API validator
    // agrees and has agreed all along — `checkKnownSide` calls it `unknown
    // gloss "reach"` and rejects the submission.
    //
    // So the specimen is not the calibration it was taken for. That is a finding
    // about the specimen, not a licence to soften the gate, and the assertion
    // says so out loud rather than being quietly deleted. It is on Tom's desk as
    // a decision: repair the set, or replace the positive specimen.
    ok('spa 358 fails on "reach", a known-side form never introduced',
      good.headline.gateFailures > 0);
    ok('spa 358 scores honestly short on position — end only', good.use.positionSpread === 1 && good.use.positions.end === good.use.phrases);

    // Tom on 206 L1: 100% start, 100% first person, zero negation, zero questions.
    ok('spa 206 L1 (his BAD set) is start-position only', bad.use.positions.start === bad.use.phrases);
    ok('spa 206 L1 varies at most one of five axes', bad.use.axesVaried <= 1, `got ${bad.use.axesVaried}`);
    ok('spa 206 L1 has zero recency mass', bad.use.recencyMass === 0, `got ${bad.use.recencyMass}`);
    ok('spa 206 L1 catches the con-mis-amigos smuggle', bad.build.gateFailed >= 1);
    // Pattern variety is no longer comparable between these two sets: a phrase
    // that fails the gate scores no edges and no pattern, so 358's variety now
    // reads 0 because every one of its phrases carries "reach". Asserting on it
    // would be asserting on a consequence of the gate verdict, not on variety.
    // The synthetic pair above still tests the pattern axis directly.
    ok('spa 206 L1 remains the weaker set on position and recency',
      bad.use.positionSpread <= 1 && bad.use.recencyMass === 0);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
