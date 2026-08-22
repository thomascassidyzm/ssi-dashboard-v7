<template>
  <div class="ab" data-feature="raw-vs-processed-2026-08-16">
    <div v-if="probing" class="ab-line ab-note">Looking for the original…</div>

    <template v-else>
      <!-- Raw. Absent for every take made before 2026-08-14, and that absence
           is stated in words rather than shown as a dead player: a disabled
           button with no explanation reads as "broken", and the recordist would
           be left thinking the comparison failed rather than that there is
           nothing to compare. -->
      <div v-if="raw.available" class="ab-line">
        <button
          class="ab-btn"
          :class="{ playing: playing === 'raw' }"
          type="button"
          @click="toggle('raw')"
        >
          <span class="ab-icon" aria-hidden="true">{{ playing === 'raw' ? '■' : '▶' }}</span>
          <span class="ab-name">{{ RAW_VARIANT_LABEL }}</span>
          <span class="ab-tag raw">RAW</span>
        </button>
        <span class="ab-dur">{{ durationText(durations.raw) }}</span>
      </div>
      <p v-else class="ab-line ab-note absent">{{ raw.message }}</p>

      <div class="ab-line">
        <button
          class="ab-btn"
          :class="{ playing: playing === 'processed' }"
          type="button"
          @click="toggle('processed')"
        >
          <span class="ab-icon" aria-hidden="true">{{ playing === 'processed' ? '■' : '▶' }}</span>
          <span class="ab-name">{{ PROCESSED_VARIANT_LABEL }}</span>
          <span class="ab-tag proc">STORED</span>
        </button>
        <span class="ab-dur">{{ durationText(durations.processed) }}</span>
      </div>

      <!-- The number IS the deliverable: room either side of the phrase is easy
           to miss by ear on a phone in a kitchen and impossible to miss written
           down. Only shown once both sides have really loaded. -->
      <p v-if="margin" class="ab-delta" :class="{ alarm: margin.state !== 'ok' }">
        {{ margin.text }}
      </p>

      <p v-if="playbackError" class="ab-note error">{{ playbackError }}</p>
    </template>
  </div>
</template>

<script setup>
// RAW vs PROCESSED, side by side, for ONE line.
//
// This exists because the T-20 clips were butchered by the processing chain and
// nobody could hear it — there was nothing to hear it against. A recordist can
// only judge "is my take fine and the processing wrong, or was my take wrong?"
// by hearing both, and the two must never be able to be confused for each
// other: separate buttons, separate labels, separate tags, no autoplay, and
// never both at once.
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  recordistClipUrl,
  fetchRecordistRawClip,
  RAW_VARIANT_LABEL,
  PROCESSED_VARIANT_LABEL,
} from '@/composables/useStoredClip'
import { marginVerdict } from '@/utils/takeMargin'

const props = defineProps({
  voiceId: { type: String, required: true },
  lineId: { type: [String, Number], required: true },
})

const probing = ref(true)
const raw = ref({ available: false, url: null, message: null })
const playing = ref(null)             // 'raw' | 'processed' | null
const playbackError = ref(null)
const durations = reactive({ raw: null, processed: null })

const processedUrl = computed(() => recordistClipUrl(props.voiceId, props.lineId, 'processed'))

let audioEl = null

function durationText(seconds) {
  if (seconds === null) return '…'
  if (seconds === false) return '—'          // measured, and not measurable
  return `${seconds.toFixed(2)}s`
}

// The margin, not the shortfall. See src/utils/takeMargin.js for why the
// alarm now fires on too LITTLE difference rather than too much.
const margin = computed(() => marginVerdict(durations.raw, durations.processed))

/**
 * A clip's duration, without playing it.
 *
 * MediaRecorder's webm carries no duration in its header, so a browser reports
 * Infinity until it has seen the end of the stream. Seeking past the end forces
 * it to resolve — the standard workaround, and the only way the raw side of
 * this comparison can show a number at all.
 */
function measure(url, slot) {
  const el = new Audio()
  el.preload = 'metadata'
  let settled = false
  const done = (value) => {
    if (settled) return
    settled = true
    durations[slot] = value
    el.src = ''
  }
  el.onloadedmetadata = () => {
    if (Number.isFinite(el.duration) && el.duration > 0) return done(el.duration)
    el.ontimeupdate = () => {
      el.ontimeupdate = null
      if (Number.isFinite(el.duration) && el.duration > 0) done(el.duration)
      else done(false)
    }
    el.currentTime = 1e6
  }
  el.onerror = () => done(false)
  // Never leave the row saying "…" for ever if the browser answers neither.
  setTimeout(() => done(false), 15000)
  el.src = url
}

function stop() {
  if (audioEl) { audioEl.onended = null; audioEl.onerror = null; audioEl.pause() }
  playing.value = null
}

// One at a time, always. Two takes of the same line playing over each other
// would tell the recordist nothing about either.
function toggle(which) {
  playbackError.value = null
  if (playing.value === which) { stop(); return }
  const url = which === 'raw' ? raw.value.url : processedUrl.value
  if (!url) return
  stop()
  if (!audioEl) audioEl = new Audio()
  audioEl.src = url
  playing.value = which
  audioEl.onended = () => { if (playing.value === which) playing.value = null }
  const fail = () => {
    if (playing.value === which) playing.value = null
    playbackError.value = which === 'raw'
      ? 'The original was found on the server but would not play in this browser.'
      : 'The processed clip would not play in this browser.'
  }
  audioEl.onerror = fail
  const p = audioEl.play()
  if (p && typeof p.catch === 'function') p.catch(fail)
}

onMounted(async () => {
  // The HEAD behind this is paid HERE — when a human asked to compare — and
  // never per line while the queue loads.
  raw.value = await fetchRecordistRawClip(props.voiceId, props.lineId)
  probing.value = false
  if (raw.value.available) measure(raw.value.url, 'raw')
  else durations.raw = false
  measure(processedUrl.value, 'processed')
})
onBeforeUnmount(stop)
</script>

<style scoped>
/* Same vocabulary as StoredTakeButton and the recordist card around it — this
   is one more row in that list, not a new surface. */
.ab {
  display: flex; flex-direction: column; gap: 0.4rem;
  margin-top: 0.5rem; padding: 0.6rem 0.7rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.14);
}
.ab-line { display: flex; align-items: center; gap: 0.6rem; justify-content: space-between; }
.ab-btn {
  display: inline-flex; align-items: center; gap: 0.45rem;
  flex: 1; min-width: 0; min-height: 44px;          /* thumb-sized: this is a phone */
  padding: 0.45rem 0.6rem; border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: var(--color-paper, #f7f7f2);
  font-size: 0.76rem; text-align: left; cursor: pointer;
}
.ab-btn.playing { background: rgba(6, 255, 165, 0.18); border-color: var(--color-emerald, #06ffa5); }
.ab-icon { font-family: 'IBM Plex Mono', monospace; }
.ab-name { flex: 1; min-width: 0; }
.ab-tag {
  font-family: 'IBM Plex Mono', monospace; font-size: 0.6rem;
  letter-spacing: 0.08em; padding: 0.1rem 0.3rem; border-radius: 3px; font-weight: 700;
}
.ab-tag.raw { background: #ffb703; color: #241a00; }
.ab-tag.proc { background: var(--color-emerald, #06ffa5); color: #04211a; }
.ab-dur {
  font-family: 'IBM Plex Mono', monospace; font-size: 0.72rem;
  color: var(--color-paper-dim, #c1c1bb); white-space: nowrap;
}
.ab-note { font-size: 0.75rem; color: var(--color-paper-dim, #c1c1bb); margin: 0; line-height: 1.45; }
.ab-note.absent { color: var(--color-tungsten, #ffa630); }
.ab-note.error { color: #ff9d9d; }
.ab-delta {
  margin: 0.15rem 0 0; font-family: 'IBM Plex Mono', monospace; font-size: 0.72rem;
  color: var(--color-paper-dim, #c1c1bb);
}
.ab-delta.alarm { color: var(--color-tungsten, #ffa630); }

:root[data-theme="light"] .ab,
:root[data-theme="light"] .ab-btn { border-color: var(--line); }
</style>
