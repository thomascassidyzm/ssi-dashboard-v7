// A small in-process IndexedDB for the take store's tests (#933).
//
// Only the slice the booth's adapter uses: open with a version and an upgrade,
// object stores keyed by `id`, multi-store transactions that commit once their
// last request has run, get / getAll / getAllKeys / put / delete / openCursor,
// and versionchange / blocked between connections. Requests run one per
// setImmediate turn, so a transaction's callbacks interleave the way they do in
// a browser rather than all at once.
//
// It also COUNTS what a real browser would have to materialise: every record
// handed back that carries audio (`reads.withAudio`, `reads.audioBytes`). That
// is the cost the booth paid on every advance before #933, and the number the
// advance-cost test asserts on.

const later = typeof setImmediate === 'function' ? setImmediate : fn => setTimeout(fn, 0)

function copy(v) {
  // Records are flat; a Blob is immutable and IndexedDB hands back a handle
  // to it, so a shallow copy is the faithful isolation here.
  return v && typeof v === 'object' ? { ...v } : v
}

export function createFakeIndexedDb() {
  const dbs = new Map() // name -> { version, stores: Map<name, Map<key, value>>, conns: Set }
  const reads = { withAudio: 0, audioBytes: 0, records: 0 }

  function counted(v) {
    if (v && typeof v === 'object') {
      reads.records += 1
      if (v.blob) { reads.withAudio += 1; reads.audioBytes += v.blob.size || 0 }
    }
    return copy(v)
  }

  function request() {
    return { result: undefined, error: null, onsuccess: null, onerror: null }
  }

  function makeTransaction(conn, names, mode) {
    const state = conn.state
    const queue = []
    let done = false
    const t = {
      mode,
      oncomplete: null, onerror: null, onabort: null, error: null,
      objectStore(name) {
        // In a versionchange transaction every store is in scope, including
        // the ones the upgrade has just created.
        if ((mode !== 'versionchange' && !names.includes(name)) || !state.stores.has(name)) throw new Error(`NotFoundError: ${name}`)
        return storeHandle(name)
      },
      abort() { done = true; queue.length = 0; later(() => t.onabort && t.onabort()) },
    }
    function enqueue(run) {
      if (done) throw new Error('TransactionInactiveError')
      const req = request()
      req.transaction = t
      queue.push({ req, run })
      return req
    }
    function writable() {
      if (mode === 'readonly') throw new Error('ReadOnlyError')
    }
    function storeHandle(name) {
      const rows = () => state.stores.get(name)
      return {
        name,
        put(v) { writable(); const val = copy(v); return enqueue(() => { rows().set(val.id, val); return val.id }) },
        delete(k) { writable(); return enqueue(() => { rows().delete(k) }) },
        get(k) { return enqueue(() => (rows().has(k) ? counted(rows().get(k)) : undefined)) },
        getAll() { return enqueue(() => sorted(rows()).map(([, v]) => counted(v))) },
        getAllKeys() { return enqueue(() => sorted(rows()).map(([k]) => k)) },
        openCursor() {
          let entries = null
          let i = 0
          const req = enqueue(step)
          function step() {
            if (!entries) entries = sorted(rows())
            if (i >= entries.length) return null
            const [key, value] = entries[i]
            return { key, value: counted(value), continue() { i += 1; queue.push({ req, run: step }) } }
          }
          return req
        },
      }
    }
    function pump() {
      if (done) return
      const next = queue.shift()
      if (!next) {
        done = true
        if (t.oncomplete) t.oncomplete()
        return
      }
      try {
        next.req.result = next.run()
        if (next.req.onsuccess) next.req.onsuccess({ target: next.req })
      } catch (err) {
        next.req.error = err
        t.error = err
        done = true
        if (next.req.onerror) next.req.onerror({ target: next.req })
        if (t.onerror) t.onerror()
        if (t.onabort) t.onabort()
        return
      }
      later(pump)
    }
    later(pump)
    return t
  }

  function sorted(map) {
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  }

  function connection(state) {
    const conn = {
      state,
      closed: false,
      onversionchange: null,
      get version() { return state.version },
      objectStoreNames: { contains: n => state.stores.has(n) },
      createObjectStore(name) {
        state.stores.set(name, new Map())
        return conn._vtx.objectStore(name)
      },
      transaction(names, mode = 'readonly') {
        if (conn.closed) throw new Error('InvalidStateError: connection closed')
        return makeTransaction(conn, Array.isArray(names) ? names : [names], mode)
      },
      close() { conn.closed = true; state.conns.delete(conn); if (state.waiting) state.waiting() },
    }
    return conn
  }

  return {
    reads,
    resetReads() { reads.withAudio = 0; reads.audioBytes = 0; reads.records = 0 },
    // Peek at the raw shelf, bypassing the counters.
    raw(name, store) { const d = dbs.get(name); return d && d.stores.get(store) ? Array.from(d.stores.get(store).values()) : [] },
    open(name, version = 1) {
      const req = request()
      req.onupgradeneeded = null
      req.onblocked = null
      later(() => {
        let state = dbs.get(name)
        if (!state) { state = { version: 0, stores: new Map(), conns: new Set() }; dbs.set(name, state) }
        if (version < state.version) {
          req.error = new Error('VersionError')
          if (req.onerror) req.onerror()
          return
        }
        const finish = () => {
          const conn = connection(state)
          state.conns.add(conn)
          req.result = conn
          if (req.onsuccess) req.onsuccess()
        }
        if (version === state.version) { finish(); return }
        const upgrade = () => {
          state.waiting = null
          const conn = connection(state)
          const vtx = makeTransaction(conn, [], 'versionchange')
          conn._vtx = vtx
          state.version = version
          req.result = conn
          req.transaction = vtx
          if (req.onupgradeneeded) req.onupgradeneeded()
          vtx.oncomplete = () => { state.conns.add(conn); conn._vtx = null; if (req.onsuccess) req.onsuccess() }
        }
        for (const c of state.conns) if (c.onversionchange) c.onversionchange()
        if (state.conns.size) {
          state.waiting = upgrade
          if (req.onblocked) req.onblocked()
          return
        }
        upgrade()
      })
      return req
    },
  }
}
