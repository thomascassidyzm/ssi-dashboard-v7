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
const { scoreWindow } = require('./window-coverage.cjs');
const { installTags } = require('../tag-fixtures.cjs');
const { CODEX } = require('../frame-tagger.cjs');
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

// What the frame tagger returns for these texts, per the codex: an opener is
// marked O and tagged past, so the stapled text carries the clean text's frames.
// (Whether Haiku actually does this is measured on the gold set: opener accuracy 0.99.)
installTags({
  'I want to go': ['P1'], 'I want to see the forest': ['P1'], 'we could go to the forest': ['P4'],
  'thank you, I want to go': { frames: ['P1'], opener: true },
  'unfortunately I want to see the forest': { frames: ['P1'], opener: true },
  'no problem, we could go to the forest': { frames: ['P4'], opener: true },
});

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

test('the codex tells the tagger that openers earn nothing, with the hard cases spelled out', () => {
  const rule = CODEX.general_rules.find(r => r.startsWith('OPENER'));
  assert.ok(rule, 'the codex carries the opener rule');
  for (const s of ["'no one came'", "'but for you'", "'thank you,'", "'no problem'"]) assert.ok(rule.includes(s), `opener rule names ${s}`);
  const p15 = CODEX.frames.find(f => f.id === 'P15');
  assert.ok(p15.near_misses.some(n => n.text.startsWith('but ') && n.why.includes('opener')), 'P15 names a leading "but" as an opener, not the frame');
});

test('coverage is over the AVAILABLE frames, not all 31', () => {
  const r = scoreWindow(clean, ['P1', 'P4', 'P17']);
  assert.strictEqual(r.available, 3);
  assert.deepStrictEqual(r.used_ids, ['P1', 'P4']);
  assert.deepStrictEqual(r.missing_ids, ['P17']);
  assert.strictEqual(r.coverage, 0.667);
});
