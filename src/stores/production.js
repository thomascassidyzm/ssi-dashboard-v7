// src/stores/production.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getApiUrl } from '@/services/api'

// API Base URL - reads from localStorage (set by EnvironmentSwitcher), then env, then default
// This allows routing through ngrok tunnel to local automation server
// IMPORTANT: Always check localStorage first - EnvironmentSwitcher sets ngrok URL there
function getApiBaseUrl() {
  // 1. ALWAYS check localStorage first (user set via EnvironmentSwitcher)
  // This is critical for Vercel deployments that need to route through ngrok
  const storedUrl = localStorage.getItem('api_base_url')
  if (storedUrl) {
    return storedUrl
  }

  // 2. Check if accessed via ngrok (hostname contains ngrok) - use relative URLs
  // (ngrok proxies to orchestrator which handles /api/* routes)
  const isNgrok = typeof window !== 'undefined' &&
    window.location.hostname.includes('ngrok')

  if (isNgrok) {
    // Use empty string = relative URLs, orchestrator handles /api/* routes
    return ''
  }

  // 3. For Vercel/popty.app - default to Tom's ngrok tunnel
  const isVercel = typeof window !== 'undefined' && (
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname === 'popty.app' ||
    window.location.hostname.endsWith('.popty.app')
  )

  if (isVercel) {
    // Default to Tom's dedicated ngrok domain for remote access
    return 'https://popty.ngrok.app'
  }

  // 4. Use env var or localhost for local development
  return getApiUrl()
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
  const courseInfo = ref(null) // Course metadata including status
  const sampleFlags = ref({}) // Legacy - deprecated
  const audioFlags = ref({ flags: [], stats: {} }) // NEW audio_flags system
  const audioMetadata = ref({})

  // Loading states
  const isLoading = ref(false)
  const error = ref(null)

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

  // Computed: blockers (uses NEW audio_flags system)
  const blockers = computed(() => {
    const blockersArray = []
    const flags = audioFlags.value.flags || []
    const stats = audioFlags.value.stats || {}

    // Count audio flagged for regeneration (from new audio_flags table)
    const flaggedCount = stats.flagged || flags.filter(f => f.status === 'flagged').length
    if (flaggedCount > 0) {
      blockersArray.push({
        id: 'audio_flagged',
        severity: 'medium',
        icon: '👀',
        count: flaggedCount,
        message: `${flaggedCount} audio files flagged for review`,
        suggestedAction: 'Review in Script Viewer',
        action: 'reviewFlaggedAudio'
      })
    }

    return blockersArray
  })

  // Computed: pipeline stages (uses NEW audio_flags system)
  const pipelineStagesComputed = computed(() => {
    const flags = audioFlags.value.flags || []
    const stats = audioFlags.value.stats || {}
    const flaggedCount = stats.flagged || flags.filter(f => f.status === 'flagged').length

    const stages = [
      {
        id: 'qa_review',
        name: 'QA Review',
        icon: '📄',
        route: 'ScriptViewer',
        progress: audioCourseStats.value.total > 0
          ? Math.round((audioCourseStats.value.existing / audioCourseStats.value.total) * 100)
          : 0,
        status: flaggedCount > 0 ? 'in_progress' : 'idle',
        count: flaggedCount,
        total: flaggedCount,
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
        count: 0,
        total: 0,
        lastActivity: '2 hours ago'
      },
      {
        id: 'final_review',
        name: 'Final Review',
        icon: '🔊',
        route: 'ScriptViewer',
        routeQuery: { filter: 'flagged' },
        progress: 0,
        status: flaggedCount > 0 ? 'needs_attention' : 'idle',
        count: flaggedCount,
        total: flaggedCount,
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
      // NOTE: Manifest is NOT fetched here - it's only for legacy app export
      const [flagsRes, audioFlagsRes, metadataRes] = await Promise.all([
        fetch(`${baseUrl}/api/production/${courseCode}/flags`, { headers }).catch(() => null),
        fetch(`${baseUrl}/api/production/${courseCode}/audio-flags`, { headers }).catch(() => null),
        fetch(`${baseUrl}/api/production/${courseCode}/audio-metadata`, { headers }).catch(() => null)
      ])

      // Manifest is legacy - only generated on-demand for export
      courseManifest.value = {
        _stub: true,
        _source: 'database',
        courseCode,
        title: courseCode.replace(/_/g, ' '),
        slices: [{ seeds: [], samples: {} }]
      }
      sampleFlags.value = flagsRes?.ok ? await flagsRes.json() : { samples: {} } // Legacy
      audioFlags.value = audioFlagsRes?.ok ? await audioFlagsRes.json() : { flags: [], stats: {} }
      audioMetadata.value = metadataRes?.ok ? await metadataRes.json() : { audio: {} }

      // NOTE: Orphan LEGO fix removed from automatic load (was slow and caused errors)
      // Orphan LEGOs are LEGOs without any practice phrases - they need a "debut phrase"
      // This is now only run when starting audio generation (see startGeneration)
      // Manual fix available via: POST /api/production/:courseCode/audio-pipeline/fix-orphan-legos

      // Load accurate pipeline stats from /plan endpoint
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

  // Load course info including status
  async function loadCourseInfo(courseCode) {
    try {
      const baseUrl = getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/production/${courseCode}/info`, {
        headers: getApiHeaders()
      })

      if (!response.ok) {
        // Course might not exist in database yet - use defaults
        console.warn(`[Production] Could not load course info for ${courseCode}`)
        courseInfo.value = {
          code: courseCode,
          displayName: courseCode.replace(/_/g, ' '),
          status: 'testing'
        }
        return courseInfo.value
      }

      const data = await response.json()
      courseInfo.value = data.course
      console.log(`[Production] Loaded course info: status=${data.course.status}`)
      return data.course
    } catch (err) {
      console.warn('[Production] Failed to load course info:', err.message)
      // Set defaults on error
      courseInfo.value = {
        code: courseCode,
        displayName: courseCode.replace(/_/g, ' '),
        status: 'testing'
      }
      return courseInfo.value
    }
  }

  // Update course status
  async function updateCourseStatus(status) {
    if (!currentCourseCode.value) {
      throw new Error('No course loaded')
    }

    try {
      const baseUrl = getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/production/${currentCourseCode.value}/status`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to update status')
      }

      const data = await response.json()

      // Update local state
      if (courseInfo.value) {
        courseInfo.value.status = data.course.status
        courseInfo.value.updatedAt = data.course.updatedAt
      }

      console.log(`[Production] Updated course status to ${status}`)
      return data.course
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  async function updateSampleFlag(uuid, flagData) {
    try {
      const baseUrl = getApiBaseUrl()
      // Use new audio-flags endpoint
      const response = await fetch(`${baseUrl}/api/production/${currentCourseCode.value}/audio-flags`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          audio_uuid: uuid,
          status: flagData.status || 'flagged',
          reason: flagData.note || flagData.reason || null,
          flagged_by: flagData.flagged_by || 'dashboard_user'
        })
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

  function updateGenerationProgress(current, total, status) {
    generationProgress.value = {
      current,
      total,
      status
    }
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

  // Status polling for progress updates
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
  async function startGeneration(courseCode, options = {}) {
    try {
      const baseUrl = getApiBaseUrl()
      const headers = getApiHeaders()

      // Fix orphan LEGOs before starting (creates debut phrases for LEGOs without any phrases)
      // This ensures the audio plan includes all LEGOs that need audio
      try {
        const orphanRes = await fetch(`${baseUrl}/api/production/${courseCode}/audio-pipeline/fix-orphan-legos`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
        if (orphanRes.ok) {
          const orphanData = await orphanRes.json()
          if (orphanData.addedCount > 0) {
            console.log(`[Production] Fixed ${orphanData.addedCount} orphan LEGOs before generation`)
          }
        }
      } catch (orphanErr) {
        console.warn('[Production] Could not fix orphan LEGOs:', orphanErr.message)
        // Continue anyway - not critical for generation
      }

      const response = await fetch(`${baseUrl}/api/production/${courseCode}/audio-pipeline/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ approved: true, options })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.message || errorData.error || 'Failed to start generation'
        throw new Error(errorMessage)
      }

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

  // Update pipeline stats from fresh plan data
  // This syncs the Progress Dashboard with the plan results
  function updatePipelineStats(total, existing, missing) {
    console.log(`[Production] Updating pipeline stats: ${total} total, ${existing} existing, ${missing} missing`)
    generationQueue.value = Array.from({ length: total || 0 }, (_, i) => ({
      id: `pending-${i}`,
      status: i < (existing || 0) ? 'complete' : 'queued'
    }))
    // Also update audioCourseStats for consistency
    audioCourseStats.value = {
      ...audioCourseStats.value,
      total: total || 0,
      existing: existing || 0,
      missing: missing || 0
    }
  }

  return {
    // State
    currentCourseCode,
    courseManifest,
    courseInfo,
    sampleFlags, // Legacy - deprecated
    audioFlags, // NEW audio_flags system
    audioMetadata,
    generationQueue,
    jobStatus,
    costEstimate,
    audioCourseStats,
    isLoading,
    error,
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
    loadCourseInfo,
    updateCourseStatus,
    updateSampleFlag,
    bulkUpdateFlags,
    updateGenerationProgress,
    startGeneration,
    cancelGeneration,
    retryFailed,
    generatePlan,
    updatePipelineStats,
    reset,
    // Recording actions
    loadRecordingQueue,
    startRecording,
    stopRecording,
    uploadRecording
  }
})
