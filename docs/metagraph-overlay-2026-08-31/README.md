# The metagraph, with the pods as overlays through it

**Live now at [popty.app/canonical/metagraph](https://popty.app/canonical/metagraph)** — verified in the
deployed bundle at 01:12 UTC on 2026-08-31. Read-only. No course to load, no new API, no new table.

---

## What it is

The Script Lab shows a **script** and reports coverage as a number and a list. This shows the
**graph** — all 23 shapes at once, laid out from the store's own composition edges — and lays a
pod's walk over it. The deficit stops being a paragraph in a report and becomes a picture: the
shapes a pod never reaches are the red ones.

**Tap is the only affordance.** Tap a pod to switch the overlay. Tap a shape to open it. Tap it
again to close it. No drag, no zoom, no pan, no long-press, one overlay at a time.

## What you see

**The graph on its own.** 17 exchange shapes plus the 6 bound pairs, banded by containment:
containers on top, what they contain below, and — banded separately, because the store says so —
the five Method Pod shapes that carry no composition edge at all.

[Screenshot 1 — the graph with no overlay](https://watson-1.tail4968cb.ts.net/evidence/metagraph-2026-08-31/1-graph-only.png)

**POD 1 laid over it.** 231 lines, 22 scenes, **18 of 23 shapes traversed, 5 never reached**, and
the five are exactly N13–N17: the reflective shapes. The transactional pod cannot reach them, and
now it says so in green and red rather than in a table.

[Screenshot 2 — POD 1 as an overlay](https://watson-1.tail4968cb.ts.net/evidence/metagraph-2026-08-31/2-pod1-overlay.png)

**Tap a shape and the pod's own lines are under it.** N2 Transaction: its positions, what contains
it, what it contains, the survivability pressure sitting on it, and then the 27 real lines of POD 1
in 7 scenes that walk it — Barista, Sarah, the coffee order, with their g-numbers. Its composition
edges light up; the rest dim.

[Screenshot 3 — N2 Transaction opened, with POD 1's 27 lines](https://watson-1.tail4968cb.ts.net/evidence/metagraph-2026-08-31/3-pod1-node-N2.png)

**Switch the overlay and the picture inverts.** The Method Pod's 43-scene cut: 276 lines, **9 of 23
traversed, 14 never reached** — and what it never reaches is the whole transactional lattice. The
two pods are complements, and that is now something you see in one glance rather than something
you work out from two tables.

[Screenshot 4 — the Method Pod overlay, the mirror image](https://watson-1.tail4968cb.ts.net/evidence/metagraph-2026-08-31/4-methodpod-overlay.png)

## What it is built on — nothing new

| Piece | Where it comes from |
|---|---|
| The graph | `services/shared/metagraph/` — the store landed 2026-08-30, read unchanged |
| The layout | `src/lib/metagraph/layout.js` — new, pure, deterministic; levels derived from the composition edges alone |
| The walks | the same `walkFromCanonicalRows` / `walkFromStoredPod` the Script Lab uses |
| The coverage | the same `computeCoverage` module — no second opinion about what a shape's traversal is |
| The pod lines | `GET /api/admin/canonical-pods[/:slug]` — already live, unchanged |

Same store in, same picture out: the layout has no randomness and no saved positions, which is what
makes a screenshot of it evidence rather than decoration. Five tests cover that.

## The metagraph is NOT a gap

The brief allowed for the metagraph not being readable by the dashboard. It is. The store is five
JSON files plus a reader, the front end already imports them, and the pod walks are in the live
database — `canonical_pod_walk_steps`, 224 steps across three pods, joined to
`canonical_pod_scenarios` on scene number. Nothing had to be faked and nothing was.

## What it honestly does not do

- **It does not edit anything.** Read-only, by choice. Editing lives in the Script Lab.
- **125 of POD 1's 231 lines read as UNMAPPED**, and the page says so. That is the store's own named
  gap — 16 of 47 complete walks encoded, 56 rows counted but not yet placed — not a defect in this
  page. Encoding the remaining walks is work on the store.
- **`pod-1` and `pod-0.5` show zero coverage** on purpose: they are separate slates whose row
  numbers collide with the graph's by accident, and mapping them would invent coverage.
- **Survivability edges are not drawn as lines.** They do not join two shapes — they name a pressure
  and the shape it is attemptable on — so they appear on the shape when you open it, not as an edge.
- **The screenshots were taken through a local harness**, not through the deployed page: Popty gates
  every route behind an OTP sign-in and a headless browser cannot pass it. The harness mounts the
  same component with the same store and the same rows read live from Supabase — the numbers in the
  shots are the real numbers — but the app shell and navbar are absent from the frames. The
  deployed route itself was verified by fetching the built chunk from popty.app.

## One number worth a look

The Method Pod's 43-scene cut reports **8 of 9 outcome shapes delivered**; POD 1 reports **0 of 9**,
with the site present for all nine. That is the DB's own declarations talking, and it is the
overlay's to-do list standing where you can see it.
