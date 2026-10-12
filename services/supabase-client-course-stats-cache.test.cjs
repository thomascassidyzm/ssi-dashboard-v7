// getAllCourseContentStats is served stale-while-revalidate: the live recompute took
// 36 s (156 courses x 5 PostgREST queries), so repeat callers must not pay it.
import { describe, it, expect } from 'vitest'
const client = require('./supabase-client.cjs')

function reset(compute) {
  const c = client._statsCacheForTest
  c.value = null; c.at = 0; c.inflight = null; c.compute = compute
  return c
}

describe('getAllCourseContentStats cache', () => {
  it('shares one in-flight compute and serves the repeat call without recomputing', async () => {
    let calls = 0
    reset(async () => { calls++; await new Promise(r => setTimeout(r, 20)); return { a: { seeds: calls } } })
    const [x, y] = await Promise.all([client.getAllCourseContentStats(), client.getAllCourseContentStats()])
    expect(x).toBe(y)
    await client.getAllCourseContentStats()
    expect(calls).toBe(1)
  })

  it('returns the stale copy instantly and refreshes in the background', async () => {
    let calls = 0
    const c = reset(async () => ({ n: ++calls }))
    await client.getAllCourseContentStats()
    c.at = Date.now() - 10 * 60 * 1000
    const stale = await client.getAllCourseContentStats()
    expect(stale.n).toBe(1)
    await c.inflight
    expect((await client.getAllCourseContentStats()).n).toBe(2)
  })
})
