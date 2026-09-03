// The drainer. These tests are the four failure shapes Tom named on 2026-09-03,
// written down so they cannot come back:
//   1. bytes captured, nothing on the server, no record anywhere
//   2. persisted but never resumed — a graveyard in IndexedDB
//   3. the screen says saved while the bytes are still in the browser
//   4. a 4xx take vanishing silently
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRecordistQueue } from './useRecordistQueue.js'
import { createTakeStore, createMemoryBackend } from '@/services/takeStore.js'

// One shared memory shelf per test, injected in place of IndexedDB so the RULES
// are what is under test here. The real IndexedDB adapter is proved in a
// browser — the only place an IndexedDB adapter can honestly be proved.
let shelf
function queueOn(opts = {}) {
  return useRecordistQueue({ storeBackend: shelf, ...opts })
}

const blob = (n = 5000) => new Blob([new Uint8Array(n)], { type: 'audio/webm' })
const tick = (ms = 0) => new Promise(r => setTimeout(r, ms))

beforeEach(() => {
  shelf = createMemoryBackend()
  localStorage.clear()
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

function respond(sequence) {
  let i = 0
  const calls = []
  const fetchMock = vi.fn(async (url, init) => {
    calls.push({ url, init })
    const step = sequence[Math.min(i, sequence.length - 1)]
    i++
    if (typeof step === 'function') return step()
    return step
  })
  vi.stubGlobal('fetch', fetchMock)
  return { calls, fetchMock }
}
const ok = (audioId = 'aud-1') => ({ ok: true, status: 200, json: async () => ({ audioId, clipUrl: '/c.mp3' }) })
const fail = status => ({ ok: false, status, json: async () => ({ error: `boom ${status}` }) })
const netDown = () => { throw new TypeError('Failed to fetch') }

async function settle(q, until, limit = 60) {
  for (let i = 0; i < limit; i++) { if (until()) return true; await tick(20) }
  return until()
}

describe('the take is persisted before anything is uploaded', () => {
  it('writes the take to the shelf before the first fetch', async () => {
    const order = []
    vi.stubGlobal('fetch', vi.fn(async () => { order.push('fetch'); return ok() }))
    const spyPut = shelf.put.bind(shelf)
    shelf.put = async r => { order.push('shelf'); return spyPut(r) }
    const q = queueOn()
    await q.attach('v1')
    await q.queueTake({ voiceId: 'v1', lineId: 'L1', text: 'bore da', blob: blob() })
    await settle(q, () => order.includes('fetch'))
    expect(order[0]).toBe('shelf')
    expect(order).toContain('fetch')
  })

  it('the line reads UNSENT the instant it is captured, and only stops when the server confirms', async () => {
    respond([ok('aud-9')])
    const q = queueOn()
    await q.attach('v1')
    const p = q.queueTake({ voiceId: 'v1', lineId: 'L1', blob: blob() })
    expect(q.isUnsent('L1')).toBe(true)      // truthful immediately
    expect(q.saved.has('L1')).toBe(false)
    await p
    await settle(q, () => q.saved.has('L1'))
    expect(q.saved.get('L1').audioId).toBe('aud-9')
    expect(q.isUnsent('L1')).toBe(false)
    expect(q.pendingCount.value).toBe(0)
  })
})

describe('there is no give-up point', () => {
  it('survives far more failures than the old three-strike queue and still holds the bytes', async () => {
    const { fetchMock } = respond([fail(502)])
    const q = queueOn()
    await q.attach('v1')
    await q.queueTake({ voiceId: 'v1', lineId: 'L1', blob: blob(4242) })
    await settle(q, () => fetchMock.mock.calls.length >= 1)
    for (let i = 0; i < 6; i++) { await q.drain(); await tick(5) }
    const rows = await shelf.getAll()
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('pending')
    expect(rows[0].blob.size).toBe(4242)     // the audio is STILL HERE
    expect(q.pendingCount.value).toBe(1)
    expect(q.isUnsent('L1')).toBe(true)
    expect(q.saved.has('L1')).toBe(false)    // and the screen has never said saved
  })

  it('recovers when the network comes back — the take that failed goes up next attempt', async () => {
    let up = false
    respond([() => (up ? ok('aud-late') : netDown())])
    const q = queueOn()
    await q.attach('v1')
    await q.queueTake({ voiceId: 'v1', lineId: 'L1', blob: blob() })
    await settle(q, () => q.lastError.value !== null)
    expect((await shelf.getAll())).toHaveLength(1)
    up = true
    // the backoff for a first failure is ~1s; nudge it rather than wait
    const rows = await shelf.getAll(); rows[0].nextAttemptAt = 0; await shelf.put(rows[0])
    await q.drain()
    await settle(q, () => q.saved.has('L1'))
    expect(q.saved.get('L1').audioId).toBe('aud-late')
    expect(await shelf.getAll()).toHaveLength(0)
  })
})

describe('bytes are deleted only on a confirmed store, or on a refusal in words', () => {
  it('a 2xx with an audioId is the ONLY thing that clears the shelf', async () => {
    respond([ok('aud-1')])
    const q = queueOn()
    await q.attach('v1')
    await q.queueTake({ voiceId: 'v1', lineId: 'L1', blob: blob() })
    await settle(q, () => q.saved.has('L1'))
    expect(await shelf.getAll()).toHaveLength(0)
  })

  it('a 4xx keeps the take on the device, marked refused, with the server\'s words', async () => {
    respond([fail(422)])
    const q = queueOn()
    await q.attach('v1')
    await q.queueTake({ voiceId: 'v1', lineId: 'L1', blob: blob() })
    await settle(q, () => q.failed.has('L1'))
    expect(q.failed.get('L1')).toContain('boom 422')
    const rows = await shelf.getAll()
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('refused')
    expect(rows[0].blob).toBeTruthy()
    expect(q.refusedCount.value).toBe(1)
    expect(q.pendingCount.value).toBe(0)     // not pending — it will not be retried
  })

  it('does not retry a refused take for ever', async () => {
    const { fetchMock } = respond([fail(400)])
    const q = queueOn()
    await q.attach('v1')
    await q.queueTake({ voiceId: 'v1', lineId: 'L1', blob: blob() })
    await settle(q, () => q.failed.has('L1'))
    const after = fetchMock.mock.calls.length
    await q.drain(); await q.drain(); await tick(10)
    expect(fetchMock.mock.calls.length).toBe(after)
  })

  it('lets the artist explicitly discard a refused take', async () => {
    respond([fail(415)])
    const q = queueOn()
    await q.attach('v1')
    await q.queueTake({ voiceId: 'v1', lineId: 'L1', blob: blob() })
    await settle(q, () => q.failed.has('L1'))
    await q.discardRefused('L1')
    expect(await shelf.getAll()).toHaveLength(0)
    expect(q.failed.has('L1')).toBe(false)
  })
})

describe('resume — persisting without a resume is just a different graveyard', () => {
  it('picks up an unsent take left by a PREVIOUS session and sends it', async () => {
    // A session that ended with a take on the shelf and no server record.
    const previous = createTakeStore(shelf, { now: () => 1000 })
    await previous.put({ voiceId: 'v1', lineId: 'L7', text: 'nos da', blob: blob(3333) })
    expect(await shelf.getAll()).toHaveLength(1)

    respond([ok('aud-resumed')])
    const q = queueOn()                                // a brand new booth, next week
    await q.attach('v1')
    expect(q.carriedOverCount.value).toBe(1)           // and it says so out loud
    await settle(q, () => q.saved.has('L7'))
    expect(q.saved.get('L7').audioId).toBe('aud-resumed')
    expect(await shelf.getAll()).toHaveLength(0)
  })

  it('reports old unsent takes without deleting them', async () => {
    const old = createTakeStore(shelf, { now: () => Date.now() - 60 * 24 * 3600 * 1000 })
    await old.put({ voiceId: 'v1', lineId: 'L1', blob: blob() })
    respond([fail(502)])
    const q = queueOn()
    await q.attach('v1')
    await settle(q, () => q.pendingCount.value === 1)
    expect(q.staleCount.value).toBe(1)
    expect(await shelf.getAll()).toHaveLength(1)
  })

  it('reset() clears the screen and never the shelf', async () => {
    respond([fail(502)])
    const q = queueOn()
    await q.attach('v1')
    await q.queueTake({ voiceId: 'v1', lineId: 'L1', blob: blob() })
    await settle(q, () => q.pendingCount.value === 1)
    q.reset()
    await tick(20)
    expect(await shelf.getAll()).toHaveLength(1)
  })
})

describe('superseding a re-read', () => {
  it('a re-read replaces the unsent take of the same line', async () => {
    respond([fail(502)])
    const q = queueOn()
    await q.attach('v1')
    await q.queueTake({ voiceId: 'v1', lineId: 'L1', blob: blob(100) })
    await settle(q, () => q.pendingCount.value === 1)
    await q.queueTake({ voiceId: 'v1', lineId: 'L1', blob: blob(200) })
    const rows = await shelf.getAll()
    expect(rows).toHaveLength(1)
    expect(rows[0].blob.size).toBe(200)
  })

  it('a client-side silent take is reported without ever touching the shelf', async () => {
    respond([ok()])
    const q = queueOn()
    await q.attach('v1')
    q.markFailed('L5', 'That take came out silent — read it again.')
    expect(q.failed.get('L5')).toContain('silent')
    expect(await shelf.getAll()).toHaveLength(0)
  })
})

describe('two tabs', () => {
  it('only one tab drains the shelf at a time', async () => {
    const { fetchMock } = respond([
      () => new Promise(r => setTimeout(() => r(ok('aud-a')), 60)),
      ok('aud-b'),
    ])
    const a = queueOn()
    const b = queueOn()
    await a.attach('v1')
    await b.attach('v1')
    await a.queueTake({ voiceId: 'v1', lineId: 'L1', blob: blob() })
    await tick(10)
    await b.drain()                    // the second tab must find the lock held
    await tick(10)
    expect(fetchMock.mock.calls.length).toBe(1)
  })
})
