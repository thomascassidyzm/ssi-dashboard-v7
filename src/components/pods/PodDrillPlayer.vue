<template>
  <!--
    POD DRILL PLAYER (job #860). Tom, 2026-11-05: "we should be able to see the actual content in
    popty and play through it, rather than needing to be in the app".
    One scene, dealt by the learning app's own code (src/lib/podDrill/podDrillDeal.js → the
    vendored src/lib/podEngine), in either of the app's two ways:
      Listening — Drill, t·k·t·t every unit, every time (r-2026-11-03); visit N = Drill rung N−1.
      Regular   — the main-flow lap ladder, lap N = the stage the live algorithm_config gives it.
    Every slot the app would leave silent is shown red and announced in the play-through.
    Read-only: renders nothing, writes nothing.
  -->
  <div class="drill">
    <div class="ctl-row">
      <label class="ctl">Scene
        <select v-model.number="scene" @change="load">
          <option v-for="n in scenes" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
      <div class="seg">
        <button :class="mode === 'listening' ? 'on' : ''" @click="setMode('listening')">Listening (TKTT)</button>
        <button :class="mode === 'regular' ? 'on' : ''" @click="setMode('regular')">Regular (ladder)</button>
      </div>
      <label class="ctl">{{ mode === 'regular' ? 'Lap' : 'Visit' }}
        <select v-model.number="visit" @change="syncQuery">
          <option v-for="n in visitCount" :key="n" :value="n">{{ n }}{{ visitLabel(n) }}</option>
        </select>
      </label>
    </div>

    <div v-if="loading" class="muted pad">Loading scene {{ scene }}…</div>
    <div v-else-if="error" class="err pad">{{ error }}</div>
    <template v-else-if="payload">
      <div class="summary" :class="gapCount ? 'summary-bad' : 'summary-ok'">
        <strong>{{ gapCount ? `${gapCount} gap${gapCount === 1 ? '' : 's'} in scene ${scene}` : `No gaps in scene ${scene}` }}</strong>
        · {{ dealt.length }} sentences · {{ flat.length }} plays
        <span v-if="mode === 'regular'"> · lap {{ visit }} = stage {{ lapStage ?? '—' }} {{ lapPlaylist.length ? `[${lapPlaylist.join(' · ')}]` : '' }}</span>
        <div v-if="mode === 'regular' && !ladder.useStagePlaylist" class="note">
          The live listening row has the stage playlist OFF: every lap plays the single pattern
          [{{ ladder.pattern.join(' · ') }}] and only its speed ramps with exposure. Speeds shown are the role rates, not the ramp.
        </div>
        <div v-if="mode === 'listening'" class="note">
          Drill as a first-time learner: visit 1 = rung 0. Cut lines drill each chunk then the line; from visit 2 the whole line.
        </div>
        <div v-if="!payload.cutsFile" class="note">No cut file for {{ courseCode }} — only clip timings and fine maps can split lines.</div>
      </div>

      <div v-for="(d, si) in dealt" :key="d.s.id" class="sent" :class="{ cur: curSentence === si }">
        <div class="sent-head" @click="playFrom(si)">
          <span class="spk">{{ d.s.speaker }}</span>
          <span class="badge" :class="d.s.groupsFrom ? 'b-cut' : 'b-whole'">{{ d.s.groupsFrom ? `split by ${d.s.groupsFrom}` : 'plays whole' }}</span>
          <span class="sid">{{ shortId(d.s.id) }}</span>
          <button class="mini" @click.stop="playFrom(si)">▶ from here</button>
        </div>
        <div class="tgt">{{ d.s.targetText }}</div>
        <div class="kn">{{ d.s.knownText }}</div>
        <div v-if="d.s.cutNote" class="warn">{{ d.s.cutNote }}</div>
        <div v-if="d.note" class="warn">{{ d.note }}</div>
        <ol class="steps">
          <li v-for="(st, k) in d.steps" :key="k"
              :class="['step', st.side, { gap: st.gapReason, now: cur && cur.si === si && cur.k === k }]"
              @click="playFrom(si, k)">
            <span class="side">{{ st.side === 'known' ? 'K' : 'T' }}<sub v-if="st.rate && st.rate !== 1">{{ st.rate }}×</sub></span>
            <span class="txt">{{ st.text }}</span>
            <span v-if="st.clip && st.clip.startMs != null" class="ms">{{ st.clip.startMs }}–{{ st.clip.endMs }} ms</span>
            <span v-if="st.lineKnown" class="ms">line's English</span>
            <span v-if="st.gapReason" class="why">⚠ {{ st.gapReason }}</span>
          </li>
        </ol>
      </div>
    </template>

    <div v-if="payload && flat.length" class="bar">
      <button @click="prev" :disabled="!flat.length">⏮</button>
      <button v-if="!playing" class="big" @click="resume">▶ {{ cur ? 'Resume' : 'Play scene' }}</button>
      <button v-else class="big" @click="pause">⏸ Pause</button>
      <button @click="next" :disabled="!flat.length">⏭</button>
      <div class="now-txt" :class="{ 'now-gap': banner }">
        <template v-if="banner">⚠ {{ banner }}</template>
        <template v-else-if="cur">{{ flat[pos]?.st.side === 'known' ? 'K' : 'T' }} · {{ flat[pos]?.st.text }}</template>
        <template v-else>{{ flat.length }} plays ready</template>
      </div>
    </div>
    <audio ref="audioEl" playsinline preload="auto"></audio>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiUrl } from '@/services/api.js'
import {
  sceneSentences, sceneDrillDepth, makeKnownLookup, answerAsked, lookupVariantsFor, lookupVoicesFor,
  clipGap, drillSteps, regularSteps, ladderConfig, bareId, podStageFor,
} from '@/lib/podDrill/podDrillDeal.js'
import { dominantVoiceFamily } from '@/lib/podEngine/fusionDrill'

const props = defineProps({ courseCode: { type: String, required: true }, slug: { type: String, required: true } })
const route = useRoute()
const router = useRouter()

const scene = ref(Number(route.query.scene) || 4)
const mode = ref(route.query.mode === 'regular' ? 'regular' : 'listening')
const visit = ref(Math.max(1, Number(route.query.visit) || 1))
const scenes = ref([])
const payload = ref(null)
const sentences = ref([])
const answers = ref(new Map())
const loading = ref(false)
const error = ref('')
const loadFailures = ref(new Map()) // bare clip id → reason seen while playing

const api = (p) => `${getApiUrl()}/api/production/${props.courseCode}${p}`

function syncQuery () {
  router.replace({ query: { ...route.query, view: 'drill', scene: String(scene.value), mode: mode.value, visit: String(visit.value) } }).catch(() => {})
}
function setMode (m) { mode.value = m; visit.value = 1; stop(); syncQuery() }

async function load () {
  stop()
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(api(`/pods/${encodeURIComponent(props.slug)}/drill?scene=${scene.value}`))
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || `drill feed failed (${res.status})`)
    payload.value = body
    scenes.value = body.scenes
    scene.value = body.scene
    sentences.value = sceneSentences(body)
    answers.value = new Map()
    await resolveKnowns()
    syncQuery()
  } catch (e) {
    error.value = e.message
    payload.value = null
  } finally {
    loading.value = false
  }
}

// The app's English lookup is asynchronous (ask, then recompose); do the same until nothing new is asked.
async function resolveKnowns () {
  const clips = payload.value.clips
  const fallbackVoice = dominantVoiceFamily(sentences.value.map((s) => clips[bareId(s.knownAudioId)]?.voice).filter(Boolean))
  for (let pass = 0; pass < 4; pass++) {
    const asked = new Map()
    const lookup = makeKnownLookup({ clips, answers: answers.value, asked, fallbackVoice })
    for (const s of sentences.value) {
      for (let r = 0; r < sceneDrillDepth([s]); r++) drillSteps(s, r, lookup)
    }
    if (!asked.size) return
    const res = await fetch(api(`/pods/${encodeURIComponent(props.slug)}/drill/known-lookup`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variants: lookupVariantsFor(asked), voices: lookupVoicesFor(asked) }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || `English lookup failed (${res.status})`)
    const got = answerAsked(asked, body.rows || [], props.courseCode, clips)
    answers.value = new Map([...answers.value, ...got])
  }
}

const ladder = computed(() => ladderConfig(payload.value?.config))
const drillDepth = computed(() => sceneDrillDepth(sentences.value))
const visitCount = computed(() => (mode.value === 'regular' ? Math.max(1, ladder.value.retireAfterVisits) : Math.max(2, drillDepth.value)))
function visitLabel (n) {
  if (mode.value === 'regular') {
    const st = podStageFor(1, n, ladder.value.stageDuration, ladder.value.totalStages || 1, ladder.value.stageDurations)
    return st ? ` · stage ${st.stage}` : ''
  }
  return n >= drillDepth.value ? ' · whole lines' : ' · chunks'
}
const lapInfo = computed(() => (mode.value === 'regular' && payload.value ? regularSteps({ targetAudioId: 'x', main: { target_audio_id: 'x', known_audio_id: 'y', target_text: '', known_text: '' } }, visit.value, ladder.value) : null))
const lapStage = computed(() => lapInfo.value?.stage ?? null)
const lapPlaylist = computed(() => lapInfo.value?.playlist || [])

const dealt = computed(() => {
  if (!payload.value) return []
  const clips = payload.value.clips
  const lookup = makeKnownLookup({ clips, answers: answers.value, asked: new Map(), fallbackVoice: dominantVoiceFamily(sentences.value.map((s) => clips[bareId(s.knownAudioId)]?.voice).filter(Boolean)) })
  void loadFailures.value.size
  return sentences.value.map((s) => {
    const r = mode.value === 'regular' ? regularSteps(s, visit.value, ladder.value) : drillSteps(s, visit.value - 1, lookup)
    const steps = r.steps.map((st) => {
      const fail = st.clip && loadFailures.value.get(bareId(st.clip.id))
      return { ...st, gapReason: st.dropped || clipGap(st.clip, clips, st.side) || (fail ? `${st.side} clip ${bareId(st.clip.id)} failed to play: ${fail}` : null) }
    })
    return { s, steps, note: r.note || null }
  })
})
const flat = computed(() => dealt.value.flatMap((d, si) => d.steps.map((st, k) => ({ si, k, st }))))
const gapCount = computed(() => flat.value.filter((f) => f.st.gapReason).length + dealt.value.filter((d) => d.s.cutNote).length)

// ── play-through ─────────────────────────────────────────────────────────────
const audioEl = ref(null)
const playing = ref(false)
const pos = ref(-1)
const banner = ref('')
const cur = computed(() => (pos.value >= 0 ? flat.value[pos.value] : null))
const curSentence = computed(() => cur.value?.si ?? -1)
let token = 0
const urls = new Map()

async function urlOf (id) {
  const b = bareId(id)
  if (!urls.has(b)) {
    const res = await fetch(api(`/audio/${b}/url`))
    if (!res.ok) throw new Error(`signed URL ${res.status}`)
    urls.set(b, (await res.json()).url)
  }
  return urls.get(b)
}

function beep () {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    const ctx = new Ctx(); const o = ctx.createOscillator(); const g = ctx.createGain()
    o.frequency.value = 220; g.gain.value = 0.15; o.connect(g); g.connect(ctx.destination)
    o.start(); o.stop(ctx.currentTime + 0.35); setTimeout(() => ctx.close(), 600)
  } catch { /* no audio context: the banner still says it */ }
}

// Every play owns an id (job #873). Skipping between two slices of ONE clip reuses the element
// with the same src, so the previous play's rAF tick / onended / awaited continuation is still
// alive when the new slice starts; under the run-level token alone that stale tick saw the token
// change and paused the new slice (#872 cold-verify: play → pause → play → stale pause).
// A superseded play is settled quietly — it never pauses, seeks or resolves its successor; the
// element is only ever paused by stop() or by the live play reaching its own slice end.
let playId = 0
let rafHandle = 0
let settlePending = null
function cancelPlay () {
  playId++
  if (rafHandle) cancelAnimationFrame(rafHandle)
  rafHandle = 0
  const el = audioEl.value
  if (el) { el.onended = null; el.onloadedmetadata = null; el.onerror = null }
  const settle = settlePending
  settlePending = null
  if (settle) settle()
}

function playClip (st, my) {
  cancelPlay()
  const id = playId
  const live = () => id === playId && my === token
  return new Promise((resolve, reject) => {
    const el = audioEl.value
    let done = false
    const finish = (fn, v) => {
      if (done) return
      done = true
      if (id === playId) { settlePending = null; rafHandle = 0 }
      fn(v)
    }
    settlePending = () => finish(resolve)
    ;(async () => {
      const url = await urlOf(st.clip.id)
      if (!live()) return finish(resolve)
      if (el.src !== url) {
        el.src = url
        await new Promise((ok, bad) => {
          el.onloadedmetadata = () => { if (id === playId) ok() }
          el.onerror = () => { if (id === playId) bad(new Error('audio did not load')) }
        })
        el.onloadedmetadata = null; el.onerror = null
        if (!live()) return finish(resolve)
      }
      el.playbackRate = st.rate || 1
      el.currentTime = (st.clip.startMs || 0) / 1000
      el.onended = () => { if (id === playId) finish(resolve) }
      await el.play()
      if (!live()) return finish(resolve)
      if (st.clip.endMs == null) return
      const tick = () => {
        if (!live()) return finish(resolve)
        if (el.currentTime * 1000 >= st.clip.endMs) { el.pause(); return finish(resolve) }
        rafHandle = requestAnimationFrame(tick)
      }
      rafHandle = requestAnimationFrame(tick)
    })().catch((e) => (live() ? finish(reject, e) : finish(resolve)))
  })
}

async function run (from) {
  const my = ++token
  playing.value = true
  for (let i = from; i < flat.value.length; i++) {
    if (my !== token) return
    pos.value = i
    scrollToCurrent()
    const { st } = flat.value[i]
    banner.value = ''
    if (st.gapReason) {
      banner.value = st.gapReason
      beep()
      await new Promise((r) => setTimeout(r, 1800))
      continue
    }
    try {
      await playClip(st, my)
    } catch (e) {
      if (my !== token) return
      const m = new Map(loadFailures.value); m.set(bareId(st.clip.id), e.message); loadFailures.value = m
      banner.value = `${st.side} clip failed: ${e.message}`
      beep()
      await new Promise((r) => setTimeout(r, 1800))
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  if (my === token) { playing.value = false; banner.value = '' }
}
function scrollToCurrent () {
  nextTick(() => document.querySelector('.drill .step.now')?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
}
function stop () { token++; cancelPlay(); playing.value = false; audioEl.value?.pause() }
function pause () { stop() }
function resume () { run(pos.value >= 0 && pos.value < flat.value.length ? pos.value : 0) }
function playFrom (si, k = 0) { stop(); const i = flat.value.findIndex((f) => f.si === si && f.k === k); run(i < 0 ? 0 : i) }
function next () { stop(); run(Math.min(flat.value.length - 1, pos.value + 1)) }
function prev () { stop(); run(Math.max(0, pos.value - 1)) }
const shortId = (id) => String(id).split(':').slice(-2).join(':')

watch([mode, visit], () => { stop(); pos.value = -1 })
onUnmounted(stop)
load()
</script>

<style scoped>
.drill { padding-bottom: 6rem; }
.ctl-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem; }
.ctl { font-size: 0.85rem; display: flex; gap: 0.35rem; align-items: center; }
.ctl select { background: var(--color-surface-2, #222); color: inherit; border: 1px solid rgba(127,127,127,0.35); border-radius: 0.375rem; padding: 0.3rem 0.4rem; }
.seg { display: flex; border: 1px solid rgba(16,185,129,0.5); border-radius: 0.5rem; overflow: hidden; }
.seg button { padding: 0.4rem 0.7rem; font-size: 0.85rem; }
.seg button.on { background: rgba(16,185,129,0.25); font-weight: 600; }
.pad { padding: 1.5rem 0; }
.muted { opacity: 0.7; }
.err { color: #ef4444; }
.summary { border-radius: 0.5rem; padding: 0.6rem 0.8rem; margin-bottom: 0.75rem; font-size: 0.85rem; }
.summary-bad { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.6); }
.summary-ok { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.4); }
.note { font-size: 0.75rem; opacity: 0.8; margin-top: 0.3rem; }
.sent { border: 1px solid rgba(127,127,127,0.25); border-radius: 0.5rem; padding: 0.6rem; margin-bottom: 0.6rem; }
.sent.cur { border-color: rgba(16,185,129,0.8); }
.sent-head { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; font-size: 0.75rem; }
.spk { font-weight: 600; }
.sid { opacity: 0.5; }
.badge { padding: 0 0.4rem; border-radius: 999px; font-size: 0.7rem; }
.b-cut { background: rgba(37,99,235,0.2); }
.b-whole { background: rgba(127,127,127,0.2); }
.mini { margin-left: auto; padding: 0.15rem 0.5rem; border: 1px solid rgba(16,185,129,0.5); border-radius: 0.375rem; }
.tgt { font-size: 1.05rem; margin-top: 0.3rem; }
.kn { font-size: 0.85rem; opacity: 0.75; }
.warn { margin-top: 0.3rem; font-size: 0.75rem; color: #f59e0b; }
.steps { list-style: none; margin: 0.4rem 0 0; padding: 0; }
.step { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: baseline; padding: 0.25rem 0.35rem; border-radius: 0.3rem; font-size: 0.8rem; cursor: pointer; }
.step .side { font-weight: 700; width: 1.6rem; }
.step.target .side { color: #10b981; }
.step.known .side { color: #60a5fa; }
.step .txt { flex: 1; min-width: 8rem; }
.step .ms { font-size: 0.7rem; opacity: 0.6; }
.step .why { flex-basis: 100%; color: #ef4444; font-weight: 600; font-size: 0.75rem; }
.step.gap { background: rgba(239,68,68,0.12); border-left: 3px solid #ef4444; }
.step.now { background: rgba(16,185,129,0.25); }
.bar { position: fixed; left: 0; right: 0; bottom: 0; display: flex; gap: 0.4rem; align-items: center; padding: 0.6rem 0.75rem calc(0.6rem + env(safe-area-inset-bottom)); background: var(--color-canvas, #111); border-top: 1px solid rgba(127,127,127,0.3); z-index: 30; }
.bar button { padding: 0.5rem 0.7rem; border: 1px solid rgba(127,127,127,0.4); border-radius: 0.5rem; font-size: 1rem; }
.bar .big { border-color: rgba(16,185,129,0.7); font-weight: 600; }
.now-txt { flex: 1; min-width: 0; font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.now-gap { color: #ef4444; font-weight: 700; white-space: normal; }
</style>
