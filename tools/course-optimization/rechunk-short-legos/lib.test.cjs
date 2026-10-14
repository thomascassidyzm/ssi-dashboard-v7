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

test('unspaced scripts are checked by character, not as one giant word (job #321)', () => {
  const seed = { known_text: 'I speak a little Chinese now', target_text: '我现在会说一点中文' }
  const before = [{ idx: 1, type: 'A', known: 'can', target: '会', is_new: true }]
  const ok = { set: { 1: { type: 'M', known: 'speak', target: '会说', components: [{ known: 'a', target: '会' }, { known: 'b', target: '说' }] } } }
  assert.deepStrictEqual(L.checkOp(seed, before, ok, {}).filter((p) => /target side|coverage/.test(p)), [])
  const bad = { set: { 1: { type: 'M', known: 'speak', target: '会读', components: [{ known: 'a', target: '会' }, { known: 'b', target: '读' }] } } }
  assert.ok(L.checkOp(seed, before, bad, {}).some((p) => /target side has words/.test(p)))
})

test('op.seedTarget: a LEGO is checked against the seed sentence as it will read (S42 laas nag, job #329)', () => {
  const seed42 = { known_text: 'I was starting to feel better than last night.', target_text: 'Ek het begin om beter te voel as verlede nag.' }
  const before42 = [{ idx: 1, type: 'A', known: 'night', target: 'nag', is_new: true }]
  const op = { seedTarget: 'Ek het begin om beter te voel as laas nag.', set: { 1: { type: 'M', known: 'last night', target: 'laas nag', components: [{ known: 'last', target: 'laas' }, { known: 'night', target: 'nag' }] } } }
  assert.ok(L.checkOp(seed42, before42, { set: op.set }, {}).some((p) => /target side has words/.test(p)), 'without seedTarget the old sentence refuses laas')
  assert.deepStrictEqual(L.checkOp(seed42, before42, op, {}), [])
})

// ── undo safety (lane review #338, job #321) ──────────────────────────────────────────────────────
test('undo never restores a rolled-back attempt: attempts pair with explicit commit/rollback outcomes', () => {
  const A = (seed, id, extra = {}) => ({ seed, attemptId: id, before: { x: id }, ...extra })
  // a committed attempt, then a later attempt on the same seed that rolled back: undo targets the COMMITTED one
  let m = L.undoableAttempts([A(5, 'a1'), { action: 'committed', seed: 5, attemptId: 'a1', afterDigest: 'd1' }, A(5, 'a2'), { action: 'rolled-back', seed: 5, attemptId: 'a2' }])
  assert.strictEqual(m.get(5).attemptId, 'a1')
  // a lone attempt that rolled back (or crashed with no outcome) is never undoable
  assert.strictEqual(L.undoableAttempts([A(6, 'b1'), { action: 'rolled-back', seed: 6, attemptId: 'b1' }]).has(6), false)
  assert.strictEqual(L.undoableAttempts([A(7, 'c1')]).has(7), false)
  // legacy ledger (no attemptId): a rolled-back marker cancels the attempt just before it; an unmarked one counts as committed
  m = L.undoableAttempts([{ seed: 8, before: { v: 1 } }, { seed: 8, action: 'rolled-back' }])
  assert.strictEqual(m.has(8), false)
  assert.strictEqual(L.undoableAttempts([{ seed: 9, before: { v: 1 } }]).has(9), true)
  // undone removes it
  assert.strictEqual(L.undoableAttempts([A(5, 'a1'), { action: 'committed', seed: 5, attemptId: 'a1' }, { action: 'undone', seed: 5 }]).has(5), false)
})

test('undo refuses on drift of ANY row it would overwrite, not just LEGO text', () => {
  const state = { seed: { seed_number: 4, version: 3 }, legos: [{ lego_index: 1, known_text: 'a', target_text: 'b', target1_audio_id: null }], phrases: [{ id: 'p1', known_text: 'k', target_text: 't', position: 1, target1_audio_id: null }], intros: [] }
  const d = L.stateDigest(state)
  // audio pointers, timestamps and the edit-event stamp are not content: filling audio must not trip the guard
  const filled = JSON.parse(JSON.stringify(state)); filled.phrases[0].target1_audio_id = 'x'; filled.phrases[0].updated_at = 'now'; filled.seed.version = 9
  assert.strictEqual(L.stateDigest(filled), d)
  // a phrase edited after the apply IS drift
  const edited = JSON.parse(JSON.stringify(state)); edited.phrases[0].target_text = 'changed'
  assert.notStrictEqual(L.stateDigest(edited), d)
  const added = JSON.parse(JSON.stringify(state)); added.phrases.push({ id: 'p2', known_text: 'k2', target_text: 't2', position: 2 })
  assert.notStrictEqual(L.stateDigest(added), d)
  assert.strictEqual(L.driftProblem({ afterDigest: d }, state), null)
  assert.ok(/drift/.test(L.driftProblem({ afterDigest: d }, edited)))
  assert.strictEqual(L.driftProblem({}, edited), 'legacy')   // a ledger line with no recorded post-state cannot be checked
})

test('(#539a) the digest ignores lego_introductions, but a ledger digest written WITH intros still verifies', () => {
  const state = { seed: { seed_number: 4 }, legos: [{ lego_index: 1, known_text: 'a', target_text: 'b' }], phrases: [], intros: [] }
  const d = L.stateDigest(state)
  const mirrored = JSON.parse(JSON.stringify(state)); mirrored.intros.push({ lego_id: 'S0004L01', audio_uuid: 'u' })
  assert.strictEqual(L.stateDigest(mirrored), d)
  assert.strictEqual(L.driftProblem({ afterDigest: d }, mirrored), null)
  const old = L.stateDigest(state, { withIntros: true })   // what apply recorded before this fix
  assert.strictEqual(L.driftProblem({ afterDigest: old }, state), null)
  assert.ok(/drift/.test(L.driftProblem({ afterDigest: old }, mirrored)))   // old lines keep their old strictness
})
