<template>
  <div class="script-viewer flex flex-col h-screen bg-slate-900">
    <!-- Header -->
    <div class="script-header bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="header-left flex items-center gap-4">
          <router-link
            :to="`/production/${courseCode}`"
            class="text-slate-400 hover:text-white transition-colors"
            title="Back to Mission Control"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </router-link>
          <h1 class="text-2xl font-bold text-white">Script Viewer</h1>
          <div class="course-badge px-3 py-1 bg-emerald-500 bg-opacity-20 text-emerald-300 rounded-lg text-sm font-medium">
            {{ courseCode }}
          </div>
          <div v-if="totalSeeds > 0" class="stats text-sm text-slate-400">
            <span v-if="filteredSeeds.length < totalSeeds">
              {{ filteredSeeds.length }} of {{ totalSeeds }} seeds
            </span>
            <span v-else>
              {{ totalSeeds }} seeds, {{ totalPhrases }} phrases
            </span>
          </div>
        </div>

        <div class="header-right flex items-center gap-3">
          <!-- Collapse/Expand All -->
          <button
            @click="collapseAll"
            class="px-3 py-2 text-sm text-slate-300 hover:text-white transition-colors"
            title="Collapse all seeds"
          >
            <svg class="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
            Collapse All
          </button>

          <button
            @click="expandAll"
            class="px-3 py-2 text-sm text-slate-300 hover:text-white transition-colors"
            title="Expand all seeds"
          >
            <svg class="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
            Expand All
          </button>

          <!-- Keyboard Shortcuts Help -->
          <button
            @click="showShortcutsHelp = !showShortcutsHelp"
            class="px-3 py-2 text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white rounded-lg transition-colors"
            title="Show keyboard shortcuts"
          >
            <svg class="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Shortcuts
          </button>
        </div>
      </div>
    </div>

    <!-- Filter Bar -->
    <FilterBar
      v-model:status="filterStatus"
      v-model:seed-start="filterSeedStart"
      v-model:seed-end="filterSeedEnd"
      v-model:search-text="filterSearchText"
      v-model:flagged-only="filterFlaggedOnly"
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

      <!-- Empty State -->
      <div v-else-if="filteredSeeds.length === 0" class="empty-state flex items-center justify-center h-64">
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

// Filter State - default to first 30 seeds for performance
const filterStatus = ref<SampleStatus | 'all' | 'flagged'>('all');
const filterSeedStart = ref('S0001');
const filterSeedEnd = ref('S0030');
const filterSearchText = ref('');
const filterFlaggedOnly = ref(false);

// Pagination
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
const phraseToEdit = ref<{ id: string; known_text: string; target_text: string } | null>(null);


// Shortcuts Help
const showShortcutsHelp = ref(false);

// API Base URL
const getApiBaseUrl = (): string => {
  return localStorage.getItem('api_base_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3470';
};

// Computed
const totalSeeds = computed(() => seeds.value.length);

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

  // Filter by seed range
  if (filterSeedStart.value || filterSeedEnd.value) {
    result = result.filter(seed => {
      const seedNum = parseInt(seed.seed_id.replace(/\D/g, ''));
      const startNum = filterSeedStart.value ? parseInt(filterSeedStart.value.replace(/\D/g, '')) : 0;
      const endNum = filterSeedEnd.value ? parseInt(filterSeedEnd.value.replace(/\D/g, '')) : Infinity;

      return seedNum >= startNum && seedNum <= endNum;
    });
  }

  // Filter by search text
  if (filterSearchText.value) {
    const searchLower = filterSearchText.value.toLowerCase();
    result = result.filter(seed => {
      const seedMatches = seed.target_text.toLowerCase().includes(searchLower)
        || seed.known_text.toLowerCase().includes(searchLower);

      const phraseMatches = (phrases: PhraseRowData[]) => {
        return phrases.some(p =>
          p.target_text.toLowerCase().includes(searchLower)
          || p.known_text.toLowerCase().includes(searchLower)
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

// Keyboard Shortcuts
const keyboardShortcuts: KeyboardShortcut[] = [
  { key: 'Space', description: 'Play/Pause audio', action: () => {/* handled by audio player */} },
  { key: 'F', description: 'Flag selected sample', action: () => {/* TODO: implement */} },
  { key: 'Esc', description: 'Close modals', action: () => { closeFlagModal(); closePhraseEditModal(); showShortcutsHelp.value = false; } },
  { key: '?', description: 'Show keyboard shortcuts', action: () => { showShortcutsHelp.value = !showShortcutsHelp.value; } },
];

// Methods
const loadCourseData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/script-view`, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
    if (!response.ok) throw new Error('Failed to load course data');

    const data = await response.json();

    // Transform script-view data into SeedRowData format
    seeds.value = transformScriptViewToSeeds(data);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error loading course data:', err);
  } finally {
    isLoading.value = false;
  }
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
          known_audio: null,
          target_audio_1: null,
          is_flagged: false,
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
  // TODO: Get the actual audio sample to flag
  // For now, use the target audio
  selectedSample.value = phrase.target_audio_1 || phrase.known_audio;
  flagModalVisible.value = true;
};

const closeFlagModal = () => {
  flagModalVisible.value = false;
  selectedSample.value = null;
  selectedPhrase.value = null;
};

// Phrase Edit Modal Methods
const openPhraseEditModal = (phrase: PhraseRowData) => {
  phraseToEdit.value = {
    id: phrase.phrase_id,
    known_text: phrase.known_text,
    target_text: phrase.target_text
  };
  phraseEditModalVisible.value = true;
};

const closePhraseEditModal = () => {
  phraseEditModalVisible.value = false;
  phraseToEdit.value = null;
};

const savePhraseEdit = async (data: { known_text: string; target_text: string; flag_for_regeneration: boolean }) => {
  if (!phraseToEdit.value) return;

  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/phrase/${phraseToEdit.value.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        known_text: data.known_text,
        target_text: data.target_text,
        flag_for_regeneration: data.flag_for_regeneration
      })
    });

    if (!response.ok) throw new Error('Failed to save phrase');

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
    // TODO: Implement API call to submit flag
    const response = await fetch(`/api/production/${courseCode.value}/flags/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uuid: selectedSample.value.uuid,
        status: `flagged_${data.flagType}`,
        note: data.notes,
        flagged_by: 'current_user@example.com', // TODO: Get from auth
      })
    });

    if (!response.ok) throw new Error('Failed to submit flag');

    // Update local state
    selectedPhrase.value.is_flagged = true;
    selectedPhrase.value.flag_status = `flagged_${data.flagType}` as SampleStatus;

    // Close modal
    closeFlagModal();

    // TODO: Show success toast
  } catch (err) {
    console.error('Error submitting flag:', err);
    // TODO: Show error toast
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
