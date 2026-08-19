// @vitest-environment jsdom
//
// Regression cover for the 2026-08-19 microphone-calibration finding.
//
// Kai recorded the same course content twice on the same day: fine on his
// phone's mic, cut mid-phrase on a new external mic. A microphone is a GAIN
// STAGE — the room and the voice move through it together — so the recorder's
// behaviour must not depend on how hot the mic is. Before this change it did:
// the silence gate was placed off the ROOM alone and then clamped to an
// absolute [0.01, 0.08], so on a low-output mic the gate sat inside the voice's
// own dynamic range and an ordinary mid-phrase breath closed the take.
//
// The test replays ONE recording — real human speech, a breath, real speech —
// through the real VAD at two mic gains 13dB apart, and pins the property that
// actually matters: SAME AUDIO, SAME SEGMENTATION.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useVAD, placeThreshold } from './useVAD'
import { buildPhrase, installFakeMic } from './useVAD.calibration.fixture'

// A phone-ish mic and a quieter, lower-output external one. 13.2dB apart, which
// is an ordinary spread between a phone's AGC'd output and a large-diaphragm
// mic running without a preamp.
const PHONE_GAIN = 1.0
const EXTERNAL_GAIN = 0.22

const FAKE_STREAM = { getTracks: () => [] }

/**
 * Run one take end to end and report the segments the VAD cut out of it.
 *
 * @param calibrateVoice whether the recordist did the full mic check (room AND
 *   one spoken phrase) or only the room measurement.
 */
async function replay({ gain, calibrateVoice, phrase, micCheck }) {
  const mic = installFakeMic(phrase, gain)
  const vad = useVAD()
  const segments = []
  vad.onSpeechEnd((durationMs) => segments.push(Math.round(durationMs)))
  vad.onSpeechAborted((durationMs) => segments.push({ aborted: Math.round(durationMs) }))
  await vad.startListening(FAKE_STREAM)

  const run = async (ms) => {
    for (let t = 0; t < ms; t += 50) {
      mic.advanceMs(50)
      await vi.advanceTimersByTimeAsync(50)
    }
  }

  // ── The mic check ────────────────────────────────────────────────────────
  mic.load(micCheck)
  const roomPromise = vad.calibrate(1500)
  await run(1600)
  await roomPromise
  if (calibrateVoice) {
    const voicePromise = vad.measureVoice(2500)
    await run(2600)
    await voicePromise
  }
  const calibration = { ...vad.calibration.value }

  // ── The take ─────────────────────────────────────────────────────────────
  mic.load(phrase)
  await run(phrase.samples.length / phrase.rate * 1000)

  vad.stopListening()
  return { segments, calibration }
}

describe('mic calibration: the gate follows the microphone', () => {
  let phrase, micCheck

  beforeEach(() => {
    vi.useFakeTimers()
    // The take under test, and a separate buffer for the mic check: 1.5s of the
    // same room, then the recordist saying a short phrase into it.
    phrase = buildPhrase({ breathMs: 500, breathBelowDb: 26 })
    const cal = buildPhrase({ breathMs: 0, breathBelowDb: 26 })
    micCheck = { rate: cal.rate, samples: cal.samples }
  })

  afterEach(() => {
    vi.useRealTimers()
    delete global.AudioContext
  })

  // The placement rule on its own, with no state machine in the way: a change
  // of gain must move the gate by the same number of dB, so every ratio the
  // decision depends on is unchanged.
  it('places the gate at a constant dB below the voice, whatever the gain', () => {
    const hot = placeThreshold(0.0030, 0.2300)
    const quiet = placeThreshold(0.0030 * 0.22, 0.2300 * 0.22)
    expect(quiet.threshold / hot.threshold).toBeCloseTo(0.22, 3)
    // 21dB under the voice on both — which is where the configuration that
    // demonstrably worked (0.02 against a 0.23 voice) actually sat.
    expect(20 * Math.log10(0.23 / hot.threshold)).toBeCloseTo(21, 0)
    expect(20 * Math.log10(0.23 * 0.22 / quiet.threshold)).toBeCloseTo(21, 0)
    // ...and the two rooms are equally good rooms, so they are described the same.
    expect(quiet.quality).toBe(hot.quality)
    expect(quiet.headroomDb).toBeCloseTo(hot.headroomDb, 6)
  })

  it('a mid-phrase breath does not close the take, on EITHER microphone', async () => {
    const phone = await replay({ gain: PHONE_GAIN, calibrateVoice: true, phrase, micCheck })
    const external = await replay({ gain: EXTERNAL_GAIN, calibrateVoice: true, phrase, micCheck })

    // One phrase in, one take out, both times.
    expect(phone.segments).toHaveLength(1)
    expect(external.segments).toHaveLength(1)
    // And it is the WHOLE phrase, breath included, not the first half of it.
    expect(phone.segments[0]).toBeGreaterThan(phrase.phraseMs * 0.9)
    expect(external.segments[0]).toBeGreaterThan(phrase.phraseMs * 0.9)
    // Same audio, same answer: the takes agree to within a poll or two.
    expect(Math.abs(phone.segments[0] - external.segments[0])).toBeLessThan(150)
  })

  it('a skipped mic check falls back to the fixed threshold, not to nothing', async () => {
    const mic = installFakeMic(phrase, PHONE_GAIN)
    const vad = useVAD()
    const segments = []
    vad.onSpeechEnd(d => segments.push(Math.round(d)))
    await vad.startListening(FAKE_STREAM)
    vad.useFixedThreshold()
    expect(vad.calibration.value).toBeNull()
    expect(vad.silenceThresholdNow()).toBe(0.02)
    for (let t = 0; t < phrase.samples.length / phrase.rate * 1000; t += 50) {
      mic.advanceMs(50)
      await vi.advanceTimersByTimeAsync(50)
    }
    vad.stopListening()
    // Today's behaviour, unchanged, on the mic today's behaviour was tuned for.
    expect(segments.length).toBeGreaterThanOrEqual(1)
  })
})
