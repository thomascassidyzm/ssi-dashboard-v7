/**
 * THE VERSION STAMP (Tom, 2026-10-12): a cast written by direct SQL must show on
 * the next visit, not after the 10-minute TTL — and an unchanged estate must
 * never be rebuilt just because time passed. Fails on the pre-stamp code (the
 * TTL-only hold served the stale cast); passes with it.
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const { makeHold, readStamp } = createRequire(import.meta.url)('./registry.cjs')

function fakeStampDb (rows) {
  return {
    from: (t) => ({
      select: () => ({
        order: () => ({ limit: async () => ({ data: [{ updated_at: rows[t].at }], count: rows[t].n, error: null }) }),
      }),
    }),
  }
}

describe('readStamp', () => {
  it('moves on an edit (updated_at) and on a deletion (count)', async () => {
    const rows = { voice_language_roles: { n: 3, at: 'a' }, voices: { n: 5, at: 'a' } }
    const db = fakeStampDb(rows)
    const s0 = await readStamp(db, ['voice_language_roles', 'voices'])
    rows.voices.at = 'b'
    const s1 = await readStamp(db, ['voice_language_roles', 'voices'])
    rows.voice_language_roles.n = 2
    const s2 = await readStamp(db, ['voice_language_roles', 'voices'])
    expect(new Set([s0, s1, s2]).size).toBe(3)
  })
})

describe('makeHold', () => {
  it('rebuilds when the stamp moves, without any invalidate() call', async () => {
    let stamp = 'v1'; let builds = 0
    const hold = makeHold({ build: async () => ++builds, stamp: async () => stamp, ttlMs: 1e9, checkEveryMs: 0 })
    expect((await hold.get()).value).toBe(1)
    expect((await hold.get()).value).toBe(1)
    stamp = 'v2' // direct SQL cast
    const h = await hold.get()
    expect(h.value).toBe(2)
    expect(h.cached).toBe(false)
  })

  it('past the TTL with an unchanged stamp answers at once from the hold and rebuilds behind it', async () => {
    let builds = 0
    const hold = makeHold({ build: async () => ++builds, stamp: async () => 's', ttlMs: 0, checkEveryMs: 1e9 })
    await hold.get()
    const h = await hold.get()
    expect(h.value).toBe(1)
    expect(h.cached).toBe(true)
    await new Promise((r) => setTimeout(r, 5))
    expect(builds).toBe(2)
  })

  it('runs one build for concurrent callers', async () => {
    let builds = 0
    const hold = makeHold({ build: async () => { await new Promise((r) => setTimeout(r, 10)); return ++builds }, stamp: async () => 's', ttlMs: 1e9 })
    await Promise.all([hold.get(), hold.get(), hold.get()])
    expect(builds).toBe(1)
  })
})
