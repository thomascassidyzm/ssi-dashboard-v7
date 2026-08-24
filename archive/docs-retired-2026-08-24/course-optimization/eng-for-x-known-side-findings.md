# eng_for_X known-side check — full India run (2026-06-16)

*Agent-driven known-side check (no regex) across all 7 India courses, seeds 1–300, 41,885 prompts,
84 batch agents + 7 synthesis. Per-course findings: `eng-for-x-fixes/known-side/eng_for_<iso>.json`.*

## Result

| course | prompts | vocab | npi | machinery | gloss | content_quality | grade |
|---|--:|--:|--:|--:|--:|--:|---|
| eng_for_hin | 5,908 | 8 | 0 | 0 | 14 | 117 | cleanup |
| eng_for_ben | 6,843 | 45 | 0 | 0 | 4 | 84 | light |
| eng_for_guj | 6,208 | 18 | 4 | 1 | 9 | 74 | cleanup |
| eng_for_pan | 5,583 | 32 | 3 | 1 | 6 | 141 | cleanup |
| eng_for_hin… | | | | | | | |
| eng_for_urd | 5,480 | 47 | 6 | 1 | 8 | 72 | heavy |
| eng_for_tam | 6,318 | 27 | 1 | 0 | 32 | 129 | heavy |
| eng_for_sin | 5,545 | 69 | 1 | 3 | 8 | 84 | heavy |
| **total** | **41,885** | **246** | **15** | **6** | **81** | **701** | |

**Answerability machinery is clean.** Across 41,885 prompts the licensing checks found 15 NPI + 6
machinery violations (~0.05%). The `npiLicensing` calibration worked — the कुछ-भी-style drift is gone.
This validates the methodology's licensing model and the briefs. The work is all in **content generation**,
not the gates.

## The real finding: ~7 generation-bug families, identical across all 7 courses

The courses were built independently, yet the agent surfaced the **same defect families in every one** —
so these are upstream **generator/methodology bugs**, not per-row typos. Each is one-fix-fixes-many (often
hundreds), and a generator fix would propagate to all 16 eng_for_X courses (incl. CJK/Euro):

1. **Unsourced English** — the English target carries words ('want', 'start', 'than', 'I think', 'from
   you') with no source morpheme in the foreign prompt → literally unproducible. In *every* course.
2. **Untaught-synonym leaks** — a content word debuts before introduction, or duplicates an already-taught
   lemma (urd اہم vs taught ضروری, pan ਮਹੱਤਵਪੂਰਨ vs ਜ਼ਰੂਰੀ, sin's 69, tam 'say'). The biggest vocab bucket.
3. **Component word-salad** — idiomatic M-LEGOs split into mid-LEGO fragments with nonsensical glosses
   (रात को→"very well"; tam "interlinear gloss-chain", one-fix-fixes-250+).
4. **Agreement/gender frames reused without re-agreeing** — a templated verb pasted across subjects/heads
   without re-inflecting (hin, ben, tam, urd).
5. **Bare-noun + frame-adverb drill template → broken syntax** — doubled-infinitive करना prospectives
   (कॉल करना करने वाला हूँ), tam "one-fix-fixes-hundreds".
6. **Tense/aspect gloss mismatch** — past foreign verb glossed present English (tam), positive copula
   glossed *negated* English (hin यही है→"that isn't"), वேண्डुम्→past "wanted to".
7. **Dative-subject experiencer broken** — want/need/feel rendered with nominative not dative (urd, sin).

## What this means

- **The fix is upstream, not 1,000 manual edits.** The same families recur because one generation process
  produced them. Fixing the generator/template (and the controlled-vocabulary discipline) + re-gating is
  the lever — exactly the gate-and-fix thesis, now with the known-side gate characterising the defects.
- **The `content_quality` side-channel (701) earned its place** — it caught the authoring/template defects
  the answerability check correctly keeps out of scope. That's where the bulk of the generation bugs live.
- **Per-course release effort** (the real, answerability-gating count, excl. content_quality): hin 22,
  guj 32, pan 42, ben 49, tam 60, urd 62, sin 81 — but heavily clustered into the families above, so the
  effective remediation is far smaller than the raw counts.

## Gated-regeneration proof (2026-06-16) — the result inverts the obvious fix

Confirmed the courses are pre-gate: phrases built **Mar–Jun 10 2026**; the phrase gates landed **Jun 14**
(`b41ba8d1`). Then ran the **real** golden-path phrase gates (`checkVocabViolations`, `checkPhraseZUT`)
on 5 known-defective Hindi seeds (`scripts/proof-gated-regen.cjs`):

- **Gate is live** — control: it rejects an un-introduced English word ("I want to *xylophone* the answer").
- **All 5 real defective seeds passed clean — 0 rejections.**

Why: for `eng_for_X` the deterministic gates (`checkTiling`/`checkVocabViolations`/`checkPhraseZUT`) inspect
the **English TARGET** side — they verify the English tiles from introduced English LEGOs. The defect
families here are on the **foreign KNOWN side** (unsourced-English-relative-to-Hindi, foreign-synonym leaks,
foreign word-salad), which the target-side gates never look at. And the one known-side gate in the golden
path (`checkKnownSide`) is the regex one — ASCII-tokenized (no-ops on Devanagari) AND it reads the old
`freeGlue/npiTokens` field names, not the new briefs' `freeClass/npi` — so it is **inert for eng_for_X**.

**Conclusion (corrects the earlier plan): regenerating through the golden path will NOT fix these.** The
golden-path gates pass the defective content. The gate that actually catches this class is the **agent
known-side check** we built — which is not a golden-path deterministic gate. So for `eng_for_X` the
remediation is: agent-known-side **find** (done) → agent-assisted **fix** of the flagged rows
(re-source / re-gloss / fix decomposition), and to make it repeatable, **wire the agent known-side gate
into the build/release pipeline** (it is the missing gate for the known side of these courses). The
deterministic ZUT/tiling/vocab gates remain correct and necessary for the English target side.

## Where this sits

All 16 eng_for_X courses now have the **ZUT gate** (run + 383 fixes applied). The **7 India courses** now
also have the **known-side gate** (run, findings saved). Still open: act on these findings (recommend a
generator/template fix pass, not row-patching), the 78 ZUT `differentiate` items + 2 blockers, CJK/Euro
briefs + known-side runs, and the tiling/vocab gates. Tooling: `scripts/known-side-scaled.workflow.js`,
`scripts/export-known-side.cjs`.
