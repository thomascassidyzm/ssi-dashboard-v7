// node --test tools/course-optimization/ita-capitals-lowercase-2026-09-29.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { lowerFirst, targetOutliers, caseOnlyFixes } = require('./ita-capitals-lowercase-2026-09-29.cjs');

test('lowerFirst handles accented capitals', () => {
  assert.strictEqual(lowerFirst('È stato bello'), 'è stato bello');
  assert.strictEqual(lowerFirst('Perché no?'), 'perché no?');
});
test('outliers: capital-initial flagged, proper noun and lowercase not', () => {
  const rows = ['Perché no', 'africa', 'Africa', 'è così'].map((t) => ({ target_text: t }));
  assert.deepStrictEqual(targetOutliers(rows).map((r) => r.target_text), ['Perché no']);
});
test('case-only pair: minority moves to dominant; a tie goes lowercase', () => {
  const r = (id, k) => ({ id, known_text: k });
  const a = caseOnlyFixes([r(1, 'an interesting book'), r(2, 'an interesting book'), r(3, 'An interesting book')], 'known_text');
  assert.deepStrictEqual(a.map((f) => [f.row.id, f.to]), [[3, 'an interesting book']]);
  const b = caseOnlyFixes([r(1, 'Why so?'), r(2, 'why so?')], 'known_text');
  assert.deepStrictEqual(b.map((f) => [f.row.id, f.to]), [[1, 'why so?']]);
});
