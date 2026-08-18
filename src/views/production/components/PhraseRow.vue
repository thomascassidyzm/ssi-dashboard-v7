<template>
  <div
    class="phrase-row bg-surface border-l-4 rounded-lg p-4 transition-all"
    :class="[borderClass, { 'bg-red-900 bg-opacity-30': isSelected, 'opacity-50': phrase.introduce === false }]"
  >
    <!-- Header -->
    <div class="phrase-header flex items-start justify-between gap-4 mb-3">
      <div class="phrase-info flex-1">
        <div class="flex items-center gap-2 mb-1">
          <!-- Selection checkbox -->
          <label
            v-if="selectionMode"
            class="selection-checkbox flex items-center cursor-pointer"
            @click.stop
          >
            <input
              type="checkbox"
              :checked="isSelected"
              @change="toggleSelection"
              class="w-4 h-4 rounded border-line bg-surface-2 text-red-500 focus:ring-red-500 focus:ring-offset-0 cursor-pointer"
            />
          </label>
          <span class="position-badge px-2 py-0.5 text-xs font-medium bg-surface-3 text-ink rounded">
            {{ position }}
          </span>
          <span class="phrase-id text-xs font-mono text-faint">{{ phrase.phrase_id }}</span>
          <span
            v-if="phrase.introduce === false"
            class="px-1.5 py-0.5 text-xs font-medium bg-surface-3 bg-opacity-50 text-faint rounded line-through"
            title="Tiling only — not presented to learner"
          >CMP</span>
        </div>

        <div class="phrase-texts space-y-1">
          <div class="known-text text-ink">
            <span class="text-xs text-faint mr-2">Known:</span>
            <span :dir="dirFor(phrase.known_text)" class="bidi-isolate">{{ phrase.known_text }}</span>
          </div>
          <div class="target-text text-ink font-medium">
            <span class="text-xs text-faint mr-2">Target:</span>
            <!--
              dir on this span only, never on the parent: the "Target:" label is
              English chrome and must stay put. Isolating the run is what keeps a
              trailing neutral `!` at the logical end of the Arabic.
            -->
            <span
              :dir="dirFor(phrase.target_text)"
              style="unicode-bidi: isolate"
            >{{ phrase.target_text }}</span>
          </div>
        </div>
      </div>

      <!-- Status & Actions -->
      <div class="phrase-actions flex items-start gap-2">
        <!-- Play Audio Button -->
        <button
          @click="playTargetAudio"
          class="play-button p-2 rounded-lg transition-all"
          :class="isPlaying ? 'bg-red-500 text-white' : 'bg-surface-2 text-muted hover:bg-surface-3 hover:text-ink'"
          :disabled="isLoading"
          title="Play target audio"
        >
          <svg v-if="isLoading" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else-if="isPlaying" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
          <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>

        <!-- Edit Button -->
        <button
          @click="onEdit"
          class="edit-button p-2 rounded-lg transition-all bg-surface-2 text-muted hover:bg-surface-3 hover:text-ink"
          title="Edit phrase text"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        <!-- Delete Button -->
        <button
          @click="onDelete"
          class="delete-button p-2 rounded-lg transition-all bg-surface-2 text-muted hover:bg-red-600 hover:text-white"
          title="Delete phrase"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Individual Audio Controls (always show if UUIDs available) -->
    <div v-if="phrase.known_audio_uuid || phrase.target1_audio_uuid || phrase.target2_audio_uuid" class="audio-controls mt-3 space-y-2">
      <!-- Known-language audio -->
      <div v-if="phrase.known_audio_uuid" class="audio-row flex items-center gap-2 p-2 bg-surface-2 border border-line rounded-lg">
        <button
          @click="playSingleAudio('known')"
          class="play-single p-1.5 rounded transition-all"
          :class="currentlyPlayingTrack === 'known' ? 'bg-red-500 text-white' : 'bg-surface-3 text-ink hover:bg-surface-3 hover:text-ink'"
          title="Play known audio"
        >
          <svg v-if="currentlyPlayingTrack === 'known'" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
          <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <span class="audio-label text-xs text-muted w-16">Known</span>
        <span class="audio-text flex-1 text-sm text-ink truncate bidi-isolate" :dir="dirFor(phrase.known_text)">{{ phrase.known_text }}</span>
        <AudioStatusBadge :status="getAudioStatus('known')" />
      </div>

      <!-- Target Audio 1 (Voice 1) -->
      <div v-if="phrase.target1_audio_uuid" class="audio-row flex items-center gap-2 p-2 bg-surface-2 border border-line rounded-lg">
        <button
          @click="playSingleAudio('target1')"
          class="play-single p-1.5 rounded transition-all"
          :class="currentlyPlayingTrack === 'target1' ? 'bg-red-500 text-white' : 'bg-surface-3 text-ink hover:bg-surface-3 hover:text-ink'"
          title="Play Voice 1"
        >
          <svg v-if="currentlyPlayingTrack === 'target1'" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
          <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <span class="audio-label text-xs text-muted w-16">Voice 1</span>
        <span
          class="audio-text flex-1 text-sm text-ink truncate text-left"
          :dir="dirFor(phrase.target_text)"
          style="unicode-bidi: isolate"
        >{{ phrase.target_text }}</span>
        <span class="voice-badge inline-flex items-center gap-0.5 text-xs text-muted px-1.5 py-0.5 bg-surface-3 rounded">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM6 20a6 6 0 0112 0"/></svg>1
        </span>
        <AudioStatusBadge :status="getAudioStatus('target1')" />
      </div>

      <!-- Target Audio 2 (Voice 2) -->
      <div v-if="phrase.target2_audio_uuid" class="audio-row flex items-center gap-2 p-2 bg-surface-2 border border-line rounded-lg">
        <button
          @click="playSingleAudio('target2')"
          class="play-single p-1.5 rounded transition-all"
          :class="currentlyPlayingTrack === 'target2' ? 'bg-red-500 text-white' : 'bg-surface-3 text-ink hover:bg-surface-3 hover:text-ink'"
          title="Play Voice 2"
        >
          <svg v-if="currentlyPlayingTrack === 'target2'" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
          <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <span class="audio-label text-xs text-muted w-16">Voice 2</span>
        <span
          class="audio-text flex-1 text-sm text-ink truncate text-left"
          :dir="dirFor(phrase.target_text)"
          style="unicode-bidi: isolate"
        >{{ phrase.target_text }}</span>
        <span class="voice-badge inline-flex items-center gap-0.5 text-xs text-muted px-1.5 py-0.5 bg-surface-3 rounded">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM6 20a6 6 0 0112 0"/></svg>2
        </span>
        <AudioStatusBadge :status="getAudioStatus('target2')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineComponent, h } from 'vue';
import type { PhraseRowData, AudioSample, SampleStatus } from '@/types/production';
import { getApiUrl } from '@/services/api';
import { dirFor } from '@/utils/textDirection.js';

// Audio track type
type AudioTrack = 'known' | 'target1' | 'target2';

// Simple inline AudioStatusBadge component
const AudioStatusBadge = defineComponent({
  props: {
    status: { type: String as () => SampleStatus | null, default: null }
  },
  setup(props) {
    return () => {
      if (!props.status) return null;

      const statusColors: Record<string, string> = {
        approved: 'bg-emerald-600 text-white',
        complete: 'bg-emerald-600 text-white',
        needs_review: 'bg-blue-600 text-white',
        rejected: 'bg-red-600 text-white',
        tts_failed: 'bg-red-600 text-white',
        pending: 'bg-surface-3 bg-opacity-20 text-muted',
      };

      const colorClass = statusColors[props.status] || 'bg-surface-3 bg-opacity-20 text-muted';
      const label = props.status.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      return h('span', {
        class: `status-badge text-xs px-1.5 py-0.5 rounded ${colorClass}`
      }, label);
    };
  }
});

// QA playback timing constants (for easy adjustment)
const QA_PAUSE_AFTER_KNOWN_MS = 1000;
const QA_PAUSE_BETWEEN_TARGETS_MS = 500;

// Props
const props = defineProps<{
  phrase: PhraseRowData;
  position: number;
  courseCode?: string;
  selectionMode?: boolean;
  isSelected?: boolean;
}>();

// Emits
const emit = defineEmits<{
  phraseEdit: [phrase: PhraseRowData];
  phraseDelete: [phrase: PhraseRowData];
  play: [sample: AudioSample];
  pause: [];
  toggleSelection: [phraseId: string];
}>();

// Selection toggle
const toggleSelection = () => {
  emit('toggleSelection', props.phrase.phrase_id);
};

// Inline audio playback state
const isPlaying = ref(false);
const isLoading = ref(false);
const audioElement = ref<HTMLAudioElement | null>(null);
const currentlyPlayingTrack = ref<AudioTrack | null>(null);

const getApiBaseUrl = (): string => getApiUrl();

// Computed Classes
const borderClass = computed(() => 'border-l-slate-700');

// Methods
const onEdit = () => {
  emit('phraseEdit', props.phrase);
};

const onDelete = () => {
  emit('phraseDelete', props.phrase);
};

const onPlay = (sample: AudioSample) => {
  emit('play', sample);
};

const onPause = () => {
  emit('pause');
};

// Per-audio status tracking (placeholder - would come from API in real impl)
const audioStatuses = ref<Record<AudioTrack, SampleStatus | null>>({
  known: null,
  target1: null,
  target2: null,
});

// Get UUID for a track
const getUuidForTrack = (track: AudioTrack): string | null => {
  switch (track) {
    case 'known': return props.phrase.known_audio_uuid || null;
    case 'target1': return props.phrase.target1_audio_uuid || null;
    case 'target2': return props.phrase.target2_audio_uuid || null;
    default: return null;
  }
};

// Get S3 key for a track (v13 format)
const getS3KeyForTrack = (track: AudioTrack): string | null => {
  switch (track) {
    case 'known': return props.phrase.known_s3_key || null;
    case 'target1': return props.phrase.target1_s3_key || null;
    case 'target2': return props.phrase.target2_s3_key || null;
    default: return null;
  }
};

// Get status for a specific audio track
const getAudioStatus = (track: AudioTrack): SampleStatus | null => {
  return audioStatuses.value[track];
};

// Play a single audio track
const playSingleAudio = async (track: AudioTrack) => {
  const uuid = getUuidForTrack(track);
  const s3Key = getS3KeyForTrack(track);
  if (!uuid && !s3Key) return;

  // If same track is playing, stop it
  if (currentlyPlayingTrack.value === track) {
    audioElement.value?.pause();
    currentlyPlayingTrack.value = null;
    return;
  }

  // Stop any currently playing audio
  if (audioElement.value) {
    audioElement.value.pause();
  }

  currentlyPlayingTrack.value = track;

  try {
    // Get signed URL from API
    const audioUrl = await getSignedAudioUrl(uuid || s3Key!, s3Key);
    if (audioUrl) {
      await playAudioAndWait(audioUrl);
    } else {
      console.warn(`No audio URL available for track ${track}`);
    }
  } catch (err) {
    console.error('Error playing audio:', err);
  } finally {
    currentlyPlayingTrack.value = null;
  }
};

// Get signed URL from API for audio playback
const getSignedAudioUrl = async (uuid: string, s3Key?: string | null): Promise<string | null> => {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const courseCode = props.courseCode || 'spa_for_eng';

    // Use the signed URL endpoint
    const response = await fetch(
      `${apiBaseUrl}/api/production/${courseCode}/audio/${uuid}/url`,
      { headers: { 'ngrok-skip-browser-warning': 'true' } }
    );

    if (!response.ok) {
      console.warn(`Failed to get signed URL for ${uuid}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.url || null;
  } catch (err) {
    console.warn(`Error getting signed URL for ${uuid}:`, err);
    return null;
  }
};

// Playback state for QA sequence
let playbackAborted = false;

// Helper to fetch audio UUID by text and role
const fetchAudioUuid = async (apiBaseUrl: string, courseCode: string, text: string, role: string): Promise<string | null> => {
  try {
    const response = await fetch(
      `${apiBaseUrl}/api/production/${courseCode}/audio/by-text?text=${encodeURIComponent(text)}&role=${role}`,
      { headers: { 'ngrok-skip-browser-warning': 'true' } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.uuid || null;
  } catch {
    return null;
  }
};

// Helper to play audio and wait for it to finish
const playAudioAndWait = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!audioElement.value) {
      audioElement.value = new Audio();
    }

    const onEnded = () => {
      audioElement.value?.removeEventListener('ended', onEnded);
      audioElement.value?.removeEventListener('error', onError);
      resolve();
    };

    const onError = () => {
      audioElement.value?.removeEventListener('ended', onEnded);
      audioElement.value?.removeEventListener('error', onError);
      console.warn('Audio playback error for:', url);
      resolve(); // Continue sequence even if one audio fails
    };

    audioElement.value.addEventListener('ended', onEnded);
    audioElement.value.addEventListener('error', onError);
    audioElement.value.src = url;
    audioElement.value.play().catch(() => {
      onError();
    });
  });
};

// Helper to wait for a duration
const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Play full QA sequence: Known → 1s pause → Target1 → 0.5s pause → Target2
const playTargetAudio = async () => {
  if (isPlaying.value) {
    // Stop playing
    playbackAborted = true;
    audioElement.value?.pause();
    isPlaying.value = false;
    return;
  }

  playbackAborted = false;
  isLoading.value = true;
  isPlaying.value = true;

  try {
    const apiBaseUrl = getApiBaseUrl();
    const courseCode = props.courseCode;

    // Use pre-loaded UUIDs and S3 keys from script-view if available
    let knownUuid = props.phrase.known_audio_uuid || null;
    let target1Uuid = props.phrase.target1_audio_uuid || null;
    let target2Uuid = props.phrase.target2_audio_uuid || null;
    let knownS3Key = props.phrase.known_s3_key || null;
    let target1S3Key = props.phrase.target1_s3_key || null;
    let target2S3Key = props.phrase.target2_s3_key || null;

    // If UUIDs not pre-loaded, fetch them (fallback for backward compatibility)
    if (!knownUuid && !target1Uuid && !target2Uuid && courseCode) {
      const [fetchedKnown, fetchedTarget1, fetchedTarget2] = await Promise.all([
        fetchAudioUuid(apiBaseUrl, courseCode, props.phrase.known_text, 'known'),
        fetchAudioUuid(apiBaseUrl, courseCode, props.phrase.target_text, 'target1'),
        fetchAudioUuid(apiBaseUrl, courseCode, props.phrase.target_text, 'target2'),
      ]);
      knownUuid = fetchedKnown;
      target1Uuid = fetchedTarget1;
      target2Uuid = fetchedTarget2;
    }

    isLoading.value = false;

    // Get signed URLs for all audio files
    const [knownUrl, target1Url, target2Url] = await Promise.all([
      knownUuid ? getSignedAudioUrl(knownUuid, knownS3Key) : Promise.resolve(null),
      target1Uuid ? getSignedAudioUrl(target1Uuid, target1S3Key) : Promise.resolve(null),
      target2Uuid ? getSignedAudioUrl(target2Uuid, target2S3Key) : Promise.resolve(null),
    ]);

    // Play Known audio
    if (knownUrl && !playbackAborted) {
      await playAudioAndWait(knownUrl);
    }

    // Pause after known
    if (!playbackAborted) await wait(QA_PAUSE_AFTER_KNOWN_MS);

    // Play Target1 (female voice)
    if (target1Url && !playbackAborted) {
      await playAudioAndWait(target1Url);
    }

    // Pause between targets
    if (!playbackAborted) await wait(QA_PAUSE_BETWEEN_TARGETS_MS);

    // Play Target2 (male voice)
    if (target2Url && !playbackAborted) {
      await playAudioAndWait(target2Url);
    }

  } catch (err) {
    console.error('Error in QA playback:', err);
  } finally {
    isLoading.value = false;
    isPlaying.value = false;
  }
};
</script>

<style scoped>
.phrase-row {
  transition: border-color 0.2s ease;
}

.phrase-row:hover {
  @apply bg-surface-2;
}

/* Light mode: the selected highlight uses a dark-red fill (bg-red-900/30) that
   collides with near-black --ink text. Swap to a legible light-red tint + visible
   ring so the row reads on a white card. Dark mode keeps the original fill. */
:root[data-theme='light'] .phrase-row.bg-red-900 {
  background-color: #fee2e2 !important; /* red-100 */
  box-shadow: inset 0 0 0 1px #fca5a5; /* red-300 ring */
}

/* Light mode: pink/blue voice labels & badges (pink-400/blue-400) drop to ~2.5:1
   on light surfaces. Darken to a higher-contrast same-hue tone (>=4.5:1). */
:root[data-theme='light'] .audio-label.text-pink-400,
:root[data-theme='light'] .voice-badge.text-pink-400 {
  color: #be185d; /* pink-700 */
}
:root[data-theme='light'] .audio-label.text-blue-400,
:root[data-theme='light'] .voice-badge.text-blue-400 {
  color: #1d4ed8; /* blue-700 */
}
:root[data-theme='light'] .voice-badge.bg-pink-500 {
  background-color: #fbcfe8 !important; /* pink-200, opacity utility unneeded */
}
:root[data-theme='light'] .voice-badge.bg-blue-500 {
  background-color: #bfdbfe !important; /* blue-200 */
}
</style>
