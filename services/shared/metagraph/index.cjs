/**
 * The shape metagraph — the one canonical reader.
 *
 * There is ONE store, at services/shared/metagraph/, and this is the only module that reads it.
 * Both labs consume it through here: the pod side reads shapes and walks, the seed/basket side
 * reads admissions. Neither gets its own copy — a second copy is a drift problem within a
 * fortnight, which is why the store and its reader live together.
 *
 * The graph is derived in docs/pods/shape-graph-2026-08-30.md, which is the specification.
 * This module transcribes nothing and derives nothing; it loads and indexes.
 *
 * The graph is LANGUAGE-AGNOSTIC. English is the notation it is written in, not its content:
 * nothing in the store carries a lang_pair or a target language.
 *
 * Object model (document §1):
 *   node  — an exchange shape: a bound sequence of positions
 *   move  — a position in a shape, filled by a family
 *   walk  — a traversal of the graph. Pods are listening walks, courses are producing walks.
 *   composition edge     — A composes B when B occurs as a move-position inside A. Mechanical.
 *   survivability edge   — B presupposes A when a learner who does not own A cannot RECOVER
 *                          when B goes off the expected path. Not cannot produce. Cannot recover.
 * Two edge kinds and only two. Chaining is a walk property (a pivot_capable position), never an edge.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const WALK_DIR = path.join(DIR, 'walks');

let cache = null;

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/** Load the whole store, indexed. Cached; pass {fresh:true} to re-read from disk. */
function load(opts = {}) {
  if (cache && !opts.fresh) return cache;

  const nodesFile = readJson(path.join(DIR, 'nodes.json'));
  const movesFile = readJson(path.join(DIR, 'moves.json'));
  const edgesFile = readJson(path.join(DIR, 'edges.json'));
  const outcomesFile = readJson(path.join(DIR, 'outcome-shapes.json'));

  const walkSets = {};
  for (const f of fs.readdirSync(WALK_DIR).filter(f => f.endsWith('.json'))) {
    const w = readJson(path.join(WALK_DIR, f));
    walkSets[w.walk_set] = w;
  }

  // Every provenance bucket, not a hard-coded three: a ratification that adds a bucket must not
  // be able to add edges the reader silently drops. Order is the file's own key order.
  const survivability = Object.values(edgesFile.survivability).flat();

  const graph = {
    nodes: nodesFile.nodes,
    boundPairs: nodesFile.bound_pairs,
    moves: movesFile.moves,
    composition: edgesFile.composition,
    survivability,
    survivabilityByProvenance: edgesFile.survivability,
    outcomeShapes: outcomesFile.outcome_shapes,
    outcomeSequence: outcomesFile.sequence,
    walkSets,
    meta: {
      nodes: nodesFile, moves: movesFile, edges: edgesFile, outcomes: outcomesFile,
    },
  };

  graph.byId = new Map();
  for (const n of graph.nodes) graph.byId.set(n.id, n);
  for (const p of graph.boundPairs) graph.byId.set(p.id, p);
  for (const m of graph.moves) graph.byId.set(m.id, m);
  for (const e of graph.composition) graph.byId.set(e.id, e);
  for (const e of graph.survivability) graph.byId.set(e.id, e);
  for (const o of graph.outcomeShapes) graph.byId.set(o.id, o);

  cache = graph;
  return graph;
}

/** A node, bound pair, move, edge or outcome shape by its id. */
function get(id) { return load().byId.get(id) || null; }

/** All shapes an edge endpoint may name: nodes plus the bound pairs §3 treats as contained shapes. */
function shapes() { const g = load(); return [...g.nodes, ...g.boundPairs]; }

function walkSet(name) {
  const w = load().walkSets[name];
  if (!w) throw new Error(`no walk set "${name}" — have: ${Object.keys(load().walkSets).join(', ')}`);
  return w;
}

/**
 * Every node reference a walk makes, in order, one entry per traversal.
 * Branches contribute one entry per branch — a branch is a fork in the walk, not a step in it.
 * No prose is parsed: this reads node/position references only.
 */
function stepRefs(walk) {
  const out = [];
  for (const s of walk.steps) {
    if (s.branch) {
      for (const b of s.branches) out.push({ node: s.node, position: s.position, branch: b.key, row: b.row });
    } else {
      out.push({ node: s.node, position: s.position, row: s.row });
    }
  }
  return out;
}

/**
 * Coverage of the graph by a walk set: which shapes it traverses, which it hits more than once,
 * which it never reaches. This is the read-out the next job builds on; the contract is that it
 * needs no prose.
 */
function coverage(walkSetName, opts = {}) {
  const g = load();
  const ws = typeof walkSetName === 'string' ? walkSet(walkSetName) : walkSetName;
  const counts = new Map();

  for (const w of ws.walks) {
    for (const r of stepRefs(w)) counts.set(r.node, (counts.get(r.node) || 0) + 1);
  }

  const universe = (opts.includeMethodPod ? g.nodes : g.nodes.filter(n => n.provenance === 'pod-0'))
    .map(n => n.id);

  return {
    walkSet: ws.walk_set,
    traversed: universe.filter(id => counts.has(id)),
    revisited: universe.filter(id => (counts.get(id) || 0) > 1),
    never: universe.filter(id => !counts.has(id)),
    visitCounts: Object.fromEntries([...counts].sort()),
  };
}

/** The branch points a walk set contains — the thing a linear format cannot say. */
function branches(walkSetName) {
  const ws = typeof walkSetName === 'string' ? walkSet(walkSetName) : walkSetName;
  const out = [];
  for (const w of ws.walks) {
    for (const s of w.steps) {
      if (s.branch) out.push({ walk: w.id, step: s.step, node: s.node, position: s.position, variance: s.variance, note: s.note, branches: s.branches });
    }
  }
  return out;
}

/**
 * Delivery position, DERIVED from the survivability edges — never authored.
 * A topological order over the survivability graph. Composition self-loops play no part:
 * delivery order is computed on distinct nodes with reflexive edges dropped (§7).
 */
function deliveryOrder(opts = {}) {
  const g = load();
  const edges = g.survivability.filter(e => opts.includeMethodPod || e.provenance === 'pod-0');
  const universe = (opts.includeMethodPod ? g.nodes : g.nodes.filter(n => n.provenance === 'pod-0')).map(n => n.id);

  // B presupposes A: every node the edge names must be survivable before B is attemptable.
  // The corpus edges name their B side in prose, so the derivable relation is A-before-B only
  // where the edge names nodes on both sides. Edges that name one side contribute a constraint
  // on that node's readiness and are returned unresolved rather than guessed.
  const unresolved = edges.filter(e => !e.nodes || e.nodes.length === 0).map(e => e.id);
  const pressure = new Map(universe.map(id => [id, 0]));
  for (const e of edges) for (const id of e.nodes || []) {
    if (pressure.has(id)) pressure.set(id, pressure.get(id) + 1);
  }
  return {
    order: universe.slice().sort((a, b) => (pressure.get(b) - pressure.get(a)) || (a < b ? -1 : 1)),
    pressure: Object.fromEntries([...pressure].sort()),
    unresolved,
    caveat: 'Survivability pressure, not a topological sort: the corpus edges name their B side in prose. Ten edges over 142 dialogue rows is thin ground, and seven of the ten have a single attested recovery.',
  };
}

module.exports = {
  load, get, shapes, walkSet, walkSets: () => Object.keys(load().walkSets),
  stepRefs, coverage, branches, deliveryOrder,
};
