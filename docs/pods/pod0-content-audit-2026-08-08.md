# Pod content audit — are the per-course pods the old sentences?

**Date:** 2026-08-08 · **Branch:** `docs/pod-redo-scope-2026-08-07`
**Measured live from the database today.** Where this contradicts
`pod-redo-scope-2026-08-07.md`, the live measurement wins and the correction is named below.

---

## The answer, in one sentence

**Yes — every one of the 64 in-scope course pods still holds the old 142-sentence, 15-scene
set, and none of them is halfway; but the ten Austrian German samples Tom was sent are a more
interesting case than that, because nine of those ten lines are ones the new canonical keeps
word for word.**

So the sample did not show him old content. It showed him the opening scenes, which barely
changed. What it could not show him is the 89 new sentences and the seven new scenes, because
it was drawn off the top of the old queue.

---

## What is out there

| | Count |
|---|---|
| Canonical `pod-0` | 231 sentences / 22 scenes |
| Courses holding a pod-0 | 67 |
| **OLD — 142 rows / 15 scenes** | **64** |
| CANONICAL — 231 rows / 22 scenes | 3 — the two Welsh courses, and now `deu_at_for_eng` |
| MIXED / OTHER | 1 — `zzz_test_for_eng`, a 6-row test shell |

**There is no partially-migrated course.** Every one of the 64 is exactly 142 rows across
exactly 15 scenes. That is worth stating plainly because it was the interesting case to look
for: the fleet is cleanly on one side of the line, so nothing needs bespoke repair.

Two Welsh courses also carry an empty legacy `pod-0` shell alongside their aligned
`pod-0-unrecorded`, which is why 67 courses hold 69 pod-0-family pods.

---

## The samples Tom was asked to approve

The ten `deu_at_for_eng` clips generated today are `global_order` 1 to 10 — the first ten lines
of the old pod, scenes 1 to 4. Verified against the live rows, not inferred from the commit.

Diffed against the new canonical, nine of those ten lines **survive byte for byte**. Only one
changed: the coffee order in scene 3 was reworded.

| | |
|---|---|
| Clips generated | 10, from a queue of 142 |
| Lines that survive into the new canonical | 9 |
| Lines reworded under the new canonical | 1 |
| New scenes represented in the sample | 0 of 7 |

**Recorded approvals: none.** `app_config.pod_voice_approvals` is empty, so no approval anywhere
in the estate was taken on old-sentence audio and none needs re-taking.

---

## Per-course detail

`Survives` / `Reworded` / `New` / `Retired` are the four buckets of the shared diff engine,
measured per course against the 231-line canonical. `Retired` counts served lines the canonical
has no place for; they are blanked and parked, never deleted.

| Course | Rows / scenes | Verdict | English side | Survives | Reworded | New | Retired | Target clips | Known clips |
|---|---|---|---|---|---|---|---|---|---|
| `ara_eg_for_eng` | 142 / 15 | OLD | known | 118 | 23 | 90 | 1 | 142 | 142 |
| `ara_for_eng` | 142 / 15 | OLD | known | 110 | 31 | 90 | 1 | 142 | 142 |
| `ara_sy_for_eng` | 142 / 15 | OLD | known | 116 | 25 | 90 | 1 | 142 | 142 |
| `bul_for_eng` | 142 / 15 | OLD | known | 113 | 27 | 91 | 2 | 142 | 142 |
| `cat_for_eng` | 142 / 15 | OLD | known | 106 | 35 | 90 | 1 | 142 | 142 |
| `cat_for_spa` | 142 / 15 | OLD | **neither** | — | — | — | — | 142 | 142 |
| `cym_n_for_eng` | 232 / 22 | CANONICAL | known | 231 | 0 | 0 | 1 | 26 | 23 |
| `cym_s_for_eng` | 232 / 22 | CANONICAL | known | 231 | 0 | 0 | 1 | 0 | 0 |
| `dan_for_eng` | 142 / 15 | OLD | known | 94 | 47 | 90 | 1 | 142 | 142 |
| `deu_at_for_eng` | 232 / 22 | CANONICAL | known | 231 | 0 | 0 | 1 | 9 | 0 |
| `deu_for_eng` | 142 / 15 | OLD | known | 108 | 33 | 90 | 1 | 142 | 142 |
| `deu_for_jpn` | 142 / 15 | OLD | **neither** | — | — | — | — | 142 | 142 |
| `ell_for_eng` | 142 / 15 | OLD | known | 110 | 31 | 90 | 1 | 142 | 142 |
| `eng_for_ara` | 142 / 15 | OLD | target | 141 | 1 | 89 | 0 | 139 | 142 |
| `eng_for_ben` | 142 / 15 | OLD | target | 141 | 1 | 89 | 0 | 139 | 142 |
| `eng_for_deu` | 142 / 15 | OLD | target | 141 | 1 | 89 | 0 | 139 | 142 |
| `eng_for_fra` | 142 / 15 | OLD | target | 141 | 1 | 89 | 0 | 139 | 142 |
| `eng_for_guj` | 142 / 15 | OLD | target | 141 | 1 | 89 | 0 | 139 | 142 |
| `eng_for_hin` | 142 / 15 | OLD | target | 141 | 1 | 89 | 0 | 139 | 142 |
| `eng_for_ita` | 142 / 15 | OLD | target | 141 | 1 | 89 | 0 | 139 | 142 |
| `eng_for_jpn` | 142 / 15 | OLD | target | 141 | 1 | 89 | 0 | 139 | 142 |
| `eng_for_kor` | 142 / 15 | OLD | target | 141 | 1 | 89 | 0 | 139 | 142 |
| `eng_for_pan` | 142 / 15 | OLD | target | 141 | 1 | 89 | 0 | 139 | 142 |
| `eng_for_por` | 142 / 15 | OLD | target | 141 | 1 | 89 | 0 | 139 | 142 |
| `eng_for_sin` | 142 / 15 | OLD | target | 141 | 1 | 89 | 0 | 139 | 142 |
| `eng_for_spa` | 142 / 15 | OLD | target | 141 | 1 | 89 | 0 | 139 | 142 |
| `eng_for_tam` | 142 / 15 | OLD | target | 141 | 1 | 89 | 0 | 139 | 142 |
| `eng_for_urd` | 142 / 15 | OLD | target | 141 | 1 | 89 | 0 | 139 | 142 |
| `eng_for_zho` | 142 / 15 | OLD | target | 141 | 1 | 89 | 0 | 139 | 142 |
| `est_for_eng` | 142 / 15 | OLD | known | 113 | 29 | 89 | 0 | 142 | 142 |
| `eus_for_eng` | 142 / 15 | OLD | known | 113 | 28 | 90 | 1 | 142 | 142 |
| `eus_for_spa` | 142 / 15 | OLD | **neither** | — | — | — | — | 142 | 142 |
| `fas_for_eng` | 142 / 15 | OLD | known | 104 | 37 | 90 | 1 | 142 | 142 |
| `fin_for_eng` | 142 / 15 | OLD | known | 68 | 73 | 90 | 1 | 0 | 0 |
| `fra_ca_for_eng` | 142 / 15 | OLD | known | 113 | 28 | 90 | 1 | 142 | 142 |
| `fra_for_eng` | 142 / 15 | OLD | known | 114 | 27 | 90 | 1 | 142 | 68 |
| `fra_for_jpn` | 142 / 15 | OLD | **neither** | — | — | — | — | 142 | 142 |
| `gle_for_eng` | 142 / 15 | OLD | known | 105 | 37 | 89 | 0 | 142 | 142 |
| `heb_for_eng` | 142 / 15 | OLD | known | 98 | 43 | 90 | 1 | 142 | 142 |
| `hin_for_eng` | 142 / 15 | OLD | known | 88 | 53 | 90 | 1 | 142 | 142 |
| `hrv_for_eng` | 142 / 15 | OLD | known | 106 | 36 | 89 | 0 | 142 | 142 |
| `hye_for_eng` | 142 / 15 | OLD | known | 91 | 50 | 90 | 1 | 142 | 142 |
| `isl_for_eng` | 142 / 15 | OLD | known | 87 | 52 | 92 | 3 | 142 | 142 |
| `ita_for_eng` | 142 / 15 | OLD | known | 117 | 24 | 90 | 1 | 142 | 142 |
| `ita_for_jpn` | 142 / 15 | OLD | **neither** | — | — | — | — | 142 | 142 |
| `jpn_for_eng` | 142 / 15 | OLD | known | 123 | 18 | 90 | 1 | 142 | 142 |
| `kor_for_eng` | 142 / 15 | OLD | known | 127 | 14 | 90 | 1 | 142 | 142 |
| `lav_for_eng` | 142 / 15 | OLD | known | 122 | 20 | 89 | 0 | 142 | 142 |
| `lit_for_eng` | 142 / 15 | OLD | known | 113 | 29 | 89 | 0 | 142 | 142 |
| `nep_for_eng` | 142 / 15 | OLD | known | 127 | 14 | 90 | 1 | 142 | 142 |
| `nld_for_eng` | 142 / 15 | OLD | known | 107 | 35 | 89 | 0 | 142 | 142 |
| `nor_for_eng` | 142 / 15 | OLD | known | 113 | 27 | 91 | 2 | 142 | 142 |
| `pol_for_eng` | 142 / 15 | OLD | known | 97 | 43 | 91 | 2 | 142 | 141 |
| `por_br_for_eng` | 142 / 15 | OLD | known | 108 | 33 | 90 | 1 | 142 | 142 |
| `por_for_eng` | 142 / 15 | OLD | known | 113 | 28 | 90 | 1 | 142 | 142 |
| `ron_for_eng` | 142 / 15 | OLD | known | 121 | 19 | 91 | 2 | 142 | 142 |
| `spa_for_eng` | 142 / 15 | OLD | known | 91 | 50 | 90 | 1 | 142 | 133 |
| `spa_for_jpn` | 142 / 15 | OLD | **neither** | — | — | — | — | 142 | 142 |
| `spa_mx_for_eng` | 142 / 15 | OLD | known | 109 | 31 | 91 | 2 | 142 | 142 |
| `swa_for_eng` | 142 / 15 | OLD | known | 109 | 32 | 90 | 1 | 142 | 142 |
| `swe_for_eng` | 142 / 15 | OLD | known | 108 | 34 | 89 | 0 | 142 | 142 |
| `tha_for_eng` | 142 / 15 | OLD | known | 120 | 21 | 90 | 1 | 142 | 142 |
| `tur_for_eng` | 142 / 15 | OLD | known | 105 | 35 | 91 | 2 | 142 | 142 |
| `ukr_for_eng` | 142 / 15 | OLD | known | 114 | 27 | 90 | 1 | 142 | 142 |
| `zho_for_eng` | 142 / 15 | OLD | known | 125 | 16 | 90 | 1 | 142 | 142 |
| `zho_for_jpn` | 142 / 15 | OLD | **neither** | — | — | — | — | 142 | 142 |
| `zzz_test_for_eng` | 6 / 1 | MIXED/OTHER | known | 0 | 5 | 226 | 1 | 6 | 0 |

---

## What the existing audio is worth

Across the 41 courses whose known language is English, per course, of 231 canonical lines:

| Bucket | Lines | What it costs |
|---|---|---|
| Survives unchanged | 107.6 | Nothing — the target text and its clip both stand |
| Reworded, wording | 25.6 | Re-translate and re-render |
| Reworded, numerals only | 7.3 | Target clip stands; only the English guide line re-records |
| New | 90.0 | Fresh translation and fresh audio, both sides |
| Retired | 1.0 | Blanked and parked |

The prior in the scope document was 104.2 survive / 29.4 reworded-wording / 90 new. The small
shift is a measurement fix, not a change on the ground: the canonical carries a literal
`[target language]` token, and each pod already resolved it to its own language name. Reading
that name back out of the pod, instead of defaulting it, moves about three lines per course out
of "reworded" and back into "survives". Substituting the wrong name throws away a good target
line and its clip for nothing, so this is worth getting right before the fleet runs.

**The spread between courses is real and was not previously visible.** Survivors range from 68
to 127 lines depending on the course, because the 142 English lines are not identical across
pods — 49 distinct versions of the same 142 lines exist across the 64 courses. Most of the
variation is the resolved language name and whether numbers are spelled or written as digits,
but not all of it is. Per-course diffing is therefore not optional; a single fleet-wide figure
would be wrong for almost every course.

---

## Correction to the scope document, section 8.1

The scope document reported the 23 courses whose known language is not English as unsized, with
a directional probe suggesting ~94.6 survive / 132.2 new / 43 stale per course. **That average
blended two populations that should never have been averaged**, and the corrected split is:

- **The 16 `eng_for_*` courses: 141 of 142 lines survive byte for byte, 89 new, none retired.**
  With the English read from `target_text` where it actually lives, these are the *cleanest*
  population in the fleet, not the murkiest — their English is the old canonical almost
  verbatim, and exactly one line is reworded.
- **The 7 courses with English on neither side** — `cat_for_spa`, `eus_for_spa`, `deu_for_jpn`,
  `fra_for_jpn`, `ita_for_jpn`, `spa_for_jpn`, `zho_for_jpn` — **cannot be measured this way at
  all.** Their two fields hold Catalan and Spanish, or Chinese and Japanese. Diffing either
  against an English canonical returns zero survivors, which says the method does not apply, not
  that the content differs. They are reported as a gap below, not as a number.

The old average was arithmetically exactly this blend: 16 courses at 141 and 7 at 0 averages to
98.1, and 16 at 0 stale with 7 at 142 averages to 43.2.

A dedicated audit of all 23 has since settled both points, in
`pod0-nonenglish-known-audit-2026-08-08.md`:

- **All 23 do descend from Aran's old canonical**, proven three ways — the scene, sentence and
  global-order spine agrees at 142 of 142 rows in every course; the 16 `eng_for_*` courses are
  byte-identical to the old English on 137 of 142 rows, the other 5 being the `[target language]`
  token correctly resolved to "English"; and the 7 with no English side carry that same
  substitution, at those same 5 row numbers, in their own languages. A line that resolves the
  canonical's own placeholder at the canonical's own row number was not authored independently.
- **Correctly mapped, all 23 show 141 surviving, 89 new and nothing stale** — so they are the
  cheapest courses in the estate to bring up to the new canonical, not the most expensive.

That audit also found something nobody was looking for. The three missing target clips in each
`eng_for_*` course are the same three rows every time — and all three belong to the speaker
**Customer 3**, who has exactly three lines in the pod. It is one speaker missed entirely, not
three scattered failures, and it is not confined to that family: of the 65 pods that carry a
Customer 3, **20 are missing all of its target audio**. Worth its own small item.

---

## Gaps, named plainly

1. **Lineage for the 7 English-on-neither-side courses is proven; translation quality is not.**
   Their diff is computed against the old canonical English supplied by row position, because
   their own rows hold no English. That is sound for the only question that matters — has this
   line changed — but nobody has read their Japanese, Spanish, Catalan or Basque against the
   English for fidelity.
2. **The diff is a text diff.** It establishes which lines changed; it does not listen to a
   single existing clip. A line that survives byte for byte is assumed to have a valid take,
   which is true of the text and unverified of the audio.
3. **Nothing here measures the pod-1 or pod-0.5 families**, which also exist in
   `canonical_pod_scenarios` at 236 and 27 sentences.
