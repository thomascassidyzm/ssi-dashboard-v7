<template>
  <div class="all-courses-page">
    <!-- Header matching Production Suite style -->
    <header class="production-header">
      <div class="header-content">
        <router-link to="/" class="back-link">Mission Control</router-link>
        <h1 class="page-title">Production Suite</h1>

        <!-- Tabs matching ProductionLayout -->
        <nav class="header-tabs">
          <router-link
            to="/production/courses"
            class="tab-item active"
          >
            Courses
          </router-link>
        </nav>

        <!-- Right-aligned controls -->
        <div class="header-controls">
          <EnvironmentSwitcher />

          <!-- Course Switcher Dropdown -->
          <div class="course-switcher" ref="dropdownRef">
            <button class="course-button" @click="toggleDropdown">
              <span class="course-code">Select</span>
              <span class="course-name">Choose course...</span>
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
                <button class="course-option new-course-option" @click="createNewCourse">
                  <span class="option-code text-emerald-400">+ New</span>
                  <span class="option-name text-emerald-400">Create Course</span>
                </button>
                <div class="course-list-divider"></div>
                <button
                  v-for="course in filteredCourses"
                  :key="course.code"
                  class="course-option"
                  @click="selectCourse(course.code)"
                >
                  <span class="option-code">{{ course.code }}</span>
                  <span class="option-name">{{ course.name }}</span>
                </button>
                <div v-if="filteredCourses.length === 0 && !loading" class="no-results">
                  No courses found
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Pipeline Board -->
    <main class="page-content">
      <div class="pipeline-container">
        <CoursePipelineBoard
          :courses="coursesWithStatus"
          :loading="loading"
          @action="handlePipelineAction"
          @updateLegacyStatus="handleLegacyStatusUpdate"
          @updateNewAppStatus="handleNewAppStatusUpdate"
          @deployToProduction="handleDeployToProduction"
        />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'
import EnvironmentSwitcher from '@/components/EnvironmentSwitcher.vue'
import CoursePipelineBoard from '@/components/CoursePipelineBoard.vue'

const router = useRouter()

const courses = ref([])
const loading = ref(true)

// Dropdown state
const dropdownOpen = ref(false)
const dropdownRef = ref(null)
const searchInput = ref(null)
const searchQuery = ref('')

// Language name mapping
const languageNames = {
  'eng': 'English', 'spa': 'Spanish', 'fra': 'French', 'deu': 'German',
  'ita': 'Italian', 'por': 'Portuguese', 'nld': 'Dutch', 'pol': 'Polish',
  'rus': 'Russian', 'ukr': 'Ukrainian', 'ces': 'Czech', 'slk': 'Slovak',
  'hun': 'Hungarian', 'ron': 'Romanian', 'bul': 'Bulgarian', 'hrv': 'Croatian',
  'srp': 'Serbian', 'slv': 'Slovenian', 'ell': 'Greek', 'tur': 'Turkish',
  'swe': 'Swedish', 'nor': 'Norwegian', 'dan': 'Danish', 'fin': 'Finnish',
  'cym': 'Welsh', 'gle': 'Irish', 'gla': 'Scottish Gaelic', 'glv': 'Manx',
  'cor': 'Cornish', 'bre': 'Breton',
  'zho': 'Chinese', 'cmn': 'Mandarin', 'yue': 'Cantonese',
  'jpn': 'Japanese', 'kor': 'Korean', 'vie': 'Vietnamese',
  'tha': 'Thai', 'ind': 'Indonesian', 'msa': 'Malay', 'tgl': 'Tagalog',
  'hin': 'Hindi', 'ben': 'Bengali', 'tam': 'Tamil', 'tel': 'Telugu',
  'ara': 'Arabic', 'heb': 'Hebrew', 'fas': 'Persian', 'urd': 'Urdu',
  'swa': 'Swahili', 'zul': 'Zulu', 'xho': 'Xhosa', 'afr': 'Afrikaans',
  'cat': 'Catalan', 'eus': 'Basque', 'lat': 'Latin', 'epo': 'Esperanto'
}

function getCourseName(code) {
  if (!code || !code.includes('_for_')) return code
  const [target, , known] = code.split('_')
  const targetName = languageNames[target] || target.toUpperCase()
  const knownName = languageNames[known] || known.toUpperCase()
  return `${targetName} for ${knownName} Speakers`
}

const filteredCourses = computed(() => {
  if (!searchQuery.value) return courses.value
  const q = searchQuery.value.toLowerCase()
  return courses.value.filter(c =>
    c.code.toLowerCase().includes(q) ||
    c.name.toLowerCase().includes(q)
  )
})

const coursesWithStatus = computed(() => {
  return courses.value.map(c => {
    const normalize = (s) => {
      if (!s || s === 'not_available') return 'not_available'
      if (s === 'draft') return 'testing'
      if (s === 'released') return 'live'
      return s
    }
    return {
      code: c.code,
      name: c.name,
      newAppStatus: normalize(c.new_app_status),
      legacyAppStatus: normalize(c.legacy_app_status),
      newAppBetaDays: c.new_app_beta_days || null,
      legacyAppBetaDays: c.legacy_app_beta_days || null,
      contentStatus: c.content_status || null,
      exportReady: c.export_ready || false,
      targetSeeds: c.stats?.seed_count || 300,
      stats: c.stats || {}
    }
  })
})

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

function selectCourse(code) {
  closeDropdown()
  router.push(`/production/${code}`)
}

function createNewCourse() {
  closeDropdown()
  router.push('/production/new/text')
}

function handleClickOutside(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    closeDropdown()
  }
}

function handlePipelineAction({ course, action }) {
  // Handled by board component
}

async function handleLegacyStatusUpdate({ courseCode, status }) {
  try {
    await api.course.updatePlatformStatus(courseCode, 'legacy_app', status)
    await loadCourses()
  } catch (err) {
    console.error('Failed to update legacy app status:', err)
    await loadCourses()
  }
}

async function handleNewAppStatusUpdate({ courseCode, status }) {
  try {
    await api.course.updatePlatformStatus(courseCode, 'new_app', status)
    await loadCourses()
  } catch (err) {
    console.error('Failed to update new app status:', err)
    await loadCourses()
  }
}

async function handleDeployToProduction({ courseCode, platform, status }) {
  try {
    await api.course.updatePlatformStatus(courseCode, platform, status)
    await loadCourses()
  } catch (err) {
    console.error('Failed to deploy to production:', err)
    await loadCourses()
  }
}

async function loadCourses() {
  loading.value = true
  try {
    const response = await api.course.list()
    const courseList = response.courses || []
    courses.value = courseList.map(c => ({
      code: c.code || c.course_code || c.id,
      name: c.display_name || getCourseName(c.code || c.course_code || c.id),
      new_app_status: c.new_app_status,
      legacy_app_status: c.legacy_app_status,
      new_app_beta_days: c.new_app_beta_days,
      legacy_app_beta_days: c.legacy_app_beta_days,
      content_status: c.content_status,
      export_ready: c.export_ready || false,
      seed_count: c.seed_count,
      stats: c.stats || { seeds: 0, completedSeeds: 0, legos: 0, phrases: 0, audio: 0 }
    }))
  } catch (err) {
    console.error('Failed to load courses:', err)
    courses.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCourses()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.all-courses-page {
  min-height: 100vh;
  background: var(--color-shadow, #1e293b);
  color: var(--color-paper, #f7f7f2);
}

/* Header — matches ProductionLayout exactly */
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

.header-controls {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;
  z-index: 100;
}

/* Course Switcher — matches ProductionLayout */
.course-switcher {
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
.page-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.25rem 1.5rem 2rem;
}

.pipeline-container {
  background: var(--color-shadow, #1e293b);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 12px;
  overflow: hidden;
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
