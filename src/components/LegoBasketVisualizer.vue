<template>
  <div class="lego-basket-visualizer min-h-screen bg-slate-900 text-slate-100 p-6">
    <!-- Header -->
    <div class="max-w-7xl mx-auto mb-8">
      <h1 class="text-3xl font-bold text-emerald-400 mb-2">LEGO Basket Practice Phrases</h1>
      <p class="text-slate-400">
        Eternal phrases (e-phrases) and debut phrases (d-phrases) for LEGO practice
      </p>
    </div>

    <!-- Controls -->
    <div class="max-w-7xl mx-auto mb-6 bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div class="flex items-center gap-4">
        <div class="flex-1">
          <label class="block text-sm text-slate-300 mb-2">Course</label>
          <select
            v-model="selectedCourse"
            @change="loadLegoList"
            class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="ita_for_eng_668seeds">Italian for English Speakers</option>
            <option value="spa_for_eng_668seeds">Spanish for English Speakers</option>
            <option value="mkd_for_eng_574seeds">Macedonian for English Speakers</option>
          </select>
        </div>

        <div class="flex-1">
          <label class="block text-sm text-slate-300 mb-2">LEGO Provenance</label>
          <input
            v-model="legoProvenance"
            type="text"
            placeholder="e.g., S0001L01"
            class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            @keyup.enter="loadBasket"
          />
        </div>

        <button
          @click="loadBasket"
          class="mt-6 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition"
        >
          Load Basket
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="max-w-7xl mx-auto text-center py-12">
      <div class="text-emerald-400 text-lg">Loading basket...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-7xl mx-auto">
      <div class="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400">
        {{ error }}
      </div>
      <div v-if="showDataFormatHelp" class="mt-4 bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 text-yellow-300">
        <h3 class="font-semibold mb-2">Data Format Issue</h3>
        <p class="mb-2">The Phase 5 baskets for this course are in an old format.</p>
        <p class="mb-2">To regenerate Phase 5 with the correct format:</p>
        <pre class="bg-slate-900 p-3 rounded text-xs text-slate-300">
curl -X POST http://localhost:54321/api/courses/{{ selectedCourse }}/regenerate-phase \
  -H "Content-Type: application/json" \
  -d '{"phase": "5"}'
        </pre>
        <p class="mt-2 text-sm">This will take approximately 30-60 minutes.</p>
      </div>
    </div>

    <!-- Basket Display -->
    <div v-else-if="basket" class="max-w-7xl mx-auto">
      <!-- LEGO Header -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <div class="text-sm text-slate-400 mb-1">LEGO Provenance</div>
            <div class="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded inline-block">
              {{ legoProvenance }}
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm text-slate-400">Total Phrases</div>
            <div class="text-2xl font-bold text-emerald-400">
              {{ basket.stats.totalPhrases }}
            </div>
          </div>
        </div>

        <!-- Target/Known Pair -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-xs uppercase tracking-wider text-emerald-400 mb-2">Target Language</div>
            <div class="bg-blue-900/30 border border-blue-700 rounded p-3 text-lg font-medium">
              {{ basket.target }}
            </div>
          </div>
          <div>
            <div class="text-xs uppercase tracking-wider text-slate-400 mb-2">Known Language</div>
            <div class="bg-slate-900 rounded p-3 text-lg">
              {{ basket.known }}
            </div>
          </div>
        </div>

        <div v-if="basket.seedOrigin" class="mt-3 text-sm text-slate-500">
          Origin: Seed {{ basket.seedOrigin }}
        </div>
      </div>

      <!-- E-Phrases Section -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <h2 class="text-xl font-bold text-emerald-400 mb-4">
          E-Phrases (Eternal Practice)
        </h2>
        <p class="text-sm text-slate-400 mb-4">
          {{ basket.stats.ePhraseCount }} phrases for spaced repetition (7-15 words each)
        </p>

        <div v-if="basket.ePhrases.length === 0" class="text-center py-8 text-slate-500">
          No e-phrases available. Phase 5 may need regeneration.
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="(phrase, index) in basket.ePhrases"
            :key="index"
            class="bg-slate-900/50 border border-slate-700 rounded-lg p-4"
          >
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 w-8 h-8 bg-emerald-600/20 text-emerald-400 rounded-full flex items-center justify-center text-sm font-semibold">
                {{ index + 1 }}
              </div>
              <div class="flex-1 space-y-2">
                <div class="text-emerald-300 text-lg">{{ phrase[0] }}</div>
                <div class="text-slate-400">{{ phrase[1] }}</div>
                <div class="flex items-center gap-4 text-xs text-slate-500">
                  <span>{{ countWords(phrase[0]) }} words</span>
                  <span
                    :class="{
                      'text-green-400': countWords(phrase[0]) >= 7 && countWords(phrase[0]) <= 15,
                      'text-yellow-400': countWords(phrase[0]) < 7 || countWords(phrase[0]) > 15
                    }"
                  >
                    {{ countWords(phrase[0]) >= 7 && countWords(phrase[0]) <= 15 ? '✓' : '⚠' }}
                    {{ countWords(phrase[0]) >= 7 && countWords(phrase[0]) <= 15 ? 'Valid length' : 'Outside 7-15 word range' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- D-Phrases Section -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 class="text-xl font-bold text-emerald-400 mb-4">
          D-Phrases (Debut Practice)
        </h2>
        <p class="text-sm text-slate-400 mb-4">
          {{ basket.stats.dPhraseCount }} phrases with progressive complexity (2→5 LEGOs)
        </p>

        <div v-if="basket.stats.dPhraseCount === 0" class="text-center py-8 text-slate-500">
          No d-phrases available. Phase 5 may need regeneration.
        </div>

        <div v-else class="space-y-6">
          <!-- 2-LEGO Phrases -->
          <div v-if="basket.dPhrases['2_lego'] && basket.dPhrases['2_lego'].length > 0">
            <h3 class="text-sm font-semibold text-emerald-400 mb-3 uppercase tracking-wider">
              2-LEGO Combinations ({{ basket.dPhrases['2_lego'].length }} phrases)
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                v-for="(phrase, index) in basket.dPhrases['2_lego']"
                :key="index"
                class="bg-slate-900/50 border border-slate-700 rounded p-3"
              >
                <div class="text-emerald-300">{{ phrase[0] }}</div>
                <div class="text-slate-400 text-sm mt-1">{{ phrase[1] }}</div>
              </div>
            </div>
          </div>

          <!-- 3-LEGO Phrases -->
          <div v-if="basket.dPhrases['3_lego'] && basket.dPhrases['3_lego'].length > 0">
            <h3 class="text-sm font-semibold text-emerald-400 mb-3 uppercase tracking-wider">
              3-LEGO Combinations ({{ basket.dPhrases['3_lego'].length }} phrases)
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                v-for="(phrase, index) in basket.dPhrases['3_lego']"
                :key="index"
                class="bg-slate-900/50 border border-slate-700 rounded p-3"
              >
                <div class="text-emerald-300">{{ phrase[0] }}</div>
                <div class="text-slate-400 text-sm mt-1">{{ phrase[1] }}</div>
              </div>
            </div>
          </div>

          <!-- 4-LEGO Phrases -->
          <div v-if="basket.dPhrases['4_lego'] && basket.dPhrases['4_lego'].length > 0">
            <h3 class="text-sm font-semibold text-emerald-400 mb-3 uppercase tracking-wider">
              4-LEGO Combinations ({{ basket.dPhrases['4_lego'].length }} phrases)
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                v-for="(phrase, index) in basket.dPhrases['4_lego']"
                :key="index"
                class="bg-slate-900/50 border border-slate-700 rounded p-3"
              >
                <div class="text-emerald-300">{{ phrase[0] }}</div>
                <div class="text-slate-400 text-sm mt-1">{{ phrase[1] }}</div>
              </div>
            </div>
          </div>

          <!-- 5-LEGO Phrases -->
          <div v-if="basket.dPhrases['5_lego'] && basket.dPhrases['5_lego'].length > 0">
            <h3 class="text-sm font-semibold text-emerald-400 mb-3 uppercase tracking-wider">
              5-LEGO Combinations ({{ basket.dPhrases['5_lego'].length }} phrases)
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                v-for="(phrase, index) in basket.dPhrases['5_lego']"
                :key="index"
                class="bg-slate-900/50 border border-slate-700 rounded p-3"
              >
                <div class="text-emerald-300">{{ phrase[0] }}</div>
                <div class="text-slate-400 text-sm mt-1">{{ phrase[1] }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="mt-6 flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg p-4">
        <button
          @click="previousLego"
          :disabled="!canGoPrevious"
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded transition"
        >
          Previous LEGO
        </button>

        <div class="text-sm text-slate-400">
          Browse LEGOs in UID sequence order
        </div>

        <button
          @click="nextLego"
          :disabled="!canGoNext"
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded transition"
        >
          Next LEGO
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import * as api from '../services/api'

const selectedCourse = ref('ita_for_eng_668seeds')
const legoProvenance = ref('S0001L01')
const basket = ref(null)
const loading = ref(false)
const error = ref(null)
const showDataFormatHelp = ref(false)

// For navigation
const legoList = ref([])
const currentLegoIndex = ref(-1)

const canGoPrevious = computed(() => currentLegoIndex.value > 0)
const canGoNext = computed(() => currentLegoIndex.value < legoList.value.length - 1)

async function loadLegoList() {
  // Load list of all LEGOs for the course to enable navigation
  try {
    const response = await api.default.get(`/api/courses/${selectedCourse.value}/seed-lego-breakdown?limit=1000`)

    // Extract all LEGO provenance IDs from seeds
    const allLegos = []
    response.data.seeds.forEach(seed => {
      seed.legos.forEach(lego => {
        if (lego.provenance && !allLegos.includes(lego.provenance)) {
          allLegos.push(lego.provenance)
        }
      })
    })

    // Sort by UID (e.g., S0001L01, S0001L02, etc.)
    legoList.value = allLegos.sort()

    // Find current LEGO index
    currentLegoIndex.value = legoList.value.indexOf(legoProvenance.value)
  } catch (err) {
    console.error('Failed to load LEGO list:', err)
  }
}

async function loadBasket() {
  if (!legoProvenance.value) {
    error.value = 'Please enter a LEGO provenance (e.g., S0001L01)'
    return
  }

  loading.value = true
  error.value = null
  showDataFormatHelp.value = false

  try {
    const response = await api.default.get(
      `/api/courses/${selectedCourse.value}/lego/${legoProvenance.value}/basket`
    )

    basket.value = response.data

    // Update navigation
    await loadLegoList()
  } catch (err) {
    error.value = `Failed to load basket: ${err.message}`

    // Check if it's a data format issue
    if (err.message.includes('not found') || err.response?.status === 404) {
      showDataFormatHelp.value = true
    }

    console.error('Error loading basket:', err)
  } finally {
    loading.value = false
  }
}

function nextLego() {
  if (canGoNext.value) {
    currentLegoIndex.value++
    legoProvenance.value = legoList.value[currentLegoIndex.value]
    loadBasket()
  }
}

function previousLego() {
  if (canGoPrevious.value) {
    currentLegoIndex.value--
    legoProvenance.value = legoList.value[currentLegoIndex.value]
    loadBasket()
  }
}

function countWords(text) {
  if (!text) return 0
  return text.trim().split(/\s+/).length
}

onMounted(() => {
  // Optionally load a default basket
  // loadBasket()
})
</script>
