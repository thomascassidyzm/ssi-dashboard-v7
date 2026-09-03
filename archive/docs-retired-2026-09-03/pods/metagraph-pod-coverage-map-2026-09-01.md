# Every pod mapped onto the metagraph — what the Script Lab now reports, and what it is still waiting on

*2026-09-01. Read-out from `tools/metagraph/measure-coverage.js`, after the declarations below landed.*

## The one-sentence answer

**Health went from 0 of 36 shapes traversed — with all 36 red — to 19 of 36, which is exactly the
number its own mapping document predicted on 2026-08-30.** Hospitality and care-work went from
nothing to 24 and 11. Retail went from 6 to 11. Nothing was invented to get there: every
declaration is an id the mapping documents already wrote down, and eleven places where they did
not are listed at the bottom as unassigned rather than filled in.

**The bug was not in the reader.** `coverage.js` and `walkFromStoredPod` were already correct.
Health had **zero rows in `canonical_pod_walk_steps`**, so the measurement fell back to the
graph's own `g` reference space, every line came back UNMAPPED and every shape read never-reached.
The mapping work had been done and nothing machine-readable carried it. This job carried it.

---

## The read-out, per script

| Script | lines / scenes | shapes traversed | hit 2+ | never reached | outcomes delivered |
|---|---|---|---|---|---|
| **health** | 438 / 23 | **19 / 36** | 13 | 17 | 6 of 9 |
| **hospitality** | 330 / 21 | **24 / 36** | 9 | 12 | 3 of 9 |
| **care-work** | 306 / 20 | **11 / 36** | 1 | 25 | 1 of 9 |
| **retail** | 330 / 25 | **11 / 36** | 0 | 25 | 3 of 9 |
| **trades** | 414 / 23 | **18 / 36** | 8 | 18 | 2 of 9 |
| **method-pod-43-scene** | 276 / 43 | **21 / 36** | 7 | 15 | 8 of 9 |
| **method-pod-chapters** | 309 / 12 | **19 / 36** | 6 | 17 | **9 of 9** |
| **learning-flagship** | 367 / 11 | **14 / 36** | 8 | 22 | 4 of 9 |
| **pod-1** | 231 / 22 | **18 / 36** | 9 | 18 | 0 of 9 |
| **health-general-welsh** | 57 / 8 | **no declarations** | — | — | — |

`pod-1` is the graph's own reference space. It carries no stored walk and needs none: it is the
only script measured through the `g`-row path, it is the only one that exercises survivability
(**10 of 20 edges, 1 — S2 — with no attested recovery**), and nothing about it was changed.

`health-general-welsh` is a pair overlay, not a dialogue: 57 seeds with a drafted Welsh line. The
parser deliberately emits no walk steps for that format, because a seed set makes no claim about
the metagraph. **Its Welsh was not read and not touched.** See "One thing for the page", below.

`public-services` is in the registry as `mapping-only` — the Ireland mapping exists and no corpus
does. It is correctly not ingestable and nothing was written for it.

---

## What ratification would buy — the number that matters more than the coverage

Every declaration resolves against the ratified store, or it is stored honestly as UNRESOLVED. The
2026-08-31 pass left the sector proposals **proposed**, and nothing here promoted a single id.

| Script | declarations | resolve to the store | against unratified mints |
|---|---|---|---|
| health | 201 | 132 | **69** |
| hospitality | 90 | 61 | **29** |
| care-work | 70 | **24** | **46** |
| trades | 84 | 44 | **40** |
| retail | 40 | 17 | **23** |
| method-pod-43-scene | 77 | 75 | 2 |
| method-pod-chapters | 75 | 69 | 6 |
| learning-flagship | 72 | 69 | 3 |

**Care-work's 11 of 36 is not a thin corpus — it is a blocked one.** Two thirds of its
declarations point at health's Family A (`N102`–`N110`, `P101`, `F101`–`F104`), which sits in
`services/shared/metagraph/proposed/health-additions-2026-08-30.json` and is not in the store.
Ratifying health's ten mints would move care-work, hospitality, trades and retail all at once —
they are the same fourteen ids in every column. That is the single highest-yield decision on this
board, and it is yours, not a worker's.

The three pod-table walks needed no repair: `reresolve-walk-steps.cjs` dry-run reports **0 steps
change, 224 unchanged**, with 11 residual unresolved declarations that are prose labels ("THE
RECUT", "the deflating close") and the control arm's own `m6`/`m14`/`m15` numbering, exactly as
its header says.

---

## Where the declarations came from, per corpus

Declarations are per **scene**, in the `*Walks:*` preamble form the trades corpus already uses —
chosen over the heading-tag form so Aran can read and correct a line rather than a title.

- **health** — the mapping's §3 exchange table, all 23 contexts, in document order; plus the move
  and outcome ids §6.1 and §7.2 attest **against a named context**, with every negative verdict
  excluded (F11, F15, F18 blocked by role asymmetry; F19 overridden by §6.2; O2, O4, O9 recorded
  absent or variant-only). 19/36 is the mapping's own predicted read-out, arrived at independently.
- **hospitality** — the mapping's §4 encounter table (E1–E16), joined to the corpus by its own
  front matter, which states this dialogue was authored to cover that inventory. Contexts 1.0 and
  2.0 take `N1201` from the front matter's statement that they are the staff-seat instantiation of
  CORE scene 0.
- **care-work** — the mapping's §5 encounter table (E1–E17), joined by title. Three contexts match
  no encounter and declare nothing.
- **retail** — already declared in its heading tags, 22 of 25 scenes, and **those were not
  rewritten**. The three silent scenes were topped up only where the mapping is explicit: R0 the
  prologue (`N1201`, CORE scene 0), R23 the new starter (E14's row: `N4 + P3 + P4`), R24 the staff
  room (`N15`, named there by §Method-Pod reach).
- **trades** — already declares on all 23 scenes. Measured, unchanged.

## One code change, and why it was forced

The declaration id class was `\d{1,3}`. **`N1201` "Medium contract" is a real, ratified store node
with a four-digit id**, and it is precisely what three corpora's opening scenes instantiate — so
those scenes declared it and the parser read nothing at all. Widened to `\d{1,4}` in
`declaredIds()` and in the shared `resolveShape()`. `W1201`, a core walk *file* one character
away, is still correctly ignored, and there is a test pinning both halves. Both parser suites pass.

## The database write

`tools/pods/sync-walk-steps.cjs` — new, committed, dry-run by default. It writes
**`canonical_pod_walk_steps` only**, replacing them for one slug from the corpus's current
declarations, and reads `canonical_pod_scenarios` solely to check that a step's anchor row exists.
`--reimport-destructive` was never used and no dialogue row was written. Every run read back its
dialogue count afterwards: health 438, hospitality 330, care-work 306, retail 330, trades 414 —
all unchanged.

---

## THE UNASSIGNED LIST — every place I declined to assign, and why

**Health**
1. **1.1 flow 2, exchange 3** — the mapping records it as `AMBIG:N7/N2` and refuses to coin-flip
   it. Neither id is declared for that context. (Mapping §9.)
2. **O2 at 2.3** — the §3 table assigns `P5 + O2`, but §7.2 says health attests O2 "variant only …
   never the bald 'nobody knows'". The document contradicts itself; O2 is left undeclared and 2.3's
   other assignments stand.
3. **F11, F15, F18** — §6.1 records all three as **not attested**, blocked by role asymmetry.
   Not declared anywhere in health.
4. **F19** — §6.2 explicitly overrides its own §6.1 row: 2.10 f1 "wears F19's clothes exactly. It
   is not one." Not declared.
5. **O4, O9** — recorded absent in §7.2. Not declared.

**Hospitality**
6. **N10's relayed compliment** ("compliments to the chef", walked across two dyads) and **N13**
   ("shall I ask?" routing into N105) are named in §4 prose with no context attached. Not declared.
7. **E1 spans two contexts** — 1.1 "The welcome, the booking, the walk-in" and 1.2 "Check-in at the
   desk" are one encounter in the mapping and two scenes in the corpus. Both carry E1's full set.
   This cannot create a false traversal, but it does inflate the "hit twice" column by one for
   E1's shapes, and you should read that column with this in mind.
8. **`N301–N306`, `F301–F306` at 2.5** — the E16 row writes a range, not a list. Expanded to the
   twelve ids it names. Flagged because a range is the one place a reader could disagree.

**Care-work**
9. **1.1 "The door and the day"**, **1.5 "The kitchen and the chart"**, **2.0 "A new face"** —
   these three contexts match no encounter in the mapping's §5 table, and I would have had to
   invent the join. They declare nothing.
10. **F502 at 1.11** — E4's own row says it "does NOT attest confidently". Not declared.

**Retail**
11. **F11, F15, F18 at R21 and R24** — the moves table marks them "alive" in a column headed
    "Rung-0 stretches (regulars, staff room)", naming both scenes together without splitting them.
    Declaring at both would double a claim the document makes once. Not declared.

## Two documents the corpora cite that do not exist in this tree

Both hospitality and care-work name a companion document as the home of their per-context shape
assignments — `docs/sector-pods/hospitality-walk-2026-09-01.md` and
`docs/sector-pods/care-work-walk-2026-09-01.md`. **Neither is in the repository, on this branch or
on `main`.** Had they been, the two joins I made by title would have been read off rather than
inferred. This is a real gap and it is why care-work has three unassigned contexts.

## One thing for the page

`health-general-welsh` has no declarations, and the coverage panel renders that identically to
"traverses nothing" — 0 of 36, all red. That is the same false red this job just removed from
health, in a different costume. A pair overlay makes no metagraph claim by design, so the honest
render is "no declarations" rather than a column of red. That is a Script Lab change, in files two
other live jobs are inside tonight, so it is named here and not made.

## What was not touched

No TTS, no audio pass. No course content. No Welsh — not a line, in any file. No store file: the
ten health mints, Ireland's three, trades' three, the overlay's and talk-bollocks' all stay
exactly where the 2026-08-31 pass left them, in `proposed/`. No dialogue row written anywhere. No
existing retail or trades declaration rewritten. `coverage.js` and `walk.js` unchanged.
