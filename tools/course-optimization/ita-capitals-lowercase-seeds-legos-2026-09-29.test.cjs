// node --test tools/course-optimization/ita-capitals-lowercase-seeds-legos-2026-09-29.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { lowerFirst, targetOutliers } = require('./ita-capitals-lowercase-2026-09-29.cjs');
const { zutClashes } = require('./ita-capitals-lowercase-seeds-legos-2026-09-29.cjs');

test('seed openers: È / Perché / A lowercased; Africa kept', () => {
  const rows = ['È importante', 'A mia madre piace leggere', 'Africa', 'è già'].map((t) => ({ target_text: t }));
  assert.deepStrictEqual(targetOutliers(rows).map((r) => lowerFirst(r.target_text)), ['è importante', 'a mia madre piace leggere']);
});
test('lowercasing never creates a ZUT clash, only removes a case-only one', () => {
  const rows = [{ known_text: 'it is', target_text: 'È' }, { known_text: 'it is', target_text: 'è' }];
  assert.strictEqual(zutClashes(rows), 1);
  assert.strictEqual(zutClashes(rows.map((r) => ({ ...r, target_text: lowerFirst(r.target_text) }))), 0 + 0);
});
