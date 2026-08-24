# Is 2026-06-16 one batch event? — forensics on the 22 "otherwise-clean" courses

**Date:** 2026-08-04. **Scope:** READ-ONLY. No TTS rendered, no row mutated, `tools/repair-silent-clips.cjs` never run.
**Data snapshot:** `course_audio` pulled 2026-08-04, re-verified at end of run (60/60 rows unchanged — `scripts/stub-forensics/reverify.cjs`).

---

## Verdict

**Mixed, and the 2026-06-16 date recurrence is mostly an artefact of a date-only view.** Only **23 of the 60**
sub-400 ms clips in these 22 courses fall on 2026-06-16 at all, and those 23 are **two unrelated jobs** that
happen to share a calendar day. The genuinely defective clips split across **four families**, of which only
**two** contain defects — and **the worst family is not on 06-16 at all**, it is the 2026-07-27→29 xAI
degradation, the direct precursor of the 08-03 fra event.

**The single most important finding: duration alone is a bad detector here, in both directions.** Of the 60
clips below the 400 ms floor, **43 are healthy speech at normal mastered level** (short words: "Green.",
"Blue.", "[atom] はい") and only 17 are defective. Meanwhile the loudness sweep found a defective clip at
**624 ms** — above the floor, invisible to the duration screen entirely.

---

## Method and what each signal can prove

| Signal | Where | What it proves |
|---|---|---|
| duration < 400 ms | `tools/audio-batch-gate.cjs:205` (`FLOOR_MS`, line 84) | nothing on its own — see above |
| loudness (ffmpeg `volumedetect`) | `tools/audio-batch-gate.cjs:144`, verdict at `:280-283` | the only proof of silence |
| **file size** | **recovered from S3 over HTTP** | the 2,016-byte fingerprint — see gap note below |

**`file_size_bytes` is NULL on every one of the 60 rows** (verified: `scripts/stub-forensics/pull.cjs`,
`nullsize 60`). The parent's audit hit exactly this and could not use the ~2,016-byte fingerprint.
**I recovered it anyway** by fetching the S3 object and taking `buf.length`
(`scripts/stub-forensics/probe.cjs`) — the byte count is a property of the object, not of the DB row, and it
turned out to be decisive. Every clip below is reported with its real byte size.

I downloaded and measured **all 60** stub clips individually rather than trusting the gate's pass/fail, because
the gate only writes dB into `detail` for clips it condemns (`tools/audio-batch-gate.cjs:335`) — a clip it
passes reports no level at all, which hides exactly the "quiet but not silent" band that turned out to matter.

**Healthy control.** 104 clips of 400–1200 ms drawn from the *same* 06-16 batch window
(`healthy-control-06-16-batch.json`): peak dB **median −2.2, p05 −6.5, min −28.2**; mean dB median −18.1.
So **peak < −9 dB is ~2 dB below the healthy 5th percentile** and is the discriminator used throughout this
document. 1 of the 104 controls fell below it — and that one is itself a defect (see family B).

---

## The four families

| Family | Window | n | silent | near-silent | healthy | Verdict |
|---|---|---|---|---|---|---|
| **A — pod-atom** | 06-15 00:14 → 06-16 17:26 | 26 | 0 | 0 | **26** | not a defect |
| **B — 06-16 cross-estate render** | 06-16 09:43 → 10:54 | 19 | 0 | **14** | 5 | **real degradation** |
| **C — 06-19 function words** | 06-19 03:23 → 16:26 | 6 | 0 | 0 | **6** | not a defect |
| **D — late-July xAI** | 07-27 09:20 → 07-29 03:26 | 7 | **3** | **4** | 0 | **real degradation** |
| E — singletons | 02-16, 07-21 | 2 | 0 | 0 | 2 | not a defect |

### A — pod-atom clips (26, all healthy)

Role `pod_explainer`, voice `comp:leo`, text of the form `[atom] X`, spread over 06-15 and 06-16 across 7
courses. Every one measures **−16 to −17 dB mean, peak −1 to −7 dB** — textbook mastered level. These are
single-word atoms that are legitimately 200–400 ms long. `gle_for_eng` looks like the worst course in the raw
audit (11 stubs) purely because 10 of them are these.

**This family alone accounts for 4 of the 23 "2026-06-16" clips, and it is not an event — it is a normal
pod-atom generation run that straddles two days.**

### B — the 2026-06-16 09:43–10:54 render (19 clips, 14 defective)

This **is** one batch, and a big one. Across the whole estate the window 09:40–10:10 UTC produced
**20,464 clips in 47 courses** (`scripts/stub-forensics/window2.cjs`) — a cross-estate render, not a
per-course job. Its stub yield is **44 clips, 0.22%**.

Within my 22 courses, 19 clips landed under the floor. Measured:

```
created_at           course          role     dur  bytes   mean   peak   text
2026-06-16T09:43:31  kor_for_eng     target1  336   8684  -43.3  -29.1  "지금 아내와 아이들과 함께 여기에서 휴가를 보내고 있어요."
2026-06-16T09:49:21  tur_for_eng     target1  312   8108  -52.3  -28.7  "Ama cumartesi konuşalım."
2026-06-16T09:49:27  por_br_for_eng  target1  336   8684  -41.6  -25.1  "Rosa."
2026-06-16T09:50:36  deu_for_jpn     target1  288   7532  -59.2  -29.1  "Grün."
2026-06-16T09:53:39  pol_for_eng     target1  384   9836  -43.0  -14.1  "Proszę bardzo."
2026-06-16T09:56:17  fra_for_jpn     target1  384   9836  -54.9  -24.9  "Le voilà."
2026-06-16T09:58:23  gle_for_eng     known    360   9260  -48.2  -23.5  "Good night."
2026-06-16T09:59:31  ell_for_eng     known    336   8684  -41.9  -26.1  "Here it is."
2026-06-16T10:01:27  por_br_for_eng  known    336   8684  -29.2  -10.0  "To take away."
2026-06-16T10:02:00  lav_for_eng     known    312   8108  -33.8  -13.5  "Blue."
2026-06-16T10:06:54  pol_for_eng     known    384   9836  -27.7   -9.5  "I need to go home now."
2026-06-16T10:08:09  fas_for_eng     known    336   8684  -49.9  -23.3  "Thursday."
2026-06-16T10:09:45  tha_for_eng     known    360   9260  -34.9   -9.6  "8."
2026-06-16T10:54:34  zho_for_eng     target1  312   8108  -54.0  -27.8  "十二点。"
```

The other 5 in the window are healthy short words at normal level ("육." −6.2, "십구." −2.2, "Orange." −6.9,
"Green." −2.2, "6." −5.8), which is what makes this a degradation *pocket* rather than a failed batch.

**The artefact is a third class, distinct from both the 08-03 stub and the truncation.** These files are
full-size for their duration (8–10 KB — *not* the 2,016-byte stub) and contain a signal, but 10–30 dB below any
healthy clip. The row at the top is the proof that this is not "a legitimately quiet short word": a full Korean
sentence stored as 336 ms at −43 dB is broken on any reading.

**The current gate cannot catch this.** `SILENCE_MEAN_DB = −60` and `SILENCE_PEAK_DB = −45`
(`tools/audio-batch-gate.cjs:92,95`); the worst of these is −59.2 mean / −29.1 peak, so the gate returns
**`suspect`, never `confirmed`** — which is why all 22 courses reported `0 confirmed` except the two late-July
ones.

**How big is the pocket?** Full loudness sweeps of every clip two courses produced in that window
(`scripts/stub-forensics/sweep.cjs`, results in `sweep-*.json`):

- `tur_for_eng`: **2 / 457** below −9 dB peak (0.44%)
- `kor_for_eng`: **6 / 431** below −9 dB peak (1.39%)

So the pocket is real but thin — sub-1.5% of the batch — and it is **not confined to sub-400 ms clips**. Of
those 8, **three are above the 400 ms floor and therefore invisible to the parent's audit**:

```
tur_for_eng  10:03:35   504 ms  -23.9 / -10.4  known    "Purple."
kor_for_eng  09:43:33   720 ms  -21.0 /  -9.6  target1  "이."
kor_for_eng  09:43:33   864 ms  -25.4 /  -9.8  target1  "삼."
kor_for_eng  09:44:50  1008 ms  -26.8 / -10.6  target1  "물론이죠."
kor_for_eng  09:45:06   672 ms  -25.8 / -10.6  target1  "수요일."
kor_for_eng  09:45:11  1080 ms  -23.3 /  -9.1  target1  "감사합니다."
zho_for_eng  (control)  624 ms  -47.2 / -28.2  target?  "窗边那张桌子空着。"
```

**This is the most consequential finding in the report:** the duration floor is structurally blind to this
artefact, and a course can be "clean" by the audit while still carrying it.

### C — 06-19 function words (6, all healthy)

Six single clips on 06-19 across six courses: "Met", "to a", "I've", "you're", "it", "Otto." — all 360–384 ms,
4,896 bytes, **−15 to −19 dB mean, peak −1.9 to −5.3**. Perfectly good renders of genuinely tiny words.
4,896 bytes is simply what a 384 ms clip weighs from that pipeline variant (compare the healthy 02-16
`jpn_for_eng` "it" and 07-21 `spa_for_eng` "now", both 384 ms / 4,896 bytes).

### D — the late-July xAI degradation (7 clips, all 7 defective)

**All three confirmed-silent clips in the entire 22-course set are here**, and it is the family that matches the
08-03 fra mechanism:

```
2026-07-27T09:20:05  eng_for_guj  target2  288  7532  -40.9  -19.4  "black"    gfzdpspr5fdp
2026-07-28T01:57:04  eng_for_pan  target2  288  7532  -40.9  -19.4  "black"    gfzdpspr5fdp
2026-07-28T08:49:07  eng_for_tam  target2  288  7532  -40.9  -19.4  "black"    gfzdpspr5fdp
2026-07-29T02:19:29  eng_for_urd  target2  288  7532  -40.9  -19.4  "black"    gfzdpspr5fdp
2026-07-28T09:34:23  eng_for_tam  known    144  2016  -91.0  -91.0  "கப்"      azure_ta-LK-SaranyaNeural   ← SILENT
2026-07-28T11:05:47  eng_for_tam  target1  192  2592  -91.0  -73.4  "bought"   xai_bedd6226                ← SILENT
2026-07-29T03:26:03  eng_for_urd  target1  192  2592  -91.0  -73.4  "bought"   xai_bedd6226                ← SILENT
```

Three things stand out:

1. **The 2,016-byte fingerprint appears exactly once in the whole 22-course set** — the Tamil "கப்" clip,
   144 ms, −91 dB. It is the identical artefact described in
   `docs/fra-tts-rerender-mechanism-scout-2026-08-04.md`, one week before the fra event.
2. **"bought" is byte-identical across two courses** (2,592 B, 192 ms, −91.0 mean / −73.4 peak, voice
   `xai_bedd6226`) and so is "black" across four (7,532 B, 288 ms, −40.9 / −19.4). Identical measurements for
   independently-issued renders means **the same degraded output is being produced repeatedly for the same
   text**, day after day, across four separate course jobs. This is not a transient — it is a reproducible bad
   response for those specific strings.
3. **The Tamil silent clip is Azure, not xAI** (`azure_ta-LK-SaranyaNeural`). One clip is not a pattern, but it
   is enough to say the empty-body failure is **not exclusively an xAI story**, and any gate that scopes itself
   to xAI voices will miss it.

Answering the brief's provider question directly: voices across the 60 are a mix of xAI (`bedd6226`,
`gfzdpspr5fdp`, `xai_bedd6226`, `xai_eve`, `leo`, `eve`, `ara`, `sal`, opaque hex IDs), Azure
(`azure_ta-LK-SaranyaNeural`), and the composite pod voice `comp:leo`. **The only non-xAI voice in the set
produced one of the three confirmed-silent clips.**

---

## Per-course table

Classification: **silent** = mean < −60 or peak < −45 dB (the gate's own rule). **near-silent** = peak < −9 dB
(2 dB below the healthy p05 measured on the same batch). **healthy** = everything else.

| course | stubs (<400 ms) | silent | near-silent | healthy | gate verdict (confirmed/suspect) | voice_ids | created_at window |
|---|---|---|---|---|---|---|---|
| deu_for_jpn | 1 | 0 | 1 | 0 | 0 / 266 | 458705c07139 | 06-16 09:50 |
| ell_for_eng | 1 | 0 | 1 | 0 | 0 / 2 | leo | 06-16 09:59 |
| eng_for_ara | 1 | 0 | 0 | 1 | 0 / 160 | bedd6226 | 06-19 06:41 |
| eng_for_guj | 2 | 0 | 1 | 1 | 0 / 68 | bedd6226, gfzdpspr5fdp | 06-19 08:45 → 07-27 09:20 |
| eng_for_pan | 2 | 0 | 1 | 1 | 0 / 43 | bedd6226, gfzdpspr5fdp | 06-19 16:00 → 07-28 01:57 |
| **eng_for_tam** | 4 | **2** | 1 | 1 | **2** / 29 | bedd6226, gfzdpspr5fdp, azure_ta-LK-SaranyaNeural, xai_bedd6226 | 06-19 16:26 → 07-28 11:05 |
| **eng_for_urd** | 2 | **1** | 1 | 0 | **1** / 50 | gfzdpspr5fdp, xai_bedd6226 | 07-29 02:19 → 03:26 |
| eng_for_zho | 1 | 0 | 0 | 1 | 0 / 2778 | bedd6226 | 06-19 06:06 |
| fas_for_eng | 1 | 0 | 1 | 0 | 0 / 4 | bedd6226 | 06-16 10:08 |
| fra_for_jpn | 3 | 0 | 1 | 2 | 0 / 297 | 0p0rt7o1, comp:leo | 06-16 09:56 → 17:26 |
| gle_for_eng | 11 | 0 | 1 | 10 | 0 / 16 | comp:leo, bedd6226 | 06-15 05:32 → 06-16 09:58 |
| ita_for_jpn | 1 | 0 | 0 | 1 | 0 / 41 | ara | 06-19 03:23 |
| jpn_for_eng | 5 | 0 | 0 | 5 | 0 / 286 | gfzdpspr5fdp, comp:leo | 02-16 21:42 → 06-15 14:41 |
| kor_for_eng | 8 | 0 | 1 | 7 | 0 / 170 | comp:leo, bf9fe5b5f981, a0401c9101f8 | 06-15 14:53 → 06-16 09:45 |
| lav_for_eng | 1 | 0 | 1 | 0 | 0 / 1 | bedd6226 | 06-16 10:02 |
| pol_for_eng | 2 | 0 | 2 | 0 | 0 / 8 | 2badb5f46b1e, bedd6226 | 06-16 09:53 → 10:06 |
| por_br_for_eng | 2 | 0 | 2 | 0 | 0 / 157 | 6da5baee46d0, bedd6226 | 06-16 09:49 → 10:01 |
| spa_for_eng | 2 | 0 | 0 | 2 | 0 / 21 | comp:leo, xai_eve | 06-15 00:14 → 07-21 11:21 |
| swe_for_eng | 1 | 0 | 0 | 1 | 0 / 99 | bedd6226 | 06-16 10:05 |
| tha_for_eng | 2 | 0 | 1 | 1 | 0 / 30 | bedd6226 | 06-16 10:09 |
| tur_for_eng | 4 | 0 | 1 | 3 | 0 / 75 | 670a0c3ac005, bedd6226, comp:leo | 06-16 09:49 → 17:12 |
| zho_for_eng | 3 | 0 | 1 | 2 | 0 / 145 | comp:leo, 33g9t0jl | 06-15 13:37 → 06-16 10:54 |

Full gate JSONs: `gate/<course>-gate.json`. Per-clip levels: `stub-loudness-probe-22-courses.json`.

### Where audit count and gate count materially disagree

The **duration screen agrees exactly** with the raw `duration_ms < 400` count in all 22 courses. Every large
gate number is the **speech-rate screen**, which the tool itself documents as never-confirming
(`tools/audio-batch-gate.cjs:39-42`). Three cases worth naming:

- **`eng_for_zho`: 1 stub → 2,778 gate flags (8.76% of the course).** 2,358 are `known/zh-CN-XiaochenNeural`.
  All 2,778 were downloaded and measured; **0 were silent**. This is the rate screen mis-calibrating on a
  Chinese-known course: the median-ms-per-character heuristic is computed on characters, and Chinese
  characters carry several times the phonetic content of a Latin one, so a healthy clip looks "too fast".
  **Recommendation: this is a tool bug, not 2,778 defects — do not repair anything here.** The rate screen
  should be disabled, or recalibrated per script, for CJK/Thai text.
- **`deu_for_jpn` 266, `fra_for_jpn` 297, `jpn_for_eng` 286, `por_br_for_eng` 157** — same shape, smaller
  scale, same outcome: 0 silent on measurement.
- **`gle_for_eng`: 11 stubs but only 1 defect** — the other 10 are family-A pod atoms.

---

## Cross-check: what else ran on 2026-06-16, and did anything log it?

- The 09:40–10:10 window produced **20,464 clips across 47 courses**, 44 of them under the floor (**0.22%**).
  Courses at ~450 clips each — a uniform cross-estate render, roles `target1` and `known`.
- **No run log names it.** `audio_pass_requests` has **0 rows** in 06-14 → 06-20. `build_jobs` has 27 rows in
  that span but they are content passes (`translate`, `build-team`, `backfill-phrases`, `final-pass`), not
  audio, and none is timed to the 09:40 window. Repo git log for 06-14 → 06-20 is dashboard theming and
  dead-code work — nothing about an audio batch. **This is a genuine gap: the estate has no audio-run ledger,
  so "which job wrote these clips" cannot be answered from records, only inferred from `created_at`.**

### Contamination note — `deu_for_eng` (honest gap)

`deu_for_eng` is **not** in my 22 but showed 26 stubs in the 06-16 window on first look, which would have been
the largest concentration in the batch. **I cannot report on it: the parent's repair job re-rendered it while I
was measuring.** Its stub count fell **622 → 371 during this session**, and by the time I swept the 06-16
window it returned **0 rows under 400 ms** and **0 clips below −9 dB peak in 397 clips**. That measurement is
post-repair and proves nothing about the original output. An earlier count pass returned 423 for the same
window that later verified as 397 — same drift, same cause. **If anyone wants the 06-16 picture for
`deu_for_eng`, it has to come from the parent's own pre-repair logs, not from the DB.**

---

## Repair list recommendation

**21 clips across 16 courses.** All are single-clip or two-clip jobs — cheap, and none of these courses is in
the parent's current 8 (`eng_for_ben/hin/kan/mar/tel`, `hrv_for_eng`, `zho_for_hin`, `deu_for_eng`), so this is
additive work, not a collision.

Machine-readable list with ids and s3 keys: **`near-silent-repair-list.json`**.

**Priority 1 — proven silent (3 clips, 2 courses).** Do these regardless of any threshold argument.

| course | clips |
|---|---|
| eng_for_tam | 2 — "கப்" (144 ms, 2,016 B, −91 dB) and "bought" (192 ms, 2,592 B, −91 dB) |
| eng_for_urd | 1 — "bought" (192 ms, 2,592 B, −91 dB) |

**Priority 2 — the late-July "black" clips (4 clips, 4 courses).** −40.9 dB mean / −19.4 dB peak, byte-identical
across all four. Same job family as priority 1, and the identical bytes say the provider will keep returning
the same bad output for that string — worth a probe-render to confirm before replacing.

`eng_for_guj`, `eng_for_pan`, `eng_for_tam`, `eng_for_urd` — 1 each.

**Priority 3 — the 06-16 near-silent pocket (14 clips, 13 courses).**

| course | clips | course | clips |
|---|---|---|---|
| pol_for_eng | 2 | gle_for_eng | 1 |
| por_br_for_eng | 2 | kor_for_eng | 1 |
| deu_for_jpn | 1 | lav_for_eng | 1 |
| ell_for_eng | 1 | tha_for_eng | 1 |
| fas_for_eng | 1 | tur_for_eng | 1 |
| fra_for_jpn | 1 | zho_for_eng | 1 |

Per-course totals (P1+P2+P3): eng_for_tam 3; eng_for_urd 2; pol_for_eng 2; por_br_for_eng 2; and 1 each for
deu_for_jpn, ell_for_eng, eng_for_guj, eng_for_pan, fas_for_eng, fra_for_jpn, gle_for_eng, kor_for_eng,
lav_for_eng, tha_for_eng, tur_for_eng, zho_for_eng.

**Explicitly NOT for repair (39 clips):** the 26 family-A pod atoms, the 6 family-C function words, the 2
singletons, and the 5 healthy short words inside the 06-16 window. All measure at normal mastered level. The
raw `duration < 400` count over-states the work by **2.9×**.

---

## Two recommendations for the gate itself

1. **Add a near-silence tier.** `SILENCE_MEAN_DB = −60` / `SILENCE_PEAK_DB = −45`
   (`tools/audio-batch-gate.cjs:92,95`) sit far below the healthy floor measured here (peak p05 = −6.5 dB) and
   let all 18 near-silent clips through as `suspect`. A **peak < −9 dB** rule would have caught every one of
   them, plus the 3 above-floor kor/tur clips and the 624 ms zho clip that no duration check can ever reach. It
   costs nothing extra — the loudness pass already runs on these clips and already computes `peakDb`.
2. **Fix or scope the speech-rate screen for CJK/Thai.** As written it flagged 8.76% of `eng_for_zho` and 0 of
   them were real, which makes the tool's output unreadable exactly where a human most needs to trust it.

---

## Open, unresolved

- **`deu_for_eng` 06-16 behaviour** — unmeasurable, repaired mid-session (see contamination note above).
- **The other 25 courses in the 06-16 batch** were not deep-swept. `tur`/`kor` gave 0.44%/1.39% below −9 dB
  peak; if that rate holds across 20,464 clips, the batch carries roughly **90–280 near-silent clips estate-wide**,
  most of them *above* the 400 ms floor and therefore absent from every count anyone has produced so far.
  **That number is an extrapolation from two courses, not a measurement — it should be measured before it is
  believed.**
- **Whether the "black"/"bought" identical-bytes pattern reproduces today** — needs one probe render each, which
  is the parent's call, not mine.

---

## Reproduction

Scripts are in `scripts/` (gitignored workspace), all READ-ONLY:

| script | what it does |
|---|---|
| `scripts/stub-forensics/pull.cjs` | pulls all `duration_ms < 400` rows for the 22 courses → `stubs.json` |
| `scripts/stub-forensics/probe.cjs` | downloads each and measures level + bytes → `stub-loudness-probe-22-courses.json` |
| `scripts/stub-forensics/control.cjs` | healthy control from the same 06-16 window |
| `scripts/stub-forensics/sweep.cjs` | measures EVERY clip a course made in a window |
| `scripts/stub-forensics/window2.cjs` | estate-wide clip/stub counts for a window |
| `scripts/stub-forensics/reverify.cjs` | re-checks the snapshot for drift under concurrent repair |

Gate runs: `node tools/audio-batch-gate.cjs <course> --out gate/<course>-gate.json`, one per course.
Run serially — 4-way parallelism produced `canceling statement due to statement timeout` on 8 of 22 courses.
