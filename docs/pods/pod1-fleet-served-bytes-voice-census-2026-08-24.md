# Pod 1 fleet — served-bytes voice census (every live course except ita_for_eng)

2026-08-24. Answering, for the 21 live-pod-1 courses NOT owned by workers #279/#281
(ita_for_eng itself and the serving-path investigation): does the same class of defect
Tom heard in Italian Scene 15 exist elsewhere, measured from served bytes, not assumed
from metadata?

**Headline: 0 of my 21 courses show a whole-course "both voices sound the same gender"
defect. 1 course (`swe_for_eng`) has a confirmed, byte-measured, per-clip wrong-gender
defect (~15% of one voice's clips). 1 course (`hrv_for_eng`) has a genuine, unresolved
whole-turn F0 anomaly that needs a full census, not a sample, before it can be cleared.
But the much bigger finding surfaced mid-investigation, from sibling reports, not from
my own byte census: ita's real root cause was NOT a mis-gendered voice at all — it was a
split-clip-array inheritance bug that is independently confirmed to also infect
`hrv_for_eng`, and flagged (not yet confirmed) across all 21 of my courses at
6.8%–37.7% of split clips per course. My byte census could not have caught that bug —
it lives in different database columns than the ones I measured. See §5.**

---

## Method

- **Serving path used**: `GET http://localhost:3470/api/production/audio/<uuid>/stream`
  (Popty's local production API), which 302-redirects to a signed S3 URL — the same
  route the shared brief names as the documented fallback. I did not attempt the
  learner-facing Vercel route; a sibling investigation (hrv_for_eng integrity check,
  `docs/pods/hrv-pod1-integrity-check-2026-08-24.md`) tried it and got blocked by
  entitlement (HTTP 404/SPA fallback), so I did not spend budget re-attempting it.
  **Gap, explicit**: none of my clips were confirmed through the actual learner-facing
  domain.
- **Measurement**: median F0 (fundamental frequency) by autocorrelation over 40ms
  voiced frames (energy-gated, correlation threshold 0.3), plus a spectral-centroid
  timbre proxy via an in-process FFT. Pure Node, no numpy/venv dependency (this box has
  neither numpy nor a working `python3 -m venv`).
- **Validated before trusting at scale**, against two known-gender reference clips
  (xai `bedd6226`/Olivia, known-female; xai `gfzdpspr5fdp`/Tom, known-male):
  Olivia measured 210.5 Hz / centroid 1183 Hz; Tom measured 100.0 Hz / centroid 1683 Hz.
  This is consistent with the estate's own prior forensics precedent
  (`tools/a108/a136-voice-identity-check.cjs`: "Lieke 183.9 Hz (f) vs Bas 141.6 Hz (m)"),
  and with the independent ita census (`docs/pods/ita-pod1-served-bytes-speaker-census-2026-08-24.md`),
  which used a different pitch tracker (YIN via `pitchfinder`) and found the same
  bimodal trough at 150–169 Hz. Two independently-built instruments agree — I trust the
  classification boundary.
  **Caveat, also confirmed empirically**: spectral centroid was *inverted* on my
  reference pair (male voice had the higher centroid) — it is reported per clip but was
  never used to override an F0-based verdict.
- **Classification**: median F0 ≥ 165 Hz → female-typical; ≤ 150 Hz → male-typical;
  150–165 Hz → AMBIGUOUS (not forced).
- **Sampling**: 5 clips per declared target voice, from 5 different scenes, for all 21
  courses (210 clips) — the `target_audio_id` (whole-turn) column only. Three courses
  that flagged as ambiguous or internally inconsistent at n=5 (`hrv_for_eng`,
  `isl_for_eng`, `swe_for_eng`) were expanded to 20–26 samples each. **272 unique clips
  measured in total, zero download failures.**
- **Fan-out note**: my dispatch attempts for 5 sub-workers were refused by the fan-out
  depth ceiling (I am already a depth-1 worker in this sweep's tree), so all 272
  downloads and measurements were run directly, not delegated.

---

## 1. Enumeration — declared cast vs. actually-linked voices

For all 21 courses, `listening_pods.speakers` (declared cast) was compared against the
DISTINCT `course_audio.voice_id` values actually joined through
`listening_pod_sentences` on both the target and known tracks.

**Finding: after normalising BOTH a leading `xai_` and a leading `azure_` prefix, the
linked voice set matches the declared cast set on all 21 courses. No wrong-DB-pointer
mismatches found.** (Full per-course join data: see the raw JSON.)

**Secondary finding, not a mismatch but a hygiene defect worth naming**: 8 of the 21
courses store clips for the SAME nominal voice under two different `voice_id` spellings
— bare and `azure_`-prefixed (`eus_for_eng`, `fra_ca_for_eng`, `gle_for_eng`,
`hrv_for_eng`, `isl_for_eng`, `ron_for_eng`, `spa_for_eng`, `spa_mx_for_eng`). This
mirrors the `ara`/`xai_ara` duplication already known from ita. I checked whether this
dual-spelling explained any of the F0 anomalies below (specifically for `hrv_for_eng`,
where I had the raw `voice_id` per clip) — it did not: all 5 of `hrv_for_eng`'s
anomalous Srecko samples carried the identical `azure_hr-HR-SreckoNeural` spelling, so
the spread is not an artefact of two different label spellings pointing at two different
takes.

## 2. Registry-drift check — `tools/pod-voices-xai.json` vs DB `voices.gender`

Diffed all 70 xAI voices present in the JSON file against the DB `voices` table.

**3 disagreements found:**

| voice_id | name | JSON gender | DB gender |
|---|---|---|---|
| `d18jlf6v` | Hao (zh-CN) | m | f |
| `hqxr4yub` | Luca (it) | m | f |
| `4ff93971bfdc` | Aroon (th) | f | m |

**None of these 3 voices are in the declared cast of any of my 21 live pod-1 courses.**
(`hqxr4yub`/Luca is not the voice currently cast for Italian either — ita_for_eng's live
pod-1 cast is `ara`/`x7avnu1k`, per the shared brief.) Registry drift is real and
confirmed, but it is not what is live on this fleet today.

A related but distinct gap: Azure Neural voices (`hr-HR-SreckoNeural`, `is-IS-GunnarNeural`,
etc.) have **no gender value at all** in the DB `voices` table (column is NULL) and are
absent from the xAI JSON entirely — there is no independently-verified gender registry
for these voices beyond Microsoft's own naming convention. This is not "drift" (nothing
to disagree with) but it does mean Azure-voice courses have zero registry-level
cross-check at all; the byte census in §3 is the *only* check they get.

## 3. Byte measurements — full 21-course table

Median-of-5 F0 per voice (base sample), classification, and course-level verdict:

| Course | Voice A (declared) | F0 A (Hz) | Class A | Voice B (declared) | F0 B (Hz) | Class B | Verdict |
|---|---|---|---|---|---|---|---|
| ara_eg_for_eng | eve (Eve) | 207.8 | female | rex (Rex) | 106.0 | male | PASS |
| ara_for_eng | ar-EG-SalmaNeural (Salma) | 213.3 | female | ar-EG-ShakirNeural (Shakir) | 114.3 | male | PASS |
| deu_at_for_eng | 44c91d64 (Sonja) | 188.2 | female | e1fc5a89 (Felix) | 145.5 | male | PASS |
| deu_for_eng | 3a7889066fa2 (Lena) | 231.9 | female | 41321eb41295 (Moritz) | 105.3 | male | PASS |
| eus_for_eng | eu-ES-AinhoaNeural (Ainhoa) | 172.0 | female | eu-ES-AnderNeural (Ander) | 95.2 | male | PASS |
| fra_ca_for_eng | fr-CA-SylvieNeural (Sylvie) | 200.0 | female | fr-CA-JeanNeural | 120.3 | male | PASS |
| fra_for_eng | 69smp8rm (Camille) | 228.6 | female | 0p0rt7o1 (Remi) | 144.1 | male | PASS |
| gle_for_eng | ga-IE-OrlaNeural (Orla) | 210.5 | female | ga-IE-ColmNeural (Colm) | 119.4 | male | PASS |
| hin_for_eng | ara (Ara) | 222.2 | female | 89q2pnko (Karan) | 108.8 | male | PASS |
| **hrv_for_eng** | hr-HR-SreckoNeural (Srecko) | 135.6 | male | hr-HR-GabrijelaNeural (Gabrijela) | 153.8 | **AMBIGUOUS** | **NEEDS FULL CENSUS** |
| isl_for_eng | is-IS-GudrunNeural (Gudrun) | 200.0 | female | is-IS-GunnarNeural (Gunnar) | 153.8→ resolved male on expanded sample | AMBIGUOUS→male | PASS (see §4) |
| jpn_for_eng | ja-JP-MayuNeural (Mayu) | 238.8 | female | ja-JP-NaokiNeural (Naoki) | 107.4 | male | PASS |
| kor_for_eng | ko-KR-YuJinNeural (YuJin) | 197.5 | female | bf9fe5b5f981 (Jun-seo) | 106.7 | male | PASS |
| nld_for_eng | 58d27475085e (Femke) | 210.5 | female | a13662ba951c (Thijs) | 116.8 | male | PASS |
| por_br_for_eng | ara (Ara) | 225.4 | female | pt-BR-JulioNeural (Julio) | 115.9 | male | PASS |
| por_for_eng | eve (Eve) | 207.8 | female | rex (Rex) | 104.6 | male | PASS |
| ron_for_eng | ro-RO-AlinaNeural (Alina) | 197.5 | female | ro-RO-EmilNeural (Emil) | 125.0 | male | PASS |
| spa_for_eng | es-ES-ElviraNeural (Elvira) | 197.5 | female | yis75yfp (Manuel) | 108.8 | male | PASS |
| spa_mx_for_eng | es-MX-CarlotaNeural (Carlota) | 205.1 | female | es-MX-LucianoNeural (Luciano) | 103.2 | male | PASS |
| **swe_for_eng** | xai_3b312632 (Alice) | 188.2 | female | 4c7f16ff (Oscar) | 124.0 | male | **PASS on aggregate, but see §4 — confirmed per-clip defect** |
| zho_for_eng | 33g9t0jl (Xia) | 207.8 | female | jpi39icg (Jian) | 136.8 | male | PASS |

19 of 21 courses: clean, wide (60–140 Hz) separation between the two voices' medians, no
cross-classification overlap. Two need the deeper look below.

## 4. Deep dives — the two courses that didn't pass cleanly on n=5

### `hrv_for_eng` — genuinely unresolved, needs a full census

Base 5-sample check for `hr-HR-SreckoNeural` (nominally male, "Srecko") returned F0s
**210.5, 166.7, 135.6, 133.3, 128 Hz** — spanning clearly-female to clearly-male within
5 samples of one voice. Expanded to 26 unique clips (of 151 in the live pod): 18 land
solidly male-typical (111–153 Hz), 4 ambiguous (152–163 Hz), **4 land clearly
female-typical (166.7–210.5 Hz)**, all with ample voiced-frame counts (not a
short-clip/low-data artefact — e.g. one 210.5 Hz reading came from a 2946ms clip with 55
voiced frames, comparable data density to the clean male readings). The paired voice,
`hr-HR-GabrijelaNeural` ("Gabrijela", nominally female), never once cleared the 165 Hz
female threshold across its own 5 samples (max 164.9 Hz, median 153.8 Hz) — borderline
low for a female voice on every single sample.

**I cannot rule out that this is a genuine "these two voices aren't reliably
distinguishable" defect** — the two voices' full ranges (Srecko 128–210 Hz, Gabrijela
143–165 Hz) overlap far more than any other course in this fleet. Independently, and
unprompted by my finding, a sibling investigation confirmed `hrv_for_eng` carries the
**exact same split-clip-array inheritance defect found in ita** (see §5) — which could
plausibly explain content-level scene-15-style bleed but does not, on its own, explain
an F0 spread on the **whole-turn** `target_audio_id` column, which that sibling report
says was correctly recast (81/88 of the affected rows had their whole-turn clip
correctly changed). **This means hrv_for_eng likely carries two separate, independently
confirmed defects, not one** — recommend a full census of all 151 Srecko + 80 Gabrijela
whole-turn clips (231 total) plus a human listen-through, not a further sample.

### `isl_for_eng` — resolved to PASS on a larger sample

Base 5-sample check for `is-IS-GunnarNeural` was ambiguous (156.9, 134.5, **168.4**,
153.8, 131.1 Hz — one clear female-range outlier). Expanded to 20 unique clips: 15
solidly male-typical (115–142 Hz), 4 ambiguous (152–157 Hz, plausibly sentence-final
rising intonation, a normal prosodic feature, not a defect), and only the same single
168.4 Hz outlier. Paired voice `is-IS-GudrunNeural` is solidly female-typical (188–246
Hz) throughout. **Verdict: PASS** — one outlier in 20 samples is far more consistent
with normal measurement/prosodic noise than with a systemic defect, unlike hrv's
recurring pattern.

### `swe_for_eng` — confirmed, real, per-clip defect (distinct mechanism from ita)

This is the most concrete new finding in this census. Base 5-sample check for
`xai_3b312632` ("Alice", declared **and DB-registered** female) returned F0s **210.5,
188.2, 190.5, 117.6, 177.8 Hz** — one clean male-range outlier (117.6 Hz, scene 4).
Expanded to 26 unique clips (of 151 in the live pod, minor overlap with the base sample
accounted for): **4 of 26 (15.4%) are unambiguous male-range F0 (102.6–108.1 Hz)**, all
with ample voiced-frame counts (101, 214, 53, 433 voiced frames — not short-clip noise):

| target_audio_id | scene | speaker | duration | F0 (Hz) |
|---|---|---|---|---|
| `639c6720-0537-423a-a616-bb13e277bf99` | 4 | Sarah | 7767ms | 117.6 |
| `68f13fc4-3a72-4ee2-8f01-4af186894619` | 14 | Driver | 3532ms | 102.6 |
| `b7870bfc-cbd9-4400-a8a8-2515ad41e768` | 19 | Learner | 1416ms | 106.7 |
| `4ea6ac38-b72a-44d5-8cec-afc8404d897f` | 22 | Learner | 14332ms | 108.1 |

All four are tagged `voice_id = xai_3b312632` — the SAME spelling as the correct female
clips, so this is not a bare/prefixed mixing artefact. **This is a per-clip wrong-voice
linkage inside an otherwise-correct voice track**, mechanistically different from both
(a) ita's original hypothesis (a whole voice mislabelled), and (b) ita's actual root
cause (stale split-array inheritance) — these are whole-turn `target_audio_id` clips,
not split arrays. Sample rate 4/26 (Wilson 95% CI ≈ 6%–34%) extrapolates to roughly
**9–51 of Alice's 151 target clips** in this course — stated as an extrapolation with
its uncertainty, not a measurement. **`swe_for_eng` needs a full census of this specific
151-clip voice population** to get a trustworthy count.

## 5. The bigger finding — surfaced from sibling reports, not from my own census

Partway through this work I read the already-landed sibling investigations
(`docs/pods/ita-pod1-scene15-two-female-voices-rootcause-2026-08-24.md`, commit
`b6ecdf6f9` on `fix/ita-pod1-scene15-rootcause-2026-08-24`, and
`docs/pods/hrv-pod1-integrity-check-2026-08-24.md`, commit `6a87ab7f2` on
`docs/hrv-pod1-integrity-check-2026-08-24`). They establish that **Tom's actual ita
defect was never a mis-gendered voice** — it was a content bug: `sentence_audio_ids` /
`sentence_known_audio_ids` (the split-clip arrays used for multi-sentence turns) were
copied **positionally** from the retired `pod-0-retired-2026-08-22` into the live pod-1,
and never re-derived. Where scene order changed between pod-0 and pod-1, a row's split
clips now play a *different, unrelated conversation* — sometimes voiced by a retired
cast member. `ita_for_eng` was found infected (113/231 rows, repaired live at ~11:20Z)
and **`hrv_for_eng` is independently confirmed infected by the same mechanism** (55
flagged mismatch events across 10 of 22 scenes, scene 15 reproducing ita's exact
wrong-conversation swap). A crude course-wide substring test in the ita root-cause doc
flags split-clip content mismatches in **all 21 of my courses**, from 6.8%
(`ara_for_eng`) to 37.7% (`isl_for_eng`) of split clips — with an explicit caveat that
the test is unreliable for non-Latin scripts (`jpn_for_eng`, `zho_for_eng` show as 0%,
which the authors flag as an artefact, not a clean result) and that inheritance is only
harmful where scene content/order actually changed.

**This is an explicit gap in my own census, not a contradiction of it**: I queried only
`target_audio_id`/`known_audio_id` (the whole-turn columns) — the same two columns the
flip gate checks, and the same two the ita crew's byte census confirmed clean course-wide
for Italian. My method cannot see `sentence_audio_ids`/`sentence_known_audio_ids` at
all, so it cannot confirm or refute the split-array defect for the other 19 of my 21
courses. Per the root-cause doc, **Worker #282 is producing the authoritative
per-course split-array mismatch count** — at the time of writing I could not find that
worker's output pushed to any branch, so I am naming this as an open, tracked gap rather
than guessing a number.

## 6. Scale — measured vs. extrapolated, stated explicitly

- **Measured** (my own byte census, whole-turn columns only): 272 unique clips
  downloaded and measured, zero download failures, across 21 courses. **4 confirmed
  wrong-gender clips, all concentrated in one voice in one course** (`swe_for_eng`
  Alice/`xai_3b312632`) — not spread across the fleet.
- **Extrapolated, with uncertainty stated**: within `swe_for_eng`'s Alice population
  specifically (151 target clips), a 4/26 sample rate projects to roughly 9–51 clips
  (95% CI) — I did NOT extrapolate this rate to the other 20 courses, because the defect
  is voice-specific, not uniform; doing so would overstate the finding.
- **`hrv_for_eng`** needs a full census (231 whole-turn clips) before any number can be
  trusted — I am naming it, not guessing it, per the brief's instruction.
- **The split-clip-array defect (§5) is the one with real estate-wide scale**, and I am
  explicitly NOT the source of its per-course numbers — that is Worker #282's job, using
  a different, script-safe method than the crude substring test in the root-cause doc.
  Citing the root-cause doc's own crude estimate here (6.8%–37.7% of split clips per
  course, ~914/4,917 split clips estate-wide) as the best number available at
  publication time, with its own stated caveats intact.

## 7. Verdict — can the ita mechanism(s) affect the other 20 courses?

There are now two distinct "ita mechanisms" to answer against:

- **Originally-hypothesised mechanism (a whole voice_id metadata-correct but
  renders-wrong-gender across the board)**: **NOT CONFIRMED** in any of my 21 courses.
  No voice in my sample showed a clean, consistent flip to the opposite gender. The
  closest case, `hrv_for_eng`, shows overlap/ambiguity rather than a clean flip, and
  needs a full census before it can be called either way.
- **Actual confirmed mechanism (split-clip-array positional inheritance from a retired
  pod)**: **YES — independently confirmed to also affect `hrv_for_eng`**, and flagged
  (not yet confirmed) across all 21 of my courses by the root-cause doc's course-wide
  sweep. This is the mechanism with real fleet-wide reach; my census could not test for
  it and does not clear any course of it.
- **A third, newly-confirmed mechanism this census did find**: **per-clip wrong-voice
  linkage inside an otherwise-correctly-cast whole-turn track**, confirmed in
  `swe_for_eng` only. Not yet checked for in the other 20 courses at the depth that
  would be needed to rule it out (5 samples per voice is not enough to catch a ~15%
  intra-voice rate with confidence — `swe_for_eng` itself only surfaced it because 1 of
  its first 5 samples happened to land on a bad clip).

**Ranked by learner-experience severity, worst first:**

1. **`hrv_for_eng`** — independently confirmed split-array infection (same disease as
   ita, reproducing the exact scene-15 wrong-conversation pattern) PLUS an unresolved
   whole-turn F0 ambiguity between its two cast voices. Two live, separately-sourced
   problems in one course.
2. **`ita_for_eng`** (not mine, but for context) — already repaired live.
3. **`swe_for_eng`** — confirmed ~15% wrong-gender rate on one specific voice's
   whole-turn clips; unpredictable rather than pervasive, but real and reproducible.
4. **The other 18 courses (split-array risk unresolved)** — clean on whole-turn voice
   casting by direct byte measurement, but not yet cleared of the split-array defect
   class, which is where the real fleet-wide risk sits per §5.

---

## Explicit gaps (full list)

1. Never confirmed any clip through the actual learner-facing Vercel domain — Popty's
   local `/api/production/audio/<uuid>/stream` fallback only, as pre-authorised.
2. Known-side (English) track was assumed consistent estate-wide (shared `bedd6226`/
   `gfzdpspr5fdp` pair, validated as my calibration reference) but never independently
   sampled per-course — only the target track was measured per course.
3. `hrv_for_eng` and `swe_for_eng` need full censuses of their flagged voice
   populations (231 and 151 clips respectively) — sampling could not produce a
   trustworthy final number for either.
4. The split-clip-array defect (§5), which is the mechanism with genuine fleet-wide
   reach, is entirely outside what my query/measurement touched. I have not verified it
   for 19 of my 21 courses either way.
5. Registry-drift check (§2) covers xAI voices only; Azure Neural voices have no
   independent gender registry to diff against at all.

---

Raw JSON (all 272 measurements, per-clip): `docs/pods/pod1-fleet-served-bytes-voice-census-2026-08-24-raw.json`
