#!/usr/bin/env node
/**
 * podStateConservation.test.cjs — bare-node test, no vitest, no install.
 * Run: node tools/pods/podStateConservation.test.cjs
 *
 * The RED case is the point: the assertion is fed the REAL numbers of the 2026-08-24
 * German flip — 17 carried rows before, 3 after, no deliberate drops in any surviving
 * record — and must throw. A verifier only ever seen green is untested in the direction
 * that matters. The GREEN case is the real 2026-08-22 German flip: 19 rows before,
 * 17 after, 2 deliberate drops (text absent from new canon) — conserved.
 */

const assert = require('assert')
const { assertPodStateConservation } = require('./podStateConservation.cjs')

let failures = 0
function expectThrow(name, fn, msgPart) {
  try { fn(); console.error(`FAIL ${name}: did not throw`); failures++ }
  catch (e) {
    if (msgPart && !e.message.includes(msgPart)) { console.error(`FAIL ${name}: wrong message: ${e.message}`); failures++ }
    else console.log(`PASS ${name} — threw: ${e.message.slice(0, 110)}…`)
  }
}
function expectOk(name, fn) {
  try { fn(); console.log(`PASS ${name}`) }
  catch (e) { console.error(`FAIL ${name}: threw ${e.message}`); failures++ }
}

// RED — the 2026-08-24 German flip as it actually happened: 17 carried rows stood before,
// 3 survived, nothing in any record plans a drop. 14 rows destroyed unplanned.
expectThrow('red: 08-24 deu destruction is caught',
  () => assertPodStateConservation({ course: 'deu_for_eng', before: 17, after: 3, dropped: 0 }),
  '14 row(s) DESTROYED unplanned')

// GREEN — the 2026-08-22 German flip as recorded in its prospective log: 19 state rows,
// 17 carried, 2 deliberately dropped (text_absent_from_new_canon). Conserved.
expectOk('green: 08-22 deu flip conserves',
  () => assert.deepStrictEqual(
    assertPodStateConservation({ course: 'deu_for_eng', before: 19, after: 17, dropped: 2 }),
    { expected: 17 }))

// GREEN — two old rows converging on one new slot key is deliberate, not destruction.
expectOk('green: converged carry targets are accounted',
  () => assertPodStateConservation({ course: 'x', before: 10, after: 8, dropped: 1, converged: 1 }))

// RED — rows appearing from nowhere is also a failure, in the other direction.
expectThrow('red: unplanned appearance is caught',
  () => assertPodStateConservation({ course: 'x', before: 5, after: 7, dropped: 0 }),
  'appeared unplanned')

// RED — garbage inputs refuse rather than pass vacuously.
expectThrow('red: non-integer input refuses',
  () => assertPodStateConservation({ course: 'x', before: undefined, after: 3, dropped: 0 }))

process.exit(failures ? 1 : 0)
