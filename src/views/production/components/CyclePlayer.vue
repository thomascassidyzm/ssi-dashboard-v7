<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="cycle-player fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-70"
        @click.self="$emit('close')"
      >
        <div class="player-container w-full max-w-4xl bg-slate-900 rounded-t-2xl shadow-2xl overflow-hidden">
          <!-- Header -->
          <div class="player-header bg-slate-800 px-6 py-4 flex items-center justify-between">
            <div class="header-left">
              <div class="flex items-center gap-3">
                <span class="round-badge px-3 py-1 bg-amber-500 bg-opacity-20 text-amber-300 rounded-lg text-sm font-bold">
                  ROUND {{ currentRound }}
                </span>
                <span class="lego-id text-lg font-mono text-slate-300">{{ lego.lego_id }}</span>
                <span class="seed-id text-sm text-slate-500">{{ seedId }}</span>
              </div>
            </div>
            <button
              @click="$emit('close')"
              class="close-btn p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
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
              class="phrase-item flex items-center gap-4 px-6 py-3 border-b border-slate-800 transition-all"
              :class="{
                'bg-slate-800': currentPhraseIndex === index && isPlaying,
                'bg-slate-800/50': currentPhraseIndex === index && !isPlaying,
              }"
            >
              <!-- Play State Indicator -->
              <div class="state-indicator w-8 flex-shrink-0">
                <div v-if="currentPhraseIndex === index && isPlaying" class="w-6 h-6 flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                </div>
                <div v-else-if="index < currentPhraseIndex" class="w-6 h-6 flex items-center justify-center text-emerald-400">
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
                <span class="known-text text-slate-300">{{ phrase.known_text }}</span>
                <span class="arrow text-slate-600">&rarr;</span>
                <span
                  class="target-text font-medium"
                  :class="currentPhraseIndex === index ? 'text-amber-300' : 'text-white'"
                >
                  {{ phrase.target_text }}
                </span>
              </div>

              <!-- Rep Count (for practice phrases) -->
              <span
                v-if="phrase.rep_count && phrase.rep_count > 1"
                class="rep-count text-xs text-slate-500"
              >
                {{ phrase.rep_count }}x
              </span>
            </div>
          </div>

          <!-- Play Controls -->
          <div class="play-controls bg-slate-800 px-6 py-6 flex items-center justify-center gap-6">
            <!-- Skip Back -->
            <button
              @click="skipBack"
              :disabled="currentPhraseIndex === 0"
              class="control-btn p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
              </svg>
            </button>

            <!-- Main Play/Pause Button -->
            <button
              @click="togglePlayPause"
              class="play-btn w-16 h-16 rounded-full flex items-center justify-center transition-all"
              :class="isPlaying ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-500 hover:bg-red-600'"
            >
              <svg v-if="isPlaying" class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              <svg v-else class="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>

            <!-- Skip Forward -->
            <button
              @click="skipForward"
              :disabled="currentPhraseIndex >= phrases.length - 1"
              class="control-btn p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zm8-12v12h2V6h-2z" />
              </svg>
            </button>
          </div>

          <!-- Progress Bar -->
          <div class="progress-bar h-1 bg-slate-700">
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

// API Base URL
const getApiBaseUrl = (): string => {
  return localStorage.getItem('api_base_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3470';
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
    'INTR': 'bg-cyan-500 bg-opacity-30 text-cyan-300',
    'LEGO': 'bg-emerald-500 bg-opacity-30 text-emerald-300',
    'DEBU': 'bg-amber-500 bg-opacity-30 text-amber-300',
    'PRAC': 'bg-orange-500 bg-opacity-30 text-orange-300',
    'COMP': 'bg-blue-500 bg-opacity-30 text-blue-300',
    'ETER': 'bg-purple-500 bg-opacity-30 text-purple-300',
  };
  return classes[type] || 'bg-slate-500 bg-opacity-30 text-slate-300';
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
  const targetLang = props.courseCode.split('_')[0]; // e.g., 'zho' from 'zho_for_eng'

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
    console.log('No audio for phrase:', phrase.target_text);
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
  background: #1e293b;
}

.phrase-list::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 3px;
}
</style>
