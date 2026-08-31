<script setup>
/**
 * LANGUAGES — the Voice Lab's per-language view.
 *
 * Tom, 2026-08-28: "a single place to check configured voices per language …
 * each language needs 2 voices, 1 male and 1 female as standard, with backups
 * in case for whatever reason there's a problem … human voices will also be
 * configured here as well".
 *
 * ONE ROW PER LANGUAGE, LIVE COURSES FIRST. Tom's ruling, 2026-08-29, looking
 * at the live page: "the order of languages is weird on the main page - doesn't
 * seem to follow any discernible logic". The order is now LIVE COURSES FIRST,
 * THEN COURSE COUNT DESCENDING, THEN ALPHABETICAL BY LANGUAGE NAME — the name
 * as he reads it, never the three-letter code, which is not a sort key anyone
 * can see. Status came OUT of the row order: it was a defensible choice by the
 * previous worker, but the chips, the colours and the status filters are how a
 * gap reads as a gap, and they are all untouched. An empty slot is still drawn
 * as an empty slot rather than omitted.
 *
 * The name leg lives HERE rather than in registry.cjs because `languageName`
 * fetches its CSV asynchronously and is a front-end module; the server emits
 * the first two legs and a stable code tiebreak underneath this.
 *
 * THE STATUSES ARE NOT INTERCHANGEABLE, and the colours say so:
 *   complete  both primary slots (1 male, 1 female) cast — read as written
 *             (Tom, 2026-08-28): TWO voices make a language complete, full
 *             stop. A missing backup never counts against this — it shows as
 *             a quiet "no fallback" flag beside the status, not a colour.
 *   partial   some primary slots cast, some not
 *   uncast    a provider could speak it; nobody is cast — the real blocker
 *   nocover   Cartesia does not publish this language; the ladder uses Azure
 *   human     human-recorded only. NOT a gap: a human recording wins wherever
 *             it exists, so Welsh reads as human, never as a missing voice.
 *
 * TWO PROVIDER COLUMNS, AND THEY ARE DIFFERENT QUESTIONS (Tom, 2026-08-29):
 *   IN USE NOW      what the language's courses actually store in their own
 *                   voice_config, counted in COURSES. This is the fact, and it
 *                   is the reason the rework exists: xAI is being deprecated
 *                   and 29 courses are on it today.
 *   IF RE-RENDERED  what the provider policy would choose for a NEW render.
 *                   Hypothetical, still useful, and it answers "azure" almost
 *                   everywhere — which is why it used to be titled "default
 *                   provider" and read as a claim about the estate that was
 *                   simply untrue.
 *
 * EVERY LANGUAGE IS NAMED, not just coded. Tom: "I can't tell which language
 * I'm looking at when I select it." Full name beside the code — both, because
 * the code is what the rest of the estate is keyed on — and the expanded voice
 * picker carries a sticky header saying whose slots those are.
 *
 * THE GUIDE VOICE IS A THIRD KIND OF SLOT (Tom, 2026-08-29). The instructions
 * and encouragements "are not linked to a course per se - they are linked to
 * every course with the same known language, because these are messages to the
 * learner". So it is cast against the language as a KNOWN language, it is ONE
 * voice rather than a male/female pair, and it sits in its own labelled block
 * beside the phrase slots rather than mixed in among them. Two rules:
 *   — it NEVER counts toward complete/partial/uncast. Only twelve of the
 *     estate's languages are ever a known language; letting an empty guide
 *     count would turn 68 rows amber and stop the screen saying anything.
 *   — the voice ALREADY speaking a language's instructions is shown beside the
 *     empty slot, measured from the clips that exist. "English is currently
 *     Aran, uncast" is the whole point: casting confirms a fact rather than
 *     choosing from nothing.
 *
 * Casting writes voice_language_roles and NOTHING else — no render is
 * triggered, no course_audio row is touched, no course voice_config is written.
 */
import { ref, computed, onMounted } from 'vue'
import { api, clipUrl } from './labApi'
import CandidateVoices from './CandidateVoices.vue'
import VoiceConsent from './VoiceConsent.vue'
import ConsentBadge from './ConsentBadge.vue'
import CloneConfirm from './CloneConfirm.vue'
// The estate's ONE place that turns a code into words. Importing it also kicks
// off the CSV name fetch, so nothing else here has to.
import { languageName } from '@/utils/languageNames'

/**
 * `params` is the /api/voicelab/params payload, passed down from VoiceLab
 * rather than fetched again here. It is OPTIONAL and may be null: this panel
 * deliberately renders on a backend that has no render path at all, because
 * "what is cast where" is worth knowing regardless.
 *
 * The one thing it carries that this panel needs is `consent` — the exact
 * wording of the line a person reads aloud and of the attestation an uploader
 * agrees to. That wording is NEVER duplicated in this file. It will be
 * redlined, and a second copy in the front end is how a screen starts showing
 * a person different words from the ones recorded against their voice.
 */
const props = defineProps({
  params: { type: Object, default: null },
})

const data = ref(null)
const loading = ref(true)
const error = ref('')
const filter = ref('all')
const provFilter = ref('all')
const q = ref('')
const busy = ref('')
const expanded = ref(null)

// ── SAMPLES: hearing a voice before casting it ─────────────────────────────
//
// Tom, 2026-08-31: assign new Cartesia voices to existing languages "without
// any fuss or bother". The bother was that the only way to judge a candidate
// was its name. So opening a language fetches — never renders — the sample
// state for every voice on offer: a cached clip, or a take the estate already
// owns for that exact line, or the plain fact that it has none yet.
//
// OPENING A LANGUAGE MUST NOT SPEND OR SPIN. The read is three SELECTs and a
// disk read; rendering is a separate, explicitly-pressed button that says what
// it will cost before it is pressed.
const samplesByLang = ref({})     // language code -> { line, samples, missing, chars }
const samplesBusy = ref('')
const playing = ref('')           // the voiceId currently sounding
let audio = null

/** Every voice on offer for a language, phrase and guide alike, de-duplicated. */
function allCandidateIds (lang) {
  const ids = [
    ...(lang.candidates || []).map((c) => c.voiceId),
    ...((lang.guide && lang.guide.candidates) || []).map((c) => c.voiceId),
  ]
  return [...new Set(ids)]
}

/** SPENDS NOTHING. Called when a language is opened, and again after a prepare. */
async function loadSamples (lang) {
  const voices = allCandidateIds(lang)
  if (!voices.length) { samplesByLang.value = { ...samplesByLang.value, [lang.code]: null }; return }
  samplesBusy.value = lang.code
  try {
    const out = await api.samples(lang.code, voices)
    samplesByLang.value = { ...samplesByLang.value, [lang.code]: out }
  } catch (e) {
    // A missing sample is not a broken page: the row still casts. Say what went
    // wrong in the block itself rather than raising the page-level error.
    samplesByLang.value = { ...samplesByLang.value, [lang.code]: { error: e.message, samples: {} } }
  }
  samplesBusy.value = ''
}

/**
 * GENERATE PREVIEW CLIPS — the one action on this row that spends.
 *
 * Tom, 2026-08-31, looking at the live Chinese row: "I want to be able to preview
 * the cartesia voices, so I want to be able to generate cartesia clips or something
 * - must be the same phrases for a fair test." So: ONE TAP ON THE LANGUAGE, every
 * voice the row lists, and THE SAME LINE for all of them — a fair test means no
 * voice is judged on different words from another, which is why the text is the
 * one already shown above and never a per-voice choice.
 *
 * It streams. A twenty-voice row is a couple of minutes of rendering, and each clip
 * is playable the moment it exists rather than when the last one finishes — the row
 * fills in front of you. A backend that has no stream route falls back to the plain
 * call rather than failing, because an older box is not a broken screen.
 *
 * Cached clips are never re-rendered, so a second visit costs nothing at all. That
 * is what makes RE-GENERATE a separate, deliberate second action rather than a
 * hazard sitting under the same button.
 */
const previewRun = ref(null)      // { code, done, total, failed: [] } while generating

/** How many voices a press would render, and what that costs in characters. */
function previewPlan (lang, force = false) {
  const state = samplesByLang.value[lang.code] || {}
  const ids = force ? allCandidateIds(lang).filter((v) => !(state.unrenderable || []).includes(v)) : (state.missing || [])
  const chars = (lineFor(lang)?.text?.length || 0) * ids.length
  return { ids, n: ids.length, chars }
}

/** One clip has landed: make it playable now, without waiting for the rest. */
function addSample (code, voiceId, sample) {
  const cur = samplesByLang.value[code] || { samples: {} }
  samplesByLang.value = {
    ...samplesByLang.value,
    [code]: {
      ...cur,
      samples: { ...(cur.samples || {}), [voiceId]: sample },
      missing: (cur.missing || []).filter((v) => v !== voiceId),
    },
  }
}

async function generatePreviews (lang, { force = false } = {}) {
  const { ids } = previewPlan(lang, force)
  if (!ids.length) return
  previewRun.value = { code: lang.code, done: 0, total: ids.length, failed: [] }
  samplesBusy.value = lang.code
  error.value = ''
  try {
    const onClip = (ev) => {
      if (previewRun.value && previewRun.value.code === lang.code) {
        previewRun.value = {
          ...previewRun.value,
          done: ev.done ?? previewRun.value.done,
          total: ev.total ?? previewRun.value.total,
          failed: ev.error ? [...previewRun.value.failed, ev] : previewRun.value.failed,
        }
      }
      if (ev.url) addSample(lang.code, ev.voiceId, { url: ev.url, durationMs: ev.durationMs || null, free: false, cached: true })
    }
    let out
    try {
      out = await api.prepareSamplesStream(lang.code, ids, { force }, onClip)
    } catch (e) {
      if (!e.noStream) throw e
      out = await api.prepareSamples(lang.code, ids, { force })
    }
    if (out && out.samples) samplesByLang.value = { ...samplesByLang.value, [lang.code]: out }
    else await loadSamples(lang)
    // A voice the provider refused is reported by name. Silently rendering 19 of
    // 20 and saying nothing is how a dot gets mistaken for a decision.
    const failed = (out && out.failed) || []
    if (failed.length) {
      error.value = `${failed.length} voice${failed.length === 1 ? '' : 's'} would not render: ` +
        failed.slice(0, 3).map((f) => `${f.voiceId} (${f.error})`).join('; ') +
        (failed.length > 3 ? ` and ${failed.length - 3} more` : '')
    }
  } catch (e) { error.value = e.message }
  samplesBusy.value = ''
  previewRun.value = null
}

/**
 * The voices that genuinely cannot be previewed, counted BY REASON.
 *
 * Kept and said plainly rather than hidden (Tom's requirement): "cannot be
 * rendered" and "nobody has rendered it yet" are different facts and a screen
 * that draws them the same way is a screen that invites casting a voice nobody
 * has heard. After the Azure path landed this list is human recordings and
 * ElevenLabs, which is a short and honest list.
 */
function unrenderableReasons (lang) {
  const state = samplesByLang.value[lang.code] || {}
  const why = state.unrenderableWhy || {}
  const counts = new Map()
  for (const v of state.unrenderable || []) {
    const reason = why[v] || 'this box has no provider for it'
    counts.set(reason, (counts.get(reason) || 0) + 1)
  }
  return [...counts.entries()].map(([reason]) => reason)
}

function samplesFor (lang) { return (samplesByLang.value[lang.code] || {}).samples || {} }
function lineFor (lang) { return (samplesByLang.value[lang.code] || {}).line || null }

/**
 * One <audio> for the whole page: tapping a second voice stops the first, because
 * two voices talking over each other is not a comparison. A lab clip is behind the
 * dashboard session so it needs the token; an estate clip is a public S3 URL and
 * must not have one bolted on.
 */
async function play (lang, voiceId) {
  const sample = samplesFor(lang)[voiceId]
  if (!sample) return
  if (audio) { audio.pause(); audio = null }
  if (playing.value === voiceId) { playing.value = ''; return }
  const src = /^https?:/.test(sample.url) ? sample.url : await clipUrl(sample.url)
  audio = new Audio(src)
  audio.onended = () => { playing.value = '' }
  audio.onerror = () => { playing.value = ''; error.value = `Could not play the sample for ${voiceId}.` }
  playing.value = voiceId
  audio.play().catch((e) => { playing.value = ''; error.value = e.message })
}

/** Opening a language loads its samples once; closing stops whatever is sounding. */
function toggleLanguage (lang) {
  if (audio) { audio.pause(); audio = null; playing.value = '' }
  if (expanded.value === lang.code) { expanded.value = null; return }
  expanded.value = lang.code
  if (!samplesByLang.value[lang.code]) loadSamples(lang)
}

// ── Cloning ────────────────────────────────────────────────────────────────
// One sample in, one voice id out. Cartesia's POST /voices/clone IS the INSTANT
// path — verified against their live reference 2026-08-30: the parameters are
// clip, name, language and four optional descriptors, and there is NO mode or
// fidelity parameter, so there is nothing to pin. Their "Pro Voice Clone" is a
// separate product and is not reachable from this endpoint at all, which is
// what Tom asked for ("just the instant clones").
//
// The sample comes from ONE OF THREE PLACES, and as of Tom's inversion of
// 2026-08-31 the first is the default: a recording the estate ALREADY HOLDS, a
// file, or the microphone on this page. Cartesia asks for at least 10 seconds
// and recommends up to 60 for a less common accent, clean, no pauses — verified
// against their live documentation 2026-08-31 — so the recorder says the
// elapsed seconds out loud rather than leaving the operator to guess, and lets
// them listen and redo it before anything is uploaded.
//
// CLONING STILL RENDERS NOTHING. Hearing the result is a SEPARATE press, capped
// at three clips by the backend, and it counts against the lab's ordinary daily
// character ceiling. Keeping the two apart is what stops one click becoming a
// bill.
const showClone = ref(false)
const cloneName = ref('')
const cloneLang = ref('eng')
const cloneGender = ref('')
const cloneFile = ref(null)
const cloneBusy = ref(false)

/**
 * 'estate' | 'upload' | 'record' — where this sample is coming from.
 *
 * ESTATE IS THE DEFAULT and that is Tom's inversion of 2026-08-31: "We do NOT
 * need to ask anyone to record a fresh sample first. We already hold clean
 * studio audio of the people we want to clone, and cloning FROM OUR OWN
 * EXISTING RECORDINGS is the main route, not a fallback." The recorder and the
 * upload are not removed — they are for people the estate holds no audio of —
 * they are demoted to second and third.
 */
const cloneSource = ref('estate')

// ── WHOSE VOICE IS THIS ────────────────────────────────────────────────────
// Required by the backend before it will call Cartesia at all. Not "did they
// say yes" — Tom obtains that, later, and the voice is born marked as awaiting
// authorisation — but "who do we go and ask", because a consent record with
// nobody attached is decorative on the day it is written.
const clonePerson = ref('')
const clonePersonContact = ref('')
const cloneConsentNote = ref('')

// ── THE ESTATE'S OWN RECORDINGS ────────────────────────────────────────────
// Two lists and a tick box, and one warning that is never allowed off the
// screen: origin='human' is a LABEL somebody wrote. Two clone attempts in this
// estate were built from TTS wearing that label and both were dead on arrival
// (docs/tts-bakeoff/aran-welcome-source-candidates-2026-08-27.md). The audio
// plays from the estate's own bucket, so listening costs nothing and is the
// only verification that works.
const speakers = ref([])
const speakersBusy = ref(false)
const speakersError = ref('')
const speakerFilterLang = ref('eng')
const chosenSpeaker = ref(null)
const speakerClips = ref([])
const clipsBusy = ref(false)
const pickedKeys = ref([])
const sampleGuidance = ref(null)

async function loadSpeakers () {
  speakersBusy.value = true
  speakersError.value = ''
  try {
    const out = await api.speakers(speakerFilterLang.value.trim())
    speakers.value = out.speakers || []
    sampleGuidance.value = out.guidance || null
    if (out.unavailable) speakersError.value = out.unavailable
  } catch (e) { speakersError.value = e.message }
  speakersBusy.value = false
}

async function chooseSpeaker (sp) {
  if (chosenSpeaker.value && chosenSpeaker.value.voiceId === sp.voiceId) {
    chosenSpeaker.value = null
    speakerClips.value = []
    pickedKeys.value = []
    return
  }
  chosenSpeaker.value = sp
  pickedKeys.value = []
  clipsBusy.value = true
  speakerClips.value = []
  try {
    const out = await api.speakerClips(sp.voiceId, { language: sp.language })
    // Longest first, which is the recommendation made structural: Cartesia
    // clones best from ONE continuous take, so the clip most worth hearing is
    // at the top rather than under two hundred short drill lines.
    speakerClips.value = out.clips || []
    if (out.guidance) sampleGuidance.value = out.guidance
    if (!cloneLang.value) cloneLang.value = sp.language
  } catch (e) { speakersError.value = e.message }
  clipsBusy.value = false
}

function togglePick (key) {
  const i = pickedKeys.value.indexOf(key)
  if (i >= 0) pickedKeys.value.splice(i, 1)
  else pickedKeys.value.push(key)
}

const pickedSeconds = computed(() => Math.round(
  speakerClips.value.filter((c) => pickedKeys.value.includes(c.s3Key))
    .reduce((n, c) => n + (c.durationMs || 0), 0) / 1000,
))

/** Said before the clone is made, not after it disappoints. */
const pickHint = computed(() => {
  if (!pickedKeys.value.length) return ''
  const n = pickedKeys.value.length
  const sec = pickedSeconds.value
  if (sec < 10) return `${sec}s across ${n} clip(s) — under the 10s floor. It will clone, but thinner.`
  if (n === 1) return `${sec}s, one continuous take. That is the shape that clones best.`
  return `${sec}s across ${n} clips — they will be joined into one file. One long clip clones better: joins carry changes in tone and room sound that the clone can learn.`
})

/**
 * THE CHOSEN FILE, MEASURED — not just named.
 *
 * The three sample routes all answer the same question ("is there enough audio
 * here?") and until now they answered it three different ways: the estate rows
 * print seconds, the recorder counts seconds out loud, and the upload printed
 * nothing but the browser's own "No file chosen". So an operator uploading a
 * file was the only one of the three who could not see the number the whole
 * page is about. `<audio>` gives the duration for free, locally, before
 * anything is sent anywhere.
 */
const fileSeconds = ref(null)

function pickFile (e) {
  cloneFile.value = e.target.files?.[0] || null
  fileSeconds.value = null
  clearRecording()
  if (!cloneFile.value) return
  const probe = new Audio(URL.createObjectURL(cloneFile.value))
  probe.addEventListener('loadedmetadata', () => {
    fileSeconds.value = Number.isFinite(probe.duration) ? Math.round(probe.duration) : null
    URL.revokeObjectURL(probe.src)
  })
  // A file the browser cannot decode still uploads — Cartesia may well accept
  // it — so a failed probe means "no number", never "no file".
  probe.addEventListener('error', () => { fileSeconds.value = null; URL.revokeObjectURL(probe.src) })
}

/** The same sentence the recorder shows, for a file. Seconds, then what they mean. */
const fileHint = computed(() => {
  if (!cloneFile.value) return ''
  const size = `${(cloneFile.value.size / 1024 / 1024).toFixed(1)} MB`
  if (fileSeconds.value == null) return `${cloneFile.value.name} — ${size}`
  if (fileSeconds.value < RECORD_MIN_SECONDS) return `${fileSeconds.value}s — under the ${RECORD_MIN_SECONDS}s floor. It will clone, but thinner.`
  if (fileSeconds.value < 20) return `${fileSeconds.value}s — over the floor. Twenty to sixty seconds clones noticeably steadier.`
  return `${fileSeconds.value}s — a good length.`
})

// ── Recording on the page ──────────────────────────────────────────────────
// MediaRecorder, and nothing else: no library, no upload until the operator has
// heard the take. If the browser or the deployment refuses the microphone we
// say so in one line and the upload path is untouched — a half-alive recorder
// that silently captures nothing is worse than no recorder.
//
// RESTORED 2026-08-31 after the clone-demo rewrite (67794654b) dropped this
// whole block from the script while leaving its buttons in the template. The
// failure was silent and looked like the browser's fault: `canRecord` resolved
// to undefined, so "Record it here" rendered permanently disabled saying "This
// browser will not give the page a microphone", and the file input's @change
// pointed at a `pickFile` that no longer existed, so picking a file set nothing
// and "Create the clone" never armed. Both non-estate clone routes were dead on
// production. Anything the template names must exist in the script — Vue will
// not tell you it doesn't.
const recorder = ref(null)
const recording = ref(false)
const recordedUrl = ref('')
const recordSeconds = ref(0)
const recordError = ref('')
let recordTimer = null
let recordedChunks = []

const canRecord = typeof window !== 'undefined'
  && typeof window.MediaRecorder !== 'undefined'
  && Boolean(navigator?.mediaDevices?.getUserMedia)

/**
 * Cartesia's own guidance, RE-VERIFIED against their live documentation on
 * 2026-08-31: "You can create an instant voice clone with as little as 10
 * seconds of audio", and up to sixty is recommended, more so for a less common
 * accent. Ten is the FLOOR. An older note in this estate
 * (docs/tts-bakeoff/phase2-clone-source-from-clone-2026-08-27.md) quotes it as
 * a ten-second CAP; that is wrong, and the nineteen-second clone Tom judged
 * good on 2026-08-27 is the estate's own refutation of it.
 */
const RECORD_MIN_SECONDS = 10
const RECORD_MAX_SECONDS = 60

function clearRecording () {
  if (recordedUrl.value) URL.revokeObjectURL(recordedUrl.value)
  recordedUrl.value = ''
  recordSeconds.value = 0
}

async function startRecording () {
  recordError.value = ''
  clearRecording()
  cloneFile.value = null
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    // webm/opus is what every browser that has MediaRecorder actually emits,
    // and Cartesia accepts webm — so no transcoding happens anywhere.
    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    recordedChunks = []
    mr.ondataavailable = (e) => { if (e.data?.size) recordedChunks.push(e.data) }
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(recordedChunks, { type: mr.mimeType || 'audio/webm' })
      cloneFile.value = new File([blob], 'sample.webm', { type: blob.type })
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
      // A hard stop, so a forgotten tab cannot record for an hour and then try
      // to upload it into a 25 MB cap.
      if (recordSeconds.value >= RECORD_MAX_SECONDS) stopRecording()
    }, 1000)
  } catch (e) {
    recording.value = false
    recordError.value = `The microphone is not available here — ${e.message}. Upload a file instead.`
  }
}

function stopRecording () {
  try { recorder.value?.stop() } catch { /* already stopped */ }
  clearInterval(recordTimer)
}

const recordHint = computed(() => {
  if (!recordedUrl.value) return ''
  if (recordSeconds.value < RECORD_MIN_SECONDS) {
    return `${recordSeconds.value}s — Cartesia asks for at least ${RECORD_MIN_SECONDS}s. This will clone, but a longer sample clones better.`
  }
  if (recordSeconds.value < 20) return `${recordSeconds.value}s — over the floor. Twenty to sixty seconds clones noticeably steadier.`
  return `${recordSeconds.value}s — a good length.`
})

// ── THE CONSENT STEP ───────────────────────────────────────────────────────
//
// Tom, 2026-09-01, on walking the clone flows: "I have not read the phrase I am
// supposed to read to confirm it is my own voice, or to testify it, if it is an
// upload."
//
// So a live sample now carries its own permission, and the two routes carry it
// differently because only one of them can:
//
//   RECORD  — the person READS A LINE ALOUD inside the recording. It does two
//             jobs at once: it is evidence that the speaker is the person
//             consenting, and it is the consent record itself. The backend
//             transcribes the take with the local whisper and refuses the
//             clone if the line is not in it, so this is not a tick box.
//   UPLOAD  — nobody was here, and no amount of listening to a file tells you
//             who chose to send it. So it becomes an EXPLICIT ATTESTATION: the
//             uploader states this is their own voice or that they hold the
//             right to use it, agrees to it being cloned, and signs it with a
//             name. Recorded against the voice with who and when.
//   ESTATE  — the SAME ATTESTATION as upload (changed 2026-08-31). No live
//             speaker is present, and an existing recording has never been
//             permission — which is exactly why somebody has to state, in
//             writing and signed, that they hold the right to clone this
//             person from our archive. It used to be born awaiting
//             authorisation instead, on the reasoning that there was nobody
//             here to ask; but creating a clone of a real person at a vendor
//             before anyone has said anything is the thing Tom's standing rule
//             is about, and the attestation is one tick and a name.
//
// THE WORDS THEMSELVES ARE NOT IN THIS FILE. They come from
// `params.consent`, which is the same string the backend stores on the voice.
// One copy, so what a person agreed to and what the screen showed them can
// never drift apart.
const declarationAgreed = ref(false)
const attestedBy = ref('')

/**
 * Set when the backend answers that IT CANNOT LISTEN — no whisper on that box.
 * The honest answer then is the same attestation the upload route uses, rather
 * than either a dead end or a silent pass, and the record says `attested`
 * rather than `spoken` so the two are never confused later.
 */
const cannotListen = ref(false)

/** What the machine heard last time it refused a take. Shown, never hidden. */
const declarationHeard = ref('')

/**
 * A refusal, said WHERE THE PERSON IS LOOKING.
 *
 * The panel's own `error` renders below the consent editor and above the
 * language table — several screens down from the Record button on the estate
 * route, and off the bottom on a phone. A gate that refuses somebody's consent
 * and then puts the reason somewhere they cannot see it is the same as not
 * saying anything, so the declaration block carries its own.
 */
const declarationError = ref('')

const spokenPhrase = computed(() => props.params?.consent?.spokenPhrase || '')
const attestationWords = computed(() => props.params?.consent?.attestation || '')
/** What the backend says about its own ability to check a recording. */
const backendCanListen = computed(() => props.params?.consent?.canListen !== false)

/** Which of the two the current source needs, or none. */
const declarationMode = computed(() => {
  if (cloneSource.value === 'upload' || cloneSource.value === 'estate') return 'attested'
  if (cloneSource.value !== 'record') return 'none'
  return (backendCanListen.value && !cannotListen.value) ? 'spoken' : 'attested'
})

/**
 * WHAT THIS CLONE WILL BE BORN AS, shown as a state rather than explained.
 *
 * The panel used to print "born awaiting authorisation" beside the permission
 * note on every route, including the two where it is no longer true. A pill
 * that changes with the route says the same thing in fewer words and cannot
 * go stale against the route it is sitting in.
 */
const bornAs = computed(() => {
  if (declarationMode.value === 'spoken') return { label: 'authorised — by the line they read', hue: 'ui-hue-good' }
  if (declarationMode.value === 'attested') return { label: 'authorised — by the attestation', hue: 'ui-hue-good' }
  return { label: 'awaiting authorisation', hue: 'ui-hue-warn' }
})

function resetDeclaration () {
  declarationAgreed.value = false
  cannotListen.value = false
  declarationHeard.value = ''
  declarationError.value = ''
}

/**
 * Changing the sample route changes which permission applies, so the previous
 * route's answer must not survive the switch. Somebody who agreed to the
 * attestation and then chose to record instead has not read anything aloud.
 */
/**
 * Opening the panel on its default route used to show an empty estate section
 * until you found and pressed "Find speakers we hold" — a route that lands on
 * nothing, for a call that reads the archive and costs nothing. So opening it
 * asks. The button stays, because re-reading after a new recording lands is a
 * real thing to want.
 */
function toggleClone () {
  showClone.value = !showClone.value
  if (showClone.value && cloneSource.value === 'estate' && !speakers.value.length) loadSpeakers()
}

function chooseSource (src) {
  cloneSource.value = src
  resetDeclaration()
  error.value = ''
  if (src === 'estate' && !speakers.value.length) loadSpeakers()
}

// ── THE DEMO: ONE TAP PER CLIP, AND THE CLONES STAY ON SCREEN ──────────────
//
// Tom, 2026-08-31, reframing what this screen is for: he sits with Aran and
// shows him, live, that we can clone his voice from recordings he already made
// — "and does it more than once, from DIFFERENT source clips, so Aran hears how
// the source changes the result… A single perfect clone is worth less here than
// three clones from three sources that Aran can hear the difference between."
//
// Three consequences, and they are the whole design of this block:
//
//   1. ONE TAP. No form to fill per clone. The person is typed ONCE at the top,
//      the name is generated from the clip it came from, and the button on the
//      row does the whole thing: clone, then immediately audition, so the tap
//      ends in audio rather than in an id.
//   2. CLONES ACCUMULATE. `clones` is a LIST, appended to and never overwritten.
//      The previous design kept one `cloneResult` and replaced it — which is
//      exactly the comparison this demo is made of, destroyed on every tap.
//   3. EVERY CLONE SITS BESIDE ITS SOURCE, and both play. Original above, clone
//      below, same row, same words underneath.
//
// ── WHY THE WAIT IS SHOWN RATHER THAN HIDDEN ────────────────────────────────
// Measured live on this box, 2026-08-31, over six real clones: the Cartesia
// clone call runs 6.0s on a 12-second source, 10.4s on a 44-second one and
// 10.7s on an 84-second one — it climbs with source length and then plateaus —
// and the audition adds a further ~2.3s. So a tap is six to thirteen seconds
// before there is anything to hear. That is Cartesia's latency and no amount of
// front-end work removes it.
//
// An unexplained thirteen-second freeze in front of an audience reads as a
// crash. So the row names the stage it is in, counts the seconds out, and says
// the useful thing to do meanwhile: PLAY THE ORIGINAL. That is not a
// consolation — the originals are 44-second welcomes, so playing one covers the
// whole wait exactly, and the demo fills its own dead time.

/**
 * What every clone says, so the clones are comparable with each other and not
 * only with their sources. Deliberately something the speaker has NEVER said —
 * a clone repeating its own source proves nothing, and "saying things you have
 * never said" is the line that landed with Aran on 2026-08-27.
 */
const demoLine = ref('This is my own voice, and I have never said this sentence in my life.')

/** Every clone made in this session, oldest first. NEVER overwritten. */
const clones = ref([])
let cloneSeq = 0

function clonesFor (s3Key) {
  return clones.value.filter((c) => c.s3Key === s3Key)
}

/**
 * Clone from ONE clip and immediately hear it, in a single tap.
 *
 * Each clone is its own row-level operation with its own stage, its own timer
 * and its own error. Nothing here is global: a clone that fails leaves every
 * other clone on screen untouched, which on a live demo is the difference
 * between one awkward moment and a dead page.
 */
async function cloneOne (clip) {
  if (!clonePerson.value) { error.value = 'Type whose voice this is first — one field, at the top.'; return }
  // The one-tap route creates a clone of a real person just as surely as the
  // deliberate one, so it takes the same attestation. Said here as a sentence
  // rather than let through to a 400, because on a live demo a refusal from
  // the server reads like a broken button.
  if (!declarationAgreed.value || !attestedBy.value) {
    error.value = 'Agree to the wording and sign it with a name before cloning — one tick and one field, below the clips.'
    return
  }
  const draft = {
    id: `c${++cloneSeq}`,
    s3Key: clip.s3Key,
    clip,
    speaker: chosenSpeaker.value ? chosenSpeaker.value.voiceId : null,
    stage: 'cloning',
    seconds: 0,
    voice: null,
    consent: null,
    confirmation: null,
    source: null,
    audio: null,
    line: demoLine.value,
    error: '',
  }
  // ⚠️ TAKE THE ENTRY BACK OUT OF THE ARRAY BEFORE MUTATING IT.
  //
  // `clones` is a ref, so reading `clones.value` hands out a REACTIVE PROXY of
  // each object in it. The literal above is the RAW object, and writing to the
  // raw object updates the data without notifying anything — the screen keeps
  // rendering whatever it last drew.
  //
  // Measured on live popty.app, 2026-08-31: a one-tap estate clone completed
  // at Cartesia and was written to `voices`, and ninety seconds later the row
  // still read "cloning — 0s". The seconds never counted and the finished
  // clone never appeared. The deliberate route hid the same bug by accident,
  // because it also writes `cloneBusy` and `cloneFile`, and those repaint the
  // panel — so the one-tap route, which is the route the live demo uses, was
  // the only one visibly broken.
  clones.value = [...clones.value, draft]
  const entry = clones.value[clones.value.length - 1]
  const tick = setInterval(() => { entry.seconds += 1 }, 1000)
  try {
    const made = await api.cloneFromEstate({
      // The name says what it was made from, because that IS the variable
      // under test — three clones called "Aran 1/2/3" would tell Aran nothing.
      name: `${clonePerson.value} — ${clip.role || 'clip'}, ${Math.round(clip.seconds)}s`,
      language: cloneLang.value || (chosenSpeaker.value && chosenSpeaker.value.language) || 'eng',
      gender: cloneGender.value || null,
      person: clonePerson.value,
      personContact: clonePersonContact.value || null,
      consentNote: cloneConsentNote.value || null,
      speaker: entry.speaker,
      s3Keys: [clip.s3Key],
      declarationAgreed: true,
      attestedBy: attestedBy.value,
    })
    entry.voice = made.voice
    entry.consent = made.consent
    entry.confirmation = made.confirmation
    entry.source = made.source
    // THE CLONE AND THE HEARING FAIL SEPARATELY, and that is not tidiness.
    // The clone is free; the audition is the one call that spends, so it is
    // the one that can be refused by the lab's daily character ceiling. If
    // that happens mid-demo the clone still EXISTS — marking the whole row
    // failed would hide a real voice and leave it orphaned in the estate.
    // So the row keeps the clone, shows why it is silent, and offers the
    // retry.
    entry.stage = 'hearing'
    try {
      const heard = await api.auditionVoice({
        voiceId: made.voice.voice_id,
        language: made.voice.languages?.[0] || cloneLang.value || 'eng',
        sentences: [entry.line],
      })
      const first = (heard.clips || [])[0]
      if (first) entry.audio = { ...first, src: await clipUrl(first.url) }
    } catch (e) {
      entry.error = `Cloned, but could not be heard: ${e.message}`
    }
    entry.stage = 'done'
  } catch (e) {
    entry.error = e.message
    entry.stage = 'failed'
  }
  clearInterval(tick)
}

/** Say the demo line again on a clone already made. One clip, same ceilings. */
async function replay (entry) {
  if (!entry.voice) return
  entry.stage = 'hearing'
  entry.error = ''
  try {
    const heard = await api.auditionVoice({
      voiceId: entry.voice.voice_id,
      language: entry.voice.languages?.[0] || 'eng',
      sentences: [demoLine.value],
    })
    const first = (heard.clips || [])[0]
    if (first) entry.audio = { ...first, src: await clipUrl(first.url) }
    entry.line = demoLine.value
  } catch (e) { entry.error = e.message }
  entry.stage = 'done'
}

/** Drop one clone from the estate and from this screen. Tidying up after a demo. */
async function discard (entry) {
  entry.stage = 'removing'
  try {
    if (entry.voice) await api.removeVoice(entry.voice.voice_id)
    clones.value = clones.value.filter((c) => c.id !== entry.id)
  } catch (e) { entry.error = e.message; entry.stage = 'done' }
}

/**
 * Is the deliberate "Create the clone" button armed?
 *
 * RESTORED 2026-08-31 alongside the recorder: 67794654b dropped this computed
 * too, so the template's `:disabled="cloneBusy || !canSubmitClone"` read
 * !undefined — permanently disabled — and submitClone() would have thrown on
 * `.value` had it ever been reachable.
 *
 * The name is NOT required any more: submitClone composes one from the person
 * and the source when the field is left empty, and the button's own hint asks
 * only for the person. So the gate is the person, plus something to clone from.
 */
/**
 * THE ONE MISSING THING, NAMED.
 *
 * The button used to sit under a single fixed sentence — "Name whose voice this
 * is first." — which stayed put even once you had named them, so on the estate
 * path it was telling you to do something you had already done while the real
 * blocker (nothing ticked, eighty rows above) went unmentioned. A disabled
 * control has to say what would arm it, and it has to say the CURRENT one.
 */
const cloneBlocker = computed(() => {
  if (!clonePerson.value) return 'Name whose voice this is.'
  if (cloneSource.value === 'estate') {
    if (!pickedKeys.value.length) return 'Tick the recordings to clone from.'
    if (!declarationAgreed.value) return 'Agree to the wording above.'
    if (!attestedBy.value) return 'Sign the attestation with a name.'
    return ''
  }
  if (!cloneFile.value) return cloneSource.value === 'record' ? 'Record a take first.' : 'Choose a file first.'
  if (declarationMode.value === 'spoken') {
    return spokenPhrase.value ? '' : 'This backend has not sent the line to read.'
  }
  if (!attestationWords.value) return 'This backend has not sent the wording to agree to.'
  if (!declarationAgreed.value) return 'Agree to the wording above.'
  if (!attestedBy.value) return 'Sign the attestation with a name.'
  return ''
})

const canSubmitClone = computed(() => !cloneBlocker.value)

/**
 * The DELIBERATE path: several estate clips joined, or a file, or a recording.
 *
 * It lands in the SAME accumulating list as a one-tap clone. Everything made in
 * this session sits together and nothing replaces anything — which is the point
 * of the demo, and which also quietly fixes the upload path, where a second
 * clone used to wipe the first off the screen.
 */
async function submitClone () {
  if (!canSubmitClone.value) return
  cloneBusy.value = true
  error.value = ''
  const fromEstate = cloneSource.value === 'estate'
  const picked = speakerClips.value.filter((c) => pickedKeys.value.includes(c.s3Key))
  const draft = {
    id: `c${++cloneSeq}`,
    s3Key: fromEstate && picked.length === 1 ? picked[0].s3Key : null,
    clip: fromEstate && picked.length === 1 ? picked[0] : null,
    joined: fromEstate ? picked : [],
    speaker: chosenSpeaker.value ? chosenSpeaker.value.voiceId : null,
    stage: 'cloning',
    seconds: 0,
    voice: null, consent: null, confirmation: null, source: null, audio: null,
    line: demoLine.value,
    error: '',
  }
  // ⚠️ TAKE THE ENTRY BACK OUT OF THE ARRAY BEFORE MUTATING IT.
  //
  // `clones` is a ref, so reading `clones.value` hands out a REACTIVE PROXY of
  // each object in it. The literal above is the RAW object, and writing to the
  // raw object updates the data without notifying anything — the screen keeps
  // rendering whatever it last drew.
  //
  // Measured on live popty.app, 2026-08-31: a one-tap estate clone completed
  // at Cartesia and was written to `voices`, and ninety seconds later the row
  // still read "cloning — 0s". The seconds never counted and the finished
  // clone never appeared. The deliberate route hid the same bug by accident,
  // because it also writes `cloneBusy` and `cloneFile`, and those repaint the
  // panel — so the one-tap route, which is the route the live demo uses, was
  // the only one visibly broken.
  clones.value = [...clones.value, draft]
  const entry = clones.value[clones.value.length - 1]
  const tick = setInterval(() => { entry.seconds += 1 }, 1000)
  try {
    let out
    if (fromEstate) {
      // The keys are sent in the order they were ticked, because that is the
      // order the passage will be spoken in if more than one goes in.
      out = await api.cloneFromEstate({
        name: cloneName.value || `${clonePerson.value} — ${picked.length} clips, ${pickedSeconds.value}s`,
        language: cloneLang.value,
        gender: cloneGender.value || null,
        person: clonePerson.value,
        personContact: clonePersonContact.value || null,
        consentNote: cloneConsentNote.value || null,
        speaker: entry.speaker,
        s3Keys: pickedKeys.value,
        // Somebody has to say they hold the right to clone this person from
        // our archive — the route refuses without it, and so does the button.
        declarationAgreed: true,
        attestedBy: attestedBy.value,
      })
      pickedKeys.value = []
    } else {
      const fd = new FormData()
      fd.append('clip', cloneFile.value)
      fd.append('name', cloneName.value || `${clonePerson.value} — ${cloneSource.value === 'record' ? 'recorded here' : 'uploaded'}`)
      fd.append('language', cloneLang.value)
      if (cloneGender.value) fd.append('gender', cloneGender.value)
      fd.append('person', clonePerson.value)
      if (clonePersonContact.value) fd.append('personContact', clonePersonContact.value)
      if (cloneConsentNote.value) fd.append('consentNote', cloneConsentNote.value)
      // THE CONSENT STEP, on the wire. `sampleFrom` is what tells the backend
      // which of the two it is entitled to ask for: it listens for the spoken
      // line on a recording, and it requires the signed attestation on a file.
      // Neither is optional there — this is a real-world permission about a
      // real person, and the route refuses rather than trusting the screen.
      fd.append('sampleFrom', cloneSource.value)
      if (declarationMode.value === 'attested') {
        fd.append('declarationAgreed', 'true')
        fd.append('attestedBy', attestedBy.value)
      }
      out = await api.cloneVoice(fd)
      cloneFile.value = null
      fileSeconds.value = null
      resetDeclaration()
      attestedBy.value = ''
      clearRecording()
    }
    entry.voice = out.voice
    entry.consent = out.consent
    entry.confirmation = out.confirmation
    entry.source = out.source || null
    entry.stage = 'hearing'
    // Same split as cloneOne: a refused audition must not lose a made clone.
    try {
      const heard = await api.auditionVoice({
        voiceId: out.voice.voice_id,
        language: out.voice.languages?.[0] || cloneLang.value || 'eng',
        sentences: [entry.line],
      })
      const first = (heard.clips || [])[0]
      if (first) entry.audio = { ...first, src: await clipUrl(first.url) }
    } catch (e) {
      entry.error = `Cloned, but could not be heard: ${e.message}`
    }
    entry.stage = 'done'
    cloneName.value = ''
  } catch (e) {
    // A REFUSED DECLARATION IS NOT A FAILED CLONE, and must not read like one.
    // Nothing was made, nothing was spent, and the operator has something
    // specific to do about it — so the row comes straight back off the screen
    // and the panel says what is needed, where the control for it is.
    const d = e.data || {}
    if (d.needsAttestation || d.declarationNotHeard) {
      clones.value = clones.value.filter((c) => c.id !== entry.id)
      if (d.needsAttestation) cannotListen.value = true
      if (d.declarationNotHeard) {
        // What the machine heard, verbatim. The operator can then disagree
        // with it out loud — a gate that refuses without showing its evidence
        // is one nobody can argue with, and this one is about a real person's
        // permission.
        declarationHeard.value = d.heard || ''
      }
      declarationError.value = e.message
    } else {
      entry.error = e.message
      entry.stage = 'failed'
    }
  }
  clearInterval(tick)
  cloneBusy.value = false
}

// ── GIVING CONSENT TO A VOICE ──────────────────────────────────────────────
//
// Tom, 2026-08-31, looking at the lab: "there is no way to give consent to a
// voice here." Consent had become REQUIRED to cast on the same day — refused
// server-side at every door — and nothing on this page could satisfy it for a
// voice that already existed. Nine voices were stuck with no route forward.
//
// THIS REPLACED A SECOND MECHANISM RATHER THAN ADDING A THIRD. What was here
// was a form: a status dropdown, a name, a date, a note — Tom writing down what
// he had been told, off-system. It could mark a voice `authorised` with nothing
// but typing behind it, and it lived beside the clone routes' spoken line and
// signed attestation, which is two different meanings of the word consent one
// screen apart. Tom's instruction on this job was explicit: use the SAME
// mechanism, do not invent a second one. So the panel is
// VoiceConsent.vue — the line read aloud and checked, or the signed
// attestation — and the refusal path ("they said no", "they withdrew") still
// goes through the older PUT, which is the one thing that form could say that
// a declaration cannot.
const consentFor = ref(null)
const consentBusy = ref(false)
const consentError = ref('')
const consentHeard = ref('')

function openConsent (voiceId) {
  consentError.value = ''
  consentHeard.value = ''
  consentFor.value = voiceId
  // The panel's first control plays the voice, so opening it loads what this
  // voice has to play. Costs nothing.
  const lang = expanded.value ? langByCode(expanded.value) : null
  if (lang) loadVoiceClips(lang, voiceId)
}

/** The consent block for whichever voice the panel is open on. */
const consentCurrent = computed(() => {
  if (!consentFor.value) return null
  for (const lang of (data.value?.languages || [])) {
    for (const c of [...(lang.candidates || []), ...((lang.guide && lang.guide.candidates) || [])]) {
      if (c.voiceId === consentFor.value) return c.consent || null
    }
    for (const slot of [...slotsOf(lang), ...guideSlotsOf(lang)]) {
      if (slot.voiceId === consentFor.value) return slot.consent || null
    }
  }
  return null
})

const consentName = computed(() => {
  if (!consentFor.value) return ''
  for (const lang of (data.value?.languages || [])) {
    for (const c of [...(lang.candidates || []), ...((lang.guide && lang.guide.candidates) || [])]) {
      if (c.voiceId === consentFor.value) return c.name || consentFor.value
    }
  }
  return consentFor.value
})

/**
 * THE LINE, READ ALOUD, going up as the recording it was read on. The backend
 * transcribes it and refuses if the line is not there — so a refusal here is
 * information, and what the machine heard is shown rather than swallowed.
 */
async function consentSpoken ({ file, person }) {
  consentBusy.value = true
  consentError.value = ''
  consentHeard.value = ''
  try {
    const fd = new FormData()
    fd.append('clip', file, 'consent.webm')
    fd.append('person', person)
    if (expanded.value) fd.append('language', expanded.value)
    await api.declareConsentSpoken(consentFor.value, fd)
    consentFor.value = null
    await load()
  } catch (e) {
    const d = e.data || {}
    if (d.declarationNotHeard) consentHeard.value = d.heard || ''
    consentError.value = e.message
  }
  consentBusy.value = false
}

/** Nobody at the microphone: a named human states it instead, in writing. */
async function consentAttested ({ person, attestedBy, agreed }) {
  consentBusy.value = true
  consentError.value = ''
  try {
    await api.declareConsentAttested(consentFor.value, {
      person, attestedBy, declarationAgreed: agreed ? 'true' : 'false', language: expanded.value || null,
    })
    consentFor.value = null
    await load()
  } catch (e) { consentError.value = e.message }
  consentBusy.value = false
}

/** A no, and a withdrawal. One tap, the same weight as the yes above it. */
async function consentDecide ({ status, person }) {
  consentBusy.value = true
  consentError.value = ''
  try {
    await api.recordConsent(consentFor.value, { status, person })
    consentFor.value = null
    await load()
  } catch (e) { consentError.value = e.message }
  consentBusy.value = false
}

// ── HEARING ONE VOICE PROPERLY ─────────────────────────────────────────────
//
// Tom's other two gaps, 2026-08-31: "there is no way to hear a voice that does
// not currently have a clip" and "there is only one clip per voice".
//
// `openVoice` is the voice whose judging set is showing — several lines of
// deliberately different lengths, from the course this voice would actually
// speak, because one clip may flatter a voice or misrepresent it. Reading that
// state costs nothing; rendering one line of it costs one clip and is always a
// deliberate tap on the line itself.
const openVoice = ref('')
const openClips = ref(null)
const renderingClip = ref('')

async function loadVoiceClips (lang, voiceId) {
  openClips.value = null
  try {
    openClips.value = await api.voiceClips(lang.code, voiceId)
  } catch (e) {
    openClips.value = { lines: [], clips: [], why: e.message }
  }
}

async function toggleVoice (lang, voiceId) {
  if (openVoice.value === voiceId) { openVoice.value = ''; openClips.value = null; return }
  openVoice.value = voiceId
  await loadVoiceClips(lang, voiceId)
}

/**
 * ONE TAP ENDS IN AUDIO. If the line has a clip, it plays it; if it has none,
 * it renders one and then plays it. The backend returns a cached or free clip
 * without spending, so pressing an already-rendered line never pays twice.
 */
async function hearVoice (lang, { voiceId, lineIndex = 0 }) {
  // The consent panel can be open on a voice from the clone list, with no
  // language row expanded behind it — and then there is no course to pick a
  // line from. Nothing to play is not an error worth shouting about.
  if (!lang) return
  const key = `${voiceId}:${lineIndex}`
  const known = (openVoice.value === voiceId && openClips.value)
    ? (openClips.value.clips || []).find((c) => c.lineIndex === lineIndex)
    : null
  if (known && known.url) return playClip(key, known.url)
  if (lineIndex === 0 && samplesFor(lang)[voiceId]) return play(lang, voiceId)

  renderingClip.value = openVoice.value === voiceId ? key : voiceId
  error.value = ''
  try {
    const out = await api.renderVoiceClip(lang.code, voiceId, lineIndex)
    if (openVoice.value === voiceId && openClips.value) {
      openClips.value = {
        ...openClips.value,
        clips: (openClips.value.clips || []).map((c) => (c.lineIndex === lineIndex ? { ...c, ...out.clip } : c)),
      }
    }
    // The row's own play button reads the language-level sample map, so line
    // zero lands there too — otherwise the row would go back to a dashed
    // outline the moment the panel closed.
    if (lineIndex === 0) addSample(lang.code, voiceId, { url: out.clip.url, durationMs: out.clip.durationMs || null, free: false, cached: true })
    await playClip(key, out.clip.url)
  } catch (e) { error.value = e.message }
  renderingClip.value = ''
}

/** One <audio> for the page, exactly as `play` uses — two voices at once is not a comparison. */
async function playClip (key, url) {
  if (audio) { audio.pause(); audio = null }
  if (playing.value === key) { playing.value = ''; return }
  const src = /^https?:/.test(url) ? url : await clipUrl(url)
  audio = new Audio(src)
  audio.onended = () => { playing.value = '' }
  audio.onerror = () => { playing.value = ''; error.value = `Could not play ${key}.` }
  playing.value = key
  audio.play().catch((e) => { playing.value = ''; error.value = e.message })
}

// ── UN-CREATING A VOICE ────────────────────────────────────────────────────
// The control the page has never had. A clone made by accident during a live
// demo, with somebody watching, is the case this is for. The backend refuses
// outright while the voice is cast into any slot, so this asks once and then
// reports whatever the backend says.
const removeBusy = ref('')
async function removeVoice (voiceId) {
  if (!window.confirm(`Remove ${voiceId} from the estate, and delete it at Cartesia? Existing clips already rendered with it keep playing.`)) return
  removeBusy.value = voiceId
  error.value = ''
  try {
    await api.removeVoice(voiceId)
    clones.value = clones.value.filter((c) => c.voice?.voice_id !== voiceId)
    await load()
  } catch (e) { error.value = e.message }
  removeBusy.value = ''
}

// Auditioning is no longer a separate step with its own state: every clone is
// heard as part of the tap that makes it (see cloneOne / submitClone), and
// `replay` says the line again on a clone already made. The old single
// `auditionClips` ref went with the single `cloneResult` it belonged to — both
// were one-at-a-time state on a screen whose whole purpose is now comparison.

async function load () {
  loading.value = true
  error.value = ''
  try {
    data.value = await api.languages()
  } catch (e) {
    error.value = e.message
  }
  loading.value = false
}
onMounted(load)

const rows = computed(() => {
  const all = data.value?.languages || []
  const needle = q.value.trim().toLowerCase()
  return all
    .filter((l) => filter.value === 'all' || l.status === filter.value)
    // Provider filter reads the STORED configs, never the policy — clicking
    // "xAI 29" gives you exactly the languages whose courses are on xAI.
    .filter((l) => provFilter.value === 'all' || (l.providersInUse || []).some((p) => p.provider === provFilter.value))
    // Search matches the words as well as the code, so typing "welsh" finds cym.
    .filter((l) => !needle || l.code.toLowerCase().includes(needle) || langName(l).toLowerCase().includes(needle))
    // THE ORDER TOM ASKED FOR (2026-08-29): live courses first, then course
    // count descending, then alphabetical BY NAME — "Arabic before Bengali
    // before Croatian", not "ara before ben before hrv". Done here and not on
    // the server because this is where the name lookup lives.
    .slice()
    .sort((a, b) => {
      const live = (l) => (l.released > 0 ? 0 : 1)
      return live(a) - live(b)
        || b.courses - a.courses
        || langName(a).localeCompare(langName(b))
    })
})

const summary = computed(() => data.value?.summary || null)

/**
 * THE STATUS CHIPS ARE THE SUMMARY. One row instead of two: each chip says how
 * many languages are in that state and filters to them when clicked, so the
 * count and the way to act on it are the same object. `hue` carries the meaning
 * the header comment sets out — these are not interchangeable, and the colour
 * is how a gap reads as a gap without being worked out.
 */
const STATUSES = [
  { value: 'all',      label: 'Every status', hue: 'ui-hue-quiet', key: null },
  { value: 'complete', label: 'Complete',     hue: 'ui-hue-good',  key: 'complete' },
  { value: 'partial',  label: 'Partial',      hue: 'ui-hue-warn',  key: 'partial' },
  { value: 'uncast',   label: 'Uncast',       hue: 'ui-hue-bad',   key: 'uncast' },
  { value: 'nocover',  label: 'No Cartesia',  hue: 'ui-hue-warn',  key: 'nocover' },
  { value: 'human',    label: 'Human-voiced', hue: 'ui-hue-info',  key: 'human' },
  // Known-side only: nothing teaches it, so it has no phrase-voice worklist.
  // It is here so its guide voice can be cast (2026-08-29).
  { value: 'knownonly', label: 'Known only',  hue: 'ui-hue-quiet', key: 'knownonly' },
]

const statusChips = computed(() =>
  STATUSES.map((st) => ({
    ...st,
    count: st.key ? (summary.value?.[st.key] ?? null) : (summary.value?.languages ?? null),
  }))
)

/**
 * THE PROVIDER CHIPS ARE THE ESTATE SUMMARY, same trick as the status row: the
 * count and the way to act on it are one object. Built from what the courses
 * actually store, xAI first because xAI is what this screen is for.
 */
const providerChips = computed(() => {
  const totals = summary.value?.providerTotals || []
  if (!totals.length) return []
  return [
    { value: 'all', label: 'Any provider', count: null },
    // xAI is being retired, so its chip carries that where its count already
    // is — the fact belongs to the provider, not to a paragraph above the table.
    ...totals.map((t) => ({
      value: t.provider,
      label: providerLabel(t.provider) + (t.provider === 'xai' ? ' · retiring' : ''),
      count: t.courses,
    })),
  ]
})

/** Provider names as a person writes them, not as the DB stores them. */
const PROVIDER_LABEL = { xai: 'xAI', azure: 'Azure', elevenlabs: 'ElevenLabs', cartesia: 'Cartesia', google: 'Google', narakeet: 'Narakeet', human: 'Human', unset: 'not configured', unknown: 'unknown' }
function providerLabel (p) { return PROVIDER_LABEL[p] || p }

const HUE = {
  complete: 'ui-hue-good',
  partial: 'ui-hue-warn',
  nocover: 'ui-hue-warn',
  uncast: 'ui-hue-bad',
  human: 'ui-hue-info',
  knownonly: 'ui-hue-quiet',
}
function hueFor (status) { return HUE[status] || 'ui-hue-quiet' }

/** xAI is the one being deprecated, so it is the one that reads as a warning. */
function providerHue (p) {
  if (p === 'xai') return 'ui-hue-bad'
  if (p === 'human') return 'ui-hue-info'
  if (p === 'unset' || p === 'unknown') return 'ui-hue-quiet'
  return 'ui-hue-good'
}

/**
 * "Korean · kor" — the words first, the code beside them, never one instead of
 * the other.
 *
 * A DIALECT ROW names itself (Tom, 2026-08-31: dialects are different languages
 * here). Its code is 'deu_at', which the code-to-name CSV has never heard of,
 * so the server sends the name read off the dialect's own courses — "Austrian
 * German" — and this falls back to the base language's name rather than to a
 * bare code if it ever arrives empty.
 */
function langName (codeOrLang) {
  if (codeOrLang && typeof codeOrLang === 'object') {
    return codeOrLang.dialectName || languageName(codeOrLang.baseCode || codeOrLang.code)
  }
  return languageName(codeOrLang)
}

/** The status word as Tom reads it, not as the API stores it. */
function statusLabel (status) {
  if (status === 'nocover') return 'no Cartesia'
  if (status === 'knownonly') return 'known only'
  return status
}

function slotsOf (lang) {
  // Male then female, each in rank order — one stable reading order, so the eye
  // can scan down a column rather than re-learning the layout per row.
  return [
    ...lang.slots.m.map((s) => ({ ...s, gender: 'm', slot: 'phrase' })),
    ...lang.slots.f.map((s) => ({ ...s, gender: 'f', slot: 'phrase' })),
  ]
}

/** The guide slots — ranks only, no gender axis: a guide is one voice. */
function guideSlotsOf (lang) {
  return (lang.guide?.slots || []).map((s) => ({ ...s, slot: 'guide' }))
}

/**
 * The candidate row a cast is about, so the consent fact the API already sent
 * can be read at the moment of casting. Looked up rather than passed through
 * the event, because the guide list and the two phrase lists all emit the same
 * `cast` event with a bare voice id.
 */
function findCandidate (lang, slot, voiceId) {
  const lists = [lang.candidates || [], lang.guide?.candidates || []]
  for (const list of lists) {
    const hit = list.find((c) => c.voiceId === voiceId)
    if (hit) return hit
  }
  return null
}

/** One busy key for every slot on the page — phrase slots carry a gender, guide slots do not. */
function slotKey (lang, slot) {
  return `${lang.code}:${slot.slot || 'phrase'}:${slot.gender || '-'}:${slot.rank}`
}

/**
 * ── THE HUMAN-RECORDING LABEL (Tom's ruling, 2026-08-31) ────────────────────
 *
 * "A visible refusal beats a quiet one." Everything below exists so that a
 * human-recorded course is named ON SCREEN, BEFORE the Cast button is tapped —
 * not discovered afterwards, and never silently overridden. `humanRecorded`
 * comes from the API (services/shared/human-recorded-roles.cjs) and carries the
 * courses a cast on this language would otherwise speak over, per slot.
 */
function humanOf (lang, slot) {
  return (lang.humanRecorded && lang.humanRecorded[slot === 'guide' ? 'guide' : 'phrase']) || { courses: [], total: 0, roles: [] }
}

/** Would a cast on this slot reach nothing but human recordings? Then it is refused. */
function humanBlocks (lang, slot) {
  return slot === 'guide' ? false : Boolean(lang.humanRecorded && lang.humanRecorded.blocked)
}

/** The course codes, plainly, for a tooltip and for the refusal sentence. */
function humanCourseList (lang) {
  const all = [...humanOf(lang, 'phrase').courses, ...humanOf(lang, 'guide').courses]
  return all.map((c) => c.course).join(', ')
}

/** The one-line label the collapsed row carries, so the fact arrives before the tap. */
function humanRowLabel (lang) {
  const n = humanOf(lang, 'phrase').total + humanOf(lang, 'guide').total
  if (!n) return ''
  return `${n} human-recorded course${n === 1 ? '' : 's'}`
}

/** What the last cast did NOT reach, keyed by language, so it survives the reload. */
const skipped = ref({})

/**
 * Cast a voice into a slot.
 *
 * ── NO CONSENT, NO CAST (Tom's ruling, 2026-08-31) ──────────────────────────
 *
 *   "we are never going to use a voice without consent"
 *
 * This used to warn and offer "Cast it anyway?". That was the flagged default
 * of the day before — the comment here said in as many words that a hard block
 * "is Tom's call to make and he has not made it". He has made it. There is now
 * no path through: the picker draws no Cast button for a voice nobody has
 * consented to, and this refuses one anyway, because a stale tab still holds
 * the old markup. The endpoint refuses it a third time, which is the one that
 * actually counts.
 *
 * An authorised voice casts in one tap exactly as before, with no dialog at
 * all — a guard on every cast is a guard people learn to click through.
 */
async function cast (lang, slot, voiceId) {
  if (!voiceId) return
  const candidate = findCandidate(lang, slot, voiceId)
  const k = candidate?.consent
  if (k && k.aboutAPerson && !k.authorised) {
    error.value = `${k.castWarning || k.summary} Record consent for this voice — the "consent…" button beside it — and then cast it.`
    return
  }
  busy.value = slotKey(lang, slot)
  try {
    const out = await api.castSlot(lang.code, {
      slot: slot.slot || 'phrase', gender: slot.gender, rank: slot.rank, voiceId,
    })
    // THE SKIPPED COURSES ARE THE POINT. A cast that quietly reached nine of
    // eleven courses and said "saved" is the failure this guard exists to
    // prevent, so the answer is kept and shown beside the slot.
    skipped.value = { ...skipped.value, [lang.code]: (out && out.skipped) || [] }
    await load()
  } catch (e) { error.value = e.message }
  busy.value = ''
}

/**
 * The human's pace correction. Writes ONE column and nothing else — never the
 * measurement, which is Tom's ruling: pace is measured from rendered audio, not
 * asked of a human. Blank clears the nudge and leaves the measurement standing.
 */
async function nudge (lang, slot, raw) {
  const value = String(raw).trim() === '' ? null : Number(raw)
  busy.value = slotKey(lang, slot)
  try {
    await api.nudgePace(slot.voiceId, { nudge: value })
    await load()
  } catch (e) { error.value = e.message }
  busy.value = ''
}

/**
 * Colour by how far this voice sits from typical for its language. Deliberately
 * three buckets and not a gradient: the question a reader has is "is this one
 * unusual?", not "by exactly how much?" — the number beside it answers that.
 */
function paceClass (effective) {
  if (effective >= 1.15) return 'vl-pace-fast'
  if (effective <= 0.87) return 'vl-pace-slow'
  return 'vl-pace-typical'
}

function paceTitle (pace) {
  const parts = [`${pace.effective.toFixed(3)}x the reference pace of this language's voices`]
  if (pace.nudge) parts.push(`measured ${Number(pace.ratio).toFixed(3)}x, your nudge x${Number(pace.nudge).toFixed(2)}`)
  else parts.push(`measured ${Number(pace.ratio).toFixed(3)}x, no nudge`)
  if (pace.samples) parts.push(`one controlled sentence in ${pace.samples} language${pace.samples === 1 ? '' : 's'}, rendered from the provider API at 1.0x`)
  if (pace.cps) parts.push(`${Number(pace.cps).toFixed(1)} chars/sec`)
  return parts.join(' · ')
}

/**
 * THE NUMBERS THE PLAYER WILL ACTUALLY USE — target language, Easy and Fast.
 *
 * The ratio above says how brisk the voice is; these say what a learner hears.
 * Under Tom's rule of 2026-08-29 the belt ramp is gone: target language plays
 * at 0.8 of the language's reference on Easy and 0.9 on Fast, known language
 * and listening at 1.0 always, and the per-voice correction applies to the
 * target language only.
 */
function paceSpeeds (pace) {
  if (!pace || pace.easy === null || pace.easy === undefined) return null
  return { easy: pace.easy, fast: pace.fast, clamped: pace.easyClamped || pace.fastClamped }
}

function speedsTitle (pace) {
  const parts = [
    `Target language: ${pace.easy.toFixed(2)}x on Easy, ${pace.fast.toFixed(2)}x on Fast`,
    'Known language and listening: 1.00x always, played exactly as rendered',
  ]
  if (pace.easyClamped || pace.fastClamped) {
    parts.push('Clamped at the 0.7 floor — below that TTS stops sounding slow and starts sounding broken, so the correction is partial for this voice')
  }
  return parts.join(' · ')
}

/**
 * A candidate's pace, inline in the dropdown. Two numbers, because they answer
 * two different questions: how brisk the voice is, and what a learner would
 * actually hear on the target language at Easy.
 */
function paceSuffix (c) {
  if (!c.pace || c.pace.effective === null || c.pace.effective === undefined) return ''
  return ` · ${Number(c.pace.effective).toFixed(2)}x · ${Number(c.pace.easy).toFixed(2)} easy`
}

function candidatePace (c) {
  return `${paceTitle(c.pace)} · ${speedsTitle(c.pace)}`
}

/** The language's reference: what 1.00x means here, and the sentence it means it on. */
function referenceTitle (ref) {
  if (!ref) return ''
  return [
    `Reference read: ${ref.reference_seconds.toFixed(2)}s for ${ref.chars} characters (${ref.reference_cps.toFixed(1)} chars/sec)`,
    `across ${ref.voices} measured voice${ref.voices === 1 ? '' : 's'}`,
    `Sentence: "${ref.sentence}"`,
    `From ${ref.sentence_source}`,
  ].join(' · ')
}

async function clear (lang, slot) {
  busy.value = slotKey(lang, slot)
  try {
    await api.clearSlot(lang.code, { slot: slot.slot || 'phrase', gender: slot.gender, rank: slot.rank })
    await load()
  } catch (e) { error.value = e.message }
  busy.value = ''
}

/**
 * Candidates for a slot. A PHRASE slot wants the right gender, or one unknown.
 * A GUIDE slot takes any voice that speaks the language — a guide is one voice,
 * and the male/female split belongs to the phrase slots alone.
 */
/** The row for a code, so a handler holding only a code can reach its language. */
function langByCode (code) {
  return (data.value?.languages || []).find((l) => l.code === code) || null
}

function candidatesFor (lang, slot) {
  if (slot.slot === 'guide') return lang.guide?.candidates || []
  return (lang.candidates || []).filter((c) => !c.gender || c.gender === slot.gender)
}
</script>

<template>
  <div class="vl-langs">
    <!-- MAKE A VOICE — moved to the top of this panel 2026-08-30. It was at the
         bottom, below every language in the estate, which on a phone is several
         screens of scrolling past a table you did not come for. Tom's ask was
         "create clones directly from this page"; a control you have to hunt for
         is not on the page in any sense that matters. -->
    <section class="vl-clone vl-clone-top">
      <button class="vl-btn vl-clone-open" @click="toggleClone">
        {{ showClone ? 'Hide' : '+ Make a new voice — clone one with Cartesia' }}
      </button>

      <div v-if="showClone" class="vl-clone-body">
        <p v-if="sampleGuidance" class="vl-guidance">{{ sampleGuidance.headline }}</p>

        <!-- ── THE PANEL NOW READS IN THE ORDER IT IS USED ──────────────────
             Tom, 2026-09-01: the flows "do not hang together". The fields were
             all here and all correct, in an order nobody works in — the field
             that gates everything sat at the top, the button that says so sat
             at the bottom past eighty clip rows, and the source picker that
             changes what all of them mean was fourth. Numbering the four moves
             is state, not prose: it costs three characters a row and it makes
             the next tap obvious without a sentence explaining it. -->

        <!-- 1 — WHOSE VOICE IS THIS. Required before Cartesia is called at all,
             because a consent record with nobody attached is decorative on the
             day it is written and Tom cannot go and ask a voice id. -->
        <div class="vl-clone-row vl-consent-row">
          <span class="ui-filter-label"><b class="vl-step">1</b> Whose voice</span>
          <input v-model="clonePerson" class="ui-field" placeholder="the person this recording is of — required" />
          <input v-model="clonePersonContact" class="ui-field" placeholder="how to reach them (optional)" />
          <input v-model="cloneConsentNote" class="ui-field vl-wide" placeholder="anything to note about permission (optional)" />
        </div>

        <!-- 2 — THE VOICE BEING MADE. The demo line lives here now rather than
             inside the estate branch: every route auditions the new clone with
             it, so hiding it on two of the three meant hearing a sentence you
             were never shown. -->
        <div class="vl-clone-row">
          <span class="ui-filter-label"><b class="vl-step">2</b> The new voice</span>
          <input v-model="cloneName" class="ui-field" placeholder="name it yourself (optional)" />
          <input v-model="cloneLang" class="ui-field vl-narrow" placeholder="language e.g. eng" />
          <span v-if="cloneLang" class="vl-muted vl-clone-lang">{{ langName(cloneLang) }}</span>
          <select v-model="cloneGender" class="ui-field vl-narrow">
            <option value="">gender unknown</option>
            <option value="m">male</option>
            <option value="f">female</option>
          </select>
        </div>
        <div class="vl-clone-row">
          <span class="ui-filter-label vl-sub">and says</span>
          <input v-model="demoLine" class="ui-field vl-wide" placeholder="the line every new voice will say" />
        </div>

        <!-- 3 — WHERE THE SAMPLE COMES FROM, and what that route means for
             permission. The pill is the whole of the explanation: it changes
             with the chip beside it, so "awaiting authorisation" can no longer
             sit on a route where it is not true. -->
        <div class="vl-clone-row vl-source-row">
          <span class="ui-filter-label"><b class="vl-step">3</b> Sample</span>
          <button
            class="ui-chip" :class="cloneSource === 'estate' ? 'ui-hue-info' : 'ui-chip-off'"
            @click="chooseSource('estate')"
          >From a recording we hold</button>
          <button
            class="ui-chip" :class="cloneSource === 'upload' ? 'ui-hue-info' : 'ui-chip-off'"
            @click="chooseSource('upload')"
          >Upload a file</button>
          <button
            class="ui-chip" :class="cloneSource === 'record' ? 'ui-hue-info' : 'ui-chip-off'"
            :disabled="!canRecord"
            :title="canRecord ? '' : 'This browser will not give the page a microphone.'"
            @click="chooseSource('record')"
          >Record it here</button>
          <span class="ui-pill vl-born" :class="bornAs.hue">{{ bornAs.label }}</span>
        </div>

        <!-- ── THE PRIMARY PATH: a speaker we already have on tape ───────
             Both numbers on every row — how many clips, and how much audio —
             because "we have some Aran" is not an answer anyone can act on.
             And the identity warning stays on screen: origin=human is a label
             somebody wrote, and two clone attempts here were built from TTS
             wearing it. Listening is the only verification that works. -->
        <div v-if="cloneSource === 'estate'" class="vl-estate">
          <div class="vl-clone-row">
            <input
              v-model="speakerFilterLang" class="ui-field vl-narrow" placeholder="language e.g. eng"
              @keyup.enter="loadSpeakers"
            />
            <button class="vl-btn" :disabled="speakersBusy" @click="loadSpeakers">
              {{ speakersBusy ? 'Looking…' : 'Find speakers we hold' }}
            </button>
            <span class="vl-muted">free</span>
          </div>
          <p v-if="speakersError" class="vl-error">{{ speakersError }}</p>

          <div v-if="speakers.length" class="vl-speakers">
            <button
              v-for="sp in speakers" :key="`${sp.voiceId}:${sp.language}`"
              class="vl-speaker" :class="{ 'is-on': chosenSpeaker && chosenSpeaker.voiceId === sp.voiceId }"
              @click="chooseSpeaker(sp)"
            >
              <span class="vl-speaker-id">{{ sp.voiceId }}</span>
              <span class="vl-speaker-nums">{{ sp.clips }} clips · {{ Math.round(sp.totalSeconds / 60) }} min</span>
              <span class="vl-speaker-roles">{{ sp.language }} · {{ sp.roles.join(', ') }}</span>
            </button>
          </div>

          <template v-if="chosenSpeaker">
            <p class="vl-warn-line"><strong>Listen before you clone</strong> — an origin label is not proof.</p>
            <p v-if="clipsBusy" class="vl-muted">Reading the archive…</p>
            <div v-else class="vl-clips">
              <!-- ONE ROW PER RECORDING: hear the original, then clone from
                   just that one. The result appears underneath it and STAYS
                   there, so cloning the next row builds a comparison instead
                   of replacing one. -->
              <div v-for="c in speakerClips" :key="c.s3Key" class="vl-cliprow">
                <div class="vl-clip">
                  <input
                    type="checkbox" :checked="pickedKeys.includes(c.s3Key)"
                    title="tick several to join them into one source — the deliberate path"
                    :aria-label="`join this ${c.seconds}s clip with others`" @change="togglePick(c.s3Key)"
                  />
                  <span class="vl-clip-secs">{{ c.seconds }}s</span>
                  <span class="vl-clip-role ui-pill ui-hue-quiet">{{ c.role }}</span>
                  <audio :src="c.url" controls preload="none" class="vl-clip-audio" />
                  <span class="vl-clip-text" :title="c.text">{{ c.text }}</span>
                  <button
                    class="vl-cliprow-clone"
                    :disabled="!clonePerson"
                    :title="clonePerson ? 'Clone from this one recording, then hear it say the line' : 'Type whose voice this is first'"
                    @click="cloneOne(c)"
                  >Clone this →</button>
                </div>

                <!-- THE RESULT, BESIDE ITS SOURCE. One strip per clone made
                     from this clip; cloning the same clip twice keeps both. -->
                <div v-for="k in clonesFor(c.s3Key)" :key="k.id" class="vl-made" :class="`is-${k.stage}`">
                  <template v-if="k.stage === 'cloning' || k.stage === 'hearing'">
                    <span class="vl-made-spin">◐</span>
                    <span class="vl-made-stage">
                      {{ k.stage === 'cloning' ? 'Cloning from this recording' : 'Hearing it back' }}
                      — {{ k.seconds }}s
                    </span>

                  </template>
                  <template v-else-if="k.stage === 'failed'">
                    <span class="vl-made-spin">✕</span>
                    <span class="vl-error">{{ k.error }}</span>
                    <button class="ui-sort-btn" @click="clones = clones.filter((x) => x.id !== k.id)">dismiss</button>
                  </template>
                  <template v-else>
                    <span class="vl-made-spin">▸</span>
                    <span class="vl-made-name">{{ k.voice?.display_name }}</span>
                    <audio v-if="k.audio" :src="k.audio.src" controls class="vl-clip-audio" />
                    <span class="vl-made-line" :title="k.line">“{{ k.line }}”</span>
                    <ConsentBadge :consent="k.consent" />
                    <button class="ui-sort-btn" :disabled="k.stage === 'removing'" @click="replay(k)">say it again</button>
                    <button class="ui-sort-btn" :disabled="k.stage === 'removing'" @click="discard(k)">
                      {{ k.stage === 'removing' ? 'removing…' : 'discard' }}
                    </button>
                    <!-- THE SECOND STAMP, under the audio it is about. -->
                    <CloneConfirm
                      v-if="k.voice"
                      :voice-id="k.voice.voice_id"
                      :confirmation="k.confirmation"
                      :heard="Boolean(k.audio)"
                      @decided="(d) => { k.confirmation = d; k.consent = d.consent }"
                    />
                  </template>
                </div>
              </div>
            </div>
            <p v-if="pickHint" class="vl-muted vl-pick-hint">
              {{ pickHint }}
            </p>
          </template>
        </div>

        <!-- UPLOAD. Seconds, like the other two routes: this was the only one
             of the three that could not tell you how much audio it had. -->
        <div v-else-if="cloneSource === 'upload'" class="vl-clone-row">
          <input type="file" accept="audio/*" class="ui-field" @change="pickFile" />
          <span class="vl-muted">{{ fileHint || 'one take, 20–60s, no long pauses' }}</span>
        </div>

        <!-- RECORD. The line to read is the first thing on this route and it
             stays up while the tape rolls — a phrase you are meant to read is
             no use if it leaves the screen the moment you press Record. -->
        <div v-else-if="cloneSource === 'record'" class="vl-record-block">
          <div v-if="declarationMode === 'spoken'" class="vl-declare">
            <span class="ui-filter-label"><b class="vl-step">4</b> Read this aloud</span>
            <p class="vl-declare-words">{{ spokenPhrase || 'This backend has not sent the line to read.' }}</p>
            <!-- The backend's refusal already quotes what came through, so a
                 second copy of the transcript under it said the same thing
                 twice. If in doubt, cut it out. `declarationHeard` is still
                 kept in state: it is what the consent record stores. -->
            <p v-if="declarationError" class="vl-declare-err">{{ declarationError }}</p>
          </div>
          <div class="vl-clone-row vl-record-row">
            <button v-if="!recording" class="vl-btn" @click="startRecording">● Record</button>
            <button v-else class="vl-btn vl-recording" @click="stopRecording">■ Stop — {{ recordSeconds }}s</button>
            <span v-if="recording" class="vl-muted">keep going after the line &mdash; stops at 60s</span>
            <template v-if="recordedUrl">
              <audio :src="recordedUrl" controls class="vl-record-audio" />
              <span class="vl-muted">{{ recordHint }}</span>
              <button class="ui-sort-btn" @click="startRecording">Record it again</button>
            </template>
            <span v-if="recordError" class="vl-error">{{ recordError }}</span>
          </div>
        </div>

        <!-- ── THE ATTESTATION ────────────────────────────────────────────
             The upload route, and a recording on a box with no ear. Nobody
             was in the room and no amount of listening to a file says who
             chose to send it, so the permission is stated rather than proved,
             and it is signed. Tap to agree, type a name: both are recorded
             against the voice with the date, and both are required by the
             route as well as by this button. -->
        <div v-if="declarationMode === 'attested'" class="vl-declare">
          <span class="ui-filter-label"><b class="vl-step">4</b> Agree to this</span>
          <p class="vl-declare-words">{{ attestationWords || 'This backend has not sent the wording to agree to.' }}</p>
          <p v-if="declarationError" class="vl-declare-err">{{ declarationError }}</p>
          <div class="vl-clone-row">
            <label class="vl-agree">
              <input type="checkbox" v-model="declarationAgreed" />
              I agree
            </label>
            <input v-model="attestedBy" class="ui-field" placeholder="your name — required" />
          </div>
        </div>

        <div class="vl-clone-row">
          <button class="vl-btn" :disabled="cloneBusy || !canSubmitClone" @click="submitClone">
            <!-- TWO BUTTONS THAT LOOKED IDENTICAL AND WERE NOT. "Clone this →"
                 on a row takes that one recording; this one joins everything
                 ticked. Naming the count is the whole difference, said in the
                 button rather than in a sentence beside it. -->
            {{ cloneBusy ? 'Cloning…' : (cloneSource === 'estate' && pickedKeys.length
              ? `Clone from the ${pickedKeys.length} ticked recording${pickedKeys.length === 1 ? '' : 's'}`
              : 'Create the clone') }}
          </button>
          <span v-if="cloneBlocker" class="vl-muted">{{ cloneBlocker }}</span>
        </div>

        <!-- ── EVERY CLONE MADE IN THIS SESSION ──────────────────────────
             The comparison IS the demo (Tom, 2026-08-31), so this list only
             ever grows. Three clones from three sources, all saying the same
             line, is the thing Aran is being shown; a screen that kept one
             clone would destroy that on every tap. -->
        <div v-if="clones.length" class="vl-clone-done">
          <p class="vl-ok">
            <strong>{{ clones.length }} clone{{ clones.length === 1 ? '' : 's' }} made here</strong>
          </p>
          <div v-for="k in clones" :key="`all-${k.id}`" class="vl-made vl-made-summary" :class="`is-${k.stage}`">
            <span class="vl-made-name">{{ k.voice?.display_name || 'building…' }}</span>
            <template v-if="k.clip">
              <span class="vl-muted vl-made-from">from {{ k.clip.role }}, {{ k.clip.seconds }}s</span>
              <audio :src="k.clip.url" controls preload="none" class="vl-clip-audio" title="the original recording" />
            </template>
            <span v-else-if="k.joined && k.joined.length" class="vl-muted vl-made-from">
              from {{ k.joined.length }} clips joined
            </span>
            <span v-else class="vl-muted vl-made-from">from an uploaded or recorded sample</span>
            <audio v-if="k.audio" :src="k.audio.src" controls class="vl-clip-audio" title="the clone" />
            <span v-else-if="k.stage !== 'failed'" class="vl-muted">{{ k.stage }} — {{ k.seconds }}s</span>
            <span v-if="k.source && k.source.passthrough" class="ui-pill ui-hue-quiet" title="the original file went to Cartesia byte for byte — no re-encoding">untouched</span>
            <span v-if="k.source && k.source.stitched" class="ui-pill ui-hue-warn" :title="k.source.stitched">joined</span>
            <!-- FULL, not the pill, and only here: this is the moment the
                 record is made, so it is the moment to show what was actually
                 written down about a real person. -->
            <ConsentBadge :consent="k.consent" mode="full" />
            <button v-if="k.voice" class="ui-sort-btn" @click="openConsent(k.voice.voice_id, k.consent)">consent…</button>
            <button v-if="k.voice" class="ui-sort-btn" @click="discard(k)">discard</button>
            <CloneConfirm
              v-if="k.voice"
              :voice-id="k.voice.voice_id"
              :confirmation="k.confirmation"
              :heard="Boolean(k.audio)"
              @decided="(d) => { k.confirmation = d; k.consent = d.consent }"
            />
          </div>

        </div>
      </div>
    </section>

    <!-- ── GIVING CONSENT ───────────────────────────────────────────────────
         The same mechanism as every other consent in the estate: the line read
         aloud and checked against the recording, or a signed attestation. -->
    <VoiceConsent
      v-if="consentFor"
      :voice-id="consentFor"
      :name="consentName"
      :consent="consentCurrent"
      :wording="params?.consent || {}"
      :busy="consentBusy"
      :error="consentError"
      :heard="consentHeard"
      :clips="openClips && openVoice === consentFor ? openClips : null"
      :playing="playing"
      @close="consentFor = null"
      @spoken="consentSpoken"
      @attested="consentAttested"
      @decide="consentDecide"
      @hear="hearVoice(langByCode(expanded), { voiceId: consentFor, lineIndex: $event })"
    />

    <div class="vl-search">
      <input
        v-model="q"
        class="ui-search"
        type="text"
        placeholder="Search languages by name or code (e.g. 'welsh', 'cym', 'zho')…"
      />
    </div>

    <div class="ui-filter-row vl-filters">
      <span class="ui-filter-label">Status</span>
      <button
        v-for="st in statusChips"
        :key="st.value"
        class="ui-chip"
        :class="filter === st.value ? st.hue : 'ui-chip-off'"
        @click="filter = st.value"
      >
        {{ st.label }}<span v-if="st.count !== null" class="chip-no">{{ st.count }}</span>
      </button>

      <button class="ui-sort-btn" :disabled="loading" @click="load">↻ Refresh</button>

      <span class="ui-count">
        {{ rows.length }} of {{ summary?.languages ?? 0 }} languages<span
          v-if="summary?.noBackup"> · {{ summary.noBackup }} with no fallback</span>
      </span>
    </div>

    <!-- Same idea as the status row: the count and the way to act on it are one
         object. Counts are COURSES, read from the stored configs. -->
    <div v-if="providerChips.length" class="ui-filter-row vl-filters">
      <span class="ui-filter-label">In use now</span>
      <button
        v-for="p in providerChips"
        :key="p.value"
        class="ui-chip"
        :class="provFilter === p.value ? providerHue(p.value) : 'ui-chip-off'"
        @click="provFilter = p.value"
      >
        {{ p.label }}<span v-if="p.count !== null" class="chip-no">{{ p.count }}</span>
      </button>
    </div>

    <p v-if="error" class="vl-error">{{ error }}</p>
    <p v-if="loading" class="vl-muted">Reading the estate…</p>

    <div v-else class="ui-table-wrap">
      <table class="ui-table">
        <thead>
          <tr>
            <th>Language</th>
            <th class="vl-wide">Courses</th>
            <th>In use now</th>
            <th class="vl-wide">If re-rendered</th>
            <th>Voices cast</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="lang in rows" :key="lang.code">
            <tr class="ui-row" :class="lang.status">
              <td class="vl-lang">
                <span class="vl-name">{{ langName(lang) }}</span>
                <span class="vl-code">{{ lang.code }}</span>
                <!-- A dialect is its OWN language here, cast on its own row. The
                     parent is named so the row cannot read as a duplicate of it. -->
                <span
                  v-if="lang.dialectOf"
                  class="ui-pill ui-hue-quiet vl-flag"
                  :title="`Cast separately from ${langName(lang.dialectOf)} — stated by courses.${lang.castKeySource}`"
                >own cast · not {{ lang.dialectOf }}</span>
              </td>
              <td class="vl-muted vl-wide">{{ lang.courses }}<span v-if="lang.released"> · {{ lang.released }} live</span></td>
              <td class="vl-inuse">
                <span
                  v-for="p in lang.providersInUse"
                  :key="p.provider"
                  class="ui-pill"
                  :class="providerHue(p.provider)"
                  :title="`${p.courses} course${p.courses === 1 ? '' : 's'}, ${p.roles} voice slot${p.roles === 1 ? '' : 's'}`"
                >{{ providerLabel(p.provider) }} {{ p.courses }}</span>
                <span v-if="!lang.providersInUse?.length" class="vl-muted">no voices configured</span>
              </td>
              <td class="vl-muted vl-wide">{{ lang.defaultProvider || '—' }}</td>
              <td>
                <span :class="['vl-count', lang.filled >= lang.required ? 'ok' : lang.filled ? 'warn' : 'fail']">
                  {{ lang.filled }} / {{ lang.required }}
                </span>
              </td>
              <td>
                <span class="ui-pill" :class="hueFor(lang.status)">{{ statusLabel(lang.status) }}</span>
                <span
                  v-if="lang.status === 'complete' && !lang.hasFullBackup"
                  class="ui-pill ui-hue-quiet vl-flag"
                  title="No fallback cast — insurance only, does not affect completeness"
                >no fallback</span>
                <!-- THE LABEL THAT ARRIVES BEFORE THE TAP (Tom, 2026-08-31).
                     A language whose status is already 'human' says so in the
                     status pill; this is for the ones that do NOT — English,
                     German, Finnish — where only SOME courses are recorded and
                     the row would otherwise read as wholly synthetic. -->
                <span
                  v-if="humanRowLabel(lang) && lang.status !== 'human'"
                  class="ui-pill ui-hue-info vl-flag"
                  :title="`A cast here will not speak over these: ${humanCourseList(lang)}`"
                >{{ humanRowLabel(lang) }}</span>
              </td>
              <td>
                <button class="ui-sort-btn" @click="toggleLanguage(lang)">
                  {{ expanded === lang.code ? 'Hide' : 'Voices' }}
                </button>
              </td>
            </tr>

            <tr v-if="expanded === lang.code" :key="lang.code + ':slots'" class="vl-detail">
              <td colspan="7">
                <!-- Tom, 2026-08-29: "I can't tell which language I'm looking
                     at when I select it." The expanded panel names itself, and
                     stays named while it is scrolled. -->
                <div class="vl-detail-head">
                  <span class="vl-detail-name">{{ langName(lang) }}</span>
                  <span class="vl-code">{{ lang.code }}</span>
                  <span v-if="lang.dialectOf" class="ui-pill ui-hue-quiet">own cast · not {{ lang.dialectOf }}</span>
                  <span class="ui-pill" :class="hueFor(lang.status)">{{ statusLabel(lang.status) }}</span>
                  <span class="vl-muted">{{ lang.courses }} course{{ lang.courses === 1 ? '' : 's' }}</span>
                  <!-- WHAT 1.00x MEANS IN THIS LANGUAGE. Every voice below is a
                       ratio against this read of this sentence, so the ratio is
                       checkable rather than merely asserted. -->
                  <span
                    v-if="lang.paceReference"
                    class="vl-ref"
                    :title="referenceTitle(lang.paceReference)"
                  >reference {{ lang.paceReference.reference_seconds.toFixed(2) }}s · {{ lang.paceReference.voices }} voice{{ lang.paceReference.voices === 1 ? '' : 's' }}</span>
                  <span v-else class="vl-ref" title="No voice in this language has been measured from the provider API yet, so there is no reference pace to compare against.">no pace reference yet</span>
                  <span
                    v-for="p in lang.providersInUse"
                    :key="p.provider"
                    class="ui-pill"
                    :class="providerHue(p.provider)"
                  >{{ providerLabel(p.provider) }} {{ p.courses }}</span>
                  <button class="ui-sort-btn vl-detail-close" @click="toggleLanguage(lang)">Hide</button>
                </div>

                <p v-if="lang.knownOnly" class="vl-note vl-muted">Known side only — guide voice, no phrase voices.</p>
                <p v-else-if="lang.human" class="vl-note vl-muted">Human-recorded — no TTS provider.</p>
                <p v-else-if="!lang.cartesiaCovers" class="vl-note vl-muted">No Cartesia — a new render falls to Azure.</p>

                <!-- ── WHAT A CAST HERE WILL NOT SPEAK OVER ─────────────────
                     Tom's ruling, 2026-08-31: name the human-recorded courses
                     ON SCREEN, before Cast is tapped. Shown for every language
                     that has any, including the ones whose status pill says
                     nothing about it. -->
                <p
                  v-if="humanOf(lang, 'phrase').total || humanOf(lang, 'guide').total"
                  class="vl-note vl-note-human"
                >
                  <strong v-if="lang.humanRecorded && lang.humanRecorded.blocked">
                    Casting refused — every course here is human-recorded:
                  </strong>
                  <strong v-else>Human-recorded, a cast will not reach:</strong>
                  <span
                    v-for="c in [...humanOf(lang, 'phrase').courses, ...humanOf(lang, 'guide').courses]"
                    :key="c.course + c.roles.join()"
                    class="ui-pill ui-hue-info vl-human-course"
                    :title="c.reasons.join(' ')"
                  ><code>{{ c.course }}</code> · {{ c.roles.join(', ') }}<template v-if="c.clips"> · {{ c.clips.toLocaleString('en-GB') }} clips</template></span>
                </p>

                <!-- WHAT THE LAST CAST ACTUALLY SKIPPED. The server's own
                     answer, kept after the reload, so "saved" never stands on
                     its own when it did not reach everything. -->
                <p v-if="(skipped[lang.code] || []).length" class="vl-note vl-note-human">
                  <strong>Saved · skipped {{ skipped[lang.code].length }} human-recorded:</strong>
                  <span
                    v-for="c in skipped[lang.code]"
                    :key="'skip:' + c.course + c.roles.join()"
                    class="ui-pill ui-hue-info vl-human-course"
                    :title="c.reasons.join(' ')"
                  ><code>{{ c.course }}</code> · {{ c.roles.join(', ') }}</span>
                </p>

                <!-- ── WHAT YOU ARE LISTENING TO, AND WHOSE IT IS ───────
                     Tom's correction, 2026-08-31: VOICE is per language, TEXT
                     is per course. So the line is shown WITH the course it came
                     from, never as "the" line for the language, and the sentence
                     below says out loud that casting decides who speaks and not
                     what is said. -->
                <div class="vl-sample-line">
                  <template v-if="lineFor(lang)">
                    <p class="vl-line-text" :lang="lang.code">{{ lineFor(lang).text }}</p>
                    <p class="vl-line-meta">
                      <span v-if="lineFor(lang).knownText" class="vl-line-known">{{ lineFor(lang).knownText }}</span>
                      <span class="vl-muted">from <code>{{ lineFor(lang).course || 'the estate' }}</code>{{ lineFor(lang).kind === 'instruction' ? ' · instruction line' : '' }}</span>
                    </p>
                  </template>
                  <p v-else-if="samplesBusy === lang.code" class="vl-muted">finding a real line…</p>
                  <p v-else-if="samplesByLang[lang.code] && samplesByLang[lang.code].error" class="vl-muted">
                    No samples: {{ samplesByLang[lang.code].error }}
                  </p>
                  <p v-else class="vl-muted">No course line here — nothing to audition.</p>

                  <!-- GENERATE PREVIEW CLIPS — one tap on the language, every
                       voice above, the SAME line for all of them. The only
                       button on this screen that spends money, and it says what
                       it costs before it is pressed. -->
                  <p v-if="previewPlan(lang).n" class="vl-prepare">
                    <button
                      class="ui-sort-btn vl-generate"
                      :disabled="samplesBusy === lang.code"
                      @click="generatePreviews(lang)"
                    >{{ samplesBusy === lang.code ? 'Generating…' : 'Generate preview clips' }}</button>
                    <span v-if="previewRun && previewRun.code === lang.code" class="vl-muted">
                      {{ previewRun.done }} of {{ previewRun.total }} rendered
                    </span>
                    <span v-else class="vl-muted">
                      {{ previewPlan(lang).n }} unheard · {{ previewPlan(lang).chars }} chars
                    </span>
                  </p>
                  <p v-else-if="lineFor(lang) && Object.keys(samplesFor(lang)).length" class="vl-muted vl-prepare">
                    Every voice has this line · free to replay
                    <button
                      class="vl-regenerate"
                      :disabled="samplesBusy === lang.code"
                      @click="generatePreviews(lang, { force: true })"
                    >{{ samplesBusy === lang.code ? 'Re-generating…' : `Re-generate all ${previewPlan(lang, true).n}` }}</button>
                    <span v-if="previewRun && previewRun.code === lang.code">
                      — {{ previewRun.done }} of {{ previewRun.total }}
                    </span>
                    <span v-else>· {{ previewPlan(lang, true).chars }} chars</span>
                  </p>
                  <p v-if="samplesByLang[lang.code] && samplesByLang[lang.code].unrenderable?.length" class="vl-muted vl-prepare">
                    {{ samplesByLang[lang.code].unrenderable.length }} castable, not previewable —
                    {{ unrenderableReasons(lang).join(' · ') }}
                  </p>
                </div>

                <!-- PHRASE VOICES — the course material. These are the two
                     that make a language complete. -->
                <p class="vl-slot-group">Phrase voices</p>
                <div class="vl-slots">
                  <div v-for="slot in slotsOf(lang)" :key="slotKey(lang, slot)" class="vl-slot">
                    <div class="vl-slot-label">
                      {{ slot.gender === 'm' ? 'male' : 'female' }} · {{ slot.rankName }}
                    </div>

                    <div v-if="slot.filled" class="vl-slot-filled">
                      <span class="vl-voice">{{ slot.voiceName }}</span>
                      <span class="vl-kind">{{ slot.kind }}</span>
                      <span v-if="slot.active === false" class="ui-pill ui-hue-bad">voice inactive</span>
                      <!-- CONSENT TRAVELS ONTO THE CAST SLOT. This is the one
                           place a voice is actually in front of learners, so it
                           is the one place "who authorised this?" most has to be
                           answerable at a glance. Drawn only for voices the
                           question is about — a vendor's stock voice has nobody
                           behind it to ask. -->
                      <ConsentBadge v-if="slot.consent && slot.consent.aboutAPerson" :consent="slot.consent" />
                      <button
                        v-if="slot.consent && slot.consent.aboutAPerson"
                        class="ui-sort-btn vl-consent-btn"
                        title="Record who authorised this voice, and when"
                        @click="openConsent(slot.voiceId, slot.consent)"
                      >consent…</button>
                      <!-- PER-VOICE NATURAL PACE (Tom, 2026-08-29). The belt
                           ramp multiplies, so 0.8x of a brisk voice and 0.8x of
                           a measured one are nowhere near each other. This says
                           how brisk THIS voice is relative to the other voices
                           in its language, measured from clips already rendered
                           at 1.0x — and lets an ear correct it. -->
                      <span
                        v-if="slot.pace && slot.pace.effective !== null"
                        class="vl-pace"
                        :class="paceClass(slot.pace.effective)"
                        :title="paceTitle(slot.pace)"
                      >{{ slot.pace.effective.toFixed(2) }}x pace</span>
                      <span
                        v-if="slot.pace && paceSpeeds(slot.pace)"
                        class="vl-pace vl-speeds"
                        :title="speedsTitle(slot.pace)"
                      >{{ slot.pace.easy.toFixed(2) }} easy / {{ slot.pace.fast.toFixed(2) }} fast</span>
                      <span v-else-if="slot.filled" class="vl-pace vl-pace-unknown" title="No pace measured for this voice — it plays exactly as it does today.">pace unmeasured</span>
                      <input
                        v-if="slot.pace && slot.pace.ratio !== null"
                        class="ui-input vl-nudge"
                        type="number" step="0.01" min="0.5" max="2"
                        :value="slot.pace.nudge ?? ''"
                        placeholder="nudge"
                        title="Your correction, multiplied on top of the measurement. Blank clears it. A re-measurement never overwrites this."
                        :disabled="busy === slotKey(lang, slot)"
                        @change="nudge(lang, slot, $event.target.value)"
                      />
                      <button
                        class="ui-sort-btn"
                        :disabled="busy === slotKey(lang, slot)"
                        @click="clear(lang, slot)"
                      >Clear</button>
                    </div>

                    <div v-else class="vl-slot-empty">
                      <!-- A REFUSAL THE EYE CAN SEE. Where every course this
                           slot could reach is human-recorded, the candidate
                           list is replaced by the reason — not left tappable
                           with a 409 waiting behind it (Tom, 2026-08-31). -->
                      <p v-if="humanBlocks(lang, 'phrase')" class="vl-muted vl-slot-refused">
                        Not castable — human-recorded.
                      </p>
                      <CandidateVoices
                        v-else
                        :candidates="candidatesFor(lang, slot)"
                        :samples="samplesFor(lang)"
                        :unrenderable-why="(samplesByLang[lang.code] || {}).unrenderableWhy || {}"
                        :playing="playing"
                        :busy="busy === slotKey(lang, slot)"
                        :pace-title="(c) => (c.pace ? candidatePace(c) : '')"
                        :pace-suffix="paceSuffix"
                        :open-voice="openVoice"
                        :open-clips="openClips"
                        :rendering="renderingClip"
                        @play="play(lang, $event)"
                        @cast="cast(lang, slot, $event)"
                        @open="toggleVoice(lang, $event)"
                        @hear="hearVoice(lang, $event)"
                        @consent="openConsent($event)"
                      />
                    </div>
                  </div>
                </div>

                <!-- ── GUIDE VOICE — a different animal, so a separate block ──
                     Tom, 2026-08-29: the instructions and encouragements "are
                     not linked to a course per se - they are linked to every
                     course with the same known language, because these are
                     messages to the learner". Cast against this language as a
                     KNOWN language, one voice not a pair, and NEVER counted
                     toward the status above. -->
                <p class="vl-slot-group vl-guide-group">
                  Guide voice — instructions
                  <span class="vl-muted vl-guide-sub">
                    <template v-if="lang.knownCourses">{{ lang.knownCourses }} course{{ lang.knownCourses === 1 ? '' : 's' }} taught from {{ langName(lang) }}</template>
                    <template v-else>no course is taught from {{ langName(lang) }} yet</template>
                    · not counted above
                  </span>
                </p>

                <p v-if="lang.guide?.inUse?.length" class="vl-note vl-guide-inuse">
                  Speaking now:
                  <span v-for="u in lang.guide.inUse" :key="u.voiceId" class="ui-pill" :class="u.human ? 'ui-hue-info' : 'ui-hue-good'">
                    {{ u.name }} · {{ u.clips }} clip{{ u.clips === 1 ? '' : 's' }}
                  </span>
                </p>

                <div class="vl-slots">
                  <div v-for="slot in guideSlotsOf(lang)" :key="slotKey(lang, slot)" class="vl-slot vl-slot-guide">
                    <div class="vl-slot-label">guide · {{ slot.rankName }}</div>

                    <div v-if="slot.filled" class="vl-slot-filled">
                      <span class="vl-voice">{{ slot.voiceName }}</span>
                      <span class="vl-kind">{{ slot.kind }}</span>
                      <span v-if="slot.active === false" class="ui-pill ui-hue-bad">voice inactive</span>
                      <!-- CONSENT TRAVELS ONTO THE CAST SLOT. This is the one
                           place a voice is actually in front of learners, so it
                           is the one place "who authorised this?" most has to be
                           answerable at a glance. Drawn only for voices the
                           question is about — a vendor's stock voice has nobody
                           behind it to ask. -->
                      <ConsentBadge v-if="slot.consent && slot.consent.aboutAPerson" :consent="slot.consent" />
                      <button
                        v-if="slot.consent && slot.consent.aboutAPerson"
                        class="ui-sort-btn vl-consent-btn"
                        title="Record who authorised this voice, and when"
                        @click="openConsent(slot.voiceId, slot.consent)"
                      >consent…</button>
                      <!-- PER-VOICE NATURAL PACE (Tom, 2026-08-29). The belt
                           ramp multiplies, so 0.8x of a brisk voice and 0.8x of
                           a measured one are nowhere near each other. This says
                           how brisk THIS voice is relative to the other voices
                           in its language, measured from clips already rendered
                           at 1.0x — and lets an ear correct it. -->
                      <span
                        v-if="slot.pace && slot.pace.effective !== null"
                        class="vl-pace"
                        :class="paceClass(slot.pace.effective)"
                        :title="paceTitle(slot.pace)"
                      >{{ slot.pace.effective.toFixed(2) }}x pace</span>
                      <span
                        v-if="slot.pace && paceSpeeds(slot.pace)"
                        class="vl-pace vl-speeds"
                        :title="speedsTitle(slot.pace)"
                      >{{ slot.pace.easy.toFixed(2) }} easy / {{ slot.pace.fast.toFixed(2) }} fast</span>
                      <span v-else-if="slot.filled" class="vl-pace vl-pace-unknown" title="No pace measured for this voice — it plays exactly as it does today.">pace unmeasured</span>
                      <input
                        v-if="slot.pace && slot.pace.ratio !== null"
                        class="ui-input vl-nudge"
                        type="number" step="0.01" min="0.5" max="2"
                        :value="slot.pace.nudge ?? ''"
                        placeholder="nudge"
                        title="Your correction, multiplied on top of the measurement. Blank clears it. A re-measurement never overwrites this."
                        :disabled="busy === slotKey(lang, slot)"
                        @change="nudge(lang, slot, $event.target.value)"
                      />
                      <button
                        class="ui-sort-btn"
                        :disabled="busy === slotKey(lang, slot)"
                        @click="clear(lang, slot)"
                      >Clear</button>
                    </div>

                    <!-- The GUIDE slot casts exactly like a phrase slot: same
                         list, same two taps. Tom named it as the slot that
                         exists with nothing in it, so it must not feel like an
                         afterthought. -->
                    <div v-else class="vl-slot-empty">
                      <CandidateVoices
                        :candidates="candidatesFor(lang, slot)"
                        :samples="samplesFor(lang)"
                        :unrenderable-why="(samplesByLang[lang.code] || {}).unrenderableWhy || {}"
                        :playing="playing"
                        :busy="busy === slotKey(lang, slot)"
                        :pace-title="(c) => (c.pace ? candidatePace(c) : '')"
                        :pace-suffix="paceSuffix"
                        :open-voice="openVoice"
                        :open-clips="openClips"
                        :rendering="renderingClip"
                        empty-text="no voice in the estate declares this language"
                        @play="play(lang, $event)"
                        @cast="cast(lang, slot, $event)"
                        @open="toggleVoice(lang, $event)"
                        @hear="hearVoice(lang, $event)"
                        @consent="openConsent($event)"
                      />
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

  </div>
</template>

<style scoped>
/* The search field, the filter chips, the pill badges and the table itself all
   come from `src/assets/ui-tokens.css` — the same file the Course Library reads
   from, so this screen and that one are one product rather than two that nearly
   match. What is left here is only what is particular to a language row. */
.vl-search { margin-bottom: .75rem; }
.vl-filters { margin-bottom: .5rem; }
.chip-no { margin-left: .35rem; opacity: .75; font-variant-numeric: tabular-nums; }

/* The words first, the code beside them. Both, always: the name is what a
   person reads, the code is what everything else in the estate is keyed on. */
.vl-lang { white-space: nowrap; }
.vl-name { font-weight: 600; }
.vl-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--accent-2); }
.vl-lang .vl-code { margin-left: .4rem; font-size: .75rem; opacity: .8; }
.vl-inuse { display: table-cell; }
.vl-inuse .ui-pill { margin-right: .25rem; }

/* The expanded panel says which language it belongs to, and keeps saying it
   while the panel is scrolled — the whole point of Tom's screenshot. */
.vl-detail-head { position: sticky; top: 0; z-index: 2; display: flex; gap: .4rem; align-items: center;
  flex-wrap: wrap; padding: .45rem .1rem .5rem; margin: -.25rem 0 .5rem;
  background: var(--surface-2); border-bottom: 1px solid var(--line); }
.vl-detail-name { font-weight: 700; font-size: .95rem; }
.vl-detail-close { margin-left: auto; }
.vl-clone-lang { align-self: center; font-size: .8125rem; }
.vl-wide { flex: 1 1 24rem; }
.vl-guidance { margin: .25rem 0 .75rem; font-size: .875rem; }
.vl-consent-row { align-items: center; }
.vl-consent-btn { font-size: .6875rem; padding: .1rem .4rem; }
.vl-consent-editor { border: 1px solid var(--line); border-radius: 8px; padding: .75rem 1rem; margin-top: 1rem; }
.vl-warn-line { margin: .5rem 0; font-size: .8125rem; }
.vl-estate { display: flex; flex-direction: column; gap: .5rem; }
.vl-speakers { display: flex; flex-wrap: wrap; gap: .4rem; max-height: 12rem; overflow-y: auto; }
.vl-speaker {
  display: flex; flex-direction: column; gap: .1rem; text-align: left;
  border: 1px solid var(--line); border-radius: 8px; background: transparent;
  color: inherit; font: inherit; cursor: pointer; padding: .4rem .6rem; min-width: 12rem;
}
.vl-speaker.is-on { border-color: var(--accent, #6366f1); background: var(--surface-2, rgba(99, 102, 241, .1)); }
.vl-speaker-id { font-weight: 600; font-size: .8125rem; }
.vl-speaker-nums { font-size: .75rem; opacity: .9; }
.vl-speaker-roles { font-size: .6875rem; opacity: .6; }
.vl-clips { display: flex; flex-direction: column; gap: .3rem; max-height: 22rem; overflow-y: auto; }
.vl-clip { display: flex; align-items: center; gap: .5rem; padding: .2rem .3rem; border-radius: 6px; }
.vl-clip:hover { background: var(--surface-2, rgba(127, 127, 127, .08)); }
.vl-clip-secs { flex: none; width: 3.2rem; font-variant-numeric: tabular-nums; font-size: .8125rem; }
.vl-clip-role { flex: none; font-size: .6875rem; }
.vl-clip-audio { flex: none; height: 2rem; width: 15rem; }
.vl-clip-text { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .8125rem; opacity: .8; }
.vl-pick-hint { margin: .25rem 0 0; }

/* ── THE DEMO ROWS ────────────────────────────────────────────────────────
   A clone sits UNDER its source, indented and rule-joined, so "this came from
   that" is read rather than explained. Nothing here is a modal or a new panel:
   the comparison has to survive being scrolled past on a shared screen. */
.vl-cliprow { border-bottom: 1px solid var(--line); padding-bottom: .2rem; }
.vl-cliprow:last-child { border-bottom: 0; }
.vl-cliprow-clone {
  flex: none; margin-left: auto; padding: .25rem .7rem; font: inherit; font-size: .8125rem;
  font-weight: 600; border: 1px solid var(--line); border-radius: 6px;
  background: transparent; color: inherit; cursor: pointer; white-space: nowrap;
}
.vl-cliprow-clone:hover:not(:disabled) { background: var(--accent, #6366f1); border-color: var(--accent, #6366f1); color: #fff; }
.vl-cliprow-clone:disabled { opacity: .4; cursor: default; }
.vl-made {
  display: flex; align-items: center; gap: .5rem; flex-wrap: wrap;
  margin: .1rem 0 .35rem 2.4rem; padding: .3rem .5rem;
  border-left: 3px solid var(--accent, #6366f1); border-radius: 0 6px 6px 0;
  background: var(--surface-2, rgba(99, 102, 241, .07));
}
.vl-made.is-failed { border-left-color: var(--bad, #dc2626); }
.vl-made-summary { margin-left: 0; }
.vl-made-spin { flex: none; opacity: .7; }
.vl-made-stage { flex: none; font-size: .8125rem; font-weight: 600; }
.vl-made-name { flex: none; font-size: .8125rem; font-weight: 600; }
.vl-made-from { flex: none; font-size: .75rem; }
.vl-made-line { flex: 1 1 12rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .8125rem; opacity: .75; font-style: italic; }
.vl-flag { margin-left: .35rem; }
.vl-count.ok { color: var(--success); font-weight: 600; }
.vl-count.warn { color: var(--accent); font-weight: 600; }
.vl-count.fail { color: var(--danger); font-weight: 600; }

.vl-detail td { background: var(--surface-2); }
.vl-note { margin: .25rem 0 .75rem; }
/* The human-recording notice reads as information, never as an error: a real
   recording is the best outcome a slot can have, not a fault. */
.vl-note-human {
  padding: .5rem .6rem; border-radius: 6px;
  border-left: 3px solid var(--info, #38bdf8);
  background: var(--surface-2, rgba(127, 127, 127, .08));
}
.vl-human-course { margin: .15rem .25rem 0 0; display: inline-block; font-size: .6875rem; }
.vl-slot-refused { margin: 0; line-height: 1.45; }
/* Two columns, not four: at four the phrase slots squeezed every candidate's
   NAME to nothing — the one thing a cast is chosen by. Fixed at two so the
   male/female pair reads as a 2x2 rather than three and an orphan. */
.vl-slots { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .6rem; }
@media (max-width: 900px) { .vl-slots { grid-template-columns: minmax(0, 1fr); } }
.vl-slot { border: 1px solid var(--line); border-radius: .5rem; padding: .5rem; background: var(--surface); }
.vl-slot-group { font-size: .75rem; text-transform: uppercase; letter-spacing: .05em;
  color: var(--faint); margin: .5rem 0 .4rem; }
/* The sample line reads as a quotation, because that is what it is: somebody's
   actual course sentence, not a label on this screen. */
/* The generate button is the primary action of the block and the regenerate is
   deliberately not: one is what you do, the other is what you do again on
   purpose. Tokens only — no hard-coded colour. */
.vl-generate { font-weight: 600; }
.vl-regenerate {
  border: 1px solid var(--line); background: transparent; color: inherit;
  border-radius: 6px; cursor: pointer; font: inherit; font-size: .8125rem;
  padding: .15rem .55rem; margin: 0 .15rem;
}
.vl-regenerate:hover:not(:disabled) { background: var(--surface-2, rgba(127, 127, 127, .08)); }
.vl-regenerate:disabled { opacity: .5; cursor: default; }

.vl-sample-line { margin: .9rem 0 .2rem; padding: .6rem .8rem; border-radius: 8px;
                  background: var(--surface-2, rgba(127,127,127,.07)); }
.vl-line-text { margin: 0; font-size: 1.0625rem; font-weight: 600; }
.vl-line-meta { margin: .15rem 0 0; font-size: .8125rem; display: flex; flex-wrap: wrap; gap: .6rem; }
.vl-line-known { opacity: .75; }
.vl-prepare { margin: .55rem 0 0; display: flex; align-items: center; gap: .6rem; flex-wrap: wrap;
              font-size: .8125rem; }

/* The guide block is set apart rather than mixed in with the phrase slots: it
   is a different kind of audio, cast on a different language role. */
.vl-guide-group { margin-top: 1.1rem; padding-top: .8rem; border-top: 1px dashed var(--line); }
.vl-guide-sub { display: block; margin-top: .25rem; text-transform: none; letter-spacing: 0;
  font-size: .75rem; max-width: 70ch; }
.vl-guide-inuse { font-size: .8125rem; }
.vl-guide-inuse .ui-pill { margin-right: .25rem; }
.vl-slot-guide { border-style: dashed; }
.vl-pace { font-size: .7rem; padding: .1rem .35rem; border-radius: 3px; white-space: nowrap; }
.vl-pace-fast { background: rgba(124,92,255,.15); color: #7c5cff; }
.vl-pace-slow { background: rgba(217,134,0,.15); color: #d98600; }
.vl-pace-typical { background: rgba(122,134,153,.12); color: var(--faint); }
.vl-pace-unknown { color: var(--faint); opacity: .6; }
.vl-speeds { background: rgba(46,160,110,.14); color: #2ea06e; }
.vl-ref { font-size: .7rem; color: var(--faint); white-space: nowrap; }
.vl-nudge { width: 4.5rem; font-size: .7rem; padding: .1rem .25rem; }
.vl-slot-label { font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; color: var(--faint); margin-bottom: .3rem; }
.vl-slot-filled { display: flex; gap: .4rem; align-items: center; flex-wrap: wrap; }
.vl-slot-empty { display: flex; gap: .4rem; align-items: center; flex-wrap: wrap; }
.vl-voice { font-weight: 600; }
.vl-kind { font-size: .75rem; color: var(--muted); }
.vl-muted { color: var(--muted); }
.vl-error { color: var(--danger); }
.vl-clone { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--line); }
/* .vl-btn carried no style at all until 2026-08-30, so every control on the
   clone form drew as bare text — a button nobody can see is a button nobody
   presses, which is half of why this feature read as missing. */
.vl-btn {
  background: var(--surface-2, var(--surface));
  border: 1px solid var(--line);
  color: var(--ink);
  border-radius: 9999px;
  padding: .45rem 1rem;
  font-family: inherit;
  font-size: .8125rem;
  cursor: pointer;
  transition: all .15s;
}
.vl-btn:hover:not(:disabled) { border-color: #ec4899; color: #ec4899; }
.vl-btn:disabled { opacity: .45; cursor: default; }
.vl-clone-top { margin-top: 0; padding-top: 0; border-top: none; margin-bottom: 1.25rem; }
.vl-clone-open { font-weight: 600; font-size: .9375rem; background: #ec4899; border-color: #ec4899; color: #fff; }
.vl-clone-open:hover:not(:disabled) { color: #fff; opacity: .9; }
.vl-recording { background: #dc2626; color: #fff; }
.vl-record-row { align-items: center; }
.vl-record-audio { height: 2rem; max-width: 18rem; }
.vl-source-row { align-items: center; }
.vl-audition-text { min-width: 22rem; }
/* The step numerals. Deliberately quiet — they order the panel, they are not
   headings, and the moment they compete with the fields they are noise. */
.vl-step {
  display: inline-block; min-width: 1.05rem; text-align: center;
  border-radius: 999px; background: var(--surface-3); color: inherit;
  font-size: .6875rem; font-weight: 600; padding: 0 .1rem; margin-right: .3rem;
}
.vl-sub { padding-left: 1.35rem; }
.vl-born { flex: none; margin-left: auto; font-size: .6875rem; }

/* THE DECLARATION. The words a person reads aloud or agrees to are the whole
   point of the block, so they are set larger than the chrome around them and
   given a coloured edge — this is the one thing on the panel a human other
   than the operator is expected to read. */
.vl-declare {
  border: 1px solid var(--surface-3); border-left: 3px solid #ec4899;
  border-radius: 8px; padding: .6rem .85rem; margin-top: .6rem;
}
.vl-declare-words { font-size: 1.0625rem; line-height: 1.5; margin: .35rem 0 0; }
.vl-declare-err { font-size: .8125rem; color: var(--danger); margin: .4rem 0 0; }
.vl-declare-heard { font-size: .78rem; color: var(--warning, #f59e0b); margin: .4rem 0 0; }
.vl-agree { display: inline-flex; align-items: center; gap: .4rem; font-size: .8125rem; }
.vl-record-block { margin-top: .5rem; }
.vl-clone-done { margin-top: .75rem; }
.vl-clone-body { margin-top: .75rem; max-width: 60rem; }
.vl-clone-row { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; margin-top: .5rem; }
.vl-narrow { max-width: 10rem; }
.vl-ok { color: var(--success); margin-top: .5rem; }

/* Phone: the table scrolls sideways inside its wrap rather than squeezing. */
/* Phone: courses and provider drop out, the way the courses page drops KNOWN
   and TARGET. What is left is the language, how many voices it has and the
   status — which is the whole question this screen answers. */
@media (max-width: 640px) {
  .vl-wide { display: none; }
  .ui-table th, .ui-table td { padding: 0.4rem 0.4rem; }
  .ui-sort-btn { padding: 0.15rem 0.5rem; font-size: 0.7rem; }
}
</style>
