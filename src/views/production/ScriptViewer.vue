<template>
  <div class="script-viewer flex flex-col h-screen bg-slate-900">
    <!-- Header -->
    <div class="script-header bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="header-left flex items-center gap-4">
          <h1 class="text-xl font-bold text-white">Script Viewer</h1>
          <div v-if="totalSeeds > 0" class="stats text-sm text-slate-400">
            {{ loadedSeeds }} of {{ totalSeeds }} seeds, {{ totalPhrases.toLocaleString() }} phrases
          </div>
        </div>

        <div class="header-right flex items-center gap-3">
          <!-- View Mode Toggle Buttons -->
          <div class="view-mode-toggle flex rounded-lg overflow-hidden">
            <button
              @click="viewMode = 'journey'; if (!learningJourneyData) loadLearningJourney()"
              class="px-4 py-2 text-sm transition-colors flex items-center gap-2"
              :class="viewMode === 'journey'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
              Script View
            </button>
            <button
              @click="viewMode = 'script'"
              class="px-4 py-2 text-sm transition-colors flex items-center gap-2"
              :class="viewMode === 'script'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Seed View
            </button>
          </div>

          <!-- Collapse/Expand All (only in seed mode) -->
          <template v-if="viewMode === 'script'">
            <button
              @click="collapseAll"
              class="px-3 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors flex items-center gap-1"
              title="Collapse all seeds"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
              </svg>
              Collapse All
            </button>

            <button
              @click="expandAll"
              class="px-3 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors flex items-center gap-1"
              title="Expand all seeds"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
              Expand All
            </button>

            <!-- Pagination Controls for Seeds -->
            <div v-if="totalSeeds > 0" class="flex items-center gap-2">
              <button
                @click="prevSeedPage"
                :disabled="seedPageStart <= 1"
                class="px-2 py-1 text-sm rounded transition-colors"
                :class="seedPageStart <= 1
                  ? 'text-slate-500 cursor-not-allowed'
                  : 'text-slate-300 hover:text-white hover:bg-slate-600'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <span class="text-sm text-slate-300">
                <span class="font-medium text-white">{{ seedPageStart }}-{{ seedPageEnd }}</span>
                <span class="text-slate-500"> of </span>
                <span class="text-white">{{ totalSeeds }}</span>
              </span>
              <button
                @click="nextSeedPage"
                :disabled="seedPageEnd >= totalSeeds"
                class="px-2 py-1 text-sm rounded transition-colors"
                :class="seedPageEnd >= totalSeeds
                  ? 'text-slate-500 cursor-not-allowed'
                  : 'text-slate-300 hover:text-white hover:bg-slate-600'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </template>

          <!-- Pagination for journey mode -->
          <template v-if="viewMode === 'journey'">
            <!-- Collapse/Expand All Buttons (moved here from inside scroll area) -->
            <div class="flex gap-2">
              <button
                @click="collapseAllJourney"
                class="px-3 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
              >
                Collapse All
              </button>
              <button
                @click="expandAllJourney"
                class="px-3 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
              >
                Expand All
              </button>
            </div>

            <!-- Pagination Controls (only show when data is loaded) -->
            <div v-if="totalJourneyRounds > 0" class="flex items-center gap-2">
              <button
                @click="prevPage"
                :disabled="journeyPage === 1"
                class="px-2 py-1 text-sm rounded transition-colors"
                :class="journeyPage === 1
                  ? 'text-slate-500 cursor-not-allowed'
                  : 'text-slate-300 hover:text-white hover:bg-slate-600'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <span class="text-sm text-slate-300">
                <span class="font-medium text-white">{{ journeyPageStart }}-{{ journeyPageEnd }}</span>
                <span class="text-slate-500"> of </span>
                <span class="text-white">{{ totalJourneyRounds }}</span>
              </span>
              <button
                @click="nextPage"
                :disabled="journeyPageEnd >= totalJourneyRounds"
                class="px-2 py-1 text-sm rounded transition-colors"
                :class="journeyPageEnd >= totalJourneyRounds
                  ? 'text-slate-500 cursor-not-allowed'
                  : 'text-slate-300 hover:text-white hover:bg-slate-600'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Filter Bar (only in script mode) -->
    <FilterBar
      v-if="viewMode === 'script'"
      v-model:status="filterStatus"
      v-model:seed-start="filterSeedStart"
      v-model:seed-end="filterSeedEnd"
      v-model:search-text="filterSearchText"
      v-model:flagged-only="filterFlaggedOnly"
      :total-seeds="totalSeeds"
      @change="onFilterChange"
    />

    <!-- Main Content Area -->
    <div class="script-content flex-1 overflow-y-auto p-6">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state flex items-center justify-center h-64">
        <div class="text-center">
          <svg class="w-12 h-12 mx-auto mb-4 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-slate-400">Loading course data...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state flex items-center justify-center h-64">
        <div class="text-center max-w-md">
          <svg class="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="text-lg font-semibold text-white mb-2">Error Loading Course</h3>
          <p class="text-slate-400 mb-4">{{ error }}</p>
          <button
            @click="loadCourseData"
            class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>

      <!-- Empty State for Regen Queue -->
      <div v-else-if="filterFlaggedOnly && flatFlaggedItems.length === 0" class="empty-state flex items-center justify-center h-64">
        <div class="text-center">
          <svg class="w-12 h-12 mx-auto mb-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="text-lg font-semibold text-white mb-2">Regen Queue Empty</h3>
          <p class="text-slate-400 mb-4">No audio marked for regeneration</p>
          <button
            @click="clearFilters"
            class="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <!-- Regen Queue Items View -->
      <div v-else-if="filterFlaggedOnly" class="flagged-items-list space-y-3">
        <div class="flagged-header flex items-center justify-between mb-4">
          <div class="text-sm text-slate-400">
            <span class="text-amber-400 font-semibold">{{ flatFlaggedItems.length }}</span>
            item{{ flatFlaggedItems.length !== 1 ? 's' : '' }} in regen queue
          </div>
          <router-link
            v-if="flatFlaggedItems.length > 0"
            :to="`/production/${courseCode}/pipeline?mode=flagged`"
            class="flex items-center gap-2 px-4 py-2 bg-emerald-500 bg-opacity-20 text-emerald-400 hover:bg-opacity-30 rounded-lg text-sm font-medium transition-colors"
          >
            Regenerate Queue
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </router-link>
        </div>

        <FlaggedItemRow
          v-for="item in flatFlaggedItems"
          :key="item.uuid"
          :item="item"
          @play="playFlaggedItem"
          @edit="editFlaggedItem"
          @unflag="unflagItem"
        />
      </div>

      <!-- Learning Journey View Mode -->
      <template v-else-if="viewMode === 'journey'">
        <!-- Loading Journey -->
        <div v-if="isLoadingJourney" class="loading-state flex items-center justify-center h-64">
          <div class="text-center">
            <svg class="w-12 h-12 mx-auto mb-4 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-slate-400">Generating learning journey...</p>
          </div>
        </div>

        <!-- Journey Error -->
        <div v-else-if="journeyError" class="error-state flex items-center justify-center h-64">
          <div class="text-center max-w-md">
            <svg class="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="text-lg font-semibold text-white mb-2">Error Generating Journey</h3>
            <p class="text-slate-400 mb-4">{{ journeyError }}</p>
            <button
              @click="reloadLearningJourney"
              class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>

        <!-- Learning Journey View Component -->
        <LearningJourneyView
          v-else-if="learningJourneyData"
          ref="learningJourneyRef"
          :rounds="paginatedJourneyRounds"
          :stats="learningJourneyData.stats"
          :is-loading="isLoadingJourney"
          :hide-controls="true"
        />
      </template>

      <!-- Script View Mode (original) -->
      <template v-else>
        <!-- Empty State (standard) -->
        <div v-if="filteredSeeds.length === 0" class="empty-state flex items-center justify-center h-64">
          <div class="text-center">
            <svg class="w-12 h-12 mx-auto mb-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="text-lg font-semibold text-white mb-2">No Results</h3>
            <p class="text-slate-400 mb-4">No seeds match your current filters</p>
            <button
              @click="clearFilters"
              class="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <!-- Seeds List (Virtualized) -->
        <div v-else class="seeds-list space-y-4">
        <!-- Show a message if using virtual scrolling would be beneficial -->
        <div v-if="filteredSeeds.length > 50" class="performance-notice bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-30 rounded-lg p-4 mb-4">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="text-sm text-blue-300">
              <strong>Performance Notice:</strong> Rendering {{ filteredSeeds.length }} seeds. Consider using more specific filters for better performance.
            </div>
          </div>
        </div>

        <!-- Seed Rows -->
        <SeedRow
          v-for="seed in visibleSeeds"
          :key="seed.seed_id"
          :seed="seed"
          :course-code="courseCode"
          @toggle="toggleSeed"
          @lego-toggle="toggleLego"
          @phrase-flag="openFlagModal"
          @phrase-edit="openPhraseEditModal"
          @audio-flag="handleAudioFlag"
          @phrase-play="playAudioSample"
          @phrase-pause="pauseAudio"
        />

        <!-- Load More (if using pagination) -->
        <div v-if="hasMoreSeeds" class="load-more text-center py-8">
          <button
            @click="loadMoreSeeds"
            class="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Load More Seeds
          </button>
        </div>
      </div>
      </template>
    </div>

    <!-- Playback Bar (Sticky Bottom) -->
    <Transition name="slide-up">
      <div v-if="currentPlayingSample" class="playback-bar bg-slate-800 border-t border-slate-700 px-6 py-4">
        <div class="flex items-center justify-between gap-4">
          <div class="playback-info flex-1">
            <div class="text-sm font-medium text-white mb-1">{{ currentPlayingSample.text }}</div>
            <div class="text-xs text-slate-400">
              <span class="font-mono">{{ currentPlayingSample.uuid }}</span>
              <span class="mx-2">•</span>
              <span>{{ currentPlayingSample.role }} ({{ currentPlayingSample.cadence }})</span>
            </div>
          </div>

          <AudioPlayer
            :audio-url="currentPlayingSample.url"
            :show-waveform="false"
            @ended="onPlaybackEnded"
            @error="onPlaybackError"
          />

          <button
            @click="closePlaybackBar"
            class="p-2 text-slate-400 hover:text-white transition-colors"
            title="Close playback bar"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Flag Modal -->
    <FlagModal
      :visible="flagModalVisible"
      :sample="selectedSample"
      @close="closeFlagModal"
      @submit="submitFlag"
    />

    <!-- Phrase Edit Modal -->
    <PhraseEditModal
      :visible="phraseEditModalVisible"
      :phrase="phraseToEdit"
      @close="closePhraseEditModal"
      @save="savePhraseEdit"
    />


    <!-- Keyboard Shortcuts Help Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showShortcutsHelp"
          class="shortcuts-modal fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          @click.self="showShortcutsHelp = false"
        >
          <div class="modal-content bg-slate-800 rounded-lg shadow-xl max-w-lg w-full p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-white">Keyboard Shortcuts</h3>
              <button @click="showShortcutsHelp = false" class="text-slate-400 hover:text-white">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="shortcuts-list space-y-3">
              <div v-for="shortcut in keyboardShortcuts" :key="shortcut.key" class="shortcut-item flex items-center justify-between py-2 border-b border-slate-700">
                <span class="text-slate-300">{{ shortcut.description }}</span>
                <kbd class="px-2 py-1 bg-slate-700 text-slate-300 rounded text-sm font-mono">{{ shortcut.key }}</kbd>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import FilterBar from './components/FilterBar.vue';
import SeedRow from './components/SeedRow.vue';
import AudioPlayer from './components/AudioPlayer.vue';
import FlagModal from './components/FlagModal.vue';
import PhraseEditModal from './components/PhraseEditModal.vue';
import FlaggedItemRow from './components/FlaggedItemRow.vue';
import LearningJourneyView from './components/LearningJourneyView.vue';
// CyclePlayer removed - not useful for QA workflow
import type {
  SeedRowData,
  LegoRowData,
  PhraseRowData,
  AudioSample,
  SampleStatus,
  FlagType,
  KeyboardShortcut
} from '@/types/production';

// Route
const route = useRoute();
const courseCode = computed(() => route.params.courseCode as string || 'spa_for_eng');

// State
const isLoading = ref(false);
const error = ref<string | null>(null);
const seeds = ref<SeedRowData[]>([]);
const totalSeedsInCourse = ref(0);  // Total seeds in course (from API)

// Filter State - default to first 50 seeds for performance
const filterStatus = ref<SampleStatus | 'all' | 'flagged'>('all');
const filterSeedStart = ref('S0001');
const filterSeedEnd = ref('S0050');
const filterSearchText = ref('');
const filterFlaggedOnly = ref(false);

// Track when seed range changes to trigger reload
const lastLoadedRange = ref({ start: '', end: '' });

// Pagination (for rendering within loaded seeds)
const visibleSeedCount = ref(50);
const hasMoreSeeds = computed(() => visibleSeedCount.value < filteredSeeds.value.length);

// Playback State
const currentPlayingSample = ref<AudioSample | null>(null);

// Flag Modal State
const flagModalVisible = ref(false);
const selectedSample = ref<AudioSample | null>(null);
const selectedPhrase = ref<PhraseRowData | null>(null);

// Phrase Edit Modal State
const phraseEditModalVisible = ref(false);
const phraseToEdit = ref<{
  id: string;
  known_text: string;
  target_text: string;
  known_audio_uuid?: string;
  target1_audio_uuid?: string;
  target2_audio_uuid?: string;
} | null>(null);


// Shortcuts Help
const showShortcutsHelp = ref(false);

// Learning Journey View Mode
const viewMode = ref<'script' | 'journey'>('script');
const learningJourneyData = ref<{
  rounds: any[];
  allItems: any[];
  stats: any;
} | null>(null);
const isLoadingJourney = ref(false);
const journeyError = ref<string | null>(null);

// Pagination for journey view (50 rounds per page)
const journeyPage = ref(1);
const journeyPageSize = 50;
const learningJourneyRef = ref<any>(null);

// Computed for pagination
const totalJourneyRounds = computed(() => learningJourneyData.value?.rounds?.length || 0);
const journeyPageStart = computed(() => (journeyPage.value - 1) * journeyPageSize + 1);
const journeyPageEnd = computed(() => Math.min(journeyPage.value * journeyPageSize, totalJourneyRounds.value));
const paginatedJourneyRounds = computed(() => {
  if (!learningJourneyData.value?.rounds) return [];
  const start = (journeyPage.value - 1) * journeyPageSize;
  const end = start + journeyPageSize;
  return learningJourneyData.value.rounds.slice(start, end);
});

// Pagination methods
const prevPage = () => {
  if (journeyPage.value > 1) {
    journeyPage.value--;
  }
};

const nextPage = () => {
  if (journeyPageEnd.value < totalJourneyRounds.value) {
    journeyPage.value++;
  }
};

// Collapse/Expand all methods for journey view
const collapseAllJourney = () => {
  learningJourneyRef.value?.collapseAll();
};

const expandAllJourney = () => {
  learningJourneyRef.value?.expandAll();
};

// API Base URL - use localStorage (set by EnvironmentSwitcher), then env, then localhost orchestrator
const getApiBaseUrl = (): string => {
  const storedUrl = localStorage.getItem('api_base_url');
  if (storedUrl) return storedUrl;
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456';
};

// Computed
const totalSeeds = computed(() => totalSeedsInCourse.value || seeds.value.length);
const loadedSeeds = computed(() => seeds.value.length);

const totalPhrases = computed(() => {
  return seeds.value.reduce((total, seed) => {
    const introCount = seed.introduction_phrases.length;
    const legoCount = seed.legos.reduce((sum, lego) => sum + lego.phrases.length, 0);
    return total + introCount + legoCount;
  }, 0);
});

const filteredSeeds = computed(() => {
  let result = seeds.value;

  // Filter by status
  if (filterStatus.value !== 'all') {
    result = result.filter(seed => {
      // Check if any phrase in this seed matches the status filter
      const hasMatchingStatus = (phrases: PhraseRowData[]) => {
        if (filterStatus.value === 'flagged') {
          return phrases.some(p => p.is_flagged);
        }
        return phrases.some(p => p.flag_status === filterStatus.value);
      };

      const introMatches = hasMatchingStatus(seed.introduction_phrases);
      const legoMatches = seed.legos.some(lego => hasMatchingStatus(lego.phrases));

      return introMatches || legoMatches;
    });
  }

  // Note: Seed range filtering is now done server-side via API params
  // No need to filter by range here since seeds are already pre-filtered

  // Filter by search text
  if (filterSearchText.value) {
    const searchLower = filterSearchText.value.toLowerCase();
    result = result.filter(seed => {
      const seedMatches = (seed.target_text?.toLowerCase() || '').includes(searchLower)
        || (seed.known_text?.toLowerCase() || '').includes(searchLower);

      const phraseMatches = (phrases: PhraseRowData[]) => {
        return phrases.some(p =>
          (p.target_text?.toLowerCase() || '').includes(searchLower)
          || (p.known_text?.toLowerCase() || '').includes(searchLower)
        );
      };

      const introMatches = phraseMatches(seed.introduction_phrases);
      const legoMatches = seed.legos.some(lego => phraseMatches(lego.phrases));

      return seedMatches || introMatches || legoMatches;
    });
  }

  // Filter flagged only
  if (filterFlaggedOnly.value) {
    result = result.filter(seed => {
      const hasFlags = (phrases: PhraseRowData[]) => phrases.some(p => p.is_flagged);
      const introFlags = hasFlags(seed.introduction_phrases);
      const legoFlags = seed.legos.some(lego => hasFlags(lego.phrases));
      return introFlags || legoFlags;
    });
  }

  return result;
});

const visibleSeeds = computed(() => {
  return filteredSeeds.value.slice(0, visibleSeedCount.value);
});

// Flat list of flagged audio items for "Flagged Only" view
interface FlaggedItem {
  uuid: string;
  seedId: string;
  legoId: string;
  phraseId: string;
  track: 'known' | 'target1' | 'target2';
  text: string;
  status: string;
  notes?: string;
  flaggedAt?: string;
  flaggedBy?: string;
}

const flatFlaggedItems = computed((): FlaggedItem[] => {
  const items: FlaggedItem[] = [];

  seeds.value.forEach(seed => {
    seed.legos.forEach(lego => {
      lego.phrases.forEach(phrase => {
        // Check each audio track for flagged status
        if (phrase.known_flag?.status === 'flagged' && phrase.known_audio_uuid) {
          items.push({
            uuid: phrase.known_audio_uuid,
            seedId: seed.seed_id,
            legoId: lego.lego_id,
            phraseId: phrase.phrase_id,
            track: 'known',
            text: phrase.known_text,
            status: phrase.known_flag.status,
            notes: phrase.known_flag.notes,
            flaggedAt: phrase.known_flag.flagged_at,
            flaggedBy: phrase.known_flag.flagged_by,
          });
        }
        if (phrase.target1_flag?.status === 'flagged' && phrase.target1_audio_uuid) {
          items.push({
            uuid: phrase.target1_audio_uuid,
            seedId: seed.seed_id,
            legoId: lego.lego_id,
            phraseId: phrase.phrase_id,
            track: 'target1',
            text: phrase.target_text,
            status: phrase.target1_flag.status,
            notes: phrase.target1_flag.notes,
            flaggedAt: phrase.target1_flag.flagged_at,
            flaggedBy: phrase.target1_flag.flagged_by,
          });
        }
        if (phrase.target2_flag?.status === 'flagged' && phrase.target2_audio_uuid) {
          items.push({
            uuid: phrase.target2_audio_uuid,
            seedId: seed.seed_id,
            legoId: lego.lego_id,
            phraseId: phrase.phrase_id,
            track: 'target2',
            text: phrase.target_text,
            status: phrase.target2_flag.status,
            notes: phrase.target2_flag.notes,
            flaggedAt: phrase.target2_flag.flagged_at,
            flaggedBy: phrase.target2_flag.flagged_by,
          });
        }
      });
    });
  });

  return items;
});

// Keyboard Shortcuts
const keyboardShortcuts: KeyboardShortcut[] = [
  { key: 'Space', description: 'Play/Pause audio', action: () => {/* handled by audio player */} },
  { key: 'F', description: 'Flag selected sample', action: () => {/* TODO: implement */} },
  { key: 'Esc', description: 'Close modals', action: () => { closeFlagModal(); closePhraseEditModal(); showShortcutsHelp.value = false; } },
  { key: '?', description: 'Show keyboard shortcuts', action: () => { showShortcutsHelp.value = !showShortcutsHelp.value; } },
];

// Methods
const loadCourseData = async (seedStart?: string, seedEnd?: string) => {
  isLoading.value = true;
  error.value = null;

  // Use provided values or current filter values
  const start = seedStart ?? filterSeedStart.value;
  const end = seedEnd ?? filterSeedEnd.value;

  try {
    const apiBaseUrl = getApiBaseUrl();

    // Build URL with seed range params for server-side filtering
    const params = new URLSearchParams();
    if (start) params.set('seedStart', start);
    if (end) params.set('seedEnd', end);
    const queryString = params.toString();
    const url = `${apiBaseUrl}/api/production/${courseCode.value}/script-view${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
    if (!response.ok) throw new Error('Failed to load course data');

    const data = await response.json();

    // Transform script-view data into SeedRowData format
    seeds.value = transformScriptViewToSeeds(data);

    // Store pagination info
    if (data.pagination) {
      totalSeedsInCourse.value = data.pagination.total;
    }

    // Track what range we loaded
    lastLoadedRange.value = { start, end };
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error loading course data:', err);
  } finally {
    isLoading.value = false;
  }
};

// Load learning journey data (load all LEGOs, pagination done client-side)
const loadLearningJourney = async () => {
  isLoadingJourney.value = true;
  journeyError.value = null;
  journeyPage.value = 1; // Reset to first page

  try {
    const apiBaseUrl = getApiBaseUrl();
    // Load up to 5000 LEGOs to support full course viewing
    const url = `${apiBaseUrl}/api/production/${courseCode.value}/learning-journey?maxLegos=5000`;

    const response = await fetch(url, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    });

    if (!response.ok) throw new Error('Failed to load learning journey');

    const data = await response.json();
    learningJourneyData.value = {
      rounds: data.rounds || [],
      allItems: data.allItems || [],
      stats: data.stats || null,
    };
  } catch (err) {
    journeyError.value = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error loading learning journey:', err);
  } finally {
    isLoadingJourney.value = false;
  }
};

// Toggle between script view and learning journey view
const toggleViewMode = () => {
  if (viewMode.value === 'script') {
    viewMode.value = 'journey';
    // Load learning journey data if not already loaded
    if (!learningJourneyData.value) {
      loadLearningJourney();
    }
  } else {
    viewMode.value = 'script';
  }
};

// Reload learning journey
const reloadLearningJourney = () => {
  loadLearningJourney();
};

// Transform new /script-view endpoint data into SeedRowData format
const transformScriptViewToSeeds = (data: any): SeedRowData[] => {
  if (!data || !data.seeds) return [];

  return data.seeds.map((seed: any) => {
    // Transform LEGOs
    const legos = (seed.legos || []).map((lego: any) => {
      // Transform phrases
      const phrases: PhraseRowData[] = (lego.phrases || []).map((phrase: any) => {
        return {
          phrase_id: phrase.id,
          type: 'PRAC' as any, // All practice phrases for QA
          known_text: phrase.known_text,
          target_text: phrase.target_text,
          // Audio UUIDs from script-view (for direct S3 playback)
          known_audio_uuid: phrase.known_audio_uuid || null,
          target1_audio_uuid: phrase.target1_audio_uuid || null,
          target2_audio_uuid: phrase.target2_audio_uuid || null,
          // S3 keys for v13 audio URLs
          known_s3_key: phrase.known_s3_key || null,
          target1_s3_key: phrase.target1_s3_key || null,
          target2_s3_key: phrase.target2_s3_key || null,
          // Flag status from database
          is_flagged: phrase.is_flagged || false,
          known_flag: phrase.known_flag || null,
          target1_flag: phrase.target1_flag || null,
          target2_flag: phrase.target2_flag || null,
          seed_id: seed.seed_id,
          cycle_index: phrase.position,
          word_count: phrase.word_count,
          lego_count: phrase.lego_count,
        };
      });

      // Sort by target text character length (shortest first = DEBUT-like, longest = ETERNAL-like)
      phrases.sort((a, b) => a.target_text.length - b.target_text.length);

      return {
        lego_id: lego.lego_id,
        type: lego.type,
        target: lego.target_text,
        known: lego.known_text,
        is_new: lego.is_new ?? false,
        phrases,
        expanded: false,
      };
    });

    return {
      seed_id: seed.seed_id,
      known_text: seed.known_text,
      target_text: seed.target_text,
      legos,
      introduction_phrases: [], // Introduction phrases are now part of LEGOs
      expanded: false,
    };
  });
};

// Legacy transform function for manifest format (kept for backwards compatibility)
const transformManifestToSeeds = (manifest: any): SeedRowData[] => {
  if (!manifest || !manifest.seeds) return [];

  return manifest.seeds.map((seed: any) => {
    // Extract introduction cycles (type === 'introduction')
    const introductionCycles = seed.cycles?.filter((c: any) => c.type === 'introduction') || [];
    const introduction_phrases: PhraseRowData[] = introductionCycles.map((cycle: any, idx: number) => ({
      phrase_id: cycle.uuid,
      type: 'ETER' as any,
      known_text: cycle.known,
      target_text: cycle.target,
      known_audio: {
        uuid: cycle.known_audio_uuid,
        text: cycle.known,
        role: 'source' as any,
        cadence: 'natural' as any,
        voice_id: '',
      },
      target_audio_1: {
        uuid: cycle.target_audio_uuid,
        text: cycle.target,
        role: 'target' as any,
        cadence: 'natural' as any,
        voice_id: '',
      },
      is_flagged: false,
      seed_id: seed.seed_id,
      cycle_index: idx,
    }));

    // Build legos with their phrases
    const legos = (seed.legos || []).map((lego: any) => {
      // Get all cycles for this lego
      const legoCycles = seed.cycles?.filter((c: any) => c.lego_id === lego.id) || [];

      const phrases: PhraseRowData[] = legoCycles.map((cycle: any, idx: number) => {
        // Determine phrase type based on cycle type
        let phraseType = 'PRAC';
        if (cycle.type === 'lego_component') phraseType = 'COMP';
        else if (cycle.type === 'lego_debut') phraseType = 'DEBU';

        return {
          phrase_id: cycle.uuid,
          type: phraseType as any,
          known_text: cycle.known,
          target_text: cycle.target,
          known_audio: {
            uuid: cycle.known_audio_uuid,
            text: cycle.known,
            role: 'source' as any,
            cadence: 'natural' as any,
            voice_id: '',
          },
          target_audio_1: {
            uuid: cycle.target_audio_uuid,
            text: cycle.target,
            role: 'target' as any,
            cadence: 'natural' as any,
            voice_id: '',
          },
          is_flagged: false,
          seed_id: seed.seed_id,
          cycle_index: idx,
          is_debut: cycle.context?.is_debut,
          is_component: cycle.context?.is_component,
        };
      });

      return {
        lego_id: lego.id,
        type: lego.type,
        target: lego.target,
        known: lego.known,
        is_new: lego.is_new ?? false,
        phrases,
        expanded: false,
      };
    });

    return {
      seed_id: seed.seed_id,
      known_text: seed.seed_pair[1], // second element is known
      target_text: seed.seed_pair[0], // first element is target
      legos,
      introduction_phrases,
      expanded: false,
    };
  });
};

const toggleSeed = (seedId: string) => {
  const seed = seeds.value.find(s => s.seed_id === seedId);
  if (seed) {
    seed.expanded = !seed.expanded;
  }
};

const toggleLego = (legoId: string) => {
  seeds.value.forEach(seed => {
    const lego = seed.legos.find(l => l.lego_id === legoId);
    if (lego) {
      lego.expanded = !lego.expanded;
    }
  });
};

const collapseAll = () => {
  seeds.value.forEach(seed => {
    seed.expanded = false;
    seed.legos.forEach(lego => {
      lego.expanded = false;
    });
  });
};

const expandAll = () => {
  seeds.value.forEach(seed => {
    seed.expanded = true;
    seed.legos.forEach(lego => {
      lego.expanded = true;
    });
  });
};

const loadMoreSeeds = () => {
  visibleSeedCount.value += 50;
};

const onFilterChange = () => {
  // Reset pagination when filters change
  visibleSeedCount.value = 50;

  // Check if seed range changed - if so, reload from server
  const rangeChanged = lastLoadedRange.value.start !== filterSeedStart.value
    || lastLoadedRange.value.end !== filterSeedEnd.value;

  if (rangeChanged) {
    loadCourseData(filterSeedStart.value, filterSeedEnd.value);
  }
};

const clearFilters = () => {
  filterStatus.value = 'all';
  filterSeedStart.value = '';
  filterSeedEnd.value = '';
  filterSearchText.value = '';
  filterFlaggedOnly.value = false;
};

const playAudioSample = (sample: AudioSample) => {
  currentPlayingSample.value = sample;
};

// Play flagged item audio
const playFlaggedItem = async (item: FlaggedItem) => {
  console.log('[playFlaggedItem] Called with item:', item);
  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(
      `${apiBaseUrl}/api/production/${courseCode.value}/audio/${item.uuid}/url`,
      { headers: { 'ngrok-skip-browser-warning': 'true' } }
    );
    if (!response.ok) throw new Error('Failed to get audio URL');
    const data = await response.json();

    currentPlayingSample.value = {
      uuid: item.uuid,
      text: item.text,
      role: item.track as any,
      cadence: 'natural' as any,
      voice_id: '',
      url: data.url,
    };
  } catch (err) {
    console.error('Error playing flagged item:', err);
  }
};

// Edit flagged item - find the phrase and open edit modal
const editFlaggedItem = (item: FlaggedItem) => {
  // Find the phrase in the seeds data
  for (const seed of seeds.value) {
    for (const lego of seed.legos) {
      const phrase = lego.phrases.find(p => p.phrase_id === item.phraseId);
      if (phrase) {
        openPhraseEditModal(phrase);
        return;
      }
    }
  }
  console.warn(`Could not find phrase ${item.phraseId} for editing`);
};

// Unflag/clear flag from item
const unflagItem = async (item: FlaggedItem) => {
  try {
    const apiBaseUrl = getApiBaseUrl();
    // Delete the flag using new audio-flags endpoint
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/audio-flags/${item.uuid}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });

    if (!response.ok) throw new Error('Failed to clear flag');

    // Reload data to update the list
    await loadCourseData();
    console.log(`Cleared flag for ${item.uuid}`);
  } catch (err) {
    console.error('Error clearing flag:', err);
  }
};

const pauseAudio = () => {
  // Audio player handles pause internally
};

const closePlaybackBar = () => {
  currentPlayingSample.value = null;
};

const onPlaybackEnded = () => {
  // Keep playback bar visible after audio ends
  // User can manually close it
};

const onPlaybackError = (error: Error) => {
  console.error('Playback error:', error);
  // TODO: Show error toast
};

const openFlagModal = (phrase: PhraseRowData) => {
  selectedPhrase.value = phrase;
  // Create a synthetic AudioSample from the phrase's audio UUID
  // Use target1 audio as the primary sample to flag
  const uuid = phrase.target1_audio_uuid || phrase.known_audio_uuid || phrase.phrase_id;
  selectedSample.value = {
    uuid,
    text: phrase.target_text,
    role: 'target1' as any,
    cadence: 'natural' as any,
    voice_id: '',
  };
  flagModalVisible.value = true;
};

const closeFlagModal = () => {
  flagModalVisible.value = false;
  selectedSample.value = null;
  selectedPhrase.value = null;
};

// Audio track type
type AudioTrack = 'known' | 'target1' | 'target2';

// Handle per-audio flagging from PhraseRow (toggle: flag if not flagged, unflag if flagged)
const handleAudioFlag = async (phrase: PhraseRowData, track: AudioTrack, uuid: string) => {
  // Check if this track is currently flagged
  const flagKey = `${track}_flag` as 'known_flag' | 'target1_flag' | 'target2_flag';
  const currentFlag = phrase[flagKey];
  const isCurrentlyMarked = currentFlag?.status === 'flagged';

  const action = isCurrentlyMarked ? 'Clearing' : 'Marking for regen';
  console.log(`${action}: ${track} (${uuid}) for phrase ${phrase.phrase_id}`);

  try {
    const apiBaseUrl = getApiBaseUrl();

    if (isCurrentlyMarked) {
      // Delete the flag using new audio-flags endpoint (user is happy with audio)
      const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/audio-flags/${uuid}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete flag: ${response.statusText}`);
      }

      // Clear local state
      (phrase as any)[flagKey] = null;
    } else {
      // Create/update flag using new audio-flags endpoint
      const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/audio-flags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          audio_uuid: uuid,
          status: 'flagged',
          reason: `Marked ${track} audio for regeneration`,
          flagged_by: 'dashboard_user'
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to update flag: ${errText}`);
      }

      // Set local state
      (phrase as any)[flagKey] = { status: 'flagged', notes: `Marked ${track} audio for regeneration` };
    }

    // Update is_flagged based on any flagged audio
    const isFlagged = (flag: any) => flag?.status === 'flagged';
    phrase.is_flagged = isFlagged(phrase.known_flag) || isFlagged(phrase.target1_flag) || isFlagged(phrase.target2_flag);

    console.log(`Successfully ${isCurrentlyMarked ? 'cleared' : 'marked for regen'} ${track} audio for phrase ${phrase.phrase_id}`);

  } catch (err) {
    console.error('Error updating flag:', err);
  }
};

// Phrase Edit Modal Methods
const openPhraseEditModal = (phrase: PhraseRowData) => {
  phraseToEdit.value = {
    id: phrase.phrase_id,
    known_text: phrase.known_text,
    target_text: phrase.target_text,
    known_audio_uuid: phrase.known_audio_uuid,
    target1_audio_uuid: phrase.target1_audio_uuid,
    target2_audio_uuid: phrase.target2_audio_uuid,
  };
  phraseEditModalVisible.value = true;
};

const closePhraseEditModal = () => {
  phraseEditModalVisible.value = false;
  phraseToEdit.value = null;
};

// RegenFlags type for per-audio regeneration
interface RegenFlags {
  known: boolean;
  target1: boolean;
  target2: boolean;
}

const savePhraseEdit = async (data: { known_text: string; target_text: string; regen_flags: RegenFlags }) => {
  if (!phraseToEdit.value) return;

  try {
    const apiBaseUrl = getApiBaseUrl();

    // Save text changes
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/phrase/${phraseToEdit.value.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        known_text: data.known_text,
        target_text: data.target_text,
      })
    });

    if (!response.ok) throw new Error('Failed to save phrase');

    // Flag individual audio files for regeneration
    const flagPromises: Promise<Response>[] = [];

    if (data.regen_flags.known && phraseToEdit.value.known_audio_uuid) {
      flagPromises.push(
        fetch(`${apiBaseUrl}/api/production/${courseCode.value}/audio-flags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify({
            audio_uuid: phraseToEdit.value.known_audio_uuid,
            status: 'flagged',
            reason: 'Text edited - flagged for regeneration',
            flagged_by: 'dashboard_user'
          })
        })
      );
    }

    if (data.regen_flags.target1 && phraseToEdit.value.target1_audio_uuid) {
      flagPromises.push(
        fetch(`${apiBaseUrl}/api/production/${courseCode.value}/audio-flags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify({
            audio_uuid: phraseToEdit.value.target1_audio_uuid,
            status: 'flagged',
            reason: 'Text edited - flagged for regeneration',
            flagged_by: 'dashboard_user'
          })
        })
      );
    }

    if (data.regen_flags.target2 && phraseToEdit.value.target2_audio_uuid) {
      flagPromises.push(
        fetch(`${apiBaseUrl}/api/production/${courseCode.value}/audio-flags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify({
            audio_uuid: phraseToEdit.value.target2_audio_uuid,
            status: 'flagged',
            reason: 'Text edited - flagged for regeneration',
            flagged_by: 'dashboard_user'
          })
        })
      );
    }

    // Wait for all flag updates
    if (flagPromises.length > 0) {
      await Promise.all(flagPromises);
      console.log(`Flagged ${flagPromises.length} audio file(s) for regeneration`);
    }

    // Update local state
    const phraseId = phraseToEdit.value.id;
    seeds.value.forEach(seed => {
      seed.legos.forEach(lego => {
        const phrase = lego.phrases.find(p => p.phrase_id === phraseId);
        if (phrase) {
          phrase.known_text = data.known_text;
          phrase.target_text = data.target_text;
        }
      });
    });

    closePhraseEditModal();
    // TODO: Show success toast
  } catch (err) {
    console.error('Error saving phrase:', err);
    // TODO: Show error toast
  }
};

const submitFlag = async (data: { flagType: FlagType; notes: string }) => {
  if (!selectedSample.value || !selectedPhrase.value) return;

  try {
    const apiBaseUrl = getApiBaseUrl();
    // Use new audio-flags endpoint
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/audio-flags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        audio_uuid: selectedSample.value.uuid,
        status: 'flagged',
        reason: `${data.flagType}: ${data.notes}`,
        flagged_by: 'reviewer',
      })
    });

    if (!response.ok) throw new Error('Failed to submit flag');

    // Update local state
    selectedPhrase.value.is_flagged = true;
    selectedPhrase.value.flag_status = `flagged_${data.flagType}` as SampleStatus;

    // Close modal
    closeFlagModal();

    console.log(`[ScriptViewer] Flag submitted: ${selectedSample.value.uuid} -> flagged_${data.flagType}`);
  } catch (err) {
    console.error('Error submitting flag:', err);
  }
};

// Keyboard event handler
const handleKeydown = (event: KeyboardEvent) => {
  // Ignore if typing in input field
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return;
  }

  switch (event.key) {
    case '?':
      event.preventDefault();
      showShortcutsHelp.value = !showShortcutsHelp.value;
      break;
    case 'Escape':
      event.preventDefault();
      closeFlagModal();
      closePhraseEditModal();
      showShortcutsHelp.value = false;
      break;
  }
};

// Lifecycle
onMounted(() => {
  // Check for filter query param (from QA link)
  if (route.query.filter === 'flagged') {
    filterFlaggedOnly.value = true;
  }
  loadCourseData();
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/* Slide-up transition for playback bar */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* Custom scrollbar for script content */
.script-content::-webkit-scrollbar {
  width: 8px;
}

.script-content::-webkit-scrollbar-track {
  background: #1e293b; /* slate-800 */
}

.script-content::-webkit-scrollbar-thumb {
  background: #475569; /* slate-600 */
  border-radius: 4px;
}

.script-content::-webkit-scrollbar-thumb:hover {
  background: #64748b; /* slate-500 */
}
</style>
