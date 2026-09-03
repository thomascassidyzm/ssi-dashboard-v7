<template>
  <div class="min-h-screen bg-canvas text-ink p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-4xl font-bold text-accent-2 mb-2">Introductions Editor</h1>
          <p class="text-muted">Edit LEGO introduction presentations</p>
        </div>
        <div class="flex gap-3">
          <button
            @click="recompileManifest"
            :disabled="!selectedCourseCode || recompilingManifest"
            class="bg-purple-600 hover:bg-purple-500 disabled:bg-surface-2 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors font-medium"
          >
            {{ recompilingManifest ? 'Recompiling...' : 'Recompile Manifest' }}
          </button>
        </div>
      </div>

      <!-- Course Selector -->
      <div class="mb-6 bg-surface border border-line rounded-lg p-4">
        <label class="block text-sm font-medium text-ink mb-2">Select Course</label>
        <FilterSelect
          v-model="selectedCourseCode"
          class="w-full"
          :options="availableCourses"
          placeholder="-- Select a course --"
          filter-placeholder="Type a course…"
          button-class="w-full bg-canvas border border-line rounded px-4 py-2 text-ink"
          @change="loadIntroductions"
        />
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="text-muted">Loading introductions...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="status-error rounded-lg p-6">
        <h3 class="status-error-title font-semibold mb-2">Error Loading Introductions</h3>
        <p class="text-ink">{{ error }}</p>
      </div>

      <!-- Introductions List -->
      <div v-else-if="introductionsList.length > 0">
        <!-- Search/Filter -->
        <div class="mb-6 bg-surface border border-line rounded-lg p-4">
          <label class="block text-sm font-medium text-ink mb-2">Search</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by LEGO ID or introduction text..."
            class="w-full bg-canvas border border-line rounded px-4 py-2 text-ink"
          />
        </div>

        <!-- Stats -->
        <div class="mb-6 grid grid-cols-3 gap-4">
          <div class="bg-surface border border-line rounded-lg p-4">
            <div class="text-muted text-sm mb-1">Total Introductions</div>
            <div class="text-2xl font-bold text-accent-2">{{ introductionsList.length }}</div>
          </div>
          <div class="bg-surface border border-line rounded-lg p-4">
            <div class="text-muted text-sm mb-1">Filtered Results</div>
            <div class="text-2xl font-bold text-accent-2">{{ filteredIntroductions.length }}</div>
          </div>
          <div class="bg-surface border border-line rounded-lg p-4">
            <div class="text-muted text-sm mb-1">Modified</div>
            <div class="text-2xl font-bold modified-count">{{ modifiedCount }}</div>
          </div>
        </div>

        <!-- Introductions Table -->
        <div class="bg-surface border border-line rounded-lg overflow-hidden">
          <div class="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table class="w-full">
              <thead class="bg-canvas sticky top-0">
                <tr>
                  <th class="text-left px-4 py-3 text-ink font-medium">LEGO ID</th>
                  <th class="text-left px-4 py-3 text-ink font-medium">Introduction Text</th>
                  <th class="px-4 py-3 text-ink font-medium w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="intro in filteredIntroductions"
                  :key="intro.id"
                  class="border-t border-line hover:bg-surface-2/50"
                  :class="{ 'row-modified': intro.modified }"
                >
                  <td class="px-4 py-3">
                    <code class="text-accent-2 font-mono text-sm">{{ intro.id }}</code>
                  </td>
                  <td class="px-4 py-3">
                    <div v-if="editingId === intro.id">
                      <textarea
                        v-model="editText"
                        class="w-full bg-canvas border border-accent-2 rounded px-3 py-2 text-ink font-mono text-sm min-h-[80px]"
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
                          class="bg-surface-3 hover:bg-surface-3 text-ink px-3 py-1 rounded text-sm"
                        >
                          Cancel (Esc)
                        </button>
                      </div>
                    </div>
                    <div v-else class="font-mono text-sm text-ink">
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
        <div v-if="modifiedCount > 0" class="mt-6 status-warn rounded-lg p-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="status-warn-title font-semibold mb-1">Unsaved Changes</h3>
              <p class="text-ink text-sm">You have {{ modifiedCount }} modified introduction(s)</p>
            </div>
            <div class="flex gap-3">
              <button
                @click="discardChanges"
                class="bg-surface-2 hover:bg-surface-3 text-ink px-6 py-2 rounded-lg transition-colors"
              >
                Discard Changes
              </button>
              <button
                @click="saveAllChanges"
                :disabled="saving"
                class="bg-emerald-600 hover:bg-emerald-500 disabled:bg-surface-2 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors font-medium"
              >
                {{ saving ? 'Saving...' : 'Save All Changes' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12 text-muted">
        Select a course to view introductions
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '../services/api'
import FilterSelect from './ui/FilterSelect.vue'

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
const recompilingManifest = ref(false)
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

    alert(`✅ Successfully saved ${modifiedCount.value} introduction changes!\n\nRecommendation: Click "Recompile Manifest" to update the course manifest.`)
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

async function recompileManifest() {
  if (!selectedCourseCode.value) {
    alert('No course selected')
    return
  }

  if (modifiedCount.value > 0) {
    alert('⚠️ You have unsaved changes!\n\nPlease save your changes first, then recompile the Manifest.')
    return
  }

  if (!confirm('Recompile the Course Manifest with the latest introduction changes?\n\nThis will update the course_manifest.json file.')) {
    return
  }

  recompilingManifest.value = true

  try {
    const response = await api.course.regenerateManifest(selectedCourseCode.value)
    alert(`✅ Manifest recompilation started!\n\nJob ID: ${response.jobId || 'N/A'}\n\nThe course_manifest.json will be updated when complete.`)
  } catch (err) {
    console.error('Failed to trigger Manifest recompilation:', err)
    alert(`❌ Failed to trigger Manifest recompilation:\n\n${err.message}`)
  } finally {
    recompilingManifest.value = false
  }
}
</script>

<style scoped>
/* Dark-mode defaults: preserve original yellow/red appearance */
.modified-count { color: #facc15; } /* yellow-400 */

.status-error {
  background-color: rgba(127, 29, 29, 0.2); /* red-900/20 */
  border: 1px solid rgba(239, 68, 68, 0.5); /* red-500/50 */
}
.status-error-title { color: var(--danger); } /* red-400 */

.status-warn {
  background-color: rgba(113, 63, 18, 0.2); /* yellow-900/20 */
  border: 1px solid rgba(234, 179, 8, 0.5); /* yellow-500/50 */
}
.status-warn-title { color: #facc15; } /* yellow-400 */

.row-modified { background-color: rgba(113, 63, 18, 0.2); } /* yellow-900/20 */

/* Light-mode overrides: AA-legible amber/red on light tint, same hue families */
:root[data-theme="light"] .modified-count { color: #b45309; } /* amber-700 ~5.9:1 on white */

:root[data-theme="light"] .status-error {
  background-color: #fef2f2; /* red-50 */
  border-color: #fca5a5; /* red-300 */
}
:root[data-theme="light"] .status-error-title { color: #b91c1c; } /* red-700 ~6.4:1 on red-50 */

:root[data-theme="light"] .status-warn {
  background-color: #fffbeb; /* amber-50 */
  border-color: #fcd34d; /* amber-300 */
}
:root[data-theme="light"] .status-warn-title { color: #b45309; } /* amber-700 ~5.4:1 on amber-50 */

:root[data-theme="light"] .row-modified { background-color: #fffbeb; } /* amber-50 */
</style>
