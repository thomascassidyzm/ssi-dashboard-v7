import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const R = createRequire(import.meta.url)('./intro-lab-router.cjs')

// A fake db that answers the two queries clipIsReadable makes.
function fakeDb({ spliceHit = false, legoRef = false } = {}) {
  const lq = { select: () => lq, eq: () => lq, or: () => lq, limit: () => Promise.resolve({ data: legoRef ? [{ lego_id: 'S0007L02' }] : [], error: null }) }
  const q = { select: () => q, eq: () => q, contains: (_c, v) => { if (typeof v !== 'string') throw new Error('invalid input syntax for type json'); return q }, limit: () => Promise.resolve({ data: spliceHit ? [{ id: 'x' }] : [], error: null }) }
  return { from: (t) => (t === 'course_legos' ? lq : q) }
}
const TOM = 'd293d509-aaaa'

describe('intro lab clip authorisation', () => {
  it('reads its own course clips', async () => {
    expect(await R.clipIsReadable(fakeDb(), 'afr_for_eng', 'a', { course_code: 'afr_for_eng', role: 'known', voice_id: 'v' })).toBe(true)
  })
  it('REFUSES another course\'s clip (the pre-fix route served any course\'s audio)', async () => {
    expect(await R.clipIsReadable(fakeDb(), 'afr_for_eng', 'a', { course_code: 'spa_for_eng', role: 'target1', voice_id: 'v' })).toBe(false)
  })
  it('allows the shared splice pieces (tails, as-in joiner) wherever they are stored', async () => {
    for (const id of R.SHARED_SPLICE_IDS) {
      expect(await R.clipIsReadable(fakeDb(), 'afr_for_eng', id, { course_code: 'deu_for_eng', role: 'presentation', voice_id: 'v' })).toBe(true)
    }
  })
  it('allows a Tom-006 deu_for_eng presentation donor, but not other deu_for_eng audio', async () => {
    expect(await R.clipIsReadable(fakeDb(), 'afr_for_eng', 'd', { course_code: 'deu_for_eng', role: 'presentation', voice_id: TOM })).toBe(true)
    expect(await R.clipIsReadable(fakeDb(), 'afr_for_eng', 'd', { course_code: 'deu_for_eng', role: 'target1', voice_id: TOM })).toBe(false)
  })
  it('allows a piece this course\'s own intro was spliced from', async () => {
    expect(await R.clipIsReadable(fakeDb({ spliceHit: true }), 'afr_for_eng', 'p', { course_code: 'other', role: 'known', voice_id: 'v' })).toBe(true)
  })
  it('allows a library-reused clip from another course when this course\'s own LEGO points at it (job #519), and still refuses an unreferenced one', async () => {
    const clip = { course_code: 'deu_for_eng', role: 'known', voice_id: 'v' }
    expect(await R.clipIsReadable(fakeDb({ legoRef: true }), 'afr_for_eng', 'k', clip)).toBe(true)
    expect(await R.clipIsReadable(fakeDb(), 'afr_for_eng', 'k', clip)).toBe(false)
  })
})

describe('intro lab voice pace', () => {
  it('asks the cached pace, not the ~1 s raw re-tally', async () => {
    const asked = []
    const db = { rpc: (fn, args) => { asked.push([fn, args]); return Promise.resolve({ data: { ok: 1 }, error: null }) } }
    expect(await R.voicePace(db, 'spa_for_eng')).toEqual({ ok: 1 })
    expect(asked).toEqual([['course_voice_pace_cached', { p_course_code: 'spa_for_eng' }]])
  })
})
