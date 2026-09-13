# Pod chunk granularity — state of play + monster-sentence proposal

*2026-07-16. Report only — no content or pipeline changes made. Data: read-only pass over
`listening_pod_sentences` (hrv_for_eng), full numbers in `scripts/pod-hrv/report.json`
(gitignored workspace). Player facts verified against ssi-learning-app `main`.*

---

## 1. The pipeline as-built (four eras of granularity)

| Era | Unit | Where it lives | Status |
|---|---|---|---|
| Stage-0 explainers (June) | per-atom walk with glosses | `pod_legos`, explainer clips; app `stage0Sequence.ts` | **Killed in main flow** (app `4f19da96`, 2026-07-14); survives only in admin pod-auditioner |
| `atom_map` (coarse/live) | word/short-phrase glossing atoms | `listening_pod_sentences.atom_map` | Live — now drives the **visual** LEGO-tile turn display |
| `atom_map_fine` (Aran, 07-01/02) | "molecular breath-groups, 3–6 words" | `listening_pod_sentences.atom_map_fine`; authored by `tools/breakdown-fine.cjs`, gated by `tools/audit-fine-seams.cjs` | Live data; drives Take-G audio seams + Listening Drill |
| Independent-meaning rule (Tom + Aran, 07-14) | complete communicative unit; most 1–4-sentence turns = ONE phrase | same tools, rewritten prompt + gate; canon in `pod-ladder-proposal.md` §9 | **On branch `feat/pod-independent-meaning-segmentation` — NOT merged to main** |

⚠️ Branch finding: the whole recent pods lane — the 07-14 segmentation rule, the hrv pod-0
gloss-fidelity fixes, AND the hrv pod-0 audio regen — sits unmerged on
`feat/pod-independent-meaning-segmentation`. Main's authoring prompt is still breath-group-era.

The 07-14 rule's only legitimate seams are: sentence boundaries, coordinated independent
clauses, turn-initial interjections. It explicitly forbids splitting a subordinate clause from
its verb — which is exactly the split the monster-sentence fix wants. Overlong phrases are
flagged, not rejected. The overcooking is the rule working as written, one notch too coarse.

## 2. Visual chunking in the main flow: SHIPPED

Live on production since the 2026-07-15 promotion (`174e8e9c`), no feature flag.
`PodTurnDisplay.vue` keeps the whole current turn on screen as LEGO tiles (glosses always on,
active sentence highlighted), driven by **`atom_map`** via the same `LegoAssembly` engine as
speaking-course debut tiles. Main-flow pod AUDIO no longer plays sliced chunks at all —
every sentence enters at whole-sentence Stage 1, then the speed cascade. Chunked audio
(Take-G slices at `atom_map_fine` seams) survives only in Listening Mode → Dialogues Drill.

**Consequence:** visual tiles and audio chunks are two different segmentations by design.
The learner in the main flow SEES the breakdown but HEARS the sentence whole — so what Tom
heard on staging is partly the designed post-Stage-0-kill behaviour, and the chunk-size fix
targets `atom_map_fine` (drill + any future gapped audio), not the tile display.

## 3. The data (hrv_for_eng, syllable counts approximate: vowels + syllabic r)

| level | n chunks | mean | median | >8 syl | >11 syl |
|---|---|---|---|---|---|
| pod-0 `atom_map` (coarse) | 944 | 2.9 | 3 | 0.4% | 0% |
| pod-0 `atom_map_fine` | 477 | 5.7 | 5 | **19.9%** | **3.4%** |
| pod-1 (NO maps — whole turns) | 180 | 20.2 | 20 | **92%** | **81%** |

- **pod-1 has no chunk maps at all** — 180 multi-sentence turns served whole (31–53 syl at
  the top). Structurally different problem: not chunked too coarsely, never chunked.
- The cited line (`pod-0:SC15-S007`, order 137) **is already mapped** into 6 fine chunks —
  but two blow the cap: "kad ne mogu dovoljno brzo razmišljati" (13) and
  "ako želim govoriti samopouzdanije" (15, the worst chunk in pod-0).
- **The tension is real:** clause/intention boundaries on the worst turns yield pieces of
  6–16 syllables; ~40–50% of natural clauses exceed 8. Some single clauses (30 syl with no
  internal boundary) can't reach 8 without a mid-clause cut. 5–8 and intention-coherence do
  NOT reliably co-satisfy — one must be allowed to beat the other, case by case.

## 4. Proposal — options for the founder

**Decision 1 — the seam rule (the dial).**
- **A (recommended): intention = clause.** Amend §9: any finite-clause boundary is a
  legitimate seam, subordinator/relativiser attaches to its clause ("kad ne mogu…" is one
  piece). Target 5–8 syl; 9–C tolerated only for a single unsplittable intention; **> C must
  split** at the best prosodic point even mid-clause. Ceiling C is Tom's call:
  **C=12** (strict — splits "kad ne mogu dovoljno brzo razmišljati" at 13) or
  **C=14** (loose — keeps it whole, matching his own suggested split of the example).
- B: hard 8 cap — refuted by the data; re-manufactures the stub fragments 07-14 killed.
- C: keep 07-14 as-is, sweep flagged monsters by hand — cheapest, leaves 1-in-5 over 8.

**Decision 2 — where it applies.** My read: `atom_map_fine` only (Listening Drill + future
gapped audio). Main-flow audio stays whole-sentence with visual tiles — reintroducing a
chunked audio rung in the main flow would be un-killing Stage 0.

**Decision 3 — sequencing/cost.**
1. Merge `feat/pod-independent-meaning-segmentation` (or rule against it) — right now main
   authors breath-groups while staging audio follows the new rule.
2. Amend rule + gate (text-only, one commit).
3. Re-chunk: pod-0 targeted pass over the ~30–40 turns owning a >C chunk (text-only LLM
   pass, no cost gate); pod-1 full chunking pass (180 turns) — but see Decision 4 first.
4. Audio: changed seams need Take-G chunked-take re-renders — Azure cast for hrv, ~1 TTS
   call per affected turn, bounded batch, normal audio approval gate. Queue via
   `queue-audio-pass.cjs`; no TTS without an approved plan.

**Decision 4 — fold in the pod-1 stress-test (already awaiting ruling,
`pod1-content-stress-test.md`).** Pod-1's 196 sentences score 10 keep / 3 rework / 1 kill;
the review recommends the move-frame rewrite and calls the missing repair scene
non-negotiable. Rule on frame BEFORE chunking pod-1, or the chunking pass is paid twice.

## 5. PRIMARY PROPOSAL (supersedes §4 Decisions 1–2) — ellipses in the source text
*(Founder steer, 2026-07-16: chunk monsters by inserting '…' at intention boundaries in the
source text before recording — audio and visual matched by construction, no post-hoc slicing.
Independent-meaning rule stays; ellipses mark breathing WITHIN a piece's sentence.)*

**Empirical verification (3 renders, founder-approved; files in `scripts/ellipsis-test/`):**
- **xAI (`leo`, lang=hr): '…' → natural pause, YES.** Two clean 330–410 ms pauses exactly at
  the ellipsis points, no artefacts, no spoken "dot dot dot", duration delta matches the
  pauses. Consistent with the stage-0 shared-known-store finding (~450 ms on `leo`).
- **Azure (`hr-HR-GabrijelaNeural`): '…' → NO pause.** Frame-by-frame RMS shows no gap ≥50 ms
  at either ellipsis point — Azure passes the character through with negligible effect.
- **Resolution, not a blocker:** '…' stays the single canonical break mark in `target_text`;
  the RENDER layer translates it per engine — xAI sends it literally (native pause); Azure
  swaps each '…' for SSML `<break time="~400ms"/>` at synthesis (mechanical substitution;
  `<break>` already proven mastering-clean on this exact cast voice in
  `chunked-take-recipe.md` §1); human cast = "pause at the ellipsis" in the booth. Croatian
  ships on Azure (tier-3), so the shim is required for the very course that motivated this.

**Placement rule.** Only turns containing a piece over the ceiling get ellipses. Insert '…' at
intention boundaries — finite-clause seams with the subordinator/coordinator attached to its
clause ("Malo je frustrirajuće… kad ne mogu dovoljno brzo razmišljati… da bih se ispravno
izrazio"), or comma-marked appositions — choosing the fewest marks that bring every piece to
≤ ceiling. A single clause over the ceiling with no internal intention boundary (they exist:
one 30-syl clause in pod-1) takes one '…' at the best prosodic point and is flagged for ear.
LLM-assisted authoring + the audit-fine-seams-style gate, per the normal sweep protocol.

**Carry-through (verified in code).** The app already treats '…' as sentence punctuation
(`fusionDrill.ts:130`) — the Listening Drill's fusion ladder can never cross it. The fine-map
tooling (`breakdown-fine.cjs`) already splits on '…'. One gap: `breakdown-flat.cjs` (authors
the visual `atom_map`) lists boundaries as ". ! ?" — one-line addition. Tiles are per-atom so
the seam aligns automatically; making the breath VISIBLE (gap/glyph between tile groups in
`PodTurnDisplay.vue`) is a small optional app tweak.

**Regen scope = the founder's one decision: the syllable ceiling.** Pod-0 (142 turns, live
Azure audio; counts = turns owning a fine chunk over C, i.e. turns to ellipsis + re-record):

| Ceiling C | Turns to re-record | Offending chunks |
|---|---|---|
| 8 | 64 (45%) | 95 |
| **10 (recommended)** | **29 (20%)** | **34** |
| 12 | 9 (6.3%) | 10 |
| 14 | 3 (2.1%) | 3 |

My read: **C = 10.** C = 8 re-records half the pod and fights the data (natural single
intentions sit at 9–10 constantly); C = 12 leaves the 13- and 15-syl chunks of the cited
monster line untouched in spirit elsewhere. Pod-1 is free — draft text, no audio yet: author
ellipses into the canon (and into the pod-2/3 authoring prompts) before any recording.
Audio cost: one re-render per affected turn on the existing cast voice (pod-0 hrv: 29 Azure
calls at C=10), queued via the audio-pass gate as usual.

## 6. Open questions carried from the estate (unchanged)

Pod-ladder proposal §8 (humour ceiling, voices, recurring cast, narrator lines, topic spice,
pod-3 length, bridge re-renders as surface) still await rulings; none block Decision 1–4.
