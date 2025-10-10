<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link to="/courses" class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">
          ← Back to Course Library
        </router-link>
        <div v-if="course" class="flex items-start justify-between">
          <div>
            <h1 class="text-4xl font-bold text-emerald-400 mb-2">
              {{ formatCourseCode(course.course_code) }}
            </h1>
            <p class="text-slate-400">{{ course.total_seeds }} seeds • Version {{ course.version }}</p>
          </div>
          <span
            class="px-4 py-2 rounded-lg text-sm font-medium"
            :class="getStatusClass(course.status)"
          >
            {{ formatStatus(course.status) }}
          </span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="text-slate-400">Loading course...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
        <h3 class="text-red-400 font-semibold mb-2">Error Loading Course</h3>
        <p class="text-slate-300">{{ error }}</p>
      </div>

      <!-- Course Content -->
      <div v-else-if="course" class="space-y-6">
        <!-- Stats Overview -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div class="text-sm text-slate-400 mb-1">Translations</div>
            <div class="text-3xl font-bold text-emerald-400">{{ course.amino_acids?.translations || 0 }}</div>
            <div class="text-xs text-slate-500 mt-1">Phase 1 amino acids</div>
          </div>
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div class="text-sm text-slate-400 mb-1">LEGOs</div>
            <div class="text-3xl font-bold text-emerald-400">{{ course.amino_acids?.legos_deduplicated || 0 }}</div>
            <div class="text-xs text-slate-500 mt-1">Deduplicated phrases</div>
          </div>
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div class="text-sm text-slate-400 mb-1">Baskets</div>
            <div class="text-3xl font-bold text-emerald-400">{{ course.amino_acids?.baskets || 0 }}</div>
            <div class="text-xs text-slate-500 mt-1">Teaching groups</div>
          </div>
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div class="text-sm text-slate-400 mb-1">Introductions</div>
            <div class="text-3xl font-bold text-emerald-400">{{ course.amino_acids?.introductions || 0 }}</div>
            <div class="text-xs text-slate-500 mt-1">Known-only priming</div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg">
          <div class="flex border-b border-slate-700">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              class="px-6 py-3 text-sm font-medium transition-colors"
              :class="activeTab === tab.id
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-300'"
            >
              {{ tab.label }}
            </button>
          </div>

          <div class="p-6">
            <!-- Translations Tab -->
            <div v-if="activeTab === 'translations'">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-emerald-400">Translation Amino Acids</h3>
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search translations..."
                  class="bg-slate-900 border border-slate-700 rounded px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div v-if="filteredTranslations.length === 0" class="text-center py-8 text-slate-400">
                No translations found
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="translation in filteredTranslations"
                  :key="translation.uuid"
                  class="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-emerald-500/50 transition-colors"
                >
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex-1">
                      <div class="text-emerald-400 font-medium mb-1">{{ translation.source }}</div>
                      <div class="text-slate-300 text-sm">{{ translation.target }}</div>
                    </div>
                    <button
                      @click="editTranslation(translation)"
                      class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-sm ml-4"
                    >
                      Edit
                    </button>
                  </div>
                  <div class="flex gap-4 text-xs text-slate-500 mt-3">
                    <span>Seed: {{ translation.seed_id }}</span>
                    <span>UUID: {{ translation.uuid.substring(0, 8) }}...</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- LEGOs Tab -->
            <div v-if="activeTab === 'legos'">
              <h3 class="text-lg font-semibold text-emerald-400 mb-4">Deduplicated LEGOs</h3>

              <div v-if="legos.length === 0" class="text-center py-8 text-slate-400">
                No LEGOs found. Run Phase 3-4 to generate LEGOs.
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="lego in legos.slice(0, 50)"
                  :key="lego.uuid"
                  class="bg-slate-900/50 border border-slate-700 rounded-lg p-4"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="text-emerald-400 font-medium mb-2">"{{ lego.text }}"</div>
                      <div class="flex gap-3 text-xs text-slate-400">
                        <span>Provenance: {{ formatProvenance(lego.provenance) }}</span>
                        <span>FCFS: {{ lego.fcfs_score }}</span>
                        <span>Utility: {{ lego.utility_score }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Baskets Tab -->
            <div v-if="activeTab === 'baskets'">
              <h3 class="text-lg font-semibold text-emerald-400 mb-4">Teaching Baskets</h3>

              <div v-if="baskets.length === 0" class="text-center py-8 text-slate-400">
                No baskets found. Run Phase 5 to generate baskets.
              </div>

              <div v-else class="space-y-4">
                <div
                  v-for="basket in baskets"
                  :key="basket.uuid"
                  class="bg-slate-900/50 border border-slate-700 rounded-lg p-4"
                >
                  <div class="flex items-center justify-between mb-3">
                    <h4 class="text-lg font-semibold text-emerald-400">Basket {{ basket.basket_id }}</h4>
                    <span class="text-sm text-slate-400">{{ basket.lego_count }} LEGOs</span>
                  </div>
                  <div class="space-y-2">
                    <div
                      v-for="(lego, idx) in basket.legos.slice(0, 5)"
                      :key="idx"
                      class="text-sm text-slate-300 pl-4 border-l-2 border-emerald-600/30"
                    >
                      "{{ lego.text }}"
                    </div>
                    <div v-if="basket.lego_count > 5" class="text-xs text-slate-500 pl-4">
                      + {{ basket.lego_count - 5 }} more LEGOs
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Provenance Tab -->
            <div v-if="activeTab === 'provenance'">
              <h3 class="text-lg font-semibold text-emerald-400 mb-4">Provenance Tracking</h3>
              <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                <p class="text-slate-300 mb-4">
                  Test the provenance system by selecting a seed to see its complete impact chain.
                </p>
                <div class="flex gap-3">
                  <select
                    v-model="selectedSeed"
                    class="bg-slate-800 border border-slate-700 rounded px-4 py-2 text-slate-300 flex-1"
                  >
                    <option value="">Select a seed...</option>
                    <option v-for="t in translations" :key="t.seed_id" :value="t.seed_id">
                      {{ t.seed_id }}: {{ t.source.substring(0, 50) }}...
                    </option>
                  </select>
                  <button
                    @click="traceProvenance"
                    :disabled="!selectedSeed"
                    class="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2 rounded transition-colors"
                  >
                    Trace Impact
                  </button>
                </div>

                <div v-if="provenanceResult" class="mt-6 space-y-4">
                  <div class="bg-emerald-900/20 border border-emerald-500/50 rounded-lg p-4">
                    <div class="text-emerald-400 font-semibold mb-2">Impact Summary</div>
                    <div class="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div class="text-slate-400">LEGOs Generated</div>
                        <div class="text-2xl font-bold text-emerald-400">{{ provenanceResult.legos }}</div>
                      </div>
                      <div>
                        <div class="text-slate-400">Deduplicated LEGOs</div>
                        <div class="text-2xl font-bold text-emerald-400">{{ provenanceResult.deduplicated }}</div>
                      </div>
                      <div>
                        <div class="text-slate-400">Baskets Affected</div>
                        <div class="text-2xl font-bold text-emerald-400">{{ provenanceResult.baskets }}</div>
                      </div>
                    </div>
                  </div>
                  <div class="text-sm text-slate-400">
                    <strong class="text-emerald-400">Edit Impact:</strong> If you edit this seed,
                    {{ provenanceResult.legos }} LEGOs would need regeneration, affecting
                    {{ provenanceResult.baskets }} basket(s).
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div
      v-if="editModal.open"
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      @click.self="closeEditModal"
    >
      <div class="bg-slate-800 border border-slate-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 class="text-2xl font-bold text-emerald-400">Edit Translation</h2>
            <p class="text-sm text-slate-400 mt-1">{{ editModal.translation?.seed_id }}</p>
          </div>
          <button
            @click="closeEditModal"
            class="text-slate-400 hover:text-slate-300 text-2xl"
          >
            ×
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 space-y-6">
          <!-- Impact Analysis -->
          <div v-if="editModal.impact" class="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
            <div class="text-yellow-400 font-semibold mb-2">⚠️ Edit Impact</div>
            <div class="text-sm text-slate-300">
              Editing this translation will regenerate:
            </div>
            <div class="grid grid-cols-3 gap-4 mt-3">
              <div>
                <div class="text-xs text-slate-400">LEGOs</div>
                <div class="text-xl font-bold text-yellow-400">{{ editModal.impact.legos }}</div>
              </div>
              <div>
                <div class="text-xs text-slate-400">Deduplicated</div>
                <div class="text-xl font-bold text-yellow-400">{{ editModal.impact.deduplicated }}</div>
              </div>
              <div>
                <div class="text-xs text-slate-400">Baskets Affected</div>
                <div class="text-xl font-bold text-yellow-400">{{ editModal.impact.baskets }}</div>
              </div>
            </div>
          </div>

          <!-- Edit Form -->
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                Known Language (Source)
              </label>
              <textarea
                v-model="editModal.editedSource"
                class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                rows="3"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                Target Language
              </label>
              <textarea
                v-model="editModal.editedTarget"
                class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                rows="3"
              ></textarea>
            </div>
          </div>

          <!-- Original Values -->
          <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
            <div class="text-xs text-slate-400 mb-2">Original Values</div>
            <div class="space-y-2 text-sm">
              <div>
                <span class="text-slate-500">Source:</span>
                <span class="text-slate-300 ml-2">{{ editModal.translation?.source }}</span>
              </div>
              <div>
                <span class="text-slate-500">Target:</span>
                <span class="text-slate-300 ml-2">{{ editModal.translation?.target }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
          <button
            @click="closeEditModal"
            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            @click="saveTranslation"
            :disabled="editModal.saving"
            class="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded transition-colors"
          >
            {{ editModal.saving ? 'Saving...' : 'Save & Regenerate' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const courseCode = route.params.courseCode

const course = ref(null)
const translations = ref([])
const legos = ref([])
const baskets = ref([])
const loading = ref(true)
const error = ref(null)

const activeTab = ref('translations')
const searchQuery = ref('')
const selectedSeed = ref('')
const provenanceResult = ref(null)

// Edit modal state
const editModal = ref({
  open: false,
  translation: null,
  editedSource: '',
  editedTarget: '',
  impact: null,
  saving: false
})

const tabs = [
  { id: 'translations', label: 'Translations' },
  { id: 'legos', label: 'LEGOs' },
  { id: 'baskets', label: 'Baskets' },
  { id: 'provenance', label: 'Provenance Tracking' }
]

const filteredTranslations = computed(() => {
  if (!searchQuery.value) return translations.value
  const query = searchQuery.value.toLowerCase()
  return translations.value.filter(t =>
    t.source.toLowerCase().includes(query) ||
    t.target.toLowerCase().includes(query) ||
    t.seed_id.toLowerCase().includes(query)
  )
})

onMounted(async () => {
  await loadCourse()
})

async function loadCourse() {
  loading.value = true
  error.value = null

  try {
    const response = await api.course.get(courseCode)
    course.value = response.course
    translations.value = response.translations || []
    legos.value = response.legos || []
    baskets.value = response.baskets || []
  } catch (err) {
    error.value = err.message || 'Failed to load course'
    console.error('Failed to load course:', err)
  } finally {
    loading.value = false
  }
}

function formatCourseCode(code) {
  const parts = code.split('_')
  const target = parts[0]?.toUpperCase() || ''
  const seeds = code.match(/(\d+)seeds/)?.[1] || ''
  return `${target} Course${seeds ? ` (${seeds} seeds)` : ''}`
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

function formatProvenance(provenance) {
  if (Array.isArray(provenance)) {
    return provenance.map(p => p.provenance).join(', ')
  }
  return provenance || 'N/A'
}

async function editTranslation(translation) {
  editModal.value.translation = translation
  editModal.value.editedSource = translation.source
  editModal.value.editedTarget = translation.target
  editModal.value.open = true

  // Fetch impact analysis
  try {
    const response = await api.course.traceProvenance(courseCode, translation.seed_id)
    editModal.value.impact = response
  } catch (err) {
    console.error('Failed to fetch impact:', err)
  }
}

function closeEditModal() {
  editModal.value.open = false
  editModal.value.translation = null
  editModal.value.editedSource = ''
  editModal.value.editedTarget = ''
  editModal.value.impact = null
}

async function saveTranslation() {
  if (!editModal.value.translation) return

  editModal.value.saving = true
  try {
    // TODO: Implement save API call
    await api.course.updateTranslation(
      courseCode,
      editModal.value.translation.uuid,
      {
        source: editModal.value.editedSource,
        target: editModal.value.editedTarget
      }
    )

    // Reload course data
    await loadCourse()
    closeEditModal()
  } catch (err) {
    console.error('Failed to save translation:', err)
    alert('Failed to save: ' + err.message)
  } finally {
    editModal.value.saving = false
  }
}

async function traceProvenance() {
  if (!selectedSeed.value) return

  try {
    const response = await api.course.traceProvenance(courseCode, selectedSeed.value)
    provenanceResult.value = response
  } catch (err) {
    console.error('Failed to trace provenance:', err)
    alert('Failed to trace provenance: ' + err.message)
  }
}
</script>
