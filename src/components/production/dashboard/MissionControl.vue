<template>
  <div class="mission-control">
    <!-- Header -->
    <header class="mc-header">
      <div class="mc-branding">
        <div class="mc-badge">MC</div>
        <div class="mc-title">
          <h1>Mission Control</h1>
          <p class="mc-subtitle">Course Production Suite</p>
        </div>
      </div>
      <div class="mc-status">
        <span class="ws-indicator" :class="{ connected: wsConnected }">
          <span class="ws-dot"></span>
          {{ wsConnected ? 'Live' : 'Offline' }}
        </span>
        <span class="last-update">
          Updated {{ lastUpdateTime }}
        </span>
      </div>
    </header>

    <!-- Course Selector -->
    <div class="course-selector" v-if="!currentCourseCode">
      <h2>Select a Course</h2>
      <div class="course-grid">
        <div
          v-for="course in availableCourses"
          :key="course.code"
          class="course-select-card"
          @click="selectCourse(course.code)"
        >
          <span class="course-name">{{ course.name }}</span>
          <span class="course-code">{{ course.code }}</span>
        </div>
      </div>
    </div>

    <!-- Main Dashboard -->
    <div class="mc-dashboard" v-else>
      <!-- Overall Progress -->
      <section class="mc-section progress-section">
        <div class="section-header">
          <h2>Overall Progress</h2>
          <button class="back-btn" @click="currentCourseCode = null">
            &larr; All Courses
          </button>
        </div>

        <div class="progress-overview">
          <ProgressRing
            :percent="progressStats.percentComplete"
            :size="160"
            :stroke-width="12"
            label="Complete"
            color="emerald"
          />

          <div class="progress-stats">
            <div class="stat-row">
              <span class="stat-label">Total Samples</span>
              <span class="stat-value">{{ progressStats.total.toLocaleString() }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Approved</span>
              <span class="stat-value approved">{{ progressStats.approved.toLocaleString() }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Flagged</span>
              <span class="stat-value flagged">{{ progressStats.flagged.toLocaleString() }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">In Progress</span>
              <span class="stat-value in-progress">{{ progressStats.inProgress.toLocaleString() }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Pending</span>
              <span class="stat-value pending">{{ progressStats.pending.toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Blockers -->
      <section class="mc-section blockers-section" v-if="blockers.length > 0">
        <h2>Blockers</h2>
        <div class="blockers-list">
          <BlockerCard
            v-for="blocker in blockers"
            :key="blocker.id"
            :type="blocker.type"
            :title="blocker.title"
            :description="blocker.description"
            :count="blocker.count"
            :action-label="blocker.actionLabel"
            @action="handleBlockerAction(blocker)"
          />
        </div>
      </section>

      <!-- Pipeline Stages -->
      <section class="mc-section stages-section">
        <h2>Pipeline Stages</h2>
        <div class="stages-grid">
          <div class="stage-card" v-for="stage in pipelineStages" :key="stage.id">
            <div class="stage-header">
              <span class="stage-icon">{{ stage.icon }}</span>
              <span class="stage-name">{{ stage.name }}</span>
            </div>
            <div class="stage-progress">
              <div class="stage-bar">
                <div
                  class="stage-fill"
                  :style="{ width: stage.percent + '%' }"
                  :class="stage.status"
                ></div>
              </div>
              <span class="stage-stats">
                {{ stage.completed }} / {{ stage.total }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="mc-section actions-section">
        <h2>Quick Actions</h2>
        <div class="actions-grid">
          <button class="action-card" @click="navigateTo('script')">
            <span class="action-icon">Script</span>
            <span class="action-label">Script Viewer</span>
            <span class="action-desc">Review and flag samples</span>
          </button>

          <button class="action-card" @click="navigateTo('samples')">
            <span class="action-icon">Audio</span>
            <span class="action-label">Samples Browser</span>
            <span class="action-desc">Browse and approve audio</span>
          </button>

          <button class="action-card" @click="navigateTo('pipeline')">
            <span class="action-icon">TTS</span>
            <span class="action-label">Audio Pipeline</span>
            <span class="action-desc">Manage TTS generation</span>
          </button>

          <button class="action-card" @click="navigateTo('recording')">
            <span class="action-icon">REC</span>
            <span class="action-label">Recording Studio</span>
            <span class="action-desc">Record voice samples</span>
          </button>
        </div>
      </section>

      <!-- Recent Activity -->
      <section class="mc-section activity-section">
        <h2>Recent Activity</h2>
        <div class="activity-feed">
          <div
            v-for="activity in recentActivity"
            :key="activity.id"
            class="activity-item"
          >
            <span class="activity-icon">{{ activity.icon }}</span>
            <div class="activity-content">
              <span class="activity-text">{{ activity.text }}</span>
              <span class="activity-time">{{ activity.time }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProductionStore } from '@/stores/production'
import { initWebSocket, joinCourseRoom, leaveCourseRoom, disconnectWebSocket } from '@/services/websocket'
import ProgressRing from './ProgressRing.vue'
import BlockerCard from './BlockerCard.vue'

const props = defineProps({
  courseCode: {
    type: String,
    default: null
  }
})

const router = useRouter()
const store = useProductionStore()

// Use prop if provided, otherwise use internal state
const currentCourseCode = ref(props.courseCode || null)
const lastUpdateTime = ref('just now')

// Available courses (would come from API in real app)
const availableCourses = ref([
  { code: 'spa_for_eng', name: 'Spanish for English Speakers' },
  { code: 'wel_for_eng', name: 'Welsh for English Speakers' },
  { code: 'cmn_for_eng', name: 'Mandarin for English Speakers' }
])

// Computed from store
const wsConnected = computed(() => store.wsConnected)
const progressStats = computed(() => store.progressStats)

// Blockers computed from flagged items
const blockers = computed(() => {
  const items = []
  const byStatus = store.samplesByStatus

  if (byStatus.flagged_human_needed.length > 0) {
    items.push({
      id: 'human-recordings',
      type: 'critical',
      title: 'Human Recordings Needed',
      description: 'TTS inadequate for these samples',
      count: byStatus.flagged_human_needed.length,
      actionLabel: 'Create Queue'
    })
  }

  if (byStatus.flagged_regen_tts.length > 0) {
    items.push({
      id: 'tts-regen',
      type: 'warning',
      title: 'TTS Regeneration Needed',
      description: 'Flagged for audio pipeline',
      count: byStatus.flagged_regen_tts.length,
      actionLabel: 'Send to Pipeline'
    })
  }

  if (byStatus.rejected.length > 0) {
    items.push({
      id: 'rejected',
      type: 'warning',
      title: 'Rejected Samples',
      description: 'Need review and re-recording',
      count: byStatus.rejected.length,
      actionLabel: 'Review'
    })
  }

  return items
})

// Pipeline stages
const pipelineStages = computed(() => {
  const stats = store.progressStats
  const total = stats.total || 1

  return [
    {
      id: 'qa-review',
      name: 'QA Review',
      icon: 'QA',
      completed: stats.approved + stats.flagged,
      total: total,
      percent: Math.round(((stats.approved + stats.flagged) / total) * 100),
      status: 'active'
    },
    {
      id: 'tts-gen',
      name: 'TTS Generation',
      icon: 'TTS',
      completed: stats.approved,
      total: total,
      percent: Math.round((stats.approved / total) * 100),
      status: 'active'
    },
    {
      id: 'recording',
      name: 'Human Recording',
      icon: 'REC',
      completed: 0,
      total: store.samplesByStatus.flagged_human_needed.length || 0,
      percent: 0,
      status: 'pending'
    },
    {
      id: 'final-qa',
      name: 'Final QA',
      icon: 'OK',
      completed: stats.approved,
      total: total,
      percent: Math.round((stats.approved / total) * 100),
      status: 'active'
    }
  ]
})

// Recent activity (mock data)
const recentActivity = ref([
  { id: 1, icon: 'OK', text: '47 samples approved', time: '2 min ago' },
  { id: 2, icon: '~', text: 'TTS regeneration completed', time: '5 min ago' },
  { id: 3, icon: 'REC', text: 'Recording queue created', time: '12 min ago' },
  { id: 4, icon: '!', text: '3 samples flagged', time: '18 min ago' }
])

// Actions
async function selectCourse(code) {
  currentCourseCode.value = code
  await store.loadCourse(code)
  joinCourseRoom(code)
}

function handleBlockerAction(blocker) {
  switch (blocker.id) {
    case 'human-recordings':
      router.push(`/production/${currentCourseCode.value}/recording`)
      break
    case 'tts-regen':
      router.push(`/production/${currentCourseCode.value}/pipeline`)
      break
    case 'rejected':
      router.push(`/production/${currentCourseCode.value}/samples?status=rejected`)
      break
  }
}

function navigateTo(tool) {
  router.push(`/production/${currentCourseCode.value}/${tool}`)
}

// Lifecycle
onMounted(async () => {
  initWebSocket()

  // If courseCode prop is provided, load it immediately
  if (props.courseCode) {
    currentCourseCode.value = props.courseCode
    await store.loadCourse(props.courseCode)
    joinCourseRoom(props.courseCode)
  }
})

onUnmounted(() => {
  if (currentCourseCode.value) {
    leaveCourseRoom(currentCourseCode.value)
  }
  disconnectWebSocket()
})

// Watch for courseCode prop changes
watch(() => props.courseCode, async (newCode, oldCode) => {
  if (newCode && newCode !== oldCode) {
    if (oldCode) {
      leaveCourseRoom(oldCode)
    }
    currentCourseCode.value = newCode
    await store.loadCourse(newCode)
    joinCourseRoom(newCode)
  }
})
</script>

<style scoped>
.mission-control {
  min-height: 100vh;
  background: #0a0b0f;
  padding: 1.5rem;
}

/* Header */
.mc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #34384a;
}

.mc-branding {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.mc-badge {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #ffa630, #e6951c);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1rem;
  font-weight: bold;
  color: #0a0b0f;
  box-shadow: 0 0 24px rgba(255, 166, 48, 0.4);
}

.mc-title h1 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: #f7f7f2;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mc-subtitle {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: #c1c1bb;
  margin: 0;
}

.mc-status {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.ws-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8rem;
  color: #c1c1bb;
}

.ws-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e63946;
}

.ws-indicator.connected .ws-dot {
  background: #06ffa5;
  box-shadow: 0 0 8px #06ffa5;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.last-update {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: #c1c1bb;
}

/* Course Selector */
.course-selector {
  text-align: center;
  padding: 3rem;
}

.course-selector h2 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.5rem;
  color: #f7f7f2;
  margin-bottom: 2rem;
}

.course-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  max-width: 900px;
  margin: 0 auto;
}

.course-select-card {
  background: #16181f;
  border: 2px solid #34384a;
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.course-select-card:hover {
  border-color: #ffa630;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(255, 166, 48, 0.2);
}

.course-name {
  display: block;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: #f7f7f2;
  margin-bottom: 0.25rem;
}

.course-code {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: #c1c1bb;
}

/* Dashboard Sections */
.mc-section {
  background: #16181f;
  border: 1px solid #34384a;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.mc-section h2 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #c1c1bb;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 1.25rem 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.section-header h2 {
  margin: 0;
}

.back-btn {
  background: transparent;
  border: 1px solid #34384a;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  color: #c1c1bb;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  border-color: #ffa630;
  color: #ffa630;
}

/* Progress Overview */
.progress-overview {
  display: flex;
  align-items: center;
  gap: 3rem;
}

.progress-stats {
  flex: 1;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #34384a;
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-label {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.9rem;
  color: #c1c1bb;
}

.stat-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1rem;
  font-weight: 600;
  color: #f7f7f2;
}

.stat-value.approved { color: #06ffa5; }
.stat-value.flagged { color: #ffa630; }
.stat-value.in-progress { color: #06b6d4; }
.stat-value.pending { color: #c1c1bb; }

/* Blockers */
.blockers-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Pipeline Stages */
.stages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stage-card {
  background: #0a0b0f;
  border-radius: 12px;
  padding: 1rem;
}

.stage-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.stage-icon {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  font-weight: bold;
  color: #ffa630;
  background: rgba(255, 166, 48, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.stage-name {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: #f7f7f2;
}

.stage-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stage-bar {
  flex: 1;
  height: 8px;
  background: #34384a;
  border-radius: 4px;
  overflow: hidden;
}

.stage-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.stage-fill.active {
  background: #06ffa5;
  box-shadow: 0 0 8px rgba(6, 255, 165, 0.5);
}

.stage-fill.pending {
  background: #34384a;
}

.stage-stats {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: #c1c1bb;
  white-space: nowrap;
}

/* Quick Actions */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.action-card {
  background: #0a0b0f;
  border: 2px solid #34384a;
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-card:hover {
  border-color: #ffa630;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(255, 166, 48, 0.2);
}

.action-icon {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  font-weight: bold;
  color: #ffa630;
  background: rgba(255, 166, 48, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  margin: 0 auto 0.75rem;
  width: fit-content;
}

.action-label {
  display: block;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: #f7f7f2;
  margin-bottom: 0.25rem;
}

.action-desc {
  display: block;
  font-size: 0.8rem;
  color: #c1c1bb;
}

/* Activity Feed */
.activity-feed {
  max-height: 300px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #34384a;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  font-weight: bold;
  color: #06ffa5;
  background: rgba(6, 255, 165, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-text {
  display: block;
  font-size: 0.9rem;
  color: #f7f7f2;
}

.activity-time {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: #c1c1bb;
}

/* Responsive */
@media (max-width: 768px) {
  .progress-overview {
    flex-direction: column;
    text-align: center;
  }

  .stages-grid,
  .actions-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
