// src/composables/useWavRecorder.js
//
// Cross-platform LOSSLESS browser capture for voice-actor pod recording.
//
// ONE capture path on every browser (Chrome/Edge/Firefox/Safari macOS+iOS/Android):
//   getUserMedia -> AudioContext -> AudioWorklet copies raw Float32 PCM to the main
//   thread -> we encode a single lossless 16-bit WAV at end-of-take.
//
// Why not MediaRecorder: it is lossy everywhere that matters (Opus/WebM on
// Chrome/FF, AAC/mp4-ONLY on iOS Safari). AudioWorklet captures the same PCM the
// engine already holds, so output is byte-identical lossless WAV on all targets —
// one format for the proven ingest (server masters once: -16 LUFS, single mp3).
//
// The DSP that wrecks a solo voice take — echoCancellation / noiseSuppression /
// autoGainControl — is requested OFF (the single biggest quality lever). These are
// only HINTS, so we read back track.getSettings() and surface what actually applied.
//
// Capture is continuous for the whole take; the consumer logs boundary sample
// offsets (tap-to-advance) and slices per line after stop(). getSampleOffset()
// returns the running sample count so a tap maps to an exact PCM position.

import { ref } from 'vue'

// Runs on the audio thread. Copies each 128-frame quantum to the main thread and
// reports its peak (for the level meter + clip light, computed off the UI thread).
const WORKLET_SRC = `
class PCMCapture extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]
    if (input && input[0]) {
      const ch = input[0]
      const copy = new Float32Array(ch.length)
      copy.set(ch)
      let peak = 0
      for (let i = 0; i < ch.length; i++) { const a = ch[i] < 0 ? -ch[i] : ch[i]; if (a > peak) peak = a }
      this.port.postMessage({ pcm: copy, peak }, [copy.buffer])
    }
    return true
  }
}
registerProcessor('pcm-capture', PCMCapture)
`

// Float32 [-1,1] PCM -> lossless 16-bit mono WAV blob (RIFF/PCM). sampleRate is the
// AudioContext's ACTUAL rate (never hardcoded). This WAV is the master that crosses
// the wire; the only lossy step is the server's single mp3 encode.
export function encodeWav(float32, sampleRate) {
  const len = float32.length
  const buf = new ArrayBuffer(44 + len * 2)
  const dv = new DataView(buf)
  const wr = (off, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i)) }
  wr(0, 'RIFF'); dv.setUint32(4, 36 + len * 2, true); wr(8, 'WAVE')
  wr(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true)   // PCM
  dv.setUint16(22, 1, true); dv.setUint32(24, sampleRate, true)            // mono
  dv.setUint32(28, sampleRate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true)
  wr(36, 'data'); dv.setUint32(40, len * 2, true)
  let p = 44
  for (let i = 0; i < len; i++) {
    let s = float32[i]; s = s < -1 ? -1 : s > 1 ? 1 : s
    dv.setInt16(p, s < 0 ? s * 0x8000 : s * 0x7fff, true); p += 2
  }
  return new Blob([dv], { type: 'audio/wav' })
}

// Zero a short window around each boundary tap so a mouse/key click (which lands in
// the gap BETWEEN lines) can never bleed into a clip. Asymmetric: a little before
// the tap (the press) and more after (the release). The server's per-clip
// trimSilence then tops-and-tails whatever silence is left at the segment edges.
export function zeroGuard(pcm, offsets, sampleRate, preMs = 40, postMs = 160) {
  const pre = Math.round(sampleRate * preMs / 1000)
  const post = Math.round(sampleRate * postMs / 1000)
  for (const t of offsets) {
    const a = Math.max(0, t - pre)
    const b = Math.min(pcm.length, t + post)
    for (let i = a; i < b; i++) pcm[i] = 0
  }
}

export function useWavRecorder() {
  const isRecording = ref(false)
  const level = ref(0)               // smoothed 0..1 for the meter
  const clipping = ref(false)
  const devices = ref([])            // [{ deviceId, label }]
  const appliedSettings = ref(null)  // { echoCancellation, noiseSuppression, autoGainControl, sampleRate }
  const error = ref(null)

  let ctx = null, stream = null, source = null, node = null, zeroGain = null
  let workletUrl = null
  let chunks = []                    // Float32Array[]
  let sampleCount = 0
  let latestPeak = 0
  let clipTimer = null
  let rafId = null
  let wakeLock = null

  function getSampleOffset() { return sampleCount }
  function getSampleRate() { return ctx ? ctx.sampleRate : 48000 }

  // Mic labels are only populated AFTER permission is granted, so call this after
  // a first start() (or it returns unlabelled). Returns audioinput devices.
  async function listDevices() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      devices.value = all
        .filter(d => d.kind === 'audioinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || 'Microphone' }))
    } catch { /* needs permission first */ }
    return devices.value
  }

  // MUST be called from a user gesture (button click) — iOS/Safari only resume
  // audio + grant the mic on direct interaction.
  async function start(deviceId = null) {
    error.value = null
    const audio = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
      sampleRate: 48000 // hint only; we read back the real rate
    }
    if (deviceId) audio.deviceId = { exact: deviceId }

    stream = await navigator.mediaDevices.getUserMedia({ audio, video: false })

    const track = stream.getAudioTracks()[0]
    const s = (track && track.getSettings) ? track.getSettings() : {}
    appliedSettings.value = {
      echoCancellation: s.echoCancellation,
      noiseSuppression: s.noiseSuppression,
      autoGainControl: s.autoGainControl,
      sampleRate: s.sampleRate
    }
    // Best effort: some Chrome builds ignore the constraint object but honour a
    // post-hoc applyConstraints.
    try {
      await track.applyConstraints({ echoCancellation: false, noiseSuppression: false, autoGainControl: false })
      const s2 = track.getSettings ? track.getSettings() : s
      appliedSettings.value = {
        echoCancellation: s2.echoCancellation, noiseSuppression: s2.noiseSuppression,
        autoGainControl: s2.autoGainControl, sampleRate: s2.sampleRate
      }
    } catch { /* constraint not re-applicable; readback above is the truth */ }

    // Do NOT force a context rate (avoids hidden resample / Firefox mismatch bug).
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') await ctx.resume()

    const blob = new Blob([WORKLET_SRC], { type: 'application/javascript' })
    workletUrl = URL.createObjectURL(blob)
    await ctx.audioWorklet.addModule(workletUrl)

    chunks = []; sampleCount = 0; latestPeak = 0
    source = ctx.createMediaStreamSource(stream)
    node = new AudioWorkletNode(ctx, 'pcm-capture')
    // Pull the graph from the destination so process() actually fires — but at zero
    // gain, so the actor never hears themselves (no feedback howl).
    zeroGain = ctx.createGain(); zeroGain.gain.value = 0

    node.port.onmessage = (e) => {
      const { pcm, peak } = e.data
      chunks.push(pcm); sampleCount += pcm.length
      latestPeak = peak
      if (peak >= 0.99) {
        clipping.value = true
        if (clipTimer) clearTimeout(clipTimer)
        clipTimer = setTimeout(() => { clipping.value = false }, 1500)
      }
    }

    source.connect(node); node.connect(zeroGain); zeroGain.connect(ctx.destination)

    isRecording.value = true
    startMeter()
    try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen') } catch { /* unsupported */ }
  }

  function startMeter() {
    const tick = () => {
      // fast-attack / slow-release so the bar reads naturally
      level.value = Math.max(latestPeak, level.value * 0.85)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  }

  // Tears down the graph + mic and returns the whole take as one Float32 PCM buffer.
  async function stop() {
    isRecording.value = false
    if (rafId) { cancelAnimationFrame(rafId); rafId = null }
    if (clipTimer) { clearTimeout(clipTimer); clipTimer = null }
    try { source && source.disconnect() } catch {}
    try { node && node.disconnect() } catch {}
    try { zeroGain && zeroGain.disconnect() } catch {}
    if (stream) stream.getTracks().forEach(t => t.stop()) // releases mic + OS indicator
    const sampleRate = ctx ? ctx.sampleRate : 48000
    try { if (ctx) await ctx.close() } catch {}
    if (workletUrl) { URL.revokeObjectURL(workletUrl); workletUrl = null }
    if (wakeLock) { try { await wakeLock.release() } catch {}; wakeLock = null }

    let total = 0; for (const c of chunks) total += c.length
    const pcm = new Float32Array(total)
    let o = 0; for (const c of chunks) { pcm.set(c, o); o += c.length }
    chunks = []
    ctx = null; source = null; node = null; zeroGain = null
    level.value = 0; clipping.value = false; latestPeak = 0
    return { pcm, sampleRate, totalSamples: total }
  }

  return {
    isRecording, level, clipping, devices, appliedSettings, error,
    listDevices, start, stop, getSampleOffset, getSampleRate
  }
}
