// src/composables/useExportWorkflow.ts
import { ref, computed, watch } from 'vue'
import { io, Socket } from 'socket.io-client'

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
}

export interface DeployPlan {
  total: number
  newFiles: number
  overwrites: number
  overwriteUuids: string[]
  newUuids: string[]
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
  const storedUrl = localStorage.getItem('api_base_url')
  if (storedUrl) return storedUrl

  const isVercel = typeof window !== 'undefined' && (
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname === 'popty.app' ||
    window.location.hostname.endsWith('.popty.app')
  )
  if (isVercel) return ''

  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
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
  const versionInfo = ref<VersionInfo | null>(null)

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

  // WebSocket for real-time updates
  let socket: Socket | null = null

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
  async function fetchApi(endpoint: string, options: RequestInit = {}) {
    const apiBase = getApiBaseUrl()
    const response = await fetch(`${apiBase}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(errorData.error || 'Request failed')
    }

    return response.json()
  }

  // Connect WebSocket for real-time progress updates
  function connectWebSocket() {
    const apiBase = getApiBaseUrl()
    const wsUrl = apiBase || window.location.origin

    socket = io(wsUrl, {
      path: '/api/orchestrator/websocket',
      transports: ['websocket', 'polling']
    })

    socket.on('connect', () => {
      console.log('[ExportWorkflow] WebSocket connected to:', wsUrl)
      console.log('[ExportWorkflow] Socket ID:', socket?.id)

      // Subscribe to course-specific events
      socket.emit('subscribe', courseCode)
      console.log('[ExportWorkflow] Subscribed to course:', courseCode)
    })

    socket.on('connect_error', (error) => {
      console.error('[ExportWorkflow] WebSocket connection error:', error.message)
    })

    socket.on('disconnect', (reason) => {
      console.log('[ExportWorkflow] WebSocket disconnected:', reason)
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

    // S3 verification progress (existence check phase)
    socket.on('s3Verify:progress', (data: { courseCode: string; phase: string; checked: number; total: number }) => {
      if (data.courseCode === courseCode) {
        s3VerifyProgress.value = { phase: data.phase || 'existence', checked: data.checked, total: data.total }
      }
    })

    // S3 verification duration progress (duration check phase)
    socket.on('s3Verify:durationProgress', (data: {
      courseCode: string
      phase: 'duration'
      checked: number
      total: number
      matched: number
      mismatched: number
      errors: number
    }) => {
      if (data.courseCode === courseCode) {
        s3VerifyProgress.value = {
          phase: 'duration',
          checked: data.checked,
          total: data.total,
          matched: data.matched,
          mismatched: data.mismatched,
          errors: data.errors
        }
      }
    })

    // Auto-fix durations progress
    socket.on('s3Verify:fixingDurations', (data: {
      courseCode: string
      total: number
    }) => {
      if (data.courseCode === courseCode) {
        s3VerifyProgress.value = {
          phase: 'fixing',
          checked: 0,
          total: data.total
        }
      }
    })

    socket.on('s3Verify:fixProgress', (data: {
      courseCode: string
      checked: number
      total: number
      fixed: number
      errors: number
    }) => {
      if (data.courseCode === courseCode) {
        s3VerifyProgress.value = {
          phase: 'fixing',
          checked: data.checked,
          total: data.total,
          fixed: data.fixed,
          errors: data.errors
        }
      }
    })

    socket.on('s3Verify:completed', (data: { courseCode: string }) => {
      if (data.courseCode === courseCode) {
        s3VerifyProgress.value = { checked: 0, total: 0 }
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
      deployed: number
      failed: number
      verification?: {
        checked: number
        matched: number
        mismatched: number
        errors: number
        details: Array<{ uuid: string; issue: string; expected: number }>
      }
    }) => {
      if (data.courseCode === courseCode) {
        deployProgress.value = { deployed: 0, total: 0 }
        // Save verification results to state
        if (data.verification) {
          state.value.deployVerification = data.verification
        }
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
  }

  function disconnectWebSocket() {
    if (socket) {
      socket.emit('unsubscribe', courseCode)
      socket.disconnect()
      socket = null
    }
  }

  // Load state from Supabase
  async function loadState() {
    isLoading.value = true
    error.value = null

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
  async function generateManifest(withAudio = false) {
    isLoading.value = true
    error.value = null

    try {
      const machineName = getMachineName()

      // Changed to POST to send machineName in body
      const data = await fetchApi(
        `/api/production/${courseCode}/export-legacy-with-state`,
        {
          method: 'POST',
          body: JSON.stringify({ withAudio, machineName })
        }
      )

      manifest.value = data.manifest
      stats.value = data.stats
      validation.value = data.validation

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

    try {
      connectWebSocket()

      const data = await fetchApi(`/api/production/${courseCode}/verify-s3`, {
        method: 'POST',
        body: JSON.stringify({ fixDurations: true })
      })

      // Update local state
      state.value.s3Verified = data.missing === 0
      state.value.s3VerifiedAt = new Date().toISOString()
      state.value.s3Verification = data

      return data
    } catch (err: any) {
      error.value = err.message
      throw err
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

  // Step 3: Publish manifest
  async function publishManifest(options: {
    version?: string
    status?: 'alpha' | 'beta' | 'release'
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
          status: options.status || 'beta',
          commitToCourseConfigs: options.commitToCourseConfigs ?? true,
          scpToApidev: options.scpToApidev ?? true
        })
      })

      if (data.success) {
        state.value.manifestPublished = true
        state.value.manifestPublishedAt = new Date().toISOString()
        state.value.manifestVersion = data.version
        state.value.manifestStatus = options.status || 'beta'
        state.value.publishCourseConfigsPath = data.courseConfigs?.filePath
        state.value.publishApidevFilename = data.apidev?.filename
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
      const response = await fetch(`${API_BASE}/api/production/${courseCode}/pending-manifest`)
      if (!response.ok) {
        throw new Error('Failed to fetch pending manifest')
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

  // Step 4: Get deploy plan
  async function getDeployPlan() {
    isLoading.value = true
    error.value = null

    // Clear existing plan to show loading state
    state.value.deployPlan = null

    try {
      const data = await fetchApi(`/api/production/${courseCode}/deploy-audio/plan`, {
        method: 'POST'
      })

      state.value.deployPlan = data
      return data
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Step 4: Deploy audio to production
  async function deployAudio(confirmation?: string) {
    isLoading.value = true
    error.value = null
    deployProgress.value = { deployed: 0, total: 0 }

    try {
      connectWebSocket()

      const data = await fetchApi(`/api/production/${courseCode}/deploy-audio/execute`, {
        method: 'POST',
        body: JSON.stringify({
          confirmOverwrite: !!confirmation,
          confirmation
        })
      })

      if (data.success) {
        state.value.audioDeployed = true
        state.value.audioDeployedAt = new Date().toISOString()
        state.value.deployExecutedAt = new Date().toISOString()
      }

      return data
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
      deployProgress.value = { deployed: 0, total: 0 }
    }
  }

  // Verify production durations without deploying
  async function verifyProductionDurations() {
    isLoading.value = true
    error.value = null
    deployProgress.value = { deployed: 0, total: 0 }

    try {
      connectWebSocket()

      const data = await fetchApi(`/api/production/${courseCode}/verify-production-durations`, {
        method: 'POST'
      })

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

  // Deploy only missing files (no overwrites)
  async function deployMissingOnly() {
    isLoading.value = true
    error.value = null
    deployProgress.value = { deployed: 0, total: 0 }

    try {
      connectWebSocket()

      const data = await fetchApi(`/api/production/${courseCode}/deploy-audio/missing-only`, {
        method: 'POST'
      })

      if (data.success) {
        state.value.audioDeployed = true
        state.value.audioDeployedAt = new Date().toISOString()
        state.value.deployExecutedAt = new Date().toISOString()
      }

      return data
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
      deployProgress.value = { deployed: 0, total: 0 }
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

  return {
    // State
    state,
    isLoading,
    error,
    manifest,
    stats,
    validation,
    versionInfo,

    // Progress
    audioGenerationProgress,
    audioJobId,
    s3VerifyProgress,
    deployProgress,

    // Computed
    currentStep,
    completedSteps,

    // Actions
    loadState,
    generateManifest,
    getCachedManifest,
    verifyS3,
    getVersionSuggestion,
    publishManifest,
    downloadPendingManifest,
    getDeployPlan,
    deployAudio,
    verifyProductionDurations,
    deployMissingOnly,
    resetState,
    cleanup,

    // Utilities
    formatDate
  }
}
