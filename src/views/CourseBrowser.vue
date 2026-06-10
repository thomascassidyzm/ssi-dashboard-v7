<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link to="/" class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">
          ← Back to Dashboard
        </router-link>
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-4xl font-bold text-emerald-400 mb-2">Course Library</h1>
            <p class="text-slate-400">Browse and edit existing courses</p>
          </div>
          <router-link
            to="/production/new/text"
            class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
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
          class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <!-- Filter Pills -->
      <div class="mb-6 flex flex-wrap items-center gap-3">
        <!-- Status filters -->
        <span class="text-xs text-slate-500 uppercase tracking-wider">Status</span>
        <button
          v-for="s in statusFilters"
          :key="s.value"
          @click="toggleStatusFilter(s.value)"
          :class="[
            'px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer',
            activeStatusFilters.has(s.value)
              ? s.activeClass
              : 'border-slate-600 text-slate-500 hover:border-slate-400 hover:text-slate-300'
          ]"
        >
          {{ s.label }}
        </button>

        <span class="text-slate-700 mx-1">|</span>

        <!-- Pricing filters -->
        <span class="text-xs text-slate-500 uppercase tracking-wider">Pricing</span>
        <button
          v-for="p in pricingFilters"
          :key="p.value"
          @click="togglePricingFilter(p.value)"
          :class="[
            'px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer',
            activePricingFilters.has(p.value)
              ? p.activeClass
              : 'border-slate-600 text-slate-500 hover:border-slate-400 hover:text-slate-300'
          ]"
        >
          {{ p.label }}
        </button>
      </div>

      <!-- Stats loading indicator -->
      <div v-if="loadingStats" class="mb-4 flex items-center gap-2 text-sm text-slate-500">
        <div class="w-3 h-3 border-2 border-slate-500 border-t-emerald-400 rounded-full animate-spin"></div>
        Loading course stats...
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="text-slate-400">Loading courses...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
        <h3 class="text-red-400 font-semibold mb-2">Error Loading Courses</h3>
        <p class="text-slate-300">{{ error }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredCourses.length === 0" class="text-center py-12">
        <div v-if="searchQuery" class="text-slate-400 mb-4">
          No courses matching "{{ searchQuery }}"
        </div>
        <div v-else class="text-slate-400 mb-4">No courses found</div>
        <router-link
          v-if="!searchQuery"
          to="/production/new/text"
          class="inline-block bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg transition-colors"
        >
          Create Your First Course
        </router-link>
      </div>

      <!-- Courses Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <router-link
          v-for="course in filteredCourses"
          :key="course.course_code"
          :to="`/production/${course.course_code}`"
          :class="[
            'bg-slate-800 rounded-lg p-5 transition-all cursor-pointer hover:bg-slate-750 hover:shadow-lg hover:shadow-emerald-500/10 group',
            highlightedCourses.has(course.course_code)
              ? 'border-2 border-emerald-500 shadow-lg shadow-emerald-500/20'
              : 'border border-slate-700 hover:border-emerald-500/50'
          ]"
        >
          <!-- Header -->
          <div class="flex items-start justify-between mb-3">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-lg font-semibold text-emerald-400 group-hover:text-emerald-300">
                  {{ formatCourseCode(course.course_code) }}
                </h3>
                <span
                  v-if="highlightedCourses.has(course.course_code)"
                  class="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full animate-pulse"
                >
                  NEW
                </span>
              </div>
              <p class="text-sm text-slate-400">
                {{ getFullCourseName(course.course_code) }}
              </p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span
                class="px-2 py-0.5 rounded-full text-xs font-medium"
                :class="getPricingClass(course.pricing_tier)"
              >
                {{ (course.pricing_tier || 'premium').toUpperCase() }}
              </span>
              <span
                class="px-3 py-1 rounded-full text-xs font-medium"
                :class="getStatusClass(course.status)"
              >
                {{ formatStatus(course.status) }}
              </span>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-2 gap-2 text-sm">
            <!-- Seeds -->
            <div class="bg-slate-700/50 rounded px-3 py-2">
              <div class="text-slate-500 text-xs mb-1">Seeds</div>
              <div class="font-mono">
                <span class="text-emerald-400">{{ course.seed_pairs || 0 }}</span>
                <span v-if="course.seed_count" class="text-slate-500"> / {{ course.seed_count }}</span>
              </div>
            </div>
            <!-- LEGOs -->
            <div class="bg-slate-700/50 rounded px-3 py-2">
              <div class="text-slate-500 text-xs mb-1">LEGOs</div>
              <div class="font-mono text-emerald-400">{{ course.lego_pairs || 0 }}</div>
            </div>
            <!-- Phrases -->
            <div class="bg-slate-700/50 rounded px-3 py-2">
              <div class="text-slate-500 text-xs mb-1">Phrases</div>
              <div class="font-mono text-emerald-400">{{ (course.phrases || 0).toLocaleString() }}</div>
            </div>
            <!-- Audio coverage available per-course in Production Suite -->
          </div>

          <!-- Click hint -->
          <div class="mt-3 pt-3 border-t border-slate-700 text-center">
            <span class="text-xs text-slate-500 group-hover:text-emerald-400 transition-colors">
              Click to open Production Suite →
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

// Filter state — empty Set means "show all"
const activeStatusFilters = ref(new Set())
const activePricingFilters = ref(new Set())

const statusFilters = [
  { value: 'draft', label: 'Testing', activeClass: 'bg-slate-600/30 border-slate-400 text-slate-300' },
  { value: 'beta', label: 'Beta', activeClass: 'bg-yellow-600/20 border-yellow-500 text-yellow-400' },
  { value: 'released', label: 'Live', activeClass: 'bg-emerald-600/20 border-emerald-500 text-emerald-400' },
]

const pricingFilters = [
  { value: 'free', label: 'Free', activeClass: 'bg-emerald-600/20 border-emerald-400 text-emerald-400' },
  { value: 'premium', label: 'Premium', activeClass: 'bg-yellow-600/20 border-yellow-500 text-yellow-400' },
  { value: 'community', label: 'Community', activeClass: 'bg-blue-600/20 border-blue-500 text-blue-400' },
]

function toggleStatusFilter(value) {
  if (activeStatusFilters.value.has(value)) {
    activeStatusFilters.value.delete(value)
  } else {
    activeStatusFilters.value.add(value)
  }
  activeStatusFilters.value = new Set(activeStatusFilters.value) // trigger reactivity
}

function togglePricingFilter(value) {
  if (activePricingFilters.value.has(value)) {
    activePricingFilters.value.delete(value)
  } else {
    activePricingFilters.value.add(value)
  }
  activePricingFilters.value = new Set(activePricingFilters.value)
}

// Computed: Filtered courses based on search query + filters
const filteredCourses = computed(() => {
  // Filter by user's course access first
  let result = courses.value.filter(c => canAccessCourse(c.course_code))

  // Apply status filter
  if (activeStatusFilters.value.size > 0) {
    result = result.filter(c => {
      const status = c.status || 'draft'
      return activeStatusFilters.value.has(status)
    })
  }

  // Apply pricing filter
  if (activePricingFilters.value.size > 0) {
    result = result.filter(c => {
      const tier = c.pricing_tier || 'premium'
      return activePricingFilters.value.has(tier)
    })
  }

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

function formatStatus(status) {
  return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'
}

function getStatusClass(status) {
  if (status === 'complete' || status === 'ready_for_phase_2') {
    return 'bg-emerald-600 text-white'
  } else if (status === 'in_progress') {
    return 'bg-yellow-600 text-white'
  } else {
    return 'bg-slate-600 text-slate-300'
  }
}

function getPricingClass(tier) {
  if (tier === 'free') return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
  if (tier === 'community') return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
  return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
}


</script>
