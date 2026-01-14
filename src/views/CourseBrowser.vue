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
        </div>
      </div>

      <!-- Search Bar -->
      <div class="mb-6">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search courses (e.g., 'Spanish', 'fra_for_eng', 'Basket Generation')..."
          class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
          to="/generate"
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
            <span
              class="px-3 py-1 rounded-full text-xs font-medium flex-shrink-0"
              :class="getStatusClass(course.status)"
            >
              {{ formatStatus(course.status) }}
            </span>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-2 gap-2 text-sm">
            <!-- Seeds -->
            <div class="bg-slate-700/50 rounded px-3 py-2">
              <div class="text-slate-500 text-xs mb-1">Seeds</div>
              <div class="font-mono">
                <span class="text-emerald-400">{{ course.seed_pairs || 0 }}</span>
                <span class="text-slate-500"> / 260</span>
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
            <!-- Audio Coverage -->
            <div class="bg-slate-700/50 rounded px-3 py-2">
              <div class="text-slate-500 text-xs mb-1">Audio</div>
              <div class="font-mono">
                <span :class="getAudioCoverageClass(course)">{{ course.audio_count || 0 }}</span>
                <span class="text-slate-500"> / {{ course.audio_needed || course.phrases || 0 }}</span>
              </div>
            </div>
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
import api from '../services/api'

const toast = useToast()

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
const highlightedCourses = ref(new Set()) // Courses to highlight as new/updated

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
    // In production, this would call the API
    // For now, we'll load from the local VFS structure
    const response = await api.course.list()
    courses.value = response.courses || []
  } catch (err) {
    error.value = err.message || 'Failed to load courses'
    console.error('Failed to load courses:', err)
  } finally {
    loading.value = false
  }
}

function formatCourseCode(code) {
  // Just return the course code as-is (e.g., "spa_for_eng")
  // This is a builder's tool, so showing the actual code is clearest
  return code
}

function getFullCourseName(courseCode) {
  // Handle xxx_for_yyy format (e.g., spa_for_eng)
  if (courseCode.includes('_for_')) {
    const [target, , known] = courseCode.split('_')
    const targetName = languageNames[target] || target?.toUpperCase() || 'Unknown'
    const knownName = languageNames[known] || known?.toUpperCase() || 'Unknown'
    return `${targetName} for ${knownName} speakers`
  }
  // Handle other formats (e.g., en-es, en-cy-north) - just return the code
  return courseCode
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

function getAudioCoverageClass(course) {
  const count = course.audio_count || 0
  const needed = course.audio_needed || course.phrases || 0
  if (needed === 0) return 'text-slate-400'
  const ratio = count / needed
  if (ratio >= 1) return 'text-emerald-400'
  if (ratio >= 0.5) return 'text-yellow-400'
  return 'text-orange-400'
}

</script>
