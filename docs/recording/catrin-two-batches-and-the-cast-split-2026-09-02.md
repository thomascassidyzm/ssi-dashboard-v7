# Catrin's two batches, Aran's one, and the thing that is actually wrong

2026-09-02, the night before the session. Second pass, driven by the WhatsApp
thread of Sunday 23 August, which is contemporaneous and outranks inference.

**Nothing recorded on 23 August was condemned — not Aran's, not either of
Catrin's batches. But 39 pod lines have changed hands between the two artists,
and the recording queue and the pod disagree about who they belong to.** That is
a different story from a blanket marking pass, and it has a different fix.

## The three batches, identified

The messages describe four Catrin clips that went badly, then a fix, then a bunch
from Aran, then a later Catrin run-through described as decent. Three batches, in
that order, with those sizes. The database has exactly three batches on 23 August,
in that order, with those sizes:

| Batch | `recorded_at` (DB clock) | Takes | Attached | Marked bad |
|---|---|---|---|---|
| Catrin, early | 14:44:39–14:47:58 | **4** | superseded | 3 |
| **Aran** | 17:16:50–17:27:22 | **36** | 36 | **0** |
| **Catrin, late** | 18:17:28–18:24:15 | **56** | 56 | **0** |

**An explicit gap:** the DB/S3 clock runs about two hours behind the message
timestamps Tom quoted (Aran's "did a bunch of mine" at 20:23 vs a batch finishing
18:27 BST; "Catrin is doing a run through now" at 21:19 vs a run finishing 19:24
BST). The offset is the same for both events and I cannot account for it. The
identification does not rest on it — sequence, sizes and the recordist changeovers
match one-to-one — but I am not going to pretend the clocks line up.

## Measured, on the real bytes

`checkTakeBoundaries`, 4 concurrent, the same measurement as the first pass.

| Group | n | lead ms min/med/max | tail ms | boundary gate |
|---|---|---|---|---|
| **Aran, 23 Aug** | 36 | 340 / 365 / 670 | 375–694 | **36/36 pass** |
| **Catrin, late, 23 Aug** | **56 (all)** | 340 / 360 / 1200 | 374–686 | **56/56 pass** |
| Catrin, early — what the pod serves now | 4 | 340 / 350 / 730 | 419–510 | 4/4 pass |
| Catrin, early — clip 1, "the perfect read" | 1 | 350 | 410 | pass |
| Catrin, early — the two marked empties | 2 | 0 / 400 | 481 / 638 | 46.7 s and 96.8 s of room |
| Aran, June + 10 Aug (the marked 100, sample) | 16 | **0 / 0 / 0** | 17 / 23 / 36 | **0/16 pass** |

Catrin's later batch is as healthy as Aran's, end to end, and none of it carries a
mark. **Her good batch was never condemned.**

## Did anything mark Catrin? Yes — correctly, and by measurement

`tools/recording/mark-empty-takes-2026-08-23.cjs`. Unlike the Aran script it is
not wholesale: it carries **three hand-listed uuids, each with its own
measurement** (96.8 s / 24 syllables, 46.7 s / 14, and a third), and its header
records Tom's ruling that *"take 1 is a perfect read"* while takes 2–4 "are just
not even voice recordings … there was even a sheep in one of them". That is his
19:20 message, applied per clip. It marked three and spared clip 1.

Those three objects have since been **superseded**: S3 says the four objects the
pod serves at those slots were written at **18:17:28–18:17:50**, the opening
seconds of Catrin's late run. She re-read her four bad lines first. The marks now
dangle on retired objects, which is what a mark should do once the pointer moves.

## What is actually wrong: the cast is half-recast

Two sources name who records a line, and they disagree:

- `listening_pods.speakers` — matches what was actually recorded on Sunday;
- `courses.voice_config.podCast` — **what the recording queue reads**.

| Speaker | pod says | queue says | lines | already have a take |
|---|---|---|---|---|
| Customer | Aran | **Catrin** | 10 | 10 |
| Passenger | Catrin | **Aran** | 6 | 2 |
| Tourist | Aran | **Catrin** | 5 | 5 |
| Bartender | Catrin | **Aran** | 5 | 5 |
| Driver | Aran | **Catrin** | 5 | 5 |
| Assistant | Catrin | **Aran** | 4 | 4 |
| Barista (+3 pm) | Catrin | **Aran** | 4 | 4 |
| | | | **39** | **35** |

Consequence, computed from the live queue (`buildQueue`, read-only): **28 pod
lines that already carry a good Sunday take show as outstanding** — 18 in Aran's
queue, 10 in Catrin's. Not one is flagged `rerecord_wanted`; the queue simply says
"you have not recorded this", and it is right, because the line was reassigned to
the other artist after Sunday. Aran is queued for Barista, Bartender, Assistant and
Passenger lines Catrin already read well; Catrin is queued for Customer, Tourist,
Driver and Diner 2 lines Aran already read well — and in several cases that means
reading a character of the other gender.

**This is not mine to resolve.** Which cast wins is a product call. It is a
decision for Tom before the session, not a repair.

## Aran's and Catrin's queues tomorrow, as the code computes them

| | Aran | Catrin |
|---|---|---|
| pod lines outstanding | 54 | 113 (79 of them the Learner's own turns) |
| of those, already carrying a good Sunday take | **18** | **10** |
| flagged as serving a take marked bad | 51 | 0 |
| seed/quarry lines | 305 | 305 |

The 51 on Aran's side are the June and 10 August takes he condemned by ear, which
measure at 0 ms of head. Cross-checked: **none of those 51 was read on Sunday.**

## Changed: nothing

No provenance flag altered, no pointer moved, no row deleted, no cast rewritten.
The measurements found nothing wrongly condemned, so there was nothing to restore.

`tools/recording/verify-take-invariant.cjs cym_n_for_eng` before and after, identical:
231 lines, 462 tracks, 0 disagree, 0 silent-with-a-take, **64 serving a take a human
marked bad** (51 target-side, 13 English-side).
