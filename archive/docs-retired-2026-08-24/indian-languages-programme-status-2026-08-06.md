# Indian-languages programme — state of the nation, 2026-08-06

**Headline: content and audio are finished. All 14 courses exist, all have 668/668 seeds decomposed, and all 14 are at 100.000% audio linkage — 634,692 slots, 0 missing, 0 dangling, 0 clips without an S3 object.** The remaining work is not production. It is four `new_app_status` flags, 20 flagged seeds, and two mis-linked clips.

Measured against the live DB and the running phase-8 service, 2026-08-06. Read-only.

## At a glance

| # | Course | Pair (known→target) | Seeds | Approved | Audio slots | Audio % | Live to learners? | The one blocking thing |
|---|---|---|---|---|---|---|---|---|
| 1 | `eng_for_hin` | hin→eng | 668 | **100%** (668) | 44,522 | **100.000%** | ✅ beta | Nothing. Stale `pending` audio-pass request needs closing |
| 2 | `eng_for_pan` | pan→eng | 668 | **100%** (668) | 44,997 | **100.000%** | ✅ beta | Nothing blocking |
| 3 | `eng_for_urd` | urd→eng | 668 | **100%** (668) | 40,440 | **100.000%** | ✅ beta | Nothing blocking |
| 4 | `eng_for_ben` | ben→eng | 668 | **100%** (668) | 44,681 | **100.000%** | ✅ beta | Nothing blocking |
| 5 | `eng_for_tam` | tam→eng | 668 | 99.9% (667) | 45,356 | **100.000%** | ✅ beta | Seed **S0141** — known/target mismatch, marked unfillable RED |
| 6 | `eng_for_sin` | sin→eng | 668 | **100%** (668) | 42,301 | **100.000%** | ✅ beta | Lego **S0089L03** plays a Japanese clip (see Defects) |
| 7 | `eng_for_guj` | guj→eng | 668 | **100%** (668) | 49,607 | **100.000%** | ✅ beta | Nothing blocking |
| 8 | `eng_for_mar` | mar→eng | 668 | **97.3%** (650) | 46,158 | **100.000%** | ✅ **live** | **18 flagged seeds** unresolved — and it is already live |
| 9 | `eng_for_tel` | tel→eng | 668 | 99.9% (667) | 44,709 | 99.998% | ✅ **live** | Seed **S0547** (gender call) + 1 presentation text to author |
| 10 | `eng_for_kan` | kan→eng | 668 | **100%** (668) | 50,799 | **100.000%** | ✅ **live** | Nothing. Stale `pending` audio-pass request needs closing |
| 11 | `zho_for_hin` | hin→zho | 668 | **100%** (668) | 47,139 | **100.000%** | ❌ **hidden** | **`new_app_status='not_available'`** + no welcome clip |
| 12 | `zho_for_tam` | tam→zho | 668 | **100%** (668) | 39,054 | **100.000%** | ❌ **hidden** | **`new_app_status='not_available'`** + no welcome clip |
| 13 | `kor_for_hin` | hin→kor | 668 | **100%** (668) | 48,120 | **100.000%** | ❌ **hidden** | **`new_app_status='not_available'`** |
| 14 | `kor_for_tam` | tam→kor | 668 | **100%** (668) | 46,809 | **100.000%** | ❌ **hidden** | **`new_app_status='not_available'`** |

All 14 exist. None is missing. Every course is fully decomposed (668/668 `decomposed_at`) and every course's delivery index is fresh.

**Programme totals:** 9,352 seeds · 19,404 LEGOs (18,774 new) · 176,550 practice phrases · 634,692 audio slots, 634,691 linked · 641,973 clip rows.

---

## The four things actually worth doing

**1. Four finished courses are invisible, and it is one field.**
`zho_for_hin`, `zho_for_tam`, `kor_for_hin`, `kor_for_tam` are 668/668 approved, 100% audio, delivery index fresh — and `status='draft'`, `visibility='hidden'`, `new_app_status='not_available'`. The learner catalogue gate is exactly one filter (`ssi-learning-app/api/courses/available.ts:35`):

```
.in('new_app_status', ['live', 'beta'])
```

Nothing else gates them. Flipping that field publishes four complete courses. Before flipping the two Mandarin ones, note they have **no welcome clip** (every other 12 courses has one) — that is the only real content gap left in the whole programme.

**2. `eng_for_mar` is live with 18 unresolved flagged seeds.**
It is the only course below 99% approval (650/668) and it is already `new_app_status='live'`. All 18 were flagged 2026-07-30 and still carry `status='released'`, so learners are getting them now. Its audio-pass request (fulfilled 2026-08-02) names the queue explicitly: *"regen complete — 650 approved, 18-seed rebuild queue (Kai)"*. The 18: S0114, S0118, S0123, S0124, S0149, S0159, S0195, S0201, S0204, S0223, S0235, S0236, S0237, S0238, S0241, S0245, S0248, S0269.

**3. Two learner-facing defects, both precisely located.**

- **Cross-course audio leak.** LEGO `S0089L03` in **`eng_for_tam`** and in **`eng_for_sin`** both link their known-side clip to a `course_audio` row owned by **`zho_for_jpn`**, voiced `azure_ja-JP-ShioriNeural`, text `短.` — a Japanese voice reading a Chinese character. Tamil and Sinhala learners hear that where their own language should be. Exactly 2 slots programme-wide; I swept all 14 courses and there are no others.
- **Voice-1 / voice-2 collision in `eng_for_tel`.** 10 LEGO `target1` slots are linked to the *target2* (male, `gfzdpspr5fdp`) voice, so voice 1 and voice 2 are the same speaker on those LEGOs: S0040L02, S0095L01, S0154L01, S0162L01, S0190L01, S0281L01, S0642L01, S0649L01, S0651L01, S0653L01.

**4. The known-side voice flip stopped half-way through the programme.**
The xAI `eve` known-side voice was applied to the Hindi- and Bengali-known courses only. The other eight English courses are still on Azure neural voices:

| Known-side voice | Courses |
|---|---|
| xAI `eve` (new) | `eng_for_hin` (14,353 linked), `eng_for_ben` (14,280), `kor_for_hin` (15,540), `zho_for_hin` (15,262) |
| Azure neural (old) | `eng_for_guj` Dhwani · `eng_for_kan` Sapna · `eng_for_mar` **Manohar** · `eng_for_pan` Vaani · `eng_for_sin` Sameera · `eng_for_tam` Saranya · `eng_for_tel` Shruti · `eng_for_urd` Uzma · `kor_for_tam` Saranya · `zho_for_tam` Saranya |

This is a consistency call, not a defect — but it is a visible one, and it is not tracked anywhere. **Worth a specific look: `eng_for_mar` is the only course in the programme on a male known-side voice** (`mr-IN-ManoharNeural`); every sibling uses a female one. If that was not deliberate, it is a whole course's prompts in the wrong register.

---

## Audio state in detail

Measured two independent ways and they agree (see Calibration). Per-course, on the linked set:

| Course | Slots in scope | Linked | Dangling refs | No S3 object | Zero duration | Outstanding TTS work |
|---|---|---|---|---|---|---|
| `eng_for_ben` | 44,681 | 44,681 | 0 | 0 | 0 | none |
| `eng_for_guj` | 49,607 | 49,607 | 0 | 0 | 0 | none |
| `eng_for_hin` | 44,522 | 44,522 | 0 | 0 | 0 | none |
| `eng_for_kan` | 50,799 | 50,799 | 0 | 0 | 0 | none |
| `eng_for_mar` | 46,158 | 46,158 | 0 | 0 | 0 | none |
| `eng_for_pan` | 44,997 | 44,997 | 0 | 0 | 0 | none |
| `eng_for_sin` | 42,301 | 42,301 | 0 | 0 | 0 | none |
| `eng_for_tam` | 45,356 | 45,356 | 0 | 0 | 0 | none |
| `eng_for_tel` | 44,709 | 44,709 | 0 | 0 | 0 | **1 presentation text to author** |
| `eng_for_urd` | 40,440 | 40,440 | 0 | 0 | 0 | none |
| `kor_for_hin` | 48,120 | 48,120 | 0 | 0 | 0 | none |
| `kor_for_tam` | 46,809 | 46,809 | 0 | 0 | 0 | none |
| `zho_for_hin` | 47,139 | 47,139 | 0 | 0 | 0 | none (welcome clip absent) |
| `zho_for_tam` | 39,054 | 39,054 | 0 | 0 | 0 | none (welcome clip absent) |

Phase-8 `/needs` confirms `toGenerate=0`, `toLink=0`, `ungeneratable=0`, `storageBroken=0` for all 14, and `readyForGenerate=true` with `missingLegoPresentations=0` for all 14. The single item of TTS work in the entire programme is one presentation text in `eng_for_tel` (`toAuthor=1`).

**Audio-pass queue — 7 of 14 sit `pending`, but most are stale bookkeeping, not work:**

| Course | Status | Reason (verbatim, abbreviated) | Real? |
|---|---|---|---|
| `eng_for_hin` | pending | voice flip to xAI eve (hi) — full known-side generation needed | **No — already done.** 14,353 `eve` clips linked; identical `eng_for_ben` request was closed 08-03 |
| `eng_for_kan` | pending | regen complete — full course audio-ready | No — reason says complete |
| `eng_for_tam` | pending | regen complete — 667 approved (S141 unfillable RED) | Only S0141 |
| `eng_for_tel` | pending | regen complete — 667 approved (S547 native gender call) | Only S0547 |
| `kor_for_hin` | pending | final pass complete — 668/668 approved 07-30 | No |
| `kor_for_tam` | pending | final pass complete — 668/668 approved 07-30 | No |
| `zho_for_hin` | pending | final pass complete — 668/668 approved 07-30 | No |
| `eng_for_ben`, `eng_for_guj`, `eng_for_mar`, `eng_for_pan`, `eng_for_sin`, `eng_for_urd`, `zho_for_tam` | fulfilled | — | — |

Six of the seven `pending` rows describe *completed* work. The queue is over-reporting outstanding work by 6 courses; only `eng_for_tam`/`eng_for_tel` name a live item, and each is a single seed.

**Shared audio (per known language) is complete** — encouragement 50/48-required, instruction 48/48, paywall 101, for all ten known languages. Gap: `bookend_listen_intro`/`outro` are absent for **kan, mar, tel** (present for ben, guj, hin, pan, sin, tam, urd). Those are the three `live` courses.

**97,259 orphaned clip rows** — clips that exist in `course_audio` but are referenced by no seed, LEGO or phrase. These are the residue of text edits and revoicing (an edit nulls the link and a new clip is rendered; the old row stays). Not a defect and nothing is broken by them, but it is real storage and it maps the edit history exactly:

| Course | Clip rows | Orphaned | % |
|---|---|---|---|
| `eng_for_tam` | 55,618 | 17,378 | 31.2% |
| `eng_for_sin` | 51,473 | 14,261 | 27.7% |
| `eng_for_urd` | 47,140 | 11,273 | 23.9% |
| `eng_for_hin` | 51,279 | 11,967 | 23.3% |
| `eng_for_guj` | 53,263 | 12,129 | 22.8% |
| `eng_for_ben` | 49,356 | 11,235 | 22.8% |
| `eng_for_pan` | 51,248 | 11,468 | 22.4% |
| `eng_for_tel` | 40,952 | 3,923 | 9.6% |
| `eng_for_kan` | 44,689 | 3,431 | 7.7% |
| `eng_for_mar` | 39,373 | 194 | 0.5% |
| `zho_for_hin`, `zho_for_tam`, `kor_for_hin`, `kor_for_tam` | 157,582 | **0** | 0.0% |

The four non-English courses have **zero** orphans — they were generated once and never revoiced. The seven English courses above 22% are the ones that went through the July text-fix and voice-flip campaigns. Any cleanup needs a deletion plan and approval per the audio doctrine; I have not touched them.

*Precision note:* the orphan count moves with the definition of "referenced". A second independent count that also consulted `lego_introductions` landed on ~104,000 rather than 97,259. Treat the figure as **97k–104k**, i.e. roughly a quarter of the English courses' clip rows. The shape of the finding — heavy in the revoiced English courses, zero in the four non-English ones — is identical under both definitions.

**Duplicate clip rows: structurally zero.** A unique constraint (`unique_course_audio_per_voice`) on (course_code, text_normalized, role, voice_id) makes duplicates impossible to insert. This is guaranteed-clean rather than measured-clean, which is worth distinguishing.

**Stray voices — checked and explained, no live defect.** A scan for voice IDs outside each course's `voice_config` turns up mostly naming-convention noise (config stores `eve`/`bedd6226`; `course_audio` stores provider-prefixed `xai_eve`/`azure_…` from different pipeline eras). Two apparent anomalies resolve on inspection:
- `leo`, ~461 rows in each of seven English courses, is **not** cross-course contamination — 3,227 of its 3,228 rows are `role='pod_explainer'`, the listening-pod narrator, present exactly where pods exist.
- The genuinely odd rows are 8 clips in `eng_for_sin` (7 `sal`, 1 `leo`) carrying dialogue text like *"A large Sauvignon Blanc, please."* in `target1`. **All 8 are orphaned, none is linked**, so nothing live speaks in the wrong voice.

The only live voice defects in the programme are the two named under "Two learner-facing defects" above.

---

## Content depth — no course is behind its siblings

I checked for the "one course quietly half-built" pattern and did not find it. Every course has LEGOs on all 668 seeds, and density sits in a narrow band:

| Course | LEGOs (new) | Phrases | New LEGOs/seed | Phrases/new LEGO |
|---|---|---|---|---|
| `zho_for_tam` | 1,163 (1,161) | 10,800 | 1.74 | 9.30 |
| `eng_for_urd` | 1,169 (1,158) | 11,257 | 1.73 | 9.72 |
| `eng_for_sin` | 1,300 (1,240) | 11,719 | 1.86 | 9.45 |
| `eng_for_tel` | 1,504 (1,428) | 12,255 | 2.14 | 8.58 |
| `eng_for_hin` | 1,327 (1,274) | 12,421 | 1.91 | 9.75 |
| `eng_for_ben` | 1,323 (1,280) | 12,476 | 1.92 | 9.75 |
| `eng_for_tam` | 1,421 (1,358) | 12,577 | 2.03 | 9.26 |
| `eng_for_pan` | 1,323 (1,263) | 12,587 | 1.89 | 9.97 |
| `eng_for_mar` | 1,407 (1,389) | 12,848 | 2.08 | 9.25 |
| `kor_for_tam` | 1,527 (1,503) | 12,907 | 2.25 | 8.59 |
| `zho_for_hin` | 1,418 (1,353) | 13,176 | 2.03 | 9.74 |
| `kor_for_hin` | 1,523 (1,500) | 13,349 | 2.25 | 8.90 |
| `eng_for_guj` | 1,445 (1,424) | 13,948 | 2.13 | 9.79 |
| `eng_for_kan` | 1,554 (1,443) | 14,230 | 2.16 | 9.86 |

`zho_for_tam` and `eng_for_urd` are the thinnest (10,800 and 11,257 phrases against `eng_for_kan`'s 14,230) but at 1.73–1.74 new LEGOs/seed and ~9.5 phrases each they are within normal variation for a language pair, not evidence of an incomplete build.

**Delivery index (`course_round_index`) is fresh for all 14** — its row count equals each course's **new**-LEGO count exactly, in all fourteen cases: ben 1,280 · guj 1,424 · hin 1,274 · kan 1,443 · mar 1,389 · pan 1,263 · sin 1,240 · tam 1,358 · tel 1,428 · urd 1,158 · kor_hin 1,500 · kor_tam 1,503 · zho_hin 1,353 · zho_tam 1,161. No course has the stale-view "one seed then INF PLAY" failure.

> Worth stating because it is an easy false alarm: comparing the view against the **total** LEGO count makes all 14 look stale by 2–111 rows. It isn't — a round is the introduction of a *new* LEGO, so the view indexes `is_new` LEGOs only. Against the right denominator the match is exact, 14 for 14.

Two further delivery facts, from reading the serving code: `round-map.ts` returns a 503 (not a 404) if the view has no rows for a course, and `_utils/courseBoundary.ts` can truncate a course to `MVP_MAX_SEED=300` — but only for course codes hardcoded in `COURSE_MAX_SEED`, currently just `ara_lb_for_eng`/`ara_eg_for_eng`. **None of the 14 is truncated**; each serves its full authored length. `course_export_states` has 0 rows for all 14, consistent with the export/manifest path being legacy and off the learner path.

---

## Calibration

Kai's rule: an uncalibrated count is not evidence. **Calibration course: `eng_for_tel`.**

I derived the audio ledger in SQL as `seeds×3 + legos×3 + new-lego presentations + phrases×3`, then compared it against the running system — phase-8 on `localhost:3465`, which is the same code path the Generate button uses and the same number the dashboard's audio widget displays via `/api/production/:code/audio-stats`.

- My SQL for `eng_for_tel`: **44,709 linked**.
- Phase-8 `/needs/eng_for_tel`: `ledger.linked = 44709`, `inScope = 44710`.

Exact match on linked. The single-slot difference in scope is phase-8 counting the one presentation whose text is not yet authored (`toAuthor: 1`) — a slot that has no row for my query to find, which is the correct behaviour of both counters.

I then re-checked the match on three further courses rather than trusting one: `eng_for_hin` (mine 44,522 / phase-8 `inScope` 44,522), `zho_for_hin` (47,139 / 47,139), `zho_for_tam` (39,054 / 39,054). Exact on all three. The method is calibrated against the running system.

Two findings that this discipline caught, and which a naive read would have got wrong:
- `presentation` audio is only required for `is_new` LEGOs. Counting it for all LEGOs invents a false gap (76 phantom missing presentations in `eng_for_tel` alone).
- Practice-phrase presentation clips are **not** in the audio ledger's scope. Including them inflates the denominator by ~1,250 per course.

---

## Explicit gaps — what I could NOT measure

Reported honestly rather than papered over.

1. **No clip has been machine-verified against its text.** `course_audio.veracity_checked_at` is NULL for **all 641,973 clips across all 14 courses** — 0.0% checked, so the 0 failures is a vacuous zero, not a pass. This is not neglect: the veracity checker appears newly built and has so far been run on one course only (`deu_for_eng`, 980 clips, checked today 2026-08-06). So **"100% audio" here means every slot has a real, non-zero-length clip attached — it does not mean the clip says the right words.** Nothing in the DB can currently tell you that for these 14.
2. **No human has signed off a playthrough of any of these courses.** `audio_clip_signoffs` has **0 rows** for all 14; `audio_clip_flags` has **0 rows in the entire table**, for every course in the DB — that pipeline stage has never been used. `audio_repair_candidates` is also empty for all 14. The legacy `audio_flags` table has rows for 9 of the 14 and **every one is `resolved`** (`eng_for_kan` 2,636, `eng_for_tel` 1,940, `eng_for_sin` 480, the rest 22–56) — but `eng_for_mar` and all four non-English courses have **zero rows**, meaning they never went through that pass at all rather than passing it. Combined with gap 1, the honest summary is: **no clip in these 14 has been verified as correct by machine or by ear.**
3. **`course_qa_gate` says `unpassed` for all 14 — I am reporting this as meaningless, not as a blocker.** The table reads `unpassed` for all **143** courses in the DB including released flagships (`fra_for_eng`, `spa_for_eng`); `course_round_signoffs` is **completely empty (0 rows)**; and `grep` finds **no reference to either table anywhere** in this repo or in `ssi-learning-app`. It is a dormant schema, not a live gate. Its `required_rounds = 100` should not be read as outstanding work.
4. **I did not verify S3 objects physically exist.** I verified every linked clip has a non-null, non-`pending/` `s3_key` and a non-zero `duration_ms` in the DB. I did not HEAD the bucket. A row whose object was deleted out from under it would not show up in my counts.
5. **No listening-by-ear check.** Everything here is structural. Whether `eng_for_mar`'s Manohar voice, or the Azure-vs-eve split, sounds right is a judgement only Kai or a native speaker can make.
6. **`export_ready` is `false` for all 14** and `released_at` is NULL for all 14, including the three `live` courses. I could not find the code that sets either field, so I cannot say whether they are live gates or, like `course_qa_gate`, vestigial. Flagged rather than interpreted.
7. **Phrase-level `qa_checked` is 0 for all 14** — but this field was last written in **March 2026** and only for an older cohort (`eng_for_jpn`, `spa_for_eng` etc.). It looks superseded, so I am not counting it as a gap in these courses' QA.

---

*Measured 2026-08-06 against the live Supabase DB and the running phase-8 audio service (`localhost:3465`, commit `b3eda193`) and production API (`localhost:3470`). Read-only throughout: no writes, no approvals, no TTS, no regeneration.*
