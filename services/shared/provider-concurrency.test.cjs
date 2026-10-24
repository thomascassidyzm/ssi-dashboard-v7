// The process-wide Cartesia cap (job #394): however many callers pile in, at most 15 provider calls are in flight,
// and a 429 is re-sent (nothing billed) rather than failed.
import { describe, it, expect } from 'vitest'
const { withProviderSlot, providerConcurrencyStats, createLimiter } = require('./provider-concurrency.cjs')

const tick = (ms) => new Promise((r) => setTimeout(r, ms))

describe('provider concurrency', () => {
  it('60 concurrent Cartesia callers never exceed 15 in flight, and do reach 15', async () => {
    let now = 0, peak = 0
    const call = async () => { now++; peak = Math.max(peak, now); await tick(5); now--; return 'ok' }
    const out = await Promise.all(Array.from({ length: 60 }, () => withProviderSlot('cartesia', call)))
    expect(out.every((x) => x === 'ok')).toBe(true)
    expect(peak).toBe(15)
    expect(providerConcurrencyStats().cartesia.peak).toBe(15)
  })

  it('a 429 shrinks the cap and is re-sent; any other error is thrown as before', async () => {
    const l = createLimiter('cartesia', 15, { wait: () => Promise.resolve(), log: () => {} })
    let n = 0
    const flaky = async () => { if (++n === 1) throw new Error('Cartesia TTS API error (429): too many'); return 'ok' }
    expect(await l.run(flaky)).toBe('ok')
    expect(l.stats()).toMatchObject({ throttled: 1, cap: 14 })
    await expect(l.run(async () => { throw new Error('Cartesia TTS API error (400): bad') })).rejects.toThrow('(400)')
  })
})
