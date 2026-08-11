// @vitest-environment jsdom
/**
 * The session-review play button. It was silent because nothing joined up:
 * SegmentCard emitted 'play', SessionReview re-emitted it, and AutocueStudio
 * listened for neither — and in script mode the segments handed to the review
 * screen carried no audioUrl at all. These guard both halves.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SegmentCard from './SegmentCard.vue'
import SessionReview from './SessionReview.vue'
import { useAutocueState } from '@/composables/useAutocueState'

const withAudio = {
  id: 'seg_1', phraseId: 1, label: 'Phrase #001', text: 'dw i eisiau siarad',
  duration: '1.4', issues: [], hasRecording: true, audioUrl: 'blob:fake-1'
}
const silent = { ...withAudio, id: 'seg_2', phraseId: 2, hasRecording: false, audioUrl: null, issues: ['No recording'] }

describe('play control wiring', () => {
  it('emits the segment when the play button is clicked', async () => {
    const w = mount(SegmentCard, { props: { segment: withAudio } })
    await w.findAll('.segment-btn')[0].trigger('click')
    expect(w.emitted('play')[0][0]).toEqual(withAudio)
  })

  it('carries the play event up through SessionReview', async () => {
    const w = mount(SessionReview, { props: { segments: [withAudio] } })
    await w.findAll('.segment-btn')[0].trigger('click')
    expect(w.emitted('play')[0][0]).toEqual(withAudio)
  })

  it('disables play on a segment with no captured audio', () => {
    const w = mount(SegmentCard, { props: { segment: silent } })
    expect(w.findAll('.segment-btn')[0].attributes('disabled')).toBeDefined()
  })

  it('marks the currently playing card', () => {
    const w = mount(SessionReview, { props: { segments: [withAudio], playingSegmentId: 'seg_1' } })
    expect(w.find('.segment-btn').classes()).toContain('playing')
  })
})

describe('useAutocueState playback', () => {
  let played

  beforeEach(() => {
    played = []
    vi.stubGlobal('Audio', class {
      constructor() { this.src = null }
      play() { played.push(this.src); this.onended?.(); return Promise.resolve() }
      pause() {}
    })
  })

  it('plays the segment audio url', async () => {
    const { playSegment } = useAutocueState()
    await expect(playSegment(withAudio)).resolves.toBe(true)
    expect(played).toEqual(['blob:fake-1'])
  })

  it('does not throw, and plays nothing, for a segment with no audio', async () => {
    const { playSegment } = useAutocueState()
    await expect(playSegment(silent)).resolves.toBe(false)
    expect(played).toEqual([])
  })

  it('plays every segment that has audio, in order, for Play All', async () => {
    const { state, playAllSegments, resetSession } = useAutocueState()
    resetSession()
    state.recordedSegments = [withAudio, silent, { ...withAudio, id: 'seg_3', audioUrl: 'blob:fake-3' }]
    await playAllSegments()
    expect(played).toEqual(['blob:fake-1', 'blob:fake-3'])
  })
})

describe('script-mode segments reach review playable', () => {
  it('gives a VAD-captured segment an audioUrl', () => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:captured', revokeObjectURL: () => {} })
    const { state, onSegmentCaptured, resetSession } = useAutocueState()
    resetSession()
    state.phrases = [{ id: 7, text: 'bore da', translation: 'good morning', cadence: 'natural' }]

    onSegmentCaptured({ blob: new Blob(['x'.repeat(5000)], { type: 'audio/webm' }), durationMs: 1400 }, 0)

    const seg = state.recordedSegments[0]
    expect(seg.audioUrl).toBe('blob:captured')
    expect(seg.hasRecording).toBe(true)
    expect(seg.label).toBe('Phrase #001')
    expect(seg.duration).toBe('1.4')
    expect(seg.issues).toEqual([])
  })

  it('flags a take whose file is too small to hold speech', () => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:tiny', revokeObjectURL: () => {} })
    const { state, onSegmentCaptured, resetSession } = useAutocueState()
    resetSession()
    state.phrases = [{ id: 8, text: 'bore da', translation: 'good morning', cadence: 'natural' }]

    onSegmentCaptured({ blob: new Blob(['x'.repeat(200)], { type: 'audio/webm' }), durationMs: 120 }, 0)

    expect(state.recordedSegments[0].issues[0]).toContain('too short or empty')
  })
})
