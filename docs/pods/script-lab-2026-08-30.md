# The Script Lab — the canonical pod scripts, course-free, with coverage as the headline

**Date:** 2026-08-30. This one executes: it is running UI in the Popty dashboard at
**`/canonical/scripts`**, not a report. Read-only against `canonical_pod_scenarios` except for
the line edit that was already there.

**The ruling being built** (Tom, 2026-08-30): *"at the moment PODLAB doesn't really do what I want
— it makes me load a course / whereas I want a single place I can edit the canonical scripts for
the pods … then I can see — with clear graph mappings, how this script is actually doing all the
shapes it should as a walk through the graph."*

---

## One page — what is now possible

- **A canonical pod script can be reached and edited without a course.** `/canonical/scripts` is an
  index of every script in `canonical_pod_scenarios` plus the Method Pod; `/canonical/scripts/:slug`
  is one script, whole, scene by scene, editable in place. No course code appears anywhere on the
  path. The old course-nested route (`/production/:courseCode/pods/canonical/:slug`) still works —
  this is an extra door.
- **Coverage is the headline, and the deficit list is live.** For the selected script the page says
  which shapes the walk traverses, which it hits twice or more, and — first, in red, above the
  script — which it never reaches.
- **It is the same instrument for the other walks.** The Method Pod loads through the same coverage
  module. A health flow loads as data through `walkFromFlow`, not as a special case (§5).

## The numbers, measured

`node tools/metagraph/measure-coverage.js pod-0 pod-1` — read-only, reproducible.

The graph has **23 shapes**: the 17 exchange nodes plus the 6 bound pairs.

| Walk | lines | mapped | shapes traversed | hit twice+ | **never reached** | outcome shapes delivered |
|---|---|---|---|---|---|---|
| **`pod-0` — the live POD 1** | 231 in 22 scenes | 87 | **18 of 23** | 9 | **5** | **0 of 9** |
| **The Method Pod** (re-cut, 16 scenes) | 99 in 17 scenes | 45 | **6 of 23** | 1 | **17** | **0 of 9** |
| `pod-1` (a separate slate) | 236 | 0 | 0 | 0 | 23 | 0 of 9 |

**POD 1's deficit list, live:** N13 Not-knowing · N14 Premise audit · N15 Parked disagreement ·
N16 Precision haggle · N17 Interruption-and-bank. Those are exactly the five nodes the derivation
took from the Method Pod, so the read-out reproduces the derivation's own finding without being
told it: **the transactional pod cannot reach the reflective shapes.**

**The Method Pod's deficit list is the mirror image** — it reaches none of the twelve transactional
shapes. The two pods are complements, and the page now says so in a number.

**Both deliver zero of the nine outcome shapes.** An outcome counts as delivered only when a line
declares it; the ask an outcome is *sited on* being present is not delivery. `pod-0` contains the
café order O3 is sited on and the reckoning O1 is sited on, and delivers neither. That is the
overlay's whole to-do list, standing where Tom can see it.

**Survivability:** 10 of the 15 edges are exercised by `pod-0`, and one of them — **S2, acting on a
hedge** — carries the derivation's null result into the UI: the branch is attested, the recovery
never is. It is flagged ⚠ in the read-out.

## The data model — settled, and why

**A walk is a sequence of node references.** Text hangs off the reference; the reference never
hangs off the text (Watson's ruling, 2026-08-30). A step is `{ ref, nodeId, kind, outcomeId,
payload }` where `payload` — speaker, English, the DB id — is the disposable surface. That is what
keeps "select the shapes this pod should teach and let the walk be generated" possible later
without building it now. Nothing shape-selection-driven is built.

**Shared storage, not a shared page.** `src/lib/metagraph/` is pure — no Vue, no network, no fs —
so the Seed/Basket Lab imports the same loader and the same coverage module to ask the admissions
question over the same object. Neither lab keeps its own copy of the graph.

## What the graph could not say — stated, not smoothed

**87 of `pod-0`'s 231 lines map to a shape; 125 are UNMAPPED and shown as UNMAPPED.** This is not a
defect in the content and not a defect in this page — it is the store's own named gap, surfaced, and
the page prints the store's own accounting to say so. The store encodes **16 of the 47 complete
walks** the derivation counts; **56 rows that lie on complete walks are counted but not yet placed
on one**, and the 69 truncated drill rows of scenes 15–21 carry no node. Both read as UNMAPPED
rather than being guessed at or quietly excluded. **Encoding the remaining 31 walks is what would
move this number**, and it is work on the store, not on this page.

## The fork, and the phrasings

The store keeps two things apart that a linear format cannot, and the read-out keeps them apart too.

- **`g15`/`g16` is a real branch** — mutually exclusive answers to one availability ticket, stored as
  consecutive sentences because `variant_key` is null on all 231 rows. Both arms walk N3, and a
  script traverses N3 by taking **either** one; requiring both would make the corpus's only genuine
  fork permanently untraversable. Each arm is tagged in the script — *fork · no arm · no uptake*,
  *fork · yes arm* — and neither is ever demoted to a phrasing.
- **`g7`, `g12`, `g13` are surface variance** — other ways of saying a row that is on the walk. They
  are tagged *another way of saying g14* and they traverse **nothing**. A phrasing is not a fork, and
  the read-out will not let one be counted as coverage.

`pod-1` and `pod-0.5` are separate slates whose `global_order` numbers collide with `pod-0`'s by
accident. Walking them through this graph would invent coverage out of an off-by-one, so they walk
in their own reference space and come back wholly unmapped, which is the true answer.

**The Method Pod's scenes map by declared alias, not by reference.** The re-cut carries no
`M:part:line` per turn; what each scene carries is its shape, in its own heading. The alias table
is declared in the open in `src/lib/metagraph/parseMethodPod.js` and should eventually be owned by
the stored graph artefact rather than by a view's loader.

**There is no safety weight in the graph.** Aran's ⚠ strand — "partial understanding there is
dangerous" — has no field in the derivation, and none was invented. What the read-out surfaces
instead is the nearest honest proxy the graph does carry: whether the recovery was ever attested.

## The health-flow contract — what an Aran flow has to look like to load

Aran's nurse (11 contexts) and doctor (10 contexts) sequences are **not in this repo** — searched
and not found; they exist wherever he is building them. No bespoke importer was built. The
graph-mapping layer takes a walk as **data**, so a flow becomes an input:

```json
{
  "id": "health-nurse-v3",
  "title": "Nurse sequence",
  "refSpace": "flow",
  "scenes": [
    { "number": 1, "title": "Taking a history", "subtitle": "happy path",
      "lines": [
        { "speaker": "Nurse", "text": "…", "nodeId": "N12", "outcomeId": null },
        { "speaker": "Patient", "text": "…", "nodeId": "N12", "outcomeId": "O7" }
      ] }
  ]
}
```

`nodeId` is a shape from the graph; `outcomeId` is one of the nine. A line with neither is UNMAPPED
and is shown as such — never guessed. Pass it to `walkFromFlow(flow, graph)` and the same coverage
read-out applies. **That is the whole contract**, and it is what makes the instrument the same one
for POD-1, the Method Pod and the health flows.

## Where the code is

- `services/shared/metagraph/` — **the store**. Not ours; consumed as it is, never copied.
- `src/lib/metagraph/loadGraph.js` — the ONE place that knows where the graph comes from.
- `src/lib/metagraph/fromStore.js` — the store projected into the shape the read-out uses.
- `src/lib/metagraph/walk.js`, `coverage.js` — the data model and the arithmetic, pure.
- `src/views/ScriptLabView.vue`, `ScriptLabScriptView.vue` — the index and the script page.
- `services/production-api.cjs` — `GET /api/admin/canonical-pods` (the index; no course code).
- `tools/metagraph/coverage-test.js` — 15 checks, single process, no framework.
- `tools/metagraph/measure-coverage.js` — the numbers above, from the command line.

## The store, and the switch that was actually made

This page was built behind one thin adapter while the metagraph store was still being written. The
store landed mid-build (`services/shared/metagraph/`, commit 547bd253d) and the adapter was pointed
at it: `loadGraph.js` now imports the store's five JSON files and the markdown parser is deleted.
**No consumer moved** — that was the point of the adapter. The store gave the read-out something
the derivation could not: a **per-row** node identity from the encoded walks, which is why mapped
coverage is 85 rather than the 73 the prose endpoints could support, and why the six bound pairs
are covered at all.

`tools/metagraph/coverage-test.js` — 15 checks, one process, no framework — asserts the read against
the derivation's own headline numbers (17 nodes + 6 bound pairs, 19 composition edges, 10 + 5
survivability edges, nine outcome shapes with the same four minted, 16 codas, 4 alternatives), so a
silent drift in the store or in the reading fails the check rather than shipping a wrong deficit
list. The store carries its own `tools/metagraph-selfcheck.cjs` as well.
