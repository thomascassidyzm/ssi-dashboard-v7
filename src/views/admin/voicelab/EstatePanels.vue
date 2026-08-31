<template>
  <div class="lab">
    <div class="controls">
      <label>Course
        <input v-model="course" list="course-list" placeholder="deu_for_eng" @keyup.enter="loadAll" />
        <datalist id="course-list">
          <option v-for="c in KNOWN_COURSES" :key="c" :value="c" />
        </datalist>
      </label>
      <label>Role
        <select v-model="role">
          <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
        </select>
      </label>
      <label>Sample size
        <input type="number" v-model.number="sampleSize" min="12" max="80" />
      </label>
      <button class="btn-primary" :disabled="busy" @click="loadAll">{{ busy ? 'Loading…' : 'Load' }}</button>
      <span v-if="error" class="err">{{ error }}</span>
    </div>

    <nav class="tabs">
      <button v-for="t in TABS" :key="t.id" :class="{ on: tab === t.id }" @click="tab = t.id">
        <span class="tab-n">{{ t.n }}</span> {{ t.label }}
      </button>
    </nav>

    <!-- 1 · AUDITION ---------------------------------------------------- -->
    <section v-show="tab === 'audition'" class="panel">
      <div v-if="audition" class="free-voices">
        <h3>Free to audition — {{ audition.freeVoices.length }} voices</h3>
        <div class="chips">
          <button
            v-for="v in audition.freeVoices"
            :key="v.voiceId"
            class="chip"
            :class="{ on: pinnedVoices.includes(v.voiceId) }"
            @click="togglePinned(v.voiceId)"
          >{{ v.voiceId }} <span class="chip-n">{{ v.clips }}</span></button>
        </div>
      </div>

      <table v-if="audition" class="grid">
        <thead>
          <tr><th>stratum</th><th>sentence</th><th>existing takes</th></tr>
        </thead>
        <tbody>
          <tr v-for="s in audition.sentences" :key="s.textNormalized">
            <td><span class="stratum" :class="s.stratum">{{ s.stratum }}</span></td>
            <td class="text bidi-isolate" :dir="dirFor(s.text)">{{ s.text }}</td>
            <td>
              <span v-if="!s.existingTakes.length" class="muted">— nothing in the store</span>
              <button
                v-for="t in visibleTakes(s)"
                :key="t.id"
                class="play"
                :title="`${t.voice_id} · ${t.course_code} · ${t.duration_ms} ms`"
                @click="play(t.url)"
              >▶ {{ blind ? maskVoice(t.voice_id) : t.voice_id }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 2 · COMPARE ------------------------------------------------------ -->
    <section v-show="tab === 'compare'" class="panel">
      <label class="blind-toggle"><input type="checkbox" v-model="blind" /> Blind — hide voice labels</label>

      <div v-if="audition" class="compare">
        <div class="compare-pick">
          <label>A <select v-model="voiceA"><option v-for="v in audition.freeVoices" :key="v.voiceId" :value="v.voiceId">{{ v.voiceId }}</option></select></label>
          <label>B <select v-model="voiceB"><option v-for="v in audition.freeVoices" :key="v.voiceId" :value="v.voiceId">{{ v.voiceId }}</option></select></label>
        </div>
        <table class="grid">
          <thead><tr><th>sentence</th><th>{{ blind ? 'A' : voiceA }}</th><th>{{ blind ? 'B' : voiceB }}</th></tr></thead>
          <tbody>
            <tr v-for="s in audition.sentences" :key="s.textNormalized">
              <td class="text bidi-isolate" :dir="dirFor(s.text)">{{ s.text }}</td>
              <td><button v-if="takeFor(s, voiceA)" class="play" @click="play(takeFor(s, voiceA).url)">▶</button><span v-else class="muted">—</span></td>
              <td><button v-if="takeFor(s, voiceB)" class="play" @click="play(takeFor(s, voiceB).url)">▶</button><span v-else class="muted">—</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 3 · DECLARE ------------------------------------------------------ -->
    <section v-show="tab === 'declare'" class="panel">

      <div v-if="declarations" class="declare-current">
        <h3>Declared today</h3>
        <table class="grid">
          <thead><tr><th>course</th><th>known</th><th>target1</th><th>target2</th><th>presentation</th></tr></thead>
          <tbody>
            <tr v-for="(side, code) in declarations.courses" :key="code">
              <td class="text">{{ code }}</td>
              <td v-for="r in ROLES" :key="r">{{ side[r] || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="declare-form">
        <h3>Declare a side</h3>
        <label>voice <input v-model="declareVoice" placeholder="ara" /></label>
        <label>language <input v-model="declareLanguage" placeholder="deu" /></label>
        <button class="btn-primary" :disabled="busy" @click="declare">Declare {{ course }}/{{ role }}</button>
        <p v-if="declareResult" class="ok">{{ declareResult }}</p>
        <p v-if="declareError" class="err">{{ declareError }}</p>
        <!-- The key, where the refusal happened. Recording the consent re-runs
             the declaration it blocked. -->
        <ConsentStep
          v-if="consentNeeded"
          :voice-id="consentNeeded.voiceId"
          :reason="consentNeeded.reason"
          :language="declareLanguage"
          @recorded="onConsentRecorded"
          @cancel="consentNeeded = null"
        />
      </div>
    </section>

    <!-- 4 · DRIFT -------------------------------------------------------- -->
    <section v-show="tab === 'drift'" class="panel">

      <div v-if="report">
        <table class="grid">
          <thead>
            <tr><th>side</th><th>clips</th><th>voices</th><th>dominant</th><th>share</th><th>languages</th><th>veracity checked</th></tr>
          </thead>
          <tbody>
            <tr v-for="s in report.sides" :key="s.role" :class="{ drift: s.distinctVoices > 1 }">
              <td class="text">{{ s.role }}</td>
              <td>{{ s.clips.toLocaleString() }}</td>
              <td><strong>{{ s.distinctVoices }}</strong></td>
              <td>{{ s.dominantVoice }}</td>
              <td>{{ (s.dominantShare * 100).toFixed(1) }}%</td>
              <td>{{ s.languages.join(', ') }}</td>
              <td>{{ checkedPct(s) }}</td>
            </tr>
          </tbody>
        </table>

        <h3>Every voice on every side</h3>
        <table class="grid">
          <thead><tr><th>side</th><th>voice</th><th>canonical</th><th>clips</th><th>first</th><th>last</th><th>median ms</th><th></th></tr></thead>
          <tbody>
            <template v-for="s in report.sides" :key="s.role">
              <tr v-for="v in s.voices" :key="s.role + v.voiceId" :class="{ minor: v.clips < s.clips * 0.02 }">
                <td>{{ s.role }}</td>
                <td class="text">{{ v.voiceId }}</td>
                <td>{{ v.canonical ? '✓' : '✗ unrecognised' }}</td>
                <td>{{ v.clips.toLocaleString() }}</td>
                <td class="muted">{{ shortDate(v.firstClip) }}</td>
                <td class="muted">{{ shortDate(v.lastClip) }}</td>
                <td>{{ v.medianDurationMs ?? '—' }}</td>
                <td><button class="play" @click="hearOutliers(s.role, v.voiceId)">hear</button></td>
              </tr>
            </template>
          </tbody>
        </table>

        <h3>Speaking rate — syllables per second, per voice</h3>
        <table class="grid">
          <thead><tr><th>side</th><th>voice</th><th>n</th><th>p10</th><th>median</th><th>p90</th><th>IQR</th></tr></thead>
          <tbody>
            <template v-for="(r, roleName) in report.rates" :key="roleName">
              <tr v-for="(q, v) in (r.byVoice || {})" :key="roleName + v">
                <td>{{ roleName }}</td><td class="text">{{ v }}</td>
                <td>{{ q.n }}</td><td>{{ q.p10 }}</td><td><strong>{{ q.median }}</strong></td><td>{{ q.p90 }}</td><td>{{ q.iqr }}</td>
              </tr>
            </template>
          </tbody>
        </table>

        <h3>Pitch and loudness — measured here, in the browser</h3>
        <p class="muted">{{ prosodySampleSize }} clips, decoded here — nothing is rendered.</p>
        <button class="btn-secondary" :disabled="prosodyBusy" @click="measureProsody">
          {{ prosodyBusy ? `Measuring ${prosodyDone}/${prosodySampleSize}…` : 'Measure a sample' }}
        </button>
        <table v-if="prosody.length" class="grid">
          <thead><tr><th>voice</th><th>n</th><th>median F0 Hz</th><th>F0 IQR</th><th>median active dB</th><th>dB spread</th></tr></thead>
          <tbody>
            <tr v-for="p in prosodyByVoice" :key="p.voiceId">
              <td class="text">{{ p.voiceId }}</td><td>{{ p.n }}</td>
              <td><strong>{{ p.f0Median }}</strong></td><td>{{ p.f0Iqr }}</td>
              <td>{{ p.dbMedian }}</td><td>{{ p.dbIqr }}</td>
            </tr>
          </tbody>
        </table>

        <h3>Ambiguous slots — one text, one role, more than one voice</h3>
        <p class="muted">
          {{ report.ambiguousSlots.returned }} of them, capped at {{ report.ambiguousSlots.cappedAt }}.
        </p>
        <table class="grid" v-if="report.ambiguousSlots.slots.length">
          <thead><tr><th>role</th><th>text</th><th>voices</th><th>rows</th></tr></thead>
          <tbody>
            <tr v-for="(s, i) in report.ambiguousSlots.slots.slice(0, 50)" :key="i">
              <td>{{ s.role }}</td><td class="text bidi-isolate" :dir="dirFor(s.text_normalized)">{{ s.text_normalized }}</td>
              <td>{{ s.voices.join(', ') }}</td><td>{{ s.clips }}</td>
            </tr>
          </tbody>
        </table>

        <p class="caveats">{{ report.caveats.join(' · ') }}</p>
      </div>
    </section>
  </div>
</template>

<script setup>
/**
 * VOICELAB — the fifth lab, beside Listening, Speaking, Pods and VAD.
 *
 * Four jobs, each answering a failure this estate has actually had:
 *   1 audition  — which voice should this course side declare
 *   2 compare   — is this voice genuinely better for this language (blind if you want it blind)
 *   3 declare   — the ten-voices problem, closed at the point where it starts
 *   4 drift     — has this side stayed one person
 *
 * Job 4 is what makes it a lab rather than a picker, and it is built from vadProsody.js
 * with the sign flipped: that extractor computes pitch and then deliberately discards it
 * because for VAD melody is voice identity and therefore noise. For voice consistency it
 * is the entire signal.
 *
 * THE HARD CONSTRAINT, and it is enforced server-side in api/voices/audition.js: this
 * screen renders nothing. It auditions from the store first — 2.5 million takes already
 * exist — and what it cannot find is shown as the exact list a sample run would have to
 * render, before anything is spent.
 */
import { ref, computed } from 'vue'
import { useAuth } from '../../../composables/useAuth'
import { dirFor } from '@/utils/textDirection.js'
import ConsentStep from './ConsentStep.vue'
import { decodeTo16kMono, extractFeatures, activeSpeechDb } from '../vadProsody'

const { getAccessToken } = useAuth()

const TABS = [
  { id: 'audition', n: 1, label: 'Audition' },
  { id: 'compare', n: 2, label: 'Compare' },
  { id: 'declare', n: 3, label: 'Declare' },
  { id: 'drift', n: 4, label: 'Drift' },
]
const ROLES = ['known', 'target1', 'target2', 'presentation']
const KNOWN_COURSES = ['deu_for_eng', 'fra_for_eng', 'deu_at_for_eng']

const tab = ref('audition')
const course = ref('deu_for_eng')
const role = ref('target1')
// 24 by default, never fewer than 12 — the floor is the pace gate's, which refuses to
// calibrate on fewer than 12 reference clips rather than guessing.
const sampleSize = ref(24)
const busy = ref(false)
const error = ref('')

const audition = ref(null)
const report = ref(null)
const declarations = ref(null)
const capability = ref(null)

const blind = ref(false)
const pinnedVoices = ref([])
const voiceA = ref('')
const voiceB = ref('')

const declareVoice = ref('')
const declareLanguage = ref('')
const declareResult = ref('')
const declareError = ref('')

const prosody = ref([])
const prosodyBusy = ref(false)
const prosodyDone = ref(0)
const prosodySampleSize = 40

let audioEl = null

async function loadAll () {
  busy.value = true
  error.value = ''
  try {
    const [a, r, d] = await Promise.all([
      fetch(`/api/voices/audition?course=${course.value}&role=${role.value}&size=${sampleSize.value}`).then(res => res.json()),
      fetch(`/api/voices/report?course=${course.value}`).then(res => res.json()),
      fetch('/api/voices/declare').then(res => res.json()),
    ])
    if (a.error) throw new Error(a.error)
    if (r.error) throw new Error(r.error)
    audition.value = a
    report.value = r
    declarations.value = d.declarations
    capability.value = d.capability
    declareLanguage.value = a.language || ''
    const vs = a.freeVoices || []
    voiceA.value = vs[0]?.voiceId || ''
    voiceB.value = vs[1]?.voiceId || ''
    prosody.value = []
  } catch (e) {
    error.value = e.message || String(e)
  } finally {
    busy.value = false
  }
}

function play (url) {
  if (!url) return
  if (audioEl) audioEl.pause()
  audioEl = new Audio(url)
  audioEl.play().catch(() => {})
}

function visibleTakes (s) {
  if (!pinnedVoices.value.length) return s.existingTakes.slice(0, 6)
  return s.existingTakes.filter(t => pinnedVoices.value.includes(t.voice_id))
}

function togglePinned (v) {
  const i = pinnedVoices.value.indexOf(v)
  if (i >= 0) pinnedVoices.value.splice(i, 1)
  else pinnedVoices.value.push(v)
}

function takeFor (s, voiceId) {
  return s.existingTakes.find(t => t.voice_id === voiceId) || null
}

/** Blind mode masks the label, not the audio — the point is to hear before you know. */
function maskVoice (v) {
  return `voice ${String(v).length % 7}`
}

function checkedPct (side) {
  const total = side.voices.reduce((n, v) => n + v.clips, 0)
  const checked = side.voices.reduce((n, v) => n + v.veracity.passed + v.veracity.failed, 0)
  return total ? `${((checked / total) * 100).toFixed(1)}%` : '—'
}

function shortDate (t) {
  return t ? String(t).slice(0, 10) : '—'
}

function hearOutliers (roleName, voiceId) {
  const s = (report.value?.samples || []).find(x => x.role === roleName && x.voice_id === voiceId)
  if (s) play(s.url)
}

/**
 * Fetch a bounded sample and extract pitch and active-speech loudness locally. Bounded and
 * SAID to be bounded: a report that quietly truncates reads as "covered everything".
 */
async function measureProsody () {
  const samples = (report.value?.samples || []).slice(0, prosodySampleSize)
  prosodyBusy.value = true
  prosodyDone.value = 0
  const out = []
  for (const s of samples) {
    try {
      const buf = await fetch(s.url).then(r => r.arrayBuffer())
      const x = await decodeTo16kMono(buf)
      const f = extractFeatures(x)
      const db = activeSpeechDb(x)
      if (f) out.push({ voiceId: s.voice_id, role: s.role, f0: f.f0_median_hz, db, syllables: f.syllable_peaks, seconds: f.duration_s })
    } catch { /* a clip that will not fetch or decode is reported by its absence, not by a guess */ }
    prosodyDone.value++
    prosody.value = out.slice()
  }
  prosodyBusy.value = false
}

const prosodyByVoice = computed(() => {
  const by = {}
  for (const p of prosody.value) (by[p.voiceId] ||= []).push(p)
  const q = (xs, k) => {
    const v = xs.filter(n => n != null).sort((a, b) => a - b)
    if (!v.length) return null
    return v[Math.min(v.length - 1, Math.round((v.length - 1) * k))]
  }
  return Object.entries(by).map(([voiceId, rows]) => {
    const f0 = rows.map(r => r.f0)
    const db = rows.map(r => r.db)
    const round = (x) => (x == null ? '—' : Math.round(x * 10) / 10)
    return {
      voiceId,
      n: rows.length,
      f0Median: round(q(f0, 0.5)),
      f0Iqr: round(q(f0, 0.75) - q(f0, 0.25)),
      dbMedian: round(q(db, 0.5)),
      dbIqr: round(q(db, 0.75) - q(db, 0.25)),
    }
  })
})

async function declare () {
  declareResult.value = ''
  declareError.value = ''
  busy.value = true
  try {
    const token = await getAccessToken()
    const res = await fetch('/api/voices/declare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        course: course.value,
        role: role.value,
        voiceId: declareVoice.value,
        language: declareLanguage.value,
      }),
    })
    const data = await res.json()
    // The body travels with the error: a declaration LOCKS a course side to a
    // voice, so it takes the standing consent block, and this screen has to
    // BRANCH on that refusal rather than print it and stop.
    if (!res.ok) throw Object.assign(new Error(data.error || `${res.status}`), { data })
    declarations.value = data.declarations
    declareResult.value = `${course.value}/${role.value} declared ${data.declared.voiceId} — config ${data.configHash.slice(0, 12)}`
  } catch (e) {
    const refusal = consentRefusal(e)
    if (refusal) {
      consentNeeded.value = { ...refusal, retry: declare }
      declareError.value = ''
    } else {
      declareError.value = e.message || String(e)
    }
  } finally {
    busy.value = false
  }
}

// ── THE CONSENT STEP — the key, on the screen that declares a course side ────
//
// Tom, 2026-08-31: "we are never going to use a voice without consent."
// api/voices/declare.js says it plainly: a declaration is a cast under another
// name, so it takes the standing block. This panel showed the refusal honestly
// and then had nothing to offer — the same lock-with-no-key the cast screens
// had. Same key, and it is one component: ConsentStep is the Voice Lab's own
// declaration flow, sitting inside the Voice Lab.
//
// It reuses the language already typed into the form for the case where the
// voice has no `voices` row and recording consent has to create one.
const consentNeeded = ref(null)

/** A refusal this panel can do something about, or null. */
function consentRefusal (err) {
  const d = (err && err.data) || {}
  if (d.code !== 'NO_RECORDED_CONSENT' && d.code !== 'CONSENT_UNREADABLE') return null
  return { voiceId: d.voiceId || declareVoice.value, reason: err.message }
}

async function onConsentRecorded () {
  const retry = consentNeeded.value?.retry
  consentNeeded.value = null
  if (retry) await retry()
}
</script>

<style scoped>
/* A directed target sentence must not drift to the other side of its cell:
   `dir` fixes the punctuation, alignment stays as it is today. */
td.text { text-align: left; }

.lab { padding: 0; }
.admin-crumbs { display: flex; gap: 0.5rem; font-size: 0.8125rem; margin-bottom: 0.5rem; }
.crumb-link { color: var(--accent-2); text-decoration: none; }
.crumb-sep, .crumb-here { color: var(--muted); }
.page-title { font-size: 1.75rem; margin: 0 0 0.25rem; letter-spacing: 0.04em; }
.controls { display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap; margin-bottom: 1rem; }
.controls label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.75rem; color: var(--muted); }
.controls input, .controls select { padding: 0.4rem 0.5rem; border-radius: 6px; border: 1px solid var(--surface-3); background: var(--surface-1); color: inherit; }
.tabs { display: flex; gap: 0.5rem; border-bottom: 1px solid var(--surface-3); margin-bottom: 1rem; }
.tabs button { background: none; border: none; padding: 0.6rem 1rem; color: var(--muted); cursor: pointer; border-bottom: 2px solid transparent; }
.tabs button.on { color: inherit; border-bottom-color: #ec4899; }
.tab-n { opacity: 0.5; margin-right: 0.35rem; }
.panel { animation: fade 0.15s ease; }
@keyframes fade { from { opacity: 0 } to { opacity: 1 } }
.grid { width: 100%; border-collapse: collapse; font-size: 0.8125rem; margin: 0.75rem 0 1.5rem; }
.grid th { text-align: left; font-weight: 500; color: var(--muted); border-bottom: 1px solid var(--surface-3); padding: 0.4rem 0.5rem; }
.grid td { padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--surface-2); vertical-align: top; }
.grid tr.drift td { background: rgba(236, 72, 153, 0.06); }
.grid tr.minor td { opacity: 0.65; }
.text { font-family: ui-monospace, monospace; }
.muted { color: var(--muted); font-size: 0.8125rem; }
.err { color: var(--danger); }
.ok { color: var(--accent-2); }
.play { background: var(--surface-2); border: 1px solid var(--surface-3); border-radius: 5px; padding: 0.15rem 0.5rem; margin: 0 0.25rem 0.25rem 0; cursor: pointer; color: inherit; font-size: 0.75rem; }
.play:hover { border-color: #ec4899; }
.chips { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.5rem 0 1rem; }
.chip { background: var(--surface-2); border: 1px solid var(--surface-3); border-radius: 999px; padding: 0.2rem 0.7rem; cursor: pointer; color: inherit; font-size: 0.75rem; }
.chip.on { border-color: #ec4899; color: #ec4899; }
.chip-n { opacity: 0.5; margin-left: 0.35rem; }
.stratum { font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 4px; background: var(--surface-2); }
.stratum.short { color: #fbbf24; }
.stratum.long { color: #60a5fa; }
.compare-pick { display: flex; gap: 1.5rem; margin: 0.75rem 0; }
.compare-pick label { display: flex; gap: 0.4rem; align-items: center; font-size: 0.8125rem; }
.blind-toggle { display: inline-flex; gap: 0.4rem; align-items: center; font-size: 0.8125rem; margin: 0.5rem 0; }
.declare-form { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start; max-width: 60ch; }
.declare-form label { display: flex; gap: 0.5rem; align-items: center; font-size: 0.8125rem; }
.declare-form input { padding: 0.35rem 0.5rem; border-radius: 6px; border: 1px solid var(--surface-3); background: var(--surface-1); color: inherit; }
.btn-primary { background: #ec4899; border: none; color: white; padding: 0.45rem 1rem; border-radius: 6px; cursor: pointer; }
.btn-primary:disabled { opacity: 0.5; cursor: default; }
.btn-secondary { background: var(--surface-2); border: 1px solid var(--surface-3); color: inherit; padding: 0.4rem 0.9rem; border-radius: 6px; cursor: pointer; }
.caveats { color: var(--muted); font-size: 0.75rem; margin-top: 2rem; font-style: italic; }
h3 { font-size: 0.9rem; margin: 1.5rem 0 0.25rem; letter-spacing: 0.02em; }
</style>
