/**
 * The v3 vocab gate is the live builder's LEGO-level check, nothing more or less
 * (Tom, 2026-09-27): prior seeds, then this seed's LEGOs in index order up to
 * this one, then this LEGO — checked by the route's own checkVocabViolations.
 * A later LEGO of the same seed is never available. Specimen: ita S0002L01
 * "I'm trying to learn", which borrowed S0002L02 "imparare" and passed the old
 * replay (it loaded every sibling of the seed).
 *
 * Run: node --test tools/phrase-gate/future-lego.test.cjs
 */
const test = require('node:test');
const assert = require('node:assert');
const { cumulativeVocab } = require('./gate-check.cjs');
const { checkVocabViolations } = require('../../services/course-builder/lib/validation.cjs');

const prior = new Set(['voglio', 'parlare', 'italiano']);
const siblings = [
  { lego_index: 1, target_text: 'sto provando a', type: 'A' },
  { lego_index: 2, target_text: 'imparare', type: 'A' },
];
const phrase = [{ target: 'sto provando a imparare italiano' }];

test('L01 may not use L02 of its own seed', () => {
  const { withLego } = cumulativeVocab(prior, siblings, 1, 'sto provando a', null, false);
  assert.strictEqual(checkVocabViolations(phrase, withLego, 'ita_for_eng', { seedNumber: 2 }).length, 1);
});

test('L02 may use L01 of its own seed', () => {
  const { withLego } = cumulativeVocab(prior, siblings, 2, 'imparare', null, false);
  assert.strictEqual(checkVocabViolations(phrase, withLego, 'ita_for_eng', { seedNumber: 2 }).length, 0);
});

test('priorVocab excludes the LEGO itself (the anti-template gate needs "before this LEGO")', () => {
  const { priorVocab } = cumulativeVocab(prior, siblings, 2, 'imparare', null, false);
  assert.ok(priorVocab.has('sto provando a') && !priorVocab.has('imparare'));
});
