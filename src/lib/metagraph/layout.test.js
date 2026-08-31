import { describe, it, expect } from 'vitest'
import { loadGraph } from './loadGraph.js'
import { computeLayout } from './layout.js'

describe('metagraph layout', () => {
  const graph = loadGraph()
  const layout = computeLayout(graph)

  it('places every shape in the store exactly once', () => {
    expect(graph.nodes.length).toBeGreaterThan(0)
    expect(layout.positions.size).toBe(graph.nodes.length)
  })

  it('is deterministic — same store, same coordinates', () => {
    const again = computeLayout(graph)
    for (const [id, p] of layout.positions) expect(again.positions.get(id)).toEqual(p)
  })

  it('puts the containers at the top and the contained below them', () => {
    expect(layout.levelOf('N2')).toBe(0)
    expect(layout.levelOf('N3')).toBe(1)     // N3 contained in N2
    expect(layout.levelOf('P3')).toBe(2)     // P3 in N4, N4 in N12
    expect(layout.positions.get('N3').y).toBeGreaterThan(layout.positions.get('N2').y)
  })

  it('bands the unattached shapes separately rather than guessing a level', () => {
    const loose = layout.bands.find(b => b.key === 'unattached')
    // Every member must genuinely carry no composition edge — the assertion is
    // the PROPERTY, not a frozen list, because the store keeps growing (35 shapes
    // on 2026-08-31, 23 when this page shipped the day before).
    const attached = new Set()
    for (const e of graph.compositionEdges) { attached.add(e.contained); attached.add(e.container) }
    for (const m of loose.members) expect(attached.has(m.id)).toBe(false)
    expect(loose.members).toContainEqual(expect.objectContaining({ id: 'N13' }))
  })

  it('draws every composition edge but the declared self-loop', () => {
    expect(layout.edges.length).toBe(graph.compositionEdges.length - 1)
    expect(layout.selfLoops.map(s => s.node)).toEqual(['N5'])
  })
})
