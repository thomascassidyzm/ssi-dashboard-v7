// What does Chromium's fake microphone ACTUALLY deliver?
//
// Three things the whole verification rests on, none of which may be assumed:
//   1. does --use-file-for-fake-audio-capture LOOP, and does it restart at
//      getUserMedia? (decides whether the fixture can be periodic)
//   2. does the gain difference between the two condition files SURVIVE
//      getUserMedia({autoGainControl:true})? If Chromium's AGC flattens it,
//      "phone" and "external" are the same microphone and every downstream
//      claim about mic gain is void.
//   3. does noiseSuppression eat the mid-phrase breath outright?
//
// Measured the way the product measures: a 256-sample AnalyserNode read as
// time-domain RMS every 50ms — the exact instrument useVAD.pollAudioLevel uses.
//
//   node e2e/mic-calibration/probe-fake-mic.js
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'fs'
import { buildMicWav, CONDITIONS } from './make-mic-wav.js'

const DIR = `${process.cwd()}/e2e/mic-calibration/fixtures`
mkdirSync(DIR, { recursive: true })
const BASE = process.env.E2E_BASE_URL || 'http://localhost:5178'
const SAMPLE_MS = 26_000

async function probe(name, wav, constraints) {
  const browser = await chromium.launch({
    channel: 'chromium',
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${wav}`,
    ],
  })
  const page = await browser.newPage()
  await page.goto(BASE)
  const trace = await page.evaluate(async ({ ms, constraints }) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints })
    const ctx = new AudioContext()
    const an = ctx.createAnalyser()
    an.fftSize = 256
    an.smoothingTimeConstant = 0.5
    ctx.createMediaStreamSource(stream).connect(an)
    const buf = new Float32Array(an.fftSize)
    const out = []
    const track = stream.getAudioTracks()[0]
    const settings = track.getSettings()
    const t0 = performance.now()
    await new Promise(res => {
      const id = setInterval(() => {
        an.getFloatTimeDomainData(buf)
        let s = 0
        for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]
        out.push([Math.round(performance.now() - t0), Math.sqrt(s / buf.length)])
        if (performance.now() - t0 > ms) { clearInterval(id); res() }
      }, 50)
    })
    return { samples: out, label: track.label, settings, rate: ctx.sampleRate }
  }, { ms: SAMPLE_MS, constraints })
  await browser.close()
  return { name, ...trace }
}

// One period of a condition, summarised: how loud is the room, the breath, the
// speech, at the analyser.
function summarise(samples) {
  const v = samples.map(s => s[1]).filter(x => x > 0)
  const sorted = [...v].sort((a, b) => a - b)
  const pct = p => sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor(p * sorted.length)))]
  return { n: samples.length, p05: pct(0.05), p50: pct(0.5), p90: pct(0.9), p99: pct(0.99), max: Math.max(...v) }
}

function sparkline(samples, floor) {
  const chars = ' .:-=+*#%@'
  const max = Math.max(...samples.map(s => s[1]))
  return samples.map(([, x]) => {
    if (x <= floor) return ' '
    const db = 20 * Math.log10(x / max)
    const i = Math.max(0, Math.min(9, Math.round((db + 60) / 60 * 9)))
    return chars[i]
  }).join('')
}

const results = {}
for (const [key, c] of Object.entries(CONDITIONS)) {
  const wav = buildMicWav(`${DIR}/probe-${key}.wav`, { ...c, breathMs: 800, periods: 8 })
  console.log(`\n=== ${key}: ${c.label}`)
  console.log(`    file: period ${wav.periodMs}ms, phrase ${wav.phraseMs}ms, breath ${wav.breathMs}ms`)
  console.log(`    written levels — speech rms ${wav.speechRms.toExponential(3)}, breath ${wav.breathRms.toExponential(3)}, room ${wav.roomRms.toExponential(3)}`)

  for (const [cname, constraints] of Object.entries({
    processed: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    raw: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  })) {
    const r = await probe(`${key}/${cname}`, wav.path, constraints)
    const s = summarise(r.samples)
    results[`${key}/${cname}`] = { wav, summary: s, settings: r.settings, label: r.label, rate: r.rate, samples: r.samples }
    console.log(`  [${cname}] track "${r.label}" ctx ${r.rate}Hz settings ${JSON.stringify(r.settings)}`)
    console.log(`  [${cname}] analyser rms  p05 ${s.p05.toExponential(3)}  p50 ${s.p50.toExponential(3)}  p90 ${s.p90.toExponential(3)}  p99 ${s.p99.toExponential(3)}  max ${s.max.toExponential(3)}`)
    console.log(`  [${cname}] ${(SAMPLE_MS / 1000).toFixed(0)}s, 50ms/char (' '=below 1e-5):`)
    for (let i = 0; i < r.samples.length; i += 100) {
      const t = (r.samples[i][0] / 1000).toFixed(1).padStart(5)
      console.log(`    ${t}s |${sparkline(r.samples.slice(i, i + 100), 1e-5)}|`)
    }
  }
}

writeFileSync(`${DIR}/probe-results.json`, JSON.stringify(results, null, 1))
console.log(`\nwrote ${DIR}/probe-results.json`)
