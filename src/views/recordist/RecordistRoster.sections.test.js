// "SEE EVERY LINE" OPENS ONTO HEADINGS, NOT ONTO 769 ROWS.
//
// Tom, 2026-09-04, looking at two screenshots of this panel expanded: "the same
// logic shoudl apply to the see all my lines I think — I think that would be
// clearer".
//
// The three ways this goes quietly wrong, and what each costs Aran:
//   • it opens expanded anyway, and nothing changed for him;
//   • a line stops being reachable — the section counts no longer add up to the
//     number in the toggle's own label, and he reads a line again for nothing;
//   • an edit begun from the grid above opens the list but leaves the row shut
//     inside its section, so he types into a textarea he cannot see.
//
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RecordistRoster from './RecordistRoster.vue'

const SECTIONS = [
  {
    key: 'pod:', heading: 'POD-1', blurb: 'Your half of the POD-1 conversations.',
    rows: [
      { id: 'p1', text: 'Bore da, Sarah!', done: true, hasTake: true, speaker: 'Neighbour', canEdit: true },
      { id: 'p2', text: 'Sut wyt ti?', done: false, hasTake: false, speaker: 'Neighbour', canEdit: true },
    ],
  },
  {
    key: 'pod:senedd-s4c-steve', heading: 'SENEDD', blurb: 'The S4C committee session.',
    rows: [
      { id: 'n1', text: 'Diolch, Gadeirydd.', done: true, hasTake: true, canEdit: true },
    ],
  },
  {
    key: 'seed', heading: 'NEW SEEDS', blurb: 'Course sentences nobody has recorded yet.',
    rows: [
      { id: 's1', text: 'Dw i eisiau siarad', done: false, hasTake: false, canEdit: true },
      { id: 's2', text: 'Mae hi yma', done: true, hasTake: true, canEdit: true },
      { id: 's3', text: 'Beth wyt ti eisiau?', done: false, hasTake: false, canEdit: true },
    ],
  },
]

const mountRoster = (props = {}) => mount(RecordistRoster, { props: { sections: SECTIONS, ...props } })
const openList = async (w) => { await w.find('.roster-toggle').trigger('click'); return w }

describe('RecordistRoster — the every-line list is sectioned and shut', () => {
  it('opens onto headings only: no rows until he asks for a section', async () => {
    const w = await openList(mountRoster())
    expect(w.findAll('.section-head').length).toBe(3)
    expect(w.findAll('.row').length).toBe(0)
    expect(w.findAll('.sh-mark').map(n => n.text())).toEqual(['+', '+', '+'])
  })

  it('THE INVARIANT: the headings add back up to the number in the toggle', async () => {
    const w = await openList(mountRoster())
    const counts = w.findAll('.sh-count').map(n => Number(n.text()))
    const total = counts.reduce((a, b) => a + b, 0)
    expect(total).toBe(6)
    expect(w.find('.roster-toggle').text()).toContain('Hide every line')
    // and the same number is what the shut toggle promises
    await w.find('.roster-toggle').trigger('click')
    expect(w.find('.roster-toggle').text()).toContain(`See every line (${total})`)
  })

  it('renders whatever sections arrive — never a hardcoded three', async () => {
    const w = await openList(mount(RecordistRoster, {
      props: { sections: [{ key: 'quarry', heading: 'The minimal set', blurb: '', rows: SECTIONS[1].rows }] },
    }))
    expect(w.findAll('.section-head').length).toBe(1)
    expect(w.find('.sh-name').text()).toBe('The minimal set')
  })

  it('a tap opens that section and only that section, and the mark flips', async () => {
    const w = await openList(mountRoster())
    await w.findAll('.sh-btn')[2].trigger('click')
    expect(w.findAll('.row').length).toBe(3)
    expect(w.findAll('.sh-mark').map(n => n.text())).toEqual(['+', '+', '–'])
    expect(w.findAll('.sh-btn')[2].attributes('aria-expanded')).toBe('true')
    await w.findAll('.sh-btn')[2].trigger('click')
    expect(w.findAll('.row').length).toBe(0)
  })

  it('remembers his taps for the life of the page', async () => {
    const w = await openList(mountRoster())
    await w.findAll('.sh-btn')[0].trigger('click')
    await w.find('.roster-toggle').trigger('click')   // hide every line
    await w.find('.roster-toggle').trigger('click')   // and back
    expect(w.findAll('.row').length).toBe(2)
  })

  it('keeps this section’s own two numbers on the shut heading', async () => {
    const w = await openList(mountRoster())
    const tallies = w.findAll('.sh-tally').map(n => n.text())
    expect(tallies[0]).toContain('1 recorded')
    expect(tallies[0]).toContain('1 still to read')
    expect(tallies[2]).toContain('2 still to read')
    // The queue's explanatory blurb is NOT repeated on these headings.
    expect(w.find('.roster-list').text()).not.toContain('Your half of the POD-1')
  })

  it('an edit begun from elsewhere opens the list AND the row’s own section', async () => {
    const w = mountRoster()
    expect(w.find('.roster-list').exists()).toBe(false)
    await w.setProps({ editingId: 's2' })
    expect(w.find('.roster-list').exists()).toBe(true)
    // The textarea he is typing into is on screen, in the section that holds it.
    expect(w.find('.row-edit').exists()).toBe(true)
    expect(w.findAll('.row').length).toBe(3)
    expect(w.findAll('.sh-mark').map(n => n.text())).toEqual(['+', '+', '–'])
  })

  it('every per-row control survives inside an opened section', async () => {
    const w = await openList(mountRoster())
    await w.findAll('.sh-btn')[0].trigger('click')
    const row = w.findAll('.row')[0]
    expect(row.find('.row-speaker').text()).toBe('Neighbour')
    expect(row.find('.row-state').text()).toBe('Recorded')
    expect(row.find('.row-record').text()).toBe('Record again')
    await row.find('.row-text').trigger('click')
    expect(w.emitted('edit')[0]).toEqual(['p1'])
  })
})
