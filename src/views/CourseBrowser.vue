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
          <button
            @click="regenerateManifest"
            :disabled="regenerating"
            class="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-300 px-4 py-2 rounded transition-colors text-sm font-medium flex items-center gap-2"
            title="Regenerate course manifest from local files (requires orchestrator running)"
          >
            <span v-if="regenerating">⏳</span>
            <span v-else>🔄</span>
            Regenerate Manifest
          </button>
        </div>
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
      <div v-else-if="courses.length === 0" class="text-center py-12">
        <div class="text-slate-400 mb-4">No courses found</div>
        <router-link
          to="/generate"
          class="inline-block bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg transition-colors"
        >
          Generate Your First Course
        </router-link>
      </div>

      <!-- Courses Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="course in courses"
          :key="course.course_code"
          class="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-emerald-500/50 transition-all hover:-translate-y-0.5"
        >
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-xl font-semibold text-emerald-400 mb-1">
                {{ formatCourseCode(course.course_code) }}
              </h3>
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
              <div class="text-emerald-400 font-semibold">{{ course.seed_pairs || 0 }}</div>
            </div>
            <div class="bg-slate-900/50 rounded p-3">
              <div class="text-slate-400 text-xs mb-1">LEGO_PAIRS</div>
              <div class="text-emerald-400 font-semibold">{{ course.lego_pairs || 0 }}</div>
            </div>
            <div class="bg-slate-900/50 rounded p-3">
              <div class="text-slate-400 text-xs mb-1">LEGO_BASKETS</div>
              <div class="text-emerald-400 font-semibold">{{ course.lego_baskets || 0 }}</div>
            </div>
            <div class="bg-slate-900/50 rounded p-3">
              <div class="text-slate-400 text-xs mb-1">INTRODUCTIONS</div>
              <div class="text-emerald-400 font-semibold">{{ course.amino_acids?.introductions || 0 }}</div>
            </div>
          </div>

          <!-- Phases Completed -->
          <div class="mb-4">
            <div class="text-xs text-slate-400 mb-2">Phases Completed</div>
            <div class="flex gap-1">
              <span
                v-for="phase in ['1', '3', '5', '7', '8']"
                :key="phase"
                class="w-8 h-8 flex items-center justify-center rounded text-xs font-medium"
                :class="course.phases_completed?.includes(phase)
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-500'"
                :title="getPhaseTitle(phase)"
              >
                {{ phase }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <router-link
              :to="`/courses/${course.course_code}`"
              class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-center px-4 py-2 rounded transition-colors text-sm font-medium"
            >
              View & Edit
            </router-link>
            <button
              @click="showDetails(course)"
              class="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded transition-colors text-sm"
            >
              Details
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import api from '../services/api'

const router = useRouter()
const toast = useToast()
const courses = ref([])
const loading = ref(true)
const error = ref(null)
const regenerating = ref(false)

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
    '1': 'Phase 1: Translation',
    '3': 'Phase 3: LEGO Extraction + Introductions',
    '5': 'Phase 5: Basket Generation',
    '7': 'Phase 7: Course Compilation',
    '8': 'Phase 8: Audio Generation'
  }
  return titles[phase] || `Phase ${phase}`
}

function showDetails(course) {
  router.push(`/courses/${course.course_code}`)
}

async function regenerateManifest() {
  // Check if user is pointing at localhost
  const apiBaseUrl = localStorage.getItem('api_base_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
  if (!apiBaseUrl.includes('localhost') && !apiBaseUrl.includes('127.0.0.1')) {
    toast.warning('⚠️ Manifest regeneration only works on localhost. Switch to Local in environment selector.')
    return
  }

  regenerating.value = true
  try {
    const response = await api.regenerateManifest()
    toast.success('✅ Manifest regenerated! Remember to commit and push to GitHub.')

    // Reload courses to show updated manifest
    await loadCourses()
  } catch (err) {
    console.error('Failed to regenerate manifest:', err)
    if (err.message?.includes('Network Error') || err.code === 'ERR_NETWORK') {
      toast.error('❌ Cannot reach orchestrator. Make sure it\'s running on localhost:3456')
    } else {
      toast.error('❌ Failed to regenerate manifest')
    }
  } finally {
    regenerating.value = false
  }
}
</script>
