<template>
  <div
    class="bg-surface border rounded-lg px-4 py-3"
    :class="nowPlaying ? 'border-accent-2 shadow-sm' : 'border-line'"
  >
    <!-- The text is the thing being checked against the audio, so it leads. -->
    <div class="flex items-start gap-3">
      <span
        class="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
        :class="nowPlaying ? 'bg-accent-2' : 'bg-transparent'"
        :title="nowPlaying ? 'Now playing' : ''"
      ></span>
      <p class="text-ink text-[15px] leading-snug flex-1 break-words">{{ clip.text }}</p>
    </div>

    <div class="mt-2.5 flex items-center gap-3 flex-wrap clip-controls">
      <audio
        ref="audioEl"
        controls
        preload="none"
        class="clip-audio"
        @play="onPlay"
        @ended="$emit('ended', clip)"
      ></audio>

      <span v-if="loadingUrl" class="text-xs text-faint">fetching audio…</span>
      <span v-else-if="urlError" class="text-xs text-danger">{{ urlError }}</span>

      <!--
        Per-clip actions area. Empty today by design: this page is read-only.
        The future manual-approval gate drops its approve/reject controls here
        and nothing else about the clip has to move.
      -->
      <span class="clip-actions ml-auto flex items-center gap-2">
        <slot name="actions" :clip="clip"></slot>
      </span>
    </div>

    <div class="mt-2 flex items-center gap-2.5 flex-wrap text-xs text-faint">
      <span class="px-1.5 py-0.5 rounded border border-line uppercase tracking-wide">{{ clip.role || 'no role' }}</span>
      <span
        class="px-1.5 py-0.5 rounded border"
        :class="clip.gateState === 'gate-era'
          ? 'border-accent-2/40 text-accent-2'
          : 'border-line text-faint'"
        :title="gateTitle"
      >{{ clip.gateState === 'gate-era' ? 'rendered under the gate' : 'pre-gate' }}</span>
      <span v-if="clip.voiceId" class="font-mono">{{ clip.voiceId }}</span>
      <span v-if="clip.durationMs != null" class="font-mono">{{ (clip.durationMs / 1000).toFixed(2) }}s</span>
      <span class="font-mono">{{ renderedAt }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  clip: { type: Object, required: true },
  nowPlaying: { type: Boolean, default: false },
  // Injected rather than imported so the page owns the one signed-URL cache —
  // URLs expire in an hour and re-fetching per clip per tap would be silly.
  resolveUrl: { type: Function, required: true },
})

const emit = defineEmits(['play', 'ended'])

const audioEl = ref(null)
const loadingUrl = ref(false)
const urlError = ref('')
let armed = false

const renderedAt = computed(() => {
  if (!props.clip.createdAt) return ''
  return new Date(props.clip.createdAt).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
})

const gateTitle = computed(() => props.clip.gateState === 'gate-era'
  ? 'Rendered while the veracity gate was live. No per-clip verdict is stored, so this means checked-and-passed OR unchecked — not proven passed.'
  : 'Rendered before the veracity gate existed. Never machine-checked.')

/**
 * Signed URLs expire in an hour, so nothing is fetched until a clip is
 * actually wanted. The page primes visible clips via arm(); this play handler
 * is the fallback for the tap that beats the priming — it pauses, fetches,
 * and resumes, so a tap still just plays.
 */
async function arm () {
  if (armed || loadingUrl.value) return audioEl.value?.src || null
  loadingUrl.value = true
  urlError.value = ''
  try {
    const url = await props.resolveUrl(props.clip)
    if (audioEl.value) audioEl.value.src = url
    armed = true
    return url
  } catch (err) {
    urlError.value = 'audio unavailable'
    console.error('[AudioPreview] url fetch failed', props.clip.id, err)
    return null
  } finally {
    loadingUrl.value = false
  }
}

async function onPlay () {
  emit('play', props.clip)
  if (armed) return
  const el = audioEl.value
  el.pause()
  const url = await arm()
  if (url) el.play().catch(() => {})
}

async function playFromStart () {
  await arm()
  const el = audioEl.value
  if (!el || !el.src) return
  el.currentTime = 0
  await el.play().catch(() => {})
}

function stop () {
  // Unconditional: pausing an already-paused element is a no-op, and the
  // guard that used to be here only existed to look careful.
  audioEl.value?.pause()
}

defineExpose({ arm, playFromStart, stop })
</script>

<style scoped>
.clip-audio {
  height: 32px;
}

/* Phone: the transport is the thing you're reaching for — give it the width. */
@media (max-width: 640px) {
  .clip-controls {
    gap: 0.5rem;
  }
  .clip-audio {
    width: 100%;
  }
  .clip-actions {
    margin-left: 0;
  }
}
</style>
