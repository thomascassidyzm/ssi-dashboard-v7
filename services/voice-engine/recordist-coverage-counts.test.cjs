/**
 * recordist-coverage-counts.test.cjs — the number Tom's admin page reports.
 *
 * The admin coverage bar and a recordist's own screen must not disagree about
 * how much work is outstanding; two pages disagreeing is worse than either
 * being wrong alone. On 2026-09-02 they did: the booth was fixed to say Aran
 * has 71 recordings of which 45 are queued to be read again, while
 * /api/recording/coverage still reported the narrow 26. These lock the shared
 * definition — a take exists = "not asked for again" OR "asked for again".
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { takeTally, kindTally } = require('./recordist-queue.cjs')

/** The wire shape finishQueue emits, cut down to the fields the tally reads. */
function line(kind, { recorded = false, rerecordWanted = false } = {}) {
  return { kind, recorded, rerecordWanted }
}

test('a line asked for again counts as recorded, and as an "again"', () => {
  const t = takeTally([
    line('pod', { recorded: true }),
    line('pod', { rerecordWanted: true }),
    line('pod'),
  ])
  assert.deepStrictEqual(t, { withTake: 2, again: 1, fresh: 1 })
})

test("Aran's live shape: 441 lines, 26 done, 45 to read again, 71 recorded", () => {
  const lines = [
    ...Array.from({ length: 26 }, () => line('pod', { recorded: true })),
    ...Array.from({ length: 27 }, () => line('pod', { rerecordWanted: true })),
    ...Array.from({ length: 27 }, () => line('pod')),
    ...Array.from({ length: 18 }, () => line('rerecord', { rerecordWanted: true })),
    ...Array.from({ length: 38 }, () => line('rerecord')),
    ...Array.from({ length: 305 }, () => line('seed')),
  ]
  assert.strictEqual(lines.length, 441)
  const t = takeTally(lines)
  assert.strictEqual(t.withTake, 71)
  assert.strictEqual(t.again, 45)
  assert.strictEqual(t.fresh, 370)
  // And the narrow count the run still uses is untouched by any of this.
  assert.strictEqual(lines.filter((l) => l.recorded).length, 26)
})

test('kinds split the total into the jobs the booth names', () => {
  const k = kindTally([
    line('pod', { recorded: true }),
    line('pod', { rerecordWanted: true }),
    line('seed'),
    line('rerecord', { rerecordWanted: true }),
  ])
  assert.deepStrictEqual(k.pod, { total: 2, withTake: 2, again: 1, fresh: 0 })
  assert.deepStrictEqual(k.seed, { total: 1, withTake: 0, again: 0, fresh: 1 })
  assert.deepStrictEqual(k.rerecord, { total: 1, withTake: 1, again: 1, fresh: 0 })
  // A kind nobody has any of is absent, never a zero row.
  assert.strictEqual(k.quarry, undefined)
})

test('a missing kind defaults to pod, matching the booth', () => {
  const k = kindTally([{ recorded: true }])
  assert.strictEqual(k.pod.total, 1)
})
