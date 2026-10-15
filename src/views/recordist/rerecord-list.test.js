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

// Job #842: a take that SAVED but did not match its words.
import { breakdownWords } from './rerecord-list.js'
import { applyFailures, mismatchLineWords } from './text-check-failures.js'
describe("didn't match the words", () => {
  const M = [{ lineId: 'm', why: 'didnt_match', text: 'M', heard: 'em' }]
  it('stays on the card although its line saved from this device; reading it again takes it off', () => {
    expect(mergeRerecord({ serverItems: M, saved: new Set(['m']) }).map(r => [r.lineId, r.words])).toEqual([['m', "didn't match the words"]])
    expect(mergeRerecord({ serverItems: M, retaken: ['m'] })).toEqual([])
    expect(mergeRerecord({ serverItems: M, unsent: new Set(['m']) })).toEqual([])
  })
  it('is counted in the breakdown', () => {
    expect(breakdownWords([...mergeRerecord({ serverItems: M }), { why: 'skipped' }])).toBe("1 didn't match the words · 1 skipped")
  })
  it('a poll that left before he read the line again does not put the old failure back', () => {
    const retaken = new Map([['a', 2000]])
    const got = applyFailures([{ lineId: 'a', takeId: 'OLD' }, { lineId: 'b', takeId: 'B', heard: 'bee' }], 1500, retaken)
    expect([...got.keys()]).toEqual(['b'])
    // a poll that left AFTER the re-read is believed: the new take failed too
    expect([...applyFailures([{ lineId: 'a', takeId: 'NEW' }], 2500, retaken).keys()]).toEqual(['a'])
  })
  it('says what was heard under the line', () => {
    expect(mismatchLineWords({ heard: 'Bara da' })).toBe("Last take didn't match the words — we heard “Bara da”")
  })
})
