/**
 * loadGraph — THE ONE PLACE that knows where the shape metagraph comes from.
 *
 * It comes from the store: `services/shared/metagraph/`, landed 2026-08-30. One
 * graph, one home, many readers — the node side reads the same files through
 * `services/shared/metagraph/index.cjs`, this side reads them directly, and no
 * lab keeps a copy of its own.
 */

import nodes from '../../../services/shared/metagraph/nodes.json'
import edges from '../../../services/shared/metagraph/edges.json'
import moves from '../../../services/shared/metagraph/moves.json'
import outcomeShapes from '../../../services/shared/metagraph/outcome-shapes.json'
import podZeroWalk from '../../../services/shared/metagraph/walks/pod-0.json'
import methodPodMd from '../../../docs/pods/method-pod-re-cut-2026-08-30.md?raw'
import { graphFromStore } from './fromStore.js'
import { parseMethodPod } from './parseMethodPod.js'

let cached = null

export function loadGraph () {
  if (!cached) {
    cached = graphFromStore({ nodes, edges, moves, outcomeShapes, walkSets: { 'pod-0': podZeroWalk } })
  }
  return cached
}

// The Method Pod has no store yet — the sixteen ratified scenes live in the
// re-cut document. It is read from there, read-only, so the one instrument still
// covers it. When it gets a store, this import is the whole switch.
export function loadMethodPodFlow () {
  return parseMethodPod(methodPodMd)
}

export default loadGraph
