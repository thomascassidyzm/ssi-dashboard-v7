// src/composables/useTapRecorder.js
//
// Reliable per-line browser capture for pod recording.
//
// Uses MediaRecorder (the battle-tested capture API — what the old dialogue studio
// used) rather than an AudioWorklet PCM path, which proved flaky in the field
// (it captured almost nothing → empty clips). The mic's own DSP (echo-cancel /
// noise-suppress / auto-gain) is requested OFF — the single biggest quality
// lever — so we capture the dry voice and let the server be the only processing
// stage.
//
// THE CAPTURE BOUNDARY NEVER CUTS THE UTTERANCE (Tom's ruling, 2026-08-21).
//
// This used to be one MediaRecorder PER LINE: beginLine() constructed one and
// called start() at the instant the recordist tapped Next, endLine() called
// stop() at the instant they tapped it again. Both edges of every clip were
// therefore an irreversible cut made at record time, and both of them landed
// inside the speech:
//
//   HEAD — MediaRecorder does not begin capturing when start() returns. The
//   encoder spins up, the first buffer is filled and only then does audio start
//   arriving. Nothing before that exists anywhere, in any file, ever. The
//   recordist taps Next and starts reading; whatever they said in that window
//   is gone. It is intermittent because it depends entirely on how fast they
//   start reading after the tap — which is exactly the description Tom gave.
//
//   TAIL — stop() lands on the tap. Tap a beat early, or tap on the final
//   syllable because the line is finished in your head before it is finished in
//   your mouth, and the last phoneme is cut.
//
// Repair tooling is abolished: you fix this by removing the bad step, not by
// patching audio afterwards. So the recorder now RECORDS MORE CONTENT AROUND
// THE SIGNAL and leaves every boundary decision to the processing step, where
// the raw original is archived first (raw/{UUID}.{ext}) and a trim is therefore
// reversible.
//
// How the margins are made, without ever leaving a gap in the capture:
//
//   * A recorder is ALWAYS running while the mic is open — from start(), before
//     the first line is even shown, and continuously thereafter.
//   * At a line boundary the NEW recorder is started BEFORE the old one is
//     stopped. Two MediaRecorders on one stream overlap for the tail window, so
//     there is no instant at which nothing is capturing. That overlap IS the
//     next line's pre-roll: the encoder for line N+1 has been warm and writing
//     audio since before the recordist even looked at line N+1.
//   * The old recorder keeps running for TAIL_MS after the boundary, so the
//     clip carries a generous tail whatever the tap timing was. It is stopped
//     EARLY only once we have heard real silence and then the next utterance
//     beginning — so a tail can never swallow the start of the next line.
//   * While a line sits silent (the recordist reading ahead, or away), the
//     pre-roll is rolled over rather than left to grow without bound: a fresh
//     recorder is started, allowed to overlap for well longer than the silence
//     we judged on, and only then is the stale one dropped. So the active
//     recorder always holds between PRE_ROLL_MIN_MS and ~PRE_ROLL_MAX_MS of
//     audio ahead of the first word, and a twenty-second pause does not ship a
//     twenty-second clip.
//
// Nothing here trims, gates or discards on level. The level meter is used ONLY
// to decide WHEN to hand over between recorders and when the line is over — and
// every one of those decisions is protected by an overlap, so a wrong reading
// costs a slightly longer clip, never a lost syllable.
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

// How long the old recorder keeps running past a line boundary. Generous on
// purpose: this is the margin that stops a tap landing on the last syllable.
export const TAIL_MS = 900
// The overlap a freshly started recorder is guaranteed before the one it is
// replacing is dropped. Also the floor on how much pre-roll any clip has.
export const PRE_ROLL_MIN_MS = 800
// Once the active recorder holds this much audio with nothing said on this line
// yet, roll it over so clips do not accumulate dead air without bound.
export const PRE_ROLL_MAX_MS = 2500
// The active recorder is only rolled if the room has been continuously below
// the speech floor for this long. Shorter than the overlap above, deliberately:
// even a wrong call here is covered by audio the new recorder already holds.
export const ROLL_QUIET_MS = 1000

// Peak-level bars, on the raw meter peak (DSP is off, so these are the dry
// signal). Only ever used for timing decisions, never to gate audio.
const FLOOR_PEAK = 0.02
const SPEECH_PEAK = 0.06

export function useTapRecorder() {
  const isRecording = ref(false) // a line is actively capturing
  const level = ref(0)
  const clipping = ref(false)
  const devices = ref([])
  const appliedSettings = ref(null)
  const error = ref(null)
  // Has the recordist actually said anything on the line now open? The surface
  // uses this to know a take exists before it advances, and commit() uses it
  // instead of a blob-size test — with pre-roll and tail on every clip, "small
  // blob" no longer means "silence".
  const lineHasSpeech = ref(false)
  // Below the floor for this long, having already spoken on this line. This is
  // what drives auto-advance in the surface; it is NOT what ends the capture.
  const quietMs = ref(0)

  let stream = null
  let mime = ''
  // The recorder capturing right now. There is always one while the mic is open.
  let active = null            // { rec, chunks, startedAt }
  // Recorders that have been handed over from and are running out their tail.
  let retiring = []
  let meterCtx = null, analyser = null, meterBuf = null, rafId = null
  let clipTimer = null
  let wakeLock = null
  // Instantaneous peak from the most recent meter frame — the decayed `level`
  // is for the eye, this is for the timing decisions.
  let peak = 0
  let lastQuietSince = 0
  let lineOpenedAt = 0

  async function listDevices() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      devices.value = all.filter(d => d.kind === 'audioinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || 'Microphone' }))
    } catch { /* needs permission first */ }
    return devices.value
  }

  function now() { return Date.now() }

  // Construct and start a recorder on the live stream. Its chunks accumulate
  // until something asks for them.
  function spawnRecorder() {
    const chunks = []
    const rec = mime
      ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 256000 })
      : new MediaRecorder(stream)
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
    rec.start()
    return { rec, chunks, startedAt: now() }
  }

  // Stop a recorder and resolve the blob it captured (null if it captured
  // nothing). Never throws: a recorder that has already died must not take the
  // session with it.
  function harvest(entry) {
    // Memoised on the entry: the tail watcher and a teardown can both reach for
    // the same recorder, and a second stop() would replace the onstop handler
    // the first one is waiting on — leaving that take's promise unresolved and
    // the line silently unsaved.
    if (entry && entry.harvested) return entry.harvested
    const p = new Promise((resolve) => {
      if (!entry || !entry.rec || entry.rec.state === 'inactive') {
        resolve(entry && entry.chunks.length
          ? new Blob(entry.chunks, { type: entry.chunks[0].type || mime || 'audio/webm' })
          : null)
        return
      }
      entry.rec.onstop = () => {
        const type = (entry.chunks[0] && entry.chunks[0].type) || mime || 'audio/webm'
        resolve(entry.chunks.length ? new Blob(entry.chunks, { type }) : null)
      }
      try { entry.rec.stop() } catch { resolve(null) }
    })
    if (entry) entry.harvested = p
    return p
  }

  // Hand over to a fresh recorder and return the one that was active, still
  // running. The new one is live BEFORE the old one is touched, so the stream is
  // never unobserved.
  function handOver() {
    const outgoing = active
    active = spawnRecorder()
    return outgoing
  }

  // Acquire the mic (DSP off) + start the meter + start capturing. Call from a
  // user gesture. Capture begins HERE, not at the first line: the pre-roll for
  // line one is the whole gap between tapping Start and the first word.
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

    lastQuietSince = now()
    active = spawnRecorder()

    try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen') } catch { /* unsupported */ }
  }

  function startMeter() {
    const tick = () => {
      if (analyser) {
        analyser.getFloatTimeDomainData(meterBuf)
        let p = 0
        for (let i = 0; i < meterBuf.length; i++) { const a = Math.abs(meterBuf[i]); if (a > p) p = a }
        peak = p
        level.value = Math.max(p, level.value * 0.85)
        if (p >= 0.99) {
          clipping.value = true
          if (clipTimer) clearTimeout(clipTimer)
          clipTimer = setTimeout(() => { clipping.value = false }, 1500)
        }
        onMeterFrame(p)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  }

  // Everything time-based hangs off the meter frame: whether the line has had
  // speech on it, how long it has been quiet since, and whether the pre-roll
  // should be rolled over.
  function onMeterFrame(p) {
    const t = now()
    if (p > FLOOR_PEAK) lastQuietSince = t
    if (p > SPEECH_PEAK && isRecording.value) lineHasSpeech.value = true

    quietMs.value = lineHasSpeech.value ? t - lastQuietSince : 0

    // Roll the pre-roll over, but only while nothing has been said on this line
    // and the room has genuinely been quiet for a while. The outgoing recorder
    // is retired through the same tail path as a line boundary, so it keeps
    // running for the full overlap before it is dropped.
    if (
      active &&
      !lineHasSpeech.value &&
      t - active.startedAt > PRE_ROLL_MAX_MS &&
      t - lastQuietSince > ROLL_QUIET_MS
    ) {
      const stale = handOver()
      // Discarded, not returned — this is dead air ahead of a line that has not
      // started. It is dropped only after PRE_ROLL_MIN_MS of overlap, so the
      // audio it holds is also held by the recorder that replaced it.
      setTimeout(() => { harvest(stale) }, PRE_ROLL_MIN_MS)
    }
  }

  // Mark the start of a line. Does NOT touch the recorder — capture is already
  // running and has been since before this line was on screen.
  function beginLine() {
    if (!stream) throw new Error('recorder not started')
    if (!active) active = spawnRecorder()
    lineHasSpeech.value = false
    quietMs.value = 0
    lineOpenedAt = now()
    lastQuietSince = now()
    isRecording.value = true
  }

  // Close the current line and resolve its blob.
  //
  // Returns immediately-created promise, but the promise itself does not settle
  // until the tail has been recorded — TAIL_MS, or sooner once we have heard
  // silence and then the next utterance start. The caller is meant to advance
  // the UI straight away and commit the blob when it lands; waiting on this
  // would make Next feel laggy for no benefit.
  function endLine() {
    isRecording.value = false
    if (!active) return Promise.resolve(null)
    const outgoing = handOver()
    retiring.push(outgoing)
    return new Promise((resolve) => {
      const openedAt = now()
      let heardSilence = false
      let done = false
      const finish = async () => {
        if (done) return
        done = true
        clearInterval(watcher)
        retiring = retiring.filter(r => r !== outgoing)
        resolve(await harvest(outgoing))
      }
      const watcher = setInterval(() => {
        const elapsed = now() - openedAt
        if (elapsed >= TAIL_MS) { finish(); return }
        if (peak <= FLOOR_PEAK) { heardSilence = true; return }
        // Silence, and then sound again: the next line has begun. Close this
        // clip now rather than let its tail eat the next line's first word.
        if (heardSilence && peak > SPEECH_PEAK) finish()
      }, 50)
    })
  }

  // Close the current line and throw the audio away (re-read). The replacement
  // recorder is already live, so the re-read has its pre-roll too.
  function discardLine() {
    isRecording.value = false
    if (!active) return Promise.resolve()
    const outgoing = handOver()
    lineHasSpeech.value = false
    quietMs.value = 0
    return harvest(outgoing).then(() => {})
  }

  // Tear everything down.
  async function stop() {
    isRecording.value = false
    lineHasSpeech.value = false
    quietMs.value = 0
    const all = [active, ...retiring].filter(Boolean)
    active = null
    retiring = []
    for (const entry of all) { try { await harvest(entry) } catch { /* already gone */ } }
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
    lineHasSpeech, quietMs,
    listDevices, start, beginLine, endLine, discardLine, stop,
  }
}
