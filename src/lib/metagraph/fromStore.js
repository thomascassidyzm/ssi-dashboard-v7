/**
 * fromStore — read the metagraph store into the shape the coverage read-out uses.
 *
 * The store is `services/shared/metagraph/` (landed 2026-08-30, commit 547bd253d):
 * one home, one set of files, both labs consume it. Nothing here copies it, edits
 * it or improves its schema — this is a projection, and `services/shared/metagraph/
 * index.cjs` remains the node-side reader of exactly the same files.
 *
 * Pure: takes the parsed JSON, returns a plain object. No Vue, no network, no fs.
 */

/** Every `g<n>` in a string or list of strings, in order, de-duplicated. */
function gRows (input) {
  const text = Array.isArray(input) ? input.join(' ; ') : String(input || '')
  const out = []
  for (const m of text.matchAll(/g(\d+)/g)) {
    const n = Number(m[1])
    if (!out.includes(n)) out.push(n)
  }
  return out
}

function rowNumber (ref) {
  const m = /^g(\d+)$/.exec(String(ref || ''))
  return m ? Number(m[1]) : null
}

/**
 * An attestation GROUP is one traversal of the shape. Where the store encodes a
 * walk that visits the shape, that walk IS the group and its rows are the rows it
 * visits there — the strongest available claim. Where it does not (the five
 * Method Pod nodes, the six bound pairs), the derivation's own attestation runs
 * are used instead, one group per run.
 */
function groupsForShape (shapeId, shape, storedWalks) {
  const groups = []
  for (const walk of storedWalks) {
    const rows = walk.steps
      .filter(s => s.node === shapeId || s.composed_in?.node === shapeId)
      .map(s => rowNumber(s.row))
      .filter(r => r != null)
    if (rows.length) groups.push({ raw: `${walk.id} ${walk.name}`, rows, methodRefs: [] })
  }
  if (!groups.length) {
    for (const run of shape.attestations?.corpus || []) {
      const rows = gRows(run)
      if (rows.length) groups.push({ raw: run, rows, methodRefs: [] })
    }
    for (const ref of shape.attestations?.method || []) {
      groups.push({ raw: ref, rows: [], methodRefs: [ref] })
    }
  }
  return groups
}

const RECOVERY_RANK = { never: 0, once: 1, twice: 2, repeated: 2 }

export function graphFromStore ({ nodes, edges, moves, outcomeShapes, walkSets = {} }) {
  const podWalk = walkSets['pod-0'] || null
  const storedWalks = podWalk?.walks || []

  const shapes = [
    ...(nodes.nodes || []).map(n => ({ ...n, kind: 'node' })),
    ...(nodes.bound_pairs || []).map(p => ({ ...p, kind: 'bound-pair' }))
  ]

  const graphNodes = shapes.map(s => ({
    id: s.id,
    title: s.name,
    kind: s.kind,
    sequence: (s.positions || []).map(p => p.name).join(' → '),
    origin: s.provenance || 'pod-0',
    attestations: groupsForShape(s.id, s, storedWalks)
  }))

  const compositionEdges = (edges.composition || []).map(e => ({
    id: e.id,
    contained: e.contained,
    container: e.container,
    attestation: e.attestation,
    rows: gRows(e.attestation)
  }))

  const survivability = [
    ...(edges.survivability?.corpus || []).map(e => ({
      id: e.id,
      origin: 'pod-0',
      attemptable: e.b_attemptable_only_if,
      presupposes: e.a_survivable,
      attestedAt: (e.attested_response_positions || []).join('; '),
      rows: gRows(e.attested_response_positions),
      // The store says how often the recovery was ever attested. The graph carries
      // no safety weight of its own, so this is surfaced as the honest proxy for
      // the cost of failing to recover — nothing is invented.
      recoveryAttested: e.recovery_note || e.recovery_attested,
      recoveryRank: RECOVERY_RANK[e.recovery_attested] ?? 2,
      answerSlotClass: e.answer_slot_class || ''
    })),
    ...(edges.survivability?.method_pod || []).map(e => ({
      id: e.id,
      origin: 'method-pod',
      attemptable: e.b_attemptable_only_if,
      presupposes: e.a_survivable,
      attestedAt: (e.method_attestation || []).join('; '),
      rows: [],
      methodRefs: e.method_attestation || [],
      recoveryAttested: e.recovery_note || e.recovery_attested || 'Method Pod only',
      recoveryRank: RECOVERY_RANK[e.recovery_attested] ?? 1
    }))
  ]

  const outcomes = (outcomeShapes.outcome_shapes || []).map(o => ({
    id: o.id,
    name: o.name,
    recovery: o.recovery_the_learner_must_own,
    attested: o.attested,
    attestationClass: o.attestation_class,
    mustBeMinted: o.attestation_class === 'minted',
    sitedOn: o.sited_on,
    sitedRows: gRows(o.sited_on),
    why: o.why_there,
    sequencePosition: o.sequence_position
  })).sort((a, b) => (a.sequencePosition || 99) - (b.sequencePosition || 99))

  const codaRows = (podWalk?.codas || []).map(c => rowNumber(c.row)).filter(r => r != null)
  const alternativeRows = (podWalk?.alternatives || []).map(a => rowNumber(a.row)).filter(r => r != null)

  // The row → shape index, per row, from the encoded walks. A step's own node and
  // the node it is composed INTO are both true of the row: that is composition
  // doing its job, not double counting.
  const rowIndex = {}
  for (const walk of storedWalks) {
    for (const step of walk.steps) {
      const r = rowNumber(step.row)
      if (r == null) continue
      const ids = [step.node, step.composed_in?.node].filter(Boolean)
      rowIndex[r] = [...new Set([...(rowIndex[r] || []), ...ids])]
    }
  }

  return {
    source: 'services/shared/metagraph/',
    provenance: [
      `store v${nodes.version || '1'} — ${storedWalks.length} of ${podWalk?.accounting?.complete_walks_in_corpus || '?'} complete walks encoded`,
      podWalk?.accounting?.rows_on_complete_walks_not_yet_placed
        ? `${podWalk.accounting.rows_on_complete_walks_not_yet_placed} rows on complete walks are a named gap in the store and read as UNMAPPED here`
        : ''
    ].filter(Boolean).join('. '),
    nodes: graphNodes,
    moves: moves.moves || [],
    compositionEdges,
    survivability,
    outcomes,
    codaRows,
    alternativeRows,
    rowIndex,
    accounting: podWalk?.accounting || null
  }
}

export default graphFromStore
