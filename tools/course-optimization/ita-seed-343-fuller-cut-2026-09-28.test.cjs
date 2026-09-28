// tools/course-optimization/ita-seed-343-fuller-cut-2026-09-28.test.cjs
//   node --test tools/course-optimization/ita-seed-343-fuller-cut-2026-09-28.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const T = require('./ita-seed-343-fuller-cut-2026-09-28.cjs');
test('the preoccupat* rule: DI + infinitive and PER + noun pass; PER + infinitive and DI + noun fail; che + clause and bare pass', () => {
  assert.equal(T.classifyPreoccupato("è preoccupata per l'economia").ok, true);
  assert.equal(T.classifyPreoccupato('è preoccupata di giocare male').ok, true);
  assert.equal(T.classifyPreoccupato('era preoccupato per stare da solo').ok, false);   // the old S0351L02U05
  assert.equal(T.classifyPreoccupato('è preoccupata per giocare male').ok, false);      // the old S0343L01U03
  assert.equal(T.classifyPreoccupato("è preoccupata di l'economia").ok, false);
  assert.equal(T.classifyPreoccupato('sono preoccupato che arriverò in ritardo').ok, true);
  assert.equal(T.classifyPreoccupato('sono preoccupato adesso').ok, true);
});
test('the fuller cut: L02 ends the seed on both sides, its components tile it, and the OLD U05 (preoccupato) fails containment while the new one holds', () => {
  assert.equal(T.legosCoverSeed(), true);
  assert.equal(T.componentsTileLego(T.NEW_L02), true);
  const u05 = T.CHANGES.find(c => c.id === 'S0343L02U05');
  assert.equal(T.phraseContainsLego(u05.before), false);
  assert.equal(T.phraseContainsLego(u05.after), true);
  assert.equal(T.phraseContainsLego(T.OLD_L02), false);
  assert.deepEqual(Object.values(T.POSITIONS).sort((a, b) => a - b), [...Array(13).keys()]);
});
