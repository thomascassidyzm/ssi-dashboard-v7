# Deliverable 1 — Group 2 pod-0 → pod-0-unrecorded dry-run migration report

*2026-08-23. Part 3 of job #137 (pod1-progress-mapping-audit). DRY RUN ONLY — `pod-state-migrate.cjs`
run without `--apply` for all 21 courses; nothing written to any live table. Logs at
`docs/pods/a107-prospective/<course>-dryrun-log.json`.*

Group 2 = courses still serving the OLD 142-line `pod-0`, with a 231/232-line replacement staged
and held under slug `pod-0-unrecorded`. Command run per course:

```
node tools/pods/pod-state-migrate.cjs --course=<course> --from=pod-0 --to=pod-0-unrecorded \
     --log=docs/pods/a107-prospective/<course>-dryrun-log.json
```

## Table

"Arrive unseen" is content-level: sentences in the new 231/232-line canon that have no matching
text anywhere in the old 142-line canon — genuinely new material every learner (with or without
existing progress) will meet unseen, exactly as the protocol intends. "Rejected by position bound"
counts drop actions whose reason was `relocated_to_different_scene` or `moved_N_places_within_scene`
— i.e. the text exists in the new canon but the tool refused to credit it because it landed too far
from where the learner heard it. This is different from "removed" (reason `text_absent_from_new_canon`
— the sentence is simply gone from the new canon, not relocated).

| course | learner rows in scope | exposures in scope | exposures survive (carry+merge+keep) | rows dropped (removed) | content arrives unseen | rejected by position bound |
|---|---:|---:|---:|---:|---:|---:|
| bul_for_eng | 0 | 0 | 0 | 0 | 119 | 0 |
| cat_for_eng | 11 | 16 | 11 | 5 | 126 | 0 |
| dan_for_eng | 6 | 15 | 15 | 0 | 138 | 0 |
| ell_for_eng | 32 | 161 | 160 | 1 | 122 | 0 |
| est_for_eng | 0 | 0 | 0 | 0 | 119 | 0 |
| fas_for_eng | 0 | 0 | 0 | 0 | 128 | 0 |
| gle_for_eng | 29 | 94 | 51 | 13 | 127 | 0 |
| heb_for_eng | 7 | 28 | 28 | 0 | 134 | 0 |
| hin_for_eng | 2 | 2 | 1 | 1 | 140 | 0 |
| hye_for_eng | 8 | 11 | 6 | 4 | 138 | 0 |
| isl_for_eng | 90 | 1977 | 941 | 38 | 144 | 0 |
| lav_for_eng | 19 | 49 | 45 | 2 | 110 | 0 |
| lit_for_eng | 0 | 0 | 0 | 0 | 119 | 0 |
| nep_for_eng | 0 | 0 | 0 | 0 | 105 | 0 |
| nld_for_eng | 13 | 90 | 68 | 4 | 125 | 0 |
| nor_for_eng | 3 | 3 | 3 | 0 | 119 | 0 |
| pol_for_eng | 0 | 0 | 0 | 0 | 135 | 0 |
| swa_for_eng | 296 | 506 | 364 | 94 | 120 | 0 |
| tha_for_eng | 3 | 3 | 3 | 0 | 111 | 0 |
| tur_for_eng | 0 | 0 | 0 | 0 | 127 | 0 |
| ukr_for_eng | 22 | 157 | 104 | 6 | 118 | 0 |

Zero learner rows in scope for bul, est, fas, lit, nep, pol, tur — nobody has listened to Pod 1 on
those seven courses yet, so those flips carry no progress risk at all. The other 14 have real
learner rows; isl_for_eng and swa_for_eng carry the most (90 rows/1,977 exposures and 296 rows/506
exposures respectively).

## Rejected-by-position-bound matches, named individually

**None.** Grepped all 21 dry-run logs for `relocated_to_different_scene` and any
`moved_N_places_within_scene` reason: zero occurrences across the estate's Group 2 courses. Every
drop in every course above is reason `text_absent_from_new_canon` — the sentence was genuinely
removed from the new 231/232-line canon, not relocated somewhere the position bound then refused.
There is no case in Group 2 today where a learner's progress is lost specifically because their
sentence moved too far within (or was corresponded to the wrong) scene — the only loss mechanism
active here is straightforward content removal, which the protocol explicitly treats as "no
penalty" (rule 5).

(For contrast: the doctrine's own worked example of a position-bound rejection — the "100,000. 60.
70. 1 o'clock. 11 o'clock." numbers-drill line — occurred in five *other* estate courses, not in
this Group 2 set; see `docs/pods/pod-migration-protocol.md`.)

## What this means for the flip

For every one of the 21 Group 2 courses, a `pod-switchover.cjs --course=<c>` flip from `pod-0` to
`pod-0-unrecorded` would, under this protocol, credit every currently-recorded exposure that has a
survived, correctly-located sentence, drop only the ones whose old sentence is genuinely gone (no
penalty by design), and introduce every new sentence unseen. No learner in this set is at risk of
having progress silently mis-mapped to the wrong sentence via the position-bound path, because the
bound never fired.
