// src/stores/production.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import io from 'socket.io-client'

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
  let socket = null

  // Pipeline state
  const pipelineStages = ref([])
  const generationProgress = ref({
    current: 0,
    total: 0,
    status: 'idle'
  })

  // Audio Pipeline state
  const generationQueue = ref([])
  const jobStatus = ref('idle') // 'idle' | 'running' | 'complete' | 'failed'
  const costEstimate = ref({
    estimated: '$0.00',
    actual: '$0.00',
    estimatedTime: '0 min',
    breakdown: []
  })

  // Recording Studio state
  const recordingState = ref('idle') // idle, recording, reviewing, uploading
  const currentRecordingPhrase = ref(null)
  const recordingQueue = ref([])
  const recordedAudio = ref(null)

  // Computed: samples by status
  const samplesByStatus = computed(() => {
    const grouped = {
      pending: [],
      flagged_regen_tts: [],
      flagged_human_needed: [],
      flagged_text_edit: [],
      in_pipeline: [],
      in_recording: [],
      needs_review: [],
      approved: [],
      rejected: [],
      tts_complete: [],
      tts_failed: [],
      recorded: [],
      complete: []
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

  // Computed: progress stats (for QA workflow)
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

  // Computed: pipeline stats (for audio generation)
  const pipelineStats = computed(() => {
    const total = generationQueue.value.length
    const generated = generationQueue.value.filter(item => item.status === 'complete').length
    const failed = generationQueue.value.filter(item => item.status === 'failed').length
    const pending = generationQueue.value.filter(item => item.status === 'queued').length

    return {
      total,
      generated,
      failed,
      pending
    }
  })

  // Computed: blockers
  const blockers = computed(() => {
    const blockersArray = []
    const samples = sampleFlags.value.samples || {}

    // Count samples needing human recording
    const humanNeeded = Object.values(samples).filter(
      s => s.status === 'flagged_human_needed'
    ).length
    if (humanNeeded > 0) {
      blockersArray.push({
        id: 'human_recording',
        severity: 'high',
        icon: '🎤',
        count: humanNeeded,
        message: `${humanNeeded} samples flagged for human recording`,
        suggestedAction: 'Create Recording Queue',
        action: 'createRecordingQueue'
      })
    }

    // Count samples needing TTS regeneration
    const ttsRegen = Object.values(samples).filter(
      s => s.status === 'flagged_regen_tts'
    ).length
    if (ttsRegen > 0) {
      blockersArray.push({
        id: 'tts_regen',
        severity: 'medium',
        icon: '🔄',
        count: ttsRegen,
        message: `${ttsRegen} samples flagged for TTS regeneration`,
        suggestedAction: 'Send to Audio Pipeline',
        action: 'sendToAudioPipeline'
      })
    }

    // Count samples in review
    const needsReview = Object.values(samples).filter(
      s => s.status === 'needs_review'
    ).length
    if (needsReview > 0) {
      blockersArray.push({
        id: 'needs_review',
        severity: 'low',
        icon: '👀',
        count: needsReview,
        message: `${needsReview} samples awaiting review`,
        suggestedAction: 'Review Samples',
        action: 'reviewSamples'
      })
    }

    return blockersArray
  })

  // Computed: pipeline stages
  const pipelineStagesComputed = computed(() => {
    const samples = sampleFlags.value.samples || {}
    const total = Object.keys(samples).length

    const stages = [
      {
        id: 'qa_review',
        name: 'QA Review',
        icon: '📄',
        route: 'ScriptViewer',
        progress: progressStats.value.percentComplete,
        status: 'in_progress',
        count: progressStats.value.approved,
        total: total,
        lastActivity: 'Active now'
      },
      {
        id: 'tts_generation',
        name: 'TTS Generation',
        icon: '⚙️',
        route: 'AudioPipeline',
        progress: generationProgress.value.total > 0
          ? Math.round((generationProgress.value.current / generationProgress.value.total) * 100)
          : 0,
        status: generationProgress.value.status,
        count: generationProgress.value.current,
        total: generationProgress.value.total,
        lastActivity: generationProgress.value.status === 'processing' ? 'Active now' : '5 minutes ago'
      },
      {
        id: 'human_recording',
        name: 'Human Recording',
        icon: '🎤',
        route: 'RecordingStudio',
        progress: 0,
        status: 'pending',
        count: samplesByStatus.value.in_recording?.length || 0,
        total: (samplesByStatus.value.flagged_human_needed?.length || 0) + (samplesByStatus.value.in_recording?.length || 0),
        lastActivity: '2 hours ago'
      },
      {
        id: 'final_review',
        name: 'Final Review',
        icon: '🔊',
        route: 'SamplesBrowser',
        progress: 0,
        status: (samplesByStatus.value.needs_review?.length || 0) > 0 ? 'needs_attention' : 'idle',
        count: samplesByStatus.value.needs_review?.length || 0,
        total: samplesByStatus.value.needs_review?.length || 0,
        lastActivity: '30 minutes ago'
      }
    ]

    return stages
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

    if (data.type === 'generation_progress' && data.courseCode === currentCourseCode.value) {
      generationProgress.value = {
        current: data.current || 0,
        total: data.total || 0,
        status: data.status || 'idle'
      }
    }
  }

  function updateGenerationProgress(current, total, status) {
    generationProgress.value = {
      current,
      total,
      status
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
    recordingState.value = 'idle'
    currentRecordingPhrase.value = null
    recordingQueue.value = []
    recordedAudio.value = null
  }

  // Recording Studio Actions
  async function loadRecordingQueue(courseCode, filters = {}) {
    try {
      const params = new URLSearchParams(filters)
      const response = await fetch(`/api/production/${courseCode}/recording/queue?${params}`)

      if (!response.ok) throw new Error('Failed to load recording queue')

      const data = await response.json()
      recordingQueue.value = data.items || []

      return data
    } catch (err) {
      error.value = err.message
      return { items: [] }
    }
  }

  function startRecording(phrase) {
    recordingState.value = 'recording'
    currentRecordingPhrase.value = phrase
    recordedAudio.value = null
  }

  function stopRecording(audioBlob) {
    recordingState.value = 'reviewing'
    recordedAudio.value = audioBlob
  }

  async function uploadRecording(audioBlob, metadata) {
    recordingState.value = 'uploading'

    try {
      // Convert blob to base64
      const base64Audio = await blobToBase64(audioBlob)

      const response = await fetch(`/api/production/${currentCourseCode.value}/recording/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType: audioBlob.type,
          metadata
        })
      })

      if (!response.ok) throw new Error('Upload failed')

      const result = await response.json()

      // Update sample flag to mark as recorded
      await updateSampleFlag(metadata.uuid, {
        status: 'recorded',
        recorded_at: new Date().toISOString(),
        recorded_by: metadata.voiceId,
        s3_key: result.key
      })

      recordingState.value = 'idle'
      currentRecordingPhrase.value = null
      recordedAudio.value = null

      return result
    } catch (err) {
      error.value = err.message
      recordingState.value = 'reviewing'
      throw err
    }
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  // WebSocket connection
  async function connectWebSocket(courseCode) {
    if (socket) {
      socket.disconnect()
    }

    const PRODUCTION_API_URL = import.meta.env.VITE_PRODUCTION_API_URL || 'http://localhost:3470'

    socket = io(PRODUCTION_API_URL, {
      path: '/api/production/websocket',
      transports: ['websocket', 'polling']
    })

    socket.on('connect', () => {
      console.log('WebSocket connected')
      wsConnected.value = true
      socket.emit('join_course', { courseCode })
    })

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
      wsConnected.value = false
    })

    socket.on('sample_updated', (data) => {
      handleWebSocketUpdate({ type: 'sample_updated', ...data })
    })

    socket.on('pipeline_progress', (data) => {
      if (data.courseCode === courseCode) {
        updatePipelineProgress(data)
      }
    })

    socket.on('pipeline_complete', (data) => {
      if (data.courseCode === courseCode) {
        jobStatus.value = 'complete'
      }
    })

    socket.on('error', (err) => {
      console.error('WebSocket error:', err)
    })
  }

  function disconnectWebSocket() {
    if (socket) {
      socket.disconnect()
      socket = null
    }
    wsConnected.value = false
  }

  function updatePipelineProgress(data) {
    // Update generation queue items
    if (data.items) {
      generationQueue.value = data.items
    }
    if (data.status) {
      jobStatus.value = data.status
    }
  }

  // Audio Pipeline actions
  async function startGeneration(courseCode) {
    try {
      const response = await fetch(`/api/production/${courseCode}/audio-pipeline/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true })
      })

      if (!response.ok) throw new Error('Failed to start generation')

      const data = await response.json()
      jobStatus.value = 'running'
      return data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  async function cancelGeneration(courseCode) {
    try {
      const response = await fetch(`/api/production/${courseCode}/audio-pipeline/cancel`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Failed to cancel generation')

      jobStatus.value = 'idle'
      return await response.json()
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  async function retryFailed(courseCode) {
    try {
      const failedItems = generationQueue.value
        .filter(item => item.status === 'failed')
        .map(item => item.uuid)

      const response = await fetch(`/api/production/${courseCode}/audio-pipeline/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuids: failedItems })
      })

      if (!response.ok) throw new Error('Failed to retry items')

      return await response.json()
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  async function generatePlan(courseCode) {
    try {
      const response = await fetch(`/api/production/${courseCode}/audio-pipeline/plan`)

      if (!response.ok) throw new Error('Failed to generate plan')

      const data = await response.json()
      costEstimate.value = {
        estimated: data.estimatedCost || '$0.00',
        estimatedTime: data.estimatedTime || '0 min',
        breakdown: data.breakdown || []
      }
      return data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  return {
    // State
    currentCourseCode,
    courseManifest,
    sampleFlags,
    audioMetadata,
    generationQueue,
    jobStatus,
    costEstimate,
    isLoading,
    error,
    wsConnected,
    pipelineStages,
    generationProgress,
    recordingState,
    currentRecordingPhrase,
    recordingQueue,
    recordedAudio,

    // Computed
    samplesByStatus,
    progressStats,
    pipelineStats,
    blockers,
    pipelineStagesComputed,

    // Actions
    loadCourse,
    updateSampleFlag,
    bulkUpdateFlags,
    handleWebSocketUpdate,
    updateGenerationProgress,
    connectWebSocket,
    disconnectWebSocket,
    startGeneration,
    cancelGeneration,
    retryFailed,
    generatePlan,
    setWsConnected,
    reset,
    // Recording actions
    loadRecordingQueue,
    startRecording,
    stopRecording,
    uploadRecording
  }
})
