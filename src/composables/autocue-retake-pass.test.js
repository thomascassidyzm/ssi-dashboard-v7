// @vitest-environment jsdom
/**
 * Flag-for-re-record (Kai, 2026-08-11): in script mode the Redo button was a
 * no-op. Takes are uploaded as they are captured, so by the time the review
 * screen appears the take is already on the server — and rejectSegment only
 * ever added an id to a Set that nothing in script mode read. The card changed
 * colour and nothing else happened.
 *
 * The missing half is this second pass: listen through the lot, flag as you
 * go, then walk ONLY the flagged items and record them again. Each new take
 * rides the capture path that already supersedes the old one.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAutocueState } from '@/composables/useAutocueState'

beforeEach(() => {
  let n = 0
  vi.stubGlobal('URL', {
    createObjectURL: () => `blob:take-${++n}`,
    revokeObjectURL: () => {}
  })
})

const take = (size = 5000) => ({ blob: { size, type: 'audio/webm' }, durationMs: 1500 })

// A five-item script, all five recorded — the state a first pass ends in.
function recordedSession() {
  const autocue = useAutocueState()
  autocue.resetSession()
  autocue.state.scriptMode = true
  autocue.state.phrases = Array.from({ length: 5 }, (_, i) => ({
    id: `script-${i}`, text: `phrase ${i}`, cadence: 'natural'
  }))
  for (let i = 0; i < 5; i++) autocue.onSegmentCaptured(take(), i)
  autocue.state.currentPhase = 'review'
  return autocue
}

describe('the flag survives as far as a targeted re-record pass', () => {
  it('walks only the flagged items, in script order', () => {
    const s = recordedSession()
    // Flag out of order to prove the pass sorts rather than following clicks.
    s.rejectSegment(s.state.recordedSegments[3])
    s.rejectSegment(s.state.recordedSegments[1])

    expect(s.startRetakePass()).toBe(true)
    expect(s.state.currentPhase).toBe('recording')
    expect(s.state.retakeQueue).toEqual([1, 3])
    expect(s.state.currentPhraseIndex).toBe(1)

    // Capturing item 1 moves to the next FLAGGED item, not to item 2.
    s.onSegmentCaptured(take(), 1)
    s.advanceToNext()
    expect(s.state.currentPhraseIndex).toBe(3)
  })

  it('goes back to review when the flagged items run out, not to summary', () => {
    const s = recordedSession()
    s.rejectSegment(s.state.recordedSegments[2])
    s.startRetakePass()

    s.onSegmentCaptured(take(), 2)
    s.advanceToNext()

    expect(s.state.currentPhase).toBe('review')
    expect(s.state.retakeQueue).toEqual([])
    expect(s.state.isRecording).toBe(false)
  })

  it('supersedes the flagged take and leaves every other take untouched', () => {
    const s = recordedSession()
    const before = s.state.recordedSegments.map(seg => seg.audioUrl)
    s.rejectSegment(s.state.recordedSegments[2])
    s.startRetakePass()
    s.onSegmentCaptured(take(9000), 2)

    const after = s.state.recordedSegments.map(seg => seg.audioUrl)
    // One row per item still, the re-recorded one pointing at new audio...
    expect(s.state.recordedSegments).toHaveLength(5)
    expect(after[2]).not.toBe(before[2])
    expect(s.state.recordedSegments[2].takeNumber).toBe(2)
    // ...and the other four bit-for-bit as they were.
    expect([0, 1, 3, 4].map(i => after[i])).toEqual([0, 1, 3, 4].map(i => before[i]))
    expect([0, 1, 3, 4].every(i => s.state.recordedSegments[i].takeNumber === 1)).toBe(true)
  })

  it('clears the flag once a fresh take has landed', () => {
    const s = recordedSession()
    s.rejectSegment(s.state.recordedSegments[2])
    expect(s.state.rejectedSegments.has('seg_script-2')).toBe(true)

    s.startRetakePass()
    s.onSegmentCaptured(take(), 2)

    expect(s.state.rejectedSegments.has('seg_script-2')).toBe(false)
  })

  it('refuses a pass with nothing flagged rather than opening an empty one', () => {
    const s = recordedSession()
    expect(s.startRetakePass()).toBe(false)
    expect(s.state.currentPhase).toBe('review')
    expect(s.state.retakeQueue).toEqual([])
  })

  it('keeps Next/Previous inside the flagged list', () => {
    const s = recordedSession()
    s.rejectSegment(s.state.recordedSegments[0])
    s.rejectSegment(s.state.recordedSegments[4])
    s.startRetakePass()

    s.navigatePhrase(1)
    expect(s.state.currentPhraseIndex).toBe(4)
    // ...and does not run off the end of a two-item pass.
    s.navigatePhrase(1)
    expect(s.state.currentPhraseIndex).toBe(4)
    s.navigatePhrase(-1)
    expect(s.state.currentPhraseIndex).toBe(0)
  })

  it('does not leave a half-finished pass behind for the next session', () => {
    const s = recordedSession()
    s.rejectSegment(s.state.recordedSegments[1])
    s.startRetakePass()
    expect(s.state.retakeQueue).toEqual([1])

    s.resetSession()
    expect(s.state.retakeQueue).toEqual([])
    expect(s.state.retakeCursor).toBe(0)
  })
})

describe('finalizing a script-mode session', () => {
  it('does not upload a second time — the takes are already on the server', async () => {
    const s = recordedSession()
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    s.approveSegment(s.state.recordedSegments[0])

    await s.finalizeSession()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(s.state.recordedSegments).toEqual([])
  })
})
