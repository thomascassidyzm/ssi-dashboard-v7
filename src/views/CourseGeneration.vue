<template>
  <div class="generate-page">
    <!-- Ambient Background -->
    <div class="ambient-bg">
      <div class="grid-overlay"></div>
      <div class="glow-orb glow-1"></div>
      <div class="glow-orb glow-2"></div>
    </div>

    <!-- Header -->
    <header class="page-header">
      <div class="header-inner">
        <router-link to="/" class="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>Back to Dashboard</span>
        </router-link>
        <div class="header-titles">
          <h1>Generate New Course</h1>
          <p>SSi Course Production Pipeline</p>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="page-main">
      <!-- Generation Form -->
      <div v-if="!isGenerating && !isCompleted" class="generation-flow">

        <!-- Language Selection Card -->
        <section class="flow-section">
          <div class="section-label">
            <span class="label-text">COURSE</span>
            <div class="label-line"></div>
          </div>

          <div class="lang-card">
            <!-- Pre-selected course: show simple display, no dropdowns -->
            <template v-if="isPreselected">
              <div class="preselected-course">
                <div class="preview-badge large">
                  <span class="badge-dot"></span>
                  <span>{{ courseCode }}</span>
                </div>
                <span class="preview-name large">{{ displayName }}</span>
              </div>
            </template>

            <!-- New course: show language selectors -->
            <template v-else>
              <div class="lang-grid">
                <!-- Known Language -->
                <div class="lang-field">
                  <label>Learning FROM</label>
                  <div class="select-wrapper">
                    <select v-model="knownLanguage" :disabled="languagesLoading">
                      <option value="" disabled>{{ languagesLoading ? 'Loading...' : 'Select language' }}</option>
                      <option v-for="lang in knownLanguages" :key="lang.code" :value="lang.code">
                        {{ lang.name }} ({{ lang.code }})
                      </option>
                    </select>
                    <svg class="select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </div>
                </div>

                <!-- Arrow -->
                <div class="lang-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>

                <!-- Target Language -->
                <div class="lang-field">
                  <label>Learning TO</label>
                  <div class="select-wrapper">
                    <select v-model="targetLanguage" :disabled="languagesLoading">
                      <option value="" disabled>{{ languagesLoading ? 'Loading...' : 'Select language' }}</option>
                      <option v-for="lang in targetLanguages" :key="lang.code" :value="lang.code">
                        {{ lang.name }} ({{ lang.code }})
                      </option>
                    </select>
                    <svg class="select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </div>
                </div>
              </div>

              <!-- Course Preview (when both selected) -->
              <div v-if="knownLanguage && targetLanguage" class="course-preview">
                <div class="preview-badge">
                  <span class="badge-dot"></span>
                  <span>{{ courseCode }}</span>
                </div>
                <span class="preview-name">{{ displayName }}</span>
              </div>
            </template>
          </div>
        </section>


        <!-- Course State Analysis (Intelligent Resume) -->
        <section v-if="knownLanguage && targetLanguage" class="flow-section">
          <div class="section-label">
            <span class="label-text">COURSE STATE</span>
            <div class="label-line"></div>
          </div>

          <div class="state-card">
            <!-- Loading state -->
            <div v-if="isAnalyzing" class="state-loading">
              <div class="spinner"></div>
              <span>Analyzing course state...</span>
            </div>

            <!-- No existing progress -->
            <div v-else-if="!hasExistingProgress" class="state-empty">
              <div class="state-icon">✨</div>
              <div class="state-text">
                <strong>New Course</strong>
                <p>No existing data found. Ready to generate from scratch.</p>
              </div>
            </div>

            <!-- Has existing progress -->
            <div v-else class="state-progress">
              <div class="state-header">
                <div class="state-icon">{{ courseState.partial ? '🔄' : '📊' }}</div>
                <div class="state-summary">
                  <strong>{{ courseState.partial ? 'Generation In Progress' : 'Existing Progress Found' }}</strong>
                  <p v-if="courseState.partial && courseState.phase1?.batchCount">
                    {{ courseState.seeds?.fromBatches || 0 }} seeds in {{ courseState.phase1.batchCount }} batches
                  </p>
                  <p v-else>{{ courseState.seeds?.total || 0 }} seeds processed</p>
                </div>
                <!-- Monitor link for partial state -->
                <router-link
                  v-if="courseState.partial"
                  :to="`/generate/${courseCode}/monitor`"
                  class="monitor-link"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                  Open Monitor
                </router-link>
              </div>

              <!-- Phase status grid -->
              <div class="phase-status-grid">
                <div :class="['phase-status', courseState.phase1?.status]">
                  <span class="phase-num">1</span>
                  <span class="phase-label">Translation</span>
                  <span class="phase-badge">{{ formatPhaseStatus(courseState.phase1?.status) }}</span>
                </div>
                <div :class="['phase-status', courseState.phase2?.status]">
                  <span class="phase-num">2</span>
                  <span class="phase-label">Conflicts</span>
                  <span class="phase-badge">{{ formatPhaseStatus(courseState.phase2?.status) }}</span>
                </div>
                <div :class="['phase-status', courseState.phase3?.status]">
                  <span class="phase-num">3</span>
                  <span class="phase-label">Baskets</span>
                  <span class="phase-badge">{{ formatPhaseStatus(courseState.phase3?.status) }}</span>
                </div>
              </div>

              <!-- Seeds completed (for partial progress) -->
              <div v-if="courseState.partial && courseState.phase1?.seedsCompleted?.length > 0" class="seeds-completed">
                <span class="seeds-label">Seeds completed:</span>
                <span class="seeds-list">{{ courseState.phase1.seedsCompleted.join(', ') }}</span>
              </div>

              <!-- Recommendations -->
              <div v-if="courseState.recommendations?.length > 0" class="recommendations">
                <div class="rec-header">Recommended Actions:</div>
                <button
                  v-for="(rec, idx) in courseState.recommendations.slice(0, 3)"
                  :key="idx"
                  :class="['rec-item', 'clickable']"
                  @click="handleRecommendation(rec)"
                >
                  <span class="rec-title">{{ rec.title }}</span>
                  <span class="rec-desc">{{ rec.description }}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Generation Mode Selection -->
        <section v-if="knownLanguage && targetLanguage" class="flow-section">
          <div class="section-label">
            <span class="label-text">GENERATION MODE</span>
            <div class="label-line"></div>
          </div>

          <div class="mode-selection-card">
            <div class="mode-options">
              <button
                v-for="mode in generationModes"
                :key="mode.id"
                @click="selectMode(mode)"
                :class="['mode-option', { active: selectedMode?.id === mode.id }]"
              >
                <div class="mode-header">
                  <span class="mode-icon">{{ mode.icon }}</span>
                  <span class="mode-name">{{ mode.name }}</span>
                </div>
                <div class="mode-details">
                  <p class="mode-description">{{ mode.description }}</p>
                  <div class="mode-specs">
                    <div class="spec-row">
                      <span class="spec-label">Seeds:</span>
                      <span class="spec-value">{{ mode.seedCount }}</span>
                    </div>
                    <div class="spec-row pattern-row">
                      <span class="pattern-numbers">{{ mode.patternNums }}</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
            <div class="pattern-key">
              <span class="key-label">Pattern:</span>
              <span class="key-item">browsers</span>
              <span class="key-sep">×</span>
              <span class="key-item">agents</span>
              <span class="key-sep">×</span>
              <span class="key-item">seeds each</span>
            </div>
          </div>
        </section>

        <!-- Action Buttons -->
        <section class="flow-section actions">
          <button
            @click="startGeneration"
            :disabled="!canStart || isGenerating"
            class="btn-primary"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
            <span>Start Generation</span>
          </button>
        </section>
      </div>

      <!-- Progress Panel -->
      <div v-if="isGenerating" class="progress-panel">
        <div class="progress-header">
          <h2>Generating {{ courseCode }}</h2>
          <span class="progress-badge">{{ currentPhase }}</span>
        </div>

        <div class="progress-phases">
          <div v-for="phase in phases" :key="phase.id" :class="['phase-item', phase.status]">
            <div class="phase-indicator">
              <span v-if="phase.status === 'complete'" class="phase-check">✓</span>
              <span v-else-if="phase.status === 'active'" class="phase-spinner"></span>
              <span v-else class="phase-number">{{ phase.id }}</span>
            </div>
            <div class="phase-info">
              <span class="phase-name">{{ phase.name }}</span>
              <span v-if="phase.status === 'active'" class="phase-detail">{{ phase.detail }}</span>
            </div>
          </div>
        </div>

        <div v-if="errorMessage" class="error-banner">
          <span>{{ errorMessage }}</span>
          <button @click="retryGeneration" class="btn-retry">Retry</button>
        </div>
      </div>

      <!-- Completion Panel -->
      <div v-if="isCompleted" class="completion-panel">
        <div class="completion-icon">✓</div>
        <h2>Course Generated Successfully</h2>
        <p>{{ courseCode }} is ready for production</p>
        <div class="completion-actions">
          <router-link :to="`/courses/${courseCode}`" class="btn-primary">
            Open Course Editor
          </router-link>
          <button @click="resetForm" class="btn-secondary">
            Generate Another
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { io } from 'socket.io-client'

const router = useRouter()
const route = useRoute()

// WebSocket connection for real-time progress
let socket = null

// Languages
const languagesLoading = ref(true)
const knownLanguages = ref([])
const targetLanguages = ref([])
const knownLanguage = ref('')
const targetLanguage = ref('')
const isPreselected = ref(false)  // True when loaded from URL params (e.g., from CourseEditor)

// Language name lookup (English names for production system)
const languageNames = {
  eng: 'English',
  spa: 'Spanish',
  fra: 'French',
  deu: 'German',
  ita: 'Italian',
  por: 'Portuguese',
  cmn: 'Mandarin Chinese',
  jpn: 'Japanese',
  kor: 'Korean',
  cym: 'Welsh',
  nld: 'Dutch',
  rus: 'Russian',
  ara: 'Arabic',
  hin: 'Hindi'
}

// Execution mode (simplified - server handles execution)
const executionMode = ref('server')

// Generation modes - LOADED FROM API (single source of truth: APML registry)
// See: apml/core/ssi-variable-registry.apml → CourseGenerationMode entity
const modesLoading = ref(true)
const generationModes = ref([])

// Mode icon mapping (UI concern, not in registry)
const modeIcons = {
  quick_test: '⚡',
  mvp_course: '🎯',
  full_course: '🚀'
}

const selectedMode = ref(null)
const selectedPhase = ref('all')  // 'all', 'phase1', 'phase2', 'phase3'

// Generation state
const isGenerating = ref(false)
const isCompleted = ref(false)
const currentPhase = ref('')
const errorMessage = ref('')
const phases = ref([
  { id: 1, name: 'Translation & LEGO Extraction', status: 'pending', detail: '' },
  { id: 2, name: 'Conflict Resolution', status: 'pending', detail: '' },
  { id: 3, name: 'Basket Generation', status: 'pending', detail: '' }
])

// Course state analysis (intelligent resume)
const courseState = ref(null)
const isAnalyzing = ref(false)
const hasExistingProgress = computed(() => courseState.value?.exists === true)

// Computed
const courseCode = computed(() => {
  if (!knownLanguage.value || !targetLanguage.value) return ''
  return `${targetLanguage.value}_for_${knownLanguage.value}`
})

const displayName = computed(() => {
  if (!knownLanguage.value || !targetLanguage.value) return ''
  // Use English names for production system clarity (APML principle)
  const knownName = languageNames[knownLanguage.value] || knownLanguage.value
  const targetName = languageNames[targetLanguage.value] || targetLanguage.value
  return `${targetName} for ${knownName} speakers`
})

const canStart = computed(() => {
  return knownLanguage.value && targetLanguage.value && selectedMode.value
})

// Load languages and modes on mount
onMounted(async () => {
  // Check URL params (pre-selected from CourseEditor or dashboard)
  if (route.query.target && route.query.known) {
    targetLanguage.value = route.query.target
    knownLanguage.value = route.query.known
    isPreselected.value = true  // Mark as pre-selected to hide dropdowns
  }

  // Load both in parallel
  await Promise.all([loadLanguages(), loadModes()])
})

// Clean up WebSocket on unmount
onUnmounted(() => {
  disconnectWebSocket()
})

// Load generation modes from API (single source of truth: APML registry)
async function loadModes() {
  modesLoading.value = true
  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
    const res = await fetch(`${apiBase}/api/modes`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (res.ok) {
      const data = await res.json()
      // Transform API response to UI format
      generationModes.value = (data.modes || []).map(mode => ({
        id: mode.id,
        name: mode.name,
        icon: modeIcons[mode.id] || '📦',
        description: mode.description,
        seedCount: mode.seeds,
        patternNums: formatPatternNums(mode.pattern)
      }))
    }
  } catch (err) {
    console.error('Failed to load modes:', err)
    // Fallback modes if API fails
    generationModes.value = [
      { id: 'quick_test', name: 'Quick Test', icon: '⚡', description: 'Fast validation with maximum parallelization', seedCount: 10, patternNums: '5 × 2 × 1' },
      { id: 'mvp_course', name: 'MVP Course', icon: '🎯', description: 'Big 10 language pairs - production MVP', seedCount: 250, patternNums: '5 × 5 × 10' },
      { id: 'full_course', name: 'Full Course', icon: '🚀', description: 'Complete legacy-scale course', seedCount: 668, patternNums: '9 × 5 × 15' }
    ]
  } finally {
    modesLoading.value = false
  }
}

// Format pattern to numbers only (e.g., {browsers: 5, agents: 2, seeds: 1} → "5 × 2 × 1")
function formatPatternNums(pattern) {
  if (typeof pattern === 'object' && pattern.browsers) {
    return `${pattern.browsers} × ${pattern.agents_per_browser} × ${pattern.seeds_per_agent}`
  }
  if (typeof pattern === 'string') {
    const parts = pattern.split('/')
    if (parts.length === 3) {
      return `${parts[0]} × ${parts[1]} × ${parts[2]}`
    }
    return pattern
  }
  return pattern
}

async function loadLanguages() {
  languagesLoading.value = true
  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
    const res = await fetch(`${apiBase}/api/languages`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (res.ok) {
      const data = await res.json()
      knownLanguages.value = data.languages || []
      targetLanguages.value = data.languages || []
    }
  } catch (err) {
    console.error('Failed to load languages:', err)
    // Fallback languages
    const fallback = [
      { code: 'eng', name: 'English', native: 'English' },
      { code: 'spa', name: 'Spanish', native: 'Español' },
      { code: 'fra', name: 'French', native: 'Français' },
      { code: 'deu', name: 'German', native: 'Deutsch' },
      { code: 'ita', name: 'Italian', native: 'Italiano' },
      { code: 'por', name: 'Portuguese', native: 'Português' },
      { code: 'cmn', name: 'Mandarin Chinese', native: '普通话' },
      { code: 'jpn', name: 'Japanese', native: '日本語' },
      { code: 'kor', name: 'Korean', native: '한국어' }
    ]
    knownLanguages.value = fallback
    targetLanguages.value = fallback
  } finally {
    languagesLoading.value = false
  }
}

function selectMode(mode) {
  selectedMode.value = mode
}

// Watch courseCode and analyze when it changes
watch(courseCode, async (newCode) => {
  if (newCode) {
    await analyzeCourseState(newCode)
  } else {
    courseState.value = null
  }
})

/**
 * Analyze existing course state for intelligent resume
 */
async function analyzeCourseState(code) {
  isAnalyzing.value = true
  courseState.value = null

  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
    const res = await fetch(`${apiBase}/api/courses/${code}/analyze`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    if (res.ok) {
      courseState.value = await res.json()
      console.log('[CourseGen] Course state:', courseState.value)
    }
  } catch (err) {
    console.error('[CourseGen] Failed to analyze course:', err)
    courseState.value = null
  } finally {
    isAnalyzing.value = false
  }
}

async function startGeneration() {
  if (!canStart.value) return

  isGenerating.value = true
  errorMessage.value = ''
  currentPhase.value = 'Phase 1'
  phases.value[0].status = 'active'

  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'

    // Start generation with mode parameter
    const res = await fetch(`${apiBase}/api/courses/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        courseCode: courseCode.value,
        target: targetLanguage.value,
        known: knownLanguage.value,
        mode: selectedMode.value.id,
        phaseSelection: selectedPhase.value  // 'all', 'phase1', 'phase3', etc.
      })
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Generation failed')
    }

    // Connect to WebSocket for real-time progress
    connectWebSocket()

  } catch (err) {
    errorMessage.value = err.message
    isGenerating.value = false
    disconnectWebSocket()
  }
}

/**
 * Connect to WebSocket for real-time progress updates
 */
function connectWebSocket() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'

  // Create Socket.IO connection
  socket = io(apiBase, {
    path: '/api/orchestrator/websocket',
    transports: ['websocket', 'polling']
  })

  socket.on('connect', () => {
    console.log('[WebSocket] Connected:', socket.id)
    // Subscribe to this course's progress
    socket.emit('subscribe', courseCode.value)
  })

  socket.on('progress', (progress) => {
    console.log('[WebSocket] Progress update:', progress)
    handleProgressUpdate(progress)
  })

  socket.on('disconnect', () => {
    console.log('[WebSocket] Disconnected')
  })

  socket.on('connect_error', (err) => {
    console.error('[WebSocket] Connection error:', err.message)
    // Fall back to polling if WebSocket fails
    fallbackToPollStatus()
  })
}

/**
 * Handle progress update from WebSocket or polling
 */
function handleProgressUpdate(progress) {
  // Update phase statuses from progress data
  const phaseData = progress.phases || {}

  // Phase 1: Translation + LEGO Extraction
  const p1Status = phaseData['1_translation']?.status || phaseData['1']?.status
  if (p1Status === 'complete' || p1Status === 'completed') {
    phases.value[0].status = 'complete'
    phases.value[0].detail = 'Seeds translated, LEGOs extracted'
  } else if (p1Status === 'running') {
    phases.value[0].status = 'active'
    phases.value[0].detail = progress.recentLogs?.[0]?.message || 'Processing...'
  }

  // Phase 2: Conflict Resolution
  const p2Status = phaseData['2']?.status
  if (p2Status === 'complete' || p2Status === 'completed') {
    phases.value[1].status = 'complete'
    phases.value[1].detail = 'Conflicts resolved'
  } else if (p2Status === 'running') {
    phases.value[1].status = 'active'
    currentPhase.value = 'Phase 2'
  }

  // Phase 3: Basket Generation
  const p3Status = phaseData['3']?.status
  if (p3Status === 'complete' || p3Status === 'completed') {
    phases.value[2].status = 'complete'
    phases.value[2].detail = 'Baskets generated'
    isGenerating.value = false
    isCompleted.value = true
    disconnectWebSocket()
  } else if (p3Status === 'running') {
    phases.value[2].status = 'active'
    currentPhase.value = 'Phase 3'
  }

  // Update current phase from progress
  if (progress.currentPhase) {
    if (progress.currentPhase.includes('1')) currentPhase.value = 'Phase 1'
    else if (progress.currentPhase === '2') currentPhase.value = 'Phase 2'
    else if (progress.currentPhase === '3') currentPhase.value = 'Phase 3'
  }

  // Check for overall completion or error
  if (progress.overallStatus === 'complete' || progress.overallStatus === 'completed') {
    isGenerating.value = false
    isCompleted.value = true
    disconnectWebSocket()
  }

  if (progress.error) {
    errorMessage.value = progress.error
    isGenerating.value = false
    disconnectWebSocket()
  }
}

/**
 * Fallback to polling if WebSocket fails
 */
async function fallbackToPollStatus() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
  console.log('[Progress] Falling back to polling...')

  while (isGenerating.value) {
    try {
      const res = await fetch(`${apiBase}/api/courses/${courseCode.value}/progress`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })

      if (res.ok) {
        const progress = await res.json()
        handleProgressUpdate(progress)
      }
    } catch (err) {
      console.error('[Progress] Poll error:', err.message)
    }

    await new Promise(r => setTimeout(r, 2000))
  }
}

/**
 * Disconnect WebSocket cleanly
 */
function disconnectWebSocket() {
  if (socket) {
    socket.emit('unsubscribe', courseCode.value)
    socket.disconnect()
    socket = null
  }
}

function retryGeneration() {
  errorMessage.value = ''
  startGeneration()
}

function resetForm() {
  isGenerating.value = false
  isCompleted.value = false
  selectedMode.value = null
  phases.value.forEach(p => p.status = 'pending')
}

/**
 * Format phase status for display
 */
function formatPhaseStatus(status) {
  const statusMap = {
    'in_progress': 'running',
    'complete': 'complete',
    'pending': 'pending',
    'missing': 'missing',
    'flagged': 'flagged'
  }
  return statusMap[status] || status
}

/**
 * Handle recommendation click
 */
function handleRecommendation(rec) {
  if (!rec.action) return

  const action = rec.action
  console.log('[CourseGen] Handling recommendation:', rec.type, action)

  // Route navigation (e.g., to monitor page)
  if (action.route) {
    router.push(action.route)
    return
  }

  // Generate baskets - Phase 3 (action.phases includes 'phase3')
  if (rec.type === 'generate-baskets' || action.phases?.includes('phase3')) {
    selectedPhase.value = 'phase3'
    // Select appropriate mode based on seed count
    const seedCount = action.seeds?.length || 10
    if (seedCount <= 10) {
      selectedMode.value = generationModes.value.find(m => m.id === 'quick_test')
    } else if (seedCount <= 250) {
      selectedMode.value = generationModes.value.find(m => m.id === 'mvp_course')
    } else {
      selectedMode.value = generationModes.value.find(m => m.id === 'full_course')
    }
    return
  }

  // Regenerate flagged seeds - Phase 1 with force
  if (rec.type === 'regenerate-flagged' || action.phases?.includes('phase1')) {
    selectedPhase.value = 'phase1'
    const quickTest = generationModes.value.find(m => m.id === 'quick_test')
    if (quickTest) selectedMode.value = quickTest
    return
  }

  // Resume mode - select appropriate mode and start
  if (action.mode === 'resume' || rec.type === 'continue') {
    const targetMode = action.targetMode || 'quick_test'
    const mode = generationModes.value.find(m => m.id === targetMode)
    if (mode) {
      selectedMode.value = mode
      setTimeout(() => startGeneration(), 100)
    }
    return
  }

  // Phase 2 - Conflict resolution / merge
  if (rec.type === 'merge-phase1' || action.phases?.includes('phase2')) {
    selectedPhase.value = 'phase2'
    return
  }

  // Quick Test - select mode
  if (rec.type === 'test') {
    const quickTest = generationModes.value.find(m => m.id === 'quick_test')
    if (quickTest) selectedMode.value = quickTest
    return
  }

  // Extend to Full Course
  if (rec.type === 'extend') {
    const fullCourse = generationModes.value.find(m => m.id === 'full_course')
    if (fullCourse) selectedMode.value = fullCourse
    return
  }

  // Regenerate all - nuclear option
  if (rec.type === 'regenerate-all') {
    const fullCourse = generationModes.value.find(m => m.id === 'full_course')
    if (fullCourse) selectedMode.value = fullCourse
    return
  }

  console.log('[CourseGen] Unhandled recommendation:', rec.type, action)
}
</script>

<style scoped>
/* ============================================
   GENERATE PAGE - Mission Control Aligned
   ============================================ */

.generate-page {
  --void: #0f172a;
  --deep: #1e293b;
  --surface: #1e293b;
  --elevated: #334155;
  --border: #334155;
  --border-light: #475569;
  --text: #f1f5f9;
  --text-dim: #94a3b8;
  --text-muted: #64748b;
  --accent: #10b981;
  --accent-dim: #059669;
  --accent-glow: rgba(16, 185, 129, 0.15);

  min-height: 100vh;
  background: var(--void);
  color: var(--text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
}

/* Ambient Background */
.ambient-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--border) 1px, transparent 1px),
    linear-gradient(90deg, var(--border) 1px, transparent 1px);
  background-size: 60px 60px;
  opacity: 0.03;
}

.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  animation: drift 25s ease-in-out infinite;
}

.glow-1 {
  width: 500px;
  height: 500px;
  background: var(--accent);
  top: -150px;
  right: -100px;
  opacity: 0.08;
}

.glow-2 {
  width: 400px;
  height: 400px;
  background: #3b82f6;
  bottom: -100px;
  left: 20%;
  opacity: 0.06;
  animation-delay: -10s;
}

@keyframes drift {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(30px, -20px); }
}

/* Header */
.page-header {
  position: relative;
  z-index: 10;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, var(--deep) 0%, transparent 100%);
}

.header-inner {
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem 2rem 2rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--accent);
  font-size: 0.875rem;
  text-decoration: none;
  margin-bottom: 1rem;
  transition: opacity 0.2s;
}

.back-link:hover {
  opacity: 0.8;
}

.back-link svg {
  width: 18px;
  height: 18px;
}

.header-titles h1 {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 0.25rem;
}

.header-titles p {
  font-size: 0.875rem;
  color: var(--text-dim);
  margin: 0;
}

/* Main */
.page-main {
  position: relative;
  z-index: 10;
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

/* Flow Sections */
.flow-section {
  margin-bottom: 2rem;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.label-text {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  white-space: nowrap;
}

.label-line {
  flex: 1;
  height: 1px;
  background: var(--border);
}

/* Language Card */
.lang-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
}

.lang-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1rem;
  align-items: end;
}

.lang-field label {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-dim);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.select-wrapper {
  position: relative;
}

.select-wrapper select {
  width: 100%;
  appearance: none;
  background: var(--elevated);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 0.875rem 2.5rem 0.875rem 1rem;
  color: var(--text);
  font-size: 0.9375rem;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.select-wrapper select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.select-wrapper select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.select-arrow {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  pointer-events: none;
}

.lang-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 0.5rem;
}

.lang-arrow svg {
  width: 24px;
  height: 24px;
  color: var(--text-muted);
}

.course-preview {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border);
}

.preview-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: var(--accent-glow);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 6px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 0.875rem;
  color: var(--accent);
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.preview-name {
  color: var(--text-dim);
  font-size: 0.875rem;
}

/* Pre-selected course display (cleaner, no dropdowns) */
.preselected-course {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 0.5rem 0;
}

.preview-badge.large {
  padding: 0.5rem 1rem;
  font-size: 1rem;
}

.preview-badge.large .badge-dot {
  width: 8px;
  height: 8px;
}

.preview-name.large {
  font-size: 1.125rem;
  color: var(--text);
  font-weight: 500;
}

/* Course State Card (Intelligent Resume) */
.state-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
}

.state-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-muted);
}

.state-loading .spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.state-empty, .state-progress {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.state-empty {
  flex-direction: row;
  align-items: center;
  gap: 1rem;
}

.state-icon {
  font-size: 1.5rem;
}

.state-text strong, .state-summary strong {
  display: block;
  color: var(--text);
  margin-bottom: 0.25rem;
}

.state-text p, .state-summary p {
  color: var(--text-muted);
  font-size: 0.875rem;
  margin: 0;
}

.state-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.monitor-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  margin-left: auto;
  background: var(--accent-glow);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 6px;
  color: var(--accent);
  font-size: 0.8125rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
}

.monitor-link:hover {
  background: rgba(16, 185, 129, 0.2);
  border-color: var(--accent);
}

.monitor-link svg {
  width: 16px;
  height: 16px;
}

.seeds-completed {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--elevated);
  border-radius: 6px;
  font-size: 0.8125rem;
}

.seeds-label {
  color: var(--text-muted);
  flex-shrink: 0;
}

.seeds-list {
  color: var(--text);
  font-family: 'SF Mono', Monaco, monospace;
}

.phase-status-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.phase-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem;
  background: var(--elevated);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.phase-status.complete {
  border-color: var(--success);
  background: rgba(34, 197, 94, 0.1);
}

.phase-status.incomplete, .phase-status.missing {
  border-color: var(--warning);
  background: rgba(234, 179, 8, 0.1);
}

.phase-status.flagged {
  border-color: var(--error);
  background: rgba(239, 68, 68, 0.1);
}

.phase-status.in_progress {
  border-color: var(--accent);
  background: var(--accent-glow);
}

.phase-status.pending {
  border-color: var(--border);
  background: var(--elevated);
}

.phase-num {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.phase-label {
  font-size: 0.8125rem;
  color: var(--text);
}

.phase-badge {
  font-size: 0.6875rem;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.05em;
}

.recommendations {
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.rec-header {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}

.rec-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  padding: 0.75rem 1rem;
  width: 100%;
  text-align: left;
  background: var(--elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.rec-item + .rec-item {
  margin-top: 0.5rem;
}

.rec-item:hover {
  background: var(--border);
  border-color: var(--accent);
  transform: translateX(4px);
}

.rec-item:active {
  transform: translateX(2px);
}

.rec-title {
  font-size: 0.875rem;
  color: var(--text);
}

.rec-desc {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

/* Mode Selection Card */
.mode-selection-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
}

.mode-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.mode-option {
  background: var(--elevated);
  border: 2px solid var(--border);
  border-radius: 10px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mode-option:hover {
  border-color: var(--border-light);
  background: var(--surface);
  transform: translateY(-2px);
}

.mode-option.active {
  border-color: var(--accent);
  background: var(--accent-glow);
  box-shadow: 0 0 0 1px var(--accent);
}

.mode-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.mode-icon {
  font-size: 1.75rem;
  flex-shrink: 0;
}

.mode-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
}

.mode-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mode-description {
  font-size: 0.875rem;
  color: var(--text-dim);
  margin: 0;
  line-height: 1.4;
}

.mode-specs {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}

.spec-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8125rem;
}

.spec-label {
  color: var(--text-muted);
  font-weight: 500;
}

.spec-value {
  color: var(--text);
  font-weight: 600;
}

.spec-value.mono {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 0.75rem;
  letter-spacing: -0.02em;
}

.pattern-row {
  justify-content: center;
  margin-top: 0.25rem;
}

.pattern-numbers {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.05em;
}

.pattern-key {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.key-label {
  font-weight: 500;
  margin-right: 0.25rem;
}

.key-item {
  color: var(--text-dim);
}

.key-sep {
  color: var(--text-muted);
  opacity: 0.6;
}

/* Action Buttons */
.flow-section.actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border);
}

.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn-primary {
  background: var(--accent);
  border: none;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-dim);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary svg {
  width: 18px;
  height: 18px;
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--border-light);
  color: var(--text-dim);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--text-muted);
  color: var(--text);
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Progress Panel */
.progress-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 2rem;
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.progress-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.progress-badge {
  padding: 0.375rem 0.75rem;
  background: var(--accent-glow);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
}

.progress-phases {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.phase-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--elevated);
  border-radius: 8px;
  opacity: 0.5;
  transition: all 0.3s;
}

.phase-item.active,
.phase-item.complete {
  opacity: 1;
}

.phase-indicator {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-muted);
}

.phase-item.active .phase-indicator {
  background: var(--accent-glow);
  color: var(--accent);
}

.phase-item.complete .phase-indicator {
  background: var(--accent);
  color: white;
}

.phase-check {
  font-size: 1rem;
}

.phase-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.phase-info {
  flex: 1;
}

.phase-name {
  display: block;
  font-weight: 500;
  color: var(--text);
}

.phase-detail {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #f87171;
}

.btn-retry {
  padding: 0.5rem 1rem;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 6px;
  color: #f87171;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

/* Completion Panel */
.completion-panel {
  text-align: center;
  padding: 4rem 2rem;
}

.completion-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  background: var(--accent);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: white;
}

.completion-panel h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.completion-panel p {
  color: var(--text-dim);
  margin: 0 0 2rem;
}

.completion-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* Responsive */
@media (max-width: 768px) {
  .lang-grid {
    grid-template-columns: 1fr;
  }

  .lang-arrow {
    transform: rotate(90deg);
    padding: 0.5rem 0;
  }

  .mode-options {
    grid-template-columns: 1fr;
  }

  .flow-section.actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    justify-content: center;
  }
}
</style>
