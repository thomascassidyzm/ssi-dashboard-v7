// src/stores/production.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useProductionStore = defineStore('production', () => {
  // Course state
  const currentCourseCode = ref(null)
  const courseManifest = ref(null)
  const sampleFlags = ref({})
  const audioMetadata = ref({})

  // Loading states
  const isLoading = ref(false)
  const error = ref(null)

  // WebSocket connection state
  const wsConnected = ref(false)

  // Computed: samples by status
  const samplesByStatus = computed(() => {
    const grouped = {
      pending: [],
      flagged_regen_tts: [],
      flagged_human_needed: [],
      in_pipeline: [],
      in_recording: [],
      needs_review: [],
      approved: [],
      rejected: []
    }

    if (!sampleFlags.value.samples) return grouped

    for (const [uuid, data] of Object.entries(sampleFlags.value.samples)) {
      const status = data.status || 'pending'
      if (grouped[status]) {
        grouped[status].push({ uuid, ...data })
      }
    }

    return grouped
  })

  // Computed: progress stats
  const progressStats = computed(() => {
    const samples = sampleFlags.value.samples || {}
    const total = Object.keys(samples).length
    const approved = Object.values(samples).filter(s => s.status === 'approved').length
    const flagged = Object.values(samples).filter(s =>
      s.status?.startsWith('flagged_')
    ).length
    const inProgress = Object.values(samples).filter(s =>
      s.status === 'in_pipeline' || s.status === 'in_recording'
    ).length

    return {
      total,
      approved,
      flagged,
      inProgress,
      pending: total - approved - flagged - inProgress,
      percentComplete: total > 0 ? Math.round((approved / total) * 100) : 0
    }
  })

  // Actions
  async function loadCourse(courseCode) {
    isLoading.value = true
    error.value = null
    currentCourseCode.value = courseCode

    try {
      const [manifestRes, flagsRes, metadataRes] = await Promise.all([
        fetch(`/api/production/${courseCode}/manifest`),
        fetch(`/api/production/${courseCode}/flags`),
        fetch(`/api/production/${courseCode}/audio-metadata`)
      ])

      if (!manifestRes.ok) throw new Error('Failed to load manifest')

      courseManifest.value = await manifestRes.json()
      sampleFlags.value = flagsRes.ok ? await flagsRes.json() : { samples: {} }
      audioMetadata.value = metadataRes.ok ? await metadataRes.json() : { audio: {} }

    } catch (err) {
      error.value = err.message
      console.error('Failed to load course:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function updateSampleFlag(uuid, flagData) {
    try {
      const response = await fetch(`/api/production/${currentCourseCode.value}/flags/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid, ...flagData })
      })

      if (!response.ok) throw new Error('Failed to update flag')

      // Update local state
      if (!sampleFlags.value.samples) {
        sampleFlags.value.samples = {}
      }
      sampleFlags.value.samples[uuid] = {
        ...sampleFlags.value.samples[uuid],
        ...flagData,
        updatedAt: new Date().toISOString()
      }

      return true
    } catch (err) {
      error.value = err.message
      return false
    }
  }

  async function bulkUpdateFlags(updates) {
    try {
      const response = await fetch(`/api/production/${currentCourseCode.value}/flags/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      })

      if (!response.ok) throw new Error('Failed to bulk update flags')

      // Update local state
      for (const { uuid, ...data } of updates) {
        if (!sampleFlags.value.samples) {
          sampleFlags.value.samples = {}
        }
        sampleFlags.value.samples[uuid] = {
          ...sampleFlags.value.samples[uuid],
          ...data,
          updatedAt: new Date().toISOString()
        }
      }

      return true
    } catch (err) {
      error.value = err.message
      return false
    }
  }

  function handleWebSocketUpdate(data) {
    // Handle real-time updates from WebSocket
    if (data.type === 'sample_updated' && data.courseCode === currentCourseCode.value) {
      if (!sampleFlags.value.samples) {
        sampleFlags.value.samples = {}
      }
      sampleFlags.value.samples[data.uuid] = {
        ...sampleFlags.value.samples[data.uuid],
        ...data.update
      }
    }

    if (data.type === 'audio_metadata_updated' && data.courseCode === currentCourseCode.value) {
      if (!audioMetadata.value.audio) {
        audioMetadata.value.audio = {}
      }
      audioMetadata.value.audio[data.uuid] = data.metadata
    }
  }

  function setWsConnected(connected) {
    wsConnected.value = connected
  }

  function reset() {
    currentCourseCode.value = null
    courseManifest.value = null
    sampleFlags.value = {}
    audioMetadata.value = {}
    error.value = null
  }

  return {
    // State
    currentCourseCode,
    courseManifest,
    sampleFlags,
    audioMetadata,
    isLoading,
    error,
    wsConnected,

    // Computed
    samplesByStatus,
    progressStats,

    // Actions
    loadCourse,
    updateSampleFlag,
    bulkUpdateFlags,
    handleWebSocketUpdate,
    setWsConnected,
    reset
  }
})
