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
      <!--
        The measured verdict this clip carries, not an inference from when it
        was rendered. See services/audio-preview-router.cjs for why that
        distinction is the whole point of this badge.
      -->
      <span
        class="px-1.5 py-0.5 rounded border"
        :class="verdictClass"
        :title="verdictTitle"
      >{{ verdictLabel }}</span>
      <span
        v-if="clip.verdict?.attempts > 1"
        class="px-1.5 py-0.5 rounded border border-line"
        title="The first render was defective and was never published. This is the attempt that passed."
      >re-rendered ×{{ clip.verdict.attempts }}</span>
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

// The badge reads the verdict the renderer stored on the clip. It used to read
// a timestamp — "after the gate shipped" — and the 2026-08-05 audit measured
// that inference as false for 100% of the rows it selected. Three states,
// because "we could not check this" is not a pass and must never render as one.
const verdictState = computed(() => props.clip.verdict?.state || 'unchecked')

const verdictLabel = computed(() => ({
  passed: 'checked · passed',
  failed: 'checked · FAILED',
  unchecked: 'unchecked',
}[verdictState.value]))

const verdictClass = computed(() => ({
  passed: 'border-accent-2/40 text-accent-2',
  failed: 'border-danger/50 text-danger font-semibold',
  unchecked: 'border-line text-faint',
}[verdictState.value]))

const verdictTitle = computed(() => {
  const v = props.clip.verdict || {}
  const detail = [
    v.reasonText,
    v.cer != null ? `character error rate ${Number(v.cer).toFixed(3)}` : null,
    v.checker ? `recorded by ${v.checker}` : null,
    v.checkedAt ? `checked ${new Date(v.checkedAt).toLocaleString('en-GB')}` : null,
  ].filter(Boolean).join(' · ')

  const head = {
    passed: 'The pre-publish veracity gate transcribed this clip with an unprimed whisper decode and the words matched the script. Validated on silence and truncation only — it says nothing about pronunciation.',
    failed: 'This clip was checked, it FAILED, and the row exists anyway. That should be impossible on the gated path — worth investigating.',
    unchecked: 'No passing verdict is stored for this clip. Either no check has ever run on it, or the gate ran and could not examine it. This is NOT a pass.',
  }[verdictState.value]

  return detail ? `${head}\n\n${detail}` : head
})

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
