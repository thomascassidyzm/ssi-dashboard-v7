# Phrase-quality lane — rubric digest

Distilled for the lane's workers from Tom's capture pack (full text: `/home/tomcassidy/.claude/projects/-Users-tomcassidy/memory/capture-pack/translation-qa-rubric.md` and `course-generation-manual.md` beside it — read a section only if a case needs it).

**The lens.** Least action to confidence. Constraint order: ZUT ≥ understandable > minimum vocabulary > maximum pattern > naturalness. "A native would say X" is never, on its own, grounds to change a ZUT-clean row. A slightly stilted but tileable English prompt is correct: the known side is a controlled language.

**Evidence standard.** Never judge a bare fragment. Read the seed's full sentence in both languages and every sibling row at the same seed and LEGO, then judge.

## What counts as a defect (check in this order)

- **R1 ZUT.** One normalised KNOWN maps to one TARGET across the whole course, on LEGO, BUILD and USE rows. The reverse (many knowns to one target) is fine. `zutCollisions` in the window export lists the candidates. Fix by consolidating true synonyms, differentiating a genuine sense split through natural context words in the English (never parentheses), or standardising a structural variant.
- **R2 Component rows** (`phrase_role = component`). The known side is exempt from ZUT. The target must be a contiguous substring of its own seed's target. If it shares nothing with the seed and a sibling already teaches the chunk, it is an orphan: delete it.
- **R4 Known-side controlled language.** The English may use only glosses of LEGOs already introduced, plus glue words, plus licensed constructions.
- **R5 No parentheses, no explanation,** anywhere learner-facing.
- **R6 Register.** In T-V languages informal is the default. Use formal only where the seed's context insists, and mark it vocatively ("sir", "madam").
- **R7 Honest glosses.** A LEGO is glossed as a producible intention, never as grammar metadata ("object marker").
- **R8 Clunkiness, graded on the KNOWN phrase.**
  - Tier 1: natural, or a fragment that extends naturally. Pass.
  - Tier 2: possible, but needs a lot of context. Fail.
  - Tier 3: wrong. Fail loudly.
  - USE rows must be tier 1 and a complete sentence. BUILD rows may be fragments, but must extend naturally.
- **Grammar and meaning.** The target must be grammatical and must say what the known says: agreement, elision, mood, case, word order, wrong word, mistranslation.
- **R10 Floors.** Every LEGO keeps at least 4 BUILD and 5 USE rows. Never propose a delete that breaks a floor. Propose an edit instead, or flag the row.
- **Containment.** A phrase contains its LEGO's exact target and uses only vocabulary already available: seeds 1 to N-1, plus earlier LEGOs of the same seed, plus itself.

## What the lane may change

- **Proposable:** `course_practice_phrases` rows only, as `edit` (one field, `known_text` or `target_text`, with exact before and after) or `delete`.
- **Never proposed as an edit, always flagged:** seeds (seeds are canon), LEGOs (a change ripples through every phrase) and course-wide renames.

## Triage words

- **(a) mechanical** and **(b) clean rewrite** become an `edit`.
- **(c) cut** becomes a `delete`. Cite the sibling that makes the delete lossless.
- **(d) judgement fork** (a synonym or register choice, an idiom convention, or a seed that disagrees with its siblings) becomes a `flag`. It is never an edit.
- **Uncertain** between (c) and (d): choose (d). "If in doubt, cut it out" applies only to rows *confirmed* ambiguous or mismatched.
