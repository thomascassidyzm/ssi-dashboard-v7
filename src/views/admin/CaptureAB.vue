<!--
  Capture A/B — the same read, twice, on the device that decides.

  The recordist room's capture profile is a choice between Apple's voice chain
  and the bare hardware tap (src/composables/useTapRecorder.js, CAPTURE_PROFILES).
  On iOS that is not a filter setting, it is which audio unit Safari builds, and
  no amount of reading WebKit source tells you which one sounds better in Tom's
  room on Tom's phone. So this page asks the phone.

  It records the same line under each profile back to back, decodes both in the
  browser, and prints the numbers that actually decide it — peak, RMS, an
  estimated room floor and the margin between them — next to a play button for
  each. Nothing is uploaded and nothing is stored: this is a measuring
  instrument, not a recording session.

  The margin is the one that matters. Peak and RMS can both be fixed later by
  the server's loudnorm; the distance between the voice and the room cannot be
  fixed by anything, anywhere, ever.
-->
<template>
  <div class="cab">
    <h1>Capture A/B</h1>
    <p class="lede">
      Read the same sentence twice, the same way, at the same distance. The only
      thing that changes between the two takes is how the microphone was asked for.
    </p>

    <ol class="how">
      <li>Tap a profile below and read the sentence aloud.</li>
      <li>Tap Stop.</li>
      <li>Do the other one. Same distance, same voice.</li>
      <li>Compare the numbers, then compare your ears.</li>
    </ol>

    <p v-if="error" class="err">{{ error }}</p>

    <div class="rows">
      <div v-for="p in profileNames" :key="p" class="row">
        <div class="row-head">
          <span class="name">{{ label(p) }}</span>
          <button
            v-if="recordingProfile !== p"
            :disabled="!!recordingProfile"
            @click="record(p)"
          >{{ takes[p] ? 'Record again' : 'Record' }}</button>
          <button v-else class="stop" @click="stopRecording">Stop</button>
        </div>
        <p class="constraints">{{ constraintText(p) }}</p>

        <div v-if="recordingProfile === p" class="live">
          <div class="bar"><i :style="{ width: Math.min(100, liveLevel * 300) + '%' }" /></div>
          <span>{{ elapsed }}s</span>
        </div>

        <div v-if="takes[p]" class="result">
          <audio :src="takes[p].url" controls preload="metadata" />
          <dl>
            <div><dt>Peak</dt><dd>{{ fmt(takes[p].peakDb) }} dBFS</dd></div>
            <div><dt>Speech RMS</dt><dd>{{ fmt(takes[p].speechDb) }} dBFS</dd></div>
            <div><dt>Room floor</dt><dd>{{ fmt(takes[p].floorDb) }} dBFS</dd></div>
            <div class="hero"><dt>Margin</dt><dd>{{ fmt(takes[p].marginDb) }} dB</dd></div>
            <div><dt>Clipped</dt><dd>{{ takes[p].clippedPct.toFixed(2) }}%</dd></div>
            <div><dt>Format</dt><dd>{{ takes[p].mime || 'unknown' }}</dd></div>
            <div><dt>Rate</dt><dd>{{ takes[p].sampleRate }} Hz</dd></div>
            <div><dt>Reported</dt><dd>{{ takes[p].reported }}</dd></div>
          </dl>
        </div>
      </div>
    </div>

    <div v-if="both" class="verdict">
      <h2>What the numbers say</h2>
      <p>
        {{ label(louder) }} captured {{ fmt(Math.abs(takes.voice.peakDb - takes.dry.peakDb)) }} dB
        louder at the peak.
      </p>
      <p>
        {{ label(cleaner) }} has the better margin over the room, by
        {{ fmt(Math.abs(takes.voice.marginDb - takes.dry.marginDb)) }} dB.
        That is the one the server cannot fix afterwards.
      </p>
      <p v-if="clipWarning" class="warn">{{ clipWarning }}</p>
    </div>

    <p class="note">
      Nothing on this page is uploaded or saved. Reload and it is gone.
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { CAPTURE_PROFILES, CAPTURE_BITRATE } from '../../composables/useTapRecorder'

const profileNames = Object.keys(CAPTURE_PROFILES)
const takes = ref({})
const recordingProfile = ref('')
const error = ref('')
const liveLevel = ref(0)
const elapsed = ref(0)

let stream = null
let recorder = null
let chunks = []
let meterCtx = null
let rafId = null
let timer = null

function label(p) {
  return p === 'voice' ? 'Voice-processed' : 'Dry'
}
function constraintText(p) {
  const c = CAPTURE_PROFILES[p]
  return `echoCancellation ${c.echoCancellation} · noiseSuppression ${c.noiseSuppression} · autoGainControl ${c.autoGainControl}`
}
function fmt(v) {
  return Number.isFinite(v) ? v.toFixed(1) : '—'
}

function pickMime() {
  const opts = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ]
  for (const m of opts) {
    try { if (MediaRecorder.isTypeSupported(m)) return m } catch { /* ignore */ }
  }
  return ''
}

async function record(p) {
  error.value = ''
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { ...CAPTURE_PROFILES[p], channelCount: 1, sampleRate: 48000 },
      video: false,
    })
  } catch (e) {
    error.value = `Could not open the microphone: ${e.message}`
    return
  }

  const track = stream.getAudioTracks()[0]
  const s = track.getSettings ? track.getSettings() : {}
  // What the browser says it gave us, verbatim. On WebKit two of these three
  // come back undefined rather than false, because the constraints are not
  // implemented at all — worth seeing rather than guessing at.
  const reported = ['echoCancellation', 'noiseSuppression', 'autoGainControl']
    .map(k => `${k[0]}${k[1]}=${s[k] === undefined ? '?' : s[k]}`).join(' ')

  const mime = pickMime()
  chunks = []
  recorder = mime
    ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: CAPTURE_BITRATE })
    : new MediaRecorder(stream)
  recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data) }
  recorder.onstop = () => finish(p, mime, s, reported)
  recorder.start()

  recordingProfile.value = p
  elapsed.value = 0
  timer = setInterval(() => { elapsed.value += 1 }, 1000)
  startMeter()
}

function startMeter() {
  try {
    meterCtx = new (window.AudioContext || window.webkitAudioContext)()
    const src = meterCtx.createMediaStreamSource(stream)
    const analyser = meterCtx.createAnalyser()
    analyser.fftSize = 1024
    const buf = new Float32Array(analyser.fftSize)
    src.connect(analyser)
    const tick = () => {
      analyser.getFloatTimeDomainData(buf)
      let peak = 0
      for (let i = 0; i < buf.length; i++) { const a = Math.abs(buf[i]); if (a > peak) peak = a }
      liveLevel.value = Math.max(peak, liveLevel.value * 0.85)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  } catch { /* the meter is decoration; the take is what matters */ }
}

function stopRecording() {
  if (recorder && recorder.state !== 'inactive') { try { recorder.stop() } catch { /* gone */ } }
}

function teardown() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
  if (timer) { clearInterval(timer); timer = null }
  if (meterCtx) { try { meterCtx.close() } catch { /* already closed */ } meterCtx = null }
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
  liveLevel.value = 0
}

async function finish(p, mime, settings, reported) {
  const blob = chunks.length ? new Blob(chunks, { type: chunks[0].type || mime }) : null
  chunks = []
  recorder = null
  recordingProfile.value = ''
  teardown()
  if (!blob) { error.value = 'That take captured nothing.'; return }

  let measured
  try {
    measured = await measure(blob)
  } catch (e) {
    error.value = `Could not decode that take: ${e.message}`
    return
  }
  takes.value = {
    ...takes.value,
    [p]: {
      url: URL.createObjectURL(blob),
      mime: blob.type,
      reported,
      sampleRate: settings.sampleRate || measured.sampleRate,
      ...measured,
    },
  }
}

// Decode the blob and measure it. Windowed RMS at 50ms, because a single
// number over a whole take tells you nothing about the gap between the voice
// and the room — and that gap is the entire question.
async function measure(blob) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const buffer = await ctx.decodeAudioData(await blob.arrayBuffer())
  const data = buffer.getChannelData(0)
  const win = Math.max(1, Math.round(buffer.sampleRate * 0.05))

  let peak = 0
  let clipped = 0
  const rms = []
  for (let i = 0; i + win <= data.length; i += win) {
    let sum = 0
    for (let j = i; j < i + win; j++) {
      const a = Math.abs(data[j])
      if (a > peak) peak = a
      if (a >= 0.99) clipped++
      sum += data[j] * data[j]
    }
    rms.push(Math.sqrt(sum / win))
  }
  try { await ctx.close() } catch { /* fine */ }

  const sorted = [...rms].sort((a, b) => a - b)
  const pick = q => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] : 0
  // The floor is the quiet tenth of the take — the gaps between words and the
  // pre-roll. The speech level is the loud fifth, which is where the syllables
  // live; a mean over everything is dragged down by the silence we deliberately
  // record around every line.
  const floor = pick(0.1)
  const speech = pick(0.8)
  const db = v => (v > 0 ? 20 * Math.log10(v) : -Infinity)

  return {
    sampleRate: buffer.sampleRate,
    durationS: buffer.duration,
    peakDb: db(peak),
    speechDb: db(speech),
    floorDb: db(floor),
    marginDb: db(speech) - db(floor),
    clippedPct: (clipped / Math.max(1, data.length)) * 100,
  }
}

const both = computed(() => !!(takes.value.voice && takes.value.dry))
const louder = computed(() => (takes.value.voice.peakDb >= takes.value.dry.peakDb ? 'voice' : 'dry'))
const cleaner = computed(() => (takes.value.voice.marginDb >= takes.value.dry.marginDb ? 'voice' : 'dry'))
const clipWarning = computed(() => {
  const bad = profileNames.filter(p => takes.value[p] && takes.value[p].clippedPct > 0.05)
  if (!bad.length) return ''
  return `${bad.map(label).join(' and ')} clipped. Back off from the phone and record it again — a clipped take is unrecoverable whatever the profile.`
})

onBeforeUnmount(() => { stopRecording(); teardown() })
</script>

<style scoped>
.cab { max-width: 720px; margin: 0 auto; padding: 1.5rem 1rem 4rem; }
h1 { font-size: 1.5rem; margin: 0 0 .5rem; }
.lede { color: #444; margin: 0 0 1rem; }
.how { color: #444; margin: 0 0 1.5rem; padding-left: 1.2rem; }
.how li { margin: .2rem 0; }
.err { background: #fdecea; color: #a3271c; padding: .6rem .8rem; border-radius: 6px; }
.rows { display: flex; flex-direction: column; gap: 1rem; }
.row { border: 1px solid #ddd; border-radius: 10px; padding: 1rem; }
.row-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.name { font-weight: 600; font-size: 1.1rem; }
.constraints { font-family: ui-monospace, monospace; font-size: .75rem; color: #777; margin: .4rem 0 0; }
button { padding: .6rem 1.1rem; font-size: 1rem; border-radius: 8px; border: 1px solid #333; background: #fff; cursor: pointer; }
button:disabled { opacity: .4; cursor: default; }
button.stop { background: #c0392b; color: #fff; border-color: #c0392b; }
.live { display: flex; align-items: center; gap: .6rem; margin-top: .8rem; }
.bar { flex: 1; height: 10px; background: #eee; border-radius: 5px; overflow: hidden; }
.bar i { display: block; height: 100%; background: #2e7d32; }
.result { margin-top: .8rem; }
.result audio { width: 100%; }
dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: .4rem 1rem; margin: .8rem 0 0; }
dl > div { display: flex; justify-content: space-between; border-bottom: 1px dotted #ddd; padding: .15rem 0; }
dt { color: #666; font-size: .85rem; }
dd { margin: 0; font-family: ui-monospace, monospace; font-size: .85rem; }
.hero dt, .hero dd { font-weight: 700; color: #111; }
.verdict { margin-top: 1.5rem; border-top: 2px solid #111; padding-top: 1rem; }
.verdict h2 { font-size: 1.1rem; margin: 0 0 .5rem; }
.verdict p { margin: .3rem 0; }
.warn { color: #a3271c; font-weight: 600; }
.note { color: #888; font-size: .85rem; margin-top: 2rem; }
</style>
