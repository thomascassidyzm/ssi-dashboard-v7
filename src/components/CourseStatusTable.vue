<template>
  <div class="course-status-table">
    <!-- Search bar -->
    <div class="search-bar">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search courses..."
        class="search-input"
      />
      <span v-if="searchQuery" class="search-count">{{ filteredCourses.length }} of {{ courses.length }}</span>
      <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading courses...</span>
    </div>

    <!-- Empty state -->
    <div v-else-if="!courses || courses.length === 0" class="empty-state">
      <span>No courses found</span>
    </div>

    <!-- No results state -->
    <div v-else-if="filteredCourses.length === 0" class="empty-state">
      <span>No courses match "{{ searchQuery }}"</span>
    </div>

    <!-- Table -->
    <table v-else class="status-table">
      <thead>
        <tr>
          <th class="col-course sortable" @click="toggleSort('name')">
            Course
            <span class="sort-indicator" :class="{ active: sortColumn === 'name' }">
              {{ sortColumn === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
            </span>
          </th>
          <th class="col-build sortable" @click="toggleSort('build')">
            Build
            <span class="sort-indicator" :class="{ active: sortColumn === 'build' }">
              {{ sortColumn === 'build' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
            </span>
          </th>
          <th class="col-platform sortable" @click="toggleSort('newApp')">
            New App
            <span class="sort-indicator" :class="{ active: sortColumn === 'newApp' }">
              {{ sortColumn === 'newApp' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
            </span>
          </th>
          <th class="col-platform sortable" @click="toggleSort('legacyApp')">
            Legacy App
            <span class="sort-indicator" :class="{ active: sortColumn === 'legacyApp' }">
              {{ sortColumn === 'legacyApp' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
            </span>
          </th>
          <th class="col-actions"></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="course in sortedCourses"
          :key="course.code"
          class="course-row"
          @click="handleRowClick(course.code)"
        >
          <td class="col-course">
            <div class="course-info">
              <span class="course-name">{{ course.name }}</span>
              <span class="course-code">{{ course.code }}</span>
            </div>
          </td>
          <td class="col-build">
            <BuildProgressIndicator
              :stats="course.stats"
              :content-status="course.contentStatus"
              :target-seeds="course.targetSeeds || 260"
            />
          </td>
          <td class="col-platform">
            <PlatformStatusBadge
              :status="course.newAppStatus || 'not_available'"
              :beta-days="course.newAppBetaDays"
              :editable="true"
              platform="new_app"
              @update="handleStatusUpdate(course.code, $event)"
            />
          </td>
          <td class="col-platform">
            <PlatformStatusBadge
              :status="course.legacyAppStatus || 'not_available'"
              :beta-days="course.legacyAppBetaDays"
              :editable="true"
              platform="legacy_app"
              :new-app-status="course.newAppStatus"
              @update="handleStatusUpdate(course.code, $event)"
            />
          </td>
          <td class="col-actions">
            <button class="action-btn" @click.stop="openMenu(course.code, $event)" title="More options">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
                <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
              </svg>
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Context menu -->
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

// Search and sort state
const searchQuery = ref('')
const sortColumn = ref('newApp') // Default sort by New App status
const sortDirection = ref('asc')

// Status order for sorting (best status first)
const statusOrder = {
  released: 0,
  beta: 1,
  testing: 2,
  draft: 3,
  not_available: 4,
  deprecated: 5
}

// Build status order (most complete first)
const buildStatusOrder = {
  ready: 0,
  audio_generating: 1,
  audio_pending: 2,
  building: 3,
  seeds_only: 4,
  empty: 5
}

// Get derived build status from stats
function getBuildStatus(course) {
  const stats = course.stats || {}
  if (stats.audio > 0) return 'ready'
  if (stats.phrases > 0) return 'audio_pending'
  if (stats.legos > 0) return 'building'
  if (stats.completedSeeds > 0) return 'seeds_only'
  return 'empty'
}

// Toggle sort column/direction
function toggleSort(column) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
}

// Filter courses by search query
const filteredCourses = computed(() => {
  if (!searchQuery.value.trim()) return props.courses

  const query = searchQuery.value.toLowerCase().trim()
  return props.courses.filter(course => {
    const name = (course.name || '').toLowerCase()
    const code = (course.code || '').toLowerCase()
    return name.includes(query) || code.includes(query)
  })
})

// Sort filtered courses
const sortedCourses = computed(() => {
  const courses = [...filteredCourses.value]
  const dir = sortDirection.value === 'asc' ? 1 : -1

  return courses.sort((a, b) => {
    let comparison = 0

    switch (sortColumn.value) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '')
        break

      case 'build':
        const aBuild = buildStatusOrder[getBuildStatus(a)] ?? 5
        const bBuild = buildStatusOrder[getBuildStatus(b)] ?? 5
        comparison = aBuild - bBuild
        if (comparison === 0) {
          comparison = (a.name || '').localeCompare(b.name || '')
        }
        break

      case 'newApp':
        const aNew = statusOrder[a.newAppStatus] ?? 4
        const bNew = statusOrder[b.newAppStatus] ?? 4
        comparison = aNew - bNew
        if (comparison === 0) {
          comparison = (a.name || '').localeCompare(b.name || '')
        }
        break

      case 'legacyApp':
        const aLegacy = statusOrder[a.legacyAppStatus] ?? 4
        const bLegacy = statusOrder[b.legacyAppStatus] ?? 4
        comparison = aLegacy - bLegacy
        if (comparison === 0) {
          comparison = (a.name || '').localeCompare(b.name || '')
        }
        break

      default:
        comparison = (a.name || '').localeCompare(b.name || '')
    }

    return comparison * dir
  })
})

function handleRowClick(code) {
  router.push(`/production/${code}`)
}

function handleStatusUpdate(courseCode, { platform, status }) {
  emit('update-status', { courseCode, platform, status })
}

function openMenu(courseCode, event) {
  menuCourseCode.value = courseCode
  menuPosition.value = {
    top: `${event.clientY}px`,
    left: `${event.clientX}px`
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
  if (contextMenu.value && !contextMenu.value.contains(event.target)) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.course-status-table {
  width: 100%;
  position: relative;
}

/* Search bar */
.search-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(15, 23, 42, 0.5);
  border-bottom: 1px solid #334155;
}

.search-icon {
  color: #64748b;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #f1f5f9;
  font-size: 0.875rem;
  font-family: inherit;
}

.search-input::placeholder {
  color: #475569;
}

.search-count {
  font-size: 0.75rem;
  color: #64748b;
  white-space: nowrap;
}

.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.15s;
}

.search-clear:hover {
  background: #334155;
  color: #f1f5f9;
}

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
  color: #64748b;
  font-size: 0.875rem;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #334155;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Table */
.status-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.status-table th {
  text-align: left;
  padding: 0.625rem 0.75rem;
  font-weight: 600;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  border-bottom: 1px solid #334155;
}

.status-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
}

.status-table th.sortable:hover {
  color: #94a3b8;
}

.sort-indicator {
  margin-left: 0.25rem;
  font-size: 0.625rem;
  opacity: 0.4;
  transition: opacity 0.15s;
}

.sort-indicator.active {
  opacity: 1;
  color: #3b82f6;
}

.status-table td {
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
  vertical-align: middle;
}

.course-row {
  cursor: pointer;
  transition: background-color 0.15s;
}

.course-row:hover {
  background: rgba(59, 130, 246, 0.05);
}

/* Column widths */
.col-course {
  width: 35%;
}

.col-build {
  width: 20%;
}

.col-platform {
  width: 18%;
}

.col-actions {
  width: 40px;
  text-align: center;
}

/* Course info cell */
.course-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.course-name {
  color: #f1f5f9;
  font-weight: 500;
}

.course-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6875rem;
  color: #64748b;
}

/* Actions button */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.15s;
}

.action-btn:hover {
  background: #334155;
  color: #f1f5f9;
}

/* Context menu */
.context-menu {
  position: fixed;
  min-width: 160px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #f1f5f9;
  font-size: 0.8125rem;
  text-align: left;
  transition: background 0.15s;
}

.menu-item:hover {
  background: #334155;
}

.menu-item.danger {
  color: #ef4444;
}

.menu-item.danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.menu-divider {
  height: 1px;
  background: #334155;
  margin: 0.25rem 0;
}

/* Responsive */
@media (max-width: 768px) {
  .col-platform {
    display: none;
  }

  .col-course {
    width: 50%;
  }

  .col-build {
    width: 40%;
  }
}
</style>
