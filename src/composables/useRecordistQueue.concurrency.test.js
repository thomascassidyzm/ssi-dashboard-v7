// TWO TAKES ON THE WIRE, FALLING BACK TO ONE (Aran, 2026-10-16, Phase 1 of the
// booth upload plan, job #221). Aran's conditions, each pinned here:
//   • two at once once the server has said it will take two;
//   • any error, timeout, 429/503 or slow answer drops to one by itself, and
//     it climbs back only after a run of clean answers;
//   • no take lost, none sent twice to a 2xx, order does not matter;
//   • two takes of the same line — or of the same words — never race.
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.setConfig({ testTimeout: 60000 })
import { useRecordistQueue } from './useRecordistQueue.js'
import { createMemoryBackend } from '@/services/takeStore.js'
import { createUploadConcurrency, STEP_UP_AFTER } from '@/services/uploadConcurrency.js'

let shelf
// The shelf's clock, so a take waiting out its backoff is made due by moving
// time on, never by rewriting a record that might be mid-confirm.
// Offset from the real clock so the queue's own wake timers (real time) agree
// with the shelf about how long a backoff has left.
let clock = 0
const storeOptions = { now: () => Date.now() + clock }
const blob = (n = 5000) => new Blob([new Uint8Array(n)], { type: 'audio/webm' })
const tick = (ms = 0) => new Promise(r => setTimeout(r, ms))
// Generous on purpose: this runs on a shared box that is often at load 30+.
async function settle(until, limit = 1000) {
  for (let i = 0; i < limit; i++) { if (until()) return true; await tick(10) }
  return until()
}

beforeEach(() => { shelf = createMemoryBackend(); clock = 0; localStorage.clear() })
// Every queue is torn down after its test: a queue left alive keeps refreshing
// the one-tab drain lock in localStorage, and the next test's queue — a
// different "tab" — would then rightly refuse to drain.
const live = []
function queue(opts) { const q = useRecordistQueue(opts); live.push(q); return q }
afterEach(() => { while (live.length) live.pop().teardown(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

/**
 * A server we hold in our hand. Every post waits until the test answers it,
 * so "how many are on the wire right now" is a fact, not a timing guess.
 */
function heldServer({ advertise = '2' } = {}) {
  const open = []          // { lineId, text, answer(resp) }
  const log = []           // every post, in order: { lineId, text }
  const stored = []        // lineIds the server answered 2xx
  let onWire = 0
  let maxOnWire = 0
  let n = 0
  const headers = h => ({ get: k => (k.toLowerCase() === 'x-booth-upload-concurrency' ? h : null) })
  vi.stubGlobal('fetch', vi.fn((url, init) => {
    const lineId = init.body.get('lineId')
    const text = init.body.get('text')
    log.push({ lineId, text })
    onWire += 1
    maxOnWire = Math.max(maxOnWire, onWire)
    return new Promise(resolve => {
      open.push({
        lineId, text,
        answer(kind = 'ok') {
          onWire -= 1
          const adv = typeof advertise === 'function' ? advertise() : advertise
          if (kind === 'ok') {
            n += 1
            stored.push(lineId)
            resolve({ ok: true, status: 200, headers: headers(adv), json: async () => ({ audioId: `aud-${lineId}-${n}` }) })
          } else {
            resolve({ ok: false, status: kind, headers: headers(adv), json: async () => ({ error: `boom ${kind}` }) })
          }
        },
      })
    })
  }))
  return {
    open, log, stored,
    get onWire() { return onWire },
    get maxOnWire() { return maxOnWire },
    /** answer the oldest open post */
    async next(kind = 'ok') {
      await settle(() => open.length > 0)
      const req = open.shift()
      req.answer(kind)
      await tick(5)
      return req
    },
  }
}

async function record(q, lineId, text = `words of ${lineId}`) {
  await q.queueTake({ voiceId: 'v1', lineId, text, blob: blob() })
}

describe('two at once', () => {
  it('climbs to two takes on the wire after a run of clean answers — and never past two', async () => {
    const srv = heldServer({ advertise: '2' })
    const q = queue({ storeBackend: shelf, storeOptions })
    await q.attach('v1')
    for (let i = 1; i <= 10; i++) await record(q, `L${i}`)
    // Starts at ONE: the server's ceiling is unknown until it has answered.
    await settle(() => srv.open.length > 0)
    await tick(20)
    expect(srv.onWire).toBe(1)
    for (let i = 0; i < STEP_UP_AFTER; i++) await srv.next('ok')
    // Now two are on the wire together.
    await settle(() => srv.onWire === 2)
    expect(srv.onWire).toBe(2)
    while (srv.stored.length < 10) await srv.next('ok')
    await settle(() => q.pendingCount.value === 0)
    expect(srv.maxOnWire).toBe(2)
    expect(await shelf.getAll()).toHaveLength(0)
    expect(q.saved.size).toBe(10)
  })

  it('stays at one while the server advertises one — the no-deploy switch', async () => {
    const srv = heldServer({ advertise: '1' })
    const q = queue({ storeBackend: shelf, storeOptions })
    await q.attach('v1')
    for (let i = 1; i <= 8; i++) await record(q, `L${i}`)
    while (srv.stored.length < 8) await srv.next('ok')
    await settle(() => q.pendingCount.value === 0)
    expect(srv.maxOnWire).toBe(1)
  })

  it('a server that stops advertising two brings a booth already at two back to one', async () => {
    let adv = '2'
    const srv = heldServer({ advertise: () => adv })
    const q = queue({ storeBackend: shelf, storeOptions })
    await q.attach('v1')
    for (let i = 1; i <= 12; i++) await record(q, `L${i}`)
    for (let i = 0; i < STEP_UP_AFTER; i++) await srv.next('ok')
    await settle(() => srv.onWire === 2)
    adv = '1'
    await srv.next('ok') // this answer carries "1"
    await srv.next('ok') // the other one already on the wire
    // From here on, never two.
    let peak = 0
    while (srv.stored.length < 12) { peak = Math.max(peak, srv.onWire); await srv.next('ok') }
    expect(peak).toBe(1)
  })
})

describe('falls back to one on trouble, and climbs back only after clean answers', () => {
  for (const status of [503, 429, 500]) {
    it(`a ${status} drops to one in flight, the take is retried and saved, nothing is lost`, async () => {
      const srv = heldServer({ advertise: '2' })
      const q = queue({ storeBackend: shelf, storeOptions })
      await q.attach('v1')
      for (let i = 1; i <= 8; i++) await record(q, `L${i}`)
      for (let i = 0; i < STEP_UP_AFTER; i++) await srv.next('ok')
      await settle(() => srv.onWire === 2)
      const failedReq = await srv.next(status)
      // The failed take is KEPT, pending, not refused.
      const rec = (await shelf.getAll()).find(r => r.lineId === failedReq.lineId)
      expect(rec.status).toBe('pending')
      expect(q.failed.has(failedReq.lineId)).toBe(false)
      // Finish the one still on the wire; from now on it is one at a time...
      await srv.next('ok')
      await settle(() => srv.open.length > 0)
      await tick(20)
      expect(srv.onWire).toBe(1)
      // ...for STEP_UP_AFTER clean answers.
      for (let i = 0; i < STEP_UP_AFTER - 1; i++) { expect(srv.onWire).toBe(1); await srv.next('ok') }
      // Make the failed take due again rather than wait out its backoff.
      clock += 120000
      q.drain()
      while (srv.stored.length < 8) await srv.next('ok')
      await settle(() => q.pendingCount.value === 0)
      expect(new Set(srv.stored)).toEqual(new Set(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8']))
      expect(srv.stored).toHaveLength(8)        // each stored exactly once
      expect(await shelf.getAll()).toHaveLength(0)
    })
  }

  it('a 429 is the server saying "later", never a refusal of the take', async () => {
    const srv = heldServer({ advertise: '2' })
    const q = queue({ storeBackend: shelf, storeOptions })
    await q.attach('v1')
    await record(q, 'L1')
    await srv.next(429)
    const rows = await shelf.getAll()
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('pending')
    expect(q.refusedCount.value).toBe(0)
  })

  it('a refusal of the take itself (422) is not the server\'s trouble: the pace holds at two', async () => {
    const srv = heldServer({ advertise: '2' })
    const pace = createUploadConcurrency()
    const q = queue({ storeBackend: shelf, storeOptions, pace })
    await q.attach('v1')
    for (let i = 1; i <= 6; i++) await record(q, `L${i}`)
    for (let i = 0; i < STEP_UP_AFTER; i++) await srv.next('ok')
    expect(pace.limit).toBe(2)
    await srv.next(422)
    expect(pace.limit).toBe(2)
    while (srv.stored.length < 5) await srv.next('ok')
  })

  it('a slow answer drops to one even though the take saved', () => {
    const pace = createUploadConcurrency({ slowMs: 1000 })
    pace.advertise('2')
    for (let i = 0; i < STEP_UP_AFTER; i++) pace.success(100)
    expect(pace.limit).toBe(2)
    pace.success(5000)
    expect(pace.limit).toBe(1)
    expect(pace.cleanStreak).toBe(0)
  })
})

describe('no take lost, none duplicated, order does not matter', () => {
  it('30 takes through a flaky server answering out of order: every one stored exactly once, shelf empty', async () => {
    const srv = heldServer({ advertise: '2' })
    const q = queue({ storeBackend: shelf, storeOptions })
    await q.attach('v1')
    const lines = Array.from({ length: 30 }, (_, i) => `L${i + 1}`)
    for (const l of lines) await record(q, l)
    let seed = 7
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    let guard = 0
    while (srv.stored.length < 30 && guard++ < 400) {
      await settle(() => srv.open.length > 0 || q.pendingCount.value === 0, 30)
      if (!srv.open.length) {
        // everything left is waiting out a backoff: make it due
        clock += 120000
        q.drain()
        continue
      }
      // answer a RANDOM open post, not the oldest — order must not matter
      const i = Math.floor(rand() * srv.open.length)
      const [req] = srv.open.splice(i, 1)
      const roll = rand()
      req.answer(roll < 0.2 ? 503 : roll < 0.25 ? 429 : 'ok')
      await tick(5)
    }
    await settle(() => q.pendingCount.value === 0)
    expect(srv.stored.slice().sort()).toEqual(lines.slice().sort())
    expect(new Set(srv.stored).size).toBe(30)
    expect(await shelf.getAll()).toHaveLength(0)
    expect(srv.maxOnWire).toBeLessThanOrEqual(2)
    for (const l of lines) expect(q.saved.has(l)).toBe(true)
  })
})

describe('the same-line race', () => {
  it('a re-read of a line on the wire waits for the first read\'s answer, and the re-read is the one that stands', async () => {
    const srv = heldServer({ advertise: '2' })
    const pace = createUploadConcurrency()
    pace.advertise('2'); for (let i = 0; i < STEP_UP_AFTER; i++) pace.success(1)
    const q = queue({ storeBackend: shelf, storeOptions, pace })
    await q.attach('v1')
    await record(q, 'L1', 'bore da')
    await settle(() => srv.open.length === 1)
    // The artist re-reads L1 while the first read is still on the wire.
    await record(q, 'L1', 'bore da')
    await record(q, 'L2', 'nos da')
    await settle(() => srv.open.length === 2)
    await tick(30)
    // A free slot went to L2, NOT to the re-read of L1.
    expect(srv.open.map(o => o.lineId).sort()).toEqual(['L1', 'L2'])
    expect(srv.log.filter(p => p.lineId === 'L1')).toHaveLength(1)
    await srv.next('ok') // first read of L1 answers
    await settle(() => srv.log.filter(p => p.lineId === 'L1').length === 2)
    while (srv.open.length) await srv.next('ok')
    await settle(() => q.pendingCount.value === 0)
    // L1 went up twice, strictly one after the other, and the screen holds the re-read.
    expect(srv.log.map(p => p.lineId)).toEqual(['L1', 'L2', 'L1'])
    expect(q.saved.get('L1').audioId).toBe(`aud-L1-3`)
    expect(srv.maxOnWire).toBe(2)
  })

  it('two DIFFERENT lines with the same words never travel together (the server files them as one slot)', async () => {
    const srv = heldServer({ advertise: '2' })
    const pace = createUploadConcurrency()
    pace.advertise('2'); for (let i = 0; i < STEP_UP_AFTER; i++) pace.success(1)
    const q = queue({ storeBackend: shelf, storeOptions, pace })
    await q.attach('v1')
    await record(q, 'seed:a:target1', 'Dw i’n hoffi coffi.')
    await record(q, 'lego:b:target1', 'dw in hoffi coffi')
    await record(q, 'L3', 'something else')
    await settle(() => srv.open.length === 2)
    await tick(30)
    expect(srv.open.map(o => o.lineId).sort()).toEqual(['L3', 'seed:a:target1'])
    while (srv.stored.length < 3) await srv.next('ok')
    expect(srv.log.map(p => p.lineId)).toEqual(['seed:a:target1', 'L3', 'lego:b:target1'])
  })
})
