// Next batch → on the finished screen (Aran, 2026-10-16, job #203: phrase.1 batch 2 finished and
// the only way on was Home). nextBatchAfter follows Up next's order and crosses sections.
import { describe, it, expect } from 'vitest'
import { nextBatchAfter, batchTickId } from './booth-home.js'

const track = (key, kind, batches, extra = {}) => ({
  key, kind, ...extra,
  total: batches.reduce((n, b) => n + b.total, 0), recorded: batches.reduce((n, b) => n + b.recorded, 0),
  batches: batches.map((b, i) => ({ n: i + 1, ...b })),
})
const done = { total: 50, recorded: 50 }
const open = { total: 50, recorded: 0 }
const at = (r) => r && `${r.track.key}#${r.batch.n}`

describe('nextBatchAfter', () => {
  it('does not continue an unticked section opened from a saved batch link', () => {
    const s = track('seed.cym_n', 'seed', [done, open], { newCourse: true })
    expect(nextBatchAfter([s], { track: s.key, batch: 1 }, new Set([s.key]))).toBe(null)
  })

  it('does not resurrect an unticked earlier batch when wrapping a two-batch section', () => {
    const s = track('seed.cym_n', 'seed', [open, done], { newCourse: true })
    expect(nextBatchAfter([s], { track: s.key, batch: 2 }, new Set([batchTickId(s.key, 1)]))).toBe(null)
  })

  const seeds = track('seed.cym_n', 'seed', [done, done], { newCourse: true })
  const legos = track('lego.cym_n', 'lego', [done, open], { newCourse: true })

  it('phrase.1 batch 2 finished → phrase.1 batch 3, even though only batch 2 was the served one', () => {
    const p1 = track('phrase.1', 'phrase', [done, { ...done, current: true }, open, open], { pass: 1 })
    expect(at(nextBatchAfter([p1], { track: 'phrase.1', batch: 2 }))).toBe('phrase.1#3')
  })

  it('skips a later batch already done and a batch still uploading counts as done', () => {
    const p1 = track('phrase.1', 'phrase', [done, done, { total: 50, recorded: 10, uploading: 40 }, open], { pass: 1 })
    expect(at(nextBatchAfter([p1], { track: 'phrase.1', batch: 2 }))).toBe('phrase.1#4')
  })

  it('end of a track crosses to the next section in Up next order (sentences → LEGOs → phrases)', () => {
    const p1 = track('phrase.1', 'phrase', [open, open], { pass: 1 })
    const s = track('seed.cym_n', 'seed', [done, { total: 50, recorded: 50 }], { newCourse: true })
    // the queue lists phrases first; Up next's order still puts LEGOs before phrases
    expect(at(nextBatchAfter([p1, legos, s], { track: 'seed.cym_n', batch: 2 }))).toBe('lego.cym_n#2')
  })

  it('end of the last phrase track crosses into pass 2 once pass 1 is finished', () => {
    const p1 = track('phrase.1', 'phrase', [done, done], { pass: 1 })
    const p2 = track('phrase.2', 'phrase', [open, { ...open, current: true }], { pass: 2 })
    expect(at(nextBatchAfter([p1, p2], { track: 'phrase.1', batch: 2 }))).toBe('phrase.2#2')
  })

  it('wraps to an earlier batch still owed when nothing later is left', () => {
    const s = track('seed.cym_n', 'seed', [open, done, done], { newCourse: true })
    expect(at(nextBatchAfter([s], { track: 'seed.cym_n', batch: 3 }))).toBe('seed.cym_n#1')
  })

  it('obeys the ticks: an unticked batch and an unticked section are passed over', () => {
    const s = track('seed.cym_n', 'seed', [done, open, open], { newCourse: true })
    const off = new Set([batchTickId('seed.cym_n', 2)])
    expect(at(nextBatchAfter([s], { track: 'seed.cym_n', batch: 1 }, off))).toBe('seed.cym_n#3')
    const p1 = track('phrase.1', 'phrase', [{ ...open, current: true }], { pass: 1 })
    expect(at(nextBatchAfter([seeds, legos, p1], { track: 'seed.cym_n', batch: 2 }, new Set(['lego.cym_n'])))).toBe('phrase.1#1')
  })

  it('nothing left anywhere → null; the batch just finished is never offered back', () => {
    const p1 = track('phrase.1', 'phrase', [done, { total: 50, recorded: 5 }], { pass: 1 })
    expect(nextBatchAfter([seeds, p1], { track: 'phrase.1', batch: 2 })).toBe(null)
    expect(nextBatchAfter([seeds], null)).toBe(null)
  })
})
