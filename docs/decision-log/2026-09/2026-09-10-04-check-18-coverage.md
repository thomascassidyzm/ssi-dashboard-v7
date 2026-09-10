# DL-2026-09-10-04 — A detector must report its own coverage, and a shortfall is a failure

- **Date:** 2026-09-10 *(back-filed; the work itself ran 2026-08-18)*
- **Decided by:** the worker rebuilding Check 18, under no standing grant — a tool decision, not a content decision, so it did not need one
- **Status:** STANDING
- **Produced:** **A3** (below ~99% coverage is a FAILED run) · **HB-01** procedure steps 1–2 · the replacement Check 18 matcher

## DECIDED

Any detector in this estate reports the number of rows it actually parsed next to its verdict, returns an explicit `unparsed` status rather than dropping rows, and **exits non-zero below 99% coverage**.

## CONTEXT

Check 18 (presentation drift) was reporting clean course after course. It was being quoted as evidence that presentation text and LEGO text agreed across the estate.

## REASONING

A verdict without a denominator is not a result. The failure here was not that the matcher was wrong about the rows it read — it was right about those — but that it had no way to say how few it had read, so a 30% sample was indistinguishable from a full pass. Making coverage a *printed number next to the verdict* is what turns that from an invisible property into a readable one; making a shortfall a **non-zero exit** is what stops it being a footnote a reader skips.

## EVIDENCE, AND ITS LIMITS

- Against a known set of **229 drifted rows, the old check flagged 2**.
- It was parsing **21,342 of 72,063** presentation clips and silently skipping **50,721** — one template with a hardcoded `, as in` connector followed by `if (!m) continue`. The estate mostly says `, is:`.
- A census found **13,762 distinct narration skeletons**: Tamil, Hindi em-dash forms, Kannada, Chinese, Korean. Two families carry no quotes at all — legacy Welsh `<src>`/`<tgt>` markup, and a Japanese frame. Dutch SSML actively poisons a quote scanner.
- The replacement parses **delimiters, not sentences**, covers **99.99%**, and now flags **226 of the 229**. It surfaced **2,744 previously invisible drift rows across 70 courses**.

**Limit:** none of those 2,744 rows was verified by listening. `course_audio.text` is what a row *claims* was spoken; only `word_boundaries` records what TTS actually voiced. The drift is established between two text fields, not between text and sound.

## REJECTED, AND WHY

**Rejected: adding more connector templates to the existing matcher.** It is the obvious cheap fix and it fails on its own terms — with 13,762 distinct skeletons, a template list is a treadmill, and it leaves the real defect (silent skipping) intact while making the coverage number look better. Parsing delimiters rather than sentences removes the class instead of the instances.

## SUPERSEDES / SUPERSEDED BY

— 

## OPEN AFTER THIS

The 2,744 surfaced rows are unrepaired and unlistened-to. Ownership unassigned; tracked in `docs/canon-gaps.md`, not here.
