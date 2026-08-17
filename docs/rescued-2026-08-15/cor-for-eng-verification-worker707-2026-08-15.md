## Verification Report: cor_for_eng seeds 1–25 (73 LEGOs, 642 phrases)

**I am not a Cornish speaker.** Findings requiring native-speaker judgment are listed separately at the end. This was a READ-ONLY probe — no writes, no audio, no commits.

**Row counts verified against spec before analysis:** 73 legos ✓, 642 phrases ✓ (200 build, 330 use, 112 component) ✓. Paginated all three tables with `.range()`; no truncation.

### The six required counts

1. **Rotation/swap hunt: 0.** No exact known/target collisions across sibling LEGOs in any seed. As a second, independent test, I checked whether each seed's LEGOs preserve consistent relative ordering between where they sit in the known-side sentence vs. the target-side sentence — a rotation would show up as an order flip. **0 seeds** show an order mismatch.

2. **Self-contradiction: 5** target strings each map to 2 distinct known glosses, identically at both LEGO/component level and phrase level (same 5 underlying forms, not independent errors): `a vynn`→want/wants, `a wra`→am going to/is going to, `a`→of the/do, `a gews`→speak/who speak, `ow`→in the middle of/my own. These all look like genuine Cornish grammatical homographs (short particles with multiple functions), not slicing errors — but I can't confirm that without a Cornish speaker. 0 known→multi-target contradictions in either direction.

3. **Missing LEGO: 0.** Every Cornish token in every seed's sentence is taught by a LEGO/component at or before that seed's end, for all 25 seeds. Reverse (English-side) check: 3 minor gaps — "speaking"/"talking" gerund forms appear in seeds 5, 19, 23 without a distinct -ing component gloss. Likely a non-issue (English morphology isn't ZUT-gated the way target vocabulary is) but noting per the honesty rule.

4. **Containment: 6 violations, all false positives on inspection.** All 6 are known-side only (target side is always intact) and all follow the same pattern: the LEGO's citation form is an infinitive ("to remember the whole sentence") while the practice phrase naturally renders it as a modal ("I'm not sure if I can remember the whole sentence") — required by English grammar, not a slicing defect. Checked each of the 6 individually against its LEGO's target text; target correspondence holds in every case.

5. **Untaught-word rule: 0.** Every Cornish token in every one of the 642 phrases is taught by a LEGO/component at or before that phrase's own (seed_number, lego_index) — no forward-looking references to a later sibling. This is the strongest direct test for the off-by-one slicing defect, and it came back clean.

6. **Cross-store: 0 disagreements** across all 112 components — `course_legos.components[i]` matches its materialised `course_practice_phrases` row on both known and target text in every case.

### Mutation caveat applied
Where target tokens differed from a naive expectation I checked for k/g, m/v, t/d, p/b, gw/w, d/dh mutation patterns before concluding a mismatch; none of the 5 self-contradictions or the containment cases turned out to be mutation-related — they're either genuine polysemy or English-side grammatical rewording.

### Bottom line
No evidence of the hunted defect (off-by-one slicing / card rotation). Checks 3, 5, and 6 — the three most direct detectors of "one side sliced from a different word" — are all clean at 0. Checks 1, 2, and 4 surfaced items but none reproduce the swapped/rotated pattern described; they're either exact-zero or explainable by ordinary grammar.

### For a Cornish speaker (numbered list)
1. Seed 10, LEGO `S0010L03`: taught citation form is `an lavar dien` ("the whole sentence"), but the seed sentence uses `a'n lavar dien` (with apostrophe) — treating the apostrophe as a letter per the normalisation rule, these are different strings. Is `a'n` a legitimate contraction of `a` ("of") + `an` ("the") triggered by the preceding verb `perthi kov a` ("remember of"), or is the LEGO's target form wrong?
2. The 5 self-contradiction items above (`a vynn`, `a wra`, `a`, `a gews`, `ow` each glossed two ways) — confirm these are genuine Cornish grammatical homographs/polysemous particles, not evidence of two different source words being conflated under one LEGO.
3. Seed 21 `S0021L01` known text "you are learning" vs. seed's actual "Why are you learning her name?" (question inversion) and seed 22 `S0022L02` "me wanting" vs. "I want to meet..." — confirm these citation-form glosses are intentional teaching simplifications, not evidence the LEGO was cut from the wrong span.

**No commits.** No files changed outside `.a108-cor/scratch-verify2/` (scratch analysis scripts + JSON, not committed).

Landing line: no commits.
