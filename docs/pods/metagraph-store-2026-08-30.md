# The shape metagraph now has a home a program can read

**Date:** 2026-08-30. **Where:** `services/shared/metagraph/`. **Reader:** `services/shared/metagraph/index.cjs`.
**Verified:** `node tools/metagraph-selfcheck.cjs` — 345 checks, 0 failures.

---

## What changed

Until today the shape graph existed only as prose, in `docs/pods/shape-graph-2026-08-30.md`.
Nothing could load it. That is exactly why PODLAB makes you load a course before it will show you
anything: a course was the only structure the tooling could reach.

It is now a stored artefact — five JSON files and one module that reads them. Nothing executes it,
nothing renders it to a learner, no course content was touched. It is a data file plus a reader,
and it is the precondition for the coverage read-out.

**The store reproduces every count the derivation document states.** 17 nodes, 20 moves, 19
composition edges, 10 corpus survivability edges and 5 Method-Pod-only, 9 outcome shapes with 4
minted / 3 Method-only / 2 thin, and the 231 rows reconciling as 16 codas + 73 drill + 138 on-walk
+ 4 alternatives. Nothing was adjusted to fit.

---

## What is in it

| File | What it holds |
|---|---|
| `nodes.json` | The **17 exchange shapes**, each a bound sequence of positions. Twelve from `pod-0`, five from the Method Pod, kept in one list with a `provenance` field rather than split. Plus **6 bound pairs** — the sub-shapes §3 names as contained (option-choice, reckoning-and-pay, read-back, continuer, elicit, onward-solicit) which are not exchange-shape nodes but are legitimate edge endpoints. |
| `moves.json` | The **20 moves** — a move is a position in a shape, filled by a family, and the twenty are the twenty corpus families of the 2026-08-29 inventory: **F1–F19 and F21**. There is no F20. Each carries its name, its test, its dialogic attestation count, its rows and what it presupposes. |
| `edges.json` | **Two edge kinds and only two.** 19 composition edges (mechanical, contained → container, including the declared reflexive `N5 → N5`). 15 survivability edges, split structurally by provenance: `survivability.corpus` (10) and `survivability.method_pod` (5), so the five with no `g<n>` support cannot be mistaken for the ten with it. |
| `outcome-shapes.json` | The **9 outcome shapes** of the overlay, each with its recovery, its `attestation_class` (`minted` / `method-pod-only` / `thin`), where it is sited and why, plus the redemption-latency sequence and what the selector cut as free. |
| `walks/pod-0.json` | The walk set. 16 complete walks stored as node references, 69 truncated walks, 16 codas, 4 alternatives, and the accounting that reconciles to 231. |

---

## The format, and the one thing it must be able to say

**A walk is a sequence of node references.** A step *is* a reference to a node and a position; the
surface sentence hangs off it as `surface`, a property, never the step itself. Coverage is
computable without reading a word of prose.

```json
{ "step": 3, "node": "N3", "position": 1, "row": "g14",
  "speaker": "Sarah", "surface": "Do you have crisps, or nuts, or anything?",
  "variance": "surface",
  "surface_variants": [ { "row": "g12", "surface": "Do you have any food?" },
                        { "row": "g13", "surface": "Do you have any snacks?" } ] }
```

**And it can express a branch**, which is the acceptance test the derivation document sets. `g15`
and `g16` are mutually exclusive answers to one availability ticket, stored in the corpus as
consecutive sentences because `variant_key` is null on all 231 rows and the storage format has no
way to say *branch*. Here it does:

```json
{ "step": 4, "node": "N3", "position": 2, "branch": true, "variance": "outcome",
  "branches": [
    { "key": "no",  "polarity": "negative", "move": "F6",  "row": "g15",
      "surface": "No, we've only got drinks.", "continues": false },
    { "key": "yes", "polarity": "positive", "move": "F21", "row": "g16",
      "surface": "Yes, would you like the menu?", "continues": true, "pivot_to_position": 1 } ] }
```

Surface variance and outcome variance are **different fields**, not two readings of one field:
`surface_variants` is several phrasings of one ticket, `branches` is several outcomes. The document
finds surface variance present and done well, and outcome variance present exactly once. The store
says the same thing without anyone having to read it.

**Chaining is not a third edge kind.** "And you?" (F11), "anything else?" (F21) and the
counter-question (F3) all transfer the initiating role rather than nest anything. That is a
property of the walk, so it is recorded as `pivot_capable` on a node position and
`pivot_to_position` on a walk step — never as an edge. `N5 → N5` is a plain reflexive composition
edge, declared as such, and delivery order drops self-loops before the sort.

---

## How to read it

```js
const mg = require('./services/shared/metagraph/index.cjs');

mg.load();                // the whole store, indexed by id
mg.get('N3');             // any node, bound pair, move, edge or outcome shape
mg.coverage('pod-0');     // { traversed, revisited, never, visitCounts }
mg.branches('pod-0');     // the branch points
mg.stepRefs(walk);        // node references only, no prose
mg.deliveryOrder();       // derived from the survivability edges, never authored
```

`mg.coverage('pod-0')` today returns all twelve `pod-0` nodes traversed and none never-reached,
because the sixteen stored walks were chosen to cover the graph. Point it at a **new** pod script
and the `never` list is the deficit read-out.

---

## What the coverage read-out can rely on staying stable

- **Ids.** `N1`–`N17`, `P1`–`P6`, `F1`–`F19`+`F21`, `C1`–`C19`, `S1`–`S10`, `M1`–`M5`, `O1`–`O9`,
  `W1`–`W16`. The node, move, survivability-edge and outcome ids are the derivation document's own,
  verbatim; composition-edge, bound-pair and walk ids are minted in the same register.
- **The step shape.** `{ step, node, position }` is the load-bearing part of a walk step and will
  not move. Everything else on a step is annotation.
- **`branches` vs `surface_variants`.** Distinct fields, permanently.
- **Provenance.** `provenance` on nodes and moves; `survivability.corpus` vs
  `survivability.method_pod` as separate arrays; `attestation_class` on outcome shapes. A store
  that flattened these into equally-confident rows would destroy the finding, so they are structural.
- **Language-agnosticism.** No member of this store will ever carry a `lang_pair` or a target
  language. The self-check asserts it.

---

## What is honestly not in it

- **31 of the 47 complete walks.** The document states 47 and enumerates none of them; the 16 stored
  here are the ones it names by attestation run in §2, §3, §4 and §6. They cover 12 of the 12
  `pod-0` nodes, 18 of the 19 composition edges (all but `C5`, the option-choice pair inside the
  café order at `g39`–`g43`) and 10 of the 10 corpus survivability edges. The unplaced rows are
  counted in `accounting.rows_on_complete_walks_not_yet_placed` (**56**) rather than smoothed away.
- **No UI.** PODLAB is untouched. It has no metagraph data source to point at the reader — it reads
  course-scoped `/api/*` endpoints — so wiring it would mean a new route plus new component state,
  which is not a one-line change and was left.
- **No Method Pod walks.** N13–N17 and M1–M5 are stored as nodes and edges with their `M:part:line`
  citations, but the summit corpus has no walk set here. Those citations were taken from the two
  published Method Pod documents, not from the session transcripts.
- **`deliveryOrder()` is survivability *pressure*, not a topological sort.** The corpus edges name
  their B side in prose, so a true sort is not derivable from the store as it stands. The function
  says so in its return value rather than pretending otherwise.

---

## The corpus slug, once more

The live POD 1 is stored under **`pod_slug = 'pod-0'`** — 231 rows, 22 scenes. The slugs `pod-1`
(236 rows) and `pod-0.5` (27 rows) are sacked slates and were positively excluded. Every `g<n>` in
the store is a `global_order` in `pod-0`. The walk set says so in its own `corpus` block so that
nothing reading it has to remember.

Surface text in `walks/pod-0.json` was populated once from `canonical_pod_scenarios` by a single
**read-only** SELECT on 2026-08-30. No writes of any kind were issued. That read also confirmed the
document's own figures independently: 231 rows, 22 scenes, `variant_key` null on every row.
