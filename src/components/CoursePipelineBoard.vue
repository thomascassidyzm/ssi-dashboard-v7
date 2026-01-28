<template>
  <div class="pipeline-board">
    <!-- Header Stats -->
    <div class="board-header">
      <div class="header-title">
        <h2>Course Pipeline</h2>
        <span class="course-count">{{ courses.length }} courses</span>
      </div>
      <div class="header-actions">
        <div class="search-box" :class="{ focused: searchFocused }">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Filter..."
            @focus="searchFocused = true"
            @blur="searchFocused = false"
          />
        </div>
      </div>
    </div>

    <!-- Pipeline Lanes -->
    <div class="lanes-container">
      <div
        v-for="lane in pipelineLanes"
        :key="lane.key"
        class="pipeline-lane"
        :class="[`lane-${lane.key}`, { empty: lane.courses.length === 0 }]"
      >
        <!-- Lane Header -->
        <div class="lane-header">
          <div class="lane-title-row">
            <span class="lane-indicator" :style="{ background: lane.color }"></span>
            <h3 class="lane-title">{{ lane.title }}</h3>
            <span class="lane-count" :style="{ background: lane.color + '25', color: lane.color }">
              {{ lane.courses.length }}
            </span>
          </div>
          <p class="lane-description">{{ lane.description }}</p>
        </div>

        <!-- Lane Content -->
        <div class="lane-content" v-if="lane.courses.length > 0">
          <TransitionGroup name="card" tag="div" class="lane-cards">
            <div
              v-for="course in lane.courses"
              :key="course.code"
              class="course-card"
              :class="{ active: activeCourse === course.code }"
              @click="handleCourseClick(course)"
              @mouseenter="activeCourse = course.code"
              @mouseleave="activeCourse = null"
            >
              <!-- Card Header -->
              <div class="card-header">
                <div class="card-title">
                  <span class="card-language">{{ getTargetLanguage(course.code) }}</span>
                  <span class="card-arrow">for</span>
                  <span class="card-speakers">{{ getKnownLanguage(course.code) }}</span>
                </div>
                <span class="card-code">{{ course.code }}</span>
              </div>

              <!-- Progress Ring -->
              <div class="card-progress">
                <svg class="progress-ring" viewBox="0 0 36 36">
                  <circle
                    class="ring-bg"
                    cx="18" cy="18" r="15.5"
                    fill="none"
                    stroke-width="3"
                  />
                  <circle
                    class="ring-fill"
                    :style="{
                      stroke: lane.color,
                      strokeDasharray: `${getProgress(course)} 100`
                    }"
                    cx="18" cy="18" r="15.5"
                    fill="none"
                    stroke-width="3"
                    stroke-linecap="round"
                  />
                </svg>
                <div class="progress-value">
                  <span class="progress-number">{{ getCompletedSeeds(course) }}</span>
                  <span class="progress-label">seeds</span>
                </div>
              </div>

              <!-- Card Stats -->
              <div class="card-stats">
                <div class="stat">
                  <span class="stat-value">{{ formatNumber(course.stats?.legos || 0) }}</span>
                  <span class="stat-label">LEGOs</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ formatNumber(course.stats?.phrases || 0) }}</span>
                  <span class="stat-label">Phrases</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ formatNumber(course.stats?.audio || 0) }}</span>
                  <span class="stat-label">Audio</span>
                </div>
              </div>

              <!-- Card Action -->
              <div class="card-action" v-if="lane.action">
                <button class="action-btn" :style="{ background: lane.color + '20', color: lane.color }" @click.stop="handleAction(course, lane.action)">
                  {{ lane.action.label }}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>

              <!-- Deployment Status -->
              <div class="card-deploy" v-if="lane.key === 'ready' || lane.key === 'live'">
                <div class="deploy-item" :class="{ active: course.newAppStatus === 'beta' || course.newAppStatus === 'live' }">
                  <span class="deploy-dot"></span>
                  <span class="deploy-label">Beta</span>
                </div>
                <div class="deploy-item" :class="{ active: course.legacyAppStatus === 'live' }">
                  <span class="deploy-dot"></span>
                  <span class="deploy-label">Live</span>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>

        <!-- Empty State -->
        <div class="lane-empty" v-else>
          <div class="empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 12h8"/>
            </svg>
          </div>
          <span class="empty-text">{{ lane.emptyText }}</span>
        </div>
      </div>
    </div>

    <!-- Summary Footer -->
    <div class="board-footer">
      <div class="footer-stat">
        <span class="footer-value">{{ totalSeeds }}</span>
        <span class="footer-label">Total Seeds Built</span>
      </div>
      <div class="footer-divider"></div>
      <div class="footer-stat">
        <span class="footer-value">{{ totalPhrases }}</span>
        <span class="footer-label">Practice Phrases</span>
      </div>
      <div class="footer-divider"></div>
      <div class="footer-stat">
        <span class="footer-value">{{ totalAudio }}</span>
        <span class="footer-label">Audio Files</span>
      </div>
      <div class="footer-divider"></div>
      <div class="footer-stat highlight">
        <span class="footer-value">{{ readyCount }}</span>
        <span class="footer-label">Ready to Ship</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  courses: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['action'])
const router = useRouter()

const searchQuery = ref('')
const searchFocused = ref(false)
const activeCourse = ref(null)

// Language name mapping
const languageNames = {
  eng: 'English', spa: 'Spanish', fra: 'French', deu: 'German',
  ita: 'Italian', por: 'Portuguese', nld: 'Dutch', pol: 'Polish',
  rus: 'Russian', ukr: 'Ukrainian', ces: 'Czech', slk: 'Slovak',
  hun: 'Hungarian', ron: 'Romanian', bul: 'Bulgarian', hrv: 'Croatian',
  srp: 'Serbian', slv: 'Slovenian', ell: 'Greek', tur: 'Turkish',
  swe: 'Swedish', nor: 'Norwegian', dan: 'Danish', fin: 'Finnish',
  cym: 'Welsh', gle: 'Irish', gla: 'Scottish Gaelic',
  zho: 'Chinese', cmn: 'Mandarin', yue: 'Cantonese',
  jpn: 'Japanese', kor: 'Korean', vie: 'Vietnamese',
  tha: 'Thai', ind: 'Indonesian', msa: 'Malay', tgl: 'Tagalog',
  hin: 'Hindi', ben: 'Bengali', tam: 'Tamil', tel: 'Telugu',
  ara: 'Arabic', heb: 'Hebrew', fas: 'Persian', urd: 'Urdu',
  swa: 'Swahili', zul: 'Zulu', xho: 'Xhosa', afr: 'Afrikaans',
  cat: 'Catalan', eus: 'Basque', lat: 'Latin', epo: 'Esperanto'
}

function getTargetLanguage(code) {
  const target = code?.split('_')[0]
  return languageNames[target] || target?.toUpperCase() || '?'
}

function getKnownLanguage(code) {
  const known = code?.split('_for_')[1]
  return languageNames[known] || known?.toUpperCase() || '?'
}

function getCompletedSeeds(course) {
  return course.stats?.completedSeeds || 0
}

function getProgress(course) {
  const target = course.targetSeeds || 260
  const completed = getCompletedSeeds(course)
  return Math.min(100, Math.round((completed / target) * 100))
}

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

function getBuildStatus(course) {
  const stats = course.stats || {}
  const targetSeeds = course.targetSeeds || 260
  const legos = stats.legos || 0
  const phrases = stats.phrases || 0
  const audio = stats.audio || 0
  const exportReady = course.exportReady || false
  const meaningfulAudio = audio > 100
  const completedSeeds = getCompletedSeeds(course)

  if (exportReady) return 'ready'
  if (meaningfulAudio && phrases > 0 && audio >= phrases * 2) return 'needs_export'
  if (completedSeeds >= targetSeeds && phrases > 0) return 'needs_audio'
  if (legos > 0 || (completedSeeds > 0 && completedSeeds < targetSeeds)) return 'building'
  return 'not_started'
}

// Filter courses
const filteredCourses = computed(() => {
  if (!searchQuery.value.trim()) return props.courses
  const q = searchQuery.value.toLowerCase()
  return props.courses.filter(c => {
    const name = (c.name || '').toLowerCase()
    const code = (c.code || '').toLowerCase()
    return name.includes(q) || code.includes(q)
  })
})

// Pipeline lanes
const pipelineLanes = computed(() => {
  const courses = filteredCourses.value

  const lanes = [
    {
      key: 'not_started',
      title: 'Not Started',
      description: 'Awaiting content creation',
      color: '#64748b',
      emptyText: 'All courses have begun',
      courses: []
    },
    {
      key: 'building',
      title: 'Building',
      description: 'Seeds being decomposed',
      color: '#f59e0b',
      emptyText: 'No active builds',
      action: { label: 'View Progress', type: 'view' },
      courses: []
    },
    {
      key: 'needs_audio',
      title: 'Needs Audio',
      description: 'Content ready for TTS',
      color: '#8b5cf6',
      emptyText: 'None pending audio',
      action: { label: 'Generate Audio', type: 'audio' },
      courses: []
    },
    {
      key: 'needs_export',
      title: 'Needs Export',
      description: 'Run Phase 9 manifest',
      color: '#f97316',
      emptyText: 'None pending export',
      action: { label: 'Export Now', type: 'export' },
      courses: []
    },
    {
      key: 'ready',
      title: 'Ready',
      description: 'Deploy to Beta or Live',
      color: '#10b981',
      emptyText: 'None ready to deploy',
      action: { label: 'Deploy', type: 'deploy' },
      courses: []
    },
    {
      key: 'live',
      title: 'Live',
      description: 'In production',
      color: '#06b6d4',
      emptyText: 'None deployed yet',
      courses: []
    }
  ]

  courses.forEach(course => {
    const status = getBuildStatus(course)
    const newApp = course.newAppStatus || 'not_available'

    if (status === 'not_started') {
      lanes[0].courses.push(course)
    } else if (status === 'building') {
      lanes[1].courses.push(course)
    } else if (status === 'needs_audio') {
      lanes[2].courses.push(course)
    } else if (status === 'needs_export') {
      lanes[3].courses.push(course)
    } else if (status === 'ready') {
      if (newApp === 'beta' || newApp === 'live') {
        lanes[5].courses.push(course)
      } else {
        lanes[4].courses.push(course)
      }
    }
  })

  // Sort by progress within each lane
  lanes.forEach(lane => {
    lane.courses.sort((a, b) => getCompletedSeeds(b) - getCompletedSeeds(a))
  })

  return lanes
})

// Summary stats
const totalSeeds = computed(() => {
  return props.courses.reduce((sum, c) => sum + getCompletedSeeds(c), 0)
})

const totalPhrases = computed(() => {
  return props.courses.reduce((sum, c) => sum + (c.stats?.phrases || 0), 0)
})

const totalAudio = computed(() => {
  return props.courses.reduce((sum, c) => sum + (c.stats?.audio || 0), 0)
})

const readyCount = computed(() => {
  return pipelineLanes.value.find(l => l.key === 'ready')?.courses.length || 0
})

function handleCourseClick(course) {
  router.push(`/production/${course.code}`)
}

function handleAction(course, action) {
  emit('action', { course, action: action.type })
  if (action.type === 'view') {
    router.push(`/production/${course.code}`)
  } else if (action.type === 'audio') {
    router.push(`/production/${course.code}/audio`)
  }
}
</script>

<style scoped>
/* ============================================
   COURSE PIPELINE BOARD
   Kanban-style flow visualization
   ============================================ */

@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');

.pipeline-board {
  --pb-bg: #0a0e17;
  --pb-surface: #111827;
  --pb-card: #1a2234;
  --pb-card-hover: #222d42;
  --pb-border: rgba(255, 255, 255, 0.06);
  --pb-text: #f1f5f9;
  --pb-text-dim: #94a3b8;
  --pb-text-muted: #64748b;

  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--pb-bg);
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

/* Board Header */
.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--pb-border);
  background: linear-gradient(180deg, rgba(17, 24, 39, 0.8) 0%, transparent 100%);
}

.header-title {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.header-title h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--pb-text);
  margin: 0;
  letter-spacing: -0.01em;
}

.course-count {
  font-size: 0.75rem;
  color: var(--pb-text-muted);
  font-weight: 500;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--pb-surface);
  border: 1px solid var(--pb-border);
  border-radius: 8px;
  transition: all 0.2s;
}

.search-box.focused {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.search-icon {
  color: var(--pb-text-muted);
  flex-shrink: 0;
}

.search-box input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--pb-text);
  font-size: 0.8125rem;
  font-family: inherit;
  width: 120px;
}

.search-box input::placeholder {
  color: var(--pb-text-muted);
}

/* Lanes Container */
.lanes-container {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1px;
  flex: 1;
  background: var(--pb-border);
  overflow-x: auto;
}

@media (max-width: 1400px) {
  .lanes-container {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: auto auto;
  }
}

@media (max-width: 900px) {
  .lanes-container {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .lanes-container {
    grid-template-columns: 1fr;
  }
}

/* Pipeline Lane */
.pipeline-lane {
  background: var(--pb-bg);
  display: flex;
  flex-direction: column;
  min-width: 200px;
}

.pipeline-lane.empty {
  opacity: 0.6;
}

.lane-header {
  padding: 1rem;
  border-bottom: 1px solid var(--pb-border);
  background: var(--pb-surface);
}

.lane-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
}

.lane-indicator {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.lane-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--pb-text);
  margin: 0;
  flex: 1;
}

.lane-count {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
  font-variant-numeric: tabular-nums;
}

.lane-description {
  font-size: 0.6875rem;
  color: var(--pb-text-muted);
  margin: 0;
}

/* Lane Content */
.lane-content {
  flex: 1;
  padding: 0.75rem;
  overflow-y: auto;
  max-height: 520px;
}

.lane-cards {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

/* Course Card */
.course-card {
  background: var(--pb-card);
  border: 1px solid var(--pb-border);
  border-radius: 10px;
  padding: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.course-card:hover,
.course-card.active {
  background: var(--pb-card-hover);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.card-language {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--pb-text);
}

.card-arrow {
  font-size: 0.6875rem;
  color: var(--pb-text-muted);
  font-style: italic;
}

.card-speakers {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--pb-text-dim);
}

.card-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.625rem;
  color: var(--pb-text-muted);
  letter-spacing: 0.02em;
}

/* Progress Ring */
.card-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.progress-ring {
  width: 44px;
  height: 44px;
  transform: rotate(-90deg);
  flex-shrink: 0;
}

.ring-bg {
  stroke: var(--pb-border);
}

.ring-fill {
  stroke-dashoffset: 0;
  transition: stroke-dasharray 0.5s ease;
}

.progress-value {
  display: flex;
  flex-direction: column;
}

.progress-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--pb-text);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.progress-label {
  font-size: 0.625rem;
  color: var(--pb-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Card Stats */
.card-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  padding-top: 0.625rem;
  border-top: 1px solid var(--pb-border);
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--pb-text-dim);
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 0.5625rem;
  color: var(--pb-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Card Action */
.card-action {
  margin-top: 0.625rem;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  transition: all 0.15s;
}

.action-btn:hover {
  filter: brightness(1.2);
}

/* Deploy Status */
.card-deploy {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.625rem;
  padding-top: 0.625rem;
  border-top: 1px solid var(--pb-border);
}

.deploy-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  opacity: 0.4;
}

.deploy-item.active {
  opacity: 1;
}

.deploy-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--pb-text-muted);
}

.deploy-item.active .deploy-dot {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

.deploy-label {
  font-size: 0.625rem;
  font-weight: 500;
  color: var(--pb-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.deploy-item.active .deploy-label {
  color: var(--pb-text-dim);
}

/* Empty State */
.lane-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem 1rem;
  color: var(--pb-text-muted);
}

.empty-icon {
  opacity: 0.3;
}

.empty-text {
  font-size: 0.75rem;
  text-align: center;
}

/* Board Footer */
.board-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 1rem 1.5rem;
  background: var(--pb-surface);
  border-top: 1px solid var(--pb-border);
}

.footer-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}

.footer-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--pb-text);
  font-variant-numeric: tabular-nums;
}

.footer-label {
  font-size: 0.625rem;
  color: var(--pb-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.footer-stat.highlight .footer-value {
  color: #10b981;
}

.footer-divider {
  width: 1px;
  height: 28px;
  background: var(--pb-border);
}

/* Transitions */
.card-enter-active,
.card-leave-active {
  transition: all 0.3s ease;
}

.card-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.card-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.card-move {
  transition: transform 0.3s ease;
}

/* Responsive */
@media (max-width: 768px) {
  .board-footer {
    flex-wrap: wrap;
    gap: 1rem;
  }

  .footer-divider {
    display: none;
  }

  .footer-stat {
    flex: 1 1 45%;
  }
}
</style>
