// src/composables/useExportWorkflow.ts
import { ref, computed, watch } from 'vue'
import { io, Socket } from 'socket.io-client'
import { getApiUrl } from '@/services/api'

export interface ExportState {
  courseCode: string
  manifestGenerated: boolean
  manifestGeneratedAt: string | null
  s3Verified: boolean
  s3VerifiedAt: string | null
  manifestPublished: boolean
  manifestPublishedAt: string | null
  audioDeployed: boolean
  audioDeployedAt: string | null
  manifestVersion: string | null
  manifestStatus: string | null
  s3Verification: S3VerificationResult | null
  publishCourseConfigsPath: string | null
  publishApidevFilename: string | null
  deployPlan: DeployPlan | null
  deployExecutedAt: string | null
  deployVerification: DeployVerification | null
  updatedAt: string | null
  // Local manifest storage tracking
  pendingManifestPath: string | null
  generatedOnMachine: string | null
}

export interface DeployVerification {
  checked: number
  matched: number
  mismatched: number
  errors: number
  details: Array<{ uuid: string; issue: string; expected: number }>
  message?: string
  skippedOverwrites?: number
}

export interface S3VerificationResult {
  total: number
  existing: number
  missing: number
  missingUuids: string[]
  durationChecked?: number
  durationMatched?: number
  durationMismatched?: number
  durationErrors?: number
  durationCheckFailed?: boolean
  durationCheckError?: string
  durationsFixed?: number
  durationFixErrors?: number
  durationMismatchDetails?: Array<{
    uuid: string
    expectedDuration: number
    actualDuration: number
    difference: number
  }>
  durationErrorDetails?: Array<{
    uuid: string
    error: string
    stage: string
  }>
  verifyFixed?: {
    checked: number
    matched: number
    mismatched: number
    mismatchDetails: Array<{
      uuid: string
      manifestDuration: number
      s3Duration: number
      difference: number
    }>
  }
}

export interface OverwriteDurations {
  checked: number
  matched: number
  mismatched: number
  errors: number
  mismatchDetails: Array<{
    uuid: string
    expectedDuration: number
    actualDuration: number
    difference: number
    text?: string
    role?: string
    sampleType?: string
  }>
  warning?: string
}

export interface DeployPlan {
  total: number
  newFiles: number
  overwrites: number
  overwriteUuids: string[]
  newUuids: string[]
  scenario?: 'all_new' | 'overwrites_identical' | 'overwrites_different'
  overwriteDurations?: OverwriteDurations | null
}

export interface VersionInfo {
  courseCode: string
  courseConfigsId: string
  repoAvailable: boolean
  repoError: string | null
  existingVersion: string
  suggestedVersion: string
}

export interface ManifestStats {
  seeds: number
  orderedEncouragements: number
  pooledEncouragements: number
}

export interface ValidationResult {
  valid: boolean
  summary: string
  invalidUUIDs: number
  emptyStrings: number
  invalidUUIDDetails: Array<{ path: string; value: string }>
  emptyStringDetails: string[]
}

function getApiBaseUrl(): string {
  return getApiUrl()
}

// Get machine name from environment switcher settings
function getMachineName(): string {
  const envKey = localStorage.getItem('ssi_environment')
  const MACHINE_NAMES: Record<string, string> = {
    tom: "Tom's Machine",
    kai: "Kai's Machine",
    api: 'API Server',
    default: 'Unknown Machine'
  }
  return MACHINE_NAMES[envKey || 'default'] || MACHINE_NAMES.default
}

export function useExportWorkflow(courseCode: string) {
  // State
  const state = ref<ExportState>({
    courseCode,
    manifestGenerated: false,
    manifestGeneratedAt: null,
    s3Verified: false,
    s3VerifiedAt: null,
    manifestPublished: false,
    manifestPublishedAt: null,
    audioDeployed: false,
    audioDeployedAt: null,
    manifestVersion: null,
    manifestStatus: null,
    s3Verification: null,
    publishCourseConfigsPath: null,
    publishApidevFilename: null,
    deployPlan: null,
    deployExecutedAt: null,
    deployVerification: null,
    updatedAt: null,
    pendingManifestPath: null,
    generatedOnMachine: null
  })

  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const manifest = ref<any>(null)
  const stats = ref<ManifestStats | null>(null)
  const validation = ref<ValidationResult | null>(null)
  const warnings = ref<string[]>([])
  const versionInfo = ref<VersionInfo | null>(null)
  const manifestDiff = ref<any>(null)

  // Progress tracking for long operations
  const audioGenerationProgress = ref({
    completed: 0,
    total: 0,
    status: 'none' as 'none' | 'running' | 'completed' | 'failed',
    errors: [] as Array<{ legoId: string, error: string }>,
    skipped: [] as Array<{ legoId: string, missing: string[] }>
  })
  const audioJobId = ref<string | null>(null)
  const s3VerifyProgress = ref({ checked: 0, total: 0 })
  const deployProgress = ref({ deployed: 0, total: 0 })
  const isDeploying = ref(false)
  const deployPlanProgress = ref({
    phase: 'idle' as 'idle' | 'existence' | 'duration',
    checked: 0,
    total: 0,
    matched: 0,
    mismatched: 0,
    errors: 0
  })

  // Stage deploy (apidev ./check -e stage deploy + ~/api/stage/restart.sh).
  // Lives in memory only for now — re-attaches on dialog reopen via
  // fetchStageDeployStatus() if a job is still running server-side.
  type StageDeployStatus = 'idle' | 'running' | 'success' | 'failed' | 'cancelled' | 'identical'
  type RestartPhase = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'
  const stageDeployStatus = ref<StageDeployStatus>('idle')
  const stageDeployJobId = ref<string | null>(null)
  const stageDeployStartedAt = ref<string | null>(null)
  const stageDeployEndedAt = ref<string | null>(null)
  const stageDeployLog = ref<Array<{ stream: 'stdout' | 'stderr', line: string }>>([])
  const stageDeployIsNewCourse = ref(false)
  const stageDeploySawChecksPassed = ref(false)
  const stageDeployExitCode = ref<number | null>(null)
  const stageDeployUsedSkipChecks = ref(false)
  const stageDeployCourseConfigsId = ref<string | null>(null)
  const stageDeployRestartPhase = ref<RestartPhase>('pending')
  const stageDeployRestartFailureReason = ref<string | null>(null)
  const stageDeployRestartTimeoutSeconds = ref<number | null>(null)

  function resetStageDeployState() {
    stageDeployStatus.value = 'idle'
    stageDeployJobId.value = null
    stageDeployStartedAt.value = null
    stageDeployEndedAt.value = null
    stageDeployLog.value = []
    stageDeployIsNewCourse.value = false
    stageDeploySawChecksPassed.value = false
    stageDeployExitCode.value = null
    stageDeployUsedSkipChecks.value = false
    stageDeployCourseConfigsId.value = null
    stageDeployRestartPhase.value = 'pending'
    stageDeployRestartFailureReason.value = null
    stageDeployRestartTimeoutSeconds.value = null
  }

  // WebSocket for real-time updates
  let socket: Socket | null = null
  let socketConnected = false

  // Caller-supplied hook fired when legacyAudio:completed arrives for THIS job.
  // Registered once on dialog mount via onLegacyAudioCompleted(fn) — survives
  // socket reconnects because the socket-level listener is re-attached inside
  // connectWebSocket() and dispatches through this ref.
  let legacyAudioCompletedHandler: ((data: any) => void) | null = null

  // Computed
  const currentStep = computed(() => {
    if (state.value.audioDeployed) return 4
    if (state.value.manifestPublished) return 4
    if (state.value.s3Verified) return 3
    if (state.value.manifestGenerated) return 2
    return 1
  })

  const completedSteps = computed(() => {
    const completed: number[] = []
    if (state.value.manifestGenerated) completed.push(1)
    if (state.value.s3Verified) completed.push(2)
    if (state.value.manifestPublished) completed.push(3)
    if (state.value.audioDeployed) completed.push(4)
    return completed
  })

  // API helpers
  async function fetchApi(endpoint: string, options: RequestInit = {}, timeoutMs: number = 1200000) {
    const apiBase = getApiBaseUrl()

    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...options.headers
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errorData.error || 'Request failed')
      }

      return response.json()
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs / 1000}s`)
      }
      throw err
    }
  }

  // Connect WebSocket for real-time progress updates
  function connectWebSocket() {
    // If already connected, don't create a new socket
    if (socket && socketConnected) {
      console.log('[ExportWorkflow] WebSocket already connected, reusing existing connection')
      return
    }

    // If socket exists but not connected, disconnect first
    if (socket) {
      socket.disconnect()
      socket = null
      socketConnected = false
    }

    const apiBase = getApiBaseUrl()
    const wsUrl = apiBase || window.location.origin

    socket = io(wsUrl, {
      path: '/api/production/websocket',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      timeout: 10000
    })

    socket.on('connect', () => {
      console.log('[ExportWorkflow] WebSocket connected to:', wsUrl)
      console.log('[ExportWorkflow] Socket ID:', socket?.id)
      socketConnected = true

      // Join course-specific room
      socket?.emit('join_course', { courseCode })
      console.log('[ExportWorkflow] Joined course room:', courseCode)

      // Check if a deploy is already running (handles tab refresh, reconnect)
      checkDeployStatus()
    })

    socket.on('connect_error', (error) => {
      const attempts = (socket as any)?.io?._reconnection !== false
        ? `(attempt ${(socket as any)?.io?.backoff?.attempts || '?'}/5)`
        : ''
      console.warn(`[ExportWorkflow] WebSocket connection error: ${error.message} ${attempts}`)
    })

    socket.on('reconnect_failed', () => {
      console.warn('[ExportWorkflow] WebSocket reconnection failed after max attempts — giving up')
    })

    socket.on('disconnect', (reason) => {
      console.log('[ExportWorkflow] WebSocket disconnected:', reason)
      socketConnected = false
    })

    // Legacy audio generation progress
    socket.on('legacyAudio:progress', (data: { jobId: string; completed: number; total: number }) => {
      console.log('[ExportWorkflow] legacyAudio:progress received:', data)
      console.log('[ExportWorkflow] Current audioJobId:', audioJobId.value)
      if (data.jobId === audioJobId.value) {
        audioGenerationProgress.value = {
          completed: data.completed,
          total: data.total,
          status: 'running',
          errors: [],
          skipped: []
        }
        console.log('[ExportWorkflow] Progress updated:', audioGenerationProgress.value)
      }
    })

    socket.on('legacyAudio:completed', (data: {
      jobId: string
      successful?: number
      errorsCount?: number
      skippedCount?: number
      errors?: Array<{ legoId: string, error: string }>
      skipped?: Array<{ legoId: string, missing: string[] }>
    }) => {
      console.log('[ExportWorkflow] legacyAudio:completed received:', data)
      if (data.jobId === audioJobId.value) {
        audioGenerationProgress.value.status = 'completed'
        audioGenerationProgress.value.errors = data.errors || []
        audioGenerationProgress.value.skipped = data.skipped || []
        console.log('[ExportWorkflow] Status updated to completed', {
          errors: audioGenerationProgress.value.errors.length,
          skipped: audioGenerationProgress.value.skipped.length
        })
        if (legacyAudioCompletedHandler) {
          try { legacyAudioCompletedHandler(data) } catch (e) {
            console.warn('[ExportWorkflow] legacyAudioCompleted handler threw:', e)
          }
        }
      }
    })

    socket.on('legacyAudio:failed', (data: { jobId: string; error: string }) => {
      console.log('[ExportWorkflow] legacyAudio:failed received:', data)
      if (data.jobId === audioJobId.value) {
        audioGenerationProgress.value.status = 'failed'
        error.value = `Audio generation failed: ${data.error}`
        console.log('[ExportWorkflow] Status updated to failed')
      }
    })

    // S3 verification progress - handles all phases (existence, duration, fixing, verifying)
    socket.on('s3Verify:progress', (data: {
      courseCode: string
      phase: string
      checked: number
      total: number
      matched?: number
      mismatched?: number
      errors?: number
      fixed?: number
    }) => {
      if (data.courseCode === courseCode) {
        s3VerifyProgress.value = {
          phase: data.phase || 'existence',
          checked: data.checked,
          total: data.total,
          matched: data.matched,
          mismatched: data.mismatched,
          errors: data.errors,
          fixed: data.fixed
        }
      }
    })

    socket.on('s3Verify:completed', async (data: { courseCode: string; missing?: number; durationMismatched?: number }) => {
      if (data.courseCode === courseCode) {
        s3VerifyProgress.value = { checked: 0, total: 0 }
        // Refresh state from database to pick up auto-fix results
        try {
          const freshState = await fetchApi(`/api/production/${courseCode}/export-state`)
          state.value.s3Verified = freshState.s3Verified || false
          state.value.s3VerifiedAt = freshState.s3VerifiedAt || null
          state.value.s3Verification = freshState.s3Verification || null
        } catch (e) {
          // Fallback: use data from the event
          state.value.s3Verified = (data.missing === 0 && data.durationMismatched === 0)
        }
        isLoading.value = false
      }
    })

    socket.on('s3Verify:error', (data: { courseCode: string; error: string }) => {
      if (data.courseCode === courseCode) {
        error.value = data.error
        s3VerifyProgress.value = { checked: 0, total: 0 }
        isLoading.value = false
      }
    })

    // Deploy plan progress (existence + duration checking phases)
    socket.on('deployPlan:progress', (data: {
      courseCode: string
      phase: string
      checked: number
      total: number
      matched?: number
      mismatched?: number
      errors?: number
    }) => {
      if (data.courseCode === courseCode) {
        deployPlanProgress.value = {
          phase: data.phase as 'existence' | 'duration',
          checked: data.checked,
          total: data.total,
          matched: data.matched || 0,
          mismatched: data.mismatched || 0,
          errors: data.errors || 0
        }
      }
    })

    // Audio deploy progress
    socket.on('audioDeploy:progress', (data: { courseCode: string; deployed: number; total: number }) => {
      if (data.courseCode === courseCode) {
        deployProgress.value = { deployed: data.deployed, total: data.total }
      }
    })

    // Audio deploy verification progress (post-deploy duration check)
    socket.on('audioDeploy:verifyProgress', (data: {
      courseCode: string
      checked: number
      total: number
      matched: number
      mismatched: number
      errors: number
    }) => {
      if (data.courseCode === courseCode) {
        deployProgress.value = {
          ...deployProgress.value,
          verifying: true,
          verifyChecked: data.checked,
          verifyTotal: data.total,
          verifyMatched: data.matched,
          verifyMismatched: data.mismatched,
          verifyErrors: data.errors
        }
      }
    })

    socket.on('audioDeploy:completed', (data: {
      courseCode: string
      success?: boolean
      deployed: number
      failed: number
      verification?: any
      verificationPassed?: boolean
      message?: string
    }) => {
      if (data.courseCode === courseCode) {
        isDeploying.value = false
        deployProgress.value = { deployed: 0, total: 0 }
        handleDeployResult(data)
      }
    })

    socket.on('audioDeploy:error', (data: { courseCode: string; error: string }) => {
      if (data.courseCode === courseCode) {
        isDeploying.value = false
        deployProgress.value = { deployed: 0, total: 0 }
        error.value = `Deploy failed: ${data.error}`
      }
    })

    // Production verification progress (standalone, no deployment)
    socket.on('prodVerify:existenceProgress', (data: {
      courseCode: string
      phase: string
      checked: number
      total: number
    }) => {
      if (data.courseCode === courseCode) {
        deployProgress.value = {
          deployed: 0,
          total: data.total,
          verifying: true,
          verifyChecked: data.checked,
          verifyTotal: data.total,
          verifyPhase: 'existence'
        }
      }
    })

    socket.on('prodVerify:durationProgress', (data: {
      courseCode: string
      phase: string
      checked: number
      total: number
      matched: number
      mismatched: number
      errors: number
    }) => {
      if (data.courseCode === courseCode) {
        deployProgress.value = {
          deployed: 0,
          total: data.total,
          verifying: true,
          verifyChecked: data.checked,
          verifyTotal: data.total,
          verifyMatched: data.matched,
          verifyMismatched: data.mismatched,
          verifyErrors: data.errors,
          verifyPhase: 'duration'
        }
      }
    })

    socket.on('prodVerify:completed', (data: {
      courseCode: string
      total: number
      existing: number
      missing: number
      durationChecked: number
      durationMatched: number
      durationMismatched: number
      details: Array<{ uuid: string; issue: string; expected: number }>
    }) => {
      if (data.courseCode === courseCode) {
        deployProgress.value = { deployed: 0, total: 0 }
        // Save verification results to state
        state.value.deployVerification = data
      }
    })

    // ── Stage deploy (apidev ./check) events ──────────────────────────────
    socket.on('stageDeploy:started', (data: {
      jobId: string; courseCode: string; courseConfigsId: string
      startedAt: string; skipChecks: boolean; deleteProgress: boolean
    }) => {
      if (data.courseCode !== courseCode) return
      // Reset transient state but keep the new jobId
      resetStageDeployState()
      stageDeployStatus.value = 'running'
      stageDeployJobId.value = data.jobId
      stageDeployCourseConfigsId.value = data.courseConfigsId
      stageDeployStartedAt.value = data.startedAt
      stageDeployUsedSkipChecks.value = !!data.skipChecks
    })

    socket.on('stageDeploy:log', (data: { jobId: string; courseCode: string; stream: 'stdout' | 'stderr'; line: string }) => {
      if (data.courseCode !== courseCode) return
      // Soft cap so a runaway log doesn't blow up the renderer
      if (stageDeployLog.value.length > 5000) stageDeployLog.value.splice(0, 1000)
      stageDeployLog.value.push({ stream: data.stream, line: data.line })
    })

    socket.on('stageDeploy:newCourse', (data: { courseCode: string }) => {
      if (data.courseCode !== courseCode) return
      stageDeployIsNewCourse.value = true
    })

    socket.on('stageDeploy:checksPassed', (data: { courseCode: string }) => {
      if (data.courseCode !== courseCode) return
      stageDeploySawChecksPassed.value = true
    })

    socket.on('stageDeploy:identical', (data: { courseCode: string }) => {
      if (data.courseCode !== courseCode) return
      stageDeployStatus.value = 'identical'
    })

    socket.on('stageDeploy:deployed', (_data: { courseCode: string }) => {
      // No state change — log already captures "Copying ... bucket..."
    })

    socket.on('stageDeploy:done', (data: { courseCode: string }) => {
      if (data.courseCode !== courseCode) return
      // Don't downgrade an 'identical' status to 'success' — identical is more
      // informative for the UI (no-op deploy).
      if (stageDeployStatus.value !== 'identical') {
        stageDeployStatus.value = 'success'
      }
    })

    socket.on('stageDeploy:failed', (data: { courseCode: string }) => {
      if (data.courseCode !== courseCode) return
      stageDeployStatus.value = 'failed'
    })

    socket.on('stageDeploy:cancelled', (data: { courseCode: string }) => {
      if (data.courseCode !== courseCode) return
      stageDeployStatus.value = 'cancelled'
    })

    socket.on('stageDeploy:restartStarted', (data: { courseCode: string; timeoutSeconds?: number }) => {
      if (data.courseCode !== courseCode) return
      stageDeployRestartPhase.value = 'running'
      stageDeployRestartTimeoutSeconds.value = data.timeoutSeconds ?? null
    })

    socket.on('stageDeploy:restartSucceeded', (data: { courseCode: string }) => {
      if (data.courseCode !== courseCode) return
      stageDeployRestartPhase.value = 'succeeded'
    })

    socket.on('stageDeploy:restartFailed', (data: { courseCode: string; reason?: string }) => {
      if (data.courseCode !== courseCode) return
      stageDeployRestartPhase.value = 'failed'
      stageDeployRestartFailureReason.value = data.reason || null
      // Restart failure also fails the overall deploy run
      stageDeployStatus.value = 'failed'
    })

    socket.on('stageDeploy:closed', (data: {
      jobId: string; courseCode: string; exitCode: number | null; signal: string | null
      finalState: StageDeployStatus; sawChecksPassed: boolean; sawNewCourse: boolean
    }) => {
      if (data.courseCode !== courseCode) return
      stageDeployExitCode.value = data.exitCode
      stageDeployEndedAt.value = new Date().toISOString()
      // Final state sync if no explicit done/failed/identical was seen
      if (stageDeployStatus.value === 'running') {
        stageDeployStatus.value = data.finalState
      }
    })
  }

  function disconnectWebSocket() {
    if (socket) {
      socket.emit('unsubscribe', courseCode)
      socket.disconnect()
      socket = null
      socketConnected = false
    }
  }

  // Load state from Supabase
  async function loadState() {
    isLoading.value = true
    error.value = null

    // Connect WebSocket early so it's ready for progress updates
    connectWebSocket()

    try {
      const data = await fetchApi(`/api/production/${courseCode}/export-state`)
      state.value = {
        courseCode,
        manifestGenerated: data.manifestGenerated || false,
        manifestGeneratedAt: data.manifestGeneratedAt || null,
        s3Verified: data.s3Verified || false,
        s3VerifiedAt: data.s3VerifiedAt || null,
        manifestPublished: data.manifestPublished || false,
        manifestPublishedAt: data.manifestPublishedAt || null,
        audioDeployed: data.audioDeployed || false,
        audioDeployedAt: data.audioDeployedAt || null,
        manifestVersion: data.manifestVersion || null,
        manifestStatus: data.manifestStatus || null,
        s3Verification: data.s3Verification || null,
        publishCourseConfigsPath: data.publishCourseConfigsPath || null,
        publishApidevFilename: data.publishApidevFilename || null,
        deployPlan: data.deployPlan || null,
        deployExecutedAt: data.deployExecutedAt || null,
        deployVerification: data.deployVerification || null,
        updatedAt: data.updatedAt || null,
        pendingManifestPath: data.pendingManifestPath || null,
        generatedOnMachine: data.generatedOnMachine || null
      }
    } catch (err: any) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  // Step 1: Generate manifest
  async function generateManifest(withAudio = false, useAsIs = false) {
    isLoading.value = true
    error.value = null

    try {
      const machineName = getMachineName()

      // Changed to POST to send machineName in body
      // Use 20-minute timeout for manifest generation (can take time with audio)
      const data = await fetchApi(
        `/api/production/${courseCode}/export-legacy-with-state`,
        {
          method: 'POST',
          body: JSON.stringify({ withAudio, useAsIs, machineName })
        },
        1200000 // 20 minutes
      )

      manifest.value = data.manifest
      stats.value = data.stats
      validation.value = data.validation
      warnings.value = data.warnings || []

      // Update local state including pending manifest info
      state.value.manifestGenerated = true
      state.value.manifestGeneratedAt = new Date().toISOString()
      state.value.pendingManifestPath = data.pendingPath || null
      state.value.generatedOnMachine = data.generatedOnMachine || machineName

      // Track audio generation job if started
      if (data.audioJobId) {
        audioJobId.value = data.audioJobId
        audioGenerationProgress.value.status = 'running'
        console.log('[ExportWorkflow] Audio job started:', audioJobId.value)
        connectWebSocket() // Connect to listen for progress events
      } else {
        console.log('[ExportWorkflow] No audioJobId in response, withAudio may be false')
      }

      return data
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get cached manifest for re-download
  async function getCachedManifest() {
    try {
      const data = await fetchApi(`/api/production/${courseCode}/export-state/manifest`)
      return data
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // Step 2: Verify S3 audio
  async function verifyS3() {
    isLoading.value = true
    error.value = null
    s3VerifyProgress.value = { checked: 0, total: 0 }
    let alreadyRunning = false

    try {
      connectWebSocket()

      // Use 20-minute timeout for verify-s3 (large courses need more time)
      const apiBase = getApiBaseUrl()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1200000) // 20 minutes

      const response = await fetch(`${apiBase}/api/production/${courseCode}/verify-s3`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ fixDurations: true })
      })

      clearTimeout(timeoutId)

      // Handle 409 gracefully - verification already running, just continue listening
      if (response.status === 409) {
        const data = await response.json()
        console.log(`[ExportWorkflow] Verification already in progress (${data.elapsedSeconds}s elapsed)`)
        // Keep loading state, WebSocket will still receive updates from the running job
        alreadyRunning = true
        return null
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errorData.error || 'Request failed')
      }

      const data = await response.json()

      // Update local state from HTTP response (Stage 1-2 results)
      // If there are duration mismatches, auto-fix runs in background
      // and s3Verify:completed will refresh the final state
      const hasMismatches = (data.durationMismatched || 0) > 0
      if (!hasMismatches) {
        state.value.s3Verified = data.missing === 0
        state.value.s3VerifiedAt = new Date().toISOString()
        state.value.s3Verification = data
      }
      // else: keep loading, wait for s3Verify:completed after auto-fix

      // If auto-fix is running in background, keep loading state
      // s3Verify:completed will handle cleanup
      if (!hasMismatches) {
        isLoading.value = false
        s3VerifyProgress.value = { checked: 0, total: 0 }
      }

      return data
    } catch (err: any) {
      if (err.name === 'AbortError') {
        error.value = 'Request timeout after 1200s'
      } else {
        error.value = err.message
      }
      isLoading.value = false
      s3VerifyProgress.value = { checked: 0, total: 0 }
      throw err
    }
  }

  async function cancelVerifyS3() {
    try {
      const apiBase = getApiBaseUrl()
      await fetch(`${apiBase}/api/production/${courseCode}/verify-s3`, {
        method: 'DELETE',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
    } catch (err) {
      console.warn('[ExportWorkflow] Cancel verify failed:', err)
    } finally {
      isLoading.value = false
      s3VerifyProgress.value = { checked: 0, total: 0 }
    }
  }

  // Get version suggestion for Step 3
  async function getVersionSuggestion() {
    try {
      const data = await fetchApi(`/api/production/${courseCode}/publish-manifest/version`)
      versionInfo.value = data
      return data
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // Get manifest diff for Step 3 (compare pending vs published)
  async function getManifestDiff() {
    try {
      const data = await fetchApi(`/api/production/${courseCode}/manifest-diff`)
      manifestDiff.value = data
      // If diff provides a suggested version, update versionInfo
      if (data.suggestedVersion && versionInfo.value) {
        versionInfo.value.suggestedVersion = data.suggestedVersion
      }
      return data
    } catch (err: any) {
      // Non-critical — don't block Step 3 if diff fails
      console.warn('Failed to load manifest diff:', err.message)
      manifestDiff.value = null
      return null
    }
  }

  // Step 3: Publish manifest
  async function publishManifest(options: {
    version?: string
    status?: 'alpha' | 'beta' | 'published'
    commitToCourseConfigs?: boolean
    scpToApidev?: boolean
  } = {}) {
    isLoading.value = true
    error.value = null

    try {
      const data = await fetchApi(`/api/production/${courseCode}/publish-manifest`, {
        method: 'POST',
        body: JSON.stringify({
          version: options.version,
          status: options.status || 'published',
          commitToCourseConfigs: options.commitToCourseConfigs ?? true,
          scpToApidev: options.scpToApidev ?? true
        })
      })

      if (data.success) {
        state.value.manifestPublished = true
        state.value.manifestPublishedAt = new Date().toISOString()
        state.value.manifestVersion = data.version
        state.value.manifestStatus = options.status || 'published'
        state.value.publishCourseConfigsPath = data.courseConfigs?.filePath
        state.value.publishApidevFilename = data.apidev?.filename
      } else {
        // Handle partial success (course-configs worked but SCP failed)
        if (data.courseConfigs?.written) {
          state.value.manifestPublished = true
          state.value.manifestPublishedAt = new Date().toISOString()
          state.value.manifestVersion = data.version
          state.value.manifestStatus = options.status || 'published'
          state.value.publishCourseConfigsPath = data.courseConfigs?.filePath
          // Set error to notify user about SCP failure
          error.value = data.error || 'Publish partially failed'
        } else {
          // Complete failure
          error.value = data.error || 'Publish failed'
        }
      }

      return data
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Download pending manifest for review
  async function downloadPendingManifest() {
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/api/production/${courseCode}/pending-manifest`)
      if (!response.ok) {
        // The server names the machine the manifest was generated on when it is not on
        // this box — swallowing that into a generic message is what wastes the afternoon.
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to fetch pending manifest')
      }

      const manifest = await response.json()

      // Create blob and trigger download
      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${courseCode}_pending_manifest.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // Step 4: Get deploy plan with duration checking
  async function getDeployPlan() {
    isLoading.value = true
    error.value = null

    // Clear existing plan and reset progress
    state.value.deployPlan = null
    deployPlanProgress.value = {
      phase: 'existence',
      checked: 0,
      total: 0,
      matched: 0,
      mismatched: 0,
      errors: 0
    }

    try {
      connectWebSocket()

      // Set up WebSocket listener BEFORE making the HTTP request to avoid race condition
      const planPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket?.off('deployPlan:completed', onCompleted)
          socket?.off('deployPlan:error', onError)
          reject(new Error('Deploy plan timed out after 20 minutes'))
        }, 1200000)

        const onCompleted = (data: { courseCode: string; plan: any }) => {
          if (data.courseCode === courseCode) {
            clearTimeout(timeout)
            socket?.off('deployPlan:completed', onCompleted)
            socket?.off('deployPlan:error', onError)
            resolve(data.plan)
          }
        }
        const onError = (data: { courseCode: string; error: string }) => {
          if (data.courseCode === courseCode) {
            clearTimeout(timeout)
            socket?.off('deployPlan:completed', onCompleted)
            socket?.off('deployPlan:error', onError)
            reject(new Error(data.error))
          }
        }
        socket?.on('deployPlan:completed', onCompleted)
        socket?.on('deployPlan:error', onError)
      })

      // Now trigger the backend — response is immediate
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/api/production/${courseCode}/deploy-audio/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      })

      if (response.status === 409) {
        console.log('[ExportWorkflow] Deploy plan already in progress, waiting for result')
      } else if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errorData.error || 'Request failed')
      }

      // Wait for result via WebSocket
      const plan = await planPromise

      state.value.deployPlan = plan
      return plan
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
      deployPlanProgress.value = {
        phase: 'idle',
        checked: 0,
        total: 0,
        matched: 0,
        mismatched: 0,
        errors: 0
      }
    }
  }

  // Check if a deploy is running (lightweight status poll)
  async function checkDeployStatus() {
    try {
      const data = await fetchApi(`/api/production/${courseCode}/deploy-audio/status`)
      if (data.running) {
        isDeploying.value = true
        const progress = data.progress || {}
        if (progress.phase === 'deploying' && progress.deployed !== undefined) {
          deployProgress.value = { deployed: progress.deployed, total: progress.total || 0 }
        } else if (progress.phase === 'verifying' || progress.phase === 'verifying-durations') {
          deployProgress.value = {
            ...deployProgress.value,
            deployed: deployProgress.value.deployed || progress.deployed || 0,
            total: progress.total || 0,
            verifying: true,
            verifyChecked: progress.verified || 0,
            verifyTotal: progress.total || 0
          } as any
        }
      } else {
        // Only clear isDeploying if we explicitly know no deploy is running
        // (don't clear if this is just a startup check and isDeploying was never set)
        if (isDeploying.value) {
          isDeploying.value = false
        }
      }
      return data
    } catch {
      return { running: false }
    }
  }

  // Shared handler for deploy results (used by all three deploy functions and WebSocket completed event)
  function handleDeployResult(data: any) {
    // Only mark as deployed if backend verification passed
    state.value.audioDeployed = data.verificationPassed ?? false
    state.value.audioDeployedAt = data.verificationPassed ? new Date().toISOString() : null
    state.value.deployExecutedAt = new Date().toISOString()

    // Store real verification results from backend
    if (data.verification) {
      state.value.deployVerification = {
        checked: data.verification.durationChecked || 0,
        matched: data.verification.durationMatched || 0,
        mismatched: data.verification.durationMismatched || 0,
        errors: data.verification.durationErrors || 0,
        details: data.verification.details || [],
        message: data.message
      }
    }

    // Surface errors clearly
    if (!data.verificationPassed) {
      const parts: string[] = []
      if (data.failed > 0) parts.push(`${data.failed} copy failures`)
      if (data.verification?.missing > 0) parts.push(`${data.verification.missing} missing from production`)
      if (data.verification?.durationMismatched > 0) parts.push(`${data.verification.durationMismatched} duration mismatches`)
      if (data.verification?.durationErrors > 0) parts.push(`${data.verification.durationErrors} verification errors`)
      error.value = `Deploy incomplete: ${parts.join(', ')}`
    }
  }

  // Step 4: Deploy audio to production (non-blocking — returns immediately, progress via WebSocket)
  async function deployAudio(confirmation?: string) {
    error.value = null
    deployProgress.value = { deployed: 0, total: 0 }
    deployPlanProgress.value = { phase: 'idle', checked: 0, total: 0, matched: 0, mismatched: 0, errors: 0 }

    try {
      connectWebSocket()

      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/api/production/${courseCode}/deploy-audio/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ confirmOverwrite: !!confirmation, confirmation })
      })

      if (response.status === 409) {
        // Deploy already running — pick it up instead of showing error
        isDeploying.value = true
        await checkDeployStatus()
        return null
      }
      if (response.status === 202) {
        // Accepted — deploy running in background, progress via WebSocket
        isDeploying.value = true
        return { accepted: true }
      }
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errData.error || 'Request failed')
      }

      // Fallback: synchronous response (e.g. empty deploy)
      const data = await response.json()
      handleDeployResult(data)
      return data
    } catch (err: any) {
      error.value = err.message
      return null
    }
  }

  // Verify production durations without deploying
  async function verifyProductionDurations() {
    isLoading.value = true
    error.value = null
    deployProgress.value = { deployed: 0, total: 0 }

    try {
      connectWebSocket()

      // Use 20-minute timeout for production verification (large courses need time)
      const data = await fetchApi(`/api/production/${courseCode}/verify-production-durations`, {
        method: 'POST'
      }, 1200000) // 20 minutes

      // Save verification results to state
      state.value.deployVerification = data

      return data
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
      deployProgress.value = { deployed: 0, total: 0 }
    }
  }

  // Deploy only missing files (non-blocking — returns immediately)
  async function deployMissingOnly() {
    error.value = null
    deployProgress.value = { deployed: 0, total: 0 }

    try {
      connectWebSocket()

      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/api/production/${courseCode}/deploy-audio/missing-only`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
      })

      if (response.status === 409) {
        isDeploying.value = true
        await checkDeployStatus()
        return null
      }
      if (response.status === 202) {
        isDeploying.value = true
        return { accepted: true }
      }
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errData.error || 'Request failed')
      }

      // Fallback: synchronous response (e.g. nothing to deploy)
      const data = await response.json()
      handleDeployResult(data)
      return data
    } catch (err: any) {
      error.value = err.message
      return null
    }
  }

  // Deploy only new files from plan (non-blocking — returns immediately)
  async function deployNewOnly() {
    error.value = null
    deployProgress.value = { deployed: 0, total: 0 }
    deployPlanProgress.value = { phase: 'idle', checked: 0, total: 0, matched: 0, mismatched: 0, errors: 0 }

    const plan = state.value.deployPlan
    if (!plan) {
      error.value = 'No deploy plan available. Check production status first.'
      return null
    }

    const newUuids = plan.newUuids || []
    if (newUuids.length === 0) {
      error.value = 'No new files to deploy.'
      return null
    }

    try {
      connectWebSocket()

      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/api/production/${courseCode}/deploy-audio/new-only`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ newUuids })
      })

      if (response.status === 409) {
        isDeploying.value = true
        await checkDeployStatus()
        return null
      }
      if (response.status === 202) {
        isDeploying.value = true
        return { accepted: true }
      }
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errData.error || 'Request failed')
      }

      // Fallback: synchronous response (e.g. empty deploy)
      const data = await response.json()
      handleDeployResult(data)
      return data
    } catch (err: any) {
      error.value = err.message
      return null
    }
  }

  // Deploy new files + mismatched overwrites (non-blocking — returns immediately)
  async function deployNewAndMismatched() {
    error.value = null
    deployProgress.value = { deployed: 0, total: 0 }
    deployPlanProgress.value = { phase: 'idle', checked: 0, total: 0, matched: 0, mismatched: 0, errors: 0 }

    const plan = state.value.deployPlan
    if (!plan) {
      error.value = 'No deploy plan available. Check production status first.'
      return null
    }

    const newUuids = plan.newUuids || []
    const mismatchedUuids = (plan.overwriteDurations?.mismatchDetails || []).map((d: any) => d.uuid)

    try {
      connectWebSocket()

      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/api/production/${courseCode}/deploy-audio/new-and-mismatched`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ newUuids, mismatchedUuids })
      })

      if (response.status === 409) {
        isDeploying.value = true
        await checkDeployStatus()
        return null
      }
      if (response.status === 202) {
        isDeploying.value = true
        return { accepted: true }
      }
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errData.error || 'Request failed')
      }

      // Fallback: synchronous response (e.g. empty deploy)
      const data = await response.json()
      handleDeployResult(data)
      return data
    } catch (err: any) {
      error.value = err.message
      return null
    }
  }

  // Reset workflow state
  async function resetState() {
    isLoading.value = true
    error.value = null

    try {
      await fetchApi(`/api/production/${courseCode}/export-state`, {
        method: 'DELETE'
      })

      // Reset local state
      state.value = {
        courseCode,
        manifestGenerated: false,
        manifestGeneratedAt: null,
        s3Verified: false,
        s3VerifiedAt: null,
        manifestPublished: false,
        manifestPublishedAt: null,
        audioDeployed: false,
        audioDeployedAt: null,
        manifestVersion: null,
        manifestStatus: null,
        s3Verification: null,
        publishCourseConfigsPath: null,
        publishApidevFilename: null,
        deployPlan: null,
        deployExecutedAt: null,
        deployVerification: null,
        updatedAt: null,
        pendingManifestPath: null,
        generatedOnMachine: null
      }

      manifest.value = null
      stats.value = null
      validation.value = null
      versionInfo.value = null
      manifestDiff.value = null

      // Reset audio progress so old WebSocket events are ignored
      audioJobId.value = ''
      audioGenerationProgress.value = {
        completed: 0, total: 0, status: 'none',
        errors: [], skipped: []
      }
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Format date for display
  function formatDate(dateString: string | null): string {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Cleanup on unmount
  function cleanup() {
    disconnectWebSocket()
  }

  // Get socket instance for external use (e.g., auto-transition)
  function getSocket() {
    return socket
  }

  // Register a callback fired when legacyAudio:completed arrives for our own
  // audioJobId. Use this for Step 1 → Step 2 auto-advance. Safe to call before
  // the socket exists — the composable invokes it from its own jobId-gated
  // socket listener inside connectWebSocket().
  function onLegacyAudioCompleted(fn: (data: any) => void) {
    legacyAudioCompletedHandler = fn
  }

  // ── Stage deploy actions ────────────────────────────────────────────────
  async function deployStage(options: { deleteProgress: boolean; skipChecks?: boolean }) {
    // Make sure the websocket is up so we don't miss the started event
    connectWebSocket()
    resetStageDeployState()
    stageDeployStatus.value = 'running'
    stageDeployUsedSkipChecks.value = !!options.skipChecks
    try {
      const data = await fetchApi(`/api/production/${courseCode}/stage-deploy`, {
        method: 'POST',
        body: JSON.stringify({
          deleteProgress: !!options.deleteProgress,
          skipChecks: !!options.skipChecks
        })
      })
      stageDeployJobId.value = data.jobId
      stageDeployCourseConfigsId.value = data.courseConfigsId
      stageDeployStartedAt.value = data.startedAt
      return data
    } catch (err: any) {
      stageDeployStatus.value = 'failed'
      error.value = err.message
      throw err
    }
  }

  async function cancelStageDeploy() {
    try {
      await fetchApi(`/api/production/${courseCode}/stage-deploy/cancel`, { method: 'POST' })
    } catch (err: any) {
      error.value = err.message
    }
  }

  // Triggers ~/api/stage/restart.sh on apidev. Independent of deploy — meant
  // to be invoked by a button after a successful deploy (or as recovery).
  // Resets only restart-specific state so the deploy summary stays visible.
  async function restartStage() {
    connectWebSocket()
    stageDeployRestartPhase.value = 'running'
    stageDeployRestartFailureReason.value = null
    stageDeployRestartTimeoutSeconds.value = null
    try {
      const data = await fetchApi(`/api/production/${courseCode}/stage-restart`, {
        method: 'POST',
        body: JSON.stringify({})
      })
      return data
    } catch (err: any) {
      stageDeployRestartPhase.value = 'failed'
      stageDeployRestartFailureReason.value = err.message
      error.value = err.message
      throw err
    }
  }

  async function cancelStageRestart() {
    try {
      await fetchApi(`/api/production/${courseCode}/stage-restart/cancel`, { method: 'POST' })
    } catch (err: any) {
      error.value = err.message
    }
  }

  // Reset the panel back to ready (after user reviews a finished run)
  function clearStageDeploy() {
    resetStageDeployState()
  }

  async function fetchStageDeployStatus() {
    try {
      const data = await fetchApi(`/api/production/${courseCode}/stage-deploy/status`)
      if (data?.active) {
        stageDeployStatus.value = data.state === 'cancelled' ? 'cancelled' : 'running'
        stageDeployJobId.value = data.jobId
        stageDeployCourseConfigsId.value = data.courseConfigsId
        stageDeployStartedAt.value = data.startedAt
        stageDeploySawChecksPassed.value = !!data.sawChecksPassed
        stageDeployIsNewCourse.value = !!data.sawNewCourse
        stageDeployUsedSkipChecks.value = !!data.skipChecks
        if (data.restartPhase) stageDeployRestartPhase.value = data.restartPhase as RestartPhase
      }
      return data
    } catch {
      return null
    }
  }

  return {
    // State
    state,
    isLoading,
    error,
    manifest,
    stats,
    validation,
    warnings,
    versionInfo,
    manifestDiff,

    // Progress
    audioGenerationProgress,
    audioJobId,
    s3VerifyProgress,
    deployProgress,
    isDeploying,
    deployPlanProgress,

    // Stage deploy (apidev ./check + restart.sh)
    stageDeployStatus,
    stageDeployJobId,
    stageDeployStartedAt,
    stageDeployEndedAt,
    stageDeployLog,
    stageDeployIsNewCourse,
    stageDeploySawChecksPassed,
    stageDeployExitCode,
    stageDeployUsedSkipChecks,
    stageDeployCourseConfigsId,
    stageDeployRestartPhase,
    stageDeployRestartFailureReason,
    stageDeployRestartTimeoutSeconds,

    // Computed
    currentStep,
    completedSteps,

    // Actions
    loadState,
    generateManifest,
    getCachedManifest,
    verifyS3,
    cancelVerifyS3,
    getVersionSuggestion,
    getManifestDiff,
    publishManifest,
    downloadPendingManifest,
    getDeployPlan,
    deployAudio,
    verifyProductionDurations,
    deployMissingOnly,
    deployNewOnly,
    deployNewAndMismatched,
    checkDeployStatus,
    resetState,
    deployStage,
    cancelStageDeploy,
    restartStage,
    cancelStageRestart,
    clearStageDeploy,
    fetchStageDeployStatus,
    cleanup,

    // Utilities
    formatDate,
    getSocket,
    onLegacyAudioCompleted
  }
}
