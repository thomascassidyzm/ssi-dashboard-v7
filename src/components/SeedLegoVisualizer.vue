<template>
  <div class="seed-lego-visualizer min-h-screen bg-slate-900 text-slate-100 p-6">
    <!-- Header -->
    <div class="max-w-7xl mx-auto mb-8">
      <h1 class="text-3xl font-bold text-emerald-400 mb-2">SEED → LEGO Breakdown</h1>
      <p class="text-slate-400">
        Showing how seeds decompose into LEGO pairs (teaching units)
      </p>
    </div>

    <!-- Controls -->
    <div class="max-w-7xl mx-auto mb-6 bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div class="flex items-center gap-4">
        <div class="flex-1">
          <label class="block text-sm text-slate-300 mb-2">Course</label>
          <select
            v-model="selectedCourse"
            @change="loadSeeds"
            class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="ita_for_eng_668seeds">Italian for English Speakers</option>
            <option value="spa_for_eng_668seeds">Spanish for English Speakers</option>
            <option value="mkd_for_eng_574seeds">Macedonian for English Speakers</option>
          </select>
        </div>

        <div>
          <label class="block text-sm text-slate-300 mb-2">Seeds per page</label>
          <select
            v-model.number="seedsPerPage"
            @change="loadSeeds"
            class="bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option :value="2">2 seeds</option>
            <option :value="4">4 seeds</option>
            <option :value="6">6 seeds</option>
          </select>
        </div>

        <div>
          <label class="block text-sm text-slate-300 mb-2">Offset</label>
          <input
            v-model.number="offset"
            type="number"
            min="0"
            step="10"
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

    <!-- Seed Grid -->
    <div v-else class="max-w-7xl mx-auto">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          v-for="seed in seeds"
          :key="seed.uuid"
          class="bg-slate-800 border border-slate-700 rounded-lg p-6"
        >
          <!-- Seed Header -->
          <div class="mb-4 pb-4 border-b border-slate-700">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded">
                {{ seed.seed_id || seed.uuid.substring(0, 8) }}
              </span>
              <span class="text-xs text-slate-400">
                {{ seed.legos.length }} LEGOs • {{ seed.legos.reduce((sum, l) => sum + l.word_count, 0) }} words
              </span>
            </div>
          </div>

          <!-- LEGO Breakdown -->
          <div class="space-y-4">
            <!-- Target Language (Top) -->
            <div>
              <div class="text-xs uppercase tracking-wider text-emerald-400 mb-2">Target Language</div>
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="(lego, index) in seed.legos"
                  :key="lego.uuid"
                  class="group relative"
                >
                  <div
                    class="px-3 py-2 bg-blue-900/30 border border-blue-700 rounded cursor-pointer hover:bg-blue-900/50 transition"
                    :title="`${lego.provenance} • ${lego.word_count} words • Score: ${lego.pedagogical_score}`"
                  >
                    <div class="font-medium">{{ lego.text }}</div>
                    <div class="text-xs text-blue-300 mt-1">{{ lego.provenance }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Arrow -->
            <div class="text-center text-slate-600">
              <svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
              </svg>
            </div>

            <!-- Known Language (Bottom) -->
            <div>
              <div class="text-xs uppercase tracking-wider text-slate-400 mb-2">Known Language</div>
              <div class="bg-slate-900 rounded p-3 text-slate-300">
                {{ seed.source }}
              </div>
            </div>

            <!-- Quality Score -->
            <div v-if="seed.quality_score" class="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700">
              <span>Quality Score:</span>
              <span class="font-mono" :class="{
                'text-green-400': seed.quality_score >= 80,
                'text-yellow-400': seed.quality_score >= 60 && seed.quality_score < 80,
                'text-red-400': seed.quality_score < 60
              }">
                {{ seed.quality_score }}/100
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="mt-6 flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg p-4">
        <button
          @click="previousPage"
          :disabled="offset === 0"
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded transition"
        >
          Previous
        </button>

        <div class="text-sm text-slate-400">
          Showing {{ offset + 1 }} - {{ Math.min(offset + seedsPerPage, total) }} of {{ total }} seeds
        </div>

        <button
          @click="nextPage"
          :disabled="offset + seedsPerPage >= total"
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded transition"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as api from '../services/api'

const selectedCourse = ref('ita_for_eng_668seeds')
const seedsPerPage = ref(4)
const offset = ref(0)
const seeds = ref([])
const total = ref(0)
const loading = ref(false)
const error = ref(null)

async function loadSeeds() {
  loading.value = true
  error.value = null

  try {
    const response = await api.default.get(
      `/api/courses/${selectedCourse.value}/seed-lego-breakdown?limit=${seedsPerPage.value}&offset=${offset.value}`
    )

    seeds.value = response.data.seeds
    total.value = response.data.total
  } catch (err) {
    error.value = `Failed to load seeds: ${err.message}`
    console.error('Error loading seeds:', err)
  } finally {
    loading.value = false
  }
}

function nextPage() {
  offset.value += seedsPerPage.value
  loadSeeds()
}

function previousPage() {
  offset.value = Math.max(0, offset.value - seedsPerPage.value)
  loadSeeds()
}

onMounted(() => {
  loadSeeds()
})
</script>
