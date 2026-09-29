/**
 * The cross-basket collapse gate (audit #423 (d), Tom's GO 2026-09-27) and the
 * two cheap format gates (D2 questions keep "?", D3 capital "I").
 *
 * Run: node --test tools/phrase-gate/stem-diversity.test.cjs
 */
const test = require('node:test');
const assert = require('node:assert');
const { checkStemDiversity, windowedStemShares } = require('./stem-diversity.cjs');
const { questionMarkViolations, lowerIViolations } = require('./gate-check.cjs');

test('d1: one collocate hugging the LEGO in more than two USE phrases fails (deu S0050 "better")', () => {
  const use = ['I want to become better', 'you know I would like to become better', 'no worries, I will become better', 'we can speak today', 'she is tired']
    .map((known) => ({ known }));
  const r = checkStemDiversity({ legoKnown: 'to become', use }, new Map());
  assert.strictEqual(r.pass, false);
  assert.ok(r.within.some((w) => w.kind === 'collocate' && w.item === 'better' && w.count === 3));
});

test('d2: a stem over 25% of nearby baskets may appear once, not twice', () => {
  const shares = new Map([['he said that', 0.28]]);
  const once = checkStemDiversity({ legoKnown: 'the key', build: [], use: [{ known: 'he said that the key is here' }, { known: 'I lost the key' }] }, shares);
  const twice = checkStemDiversity({ legoKnown: 'the key', build: [{ known: 'he said that the key' }], use: [{ known: 'he said that the key is here' }] }, shares);
  assert.strictEqual(once.pass, true);
  assert.strictEqual(twice.pass, false);
  assert.strictEqual(twice.course[0].stem, 'he said that');
});

test('above 30% a stem is refused outright, not merely capped', () => {
  const r = checkStemDiversity({ legoKnown: 'the key', build: [], use: [{ known: 'did you see the key' }] }, new Map([['did you see', 0.33]]));
  assert.strictEqual(r.pass, false);
  assert.strictEqual(r.course[0].cap, 0);
});

test('the share judged is the higher of course-wide and the local window', () => {
  const b = (seed, known) => ({ seed, legoKnown: 'x', phrases: [{ known }] });
  const baskets = [];
  for (let s = 11; s < 300; s += 1) baskets.push(b(s, `plain sentence number ${s}`));
  for (let s = 340; s < 370; s += 1) baskets.push(b(s, 'he said that x'));
  const sh = windowedStemShares(baskets, 355);
  assert.ok(sh.get('he said that') > 0.9, `local share ${sh.get('he said that')}`);
});

test('questions keep "?" on both sides; English keeps capital I', () => {
  assert.strictEqual(questionMarkViolations([{ known: 'do you often speak in French', target: 'tu parles souvent en français' }]).length, 1);
  assert.strictEqual(questionMarkViolations([{ known: 'do you often speak in French?', target: 'tu parles souvent en français ?' }]).length, 0);
  assert.strictEqual(lowerIViolations([{ known: "tomorrow i'd like to practise" }]).length, 1);
  assert.strictEqual(lowerIViolations([{ known: "tomorrow I'd like to practise in Italian" }]).length, 0);
});
