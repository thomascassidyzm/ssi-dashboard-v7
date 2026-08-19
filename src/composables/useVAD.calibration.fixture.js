// Test rig for the mic-calibration work of 2026-08-19.
//
// Builds ONE natural-speed phrase — real human speech, a mid-phrase breath,
// real speech again — and replays it through the REAL useVAD state machine at a
// chosen microphone gain, so the question "does a change of microphone change
// where this recorder cuts?" can be answered by measurement rather than by
// reading the arithmetic.
//
// The voiced material is cut from the pod-recording suite's real clip, the same
// source e2e/autocue-chunks/make-slow-take-wav.js uses and for the same reason:
// the studio asks getUserMedia for noiseSuppression, and a synthesised tone is
// precisely what noise suppression is built to remove.

import { readFileSync } from 'fs'
import { resolve } from 'path'

const SOURCE_WAV = 'e2e/pod-recording/fixtures/fake-mic-sample-vad.wav'
// Real AudioContexts on the machines this runs on are 48kHz, and the analyser
// window is a fixed 256 SAMPLES — so the rate decides how much time each poll
// actually looks at (5.3ms at 48k). Replaying at the source's 16k would look at
// 16ms and quietly smooth over exactly the dips under test.
const CONTEXT_RATE = 48000

/** Read a 16-bit PCM mono WAV into { rate, samples } — walks the chunk list. */
function readWav(path) {
  const buf = readFileSync(path)
  let off = 12, rate = 0, bits = 16, ch = 1, data = null
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4)
    const size = buf.readUInt32LE(off + 4)
    if (id === 'fmt ') { ch = buf.readUInt16LE(off + 10); rate = buf.readUInt32LE(off + 12); bits = buf.readUInt16LE(off + 22) }
    if (id === 'data') data = buf.subarray(off + 8, off + 8 + size)
    off += 8 + size + (size % 2)
  }
  if (bits !== 16) throw new Error(`fixture must be 16-bit PCM, got ${bits}`)
  const n = Math.floor(data.length / 2 / ch)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = data.readInt16LE(i * ch * 2) / 32768
  return { rate, samples: out }
}

function resample(samples, from, to) {
  if (from === to) return samples
  const n = Math.floor(samples.length * to / from)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = i * from / to, i0 = Math.floor(x), f = x - i0
    out[i] = (samples[i0] || 0) * (1 - f) + (samples[i0 + 1] || 0) * f
  }
  return out
}

// Deterministic noise — a seeded LCG, so a failing run reproduces exactly.
function noise(n, level, seed = 1) {
  const out = new Float32Array(n)
  let s = seed >>> 0
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) >>> 0
    out[i] = ((s / 0x100000000) * 2 - 1) * level * Math.sqrt(3)
  }
  return out
}

const WIN = 256
function frameRms(samples, i) {
  let s = 0
  for (let j = 0; j < WIN; j++) s += (samples[i + j] || 0) ** 2
  return Math.sqrt(s / WIN)
}

/**
 * @param breathBelowDb how far under the body of the speech the mid-phrase
 *   breath sits. The ONE assumption in the rig; sweep it rather than trust it.
 */
export function buildPhrase({ breathMs = 500, breathBelowDb = 26, roomBelowDb = 48, root = process.cwd() } = {}) {
  const src = readWav(resolve(root, SOURCE_WAV))
  const all = resample(src.samples, src.rate, CONTEXT_RATE)

  // The voiced span, found by level rather than hard-coded offsets.
  let first = -1, last = -1
  for (let i = 0; i + WIN <= all.length; i += WIN) {
    if (frameRms(all, i) > 0.02) { if (first < 0) first = i; last = i + WIN }
  }
  const voiced = all.subarray(first, last)

  // The body of the speech: p75 of the voiced frames. Not the peak — the gate
  // has to clear the ordinary syllables, not the loudest vowel.
  const frames = []
  for (let i = 0; i + WIN <= voiced.length; i += WIN) frames.push(frameRms(voiced, i))
  frames.sort((a, b) => a - b)
  const speech = frames[Math.floor(0.75 * frames.length)]

  const roomLevel = speech * Math.pow(10, -roomBelowDb / 20)
  const breathLevel = Math.max(speech * Math.pow(10, -breathBelowDb / 20), roomLevel)
  const sec = n => Math.round(CONTEXT_RATE * n)

  const parts = [
    noise(sec(2.0), roomLevel, 7),          // the room, which calibration measures
    voiced,                                  // first half of the phrase
    noise(sec(breathMs / 1000), breathLevel, 11), // the breath, mid-phrase
    voiced,                                  // second half
    noise(sec(3.0), roomLevel, 13)           // the take closes in here
  ]
  const total = parts.reduce((n, p) => n + p.length, 0)
  const samples = new Float32Array(total)
  let o = 0
  for (const p of parts) { samples.set(p, o); o += p.length }

  const phraseMs = (voiced.length * 2 + sec(breathMs / 1000)) / CONTEXT_RATE * 1000
  return { rate: CONTEXT_RATE, samples, speech, roomLevel, breathLevel, phraseStartMs: 2000, phraseMs }
}

/**
 * A fake AnalyserNode that plays `samples` at `gain`, advancing with the clock
 * the caller drives. Same shape as the analyser in useVAD.test.js.
 */
export function installFakeMic({ samples, rate }, gain) {
  const state = { posSamples: 0, samples }
  const analyser = {
    fftSize: WIN,
    smoothingTimeConstant: 0.5,
    frequencyBinCount: WIN / 2,
    getFloatTimeDomainData(out) {
      for (let i = 0; i < out.length; i++) out[i] = (state.samples[state.posSamples + i] || 0) * gain
    },
    getByteFrequencyData(out) { out.fill(110) }
  }
  global.AudioContext = class {
    createAnalyser() { return analyser }
    createMediaStreamSource() { return { connect() {} } }
    close() {}
  }
  return {
    state,
    /** Move the playhead on by `ms` of the recording. */
    advanceMs(ms) { state.posSamples += Math.round(rate * ms / 1000) },
    /** Swap what the mic is playing — the mic check, then the take. */
    load(buf) { state.samples = buf.samples; state.posSamples = 0 }
  }
}
