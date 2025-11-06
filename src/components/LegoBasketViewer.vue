<template>
  <div class="lego-basket-viewer">
    <!-- Header -->
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
      <h2 class="text-2xl font-bold text-emerald-400 mb-4">LEGO Practice Basket Viewer</h2>
      <p class="text-slate-400 text-sm mb-4">View LEGO baskets for any course. Select a course below to explore its practice phrases.</p>

      <!-- Search Bar -->
      <div class="mb-6">
        <label class="text-sm font-medium text-slate-300 mb-2 block">Search Courses:</label>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by language, course code, or seed count..."
          class="w-full px-4 py-2 bg-slate-700 text-slate-200 border border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <!-- Course Cards Grid -->
      <div v-if="!selectedCourseCode" class="mb-6">
        <h3 class="text-lg font-semibold text-slate-300 mb-4">Available Courses ({{ filteredCourses.length }})</h3>

        <div v-if="filteredCourses.length === 0" class="text-center py-8 text-slate-400">
          No courses found matching "{{ searchQuery }}"
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="course in filteredCourses"
            :key="course.course_code"
            @click="selectCourse(course.course_code)"
            class="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:border-emerald-500 hover:bg-slate-700 transition-all cursor-pointer group"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <h4 class="text-emerald-400 font-semibold group-hover:text-emerald-300">
                  {{ course.target_language }} for {{ course.source_language }}
                </h4>
                <p class="text-xs text-slate-500 mt-1">{{ course.course_code }}</p>
              </div>
              <span
                :class="[
                  'px-2 py-1 rounded text-xs font-medium',
                  course.has_baskets ? 'bg-emerald-600/20 text-emerald-400' : 'bg-slate-600/20 text-slate-400'
                ]"
              >
                {{ course.has_baskets ? '✓ Baskets' : 'No Baskets' }}
              </span>
            </div>

            <div class="grid grid-cols-3 gap-2 text-xs mt-3">
              <div>
                <div class="text-slate-500">Seeds</div>
                <div class="text-slate-300 font-semibold">{{ course.actual_seed_count || course.total_seeds || 0 }}</div>
              </div>
              <div>
                <div class="text-slate-500">LEGOs</div>
                <div class="text-slate-300 font-semibold">{{ course.lego_count || 0 }}</div>
              </div>
              <div>
                <div class="text-slate-500">Phase</div>
                <div class="text-slate-300 font-semibold">{{ course.phase?.replace('phase_', '') || '-' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Course Context Header with Back Button -->
      <div v-if="currentCourse" class="mb-4 pb-4 border-b border-slate-700">
        <button
          @click="deselectCourse"
          class="text-emerald-400 hover:text-emerald-300 text-sm mb-2 flex items-center gap-1"
        >
          ← Back to all courses
        </button>
        <h2 class="text-xl font-semibold text-slate-200">{{ currentCourse.target_language }} for {{ currentCourse.source_language }}</h2>
        <h3 v-if="currentSeed" class="text-md text-slate-400 mt-1">Viewing: {{ currentSeed }}</h3>
      </div>

      <!-- Seed Selector -->
      <div v-if="selectedCourseCode" class="mb-4">
        <label class="text-sm font-medium text-slate-300 mb-2 block">Select Seed:</label>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="n in availableSeeds"
            :key="n"
            @click="loadSeed(n)"
            :class="[
              'px-3 py-2 rounded font-medium transition-colors text-sm',
              currentSeed === `S${String(n).padStart(4, '0')}`
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
      searchQuery: '' // Search filter for courses
    }
  },
  computed: {
    filteredCourses() {
      if (!this.searchQuery) {
        return this.availableCourses
      }

      const query = this.searchQuery.toLowerCase()
      return this.availableCourses.filter(course => {
        return (
          course.course_code.toLowerCase().includes(query) ||
          course.target_language.toLowerCase().includes(query) ||
          course.source_language.toLowerCase().includes(query) ||
          (course.total_seeds && course.total_seeds.toString().includes(query))
        )
      })
    },
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
    }
  },
  async mounted() {
    // Load available courses
    await this.loadCourses()
  },
  methods: {
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
        // Sort by course_code
        this.availableCourses.sort((a, b) => a.course_code.localeCompare(b.course_code))
      } catch (err) {
        console.error('Error loading courses:', err)
        this.error = 'Failed to load courses'
      }
    },
    selectCourse(courseCode) {
      this.selectedCourseCode = courseCode
      this.onCourseChange()
    },
    deselectCourse() {
      this.selectedCourseCode = ''
      this.currentCourse = null
      this.courseData = null
      this.currentSeed = null
      this.basketData = null
      this.searchQuery = ''
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
    async loadSeed(seedNum) {
      if (!this.selectedCourseCode) {
        this.error = 'Please select a course first'
        return
      }

      this.currentSeed = `S${String(seedNum).padStart(4, '0')}`
      this.loading = true
      this.error = null
      this.expandedMolecularLegos = {} // Reset expansion state

      const seedId = `S${String(seedNum).padStart(4, '0')}`

      try {
        const response = await api.course.getBasket(this.selectedCourseCode, seedId)
        this.basketData = response
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
