'use strict';
// node --test tools/course-optimization/ita-grow-subject-legos-2026-09-28.test.cjs
// Pure-rule tests for Kai's approval of 2026-09-28 22:20Z (job #622·I): the five subject-word LEGOs grow.
// No DB. The plan is exercised on the LIVE text of the rows as it stood BEFORE the job, so the
// "before" assertions FAIL against the pre-fix content and the "after" assertions PASS on the plan.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-grow-subject-legos-2026-09-28.cjs');

const BEFORE = [
  { kind: 'lego', sn: 347, id: 'S0347L01', known: 'was happening', target: 'stava succedendo', is_new: true, components: [{ known: 'was', target: 'stava' }, { known: 'happening', target: 'succedendo' }] },
  { kind: 'lego', sn: 347, id: 'S0347L02', known: 'a week ago', target: 'una settimana fa', is_new: true, components: [] },
  { kind: 'build', sn: 347, id: 'S0347L01B01', known: 'was happening', target: 'stava succedendo' },
  { kind: 'build', sn: 347, id: 'S0347L01B02', known: 'what was happening', target: 'che cosa stava succedendo' },
  { kind: 'build', sn: 347, id: 'S0347L01B03', known: 'he wanted to know what was happening', target: 'voleva sapere che cosa stava succedendo' },
  { kind: 'use', sn: 347, id: 'S0347L01U01', known: 'he wanted to know what was happening', target: 'voleva sapere che cosa stava succedendo' },
  { kind: 'use', sn: 347, id: 'S0347L01U05', known: "I'm sure she was worried about what was happening", target: 'sono sicuro che era preoccupata per quello che stava succedendo' },
  { kind: 'build', sn: 347, id: 'S0347L02B03', known: 'he wanted to know a week ago', target: 'voleva sapere che cosa stava succedendo una settimana fa' },
  { kind: 'use', sn: 347, id: 'S0347L02U02', known: 'I liked what was happening a week ago', target: 'mi piaceva quello che stava succedendo una settimana fa' },
  { kind: 'component', sn: 347, id: 'S0347L01C01', known: 'was', target: 'stava' },
];

test('the five grown LEGOs keep the old LEGO inside them, carry the subject word, tile the Italian, and stay is_new', () => {
  for (const L of T.LEGOS) {
    assert.ok(T.containsWords(L.to.known, L.from.known) && T.containsWords(L.to.target, L.from.target), L.id);
    assert.match(L.to.known, new RegExp(`\\b${L.subjectWord}\\b`), L.id);
    assert.ok(T.componentsTileTarget(L.to), `${L.id} components tile the Italian`);
    assert.equal(T.newComponentRow(L).known, L.subjectWord);
  }
  assert.equal(T.LEGOS.filter((L) => T.componentsTileKnown(L.to)).length, 4, 'every LEGO but S0367L01 tiles the English too');
  assert.ok(T.LEGOS.find((L) => L.id === 'S0367L01').literalKnownComponents, 'S0367L01 keeps its literal English glosses and says so');
});

test('BEFORE the fix, phrases under S0347L01 do not all contain the grown LEGO; AFTER the plan they do, with no duplicate', () => {
  const grown = T.LEGOS.find((L) => L.id === 'S0347L01').to;
  const before = BEFORE.filter((r) => r.id.startsWith('S0347L01') && (r.kind === 'build' || r.kind === 'use'));
  assert.ok(before.some((p) => !T.phraseContainsLego(p, grown)), 'pre-fix B01 "was happening" lacks "what"');
  const D = T.plan(BEFORE.filter((r) => r.sn === 347));
  const problems347 = D.problems.filter((p) => /S0347/.test(p));
  assert.deepEqual(problems347, [], problems347.join('\n'));
  const after = before.map((p) => { const c = T.PHRASES.find((x) => x.id === p.id); return c ? { ...p, ...c.after } : p; });
  assert.ok(after.every((p) => T.phraseContainsLego(p, grown)));
  assert.equal(new Set(after.map((p) => p.known.toLowerCase())).size, after.length, 'U01 no longer duplicates B03');
});

test('every planned phrase change contains its own LEGO on both sides, and no phrase from a held seed is touched', () => {
  const HELD = [201, 246, 348, 608, 618, 112, 126, 520, 396];
  for (const c of T.PHRASES) {
    assert.ok(!HELD.includes(c.seed), c.id);
    const L = T.LEGOS.find((x) => x.id === c.id.slice(0, 8));
    if (L) assert.ok(T.phraseContainsLego(c.after, L.to), `${c.id} "${c.after.known}" | "${c.after.target}"`);
  }
  // the knock-on S0347L02B03: Italian trimmed to what the English says, and L02 "a week ago | una settimana fa" still inside
  const b03 = T.PHRASES.find((c) => c.id === 'S0347L02B03');
  assert.equal(b03.after.target, 'voleva sapere una settimana fa');
});

test('the plan refuses live rows that no longer read as expected, and lists (never edits) the "quello che" relative rows', () => {
  const drifted = BEFORE.map((r) => (r.id === 'S0347L01' ? { ...r, known: 'it was happening' } : r));
  assert.ok(T.plan(drifted).problems.some((p) => /S0347L01: live reads/.test(p)));
  const D = T.plan(BEFORE);
  assert.ok(D.knockOn.some((k) => k.id === 'S0347L02U02' && /quello che/.test(k.target)));
  assert.ok(!T.PHRASES.some((c) => c.id === 'S0347L02U02'));
});
