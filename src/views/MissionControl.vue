<template>
  <div class="mission-control">
    <!-- Ambient Background -->
    <div class="ambient-bg">
      <div class="grid-overlay"></div>
      <div class="glow-orb glow-orb-1"></div>
      <div class="glow-orb glow-orb-2"></div>
    </div>

    <!-- Compact Header -->
    <header class="mc-header">
      <div class="header-inner">
        <div class="header-left">
          <h1 class="page-title">Mission Control</h1>
        </div>

        <!-- Compact Action Chips -->
        <div class="action-chips">
          <router-link to="/jobs" class="chip chip-jobs">
            <span class="chip-pulse" v-if="activeJobCount > 0"></span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
            <span class="chip-label">Jobs</span>
            <span class="chip-count" v-if="activeJobCount > 0">{{ activeJobCount }}</span>
          </router-link>

          <router-link to="/production/new/text" class="chip chip-new">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v8M8 12h8"/>
            </svg>
            <span class="chip-label">New Course</span>
          </router-link>

          <button @click="showImportModal = true" class="chip chip-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17,8 12,3 7,8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span class="chip-label">Import</span>
          </button>

          <router-link to="/docs" class="chip chip-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
            <span class="chip-label">Docs</span>
          </router-link>
        </div>

        <div class="header-right">
          <span class="course-summary" v-if="!loadingCourses">
            <span class="summary-value">{{ courseCount }}</span> courses
            <span class="summary-sep">&middot;</span>
            <span class="summary-value">{{ inProductionCount }}</span> in production
          </span>
          <EnvironmentSwitcher />

          <!-- Course Switcher Dropdown -->
          <div class="course-switcher" ref="dropdownRef">
            <button class="course-button" @click="toggleDropdown">
              <span class="course-code">{{ selectedCourse?.code || 'Select' }}</span>
              <span class="course-name">{{ selectedCourse?.name || 'Choose course...' }}</span>
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
                <div v-if="filteredCourses.length === 0 && !loadingCourses" class="no-results">
                  No courses found
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content — Pipeline Board first -->
    <main class="mc-main">
      <div class="pipeline-container">
        <CoursePipelineBoard
          :courses="coursesWithStatus"
          :loading="loadingCourses"
          @action="handlePipelineAction"
          @updateLegacyStatus="handleLegacyStatusUpdate"
          @updateNewAppStatus="handleNewAppStatusUpdate"
          @deployToProduction="handleDeployToProduction"
        />
      </div>
    </main>

    <!-- Import Course Modal -->
    <ImportCourseModal
      v-if="showImportModal"
      :visible="showImportModal"
      @close="showImportModal = false"
      @imported="handleImportComplete"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api, { getApiUrl } from '../services/api'
import EnvironmentSwitcher from '../components/EnvironmentSwitcher.vue'
import ImportCourseModal from '../components/ImportCourseModal.vue'
import CoursePipelineBoard from '../components/CoursePipelineBoard.vue'

const router = useRouter()

// Course count and list
const courseCount = ref(0)
const courses = ref([])
const loadingCourses = ref(true)
const selectedCourse = ref(null)

// Active jobs
const activeJobCount = ref(0)

// Dropdown state
const dropdownOpen = ref(false)
const dropdownRef = ref(null)
const searchInput = ref(null)
const searchQuery = ref('')

// Import modal
const showImportModal = ref(false)

// Language name mapping (ISO 639-3 codes to full names)
const languageNames = {
  // Major European languages
  'eng': 'English', 'spa': 'Spanish', 'fra': 'French', 'deu': 'German',
  'ita': 'Italian', 'por': 'Portuguese', 'nld': 'Dutch', 'pol': 'Polish',
  'rus': 'Russian', 'ukr': 'Ukrainian', 'ces': 'Czech', 'slk': 'Slovak',
  'hun': 'Hungarian', 'ron': 'Romanian', 'bul': 'Bulgarian', 'hrv': 'Croatian',
  'srp': 'Serbian', 'slv': 'Slovenian', 'ell': 'Greek', 'tur': 'Turkish',
  'swe': 'Swedish', 'nor': 'Norwegian', 'dan': 'Danish', 'fin': 'Finnish',
  // Celtic languages
  'cym': 'Welsh', 'gle': 'Irish', 'gla': 'Scottish Gaelic', 'glv': 'Manx',
  'cor': 'Cornish', 'bre': 'Breton',
  // Asian languages
  'zho': 'Chinese', 'cmn': 'Mandarin', 'yue': 'Cantonese',
  'jpn': 'Japanese', 'kor': 'Korean', 'vie': 'Vietnamese',
  'tha': 'Thai', 'ind': 'Indonesian', 'msa': 'Malay', 'tgl': 'Tagalog',
  'hin': 'Hindi', 'ben': 'Bengali', 'tam': 'Tamil', 'tel': 'Telugu',
  // Middle Eastern languages
  'ara': 'Arabic', 'heb': 'Hebrew', 'fas': 'Persian', 'urd': 'Urdu',
  // African languages
  'swa': 'Swahili', 'zul': 'Zulu', 'xho': 'Xhosa', 'afr': 'Afrikaans',
  // Other languages
  'cat': 'Catalan', 'eus': 'Basque', 'lat': 'Latin', 'epo': 'Esperanto'
}

function getCourseName(code) {
  if (!code || !code.includes('_for_')) return code
  const [target, , known] = code.split('_')
  const targetName = languageNames[target] || target.toUpperCase()
  const knownName = languageNames[known] || known.toUpperCase()
  return `${targetName} for ${knownName} Speakers`
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

// Count courses "in production" (have content but not fully live)
const inProductionCount = computed(() => {
  return courses.value.filter(c => {
    const hasContent = c.stats?.seeds > 0 || c.stats?.completedSeeds > 0
    return hasContent
  }).length
})

// Courses with full status info for CoursePipelineBoard
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

// Dropdown functions
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
  const course = courses.value.find(c => c.code === code)
  selectedCourse.value = course || { code, name: getCourseName(code) }
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

function handleImportComplete() {
  showImportModal.value = false
  loadCourseCount()
}

function handlePipelineAction({ course, action }) {
  // Actions are handled by the board component via router navigation
}

async function handleLegacyStatusUpdate({ courseCode, status }) {
  try {
    await api.course.updatePlatformStatus(courseCode, 'legacy_app', status)
    await loadCourseCount()
  } catch (err) {
    console.error('Failed to update legacy app status:', err)
    await loadCourseCount()
  }
}

async function handleNewAppStatusUpdate({ courseCode, status }) {
  try {
    await api.course.updatePlatformStatus(courseCode, 'new_app', status)
    await loadCourseCount()
  } catch (err) {
    console.error('Failed to update new app status:', err)
    await loadCourseCount()
  }
}

async function handleDeployToProduction({ courseCode, platform, status }) {
  try {
    await api.course.updatePlatformStatus(courseCode, platform, status)
    await loadCourseCount()
  } catch (err) {
    console.error('Failed to deploy to production:', err)
    await loadCourseCount()
  }
}

// Load courses
async function loadCourseCount() {
  loadingCourses.value = true
  try {
    const response = await api.course.list()
    const courseList = response.courses || []
    courseCount.value = courseList.length
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
    courseCount.value = 0
    courses.value = []
  } finally {
    loadingCourses.value = false
  }
}

// Load active job count
async function loadJobCount() {
  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/mission-control/jobs`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      const data = await response.json()
      const jobs = data.jobs || []
      activeJobCount.value = jobs.filter(j => j.status === 'running' || j.status === 'pending').length
    }
  } catch (err) {
    // Silently fail — jobs chip just shows no count
    activeJobCount.value = 0
  }
}

onMounted(() => {
  loadCourseCount()
  loadJobCount()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.mission-control {
  --mc-void: #0f172a;
  --mc-deep: #1e293b;
  --mc-surface: #1e293b;
  --mc-elevated: #334155;
  --mc-border: #334155;
  --mc-border-light: #475569;
  --mc-text: #f1f5f9;
  --mc-text-dim: #94a3b8;
  --mc-text-muted: #64748b;
  --mc-accent: #10b981;
  --mc-accent-glow: rgba(16, 185, 129, 0.15);
  --mc-create: #3b82f6;
  --mc-jobs: #8b5cf6;

  min-height: 100vh;
  background: var(--mc-void);
  color: var(--mc-text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow-x: hidden;
}

/* Ambient Background */
.ambient-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--mc-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--mc-border) 1px, transparent 1px);
  background-size: 60px 60px;
  opacity: 0.03;
}

.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  animation: float 20s ease-in-out infinite;
}

.glow-orb-1 {
  width: 500px;
  height: 500px;
  background: var(--mc-accent);
  top: -200px;
  right: -100px;
  opacity: 0.06;
}

.glow-orb-2 {
  width: 400px;
  height: 400px;
  background: var(--mc-create);
  bottom: -100px;
  left: -100px;
  opacity: 0.04;
  animation-delay: -7s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

/* Header */
.mc-header {
  position: relative;
  z-index: 100;
  border-bottom: 1px solid var(--mc-border);
  background: var(--mc-deep);
}

.header-inner {
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.page-title {
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--mc-text);
  margin: 0;
  white-space: nowrap;
}

/* Action Chips */
.action-chips {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  text-decoration: none;
  border: 1px solid var(--mc-border);
  background: transparent;
  color: var(--mc-text-dim);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  font-family: inherit;
}

.chip:hover {
  background: var(--mc-elevated);
  color: var(--mc-text);
  border-color: var(--mc-border-light);
}

.chip-jobs {
  position: relative;
}

.chip-jobs:hover {
  border-color: var(--mc-jobs);
  color: var(--mc-jobs);
}

.chip-pulse {
  width: 6px;
  height: 6px;
  background: var(--mc-jobs);
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

.chip-count {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--mc-void);
  background: var(--mc-jobs);
  border-radius: 9px;
  padding: 0 0.375rem;
  min-width: 18px;
  text-align: center;
  line-height: 18px;
}

.chip-new:hover {
  border-color: var(--mc-create);
  color: var(--mc-create);
}

.chip-secondary {
  border-color: transparent;
  color: var(--mc-text-muted);
}

.chip-secondary:hover {
  border-color: var(--mc-border);
  color: var(--mc-text-dim);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Header Right */
.header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;
  z-index: 9999;
}

.course-summary {
  font-size: 0.75rem;
  color: var(--mc-text-muted);
  white-space: nowrap;
}

.summary-value {
  font-weight: 700;
  color: var(--mc-text-dim);
  font-variant-numeric: tabular-nums;
}

.summary-sep {
  margin: 0 0.25rem;
  opacity: 0.5;
}

/* Course Switcher */
.course-switcher {
  position: relative;
}

.course-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: var(--mc-elevated);
  border: 1px solid var(--mc-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.course-button:hover {
  border-color: #ffa630;
}

.course-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  color: #ffa630;
}

.course-name {
  font-size: 0.8125rem;
  color: var(--mc-text-dim);
}

.dropdown-arrow {
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
  background: var(--mc-elevated);
  border: 1px solid var(--mc-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 9999;
  overflow: hidden;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--mc-deep);
  border: none;
  border-bottom: 1px solid var(--mc-border);
  color: var(--mc-text);
  font-size: 0.875rem;
  outline: none;
}

.search-input::placeholder {
  color: var(--mc-text-muted);
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
  color: inherit;
}

.course-option:hover {
  background: var(--mc-deep);
}

.option-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  color: #ffa630;
}

.option-name {
  font-size: 0.75rem;
  color: var(--mc-text-dim);
}

.no-results {
  padding: 1rem;
  text-align: center;
  color: var(--mc-text-muted);
  font-size: 0.875rem;
}

.course-list-divider {
  height: 1px;
  background: var(--mc-border);
  margin: 0.25rem 0;
}

.new-course-option:hover {
  background: rgba(16, 185, 129, 0.1);
}

/* Main Content */
.mc-main {
  position: relative;
  z-index: 10;
  padding: 1rem 1.5rem 2rem;
}

.pipeline-container {
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: 12px;
  overflow: hidden;
}

/* Responsive */
@media (max-width: 900px) {
  .action-chips {
    display: none;
  }

  .course-summary {
    display: none;
  }

  .course-name {
    display: none;
  }
}

@media (max-width: 640px) {
  .header-inner {
    padding: 0.75rem 1rem;
  }

  .mc-main {
    padding: 1rem;
  }
}
</style>
