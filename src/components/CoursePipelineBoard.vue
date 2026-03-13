<template>
  <div class="pipeline-board">
    <!-- Header -->
    <div class="board-header">
      <div class="header-left">
        <span class="course-count">
          <template v-if="stageFilter || searchQuery.trim()">{{ sortedCourses.length }} of </template>{{ courses.length }} courses
          <button v-if="stageFilter" class="clear-filter" @click="stageFilter = null" title="Clear filter">&times;</button>
        </span>
      </div>
      <div class="header-right">
        <!-- Stage legend (clickable filters) -->
        <div class="stage-legend">
          <button
            class="legend-item"
            :class="{ active: stageFilter === s.key }"
            v-for="s in stageLegend"
            :key="s.key"
            @click="toggleStageFilter(s.key)"
          >
            <span class="legend-dot" :style="{ background: s.color }"></span>
            <span class="legend-label">{{ s.label }}</span>
            <span class="legend-count">{{ stageCounts[s.key] || 0 }}</span>
          </button>
        </div>

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

    <!-- Column Headers -->
    <div class="table-header">
      <span class="th th-course" @click="toggleSort('alpha')">
        Course
        <svg v-if="sortBy === 'alpha'" class="sort-arrow" :class="{ desc: sortDesc }" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
      </span>
      <span class="th th-seeds" @click="toggleSort('seeds')">
        Seeds
        <svg v-if="sortBy === 'seeds'" class="sort-arrow" :class="{ desc: sortDesc }" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
      </span>
      <span class="th th-legos" @click="toggleSort('legos')">
        LEGOs
        <svg v-if="sortBy === 'legos'" class="sort-arrow" :class="{ desc: sortDesc }" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
      </span>
      <span class="th th-phrases" @click="toggleSort('phrases')">
        Phrases
        <svg v-if="sortBy === 'phrases'" class="sort-arrow" :class="{ desc: sortDesc }" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
      </span>
      <span class="th th-audio" @click="toggleSort('audio')">
        Audio
        <svg v-if="sortBy === 'audio'" class="sort-arrow" :class="{ desc: sortDesc }" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
      </span>
      <span class="th th-apps">Apps</span>
    </div>

    <!-- Course Rows -->
    <div class="table-body">
      <TransitionGroup name="row" tag="div">
        <div
          v-for="(course, idx) in sortedCourses"
          :key="course.code"
          class="course-row"
          :class="{ active: activeCourse === course.code, 'row-even': idx % 2 === 1 }"
          :style="{ borderLeftColor: getStageColor(course) }"
          @click="handleCourseClick(course)"
          @mouseenter="activeCourse = course.code"
          @mouseleave="activeCourse = null"
        >
          <!-- Course code + name -->
          <span class="cell cell-course">
            <span class="course-code-label">{{ course.code }}</span>
            <span class="course-name-label">{{ getFullCourseName(course.code) }}</span>
          </span>

          <!-- Seeds count + pipeline journey -->
          <span class="cell cell-seeds">
            <span class="seeds-text">
              <span class="seeds-count">{{ getCompletedSeeds(course) }}</span>
              <span class="seeds-sep">/</span>
              <span class="seeds-target">{{ course.targetSeeds || 300 }}</span>
            </span>
            <span class="pipeline-grid">
              <span
                v-for="(block, i) in getPipelineBlocks(course)"
                :key="i"
                class="grid-block"
                :class="{ filled: block.filled, 'stage-start': block.isStageStart }"
                :style="{ background: block.filled ? block.color : undefined }"
              ></span>
            </span>
          </span>

          <!-- LEGOs -->
          <span class="cell cell-legos mono">{{ formatNumber(course.stats?.legos || 0) }}</span>

          <!-- Phrases -->
          <span class="cell cell-phrases mono">{{ formatNumber(course.stats?.phrases || 0) }}</span>

          <!-- Audio -->
          <span class="cell cell-audio mono">{{ formatNumber(course.stats?.audio || 0) }}</span>

          <!-- App status badges -->
          <span class="cell cell-apps">
            <button
              class="app-badge"
              :class="[
                getNormalizedNewAppStatus(course) !== 'not_available' ? 'active' : 'inactive',
                'status-' + getNormalizedNewAppStatus(course)
              ]"
              @click.stop="cycleNewAppStatus(course)"
              title="Click to change New App status"
            >
              N
            </button>
            <button
              class="app-badge legacy"
              :class="[
                getNormalizedLegacyStatus(course) !== 'not_available' ? 'active' : 'inactive',
                'status-' + getNormalizedLegacyStatus(course)
              ]"
              @click.stop="cycleLegacyStatus(course)"
              title="Click to change Legacy App status"
            >
              L
            </button>
          </span>
        </div>
      </TransitionGroup>

      <!-- Empty state -->
      <div v-if="sortedCourses.length === 0" class="empty-state">
        <span class="empty-text">{{ searchQuery ? 'No courses match your search' : 'No courses yet' }}</span>
      </div>
    </div>

    <!-- Summary Footer -->
    <div class="board-footer">
      <div class="footer-stat">
        <span class="footer-value">{{ totalSeeds.toLocaleString() }}</span>
        <span class="footer-label">Seeds Built</span>
      </div>
      <div class="footer-divider"></div>
      <div class="footer-stat">
        <span class="footer-value">{{ totalPhrases.toLocaleString() }}</span>
        <span class="footer-label">Phrases</span>
      </div>
      <div class="footer-divider"></div>
      <div class="footer-stat">
        <span class="footer-value">{{ totalAudio.toLocaleString() }}</span>
        <span class="footer-label">Audio Files</span>
      </div>
      <div class="footer-divider"></div>
      <div class="footer-stat highlight">
        <span class="footer-value">{{ productionCount }}</span>
        <span class="footer-label">Live</span>
      </div>
    </div>

    <!-- Toast Notification -->
    <Transition name="toast">
      <div v-if="toastVisible" class="toast-notification">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCourses } from '../composables/useCourses'

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

const emit = defineEmits(['action', 'updateLegacyStatus', 'updateNewAppStatus', 'deployToProduction'])
const router = useRouter()
const { getCourseName } = useCourses()

const searchQuery = ref('')
const searchFocused = ref(false)
const activeCourse = ref(null)
const stageFilter = ref(null)

function toggleStageFilter(key) {
  stageFilter.value = stageFilter.value === key ? null : key
}

// Sort state
const SORT_STORAGE_KEY = 'ssi-pipeline-sort'
const sortBy = ref(localStorage.getItem(SORT_STORAGE_KEY) || 'alpha')
const sortDesc = ref(localStorage.getItem(SORT_STORAGE_KEY + '-desc') === 'true')

watch([sortBy, sortDesc], ([newSort, newDesc]) => {
  localStorage.setItem(SORT_STORAGE_KEY, newSort)
  localStorage.setItem(SORT_STORAGE_KEY + '-desc', String(newDesc))
})

function toggleSort(field) {
  if (sortBy.value === field) {
    sortDesc.value = !sortDesc.value
  } else {
    sortBy.value = field
    sortDesc.value = field !== 'alpha' // default desc for numeric, asc for alpha
  }
}

// Toast
const toastMessage = ref('')
const toastVisible = ref(false)

function showToast(message) {
  toastMessage.value = message
  toastVisible.value = true
  setTimeout(() => { toastVisible.value = false }, 2500)
}

function getFullCourseName(code) {
  return getCourseName(code)
}

function getCompletedSeeds(course) {
  return course.stats?.completedSeeds || 0
}

function getProgress(course) {
  const target = course.targetSeeds || 300
  const completed = getCompletedSeeds(course)
  return Math.min(100, Math.round((completed / target) * 100))
}

function getPipelineSegments(course) {
  const stage = getStage(course)
  const stats = course.stats || {}
  const targetSeeds = course.targetSeeds || 300
  const completedSeeds = getCompletedSeeds(course)
  const phrases = stats.phrases || 0
  const audio = stats.audio || 0

  const segDefs = [
    { key: 'building', color: '#f59e0b' },
    { key: 'review',   color: '#a855f7' },
    { key: 'audio',    color: '#3b82f6' },
    { key: 'staging',  color: '#f97316' },
    { key: 'live',     color: '#10b981' }
  ]

  const stageIdx = segDefs.findIndex(d => d.key === stage) // -1 for not_started

  return segDefs.map((def, i) => {
    let fill = 0
    if (stageIdx < 0) {
      fill = 0
    } else if (i < stageIdx) {
      fill = 100
    } else if (i === stageIdx) {
      if (def.key === 'building') {
        fill = Math.min(100, Math.round((completedSeeds / targetSeeds) * 100))
      } else if (def.key === 'audio') {
        fill = phrases > 0 ? Math.min(100, Math.round((audio / (phrases * 2)) * 100)) : 0
      } else if (def.key === 'staging') {
        fill = course.exportReady ? 100 : 50
      } else {
        fill = 100
      }
    }
    return { fill, color: def.color }
  })
}

function getPipelineBlocks(course) {
  const segments = getPipelineSegments(course)
  const blocks = []
  for (const seg of segments) {
    const filledCount = Math.round((seg.fill / 100) * 6)
    for (let i = 0; i < 6; i++) {
      blocks.push({
        color: seg.color,
        filled: i < filledCount,
        isStageStart: i === 0
      })
    }
  }
  return blocks
}

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

// Stage logic
const stageConfig = {
  not_started:{ color: '#475569', label: 'Not Started' },
  building:   { color: '#f59e0b', label: 'Building' },
  review:     { color: '#a855f7', label: 'Review' },
  audio:      { color: '#3b82f6', label: 'Audio' },
  staging:    { color: '#f97316', label: 'Staging' },
  live:       { color: '#10b981', label: 'Live' }
}

const stageLegend = [
  { key: 'not_started',color: '#475569', label: 'Not Started' },
  { key: 'building',   color: '#f59e0b', label: 'Building' },
  { key: 'review',     color: '#a855f7', label: 'Review' },
  { key: 'audio',      color: '#3b82f6', label: 'Audio' },
  { key: 'staging',    color: '#f97316', label: 'Staging' },
  { key: 'live',       color: '#10b981', label: 'Live' }
]

function normalizeAppStatus(s) {
  if (!s || s === 'not_available') return 'not_available'
  if (s === 'draft') return 'testing'
  if (s === 'released') return 'live'
  return s
}

function getNormalizedNewAppStatus(course) {
  return normalizeAppStatus(course.newAppStatus)
}

function getNormalizedLegacyStatus(course) {
  return normalizeAppStatus(course.legacyAppStatus)
}

function getStage(course) {
  // Live — any app deployed
  const newApp = getNormalizedNewAppStatus(course)
  const legacy = getNormalizedLegacyStatus(course)
  if (newApp !== 'not_available' || legacy !== 'not_available') return 'live'

  const stats = course.stats || {}
  const targetSeeds = course.targetSeeds || 300
  const completedSeeds = getCompletedSeeds(course)
  const phrases = stats.phrases || 0
  const audio = stats.audio || 0

  // Staging — export-ready or audio substantially complete
  if (course.exportReady || (audio >= phrases * 2 && audio > 100)) return 'staging'

  // Audio — seeds done, audio generation started
  if (completedSeeds >= targetSeeds && audio > 0) return 'audio'

  // Review — seeds done, phrases exist, no meaningful audio yet
  if (completedSeeds >= targetSeeds && phrases > 0) return 'review'

  // Building — any content exists
  if ((stats.seeds || 0) > 0 || (stats.legos || 0) > 0 || completedSeeds > 0) return 'building'

  return 'not_started'
}

function getStageColor(course) {
  return stageConfig[getStage(course)]?.color || '#475569'
}

function getStageLabel(course) {
  return stageConfig[getStage(course)]?.label || 'Not Started'
}

// Stage counts for legend
const stageCounts = computed(() => {
  const counts = {}
  props.courses.forEach(c => {
    const stage = getStage(c)
    counts[stage] = (counts[stage] || 0) + 1
  })
  return counts
})

// Filter + sort
const sortedCourses = computed(() => {
  let list = props.courses

  // Stage filter
  if (stageFilter.value) {
    list = list.filter(c => getStage(c) === stageFilter.value)
  }

  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(c => {
      const name = getFullCourseName(c.code).toLowerCase()
      const code = (c.code || '').toLowerCase()
      return name.includes(q) || code.includes(q)
    })
  }

  // Sort
  const sorted = [...list]
  sorted.sort((a, b) => {
    let cmp = 0
    switch (sortBy.value) {
      case 'alpha':
        cmp = getFullCourseName(a.code).localeCompare(getFullCourseName(b.code))
        break
      case 'seeds':
        cmp = getCompletedSeeds(a) - getCompletedSeeds(b)
        break
      case 'legos':
        cmp = (a.stats?.legos || 0) - (b.stats?.legos || 0)
        break
      case 'phrases':
        cmp = (a.stats?.phrases || 0) - (b.stats?.phrases || 0)
        break
      case 'audio':
        cmp = (a.stats?.audio || 0) - (b.stats?.audio || 0)
        break
      default:
        cmp = getFullCourseName(a.code).localeCompare(getFullCourseName(b.code))
    }
    return sortDesc.value ? -cmp : cmp
  })

  return sorted
})

// Summary stats
const totalSeeds = computed(() => props.courses.reduce((sum, c) => sum + getCompletedSeeds(c), 0))
const totalPhrases = computed(() => props.courses.reduce((sum, c) => sum + (c.stats?.phrases || 0), 0))
const totalAudio = computed(() => props.courses.reduce((sum, c) => sum + (c.stats?.audio || 0), 0))
const productionCount = computed(() => props.courses.filter(c => getStage(c) === 'live').length)

// Actions
function handleCourseClick(course) {
  router.push(`/production/${course.code}`)
}

// Cycle app statuses
const statusCycle = ['not_available', 'testing', 'beta', 'live']

function cycleNewAppStatus(course) {
  let current = getNormalizedNewAppStatus(course)
  if (!statusCycle.includes(current)) current = 'not_available'
  const nextIndex = (statusCycle.indexOf(current) + 1) % statusCycle.length
  const next = statusCycle[nextIndex]
  showToast(`New App: ${getFullCourseName(course.code)} → ${next === 'not_available' ? 'removed' : next}`)
  emit('updateNewAppStatus', { courseCode: course.code, status: next })
}

function cycleLegacyStatus(course) {
  let current = getNormalizedLegacyStatus(course)
  if (!statusCycle.includes(current)) current = 'not_available'
  const nextIndex = (statusCycle.indexOf(current) + 1) % statusCycle.length
  const next = statusCycle[nextIndex]
  showToast(`Legacy App: ${getFullCourseName(course.code)} → ${next === 'not_available' ? 'removed' : next}`)
  emit('updateLegacyStatus', { courseCode: course.code, status: next })
}
</script>

<style scoped>
.pipeline-board {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  background: var(--color-shadow, #1e293b);
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  overflow: hidden;
}

/* Header */
.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--color-graphite, #475569);
  background: var(--color-slate, #334155);
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.course-count {
  font-size: 0.9375rem;
  color: var(--color-paper-dim, #c1c1bb);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.clear-filter {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: var(--color-paper-dim, #c1c1bb);
  font-size: 0.875rem;
  line-height: 1;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  padding: 0;
}

.clear-filter:hover {
  background: rgba(255, 255, 255, 0.2);
  color: var(--color-paper, #f7f7f2);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Stage legend */
.stage-legend {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 0.1875rem 0.375rem;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  color: inherit;
}

.legend-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}

.legend-item.active {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-label {
  font-size: 0.8125rem;
  color: var(--color-paper-dim, #c1c1bb);
  font-weight: 500;
}

.legend-count {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.75rem;
  color: var(--color-paper, #f7f7f2);
  font-weight: 600;
  min-width: 1rem;
  text-align: center;
}

/* Search */
.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 6px;
  transition: all 0.2s;
}

.search-box.focused {
  border-color: var(--color-tungsten, #ffa630);
  box-shadow: 0 0 0 2px rgba(255, 166, 48, 0.15);
}

.search-icon {
  color: var(--color-paper-dim, #c1c1bb);
  flex-shrink: 0;
}

.search-box input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-paper, #f7f7f2);
  font-size: 0.875rem;
  font-family: inherit;
  width: 140px;
}

.search-box input::placeholder {
  color: var(--color-paper-dim, #c1c1bb);
}

/* Table header */
.table-header {
  display: grid;
  grid-template-columns: 200px 1fr 88px 88px 88px 80px;
  align-items: center;
  padding: 0.5rem 1.25rem;
  padding-left: calc(1.25rem + 3px); /* account for row left-border */
  border-bottom: 1px solid var(--color-graphite, #475569);
  background: var(--color-slate, #334155);
}

.th {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-paper-dim, #c1c1bb);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: color 0.15s;
}

.th:hover {
  color: var(--color-paper, #f7f7f2);
}

.th-legos,
.th-phrases,
.th-audio {
  justify-content: flex-end;
}

.th-apps {
  justify-content: center;
  cursor: default;
}

.sort-arrow {
  flex-shrink: 0;
  transition: transform 0.2s;
}

.sort-arrow.desc {
  transform: rotate(180deg);
}

/* Table body */
.table-body {
  flex: 1;
  overflow-y: auto;
}

/* Course row */
.course-row {
  display: grid;
  grid-template-columns: 200px 1fr 88px 88px 88px 80px;
  align-items: center;
  padding: 0.8125rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: background 0.12s;
}

.course-row.row-even {
  background: rgba(255, 255, 255, 0.02);
}

.course-row:hover,
.course-row.active {
  background: rgba(255, 255, 255, 0.06);
}

.course-row:last-child {
  border-bottom: none;
}

/* Cells */
.cell {
  display: flex;
  align-items: center;
}

.cell.mono {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-paper-dim, #c1c1bb);
  font-variant-numeric: tabular-nums;
  justify-content: flex-end;
}

/* Course code + name */
.cell-course {
  padding-right: 1rem;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
}

.course-code-label {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-tungsten, #ffa630);
  letter-spacing: 0.01em;
}

.course-name-label {
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
  line-height: 1.2;
}

/* Seeds + progress bar — inline single row */
.cell-seeds {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.seeds-text {
  display: flex;
  align-items: baseline;
  gap: 0.125rem;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.seeds-count {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-paper, #f7f7f2);
}

.seeds-sep {
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.seeds-target {
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
}

/* Pipeline grid blocks */
.pipeline-grid {
  display: flex;
  gap: 2px;
  flex: 1;
  min-width: 120px;
}

.grid-block {
  flex: 1;
  height: 10px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.06);
  transition: background 0.3s ease;
}

.grid-block.stage-start {
  margin-left: 3px;
}

.grid-block.stage-start:first-child {
  margin-left: 0;
}

.grid-block.filled {
  opacity: 0.9;
}

/* App badges */
.cell-apps {
  justify-content: center;
  gap: 0.25rem;
}

.app-badge {
  width: 26px;
  height: 22px;
  border-radius: 3px;
  border: 1px solid;
  cursor: pointer;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.6875rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  padding: 0;
}

.app-badge.inactive {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.12);
}

.app-badge.inactive:hover {
  border-color: rgba(255, 255, 255, 0.15);
  color: var(--color-paper-dim, #c1c1bb);
}

/* New App colors */
.app-badge.status-testing {
  background: rgba(148, 163, 184, 0.15);
  border-color: rgba(148, 163, 184, 0.3);
  color: #94a3b8;
}

.app-badge.status-beta {
  background: rgba(251, 191, 36, 0.15);
  border-color: rgba(251, 191, 36, 0.3);
  color: #fbbf24;
}

.app-badge.status-live {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
}

/* Legacy App — slight cyan tint */
.app-badge.legacy.status-testing {
  background: rgba(148, 163, 184, 0.1);
  border-color: rgba(6, 182, 212, 0.25);
  color: #94a3b8;
}

.app-badge.legacy.status-beta {
  background: rgba(6, 182, 212, 0.1);
  border-color: rgba(6, 182, 212, 0.35);
  color: #06b6d4;
}

.app-badge.legacy.status-live {
  background: rgba(6, 182, 212, 0.15);
  border-color: rgba(6, 182, 212, 0.4);
  color: #06b6d4;
}

.app-badge:hover {
  transform: scale(1.1);
}

/* Empty state */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.empty-text {
  font-size: 0.9375rem;
}

/* Footer */
.board-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 0.625rem 1.25rem;
  background: var(--color-slate, #334155);
  border-top: 1px solid var(--color-graphite, #475569);
}

.footer-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.0625rem;
}

.footer-value {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-paper, #f7f7f2);
  font-variant-numeric: tabular-nums;
}

.footer-label {
  font-size: 0.6875rem;
  color: var(--color-paper-dim, #c1c1bb);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.footer-stat.highlight .footer-value {
  color: #10b981;
}

.footer-divider {
  width: 1px;
  height: 24px;
  background: var(--color-graphite, #475569);
}

/* Row transitions */
.row-enter-active,
.row-leave-active {
  transition: all 0.25s ease;
}

.row-enter-from {
  opacity: 0;
  transform: translateX(-8px);
}

.row-leave-to {
  opacity: 0;
  transform: translateX(8px);
}

.row-move {
  transition: transform 0.25s ease;
}

/* Toast */
.toast-notification {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: rgba(16, 185, 129, 0.95);
  color: white;
  border-radius: 6px;
  font-size: 0.9375rem;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  z-index: 9999;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

/* Responsive */
@media (max-width: 900px) {
  .table-header,
  .course-row {
    grid-template-columns: 1fr 100px 60px 60px 64px;
  }
  .th-audio,
  .cell-audio {
    display: none;
  }
  .stage-legend {
    display: none;
  }
}

@media (max-width: 600px) {
  .table-header,
  .course-row {
    grid-template-columns: 1fr 64px;
  }
  .th-legos, .th-phrases, .th-audio, .th-apps,
  .cell-legos, .cell-phrases, .cell-audio, .cell-apps {
    display: none;
  }
  .board-header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }
  .header-right {
    justify-content: space-between;
  }
}
</style>
