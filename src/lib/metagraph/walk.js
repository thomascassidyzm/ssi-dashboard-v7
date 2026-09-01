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
  BRANCH: 'branch',             // one arm of a genuine fork — a step on the path
  ALTERNATIVE: 'alternative',   // surface variance: another phrasing, not a fork
  UNMAPPED: 'unmapped'          // the graph has nothing to say about this line
}

/**
 * Build a walk from `canonical_pod_scenarios` rows (the core-slate shape).
 * `refSpace` names the reference space the graph's attestations are written in;
 * only rows in that space can map, and rows outside it are honestly UNMAPPED.
 */
/**
 * The graph's `g<n>` references are the CORE slate's `global_order` and nobody
 * else's. Every other slate walks in its own reference space, and every line
 * comes back UNMAPPED — which is the true answer, because their row numbers
 * collide with the core slate's by accident and mapping them through this graph
 * would invent coverage out of an off-by-one.
 *
 * THE CORE SLATE IS CALLED `pod-1` SINCE 2026-09-01. It was `pod-0` until the
 * slug migration renamed it and deleted the two sacked slates that used to be
 * called `pod-1` and `pod-0.5`. This constant is a DATABASE SLUG and had to move
 * with it: left at 'pod-0' it made the Script Lab report the core pod as 0/36
 * shapes traversed, 231 lines unmapped — a lie about the one walk the whole
 * graph is derived from.
 *
 * Two nearby strings are NOT this and must not be renamed with it: the bundled
 * walk file `services/shared/metagraph/walks/pod-0.json`, and the `origin:
 * 'pod-0'` provenance labels in fromStore.js. Those record where the material
 * came from historically. Provenance does not get rewritten by a rename.
 */
export const GRAPH_REF_SLUG = 'pod-1'

export function walkFromCanonicalRows (rows, graph, opts = {}) {
  const refSpace = opts.refSpace || (opts.slug && opts.slug !== GRAPH_REF_SLUG ? opts.slug : 'g')
  const mapsToGraph = refSpace === 'g'
  const scenes = []
  const steps = []
  let sceneMap = new Map()

  for (const row of rows || []) {
    const g = row.global_order
    const ref = mapsToGraph && g != null ? `g${g}` : null
    let nodeIds = []
    let kind = STEP_KINDS.UNMAPPED
    let branch = null
    let variant = null
    if (mapsToGraph && g != null) {
      branch = graph.branchRows?.[g] || null
      variant = graph.variantRows?.[g] || null
      if (graph.codaRows.includes(g)) kind = STEP_KINDS.CODA
      else if (branch) { kind = STEP_KINDS.BRANCH; nodeIds = graph.rowIndex[g] || [branch.node] }
      else if (graph.rowIndex[g]) { kind = STEP_KINDS.MOVE; nodeIds = graph.rowIndex[g] }
      else if (variant) kind = STEP_KINDS.ALTERNATIVE
      else if (graph.alternativeRows.includes(g)) kind = STEP_KINDS.ALTERNATIVE
    }
    // Order matters. A row on a BRANCH is a step on the path — g16 continues the
    // walk and g15 is the negative arm the overlay's O1 exists to continue — so it
    // is never demoted to an alternative. Surface variance stays an alternative:
    // a phrasing is not a fork.
    const step = {
      ref,
      nodeId: nodeIds[0] || null,
      nodeIds,
      kind,
      branch,
      variant,
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
        branch: null,
        variant: null,
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

/**
 * Build a walk from a pod whose walk is STORED IN THE DATABASE.
 *
 * `rows` are `canonical_pod_scenarios` rows — the text. `walkSteps` are
 * `canonical_pod_walk_steps` rows — the node references. The two are joined on
 * scene_number, which is where the join belongs: the three 2026-08-30 pods declare
 * their shapes at CHAPTER level, not per turn, so the honest claim is "every line
 * of this chapter is on the chapter's declared traversal" and no per-turn claim is
 * invented. That is the same reading the pod ingest already makes of the
 * re-cut's per-scene headings.
 *
 * A declaration that resolved to nothing in the store stays visible as an
 * UNRESOLVED declaration on the walk — never dropped, never guessed into a
 * mapping, because a fabricated shape id is the one thing that would make the
 * coverage read-out lie.
 */
export function walkFromStoredPod (rows, walkSteps, graph, opts = {}) {
  const knownNodes = new Set(graph.nodes.map(n => n.id))
  const knownOutcomes = new Set(graph.outcomes.map(o => o.id))
  const knownMoves = new Set((graph.moves || []).map(m => m.id))
  const bySceneNodes = new Map()
  const bySceneOutcomes = new Map()
  const bySceneMoves = new Map()
  const declarations = []
  for (const d of walkSteps || []) {
    declarations.push({
      walkId: d.walk_id,
      walkName: d.walk_name,
      sceneNumber: d.scene_number,
      declaredAs: d.declared_as,
      register: d.register,
      resolution: d.resolution,
      nodeId: d.node_id,
      note: d.note
    })
    if (!d.node_id) continue
    const bucket = knownNodes.has(d.node_id) ? bySceneNodes
      : knownOutcomes.has(d.node_id) ? bySceneOutcomes
      : knownMoves.has(d.node_id) ? bySceneMoves : null
    if (!bucket) continue
    if (!bucket.has(d.scene_number)) bucket.set(d.scene_number, [])
    if (!bucket.get(d.scene_number).includes(d.node_id)) bucket.get(d.scene_number).push(d.node_id)
  }

  const scenes = []
  const steps = []
  const sceneMap = new Map()
  for (const row of rows || []) {
    const nodeIds = bySceneNodes.get(row.scene_number) || []
    const outcomes = bySceneOutcomes.get(row.scene_number) || []
    const moveIds = bySceneMoves.get(row.scene_number) || []
    const step = {
      ref: null,
      nodeId: nodeIds[0] || null,
      nodeIds,
      moveIds,
      // A scene is mapped when the graph has anything resolved to say about it —
      // a node, a delivered outcome (the outcome-mint scenes are the pod's most
      // deliberate content, not its unmapped residue), or a move family.
      kind: (nodeIds.length || outcomes.length || moveIds.length) ? STEP_KINDS.MOVE : STEP_KINDS.UNMAPPED,
      branch: null,
      variant: null,
      sceneNumber: row.scene_number,
      // An outcome counts as delivered only when a step DECLARES it. These pods
      // declare theirs per chapter, so the chapter's lines carry the declaration.
      outcomeId: outcomes[0] || null,
      outcomeIds: outcomes,
      payload: {
        id: row.id,
        speaker: row.speaker,
        text: row.english_text,
        target: row.target_text,
        targetLang: row.target_lang,
        notes: row.author_notes,
        globalOrder: row.global_order,
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
        steps: [],
        declarations: (walkSteps || []).filter(d => d.scene_number === row.scene_number)
      }
      sceneMap.set(row.scene_number, scene)
      scenes.push(scene)
    }
    sceneMap.get(row.scene_number).steps.push(step)
  }

  return {
    id: opts.id || opts.slug || 'walk',
    title: opts.title || opts.slug || 'walk',
    source: 'canonical-pod + stored walk',
    // These pods walk in their own reference space: their lines are not pod-0 rows
    // and mapping them through pod-0's g-numbers would invent coverage.
    refSpace: opts.slug || 'pod',
    editable: opts.editable !== false,
    scenes,
    steps,
    declarations,
    unresolved: declarations.filter(d => d.resolution === 'unresolved')
  }
}

export default { walkFromCanonicalRows, walkFromFlow, walkFromStoredPod, STEP_KINDS }
