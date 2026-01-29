<template>
  <div class="pipeline-board">
    <!-- Header Stats -->
    <div class="board-header">
      <div class="header-title">
        <h2>Course Pipeline</h2>
        <span class="course-count">{{ courses.length }} courses</span>
      </div>
      <div class="header-actions">
        <!-- Not started indicator -->
        <div v-if="notStartedCount > 0" class="not-started-indicator" title="Courses with no content yet (visible in search)">
          <span class="indicator-dot"></span>
          <span>{{ notStartedCount }} not started</span>
        </div>

        <!-- Compact mode toggle -->
        <button
          class="compact-toggle"
          :class="{ active: compactMode }"
          @click="compactMode = !compactMode"
          title="Toggle compact view"
        >
          <svg v-if="!compactMode" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <!-- Hidden courses toggle -->
        <button
          v-if="hiddenCourses.length > 0"
          class="hidden-toggle"
          :class="{ active: showHidden }"
          @click="showHidden = !showHidden"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path v-if="showHidden" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle v-if="showHidden" cx="12" cy="12" r="3"/>
            <path v-if="!showHidden" d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
            <line v-if="!showHidden" x1="1" y1="1" x2="23" y2="23"/>
          </svg>
          <span>{{ hiddenCourses.length }} hidden</span>
        </button>

        <div class="search-box" :class="{ focused: searchFocused }">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search..."
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
              :class="{
                active: activeCourse === course.code,
                hidden: isHidden(course.code),
                compact: compactMode
              }"
              @click="handleCourseClick(course)"
              @mouseenter="activeCourse = course.code"
              @mouseleave="activeCourse = null"
            >
              <!-- Compact Mode: Just the name -->
              <template v-if="compactMode">
                <div class="compact-content">
                  <span class="compact-language">{{ getTargetLanguage(course.code) }}</span>
                  <span class="compact-for">for</span>
                  <span class="compact-speakers">{{ getKnownLanguage(course.code) }}</span>
                  <!-- Dual app status badges in compact mode for Production -->
                  <template v-if="lane.isProductionColumn">
                    <span v-if="course.inNewApp" class="compact-status-badge" :class="course.newAppStatus">
                      New: {{ course.newAppStatus }}
                    </span>
                    <span v-if="course.inLegacyApp" class="compact-status-badge legacy" :class="course.legacyAppStatus">
                      Legacy: {{ course.legacyAppStatus }}
                    </span>
                  </template>
                </div>
              </template>

              <!-- Full Card Mode -->
              <template v-else>
                <!-- Card Header -->
                <div class="card-header">
                  <div class="card-title">
                    <span class="card-language">{{ getTargetLanguage(course.code) }}</span>
                    <span class="card-arrow">for</span>
                    <span class="card-speakers">{{ getKnownLanguage(course.code) }}</span>
                  </div>
                  <div class="card-header-row">
                    <span class="card-code">{{ course.code }}</span>
                    <button
                      v-if="!isHidden(course.code)"
                      class="hide-btn"
                      @click.stop="hideCourse(course.code)"
                      title="Hide this course"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6 6 18M6 6l12 12"/>
                      </svg>
                    </button>
                    <button
                      v-else
                      class="unhide-btn"
                      @click.stop="unhideCourse(course.code)"
                      title="Show this course"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                  </div>
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

                <!-- Production: Dual App Status Badges -->
                <div class="card-deploy-status" v-if="lane.isProductionColumn">
                  <div class="deploy-badge new-app" :class="{ active: course.inNewApp }">
                    <span class="deploy-label">New App</span>
                    <span class="deploy-status" :class="course.newAppStatus">
                      {{ course.inNewApp ? course.newAppStatus : '—' }}
                    </span>
                  </div>
                  <div class="deploy-badge legacy-app" :class="{ active: course.inLegacyApp }">
                    <span class="deploy-label">Legacy</span>
                    <span class="deploy-status" :class="course.legacyAppStatus">
                      {{ course.inLegacyApp ? course.legacyAppStatus : '—' }}
                    </span>
                  </div>
                </div>
              </template>
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
        <span class="footer-value">{{ productionCount }}</span>
        <span class="footer-label">In Production</span>
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
const showHidden = ref(false)
const compactMode = ref(false)

// Count of not-started courses (shown in header, not in lanes)
const notStartedCount = computed(() => {
  return props.courses.filter(c => {
    const status = getBuildStatus(c)
    return status === 'not_started' && !isHidden(c.code)
  }).length
})

// Hidden courses - persisted in localStorage
const HIDDEN_STORAGE_KEY = 'ssi-pipeline-hidden-courses'
const hiddenCourses = ref(loadHiddenCourses())

function loadHiddenCourses() {
  try {
    const stored = localStorage.getItem(HIDDEN_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveHiddenCourses() {
  localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(hiddenCourses.value))
}

function hideCourse(code) {
  if (!hiddenCourses.value.includes(code)) {
    hiddenCourses.value.push(code)
    saveHiddenCourses()
  }
}

function unhideCourse(code) {
  hiddenCourses.value = hiddenCourses.value.filter(c => c !== code)
  saveHiddenCourses()
}

function isHidden(code) {
  return hiddenCourses.value.includes(code)
}

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

// Filter courses (exclude hidden unless showHidden is true)
const filteredCourses = computed(() => {
  let courses = props.courses

  // Filter out hidden courses unless showing them
  if (!showHidden.value) {
    courses = courses.filter(c => !isHidden(c.code))
  }

  // Apply search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    courses = courses.filter(c => {
      const name = (c.name || '').toLowerCase()
      const code = (c.code || '').toLowerCase()
      return name.includes(q) || code.includes(q)
    })
  }

  return courses
})

// Pipeline lanes
const pipelineLanes = computed(() => {
  const courses = filteredCourses.value

  const lanes = [
    {
      key: 'building',
      title: 'Building',
      description: 'Translations, LEGOs, phrases',
      color: '#f59e0b',
      emptyText: 'No active builds',
      action: { label: 'View Progress', type: 'view' },
      courses: []
    },
    {
      key: 'audio',
      title: 'Audio',
      description: 'TTS generation pipeline',
      color: '#8b5cf6',
      emptyText: 'None generating',
      action: { label: 'Generate Audio', type: 'audio' },
      courses: []
    },
    {
      key: 'polishing',
      title: 'Polishing',
      description: 'Validation & QA',
      color: '#f97316',
      emptyText: 'None in QA',
      action: { label: 'Review', type: 'review' },
      courses: []
    },
    {
      key: 'production',
      title: 'Production',
      description: 'Deployed to apps',
      color: '#10b981',
      emptyText: 'None deployed',
      isProductionColumn: true,
      courses: []
    }
  ]

  courses.forEach(course => {
    const status = getBuildStatus(course)
    // Normalize status values (backwards compatibility: draft→testing, released→live)
    let newAppStatus = course.newAppStatus || 'not_available'
    let legacyAppStatus = course.legacyAppStatus || 'not_available'
    if (newAppStatus === 'draft') newAppStatus = 'testing'
    if (newAppStatus === 'released') newAppStatus = 'live'
    if (legacyAppStatus === 'draft') legacyAppStatus = 'testing'
    if (legacyAppStatus === 'released') legacyAppStatus = 'live'

    // Check if deployed to either app
    const inNewApp = newAppStatus === 'testing' || newAppStatus === 'beta' || newAppStatus === 'live'
    const inLegacyApp = legacyAppStatus === 'testing' || legacyAppStatus === 'beta' || legacyAppStatus === 'live'
    const inProduction = inNewApp || inLegacyApp

    // Skip not_started courses (they show in header count and search)
    if (status === 'not_started') return

    if (inProduction) {
      // Production column - show both app statuses as badges
      lanes[3].courses.push({
        ...course,
        newAppStatus,
        legacyAppStatus,
        inNewApp,
        inLegacyApp
      })
    } else {
      // Pipeline columns based on build status
      if (status === 'building') {
        lanes[0].courses.push(course)
      } else if (status === 'needs_audio') {
        lanes[1].courses.push(course)
      } else if (status === 'needs_export' || status === 'ready') {
        lanes[2].courses.push(course)
      }
    }
  })

  // Sort by progress within each lane
  lanes.forEach(lane => {
    if (lane.isProductionColumn) {
      // Sort production by: both apps > new app only > legacy only, then by status
      lane.courses.sort((a, b) => {
        const aScore = (a.inNewApp ? 2 : 0) + (a.inLegacyApp ? 1 : 0)
        const bScore = (b.inNewApp ? 2 : 0) + (b.inLegacyApp ? 1 : 0)
        if (bScore !== aScore) return bScore - aScore
        // Then by new app status
        const statusOrder = { live: 0, beta: 1, testing: 2, not_available: 3 }
        return (statusOrder[a.newAppStatus] || 3) - (statusOrder[b.newAppStatus] || 3)
      })
    } else {
      lane.courses.sort((a, b) => getCompletedSeeds(b) - getCompletedSeeds(a))
    }
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

const productionCount = computed(() => {
  // Count courses in production (deployed to any app)
  return pipelineLanes.value.find(l => l.key === 'production')?.courses.length || 0
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Hidden toggle button */
.hidden-toggle {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: var(--pb-surface);
  border: 1px solid var(--pb-border);
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--pb-text-muted);
  transition: all 0.2s;
}

.hidden-toggle:hover {
  border-color: rgba(255, 255, 255, 0.15);
  color: var(--pb-text-dim);
}

.hidden-toggle.active {
  background: rgba(139, 92, 246, 0.15);
  border-color: #8b5cf6;
  color: #8b5cf6;
}

/* Not started indicator */
.not-started-indicator {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: var(--pb-surface);
  border: 1px solid var(--pb-border);
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--pb-text-muted);
}

.indicator-dot {
  width: 6px;
  height: 6px;
  background: #64748b;
  border-radius: 50%;
}

/* Compact mode toggle */
.compact-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: var(--pb-surface);
  border: 1px solid var(--pb-border);
  border-radius: 8px;
  cursor: pointer;
  color: var(--pb-text-muted);
  transition: all 0.2s;
}

.compact-toggle:hover {
  border-color: rgba(255, 255, 255, 0.15);
  color: var(--pb-text-dim);
}

.compact-toggle.active {
  background: rgba(59, 130, 246, 0.15);
  border-color: #3b82f6;
  color: #3b82f6;
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
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  flex: 1;
  background: var(--pb-border);
  overflow-x: auto;
}

@media (max-width: 1200px) {
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

.course-card.hidden {
  opacity: 0.5;
  border-style: dashed;
}

/* Compact Card Mode */
.course-card.compact {
  padding: 0.5rem 0.75rem;
}

.compact-content {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.compact-language {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--pb-text);
}

.compact-for {
  font-size: 0.625rem;
  color: var(--pb-text-muted);
  font-style: italic;
}

.compact-speakers {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--pb-text-dim);
}

.compact-status-badge {
  margin-left: auto;
  font-size: 0.5625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}

.compact-status-badge.testing {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}

.compact-status-badge.beta {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.compact-status-badge.live {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

/* App Status Badge (full card mode) */
.app-status-badge {
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.1875rem 0.5rem;
  border-radius: 4px;
}

.app-status-badge.testing {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}

.app-status-badge.beta {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.app-status-badge.live {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

/* Production Column: Dual Deploy Status */
.card-deploy-status {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--pb-border);
}

.deploy-badge {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  background: var(--pb-surface);
  border-radius: 6px;
  opacity: 0.4;
  transition: opacity 0.2s;
}

.deploy-badge.active {
  opacity: 1;
}

.deploy-badge.new-app {
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.deploy-badge.new-app.active {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.5);
}

.deploy-badge.legacy-app {
  border: 1px solid rgba(6, 182, 212, 0.3);
}

.deploy-badge.legacy-app.active {
  background: rgba(6, 182, 212, 0.1);
  border-color: rgba(6, 182, 212, 0.5);
}

.deploy-label {
  font-size: 0.5625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--pb-text-muted);
}

.deploy-status {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--pb-text-muted);
}

.deploy-status.testing {
  color: #94a3b8;
}

.deploy-status.beta {
  color: #fbbf24;
}

.deploy-status.live {
  color: #10b981;
}

/* Compact mode legacy badge */
.compact-status-badge.legacy {
  background: rgba(6, 182, 212, 0.2);
  border-left: 2px solid #06b6d4;
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

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.card-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.625rem;
  color: var(--pb-text-muted);
  letter-spacing: 0.02em;
}

.hide-btn,
.unhide-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--pb-text-muted);
  opacity: 0;
  transition: all 0.15s;
}

.course-card:hover .hide-btn,
.course-card:hover .unhide-btn {
  opacity: 1;
}

.hide-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.unhide-btn {
  opacity: 1;
  color: #8b5cf6;
}

.unhide-btn:hover {
  background: rgba(139, 92, 246, 0.2);
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
