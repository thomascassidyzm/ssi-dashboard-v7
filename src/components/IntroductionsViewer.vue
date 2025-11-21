<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-4xl font-bold text-emerald-400 mb-2">Introductions Editor</h1>
          <p class="text-slate-400">Edit LEGO introduction presentations</p>
        </div>
        <div class="flex gap-3">
          <button
            @click="recompilePhase7"
            :disabled="!selectedCourseCode || recompilingPhase7"
            class="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors font-medium"
          >
            {{ recompilingPhase7 ? 'Recompiling...' : 'Recompile Phase 7' }}
          </button>
        </div>
      </div>

      <!-- Course Selector -->
      <div class="mb-6 bg-slate-800 border border-slate-700 rounded-lg p-4">
        <label class="block text-sm font-medium text-slate-300 mb-2">Select Course</label>
        <select
          v-model="selectedCourseCode"
          @change="loadIntroductions"
          class="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 text-slate-100"
        >
          <option value="">-- Select a course --</option>
          <option v-for="course in availableCourses" :key="course" :value="course">
            {{ course }}
          </option>
        </select>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="text-slate-400">Loading introductions...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
        <h3 class="text-red-400 font-semibold mb-2">Error Loading Introductions</h3>
        <p class="text-slate-300">{{ error }}</p>
      </div>

      <!-- Introductions List -->
      <div v-else-if="introductionsList.length > 0">
        <!-- Search/Filter -->
        <div class="mb-6 bg-slate-800 border border-slate-700 rounded-lg p-4">
          <label class="block text-sm font-medium text-slate-300 mb-2">Search</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by LEGO ID or introduction text..."
            class="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 text-slate-100"
          />
        </div>

        <!-- Stats -->
        <div class="mb-6 grid grid-cols-3 gap-4">
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div class="text-slate-400 text-sm mb-1">Total Introductions</div>
            <div class="text-2xl font-bold text-emerald-400">{{ introductionsList.length }}</div>
          </div>
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div class="text-slate-400 text-sm mb-1">Filtered Results</div>
            <div class="text-2xl font-bold text-emerald-400">{{ filteredIntroductions.length }}</div>
          </div>
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div class="text-slate-400 text-sm mb-1">Modified</div>
            <div class="text-2xl font-bold text-yellow-400">{{ modifiedCount }}</div>
          </div>
        </div>

        <!-- Introductions Table -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div class="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table class="w-full">
              <thead class="bg-slate-900 sticky top-0">
                <tr>
                  <th class="text-left px-4 py-3 text-slate-300 font-medium">LEGO ID</th>
                  <th class="text-left px-4 py-3 text-slate-300 font-medium">Introduction Text</th>
                  <th class="px-4 py-3 text-slate-300 font-medium w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="intro in filteredIntroductions"
                  :key="intro.id"
                  class="border-t border-slate-700 hover:bg-slate-700/50"
                  :class="{ 'bg-yellow-900/20': intro.modified }"
                >
                  <td class="px-4 py-3">
                    <code class="text-emerald-400 font-mono text-sm">{{ intro.id }}</code>
                  </td>
                  <td class="px-4 py-3">
                    <div v-if="editingId === intro.id">
                      <textarea
                        v-model="editText"
                        class="w-full bg-slate-900 border border-emerald-500 rounded px-3 py-2 text-slate-100 font-mono text-sm min-h-[80px]"
                        @keydown.ctrl.enter="saveEdit(intro.id)"
                        @keydown.meta.enter="saveEdit(intro.id)"
                        @keydown.escape="cancelEdit"
                      ></textarea>
                      <div class="mt-2 flex gap-2">
                        <button
                          @click="saveEdit(intro.id)"
                          class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Save (⌘↵)
                        </button>
                        <button
                          @click="cancelEdit"
                          class="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Cancel (Esc)
                        </button>
                      </div>
                    </div>
                    <div v-else class="font-mono text-sm text-slate-300">
                      {{ intro.text }}
                    </div>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <button
                      v-if="editingId !== intro.id"
                      @click="startEdit(intro.id, intro.text)"
                      class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Save Changes -->
        <div v-if="modifiedCount > 0" class="mt-6 bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-yellow-400 font-semibold mb-1">Unsaved Changes</h3>
              <p class="text-slate-300 text-sm">You have {{ modifiedCount }} modified introduction(s)</p>
            </div>
            <div class="flex gap-3">
              <button
                @click="discardChanges"
                class="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Discard Changes
              </button>
              <button
                @click="saveAllChanges"
                :disabled="saving"
                class="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors font-medium"
              >
                {{ saving ? 'Saving...' : 'Save All Changes' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12 text-slate-400">
        Select a course to view introductions
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '../services/api'

const availableCourses = ref(['spa_for_eng', 'cmn_for_eng'])
const selectedCourseCode = ref('')
const introductionsData = ref(null)
const introductionsList = ref([])
const loading = ref(false)
const error = ref(null)
const searchQuery = ref('')
const editingId = ref(null)
const editText = ref('')
const saving = ref(false)
const recompilingPhase7 = ref(false)
const originalData = ref({})

async function loadIntroductions() {
  if (!selectedCourseCode.value) return

  loading.value = true
  error.value = null

  try {
    const data = await api.course.getPhaseOutput(selectedCourseCode.value, '3', 'introductions.json')
    introductionsData.value = data

    // Convert presentations object to array for display
    const presentations = data.presentations || data.introductions || {}
    introductionsList.value = Object.entries(presentations).map(([id, text]) => ({
      id,
      text,
      modified: false
    }))

    // Store original data for comparison
    originalData.value = { ...presentations }

    console.log(`Loaded ${introductionsList.value.length} introductions for ${selectedCourseCode.value}`)
  } catch (err) {
    error.value = err.message || 'Failed to load introductions'
    console.error('Failed to load introductions:', err)
  } finally {
    loading.value = false
  }
}

const filteredIntroductions = computed(() => {
  if (!searchQuery.value.trim()) {
    return introductionsList.value
  }

  const query = searchQuery.value.toLowerCase()
  return introductionsList.value.filter(intro =>
    intro.id.toLowerCase().includes(query) ||
    intro.text.toLowerCase().includes(query)
  )
})

const modifiedCount = computed(() => {
  return introductionsList.value.filter(intro => intro.modified).length
})

function startEdit(id, text) {
  editingId.value = id
  editText.value = text
}

function cancelEdit() {
  editingId.value = null
  editText.value = ''
}

function saveEdit(id) {
  if (!editText.value.trim()) {
    alert('Introduction text cannot be empty')
    return
  }

  const intro = introductionsList.value.find(i => i.id === id)
  if (intro) {
    intro.text = editText.value
    intro.modified = intro.text !== originalData.value[id]
  }

  cancelEdit()
}

async function saveAllChanges() {
  if (!selectedCourseCode.value) {
    alert('No course selected')
    return
  }

  if (modifiedCount.value === 0) {
    alert('No changes to save')
    return
  }

  if (!confirm(`Save ${modifiedCount.value} modified introduction(s) to ${selectedCourseCode.value}?`)) {
    return
  }

  saving.value = true

  try {
    // Rebuild presentations object with modifications
    const updatedPresentations = {}
    introductionsList.value.forEach(intro => {
      updatedPresentations[intro.id] = intro.text
    })

    // Prepare updated introductions file
    const updatedData = {
      ...introductionsData.value,
      presentations: updatedPresentations,
      generated: new Date().toISOString()
    }

    // Save via API
    await api.course.savePhaseOutput(
      selectedCourseCode.value,
      '3',
      'introductions.json',
      updatedData
    )

    // Update original data
    originalData.value = { ...updatedPresentations }

    // Clear modified flags
    introductionsList.value.forEach(intro => {
      intro.modified = false
    })

    alert(`✅ Successfully saved ${modifiedCount.value} introduction changes!\n\nRecommendation: Click "Recompile Phase 7" to update the course manifest.`)
  } catch (err) {
    console.error('Failed to save introductions:', err)
    alert(`❌ Failed to save introductions:\n\n${err.message}`)
  } finally {
    saving.value = false
  }
}

function discardChanges() {
  if (!confirm(`Discard ${modifiedCount.value} unsaved change(s)?`)) {
    return
  }

  // Reload from original data
  introductionsList.value.forEach(intro => {
    intro.text = originalData.value[intro.id]
    intro.modified = false
  })

  cancelEdit()
}

async function recompilePhase7() {
  if (!selectedCourseCode.value) {
    alert('No course selected')
    return
  }

  if (modifiedCount.value > 0) {
    alert('⚠️ You have unsaved changes!\n\nPlease save your changes first, then recompile Phase 7.')
    return
  }

  if (!confirm('Recompile Phase 7 (Course Manifest) with the latest introduction changes?\n\nThis will update the course_manifest.json file.')) {
    return
  }

  recompilingPhase7.value = true

  try {
    const response = await api.course.regeneratePhase7(selectedCourseCode.value)
    alert(`✅ Phase 7 recompilation started!\n\nJob ID: ${response.jobId || 'N/A'}\n\nThe course_manifest.json will be updated when complete.`)
  } catch (err) {
    console.error('Failed to trigger Phase 7 recompilation:', err)
    alert(`❌ Failed to trigger Phase 7 recompilation:\n\n${err.message}`)
  } finally {
    recompilingPhase7.value = false
  }
}
</script>
