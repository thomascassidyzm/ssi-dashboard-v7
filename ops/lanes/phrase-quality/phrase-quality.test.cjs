// node ops/lanes/phrase-quality/phrase-quality.test.cjs — no DB; the gate is injected.
'use strict'
const assert = require('assert')
const { zutKey, zutGroups, inScope, USE_FLOOR } = require('./lib.cjs')
const { plan } = require('./gate-change.cjs')

// REGRESSION (lane review #420): Arabic tashkeel must not split a ZUT group. أريد and أُريد are one
// known; with two different targets they ARE a collision.
assert.equal(zutKey('أُريد', 'eng_for_ara'), zutKey('أريد', 'eng_for_ara'))
const g = zutGroups([
  { id: 'eng_for_ara:S0005L01B01', role: 'build', seed_number: 5, known_text: 'أريد', target_text: 'I want' },
  { id: 'eng_for_ara:S0009L02B03', role: 'build', seed_number: 9, known_text: 'أُريد', target_text: 'I would like' },
], 'eng_for_ara', 1, 20)
assert.equal(g.length, 1, 'one collision group across the tashkeel difference')
assert.equal(g[0].rows.length, 2)
// component rows are exempt on the known side
assert.equal(zutGroups([{ id: 'a', role: 'component', seed_number: 1, known_text: 'x', target_text: 'a' }, { id: 'b', role: 'use', seed_number: 1, known_text: 'x', target_text: 'b' }], 'fra_for_eng', 1, 20).length, 0)

// scope: never Welsh (handwritten N and S included), never drafts or test courses; Arabic is ours
assert.equal(inScope({ course_code: 'cym_n_for_eng', status: 'released' }), false)
assert.equal(inScope({ course_code: 'cym_s_for_eng', status: 'released' }), false)
assert.equal(inScope({ course_code: 'ara_eg_for_eng', status: 'beta' }), true)
assert.equal(inScope({ course_code: 'fin_for_eng', status: 'draft' }), false)

// REGRESSION (#441): undo --apply writes 'undone'; apply-staged then treats the row as open again.
// Undo of a twice-changed row restores newest-first, and never re-undoes an already undone row.
{
  const { doneRowIds, pendingUndo } = require('./ledger.cjs')
  const L = [{ row_id: 'a', action: 'replace', before: { v: 1 } }, { row_id: 'a', action: 'delete', before: { v: 2 } }, { row_id: 'b', action: 'delete', before: {} }]
  assert.deepEqual([...doneRowIds(L)].sort(), ['a', 'b'])
  assert.deepEqual(pendingUndo(L).map((l) => l.before.v ?? 'b'), ['b', 2, 1], 'newest first')
  const U = [...L, { row_id: 'a', action: 'undone' }]
  assert.deepEqual([...doneRowIds(U)], ['b'], 'undone row is no longer done')
  assert.deepEqual(pendingUndo(U).map((l) => l.row_id), ['b'], 'an undone row is not undone twice')
  assert.deepEqual(pendingUndo([...U, { row_id: 'a', action: 'replace', before: { v: 3 } }]).map((l) => l.row_id), ['b', 'a'], 'a re-applied row is undoable again')
}
// REGRESSION (#441): a staged decision whose LEGO is gone is skipped, not a crash on sets.get(key).
{
  const src = require('fs').readFileSync(require('path').join(__dirname, 'apply-staged.cjs'), 'utf8')
  assert.ok(src.includes("if (!set) { say('skip', 'LEGO no longer exists'); continue }"), 'apply-staged guards a missing LEGO set')
  assert.ok(src.indexOf("if (!set) { say('skip'") < src.indexOf('set.entryBase'), 'the guard precedes every use of set')
}

;(async () => {
  assert.equal(USE_FLOOR, 4, 'Tom 20:57: no LEGO below 4 USE phrases')
  const phrases = [
    ...[1, 2, 3, 4, 5].map((n) => ({ id: `u${n}`, role: 'use', known: `k${n}`, target: `t${n}` })),
    { id: 'b1', role: 'build', known: 'kb', target: 'tb' },
    { id: 'c1', role: 'component', known: 'kc', target: 'tc' },
  ]
  const sets = new Map([['3:1', { entryBase: {}, phrases }]])
  const ch = (id, after) => ({ row_id: id, seed_number: 3, lego_index: 1, after })
  const passGate = async () => ({ pass: true }), failGate = async () => ({ pass: false, phraseFails: ['vocab'] })
  let d = await plan([ch('u1', { target: 'new' })], sets, passGate)
  assert.equal(d[0].decision, 'replace', 'agreed replacement that passes the gate → replace')
  d = await plan([ch('u1', { target: 'new' })], sets, failGate)
  assert.equal(d[0].decision, 'delete', 'agreed replacement that FAILS the gate → delete (5 USE → 4)')
  d = await plan([ch('u1'), ch('u2')], sets, failGate)
  assert.deepEqual(d.map((x) => x.decision), ['delete', 'keep'], 'the second delete would leave 3 USE → kept at the floor')
  d = await plan([ch('b1')], sets, failGate)
  assert.equal(d[0].decision, 'delete', 'BUILD rows have no floor of their own')
  d = await plan([ch('c1')], sets, passGate)
  assert.equal(d[0].decision, 'skip', 'component rows are not practice phrases the lane may change')
  d = await plan([{ ...ch('u1', { target: 'x' }), before: { known: 'k1', target: 'CHANGED' } }], sets, passGate)
  assert.equal(d[0].decision, 'skip', 'drift since the models read it → skipped')
  console.log('phrase-quality.test: all green')
})().catch((e) => { console.error(e); process.exit(1) })
