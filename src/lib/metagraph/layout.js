/**
 * layout — the metagraph, laid out. Deterministic, pure, no Vue, no network.
 *
 * The overlay view needs the graph as a PICTURE, not as a list, and a picture
 * needs coordinates. Those coordinates are derived from the graph's own
 * composition edges (contained → container) and from nothing else: no force
 * simulation, no randomness, no saved positions. Same store in, same picture
 * out, every time — which is what makes a screenshot of it evidence.
 *
 * Levels: a shape that is contained in nothing sits at level 0. A shape sits one
 * level below the deepest container it is contained in. Self-loops (N5 → N5, a
 * declared reflexive edge) are dropped before levelling — a shape cannot be one
 * level below itself.
 *
 * Shapes with no composition edge at all are not floated into the picture at a
 * guessed level: they are banded separately, which is how the five Method Pod
 * shapes read honestly as unattached to the transactional lattice.
 */

export const TILE_W = 152
export const TILE_H = 74
export const GAP_X = 18
export const GAP_Y = 46
export const PAD_X = 16
export const PAD_TOP = 30
export const PER_ROW = 6

/** Numeric-aware id sort so N9 precedes N10 and P1 precedes P2. */
function byId (a, b) {
  const pa = /^([A-Z]+)(\d+)$/.exec(a.id)
  const pb = /^([A-Z]+)(\d+)$/.exec(b.id)
  if (pa && pb && pa[1] === pb[1]) return Number(pa[2]) - Number(pb[2])
  return String(a.id).localeCompare(String(b.id))
}

export function computeLayout (graph) {
  const nodes = graph.nodes || []
  const edges = (graph.compositionEdges || []).filter(e => e.contained !== e.container)
  const byIdMap = new Map(nodes.map(n => [n.id, n]))

  const containersOf = new Map()   // contained -> [container]
  const containedIn = new Map()    // container -> [contained]
  const attached = new Set()
  for (const e of edges) {
    if (!byIdMap.has(e.contained) || !byIdMap.has(e.container)) continue
    if (!containersOf.has(e.contained)) containersOf.set(e.contained, [])
    containersOf.get(e.contained).push(e.container)
    if (!containedIn.has(e.container)) containedIn.set(e.container, [])
    containedIn.get(e.container).push(e.contained)
    attached.add(e.contained); attached.add(e.container)
  }

  const levelCache = new Map()
  function level (id, seen = new Set()) {
    if (levelCache.has(id)) return levelCache.get(id)
    if (seen.has(id)) return 0
    seen.add(id)
    const parents = containersOf.get(id) || []
    const l = parents.length ? Math.max(...parents.map(p => level(p, seen))) + 1 : 0
    levelCache.set(id, l)
    return l
  }

  // Band = a labelled horizontal region. Attached shapes band by level; the
  // unattached ones get a band of their own rather than a fabricated level.
  const attachedNodes = nodes.filter(n => attached.has(n.id))
  const looseNodes = nodes.filter(n => !attached.has(n.id))
  const maxLevel = attachedNodes.length ? Math.max(...attachedNodes.map(n => level(n.id))) : 0

  const bands = []
  for (let l = 0; l <= maxLevel; l++) {
    const members = attachedNodes.filter(n => level(n.id) === l).sort(byId)
    if (members.length) {
      bands.push({
        key: `level-${l}`,
        label: l === 0
          ? 'Whole exchanges — nothing else contains these'
          : l === 1
            ? 'Parts that happen inside the exchanges above'
            : l === 2 ? 'Parts that happen inside those' : `Parts nested ${l} deep`,
        members
      })
    }
  }
  if (looseNodes.length) {
    bands.push({
      key: 'unattached',
      label: 'Stand-alone shapes — nothing in the graph contains them',
      members: looseNodes.sort(byId)
    })
  }

  // Place: each band wraps at PER_ROW, rows centred on the widest row so the
  // picture reads as a lattice rather than as a left-ragged list.
  const widest = Math.max(1, ...bands.map(b => Math.min(b.members.length, PER_ROW)))
  const width = PAD_X * 2 + widest * TILE_W + (widest - 1) * GAP_X
  const positions = new Map()
  let y = PAD_TOP
  for (const band of bands) {
    band.y = y - 18
    const rows = []
    for (let i = 0; i < band.members.length; i += PER_ROW) rows.push(band.members.slice(i, i + PER_ROW))
    for (const row of rows) {
      const rowW = row.length * TILE_W + (row.length - 1) * GAP_X
      const x0 = (width - rowW) / 2
      row.forEach((n, i) => {
        positions.set(n.id, { x: x0 + i * (TILE_W + GAP_X), y, w: TILE_W, h: TILE_H })
      })
      y += TILE_H + GAP_Y
    }
    y += 14
  }
  const height = y

  // Edge geometry: container bottom-centre to contained top-centre, bowed so
  // two edges between the same pair of rows do not lie on top of each other.
  const drawn = []
  for (const e of edges) {
    const a = positions.get(e.container)
    const b = positions.get(e.contained)
    if (!a || !b) continue
    const x1 = a.x + a.w / 2, y1 = a.y + a.h
    const x2 = b.x + b.w / 2, y2 = b.y
    const dy = Math.max(24, Math.abs(y2 - y1) / 2)
    drawn.push({
      id: e.id,
      contained: e.contained,
      container: e.container,
      attestation: e.attestation,
      d: `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`
    })
  }
  const selfLoops = (graph.compositionEdges || [])
    .filter(e => e.contained === e.container)
    .map(e => ({ id: e.id, node: e.contained, attestation: e.attestation }))

  return {
    width,
    height,
    bands,
    positions,
    edges: drawn,
    selfLoops,
    containersOf,
    containedIn,
    levelOf: id => level(id)
  }
}

export default computeLayout
