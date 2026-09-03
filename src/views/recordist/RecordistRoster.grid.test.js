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

  it('tapping a mark shows that line, under its own section', async () => {
    const w = mountRoster()
    expect(w.find('.peek').exists()).toBe(false)
    await w.findAll('.strip')[1].findAll('.tick')[2].trigger('click')
    const peek = w.find('.peek')
    expect(peek.text()).toContain('Beth wyt ti eisiau?')
    // ON THE ROW OF THE MARK, not under the whole grid: the panel is a
    // full-width item inside the same wrapping strip, immediately after the
    // mark that was tapped. Under a 23-row grid it was twenty rows off-screen.
    expect(w.findAll('.strip')[1].find('.peek').exists()).toBe(true)
    const kids = [...w.findAll('.strip')[1].element.children]
    expect(kids.indexOf(peek.element)).toBe(kids.findIndex(n => n.classList.contains('on')) + 1)
    // In the second section's block, not the first one's.
    expect(w.findAll('.section-map-row')[1].find('.peek').exists()).toBe(true)
    expect(w.findAll('.section-map-row')[0].find('.peek').exists()).toBe(false)
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
