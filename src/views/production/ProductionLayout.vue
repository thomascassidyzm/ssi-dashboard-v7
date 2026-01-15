<template>
  <div class="production-layout">
    <!-- Single Header Row with Tabs -->
    <header class="production-header">
      <div class="header-content">
        <router-link to="/courses" class="back-link">← Course Library</router-link>
        <h1 class="page-title">Production Suite</h1>

        <!-- Tabs inline in header -->
        <nav class="header-tabs">
          <router-link
            v-if="!isCreateMode"
            :to="`/production/${courseCode}`"
            class="tab-item"
            :class="{ active: isActiveRoute('ProductionDashboard') }"
          >
            Overview
          </router-link>
          <router-link
            :to="isCreateMode ? `/production/new/text` : `/production/${courseCode}/text`"
            class="tab-item"
            :class="{ active: isActiveRoute('TextGeneration') }"
          >
            Text
          </router-link>
          <router-link
            v-if="!isCreateMode"
            :to="`/production/${courseCode}/pipeline`"
            class="tab-item"
            :class="{ active: isActiveRoute('AudioPipelineProduction') }"
          >
            Audio
          </router-link>
          <router-link
            v-if="!isCreateMode"
            :to="`/production/${courseCode}/recording`"
            class="tab-item"
            :class="{ active: isActiveRoute('AutocueStudioCourse') }"
          >
            Recording
          </router-link>
          <router-link
            v-if="!isCreateMode"
            :to="{ name: 'ScriptViewer', params: { courseCode }, query: { filter: 'flagged' } }"
            class="tab-item"
            :class="{ active: isActiveRoute('ScriptViewer') && $route.query.filter === 'flagged' }"
          >
            QA
          </router-link>
        </nav>

        <!-- Course Switcher Dropdown -->
        <div class="course-switcher" ref="dropdownRef">
          <button
            class="course-button"
            @click="toggleDropdown"
          >
            <span class="course-code" :class="{ 'text-emerald-400': isCreateMode }">{{ isCreateMode ? '+ New' : courseCode }}</span>
            <span class="course-name" :class="{ 'text-emerald-400': isCreateMode }">{{ isCreateMode ? 'Create Course' : courseName }}</span>
            <svg class="dropdown-arrow" :class="{ open: dropdownOpen }" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 5L6 8L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <div v-if="dropdownOpen" class="dropdown-menu">
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="text"
              placeholder="Search courses..."
              class="search-input"
              @keydown.escape="closeDropdown"
            />
            <div class="course-list">
              <!-- New Course Option -->
              <button
                class="course-option new-course-option"
                @click="createNewCourse"
              >
                <span class="option-code text-emerald-400">+ New</span>
                <span class="option-name text-emerald-400">Create Course</span>
              </button>
              <div class="course-list-divider"></div>
              <button
                v-for="course in filteredCourses"
                :key="course.code"
                class="course-option"
                :class="{ current: course.code === courseCode }"
                @click="switchCourse(course.code)"
              >
                <span class="option-code">{{ course.code }}</span>
                <span class="option-name">{{ course.name }}</span>
              </button>
              <div v-if="filteredCourses.length === 0" class="no-results">
                No courses found
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading course data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h2>Error Loading Course</h2>
      <p>{{ error }}</p>
      <button @click="retryLoad" class="retry-btn">Retry</button>
    </div>

    <!-- Content Area - nested routes render here -->
    <main v-else class="production-content">
      <router-view :course-code="courseCode" />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductionStore } from '@/stores/production'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

const route = useRoute()
const router = useRouter()
const store = useProductionStore()

const loading = ref(false)
const error = ref(null)
const courseName = ref('')
const courses = ref([])

// Create mode detection
const isCreateMode = computed(() => props.courseCode === 'new')

// Dropdown state
const dropdownOpen = ref(false)
const dropdownRef = ref(null)
const searchInput = ref(null)
const searchQuery = ref('')

// Language name mapping
const languageNames = {
  'eng': 'English',
  'spa': 'Spanish',
  'fra': 'French',
  'deu': 'German',
  'ita': 'Italian',
  'por': 'Portuguese',
  'zho': 'Chinese',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'ara': 'Arabic',
  'cym': 'Welsh',
  'gle': 'Irish'
}

// Compute course name from code
function getCourseName(code) {
  if (!code || !code.includes('_for_')) return code
  const [target, , known] = code.split('_')
  const targetName = languageNames[target] || target
  const knownName = languageNames[known] || known
  return `${targetName} for ${knownName}`
}

// Check if route is active
function isActiveRoute(routeName) {
  return route.name === routeName
}

// Filtered courses based on search
const filteredCourses = computed(() => {
  if (!searchQuery.value) return courses.value
  const q = searchQuery.value.toLowerCase()
  return courses.value.filter(c =>
    c.code.toLowerCase().includes(q) ||
    c.name.toLowerCase().includes(q)
  )
})

// Toggle dropdown
function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
  if (dropdownOpen.value) {
    searchQuery.value = ''
    nextTick(() => searchInput.value?.focus())
  }
}

function closeDropdown() {
  dropdownOpen.value = false
  searchQuery.value = ''
}

// Switch to different course
function switchCourse(newCode) {
  closeDropdown()
  if (newCode !== props.courseCode) {
    router.push(`/production/${newCode}`)
  }
}

// Create new course - go to TextGeneration in create mode
function createNewCourse() {
  closeDropdown()
  router.push('/production/new/text')
}

// Close dropdown when clicking outside
function handleClickOutside(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    closeDropdown()
  }
}

// Load available courses
async function loadCourses() {
  try {
    const apiBase = localStorage.getItem('api_base_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
    const response = await fetch(`${apiBase}/api/courses`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      const data = await response.json()
      const courseList = Array.isArray(data) ? data : data.courses || []
      courses.value = courseList.map(c => ({
        code: c.code || c.course_code || c.id,
        name: getCourseName(c.code || c.course_code || c.id)
      }))
    }
  } catch (err) {
    console.error('Failed to load courses:', err)
  }
}

// Load course data
async function loadCourseData() {
  if (!props.courseCode || isCreateMode.value) return

  loading.value = true
  error.value = null
  courseName.value = getCourseName(props.courseCode)

  try {
    await store.loadCourse(props.courseCode)
  } catch (err) {
    console.error('Failed to load course:', err)
    error.value = err.message || 'Failed to load course data'
  } finally {
    loading.value = false
  }
}

function retryLoad() {
  loadCourseData()
}

// Lifecycle
onMounted(() => {
  loadCourseData()
  loadCourses()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Reload when course changes
watch(() => props.courseCode, (newCode, oldCode) => {
  if (newCode !== oldCode) {
    loadCourseData()
  }
})
</script>

<style scoped>
.production-layout {
  min-height: 100vh;
  background: var(--color-shadow, #1e293b);
  color: var(--color-paper, #f7f7f2);
}

.production-header {
  background: var(--color-shadow, #1e293b);
  border-bottom: 1px solid var(--color-graphite, #475569);
  padding: 0 1.5rem;
  height: 56px;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.back-link {
  color: var(--color-tungsten, #ffa630);
  text-decoration: none;
  font-size: 0.875rem;
  white-space: nowrap;
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--color-paper, #f7f7f2);
}

.page-title {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-paper, #f7f7f2);
  margin: 0;
  white-space: nowrap;
}

/* Tabs in header */
.header-tabs {
  display: flex;
  gap: 0.25rem;
  margin-left: 1rem;
}

.tab-item {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.875rem;
  padding: 0.5rem 0.875rem;
  color: var(--color-paper-dim, #c1c1bb);
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab-item:hover {
  color: var(--color-paper, #f7f7f2);
  background: var(--color-slate, #334155);
}

.tab-item.active {
  color: var(--color-tungsten, #ffa630);
  background: var(--color-slate, #334155);
}

/* Course Switcher */
.course-switcher {
  margin-left: auto;
  position: relative;
}

.course-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: var(--color-slate, #334155);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.course-button:hover {
  border-color: var(--color-tungsten, #ffa630);
}

.course-code {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 0.8125rem;
  color: var(--color-tungsten, #ffa630);
}

.course-name {
  font-size: 0.8125rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.dropdown-arrow {
  color: var(--color-paper-dim, #c1c1bb);
  transition: transform 0.2s;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  width: 300px;
  background: var(--color-slate, #334155);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  z-index: 100;
  overflow: hidden;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--color-shadow, #1e293b);
  border: none;
  border-bottom: 1px solid var(--color-graphite, #475569);
  color: var(--color-paper, #f7f7f2);
  font-size: 0.875rem;
  outline: none;
}

.search-input::placeholder {
  color: var(--color-paper-dim, #c1c1bb);
}

.course-list {
  max-height: 280px;
  overflow-y: auto;
}

.course-option {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  padding: 0.625rem 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
}

.course-option:hover {
  background: var(--color-shadow, #1e293b);
}

.course-option.current {
  background: var(--color-shadow, #1e293b);
}

.option-code {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 0.8125rem;
  color: var(--color-tungsten, #ffa630);
}

.option-name {
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.no-results {
  padding: 1rem;
  text-align: center;
  color: var(--color-paper-dim, #c1c1bb);
  font-size: 0.875rem;
}

.course-list-divider {
  height: 1px;
  background: var(--color-shadow, #1e293b);
  margin: 0.25rem 0;
}

.new-course-option:hover {
  background: rgba(16, 185, 129, 0.1);
}

/* Content */
.production-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
}

/* States */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid var(--color-graphite, #475569);
  border-top-color: var(--color-tungsten, #ffa630);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p,
.error-state p {
  margin-top: 1rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-state h2 {
  color: var(--color-paper, #f7f7f2);
  margin: 0 0 0.5rem;
}

.retry-btn {
  margin-top: 1.5rem;
  padding: 0.625rem 1.5rem;
  background: var(--color-tungsten, #ffa630);
  color: var(--color-shadow, #1e293b);
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: var(--color-paper, #f7f7f2);
}

/* Responsive */
@media (max-width: 900px) {
  .header-tabs {
    display: none;
  }

  .course-name {
    display: none;
  }
}
</style>
