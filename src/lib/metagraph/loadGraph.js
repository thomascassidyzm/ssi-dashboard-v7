/**
 * loadGraph — THE ONE PLACE that knows where the shape metagraph comes from.
 *
 * It comes from the store: `services/shared/metagraph/`, landed 2026-08-30. One
 * graph, one home, many readers — the node side reads the same files through
 * `services/shared/metagraph/index.cjs`, this side reads them directly, and no
 * lab keeps a copy of its own.
 *
 * The Method Pod used to be the exception: sixteen ratified scenes parsed out of
 * markdown at runtime, read-only, because they were not rows yet. They are rows
 * now — scenes 1–16 of `method-pod-43-scene` in `canonical_pod_scenarios`, with
 * their shape declarations in `canonical_pod_walk_steps` — so the parser and this
 * import are gone and the pod is read and edited through the store like every
 * other pod (Tom's ruling, 2026-08-30: "it has to then be stored in the DB like
 * everything else in popty editing does").
 */

import nodes from '../../../services/shared/metagraph/nodes.json'
import edges from '../../../services/shared/metagraph/edges.json'
import moves from '../../../services/shared/metagraph/moves.json'
import outcomeShapes from '../../../services/shared/metagraph/outcome-shapes.json'
import podOneWalk from '../../../services/shared/metagraph/walks/pod-1.json'
import { graphFromStore } from './fromStore.js'

let cached = null

export function loadGraph () {
  if (!cached) {
    cached = graphFromStore({ nodes, edges, moves, outcomeShapes, walkSets: { 'pod-1': podOneWalk } })
  }
  return cached
}

export default loadGraph
