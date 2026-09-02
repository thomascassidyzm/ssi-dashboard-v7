// src/composables/useTapRecorder.js
//
// Reliable per-line browser capture for pod recording.
//
// Uses MediaRecorder (the battle-tested capture API — what the old dialogue studio
// used) rather than an AudioWorklet PCM path, which proved flaky in the field
// (it captured almost nothing → empty clips).
//
// THE MIC'S OWN DSP IS ON (Tom, 2026-08-22: "nowhere near an iPhone voice note").
//
// It used to be off — all three of echoCancellation, noiseSuppression and
// autoGainControl requested false, on the reasoning that a dry capture is the
// single biggest quality lever and the server should be the only processing
// stage. On iOS that reasoning bought the opposite of what it wanted, because
// of one fact about WebKit: `echoCancellation` is not a filter you switch, it
// is the flag that PICKS THE AUDIO UNIT. false selects RemoteIO, the bare
// hardware tap; true selects VoiceProcessingIO, Apple's voice chain. And Apple
// puts the gain staging inside that chain along with the echo cancel and the
// noise suppression. There is no partial mode, and there is no other route to
// it — `autoGainControl` is unimplemented in WebKit entirely (bug 204444, open
// since 2019), so requesting it changes nothing at all.
//
// So "DSP off" on an iPhone did not mean a clean dry voice. It meant a raw tap
// with no gain, recording a room at reading distance tens of dB below where the
// AAC encoder does its best work, which the server then lifted back up — room,
// codec noise and all — with loudnorm. That is what Tom heard.
//
// A voice note effectively gets the voice-processed chain. So do we now. The
// server-side normalise stays exactly where it is: it is a safety net for what
// arrives, not the gain stage.
//
// Nothing downstream wanted the dry stream. It was never a pipeline
// requirement — it entered on 2026-06-15 (e6ea5a8cc, useWavRecorder.js) as a
// general opinion, "the DSP that wrecks a solo voice take", and was carried
// forward unexamined. Everything past the upload reads the mastered -16 LUFS
// MP3, by which point the capture chain is unrecoverable anyway; the splice
// path has never fired on a human take; and the other half of this same
// recording room (useContinuousRecorder.ts, script mode) has been capturing
// with the full Apple voice bundle into the identical upload endpoint all
// along, with nothing broken by it.
//
// The dry profile is kept, selectable, and A/B-able against this one on the
// actual device (src/views/admin/CaptureAB.vue) — because the only place the
// answer to "which of these sounds better on an iPhone" exists is an iPhone.
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
//   * A STANDBY recorder runs through the quiet alongside the active one, and a
//     line boundary PROMOTES it rather than constructing a new one. That is what
//     makes the next line's pre-roll real: the promoted recorder has been
//     writing audio since the last thing anybody said, so the clip begins with
//     the room rather than with the word. A recorder constructed at the boundary
//     holds nothing at the boundary, which is what used to make a re-read — where
//     the recordist does not stop to read the line again — come back snipped
//     flush against its first syllable while first takes came back clean.
//   * The standby is thrown away and respawned on the first quiet frame after
//     any speech, so a promoted recorder can never carry the previous read into
//     the next clip. If there is no clean standby (no trusted meter, or the room
//     talking right up to the boundary) a fresh recorder is made, exactly as
//     before: never worse, usually much better.
//   * The old recorder is never left unobserved: its successor has been running
//     since long before it was retired.
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

// The two ways this recorder can ask for a microphone. Named, because the
// difference is not three booleans — on iOS it is which audio unit Safari
// builds, and everything about the resulting signal follows from that.
export const CAPTURE_PROFILES = {
  // Apple's voice chain (VoiceProcessingIO): echo cancel, noise suppression,
  // and the gain staging that makes a phone at reading distance land at a
  // usable level. What a voice note effectively gets.
  voice: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  // The bare hardware tap (RemoteIO). No processing — and on iOS, no gain.
  dry: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
}
export const DEFAULT_CAPTURE_PROFILE = 'voice'

// Bitrate for the per-line encoder. Well above transparent for one mono voice
// in either codec; the encoder was never the thing costing us quality, the
// level going into it was.
export const CAPTURE_BITRATE = 256000

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

// THE COLD START HAS NO STANDBY TO PROMOTE.
//
// #104 fixed every boundary INSIDE a session by keeping a standby recorder
// running through the quiet and promoting it at Next/Again/Back, so the
// recorder taking over already holds room tone. The first line of a session
// cannot be fixed that way: the mic has only just been granted, there is no
// prior quiet to have captured, and the recorder is exactly as old as the tap
// that opened it. So the first take of a session was the one clip in the whole
// day guaranteed to hand the trim nothing.
//
// The fix is not audio, it is ORDER. The recorder opens first, the line stays
// hidden while it fills, and the reveal of the line is the go signal. By the
// time the recordist has read the words and drawn breath, the recorder is
// already at least this old and holds real room tone.
//
// The number is not a new one and is deliberately not a guess: it is
// PRE_ROLL_MIN_MS, the floor this recorder already guarantees at every other
// boundary. It covers what the trim asks for (TRIM_MARGIN_SEC = 0.35s in
// services/audio-processor.cjs) with 450ms of headroom for the encoder's own
// spin-up — MediaRecorder.start() returns before audio arrives — and it sits
// far above the upload gate's 100ms floor (minTakeMs, recording-upload-helpers).
// Matching the steady-state floor also means the first clip of a session and
// the two-hundredth are trimmed from the same amount of room, which is the
// property the forensics wanted and never had.
export const COLD_START_SETTLE_MS = PRE_ROLL_MIN_MS

// Peak-level bars, on the raw meter peak. Only ever used for timing decisions,
// never to gate audio.
//
// These are the LOUD-MIC end of the scale, and they are absolute numbers on a
// signal whose gain we do not control. (This paragraph was written under the
// old dry default, when autoGainControl was off. The default is the voice
// profile now — but the conclusion is unchanged and the numbers below did not
// need retuning, because nothing here is an absolute test: the floor is
// measured against this room's own noise, which is what makes it hold across a
// mic at -60dBFS and a mic at -12.) How high a real read peaks depends entirely
// on the device, the profile it was asked for, and how far away the mouth is. A phone held at arm's length peaks well under 0.06 while
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
// line the moment it opens. This is the FLOOR under the quiet threshold now,
// not the threshold itself — see roomCeil below.
const QUIET_PEAK_RATIO = 0.33
// How fast the tracked room tone follows the input. It drops to a new quiet
// quickly and rises out of one very slowly, so that a long read cannot pull the
// room estimate up behind it and gate its own second half.
const NOISE_FALL = 0.1
const NOISE_RISE = 0.0006

// THE ROOM'S UPPER EDGE, WHICH IS WHAT "QUIET" HAS TO CLEAR (Aran, 2026-08-23:
// auto-advance "only seems to work about half the time").
//
// `noiseEst` above falls fast and rises glacially. That asymmetry is exactly
// right for the SPEECH floor — it makes the floor chase the quietest thing in
// the room, so nothing a person says can ever be gated by it. But it means
// noiseEst converges on the room's TROUGHS, not on the room. A real room's
// frame peaks wander over 6-10dB; noiseEst settles near the bottom of that
// range, and the old quiet threshold, at noiseEst x 4 x 0.33 = x1.32, sat about
// 2.4dB over it. The room's own ordinary frames are louder than that. Each one
// reset the quiet timer, so `quietMs` never got past a frame or two and the
// line waited for a tap — intermittently, depending on how far that line's read
// had dragged noiseEst down and how the room happened to be behaving.
//
// So the quiet decision gets its own estimate, tracking the OTHER edge of the
// same distribution: how loud this room gets when nobody is speaking. It is fed
// only by frames that are not speech, so a read cannot drag it up; it rises
// quickly so a session learns its room in a fraction of a second; and it falls
// slowly, so the silences BETWEEN a read's syllables cannot pull it under the
// room during the very line it is about to judge. It is held under the same
// sessionPeak ceiling as noiseEst, so a mic that opens mid-word cannot seed it
// at speech level.
const ROOM_CEIL_RISE = 0.25
const ROOM_CEIL_FALL = 0.002
// Quiet has to sit clear of the room's upper edge by this much (~4dB) — enough
// that ordinary room-tone wander does not keep restarting the timer, and still
// well under the ~12dB that makes something speech.
const QUIET_ROOM_MULT = 1.6

export function useTapRecorder() {
  const isRecording = ref(false) // a line is actively capturing
  const level = ref(0)
  const clipping = ref(false)
  const devices = ref([])
  const appliedSettings = ref(null)
  // Which capture profile this session actually asked for. Surfaced so the
  // room can say it out loud — "voice-processed" and "dry" produce audio that
  // sounds different enough that nobody should have to guess which they got.
  const profile = ref(DEFAULT_CAPTURE_PROFILE)
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
  // The loud edge of that same room: how high a frame gets when nobody is
  // speaking. Followed the opposite way round — see ROOM_CEIL_RISE / FALL.
  let roomCeil = 0
  // Instantaneous peak from the most recent meter frame — the decayed `level`
  // is for the eye, this is for the timing decisions.
  let peak = 0
  let lastQuietSince = 0
  let lineOpenedAt = 0
  // The warm recorder waiting to be promoted at the next boundary, and whether
  // it has heard anything since it was spawned. A dirty standby is never
  // promoted — it would carry the previous read into the next clip.
  let standby = null
  let standbyDirty = false

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
      ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: CAPTURE_BITRATE })
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

  // Hand over and return the one that was active, still running. The
  // replacement is live BEFORE the old one is touched, so the stream is never
  // unobserved.
  //
  // A FRESH RECORDER HAS NO PRE-ROLL. THAT WAS THE WHOLE DEFECT.
  //
  // This used to be `active = spawnRecorder()` and nothing else, and the
  // comments around it claimed the replacement carried pre-roll because it was
  // "already live". Live is not the same as full. A MediaRecorder constructed
  // at the instant of a boundary holds ZERO audio at that instant, so the only
  // lead-in the next clip ever got was however long the recordist happened to
  // hesitate before speaking. Measured on Tom's 34 zzz takes of 2026-09-02
  // (docs/audio-forensics-2026-09-02/): 30 clips got the trim's full 350ms
  // margin because he spent 1.2-3.0s reading the line first, and 4 did not —
  // one with 0ms of lead, two with ~292ms, one where the read filled the whole
  // take. Every one of those four is a take that began within a few hundred ms
  // of a hand-over. The trim was identical on all 34; the capture is what was
  // short, exactly as the block at audio-processor.cjs:1370 says it would be.
  //
  // A re-read is that case every time. `discardLine()` hands over and the
  // caller opens the line in the same tick, and a recordist re-reading a line
  // they have just read does not stop to read it again — so the re-take's
  // recorder is reliably near-empty at the first word, where a first take's is
  // reliably seconds full. Same code, opposite outcomes.
  //
  // So the replacement is no longer made at the boundary. A STANDBY recorder is
  // kept running through the quiet, and the boundary PROMOTES it — it arrives
  // already holding the room tone recorded since the last thing anybody said,
  // which is precisely the lead-in the trim wants and cannot invent. The
  // standby is discarded and respawned the moment it hears speech, so a
  // promoted recorder can never carry the previous read into the next clip.
  //
  // When there is no clean standby to promote — no trusted meter, or the room
  // has been talking right up to the boundary — this falls back to exactly what
  // it did before. Never worse than a fresh recorder; usually much better.
  function handOver() {
    const outgoing = active
    if (standby && !standbyDirty && meterTrusted.value) {
      active = standby
      standby = null
    } else {
      active = spawnRecorder()
    }
    return outgoing
  }

  // Acquire the mic + start the meter + start capturing. Call from a user
  // gesture. Capture begins HERE, not at the first line: the pre-roll for line
  // one is the whole gap between tapping Start and the first word.
  async function start(deviceId = null, profileName = DEFAULT_CAPTURE_PROFILE) {
    error.value = null
    const dsp = CAPTURE_PROFILES[profileName] || CAPTURE_PROFILES[DEFAULT_CAPTURE_PROFILE]
    profile.value = CAPTURE_PROFILES[profileName] ? profileName : DEFAULT_CAPTURE_PROFILE
    const audio = {
      ...dsp,
      channelCount: 1,
      sampleRate: 48000,
    }
    if (deviceId) audio.deviceId = { exact: deviceId }
    stream = await navigator.mediaDevices.getUserMedia({ audio, video: false })

    const track = stream.getAudioTracks()[0]
    // Re-asserted rather than left to the getUserMedia call alone: on WebKit
    // echoCancellation is a real, handled constraint that rebuilds the audio
    // unit, so it must say the same thing here as it did above. It always
    // does — both come from the one profile — and that is the point of this
    // call now: it can no longer contradict the acquisition.
    try {
      await track.applyConstraints({ ...dsp })
    } catch { /* hints only */ }
    const s = track && track.getSettings ? track.getSettings() : {}
    appliedSettings.value = {
      profile: profile.value,
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
    roomCeil = 0
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
        // And the room's loud edge, from non-speech frames only. Capped at the
        // same fraction of sessionPeak as noiseEst, so it can never claim the
        // room is as loud as the loudest thing the session has heard.
        if (p <= speechFloor()) {
          const capped = sessionPeak > 0 ? Math.min(p, sessionPeak * NOISE_CEIL_RATIO) : p
          if (roomCeil === 0) roomCeil = capped
          else roomCeil += (capped - roomCeil) * (capped > roomCeil ? ROOM_CEIL_RISE : ROOM_CEIL_FALL)
        }
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
  //
  // Clear of this room's own upper edge, never under the old third-of-the-speech
  // -floor value, and never ABOVE the speech floor — the two have to agree about
  // what a given frame is, or a frame could be speech and silence at once and
  // the studio could advance out from under a voice it can still hear.
  function quietFloor() {
    const sf = speechFloor()
    return Math.min(FLOOR_PEAK, sf, Math.max(sf * QUIET_PEAK_RATIO, roomCeil * QUIET_ROOM_MULT))
  }

  function onMeterFrame(p) {
    const t = now()
    if (p > quietFloor()) lastQuietSince = t
    if (p > speechFloor() && isRecording.value) lineHasSpeech.value = true

    quietMs.value = lineHasSpeech.value ? t - lastQuietSince : 0

    // KEEP A CLEAN STANDBY WARM.
    //
    // The standby exists to hold the next clip's lead-in, so the one thing it
    // must never contain is speech. It is therefore thrown away and respawned
    // on the first quiet frame after anything is heard: from then on it holds
    // room tone and nothing else, ageing until a boundary promotes it.
    if (p > speechFloor()) {
      standbyDirty = true
    } else if (!standby) {
      standby = spawnRecorder()
      standbyDirty = false
    } else if (standbyDirty) {
      const soiled = standby
      standby = spawnRecorder()
      standbyDirty = false
      harvest(soiled)
    }

    // Roll the pre-roll over, but only while nothing has been said on this line
    // and the room has genuinely been quiet for a while — and only into a
    // standby that already holds a full PRE_ROLL_MIN_MS. Rolling into an empty
    // recorder is the defect this whole mechanism exists to prevent, and it is
    // what the old `handOver()` here did every ~2.5s for as long as a recordist
    // sat reading a line: for the 800ms after each roll the active recorder held
    // nothing at all, and a read begun in that window arrived flush against its
    // own first syllable. Waiting for the standby to be full instead keeps the
    // active recorder's lead-in inside [PRE_ROLL_MIN_MS, ~PRE_ROLL_MAX_MS] at
    // every instant, which is what the header has always claimed it did.
    if (
      active &&
      !lineHasSpeech.value &&
      t - active.startedAt > PRE_ROLL_MAX_MS &&
      t - lastQuietSince > ROLL_QUIET_MS &&
      standby && !standbyDirty && t - standby.startedAt >= PRE_ROLL_MIN_MS
    ) {
      const stale = handOver()
      // Dropped immediately, not after an overlap timer: the recorder that
      // replaced it has been running since long before this one was retired, so
      // every sample the stale one holds is already held by its successor. The
      // overlap is banked in advance now rather than paid for afterwards.
      harvest(stale)
    }
  }

  // How much audio the recorder about to be used for the next take is holding,
  // in ms. This is the only currency the trim can spend: a clip's lead-in is
  // its recorder's age at the first word, and nothing downstream can invent it.
  function activeAgeMs() {
    return active ? now() - active.startedAt : 0
  }

  // Resolve once the active recorder is old enough to hand the trim its margin,
  // and NOT A MOMENT LATER. If one already is — every boundary inside a
  // session, where #104's standby has been running through the quiet — this
  // settles synchronously on the next microtask and the caller reveals the line
  // immediately. Only the cold start actually waits.
  function awaitLeadIn(minMs = COLD_START_SETTLE_MS) {
    if (!active) active = spawnRecorder()
    return new Promise((resolve) => {
      const check = () => {
        const age = activeAgeMs()
        if (age >= minMs) { resolve(age); return }
        setTimeout(check, Math.max(10, minMs - age))
      }
      check()
    })
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

  // Close the current line and throw the audio away (re-read).
  //
  // The re-read is promoted onto the standby by handOver(), so it opens holding
  // the room tone captured since the discarded read finished — a real lead-in,
  // not the bare instant of the tap. Before that it opened on a recorder
  // constructed in this very call, which is why a re-read came back snipped
  // tighter than the take it replaced.
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
    const all = [active, standby, ...retiring].filter(Boolean)
    active = null
    standby = null
    standbyDirty = false
    retiring = []
    for (const entry of all) { try { await harvest(entry) } catch { /* already gone */ } }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null }
    if (clipTimer) { clearTimeout(clipTimer); clipTimer = null }
    if (stream) stream.getTracks().forEach(t => t.stop())
    try { if (meterCtx) await meterCtx.close() } catch {}
    if (wakeLock) { try { await wakeLock.release() } catch {}; wakeLock = null }
    stream = null; meterCtx = null; analyser = null; meterBuf = null
    level.value = 0; clipping.value = false
    sessionPeak = 0; peak = 0; noiseEst = 0; roomCeil = 0
    meterTrusted.value = false
    inputPeak.value = 0; roomTone.value = 0
  }

  return {
    isRecording, level, clipping, devices, appliedSettings, profile, error,
    lineHasSpeech, quietMs, meterTrusted, inputPeak, roomTone,
    listDevices, start, beginLine, endLine, discardLine, stop,
    activeAgeMs, awaitLeadIn,
  }
}
