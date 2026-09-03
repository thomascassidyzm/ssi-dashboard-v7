// src/services/takeStore.js
//
// THE POINT OF THIS FILE. A take that exists only as a Blob in a JavaScript
// array is a take that can be lost — by a closed tab, a sleeping phone, an
// evicted page, or three failed retries. On 2026-09-03 Aran read ~250 Welsh
// lines and finished a session with many still saying "still saving", and the
// bytes behind those words were in an in-memory queue with a three-strike
// discard at the end of it. Tom's ruling that night: "work out an approach to
// make sure unequivocally everything that is recorded is 100% uploaded.
// Always - we can NOT have things hanging and never getting to popty."
//
// So: THE TAKE MUST SURVIVE THE TAB. Every take is written here, to IndexedDB,
// the instant it exists and BEFORE the first fetch is attempted. It is deleted
// only when the server has confirmed it is stored, or when the server has
// refused it in words a human can read. Nothing else deletes audio.
//
// Two layers on purpose:
//   • createTakeStore(backend) — the rules (supersede, retry schedule, status
//     transitions, retention). Pure, synchronous-ish, unit-tested against a
//     memory backend in takeStore.test.js.
//   • indexedDbBackend() — the durable shelf. Proved in a real browser, which
//     is the only place an IndexedDB adapter can honestly be proved.
//
// The store is small by construction: one session's takes, each deleted on
// confirmation. Reading the whole table is cheaper than maintaining indexes.

// A marker a human can grep for in the SERVED bundle to prove this shipped.
export const DURABLE_TAKES_FEATURE = 'durable-take-store-2026-09-03'

export const DB_NAME = 'ssi-recordist-takes'
export const STORE_NAME = 'takes'
export const DB_VERSION = 1

// Status vocabulary. There is deliberately no 'failed' and no 'gave up': a
// transient failure never leaves 'pending', because there is no give-up point.
export const PENDING = 'pending'   // has never been confirmed by the server
export const REFUSED = 'refused'   // the server judged THESE bytes unusable (4xx)

/**
 * How long to wait before the next attempt, by attempt number.
 *
 * The old queue had MAX_RETRIES = 3 and RETRY_BACKOFF = [1000, 3000, 8000] and
 * then dropped the bytes on the floor. popty.app's /api/recording/* edge route
 * was measured answering 502 on roughly 4 of 11 attempts on 2026-09-03 while
 * the Node service behind it stayed healthy — twelve seconds of retrying is not
 * remotely enough to ride that out, and no amount of retrying is the fix
 * anyway. What matters is that the take is still HERE when the next attempt
 * comes, whether that is in a second or next Tuesday.
 *
 * So this tops out and stays there: 1s, 3s, 8s, 20s, 60s, then every 60s for
 * ever. Jitter keeps two tabs and two takes off the same instant.
 */
export const BACKOFF_MS = [1000, 3000, 8000, 20000, 60000]

export function backoffFor(attempts, rand = Math.random) {
  const base = BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)]
  const jitter = base * 0.2 * (rand() * 2 - 1)
  return Math.max(250, Math.round(base + jitter))
}

/**
 * The rules over a backend.
 *
 * backend: { getAll(): Promise<rec[]>, put(rec): Promise<void>,
 *            remove(id): Promise<void>, available: boolean }
 */
export function createTakeStore(backend, { now = () => Date.now() } = {}) {
  let seq = 0
  function newId() {
    seq += 1
    return `t${now()}-${seq}-${Math.random().toString(36).slice(2, 8)}`
  }

  return {
    get available() { return !!backend.available },

    /**
     * Persist a freshly captured take. SUPERSEDES any earlier take of the same
     * line that has not yet reached the server — a re-read replaces the read,
     * and shipping both would file the wrong one under the line half the time.
     * A REFUSED take of the same line is superseded too: the re-read is the
     * artist answering the refusal.
     */
    async put({ voiceId, lineId, text, blob, device }) {
      const all = await backend.getAll()
      for (const rec of all) {
        if (rec.voiceId === voiceId && rec.lineId === lineId) await backend.remove(rec.id)
      }
      const rec = {
        id: newId(),
        voiceId,
        lineId,
        text: text || '',
        blob,
        device: device || '',
        status: PENDING,
        attempts: 0,
        lastError: null,
        createdAt: now(),
        nextAttemptAt: 0,
      }
      await backend.put(rec)
      return rec
    },

    async all(voiceId) {
      const all = await backend.getAll()
      const mine = voiceId ? all.filter(r => r.voiceId === voiceId) : all
      return mine.sort((a, b) => a.createdAt - b.createdAt)
    },

    async pending(voiceId) {
      return (await this.all(voiceId)).filter(r => r.status === PENDING)
    },

    async refused(voiceId) {
      return (await this.all(voiceId)).filter(r => r.status === REFUSED)
    },

    /** The oldest pending take whose backoff has elapsed. Sequential by design. */
    async nextDue(voiceId) {
      const t = now()
      return (await this.pending(voiceId)).find(r => (r.nextAttemptAt || 0) <= t) || null
    },

    /** When the soonest pending take becomes due, or null if there are none. */
    async soonestDue(voiceId) {
      const due = (await this.pending(voiceId)).map(r => r.nextAttemptAt || 0)
      return due.length ? Math.min(...due) : null
    },

    /**
     * A transient failure: count it, push the next attempt out, KEEP the bytes.
     *
     * If the take was superseded by a re-read while this attempt was in flight
     * the record is gone and this does nothing. If the delete lands in the gap
     * between the read and the write below, the old take comes back and goes up
     * before the newer one — which drains second, being newer, and wins on the
     * server. Erring towards an extra upload rather than a lost one is the
     * whole posture of this file.
     */
    async recordFailure(id, message, rand) {
      const rec = (await backend.getAll()).find(r => r.id === id)
      if (!rec) return null
      rec.attempts = (rec.attempts || 0) + 1
      rec.lastError = message || 'Could not save that take.'
      rec.nextAttemptAt = now() + backoffFor(rec.attempts - 1, rand)
      await backend.put(rec)
      return rec
    },

    /**
     * The server's verdict on THESE bytes. The take stays on the device with
     * the server's own words attached — nothing is ever deleted without either
     * a confirmed store or an explicit, human-readable refusal.
     */
    async markRefused(id, message) {
      const rec = (await backend.getAll()).find(r => r.id === id)
      if (!rec) return null
      rec.status = REFUSED
      rec.lastError = message || 'The server would not take that recording.'
      rec.refusedAt = now()
      await backend.put(rec)
      return rec
    },

    /** CONFIRMED STORED. The only path on which audio is deleted. */
    async confirm(id) {
      await backend.remove(id)
    },

    /** The artist has explicitly given up on a refused take. */
    async discard(id) {
      await backend.remove(id)
    },

    /**
     * Housekeeping. We do NOT delete old pending takes: audio that never
     * reached the server is not ours to throw away, whatever its age. This
     * reports them so the booth can say so out loud.
     */
    async stale(voiceId, ageMs = 30 * 24 * 60 * 60 * 1000) {
      const cutoff = now() - ageMs
      return (await this.all(voiceId)).filter(r => r.status === PENDING && r.createdAt < cutoff)
    },
  }
}

// ── The durable shelf ───────────────────────────────────────────────────────

/**
 * IndexedDB, because it stores Blobs natively and survives tab close, reload
 * and (best effort) OS eviction. localStorage is not an option: string-only and
 * a few megabytes at most, and a take is hundreds of kilobytes of audio.
 *
 * If IndexedDB is missing or refuses to open — private mode on some browsers,
 * a quota wall, a corrupt database — this returns a MEMORY backend with
 * `available: false`, which is exactly today's behaviour, and the booth is
 * obliged to tell the artist that takes are not being persisted on this device.
 * Never fail the capture itself; a degraded take is still a take.
 */
export function createIndexedDbBackend(idbFactory) {
  const idb = idbFactory || (typeof indexedDB !== 'undefined' ? indexedDB : null)
  if (!idb) return { ...createMemoryBackend(), available: false, reason: 'no-indexeddb' }

  let dbPromise = null
  function open() {
    if (dbPromise) return dbPromise
    dbPromise = new Promise((resolve, reject) => {
      let req
      try { req = idb.open(DB_NAME, DB_VERSION) } catch (err) { reject(err); return }
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error || new Error('IndexedDB refused to open'))
      req.onblocked = () => reject(new Error('IndexedDB is blocked by another tab'))
    })
    return dbPromise
  }

  function tx(mode, fn) {
    return open().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(STORE_NAME, mode)
      const store = t.objectStore(STORE_NAME)
      let out
      try { out = fn(store) } catch (err) { reject(err); return }
      t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out)
      t.onerror = () => reject(t.error || new Error('IndexedDB write failed'))
      t.onabort = () => reject(t.error || new Error('IndexedDB transaction aborted'))
    }))
  }

  return {
    available: true,
    getAll: () => tx('readonly', s => s.getAll()).then(rows => rows || []),
    put: rec => tx('readwrite', s => s.put(rec)).then(() => undefined),
    remove: id => tx('readwrite', s => s.delete(id)).then(() => undefined),
    // A probe the booth runs once, so "is this device persisting?" is answered
    // by a real write and not by feature detection. `indexedDB` exists in
    // Safari private mode and then throws on the first transaction.
    async probe() {
      const id = `__probe-${Date.now()}`
      await tx('readwrite', s => s.put({ id, status: '__probe', createdAt: Date.now() }))
      await tx('readwrite', s => s.delete(id))
      return true
    },
  }
}

export function createMemoryBackend(seed = []) {
  const rows = new Map(seed.map(r => [r.id, r]))
  return {
    available: true,
    memory: true,
    getAll: async () => Array.from(rows.values()).map(r => ({ ...r })),
    put: async rec => { rows.set(rec.id, { ...rec }) },
    remove: async id => { rows.delete(id) },
    probe: async () => true,
  }
}

/**
 * Open the real store, degrading honestly. Callers read `.available` and must
 * SAY SO in the UI when it is false: a booth that quietly stops persisting is
 * the lying indicator this whole change exists to abolish.
 */
export async function openTakeStore(opts = {}) {
  const backend = createIndexedDbBackend(opts.idbFactory)
  if (backend.available && backend.probe) {
    try {
      await backend.probe()
    } catch (err) {
      const mem = createMemoryBackend()
      mem.available = false
      mem.reason = (err && err.message) || 'IndexedDB is not usable in this browser'
      return createTakeStore(mem, opts)
    }
  }
  return createTakeStore(backend, opts)
}
