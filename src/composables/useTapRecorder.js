// src/composables/useTapRecorder.js
//
// Reliable per-line browser capture for tap-to-advance pod recording.
//
// Uses MediaRecorder (the battle-tested capture API — what the old dialogue studio
// used) rather than an AudioWorklet PCM path, which proved flaky in the field
// (it captured almost nothing → empty clips). Each line is its OWN MediaRecorder
// take: beginLine() starts capture, endLine() stops and returns that line's blob.
// The blob goes straight to the proven per-line upload route, which transcodes +
// masters to -16 LUFS. The mic's own DSP (echo-cancel / noise-suppress / auto-gain)
// is still requested OFF — the single biggest quality lever — so we capture the
// dry voice and let the server be the only processing stage.
//
// A live level + clip meter runs off a separate AnalyserNode (cosmetic; capture is
// independent of it, so a quiet meter never means lost audio).

import { ref } from 'vue'

function pickMime() {
  const opts = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2', // Safari/iOS (AAC)
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ]
  if (typeof MediaRecorder === 'undefined') return ''
  for (const m of opts) {
    try { if (MediaRecorder.isTypeSupported(m)) return m } catch { /* ignore */ }
  }
  return ''
}

export function useTapRecorder() {
  const isRecording = ref(false) // a line is actively capturing
  const level = ref(0)
  const clipping = ref(false)
  const devices = ref([])
  const appliedSettings = ref(null)
  const error = ref(null)

  let stream = null
  let mime = ''
  let mr = null
  let recChunks = []
  let meterCtx = null, analyser = null, meterBuf = null, rafId = null
  let clipTimer = null
  let wakeLock = null

  async function listDevices() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      devices.value = all.filter(d => d.kind === 'audioinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || 'Microphone' }))
    } catch { /* needs permission first */ }
    return devices.value
  }

  // Acquire the mic (DSP off) + start the meter. Call from a user gesture.
  async function start(deviceId = null) {
    error.value = null
    const audio = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
      sampleRate: 48000,
    }
    if (deviceId) audio.deviceId = { exact: deviceId }
    stream = await navigator.mediaDevices.getUserMedia({ audio, video: false })

    const track = stream.getAudioTracks()[0]
    try {
      await track.applyConstraints({ echoCancellation: false, noiseSuppression: false, autoGainControl: false })
    } catch { /* hints only */ }
    const s = track && track.getSettings ? track.getSettings() : {}
    appliedSettings.value = {
      echoCancellation: s.echoCancellation, noiseSuppression: s.noiseSuppression,
      autoGainControl: s.autoGainControl, sampleRate: s.sampleRate,
    }

    mime = pickMime()

    // Meter: source -> analyser (no destination, so no feedback). Independent of
    // capture, so even a dead meter never costs us audio.
    try {
      meterCtx = new (window.AudioContext || window.webkitAudioContext)()
      if (meterCtx.state === 'suspended') await meterCtx.resume()
      const src = meterCtx.createMediaStreamSource(stream)
      analyser = meterCtx.createAnalyser()
      analyser.fftSize = 1024
      meterBuf = new Float32Array(analyser.fftSize)
      src.connect(analyser)
      startMeter()
    } catch { /* meter is optional */ }

    try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen') } catch { /* unsupported */ }
  }

  function startMeter() {
    const tick = () => {
      if (analyser) {
        analyser.getFloatTimeDomainData(meterBuf)
        let peak = 0
        for (let i = 0; i < meterBuf.length; i++) { const a = Math.abs(meterBuf[i]); if (a > peak) peak = a }
        level.value = Math.max(peak, level.value * 0.85)
        if (peak >= 0.99) {
          clipping.value = true
          if (clipTimer) clearTimeout(clipTimer)
          clipTimer = setTimeout(() => { clipping.value = false }, 1500)
        }
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  }

  // Start capturing the current line.
  function beginLine() {
    if (!stream) throw new Error('recorder not started')
    recChunks = []
    mr = mime ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 256000 })
              : new MediaRecorder(stream)
    mr.ondataavailable = (e) => { if (e.data && e.data.size) recChunks.push(e.data) }
    mr.start()
    isRecording.value = true
  }

  // Stop the current line and resolve its blob (null if nothing captured).
  function endLine() {
    return new Promise((resolve) => {
      const rec = mr
      if (!rec || rec.state === 'inactive') { isRecording.value = false; return resolve(null) }
      rec.onstop = () => {
        const type = (recChunks[0] && recChunks[0].type) || mime || 'audio/webm'
        const blob = recChunks.length ? new Blob(recChunks, { type }) : null
        recChunks = []; mr = null; isRecording.value = false
        resolve(blob)
      }
      try { rec.stop() } catch { isRecording.value = false; resolve(null) }
    })
  }

  // Stop the current line and throw the audio away (re-read).
  function discardLine() {
    return new Promise((resolve) => {
      const rec = mr
      if (!rec || rec.state === 'inactive') { isRecording.value = false; return resolve() }
      rec.onstop = () => { recChunks = []; mr = null; isRecording.value = false; resolve() }
      try { rec.stop() } catch { isRecording.value = false; resolve() }
    })
  }

  // Tear everything down.
  async function stop() {
    isRecording.value = false
    if (mr && mr.state !== 'inactive') { try { mr.stop() } catch {} }
    mr = null; recChunks = []
    if (rafId) { cancelAnimationFrame(rafId); rafId = null }
    if (clipTimer) { clearTimeout(clipTimer); clipTimer = null }
    if (stream) stream.getTracks().forEach(t => t.stop())
    try { if (meterCtx) await meterCtx.close() } catch {}
    if (wakeLock) { try { await wakeLock.release() } catch {}; wakeLock = null }
    stream = null; meterCtx = null; analyser = null; meterBuf = null
    level.value = 0; clipping.value = false
  }

  return {
    isRecording, level, clipping, devices, appliedSettings, error,
    listDevices, start, beginLine, endLine, discardLine, stop,
  }
}
