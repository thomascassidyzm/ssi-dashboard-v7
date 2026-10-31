<script setup>
/**
 * ✂ Cut — edit an existing recording (job #410). The human door to the same tool agents call:
 * POST /api/production/:courseCode/clip-cut (services/shared/clip-cut.cjs). Mark the pieces with `|`
 * in the line's text, Try cut (a dry run: whisper finds and checks every seam), listen to each piece,
 * then Apply files the cut in the edit log. Nothing is rendered and no clip is made or deleted: a
 * piece is a span of the line's own clip, so it is the same voice by construction.
 */
import { ref, computed, watch } from 'vue'
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'

const props = defineProps({
  courseCode: { type: String, required: true },
  sentence: { type: Object, required: true },
  audioBase: { type: String, default: 'https://saysomethingin.app/api/audio' },
})
const { getAccessToken } = useAuth()

const open = ref(false)
const marked = ref('')
const busy = ref(false)
const result = ref(null)
const error = ref('')
const filed = ref('')

watch(() => props.sentence && props.sentence.id, () => {
  open.value = false; result.value = null; error.value = ''; filed.value = ''
  marked.value = String(props.sentence?.target_text || '')
}, { immediate: true })

const pieces = computed(() => marked.value.split('|').map((p) => p.trim()).filter(Boolean))

async function call(dryRun) {
  busy.value = true; error.value = ''
  try {
    const token = await getAccessToken()
    const res = await fetch(`${getApiUrl()}/api/production/${encodeURIComponent(props.courseCode)}/clip-cut`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        sourceAudioId: props.sentence.target_audio_id,
        knownAudioId: props.sentence.known_audio_id || null,
        knownText: props.sentence.known_text || null,
        podSentenceId: props.sentence.id || null,
        pieces: pieces.value,
        // Apply files exactly the seams that were listened to
        ...(dryRun || !result.value ? {} : { cutsMs: result.value.pieces.slice(1).map((p) => p.startMs) }),
        dryRun,
      }),
    })
    const out = await res.json()
    if (!out.ok && !out.pieces) throw new Error(out.error || `HTTP ${res.status}`)
    if (dryRun) result.value = out
    else if (out.ok) filed.value = `Filed (edit ${out.eventId})`
    else error.value = out.error
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

let playing = null
function play(p) {
  if (playing) { playing.pause(); playing = null }
  const a = new Audio(`${props.audioBase}/${props.sentence.target_audio_id}?courseId=${encodeURIComponent(props.courseCode)}`)
  playing = a
  a.addEventListener('loadedmetadata', () => { a.currentTime = p.startMs / 1000; a.play() }, { once: true })
  a.addEventListener('timeupdate', () => { if (a.currentTime * 1000 >= p.endMs + 30) a.pause() })
}
</script>

<template>
  <div class="clip-cut">
    <button v-if="!open" class="cut-btn" :disabled="!sentence.target_audio_id" @click="open = true" title="Cut this line's recording into pieces — no re-recording">✂ Cut</button>
    <div v-else class="cut-panel">
      <div class="lbl">Mark the pieces with <b>|</b> — the recording is cut, never re-recorded</div>
      <textarea v-model="marked" rows="2" :dir="'auto'"></textarea>
      <div class="row">
        <button :disabled="busy || pieces.length < 2" @click="call(true)">{{ busy ? 'Listening…' : `Try cut (${pieces.length} pieces)` }}</button>
        <button v-if="result && result.verified" :disabled="busy" @click="call(false)">Apply</button>
        <button @click="open = false">Close</button>
      </div>
      <div v-if="error" class="err">{{ error }}</div>
      <div v-if="filed" class="ok">{{ filed }}</div>
      <ol v-if="result && result.pieces" class="pieces">
        <li v-for="(p, i) in result.pieces" :key="i" :class="{ bad: !p.verified }">
          <button @click="play(p)">▶</button>
          <span dir="auto">{{ p.text }}</span>
          <span class="muted"> {{ p.startMs }}–{{ p.endMs }} ms · heard “{{ p.heard }}” ({{ p.sim }})</span>
        </li>
      </ol>
      <div v-if="result && result.pieces" class="muted">{{ result.verified ? 'Every piece heard back as its own words.' : 'Not verified: adjust the pieces and try again.' }}</div>
    </div>
  </div>
</template>

<style scoped>
.clip-cut { margin-top: 0.5rem; }
.cut-panel { display: flex; flex-direction: column; gap: 0.4rem; }
.cut-panel textarea { width: 100%; font: inherit; }
.row { display: flex; gap: 0.4rem; }
.pieces { margin: 0; padding-left: 1.2rem; }
.pieces li.bad { color: #b45309; }
.err { color: #b91c1c; }
.ok { color: #15803d; }
.muted { opacity: 0.7; font-size: 0.85em; }
.lbl { font-size: 0.85em; opacity: 0.8; }
</style>
