# The union of all four pods over the shape graph — and what the 170 unmapped lines actually are

2026-08-31. Measured, not argued: every number below comes from re-running the store's own
instruments (`tools/metagraph/measure-coverage.js`, `src/lib/metagraph/{walk,coverage}.js`) against
the live `canonical_pod_scenarios` / `canonical_pod_walk_steps` tables, and from reading every
unmapped line. The sacked slates `pod-0.5` and `pod-1` are excluded throughout, per Tom's ruling.

## The two headlines

1. **Shapes reached by no pod: ZERO.** The union of the four overlays covers all 23 shapes and all
   9 outcome shapes. But the union is thin exactly where it matters: **14 of 23 shapes are reached
   by POD 1 alone**, and the whole composition lattice — all 19 edges — is attested by that one
   231-line pod and nothing else. The real hole is not an unreached shape; it is the **recovery
   halves**: 6 of the 15 survivability edges (S2 and all five method-pod edges M1–M5) have no
   attested recovery anywhere in the union.

2. **The 170 unmapped lines are not unmapped material.** Every one of the 43 scenes carries a walk
   declaration; the 170 lines sit in 28 scenes whose declared shape names resolve to nothing in the
   store. The split: **34 lines are an instrument artifact** (scenes that deliver an outcome shape
   but count as unmapped because outcomes aren't nodes), **66 lines already have a drafted proposal**
   sitting unloaded in `proposed/talk-bollocks-additions-2026-08-30.json`, **58 lines are genuine
   mint candidates with no proposal yet** (now drafted as N901–N910), and **12 lines are a
   crosswalk gap** (the control arm's own m1–m23 move register, which the store deliberately refuses
   to guess into its F register). **Zero lines are framing, filler, or stage direction.** There is
   no mapping defect in the "graph has it, mapping missed it" direction; the one candidate defect
   runs the other way (scene 4, below).

---

## 1. Method Pod: one body, two cuts — counted once

The 43-scene cut (276 lines) and the chapters cut (309 lines) share **206 verbatim lines (75% of
the 43-scene cut)**; the flagship shares only 11/276 with them and is genuinely separate material.
So the union below has **three bodies**: POD 1, the Method Pod (union of its two cuts), and the
Learning flagship. Method Pod is counted once.

One consequence worth Tom's eye: **the two cuts do not deliver the same outcomes.** O6, O7 and O9
are declared only in the 43-scene cut; O2 only in the chapters cut. Whichever cut is sacked, its
outcome declarations must be ported to the survivor or three outcome shapes silently lose their
only delivery.

## 2. The union table — 23 shapes

Traversal counts per body (Method = max of its two cuts):

| Shape | POD 1 | Method | Flagship | Sole source? |
|---|---|---|---|---|
| N1 Ritual open/close | 8 | 2 | 2 | — |
| N2 Transaction | 8 | — | — | **POD 1 only** |
| N3 Availability enquiry | 4 | — | — | **POD 1 only** |
| N4 Instruction-giving | 3 | — | — | **POD 1 only** |
| N5 Acquaintance | 1 | — | — | **POD 1 only** |
| N6 Repair | 1 | 3 | — | — |
| N7 Arrangement | 1 | 1 | — | — |
| N8 Recommendation | 2 | 1 | 1 | — |
| N9 Feasibility request | 1 | — | — | **POD 1 only** |
| N10 Compliment | 3 | — | — | **POD 1 only** |
| N11 Mutual assessment | 1 | — | — | **POD 1 only** |
| N12 Trouble-and-advice | 1 | — | — | **POD 1 only** |
| N13 Not-knowing | — | 1 | 1 | — |
| N14 Premise audit | — | 2 | 2 | — |
| N15 Parked disagreement | — | 2 | 1 | — |
| N16 Precision haggle | — | 1 | 1 | — |
| N17 Interruption-and-bank | — | 2 | 2 | — |
| P1–P6 (all six bound pairs) | 1–3 each | — | — | **POD 1 only** |

- **Reached by no pod: none.**
- **Reached by exactly one body: 14 of 23** — N2–N5, N9–N12 and all six bound pairs, every one of
  them hanging on POD 1 alone. The discursive five (N13–N17) are the mirror risk at lower severity:
  two bodies, but both authored from the same Aran-and-Tom conversation.
- Shapes reached by all three bodies: N1 and N8 only.

**Outcome shapes: 9 of 9 delivered in the union**, but the distribution is stark. POD 1 delivers
**zero** (all nine sites present, no declarations — the overlay's standing to-do). The flagship
delivers O1, O2, O8. The Method Pod delivers all nine across its two cuts — and is the **sole
deliverer of O3, O4, O5, O6, O7 and O9**.

**Composition edges: 19 of 19 attested — all by POD 1, none by anyone else.** The Method bodies
declare shapes flat, at chapter level; no discursive containment has ever been walked. Every sector
mapping (health, Ireland, trades, care, hospitality, retail) leans on containment evidence from one
231-line pod.

**Survivability edges: the union attests all 15 branch halves** (S1–S10 in POD 1, M1–M5 in the
Method corpus) **but only 9 recovery halves.** S2 — *acting on a hedge* — has never been recovered
by any pod: the store's own note says no turn in any corpus takes up a hedge. M1–M5's recoveries
are recorded `unknown`. This matches the store's null result ("the corpus attests the branch and
withholds the recovery") and the union does not repair it.

### The judgement per gap — (a) no occasion, (b) wrong sector, (c) structurally avoided

There being no unreached shapes, the judgement falls on the single-source shapes and the unattested
halves:

- **The 14 POD-1-only shapes are class (b), not (c).** The Method bodies are discursive by design —
  a conversation between two people who know each other has no occasion to order coffee. Nothing is
  hard to stage about a transaction; six sector mappings already point at these shapes. The risk is
  concentration, not absence.
- **N13–N17 living only in the Method material is also (b)** — the transactional pods' registers
  cannot host a premise audit between strangers mid-purchase — **with a (c) edge**: N15 Parked
  disagreement and N17 Interruption-and-bank require a relationship that persists across scenes,
  which one-scene transactional pods structurally cannot stage. That is why no sector pod will ever
  cover them by accident.
- **The recovery halves are the genuine class (c), and the Method Pod itself is the proof.** O3
  ("the native does not understand you") was recorded *unattestable in the Method corpus* — until
  scene 17 deliberately staged it. O6 existed only as monologue until scene 39 gave it a partner
  turn. Failure-plus-recovery does not occur naturally even in 1,299 lines of Talk Bollocks;
  every author avoids authoring failure unless told to mint it. S2's recovery — someone acting on
  "maybe three or four miles" and surviving the hedge being wrong — is the last one nothing stages,
  along with the five M-edge recoveries. These will not appear until commissioned by name.

## 3. The 170 unmapped lines — the classified read

All 28 unmapped scenes are declared; all 170 lines are real two-party exchanges. Four classes:

**(i) Outcome-staging scenes the counter can't see — 34 lines, an instrument artifact.**
Scenes 19 (O4), 23 (O5), 24 (O1), 36 (O7), 39 (O6). These are the outcome-mint scenes — the most
deliberate content in the pod — counted as unmapped because `walkFromStoredPod` marks a step
UNMAPPED unless a *node* resolves, and outcome ids resolve into a separate bucket. Scene 24 ("Solo
uno a uno" — the bare no, ten lines: "No." / "No?" / "No.") delivers O1 and reads as zero coverage.
Repair, not proposal: count a scene with a resolved outcome declaration as mapped.

**(ii) Shapes already proposed, proposal loaded by nothing — 66 lines.**
Scene 1 = N301 Joint construction; scene 15 ("I'll be the bank, you be you") = N306 The co-staged
scene; scene 21 (Pysgod) = N303 The specimen; scene 28 (Wray, "no such thing as words") = N304;
scene 31 = N305 The proxy pitch; scene 2's flag line is F302 **verbatim** ("It proves nothing —
accept it anyway"); scene 13 = F303 The shared line; scenes 25/26 = F305 Absorb and build; scene
29 = F306; scene 32 = F304. The reading work was done on 2026-08-30; the store just never adopted it.

**(iii) Genuine mint candidates with no proposal anywhere — 58 lines, now drafted as N901–N910**
in `services/shared/metagraph/proposed/method-pod-unproposed-shapes-2026-08-31.json` (9xx range,
free as of today; loaded by nothing). The flagged guess (scene 7), the razor (8), public
position-abandonment (10), the mirrored tease (11), the metaphor handover (12), the stacked
commission (20), the misreading corrected (27), complaint-with-partner-turn (30), story → matched
story (35), the listener names it (38). Three of these are summit shapes the talk-bollocks
extraction named but declined to mint.

**(iv) The m-register crosswalk gap — 12 lines.** Scenes 33 (m9) and 34 (m8) declare only in the
control arm's own m1–m23 move numbering, which the store holds no crosswalk for and correctly
refuses to guess. Repair: a declared m→F crosswalk table, one judgement pass.

**Mapping defects: none found in the missed-mapping direction.** One candidate in the opposite
direction: scene 4 ("Dov'eravamo?" — the flagged digression and return) is currently counted
*mapped* to N6 Repair because the alias regex matches "reformulation"; its content is proposed
N302 Digression-and-return. One scene, six lines, over-mapped rather than under-mapped.

### Is ~60% unmapped uniform? No — and the non-uniformity is the finding.

POD 1: 125/231 (54%). 43-scene: 170/276 (62%). Chapters: 94/309 (30%). Flagship: 130/367 (35%).
The **same Method content** is 62% unmapped in the 43-scene cut and 30% as chapters, purely because
chapter-level declarations blanket more lines per resolved shape — the rate measures declaration
granularity, not material. The chapters' and flagship's remainders are the same four classes (their
undeclared chapters are dense with m-tokens, summit shapes, and even resolved outcome ids — the
chapters' chapter 10 delivers O4, O6 *and* O7 while its 34 lines count unmapped). POD 1's 125 is a
different mechanism: ~80 of them are the Learner drill frames of scenes 14–21 — single-speaker
monologue below the exchange grain, correctly outside a graph of exchanges — and the rest are
dialogic rows the graph's derivation cited by representative attestation rather than exhaustively
(the café-order lines g38–g43 are cited by composition edge C5 and outcome site O3, yet count
unmapped because only *node* attestations map rows).

## 4. Two instrument defects found on the way (reported, not fixed — read-only job)

1. **The survivability read-out is a numeric-collision artifact for every stored-walk pod.**
   `computeCoverage`'s `visitedRows` collects `payload.globalOrder` regardless of reference space,
   so a Method scene's `global_order` 47 masquerades as pod-0's g47 and "exercises" S-edges the pod
   never touched. That is why all four pods report an identical "10/15 exercised". The node
   coverage is protected by a `refSpace === 'g'` guard; the survivability and `siteInWalk` reads
   need the same one-line guard in `src/lib/metagraph/coverage.js`.
2. **Outcome-staging scenes count as unmapped** — class (i) above, same file.

## 5. Recommendation — ranked, with reasons

**My read: the next move is a ratification pass, not a new pod.** Specifically, one sitting of
Tom's over three things that already exist: (1) adopt or reject the talk-bollocks additions
N301–N306 / F301–F306 / S301–S305, (2) rule on the N901–N910 candidates, (3) rule the m→F
crosswalk. Add the two one-line instrument repairs. That converts the "170 unmapped" to roughly
zero **without authoring a line**, on reading work already done and paid for — better (the graph
stops under-reporting its own best content), simpler (adoption, not creation), cheaper (an hour of
taste calls). Until the discursive mints are ratified, every union number above under-counts the
Method material, and any pod commissioned against today's graph is aimed at a stale deficit list.

**Second: commission the first sector dialogue — retail or health — explicitly briefed to walk the
transactional lattice.** No sector has any authored dialogue, the mint curve (10 → 2 → 1 → 0 → 0)
says the trunk is closed so authoring is now safe, and it directly retires the real union risk: 14
shapes, 19 composition edges and 10 survivability branches all hanging on one 231-line pod.

**Third, small and named: stage the withheld recoveries.** Six scenes — S2's hedge acted on and
survived, and M1–M5's recovery halves — commissioned by name, the way scenes 17 and 39 were. The
class-(c) finding says these will never appear otherwise.

These do not trade off; they sequence. The ratification is the prerequisite that makes the other
two aim true.
