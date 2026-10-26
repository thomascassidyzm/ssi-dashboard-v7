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
// The store was meant to be small — one session's takes, each deleted on
// confirmation — but a network blip can leave a hundred takes waiting, so the
// queue's bookkeeping reads a metadata-only copy (META_STORE_NAME) and never
// the audio (#933).

// A marker a human can grep for in the SERVED bundle to prove this shipped.
export const DURABLE_TAKES_FEATURE = 'durable-take-store-2026-09-03'

export const DB_NAME = 'ssi-recordist-takes'
export const STORE_NAME = 'takes'
// Every take minus its blob, written in the SAME transaction as the take, so
// the two can never disagree about what is on the shelf. `takes` stays the
// truth: the copy is checked against its keys on every read and repaired from
// it, so a take can never be invisible to the queue (see getAllMeta).
export const META_STORE_NAME = 'take-meta'
// 1 → 2 (#933): adds META_STORE_NAME, filled from the takes already queued in
// the browser during the upgrade. Nothing in `takes` is touched or deleted.
export const DB_VERSION = 2

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
 * A take's record WITHOUT its audio. Everything the queue decides — what is
 * pending, what is refused, what is due next, how many are stale — is decided
 * from this, and only the take actually going on the wire (or being played
 * back) has its blob loaded.
 *
 * Why (Aran, 2026-10-23, #928/#933): advancing to the next line in the booth
 * did about six full reads of the shelf, every one loading every unsent take
 * WITH its audio. After a Supabase blip left ~90 takes queued, every advance
 * was dragging 90 blobs out of IndexedDB six times over and the booth lagged
 * between lines. "Reading the whole table is cheaper than maintaining indexes"
 * stopped being true the day the backlog grew.
 */
export function metaOf(rec) {
  if (!rec) return rec
  const { blob, ...meta } = rec
  meta.blobSize = (blob && blob.size) || 0
  return meta
}

/**
 * The rules over a backend.
 *
 * backend: { getAllMeta(): Promise<meta[]>, get(id): Promise<rec|null>,
 *            put(rec): Promise<void>, remove(id): Promise<void>, available }
 * A backend without getAllMeta/get (the pre-#933 shape) still works, by
 * reading everything — correct, just slow.
 */
export function createTakeStore(backend, { now = () => Date.now() } = {}) {
  let seq = 0
  function newId() {
    seq += 1
    return `t${now()}-${seq}-${Math.random().toString(36).slice(2, 8)}`
  }
  const readMeta = () => (backend.getAllMeta
    ? backend.getAllMeta()
    : backend.getAll().then(rows => rows.map(metaOf)))
  const readOne = id => (backend.get
    ? backend.get(id)
    : backend.getAll().then(rows => rows.find(r => r.id === id)))

  async function allMeta(voiceId) {
    const all = await readMeta()
    const mine = voiceId ? all.filter(r => r.voiceId === voiceId) : all
    return mine.sort((a, b) => a.createdAt - b.createdAt)
  }
  const isPending = r => r.status === PENDING
  const isDue = (t, skip) => r => (r.nextAttemptAt || 0) <= t && !(skip && skip(r))
  const STALE_MS = 30 * 24 * 60 * 60 * 1000

  return {
    get available() { return !!backend.available },

    /**
     * Persist a freshly captured take. SUPERSEDES any earlier take of the same
     * line that has not yet reached the server — a re-read replaces the read,
     * and shipping both would file the wrong one under the line half the time.
     * A REFUSED take of the same line is superseded too: the re-read is the
     * artist answering the refusal.
     */
    async put({ voiceId, lineId, text, blob, device, advance }) {
      for (const rec of await readMeta()) {
        if (rec.voiceId === voiceId && rec.lineId === lineId) await backend.remove(rec.id)
      }
      const rec = {
        id: newId(),
        voiceId,
        lineId,
        text: text || '',
        blob,
        device: device || '',
        // How the line moved on (RecordistRoom advanceInfo) — telemetry only.
        advance: advance || null,
        status: PENDING,
        attempts: 0,
        lastError: null,
        createdAt: now(),
        nextAttemptAt: 0,
      }
      await backend.put(rec)
      return rec
    },

    /** The full record, audio included, or null if it has left the shelf. */
    async load(id) {
      return (await readOne(id)) || null
    },

    // Everything below answers from METADATA: no audio is read.
    async all(voiceId) {
      return allMeta(voiceId)
    },

    async pending(voiceId) {
      return (await allMeta(voiceId)).filter(isPending)
    },

    async refused(voiceId) {
      return (await allMeta(voiceId)).filter(r => r.status === REFUSED)
    },

    /**
     * Every count the booth shows, from ONE read of the shelf. This is what
     * the booth calls on every advance; it used to be three full reads with
     * audio (pending, refused, stale), on top of the put's own.
     */
    async snapshot(voiceId, ageMs = STALE_MS) {
      const mine = await allMeta(voiceId)
      const cutoff = now() - ageMs
      const pending = mine.filter(isPending)
      return {
        pending,
        refused: mine.filter(r => r.status === REFUSED),
        stale: pending.filter(r => r.createdAt < cutoff),
      }
    },

    /**
     * The oldest pending take whose backoff has elapsed — metadata only; the
     * caller loads the audio with load(id) when it is actually sending.
     * `skip(rec)` passes over takes the caller already has on the wire, or
     * that share a line or words with one that is (Phase 1, job #221: two
     * takes in flight at once).
     */
    async nextDue(voiceId, { skip } = {}) {
      return (await this.pending(voiceId)).find(isDue(now(), skip)) || null
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
      const rec = await readOne(id)
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
      const rec = await readOne(id)
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
    async stale(voiceId, ageMs = STALE_MS) {
      return (await this.snapshot(voiceId, ageMs)).stale
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
      req.onupgradeneeded = () => upgrade(req.result, req.transaction)
      req.onsuccess = () => {
        const db = req.result
        // A later version of this page wants to upgrade: let it, and reopen
        // on our next transaction rather than blocking it for ever.
        db.onversionchange = () => { try { db.close() } catch { /* already closed */ } dbPromise = null }
        resolve(db)
      }
      req.onerror = () => reject(req.error || new Error('IndexedDB refused to open'))
      req.onblocked = () => reject(new Error('IndexedDB is blocked by another tab'))
    })
    // A failed open must not poison every later attempt.
    dbPromise.catch(() => { dbPromise = null })
    return dbPromise
  }

  // The 1 → 2 migration copies, it never moves: every take already queued in
  // this browser keeps its record in `takes` exactly as it was, and gains a
  // metadata row beside it. Runs inside the versionchange transaction, so it
  // either completes whole or the database stays at version 1.
  function upgrade(db, vtx) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    if (!db.objectStoreNames.contains(META_STORE_NAME)) {
      const meta = db.createObjectStore(META_STORE_NAME, { keyPath: 'id' })
      const cur = vtx.objectStore(STORE_NAME).openCursor()
      cur.onsuccess = () => {
        const c = cur.result
        if (!c) return
        meta.put(metaOf(c.value))
        c.continue()
      }
    }
  }

  function tx(stores, mode, fn) {
    return open().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(stores, mode)
      let out
      try { out = fn(name => t.objectStore(name)) } catch (err) { try { t.abort() } catch { /* gone */ } reject(err); return }
      // Resolves with whatever fn returned (requests, read their .result) once
      // the transaction has COMMITTED — never earlier.
      t.oncomplete = () => resolve(out)
      t.onerror = () => reject(t.error || new Error('IndexedDB write failed'))
      t.onabort = () => reject(t.error || new Error('IndexedDB transaction aborted'))
    }))
  }
  const BOTH = [STORE_NAME, META_STORE_NAME]

  function put(rec) {
    return tx(BOTH, 'readwrite', st => {
      st(STORE_NAME).put(rec)
      st(META_STORE_NAME).put(metaOf(rec))
    }).then(() => undefined)
  }
  function remove(id) {
    return tx(BOTH, 'readwrite', st => {
      st(STORE_NAME).delete(id)
      st(META_STORE_NAME).delete(id)
    }).then(() => undefined)
  }

  /**
   * Every take's metadata, without its audio. Reads the metadata rows and the
   * KEYS of `takes` (keys only — no values, no blobs) in one transaction; if
   * the two ever disagree, `takes` wins: a missing metadata row is rebuilt
   * from its take and an orphaned one is dropped. That repair should never
   * run, and is here so that "the queue cannot see a take" is impossible
   * rather than merely unlikely.
   */
  async function getAllMeta() {
    const got = await tx(BOTH, 'readonly', st => {
      const o = {}
      o.meta = st(META_STORE_NAME).getAll()
      o.keys = st(STORE_NAME).getAllKeys()
      return o
    })
    const meta = got.meta.result || []
    const keys = new Set(got.keys.result || [])
    const metaIds = new Set(meta.map(r => r.id))
    const missing = [...keys].filter(k => !metaIds.has(k))
    const orphaned = meta.filter(r => !keys.has(r.id)).map(r => r.id)
    if (!missing.length && !orphaned.length) return meta
    const rebuilt = []
    await tx(BOTH, 'readwrite', st => {
      const takes = st(STORE_NAME)
      const metaStore = st(META_STORE_NAME)
      for (const id of orphaned) metaStore.delete(id)
      for (const id of missing) {
        const r = takes.get(id)
        r.onsuccess = () => {
          if (!r.result) return
          const m = metaOf(r.result)
          metaStore.put(m)
          rebuilt.push(m)
        }
      }
    })
    return meta.filter(r => keys.has(r.id)).concat(rebuilt)
  }

  return {
    available: true,
    getAllMeta,
    get: id => tx([STORE_NAME], 'readonly', st => st(STORE_NAME).get(id)).then(r => r.result || null),
    // Everything, audio included. Not on any hot path; kept for diagnosis.
    getAll: () => tx([STORE_NAME], 'readonly', st => st(STORE_NAME).getAll()).then(r => r.result || []),
    put,
    remove,
    // A probe the booth runs once, so "is this device persisting?" is answered
    // by a real write and not by feature detection. `indexedDB` exists in
    // Safari private mode and then throws on the first transaction.
    async probe() {
      const id = `__probe-${Date.now()}`
      await put({ id, status: '__probe', createdAt: Date.now() })
      await remove(id)
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
    getAllMeta: async () => Array.from(rows.values()).map(metaOf),
    get: async id => (rows.has(id) ? { ...rows.get(id) } : null),
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
