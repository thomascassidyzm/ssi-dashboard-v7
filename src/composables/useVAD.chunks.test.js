// @vitest-environment jsdom
// Regression cover for the 2026-08-07 slow-cadence interaction bug.
//
// Two features shipped the same day fought each other. The autocue's slow pass
// draws a gap marker between LEGO chunks, telling the recordist WHERE to pause.
// The VAD cut a take after 800ms of silence. So the moment Kai did what the UI
// told him to do, the take was cut at the first gap and the rest of the phrase
// was lost. His workaround was to read straight through, which defeats the
// pause markers he had asked for that morning.
//
// The fix is not a bigger constant. Measured on Kai's own 72.5s take, the gap
// he leaves BETWEEN phrases runs as short as 600ms, so a flat 2500ms would
// merge phrases into one blob — the failure the VAD was fixed for that same
// morning, arriving from the other side. Instead the long tolerance is spent
// only while chunks are still outstanding, and the LAST pause of the phrase
// still cuts at 800ms.
//
// These tests pin all four corners of that: mid-phrase pauses survive, the
// phrase still ends promptly, natural-speed phrases are untouched, and nothing
// can hang forever.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useVAD } from './useVAD'

function makeAudioGraph() {
  const state = { amplitude: 0 }
  const analyser = {
    fftSize: 256,
    smoothingTimeConstant: 0.5,
    frequencyBinCount: 128,
    getFloatTimeDomainData(out) {
      for (let i = 0; i < out.length; i++) {
        out[i] = state.amplitude * Math.sin((2 * Math.PI * 8 * i) / out.length)
      }
    },
    getByteFrequencyData(out) { out.fill(110) }
  }
  global.AudioContext = class {
    createAnalyser() { return analyser }
    createMediaStreamSource() { return { connect() {} } }
    close() {}
  }
  return state
}

// Amplitudes measured off a real take: speech ~0.23 RMS, room tone ~0.003.
const SPEECH = 0.3
const ROOM = 0.004

describe('useVAD chunk-aware silence tolerance', () => {
  let state
  const advance = (ms) => vi.advanceTimersByTime(ms)

  beforeEach(() => {
    vi.useFakeTimers()
    state = makeAudioGraph()
  })

  afterEach(() => {
    vi.useRealTimers()
    delete global.AudioContext
  })

  // Read a phrase of `chunks` chunks, pausing `pauseMs` between them.
  async function readPhrase(vad, { chunks, pauseMs, speakMs = 600 }) {
    for (let i = 0; i < chunks; i++) {
      state.amplitude = SPEECH
      advance(speakMs)
      if (i < chunks - 1) {
        state.amplitude = ROOM
        advance(pauseMs)
      }
    }
  }

  it('survives the pause the gap marker asks for, in a 3-chunk slow phrase', async () => {
    const vad = useVAD({ expectedChunks: 3 })
    const onSpeechEnd = vi.fn()
    vad.onSpeechEnd(onSpeechEnd)
    await vad.startListening({ getTracks: () => [] })

    // A deliberate 1200ms pause at each gap marker — well past the old 800ms
    // that was cutting Kai's takes, and past the longest mid-phrase pause
    // actually measured on his read (1700ms is the outer bound we allow for).
    await readPhrase(vad, { chunks: 3, pauseMs: 1200 })

    // The whole phrase is still one take. This is the bug: it used to be three.
    expect(onSpeechEnd).not.toHaveBeenCalled()
    expect(vad.isSpeaking.value).toBe(true)

    vad.stopListening()
  })

  it('still cuts promptly once the last chunk is read', async () => {
    const vad = useVAD({ expectedChunks: 3 })
    const onSpeechEnd = vi.fn()
    vad.onSpeechEnd(onSpeechEnd)
    await vad.startListening({ getTracks: () => [] })

    await readPhrase(vad, { chunks: 3, pauseMs: 1200 })

    // End of the phrase. The take must close on the SHORT threshold, not the
    // long one, or the studio starts merging this phrase into the next.
    state.amplitude = ROOM
    advance(850) // just past silenceDuration (800ms), far short of 2500ms

    expect(onSpeechEnd).toHaveBeenCalledTimes(1)
    expect(vad.isSpeaking.value).toBe(false)

    vad.stopListening()
  })

  it('leaves natural-speed phrases on the old 800ms cut-off', async () => {
    // expectedChunks defaults to 1 — every natural phrase, and any phrase with
    // no chunk map at all.
    const vad = useVAD()
    const onSpeechEnd = vi.fn()
    vad.onSpeechEnd(onSpeechEnd)
    await vad.startListening({ getTracks: () => [] })

    state.amplitude = SPEECH
    advance(1000)
    state.amplitude = ROOM
    advance(850)

    expect(onSpeechEnd).toHaveBeenCalledTimes(1)

    vad.stopListening()
  })

  it('does not hang forever when the recordist runs the chunks together', async () => {
    // Declared 3 chunks, read as one breath: the counter never reaches 3, so
    // the long tolerance is what closes the take. It must still close — this
    // is the "stuck on Speaking..." failure mode from the morning, and it must
    // not come back through this door.
    const vad = useVAD({ expectedChunks: 3 })
    const onSpeechEnd = vi.fn()
    vad.onSpeechEnd(onSpeechEnd)
    await vad.startListening({ getTracks: () => [] })

    state.amplitude = SPEECH
    advance(1500)
    state.amplitude = ROOM

    advance(850)
    expect(onSpeechEnd).not.toHaveBeenCalled() // waiting out the long window

    advance(3400) // total 4250ms > interChunkSilenceDuration
    expect(onSpeechEnd).toHaveBeenCalledTimes(1)
    expect(vad.isSpeaking.value).toBe(false)

    vad.stopListening()
  })

  it('does not count an ordinary breath as a chunk boundary', async () => {
    // A 200ms dip is under chunkPauseDuration (400ms), so it must NOT advance
    // the counter. If it did, the counter would hit expectedChunks early and
    // the next real gap-marker pause would cut the take mid-phrase — the bug,
    // rebuilt out of hesitation instead of instruction.
    const vad = useVAD({ expectedChunks: 2 })
    const onSpeechEnd = vi.fn()
    vad.onSpeechEnd(onSpeechEnd)
    await vad.startListening({ getTracks: () => [] })

    state.amplitude = SPEECH
    advance(600)
    state.amplitude = ROOM
    advance(200)            // breath, not a boundary
    state.amplitude = SPEECH
    advance(600)
    expect(vad.chunksSeen.value).toBe(0)

    // First real gap marker. Still chunk 1 of 2, so it must survive.
    state.amplitude = ROOM
    advance(1200)
    expect(onSpeechEnd).not.toHaveBeenCalled()

    state.amplitude = SPEECH
    advance(600)
    expect(vad.chunksSeen.value).toBe(1)

    vad.stopListening()
  })

  it('re-arms per take, so a long phrase does not poison the next one', async () => {
    const vad = useVAD({ expectedChunks: 2 })
    const onSpeechEnd = vi.fn()
    vad.onSpeechEnd(onSpeechEnd)
    await vad.startListening({ getTracks: () => [] })

    // Take 1: two chunks with a gap, then the end.
    await readPhrase(vad, { chunks: 2, pauseMs: 1200 })
    state.amplitude = ROOM
    advance(850)
    expect(onSpeechEnd).toHaveBeenCalledTimes(1)
    expect(vad.chunksSeen.value).toBe(0)

    // Take 2 on the same live recorder gets the full tolerance again.
    await readPhrase(vad, { chunks: 2, pauseMs: 1200 })
    expect(onSpeechEnd).toHaveBeenCalledTimes(1)
    state.amplitude = ROOM
    advance(850)
    expect(onSpeechEnd).toHaveBeenCalledTimes(2)

    vad.stopListening()
  })

  it('does not spawn a phantom follow-on segment across a long deliberate pause', async () => {
    // Kai's live console, 2026-08-07: item 2 captured fine, then item 3 was
    // captured moments later as a near-empty segment — 12ms of audible speech
    // after trim, refused 422 by the server's silent-take guard. That phantom
    // is the tail end of a pause the recorder should never have cut in: the cut
    // fires, the studio advances the autocue, and the recordist resumes into
    // the NEXT item's slot with every take after that one step out of line.
    //
    // The requirement is therefore stronger than "cut later". A deliberate
    // pause must produce NO cut at all, so there is no second segment to be
    // near-empty in the first place. Note the pause here is 3000ms — far past
    // anything the old 800ms could survive.
    const vad = useVAD({ expectedChunks: 3 })
    const onSpeechEnd = vi.fn()
    const onSpeechStart = vi.fn()
    vad.onSpeechEnd(onSpeechEnd)
    vad.onSpeechStart(onSpeechStart)
    await vad.startListening({ getTracks: () => [] })

    state.amplitude = SPEECH
    advance(800)
    state.amplitude = ROOM
    advance(3000)          // the deliberate inter-LEGO pause

    // No cut, so no upload, so no advance, so no phantom slot to fill.
    expect(onSpeechEnd).not.toHaveBeenCalled()
    // And critically the take was never re-opened: exactly one speech start for
    // the whole phrase. A second start here IS the phantom segment.
    expect(onSpeechStart).toHaveBeenCalledTimes(1)

    state.amplitude = SPEECH
    advance(800)
    state.amplitude = ROOM
    advance(3000)          // second gap marker, still mid-phrase
    expect(onSpeechEnd).not.toHaveBeenCalled()
    expect(onSpeechStart).toHaveBeenCalledTimes(1)

    // Last chunk, then the real end — one take, one segment, cut promptly.
    state.amplitude = SPEECH
    advance(800)
    state.amplitude = ROOM
    advance(850)
    expect(onSpeechEnd).toHaveBeenCalledTimes(1)
    expect(onSpeechStart).toHaveBeenCalledTimes(1)

    vad.stopListening()
  })

  it('honours expectedChunks changed mid-session by the autocue', async () => {
    // The recorder is long-lived: one startFlow() spans the whole script, and
    // the studio pushes a new expectedChunks as each phrase comes up. A value
    // that only applied at construction would be wrong from phrase two onward.
    const vad = useVAD()
    const onSpeechEnd = vi.fn()
    vad.onSpeechEnd(onSpeechEnd)
    await vad.startListening({ getTracks: () => [] })

    vad.updateConfig({ expectedChunks: 2 })

    state.amplitude = SPEECH
    advance(600)
    state.amplitude = ROOM
    advance(1200)

    expect(onSpeechEnd).not.toHaveBeenCalled()

    vad.stopListening()
  })
})
