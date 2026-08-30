/**
 * The walk data model.
 *
 * Watson's ruling, 2026-08-30, and it is settled: **a walk is a sequence of node
 * references, never text with annotations bolted on.** Text hangs off the node
 * reference; the node reference never hangs off the text. That is what keeps
 * generated authoring possible later ("select the shapes this pod should teach,
 * and let the walk be generated") without building it now.
 *
 * So a step is:
 *   { ref, nodeId, kind, payload }
 * where `ref` is the corpus row reference the graph speaks in (`g14`, `M:1:54`),
 * `nodeId` is the shape it traverses (or null), `kind` says what sort of element
 * it is, and `payload` is the disposable surface — speaker, English, the DB id.
 *
 * Pure: no Vue, no network, no fs.
 */

export const STEP_KINDS = {
  MOVE: 'move',                 // a position in a shape — the walk proper
  CODA: 'coda',                 // scene-exit vocabulary drip: ADMITS, not a move
  ALTERNATIVE: 'alternative',   // an alternative AT a node, not a step on the path
  UNMAPPED: 'unmapped'          // the graph has nothing to say about this line
}

/**
 * Build a walk from `canonical_pod_scenarios` rows (the POD-1 / pod-0 shape).
 * `refSpace` names the reference space the graph's attestations are written in;
 * only rows in that space can map, and rows outside it are honestly UNMAPPED.
 */
export function walkFromCanonicalRows (rows, graph, opts = {}) {
  const refSpace = opts.refSpace || 'g'
  const mapsToGraph = refSpace === 'g'
  const scenes = []
  const steps = []
  let sceneMap = new Map()

  for (const row of rows || []) {
    const g = row.global_order
    const ref = mapsToGraph && g != null ? `g${g}` : null
    let nodeIds = []
    let kind = STEP_KINDS.UNMAPPED
    if (mapsToGraph && g != null) {
      if (graph.codaRows.includes(g)) kind = STEP_KINDS.CODA
      else if (graph.rowIndex[g]) { kind = STEP_KINDS.MOVE; nodeIds = graph.rowIndex[g] }
      else if (graph.alternativeRows.includes(g)) kind = STEP_KINDS.ALTERNATIVE
    }
    // An alternative row that is ALSO attested at a node is a move first: the
    // derivation lists g15 both ways and the node attestation is the stronger claim.
    const step = {
      ref,
      nodeId: nodeIds[0] || null,
      nodeIds,
      kind,
      sceneNumber: row.scene_number,
      outcomeId: null,
      payload: {
        id: row.id,
        speaker: row.speaker,
        text: row.english_text,
        notes: row.author_notes,
        globalOrder: g,
        sentenceNumber: row.sentence_number
      }
    }
    steps.push(step)
    if (!sceneMap.has(row.scene_number)) {
      const scene = {
        number: row.scene_number,
        label: row.scene_label,
        title: row.scene_title,
        subtitle: row.scene_subtitle,
        steps: []
      }
      sceneMap.set(row.scene_number, scene)
      scenes.push(scene)
    }
    sceneMap.get(row.scene_number).steps.push(step)
  }

  return {
    id: opts.id || 'walk',
    title: opts.title || opts.id || 'walk',
    source: opts.source || 'canonical-pod',
    refSpace,
    editable: opts.editable !== false,
    scenes,
    steps
  }
}

/**
 * Build a walk from an already-shaped external flow — the door Aran's health
 * sequences come through. A flow is DATA, never a special case in this file:
 *
 *   { id, title, refSpace, scenes: [ { number, title, subtitle,
 *       lines: [ { ref?, nodeId?, speaker, text } ] } ] }
 *
 * A line that declares `nodeId` maps directly. A line that declares only `ref`
 * maps through the graph's own index if the ref is in the graph's space.
 * A line that declares neither is UNMAPPED and is shown as such — never guessed.
 */
export function walkFromFlow (flow, graph, opts = {}) {
  const refSpace = flow.refSpace || 'flow'
  const knownNodes = new Set(graph.nodes.map(n => n.id))
  const scenes = []
  const steps = []
  for (const sc of flow.scenes || []) {
    const scene = { number: sc.number, label: sc.label, title: sc.title, subtitle: sc.subtitle, steps: [] }
    for (const line of sc.lines || []) {
      let nodeId = line.nodeId && knownNodes.has(line.nodeId) ? line.nodeId : null
      if (!nodeId && line.ref && refSpace === 'g') {
        const g = Number(String(line.ref).replace(/^g/, ''))
        nodeId = (graph.rowIndex[g] || [])[0] || null
      }
      const step = {
        ref: line.ref || null,
        nodeId,
        nodeIds: nodeId ? [nodeId] : [],
        kind: nodeId ? STEP_KINDS.MOVE : (line.kind || STEP_KINDS.UNMAPPED),
        sceneNumber: sc.number,
        outcomeId: line.outcomeId || null,
        payload: { id: line.id || null, speaker: line.speaker, text: line.text, target: line.target }
      }
      steps.push(step)
      scene.steps.push(step)
    }
    scenes.push(scene)
  }
  return {
    id: flow.id || opts.id || 'flow',
    title: flow.title || flow.id || 'flow',
    source: flow.source || 'flow',
    refSpace,
    editable: false,
    scenes,
    steps
  }
}

export default { walkFromCanonicalRows, walkFromFlow, STEP_KINDS }
