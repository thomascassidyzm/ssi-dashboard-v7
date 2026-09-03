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
          class="ui-search"
        />
      </div>

      <!-- Recents — the fast path back to what you were working on -->
      <div v-if="recentCourses.length" class="mb-4 flex items-center gap-2 flex-wrap">
        <span class="ui-filter-label">Recent</span>
        <button
          v-for="code in recentCourses"
          :key="code"
          @click="openCourse(code)"
          class="ui-recent-chip font-mono"
        >
          {{ code }}
        </button>
      </div>

      <!-- Filters -->
      <div class="mb-2 flex flex-wrap items-center gap-2.5">
        <!-- Release status (tri-state) -->
        <span class="ui-filter-label">Release</span>
        <button
          v-for="s in statusFilters"
          :key="s.value"
          @click="cycleFilter('status', s.value)"
          :class="chipClass('status', s)"
        >
          {{ s.label }}
        </button>

        <span class="text-faint mx-1">|</span>

        <!-- Pricing (tri-state) -->
        <span class="ui-filter-label">Pricing</span>
        <button
          v-for="p in pricingFilters"
          :key="p.value"
          @click="cycleFilter('pricing', p.value)"
          :class="chipClass('pricing', p)"
        >
          {{ p.label }}
        </button>
      </div>

      <!-- Language dropdowns + reset -->
      <div class="mb-5 flex flex-wrap items-center gap-2.5">
        <span class="ui-filter-label">Known</span>
        <FilterSelect
          v-model="knownFilter"
          :options="knownOptions"
          placeholder="All"
          filter-placeholder="Type a language…"
          button-class="ui-select"
          data-test="known-filter"
        />

        <span class="ui-filter-label ml-2">Target</span>
        <FilterSelect
          v-model="targetFilter"
          :options="targetOptions"
          placeholder="All"
          filter-placeholder="Type a language…"
          button-class="ui-select"
          data-test="target-filter"
        />

        <button
          v-if="hasActiveFilters"
          @click="resetFilters"
          class="ml-2 text-xs text-faint hover:text-ink underline underline-offset-2"
        >
          Reset filters
        </button>
        <button
          @click="setSort('recent')"
          class="ui-sort-btn"
          :class="{ 'ui-sort-btn-active': sortKey === 'recent' }"
        >
          ↻ Recently used
        </button>
        <span class="ui-count">{{ filteredCourses.length }} of {{ accessibleCount }} courses</span>
      </div>

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

      <!-- Courses table — dense, scannable, scales -->
      <div v-else class="ui-table-wrap">
        <table class="ui-table">
          <thead>
            <tr>
              <th class="w-9 px-3 py-2 text-center">
                <input type="checkbox" :checked="allFilteredSelected" @change="toggleSelectAll" />
              </th>
              <th class="text-left px-3 py-2 ui-th-sort" @click="setSort('code')">Code{{ sortIndicator('code') }}</th>
              <th class="text-left px-3 py-2 ui-th-sort" @click="setSort('name')">Name{{ sortIndicator('name') }}</th>
              <th class="text-left px-3 py-2 ui-th-sort hidden md:table-cell" @click="setSort('known')">Known{{ sortIndicator('known') }}</th>
              <th class="text-left px-3 py-2 ui-th-sort hidden md:table-cell" @click="setSort('target')">Target{{ sortIndicator('target') }}</th>
              <th class="text-left px-3 py-2 ui-th-sort" @click="setSort('pricing')">Pricing{{ sortIndicator('pricing') }}</th>
              <th class="text-left px-3 py-2 ui-th-sort" @click="setSort('stage')">Stage{{ sortIndicator('stage') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="course in sortedCourses"
              :key="course.course_code"
              class="ui-row cursor-pointer"
              :class="{ 'row-selected': selected.has(course.course_code), 'row-new': highlightedCourses.has(course.course_code) }"
              @click="openCourse(course.course_code)"
            >
              <td class="px-3 py-2 text-center" @click.stop>
                <input
                  type="checkbox"
                  :checked="selected.has(course.course_code)"
                  @change="toggleSelect(course.course_code)"
                />
              </td>
              <td class="px-3 py-2 font-mono text-accent-2 whitespace-nowrap">
                {{ course.course_code }}
                <span v-if="highlightedCourses.has(course.course_code)" class="ml-1 text-[10px] text-accent-2 font-sans">• new</span>
              </td>
              <td class="px-3 py-2 text-muted max-w-xs truncate">{{ getFullCourseName(course.course_code) }}</td>
              <td class="px-3 py-2 text-faint hidden md:table-cell">{{ getLanguageName(parseLangs(course.course_code).known) }}</td>
              <td class="px-3 py-2 text-faint hidden md:table-cell">{{ getLanguageName(parseLangs(course.course_code).target) }}</td>
              <td class="px-3 py-2">
                <span class="pricing-pill px-2 py-0.5 rounded-full text-[11px] font-medium" :class="getPricingClass(course.pricing_tier)">
                  {{ (course.pricing_tier || 'premium').toUpperCase() }}
                </span>
              </td>
              <td class="px-3 py-2">
                <span class="status-pill px-2 py-0.5 rounded-full text-[11px] font-medium border" :class="getStatusClass(course.status)">
                  {{ statusLabel(course.status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Bulk action bar -->
    <div v-if="selected.size" class="bulk-bar">
      <span class="font-medium text-ink">{{ selected.size }} selected</span>
      <button @click="clearSelection" class="text-faint hover:text-ink text-sm">Clear</button>
      <span class="bulk-sep"></span>
      <span class="ui-filter-label">Stage →</span>
      <button v-for="s in statusFilters" :key="s.value" :disabled="bulkBusy" @click="applyBulkStatus(s.value)" class="bulk-action">
        {{ s.label }}
      </button>
      <span class="bulk-sep"></span>
      <span class="ui-filter-label">Pricing →</span>
      <button v-for="p in pricingFilters" :key="p.value" :disabled="bulkBusy" @click="applyBulkPricing(p.value)" class="bulk-action">
        {{ p.label }}
      </button>
      <span v-if="bulkBusy" class="text-xs text-faint ml-2">Applying… {{ bulkDone }}/{{ bulkTotal }}</span>
    </div>

    <!-- Bulk confirm modal -->
    <div v-if="pendingBulk" class="bulk-modal-overlay" @click.self="cancelBulk">
      <div class="bulk-modal">
        <h3 class="bulk-modal-title">
          Set {{ pendingBulk.kind === 'status' ? 'stage' : 'pricing' }} →
          <span class="text-accent-2">{{ pendingBulk.label }}</span>
        </h3>
        <p class="bulk-modal-body">
          This will change <strong>{{ pendingBulk.count }}</strong>
          course{{ pendingBulk.count > 1 ? 's' : '' }}.
        </p>

        <div v-if="pendingBulk.learnerVisible" class="bulk-modal-warn">
          ⚠️ <strong>{{ pendingBulk.label }}</strong> makes {{ pendingBulk.count > 1 ? 'these courses' : 'this course' }}
          <strong>visible to learners</strong> in the app
          <template v-if="pendingBulk.value === 'beta'"> (Beta courses are shown to learners too)</template>.
          Double-check the selection before confirming.
        </div>

        <div class="bulk-modal-actions">
          <button @click="cancelBulk" class="bulk-modal-cancel">Cancel</button>
          <button
            @click="confirmBulk"
            class="bulk-modal-confirm"
            :class="{ 'bulk-modal-confirm-danger': pendingBulk.learnerVisible }"
          >
            {{ pendingBulk.learnerVisible ? `Yes, set ${pendingBulk.count} to ${pendingBulk.label}` : `Set ${pendingBulk.count} to ${pendingBulk.label}` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import api, { getApiUrl } from '../services/api'
import { isConfigured as isSupabaseConfigured, getAllCourses, getAllCourseStats } from '../services/supabase'
import { useCourses } from '../composables/useCourses'
import { useAuth } from '../composables/useAuth'
import FilterSelect from '../components/ui/FilterSelect.vue'

const toast = useToast()
const router = useRouter()
const { canAccessCourse, getAccessToken } = useAuth()
const { getCourseName, getLanguageName } = useCourses()
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

// Simple on/off filter: a value is either included or not.
function cycleFilter(group, value) {
  const stateRef = filterGroups[group]
  const next = { ...stateRef.value }
  if (next[value]) delete next[value]
  else next[value] = 'include'
  stateRef.value = next
}

function chipClass(group, item) {
  const active = !!filterGroups[group].value[item.value]
  const base = 'filter-pill ui-chip'
  return active ? `${base} ${item.activeClass}` : `${base} border-line text-faint hover:border-line hover:text-ink`
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

// Language options for the filter dropdowns. The code goes in as the option
// VALUE (and as the hint) so typing `fra` finds French, the way Tom searches.
function langOptions(codes) {
  return [
    { value: '', label: 'All' },
    ...codes.map((code) => ({ value: code, label: getLanguageName(code), hint: code })),
  ]
}
const knownOptions = computed(() => langOptions(knownLangs.value))
const targetOptions = computed(() => langOptions(targetLangs.value))

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

// ── Recents (the 90% path: get back to a course you were working on) ──
const RECENTS_KEY = 'popty:recentCourses'
const recentCourses = ref([])

function loadRecents() {
  try {
    recentCourses.value = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]').slice(0, 8)
  } catch { recentCourses.value = [] }
}

function pushRecent(code) {
  const list = [code, ...recentCourses.value.filter(c => c !== code)].slice(0, 8)
  recentCourses.value = list
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify(list)) } catch { /* private mode */ }
}

function openCourse(code) {
  pushRecent(code)
  router.push(`/production/${code}`)
}

// ── Multi-select + bulk course-level ops ──
const selected = ref(new Set())

function toggleSelect(code) {
  const next = new Set(selected.value)
  next.has(code) ? next.delete(code) : next.add(code)
  selected.value = next
}

const allFilteredSelected = computed(() =>
  filteredCourses.value.length > 0 && filteredCourses.value.every(c => selected.value.has(c.course_code))
)

function toggleSelectAll() {
  const next = new Set(selected.value)
  if (allFilteredSelected.value) filteredCourses.value.forEach(c => next.delete(c.course_code))
  else filteredCourses.value.forEach(c => next.add(c.course_code))
  selected.value = next
}

function clearSelection() {
  selected.value = new Set()
}

const bulkBusy = ref(false)
const bulkDone = ref(0)
const bulkTotal = ref(0)

async function authHeaders() {
  const h = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
  try {
    const token = await getAccessToken?.()
    if (token) h.Authorization = `Bearer ${token}`
  } catch { /* unauthenticated fetch still attempted */ }
  return h
}

// Pending bulk action awaiting confirmation in the modal.
const pendingBulk = ref(null) // { kind, value, label, count, learnerVisible }

// kind: 'status' (value = draft|beta|released) or 'pricing' (value = free|premium|community)
function requestBulk(kind, value) {
  const codes = [...selected.value]
  if (!codes.length || bulkBusy.value) return
  pendingBulk.value = {
    kind,
    value,
    label: kind === 'status' ? statusLabel(value) : value.charAt(0).toUpperCase() + value.slice(1),
    count: codes.length,
    // beta + released (Live) both make courses visible to learners in the app.
    learnerVisible: kind === 'status' && (value === 'beta' || value === 'released'),
  }
}

function cancelBulk() {
  pendingBulk.value = null
}

async function confirmBulk() {
  const pending = pendingBulk.value
  if (!pending || bulkBusy.value) return
  const { kind, value, label } = pending
  pendingBulk.value = null

  const codes = [...selected.value]
  if (!codes.length) return

  bulkBusy.value = true
  bulkTotal.value = codes.length
  bulkDone.value = 0

  const base = getApiUrl()
  const headers = await authHeaders()
  let ok = 0
  const failed = []

  for (const code of codes) {
    try {
      const url = kind === 'status'
        ? `${base}/api/production/${code}/status`
        : `${base}/api/production/${code}/pricing-tier`
      const body = kind === 'status' ? { status: value } : { pricingTier: value }
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
      if (!res.ok) throw new Error(`${res.status}`)
      const c = courses.value.find(x => x.course_code === code)
      if (c) {
        if (kind === 'status') c.status = value
        else c.pricing_tier = value
      }
      ok++
    } catch (e) {
      failed.push(code)
      console.warn(`Bulk ${kind} failed for ${code}:`, e.message)
    }
    bulkDone.value++
  }

  courses.value = [...courses.value] // trigger reactivity for updated pills
  bulkBusy.value = false
  clearSelection()

  if (failed.length) toast.warning(`Updated ${ok}/${codes.length} — failed: ${failed.map(getCourseName).join(', ')}`)
  else toast.success(`Updated ${ok} course${ok > 1 ? 's' : ''} → ${label}`)
}

function applyBulkStatus(value) { requestBulk('status', value) }
function applyBulkPricing(value) { requestBulk('pricing', value) }

// One dimension's filter: no selection = all; otherwise must match one.
function passesTriState(state, value) {
  const includes = Object.keys(state).filter(k => state[k] === 'include')
  return includes.length === 0 || includes.includes(value)
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

// ── Column sorting ──
const sortKey = ref('code')   // code | name | known | target | pricing | stage | recent
const sortDir = ref('asc')

const STAGE_RANK = { draft: 0, beta: 1, released: 2 }
const PRICING_RANK = { free: 0, premium: 1, community: 2 }

function setSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    // Recent reads most-recent-first by default; everything else A→Z.
    sortDir.value = key === 'recent' ? 'desc' : 'asc'
  }
}

function sortIndicator(key) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? ' ▲' : ' ▼'
}

function sortValue(course, key) {
  const code = course.course_code
  const { known, target } = parseLangs(code)
  switch (key) {
    case 'name': return getFullCourseName(code).toLowerCase()
    case 'known': return getLanguageName(known).toLowerCase()
    case 'target': return getLanguageName(target).toLowerCase()
    case 'pricing': return PRICING_RANK[course.pricing_tier || 'premium'] ?? 9
    case 'stage': return STAGE_RANK[course.status || 'draft'] ?? 9
    case 'recent': {
      const i = recentCourses.value.indexOf(code)
      return i === -1 ? -1 : recentCourses.value.length - i  // higher = more recent
    }
    default: return code  // code
  }
}

const sortedCourses = computed(() => {
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...filteredCourses.value].sort((a, b) => {
    const va = sortValue(a, sortKey.value)
    const vb = sortValue(b, sortKey.value)
    if (va < vb) return -1 * dir
    if (va > vb) return 1 * dir
    // tie-break on code for stable, predictable ordering
    return a.course_code < b.course_code ? -1 : a.course_code > b.course_code ? 1 : 0
  })
})

onMounted(async () => {
  loadRecents()
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
/* Search, filter chips, pill dropdowns and the dense table now live in
   `src/assets/ui-tokens.css` — the Voice Lab reads from the same file, so the
   two screens share one look instead of two that nearly match. Only what is
   genuinely course-specific stays here. */
.chip-no {
  font-size: 0.7rem;
  line-height: 1;
}

/* Course-specific row states */
.ui-row.row-selected {
  background: color-mix(in srgb, var(--accent-2, var(--accent)) 12%, transparent);
}
.ui-row.row-new {
  box-shadow: inset 3px 0 0 var(--accent-2, var(--accent));
}

/* Bulk action bar — sticky at the bottom while a selection exists */
.bulk-bar {
  position: fixed;
  left: 50%;
  bottom: 1.25rem;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  max-width: calc(100vw - 2rem);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 0.6rem 1rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}
.bulk-sep {
  width: 1px;
  height: 1.25rem;
  background: var(--line);
}
.bulk-action {
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--ink);
  border-radius: 9999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}
.bulk-action:hover:not(:disabled) {
  border-color: var(--accent-2, var(--accent));
  color: var(--accent-2, var(--accent));
}
.bulk-action:disabled {
  opacity: 0.5;
  cursor: default;
}

/* Bulk confirm modal */
.bulk-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.bulk-modal {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 0.85rem;
  padding: 1.5rem;
  width: 100%;
  max-width: 30rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
}
.bulk-modal-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 0.75rem;
}
.bulk-modal-body {
  font-size: 0.9rem;
  color: var(--muted);
  margin-bottom: 0.75rem;
}
.bulk-modal-warn {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: var(--ink);
  border-radius: 0.6rem;
  padding: 0.75rem 0.85rem;
  font-size: 0.85rem;
  line-height: 1.45;
  margin-bottom: 1.1rem;
}
.bulk-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}
.bulk-modal-cancel {
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--ink);
  border-radius: 0.55rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
}
.bulk-modal-cancel:hover {
  border-color: var(--muted);
}
.bulk-modal-confirm {
  background: var(--accent-2, var(--accent));
  border: 1px solid var(--accent-2, var(--accent));
  color: #fff;
  border-radius: 0.55rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}
.bulk-modal-confirm:hover {
  opacity: 0.9;
}
.bulk-modal-confirm-danger {
  background: #d97706;
  border-color: #d97706;
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
