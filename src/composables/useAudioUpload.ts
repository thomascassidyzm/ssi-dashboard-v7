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
let processing = false
let onUploadedCallback: ((itemIndex: number) => void) | null = null

const MAX_RETRIES = 3
const RETRY_BACKOFF = [1000, 3000, 8000]

export function useUploadQueue() {
  function queueUpload(item: QueuedUpload) {
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

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await doUpload(item)
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

      if (success) {
        uploadedCount.value++
        uploadedIndices.add(item.itemIndex)
        if (onUploadedCallback) {
          onUploadedCallback(item.itemIndex)
        }
      } else {
        failedIndices.add(item.itemIndex)
        console.error(`[UploadQueue] Failed after ${MAX_RETRIES} attempts: item ${item.itemIndex}`)
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

  function onUploaded(cb: (itemIndex: number) => void) {
    onUploadedCallback = cb
  }

  function resetQueue() {
    queue.length = 0
    uploadedCount.value = 0
    pendingCount.value = 0
    uploadedIndices.clear()
    failedIndices.clear()
    failedReasons.clear()
    processing = false
    onUploadedCallback = null
  }

  return {
    queueUpload,
    onUploaded,
    resetQueue,
    uploadedCount,
    pendingCount,
    uploadedIndices,
    failedIndices,
    failedReasons
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
