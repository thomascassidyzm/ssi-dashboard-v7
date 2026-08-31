<script setup>
/**
 * RUN TESTS — layer 2 of the lab.
 *
 * Three tests, and the difference between them is what question they answer:
 *   SINGLE     one clip, one config — does this voice say this sentence at all
 *   BLIND A/B  same sentence, two configs, labels hidden — which one is better
 *   BATCH      up to 20 course sentences through one config, gates tabulated —
 *              does it hold up on real material, not on the sentence you chose
 *              because it flattered the voice
 *
 * SENTENCES COME FROM THE COURSE OR FROM YOUR HANDS. Free text is for probing;
 * the course picker is for evidence, because a voice that survives a sentence
 * you invented has survived nothing the estate will actually ask of it.
 *
 * THE COST IS SHOWN BEFORE THE BUTTON ARMS. Every run spends real money at
 * $15/1M characters, so the estimate is fetched from the backend (which holds
 * the ledger and the daily ceiling) and the Run button stays disabled until
 * there is an estimate that fits under the ceiling. Nothing here writes to
 * course_audio.
 */
import { ref, computed, watch } from 'vue'
import { api } from './labApi'
import { dirFor } from '@/utils/textDirection.js'
import { languageName } from '@/utils/languageNames'
import CoursePicker from '@/components/CoursePicker.vue'
import RunResult from './RunResult.vue'

const props = defineProps({
  params: { type: Object, required: true },
  configA: { type: Object, required: true },
  configB: { type: Object, required: true },
})
const emit = defineEmits(['ran'])

const KINDS = [
  { id: 'single', label: 'Single clip', hint: 'One sentence, one config.' },
  { id: 'ab', label: 'Blind A/B', hint: 'Same sentences, two configs, labels hidden.' },
  { id: 'batch', label: 'Batch', hint: 'Up to 20 course sentences through one config.' },
]

const kind = ref('single')
const title = ref('')
const notes = ref('')
const source = ref('free') // 'free' | 'course'

// ── free text ────────────────────────────────────────────────────────────────
const freeText = ref('')

// ── course text ──────────────────────────────────────────────────────────────
const courses = ref([])
const course = ref('')
const role = ref('seed')
const query = ref('')
const selectedCourse = computed(() => courses.value.find((c) => c.code === course.value) || null)

/** The picker emits a code; searching on it is what the old <select> did. */
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
const found = ref([])
const picked = ref([])
const searching = ref(false)
const searchError = ref('')

async function loadCourses () {
  try {
    const data = await api.courses()
    courses.value = data.courses || []
    if (!course.value && courses.value.length) course.value = courses.value[0].code
  } catch (e) {
    searchError.value = e.message
  }
}
loadCourses()

async function search () {
  if (!course.value) return
  searching.value = true
  searchError.value = ''
  try {
    const data = await api.sentences({ course: course.value, role: role.value, q: query.value, limit: 60 })
    found.value = data.sentences || []
  } catch (e) {
    searchError.value = e.message
    found.value = []
  } finally {
    searching.value = false
  }
}

function togglePick (s) {
  const i = picked.value.findIndex((p) => p.text === s.text)
  if (i >= 0) picked.value.splice(i, 1)
  else picked.value.push(s)
}
const isPicked = (s) => picked.value.some((p) => p.text === s.text)

// ── the sentences a run would actually use ───────────────────────────────────
const maxSentences = computed(() =>
  kind.value === 'single' ? 1 : (props.params.limits?.maxSentencesPerBatch || 20))

const sentences = computed(() => {
  const raw = source.value === 'free'
    ? freeText.value.split('\n').map((s) => s.trim()).filter(Boolean)
    : picked.value.map((p) => p.text)
  return raw.slice(0, maxSentences.value)
})

const overCap = computed(() => {
  const raw = source.value === 'free'
    ? freeText.value.split('\n').map((s) => s.trim()).filter(Boolean).length
    : picked.value.length
  return raw > maxSentences.value ? raw - maxSentences.value : 0
})

const tooLong = computed(() => {
  const cap = props.params.limits?.maxCharsPerSentence || 300
  return sentences.value.filter((s) => s.length > cap)
})

const runConfigs = computed(() => (kind.value === 'ab' ? [props.configA, props.configB] : [props.configA]))

// ── estimate ─────────────────────────────────────────────────────────────────
const estimate = ref(null)
const estimating = ref(false)
const estimateError = ref('')

async function refreshEstimate () {
  estimate.value = null
  estimateError.value = ''
  if (!sentences.value.length) return
  estimating.value = true
  try {
    estimate.value = await api.estimate({ sentences: sentences.value, configs: runConfigs.value })
  } catch (e) {
    estimateError.value = e.message
  } finally {
    estimating.value = false
  }
}
watch([sentences, kind, () => props.configA, () => props.configB], refreshEstimate, { deep: true })

// ── the run ──────────────────────────────────────────────────────────────────
const running = ref(false)
const runError = ref('')
const experiment = ref(null)
let stopPolling = null

const armed = computed(() =>
  !running.value &&
  sentences.value.length > 0 &&
  !tooLong.value.length &&
  Boolean(estimate.value) &&
  !estimate.value.wouldExceed)

async function run () {
  running.value = true
  runError.value = ''
  experiment.value = null
  if (stopPolling) stopPolling()
  try {
    const { experiment: exp } = await api.createRun({
      kind: kind.value,
      title: title.value || defaultTitle(),
      notes: notes.value,
      blind: kind.value === 'ab',
      sentences: sentences.value,
      configs: runConfigs.value,
    })
    experiment.value = exp
    emit('ran', exp)
    stopPolling = pollUntilDone(exp.id)
  } catch (e) {
    runError.value = e.message
    running.value = false
  }
}

function pollUntilDone (id) {
  let stopped = false
  ;(async () => {
    while (!stopped) {
      await new Promise((r) => setTimeout(r, 2500))
      if (stopped) return
      try {
        const { experiment: exp } = await api.getRun(id)
        experiment.value = exp
        if (exp.status !== 'running') { running.value = false; emit('ran', exp); return }
      } catch (e) {
        runError.value = `${e.message} — the run is still on the backend; reopen it from Experiments.`
        running.value = false
        return
      }
    }
  })()
  return () => { stopped = true; running.value = false }
}

function defaultTitle () {
  const c = props.configA
  const what = [c.voiceName || c.voiceId, c.language].filter(Boolean).join(' · ')
  return `${kind.value} — ${what}`
}
</script>

<template>
  <div>
    <div class="vl-panel">
      <h3>Run a test</h3>
      <div class="vl-kinds">
        <button
          v-for="k in KINDS" :key="k.id"
          class="vl-btn" :class="{ 'vl-on': kind === k.id }"
          @click="kind = k.id"
        >{{ k.label }}</button>
        <span class="vl-muted">{{ KINDS.find(k => k.id === kind).hint }}</span>
      </div>

      <div class="vl-fields" style="margin-top: 0.75rem">
        <label class="vl-field">Title
          <input v-model="title" :placeholder="defaultTitle()" />
        </label>
        <label class="vl-field">Notes
          <input v-model="notes" placeholder="what this run is meant to settle" />
        </label>
      </div>

      <h4>Sentences</h4>
      <div class="vl-kinds">
        <button class="vl-btn" :class="{ 'vl-on': source === 'free' }" @click="source = 'free'">Free text</button>
        <button class="vl-btn" :class="{ 'vl-on': source === 'course' }" @click="source = 'course'">From a course</button>
      </div>

      <div v-if="source === 'free'" style="margin-top: 0.6rem">
        <textarea
          v-model="freeText"
          rows="5"
          class="vl-textarea"
          spellcheck="false"
          placeholder="One sentence per line."
        ></textarea>
      </div>

      <div v-else style="margin-top: 0.6rem">
        <div class="vl-fields">
          <label class="vl-field">Course
            <CoursePicker
              :model-value="course"
              :courses="courses"
              :option-meta="courseMeta"
              placeholder="Type a language or a code…"
              @update:model-value="pickCourse"
            />
            <span v-if="selectedCourse && selectedCourse.renderable === false" class="vl-why vl-warn">
              {{ languageName(selectedCourse.language) }} is not steerable here
            </span>
          </label>
          <label class="vl-field">Text
            <select v-model="role" @change="search">
              <option value="seed">seed sentences</option>
              <option value="">any practice phrase</option>
              <option value="build">build phrases</option>
              <option value="use">use phrases</option>
              <option value="component">components</option>
            </select>
          </label>
          <label class="vl-field">Search
            <input v-model="query" placeholder="text contains…" @keyup.enter="search" />
          </label>
          <label class="vl-field">&nbsp;
            <button class="vl-btn" :disabled="searching" @click="search">
              {{ searching ? 'Searching…' : 'Search' }}
            </button>
          </label>
        </div>
        <p v-if="searchError" class="vl-err">{{ searchError }}</p>

        <div v-if="found.length" class="vl-sentence-list">
          <button
            v-for="s in found" :key="s.id"
            class="vl-sentence" :class="{ on: isPicked(s) }"
            @click="togglePick(s)"
          >
            <span class="vl-mono bidi-isolate" :dir="dirFor(s.text)">{{ s.text }}</span>
            <span class="vl-muted">{{ s.role }}</span>
          </button>
        </div>
        <p v-if="picked.length" class="vl-muted">{{ picked.length }} picked.</p>
      </div>

      <p v-if="overCap" class="vl-warn">
        {{ overCap }} beyond the cap of {{ maxSentences }} — not run.
      </p>
      <p v-if="tooLong.length" class="vl-err">
        {{ tooLong.length }} over {{ params.limits?.maxCharsPerSentence || 300 }} characters.
      </p>

      <h4>Cost</h4>
      <div class="vl-estimate">
        <template v-if="estimating">
          <span class="vl-muted">estimating…</span>
        </template>
        <template v-else-if="estimate">
          <span class="vl-chip">{{ estimate.clips }} clips</span>
          <span class="vl-chip">{{ estimate.chars }} chars</span>
          <span class="vl-chip" :class="{ fail: estimate.wouldExceed }">{{ estimate.usd == null ? 'not priced' : '$' + estimate.usd.toFixed(4) }}</span>
          <span class="vl-muted">{{ estimate.ceilingRemaining }} chars left today</span>
          <span v-if="estimate.wouldExceed" class="vl-err">over the daily ceiling</span>
        </template>
        <template v-else-if="estimateError">
          <span class="vl-err">{{ estimateError }}</span>
        </template>
        <template v-else>
          <span class="vl-muted">pick or type a sentence</span>
        </template>
      </div>

      <div style="margin-top: 0.75rem; display: flex; gap: 0.6rem; align-items: center;">
        <button class="vl-btn-primary" :disabled="!armed" @click="run">
          {{ running ? 'Running…' : `Run ${kind}` }}
        </button>
        <span v-if="runError" class="vl-err">{{ runError }}</span>
      </div>
    </div>

    <div v-if="experiment" class="vl-panel">
      <RunResult :experiment="experiment" />
    </div>
  </div>
</template>

<style scoped>
@import './lab.css';
.vl-kinds { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; font-size: 0.78rem; }
.vl-btn.vl-on { border-color: #ec4899; color: #ec4899; }
.vl-textarea {
  width: 100%;
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--surface-3);
  background: var(--surface-2);
  color: inherit;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8125rem;
}
.vl-sentence-list {
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid var(--surface-3);
  border-radius: 8px;
  margin: 0.5rem 0;
}
.vl-sentence {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  border-bottom: 1px solid var(--surface-2);
  color: inherit;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
  font-size: 0.8125rem;
}
.vl-sentence:hover { background: var(--surface-2); }
.vl-sentence.on { background: rgba(236, 72, 153, 0.12); color: #ec4899; }
.vl-estimate { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; font-size: 0.8125rem; }
</style>
