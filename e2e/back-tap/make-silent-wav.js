// A microphone that hears nothing.
//
// This suite is about what the BACK BUTTON does, not about takes: the recordist
// presses it having said nothing yet. Chromium's built-in fake device plays a
// 1kHz beep, which the VAD would read as one endless utterance and auto-advance
// on — so the mic is fed silence instead and the script stays exactly where the
// taps put it.
import { writeFileSync } from 'fs'

export function buildSilentWav(path, { seconds = 60, rate = 48000 } = {}) {
  const samples = seconds * rate
  const buf = Buffer.alloc(44 + samples * 2)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + samples * 2, 4)
  buf.write('WAVEfmt ', 8)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)   // PCM
  buf.writeUInt16LE(1, 22)   // mono
  buf.writeUInt32LE(rate, 24)
  buf.writeUInt32LE(rate * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(samples * 2, 40)
  writeFileSync(path, buf)
  return path
}
