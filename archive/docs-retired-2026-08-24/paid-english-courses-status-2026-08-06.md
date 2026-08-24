# Paid English-speaker courses — programme status, 2026-08-06

**Headline: seeds are not the constraint — every course already holds 668 translated seeds. The constraint is approval. Across the 20 Big-10 courses, 7,185 of 13,360 seeds are approved (53.8%), and 5,175 of the unapproved ones sit in five courses that were decomposed to 668 but reviewed only to seed 300.**

Measured against the live Supabase DB, 2026-08-06. Read-only — no writes, no approvals, no TTS.

## Scope rule (stated, because the DB does not record "paid" directly)

There is no `is_paid` column. `courses.pricing_tier` is a free-text, hand-editable field (`services/production-api.cjs:2179` lets the dashboard set it). **Proxy used: `known_lang='eng'` AND `pricing_tier='premium'` AND `is_community=false`**, excluding Welsh (`target_lang='cym'`), the `eng_template` / `zzz_test_for_eng` / `sbx_for_eng` scaffolds, and the 14-course English-for-Indian-languages programme (all `eng_for_*` / `zho_for_*` / `kor_for_*` — none of which are `*_for_eng`, so there is zero overlap with that scout).

That yields **35 courses**. But `pricing_tier='premium'` and the Big-10 business rule disagree, and the disagreement is large:

- **20 courses** are Big-10 targets (Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Arabic, Korean — English is the known side). Includes 3 Chinese-family variants (Cantonese, Hakka, Hokkien) counted as "Chinese"; flag if you read that differently.
- **15 courses** are marked `premium` in the DB but are **not Big-10 languages**: Marathi, Telugu, Kannada, Cornish, Friulian, Lombard, Neapolitan, Pennsylvania Dutch, Romagnol, Romansh, Sicilian, Northern Sami, Venetian, Yiddish, Yoruba.

**The 20 Big-10 courses are the programme.** The other 15 are tabled separately below — 12 of them have literally no content, so the pricing flag is almost certainly wrong rather than the plan being real. That is a call for you, not me.

## Calibration (done before any count was reported)

Counting method was verified against the running dashboard's own code path — `getCourseContentStats()` in `services/supabase-client.cjs:968`, the function behind `GET /api/courses/:code/stats` that the Course Browser UI renders. I ran that function directly and compared to my SQL:

| Calibration course | Dashboard function | My SQL | Match |
|---|---|---|---|
| **`spa_for_eng`** | seeds 668 · legos 1475 · phrases 16328 · audio 78163 | seeds 668 · legos 1475 · phrases 16328 · audio 78163 | ✅ exact |
| `deu_for_eng` | seeds 668 · legos 1570 · phrases 13926 · audio 47266 | identical | ✅ exact |
| `ara_sy_for_eng` | seeds 0 · legos 0 · phrases 0 · audio 2589 | identical | ✅ exact |

**`spa_for_eng` is the named calibration course; the method matched the dashboard exactly.** The dashboard's `completedSeeds` = distinct `seed_number` values having LEGOs — I use the same definition. Note the dashboard's *own* seed figure is a raw row count, which is why the "seeds/668" column below is 668 almost everywhere and is **not** the useful metric.

## At a glance — the 20 Big-10 courses

Sorted by distance from 668 *at quality* (approved seeds), nearest the finish line first.

| # | Course | Target | Seeds/668 | Decomposed | **Approved** | Audio % | Learner status | The one blocking thing |
|---|---|---|---|---|---|---|---|---|
| 1 | `por_br_for_eng` | Portuguese (Brazilian) | 668/668 | 668 | **668** (100.0%) | 99.8% | `beta` | Nothing content-blocking. 668/668 approved — it is `beta`, not live |
| 2 | `spa_for_eng` | Spanish | 668/668 | 668 | **668** (100.0%) | 99.96% | `live` | Nothing. 668/668 approved, 20 unlinked slots of 55,413 |
| 3 | `ita_for_eng` | Italian | 668/668 | 668 | **667** (99.9%) | 99.7% | `live` | 1 flagged unapproved seed |
| 4 | `jpn_for_eng` | Japanese | 668/668 | 668 | **667** (99.9%) | 99.97% | `live` | 1 flagged unapproved seed |
| 5 | `zho_for_eng` | Mandarin Chinese | 668/668 | 668 | **667** (99.9%) | 98.9% | `live` | 1 unapproved seed + **458 unlinked audio slots** (only live course not ~99.9%) |
| 6 | `fra_for_eng` | French | 668/668 | 668 | **666** (99.7%) | 99.9% | `beta` | 2 unapproved seeds |
| 7 | `deu_for_eng` | German | 668/668 | 668 | **662** (99.1%) | 99.96% | `beta` | **26 flagged seeds**, 6 still unapproved |
| 8 | `ara_eg_for_eng` | Arabic (Egyptian) | 668/668 | 668 | **660** (98.8%) | 50.5% | `beta` | **Audio stops dead at seed 300** — 20,005 unlinked slots on fully-approved content |
| 9 | `por_for_eng` | Portuguese | 668/668 | 668 | **659** (98.7%) | 99.9% | `live` | 8 flagged seeds, all 8 unapproved — and it is **live** |
| 10 | `ara_lb_for_eng` | Arabic (Lebanese) | 668/668 | 668 | **300** (44.9%) | 47.3% | `beta` | **Approval frontier at seed 300** — 368 decomposed seeds never reviewed; audio also stops at 300 (22,988 slots) |
| 11 | `spa_mx_for_eng` | Spanish (Mexican) | 668/668 | 668 | **300** (44.9%) | 99.9% | `beta` | **Approval frontier at seed 300** — 368 decomposed seeds never reviewed (audio is already 99.9%) |
| 12 | `ara_for_eng` | Arabic (MSA) | 668/668 | 668 | **298** (44.6%) | 99.9% | `beta` | **Approval frontier at seed 300** + 48 flagged (30 unapproved) |
| 13 | `kor_for_eng` | Korean | 668/668 | 667 | **297** (44.5%) | 99.7% | `live` | **147 flagged seeds, all unapproved, and the course is `live`** — worst quality-to-exposure ratio in the estate |
| 14 | `deu_at_for_eng` | German (Austrian) | 668/668 | 668 | **6** (0.9%) | 100.0% | `not_available` | 6/668 approved. **Audio is 100% complete on unreviewed content** |
| 15 | `deu_ch_for_eng` | German (Swiss) | 668/668 | 668 | **0** (0.0%) | 0.0% | `not_available` | 0/668 approved. Decomposed but never reviewed; no audio |
| 16 | `fra_ca_for_eng` | French (Canadian) | 668/668 | 668 | **0** (0.0%) | 99.9% | `draft` | 0/668 approved. **Audio 99.9% complete on unreviewed content** |
| 17 | `hak_for_eng` | Hakka | 668/668 | 668 | **0** (0.0%) | 0.0% | `not_available` | 0/668 approved. Decomposed 2026-07-16, untouched since; no audio |
| 18 | `yue_for_eng` | Cantonese | 668/668 | 668 | **0** (0.0%) | 0.0% | `not_available` | 0/668 approved. 62 seeds have no practice phrases (highest in estate); no audio |
| 19 | `nan_for_eng` | Hokkien | 668/668 | 467 | **0** (0.0%) | 0.0% | `not_available` | **Decomposition stalled at seed 467** — the only Chinese-family course not fully decomposed |
| 20 | `ara_sy_for_eng` | Arabic (Syrian) | 0/668 ⚠️ | 0 | **0** (0.0%) | 0.0% | `not_available` | **No content at all** — 0 seed rows, yet 2,589 orphan clips exist |

**Programme totals (20 courses):** 13,360 seed rows · 12,490 decomposed · **7,185 approved (53.8%)** · 27,585 LEGOs · 253,392 practice phrases · 650,925 of 881,007 audio slots linked (73.9%) · 702,282 clip rows.

## The five things actually worth acting on

**1. The seed-300 approval frontier is the single biggest number in the programme.**
Five courses were decomposed all the way to 668 and then reviewed only to seed 300. Their `max(seed_number)` with `approved_at` is exactly 300:

| Course | Approved | Decomposed-but-never-reviewed | Max approved seed |
|---|---|---|---|
| `ara_lb_for_eng` | 300 | **368** | 300 |
| `spa_mx_for_eng` | 300 | **368** | 300 |
| `ara_for_eng` | 298 | **370** | 300 |
| `kor_for_eng` | 297 | **370** | 300 |
| `deu_at_for_eng` | 6 | **662** | 6 |

That is **2,138 seeds of finished decomposition sitting unreviewed**, plus `deu_ch`, `fra_ca`, `hak`, `yue`, `mar`, `tel` at zero approved — **6,175 unapproved decomposed seeds in total**. No new content needs writing for any of them. This is a review queue, not a build queue.

**2. `kor_for_eng` is `live` with 147 flagged seeds and 297/668 approved.**
Every one of the 147 flagged seeds is unapproved, and learners are being served them right now. It is the worst quality-to-exposure ratio in the estate — `por_for_eng` is second (8 flagged, all unapproved, also live) and far milder. Last seed touch: 2026-08-03.

**3. Audio has run ahead of approval on three courses — money spent on unreviewed content.**

| Course | Approved | Audio linkage |
|---|---|---|
| `deu_at_for_eng` | 6/668 (0.9%) | **100.0%** (43,434/43,434 slots) |
| `fra_ca_for_eng` | 0/668 (0%) | **99.9%** (44,720/44,763) |
| `spa_mx_for_eng` | 300/668 | 99.9% |

If any of those 662 unreviewed `deu_at` seeds change on review, the audio is re-rendered. Audio is secondary to this programme, but this is the direction the waste runs — worth naming to Tom while he is working the pipeline.

**4. Two Arabic variants have audio that stops dead at seed 300 — 42,993 unlinked slots between them.**
`ara_eg_for_eng` is 660/668 **approved** (content essentially finished) but its audio linkage ends at seed 300: max phrase `seed_number` with a `target1` clip is 300, and there are 0 linked phrase slots above 300. 20,005 slots unlinked. `ara_lb_for_eng` is the same shape (first gap at seed 301; only 346 linked phrase slots above 300; 22,988 unlinked). These two are the only high-approval courses below 98% audio.

**5. `ara_sy_for_eng` has 2,589 orphan audio clips and no course.**
Zero rows in `course_seeds`, `course_legos`, `course_practice_phrases` — yet 2,589 `course_audio` rows in 6 languages, all with S3 keys, created between 2026-04-27 and 2026-07-24. The `courses` row declares `seed_count=300`. Either the content was deleted after audio was made, or audio was made for a course that was never built. Per make-before-break doctrine this is worth a look before anyone deletes anything.

## Content integrity — clean

I checked all 35 courses for orphaned and duplicate rows. **Zero orphan LEGOs, zero orphan practice phrases, zero duplicate `lego_id`s, zero duplicate `seed_number`s, zero dangling `target1_audio_id` references** across the whole estate. Referential integrity is sound.

The one recurring pattern is **seeds with LEGOs but no practice phrases**. It is not a defect: the seeds concerned are single-word or fragment seeds. `spa_for_eng`'s five are S0305 "woman", S0367 "no nobody told me", S0400, S0463 "my room number", S0609. Counts range 1 (`jpn`) to 62 (`yue`) — `yue_for_eng` at 62 and `zho_for_eng`/`mar_for_eng` at 28 are the outliers worth a spot-check.

One real decomposition gap: **`nan_for_eng` stalled at seed 467** (467/668 decomposed, 201 seeds with no LEGOs, 225 with no phrases). It is the only Big-10-family course not fully decomposed.

## The 15 premium-flagged, non-Big-10 courses

Tabled separately because the Big-10 rule puts them out of programme scope while the DB's `pricing_tier` says `premium`. **12 of the 15 have zero content.**

| Course | Target | Seeds | Legos | Phrases | Approved | Audio % | State |
|---|---|---|---|---|---|---|---|
| `mar_for_eng` | Marathi | 668 | 2077 | 13874 | 0 | 5.2% | 0/668 approved; 28 seeds with no phrases; target-side audio not started (known side only) |
| `tel_for_eng` | Telugu | 668 | 1657 | 12562 | 0 | 4.9% | 0/668 approved; 17 seeds with no phrases; target-side audio not started |
| `cor_for_eng` | Cornish | 668 | 0 | 0 | 0 | 0.0% | Not started — 668 translated seeds, **0 legos, 0 phrases, 0 audio**. Decomposition has never run |
| `fur_for_eng` | Friulian | 668 | 0 | 0 | 0 | 0.0% | Not started — 668 translated seeds, **0 legos, 0 phrases, 0 audio**. Decomposition has never run |
| `kan_for_eng` | Kannada | 668 | 0 | 0 | 0 | 0.0% | Not started — 668 translated seeds, **0 legos, 0 phrases, 0 audio**. Decomposition has never run |
| `lmo_for_eng` | Lombard | 668 | 0 | 0 | 0 | 0.0% | Not started — 668 translated seeds, **0 legos, 0 phrases, 0 audio**. Decomposition has never run |
| `nap_for_eng` | Neapolitan | 668 | 0 | 0 | 0 | 0.0% | Not started — 668 translated seeds, **0 legos, 0 phrases, 0 audio**. Decomposition has never run |
| `pdc_for_eng` | Pennsylvania Dutch | 668 | 0 | 0 | 0 | 0.0% | Not started — 668 translated seeds, **0 legos, 0 phrases, 0 audio**. Decomposition has never run |
| `rgn_for_eng` | Romagnol | 668 | 0 | 0 | 0 | 0.0% | Not started — 668 translated seeds, **0 legos, 0 phrases, 0 audio**. Decomposition has never run |
| `roh_for_eng` | Romansh | 668 | 0 | 0 | 0 | 0.0% | Not started — 668 translated seeds, **0 legos, 0 phrases, 0 audio**. Decomposition has never run |
| `scn_for_eng` | Sicilian | 668 | 0 | 0 | 0 | 0.0% | Not started — 668 translated seeds, **0 legos, 0 phrases, 0 audio**. Decomposition has never run |
| `sme_for_eng` | Northern Sami | 668 | 0 | 0 | 0 | 0.0% | Not started — 668 translated seeds, **0 legos, 0 phrases, 0 audio**. Decomposition has never run |
| `vec_for_eng` | Venetian | 668 | 0 | 0 | 0 | 0.0% | Not started — 668 translated seeds, **0 legos, 0 phrases, 0 audio**. Decomposition has never run |
| `yid_for_eng` | Yiddish | 668 | 0 | 0 | 0 | 0.0% | Not started — 668 translated seeds, **0 legos, 0 phrases, 0 audio**. Decomposition has never run |
| `yor_for_eng` | Yoruba | 668 | 0 | 0 | 0 | 0.0% | Not started — 668 translated seeds, **0 legos, 0 phrases, 0 audio**. Decomposition has never run |

The 12 zero-content ones (`cor`, `fur`, `kan`, `lmo`, `nap`, `pdc`, `rgn`, `roh`, `scn`, `sme`, `vec`, `yid`, `yor`) each hold 668 fully **translated** seeds — the target text is there and looks real (`cor_for_eng` S0001: *"my a vynn kewsel Kernewek genes lemmyn"*; `yor_for_eng` S0001: *"Mo fẹ́ láti sọ èdè Yorùbá pẹ̀lú rẹ báyìí"*). Eleven were created in a single batch on 2026-07-07 and have not been touched since. Decomposition has simply never been run on any of them.

`mar_for_eng` and `tel_for_eng` are further along (fully decomposed, known-side audio only, 0 approved) — note these are the *reverse* direction from the Indian-languages programme's `eng_for_mar` / `eng_for_tel`, which are finished.

## Explicit gaps — things I did not measure

- **Paid/free is a proxy, not a fact.** `pricing_tier` is hand-editable and demonstrably disagrees with the Big-10 rule on 15 courses. Nothing in the DB records an actual entitlement.
- **No S3 existence check.** Audio percentages are *link* completeness (`known_audio_id` / `target1_audio_id` / `target2_audio_id` populated on seeds, legos and phrases). I did not verify that each linked clip's S3 object exists, nor check voice correctness or clip veracity. `course_audio.veracity_pass` exists and was not sampled.
- **No methodology/ZUT audit.** "Approved" here means `approved_at IS NOT NULL`. I did not assess whether approved content is methodologically correct. For 21 of these languages I could not read it anyway.
- **No learner-app verification.** I did not confirm through the running player that any course actually serves. `course_round_index` freshness was not checked for these courses.
- **`lego_introductions` not counted per-course** beyond the calibration sample.

## Language note

Of the 20 Big-10 courses, the ones you can adjudicate directly are **`ita_for_eng`** (1 flagged seed) — and it is nearly finished. `spa_for_eng`, `deu_for_eng`, `deu_at_for_eng`, `deu_ch_for_eng`, `jpn_for_eng` you can follow but not advise on. The five big review queues — Arabic ×3, Korean, Mexican Spanish — are **not** languages you can adjudicate. Any request for you to review those seeds needs fully scaffolded evidence, or a native reviewer, not your eyes on raw target text.

---

*Method: direct SQL against Supabase Postgres 17 via `DATABASE_URL` (`.env.psql`). Enumeration from `courses` where `known_lang='eng'` — 78 rows returned, 35 in premium scope. Counting method calibrated against `getCourseContentStats()` (`services/supabase-client.cjs:968`) on `spa_for_eng` before any figure was reported. Read-only throughout.*
