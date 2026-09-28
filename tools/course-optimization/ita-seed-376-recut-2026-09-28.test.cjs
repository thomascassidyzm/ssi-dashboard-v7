'use strict';
// node --test tools/course-optimization/ita-seed-376-recut-2026-09-28.test.cjs
// Proves the 376 re-cut (Kai, 2026-09-28, P3 of d/197f2605; job #644·I): the BEFORE picture fails the
// rules the cut is judged by, the AFTER picture passes them all. Pure — no DB.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-seed-376-recut-2026-09-28.cjs');

test('BEFORE: the one LEGO is (almost) the seed, so rows carrying only "… da nessuna parte" cannot contain it (P17)', () => {
  const lego = { known: T.OLD.legos[0].known, target: T.OLD.legos[0].target };
  const failing = T.OLD.phrases.filter(p => !/C0\d$/.test(p.id) && !T.phraseContainsLego(lego, p)).map(p => p.id);
  assert.deepEqual(failing, ['S0376L01B02', 'S0376L01U02', 'S0376L01U03', 'S0376L01U04', 'S0376L01U05']);
  const u05 = T.OLD.phrases.find(p => p.id === 'S0376L01U05');
  assert.match(u05.target, /uscire/); // the mistranslation
});

test('AFTER: every rule holds offline', () => {
  const { problems, phrases } = T.checkOffline();
  assert.deepEqual(problems, []);
  for (const p of phrases.filter(p => p.role !== 'component')) assert.ok(T.phraseContainsLego(T.NEW_LEGOS.find(l => l.idx === p.idx), p), p.id);
  assert.equal(phrases.length, 15);
  assert.equal(phrases.filter(p => p.kind === 'move').length, 7);
  assert.equal(phrases.filter(p => p.kind === 'add').length, 2);
});

test('L01 is new on evidence, both LEGOs new, "last month" left to L30', () => {
  assert.ok(T.NEW_LEGOS.every(l => l.is_new));
  assert.ok(T.legosTileSeed(T.NEW_LEGOS, T.SEED_TEXT));
  assert.deepEqual(T.componentsCarryPerson(T.NEW_LEGOS), []);
  assert.equal(T.NEW_LEGOS[0].components[0].known, "I didn't go"); // K26: the component carries its pronoun
});

test("Kai's intro line is byte for byte his, and the mirror check reads its double quotes", () => {
  assert.equal(T.L02_INTRO, `The Italian for "anywhere" in a negative phrase like 'I didn't go anywhere', is:`);
  assert.deepEqual(T.introRules(T.NEW_LEGOS[1], T.L02_EXAMPLE, T.L02_INTRO), []);
  const M = require('../../services/shared/intro-mirror.cjs');
  const compiled = M.compileTemplate("The {target_lang_name} for: '{known}', as in — '{seed}', is:", { knownLang: 'eng' });
  assert.equal(M.verdict({ introText: T.L02_INTRO, knownText: 'anywhere', compiled, mark: { text: T.L02_INTRO } }).status, 'mirror');
});

test('the rewritten U05 says "I didn\'t go anywhere" in Italian that carries both LEGOs, and the seed sentence sits under the last new LEGO', () => {
  const phrases = T.resolvedPhrases();
  assert.ok(T.u05Rewritten(phrases));
  assert.ok(!T.u05Rewritten(T.OLD.phrases.map(p => ({ ...p, idx: 1, role: 'use' }))));
  assert.ok(T.seedSentencePlayed(phrases));
  assert.equal(phrases.find(p => p.known === T.SEED_TEXT.known).id, 'S0376L02U04');
});
