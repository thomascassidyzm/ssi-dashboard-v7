/**
 * The one property this whole promotion rests on: attaching a continuation to a
 * slate must not change the slate. Tom, 2026-09-04: "A RECOVERY ATTACHES, IT DOES
 * NOT APPEND."
 */
import { describe, it, expect } from 'vitest'
import slate from './canonical-slate.cjs'
const { baseSlate, continuations, hasBaseRows } = slate

const row = (scene, sent, order, variant = null) => ({
  scene_number: scene, sentence_number: sent, global_order: order, variant_key: variant,
  speaker: 'S', english_text: `sc${scene} s${sent}`,
})

// A miniature CORE: scenes 2 and 3, exactly as pod-1 held them before promotion.
const CORE = [row(2, 1, 5), row(2, 2, 6), row(2, 3, 7), row(3, 1, 8), row(3, 2, 9)]
// The recovery halves as promoted: the same coordinates, carrying a variant_key,
// with out-of-band global_order.
const RECOVERIES = [
  row(2, 1, 10001, 'recovery-s2'), row(2, 2, 10002, 'recovery-s2'),
  row(3, 1, 10003, 'recovery-m1'),
]

describe('canonical slate', () => {
  it('a slate with no variants is itself, untouched', () => {
    expect(baseSlate(CORE)).toEqual(CORE)
    expect(continuations(CORE)).toEqual([])
  })

  it('THE PROPERTY: attaching continuations leaves the walk byte-identical', () => {
    const before = JSON.stringify(baseSlate(CORE))
    const after = JSON.stringify(baseSlate([...CORE, ...RECOVERIES]))
    expect(after).toBe(before)
  })

  it('order is preserved exactly — this filters, it never sorts', () => {
    const mixed = [CORE[0], RECOVERIES[0], CORE[1], RECOVERIES[1], CORE[2]]
    expect(baseSlate(mixed).map(r => r.global_order)).toEqual([5, 6, 7])
  })

  it('a flow book — every row a variant — is served whole, unchanged', () => {
    // health/retail/trades/hospitality/care-work and core-recoveries itself.
    expect(hasBaseRows(RECOVERIES)).toBe(false)
    expect(baseSlate(RECOVERIES)).toEqual(RECOVERIES)
    expect(continuations(RECOVERIES)).toEqual([])
  })

  it('the continuations are recoverable, grouped by the coordinate they attach to', () => {
    const c = continuations([...CORE, ...RECOVERIES])
    expect(c).toHaveLength(3)
    expect(c.map(r => `${r.scene_number}/${r.sentence_number}/${r.variant_key}`))
      .toEqual(['2/1/recovery-s2', '2/2/recovery-s2', '3/1/recovery-m1'])
  })

  it('empty and null are not an error', () => {
    expect(baseSlate([])).toEqual([])
    expect(baseSlate(null)).toEqual([])
  })
})
