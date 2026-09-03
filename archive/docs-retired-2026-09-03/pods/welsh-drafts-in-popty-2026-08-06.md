# Where Aran sees the Welsh drafts in Popty

2026-08-06. The 213 drafted Welsh lines (109 Northern, 104 Southern) are now visible as
drafts inside Popty for **both** Welsh courses, on the surfaces where the person who can
clear them is standing. His edit is the proofread; the marker comes off in the same save.

## What he does

1. Open the course in Popty — **Welsh (Northern)** `cym_n_for_eng`, or **Welsh (Southern)**
   `cym_s_for_eng`.
2. Under **Human Recording** there is now a tungsten strip:
   *"109 pod lines awaiting proofread — machine-written Welsh nobody has read yet."*
   It links straight into those lines.
3. That opens the pod with **Show only the drafts** already on: every drafted line, its
   English beside it, in scene order.
4. Press ✎ on a line, read it, press **Save**. The DRAFT marker comes off that line — even
   if he changed nothing, because "it still fits" needs to be his judgement, not a machine's.
   The counts everywhere drop by one.

## Why it needed doing

The DRAFT marker already existed and already reached the recorder's autocue. But that is
one voice's own queue, and the proofreader is not the person recording most of these lines:

| | in Aran's own recording queue | in Catrin's | total awaiting proofread |
|---|---|---|---|
| Northern | 21 | 88 | **109** |
| Southern | 15 | 89 | **104** |

Aran opening his own record link would have seen 36 of 213 and had no way to know the rest
existed. The proofreading surface therefore had to be course-wide and voice-blind, which is
what landed.

## Where the state shows now

| Surface | What it shows |
|---|---|
| Production overview, under **Human Recording** | count for the course + the way in |
| **Listening Pods** list | per-pod count on the card |
| **Pod detail** | DRAFT badge and ringed row per line, a drafts-only filter, and the note that saving clears the marker |
| Record room autocue (recorders) | unchanged per-line badge, plus the count said once before the session starts |
| `GET /api/production/:course/pods/drafts` | every drafted line, with its English and who is cast to read it |

## Verified live

On the deployed API (`popty-production-api`, commit `94703f8c`), signed in through real
Supabase auth as a throwaway **recorder-role** account holding the two Welsh courses:
`cym_n_for_eng` → 109, `cym_s_for_eng` → 104, a course it doesn't hold → 403, no token →
401. The probe identity was deleted afterwards. The pod-0 acceptance probe still passes on
all four Welsh queues with zero violations.

## The gap that remains

The Welsh itself is still a machine draft until Aran reads it. Nothing here changes that —
it makes the waiting visible and gives him the one-click way to end it, line by line.
Recorders cannot clear the marker (the pods door refuses writes from the recorder role), so
only Aran or another editor/admin on the course can.
