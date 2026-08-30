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
// The estate's ONE place that turns a code into words. Importing it also kicks
// off the CSV name fetch, so nothing else here has to.
import { languageName } from '@/utils/languageNames'

const data = ref(null)
const loading = ref(true)
const error = ref('')
const filter = ref('all')
const provFilter = ref('all')
const q = ref('')
const busy = ref('')
const expanded = ref(null)

// ── Cloning ────────────────────────────────────────────────────────────────
// One sample in, one voice id out. Cartesia's POST /voices/clone IS the INSTANT
// path — verified against their live reference 2026-08-30: the parameters are
// clip, name, language and four optional descriptors, and there is NO mode or
// fidelity parameter, so there is nothing to pin. Their "Pro Voice Clone" is a
// separate product and is not reachable from this endpoint at all, which is
// what Tom asked for ("just the instant clones").
//
// The sample can come from a FILE or from the MICROPHONE on this page. Cartesia
// asks for at least 10 seconds and recommends up to 60 for a less common
// accent, clean, no pauses — so the recorder says the elapsed seconds out loud
// rather than leaving the operator to guess, and lets them listen and redo it
// before anything is uploaded.
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
const cloneResult = ref(null)

/** 'upload' | 'record' — where this sample is coming from. */
const cloneSource = ref('upload')

function pickFile (e) {
  cloneFile.value = e.target.files?.[0] || null
  clearRecording()
}

// ── Recording on the page ──────────────────────────────────────────────────
// MediaRecorder, and nothing else: no library, no upload until the operator has
// heard the take. If the browser or the deployment refuses the microphone we
// say so in one line and the upload path is untouched — a half-alive recorder
// that silently captures nothing is worse than no recorder.
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

/** Cartesia's own guidance: 10s is the floor, 60s is the useful ceiling. */
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
  return `${recordSeconds.value}s — a good length.`
})

async function submitClone () {
  if (!cloneFile.value || !cloneName.value) return
  cloneBusy.value = true
  cloneResult.value = null
  auditionClips.value = []
  auditionError.value = ''
  error.value = ''
  try {
    const fd = new FormData()
    fd.append('clip', cloneFile.value)
    fd.append('name', cloneName.value)
    fd.append('language', cloneLang.value)
    if (cloneGender.value) fd.append('gender', cloneGender.value)
    const out = await api.cloneVoice(fd)
    cloneResult.value = out
    cloneName.value = ''
    cloneFile.value = null
    clearRecording()
    await load()
  } catch (e) { error.value = e.message }
  cloneBusy.value = false
}

// ── Hearing it ─────────────────────────────────────────────────────────────
// The half that was missing until 2026-08-30: a clone you cannot hear is a
// clone you cannot judge, and the next move was casting an unheard voice into a
// course. THIS is the press that spends — capped at three clips by the backend,
// under the lab's ordinary daily character ceiling.
const auditionText = ref('This is what the new voice sounds like, on a full sentence.')
const auditionBusy = ref(false)
const auditionClips = ref([])
const auditionError = ref('')

async function audition (voiceId, language) {
  auditionBusy.value = true
  auditionError.value = ''
  auditionClips.value = []
  try {
    const out = await api.auditionVoice({
      voiceId,
      language,
      sentences: auditionText.value.split('\n').map((t) => t.trim()).filter(Boolean),
    })
    auditionClips.value = await Promise.all(
      (out.clips || []).map(async (c) => ({ ...c, src: await clipUrl(c.url) })),
    )
  } catch (e) { auditionError.value = e.message }
  auditionBusy.value = false
}

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
    .filter((l) => !needle || l.code.toLowerCase().includes(needle) || languageName(l.code).toLowerCase().includes(needle))
    // THE ORDER TOM ASKED FOR (2026-08-29): live courses first, then course
    // count descending, then alphabetical BY NAME — "Arabic before Bengali
    // before Croatian", not "ara before ben before hrv". Done here and not on
    // the server because this is where the name lookup lives.
    .slice()
    .sort((a, b) => {
      const live = (l) => (l.released > 0 ? 0 : 1)
      return live(a) - live(b)
        || b.courses - a.courses
        || languageName(a.code).localeCompare(languageName(b.code))
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
    ...totals.map((t) => ({ value: t.provider, label: providerLabel(t.provider), count: t.courses })),
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

/** "Korean · kor" — the words first, the code beside them, never one instead of the other. */
function langName (code) { return languageName(code) }

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

/** One busy key for every slot on the page — phrase slots carry a gender, guide slots do not. */
function slotKey (lang, slot) {
  return `${lang.code}:${slot.slot || 'phrase'}:${slot.gender || '-'}:${slot.rank}`
}

async function cast (lang, slot, voiceId) {
  if (!voiceId) return
  busy.value = slotKey(lang, slot)
  try {
    await api.castSlot(lang.code, {
      slot: slot.slot || 'phrase', gender: slot.gender, rank: slot.rank, voiceId,
    })
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
function candidatesFor (lang, slot) {
  if (slot.slot === 'guide') return lang.guide?.candidates || []
  return (lang.candidates || []).filter((c) => !c.gender || c.gender === slot.gender)
}
</script>

<template>
  <div class="vl-langs">
    <!-- The page subtitle above already says what this screen is and that
         casting writes nothing else. One line here, and it is the one fact the
         subtitle does not carry: where the rows come from. -->
    <p class="vl-intro">
      One row per language, read live from <code>courses</code>, <code>voices</code> and the same
      provider policy the render path uses. <strong>In use now</strong> is what each language's
      courses actually store in their own <code>voice_config</code>; <strong>if re-rendered</strong>
      is what a new render would pick, which is a different question.
    </p>

    <!-- The one number this rework exists to surface. xAI is being deprecated
         and this says, in courses, how much of the estate is standing on it. -->
    <p v-if="summary?.xaiCourses" class="vl-xai-line">
      <strong>{{ summary.xaiCourses }} course{{ summary.xaiCourses === 1 ? '' : 's' }}</strong>
      across {{ summary.xaiLanguages }} language{{ summary.xaiLanguages === 1 ? '' : 's' }}
      are configured on <strong>xAI</strong> right now
      ({{ summary.xaiRoles }} voice slot{{ summary.xaiRoles === 1 ? '' : 's' }}), the provider being
      deprecated. Voice configuration is a per-course call for whoever builds the course — this
      screen shows the situation and changes nothing.
    </p>

    <!-- MAKE A VOICE — moved to the top of this panel 2026-08-30. It was at the
         bottom, below every language in the estate, which on a phone is several
         screens of scrolling past a table you did not come for. Tom's ask was
         "create clones directly from this page"; a control you have to hunt for
         is not on the page in any sense that matters. -->
    <section class="vl-clone vl-clone-top">
      <button class="vl-btn vl-clone-open" @click="showClone = !showClone">
        {{ showClone ? 'Hide' : '＋ Make a new voice — clone one with Cartesia' }}
      </button>

      <div v-if="showClone" class="vl-clone-body">
        <p class="vl-muted">
          Give it a sample — <strong>upload a file or record one here</strong> — give it a name,
          and Cartesia returns a new voice. These are Cartesia's <strong>instant</strong> clones;
          the fine-tuned product is a different thing and is not reachable from here.
          The voice is registered straight away, so it is castable in the table below the moment
          it exists. Cloning itself <strong>renders no audio</strong>: hearing it is the separate
          press underneath, capped at three clips and counted against the lab's daily ceiling.
          Cartesia cannot clone a language it does not support, so Welsh, Breton and Cornish are
          refused with a message rather than a failure.
        </p>

        <div class="vl-clone-row">
          <input v-model="cloneName" class="ui-field" placeholder="name for the new voice" />
          <input v-model="cloneLang" class="ui-field vl-narrow" placeholder="language e.g. eng" />
          <span v-if="cloneLang" class="vl-muted vl-clone-lang">{{ langName(cloneLang) }}</span>
          <select v-model="cloneGender" class="ui-field vl-narrow">
            <option value="">gender unknown</option>
            <option value="m">male</option>
            <option value="f">female</option>
          </select>
        </div>

        <div class="vl-clone-row vl-source-row">
          <span class="ui-filter-label">Sample</span>
          <button
            class="ui-chip" :class="cloneSource === 'upload' ? 'ui-hue-info' : 'ui-chip-off'"
            @click="cloneSource = 'upload'"
          >Upload a file</button>
          <button
            class="ui-chip" :class="cloneSource === 'record' ? 'ui-hue-info' : 'ui-chip-off'"
            :disabled="!canRecord"
            :title="canRecord ? '' : 'This browser will not give the page a microphone.'"
            @click="cloneSource = 'record'"
          >Record it here</button>
        </div>

        <div v-if="cloneSource === 'upload'" class="vl-clone-row">
          <input type="file" accept="audio/*" class="ui-field" @change="pickFile" />
          <span class="vl-muted">10 seconds is the floor, up to 60 is better. Clean, no pauses.</span>
        </div>

        <div v-else class="vl-clone-row vl-record-row">
          <button v-if="!recording" class="vl-btn" @click="startRecording">● Record</button>
          <button v-else class="vl-btn vl-recording" @click="stopRecording">■ Stop — {{ recordSeconds }}s</button>
          <span v-if="recording" class="vl-muted">
            Read anything aloud, evenly, no pauses. Stops itself at 60s.
          </span>
          <template v-if="recordedUrl">
            <audio :src="recordedUrl" controls class="vl-record-audio" />
            <span class="vl-muted">{{ recordHint }}</span>
            <button class="ui-sort-btn" @click="startRecording">Record it again</button>
          </template>
          <span v-if="recordError" class="vl-error">{{ recordError }}</span>
        </div>

        <div class="vl-clone-row">
          <button class="vl-btn" :disabled="cloneBusy || !cloneFile || !cloneName" @click="submitClone">
            {{ cloneBusy ? 'Cloning…' : 'Create the clone' }}
          </button>
        </div>

        <div v-if="cloneResult" class="vl-clone-done">
          <p class="vl-ok">
            Created <strong>{{ cloneResult.voice?.display_name }}</strong>
            — registered as <code>{{ cloneResult.voice?.voice_id }}</code>.
            It is castable in the table below now, and it is in the Play menu.
          </p>
          <!-- HEAR IT. This is the only control on this panel that spends
               anything, and it says so. -->
          <div class="vl-clone-row">
            <input v-model="auditionText" class="ui-field vl-audition-text" placeholder="a sentence for it to say" />
            <button
              class="vl-btn"
              :disabled="auditionBusy"
              @click="audition(cloneResult.voice?.voice_id, cloneResult.voice?.languages?.[0] || cloneLang)"
            >{{ auditionBusy ? 'Rendering…' : '▶ Hear it' }}</button>
            <span class="vl-muted">one clip, through the lab's ordinary render path and its daily ceiling.</span>
          </div>
          <p v-if="auditionError" class="vl-error">{{ auditionError }}</p>
          <div v-for="c in auditionClips" :key="c.id" class="vl-clone-row">
            <audio :src="c.src" controls autoplay class="vl-record-audio" />
            <span class="vl-muted">{{ c.text }}</span>
          </div>
        </div>
      </div>
    </section>

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

      <span class="ui-count">{{ rows.length }} of {{ summary?.languages ?? 0 }} languages</span>
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

    <p v-if="summary" class="vl-tail vl-muted">
      Complete means {{ summary.requiredPerLanguage }} voices — one male, one female. Backups are
      insurance, not required<span v-if="summary.noBackup">, and {{ summary.noBackup }} complete
      language{{ summary.noBackup === 1 ? ' has' : 's have' }} none</span>.
    </p>

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
                <span class="vl-name">{{ langName(lang.code) }}</span>
                <span class="vl-code">{{ lang.code }}</span>
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
              </td>
              <td>
                <button class="ui-sort-btn" @click="expanded = expanded === lang.code ? null : lang.code">
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
                  <span class="vl-detail-name">{{ langName(lang.code) }}</span>
                  <span class="vl-code">{{ lang.code }}</span>
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
                  <button class="ui-sort-btn vl-detail-close" @click="expanded = null">Hide</button>
                </div>

                <p v-if="lang.knownOnly" class="vl-note">
                  <strong>No course teaches {{ langName(lang.code) }}</strong> — it is only ever the
                  known side, so it has no phrase-voice worklist. It is on this screen so its
                  <strong>guide voice</strong> can be cast: its learners hear instructions today.
                </p>
                <p v-else-if="lang.human" class="vl-note">
                  <strong>{{ langName(lang.code) }} is human-recorded only.</strong> A human recording wins
                  wherever it exists, so empty slots here are a recording worklist for its
                  recordists, not a casting gap. No TTS provider may ever be selected for it.
                </p>
                <p v-else-if="!lang.cartesiaCovers" class="vl-note">
                  Cartesia does not publish <strong>{{ langName(lang.code) }}</strong>, so a new render falls to
                  Azure. That is covered, just not by the default provider.
                </p>

                <!-- PHRASE VOICES — the course material. These are the two
                     that make a language complete. -->
                <p class="vl-slot-group">Phrase voices — the course material</p>
                <div class="vl-slots">
                  <div v-for="slot in slotsOf(lang)" :key="slotKey(lang, slot)" class="vl-slot">
                    <div class="vl-slot-label">
                      {{ slot.gender === 'm' ? 'male' : 'female' }} · {{ slot.rankName }}
                    </div>

                    <div v-if="slot.filled" class="vl-slot-filled">
                      <span class="vl-voice">{{ slot.voiceName }}</span>
                      <span class="vl-kind">{{ slot.kind }}</span>
                      <span v-if="slot.active === false" class="ui-pill ui-hue-bad">voice inactive</span>
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
                      <select
                        class="ui-select"
                        :disabled="busy === slotKey(lang, slot)"
                        @change="cast(lang, slot, $event.target.value)"
                      >
                        <option value="">— empty — choose a voice</option>
                        <option v-for="c in candidatesFor(lang, slot)" :key="c.voiceId" :value="c.voiceId" :title="c.pace ? candidatePace(c) : ''">
                          {{ c.name }} ({{ c.kind }}){{ paceSuffix(c) }}
                        </option>
                      </select>
                      <span v-if="!candidatesFor(lang, slot).length" class="vl-muted">
                        no voice in the estate declares this language
                      </span>
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
                  Guide voice — instructions and encouragements
                  <span class="vl-muted vl-guide-sub">
                    spoken to the learner, not course material. Cast against
                    <strong>{{ langName(lang.code) }}</strong> as a KNOWN language, so one cast serves
                    <template v-if="lang.knownCourses">
                      all {{ lang.knownCourses }} course{{ lang.knownCourses === 1 ? '' : 's' }} taught from it.
                    </template>
                    <template v-else>
                      any course taught from it — no course uses it as a known language today.
                    </template>
                    It never counts toward the status above.
                  </span>
                </p>

                <p v-if="lang.guide?.inUse?.length" class="vl-note vl-guide-inuse">
                  Speaking now:
                  <span v-for="u in lang.guide.inUse" :key="u.voiceId" class="ui-pill" :class="u.human ? 'ui-hue-info' : 'ui-hue-good'">
                    {{ u.name }} · {{ u.clips }} clip{{ u.clips === 1 ? '' : 's' }}
                  </span>
                  <span class="vl-muted"> — measured from the clips that exist, not from any config.</span>
                </p>

                <div class="vl-slots">
                  <div v-for="slot in guideSlotsOf(lang)" :key="slotKey(lang, slot)" class="vl-slot vl-slot-guide">
                    <div class="vl-slot-label">guide · {{ slot.rankName }}</div>

                    <div v-if="slot.filled" class="vl-slot-filled">
                      <span class="vl-voice">{{ slot.voiceName }}</span>
                      <span class="vl-kind">{{ slot.kind }}</span>
                      <span v-if="slot.active === false" class="ui-pill ui-hue-bad">voice inactive</span>
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
                      <select
                        class="ui-select"
                        :disabled="busy === slotKey(lang, slot)"
                        @change="cast(lang, slot, $event.target.value)"
                      >
                        <option value="">— empty — choose a voice</option>
                        <option v-for="c in candidatesFor(lang, slot)" :key="c.voiceId" :value="c.voiceId" :title="c.pace ? candidatePace(c) : ''">
                          {{ c.name }} ({{ c.kind }}){{ paceSuffix(c) }}{{ c.registered ? '' : ' — registers it too' }}
                        </option>
                      </select>
                      <span v-if="!candidatesFor(lang, slot).length" class="vl-muted">
                        no voice in the estate declares this language
                      </span>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>


    <div v-if="data?.notes" class="vl-notes">
      <p v-for="(text, key) in data.notes" :key="key" class="vl-muted">{{ text }}</p>
    </div>
  </div>
</template>

<style scoped>
/* The search field, the filter chips, the pill badges and the table itself all
   come from `src/assets/ui-tokens.css` — the same file the Course Library reads
   from, so this screen and that one are one product rather than two that nearly
   match. What is left here is only what is particular to a language row. */
.vl-intro { max-width: 60rem; margin: 0 0 1rem; color: var(--muted); font-size: 0.8125rem; }
.vl-search { margin-bottom: .75rem; }
.vl-filters { margin-bottom: .5rem; }
.chip-no { margin-left: .35rem; opacity: .75; font-variant-numeric: tabular-nums; }
.vl-tail { font-size: .75rem; margin: 0 0 1rem; max-width: 70ch; color: var(--muted); }

.vl-xai-line { max-width: 70ch; margin: 0 0 1rem; font-size: .8125rem; padding: .5rem .7rem;
  border: 1px solid var(--danger); border-radius: .5rem; background: var(--surface-2); }

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
.vl-flag { margin-left: .35rem; }
.vl-count.ok { color: var(--success); font-weight: 600; }
.vl-count.warn { color: var(--accent); font-weight: 600; }
.vl-count.fail { color: var(--danger); font-weight: 600; }

.vl-detail td { background: var(--surface-2); }
.vl-note { margin: .25rem 0 .75rem; }
.vl-slots { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: .6rem; }
.vl-slot { border: 1px solid var(--line); border-radius: .5rem; padding: .5rem; background: var(--surface); }
.vl-slot-group { font-size: .75rem; text-transform: uppercase; letter-spacing: .05em;
  color: var(--faint); margin: .5rem 0 .4rem; }
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
.vl-notes { margin-top: 1.25rem; display: grid; gap: .35rem; font-size: .75rem; }
.vl-clone { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--line); }
.vl-clone-top { margin-top: 0; padding-top: 0; border-top: none; margin-bottom: 1.25rem; }
.vl-clone-open { font-weight: 600; }
.vl-recording { background: #dc2626; color: #fff; }
.vl-record-row { align-items: center; }
.vl-record-audio { height: 2rem; max-width: 18rem; }
.vl-source-row { align-items: center; }
.vl-audition-text { min-width: 22rem; }
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
