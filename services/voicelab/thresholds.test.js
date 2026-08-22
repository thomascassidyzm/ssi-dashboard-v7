/**
 * THE THRESHOLDS ACTUALLY REACH THE GATES — and the defaults did not move.
 *
 * VOICELAB puts gate thresholds on sliders. That is only worth anything if two things
 * hold, and they are the two things this file pins:
 *
 *   1. A moved threshold CHANGES THE VERDICT. A control the gate ignores is worse than
 *      no control, because it produces a run report about a threshold nobody applied.
 *   2. An ABSENT threshold changes nothing, bit for bit. Every production caller passes
 *      no thresholds at all, and the day this file's second half fails is the day a lab
 *      feature silently re-tuned the live admission gate.
 *
 * Pure: no audio, no ffmpeg, no whisper. These are the parameter paths, not the physics.
 *
 * Run: npx vitest run services/voicelab/thresholds.test.js
 */

import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require_ = createRequire(import.meta.url)
const speechSpan = require_('../audio-intelligence/tiers/speech-span.cjs')
const edge = require_('../audio-intelligence/tiers/tier2-edge-shape.cjs')
const loudness = require_('../audio-intelligence/tiers/loudness.cjs')
const veracity = require_('../audio-veracity.cjs')
const gateStack = require_('../audio-intelligence/gate-stack.cjs')

/** A frame track with a clear noise floor and a burst of speech in the middle. */
const frames = (floorDb, speechDb, floorCount, speechCount) => [
  ...Array(floorCount).fill(floorDb),
  ...Array(speechCount).fill(speechDb),
  ...Array(floorCount).fill(floorDb),
]

describe('speech-span — the floor delta and the minimum span', () => {
  it('DEFAULT: absent opts, the shipped 12 dB delta decides exactly as before', () => {
    const db = frames(-60, -45, 20, 30) // 15 dB above the floor: speech under the default
    expect(speechSpan.spanFromFrames(db).speechMs).toBe(300)
    expect(speechSpan.spanFromFrames(db)).toEqual(speechSpan.spanFromFrames(db, speechSpan.FRAME_MS, {}))
  })

  it('a stricter delta finds no speech in the same frames', () => {
    const db = frames(-60, -45, 20, 30)
    const strict = speechSpan.spanFromFrames(db, speechSpan.FRAME_MS, { speechAboveFloorDb: 20 })
    expect(strict.speechMs).toBe(0)
    expect(strict.reason).toMatch(/rises 20 dB above/)
  })

  it('a looser delta widens the span into what the default called floor', () => {
    const db = [...Array(10).fill(-60), ...Array(10).fill(-55), ...Array(10).fill(-40), ...Array(10).fill(-60)]
    const dflt = speechSpan.spanFromFrames(db)
    const loose = speechSpan.spanFromFrames(db, speechSpan.FRAME_MS, { speechAboveFloorDb: 3 })
    expect(loose.speechMs).toBeGreaterThan(dflt.speechMs)
  })

  it('DEFAULT: the 100 ms floor still refuses a stub, and passes a real clip', () => {
    const stub = { measured: true, speechMs: 40, fileMs: 500 }
    expect(speechSpan.verdict(stub).pass).toBe(false)
    expect(speechSpan.verdict(stub).reason).toMatch(/100 ms floor/)
    expect(speechSpan.verdict({ measured: true, speechMs: 400, fileMs: 900, reason: 'ok' }).pass).toBe(true)
  })

  it('a raised floor refuses a clip the default admitted, and says the new number', () => {
    const clip = { measured: true, speechMs: 400, fileMs: 900, reason: 'ok' }
    expect(speechSpan.verdict(clip).pass).toBe(true)
    const strict = speechSpan.verdict(clip, { minSpeechMs: 600 })
    expect(strict.pass).toBe(false)
    expect(strict.reason).toMatch(/600 ms floor/)
  })

  it('an unmeasurable span is still `null`, whatever the thresholds say', () => {
    expect(speechSpan.verdict({ measured: false }, { minSpeechMs: 1 }).pass).toBe(null)
  })
})

describe('loudness — the band is the threshold, and merging keeps the untouched legs', () => {
  const measured = { measured: true, lufs: -18.0, truePeakDbtp: -3.0, lra: 4 }

  it('DEFAULT: -18 LUFS is outside the shipped band and fails', () => {
    expect(loudness.verdict(measured).pass).toBe(false)
    expect(loudness.verdict(measured).band.targetLufs).toBe(loudness.DEFAULT_BAND.targetLufs)
  })

  it('the same clip passes against a band the lab moved to it', () => {
    const v = loudness.verdict(measured, { targetLufs: -18, toleranceDb: 1 })
    expect(v.pass).toBe(true)
    // The ceiling nobody touched keeps the shipped value.
    expect(v.band.truePeakCeilingDbtp).toBe(loudness.DEFAULT_BAND.truePeakCeilingDbtp)
  })

  it('a tightened true-peak ceiling refuses a peak the default allowed', () => {
    expect(loudness.verdict(measured, { targetLufs: -18, toleranceDb: 1, truePeakCeilingDbtp: -6 }).pass).toBe(false)
  })
})

describe('tail-shape — the tier already took overrides; the lab hands it the same shape', () => {
  it('DEFAULT: check() reports the shipped thresholds when given none', () => {
    const silent = new Int16Array(16000) // digital silence: nothing to judge
    expect(edge.check(silent).thresholds).toEqual(edge.THRESHOLDS)
  })

  it('an override is echoed back on the verdict, so a run record says what it was judged against', () => {
    const silent = new Int16Array(16000)
    const r = edge.check(silent, { fallRateDbPerMs: 0.2 })
    expect(r.thresholds.fallRateDbPerMs).toBe(0.2)
    expect(r.thresholds.zeroPadPct).toBe(edge.THRESHOLDS.zeroPadPct)
  })
})

describe('words — the CER operating point', () => {
  // 7 characters out of 39: over the edit-distance floor, comfortably under the shipped
  // 0.3 ratio. Exactly the band where moving the threshold has to change the answer.
  //
  // The decode keeps the script's LAST WORD deliberately. Rule 3 of
  // verdictFromDecode (Tom, 2026-08-07: a clip whose last word is missing fails
  // whatever the CER says) is a separate event from the ratio, and this block is
  // about the ratio alone — a decode that also dropped the ending would fail
  // here for the other reason and stop testing the operating point.
  const expected = 'guten Abend wie geht es dir heute Abend'
  const decode = 'guten Abend wie geht es dir vorgestern Abend'

  it('DEFAULT: absent opts, the shipped 0.3 threshold applies exactly as before', () => {
    const a = veracity.verdictFromDecode(decode, expected, 'de')
    const b = veracity.verdictFromDecode(decode, expected, 'de', {})
    expect(a).toEqual(b)
    expect(a.threshold).toBe(veracity.CER_THRESHOLD)
  })

  it('a stricter threshold refuses a decode the default passed', () => {
    const dflt = veracity.verdictFromDecode(decode, expected, 'de')
    expect(dflt.pass).toBe(true) // ~0.2 CER, under the shipped 0.3
    const strict = veracity.verdictFromDecode(decode, expected, 'de', { cerThreshold: 0.05 })
    expect(strict.pass).toBe(false)
    expect(strict.threshold).toBe(0.05)
    expect(strict.reason).toBe('cer_above_threshold')
  })

  it('the edit-distance floor underneath is NOT overridable — a one-word clip cannot be flagged by a ratio alone', () => {
    // "mir" heard as "Mia" is one character out of three: a huge ratio, a tiny error.
    const v = veracity.verdictFromDecode('Mia.', 'mir', 'de', { cerThreshold: 0.01 })
    expect(v.pass).toBe(true)
    expect(v.edits).toBeLessThan(veracity.MIN_EDIT_DISTANCE)
  })

  it('a decode with no speech in it still fails, whatever the threshold is set to', () => {
    expect(veracity.verdictFromDecode('[Musik]', expected, 'de', { cerThreshold: 99 }).reason).toBe('non_speech_decode')
  })
})

describe('gate-stack — opts.thresholds is carried and recorded', () => {
  it('a verdict records the thresholds it was judged against', async () => {
    // Undecodable bytes: every tier that needs samples reports "cannot measure", which is
    // the point — this asserts the PARAMETER PATH, not the physics.
    const thresholds = { loudness: { targetLufs: -20 }, words: { cerThreshold: 0.4 } }
    const v = await gateStack.evaluate(
      { audio: Buffer.from('not audio'), text: 'guten Tag', language: 'deu', voiceId: 'v', provider: 'azure' },
      { role: 'admission', only: ['speech-span'], thresholds }
    )
    expect(v.thresholds).toEqual(thresholds)
    expect(v.outcome).toBe('quarantined') // unmeasured is not passed — unchanged behaviour
  })

  it('a production call with no thresholds records none, and still refuses what it always refused', async () => {
    const v = await gateStack.evaluate(
      { audio: Buffer.from('not audio'), text: 'guten Tag', language: 'deu', voiceId: 'v', provider: 'azure' },
      { role: 'admission', only: ['speech-span'] }
    )
    expect(v.thresholds).toBe(null)
    expect(v.gates['speech-span'].pass).toBe(null)
    expect(v.refusedBy).toContain('speech-span')
  })
})
