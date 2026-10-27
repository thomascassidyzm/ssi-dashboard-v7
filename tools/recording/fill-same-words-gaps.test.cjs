// npx vitest run tools/recording/fill-same-words-gaps.test.cjs
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { batchesFor, dropDriftedOp } = require('./fill-same-words-gaps.cjs')

describe('fill-same-words-gaps', () => {
  it('cuts a course into edit-batch bodies of at most 500 ops, dry run unless told', () => {
    const planned = Array.from({ length: 1201 }, (_, i) => ({ op: { i } }))
    const b = batchesFor(planned)
    expect(b.map((x) => x.ops.length)).toEqual([500, 500, 201])
    expect(b.every((x) => x.apply === false)).toBe(true)
    expect(batchesFor(planned, { apply: true })[0].apply).toBe(true)
  })
  it('a slot that filled since the plan is dropped, never overwritten; any other refusal is left to report', () => {
    const body = { ops: [{ i: 0 }, { i: 1 }, { i: 2 }] }
    expect(dropDriftedOp(body, 409, { index: 1, error: 'op 1: before-state drift on target2_audio_id (expected null, found "x")' })).toEqual({ i: 1 })
    expect(body.ops).toEqual([{ i: 0 }, { i: 2 }])
    expect(dropDriftedOp(body, 409, { index: 0, error: 'audio.link: clip says "a" but the known text is "b"' })).toBeNull()
    expect(dropDriftedOp(body, 500, { index: 0, error: 'before-state drift' })).toBeNull()
    expect(body.ops.length).toBe(2)
  })
})
