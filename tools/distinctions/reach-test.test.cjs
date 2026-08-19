/**
 * Calibration test for THE GATE.
 *
 * The first two cases are Kai's own worked examples, 2026-08-19, and they are what
 * the gate exists to tell apart. If either ever flips, the gate is broken however
 * good the rest of the numbers look.
 *
 *   node tools/distinctions/reach-test.test.cjs
 */
const assert = require('assert');
const { reachTest, VERDICTS } = require('./reach-test.cjs');
const { paradigmsOf, axisPairKeys } = require('./axes.cjs');

const eng = { paradigms: paradigmsOf('eng') };
const hin = { paradigms: paradigmsOf('hin'), axisPairs: axisPairKeys('hin', 'gender') };
const v = (r) => r.verdict;

/* ---- KAI'S BOUNDARY --------------------------------------------------------
 * WORKS: "she speaks" / "he speaks" — the learner thinks "I only know how to say
 * she speaks… I'll just say that", and it is the same. Surprise, reward, lesson.
 * FAILS: "I am learning" / "I am teaching" — one Welsh word, but the learner does
 * not think "the closest thing I know is learning". They hit a wall.
 */
assert.strictEqual(v(reachTest('she speaks', 'he speaks', eng)), VERDICTS.REACHES);
assert.strictEqual(v(reachTest('I am learning', 'I am teaching', eng)), VERDICTS.UNREACHABLE);

// The difference is NOT surface minimality — both are one word apart. It is that
// she/he are one paradigm the learner already holds, and learning/teaching are two
// unrelated words whose connection exists only in Welsh.
const works = reachTest('she speaks', 'he speaks', eng);
const fails = reachTest('I am learning', 'I am teaching', eng);
assert.match(works.evidence, /paradigm/);
assert.strictEqual(fails.evidence, 'no-surface-relation');

/* ---- THE HINDI CASE THE CHECK WAS BUILT FOR ------------------------------- */
assert.strictEqual(v(reachTest('मैं बोलना चाहता हूँ', 'मैं बोलना चाहती हूँ', hin)), VERDICTS.REACHES);
// Agreement propagating through several words is still ONE distinction.
assert.strictEqual(v(reachTest('मैं थका हुआ हूँ', 'मैं थकी हुई हूँ', hin)), VERDICTS.REACHES);
// Two distinctions at once — the speaker's gender AND the listener's — is not one
// step from what the learner holds. Real row, eng_for_hin seed 246.
assert.strictEqual(
  v(reachTest('मैं देख रहा था आप बात कर रहे थे', 'मैं देख रही थी आप बात कर रही थीं', hin)),
  VERDICTS.FLAG,
);

/* ---- REAL ESTATE CASES ----------------------------------------------------
 * Live rows, not invented ones. */

// eng_for_hin: two unrelated Hindi verbs colliding on English "to play now".
// This is the dysgu shape, in the estate, found by A2.
assert.strictEqual(v(reachTest('अभी खेलना', 'अभी बजाना', hin)), VERDICTS.UNREACHABLE);

// cym_s_for_eng: one Welsh form answers a statement and its question. Positional
// diffing called these unrelated; they are plainly the same material to an English
// speaker, so the verdict is the middle ground rather than a wrong confident one.
assert.strictEqual(
  v(reachTest('you started to practice', 'did you start to practice', eng)),
  VERDICTS.FLAG,
);

// spa_for_eng, Direction B used on the TARGET side: two answers that are two forms
// of one word means the English prompt never determined which.
assert.strictEqual(v(reachTest('tu amigo', 'tu amiga', {})), VERDICTS.REACHES);
assert.strictEqual(v(reachTest('perfecto', 'perfecta', {})), VERDICTS.REACHES);

/* ---- WHAT THE GATE REFUSES TO GUESS --------------------------------------- */

// Unspaced scripts have no tokens to align. Say so; do not invent a verdict.
assert.strictEqual(v(reachTest('私は話します', '私は話しました', {})), VERDICTS.FLAG);
assert.match(reachTest('私は話します', '私は話しました', {}).reason, /unspaced/);

// Templatic morphology: relatedness lives in a consonantal root, and an affix
// measure has not earned a verdict there.
assert.strictEqual(v(reachTest('أنا كاتب', 'أنا كاتبة', {})), VERDICTS.FLAG);

// A bare one-word gloss has no sentence around it to make the relationship visible.
assert.strictEqual(v(reachTest('amigo', 'amiga', { hasFrame: false })), VERDICTS.FLAG);
// …unless the pair is configured morphology, which is evidence rather than a guess.
assert.strictEqual(v(reachTest('चाहता', 'चाहती', { ...hin, hasFrame: false })), VERDICTS.REACHES);

// Genuinely different sentences are not versions of one another.
assert.strictEqual(
  v(reachTest('I want to go to the shops', 'she was tired yesterday', eng)),
  VERDICTS.UNREACHABLE,
);

console.log('reach-test: all calibration cases pass, including both of Kai\'s worked examples');

/* ---- A SHARED ENDING IS NOT A SHARED WORD --------------------------------
 * spa_for_eng taught "can you hold this" as both ¿puedes sostener esto? and
 * ¿puedes mantener esto?. A suffix measure calls sostener/mantener relatives; they
 * are two different verbs sharing an inflection. Weak evidence must flag, not assert.
 */
assert.strictEqual(v(reachTest('sostener', 'mantener', {})), VERDICTS.FLAG);
assert.match(reachTest('sostener', 'mantener', {}).reason, /share only an ENDING/);
// Welsh initial mutation is the opposite case and must still pass.
assert.strictEqual(v(reachTest('dysgu', 'ddysgu', {})), VERDICTS.REACHES);
console.log('reach-test: shared-ending guard holds');
