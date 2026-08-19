/**
 * Calibration test for the known-side distinction tables.
 *
 * Every case below is a REAL row from eng_for_hin (2026-08-19), not an invented one.
 * The point of the test is the false-positive half: a swap table that fires on
 * मुझे लगता है would bury a genuine 1,797-proposal finding under 617 rows of noise,
 * and the noise looks exactly like the signal to anyone who doesn't read Hindi.
 *
 *   node tools/known-side/known-distinctions.test.cjs
 */
const assert = require('assert');
const {
  directionsFor, swapSide, strandedAfterSwap, anchorsIn, cueFor,
} = require('./axes.cjs');

// DIRECTION, not language. The same axis is a different problem each way round.
const [dirA] = directionsFor('hin', 'eng');
assert.strictEqual(dirA.direction, 'A', 'Hindi known / English target: known is richer');
assert.strictEqual(dirA.generative, true, 'and we have the morphology to propose from');
const hin = dirA.morphology;
assert.ok(hin, 'hin gender morphology must be configured');

const [dirB] = directionsFor('eng', 'hin');
assert.strictEqual(dirB.direction, 'B', 'the same pair reversed is the OPPOSITE problem');
assert.strictEqual(dirB.richerSide, 'target');

// An axis BOTH sides mark is not a finding: the learner carries it across.
assert.strictEqual(
  directionsFor('spa', 'spa').length, 0,
  'no asymmetry means nothing to report',
);
// English known / Spanish target is Direction B on two axes at once.
const engSpa = directionsFor('eng', 'spa');
assert.deepStrictEqual(engSpa.map((d) => d.axis).sort(), ['formality', 'gender']);
assert.ok(engSpa.every((d) => d.direction === 'B'));
// you-number is a real asymmetry and deliberately OFF: English's one "you" covers both
// numbers estate-wide, and firing on it would drown every other signal.
assert.ok(directionsFor('eng', 'spa', { includeDisabled: true }).some((d) => d.axis === 'number'));

// 'partial' and 'unknown' are not claims strong enough to fire on.
// Nepali gender is flagged unknown — nobody has checked whether 1sg feminine agreement
// is obligatory in the register nep_for_eng teaches.
assert.ok(!directionsFor('eng', 'nep').some((d) => d.axis === 'gender'));
// Japanese gender is register, not agreement, so it is 'partial' and does not fire.
assert.ok(!directionsFor('jpn', 'eng').some((d) => d.axis === 'gender'));
// Hebrew marks gender on every present-tense verb — the densest Direction B on the estate.
assert.deepStrictEqual(directionsFor('eng', 'heb').map((d) => d.axis), ['gender']);

const toFem = (t) => swapSide(t, hin, 'masculine').text;
const engGenderCue = cueFor('eng', 'gender');
const rejectIdFrom = (knownText, targetText, side) => {
  const { swapped } = swapSide(knownText, hin, side);
  const r = hin.rejects.find((rule) => rule.test({
    knownText, targetText, otherText: targetText, otherCue: engGenderCue, swapped, side,
  }));
  return r ? r.id : null;
};
const rejectId = (knownText, targetText) => rejectIdFrom(knownText, targetText, 'masculine');

// --- SIGNAL: speaker/addressee gender that English leaves unmarked -----------
assert.strictEqual(toFem('मैं बोलना चाहता हूँ।'), 'मैं बोलना चाहती हूँ।');
assert.strictEqual(toFem('कोशिश कर रहा हूँ'), 'कोशिश कर रही हूँ');
assert.strictEqual(toFem('क्या आप बोलते हैं?'), 'क्या आप बोलती हैं?');
assert.strictEqual(toFem('क्या आप चाहते थे?'), 'क्या आप चाहती थीं?');
assert.strictEqual(toFem('मैं कभी किसी पर भरोसा नहीं करूँगा'), 'मैं कभी किसी पर भरोसा नहीं करूँगी');
// A phrase mixing an adjective and a participle must swap BOTH or the proposal is
// half-wrong — थका हुई हूँ is not a sentence anyone would say.
assert.strictEqual(toFem('मैं थका हुआ हूँ'), 'मैं थकी हुई हूँ');

// --- NOISE: gender Hindi marks that is NOT a participant's ------------------
// लगता agrees with the thing thought. A woman also says मुझे लगता है. 617 rows.
assert.strictEqual(toFem('मुझे लगता है'), 'मुझे लगता है');
// पता is a masculine noun; the phrase is invariant.
assert.strictEqual(toFem('अगर मुझे पता होता'), 'अगर मुझे पता होता');
// Ergative: the perfective agrees with the object, so this is identical for both.
assert.strictEqual(toFem('मैंने शुरू किया'), 'मैंने शुरू किया');
// Possessives agree with the possessed noun, never the possessor.
assert.strictEqual(toFem('मेरा नाम'), 'मेरा नाम');

// --- REJECTIONS: the swap fires, but the row is still not a candidate -------
// NOT an English rule — the cue comes from whichever language is on the other side.
assert.strictEqual(
  rejectId('वह चाहता है', 'he wants'), 'other-side-marks-gender',
  'when the other side says he/she the two prompts do NOT share one answer',
);
assert.strictEqual(cueFor('eng', 'gender').test('I want'), false, 'no cue, nothing to waive');
assert.strictEqual(cueFor('hin', 'gender'), null, 'Hindi inflects gender, it does not gloss it');
// "my daughter" names the gender on the other side, so the cue rule catches it first —
// both rules are true of this row and either verdict is a correct rejection.
assert.strictEqual(
  rejectId('मेरी बेटी अंग्रेज़ी सीख रही है।', 'my daughter is learning English'),
  'other-side-marks-gender',
);
// With no gender word in the other language, the third-person rule is what fires.
assert.strictEqual(
  rejectId('वे कीचड़ में खेल रहे हैं', "they're playing in the mud"),
  'third-person-subject',
);
assert.strictEqual(
  rejectId('लेकिन आप चाहते हैं मिलना लोगों से जो अंग्रेज़ी बोलते हैं।',
    'but you want to meet people who speak English'),
  'ambiguous-agreement-controller',
  'बोलते after लोगों agrees with the people, not the listener',
);
// …but a third person merely MENTIONED does not disqualify a speaker-locked form:
// चाहता हूँ can only be मैं, however many friends the sentence names.
assert.strictEqual(rejectId('मैं आपके दोस्त से बात करना चाहता हूँ', 'I want to talk to your friend'), null);
assert.strictEqual(rejectId('मैं एक बूढ़ी औरत जानता हूँ।', 'I know an old woman'), null);

// --- ANCHORS ----------------------------------------------------------------
assert.deepStrictEqual(anchorsIn('मैं चाहता हूँ', hin), ['speaker']);
assert.deepStrictEqual(anchorsIn('आप चाहते हैं', hin), ['addressee']);
assert.deepStrictEqual(anchorsIn('चाहता था कि', hin), [], 'a subjectless fragment anchors nothing');

// --- THE REVERSE DIRECTION IS THE DANGEROUS ONE -----------------------------
// -ती is ambiguous between singular -ता and honorific -ते, so the raw swap produces
// the ungrammatical आप चाहता हैं. The rule, not the table, is what stops it reaching
// a human as a proposal.
assert.strictEqual(
  rejectIdFrom('क्या आप चाहती हैं?', 'do you want?', 'feminine'),
  'reverse-direction-needs-speaker-lock',
);
assert.strictEqual(
  rejectIdFrom('क्या आप चाहती हैं महोदया?', 'do you want madam?', 'feminine'),
  'explicitly-gendered-address',
);
// The danda is a boundary, not a letter. Left inside the Devanagari class it made the
// lookahead fail on every full sentence in the course — a silent zero.
assert.strictEqual(toFem('मैं एक बूढ़ी औरत जानता हूँ।'), 'मैं एक बूढ़ी औरत जानती हूँ।');

console.log('axes: all calibration cases pass');

/* ---- THE THREE DEFECTS WORKER #258 FOUND BY HAND, 2026-08-19 --------------
 * An independent adjudicator read 80 rows of live output and found these. They are
 * pinned here so they cannot come back.
 */
const swapM = (t) => swapSide(t, hin, 'masculine');

// A21 — dative-experiencer. था agrees with पता, a masculine noun, so पता थी is
// ungrammatical. The table has to list था for मैं चाहता था; the collocation guard is
// what stops it firing one clause later.
assert.strictEqual(
  swapM('मैं जानना चाहता था, मुझे नहीं पता था कैसे।').text,
  'मैं जानना चाहती थी, मुझे नहीं पता था कैसे।',
);
// …and the ordinary case must still swap both.
assert.strictEqual(swapM('मैं चाहता था').text, 'मैं चाहती थी');

// B6 — करते in करते रहना is an invariant compound, not the listener's agreement.
// Swapping it dragged a first-person row into a third-person rejection and lost a
// valid proposal. Classes needing an anchor no longer fire without one.
assert.strictEqual(
  swapM('मैं यह कुछ देर और करते रहना चाहूँगा').text,
  'मैं यह कुछ देर और करते रहना चाहूँगी',
);
// The honorific class must still fire when the addressee IS present.
assert.strictEqual(swapM('क्या आप चाहते थे?').text, 'क्या आप चाहती थीं?');

// A29 — अच्छा is deliberately never swapped (it usually agrees with something else),
// but left beside a swapped verb it is mixed agreement. The finding stands; the
// PROPOSAL does not, so the row belongs in not-a-drill.
assert.strictEqual(strandedAfterSwap(swapM('मैं अच्छा दिखना चाहता हूँ').text, hin), 'अच्छा');
assert.strictEqual(strandedAfterSwap(swapM('मैं थका हुआ हूँ').text, hin), null);

console.log('axes: the three adjudicated defects stay fixed');
