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
import ConsentBadge from './ConsentBadge.vue'
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
  return [...counts.entries()].map(([reason, n]) => `${n} · ${reason}`)
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
const identityWarning = ref('')

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
    identityWarning.value = out.identityWarning || ''
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
  const entry = {
    id: `c${++cloneSeq}`,
    s3Key: clip.s3Key,
    clip,
    speaker: chosenSpeaker.value ? chosenSpeaker.value.voiceId : null,
    stage: 'cloning',
    seconds: 0,
    voice: null,
    consent: null,
    source: null,
    audio: null,
    line: demoLine.value,
    error: '',
  }
  clones.value = [...clones.value, entry]
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
    })
    entry.voice = made.voice
    entry.consent = made.consent
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
  const entry = {
    id: `c${++cloneSeq}`,
    s3Key: fromEstate && picked.length === 1 ? picked[0].s3Key : null,
    clip: fromEstate && picked.length === 1 ? picked[0] : null,
    joined: fromEstate ? picked : [],
    speaker: chosenSpeaker.value ? chosenSpeaker.value.voiceId : null,
    stage: 'cloning',
    seconds: 0,
    voice: null, consent: null, source: null, audio: null,
    line: demoLine.value,
    error: '',
  }
  clones.value = [...clones.value, entry]
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
      out = await api.cloneVoice(fd)
      cloneFile.value = null
      clearRecording()
    }
    entry.voice = out.voice
    entry.consent = out.consent
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
    entry.error = e.message
    entry.stage = 'failed'
  }
  clearInterval(tick)
  cloneBusy.value = false
}

// ── RECORDING AN AUTHORISATION ─────────────────────────────────────────────
// Tom, 2026-08-31: consent "is Tom to obtain, not you… There must be a plain
// way for Tom to authorise a voice once he has actually asked the person."
// This is that. It cannot invent a yes: a named human, a means and a date are
// all required, by the route and again by the database.
const consentFor = ref(null)
const consentForm = ref({ status: 'authorised', person: '', authorisedBy: '', authorisedHow: 'in person', authorisedAt: '', note: '' })
const consentBusy = ref(false)
const consentError = ref('')

function openConsent (voiceId, current) {
  consentError.value = ''
  consentFor.value = voiceId
  consentForm.value = {
    status: current?.status === 'not_recorded' ? 'authorised' : (current?.status || 'authorised'),
    person: current?.person || '',
    authorisedBy: current?.authorisedBy || current?.person || '',
    authorisedHow: current?.authorisedHow || 'in person',
    authorisedAt: (current?.authorisedAt || new Date().toISOString()).slice(0, 10),
    note: current?.note || '',
  }
}

async function saveConsent () {
  consentBusy.value = true
  consentError.value = ''
  try {
    await api.recordConsent(consentFor.value, { ...consentForm.value })
    consentFor.value = null
    await load()
  } catch (e) { consentError.value = e.message }
  consentBusy.value = false
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
 * ── THE WARNING BEFORE A VOICE WITHOUT A YES REACHES A LEARNER ──────────────
 * A cast is what puts a voice in front of learners, so it is the moment the
 * consent question actually bites. A voice that nobody has authorised — or that
 * somebody has refused — gets ONE plain sentence and a confirm, naming the
 * person and what is missing.
 *
 * It does NOT block, and that is a deliberate, flagged default (2026-08-31): a
 * hard block on casting an unauthorised voice is Tom's call to make and he has
 * not made it. This is the loudest thing short of taking the decision off him.
 * An authorised voice casts in one tap exactly as before, with no dialog at
 * all — a guard on every cast is a guard people learn to click through.
 */
async function cast (lang, slot, voiceId) {
  if (!voiceId) return
  const candidate = findCandidate(lang, slot, voiceId)
  const warning = candidate?.consent?.castWarning
  if (warning && !window.confirm(`${warning}\n\nCast it anyway?`)) return
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
        {{ showClone ? 'Hide' : '+ Make a new voice — clone one with Cartesia' }}
      </button>

      <div v-if="showClone" class="vl-clone-body">
        <p class="vl-muted">
          <strong>Clone from a recording we already hold</strong> — pick the speaker, listen to
          their clips, tick the one you want. Uploading a file or recording here still works and
          is what you use for somebody we hold no audio of.
          These are Cartesia's <strong>instant</strong> clones; the fine-tuned product is a
          different thing and is not reachable from here. The voice is registered straight away,
          so it is castable in the table below the moment it exists. Cloning itself
          <strong>renders no audio</strong>: hearing it is the separate press underneath, capped
          at three clips and counted against the lab's daily ceiling.
          Cartesia cannot clone a language it does not support, so Welsh, Breton and Cornish are
          refused with a message rather than a failure — Welsh stays human-recorded by standing
          rule, and nothing here writes, moves or replaces a single existing recording.
        </p>
        <p v-if="sampleGuidance" class="vl-guidance">
          <strong>{{ sampleGuidance.headline }}</strong> {{ sampleGuidance.detail }}
        </p>

        <!-- WHOSE VOICE IS THIS. Required before Cartesia is called at all.
             Consent itself is Tom's to obtain afterwards; a name is what makes
             that possible, and a record with nobody attached is decorative. -->
        <div class="vl-clone-row vl-consent-row">
          <span class="ui-filter-label">Whose voice</span>
          <input v-model="clonePerson" class="ui-field" placeholder="the person this recording is of — required" />
          <input v-model="clonePersonContact" class="ui-field" placeholder="how to reach them (optional)" />
        </div>
        <div class="vl-clone-row vl-consent-row">
          <input v-model="cloneConsentNote" class="ui-field vl-wide" placeholder="anything to note about permission (optional)" />
          <span class="vl-muted">
            The new voice is born <strong>awaiting authorisation</strong> and says so everywhere it
            appears. A recording existing is not permission to clone the person who made it —
            ask them, then record their answer on the voice.
          </span>
        </div>

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
            class="ui-chip" :class="cloneSource === 'estate' ? 'ui-hue-info' : 'ui-chip-off'"
            @click="cloneSource = 'estate'; if (!speakers.length) loadSpeakers()"
          >From a recording we hold</button>
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

        <!-- ── THE PRIMARY PATH: a speaker we already have on tape ───────
             Both numbers on every row — how many clips, and how much audio —
             because "we have some Aran" is not an answer anyone can act on.
             And the identity warning stays on screen: origin=human is a label
             somebody wrote, and two clone attempts here were built from TTS
             wearing it. Listening is the only verification that works. -->
        <div v-if="cloneSource === 'estate'" class="vl-estate">
          <!-- ONE LINE, SAID BY EVERY CLONE. That is what makes three clones
               from three sources comparable with each other rather than only
               with their own originals. Deliberately something the speaker has
               never said: a clone repeating its own source proves nothing. -->
          <div class="vl-clone-row">
            <span class="ui-filter-label">Every clone says</span>
            <input v-model="demoLine" class="ui-field vl-wide" placeholder="the line every clone will say" />
          </div>
          <div class="vl-clone-row">
            <input
              v-model="speakerFilterLang" class="ui-field vl-narrow" placeholder="language e.g. eng"
              @keyup.enter="loadSpeakers"
            />
            <button class="vl-btn" :disabled="speakersBusy" @click="loadSpeakers">
              {{ speakersBusy ? 'Looking…' : 'Find speakers we hold' }}
            </button>
            <span class="vl-muted">reads the archive — spends nothing.</span>
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
            <p class="vl-warn-line">
              <strong>Listen before you clone.</strong> {{ identityWarning }}
            </p>
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
                    <span class="vl-muted">
                      six to thirteen seconds, longer sources taking longer.
                      <strong>Play the original above while it builds</strong> — a 44-second
                      welcome covers the whole wait.
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
                  </template>
                </div>
              </div>
            </div>
            <p v-if="pickHint" class="vl-muted vl-pick-hint">
              {{ pickHint }} — press <strong>Create the clone</strong> below to join them.
            </p>
          </template>
        </div>

        <div v-else-if="cloneSource === 'upload'" class="vl-clone-row">
          <input type="file" accept="audio/*" class="ui-field" @change="pickFile" />
          <span class="vl-muted">
            One continuous take, 20&ndash;60 seconds. Ten seconds is the floor. Clean room, no
            background noise, no long pauses &mdash; pauses come back out in the clone.
          </span>
        </div>

        <div v-else-if="cloneSource === 'record'" class="vl-clone-row vl-record-row">
          <button v-if="!recording" class="vl-btn" @click="startRecording">● Record</button>
          <button v-else class="vl-btn vl-recording" @click="stopRecording">■ Stop — {{ recordSeconds }}s</button>
          <span v-if="recording" class="vl-muted">
            One continuous take &mdash; talk normally, the way you want to sound, and don't leave
            long pauses: pauses come back out in the clone. Stops itself at 60s.
          </span>
          <template v-if="recordedUrl">
            <audio :src="recordedUrl" controls class="vl-record-audio" />
            <span class="vl-muted">{{ recordHint }}</span>
            <button class="ui-sort-btn" @click="startRecording">Record it again</button>
          </template>
          <span v-if="recordError" class="vl-error">{{ recordError }}</span>
        </div>

        <div class="vl-clone-row">
          <button class="vl-btn" :disabled="cloneBusy || !canSubmitClone" @click="submitClone">
            {{ cloneBusy ? 'Cloning…' : 'Create the clone' }}
          </button>
          <span v-if="!clonePerson" class="vl-muted">Name whose voice this is first.</span>
        </div>

        <!-- ── EVERY CLONE MADE IN THIS SESSION ──────────────────────────
             The comparison IS the demo (Tom, 2026-08-31), so this list only
             ever grows. Three clones from three sources, all saying the same
             line, is the thing Aran is being shown; a screen that kept one
             clone would destroy that on every tap. -->
        <div v-if="clones.length" class="vl-clone-done">
          <p class="vl-ok">
            <strong>{{ clones.length }} clone{{ clones.length === 1 ? '' : 's' }} made here</strong>
            — each one from a different recording, all saying the same line, so the source is the
            only thing that changed. Nothing is authorised: they are all awaiting a yes.
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
            <ConsentBadge :consent="k.consent" />
            <button v-if="k.voice" class="ui-sort-btn" @click="openConsent(k.voice.voice_id, k.consent)">consent…</button>
            <button v-if="k.voice" class="ui-sort-btn" @click="discard(k)">discard</button>
          </div>
          <p class="vl-muted">
            Every clone is castable in the table below and appears in the Play menu straight away.
            Discarding one deletes it at Cartesia and in the estate's voice list.
          </p>
        </div>
      </div>
    </section>

    <!-- ── RECORDING AN AUTHORISATION ────────────────────────────────────────
         Tom obtains the consent; this writes down what he was told. It cannot
         invent a yes: a named human, a means and a date are all required here
         and again by the database's own CHECK constraint. -->
    <section v-if="consentFor" class="vl-clone vl-consent-editor">
      <p><strong>Consent for <code>{{ consentFor }}</code></strong></p>
      <div class="vl-clone-row">
        <select v-model="consentForm.status" class="ui-field vl-narrow">
          <option value="authorised">they said yes</option>
          <option value="awaiting_authorisation">not asked yet</option>
          <option value="refused">they said no</option>
          <option value="withdrawn">they have withdrawn it</option>
          <option value="not_recorded">nothing recorded</option>
        </select>
        <input v-model="consentForm.person" class="ui-field" placeholder="whose voice it is" />
        <input v-model="consentForm.authorisedBy" class="ui-field" placeholder="who said yes" />
      </div>
      <div class="vl-clone-row">
        <input v-model="consentForm.authorisedHow" class="ui-field vl-narrow" placeholder="how — in person, email…" />
        <input v-model="consentForm.authorisedAt" type="date" class="ui-field vl-narrow" />
        <input v-model="consentForm.note" class="ui-field" placeholder="anything else worth knowing" />
      </div>
      <div class="vl-clone-row">
        <button class="vl-btn" :disabled="consentBusy" @click="saveConsent">
          {{ consentBusy ? 'Saving…' : 'Record it' }}
        </button>
        <button class="ui-sort-btn" @click="consentFor = null">Cancel</button>
      </div>
      <p v-if="consentError" class="vl-error">{{ consentError }}</p>
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
                  <span v-if="lang.dialectOf" class="vl-muted">
                    its own language for casting — a voice cast on
                    {{ langName(lang.dialectOf) }} ({{ lang.dialectOf }}) does NOT reach these courses
                  </span>
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

                <p v-if="lang.knownOnly" class="vl-note">
                  <strong>No course teaches {{ langName(lang) }}</strong> — it is only ever the
                  known side, so it has no phrase-voice worklist. It is on this screen so its
                  <strong>guide voice</strong> can be cast: its learners hear instructions today.
                </p>
                <p v-else-if="lang.human" class="vl-note">
                  <strong>{{ langName(lang) }} is human-recorded only.</strong> A human recording wins
                  wherever it exists, so empty slots here are a recording worklist for its
                  recordists, not a casting gap. No TTS provider may ever be selected for it.
                </p>
                <p v-else-if="!lang.cartesiaCovers" class="vl-note">
                  Cartesia does not publish <strong>{{ langName(lang) }}</strong>, so a new render falls to
                  Azure. That is covered, just not by the default provider.
                </p>

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
                    Every course this cast could reach is human-recorded, so casting is refused here.
                  </strong>
                  <strong v-else>
                    Some courses in {{ langName(lang.code) }} are human-recorded, and a cast will not reach them.
                  </strong>
                  Real recordings win wherever they exist, and the recording pipeline resolves a slot from
                  each course's own stored voice config — so a language cast is left out of these
                  deliberately rather than silently:
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
                  <strong>Cast saved, and skipped {{ skipped[lang.code].length }} human-recorded
                  course{{ skipped[lang.code].length === 1 ? '' : 's' }}:</strong>
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
                  <p class="vl-cast-meaning">
                    Casting decides <strong>who speaks</strong> — every course that teaches
                    {{ langName(lang) }} will generate in this voice, with nothing else to do
                    anywhere. <strong>What is said</strong> stays each course's own.
                  </p>

                  <template v-if="lineFor(lang)">
                    <p class="vl-line-text" :lang="lang.code">{{ lineFor(lang).text }}</p>
                    <p class="vl-line-meta">
                      <span v-if="lineFor(lang).knownText" class="vl-line-known">{{ lineFor(lang).knownText }}</span>
                      <span class="vl-muted">from <code>{{ lineFor(lang).course || 'the estate' }}</code>{{ lineFor(lang).kind === 'instruction' ? ' — an instruction line, because no course teaches this language' : '' }}</span>
                    </p>
                  </template>
                  <p v-else-if="samplesBusy === lang.code" class="vl-muted">finding a real line…</p>
                  <p v-else-if="samplesByLang[lang.code] && samplesByLang[lang.code].error" class="vl-muted">
                    Samples unavailable: {{ samplesByLang[lang.code].error }} — casting still works.
                  </p>
                  <p v-else class="vl-muted">No course line found for this language, so voices cannot be auditioned here.</p>

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
                      {{ previewRun.done }} of {{ previewRun.total }} rendered — each one is playable
                      the moment it lands, so you can start listening now.
                    </span>
                    <span v-else class="vl-muted">
                      {{ previewPlan(lang).n }} voice{{ previewPlan(lang).n === 1 ? '' : 's' }}
                      here {{ previewPlan(lang).n === 1 ? 'has' : 'have' }} never said this line.
                      One tap renders {{ previewPlan(lang).n === 1 ? 'it' : 'them all' }} on the
                      <strong>same line</strong> — {{ previewPlan(lang).n }} call{{ previewPlan(lang).n === 1 ? '' : 's' }},
                      {{ previewPlan(lang).chars }} characters of the lab's daily allowance.
                      Everything already rendered is cached and free to replay.
                    </span>
                  </p>
                  <p v-else-if="lineFor(lang) && Object.keys(samplesFor(lang)).length" class="vl-muted vl-prepare">
                    Every voice here has a clip of this line — replaying costs nothing.
                    <button
                      class="vl-regenerate"
                      :disabled="samplesBusy === lang.code"
                      @click="generatePreviews(lang, { force: true })"
                    >{{ samplesBusy === lang.code ? 'Re-generating…' : `Re-generate all ${previewPlan(lang, true).n}` }}</button>
                    <span v-if="previewRun && previewRun.code === lang.code">
                      — {{ previewRun.done }} of {{ previewRun.total }}
                    </span>
                    <span v-else>— spends {{ previewPlan(lang, true).chars }} characters again.</span>
                  </p>
                  <p v-if="samplesByLang[lang.code] && samplesByLang[lang.code].unrenderable?.length" class="vl-muted vl-prepare">
                    {{ samplesByLang[lang.code].unrenderable.length }} can be cast but not previewed here,
                    and why: {{ unrenderableReasons(lang).join(' · ') }}.
                  </p>
                </div>

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
                        Not castable — {{ langName(lang.code) }} is human-recorded.
                        {{ humanCourseList(lang) }} hold real recordings, and their gaps are a
                        recording worklist, not a casting gap.
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
                        @play="play(lang, $event)"
                        @cast="cast(lang, slot, $event)"
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
                  Guide voice — instructions and encouragements
                  <span class="vl-muted vl-guide-sub">
                    spoken to the learner, not course material. Cast against
                    <strong>{{ langName(lang) }}</strong> as a KNOWN language, so one cast serves
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
                        empty-text="no voice in the estate declares this language"
                        @play="play(lang, $event)"
                        @cast="cast(lang, slot, $event)"
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
.vl-slots { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: .6rem; }
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
.vl-cast-meaning { margin: 0 0 .5rem; font-size: .8125rem; }
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
.vl-notes { margin-top: 1.25rem; display: grid; gap: .35rem; font-size: .75rem; }
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
