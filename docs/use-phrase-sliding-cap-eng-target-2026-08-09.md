# USE-phrase sliding-scale word cap — eng_for_zho, eng_for_ara, eng_for_spa

Follow-on from the [English-as-TARGET flat-cap analysis](https://watson-1.tail4968cb.ts.net/d/102e5005) (8-word flat cap: eng_for_zho 28.75%, eng_for_ara 29.27%, eng_for_spa 34.21% culled; eng_for_hin left out as near-baseline).

This run tests a **sliding-scale cap** instead of a flat one, same three courses, counting words on `target_text` (English, the target side of these courses). Read-only, live DB, `course_practice_phrases` joined to `course_round_index` for round number, USE phrase-type only (`phrase_role='use'`).

Bands:
- **Rounds 1-20**: 8-word cap
- **Rounds 20-100**: 10-word cap
- **Rounds 101+**: no cap (not culled)

Word count = `target_text` split on whitespace.

## Results

| Course | Band | Excluded / Total | % culled |
|---|---|---|---|
| eng_for_zho | 1-20 (cap 8) | 23 / 80 | 28.75% |
| eng_for_zho | 20-100 (cap 10) | 31 / 497 | 6.24% |
| eng_for_zho | 101+ (uncapped) | — / 2006 | n/a — no cull |
| eng_for_ara | 1-20 (cap 8) | 24 / 82 | 29.27% |
| eng_for_ara | 20-100 (cap 10) | 43 / 400 | 10.75% |
| eng_for_ara | 101+ (uncapped) | — / 2455 | n/a — no cull |
| eng_for_spa | 1-20 (cap 8) | 26 / 76 | 34.21% |
| eng_for_spa | 20-100 (cap 10) | 51 / 409 | 12.47% |
| eng_for_spa | 101+ (uncapped) | — / 2500 | n/a — no cull |

The 1-20 band figures reproduce the prior flat-cap run exactly (same query scope, same cap), confirming continuity between the two analyses.

No further analysis performed — data only, as requested.
