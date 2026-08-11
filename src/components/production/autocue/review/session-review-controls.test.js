// @vitest-environment jsdom
/**
 * Every control on the session-review screen, end to end.
 *
 * The Play button shipped dead because SegmentCard emitted an event nothing
 * listened for. Redo and Approve shipped dead the other way: AutocueStudio DID
 * listen, but the handlers only mutated Sets no part of the UI ever read, so a
 * click looked exactly like a click on nothing. The batch "Review Medium" and
 * "Queue Low for Re-record" buttons emitted 'filter', which had no listener at
 * all.
 *
 * These tests walk each control the whole way: button -> emit -> re-emit ->
 * handler -> observable state, plus a source-level guard that AutocueStudio
 * listens for every event SessionReview can emit.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { mount } from '@vue/test-utils'
import SegmentCard from './SegmentCard.vue'
import SessionReview from './SessionReview.vue'
import { useAutocueState } from '@/composables/useAutocueState'

const seg = (over = {}) => ({
  id: 'seg_1', phraseId: 1, label: 'Phrase #001', text: 'dw i eisiau siarad',
  duration: '1.4', confidence: 92, confidenceLevel: 'high', quality: 'Excellent',
  issues: [], hasRecording: true, audioUrl: 'blob:fake-1', ...over
})

const high = seg()
const medium = seg({ id: 'seg_2', phraseId: 2, confidence: 78, confidenceLevel: 'medium' })
const low = seg({ id: 'seg_3', phraseId: 3, confidence: 55, confidenceLevel: 'low' })

const btns = w => w.findAll('.segment-btn')          // [play, redo, approve]
const batch = w => w.findAll('.batch-btn')           // [approve-high, medium, redo-low, play-all]

describe('SegmentCard controls emit', () => {
  it('emits redo with its segment', async () => {
    const w = mount(SegmentCard, { props: { segment: high } })
    await btns(w)[1].trigger('click')
    expect(w.emitted('redo')[0][0]).toEqual(high)
  })

  it('emits approve with its segment', async () => {
    const w = mount(SegmentCard, { props: { segment: high } })
    await btns(w)[2].trigger('click')
    expect(w.emitted('approve')[0][0]).toEqual(high)
  })

  it('shows the approved verdict on the card', () => {
    const w = mount(SegmentCard, { props: { segment: high, status: 'approved' } })
    expect(btns(w)[2].text()).toContain('Approved')
    expect(btns(w)[2].classes()).toContain('active')
    expect(w.find('.verdict-badge').text()).toContain('Approved')
  })

  it('shows the redo verdict on the card', () => {
    const w = mount(SegmentCard, { props: { segment: high, status: 'rejected' } })
    expect(btns(w)[1].text()).toContain('Queued')
    expect(btns(w)[1].classes()).toContain('active')
  })
})

describe('SessionReview carries every control up', () => {
  it('re-emits reject and approve from a card', async () => {
    const w = mount(SessionReview, { props: { segments: [high] } })
    await btns(w)[1].trigger('click')
    await btns(w)[2].trigger('click')
    expect(w.emitted('reject')[0][0]).toEqual(high)
    expect(w.emitted('approve')[0][0]).toEqual(high)
  })

  it('emits approve-all, filter, queue-redo and play-all from the batch bar', async () => {
    const w = mount(SessionReview, { props: { segments: [high, medium, low] } })
    const b = batch(w)
    await b[0].trigger('click')
    await b[1].trigger('click')
    await b[2].trigger('click')
    await b[3].trigger('click')
    expect(w.emitted('approve-all')[0][0]).toBe('high')
    expect(w.emitted('filter')[0][0]).toBe('medium')
    expect(w.emitted('queue-redo')[0][0]).toBe('low')
    expect(w.emitted('play-all')).toBeTruthy()
  })

  it('emits back and finalize from the final actions', async () => {
    const w = mount(SessionReview, {
      props: { segments: [high], approvedIds: ['seg_1'] }
    })
    const controls = w.findAll('.control-btn')
    await controls[0].trigger('click')
    await controls[1].trigger('click')
    expect(w.emitted('back')).toBeTruthy()
    expect(w.emitted('finalize')).toBeTruthy()
  })

  it('will not offer finalize with nothing approved — it would reset the session and bin the takes', () => {
    const w = mount(SessionReview, { props: { segments: [high] } })
    expect(w.findAll('.control-btn')[1].attributes('disabled')).toBeDefined()
  })

  it('paints each card with its verdict', () => {
    const w = mount(SessionReview, {
      props: { segments: [high, medium], approvedIds: ['seg_1'], rejectedIds: ['seg_2'] }
    })
    const cards = w.findAll('.segment-card')
    expect(cards[0].classes()).toContain('approved')
    expect(cards[1].classes()).toContain('rejected')
  })

  it('narrows the grid to the active filter and offers a way back', async () => {
    const w = mount(SessionReview, {
      props: { segments: [high, medium, low], activeFilter: 'medium' }
    })
    expect(w.findAll('.segment-card')).toHaveLength(1)
    await w.find('.filter-clear').trigger('click')
    expect(w.emitted('clear-filter')).toBeTruthy()
  })

  it('disables Play All when nothing has audio', () => {
    const w = mount(SessionReview, { props: { segments: [seg({ audioUrl: null })] } })
    expect(batch(w)[3].attributes('disabled')).toBeDefined()
  })
})

describe('useAutocueState review verdicts have a real effect', () => {
  let s
  beforeEach(() => {
    s = useAutocueState()
    s.resetSession()
    s.state.recordedSegments = [high, medium, low]
  })

  it('approve records the verdict and clears any redo', () => {
    s.rejectSegment(high)
    s.approveSegment(high)
    expect([...s.state.approvedSegments]).toEqual(['seg_1'])
    expect([...s.state.rejectedSegments]).toEqual([])
  })

  it('redo records the verdict and clears any approval', () => {
    s.approveSegment(high)
    s.rejectSegment(high)
    expect([...s.state.rejectedSegments]).toEqual(['seg_1'])
    expect([...s.state.approvedSegments]).toEqual([])
  })

  it('both verdicts toggle off when clicked again', () => {
    s.approveSegment(high)
    s.approveSegment(high)
    s.rejectSegment(medium)
    s.rejectSegment(medium)
    expect([...s.state.approvedSegments]).toEqual([])
    expect([...s.state.rejectedSegments]).toEqual([])
  })

  it('approve-all high approves the high band only', () => {
    s.approveAllByConfidence('high')
    expect([...s.state.approvedSegments]).toEqual(['seg_1'])
  })

  it('queue-redo low condemns the low band and shows it', () => {
    s.approveSegment(low)
    s.queueRedoByConfidence('low')
    expect([...s.state.rejectedSegments]).toEqual(['seg_3'])
    expect([...s.state.approvedSegments]).toEqual([])
    expect(s.state.reviewFilter).toBe('low')
  })

  it('the filter toggles off on a second click and clears on demand', () => {
    s.setReviewFilter('medium')
    expect(s.state.reviewFilter).toBe('medium')
    s.setReviewFilter('medium')
    expect(s.state.reviewFilter).toBe(null)
    s.setReviewFilter('low')
    s.clearReviewFilter()
    expect(s.state.reviewFilter).toBe(null)
  })

  it('only approved segments are queued for upload', () => {
    s.approveSegment(high)
    s.rejectSegment(medium)
    const uploadable = s.state.recordedSegments.filter(
      x => s.state.approvedSegments.has(x.id) && x.hasRecording
    )
    expect(uploadable.map(x => x.id)).toEqual(['seg_1'])
  })
})

describe('AutocueStudio listens for every event the review screen emits', () => {
  // The original Play bug was exactly this: an emit with no listener. Keep it
  // mechanical so a new control cannot be added and left dangling again.
  const read = rel => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')
  const studio = read('../AutocueStudio.vue')
  const review = read('./SessionReview.vue')

  const declared = review
    .match(/defineEmits\(\[([\s\S]*?)\]\)/)[1]
    .match(/'([a-z-]+)'/g)
    .map(x => x.replace(/'/g, ''))

  it.each(declared)('AutocueStudio handles @%s', (evt) => {
    expect(studio).toMatch(new RegExp(`@${evt}="`))
  })

  it('covers every control on the screen', () => {
    expect(declared.sort()).toEqual([
      'approve', 'approve-all', 'back', 'clear-filter', 'filter',
      // play-chunk plays ONE LEGO piece of a slow-pass take; play plays the
      // whole take.
      'finalize', 'play', 'play-all', 'play-chunk', 'queue-redo', 'reject'
    ])
  })
})
