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
import { storedClipUrl, STORED_LABEL, LOCAL_LABEL } from '@/composables/useStoredClip'

const STORED_UUID = 'DDDD9999-EEEE-8888-FFFF-777766665555'

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

/**
 * Review preview must play the PROCESSED, STORED clip once a take has been
 * uploaded. The local blob is the pre-upload state only — a raw preview sounds
 * perfect whatever the server's trim chain did to the bytes actually kept,
 * which is how the head-clipping bug survived months of listening
 * (docs/audio-forensics-2026-08-14/).
 */
describe('preview plays the stored clip once a take has uploaded', () => {
  let played

  beforeEach(() => {
    played = []
    vi.stubGlobal('Audio', class {
      constructor() { this.src = null }
      play() { played.push(this.src); this.onended?.(); return Promise.resolve() }
      pause() {}
    })
  })

  it('plays the stored-clip route, not the blob, after upload', async () => {
    const { playSegment, setStoredClip, resetSession } = useAutocueState()
    resetSession()
    setStoredClip(withAudio.phraseId, STORED_UUID)

    await expect(playSegment(withAudio)).resolves.toBe(true)

    expect(played).toEqual([storedClipUrl(STORED_UUID)])
    expect(played[0]).toContain(`/api/production/audio/${STORED_UUID}/stream`)
    expect(played[0].startsWith('blob:')).toBe(false)
  })

  it('still plays the raw local blob before the take has uploaded', async () => {
    const { playSegment, resetSession } = useAutocueState()
    resetSession()
    await expect(playSegment(withAudio)).resolves.toBe(true)
    expect(played).toEqual(['blob:fake-1'])
  })

  it('names the source honestly either way', () => {
    const { segmentPlayback, setStoredClip, resetSession } = useAutocueState()
    resetSession()
    expect(segmentPlayback(withAudio).source).toBe('local')
    expect(segmentPlayback(withAudio).label).toBe(LOCAL_LABEL)

    setStoredClip(withAudio.phraseId, STORED_UUID)
    expect(segmentPlayback(withAudio).source).toBe('stored')
    expect(segmentPlayback(withAudio).label).toBe(STORED_LABEL)
  })

  it('forgets stored identities on reset, so a new session cannot play the old one', () => {
    const { segmentPlayback, setStoredClip, resetSession } = useAutocueState()
    resetSession()
    setStoredClip(withAudio.phraseId, STORED_UUID)
    resetSession()
    expect(segmentPlayback(withAudio).source).not.toBe('stored')
  })
})

describe('the review card says which bytes its play button fetches', () => {
  it('tags an uploaded take STORED', () => {
    const w = mount(SegmentCard, { props: { segment: withAudio, playbackSource: 'stored' } })
    expect(w.text()).toContain('STORED')
    expect(w.find('.segment-btn').attributes('title')).toContain('processed clip stored on the server')
  })

  it('tags a not-yet-uploaded take RAW LOCAL, never STORED', () => {
    const w = mount(SegmentCard, { props: { segment: withAudio, playbackSource: 'local' } })
    expect(w.text()).toContain('RAW LOCAL')
    expect(w.text()).not.toContain('STORED')
  })

  it('carries the tag down from SessionReview', () => {
    const w = mount(SessionReview, {
      props: { segments: [withAudio], playbackSources: { seg_1: 'stored' } }
    })
    expect(w.text()).toContain('STORED')
  })
})
