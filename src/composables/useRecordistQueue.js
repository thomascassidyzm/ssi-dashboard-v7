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
// Sequential, retrying, superseding: a re-read of a line drops any earlier take
// of the SAME line still waiting, and clears the stored clip for that line
// until the new take lands — playing the superseded clip while the screen says
// "stored" is the exact lie useStoredClip.js exists to prevent.

import { ref, reactive } from 'vue'
import { recordingApiBase as apiBase } from '@/services/recordingApi'

const MAX_RETRIES = 3
const RETRY_BACKOFF = [1000, 3000, 8000]

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
 * a performance budget. A timeout is transient, so it retries under the backoff
 * above and only becomes a refusal — in words, on the line — after all three.
 */
const UPLOAD_TIMEOUT_MS = 90000


export function useRecordistQueue() {
  const queue = []
  const pendingCount = ref(0)
  const savedCount = ref(0)
  // lineId -> { audioId, clipUrl } once the server has the take
  const saved = reactive(new Map())
  // lineId -> the server's own words for why this take was not saved
  const failed = reactive(new Map())
  let processing = false

  // What recorded this take: the microphone the recordist chose and the browser
  // it ran in. recording_device was NULL on all 154 archived takes when the
  // clipping was being diagnosed, so the question "which device, which browser"
  // could only be answered by guessing from the blob's mime string. It is one
  // field on a form that is already being posted.
  function describeDevice(micLabel) {
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || ''
    return [micLabel || 'default mic', ua].filter(Boolean).join(' · ').slice(0, 300)
  }

  function queueTake({ voiceId, lineId, text, blob, micLabel }) {
    for (let i = queue.length - 1; i >= 1; i--) {
      if (queue[i].lineId === lineId) queue.splice(i, 1)
    }
    failed.delete(lineId)
    saved.delete(lineId)
    queue.push({ voiceId, lineId, text, blob, device: describeDevice(micLabel) })
    pendingCount.value = queue.length
    processQueue()
  }

  async function processQueue() {
    if (processing) return
    processing = true
    while (queue.length > 0) {
      const item = queue[0]
      let ok = false
      let result = null
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          result = await doUpload(item)
          ok = true
          break
        } catch (err) {
          // A 4xx is the server's verdict on THESE bytes (silent take, unknown
          // line). Replaying them just burns 12s of backoff before the
          // recordist is told. Only 5xx and network failures are transient.
          if (err && err.deterministic) {
            failed.set(item.lineId, err.message)
            break
          }
          if (attempt < MAX_RETRIES - 1) await sleep(RETRY_BACKOFF[attempt])
          else failed.set(item.lineId, (err && err.message) || 'Could not save that take.')
        }
      }
      queue.shift()
      pendingCount.value = queue.length

      // A newer take of this line is already queued behind this one, so this
      // take's verdict is stale either way — don't let it mark the line.
      const superseded = queue.some(q => q.lineId === item.lineId)
      if (ok && !superseded) {
        saved.set(item.lineId, { audioId: result?.audioId || null, clipUrl: result?.clipUrl || null })
        savedCount.value = saved.size
      } else if (!ok && superseded) {
        failed.delete(item.lineId)
      }
    }
    processing = false
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
        throw new Error('That take took too long to reach the server — trying again.')
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

  // A take the CLIENT judged unsendable (a silent blob) never reaches the
  // server, so it has no server verdict — but the recordist must still be told
  // in the same place, in the same words, as one the server rejected.
  function markFailed(lineId, reason) {
    saved.delete(lineId)
    failed.set(lineId, reason)
  }

  function reset() {
    queue.length = 0
    pendingCount.value = 0
    savedCount.value = 0
    saved.clear()
    failed.clear()
    processing = false
  }

  return { queueTake, markFailed, reset, pendingCount, savedCount, saved, failed }
}

function extFor(blob) {
  const t = (blob && blob.type) || ''
  if (t.includes('webm')) return 'webm'
  if (t.includes('ogg')) return 'ogg'
  if (t.includes('mp4') || t.includes('m4a') || t.includes('aac')) return 'm4a'
  if (t.includes('wav')) return 'wav'
  return 'webm'
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
