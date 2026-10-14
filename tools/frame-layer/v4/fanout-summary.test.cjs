const test = require('node:test');
const assert = require('node:assert');
const { countDrops } = require('./fanout-summary.cjs');

test('each dropped row counts once, however many reasons it carries', () => {
  const staged = { dropped_rows: [
    { reasons: ['zut clash', 'vocab unknown'] },           // two gate reasons, one row
    { reasons: ['containment'] },
    { reasons: ['judge:opus meaning NO'] },
    { reasons: ['zut clash', 'judge:opus tier 3'] },       // any judge reason → judge cut
  ] };
  assert.deepStrictEqual(countDrops(staged), { gate: 2, judge: 2 });
});

test('no dropped rows → zero', () => {
  assert.deepStrictEqual(countDrops({}), { gate: 0, judge: 0 });
});
