'use strict';
// Job #414·Q: a German/French LEGO whose English names the subject must carry that pronoun in the target, and every
// practice phrase under it must contain the grown LEGO (pronoun and verb, in whatever clause order the sentence needs).
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./deu-fra-verb-pronouns-2026-10-14.cjs');

const PRONOUN = { deu_for_eng: ['ich', 'du', 'wir'], fra_for_eng: ['je', 'tu', 'il', 'ils'] };

test('every grown LEGO carries a subject pronoun, and its components tile the grown target', () => {
  let n = 0;
  for (const [course, legos] of Object.entries(T.GROW)) {
    for (const [id, [target, comps]] of Object.entries(legos)) {
      n++;
      assert.ok(T.norm(target).split(' ').some((w) => PRONOUN[course].includes(w)), `${id} "${target}" has no pronoun`);
      assert.equal(T.norm(comps.map((c) => c[1]).join(' ')).replace(/ /g, ''), T.norm(target).replace(/ /g, ''), `${id} components do not tile`);
    }
  }
  assert.equal(n, 21);
});

test('the pre-fix state (bare verb) fails the containment rule and the post-fix phrase set passes it', () => {
  // S0009L02 "I speak | spreche" before; "ich spreche" after. A phrase with no pronoun cannot sit under the grown LEGO.
  assert.equal(T.containsWords('Spreche Deutsch', 'ich spreche'), false);
  assert.equal(T.containsWords('Ich spreche Deutsch', 'ich spreche'), true);
  // verb-final clauses keep the pronoun earlier in the clause — that is correct German
  assert.equal(T.containsWords('ich denke, dass wir bald gehen sollten', 'wir sollten'), true);
  // inverted question order is also containment
  assert.equal(T.containsWords('Meinst du dieses', 'du meinst'), true);
  // French elision: qu'ils contains ils
  assert.equal(T.containsWords("j'aimerais qu'ils ne jouent pas si souvent", 'ils ne jouent pas'), true);
  assert.equal(T.containsWords("elle aimerait savoir", 'il aimerait'), false);
});

test('buildOps: text edits first, then an audio.link per slot the render route answered', () => {
  const dump = {
    legos: [{ lego_id: 'S0009L02', seed_number: 9, lego_index: 2, known_text: 'I speak', target_text: 'spreche' }],
    phrases: [],
  };
  const saveG = T.GROW.deu_for_eng, saveP = T.PHRASES.deu_for_eng;
  T.GROW.deu_for_eng = { S0009L02: saveG.S0009L02 }; T.PHRASES.deu_for_eng = [];
  try {
    const ops = T.buildOps('deu_for_eng', dump, { 'target1|ich spreche': 'aaa', 'target2|ich spreche': 'bbb' });
    assert.deepEqual(ops.map((o) => o.op), ['lego.update', 'audio.link', 'audio.link']);
    assert.equal(ops[0].set.target_text, 'ich spreche');
    assert.equal(ops[0].expect.target_text, 'spreche');
    assert.equal(ops[1].slot, 'target1');
  } finally { T.GROW.deu_for_eng = saveG; T.PHRASES.deu_for_eng = saveP; }
});

test('held LEGOs are not also grown', () => {
  for (const c of Object.keys(T.GROW)) for (const id of Object.keys(T.HELD[c])) assert.ok(!T.GROW[c][id], `${id} is both held and grown`);
});
