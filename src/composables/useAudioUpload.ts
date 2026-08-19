// src/composables/useAudioUpload.ts
import { ref, reactive } from 'vue'
import { getApiUrl } from '@/services/api'

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadMetadata {
  uuid: string
  text: string
  language: string
  role: string
  cadence: string
  voiceId: string
  courseCode: string
}

export interface QueuedUpload {
  blob: Blob
  courseCode: string
  // null for script-mode takes — the server mints the audio identity per upload
  uuid: string | null
  metadata: Record<string, any>
  provenance: Record<string, any>
  itemIndex: number
}

export function useAudioUpload() {
  const isUploading = ref(false)
  const progress = ref<UploadProgress>({ loaded: 0, total: 0, percentage: 0 })
  const error = ref<string | null>(null)
  const uploadedUrl = ref<string | null>(null)

  async function uploadAudio(audioBlob: Blob, metadata: UploadMetadata): Promise<any> {
    isUploading.value = true
    error.value = null
    progress.value = { loaded: 0, total: 0, percentage: 0 }

    try {
      // Convert blob to base64
      const base64Audio = await blobToBase64(audioBlob)

      const response = await fetch(`/api/production/${metadata.courseCode}/recording/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType: audioBlob.type,
          metadata: {
            uuid: metadata.uuid,
            text: metadata.text,
            language: metadata.language,
            role: metadata.role,
            cadence: metadata.cadence,
            voiceId: metadata.voiceId
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      uploadedUrl.value = result.url || result.key

      return result
    } catch (err: any) {
      error.value = err.message || 'Upload failed'
      throw err
    } finally {
      isUploading.value = false
    }
  }

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  function reset() {
    isUploading.value = false
    progress.value = { loaded: 0, total: 0, percentage: 0 }
    error.value = null
    uploadedUrl.value = null
  }

  return {
    // State
    isUploading,
    progress,
    error,
    uploadedUrl,

    // Actions
    uploadAudio,
    reset
  }
}

// ─── Background Upload Queue ───────────────────────────────────────────────
// Singleton queue that processes uploads sequentially in the background.
// Used by the continuous autocue recording flow.

const queue: QueuedUpload[] = []
const uploadedCount = ref(0)
const pendingCount = ref(0)
const uploadedIndices = reactive(new Set<number>())
const failedIndices = reactive(new Set<number>())
// itemIndex -> the server's own words for why this take was not saved, so the
// recordist reads "no audible speech" rather than a bare red count.
const failedReasons = reactive(new Map<number, string>())
// itemIndex -> the course_audio uuid the server minted for that take. Without
// this the queue swallowed the upload response and no caller could ever name
// the STORED clip, so playback had nothing to point at but the raw local blob
// — the exact preview that let a butchered trim chain sound perfect for
// months. See useStoredClip.js.
const uploadedUuids = reactive(new Map<number, string>())
// itemIndex -> the server's words for a take that UPLOADED but was NOT FILED as
// a clip. This is a different failure from an upload failure and it needs its
// own channel: the bytes reached S3 and the request returned 200, so nothing in
// the queue's success/failure bookkeeping notices. That exact silence is what
// let 50 Finnish takes be recorded on 2026-08-19 with no course_audio row and
// no warning of any kind. Only NON-deliberate outcomes land here — the slow
// cadence is deliberately never filed and must not read as a problem.
const filingWarnings = reactive(new Map<number, string>())
let processing = false
let onUploadedCallback: ((itemIndex: number, result: any) => void) | null = null

const MAX_RETRIES = 3
const RETRY_BACKOFF = [1000, 3000, 8000]

export function useUploadQueue() {
  function queueUpload(item: QueuedUpload) {
    // A re-record supersedes the take it replaces. Drop any earlier take of the
    // same item still waiting in the queue — uploading it costs bandwidth to
    // land bytes the newer take immediately outranks (the voice engine takes
    // the latest take per phrase+cadence). queue[0] may be in flight, so it is
    // never touched; its 4xx/5xx verdict is simply superseded below.
    for (let i = queue.length - 1; i >= 1; i--) {
      if (queue[i].itemIndex === item.itemIndex) queue.splice(i, 1)
    }
    // ...and it supersedes the earlier take's verdict too, so a slot that
    // failed once and was re-recorded stops being counted as failed.
    failedIndices.delete(item.itemIndex)
    failedReasons.delete(item.itemIndex)
    // The new take supersedes the stored clip of the old one, and its own uuid
    // does not exist yet. Playing the superseded uuid would hand the recordist
    // the PREVIOUS take while the screen says "stored clip" — so the slot goes
    // back to having no stored clip until this upload lands.
    uploadedUuids.delete(item.itemIndex)
    // ...and the new take gets to be filed (or not) on its own account.
    filingWarnings.delete(item.itemIndex)

    queue.push(item)
    pendingCount.value = queue.length
    processQueue()
  }

  async function processQueue() {
    if (processing) return
    processing = true

    while (queue.length > 0) {
      const item = queue[0]
      let success = false
      let result: any = null

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          result = await doUpload(item)
          success = true
          break
        } catch (err: any) {
          console.warn(`[UploadQueue] Attempt ${attempt + 1} failed for item ${item.itemIndex}:`, err)
          // A 4xx is the server's verdict on THIS take (silent audio, unknown uuid,
          // malformed body) — retrying replays the same bytes to the same verdict
          // and just burns 12s of backoff before the recordist is told. Only retry
          // 5xx and network failures, which are the transient ones.
          if (err?.deterministic) {
            failedReasons.set(item.itemIndex, err.message)
            break
          }
          if (attempt < MAX_RETRIES - 1) {
            await sleep(RETRY_BACKOFF[attempt])
          } else {
            failedReasons.set(item.itemIndex, err?.message || 'Upload failed')
          }
        }
      }

      queue.shift()
      pendingCount.value = queue.length

      // A newer take of this same item is already queued behind this one, so
      // this take's verdict is stale either way — don't let it mark the slot.
      const superseded = queue.some(q => q.itemIndex === item.itemIndex)

      if (success) {
        uploadedIndices.add(item.itemIndex)
        // Count SLOTS uploaded, not uploads performed: re-recording an item
        // twice used to report three of two items uploaded.
        uploadedCount.value = uploadedIndices.size
        // Record the stored clip's identity — unless a newer take of this slot
        // is already queued, in which case this uuid is about to be outranked
        // and must not be offered as "the stored clip" in the meantime.
        if (!superseded && result?.uuid) {
          uploadedUuids.set(item.itemIndex, result.uuid)
        }
        // A 200 is not the same as "this take became a clip". Surface the
        // server's filing verdict when it is a problem the recordist can act on.
        if (!superseded && result?.filing && result.filing.filed === false && result.filing.deliberate === false) {
          filingWarnings.set(item.itemIndex, result.filing.message || 'This take was saved but not filed as a clip.')
          console.error(`[UploadQueue] item ${item.itemIndex} uploaded but NOT FILED: ${result.filing.reason} — ${result.filing.message}`)
        }
        if (onUploadedCallback) {
          onUploadedCallback(item.itemIndex, result)
        }
      } else if (!superseded) {
        failedIndices.add(item.itemIndex)
        console.error(`[UploadQueue] Failed after ${MAX_RETRIES} attempts: item ${item.itemIndex}`)
      } else {
        failedReasons.delete(item.itemIndex)
      }
    }

    processing = false
  }

  async function doUpload(item: QueuedUpload) {
    const base64 = await blobToBase64Internal(item.blob)
    const baseUrl = localStorage.getItem('api_base_url') || getApiUrl()

    const response = await fetch(
      `${baseUrl}/api/production/${item.courseCode}/recording/upload`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          uuid: item.uuid,
          audioData: base64,
          mimeType: item.blob.type || 'audio/webm',
          metadata: item.metadata,
          provenance: item.provenance
        })
      }
    )

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: 'Upload failed' }))
      const err: any = new Error(errData.error || `Upload failed: ${response.status}`)
      err.status = response.status
      // 4xx = the server judged this take; 5xx/network = try again
      err.deterministic = response.status >= 400 && response.status < 500
      throw err
    }

    return response.json()
  }

  function onUploaded(cb: (itemIndex: number, result?: any) => void) {
    onUploadedCallback = cb
  }

  // The stored clip's uuid for a slot, or null while it is queued/in flight/failed.
  function storedUuidFor(itemIndex: number): string | null {
    return uploadedUuids.get(itemIndex) ?? null
  }

  function resetQueue() {
    queue.length = 0
    uploadedCount.value = 0
    pendingCount.value = 0
    uploadedIndices.clear()
    failedIndices.clear()
    failedReasons.clear()
    uploadedUuids.clear()
    filingWarnings.clear()
    processing = false
    onUploadedCallback = null
  }

  return {
    queueUpload,
    onUploaded,
    resetQueue,
    storedUuidFor,
    uploadedCount,
    pendingCount,
    uploadedIndices,
    uploadedUuids,
    failedIndices,
    failedReasons,
    filingWarnings
  }
}

function blobToBase64Internal(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
