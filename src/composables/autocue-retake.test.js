// @vitest-environment jsdom
/**
 * Re-recording a phrase (Sascha, 2026-08-10): the second take landed BESIDE
 * the first instead of replacing it. Every take of a slot got its own review
 * card, and because the card id is derived from the phrase they all shared one
 * identity — so pressing play on the new one lit up every old one, and a
 * verdict on one card was a verdict on all of them.
 *
 * Second symptom, same session: "1 failed" on a session nothing failed in.
 * A sub-minimum burst (a cough, a chair) left the recorder's capture open
 * indefinitely; the next Stop closed it and shipped near-silence, which the
 * server's silent-take guard refused 422.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAutocueState } from '@/composables/useAutocueState'
import { useUploadQueue } from '@/composables/useAudioUpload'

const revoked = []

beforeEach(() => {
  revoked.length = 0
  let n = 0
  vi.stubGlobal('URL', {
    createObjectURL: () => `blob:take-${++n}`,
    revokeObjectURL: (u) => revoked.push(u)
  })
})

function freshSession() {
  const autocue = useAutocueState()
  autocue.resetSession()
  autocue.state.phrases = [
    { id: 'script-0', text: 'ich möchte sprechen', cadence: 'natural' },
    { id: 'script-1', text: 'ich kann es versuchen', cadence: 'slow' }
  ]
  return autocue
}

const take = (size) => ({ blob: { size, type: 'audio/webm' }, durationMs: 1500 })

describe('a re-recorded phrase supersedes its earlier take', () => {
  it('keeps one segment per phrase instead of appending a duplicate', () => {
    const { state, onSegmentCaptured } = freshSession()

    onSegmentCaptured(take(5000), 0)
    onSegmentCaptured(take(6000), 1)
    onSegmentCaptured(take(7000), 0) // re-record of item 0

    expect(state.recordedSegments).toHaveLength(2)
    expect(state.recordedSegments.map(s => s.phraseId)).toEqual(['script-0', 'script-1'])
    // ...and in place, so the review grid keeps script order
    expect(state.recordedSegments[0].id).toBe('seg_script-0')
  })

  it('points the surviving segment at the NEW audio and frees the old url', () => {
    const { state, onSegmentCaptured } = freshSession()

    onSegmentCaptured(take(5000), 0)
    const firstUrl = state.recordedSegments[0].audioUrl
    onSegmentCaptured(take(7000), 0)

    expect(state.recordedSegments[0].audioUrl).not.toBe(firstUrl)
    expect(state.audioRecordings.get('script-0').url).toBe(state.recordedSegments[0].audioUrl)
    expect(revoked).toContain(firstUrl)
  })

  it('numbers the takes so the recordist can see the retake landed', () => {
    const { state, onSegmentCaptured } = freshSession()

    onSegmentCaptured(take(5000), 0)
    expect(state.recordedSegments[0].takeNumber).toBe(1)
    onSegmentCaptured(take(7000), 0)
    expect(state.recordedSegments[0].takeNumber).toBe(2)
    onSegmentCaptured(take(7000), 0)
    expect(state.recordedSegments[0].takeNumber).toBe(3)
  })

  it('drops the old take\'s verdict rather than applying it to the new one', () => {
    const { state, onSegmentCaptured, approveSegment, rejectSegment } = freshSession()

    onSegmentCaptured(take(5000), 0)
    approveSegment(state.recordedSegments[0])
    expect(state.approvedSegments.size).toBe(1)

    onSegmentCaptured(take(7000), 0)
    expect(state.approvedSegments.size).toBe(0)

    rejectSegment(state.recordedSegments[0])
    onSegmentCaptured(take(7000), 0)
    expect(state.rejectedSegments.size).toBe(0)
  })
})

describe('upload queue under re-records', () => {
  let queue

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ success: true }) })))
    queue = useUploadQueue()
    queue.resetQueue()
  })

  it('clears an earlier failure for a slot that has just been re-recorded', () => {
    queue.failedIndices.add(3)
    queue.failedReasons.set(3, 'This take contains no audible speech')

    // Nothing to actually POST in jsdom — queueUpload's bookkeeping is what
    // the summary count reads, and it must forget the superseded verdict.
    queue.queueUpload({ blob: new Blob(), courseCode: 'deu_at', uuid: null, metadata: {}, provenance: {}, itemIndex: 3 })

    expect(queue.failedIndices.has(3)).toBe(false)
    expect(queue.failedReasons.has(3)).toBe(false)
  })
})
