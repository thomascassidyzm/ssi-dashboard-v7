<template>
  <div class="seed-row mb-6">
    <!-- Seed Header -->
    <div
      class="seed-header bg-surface border border-line rounded-lg p-5 cursor-pointer hover:bg-surface-2 hover:border-line transition-all shadow-md"
      @click="toggleExpand"
    >
      <div class="flex items-center justify-between">
        <div class="seed-info flex items-center gap-4 flex-1">
          <!-- Expand/Collapse Icon -->
          <svg
            class="w-6 h-6 text-muted transition-transform flex-shrink-0"
            :class="{ 'rotate-90': seed.expanded }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>

          <!-- Seed Icon -->
          <div class="seed-icon w-10 h-10 flex items-center justify-center bg-emerald-500 bg-opacity-20 rounded-lg flex-shrink-0">
            <svg class="w-6 h-6 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clip-rule="evenodd" />
            </svg>
          </div>

          <!-- Seed Details -->
          <div class="seed-details flex-1 min-w-0">
            <div class="seed-id text-lg font-bold text-ink mb-1">
              {{ seed.seed_id }}
            </div>

            <div class="seed-texts space-y-1">
              <div class="target-text text-base text-ink font-medium truncate">
                {{ seed.target_text }}
              </div>
              <div class="known-text text-sm text-muted truncate">
                {{ seed.known_text }}
              </div>
            </div>
          </div>
        </div>

        <!-- Stats Badge -->
        <div class="seed-stats flex items-center gap-4 text-sm text-muted flex-shrink-0">
          <div class="lego-count flex items-center gap-1">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
            <span>{{ seed.legos.length }} LEGOs</span>
          </div>

          <div class="phrase-count flex items-center gap-1">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
            </svg>
            <span>{{ totalPhraseCount }} phrases</span>
          </div>

          <div v-if="flaggedCount > 0" class="flagged-count flex items-center gap-1 text-amber-400">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{{ flaggedCount }} pending</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Expandable Content Section -->
    <Transition name="expand">
      <div v-if="seed.expanded" class="seed-content mt-4 pl-4">
        <!-- Introduction Phrases -->
        <div v-if="seed.introduction_phrases.length > 0" class="introduction-section mb-6">
          <div class="section-label text-sm font-medium text-muted mb-3 flex items-center gap-2">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            <span>Introduction</span>
          </div>

          <div class="phrases-list space-y-3 ml-8">
            <PhraseRow
              v-for="(phrase, index) in seed.introduction_phrases"
              :key="phrase.phrase_id"
              :phrase="phrase"
              :position="index + 1"
              :course-code="courseCode"
              :flag-notes="getFlagNotes(phrase)"
              :selection-mode="selectionMode"
              :is-selected="selectedPhraseIds?.has(phrase.phrase_id)"
              @phrase-flag="onPhraseFlag"
              @phrase-edit="onPhraseEdit"
              @phrase-delete="onPhraseDelete"
              @audio-flag="onAudioFlag"
              @toggle-selection="onToggleSelection"
              @play="onPhrasePlay"
              @pause="onPhrasePause"
            />
          </div>
        </div>

        <!-- LEGOs Section -->
        <div v-if="seed.legos.length > 0" class="legos-section">
          <div class="section-label text-sm font-medium text-muted mb-3 flex items-center gap-2">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
            <span>LEGOs</span>
          </div>

          <div class="legos-list">
            <LegoRow
              v-for="lego in seed.legos"
              :key="lego.lego_id"
              :lego="lego"
              :course-code="courseCode"
              :selection-mode="selectionMode"
              :selected-phrase-ids="selectedPhraseIds"
              @toggle="onLegoToggle"
              @phrase-flag="onPhraseFlag"
              @phrase-edit="onPhraseEdit"
              @phrase-delete="onPhraseDelete"
              @audio-flag="onAudioFlag"
              @toggle-selection="onToggleSelection"
              @phrase-play="onPhrasePlay"
              @phrase-pause="onPhrasePause"
            />
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="seed.legos.length === 0 && seed.introduction_phrases.length === 0" class="empty-state text-center py-8 text-faint">
          <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p>No content for this seed</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import LegoRow from './LegoRow.vue';
import PhraseRow from './PhraseRow.vue';
import type { SeedRowData, LegoRowData, PhraseRowData, AudioSample } from '@/types/production';

// Props
const props = defineProps<{
  seed: SeedRowData;
  courseCode?: string;
  selectionMode?: boolean;
  selectedPhraseIds?: Set<string>;
}>();

// Audio track type (matches PhraseRow)
type AudioTrack = 'known' | 'target1' | 'target2';

// Emits
const emit = defineEmits<{
  toggle: [seedId: string];
  legoToggle: [legoId: string];
  phraseFlag: [phrase: PhraseRowData];
  phraseEdit: [phrase: PhraseRowData];
  phraseDelete: [phrase: PhraseRowData];
  audioFlag: [phrase: PhraseRowData, track: AudioTrack, uuid: string];
  toggleSelection: [phraseId: string];
  phrasePlay: [sample: AudioSample];
  phrasePause: [];
}>();

const onToggleSelection = (phraseId: string) => {
  emit('toggleSelection', phraseId);
};

// Computed
const totalPhraseCount = computed(() => {
  const legoPhrasesCount = props.seed.legos.reduce((sum, lego) => sum + lego.phrases.length, 0);
  return props.seed.introduction_phrases.length + legoPhrasesCount;
});

const flaggedCount = computed(() => {
  let count = 0;

  // Count flagged introduction phrases
  count += props.seed.introduction_phrases.filter(p => p.is_flagged).length;

  // Count flagged LEGO phrases
  props.seed.legos.forEach(lego => {
    count += lego.phrases.filter(p => p.is_flagged).length;
  });

  return count;
});

// Methods
const toggleExpand = () => {
  emit('toggle', props.seed.seed_id);
};

const onLegoToggle = (legoId: string) => {
  emit('legoToggle', legoId);
};

const onPhraseFlag = (phrase: PhraseRowData) => {
  emit('phraseFlag', phrase);
};

const onPhraseEdit = (phrase: PhraseRowData) => {
  emit('phraseEdit', phrase);
};

const onPhraseDelete = (phrase: PhraseRowData) => {
  emit('phraseDelete', phrase);
};

const onAudioFlag = (phrase: PhraseRowData, track: AudioTrack, uuid: string) => {
  emit('audioFlag', phrase, track, uuid);
};

const onPhrasePlay = (sample: AudioSample) => {
  emit('phrasePlay', sample);
};

const onPhrasePause = () => {
  emit('phrasePause');
};

const getFlagNotes = (phrase: PhraseRowData): string | undefined => {
  // In a real implementation, this would come from the store
  return undefined;
};
</script>

<style scoped>
/* Expand/Collapse Transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 5000px; /* Large enough to accommodate content */
}

.seed-header:hover {
  @apply shadow-lg;
}
</style>
