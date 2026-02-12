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

      <!-- Right: Summary + Env + Course Switcher -->
      <div class="navbar-right">
        <span v-if="showSummary && !loading" class="course-summary">
          <span class="summary-value">{{ courseCount }}</span> courses
          <span class="summary-sep">&middot;</span>
          <span class="summary-value">{{ inProductionCount }}</span> in production
        </span>
        <EnvironmentSwitcher />
        <CourseSwitcherDropdown />
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useCourses } from '../composables/useCourses'
import { getApiUrl } from '../services/api'
import EnvironmentSwitcher from './EnvironmentSwitcher.vue'
import CourseSwitcherDropdown from './CourseSwitcherDropdown.vue'

const route = useRoute()
const { courses, loading, loadCourses, courseCount, inProductionCount, getCourseName } = useCourses()

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

/* Responsive */
@media (max-width: 900px) {
  .navbar-tabs {
    display: none;
  }

  .course-summary {
    display: none;
  }
}

@media (max-width: 640px) {
  .app-navbar {
    padding: 0 1rem;
  }
}
</style>
