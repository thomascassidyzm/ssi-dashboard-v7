# MASTER AGENT 3: Audio Production Tools

## Mission Brief

You are **Master Agent 3** of 4, responsible for building the Audio Production tools: enhanced Audio Pipeline and Mission Control dashboard. You can begin work **after Master Agent 1 merges** (infrastructure dependency).

---

## Project Context

You are working on the SSi Dashboard v7 project. After cloning, your working directory is:
```
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean
```

This is a Vue 3 + Vite application with Tailwind CSS.

**Read these files first to understand the codebase and architecture:**
- `CLAUDE.md` - Agent onboarding guide
- `new_vision/MASTER_ORCHESTRATION_BRIEF.md` - Full architecture vision
- `new_vision/COURSE_PRODUCTION_SUITE_ARCHITECTURE.md` - Detailed specs
- `new_vision/autocue-teleprompter-prototype.html` - Design aesthetic reference
- `src/stores/production.js` - Pinia store (from Master 1)
- `src/services/websocket.js` - WebSocket service (from Master 1)

---

## Your Deliverables

### 1. Branch Setup
```bash
git checkout main
git pull origin main
git checkout -b feature/production-suite-audio
```

### 2. Component Overview

You will create these components:

```
src/components/production/
├── audio/
│   ├── AudioPipeline.vue         # Enhanced pipeline dashboard
│   ├── PipelineQueue.vue         # Queue management
│   ├── PipelineItem.vue          # Individual queue item
│   ├── GenerationProgress.vue    # Real-time TTS progress
│   └── RetryManager.vue          # Failed item retry handling
├── dashboard/
│   ├── MissionControl.vue        # Main dashboard overview
│   ├── ProgressRing.vue          # Circular progress indicator
│   ├── BlockerCard.vue           # Blocker alert card
│   └── CourseCard.vue            # Course summary card
```

---

### 3. ProgressRing Component: `src/components/production/dashboard/ProgressRing.vue`

```vue
<template>
  <div class="progress-ring-container" :style="{ width: size + 'px', height: size + 'px' }">
    <svg class="progress-ring" :width="size" :height="size">
      <!-- Background circle -->
      <circle
        class="progress-ring-bg"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke-width="strokeWidth"
      />
      <!-- Progress circle -->
      <circle
        class="progress-ring-progress"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke-width="strokeWidth"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        :style="{ stroke: progressColor }"
      />
    </svg>
    <div class="progress-content">
      <span class="progress-value">{{ percent }}%</span>
      <span class="progress-label">{{ label }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  percent: { type: Number, default: 0 },
  size: { type: Number, default: 120 },
  strokeWidth: { type: Number, default: 8 },
  label: { type: String, default: 'Complete' },
  color: { type: String, default: 'emerald' } // emerald, tungsten, film-red
})

const colors = {
  emerald: '#06ffa5',
  tungsten: '#ffa630',
  'film-red': '#e63946'
}

const progressColor = computed(() => colors[props.color] || colors.emerald)
const center = computed(() => props.size / 2)
const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(() => {
  const progress = Math.min(Math.max(props.percent, 0), 100)
  return circumference.value - (progress / 100) * circumference.value
})
</script>

<style scoped>
.progress-ring-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.progress-ring {
  transform: rotate(-90deg);
}

.progress-ring-bg {
  stroke: var(--color-graphite, #34384a);
}

.progress-ring-progress {
  transition: stroke-dashoffset 0.5s ease;
  filter: drop-shadow(0 0 8px currentColor);
}

.progress-content {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.progress-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-paper, #f7f7f2);
}

.progress-label {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.7rem;
  color: var(--color-paper-dim, #c1c1bb);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
</style>
```

---

### 4. BlockerCard Component: `src/components/production/dashboard/BlockerCard.vue`

```vue
<template>
  <div class="blocker-card" :class="severityClass">
    <div class="blocker-icon">{{ icon }}</div>
    <div class="blocker-content">
      <h4 class="blocker-title">{{ title }}</h4>
      <p class="blocker-description">{{ description }}</p>
      <span class="blocker-count">{{ count }} items</span>
    </div>
    <button class="blocker-action" @click="$emit('action')">
      {{ actionLabel }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: { type: String, default: 'warning' }, // critical, warning, info
  title: { type: String, required: true },
  description: { type: String, default: '' },
  count: { type: Number, default: 0 },
  actionLabel: { type: String, default: 'Resolve' }
})

defineEmits(['action'])

const severityClass = computed(() => `severity-${props.type}`)

const icon = computed(() => {
  switch (props.type) {
    case 'critical': return '🚨'
    case 'warning': return '⚠️'
    default: return 'ℹ️'
  }
})
</script>

<style scoped>
.blocker-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--color-shadow, #16181f);
  border-radius: 12px;
  border-left: 4px solid;
  transition: all 0.3s ease;
}

.blocker-card:hover {
  transform: translateX(4px);
}

.severity-critical {
  border-left-color: var(--color-film-red, #e63946);
  background: linear-gradient(90deg, rgba(230, 57, 70, 0.1), transparent);
}

.severity-warning {
  border-left-color: var(--color-tungsten, #ffa630);
  background: linear-gradient(90deg, rgba(255, 166, 48, 0.1), transparent);
}

.severity-info {
  border-left-color: #06b6d4;
  background: linear-gradient(90deg, rgba(6, 182, 212, 0.1), transparent);
}

.blocker-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.blocker-content {
  flex: 1;
}

.blocker-title {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-paper, #f7f7f2);
  margin: 0 0 0.25rem 0;
}

.blocker-description {
  font-size: 0.85rem;
  color: var(--color-paper-dim, #c1c1bb);
  margin: 0 0 0.25rem 0;
}

.blocker-count {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.blocker-action {
  padding: 0.5rem 1rem;
  background: var(--color-slate, #23262f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 8px;
  color: var(--color-paper, #f7f7f2);
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.blocker-action:hover {
  background: var(--color-tungsten, #ffa630);
  color: var(--color-void, #0a0b0f);
  border-color: var(--color-tungsten, #ffa630);
}
</style>
```

---

### 5. MissionControl Component: `src/components/production/dashboard/MissionControl.vue`

```vue
<template>
  <div class="mission-control">
    <!-- Header -->
    <header class="mc-header">
      <div class="mc-branding">
        <div class="mc-badge">🎛️</div>
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
            ← All Courses
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
            <span class="action-icon">📝</span>
            <span class="action-label">Script Viewer</span>
            <span class="action-desc">Review and flag samples</span>
          </button>

          <button class="action-card" @click="navigateTo('samples')">
            <span class="action-icon">🎵</span>
            <span class="action-label">Samples Browser</span>
            <span class="action-desc">Browse and approve audio</span>
          </button>

          <button class="action-card" @click="navigateTo('pipeline')">
            <span class="action-icon">⚙️</span>
            <span class="action-label">Audio Pipeline</span>
            <span class="action-desc">Manage TTS generation</span>
          </button>

          <button class="action-card" @click="navigateTo('recording')">
            <span class="action-icon">🎙️</span>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProductionStore } from '@/stores/production'
import { initWebSocket, joinCourseRoom, disconnectWebSocket } from '@/services/websocket'
import ProgressRing from './ProgressRing.vue'
import BlockerCard from './BlockerCard.vue'

const router = useRouter()
const store = useProductionStore()

const currentCourseCode = ref(null)
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
      icon: '📝',
      completed: stats.approved + stats.flagged,
      total: total,
      percent: Math.round(((stats.approved + stats.flagged) / total) * 100),
      status: 'active'
    },
    {
      id: 'tts-gen',
      name: 'TTS Generation',
      icon: '🔊',
      completed: stats.approved,
      total: total,
      percent: Math.round((stats.approved / total) * 100),
      status: 'active'
    },
    {
      id: 'recording',
      name: 'Human Recording',
      icon: '🎙️',
      completed: 0,
      total: store.samplesByStatus.flagged_human_needed.length || 0,
      percent: 0,
      status: 'pending'
    },
    {
      id: 'final-qa',
      name: 'Final QA',
      icon: '✅',
      completed: stats.approved,
      total: total,
      percent: Math.round((stats.approved / total) * 100),
      status: 'active'
    }
  ]
})

// Recent activity (mock data)
const recentActivity = ref([
  { id: 1, icon: '✅', text: '47 samples approved', time: '2 min ago' },
  { id: 2, icon: '🔄', text: 'TTS regeneration completed', time: '5 min ago' },
  { id: 3, icon: '🎙️', text: 'Recording queue created', time: '12 min ago' },
  { id: 4, icon: '🚩', text: '3 samples flagged', time: '18 min ago' }
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
onMounted(() => {
  initWebSocket()
})

onUnmounted(() => {
  disconnectWebSocket()
})
</script>

<style scoped>
.mission-control {
  min-height: 100vh;
  background: var(--color-void, #0a0b0f);
  padding: 1.5rem;
}

/* Header */
.mc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-graphite, #34384a);
}

.mc-branding {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.mc-badge {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, var(--color-tungsten, #ffa630), #e6951c);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  box-shadow: 0 0 24px rgba(255, 166, 48, 0.4);
}

.mc-title h1 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-paper, #f7f7f2);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mc-subtitle {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: var(--color-paper-dim, #c1c1bb);
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
  color: var(--color-paper-dim, #c1c1bb);
}

.ws-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-film-red, #e63946);
}

.ws-indicator.connected .ws-dot {
  background: var(--color-emerald, #06ffa5);
  box-shadow: 0 0 8px var(--color-emerald, #06ffa5);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.last-update {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
}

/* Course Selector */
.course-selector {
  text-align: center;
  padding: 3rem;
}

.course-selector h2 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.5rem;
  color: var(--color-paper, #f7f7f2);
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
  background: var(--color-shadow, #16181f);
  border: 2px solid var(--color-graphite, #34384a);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.course-select-card:hover {
  border-color: var(--color-tungsten, #ffa630);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(255, 166, 48, 0.2);
}

.course-name {
  display: block;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-paper, #f7f7f2);
  margin-bottom: 0.25rem;
}

.course-code {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: var(--color-paper-dim, #c1c1bb);
}

/* Dashboard Sections */
.mc-section {
  background: var(--color-shadow, #16181f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.mc-section h2 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-paper-dim, #c1c1bb);
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
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  color: var(--color-paper-dim, #c1c1bb);
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  border-color: var(--color-tungsten, #ffa630);
  color: var(--color-tungsten, #ffa630);
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
  border-bottom: 1px solid var(--color-graphite, #34384a);
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-label {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.9rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.stat-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-paper, #f7f7f2);
}

.stat-value.approved { color: var(--color-emerald, #06ffa5); }
.stat-value.flagged { color: var(--color-tungsten, #ffa630); }
.stat-value.in-progress { color: #06b6d4; }
.stat-value.pending { color: var(--color-paper-dim, #c1c1bb); }

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
  background: var(--color-void, #0a0b0f);
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
  font-size: 1.25rem;
}

.stage-name {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-paper, #f7f7f2);
}

.stage-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stage-bar {
  flex: 1;
  height: 8px;
  background: var(--color-graphite, #34384a);
  border-radius: 4px;
  overflow: hidden;
}

.stage-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.stage-fill.active {
  background: var(--color-emerald, #06ffa5);
  box-shadow: 0 0 8px rgba(6, 255, 165, 0.5);
}

.stage-fill.pending {
  background: var(--color-graphite, #34384a);
}

.stage-stats {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
  white-space: nowrap;
}

/* Quick Actions */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.action-card {
  background: var(--color-void, #0a0b0f);
  border: 2px solid var(--color-graphite, #34384a);
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-card:hover {
  border-color: var(--color-tungsten, #ffa630);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(255, 166, 48, 0.2);
}

.action-icon {
  display: block;
  font-size: 2rem;
  margin-bottom: 0.75rem;
}

.action-label {
  display: block;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-paper, #f7f7f2);
  margin-bottom: 0.25rem;
}

.action-desc {
  display: block;
  font-size: 0.8rem;
  color: var(--color-paper-dim, #c1c1bb);
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
  border-bottom: 1px solid var(--color-graphite, #34384a);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-text {
  display: block;
  font-size: 0.9rem;
  color: var(--color-paper, #f7f7f2);
}

.activity-time {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
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
```

---

### 6. PipelineItem Component: `src/components/production/audio/PipelineItem.vue`

```vue
<template>
  <div class="pipeline-item" :class="[`status-${item.status}`, { expanded }]">
    <div class="item-header" @click="expanded = !expanded">
      <div class="item-status-icon">
        <span v-if="item.status === 'pending'">⏳</span>
        <span v-else-if="item.status === 'processing'" class="spinning">⚙️</span>
        <span v-else-if="item.status === 'complete'">✅</span>
        <span v-else-if="item.status === 'failed'">❌</span>
      </div>

      <div class="item-info">
        <span class="item-id">{{ item.seedId || item.uuid.slice(0, 8) }}</span>
        <span class="item-text">{{ truncateText(item.targetText) }}</span>
      </div>

      <div class="item-progress" v-if="item.status === 'processing'">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: item.progress + '%' }"></div>
        </div>
        <span class="progress-text">{{ item.progress }}%</span>
      </div>

      <div class="item-meta">
        <span class="item-duration" v-if="item.duration">{{ formatDuration(item.duration) }}</span>
        <span class="item-time">{{ formatTime(item.queuedAt) }}</span>
      </div>

      <button class="expand-btn">{{ expanded ? '▲' : '▼' }}</button>
    </div>

    <Transition name="expand">
      <div v-if="expanded" class="item-details">
        <div class="detail-row">
          <span class="detail-label">UUID:</span>
          <span class="detail-value mono">{{ item.uuid }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Target:</span>
          <span class="detail-value">{{ item.targetText }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Known:</span>
          <span class="detail-value">{{ item.knownText }}</span>
        </div>
        <div class="detail-row" v-if="item.error">
          <span class="detail-label">Error:</span>
          <span class="detail-value error">{{ item.error }}</span>
        </div>

        <div class="item-actions">
          <button
            v-if="item.status === 'failed'"
            class="action-btn retry"
            @click="$emit('retry', item)"
          >
            🔄 Retry
          </button>
          <button
            v-if="item.status === 'complete'"
            class="action-btn play"
            @click="$emit('play', item)"
          >
            ▶️ Play
          </button>
          <button
            class="action-btn remove"
            @click="$emit('remove', item)"
          >
            🗑️ Remove
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  item: { type: Object, required: true }
})

defineEmits(['retry', 'play', 'remove'])

const expanded = ref(false)

function truncateText(text, maxLength = 40) {
  if (!text) return ''
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

function formatDuration(seconds) {
  if (!seconds) return ''
  return `${seconds.toFixed(1)}s`
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.pipeline-item {
  background: var(--color-shadow, #16181f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.pipeline-item:hover {
  border-color: var(--color-tungsten, #ffa630);
}

.pipeline-item.status-processing {
  border-color: #06b6d4;
  box-shadow: 0 0 16px rgba(6, 182, 212, 0.2);
}

.pipeline-item.status-complete {
  border-color: var(--color-emerald, #06ffa5);
}

.pipeline-item.status-failed {
  border-color: var(--color-film-red, #e63946);
}

.item-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
}

.item-status-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.spinning {
  display: inline-block;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-id {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
  display: block;
}

.item-text {
  font-family: 'Crimson Pro', serif;
  font-size: 1rem;
  color: var(--color-paper, #f7f7f2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 150px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--color-graphite, #34384a);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #06b6d4;
  border-radius: 3px;
  transition: width 0.3s ease;
  box-shadow: 0 0 8px rgba(6, 182, 212, 0.5);
}

.progress-text {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: #06b6d4;
  min-width: 35px;
}

.item-meta {
  text-align: right;
  flex-shrink: 0;
}

.item-duration,
.item-time {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.expand-btn {
  background: transparent;
  border: none;
  color: var(--color-paper-dim, #c1c1bb);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.25rem;
}

/* Expanded Details */
.item-details {
  padding: 1rem;
  background: var(--color-void, #0a0b0f);
  border-top: 1px solid var(--color-graphite, #34384a);
}

.detail-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.detail-label {
  color: var(--color-paper-dim, #c1c1bb);
  min-width: 60px;
  flex-shrink: 0;
}

.detail-value {
  color: var(--color-paper, #f7f7f2);
}

.detail-value.mono {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
}

.detail-value.error {
  color: var(--color-film-red, #e63946);
}

.item-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.action-btn {
  padding: 0.4rem 0.75rem;
  background: var(--color-slate, #23262f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 6px;
  color: var(--color-paper, #f7f7f2);
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--color-graphite, #34384a);
}

.action-btn.retry:hover {
  background: rgba(6, 182, 212, 0.2);
  border-color: #06b6d4;
}

.action-btn.play:hover {
  background: rgba(6, 255, 165, 0.2);
  border-color: var(--color-emerald, #06ffa5);
}

.action-btn.remove:hover {
  background: rgba(230, 57, 70, 0.2);
  border-color: var(--color-film-red, #e63946);
}

/* Transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
```

---

### 7. AudioPipeline Component: `src/components/production/audio/AudioPipeline.vue`

```vue
<template>
  <div class="audio-pipeline">
    <header class="pipeline-header">
      <div class="header-title">
        <h1>Audio Pipeline</h1>
        <span class="queue-count">{{ queueItems.length }} in queue</span>
      </div>

      <div class="header-actions">
        <button class="action-btn" @click="refreshQueue">
          🔄 Refresh
        </button>
        <button
          class="action-btn primary"
          @click="processQueue"
          :disabled="!hasItemsToProcess"
        >
          ⚡ Process All
        </button>
      </div>
    </header>

    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stat">
        <span class="stat-value">{{ stats.pending }}</span>
        <span class="stat-label">Pending</span>
      </div>
      <div class="stat">
        <span class="stat-value processing">{{ stats.processing }}</span>
        <span class="stat-label">Processing</span>
      </div>
      <div class="stat">
        <span class="stat-value complete">{{ stats.complete }}</span>
        <span class="stat-label">Complete</span>
      </div>
      <div class="stat">
        <span class="stat-value failed">{{ stats.failed }}</span>
        <span class="stat-label">Failed</span>
      </div>
    </div>

    <!-- Queue Filters -->
    <div class="queue-filters">
      <button
        v-for="filter in filters"
        :key="filter.value"
        class="filter-btn"
        :class="{ active: activeFilter === filter.value }"
        @click="activeFilter = filter.value"
      >
        {{ filter.label }} ({{ filter.count }})
      </button>
    </div>

    <!-- Queue List -->
    <div class="queue-list">
      <PipelineItem
        v-for="item in filteredItems"
        :key="item.uuid"
        :item="item"
        @retry="retryItem"
        @play="playItem"
        @remove="removeItem"
      />

      <div v-if="filteredItems.length === 0" class="empty-state">
        <p>No items in {{ activeFilter }} queue</p>
      </div>
    </div>

    <!-- Add from Flags -->
    <div class="add-section" v-if="flaggedForTTS.length > 0">
      <h3>Flagged for TTS Regeneration</h3>
      <p class="flagged-count">{{ flaggedForTTS.length }} samples waiting</p>
      <button class="action-btn primary" @click="addFlaggedToQueue">
        ➕ Add All to Queue
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useProductionStore } from '@/stores/production'
import PipelineItem from './PipelineItem.vue'

const store = useProductionStore()

// Queue state
const queueItems = ref([])
const activeFilter = ref('all')

// Computed
const flaggedForTTS = computed(() => store.samplesByStatus.flagged_regen_tts)

const stats = computed(() => ({
  pending: queueItems.value.filter(i => i.status === 'pending').length,
  processing: queueItems.value.filter(i => i.status === 'processing').length,
  complete: queueItems.value.filter(i => i.status === 'complete').length,
  failed: queueItems.value.filter(i => i.status === 'failed').length
}))

const filters = computed(() => [
  { value: 'all', label: 'All', count: queueItems.value.length },
  { value: 'pending', label: 'Pending', count: stats.value.pending },
  { value: 'processing', label: 'Processing', count: stats.value.processing },
  { value: 'complete', label: 'Complete', count: stats.value.complete },
  { value: 'failed', label: 'Failed', count: stats.value.failed }
])

const filteredItems = computed(() => {
  if (activeFilter.value === 'all') return queueItems.value
  return queueItems.value.filter(i => i.status === activeFilter.value)
})

const hasItemsToProcess = computed(() => stats.value.pending > 0)

// Actions
async function refreshQueue() {
  // TODO: Fetch queue from API
  console.log('Refreshing queue...')
}

async function processQueue() {
  // TODO: Start processing all pending items
  console.log('Processing queue...')
}

async function addFlaggedToQueue() {
  const newItems = flaggedForTTS.value.map(sample => ({
    uuid: sample.uuid,
    seedId: sample.seedId,
    targetText: sample.targetText,
    knownText: sample.knownText,
    status: 'pending',
    progress: 0,
    queuedAt: new Date().toISOString()
  }))

  queueItems.value.push(...newItems)

  // Update flags to in_pipeline
  await store.bulkUpdateFlags(
    flaggedForTTS.value.map(s => ({ uuid: s.uuid, status: 'in_pipeline' }))
  )
}

function retryItem(item) {
  const index = queueItems.value.findIndex(i => i.uuid === item.uuid)
  if (index > -1) {
    queueItems.value[index].status = 'pending'
    queueItems.value[index].progress = 0
    queueItems.value[index].error = null
  }
}

function playItem(item) {
  // TODO: Play audio preview
  console.log('Playing:', item.uuid)
}

function removeItem(item) {
  const index = queueItems.value.findIndex(i => i.uuid === item.uuid)
  if (index > -1) {
    queueItems.value.splice(index, 1)
  }
}

// WebSocket listener for pipeline progress
function handlePipelineProgress(event) {
  const data = event.detail
  const index = queueItems.value.findIndex(i => i.uuid === data.uuid)
  if (index > -1) {
    queueItems.value[index].status = data.status
    queueItems.value[index].progress = data.progress || 0
    if (data.error) {
      queueItems.value[index].error = data.error
    }
    if (data.duration) {
      queueItems.value[index].duration = data.duration
    }
  }
}

onMounted(() => {
  window.addEventListener('pipeline_progress', handlePipelineProgress)
})

onUnmounted(() => {
  window.removeEventListener('pipeline_progress', handlePipelineProgress)
})
</script>

<style scoped>
.audio-pipeline {
  padding: 1.5rem;
  background: var(--color-void, #0a0b0f);
  min-height: 100vh;
}

.pipeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-graphite, #34384a);
}

.header-title h1 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-paper, #f7f7f2);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.queue-count {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.action-btn {
  padding: 0.6rem 1.25rem;
  background: var(--color-slate, #23262f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 8px;
  color: var(--color-paper, #f7f7f2);
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--color-graphite, #34384a);
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--color-tungsten, #ffa630), #e6951c);
  border-color: var(--color-tungsten, #ffa630);
  color: var(--color-void, #0a0b0f);
}

.action-btn.primary:hover {
  box-shadow: 0 0 16px rgba(255, 166, 48, 0.4);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Stats Bar */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat {
  background: var(--color-shadow, #16181f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
}

.stat-value {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-paper, #f7f7f2);
}

.stat-value.processing { color: #06b6d4; }
.stat-value.complete { color: var(--color-emerald, #06ffa5); }
.stat-value.failed { color: var(--color-film-red, #e63946); }

.stat-label {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* Queue Filters */
.queue-filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 0.5rem 1rem;
  background: var(--color-shadow, #16181f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 20px;
  color: var(--color-paper-dim, #c1c1bb);
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn:hover {
  border-color: var(--color-tungsten, #ffa630);
}

.filter-btn.active {
  background: var(--color-tungsten, #ffa630);
  border-color: var(--color-tungsten, #ffa630);
  color: var(--color-void, #0a0b0f);
}

/* Queue List */
.queue-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-paper-dim, #c1c1bb);
}

/* Add Section */
.add-section {
  background: var(--color-shadow, #16181f);
  border: 1px solid var(--color-tungsten, #ffa630);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
}

.add-section h3 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  color: var(--color-paper, #f7f7f2);
  margin: 0 0 0.5rem 0;
}

.flagged-count {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: var(--color-tungsten, #ffa630);
  margin: 0 0 1rem 0;
}

/* Responsive */
@media (max-width: 768px) {
  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
```

---

### 8. Add Routes

Update the router to include audio production routes:

```javascript
// Add to routes array
{
  path: '/production',
  name: 'MissionControl',
  component: () => import('@/components/production/dashboard/MissionControl.vue')
},
{
  path: '/production/:courseCode/pipeline',
  name: 'AudioPipeline',
  component: () => import('@/components/production/audio/AudioPipeline.vue'),
  props: true
}
```

---

## Design Aesthetic Reference

Follow the cinematic dark palette from `new_vision/autocue-teleprompter-prototype.html`:

```css
:root {
  /* Cinematic Dark Palette */
  --color-void: #0a0b0f;
  --color-shadow: #16181f;
  --color-slate: #23262f;
  --color-graphite: #34384a;

  /* Accent Colors */
  --color-film-red: #e63946;
  --color-tungsten: #ffa630;
  --color-emerald: #06ffa5;

  /* Text */
  --color-paper: #f7f7f2;
  --color-paper-dim: #c1c1bb;

  /* Typography */
  --font-display: 'Crimson Pro', serif;
  --font-ui: 'Josefin Sans', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/production/dashboard/MissionControl.vue` | Main dashboard |
| `src/components/production/dashboard/ProgressRing.vue` | Circular progress |
| `src/components/production/dashboard/BlockerCard.vue` | Blocker alerts |
| `src/components/production/audio/AudioPipeline.vue` | Pipeline manager |
| `src/components/production/audio/PipelineItem.vue` | Queue item |

---

## Success Criteria

Before creating your PR, verify:

- [ ] All components created in correct directories
- [ ] MissionControl shows course selector and dashboard
- [ ] ProgressRing animates correctly
- [ ] BlockerCard shows different severity levels
- [ ] AudioPipeline manages queue with filters
- [ ] PipelineItem expands/collapses and shows progress
- [ ] WebSocket updates reflect in real-time
- [ ] Design matches cinematic dark aesthetic
- [ ] Routes added to router

---

## PR Instructions

When complete:

1. Commit all changes with descriptive message
2. Push branch to origin
3. Create PR with title: `[Audio Tools] Mission Control & Audio Pipeline`
4. PR body should list all files created/modified
5. Tag for review by Master Orchestrator

---

## Dependencies

- **Requires Master 1 complete**: You need the Pinia store and WebSocket service
- **Parallel with**: Masters 2 and 4 (no conflicts expected)

---

**You are Master 3 of 4. Mission Control is the command center - make it feel powerful and informative.**
