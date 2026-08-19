// How loud is a mid-phrase breath, AFTER Chromium's processing chain, relative
// to the voice the calibration measures — and therefore which side of the gate
// does it land?
//
// This is the one quantity that decides whether a phrase survives an 800ms
// breath, and it cannot be read off the file: the studio asks getUserMedia for
// noiseSuppression, a breath IS noise, and suppression moves it. Each period of
// the fixture carries a different breath level, so one browser launch measures
// the whole curve.
//
//   node e2e/mic-calibration/probe-breath-sweep.js
import { chromium } from '@playwright/test'
import { mkdirSync } from 'fs'
import { buildMicWav, CONDITIONS } from './make-mic-wav.js'

const DIR = `${process.cwd()}/e2e/mic-calibration/fixtures`
mkdirSync(DIR, { recursive: true })
const BASE = process.env.E2E_BASE_URL || 'http://localhost:5178'
const SWEEP = [8, 12, 16, 20, 26]

const db = x => 20 * Math.log10(x)
const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.max(0, Math.min(s.length - 1, Math.floor(p * s.length)))]
}

for (const [key, c] of Object.entries(CONDITIONS)) {
  const wav = buildMicWav(`${DIR}/sweep-${key}.wav`, {
    ...c, breathMs: 800, periods: SWEEP.length, breathSweep: SWEEP
  })
  const browser = await chromium.launch({
    channel: 'chromium',
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${wav.path}`,
    ],
  })
  const page = await browser.newPage()
  await page.goto(BASE)
  const trace = await page.evaluate(async (ms) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    })
    const ctx = new AudioContext()
    const an = ctx.createAnalyser()
    an.fftSize = 256
    an.smoothingTimeConstant = 0.5
    ctx.createMediaStreamSource(stream).connect(an)
    const buf = new Float32Array(an.fftSize)
    const out = []
    const t0 = performance.now()
    await new Promise(res => {
      const id = setInterval(() => {
        an.getFloatTimeDomainData(buf)
        let s = 0
        for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]
        out.push([performance.now() - t0, Math.sqrt(s / buf.length)])
        if (performance.now() - t0 > ms) { clearInterval(id); res() }
      }, 50)
    })
    return out
  }, wav.periodMs * SWEEP.length * 2 + 2000)
  await browser.close()

  const lv = trace.map(s => s[1])
  const speechGate = pct(lv, 0.995) * Math.pow(10, -12 / 20)
  const voice = pct(lv.filter(x => x > speechGate), 0.75)

  console.log(`\n=== ${key}: ${c.label}`)
  console.log(`    period ${wav.periodMs}ms · phrase ${wav.phraseMs}ms · breath ${wav.breathMs}ms`)
  console.log(`    voice p75 at the analyser: ${voice.toExponential(3)}`)
  console.log(`    gate the mic check would place (voice -21dB): ${(voice * Math.pow(10, -21 / 20)).toExponential(3)}`)
  console.log(`    old fixed gate: 2.000e-2`)

  // Each period holds one sweep value. The breath is the stretch BETWEEN the
  // two halves of the phrase, so find each period's speech run and read the
  // middle of it.
  const gate = voice * Math.pow(10, -21 / 20)
  console.log(`\n    written  measured breath  vs voice   vs new gate   vs old 0.02`)
  for (let p = 0; p < SWEEP.length; p++) {
    // The fixture is periodic and the trace starts at an unknown phase, so cut
    // on the audio itself: the breath is the low stretch flanked by two speech
    // runs, of which the trace holds one per period.
    const t0 = p * wav.periodMs, t1 = (p + 1) * wav.periodMs
    // Search the SECOND pass through the file, by which time the trace is well
    // clear of the analyser's start-up transient.
    const win = trace.filter(s => s[1] > 0 && s[0] >= t0 + wav.periodMs * SWEEP.length && s[0] < t1 + wav.periodMs * SWEEP.length)
    const inPhrase = win.map((s, i) => [i, s[1]])
    const loud = inPhrase.filter(([, x]) => x > voice * 0.35).map(([i]) => i)
    let breathLvl = NaN
    if (loud.length > 4) {
      // the widest interior gap between loud frames is the breath
      let best = [0, 0]
      for (let i = 1; i < loud.length; i++) if (loud[i] - loud[i - 1] > best[1] - best[0]) best = [loud[i - 1], loud[i]]
      const mid = inPhrase.slice(best[0] + 2, best[1] - 1).map(([, x]) => x)
      if (mid.length >= 3) breathLvl = pct(mid, 0.5)
    }
    const f = (x) => Number.isFinite(x) ? x.toFixed(1).padStart(6) : '     ?'
    console.log(`    -${String(SWEEP[p]).padStart(2)}dB    ${Number.isFinite(breathLvl) ? breathLvl.toExponential(3) : '        ?'}      ${f(db(breathLvl) - db(voice))}dB  ${f(db(breathLvl) - db(gate))}dB  ${f(db(breathLvl) - db(0.02))}dB`)
  }
}
