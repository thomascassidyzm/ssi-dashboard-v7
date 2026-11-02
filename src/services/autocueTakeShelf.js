// src/services/autocueTakeShelf.js
//
// THE RECORD ROOM'S SCRIPT TAKES SURVIVE THE TAB (Auke, fry_for_eng, 2026-11-02, job #43).
//
// The booth (RecordistRoom) has kept every take in IndexedDB since 2026-09-03 (takeStore.js).
// The Record Room's script recorder (AutocueStudio) never did: a take lived only as a Blob in the
// upload queue's array, so when a deploy reloaded the page mid-session every take not yet sent
// went with it. Auke lost a session's worth that way.
//
// So each take is put on this shelf THE MOMENT IT IS RECORDED, before the upload is queued, and
// taken off only when the server has answered for it: stored (2xx), or refused in words (a 4xx
// that is a verdict on the bytes). A network failure, a 5xx, an auth failure or a closed tab
// leaves it on the shelf, and the next time the Record Room opens it sends what it finds.
//
// A separate database from the booth's on purpose: the booth's queue drains EVERYTHING on its
// shelf through its own endpoint, and these takes go to the script-mode upload route with their
// own metadata. Same durable IndexedDB adapter (createIndexedDbBackend), different name.

import { createIndexedDbBackend, createMemoryBackend } from './takeStore.js'

export const AUTOCUE_SHELF_DB = 'ssi-autocue-takes'

/**
 * What a line IS, independent of where it sits in this session's script — a reload rebuilds the
 * script and renumbers it, so the item index is useless across page loads. Two takes with the same
 * key are two reads of the same line: the newer one supersedes.
 */
export function shelfLineKey(metadata = {}) {
  const m = metadata || {}
  const item = m.itemId || m.legoId || (m.seedNumber != null ? `seed${m.seedNumber}` : '')
  return [m.cadence || '', m.itemKind || '', item, m.text || ''].join('|')
}

/**
 * Should a failed upload give its take up? Only when the server has judged THESE bytes (a 4xx
 * such as "no audible speech" or "truncated"). Not on 401/403 (who you are, not what you said),
 * 404/408/409/429 (where or when, not what), and never on a network error or a 5xx.
 */
export function refusalEndsTake(status) {
  if (!Number.isInteger(status)) return false
  if (status < 400 || status >= 500) return false
  return ![401, 403, 404, 408, 409, 429].includes(status)
}

const plain = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)))

export function createAutocueShelf(backend, { now = () => Date.now() } = {}) {
  let seq = 0
  const newId = () => `a${now()}-${++seq}-${Math.random().toString(36).slice(2, 8)}`
  const readMeta = () => (backend.getAllMeta ? backend.getAllMeta() : backend.getAll())

  return {
    get available() { return !!backend.available },

    /** Persist a take. Supersedes any earlier take of the same line, course and voice still on the shelf. */
    async put({ courseCode, voiceId = null, blob, mimeType = null, metadata = {}, provenance = {} }) {
      const lineKey = shelfLineKey(metadata)
      for (const rec of await readMeta()) {
        if (rec.courseCode === courseCode && (rec.voiceId || null) === (voiceId || null) && rec.lineKey === lineKey) {
          await backend.remove(rec.id)
        }
      }
      const rec = {
        id: newId(),
        courseCode,
        voiceId: voiceId || null,
        lineKey,
        text: metadata?.text || '',
        blob,
        mimeType: mimeType || blob?.type || 'audio/webm',
        // Plain JSON copies: the studio's metadata carries Vue reactive arrays (coversLegos), which
        // IndexedDB refuses to clone (DataCloneError — caught by the e2e run). It is sent as JSON
        // anyway, so a JSON copy is exactly what the server would have received.
        metadata: plain(metadata),
        provenance: plain(provenance),
        createdAt: now(),
      }
      await backend.put(rec)
      return rec
    },

    /** Takes waiting on this shelf for one course (and voice), oldest first, without their audio. */
    async list({ courseCode, voiceId } = {}) {
      const all = await readMeta()
      return all
        .filter(r => r.courseCode && (!courseCode || r.courseCode === courseCode))
        .filter(r => voiceId === undefined || (r.voiceId || null) === (voiceId || null))
        .sort((a, b) => a.createdAt - b.createdAt)
    },

    async load(id) {
      return (backend.get ? await backend.get(id) : (await backend.getAll()).find(r => r.id === id)) || null
    },

    /** The server answered for this take. The only way audio leaves the shelf. */
    async remove(id) {
      await backend.remove(id)
    },
  }
}

/**
 * Open the real shelf, degrading honestly: if IndexedDB is missing or refuses a write, the shelf
 * is a memory one with `available: false`, and the studio says the backup copy is not being kept.
 */
export async function openAutocueShelf(opts = {}) {
  const backend = createIndexedDbBackend(opts.idbFactory, { dbName: AUTOCUE_SHELF_DB })
  if (backend.available && backend.probe) {
    try {
      await backend.probe()
    } catch {
      const mem = createMemoryBackend()
      mem.available = false
      return createAutocueShelf(mem, opts)
    }
  }
  return createAutocueShelf(backend, opts)
}
