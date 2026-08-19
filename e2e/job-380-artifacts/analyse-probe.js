// Read probe-results.json and answer, in numbers, the questions the whole
// verification turns on:
//
//   - what does the room, the mid-phrase breath and the body of the speech
//     actually measure AT THE ANALYSER on each of the two fake microphones,
//     after Chromium's echo-cancel / noise-suppression / AGC chain?
//   - is the two conditions' gain difference still there afterwards, or did AGC
//     flatten it (in which case the two conditions are one microphone and the
//     contrast run proves nothing)?
//   - where does placeThreshold() put the gate on each, and does the BREATH
//     fall under it — which is the exact mechanism that cuts a phrase in half?
//
// The percentiles are the ones the product uses: p90 for the room (useVAD
// calibrate) and p75 of above-floor frames for the voice (measureVoice).
import { readFileSync } from 'fs'

const R = JSON.parse(readFileSync(`${process.cwd()}/e2e/mic-calibration/fixtures/probe-results.json`, 'utf8'))
const db = x => 20 * Math.log10(x)
const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.max(0, Math.min(s.length - 1, Math.floor(p * s.length)))]
}

// Mirrors src/composables/useVAD.ts placeThreshold — kept as an independent
// re-implementation on purpose: this file is measuring the product, not calling it.
const GATE_BELOW_VOICE_DB = 21, GATE_ABOVE_FLOOR_DB = 12
const MIN_GAP = GATE_BELOW_VOICE_DB + GATE_ABOVE_FLOOR_DB
function placeThreshold(floor, voice) {
  const head = floor > 0 ? db(voice) - db(floor) : Infinity
  const tdb = !(floor > 0) || head >= MIN_GAP
    ? db(voice) - GATE_BELOW_VOICE_DB
    : db(floor) + head * (GATE_ABOVE_FLOOR_DB / MIN_GAP)
  return { threshold: Math.min(0.08, Math.max(0.0006, Math.pow(10, tdb / 20))), headroomDb: head }
}

for (const [name, r] of Object.entries(R)) {
  const lv = r.samples.map(s => s[1])
  const t = r.samples.map(s => s[0])

  // Split the trace into the three populations by level, using the written
  // ratios as the only prior: the file says the breath sits 26dB under the
  // speech and the room 40 or 55dB under it, so the two gaps are wide enough
  // to cut on without ever asking the VAD what it thinks.
  const top = pct(lv, 0.995)
  const speech = lv.filter(x => x > top * Math.pow(10, -12 / 20))
  const rest = lv.filter(x => x <= top * Math.pow(10, -12 / 20))
  const quiet = pct(rest, 0.30)
  const room = rest.filter(x => x <= quiet * 3)
  const breath = rest.filter(x => x > quiet * 3)

  const floor = pct(room, 0.90)            // what calibrate() would measure
  const voice = pct(speech, 0.75)          // what measureVoice() would measure
  const breathP50 = breath.length ? pct(breath, 0.5) : NaN
  const placed = placeThreshold(floor, voice)

  console.log(`\n── ${name}`)
  console.log(`   room p90        ${floor.toExponential(3)}`)
  console.log(`   breath p50      ${breathP50.toExponential(3)}   (${(db(breathP50) - db(voice)).toFixed(1)}dB under the voice)`)
  console.log(`   voice p75       ${voice.toExponential(3)}`)
  console.log(`   headroom        ${placed.headroomDb.toFixed(1)}dB`)
  console.log(`   gate placed at  ${placed.threshold.toExponential(3)}   (${(db(voice) - db(placed.threshold)).toFixed(1)}dB under the voice, ${(db(placed.threshold) - db(floor)).toFixed(1)}dB over the room)`)
  console.log(`   BREATH vs GATE  breath is ${(db(breathP50) - db(placed.threshold)).toFixed(1)}dB ${breathP50 > placed.threshold ? 'ABOVE the gate — heard as speech, take stays whole' : 'BELOW the gate — heard as SILENCE, an 800ms breath closes the take'}`)
  console.log(`   vs OLD fixed 0.02: breath is ${(db(breathP50) - db(0.02)).toFixed(1)}dB ${breathP50 > 0.02 ? 'ABOVE' : 'BELOW'} it; voice is ${(db(voice) - db(0.02)).toFixed(1)}dB over it`)
  console.log(`   frames > gate: ${(lv.filter(x => x > placed.threshold).length / lv.length * 100).toFixed(1)}%   > 0.02: ${(lv.filter(x => x > 0.02).length / lv.length * 100).toFixed(1)}%`)
}

// The one question that decides whether the two conditions ARE two microphones.
const p = R['phone/processed'], e = R['external/processed']
const sp = a => pct(a.samples.map(s => s[1]).filter(x => x > pct(a.samples.map(s => s[1]), 0.995) * 0.25), 0.75)
console.log(`\n── conditions, after Chromium's processing chain`)
console.log(`   written gain difference : ${db(0.2).toFixed(1)}dB`)
console.log(`   measured voice difference: ${(db(sp(e)) - db(sp(p))).toFixed(1)}dB  ← what the recorder actually sees`)
