<template>
  <div class="seed-lego-visualizer min-h-screen bg-slate-900 text-slate-100 p-6">
    <!-- Header -->
    <div class="max-w-7xl mx-auto mb-8">
      <router-link
        to="/"
        class="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition mb-4"
      >
        <span>←</span>
        <span>Back to Dashboard</span>
      </router-link>
      <h1 class="text-3xl font-bold text-emerald-400 mb-2">SEED → LEGO_PAIR Breakdown Editor</h1>
      <p class="text-slate-400">
        View and edit how SEED_PAIRS decompose into LEGO_PAIRS (teaching units)
      </p>
    </div>

    <!-- Controls -->
    <div class="max-w-7xl mx-auto mb-6 bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div class="flex items-center gap-4 flex-wrap">
        <div class="flex-1 min-w-[200px]">
          <label class="block text-sm text-slate-300 mb-2">Course</label>
          <select
            v-model="selectedCourse"
            @change="loadSeeds"
            class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="ita_for_eng_30seeds">Italian for English Speakers</option>
            <option value="spa_for_eng_30seeds">Spanish for English Speakers</option>
            <option value="fra_for_eng_30seeds">French for English Speakers</option>
            <option value="cmn_for_eng_30seeds">Mandarin for English Speakers</option>
            <option value="mkd_for_eng_574seeds">Macedonian for English Speakers</option>
          </select>
        </div>

        <div>
          <label class="block text-sm text-slate-300 mb-2">View</label>
          <select
            v-model.number="seedsPerPage"
            @change="loadSeeds"
            class="bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option :value="1">1 seed (detailed)</option>
            <option :value="3">3 seeds</option>
            <option :value="6">6 seeds</option>
            <option :value="10">10 seeds</option>
          </select>
        </div>

        <div>
          <label class="block text-sm text-slate-300 mb-2">Jump to Seed</label>
          <input
            v-model.number="offset"
            type="number"
            min="0"
            :max="total - 1"
            @change="loadSeeds"
            class="w-24 bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <button
          @click="loadSeeds"
          class="mt-6 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition"
        >
          Refresh
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="max-w-7xl mx-auto text-center py-12">
      <div class="text-emerald-400 text-lg">Loading seeds...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-7xl mx-auto">
      <div class="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400">
        {{ error }}
      </div>
    </div>

    <!-- Seed List -->
    <div v-else class="max-w-7xl mx-auto space-y-6">
      <div
        v-for="seed in seeds"
        :key="seed.uuid"
        class="bg-slate-800 border rounded-lg overflow-hidden"
        :class="{
          'border-emerald-500': seed.lego_complete,
          'border-yellow-500': !seed.lego_complete && editingSeed !== seed.uuid,
          'border-blue-500 ring-2 ring-blue-500/50': editingSeed === seed.uuid
        }"
      >
        <!-- Seed Header -->
        <div class="px-6 py-4 border-b bg-slate-800/50 flex items-center justify-between"
             :class="{
               'border-slate-700': editingSeed !== seed.uuid,
               'border-blue-500': editingSeed === seed.uuid
             }">
          <div class="flex items-center gap-4">
            <span class="text-sm font-mono text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded">
              SEED {{ seed.seed_id }}
            </span>

            <div v-if="seed.lego_complete" class="flex items-center gap-2 text-emerald-400 text-sm">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              lego_complete
            </div>

            <div v-else class="flex items-center gap-2 text-yellow-400 text-sm">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              incomplete
            </div>

            <span class="text-xs text-slate-400">
              {{ seed.lego_pairs?.length || 0 }} LEGO_PAIRS
            </span>
          </div>

          <button
            v-if="editingSeed !== seed.uuid"
            @click="startEditing(seed)"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
          >
            Edit Breakdown
          </button>
          <div v-else class="flex gap-2">
            <button
              @click="saveSeed(seed)"
              :disabled="saving"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white text-sm rounded transition"
            >
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
            <button
              @click="cancelEditing"
              :disabled="saving"
              class="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded transition"
            >
              Cancel
            </button>
          </div>
        </div>

        <!-- LEGO Breakdown Display -->
        <div class="p-6">
          <!-- Full Sentences (for reference) -->
          <div class="mb-6 text-sm text-slate-400 bg-slate-900/50 rounded p-4">
            <div class="mb-2">
              <span class="text-emerald-400 font-semibold">Target:</span> {{ seed.target }}
            </div>
            <div>
              <span class="text-slate-300 font-semibold">Known:</span> {{ seed.source }}
            </div>
          </div>

          <!-- LEGO_PAIRS Display (View Mode) -->
          <div v-if="editingSeed !== seed.uuid">
            <div v-if="seed.lego_pairs && seed.lego_pairs.length > 0" class="space-y-3">
              <div
                v-for="(pair, index) in seed.lego_pairs"
                :key="pair.uuid"
                class="grid grid-cols-12 gap-4 items-stretch"
              >
                <!-- Position indicator -->
                <div class="col-span-1 flex items-center justify-center">
                  <div class="text-xs font-mono text-slate-500 bg-slate-700/50 rounded px-2 py-1">
                    {{ index + 1 }}
                  </div>
                </div>

                <!-- Target LEGO -->
                <div class="col-span-5">
                  <div class="h-full bg-blue-900/30 border border-blue-700 rounded p-3">
                    <div class="text-blue-100 font-medium mb-1">{{ pair.target }}</div>
                    <div class="text-xs text-blue-300">
                      {{ pair.lego_id }} • {{ pair.target_words?.length || 0 }} words
                    </div>
                  </div>
                </div>

                <!-- Alignment arrow -->
                <div class="col-span-1 flex items-center justify-center">
                  <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                  </svg>
                </div>

                <!-- Known LEGO -->
                <div class="col-span-5">
                  <div class="h-full bg-slate-700/50 border border-slate-600 rounded p-3">
                    <div class="text-slate-100 font-medium mb-1">{{ pair.known }}</div>
                    <div class="text-xs text-slate-400">
                      {{ pair.known_words?.length || 0 }} words • Score: {{ pair.pedagogical_score }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-center py-8 text-slate-400">
              No LEGO_PAIRS extracted yet
            </div>
          </div>

          <!-- Edit Mode - Draggable Dividers -->
          <div v-else class="space-y-6">
            <!-- Instructions -->
            <div class="p-4 bg-blue-900/20 border border-blue-700/50 rounded">
              <div class="text-sm text-blue-200">
                <div class="font-semibold mb-2">✏️ Editing Mode</div>
                <p class="text-xs text-blue-300 mb-2">
                  Click the vertical dividers between words to add/remove LEGO boundaries. LEGOs must tile perfectly to cover all words.
                </p>
                <div class="flex items-center gap-2 text-xs">
                  <span :class="isEditValid(seed) ? 'text-emerald-400' : 'text-red-400'">
                    {{ isEditValid(seed) ? '✓ Valid decomposition' : '✗ Invalid: boundaries must match for both languages' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Target Language Editor -->
            <div class="space-y-2">
              <div class="text-sm font-semibold text-blue-300">Target Language</div>
              <div class="bg-blue-900/30 border border-blue-700 rounded p-4">
                <div class="flex flex-wrap items-center gap-1">
                  <template v-for="(word, wordIndex) in getEditWords(seed, 'target')" :key="wordIndex">
                    <span class="px-2 py-1 bg-blue-800/50 rounded text-blue-100">{{ word }}</span>
                    <div
                      v-if="wordIndex < getEditWords(seed, 'target').length - 1"
                      @click="toggleDivider(seed, wordIndex)"
                      class="cursor-pointer group relative"
                    >
                      <div
                        class="w-1 h-8 rounded transition-all"
                        :class="isDividerActive(seed, wordIndex) ? 'bg-emerald-500' : 'bg-slate-600 group-hover:bg-slate-400'"
                      ></div>
                      <div class="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div class="text-xs bg-slate-700 px-2 py-1 rounded whitespace-nowrap">
                          {{ isDividerActive(seed, wordIndex) ? 'Remove split' : 'Split here' }}
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <!-- Known Language Editor -->
            <div class="space-y-2">
              <div class="text-sm font-semibold text-slate-300">Known Language</div>
              <div class="bg-slate-700/50 border border-slate-600 rounded p-4">
                <div class="flex flex-wrap items-center gap-1">
                  <template v-for="(word, wordIndex) in getEditWords(seed, 'known')" :key="wordIndex">
                    <span class="px-2 py-1 bg-slate-600/50 rounded text-slate-100">{{ word }}</span>
                    <div
                      v-if="wordIndex < getEditWords(seed, 'known').length - 1"
                      @click="toggleDivider(seed, wordIndex)"
                      class="cursor-pointer group relative"
                    >
                      <div
                        class="w-1 h-8 rounded transition-all"
                        :class="isDividerActive(seed, wordIndex) ? 'bg-emerald-500' : 'bg-slate-500 group-hover:bg-slate-400'"
                      ></div>
                      <div class="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div class="text-xs bg-slate-700 px-2 py-1 rounded whitespace-nowrap">
                          {{ isDividerActive(seed, wordIndex) ? 'Remove split' : 'Split here' }}
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <!-- Preview of Current LEGO_PAIRS -->
            <div class="space-y-2">
              <div class="text-sm font-semibold text-emerald-300">Preview ({{ getEditLegoCount(seed) }} LEGOs)</div>
              <div class="space-y-2">
                <div
                  v-for="(lego, index) in getEditLegoPairs(seed)"
                  :key="index"
                  class="grid grid-cols-12 gap-2 items-center text-sm"
                >
                  <div class="col-span-1 text-center text-slate-500 font-mono text-xs">
                    {{ index + 1 }}
                  </div>
                  <div class="col-span-5 bg-blue-900/20 border border-blue-700/30 rounded px-3 py-2">
                    <span class="text-blue-200">{{ lego.target }}</span>
                  </div>
                  <div class="col-span-1 flex justify-center">
                    <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                    </svg>
                  </div>
                  <div class="col-span-5 bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2">
                    <span class="text-slate-200">{{ lego.known }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && !error && seeds.length > 0" class="max-w-7xl mx-auto mt-6 flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg p-4">
      <button
        @click="previousPage"
        :disabled="offset === 0"
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded transition"
      >
        ← Previous
      </button>

      <div class="text-sm text-slate-400">
        Showing {{ offset + 1 }} - {{ Math.min(offset + seedsPerPage, total) }} of {{ total }} seeds
      </div>

      <button
        @click="nextPage"
        :disabled="offset + seedsPerPage >= total"
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded transition"
      >
        Next →
      </button>
    </div>

    <!-- Keyboard shortcuts help -->
    <div class="max-w-7xl mx-auto mt-4 text-xs text-slate-500 text-center">
      Keyboard: <kbd class="bg-slate-700 px-2 py-1 rounded">E</kbd> edit •
      <kbd class="bg-slate-700 px-2 py-1 rounded">S</kbd> save •
      <kbd class="bg-slate-700 px-2 py-1 rounded">Esc</kbd> cancel •
      <kbd class="bg-slate-700 px-2 py-1 rounded">N</kbd> next •
      <kbd class="bg-slate-700 px-2 py-1 rounded">P</kbd> previous
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as api from '../services/api'

const selectedCourse = ref('ita_for_eng_30seeds')
const seedsPerPage = ref(1)
const offset = ref(0)
const seeds = ref([])
const total = ref(0)
const loading = ref(false)
const error = ref(null)
const editingSeed = ref(null)
const saving = ref(false)

// Edit state: track divider positions for each seed
const editState = ref({})

function initEditState(seed) {
  // Initialize edit state with current LEGO boundaries
  const targetWords = seed.target.split(/\s+/).filter(w => w.length > 0)
  const knownWords = seed.source.split(/\s+/).filter(w => w.length > 0)

  // Create divider positions array (true = split after this word index)
  const dividers = new Array(Math.max(targetWords.length, knownWords.length) - 1).fill(false)

  // Mark existing LEGO boundaries as active dividers
  let wordCount = 0
  for (const pair of seed.lego_pairs || []) {
    wordCount += (pair.target_words?.length || 0)
    if (wordCount < targetWords.length) {
      dividers[wordCount - 1] = true
    }
  }

  editState.value[seed.uuid] = {
    targetWords,
    knownWords,
    dividers: [...dividers] // Clone array
  }
}

async function loadSeeds() {
  loading.value = true
  error.value = null

  try {
    // Load from static files
    const translationsRes = await fetch(`/vfs/courses/${selectedCourse.value}/translations.json`)
    const legosRes = await fetch(`/vfs/courses/${selectedCourse.value}/LEGO_BREAKDOWNS_COMPLETE.json`)

    if (!translationsRes.ok || !legosRes.ok) {
      throw new Error('Failed to load course data')
    }

    const translationsData = await translationsRes.json()
    const legoData = await legosRes.json()

    // Convert to format expected by component
    const allSeeds = legoData.lego_breakdowns.map(breakdown => {
      const translationPair = translationsData[breakdown.seed_id]
      return {
        uuid: breakdown.seed_id,
        seed_id: breakdown.seed_id,
        target: breakdown.original_target,
        source: breakdown.original_known,
        lego_pairs: breakdown.lego_pairs.map(lego => ({
          lego_id: lego.lego_id,
          target: lego.target_chunk,
          known: lego.known_chunk,
          target_words: lego.target_chunk.split(/\s+/)
        })),
        feeder_pairs: breakdown.feeder_pairs || []
      }
    })

    // Pagination
    const start = offset.value
    const end = start + seedsPerPage.value
    seeds.value = allSeeds.slice(start, end)
    total.value = allSeeds.length

    console.log(`✅ Loaded ${seeds.value.length} seeds (${total.value} total)`)
  } catch (err) {
    error.value = `Failed to load seeds: ${err.message}`
    console.error('Error loading seeds:', err)
  } finally {
    loading.value = false
  }
}

function startEditing(seed) {
  initEditState(seed)
  editingSeed.value = seed.uuid
}

function cancelEditing() {
  editingSeed.value = null
  // Clear edit state for this seed
  if (editingSeed.value) {
    delete editState.value[editingSeed.value]
  }
}

// Get words for editing display
function getEditWords(seed, language) {
  const state = editState.value[seed.uuid]
  if (!state) return []
  return language === 'target' ? state.targetWords : state.knownWords
}

// Toggle divider at word boundary
function toggleDivider(seed, wordIndex) {
  const state = editState.value[seed.uuid]
  if (!state) return

  // Toggle the divider
  state.dividers[wordIndex] = !state.dividers[wordIndex]
}

// Check if divider is active at this position
function isDividerActive(seed, wordIndex) {
  const state = editState.value[seed.uuid]
  if (!state) return false
  return state.dividers[wordIndex] || false
}

// Check if current edit is valid (dividers must match both languages)
function isEditValid(seed) {
  const state = editState.value[seed.uuid]
  if (!state) return true

  // For now, we're simplifying: any combination is valid
  // In a production system, you'd check linguistic alignment
  return true
}

// Get count of LEGOs based on current dividers
function getEditLegoCount(seed) {
  const state = editState.value[seed.uuid]
  if (!state) return 0

  // Count number of splits + 1
  const splits = state.dividers.filter(d => d).length
  return splits + 1
}

// Generate LEGO pairs based on current divider positions
function getEditLegoPairs(seed) {
  const state = editState.value[seed.uuid]
  if (!state) return []

  const pairs = []
  let targetStart = 0
  let knownStart = 0

  // Split by divider positions
  for (let i = 0; i < state.dividers.length; i++) {
    if (state.dividers[i] || i === state.dividers.length - 1) {
      const targetEnd = i + 1
      const knownEnd = i + 1

      const targetLego = state.targetWords.slice(targetStart, targetEnd).join(' ')
      const knownLego = state.knownWords.slice(knownStart, knownEnd).join(' ')

      if (targetLego) {
        pairs.push({
          target: targetLego,
          known: knownLego
        })
      }

      targetStart = targetEnd
      knownStart = knownEnd
    }
  }

  // Add final LEGO if there are remaining words
  if (targetStart < state.targetWords.length) {
    pairs.push({
      target: state.targetWords.slice(targetStart).join(' '),
      known: state.knownWords.slice(knownStart).join(' ')
    })
  }

  return pairs
}

async function saveSeed(seed) {
  saving.value = true
  try {
    const state = editState.value[seed.uuid]
    if (!state) {
      throw new Error('No edit state found')
    }

    // Get the edited LEGO pairs
    const editedLegoPairs = getEditLegoPairs(seed)

    console.log('Saving seed:', seed.seed_id, 'New LEGO pairs:', editedLegoPairs)

    // Send to API
    await api.default.put(
      `/api/courses/${selectedCourse.value}/seeds/${seed.uuid}/lego-breakdown`,
      {
        lego_pairs: editedLegoPairs
      }
    )

    editingSeed.value = null
    delete editState.value[seed.uuid]

    // Reload to get fresh data
    await loadSeeds()
  } catch (err) {
    error.value = `Failed to save: ${err.message}`
    console.error('Save error:', err)
  } finally {
    saving.value = false
  }
}

function nextPage() {
  if (offset.value + seedsPerPage.value < total.value) {
    offset.value += seedsPerPage.value
    loadSeeds()
  }
}

function previousPage() {
  if (offset.value > 0) {
    offset.value = Math.max(0, offset.value - seedsPerPage.value)
    loadSeeds()
  }
}

// Keyboard shortcuts
function handleKeyboard(e) {
  // Ignore if typing in an input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    return
  }

  if (e.key === 'e' && !editingSeed.value && seeds.value.length > 0) {
    startEditing(seeds.value[0])
  } else if (e.key === 's' && editingSeed.value) {
    const seed = seeds.value.find(s => s.uuid === editingSeed.value)
    if (seed) saveSeed(seed)
  } else if (e.key === 'Escape' && editingSeed.value) {
    cancelEditing()
  } else if (e.key === 'n') {
    nextPage()
  } else if (e.key === 'p') {
    previousPage()
  }
}

onMounted(() => {
  loadSeeds()
  window.addEventListener('keydown', handleKeyboard)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboard)
})
</script>
