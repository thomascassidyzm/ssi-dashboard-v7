// Build the fake microphone's audio for one whole run of the recordist
// tutorial: four practice items, in the order the tutorial script puts them.
//
// Chromium's --use-file-for-fake-audio-capture plays this file as the mic, so
// the entire live path — room calibration, VAD polling, chunk-boundary timing,
// MediaRecorder, auto-advance, review — runs on it exactly as it would with a
// person at a microphone. Nothing about the run is simulated except the person.
//
// The "speech" is cut from the pod-recording suite's real clip rather than
// synthesised, for the reason the autocue-chunks fixture already documents: the
// studio asks for noiseSuppression, and a steady sine is precisely what noise
// suppression exists to remove — a pure tone goes in loud and arrives at the
// VAD as silence.
//
// The shape, in order, and why each number is what it is (constants read off
// src/composables/useVAD.ts and useContinuousRecorder.ts):
//
//   2.5s silence    — the room. The studio calibrates against it for
//                     calibrationMs 1500 before it will hear anything.
//   0.6s speech     — natural item 1. One burst, no internal pause: a natural
//                     item is never cut up.
//   2.5s silence    — the take closes 800ms in (silenceDuration), and the
//                     studio advances to the next item. The rest is headroom.
//   0.6s speech     — natural item 2.
//   2.5s silence
//   0.3/1.0/0.3/1.0/0.3  — slow item 1: three chunks with a 1s beat between.
//                     1000ms is comfortably over chunkPauseDuration 400ms (so
//                     each beat is COUNTED as a chunk boundary) and under
//                     interChunkSilenceDuration (so it does not end the take
//                     while chunks are still outstanding).
//   2.5s silence    — three chunks are now in, so the tolerance drops back to
//                     silenceDuration 800ms and the take closes.
//   0.3/1.0/0.3/1.0/0.3  — slow item 2.
//   5.0s silence    — the last take closes, the session ends by itself.
//
// So the run should produce four takes, of which the last two carry three
// pieces each — which is exactly what TutorialSplice needs before it will
// offer a recombined sentence.
import { readFileSync, writeFileSync } from 'fs'

// The VAD variant: the same real clip, with engineered silence around it, and
// enough voiced material to cut a run of three chunks from.
const SOURCE_WAV = 'e2e/pod-recording/fixtures/fake-mic-sample-vad.wav'

const NATURAL_SPEECH_MS = 600   // one unbroken read; well over minSpeechDuration 300
const SLOW_SPEECH_MS = 300      // three of these have to come out of ~1s of voiced audio
const BEAT_MS = 1000            // the pause the autocue's gap marker asks for
const GAP_BETWEEN_ITEMS_MS = 2500
const LEAD_SILENCE_MS = 2500
const TAIL_SILENCE_MS = 5000

/** Read a 16-bit PCM mono WAV into { rate, samples }. */
function readWav(path) {
  const buf = readFileSync(path)
  // Walk the chunk list rather than assuming a 44-byte header.
  let offset = 12
  let rate = 16000
  let dataStart = null
  let dataLength = 0
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4)
    const size = buf.readUInt32LE(offset + 4)
    if (id === 'fmt ') rate = buf.readUInt32LE(offset + 12)
    if (id === 'data') { dataStart = offset + 8; dataLength = size; break }
    offset += 8 + size + (size % 2)
  }
  if (dataStart === null) throw new Error(`no data chunk in ${path}`)
  const samples = new Int16Array(dataLength / 2)
  for (let i = 0; i < samples.length; i++) samples[i] = buf.readInt16LE(dataStart + i * 2)
  return { rate, samples }
}

/**
 * Start offsets of `count` consecutive windows cut from the most voiced stretch
 * of the clip.
 *
 * Taken as one contiguous run rather than as the N loudest windows separately:
 * the source holds about a second of speech inside four seconds of engineered
 * silence, and picking "loudest" windows independently happily returns windows
 * of silence once the voiced part is used up — chunks that go in silent and
 * make the whole fixture a lie.
 */
function voicedRun(samples, windowSamples, count) {
  const span = windowSamples * count
  const stride = Math.max(1, Math.floor(windowSamples / 4))
  let best = null
  for (let start = 0; start + span <= samples.length; start += stride) {
    let sum = 0
    for (let i = start; i < start + span; i += 8) sum += samples[i] * samples[i]
    if (!best || sum > best.energy) best = { start, energy: sum }
  }
  if (!best) throw new Error('source clip too short for the requested chunks')
  return Array.from({ length: count }, (_, i) => best.start + i * windowSamples)
}

/**
 * @param {string} path - where to write the wav
 * @param {{beatMs?: number}} [opts]
 *
 * `beatMs` is the only thing worth varying: it is the whole difference between
 * a slow read the recorder can cut and one it refuses. Left at 1000ms this
 * fixture is a read that works; drop it under chunkPauseDuration (400ms) and it
 * becomes the failure the tutorial's step-3 copy warns about.
 */
export function buildTutorialMicWav(path, opts = {}) {
  const beatMs = opts.beatMs ?? BEAT_MS
  const { rate, samples } = readWav(SOURCE_WAV)
  const ms = (n) => Math.round((n / 1000) * rate)

  const naturalLen = ms(NATURAL_SPEECH_MS)
  const slowLen = ms(SLOW_SPEECH_MS)
  // One voiced run for the natural items, one for the slow chunks. Both are cut
  // from the same loudest stretch — the clip has only one.
  const naturalStart = voicedRun(samples, naturalLen, 1)[0]
  const slowStarts = voicedRun(samples, slowLen, 3)

  // The plan, in fixture order. { silence } or { speech, len }.
  const plan = [{ silence: LEAD_SILENCE_MS }]
  for (let i = 0; i < 2; i++) {
    plan.push({ speech: naturalStart, len: naturalLen })
    plan.push({ silence: GAP_BETWEEN_ITEMS_MS })
  }
  for (let i = 0; i < 2; i++) {
    for (let c = 0; c < 3; c++) {
      if (c > 0) plan.push({ silence: beatMs })
      plan.push({ speech: slowStarts[c], len: slowLen })
    }
    plan.push({ silence: i === 1 ? TAIL_SILENCE_MS : GAP_BETWEEN_ITEMS_MS })
  }

  const total = plan.reduce((n, p) => n + (p.silence !== undefined ? ms(p.silence) : p.len), 0)
  const out = new Int16Array(total)
  let cursor = 0
  for (const step of plan) {
    if (step.silence !== undefined) {
      cursor += ms(step.silence)   // Int16Array is already zeroed
      continue
    }
    // A short fade each side, so the cut into the source clip is not a click
    // the VAD could read as an extra chunk boundary.
    const fade = ms(15)
    for (let i = 0; i < step.len; i++) {
      const gain = Math.min(1, i / fade, (step.len - i) / fade)
      out[cursor + i] = Math.round(samples[step.speech + i] * gain)
    }
    cursor += step.len
  }

  const dataBytes = out.length * 2
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataBytes, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)          // PCM chunk size
  header.writeUInt16LE(1, 20)           // PCM
  header.writeUInt16LE(1, 22)           // mono
  header.writeUInt32LE(rate, 24)
  header.writeUInt32LE(rate * 2, 28)
  header.writeUInt16LE(2, 32)           // block align
  header.writeUInt16LE(16, 34)          // bits per sample
  header.write('data', 36)
  header.writeUInt32LE(dataBytes, 40)

  writeFileSync(path, Buffer.concat([header, Buffer.from(out.buffer)]))
  return path
}
