// @vitest-environment jsdom
//
// Regression test for the 2026-08-19 recordist truncation.
//
// THE DEFECT. useVAD decided "have they stopped talking?" against an ABSOLUTE
// level (silenceThreshold). calibrate() derives that level from the room and
// clamps it at MAX_THRESHOLD = 0.08, and in a room whose measured floor reaches
// 0.02 the clamp is what you get. 0.08 sits INSIDE ordinary speech — the takes
// Kai recorded that day measure a p95 of 0.10-0.25 — so the quieter half of a
// phrase read as "silence". The 800ms end-of-speech timer then ran to
// completion while the recordist was still reading, and the take was cut
// mid-word.
//
// That is why the truncated takes end with NO trailing silence: the silence the
// VAD timed was never silence, it was speech under the threshold, so the blob
// ends at full amplitude on the last syllable it kept. Across the 116 raw
// browser uploads from that day the median trailing silence is 810ms — exactly
// what an 800ms cut predicts — while the truncated ones sit at 0-30ms.
//
// The fixture below is the real thing: the 50ms RMS trace of a take that was
// cut after "...ennen kuin", with "me muutettiin" never recorded.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useVAD } from './useVAD'
import fixture from './__fixtures__/truncated-take-levels.json'

// Drive the composable off a scripted level trace: a fake AnalyserNode that
// hands out one fixture sample per poll, and a clock that advances with it.
function mountVadOverTrace(rms, { silenceThreshold, noiseFloor }) {
  let cursor = 0
  const analyser = {
    fftSize: 256,
    smoothingTimeConstant: 0.5,
    getFloatTimeDomainData(arr) {
      // A constant-valued frame whose RMS is exactly the fixture sample.
      const v = rms[Math.min(cursor, rms.length - 1)]
      arr.fill(v)
    }
  }
  vi.stubGlobal('AudioContext', class {
    createAnalyser() { return analyser }
    createMediaStreamSource() { return { connect() {} } }
    close() {}
  })
  const vad = useVAD({ silenceThreshold, pollInterval: 50, silenceDuration: 800, minSpeechDuration: 300 })
  return {
    vad,
    // Step the trace forward one poll, keeping Date.now() in lockstep.
    step() { cursor++; vi.advanceTimersByTime(50) },
    length: rms.length,
    // Pretend the room was measured, so the relative floor has its lower bound.
    primeCalibration() { vad.calibration.value = { noiseFloor, threshold: silenceThreshold, headroomDb: 20, quality: 'loud', message: '' } }
  }
}

describe('useVAD — a take is not ended while the recordist is still speaking', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('does not cut the real 2026-08-19 take short at the clamped 0.08 threshold', async () => {
    // 0.08 is MAX_THRESHOLD — what calibrate() returns for any room measuring
    // 0.02 or noisier, which is an ordinary laptop in an ordinary room.
    const h = mountVadOverTrace(fixture.rms, { silenceThreshold: 0.08, noiseFloor: 0.02 })
    let endedAtMs = null
    h.vad.onSpeechEnd((durationMs) => { if (endedAtMs === null) endedAtMs = durationMs })
    await h.vad.startListening({ getTracks: () => [] })
    h.primeCalibration()
    for (let i = 0; i < h.length; i++) h.step()

    // Before the fix this ended the take at ~2150ms — one 10ms frame from the
    // 2160ms blob that actually reached S3, mid-sentence. The recordist was
    // still talking, and nothing told them the tool had stopped listening.
    expect(endedAtMs).toBeNull()
    h.vad.stopListening()
  })

  it('still ends a take when the recordist genuinely stops', async () => {
    // Same speech, then real room tone. The relative floor must not make the
    // VAD deaf to a true ending — that is the 2026-08-07 failure, where a whole
    // read arrived as a single blob because no cut ever fired.
    const trace = [...fixture.rms, ...Array(40).fill(0.003)]
    const h = mountVadOverTrace(trace, { silenceThreshold: 0.08, noiseFloor: 0.003 })
    let ended = false
    h.vad.onSpeechEnd(() => { ended = true })
    await h.vad.startListening({ getTracks: () => [] })
    h.primeCalibration()
    for (let i = 0; i < trace.length; i++) h.step()

    expect(ended).toBe(true)
    h.vad.stopListening()
  })

  it('reports a cut that landed while the signal was still loud', async () => {
    // Explicability: whatever else is true, a take the tool ends early has to
    // say so. Speech that stops dead with no decay at all — the shape of a
    // truncation rather than an ending.
    const trace = [...Array(30).fill(0.2), ...Array(30).fill(0.05)]
    const h = mountVadOverTrace(trace, { silenceThreshold: 0.1, noiseFloor: 0.05 })
    let report = null
    h.vad.onSpeechEnd((_d, _g, pauses) => { report ??= pauses })
    await h.vad.startListening({ getTracks: () => [] })
    h.primeCalibration()
    for (let i = 0; i < trace.length; i++) h.step()

    expect(report).not.toBeNull()
    expect(report.dropAtCutDb).toBeLessThan(15)
    expect(report.endedWhileLoud).toBe(true)
    h.vad.stopListening()
  })
})
