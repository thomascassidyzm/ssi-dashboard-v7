/**
 * loadGraph — THE ONE PLACE that knows where the shape metagraph comes from.
 *
 * Right now: parsed out of the derivation markdown, because the stored graph
 * artefact has not landed. When it does, this file changes and nothing else does
 * — the parser is deleted, `graph` is imported from the artefact, and every
 * consumer (this page, the Basket/Seed Lab) is untouched. One graph, one home,
 * many readers: no lab keeps its own copy.
 */

import shapeGraphMd from '../../../docs/pods/shape-graph-2026-08-30.md?raw'
import methodPodMd from '../../../docs/pods/method-pod-re-cut-2026-08-30.md?raw'
import { parseShapeGraph } from './parseShapeGraph.js'
import { parseMethodPod } from './parseMethodPod.js'

let cached = null

export function loadGraph () {
  if (!cached) {
    cached = parseShapeGraph(shapeGraphMd, {
      source: 'docs/pods/shape-graph-2026-08-30.md',
      provenance: 'TEMPORARY ADAPTER — parsed from the derivation markdown. The stored graph artefact had not landed when the Script Lab was built; this file is the whole switch.'
    })
  }
  return cached
}

export function loadMethodPodFlow () {
  return parseMethodPod(methodPodMd)
}

export default loadGraph
