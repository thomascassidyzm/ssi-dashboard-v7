// tools/course-optimization/ita-seed-343-recut-2026-09-28.test.cjs
// The OLD picture of seed 343 must FAIL the rules (no LEGO covers "per", PER + infinitive under
// L01, a stray oggi, a use row that does not carry its LEGO) and the NEW picture must hold them.
//   node --test tools/course-optimization/ita-seed-343-recut-2026-09-28.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const T = require('./ita-seed-343-recut-2026-09-28.cjs');

test('the OLD picture fails: L01+L02 leave "per" uncovered, U03 says PER + infinitive, B03 has a stray oggi, U05 lacks its LEGO', () => {
  const oldLegos = T.OLD.legos.map(l => ({ ...l, components: [] }));
  assert.equal(T.legosTileSeed(oldLegos, T.SEED_TEXT), false);
  const u03 = T.OLD.phrases.find(p => p.id === 'S0343L01U03');
  assert.equal(T.perInfinitive(u03.target), true);
  assert.equal(T.perInfinitive(T.OLD.other[0].target), true);
  const b03 = T.OLD.phrases.find(p => p.id === 'S0343L02B03');
  assert.equal(T.strayOggi(b03), true);
  const u05 = T.OLD.phrases.find(p => p.id === 'S0343L02U05');
  assert.equal(T.phraseContainsLego(T.NEW_LEGOS[1], { ...u05, role: 'use' }), false);
});

test('the NEW picture holds every rule, and L01 B01 is untouched', () => {
  const { problems } = T.checkOffline();
  assert.deepEqual(problems, []);
  assert.equal(T.legosTileSeed(T.NEW_LEGOS, T.SEED_TEXT), true);
  assert.equal(T.componentsTileLego(T.NEW_LEGOS[1]), true);
  assert.equal(T.b01Untouched(T.resolvedPhrases()), true);
  for (const c of T.CHANGES) assert.equal(T.perInfinitive(c.target), false, c.id);
});

test('DI + noun and PER + noun are not flagged; only PER + infinitive is', () => {
  assert.equal(T.perInfinitive("è preoccupata per l'economia"), false);
  assert.equal(T.perInfinitive('è preoccupata di giocare male'), false);
  assert.equal(T.perInfinitive('era preoccupato per stare da solo'), true);
});
