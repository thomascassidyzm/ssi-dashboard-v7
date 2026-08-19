// Build the fake microphone's audio for the mic-calibration suite.
//
// TWO CONDITIONS, ONE RECORDING. Both files are cut from the same real human
// clip and differ ONLY in level — a phone-ish mic at full output against a
// quieter, more directional external one about 13dB down with a much lower room
// floor. That is the whole experiment: a change of microphone must not change
// where the recorder cuts, and if the two files differed in any other way the
// result would not say that.
//
// The speech is REAL, cut from e2e/pod-recording/fixtures/fake-mic-sample-vad.wav
// for the same reason the sibling autocue-chunks builder gives: the studio asks
// getUserMedia for noiseSuppression, and a synthesised tone is precisely what
// noise suppression is built to remove.
//
// Shape, in order:
//   2.5s room      — the mic check's first step listens here
//   3.5s speech    — the mic check's second step: "say something"
//   2.0s room      — settling, and the room-only fallback's window
//   then, REPEATED: 4.0s room, then <phrase> — real speech, a mid-phrase
//   BREATH, real speech again.
//
// The phrase repeats because Chromium's fake capture is a file playing on its
// own clock: the test cannot line the moment recording starts up with the
// moment the phrase starts. Four repetitions separated by four seconds of room
// mean recording always lands inside silence with whole phrases still to come.
// The first captured take is therefore allowed to be a partial — the assertion
// is on the ones after it, which are the ones that were read start to finish.
import { readFileSync, writeFileSync } from 'fs'

const SOURCE_WAV = 'e2e/pod-recording/fixtures/fake-mic-sample-vad.wav'

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

// Deterministic noise — a seeded LCG, so a failing run reproduces exactly.
function noise(n, level, seed) {
  const out = new Float32Array(n)
  let s = seed >>> 0
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) >>> 0
    out[i] = ((s / 0x100000000) * 2 - 1) * level * Math.sqrt(3)
  }
  return out
}

const WIN = 256
function frameRms(a, i) {
  let s = 0
  for (let j = 0; j < WIN; j++) s += (a[i + j] || 0) ** 2
  return Math.sqrt(s / WIN)
}

/**
 * @param gain          how hot this "microphone" is. 1.0 = phone-ish.
 * @param roomBelowDb   how far the room floor sits under the speech body.
 * @param breathMs      the mid-phrase breath. 800ms is where the headless
 *                      replay showed the OLD code splitting the take.
 * @param breathBelowDb how far under the speech the breath sits.
 */
export function buildMicWav(outPath, { gain = 1, roomBelowDb = 40, breathMs = 800, breathBelowDb = 26, repeats = 4 } = {}) {
  const src = readWav(SOURCE_WAV)
  const { rate, samples: all } = src

  // The voiced span, found by level rather than hard-coded offsets.
  let first = -1, last = -1
  for (let i = 0; i + WIN <= all.length; i += WIN) {
    if (frameRms(all, i) > 0.02) { if (first < 0) first = i; last = i + WIN }
  }
  const voiced = all.subarray(first, last)

  const frames = []
  for (let i = 0; i + WIN <= voiced.length; i += WIN) frames.push(frameRms(voiced, i))
  frames.sort((a, b) => a - b)
  const speech = frames[Math.floor(0.75 * frames.length)]

  const room = speech * Math.pow(10, -roomBelowDb / 20)
  const breath = Math.max(speech * Math.pow(10, -breathBelowDb / 20), room)
  const sec = n => Math.round(rate * n)

  // The mic check's "say something" step wants ~3s of voice; the source clip
  // holds about 1.3s, so it is repeated with short gaps — which is what reading
  // a line aloud sounds like anyway.
  const calVoice = []
  for (let i = 0; i < 3; i++) { calVoice.push(voiced, noise(sec(0.12), room, 3 + i)) }

  const parts = [
    noise(sec(2.5), room, 7),        // step 1: the room
    ...calVoice,                      // step 2: the voice
    noise(sec(2.0), room, 9)         // settle
  ]
  for (let r = 0; r < repeats; r++) {
    parts.push(
      noise(sec(4.0), room, 21 + r),           // the previous take closes in here
      voiced,                                   // first half of the phrase
      noise(sec(breathMs / 1000), breath, 41 + r), // the mid-phrase breath
      voiced                                    // second half
    )
  }
  parts.push(noise(sec(5.0), room, 99))
  const total = parts.reduce((n, p) => n + p.length, 0)
  const mixed = new Float32Array(total)
  let o = 0
  for (const p of parts) { mixed.set(p, o); o += p.length }

  const buf = Buffer.alloc(44 + total * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + total * 2, 4); buf.write('WAVE', 8)
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36); buf.writeUInt32LE(total * 2, 40)
  for (let i = 0; i < total; i++) {
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(mixed[i] * gain * 32767))), 44 + i * 2)
  }
  writeFileSync(outPath, buf)

  // Where the take section starts, after everything the mic check consumes.
  const phraseStartMs = (sec(2.5) + calVoice.reduce((n, p) => n + p.length, 0) + sec(2.0)) / rate * 1000
  const phraseMs = (voiced.length * 2 + sec(breathMs / 1000)) / rate * 1000
  return { path: outPath, speech: speech * gain, room: room * gain, breath: breath * gain, phraseStartMs, phraseMs }
}
