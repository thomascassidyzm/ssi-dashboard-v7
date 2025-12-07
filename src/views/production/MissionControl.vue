<template>
  <div class="mission-control">
    <!-- Header -->
    <header class="mission-control-header">
      <div class="header-content">
        <h1 class="page-title">Mission Control</h1>
        <div class="course-selector">
          <label for="course-select">Course:</label>
          <select
            id="course-select"
            v-model="selectedCourse"
            class="course-select"
            @change="handleCourseChange"
          >
            <option value="">Select a course...</option>
            <option value="spa_for_eng">Spanish for English</option>
            <option value="fra_for_eng">French for English</option>
            <option value="mkd_for_eng">Macedonian for English</option>
          </select>
        </div>
        <div class="ws-status" :class="{ connected: store.wsConnected }">
          <div class="ws-indicator" />
          <span>{{ store.wsConnected ? 'Live' : 'Offline' }}</span>
        </div>
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
          </div>
        </div>
        <div class="progress-visual">
          <ProgressRing
            :value="store.progressStats.percentComplete"
            label="Complete"
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

// Accept courseCode from router props
const props = defineProps<{
  courseCode?: string
}>()

const router = useRouter()
const route = useRoute()
const store = useProductionStore()

const selectedCourse = ref('')
let ws: WebSocket | null = null

// Computed
const estimatedDays = computed(() => {
  const { total, approved } = store.progressStats
  const remaining = total - approved
  if (remaining === 0) return 0

  // Estimate: ~100 samples per day
  return Math.ceil(remaining / 100)
})

const quickActions = computed(() => {
  const actions = [
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
      id: 'compile_manifest',
      icon: '📦',
      label: 'Compile Manifest',
      description: 'Generate final course manifest',
      disabled: store.progressStats.percentComplete < 100
    }
  ]

  return actions
})

// Methods
async function handleCourseChange() {
  if (!selectedCourse.value) return

  await store.loadCourse(selectedCourse.value)

  // Only connect WebSocket if course loaded successfully
  if (!store.error) {
    connectWebSocket()
  }
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
      router.push({
        name: 'SamplesBrowser',
        params: { courseCode: selectedCourse.value },
        query: { filter: 'needs_review' }
      })
      break
  }
}

function handleQuickAction(actionId: string) {
  switch (actionId) {
    case 'generate_audio':
      router.push({
        name: 'AudioGeneration',
        params: { courseCode: selectedCourse.value }
      })
      break
    case 'review_samples':
      router.push({
        name: 'SamplesBrowser',
        params: { courseCode: selectedCourse.value },
        query: { filter: 'needs_review' }
      })
      break
    case 'record_human':
      router.push({
        name: 'RecordingStudio',
        params: { courseCode: selectedCourse.value }
      })
      break
    case 'compile_manifest':
      router.push({
        name: 'CourseCompilation',
        params: { courseCode: selectedCourse.value }
      })
      break
  }
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

function connectWebSocket() {
  if (!selectedCourse.value) return

  // Skip WebSocket on production (Vercel serverless doesn't support WebSockets)
  // WebSocket is only available when running the local production-api service
  const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')
  const wsUrl = import.meta.env.VITE_WS_URL

  if (isProduction && !wsUrl) {
    console.log('WebSocket disabled in production (serverless environment)')
    // Don't show as error - just operate without real-time updates
    return
  }

  try {
    // Use production API WebSocket endpoint (local dev only unless VITE_WS_URL is set)
    const url = wsUrl || 'ws://localhost:3470'
    ws = new WebSocket(`${url}/api/production/websocket?courseCode=${selectedCourse.value}`)

    ws.onopen = () => {
      console.log('WebSocket connected')
      store.setWsConnected(true)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      store.setWsConnected(false)
      // Attempt reconnect after 5 seconds (only on localhost)
      if (!isProduction) {
        setTimeout(() => {
          if (selectedCourse.value) {
            connectWebSocket()
          }
        }, 5000)
      }
    }

    ws.onerror = (error) => {
      // Don't spam console on production where WebSocket isn't available
      if (!isProduction) {
        console.error('WebSocket error:', error)
      }
      store.setWsConnected(false)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        store.handleWebSocketUpdate(data)
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }
  } catch (err) {
    if (!isProduction) {
      console.error('Failed to connect WebSocket:', err)
    }
  }
}

function disconnectWebSocket() {
  if (ws) {
    ws.close()
    ws = null
  }
  store.setWsConnected(false)
}

// Lifecycle
onMounted(() => {
  // Get course code from props (router) or route params
  const courseCode = props.courseCode || route.params.courseCode as string
  if (courseCode) {
    selectedCourse.value = courseCode
    handleCourseChange()
  }
})

// Watch for prop changes (navigation between courses)
watch(() => props.courseCode, (newCode) => {
  if (newCode && newCode !== selectedCourse.value) {
    selectedCourse.value = newCode
    handleCourseChange()
  }
})

onUnmounted(() => {
  disconnectWebSocket()
})
</script>

<style scoped>
.mission-control {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #e2e8f0;
  padding: 2rem;
}

/* Header */
.mission-control-header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgb(51 65 85);
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

.course-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.course-selector label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #94a3b8;
}

.course-select {
  padding: 0.5rem 1rem;
  background: rgb(15 23 42);
  color: #e2e8f0;
  border: 1px solid rgb(51 65 85);
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
  color: #94a3b8;
}

.ws-status.connected {
  background: rgb(16 185 129 / 0.2);
  color: #10b981;
}

.ws-indicator {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: #94a3b8;
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
  border: 3px solid rgb(51 65 85);
  border-top-color: #10b981;
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
  background: #10b981;
  color: #0f172a;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: #059669;
  transform: translateY(-1px);
}

.error-help {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: rgb(51 65 85 / 0.3);
  border-radius: 0.75rem;
  max-width: 500px;
}

.help-text {
  color: #94a3b8;
  font-size: 0.875rem;
  margin: 0 0 1rem 0;
}

.help-commands {
  background: rgb(15 23 42);
  border: 1px solid rgb(51 65 85);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
}

.help-commands code {
  color: #10b981;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.8rem;
}

.help-note {
  color: #64748b;
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
  background: rgb(51 65 85);
  color: #e2e8f0;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: rgb(71 85 105);
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
  background: rgb(15 23 42 / 0.6);
  border: 1px solid rgb(51 65 85);
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

.stat-label {
  font-size: 0.75rem;
  color: #94a3b8;
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
  color: #e2e8f0;
  margin: 0 0 1rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
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
