# Welsh North rebuild — phase 1 record

**2026-08-21.** Clone, quarantine, proofreading sheet, 40-seed pilot. Nothing in this phase edited the live course.

Prior scouting: `docs/cym-n-old-vs-canon-map-2026-08-21.md` (branch `docs/cym-n-old-vs-canon-2026-08-21`).

---

## What the course looks like now

| | live `cym_n_for_eng` | clone `cym_nnew_for_eng` |
|---|---|---|
| seeds with Welsh in them | 305 | **267** |
| empty canon English shells | 363 (seeds 306-668) | 363 (seeds 306-668) |
| seed rows in total | 668 | 630 |
| legos | 635 | **457** |
| practice phrases | 4,997 | **3,948** |
| rounds in the round index | 633 | **455** |
| status | released, public | draft, hidden |

The clone was made row for row — 668 seeds, 635 legos and 4,997 phrases copied — and then the tail was dropped, which is why the clone's numbers are smaller. 455 rounds is the number the scout predicted for the end of seed 267, so the kept range is intact.

Audio rides along **by reference**. The `*_audio_id` columns are uuids pointing at `course_audio` rows, and the clone's rows carry the same uuids. Nothing was generated, copied, re-rendered or deleted. 456 of the clone's 457 legos and all 3,948 of its phrases still have their Welsh audio attached, including the human recordings from Aran and Catrin Lliar. The learner-side audio route resolves clips **by uuid, not by course code** (`ssi-learning-app/api/_utils/audioAccess.ts`), so shared references play correctly.

One caveat for a later phase: `fetchRevisedAudioRefs` in that same file *does* filter `course_audio` by course code, and it only picks up clips whose `audio_revision` is above 1. On the clone that query returns nothing, so the clone would serve revision-1 refs where the live course serves a revision. Harmless while the clone is hidden; it needs settling before the clone ever goes near a learner.

## The course code

Tom asked for `cym_n_for_eng_new`. The database refuses it: `chk_course_code_format` requires `xxx[_variant]_for_yyy`, so the variant segment has to come *before* `_for_`, and it cannot itself contain an underscore. The clone is therefore **`cym_nnew_for_eng`**, display name "Welsh (North) (rebuild)". A draft course is cheap to rename if Tom wants a different one.

## The discarded tail

Seeds 268-305 removed from the clone: **38 seeds, 178 legos, 1,049 phrases**. Every row is in `docs/cym-n-discarded-tail-268-305-snapshot-2026-08-21.json` with all columns, so the discard is fully reversible.

Those 178 legos carried 14 USE phrases between them. That is the cliff Tom heard.

### *instead of* — the re-add turned out to be unnecessary

The brief said *instead of* is taught only in the discarded range (old seeds 284 and 299) and must be re-added. It is taught only there **in the old course**, but the canon teaches it too:

- canon 502 — "She almost got lost because she turned left instead of right." — the same sentence as old seed 284
- canon 523 — "Instead of giving an excuse."

So the canon append in phase 2 restores it naturally, and authoring a redundant extra seed for it now would guarantee a ZUT collision with the canon's own introduction of the same lego. Nothing was authored. **Phase 2 must make sure canon 502 or 523 actually debuts it** rather than assuming it is already known.

Worth carrying forward: the old course taught *instead of* twice with two different Welsh forms — `yn hytrach nag` at 284 and `yn hytrach na` at 299. That is the Welsh `na`/`nag` sandhi alternation, not two intentions, so it is one lego whose alternate form belongs inside an M-LEGO carrier, never two competing legos.

## The Cyrillic homoglyphs

Both defects were on the **Welsh side only**, and a sweep of every seed, lego and phrase in the clone found no others.

| lego | English | Welsh was | Welsh now |
|---|---|---|---|
| S0264L02 | problem | `probl` + U+0435 + `m` | `problem` |
| S0271L01 | a challenge | `h` + U+0435 + `r` | `her` |

S0264 is inside the kept range, so that fix lands and stays. S0271 was inside the discarded range and has gone with it — it was repaired first and then deleted, which is honest about the fact that no learner will ever see the repair.

**S0264L02 is still wrong on the live course**, deliberately: Tom's instruction is that the live course is not edited. It is a one-row, one-character fix whenever he wants it.

## The quarantine

`canonical_seed_translations` held 305 Welsh North rows and 334 Welsh South rows, all stamped in one batch on 2026-01-25 with no provenance. They are the old Welsh courses' sentences filed positionally under unrelated canon English. All 639 are now stamped in `source_course`:

- `QUARANTINE_misaligned_from_cym_n_for_eng_2026-08-21`
- `QUARANTINE_misaligned_from_cym_s_for_eng_2026-08-21`

Nothing was deleted. The Welsh text was verified byte-identical afterwards, and Spanish, Japanese, Dutch and Chinese were verified unchanged at 668 rows each. Clearing one column undoes the whole thing. Full snapshot in `docs/cym-canon-translations-quarantine-snapshot-2026-08-21.json`.

### The mark alone would not have quarantined anything

The two places that read this table — `services/course-builder/routes/seed-complete.cjs` and `services/course-builder/routes/translation.cjs` — select on `language_code` and ignore `source_course` completely. They pre-fill a brand-new course's seeds from whatever they find. Left alone, the next Welsh course anybody built would have been silently pre-filled with the junk, exactly as before, mark or no mark.

Both now skip `QUARANTINE_*` rows and log how many they skipped. The filter is applied in JavaScript rather than in the query on purpose: a `not like` filter also discards rows where `source_course` is NULL, and NULL is what 2,378 of the 2,675 legitimate rows carry, so the obvious one-line query filter would have quietly disabled canon reuse for Spanish, Japanese, Dutch and Chinese as well.

## Scripts

All three dry-ran before they wrote, all three snapshot before they touch anything, and the two that write to the clone assert the live course's row counts are unchanged at the end and throw if they are not.

- `tools/course-optimization/clone-cym-n-new-2026-08-21.cjs`
- `tools/course-optimization/discard-tail-cym-nnew-2026-08-21.cjs`
- `tools/course-optimization/quarantine-fake-welsh-canon-2026-08-21.cjs`

---

## The proofreading sheet

**https://watson-1.tail4968cb.ts.net/d/29f90769** — 401 sentences, canon seeds 268-668, in seed order, laid out to be read on a phone.

All ten copies of the canon Welsh were found and used (nine `*_for_cym` courses plus `cym_for_yor`), each verified at 668 seeds with non-empty text in range before being relied on.

**Only 4 disagreements fall inside 268-668**, not the 14 the scout counted across the whole 668. All four are the same thing: template sentences ("she speaks {target}") where each source course fills in its own target-language name — Sbaeneg, Almaeneg, Ffrangeg. **None of the ten gives the right fill for this course**, which needs *Saesneg*. That is a real gap the ten copies cannot resolve between them, so the sheet asks the native reader to supply it rather than offering a pick-one choice.

The six ZUT-collision seeds (464, 465, 466, 472, 474, 477) are shown in their own "likely drop" section and tagged again in the main list, since they duplicate English already taught at kept seeds 259, 260, 261, 264, 265 and 267.

## The 40-seed decomposition pilot

Sampling: every 10th canon seed from 272 to 662, stratified across the whole tail, then interleaved into two halves so the halves are directly comparable. Half A: https://watson-1.tail4968cb.ts.net/d/b412aec4 · Half B: https://watson-1.tail4968cb.ts.net/d/a12b09aa

| | half A | half B | **combined 40** |
|---|---|---|---|
| proposed legos | 77 | 73 | **150** |
| already taught by seeds 1-267 | 20 (26%) | 19 (26%) | **39 (26%)** |
| genuinely new | 57 | 54 | **111** |
| new legos per seed | 2.85 | 2.70 | **2.78** |
| fully covered seeds | 1 of 20 (5%) | 2 of 20 (10%) | **3 of 40 (7.5%)** |
| seeds with a known-side construction gap | 7 of 20 (35%) | 7 of 20 (35%) | **14 of 40 (35%)** |
| borderline judgement calls | 12 of 77 (16%) | 10 of 73 (14%) | **22 of 150 (15%)** |

The two halves were decomposed independently and landed within 0.15 of each other. That agreement is the main reason to trust the number.

### How far out the word-coverage guess was

The crude measure predicted **21% of canon seeds fully covered**. Measured: **7.5%**. It over-counted coverage by about **3x**, and the bias runs one way.

The dominant reason is that **a lego is a known-side intention bound to one target form, not a bag of words**. In half A, 23 of the 57 new legos — 40% — contain no new vocabulary at all: *dach chi angen*, *nos fory*, *y tro dwytha* are each built entirely from taught atoms and each still costs a lego row and its phrases. Word-coverage scores every one of them as covered. Second, word-coverage cannot see the known side at all — it is looking at the wrong language, so it is structurally blind to the 35% of seeds needing an English construction the kept range never debuted. There is one counterweight, and it is smaller: Welsh mutation and spelling drift make taught items look new (*broblem*/*problem*, *gwbod*/*gwybod*), which pushes the other way.

### What needs a ruling before phase 2

1. **The conditional stem.** Seeds 1-267 teach "would" on the **bydd-** stem (*byddai fo*, *bydden ni'n licio*, *byddet ti'n deud*). The canon tail uses **bas-** throughout (*basai hi*, *fasai fo*, *fasen ni*). Both are good northern Welsh, but one English "would" now maps to two Welsh stems course-wide. 4 of 20 seeds in half A — roughly 80 seeds of the tail. One ruling, not eighty seeds of hand-work.
2. **Does a lego bound inside a taught M-lego, or a different person-form of a taught verb, count as already taught?** Eight of half B's ten borderline calls hang on this one question, and it swings the whole build estimate by about ±11%.
3. **"there" — `yno` (kept S0123L02) or `yna` (canon 562)?** Hard collision, 10/10 agreement in the canon copies so it is a genuine variant rather than a typo.
4. **"everything" — `popeth` (kept S0171L01) or `bob dim` (canon 412)?** Hard collision, consolidate to one.

### What needs no ruling, only doing

- **Bare yes/no is never a lego.** Welsh response forms agree with the question's verb, so a bare "yes"/"no" gloss can never be ZUT-clean. The kept range already handles this correctly by only ever glossing bound forms ("yes, I'm ready", "no, we don't have"). The response particle is a construction-feature: absorbed into an M-lego with its carrier, never atomised.
- **Orthographic normalisation, before decomposition, not after.** Roughly 100-120 points across the tail where the canon batch spells a kept word differently — *Nest/wnest*, *dwytha/diwetha*, *gwbod/gwybod*, *nath/wnaeth*. None is a conceptual collision; every one breaks a string-level ZUT check at submission time and would show a learner two spellings of one word. Exactly what survives an unproofread machine batch. One mechanical pass beats seed-by-seed repair.
- **Fragment seeds cost more, not less.** Roughly 15% of the canon tail arrives as clause fragments, some lowercase and unpunctuated. USE phrases must be complete sentences, so a fragment seed cannot generate its own USE and the phrases have to be built by extension. Cheap-looking, dearer to author.

## The reuse factor — what the pilot number becomes once seeds can teach each other

Both pilot halves flagged the same limitation and both named closing it as the highest-value next measurement, so it was measured: canon seeds **300-339, contiguous**, decomposed in order, each seed drawing on the kept 457 **and** on everything introduced earlier in the run. Both counts taken on the same 40 seeds, which is what makes the ratio checkable.

| | |
|---|---|
| new legos by the pilot's method (each seed vs the kept 457 alone) | 119 — 2.98/seed |
| distinct new legos the run actually needs | **97 — 2.43/seed** |
| **reuse factor** | **0.815** |
| of the 97 — genuinely new vocabulary | 39 (0.98/seed) |
| of the 97 — recombinant rows (new row, no new vocabulary) | 58 (1.45/seed) |

**The build is about 18.5% smaller than the upper bound.** For the 316 new-content canon seeds: **roughly 750 new legos**, not the ~1,340 the raw pilot rate implied. At the 4 BUILD + 5 USE floor that is **roughly 6,700 new phrases**.

Of those ~750, only about **310 need real vocabulary and translation-choice work**. The other **440 are recombinant** — rows like `dydy hi ddim isio` or `bod o angen`, assembled entirely from atoms already taught. They still cost a row and still need their nine phrases, but no lexical research, no synonym-choice pass, no ZUT adjudication against unfamiliar words. That is the cheap 58% of the build.

**Where the reuse comes from.** It is not spread evenly — it concentrates in frame carriers the canon hits repeatedly. The conditional `y basai hi'n medru` debuts at seed 310 and is reused by 312, 314, 316, 317 and 318: six charges for one lego under the stratified method. The canon tail is built as paradigm drills, one modal worked through say/think/question/yes/no across eight or ten consecutive seeds. That structure is exactly what a stratified sample destroys.

**Construction cost compresses harder still — to 0.53.** A carrier debuted once serves every later seed needing the same construction. About 118 of the 316 seeds will touch a known-side gap, but they need on the order of **63 carriers**, not 118. And each carrier is a design decision rather than rows of typing.

**Which way the error runs.** A 40-seed run cannot see reuse at range 40+, and carriers debuted in the `could` block also serve the `can` block later. So 0.815 is more likely too high than too low, and **750 is more likely an overestimate than an underestimate**. The counterweight: the 39 new-vocabulary legos are close to irreducible — all the compression came out of the recombinant bucket.

### The ruling this rests on

The measurement applied one rule, permissive on vocabulary and strict on rows: *a form appearing inside an already-taught M-lego, or a different person-form of a taught verb, counts as already-taught vocabulary — but if it needs its own row to be produced, that row is counted, classified recombinant.* It decided 31 of 97 calls, all of them landing in the recombinant bucket.

If Tom rules the other way, new vocabulary roughly doubles (39 → 70 on the sample) — **but the reuse factor and the total row count do not move at all**, because the row is counted either way. So the ~750 figure is robust to that ruling; only the split between "needs translation work" and "needs phrases only" moves.

### Explicit gap in this measurement

The kept inventory supplied was legos only — 457 rows, no component rows. The "bound inside a taught M-lego" test was therefore applied by reading each M-lego's target text rather than an authoritative component list. If those components exist for seeds 1-267, a handful of the 31 bound-form calls could flip in either direction. Phrase-authoring effort was also not sampled: the ~6,700 is floor arithmetic, not a measured cost, and it is the larger share of the real spend.
