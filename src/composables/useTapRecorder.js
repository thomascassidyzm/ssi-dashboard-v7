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
//
// These are the LOUD-MIC end of the scale, and they are absolute numbers on a
// signal whose gain we deliberately do not control: autoGainControl is off, so
// how high a real read peaks depends entirely on the device and how far away
// the mouth is. A phone held at arm's length peaks well under 0.06 while
// reading perfectly audibly, and every syllable of it then sits below
// SPEECH_PEAK — the line is judged to have had nothing said on it, and the
// audio, which exists and is fine, is thrown away.
//
// So SPEECH_PEAK is now a CEILING rather than the test, and the test itself is
// not an absolute amplitude at all. It cannot be. Tom, 2026-08-22, watching the
// bar while reading: "a very, very small but definite signal" — the audio is
// arriving, at a level any fixed floor picked in advance sits above. Kai hit the
// same thing the day before and worked around it by turning the input up.
//
// What separates a read from a silent room is not how loud the read is; it is
// how far the read rises ABOVE THAT ROOM. That number is stable across a mic
// running at -60dBFS and one running at -12, and it is the only thing here that
// is. So the floor is now measured, not chosen: it sits a fixed number of dB
// over this room's own tracked noise, held under the loudest thing the session
// has actually heard, and capped at the old absolute threshold so a hot mic
// behaves precisely as it always did.
//
// There is deliberately NO lower bound on it beyond "not exactly zero". A floor
// with a bottom is a floor that can sit over a real voice, which is the whole
// defect. If the room is silent enough that a whisper clears it, the whisper is
// speech.
const FLOOR_PEAK = 0.02
const SPEECH_PEAK = 0.06
// Speech has to clear the room by this much: ~12dB. Room tone, breath and
// handling noise do not do that; the quietest deliberate read does.
const NOISE_SPEECH_MULT = 4
// The room is never allowed to claim it is louder than this fraction of the
// loudest thing the session has heard. Without it, a mic that opens mid-word
// seeds its room estimate at speech level and then gates the voice that seeded
// it. Note 0.25 x 4 = 1 exactly, and that is the point: a perfectly flat signal
// lands precisely ON the floor and is never speech, at any amplitude. Speech
// has peaks above its own troughs; a tone does not.
const NOISE_CEIL_RATIO = 0.25
// Below this there is no signal, only the noise of the number itself (~-80dBFS).
// This is not a speech threshold — it is the difference between a live graph and
// a dead one, and nothing else may live under it.
const EPSILON_PEAK = 0.0001
// Quiet sits a third of the way under the speech floor, in the same currency,
// so a quiet mic does not read as permanently silent and auto-advance off the
// line the moment it opens.
const QUIET_PEAK_RATIO = 0.33
// How fast the tracked room tone follows the input. It drops to a new quiet
// quickly and rises out of one very slowly, so that a long read cannot pull the
// room estimate up behind it and gate its own second half.
const NOISE_FALL = 0.1
const NOISE_RISE = 0.0006

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
  // Is the meter actually delivering samples? The meter is built best-effort
  // and documented as optional — "even a dead meter never costs us audio" — and
  // that stopped being true the moment lineHasSpeech became what decides
  // whether a take is saved. A meter that reads nothing then refuses every
  // take on a session where the microphone was working perfectly.
  //
  // A dead graph reads EXACTLY zero on every sample, forever: an AudioContext
  // that never left suspended, an iOS MediaStreamAudioSourceNode that silently
  // produces silence, a constructor that threw. A live graph on a silent mic
  // does not — converter dither alone puts something in the low 1e-4s. So one
  // frame with any non-zero sample in it is proof the meter is real, and until
  // we have seen one, the meter gets no vote on anything irreversible.
  const meterTrusted = ref(false)
  // The raw numbers behind the bar, exposed so the surface can show them. A bar
  // that is "barely moving" and a bar that is "not moving" look identical on a
  // phone and mean completely different things; printing the dB ends that.
  const inputPeak = ref(0)
  const roomTone = ref(0)
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
  // The loudest peak this session has heard. The speech and quiet floors are
  // both derived from it, so a quiet mic gets a quiet scale.
  let sessionPeak = 0
  // This room's tracked noise tone, in the same units. Seeded by the first frame
  // and then followed asymmetrically — see NOISE_FALL / NOISE_RISE.
  let noiseEst = 0
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
    sessionPeak = 0
    noiseEst = 0
    meterTrusted.value = false
    inputPeak.value = 0
    roomTone.value = 0

    try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen') } catch { /* unsupported */ }
  }

  function startMeter() {
    const tick = () => {
      if (analyser) {
        analyser.getFloatTimeDomainData(meterBuf)
        let p = 0
        for (let i = 0; i < meterBuf.length; i++) { const a = Math.abs(meterBuf[i]); if (a > p) p = a }
        peak = p
        // One non-zero sample is all it takes: the graph is delivering, and the
        // meter may from now on be believed about what it did and did not hear.
        if (p > 0) meterTrusted.value = true
        if (p > sessionPeak) sessionPeak = p
        // Track the room. Seeded by the first frame that carries anything, so
        // that a mic which opens mid-sentence still converges downward onto the
        // room rather than sitting at zero and calling everything speech.
        if (noiseEst === 0) noiseEst = p
        else if (p < noiseEst) noiseEst += (p - noiseEst) * NOISE_FALL
        else noiseEst += (p - noiseEst) * NOISE_RISE
        inputPeak.value = p
        roomTone.value = noiseEst
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
  // The peak a syllable has to clear to count as speech, on this microphone, at
  // this distance, in this room. Measured, not chosen: a fixed rise over the
  // tracked room tone, never more than a real drop under the loudest thing the
  // session has heard, capped at the old absolute threshold for a hot mic, and
  // floored only at "not exactly zero".
  function speechFloor() {
    const room = sessionPeak > 0
      ? Math.min(noiseEst, sessionPeak * NOISE_CEIL_RATIO)
      : noiseEst
    return Math.max(EPSILON_PEAK, Math.min(SPEECH_PEAK, room * NOISE_SPEECH_MULT))
  }
  // The peak the room has to fall under to count as quiet, in the same currency.
  function quietFloor() {
    return Math.min(FLOOR_PEAK, speechFloor() * QUIET_PEAK_RATIO)
  }

  function onMeterFrame(p) {
    const t = now()
    if (p > quietFloor()) lastQuietSince = t
    if (p > speechFloor() && isRecording.value) lineHasSpeech.value = true

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
        if (peak <= quietFloor()) { heardSilence = true; return }
        // Silence, and then sound again: the next line has begun. Close this
        // clip now rather than let its tail eat the next line's first word.
        if (heardSilence && peak > speechFloor()) finish()
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
    sessionPeak = 0; peak = 0; noiseEst = 0
    meterTrusted.value = false
    inputPeak.value = 0; roomTone.value = 0
  }

  return {
    isRecording, level, clipping, devices, appliedSettings, error,
    lineHasSpeech, quietMs, meterTrusted, inputPeak, roomTone,
    listDevices, start, beginLine, endLine, discardLine, stop,
  }
}
