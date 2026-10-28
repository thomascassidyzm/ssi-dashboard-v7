// REPLAY A WHOLE BOOTH SESSION THROUGH THE METER (job #915, Aran 2026-10-28).
// Skipped unless BOOTH_REPLAY_FRAMES names a file written by
// tools/recording/booth-take-meter-frames.cjs — it is a measuring run over real
// takes, not a unit test, and the frames are evidence, not repo content.
//
//   BOOTH_REPLAY_FRAMES=~/ssi-evidence/ssi-dashboard-v7/booth/frames-2026-10-28.json \
//     npx vitest run src/composables/useTapRecorder.replay.test.js
//
// The session is played through ONE recorder, take after take, beginLine() at
// the start of each raw take — so the room estimate carries over exactly as it
// does live. For each line it reports when auto-advance would fire with and
// without the MIN_VOICED_MS gate, and how much of the line was voiced by then.
// A raw take opens on 0.8-2.5 s of pre-roll that the live booth heard BEFORE the
// line opened; counting it here can only add voiced ms, never remove them, so a
// real read that passes here passes live by at least as much — and the phantom,
// which fails here, has been given every benefit of the doubt.
import { it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync, writeFileSync } from 'fs'
import { useTapRecorder, MIN_VOICED_MS } from './useTapRecorder'

const FILE = process.env.BOOTH_REPLAY_FRAMES
const FRAME_MS = 16
const ADVANCE_AT_MS = 1200 // AUTO_ADVANCE_QUIET_MS in RecordistRoom.vue

let frames = []
let sampleLevel = 0
class FakeMediaRecorder {
  static isTypeSupported() { return true }
  constructor() { this.state = 'inactive'; this.ondataavailable = null; this.onstop = null }
  start() { this.state = 'recording'; this.ondataavailable?.({ data: new Blob(['x'], { type: 'audio/webm' }) }) }
  stop() { this.state = 'inactive'; this.onstop?.() }
}
beforeEach(() => {
  vi.useFakeTimers()
  frames = []
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  vi.stubGlobal('navigator', { mediaDevices: {
    getUserMedia: async () => ({
      getAudioTracks: () => [{ applyConstraints: async () => {}, getSettings: () => ({ sampleRate: 48000 }), stop: () => {} }],
      getTracks: () => [{ stop: () => {} }],
    }),
    enumerateDevices: async () => [],
  } })
  vi.stubGlobal('requestAnimationFrame', (cb) => { frames.push(cb); return frames.length })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  vi.stubGlobal('window', { AudioContext: class {
    constructor() { this.state = 'running' }
    async resume() {}
    async close() {}
    createMediaStreamSource() { return { connect() {} } }
    createAnalyser() { return { fftSize: 1024, getFloatTimeDomainData(b) { for (let i = 0; i < b.length; i++) b[i] = i % 2 ? sampleLevel : -sampleLevel } } }
  } })
})
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

it.skipIf(!FILE)('replays a real session: every read still advances on time, a blip does not', async () => {
  const data = JSON.parse(readFileSync(FILE, 'utf8'))
  const takes = data.takes.filter((t) => t.peaks && t.after)
  const r = useTapRecorder()
  await r.start()
  const rows = []
  for (const take of takes) {
    r.beginLine()
    // Every frame at which the quiet clock crosses the advance mark. The LAST one
    // is the advance that happened live (the raw take runs on ~TAIL_MS past it);
    // an earlier one falls in pre-roll the live booth heard before the line opened.
    const crossings = []
    let was = false
    take.peaks.forEach((p, i) => {
      sampleLevel = p / data.scale
      frames.shift()()
      vi.advanceTimersByTime(FRAME_MS)
      const quiet = r.lineHasSpeech.value && r.quietMs.value >= ADVANCE_AT_MS
      if (quiet && !was) crossings.push({ i, voiced: Math.round(r.voicedMs.value) })
      was = quiet
    })
    const live = crossings[crossings.length - 1] || null
    rows.push({
      id: take.id, after: take.after, refused: take.refused, frames: take.peaks.length,
      liveAt: live && live.i, voicedAtLive: live && live.voiced,
      advancesWithGate: !!live && live.voiced >= MIN_VOICED_MS,
      earlierCrossings: crossings.slice(0, -1),
      voicedTotal: Math.round(r.voicedMs.value),
    })
  }
  if (process.env.BOOTH_REPLAY_OUT) writeFileSync(process.env.BOOTH_REPLAY_OUT, JSON.stringify(rows, null, 1))
  const real = rows.filter((x) => !x.refused && x.liveAt != null)
  const v = real.map((x) => x.voicedAtLive).sort((a, b) => a - b)
  const q = (f) => v[Math.floor(v.length * f)]
  console.log(`MIN_VOICED_MS=${MIN_VOICED_MS} takes=${rows.length} accepted+auto=${real.length} refused=${rows.filter((x) => x.refused).length}`)
  console.log(`voiced ms at the live advance, accepted takes: min=${v[0]} p1=${q(0.01)} p5=${q(0.05)} median=${q(0.5)} max=${v[v.length - 1]}`)
  console.log('lowest five:', JSON.stringify(real.slice().sort((a, b) => a.voicedAtLive - b.voicedAtLive).slice(0, 5).map(({ earlierCrossings, ...x }) => x)))
  console.log('refused:', JSON.stringify(rows.filter((x) => x.refused)))
  if (process.env.BOOTH_REPLAY_REPORT_ONLY) return
  // Every accepted take still advances on exactly the frame it did before.
  for (const x of real) expect(x.advancesWithGate, x.id).toBe(true)
  // A take refused as steady noise with no speech never auto-advances.
  for (const x of rows.filter((y) => y.refused === 'steady_noise_no_speech')) {
    expect(x.liveAt, `${x.id} would have advanced without the gate`).not.toBeNull()
    expect(x.voicedTotal, x.id).toBeLessThan(MIN_VOICED_MS)
  }
}, 120_000)
