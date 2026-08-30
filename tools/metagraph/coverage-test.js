#!/usr/bin/env node
/**
 * The coverage arithmetic, checked. Single process, no framework, no browser:
 * the read-out this page exists for is a count, and a wrong count is a wrong
 * deficit list. Run: `node tools/metagraph/coverage-test.js`
 */
import fs from 'fs'
import path from 'path'
import assert from 'assert'
import { fileURLToPath } from 'url'
import { graphFromStore } from '../../src/lib/metagraph/fromStore.js'
import { walkFromCanonicalRows, walkFromFlow, walkFromStoredPod } from '../../src/lib/metagraph/walk.js'
import { computeCoverage } from '../../src/lib/metagraph/coverage.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const j = f => JSON.parse(fs.readFileSync(path.join(root, 'services/shared/metagraph', f), 'utf8'))
const graph = graphFromStore({
  nodes: j('nodes.json'),
  edges: j('edges.json'),
  moves: j('moves.json'),
  outcomeShapes: j('outcome-shapes.json'),
  walkSets: { 'pod-0': j('walks/pod-0.json') }
})

let pass = 0
function check (name, fn) {
  try { fn(); pass++; console.log(`  ok   ${name}`) }
  catch (e) { console.error(`  FAIL ${name}\n       ${e.message}`); process.exitCode = 1 }
}

console.log('\nthe store reads into the shape the read-out uses, with the derivation\'s own numbers')
check('17 nodes — twelve from pod-0, five from the Method Pod — plus the six bound pairs', () => {
  const nodes = graph.nodes.filter(n => n.kind === 'node')
  assert.equal(nodes.length, 17)
  assert.equal(nodes.filter(n => n.origin === 'pod-0').length, 12)
  assert.equal(nodes.filter(n => n.origin === 'method-pod').length, 5)
  assert.equal(graph.nodes.filter(n => n.kind === 'bound-pair').length, 6)
})
check('19 composition edges', () => assert.equal(graph.compositionEdges.length, 19))
check('10 survivability edges from the corpus, 5 from the Method Pod', () => {
  assert.equal(graph.survivability.filter(s => s.origin === 'pod-0').length, 10)
  assert.equal(graph.survivability.filter(s => s.origin === 'method-pod').length, 5)
})
check('nine outcome shapes, four of them minted from nothing', () => {
  assert.equal(graph.outcomes.length, 9)
  assert.deepEqual(graph.outcomes.filter(o => o.mustBeMinted).map(o => o.id).sort(), ['O1', 'O3', 'O6', 'O7'])
  assert.equal(graph.outcomes[0].id, 'O3', 'sequenced by redemption latency, shortest strand first')
})
check('16 codas and 4 alternatives, exactly the rows the acceptance test names', () => {
  assert.equal(graph.codaRows.length, 16)
  assert.deepEqual(graph.alternativeRows.sort((a, b) => a - b), [7, 12, 13, 15])
})
check('the null result survives the read — S2, the hedge, has no attested recovery', () => {
  const s2 = graph.survivability.find(s => s.id === 'S2')
  assert.equal(s2.recoveryRank, 0)
  assert.match(s2.recoveryAttested, /Never|never/)
})

console.log('\ncoverage on a hand-built walk with a known answer')
// N1's attestation groups are g1→g2, g20→g21, g23→g24, … Give the walk g1 and g2
// and it traverses N1 once; add g20 and g21 and it has hit N1 twice. Nothing else
// is reachable, so the other sixteen shapes are the deficit list.
const rowsFor = gs => gs.map(g => ({ id: `x${g}`, global_order: g, scene_number: 1, english_text: `line ${g}`, speaker: 'Narrator' }))
check('one complete attestation group = traversed once', () => {
  // W2 "Morning greeting" is g1–g4, every step N1 and nothing else.
  const cov = computeCoverage(graph, walkFromCanonicalRows(rowsFor([1, 2, 3, 4]), graph))
  const n1 = cov.nodes.find(n => n.id === 'N1')
  assert.equal(n1.traversals, 1, 'the morning greeting is one traversal of N1')
  assert.equal(n1.status, 'once')
  assert.equal(cov.totals.traversed, 1)
  assert.equal(cov.totals.neverReached, graph.nodes.length - 1)
})
check('two complete groups = hit twice, and that is what the twice column counts', () => {
  // add W4, the arrangement: g20 is N7 with the ritual open composed into it.
  const cov = computeCoverage(graph, walkFromCanonicalRows(rowsFor([1, 2, 3, 4, 20, 21, 22]), graph))
  const n1 = cov.nodes.find(n => n.id === 'N1')
  assert.equal(n1.traversals, 2, `N1 traversed ${n1.traversals} times`)
  assert.equal(n1.status, 'twice')
  assert.equal(cov.nodes.find(n => n.id === 'N7').traversals, 1, 'and N7 once — a shape hit twice and a shape hit once, together')
  assert.equal(cov.totals.hitTwice, 1)
})
check('a half-present group is partial, never rounded up to a traversal', () => {
  const cov = computeCoverage(graph, walkFromCanonicalRows(rowsFor([20]), graph))
  const n7 = cov.nodes.find(n => n.id === 'N7')
  assert.equal(n7.traversals, 0, 'the proposal without its two declines does not traverse N7')
  assert.equal(n7.partialGroups >= 1, true)
  assert.equal(cov.totals.neverReached, graph.nodes.length - 1)
})
check('the one genuine fork walks: either arm of g15/g16 traverses N3, and neither is a phrasing', () => {
  // W1's N3 visit is g14 (the ticket) then a BRANCH step whose arms are g15 and
  // g16. Both arms walk N3; requiring both would make the corpus's only fork
  // permanently untraversable.
  const yes = computeCoverage(graph, walkFromCanonicalRows(rowsFor([14, 16]), graph))
  const no = computeCoverage(graph, walkFromCanonicalRows(rowsFor([14, 15]), graph))
  assert.equal(yes.nodes.find(n => n.id === 'N3').traversals, 1, 'the yes arm traverses N3')
  assert.equal(no.nodes.find(n => n.id === 'N3').traversals, 1, 'and so does the no arm')
  assert.equal(yes.totals.branches, 1)
  assert.equal(no.totals.branches, 1)
  const g15 = no.unmappedSteps.find(s => s.payload.globalOrder === 15)
  assert.equal(g15, undefined, 'g15 is a step on the path, never unmapped')
})
check('surface variance is not a fork and never counts as a traversal', () => {
  // g12 and g13 are other ways of saying g14. On their own they walk nothing.
  const cov = computeCoverage(graph, walkFromCanonicalRows(rowsFor([12, 13]), graph))
  assert.equal(cov.totals.alternatives, 2)
  assert.equal(cov.totals.traversed, 0, 'a phrasing traverses nothing')
  const step = cov.unmappedSteps.find(s => s.payload.globalOrder === 12)
  assert.equal(step, undefined, 'and it is not unmapped either — it is a named variant')
})
check('a coda is ADMITS, not a move; an unknown row is UNMAPPED, not dropped', () => {
  const cov = computeCoverage(graph, walkFromCanonicalRows(rowsFor([37, 9999]), graph))
  assert.equal(cov.totals.codas, 1)
  assert.equal(cov.totals.unmapped, 1)
  assert.equal(cov.totals.steps, 2, 'nothing is silently dropped')
  assert.equal(cov.unmappedSteps[0].payload.globalOrder, 9999)
})
check('a sited row is not a delivered outcome — all nine stay on the deficit list', () => {
  const cov = computeCoverage(graph, walkFromCanonicalRows(rowsFor([38, 43, 47]), graph))
  assert.equal(cov.totals.outcomesDelivered, 0)
  assert.equal(cov.totals.outcomesMissing, 9)
  const o3 = cov.outcomes.find(o => o.id === 'O3')
  assert.equal(o3.siteInWalk, true, 'the café order it is sited on IS in the walk')
  assert.equal(o3.delivered, false, 'and it is still not delivered')
})
check('a flow that declares an outcome does deliver it', () => {
  const flow = { id: 'f', refSpace: 'flow', scenes: [{ number: 1, title: 'no cash', lines: [
    { speaker: 'Native', text: 'Sorry, we only take cash.', nodeId: 'N2', outcomeId: 'O1' }
  ] }] }
  const cov = computeCoverage(graph, walkFromFlow(flow, graph))
  assert.equal(cov.totals.outcomesDelivered, 1)
  assert.equal(cov.outcomes.find(o => o.id === 'O1').delivered, true)
  assert.equal(cov.nodes.find(n => n.id === 'N2').traversals, 1, 'a declared node id counts as a scene-level traversal')
})
check('a flow line with no node and no ref is UNMAPPED, and says so', () => {
  const flow = { id: 'f', refSpace: 'flow', scenes: [{ number: 1, lines: [{ speaker: 'A', text: 'hello' }] }] }
  const cov = computeCoverage(graph, walkFromFlow(flow, graph))
  assert.equal(cov.totals.unmapped, 1)
  assert.equal(cov.totals.traversed, 0)
})

// The Method Pod used to be parsed here out of markdown, because its scenes were
// not rows. They are rows now, so what is checked is the path they arrive by: a
// pod whose shapes are DECLARED PER SCENE in `canonical_pod_walk_steps`, which is
// how both Method Pod cuts and the Learning flagship are stored. Offline and
// deterministic, as this test has always been — no DB, no markdown.
console.log('\na stored pod declares its shapes per scene, and covers')
const storedRows = [
  { id: 'p:SC01-S01', scene_number: 1, scene_label: 'Scene 1', scene_title: 'Cento ore', scene_subtitle: 'the precision haggle', sentence_number: 1, global_order: 1, speaker: 'TOM', english_text: 'How much time is it going to take?' },
  { id: 'p:SC01-S02', scene_number: 1, scene_label: 'Scene 1', scene_title: 'Cento ore', scene_subtitle: 'the precision haggle', sentence_number: 2, global_order: 2, speaker: 'ARAN', english_text: 'A hundred hours.' },
  { id: 'p:SC02-S01', scene_number: 2, scene_label: 'Scene 2', scene_title: 'Il cane', scene_subtitle: 'the flagged guess', sentence_number: 1, global_order: 3, speaker: 'TOM', english_text: 'No shape is claimed for this one.' }
]
const storedSteps = [
  { pod_slug: 'p', walk_id: 'w', walk_name: 'w', scene_number: 1, step_order: 1, declared_as: 'the precision haggle', register: 'named', resolution: 'alias', node_id: 'N16', note: '' },
  { pod_slug: 'p', walk_id: 'w', walk_name: 'w', scene_number: 2, step_order: 1, declared_as: 'the flagged guess', register: 'm', resolution: 'unresolved', node_id: null, note: '' }
]
check('a scene-level node declaration traverses that shape for every line in the scene', () => {
  const walk = walkFromStoredPod(storedRows, storedSteps, graph, { id: 'p', slug: 'p' })
  const cov = computeCoverage(graph, walk)
  assert.equal(cov.totals.steps, 3)
  assert.equal(cov.nodes.find(n => n.id === 'N16').traversals, 1, 'a scene declaring N16 traverses it once, not once per line')
  assert.equal(cov.totals.traversed, 1)
})
check('a scene whose declaration resolves to nothing is honestly unmapped, never guessed', () => {
  const walk = walkFromStoredPod(storedRows, storedSteps, graph, { id: 'p', slug: 'p' })
  const cov = computeCoverage(graph, walk)
  assert.equal(cov.totals.unmapped, 1, 'the undeclared scene\'s line is counted, not hidden')
  assert.equal(walk.unresolved.length, 1, 'and its declaration stays on the unresolved list')
})

console.log(`\n${pass} checks passed${process.exitCode ? ' — WITH FAILURES' : ''}\n`)
