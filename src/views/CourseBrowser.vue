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
          <div class="flex gap-3">
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
            <button
              @click="pushToGitHub"
              :disabled="pushing"
              class="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white px-4 py-2 rounded transition-colors text-sm font-medium flex items-center gap-2"
              title="Push all course data to GitHub (Vercel will auto-deploy)"
            >
              <span v-if="pushing">⏳</span>
              <span v-else>📤</span>
              Push to GitHub
            </button>
          </div>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="mb-6">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search courses (e.g., 'Spanish', 'fra_for_eng', 'Phase 5')..."
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
        <div
          v-for="course in filteredCourses"
          :key="course.course_code"
          :class="[
            'bg-slate-800 rounded-lg p-6 transition-all hover:-translate-y-0.5',
            highlightedCourses.has(course.course_code)
              ? 'border-2 border-emerald-500 shadow-lg shadow-emerald-500/20'
              : 'border border-slate-700 hover:border-emerald-500/50'
          ]"
        >
          <div class="flex items-start justify-between mb-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-xl font-semibold text-emerald-400">
                  {{ formatCourseCode(course.course_code) }}
                </h3>
                <span
                  v-if="highlightedCourses.has(course.course_code)"
                  class="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full animate-pulse"
                >
                  NEW
                </span>
              </div>
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

    <!-- Push to GitHub Confirmation Modal -->
    <div
      v-if="showPushModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="showPushModal = false"
    >
      <div class="bg-slate-800 border border-slate-700 rounded-lg max-w-lg w-full shadow-2xl">
        <div class="p-6">
          <h3 class="text-xl font-semibold text-emerald-400 mb-4">📤 Push to GitHub?</h3>

          <div class="mb-6 space-y-3">
            <p class="text-slate-300">
              This will commit and push all course data changes to GitHub.
            </p>

            <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <p class="text-sm font-medium text-slate-400 mb-2">What happens next:</p>
              <ul class="text-sm text-slate-300 space-y-1">
                <li>✓ Commits changes to <code class="text-emerald-400">public/vfs/courses/</code></li>
                <li>✓ Pushes to <code class="text-emerald-400">main</code> branch</li>
                <li>✓ Triggers Vercel deployment (~30s)</li>
                <li>✓ Dashboard shows latest data</li>
              </ul>
            </div>

            <p class="text-xs text-slate-500">
              Note: If no changes exist, this will skip the commit.
            </p>
          </div>

          <div class="flex gap-3 justify-end">
            <button
              @click="showPushModal = false"
              class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              @click="confirmPush"
              :disabled="pushing"
              class="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors font-medium"
            >
              <span v-if="pushing">Pushing...</span>
              <span v-else>Push to GitHub</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import api from '../services/api'

const router = useRouter()
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
const regenerating = ref(false)
const pushing = ref(false)
const searchQuery = ref('')
const showPushModal = ref(false)
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
  regenerating.value = true
  try {
    const response = await api.regenerateManifest()

    // Build summary message
    const { comparison, total_courses } = response
    const parts = []

    if (comparison.added.length > 0) {
      parts.push(`${comparison.added.length} new course${comparison.added.length > 1 ? 's' : ''}`)
    }
    if (comparison.updated.length > 0) {
      parts.push(`${comparison.updated.length} updated`)
    }
    if (comparison.removed.length > 0) {
      parts.push(`${comparison.removed.length} removed`)
    }

    const summary = parts.length > 0
      ? parts.join(', ')
      : 'No changes detected'

    // Show toast with summary
    if (parts.length > 0) {
      toast.success(`✅ Manifest regenerated! ${summary}. Total: ${total_courses} courses.`, {
        timeout: 5000
      })

      // Highlight new and updated courses
      highlightedCourses.value = new Set([
        ...comparison.added,
        ...comparison.updated.map(u => u.course_code)
      ])

      // Clear highlights after 10 seconds
      setTimeout(() => {
        highlightedCourses.value.clear()
      }, 10000)
    } else {
      toast.info(`ℹ️ Manifest regenerated. ${summary}.`)
    }

    // Reload courses to show updated manifest
    await loadCourses()

    // Scroll to first new course if any
    if (comparison.added.length > 0) {
      setTimeout(() => {
        const firstNew = document.querySelector('.border-emerald-500')
        if (firstNew) {
          firstNew.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  } catch (err) {
    console.error('Failed to regenerate manifest:', err)
    if (err.response?.status === 404) {
      toast.error('❌ Orchestrator doesn\'t support manifest regeneration. Make sure it\'s running and up to date.')
    } else if (err.message?.includes('Network Error') || err.code === 'ERR_NETWORK') {
      toast.error('❌ Cannot reach orchestrator.')
    } else {
      toast.error('❌ Failed to regenerate manifest')
    }
  } finally {
    regenerating.value = false
  }
}

function pushToGitHub() {
  showPushModal.value = true
}

async function confirmPush() {
  pushing.value = true
  try {
    const response = await api.pushAllCourses()

    if (response.skipped) {
      toast.info('ℹ️ No changes to push')
    } else {
      toast.success('✅ All course data pushed to GitHub! Vercel will deploy automatically.')
    }

    showPushModal.value = false
  } catch (err) {
    console.error('Failed to push to GitHub:', err)
    if (err.response?.status === 404) {
      toast.error('❌ Orchestrator doesn\'t support GitHub push. Make sure it\'s running and up to date.')
    } else if (err.message?.includes('Network Error') || err.code === 'ERR_NETWORK') {
      toast.error('❌ Cannot reach orchestrator.')
    } else {
      toast.error('❌ Failed to push to GitHub')
    }
  } finally {
    pushing.value = false
  }
}
</script>
