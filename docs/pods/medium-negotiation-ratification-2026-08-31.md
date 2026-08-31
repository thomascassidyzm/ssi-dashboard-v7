# The medium-negotiation ratification, and the four-branch merge — 2026-08-31

Four finished branches were sitting on origin unmerged: the health calibration read, the medium
negotiation canonical re-cut, the unified frame map build, and the sector helix design. All four are
now on `main`. This pass also does the separate act the merges do not do — **ratification**: loading
into the canonical store (`services/shared/metagraph/{nodes,edges,moves,outcome-shapes}.json`) what
deserves loading, and leaving proposed what does not. Precedent and shape:
`docs/pods/core-walks-ratification-2026-08-31.md`. **No dialogue was authored.** Every decision below
is one line and overturnable in one line.

## Accepted into the store

| Ids | From | Why |
|---|---|---|
| N1201 Medium contract | medium-negotiation-canonical | Tom's ruling: CORE, and the name stands. The canonical re-cut of the proposed N101 — one shape, five positions, two realisations of position 1 (offer / notice), role-neutral, with the pair-and-culture layer stripped out. Nothing in the ratified 29 negotiates the medium of the encounter itself. |
| S1201 | medium-negotiation-canonical | The medium offer declined, attested twice with a complete four-move recovery both times. For a language course this is the emotional core of the corpus: the learner's offer is refused, it costs nothing, and the refuser thanks them. |
| S1202 | medium-negotiation-canonical | The declaration diverted into biography — a granted contract with no grant ever spoken, and a pivot nobody else will make. Attested twice, once on each side of the offer/notice split, so it belongs to the declaration and not to the ask. |
| C1201 | medium-negotiation-canonical | N5 Acquaintance runs inside N1201 position 2 in the diversion. Mechanical, attested. |
| C1202 | medium-negotiation-canonical | N7 Arrangement inside position 2 in the decline — a counter-proposal of a different medium is arrangement mechanics. Canonical successor of the proposed C109. |
| C1203 | medium-negotiation-canonical | N9 Feasibility inside position 2 — the announced third party joins the contract. Canonical successor of the proposed C110. |

## Rejected — and where each lands instead

| Id | Verdict |
|---|---|
| S1101 the medium offer declined | REJECT → **S1201**. Tom's ruling: superseded by the canonical re-cut, which absorbs both attested account-types (capacity and stakes) on the same two attestations. Landing both would put one survivability edge in the graph twice under two ids. `health-candidates-2026-08-31.json` remains its definition source and the calibration read that produced it is now on `main` in full. |
| The sector 1xx set — N101–N110, P101, F101–F104, C101–C110, S101–S107, O101 | **STAY PROPOSED.** The prior ratification pass ruled the sector proposals stay proposed, and the health calibration read re-checks and *supports* them rather than adding new grounds to load them. N101 in particular is now superseded in substance by N1201, so ratifying it would mint the medium contract twice. Left proposed deliberately, not overlooked. **This is the one call Tom may want to overturn**, and a later pass can load the rest of the 1xx set in one go. |
| The distraction contract | Its own file already holds it at the bar on one attestation; unchanged. |
| The switch-back mid-conversation / the unbriefed third party / the over-accommodation | NOT ATTESTED, not minted; recorded as gaps with what would attest them. Unchanged. |

## The arithmetic, asserted and checked

**CORE grows 18 → 19.** The 18 is the compulsory-set audit's own count: 12 pod-0 nodes plus the 6
bound pairs. N1201 is sited as a **prologue — scene 0**, after N1's open and before the first
transaction ("Before we start —", 2.0 Welsh flow 1). A prologue **prepends**, so no existing scene is
reordered, no existing walk changes, and the every-optional-walk floor is untouched. The selfcheck
now asserts the 19 directly, computed from the store rather than transcribed.

Store totals after ratification: **nodes 29 → 30**, composition edges **21 → 24**, survivability
**20 → 22** in a new `medium_negotiation` provenance bucket. Outcome shapes and moves unchanged.

## Two instrument repairs, both small

1. `services/shared/metagraph/index.cjs` concatenated **three hard-coded** survivability buckets. A
   ratification that adds a fourth would have had its edges silently dropped by the one canonical
   reader — nothing would have failed, the edges would simply not have existed. It now reads every
   bucket, and the selfcheck asserts the flat list equals the sum of the buckets, so the trap cannot
   be re-set.
2. `schemas/metagraph-v1-schema.json` gains the `medium-negotiation-canonical` provenance and the
   new bucket. All five store files validate against it.

## What is NOT done, and is the next job

**Scene 0 is not authored.** Siting N1201 in CORE as a prologue is recorded on the node
(`core_siting`) and asserted by the selfcheck; the six-turn scene itself — the dialogue, and the
decline branch attached at position 2 — is walk authoring against the pod corpus, and the pod-0 walk
set is a transcription of 231 real corpus rows whose accounting the selfcheck reconciles exactly.
Inventing steps in it is not a ratification act. That is a job with its own brief.

## Tom's two corrections, applied to the frame map as it landed

1. **One canonical seed set, identical by definition.** The figures in flight — 664/668, 665/668,
   619/668, and 2,174 distinct known texts with 1,143 unique to one course — measure COURSE KNOWN
   TEXTS, a different object, legitimately differentiated per pair because the known side is a
   teaching instrument. Seed 1 has 116 distinct known texts across 130 courses.
2. **Divergence in the known side is caused by CUTTING.** A LEGO is a cut; character-exactness has to
   enforce the disambiguation with no gloss, so the pair's cuts reach back and differentiate the
   English. Pods are not cut, so there is no disambiguation pressure and no divergence. Hence:
   **pod-derived frames key to the canonical pod text and ARE pair-invariant; seed-derived frames key
   to the course's known text and are per-pair at the generation layer.** One inventory, two keyings,
   decided by whether the source corpus cuts.

Applied as prose and comments in `unified-frame-map-2026-08-31.md`,
`unified-frame-map-built-2026-08-31.md`, `english-pattern-inventory.md`, `could-occupy-eng.{md,json}`,
`tools/frame-layer/could-occupy.cjs` and `tools/frame-layer/extract-dialogue-patterns.cjs`. No
artefact restructured, no extraction re-run.

## Verification, verbatim

Self-check before any merge, and after each of the four: **355 checks passed, 0 failed**. After the
ratification: **367 passed, 0 failed** from a bare worktree, **372 passed, 0 failed** with `ajv`
resolvable so the schema block runs. The twelve new checks are exactly: the N1201 provenance check,
the medium-negotiation edge count, the bucket-sum check, the CORE-19 check, three composition
endpoints (C1201–C1203), two survivability endpoints (S1201, S1202), and three position-family
resolutions inside N1201.

Frame-layer tests after the frame-map merge:

- `could-occupy.test.cjs` — ok, 25 position classes, every target position exists in the shape store
- `extract-patterns.test.cjs` — ok, 31 patterns, metric fails the bad basket (0.333) and clears the varied one (0.903)
- `instantiability.test.cjs` — ok, the gate refuses "and you?" for spa_for_eng at every position, admits it the day a cut mints it, all 18 frames well-formed

`instantiability.test.cjs` will NOT run from a worktree with no `node_modules`: it requires
`generate-candidates.cjs`, which requires `dotenv`. That is a dependency-resolution fact about a
fresh worktree, not a code break — with `NODE_PATH` pointed at an installed checkout it passes. Said
plainly rather than reported as green.
