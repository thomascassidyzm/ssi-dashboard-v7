import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const { rateRetry, RATE_RETRY_CAP } = createRequire(import.meta.url)('./charlotte-backfill.cjs')

// review #829: a clip that always answers 429 was requeued forever; it must be dropped after RATE_RETRY_CAP answers
describe('charlotte-backfill per-clip rate-limit cap', () => {
  it('requeues a clip until the cap, then drops it', () => {
    const w = { oldId: 'x' }
    let requeues = 0
    for (let i = 0; i < 100 && rateRetry(w); i++) requeues++
    expect(requeues).toBe(RATE_RETRY_CAP - 1)
    expect(w.rl).toBe(RATE_RETRY_CAP)
    expect(rateRetry(w)).toBe(false)
  })
  it('counts per clip, not globally', () => {
    const a = {}, b = {}
    for (let i = 0; i < RATE_RETRY_CAP; i++) rateRetry(a)
    expect(rateRetry(b)).toBe(true)
  })
})
