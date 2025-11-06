<template>
  <div class="lego-basket-viewer">
    <!-- Header -->
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
      <h2 class="text-2xl font-bold text-emerald-400 mb-4">LEGO Practice Basket Viewer</h2>

      <!-- Course Selector -->
      <div class="mb-4">
        <label class="text-sm font-medium text-slate-300 mb-2 block">Select Course:</label>
        <select
          v-model="selectedCourseCode"
          @change="onCourseChange"
          class="w-full px-4 py-2 bg-slate-700 text-slate-200 border border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">-- Select a course --</option>
          <option
            v-for="course in availableCourses"
            :key="course.course_code"
            :value="course.course_code"
          >
            {{ course.target_language }} for {{ course.source_language }} ({{ course.course_code }})
          </option>
        </select>
      </div>

      <!-- Course Context Header -->
      <div v-if="currentCourse" class="mb-4 pb-4 border-b border-slate-700">
        <h2 class="text-xl font-semibold text-slate-200">{{ currentCourse.target_language }} for {{ currentCourse.source_language }}</h2>
        <h3 v-if="currentSeed" class="text-md text-slate-400 mt-1">Viewing: {{ currentSeed }}</h3>
      </div>

      <!-- Seed Navigation -->
      <div v-if="selectedCourseCode" class="mb-4 space-y-3">
        <div class="flex items-center gap-4">
          <label class="text-sm font-medium text-slate-300">Navigate to Seed:</label>

          <!-- Direct Input -->
          <input
            v-model.number="seedInput"
            @keyup.enter="goToSeed"
            type="number"
            :min="1"
            :max="availableSeeds.length"
            placeholder="e.g. 42"
            class="w-24 px-3 py-2 bg-slate-700 text-slate-200 border border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
          <button
            @click="goToSeed"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors"
          >
            Go
          </button>

          <!-- Prev/Next -->
          <div class="flex gap-2 ml-auto">
            <button
              @click="previousSeed"
              :disabled="!currentSeedNumber || currentSeedNumber <= 1"
              class="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              @click="nextSeed"
              :disabled="!currentSeedNumber || currentSeedNumber >= availableSeeds.length"
              class="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>

        <!-- Quick Jump Buttons (groups of 10) -->
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="groupStart in quickJumpGroups"
            :key="groupStart"
            @click="loadSeed(groupStart)"
            :class="[
              'px-3 py-1 rounded text-xs font-medium transition-colors',
              currentSeedNumber >= groupStart && currentSeedNumber < groupStart + 10
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            ]"
          >
            {{ groupStart }}-{{ Math.min(groupStart + 9, availableSeeds.length) }}
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
            <span class="text-slate-400">Pattern Introduced:</span>
            <span class="ml-2 text-emerald-400">{{ formatPattern(basketData.pattern_introduced || basketData.patterns_introduced) || 'None' }}</span>
          </div>
          <div>
            <span class="text-slate-400">Pattern Count:</span>
            <span class="ml-2 text-slate-300">{{ basketData.cumulative_patterns.length }} patterns</span>
            <button
              @click="showPatternDetails = !showPatternDetails"
              class="ml-2 text-xs text-blue-400 hover:text-blue-300"
            >
              {{ showPatternDetails ? '▼ Hide' : '▶ Show' }}
            </button>
          </div>
          <div>
            <span class="text-slate-400">Cumulative LEGOs:</span>
            <span class="ml-2 text-slate-300">{{ basketData.cumulative_legos }}</span>
          </div>
        </div>

        <!-- Pattern Details (Collapsible) -->
        <div v-if="showPatternDetails" class="mt-4 pt-4 border-t border-slate-700">
          <div class="text-xs text-slate-400 mb-2 uppercase font-semibold">Available Patterns:</div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="pattern in basketData.cumulative_patterns"
              :key="pattern"
              class="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs font-mono"
              :title="getPatternDescription(pattern)"
            >
              {{ formatPattern(pattern) }}
            </span>
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
        <div class="mb-4 pb-4 border-b border-slate-700">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="text-sm text-slate-400">{{ legoKey }}</div>
              <div class="text-xl font-bold">
                <span class="text-slate-300">{{ legoData.lego[0] }}</span>
                <span class="mx-3 text-slate-600">→</span>
                <span class="text-emerald-400">{{ legoData.lego[1] }}</span>
              </div>
            </div>
            <div class="text-right text-sm">
              <div class="text-slate-400">
                Type:
                <span :class="getLegoType(legoData) === 'M' ? 'text-blue-400 font-bold' : 'text-emerald-400'">
                  {{ getLegoType(legoData) }}
                </span>
                <span v-if="getLegoType(legoData) === 'M'" class="ml-1 text-xs text-blue-300">(Molecular)</span>
              </div>
              <div class="text-slate-400">Available LEGOs: <span class="text-slate-300">{{ legoData.available_legos }}</span></div>
              <div class="text-slate-400">Available Patterns: <span class="text-slate-300">{{ legoData.available_patterns.length }}</span></div>
              <div v-if="legoData.pattern_demonstrated" class="text-slate-400">
                Pattern: <span class="text-blue-400">{{ legoData.pattern_demonstrated }}</span>
              </div>
            </div>
          </div>

          <!-- Molecular Components (Expandable) -->
          <div v-if="getLegoType(legoData) === 'M' && getLegoComponentsFromData(legoData).length > 0" class="mt-4">
            <button
              @click="toggleMolecularLego(legoKey)"
              class="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <span v-if="isMolecularLegoExpanded(legoKey)">▼</span>
              <span v-else>▶</span>
              <span>{{ isMolecularLegoExpanded(legoKey) ? 'Hide' : 'Show' }} Components ({{ getLegoComponentsFromData(legoData).length }})</span>
            </button>

            <div v-if="isMolecularLegoExpanded(legoKey)" class="mt-3 ml-6 space-y-2">
              <div class="text-xs text-slate-400 uppercase font-semibold mb-2">Molecular Structure:</div>
              <div
                v-for="(component, idx) in getLegoComponentsFromData(legoData)"
                :key="idx"
                class="flex items-center gap-3 py-2 px-3 bg-slate-700/30 rounded border-l-2 border-blue-500/50"
              >
                <div class="text-blue-300 font-mono text-sm">{{ idx + 1 }}.</div>
                <div class="flex-1">
                  <div class="text-slate-200 font-medium">{{ component[0] }}</div>
                </div>
                <div class="text-slate-600 mx-2">→</div>
                <div class="flex-1">
                  <div class="text-emerald-400 text-sm">{{ component[1] }}</div>
                </div>
              </div>
            </div>
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
import api from '@/services/api'
import { isMolecularLego, getLegoComponents } from '@/services/legoFormatAdapter'

export default {
  name: 'LegoBasketViewer',
  data() {
    return {
      currentSeed: null,
      basketData: null,
      loading: false,
      error: null,
      availableCourses: [],
      selectedCourseCode: '',
      currentCourse: null,
      courseData: null,
      expandedMolecularLegos: {}, // Track which molecular LEGOs are expanded
      seedInput: null, // For direct seed navigation
      showPatternDetails: false // Toggle pattern list visibility
    }
  },
  computed: {
    availableSeeds() {
      // Get available seeds from the loaded course data
      if (!this.courseData || !this.courseData.translations) {
        return []
      }

      // Extract seed numbers from translations
      const seedNumbers = this.courseData.translations.map(t => {
        const match = t.seed_id.match(/S(\d+)/)
        return match ? parseInt(match[1]) : 0
      }).filter(n => n > 0).sort((a, b) => a - b)

      return seedNumbers
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
    },
    currentSeedNumber() {
      if (!this.currentSeed) return null
      const match = this.currentSeed.match(/S(\d+)/)
      return match ? parseInt(match[1]) : null
    },
    quickJumpGroups() {
      // Generate groups of 10 (1-10, 11-20, 21-30, etc.)
      if (this.availableSeeds.length === 0) return []
      const groups = []
      for (let i = 1; i <= this.availableSeeds.length; i += 10) {
        groups.push(i)
      }
      return groups
    }
  },
  async mounted() {
    // Load available courses
    await this.loadCourses()
  },
  methods: {
    formatPattern(pattern) {
      if (!pattern) return ''
      // Format P_NEW_* patterns to be more readable
      return pattern
        .replace(/^P_NEW_/, 'P-')
        .replace(/^P_/, 'P-')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
    },
    getPatternDescription(pattern) {
      // Tooltip descriptions for patterns
      const descriptions = {
        'P01': 'Basic verb patterns',
        'P02': 'Question formation',
        'P_RELATIVE': 'Relative clauses (que, quien)',
        'P_NEW_GUSTAR': 'Gustar-like verbs',
        'P_NEW_IMPERSONAL': 'Impersonal constructions (se)',
        'P_NEW_IMPERFECT': 'Imperfect tense',
        'P_NEW_REFLEXIVE': 'Reflexive verbs',
        'P_NEW_CONDITIONAL': 'Conditional tense',
        'P_NEW_PERFECT': 'Perfect tenses',
        'P_NEW_FUTURE': 'Future tense'
      }
      return descriptions[pattern] || pattern
    },
    hasConjunction(spanish) {
      const s = spanish.toLowerCase()
      return s.includes(' si ') || s.includes(' pero ') ||
             s.includes(' y ') || s.includes(' porque ') ||
             s.includes(' o ') || s.includes(' cuando ')
    },
    toggleMolecularLego(legoKey) {
      this.expandedMolecularLegos[legoKey] = !this.expandedMolecularLegos[legoKey]
      this.$forceUpdate() // Force Vue to re-render
    },
    isMolecularLegoExpanded(legoKey) {
      return this.expandedMolecularLegos[legoKey] || false
    },
    getLegoType(legoData) {
      // Check if this is a molecular LEGO by checking if it has components
      if (legoData.components && Array.isArray(legoData.components)) {
        return 'M'
      }
      // Check legacy type field
      return legoData.type || 'A'
    },
    getLegoComponentsFromData(legoData) {
      return legoData.components || []
    },
    async loadCourses() {
      try {
        const response = await api.course.list()
        this.availableCourses = response.courses || []
      } catch (err) {
        console.error('Error loading courses:', err)
        this.error = 'Failed to load courses'
      }
    },
    async onCourseChange() {
      if (!this.selectedCourseCode) {
        this.currentCourse = null
        this.courseData = null
        this.currentSeed = null
        this.basketData = null
        return
      }

      try {
        // Find the selected course
        this.currentCourse = this.availableCourses.find(
          c => c.course_code === this.selectedCourseCode
        )

        // Load course data to get available seeds
        this.courseData = await api.course.get(this.selectedCourseCode)

        // Reset current seed
        this.currentSeed = null
        this.basketData = null

        // Optionally auto-load first seed
        if (this.availableSeeds.length > 0) {
          await this.loadSeed(this.availableSeeds[0])
        }
      } catch (err) {
        console.error('Error loading course:', err)
        this.error = `Failed to load course: ${err.message}`
      }
    },
    goToSeed() {
      if (!this.seedInput || this.seedInput < 1 || this.seedInput > this.availableSeeds.length) {
        this.error = `Please enter a seed number between 1 and ${this.availableSeeds.length}`
        return
      }
      this.loadSeed(this.seedInput)
    },
    nextSeed() {
      if (this.currentSeedNumber && this.currentSeedNumber < this.availableSeeds.length) {
        this.loadSeed(this.currentSeedNumber + 1)
      }
    },
    previousSeed() {
      if (this.currentSeedNumber && this.currentSeedNumber > 1) {
        this.loadSeed(this.currentSeedNumber - 1)
      }
    },
    async loadSeed(seedNum) {
      if (!this.selectedCourseCode) {
        this.error = 'Please select a course first'
        return
      }

      this.currentSeed = `S${String(seedNum).padStart(4, '0')}`
      this.seedInput = seedNum // Sync input field
      this.loading = true
      this.error = null
      this.expandedMolecularLegos = {} // Reset expansion state

      const seedId = `S${String(seedNum).padStart(4, '0')}`

      try {
        const response = await api.course.getBasket(this.selectedCourseCode, seedId)
        // API returns {basket, stats, ...} but fallback returns basket directly
        this.basketData = response.basket || response
      } catch (err) {
        this.error = err.message || `Failed to load basket for ${seedId}`
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
