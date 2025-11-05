<template>
  <div class="lego-basket-viewer">
    <!-- Header -->
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
      <h2 class="text-2xl font-bold text-emerald-400 mb-4">LEGO Practice Basket Viewer</h2>

      <!-- Source Toggle -->
      <div class="mb-4">
        <label class="text-sm font-medium text-slate-300 mb-2 block">Basket Source:</label>
        <div class="flex gap-2">
          <button
            @click="basketSource = 'public'"
            :class="[
              'px-4 py-2 rounded font-medium transition-colors text-sm',
              basketSource === 'public'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            ]"
          >
            Hand-Crafted (public/baskets)
          </button>
          <button
            @click="basketSource = 'generated'"
            :class="[
              'px-4 py-2 rounded font-medium transition-colors text-sm',
              basketSource === 'generated'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            ]"
          >
            AI-Generated ✨ (generated_baskets)
          </button>
        </div>
      </div>

      <!-- Seed Selector -->
      <div class="mb-4">
        <label class="text-sm font-medium text-slate-300 mb-2 block">Select Seed:</label>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="n in availableSeeds"
            :key="n"
            @click="loadSeed(n)"
            :class="[
              'px-3 py-2 rounded font-medium transition-colors text-sm',
              currentSeed === n
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            ]"
          >
            S{{ String(n).padStart(4, '0') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12 text-slate-400">
      <div class="text-lg">Loading basket data...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-900/20 border border-red-700 rounded-lg p-6 text-red-400">
      <h3 class="font-bold mb-2">Error Loading Basket</h3>
      <p>{{ error }}</p>
    </div>

    <!-- Basket Data -->
    <div v-else-if="basketData" class="space-y-6">
      <!-- Seed Info Card -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <div class="text-sm text-slate-400">Known (English)</div>
            <div class="text-lg text-slate-100">{{ basketData.seed_pair.known }}</div>
          </div>
          <div>
            <div class="text-sm text-slate-400">Target (Spanish)</div>
            <div class="text-lg text-emerald-400">{{ basketData.seed_pair.target }}</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span class="text-slate-400">Pattern:</span>
            <span class="ml-2 text-emerald-400">{{ basketData.pattern_introduced || basketData.patterns_introduced || '-' }}</span>
          </div>
          <div>
            <span class="text-slate-400">Cumulative Patterns:</span>
            <span class="ml-2 text-slate-300">{{ basketData.cumulative_patterns.join(', ') }}</span>
          </div>
          <div>
            <span class="text-slate-400">Cumulative LEGOs:</span>
            <span class="ml-2 text-slate-300">{{ basketData.cumulative_legos }}</span>
          </div>
        </div>
      </div>

      <!-- Quality Metrics Card (AI-Generated baskets) -->
      <div v-if="qualityMetrics" class="bg-gradient-to-r from-emerald-900/30 to-blue-900/30 border border-emerald-700/50 rounded-lg p-6">
        <h3 class="text-lg font-bold text-emerald-400 mb-4">📊 Conversational Quality Metrics</h3>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="text-center">
            <div class="text-3xl font-bold text-emerald-400">{{ qualityMetrics.conversationalCount }}</div>
            <div class="text-sm text-slate-400 mt-1">Conversational Phrases</div>
            <div class="text-xs text-slate-500">(5+ LEGOs)</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-blue-400">{{ qualityMetrics.conjunctionCount }}</div>
            <div class="text-sm text-slate-400 mt-1">With Conjunctions</div>
            <div class="text-xs text-slate-500">({{ qualityMetrics.conjunctionPct }}%)</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold" :class="qualityMetrics.conversationalPct >= 40 ? 'text-green-400' : 'text-yellow-400'">
              {{ qualityMetrics.conversationalPct }}%
            </div>
            <div class="text-sm text-slate-400 mt-1">Conversational Rate</div>
            <div class="text-xs text-emerald-500" v-if="qualityMetrics.conversationalPct >= 40">✓ Excellent</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold" :class="qualityMetrics.avgLegoCount >= 4 ? 'text-green-400' : 'text-yellow-400'">
              {{ qualityMetrics.avgLegoCount }}
            </div>
            <div class="text-sm text-slate-400 mt-1">Avg LEGOs/Phrase</div>
          </div>
        </div>
        <div v-if="basketData.generation_metadata" class="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-400">
          <div class="flex gap-4 flex-wrap">
            <div>
              <span class="text-slate-500">Available Conjunctions:</span>
              <span class="ml-2 text-emerald-400">{{ basketData.generation_metadata.available_conjunctions?.join(', ') || 'N/A' }}</span>
            </div>
            <div>
              <span class="text-slate-500">Generated:</span>
              <span class="ml-2 text-slate-300">{{ basketData.generation_metadata.generated_by }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- LEGOs with Practice Phrases -->
      <div
        v-for="(legoData, legoKey) in legoBaskets"
        :key="legoKey"
        class="bg-slate-800 border border-slate-700 rounded-lg p-6"
      >
        <!-- LEGO Header -->
        <div class="flex items-center justify-between mb-4 pb-4 border-b border-slate-700">
          <div>
            <div class="text-sm text-slate-400">{{ legoKey }}</div>
            <div class="text-xl font-bold">
              <span class="text-slate-300">{{ legoData.lego[0] }}</span>
              <span class="mx-3 text-slate-600">→</span>
              <span class="text-emerald-400">{{ legoData.lego[1] }}</span>
            </div>
          </div>
          <div class="text-right text-sm">
            <div class="text-slate-400">Type: <span class="text-emerald-400">{{ legoData.type }}</span></div>
            <div class="text-slate-400">Available LEGOs: <span class="text-slate-300">{{ legoData.available_legos }}</span></div>
            <div class="text-slate-400">Available Patterns: <span class="text-slate-300">{{ legoData.available_patterns.length }}</span></div>
          </div>
        </div>

        <!-- Practice Phrases Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-slate-400 border-b border-slate-700">
                <th class="pb-2 pr-4">#</th>
                <th class="pb-2 pr-4">Known (English)</th>
                <th class="pb-2 pr-4">Target (Spanish)</th>
                <th class="pb-2 pr-4">Pattern</th>
                <th class="pb-2 text-right">LEGOs</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(phrase, idx) in legoData.practice_phrases"
                :key="idx"
                :class="[
                  'border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors',
                  phrase[3] >= 5 ? 'bg-emerald-900/10' : ''
                ]"
              >
                <td class="py-2 pr-4 text-slate-500">
                  {{ idx + 1 }}
                  <span v-if="phrase[3] >= 5" class="ml-1 text-emerald-500" title="Conversational (5+ LEGOs)">💬</span>
                  <span v-if="hasConjunction(phrase[1])" class="ml-1 text-blue-400" title="Uses conjunction">⚡</span>
                </td>
                <td class="py-2 pr-4 text-slate-300">{{ phrase[0] }}</td>
                <td class="py-2 pr-4 text-emerald-400">{{ phrase[1] }}</td>
                <td class="py-2 pr-4">
                  <span
                    v-if="phrase[2]"
                    class="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-900/40 text-blue-300"
                  >
                    {{ phrase[2] }}
                  </span>
                  <span v-else class="text-slate-600">-</span>
                </td>
                <td class="py-2 text-right">
                  <span
                    :class="[
                      'inline-block px-2 py-1 rounded text-xs font-bold',
                      phrase[3] <= 2 ? 'bg-green-900/40 text-green-300' :
                      phrase[3] <= 4 ? 'bg-yellow-900/40 text-yellow-300' :
                      'bg-emerald-900/60 text-emerald-300'
                    ]"
                  >
                    {{ phrase[3] }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Summary Stats -->
        <div class="mt-4 pt-4 border-t border-slate-700 text-sm text-slate-400">
          <span class="mr-4">Total Phrases: <span class="text-slate-300">{{ legoData.practice_phrases.length }}</span></span>
          <span class="mr-4">Min LEGOs: <span class="text-green-300">{{ Math.min(...legoData.practice_phrases.map(p => p[3])) }}</span></span>
          <span>Max LEGOs: <span class="text-orange-300">{{ Math.max(...legoData.practice_phrases.map(p => p[3])) }}</span></span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12 text-slate-400">
      <div class="text-lg">Select a seed to view its practice baskets</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LegoBasketViewer',
  data() {
    return {
      currentSeed: null,
      basketData: null,
      loading: false,
      error: null,
      basketSource: 'generated' // 'public' or 'generated'
    }
  },
  computed: {
    availableSeeds() {
      // For generated baskets, we have S0011, S0021, S0031
      // For public baskets, we have S0001-S0020
      if (this.basketSource === 'generated') {
        return [11, 21, 31]
      }
      return Array.from({ length: 50 }, (_, i) => i + 1)
    },
    legoBaskets() {
      if (!this.basketData) return {}

      // Extract all LEGO baskets (keys starting with "S")
      const baskets = {}
      for (const key in this.basketData) {
        if (key.startsWith('S') && key.includes('L')) {
          baskets[key] = this.basketData[key]
        }
      }
      return baskets
    },
    qualityMetrics() {
      if (!this.basketData || Object.keys(this.legoBaskets).length === 0) return null

      let totalPhrases = 0
      let conversationalCount = 0
      let conjunctionCount = 0
      let totalLegos = 0

      for (const legoKey in this.legoBaskets) {
        const phrases = this.legoBaskets[legoKey].practice_phrases || []
        totalPhrases += phrases.length

        phrases.forEach(phrase => {
          const legoCount = phrase[3] || 1
          totalLegos += legoCount

          if (legoCount >= 5) {
            conversationalCount++
          }

          if (this.hasConjunction(phrase[1])) {
            conjunctionCount++
          }
        })
      }

      return {
        conversationalCount,
        conversationalPct: Math.round((conversationalCount / totalPhrases) * 100),
        conjunctionCount,
        conjunctionPct: Math.round((conjunctionCount / totalPhrases) * 100),
        avgLegoCount: (totalLegos / totalPhrases).toFixed(1),
        totalPhrases
      }
    }
  },
  watch: {
    basketSource() {
      // When source changes, load the first available seed
      this.loadSeed(this.availableSeeds[0])
    }
  },
  mounted() {
    // Load first available seed by default
    this.loadSeed(this.availableSeeds[0])
  },
  methods: {
    hasConjunction(spanish) {
      const s = spanish.toLowerCase()
      return s.includes(' si ') || s.includes(' pero ') ||
             s.includes(' y ') || s.includes(' porque ') ||
             s.includes(' o ') || s.includes(' cuando ')
    },
    async loadSeed(seedNum) {
      this.currentSeed = seedNum
      this.loading = true
      this.error = null

      const seedId = `s${String(seedNum).padStart(4, '0')}`

      // Determine file path based on source
      let filePath
      if (this.basketSource === 'generated') {
        filePath = `/generated_baskets/lego_baskets_${seedId}_conversational.json`
      } else {
        filePath = `/baskets/lego_baskets_${seedId}.json`
      }

      try {
        const response = await fetch(filePath)
        if (!response.ok) {
          throw new Error(`Failed to load ${seedId}: ${response.statusText}`)
        }
        this.basketData = await response.json()
      } catch (err) {
        this.error = err.message
        this.basketData = null
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.lego-basket-viewer {
  @apply max-w-7xl mx-auto p-6;
}

table {
  @apply border-collapse;
}
</style>
