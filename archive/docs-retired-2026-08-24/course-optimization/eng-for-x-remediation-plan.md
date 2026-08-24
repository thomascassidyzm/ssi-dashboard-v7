# eng_for_X remediation plan — target-side first (2026-06-16)

*The corrected, lower-risk plan. Spine for Kai's handoff doc. Supersedes the bespoke "agent re-authors the
methodology" loop in `eng-for-x-regen-experiment.md` — that approach dropped rules the course-builder
already enforces (see the BUILD/USE-floor miss).*

## Principle: the methodology already lives in the v1 course-builder — regenerate/fix THROUGH it

Do **not** re-encode methodology in agent prompts. The course-builder already enforces it:

| rule | where | already enforced |
|---|---|---|
| ≥3 BUILD / ≥5 USE per LEGO (graduated) | `checkBuildUsePhrases` (minBuild=3, minUse=5) | ✅ |
| BUILD = partial / USE = reinforcement | phrase-structure roles | ✅ |
| phrase complexity tiers (SHORT/MED/LONG) | `checkPhraseComplexity` | ✅ |
| tiling — target rebuilds from LEGO targets | `checkTiling` | ✅ |
| vocab — phrases only use introduced vocab | `checkVocabViolations` | ✅ |
| LEGO-ZUT | `checkLegoConflict` | ✅ |

The bespoke author loop bypassed all of this and re-derived a subset badly (it shipped 1.3 BUILD / 1.7 USE).
Submitting through `POST /api/seed/complete` would have rejected that outright. **Lesson: drive the
course-builder; the agent's only language job is the part the course-builder can't do.**

## What v1 actually missed on these courses (built pre-June-14, before the gates)

Just a few heuristics — not the methodology:
- **phrase-level ZUT** (meaning: do two glosses collide?) — never run on these. **AGENT** job.
- **frame diversity** (meaning: new frame vs slot-swap?) — `checkBasketFrameCoverage` exists but is a code
  signature that can't judge language (returned [] on all 9,846 legos — a false clean). **AGENT** job, NOT a
  deterministic gate.
- (metadata-gloss; known-side — same June batch; both AGENT.)

**The real division (Tom 2026-06-16): COUNT vs MEANING, not target vs known.**
- **CODE / course-builder gates:** phrase-count floors (≥3 build / ≥5 use), tiling (string rebuilds from
  LEGO targets), vocab presence (chunk is in the introduced set), length/complexity tiers. Pure mechanics.
- **AGENT:** frame diversity, ZUT-as-meaning, known-side control, gloss/decomposition quality — every
  judgment about what the language *means*.

## Sequencing

### Phase 1 — TARGET side (English), all 16 eng_for_X — FIRST
English is shared across every course and is the side the course-builder gates inspect, so this is
deterministic, high-leverage, and benefits all 16 at once. Run the courses' English-target layer through the
course-builder with the two missing heuristics turned on:
- enforce **frame coverage** (promote `checkBasketFrameCoverage` from WARN), run **phrase-ZUT** (the 383
  same-Hindi→two-English consolidations already applied are part of this),
- top up **BUILD/USE to floor** where under (`checkBuildUsePhrases`), verify **tiling/vocab/complexity**.
This is **gate-and-fix on the English target**, not a rebuild — get the shared target clean and consistent.

### Phase 2 — KNOWN side (foreign X) errors — SECOND (method still open)
The hard, per-language part. The course-builder **can't** do it: for eng_for_X its known-side gate is the
regex one (ASCII tokenizer + old field names), and the gated-regen proof showed the deterministic gates only
inspect the English target and pass every foreign-side defect. So this is **agent** work — the agent
known-side check already *finds* the errors (348 real across 7 India courses). The OPEN question is the best
way to *fix* them (Tom: "not sure the best way"):
- agent-assisted re-gloss / re-source of flagged rows, vs
- re-render the broken foreign seed sentences, vs
- targeted decomposition rebuild for the worst seeds — **through the course-builder** so the structural floors
  still apply.
Design this only after Phase 1 lands.

## Phase 1 SIZED (2026-06-16)

**Floor gap (code-sized, exact** — `checkBuildUsePhrases` over all 9,846 legos):
- 547 legos under BUILD floor, 1,198 under USE floor → **+1,178 BUILD / +2,208 USE phrases** to reach floor.
- Concentrated: jpn (183/177), tam (68/242), hin (50/158), pan (48/115), urd (13/99), zho (18/74).

**Frame rework (agent-sized, 15-basket sample/course = 240 baskets, Haiku):**
- diverse 44% · thin 41% · monotonous 15% → **~56% of baskets need frame rework** (thin+monotonous).
- Worst: tam 80%, ben 70%, sin 67%; best: ita/jpn/kor 40%. Extrapolated to ~9,400 qualifying baskets,
  ≈5,300 need frame-diverse USE rewriting (estimate from sample).
- `eng-for-x-fixes/frame-sizing.json`.

**phrase-ZUT:** 383 consolidations applied; residual in known-side findings.

**Net Phase-1 shape:** the floor gap and the frame rework COMPOUND — the right unit of work is "rewrite/expand
each thin basket's USE set to be **both at-floor (≥5) AND frame-diverse**." Agent authors the USE phrases;
the course-builder gates (floor/tiling/vocab) accept/reject. Large but well-defined, and it's the *shared*
English side, so it lifts all 16 at once.

## Phase-1 fix-loop PROTOTYPE (8 under-floor eng_for_hin baskets, 2026-06-16)

Opus rewrote each thin/under-floor USE set to ≥5 frame-diverse; Haiku re-rated; then the course-builder's
own `checkVocabViolations` ran on the output. Artifact: `eng-for-x-fixes/phase1-proto_eng_for_hin.json`.

**Mechanically the loop works:** 8/8 hit ≥5 USE, **8/8 pass the vocab gate**, frame re-rating ran. The
division of labour holds — agent authors meaning, code checks counts/vocab, agent re-checks frame.

**But three real findings:**
1. **Frame diversity is hard even for Opus** — strict Haiku re-rating: only **4/8 diverse** (3 thin, 1
   monotonous). The loop needs a **frame-fix iteration** (re-rewrite the thin ones), like the v2 loop needed
   a fix pass.
2. **THE BIG ONE — Phase 1 is NOT cleanly separable from Phase 2.** The phrase rewrite *inherits the LEGO
   gloss*. Where the gloss is sound (S65 "it's important" → "it's important to learn English / I think it's
   important / it's important because it's useful") the output is grammatical AND diverse. Where the gloss is
   broken (S23 बातें करना glossed "talking more"), the rewrite is frame-diverse but **ungrammatical** ("I
   want talking more", "she wants talking more but I don't want") — you cannot build a good phrase on a bad
   gloss. **You can't fully fix the target side without fixing the decomposition it hangs on.**
3. **A grammaticality/naturalness gate is missing.** "I want talking more" **passed the vocab gate** (all
   words introduced) — because grammaticality is MEANING, not counts. Phase 1 needs an agent
   grammar/naturalness check in addition to frame diversity; code can't catch this.

**Refinement:** the phrase-only fix is capped by gloss quality, so either (a) let the rewrite agent fix the
gloss/decomposition the basket hangs on (which blurs Phase 1↔2), or (b) lean toward the **v2
decomposition-regen** loop, which fixes gloss + phrases together (and would also enforce floors via the
course-builder). The prototype suggests (b) is the more fundamental lever; Phase-1 phrase-rewrite alone is
a finishing pass, not the whole fix.

## The division of labour (the through-line of the whole investigation)

- **Deterministic gates** (course-builder): counts, structure, tiling, vocab, phrase-ZUT, frame coverage —
  all target/English-side. Counting and tiling are not language judgments, so code is correct here.
- **Agents**: foreign-side language control (the known-side check) — the part no regex can do for these
  scripts. Per `[[feedback_no_regex_agents_for_language]]`.

## Status feeding this plan
- ZUT target-side: 383 consolidations applied (reversible). Known-side check: built, calibrated, run on 7
  India courses (findings saved). Briefs: 7 India authored. Proof: regen produces better decomposition but
  must go through the course-builder for the floors. Tooling + reports under `docs/course-optimization/`.
