import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import queueMod from '../guardian-queue.cjs'

const { GuardianQueue } = queueMod

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('GuardianQueue — debounce + coalesce', () => {
  it('coalesces rapid edits to the same item into ONE review (earliest before, latest after)', async () => {
    const runs = []
    const q = new GuardianQueue({ processFn: async (j) => runs.push(j), debounceMs: 1000 })
    q.enqueue({ courseCode: 'c', table: 'course_seeds', pk: 1, before: { target_text: 'v0' }, after: { target_text: 'v1' } })
    vi.advanceTimersByTime(400)
    q.enqueue({ courseCode: 'c', table: 'course_seeds', pk: 1, before: { target_text: 'v1' }, after: { target_text: 'v2' } })
    vi.advanceTimersByTime(400)
    q.enqueue({ courseCode: 'c', table: 'course_seeds', pk: 1, before: { target_text: 'v2' }, after: { target_text: 'v3' } })
    expect(q.stats().pending).toBe(1) // still one coalesced item
    expect(runs.length).toBe(0)       // debounce not elapsed
    await vi.advanceTimersByTimeAsync(1000)
    expect(runs.length).toBe(1)
    expect(runs[0].before).toEqual({ target_text: 'v0' }) // earliest before
    expect(runs[0].after).toEqual({ target_text: 'v3' })  // latest after
  })

  it('separate items run separately', async () => {
    const runs = []
    const q = new GuardianQueue({ processFn: async (j) => runs.push(j.pk), debounceMs: 500 })
    q.enqueue({ courseCode: 'c', table: 'course_legos', pk: 'a', after: {} })
    q.enqueue({ courseCode: 'c', table: 'course_legos', pk: 'b', after: {} })
    await vi.advanceTimersByTimeAsync(500)
    expect(runs.sort()).toEqual(['a', 'b'])
  })
})

describe('GuardianQueue — concurrency cap', () => {
  it('never runs more than `concurrency` reviews at once', async () => {
    let inFlight = 0
    let maxSeen = 0
    let resolveFns = []
    const processFn = () => new Promise((res) => {
      inFlight++; maxSeen = Math.max(maxSeen, inFlight)
      resolveFns.push(() => { inFlight--; res() })
    })
    const q = new GuardianQueue({ processFn, debounceMs: 100, concurrency: 2 })
    for (let i = 0; i < 5; i++) q.enqueue({ courseCode: 'c', table: 'course_legos', pk: `p${i}`, after: {} })
    await vi.advanceTimersByTimeAsync(100)
    expect(q.stats().inFlight).toBe(2)
    expect(maxSeen).toBe(2)
    // drain
    while (resolveFns.length) { resolveFns.shift()(); await Promise.resolve() }
  })

  it('a failing review does not wedge the queue (onError + keeps draining)', async () => {
    const errors = []
    const done = []
    const processFn = async (j) => { if (j.pk === 'bad') throw new Error('boom'); done.push(j.pk) }
    const q = new GuardianQueue({ processFn, debounceMs: 10, concurrency: 1, onError: (e, j) => errors.push(j.pk) })
    q.enqueue({ courseCode: 'c', table: 'course_legos', pk: 'bad', after: {} })
    q.enqueue({ courseCode: 'c', table: 'course_legos', pk: 'good', after: {} })
    await vi.advanceTimersByTimeAsync(10)
    await vi.advanceTimersByTimeAsync(0)
    expect(errors).toContain('bad')
    expect(done).toContain('good')
  })
})
