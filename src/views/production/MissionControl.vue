<template>
  <div class="mission-control">
    <!-- Header -->
    <header class="mission-control-header">
      <div class="header-content">
        <router-link to="/" class="back-link">← Back to Dashboard</router-link>
        <h1 class="page-title">Production Suite</h1>
        <!-- Course selector is now global in App.vue -->
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="store.isLoading" class="loading-state">
      <div class="spinner" />
      <p>Loading course data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="store.error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h2>Production API Not Available</h2>
      <p>{{ store.error }}</p>
      <div class="error-help">
        <p class="help-text">The Production Suite requires the production-api service to be running locally.</p>
        <div class="help-commands">
          <code>cd services && node production-api.cjs</code>
        </div>
        <p class="help-note">Or use the Course Library to view and edit course content without the Production API.</p>
      </div>
      <div class="error-actions">
        <button @click="retryLoad" class="retry-btn">Retry</button>
        <router-link to="/courses" class="back-btn">← Back to Course Library</router-link>
      </div>
    </div>

    <!-- Main Dashboard -->
    <div v-else-if="selectedCourse" class="dashboard-content">
      <!-- Overall Progress -->
      <section class="overall-progress">
        <div class="progress-header">
          <h2>Overall Progress</h2>
          <div class="progress-stats">
            <!-- Audio stats (primary for pre-audio courses) -->
            <div class="stat" v-if="store.audioCourseStats.total > 0">
              <span class="stat-value audio">{{ store.audioCourseStats.total }}</span>
              <span class="stat-label">NEEDED</span>
            </div>
            <div class="stat" v-if="store.audioCourseStats.total > 0">
              <span class="stat-value generated">{{ store.audioCourseStats.existing }}</span>
              <span class="stat-label">GENERATED</span>
            </div>
            <div class="stat" v-if="store.audioCourseStats.total > 0">
              <span class="stat-value pending">{{ store.audioCourseStats.missing }}</span>
              <span class="stat-label">PENDING</span>
            </div>
            <div class="stat" v-if="store.progressStats.flagged > 0">
              <span class="stat-value flagged">{{ store.progressStats.flagged }}</span>
              <span class="stat-label">FLAGGED</span>
            </div>
            <!-- QA stats (fallback when no audio stats) -->
            <template v-else>
              <div class="stat">
                <span class="stat-value">{{ store.progressStats.approved }}</span>
                <span class="stat-label">Approved</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ store.progressStats.total }}</span>
                <span class="stat-label">Total</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ estimatedDays }}</span>
                <span class="stat-label">Days Left</span>
              </div>
            </template>
          </div>
        </div>
        <div class="progress-visual">
          <ProgressRing
            :value="audioProgressPercent"
            label="Audio"
            :size="240"
            :stroke-width="16"
          />
        </div>
      </section>

      <!-- Blockers -->
      <BlockerList
        :blockers="store.blockers"
        @resolve="handleResolveBlocker"
      />

      <!-- Active Jobs -->
      <section v-if="activeJobs.length > 0" class="active-jobs">
        <h2 class="section-title">Active Jobs</h2>
        <div class="jobs-grid">
          <div v-for="job in activeJobs" :key="job.id" class="job-card" :class="`job-${job.type}`">
            <div class="job-header">
              <div class="job-type-badge" :class="`badge-${job.type}`">
                {{ job.type === 'audio' ? '🔊 Audio' : '🔨 Build' }}
              </div>
              <div class="job-status">
                <span class="status-indicator" :class="`status-${job.status}`"></span>
                <span class="status-text">{{ job.status === 'running' ? 'LIVE' : job.status.toUpperCase() }}</span>
              </div>
            </div>

            <div class="job-content">
              <!-- Progress Ring -->
              <div class="job-progress-ring">
                <svg class="progress-svg" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="currentColor" stroke-width="8" fill="none" class="progress-bg"/>
                  <circle
                    cx="50" cy="50" r="42"
                    stroke="currentColor"
                    stroke-width="8"
                    fill="none"
                    class="progress-fill"
                    :class="`fill-${job.type}`"
                    :stroke-dasharray="264"
                    :stroke-dashoffset="264 - (job.progress.percentage / 100) * 264"
                    stroke-linecap="round"
                  />
                </svg>
                <div class="progress-text">
                  <span class="progress-percent">{{ job.progress.percentage }}%</span>
                </div>
              </div>

              <!-- Stats -->
              <div class="job-stats">
                <div class="job-course">{{ job.courseCode }}</div>
                <div class="job-operation" v-if="job.metadata?.operation">
                  {{ job.metadata.operation === 'regenerate-role' ? `Regenerating ${job.metadata.role}` : 'Generating' }}
                </div>
                <div class="stats-row">
                  <div class="stat-item">
                    <span class="stat-value">{{ job.progress.current }}</span>
                    <span class="stat-label">PROCESSED</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-value">{{ job.progress.total }}</span>
                    <span class="stat-label">TOTAL</span>
                  </div>
                  <div v-if="job.progress.success !== undefined" class="stat-item">
                    <span class="stat-value success">{{ job.progress.success }}</span>
                    <span class="stat-label">SUCCESS</span>
                  </div>
                  <div v-if="job.progress.failed !== undefined" class="stat-item">
                    <span class="stat-value" :class="{ 'failed': job.progress.failed > 0 }">{{ job.progress.failed }}</span>
                    <span class="stat-label">FAILED</span>
                  </div>
                </div>
                <div v-if="job.metadata?.lastItem" class="job-current-item">
                  Processing: <span class="item-text">{{ job.metadata.lastItem }}</span>
                </div>
              </div>
            </div>

            <div class="job-actions" v-if="job.canStop">
              <button @click="stopJob(job.id)" class="btn-stop">Stop</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Pipeline Stages -->
      <section class="pipeline-stages">
        <h2 class="section-title">Pipeline Status</h2>
        <div class="stage-grid">
          <StageCard
            v-for="stage in store.pipelineStagesComputed"
            :key="stage.id"
            :stage="stage"
            :blocker-count="getBlockerCountForStage(stage.id)"
            @navigate="handleNavigate"
          />
        </div>
      </section>

      <!-- Quick Actions -->
      <QuickActions
        :actions="quickActions"
        @execute="handleQuickAction"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">🎯</div>
      <h2>Select a Course to Begin</h2>
      <p>Choose a course from the dropdown above to view its production status.</p>
      <router-link to="/production/courses" class="browse-courses-btn">
        Browse All Courses
      </router-link>
    </div>

    <!-- Import Course Modal -->
    <ImportCourseModal
      :visible="showImportModal"
      @close="showImportModal = false"
      @imported="handleCourseImported"
    />

    <!-- Legacy Export Dialog -->
    <LegacyExportDialog
      :visible="showLegacyExportDialog"
      :course-code="selectedCourse"
      @close="showLegacyExportDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProductionStore } from '@/stores/production'
import ProgressRing from './components/ProgressRing.vue'
import StageCard from './components/StageCard.vue'
import BlockerList from './components/BlockerList.vue'
import QuickActions from './components/QuickActions.vue'
import EnvironmentSwitcher from '@/components/EnvironmentSwitcher.vue'
import ImportCourseModal from '@/components/ImportCourseModal.vue'
import LegacyExportDialog from '@/components/production/LegacyExportDialog.vue'
import { getApiUrl } from '@/services/api'

// Get API base URL (same as other components)
// On Vercel deployment, uses relative URLs (/api/...) which Vercel handles
function getApiBaseUrl(): string {
  // 1. Check localStorage override
  const storedUrl = localStorage.getItem('api_base_url')
  if (storedUrl) return storedUrl

  // 2. Check if on Vercel deployment (use relative URLs)
  const isVercel = typeof window !== 'undefined' && (
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname === 'popty.app' ||
    window.location.hostname.endsWith('.popty.app')
  )
  if (isVercel) return ''

  // 3. Use env var or localhost for local development
  return getApiUrl()
}

// Accept courseCode from router props
const props = defineProps<{
  courseCode?: string
}>()

const router = useRouter()
const route = useRoute()
const store = useProductionStore()

const selectedCourse = ref('')
const courses = ref<Array<{ code: string; name: string; status?: string }>>([])
const showImportModal = ref(false)
const showLegacyExportDialog = ref(false)

// Active jobs (build and audio generation)
const activeJobs = ref<any[]>([])
let jobsPollInterval: ReturnType<typeof setInterval> | null = null

// Poll for active jobs
async function pollActiveJobs() {
  try {
    const apiBase = getApiBaseUrl()
    const response = await fetch(`${apiBase}/api/mission-control/jobs`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      const data = await response.json()
      activeJobs.value = data.jobs || []
    }
  } catch (err) {
    // Silently fail - server might not be running
  }
}

// Start job polling
function startJobPolling() {
  if (jobsPollInterval) return
  pollActiveJobs() // Poll immediately
  jobsPollInterval = setInterval(pollActiveJobs, 2000) // Then every 2 seconds
}

// Stop job polling
function stopJobPolling() {
  if (jobsPollInterval) {
    clearInterval(jobsPollInterval)
    jobsPollInterval = null
  }
}

// Stop a job
async function stopJob(jobId: string) {
  try {
    const apiBase = getApiBaseUrl()
    const response = await fetch(`${apiBase}/api/mission-control/jobs/${jobId}/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    })
    if (response.ok) {
      // Immediately refresh jobs list
      await pollActiveJobs()
    }
  } catch (err) {
    console.error('Failed to stop job:', err)
  }
}

// Fetch available courses from API (database-first via orchestrator)
async function loadCourses() {
  try {
    const apiBase = getApiBaseUrl()
    const response = await fetch(`${apiBase}/api/courses`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      const data = await response.json()
      // API returns { courses: [...] } or just [...]
      const courseList = Array.isArray(data) ? data : data.courses || []
      courses.value = courseList.map((c: any) => ({
        code: c.code || c.course_code || c.id,
        name: c.name || c.code || c.course_code || c.id,
        status: c.status
      }))
      console.log(`[MissionControl] Loaded ${courses.value.length} courses from ${data.source || 'API'}`)
    }
  } catch (err) {
    console.error('Failed to load courses:', err)
  }
}

// Computed: available courses (from API + current course if not in list)
const availableCourses = computed(() => {
  const list = [...courses.value]

  // Ensure current course is in the list even if API didn't return it
  if (selectedCourse.value && !list.find(c => c.code === selectedCourse.value)) {
    list.unshift({
      code: selectedCourse.value,
      name: selectedCourse.value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    })
  }

  return list
})

// Computed
const estimatedDays = computed(() => {
  const { total, approved } = store.progressStats
  const remaining = total - approved
  if (remaining === 0) return 0

  // Estimate: ~100 samples per day
  return Math.ceil(remaining / 100)
})

// Audio progress percentage for the ring
const audioProgressPercent = computed(() => {
  const audio = store.audioCourseStats
  if (!audio || audio.total === 0) return store.progressStats.percentComplete
  return Math.round((audio.existing / audio.total) * 100)
})

const quickActions = computed(() => {
  const actions = [
    {
      id: 'import_course',
      icon: '📥',
      label: 'Import Legacy Course',
      description: 'Upload a legacy course manifest JSON',
      badge: null,
      disabled: false
    },
    {
      id: 'generate_audio',
      icon: '🔊',
      label: 'Generate Audio',
      description: 'Start TTS generation for flagged samples',
      badge: store.samplesByStatus.flagged_regen_tts?.length || 0,
      disabled: (store.samplesByStatus.flagged_regen_tts?.length || 0) === 0
    },
    {
      id: 'review_samples',
      icon: '👀',
      label: 'Review Samples',
      description: 'Review audio samples awaiting approval',
      badge: store.samplesByStatus.needs_review?.length || 0,
      disabled: (store.samplesByStatus.needs_review?.length || 0) === 0
    },
    {
      id: 'record_human',
      icon: '🎤',
      label: 'Record Human',
      description: 'Create recording queue for human voice',
      badge: store.samplesByStatus.flagged_human_needed?.length || 0,
      disabled: (store.samplesByStatus.flagged_human_needed?.length || 0) === 0
    },
    {
      id: 'recording_optimizer',
      icon: '🧬',
      label: 'Recording Optimizer',
      description: 'LEGO splice engine for non-TTS languages',
      badge: null,
      disabled: false
    },
    {
      id: 'compile_manifest',
      icon: '📦',
      label: 'Compile Manifest',
      description: 'Generate final course manifest',
      disabled: store.progressStats.percentComplete < 100
    },
    {
      id: 'user_feedback',
      icon: '💬',
      label: 'User Feedback',
      description: 'View and resolve user-reported issues',
      badge: null,  // Could show unresolved count from API
      disabled: false
    },
    {
      id: 'launch_learning_app',
      icon: '🚀',
      label: 'Launch Learning App',
      description: 'Open course in learning app with QA access',
      badge: null,
      disabled: false
    },
    {
      id: 'agent_monitor',
      icon: '📡',
      label: 'Agent Monitor',
      description: 'View real-time pipeline agent activity',
      badge: null,
      disabled: false
    },
    {
      id: 'export_legacy',
      icon: '📜',
      label: 'Export Legacy',
      description: 'Download manifest for old learning app',
      badge: null,
      disabled: false
    }
  ]

  return actions
})

// Methods
async function handleCourseChange() {
  if (!selectedCourse.value) return

  await store.loadCourse(selectedCourse.value)
}

function retryLoad() {
  if (selectedCourse.value) {
    handleCourseChange()
  }
}

function handleNavigate(route: string) {
  router.push({
    name: route,
    params: { courseCode: selectedCourse.value }
  })
}

function handleResolveBlocker(blocker: any) {
  switch (blocker.action) {
    case 'createRecordingQueue':
      router.push({
        name: 'RecordingStudio',
        params: { courseCode: selectedCourse.value },
        query: { autoCreateQueue: 'true' }
      })
      break
    case 'sendToAudioPipeline':
      router.push({
        name: 'AudioGeneration',
        params: { courseCode: selectedCourse.value },
        query: { autoQueue: 'flagged' }
      })
      break
    case 'reviewSamples':
    case 'reviewFlaggedAudio':
      router.push({
        name: 'ScriptViewer',
        params: { courseCode: selectedCourse.value },
        query: { filter: 'flagged' }
      })
      break
  }
}

function handleQuickAction(actionId: string) {
  switch (actionId) {
    case 'import_course':
      showImportModal.value = true
      break
    case 'generate_audio':
      router.push({
        name: 'AudioGeneration',
        params: { courseCode: selectedCourse.value }
      })
      break
    case 'review_samples':
      router.push({
        name: 'ScriptViewer',
        params: { courseCode: selectedCourse.value },
        query: { filter: 'flagged' }
      })
      break
    case 'record_human':
      router.push({
        name: 'RecordingStudio',
        params: { courseCode: selectedCourse.value }
      })
      break
    case 'recording_optimizer':
      router.push({
        name: 'RecordingOptimizer',
        params: { courseCode: selectedCourse.value }
      })
      break
    case 'compile_manifest':
      router.push({
        name: 'CourseCompilation',
        params: { courseCode: selectedCourse.value }
      })
      break
    case 'user_feedback':
      router.push({
        name: 'UserFeedback',
        params: { courseCode: selectedCourse.value }
      })
      break
    case 'launch_learning_app':
      launchLearningApp()
      break
    case 'agent_monitor':
      router.push({
        path: `/monitor/${selectedCourse.value}`
      })
      break
    case 'export_legacy':
      showLegacyExportDialog.value = true
      break
  }
}

// Launch learning app with QA access token
function launchLearningApp() {
  if (!selectedCourse.value) return

  // Generate a short-lived QA access token (base64 encoded metadata)
  const qaToken = btoa(JSON.stringify({
    course: selectedCourse.value,
    role: 'qa_reviewer',
    issued: Date.now(),
    expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  }))

  // Open learning app with course and QA mode enabled
  const learningAppUrl = 'https://saysomethingin.app'
  const url = `${learningAppUrl}?course=${selectedCourse.value}&qa_mode=true&token=${qaToken}`

  window.open(url, '_blank', 'noopener,noreferrer')
}

// Handle course import completion
async function handleCourseImported(courseCode: string) {
  // Reload course list to include newly imported course
  await loadCourses()
  // Select the imported course
  selectedCourse.value = courseCode
  handleCourseChange()
}

function getBlockerCountForStage(stageId: string): number {
  switch (stageId) {
    case 'qa_review':
      return store.samplesByStatus.flagged_text_edit?.length || 0
    case 'tts_generation':
      return store.samplesByStatus.flagged_regen_tts?.length || 0
    case 'human_recording':
      return store.samplesByStatus.flagged_human_needed?.length || 0
    case 'final_review':
      return store.samplesByStatus.needs_review?.length || 0
    default:
      return 0
  }
}

// Lifecycle
onMounted(async () => {
  // Load available courses for the dropdown
  await loadCourses()

  // Get course code from props (router) or route params
  const courseCode = props.courseCode || route.params.courseCode as string
  if (courseCode) {
    selectedCourse.value = courseCode
    handleCourseChange()
  }

  // Start polling for active jobs
  startJobPolling()
})

// Watch for prop changes (navigation between courses)
watch(() => props.courseCode, (newCode) => {
  if (newCode && newCode !== selectedCourse.value) {
    selectedCourse.value = newCode
    handleCourseChange()
  }
})

onUnmounted(() => {
  // Stop job polling
  stopJobPolling()
})
</script>

<style scoped>
.mission-control {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--canvas) 0%, var(--surface) 100%);
  color: var(--ink);
  padding: 2rem;
}

/* Header */
.mission-control-header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--line);
}

.back-link {
  color: var(--accent-2);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--accent-2);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.page-title {
  font-size: 2rem;
  font-weight: 800;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: linear-gradient(135deg, #10b981, #059669);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

:root[data-theme="light"] .page-title {
  background: linear-gradient(135deg, #059669, #047857);
}

.env-switcher {
  margin-left: auto;
}

.course-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.course-selector label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--muted);
}

.course-select {
  padding: 0.5rem 1rem;
  background: var(--surface-2);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.course-select:hover {
  border-color: #10b981;
}

.course-select:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgb(16 185 129 / 0.1);
}

.ws-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  padding: 0.5rem 1rem;
  background: rgb(51 65 85 / 0.3);
  border-radius: 9999px;
  font-size: 0.875rem;
  color: var(--muted);
}

.ws-status.connected {
  background: rgb(16 185 129 / 0.2);
  color: #10b981;
}

.ws-indicator {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: var(--muted);
}

.ws-status.connected .ws-indicator {
  background: #10b981;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* States */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
}

.spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid var(--line);
  border-top-color: var(--accent-2);
  border-radius: 9999px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-icon,
.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: var(--accent-2);
  color: var(--canvas);
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

:root[data-theme="light"] .retry-btn {
  color: #ffffff;
}

.retry-btn:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.error-help {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  max-width: 500px;
}

.help-text {
  color: var(--muted);
  font-size: 0.875rem;
  margin: 0 0 1rem 0;
}

.help-commands {
  background: var(--surface-3);
  border: 1px solid var(--line);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
}

.help-commands code {
  color: var(--accent-2);
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.8rem;
}

:root[data-theme="light"] .help-commands code {
  color: var(--ink);
}

.help-note {
  color: var(--faint);
  font-size: 0.8rem;
  margin: 0;
}

.error-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  justify-content: center;
}

.back-btn {
  padding: 0.75rem 1.5rem;
  background: var(--surface-2);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 0.5rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: var(--surface-3);
  transform: translateY(-1px);
}

.browse-courses-btn {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: #6366f1;
  color: #ffffff;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.browse-courses-btn:hover {
  background: #4f46e5;
  transform: translateY(-1px);
}

/* Dashboard */
.dashboard-content {
  max-width: 1400px;
  margin: 0 auto;
}

/* Overall Progress */
.overall-progress {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 1rem;
  padding: 2rem;
  margin-bottom: 2rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 2rem;
}

.progress-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.progress-stats {
  display: flex;
  gap: 2rem;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #10b981;
}

.stat-value.audio {
  color: var(--ink);
}

.stat-value.generated {
  color: #10b981;
}

.stat-value.pending {
  color: #f59e0b;
}

:root[data-theme="light"] .stat-value,
:root[data-theme="light"] .stat-value.generated {
  color: var(--accent-2);
}

:root[data-theme="light"] .stat-value.pending {
  color: var(--accent);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.progress-visual {
  display: flex;
  justify-content: center;
}

/* Pipeline Stages */
.pipeline-stages {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 1rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

/* Active Jobs */
.active-jobs {
  margin-bottom: 2rem;
}

.jobs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.job-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.job-card.job-audio {
  border-color: rgb(16 185 129 / 0.4);
  background: linear-gradient(135deg, rgb(15 23 42 / 0.9), rgb(16 185 129 / 0.1));
}

.job-card.job-build {
  border-color: rgb(99 102 241 / 0.4);
  background: linear-gradient(135deg, rgb(15 23 42 / 0.9), rgb(99 102 241 / 0.1));
}

:root[data-theme="light"] .job-card.job-audio {
  border-color: rgb(5 150 105 / 0.5);
  background: linear-gradient(135deg, var(--surface), rgb(16 185 129 / 0.08));
}

:root[data-theme="light"] .job-card.job-build {
  border-color: rgb(99 102 241 / 0.5);
  background: linear-gradient(135deg, var(--surface), rgb(99 102 241 / 0.08));
}

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.job-type-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-audio {
  background: rgb(16 185 129 / 0.2);
  color: #10b981;
}

.badge-build {
  background: rgb(99 102 241 / 0.2);
  color: #6366f1;
}

:root[data-theme="light"] .badge-audio {
  background: rgb(5 150 105 / 0.15);
  color: var(--accent-2);
}

:root[data-theme="light"] .badge-build {
  background: rgb(79 70 229 / 0.15);
  color: #4338ca;
}

.job-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: rgb(16 185 129 / 0.2);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-indicator {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: #10b981;
  animation: pulse 2s infinite;
}

.status-indicator.status-running {
  background: #10b981;
}

.status-indicator.status-stalled {
  background: #f59e0b;
  animation: none;
}

.status-indicator.status-pending {
  background: var(--muted);
  animation: none;
}

.status-text {
  color: #10b981;
}

:root[data-theme="light"] .status-text {
  color: var(--accent-2);
}

.job-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.job-progress-ring {
  position: relative;
  width: 100px;
  height: 100px;
  flex-shrink: 0;
}

.progress-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-bg {
  color: rgb(51 65 85);
}

:root[data-theme="light"] .progress-bg {
  color: var(--surface-3);
}

:root[data-theme="light"] .progress-fill.fill-audio {
  color: var(--accent-2);
}

.progress-fill {
  transition: stroke-dashoffset 0.3s ease;
}

.progress-fill.fill-audio {
  color: #10b981;
}

.progress-fill.fill-build {
  color: #6366f1;
}

.progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.progress-percent {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ink);
}

.job-stats {
  flex: 1;
}

.job-course {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 0.25rem;
}

.job-operation {
  font-size: 0.875rem;
  color: var(--muted);
  margin-bottom: 0.75rem;
}

.stats-row {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 0.75rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-item .stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ink);
}

.stat-item .stat-value.success {
  color: #10b981;
}

:root[data-theme="light"] .stat-item .stat-value.success {
  color: var(--accent-2);
}

.stat-item .stat-value.failed {
  color: #ef4444;
}

:root[data-theme="light"] .stat-item .stat-value.failed {
  color: var(--danger);
}

.stat-item .stat-label {
  font-size: 0.625rem;
  color: var(--faint);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.job-current-item {
  font-size: 0.75rem;
  color: var(--faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.job-current-item .item-text {
  color: var(--muted);
}

.job-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: flex-end;
}

.btn-stop {
  padding: 0.5rem 1rem;
  background: rgb(239 68 68 / 0.2);
  color: #ef4444;
  border: 1px solid rgb(239 68 68 / 0.4);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

:root[data-theme="light"] .btn-stop {
  background: rgb(220 38 38 / 0.1);
  color: var(--danger);
  border-color: rgb(220 38 38 / 0.4);
}

.btn-stop:hover {
  background: rgb(239 68 68 / 0.3);
  border-color: rgb(239 68 68 / 0.6);
}

/* Responsive */
@media (max-width: 768px) {
  .mission-control {
    padding: 1rem;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .header-content {
    gap: 1rem;
  }

  .progress-header {
    flex-direction: column;
  }

  .stage-grid {
    grid-template-columns: 1fr;
  }
}
</style>
