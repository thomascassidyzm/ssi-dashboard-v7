// Build the fake microphone's audio: one slow-pass read of a three-LEGO phrase.
//
// Chromium's --use-file-for-fake-audio-capture plays this file as the mic, so
// the whole live path — VAD polling, chunk-boundary timing, MediaRecorder,
// review — runs on it exactly as it would with a person at a microphone.
//
// The "speech" is cut from the pod-recording suite's real clip rather than
// synthesised. A pure tone will not do: the studio asks for noiseSuppression,
// and a steady sine is precisely what noise suppression is built to remove —
// the fake mic would go in loud and arrive at the VAD as silence.
//
// The shape, in order:
//   2.0s silence   — the room, which the studio calibrates against before
//                    going live (calibrationMs 1500)
//   0.3s speech    — LEGO 1
//   1.0s silence   — the pause the autocue's gap marker asks for
//   0.3s speech    — LEGO 2
//   1.0s silence   — gap marker
//   0.3s speech    — LEGO 3
//   5.0s silence   — the take closes 800ms into this
//
// So the take should be cut into exactly three pieces, at roughly
// [0-300] [1300-1600] [2600-2900] ms from the start of the take.
import { readFileSync, writeFileSync } from 'fs'

// The VAD variant: same real clip, longer, with engineered silence around it —
// enough voiced material to cut three distinct chunks from.
const SOURCE_WAV = 'e2e/pod-recording/fixtures/fake-mic-sample-vad.wav'
// Short, because the source clip holds only about a second of voiced audio —
// three chunks have to come out of it. Still well over the VAD's 300ms
// minSpeechDuration once the pauses between them are counted.
const SPEECH_MS = 300
const PAUSE_MS = 1000
const LEAD_SILENCE_MS = 2000
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
 * silence, and picking "loudest" windows independently happily returns two of
 * silence once the voiced part is used up — chunks that go in silent and make
 * the whole fixture a lie.
 */
function voicedRun(samples, windowSamples, count) {
  const span = windowSamples * count
  const stride = Math.floor(windowSamples / 4)
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
 * @param {{pauseMs?: number, chunks?: number}} [opts]
 *
 * `pauseMs` is the only thing worth varying: it is the whole difference between
 * a slow read the recorder can cut and one it cannot. The VAD counts a pause as
 * a chunk boundary at 400ms (useVAD chunkPauseDuration), so 1000ms is a read
 * that works and 250ms is the failure Kai hit — a pause a person plainly made,
 * and plainly heard themselves make, that the recorder did not keep.
 */
export function buildSlowTakeWav(path, opts = {}) {
  const pauseMs = opts.pauseMs ?? PAUSE_MS
  const chunks = opts.chunks ?? 3
  const { rate, samples } = readWav(SOURCE_WAV)
  const ms = (n) => Math.round((n / 1000) * rate)
  const speechLen = ms(SPEECH_MS)
  const starts = voicedRun(samples, speechLen, chunks)

  const plan = [{ silence: LEAD_SILENCE_MS }]
  for (let i = 0; i < chunks; i++) {
    if (i > 0) plan.push({ silence: pauseMs })
    plan.push({ speech: starts[i] })
  }
  plan.push({ silence: TAIL_SILENCE_MS })

  const total = plan.reduce((n, p) => n + (p.silence !== undefined ? ms(p.silence) : speechLen), 0)
  const out = new Int16Array(total)
  let cursor = 0
  for (const step of plan) {
    if (step.silence !== undefined) {
      cursor += ms(step.silence)   // Int16Array is already zeroed
      continue
    }
    // A short fade each side, so the cut into the source clip is not a click
    // the VAD could read as an extra boundary.
    const fade = ms(15)
    for (let i = 0; i < speechLen; i++) {
      const gain = Math.min(1, i / fade, (speechLen - i) / fade)
      out[cursor + i] = Math.round(samples[step.speech + i] * gain)
    }
    cursor += speechLen
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
