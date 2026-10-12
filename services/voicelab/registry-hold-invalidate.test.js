/**
 * A write (invalidate()) landing while a read is mid stamp-check must not crash that read,
 * and a build that was already running when the write landed must not be served as the
 * post-write view. Both fail on makeHold as merged in 06a1f22ca.
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const { makeHold } = createRequire(import.meta.url)('./registry.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

describe('makeHold vs invalidate()', () => {
  it('a GET whose stamp check overlaps invalidate() still answers', async () => {
    let slow = false
    const hold = makeHold({ build: async () => 1, stamp: async () => { if (slow) await sleep(20); return 's' }, ttlMs: 1e9, checkEveryMs: 0 })
    await hold.get()
    slow = true
    const p = hold.get()
    await sleep(5)
    hold.invalidate() // a cast PUT lands while the stamp is being read
    await expect(p).resolves.toBeTruthy()
  })

  it('a build already in flight at invalidate() is not what the next GET gets', async () => {
    let data = 'old'
    const hold = makeHold({ build: async () => { const v = data; await sleep(30); return v }, stamp: async () => 's', ttlMs: 1e9, checkEveryMs: 1e9 })
    const first = hold.get()
    await sleep(5)
    data = 'new'
    hold.invalidate() // the write
    await first
    expect((await hold.get()).value).toBe('new')
  })
})
