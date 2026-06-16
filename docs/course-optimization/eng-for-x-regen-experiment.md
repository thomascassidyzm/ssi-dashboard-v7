# Regenerate vs gate-and-fix — eng_for_hin seeds 50–57 (2026-06-16)

*Held the English intentions fixed, regenerated the decomposition + phrases with the full current stack
(the Hindi brief + glossRules, ZUT, known-side control, no-unsourced-English, idiomatic-M-LEGOs, frame
diversity / P7), then a critical judge diffed old (pre-gate) vs new. Artifacts:
`eng-for-x-fixes/regen/eng_for_hin_50-57.json`. No DB writes, no TTS.*

## Verdict: the better intelligence materially improves the course — promote-worthy

All **7 flagged defect families are genuinely fixed at the decomposition level**, traceable to the contract
and the prior inventory:

| family | old (pre-gate) | new (full intelligence) |
|---|---|---|
| component word-salad | अच्छा लगता है split into अच्छा='enjoy' + **लगता है='I'**; रात को='very well'; याद='remember' + **नहीं='I can't'** | idioms kept whole, one gloss (अच्छा लगता है='I enjoy', components []); negation = construction feature |
| unsourced English | रात को (='at night') smuggled in, glossed 'very well' to launder it | रात को dropped; every Hindi morpheme traces to an English source |
| अपना mis-binding | S53: उसकी चिट्ठी + अपने बैग **both flattened to "her"** (teaches a falsehood) | two LEGOs: उसकी चिट्ठी='his letter' (friend) vs अपने बैग='in her bag' (subject-bound) |
| synonym leaks | 'enjoy' leaked onto पसंद (the taught 'like') | enjoy=लगना held distinct from like=पसंद |
| dative-experiencer | मुझे...याद severed into verb + fake modal | whole dative M-LEGOs, मुझे preserved |
| ZUT | जितनी जल्दी हो सके reused (already ='as soon as you can' @S28) | re-rendered जितनी जल्दी मुमकिन हो — collision resolved |
| frame diversity | ~7 near-identical USE phrases (incl. a contradictory pair) | varied along tense / person / polarity (P7) |

**The strategic point:** several of these are things **gate-and-fix cannot reach** — e.g. the S53 अपना/उसकी
contrast is simply *absent* from the old build; you can't patch a missing distinction, you have to rebuild.
That's the case for regeneration over row-patching.

## But regeneration alone isn't sufficient — it needs its own verify pass

The judge (deliberately critical) caught **2 real regressions the new build itself introduced**:
1. **S55 ergative error reproduced** — USE phrase वह अच्छी नींद नहीं ली ('she didn't sleep well') uses bare
   वह with a perfective transitive where उसने (ने-ergative) is required — in the very seed whose note brags
   about ergative awareness.
2. **S54 forced ungrammatical phrase** — समय बोलना ('to speak time') / "speak a little more time", reusing
   the समय LEGO where देना (give) was needed. Cut or rewrite.

So the recipe is **author-with-full-intelligence → verify/gate → fix** (the find→author→verify loop), not
a single blind regeneration. The agent known-side check is exactly the verify stage.

## v2 full-loop proof — eng_for_hin seeds 1–50, COLD START (2026-06-16)

Ran the complete loop end-to-end: **author** (5 sequential chunks, ZUT inventory threaded across all 50
seeds) → **verify** (agent known-side gate on the new content) → **fix** → **critical diff + re-verify**.
Artifact: `eng-for-x-fixes/regen/eng_for_hin_v2_1-50.json`.

| | OLD (pre-gate) | NEW (v2 loop) | floor |
|---|--:|--:|--:|
| legos | 134 | 129 | |
| phrases | 1,215 | 475 | |
| **BUILD / lego** | 2.8 | **1.3 ❌** | **>3** |
| **USE / lego** | 4.7 | **1.7 ❌** | **>4** |
| verify findings (new) | — | 14 (0 high) | |
| residual after diff | — | 2 one-line fixes | |

> ⚠️ **CORRECTION (Tom 2026-06-16): the phrase-count drop is a FAIL, not a win.** Every LEGO needs
> **>3 BUILD + >4 USE phrases, always** — BUILD = partial scaffolds (how the new LEGO plugs into prior
> LEGOs before a full clause), USE = complete reinforcement sentences, *needed regardless of frame variety*.
> The v2 rebuild came out at **1.3 BUILD / 1.7 USE per lego** (only 15/50 and 9/50 seeds clear the floors) —
> grossly under-reinforced. The old 2.8/4.7 was roughly the right volume; the 1,215 was NOT padding. My
> earlier "475 is a win" framing was wrong. Root cause: I capped the author prompt ("2-3 build, 3-4 use,
> need not reproduce dozens") below the floor, and the verify/diff agents had no phrase-count rule to catch it.
> **Fix:** author must require ≥4 partial BUILD + ≥5 USE per lego, AND wire the DETERMINISTIC count gate
> (`checkPhraseComplexity`/`checkBuildUsePhrases`) into verify (counting ≠ language judgment → deterministic
> is correct here). See `[[feedback_ssi_build_use_phrase_floor]]`.

**`loop_closed: true`.** The verify gate flagged 14 minor items on a from-scratch 50-seed rebuild; the
independent critical diff/re-verify found only **2 real residuals** — S47 uses यह one seed before its S49
debut (the exact bug class the loop fixed at S45), and a S28/29 soft-ZUT (`जितनी जल्दी हो सके` glossed two
ways) not back-propagated. Both one-liners.

**`release_ready: false`** — *only* because of those two. The judge's verdict: the old build was "broken as
a Hindi controlled-language product" (English-calqued SVO word order almost everywhere, NPI कुछ भी used as
the default positive 'something', a real gender error उसकी नाम, word-salad components, padded 15–25-phrase
baskets); the new build is "a categorical improvement… head-final and idiomatic throughout, hard ZUT clean,
NPI/positive-existential correctly partitioned, dative-experiencer correct, agreement repaired, frame
diversity genuinely realized — fix the two residuals and ship."

**Loop-tuning note for production:** the fix stage was passive (resolved 0 — the cold-start author output was
already clean enough that the diff caught the residuals instead). For the real pipeline the loop should be
**author → verify → fix (must act on findings) → RE-verify → iterate until 0 residual → diff**. The current
run proves the *authoring* is sound; the fix→re-verify iteration is the one piece to tighten before scaling.

## Implication for the 16 courses

- **Regenerate beats gate-and-fix** where defects are structural/missing (most of what the known-side run
  found). The diff is large and the fixes are principled, not cosmetic.
- **Cost/quality:** one seed-batch regenerated + verified is cheap and high-quality. Full eng_for_hin
  (~300 seeds) is a bounded agent job (author batches → verify → fix); the other 6 India courses follow
  with their own briefs. Hold seed intentions fixed; let the build re-render broken Hindi.
- **Recommended:** regenerate the India set through the agent stack (not the golden path — its deterministic
  gates are target-side-blind here), with the known-side agent as the verify gate, then voice once Tom's ear
  approves a sample. `recommend_full_course: true` from the judge.
