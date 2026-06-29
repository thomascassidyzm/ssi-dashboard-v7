# eng_for_X remediation — handoff for Kai's Claude

*Frame, not a checklist. You built these courses; this is what the gates that didn't exist yet would have
caught, plus a proven loop and a map of what's settled vs open. Decide → do → aim. 2026-06-16.*

## The situation (why this exists)

16 `eng_for_X` courses are built in the DB (decomposed to **seed 300**; 668 is the canonical seed list),
**all `status=draft`, nothing released**. They were generated **Mar–Jun 10 2026 — before the phrase-level
gates landed (Jun 14, `b41ba8d1`)**. So the methodology you encoded is sound; what's wrong is the specific
class of defect those gates catch and these courses never saw. This is **gate-and-fix**, not a rebuild from
zero — and not a criticism of the build. The Jan-2026 review (`docs/ENG_FOR_X_REVIEW_2026-01-30.md`) already
called it: *"need stronger ZUT enforcement."*

## Immovable constraints (loud — read before touching content)

1. **The methodology already lives in the course-builder. Regenerate/fix THROUGH it, never re-author rules
   in agent prompts.** `checkBuildUsePhrases` (≥3 BUILD / ≥5 USE, graduated), `checkPhraseComplexity`,
   `checkTiling`, `checkVocabViolations`, `checkLegoConflict` are all there. (We learned this the hard way —
   a bespoke author prompt silently dropped the BUILD/USE floor.)
2. **COUNT vs MEANING is the division of labour — not target vs known.**
   - **CODE / course-builder gates:** phrase-count floors, tiling, vocab presence, length tiers. Anything
     you can count or mechanically verify.
   - **AGENT:** frame diversity, ZUT-as-meaning, known-side control, gloss quality, **grammaticality**. Any
     judgment about what the language *means*.
3. **No regex/signature/stemmer EVER for a language judgment.** Frame diversity included —
   `checkBasketFrameCoverage` is a code signature and is useless (returned `[]` on all 9,846 legos). It is an
   agent job. (See doctrine `ralph-methodology.md`; the rule cost us two wrong turns.)
4. **BUILD = partial scaffolds** (how the new LEGO plugs into prior LEGOs, before a full clause); **USE =
   complete reinforcement sentences, ≥5, needed regardless of frame variety.** More frames good; **fewer
   phrases is a fail.**
5. **ZUT:** one known prompt → exactly one target form (production direction; naturalness is not the
   tie-breaker). The **known side is a controlled language too** — every foreign content morpheme must be an
   already-introduced LEGO or free class. Vocabulary is **known / target / seed**, never "source."
6. **No TTS / no deleting generated audio without a plan + approval.** All work stays `draft`.

## The eng_for_X-specific gotcha (the thing that shapes everything)

For `eng_for_X` the course-builder's deterministic gates inspect the **English TARGET** side and work. But
its **known-side** gate (`checkKnownSide`) is the **regex** one — ASCII tokenizer (no-ops on Devanagari/
Tamil/etc.) reading old field names — so it's **inert for these courses**. Proof: we ran the real golden-path
gates on 5 known-defective Hindi seeds → all passed clean; a control (fake un-introduced English word) was
correctly rejected. **The deterministic gates are blind to the foreign side.** So the known-side language
control is an **agent** job — that's why the per-language briefs + the agent known-side check exist.

## The operating model — TRIAGE by decomposition soundness

The phrase layer inherits the LEGO gloss, so you cannot fix phrases on a broken decomposition (proven: a
basket glossed `बातें करना`="talking more" yields frame-diverse but ungrammatical "I want talking more",
which still passes the vocab gate). So:

- **Run the agent known-side check first** — it identifies which baskets have broken decompositions
  (word-salad glosses, unsourced English, untaught synonyms, agreement/अपना/dative errors).
- **Broken-decomposition baskets → v2 decomposition-regen loop** (the core engine): re-author the
  decomposition + phrases with the brief, **submit through the course-builder** so floors/tiling/vocab are
  enforced, verify with the agent known-side check, iterate. Fixes gloss + phrases + floors together.
- **Sound-decomposition baskets → phrase finishing pass:** rewrite the USE set to ≥5 **frame-diverse**
  (agent), gate counts/vocab via the course-builder, add a **grammaticality/naturalness agent check**.

**The v2 decomposition-regen is the lever; phrase-rewrite is the finishing layer.**

## Sequencing (Tom's call)

**Target (English) side first** — it's shared across all 16 courses and is the side the deterministic gates
cover, so it's the highest-leverage, lowest-risk start. **Known (foreign) side second** — harder, per
language, and the *fix method* is still open (find is solved).

## What's proven vs open

**Proven / done:**
- ZUT target-side: **383 same-foreign→one-English consolidations applied** (reversible, backups in
  `eng-for-x-fixes/_backups/`).
- Agent known-side check: built + calibrated, **run on all 7 India courses** (findings saved).
- v2 decomposition-regen loop: **eng_for_hin seeds 1–50 cold-start, `loop_closed: true`**, categorical
  quality jump (only 2 one-line residuals).
- Phase-1 sizing + fix-loop prototype (8 baskets): loop mechanically works; surfaced the entanglement above.

**Open (the real work):**
- The v2 loop's **fix → re-verify iteration** needs tightening (the prototype's fix stage was passive).
- A **grammaticality/naturalness agent gate** (the vocab gate passes ungrammatical English).
- **Phase 2 known-side FIX method** (Tom: "not sure the best way") — candidates: agent re-gloss of flagged
  rows / re-render broken foreign seed sentences / decomposition rebuild through the course-builder. Likely a
  mix: re-gloss for gloss slips, re-render where the foreign sentence itself is malformed.
- **CJK + Euro briefs** (only the 7 India briefs exist) and their known-side runs.
- Frame-diverse USE authoring at scale (≈5,300 baskets thin/monotonous; +1,178 BUILD / +2,208 USE to floor).

## Areas to think through
- **Where to fix the gloss** — let the regen agent fix the gloss the basket hangs on (blurs target↔known)
  vs a separate decomposition pass first. The prototype says the regen-together approach is cleaner.
- **Cross-course English reuse** — the English intention is shared across all 16; the *glosses/frames* could
  be aligned course-to-course, but LEGO *boundaries* are set per foreign chunking, so it's not a fully shared
  layer. Worth scoping.
- **Known-side fix method** (the big open one above).

## Stuff to build
- Tighten the v2 regen loop: **author → course-builder gates → agent known-side verify → fix (must act) →
  re-verify → diff**, run per seed-batch through `POST /api/seed/complete`.
- A grammaticality/naturalness agent gate (meaning), distinct from frame diversity.
- (Maybe) make the regen loop a reusable harness across the 16 once the iteration is tight.

## Directions / bets
- Regenerate the decomposition through the course-builder + the agent known-side verify; don't hand-roll
  methodology; don't regex language. zho/v2 thinking already encodes this.
- India first (hin/ben/guj/pan/tam/urd + sin) → CJK (zho/jpn/kor) → rest; voice only on Tom's ear, sample first.

## Pointers (don't duplicate — read these)
- **Investigation + findings:** `eng-for-x-zut-adjudication.md`, `eng-for-x-known-side-findings.md`,
  `eng-for-x-known-side-pilot.md`, `eng-for-x-regen-experiment.md`, **`eng-for-x-remediation-plan.md`** (the
  current plan + sizing + prototype + division of labour — start here after this doc).
- **Per-course fix data:** `eng-for-x-fixes/` — `<course>.json` (ZUT), `known-side/<course>.json`,
  `regen/eng_for_hin_v2_1-50.json` (worked rebuild), `frame-sizing.json`, `phase1-proto_eng_for_hin.json`.
- **The 7 India briefs (agent knowledge, no regex):** `pair-contracts/eng_for_{hin,urd,ben,guj,pan,tam,sin}.contract.cjs` + `_TEMPLATE`.
- **Doctrine:** `ralph-methodology.md`, `synonym-choice-architecture.md`.
- **The gates:** `services/course-builder/lib/validation.cjs` + `phrase-structure.cjs`; golden path
  `routes/seed-complete.cjs`; contract loader `loadPairContract`.
- **Read-only DB tooling (workspace `scripts/`, gitignored — reproducible queries):**
  `inventory-courses`, `zut-sweep-eng-for-x`, `gen-zut-flags`, `apply-zut-fixes`, `export-known-side`,
  `known-side-scaled.workflow`, `export-frame-sample`, `size-phase1-target`, `export-regen-slice`,
  `export-phase1-proto`.
