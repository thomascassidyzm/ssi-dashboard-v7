# Welcome duration_ms backfill — 2026-08-06

**Done:** 2 rows written (not 4 — two were already correct). **Estate:** 3 welcome rows still NULL, not 3,682. **Guard hole:** confirmed, one-line fix below, **not applied**.

---

## (a) The backfill

Welcome audio is **not** a separate index. It is a row in `course_audio` with `role='welcome'`, one per course, pointing at `s3_key` in bucket `ssi-audio-stage`. Read path verified in `services/phases/generate-legacy-manifest.cjs:257-263`.

I fetched each object from S3 and ran `ffprobe` on it. Measured durations:

| Course | S3 key | ffprobe | Row before | Action |
|---|---|---|---|---|
| **kor_for_hin** | `mastered/86EBBF2F…F122F0.mp3` | **51,840 ms** | NULL | **written** |
| **kor_for_tam** | `mastered/2F0A8615…943267.mp3` | **61,280 ms** | NULL | **written** |
| **zho_for_hin** | `mastered/065DD2DD…D0F3848.mp3` | **51,760 ms** | 51,760 | already correct, untouched |
| **zho_for_tam** | `mastered/DF624A51…2364E709.mp3` | **61,280 ms** | 61,280 | already correct, untouched |

### Two things the brief got wrong — say them out loud

1. **Only two of the four were NULL.** `zho_for_hin` and `zho_for_tam` already carried durations when I looked, and both match my measurement exactly. Somebody wrote them before me.
2. **The pairing of 51,760 does not survive measurement.** 51,760 ms belongs to **zho_for_hin**. The other Hindi welcome, **kor_for_hin, is 51,840 ms** — 80 ms longer, a genuinely different file (622,656 bytes vs 621,792). Had the two known-good numbers been assigned by assumption, kor_for_hin would have been given a value 80 ms short of the truth. Raw ffprobe:

```
kor_for_hin  bytes=622656  format=duration 51.840000
zho_for_hin  bytes=621792  format=duration 51.760000
kor_for_tam  bytes=736128  format=duration 61.280000
zho_for_tam  bytes=736128  format=duration 61.280000
```

(61,280 ms is genuinely shared by both Tamil welcomes — same byte count, same duration, different keys.)

**Rollback** is committed at `docs/audio/welcome-duration-backfill-rollback-2026-08-06.json` — prior row state for all four rows plus ready-to-run `UPDATE … SET duration_ms = NULL` statements.

**Not in the four, but found:** three more welcome rows are still NULL — **eng_for_kan, eng_for_mar, eng_for_tel** (created 2026-07-07). They were outside the approved scope so I did **not** touch them. Say the word and it's a two-minute job.

---

## (b) Size of the estate

### The 3,682 / 4,396 figure does not reconcile — EXPLICIT GAP

I could not find any live population of 4,396. Every table carrying `duration_ms` was counted:

| Population | Rows | NULL duration |
|---|---|---|
| `course_audio` role=`welcome` — **the actual welcome estate** | 129 | **3** (after my fix) |
| `course_audio` role=`instruction`/`encouragement` | 6,259 | 640 |
| `shared_audio` (instructions, encouragements, paywall, bookends) | 12,189 | 9,922 |
| `course_audio` all roles | 2,544,897 | 702 |
| `lego_introductions` | 47,644 | 17,029 |

Nothing is 4,396 and nothing is 3,682. Neither number appears in the repo either. I do not know what was counted to produce them; I'm reporting the gap rather than picking the closest number and calling it a match. **The true welcome-row answer is 3 remaining NULLs.**

The nearest thing to a 3,682-scale intro-audio problem is **`shared_audio`: 9,922 NULL of 12,189** — the encouragements/instructions/paywall lines that play around the welcome. That's the population worth the safety question, so I sized it.

### Would a full sweep be safe and cheap? — Yes, cheap. Mostly safe, with one caveat.

- **Distinct S3 objects to probe:** 10,565 across `shared_audio` + `course_audio` intro roles. Every row has its own key — no dedup saving.
- **Reachable:** sample of **60** NULL-duration keys (40 `shared_audio`, 20 `course_audio`), fetched from `ssi-audio-stage`: **60/60 succeeded, 0 missing**.
- **Time:** 10.8 s for 60 serially = **0.18 s/object** → **~32 min serial**, ~3–5 min at 10-way concurrency. No TTS, no cost beyond S3 GETs.
- ⚠️ Note the objects live in **`ssi-audio-stage`**. All four welcome keys returned `NoSuchKey` from the production bucket `ssiborg-assets`. That's expected for stage-first assets, but a sweep must probe stage.

**Would any consumer behave differently given a real duration where it now sees NULL?** Three do, and all three change in the intended direction:

1. `generate-legacy-manifest.cjs:1558` — `introduction.duration` goes from `0` to the real seconds. This is the whole point; a legacy manifest currently ships a zero-length welcome.
2. **S3 verify runs with `durationTolerance: 0`** (`production-api.cjs:8591`) and only checks samples whose duration is truthy (`:8704`). A backfilled row is newly *in scope* for that check. A value measured from the S3 object itself matches by construction — but a value copied from anywhere else would start failing verification and trigger auto-fix. **Measure, never assume.** That is the one way a backfill could break something.
3. `production-api.cjs:5897` — the readiness flag `hasDuration` flips false→true. Cosmetic, correct.

No learner-facing break: the player treats `durationMs` as optional (`bundle.ts:232-236`) and never required it.

**Recommendation:** safe and cheap, worth doing as its own job with per-object measurement. **Not run here, as instructed.**

---

## (c) The guard hole — confirmed, NOT applied

Both readings verified against current `main`:

- The publish guard (`services/production-api.cjs:7948-7957`) iterates **only** `manifest.slices?.[0]?.samples`.
- The welcome ships at a **top-level `introduction` key** (`services/phases/generate-legacy-manifest.cjs:1553-1559`), never inside `slices[0].samples`.

So a welcome with `duration: 0` — exactly what a NULL `duration_ms` produces — passes the guard unchallenged. Confirmed.

**Exact one-line fix** (insert after line 7957, before the `if (zeroDurationSamples.length > 0)` block):

```diff
--- a/services/production-api.cjs
+++ b/services/production-api.cjs
@@ -7955,6 +7955,7 @@
         }
       }
     }
+    if (manifest.introduction?.id && !manifest.introduction.duration) zeroDurationSamples.push({ id: manifest.introduction.id, text: 'introduction (welcome)' })
     if (zeroDurationSamples.length > 0) {
```

Safe against false positives: a course with no welcome at all gets `PLACEHOLDER_INTRO`, which carries `duration: 45.0` (`generate-legacy-manifest.cjs:77-82`), so this only fires on a real welcome with a zero or missing duration.

**Not applied.** That's export-path code and Kai didn't ask for it.

---

## What I did not do

No audio generated. No export-guard code changed. No batch regeneration. No French/component content touched. No estate-wide backfill.
