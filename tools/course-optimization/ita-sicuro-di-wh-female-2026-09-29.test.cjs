'use strict';
// node --test tools/course-optimization/ita-sicuro-di-wh-female-2026-09-29.test.cjs
// The female reading moves only the SPEAKER's own forms. The live seed-80 expansions said "sicura … sarò pronto",
// which this rule rejects; the clips (and Italian) say "pronta".
const test = require('node:test');
const assert = require('node:assert');
const { femaleReading } = require('./ita-sicuro-di-wh-female-2026-09-29.cjs');

test('speaker forms take the feminine', () => {
  assert.strictEqual(femaleReading('non sono sicuro di quando sarò pronto'), 'non sono sicura di quando sarò pronta');
  assert.strictEqual(femaleReading('voglio darglielo ma non sono sicuro di quando'), 'voglio darglielo ma non sono sicura di quando');
  assert.notStrictEqual(femaleReading('non sono sicuro di quando sarò pronto'), 'non sono sicura di quando sarò pronto'); // the old stored expansion
});
test('somebody else stays masculine', () => {
  for (const t of ['nessuno era sicuro di come rispondere', 'penso che nessuno fosse sicuro di che cosa fare', 'non era sicuro di quello che stavano facendo'])
    assert.strictEqual(femaleReading(t), t);
});
