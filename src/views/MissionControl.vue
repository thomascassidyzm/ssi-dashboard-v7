<template>
  <div class="mission-control">
    <!-- Ambient Background -->
    <div class="ambient-bg">
      <div class="grid-overlay"></div>
      <div class="glow-orb glow-orb-1"></div>
      <div class="glow-orb glow-orb-2"></div>
      <div class="glow-orb glow-orb-3"></div>
    </div>

    <!-- Header -->
    <header class="mc-header">
      <div class="header-inner">
        <div class="header-left">
          <div class="logo-mark">
            <svg viewBox="0 0 40 40" class="logo-icon">
              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
              <circle cx="20" cy="20" r="12" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
              <circle cx="20" cy="20" r="6" fill="currentColor" opacity="0.8"/>
              <circle cx="20" cy="20" r="3" fill="currentColor"/>
            </svg>
          </div>
          <div class="header-titles">
            <h1 class="page-title">Mission Control</h1>
            <p class="page-subtitle">SSi Course Production System</p>
          </div>
        </div>
        <div class="header-right">
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
                <!-- New Course Option -->
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

    <!-- Main Content -->
    <main class="mc-main">
      <!-- Primary Actions Grid -->
      <section class="actions-section">
        <div class="section-header">
          <span class="section-label">PRIMARY OPERATIONS</span>
          <div class="section-line"></div>
        </div>

        <div class="actions-grid">
          <!-- Course Library Card -->
          <router-link to="/courses" class="action-card card-library">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    <path d="M8 7h8M8 11h6"/>
                  </svg>
                </div>
                <div class="card-badge" v-if="!loadingCourses">
                  <span class="badge-value">{{ courseCount }}</span>
                  <span class="badge-label">courses</span>
                </div>
                <div class="card-badge loading" v-else>
                  <span class="badge-skeleton"></span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">Course Library</h2>
                <p class="card-description">Browse, edit, and manage existing courses at any production stage</p>
              </div>
              <div class="card-footer">
                <span class="card-action">Open Library</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- New Course Card -->
          <router-link to="/courses/new" class="action-card card-create">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v8M8 12h8"/>
                  </svg>
                </div>
                <div class="card-badge new">
                  <span class="badge-pulse"></span>
                  <span class="badge-label">wizard</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">New Course</h2>
                <p class="card-description">Initialize a new language course with guided configuration</p>
              </div>
              <div class="card-footer">
                <span class="card-action">Start Wizard</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- Import Course Card -->
          <button @click="showImportModal = true" class="action-card card-import">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17,8 12,3 7,8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div class="card-badge import">
                  <span class="badge-label">legacy</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">Import Course</h2>
                <p class="card-description">Upload a legacy course manifest JSON to migrate existing content</p>
              </div>
              <div class="card-footer">
                <span class="card-action">Start Import</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </button>

          <!-- Active Jobs Card -->
          <router-link to="/jobs" class="action-card card-jobs">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18M9 21V9"/>
                    <path d="M13 13h4M13 17h2"/>
                  </svg>
                </div>
                <div class="card-badge jobs">
                  <span class="badge-pulse"></span>
                  <span class="badge-label">live</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">Active Jobs</h2>
                <p class="card-description">Monitor and control all running builds, audio generation, and pipelines</p>
              </div>
              <div class="card-footer">
                <span class="card-action">View Jobs</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- Documentation Card -->
          <router-link to="/docs" class="action-card card-docs">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <path d="M9 13h6M9 17h4"/>
                  </svg>
                </div>
                <div class="card-badge docs">
                  <span class="badge-label">reference</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">Documentation</h2>
                <p class="card-description">APML specification, methodology guides, and system architecture</p>
              </div>
              <div class="card-footer">
                <span class="card-action">Browse Docs</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>
        </div>
      </section>

      <!-- Quick Stats Bar -->
      <section class="stats-section">
        <div class="stats-bar">
          <div class="stat-item">
            <span class="stat-value">{{ courseCount }}</span>
            <span class="stat-label">Total Courses</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">668</span>
            <span class="stat-label">Seeds per Course</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">v2.1</span>
            <span class="stat-label">APML Version</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value status-online">●</span>
            <span class="stat-label">Pipeline Ready</span>
          </div>
        </div>
      </section>
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
import api from '../services/api'
import EnvironmentSwitcher from '../components/EnvironmentSwitcher.vue'
import ImportCourseModal from '../components/ImportCourseModal.vue'

const router = useRouter()

// Course count and list
const courseCount = ref(0)
const courses = ref([])
const loadingCourses = ref(true)
const selectedCourse = ref(null)

// Dropdown state
const dropdownOpen = ref(false)
const dropdownRef = ref(null)
const searchInput = ref(null)
const searchQuery = ref('')

// Import modal
const showImportModal = ref(false)

// Language name mapping
const languageNames = {
  'eng': 'English', 'spa': 'Spanish', 'fra': 'French', 'deu': 'German',
  'ita': 'Italian', 'por': 'Portuguese', 'zho': 'Chinese', 'jpn': 'Japanese',
  'kor': 'Korean', 'ara': 'Arabic', 'cym': 'Welsh', 'gle': 'Irish'
}

function getCourseName(code) {
  if (!code || !code.includes('_for_')) return code
  const [target, , known] = code.split('_')
  const targetName = languageNames[target] || target
  const knownName = languageNames[known] || known
  return `${targetName} for ${knownName}`
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

// Load courses
async function loadCourseCount() {
  loadingCourses.value = true
  try {
    const response = await api.course.list()
    const courseList = response.courses || []
    courseCount.value = courseList.length
    courses.value = courseList.map(c => ({
      code: c.code || c.course_code || c.id,
      name: getCourseName(c.code || c.course_code || c.id)
    }))
  } catch (err) {
    console.error('Failed to load courses:', err)
    courseCount.value = 0
    courses.value = []
  } finally {
    loadingCourses.value = false
  }
}

onMounted(() => {
  loadCourseCount()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* ============================================
   MISSION CONTROL - Premium Control Room Design
   ============================================ */

/* CSS Custom Properties - Harmonized with slate palette */
.mission-control {
  --mc-void: #0f172a;        /* slate-900 - matches existing pages */
  --mc-deep: #1e293b;        /* slate-800 */
  --mc-surface: #1e293b;     /* slate-800 */
  --mc-elevated: #334155;    /* slate-700 */
  --mc-border: #334155;      /* slate-700 */
  --mc-border-light: #475569; /* slate-600 */
  --mc-text: #f1f5f9;        /* slate-100 */
  --mc-text-dim: #94a3b8;    /* slate-400 */
  --mc-text-muted: #64748b;  /* slate-500 */
  --mc-accent: #10b981;
  --mc-accent-dim: #059669;
  --mc-accent-glow: rgba(16, 185, 129, 0.15);
  --mc-create: #3b82f6;
  --mc-create-glow: rgba(59, 130, 246, 0.15);
  --mc-production: #f59e0b;
  --mc-production-glow: rgba(245, 158, 11, 0.15);
  --mc-docs: #a855f7;
  --mc-docs-glow: rgba(168, 85, 247, 0.15);
  --mc-import: #f97316;
  --mc-import-glow: rgba(249, 115, 22, 0.15);
  --mc-jobs: #8b5cf6;
  --mc-jobs-glow: rgba(139, 92, 246, 0.15);

  min-height: 100vh;
  background: var(--mc-void);
  color: var(--mc-text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow-x: hidden;
}

/* Ambient Background Effects */
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
  opacity: 0.4;
  animation: float 20s ease-in-out infinite;
}

.glow-orb-1 {
  width: 600px;
  height: 600px;
  background: var(--mc-accent);
  top: -200px;
  right: -100px;
  opacity: 0.08;
  animation-delay: 0s;
}

.glow-orb-2 {
  width: 400px;
  height: 400px;
  background: var(--mc-create);
  bottom: -100px;
  left: -100px;
  opacity: 0.06;
  animation-delay: -7s;
}

.glow-orb-3 {
  width: 300px;
  height: 300px;
  background: var(--mc-docs);
  top: 50%;
  left: 50%;
  opacity: 0.04;
  animation-delay: -14s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

/* Header */
.mc-header {
  position: relative;
  z-index: 10;
  border-bottom: 1px solid var(--mc-border);
  background: linear-gradient(180deg, var(--mc-deep) 0%, transparent 100%);
}

.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem 2.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.logo-mark {
  width: 48px;
  height: 48px;
  color: var(--mc-accent);
}

.logo-icon {
  width: 100%;
  height: 100%;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--mc-text);
  margin: 0;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 0.875rem;
  color: var(--mc-text-dim);
  margin: 0;
  letter-spacing: 0.02em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
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

.system-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: 100px;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: var(--mc-accent);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 var(--mc-accent-glow); }
  50% { opacity: 0.7; box-shadow: 0 0 0 8px transparent; }
}

.status-text {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--mc-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Main Content */
.mc-main {
  position: relative;
  z-index: 10;
  max-width: 1400px;
  margin: 0 auto;
  padding: 3rem 2.5rem 4rem;
}

/* Section Headers */
.section-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.section-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  color: var(--mc-text-muted);
  white-space: nowrap;
}

.section-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--mc-border) 0%, transparent 100%);
}

/* Actions Grid */
.actions-section {
  margin-bottom: 3rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

@media (min-width: 1400px) {
  .actions-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (max-width: 1280px) {
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .actions-grid {
    grid-template-columns: 1fr;
  }
}

/* Action Cards */
.action-card {
  position: relative;
  display: block;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: 16px;
  padding: 1.75rem;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

/* Button reset for action cards */
button.action-card {
  width: 100%;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
}

.action-card:hover {
  transform: translateY(-4px);
  border-color: var(--mc-border-light);
}

.card-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100px;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.card-library .card-glow {
  background: linear-gradient(180deg, var(--mc-accent-glow) 0%, transparent 100%);
}

.card-create .card-glow {
  background: linear-gradient(180deg, var(--mc-create-glow) 0%, transparent 100%);
}

.card-production .card-glow {
  background: linear-gradient(180deg, var(--mc-production-glow) 0%, transparent 100%);
}

.card-docs .card-glow {
  background: linear-gradient(180deg, var(--mc-docs-glow) 0%, transparent 100%);
}

.card-import .card-glow {
  background: linear-gradient(180deg, var(--mc-import-glow) 0%, transparent 100%);
}

.card-jobs .card-glow {
  background: linear-gradient(180deg, var(--mc-jobs-glow) 0%, transparent 100%);
}

.action-card:hover .card-glow {
  opacity: 1;
}

.card-library:hover {
  border-color: var(--mc-accent);
  box-shadow: 0 20px 40px -20px var(--mc-accent-glow);
}

.card-create:hover {
  border-color: var(--mc-create);
  box-shadow: 0 20px 40px -20px var(--mc-create-glow);
}

.card-production:hover {
  border-color: var(--mc-production);
  box-shadow: 0 20px 40px -20px var(--mc-production-glow);
}

.card-docs:hover {
  border-color: var(--mc-docs);
  box-shadow: 0 20px 40px -20px var(--mc-docs-glow);
}

.card-import:hover {
  border-color: var(--mc-import);
  box-shadow: 0 20px 40px -20px var(--mc-import-glow);
}

.card-jobs:hover {
  border-color: var(--mc-jobs);
  box-shadow: 0 20px 40px -20px var(--mc-jobs-glow);
}

.card-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 200px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.card-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--mc-elevated);
  border: 1px solid var(--mc-border);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.card-icon svg {
  width: 24px;
  height: 24px;
}

.card-library .card-icon {
  color: var(--mc-accent);
}

.card-create .card-icon {
  color: var(--mc-create);
}

.card-production .card-icon {
  color: var(--mc-production);
}

.card-docs .card-icon {
  color: var(--mc-docs);
}

.card-import .card-icon {
  color: var(--mc-import);
}

.card-jobs .card-icon {
  color: var(--mc-jobs);
}

.card-library:hover .card-icon {
  background: var(--mc-accent);
  border-color: var(--mc-accent);
  color: white;
}

.card-create:hover .card-icon {
  background: var(--mc-create);
  border-color: var(--mc-create);
  color: white;
}

.card-production:hover .card-icon {
  background: var(--mc-production);
  border-color: var(--mc-production);
  color: white;
}

.card-docs:hover .card-icon {
  background: var(--mc-docs);
  border-color: var(--mc-docs);
  color: white;
}

.card-import:hover .card-icon {
  background: var(--mc-import);
  border-color: var(--mc-import);
  color: white;
}

.card-jobs:hover .card-icon {
  background: var(--mc-jobs);
  border-color: var(--mc-jobs);
  color: white;
}

.card-badge {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: var(--mc-elevated);
  border: 1px solid var(--mc-border);
  border-radius: 100px;
  font-size: 0.75rem;
}

.badge-value {
  font-weight: 700;
  color: var(--mc-accent);
  font-variant-numeric: tabular-nums;
}

.badge-label {
  color: var(--mc-text-muted);
  font-weight: 500;
}

.card-badge.new {
  background: var(--mc-create-glow);
  border-color: var(--mc-create);
}

.card-badge.new .badge-label {
  color: var(--mc-create);
}

.badge-pulse {
  width: 6px;
  height: 6px;
  background: var(--mc-create);
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

.card-badge.docs {
  background: var(--mc-docs-glow);
  border-color: var(--mc-docs);
}

.card-badge.docs .badge-label {
  color: var(--mc-docs);
}

.card-badge.production {
  background: var(--mc-production-glow);
  border-color: var(--mc-production);
}

.card-badge.production .badge-label {
  color: var(--mc-production);
}

.card-badge.import {
  background: var(--mc-import-glow);
  border-color: var(--mc-import);
}

.card-badge.import .badge-label {
  color: var(--mc-import);
}

.card-badge.jobs {
  background: var(--mc-jobs-glow);
  border-color: var(--mc-jobs);
}

.card-badge.jobs .badge-label {
  color: var(--mc-jobs);
}

.card-badge.jobs .badge-pulse {
  background: var(--mc-jobs);
}

.card-badge.loading {
  min-width: 60px;
}

.badge-skeleton {
  width: 40px;
  height: 14px;
  background: var(--mc-border);
  border-radius: 4px;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.card-body {
  flex: 1;
}

.card-title {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--mc-text);
  margin: 0 0 0.75rem 0;
  letter-spacing: -0.01em;
}

.card-description {
  font-size: 0.875rem;
  color: var(--mc-text-dim);
  line-height: 1.6;
  margin: 0;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--mc-border);
}

.card-action {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--mc-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: color 0.2s ease;
}

.card-library:hover .card-action { color: var(--mc-accent); }
.card-create:hover .card-action { color: var(--mc-create); }
.card-production:hover .card-action { color: var(--mc-production); }
.card-docs:hover .card-action { color: var(--mc-docs); }
.card-import:hover .card-action { color: var(--mc-import); }
.card-jobs:hover .card-action { color: var(--mc-jobs); }

.card-arrow {
  width: 20px;
  height: 20px;
  color: var(--mc-text-muted);
  transition: all 0.2s ease;
}

.action-card:hover .card-arrow {
  transform: translateX(4px);
}

.card-library:hover .card-arrow { color: var(--mc-accent); }
.card-create:hover .card-arrow { color: var(--mc-create); }
.card-production:hover .card-arrow { color: var(--mc-production); }
.card-docs:hover .card-arrow { color: var(--mc-docs); }
.card-import:hover .card-arrow { color: var(--mc-import); }
.card-jobs:hover .card-arrow { color: var(--mc-jobs); }

/* Stats Bar */
.stats-section {
  margin-top: 2rem;
}

.stats-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 1.25rem 2rem;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: 12px;
}

@media (max-width: 768px) {
  .stats-bar {
    flex-wrap: wrap;
    gap: 1.5rem;
  }

  .stat-divider {
    display: none;
  }
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--mc-text);
  font-variant-numeric: tabular-nums;
}

.stat-value.status-online {
  color: var(--mc-accent);
  font-size: 0.875rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--mc-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: var(--mc-border);
}

/* Responsive */
@media (max-width: 640px) {
  .header-inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.5rem;
  }

  .mc-main {
    padding: 2rem 1.5rem;
  }

  .card-content {
    min-height: 180px;
  }

  .card-title {
    font-size: 1.25rem;
  }
}
</style>
