// node --test tools/course-optimization/rechunk-short-legos/lib.test.cjs   (no network)
// Proves the progress rule: a re-chunk never renumbers, never reuses an index, and names every learner
// whose stored position sits on a LEGO changed in place.
const test = require('node:test')
const assert = require('node:assert')
const L = require('./lib.cjs')

const seed108 = { known_text: "We didn't hope to wake in the middle of the night.", target_text: 'Ons het nie gehoop om in die middel van die nag wakker te word nie.' }
const before108 = [
  { idx: 1, type: 'A', known: 'of', target: 'van', is_new: true },
  { idx: 2, type: 'A', known: 'in the middle of', target: 'middel', is_new: true },
]
const merge108 = { delete: [1], set: { 2: { type: 'M', known: 'in the middle of', target: 'in die middel van', components: [{ known: 'in', target: 'in' }, { known: 'the', target: 'die' }, { known: 'middle', target: 'middel' }, { known: 'of', target: 'van' }] } } }
const syl = (t) => L.words(t).length * 1.5

test('a merge keeps the highest index and renumbers nothing', () => {
  assert.deepStrictEqual(L.checkOp(seed108, before108, merge108, { estimateSyllables: syl }), [])
  const after = L.afterLegos(before108, merge108)
  assert.deepStrictEqual(after.map((l) => [l.idx, l.target]), [[2, 'in die middel van']])
})

test('an added LEGO may not reuse an index that existed before', () => {
  const op = { delete: [1], add: [{ idx: 1, type: 'M', known: 'in the middle of', target: 'in die middel van', components: merge108.set[2].components }] }
  assert.ok(L.checkOp(seed108, before108, op, {}).some((p) => /never reuse an index/.test(p)))
})

test('a LEGO may only carry words its seed says, on both sides (L26), and no parentheses', () => {
  const op = { set: { 2: { type: 'M', known: 'in the middle of the day', target: 'in die middel van die dag', components: [{ known: 'a', target: 'a' }, { known: 'b', target: 'b' }] } } }
  const p = L.checkOp(seed108, before108, op, {})
  assert.ok(p.some((x) => /known side has words/.test(x)) && p.some((x) => /target side has words/.test(x)))
  const paren = { set: { 2: { type: 'A', known: 'middle (noun)', target: 'middel' } } }
  assert.ok(L.checkOp(seed108, before108, paren, {}).some((x) => /parentheses/.test(x)))
})

test('coverage never shrinks: deleting a piece nothing else teaches is refused', () => {
  const op = { delete: [1] }   // "van" would be taught by no LEGO of the seed
  assert.ok(L.checkOp(seed108, before108, op, {}).some((x) => /coverage: "van"/.test(x)))
})

test('the syllable cap rejects (L3)', () => {
  assert.ok(L.checkOp(seed108, before108, merge108, { estimateSyllables: () => 9 }).some((x) => /cap 8/.test(x)))
})

test('cursorConflicts names learners on an in-place change, never on a deleted or added LEGO', () => {
  const cursors = [
    { learner_id: 'a', last_completed_lego_id: 'S0108L02', highest_completed_lego_id: 'S0108L02' },  // on the changed LEGO
    { learner_id: 'b', last_completed_lego_id: 'S0108L01', highest_completed_lego_id: 'S0200L01' },  // on the deleted one: falls back
    { learner_id: 'c', last_completed_lego_id: 'S0300L01', highest_completed_lego_id: 'S0108L02' },  // ceiling on it
  ]
  assert.deepStrictEqual(L.cursorConflicts(108, merge108, cursors).map((c) => c.learner_id), ['a', 'c'])
})

test('phrase ids continue after the highest ever issued and never collide', () => {
  const ids = ['afr_for_eng:S0010L02U01', 'afr_for_eng:S0010L02U05', 'afr_for_eng:S0010L02B03']
  assert.deepStrictEqual(L.allocateIds('afr_for_eng', 10, 2, 'use', 2, ids), ['afr_for_eng:S0010L02U06', 'afr_for_eng:S0010L02U07'])
  assert.deepStrictEqual(L.allocateIds('afr_for_eng', 10, 2, 'build', 1, ids), ['afr_for_eng:S0010L02B04'])
})

test('undo re-inserts a JSON array as JSON, and a Postgres array as an array', () => {
  const components = [{ known: 'of', target: 'van' }]
  assert.strictEqual(L.sqlValue(true, components), JSON.stringify(components))   // course_legos.components (jsonb)
  assert.deepStrictEqual(L.sqlValue(false, ['S0001L01']), ['S0001L01'])           // connected_lego_ids (text[])
  assert.strictEqual(L.sqlValue(true, null), null)
})

test('a clone keeps the <target>_for_<known> shape the app parses, and never touches Welsh', () => {
  const { cloneCodeProblems, rewriteId } = require('./clone.cjs')
  assert.deepStrictEqual(cloneCodeProblems('afr_for_eng', 'afr_pilot_for_eng'), [])
  assert.ok(cloneCodeProblems('afr_for_eng', 'zzz_afr_for_eng').length)      // target prefix lost
  assert.ok(cloneCodeProblems('afr_for_eng', 'afr_for_eng_pilot').length)     // known side would read "eng_pilot"
  assert.ok(cloneCodeProblems('cym_n_for_eng', 'cym_pilot_for_eng').length)
  assert.strictEqual(rewriteId('afr_for_eng:S0010L02U01', 'afr_for_eng', 'afr_pilot_for_eng'), 'afr_pilot_for_eng:S0010L02U01')
})
