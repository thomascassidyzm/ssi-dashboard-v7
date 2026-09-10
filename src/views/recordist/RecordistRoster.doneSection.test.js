// A FINISHED SECTION SAYS IT IS FINISHED.
//
// Found on Aran's own page, 2026-09-10, with his real queue on the wire: he had
// read all 80 lines of POD-1 and the page's only acknowledgement of it was a
// small grey caption reading "80 recorded · 0 still to read", sitting above 80
// identical filled squares, between two sections that were still going. The
// section had not gone anywhere — it renders, and this file is also what keeps
// it rendering — but nothing on the screen said DONE at the moment a person
// most needs to be told, and "did something just disappear?" is what he was
// left asking.
//
// So a section with nothing left in it wears a tick, says its own count, and
// folds its grid away — while staying reachable, because tapping a mark is the
// way back onto a line he wants to read again and finishing must not cost him
// that.
//
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RecordistRoster from './RecordistRoster.vue'

// Aran's shape, minimised: one finished body of work, one still going.
const SECTIONS = [
  {
    key: 'pod:pod-0', heading: 'POD-1', blurb: 'Your half of the POD-1 conversations.',
    rows: [
      { id: 'p1', text: 'Bore da, Sarah!', done: true, hasTake: true },
      { id: 'p2', text: 'Sut wyt ti?', done: true, hasTake: true },
    ],
  },
  {
    key: 'seed', heading: 'NEW SEEDS', blurb: 'Course sentences nobody has recorded yet.',
    rows: [
      { id: 's1', text: 'Dw i eisiau siarad', done: true, hasTake: true },
      { id: 's2', text: 'Mae hi yma', done: false, hasTake: false },
    ],
  },
]
const mountRoster = () => mount(RecordistRoster, { props: { sections: SECTIONS } })

describe('RecordistRoster — a section with nothing left in it', () => {
  it('is still on the page, and it is the one wearing the tick', () => {
    const w = mountRoster()
    const rows = w.findAll('.section-map-row')
    // Both bodies of work are drawn. This is the assertion that stops a
    // finished section ever being quietly dropped from the map.
    expect(rows.map(r => r.find('.sm-name').text())).toEqual(['POD-1', 'NEW SEEDS'])
    expect(rows[0].classes()).toContain('is-complete')
    expect(rows[1].classes()).not.toContain('is-complete')
  })

  it('says DONE in words and in its own count, not "0 still to read"', () => {
    const w = mountRoster()
    const done = w.findAll('.section-map-row')[0]
    expect(done.find('.sm-tally').text()).toBe('✓ all 2 recorded — nothing left to read')
    expect(done.find('.sm-tally').text()).not.toContain('still to read0')
    expect(done.find('.sm-done').exists()).toBe(true)
    expect(done.find('.sm-done-words').text()).toBe('2/2 done')
    // The section still going keeps the two numbers it has always had.
    const going = w.findAll('.section-map-row')[1]
    expect(going.find('.sm-tally').text()).toBe('1 recorded · 1 still to read')
    expect(going.find('.sm-done').exists()).toBe(false)
  })

  it('folds its grid away — and gives it straight back on a tap', async () => {
    const w = mountRoster()
    const done = () => w.findAll('.section-map-row')[0]
    const going = () => w.findAll('.section-map-row')[1]
    // A finished run is one fact, not two identical squares.
    expect(done().findAll('.tick').length).toBe(0)
    expect(done().find('.sm-done').attributes('aria-expanded')).toBe('false')
    // The unfinished section is untouched: its grid is where it always was.
    expect(going().findAll('.tick').length).toBe(2)

    await done().find('.sm-done').trigger('click')
    // And the way back onto a finished line is one tap away, not gone.
    expect(done().findAll('.tick').length).toBe(2)
    expect(done().find('.sm-done').attributes('aria-expanded')).toBe('true')
    await done().findAll('.tick')[1].trigger('click')
    expect(w.find('.peek-text').text()).toBe('Sut wyt ti?')
    await w.find('.peek-record').trigger('click')
    expect(w.emitted('record')[0]).toEqual(['p2'])

    await done().find('.sm-done').trigger('click')
    expect(done().findAll('.tick').length).toBe(0)
  })

  it('the every-line list agrees with the map, section for section', async () => {
    const w = mountRoster()
    await w.find('.roster-toggle').trigger('click')
    const tallies = w.findAll('.sh-tally').map(n => n.text())
    expect(tallies[0]).toBe('✓ all 2 recorded — nothing left to read')
    expect(tallies[1]).toBe('1 recorded · 1 still to read')
  })
})
