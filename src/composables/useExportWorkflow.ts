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
  updatedAt: string | null
  // Local manifest storage tracking
  pendingManifestPath: string | null
  generatedOnMachine: string | null
}

export interface S3VerificationResult {
  total: number
  existing: number
  missing: number
  missingUuids: string[]
  durationFixes?: number
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
      path: '/api/production/websocket',
      transports: ['websocket', 'polling']
    })

    socket.on('connect', () => {
      console.log('[ExportWorkflow] WebSocket connected')
    })

    // S3 verification progress
    socket.on('s3Verify:progress', (data: { courseCode: string; checked: number; total: number }) => {
      if (data.courseCode === courseCode) {
        s3VerifyProgress.value = { checked: data.checked, total: data.total }
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

    socket.on('audioDeploy:completed', (data: { courseCode: string }) => {
      if (data.courseCode === courseCode) {
        deployProgress.value = { deployed: 0, total: 0 }
      }
    })
  }

  function disconnectWebSocket() {
    if (socket) {
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

  // Step 4: Get deploy plan
  async function getDeployPlan() {
    isLoading.value = true
    error.value = null

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
    getDeployPlan,
    deployAudio,
    resetState,
    cleanup,

    // Utilities
    formatDate
  }
}
