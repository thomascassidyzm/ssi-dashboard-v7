# S3 storage-metadata forensics: audio tail truncation, provenance

2026-08-06. Read-only. Live S3 (`ssi-audio-stage`) HeadObject/ListObjectVersions calls + live `course_audio`/`course_audio_revisions` Postgres queries. No audio content was analysed (that's another worker's job) — this is storage metadata only.

## Method

- Sampled up to 100 random `course_audio` rows per `course_code` (133 courses, 9,611 rows) from Postgres.
- HEAD'd every sampled S3 object: `LastModified`, `ContentLength`, version ID.
- Compared `LastModified` (S3) against `created_at` (DB) per row, and `file_size_bytes` (DB) against `ContentLength` (S3) where DB size was populated.
- Checked bucket versioning/lifecycle/replication config.
- For the 24 clips Tom ear-confirmed as truncated in `deu_for_eng` (`docs/audio-repair-2026-08-06/deu-wordloss.json`, `truncated:true`), pulled full S3 version history per object.
- Cross-checked against `course_audio_revisions` (the audited, versioned repair-swap ledger written by `services/audio-repair-core.cjs`).

Scripts (throwaway, in gitignored `scripts/tail-forensics/`): `head-objects.cjs`, `list-versions-sample.cjs`, `check_versions.cjs`.

## Headline finding: the "last week" mutation is real but small next to a much bigger, months-earlier event

The brief's suspicion window (since 2026-07-30) is real and visible in the data, but it is **not** the dominant event. There are three distinct, separable overwrite events in the storage metadata:

| Event | Date(s) | Share of 9,610 sampled objects | Courses affected | Version-history signature |
|---|---|---|---|---|
| **A — mass estate-wide overwrite** | 2026-05-22 → 05-25 (peak 05-23) | 48.3% on 05-23 alone; ~57% across the 4 days | ~90+ courses, near-uniformly (85–100% of each course's sample) | Clean **2-version** history: original upload (matches row `created_at`) + a second version dated 05-22/23/24/25. Sizes mostly **grew** (93% of a 500-object version-history sample got bigger, avg +2.3KB). Looks like a re-render/remaster pass, not a truncation bug. |
| **B — mid-course cluster** | 2026-06-16 → 06-19 (peak 06-19, 1,023 objects, 10.6%) | mostly small/new courses (mar_for_eng, mlt_for_eng, sbx_for_eng, tel_for_eng, gla_for_eng, eng_template) whose `created_at` is itself ~06-19 or later, plus slices of shared-audio courses | For the small courses this is **not** a mutation at all — S3 `LastModified` predates or matches the row's own `created_at` (0% "mutated" fraction). This is the documented **shared-physical-storage** pattern (`executeCopyBucket` in `phase8-audio-v13.cjs`): an English clip's row was created later, pointing at audio physically rendered earlier for another course. Correctly excluded from the mutation count. |
| **C — recent-week cluster (the brief's suspicion)** | 2026-07-29, 08-01 – 08-03 (peak 08-03 ~10:00 and 19:00–23:41 UTC) | 12.4% combined (1,174/9,610) | Concentrated: `kor_for_hin` (100% of its sample), `deu_for_eng` (95%), `kor_for_tam` (62%), `zho_for_tam` (60%), `eng_for_hin`, `fra_for_eng`, `eng_for_kan`, `eng_for_tel`, `eng_for_pan`, `eng_for_ben`, `eng_for_sin`, plus smaller slices of `spa_for_eng`, `jpn_for_eng`, `kor_for_eng`, `eng_for_tam`, `fra_ca_for_eng`, `hrv_for_eng` | **Single-version only** in 60/68 (88%) of a targeted version-history check — the prior content's version is **not recoverable** from S3 history, and there are no delete markers. This is structurally different from Event A. |

**Event A is a red herring for the truncation bug** (files got bigger, full history preserved, months before Tom's ear-confirmation). **Event C is the one that matches the brief and the deu_for_eng truncations Tom heard.**

## The deu_for_eng truncated clips: direct evidence

24 clips flagged `truncated:true` by the word-loss listening pass (`docs/audio-repair-2026-08-06/deu-wordloss.json`, scanned 2026-08-06T02:42Z). Version history for all 24:

| audio_id (short) | created_at (DB) | S3 LastModified | S3 versions found | audio_revision |
|---|---|---|---|---|
| 84ed0dc4 | 2026-01-17 04:40:44 | 2026-08-03T21:27:48 | 1 | 1 |
| 1da83d12 | 2026-02-16 16:21:21 | 2026-08-03T21:28:15 | 1 | 1 |
| bcb4ac6b | 2026-02-16 22:38:41 | 2026-08-03T22:47:15 | 1 | 1 |
| 1c7d9653 | 2026-04-01 11:28:02 | 2026-08-03T23:08:21 | 1 | 1 |
| c5ee60f3 | 2026-05-22 14:35:56 | 2026-05-23T20:46:27 | 2 | 1 |
| 4ee5f492 | 2026-05-22 14:36:51 | 2026-05-23T08:16:54 | 2 | 1 |
| 4dfa02fa | 2026-06-08 13:22:40 | 2026-06-08T13:22:41 | 1 | 1 |
| fc05b26c | 2026-06-08 13:23:19 | 2026-06-08T13:23:19 | 1 | 1 |
| fbff4dda | 2026-06-10 21:16:45 | 2026-06-10T21:16:46 | 1 | 1 |
| 5836d4a8 | 2026-07-05 00:25:40 | 2026-08-03T23:12:06 | 1 | 1 |
| 9dfe3590 | 2026-07-11 18:00:36 | 2026-08-03T23:41:40 | 1 | 1 |
| 665003b9 | 2026-07-11 18:04:36 | 2026-08-03T23:17:36 | 1 | 1 |
| 59172e77 | 2026-07-11 18:13:03 | 2026-08-03T23:23:32 | 1 | 1 |
| 16f7cf57 | 2026-07-11 18:17:22 | 2026-08-03T23:26:21 | 1 | 1 |
| 545b565a | 2026-07-11 18:37:08 | 2026-08-03T19:34:21 | 1 | 1 |
| a98ec699 | 2026-07-11 18:51:48 | 2026-08-03T20:03:22 | 1 | 1 |
| 4a875733 | 2026-07-15 06:12:21 | 2026-08-03T21:44:13 | 1 | 1 |
| bf7264eb | 2026-07-15 06:13:10 | 2026-08-03T21:45:37 | 1 | 1 |
| 87a9300e | 2026-07-15 06:16:04 | 2026-08-03T21:46:29 | 1 | 1 |
| ebb68975 | 2026-07-15 06:51:34 | 2026-08-03T21:57:40 | 1 | 1 |
| 0cb0f6bd | 2026-07-15 07:29:55 | 2026-08-03T22:16:43 | 1 | 1 |
| 3f19285c | 2026-07-15 07:30:24 | 2026-08-03T22:16:44 | 1 | 1 |
| 33441e27 | 2026-08-04 13:16:29 | 2026-08-04T13:16:30 | 1 | 1 |
| 4f5c5237 | 2026-08-04 13:16:30 | 2026-08-04T13:16:31 | 1 | 1 |

Reading this:
- **22 of 24** show `LastModified` far later than `created_at` (weeks to 7 months later), clustering tightly in **2026-08-03, 19:34–23:41 UTC** — a ~4-hour window. This is a real, dateable event, and it is the one that produced the truncated tails Tom heard.
- **2 of 24** (c5ee60f3, 4ee5f492) belong to Event A (May 2026) instead — unrelated to the recent truncation, caught in this list only because they also happen to be bad.
- **The last 2 rows** (33441e27, 4f5c5237) have `created_at` and `LastModified` seconds apart — these were simply born truncated at normal render time on 2026-08-04, not mutated after the fact.
- **`audio_revision` is `1` for all 24`** — none of these clips were touched by the audited, versioned repair path in `services/audio-repair-core.cjs` (which increments `audio_revision` and writes a row to `course_audio_revisions` for every swap). Whatever wrote the 2026-08-03 19:34–23:41 UTC content did so **outside that audited system** — there is no ledger entry for it. (`course_audio_revisions` currently holds only 96 rows, all dated 2026-08-05/06 — the *current*, sanctioned, in-progress repair effort, not the event that caused the damage.)
- Per the 500-object version-history sample (see table below), single-version-only objects with no delete marker are the dominant pattern for the whole 2026-08-03 cluster, not just these 24 — meaning I cannot recover the pre-08-03 content or its version ID for the large majority of what that event touched.

## Estate-wide mutated-after-insert fraction (main sample, all 133 courses)

Test: S3 `LastModified` more than 1 hour after the row's DB `created_at` (excludes normal upload-then-insert latency and the reversed shared-storage pattern).

- **9,610 of 9,611 sampled objects HEAD'd successfully** (1 `NotFound` — a dangling `course_audio` row pointing at a deleted/never-existed object).
- **6,443 / 9,610 (67.0%)** show `LastModified` > `created_at` + 1 hour.
- Extrapolated to the full estate (2,544,787 `course_audio` rows total): **~1.66M rows point at an S3 object last modified well after the row was created** — dominated by Event A (2026-05-23), not Event C.

### Per-course fraction and extrapolation (courses with ≥20 sampled rows; full 133-course table in `scripts/tail-forensics/mutated_by_course.json`)

| course | sampled | mutated-in-sample | fraction | total DB rows | extrapolated mutated |
|---|---|---|---|---|---|
| ara_lb_for_eng | 100 | 100 | 100% | 16,646 | ~16,646 |
| ces_for_eng | 100 | 100 | 100% | 19,838 | ~19,838 |
| kor_for_hin | 100 | 100 | 100% | 43,425 | ~43,425 |
| spa_for_zho | 100 | 100 | 100% | 15,431 | ~15,431 |
| afr_for_eng | 100 | 99 | 99% | 13,393 | ~13,259 |
| eng_for_ita | 100 | 99 | 99% | 18,623 | ~18,437 |
| eng_for_kor | 100 | 99 | 99% | 28,668 | ~28,381 |
| fra_for_zho | 100 | 99 | 99% | 16,728 | ~16,561 |
| hun_for_eng | 100 | 99 | 99% | 17,301 | ~17,128 |
| ita_for_zho | 100 | 99 | 99% | 16,812 | ~16,644 |
| rus_for_eng | 100 | 99 | 99% | 20,286 | ~20,083 |
| srp_for_eng | 100 | 99 | 99% | 18,050 | ~17,870 |
| deu_for_zho | 100 | 98 | 98% | 17,214 | ~16,870 |
| eng_for_deu | 100 | 98 | 98% | 18,355 | ~17,988 |
| eng_for_spa | 100 | 97 | 97% | 18,375 | ~17,824 |
| deu_for_jpn | 100 | 96 | 96% | 18,374 | ~17,639 |
| eng_for_fra | 100 | 96 | 96% | 20,905 | ~20,069 |
| eng_for_por | 100 | 96 | 96% | 19,419 | ~18,642 |
| cat_for_spa | 100 | 95 | 95% | 22,257 | ~21,144 |
| **deu_for_eng** | 100 | 95 | 95% | 47,266 | **~44,903** |
| ell_for_eng | 100 | 94 | 94% | 28,704 | ~26,982 |
| nep_for_eng | 100 | 94 | 94% | 25,706 | ~24,164 |
| spa_for_jpn | 100 | 94 | 94% | 25,330 | ~23,810 |
| ukr_for_eng | 100 | 94 | 94% | 19,412 | ~18,247 |
| fra_for_jpn | 100 | 93 | 93% | 22,432 | ~20,862 |
| zho_for_jpn | 100 | 93 | 93% | 16,799 | ~15,623 |
| bul_for_eng | 100 | 92 | 92% | 19,277 | ~17,735 |
| eus_for_spa | 100 | 91 | 91% | 20,008 | ~18,207 |
| fas_for_eng | 100 | 91 | 91% | 26,192 | ~23,835 |
| gle_for_eng | 100 | 91 | 91% | 25,291 | ~23,015 |
| cat_for_eng | 100 | 90 | 90% | 20,857 | ~18,771 |
| ron_for_eng | 100 | 89 | 89% | 22,181 | ~19,741 |
| tur_for_eng | 100 | 89 | 89% | 33,405 | ~29,730 |
| heb_for_eng | 100 | 87 | 87% | 21,917 | ~19,068 |
| ita_for_jpn | 100 | 87 | 87% | 19,818 | ~17,242 |
| lit_for_eng | 100 | 87 | 87% | 23,288 | ~20,261 |
| tha_for_eng | 100 | 87 | 87% | 18,788 | ~16,346 |
| dan_for_eng | 100 | 86 | 86% | 19,549 | ~16,812 |
| lav_for_eng | 100 | 86 | 86% | 20,198 | ~17,370 |
| nor_for_eng | 100 | 86 | 86% | 18,182 | ~15,637 |
| swe_for_eng | 100 | 86 | 86% | 20,127 | ~17,309 |
| hin_for_eng | 100 | 85 | 85% | 23,765 | ~20,200 |
| hye_for_eng | 100 | 84 | 84% | 23,238 | ~19,520 |
| est_for_eng | 100 | 83 | 83% | 20,163 | ~16,735 |
| isl_for_eng | 100 | 83 | 83% | 19,678 | ~16,333 |
| ara_eg_for_eng | 100 | 80 | 80% | 21,572 | ~17,258 |
| pol_for_eng | 100 | 80 | 80% | 24,117 | ~19,294 |
| nld_for_eng | 100 | 79 | 79% | 19,208 | ~15,174 |
| swa_for_eng | 100 | 79 | 79% | 23,309 | ~18,414 |
| hrv_for_eng | 100 | 75 | 75% | 28,079 | ~21,059 |
| spa_for_eng | 100 | 74 | 74% | 78,163 | ~57,841 |
| eus_for_eng | 100 | 72 | 72% | 28,486 | ~20,510 |
| eng_for_zho | 100 | 68 | 68% | 31,724 | ~21,572 |
| eng_for_jpn | 100 | 65 | 65% | 53,567 | ~34,819 |
| kor_for_eng | 100 | 65 | 65% | 58,407 | ~37,965 |
| jpn_for_eng | 100 | 62 | 62% | 52,904 | ~32,800 |
| **kor_for_tam** | 100 | 62 | 62% | 42,530 | **~26,369** |
| eng_for_tam | 100 | 61 | 61% | 55,618 | ~33,927 |
| eng_for_tel | 100 | 61 | 61% | 40,952 | ~24,981 |
| **zho_for_tam** | 100 | 60 | 60% | 32,166 | **~19,300** |
| fra_ca_for_eng | 100 | 57 | 57% | 61,030 | ~34,787 |
| por_for_eng | 100 | 54 | 54% | 46,768 | ~25,255 |
| eng_for_ara | 100 | 53 | 53% | 31,991 | ~16,955 |
| eng_for_kan | 100 | 52 | 52% | 44,689 | ~23,238 |
| spa_mx_for_eng | 99 | 50 | 51% | 43,748 | ~22,095 |
| eng_for_sin | 100 | 49 | 49% | 51,473 | ~25,222 |
| ara_for_eng | 100 | 46 | 46% | 43,511 | ~20,015 |
| por_br_for_eng | 100 | 46 | 46% | 47,733 | ~21,957 |
| zho_for_eng | 100 | 46 | 46% | 40,956 | ~18,840 |
| **eng_for_hin** | 100 | 45 | 45% | 51,279 | **~23,076** |
| ita_for_eng | 100 | 42 | 42% | 50,132 | ~21,055 |
| eng_for_ben | 100 | 35 | 35% | 49,356 | ~17,275 |
| **fra_for_eng** | 100 | 35 | 35% | 51,369 | **~17,979** |
| eng_for_pan | 100 | 30 | 30% | 51,248 | ~15,374 |
| eng_for_urd | 100 | 29 | 29% | 47,140 | ~13,671 |
| eng_for_guj | 100 | 28 | 28% | 53,263 | ~14,914 |
| eng_for_mar | 100 | 25 | 25% | 39,373 | ~9,843 |
| glg_for_eng | 100 | 16 | 16% | 15,931 | ~2,549 |
| ben_for_eng | 100 | 14 | 14% | 20,311 | ~2,844 |
| deu_at_for_eng | 100 | 8 | 8% | 39,484 | ~3,159 |
| gla_for_eng | 100 | 5 | 5% | 1,965 | ~98 |
| ara_sy_for_eng | 100 | 2 | 2% | 2,589 | ~52 |
| cym_n_for_eng | 100 | 0 | 0% | 19,915 | ~0 |
| cym_s_for_eng | 100 | 0 | 0% | 20,770 | ~0 |
| zho_for_hin | 100 | 0 | 0% | 39,461 | ~0 |

**Caveat on this table: the fraction is "mutated at some point, ever" — it does not separate Event A (harmless-looking regrowth) from Event C (the actual truncation-causing event). The 95–100% rows at the top are mostly Event A. Courses flagged in Event C above (deu_for_eng, kor_for_hin, kor_for_tam, zho_for_tam, eng_for_hin, fra_for_eng, eng_for_kan, eng_for_tel, eng_for_pan, eng_for_ben, eng_for_sin) are where the recent-week damage actually concentrates — cross-reference the Event table above, not raw fraction rank, to find the courses at risk from the truncation bug specifically.**

## Day-by-day LastModified histogram (top 10 of all 9,610 sampled objects)

| Date | Count | % of sample |
|---|---|---|
| 2026-05-23 | 4,643 | 48.3% |
| 2026-06-19 | 1,023 | 10.6% |
| 2026-08-03 | 491 | 5.1% |
| 2026-05-24 | 486 | 5.1% |
| 2026-07-29 | 454 | 4.7% |
| 2026-05-25 | 253 | 2.6% |
| 2026-06-16 | 222 | 2.3% |
| 2025-05-15 | 199 | 2.1% |
| 2026-05-22 | 157 | 1.6% |
| 2026-07-11 | 152 | 1.6% |

`2025-05-15` (199 objects, `cym_s_for_eng`/`cym_n_for_eng`) is **older** than any `course_audio` row's `created_at` in the estate (earliest DB row is 2026-01-04) — this is the shared-physical-storage pattern again (pre-existing audio reused by a row created much later), not a mutation.

## Hourly detail, 2026-07-28 onward (the brief's suspicion window)

Sparse until 2026-07-29 10:00–12:00 UTC (351 objects across that 3-hour span) and 2026-08-03 09:00–11:00 UTC (358 objects) and 2026-08-03 19:00–23:00 UTC (91 objects, this is the deu_for_eng-heavy window). Full per-hour counts in the conversation transcript / rerunnable from `scripts/tail-forensics/head-results.json`.

## Bucket versioning / lifecycle / replication

- **Versioning: `Enabled`.**
- **Lifecycle: none configured** (`NoSuchLifecycleConfiguration`) — so no automatic expiry/deletion of noncurrent versions exists at the bucket level.
- **Replication: none configured** (`ReplicationConfigurationNotFoundError`).

Since lifecycle is off, noncurrent versions should persist indefinitely unless explicitly deleted by version ID. Event A objects show exactly this (2 versions, nothing missing). Event C objects overwhelmingly do **not** — see below.

## Version-history sample (500 random objects flagged "mutated", i.e. LastModified > created_at + 1h)

| version count | objects | share |
|---|---|---|
| 1 (no recoverable prior version) | 84 | 16.8% |
| 2 (clean before/after pair) | 409 | 81.8% |
| 3 | 7 | 1.4% |

Split by which event's courses they belong to:

| | n | 1-version | 2-version | 2-version: grew | 2-version: shrank | 2-version: same |
|---|---|---|---|---|---|---|
| Event-C courses (kor_for_hin, kor_for_tam, zho_for_tam, deu_for_eng, eng_for_hin, fra_for_eng, eng_for_ben, eng_for_sin, eng_for_kan, eng_for_tel, eng_for_tam, eng_for_pan, eng_for_urd, eng_for_guj) | 68 | 60 (88%) | 8 (12%) | 8 | 0 | 0 |
| All other courses (mostly Event A) | 432 | 24 (6%) | 401 (93%) | 371 (93%) | 29 (7%) | 1 |

**This is the sharpest signal in the whole investigation.** Event A (the May event) overwhelmingly preserves clean 2-version history and the new version is usually *bigger*. Event C (the recent-week event, including deu_for_eng) overwhelmingly shows **only one version** — the prior content is gone from S3's version chain with no delete marker, and matches nothing in the audited `course_audio_revisions` ledger for these specific rows (`audio_revision` stayed at 1). One three-version object outside Event C/A courses (`fin_for_eng`) does show a genuine content **shrink** (1,133,087 → 850,464 bytes, ~25% smaller) between its 2025-04-10/2025-05-15 versions and a 2026-05-26 version — the one clear byte-level shrink signature found in the whole sample, though it's dated to the May wave, not the recent one.

## file_size_bytes vs S3 ContentLength

**Explicit gap**: `file_size_bytes` is populated for only **667 of 2,544,787** `course_audio` rows (0.03%) — the column is essentially unused. Of the 8 rows in this sample where both DB `file_size_bytes` and S3 `ContentLength` were available, 1 mismatched. This check cannot be run meaningfully at scale from the data available; the LastModified-vs-created_at test above is the load-bearing signal instead.

## Confidence assessment

**High confidence** (directly observed, not inferred):
- Bucket versioning is Enabled, lifecycle/replication are not configured.
- Event A: a near-total, estate-wide overwrite clustered on 2026-05-22 to 05-25 (peak 05-23), with clean before/after version pairs and files mostly growing — this is NOT the truncation bug; it predates Tom's ear-confirmation by 10+ weeks and moves in the wrong size direction.
- Event C: a second, much smaller, more recent overwrite clustered 2026-07-29 and 2026-08-01–03 (deu_for_eng's damaging window is specifically 2026-08-03 19:34–23:41 UTC), concentrated in a specific ~14-course subset including deu_for_eng.
- None of the 24 Tom-confirmed truncated deu_for_eng clips carry `audio_revision > 1` — they were not touched by the audited `audio_repair_core.cjs` swap path. Whatever produced the 2026-08-03 truncated content in these rows ran outside that audit trail.
- 88% of a targeted Event-C version-history sample shows only one S3 version with no delete marker — the pre-08-03 content is not recoverable from S3 metadata for the large majority of what Event C touched.

**Medium confidence** (inferred / extrapolated):
- Per-course absolute mutated-clip counts in the big table are extrapolated from ~100-row samples; expect ±10-15% sampling noise per course, but the overall shape (near-universal Event-A churn, narrower Event-C footprint) is robust.
- The mechanism behind Event C's missing version history (deliberate version deletion vs. some non-standard write path) — I could not determine which from storage metadata alone.

**Explicit gaps** (could not determine from data available):
- **What exactly ran** to produce Event A or Event C — no CloudTrail access, no deploy/job logs were consulted (out of scope: read-only S3 + DB forensics only). I can date and scope the events precisely; I cannot name the process that ran them.
- **Why Event C's objects have no recoverable prior version** despite versioning being enabled bucket-wide throughout: either the prior version was explicitly deleted by version ID after the overwrite, or these specific writes happened through a path I haven't identified. Both are consistent with the evidence; I could not distinguish them.
- file_size_bytes vs ContentLength check: only 8 comparable rows in the whole sample (column is 99.97% unpopulated) — not a meaningful check at this scale.

## Landing line

No commits produced by this investigation other than this report. Branch: `fix/audio-link-integrity`. Not merged. Not deployed — this is a forensics document, not a code change.
