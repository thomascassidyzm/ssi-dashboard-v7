<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link to="/" class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">
          ← Back to Dashboard
        </router-link>
        <h1 class="text-4xl font-bold text-emerald-400 mb-2">
          Course Analyzer
        </h1>
        <p class="text-slate-400">
          Analyze content quality, completeness, and identify missing components across all pipeline phases
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        <p class="mt-4 text-slate-400">Loading course analysis...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
        <h3 class="text-red-400 font-semibold mb-2">Error Loading Validation Data</h3>
        <p class="text-slate-300">{{ error }}</p>
        <button @click="loadData" class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition">
          Retry
        </button>
      </div>

      <!-- Course Selection -->
      <div v-else class="space-y-6">
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <label class="block text-sm font-medium text-slate-300 mb-2">Select Course</label>
          <select
            v-model="selectedCourse"
            @change="onCourseChange"
            class="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            <option value="">-- All Courses Overview --</option>
            <option v-for="courseCode in availableCourses" :key="courseCode" :value="courseCode">
              {{ courseCode }}
            </option>
          </select>
        </div>

        <!-- All Courses Overview -->
        <div v-if="!selectedCourse && allValidation" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="(validation, courseCode) in allValidation.courses"
            :key="courseCode"
            @click="selectCourse(courseCode)"
            class="bg-slate-800 border border-slate-700 rounded-lg p-6 cursor-pointer hover:border-emerald-500 transition-all hover:-translate-y-0.5 group"
          >
            <div class="flex items-start justify-between mb-4">
              <h3 class="text-lg font-semibold text-slate-100 group-hover:text-emerald-400 transition">{{ courseCode }}</h3>
              <span
                v-if="validation.canProgress"
                class="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded-full border border-yellow-400/20"
              >
                Action Required
              </span>
              <span
                v-else-if="validation.completedPhases.length === 4"
                class="px-2 py-1 bg-emerald-900/30 text-emerald-400 text-xs rounded-full border border-emerald-400/20"
              >
                Complete
              </span>
            </div>

            <!-- Progress Bar -->
            <div class="mb-3">
              <div class="flex justify-between text-xs text-slate-400 mb-1">
                <span>Progress</span>
                <span>{{ validation.completedPhases.length }} / 4 phases</span>
              </div>
              <div class="w-full bg-slate-700 rounded-full h-2">
                <div
                  class="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all"
                  :style="{ width: `${(validation.completedPhases.length / 4) * 100}%` }"
                ></div>
              </div>
            </div>

            <!-- Phase Status -->
            <div class="space-y-1 text-sm">
              <div
                v-for="phase in ['phase_1', 'phase_3', 'phase_5', 'phase_6', 'phase_7']"
                :key="phase"
                class="flex items-center gap-2"
              >
                <span v-if="validation.completedPhases.includes(phase)" class="text-emerald-400">✓</span>
                <span v-else class="text-slate-600">○</span>
                <span :class="validation.completedPhases.includes(phase) ? 'text-slate-300' : 'text-slate-500'">
                  {{ getPhaseLabel(phase) }}
                </span>
              </div>
            </div>

            <!-- Next Action -->
            <div v-if="validation.nextPhase" class="mt-4 pt-4 border-t border-slate-700">
              <p class="text-xs text-emerald-400">
                Next: {{ getPhaseLabel(validation.nextPhase) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Single Course Detail -->
        <div v-else-if="selectedCourse && courseReport" class="space-y-6">
          <!-- Summary Card -->
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center gap-4">
                <h2 class="text-2xl font-bold text-emerald-400">{{ courseReport.courseCode }}</h2>
                <button
                  @click="loadDeepValidation(courseReport.courseCode)"
                  class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-sm rounded-lg transition text-white flex items-center gap-1"
                >
                  🔬 Deep Analysis
                </button>
              </div>
              <span
                v-if="courseReport.canProgress"
                class="px-3 py-1 bg-yellow-900/30 text-yellow-400 text-sm rounded-full border border-yellow-400/20"
              >
                Action Required
              </span>
              <span
                v-else-if="courseReport.summary.completed === 5"
                class="px-3 py-1 bg-emerald-900/30 text-emerald-400 text-sm rounded-full border border-emerald-400/20"
              >
                All Phases Complete
              </span>
            </div>

            <div class="grid grid-cols-4 gap-4">
              <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-center">
                <div class="text-3xl font-bold text-emerald-400">{{ courseReport.summary.completed }}</div>
                <div class="text-xs text-slate-400 mt-1">Phases Completed</div>
              </div>
              <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-center">
                <div class="text-3xl font-bold text-yellow-400">{{ courseReport.summary.missing }}</div>
                <div class="text-xs text-slate-400 mt-1">Components Missing</div>
              </div>
              <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-center">
                <div class="text-3xl font-bold text-blue-400">{{ courseReport.summary.progress_percentage }}%</div>
                <div class="text-xs text-slate-400 mt-1">Overall Progress</div>
              </div>
              <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-center">
                <div class="text-3xl font-bold text-slate-400">{{ courseReport.summary.total_phases }}</div>
                <div class="text-xs text-slate-400 mt-1">Total Phases</div>
              </div>
            </div>
          </div>

          <!-- Recommendations -->
          <div v-if="courseReport.recommendations && courseReport.recommendations.length > 0" class="space-y-3">
            <h3 class="text-xl font-semibold text-slate-100">Recommendations</h3>
            <div
              v-for="(rec, idx) in courseReport.recommendations"
              :key="idx"
              class="bg-slate-800 border rounded-lg p-4"
              :class="{
                'border-yellow-500/50': rec.priority === 'high',
                'border-blue-500/50': rec.priority === 'info',
                'border-slate-700': rec.priority !== 'high' && rec.priority !== 'info'
              }"
            >
              <div class="flex items-start justify-between mb-2">
                <h4 class="font-semibold" :class="{
                  'text-yellow-400': rec.priority === 'high',
                  'text-blue-400': rec.priority === 'info',
                  'text-slate-100': rec.priority !== 'high' && rec.priority !== 'info'
                }">
                  {{ rec.name }}
                </h4>
                <span
                  class="px-2 py-1 text-xs rounded-full border"
                  :class="{
                    'bg-yellow-900/30 text-yellow-400 border-yellow-400/20': rec.priority === 'high',
                    'bg-blue-900/30 text-blue-400 border-blue-400/20': rec.priority === 'info'
                  }"
                >
                  {{ rec.priority }}
                </span>
              </div>
              <p class="text-sm text-slate-300 mb-3">{{ rec.message }}</p>

              <div v-if="rec.missing && rec.missing.length > 0" class="mb-3 bg-slate-900/50 border border-slate-700 rounded p-3">
                <p class="text-xs text-slate-400 mb-2">Missing components:</p>
                <ul class="list-disc list-inside text-sm text-slate-300 space-y-1">
                  <li v-for="item in rec.missing" :key="item.name">
                    {{ item.name }} <span class="text-slate-500">({{ item.type }})</span>
                  </li>
                </ul>
              </div>

              <button
                v-if="rec.action && rec.action.startsWith('run_')"
                @click="triggerPhase(rec.phase)"
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm transition text-white"
              >
                Run {{ getPhaseLabel(rec.phase) }}
              </button>
            </div>
          </div>

          <!-- Deep Validation Results -->
          <div v-if="showDeepValidation && deepValidation" class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-semibold text-slate-100">🔬 Deep Content Analysis</h3>
              <button
                @click="showDeepValidation = false"
                class="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-sm rounded-lg transition text-slate-200"
              >
                Hide Analysis
              </button>
            </div>

            <!-- Summary -->
            <div v-if="deepValidation.summary" class="bg-slate-800 border rounded-lg p-6"
              :class="{
                'border-red-500/50': deepValidation.summary.totalIssues > 0,
                'border-emerald-500/50': deepValidation.summary.totalIssues === 0
              }"
            >
              <div class="grid grid-cols-3 gap-4">
                <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-center">
                  <div class="text-2xl font-bold" :class="{
                    'text-red-400': deepValidation.summary.totalIssues > 0,
                    'text-emerald-400': deepValidation.summary.totalIssues === 0
                  }">
                    {{ deepValidation.summary.totalIssues }}
                  </div>
                  <div class="text-xs text-slate-400 mt-1">Critical Issues</div>
                </div>
                <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-center">
                  <div class="text-2xl font-bold text-yellow-400">{{ deepValidation.summary.totalWarnings }}</div>
                  <div class="text-xs text-slate-400 mt-1">Warnings</div>
                </div>
                <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-center">
                  <div class="text-2xl font-bold text-blue-400">
                    {{ Object.keys(deepValidation.phases).filter(p => deepValidation.phases[p].valid).length }}
                  </div>
                  <div class="text-xs text-slate-400 mt-1">Valid Phases</div>
                </div>
              </div>
            </div>

            <!-- Phase-by-Phase Issues -->
            <div
              v-for="(phaseData, phaseKey) in deepValidation.phases"
              :key="phaseKey"
              v-if="phaseData.exists"
              class="bg-slate-800 border rounded-lg p-4"
              :class="{
                'border-red-500/50': phaseData.issues && phaseData.issues.length > 0,
                'border-yellow-500/50': phaseData.warnings && phaseData.warnings.length > 0 && (!phaseData.issues || phaseData.issues.length === 0),
                'border-emerald-500/50': phaseData.valid,
                'border-slate-700': !phaseData.valid && (!phaseData.issues || phaseData.issues.length === 0) && (!phaseData.warnings || phaseData.warnings.length === 0)
              }"
            >
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-semibold text-slate-100">{{ getPhaseLabel(phaseKey) }}</h4>
                <span
                  class="px-2 py-1 text-xs rounded-full border"
                  :class="{
                    'bg-emerald-900/30 text-emerald-400 border-emerald-400/20': phaseData.valid,
                    'bg-red-900/30 text-red-400 border-red-400/20': !phaseData.valid
                  }"
                >
                  {{ phaseData.valid ? 'Valid' : 'Has Issues' }}
                </span>
              </div>

              <!-- Stats -->
              <div v-if="phaseData.stats" class="mb-3 bg-slate-900/50 border border-slate-700 rounded p-3 grid grid-cols-2 gap-2 text-sm">
                <div v-for="(value, key) in phaseData.stats" :key="key" class="flex justify-between">
                  <span class="text-slate-400">{{ formatStatKey(key) }}:</span>
                  <span class="text-slate-200 font-mono">{{ value }}</span>
                </div>
              </div>

              <!-- Issues -->
              <div v-if="phaseData.issues && phaseData.issues.length > 0" class="space-y-2">
                <p class="text-xs font-semibold text-red-400 mb-2">Issues:</p>
                <div
                  v-for="(issue, idx) in phaseData.issues"
                  :key="idx"
                  class="bg-red-900/20 border border-red-500/30 rounded p-3 text-sm"
                >
                  <p class="text-red-300">{{ issue.message }}</p>
                  <div v-if="issue.examples" class="mt-2 text-xs text-slate-400 bg-slate-900/50 rounded p-2 font-mono">
                    {{ JSON.stringify(issue.examples).substring(0, 100) }}...
                  </div>
                </div>
              </div>

              <!-- Warnings -->
              <div v-if="phaseData.warnings && phaseData.warnings.length > 0" class="space-y-2 mt-3">
                <p class="text-xs font-semibold text-yellow-400 mb-2">Warnings:</p>
                <div
                  v-for="(warning, idx) in phaseData.warnings"
                  :key="idx"
                  class="bg-yellow-900/20 border border-yellow-500/30 rounded p-3 text-sm"
                >
                  <p class="text-yellow-300">{{ warning.message }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Phase Details -->
          <div class="space-y-3">
            <h3 class="text-xl font-semibold text-slate-100">Phase Details</h3>
            <div
              v-for="(phase, phaseKey) in courseReport.validation.phases"
              :key="phaseKey"
              class="bg-slate-800 border rounded-lg p-4"
              :class="{
                'border-emerald-500/50': phase.complete,
                'border-red-500/50': !phase.complete && !phase.blockedBy,
                'border-slate-600': phase.blockedBy
              }"
            >
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-semibold text-slate-100">{{ phase.name }}</h4>
                <div class="flex items-center gap-2">
                  <span v-if="phase.blockedBy" class="px-2 py-1 bg-slate-700 text-slate-400 text-xs rounded-full border border-slate-600">
                    Blocked by {{ phase.blockedBy.join(', ') }}
                  </span>
                  <span
                    class="px-2 py-1 text-xs rounded-full border"
                    :class="{
                      'bg-emerald-900/30 text-emerald-400 border-emerald-400/20': phase.complete,
                      'bg-red-900/30 text-red-400 border-red-400/20': !phase.complete
                    }"
                  >
                    {{ phase.complete ? 'Complete' : 'Incomplete' }}
                  </span>
                </div>
              </div>

              <p class="text-sm text-slate-400 mb-3">{{ phase.description }}</p>

              <!-- Files -->
              <div v-if="Object.keys(phase.files).length > 0" class="mb-2 bg-slate-900/50 border border-slate-700 rounded p-3">
                <p class="text-xs font-semibold text-slate-400 mb-2">Files:</p>
                <div class="space-y-1">
                  <div v-for="(fileInfo, fileName) in phase.files" :key="fileName" class="flex items-center gap-2 text-sm">
                    <span v-if="fileInfo.exists" class="text-emerald-400">✓</span>
                    <span v-else class="text-red-400">✗</span>
                    <span class="text-slate-300">{{ fileName }}</span>
                    <span v-if="fileInfo.exists" class="text-slate-500 text-xs">
                      ({{ formatBytes(fileInfo.size) }})
                    </span>
                  </div>
                </div>
              </div>

              <!-- Directories -->
              <div v-if="Object.keys(phase.directories).length > 0" class="bg-slate-900/50 border border-slate-700 rounded p-3">
                <p class="text-xs font-semibold text-slate-400 mb-2">Directories:</p>
                <div class="space-y-1">
                  <div v-for="(dirInfo, dirName) in phase.directories" :key="dirName" class="flex items-center gap-2 text-sm">
                    <span v-if="dirInfo.exists" class="text-emerald-400">✓</span>
                    <span v-else class="text-red-400">✗</span>
                    <span class="text-slate-300">{{ dirName }}</span>
                    <span v-if="dirInfo.exists" class="text-slate-500 text-xs">
                      ({{ dirInfo.itemCount }} items)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const error = ref(null)
const allValidation = ref(null)
const selectedCourse = ref('')
const courseReport = ref(null)
const deepValidation = ref(null)
const showDeepValidation = ref(false)

const availableCourses = computed(() => {
  if (!allValidation.value || !allValidation.value.courses) return []
  return Object.keys(allValidation.value.courses).sort()
})

const PHASE_LABELS = {
  phase_1: 'Phase 1: Seeds',
  phase_3: 'Phase 3: LEGOs',
  phase_5: 'Phase 5: Baskets',
  phase_6: 'Phase 6: Introductions',
  phase_7: 'Phase 7: Scaffolds'
}

function getPhaseLabel(phase) {
  return PHASE_LABELS[phase] || phase
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function formatStatKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

async function loadData() {
  loading.value = true
  error.value = null

  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
    const response = await fetch(`${apiBase}/api/courses/validate/all`)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    allValidation.value = await response.json()

    // If a course is selected, load its report
    if (selectedCourse.value) {
      await loadCourseReport(selectedCourse.value)
    }
  } catch (err) {
    console.error('Error loading validation data:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function loadCourseReport(courseCode) {
  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
    const response = await fetch(`${apiBase}/api/courses/${courseCode}/validate`)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    courseReport.value = await response.json()
  } catch (err) {
    console.error(`Error loading report for ${courseCode}:`, err)
    error.value = err.message
  }
}

async function loadDeepValidation(courseCode) {
  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
    const response = await fetch(`${apiBase}/api/courses/${courseCode}/validate/deep`)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    deepValidation.value = await response.json()
    showDeepValidation.value = true
  } catch (err) {
    console.error(`Error loading deep validation for ${courseCode}:`, err)
    alert(`Error: ${err.message}`)
  }
}

function selectCourse(courseCode) {
  selectedCourse.value = courseCode
  onCourseChange()
}

async function onCourseChange() {
  if (selectedCourse.value) {
    await loadCourseReport(selectedCourse.value)
  } else {
    courseReport.value = null
  }
}

async function triggerPhase(phase) {
  const confirmed = confirm(
    `Are you sure you want to trigger ${getPhaseLabel(phase)} for ${courseReport.value.courseCode}?\n\n` +
    `This will start the phase generation process.`
  )

  if (!confirmed) return

  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
    const response = await fetch(
      `${apiBase}/api/courses/${courseReport.value.courseCode}/rerun/${phase}`,
      { method: 'POST' }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`)
    }

    alert(
      `${getPhaseLabel(phase)} ready to start!\n\n` +
      `Instructions: ${result.instructions}\n\n` +
      `Redirect URL: ${result.redirectUrl}`
    )

    // Reload validation data
    await loadData()
  } catch (err) {
    console.error('Error triggering phase:', err)
    alert(`Error: ${err.message}`)
  }
}

onMounted(() => {
  // Check if a course is specified in the route
  if (route.params.courseCode) {
    selectedCourse.value = route.params.courseCode
  }

  loadData()
})
</script>
