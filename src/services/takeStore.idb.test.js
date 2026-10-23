// The take store's IndexedDB adapter, against an in-process IndexedDB (#933).
//
// What these pin down: the booth's bookkeeping reads no audio; the 1 → 2
// upgrade keeps every take already queued in a browser (nothing wiped); the
// metadata copy can never hide a take; and a newer page can always upgrade.
import { describe, it, expect } from 'vitest'
import {
  createIndexedDbBackend, createTakeStore, openTakeStore, metaOf,
  DB_NAME, STORE_NAME, META_STORE_NAME, PENDING, REFUSED,
} from './takeStore.js'
import { createFakeIndexedDb } from './fakeIndexedDb.testkit.js'

const audio = n => new Blob([new Uint8Array(n)], { type: 'audio/webm' })

// The shelf exactly as the version-1 booth left it: one store, full records.
async function seedVersionOne(fake, n) {
  const db = await new Promise((resolve, reject) => {
    const req = fake.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  await new Promise(resolve => {
    const t = db.transaction(STORE_NAME, 'readwrite')
    const s = t.objectStore(STORE_NAME)
    for (let i = 0; i < n; i++) {
      s.put({
        id: `old-${String(i).padStart(3, '0')}`, voiceId: 'human_aran_cym_n', lineId: `L${i}`, text: `llinell ${i}`,
        blob: audio(1000 + i), device: 'mic', status: i % 10 === 0 ? REFUSED : PENDING,
        attempts: i % 3, lastError: i % 10 === 0 ? 'silent' : null, createdAt: 1000 + i, nextAttemptAt: 0,
      })
    }
    t.oncomplete = resolve
  })
  db.close()
}

describe('takeStore on IndexedDB — the 1 → 2 upgrade keeps every queued take', () => {
  it('a booth with 90 takes queued under version 1 sees all 90 after the upgrade, audio intact, nothing deleted', async () => {
    const fake = createFakeIndexedDb()
    await seedVersionOne(fake, 90)
    const before = fake.raw(DB_NAME, STORE_NAME).map(r => ({ ...r }))

    const store = await openTakeStore({ idbFactory: fake })
    expect(store.available).toBe(true)

    const { pending, refused } = await store.snapshot('human_aran_cym_n')
    expect(pending).toHaveLength(81)
    expect(refused).toHaveLength(9)
    expect(refused[0].lastError).toBe('silent')
    // Order, attempts and every field but the audio survive into the metadata.
    expect(pending[0].lineId).toBe('L1')
    expect(pending[1].attempts).toBe(2)
    expect(pending[0].blob).toBeUndefined()

    // The takes store is untouched — same records, same audio.
    const after = fake.raw(DB_NAME, STORE_NAME)
    expect(after).toHaveLength(90)
    for (const rec of before) {
      const now = after.find(r => r.id === rec.id)
      expect(now).toEqual(rec)
      expect(now.blob).toBe(rec.blob)
    }
    // And each one still loads with its audio, ready to send.
    const full = await store.load('old-005')
    expect(full.blob.size).toBe(1005)
    expect(fake.raw(DB_NAME, META_STORE_NAME)).toHaveLength(90)
  })

  it('an empty version-1 shelf upgrades to an empty version-2 shelf', async () => {
    const fake = createFakeIndexedDb()
    await seedVersionOne(fake, 0)
    const store = await openTakeStore({ idbFactory: fake })
    expect(await store.all(null)).toEqual([])
  })
})

describe('takeStore on IndexedDB — bookkeeping reads no audio', () => {
  it('put, recount, retry and refuse keep the take and its metadata in step; only load() reads audio', async () => {
    const fake = createFakeIndexedDb()
    let t = 5000
    const store = createTakeStore(createIndexedDbBackend(fake), { now: () => t })
    const a = await store.put({ voiceId: 'v', lineId: 'L1', text: 'un', blob: audio(250000) })
    const b = await store.put({ voiceId: 'v', lineId: 'L2', text: 'dau', blob: audio(250000) })

    fake.resetReads()
    const snap = await store.snapshot('v')
    expect(snap.pending.map(r => r.id)).toEqual([a.id, b.id])
    expect(snap.pending[0].blobSize).toBe(250000)
    expect(await store.nextDue('v')).toMatchObject({ id: a.id })
    expect(fake.reads.withAudio).toBe(0)

    await store.recordFailure(a.id, 'offline', () => 0.5)
    await store.markRefused(b.id, 'silent')
    const meta = fake.raw(DB_NAME, META_STORE_NAME)
    const takes = fake.raw(DB_NAME, STORE_NAME)
    for (const m of meta) expect(m).toEqual(metaOf(takes.find(r => r.id === m.id)))
    expect(meta.find(r => r.id === b.id).status).toBe(REFUSED)
    expect(meta.find(r => r.id === a.id)).toMatchObject({ attempts: 1, lastError: 'offline', nextAttemptAt: 5000 + 1000 })

    // A re-read supersedes from both stores at once.
    await store.put({ voiceId: 'v', lineId: 'L1', text: 'un', blob: audio(10) })
    expect(fake.raw(DB_NAME, STORE_NAME).filter(r => r.lineId === 'L1')).toHaveLength(1)
    expect(fake.raw(DB_NAME, META_STORE_NAME).filter(r => r.lineId === 'L1')).toHaveLength(1)

    await store.confirm(b.id)
    expect(fake.raw(DB_NAME, STORE_NAME).map(r => r.id)).not.toContain(b.id)
    expect(fake.raw(DB_NAME, META_STORE_NAME).map(r => r.id)).not.toContain(b.id)
  })

  it('load() of a take that has left the shelf is null, not a stray request object', async () => {
    const fake = createFakeIndexedDb()
    const store = createTakeStore(createIndexedDbBackend(fake))
    expect(await store.load('nope')).toBeNull()
  })
})

describe('takeStore on IndexedDB — the metadata copy can never hide a take', () => {
  it('a take with no metadata row is still seen, and its row rebuilt; an orphaned row is dropped', async () => {
    const fake = createFakeIndexedDb()
    const backend = createIndexedDbBackend(fake)
    const store = createTakeStore(backend)
    const kept = await store.put({ voiceId: 'v', lineId: 'L1', blob: audio(10) })
    await store.put({ voiceId: 'v', lineId: 'L2', blob: audio(10) })

    // Knock the two stores out of step behind the adapter's back.
    const db = await new Promise(r => { const q = fake.open(DB_NAME, 2); q.onsuccess = () => r(q.result) })
    await new Promise(r => {
      const t = db.transaction([STORE_NAME, META_STORE_NAME], 'readwrite')
      t.objectStore(META_STORE_NAME).delete(kept.id)
      t.objectStore(META_STORE_NAME).put({ id: 'ghost', voiceId: 'v', lineId: 'L9', status: PENDING, createdAt: 0 })
      t.oncomplete = r
    })

    const pending = await store.pending('v')
    expect(pending.map(r => r.lineId).sort()).toEqual(['L1', 'L2'])
    expect(fake.raw(DB_NAME, META_STORE_NAME).map(r => r.id).sort()).toEqual(fake.raw(DB_NAME, STORE_NAME).map(r => r.id).sort())
  })
})

describe('takeStore on IndexedDB — a newer page can always upgrade', () => {
  it('an open booth closes its connection when a later version asks, so the upgrade is not blocked', async () => {
    const fake = createFakeIndexedDb()
    const store = await openTakeStore({ idbFactory: fake })
    await store.put({ voiceId: 'v', lineId: 'L1', blob: audio(10) })
    const upgraded = await new Promise((resolve, reject) => {
      const req = fake.open(DB_NAME, 3)
      req.onupgradeneeded = () => {}
      req.onsuccess = () => resolve(req.result.version)
      req.onblocked = () => reject(new Error('blocked'))
    })
    expect(upgraded).toBe(3)
  })
})
