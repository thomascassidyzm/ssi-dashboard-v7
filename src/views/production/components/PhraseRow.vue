<template>
  <div
    class="phrase-row bg-slate-800 border-l-4 rounded-lg p-4 transition-all"
    :class="borderClass"
  >
    <!-- Header -->
    <div class="phrase-header flex items-start justify-between gap-4 mb-3">
      <div class="phrase-info flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="position-badge px-2 py-0.5 text-xs font-medium bg-slate-600 text-slate-200 rounded">
            {{ position }}
          </span>
          <span class="phrase-id text-xs font-mono text-slate-500">{{ phrase.phrase_id }}</span>
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

      <!-- Status & Actions -->
      <div class="phrase-actions flex items-start gap-2">
        <div v-if="phrase.flag_status" class="status-indicator">
          <span
            class="status-badge px-2 py-1 text-xs font-medium rounded-lg"
            :class="statusBadgeClass"
          >
            {{ formatStatus(phrase.flag_status) }}
          </span>
        </div>

        <!-- Play Audio Button -->
        <button
          @click="playTargetAudio"
          class="play-button p-2 rounded-lg transition-all"
          :class="isPlaying ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'"
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
          class="edit-button p-2 rounded-lg transition-all bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white"
          title="Edit phrase text"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        <!-- Delete Button -->
        <button
          @click="onDelete"
          class="delete-button p-2 rounded-lg transition-all bg-slate-700 text-slate-400 hover:bg-red-600 hover:text-white"
          title="Delete phrase"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        <!-- Per-audio flag buttons are below in audio-controls section -->
      </div>
    </div>

    <!-- Individual Audio Controls (always show if UUIDs available) -->
    <div v-if="phrase.known_audio_uuid || phrase.target1_audio_uuid || phrase.target2_audio_uuid" class="audio-controls mt-3 space-y-2">
      <!-- Known Audio (Source Language) -->
      <div v-if="phrase.known_audio_uuid" class="audio-row flex items-center gap-2 p-2 bg-slate-700 bg-opacity-50 rounded-lg">
        <button
          @click="playSingleAudio('known')"
          class="play-single p-1.5 rounded transition-all"
          :class="currentlyPlayingTrack === 'known' ? 'bg-red-500 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500 hover:text-white'"
          title="Play known audio"
        >
          <svg v-if="currentlyPlayingTrack === 'known'" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
          <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <span class="audio-label text-xs text-slate-400 w-16">Known</span>
        <span class="audio-text flex-1 text-sm text-slate-300 truncate">{{ phrase.known_text }}</span>
        <AudioStatusBadge :status="getAudioStatus('known')" />
        <button
          @click="flagSingleAudio('known')"
          class="flag-single p-1.5 rounded transition-all"
          :class="isAudioFlagged('known') ? 'bg-amber-500 text-white' : 'bg-slate-600 text-slate-400 hover:bg-slate-500 hover:text-amber-400'"
          title="Flag known audio"
        >
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" />
          </svg>
        </button>
      </div>

      <!-- Target Audio 1 (Female Voice) -->
      <div v-if="phrase.target1_audio_uuid" class="audio-row flex items-center gap-2 p-2 bg-slate-700 bg-opacity-50 rounded-lg">
        <button
          @click="playSingleAudio('target1')"
          class="play-single p-1.5 rounded transition-all"
          :class="currentlyPlayingTrack === 'target1' ? 'bg-red-500 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500 hover:text-white'"
          title="Play target audio (female)"
        >
          <svg v-if="currentlyPlayingTrack === 'target1'" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
          <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <span class="audio-label text-xs text-pink-400 w-16">Target 1</span>
        <span class="audio-text flex-1 text-sm text-white truncate">{{ phrase.target_text }}</span>
        <span class="voice-badge text-xs text-pink-400 px-1.5 py-0.5 bg-pink-500 bg-opacity-20 rounded">F</span>
        <AudioStatusBadge :status="getAudioStatus('target1')" />
        <button
          @click="flagSingleAudio('target1')"
          class="flag-single p-1.5 rounded transition-all"
          :class="isAudioFlagged('target1') ? 'bg-amber-500 text-white' : 'bg-slate-600 text-slate-400 hover:bg-slate-500 hover:text-amber-400'"
          title="Flag target1 audio"
        >
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" />
          </svg>
        </button>
      </div>

      <!-- Target Audio 2 (Male Voice) -->
      <div v-if="phrase.target2_audio_uuid" class="audio-row flex items-center gap-2 p-2 bg-slate-700 bg-opacity-50 rounded-lg">
        <button
          @click="playSingleAudio('target2')"
          class="play-single p-1.5 rounded transition-all"
          :class="currentlyPlayingTrack === 'target2' ? 'bg-red-500 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500 hover:text-white'"
          title="Play target audio (male)"
        >
          <svg v-if="currentlyPlayingTrack === 'target2'" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
          <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <span class="audio-label text-xs text-blue-400 w-16">Target 2</span>
        <span class="audio-text flex-1 text-sm text-white truncate">{{ phrase.target_text }}</span>
        <span class="voice-badge text-xs text-blue-400 px-1.5 py-0.5 bg-blue-500 bg-opacity-20 rounded">M</span>
        <AudioStatusBadge :status="getAudioStatus('target2')" />
        <button
          @click="flagSingleAudio('target2')"
          class="flag-single p-1.5 rounded transition-all"
          :class="isAudioFlagged('target2') ? 'bg-amber-500 text-white' : 'bg-slate-600 text-slate-400 hover:bg-slate-500 hover:text-amber-400'"
          title="Flag target2 audio"
        >
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" />
          </svg>
        </button>
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
import { ref, computed, defineComponent, h } from 'vue';
import type { PhraseRowData, AudioSample, SampleStatus } from '@/types/production';
import { getApiUrl } from '@/services/api';

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
        approved: 'bg-emerald-500 bg-opacity-20 text-emerald-400',
        complete: 'bg-emerald-500 bg-opacity-20 text-emerald-400',
        flagged_regen_tts: 'bg-amber-500 bg-opacity-20 text-amber-400',
        flagged_human_needed: 'bg-orange-500 bg-opacity-20 text-orange-400',
        flagged_text_edit: 'bg-yellow-500 bg-opacity-20 text-yellow-400',
        needs_review: 'bg-blue-500 bg-opacity-20 text-blue-400',
        rejected: 'bg-red-500 bg-opacity-20 text-red-400',
        tts_failed: 'bg-red-500 bg-opacity-20 text-red-400',
        pending: 'bg-slate-500 bg-opacity-20 text-slate-400',
      };

      const colorClass = statusColors[props.status] || 'bg-slate-500 bg-opacity-20 text-slate-400';
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
  flagNotes?: string;
  courseCode?: string;
}>();

// Emits
const emit = defineEmits<{
  phraseEdit: [phrase: PhraseRowData];
  phraseDelete: [phrase: PhraseRowData];
  audioFlag: [phrase: PhraseRowData, track: AudioTrack, uuid: string];
  play: [sample: AudioSample];
  pause: [];
}>();

// Inline audio playback state
const isPlaying = ref(false);
const isLoading = ref(false);
const audioElement = ref<HTMLAudioElement | null>(null);
const currentlyPlayingTrack = ref<AudioTrack | null>(null);

// API Base URL - NO hardcoding! Must use EnvironmentSwitcher for non-local environments
const getApiBaseUrl = (): string => {
  const hostname = window.location.hostname;

  // 1. Check localStorage first (set by EnvironmentSwitcher) - works everywhere
  const storedUrl = localStorage.getItem('api_base_url');
  if (storedUrl) return storedUrl;

  // 2. Localhost - use default local URL
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3456';
  }

  // 3. ngrok - use relative URL (same origin proxies to backend)
  if (hostname.includes('ngrok')) {
    return '';  // Relative URL - goes through ngrok tunnel
  }

  // 4. Vercel or other static hosting - MUST use EnvironmentSwitcher
  // Return empty string (relative URL) which will fail on static hosting,
  // prompting user to set the backend URL via EnvironmentSwitcher
  console.warn('[PhraseRow] No API URL configured. Use Environment Switcher to set the backend URL.');
  return '';
};

// Computed Classes
const borderClass = computed(() => {
  if (props.phrase.is_flagged) {
    return 'border-l-amber-500';
  }
  return 'border-l-slate-700';
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

const formatStatus = (status: SampleStatus): string => {
  return status.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
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

// Check if specific audio is flagged (status === 'flagged')
const isAudioFlagged = (track: AudioTrack): boolean => {
  switch (track) {
    case 'known': return props.phrase.known_flag?.status === 'flagged';
    case 'target1': return props.phrase.target1_flag?.status === 'flagged';
    case 'target2': return props.phrase.target2_flag?.status === 'flagged';
    default: return false;
  }
};

// Flag a single audio track (parent handles the toggle and API call)
const flagSingleAudio = (track: AudioTrack) => {
  const uuid = getUuidForTrack(track);
  if (!uuid) return;

  // Emit event for parent to handle API call and state update
  emit('audioFlag', props.phrase, track, uuid);
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
  @apply bg-slate-700;
}
</style>
