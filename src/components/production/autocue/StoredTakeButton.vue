<template>
  <button
    class="stored-take-btn"
    :class="[`src-${playback.source}`, { playing: isPlaying }]"
    :disabled="!playback.playable"
    :title="playback.hint"
    :aria-label="`${isPlaying ? playback.playingLabel : playback.label}. ${playback.hint}`"
    @click.stop="$emit('toggle', playback)"
  >
    <span class="stb-icon" aria-hidden="true">{{ isPlaying ? '■' : playback.playable ? '▶' : '·' }}</span>
    <span class="stb-label">{{ isPlaying ? playback.playingLabel : playback.label }}</span>
    <!-- The whole point of the feature, said out loud rather than implied by a
         disabled state: stored bytes and raw local bytes never wear the same
         word. RAW is shouted because a raw preview masquerading as the stored
         clip is the failure this screen exists to prevent. -->
    <span class="stb-tag" :class="playback.source">{{ tag }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { resolveTakePlayback } from '@/composables/useStoredClip'

const props = defineProps({
  // The course_audio uuid, once the server has the take. Null until then.
  uuid: { type: String, default: null },
  // The stored clip addressed directly, for callers whose stored bytes are not
  // keyed by a course_audio uuid (the recordist surface: voice + line).
  storedUrl: { type: String, default: null },
  // The raw local capture, pre-upload only.
  localUrl: { type: String, default: null },
  pending: { type: Boolean, default: false },
  failed: { type: Boolean, default: false },
  // Offer the raw local take at all? Off = pre-upload playback is disabled
  // rather than labelled.
  allowLocal: { type: Boolean, default: true },
  isPlaying: { type: Boolean, default: false }
})
defineEmits(['toggle'])

const playback = computed(() => resolveTakePlayback({
  uuid: props.uuid,
  storedUrl: props.storedUrl,
  localUrl: props.localUrl,
  pending: props.pending,
  failed: props.failed,
  allowLocal: props.allowLocal
}))

const tag = computed(() => ({
  stored: 'STORED',
  local: 'RAW LOCAL',
  pending: 'SAVING',
  failed: 'NOT SAVED',
  none: ''
}[playback.value.source] || ''))
</script>

<style scoped>
.stored-take-btn {
  display: inline-flex; align-items: center; gap: 0.45rem;
  padding: 0.35rem 0.6rem; border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: var(--color-paper, #f7f7f2);
  font-size: 0.72rem; cursor: pointer;
}
.stored-take-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.stored-take-btn.src-stored { border-color: var(--color-emerald, #06ffa5); }
.stored-take-btn.playing { background: rgba(6, 255, 165, 0.18); }
.stb-icon { font-family: 'IBM Plex Mono', monospace; }
.stb-tag {
  font-family: 'IBM Plex Mono', monospace; font-size: 0.6rem;
  letter-spacing: 0.08em; padding: 0.1rem 0.3rem; border-radius: 3px;
}
.stb-tag.stored { background: var(--color-emerald, #06ffa5); color: #04211a; font-weight: 700; }
.stb-tag.local { background: #ffb703; color: #241a00; font-weight: 700; }
.stb-tag.pending { background: rgba(255, 255, 255, 0.15); }
.stb-tag.failed { background: #ff4d4d; color: #fff; font-weight: 700; }
</style>
