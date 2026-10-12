import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const { fetchAllPages } = createRequire(import.meta.url)('./paged-fetch.cjs')

const table = (n) => Array.from({ length: n }, (_, i) => ({ id: i }))

describe('fetchAllPages', () => {
  it('returns every row past the 1000-row cap, in order, for non-page-aligned and aligned sizes', async () => {
    for (const n of [0, 999, 1000, 2500, 9000]) {
      const rows = table(n)
      const got = await fetchAllPages(async (from, to) => ({ data: rows.slice(from, Math.min(to + 1, from + 1000)) }))
      expect(got.length).toBe(n)
      expect(got.map(r => r.id)).toEqual(rows.map(r => r.id))
    }
  })

  it('has several pages in flight at once', async () => {
    let live = 0, peak = 0
    const rows = table(8000)
    await fetchAllPages(async (from, to) => {
      live++; peak = Math.max(peak, live)
      await new Promise(r => setTimeout(r, 5))
      live--
      return { data: rows.slice(from, to + 1) }
    })
    expect(peak).toBeGreaterThan(1)
  })

  it('throws a page error', async () => {
    await expect(fetchAllPages(async () => ({ error: new Error('boom') }))).rejects.toThrow('boom')
  })
})
