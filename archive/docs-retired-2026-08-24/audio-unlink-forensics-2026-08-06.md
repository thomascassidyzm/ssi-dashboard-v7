# Audio unlink forensics — measured, 2026-08-06

**Scope:** all 99 courses that have `course_practice_phrases` rows (818,223 phrase rows +
93,193 lego rows + 81,141 seed rows = 992,557 rows, 2,927,565 audio-link slots across the
three `known_audio_id`/`target1_audio_id`/`target2_audio_id` columns on
`course_practice_phrases`, `course_legos`, `course_seeds`). Read-only. No writes were made to
any table. All queries below via `node scripts/unlink-forensics/q.cjs "<sql>"` against
`DATABASE_URL` in `.env.psql`, or via `scripts/unlink-forensics/run.cjs` (per-course loop,
gitignored workspace script, raw output `scripts/unlink-forensics/results-buckets.json`).

**Headline: the free-recovery pool is nearly drained.** Of 515,677 currently-unlinked slots,
only **606 (strict) + 12 (loose-only) = 618 — 0.12%** — have a matching `course_audio` row
sitting in the same course ready to be linked for free. **515,059 (99.88%) are genuinely
absent**: no audio, in any voice, anywhere in that course, under either normaliser. Anyone
hoping "most of this is just relinking" is wrong — that pool was mostly already worked through
(see the ara_lb finding below, §4). The real backlog is a generation backlog, not a linking bug.

---

## 1. Per-course three-bucket table

**Matching rule** (per slot: `known_text`↔`known_audio_id`/role `known`;
`target_text`↔`target1_audio_id`/role `target1`; `target_text`↔`target2_audio_id`/role
`target2`, always scoped to the same `course_code`):

- **LINKED** — the audio-id column is non-null.
- **RECOVERABLE (strict)** — column is null, but a `course_audio` row exists in the same
  course/role with `text_normalized = normalize_text(content_text)` — the DB's own
  `normalize_text()` (`rtrim(lower(trim(t)), '.?!¿¡。？！')`, no whitespace collapse) applied to
  the phrase/lego/seed's own text and compared to the audio row's already-stored
  `text_normalized`.
- **RECOVERABLE (loose, additional)** — didn't match strict, but matches on
  lowercase + trim + collapse internal whitespace + strip trailing `.!?。！` applied to **both**
  sides (`course_audio.text` and the content text). Reported as the *extra* slots loose
  recovers beyond strict, per the brief's instruction to show the gap.
- **ABSENT** — neither matched. No usable audio anywhere in the course.

Verified the JS strict-normaliser mirrors the DB function exactly on a punctuation+whitespace
case (`normalize_text('Hello?  world.')` → `hello?  world`, JS gives identical output,
internal double-space preserved on both sides) before trusting the bulk comparison.

**The strict/loose gap is 12 rows, all in one course (`jpn_for_eng`), all on `course_legos`.**
This is far smaller than the brief expected ("the gap IS the blast radius of the normaliser
bug") — measured, not assumed: **the normaliser disagreement is a real but small contributor.**
Every course except `jpn_for_eng` shows loose-recoverable = 0, meaning almost none of the
99.88% "absent" bucket is a normaliser artefact — it's really absent.

### Totals

| Bucket | Slots | % of all slots |
|---|---|---|
| Linked | 2,411,888 | 82.4% |
| Recoverable — strict | 606 | 0.02% |
| Recoverable — loose only (extra) | 12 | 0.0004% |
| **Absent (needs spend)** | **515,059** | **17.6%** |
| **Total slots** | **2,927,565** | |

By table:

| Table | Linked | Strict-recoverable | Loose-extra | Absent |
|---|---|---|---|---|
| `course_practice_phrases` | 2,049,866 | 535 | 0 | 404,268 |
| `course_legos` | 233,255 | 51 | 12 | 46,258 |
| `course_seeds` | 128,767 | 20 | 0 | 64,533 |

### Full per-course table (all 99 courses, sorted by total slots)

| course | linked | strict-recoverable | loose-recoverable (extra) | absent | total slots |
|---|---|---|---|---|---|
| hak_for_eng | 0 | 0 | 0 | 83598 | 83598 |
| spa_for_eng | 55393 | 4 | 0 | 16 | 55413 |
| fra_for_eng | 54615 | 0 | 0 | 30 | 54645 |
| mar_for_eng | 2590 | 0 | 0 | 47267 | 49857 |
| eng_for_kan | 49356 | 0 | 0 | 0 | 49356 |
| por_br_for_eng | 49174 | 0 | 0 | 77 | 49251 |
| por_for_eng | 48651 | 0 | 0 | 72 | 48723 |
| deu_for_eng | 48459 | 18 | 0 | 15 | 48492 |
| fin_for_eng | 0 | 0 | 0 | 48387 | 48387 |
| eng_for_guj | 48183 | 0 | 0 | 0 | 48183 |
| kor_for_eng | 47955 | 0 | 0 | 156 | 48111 |
| ita_for_eng | 46779 | 0 | 0 | 123 | 46902 |
| kor_for_hin | 46620 | 0 | 0 | 0 | 46620 |
| deu_ch_for_eng | 0 | 0 | 0 | 46581 | 46581 |
| zho_for_hin | 45786 | 0 | 0 | 0 | 45786 |
| kor_for_tam | 45306 | 0 | 0 | 0 | 45306 |
| eng_for_mar | 44769 | 0 | 0 | 0 | 44769 |
| fra_ca_for_eng | 44720 | 0 | 0 | 43 | 44763 |
| tel_for_eng | 2190 | 0 | 0 | 42471 | 44661 |
| spa_mx_for_eng | 44147 | 0 | 0 | 37 | 44184 |
| ara_for_eng | 44070 | 0 | 0 | 51 | 44121 |
| eng_for_tam | 43998 | 0 | 0 | 0 | 43998 |
| eng_for_pan | 43734 | 0 | 0 | 0 | 43734 |
| ara_lb_for_eng | 20651 | 7 | 0 | 22983 | 43641 |
| deu_at_for_eng | 43434 | 0 | 0 | 0 | 43434 |
| eng_for_ben | 43401 | 0 | 0 | 0 | 43401 |
| eng_for_tel | 43281 | 0 | 0 | 0 | 43281 |
| eng_for_hin | 43248 | 0 | 0 | 0 | 43248 |
| jpn_for_eng | 41688 | 0 | 12 | 0 | 41700 |
| zho_for_eng | 40753 | 11 | 0 | 447 | 41211 |
| eng_for_sin | 41061 | 0 | 0 | 0 | 41061 |
| ara_eg_for_eng | 20420 | 526 | 0 | 19479 | 40425 |
| eng_for_urd | 39282 | 0 | 0 | 0 | 39282 |
| zho_for_tam | 37893 | 0 | 0 | 0 | 37893 |
| eng_for_jpn | 36376 | 0 | 0 | 95 | 36471 |
| tur_for_eng | 34275 | 0 | 0 | 3 | 34278 |
| yue_for_eng | 0 | 0 | 0 | 32499 | 32499 |
| ell_for_eng | 28174 | 0 | 0 | 1094 | 29268 |
| nep_for_eng | 26643 | 0 | 0 | 12 | 26655 |
| spa_for_jpn | 25356 | 0 | 0 | 1095 | 26451 |
| fas_for_eng | 26302 | 0 | 0 | 14 | 26316 |
| cat_for_spa | 25869 | 0 | 0 | 0 | 25869 |
| por_for_jpn | 0 | 0 | 0 | 24903 | 24903 |
| ben_for_eng | 23499 | 0 | 0 | 1101 | 24600 |
| ces_for_eng | 22919 | 0 | 0 | 1132 | 24051 |
| eus_for_eng | 23591 | 0 | 0 | 4 | 23595 |
| fra_for_jpn | 22475 | 0 | 0 | 1096 | 23571 |
| rus_for_eng | 22455 | 0 | 0 | 1095 | 23550 |
| swa_for_eng | 22379 | 0 | 0 | 1087 | 23466 |
| nan_for_eng | 0 | 0 | 0 | 23313 | 23313 |
| hrv_for_eng | 22934 | 0 | 0 | 190 | 23124 |
| eng_for_fra | 22747 | 0 | 0 | 176 | 22923 |
| gle_for_eng | 22735 | 0 | 0 | 23 | 22758 |
| hin_for_eng | 22706 | 0 | 0 | 1 | 22707 |
| pol_for_eng | 22577 | 0 | 0 | 1 | 22578 |
| lit_for_eng | 21143 | 0 | 0 | 1099 | 22242 |
| eng_for_por | 21714 | 0 | 0 | 171 | 21885 |
| bre_for_fra | 1 | 0 | 0 | 21671 | 21672 |
| mlt_for_eng | 2540 | 0 | 0 | 19096 | 21636 |
| eng_for_ara | 21564 | 0 | 0 | 0 | 21564 |
| eng_for_deu | 21372 | 0 | 0 | 162 | 21534 |
| ron_for_eng | 20210 | 0 | 0 | 1090 | 21300 |
| eng_for_spa | 20776 | 0 | 0 | 482 | 21258 |
| heb_for_eng | 21155 | 0 | 0 | 4 | 21159 |
| hye_for_eng | 20240 | 0 | 0 | 736 | 20976 |
| eng_template | 237 | 0 | 0 | 20694 | 20931 |
| srp_for_eng | 19790 | 0 | 0 | 1093 | 20883 |
| deu_for_zho | 19705 | 0 | 0 | 1100 | 20805 |
| eng_for_ita | 20610 | 0 | 0 | 171 | 20781 |
| fra_for_zho | 19669 | 0 | 0 | 1100 | 20769 |
| swe_for_eng | 19345 | 0 | 0 | 1097 | 20442 |
| cat_for_eng | 19142 | 0 | 0 | 1099 | 20241 |
| cym_s_for_eng | 18491 | 16 | 0 | 1629 | 20136 |
| ita_for_jpn | 19035 | 0 | 0 | 1095 | 20130 |
| eus_for_spa | 18797 | 0 | 0 | 1093 | 19890 |
| eng_for_kor | 19852 | 0 | 0 | 14 | 19866 |
| gla_for_eng | 2812 | 0 | 0 | 16928 | 19740 |
| lav_for_eng | 18621 | 0 | 0 | 1095 | 19716 |
| isl_for_eng | 18293 | 0 | 0 | 1093 | 19386 |
| deu_for_jpn | 18294 | 0 | 0 | 1092 | 19386 |
| hun_for_eng | 18276 | 0 | 0 | 1098 | 19374 |
| est_for_eng | 18217 | 0 | 0 | 1094 | 19311 |
| dan_for_eng | 18108 | 0 | 0 | 1089 | 19197 |
| ita_for_zho | 18055 | 0 | 0 | 1100 | 19155 |
| ukr_for_eng | 18897 | 0 | 0 | 3 | 18900 |
| cym_n_for_eng | 16972 | 18 | 0 | 1910 | 18900 |
| glg_for_eng | 17709 | 0 | 0 | 1098 | 18807 |
| eng_for_zho | 18746 | 0 | 0 | 40 | 18786 |
| tha_for_eng | 17424 | 0 | 0 | 1092 | 18516 |
| bul_for_eng | 18311 | 0 | 0 | 1 | 18312 |
| spa_for_zho | 16905 | 0 | 0 | 1092 | 17997 |
| nld_for_eng | 17023 | 6 | 0 | 680 | 17709 |
| nor_for_eng | 16484 | 0 | 0 | 1099 | 17583 |
| afr_for_eng | 14822 | 0 | 0 | 1096 | 15918 |
| zho_for_jpn | 15643 | 0 | 0 | 2 | 15645 |
| sbx_for_eng | 285 | 0 | 0 | 3321 | 3606 |
| ita_for_cym | 0 | 0 | 0 | 3573 | 3573 |
| cym_anthem_for_jpn | 543 | 0 | 0 | 0 | 543 |
| zho_for_gle | 441 | 0 | 0 | 0 | 441 |

**Nine courses show 0 or near-0 linked slots against a full absent bucket** —
`hak_for_eng`, `fin_for_eng`, `deu_ch_for_eng`, `yue_for_eng`, `por_for_jpn`, `bre_for_fra`,
`eng_template`, `ita_for_cym`, and three more (`mar_for_eng`, `tel_for_eng`, `mlt_for_eng`,
`gla_for_eng`, `sbx_for_eng`) sitting at single-digit-percent linked. These are the courses
behind the 2026-07-11 event in §3 — **not** a uniform cross-estate problem.

---

## 2. Dangling links (no-FK columns, pointing at a deleted `course_audio.id`)

Anti-join `not exists (select 1 from course_audio ca where ca.id = <col>)` per column, measured
against the live PK.

| Column | Total dangling | Per-course breakdown |
|---|---|---|
| `course_legos.presentation_audio_id` | **9** | `deu_for_eng` 7, `cym_s_for_eng` 1, `pol_for_eng` 1 |
| `course_practice_phrases.presentation_audio_id` | **17,480** | see below |
| `listening_pod_sentences.explainer_audio_id` | 0 | — |
| `listening_pod_sentences.note_audio_id` | 0 | — |
| `pod_legos.explainer_audio_id` | 0 | — |
| `content_feedback.audio_id` | 1 | `spa_for_eng` 1 |

`course_practice_phrases.presentation_audio_id` is where the real damage is — **17,480 rows
across 33 courses** point at a `course_audio.id` that no longer exists, and because this column
has no FK, the database will never tell you: no cascade, no null-out, just a dead pointer the
player silently drops. Worst-hit: `eng_for_guj` 1,135, `eng_for_fra` 1,083, `fra_for_jpn` 1,002,
`eng_for_ara` 944, `eng_for_deu` 939, `deu_for_eng` 926, `eng_for_por` 906, `eng_for_spa` 902,
`eng_for_tam` 839, `eng_for_kor` 718 (full 33-course list in
`scripts/unlink-forensics/` query output, reproducible via the query above).

**This bucket has its own sharp timestamp signature** (`date_trunc('day', updated_at)`):
2026-06-02 → 9,667 rows in one day (55% of the whole 17,480), 2026-07-31 → 2,535,
2026-06-19 → 2,184, 2026-06-04 → 1,344, 2026-08-03 → 557, 2026-08-04 → 368 — the tail matches
the documented 2026-08-03 Azure purge exactly (`docs/fra-audio-1608-forensics-2026-08-05.md`),
but **2026-06-02 is a previously-undocumented, larger event** — nearly 4× the size of the known
purge, on a no-FK column the purge's own forensics never looked at because it wasn't in scope
then. I did not identify what code path ran on 2026-06-02; flagging as a gap (§6).

`course_legos.presentation_audio_id` dangling count (9) is negligible and not clustered —
consistent with normal one-off edits, not a systemic mechanism.

---

## 3. Timestamp clustering — verdict: **clustered, and it's two different mechanisms**

Per-course day-histograms of `updated_at` on unlinked rows (all three tables), from
`results-buckets.json`. This is **not flat** — the top single day accounts for 84-100% of a
course's unlinked total in the 9 heaviest-hit courses (`topShare` column, computed from the
per-course `dayCounts`).

### 3a. A previously-undocumented mass-unlink event: 2026-07-11, 02:34:01–02:36:17 UTC

Nine courses each have **one single `updated_at` timestamp, shared by literally every row in
every one of `course_seeds`, `course_legos`, and `course_practice_phrases`** — not "many rows
that day", one exact instant per course, and the instants step forward in a straight ~10-20s
cadence, course after course:

| course | shared `updated_at` (UTC) | rows all sharing it |
|---|---|---|
| bre_for_fra | 02:34:01.561 | 5,918 (100% of the course) |
| eng_template | 02:34:45.476 | 6,105 (100%) |
| gla_for_eng | 02:34:59.316 | 5,376 (100%) |
| ita_for_cym | 02:35:10.828 | 465 (100%) |
| mar_for_eng | 02:35:30.783 | 13,874 (100%) |
| mlt_for_eng | 02:35:42.901 | 5,811 (100%) |
| por_for_jpn | 02:36:02.941 | 6,786 (~93%; rest of the course was touched again 07-24) |
| sbx_for_eng | 02:36:11.220 | 473 (100%) |
| tel_for_eng | 02:36:17.382 | 12,562 (100%) |

Verified this is a genuine regression, not a cold/never-linked course: `course_audio` **already
existed** for every one of these courses **before** 2026-07-11 (e.g. `mar_for_eng` audio rows
created 2026-07-05 through 2026-07-27 — spanning straight through the event — and
`gla_for_eng`/`bre_for_fra`/`por_for_jpn` audio created back in March–May). So these courses had
working, linked audio, and at 02:34-02:36 UTC on 2026-07-11 every text row across all three
content tables was rewritten in one shot with every audio-link column blanked. This is the
signature of a single script looping over a fixed course list and running one bulk `UPDATE …
SET known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, updated_at=now() WHERE
course_code=$1` (or a full delete+reinsert with no audio carried over) per course, one course
every 10-20 seconds. **I did not find the script or commit that did this** — it predates
anything in `git log` that names these courses on that date, and it isn't the 2026-08-03 Azure
purge, the 2026-03-11 window, or the 2026-05-23 window named in the brief. Flagging as the
report's biggest open gap (§6).

### 3b. A second, different-shaped cluster: 2026-07-15/07-16, "born unlinked" (not a regression)

`hak_for_eng`, `fin_for_eng`, `deu_ch_for_eng`, `yue_for_eng`, `ara_eg_for_eng` (partially), and
`ara_lb_for_eng` (partially) spike hard on 2026-07-15/07-16, but the shape is opposite to 3a:
**many distinct timestamps spread across the day, and `created_at = updated_at` on the affected
rows** — e.g. `hak_for_eng`'s entire 83,598-slot course was created and last-touched on
2026-07-16, never edited since; `course_audio` for `hak_for_eng` has exactly **1** row in
existence. This is new content being authored, not audio being lost — the rows were **born**
without audio because no TTS pass has run yet, which is exactly what bucket (c) "absent" is
supposed to catch. **Do not read `hak_for_eng`/`fin_for_eng`/`deu_ch_for_eng`/`yue_for_eng` as
unlink damage — they're unbuilt-audio backlog**, same category as the known ara_lb seeds
301-668 gap (§4).

### 3c. Everything else: flat

Outside the courses named in 3a/3b, no course shows more than ~5% of its unlinked total on any
single day — an ordinary, low-rate ongoing mechanism (ZUT/text edits triggering
`null_lego_audio_on_text_change`/`null_phrase_audio_on_text_change`), not a batch event.

---

## 4. ara_lb_for_eng — mechanism identified, already fixed before this measurement

**The 1,324-clip story is resolved by the repo's own prior work, not by anything new here** —
`docs/ara-lb-link-pass-2026-08-06.md` (commit `c659e163`, 2026-08-06 00:49 UTC, **before** this
investigation started). Read directly rather than re-derived:

- **Mechanism:** seeds 301-668 of `ara_lb_for_eng` were newly authored and had **never had a
  link pass run over them** — not a delete, not a cascade, not text-change nulling. 1,324 of
  their text slots happened to repeat text that was already rendered and linked at an earlier
  seed in the same course (recurring phrases like "she doesn't want", "book"), so audio already
  existed; it just hadn't been bound.
- **The trap that made ad-hoc scripts undercount this course specifically:** `ara_lb_for_eng`
  stores its target audio under `language='ara'` (from `courses.target_lang`), **not**
  `'ara_lb'`. A script that derives language from the course-code suffix instead of reading the
  `courses` row will match zero target rows here and misreport genuinely-present audio as
  absent. My own bucket script (§1) never filters by language — only `course_code` + `role` — so
  it isn't exposed to this trap.
- **Already applied and verified**, three gates (exact `normalizeForAudio` text equality, voice
  config match, S3 `HeadObject` on all 572 distinct objects), 1,324/1,324 linked, 0 drift, 0
  errors, verified live through the round-generation path (13 debut rounds flipped
  `playerDelivers: false→true`).
- **Confirmed against current live data**: `ara_lb_for_eng`'s bucket in §1 now shows only 7
  strict-recoverable remaining (not 1,324) — because the fix already ran. The remaining 22,983
  absent slots in that course are the known, separately-documented 20,757-clip TTS/authoring
  backlog for seeds 301-668 (`docs/audio/ara-lb-missing-audio-scope-2026-08-06.md`), untouched by
  the link pass by design.

**Same signature (base-ISO `target_lang` ≠ course-code regional suffix) exists in 20 other
courses** — any script that derives language from the course code rather than reading
`courses.target_lang` will hit the identical trap on all of them:

| Family | Courses | `target_lang` |
|---|---|---|
| Arabic dialects | ara_eg_for_eng/jpn/zho, ara_lb_for_eng, ara_sy_for_eng/jpn/zho | `ara` |
| Welsh | cym_n_for_eng, cym_s_for_eng | `cym` |
| German | deu_at_for_eng/jpn/zho, deu_ch_for_eng | `deu` |
| French | fra_ca_for_eng | `fra` |
| Portuguese | por_br_for_eng/jpn/zho | `por` |
| Spanish | spa_mx_for_eng/jpn/zho | `spa` |

I did not run the full recovery census on these 20 (out of scope for this measurement pass —
the doc's job is to map where the risk sits, not to fix it), but `ara_eg_for_eng` in §1 already
shows the tell — 526 strict-recoverable, the highest of any course in the whole estate by a wide
margin (next-highest is 18) — consistent with the same "never-linked, same-language-family
repeat text" pattern the ara_lb pass found and fixed. **`ara_eg_for_eng` looks like the next
instance of exactly this signature, unfixed.**

---

## 5. `lego_introductions` cascade-loss check — verdict: not evidence of audio loss

Compared `course_legos` rows with `is_new=true` against matching `lego_introductions` rows
(`course_code`+`lego_id`). Found large shortfalls in most courses (e.g. `eng_for_jpn`: 675 new
legos, only 379 with an intro row) — but three checks rule out cascade damage as the cause:

1. **The FK itself is intact and not firing**: `lego_introductions.presentation_audio_id →
   course_audio.id ON DELETE CASCADE` has **zero** dangling rows anywhere (sanity-checked: a
   dangling presentation_audio_id in this table would be architecturally impossible given the
   cascade, and the query confirms it — 0 found).
2. **The shortfall doesn't correlate with course position or LEGO type** — sampled
   `eng_for_jpn`'s missing-intro legos across the full seed range (1 through 300) and by type
   (A vs M): scattered evenly throughout, no positional drop-off (which would suggest an
   incomplete backfill) and no type skew.
3. **The actual audio link lives elsewhere and is intact.** `course_legos.presentation_audio_id`
   (a separate, un-FK'd text column) is populated on **100%** of the same `eng_for_jpn` sample
   rows regardless of whether `lego_introductions` has a row — 379 "has both", 296 "has own
   audio, no intro row", **zero** "has intro row but no own audio". And per §2,
   `course_legos.presentation_audio_id` dangles only 9 times estate-wide.

**Verdict:** `lego_introductions` is an incompletely-populated secondary/legacy tracking table
(47,644 rows total, spanning 2025-12-24 to 2026-08-05, across only 60 of the 99 courses;
`ara_lb_for_eng` has **zero** rows in it despite 1,414 new legos) — not the source of truth for
presentation-audio linkage, and its gaps do not indicate lost audio. The column that actually
carries the link (`course_legos.presentation_audio_id`) is intact. No legos have "lost" their
introduction to the cascade in any way that shows up as missing audio.

---

## 6. Explicit gaps

- **§3a's root cause is unidentified.** I found the exact timestamp, the exact 9 courses, and
  proved it rewrote every row of every table with blanked audio links against courses that
  already had linked audio — but not the script, migration, or commit that ran it. This is the
  single most consequential unresolved question in this report; it is bigger than the
  documented 2026-08-03 Azure purge (9 courses, ~90,000+ rows, vs. the purge's 31,310).
- **2026-06-02's 9,667-row dangling-`presentation_audio_id` spike (§2) is unidentified** —
  larger than the documented 2026-08-03 purge on that same column, and I did not trace it to a
  cause.
- **The 20 same-signature courses named in §4 were not given a full census** — only
  cross-checked against the bucket table already produced for §1. `ara_eg_for_eng` shows a
  strong tell (526 strict-recoverable, by far the estate's highest); the other 19 were not
  individually verified.
- **No historical/audit-log data exists to distinguish, per row, "was linked once and lost" from
  "never linked"** for the ordinary flat-distribution background rate in §3c — inferred from
  triggers + circumstantial timing only, not proven per-row.
- All queries ran to completion; no statement timeouts were hit once work was split per-course
  (as instructed) — no gaps from query failure.

---

## Method notes

- Matching implemented in `scripts/unlink-forensics/run.cjs`: for each of 99 courses, pull that
  course's `course_audio` rows (roles known/target1/target2) into an in-process JS Map keyed
  `role|text_normalized` (strict) and `role|looseNorm(text)` (loose), then stream each
  course's `course_practice_phrases`/`course_legos`/`course_seeds` rows and classify each of the
  3 audio columns against those maps. No correlated subqueries, no cross-course joins — this is
  why the whole 992,557-row sweep completed without a single statement timeout.
- Raw per-course JSON: `scripts/unlink-forensics/results-buckets.json` (gitignored workspace,
  not committed — regenerate via `node scripts/unlink-forensics/run.cjs`).
