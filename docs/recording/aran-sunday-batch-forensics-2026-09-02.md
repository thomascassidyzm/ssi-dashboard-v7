# Was Aran's good Sunday-afternoon Welsh batch condemned by a blanket marking pass?

**No. Nothing was condemned, nothing is lost, and no correction is earned.**
Forensic pass 2026-09-02, the night before Aran and Catrin record.

## The hypothesis, and why it is false

The worry was that `mark-aran-clipped-takes-2026-08-23.cjs` selected by recordist
and date and so swept the whole of Sunday 23 August, condemning the good takes
made after that afternoon's capture fix.

It did select wholesale — by recordist, not by measurement. Its own header says so:

> "THE REASON RECORDED ON EVERY ROW IS THAT RULING, NOT A MEASUREMENT. No per-clip
> audit was run and none should be read into these marks … the ruling was
> course-wide for this recordist and the marking is wholesale."

Its scope is *every Aran clip attached to `cym_n_for_eng:pod-0` at the moment it
ran*. There is no date filter at all — so the hypothesis was live, and the only
way to settle it was to timestamp the hundred.

**Every one of the 100 marked takes was recorded on 15/16 June or 10 August.
Not one was recorded on 23 August.** The script ran at 17:02–17:15 UTC; Aran's
Sunday session began at 17:16. It condemned only what already existed.

## The trap in the timestamps

`course_audio.created_at` is the row's birth, not the take's recording time. A
re-read repoints an existing row's `s3_key`, leaving the old date in place. Read
that way, Aran's Sunday looks like 12 takes. Read from
`recording_provenance.recorded_at`, which is when the microphone was actually
open, it is **36**.

Sunday 23 August, `cym_n_for_eng:pod-0`, by real recording time:

| Time (UTC) | Voice | Takes | Attached | Marked bad |
|---|---|---|---|---|
| 14:44–14:47 | Catrin | 4 | 0 | 3 (empty-take gate) |
| 17:16–17:27 | **Aran** | **36** | **36** | **0** |
| 18:17–18:24 | Catrin | 56 | 55 | 0 |

The afternoon fixes sit exactly where Tom remembers them: `b5c590429` "a take can
measure like speech and contain none" (16:28), `c20b90f0d` "refuse a take that is
cut off at its own boundary" (16:56), `55ce00860` auto-advance against the room's
troughs (17:31). Aran's session starts twenty minutes after the boundary gate
landed. The marked set does not straddle the fix — it sits entirely months before it.

## The measurement, which is the arbiter

Head and tail room measured on the real bytes with `checkTakeBoundaries`, the
same gate the booth now runs, 4 concurrent.

| Group | n | lead ms (min/med/max) | tail ms (min/med/max) | gate pass |
|---|---|---|---|---|
| Aran, 23 Aug — new rows | 12 | 340 / 370 / 450 | 375 / 432 / 497 | **12/12** |
| Aran, 23 Aug — re-reads onto old rows | 24 | 340 / 360 / 670 | 388 / 430 / 694 | **24/24** |
| Catrin, 23 Aug (sample) | 12 | 340 / 370 / 730 | 374 / 437 / 686 | **12/12** |
| Aran, marked set, June + 10 Aug (sample) | 16 | **0 / 0 / 0** | 17 / 23 / 36 | **0/16** |

Twelve of the sixteen marked clips measure flush against frame zero with 17–36 ms
of tail; the other four will not decode at all. `speech_truncated_at_both_ends` on
every one. The two populations do not overlap — there is no marginal band and no
boundary to be conservative about.

Catrin's Sunday takes measure like Aran's, healthy on both ends. Her *bad* morning
is the four takes at 14:44, three of which are already marked by the separate
empty-take pass for containing no speech. That mark is correct and stays.

## What Aran will see tomorrow morning

231 lines on the pod. **139 outstanding**, and every one of them is honestly outstanding:

- **88** have never been recorded at all;
- **51** serve a take marked bad — the June and 10 August clips, measured above at 0 ms of head.

Cross-checked: **zero** of those 51 lines was read on Sunday. No line he read on
Sunday is being asked for again.

His Sunday work is all present: 36 takes, all attached and pointed at, none flagged.

## Changed: nothing

No provenance flag was altered, no pointer moved, no row deleted. The marking pass
was wholesale, but it was wholesale over a population that measures uniformly
clipped, and it stopped short of the Sunday by twenty minutes. Tom's ear and the
gate agree.

`tools/recording/verify-take-invariant.cjs cym_n_for_eng` reads the same before and
after this pass — 231 lines, 462 tracks, 0 disagree, 0 silent-with-a-take,
**64 serving a take a human marked bad** (51 target-side, 13 English-side).

## Two things noticed, deliberately not acted on the night before a session

1. **8 stale wants with no side.** Eight lines now serving Aran's good Sunday take
   still carry a `rerecord_wanted` object with only a `reason` key and no `target`.
   `targetRerecordWanted()` reads only `target`, so they put nothing in his queue —
   dross, not a defect. Left alone.
2. **13 known-side wants.** Thirteen lines serve a good Welsh take over an English
   clip from 15 June that is marked bad. Those belong to the English queue, not
   Aran's. Left alone.
