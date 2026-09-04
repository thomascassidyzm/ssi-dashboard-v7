import { describe, it, expect } from 'vitest'
import { recordedSections } from './recorded-sections.js'

// The shape the booth actually hands in: the heading function is the view's own
// kindWords(), and the order is the queue's own section headings.
const headingFor = r => r.heading
const matchRow = (r, q) => r.text.toLowerCase().includes(q) || r.heading.toLowerCase().includes(q)
const ORDER = ['POD-1', 'SENEDD', 'NEW SEEDS', 'The minimal set', 'MORE LINES']

const ROWS = [
  { id: 'a', text: 'Bore da', heading: 'POD-1' },
  { id: 'b', text: 'Sut wyt ti', heading: 'POD-1' },
  { id: 'c', text: 'Diolch gadeirydd', heading: 'SENEDD' },
  { id: 'd', text: 'Dw i eisiau', heading: 'NEW SEEDS' },
  { id: 'e', text: 'Croeso', heading: 'SENEDD' },
]

describe('the already-recorded list, grouped like the queue', () => {
  it('adds back up to the whole list — nothing he read may vanish', () => {
    const s = recordedSections(ROWS, { headingFor, order: ORDER, matchRow })
    expect(s.reduce((n, x) => n + x.rows.length, 0)).toBe(ROWS.length)
    expect(s.every(x => x.count === x.rows.length)).toBe(true)
    expect(new Set(s.flatMap(x => x.rows.map(r => r.id)))).toEqual(new Set(['a', 'b', 'c', 'd', 'e']))
  })

  it('orders the sections the way the queue orders them', () => {
    const s = recordedSections(ROWS, { headingFor, order: ORDER, matchRow })
    expect(s.map(x => x.heading)).toEqual(['POD-1', 'SENEDD', 'NEW SEEDS'])
    expect(s.map(x => x.count)).toEqual([2, 2, 1])
  })

  it('does not draw a section with nothing recorded in it', () => {
    const s = recordedSections(ROWS, { headingFor, order: ORDER, matchRow })
    expect(s.find(x => x.heading === 'The minimal set')).toBeUndefined()
  })

  it('is collapsed by default and forces matching sections open while filtering', () => {
    const plain = recordedSections(ROWS, { headingFor, order: ORDER, matchRow })
    expect(plain.every(x => x.forceOpen === false)).toBe(true)
    const hit = recordedSections(ROWS, { headingFor, order: ORDER, filter: 'croeso', matchRow })
    expect(hit.map(x => x.heading)).toEqual(['SENEDD'])
    expect(hit[0].rows.map(r => r.id)).toEqual(['e'])
    expect(hit[0].forceOpen).toBe(true)
  })

  it('filters on the category word too, so "senedd" finds the Senedd lines', () => {
    const s = recordedSections(ROWS, { headingFor, order: ORDER, filter: 'SENEDD ', matchRow })
    expect(s.map(x => x.count)).toEqual([2])
  })

  it('returns nothing at all when nothing matches, so the panel can say so', () => {
    expect(recordedSections(ROWS, { headingFor, order: ORDER, filter: 'zzz', matchRow })).toEqual([])
  })

  it('keeps a heading the queue never named rather than dropping its lines', () => {
    const rows = [...ROWS, { id: 'f', text: 'Rhywbeth', heading: 'Everything else' }]
    const s = recordedSections(rows, { headingFor, order: ORDER, matchRow })
    expect(s.map(x => x.heading)).toEqual(['POD-1', 'SENEDD', 'NEW SEEDS', 'Everything else'])
    expect(s.reduce((n, x) => n + x.rows.length, 0)).toBe(rows.length)
  })

  it('handles an empty list', () => {
    expect(recordedSections([], { headingFor, order: ORDER, matchRow })).toEqual([])
  })
})
