<template>
  <div class="lego-basket-phrase-viewer min-h-screen bg-slate-900 text-slate-100 p-6">
    <!-- Header -->
    <div class="max-w-7xl mx-auto mb-8">
      <router-link
        to="/"
        class="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition mb-4"
      >
        <span>←</span>
        <span>Back to Dashboard</span>
      </router-link>
      <h1 class="text-3xl font-bold text-emerald-400 mb-2">LEGO → BASKET Practice Phrases</h1>
      <p class="text-slate-400">
        View d-phrases (debut) and e-phrases (eternal) for each LEGO_PAIR
      </p>
    </div>

    <!-- Controls -->
    <div class="max-w-7xl mx-auto mb-6 bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div class="flex items-center gap-4 flex-wrap">
        <div class="flex-1 min-w-[200px]">
          <label class="block text-sm text-slate-300 mb-2">Course</label>
          <select
            v-model="selectedCourse"
            @change="loadLegos"
            class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="ita_for_eng_30seeds">Italian for English Speakers</option>
            <option value="spa_for_eng_30seeds">Spanish for English Speakers</option>
            <option value="fra_for_eng_30seeds">French for English Speakers</option>
            <option value="cmn_for_eng_30seeds">Mandarin for English Speakers</option>
            <option value="mkd_for_eng_574seeds">Macedonian for English Speakers</option>
          </select>
        </div>

        <div class="flex-1 min-w-[300px]">
          <label class="block text-sm text-slate-300 mb-2">Search LEGO by Provenance</label>
          <input
            v-model="searchProvenance"
            @input="filterLegos"
            type="text"
            placeholder="e.g., S0001L01, S0147, or search text..."
            class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <button
          v-if="selectedLego"
          @click="clearSelection"
          class="mt-6 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded transition"
        >
          Clear Selection
        </button>
      </div>
    </div>

    <!-- LEGO Selection List (when no LEGO selected) -->
    <div v-if="!selectedLego && !loading" class="max-w-7xl mx-auto">
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 class="text-xl font-semibold text-slate-100 mb-4">
          Available LEGOs ({{ filteredLegos.length }})
        </h2>

        <div v-if="filteredLegos.length === 0" class="text-center py-8 text-slate-400">
          No LEGOs found. Try a different search term or course.
        </div>

        <div v-else class="space-y-2 max-h-96 overflow-y-auto">
          <div
            v-for="lego in filteredLegos.slice(0, 50)"
            :key="lego.provenance"
            @click="selectLego(lego)"
            class="flex items-center justify-between p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded cursor-pointer transition"
          >
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <span class="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded">
                  {{ lego.provenance }}
                </span>
                <div class="flex gap-2">
                  <span class="text-blue-200">{{ lego.target }}</span>
                  <span class="text-slate-500">→</span>
                  <span class="text-slate-300">{{ lego.known }}</span>
                </div>
              </div>
            </div>
            <div class="text-xs text-slate-400">
              View phrases →
            </div>
          </div>
        </div>

        <div v-if="filteredLegos.length > 50" class="mt-4 text-center text-sm text-slate-400">
          Showing first 50 results. Refine your search to see more.
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="max-w-7xl mx-auto text-center py-12">
      <div class="text-emerald-400 text-lg">Loading phrases...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-7xl mx-auto">
      <div class="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400">
        {{ error }}
      </div>
    </div>

    <!-- Selected LEGO Phrases View -->
    <div v-else-if="selectedLego && basketData" class="max-w-7xl mx-auto space-y-6">
      <!-- LEGO Info Card -->
      <div class="bg-slate-800 border border-emerald-500 rounded-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-4">
            <span class="text-xl font-mono text-cyan-400 bg-cyan-400/10 px-3 py-2 rounded">
              {{ selectedLego.provenance }}
            </span>
            <div class="text-lg">
              <span class="text-blue-200 font-semibold">{{ selectedLego.target }}</span>
              <span class="text-slate-500 mx-2">→</span>
              <span class="text-slate-200">{{ selectedLego.known }}</span>
            </div>
          </div>
        </div>

        <div class="flex gap-6 text-sm">
          <div>
            <span class="text-slate-400">Total Phrases:</span>
            <span class="ml-2 text-emerald-400 font-semibold">
              {{ basketData.stats?.totalPhrases || 0 }}
            </span>
          </div>
          <div>
            <span class="text-slate-400">D-phrases:</span>
            <span class="ml-2 text-blue-400 font-semibold">
              {{ basketData.debut_phrases?.length || 0 }}
            </span>
          </div>
          <div>
            <span class="text-slate-400">E-phrases:</span>
            <span class="ml-2 text-purple-400 font-semibold">
              {{ basketData.eternal_phrases?.length || 0 }}
            </span>
          </div>
        </div>
      </div>

      <!-- Debut Phrases (d-phrases) -->
      <div class="bg-slate-800 border border-blue-700 rounded-lg p-6">
        <h2 class="text-xl font-semibold text-blue-300 mb-4">
          🎯 Debut Phrases ({{ basketData.debut_phrases?.length || 0 }})
        </h2>
        <p class="text-sm text-slate-400 mb-4">
          First introduction of this LEGO in practice contexts (up to 8 phrases)
        </p>

        <div v-if="!basketData.debut_phrases || basketData.debut_phrases.length === 0" class="text-center py-8 text-slate-400">
          No debut phrases found
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(phrase, index) in basketData.debut_phrases"
            :key="`d-${index}`"
            class="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="text-blue-100 font-medium mb-1">{{ phrase.target }}</div>
                <div class="text-slate-300 text-sm">{{ phrase.known }}</div>
                <div class="mt-2 text-xs text-slate-400">
                  <span v-if="phrase.provenance">Provenance: {{ phrase.provenance.join(', ') }}</span>
                  <span v-if="phrase.basket_id" class="ml-3">Basket: {{ phrase.basket_id }}</span>
                </div>
              </div>
              <button
                @click="regeneratePhrase(phrase, 'debut')"
                :disabled="regenerating === `d-${index}`"
                class="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm rounded transition"
              >
                {{ regenerating === `d-${index}` ? 'Regenerating...' : 'Regenerate' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Eternal Phrases (e-phrases) -->
      <div class="bg-slate-800 border border-purple-700 rounded-lg p-6">
        <h2 class="text-xl font-semibold text-purple-300 mb-4">
          ♾️ Eternal Phrases ({{ basketData.eternal_phrases?.length || 0 }})
        </h2>
        <p class="text-sm text-slate-400 mb-4">
          Practice with previously learned LEGOs (up to 5 phrases)
        </p>

        <div v-if="!basketData.eternal_phrases || basketData.eternal_phrases.length === 0" class="text-center py-8 text-slate-400">
          No eternal phrases found
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(phrase, index) in basketData.eternal_phrases"
            :key="`e-${index}`"
            class="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="text-purple-100 font-medium mb-1">{{ phrase.target }}</div>
                <div class="text-slate-300 text-sm">{{ phrase.known }}</div>
                <div class="mt-2 text-xs text-slate-400">
                  <span v-if="phrase.provenance">Provenance: {{ phrase.provenance.join(', ') }}</span>
                  <span v-if="phrase.basket_id" class="ml-3">Basket: {{ phrase.basket_id }}</span>
                </div>
              </div>
              <button
                @click="regeneratePhrase(phrase, 'eternal')"
                :disabled="regenerating === `e-${index}`"
                class="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white text-sm rounded transition"
              >
                {{ regenerating === `e-${index}` ? 'Regenerating...' : 'Regenerate' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as api from '../services/api'

const selectedCourse = ref('ita_for_eng_30seeds')
const searchProvenance = ref('')
const allLegos = ref([])
const filteredLegos = ref([])
const selectedLego = ref(null)
const basketData = ref(null)
const loading = ref(false)
const error = ref(null)
const regenerating = ref(null)

// Load all LEGOs from the course
async function loadLegos() {
  try {
    loading.value = true
    error.value = null

    // Load from static files
    const legosRes = await fetch(`/vfs/courses/${selectedCourse.value}/LEGO_BREAKDOWNS_COMPLETE.json`)

    if (!legosRes.ok) {
      throw new Error('Failed to load LEGO breakdowns')
    }

    const legoData = await legosRes.json()

    // Flatten all LEGO pairs into a searchable list
    const legosList = []
    for (const breakdown of legoData.lego_breakdowns || []) {
      // Add lego_pairs
      for (const lego of breakdown.lego_pairs || []) {
        legosList.push({
          provenance: lego.lego_id,
          target: lego.target_chunk,
          known: lego.known_chunk,
          seedId: breakdown.seed_id
        })
      }
      // Add feeder_pairs
      for (const feeder of breakdown.feeder_pairs || []) {
        legosList.push({
          provenance: feeder.feeder_id,
          target: feeder.target_chunk,
          known: feeder.known_chunk,
          seedId: breakdown.seed_id
        })
      }
    }

    allLegos.value = legosList
    filteredLegos.value = legosList
    console.log(`✅ Loaded ${legosList.length} LEGOs from ${selectedCourse.value}`)
  } catch (err) {
    error.value = `Failed to load LEGOs: ${err.message}`
    console.error('Error loading LEGOs:', err)
  } finally {
    loading.value = false
  }
}

// Filter LEGOs based on search
function filterLegos() {
  const search = searchProvenance.value.toLowerCase().trim()

  if (!search) {
    filteredLegos.value = allLegos.value
    return
  }

  filteredLegos.value = allLegos.value.filter(lego => {
    return (
      lego.provenance.toLowerCase().includes(search) ||
      lego.target.toLowerCase().includes(search) ||
      lego.known.toLowerCase().includes(search)
    )
  })
}

// Select a LEGO and load its basket phrases
async function selectLego(lego) {
  try {
    loading.value = true
    error.value = null
    selectedLego.value = lego

    // Load basket data from static file
    const basketsRes = await fetch(`/vfs/courses/${selectedCourse.value}/baskets_deduplicated.json`)

    if (!basketsRes.ok) {
      throw new Error('Failed to load baskets')
    }

    const basketsData = await basketsRes.json()

    // Find the basket for this LEGO (baskets are keyed by LEGO ID)
    const basketRaw = basketsData[lego.provenance]

    if (!basketRaw) {
      throw new Error(`Basket not found for ${lego.provenance}`)
    }

    // Convert to format expected by component
    // basketRaw structure: { lego: [target, known], e: [...], d: { "2": [...], "3": [...], ... } }
    const debutPhrases = []
    if (basketRaw.d) {
      for (const phrases of Object.values(basketRaw.d)) {
        debutPhrases.push(...phrases)
      }
    }

    basketData.value = {
      lego_id: lego.provenance,
      eternal_phrases: basketRaw.e || [],
      debut_phrases: debutPhrases,
      stats: {
        totalPhrases: (basketRaw.e?.length || 0) + debutPhrases.length
      }
    }

    console.log('✅ Loaded basket data for', lego.provenance)
  } catch (err) {
    error.value = `Failed to load basket phrases: ${err.message}`
    console.error('Error loading basket:', err)
    basketData.value = null
  } finally {
    loading.value = false
  }
}

// Clear selection and return to LEGO list
function clearSelection() {
  selectedLego.value = null
  basketData.value = null
  searchProvenance.value = ''
  filteredLegos.value = allLegos.value
}

// Regenerate a specific phrase
async function regeneratePhrase(phrase, type) {
  try {
    const phraseKey = `${type[0]}-${basketData.value[`${type}_phrases`].indexOf(phrase)}`
    regenerating.value = phraseKey

    console.log('Regenerating phrase:', phrase, type)

    // TODO: Implement regeneration endpoint
    // For now, simulate with delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Reload basket data
    await selectLego(selectedLego.value)
  } catch (err) {
    error.value = `Failed to regenerate phrase: ${err.message}`
    console.error('Regeneration error:', err)
  } finally {
    regenerating.value = null
  }
}

onMounted(() => {
  loadLegos()
})
</script>
