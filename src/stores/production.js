// src/stores/production.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import io from 'socket.io-client'

// API Base URL - reads from localStorage (set by EnvironmentSwitcher), then env, then default
// This allows routing through ngrok tunnel to local automation server
// On Vercel deployment, uses relative URLs (/api/...) which Vercel handles
function getApiBaseUrl() {
  // 1. Check localStorage override (user set via EnvironmentSwitcher)
  const storedUrl = localStorage.getItem('api_base_url')
  if (storedUrl) {
    return storedUrl
  }

  // 2. Check if we're on Vercel deployment (use relative URLs)
  const isVercel = typeof window !== 'undefined' && (
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname === 'popty.app' ||
    window.location.hostname.endsWith('.popty.app')
  )
  if (isVercel) {
    // Use empty string = relative URLs, Vercel handles /api/* routes
    return ''
  }

  // 3. Use env var or localhost for local development
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
}

// Common headers for API requests (ngrok tunnel compatibility)
function getApiHeaders() {
  return {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  }
}

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

  // Full course audio stats (database-first)
  const audioCourseStats = ref({
    total: 0,        // Total audio needs for entire course
    existing: 0,     // Already generated
    missing: 0,      // Still need to generate
    phraseNeeds: 0,  // Phrase audio needs
    introNeeds: 0    // Introduction audio needs
  })

  // Polling interval for status updates
  let statusPollingInterval = null

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
        route: 'AudioPipelineProduction',
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
        route: 'RecordingStudioProduction',
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

  // Cache tracking for frontend data - DISABLED during development
  const lastLoadTime = ref({}) // courseCode -> timestamp
  const CACHE_TTL_MS = 0 // DISABLED - caching causes too many issues during testing

  // Actions
  async function loadCourse(courseCode, forceRefresh = false) {
    // Guard against undefined courseCode
    if (!courseCode) {
      error.value = 'No course code provided'
      return
    }

    // Check if we already have fresh data for this course
    const lastLoad = lastLoadTime.value[courseCode]
    const isSameCourse = currentCourseCode.value === courseCode
    const isFresh = lastLoad && (Date.now() - lastLoad) < CACHE_TTL_MS

    if (!forceRefresh && isSameCourse && isFresh && courseManifest.value) {
      console.log(`[Production] Using cached data for ${courseCode} (age: ${Math.round((Date.now() - lastLoad) / 1000)}s)`)
      return
    }

    isLoading.value = true
    error.value = null
    currentCourseCode.value = courseCode

    try {
      const baseUrl = getApiBaseUrl()
      const headers = getApiHeaders()

      // Fetch course data - all requests are optional, we'll use what we get
      const [manifestRes, flagsRes, metadataRes] = await Promise.all([
        fetch(`${baseUrl}/api/production/${courseCode}/manifest`, { headers }).catch(() => null),
        fetch(`${baseUrl}/api/production/${courseCode}/flags`, { headers }).catch(() => null),
        fetch(`${baseUrl}/api/production/${courseCode}/audio-metadata`, { headers }).catch(() => null)
      ])

      // Parse responses, using defaults for failures
      let manifestData = null
      if (manifestRes?.ok) {
        manifestData = await manifestRes.json()
      } else if (manifestRes) {
        // Try to get error message
        try {
          const errData = await manifestRes.json()
          console.warn('[Production] Manifest warning:', errData.error || errData.message)
        } catch (e) {
          console.warn('[Production] Manifest returned:', manifestRes.status)
        }
      }

      // Even without manifest, we can show basic info from the course list
      // Create a minimal stub if no manifest
      if (!manifestData) {
        manifestData = {
          _stub: true,
          _source: 'none',
          courseCode,
          title: courseCode.replace(/_/g, ' '),
          stats: { seeds: 0, legos: 0, phrases: 0 },
          slices: [{ seeds: [], samples: {} }]
        }
      }

      courseManifest.value = manifestData
      sampleFlags.value = flagsRes?.ok ? await flagsRes.json() : { samples: {} }
      audioMetadata.value = metadataRes?.ok ? await metadataRes.json() : { audio: {} }

      // Always load pipeline plan for stats (not just for stub manifests)
      console.log('[Production] Loading pipeline plan for stats...')
      try {
        const planRes = await fetch(`${baseUrl}/api/production/${courseCode}/audio-pipeline/plan`, { headers })
        if (planRes.ok) {
          const planData = await planRes.json()
          // Populate full course stats
          audioCourseStats.value = {
            total: planData.total || 0,
            existing: planData.existing || 0,
            // Use ?? to handle 0 correctly (|| treats 0 as falsy)
            missing: planData.missing ?? (planData.total - planData.existing) ?? 0,
            phraseNeeds: planData.phraseNeeds || 0,
            introNeeds: planData.introNeeds || 0
          }
          // Populate pipeline stats from plan
          costEstimate.value = {
            estimated: planData.estimatedCost || '$0.00',
            estimatedTime: planData.estimatedTime || '0 min',
            breakdown: planData.breakdown || []
          }
          // Create generation queue items from plan counts (use total for full visibility)
          generationQueue.value = Array.from({ length: planData.total || 0 }, (_, i) => ({
            id: `pending-${i}`,
            status: i < (planData.existing || 0) ? 'complete' : 'queued'
          }))
          console.log(`[Production] Loaded plan: ${planData.total} total, ${planData.existing} existing, ${planData.missing} to generate`)
        }
      } catch (planErr) {
        console.warn('[Production] Could not load pipeline plan:', planErr.message)
      }

      // Mark this course data as fresh
      lastLoadTime.value[courseCode] = Date.now()

    } catch (err) {
      // Network errors indicate Production API is not running
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        error.value = 'Production API not available. Start the production-api service (port 3470) to use the Production Suite.'
      } else {
        error.value = err.message
      }
      console.error('Failed to load course:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function updateSampleFlag(uuid, flagData) {
    try {
      const baseUrl = getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/production/${currentCourseCode.value}/flags/update`, {
        method: 'POST',
        headers: getApiHeaders(),
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
      const baseUrl = getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/production/${currentCourseCode.value}/flags/bulk-update`, {
        method: 'POST',
        headers: getApiHeaders(),
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
      const baseUrl = getApiBaseUrl()
      const params = new URLSearchParams(filters)
      const response = await fetch(`${baseUrl}/api/production/${courseCode}/recording/queue?${params}`, {
        headers: getApiHeaders()
      })

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
      const baseUrl = getApiBaseUrl()

      // Convert blob to base64
      const base64Audio = await blobToBase64(audioBlob)

      const response = await fetch(`${baseUrl}/api/production/${currentCourseCode.value}/recording/upload`, {
        method: 'POST',
        headers: getApiHeaders(),
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

    // Use the same API base URL for WebSocket (works through ngrok tunnel)
    const baseUrl = getApiBaseUrl()

    // Skip WebSocket in ngrok/production environments - use polling instead
    if (baseUrl.includes('ngrok') || baseUrl.includes('vercel') || baseUrl.includes('popty.app')) {
      console.log('[Production] WebSocket disabled for remote environment, using polling')
      wsConnected.value = false
      return
    }

    socket = io(baseUrl, {
      path: '/api/production/websocket',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      timeout: 5000,
      extraHeaders: {
        'ngrok-skip-browser-warning': 'true'
      }
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

  // Status polling for remote environments (no WebSocket)
  async function pollStatus(courseCode) {
    try {
      const baseUrl = getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/production/${courseCode}/audio-pipeline/status`, {
        headers: getApiHeaders()
      })

      if (!response.ok) {
        console.warn('[Production] Status poll failed:', response.status)
        return
      }

      const data = await response.json()

      if (data.job) {
        // Update job status
        jobStatus.value = data.job.status || 'running'

        // Update progress stats from job
        if (data.job.progress) {
          const progress = data.job.progress
          // Update generation queue to reflect current progress
          generationQueue.value = generationQueue.value.map((item, index) => {
            if (index < progress.generated) {
              return { ...item, status: 'complete' }
            } else if (index < progress.current) {
              return { ...item, status: progress.failed > progress.generated ? 'failed' : 'processing' }
            }
            return item
          })

          console.log(`[Production] Status: ${progress.current}/${progress.total} (${progress.generated} generated, ${progress.failed} failed)`)
        }

        // Stop polling if job is complete or cancelled
        if (data.job.status === 'complete' || data.job.status === 'cancelled' || data.job.status === 'failed') {
          stopStatusPolling()
          jobStatus.value = data.job.status
        }
      } else {
        // No active job
        jobStatus.value = 'idle'
        stopStatusPolling()
      }
    } catch (err) {
      console.warn('[Production] Status poll error:', err.message)
    }
  }

  function startStatusPolling(courseCode) {
    // Don't start if already polling
    if (statusPollingInterval) return

    console.log('[Production] Starting status polling for', courseCode)
    // Poll immediately, then every 2 seconds
    pollStatus(courseCode)
    statusPollingInterval = setInterval(() => pollStatus(courseCode), 2000)
  }

  function stopStatusPolling() {
    if (statusPollingInterval) {
      console.log('[Production] Stopping status polling')
      clearInterval(statusPollingInterval)
      statusPollingInterval = null
    }
  }

  // Audio Pipeline actions
  async function startGeneration(courseCode) {
    try {
      const baseUrl = getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/production/${courseCode}/audio-pipeline/start`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ approved: true })
      })

      if (!response.ok) throw new Error('Failed to start generation')

      const data = await response.json()
      jobStatus.value = 'running'

      // Start polling for status updates (especially for remote environments)
      startStatusPolling(courseCode)

      return data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  async function cancelGeneration(courseCode) {
    try {
      const baseUrl = getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/production/${courseCode}/audio-pipeline/cancel`, {
        method: 'POST',
        headers: getApiHeaders()
      })

      if (!response.ok) throw new Error('Failed to cancel generation')

      stopStatusPolling()
      jobStatus.value = 'idle'
      return await response.json()
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  async function retryFailed(courseCode) {
    try {
      const baseUrl = getApiBaseUrl()
      const failedItems = generationQueue.value
        .filter(item => item.status === 'failed')
        .map(item => item.uuid)

      const response = await fetch(`${baseUrl}/api/production/${courseCode}/audio-pipeline/retry`, {
        method: 'POST',
        headers: getApiHeaders(),
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
      const baseUrl = getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/production/${courseCode}/audio-pipeline/plan`, {
        headers: getApiHeaders()
      })

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
    audioCourseStats,
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
