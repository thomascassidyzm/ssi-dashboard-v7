/**
 * THE RULE: interjections earn nothing.
 *
 * A naive position-spread scorer (the v3 POS/NEIGH axes: distinct positions of
 * the LEGO in its phrase, distinct neighbours) pays for "thank you, I want to
 * go" over "I want to go" — the LEGO moved from initial to medial and gained a
 * new left neighbour. The v4 window scorer must give the stapled set exactly
 * what it gives the clean set: same frames, same coverage, and it must count
 * the staples so a report can show them.
 *
 * Run: node --test tools/frame-layer/v4/window-coverage.test.cjs
 */
const test = require('node:test');
const assert = require('node:assert');
const { scoreWindow, stripInterjections, framesOf } = require('./window-coverage.cjs');
const { walk } = require('../pattern-diversity.cjs');

const clean = [
  { known_text: 'I want to go', phrase_role: 'use' },
  { known_text: 'I want to see the forest', phrase_role: 'use' },
  { known_text: 'we could go to the forest', phrase_role: 'use' },
];
const stapled = [
  { known_text: 'thank you, I want to go', phrase_role: 'use' },
  { known_text: 'unfortunately I want to see the forest', phrase_role: 'use' },
  { known_text: 'no problem, we could go to the forest', phrase_role: 'use' },
];
const AVAILABLE = ['P1', 'P4', 'P23', 'P28'];

// The naive scorer this rule is written against: v3's position axis. Lego "I want".
function naivePositionSpread(phrases, lego) {
  const poss = new Set(phrases.map(p => walk(p.known_text, lego).pos).filter(p => p !== 'absent'));
  return poss.size / 3;
}

test('a naive position-spread scorer pays for a stapled interjection', () => {
  const a = naivePositionSpread(clean.slice(0, 2), 'I want');
  const b = naivePositionSpread([stapled[0], clean[1]], 'I want'); // one staple moves the LEGO off initial
  assert.ok(b > a, `naive scorer should reward the staple (clean ${a}, stapled ${b}) — this is the defect v4 removes`);
});

test('the v4 window scorer gives the stapled set exactly the clean set\'s frames and coverage', () => {
  const a = scoreWindow(clean, AVAILABLE);
  const b = scoreWindow(stapled, AVAILABLE);
  assert.deepStrictEqual(b.used_ids, a.used_ids);
  assert.strictEqual(b.coverage, a.coverage);
  assert.strictEqual(a.interjection_openers, 0);
  assert.strictEqual(b.interjection_openers, 3);
});

test('"I am sorry but" does not buy the because/so/but frame', () => {
  assert.ok(!framesOf('I am sorry but I want to go').includes('P15'));
  assert.ok(framesOf('I want to go but I cannot').includes('P15'));
});

test('strip is bounded and leaves the remainder intact', () => {
  assert.deepStrictEqual(stripInterjections('well, of course, I want to go'), { text: 'I want to go', stripped: ['well', 'of course'] });
  assert.deepStrictEqual(stripInterjections('I want to go'), { text: 'I want to go', stripped: [] });
  assert.deepStrictEqual(stripInterjections('nobody wants to go').stripped, []);
});

test('coverage is over the AVAILABLE frames, not all 31', () => {
  const r = scoreWindow(clean, ['P1', 'P4', 'P17']);
  assert.strictEqual(r.available, 3);
  assert.deepStrictEqual(r.used_ids, ['P1', 'P4']);
  assert.deepStrictEqual(r.missing_ids, ['P17']);
  assert.strictEqual(r.coverage, 0.667);
});
