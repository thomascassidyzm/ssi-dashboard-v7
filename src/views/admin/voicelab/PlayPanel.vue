<script setup>
/**
 * PLAY MODE — the front door of the Voice Lab.
 *
 * Tom's ruling, 2026-08-07: "looks fantastic but a few levels too deep in
 * granularity… I'm going to want to actually USE it without spending a week
 * working out what these things mean. A slightly simpler interface, more
 * obvious — with trial and error sliders showing us what we can play with."
 *
 * So: a voice, a language, a sentence, three sliders, one button. The full
 * parameter estate is untouched and one click away behind Engineering — this
 * screen is not a replacement for it, it is the thing you reach for first.
 *
 * ── WHY THREE SLIDERS AND NOT FIFTEEN ──────────────────────────────────────
 * Every slider here moves something you can HEAR. That is the whole selection
 * rule, and it is why there are three rather than a tidy five:
 *
 *   PACE       provider `speed`. Reaches Azure as SSML <prosody rate> and
 *              Cartesia as generation_config.speed. Where a provider ignores it
 *              (see providers[].supports) this slider is
 *              disabled and says why — it is not quietly ignored.
 *   LOUDNESS   `masterLufs`, the level the clip is MASTERED to. Not the
 *              loudness gate's band: the band decides what the store would
 *              admit, this decides what comes out of the speaker. Moving the
 *              band alone would change a verdict and not one byte of audio.
 *   DETAIL     sample rate and bit rate together, as one "how much of the
 *              sound is kept" control. Real on Cartesia (they are threaded into
 *              output_format); pinned by generateAzure, so disabled on Azure.
 *
 * Every position of every slider is inside a range that renders and passes the
 * gates — the loudness stops are derived from the gate's own band, so you
 * cannot drag yourself into a refusal by accident.
 *
 * Provider is NOT a picker here: a voice belongs to a provider, so choosing
 * Tom's clone chooses Cartesia. One decision instead of two that can contradict.
 *
 * Same spend guards as everywhere else in the lab: the backend estimates, the
 * daily ceiling refuses, and the button will not arm without an estimate that
 * fits under it. Nothing here writes to course_audio.
 */
import { ref, computed, watch } from 'vue'
import { api, clipUrl } from './labApi'
import { dirFor } from '@/utils/textDirection.js'
import CoursePicker from '@/components/CoursePicker.vue'
import SearchSelect from './SearchSelect.vue'

const props = defineProps({
  params: { type: Object, required: true },
})

const defaults = computed(() => props.params.defaults?.config || {})

// ── What you are saying, and who says it ────────────────────────────────────
const language = ref(defaults.value.language || 'deu')
const voiceId = ref(defaults.value.voiceId || '')
const sentence = ref('')

const languageRow = computed(() =>
  (props.params.languages || []).find((l) => l.code === language.value) || null)

const languageVoices = computed(() => languageRow.value?.voices || [])

// ── The voice menu, with its attributes on the rows ─────────────────────────
//
// Tom, 2026-08-31: "these long lists are impenetrable as drop downs". The menu
// was forty bare first names — Skylar, Daniel, Gemma — grouped by provider and
// by nothing else, so the only way to choose was to audition down the list.
// Every attribute below is one the provider already hands us and the menu was
// throwing away: gender, native accent, country, the vendor's own tagline.
// What we genuinely do not hold says so on the row instead of leaving a blank.

const GENDER_WORD = { f: 'female', m: 'male', feminine: 'female', masculine: 'male', gender_neutral: 'neutral' }

/** "general-american" reads as "general american" in a chip. */
function humanAccent (a) { return String(a || '').replace(/-/g, ' ') }

function voiceChips (v) {
  const chips = []
  const g = GENDER_WORD[v.gender] || (v.gender ? String(v.gender) : '')
  chips.push(g ? { text: g, kind: '' } : { text: 'gender not listed', kind: 'missing' })
  chips.push(v.accent
    ? { text: humanAccent(v.accent), kind: 'accent' }
    : v.accentLocale
      ? { text: v.accentLocale, kind: 'accent' }
      : { text: 'accent not listed', kind: 'missing' })
  if (v.tagline) chips.push({ text: v.tagline.toLowerCase(), kind: '' })
  if (v.clone) chips.push({ text: 'clone', kind: 'clone' })
  chips.push({ text: v.provider, kind: '' })
  if (v.clips) chips.push({ text: `${v.clips.toLocaleString()} clips`, kind: '' })
  return chips
}

/** Everything the filter matches on, including what the row does not show. */
function voiceHaystack (v) {
  return [
    v.name, v.id, v.provider, v.group,
    GENDER_WORD[v.gender] || v.gender,
    humanAccent(v.accent), v.accentLocale, v.country,
    (v.otherAccents || []).map(humanAccent).join(' '),
    v.tagline, v.description,
    v.clone ? 'clone' : '',
    languageRow.value?.name, languageRow.value?.code, languageRow.value?.steer,
  ].filter(Boolean).join(' ')
}

const voiceOptions = computed(() => languageVoices.value.map((v) => ({
  value: v.id,
  label: v.name || v.id,
  group: v.group || 'Voices',
  chips: voiceChips(v),
  haystack: voiceHaystack(v),
})))

/**
 * What this list can and cannot be searched by — counted off the list itself
 * rather than asserted, so a search for an accent that comes back thin is
 * explained instead of mysterious.
 */
const voiceSearchNote = computed(() => {
  const all = languageVoices.value
  if (!all.length) return ''
  const gaps = []
  const noGender = all.filter((v) => !v.gender).length
  const noAccent = all.filter((v) => !v.accent && !v.accentLocale).length
  if (noGender) gaps.push(`gender on ${noGender}`)
  if (noAccent) gaps.push(`accent on ${noAccent}`)
  const base = 'Matches name, gender, accent, country, provider and the vendor’s own description. More words narrow further.'
  return gaps.length ? `${base} Of ${all.length} voices we hold no ${gaps.join(' and no ')}.` : base
})

const languageOptions = computed(() => (props.params.languages || []).map((l) => ({
  value: l.code,
  label: l.name,
  chips: [
    { text: `steered as ${l.steer}`, kind: '' },
    (l.voices || []).length
      ? { text: `${(l.voices || []).length} voices`, kind: '' }
      : { text: 'no voices on this backend', kind: 'missing' },
  ],
  haystack: [l.name, l.code, l.steer, l.azureLocale].filter(Boolean).join(' '),
})))

const voice = computed(() =>
  (languageRow.value?.voices || []).find((v) => v.id === voiceId.value) || null)

/** The provider is the voice's, never a separate choice that could disagree. */
const provider = computed(() => voice.value?.provider || defaults.value.provider || 'cartesia')

const providerRow = computed(() =>
  (props.params.providers || []).find((p) => p.id === provider.value) || { supports: {} })
const supports = computed(() => providerRow.value.supports || {})

// Changing language can strand the voice — land on the first voice this
// language offers rather than keeping one that cannot render it.
watch(language, () => {
  const list = languageRow.value?.voices || []
  if (!list.some((v) => v.id === voiceId.value)) voiceId.value = list[0]?.id || ''
})

// ── The three sliders ───────────────────────────────────────────────────────
//
// Each stop carries the ear-word you read and the real value the backend gets.
// The real value is shown small beside it, because "0.9× speed" is the thing
// you would put in a report and "unhurried" is the thing you actually chose.

const PACE_STOPS = [
  { word: 'unhurried', real: '0.85× — 15% slower', patch: { speed: 0.85 } },
  { word: 'relaxed', real: '0.925×', patch: { speed: 0.925 } },
  { word: 'natural', real: '1.0× — the voice’s own pace', patch: { speed: 1.0 } },
  { word: 'brisk', real: '1.075×', patch: { speed: 1.075 } },
  { word: 'quick', real: '1.15× — 15% faster', patch: { speed: 1.15 } },
]

/**
 * The loudness stops are DERIVED from the gate's own band, not typed in — so
 * every position is a level the store would admit, and the range moves if the
 * band ever does. Centre is the house mastering level.
 */
const LOUDNESS_STOPS = computed(() => {
  const band = defaults.value.thresholds?.loudness || {}
  const centre = Number.isFinite(defaults.value.masterLufs) ? defaults.value.masterLufs : -16
  const target = Number.isFinite(band.targetLufs) ? band.targetLufs : -15.5
  const tol = Number.isFinite(band.toleranceDb) ? band.toleranceDb : 1.5
  // Widest symmetric swing around the house level that still sits inside the band.
  const reach = Math.max(0.5, Math.min(centre - (target - tol), (target + tol) - centre))
  const words = ['quieter', 'a touch quieter', 'house level', 'a touch louder', 'louder']
  return words.map((word, i) => {
    const lufs = +(centre + (i - 2) * (reach / 2)).toFixed(2)
    return { word, real: `${lufs} LUFS`, patch: { masterLufs: lufs } }
  })
})

const DETAIL_STOPS = [
  { word: 'phone call', real: '16 kHz · 64 kbps', patch: { sampleRate: 16000, bitRate: 64000 } },
  { word: 'radio', real: '22.05 kHz · 96 kbps', patch: { sampleRate: 22050, bitRate: 96000 } },
  { word: 'house standard', real: '24 kHz · 128 kbps', patch: { sampleRate: 24000, bitRate: 128000 } },
  { word: 'full', real: '24 kHz · 192 kbps', patch: { sampleRate: 24000, bitRate: 192000 } },
]

/** Live knobs first — a dead control should not be the first thing you meet. */
const SLIDERS = computed(() => {
  const all = [
    {
      id: 'pace',
      label: 'Pace',
      ends: ['slower', 'faster'],
      stops: PACE_STOPS,
      live: supports.value.speed === true,
      note: '',
      why: `no speed on ${providerRow.value.name || provider.value}`,
    },
    {
      id: 'loudness',
      label: 'Loudness',
      ends: ['quieter', 'louder'],
      stops: LOUDNESS_STOPS.value,
      live: true,
      note: '',
      why: '',
    },
    {
      id: 'detail',
      label: 'Detail',
      ends: ['leaner', 'richer'],
      stops: DETAIL_STOPS,
      live: supports.value.sampleRate === true && supports.value.bitRate === true,
      note: '',
      why: 'format pinned by Azure',
    },
  ]
  return [...all.filter((s) => s.live), ...all.filter((s) => !s.live)]
})

/** Which stop each slider sits on, per side. Index 2 is the house default. */
function freshStops () { return { pace: 2, loudness: 2, detail: 2 } }
const stopsA = ref(freshStops())
const stopsB = ref(freshStops())

const comparing = ref(false)

function startComparing () {
  stopsB.value = { ...stopsA.value }
  comparing.value = true
}

/** Turn a side's slider positions into the config the backend takes. */
function configFor (stops) {
  const cfg = {
    ...defaults.value,
    provider: provider.value,
    voiceId: voiceId.value,
    voiceName: voice.value?.name || voiceId.value,
    language: language.value,
  }
  for (const s of SLIDERS.value) {
    if (!s.live) continue
    Object.assign(cfg, s.stops[stops[s.id]]?.patch || {})
  }
  return cfg
}

const configs = computed(() =>
  comparing.value ? [configFor(stopsA.value), configFor(stopsB.value)] : [configFor(stopsA.value)])

/** What actually differs between the two sides, in ear-words. The point of an A/B. */
const difference = computed(() => {
  if (!comparing.value) return []
  return SLIDERS.value
    .filter((s) => s.live && stopsA.value[s.id] !== stopsB.value[s.id])
    .map((s) => ({
      label: s.label,
      a: s.stops[stopsA.value[s.id]]?.word,
      b: s.stops[stopsB.value[s.id]]?.word,
    }))
})

// ── Pull a sentence out of a real course ────────────────────────────────────
const picking = ref(false)
const courses = ref([])
const course = ref('')
const query = ref('')
const found = ref([])
const searching = ref(false)
const pickError = ref('')

async function openPicker () {
  picking.value = !picking.value
  if (!picking.value || courses.value.length) return
  try {
    const data = await api.courses()
    courses.value = data.courses || []
    // Prefer a course in the language already chosen — that is why you are here.
    const match = courses.value.find((c) => c.language === language.value)
    course.value = (match || courses.value[0])?.code || ''
    if (course.value) search()
  } catch (e) { pickError.value = e.message }
}

async function search () {
  if (!course.value) return
  searching.value = true
  pickError.value = ''
  try {
    const data = await api.sentences({ course: course.value, role: 'seed', q: query.value, limit: 40 })
    found.value = data.sentences || []
  } catch (e) {
    pickError.value = e.message
    found.value = []
  } finally { searching.value = false }
}

/** The picker emits a code; the search that follows is the whole point of it. */
function pickCourse (code) {
  course.value = code
  search()
}

/** What the lab knows about a course that its name does not say. */
function courseMeta (c) {
  const bits = []
  if (c.sentences) bits.push(`${c.sentences.toLocaleString()} seeds`)
  if (c.renderable === false) bits.push('not steerable here')
  return bits.join(' · ')
}

function useSentence (s) {
  sentence.value = s.text
  picking.value = false
}

// ── The cost, before the button arms ────────────────────────────────────────
const estimate = ref(null)
const estimating = ref(false)
const estimateError = ref('')
const maxChars = computed(() => props.params.limits?.maxCharsPerSentence || 300)

async function refreshEstimate () {
  estimate.value = null
  estimateError.value = ''
  const text = sentence.value.trim()
  if (!text || text.length > maxChars.value) return
  estimating.value = true
  try {
    estimate.value = await api.estimate({ sentences: [text], configs: configs.value })
  } catch (e) { estimateError.value = e.message } finally { estimating.value = false }
}
watch([sentence, configs], refreshEstimate, { deep: true })

// ── The run ─────────────────────────────────────────────────────────────────
const running = ref(false)
const runError = ref('')
const experiment = ref(null)
const revealed = ref(false)
let stopPolling = null
let audioEl = null
let autoPlayed = false

const tooLong = computed(() => sentence.value.trim().length > maxChars.value)

const armed = computed(() =>
  !running.value &&
  Boolean(sentence.value.trim()) &&
  !tooLong.value &&
  Boolean(voiceId.value) &&
  Boolean(estimate.value) &&
  !estimate.value.wouldExceed)

async function generate () {
  running.value = true
  runError.value = ''
  experiment.value = null
  revealed.value = false
  autoPlayed = false
  if (stopPolling) stopPolling()
  try {
    const kind = comparing.value ? 'ab' : 'single'
    const { experiment: exp } = await api.createRun({
      kind,
      title: `play — ${voice.value?.name || voiceId.value} · ${language.value}`,
      blind: comparing.value,
      sentences: [sentence.value.trim()],
      configs: configs.value,
    })
    experiment.value = exp
    stopPolling = poll(exp.id)
  } catch (e) {
    runError.value = e.message
    running.value = false
  }
}

function poll (id) {
  let stopped = false
  ;(async () => {
    while (!stopped) {
      await new Promise((r) => setTimeout(r, 2000))
      if (stopped) return
      try {
        const { experiment: exp } = await api.getRun(id)
        experiment.value = exp
        // The clip is playable long before the two whisper passes finish, so it
        // plays the moment it exists rather than when the verdict lands.
        maybeAutoPlay(exp)
        if (exp.status !== 'running') { running.value = false; return }
      } catch (e) {
        runError.value = `${e.message} — the run is still on the backend; it is on the Engineering side under Experiments.`
        running.value = false
        return
      }
    }
  })()
  return () => { stopped = true; running.value = false }
}

function maybeAutoPlay (exp) {
  if (autoPlayed || comparing.value) return
  const clip = (exp.clips || [])[0]
  if (!clip?.url) return
  autoPlayed = true
  play(clip)
}

const playingId = ref('')
async function play (clip) {
  if (!clip?.url) return
  if (audioEl) audioEl.pause()
  audioEl = new Audio(await clipUrl(clip.url))
  playingId.value = clip.id
  audioEl.onended = () => { playingId.value = '' }
  // Autoplay can still be refused by the browser; the button is right there.
  audioEl.play().catch(() => { playingId.value = '' })
}

function clipFor (configKey) {
  return (experiment.value?.clips || []).find((c) => c.configKey === configKey) || null
}

/** Which side sits on the left — the backend decided, per experiment, not us. */
const leftKey = computed(() => (experiment.value?.slots || [])[0]?.left || 'A')
const rightKey = computed(() => (leftKey.value === 'A' ? 'B' : 'A'))

// ── The verdict, as ONE line ────────────────────────────────────────────────
//
// Fifteen numbers is what Engineering is for. Here: admitted or not, and if
// not, which gate — in the words of what the gate is actually asking.
const GATE_WORDS = {
  'speech-span': 'there is speech in it',
  loudness: 'the level',
  'tail-shape': 'the ending',
  'syllable-rate': 'the speed is humanly possible',
  phonology: 'it is the right language',
  words: 'it says the right words',
}

function verdictLine (clip) {
  if (!clip) return { cls: 'wait', text: 'rendering…' }
  if (clip.status === 'failed' || (clip.error && !clip.verdict)) {
    return { cls: 'fail', text: `did not render — ${clip.error || 'unknown error'}` }
  }
  if (clip.status === 'pending') return { cls: 'wait', text: 'rendering…' }
  if (!clip.verdict) return { cls: 'wait', text: 'playable — still checking' }
  const v = clip.verdict
  if (v.admit) return { cls: 'pass', text: 'Admitted — every gate passed.' }
  const failed = (v.refusedBy || []).map((g) => GATE_WORDS[g] || g)
  return { cls: 'fail', text: `Quarantined — ${failed.join(' and ')}.` }
}

function gateDetail (clip) {
  const v = clip?.verdict
  if (!v) return []
  return (v.order || []).map((id) => {
    const g = v.gates[id]
    return {
      id,
      word: GATE_WORDS[id] || id,
      state: !g.applicable ? 'n/a' : g.pass === null ? 'unchecked' : g.pass ? 'pass' : 'FAIL',
      cls: !g.applicable ? 'na' : g.pass === null ? 'unchecked' : g.pass ? 'pass' : 'fail',
      reason: g.reason || '',
    }
  })
}
</script>

<template>
  <div class="play">
    <!-- 1 · who says it, in what language -->
    <div class="play-row">
      <div class="play-field">
        <span class="play-label">Voice</span>
        <SearchSelect
          v-model="voiceId"
          :options="voiceOptions"
          :search-note="voiceSearchNote"
          noun="voices"
          placeholder="welsh female · scottish · cartesia · warm…"
        />
      </div>

      <div class="play-field">
        <span class="play-label">Language</span>
        <SearchSelect
          v-model="language"
          :options="languageOptions"
          noun="languages"
          placeholder="german · fr · japanese…"
        />
      </div>
    </div>

    <!-- 2 · what it says -->
    <div class="play-block">
      <div class="play-label-row">
        <span class="play-label">Sentence</span>
        <button class="play-link" @click="openPicker">
          {{ picking ? 'close' : 'or pull one from a course' }}
        </button>
      </div>
      <textarea
        v-model="sentence"
        rows="2"
        class="play-textarea"
        spellcheck="false"
        placeholder="Type something for this voice to say."
      ></textarea>
      <p v-if="tooLong" class="play-err">{{ sentence.trim().length }} characters — the cap is {{ maxChars }}.</p>

      <div v-if="picking" class="play-picker">
        <div class="play-row">
          <label class="play-field">
            <span class="play-sub">Course</span>
            <!-- WAS a native <select> of every course in seed-count order, which
                 Tom read as "a nightmare to parse". Same shared picker the rest
                 of Popty uses: ordered by target language, type to filter. -->
            <CoursePicker
              :model-value="course"
              :courses="courses"
              :option-meta="courseMeta"
              placeholder="Type a language or a code…"
              @update:model-value="pickCourse"
            />
          </label>
          <label class="play-field grow">
            <span class="play-sub">Contains</span>
            <input v-model="query" class="play-input" placeholder="search the seed sentences…" @keyup.enter="search" />
          </label>
          <button class="play-btn" :disabled="searching" @click="search">
            {{ searching ? 'Searching…' : 'Search' }}
          </button>
        </div>
        <p v-if="pickError" class="play-err">{{ pickError }}</p>
        <div v-if="found.length" class="play-found">
          <button
            v-for="s in found"
            :key="s.id"
            class="play-found-row bidi-isolate"
            :dir="dirFor(s.text)"
            @click="useSentence(s)"
          >
            {{ s.text }}
          </button>
        </div>
      </div>
    </div>

    <!-- 3 · the knobs that actually change what you hear -->
    <div class="play-block">
      <div class="play-label-row">
        <span class="play-label">What to play with</span>
        <!-- THE A/B SWITCH IS A CONTROL, NOT A FOOTNOTE (Tom, 2026-08-29:
             "it's not obvious the A/B testing settings"). It was a text link
             beside the heading and nobody would have found it; it is now the
             same segmented control the Languages/Play/Engineering tabs use, so
             the thing that doubles the render cost is the thing you can see. -->
        <div class="mode-pick" role="group" aria-label="How many settings to try">
          <button :class="{ on: !comparing }" @click="comparing = false">One setting</button>
          <button :class="{ on: comparing }" @click="startComparing">Compare two</button>
        </div>
      </div>

      <p v-if="comparing" class="cmp-help">
        Two renders of the same sentence, side by side.
        <template v-if="!difference.length">
          <strong>Both sides are identical</strong> — move one slider on the B row, or the
          comparison measures nothing.
        </template>
        <template v-else>Change one thing at a time and you can hear what it did.</template>
      </p>

      <div v-for="s in SLIDERS" :key="s.id" class="slider" :class="{ dead: !s.live }">
        <div class="slider-head">
          <span class="slider-name">{{ s.label }}</span>
          <span v-if="s.live && !comparing" class="slider-now">
            {{ s.stops[stopsA[s.id]].word }}
            <small>{{ s.stops[stopsA[s.id]].real }}</small>
          </span>
          <span v-if="!s.live" class="slider-off">not on this voice</span>
        </div>

        <!-- ONE SETTING — the slider unchanged, ends either side. -->
        <div v-if="!comparing || !s.live" class="slider-track">
          <span class="slider-end">{{ s.ends[0] }}</span>
          <input
            type="range" min="0" :max="s.stops.length - 1" step="1"
            :disabled="!s.live"
            :value="stopsA[s.id]"
            @input="stopsA = { ...stopsA, [s.id]: Number($event.target.value) }"
          />
          <span class="slider-end">{{ s.ends[1] }}</span>
        </div>

        <!-- TWO SETTINGS — A above B in one box, both rows labelled and both
             value readouts in the SAME column, so the eye reads straight down
             the page. Before this the A value sat top-left and the B value
             bottom-right, which is the one thing a comparison cannot afford. -->
        <div v-else class="compare">
          <div v-for="row in [{ tag: 'A', stops: stopsA }, { tag: 'B', stops: stopsB }]" :key="row.tag" class="cmp-row">
            <span class="cmp-tag">{{ row.tag }}</span>
            <input
              type="range" min="0" :max="s.stops.length - 1" step="1"
              :value="row.stops[s.id]"
              :aria-label="`${s.label}, side ${row.tag}`"
              @input="row.tag === 'A'
                ? (stopsA = { ...stopsA, [s.id]: Number($event.target.value) })
                : (stopsB = { ...stopsB, [s.id]: Number($event.target.value) })"
            />
            <span class="cmp-value">
              {{ s.stops[row.stops[s.id]].word }}
              <small>{{ s.stops[row.stops[s.id]].real }}</small>
            </span>
          </div>
          <div class="cmp-ends">
            <span>{{ s.ends[0] }}</span>
            <span>{{ s.ends[1] }}</span>
          </div>
        </div>

        <p v-if="!s.live" class="slider-why">{{ s.why }}</p>
        <p v-else-if="s.note" class="slider-why">{{ s.note }}</p>
      </div>
    </div>

    <!-- 4 · one button, with the money in front of it -->
    <div class="play-go">
      <button class="play-generate" :disabled="!armed" @click="generate">
        {{ running ? 'Generating…' : comparing ? 'Generate both' : 'Generate' }}
      </button>
      <span class="play-cost">
        <template v-if="estimating">costing…</template>
        <template v-else-if="estimate">
          {{ estimate.clips }} clip{{ estimate.clips === 1 ? '' : 's' }} ·
          {{ estimate.usd == null ? 'not priced' : '$' + estimate.usd.toFixed(4) }} ·
          {{ estimate.ceilingRemaining.toLocaleString() }} chars left today
          <strong v-if="estimate.wouldExceed" class="play-err">— over the daily ceiling</strong>
        </template>
        <span v-else-if="estimateError" class="play-err">{{ estimateError }}</span>
        <template v-else>the cost appears here first</template>
      </span>
    </div>
    <p v-if="runError" class="play-err">{{ runError }}</p>

    <!-- 5 · listen, then one line of verdict -->
    <div v-if="experiment" class="play-result">
      <template v-if="!comparing">
        <button
          class="play-play"
          :class="{ on: playingId && playingId === clipFor('A')?.id }"
          :disabled="!clipFor('A')?.url"
          @click="play(clipFor('A'))"
        >▶ {{ clipFor('A')?.url ? 'Play it again' : 'rendering…' }}</button>

        <p class="verdict" :class="verdictLine(clipFor('A')).cls">{{ verdictLine(clipFor('A')).text }}</p>

        <details v-if="clipFor('A')?.verdict" class="play-detail">
          <summary>what each gate said</summary>
          <ul>
            <li v-for="g in gateDetail(clipFor('A'))" :key="g.id">
              <span class="gate-state" :class="g.cls">{{ g.state }}</span>
              <span class="gate-word">{{ g.word }}</span>
              <span class="gate-reason">{{ g.reason }}</span>
            </li>
          </ul>
        </details>
      </template>

      <template v-else>
        <p class="play-note">{{ revealed ? 'Labels shown.' : 'Listen to both before you look.' }}</p>
        <div class="play-ab">
          <div v-for="(side, i) in [leftKey, rightKey]" :key="side" class="play-side">
            <button
              class="play-play"
              :class="{ on: playingId && playingId === clipFor(side)?.id }"
              :disabled="!clipFor(side)?.url"
              @click="play(clipFor(side))"
            >▶ {{ clipFor(side)?.url ? (i === 0 ? 'Left' : 'Right') : 'rendering…' }}</button>
            <p class="verdict" :class="verdictLine(clipFor(side)).cls">{{ verdictLine(clipFor(side)).text }}</p>
            <p v-if="revealed" class="play-sub">side {{ side }}</p>
          </div>
        </div>
        <button class="play-btn" @click="revealed = !revealed">
          {{ revealed ? 'Hide which is which' : 'Reveal which is which' }}
        </button>
        <ul v-if="revealed && difference.length" class="play-diff">
          <li v-for="d in difference" :key="d.label">
            <strong>{{ d.label }}</strong> — A was {{ d.a }}, B was {{ d.b }}.
          </li>
        </ul>
      </template>

      <p v-if="experiment.caveats?.length" class="play-caveat">{{ experiment.caveats.join(' · ') }}</p>
    </div>
  </div>
</template>

<style scoped>
/* A directed target sentence must not drift to the other side of its cell:
   `dir` fixes the punctuation, alignment stays as it is today. */
.play-found-row { text-align: left; }

.play { max-width: 860px; }
.play-row { display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end; }
.play-field { display: flex; flex-direction: column; gap: 0.25rem; }
.play-field.grow { flex: 1; min-width: 220px; }
.play-block { margin-top: 1.75rem; }
.play-label { font-size: 0.95rem; letter-spacing: 0.02em; }
.play-sub { color: var(--muted); font-size: 0.72rem; }
.play-label-row { display: flex; align-items: baseline; gap: 1rem; margin-bottom: 0.5rem; }
.play-link {
  background: none; border: none; color: var(--accent-2, #ec4899);
  cursor: pointer; font-size: 0.78rem; font-family: inherit; padding: 0; text-decoration: underline;
}
.play-select, .play-input {
  background: var(--surface-2); border: 1px solid var(--surface-3); color: inherit;
  border-radius: 8px; padding: 0.6rem 0.7rem; font-size: 1rem; font-family: inherit; min-width: 220px;
}
.play-select.small { min-width: 150px; font-size: 0.85rem; }
.play-textarea {
  width: 100%; background: var(--surface-2); border: 1px solid var(--surface-3); color: inherit;
  border-radius: 8px; padding: 0.7rem; font-size: 1.05rem; font-family: inherit; line-height: 1.4;
}
.play-picker { border: 1px solid var(--surface-3); border-radius: 8px; padding: 0.75rem; margin-top: 0.6rem; }
.play-found { max-height: 220px; overflow-y: auto; margin-top: 0.5rem; border-top: 1px solid var(--surface-3); }
.play-found-row {
  display: block; width: 100%; text-align: left; background: none; border: none;
  border-bottom: 1px solid var(--surface-2); color: inherit; padding: 0.4rem 0.3rem;
  cursor: pointer; font-size: 0.9rem; font-family: inherit;
}
.play-found-row:hover { background: var(--surface-2); }

.slider { margin: 1.1rem 0 1.4rem; }
.slider.dead { opacity: 0.55; }
.slider-head { display: flex; align-items: baseline; gap: 0.75rem; margin-bottom: 0.35rem; }
.slider-name { font-size: 1.05rem; }
.slider-now { color: var(--accent-2, #ec4899); font-size: 1rem; }
.slider-now small { color: var(--muted); margin-left: 0.5rem; font-size: 0.72rem; }
.slider-off { color: var(--muted); font-size: 0.78rem; font-style: italic; }
.slider-track { display: flex; align-items: center; gap: 0.75rem; }

/* The A/B switch: the same segmented control as the page's own mode tabs. */
.mode-pick { display: flex; border: 1px solid var(--surface-3); border-radius: 999px; overflow: hidden; }
.mode-pick button {
  background: none; border: none; color: var(--muted); font-family: inherit;
  font-size: 0.78rem; padding: 0.3rem 0.9rem; cursor: pointer;
}
.mode-pick button.on { background: #ec4899; color: #fff; }
.cmp-help { color: var(--muted); font-size: 0.8rem; line-height: 1.5; max-width: 70ch; margin: 0 0 0.75rem; }
.cmp-help strong { color: inherit; }

/* One box, two rows, one column of values. */
.compare {
  border: 1px solid var(--surface-3);
  border-radius: 10px;
  background: color-mix(in srgb, var(--surface-2) 45%, transparent);
  padding: 0.6rem 0.75rem 0.45rem;
}
.cmp-row { display: flex; align-items: center; gap: 0.75rem; }
.cmp-row + .cmp-row { margin-top: 0.35rem; }
.cmp-tag { min-width: 1.5rem; font-weight: 600; font-size: 0.85rem; color: var(--muted); }
.cmp-row input[type='range'] { flex: 1; height: 2rem; accent-color: #ec4899; cursor: pointer; }
.cmp-value { min-width: 14rem; color: var(--accent-2, #ec4899); font-size: 0.95rem; }
.cmp-value small { color: var(--muted); margin-left: 0.4rem; font-size: 0.72rem; }
.cmp-ends {
  display: flex; justify-content: space-between;
  color: var(--muted); font-size: 0.72rem;
  margin: 0.15rem 2.25rem 0 2.25rem;
}
@media (max-width: 640px) {
  .cmp-value { min-width: 8rem; font-size: 0.85rem; }
  .cmp-value small { display: block; margin-left: 0; }
}
.slider-track input[type='range'] { flex: 1; height: 2rem; accent-color: #ec4899; cursor: pointer; }
.slider-track input[type='range']:disabled { cursor: not-allowed; }
.slider-end { color: var(--muted); font-size: 0.78rem; min-width: 4.5rem; }
.slider-end:last-of-type { text-align: right; }
.slider-why { color: var(--muted); font-size: 0.75rem; margin: 0.25rem 0 0 5.25rem; max-width: 60ch; }

.play-go { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-top: 2rem; }
.play-generate {
  background: #ec4899; border: none; color: #fff; font-size: 1.15rem; font-family: inherit;
  padding: 0.85rem 2.5rem; border-radius: 10px; cursor: pointer;
}
.play-generate:disabled { background: var(--surface-3); color: var(--muted); cursor: not-allowed; }
.play-cost { color: var(--muted); font-size: 0.8rem; }

.play-result { margin-top: 2rem; border-top: 1px solid var(--surface-3); padding-top: 1.25rem; }
.play-play {
  background: var(--surface-2); border: 1px solid var(--surface-3); color: inherit;
  font-size: 1.05rem; font-family: inherit; padding: 0.7rem 1.75rem; border-radius: 10px; cursor: pointer;
}
.play-play.on { border-color: #ec4899; color: #ec4899; }
.play-play:disabled { color: var(--muted); cursor: default; }
.play-ab { display: flex; gap: 1.5rem; flex-wrap: wrap; margin: 0.75rem 0; }
.play-side { flex: 1; min-width: 240px; }
.verdict { font-size: 0.95rem; margin: 0.75rem 0 0; line-height: 1.45; }
.verdict.pass { color: var(--accent-2); }
.verdict.fail { color: var(--danger); }
.verdict.wait { color: var(--muted); }
.play-detail { margin-top: 0.5rem; font-size: 0.8rem; color: var(--muted); }
.play-detail summary { cursor: pointer; }
.play-detail ul { list-style: none; padding: 0.5rem 0 0; margin: 0; }
.play-detail li { display: flex; gap: 0.6rem; padding: 0.2rem 0; align-items: baseline; }
.gate-state { min-width: 4.5rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.7rem; }
.gate-state.pass { color: var(--accent-2); }
.gate-state.fail { color: var(--danger); }
.gate-word { min-width: 16rem; color: inherit; }
.gate-reason { flex: 1; }
.play-btn {
  background: var(--surface-2); border: 1px solid var(--surface-3); color: inherit;
  padding: 0.45rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-family: inherit;
}
.play-diff { font-size: 0.85rem; color: var(--muted); margin-top: 0.6rem; }
.play-note { color: var(--muted); font-size: 0.82rem; line-height: 1.5; max-width: 70ch; }
.play-caveat { color: var(--muted); font-size: 0.72rem; font-style: italic; margin-top: 1rem; }
.play-err { color: var(--danger); font-size: 0.82rem; }
</style>
