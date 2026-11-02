// readAllPages is the ONE paginator. Job #149 folded four page-all loops onto
// it at pageSize 1000 (production-api's fetchAllPodSentences, the
// canonical-pods loop, the admin-door pageAll, and debut-practice's pageAll);
// the fifth call, the legacy audio-stats read in startLegacyAudioGeneration,
// was already on it and keeps the helper's 5000 default. fetchAllRows had no
// callers and went.
// Two properties matter. (1) A server whose max-rows is SMALLER than the page
// size returns short pages that are not last, so the loop must stop on an
// EMPTY page, never on a short one (job #382: 31,245 rows hidden that way).
// (2) The caller's own order clause is the product (pod scripts are read in
// (pod_id, global_order) order); the helper's order on id is appended BEHIND
// it, and that must hold across page boundaries, not just on the first call.
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { readAllPages } = require('./paged-read.cjs')

// A fake PostgREST builder. Rows are sorted by the order clauses the caller
// actually sent, in the order they were sent, then sliced; `maxRows` is the
// server cap, applied after range.
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
        const sorted = [...rows].sort((a, b) => {
          for (const [col] of call.orders) { if (a[col] !== b[col]) return a[col] < b[col] ? -1 : 1 }
          return 0
        })
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

  it('keeps the caller\'s (pod_id, global_order) order across page boundaries, id only as tiebreak', async () => {
    // 2,300 pod sentences whose ids are in a DIFFERENT order from their script
    // order, as a re-generated pod leaves them: pod 2's lines were written
    // first, and inside each pod the ids run backwards against global_order.
    const rows = []
    let id = 1
    for (const pod_id of [2, 1, 3]) {
      for (let g = 766; g >= 1; g--) rows.push({ id: id++, pod_id, global_order: g })
    }
    rows.push({ id: id++, pod_id: 4, global_order: 1 }, { id: id++, pod_id: 4, global_order: 2 })
    expect(rows.length).toBe(2300)
    // The server caps at 700 rows, so a 1000-row page is short and the read
    // takes four short pages (700, 700, 700, 200), three ending mid-pod,
    // then the empty fifth page that ends the loop.
    const { build, calls } = fakeServer(rows, { maxRows: 700 })
    const out = await readAllPages(() => build().order('pod_id').order('global_order'), { pageSize: 1000 })

    expect(out.length).toBe(2300)
    expect(calls.length).toBe(5)
    for (const call of calls) expect(call.orders.map(o => o[0])).toEqual(['pod_id', 'global_order', 'id'])
    // The product: script order from the first row to the last, across every
    // page boundary, and nothing read twice.
    const expected = [...rows].sort((a, b) => a.pod_id - b.pod_id || a.global_order - b.global_order)
    expect(out.map(r => [r.pod_id, r.global_order])).toEqual(expected.map(r => [r.pod_id, r.global_order]))
    expect(new Set(out.map(r => r.id)).size).toBe(2300)
    // Would have been wrong if the helper's order on id came first.
    expect(out.map(r => r.id)).not.toEqual(rows.map(r => r.id))
  })

  it('wraps a PostgREST error object in a real Error carrying its message', async () => {
    const { build } = fakeServer([], { error: { message: 'canceling statement due to statement timeout' } })
    await expect(readAllPages(build)).rejects.toThrow('statement timeout')
  })
})
