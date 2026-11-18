import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const { createSwrCache } = createRequire(import.meta.url)('./swr-cache.cjs')

describe('swr-cache', () => {
  it('single-flights, serves stale on error, refreshes after ttl, ?fresh forces', async () => {
    let t = 0, calls = 0, fail = false
    const c = createSwrCache({ ttlMs: 100, now: () => t, load: async () => { calls++; if (fail) throw new Error('8s'); return calls } })
    const [a, b] = await Promise.all([c.get(), c.get()])
    expect(calls).toBe(1); expect(a.value).toBe(1); expect(b.value).toBe(1)
    t = 50; expect((await c.get()).value).toBe(1); expect(calls).toBe(1)   // within ttl: no load
    fail = true; t = 200
    const s = await c.get()                                                 // stale served immediately
    expect(s.value).toBe(1); expect(s.stale).toBe(true)
    await c.refresh().catch(() => {})
    const e = await c.get(); expect(e.value).toBe(1); expect(e.lastError.message).toBe('8s')
    fail = false; t = 400
    expect((await c.get({ fresh: true })).value).toBe(calls); expect(calls).toBeGreaterThan(2)
  })
  it('first load failure propagates', async () => {
    const c = createSwrCache({ ttlMs: 1, load: async () => { throw new Error('boom') } })
    await expect(c.get()).rejects.toThrow('boom')
  })
})
