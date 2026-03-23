// src/stores/production.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getApiUrl } from '@/services/api'
import { supabase, isConfigured as isSupabaseConfigured, getAudioStats as sbGetAudioStats, getAudioMetadata as sbGetAudioMetadata, getAudioFlags as sbGetAudioFlags, getCourseInfo as sbGetCourseInfo } from '@/services/supabase'

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

  // 3. For Vercel/popty.app - no default API base
  // Read-only data goes direct to Supabase via useBuildMonitor composable.
  // Agent operations (spawn, audio gen) require the user to set an ngrok URL
  // via EnvironmentSwitcher or localStorage.
  const isVercel = typeof window !== 'undefined' && (
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname === 'popty.app' ||
    window.location.hostname.endsWith('.popty.app')
  )

  if (isVercel) {
    // Return null — callers must check before making agent API calls
    return null
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

// Fetch with timeout support (1 hour default for long-running audio operations)
async function fetchWithTimeout(url, options = {}, timeoutMs = 3600000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    return response
  } finally {
    clearTimeout(timeoutId)
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

  // Loading states - granular for progressive loading
  const isLoading = ref(false)  // Overall loading (for backwards compat)
  const isLoadingInfo = ref(false)  // Course info (slow ~700ms)
  const isLoadingFlags = ref(false)  // Audio flags (medium ~200ms)
  const isLoadingMetadata = ref(false)  // Audio metadata (medium ~150ms)
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
    estimated: null,
    actual: null,
    estimatedTime: null,
    breakdown: []
  })

  // Full course audio stats (database-first)
  const audioCourseStats = ref({
    total: 0,        // Total audio needs for entire course
    existing: 0,     // Already generated
    missing: 0,      // Still need to generate
    phraseNeeds: 0,  // Phrase audio needs
    introNeeds: 0,   // Introduction audio needs
    generationPlan: null  // Phase 8's actual "clips to generate" count (deduped)
  })

  // Tracks whether async link-and-recount is in progress
  const isLinkingAudio = ref(false)

  // Realtime subscription for audio pipeline status
  let statusPollingInterval = null
  let buildJobChannel = null

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
  // Uses audioCourseStats from database when not actively generating
  // Uses generationQueue for live progress during active generation
  const pipelineStats = computed(() => {
    // If we have active generation, show live progress from queue
    if (generationQueue.value.length > 0) {
      const total = generationQueue.value.length
      const generated = generationQueue.value.filter(item => item.status === 'complete').length
      const failed = generationQueue.value.filter(item => item.status === 'failed').length
      const pending = generationQueue.value.filter(item => item.status === 'queued').length
      return { total, generated, failed, pending }
    }

    // Otherwise use database counts from audioCourseStats
    const stats = audioCourseStats.value
    return {
      total: stats.total || 0,
      generated: stats.existing || 0,
      pending: stats.missing || 0,
      failed: 0  // Not tracked in simple stats
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

    error.value = null
    currentCourseCode.value = courseCode

    // Set up stub manifest immediately (no loading state needed)
    courseManifest.value = {
      _stub: true,
      _source: 'database',
      courseCode,
      title: courseCode.replace(/_/g, ' '),
      slices: [{ seeds: [], samples: {} }]
    }

    const baseUrl = getApiBaseUrl()
    const headers = getApiHeaders()

    // PROGRESSIVE LOADING: Fire all requests but don't block on them
    // Each updates the UI as it completes - fast endpoints show data first

    if (isSupabaseConfigured()) {
      // Direct Supabase reads — no ngrok round-trip

      // 1. Audio stats
      sbGetAudioStats(courseCode).then(stats => {
        if (stats) {
          audioCourseStats.value = {
            ...audioCourseStats.value,
            total: stats.total || 0,
            existing: stats.existing || 0,
            missing: stats.missing || 0
          }
        }
      }).catch(() => {})

      // 2. Audio metadata
      isLoadingMetadata.value = true
      sbGetAudioMetadata(courseCode).then(data => {
        audioMetadata.value = data
      }).catch(() => {
        audioMetadata.value = { audio: {} }
      }).finally(() => {
        isLoadingMetadata.value = false
      })

      // 3. Legacy flags — keep on proxy (different table, rarely used)
      if (baseUrl) {
        fetch(`${baseUrl}/api/production/${courseCode}/flags`, { headers })
          .then(res => res.ok ? res.json() : { samples: {} })
          .then(data => { sampleFlags.value = data })
          .catch(() => { sampleFlags.value = { samples: {} } })
      }

      // 4. Audio flags
      isLoadingFlags.value = true
      sbGetAudioFlags(courseCode).then(data => {
        audioFlags.value = data
      }).catch(() => {
        audioFlags.value = { flags: [], stats: {} }
      }).finally(() => {
        isLoadingFlags.value = false
      })
    } else {
      // Fallback: API proxy

      // 1. Audio stats
      fetch(`${baseUrl}/api/production/${courseCode}/audio-stats`, { headers })
        .then(res => res.ok ? res.json() : null)
        .then(stats => {
          if (stats) {
            audioCourseStats.value = {
              ...audioCourseStats.value,
              total: stats.total || 0,
              existing: stats.existing || 0,
              missing: stats.missing || 0
            }
          }
        })
        .catch(() => {})

      // 2. Audio metadata
      isLoadingMetadata.value = true
      fetch(`${baseUrl}/api/production/${courseCode}/audio-metadata`, { headers })
        .then(res => res.ok ? res.json() : { audio: {} })
        .then(data => { audioMetadata.value = data })
        .catch(() => { audioMetadata.value = { audio: {} } })
        .finally(() => { isLoadingMetadata.value = false })

      // 3. Flags
      fetch(`${baseUrl}/api/production/${courseCode}/flags`, { headers })
        .then(res => res.ok ? res.json() : { samples: {} })
        .then(data => { sampleFlags.value = data })
        .catch(() => { sampleFlags.value = { samples: {} } })

      // 4. Audio flags
      isLoadingFlags.value = true
      fetch(`${baseUrl}/api/production/${courseCode}/audio-flags`, { headers })
        .then(res => res.ok ? res.json() : { flags: [], stats: {} })
        .then(data => { audioFlags.value = data })
        .catch(() => { audioFlags.value = { flags: [], stats: {} } })
        .finally(() => { isLoadingFlags.value = false })
    }

    // Mark data as loaded (individual sections have their own loading states)
    lastLoadTime.value[courseCode] = Date.now()
  }

  // Load course info including status (SLOW ~700ms via proxy, fast via Supabase)
  async function loadCourseInfo(courseCode) {
    isLoadingInfo.value = true
    try {
      if (isSupabaseConfigured()) {
        const row = await sbGetCourseInfo(courseCode)
        if (row) {
          // Map DB row to expected shape
          courseInfo.value = {
            code: row.course_code,
            displayName: row.display_name,
            knownLang: row.known_lang,
            targetLang: row.target_lang,
            status: row.status,
            courseType: row.course_type,
            seed_count: row.seed_count,
            pricingTier: row.pricing_tier || 'premium',
            isCommunity: row.is_community || false
          }
          return courseInfo.value
        }
        // Supabase returned null (RLS gap?) — fall through to API
      }

      // Fallback: API proxy
      const baseUrl = getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/production/${courseCode}/info`, {
        headers: getApiHeaders()
      })

      if (!response.ok) {
        courseInfo.value = { code: courseCode, displayName: courseCode.replace(/_/g, ' '), status: 'testing' }
        return courseInfo.value
      }

      const data = await response.json()
      courseInfo.value = data.course
      return data.course
    } catch (err) {
      console.warn('[Production] Failed to load course info:', err.message)
      courseInfo.value = { code: courseCode, displayName: courseCode.replace(/_/g, ' '), status: 'testing' }
      return courseInfo.value
    } finally {
      isLoadingInfo.value = false
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

  // Update course pricing tier
  async function updatePricingTier(tier) {
    if (!currentCourseCode.value) {
      throw new Error('No course loaded')
    }

    try {
      const baseUrl = getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/production/${currentCourseCode.value}/pricing-tier`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ pricingTier: tier })
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to update pricing tier')
      }

      const data = await response.json()

      // Update local state
      if (courseInfo.value) {
        courseInfo.value.pricingTier = data.course.pricingTier
        courseInfo.value.isCommunity = data.course.isCommunity
        courseInfo.value.updatedAt = data.course.updatedAt
      }

      console.log(`[Production] Updated pricing tier to ${tier}`)
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
    // Don't start if already subscribed
    if (buildJobChannel || statusPollingInterval) return

    console.log('[Production] Starting build_jobs monitoring for', courseCode)
    // Initial poll
    pollStatus(courseCode)

    // Try Supabase Realtime first
    if (supabase) {
      buildJobChannel = supabase
        .channel(`build-jobs:${courseCode}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'build_jobs',
          filter: `course_code=eq.${courseCode}`
        }, () => {
          pollStatus(courseCode)
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Production] Realtime connected for build_jobs')
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            // Fall back to polling
            console.warn('[Production] Realtime disconnected, falling back to 10s poll')
            if (!statusPollingInterval) {
              statusPollingInterval = setInterval(() => pollStatus(courseCode), 10000)
            }
          }
        })
    } else {
      // No Supabase — use polling fallback
      statusPollingInterval = setInterval(() => pollStatus(courseCode), 10000)
    }
  }

  function stopStatusPolling() {
    if (buildJobChannel && supabase) {
      supabase.removeChannel(buildJobChannel)
      buildJobChannel = null
    }
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
      // NOTE: Orphan LEGO fix removed - our methodology always creates debut phrases during course building
      // Manual fix still available via: POST /api/production/:courseCode/audio-pipeline/fix-orphan-legos

      const response = await fetchWithTimeout(`${baseUrl}/api/production/${courseCode}/audio-pipeline/start`, {
        method: 'POST',
        headers: getApiHeaders(),
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

      const response = await fetchWithTimeout(`${baseUrl}/api/production/${courseCode}/audio-pipeline/retry`, {
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

  // Link unlinked audio and refresh stats — runs in background after initial stats load
  async function linkAndRecount(courseCode) {
    isLinkingAudio.value = true
    try {
      const baseUrl = getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/production/${courseCode}/audio-pipeline/link-and-recount`, {
        method: 'POST',
        headers: getApiHeaders()
      })
      if (!response.ok) return null
      const data = await response.json()
      if (data.stats) {
        audioCourseStats.value = {
          total: data.stats.total || 0,
          existing: data.stats.existing || 0,
          missing: data.stats.missing || 0,
          generationPlan: data.stats.generationPlan || null
        }
      }
      return data
    } catch {
      return null
    } finally {
      isLinkingAudio.value = false
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
    isLinkingAudio,
    isLoading,
    isLoadingInfo,
    isLoadingFlags,
    isLoadingMetadata,
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
    updatePricingTier,
    updateSampleFlag,
    bulkUpdateFlags,
    updateGenerationProgress,
    startGeneration,
    cancelGeneration,
    retryFailed,
    generatePlan,
    linkAndRecount,
    updatePipelineStats,
    reset,
    // Recording actions
    loadRecordingQueue,
    startRecording,
    stopRecording,
    uploadRecording
  }
})
