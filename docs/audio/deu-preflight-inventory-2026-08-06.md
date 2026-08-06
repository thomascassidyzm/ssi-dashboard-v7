# deu_for_eng preflight inventory — seeds 1-300

**2026-08-06. READ-ONLY.** Nothing was written to the DB, S3, or any generated asset. No TTS. No
repairs. This is the fact sheet that gates the overnight `audio-truncation-detector.cjs` run.

Full data (including the exact clip-id list the scan will consume): `docs/audio/deu-preflight-inventory-2026-08-06.json`

---

## The four numbers

| | Count |
|---|---|
| **1. Live/shipped clips reachable from seeds 1-300** | **18,163** |
| **2. Unlinked audio (do-not-spend list)** | **18** |
| **3. Absent audio (no clip anywhere)** | **9** |
| **4. S3 spot-check** | **220 sampled, 0 missing, 0 errors** |

## 1. Total live inventory, seeds 1-300

18,163 distinct `course_audio` rows, reachable exactly the way
`services/audio-repair-core.cjs`'s `seedScopedAudioIds()` defines reachability: seed
known/target1/target2, LEGO known/target1/target2, LEGO presentation (via `lego_introductions`,
scoped by `lego_id` to LEGOs in seed range), and practice-phrase known/target1/target2 (all
`phrase_role`s — build/use/component — matching the same traversal the repair core uses; it does
not discriminate by role).

| role | count |
|---|---|
| known | 5,859 |
| target1 | 5,853 |
| target2 | 5,855 |
| presentation | 596 |
| **total** | **18,163** |

By voice_id — note two naming conventions coexist for the same voices (`eve` vs `xai_eve`, `ara` vs
`xai_ara`, `leo` vs `xai_leo`); not investigated further, flagged as an observation:

| role::voice_id | count |
|---|---|
| known::eve | 5,801 |
| known::xai_eve | 58 |
| target1::ara | 5,792 |
| target1::xai_ara | 61 |
| target2::leo | 5,793 |
| target2::xai_leo | 62 |
| presentation::eve | 592 |
| presentation::xai_eve | 4 |

Zero holder-column values were non-uuid, and zero pointed at an id with no live `course_audio` row
(no dangling refs in the reachable set). The exact id list (all 18,163) is in the JSON's
`inventory.clip_ids`.

## 2. Unlinked audio — the do-not-spend list

**18 slots**, all in `course_seeds` (none in `course_legos` or `course_practice_phrases`): a NULL
holder column whose text matches an already-existing, alive `course_audio` row elsewhere in the
course. 12 strict-key matches, 6 loose-key (trailing-`?`) matches. Full detail, including the exact
`candidate_audio_id` and `s3_key` to bind, is in the JSON's `unlinked_audio.items`. Affected seeds:
21, 40, 67, 75, 80, 162, 169, 252, 255, 284, 287 — 15 target-side clips (German, both voices) + 2
known-side clips. Every one of these is a free re-link if the overnight job needs it — **do not
regenerate these**.

Matching method mirrors `tools/audio-link-reconcile.cjs`: both keys (`normalizeForAudio` /
strict, and strict-plus-trailing-punctuation-stripped / loose) computed from the **raw** text on
both sides, never from the stored `text_normalized` column, per the documented disagreement between
the DB trigger's normaliser and the JS convention (`services/shared/text-normalize.cjs`).

## 3. Absent audio — slots with no audio id at all

**9 slots**, all genuinely absent (checked against strict AND loose keys, whole-course, and found
nothing):

- 1 seed target1 (seed 65)
- 6 practice-phrase known-side clips (seeds 88, 186, 214×2, 292)
- 2 practice-phrase target-side clips (seeds 214, 292)

Full list in the JSON's `absent_audio_full`. All 9 are listed individually there with their text.

**LEGO introduction clips.** The prior finding on `main` — "167 of deu_for_eng's 1,570 LEGOs have no
introduction clip" — is **course-wide (all 668 seeds), not scoped to 1-300**. Within seeds 1-300
specifically: **21 of 617 LEGOs (3.4%) are missing intro audio** — 11 have no `lego_introductions`
row at all, 10 have a row but no `presentation_audio_id`. Affected seeds: 68, 89, 98, 106, 123, 138,
186, 189, 201, 213, 241. The estate-wide census (`docs/audio/audio-census.json`,
`legos_broken: 174` / `broken_intro_only: 174` for `deu_for_eng`) confirms the bulk of that 167-174
figure sits in seeds 301-668, outside tonight's MVP scope — **correcting** the prior finding rather
than confirming it as a seed-1-300 number.

Every LEGO known/target1/target2 slot in seeds 1-300 (617 LEGOs × 3 = 1,851 slots) is fully linked —
zero unlinked, zero absent on the LEGO core triple.

## 4. S3 spot-check

**220 objects HEAD-checked** (stratified sample, proportional to each role's share of the 18,163
live clips: target1, target2, known, presentation all represented in roughly their live-population
ratio). **0 missing (404), 0 errors.** Sample method and per-item results are in the JSON's
`s3_spot_check`. This is a sample, not a census — 220 of 18,163 (1.2%) — stated explicitly per the
box-load instruction to spot-check rather than sweep every object.

---

## Gap — stated honestly

The S3 spot-check is a 1.2% sample, not a full census; a rare pocket of storage-broken objects
outside the sample would not surface here. Everything else (the reachable-clip count, the unlinked
list, the absent list, the intro-clip count) is an exact whole-scope query against the live
database, not a sample.

---

**Landing line.** Commits are on `docs/deu-preflight-2026-08-06` (branched off `origin/main`).
Not merged — pushed only. Not deployed anywhere; this is a read-only inventory doc, nothing to
deploy.
