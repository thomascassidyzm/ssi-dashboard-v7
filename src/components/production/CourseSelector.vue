<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link to="/" class="text-amber-400 hover:text-amber-300 mb-4 inline-block">
          ← Back to Dashboard
        </router-link>
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-4xl font-bold text-amber-400 mb-2">Production Suite</h1>
            <p class="text-slate-400">Select a course to begin audio production & QA workflow</p>
          </div>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="mb-6">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search courses (e.g., 'Spanish', 'fra_for_eng', 'Basket Generation')..."
          class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-300 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        />
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
          to="/courses/new"
          class="inline-block bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg transition-colors"
        >
          Generate Your First Course
        </router-link>
      </div>

      <!-- Courses Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <router-link
          v-for="course in filteredCourses"
          :key="course.course_code"
          :to="`/production/${course.course_code}`"
          class="bg-slate-800 rounded-lg p-6 border border-slate-700 transition-all hover:-translate-y-0.5 hover:border-amber-500/50 block"
        >
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-xl font-semibold text-amber-400 mb-1">
                {{ course.course_code }}
              </h3>
              <p class="text-xs text-slate-500 mb-1">
                {{ getFullCourseName(course.course_code) }}
              </p>
              <p class="text-sm text-slate-400">
                {{ course.total_seeds }} seeds
              </p>
            </div>
            <span
              class="px-3 py-1 rounded-full text-xs font-medium"
              :class="getStatusClass(course.status)"
            >
              {{ formatStatus(course.status) }}
            </span>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-2 gap-3 mb-4 text-sm">
            <div class="bg-slate-900/50 rounded p-3">
              <div class="text-slate-400 text-xs mb-1">SEED_PAIRS</div>
              <div class="text-amber-400 font-semibold">{{ course.seed_pairs || 0 }}</div>
            </div>
            <div class="bg-slate-900/50 rounded p-3">
              <div class="text-slate-400 text-xs mb-1">LEGO_PAIRS</div>
              <div class="text-amber-400 font-semibold">{{ course.lego_pairs || 0 }}</div>
            </div>
            <div class="bg-slate-900/50 rounded p-3">
              <div class="text-slate-400 text-xs mb-1">LEGO_BASKETS</div>
              <div class="text-amber-400 font-semibold">{{ course.lego_baskets || 0 }}</div>
            </div>
            <div class="bg-slate-900/50 rounded p-3">
              <div class="text-slate-400 text-xs mb-1">INTRODUCTIONS</div>
              <div class="text-amber-400 font-semibold">{{ course.amino_acids?.introductions || 0 }}</div>
            </div>
          </div>

          <!-- Phases Completed -->
          <div class="mb-4">
            <div class="text-xs text-slate-400 mb-2">Phases Completed</div>
            <div class="flex gap-1">
              <span
                v-for="phase in ['1', '3', 'M', 'A']"
                :key="phase"
                class="w-8 h-8 flex items-center justify-center rounded text-xs font-medium"
                :class="isPhaseComplete(course, phase)
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-700 text-slate-500'"
                :title="getPhaseTitle(phase)"
              >
                {{ phase }}
              </span>
            </div>
          </div>

          <!-- Action -->
          <div class="pt-4 border-t border-slate-700">
            <span class="text-amber-400 font-medium text-sm flex items-center justify-between">
              Open Production Suite
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </span>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

// Language name mapping for search
const languageNames = {
  'eng': 'English',
  'spa': 'Spanish',
  'fra': 'French',
  'cmn': 'Chinese',
  'gle': 'Irish',
  'cym': 'Welsh',
  'ita': 'Italian',
  'deu': 'German',
  'por': 'Portuguese',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'ara': 'Arabic',
  'rus': 'Russian',
  'tur': 'Turkish'
}

const courses = ref([])
const loading = ref(true)
const error = ref(null)
const searchQuery = ref('')

// Computed: Filtered courses based on search query
const filteredCourses = computed(() => {
  if (!searchQuery.value) return courses.value

  const query = searchQuery.value.toLowerCase()

  return courses.value.filter(course => {
    // Search by course code (e.g., "fra_for_eng")
    if (course.course_code.toLowerCase().includes(query)) return true

    // Search by full language names (e.g., "French for English")
    const [target, , known] = course.course_code.split('_')
    const targetName = languageNames[target] || target
    const knownName = languageNames[known] || known
    const fullName = `${targetName} for ${knownName} speakers`.toLowerCase()
    if (fullName.includes(query)) return true

    // Search by phase (e.g., "Phase 5")
    if (course.phase && course.phase.toLowerCase().includes(query)) return true

    // Search by format version
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
    const response = await api.course.list()
    courses.value = response.courses || []
  } catch (err) {
    error.value = err.message || 'Failed to load courses'
    console.error('Failed to load courses:', err)
  } finally {
    loading.value = false
  }
}

function getFullCourseName(courseCode) {
  const [target, , known] = courseCode.split('_')
  const targetName = languageNames[target] || target.toUpperCase()
  const knownName = languageNames[known] || known.toUpperCase()
  return `${targetName} for ${knownName} speakers`
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

function getPhaseTitle(phase) {
  const titles = {
    '1': 'Phase 1: Translation + LEGOs',
    '3': 'Phase 3: Basket Generation',
    'M': 'Manifest Compilation',
    'A': 'Audio Generation'
  }
  return titles[phase] || `Phase ${phase}`
}

function isPhaseComplete(course, phase) {
  const phases = course.phases_completed || []
  if (phase === '1') return phases.includes('1')
  if (phase === '3') return phases.includes('3') || phases.includes('5')
  if (phase === 'M') return phases.includes('manifest') || phases.includes('7')
  if (phase === 'A') return phases.includes('audio') || phases.includes('8')
  return phases.includes(phase)
}
</script>
