'use strict';
// The rules behind job #559·I (Kai, 2026-09-28): each test fails on the BEFORE state and passes on the AFTER state.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-599-159-160-tell-answer-2026-09-28.cjs');

test('seed 599: the grown L01 and L02 tile the seed; the old L01 did not', () => {
  assert.equal(T.legosTileSeed(T.SEED_599, T.OLD_L01, T.L02), false);
  assert.equal(T.legosTileSeed(T.SEED_599, T.NEW_L01, T.L02), true);
  assert.equal(T.componentsTile(T.NEW_L01), true);
});

test('seed 599: every rewritten L01 phrase contains the grown LEGO on both sides; the old rows did not', () => {
  for (const c of T.CHANGES.filter(c => c.rule === 1)) {
    assert.equal(T.containsWords(c.after.known, T.NEW_L01.known) && T.containsWords(c.after.target, T.NEW_L01.target), true, c.id);
  }
  const old = T.CHANGES.filter(c => c.rule === 1 && c.id !== 'S0599L01B02');
  for (const c of old) assert.equal(T.containsWords(c.before.target, T.NEW_L01.target), false, `${c.id} before`);
});

test('seed 159: dire→dirlo is the recorded stem+clitic exception, and only that', () => {
  assert.equal(T.containsWords('sto provando a dirlo diversamente', 'sto provando a dire', { clitic: false }), false, 'strict multiset check refuses dirlo');
  assert.equal(T.containsWords('sto provando a dirlo diversamente', 'sto provando a dire'), true, 'recorded exception accepts dirlo');
  assert.equal(T.containsWords('sto provando a dirgli diversamente', 'sto provando a dire'), true);
  assert.equal(T.containsWords('sto provando a dico diversamente', 'sto provando a dire'), false, 'a conjugated form is not the exception');
  assert.equal(T.containsWords('sto provando a farlo', 'sto provando a fare'), false, 'only dire is recorded');
  for (const c of T.CHANGES.filter(c => c.rule === 2)) assert.match(c.after.target, /\bdirlo\b/, c.id);
});

test('tell / answer: it ↔ lo, that ↔ quello, this ↔ questo; conjunction "that" is not the rule', () => {
  assert.equal(T.tellAnswerClassify("I couldn't answer that", 'non riuscivo a rispondere a questo').ok, false);
  assert.equal(T.tellAnswerClassify("I couldn't answer this", 'non riuscivo a rispondere a questo').ok, true);
  assert.equal(T.tellAnswerRewrite("she said I couldn't answer that", T.tellAnswerClassify("she said I couldn't answer that", 'ha detto che non riuscivo a rispondere a questo')), "she said I couldn't answer this");
  assert.equal(T.tellAnswerClassify('I told you that, so I hope you think about it', 'ti ho detto questo, quindi spero che ci pensi').ok, false);
  assert.equal(T.tellAnswerClassify('I told you this, so I hope you think about it', 'ti ho detto questo, quindi spero che ci pensi').ok, true);
  assert.equal(T.tellAnswerClassify('I think it wasn\'t easy to know how to answer that', 'penso che non fosse facile sapere come rispondere a quello').ok, true);
  assert.equal(T.tellAnswerClassify('I don\'t know who was trying to tell you that', 'non so chi era che stava cercando di dirti quello').ok, true);
  // conjunction / determiner: not this rule
  assert.equal(T.tellAnswerClassify('she told me that it was a mistake', 'mi ha detto che era un errore').scope, null);
  assert.equal(T.tellAnswerClassify('guess who told me that story', 'indovina chi mi ha raccontato quella storia').scope, null);
  // English drops the object for an Italian lo: natural both sides, listed only
  assert.equal(T.tellAnswerClassify("if you'd told me", "se me l'avessi detto").scope, 'tell-no-object');
});

test('come si dice questa → questo unless a feminine noun follows', () => {
  assert.equal(T.questaDefect('come si dice questa?'), true);
  assert.equal(T.questaDefect('puoi dirmi come si dice questa?'), true);
  assert.equal(T.questaDefect('come si dice questa parola in italiano?'), false);
  assert.equal(T.questaDefect('come si dice questo?'), false);
  assert.equal(T.questaFix('come si dice questa nello stesso modo?'), 'come si dice questo nello stesso modo?');
  assert.equal(T.questaFix('come si dice questa parola?'), 'come si dice questa parola?');
  for (const c of T.CHANGES.filter(c => c.rule === 4)) { assert.equal(T.questaDefect(c.before.target), true, c.id); assert.equal(T.questaDefect(c.after.target), false, c.id); }
});

test('the intro mirrors the grown LEGO', () => {
  assert.equal(T.NEW_INTRO_599.includes(`'${T.NEW_L01.known}'`), true);
  assert.equal("The Italian for: 'I would have been happy', is:".includes(`'${T.NEW_L01.known}'`), false);
});
