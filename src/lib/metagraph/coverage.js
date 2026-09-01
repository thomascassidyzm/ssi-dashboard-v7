/**
 * coverage — the read-out this page exists for.
 *
 * A script is a WALK over the shape graph. The question is not "is the script
 * good"; it is: **which shapes does this walk traverse, which does it hit twice
 * or more, and which does it never reach.** That last column is the deficit list,
 * live, rather than a finding inside a report.
 *
 * Pure: no Vue, no network, no fs. The Basket/Seed Lab can import this to ask the
 * admissions question over the same graph without dragging the pod view with it.
 */

import { STEP_KINDS } from './walk.js'

/** The row numbers a walk actually visits, in the graph's own reference space.
 * Only a walk whose refSpace IS the graph's g-space contributes rows: a stored
 * pod's `global_order` is its own numbering, and reading it as a g-number made
 * every stored-walk pod "exercise" pod-1's survivability edges by numeric
 * coincidence (the identical 10/15 read-out across all four pods). */
function visitedRows (walk) {
  const set = new Set()
  if (walk.refSpace !== 'g') return set
  for (const s of walk.steps) {
    if (s.payload?.globalOrder != null) set.add(s.payload.globalOrder)
    else if (s.ref && /^g\d+$/.test(s.ref)) set.add(Number(s.ref.slice(1)))
  }
  return set
}

export function computeCoverage (graph, walk) {
  const rows = visitedRows(walk)
  const scenesTouching = new Map()   // nodeId -> Set(sceneNumber)
  const stepsAtNode = new Map()      // nodeId -> count

  for (const step of walk.steps) {
    for (const id of step.nodeIds || []) {
      stepsAtNode.set(id, (stepsAtNode.get(id) || 0) + 1)
      if (!scenesTouching.has(id)) scenesTouching.set(id, new Set())
      scenesTouching.get(id).add(step.sceneNumber)
    }
  }

  const nodes = graph.nodes.map(node => {
    // An attestation GROUP is one traversal of the shape. A group counts as
    // traversed only when every row it names is present in the walk — a half
    // present group is reported as partial, never rounded up to a traversal.
    let complete = 0
    let partial = 0
    for (const grp of node.attestations) {
      const anyOf = grp.anyOf || []
      if (!grp.rows.length && !anyOf.length) continue
      const present = grp.rows.filter(r => rows.has(r)).length
      // A branch is satisfied by any ONE of its mutually exclusive rows — the
      // walk takes one arm of the fork, never both.
      const branchesTaken = anyOf.filter(set => set.some(r => rows.has(r))).length
      const need = grp.rows.length + anyOf.length
      const got = present + branchesTaken
      if (got === need) complete++
      else if (got > 0) partial++
    }
    const touched = stepsAtNode.get(node.id) || 0
    const sceneCount = (scenesTouching.get(node.id) || new Set()).size
    // Attestation groups are the truth where the walk speaks the graph's own
    // reference space. Where it does not (a flow declaring node ids directly),
    // distinct scenes touching the shape is the honest instance count.
    const hasRowGroups = node.attestations.some(g => g.rows.length > 0)
    const countsByRows = hasRowGroups && walk.refSpace === 'g'
    const traversals = countsByRows ? complete : sceneCount
    return {
      id: node.id,
      title: node.title,
      sequence: node.sequence,
      origin: node.origin,
      traversals,
      partialGroups: partial,
      steps: touched,
      scenes: [...(scenesTouching.get(node.id) || [])].sort((a, b) => a - b),
      status: traversals >= 2 ? 'twice' : traversals === 1 ? 'once' : 'never'
    }
  })

  const traversed = nodes.filter(n => n.traversals >= 1)
  const hitTwice = nodes.filter(n => n.traversals >= 2)
  const neverReached = nodes.filter(n => n.traversals === 0)

  // ---- survivability: the edges the walk exercises, and what the corpus
  // withholds. The derivation's headline is a null result — the branch is
  // attested and the recovery is not — so `recoveryAttested` travels with the
  // edge into the read-out rather than being flattened into a tick.
  const survivability = graph.survivability.map(edge => {
    const present = edge.rows.filter(r => rows.has(r)).length
    return {
      id: edge.id,
      origin: edge.origin,
      attemptable: edge.attemptable,
      presupposes: edge.presupposes,
      recoveryAttested: edge.recoveryAttested,
      recoveryRank: edge.recoveryRank,
      rowsPresent: present,
      rowsTotal: edge.rows.length,
      exercised: edge.rows.length > 0 && present > 0
    }
  })

  // ---- outcome shapes: the overlay's nine. An outcome counts as DELIVERED only
  // when a step declares it. The presence of the row an outcome is *sited on* is
  // not delivery — that is the ask the outcome would hang from, and reading it as
  // coverage is exactly the lie this page exists to stop telling.
  // A scene may declare several outcomes (chapters cut, chapter 10: O4, O6 and
  // O7); reading only the first understated delivery by whole outcomes.
  const declared = new Set(walk.steps.flatMap(s => s.outcomeIds || (s.outcomeId ? [s.outcomeId] : [])))
  const outcomes = graph.outcomes.map(o => ({
    id: o.id,
    name: o.name,
    recovery: o.recovery,
    attested: o.attested,
    mustBeMinted: o.mustBeMinted,
    sitedOn: o.sitedOn,
    delivered: declared.has(o.id),
    siteInWalk: o.sitedRows.length > 0 && o.sitedRows.every(r => rows.has(r))
  }))

  const kinds = { move: 0, branch: 0, coda: 0, alternative: 0, unmapped: 0 }
  const unmappedSteps = []
  for (const s of walk.steps) {
    kinds[s.kind] = (kinds[s.kind] || 0) + 1
    if (s.kind === STEP_KINDS.UNMAPPED) unmappedSteps.push(s)
  }

  return {
    walkId: walk.id,
    graphSource: graph.source,
    totals: {
      steps: walk.steps.length,
      scenes: walk.scenes.length,
      nodes: graph.nodes.length,
      traversed: traversed.length,
      hitTwice: hitTwice.length,
      neverReached: neverReached.length,
      mapped: kinds.move + kinds.branch,
      branches: kinds.branch,
      unmapped: kinds.unmapped,
      codas: kinds.coda,
      alternatives: kinds.alternative,
      outcomesDelivered: outcomes.filter(o => o.delivered).length,
      outcomesMissing: outcomes.filter(o => !o.delivered).length
    },
    nodes,
    traversed,
    hitTwice,
    neverReached,
    survivability,
    outcomes,
    unmappedSteps
  }
}

export default computeCoverage
