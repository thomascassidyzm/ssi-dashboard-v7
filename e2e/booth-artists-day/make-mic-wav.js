import { writeFileSync } from 'fs'

// THE FAKE MICROPHONE FOR THE ARTIST'S DAY. Chromium plays this file into
// getUserMedia (--use-file-for-fake-audio-capture) from the top every time the
// mic is opened, and loops it. So the timeline is measured from Begin:
//
//   0–2.5s  silence        (the line is revealed ~1s after the mic opens; a
//                           take whose speech starts within 100ms of its own
//                           start is REFUSED as truncated — a real gate, and
//                           the first run here tripped it)
//   2.5–6.5s LOUD reading  (line 1, and line 3 after the gap)
//   6.5–8.5s silence       (tap Next here → the next line opens on silence)
//   8.5–12.5s QUIET reading (line 2: the booth's meter hears a rise over the
//                           room and counts it as speech, but at -54 dBFS the
//                           server's -40 dB silence trim strips it to nothing
//                           and REFUSES the take — the shape of Aran's day)
//   12.5–14.5s silence
//   14.5–18.5s LOUD reading
//   18.5–20.5s silence, then the loop restarts
//
// The bursts have a syllable-rate envelope with real dips: useTapRecorder counts
// speech as a rise over the room's own level, so a flat tone is never speech.
export const TIMELINE = [
  { kind: 'silence', ms: 2500 },
  { kind: 'loud', ms: 4000 }, { kind: 'silence', ms: 2000 },
  { kind: 'quiet', ms: 4000 }, { kind: 'silence', ms: 2000 },
  { kind: 'loud', ms: 4000 }, { kind: 'silence', ms: 2000 },
]
export const LOUD_AMPLITUDE = 0.55
export const QUIET_AMPLITUDE = 0.003   // ≈ -50 dBFS peak: the input peak of Aran's refused takes
// A real microphone is never digitally silent. A whisper of room noise under
// everything (≈ -70 dBFS peaks) keeps the booth's room-tracking meter, and
// Chromium's own voice processing, on the path a real room puts them on.
export const ROOM_NOISE = 0.0001

export function buildMicWav(path, { rate = 48000 } = {}) {
  const totalMs = TIMELINE.reduce((n, s) => n + s.ms, 0)
  const total = Math.round((totalMs * rate) / 1000)
  const buf = Buffer.alloc(44 + total * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + total * 2, 4); buf.write('WAVE', 8)
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28)
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36); buf.writeUInt32LE(total * 2, 40)

  let i = 0
  for (const seg of TIMELINE) {
    const n = Math.round((seg.ms * rate) / 1000)
    const amp = seg.kind === 'loud' ? LOUD_AMPLITUDE : seg.kind === 'quiet' ? QUIET_AMPLITUDE : 0
    for (let k = 0; k < n; k++, i++) {
      let v = ROOM_NOISE * (Math.random() * 2 - 1)
      if (amp > 0) {
        const t = k / rate
        // Syllables at 4 Hz with a real trough between them, 250ms of quiet
        // between "words" so the peaks clear the room the meter tracks, and a
        // 200ms onset so the segment starts the way a voice does, not a switch.
        const word = (t % 1.0) < 0.75
        const onset = Math.min(1, t / 0.2)
        const env = word ? 0.25 + 0.75 * Math.abs(Math.sin(2 * Math.PI * 4 * t)) : 0
        v += amp * onset * env * (Math.sin(2 * Math.PI * 190 * t) + 0.5 * Math.sin(2 * Math.PI * 520 * t)) / 1.5
      }
      buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2)
    }
  }
  writeFileSync(path, buf)
  return path
}
