/**
 * parseShapeGraph — turn the shape-graph derivation into a machine-readable graph.
 *
 * TEMPORARY BY DESIGN. The derivation (`docs/pods/shape-graph-2026-08-30.md`,
 * commit 14cb44920) is the graph's only expression today; a sibling job is giving
 * the metagraph a stored home. When that artefact lands, `loadGraph.js` points at
 * it and this parser is deleted — it is the ONLY place that knows the markdown's
 * shape, and `loadGraph.js` is the only place that knows where the graph comes
 * from. One switch, two files.
 *
 * Pure: takes markdown text, returns a plain object. No Vue, no network, no fs.
 */

/** Strip markdown emphasis/backticks from a table cell. */
function plain (s) {
  return String(s || '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Split a markdown table row into its cells. */
function cells (line) {
  const t = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return t.split('|').map(c => c.trim())
}

function isTableRow (line) {
  return /^\s*\|/.test(line) && !/^\s*\|[\s:-]+\|/.test(line)
}

/** Every `g<n>` mentioned in a cell, in order, de-duplicated. */
function gRows (cell) {
  const out = []
  for (const m of String(cell).matchAll(/g(\d+)/g)) {
    const n = Number(m[1])
    if (!out.includes(n)) out.push(n)
  }
  return out
}

/** Every `M:part:line` reference in a cell (Method Pod attestations). */
function mRefs (cell) {
  const out = []
  for (const m of String(cell).matchAll(/M:(\d+):(\d+)/g)) {
    const ref = `M:${m[1]}:${m[2]}`
    if (!out.includes(ref)) out.push(ref)
  }
  return out
}

/**
 * An attestation CELL holds several independent attestation GROUPS, separated by
 * semicolons. A group is one traversal of the node: `g10→g11→g18→g19` is one
 * walk over N2, `g38→g43` is another. Counting groups is what makes "hit twice"
 * mean something.
 */
function attestationGroups (cell) {
  return String(cell)
    .split(';')
    .map(part => ({ raw: plain(part), rows: gRows(part), methodRefs: mRefs(part) }))
    .filter(g => g.rows.length > 0 || g.methodRefs.length > 0)
}

/** Collect the contiguous table rows that follow a heading match. */
function tableAfter (lines, startIdx) {
  const rows = []
  let i = startIdx
  // skip forward to the first table row
  while (i < lines.length && !isTableRow(lines[i])) {
    if (/^#{1,4}\s/.test(lines[i]) && i > startIdx) break
    i++
  }
  let seenHeader = false
  for (; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*\|[\s:-]+\|/.test(line)) { seenHeader = true; continue }
    if (!isTableRow(line)) {
      if (line.trim() === '') { if (rows.length) break; else continue }
      break
    }
    if (!seenHeader) continue // the header row itself
    rows.push(cells(line))
  }
  return rows
}

function findLine (lines, re) {
  return lines.findIndex(l => re.test(l))
}

export function parseShapeGraph (markdown, meta = {}) {
  const lines = String(markdown).split('\n')

  // ---- nodes -------------------------------------------------------------
  const nodes = []
  const nodeTables = [
    { re: /^###\s+From\s+`?pod-0`?\s+—/, origin: 'pod-0' },
    { re: /^###\s+From the Method Pod only/, origin: 'method-pod' }
  ]
  for (const { re, origin } of nodeTables) {
    const idx = findLine(lines, re)
    if (idx < 0) continue
    for (const row of tableAfter(lines, idx)) {
      const label = plain(row[0])
      const m = label.match(/^(N\d+)\s+(.*)$/)
      if (!m) continue
      nodes.push({
        id: m[1],
        title: m[2],
        sequence: plain(row[1]),
        origin,
        attestations: attestationGroups(row[2] || '')
      })
    }
  }

  // ---- composition edges -------------------------------------------------
  const compositionEdges = []
  const compIdx = findLine(lines, /^##\s+3\.\s+The composition edges/)
  if (compIdx >= 0) {
    for (const row of tableAfter(lines, compIdx)) {
      compositionEdges.push({
        contained: plain(row[0]),
        container: plain(row[1]),
        attestation: plain(row[2]),
        rows: gRows(row[2] || '')
      })
    }
  }

  // ---- survivability edges ----------------------------------------------
  const survivability = []
  const s4a = findLine(lines, /^###\s+4a\./)
  if (s4a >= 0) {
    for (const row of tableAfter(lines, s4a)) {
      const id = plain(row[0])
      if (!/^S\d+$/.test(id)) continue
      const recovery = plain(row[4] || '')
      survivability.push({
        id,
        origin: 'pod-0',
        attemptable: plain(row[1]),
        presupposes: plain(row[2]),
        attestedAt: plain(row[3]),
        rows: gRows(row[3] || ''),
        recoveryAttested: recovery,
        // The graph carries no explicit safety weight. What it DOES carry is how
        // often the recovery was ever attested — the nearest honest proxy for
        // "how costly is failing to recover here", surfaced rather than invented.
        recoveryRank: /never/i.test(recovery) ? 0 : /once/i.test(recovery) ? 1 : 2
      })
    }
  }
  const s4b = findLine(lines, /^###\s+4b\./)
  if (s4b >= 0) {
    for (const row of tableAfter(lines, s4b)) {
      const id = plain(row[0])
      if (!/^M\d+$/.test(id)) continue
      survivability.push({
        id,
        origin: 'method-pod',
        attemptable: plain(row[1]),
        presupposes: plain(row[2]),
        attestedAt: plain(row[3]),
        rows: [],
        methodRefs: mRefs(row[3] || ''),
        recoveryAttested: 'Method Pod only',
        recoveryRank: 1
      })
    }
  }

  // ---- outcome shapes (the overlay — the nine) --------------------------
  // §6 states the minted set in prose — "Four of them — O3, O1, O6, O7 — rest on
  // nothing attested in either corpus" — and that sentence is the authority, not
  // the Attested? column (O1 is attested in DRILL only, which is not an exchange).
  const mintedLine = lines.find(l => /rest on nothing attested/i.test(l)) || ''
  const mintedIds = [...mintedLine.matchAll(/\bO(\d+)\b/g)].map(m => `O${m[1]}`)

  const outcomes = []
  const outIdx = findLine(lines, /^###\s+The count:\s+nine/)
  if (outIdx >= 0) {
    for (const row of tableAfter(lines, outIdx)) {
      const id = plain(row[0])
      if (!/^O\d+$/.test(id)) continue
      const attested = plain(row[3] || '')
      outcomes.push({
        id,
        name: plain(row[1]),
        recovery: plain(row[2]),
        attested,
        mustBeMinted: mintedIds.length ? mintedIds.includes(id) : /^nowhere/i.test(attested),
        sitedOn: plain(row[4]),
        sitedRows: gRows(row[4] || ''),
        why: plain(row[5] || '')
      })
    }
  }

  // ---- rows that are not moves ------------------------------------------
  // §5's acceptance table names them explicitly: 16 scene-exit vocabulary drips
  // (pure ADMITS, never a position in a shape) and 4 rows that are alternatives
  // at a node rather than steps on a path.
  let codaRows = []
  let alternativeRows = []
  const accIdx = findLine(lines, /^##\s+5\.\s+The acceptance test/)
  if (accIdx >= 0) {
    for (const row of tableAfter(lines, accIdx)) {
      const kind = plain(row[0])
      if (/narrator vocab codas/i.test(kind)) codaRows = gRows(row[1] || '')
      if (/alternatives at a node/i.test(kind)) alternativeRows = gRows(row[1] || '')
    }
  }

  // ---- the row → node index ---------------------------------------------
  const rowIndex = {}
  for (const node of nodes) {
    for (const group of node.attestations) {
      for (const r of group.rows) {
        (rowIndex[r] = rowIndex[r] || []).push(node.id)
      }
    }
  }
  for (const r of Object.keys(rowIndex)) rowIndex[r] = [...new Set(rowIndex[r])]

  return {
    source: meta.source || 'docs/pods/shape-graph-2026-08-30.md',
    provenance: meta.provenance || 'parsed from the derivation markdown (no stored artefact yet)',
    nodes,
    compositionEdges,
    survivability,
    outcomes,
    codaRows,
    alternativeRows,
    rowIndex
  }
}

export default parseShapeGraph
