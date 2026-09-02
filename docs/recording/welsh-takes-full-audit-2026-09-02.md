# Every Welsh take, measured. Why Aran's screen says 26, and what it should say

2026-09-02, ~00:30Z, the night before the session. Third and final pass: the
whole population measured, not a sample.

**Aran is right — he recorded more than 26 good ones. He recorded 36.** None of
the missing ten was condemned by anything. They are ten lines that changed hands
in the recast, and the queue counts a line for you only if the cast still names
you. **No take was wrongly marked: all 76 marked takes measure clipped or will
not decode. Nothing was restored, because nothing measured restorable.**

## 1. The population — every take that exists

Enumerated from `course_audio` and `recording_provenance` together, all human
Welsh voices, whatever the flag and whether or not any pointer references it.

| | takes |
|---|---|
| `course_audio` rows, human cym voices | 205 |
| provenance rows with no `course_audio` row (superseded originals still in S3) | 35 |
| **true total in storage** | **240** |
| **measured with ffmpeg** | **213** |
| would not decode | **27 — reported as a gap below** |

By recording day: 15 June 50, 16 June 22, 10 August 41, **23 August 92**. Nothing
is deleted; Tom's read of the mechanism is correct.

## 2. All 76 marked takes, measured individually

| measurement | n | day | serving? |
|---|---|---|---|
| **CLIPPED** (0 ms head) | 12 | 15 Jun | not pointed at |
| **CLIPPED** | 10 | 15 Jun | serving |
| **CLIPPED** | 41 | 10 Aug | serving |
| **would not decode** | 13 | 15 Jun | serving, English side |
| **HEALTHY** | **0** | — | — |

**Zero of 76.** Tom's prediction that a share of the flagged takes would measure
healthy is not supported, and I would rather say so than hand him a flattering
number. Every marked take that decodes sits flush against frame zero — 0 ms of
head against the 340–1200 ms that every post-fix take carries.

**Nothing unmarked. Nothing re-pointed. Nothing deleted.**

## 3. Where Aran's missing takes actually are

| pod lines whose serving take is… | lines | measured healthy & unmarked |
|---|---|---|
| Aran's | 87 | **36** |
| Catrin's | 56 | **56** |
| nobody's | 88 | — |

**36 = exactly his 23 August session.** His screen shows 26 because the count is
"lines the cast still names you for, whose take is yours and not marked bad" —
and **10 of his 36 good lines are now cast to Catrin**. Same for her: 56 good
takes, screen shows 38, because **18 of hers are now cast to Aran**.

The whole gap between what they recorded and what their screens show is the
recast. None of it is a marking error.

## 4. The healthy takes nothing points at — checked, none restorable

Eight takes measure healthy but serve nothing. Every one was read against its
line before being left alone:

- **5 from 16 June** (`human_aran_cym_n_2`, 1.0–2.5 s): head margins **0.10, 0.13,
  0.20, 0.26, 0.58 s**. They clear the gate's 0.10 s floor but sit far below the
  340 ms every post-trim-fix take carries — pre-fix trim behaviour, from the era
  Tom condemned by ear. **Genuinely marginal. Left alone, with their numbers.**
- **2 from 23 August** (Catrin's clip 1 at 14:44, and one at 18:23): both are
  earlier takes of lines that already serve an equally healthy later take. Re-pointing
  would gain nothing.
- **1 from 23 August**, 96.8 s: the room recording. Correctly marked.

## 5. Per-cause counts

| cause | lines |
|---|---|
| wrongly marked bad | **0** |
| legitimately clipped (measured, 0 ms head) | **63** |
| marked but undecodable — **gap** | **13** |
| healthy but orphaned, and restorable | **0** |
| healthy but orphaned, superseded or marginal | 8 |
| **changed hands in the recast** | **28** (10 Aran → Catrin, 18 Catrin → Aran) |
| line text changed so the take no longer matches | 0 found |

## 6. The gap, stated

**27 objects will not decode** (`unchecked_decode_error`), 13 of them inside the
marked set — all 15 June, all on the English side. I could not measure them and I
have not judged them; they stay marked. That is 13 takes whose truth I do not know.

## 7. The one thing I did not touch, and why

`listening_pods.speakers` and `courses.voice_config.podCast` name different artists
for **39 lines, 35 of which already have a take**, and the queue reads `podCast`.
Aligning them is the change that would take Aran 26 → 36 and Catrin 38 → 56 and
delete 28 redundant re-reads. **I have not made it.** It is a voice-casting call,
not a measurement, and neither map is simply "right": swapping to the pod's map
makes the numbers worse (Aran 23, Catrin 35). One word from Tom settles it; a
midnight guess by me would put the wrong voice on a character in front of two
artists tomorrow.

## 8. Verified live

`https://popty.app/api/recording/voice/…`, read after this pass — identical to the
local computation, because nothing was changed:

| | total | recorded | outstanding | of which pod |
|---|---|---|---|---|
| Aran | 413 | **26** | 387 | 54 |
| Catrin | 466 | **38** | 428 | 113 (79 the Learner's own turns) |

`verify-take-invariant.cjs cym_n_for_eng`: 231 lines, 462 tracks, 0 disagree,
0 silent-with-a-take, 64 serving a take marked bad. Unchanged.
