import { writeFileSync } from 'fs'

// A fake microphone that reads like a person reading.
//
// A flat tone will not do. useTapRecorder measures speech as a RISE OVER THE
// ROOM this microphone is in, and it caps the room's own claim at a quarter of
// the loudest thing heard — 0.25 x 4 = 1 exactly, deliberately, so a perfectly
// steady signal lands precisely ON the speech floor and is never speech at any
// amplitude. So the fixture has to have peaks above its own troughs, and real
// gaps between them, or nothing on the recording screen will ever move.
//
// Bursts of wobbling tone with silence between them: each burst reads as a line
// being read, each gap runs past AUTO_ADVANCE_QUIET_MS and moves the studio on.
export function buildSpeechWav(path, { bursts = 12, speechMs = 1500, gapMs = 2200, rate = 48000 } = {}) {
  const total = Math.round((bursts * (speechMs + gapMs) * rate) / 1000)
  const buf = Buffer.alloc(44 + total * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + total * 2, 4); buf.write('WAVE', 8)
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28)
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36); buf.writeUInt32LE(total * 2, 40)

  const speechN = Math.round((speechMs * rate) / 1000)
  const cycleN = Math.round(((speechMs + gapMs) * rate) / 1000)
  for (let i = 0; i < total; i++) {
    const inBurst = i % cycleN < speechN
    let v = 0
    if (inBurst) {
      const t = i / rate
      // Two tones plus a syllable-rate envelope: peaks well above troughs.
      const env = 0.35 + 0.65 * Math.abs(Math.sin(2 * Math.PI * 4 * t))
      v = 0.55 * env * (Math.sin(2 * Math.PI * 190 * t) + 0.5 * Math.sin(2 * Math.PI * 520 * t)) / 1.5
    }
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2)
  }
  writeFileSync(path, buf)
  return path
}
