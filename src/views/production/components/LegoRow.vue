<template>
  <div class="lego-row ml-6 mb-4">
    <!-- LEGO Header -->
    <div
      class="lego-header bg-surface-2 rounded-lg p-4 cursor-pointer hover:bg-surface-3 transition-all"
      @click="toggleExpand"
    >
      <div class="flex items-center justify-between">
        <div class="lego-info flex items-center gap-3 flex-1">
          <!-- Expand/Collapse Icon -->
          <svg
            class="w-5 h-5 text-muted transition-transform"
            :class="{ 'rotate-90': lego.expanded }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>

          <!-- LEGO Icon -->
          <div class="lego-icon w-8 h-8 flex items-center justify-center bg-purple-500 bg-opacity-20 rounded">
            <svg class="w-5 h-5 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
          </div>

          <!-- LEGO Details -->
          <div class="lego-details flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="lego-id text-sm font-mono text-ink">{{ lego.lego_id }}</span>
              <span
                class="type-badge px-2 py-0.5 text-xs font-medium rounded"
                :class="typeBadgeClass"
              >
                {{ lego.type }}-type
              </span>
              <span v-if="lego.is_new" class="new-badge px-2 py-0.5 text-xs font-medium bg-emerald-600 text-white rounded">
                NEW
              </span>
            </div>

            <div class="lego-texts text-sm space-y-0.5">
              <div class="target-text text-ink font-medium">{{ lego.target }}</div>
              <div class="known-text text-muted">{{ lego.known }}</div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="lego-actions flex items-center gap-3">
          <!-- Phrase Count Badge -->
          <div class="phrase-count text-sm text-muted">
            {{ lego.phrases.length }} phrase{{ lego.phrases.length !== 1 ? 's' : '' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Expandable Phrases Section -->
    <Transition name="expand">
      <div v-if="lego.expanded" class="phrases-section mt-3 ml-8 space-y-3">
        <PhraseRow
          v-for="(phrase, index) in lego.phrases"
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

        <div v-if="lego.phrases.length === 0" class="no-phrases text-sm text-faint italic py-4 text-center">
          No phrases for this LEGO
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import PhraseRow from './PhraseRow.vue';
import type { LegoRowData, PhraseRowData, AudioSample, LegoType } from '@/types/production';

// Audio track type (matches PhraseRow)
type AudioTrack = 'known' | 'target1' | 'target2';

// Props
const props = defineProps<{
  lego: LegoRowData;
  courseCode?: string;
  selectionMode?: boolean;
  selectedPhraseIds?: Set<string>;
}>();

// Emits
const emit = defineEmits<{
  toggle: [legoId: string];
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
const typeBadgeClass = computed(() => {
  if (props.lego.type === 'A') {
    return 'bg-blue-600 text-white';
  } else {
    return 'bg-purple-600 text-white';
  }
});

// Methods
const toggleExpand = () => {
  emit('toggle', props.lego.lego_id);
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
  // For now, return undefined - the parent component should handle this
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
  max-height: 2000px; /* Large enough to accommodate content */
}

.lego-header:hover {
  @apply shadow-lg;
}
</style>
