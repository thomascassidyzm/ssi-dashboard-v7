// @vitest-environment jsdom
/**
 * Chunk-level review playback: the piece buttons on a slow-pass take.
 *
 * Kai's ask — hear each LEGO piece of a slow take on its own, to check it was
 * cut in the right place and stands up in isolation, and to re-record one piece
 * instead of the whole phrase when it does not.
 *
 * These cover the three halves that have to join up: the card renders a button
 * per piece, the event reaches the studio through SessionReview, and the state
 * composable turns a captured take's pause timings into those pieces.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SegmentCard from './SegmentCard.vue'
import SessionReview from './SessionReview.vue'
import { useAutocueState } from '@/composables/useAutocueState'

const slowTake = {
  id: 'seg_1', phraseId: 1, label: 'Phrase #001', text: 'dw i eisiau siarad',
  duration: '4.7', confidence: 90, confidenceLevel: 'high', quality: 'Excellent',
  issues: [], hasRecording: true, audioUrl: 'blob:fake-1',
  chunksExpected: 3, chunksMatchScript: true,
  chunks: [
    { index: 0, startMs: 0, endMs: 940, durationMs: 940, text: 'dw i', label: 'dw i' },
    { index: 1, startMs: 1560, endMs: 2440, durationMs: 880, text: 'eisiau', label: 'eisiau' },
    { index: 2, startMs: 3060, endMs: 3940, durationMs: 880, text: 'siarad', label: 'siarad' }
  ]
}

const naturalTake = { ...slowTake, id: 'seg_2', phraseId: 2, chunks: [], chunksExpected: 0, chunksMatchScript: false }

describe('the piece buttons on a card', () => {
  it('offers one play button per LEGO piece, named with its own text', () => {
    const w = mount(SegmentCard, { props: { segment: slowTake } })
    const buttons = w.findAll('.chunk-btn')
    expect(buttons).toHaveLength(3)
    expect(buttons.map(b => b.text())).toEqual(['▶ dw i', '▶ eisiau', '▶ siarad'])
  })

  it('shows nothing extra on a phrase read straight through', () => {
    const w = mount(SegmentCard, { props: { segment: naturalTake } })
    expect(w.find('.chunk-strip').exists()).toBe(false)
  })

  it('emits the segment and the piece when a piece is clicked', async () => {
    const w = mount(SegmentCard, { props: { segment: slowTake } })
    await w.findAll('.chunk-btn')[1].trigger('click')
    const [segment, chunk] = w.emitted('play-chunk')[0]
    expect(segment.id).toBe('seg_1')
    expect(chunk.index).toBe(1)
  })

  it('lights only the piece that is playing', () => {
    const w = mount(SegmentCard, { props: { segment: slowTake, playingChunkIndex: 2 } })
    const buttons = w.findAll('.chunk-btn')
    expect(buttons[2].classes()).toContain('playing')
    expect(buttons[0].classes()).not.toContain('playing')
  })

  it('says so when the take was not cut the way the script says', () => {
    const mismatched = {
      ...slowTake,
      chunksMatchScript: false,
      chunks: [
        { index: 0, startMs: 0, endMs: 940, durationMs: 940, text: null, label: 'Piece 1' },
        { index: 1, startMs: 1560, endMs: 3940, durationMs: 2380, text: null, label: 'Piece 2' }
      ]
    }
    const w = mount(SegmentCard, { props: { segment: mismatched } })
    expect(w.find('.chunk-warning').text()).toContain('2 heard, script has 3')
  })
})

describe('the event reaching the studio', () => {
  it('carries a piece click up through SessionReview', async () => {
    const w = mount(SessionReview, { props: { segments: [slowTake] } })
    await w.findAll('.chunk-btn')[0].trigger('click')
    const [segment, chunk] = w.emitted('play-chunk')[0]
    expect(segment.id).toBe('seg_1')
    expect(chunk.index).toBe(0)
  })

  it('lights the playing piece on the right card only', () => {
    const other = { ...slowTake, id: 'seg_3', phraseId: 3 }
    const w = mount(SessionReview, {
      props: { segments: [slowTake, other], playingChunkKey: 'seg_3:1' }
    })
    const cards = w.findAllComponents(SegmentCard)
    expect(cards[0].props('playingChunkIndex')).toBeNull()
    expect(cards[1].props('playingChunkIndex')).toBe(1)
  })
})

describe('a captured take becomes pieces', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:captured', revokeObjectURL: () => {} })
  })

  function capture(phrase, chunkGaps, durationMs) {
    const { state, onSegmentCaptured, resetSession } = useAutocueState()
    resetSession()
    state.phrases = [phrase]
    onSegmentCaptured(
      { blob: new Blob(['x'.repeat(5000)], { type: 'audio/webm' }), durationMs, chunkGaps },
      0
    )
    return state.recordedSegments[0]
  }

  const slowPhrase = {
    id: 7, text: 'dw i eisiau siarad', cadence: 'slow',
    chunksString: 'dw i|eisiau|siarad'
  }

  it('turns the pauses heard in a slow take into named, playable pieces', () => {
    const seg = capture(slowPhrase, [
      { startMs: 900, endMs: 1600 },
      { startMs: 2400, endMs: 3100 },
      { startMs: 3900, endMs: null }
    ], 4700)

    expect(seg.chunks).toHaveLength(3)
    expect(seg.chunksMatchScript).toBe(true)
    expect(seg.chunks.map(c => c.label)).toEqual(['dw i', 'eisiau', 'siarad'])
    // The pieces skip the pauses rather than spanning them.
    expect(seg.chunks[1].startMs).toBeGreaterThan(seg.chunks[0].endMs)
  })

  it('gives a take with no pauses no pieces at all — the Play button already is that', () => {
    const seg = capture(slowPhrase, [{ startMs: 1500, endMs: null }], 2300)
    expect(seg.chunks).toEqual([])
  })

  it('does not invent pieces from a phrase that has no LEGO map', () => {
    // A word-split fallback is not chunk information — the recordist was never
    // shown gap markers for it, so nothing may be labelled from it. The take is
    // still cut into anonymous pieces, because a slow read was asked to pause.
    const seg = capture({ id: 8, text: 'bore da iawn', cadence: 'slow' }, [
      { startMs: 900, endMs: 1600 },
      { startMs: 2400, endMs: null }
    ], 3200)
    expect(seg.chunksExpected).toBe(0)
    expect(seg.chunksMatchScript).toBe(false)
    expect(seg.chunks.map(c => c.label)).toEqual(['Piece 1', 'Piece 2'])
  })

  it('never splits a natural-speed take, however it was breathed', () => {
    // Kai, 2026-08-19: "it seems to be trying to split the fast ones, still?"
    // A natural read is read straight through and shown no gap markers, so a
    // breath in the middle of it is a breath, not a chunk boundary. It must
    // yield no pieces AND no expectation — an expectation is what raises the
    // false "2 heard, script has 3" warning on a perfectly good take.
    const gaps = [{ startMs: 900, endMs: 1600 }, { startMs: 2400, endMs: null }]
    const seg = capture(
      { id: 9, text: 'dw i eisiau siarad', cadence: 'natural', chunksString: 'dw i|eisiau|siarad' },
      gaps,
      3200
    )
    expect(seg.chunks).toEqual([])
    expect(seg.chunksExpected).toBe(0)
    expect(seg.chunksMatchScript).toBe(false)
    // The raw boundaries still travel with the upload — suppressing the review
    // split is not the same as throwing the timing away.
    expect(seg.chunkGaps).toEqual(gaps)
  })

  it('keeps the raw boundaries on the row, so they can travel with the upload', () => {
    const gaps = [{ startMs: 900, endMs: 1600 }, { startMs: 3900, endMs: null }]
    const seg = capture(slowPhrase, gaps, 4700)
    expect(seg.chunkGaps).toEqual(gaps)
  })
})
