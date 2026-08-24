# pdc_for_eng — infinitival *fer* exposed at seed 26, 2026-08-11

One row written to `course_legos`. No seed text changed. No phrase changed. No audio generated. Nothing deleted.

Before-images for row-by-row rollback: `pdc-fer-lego-2026-08-11-before-images.json`

## The defect

`fer` is the Pennsylvania Dutch purpose/infinitive marker. Across the 63 built seeds it appears in
121 practice-phrase targets and in 82 seed sentences, earliest at seed 21. The only card carrying it
is seed 21 `S0021L01` "why" -> "fer was", whose component glosses it **"for"**.

Seed 26 is the first place it is used as an infinitive marker — `ich bin reddi fer geh`,
"I'm ready to go" — and seed 26's own seed sentence contains it
(`Ich gleich fiehle, as wann ich schier reddi waer fer geh.`), yet no LEGO of seed 26 covered it.
Verified: every `fer` at or before seed 26 outside seed 26 itself is part of `fer was`.

## The fix

| field | value |
|---|---|
| row | `course_legos` S0026L06 (id 6732e7c9-8b03-4859-852a-116451b0aa49) |
| seed | 26, `lego_index` 6 — **appended**, no index shifted, no `lego_id` renamed |
| type | A, `is_new` true, `components` [], `status` draft |
| known | `in order to` |
| target | `fer` |

### Why that gloss

`to` -> `zu` already exists (seed 2 component `S0002L02#comp`) and seed 2 is approved, so glossing
`fer` as "to" would be a hard ZUT breach against approved work. `for` -> `fer` already exists at
seed 21 and does not bridge "ready **to** go". `in order to` was unused course-wide and is exact for
a purpose infinitive. Estate precedent for teaching the particle as its own card: dan_for_eng seed 28,
"to" -> "at".

ZUT re-checked after the write: `in order to` maps to exactly one target; known-labels with more than
one target went 8 -> 6 over the same window (the two that cleared were the running build's, not mine).

## Counts

| | before | after |
|---|---|---|
| seed 26 LEGOs | 5 | 6 |
| seed 26 practice phrases | 49 | 49 |
| labels mapping to `fer` | `for` | `for`, `in order to` |

Doug's approval frontier at the moment of the write: seeds 1-6 approved, latest 2026-08-11T18:32Z.
Seed 26 was 20 seeds ahead. Build frontier at the same moment: highest decomposed seed 63; the
running builder is on seeds 64-668, so seed 26 was behind it and not being touched.

## Known caveats

- The new LEGO sits at index 6, i.e. **after** the seed-26 phrases that already use `fer`. Inserting
  at index 2 would have been pedagogically better but requires shifting `lego_index` on four LEGOs and
  ~35 phrase rows and renaming their `lego_id`s (a GENERATED column). Appending was chosen as the
  reversible option; re-ordering is a decomposition decision for Kai.
- It carries no practice phrases. `buildLegoCycles` still emits intro + debut for a phrase-less LEGO,
  so it reaches the learner, but it is not drilled. Adding drills means authoring Pennsylvania Dutch,
  which was out of scope.
- `course_round_index` holds **zero** rows for pdc_for_eng — the whole course, not just this row. It
  will need one refresh when the build finishes. Not refreshed here: it is estate-wide, would go stale
  again within minutes of the running build, and no pdc audio exists so nothing is learner-visible yet.

## Rollback

```sql
DELETE FROM course_legos WHERE course_code='pdc_for_eng' AND seed_number=26 AND lego_index=6;
```
