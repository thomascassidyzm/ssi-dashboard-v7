/**
 * Unit tests for the pure half of edit-impact-check.
 *
 * The DB-facing half (trigger facts, audio_id_for_text prediction, collision
 * checks) is verified by replay against real applied edits — see
 * docs/specs/edit-impact-check-2026-08-17.md §"Proving it against reality".
 * These tests cover the two computations that are pure functions of the course
 * snapshot: the course-wide tiling blast radius, and taught-late/used-early.
 *
 *   node --test tools/edit-impact-check.test.cjs
 */

const test = require('node:test');
const assert = require('node:assert');

const { tilingBlastRadius, orderingCheck, words } = require('./edit-impact-check.cjs');

// A miniature course: seed 1 teaches "to speak", seeds 2-3 build phrases on it.
function snap() {
  return {
    courseCode: 'tst_for_eng',
    chinese: false,
    seeds: [
      { seed_number: 1, known_text: 'kk one', target_text: 'I want to speak' },
      { seed_number: 2, known_text: 'kk two', target_text: 'I want to speak now' },
      { seed_number: 3, known_text: 'kk three late', target_text: 'I want to speak with you' },
    ],
    legos: [
      { seed_number: 1, lego_index: 1, known_text: 'kk want', target_text: 'I want', type: 'M', components: null },
      { seed_number: 1, lego_index: 2, known_text: 'kk speak', target_text: 'to speak', type: 'M', components: null },
      { seed_number: 2, lego_index: 1, known_text: 'kk now', target_text: 'now', type: 'A', components: null },
      { seed_number: 3, lego_index: 1, known_text: 'kk late with', target_text: 'with you', type: 'M', components: null },
    ],
    phrases: [
      { id: 'p1', seed_number: 1, lego_index: 2, phrase_role: 'build', known_text: 'a', target_text: 'I want to speak' },
      { id: 'p2', seed_number: 2, lego_index: 1, phrase_role: 'use', known_text: 'b', target_text: 'I want to speak now' },
      { id: 'p3', seed_number: 3, lego_index: 1, phrase_role: 'use', known_text: 'c', target_text: 'I want to speak with you' },
      { id: 'p4', seed_number: 2, lego_index: 1, phrase_role: 'build', known_text: 'd', target_text: 'I want now' },
    ],
  };
}

test('no removed chunk => no breakage, and we say so rather than reporting a hollow pass', () => {
  const r = tilingBlastRadius(snap(), 1, new Set());
  assert.strictEqual(r.broken.length, 0);
  assert.match(r.note, /No vocab unit removed/);
});

test('removing a chunk breaks every phrase course-wide that tiles through it, not just the seed\'s own', () => {
  const r = tilingBlastRadius(snap(), 1, new Set(['to speak']));
  const ids = r.broken.map(b => b.phrase_id).sort();
  // p1 (the edited seed's own), p2 and p3 — downstream, in later seeds.
  assert.deepStrictEqual(ids, ['p1', 'p2', 'p3']);
  // p4 does not use the removed chunk and must not be reported.
  assert.ok(!ids.includes('p4'));
  // The downstream ones are the point: a check that stops at the edited seed
  // would report 1 of 3.
  assert.ok(r.broken.some(b => b.seed > 1));
});

test('the walk respects tile-then-add ordering, so a seed is checked against PRIOR vocab', () => {
  // Removing "with you" (taught at seed 3) must not retroactively break seeds 1-2.
  const r = tilingBlastRadius(snap(), 3, new Set(['with you']));
  assert.ok(r.broken.every(b => b.seed >= 3), 'nothing before fromSeed may be reported');
});

test('taught late, used early — the Gap 4 shape', () => {
  // "late" is taught by the seed-3 LEGO (kk late with) but already used in seed 3's
  // own seed text... construct the real shape: a form used before its teaching seed.
  const s = snap();
  s.seeds[0].known_text = 'kk one late';   // used at seed 1
  const rows = orderingCheck(s, 'known', ['late'], 3);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].taught_at_seed, 3);
  assert.strictEqual(rows[0].first_used_at_seed, 1);
  assert.ok(rows[0].uses_before_taught >= 1);
});

test('a form the course never teaches is reported, not silently passed', () => {
  const s = snap();
  s.seeds[0].known_text = 'kk one neverTaught';
  const rows = orderingCheck(s, 'known', ['nevertaught'], 1);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].taught_at_seed, null);
});

test('a form both taught early and used later is NOT reported', () => {
  const rows = orderingCheck(snap(), 'known', ['want'], 1);
  assert.deepStrictEqual(rows, []);
});

test('tokenisation is script-agnostic — Sinhala and Arabic are not tokenised to nothing', () => {
  // The known-side gate's tokenizeKnown splits on an ASCII-only class, which makes
  // it inert for 31 courses. This tool must not inherit that.
  assert.deepStrictEqual(words('ඒත් මට මගේ අම්මව'), ['ඒත්', 'මට', 'මගේ', 'අම්මව']);
  assert.deepStrictEqual(words('أريد أن أتكلم'), ['أريد', 'أن', 'أتكلم']);
  assert.deepStrictEqual(words('I want, to speak.'), ['i', 'want', 'to', 'speak']);
});
