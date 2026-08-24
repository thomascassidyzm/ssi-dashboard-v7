<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="cycle-player fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-70"
        @click.self="$emit('close')"
      >
        <div class="player-container w-full max-w-4xl bg-canvas rounded-t-2xl shadow-2xl overflow-hidden">
          <!-- Header -->
          <div class="player-header bg-surface px-6 py-4 flex items-center justify-between">
            <div class="header-left">
              <div class="flex items-center gap-3">
                <span class="round-badge px-3 py-1 bg-amber-600 text-white rounded-lg text-sm font-bold">
                  ROUND {{ currentRound }}
                </span>
                <span class="lego-id text-lg font-mono text-ink">{{ lego.lego_id }}</span>
                <span class="seed-id text-sm text-faint">{{ seedId }}</span>
              </div>
            </div>
            <button
              @click="$emit('close')"
              class="close-btn p-2 text-muted hover:text-ink hover:bg-surface-2 rounded-lg transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Phrase List -->
          <div class="phrase-list max-h-96 overflow-y-auto">
            <div
              v-for="(phrase, index) in phrases"
              :key="phrase.phrase_id"
              class="phrase-item flex items-center gap-4 px-6 py-3 border-b border-line transition-all"
              :class="{
                'bg-surface': currentPhraseIndex === index && isPlaying,
                'bg-surface/50': currentPhraseIndex === index && !isPlaying,
              }"
            >
              <!-- Play State Indicator -->
              <div class="state-indicator w-8 flex-shrink-0">
                <div v-if="currentPhraseIndex === index && isPlaying" class="w-6 h-6 flex items-center justify-center">
                  <svg class="w-5 h-5 text-ink" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                </div>
                <div v-else-if="index < currentPhraseIndex" class="check-icon w-6 h-6 flex items-center justify-center text-emerald-400">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </div>
              </div>

              <!-- Type Badge -->
              <span
                class="type-badge px-2 py-0.5 text-xs font-bold rounded"
                :class="getTypeBadgeClass(phrase.type)"
              >
                {{ formatPhraseType(phrase.type, index) }}
              </span>

              <!-- Phrase Text -->
              <div class="phrase-text flex-1 flex items-center gap-2">
                <span class="known-text text-ink">{{ phrase.known_text }}</span>
                <span class="arrow text-faint">&rarr;</span>
                <span
                  class="target-text font-medium"
                  :class="currentPhraseIndex === index ? 'text-amber-300 target-active' : 'text-ink'"
                  :dir="dirFor(phrase.target_text)"
                  style="unicode-bidi: isolate"
                >{{ phrase.target_text }}</span>
              </div>

              <!-- Rep Count (for practice phrases) -->
              <span
                v-if="phrase.rep_count && phrase.rep_count > 1"
                class="rep-count text-xs text-faint"
              >
                {{ phrase.rep_count }}x
              </span>
            </div>
          </div>

          <!-- Play Controls -->
          <div class="play-controls bg-surface px-6 py-6 flex items-center justify-center gap-6">
            <!-- Skip Back -->
            <button
              @click="skipBack"
              :disabled="currentPhraseIndex === 0"
              class="control-btn p-3 text-muted hover:text-ink hover:bg-surface-2 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
              </svg>
            </button>

            <!-- Main Play/Pause Button -->
            <button
              @click="togglePlayPause"
              class="play-btn w-16 h-16 rounded-full flex items-center justify-center transition-all"
              :class="isPlaying ? 'bg-surface-2 hover:bg-surface-3' : 'bg-red-500 hover:bg-red-600'"
            >
              <svg v-if="isPlaying" class="w-8 h-8 text-ink" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              <svg v-else class="w-8 h-8 text-ink ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>

            <!-- Skip Forward -->
            <button
              @click="skipForward"
              :disabled="currentPhraseIndex >= phrases.length - 1"
              class="control-btn p-3 text-muted hover:text-ink hover:bg-surface-2 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zm8-12v12h2V6h-2z" />
              </svg>
            </button>
          </div>

          <!-- Progress Bar -->
          <div class="progress-bar h-1 bg-surface-2">
            <div
              class="progress-fill h-full bg-amber-500 transition-all duration-300"
              :style="{ width: progressPercent + '%' }"
            ></div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import type { LegoRowData, PhraseRowData } from '@/types/production';
import { getApiUrl } from '@/services/api';
import { dirFor } from '@/utils/textDirection.js';

interface Props {
  visible: boolean;
  lego: LegoRowData;
  seedId: string;
  courseCode: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();

// State
const isPlaying = ref(false);
const currentPhraseIndex = ref(0);
const currentRound = ref(1);
const audioElement = ref<HTMLAudioElement | null>(null);
const isLoadingAudio = ref(false);

// API Base URL - Vercel-aware
const getApiBaseUrl = (): string => {
  const storedUrl = localStorage.getItem('api_base_url');
  if (storedUrl) return storedUrl;

  const isVercel = typeof window !== 'undefined' && (
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname === 'popty.app' ||
    window.location.hostname.endsWith('.popty.app')
  );
  if (isVercel) return '';

  return getApiUrl();
};

// Computed
const phrases = computed(() => props.lego.phrases || []);

const progressPercent = computed(() => {
  if (phrases.value.length === 0) return 0;
  return ((currentPhraseIndex.value + 1) / phrases.value.length) * 100;
});

// Methods
const formatPhraseType = (type: string, index: number): string => {
  const typeMap: Record<string, string> = {
    'INTR': 'INTRO',
    'LEGO': 'LEGO',
    'DEBU': `DEBUT-${index}`,
    'PRAC': `REP #${index}`,
    'COMP': 'COMP',
    'ETER': `ETER-${index}`,
  };

  // Count same-type phrases before this one
  let sameTypeBefore = 0;
  for (let i = 0; i < index; i++) {
    if (phrases.value[i].type === type) {
      sameTypeBefore++;
    }
  }

  if (type === 'DEBU') return `DEBUT-${sameTypeBefore + 1}`;
  if (type === 'PRAC') return `REP #${sameTypeBefore + 1}`;
  if (type === 'ETER') return `ETER-${sameTypeBefore + 1}`;

  return typeMap[type] || type;
};

const getTypeBadgeClass = (type: string): string => {
  const classes: Record<string, string> = {
    'INTR': 'bg-cyan-600 text-white',
    'LEGO': 'bg-emerald-600 text-white',
    'DEBU': 'bg-amber-600 text-white',
    'PRAC': 'bg-orange-600 text-white',
    'COMP': 'bg-blue-600 text-white',
    'ETER': 'bg-purple-600 text-white',
  };
  return classes[type] || 'bg-surface-3 bg-opacity-30 text-ink';
};

const fetchAudioUrl = async (text: string, lang: string, role: string): Promise<string | null> => {
  try {
    // Generate a lookup key for the audio
    // In production, we'd look up by phrase_id or compute the UUID
    const apiBaseUrl = getApiBaseUrl();

    // For now, we'll use a text-based lookup
    // TODO: Add proper audio UUID lookup based on phrase_id
    const response = await fetch(
      `${apiBaseUrl}/api/production/${props.courseCode}/audio/by-text?` +
      `text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}&role=${encodeURIComponent(role)}`,
      {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data.url || null;
  } catch (error) {
    console.error('Error fetching audio URL:', error);
    return null;
  }
};

const playCurrentPhrase = async () => {
  const phrase = phrases.value[currentPhraseIndex.value];
  if (!phrase) return;

  isLoadingAudio.value = true;

  // Try to play target audio (Chinese)
  // TODO: Implement proper audio fetching based on course_audio table
  // For now, we'll skip if no audio is available
  const targetLang = props.courseCode.split('_for_')[0]?.split('_')[0]; // e.g., 'zho' from 'zho_for_eng'

  // Create audio element if not exists
  if (!audioElement.value) {
    audioElement.value = new Audio();
    audioElement.value.addEventListener('ended', onAudioEnded);
    audioElement.value.addEventListener('error', onAudioError);
  }

  // Try to get audio URL for this phrase
  const url = await fetchAudioUrl(phrase.target_text, targetLang, 'target');

  if (url) {
    audioElement.value.src = url;
    audioElement.value.play().catch(err => {
      console.error('Error playing audio:', err);
      // Auto-advance if can't play
      setTimeout(advanceToNext, 500);
    });
  } else {
    // No audio available, auto-advance after a delay
    setTimeout(advanceToNext, 1500);
  }

  isLoadingAudio.value = false;
};

const onAudioEnded = () => {
  advanceToNext();
};

const onAudioError = () => {
  console.error('Audio playback error');
  advanceToNext();
};

const advanceToNext = () => {
  if (currentPhraseIndex.value < phrases.value.length - 1) {
    currentPhraseIndex.value++;
    if (isPlaying.value) {
      playCurrentPhrase();
    }
  } else {
    // Reached end of cycle
    isPlaying.value = false;
    currentPhraseIndex.value = 0;
    currentRound.value++;
  }
};

const togglePlayPause = () => {
  if (isPlaying.value) {
    isPlaying.value = false;
    audioElement.value?.pause();
  } else {
    isPlaying.value = true;
    playCurrentPhrase();
  }
};

const skipBack = () => {
  if (currentPhraseIndex.value > 0) {
    currentPhraseIndex.value--;
    if (isPlaying.value) {
      audioElement.value?.pause();
      playCurrentPhrase();
    }
  }
};

const skipForward = () => {
  if (currentPhraseIndex.value < phrases.value.length - 1) {
    currentPhraseIndex.value++;
    if (isPlaying.value) {
      audioElement.value?.pause();
      playCurrentPhrase();
    }
  }
};

// Watch for visibility changes
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    // Reset state when closing
    isPlaying.value = false;
    audioElement.value?.pause();
    currentPhraseIndex.value = 0;
  }
});

// Cleanup
onUnmounted(() => {
  audioElement.value?.pause();
  audioElement.value = null;
});
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .player-container,
.modal-leave-to .player-container {
  transform: translateY(100%);
}

.player-container {
  transition: transform 0.3s ease;
}

.phrase-list::-webkit-scrollbar {
  width: 6px;
}

.phrase-list::-webkit-scrollbar-track {
  background: var(--surface);
}

.phrase-list::-webkit-scrollbar-thumb {
  background: var(--surface-3);
  border-radius: 3px;
}

/* Light-mode contrast fixes. Dark mode keeps the original Tailwind shades. */
[data-theme="light"] .target-active {
  /* amber-300 on white = 1.44:1 (fail). amber-700 = 5.02:1 (AA). */
  color: #b45309;
}
[data-theme="light"] .check-icon {
  /* emerald-400 on white = 1.92:1 (fail UI 3:1). emerald-700 = 5.48:1. */
  color: #047857;
}
/* Status pills: white text on *-600 fails 4.5:1 on light (3.19-3.77:1).
   Darken to *-700 (5.0-5.5:1) only in light mode. */
[data-theme="light"] .type-badge.bg-cyan-600 {
  background-color: #0e7490;
}
[data-theme="light"] .type-badge.bg-emerald-600 {
  background-color: #047857;
}
[data-theme="light"] .type-badge.bg-amber-600 {
  background-color: #b45309;
}
[data-theme="light"] .type-badge.bg-orange-600 {
  background-color: #c2410c;
}
/* ROUND badge (amber-600 + white = 3.19:1) -> amber-700 in light. */
[data-theme="light"] .round-badge {
  background-color: #b45309;
}
</style>
