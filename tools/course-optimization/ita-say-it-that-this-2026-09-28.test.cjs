// tools/course-optimization/ita-say-it-that-this-2026-09-28.test.cjs
//   node --test tools/course-optimization/ita-say-it-that-this-2026-09-28.test.cjs
// Kai's pronoun rule (2026-09-28): the OLD rows fail it and the rewritten rows pass it, seen both ways.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./ita-say-it-that-this-2026-09-28.cjs');
const ok = (k, t) => T.classify(k, t).ok && T.classify(k, t).scope;
const rewrite = (k, t) => T.rewriteKnown(k, T.classify(k, t));

test('say it ↔ dirlo / lo: the old "say that" glosses fail, the rewrite passes', () => {
  assert.equal(T.classify('could you say that?', 'potresti dirlo?').ok, false);            // old S0061L02B01
  assert.equal(rewrite('could you say that?', 'potresti dirlo?'), 'could you say it?');
  assert.equal(ok('could you say it?', 'potresti dirlo?'), 'lo');
  assert.equal(T.classify("I wouldn't have said that", "non l'avrei detto").ok, false);   // old S0153L01U01
  assert.equal(rewrite("I wouldn't have said that", "non l'avrei detto"), "I wouldn't have said it");
  assert.equal(ok("I've forgotten how to say it in Italian", 'ho dimenticato come dirlo in italiano'), 'lo');
});
test('say that ↔ dire quello and say this ↔ dire questo', () => {
  assert.equal(T.classify('I didn\'t want to say it to anyone', 'non volevo dire quello a nessuno').ok, false);  // old S0071L04U03
  assert.equal(rewrite('I didn\'t want to say it to anyone', 'non volevo dire quello a nessuno'), 'I didn\'t want to say that to anyone');
  assert.equal(ok('I asked how to say that', 'ho chiesto come dire quello'), 'quello');
  assert.equal(T.classify('I want to know how to say it', 'voglio sapere come dire questo').ok, false);          // old S0056L02U01
  assert.equal(rewrite('I want to know how to say it', 'voglio sapere come dire questo'), 'I want to know how to say this');
  assert.equal(rewrite('I woke up when you said that', 'mi sono svegliato quando hai detto questo'), 'I woke up when you said this');
});
test('not this rule: conjunction "that", relative "quello che", tell + pronoun, come si dice', () => {
  assert.equal(T.classify('he said that he wanted to tell you', 'ha detto che voleva dirti').scope, null);
  assert.equal(T.classify('to say what I mean', 'dire quello che intendo').scope, null);
  assert.equal(T.classify('he wanted me to tell you', 'voleva che te lo dicessi').scope, 'tell');
  assert.equal(T.classify('how do you say that in Italian?', 'come si dice quello in italiano?').scope, 'come-si-dice');
  assert.equal(T.classify('she said she doesn\'t want it any more', 'ha detto che non lo vuole più').scope, null);
});
test('intro rewording is exact-quote, own-seed, and never touches a conjunction line', () => {
  const fixes = [{ id: 'S0061', kind: 'seed', seed: 61, role: null, known: 'could you say that again a little more slowly?', to: 'could you say it again a little more slowly?', scope: 'lo' },
                 { id: 'S0615L03C02', kind: 'phrase', seed: 615, role: 'component', known: 'that', to: 'it', scope: 'lo' }];
  assert.equal(T.rewriteIntro("The Italian for: 'a little more slowly', as in — 'could you say that again a little more slowly?', is:", fixes), "The Italian for: 'a little more slowly', as in — 'could you say it again a little more slowly?', is:");
  assert.equal(T.rewriteIntro("The Italian for: 'that', as in — 'that young woman', is:", fixes, null, ['S0306L01C01']), "The Italian for: 'that', as in — 'that young woman', is:");
  assert.equal(T.rewriteIntro("The Italian for: 'to say that you thought', is:", fixes), "The Italian for: 'to say that you thought', is:");
});
