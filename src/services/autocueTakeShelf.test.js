// @vitest-environment jsdom
// The Record Room's script takes survive a reload (job #43, Auke 2026-11-02): each take sits on the
// device shelf until the server has answered for it, and a later page load sends what it finds.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAutocueShelf, refusalEndsTake, shelfLineKey } from './autocueTakeShelf.js'
import { createMemoryBackend } from './takeStore.js'
import { useUploadQueue, setUploadShelf, recoverShelved } from '@/composables/useAudioUpload'

const meta = (text, cadence = 'natural') => ({ text, cadence, itemKind: 'phrase', itemId: text, voiceId: 'human_auke' })
const blob = (s = 'x') => new Blob([s], { type: 'audio/webm' })
function reply(status, body = {}) {
  return Promise.resolve({ ok: status < 300, status, json: async () => body })
}
const flush = () => new Promise(r => setTimeout(r, 0))

let shelf
beforeEach(() => {
  shelf = createAutocueShelf(createMemoryBackend())
  setUploadShelf(shelf)
  useUploadQueue().resetQueue()
})
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); setUploadShelf(null) })

describe('the device shelf', () => {
  it('a re-read of the same line supersedes the earlier take; other lines are kept', async () => {
    await shelf.put({ courseCode: 'fry_for_eng', voiceId: 'v', blob: blob(), metadata: meta('a') })
    await shelf.put({ courseCode: 'fry_for_eng', voiceId: 'v', blob: blob(), metadata: meta('b') })
    const again = await shelf.put({ courseCode: 'fry_for_eng', voiceId: 'v', blob: blob('2'), metadata: meta('a') })
    const left = await shelf.list({ courseCode: 'fry_for_eng' })
    expect(left.map(r => r.text).sort()).toEqual(['a', 'b'])
    expect(left.find(r => r.text === 'a').id).toBe(again.id)
    expect(shelfLineKey(meta('a'))).not.toBe(shelfLineKey(meta('a', 'slow')))
  })

  it('only a verdict on the bytes ends a take — never auth, a 5xx or a network failure', () => {
    expect(refusalEndsTake(422)).toBe(true)
    expect(refusalEndsTake(400)).toBe(true)
    for (const s of [401, 403, 404, 429, 500, 502, 503, undefined]) expect(refusalEndsTake(s)).toBe(false)
  })
})

describe('the upload queue answers to the shelf', () => {
  it('a stored take leaves the shelf; a take that only ever met 502s stays for the next page load', async () => {
    vi.useFakeTimers()
    const ok = await shelf.put({ courseCode: 'fry_for_eng', voiceId: 'v', blob: blob(), metadata: meta('stored') })
    const bad = await shelf.put({ courseCode: 'fry_for_eng', voiceId: 'v', blob: blob(), metadata: meta('deploying') })
    const statuses = [200, 502, 502, 502]
    vi.stubGlobal('fetch', vi.fn(() => reply(statuses.shift(), { uuid: 'U' })))
    const q = useUploadQueue()
    q.queueUpload({ blob: blob(), courseCode: 'fry_for_eng', uuid: null, metadata: meta('stored'), provenance: {}, itemIndex: 0, shelfId: ok.id })
    q.queueUpload({ blob: blob(), courseCode: 'fry_for_eng', uuid: null, metadata: meta('deploying'), provenance: {}, itemIndex: 1, shelfId: bad.id })
    await vi.advanceTimersByTimeAsync(20000)
    expect(q.pendingCount.value).toBe(0)
    const left = await shelf.list({ courseCode: 'fry_for_eng' })
    expect(left.map(r => r.id)).toEqual([bad.id])
  })

  it('takes left by an earlier page load are sent on the next one, and leave the shelf once stored', async () => {
    await shelf.put({ courseCode: 'fry_for_eng', voiceId: 'v', blob: blob(), metadata: meta('one') })
    await shelf.put({ courseCode: 'fry_for_eng', voiceId: 'v', blob: blob(), metadata: meta('two') })
    await shelf.put({ courseCode: 'cym_for_eng', voiceId: 'v', blob: blob(), metadata: meta('other course') })
    const sent = []
    vi.stubGlobal('fetch', vi.fn((url, init) => { sent.push(JSON.parse(init.body)); return reply(200, { uuid: 'U' }) }))
    const out = await recoverShelved(shelf, { courseCode: 'fry_for_eng' })
    expect(out).toEqual({ found: 2, sent: 2, refused: 0, kept: 0 })
    expect(sent.map(b => b.metadata.text)).toEqual(['one', 'two'])
    expect(sent.every(b => b.metadata.recoveredFromDevice === true && b.audioData)).toBe(true)
    expect((await shelf.list({ courseCode: 'fry_for_eng' })).length).toBe(0)
    expect((await shelf.list({ courseCode: 'cym_for_eng' })).length).toBe(1)
    await flush()
  })
})

describe('what goes on the shelf is cloneable', () => {
  it('stores plain copies of reactive metadata (a Vue proxy array cannot be cloned into IndexedDB)', async () => {
    const { reactive } = await import('vue')
    const puts = []
    const backend = { ...createMemoryBackend(), put: async (rec) => { puts.push(rec); structuredClone({ ...rec, blob: null }) } }
    const s = createAutocueShelf(backend)
    await s.put({ courseCode: 'fry_for_eng', voiceId: 'v', blob: blob(), metadata: { ...meta('a'), coversLegos: reactive(['S0001L01']) } })
    expect(puts[0].metadata.coversLegos).toEqual(['S0001L01'])
  })
})
