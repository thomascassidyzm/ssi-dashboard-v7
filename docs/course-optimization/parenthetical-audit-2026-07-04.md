# Parenthetical audit — course-wide, 2026-07-04

*Requested alongside the no-parentheses house law (`ralph-methodology.md`, "No Parentheses,
Ever"). **Count + locations only — no mass edit performed.** Full raw data (every hit, with
course/seed/lego/position/text) is reproducible on demand via
`node tools/course-optimization/audit-parentheticals.cjs` (not committed as a static JSON —
7,962 rows was too large to push reliably over this session's connection).*

## Method
Scanned every row in `course_legos` (known_text + each `components[].known`) and every row in
`course_practice_phrases` (known_text) across all 117 courses in Supabase, for any `(` or `)`
character. This is a superset of the pre-existing `metadata_gloss` gate (which only matched a
narrow grammar-label wordlist) — it catches every parenthetical, not just the ones already
flagged.

## Grand total: **7,962 occurrences across 55 courses**

| Layer | Occurrences |
|---|---|
| `course_legos.known_text` | 3,892 |
| `course_legos.components[].known` | 1,587 |
| `course_practice_phrases.known_text` | 2,483 |

## Top 15 courses by volume
| Course | Total |
|---|---|
| tel_for_eng | 863 |
| mar_for_eng | 669 |
| hin_for_eng | 573 |
| nep_for_eng | 553 |
| swa_for_eng | 506 |
| rus_for_eng | 472 |
| fas_for_eng | 374 |
| srp_for_eng | 365 |
| ces_for_eng | 325 |
| ron_for_eng | 285 |
| eus_for_spa | 274 |
| est_for_eng | 237 |
| ukr_for_eng | 214 |
| isl_for_eng | 207 |
| ell_for_eng | 193 |

## The two courses in play this session
- **spa_for_eng: 9** (all in `components[].known`, none in lego/phrase known_text) — e.g.
  `S0653L01` "you (formal)", `S0642L02` "you (reflexive)", `S0667L01` "you all (indirect)".
  None of these were touched by today's fold-in sweep (out of the named F3–F7 scope);
  they're pre-existing and now covered by the new `checkNoParentheses` gate for any future edit.
- **fra_for_eng: 2** (both component-level) — `S0415L03` "you (informal)", `S0600L03`
  "how (degree)". Very clean relative to the estate; see the transfer-test plan doc for what
  this means for Romance rollout.

## What the parentheses actually are (illustrative, not exhaustive)
Skimming the raw data, the occurrences cluster into a few recurring patterns — useful context
for whoever scopes the eventual fix, not a claim that all 7,962 need the same treatment:

- **Grammatical case/gender/number/person notes**: `"into/in (variant)"`, `"must (1pl)"`,
  `"helped (masc past)"`, `"new (feminine)"`, `"patient (plural)"`, `"that (f)"` — exactly the
  grammar-label-as-gloss problem Conservative Suppression already named, just not caught
  because the existing `METADATA_GLOSS` regex only matched a fixed wordlist.
- **Register markers**: `"you (formal)"`, `"you (informal)"`, `"you (reflexive)"` — the same
  family as the spa_for_eng F7 fix, in other courses.
- **Sense-disambiguation glosses**: `"afternoon (daytime)"`, `"pub (in)"`, `"the (elided)"`,
  `"how (degree)"` — arguably closer to a legitimate dictionary-style disambiguator than a
  grammar label, but still banned outright by the new house law (zero-explanation: the sense
  should be carried by the example sentence, not a bracket).
- **Rarer/noisier forms**: a few look like transliteration or free-form editor notes rather
  than a consistent convention (e.g. `"soon (shoullov)"`).

## Not done here (by design)
No text was changed. Fixing 7,962 occurrences across 55 courses is real content-authoring
work (mostly "recast as a natural example," occasionally "needs its own bundled M-LEGO" per
the house-law doc) — a scoping/prioritization call for Tom, not a mechanical sweep. The new
`checkNoParentheses` gate in `services/course-builder/lib/validation.cjs` stops the count from
growing on any future submission; it does not touch existing rows.
