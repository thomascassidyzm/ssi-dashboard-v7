import { describe, it, expect } from 'vitest'
import { createLoadGate, createSaveQueue } from './legoProofSaves'

describe('save queue keeps flags on the course they were made on (job #505)', () => {
  it('a North flag still saves to North after the user has switched to South', async () => {
    let selected = 'cym_nv2_for_eng'
    const sent = []
    const releases = []
    const queue = createSaveQueue({
      send: (course, payload) => new Promise((res) => { sent.push({ course, payload }); releases.push(res) }),
      onState: () => {},
    })
    const north = { id: 'L1', course: selected, flagged: true, note: 'bad' }
    const p = queue.save(north)
    selected = 'cym_sv2_for_eng' // user switches tab mid-save
    const south = { id: 'L1', course: selected, flagged: false, note: '' }
    queue.save(south) // same LEGO id, other course: must not be swallowed as "again" of North's save
    expect(sent.map((s) => s.course)).toEqual(['cym_nv2_for_eng', 'cym_sv2_for_eng'])
    expect(sent[0].payload).toEqual({ legoId: 'L1', flagged: true, note: 'bad' })
    releases.forEach((r) => r()); await p
  })

  it('a change made while a save is in flight re-sends the latest state to the same course', async () => {
    const sent = []
    const queue = createSaveQueue({ send: async (c, p) => { sent.push([c, { ...p }]) }, onState: () => {} })
    const l = { id: 'L2', course: 'cym_nv2_for_eng', flagged: true, note: '' }
    const p = queue.save(l)
    l.note = 'later'
    queue.save(l)
    await p; await new Promise((r) => setTimeout(r, 0))
    expect(sent.map(([c, x]) => [c, x.note])).toEqual([['cym_nv2_for_eng', ''], ['cym_nv2_for_eng', 'later']])
  })
})

describe('load gate ignores stale loads (job #505)', () => {
  it('a slow earlier load is not current once a newer load has begun', () => {
    const gate = createLoadGate()
    const north = gate.begin()
    const south = gate.begin()
    expect(gate.isCurrent(north)).toBe(false)
    expect(gate.isCurrent(south)).toBe(true)
  })
})
