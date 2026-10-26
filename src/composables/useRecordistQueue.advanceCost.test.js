// Advancing to the next line must not read the backlog's audio (#933).
//
// Aran, 2026-10-23: after a Supabase blip left ~90 takes queued, the booth
// lagged every time he moved to the next line. Advancing calls queueTake, which
// only writes the take down and recounts — but each recount loaded every unsent
// take WITH its audio, about six times over. This seeds 200 queued takes with
// real-sized (250 KB) audio on the real IndexedDB adapter and measures one
// advance: how many audio-bearing records it pulls off the shelf, and how long
// it takes. Then it runs the queue's rules end to end on that same adapter.
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { useRecordistQueue } from './useRecordistQueue.js'
import { createIndexedDbBackend, createTakeStore } from '@/services/takeStore.js'
import { createFakeIndexedDb } from '@/services/fakeIndexedDb.testkit.js'

const VOICE = 'human_aran_cym_n'
const TAKE_BYTES = 250 * 1024
const audio = (n = TAKE_BYTES) => new Blob([new Uint8Array(n)], { type: 'audio/webm' })
const tick = (ms = 0) => new Promise(r => setTimeout(r, ms))
async function until(fn, limit = 200) {
  for (let i = 0; i < limit; i++) { if (await fn()) return true; await tick(10) }
  return fn()
}

const live = []
beforeEach(() => localStorage.clear())
afterEach(() => { while (live.length) live.pop().teardown(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('advancing with 200 takes queued', () => {
  it('reads no queued audio and does not grow with the backlog', async () => {
    const fake = createFakeIndexedDb()
    const backend = createIndexedDbBackend(fake)
    const seed = createTakeStore(backend)
    for (let i = 0; i < 200; i++) {
      await seed.put({ voiceId: VOICE, lineId: `B${i}`, text: `backlog ${i}`, blob: audio() })
    }
    // The server has gone quiet: the first take goes on the wire and hangs,
    // exactly the state the booth is in during a blip.
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const q = useRecordistQueue({ storeBackend: backend })
    live.push(q)
    await q.attach(VOICE)
    await until(() => q.uploadingLine.value != null)
    expect(q.pendingCount.value).toBe(200)

    const ADVANCES = 5
    fake.resetReads()
    const started = performance.now()
    for (let i = 0; i < ADVANCES; i++) {
      await q.queueTake({ voiceId: VOICE, lineId: `N${i}`, text: `new ${i}`, blob: audio() })
      await tick(5) // let the drain wake and look for a free slot
    }
    const ms = (performance.now() - started) / ADVANCES
    const perAdvance = fake.reads.withAudio / ADVANCES
    const mbPerAdvance = fake.reads.audioBytes / ADVANCES / 1024 / 1024
    console.log(`[#933] one advance with 200 queued: ${perAdvance} audio records read (${mbPerAdvance.toFixed(1)} MB of audio), ${ms.toFixed(1)} ms in the fake`)

    expect(q.pendingCount.value).toBe(200 + ADVANCES)
    // Measured on the pre-#933 code: 811 audio records (198 MB) per advance.
    expect(perAdvance).toBe(0)
  })
})

describe('the queue rules, end to end on the IndexedDB adapter', () => {
  it('every take stored exactly once through a flaky server; a refused take is kept with its words; none lost', async () => {
    const fake = createFakeIndexedDb()
    const backend = createIndexedDbBackend(fake)
    const posted = new Map()
    let n = 0
    vi.stubGlobal('fetch', vi.fn(async (url, init) => {
      const lineId = init.body.get('lineId')
      n++
      if (lineId === 'L7') return { ok: false, status: 422, headers: { get: () => null }, json: async () => ({ error: 'That take came out silent.' }) }
      if (n % 3 === 0) return { ok: false, status: 503, headers: { get: () => null }, json: async () => ({}) }
      posted.set(lineId, (posted.get(lineId) || 0) + 1)
      return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ audioId: `a-${lineId}` }) }
    }))
    // A clock far enough ahead that every backoff has already elapsed.
    let clock = Date.now()
    const q = useRecordistQueue({ storeBackend: backend, storeOptions: { now: () => clock } })
    live.push(q)
    await q.attach(VOICE)
    for (let i = 0; i < 12; i++) await q.queueTake({ voiceId: VOICE, lineId: `L${i}`, text: `l${i}`, blob: audio(2000) })

    await until(async () => { clock += 120000; q.drain(); return posted.size === 11 && q.pendingCount.value === 0 }, 400)
    expect(posted.size).toBe(11)
    for (const count of posted.values()) expect(count).toBe(1)
    expect(q.refusedCount.value).toBe(1)
    expect(q.failed.get('L7')).toBe('That take came out silent.')
    // The refused take is still on the device, audio and all.
    const left = fake.raw('ssi-recordist-takes', 'takes')
    expect(left).toHaveLength(1)
    expect(left[0]).toMatchObject({ lineId: 'L7', status: 'refused' })
    expect(left[0].blob.size).toBe(2000)
    expect(await q.refusedBlob('L7')).toBe(left[0].blob)
  })

  it('a take that leaves the shelf between being chosen and being loaded is not sent', async () => {
    const fake = createFakeIndexedDb()
    const backend = createIndexedDbBackend(fake)
    const seed = createTakeStore(backend)
    const gone = await seed.put({ voiceId: VOICE, lineId: 'G', blob: audio(10) })
    await seed.put({ voiceId: VOICE, lineId: 'H', blob: audio(10) })
    // Another tab confirms G the instant after this tab picked it.
    const realGet = backend.get
    backend.get = async id => { if (id === gone.id) { await backend.remove(id); } return realGet(id) }
    const sent = []
    vi.stubGlobal('fetch', vi.fn(async (url, init) => {
      sent.push(init.body.get('lineId'))
      return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ audioId: 'x' }) }
    }))
    const q = useRecordistQueue({ storeBackend: backend })
    live.push(q)
    await q.attach(VOICE)
    await until(() => q.pendingCount.value === 0 && sent.length > 0)
    expect(sent).toEqual(['H'])
  })

  it('the stale count still reports old unsent takes without deleting them', async () => {
    const fake = createFakeIndexedDb()
    const backend = createIndexedDbBackend(fake)
    let clock = 1000
    const seed = createTakeStore(backend, { now: () => clock })
    await seed.put({ voiceId: VOICE, lineId: 'OLD', blob: audio(10) })
    clock += 31 * 24 * 60 * 60 * 1000
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const q = useRecordistQueue({ storeBackend: backend, storeOptions: { now: () => clock } })
    live.push(q)
    await q.attach(VOICE)
    expect(q.staleCount.value).toBe(1)
    expect(q.carriedOverCount.value).toBe(1)
    expect(fake.raw('ssi-recordist-takes', 'takes')).toHaveLength(1)
  })
})
