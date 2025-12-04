/**
 * Production Store - Pinia State Management for Course Production Suite
 * Manages audio samples, flags, pipeline status, and real-time updates
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useProductionStore = defineStore('production', () => {
  // State
  const currentCourseCode = ref(null)
  const courseManifest = ref(null)
  const sampleFlags = ref({})
  const audioMetadata = ref({})
  const wsConnected = ref(false)
  const loading = ref(false)
  const error = ref(null)

  // Sample status types
  const STATUS_TYPES = {
    PENDING: 'pending',
    FLAGGED_TEXT_EDIT: 'flagged_text_edit',
    FLAGGED_REGEN_TTS: 'flagged_regen_tts',
    FLAGGED_HUMAN_NEEDED: 'flagged_human_needed',
    IN_PIPELINE: 'in_pipeline',
    TTS_COMPLETE: 'tts_complete',
    TTS_FAILED: 'tts_failed',
    IN_RECORDING: 'in_recording',
    RECORDED: 'recorded',
    NEEDS_REVIEW: 'needs_review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    COMPLETE: 'complete'
  }

  // Computed: All samples from manifest with their flags
  const allSamples = computed(() => {
    if (!courseManifest.value?.seeds) return []

    const samples = []
    courseManifest.value.seeds.forEach(seed => {
      if (seed.cycles) {
        seed.cycles.forEach(cycle => {
          const flag = sampleFlags.value[cycle.uuid] || { status: STATUS_TYPES.PENDING }
          samples.push({
            ...cycle,
            seedId: seed.seed_id,
            flag,
            status: flag.status || STATUS_TYPES.PENDING
          })
        })
      }
    })
    return samples
  })

  // Computed: Samples grouped by status
  const samplesByStatus = computed(() => {
    const grouped = {
      pending: [],
      flagged_text_edit: [],
      flagged_regen_tts: [],
      flagged_human_needed: [],
      in_pipeline: [],
      tts_complete: [],
      tts_failed: [],
      in_recording: [],
      recorded: [],
      needs_review: [],
      approved: [],
      rejected: [],
      complete: []
    }

    allSamples.value.forEach(sample => {
      const status = sample.status || STATUS_TYPES.PENDING
      if (grouped[status]) {
        grouped[status].push(sample)
      } else {
        grouped.pending.push(sample)
      }
    })

    return grouped
  })

  // Computed: Progress statistics
  const progressStats = computed(() => {
    const total = allSamples.value.length || 0
    const byStatus = samplesByStatus.value

    const approved = byStatus.approved.length + byStatus.complete.length
    const flagged = byStatus.flagged_text_edit.length +
                   byStatus.flagged_regen_tts.length +
                   byStatus.flagged_human_needed.length
    const inProgress = byStatus.in_pipeline.length +
                       byStatus.in_recording.length +
                       byStatus.needs_review.length
    const pending = byStatus.pending.length

    return {
      total,
      approved,
      flagged,
      inProgress,
      pending,
      percentComplete: total > 0 ? Math.round((approved / total) * 100) : 0
    }
  })

  // Actions
  async function loadCourse(courseCode) {
    loading.value = true
    error.value = null
    currentCourseCode.value = courseCode

    try {
      // Load course manifest
      const manifestResponse = await fetch(`/api/production/${courseCode}/manifest`)
      if (manifestResponse.ok) {
        courseManifest.value = await manifestResponse.json()
      } else {
        // Fallback to local VFS
        const vfsResponse = await fetch(`/vfs/courses/${courseCode}/course_manifest.json`)
        if (vfsResponse.ok) {
          courseManifest.value = await vfsResponse.json()
        }
      }

      // Load sample flags
      const flagsResponse = await fetch(`/api/production/${courseCode}/flags`)
      if (flagsResponse.ok) {
        const flagsData = await flagsResponse.json()
        sampleFlags.value = flagsData.samples || {}
      }

      // Load audio metadata
      const metaResponse = await fetch(`/api/production/${courseCode}/audio-metadata`)
      if (metaResponse.ok) {
        const metaData = await metaResponse.json()
        audioMetadata.value = metaData.audio_files || {}
      }
    } catch (err) {
      console.error('Failed to load course:', err)
      error.value = err.message

      // Generate mock data for development
      generateMockData(courseCode)
    } finally {
      loading.value = false
    }
  }

  // Generate mock data for development/demo
  function generateMockData(courseCode) {
    const mockSeeds = []
    const mockFlags = {}

    // Create 50 mock seeds with cycles
    for (let i = 1; i <= 50; i++) {
      const seedId = `S${String(i).padStart(4, '0')}`
      const cycles = []

      // Introduction cycle
      const introUuid = `intro-${seedId}-${Date.now()}`
      cycles.push({
        uuid: introUuid,
        type: 'introduction',
        target: `Phrase ${i} in target language`,
        known: `Phrase ${i} in known language`
      })

      // Randomly assign statuses
      const statuses = [
        STATUS_TYPES.PENDING,
        STATUS_TYPES.APPROVED,
        STATUS_TYPES.FLAGGED_REGEN_TTS,
        STATUS_TYPES.FLAGGED_HUMAN_NEEDED
      ]
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
      mockFlags[introUuid] = { status: randomStatus }

      mockSeeds.push({
        seed_id: seedId,
        seed_pair: [`Target ${i}`, `Known ${i}`],
        cycles
      })
    }

    courseManifest.value = {
      version: '10.1.0',
      course_code: courseCode,
      seeds: mockSeeds
    }

    sampleFlags.value = mockFlags
  }

  async function updateSampleFlag(uuid, flagUpdate) {
    // Optimistic update
    const previous = sampleFlags.value[uuid]
    sampleFlags.value[uuid] = {
      ...sampleFlags.value[uuid],
      ...flagUpdate,
      updated_at: new Date().toISOString()
    }

    try {
      const response = await fetch(`/api/production/${currentCourseCode.value}/flags/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid, ...flagUpdate })
      })

      if (!response.ok) {
        throw new Error('Failed to update flag')
      }
    } catch (err) {
      console.error('Failed to update flag:', err)
      // Revert on failure
      if (previous) {
        sampleFlags.value[uuid] = previous
      } else {
        delete sampleFlags.value[uuid]
      }
    }
  }

  async function bulkUpdateFlags(updates) {
    // updates: Array of { uuid, status, ... }
    const previousFlags = { ...sampleFlags.value }

    // Optimistic update
    updates.forEach(update => {
      sampleFlags.value[update.uuid] = {
        ...sampleFlags.value[update.uuid],
        ...update,
        updated_at: new Date().toISOString()
      }
    })

    try {
      const response = await fetch(`/api/production/${currentCourseCode.value}/flags/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      })

      if (!response.ok) {
        throw new Error('Failed to bulk update flags')
      }
    } catch (err) {
      console.error('Failed to bulk update flags:', err)
      // Revert on failure
      sampleFlags.value = previousFlags
    }
  }

  function setWsConnected(connected) {
    wsConnected.value = connected
  }

  function handleWsMessage(message) {
    // Handle real-time updates from WebSocket
    switch (message.type) {
      case 'sample_flagged':
        if (message.uuid && message.status) {
          sampleFlags.value[message.uuid] = {
            ...sampleFlags.value[message.uuid],
            status: message.status,
            updated_at: message.timestamp
          }
        }
        break

      case 'pipeline_progress':
        // Emit custom event for pipeline components
        window.dispatchEvent(new CustomEvent('pipeline_progress', { detail: message }))
        break

      case 'audio_generated':
        if (message.uuid) {
          audioMetadata.value[message.uuid] = message.metadata
          // Update flag status
          sampleFlags.value[message.uuid] = {
            ...sampleFlags.value[message.uuid],
            status: STATUS_TYPES.TTS_COMPLETE
          }
        }
        break

      default:
        console.log('Unknown WS message type:', message.type)
    }
  }

  function reset() {
    currentCourseCode.value = null
    courseManifest.value = null
    sampleFlags.value = {}
    audioMetadata.value = {}
    loading.value = false
    error.value = null
  }

  return {
    // State
    currentCourseCode,
    courseManifest,
    sampleFlags,
    audioMetadata,
    wsConnected,
    loading,
    error,

    // Constants
    STATUS_TYPES,

    // Computed
    allSamples,
    samplesByStatus,
    progressStats,

    // Actions
    loadCourse,
    updateSampleFlag,
    bulkUpdateFlags,
    setWsConnected,
    handleWsMessage,
    reset
  }
})
