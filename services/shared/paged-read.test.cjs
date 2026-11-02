// readAllPages is the ONE paginator (job #149 folded production-api's
// fetchAllPodSentences, canonical-pods loop, admin-door pageAll and
// debut-practice's pageAll onto it; fetchAllRows had no callers and went).
// The property that matters: a server whose max-rows is SMALLER than the page
// size returns short pages that are not last, so the loop must stop on an
// EMPTY page, never on a short one (job #382: 31,245 rows hidden that way).
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { readAllPages } = require('./paged-read.cjs')

// A fake PostgREST builder: `maxRows` is the server cap, applied after range.
function fakeServer(rows, { maxRows = Infinity, error = null } = {}) {
  const calls = []
  const build = () => {
    const call = { orders: [] }
    calls.push(call)
    const q = {
      order: (col, opts) => { call.orders.push([col, opts]); return q },
      range: (from, to) => {
        call.range = [from, to]
        if (error) return Promise.resolve({ data: null, error })
        const sorted = [...rows].sort((a, b) => a.id - b.id)
        return Promise.resolve({ data: sorted.slice(from, Math.min(to + 1, from + maxRows)), error: null })
      },
    }
    return q
  }
  return { build, calls }
}

describe('readAllPages', () => {
  it('reads past a server cap smaller than the page size and stops on the empty page', async () => {
    const rows = Array.from({ length: 2500 }, (_, i) => ({ id: i + 1 }))
    const { build, calls } = fakeServer(rows, { maxRows: 400 })
    const out = await readAllPages(build, { pageSize: 1000 })
    expect(out.length).toBe(2500)
    expect(out.map(r => r.id)).toEqual(rows.map(r => r.id))
    // 7 short pages of 400 (2800 > 2500, so the 7th is 100) then one empty page.
    expect(calls.length).toBe(8)
    expect(calls[calls.length - 1].range).toEqual([2500, 3499])
  })

  it('appends its own order on id BEHIND the caller\'s order clause', async () => {
    const { build, calls } = fakeServer([{ id: 1 }])
    await readAllPages(() => build().order('pod_id').order('global_order'), { pageSize: 1000 })
    expect(calls[0].orders.map(o => o[0])).toEqual(['pod_id', 'global_order', 'id'])
  })

  it('wraps a PostgREST error object in a real Error carrying its message', async () => {
    const { build } = fakeServer([], { error: { message: 'canceling statement due to statement timeout' } })
    await expect(readAllPages(build)).rejects.toThrow('statement timeout')
  })
})
