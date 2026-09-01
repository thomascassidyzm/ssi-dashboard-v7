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
    const steps = walk.steps.filter(s => s.node === shapeId || s.composed_in?.node === shapeId)
    const rows = []
    const anyOf = []
    for (const step of steps) {
      const r = rowNumber(step.row)
      if (r != null) { rows.push(r); continue }
      // A BRANCH step has no row of its own: its rows live on its branches, and
      // they are mutually exclusive. Requiring both would make the one genuine
      // fork in the corpus permanently untraversable, so a branch is satisfied by
      // ANY ONE of its rows.
      const branchRows = (step.branches || []).map(b => rowNumber(b.row)).filter(r2 => r2 != null)
      if (branchRows.length) anyOf.push(branchRows)
    }
    if (rows.length || anyOf.length) groups.push({ raw: `${walk.id} ${walk.name}`, rows, anyOf, methodRefs: [] })
  }
  if (!groups.length) {
    for (const run of shape.attestations?.corpus || []) {
      const rows = gRows(run)
      if (rows.length) groups.push({ raw: run, rows, anyOf: [], methodRefs: [] })
    }
    // Non-corpus attestation spaces (method M-refs, talk-bollocks part:line,
    // trades' constructed sites) all carry no g-rows; each ref is one group.
    for (const [space, refs] of Object.entries(shape.attestations || {})) {
      if (space === 'corpus') continue
      for (const ref of refs || []) groups.push({ raw: ref, rows: [], anyOf: [], methodRefs: [ref] })
    }
  }
  return groups
}

const RECOVERY_RANK = { never: 0, once: 1, twice: 2, repeated: 2 }

export function graphFromStore ({ nodes, edges, moves, outcomeShapes, walkSets = {} }) {
  const podWalk = walkSets['pod-1'] || null
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
    origin: s.provenance || 'pod-1',
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
      origin: 'pod-1',
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
    })),
    // The ratified Talk Bollocks edges (S301–S305) attest in that corpus's own
    // part:line space, never in g-rows, so like the M edges they carry no rows.
    ...(edges.survivability?.talk_bollocks || []).map(e => ({
      id: e.id,
      origin: 'talk-bollocks',
      attemptable: e.b_attemptable_only_if,
      presupposes: e.a_survivable,
      attestedAt: (e.attested_response_positions || []).join('; '),
      rows: [],
      methodRefs: e.attested_response_positions || [],
      recoveryAttested: e.recovery_note || e.recovery_attested,
      recoveryRank: RECOVERY_RANK[e.recovery_attested] ?? 1,
      answerSlotClass: e.answer_slot_class || ''
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
  const branchRows = {}
  for (const walk of storedWalks) {
    for (const step of walk.steps) {
      const ids = [step.node, step.composed_in?.node].filter(Boolean)
      const attach = r => { if (r != null) rowIndex[r] = [...new Set([...(rowIndex[r] || []), ...ids])] }
      attach(rowNumber(step.row))
      // The branch step's own rows are steps on the path — g16 continues the walk
      // and g15 is the negative branch the overlay's O1 exists to continue. Both
      // walk N3; neither is a phrasing.
      for (const b of step.branches || []) {
        const r = rowNumber(b.row)
        attach(r)
        if (r != null) {
          branchRows[r] = {
            walk: walk.id,
            node: step.node,
            key: b.key,
            polarity: b.polarity,
            alternative: b.alternative,
            continues: !!b.continues,
            siblings: (step.branches || []).map(x => x.row).filter(x => x !== b.row)
          }
        }
      }
    }
  }

  // Surface variance is a SEPARATE field in the store, and keeping it separate is
  // the point: a phrasing is never a fork. g7/g12/g13 are other ways of saying a
  // row that is on the walk; g15 is an alternative OUTCOME and is handled above.
  const variantRows = {}
  for (const alt of podWalk?.alternatives || []) {
    const r = rowNumber(alt.row)
    if (r != null) variantRows[r] = { kind: alt.kind, of: alt.of, walk: alt.walk, note: alt.note || '' }
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
    branchRows,
    variantRows,
    accounting: podWalk?.accounting || null
  }
}

export default graphFromStore
