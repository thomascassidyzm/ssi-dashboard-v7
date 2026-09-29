'use strict';
// node --test tools/course-optimization/ita-could-rule-2026-09-29.test.cjs
// The proving test for job #886·I: Kai's could rule FAILS on the pre-fix rows (the live text of 2026-09-29, taken from
// the plan's own before-texts) and PASSES once the plan is applied. riuscire rows and the held seed-312 rows are not judged.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./ita-could-rule-2026-09-29.cjs');

const kindOf = (id) => (/B\d+$/.test(id) ? 'build' : /C\d+$/.test(id) ? 'component' : /U\d+$/.test(id) ? 'use' : 'seed');
function preFix() {
  return [
    { kind: 'lego', sn: 313, id: 'S0313L01', known: 'he could', target: 'poteva' },
    { kind: 'lego', sn: 359, id: 'S0359L01', known: 'to turn', target: 'girare' },
    ...T.EDITS.map((e) => ({ kind: kindOf(e.id), sn: 0, id: e.id, known: e.before.known, target: e.before.target })),
    ...T.HELD.map((h) => ({ kind: kindOf(h.id), sn: 312, id: h.id, known: h.known, target: h.target })),
    { kind: 'use', sn: 311, id: 'S0311L01U02', known: "she couldn't explain what she wanted", target: 'non riusciva a spiegare quello che voleva' },
    { kind: 'use', sn: 644, id: 'S0644L01U01', known: 'could you say it sir?', target: 'potrebbe dirlo, signore?' },
  ];
}

test('the rule fails on the pre-fix rows', () => {
  const probs = T.endStateProblems(preFix());
  assert.ok(probs.some((p) => p.startsWith('S0314L01U01: think/sure + could')), probs.join('\n'));
  assert.ok(probs.some((p) => p.startsWith('S0358L02U03: think/sure + could')));
  assert.ok(probs.some((p) => p.startsWith('S0316L01U02: said + could')));
  assert.ok(probs.some((p) => p.startsWith('S0313L01 is not')));
});

test('the rule holds once the plan is applied', () => {
  assert.deepStrictEqual(T.endStateProblems(T.applyPlanToRows(preFix())), []);
});

test('every S0313L01 basket row carries the grown chunk on both sides (K33)', () => {
  for (const e of T.EDITS.filter((x) => x.lego === 'S0313L01')) {
    assert.ok(e.after.known.includes("he said that he couldn't"), e.id);
    assert.ok(e.after.target.includes('ha detto che non poteva'), e.id);
  }
});

test('the intro quotes the LEGO and a context that contains it', () => {
  assert.ok(T.LEGO.intro.includes(`'${T.LEGO.to.known}'`));
  assert.ok(T.LEGO.intro.includes("'he said that he couldn't watch all five games'"));
});

test('target1 speaks the female reading only where the speaker is named', () => {
  assert.strictEqual(T.femaleReading('sono sicuro che potrebbe raggiungere la cima'), 'sono sicura che potrebbe raggiungere la cima');
  assert.strictEqual(T.femaleReading('ha detto che non poteva'), 'ha detto che non poteva');
});

test('no plan row touches riuscire', () => {
  for (const e of T.EDITS) assert.ok(!/riusc/.test(e.before.target + e.after.target), e.id);
});
