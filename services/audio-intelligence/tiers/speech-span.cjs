/**
 * SPEECH SPAN — where the speech actually is, so nothing downstream measures padding.
 *
 * Tier 1 divides syllables by duration. If it divides by the FILE duration it is really
 * measuring how much silence the mastering left on, and two voices with different padding
 * get different thresholds for no acoustic reason. So the span runs first and everything
 * downstream measures against it.
 *
 * ── ONE ENGINE, PREFERRED; THIS IS THE FLOOR ────────────────────────────────────────
 * A fuller VAD (`services/audio-intelligence/tiers/vad.cjs`) is being written by the
 * damage-trace work in parallel with this file. When it is present this module DEFERS to
 * it and reports `engine: 'vad.cjs'`; when it is not, this energy VAD runs and reports
 * `engine: 'speech-span-fallback'`. The verdict always carries which one spoke, because a
 * measurement whose provenance is unrecorded is a measurement you cannot cite later.
 * Deleting this fallback once vad.cjs lands is a one-line change and is the intended end
 * state — two span detectors is one too many.
 *
 * METHOD, and why not a neural VAD: these are studio TTS renders. The noise floor is near
 * digital silence and the speech sits 40+ dB above it. The hard case in this estate is not
 * "speech or a passing lorry", it is "did the word finish". An energy VAD with a per-clip
 * adaptive floor answers that for zero dependencies and a thousandth of the CPU.
 *
 * ⚠️ A SPAN CANNOT TELL YOU A WORD IS MISSING. A cleanly truncated clip has a perfectly
 * respectable speech span. This tier MEASURES the span; tiers 1 and 2 decide whether the
 * span is the right one.
 */

const path = require('path')

/** Frames of this length are classified speech / not speech. */
const FRAME_MS = 10
/** How far above the clip's own noise floor a frame must sit to count as speech. */
const SPEECH_ABOVE_FLOOR_DB = 12
/** Below this the clip carries no speech worth the name — silence, or a stub. */
const MIN_SPEECH_MS = 100

/** Optional upgrade: the damage-trace engine, when it exists in this tree. */
function loadPreferredEngine () {
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const vad = require(path.join(__dirname, 'vad.cjs'))
    if (vad && typeof vad.speechSpan === 'function') return { name: 'vad.cjs', speechSpan: vad.speechSpan }
  } catch { /* not present in this tree — the fallback below is the engine */ }
  return null
}

/** Framewise RMS in dBFS. Pure; exported so the thresholds can be tested without audio. */
function frameDb (samples, sampleRate, frameMs = FRAME_MS) {
  const per = Math.max(1, Math.round(sampleRate * frameMs / 1000))
  const out = []
  for (let i = 0; i + per <= samples.length; i += per) {
    let sum = 0
    for (let j = i; j < i + per; j++) { const v = samples[j]; sum += v * v }
    const rms = Math.sqrt(sum / per)
    out.push(rms > 0 ? 20 * Math.log10(rms) : -120)
  }
  return out
}

/**
 * The span, from framewise dB. Pure — this is the function the tests drive.
 *
 * The floor is the clip's own 10th percentile frame, so a quietly mastered clip is not
 * called silent by an absolute threshold and a loud one does not swallow its own tail.
 *
 * `opts.speechAboveFloorDb` overrides that delta for one call and nothing else — absent,
 * the shipped SPEECH_ABOVE_FLOOR_DB applies exactly as before. It exists so VOICELAB can
 * put the number on a slider; a threshold a lab can edit that the gate ignores is worse
 * than no slider at all.
 *
 * @returns {{measured:boolean, startMs:number|null, endMs:number|null, speechMs:number|null,
 *            fileMs:number, floorDb:number|null, peakDb:number|null, reason:string}}
 */
function spanFromFrames (db, frameMs = FRAME_MS, opts = {}) {
  const aboveFloorDb = opts.speechAboveFloorDb == null ? SPEECH_ABOVE_FLOOR_DB : Number(opts.speechAboveFloorDb)
  const fileMs = db.length * frameMs
  if (!db.length) {
    return { measured: false, startMs: null, endMs: null, speechMs: null, fileMs: 0, floorDb: null, peakDb: null, reason: 'no frames — nothing decoded' }
  }
  const sorted = [...db].sort((a, b) => a - b)
  const floorDb = sorted[Math.floor(sorted.length * 0.10)]
  const peakDb = sorted[sorted.length - 1]
  const threshold = floorDb + aboveFloorDb

  let first = -1
  let last = -1
  for (let i = 0; i < db.length; i++) {
    if (db[i] >= threshold) { if (first < 0) first = i; last = i }
  }
  if (first < 0) {
    return {
      measured: true, startMs: null, endMs: null, speechMs: 0, fileMs,
      floorDb: +floorDb.toFixed(1), peakDb: +peakDb.toFixed(1),
      reason: `no frame rises ${aboveFloorDb} dB above this clip's own floor (${floorDb.toFixed(1)} dBFS) — there is no speech here`,
    }
  }
  const startMs = first * frameMs
  const endMs = (last + 1) * frameMs
  return {
    measured: true,
    startMs,
    endMs,
    speechMs: endMs - startMs,
    fileMs,
    floorDb: +floorDb.toFixed(1),
    peakDb: +peakDb.toFixed(1),
    reason: `speech from ${startMs} to ${endMs} ms of a ${fileMs} ms file (floor ${floorDb.toFixed(1)} dBFS, peak ${peakDb.toFixed(1)} dBFS)`,
  }
}

/**
 * Measure a decoded clip.
 * @param {Float32Array|Int16Array} samples  mono PCM
 * @param {number} sampleRate
 */
function measure (samples, sampleRate, opts = {}) {
  const engine = opts.engine === undefined ? loadPreferredEngine() : opts.engine
  if (engine) {
    const r = engine.speechSpan(samples, sampleRate)
    return { ...r, engine: engine.name }
  }
  // Int16 input is scaled to +/-1 so the dB floor means the same thing either way.
  const scaled = samples instanceof Float32Array
    ? samples
    : Float32Array.from(samples, (v) => v / 32768)
  return { ...spanFromFrames(frameDb(scaled, sampleRate, FRAME_MS), FRAME_MS, opts), engine: 'speech-span-fallback' }
}

/**
 * The gate reading of a span. Three outcomes, never two.
 *  - `null` when nothing could be measured (no frames, decode failure upstream)
 *  - `false` when the clip carries essentially no speech — that is a real defect,
 *    and it is the silent-stub failure this estate has shipped before
 *  - `true` otherwise, carrying the span every later tier measures against
 *
 * `opts.minSpeechMs` overrides the floor for one call; absent, MIN_SPEECH_MS applies.
 */
function verdict (span, opts = {}) {
  const minSpeechMs = opts.minSpeechMs == null ? MIN_SPEECH_MS : Number(opts.minSpeechMs)
  if (!span || !span.measured) {
    return { pass: null, reason: span?.reason || 'speech span not measured', span: span || null }
  }
  if (!span.speechMs || span.speechMs < minSpeechMs) {
    return {
      pass: false,
      reason: `only ${span.speechMs || 0} ms of speech in a ${span.fileMs} ms file — below the ${minSpeechMs} ms floor`,
      span,
    }
  }
  return { pass: true, reason: span.reason, span }
}

module.exports = {
  FRAME_MS,
  SPEECH_ABOVE_FLOOR_DB,
  MIN_SPEECH_MS,
  frameDb,
  spanFromFrames,
  measure,
  verdict,
  loadPreferredEngine,
}
