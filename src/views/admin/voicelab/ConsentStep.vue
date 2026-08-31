<script setup>
/**
 * THE CONSENT STEP — the key to the standing consent block, wherever a screen
 * gets refused.
 *
 * Tom, 2026-08-31: "we are never going to use a voice without consent." The
 * block that ruling produced refuses at every cast and every render. It could
 * only ever be SATISFIED at the moment a voice was born — inside the Voice
 * Lab's clone flows, or in recordist onboarding — so PodLab's cast screen,
 * which casts voices it did not create, had a lock with no key: casting a new
 * pod speaker was impossible for anybody.
 *
 * This is the key, and it is deliberately ONE component rather than a second
 * copy of the Voice Lab's flow, so the day the wording or the check changes
 * there is one place it changes.
 *
 * ── THE TWO WAYS THROUGH, AND WHY THEY ARE DIFFERENT STRENGTHS ─────────────
 *   READ IT ALOUD   the person is here. They read the line into the browser's
 *                   microphone and the backend transcribes THOSE VERY BYTES
 *                   with the local whisper. The body that consented and the
 *                   body being used are audibly the same one. Recorded as
 *                   `spoken`.
 *   STATE IT        the person is not here — the commonest case when casting an
 *                   existing voice. A named human states it and signs it.
 *                   Recorded as `attested`, in its own column, so the weaker
 *                   evidence can never be reported later as the stronger.
 *
 * THE WORDS ARE NOT IN THIS FILE. They come from the backend
 * (services/voicelab/declaration.cjs), which is also what gets written onto the
 * voice — so what somebody was shown and what the database says they agreed to
 * cannot drift apart when Tom redlines the sentence.
 *
 * IT DECIDES NOTHING. Whether the consent is good enough is the backend's
 * answer, every time; this component collects and shows.
 */
import { ref, computed, onMounted, watch } from 'vue'
import { api } from './labApi'

const props = defineProps({
  /** The voice the gate refused. */
  voiceId: { type: String, required: true },
  /** The refusal sentence the server gave, shown verbatim. */
  reason: { type: String, default: '' },
  /** Whose voice it is, if the caller already knows. Editable either way. */
  person: { type: String, default: '' },
  /** Only used if the voice has no `voices` row and one must be created. */
  language: { type: String, default: '' },
})
const emit = defineEmits(['recorded', 'cancel'])

const wording = ref(null)
const wordingError = ref('')
const personName = ref(props.person)
const attestedBy = ref('')
const agreed = ref(false)
const busy = ref(false)
const error = ref('')
const heard = ref('')

watch(() => props.person, (v) => { if (v && !personName.value) personName.value = v })

onMounted(async () => {
  try { wording.value = await api.consentWording() } catch (e) { wordingError.value = e.message }
})

// ── Recording, MediaRecorder and nothing else ───────────────────────────────
// Same shape as the Voice Lab's clone recorder: no library, no upload until the
// operator has heard the take back. A recorder that silently captures nothing
// is worse than no recorder, so a browser that will not give us a microphone
// says so in one line and the attestation is right there underneath.
const canRecord = typeof window !== 'undefined'
  && typeof window.MediaRecorder !== 'undefined'
  && Boolean(navigator?.mediaDevices?.getUserMedia)

const recorder = ref(null)
const recording = ref(false)
const recordedUrl = ref('')
const recordSeconds = ref(0)
let recordTimer = null
let recordedChunks = []
let clipFile = null

/** A hard stop, so a forgotten tab cannot record for an hour. */
const RECORD_MAX_SECONDS = 60

/** Can the backend actually listen? If not, the spoken route is not offered. */
const backendCanListen = computed(() => wording.value?.canListen !== false)
const mode = ref('spoken')
const effectiveMode = computed(() => (canRecord && backendCanListen.value ? mode.value : 'attested'))

function clearRecording () {
  if (recordedUrl.value) URL.revokeObjectURL(recordedUrl.value)
  recordedUrl.value = ''
  recordSeconds.value = 0
  clipFile = null
}

async function startRecording () {
  error.value = ''
  heard.value = ''
  clearRecording()
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    recordedChunks = []
    mr.ondataavailable = (e) => { if (e.data?.size) recordedChunks.push(e.data) }
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(recordedChunks, { type: mr.mimeType || 'audio/webm' })
      clipFile = new File([blob], 'consent.webm', { type: blob.type })
      recordedUrl.value = URL.createObjectURL(blob)
      recording.value = false
      clearInterval(recordTimer)
    }
    mr.start()
    recorder.value = mr
    recording.value = true
    recordSeconds.value = 0
    recordTimer = setInterval(() => {
      recordSeconds.value += 1
      if (recordSeconds.value >= RECORD_MAX_SECONDS) stopRecording()
    }, 1000)
  } catch (e) {
    recording.value = false
    error.value = `The microphone is not available here — ${e.message}. Use the written statement instead.`
    mode.value = 'attested'
  }
}

function stopRecording () {
  try { recorder.value?.stop() } catch { /* already stopped */ }
  clearInterval(recordTimer)
}

const ready = computed(() => {
  if (!personName.value.trim()) return false
  if (effectiveMode.value === 'spoken') return Boolean(clipFile)
  return agreed.value && Boolean(attestedBy.value.trim())
})

async function submit () {
  error.value = ''
  heard.value = ''
  busy.value = true
  try {
    let out
    if (effectiveMode.value === 'spoken') {
      const fd = new FormData()
      fd.append('sampleFrom', 'record')
      fd.append('person', personName.value.trim())
      if (props.language) fd.append('language', props.language)
      // Sent alongside the clip so that a box which turns out to be unable to
      // listen falls to the attestation rather than dead-ending the person —
      // the backend's own third outcome, not a branch invented here.
      if (agreed.value && attestedBy.value.trim()) {
        fd.append('declarationAgreed', 'true')
        fd.append('attestedBy', attestedBy.value.trim())
      }
      fd.append('clip', clipFile)
      out = await api.recordConsentDeclaration(props.voiceId, fd)
    } else {
      out = await api.recordConsentDeclaration(props.voiceId, {
        sampleFrom: 'attested',
        person: personName.value.trim(),
        declarationAgreed: 'true',
        attestedBy: attestedBy.value.trim(),
        language: props.language || null,
      })
    }
    emit('recorded', out)
  } catch (e) {
    error.value = e.message
    // The backend rides its branch flags alongside the sentence, so the screen
    // never has to string-match English prose that is Tom's to redline.
    const d = e.data || {}
    if (d.declarationNotHeard) heard.value = d.heard || ''
    if (d.needsAttestation) mode.value = 'attested'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="cs-step">
    <div class="cs-head">
      <strong>Consent needed for {{ voiceId }}</strong>
      <button class="cs-link" @click="emit('cancel')">Cancel</button>
    </div>
    <p v-if="reason" class="cs-reason">{{ reason }}</p>
    <p v-if="wordingError" class="cs-err">The consent wording could not be loaded — {{ wordingError }}</p>

    <label class="cs-field">
      <span>Whose voice is this?</span>
      <input v-model="personName" placeholder="Their name" />
    </label>

    <div v-if="canRecord && backendCanListen" class="cs-modes">
      <button :class="['cs-mode', { on: mode === 'spoken' }]" @click="mode = 'spoken'">They are here — read it aloud</button>
      <button :class="['cs-mode', { on: mode === 'attested' }]" @click="mode = 'attested'">They are not here — state it</button>
    </div>

    <template v-if="effectiveMode === 'spoken'">
      <p class="cs-say">Ask them to say, out loud:</p>
      <blockquote class="cs-words">{{ wording?.spokenPhrase || '…' }}</blockquote>
      <div class="cs-row">
        <button v-if="!recording" class="cs-btn" @click="startRecording">● Record</button>
        <button v-else class="cs-btn cs-rec" @click="stopRecording">■ Stop — {{ recordSeconds }}s</button>
        <audio v-if="recordedUrl" :src="recordedUrl" controls />
        <button v-if="recordedUrl && !recording" class="cs-link" @click="startRecording">Record it again</button>
      </div>
      <p v-if="heard" class="cs-heard">What came through instead: “{{ heard }}”</p>
    </template>

    <template v-else>
      <p v-if="!canRecord" class="cs-note">This browser will not give the page a microphone, so the written statement is the way through.</p>
      <p v-else-if="!backendCanListen" class="cs-note">This machine cannot listen to a recording to check the line was read, so the written statement is the way through.</p>
      <label class="cs-tick">
        <input v-model="agreed" type="checkbox" />
        <span>{{ wording?.attestation || '…' }}</span>
      </label>
      <label class="cs-field">
        <span>Who is making this statement?</span>
        <input v-model="attestedBy" placeholder="Their name" />
      </label>
    </template>

    <p v-if="error" class="cs-err">{{ error }}</p>
    <button class="cs-btn cs-go" :disabled="!ready || busy" @click="submit">
      {{ busy ? 'Recording consent…' : 'Record this consent' }}
    </button>
  </div>
</template>

<style scoped>
.cs-step { border: 1px solid var(--ui-warn, #d08b17); border-radius: .5rem; padding: .75rem 1rem; margin: .5rem 0; display: flex; flex-direction: column; gap: .5rem; }
.cs-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
.cs-reason { margin: 0; opacity: .85; font-size: .875rem; }
.cs-say { margin: .25rem 0 0; font-size: .875rem; opacity: .8; }
.cs-words { margin: 0; padding: .5rem .75rem; border-left: 3px solid currentColor; opacity: .95; font-size: .9375rem; }
.cs-field { display: flex; flex-direction: column; gap: .2rem; font-size: .8125rem; }
.cs-field input { padding: .35rem .5rem; }
.cs-modes { display: flex; gap: .5rem; flex-wrap: wrap; }
.cs-mode { padding: .3rem .6rem; font-size: .8125rem; cursor: pointer; opacity: .6; }
.cs-mode.on { opacity: 1; font-weight: 600; }
.cs-row { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
.cs-tick { display: flex; gap: .5rem; align-items: flex-start; font-size: .875rem; }
.cs-btn { padding: .35rem .8rem; cursor: pointer; }
.cs-rec { font-weight: 600; }
.cs-go { align-self: flex-start; }
.cs-link { background: none; border: none; text-decoration: underline; cursor: pointer; font-size: .8125rem; padding: 0; }
.cs-err { margin: 0; color: var(--ui-bad, #c0392b); font-size: .8125rem; }
.cs-note, .cs-heard { margin: 0; font-size: .8125rem; opacity: .8; }
</style>
