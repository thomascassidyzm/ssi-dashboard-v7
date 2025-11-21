<template>
  <div class="lego-basket-viewer">
    <!-- Header -->
    <div v-if="!courseCode" class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
      <!-- Back to Dashboard -->
      <router-link
        to="/"
        class="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors mb-4"
      >
        <span class="text-xl">←</span>
        <span class="text-sm">Back to Dashboard</span>
      </router-link>

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
        <h2 class="text-xl font-semibold text-slate-200">
          {{ currentCourse.target_language }} for {{ currentCourse.source_language }}
          <span class="text-slate-500 text-sm ml-2">({{ currentCourse.course_code }})</span>
        </h2>
      </div>

    </div>

    <!-- Batch Navigation (Always visible when course is loaded) -->
    <div v-if="selectedCourseCode" class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
      <div class="mb-4 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <label class="text-sm font-medium text-slate-300">Viewing Batch:</label>
            <span class="ml-2 text-emerald-400 font-bold">
              Seeds {{ currentBatchStart }}-{{ Math.min(currentBatchStart + 9, availableSeeds.length) }}
            </span>
            <span class="ml-2 text-slate-500 text-sm">
              ({{ loadedSeeds.length }} loaded)
            </span>
          </div>

          <!-- Batch Controls -->
          <div class="flex gap-2">
            <button
              v-if="loadedSeeds.length > 0"
              @click="toggleExpandAll"
              class="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors"
            >
              {{ allExpanded ? 'Collapse All' : 'Expand All' }}
            </button>
            <button
              v-if="Object.keys(hasUnsavedChanges).length > 0"
              @click="saveAllChanges"
              class="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium transition-colors"
            >
              💾 Save All Changes ({{ Object.keys(hasUnsavedChanges).length }})
            </button>
            <button
              @click="recompilePhase7"
              :disabled="recompilingPhase7"
              class="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Recompile course manifest with latest basket changes"
            >
              {{ recompilingPhase7 ? '⏳ Recompiling...' : '🔄 Recompile Phase 7' }}
            </button>
            <button
              @click="previousBatch"
              :disabled="currentBatchStart <= 1"
              class="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous 10
            </button>
            <button
              @click="nextBatch"
              :disabled="currentBatchStart + 10 > availableSeeds.length"
              class="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next 10 →
            </button>
          </div>
        </div>

        <!-- Quick Jump to Batches (groups of 10) -->
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="groupStart in quickJumpGroups"
            :key="groupStart"
            @click="loadBatch(groupStart)"
            :class="[
              'px-3 py-1 rounded text-xs font-medium transition-colors',
              currentBatchStart === groupStart
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
      <div class="text-lg">Loading batch...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-900/20 border border-red-700 rounded-lg p-6 text-red-400">
      <h3 class="font-bold mb-2">Error Loading Batch</h3>
      <p>{{ error }}</p>
    </div>

    <!-- Multi-Seed Batch View -->
    <div v-else-if="loadedSeeds.length > 0" class="space-y-4">
      <div
        v-for="seedData in loadedSeeds"
        :key="seedData.seedId"
        class="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-emerald-500/50 transition-all"
      >
        <!-- Collapsed Header (Always Visible) -->
        <div
          @click="toggleSeed(seedData.seedId)"
          class="p-4 cursor-pointer hover:bg-slate-700/50 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-xl font-bold text-emerald-400">{{ seedData.seedId }}</h3>
                <span class="text-xs px-2 py-1 rounded bg-slate-700 text-slate-400">
                  {{ getLegoCount(seedData.basket) }} LEGOs
                </span>
                <span class="text-xs px-2 py-1 rounded bg-slate-700 text-slate-400">
                  {{ getTotalPhrases(seedData.basket) }} phrases
                </span>
                <span v-if="hasUnsavedChanges[seedData.seedId]" class="text-xs px-2 py-1 rounded bg-orange-600 text-white font-bold">
                  UNSAVED
                </span>
              </div>
              <div class="text-sm text-slate-300">{{ seedData.basket?.seed_pair?.known || 'Loading...' }}</div>
              <div class="text-sm text-emerald-400">{{ seedData.basket?.seed_pair?.target || '' }}</div>
            </div>
            <div class="flex items-center gap-3">
              <button
                v-if="expandedSeeds[seedData.seedId]"
                @click.stop="toggleEditMode(seedData.seedId)"
                :class="[
                  'px-3 py-1 rounded text-xs font-medium transition-colors',
                  editMode[seedData.seedId]
                    ? 'bg-orange-600 text-white hover:bg-orange-500'
                    : 'bg-blue-600 text-white hover:bg-blue-500'
                ]"
              >
                {{ editMode[seedData.seedId] ? '✓ Done Editing' : '✏️ Edit' }}
              </button>
              <button
                v-if="hasUnsavedChanges[seedData.seedId]"
                @click.stop="saveSeedChanges(seedData.seedId)"
                class="px-3 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-500 transition-colors"
              >
                💾 Save
              </button>
              <div class="text-slate-400">
                <span v-if="expandedSeeds[seedData.seedId]" class="text-2xl">▼</span>
                <span v-else class="text-2xl">▶</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Expanded Content -->
        <div v-if="expandedSeeds[seedData.seedId] && seedData.basket" class="border-t border-slate-700">
          <div class="p-6 space-y-6">
            <!-- Seed Info Card -->
            <div class="bg-slate-700/30 rounded-lg p-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-slate-400">Generation Stage:</span>
                  <span class="ml-2 text-emerald-400">{{ seedData.basket.generation_stage || 'COMPLETE' }}</span>
                </div>
                <div>
                  <span class="text-slate-400">LEGOs in Seed:</span>
                  <span class="ml-2 text-slate-300">{{ getLegoCount(seedData.basket) }}</span>
                </div>
              </div>

              <!-- Recent Seeds Context (Phase 5 v6.1) -->
              <div v-if="seedData.basket.recent_seed_pairs" class="mt-4 pt-4 border-t border-slate-600">
                <button
                  @click.stop="togglePatternDetails(seedData.seedId)"
                  class="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300"
                >
                  <span v-if="expandedPatterns[seedData.seedId]">▼</span>
                  <span v-else>▶</span>
                  <span>Sliding Window Context ({{ Object.keys(seedData.basket.recent_seed_pairs).length }} recent seeds)</span>
                </button>

                <div v-if="expandedPatterns[seedData.seedId]" class="mt-2 space-y-1 max-h-48 overflow-y-auto">
                  <div
                    v-for="(seedPair, seedId) in seedData.basket.recent_seed_pairs"
                    :key="seedId"
                    class="text-xs py-1 px-2 bg-slate-800/50 rounded"
                  >
                    <span class="text-emerald-400 font-mono">{{ seedId }}:</span>
                    <span class="text-slate-300 ml-2">{{ seedPair[0][1] }}</span>
                  </div>
                </div>
              </div>

              <!-- OLD FORMAT FALLBACK: Pattern tracking -->
              <div v-else-if="seedData.basket.cumulative_patterns" class="mt-4 pt-4 border-t border-slate-600">
                <div class="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span class="text-slate-400">Pattern:</span>
                    <span class="ml-2 text-emerald-400">{{ formatPattern(seedData.basket.pattern_introduced) || 'None' }}</span>
                  </div>
                  <div>
                    <span class="text-slate-400">Patterns:</span>
                    <span class="ml-2 text-slate-300">{{ seedData.basket.cumulative_patterns.length }}</span>
                  </div>
                  <div>
                    <span class="text-slate-400">Cumulative:</span>
                    <span class="ml-2 text-slate-300">{{ seedData.basket.cumulative_legos }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quality Metrics Card -->
            <div v-if="getQualityMetrics(seedData.basket)" class="bg-gradient-to-r from-emerald-900/30 to-blue-900/30 border border-emerald-700/50 rounded-lg p-4">
              <h3 class="text-md font-bold text-emerald-400 mb-3">📊 Quality Metrics</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="text-center">
                  <div class="text-2xl font-bold text-emerald-400">{{ getQualityMetrics(seedData.basket).conversationalCount }}</div>
                  <div class="text-xs text-slate-400 mt-1">Conversational</div>
                  <div class="text-xs text-slate-500">(5+ LEGOs)</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-blue-400">{{ getQualityMetrics(seedData.basket).conjunctionCount }}</div>
                  <div class="text-xs text-slate-400 mt-1">Conjunctions</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold" :class="getQualityMetrics(seedData.basket).conversationalPct >= 40 ? 'text-green-400' : 'text-yellow-400'">
                    {{ getQualityMetrics(seedData.basket).conversationalPct }}%
                  </div>
                  <div class="text-xs text-slate-400 mt-1">Conv. Rate</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold" :class="getQualityMetrics(seedData.basket).avgLegoCount >= 4 ? 'text-green-400' : 'text-yellow-400'">
                    {{ getQualityMetrics(seedData.basket).avgLegoCount }}
                  </div>
                  <div class="text-xs text-slate-400 mt-1">Avg LEGOs</div>
                </div>
              </div>
            </div>

            <!-- LEGOs with Practice Phrases -->
            <div
              v-for="(legoData, legoKey) in getLegoBaskets(seedData.basket)"
              :key="legoKey"
              class="bg-slate-700/30 border border-slate-600 rounded-lg p-4"
            >
              <!-- LEGO Header -->
              <div class="mb-3 pb-3 border-b border-slate-600">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="text-xs text-slate-400">{{ legoKey }}</div>
                    <div class="text-lg font-bold">
                      <span class="text-slate-300">{{ Array.isArray(legoData.lego) ? legoData.lego[0] : legoData.lego.known }}</span>
                      <span class="mx-2 text-slate-600">→</span>
                      <span class="text-emerald-400">{{ Array.isArray(legoData.lego) ? legoData.lego[1] : legoData.lego.target }}</span>
                    </div>
                  </div>
                  <div class="text-right text-xs space-y-1">
                    <div class="text-slate-400">
                      Type:
                      <span :class="getLegoType(legoData) === 'M' ? 'text-blue-400 font-bold' : 'text-emerald-400'">
                        {{ getLegoType(legoData) }}
                      </span>
                    </div>
                    <div v-if="legoData.is_final_lego" class="text-emerald-400 font-semibold">
                      ⭐ Final LEGO
                    </div>
                    <div v-if="legoData.current_seed_legos_available !== undefined" class="text-slate-400">
                      Prev: <span class="text-slate-300">{{ legoData.current_seed_legos_available.length }}</span>
                    </div>
                    <div v-else-if="legoData.available_legos !== undefined" class="text-slate-400">
                      Available: <span class="text-slate-300">{{ legoData.available_legos }}</span>
                    </div>
                  </div>
                </div>

                <!-- Molecular Components -->
                <div v-if="getLegoType(legoData) === 'M' && getLegoComponentsFromData(legoData).length > 0" class="mt-3">
                  <button
                    @click.stop="toggleMolecularLego(seedData.seedId, legoKey)"
                    class="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300"
                  >
                    <span v-if="isMolecularLegoExpanded(seedData.seedId, legoKey)">▼</span>
                    <span v-else>▶</span>
                    <span>Components ({{ getLegoComponentsFromData(legoData).length }})</span>
                  </button>

                  <div v-if="isMolecularLegoExpanded(seedData.seedId, legoKey)" class="mt-2 ml-4 space-y-1">
                    <div
                      v-for="(component, idx) in getLegoComponentsFromData(legoData)"
                      :key="idx"
                      class="flex items-center gap-2 py-1 px-2 bg-slate-800/50 rounded text-xs"
                    >
                      <span class="text-blue-300">{{ idx + 1 }}.</span>
                      <span class="text-slate-200">{{ Array.isArray(component) ? component[0] : component.known }}</span>
                      <span class="text-slate-600">→</span>
                      <span class="text-emerald-400">{{ Array.isArray(component) ? component[1] : component.target }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Practice Phrases -->
              <div class="space-y-2">
                <div
                  v-for="(phrase, idx) in legoData.practice_phrases"
                  :key="idx"
                  v-show="!isDeleted(seedData.seedId, legoKey, idx)"
                  :class="[
                    'p-2 rounded text-sm transition-all',
                    getPhraseLegoCount(phrase) >= 5 ? 'bg-emerald-900/20 border border-emerald-700/30' : 'bg-slate-800/50',
                    isFlagged(seedData.seedId, legoKey, idx) ? 'border-2 border-red-500' : '',
                    editMode[seedData.seedId] ? 'hover:bg-slate-700/50' : ''
                  ]"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1">
                      <!-- Editing Mode -->
                      <div v-if="editMode[seedData.seedId] && isEditing(seedData.seedId, legoKey, idx)">
                        <input
                          v-model="getEditedPhrase(seedData.seedId, legoKey, idx).known"
                          @blur="savePhrase(seedData.seedId, legoKey, idx)"
                          @keyup.enter="savePhrase(seedData.seedId, legoKey, idx)"
                          class="w-full px-2 py-1 mb-2 bg-slate-700 text-slate-200 border border-slate-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="English"
                        />
                        <input
                          v-model="getEditedPhrase(seedData.seedId, legoKey, idx).target"
                          @blur="savePhrase(seedData.seedId, legoKey, idx)"
                          @keyup.enter="savePhrase(seedData.seedId, legoKey, idx)"
                          class="w-full px-2 py-1 bg-slate-700 text-emerald-400 border border-slate-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Spanish"
                        />
                      </div>
                      <!-- Display Mode -->
                      <div v-else @click="editMode[seedData.seedId] && startEditing(seedData.seedId, legoKey, idx, phrase)" :class="editMode[seedData.seedId] ? 'cursor-pointer' : ''">
                        <div class="text-slate-300">
                          <span class="text-slate-500 text-xs mr-2">{{ idx + 1 }}.</span>
                          {{ getDisplayPhrase(seedData.seedId, legoKey, idx, phrase, 0) }}
                        </div>
                        <div class="text-emerald-400 mt-1">
                          {{ getDisplayPhrase(seedData.seedId, legoKey, idx, phrase, 1) }}
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <!-- Edit Mode Actions -->
                      <button
                        v-if="editMode[seedData.seedId]"
                        @click="toggleFlag(seedData.seedId, legoKey, idx)"
                        :class="[
                          'text-sm hover:scale-110 transition-transform',
                          isFlagged(seedData.seedId, legoKey, idx) ? 'text-red-500' : 'text-slate-600'
                        ]"
                        :title="isFlagged(seedData.seedId, legoKey, idx) ? 'Unflag' : 'Flag for review'"
                      >
                        🚩
                      </button>
                      <button
                        v-if="editMode[seedData.seedId]"
                        @click="deletePhrase(seedData.seedId, legoKey, idx)"
                        class="text-sm text-red-400 hover:text-red-300 hover:scale-110 transition-all"
                        title="Delete phrase"
                      >
                        🗑️
                      </button>
                      <!-- Quality Indicators -->
                      <span v-if="getPhraseLegoCount(phrase) >= 5" class="text-emerald-500 text-xs" title="Conversational">💬</span>
                      <span v-if="hasConjunction(getPhraseTarget(phrase))" class="text-blue-400 text-xs" title="Conjunction">⚡</span>
                      <span
                        :class="[
                          'px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap',
                          getPhraseLegoCount(phrase) <= 2 ? 'bg-green-900/40 text-green-300' :
                          getPhraseLegoCount(phrase) <= 4 ? 'bg-yellow-900/40 text-yellow-300' :
                          'bg-emerald-900/60 text-emerald-300'
                        ]"
                      >
                        {{ getPhraseLegoCount(phrase) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Phrase Distribution (Phase 5 v6.1) -->
              <div v-if="legoData.phrase_distribution" class="mt-3 pt-3 border-t border-slate-600">
                <div class="text-xs text-slate-400 mb-2 uppercase font-semibold">Phrase Distribution:</div>
                <div class="grid grid-cols-4 gap-2">
                  <div class="bg-green-900/40 px-2 py-1 rounded text-center">
                    <div class="text-green-300 font-bold">{{ legoData.phrase_distribution.really_short_1_2 }}</div>
                    <div class="text-green-400/70 text-xs">1-2 LEGOs</div>
                  </div>
                  <div class="bg-yellow-900/40 px-2 py-1 rounded text-center">
                    <div class="text-yellow-300 font-bold">{{ legoData.phrase_distribution.quite_short_3 }}</div>
                    <div class="text-yellow-400/70 text-xs">3 LEGOs</div>
                  </div>
                  <div class="bg-blue-900/40 px-2 py-1 rounded text-center">
                    <div class="text-blue-300 font-bold">{{ legoData.phrase_distribution.longer_4_5 }}</div>
                    <div class="text-blue-400/70 text-xs">4-5 LEGOs</div>
                  </div>
                  <div class="bg-emerald-900/60 px-2 py-1 rounded text-center">
                    <div class="text-emerald-300 font-bold">{{ legoData.phrase_distribution.long_6_plus }}</div>
                    <div class="text-emerald-400/70 text-xs">6+ LEGOs</div>
                  </div>
                </div>
              </div>

              <!-- Summary -->
              <div class="mt-3 pt-3 border-t border-slate-600 text-xs text-slate-400">
                <span class="mr-3">{{ legoData.practice_phrases.length }} phrases</span>
                <span class="mr-3">Min: <span class="text-green-300">{{ Math.min(...legoData.practice_phrases.map(p => getPhraseLegoCount(p))) }}</span></span>
                <span>Max: <span class="text-orange-300">{{ Math.max(...legoData.practice_phrases.map(p => getPhraseLegoCount(p))) }}</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12 text-slate-400">
      <div class="text-lg">Select a batch to view seeds</div>
    </div>
  </div>
</template>

<script>
import api from '@/services/api'
import { isMolecularLego, getLegoComponents } from '@/services/legoFormatAdapter'

export default {
  name: 'LegoBasketViewer',
  props: {
    courseCode: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      loading: false,
      error: null,
      availableCourses: [],
      selectedCourseCode: '',
      currentCourse: null,
      courseData: null,
      currentBatchStart: 1,
      loadedSeeds: [],
      expandedSeeds: {},
      expandedMolecularLegos: {},
      expandedPatterns: {},
      editMode: {}, // Track which seeds are in edit mode {seedId: true/false}
      editingPhrases: {}, // Track which phrases are being edited {seedId_legoKey_idx: true}
      editedPhrases: {}, // Track edited phrase text {seedId_legoKey_idx: {known: '', target: ''}}
      flaggedPhrases: {}, // Track flagged phrases {seedId_legoKey_idx: true}
      deletedPhrases: {}, // Track deleted phrases {seedId_legoKey_idx: true}
      hasUnsavedChanges: {}, // Track which seeds have unsaved changes {seedId: true}
      recompilingPhase7: false // Track if Phase 7 recompilation is in progress
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
    quickJumpGroups() {
      if (this.availableSeeds.length === 0) return []
      const groups = []
      for (let i = 1; i <= this.availableSeeds.length; i += 10) {
        groups.push(i)
      }
      return groups
    },
    allExpanded() {
      return this.loadedSeeds.every(seed => this.expandedSeeds[seed.seedId])
    }
  },
  async mounted() {
    // If courseCode prop is provided, use it directly
    if (this.courseCode) {
      this.selectedCourseCode = this.courseCode
      await this.loadCourses()
      await this.onCourseChange()
    } else {
      // Otherwise load courses for selector
      await this.loadCourses()
    }
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
        this.loadedSeeds = []
        return
      }

      try {
        this.currentCourse = this.availableCourses.find(
          c => c.course_code === this.selectedCourseCode
        )

        this.courseData = await api.course.get(this.selectedCourseCode)
        this.loadedSeeds = []

        // Auto-load first batch
        if (this.availableSeeds.length > 0) {
          await this.loadBatch(1)
        }
      } catch (err) {
        console.error('Error loading course:', err)
        this.error = `Failed to load course: ${err.message}`
      }
    },
    async loadBatch(startSeedNum) {
      if (!this.selectedCourseCode) {
        this.error = 'Please select a course first'
        return
      }

      this.loading = true
      this.error = null
      this.currentBatchStart = startSeedNum
      this.loadedSeeds = []
      this.expandedSeeds = {}
      this.expandedMolecularLegos = {}
      this.expandedPatterns = {}

      try {
        // Load 10 seeds starting from startSeedNum
        const endSeedNum = Math.min(startSeedNum + 9, this.availableSeeds.length)
        const promises = []

        for (let i = startSeedNum; i <= endSeedNum; i++) {
          const seedId = `S${String(i).padStart(4, '0')}`
          promises.push(
            api.course.getBasket(this.selectedCourseCode, seedId)
              .then(response => ({
                seedId,
                basket: response.basket || response
              }))
              .catch(err => ({
                seedId,
                basket: null,
                error: err.message
              }))
          )
        }

        this.loadedSeeds = await Promise.all(promises)
        console.log('[BasketViewer] Loaded seeds:', this.loadedSeeds.map(s => ({
          seedId: s.seedId,
          hasBasket: !!s.basket,
          legoCount: this.getLegoCount(s.basket),
          phraseCount: this.getTotalPhrases(s.basket)
        })))
      } catch (err) {
        this.error = `Failed to load batch: ${err.message}`
      } finally {
        this.loading = false
      }
    },
    nextBatch() {
      const nextStart = this.currentBatchStart + 10
      if (nextStart <= this.availableSeeds.length) {
        this.loadBatch(nextStart)
      }
    },
    previousBatch() {
      const prevStart = this.currentBatchStart - 10
      if (prevStart >= 1) {
        this.loadBatch(prevStart)
      }
    },
    toggleSeed(seedId) {
      this.expandedSeeds[seedId] = !this.expandedSeeds[seedId]
      this.$forceUpdate()
    },
    toggleExpandAll() {
      const allExpanded = this.loadedSeeds.every(seed => this.expandedSeeds[seed.seedId])

      if (allExpanded) {
        // Collapse all
        this.expandedSeeds = {}
      } else {
        // Expand all
        this.loadedSeeds.forEach(seed => {
          this.expandedSeeds[seed.seedId] = true
        })
      }
      this.$forceUpdate()
    },
    togglePatternDetails(seedId) {
      this.expandedPatterns[seedId] = !this.expandedPatterns[seedId]
      this.$forceUpdate()
    },
    toggleMolecularLego(seedId, legoKey) {
      const key = `${seedId}_${legoKey}`
      this.expandedMolecularLegos[key] = !this.expandedMolecularLegos[key]
      this.$forceUpdate()
    },
    isMolecularLegoExpanded(seedId, legoKey) {
      const key = `${seedId}_${legoKey}`
      return this.expandedMolecularLegos[key] || false
    },
    getLegoBaskets(basket) {
      if (!basket) {
        console.log('[BasketViewer] getLegoBaskets: basket is null/undefined')
        return {}
      }

      // v6.2+ format: LEGOs nested under 'legos' property
      if (basket.legos && typeof basket.legos === 'object') {
        console.log('[BasketViewer] getLegoBaskets: Using v6.2+ format, found', Object.keys(basket.legos).length, 'baskets')
        return basket.legos
      }

      // Legacy format: LEGOs at root level
      const baskets = {}
      for (const key in basket) {
        if (key.startsWith('S') && key.includes('L')) {
          baskets[key] = basket[key]
        }
      }
      console.log('[BasketViewer] getLegoBaskets: Using legacy format, found', Object.keys(baskets).length, 'baskets')
      return baskets
    },
    getLegoCount(basket) {
      return Object.keys(this.getLegoBaskets(basket)).length
    },
    getTotalPhrases(basket) {
      if (!basket) return 0
      const legoBaskets = this.getLegoBaskets(basket)
      let total = 0
      for (const key in legoBaskets) {
        total += legoBaskets[key].practice_phrases?.length || 0
      }
      return total
    },
    getQualityMetrics(basket) {
      if (!basket) return null
      const legoBaskets = this.getLegoBaskets(basket)
      if (Object.keys(legoBaskets).length === 0) return null

      let totalPhrases = 0
      let conversationalCount = 0
      let conjunctionCount = 0
      let totalLegos = 0

      for (const legoKey in legoBaskets) {
        const phrases = legoBaskets[legoKey].practice_phrases || []
        totalPhrases += phrases.length

        phrases.forEach(phrase => {
          const legoCount = this.getPhraseLegoCount(phrase)
          totalLegos += legoCount

          if (legoCount >= 5) conversationalCount++
          if (this.hasConjunction(this.getPhraseTarget(phrase))) conjunctionCount++
        })
      }

      if (totalPhrases === 0) return null

      return {
        conversationalCount,
        conversationalPct: Math.round((conversationalCount / totalPhrases) * 100),
        conjunctionCount,
        conjunctionPct: Math.round((conjunctionCount / totalPhrases) * 100),
        avgLegoCount: (totalLegos / totalPhrases).toFixed(1),
        totalPhrases
      }
    },
    // Editing methods
    toggleEditMode(seedId) {
      this.editMode[seedId] = !this.editMode[seedId]
      this.$forceUpdate()
    },
    getPhraseKey(seedId, legoKey, idx) {
      return `${seedId}_${legoKey}_${idx}`
    },
    isEditing(seedId, legoKey, idx) {
      const key = this.getPhraseKey(seedId, legoKey, idx)
      return this.editingPhrases[key] || false
    },
    isDeleted(seedId, legoKey, idx) {
      const key = this.getPhraseKey(seedId, legoKey, idx)
      return this.deletedPhrases[key] || false
    },
    isFlagged(seedId, legoKey, idx) {
      const key = this.getPhraseKey(seedId, legoKey, idx)
      return this.flaggedPhrases[key] || false
    },
    startEditing(seedId, legoKey, idx, phrase) {
      const key = this.getPhraseKey(seedId, legoKey, idx)
      this.editingPhrases[key] = true

      // Initialize edited phrase if not already set
      if (!this.editedPhrases[key]) {
        this.editedPhrases[key] = {
          known: phrase.known || phrase[0],
          target: phrase.target || phrase[1]
        }
      }
      this.$forceUpdate()
    },
    getPhraseLegoCount(phrase) {
      // Handle both old format [known, target, ?, count] and new format {known, target, lego_count}
      if (phrase.lego_count !== undefined) return phrase.lego_count
      if (phrase[3] !== undefined) return phrase[3]

      // Fallback: Try to estimate from phrase complexity
      // This is a rough estimate - count spaces + 1, capped at reasonable values
      const knownPhrase = phrase.known || phrase[0] || ''
      const wordCount = knownPhrase.trim().split(/\s+/).length
      return Math.min(wordCount, 8) // Cap at 8 to avoid unrealistic counts
    },
    getPhraseTarget(phrase) {
      // Handle both old format [known, target] and new format {known, target}
      return phrase.target || phrase[1] || ''
    },
    getPhraseKnown(phrase) {
      // Handle both old format [known, target] and new format {known, target}
      return phrase.known || phrase[0] || ''
    },
    savePhrase(seedId, legoKey, idx) {
      const key = this.getPhraseKey(seedId, legoKey, idx)
      this.editingPhrases[key] = false
      this.hasUnsavedChanges[seedId] = true
      this.$forceUpdate()
    },
    getEditedPhrase(seedId, legoKey, idx) {
      const key = this.getPhraseKey(seedId, legoKey, idx)
      return this.editedPhrases[key] || { known: '', target: '' }
    },
    getDisplayPhrase(seedId, legoKey, idx, phrase, langIdx) {
      const key = this.getPhraseKey(seedId, legoKey, idx)
      if (this.editedPhrases[key]) {
        return langIdx === 0 ? this.editedPhrases[key].known : this.editedPhrases[key].target
      }
      // Handle both old format [known, target] and new format {known, target}
      if (langIdx === 0) {
        return phrase.known || phrase[0] || ''
      } else {
        return phrase.target || phrase[1] || ''
      }
    },
    toggleFlag(seedId, legoKey, idx) {
      const key = this.getPhraseKey(seedId, legoKey, idx)
      this.flaggedPhrases[key] = !this.flaggedPhrases[key]
      this.hasUnsavedChanges[seedId] = true
      this.$forceUpdate()
    },
    deletePhrase(seedId, legoKey, idx) {
      const key = this.getPhraseKey(seedId, legoKey, idx)
      this.deletedPhrases[key] = true
      this.hasUnsavedChanges[seedId] = true
      this.$forceUpdate()
    },
    async saveSeedChanges(seedId) {
      try {
        // Find the seed data
        const seedData = this.loadedSeeds.find(s => s.seedId === seedId)
        if (!seedData || !seedData.basket) {
          throw new Error('Seed data not found')
        }

        // Apply all edits to basket
        const updatedBasket = JSON.parse(JSON.stringify(seedData.basket))
        const legoBaskets = this.getLegoBaskets(updatedBasket)

        for (const legoKey in legoBaskets) {
          const legoData = legoBaskets[legoKey]
          if (!legoData.practice_phrases) continue

          const phrases = legoData.practice_phrases
          const newPhrases = []

          for (let idx = 0; idx < phrases.length; idx++) {
            const key = this.getPhraseKey(seedId, legoKey, idx)

            // Skip deleted phrases
            if (this.deletedPhrases[key]) continue

            // Apply edited text
            if (this.editedPhrases[key]) {
              // Handle both old format [known, target, ...] and new format {known, target, ...}
              if (Array.isArray(phrases[idx])) {
                phrases[idx][0] = this.editedPhrases[key].known
                phrases[idx][1] = this.editedPhrases[key].target
              } else {
                phrases[idx].known = this.editedPhrases[key].known
                phrases[idx].target = this.editedPhrases[key].target
              }
            }

            newPhrases.push(phrases[idx])
          }

          // Update the practice_phrases in the correct location
          legoData.practice_phrases = newPhrases
        }

        // Save to API
        const response = await api.course.saveBasket(this.selectedCourseCode, seedId, updatedBasket)

        // Update local data
        seedData.basket = updatedBasket

        // Clear change tracking for this seed
        delete this.hasUnsavedChanges[seedId]

        // Clear edit states for this seed
        Object.keys(this.editedPhrases).forEach(key => {
          if (key.startsWith(seedId)) delete this.editedPhrases[key]
        })
        Object.keys(this.deletedPhrases).forEach(key => {
          if (key.startsWith(seedId)) delete this.deletedPhrases[key]
        })
        Object.keys(this.flaggedPhrases).forEach(key => {
          if (key.startsWith(seedId)) delete this.flaggedPhrases[key]
        })

        this.$forceUpdate()
        console.log('✓ Saved changes for', seedId)

      } catch (err) {
        console.error('Failed to save changes:', err)
        this.error = `Failed to save changes: ${err.message}`
      }
    },
    async saveAllChanges() {
      for (const seedId of Object.keys(this.hasUnsavedChanges)) {
        await this.saveSeedChanges(seedId)
      }
    },
    async recompilePhase7() {
      if (!this.selectedCourseCode) {
        alert('No course selected')
        return
      }

      if (!confirm('Recompile Phase 7 (Course Manifest) with the latest basket changes?\n\nThis will update the course_manifest.json file.')) {
        return
      }

      this.recompilingPhase7 = true

      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'}/api/courses/${this.selectedCourseCode}/regenerate/phase7`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          }
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to trigger Phase 7 recompilation')
        }

        alert(`✅ Phase 7 recompilation started!\n\nJob ID: ${data.jobId || 'N/A'}\n\nThe course_manifest.json will be updated when complete.\n\nCheck the Progress monitor for status.`)

        // Emit event to parent to show progress monitor
        this.$emit('phase7-started', data)

      } catch (err) {
        console.error('Failed to trigger Phase 7 recompilation:', err)
        alert(`❌ Failed to trigger Phase 7 recompilation:\n\n${err.message}`)
      } finally {
        this.recompilingPhase7 = false
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
