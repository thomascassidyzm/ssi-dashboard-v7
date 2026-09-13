/**
 * Unit tests for the `pod_legos.first_seen_sentence` remap rule (2026-09-03).
 * The residue it repairs: 7,802 rows across 19 of the 22 courses that crossed to
 * pod-1, all naming ids on the retired slug that no longer exist (job #157).
 */
import { describe, it, expect } from 'vitest'
const { planPodLegoRemap, parseSlotKey } = require('./pod-legos-remap.cjs')

const live = (...ids) => new Set(ids)

describe('parseSlotKey', () => {
  it('reads a slot key', () => {
    expect(parseSlotKey('fra_for_eng:retired-2026-08-22:SC03-S003')).toEqual({ course: 'fra_for_eng', slug: 'retired-2026-08-22', tail: 'SC03-S003' })
  })
  it('a bare integer is NOT a slot key — the older unrelated residue', () => {
    expect(parseSlotKey('139')).toBe(null)
  })
  it('null and empty are not slot keys', () => {
    expect(parseSlotKey(null)).toBe(null)
    expect(parseSlotKey('')).toBe(null)
  })
  it('joins a tail that itself contains a colon rather than dropping it', () => {
    expect(parseSlotKey('c:pod-1:a:b').tail).toBe('a:b')
  })
})

describe('planPodLegoRemap', () => {
  it('remaps a dangling retired-slug id onto the live pod-1 slot with the same tail', () => {
    const p = planPodLegoRemap({
      legos: [{ id: 1, first_seen_sentence: 'fra_for_eng:retired-2026-08-22:SC03-S003' }],
      liveSentenceIds: live('fra_for_eng:pod-1:SC03-S003'),
    })
    expect(p.remap).toEqual([{ legoId: 1, from: 'fra_for_eng:retired-2026-08-22:SC03-S003', to: 'fra_for_eng:pod-1:SC03-S003' }])
  })
  it('leaves a row whose id is still live completely alone', () => {
    const p = planPodLegoRemap({
      legos: [{ id: 1, first_seen_sentence: 'cym_n_for_eng:pod-1:SC01-S001' }],
      liveSentenceIds: live('cym_n_for_eng:pod-1:SC01-S001'),
    })
    expect(p.remap).toEqual([])
    expect(p.alive.length).toBe(1)
  })
  it('never guesses: no live target means unresolvable, not a write', () => {
    const p = planPodLegoRemap({
      legos: [{ id: 1, first_seen_sentence: 'fra_for_eng:retired-2026-08-22:SC99-S099' }],
      liveSentenceIds: live('fra_for_eng:pod-1:SC03-S003'),
    })
    expect(p.remap).toEqual([])
    expect(p.unresolvable.length).toBe(1)
  })
  it('reports the bare-integer residue separately and touches none of it', () => {
    const p = planPodLegoRemap({ legos: [{ id: 1, first_seen_sentence: '139' }], liveSentenceIds: live() })
    expect(p.remap).toEqual([])
    expect(p.notASlotKey).toEqual([{ legoId: 1, value: '139' }])
  })
  it('never remaps onto a slug the player does not serve — a live row on a parked slug is not a target', () => {
    const p = planPodLegoRemap({
      legos: [{ id: 1, first_seen_sentence: 'x_for_eng:retired-2026-08-22:SC01-S001' }],
      liveSentenceIds: live('x_for_eng:unrecorded:SC01-S001'),
    })
    expect(p.remap).toEqual([])
    expect(p.unresolvable.length).toBe(1)
  })
  it('skips rows with no first_seen_sentence at all', () => {
    const p = planPodLegoRemap({ legos: [{ id: 1, first_seen_sentence: null }], liveSentenceIds: live() })
    expect(p.remap.length + p.alive.length + p.notASlotKey.length + p.unresolvable.length).toBe(0)
  })
})
