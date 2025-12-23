<template>
  <div
    class="phrase-row bg-slate-800 border-l-4 rounded-lg p-4 transition-all"
    :class="borderClass"
  >
    <!-- Header -->
    <div class="phrase-header flex items-start justify-between gap-4 mb-3">
      <div class="phrase-info flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="phrase-id text-xs font-mono text-slate-400">{{ phrase.phrase_id }}</span>
          <span
            class="phrase-type-badge px-2 py-0.5 text-xs font-medium rounded"
            :class="typeBadgeClass"
          >
            {{ phrase.type }}
          </span>
          <span v-if="phrase.is_debut" class="debut-badge px-2 py-0.5 text-xs font-medium bg-purple-500 bg-opacity-20 text-purple-300 rounded">
            DEBUT
          </span>
          <span v-if="phrase.is_component" class="component-badge px-2 py-0.5 text-xs font-medium bg-blue-500 bg-opacity-20 text-blue-300 rounded">
            COMPONENT
          </span>
        </div>

        <div class="phrase-texts space-y-1">
          <div class="known-text text-slate-300">
            <span class="text-xs text-slate-500 mr-2">Known:</span>
            {{ phrase.known_text }}
          </div>
          <div class="target-text text-white font-medium">
            <span class="text-xs text-slate-500 mr-2">Target:</span>
            {{ phrase.target_text }}
          </div>
        </div>
      </div>

      <!-- Status & Flag Button -->
      <div class="phrase-actions flex items-start gap-2">
        <div v-if="phrase.flag_status" class="status-indicator">
          <span
            class="status-badge px-2 py-1 text-xs font-medium rounded-lg"
            :class="statusBadgeClass"
          >
            {{ formatStatus(phrase.flag_status) }}
          </span>
        </div>

        <!-- Edit Button -->
        <button
          @click="onEdit"
          class="edit-button p-2 rounded-lg transition-all bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white"
          title="Edit phrase text"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        <button
          @click="toggleFlag"
          class="flag-button p-2 rounded-lg transition-all"
          :class="flagButtonClass"
          :title="phrase.is_flagged ? 'Update flag' : 'Flag sample (F)'"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Audio Controls -->
    <div class="audio-controls space-y-2">
      <!-- Known Audio (Source Language) -->
      <div class="audio-row flex items-center gap-3">
        <span class="audio-label text-xs text-slate-400 w-20">Known</span>
        <AudioPlayer
          :audio-url="phrase.known_audio.url"
          :waveform-peaks="phrase.known_audio.waveform_peaks"
          :show-waveform="true"
          @play="onPlay(phrase.known_audio)"
          @pause="onPause"
        />
      </div>

      <!-- Target Audio 1 (Natural Cadence) -->
      <div v-if="phrase.target_audio_1" class="audio-row flex items-center gap-3">
        <span class="audio-label text-xs text-slate-400 w-20">Target</span>
        <AudioPlayer
          :audio-url="phrase.target_audio_1.url"
          :waveform-peaks="phrase.target_audio_1.waveform_peaks"
          :show-waveform="true"
          @play="onPlay(phrase.target_audio_1)"
          @pause="onPause"
        />
        <span class="cadence-badge text-xs text-slate-500">natural</span>
      </div>

      <!-- Target Audio 2 (Slow Cadence) -->
      <div v-if="phrase.target_audio_2" class="audio-row flex items-center gap-3">
        <span class="audio-label text-xs text-slate-400 w-20">Target Slow</span>
        <AudioPlayer
          :audio-url="phrase.target_audio_2.url"
          :waveform-peaks="phrase.target_audio_2.waveform_peaks"
          :show-waveform="true"
          @play="onPlay(phrase.target_audio_2)"
          @pause="onPause"
        />
        <span class="cadence-badge text-xs text-slate-500">slow</span>
      </div>
    </div>

    <!-- Flag Notes (if flagged) -->
    <div v-if="phrase.is_flagged && flagNotes" class="flag-notes mt-3 p-3 bg-slate-700 rounded-lg border-l-2 border-amber-500">
      <div class="text-xs text-slate-400 mb-1">Flag Notes:</div>
      <div class="text-sm text-slate-200">{{ flagNotes }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AudioPlayer from './AudioPlayer.vue';
import type { PhraseRowData, AudioSample, PhraseType, SampleStatus } from '@/types/production';

// Props
const props = defineProps<{
  phrase: PhraseRowData;
  flagNotes?: string;
}>();

// Emits
const emit = defineEmits<{
  phraseFlag: [phrase: PhraseRowData];
  phraseEdit: [phrase: PhraseRowData];
  play: [sample: AudioSample];
  pause: [];
}>();

// Computed Classes
const borderClass = computed(() => {
  if (props.phrase.is_flagged) {
    return 'border-l-amber-500';
  }
  if (props.phrase.is_debut) {
    return 'border-l-purple-500';
  }
  if (props.phrase.is_component) {
    return 'border-l-blue-500';
  }
  return 'border-l-slate-700';
});

const typeBadgeClass = computed(() => {
  const baseClass = 'transition-colors';
  switch (props.phrase.type) {
    case 'COMP':
      return `${baseClass} bg-blue-500 bg-opacity-20 text-blue-300`;
    case 'LEGO':
      return `${baseClass} bg-purple-500 bg-opacity-20 text-purple-300`;
    case 'DEBU':
      return `${baseClass} bg-pink-500 bg-opacity-20 text-pink-300`;
    case 'ETER':
      return `${baseClass} bg-indigo-500 bg-opacity-20 text-indigo-300`;
    case 'PRAC':
      return `${baseClass} bg-emerald-500 bg-opacity-20 text-emerald-300`;
    default:
      return `${baseClass} bg-slate-500 bg-opacity-20 text-slate-300`;
  }
});

const statusBadgeClass = computed(() => {
  if (!props.phrase.flag_status) return '';

  const status = props.phrase.flag_status;
  if (status === 'approved' || status === 'complete') {
    return 'bg-emerald-500 bg-opacity-20 text-emerald-300';
  }
  if (status.startsWith('flagged')) {
    return 'bg-amber-500 bg-opacity-20 text-amber-300';
  }
  if (status === 'needs_review') {
    return 'bg-blue-500 bg-opacity-20 text-blue-300';
  }
  if (status.includes('failed') || status === 'rejected') {
    return 'bg-red-500 bg-opacity-20 text-red-300';
  }
  return 'bg-slate-500 bg-opacity-20 text-slate-300';
});

const flagButtonClass = computed(() => {
  if (props.phrase.is_flagged) {
    return 'bg-amber-500 text-white hover:bg-amber-600';
  }
  return 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white';
});

// Methods
const toggleFlag = () => {
  emit('phraseFlag', props.phrase);
};

const onEdit = () => {
  emit('phraseEdit', props.phrase);
};

const onPlay = (sample: AudioSample) => {
  emit('play', sample);
};

const onPause = () => {
  emit('pause');
};

const formatStatus = (status: SampleStatus): string => {
  return status.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};
</script>

<style scoped>
.phrase-row {
  transition: border-color 0.2s ease;
}

.phrase-row:hover {
  @apply bg-slate-700;
}
</style>
