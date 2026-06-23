<template>
  <div class="min-h-screen bg-canvas text-ink p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link to="/" class="text-accent-2 hover:opacity-80 mb-4 inline-block">
          ← Back to Dashboard
        </router-link>
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-4xl font-bold text-accent-2 mb-2">Course Library</h1>
            <p class="text-muted">Browse and edit existing courses</p>
          </div>
          <router-link
            to="/production/new/text"
            class="bg-accent-2 hover:opacity-90 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <span class="text-lg">+</span>
            <span>New Course</span>
          </router-link>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="mb-4">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search courses (e.g., 'Spanish', 'fra_for_eng', 'Basket Generation')..."
          class="w-full bg-surface border border-line rounded-lg px-4 py-3 text-ink placeholder-faint focus:outline-none focus:border-accent-2 focus:ring-1 focus:ring-accent-2"
        />
      </div>

      <!-- Filters -->
      <div class="mb-2 flex flex-wrap items-center gap-2.5">
        <!-- Release status (tri-state) -->
        <span class="text-xs text-faint uppercase tracking-wider">Release</span>
        <button
          v-for="s in statusFilters"
          :key="s.value"
          @click="cycleFilter('status', s.value)"
          :class="chipClass('status', s)"
        >
          <span v-if="statusState[s.value] === 'exclude'" class="chip-no">⊘</span>
          {{ s.label }}
        </button>

        <span class="text-faint mx-1">|</span>

        <!-- Pricing (tri-state) -->
        <span class="text-xs text-faint uppercase tracking-wider">Pricing</span>
        <button
          v-for="p in pricingFilters"
          :key="p.value"
          @click="cycleFilter('pricing', p.value)"
          :class="chipClass('pricing', p)"
        >
          <span v-if="pricingState[p.value] === 'exclude'" class="chip-no">⊘</span>
          {{ p.label }}
        </button>
      </div>

      <!-- Language dropdowns + reset -->
      <div class="mb-5 flex flex-wrap items-center gap-2.5">
        <span class="text-xs text-faint uppercase tracking-wider">Known</span>
        <select v-model="knownFilter" class="filter-select">
          <option value="">All</option>
          <option v-for="l in knownLangs" :key="l" :value="l">{{ l }}</option>
        </select>

        <span class="text-xs text-faint uppercase tracking-wider ml-2">Target</span>
        <select v-model="targetFilter" class="filter-select">
          <option value="">All</option>
          <option v-for="l in targetLangs" :key="l" :value="l">{{ l }}</option>
        </select>

        <button
          v-if="hasActiveFilters"
          @click="resetFilters"
          class="ml-2 text-xs text-faint hover:text-ink underline underline-offset-2"
        >
          Reset filters
        </button>
        <span class="ml-auto text-xs text-faint">{{ filteredCourses.length }} of {{ accessibleCount }} courses</span>
      </div>

      <!-- Tri-state hint -->
      <p class="mb-4 text-xs text-faint">
        Tip: click a chip once to show <em>only</em> it, twice (⊘) to <em>hide</em> it, a third time to clear.
      </p>

      <!-- Stats loading indicator -->
      <div v-if="loadingStats" class="mb-4 flex items-center gap-2 text-sm text-faint">
        <div class="w-3 h-3 border-2 border-line border-t-accent-2 rounded-full animate-spin"></div>
        Loading course stats...
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="text-muted">Loading courses...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-panel bg-red-900/20 border border-red-500/50 rounded-lg p-6">
        <h3 class="error-title text-red-400 font-semibold mb-2">Error Loading Courses</h3>
        <p class="text-ink">{{ error }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredCourses.length === 0" class="text-center py-12">
        <div v-if="searchQuery" class="text-muted mb-4">
          No courses matching "{{ searchQuery }}"
        </div>
        <div v-else class="text-muted mb-4">No courses found</div>
        <router-link
          v-if="!searchQuery"
          to="/production/new/text"
          class="inline-block bg-accent-2 hover:opacity-90 text-white px-6 py-3 rounded-lg transition-colors"
        >
          Create Your First Course
        </router-link>
      </div>

      <!-- Courses Grid — compact cards -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        <router-link
          v-for="course in filteredCourses"
          :key="course.course_code"
          :to="`/production/${course.course_code}`"
          :class="[
            'course-card bg-surface rounded-lg px-4 py-3 transition-all cursor-pointer hover:bg-surface-2 hover:shadow-md group',
            highlightedCourses.has(course.course_code)
              ? 'border-2 border-accent-2 shadow-md'
              : 'border border-line hover:border-accent-2'
          ]"
        >
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-base font-semibold text-accent-2 group-hover:opacity-80 truncate font-mono">
              {{ course.course_code }}
            </h3>
            <span
              v-if="highlightedCourses.has(course.course_code)"
              class="px-1.5 py-0.5 bg-accent-2 text-white text-[10px] font-bold rounded-full animate-pulse flex-shrink-0"
            >NEW</span>
          </div>
          <p class="text-xs text-muted truncate mt-0.5 mb-2">
            {{ getFullCourseName(course.course_code) }}
          </p>
          <div class="flex items-center gap-1.5">
            <span
              class="pricing-pill px-2 py-0.5 rounded-full text-[11px] font-medium"
              :class="getPricingClass(course.pricing_tier)"
            >
              {{ (course.pricing_tier || 'premium').toUpperCase() }}
            </span>
            <span
              class="status-pill px-2 py-0.5 rounded-full text-[11px] font-medium border"
              :class="getStatusClass(course.status)"
            >
              {{ statusLabel(course.status) }}
            </span>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import api, { getApiUrl } from '../services/api'
import { isConfigured as isSupabaseConfigured, getAllCourses, getAllCourseStats } from '../services/supabase'
import { useCourses } from '../composables/useCourses'
import { useAuth } from '../composables/useAuth'

const toast = useToast()
const { canAccessCourse } = useAuth()
const { getCourseName } = useCourses()
const courses = ref([])
const loading = ref(true)
const loadingStats = ref(false)
const error = ref(null)
const searchQuery = ref('')
const highlightedCourses = ref(new Set()) // Courses to highlight as new/updated

// Tri-state filters: a value maps to 'include' (show only) or 'exclude' (hide).
// Absent = neutral. Cycle: neutral → include → exclude → neutral.
const statusState = ref({})
const pricingState = ref({})
const knownFilter = ref('')
const targetFilter = ref('')

const statusFilters = [
  { value: 'draft', label: 'Testing', activeClass: 'bg-surface-3/40 border-slate-400 text-ink' },
  { value: 'beta', label: 'Beta', activeClass: 'bg-yellow-600/20 border-yellow-500 text-yellow-400' },
  { value: 'released', label: 'Live', activeClass: 'bg-emerald-600/20 border-emerald-500 text-emerald-400' },
]

const pricingFilters = [
  { value: 'free', label: 'Free', activeClass: 'bg-emerald-600/20 border-emerald-400 text-emerald-400' },
  { value: 'premium', label: 'Premium', activeClass: 'bg-yellow-600/20 border-yellow-500 text-yellow-400' },
  { value: 'community', label: 'Community', activeClass: 'bg-blue-600/20 border-blue-500 text-blue-400' },
]

const filterGroups = { status: statusState, pricing: pricingState }

function cycleFilter(group, value) {
  const stateRef = filterGroups[group]
  const cur = stateRef.value[value]
  const next = { ...stateRef.value }
  if (!cur) next[value] = 'include'
  else if (cur === 'include') next[value] = 'exclude'
  else delete next[value]
  stateRef.value = next
}

function chipClass(group, item) {
  const st = filterGroups[group].value[item.value]
  const base = 'filter-pill px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer inline-flex items-center gap-1'
  if (st === 'include') return `${base} ${item.activeClass}`
  if (st === 'exclude') return `${base} bg-red-600/15 border-red-500/60 text-red-400 line-through`
  return `${base} border-line text-faint hover:border-line hover:text-ink`
}

// Parse `{target}_for_{known}` (target may carry a region, e.g. ara_eg, por_br).
function parseLangs(code) {
  const i = code.indexOf('_for_')
  if (i === -1) return { target: code, known: '' }
  return { target: code.slice(0, i), known: code.slice(i + 5) }
}

const accessibleCourses = computed(() => courses.value.filter(c => canAccessCourse(c.course_code)))
const accessibleCount = computed(() => accessibleCourses.value.length)

const knownLangs = computed(() =>
  [...new Set(accessibleCourses.value.map(c => parseLangs(c.course_code).known).filter(Boolean))].sort()
)
const targetLangs = computed(() =>
  [...new Set(accessibleCourses.value.map(c => parseLangs(c.course_code).target).filter(Boolean))].sort()
)

const hasActiveFilters = computed(() =>
  Object.keys(statusState.value).length > 0 ||
  Object.keys(pricingState.value).length > 0 ||
  !!knownFilter.value || !!targetFilter.value || !!searchQuery.value
)

function resetFilters() {
  statusState.value = {}
  pricingState.value = {}
  knownFilter.value = ''
  targetFilter.value = ''
  searchQuery.value = ''
}

// One dimension's tri-state pass: includes are OR; excludes always remove.
function passesTriState(state, value) {
  const includes = Object.keys(state).filter(k => state[k] === 'include')
  const excludes = Object.keys(state).filter(k => state[k] === 'exclude')
  if (excludes.includes(value)) return false
  if (includes.length > 0) return includes.includes(value)
  return true
}

// Computed: Filtered courses based on search query + filters
const filteredCourses = computed(() => {
  let result = accessibleCourses.value

  result = result.filter(c => {
    const status = c.status || 'draft'
    const tier = c.pricing_tier || 'premium'
    const { known, target } = parseLangs(c.course_code)
    if (!passesTriState(statusState.value, status)) return false
    if (!passesTriState(pricingState.value, tier)) return false
    if (knownFilter.value && known !== knownFilter.value) return false
    if (targetFilter.value && target !== targetFilter.value) return false
    return true
  })

  // Apply search
  if (!searchQuery.value) return result

  const query = searchQuery.value.toLowerCase()

  return result.filter(course => {
    if (course.course_code.toLowerCase().includes(query)) return true
    const fullName = getCourseName(course.course_code).toLowerCase()
    if (fullName.includes(query)) return true
    if (course.phase && course.phase.toLowerCase().includes(query)) return true
    if (course.format && course.format.toLowerCase().includes(query)) return true
    return false
  })
})

onMounted(async () => {
  await loadCourses()
})

async function loadCourses() {
  loading.value = true
  error.value = null

  try {
    if (isSupabaseConfigured()) {
      // Direct Supabase — no ngrok round-trip
      const coursesData = await getAllCourses()
      courses.value = coursesData.map(c => ({
        course_code: c.course_code,
        display_name: c.display_name,
        status: c.status,
        pricing_tier: c.pricing_tier || 'premium',
        seed_count: c.seed_count,
        seed_pairs: 0, lego_pairs: 0, phrases: 0,
        stats: { seeds: 0, completedSeeds: 0, legos: 0, phrases: 0 }
      }))
      loading.value = false

      // Phase 2: Load all stats in one RPC call
      loadingStats.value = true
      const codes = courses.value.map(c => c.course_code)
      try {
        const statsMap = await getAllCourseStats(codes)
        for (const c of courses.value) {
          const s = statsMap[c.course_code]
          if (s) {
            c.seed_pairs = s.completedSeeds || 0
            c.lego_pairs = s.legos || 0
            c.phrases = s.phrases || 0
            c.stats = { ...c.stats, ...s }
          }
        }
        // Trigger reactivity
        courses.value = [...courses.value]
      } catch (err) {
        console.warn('Failed to load course stats:', err.message)
      } finally {
        loadingStats.value = false
      }
    } else {
      // Fallback: API proxy
      const baseUrl = getApiUrl()
      const res = await fetch(`${baseUrl}/api/courses`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
      if (!res.ok) throw new Error(`Failed to load courses: ${res.status}`)
      const data = await res.json()
      courses.value = data.courses || []
      loading.value = false

      // Phase 2: Load stats per-course in background (trickle in)
      loadingStats.value = true
      const codes = courses.value.map(c => c.course_code)
      let pending = codes.length
      const concurrency = 6

      async function fetchStats(code) {
        try {
          const res = await fetch(`${baseUrl}/api/courses/${code}/stats`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
          })
          if (res.ok) {
            const { stats: courseStats } = await res.json()
            const idx = courses.value.findIndex(c => c.course_code === code)
            if (idx !== -1) {
              courses.value[idx] = {
                ...courses.value[idx],
                seed_pairs: courseStats.completedSeeds || 0,
                lego_pairs: courseStats.legos || 0,
                phrases: courseStats.phrases || 0,
                stats: { ...courses.value[idx].stats, ...courseStats }
              }
            }
          }
        } catch {
          // Individual failure is fine
        } finally {
          pending--
          if (pending <= 0) loadingStats.value = false
        }
      }

      const queue = [...codes]
      async function worker() {
        while (queue.length > 0) {
          const code = queue.shift()
          if (code) await fetchStats(code)
        }
      }
      for (let i = 0; i < concurrency; i++) worker()
    }
  } catch (err) {
    error.value = err.message || 'Failed to load courses'
    console.error('Failed to load courses:', err)
    loading.value = false
  }
}

function formatCourseCode(code) {
  // Just return the course code as-is (e.g., "spa_for_eng")
  // This is a builder's tool, so showing the actual code is clearest
  return code
}

function getFullCourseName(courseCode) {
  return getCourseName(courseCode)
}

// Unified release vocabulary — same labels & colours as the filter chips.
// draft → Testing, beta → Beta, released → Live.
function statusLabel(status) {
  const s = (status || 'draft').toLowerCase()
  if (s === 'released' || s === 'live' || s === 'complete') return 'Live'
  if (s === 'beta') return 'Beta'
  if (s === 'draft' || s === 'in_progress') return 'Testing'
  return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Testing'
}

function getStatusClass(status) {
  const label = statusLabel(status)
  if (label === 'Live') return 'sp-live bg-emerald-600/20 border-emerald-500 text-emerald-400'
  if (label === 'Beta') return 'sp-beta bg-yellow-600/20 border-yellow-500 text-yellow-400'
  return 'sp-testing bg-surface-3/40 border-slate-500 text-muted'
}

function getPricingClass(tier) {
  if (tier === 'free') return 'pp-free bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
  if (tier === 'community') return 'pp-community bg-blue-500/20 text-blue-400 border border-blue-500/30'
  return 'pp-premium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
}


</script>

<!--
  Light-mode-only overrides. Dark mode is untouched: every rule below is scoped
  under [data-theme="light"]. The hardcoded Tailwind emerald/yellow/blue/red
  utilities used for status & pricing pills/filters are near-invisible on light
  backgrounds (e.g. text-yellow-400 #facc15 on white = 1.53:1), so we darken the
  text/fill to AA-passing values while keeping the same hue family.
-->
<style scoped>
/* Language dropdowns */
.filter-select {
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--ink);
  border-radius: 9999px;
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  cursor: pointer;
}
.filter-select:focus {
  outline: none;
  border-color: var(--accent-2, var(--accent));
}
.chip-no {
  font-size: 0.7rem;
  line-height: 1;
}

/* Error panel — dark literals (bg-red-900/20, text-red-400) don't read on light */
:root[data-theme="light"] .error-panel {
  background-color: #fef2f2 !important;   /* red-50 */
  border-color: #fca5a5 !important;       /* red-300 */
}
:root[data-theme="light"] .error-title {
  color: #b91c1c !important;              /* red-700 — 5.30:1 on red-50 */
}

/* Inactive filter pills: text-faint already AA (5.30:1 on canvas) — leave.
   Active filter pills carry hardcoded yellow/blue/emerald — darken text+fill. */
:root[data-theme="light"] .filter-pill {
  /* emerald active (released / free) */
}
:root[data-theme="light"] .filter-pill.text-yellow-400 {
  background-color: #fef3c7 !important;   /* amber-100 */
  border-color: #d97706 !important;       /* amber-600 */
  color: #854d0e !important;              /* yellow-800 — 6.15:1 */
}
:root[data-theme="light"] .filter-pill.text-emerald-400 {
  background-color: #d1fae5 !important;   /* emerald-100 */
  border-color: #047857 !important;
  color: #047857 !important;              /* 4.84:1 */
}
:root[data-theme="light"] .filter-pill.text-blue-400 {
  background-color: #dbeafe !important;   /* blue-100 */
  border-color: #1d4ed8 !important;
  color: #1e40af !important;              /* 7.15:1 */
}
:root[data-theme="light"] .filter-pill.text-ink {
  /* draft/Testing active (bg-surface-3/30 text-ink) — bump fill opacity */
  background-color: #e2e8f0 !important;   /* surface-3 — 14.48:1 with ink */
  border-color: #94a3b8 !important;
}

/* Pricing pills on cards */
:root[data-theme="light"] .pricing-pill.pp-free {
  background-color: #d1fae5 !important;
  border-color: #047857 !important;
  color: #047857 !important;              /* 4.84:1 */
}
:root[data-theme="light"] .pricing-pill.pp-community {
  background-color: #dbeafe !important;
  border-color: #1d4ed8 !important;
  color: #1e40af !important;              /* 7.15:1 */
}
:root[data-theme="light"] .pricing-pill.pp-premium {
  background-color: #fef3c7 !important;
  border-color: #d97706 !important;
  color: #854d0e !important;              /* 6.15:1 */
}

/* Release pills on cards (Testing/Beta/Live) — darken hue families for light. */
:root[data-theme="light"] .status-pill.sp-live {
  background-color: #d1fae5 !important;
  border-color: #047857 !important;
  color: #047857 !important;              /* 4.84:1 */
}
:root[data-theme="light"] .status-pill.sp-beta {
  background-color: #fef3c7 !important;
  border-color: #d97706 !important;
  color: #854d0e !important;              /* 6.15:1 */
}
:root[data-theme="light"] .status-pill.sp-testing {
  background-color: #e2e8f0 !important;
  border-color: #94a3b8 !important;
  color: #475569 !important;              /* slate-600 — AA */
}

/* Excluded (tri-state) chips carry text-red-400 — darken for light. */
:root[data-theme="light"] .filter-pill.text-red-400 {
  background-color: #fee2e2 !important;   /* red-100 */
  border-color: #dc2626 !important;
  color: #b91c1c !important;              /* red-700 */
}
</style>
