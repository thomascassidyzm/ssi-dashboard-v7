<template>
  <div class="course-command-center">
    <!-- Pipeline Status Overview -->
    <div class="pipeline-overview">
      <div class="pipeline-header">
        <h3 class="pipeline-title">Pipeline Status</h3>
        <span class="total-count">{{ courses.length }} courses</span>
      </div>

      <div class="status-rail">
        <button
          v-for="bucket in statusBuckets"
          :key="bucket.key"
          class="status-chip"
          :class="{
            active: activeFilter === bucket.key,
            empty: bucket.count === 0
          }"
          :data-status="bucket.key"
          @click="toggleFilter(bucket.key)"
        >
          <span class="chip-indicator" :class="bucket.indicatorClass"></span>
          <span class="chip-label">{{ bucket.label }}</span>
          <span class="chip-count">{{ bucket.count }}</span>
        </button>
      </div>

      <!-- Active filter indicator -->
      <Transition name="filter-bar">
        <div v-if="activeFilter" class="active-filter-bar">
          <span class="filter-label">Showing: {{ activeFilterLabel }}</span>
          <button class="clear-filter" @click="clearFilter">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
            Clear
          </button>
        </div>
      </Transition>
    </div>

    <!-- Search and Controls -->
    <div class="controls-bar">
      <div class="search-field">
        <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search courses..."
          class="search-input"
        />
        <Transition name="fade">
          <span v-if="searchQuery" class="search-meta">
            {{ filteredCourses.length }}<span class="search-meta-dim">/{{ courses.length }}</span>
          </span>
        </Transition>
        <Transition name="fade">
          <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </Transition>
      </div>

      <div class="view-controls">
        <span class="sort-label">Sort:</span>
        <button
          class="sort-btn"
          :class="{ active: sortColumn === 'priority' }"
          @click="setSort('priority')"
        >
          Priority
        </button>
        <button
          class="sort-btn"
          :class="{ active: sortColumn === 'name' }"
          @click="setSort('name')"
        >
          A–Z
        </button>
        <button
          class="sort-btn"
          :class="{ active: sortColumn === 'build' }"
          @click="setSort('build')"
        >
          Build
        </button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="state-container">
      <div class="loading-animation">
        <div class="loading-bar"></div>
        <div class="loading-bar"></div>
        <div class="loading-bar"></div>
      </div>
      <span class="state-text">Loading courses...</span>
    </div>

    <!-- Empty state -->
    <div v-else-if="!courses || courses.length === 0" class="state-container">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      </div>
      <span class="state-text">No courses found</span>
    </div>

    <!-- No results state -->
    <div v-else-if="displayedCourses.length === 0" class="state-container">
      <span class="state-text">No courses match your criteria</span>
      <button class="reset-btn" @click="resetFilters">Reset filters</button>
    </div>

    <!-- Course List -->
    <div v-else class="course-list">
      <!-- Grouped display when filter is active -->
      <template v-if="!activeFilter">
        <template v-for="group in groupedCourses" :key="group.key">
          <div v-if="group.courses.length > 0" class="course-group">
            <div class="group-header" :data-priority="group.priority">
              <span class="group-indicator" :class="group.indicatorClass"></span>
              <span class="group-label">{{ group.label }}</span>
              <span class="group-count">{{ group.courses.length }}</span>
              <div class="group-line"></div>
            </div>
            <TransitionGroup name="list" tag="div" class="group-courses">
              <div
                v-for="course in group.courses"
                :key="course.code"
                class="course-card"
                :class="{ attention: needsAttention(course) }"
                @click="handleRowClick(course.code)"
              >
                <div class="card-main">
                  <div class="course-identity">
                    <span class="course-name">{{ course.name }}</span>
                    <span class="course-code">{{ course.code }}</span>
                  </div>

                  <div class="card-status">
                    <BuildProgressIndicator
                      :stats="course.stats"
                      :content-status="course.contentStatus"
                      :target-seeds="course.targetSeeds || 260"
                    />
                  </div>

                  <div class="card-platforms">
                    <PlatformStatusBadge
                      :status="course.newAppStatus || 'not_available'"
                      :beta-days="course.newAppBetaDays"
                      :editable="true"
                      platform="new_app"
                      @update="handleStatusUpdate(course.code, $event)"
                    />
                    <PlatformStatusBadge
                      :status="course.legacyAppStatus || 'not_available'"
                      :beta-days="course.legacyAppBetaDays"
                      :editable="true"
                      platform="legacy_app"
                      :new-app-status="course.newAppStatus"
                      @update="handleStatusUpdate(course.code, $event)"
                    />
                  </div>
                </div>

                <button class="card-actions" @click.stop="openMenu(course.code, $event)" title="More options">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
                    <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                    <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
                  </svg>
                </button>
              </div>
            </TransitionGroup>
          </div>
        </template>
      </template>

      <!-- Flat display when filter is active -->
      <template v-else>
        <TransitionGroup name="list" tag="div" class="flat-list">
          <div
            v-for="course in displayedCourses"
            :key="course.code"
            class="course-card"
            :class="{ attention: needsAttention(course) }"
            @click="handleRowClick(course.code)"
          >
            <div class="card-main">
              <div class="course-identity">
                <span class="course-name">{{ course.name }}</span>
                <span class="course-code">{{ course.code }}</span>
              </div>

              <div class="card-status">
                <BuildProgressIndicator
                  :stats="course.stats"
                  :content-status="course.contentStatus"
                  :target-seeds="course.targetSeeds || 260"
                />
              </div>

              <div class="card-platforms">
                <PlatformStatusBadge
                  :status="course.newAppStatus || 'not_available'"
                  :beta-days="course.newAppBetaDays"
                  :editable="true"
                  platform="new_app"
                  @update="handleStatusUpdate(course.code, $event)"
                />
                <PlatformStatusBadge
                  :status="course.legacyAppStatus || 'not_available'"
                  :beta-days="course.legacyAppBetaDays"
                  :editable="true"
                  platform="legacy_app"
                  :new-app-status="course.newAppStatus"
                  @update="handleStatusUpdate(course.code, $event)"
                />
              </div>
            </div>

            <button class="card-actions" @click.stop="openMenu(course.code, $event)" title="More options">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
                <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </TransitionGroup>
      </template>
    </div>

    <!-- Context menu -->
    <Teleport to="body">
      <Transition name="menu">
        <div
          v-if="menuOpen"
          class="context-menu"
          :style="menuPosition"
          ref="contextMenu"
        >
          <button class="menu-item" @click="viewCourse">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            View Course
          </button>
          <button class="menu-item" @click="goToAudioPipeline">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            Audio Pipeline
          </button>
          <div class="menu-divider"></div>
          <button class="menu-item danger" @click="deprecateCourse">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Deprecate
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import PlatformStatusBadge from './PlatformStatusBadge.vue'
import BuildProgressIndicator from './BuildProgressIndicator.vue'

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

const emit = defineEmits(['update-status'])

const router = useRouter()
const menuOpen = ref(false)
const menuCourseCode = ref(null)
const menuPosition = ref({ top: '0px', left: '0px' })
const contextMenu = ref(null)

// Search, filter, and sort state
const searchQuery = ref('')
const activeFilter = ref(null)
const sortColumn = ref('priority') // Smart default: priority sort

// Get derived build status from stats
function getBuildStatus(course) {
  const stats = course.stats || {}
  if (stats.audio > 0) return 'ready'
  if (stats.phrases > 0) return 'audio_pending'
  if (stats.legos > 0) return 'building'
  if (stats.completedSeeds > 0) return 'seeds_only'
  return 'empty'
}

// Check if course needs attention (for visual emphasis)
function needsAttention(course) {
  const buildStatus = getBuildStatus(course)
  return buildStatus === 'audio_pending' || buildStatus === 'building'
}

// Priority score (lower = needs more attention)
function getPriorityScore(course) {
  const buildStatus = getBuildStatus(course)
  const newApp = course.newAppStatus || 'not_available'
  const legacyApp = course.legacyAppStatus || 'not_available'

  // Highest priority: audio pending (ready for next step)
  if (buildStatus === 'audio_pending') return 1

  // High priority: building (active work)
  if (buildStatus === 'building') return 2

  // Medium priority: ready but not deployed
  if (buildStatus === 'ready' && newApp === 'not_available') return 3

  // Medium-low: ready, in beta (needs testing)
  if (buildStatus === 'ready' && newApp === 'beta') return 4

  // Lower: ready and live but legacy needs work
  if (buildStatus === 'ready' && newApp === 'live' && legacyApp !== 'live') return 5

  // Seeds only
  if (buildStatus === 'seeds_only') return 6

  // Empty courses
  if (buildStatus === 'empty') return 7

  // Fully deployed (lowest priority - done!)
  return 8
}

// Status buckets for the filter rail
const statusBuckets = computed(() => {
  const courses = props.courses || []

  const buckets = [
    {
      key: 'audio_pending',
      label: 'Audio Pending',
      indicatorClass: 'indicator-audio-pending',
      count: 0
    },
    {
      key: 'building',
      label: 'Building',
      indicatorClass: 'indicator-building',
      count: 0
    },
    {
      key: 'ready_not_deployed',
      label: 'Ready',
      indicatorClass: 'indicator-ready',
      count: 0
    },
    {
      key: 'in_beta',
      label: 'Beta',
      indicatorClass: 'indicator-beta',
      count: 0
    },
    {
      key: 'needs_legacy',
      label: 'Legacy Testing',
      indicatorClass: 'indicator-legacy',
      count: 0
    },
    {
      key: 'live',
      label: 'Live',
      indicatorClass: 'indicator-live',
      count: 0
    }
  ]

  courses.forEach(course => {
    const buildStatus = getBuildStatus(course)
    const newApp = course.newAppStatus || 'not_available'
    const legacyApp = course.legacyAppStatus || 'not_available'

    if (buildStatus === 'audio_pending') {
      buckets[0].count++
    } else if (buildStatus === 'building' || buildStatus === 'seeds_only') {
      buckets[1].count++
    } else if (buildStatus === 'ready') {
      if (newApp === 'not_available' || newApp === 'draft') {
        buckets[2].count++
      } else if (newApp === 'beta') {
        buckets[3].count++
      } else if (newApp === 'live' && legacyApp !== 'live') {
        buckets[4].count++
      } else if (newApp === 'live' && legacyApp === 'live') {
        buckets[5].count++
      }
    }
  })

  return buckets
})

// Active filter label
const activeFilterLabel = computed(() => {
  if (!activeFilter.value) return ''
  const bucket = statusBuckets.value.find(b => b.key === activeFilter.value)
  return bucket ? bucket.label : ''
})

// Filter courses by search query
const filteredCourses = computed(() => {
  let courses = props.courses || []

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    courses = courses.filter(course => {
      const name = (course.name || '').toLowerCase()
      const code = (course.code || '').toLowerCase()
      return name.includes(query) || code.includes(query)
    })
  }

  // Apply status filter
  if (activeFilter.value) {
    courses = courses.filter(course => {
      const buildStatus = getBuildStatus(course)
      const newApp = course.newAppStatus || 'not_available'
      const legacyApp = course.legacyAppStatus || 'not_available'

      switch (activeFilter.value) {
        case 'audio_pending':
          return buildStatus === 'audio_pending'
        case 'building':
          return buildStatus === 'building' || buildStatus === 'seeds_only'
        case 'ready_not_deployed':
          return buildStatus === 'ready' && (newApp === 'not_available' || newApp === 'draft')
        case 'in_beta':
          return buildStatus === 'ready' && newApp === 'beta'
        case 'needs_legacy':
          return buildStatus === 'ready' && newApp === 'live' && legacyApp !== 'live'
        case 'live':
          return buildStatus === 'ready' && newApp === 'live' && legacyApp === 'live'
        default:
          return true
      }
    })
  }

  return courses
})

// Sort filtered courses
const sortedCourses = computed(() => {
  const courses = [...filteredCourses.value]

  return courses.sort((a, b) => {
    switch (sortColumn.value) {
      case 'priority':
        const aPriority = getPriorityScore(a)
        const bPriority = getPriorityScore(b)
        if (aPriority !== bPriority) return aPriority - bPriority
        return (a.name || '').localeCompare(b.name || '')

      case 'name':
        return (a.name || '').localeCompare(b.name || '')

      case 'build':
        const buildOrder = { ready: 0, audio_pending: 1, building: 2, seeds_only: 3, empty: 4 }
        const aBuild = buildOrder[getBuildStatus(a)] ?? 4
        const bBuild = buildOrder[getBuildStatus(b)] ?? 4
        if (aBuild !== bBuild) return aBuild - bBuild
        return (a.name || '').localeCompare(b.name || '')

      default:
        return (a.name || '').localeCompare(b.name || '')
    }
  })
})

// Displayed courses (final output)
const displayedCourses = computed(() => sortedCourses.value)

// Grouped courses for default view
const groupedCourses = computed(() => {
  const courses = sortedCourses.value

  const groups = [
    {
      key: 'attention',
      label: 'Needs Attention',
      priority: 'high',
      indicatorClass: 'indicator-attention',
      courses: []
    },
    {
      key: 'in_progress',
      label: 'In Progress',
      priority: 'medium',
      indicatorClass: 'indicator-progress',
      courses: []
    },
    {
      key: 'deployed',
      label: 'Deployed',
      priority: 'low',
      indicatorClass: 'indicator-deployed',
      courses: []
    }
  ]

  courses.forEach(course => {
    const score = getPriorityScore(course)
    if (score <= 2) {
      groups[0].courses.push(course)
    } else if (score <= 5) {
      groups[1].courses.push(course)
    } else {
      groups[2].courses.push(course)
    }
  })

  return groups
})

function toggleFilter(key) {
  activeFilter.value = activeFilter.value === key ? null : key
}

function clearFilter() {
  activeFilter.value = null
}

function resetFilters() {
  activeFilter.value = null
  searchQuery.value = ''
}

function setSort(column) {
  sortColumn.value = column
}

function handleRowClick(code) {
  router.push(`/production/${code}`)
}

function handleStatusUpdate(courseCode, { platform, status }) {
  emit('update-status', { courseCode, platform, status })
}

function openMenu(courseCode, event) {
  menuCourseCode.value = courseCode
  const rect = event.target.getBoundingClientRect()
  menuPosition.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left - 140}px`
  }
  menuOpen.value = true
}

function closeMenu() {
  menuOpen.value = false
  menuCourseCode.value = null
}

function viewCourse() {
  if (menuCourseCode.value) {
    router.push(`/production/${menuCourseCode.value}`)
  }
  closeMenu()
}

function goToAudioPipeline() {
  if (menuCourseCode.value) {
    router.push(`/production/${menuCourseCode.value}/audio`)
  }
  closeMenu()
}

function deprecateCourse() {
  if (menuCourseCode.value) {
    emit('update-status', {
      courseCode: menuCourseCode.value,
      platform: 'new_app',
      status: 'deprecated'
    })
    emit('update-status', {
      courseCode: menuCourseCode.value,
      platform: 'legacy_app',
      status: 'deprecated'
    })
  }
  closeMenu()
}

function handleClickOutside(event) {
  if (menuOpen.value && contextMenu.value && !contextMenu.value.contains(event.target)) {
    closeMenu()
  }
}

function handleEscape(event) {
  if (event.key === 'Escape') {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
/* CSS Custom Properties */
.course-command-center {
  --cc-bg-deep: #0a0f1a;
  --cc-bg-surface: #0f172a;
  --cc-bg-elevated: #1e293b;
  --cc-bg-hover: #334155;
  --cc-border: #1e3a5f;
  --cc-border-subtle: rgba(59, 130, 246, 0.15);
  --cc-text-primary: #f1f5f9;
  --cc-text-secondary: #94a3b8;
  --cc-text-muted: #64748b;
  --cc-accent: #3b82f6;
  --cc-accent-glow: rgba(59, 130, 246, 0.3);
  --cc-success: #10b981;
  --cc-warning: #f59e0b;
  --cc-danger: #ef4444;
  --cc-purple: #8b5cf6;

  width: 100%;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Pipeline Overview Section */
.pipeline-overview {
  padding: 1.25rem 1rem 1rem;
  background: linear-gradient(180deg, var(--cc-bg-deep) 0%, var(--cc-bg-surface) 100%);
  border-bottom: 1px solid var(--cc-border-subtle);
}

.pipeline-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.875rem;
}

.pipeline-title {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--cc-text-muted);
  margin: 0;
}

.total-count {
  font-size: 0.6875rem;
  color: var(--cc-text-muted);
  font-variant-numeric: tabular-nums;
}

/* Status Rail */
.status-rail {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: var(--cc-bg-elevated);
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
}

.status-chip:hover:not(.empty) {
  background: var(--cc-bg-hover);
  border-color: var(--cc-border);
}

.status-chip.active {
  background: var(--cc-accent-glow);
  border-color: var(--cc-accent);
}

.status-chip.empty {
  opacity: 0.4;
  cursor: default;
}

.chip-indicator {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.chip-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--cc-text-secondary);
}

.status-chip.active .chip-label {
  color: var(--cc-text-primary);
}

.chip-count {
  font-size: 0.6875rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--cc-text-muted);
  background: var(--cc-bg-surface);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  min-width: 1.25rem;
  text-align: center;
}

.status-chip.active .chip-count {
  background: var(--cc-accent);
  color: white;
}

/* Status indicator colors */
.indicator-audio-pending { background: var(--cc-purple); }
.indicator-building { background: var(--cc-warning); }
.indicator-ready { background: var(--cc-accent); }
.indicator-beta { background: #06b6d4; }
.indicator-legacy { background: #f97316; }
.indicator-live { background: var(--cc-success); }
.indicator-attention { background: var(--cc-purple); }
.indicator-progress { background: var(--cc-accent); }
.indicator-deployed { background: var(--cc-success); }

/* Active Filter Bar */
.active-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--cc-accent-glow);
  border: 1px solid var(--cc-accent);
  border-radius: 6px;
}

.filter-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--cc-text-primary);
}

.clear-filter {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid var(--cc-accent);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--cc-accent);
  font-family: inherit;
  transition: all 0.15s;
}

.clear-filter:hover {
  background: var(--cc-accent);
  color: white;
}

/* Controls Bar */
.controls-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--cc-bg-surface);
  border-bottom: 1px solid var(--cc-border-subtle);
}

.search-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  max-width: 320px;
  padding: 0.5rem 0.75rem;
  background: var(--cc-bg-elevated);
  border: 1px solid transparent;
  border-radius: 8px;
  transition: all 0.2s;
}

.search-field:focus-within {
  border-color: var(--cc-accent);
  box-shadow: 0 0 0 3px var(--cc-accent-glow);
}

.search-icon {
  color: var(--cc-text-muted);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--cc-text-primary);
  font-size: 0.8125rem;
  font-family: inherit;
}

.search-input::placeholder {
  color: var(--cc-text-muted);
}

.search-meta {
  font-size: 0.6875rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--cc-text-secondary);
}

.search-meta-dim {
  color: var(--cc-text-muted);
}

.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: var(--cc-bg-hover);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--cc-text-muted);
  transition: all 0.15s;
}

.search-clear:hover {
  background: var(--cc-danger);
  color: white;
}

.view-controls {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.sort-label {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--cc-text-muted);
  margin-right: 0.25rem;
}

.sort-btn {
  padding: 0.375rem 0.625rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--cc-text-muted);
  font-family: inherit;
  transition: all 0.15s;
}

.sort-btn:hover {
  color: var(--cc-text-secondary);
  background: var(--cc-bg-elevated);
}

.sort-btn.active {
  color: var(--cc-accent);
  background: var(--cc-accent-glow);
  border-color: var(--cc-accent);
}

/* State Containers */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem 1rem;
  color: var(--cc-text-muted);
}

.loading-animation {
  display: flex;
  gap: 4px;
}

.loading-bar {
  width: 4px;
  height: 20px;
  background: var(--cc-accent);
  border-radius: 2px;
  animation: loading-pulse 1s ease-in-out infinite;
}

.loading-bar:nth-child(2) {
  animation-delay: 0.15s;
}

.loading-bar:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes loading-pulse {
  0%, 100% {
    transform: scaleY(0.5);
    opacity: 0.5;
  }
  50% {
    transform: scaleY(1);
    opacity: 1;
  }
}

.empty-icon {
  color: var(--cc-text-muted);
  opacity: 0.5;
}

.state-text {
  font-size: 0.875rem;
}

.reset-btn {
  padding: 0.5rem 1rem;
  background: var(--cc-bg-elevated);
  border: 1px solid var(--cc-border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--cc-text-secondary);
  font-family: inherit;
  transition: all 0.15s;
}

.reset-btn:hover {
  background: var(--cc-bg-hover);
  color: var(--cc-text-primary);
}

/* Course List */
.course-list {
  padding: 0.5rem;
}

.flat-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

/* Course Groups */
.course-group {
  margin-bottom: 1rem;
}

.course-group:last-child {
  margin-bottom: 0;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.5rem 0.375rem;
}

.group-indicator {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.group-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--cc-text-muted);
}

.group-header[data-priority="high"] .group-label {
  color: var(--cc-purple);
}

.group-header[data-priority="medium"] .group-label {
  color: var(--cc-accent);
}

.group-count {
  font-size: 0.625rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--cc-text-muted);
  background: var(--cc-bg-elevated);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}

.group-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--cc-border-subtle), transparent);
  margin-left: 0.5rem;
}

.group-courses {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

/* Course Card */
.course-card {
  display: flex;
  align-items: center;
  padding: 0.625rem 0.75rem;
  background: var(--cc-bg-elevated);
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.course-card:hover {
  background: var(--cc-bg-hover);
  border-color: var(--cc-border);
  transform: translateX(2px);
}

.course-card.attention {
  border-left: 3px solid var(--cc-purple);
}

.card-main {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 1rem;
  min-width: 0;
}

.course-identity {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 180px;
  flex: 1;
}

.course-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--cc-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.course-code {
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 0.625rem;
  color: var(--cc-text-muted);
  letter-spacing: 0.02em;
}

.card-status {
  min-width: 140px;
}

.card-platforms {
  display: flex;
  gap: 0.5rem;
  min-width: 200px;
}

.card-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--cc-text-muted);
  transition: all 0.15s;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.card-actions:hover {
  background: var(--cc-bg-surface);
  color: var(--cc-text-primary);
}

/* Context Menu */
.context-menu {
  position: fixed;
  min-width: 160px;
  background: var(--cc-bg-elevated);
  border: 1px solid var(--cc-border);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
  z-index: 10000;
  overflow: hidden;
  backdrop-filter: blur(8px);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--cc-text-primary);
  font-size: 0.8125rem;
  font-family: inherit;
  text-align: left;
  transition: background 0.15s;
}

.menu-item:hover {
  background: var(--cc-bg-hover);
}

.menu-item.danger {
  color: var(--cc-danger);
}

.menu-item.danger:hover {
  background: rgba(239, 68, 68, 0.15);
}

.menu-divider {
  height: 1px;
  background: var(--cc-border);
  margin: 0.25rem 0;
}

/* Transitions */
.filter-bar-enter-active,
.filter-bar-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.filter-bar-enter-from,
.filter-bar-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.list-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-12px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

.list-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.menu-enter-active,
.menu-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}

/* Responsive */
@media (max-width: 900px) {
  .card-platforms {
    flex-direction: column;
    gap: 0.25rem;
    min-width: auto;
  }

  .card-status {
    min-width: auto;
  }
}

@media (max-width: 768px) {
  .controls-bar {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }

  .search-field {
    max-width: none;
  }

  .view-controls {
    justify-content: center;
  }

  .card-main {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .course-identity {
    flex-basis: 100%;
  }

  .card-platforms {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
