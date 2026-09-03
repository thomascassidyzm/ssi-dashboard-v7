<template>
  <div class="pipeline-board">
    <!-- Header: count + filter chips + search -->
    <div class="board-header">
      <div class="header-left">
        <span class="course-count">
          <template v-if="hasActiveFilters">{{ sortedCourses.length }} of </template>{{ courses.length }} courses
          <button v-if="hasActiveFilters" class="clear-all" @click="clearAllFilters" title="Clear all filters">Clear</button>
        </span>
        <!-- Sort buttons -->
        <div class="sort-buttons">
          <button
            v-for="s in sortOptions"
            :key="s.key"
            class="sort-btn"
            :class="{ active: sortBy === s.key }"
            @click="toggleSort(s.key)"
            :title="s.title"
          >
            {{ s.label }}
            <svg v-if="sortBy === s.key" class="sort-arrow" :class="{ desc: sortDesc }" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
          </button>
        </div>
      </div>
      <div class="header-right">
        <!-- Filter chips -->
        <div class="filter-chips">
          <div v-for="facet in facets" :key="facet.key" class="filter-chip-wrapper" v-click-outside="() => closeDropdown(facet.key)">
            <button
              class="filter-chip"
              :class="[`chip-${facet.key}`, { active: activeFilters[facet.key], open: openDropdown === facet.key }]"
              @click="toggleDropdown(facet.key)"
            >
              <span class="chip-label">{{ activeFilters[facet.key] || facet.label }}</span>
              <svg v-if="activeFilters[facet.key]" class="chip-clear" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" @click.stop="clearFilter(facet.key)">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
              <svg v-else class="chip-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            <!-- Dropdown -->
            <Transition name="dropdown">
              <div v-if="openDropdown === facet.key" class="filter-dropdown" :class="`dropdown-${facet.key}`">
                <!--
                  Filter at the very top (Tom, 2026-09-03: "we do NOT want people
                  having to scan down a whole long list of choices"). Target and
                  Known hold dozens of languages. Same threshold the shared
                  FilterSelect uses — past 8 options — and the same matcher, so a
                  language typed here behaves as it does in every other dropdown.
                -->
                <div v-if="facet.options.length > 8" class="dropdown-filter-wrap">
                  <input
                    :ref="setFacetFilterInput"
                    v-model="facetQuery"
                    type="text"
                    class="dropdown-filter"
                    :placeholder="`Type a ${facet.label.toLowerCase()}…`"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="none"
                    spellcheck="false"
                    @keydown.escape.stop.prevent="closeDropdown(facet.key)"
                  />
                </div>
                <button
                  v-for="opt in visibleOptions(facet)"
                  :key="opt.value"
                  class="dropdown-option"
                  :class="{ selected: activeFilters[facet.key] === opt.value }"
                  @click="selectFilter(facet.key, opt.value)"
                >
                  <span class="opt-label">{{ opt.label }}</span>
                  <span class="opt-count">{{ opt.count }}</span>
                </button>
                <div v-if="!visibleOptions(facet).length" class="dropdown-empty">No matches</div>
              </div>
            </Transition>
          </div>
        </div>

        <div class="search-box" :class="{ focused: searchFocused }">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search..."
            @focus="searchFocused = true"
            @blur="searchFocused = false"
          />
        </div>
      </div>
    </div>

    <!-- Course Grid -->
    <div class="course-grid">
      <TransitionGroup name="row" tag="div" class="grid-inner">
        <router-link
          v-for="course in sortedCourses"
          :key="course.code"
          :to="`/production/${course.code}`"
          class="course-card"
          :class="{ active: activeCourse === course.code }"
          @mouseenter="activeCourse = course.code"
          @mouseleave="activeCourse = null"
        >
          <div class="card-main">
            <span class="course-name-label">{{ getFullCourseName(course.code) }}</span>
            <span class="course-code-label">{{ course.code }}</span>
          </div>
          <span class="card-apps">
            <button
              class="app-badge"
              :class="[
                getNormalizedNewAppStatus(course) !== 'not_available' ? 'active' : 'inactive',
                'status-' + getNormalizedNewAppStatus(course)
              ]"
              @click.stop="cycleNewAppStatus(course)"
              title="Click to change New App status"
            >
              N
            </button>
            <button
              class="app-badge legacy"
              :class="[
                getNormalizedLegacyStatus(course) !== 'not_available' ? 'active' : 'inactive',
                'status-' + getNormalizedLegacyStatus(course)
              ]"
              @click.stop="cycleLegacyStatus(course)"
              title="Click to change Legacy App status"
            >
              L
            </button>
          </span>
        </router-link>
      </TransitionGroup>

      <!-- Empty state -->
      <div v-if="sortedCourses.length === 0" class="empty-state">
        <span class="empty-text">{{ hasActiveFilters || searchQuery ? 'No courses match your filters' : 'No courses yet' }}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="board-footer">
      <div class="footer-stat highlight">
        <span class="footer-value">{{ deployedCount }}</span>
        <span class="footer-label">Deployed</span>
      </div>
      <div class="footer-divider"></div>
      <div class="footer-stat">
        <span class="footer-value">{{ courses.length }}</span>
        <span class="footer-label">Total</span>
      </div>
    </div>

    <!-- Toast Notification -->
    <Transition name="toast">
      <div v-if="toastVisible" class="toast-notification">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useCourses } from '../composables/useCourses'
import { filterOptions } from '../utils/optionFilter'

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

const emit = defineEmits(['action', 'updateLegacyStatus', 'updateNewAppStatus', 'deployToProduction'])
const router = useRouter()
const { getCourseName, getLanguageName } = useCourses()

const searchQuery = ref('')
const searchFocused = ref(false)
const activeCourse = ref(null)
const openDropdown = ref(null)

// Active filter selections: { target: 'Spanish', known: 'English', app: 'Live' }
const activeFilters = ref({})

// Sort options
const sortOptions = [
  { key: 'alpha', label: 'A-Z', title: 'Sort alphabetically' },
  { key: 'created', label: 'Created', title: 'Sort by date created' },
  { key: 'updated', label: 'Updated', title: 'Sort by last updated' }
]

// Sort state (persisted)
const SORT_STORAGE_KEY = 'ssi-pipeline-sort'
const sortBy = ref(localStorage.getItem(SORT_STORAGE_KEY) || 'alpha')
const sortDesc = ref(localStorage.getItem(SORT_STORAGE_KEY + '-desc') === 'true')

watch([sortBy, sortDesc], ([newSort, newDesc]) => {
  localStorage.setItem(SORT_STORAGE_KEY, newSort)
  localStorage.setItem(SORT_STORAGE_KEY + '-desc', String(newDesc))
})

function toggleSort(field) {
  if (sortBy.value === field) {
    sortDesc.value = !sortDesc.value
  } else {
    sortBy.value = field
    // Date sorts default to newest-first (desc), alpha defaults to A-Z (asc)
    sortDesc.value = field !== 'alpha'
  }
}

// Toast
const toastMessage = ref('')
const toastVisible = ref(false)

function showToast(message) {
  toastMessage.value = message
  toastVisible.value = true
  setTimeout(() => { toastVisible.value = false }, 2500)
}

// --- Language extraction from course code ---
function parseCode(code) {
  if (!code || !code.includes('_for_')) return { target: code, known: '' }
  const [targetPart, knownPart] = code.split('_for_')
  return { target: targetPart, known: knownPart }
}

function langName(isoCode) {
  return getLanguageName(isoCode)
}

// --- App status helpers ---
function normalizeAppStatus(s) {
  if (!s || s === 'not_available') return 'not_available'
  if (s === 'draft') return 'testing'
  if (s === 'released') return 'live'
  return s
}

function getNormalizedNewAppStatus(course) {
  return normalizeAppStatus(course.newAppStatus)
}

function getNormalizedLegacyStatus(course) {
  return normalizeAppStatus(course.legacyAppStatus)
}

function getAppStatusLabel(course) {
  const newApp = getNormalizedNewAppStatus(course)
  const legacy = getNormalizedLegacyStatus(course)
  // Return highest status across both apps
  for (const s of ['live', 'beta', 'testing']) {
    if (newApp === s || legacy === s) return s.charAt(0).toUpperCase() + s.slice(1)
  }
  return 'Not Deployed'
}

// --- Faceted filters ---
const facets = computed(() => {
  const allCourses = props.courses

  // Target languages
  const targets = {}
  const knowns = {}
  const apps = {}
  const pricing = {}

  for (const c of allCourses) {
    const { target, known } = parseCode(c.code)
    const tName = langName(target)
    const kName = langName(known)
    targets[tName] = (targets[tName] || 0) + 1
    if (kName) knowns[kName] = (knowns[kName] || 0) + 1

    const appLabel = getAppStatusLabel(c)
    apps[appLabel] = (apps[appLabel] || 0) + 1

    const tier = (c.pricingTier || 'premium').charAt(0).toUpperCase() + (c.pricingTier || 'premium').slice(1)
    pricing[tier] = (pricing[tier] || 0) + 1
  }

  function toOptions(map) {
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1]) // most courses first
      .map(([label, count]) => ({ value: label, label, count }))
  }

  return [
    { key: 'target', label: 'Target', options: toOptions(targets) },
    { key: 'known', label: 'Known', options: toOptions(knowns) },
    { key: 'app', label: 'App Status', options: toOptions(apps) },
    { key: 'pricing', label: 'Pricing', options: toOptions(pricing) }
  ]
})

const hasActiveFilters = computed(() => {
  return Object.keys(activeFilters.value).length > 0 || searchQuery.value.trim() !== ''
})

// One query for all the facets, because only one panel is ever open. It clears
// on every open and close, so a panel never reopens holding yesterday's filter.
const facetQuery = ref('')
const facetFilterInput = ref(null)

// Focus the filter when a panel opens. A plain `ref="…"` inside a v-for
// collects an ARRAY, and `document` is not in scope in a template expression,
// so the element is captured here — only one facet panel is ever open.
function setFacetFilterInput(el) {
  facetFilterInput.value = el || null
}

watch(openDropdown, (key) => {
  if (!key) return
  nextTick(() => facetFilterInput.value?.focus?.())
})

/** The facet's option rows surviving the filter — counts and order untouched. */
function visibleOptions(facet) {
  return facetQuery.value.trim() ? filterOptions(facetQuery.value, facet.options) : facet.options
}

function toggleDropdown(key) {
  facetQuery.value = ''
  openDropdown.value = openDropdown.value === key ? null : key
}

function closeDropdown(key) {
  if (openDropdown.value === key) {
    openDropdown.value = null
    facetQuery.value = ''
  }
}

function selectFilter(key, value) {
  if (activeFilters.value[key] === value) {
    // Deselect
    const copy = { ...activeFilters.value }
    delete copy[key]
    activeFilters.value = copy
  } else {
    activeFilters.value = { ...activeFilters.value, [key]: value }
  }
  openDropdown.value = null
  facetQuery.value = ''
}

function clearFilter(key) {
  const copy = { ...activeFilters.value }
  delete copy[key]
  activeFilters.value = copy
}

function clearAllFilters() {
  activeFilters.value = {}
  searchQuery.value = ''
}

// v-click-outside directive
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutsideHandler = (e) => {
      if (!el.contains(e.target)) binding.value()
    }
    document.addEventListener('click', el._clickOutsideHandler)
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutsideHandler)
  }
}

function getFullCourseName(code) {
  return getCourseName(code)
}

// --- Filtering + sorting ---
const sortedCourses = computed(() => {
  let list = props.courses

  // Apply facet filters
  const filters = activeFilters.value
  if (filters.target) {
    list = list.filter(c => {
      const { target } = parseCode(c.code)
      return langName(target) === filters.target
    })
  }
  if (filters.known) {
    list = list.filter(c => {
      const { known } = parseCode(c.code)
      return langName(known) === filters.known
    })
  }
  if (filters.app) {
    list = list.filter(c => getAppStatusLabel(c) === filters.app)
  }
  if (filters.pricing) {
    list = list.filter(c => {
      const tier = (c.pricingTier || 'premium').charAt(0).toUpperCase() + (c.pricingTier || 'premium').slice(1)
      return tier === filters.pricing
    })
  }

  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(c => {
      const name = getFullCourseName(c.code).toLowerCase()
      const code = (c.code || '').toLowerCase()
      return name.includes(q) || code.includes(q)
    })
  }

  // Sort
  const sorted = [...list]
  sorted.sort((a, b) => {
    let cmp = 0
    switch (sortBy.value) {
      case 'created':
        cmp = (a.createdAt || '').localeCompare(b.createdAt || '')
        break
      case 'updated':
        cmp = (a.updatedAt || '').localeCompare(b.updatedAt || '')
        break
      default: // alpha
        cmp = getFullCourseName(a.code).localeCompare(getFullCourseName(b.code))
    }
    return sortDesc.value ? -cmp : cmp
  })

  return sorted
})

// Summary stats
const deployedCount = computed(() => {
  return props.courses.filter(c => {
    const newApp = getNormalizedNewAppStatus(c)
    const legacy = getNormalizedLegacyStatus(c)
    return newApp !== 'not_available' || legacy !== 'not_available'
  }).length
})

// Cycle app statuses
const statusCycle = ['not_available', 'testing', 'beta', 'live']

function cycleNewAppStatus(course) {
  let current = getNormalizedNewAppStatus(course)
  if (!statusCycle.includes(current)) current = 'not_available'
  const nextIndex = (statusCycle.indexOf(current) + 1) % statusCycle.length
  const next = statusCycle[nextIndex]
  showToast(`New App: ${getFullCourseName(course.code)} → ${next === 'not_available' ? 'removed' : next}`)
  emit('updateNewAppStatus', { courseCode: course.code, status: next })
}

function cycleLegacyStatus(course) {
  let current = getNormalizedLegacyStatus(course)
  if (!statusCycle.includes(current)) current = 'not_available'
  const nextIndex = (statusCycle.indexOf(current) + 1) % statusCycle.length
  const next = statusCycle[nextIndex]
  showToast(`Legacy App: ${getFullCourseName(course.code)} → ${next === 'not_available' ? 'removed' : next}`)
  emit('updateLegacyStatus', { courseCode: course.code, status: next })
}
</script>

<style scoped>
.pipeline-board {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  background: var(--color-shadow, var(--surface));
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  overflow: hidden;
}

/* Header */
.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--color-graphite, var(--surface-3));
  background: var(--color-slate, var(--surface-2));
  flex-wrap: wrap;
  gap: 0.5rem;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.course-count {
  font-size: 0.9375rem;
  color: var(--color-paper-dim, var(--muted));
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.clear-all {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--color-paper-dim, var(--muted));
  font-size: 0.75rem;
  font-family: inherit;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.clear-all:hover {
  background: rgba(255, 255, 255, 0.15);
  color: var(--color-paper, var(--ink));
}

/* Sort buttons */
.sort-buttons {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 5px;
  padding: 0.125rem;
}

.sort-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1875rem 0.5rem;
  background: none;
  border: none;
  border-radius: 4px;
  color: var(--color-paper-dim, var(--muted));
  font-size: 0.75rem;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.sort-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-paper, var(--ink));
}

.sort-btn.active {
  background: rgba(255, 255, 255, 0.12);
  color: var(--color-paper, var(--ink));
}

.sort-arrow {
  flex-shrink: 0;
  transition: transform 0.2s;
}

.sort-arrow.desc {
  transform: rotate(180deg);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* Filter chips */
.filter-chips {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.filter-chip-wrapper {
  position: relative;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid;
  border-radius: 5px;
  font-size: 0.8125rem;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

/* Target — amber/orange */
.chip-target {
  background: rgba(255, 166, 48, 0.06);
  border-color: rgba(255, 166, 48, 0.2);
  color: rgba(255, 186, 88, 0.8);
}
.chip-target:hover {
  background: rgba(255, 166, 48, 0.12);
  border-color: rgba(255, 166, 48, 0.35);
}
.chip-target.active {
  background: rgba(255, 166, 48, 0.18);
  border-color: rgba(255, 166, 48, 0.5);
  color: var(--accent);
}

/* Known — blue/cyan */
.chip-known {
  background: rgba(56, 189, 248, 0.06);
  border-color: rgba(56, 189, 248, 0.2);
  color: rgba(125, 211, 252, 0.8);
}
.chip-known:hover {
  background: rgba(56, 189, 248, 0.12);
  border-color: rgba(56, 189, 248, 0.35);
}
.chip-known.active {
  background: rgba(56, 189, 248, 0.18);
  border-color: rgba(56, 189, 248, 0.5);
  color: #38bdf8;
}

/* App status — green */
.chip-app {
  background: rgba(16, 185, 129, 0.06);
  border-color: rgba(16, 185, 129, 0.2);
  color: rgba(52, 211, 153, 0.8);
}
.chip-app:hover {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.35);
}
.chip-app.active {
  background: rgba(16, 185, 129, 0.18);
  border-color: rgba(16, 185, 129, 0.5);
  color: #10b981;
}

.filter-chip.open {
  border-color: rgba(255, 255, 255, 0.25);
}

.chip-arrow {
  opacity: 0.5;
  flex-shrink: 0;
}

.chip-clear {
  opacity: 0.6;
  flex-shrink: 0;
  transition: opacity 0.15s;
}

.chip-clear:hover {
  opacity: 1;
}

/* Filter dropdown */
.filter-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 180px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--color-slate, var(--surface-2));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  z-index: 100;
  padding: 0.25rem;
}

.dropdown-filter-wrap {
  padding: 0.25rem 0.25rem 0.375rem;
}

.dropdown-filter {
  width: 100%;
  padding: 0.4rem 0.55rem;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 6px;
  color: var(--color-paper, var(--ink));
  font-family: inherit;
  font-size: 0.8125rem;
  outline: none;
}

.dropdown-filter:focus {
  border-color: var(--accent-2, var(--accent));
}

.dropdown-empty {
  padding: 0.5rem 0.625rem;
  color: var(--color-paper-dim, var(--muted));
  font-size: 0.8125rem;
  text-align: center;
}

.dropdown-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.4375rem 0.625rem;
  background: none;
  border: none;
  border-radius: 4px;
  color: var(--color-paper-dim, var(--muted));
  font-size: 0.8125rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.1s;
  text-align: left;
}

.dropdown-option:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-paper, var(--ink));
}

/* Selected option inherits parent chip color */
.dropdown-target .dropdown-option.selected {
  background: rgba(255, 166, 48, 0.15);
  color: var(--accent);
}
.dropdown-known .dropdown-option.selected {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}
.dropdown-app .dropdown-option.selected {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.opt-label {
  flex: 1;
}

.opt-count {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.75rem;
  opacity: 0.5;
  min-width: 1.25rem;
  text-align: right;
}

/* Dropdown transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Search */
.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.625rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 6px;
  transition: all 0.2s;
}

.search-box.focused {
  border-color: var(--color-tungsten, var(--accent));
  box-shadow: 0 0 0 2px rgba(255, 166, 48, 0.15);
}

.search-icon {
  color: var(--color-paper-dim, var(--muted));
  flex-shrink: 0;
}

.search-box input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-paper, var(--ink));
  font-size: 0.875rem;
  font-family: inherit;
  width: 140px;
}

.search-box input::placeholder {
  color: var(--color-paper-dim, var(--muted));
}

/* Course grid */
.course-grid {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
}

.grid-inner {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.375rem;
}

.course-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.12s;
  text-decoration: none;
  color: inherit;
}

.course-card:hover,
.course-card.active {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.06);
}

.card-main {
  display: flex;
  flex-direction: column;
  gap: 0.0625rem;
  min-width: 0;
}

.card-apps {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.course-name-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-tungsten, var(--accent));
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.course-code-label {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.6875rem;
  font-weight: 400;
  color: var(--color-paper-dim, var(--muted));
  letter-spacing: 0.01em;
  opacity: 0.6;
}

/* App badges */

.app-badge {
  width: 26px;
  height: 22px;
  border-radius: 3px;
  border: 1px solid;
  cursor: pointer;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.6875rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  padding: 0;
}

.app-badge.inactive {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.12);
}

.app-badge.inactive:hover {
  border-color: rgba(255, 255, 255, 0.15);
  color: var(--color-paper-dim, var(--muted));
}

/* New App colors */
.app-badge.status-testing {
  background: rgba(148, 163, 184, 0.15);
  border-color: rgba(148, 163, 184, 0.3);
  color: var(--muted);
}

.app-badge.status-beta {
  background: rgba(251, 191, 36, 0.15);
  border-color: rgba(251, 191, 36, 0.3);
  color: #fbbf24;
}

.app-badge.status-live {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
}

/* Legacy App — slight cyan tint */
.app-badge.legacy.status-testing {
  background: rgba(148, 163, 184, 0.1);
  border-color: rgba(6, 182, 212, 0.25);
  color: var(--muted);
}

.app-badge.legacy.status-beta {
  background: rgba(6, 182, 212, 0.1);
  border-color: rgba(6, 182, 212, 0.35);
  color: #06b6d4;
}

.app-badge.legacy.status-live {
  background: rgba(6, 182, 212, 0.15);
  border-color: rgba(6, 182, 212, 0.4);
  color: #06b6d4;
}

.app-badge:hover {
  transform: scale(1.1);
}

/* Empty state */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: var(--color-paper-dim, var(--muted));
}

.empty-text {
  font-size: 0.9375rem;
}

/* Footer */
.board-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 0.625rem 1.25rem;
  background: var(--color-slate, var(--surface-2));
  border-top: 1px solid var(--color-graphite, var(--surface-3));
}

.footer-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.0625rem;
}

.footer-value {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-paper, var(--ink));
  font-variant-numeric: tabular-nums;
}

.footer-label {
  font-size: 0.6875rem;
  color: var(--color-paper-dim, var(--muted));
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.footer-stat.highlight .footer-value {
  color: #10b981;
}

.footer-divider {
  width: 1px;
  height: 24px;
  background: var(--color-graphite, var(--surface-3));
}

/* Row transitions */
.row-enter-active,
.row-leave-active {
  transition: all 0.25s ease;
}

.row-enter-from {
  opacity: 0;
  transform: translateX(-8px);
}

.row-leave-to {
  opacity: 0;
  transform: translateX(8px);
}

.row-move {
  transition: transform 0.25s ease;
}

/* Toast */
.toast-notification {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: rgba(16, 185, 129, 0.95);
  color: white;
  border-radius: 6px;
  font-size: 0.9375rem;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  z-index: 9999;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

/* Responsive */
@media (max-width: 1100px) {
  .grid-inner {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .grid-inner {
    grid-template-columns: 1fr;
  }
  .board-header {
    flex-direction: column;
    align-items: stretch;
  }
  .header-right {
    justify-content: space-between;
  }
  .filter-chips {
    flex-wrap: wrap;
  }
}

/* ============================================================
   LIGHT MODE OVERRIDES
   Dark mode is the default above and is untouched by this block.
   The component leans on rgba(255,255,255,X) white overlays and
   neon literal colours that are designed for dark surfaces; on
   light surfaces those vanish or fail WCAG contrast. We re-derive
   each with theme-aware tokens / sufficiently-dark hues, scoped to
   [data-theme="light"] so dark stays exactly as-is.
   ============================================================ */
:root[data-theme="light"] .clear-all {
  background: var(--surface-2);
  border-color: var(--line);
}
:root[data-theme="light"] .clear-all:hover {
  background: var(--surface-3);
}

:root[data-theme="light"] .sort-buttons {
  background: var(--surface-2);
  border: 1px solid var(--line);
}
:root[data-theme="light"] .sort-btn:hover {
  background: var(--surface-3);
}
:root[data-theme="light"] .sort-btn.active {
  background: var(--surface-3);
}

/* Filter chips: keep hue identity but darken text to pass AA on the
   light tinted fills (white tints alone left text ~2:1). */
:root[data-theme="light"] .chip-target {
  color: #92400e; /* amber-800, 6.4:1 on chip fill */
}
:root[data-theme="light"] .chip-known {
  color: #1d4ed8; /* blue-700, ~6.5:1 */
}
:root[data-theme="light"] .chip-known.active {
  color: #1d4ed8;
}
:root[data-theme="light"] .chip-app {
  color: #047857; /* emerald-700 */
}
:root[data-theme="light"] .chip-app.active {
  color: #047857;
}

:root[data-theme="light"] .filter-chip.open {
  border-color: var(--accent);
}

:root[data-theme="light"] .filter-dropdown {
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);
}
:root[data-theme="light"] .dropdown-option:hover {
  background: var(--surface-3);
}
:root[data-theme="light"] .dropdown-known .dropdown-option.selected {
  color: #1d4ed8;
}
:root[data-theme="light"] .dropdown-app .dropdown-option.selected {
  color: #047857;
}

:root[data-theme="light"] .search-box {
  background: var(--surface);
  border-color: var(--line);
}

/* Cards: white-on-white hover overlay is invisible on a light board;
   use a visible surface step plus a real border for separation. */
:root[data-theme="light"] .course-card:hover,
:root[data-theme="light"] .course-card.active {
  background: var(--surface-2);
  border-color: var(--line);
}

/* App badges: inactive uses white overlays (invisible) and the active
   states use neon literals that fail AA on white fills. */
:root[data-theme="light"] .app-badge.inactive {
  border-color: var(--line);
  color: var(--faint);
}
:root[data-theme="light"] .app-badge.inactive:hover {
  border-color: var(--muted);
  color: var(--muted);
}
:root[data-theme="light"] .app-badge.status-testing {
  background: rgba(71, 85, 105, 0.12);
  border-color: rgba(71, 85, 105, 0.35);
  color: var(--muted);
}
:root[data-theme="light"] .app-badge.status-beta {
  background: rgba(180, 83, 9, 0.12);
  border-color: rgba(180, 83, 9, 0.4);
  color: #b45309; /* amber-700, 5.0:1 */
}
:root[data-theme="light"] .app-badge.status-live {
  background: rgba(4, 120, 87, 0.12);
  border-color: rgba(4, 120, 87, 0.4);
  color: #047857; /* emerald-700, 5.5:1 */
}
:root[data-theme="light"] .app-badge.legacy.status-beta {
  background: rgba(14, 116, 144, 0.1);
  border-color: rgba(14, 116, 144, 0.4);
  color: #0e7490; /* cyan-700, 5.4:1 */
}
:root[data-theme="light"] .app-badge.legacy.status-live {
  background: rgba(14, 116, 144, 0.14);
  border-color: rgba(14, 116, 144, 0.45);
  color: #0e7490;
}

:root[data-theme="light"] .footer-stat.highlight .footer-value {
  color: #047857; /* emerald-700 instead of neon #10b981 */
}
</style>
