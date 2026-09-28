// tools/course-optimization/ita-seed-599-sarei-2026-09-28.test.cjs
//   node --test tools/course-optimization/ita-seed-599-sarei-2026-09-28.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const T = require('./ita-seed-599-sarei-2026-09-28.cjs');
test('person agreement: a first-person English "I\'d / I would have been" takes "sarei stato", never "sarebbe stato" — the OLD seed and LEGO fail, the NEW ones pass', () => {
  assert.equal(T.personAgrees(T.OLD_SEED), false);
  assert.equal(T.personAgrees(T.OLD_LEGO), false);
  assert.equal(T.personAgrees(T.NEW_SEED), true);
  assert.equal(T.personAgrees(T.NEW_LEGO), true);
  assert.equal(T.personAgrees({ known: 'it would have been better', target: 'sarebbe stato meglio' }), true); // third person is not this seed's defect
});
test('the OLD components never tiled the LEGO on the known side ("would have been" + "happy" ≠ "I would have been happy"); the NEW ones tile both sides; L01 opens and L02 closes the seed', () => {
  assert.equal(T.componentsTileLego(T.OLD_LEGO), false);
  assert.equal(T.componentsTileLego(T.NEW_LEGO), true);
  assert.equal(T.legosBracketSeed(T.OLD_SEED, T.OLD_LEGO), true);   // bracketing was never the defect
  assert.equal(T.legosBracketSeed(T.NEW_SEED, T.NEW_LEGO), true);
  assert.equal(T.legosBracketSeed(T.NEW_SEED, T.OLD_LEGO), false);  // mixing persons breaks it
});
test('the presentation line quotes the unchanged known side, so it mirrors the new LEGO too', () => {
  assert.equal(T.presentationMirrorsLego(T.PRESENTATION.text, T.NEW_LEGO), true);
  assert.equal(T.presentationMirrorsLego(T.PRESENTATION.text, { known: 'he would have been happy' }), false);
});
