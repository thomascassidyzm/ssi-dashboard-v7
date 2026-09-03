// src/composables/useRecordistQueue.js
//
// The upload queue for the ONE recordist surface (/r/:voiceId).
//
// Why not useUploadQueue? That one is a module-level singleton wired to the
// per-course JSON route (/api/production/:course/recording/upload) and keyed by
// item index. The recordist queue is BY LANGUAGE, not by course: a line is
// identified by its lineId, and the take goes to the multipart route
// POST /api/recording/voice/:voiceId/take. Bending the old singleton to carry
// both shapes would make a load-bearing file harder to read for every studio
// that already depends on it, so this is its own small thing.
//
// THE QUEUE IS NOT THE TAKE. Since 2026-09-03 this composable holds no audio:
// every take lives in IndexedDB (src/services/takeStore.js) from the instant it
// is captured, and this file is only the thing that walks that shelf and posts
// what is on it. That is the difference between "the tab closed and the take is
// gone" and "the tab closed and the take goes up next time the booth opens".
// Tom's ruling that night: "everything that is recorded is 100% uploaded.
// Always - we can NOT have things hanging and never getting to popty."
//
// So the three rules this file exists to keep:
//   1. Nothing is uploaded that was not persisted FIRST.
//   2. A transient failure is retried for ever — no MAX_RETRIES, no discard.
//   3. Bytes are deleted only on a 2xx with an audioId, or on a 4xx refusal
//      whose words are shown to the artist. Never on a timer, never on a count.
//
// Sequential, superseding: a re-read of a line drops any earlier take of the
// SAME line still waiting, and clears the stored clip for that line until the
// new take lands — playing the superseded clip while the screen says "stored"
// is the exact lie useStoredClip.js exists to prevent.

import { ref, reactive } from 'vue'
import { recordingApiBase as apiBase } from '@/services/recordingApi'
import { openTakeStore, createTakeStore, createMemoryBackend, DURABLE_TAKES_FEATURE } from '@/services/takeStore'

export { DURABLE_TAKES_FEATURE }

/**
 * How long one upload attempt may run before it counts as failed.
 *
 * `fetch` has no timeout of its own. On a phone that walks out of signal
 * mid-post, the promise below simply never settles: the take sits on "Saving…
 * not playable yet" for ever, the whole sequential queue stops behind it, and
 * every line the recordist reads after that point queues up behind a request
 * that is never coming back. There is no terminal state and nothing on the
 * screen ever says so — which is the one failure this queue must not have.
 *
 * 90 s is deliberately generous: a 250 KB take on a bad connection, plus the
 * server's own trim, master, S3 write and provenance row, is a few seconds on a
 * good day and tens on a bad one. This is the "the network has gone" line, not
 * a performance budget. A timeout is transient, so the take stays on the shelf
 * and comes round again under the store's backoff.
 */
const UPLOAD_TIMEOUT_MS = 90000

// One tab drains at a time. Two tabs open on the same booth would otherwise
// both post the same take off the same shelf. Deliberately the cheapest thing
// that works: a localStorage claim with a timestamp, stale after LOCK_TTL_MS,
// so a tab that dies holding it blocks nobody for longer than that.
const LOCK_KEY = 'ssi-recordist-drain-lock'
const LOCK_TTL_MS = 20000
const LOCK_RETRY_MS = 5000

// A slow heartbeat so a queue that is waiting on nothing in particular — the
// network came back without an `online` event, the phone woke without a
// visibility change — still gets picked up.
const HEARTBEAT_MS = 30000

export function useRecordistQueue(options = {}) {
  const tabId = Math.random().toString(36).slice(2)
  const sessionStart = Date.now()

  // lineId -> { audioId, clipUrl } once the server has CONFIRMED the take
  const saved = reactive(new Map())
  // lineId -> the server's own words for why this take was not saved
  const failed = reactive(new Map())
  // The lines with bytes on this device that the server has not confirmed.
  // This is the honest "not safe yet" set, and the UI reads it directly.
  const unsentLines = reactive(new Set())

  const pendingCount = ref(0)
  const savedCount = ref(0)
  // Takes on the shelf from BEFORE this session — a tab that was closed, a
  // phone that slept, a session finished on a dead connection last week.
  const carriedOverCount = ref(0)
  const refusedCount = ref(0)
  // Old unsent takes are reported, never swept: audio that never reached the
  // server is not ours to delete, whatever its age.
  const staleCount = ref(0)
  // Is this device actually persisting? False means we are back to the old
  // in-memory behaviour and the booth is obliged to SAY SO.
  const persistent = ref(true)
  const storageNote = ref(null)
  const uploadingLine = ref(null)
  const lastError = ref(null)

  let store = null
  let storePromise = null
  let voiceId = options.voiceId || null
  let draining = false
  let wakeTimer = null
  let heartbeat = null
  let stopped = false

  function ensureStore() {
    if (store) return Promise.resolve(store)
    if (!storePromise) {
      // storeBackend is the seam the unit tests drive: the RULES are what they
      // are testing, and a real IndexedDB adapter can only honestly be proved
      // in a real browser, which is where it is proved.
      const opening = options.storeBackend
        ? Promise.resolve(createTakeStore(options.storeBackend, options.storeOptions || {}))
        : openTakeStore(options.storeOptions || {})
      storePromise = opening.then(s => {
        store = s
        persistent.value = s.available
        if (!s.available) {
          storageNote.value =
            'This browser will not keep recordings on the device, so a take is only safe once it has uploaded. Keep this page open until everything has saved.'
        }
        return s
      })
    }
    return storePromise
  }

  // What recorded this take: the microphone the recordist chose and the browser
  // it ran in. recording_device was NULL on all 154 archived takes when the
  // clipping was being diagnosed, so the question "which device, which browser"
  // could only be answered by guessing from the blob's mime string. It is one
  // field on a form that is already being posted.
  function describeDevice(micLabel) {
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || ''
    return [micLabel || 'default mic', ua].filter(Boolean).join(' · ').slice(0, 300)
  }

  async function refreshCounts() {
    const s = await ensureStore()
    const pending = await s.pending(voiceId)
    const refused = await s.refused(voiceId)
    unsentLines.clear()
    for (const rec of pending) unsentLines.add(rec.lineId)
    pendingCount.value = pending.length
    carriedOverCount.value = pending.filter(r => r.createdAt < sessionStart).length
    refusedCount.value = refused.length
    staleCount.value = (await s.stale(voiceId)).length
    for (const rec of refused) if (!failed.has(rec.lineId)) failed.set(rec.lineId, rec.lastError)
  }

  /**
   * Adopt a voice and pick up anything left on the shelf — from this session or
   * from any session before it. THIS is the half that turns "persisted" into
   * "not lost": persisting without a reliable resume just moves the graveyard.
   */
  async function attach(id) {
    if (!id) return
    voiceId = id
    stopped = false
    await refreshCounts()
    startWatchers()
    drain()
  }

  /**
   * Persist a take, THEN start trying to send it. The order is the feature: a
   * take that has not been written down cannot survive the tab, and the window
   * between "the artist read it" and "it is on the shelf" is the only window in
   * which audio can still be lost.
   */
  function queueTake({ voiceId: vid, lineId, text, blob, micLabel }) {
    if (vid) voiceId = vid
    failed.delete(lineId)
    saved.delete(lineId)
    // Truthful immediately, before the write resolves: this line is NOT safe.
    unsentLines.add(lineId)
    pendingCount.value = unsentLines.size
    return ensureStore()
      .then(s => s.put({ voiceId: vid || voiceId, lineId, text, blob, device: describeDevice(micLabel) }))
      .then(async () => { await refreshCounts(); drain() })
      .catch(async err => {
        // The shelf itself refused the take — out of quota, most likely. Never
        // lose the capture over it: move to a MEMORY shelf, which is exactly
        // the old behaviour, put the take on it so it still uploads, and tell
        // the artist the truth about what this device is doing.
        persistent.value = false
        storageNote.value =
          'This device would not store the recording, so this take is only safe once it has uploaded. Keep this page open until everything has saved.'
        lastError.value = (err && err.message) || String(err)
        try {
          const mem = createMemoryBackend()
          mem.available = false
          store = createTakeStore(mem)
          storePromise = Promise.resolve(store)
          await store.put({ voiceId: vid || voiceId, lineId, text, blob, device: describeDevice(micLabel) })
          await refreshCounts()
        } catch { /* the blob is beyond saving; the words above are all we have */ }
        drain()
      })
  }

  // ── The drain ─────────────────────────────────────────────────────────────

  function scheduleWake(ms) {
    if (wakeTimer) clearTimeout(wakeTimer)
    wakeTimer = setTimeout(() => { wakeTimer = null; drain() }, Math.max(0, ms))
  }

  function holdsLock() {
    try {
      const raw = localStorage.getItem(LOCK_KEY)
      if (!raw) return false
      const lock = JSON.parse(raw)
      return lock && lock.owner === tabId
    } catch { return false }
  }

  function claimLock() {
    try {
      const raw = localStorage.getItem(LOCK_KEY)
      if (raw) {
        const lock = JSON.parse(raw)
        if (lock && lock.owner !== tabId && Date.now() - lock.ts < LOCK_TTL_MS) return false
      }
      localStorage.setItem(LOCK_KEY, JSON.stringify({ owner: tabId, ts: Date.now() }))
      return true
    } catch {
      // No localStorage is not a reason to stop uploading. A duplicate take is
      // recoverable; a lost one is not.
      return true
    }
  }

  function releaseLock() {
    try { if (holdsLock()) localStorage.removeItem(LOCK_KEY) } catch { /* nothing to release */ }
  }

  async function drain() {
    if (draining || stopped || !voiceId) return
    draining = true
    try {
      const s = await ensureStore()
      for (;;) {
        if (stopped) break
        const rec = await s.nextDue(voiceId)
        if (!rec) {
          const soonest = await s.soonestDue(voiceId)
          if (soonest != null) scheduleWake(soonest - Date.now())
          break
        }
        if (!claimLock()) { scheduleWake(LOCK_RETRY_MS); break }
        uploadingLine.value = rec.lineId
        try {
          const result = await doUpload(rec)
          // CONFIRMED STORED — the server answered 2xx with an audioId. This is
          // the only path on which recorded audio is deleted from the device.
          await s.confirm(rec.id)
          if (!(await isSuperseded(s, rec))) {
            saved.set(rec.lineId, { audioId: result?.audioId || null, clipUrl: result?.clipUrl || null })
            savedCount.value = saved.size
            failed.delete(rec.lineId)
          }
          lastError.value = null
        } catch (err) {
          if (err && err.deterministic) {
            // The server's verdict on THESE bytes (a silent take, an unknown
            // line). Replaying them for ever is pointless — but they do not
            // vanish: the take stays on the shelf, marked refused, with the
            // server's own words on the screen.
            await s.markRefused(rec.id, (err && err.message) || 'The server would not take that recording.')
            failed.set(rec.lineId, (err && err.message) || 'The server would not take that recording.')
          } else {
            // Transient. Count it, back off, KEEP IT. No give-up point.
            await s.recordFailure(rec.id, (err && err.message) || 'Could not save that take.')
            lastError.value = (err && err.message) || 'Could not save that take.'
            await refreshCounts()
            const soonest = await s.soonestDue(voiceId)
            if (soonest != null) scheduleWake(soonest - Date.now())
            break
          }
        } finally {
          uploadingLine.value = null
        }
        await refreshCounts()
      }
    } catch (err) {
      lastError.value = (err && err.message) || String(err)
      scheduleWake(HEARTBEAT_MS)
    } finally {
      draining = false
      releaseLock()
      try { await refreshCounts() } catch { /* counts are cosmetic; the shelf is not */ }
    }
  }

  // A newer take of this line is already on the shelf, so this take's verdict
  // is stale either way — don't let it mark the line.
  async function isSuperseded(s, rec) {
    const pending = await s.pending(voiceId)
    return pending.some(r => r.lineId === rec.lineId && r.createdAt > rec.createdAt)
  }

  async function doUpload(item) {
    const form = new FormData()
    // Filename matters: the server reads the container from the extension when
    // the browser's blob type is bare (Safari sends audio/mp4 with no codecs).
    form.append('audio', item.blob, `take-${item.lineId}.${extFor(item.blob)}`)
    form.append('lineId', String(item.lineId))
    form.append('text', item.text || '')
    if (item.device) form.append('device', item.device)
    const ctl = typeof AbortController === 'function' ? new AbortController() : null
    const timer = ctl ? setTimeout(() => ctl.abort(), UPLOAD_TIMEOUT_MS) : null
    let res
    try {
      res = await fetch(
        `${apiBase()}/api/recording/voice/${encodeURIComponent(item.voiceId)}/take`,
        {
          method: 'POST',
          headers: { 'ngrok-skip-browser-warning': 'true' },
          body: form,
          ...(ctl ? { signal: ctl.signal } : {}),
        }
      )
    } catch (err) {
      // An abort is this timeout firing, and it must read as a network failure
      // rather than as the browser's own 'AbortError' — the recordist is being
      // told what happened to their take, not what happened to a promise.
      if (err && err.name === 'AbortError') {
        throw new Error('That take took too long to reach the server — it is saved on this device and will keep trying.')
      }
      throw err
    } finally {
      if (timer) clearTimeout(timer)
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const err = new Error(data.error || `That take did not save (${res.status}).`)
      err.status = res.status
      err.deterministic = res.status >= 400 && res.status < 500
      throw err
    }
    return res.json()
  }

  // ── Waking up ─────────────────────────────────────────────────────────────

  let watching = false
  function onOnline() { scheduleWake(0) }
  function onVisible() { if (typeof document === 'undefined' || document.visibilityState === 'visible') scheduleWake(0) }

  function startWatchers() {
    if (watching || typeof window === 'undefined') return
    watching = true
    window.addEventListener('online', onOnline)
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible)
    heartbeat = setInterval(() => { if (pendingCount.value > 0) drain() }, HEARTBEAT_MS)
  }

  function stopWatchers() {
    if (!watching || typeof window === 'undefined') return
    watching = false
    window.removeEventListener('online', onOnline)
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible)
    if (heartbeat) { clearInterval(heartbeat); heartbeat = null }
  }

  // A take the CLIENT judged unsendable (a silent blob) never reaches the
  // shelf, so it has no server verdict — but the recordist must still be told
  // in the same place, in the same words, as one the server rejected.
  function markFailed(lineId, reason) {
    saved.delete(lineId)
    unsentLines.delete(lineId)
    failed.set(lineId, reason)
  }

  /** The artist has given up on a refused take: this is the only human-driven delete. */
  async function discardRefused(lineId) {
    const s = await ensureStore()
    for (const rec of await s.refused(voiceId)) {
      if (rec.lineId === lineId) await s.discard(rec.id)
    }
    failed.delete(lineId)
    await refreshCounts()
  }

  /**
   * Clear the SCREEN, never the shelf. reset() used to throw the queue away,
   * and if it still did that it would be deleting recorded audio on a route
   * change — the exact thing this file now exists to make impossible.
   */
  function reset() {
    saved.clear()
    failed.clear()
    savedCount.value = 0
    if (wakeTimer) { clearTimeout(wakeTimer); wakeTimer = null }
    refreshCounts().catch(() => {})
  }

  function teardown() {
    stopped = true
    stopWatchers()
    if (wakeTimer) { clearTimeout(wakeTimer); wakeTimer = null }
    releaseLock()
  }

  function isUnsent(lineId) { return unsentLines.has(lineId) }

  return {
    attach, queueTake, markFailed, discardRefused, reset, teardown, drain,
    isUnsent,
    pendingCount, savedCount, carriedOverCount, refusedCount, staleCount,
    persistent, storageNote, uploadingLine, lastError,
    saved, failed, unsentLines,
  }
}

function extFor(blob) {
  const t = (blob && blob.type) || ''
  if (t.includes('webm')) return 'webm'
  if (t.includes('ogg')) return 'ogg'
  if (t.includes('mp4') || t.includes('m4a') || t.includes('aac')) return 'm4a'
  if (t.includes('wav')) return 'wav'
  return 'webm'
}
