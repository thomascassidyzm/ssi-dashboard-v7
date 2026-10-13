import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const R = createRequire(import.meta.url)('./intro-lab-router.cjs')

// A fake db that answers the two queries clipIsReadable makes.
function fakeDb({ spliceHit = false } = {}) {
  const q = { select: () => q, eq: () => q, contains: () => q, limit: () => Promise.resolve({ data: spliceHit ? [{ id: 'x' }] : [], error: null }) }
  return { from: () => q }
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
})
