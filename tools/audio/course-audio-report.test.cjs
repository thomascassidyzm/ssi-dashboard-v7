import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const r = require('./course-audio-report.cjs')

describe('course audio report pure parts', () => {
  it('slotTable sums slots per voice and flags cast', () => {
    const t = r.slotTable([{ role: 'target1', voice_id: 'a', slots: 5, status: 'ok' }, { role: 'target1', voice_id: 'b', slots: 9, status: 'drift' }])
    expect(t.target1.map((x) => [x.voice, x.slots, x.isCast])).toEqual([['b', 9, false], ['a', 5, true]])
  })
  it('recentByDay keeps only the window, newest first', () => {
    const rows = [{ day: '2026-10-17' }, { day: '2026-10-03' }, { day: '2026-10-04' }, { day: '2026-10-12' }]
    const out = r.recentByDay(rows, 14, new Date('2026-10-17T12:00:00Z'))
    expect(out.map((x) => x[0])).toEqual(['2026-10-17', '2026-10-12', '2026-10-04'])
  })
  it('whyUnpointed names each cause', () => {
    expect(r.whyUnpointed({ matching_slots: 0 })).toMatch(/no slot carries/)
    expect(r.whyUnpointed({ matching_slots: 2, slots_on_cast: 2, slots_on_other: 0 })).toMatch(/duplicate/)
    expect(r.whyUnpointed({ matching_slots: 2, slots_on_cast: 1, slots_on_other: 1 })).toMatch(/pointer gap/)
    expect(r.whyUnpointed({ matching_slots: 2, slots_on_cast: 0, slots_on_other: 0 })).toMatch(/empty pointer/)
  })
})
