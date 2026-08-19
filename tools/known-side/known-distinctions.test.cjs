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
const { distinctionsFor, swapSide, anchorsIn } = require('./known-distinctions.cjs');

const [hin] = distinctionsFor('hin', 'eng');
assert.ok(hin, 'hin→eng distinction must be configured');
assert.strictEqual(distinctionsFor('hin', 'spa').length, 0, 'gendered target must be skipped');
assert.strictEqual(distinctionsFor('eng', 'hin').length, 0, 'reverse course must be skipped');

const toFem = (t) => swapSide(t, hin, 'masculine').text;
const rejectIdFrom = (knownText, targetText, side) => {
  const { swapped } = swapSide(knownText, hin, side);
  const r = hin.rejects.find((rule) => rule.test({
    knownText, targetText, swapped, side,
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
assert.strictEqual(
  rejectId('वह चाहता है', 'he wants'), 'target-marks-gender',
  'when English says he/she the two prompts do NOT share one answer',
);
assert.strictEqual(
  rejectId('मेरी बेटी अंग्रेज़ी सीख रही है।', 'my daughter is learning English'),
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

console.log('known-distinctions: all calibration cases pass');
