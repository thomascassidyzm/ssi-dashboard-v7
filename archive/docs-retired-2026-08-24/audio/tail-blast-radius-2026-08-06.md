# Estate-wide tail-truncation blast radius: measurement

2026-08-06. Read-only throughout — no S3 object or DB row was written, modified or deleted. Live `ssi-audio-stage` HeadObject / ListObjectVersions / GetObject calls plus live `course_audio` / `course_audio_revisions` Postgres queries. Objects were downloaded to `/tmp` for `ffprobe` and deleted after each probe. Scripts in gitignored `scripts/tail-blast/`.

---

## Headline

**The size test the brief asked for does not work, and I am not reporting numbers from it.** It fails for a specific, provable reason: `course_audio.duration_ms` is not an independent record of intended duration. Whatever shortened the audio also rewrote the duration in the database, so the DB agrees with the damaged object and the arithmetic sees nothing.

I built a replacement whose reference the truncating process did not control — **S3 object version history** — and swept it across the entire bucket. Its answer:

- **Currently-linked clips carrying measurable surviving in-place truncation: 0** (95% upper bound ≤193 of 2,544,787).
- The one estate-wide byte-shrinking event that touches live audio (**2026-05-22 → 05-29**, 18,522 linked rows) is a **duration-preserving re-encode** from VBR ~100–120 kbps to 96 kbps CBR. `ffprobe` of 300 old-vs-current version pairs: **0 lost a single millisecond**.
- Genuine truncation events **do** exist in the bucket's history — pre-Nov 2025, Dec 2025, Feb 2026 — but every key they damaged is now **unlinked** from `course_audio`.
- **The 2026-08-03 damage Tom heard is invisible to version history.** There is no byte-shrink event anywhere in the bucket after 2026-06-27. The damaged clips sit on objects with exactly **one** version, written on 2026-08-03, no delete markers, no null version IDs — while their DB rows were created weeks to months earlier. That event did not overwrite versioned objects; it wrote fresh ones. **This is an explicit gap: I cannot size per-clip truncation for it from metadata.**

What I *can* size exactly for that event is its footprint: **404,299 currently-linked clips (15.89% of the estate) point at an audio object that did not exist when their row was created**, 203,773 of them written on 2026-08-03 alone.

---

## 1. The detector, and how it was calibrated

MP3 at constant bitrate obeys `bytes = rate × ms + header`. Calibrating on 600 clips/course across three courses showed the relation is essentially deterministic, and that the spread in the raw `bytes/ms` ratio is entirely the fixed header amortised over duration:

| voice group | n | ratio p1 | p50 | p99 | fitted |
|---|---:|---:|---:|---:|---|
| deu_for_eng / eve | 225 | 12.046 | 12.164 | 12.886 | `bytes = 12.0010·ms + 289` |
| deu_for_eng / ara | 172 | 12.069 | 12.185 | 13.048 | `bytes = 12.0000·ms + 288` |
| spa_for_eng / azure_es-ES-AlvaroNeural | 125 | 12.048 | 12.089 | 12.159 | `bytes = 12.0000·ms + 288` |
| eng_for_tam / azure_ta-LK-SaranyaNeural | 142 | 12.059 | 12.110 | 12.306 | `bytes = 12.0000·ms + 288` |
| deu_for_eng / comp:leo | 9 | 24.257 | 24.478 | 24.670 | `bytes = 24.0000·ms + 620` |

So: **12.000 bytes/ms (96 kbps) with a 288-byte header** is the dominant family, with a second family at 24.000 bytes/ms (192 kbps). Rather than assume 12.3 bytes/ms globally, the sweep calibrates **per `(course_code, voice_id)` group**: it takes the modal CBR family across {8, 12, 16, 24, 32} bytes/ms, then the median residual as that group's header. Groups whose healthy clips do not obey a tight CBR law (IQR of the residual > 40 ms — VBR and `legacy_import` Welsh material) are marked **unmeasurable** and never flagged.

Threshold chosen: **lostMs ≥ 50**. Justification: in a 5,734-clip sample spread across all 133 courses, **5,453 (95.10%) sit at exactly 0 ms**, and p5 through p95 are all exactly 0.0. The noise floor in well-behaved groups is under 30 ms, so 50 ms is comfortably clear of it.

### Ratio histogram (broad sample, 5,734 clips, 133 courses)

| lostMs bucket | count |
|---|---:|
| < −50 | 68 |
| −50 … 5 | 5,501 |
| 5 … 25 | 22 |
| 25 … 50 | 1 |
| 50 … 100 | 1 |
| 100 … 250 | 8 |
| 250 … 500 | 37 |
| 500 … 1000 | 44 |
| ≥ 1000 | 52 |

---

## 2. Validating the detector — it fails, and here is the proof

### 2a. The size→duration inversion itself is near-exact

`course_audio_revisions.previous_duration_ms` is a duration **measured independently at repair time**, on the pre-repair object. Running the inversion against those objects:

- **90 / 96** reproduce `previous_duration_ms` **exactly**.
- **91 / 96** land within one 24 ms MP3 frame. Residuals across the whole set: 0, 24, 28, 42, 46 ms.

So converting bytes to duration works. The arithmetic is sound.

### 2b. But it detects none of the ear-confirmed damage

Against the word-loss listening/ASR scan (`docs/audio-repair-2026-08-06/deu-wordloss.json`, 600 clips checked, 93 flagged `truncated:true`), using the currently-linked objects:

| threshold | ear-truncated caught | size-flagged but ear-clean |
|---|---:|---:|
| ≥ 25 ms | **0 / 93** | 0 / 507 |
| ≥ 50 ms | **0 / 93** | 0 / 507 |
| ≥ 100 ms | **0 / 93** | 0 / 507 |
| ≥ 200 ms | **0 / 93** | 0 / 507 |

`lostMs` for the 93 ear-truncated clips: 80 of them are **exactly 0**; the rest are small negatives (−46 … −24). The ear-clean 507 are p50 = p95 = p99 = max = 0. The two populations are indistinguishable.

### 2c. Why: the DB records the damaged duration

Three independent confirmations that `duration_ms` tracks whatever bytes are in S3 now, rather than what was intended:

**(i)** `ffprobe` of 15 currently-linked, ear-confirmed-truncated `deu_for_eng` clips — `duration_ms` agrees with the **live, damaged** object within 24–44 ms in **15/15**:

| db_duration_ms | ffprobe_ms | delta | bytes | kbps |
|---:|---:|---:|---:|---:|
| 696 | 664 | 32 | 8,640 | 104 |
| 960 | 928 | 32 | 11,808 | 102 |
| 7,464 | 7,440 | 24 | 89,856 | 97 |
| 8,280 | 8,256 | 24 | 99,648 | 97 |
| 840 | 798 | 42 | 10,368 | 104 |
| 11,136 | 11,112 | 24 | 133,920 | 96 |

**(ii)** 667 rows carry an insert-time `file_size_bytes`. Comparing to live `ContentLength`: 645 identical, 14 grew, **8 shrank in place**. For those 8, `duration_ms` matches the **current (shrunken)** size in 6 and the **original** size in **0**. Example: `cym_n_for_eng` 704,095 → 532,224 bytes, `duration_ms` = 43,990, which is the current size at 12 bytes/ms — not the original's 58,651.

**(iii)** The brief's founding evidence is an artefact of the probe. `scripts/tail-forensics/probe-duration.cjs` reads `course_audio.duration_ms` (already updated to the **post-repair** value) and `ffprobe`s `previous_s3_key` (the **pre-repair** object). "5208 → 4138" is the repaired duration measured against the damaged file. It never showed that `duration_ms` was written at insert and left stale.

### 2d. And its flags are almost all encoding artefacts

`ffprobe` of 23 clips the size test flagged in courses other than `deu_for_eng`: **22 are variable-bitrate outliers** (56–92 kbps, where the voice group's modal family is 96 kbps), with actual duration within 24–36 ms of the DB. Exactly **1** was a real mismatch (`spa_for_eng`, db 3,840 ms vs actual 3,312 ms).

**Verdict: the detector does not validate. Zero recall, ~4% precision. No blast-radius numbers are reported from it.**

### 2e. A second reference tried and rejected: text length

Regressing `duration_ms` on the character count of the clip's own `text`, fitted robustly per `(voice_id, role, language)` group over 47,098 `deu_for_eng` clips (18 groups):

- Median shortfall vs expectation: ear-truncated **+8 ms**, ear-clean **−123 ms** — a real 131 ms population shift.
- But per-clip it does not separate: at z ≥ 1, recall 13/60 (22%) at 5.9% false-positive; at z ≥ 2, recall 3% at 0.9% FP.

Usable as a population estimator, useless as a per-clip detector. Not used.

---

## 3. The measurement that does work: S3 object version history

S3 recorded the pre-event byte count itself. That reference is completely independent of Postgres.

**Full bucket enumeration** (256 hex prefixes over `mastered/`, paged `ListObjectVersions`, 885 s):

| | |
|---|---:|
| distinct keys | 5,048,251 |
| object versions | 7,388,425 |
| keys with >1 version | 1,996,352 |
| keys with exactly 1 version | 3,051,899 |
| keys carrying a `null` version ID | **0** |
| byte-shrink events | 58,650 |
| distinct keys that ever shrank | 53,988 |
| keys whose **current** object is the shrunken one | 44,039 |

`nullVer = 0` matters: versioning was **never suspended**. Every write since versioning was enabled created a version, so a single-version key was written exactly once, ever.

### Shrink events by day

`2025-06-19` 1,264 · `2025-12-01` 5,009 · `2025-12-04` 4,564 · `2026-02-13` 266 · `2026-02-14` 255 · `2026-02-17` 190 · `2026-02-18` 466 · `2026-04-24` 628 · `2026-05-11` 839 · `2026-05-13` 648 · `2026-05-14` 607 · `2026-05-23` 3,544 · `2026-05-24` 5,722 · **`2026-05-25` 30,706** · `2026-05-27` 688 · `2026-05-29` 659 · `2026-06-27` 756.

**Nothing after 2026-06-27.**

### Shrink ≠ truncation — separated by ffprobe

A smaller file is either a lower-bitrate re-encode (duration kept) or a cut tail (duration lost). Size alone cannot tell them apart; only decoding both versions can. 208 old-vs-current version pairs, stratified by event cluster and by relative size loss:

| cluster | probed | real duration loss > 50 ms | p(real) | median loss |
|---|---:|---:|---:|---:|
| **may2026** (all 4 size bands) | 48 | **0** | **0.00** | — |
| **jun2026** | 12 | **0** | **0.00** | — |
| dec2025 | 48 | 45 | 0.94 | 425–1,592 ms |
| feb2026 | 41 | 41 | 1.00 | 288–3,780 ms |
| pre-nov2025 | 48 | 38 | 0.79 | 75–5,060 ms |
| aprmay2026 | 5 | 5 | 1.00 | 540–576 ms |

Old-version bitrates ranged 57–213 kbps; current objects are 96–99 kbps. The May 2026 event is unambiguously a **VBR → 96 kbps CBR re-encode**: in every probed pair the two durations matched to the millisecond (e.g. `bre_for_eng` 26,889 → 26,889 ms, 116 → 96 kbps; `cat_for_spa` 64,800 → 64,800 ms, 112 → 96 kbps).

The genuinely truncating clusters look like this — note the duration falling while bitrate *rises*, the signature of a trim-and-re-encode:

```
mastered/07A08430-…  73344->72212 bytes,  9168->6220 ms  (64->93 kbps)  2025-12-04
mastered/150479A5-…  257088->250191 bytes, 10639->10351 ms (193->193 kbps) 2026-02-17
mastered/53046EB1-…  51456->45500 bytes,   6432->4307 ms  (64->85 kbps)  2025-12-04
```

### Which of it survives into live content

| | |
|---|---:|
| keys whose current object is shrunken | 44,039 |
| of those, linked from `course_audio` | **12,089 keys / 19,278 rows** |
| linked rows in the **may2026** cluster | 18,522 |
| linked rows in the **jun2026** cluster | 756 |
| linked rows in any truncating cluster | **0** |

Every key damaged by the Dec 2025 / Feb 2026 / pre-Nov 2025 truncation events is **no longer referenced** by `course_audio`.

**Confirmation on the exact population that matters:** 300 randomly-spread linked shrunken keys, `ffprobe`d old-version vs current — **0 / 300 lost any duration**. Sample spanned `2026-05-25` (208), `2026-05-23` (65), `2026-06-27` (20), `2026-05-24` (3), `2026-05-22` (2), `2026-05-26` (2).

### Per-course blast radius from version history

| course | total clips | linked shrunken rows | **truncated (measured)** | mean ms lost |
|---|---:|---:|---:|---:|
| *all 133 courses* | 2,544,787 | 19,278 | **0** | — |

**Every course is clean on this measure.** The 133 course codes with audio all return zero surviving in-place truncation. Uncertainty: 0/300 probed → 95% upper bound (rule of three) 1.00% of the 19,278 linked shrunken rows, i.e. **≤ 193 clips estate-wide**.

---

## 4. The 2026-08-03 event — what it is, and the explicit gap

The damage Tom heard is real (93/600 sampled `deu_for_eng` clips, 15.5%, `truncated:true` by the word-loss scan). It is **not** an in-place shrink of a versioned object:

- **No byte-shrink event exists anywhere in the bucket after 2026-06-27.**
- Of the 93 ear-confirmed truncated clips: **91 have exactly one surviving version**, 2 have two. **0 have delete markers. 0 have null version IDs.**
- **91/93** have an earliest surviving version that **postdates the DB row's own `created_at`** — e.g. row created `2026-01-17 04:20:52`, only version `2026-08-03 19:17:53`.

With versioning enabled continuously and no null version IDs bucket-wide, that state has only two explanations: the prior versions were **permanently deleted** (a versioned delete leaves no marker), or **fresh keys were written and the rows repointed at them**. Either way the pre-event content is gone from S3 and **version history cannot size this event's truncation**. That is the gap; I am not papering over it.

### What I can measure exactly: the event's footprint on live content

Enumerating every key whose newest version lands on/after 2026-07-01: **1,475,504 keys, of which 1,475,501 are single-version** (no prior content in S3 at all). By day: `2026-08-03` **235,895** · `2026-07-29` 231,617 · `2026-07-31` 150,860 · `2026-08-01` 141,149 · `2026-07-11` 160,247 · `2026-08-02` 110,461.

Joining to `course_audio`: **404,299 currently-linked rows (15.89% of 2,544,787) point at an object written more than an hour after their own row was created**, and **all 404,299 are single-version** — the previous audio for those slots is not recoverable from S3.

By the day the object was written: `2026-08-03` **203,773** · `2026-07-29` 141,605 · `2026-07-20` 42,467 · `2026-07-16` 3,868 · `2026-07-27` 2,815 · `2026-07-14` 2,594 · `2026-08-04` 1,284 · `2026-08-05` 227.

| course | total clips | object written Jul/Aug | object POSTDATES its row | % of course | written 1–4 Aug |
|---|---:|---:|---:|---:|---:|
| kor_for_hin | 43425 | 43424 | 43424 | 100.00% | 43424 |
| deu_for_eng | 47266 | 45942 | 42606 | 90.14% | 42426 |
| spa_for_eng | 78163 | 54108 | 36024 | 46.09% | 1 |
| kor_for_eng | 58407 | 46388 | 28209 | 48.30% | 0 |
| kor_for_tam | 42530 | 42144 | 26950 | 63.37% | 26928 |
| jpn_for_eng | 52904 | 42125 | 25267 | 47.76% | 0 |
| eng_for_kan | 44689 | 41109 | 24211 | 54.18% | 5843 |
| eng_for_tel | 40952 | 37837 | 22324 | 54.51% | 4591 |
| eng_for_ben | 49356 | 25740 | 22288 | 45.16% | 22288 |
| eng_for_hin | 51279 | 26479 | 22275 | 43.44% | 22275 |
| zho_for_tam | 32166 | 31824 | 20255 | 62.97% | 20255 |
| eng_for_tam | 55618 | 21776 | 12866 | 23.13% | 3281 |
| eng_for_guj | 53263 | 20862 | 12550 | 23.56% | 1242 |
| eng_for_pan | 51248 | 20140 | 11996 | 23.41% | 1043 |
| eng_for_urd | 47140 | 17174 | 10290 | 21.83% | 1063 |
| eng_for_sin | 51473 | 19615 | 10280 | 19.97% | 10280 |
| fra_ca_for_eng | 61030 | 35124 | 8432 | 13.82% | 0 |
| eng_for_mar | 39373 | 36190 | 8244 | 20.94% | 143 |
| hrv_for_eng | 28079 | 6609 | 3535 | 12.59% | 0 |
| ita_for_eng | 50132 | 5226 | 2968 | 5.92% | 0 |
| deu_at_for_eng | 39484 | 35445 | 2664 | 6.75% | 0 |
| glg_for_eng | 15931 | 13467 | 2594 | 16.28% | 0 |
| ben_for_eng | 20311 | 18000 | 1699 | 8.36% | 0 |
| fra_for_eng | 51369 | 35212 | 883 | 1.72% | 249 |
| ell_for_eng | 28704 | 1972 | 601 | 2.09% | 0 |
| zho_for_eng | 40956 | 17541 | 140 | 0.34% | 0 |
| bul_for_eng | 19277 | 1139 | 128 | 0.66% | 0 |
| est_for_eng | 20163 | 1056 | 106 | 0.53% | 0 |
| fas_for_eng | 26192 | 1183 | 94 | 0.36% | 0 |
| ara_eg_for_eng | 21572 | 1257 | 93 | 0.43% | 0 |
| ara_sy_for_eng | 2589 | 1100 | 91 | 3.51% | 0 |
| zho_for_hin | 39461 | 39461 | 50 | 0.13% | 50 |
| eus_for_eng | 28486 | 2721 | 31 | 0.11% | 0 |
| deu_for_zho | 17214 | 221 | 25 | 0.15% | 0 |
| ara_for_eng | 43511 | 20879 | 21 | 0.05% | 0 |
| fra_for_zho | 16728 | 318 | 19 | 0.11% | 0 |
| eng_for_jpn | 53567 | 425 | 16 | 0.03% | 0 |
| heb_for_eng | 21917 | 1187 | 8 | 0.04% | 0 |
| ita_for_zho | 16812 | 94 | 8 | 0.05% | 0 |
| lit_for_eng | 23288 | 1242 | 6 | 0.03% | 0 |
| lav_for_eng | 20198 | 971 | 6 | 0.03% | 0 |
| por_br_for_eng | 47733 | 22493 | 6 | 0.01% | 0 |
| isl_for_eng | 19678 | 1205 | 3 | 0.02% | 0 |
| ron_for_eng | 22181 | 1181 | 3 | 0.01% | 0 |
| ukr_for_eng | 19412 | 72 | 3 | 0.02% | 0 |
| tha_for_eng | 18788 | 1774 | 2 | 0.01% | 0 |
| cat_for_spa | 22257 | 38 | 2 | 0.01% | 0 |
| eng_for_por | 19419 | 116 | 1 | 0.01% | 1 |
| spa_mx_for_eng | 43748 | 17042 | 1 | 0.00% | 0 |
| cat_for_eng | 20857 | 1161 | 1 | 0.00% | 0 |
| **TOTAL** | **2,544,787** | **896,436** | **404,299** | **15.89%** | |

**The other 83 course codes have zero rows whose object postdates the row** — their audio has never been rewritten after insert: `eng_for_spa`, `hin_for_eng`, `eng_for_ita`, `hye_for_eng`, `nep_for_eng`, `ita_for_jpn`, `eng_for_fra`, `eng_for_kor`, `eng_for_deu`, `afr_for_eng`, `hun_for_eng`, `srp_for_eng`, `mlt_for_eng`, `rus_for_eng`, `ces_for_eng`, `tur_for_eng`, `eus_for_spa`, `gle_for_eng`, `fra_for_jpn`, `pol_for_eng`, `nor_for_eng`, `por_for_eng`, `spa_for_zho`, `spa_for_jpn`, `swa_for_eng`, `nld_for_eng`, `swe_for_eng`, `eng_for_zho`, `zho_for_jpn`, `cym_anthem_for_jpn`, `cym_n_for_eng`, `eng_for_ara`, `dan_for_eng`, `deu_for_jpn`, `ara_lb_for_eng`, `cym_s_for_eng`, `gla_for_eng`, `tel_for_eng`, `mar_for_eng`, `bre_for_eng`, `bre_for_fra`, `zho_for_gle`, `fin_for_eng`, `sbx_for_eng`, `eng_template`, `zzz_test_for_eng`, plus 37 single-clip stub codes.

---

## 5. What the damage clusters on

### The rewrite selected on course and voice, not on role or era

Of the 404,299 rewritten-object rows:

- **origin**: `tts` 404,299 — **100%**. No human or legacy-import audio was touched.
- **role**: `known` 142,629 · `target1` 121,410 · `target2` 116,755 · `presentation` 21,883 · `pod_fine_known` 982 · `pod_take_g` 640. Roughly even across known and target — **it did not select on role**.
- **voice**: `xai_eve` 66,094 · `xai_gfzdpspr5fdp` 61,326 · `xai_bedd6226` 58,692 · `gfzdpspr5fdp` 52,359 · `eve` 44,949 · `xai_ara` 38,192 · `xai_leo` 38,165 · `ara` 13,729 · `leo` 12,894 · `bedd6226` 7,106. Overwhelmingly the **`xai_*` and bare-name in-house voice families**; Azure/narakeet voices appear only in the low thousands.
- **course**: extremely concentrated — `kor_for_hin` 100%, `deu_for_eng` 90.14%, while 83 course codes are at 0%.

### Truncation is enriched in the rewritten population but not confined to it

Joining the word-loss labels to the rewrite population within `deu_for_eng` (600 ear-checked clips):

| population | n | ear-truncated | rate |
|---|---:|---:|---:|
| object **postdates** its row (rewritten) | 415 | 75 | **18.1%** |
| object is the original | 185 | 18 | **9.7%** |

The rewrite roughly **doubles** the truncation rate, but it is not the sole cause — nearly 10% of never-rewritten clips are also truncated. Whatever cuts tails has been operating on the normal render path too, not only in the 2026-08-03 run.

### The May 2026 event, for the record

Of the 5,113 clips a naïve byte-shrink reading would call "truncated" in the May event, **ffprobe says 0 are** — every one is a re-encode. Reporting that 5,113 as a blast radius would have been wrong by 5,113.

---

## 6. Confidence, and the explicit gaps

**Confidence in "0 surviving in-place truncation on linked clips": high.** The reference is S3's own version record, not the database. The bucket was enumerated completely — 5,048,251 keys, no sampling — so the 44,039 shrunken-current keys and the 19,278 linked rows are counts, not estimates. The only inference is the re-encode-vs-truncation call, and that rests on 348 `ffprobe`d version pairs (208 stratified + 300 targeted, overlapping population) of which the linked-population sample returned 0/300. Rule-of-three ceiling: ≤193 clips estate-wide.

**Confidence in the 404,299 rewrite footprint: high.** Exact join, no sampling, no extrapolation.

**Confidence in "how many clips are audibly truncated today": none from me.** That is the gap below.

### Explicit gaps

1. **The 2026-08-03 event cannot be sized from metadata.** Its objects are single-version with no surviving predecessor. Neither byte arithmetic nor version history can say how many of the 203,773 clips written that day lost a tail. Only listening/ASR can — that is the other worker's measurement, and their `deu_for_eng` sample says 15.5%. Naïvely composing 15.5% with 203,773 would give ~31,600 clips, but I have **not** verified that the `deu_for_eng` rate transfers to other courses and I am not asserting it as a measurement.
2. **`course_audio.duration_ms` is corrupted as evidence** for any clip whose object was rewritten. It records the damaged duration. Any future audit must not use it as a reference for intended duration.
3. **The size test's blind spots**, had it worked: sub-24 ms losses are below one MP3 frame and invisible; VBR and `legacy_import` groups (Welsh `cym_*`, `fin_for_eng` `human_recording`, ~1,300 clips in `spa_for_eng`) have no tight CBR law and are unmeasurable by size at all.
4. **`ffprobe` sampling, not census, for the re-encode call.** I probed 348 version pairs, not 44,039. Full-census `ffprobe` of every shrunken key would need ~44,000 downloads.
5. **No permissions were denied and no course was skipped.** All 133 course codes with audio were covered; every S3 object referenced in the version-history analysis was reachable.

---

## 7. Recommendation

Stop looking for the truncation in storage metadata — it is not there. The 2026-08-03 event destroyed its own evidence by writing single-version objects over slots whose prior content is unrecoverable, and it kept `duration_ms` in sync so the database agrees with the damage.

Two things follow. First, the repair scope must be set by **listening** (the word-loss/ASR pass), not by any byte or duration arithmetic, and the 404,299-row rewritten population plus the 42,426 `deu_for_eng` clips written 1–4 August is the right place to point it. Second, the ~10% truncation rate among clips that were **never** rewritten says the tail-cutting code has been shipping damage on the ordinary render path as well — that is the thing worth fixing before any more audio is generated.

---

### Data files (gitignored, `scripts/tail-blast/`)

`versions/summary.json` · `versions/shrinks.json` · `versions/stratified.json` · `versions/tighten.json` · `versions/aug03-event.json` · `versions/recent-keys.json` · `versions/aug-tally.json` · `check1-filesize.json` · `validate-damaged.json` · `validate-earconfirmed.json` · `out/<course>.json`
