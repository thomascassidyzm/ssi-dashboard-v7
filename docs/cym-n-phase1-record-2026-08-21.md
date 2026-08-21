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
