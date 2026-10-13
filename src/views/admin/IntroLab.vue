<template>
  <div class="il">
    <LabCrumbs :trail="[{ label: 'Home', to: '/' }, { label: 'Admin', to: '/admin' }, { label: 'Labs', to: '/admin/labs' }, { label: 'Intro Lab' }]" />
    <h1>Intro Lab</h1>
    <p class="sub">
      The spliced Tom-voice intro, then the LEGO exactly as the player plays it at its debut. Pick a course and a LEGO (or a
      sample set), drag any setting and it plays again on release. Read-only: nothing here writes course data or renders audio.
    </p>

    <section class="card">
      <div class="row">
        <CoursePicker :modelValue="course" @update:modelValue="onCourse" placeholder="Pick a course…" />
      </div>
      <p v-if="loading" class="note">Loading {{ course }}…</p>
      <p v-if="loadError" class="warn">{{ loadError }}</p>
      <template v-if="data">
        <p class="note">
          {{ data.counts.legos }} LEGOs · {{ data.languageName || 'no “The … for” intros' }}.
          Current intros: {{ data.counts.bare }} bare, {{ data.counts.cut }} cut as-in, {{ data.counts.pieces }} joined as-in.
        </p>
        <p v-if="!data.frame" class="warn">
          No Tom-006 “The {{ data.languageName || '…' }} for” frame clip exists for this course, so a fresh splice cannot be made —
          only the intro as shipped plays. (Rendering a frame is an audio spend, so this tool will not do it.)
        </p>
      </template>
    </section>

    <template v-if="data">
      <section class="card">
        <div class="chips">
          <button v-for="s in sets" :key="s.key" :class="{ on: setKey === s.key }" :disabled="!s.list.length" @click="pickSet(s.key)">
            {{ s.label }} <small>{{ s.list.length }}</small>
          </button>
        </div>
        <div class="chips lego-chips">
          <button v-for="l in runList" :key="l.legoId" :class="{ on: l.legoId === legoId }" @click="pickLego(l.legoId, true)">
            {{ l.legoId.replace(/^S0*/, 'S') }} <small>{{ shortKnown(l) }}</small>
          </button>
        </div>
        <div class="row">
          <select v-model="legoId" @change="pickLego(legoId, true)" class="grow">
            <option v-for="l in data.legos" :key="l.legoId" :value="l.legoId">{{ l.legoId }} — {{ l.known }} → {{ l.target }}</option>
          </select>
        </div>
      </section>

      <section class="card" v-if="detail">
        <div class="lego-line">
          <span class="known">{{ detail.lego.known }}</span> → <strong class="target">{{ detail.lego.target }}</strong>
          <span class="tag">{{ detail.lego.type === 'A' ? 'atomic' : 'molecular' }}</span>
          <span class="tag" v-if="detail.lego.built">{{ recipeLabel(detail.lego.built.recipe) }}</span>
          <span class="tag" v-else>intro not spliced</span>
        </div>
        <div class="note">Intro as shipped: {{ detail.lego.introText || '— none —' }}</div>
      </section>

      <section class="card">
        <div class="row">
          <label class="fld">Intro from
            <select v-model="source" @change="settle">
              <option value="as-built">As built (re-splice with the recipe it was made with)</option>
              <option value="splice">Splice: frame + LEGO + tail</option>
              <option value="cut">Cut: frame + “LEGO is” cut from a continuous intro</option>
              <option value="current">Shipped intro, untouched</option>
            </select>
          </label>
          <label class="fld">Tail (splice)
            <select v-model="s.tail" @change="settle">
              <option v-for="t in data.tails" :key="t.key" :value="t.key">{{ t.label }}{{ t.isDefault ? ' (house default)' : '' }}{{ t.rejected ? ' (rejected: too informal)' : '' }}</option>
            </select>
          </label>
          <label class="fld">Player mode
            <select v-model="mode" @change="settle">
              <option value="easy">Easy ({{ speedText('easy') }})</option>
              <option value="fast">Fast ({{ speedText('fast') }})</option>
            </select>
          </label>
        </div>
        <div class="row">
          <label class="chk"><input type="checkbox" v-model="withIntro" @change="settle"> Intro cycle (intro → voice 1 → voice 2 → 2 s hold)</label>
          <label class="chk"><input type="checkbox" v-model="withDebut" @change="settle"> Then the debut cycle (known → pause → voice 1 → voice 2)</label>
        </div>
      </section>

      <section class="card">
        <label class="sl">Gap: “The X for” → LEGO <b>{{ s.g1 }} ms</b><input type="range" min="0" max="500" step="10" v-model.number="s.g1" @change="settle"></label>
        <label class="sl">Gap: LEGO → tail <b>{{ s.g2 }} ms</b><input type="range" min="-60" max="500" step="10" v-model.number="s.g2" @change="settle"></label>
        <label class="sl">Gap between “as in” pieces <b>{{ s.inGap }} ms</b><input type="range" min="0" max="500" step="10" v-model.number="s.inGap" @change="settle"></label>
        <label class="sl">LEGO emphasis over frame <b>{{ sgn(s.em) }} dB</b><input type="range" min="-3" max="8" step="0.5" v-model.number="s.em" @change="settle"></label>
        <label class="sl">Tail level vs frame <b>{{ sgn(s.tl) }} dB</b><input type="range" min="-8" max="4" step="0.5" v-model.number="s.tl" @change="settle"></label>
        <label class="sl">Fade-out at the end <b>{{ s.fd }} ms</b><input type="range" min="0" max="250" step="10" v-model.number="s.fd" @change="settle"></label>
        <label class="chk"><input type="checkbox" v-model="s.trim" @change="settle"> Trim silence off each piece’s edges</label>
        <div class="row">
          <button @click="resetHouse">House setting (Tom, 2026-10-13)</button>
          <label class="chk"><input type="checkbox" v-model="auto"> Play again on release</label>
        </div>
      </section>

      <section class="card">
        <div class="row">
          <button class="go" @click="playOne">▶ Play</button>
          <button class="go" @click="playRun">▶▶ Play all {{ runList.length }}</button>
          <button @click="stop">■ Stop</button>
        </div>
        <div class="status" :class="{ warn: statusWarn }">{{ status }}</div>
        <ol v-if="steps.length" class="steps">
          <li v-for="(st, i) in steps" :key="i" :class="{ now: i === stepNow }">{{ st }}</li>
        </ol>
      </section>

      <section class="card">
        <div class="note">Current values — copy and send:</div>
        <textarea readonly rows="3" :value="line" @focus="$event.target.select()"></textarea>
        <div class="row"><button @click="copy">Copy</button></div>
      </section>

      <p class="note foot">
        Intro cycle and debut cycle follow the player: toSimpleRounds.ts (intro prompt 1.0×, no pause, 2000 ms hold; debut pause =
        computePauseDuration), voicePace.ts and the course’s by-ear speed for the voices, and the Easy / Fast config rows in
        algorithm_config. Levelling is the shipped introAssembly maths: −14 dBFS, 250 ms end silence. The target voices are played
        through the browser’s pitch-preserving rate, as the player does.
      </p>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onBeforeUnmount } from 'vue'
import LabCrumbs from '@/components/LabCrumbs.vue'
import CoursePicker from '../../components/CoursePicker.vue'
import { getApiBaseUrl } from '../../services/api'
import { HOUSE, buildIntro } from '../../lib/introLabDsp.js'

const course = ref('')
const data = ref(null)
const detail = ref(null)
const legoId = ref('')
const loading = ref(false)
const loadError = ref('')
const setKey = ref('spread')
const source = ref('as-built')
const mode = ref('easy')
const withIntro = ref(true)
const withDebut = ref(false)
const auto = ref(true)
const s = reactive({ ...HOUSE })
const status = ref('')
const statusWarn = ref(false)
const steps = ref([])
const stepNow = ref(-1)

const sgn = (v) => (v > 0 ? '+' : '') + v
const shortKnown = (l) => (l.known.length > 16 ? l.known.slice(0, 15) + '…' : l.known)
const recipeLabel = (r) => ({ bare: 'bare', cut: 'as-in, cut from one recording', pieces: 'as-in, joined from pieces' }[r] || r)
const base = (p) => `${getApiBaseUrl()}/api/production/${course.value}/intro-lab${p}`

// ---- sample sets --------------------------------------------------------------------------------------------------
const spread = (list, n) => {
  if (list.length <= n) return list
  return Array.from({ length: n }, (_, i) => list[Math.round(i * (list.length - 1) / (n - 1))])
}
const sets = computed(() => {
  const ls = data.value ? data.value.legos : []
  const by = (r) => ls.filter((l) => l.built && l.built.recipe === r)
  return [
    { key: 'spread', label: 'Early → late', list: spread(ls, 10) },
    { key: 'bare', label: 'Bare', list: spread(by('bare'), 8) },
    { key: 'cut', label: 'Cut as-in', list: spread(by('cut'), 8) },
    { key: 'pieces', label: 'Joined as-in', list: spread(by('pieces'), 8) },
    { key: 'first', label: 'First 25', list: ls.slice(0, 25) },
  ]
})
const runList = computed(() => (sets.value.find((x) => x.key === setKey.value) || { list: [] }).list)

async function onCourse(code) {
  stop()
  course.value = code || ''
  data.value = null; detail.value = null; loadError.value = ''
  if (!course.value) return
  loading.value = true
  try {
    const r = await fetch(base('/'))
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`)
    data.value = await r.json()
    setKey.value = 'spread'
    source.value = data.value.counts.bare + data.value.counts.cut + data.value.counts.pieces ? 'as-built' : (data.value.frame ? 'splice' : 'current')
    if (runList.value.length) await pickLego(runList.value[0].legoId, false)
  } catch (e) {
    loadError.value = `Could not load ${course.value}: ${e.message}`
  } finally { loading.value = false }
}

function pickSet(k) { setKey.value = k; if (runList.value.length) pickLego(runList.value[0].legoId, true) }

async function pickLego(id, play) {
  stop()
  legoId.value = id
  detail.value = null
  const r = await fetch(base('/lego/' + encodeURIComponent(id)))
  if (!r.ok) { say(`Could not load ${id}`, true); return }
  detail.value = await r.json()
  if (play && auto.value) playOne()
}

// ---- audio --------------------------------------------------------------------------------------------------------
let ctx = null
const pcmCache = new Map()
let run = 0
let current = null // { stop() } of whatever is sounding

const ac = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx }
const clipUrl = (id) => base('/clip/' + id)
async function pcm(id) {
  const key = course.value + id
  if (pcmCache.has(key)) return pcmCache.get(key)
  const r = await fetch(clipUrl(id))
  if (!r.ok) throw new Error(`clip ${id.slice(0, 8)} → HTTP ${r.status}`)
  const buf = await ac().decodeAudioData(await r.arrayBuffer())
  const x = buf.getChannelData(0)
  pcmCache.set(key, x)
  return x
}
const say = (t, warn = false) => { status.value = t; statusWarn.value = warn }
const sleep = (ms, id) => new Promise((res) => {
  const t = setTimeout(res, ms)
  current = { stop: () => { clearTimeout(t); res() } }
  void id
})

function playBuffer(x) {
  return new Promise((res) => {
    const c = ac()
    const b = c.createBuffer(1, x.length, c.sampleRate); b.copyToChannel(x, 0)
    const src = c.createBufferSource(); src.buffer = b; src.connect(c.destination)
    src.onended = res
    current = { stop: () => { try { src.stop() } catch { /* already ended */ } res() } }
    src.start()
  })
}
function playClip(el) {
  return new Promise((res) => {
    el.onended = res; el.onerror = res
    current = { stop: () => { try { el.pause() } catch { /* nothing playing */ } res() } }
    el.play().catch(res)
  })
}
// An <audio> element cannot send the dashboard's Authorization header, and the clip route is auth-gated (it only opens
// without a token for same-host callers). So the bytes come through the authenticated fetch and play from a blob URL.
const blobUrls = new Map()
async function blobUrl(id) {
  const key = course.value + id
  if (blobUrls.has(key)) return blobUrls.get(key)
  const r = await fetch(clipUrl(id))
  if (!r.ok) throw new Error(`clip ${id.slice(0, 8)} → HTTP ${r.status}`)
  const u = URL.createObjectURL(await r.blob())
  blobUrls.set(key, u)
  return u
}
async function makeClip(id, speed) {
  const el = new Audio(await blobUrl(id))
  el.preload = 'auto'; el.playbackRate = speed; el.preservesPitch = true
  return el
}

/** The spliced (or shipped) intro as a Float32Array, plus a note saying what was actually made. */
async function makeIntro(d) {
  const lego = d.lego
  const fallback = async (why) => ({ x: await pcm(lego.presentationAudioId), note: `shipped intro (${why})` })
  if (!lego.presentationAudioId) throw new Error('this LEGO has no intro clip')
  const kindOf = (k) => (lego.built ? lego.built.pieces.find((p) => p.kind === k || p.kind.startsWith(k + ':')) : null)
  const sr = ac().sampleRate
  let want = source.value
  if (want === 'current') return fallback('as chosen')
  if (want === 'as-built' && !lego.built) want = data.value.frame ? 'splice' : 'current'
  if (want !== 'current' && !data.value.frame && !(want === 'as-built' && lego.built)) return fallback('no Tom frame for this course')
  const frameId = data.value.frame ? data.value.frame.audioId : (kindOf('frame') || {}).audioId
  if (!frameId) return fallback('no Tom frame for this course')
  const frame = await pcm(frameId)
  if (want === 'as-built') {
    const r = lego.built.recipe
    if (r === 'cut') {
      if (!d.donor) return fallback('cut donor missing')
      return { x: buildIntro('cut', { frame, donor: await pcm(d.donor.audioId), donorStart: d.donor.starts[3], donorEnd: d.donor.ends[d.donor.ends.length - 1] }, s, sr), note: 'rebuilt: cut as-in' }
    }
    if (r === 'pieces') {
      const need = ['lego', 'asin', 'context', 'is'].map(kindOf)
      if (need.some((p) => !p)) return fallback('pieces missing')
      const [l, a, c, i] = await Promise.all(need.map((p) => pcm(p.audioId)))
      return { x: buildIntro('pieces', { frame, lego: l, asIn: a, context: c, is: i }, s, sr), note: 'rebuilt: joined as-in' }
    }
    const l = kindOf('lego'), t = kindOf('tail')
    if (!l || !t) return fallback('pieces missing')
    return { x: buildIntro('bare', { frame, lego: await pcm(l.audioId), tail: await pcm(t.audioId) }, s, sr), note: `rebuilt: bare, ${t.kind.slice(5)}` }
  }
  if (want === 'cut') {
    if (!d.donor) return fallback('no continuous intro to cut this LEGO from')
    return { x: buildIntro('cut', { frame, donor: await pcm(d.donor.audioId), donorStart: d.donor.starts[3], donorEnd: d.donor.ends[d.donor.ends.length - 1] }, s, sr), note: `cut from ${d.donor.from}` }
  }
  if (!d.tomLegoId) return fallback('no Tom-006 reading of this LEGO to splice')
  const tail = data.value.tails.find((t) => t.key === s.tail) || data.value.tails[0]
  return { x: buildIntro('bare', { frame, lego: await pcm(d.tomLegoId), tail: await pcm(tail.id) }, s, sr), note: `spliced, tail “${tail.label}”` }
}

/** The ordered cycle list for one LEGO: what plays, with the player's own speeds and pauses. */
async function sequenceFor(d) {
  const plan = d.plans[mode.value]
  const list = []
  if (withIntro.value) {
    const intro = await makeIntro(d)
    const secs = (intro.x.length / ac().sampleRate).toFixed(2)
    list.push({ label: `Intro — ${intro.note} (${secs} s, 1.0×)`, run: () => playBuffer(intro.x) })
    for (const c of plan.intro.slice(1)) list.push(stepOf(c, 'intro'))
  }
  if (withDebut.value) for (const c of plan.debut) list.push(stepOf(c, 'debut'))
  return list
}
function stepOf(c, cycle) {
  if (c.kind === 'silence') return { label: `${cycle}: hold ${c.ms} ms (${c.why})`, run: (id) => sleep(c.ms, id) }
  const name = { prompt: 'known prompt', voice1: 'target voice 1', voice2: 'target voice 2' }[c.kind]
  // Fetched now (so the whole sequence is ready before the first sound), played later.
  const ready = c.audioId ? makeClip(c.audioId, c.speed) : Promise.resolve(null)
  ready.catch(() => {})
  return { label: `${cycle}: ${name} at ${c.speed}×`, run: async () => { const el = await ready; if (el) await playClip(el) } }
}

async function runLego(id, d, tag) {
  const seq = await sequenceFor(d)
  if (id !== run) return false
  steps.value = seq.map((x) => x.label)
  for (let i = 0; i < seq.length; i++) {
    if (id !== run) return false
    stepNow.value = i
    say(`${tag}▶ ${d.lego.legoId} · ${d.lego.known} → ${d.lego.target}`)
    await seq[i].run(id)
  }
  return id === run
}

async function playOne() {
  stop()
  if (!detail.value) return
  const id = ++run
  await ac().resume()
  try {
    say('Preparing…')
    if (await runLego(id, detail.value, '')) say('Done.')
  } catch (e) { if (id === run) say(e.message, true) }
}

async function playRun() {
  stop()
  const id = ++run
  await ac().resume()
  const list = runList.value
  try {
    for (let i = 0; i < list.length && id === run; i++) {
      legoId.value = list[i].legoId
      say(`Loading ${list[i].legoId}…`)
      const r = await fetch(base('/lego/' + encodeURIComponent(list[i].legoId)))
      if (!r.ok || id !== run) continue
      detail.value = await r.json()
      if (!(await runLego(id, detail.value, `${i + 1}/${list.length} `))) return
      await sleep(900, id)
    }
    if (id === run) say(`Done — ${list.length} LEGOs.`)
  } catch (e) { if (id === run) say(e.message, true) }
}

function stop() {
  run++
  if (current) { const c = current; current = null; c.stop() }
  stepNow.value = -1
}
function settle() { if (auto.value && detail.value) playOne() }
function resetHouse() { Object.assign(s, HOUSE); settle() }

const speedText = (m) => {
  const sp = data.value && data.value.speeds[m]
  return sp ? `voice 1 ${sp.target1.speed}×, voice 2 ${sp.target2.speed}×` : ''
}
const line = computed(() => {
  if (!detail.value) return ''
  const tail = data.value.tails.find((t) => t.key === s.tail)
  return `course=${course.value} lego=${detail.value.lego.legoId} source=${source.value} mode=${mode.value} tail="${tail ? tail.label : s.tail}" ` +
    `gapFrameToLego=${s.g1}ms gapLegoToTail=${s.g2}ms gapInPieces=${s.inGap}ms legoEmphasis=${sgn(s.em)}dB tailLevel=${sgn(s.tl)}dB fade=${s.fd}ms trimEdges=${s.trim} ` +
    `intro=${withIntro.value} debut=${withDebut.value} (overall -14 dBFS, 250 ms end silence)`
})
async function copy() { try { await navigator.clipboard.writeText(line.value); say('Copied.') } catch { say('Select the text and copy it.', true) } }

onBeforeUnmount(() => { stop(); for (const u of blobUrls.values()) URL.revokeObjectURL(u); blobUrls.clear() })
</script>

<style scoped>
.il { max-width: 760px; margin: 0 auto; padding: 1rem 1rem 4rem; color: var(--text, #e8eaed); }
h1 { font-size: 1.4rem; margin: 0.25rem 0; }
.sub, .note { color: var(--muted, #8b9199); font-size: 0.85rem; }
.warn { color: #e0a458; font-size: 0.85rem; }
.card { background: var(--card-bg, rgba(255,255,255,0.04)); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 0.8rem 1rem; margin: 0.8rem 0; }
.row { display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center; margin: 0.4rem 0; }
.grow { flex: 1; min-width: 0; }
.fld { display: flex; flex-direction: column; font-size: 0.75rem; color: var(--muted, #8b9199); gap: 0.2rem; flex: 1; min-width: 200px; }
.chk { display: flex; gap: 0.4rem; align-items: center; font-size: 0.85rem; }
.sl { display: block; font-size: 0.85rem; }
.sl b { float: right; color: var(--accent-2, #6aa9ff); font-variant-numeric: tabular-nums; }
.sl input[type=range] { width: 100%; height: 32px; }
select, button { font: inherit; color: inherit; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.18); border-radius: 8px; padding: 0.45rem 0.7rem; }
button.go { background: var(--accent-2, #3b82f6); border-color: transparent; color: #fff; }
.chips { display: flex; gap: 0.4rem; flex-wrap: wrap; margin: 0.3rem 0; }
.chips button { padding: 0.3rem 0.6rem; font-size: 0.8rem; }
.chips button.on { outline: 2px solid var(--accent-2, #6aa9ff); }
.chips button:disabled { opacity: 0.35; }
.chips small { color: var(--muted, #8b9199); margin-left: 0.2rem; }
.lego-line { font-size: 1.05rem; }
.known { color: var(--muted, #8b9199); }
.tag { font-size: 0.7rem; background: rgba(255,255,255,0.08); border-radius: 6px; padding: 0.1rem 0.4rem; margin-left: 0.4rem; }
.status { min-height: 1.3rem; font-size: 0.85rem; color: #5fd08a; }
.status.warn { color: #e0a458; }
.steps { font-size: 0.78rem; color: var(--muted, #8b9199); padding-left: 1.2rem; }
.steps li.now { color: #5fd08a; font-weight: 600; }
textarea { width: 100%; font: 0.78rem ui-monospace, monospace; background: transparent; color: inherit; border: 1px dashed rgba(255,255,255,0.25); border-radius: 8px; padding: 0.5rem; }
.foot { margin-top: 1.5rem; }
</style>
