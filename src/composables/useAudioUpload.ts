// src/composables/useAudioUpload.ts
import { ref } from 'vue'

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
