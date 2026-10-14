const test = require('node:test');
const assert = require('node:assert');
const { isHeSheOnly, selectRestores } = require('./restore-he-she.cjs');

const PAN = 'Punjabi pronoun gender unmarked; English commits to he/she, answer is a guess';

test('a row cut only because the pronoun is gender-silent is restored', () => {
  assert.ok(isHeSheOnly(PAN, { target_text: 'Why did she send a message?' }));
  assert.ok(isHeSheOnly("తన ambiguous gender; English 'his' is a guess", { target_text: 'it\'ll be like this for his sister' }));
});

test('other faults stay cut: ਜੀ→sir, tense, had-to, and rows with no he/she at all', () => {
  assert.ok(!isHeSheOnly("ਜੀ alone is gender-neutral honorific; English 'sir' is a guess", { target_text: 'He might be busy, sir.' }));
  assert.ok(!isHeSheOnly("'needed to' vs પડ્યું 'had to'; gender guess", { target_text: 'she needed to run' }));
  assert.ok(!isHeSheOnly(PAN, { target_text: "you'll all be able to go this evening" }));
});

test('selectRestores numbers over the pre-judge set, 1-based', () => {
  const pre = [{ target_text: 'a' }, { target_text: 'He left' }];
  assert.deepStrictEqual(selectRestores([{ n: 2, why: PAN }, { n: 1, why: PAN }], pre), [pre[1]]);
});
