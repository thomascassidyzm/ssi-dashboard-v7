<script setup>
/**
 * GIVING CONSENT TO A VOICE — the key to the lock the estate shipped.
 *
 * Tom, 2026-08-31, looking at the Voice Lab: "there is no way to give consent
 * to a voice here."
 *
 * Consent became REQUIRED to cast a voice that day — refused server-side, at
 * every door — and nothing on this page could satisfy it for a voice that
 * already existed. So nine voices, Tom's own clone and the Welsh recordists
 * among them, were simply stuck. This panel is the way through, and it is
 * deliberately the SAME mechanism as the clone routes rather than a second one:
 *
 *   AT A MICROPHONE   they read the line aloud, into this page, and the backend
 *                     transcribes it and refuses the consent if the line is not
 *                     in the recording. Not a tick box: the body that consented
 *                     and the voice being consented to are audibly the same one.
 *   NOT AT ONE        a named human states it instead — the same attestation
 *                     wording the upload route uses. Weaker, truthful, and
 *                     recorded as `attested` so the two are never confused.
 *
 * THE WORDS ARE NOT IN THIS FILE. They come from `params.consent`, which is the
 * same string the backend stores on the voice, so what somebody was shown and
 * what they agreed to cannot drift apart.
 *
 * ── HEAR IT FIRST ───────────────────────────────────────────────────────────
 * The panel's first control plays the voice, because a consent given to a voice
 * nobody has heard is not consent to anything. That is also the ruled shape of
 * the clone flow: the person hears their own clone and confirms it.
 *
 * ── NO IS AS EASY AS YES ────────────────────────────────────────────────────
 * One tap, the same size, on the same row. A refusal that takes more effort
 * than an approval is a thumb on the scale, and this is the panel where a real
 * person's answer is being recorded.
 */
import { computed, ref, watch } from 'vue'

const props = defineProps({
  voiceId: { type: String, required: true },
  name: { type: String, default: '' },
  /** The `consent` block the backend computed. Null when the voice carries none. */
  consent: { type: Object, default: null },
  /** params.consent — the stored wording, and whether this box can listen. */
  wording: { type: Object, default: () => ({}) },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' },
  /** What the machine heard, when it refused a reading. Shown, never hidden. */
  heard: { type: String, default: '' },
  /** The judging-set state for this voice, so it can be heard from in here. */
  clips: { type: Object, default: null },
  playing: { type: String, default: '' },
})

const emit = defineEmits(['close', 'spoken', 'attested', 'decide', 'hear'])

const person = ref('')
const attestedBy = ref('')
const agreed = ref(false)

const phrase = computed(() => props.wording?.spokenPhrase || '')
const attestation = computed(() => props.wording?.attestation || '')
const canListen = computed(() => props.wording?.canListen !== false)

watch(() => props.voiceId, () => {
  person.value = props.consent?.person || ''
  attestedBy.value = ''
  agreed.value = false
  clearTake()
}, { immediate: true })

// ── The microphone ─────────────────────────────────────────────────────────
// MediaRecorder and nothing else, the same as the clone panel's recorder. A
// browser that will not give the page a microphone says so in one line and the
// attestation is still there — a half-alive recorder that captures nothing is
// worse than no recorder.
const recorder = ref(null)
const recording = ref(false)
const takeUrl = ref('')
const takeSeconds = ref(0)
const micError = ref('')
let take = null
let ticker = null
let chunks = []

const canRecord = typeof window !== 'undefined'
  && typeof window.MediaRecorder !== 'undefined'
  && Boolean(navigator?.mediaDevices?.getUserMedia)

function clearTake () {
  if (takeUrl.value) URL.revokeObjectURL(takeUrl.value)
  takeUrl.value = ''
  takeSeconds.value = 0
  take = null
}

async function startRecording () {
  micError.value = ''
  clearTake()
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    chunks = []
    mr.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data) }
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' })
      take = new File([blob], 'consent.webm', { type: blob.type })
      takeUrl.value = URL.createObjectURL(blob)
      recording.value = false
      clearInterval(ticker)
    }
    mr.start()
    recorder.value = mr
    recording.value = true
    takeSeconds.value = 0
    // Reading one sentence takes seconds, so a minute is a generous ceiling and
    // stops a forgotten tab uploading an hour of room noise.
    ticker = setInterval(() => {
      takeSeconds.value += 1
      if (takeSeconds.value >= 60) stopRecording()
    }, 1000)
  } catch (e) {
    recording.value = false
    micError.value = `The microphone is not available here — ${e.message}`
  }
}

function stopRecording () {
  try { recorder.value?.stop() } catch { /* already stopped */ }
  clearInterval(ticker)
}

function sendSpoken () {
  if (!take) return
  emit('spoken', { file: take, person: person.value.trim() })
}

function sendAttested () {
  emit('attested', { person: person.value.trim(), attestedBy: attestedBy.value.trim(), agreed: agreed.value })
}

/** The two answers that are a person saying no. Same tap, same weight. */
function sendDecision (status) {
  emit('decide', { status, person: person.value.trim() })
}

const spokenReady = computed(() => Boolean(take) && Boolean(person.value.trim()) && !props.busy)
const attestedReady = computed(() => agreed.value && Boolean(attestedBy.value.trim()) && Boolean(person.value.trim()) && !props.busy)
const hue = computed(() => ({
  authorised: 'ui-hue-good',
  awaiting_authorisation: 'ui-hue-warn',
  refused: 'ui-hue-bad',
  withdrawn: 'ui-hue-bad',
  not_recorded: 'ui-hue-warn',
}[props.consent?.status || 'not_recorded']))
</script>

<template>
  <section class="vl-vc">
    <header class="vl-vc-head">
      <strong class="vl-vc-name">{{ name || voiceId }}</strong>
      <span class="ui-pill" :class="hue">{{ consent ? consent.label : 'no consent recorded' }}</span>
      <span v-if="consent && consent.authorised && consent.declaration" class="vl-vc-quote">“{{ consent.declaration.words }}”</span>
      <button class="ui-sort-btn vl-vc-close" @click="emit('close')">Close</button>
    </header>

    <!-- HEAR IT. A consent given to a voice nobody has listened to is consent
         to nothing, and this is also where the person hears themselves. -->
    <div class="vl-vc-hear">
      <button
        v-for="c in (clips?.clips || [])"
        :key="c.lineIndex"
        class="vl-vc-clip"
        :class="{ 'is-empty': !c.url, 'is-playing': playing === `${voiceId}:${c.lineIndex}` }"
        @click="emit('hear', c.lineIndex)"
      >{{ playing === `${voiceId}:${c.lineIndex}` ? '■' : '▶' }} {{ (clips.lines[c.lineIndex] || {}).text }}</button>
      <span v-if="clips && clips.why" class="vl-vc-why">{{ clips.why }}</span>
    </div>

    <div class="vl-vc-row">
      <label class="vl-vc-label">Whose voice</label>
      <input v-model="person" class="ui-field" placeholder="their name" />
    </div>

    <!-- THE LINE, READ ALOUD. The strong route, and the default, because it is
         the one that proves who was at the microphone. -->
    <div v-if="canRecord && canListen" class="vl-vc-block">
      <p class="vl-vc-phrase">“{{ phrase }}”</p>
      <div class="vl-vc-controls">
        <button v-if="!recording" class="vl-btn" :disabled="busy" @click="startRecording">
          {{ takeUrl ? 'Record again' : 'Record' }}
        </button>
        <button v-else class="vl-btn is-rec" @click="stopRecording">Stop · {{ takeSeconds }}s</button>
        <audio v-if="takeUrl" :src="takeUrl" controls class="vl-vc-audio" />
        <button v-if="takeUrl" class="vl-btn" :disabled="!spokenReady" @click="sendSpoken">Save this consent</button>
      </div>
      <p v-if="micError" class="vl-vc-err">{{ micError }}</p>
      <p v-if="heard" class="vl-vc-err">Heard: “{{ heard }}”</p>
    </div>

    <!-- NOT AT A MICROPHONE. Same wording every other attestation in the estate
         uses, signed by a named human. -->
    <div class="vl-vc-block">
      <label class="vl-vc-attest">
        <input v-model="agreed" type="checkbox" />
        <span>“{{ attestation }}”</span>
      </label>
      <div class="vl-vc-controls">
        <input v-model="attestedBy" class="ui-field vl-vc-by" placeholder="who is saying it" />
        <button class="vl-btn" :disabled="!attestedReady" @click="sendAttested">Save this consent</button>
      </div>
    </div>

    <div class="vl-vc-controls vl-vc-no">
      <button class="vl-btn is-no" :disabled="busy || !person.trim()" @click="sendDecision('refused')">They said no</button>
      <button v-if="consent && consent.authorised" class="vl-btn is-no" :disabled="busy" @click="sendDecision('withdrawn')">They withdrew</button>
    </div>

    <p v-if="error" class="vl-vc-err">{{ error }}</p>
  </section>
</template>

<style scoped>
.vl-vc { border: 1px solid var(--line); border-radius: 8px; padding: .75rem 1rem; margin-top: .75rem; display: flex; flex-direction: column; gap: .6rem; }
.vl-vc-head { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.vl-vc-name { flex: none; }
.vl-vc-quote { opacity: .7; font-size: .75rem; }
.vl-vc-close { margin-left: auto; }
.vl-vc-hear { display: flex; flex-wrap: wrap; gap: .4rem; }
.vl-vc-clip {
  display: inline-flex; align-items: center; gap: .4rem; max-width: 100%;
  border: 1px solid var(--line); background: transparent; color: inherit;
  border-radius: 999px; padding: .2rem .7rem; font: inherit; font-size: .8125rem;
  cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
/* Not yet rendered: outline only. Tapping it renders it — the state is the invitation. */
.vl-vc-clip.is-empty { opacity: .5; border-style: dashed; }
.vl-vc-clip.is-playing { background: var(--accent, #6366f1); border-color: var(--accent, #6366f1); color: #fff; }
.vl-vc-why { font-size: .75rem; opacity: .6; align-self: center; }
.vl-vc-row, .vl-vc-controls { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.vl-vc-label { font-size: .8125rem; opacity: .7; }
.vl-vc-block { display: flex; flex-direction: column; gap: .4rem; border-top: 1px solid var(--line); padding-top: .6rem; }
.vl-vc-phrase { margin: 0; font-size: .875rem; }
.vl-vc-attest { display: flex; align-items: flex-start; gap: .5rem; font-size: .8125rem; }
.vl-vc-by { min-width: 12rem; }
.vl-vc-audio { height: 2rem; }
.vl-vc-no { border-top: 1px solid var(--line); padding-top: .6rem; }
.vl-btn {
  border: 1px solid var(--line); background: transparent; color: inherit;
  border-radius: 6px; padding: .3rem .8rem; font: inherit; font-size: .8125rem; font-weight: 600; cursor: pointer;
}
.vl-btn:disabled { opacity: .45; cursor: default; }
.vl-btn.is-rec { background: var(--hue-bad-bg, rgba(239, 68, 68, .16)); border-color: var(--hue-bad-fg, #dc2626); }
.vl-btn.is-no { color: var(--hue-bad-fg, #b91c1c); }
.vl-vc-err { margin: 0; font-size: .8125rem; color: var(--hue-bad-fg, #b91c1c); }
</style>
