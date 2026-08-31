/**
 * THE HELD LANGUAGES VIEW — what must stay true about the cache.
 *
 * Tom, 2026-08-31: "why is the page load so slow when getting all the voice for
 * languages information - this really does NOT change very often". The fix is a
 * held payload; these are the four things that must hold about it, because a
 * cache that quietly serves a stale cast is worse than a slow page.
 *
 * Run: npx vitest run services/voicelab/registry-cache.test.js
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createRequire } from 'module'

const require_ = createRequire(import.meta.url)
const registry = require_('./registry.cjs')

/** A Supabase stand-in that counts how many times it is asked anything. */
function fakeDb () {
  const db = {
    reads: 0,
    from () {
      return {
        select () {
          const q = {
            range: () => q,
            then: (ok) => { db.reads += 1; return Promise.resolve({ data: [], error: null }).then(ok) },
          }
          return q
        },
      }
    },
  }
  return db
}

describe('registry.cachedBuild — the held view', () => {
  beforeEach(() => registry.invalidate())

  it('builds once and serves the second caller from the hold', async () => {
    const db = fakeDb()
    const first = await registry.cachedBuild(db)
    const readsAfterFirst = db.reads
    expect(readsAfterFirst).toBeGreaterThan(0)

    const second = await registry.cachedBuild(db)
    expect(db.reads).toBe(readsAfterFirst)
    expect(second.cached).toBe(true)
    expect(first.cached).toBe(false)
    expect(second.languages).toEqual(first.languages)
  })

  it('stamps every answer with when it was built, cached or not', async () => {
    const db = fakeDb()
    const fresh = await registry.cachedBuild(db)
    const held = await registry.cachedBuild(db)
    expect(typeof fresh.builtAt).toBe('string')
    expect(held.builtAt).toBe(fresh.builtAt)
    expect(held.ageMs).toBeGreaterThanOrEqual(0)
  })

  it('rebuilds when asked to refresh — the Refresh button', async () => {
    const db = fakeDb()
    await registry.cachedBuild(db)
    const reads = db.reads
    const forced = await registry.cachedBuild(db, { refresh: true })
    expect(db.reads).toBeGreaterThan(reads)
    expect(forced.cached).toBe(false)
  })

  it('rebuilds after invalidate() — what every lab write calls', async () => {
    const db = fakeDb()
    await registry.cachedBuild(db)
    const reads = db.reads
    registry.invalidate()
    const after = await registry.cachedBuild(db)
    expect(db.reads).toBeGreaterThan(reads)
    expect(after.cached).toBe(false)
  })
})
