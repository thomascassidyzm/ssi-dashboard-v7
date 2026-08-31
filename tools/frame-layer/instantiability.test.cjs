#!/usr/bin/env node
/**
 * The instantiability gate — cheap self-test. No DB, no network, one process.
 *
 * THE ACCEPTANCE TEST OF THE WHOLE DESIGN is `and you?` refused for spa_for_eng
 * at EVERY position, and admitted the moment a cut mints the material, with no
 * config change. It is run here on fixtures rather than against the live DB so
 * it stays a test rather than a weather report — but the fixture is not
 * invented: the vocabulary rows below are the real shape of spa_for_eng's cuts,
 * and the live course was checked read-only on 2026-08-31 to confirm the fact
 * the fixture encodes — 2,205 available known/target rows at the very last
 * basket of the course, zero of which have known side "and you", zero of whose
 * targets contain "y tú", and whose only "tu" is the POSSESSIVE ("your"/"tu",
 * seed 121), a different word from the pronoun.
 */
const { instantiableFrameSet, availableVocab } = require('./availability.cjs');
const { SENTENCE_FRAMES, EXCHANGE_FRAMES, allSentenceMatchers } = require('./dialogue-patterns.cjs');
const FRAMES = [...SENTENCE_FRAMES, ...EXCHANGE_FRAMES];

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.log('FAIL ' + msg); } };
const ids = (pool) => new Set(pool.map(p => p.id));

// --- the fixture: spa_for_eng's real shape, small -------------------------
const V = (known, target, kind = 'lego') => ({ known_text: known, target_text: target, kind });
const SPA = [
  V('yes', 'sí'), V('no', 'no'), V('of course', 'por supuesto'),
  V('thank you', 'gracias'), V('please', 'por favor'),
  V('your', 'tu'),                       // the possessive — NOT the pronoun
  V('you', 'usted'),                     // the formal pronoun, cut at seed 639
  V('you', 'te', 'component'), V('and', 'y'),
  V('I want to speak', 'quiero hablar'),
];
const PRIOR = [{ seed_number: 1, known_text: 'I want to speak Spanish with you now' }];

// 1. THE GATE REFUSES "and you?" — the design's worked case ------------------
{
  const pool = instantiableFrameSet({ vocab: SPA, priorSeeds: PRIOR, dialogueFrames: FRAMES });
  ok(!ids(pool).has('D6'), 'D6 "and you?" must NOT be instantiable for spa_for_eng');
  ok(!ids(pool).has('X1'), 'X1 reciprocal return must NOT be instantiable for spa_for_eng');
  // and it must be refused for the RIGHT reason: owning the parts is not owning
  // the chunk. The course owns "and" and it owns "you" — and still cannot say it.
  ok(SPA.some(v => v.known_text === 'and') && SPA.some(v => v.known_text === 'you'),
     'fixture must own both parts, or the test proves nothing');
  // the frames that ARE reachable, and why they are the cheap win
  ok(ids(pool).has('D2'), 'D2 polar response must be instantiable — "yes"/"no" are cut early everywhere');
  ok(ids(pool).has('D3'), 'D3 thanks must be instantiable — "thank you" is cut');
  ok(ids(pool).has('D8'), 'D8 ellipted order must be instantiable — "please" is cut');
  ok(ids(pool).has('X2'), 'X2 polar-response-to-question must be instantiable');
  ok(!ids(pool).has('D1'), 'D1 ritual open/close must NOT be instantiable — no greeting is cut here');
  ok(!ids(pool).has('D5'), 'D5 deictic handover must NOT be instantiable — no handover chunk is cut');
}

// 2. IT ENTERS THE POOL THE DAY A CUT MINTS THE MATERIAL, no config change ---
{
  const after = [...SPA, V('and you', 'y tú')];        // one new cut, nothing else
  const pool = instantiableFrameSet({ vocab: after, priorSeeds: PRIOR, dialogueFrames: FRAMES });
  ok(ids(pool).has('D6'), 'D6 must enter the pool automatically once "and you" is cut');
  ok(ids(pool).has('X1'), 'X1 must enter the pool automatically once "and you" is cut');
  const d6 = pool.find(p => p.id === 'D6');
  ok(d6 && d6.owned_via.join('+') === 'and you', 'the pool must report WHICH alternate paid for the frame');
}

// 3. AT EVERY POSITION — refusal is not an artefact of an early window -------
{
  for (const legoIndex of [1, 2, 5, 12]) {
    const vocab = availableVocab({
      legos: SPA.map((v, i) => ({ ...v, seed_number: 600, lego_index: i + 1 })),
      components: [], seed: 668, legoIndex,
    });
    const pool = instantiableFrameSet({ vocab, priorSeeds: PRIOR, dialogueFrames: FRAMES });
    ok(!ids(pool).has('D6'), `D6 must be refused at lego window ${legoIndex} too`);
  }
}

// 4. WHOLE-CHUNK, NOT SUBSTRING — "tú" inside "estúpido" is not ownership ----
{
  const trap = [V('stupid', 'estúpido'), V('and', 'y')];
  const pool = instantiableFrameSet({ vocab: trap, priorSeeds: PRIOR, dialogueFrames: FRAMES });
  ok(!ids(pool).has('D6'), 'a substring hit inside another word must never admit a frame');
}

// 5. SEED FRAMES ARE UNCHANGED — P* still comes from attestation only --------
{
  const pool = instantiableFrameSet({ vocab: [], priorSeeds: PRIOR, dialogueFrames: FRAMES });
  ok(ids(pool).has('P1'), 'P1 want-chain is attested by the prior seed and must stay in the pool');
  ok(pool.filter(p => p.provenance === 'pod').length === 0,
     'with no vocabulary at all, no pod frame may enter the pool');
  ok(pool.every(p => p.provenance !== 'seed' || typeof p.first_seed === 'number'),
     'seed frames must carry their first attesting seed');
}

// 6. HEARD IS A RANKING SIGNAL, NEVER A GATE --------------------------------
{
  const heard = new Set(['D2']);
  const pool = instantiableFrameSet({ vocab: SPA, priorSeeds: PRIOR, dialogueFrames: FRAMES, heardFrameIds: heard });
  ok(ids(pool).has('D3'), 'D3 is unheard and must still be in the pool — heard is not a gate');
  ok(pool.find(p => p.id === 'D2').heard === true, 'D2 must be marked heard');
  ok(pool.find(p => p.id === 'D3').heard === false, 'D3 must be marked not-heard');
  const noSchedule = instantiableFrameSet({ vocab: SPA, priorSeeds: PRIOR, dialogueFrames: FRAMES });
  ok(noSchedule.every(p => p.heard === null),
     'with no schedule readable, heard must be null — "unknown", never "no"');
}

// 7. EVERY FRAME'S fixed_material IS WELL-FORMED, or the gate cannot run -----
for (const f of FRAMES) {
  ok(Array.isArray(f.fixed_material) && f.fixed_material.length > 0, `${f.id} must carry fixed_material`);
  ok(f.fixed_material.every(a => Array.isArray(a) && a.length > 0 && a.every(c => typeof c === 'string' && c.trim())),
     `${f.id} fixed_material must be a list of alternates, each a list of non-empty chunks`);
  ok(/^[DX]\d+$/.test(f.id), `${f.id} must be in the D*/X* namespace`);
  ok(!!f.shape && !!f.name, `${f.id} must carry a name and a shape`);
}
{
  const all = allSentenceMatchers().map(f => f.id);
  ok(new Set(all).size === all.length, 'merged matcher ids must be unique across P* and D*');
  ok(EXCHANGE_FRAMES.every(x => !all.includes(x.id)),
     'exchange frames must NOT be in the sentence-grain matcher list — they cannot match one utterance');
  ok(EXCHANGE_FRAMES.every(x => !x.sentence_projection || all.includes(x.sentence_projection)),
     'every exchange frame\'s sentence_projection must name a real sentence frame');
}

// 8. THE METRIC'S FRAME AXIS actually sees the dialogue frames -------------
{
  const { frameSig, score, MERGED } = require('./pattern-diversity.cjs');
  const PATTERNS = require('./patterns.cjs');
  // real corpus text, quoted from pod-0:SC01-S04
  const line = "Yes, I've got a busy day today";
  ok(frameSig(line, PATTERNS) === frameSig(line).split('+').filter(x => !/^D/.test(x)).join('+'),
     'the P* part of a merged signature must be byte-identical to the old signature');
  ok(frameSig(line).includes('D2'), 'the merged list must fire D2 on a real polar response');
  ok(!frameSig(line, PATTERNS).includes('D2'), 'the old list must not — that is the whole delta');
  ok(MERGED.length === PATTERNS.length + 12, 'the merged list is 31 seed frames plus 12 dialogue frames');
  ok(!MERGED.some(m => /^X/.test(m.id)), 'no exchange frame may be in the sentence-grain list');

  // the denominator: min(phrase count, pool). Widening the pool can only ever
  // LOWER the frame axis or leave it alone — it must never flatter a basket.
  const basket = ['a', 'b', 'c', 'd'].map(w => ({ phrase_role: 'use', known_text: `I want to ${w}`, target_text: w }));
  const narrow = score(basket, { lego: 'want', instantiableFrames: 2 });
  const wide = score(basket, { lego: 'want', instantiableFrames: 40 });
  ok(wide.axes.frame <= narrow.axes.frame, 'a bigger pool must never raise the frame axis');
  ok(narrow.frame_ceiling === 2 && wide.frame_ceiling === 4,
     'the ceiling is min(phrase count, pool) — the pool binds when it is the smaller');
}

// 9. THE POST-GENERATION TILING CHECK — the second half of the gate --------
{
  const { tilesFromVocab, rejectUntileable } = require('./generate-candidates.cjs');
  const V2 = (t) => ({ known_text: t, target_text: t });
  const vocab = ['quiero', 'hablar', 'contigo', 'quiero hablar', 'ahora', 'no'].map(V2);
  ok(tilesFromVocab('quiero hablar contigo', vocab).tiles, 'a phrase built from cut chunks must tile');
  ok(tilesFromVocab('Quiero hablar contigo.', vocab).tiles, 'case and punctuation must not defeat the tiling');
  const bad = tilesFromVocab('quiero comer contigo', vocab);
  ok(!bad.tiles, 'an invented word must fail the tiling check');
  ok(bad.untiled.join() === 'comer', 'the rejection must name the material that was not available');
  // whole-chunk, never re-conjugation: "hablo" is not "hablar"
  ok(!tilesFromVocab('hablo contigo', vocab).tiles, 'a re-conjugated form must not tile');
  // longest-first must not strand a valid tiling: "quiero hablar" is a cut AND
  // so are its two parts, and either decomposition is legitimate
  ok(tilesFromVocab('quiero hablar', vocab).tiles, 'an overlapping chunk must not block the tiling');
  ok(tilesFromVocab('no quiero hablar ahora contigo', vocab).tiles, 'a longer legitimate tiling must be found');

  const { kept, rejected } = rejectUntileable(
    [{ lego_index: 1, known_text: 'I want to speak with you', target_text: 'quiero hablar contigo' },
     { lego_index: 1, known_text: 'I want to eat with you', target_text: 'quiero comer contigo' }],
    () => vocab);
  ok(kept.length === 1 && rejected.length === 1, 'the untileable phrase is rejected BEFORE scoring, not scored low');
  ok(rejected[0].reason.includes('does not tile'), 'the rejection carries its reason');
}

// 10. STALENESS must be loud, and must never guess ------------------------
{
  const { stalenessOf } = require('./extract-dialogue-patterns.cjs');
  const inv = { source: { canon_max_updated_at: '2026-08-31T10:00:00Z' } };
  ok(stalenessOf(inv, '2026-08-31T10:00:00Z').stale === false, 'same timestamp is not stale');
  ok(stalenessOf(inv, '2026-09-05T00:00:00Z').stale === true, 'a canon that has moved on makes the inventory stale');
  ok(stalenessOf(inv, null).known === false, 'an unreadable canon reports UNKNOWN, never "fresh"');
  ok(stalenessOf({}, '2026-09-05T00:00:00Z').known === false, 'an inventory with no stamp reports UNKNOWN too');
}

console.log(fail ? `${fail} failing assertion(s)` : `ok — the gate refuses "and you?" for spa_for_eng at every position, admits it the day a cut mints it, and all ${FRAMES.length} frames are well-formed`);
process.exit(fail ? 1 : 0);
