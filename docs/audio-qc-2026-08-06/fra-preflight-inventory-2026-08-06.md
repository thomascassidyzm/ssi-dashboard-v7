# fra_for_eng preflight inventory — seeds 1-300

**2026-08-06, overnight. READ-ONLY.** Nothing was written to the DB, to S3, or to any generated
asset. No TTS. No repairs. This is the fact sheet that gates the French edge-shape scan, and it
mirrors `docs/audio/deu-preflight-inventory-2026-08-06.md` (branch `docs/deu-preflight-2026-08-06`)
method for method.

Full data, including the exact 21,512 clip ids the scan consumes:
`docs/audio-qc-2026-08-06/fra-preflight-inventory-2026-08-06.json`

---

## The four numbers

| | Count |
|---|---|
| **1. Live/shipped clips reachable from seeds 1-300** | **21,512** |
| **2. Unlinked audio (the do-not-spend list)** | **0** |
| **3. Absent audio (no clip anywhere)** | **33 slots** |
| **4. Dangling references (link to a dead row)** | **0** in scope |

The second number is the surprising one and it is worth stating plainly: **French has no free
re-links.** `tools/audio-link-reconcile.cjs fra_for_eng` was run DRY across the WHOLE course — not
just seeds 1-300 — and reports `(b) UNLINKED-BUT-PRESENT = 0 slots`, strict and loose both. There
is therefore nothing for `--apply` to write: a gated apply pass would have been a no-op, so none was
run. That is a different shape from German, which had 18 recoverable slots.

## 1. Total live inventory, seeds 1-300

21,512 distinct `course_audio` rows, reachable exactly the way
`services/audio-repair-core.cjs`'s `seedScopedAudioIds()` defines reachability: seed
known/target1/target2, LEGO known/target1/target2, LEGO presentation (via `lego_introductions`,
scoped by `lego_id` to LEGOs in seed range), and practice-phrase known/target1/target2 (all
`phrase_role`s — the traversal does not discriminate by role).

Content rows in scope: 300 seeds, 660 LEGOs, 7,566 practice phrases, 640 LEGO introductions.

| role | count |
|---|---|
| known | 6,952 |
| target1 | 6,963 |
| target2 | 6,957 |
| presentation | 640 |
| **total** | **21,512** |

By role and voice. As in German, two naming conventions for the same voice coexist (`eve` vs
`xai_eve`); noted as an observation, not investigated:

| role::voice_id | count |
|---|---|
| known::xai_eve | 6,911 |
| known::eve | 41 |
| target1::eve | 6,766 |
| target1::xai_eve | 197 |
| target2::xai_leo | 6,957 |
| presentation::xai_eve | 640 |

**Every reachable reference resolves to a live `course_audio` row — 21,512 refs, 21,512 rows, zero
dangling.** All 21,512 carry `origin = 'tts'`; there are no human recordings in this scope.

## 2. Render cohorts — the control data, gathered before the scan

This is the table the decisive control in the scan report is built on, so it is recorded here at
preflight time, before any measurement existed to be fitted to it.

| render date | clips |
|---|---|
| 2026-01-21 | 935 |
| 2026-02-03 | 6 |
| 2026-02-10 | 867 |
| 2026-02-11 | 1,120 |
| 2026-02-16 | 6 |
| 2026-02-26 | 3,473 |
| 2026-02-27 | 5 |
| 2026-03-10 | 4 |
| 2026-03-12 | 164 |
| 2026-04-30 | 1 |
| 2026-05-06 | 4 |
| 2026-05-13 | 18 |
| 2026-05-26 | 166 |
| 2026-05-28 | 1 |
| 2026-06-16 | 3 |
| 2026-07-05 | 12 |
| 2026-07-11 | 166 |
| 2026-07-28 | 4 |
| **2026-08-03** | **12,585** |
| 2026-08-04 | 609 |
| **2026-08-05** | **1,363** |

Two cohorts dominate and both are recent, which is a direct consequence of the 2026-08-03
fra_for_eng Azure-voice purge and re-render documented in
`docs/fra-audio-1608-forensics-2026-08-05.md`. **58% of the French clips a learner can reach in
seeds 1-300 were rendered on 2026-08-03 or later.** That is the opposite of German, where the bulk
of the estate is eight months old, and it means French has a large, recent cohort available as a
control on both sides of the trim's removal.

## 3. Unlinked audio — the do-not-spend list

**Zero.** Nothing in `fra_for_eng` is unlinked-but-present, on either the strict
(`normalizeForAudio`) or the loose (trailing-punctuation-insensitive) key, in any of the eleven
slot types the reconcile tool walks. No re-link pass was run because there was nothing to write.

Whole-course reconcile totals, for the record (this covers all 668 seeds, not just 1-300):

```
(a) LINKED               57,761
(b) UNLINKED-BUT-PRESENT      0   (0 strict + 0 loose)
(c) TRULY ABSENT         14,421   ← needs TTS; queue, never spend here
(d) DANGLING                 10   (0 healable)
```

Of that 14,421, **14,267 are `course_practice_phrases:presentation`** — a slot the reconcile tool
reports but deliberately never heals, because a phrase's `presentation_audio_id` has no established
provenance and no text key of its own. Excluding it, the whole-course genuine absence is **154
slots**, and the 10 dangling links all sit outside seeds 1-300.

## 4. Absent audio — slots with no audio id at all, seeds 1-300

**33 slots.** Every one of these makes the player SKIP the item. None is a candidate for repair and
none will be amputated.

| where | count |
|---|---|
| `course_legos:presentation` (missing LEGO introduction) | 20 |
| `course_legos:target2` (missing second target voice) | 2 |
| `course_practice_phrases:target2` | 11 |

Full per-item detail is in the JSON's `absent_items`.

### The LEGO verdict, which outranks the slot count

Per Tom's 2026-08-06 ruling, completeness is per-ROLE: a LEGO needs intro + target voice 1 + target
voice 2, and short of all three the player drops the LEGO and its whole round.

**638 of 660 LEGOs in seeds 1-300 are complete. 22 are broken.**

- **20 are missing only the introduction.** All 20 have `is_new = false`, so none of them opens its
  own round — the cheap-round-rescue category from the German run does not really exist here.
  Affected LEGOs: S0003L02, S0067L01, S0072L01, S0080L01, S0083L02, S0101L02, S0103L02, S0121L02,
  S0127L02, S0130L02, S0149L01, S0180L01, S0218L02, S0234L02, S0243L02, S0262L01, S0268L03,
  S0271L01, S0273L01, S0296L01.
- **2 are missing target voice 2, and both have `is_new = true`** — these two DO open rounds, so
  they are the course-breaking pair in this scope: **S0015L01 ("et") and S0139L04 ("tôt")**.

Those two are the only genuinely round-costing gaps in seeds 1-300, and both need TTS rather than
a re-link. They are named here for a `queue-audio-pass` request; **no audio was generated for them
tonight** and the truncation repair does not touch them — absent audio is a different problem with
a different fix.

## 5. What this preflight does NOT establish

- **No S3 object was verified.** This pass is DB-only by instruction; every count above is a claim
  about `course_audio` rows, not about bytes in the bucket. The scan that follows performs one S3
  GET per clip across all 21,512, which settles storage far more completely than a sample would —
  and any clip whose bytes are gone will surface there as an unmeasurable, reported as such.
- **Nothing here says anything about audio QUALITY.** Not one clip has been measured at this point.
- **Seeds 301-668 are out of scope**, deliberately. The whole-course reconcile figures in §3 are
  the only numbers here that reach past seed 300.
