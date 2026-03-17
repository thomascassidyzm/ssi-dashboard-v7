<template>
  <header v-if="!isHidden" class="app-navbar">
    <div class="navbar-inner">
      <!-- Left: Back link + Title -->
      <div class="navbar-left">
        <router-link v-if="backLink" :to="backLink.to" class="back-link">
          {{ backLink.label }}
        </router-link>
        <h1 class="navbar-title">{{ title }}</h1>
      </div>

      <!-- Center: Tabs -->
      <nav v-if="tabs.length" class="navbar-tabs">
        <router-link
          v-for="tab in tabs"
          :key="tab.label"
          :to="tab.to"
          class="tab-item"
          :class="{ active: tab.active }"
        >
          {{ tab.label }}
          <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
        </router-link>
      </nav>

      <!-- Right: Summary + Env + Course Switcher + User -->
      <div class="navbar-right">
        <span v-if="showSummary && !loading" class="course-summary">
          <span class="summary-value">{{ courseCount }}</span> courses
          <span class="summary-sep">&middot;</span>
          <span class="summary-value">{{ inProductionCount }}</span> in production
        </span>
        <div class="navbar-env-deploy">
          <EnvironmentSwitcher />
        </div>
        <CourseSwitcherDropdown />
        <div v-if="isAuthenticated" class="user-menu" ref="userMenuRef">
          <button @click="showUserMenu = !showUserMenu" class="avatar-btn">
            {{ userInitial }}
          </button>
          <div v-if="showUserMenu" class="user-dropdown">
            <div class="user-dropdown-name">{{ learner?.display_name || user?.email }}</div>
            <button @click="handleLogout" class="user-dropdown-logout">Sign out</button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCourses } from '../composables/useCourses'
import { useAuth } from '../composables/useAuth'
import { getApiUrl } from '../services/api'
import EnvironmentSwitcher from './EnvironmentSwitcher.vue'
import CourseSwitcherDropdown from './CourseSwitcherDropdown.vue'

const route = useRoute()
const router = useRouter()
const { courses, loading, loadCourses, courseCount, inProductionCount, getCourseName } = useCourses()
const { isAuthenticated, user, learner, logout } = useAuth()

const showUserMenu = ref(false)
const userMenuRef = ref(null)

const userInitial = computed(() => {
  const name = learner.value?.display_name || user.value?.email || ''
  return name.charAt(0).toUpperCase() || '?'
})

async function handleLogout() {
  showUserMenu.value = false
  await logout()
  router.push({ name: 'Login' })
}

function handleClickOutside(e) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target)) {
    showUserMenu.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

const activeJobCount = ref(0)

// Hide on auth routes
const isHidden = computed(() => route.meta.public === true)

// Context detection
const isHome = computed(() => route.path === '/')
const isJobs = computed(() => route.path === '/jobs')
const isDocs = computed(() => route.path.startsWith('/docs'))
const isProduction = computed(() => route.path.startsWith('/production/') && route.params.courseCode)
const courseCode = computed(() => route.params.courseCode || null)
const isCreateMode = computed(() => courseCode.value === 'new')

// Show course summary only on home page
const showSummary = computed(() => isHome.value)

// Back link
const backLink = computed(() => {
  if (isHome.value) return null
  return { to: '/', label: 'Courses' }
})

// Title
const title = computed(() => {
  if (isHome.value) return 'Popty'
  if (isDocs.value) return 'Documentation'
  if (isJobs.value) return 'Active Jobs'
  if (isCreateMode.value) return 'New Course'
  if (isProduction.value) return getCourseName(courseCode.value)
  return route.meta.title || 'Popty'
})

// Tabs
const tabs = computed(() => {
  if (isHome.value) {
    return [
      { label: 'Courses', to: '/', active: true },
      {
        label: 'Jobs',
        to: '/jobs',
        active: false,
        badge: activeJobCount.value > 0 ? activeJobCount.value : null
      },
      { label: 'Docs', to: '/docs', active: false }
    ]
  }

  if (isProduction.value && !isCreateMode.value) {
    const code = courseCode.value
    return [
      {
        label: 'Overview',
        to: `/production/${code}`,
        active: route.name === 'ProductionDashboard'
      },
      {
        label: 'Text',
        to: `/production/${code}/text`,
        active: route.name === 'TextGeneration'
      },
      {
        label: 'Audio',
        to: `/production/${code}/pipeline`,
        active: route.name === 'AudioPipelineProduction'
      },
      {
        label: 'Recording',
        to: `/production/${code}/recording`,
        active: route.name === 'AutocueStudioCourse'
      },
      {
        label: 'QA',
        to: { name: 'ScriptViewer', params: { courseCode: code }, query: { filter: 'flagged' } },
        active: route.name === 'ScriptViewer' && route.query.filter === 'flagged'
      }
    ]
  }

  if (isCreateMode.value) {
    return [
      { label: 'Text', to: '/production/new/text', active: true }
    ]
  }

  if (isDocs.value) {
    return [
      { label: 'Overview', to: '/docs', active: route.name === 'DocsIndex' },
      { label: 'APML', to: '/docs/apml', active: route.name === 'APMLSpec' },
      { label: 'Pedagogy', to: '/docs/pedagogy', active: route.name === 'Pedagogy' },
      { label: 'Glossary', to: '/docs/terminology', active: route.name === 'TerminologyGlossary' },
      { label: 'Seeds', to: '/docs/seeds', active: route.name === 'CanonicalSeeds' },
      { label: 'Content', to: '/docs/canonical', active: route.name === 'CanonicalContent' },
      { label: 'Pipeline', to: '/docs/pipeline', active: route.name === 'ProcessOverview' },
      { label: 'Intelligence', to: '/docs/intelligence', active: route.name === 'PhaseIntelligence' }
    ]
  }

  return []
})

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
  } catch {
    activeJobCount.value = 0
  }
}

onMounted(() => {
  loadCourses()
  loadJobCount()
})
</script>

<style scoped>
.app-navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 56px;
  background: var(--color-shadow, #1e293b);
  border-bottom: 1px solid var(--color-graphite, #475569);
  padding: 0 1.5rem;
}

.navbar-inner {
  max-width: 1400px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

/* Left section */
.navbar-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
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

.navbar-title {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-paper, #f7f7f2);
  margin: 0;
  white-space: nowrap;
}

/* Tabs */
.navbar-tabs {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.navbar-tabs::-webkit-scrollbar {
  display: none;
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
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.tab-item:hover {
  color: var(--color-paper, #f7f7f2);
  background: var(--color-slate, #334155);
}

.tab-item.active {
  color: var(--color-tungsten, #ffa630);
  background: var(--color-slate, #334155);
}

.tab-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-shadow, #1e293b);
  background: #8b5cf6;
  border-radius: 9px;
  padding: 0 0.375rem;
  min-width: 18px;
  text-align: center;
  line-height: 18px;
}

/* Right section */
.navbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.course-summary {
  font-size: 0.75rem;
  color: var(--color-paper-muted, #64748b);
  white-space: nowrap;
}

.summary-value {
  font-weight: 700;
  color: var(--color-paper-dim, #c1c1bb);
  font-variant-numeric: tabular-nums;
}

.summary-sep {
  margin: 0 0.25rem;
  opacity: 0.5;
}

.user-menu {
  position: relative;
  flex-shrink: 0;
}

.avatar-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-slate, #334155);
  border: 1px solid var(--color-graphite, #475569);
  color: var(--color-paper-dim, #c1c1bb);
  font-weight: 700;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-btn:hover {
  border-color: var(--color-tungsten, #ffa630);
  color: var(--color-paper, #f7f7f2);
}

.user-dropdown {
  position: absolute;
  top: 40px;
  right: 0;
  background: var(--color-shadow, #1e293b);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 8px;
  padding: 0.5rem 0;
  min-width: 180px;
  z-index: 200;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}

.user-dropdown-name {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  color: var(--color-paper-dim, #c1c1bb);
  border-bottom: 1px solid var(--color-graphite, #475569);
}

.user-dropdown-logout {
  display: block;
  width: 100%;
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  color: #ef4444;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.user-dropdown-logout:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* Responsive — tabs MUST always be visible */
@media (max-width: 900px) {
  .app-navbar {
    height: auto;
  }

  .navbar-inner {
    flex-wrap: wrap;
    padding: 0.5rem 0;
    gap: 0;
  }

  .navbar-left {
    order: 1;
    min-width: 0;
    flex: 1;
  }

  .navbar-title {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.9375rem;
  }

  .navbar-right {
    order: 2;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .navbar-tabs {
    order: 3;
    width: 100%;
    justify-content: center;
    padding: 0.25rem 0;
    border-top: 1px solid var(--color-graphite, #475569);
    margin-top: 0.375rem;
  }

  .course-summary {
    display: none;
  }

  /* Title is visible — hide the duplicate name in course switcher, keep just the code */
  .navbar-right :deep(.course-name) {
    display: none;
  }
}

@media (max-width: 640px) {
  .app-navbar {
    padding: 0 0.75rem;
  }

  .navbar-title {
    font-size: 0.8125rem;
  }

  .tab-item {
    font-size: 0.8125rem;
    padding: 0.375rem 0.625rem;
  }
}
</style>
