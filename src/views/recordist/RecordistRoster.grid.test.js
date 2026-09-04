// THE GRID IS SECTIONED, A MARK SAYS WHICH LINE IT IS, AND A MARK GOES THERE.
//
// Tom, 2026-09-03, on Aran's page: "I really like the completeness grid, but I
// suspect it would be more helpful if it's done in sections… AND rolling
// over/clicking on the squares in the grid should show that item's detail…
// tapping should take you there."
//
// The three things this file pins are the three ways that goes quietly wrong:
// the marks drift back into one undifferentiated block that contradicts the
// headings under it; the panel behind a mark starts telling the artist what we
// think of their take (his ruling of 2026-09-02, and putting detail behind a
// square is exactly where that leaks in); or the mark reports on a line without
// being a way back onto it, which is the only reason to draw it at all.
//
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RecordistRoster from './RecordistRoster.vue'

const SECTIONS = [
  {
    key: 'pod', heading: 'POD-1', blurb: 'Your half of the POD-1 conversations.',
    rows: [
      { id: 'p1', text: 'Bore da, Sarah!', done: true, hasTake: true, speaker: 'Neighbour' },
      { id: 'p2', text: 'Sut wyt ti?', done: false, hasTake: false, speaker: 'Neighbour' },
    ],
  },
  {
    key: 'seed', heading: 'NEW SEEDS', blurb: 'Course sentences nobody has recorded yet.',
    rows: [
      { id: 's1', text: 'Dw i eisiau siarad', done: false, hasTake: false },
      { id: 's2', text: 'Mae hi yma', done: true, hasTake: true },
      { id: 's3', text: 'Beth wyt ti eisiau?', done: false, hasTake: false },
    ],
  },
]

function mountRoster() {
  return mount(RecordistRoster, { props: { sections: SECTIONS } })
}

describe('RecordistRoster — the sectioned grid', () => {
  it('draws one grid per section, not one grid over the whole run', () => {
    const w = mountRoster()
    const strips = w.findAll('.strip')
    expect(strips.length).toBe(2)
    expect(strips[0].findAll('.tick').length).toBe(2)
    expect(strips[1].findAll('.tick').length).toBe(3)
    // No stray strip outside the sections: one block of 5 is the thing removed.
    expect(w.findAll('.tick').length).toBe(5)
  })

  it('gives every section its own two counts, which add up to that section', () => {
    const w = mountRoster()
    const tallies = w.findAll('.sm-tally').map(n => n.text())
    expect(tallies[0]).toContain('1 recorded')
    expect(tallies[0]).toContain('1 still to read')
    expect(tallies[1]).toContain('1 recorded')
    expect(tallies[1]).toContain('2 still to read')
  })

  it('a mark is a real button — tap is the only affordance it needs', () => {
    const w = mountRoster()
    for (const t of w.findAll('.tick')) expect(t.element.tagName).toBe('BUTTON')
  })

  it('tapping a mark shows that line in the one slot, never inside a grid', async () => {
    const w = mountRoster()
    // The slot is there before anything is selected — that is what stops the
    // grids moving when something is.
    expect(w.find('.peek-slot').exists()).toBe(true)
    expect(w.find('.peek').exists()).toBe(false)
    await w.findAll('.strip')[1].findAll('.tick')[2].trigger('click')
    expect(w.find('.peek').text()).toContain('Beth wyt ti eisiau?')
    // NOT IN A GRID AND NOT IN A SECTION. It used to be a full-width item
    // inside the strip, straight after the mark that was tapped, and inserting
    // it moved every mark after it — with 769 marks across three grids the
    // next square was no longer under Aran's thumb (Tom, 2026-09-04).
    for (const strip of w.findAll('.strip')) expect(strip.find('.peek').exists()).toBe(false)
    for (const row of w.findAll('.section-map-row')) expect(row.find('.peek').exists()).toBe(false)
    // One slot for the whole roster, and it is the first thing in it.
    expect(w.findAll('.peek-slot').length).toBe(1)
    expect(w.find('.peek').element.closest('.peek-slot')).toBeTruthy()
  })

  it('THE GRIDS DO NOT MOVE — no selection, one selection, then another', async () => {
    const w = mountRoster()
    // The shape of a grid is what a thumb aims at: the marks, in order, and
    // NOTHING BETWEEN THEM. Selecting a line must not change that shape, so
    // every strip's children are compared before and after two taps in a row.
    // The one thing allowed to change is a mark's own `on` class — it has to,
    // or the square he tapped stops looking selected — so it is stripped out
    // and everything else must be identical.
    const shape = () => w.findAll('.strip').map(s =>
      [...s.element.children].map(n => `${n.tagName}:${n.className.replace(' on', '')}:${n.title}`))
    const before = shape()
    await w.findAll('.strip')[1].findAll('.tick')[0].trigger('click')
    expect(shape()).toEqual(before)
    await w.findAll('.strip')[1].findAll('.tick')[2].trigger('click')
    expect(shape()).toEqual(before)
    // And the slot's own place in the roster never changes either: it is drawn
    // whether or not a line is open, so there is nothing to insert or remove.
    expect(w.findAll('.peek-slot').length).toBe(1)
  })

  it('keeps the tapped square visibly marked as the one being read', async () => {
    const w = mountRoster()
    await w.findAll('.strip')[1].findAll('.tick')[2].trigger('click')
    const on = w.findAll('.tick').filter(t => t.classes('on'))
    expect(on.length).toBe(1)
    expect(on[0].element).toBe(w.findAll('.strip')[1].findAll('.tick')[2].element)
  })

  it('says recorded or not recorded and NOTHING else about the take', async () => {
    const w = mountRoster()
    await w.findAll('.tick')[0].trigger('click')
    expect(w.find('.peek-state').text()).toBe('Recorded')
    await w.findAll('.tick')[1].trigger('click')
    expect(w.find('.peek-state').text()).toBe('Not recorded')
    // A take we rejected is a line still to read, and nothing on this screen may
    // say otherwise (Tom, 2026-09-02).
    const words = w.find('.peek').text().toLowerCase()
    for (const leak of ['reject', 'unusable', 'clipped', 'flag', 'quality', 're-record', 'again?'])
      expect(words).not.toContain(leak)
  })

  it('tapping through the panel asks the booth to open the mic on that line', async () => {
    const w = mountRoster()
    await w.findAll('.strip')[1].findAll('.tick')[0].trigger('click')
    await w.find('.peek-record').trigger('click')
    expect(w.emitted('record')).toBeTruthy()
    expect(w.emitted('record')[0]).toEqual(['s1'])
  })

  it('offers a re-read on a line already recorded, with no confirm step', async () => {
    const w = mountRoster()
    await w.findAll('.tick')[0].trigger('click')
    expect(w.find('.peek-record').text()).toBe('Read it again')
    await w.find('.peek-record').trigger('click')
    expect(w.emitted('record')[0]).toEqual(['p1'])
  })

  it('works with no pointer at all — hover is a nicety, never the way in', async () => {
    const w = mountRoster()
    // The phone: click and click alone opens and closes the panel.
    await w.findAll('.tick')[0].trigger('click')
    expect(w.find('.peek').exists()).toBe(true)
    await w.findAll('.tick')[0].trigger('click')
    expect(w.find('.peek').exists()).toBe(false)
  })

  it('keeps ONE whole-run caption and the full list still one tap away', () => {
    const w = mountRoster()
    expect(w.find('.strip-words').text()).toContain('2 recorded')
    expect(w.find('.strip-words').text()).toContain('3 still to read')
    expect(w.find('.roster-toggle').text()).toContain('See every line (5)')
  })
})
