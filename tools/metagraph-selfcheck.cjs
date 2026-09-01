#!/usr/bin/env node
/**
 * Self-check for the shape metagraph store.
 *
 * This is NOT a test suite and must not become one. The store is a data artefact that nothing
 * executes; the right amount of verification is a single-process script that asserts the artefact
 * is well-formed and reproduces the derivation document's own counts.
 *
 *   node tools/metagraph-selfcheck.cjs
 *
 * If a count here disagrees with docs/pods/shape-graph-2026-08-30.md, the DOCUMENT wins: it was
 * audited against all 231 corpus rows and it takes its own numbers seriously. Fix the store.
 */
'use strict';

const path = require('path');
const mg = require(path.join(__dirname, '..', 'services', 'shared', 'metagraph', 'index.cjs'));

const DOC = 'docs/pods/shape-graph-2026-08-30.md';
let pass = 0;
const failures = [];

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ok   ${label} = ${JSON.stringify(actual)}`); }
  else { failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
         console.log(`  FAIL ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
}
function ok(label, cond, detail) {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { failures.push(`${label}${detail ? ': ' + detail : ''}`); console.log(`  FAIL ${label}${detail ? ': ' + detail : ''}`); }
}

const g = mg.load({ fresh: true });

console.log(`\nThe counts the derivation document asserts (${DOC}),`);
console.log('extended by the 2026-08-31 ratifications (docs/pods/core-walks-ratification-2026-08-31.md,\n  docs/pods/medium-negotiation-ratification-2026-08-31.md)');
check('nodes', g.nodes.length, 30);
check('nodes from pod-1', g.nodes.filter(n => n.provenance === 'pod-1').length, 12);
check('nodes from the Method Pod', g.nodes.filter(n => n.provenance === 'method-pod').length, 10);
check('nodes from Talk Bollocks', g.nodes.filter(n => n.provenance === 'talk-bollocks').length, 6);
check('nodes from trades (N501, Tom\'s ruling)', g.nodes.filter(n => n.provenance === 'trades').map(n => n.id), ['N501']);
check('nodes from the medium negotiation (N1201, Tom\'s CORE ruling)', g.nodes.filter(n => n.provenance === 'medium-negotiation-canonical').map(n => n.id), ['N1201']);
check('moves', g.moves.length, 27);
check('moves from care work (F601, Tom\'s ruling)', g.moves.filter(m => m.provenance === 'care-work').map(m => m.id), ['F601']);
check('composition edges', g.composition.length, 24);
check('survivability edges, corpus-attested', g.survivabilityByProvenance.corpus.length, 10);
check('survivability edges, Method Pod only', g.survivabilityByProvenance.method_pod.length, 5);
check('survivability edges, Talk Bollocks (the ratified recoveries)', (g.survivabilityByProvenance.talk_bollocks || []).length, 5);
check('survivability edges, the medium negotiation', (g.survivabilityByProvenance.medium_negotiation || []).length, 2);
check('every survivability bucket is loaded, none silently dropped', g.survivability.length,
      Object.values(g.survivabilityByProvenance).reduce((n, b) => n + b.length, 0));
check('outcome shapes', g.outcomeShapes.length, 9);
// The CORE set: 12 pod-1 nodes + 6 bound pairs = the audit's 18, plus N1201, which Tom ruled CORE
// and sited as a prologue. A prologue PREPENDS, so nothing is reordered and the set grows 18 -> 19.
check('CORE shapes (12 pod-1 nodes + 6 bound pairs + the medium contract)',
      g.nodes.filter(n => n.provenance === 'pod-1').length + g.boundPairs.length
        + g.nodes.filter(n => n.core_siting).length, 19);
check('outcome shapes minted from nothing', g.outcomeShapes.filter(o => o.attestation_class === 'minted').length, 4);
check('outcome shapes attested in the Method Pod only', g.outcomeShapes.filter(o => o.attestation_class === 'method-pod-only').length, 3);
check('outcome shapes attested thinly in pod-1', g.outcomeShapes.filter(o => o.attestation_class === 'thin').length, 2);

console.log('\nThe null result — no survivability edge rests on anything failing');
const classes = g.survivabilityByProvenance.corpus.map(e => e.answer_slot_class);
check('non-delivery / chaining / relational only', [...new Set(classes)].sort(), ['chaining', 'non-delivery', 'relational']);
check('edges resting on a failure', classes.filter(c => c === 'failure').length, 0);
check('edges with no attested recovery at all', g.survivabilityByProvenance.corpus.filter(e => e.recovery_attested === 'never').map(e => e.id), ['S2']);

console.log('\nEdge endpoints resolve');
const shapeIds = new Set(mg.shapes().map(s => s.id));
const moveIds = new Set(g.moves.map(m => m.id));
for (const e of g.composition) {
  ok(`${e.id} endpoints resolve`, shapeIds.has(e.contained) && shapeIds.has(e.container), `${e.contained} → ${e.container}`);
}
for (const e of g.survivability) {
  ok(`${e.id} names resolvable nodes`, (e.nodes || []).every(n => shapeIds.has(n)), JSON.stringify(e.nodes));
}
ok('the reflexive composition edge is present and declared', g.composition.some(e => e.contained === e.container && e.reflexive === true));
check('edge kinds, and there are only two', g.meta.edges.edge_kinds, ['composition', 'survivability']);

console.log('\nEvery position families reference a real move');
for (const s of mg.shapes()) {
  for (const p of s.positions) {
    if (p.family) ok(`${s.id}.p${p.index} family ${p.family}`, moveIds.has(p.family));
    for (const a of p.alternatives || []) if (a.family) ok(`${s.id}.p${p.index} alt ${a.key} family ${a.family}`, moveIds.has(a.family));
  }
}

console.log('\nWalks — every step resolves, and a branch is expressible');
for (const name of mg.walkSets()) {
  const ws = mg.walkSet(name);
  for (const w of ws.walks) {
    const refs = mg.stepRefs(w);
    ok(`${name}/${w.id} every step resolves to a node`, refs.every(r => shapeIds.has(r.node)),
       refs.filter(r => !shapeIds.has(r.node)).map(r => r.node).join(','));
    for (const s of w.steps) {
      const shape = g.byId.get(s.node);
      ok(`${name}/${w.id} step ${s.step} position ${s.node}.p${s.position} exists`,
         shape && shape.positions.some(p => p.index === s.position));
      if (s.move) ok(`${name}/${w.id} step ${s.step} move ${s.move} exists`, moveIds.has(s.move));
      if (s.composed_in) {
        const c = g.byId.get(s.composed_in.node);
        ok(`${name}/${w.id} step ${s.step} composed_in ${s.composed_in.node}.p${s.composed_in.position} exists`,
           c && c.positions.some(p => p.index === s.composed_in.position));
      }
    }
    if (w.outcome_shape) ok(`${name}/${w.id} outcome shape ${w.outcome_shape} exists`, g.byId.get(w.outcome_shape) != null);
    for (const id of w.composition_edges_used || []) ok(`${name}/${w.id} cites edge ${id}`, g.byId.get(id) != null);
    for (const id of w.survivability_edges_touched || []) ok(`${name}/${w.id} cites edge ${id}`, g.byId.get(id) != null);
  }
}

const bs = mg.branches('pod-1');
check('branch points stored in pod-1', bs.length, 1);
ok('the branch is g15 vs g16 — the acceptance test',
   bs[0] && bs[0].branches.map(b => b.row).sort().join(',') === 'g15,g16',
   bs[0] ? bs[0].branches.map(b => b.row).join(',') : 'no branch');
ok('the two branches are mutually exclusive outcomes, not surface variants',
   bs[0] && bs[0].variance === 'outcome' && bs[0].branches.filter(b => b.continues).length === 1);

console.log('\nThe 231 rows reconcile');
const a = mg.walkSet('pod-1').accounting;
check('codas', a.codas, 16);
check('drill rows, scenes 15-21', a.drill_rows_scenes_15_21, 73);
check('rows on complete walks', a.rows_on_complete_walks, 138);
check('alternatives at a node', a.alternatives_at_a_node, 4);
check('total', a.codas + a.drill_rows_scenes_15_21 + a.rows_on_complete_walks + a.alternatives_at_a_node, 231);
check('truncated walks stored + the four promoted to W15', a.truncated_walks_stored + a.drill_rows_promoted_to_a_complete_walk.count, 73);
ok('the unencoded complete walks are declared as a gap, not silently dropped',
   typeof a.gap === 'string' && a.rows_on_complete_walks_not_yet_placed > 0);

console.log('\nCoverage is computable without parsing any prose');
const cov = mg.coverage('pod-1');
check('pod-1 nodes never reached by the stored walks', cov.never, []);
ok('coverage returns traversed / revisited / never', ['traversed', 'revisited', 'never'].every(k => Array.isArray(cov[k])));

console.log('\nLanguage-agnostic');
const blob = JSON.stringify([g.meta.nodes, g.meta.moves, g.meta.edges, g.meta.outcomes, mg.walkSet('pod-1')]);
ok('no lang_pair anywhere in the store', !/lang_pair|target_lang|language_pair/.test(blob));

console.log('\nSchema');
let Ajv = null;
try { Ajv = require('ajv'); } catch (_) { /* not installed in this checkout */ }
if (!Ajv) {
  console.log('  SKIP schema validation — ajv is not resolvable from this checkout. Run from the repo root.');
} else {
  const schema = require(path.join(__dirname, '..', 'schemas', 'metagraph-v1-schema.json'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  for (const [label, doc] of [['nodes.json', g.meta.nodes], ['moves.json', g.meta.moves],
                              ['edges.json', g.meta.edges], ['outcome-shapes.json', g.meta.outcomes],
                              ['walks/pod-1.json', mg.walkSet('pod-1')]]) {
    ok(`${label} validates`, validate(doc), ajv.errorsText(validate.errors, { separator: '; ' }));
  }
}

console.log(`\n${pass} checks passed, ${failures.length} failed.`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach(f => console.log('  - ' + f));
  console.log(`\nIf a count above disagrees with ${DOC}, the document is right and the store is wrong.`);
  process.exit(1);
}
console.log(`The store reproduces every count in ${DOC}.`);
