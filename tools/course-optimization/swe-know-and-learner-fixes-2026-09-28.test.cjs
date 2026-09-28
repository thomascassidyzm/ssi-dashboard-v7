// tools/course-optimization/swe-know-and-learner-fixes-2026-09-28.test.cjs
//
// Proves the swe_for_eng know-verb / learner-report pass (job #610·I): every row this pass changes,
// as it stood BEFORE (live on 2026-09-28), is flagged by the pure rules the pass applies, and the
// same rows with the AFTER text are not — and every AFTER row still contains its LEGO on every side the pass writes.
// Runs with no network:
//   node --test tools/course-optimization/swe-know-and-learner-fixes-2026-09-28.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { knowVerbDefect, learnerReportDefect, containsWords, glossCore, CHANGES, OLD_L01, NEW_L01 } = require('./swe-know-and-learner-fixes-2026-09-28.cjs');

const defect = (k, t) => knowVerbDefect(k, t) || learnerReportDefect(k, t);
// The LEGOs the changed rows sit under — live on 2026-09-28, unchanged by the pass (S0230L01 is the one that changes).
const LEGOS = {
  S0230L01: NEW_L01, S0130L02: { known: 'because/for', target: 'för' }, S0133L02: { known: 'get to know', target: 'lär känna' },
  S0197L04: { known: 'teacher', target: 'lärare' }, S0233L01: { known: 'sister', target: 'syster' }, S0134L01: { known: 'problem', target: 'problem' },
  S0210L02: { known: 'the problem (definite)', target: 'problemet' }, S0017L03: { known: 'the answer', target: 'svaret' }, S0251L02: { known: 'until/before', target: 'förrän' },
  S0020L03: { known: 'quickly', target: 'snabbt' }, S0237L02: { known: 'the weekend (definite)', target: 'helgen' },
};

test('the Swedish-verb rows are flagged before the pass and clean after it', () => {
  const verbRows = CHANGES.filter(c => [2, 3, 4, 5].includes(c.rule));
  assert.strictEqual(verbRows.length, 7);
  for (const c of verbRows) {
    assert.ok(knowVerbDefect(c.before.known, c.before.target), `${c.id} before "${c.before.target}" should be flagged`);
    assert.strictEqual(knowVerbDefect(c.after.known, c.after.target), null, `${c.id} after "${c.after.target}" should be clean`);
  }
  assert.strictEqual(knowVerbDefect('I know', 'jag känner'), 'bare-kanner');
  assert.strictEqual(knowVerbDefect('do you know a teacher?', 'vet du en lärare?'), 'person-with-vet');
  assert.strictEqual(knowVerbDefect("it's exciting to get to know someone", 'det är spännande att lär känna någon'), 'att-finite');
});

test('the learner-report rows are flagged before the pass and clean after it', () => {
  const rows = CHANGES.filter(c => c.rule === 7);
  assert.strictEqual(rows.length, 5);
  for (const c of rows) {
    assert.ok(learnerReportDefect(c.before.known, c.before.target), `${c.id} before should be flagged`);
    assert.strictEqual(learnerReportDefect(c.after.known, c.after.target), null, `${c.id} after should be clean`);
  }
});

test('every AFTER row is clean under both rules and still contains its LEGO on every side the pass writes', () => {
  for (const c of CHANGES) {
    assert.strictEqual(defect(c.after.known, c.after.target), null, `${c.id} after`);
    const L = LEGOS[c.lego];
    assert.ok(L, `${c.lego} known to the test`);
    // the side the pass writes must contain the LEGO (a side it leaves alone keeps whatever shape it had)
    if (c.side !== 'known') assert.ok(containsWords(c.after.target, L.target), `${c.id} target "${c.after.target}" contains "${L.target}"`);
    if (c.side !== 'target') assert.ok(containsWords(c.after.known, glossCore(L.known), { inflection: true }), `${c.id} known "${c.after.known}" contains "${glossCore(L.known)}"`);
  }
});

test('the person-object LEGO keeps känner, stands down as a second debut, and the rule does not read its gloss as bare', () => {
  assert.strictEqual(OLD_L01.target, NEW_L01.target);
  assert.strictEqual(OLD_L01.is_new, true);
  assert.strictEqual(NEW_L01.is_new, false);
  assert.strictEqual(knowVerbDefect(NEW_L01.known, NEW_L01.target), null);
});

test('rows the course already has right are not flagged (no false positives on the shapes that stay)', () => {
  for (const [k, t] of [
    ["they are people I don't know", 'de är människor jag inte känner'],
    ["you're like someone I used to know", 'du påminner mig om någon jag kände'],
    ['most people I know like watching television', 'de flesta jag känner gillar att titta på tv'],
    ["I didn't see anyone that I knew", 'jag såg ingen som jag kände'],
    ['did she need to talk to that woman you know?', 'behövde hon prata med den kvinnan du känner?'],
    ['I know', 'jag vet'], ['do you know my friend?', 'känner du min vän?'], ['when we knew each other better', 'när vi kände varandra bättre'],
    ['before the weekend', 'innan helgen'], ['I want to find out what the answer is', 'jag vill ta reda på vad svaret är'],
  ]) assert.strictEqual(defect(k, t), null, `${t}`);
});
