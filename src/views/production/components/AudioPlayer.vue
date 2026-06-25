<template>
  <div class="audio-player inline-flex items-center gap-2 bg-surface-2 border border-line rounded-lg px-3 py-2">
    <!-- Play/Pause Button -->
    <button
      @click="togglePlayPause"
      class="audio-player-button flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-all"
      :class="isPlaying ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-surface-3 hover:bg-surface-3'"
      :disabled="!audioUrl || isLoading"
      :title="isPlaying ? 'Pause' : 'Play'"
    >
      <svg v-if="isLoading" class="w-4 h-4 animate-spin" :class="isPlaying ? 'text-white' : 'text-ink'" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <svg v-else-if="isPlaying" class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path d="M6 4h3v12H6V4zm5 0h3v12h-3V4z"/>
      </svg>
      <svg v-else class="w-4 h-4 text-ink ml-0.5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M6.3 3.3l10 6.7a1 1 0 010 1.6l-10 6.7A1 1 0 015 17V3a1 1 0 011.3-.7z"/>
      </svg>
    </button>

    <!-- Waveform Visualization -->
    <div v-if="showWaveform && waveformPeaks.length" class="waveform flex items-center gap-0.5 h-8 flex-grow min-w-0 max-w-48">
      <div
        v-for="(peak, index) in visiblePeaks"
        :key="index"
        class="waveform-bar bg-surface-3 rounded-full transition-all"
        :class="{ 'bg-emerald-400': isPlaying && progress >= (index / visiblePeaks.length) }"
        :style="{
          width: '2px',
          height: `${Math.max(peak * 100, 10)}%`,
          opacity: 0.4 + (peak * 0.6)
        }"
      />
    </div>

    <!-- Simple Progress Bar (fallback if no waveform) -->
    <div v-else-if="!showWaveform" class="progress-bar flex-grow h-1 bg-surface-3 rounded-full overflow-hidden min-w-0 max-w-48">
      <div
        class="progress-fill h-full bg-emerald-500 transition-all"
        :style="{ width: `${progress * 100}%` }"
      />
    </div>

    <!-- Duration Display -->
    <div class="duration text-xs text-ink font-mono whitespace-nowrap">
      <span v-if="duration">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
      <span v-else>--:--</span>
    </div>

    <!-- Hidden Audio Element -->
    <audio
      ref="audioElement"
      :src="audioUrl"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      @error="onError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';

// Props
const props = defineProps<{
  audioUrl?: string;
  waveformPeaks?: number[];
  showWaveform?: boolean;
  autoPlay?: boolean;
}>();

// Emits
const emit = defineEmits<{
  play: [];
  pause: [];
  ended: [];
  error: [error: Error];
}>();

// Refs
const audioElement = ref<HTMLAudioElement | null>(null);
const isPlaying = ref(false);
const isLoading = ref(false);
const currentTime = ref(0);
const duration = ref(0);

// Computed
const progress = computed(() => {
  if (!duration.value) return 0;
  return currentTime.value / duration.value;
});

const visiblePeaks = computed(() => {
  if (!props.waveformPeaks?.length) return [];

  // Downsample waveform to ~50 bars for display
  const targetBars = 50;
  const peaks = props.waveformPeaks;
  const step = Math.ceil(peaks.length / targetBars);

  const downsampled: number[] = [];
  for (let i = 0; i < peaks.length; i += step) {
    const chunk = peaks.slice(i, i + step);
    const avg = chunk.reduce((sum, val) => sum + val, 0) / chunk.length;
    downsampled.push(avg);
  }

  return downsampled;
});

// Methods
const togglePlayPause = async () => {
  if (!audioElement.value) return;

  try {
    if (isPlaying.value) {
      audioElement.value.pause();
      isPlaying.value = false;
      emit('pause');
    } else {
      isLoading.value = true;
      await audioElement.value.play();
      isPlaying.value = true;
      isLoading.value = false;
      emit('play');
    }
  } catch (error) {
    console.error('Audio playback error:', error);
    isLoading.value = false;
    emit('error', error as Error);
  }
};

const pause = () => {
  if (audioElement.value && isPlaying.value) {
    audioElement.value.pause();
    isPlaying.value = false;
    emit('pause');
  }
};

const onLoadedMetadata = () => {
  if (audioElement.value) {
    duration.value = audioElement.value.duration;
  }
};

const onTimeUpdate = () => {
  if (audioElement.value) {
    currentTime.value = audioElement.value.currentTime;
  }
};

const onEnded = () => {
  isPlaying.value = false;
  currentTime.value = 0;
  emit('ended');
};

const onError = (event: Event) => {
  const audio = event.target as HTMLAudioElement;
  const errorCode = audio?.error?.code;
  const errorMsg = audio?.error?.message || 'Unknown error';
  const errorCodes: Record<number, string> = {
    1: 'MEDIA_ERR_ABORTED',
    2: 'MEDIA_ERR_NETWORK',
    3: 'MEDIA_ERR_DECODE',
    4: 'MEDIA_ERR_SRC_NOT_SUPPORTED'
  };
  console.error('[AudioPlayer] Error loading audio:', {
    url: props.audioUrl,
    errorCode,
    errorType: errorCodes[errorCode] || 'UNKNOWN',
    errorMsg
  });
  isLoading.value = false;
  isPlaying.value = false;
  emit('error', new Error(`Failed to load audio: ${errorCodes[errorCode] || errorMsg}`));
};

const formatTime = (seconds: number): string => {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Watch for URL changes and reset playback
watch(() => props.audioUrl, () => {
  isPlaying.value = false;
  currentTime.value = 0;
  duration.value = 0;

  if (props.autoPlay && props.audioUrl) {
    // Small delay to ensure audio is loaded
    setTimeout(() => togglePlayPause(), 100);
  }
});

// Cleanup
onBeforeUnmount(() => {
  if (audioElement.value) {
    audioElement.value.pause();
    audioElement.value.src = '';
  }
});

// Expose methods for parent component
defineExpose({
  play: togglePlayPause,
  pause,
  isPlaying,
  currentTime,
  duration,
  progress
});
</script>

<style scoped>
.audio-player {
  user-select: none;
}

.audio-player-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.waveform-bar {
  transition: background-color 0.2s ease;
}
</style>
