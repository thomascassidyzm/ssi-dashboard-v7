// The re-record card's merge (job #788): server skips + text changes, the device's refused takes,
// and never a line whose take is still uploading or has saved since.
import { describe, it, expect } from 'vitest'
import { mergeRerecord, whyWords } from './rerecord-list.js'

const ITEMS = [
  { lineId: 'a', why: 'skipped', text: 'A' },
  { lineId: 'b', why: 'skipped', text: 'B' },
  { lineId: 'c', why: 'text_changed', text: 'C', oldText: 'old C' },
]

describe('mergeRerecord', () => {
  it('lists skipped lines with their reason', () => {
    expect(mergeRerecord({ serverItems: ITEMS }).map(r => [r.lineId, r.words])).toEqual([['a', 'skipped'], ['b', 'skipped'], ['c', 'text changed']])
  })

  it('never counts a line whose take is still uploading', () => {
    expect(mergeRerecord({ serverItems: ITEMS, unsent: new Set(['b']) }).map(r => r.lineId)).toEqual(['a', 'c'])
  })

  it('adds a refused take with its reason, and a refusal outranks the server reason', () => {
    const rows = mergeRerecord({ serverItems: ITEMS, refusedTakes: [{ lineId: 'z', text: 'Z', lastError: "That take didn't capture any speech" }, { lineId: 'a', lastError: 'no audible speech' }] })
    expect(rows.map(r => [r.lineId, r.words])).toEqual([['a', "didn't save: no speech"], ['b', 'skipped'], ['c', 'text changed'], ['z', "didn't save: no speech"]])
  })

  it('drops an item as soon as a good take saves, from this device or (refused ones) per the server', () => {
    const rows = mergeRerecord({ serverItems: ITEMS, saved: new Map([['a', {}]]), refusedTakes: [{ lineId: 'z' }], recordedAlso: ['z'] })
    expect(rows.map(r => r.lineId)).toEqual(['b', 'c'])
  })

  it('words for the other refusals', () => {
    expect(whyWords('refused', 'That take starts right on your first word, so the beginning of it is cut off.')).toBe("didn't save: start cut off")
    expect(whyWords('refused', 'something else')).toBe("didn't save")
  })
})

import { oldRefusedIds, breakdownWords } from './rerecord-list.js'
describe('one card: the old ones and the breakdown', () => {
  const taken = [{ lineId: 'z', lastError: 'x' }, { lineId: 'old', lastError: 'x' }, { lineId: 'a', lastError: 'x' }]
  it('a refused take on a gone or already-recorded line is old, not a row; a listed miss never is', () => {
    const args = { serverItems: ITEMS, refusedTakes: taken, goneIds: ['old'], recordedAlso: ['z'] }
    expect(oldRefusedIds(args).sort()).toEqual(['old', 'z'])
    expect(mergeRerecord(args).map(r => r.lineId)).toEqual(['a', 'b', 'c'])
  })
  it('rows + old ones account for every refused take and every server item', () => {
    const args = { serverItems: ITEMS, refusedTakes: taken, goneIds: ['old'], recordedAlso: ['z'] }
    expect(mergeRerecord(args).length + oldRefusedIds(args).length).toBe(ITEMS.length + taken.length - 1) // 'a' is both
  })
  it('breakdown words, zeroes left out', () => {
    const rows = mergeRerecord({ serverItems: ITEMS, refusedTakes: [{ lineId: 'a' }, { lineId: 'q' }] })
    expect(breakdownWords(rows)).toBe("2 didn't save · 1 skipped · 1 text changed")
  })
})
