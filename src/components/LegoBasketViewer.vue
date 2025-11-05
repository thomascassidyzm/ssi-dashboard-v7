<template>
  <div class="lego-basket-viewer">
    <!-- Header -->
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
      <h2 class="text-2xl font-bold text-emerald-400 mb-4">LEGO Practice Basket Viewer</h2>

      <!-- Seed Selector -->
      <div class="flex items-center gap-4 mb-4">
        <label class="text-sm font-medium text-slate-300">Select Seed:</label>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="n in 10"
            :key="n"
            @click="loadSeed(n)"
            :class="[
              'px-4 py-2 rounded font-medium transition-colors',
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
            <span class="ml-2 text-emerald-400">{{ basketData.pattern_introduced }}</span>
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
                class="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
              >
                <td class="py-2 pr-4 text-slate-500">{{ idx + 1 }}</td>
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
                      'bg-orange-900/40 text-orange-300'
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
      error: null
    }
  },
  computed: {
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
    }
  },
  mounted() {
    // Load S0001 by default
    this.loadSeed(1)
  },
  methods: {
    async loadSeed(seedNum) {
      this.currentSeed = seedNum
      this.loading = true
      this.error = null

      const seedId = `s${String(seedNum).padStart(4, '0')}`
      const filePath = `/claude_code_web_test/output/lego_baskets_${seedId}.json`

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
