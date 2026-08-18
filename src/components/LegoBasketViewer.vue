<template>
  <div class="lego-basket-viewer">
    <!-- Header -->
    <div v-if="!courseCode" class="bg-surface border border-line rounded-lg p-6 mb-6">
      <!-- Back to Dashboard -->
      <router-link
        to="/"
        class="inline-flex items-center gap-2 text-muted hover:text-accent-2 transition-colors mb-4"
      >
        <span class="text-xl">←</span>
        <span class="text-sm">Back to Dashboard</span>
      </router-link>

      <h2 class="text-2xl font-bold text-accent-2 mb-4">LEGO Practice Basket Viewer</h2>

      <!-- Course Selector -->
      <div class="mb-4">
        <label class="text-sm font-medium text-ink mb-2 block">Select Course:</label>
        <select
          v-model="selectedCourseCode"
          @change="onCourseChange"
          class="w-full px-4 py-2 bg-surface-2 text-ink border border-line rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">-- Select a course --</option>
          <option
            v-for="course in availableCourses"
            :key="course.course_code"
            :value="course.course_code"
          >
            {{ getLanguageName(course.target_language) }} for {{ getLanguageName(course.source_language) }} ({{ course.course_code }})
          </option>
        </select>
      </div>

      <!-- Course Context Header -->
      <div v-if="currentCourse" class="mb-4 pb-4 border-b border-line">
        <h2 class="text-xl font-semibold text-ink">
          {{ getLanguageName(currentCourse.target_language) }} for {{ getLanguageName(currentCourse.source_language) }}
          <span class="text-faint text-sm ml-2">({{ currentCourse.course_code }})</span>
        </h2>
      </div>

    </div>

    <!-- Batch Navigation (Always visible when course is loaded) -->
    <div v-if="selectedCourseCode" class="bg-surface border border-line rounded-lg p-6 mb-6">
      <div class="mb-4 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <label class="text-sm font-medium text-ink">Viewing Batch:</label>
            <span class="ml-2 text-accent-2 font-bold">
              Seeds {{ currentBatchStart }}-{{ Math.min(currentBatchStart + 9, availableSeeds.length) }}
            </span>
            <span class="ml-2 text-faint text-sm">
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
              @click="recompileManifest"
              :disabled="recompilingManifest"
              class="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Recompile course manifest with latest basket changes"
            >
              {{ recompilingManifest ? '⏳ Recompiling...' : '🔄 Recompile Manifest' }}
            </button>
            <button
              @click="previousBatch"
              :disabled="currentBatchStart <= 1"
              class="px-3 py-2 bg-surface-2 hover:bg-surface-3 text-ink rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous 10
            </button>
            <button
              @click="nextBatch"
              :disabled="currentBatchStart + 10 > availableSeeds.length"
              class="px-3 py-2 bg-surface-2 hover:bg-surface-3 text-ink rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                : 'bg-surface-2 text-muted hover:bg-surface-3'
            ]"
          >
            {{ groupStart }}-{{ Math.min(groupStart + 9, availableSeeds.length) }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12 text-muted">
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
        class="bg-surface border border-line rounded-lg overflow-hidden hover:border-emerald-500/50 transition-all"
      >
        <!-- Collapsed Header (Always Visible) -->
        <div
          @click="toggleSeed(seedData.seedId)"
          class="p-4 cursor-pointer hover:bg-surface-2/50 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-xl font-bold text-accent-2">{{ seedData.seedId }}</h3>
                <span class="text-xs px-2 py-1 rounded bg-surface-2 text-muted">
                  {{ getLegoCount(seedData.basket) }} LEGOs
                </span>
                <span class="text-xs px-2 py-1 rounded bg-surface-2 text-muted">
                  {{ getTotalPhrases(seedData.basket) }} phrases
                </span>
                <span v-if="hasUnsavedChanges[seedData.seedId]" class="text-xs px-2 py-1 rounded bg-orange-600 text-white font-bold">
                  UNSAVED
                </span>
              </div>
              <div class="text-sm text-ink">{{ seedData.basket?.seed_pair?.known || 'Loading...' }}</div>
              <div class="text-sm text-accent-2">{{ seedData.basket?.seed_pair?.target || '' }}</div>
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
              <div class="text-muted">
                <span v-if="expandedSeeds[seedData.seedId]" class="text-2xl">▼</span>
                <span v-else class="text-2xl">▶</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Expanded Content -->
        <div v-if="expandedSeeds[seedData.seedId] && seedData.basket" class="border-t border-line">
          <div class="p-6 space-y-6">
            <!-- Seed Info Card -->
            <div class="bg-surface-2/30 rounded-lg p-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-muted">Generation Stage:</span>
                  <span class="ml-2 text-accent-2">{{ seedData.basket.generation_stage || 'COMPLETE' }}</span>
                </div>
                <div>
                  <span class="text-muted">LEGOs in Seed:</span>
                  <span class="ml-2 text-ink">{{ getLegoCount(seedData.basket) }}</span>
                </div>
              </div>

              <!-- Recent Seeds Context (Phase 5 v6.1) -->
              <div v-if="seedData.basket.recent_seed_pairs" class="mt-4 pt-4 border-t border-line">
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
                    class="text-xs py-1 px-2 bg-surface/50 rounded"
                  >
                    <span class="text-accent-2 font-mono">{{ seedId }}:</span>
                    <span class="text-ink ml-2">{{ seedPair[0][1] }}</span>
                  </div>
                </div>
              </div>

              <!-- OLD FORMAT FALLBACK: Pattern tracking -->
              <div v-else-if="seedData.basket.cumulative_patterns" class="mt-4 pt-4 border-t border-line">
                <div class="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span class="text-muted">Pattern:</span>
                    <span class="ml-2 text-accent-2">{{ formatPattern(seedData.basket.pattern_introduced) || 'None' }}</span>
                  </div>
                  <div>
                    <span class="text-muted">Patterns:</span>
                    <span class="ml-2 text-ink">{{ seedData.basket.cumulative_patterns.length }}</span>
                  </div>
                  <div>
                    <span class="text-muted">Cumulative:</span>
                    <span class="ml-2 text-ink">{{ seedData.basket.cumulative_legos }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quality Metrics Card -->
            <div v-if="getQualityMetrics(seedData.basket)" class="bg-gradient-to-r from-emerald-900/30 to-blue-900/30 border border-emerald-700/50 rounded-lg p-4">
              <h3 class="text-md font-bold text-accent-2 mb-3">📊 Quality Metrics</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="text-center">
                  <div class="text-2xl font-bold text-accent-2">{{ getQualityMetrics(seedData.basket).conversationalCount }}</div>
                  <div class="text-xs text-muted mt-1">Conversational</div>
                  <div class="text-xs text-faint">(5+ LEGOs)</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-blue-400">{{ getQualityMetrics(seedData.basket).conjunctionCount }}</div>
                  <div class="text-xs text-muted mt-1">Conjunctions</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold" :class="getQualityMetrics(seedData.basket).conversationalPct >= 40 ? 'text-green-400' : 'text-yellow-400'">
                    {{ getQualityMetrics(seedData.basket).conversationalPct }}%
                  </div>
                  <div class="text-xs text-muted mt-1">Conv. Rate</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold" :class="getQualityMetrics(seedData.basket).avgLegoCount >= 4 ? 'text-green-400' : 'text-yellow-400'">
                    {{ getQualityMetrics(seedData.basket).avgLegoCount }}
                  </div>
                  <div class="text-xs text-muted mt-1">Avg LEGOs</div>
                </div>
              </div>
            </div>

            <!-- LEGOs with Practice Phrases -->
            <div
              v-for="(legoData, legoKey) in getLegoBaskets(seedData.basket)"
              :key="legoKey"
              class="bg-surface-2/30 border border-line rounded-lg p-4"
            >
              <!-- LEGO Header -->
              <div class="mb-3 pb-3 border-b border-line">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="text-xs text-muted">{{ legoKey }}</div>
                    <div class="text-lg font-bold">
                      <span class="text-ink">{{ Array.isArray(legoData.lego) ? legoData.lego[0] : legoData.lego.known }}</span>
                      <span class="mx-2 text-faint">→</span>
                      <span class="text-accent-2 bidi-isolate" :dir="dirFor(Array.isArray(legoData.lego) ? legoData.lego[1] : legoData.lego.target)">{{ Array.isArray(legoData.lego) ? legoData.lego[1] : legoData.lego.target }}</span>
                    </div>
                  </div>
                  <div class="text-right text-xs space-y-1">
                    <div class="text-muted">
                      Type:
                      <span :class="getLegoType(legoData) === 'M' ? 'text-blue-400 font-bold' : 'text-accent-2'">
                        {{ getLegoType(legoData) }}
                      </span>
                    </div>
                    <div v-if="legoData.is_final_lego" class="text-accent-2 font-semibold">
                      ⭐ Final LEGO
                    </div>
                    <div v-if="legoData.current_seed_legos_available !== undefined" class="text-muted">
                      Prev: <span class="text-ink">{{ legoData.current_seed_legos_available.length }}</span>
                    </div>
                    <div v-else-if="legoData.available_legos !== undefined" class="text-muted">
                      Available: <span class="text-ink">{{ legoData.available_legos }}</span>
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
                      class="flex items-center gap-2 py-1 px-2 bg-surface/50 rounded text-xs"
                    >
                      <span class="text-blue-300">{{ idx + 1 }}.</span>
                      <span class="text-ink">{{ Array.isArray(component) ? component[0] : component.known }}</span>
                      <span class="text-faint">→</span>
                      <span class="text-accent-2 bidi-isolate" :dir="dirFor(Array.isArray(component) ? component[1] : component.target)">{{ Array.isArray(component) ? component[1] : component.target }}</span>
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
                    getPhraseLegoCount(phrase) >= 5 ? 'bg-emerald-900/20 border border-emerald-700/30' : 'bg-surface/50',
                    editMode[seedData.seedId] ? 'hover:bg-surface-2/50' : ''
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
                          class="w-full px-2 py-1 mb-2 bg-surface-2 text-ink border border-line rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="English"
                        />
                        <input
                          v-model="getEditedPhrase(seedData.seedId, legoKey, idx).target"
                          :dir="dirFor(getEditedPhrase(seedData.seedId, legoKey, idx).target)"
                          @blur="savePhrase(seedData.seedId, legoKey, idx)"
                          @keyup.enter="savePhrase(seedData.seedId, legoKey, idx)"
                          class="w-full px-2 py-1 bg-surface-2 text-accent-2 border border-line rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Spanish"
                        />
                      </div>
                      <!-- Display Mode -->
                      <div v-else @click="editMode[seedData.seedId] && startEditing(seedData.seedId, legoKey, idx, phrase)" :class="editMode[seedData.seedId] ? 'cursor-pointer' : ''">
                        <div class="text-ink">
                          <span class="text-faint text-xs mr-2">{{ idx + 1 }}.</span>
                          {{ getDisplayPhrase(seedData.seedId, legoKey, idx, phrase, 0) }}
                        </div>
                        <div
                          class="text-accent-2 mt-1 text-left"
                          :dir="dirFor(getDisplayPhrase(seedData.seedId, legoKey, idx, phrase, 1))"
                        >
                          {{ getDisplayPhrase(seedData.seedId, legoKey, idx, phrase, 1) }}
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <!-- Audio preview button -->
                      <button
                        @click.stop="openAudioPreview(phrase)"
                        class="text-sm text-blue-400 hover:text-blue-300 hover:scale-110 transition-all opacity-60 hover:opacity-100"
                        title="Preview audio cycle"
                      >
                        ▶
                      </button>
                      <!-- Delete button in edit mode -->
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
              <div v-if="legoData.phrase_distribution" class="mt-3 pt-3 border-t border-line">
                <div class="text-xs text-muted mb-2 uppercase font-semibold">Phrase Distribution:</div>
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
                    <div class="text-accent-2/70 text-xs">6+ LEGOs</div>
                  </div>
                </div>
              </div>

              <!-- Summary -->
              <div class="mt-3 pt-3 border-t border-line text-xs text-muted">
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
    <div v-else class="text-center py-12 text-muted">
      <div class="text-lg">Select a batch to view seeds</div>
    </div>

    <!-- Audio Preview Modal -->
    <teleport to="body">
      <div v-if="showAudioPreview" class="audio-preview-modal-overlay" @click.self="closeAudioPreview">
        <div class="audio-preview-modal">
          <div class="modal-header">
            <h3 class="text-lg font-bold text-accent-2">Audio Preview</h3>
            <button @click="closeAudioPreview" class="text-muted hover:text-ink text-xl">✕</button>
          </div>
          <div class="modal-content">
            <AudioPreviewPlayer
              v-if="previewPhrase"
              :known-text="previewPhrase.known"
              :target-text="previewPhrase.target"
              :course-code="selectedCourseCode"
              @close="closeAudioPreview"
              @cycle-complete="closeAudioPreview"
            />
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script>
import api, { getApiUrl } from '@/services/api'
import { isMolecularLego, getLegoComponents } from '@/services/legoFormatAdapter'
import { useToast } from 'vue-toastification'
import { languageName } from '@/utils/languageNames'
import { dirFor } from '@/utils/textDirection.js'
import AudioPreviewPlayer from './AudioPreviewPlayer.vue'

const toast = useToast()

export default {
  name: 'LegoBasketViewer',
  components: {
    AudioPreviewPlayer
  },
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
      deletedPhrases: {}, // Track deleted phrases {seedId_legoKey_idx: true}
      hasUnsavedChanges: {}, // Track which seeds have unsaved changes {seedId: true}
      recompilingManifest: false, // Track if Manifest recompilation is in progress
      // Audio preview
      showAudioPreview: false,
      previewPhrase: null
    }
  },
  computed: {
    availableSeeds() {
      // Get available seeds from the loaded course data
      if (!this.courseData || !this.courseData.translations) {
        return []
      }

      // Extract seed numbers - prefer direct seed_number (database), fallback to parsing seed_id (S3)
      const seedNumbers = this.courseData.translations.map(t => {
        if (typeof t.seed_number === 'number') {
          return t.seed_number
        }
        // Fallback: parse from seed_id (S3 format)
        const match = t.seed_id?.match(/s(\d+)/i)
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
    // Direction of a target string, read from its script. Exposed as a method
    // because this component is Options API — see src/utils/textDirection.js.
    dirFor,

    getLanguageName(code) {
      return languageName(code)
    },
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
        return {}
      }

      // v6.2+ format: LEGOs nested under 'legos' property
      if (basket.legos && typeof basket.legos === 'object') {
        return basket.legos
      }

      // Legacy format: LEGOs at root level
      const baskets = {}
      for (const key in basket) {
        if (key.startsWith('S') && key.includes('L')) {
          baskets[key] = basket[key]
        }
      }
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

        this.$forceUpdate()

        // Show GitHub commit confirmation
        if (response && response.github && response.github.sha) {
          const shortSha = response.github.sha.substring(0, 7)
          toast.success(`✅ Saved to GitHub! Commit: ${shortSha}`, {
            timeout: 4000
          })
        } else {
          // This shouldn't happen - all saves go to GitHub
          toast.warning(`⚠️ Saved but GitHub commit unconfirmed`, {
            timeout: 4000
          })
        }

      } catch (err) {
        console.error('Failed to save changes:', err)
        this.error = `Failed to save changes: ${err.message}`
        toast.error(`❌ Save failed: ${err.message}`, {
          timeout: 5000
        })
      }
    },
    async saveAllChanges() {
      for (const seedId of Object.keys(this.hasUnsavedChanges)) {
        await this.saveSeedChanges(seedId)
      }
    },
    async recompileManifest() {
      if (!this.selectedCourseCode) {
        alert('No course selected')
        return
      }

      if (!confirm('Recompile the Course Manifest with the latest basket changes?\n\nThis will update the course_manifest.json file.')) {
        return
      }

      this.recompilingManifest = true

      try {
        const response = await fetch(`${getApiUrl()}/api/courses/${this.selectedCourseCode}/regenerate/manifest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          }
        })

        if (!response.ok) throw new Error((await response.clone().json().catch(() => ({}))).error || `HTTP ${response.status}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to trigger Manifest recompilation')
        }

        alert(`✅ Manifest recompilation started!\n\nJob ID: ${data.jobId || 'N/A'}\n\nThe course_manifest.json will be updated when complete.\n\nCheck the Progress monitor for status.`)

        // Emit event to parent to show progress monitor
        this.$emit('manifest-started', data)

      } catch (err) {
        console.error('Failed to trigger Manifest recompilation:', err)
        alert(`❌ Failed to trigger Manifest recompilation:\n\n${err.message}`)
      } finally {
        this.recompilingManifest = false
      }
    },
    // Audio preview methods
    openAudioPreview(phrase) {
      this.previewPhrase = {
        known: phrase.known || phrase[0],
        target: phrase.target || phrase[1]
      }
      this.showAudioPreview = true
    },
    closeAudioPreview() {
      this.showAudioPreview = false
      this.previewPhrase = null
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

/* Audio Preview Modal */
.audio-preview-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.audio-preview-modal {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  width: min(90vw, 440px);
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
}

.modal-content {
  padding: 0;
}

/*
 * LIGHT-MODE CONTRAST OVERRIDES (dark mode untouched).
 * This component hardcodes many dark-tuned Tailwind color utilities
 * (blue-400/300, green/yellow/orange-300, red-400, and bg-*-900/* pills)
 * that fall below WCAG AA on the light canvas/surface. These rules only
 * apply under [data-theme="light"], so dark mode keeps its exact colors.
 */
[data-theme="light"] .lego-basket-viewer .text-blue-400,
[data-theme="light"] .lego-basket-viewer .text-blue-300,
[data-theme="light"] .lego-basket-viewer .hover\:text-blue-300:hover {
  color: #1d4ed8; /* blue-700: ~5.5:1 on #fff */
}
[data-theme="light"] .lego-basket-viewer .text-green-400,
[data-theme="light"] .lego-basket-viewer .text-green-300 {
  color: #047857; /* emerald-700: ~5.5:1 on #fff */
}
[data-theme="light"] .lego-basket-viewer .text-yellow-400,
[data-theme="light"] .lego-basket-viewer .text-yellow-300 {
  color: #a16207; /* yellow-700: ~4.9:1 on #fff */
}
[data-theme="light"] .lego-basket-viewer .text-orange-300 {
  color: #c2410c; /* orange-700: ~4.8:1 on #fff */
}
[data-theme="light"] .lego-basket-viewer .text-red-400,
[data-theme="light"] .lego-basket-viewer .hover\:text-red-300:hover {
  color: #b91c1c; /* red-700: ~5.9:1 on #fff */
}

/* Status pills: dark-tuned bg-*-900/* + text-*-300 are illegible in light.
   Re-skin to a light tint + dark ink, keeping the same hue family. */
[data-theme="light"] .lego-basket-viewer .bg-green-900\/40 {
  background-color: #dcfce7; /* green-100 */
}
[data-theme="light"] .lego-basket-viewer .bg-green-900\/40 .text-green-300,
[data-theme="light"] .lego-basket-viewer .bg-green-900\/40 .text-green-400\/70 {
  color: #15803d; /* green-700 on green-100 ~4.7:1 */
}
[data-theme="light"] .lego-basket-viewer .bg-yellow-900\/40 {
  background-color: #fef9c3; /* yellow-100 */
}
[data-theme="light"] .lego-basket-viewer .bg-yellow-900\/40 .text-yellow-300,
[data-theme="light"] .lego-basket-viewer .bg-yellow-900\/40 .text-yellow-400\/70 {
  color: #854d0e; /* yellow-800 on yellow-100 ~5.3:1 */
}
[data-theme="light"] .lego-basket-viewer .bg-blue-900\/40 {
  background-color: #dbeafe; /* blue-100 */
}
[data-theme="light"] .lego-basket-viewer .bg-blue-900\/40 .text-blue-300,
[data-theme="light"] .lego-basket-viewer .bg-blue-900\/40 .text-blue-400\/70 {
  color: #1d4ed8; /* blue-700 on blue-100 ~5.5:1 */
}
[data-theme="light"] .lego-basket-viewer .bg-emerald-900\/60 {
  background-color: #d1fae5; /* emerald-100 */
}
[data-theme="light"] .lego-basket-viewer .bg-emerald-900\/60 .text-emerald-300,
[data-theme="light"] .lego-basket-viewer .bg-emerald-900\/60 .text-emerald-400\/70 {
  color: #047857; /* emerald-700 on emerald-100 ~5.0:1 */
}

/* Inline phrase-count badge variants (no wrapping bg-*-900 parent). */
[data-theme="light"] .lego-basket-viewer .bg-green-900\/40.text-green-300 {
  background-color: #dcfce7;
  color: #15803d;
}
[data-theme="light"] .lego-basket-viewer .bg-yellow-900\/40.text-yellow-300 {
  background-color: #fef9c3;
  color: #854d0e;
}
[data-theme="light"] .lego-basket-viewer .bg-emerald-900\/60.text-emerald-300 {
  background-color: #d1fae5;
  color: #047857;
}

/* Conversational phrase row tint + error box: dark-only bg/border. */
[data-theme="light"] .lego-basket-viewer .bg-emerald-900\/20 {
  background-color: #ecfdf5; /* emerald-50 */
}
[data-theme="light"] .lego-basket-viewer .bg-red-900\/20 {
  background-color: #fef2f2; /* red-50 */
}

/* Quality-metrics gradient card: dark emerald/blue gradient reads muddy
   on light; give it a clean light tint with a visible border. */
[data-theme="light"] .lego-basket-viewer .from-emerald-900\/30.to-blue-900\/30 {
  background-image: linear-gradient(to right, #ecfdf5, #eff6ff);
}

/* Translucent surface-2/30 sub-cards barely separate on the light canvas;
   add a visible border (light only, so dark stays borderless). */
[data-theme="light"] .lego-basket-viewer .bg-surface-2\/30 {
  border: 1px solid var(--line);
}
</style>
