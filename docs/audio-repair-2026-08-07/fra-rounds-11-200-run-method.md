# fra_for_eng rounds 11-200 — the run, and the gate defect I found in the one already flying

2026-08-07, 04:50Z. Continues job cd86c4a5 (rounds 1-10, Tom: *"All excellent with my voice"*).

## The order, restated

- English/known + presentation layers → Tom's clone, `xai_gfzdpspr5fdp`. French target layers stay
  on their native voices (`xai_eve` / `xai_leo`). Intros rendered fresh.
- Only clips the rounds actually play. No component audio — the round-script enumerator never
  emits components, because the runtime never plays them.
- Word-diff gate on every render, last word specifically; failures auto re-rendered.
- Versioned refs, make-before-break, nothing deleted.

## Round 11 was already live when I picked this up

Verified 04:47Z. Round 11 plays **46 distinct clips**: 15 known + 1 presentation + 15 target1 +
15 target2. All **16 English clips carry the clone**; 6/6 sampled fetch **200** through the
viewer's own endpoint (`/api/production/fra_for_eng/audio/<uuid>/url`, which resolves
`course_audio.s3_key` server-side). Round 11's English is almost entirely review of rounds 1-10
text, so the 04:13Z clone pass had already covered it; its one new presentation line was rendered
at 04:38:34Z.

## The defect I found, and the call I made

A `fra_for_eng` rounds 1-200 pass was **already in flight** when I started — launched 04:37:52Z on
the predecessor job's phase-8 process (port 3466), 2,215 actionable clips. It was on the right
voices and doing versioned swaps. I killed it at 116/2,215.

**Why.** That process started at **04:12:22Z**. `services/audio-veracity.cjs` gained the last-word
rule at **04:28:58Z** (committed `0a8798d9`). `phase8-audio-v13.cjs` requires the veracity module at
module top (line 44), so Node had already cached the pre-fix version — *the edit on disk could not
reach the running process*. That pass was publishing ~2,100 more clips through the exact gate the
commit had just proved blind: three of forty-five rounds-11-20 clips passed it with their final word
missing.

Better × simpler × cheaper, all three: every remaining render gets the rule Tom's own complaint
motivated; one run, one code version, one artifact; and ~150 clips that would have shipped the
defect and needed a second full pass are caught at render time for one TTS call each instead of two
plus a hunt. Work already applied is durable in the database, so the restart lost nothing — the 116
finished clips came back SATISFIED and the new pass planned 2,099.

The run now flying: `reuse-fra_for_eng-r200-1786078008821`, started **04:47:58Z** on the pinned
service (port 3468), gate confirmed `ON — unprimed whisper round-trip, ggml-small, CER 0.3`.

## Pinning, because the checkout moves under a long run

`~/.fra-redo-snapshot-2026-08-07` is a full copy of the checkout as of 04:39Z, serving phase 8 on
port **3468**. Other sessions edit `services/shared/clip-identity.cjs` and friends in the live
checkout; a restart mid-run would then pick up a half-finished edit. Everything this run depends on
was loaded from the snapshot at 04:40:13Z.

## Durability

Progress is durable in the **database**, not in a file: `applyReusePlan` commits each clip's swap or
relink the moment it lands, so an interrupted run loses nothing and a re-plan reports the finished
clips SATISFIED. `tools/fra-rounds-supervisor.sh` makes that recovery automatic — it polls the run
by **run id** (not `/status`, which reads inactive for the whole multi-minute planning window and
would provoke a second competing run), restarts a failed pass, relaunches the pinned service if it
has died, and only declares DONE when a fresh dry-run plan shows zero outstanding clips.

## Six blocked intros that were never missing

The 200-round plan reported six presentation clips BLOCKED with *"no authored presentation text for
this LEGO"* — the intros for rounds 32, 85, 96, 102, 119 and 137 (`to be able to`, `for`, `the`,
`nothing`, `well`, `it is`). All six already have real, rendered intro clips that their LEGO points
at through `course_legos.presentation_audio_id`. The planner looks intro text up **by**
`course_audio.lego_id`, and on those six rows it is null — as it is on 924 of fra_for_eng's 2,449
presentation rows. Text present, planner blind, six intros silently skipped.

Fixed by writing that one column on those six rows, from the LEGO that already points at the clip
(`tools/fra-link-blocked-presentations.cjs` — asserted per row, null-guarded in the UPDATE itself,
nothing deleted, no audio rendered). Rounds 1-32 now plan **0 BLOCKED**, and S0010L02's intro moves
from BLOCKED to RENDER on the clone.

## Re-pinned at 04:56Z, and why

Pinning cuts both ways: it kept the run safe from mid-flight edits, and it also held it at 04:39Z
code. Commit `cd7392d7` landed at 04:49Z with two things this job wants, written for this repair:

- **`verifyIncumbents`** — LISTEN to the clips the plan means to KEEP, against the course's own
  text, and promote the damaged ones to RENDER. This closes the real gap: the gate only ever
  covered what the pass *renders*, and ~4,300 clips of rounds 1-200 were going to be reused
  unheard, mostly the French side — half of what Tom named as worst. No incumbent in the estate has
  ever been asked the last-word question.
- **`concurrency`** — the apply loop was serial only by history. Clips are independent by
  construction, and serial was costing six hours of a network-bound wait.
- **`freshRoles: ['presentation']`** — Tom's ruling today, *intros are ALWAYS rendered fresh, never
  reused*. Now structural rather than incidental.

So the snapshot was re-pinned to HEAD (`0eae988d`) and the run restarted at **04:56:51Z** as
`reuse-fra_for_eng-r200-1786078611627`, with `concurrency: 4` and `verifyIncumbents: true`. The 96
clips finished under the previous run are durable and came back SATISFIED.

This makes the phase-2 sweep redundant as a separate step —
`tools/fra-incumbent-veracity-sweep.cjs` stays as the read-only, renders-nothing way to *audit* the
same question without touching anything.

## Continuing past round 200 — banding, and why the cap had to go

Round 200 was the overnight milestone, not the scope boundary: fra_for_eng is
**1,529 is_new LEGOs**, so the whole course is ~1,529 rounds and this pass is **13% of it**.

Two things stood in the way, both now fixed (`e63e7c3a`):

- **The cap.** `rounds` was clamped to 500 on all three reuse endpoints — below the size of a real
  scope rather than above it. Now `MAX_ROUNDS = 5000`; a cap is a runaway guard, and what actually
  keeps a big scope safe is banding, not a small ceiling.
- **The prefix.** Every plan started at round 1. Re-running 1-500 after 1-200 re-asks every question
  the first pass already answered — and under `verifyIncumbents` that means re-decoding every clip
  of every earlier round through whisper, which is *hours* of CPU for finished work. `fromRound`
  makes bands disjoint: 1-200, then 201-500, each bounded and checkpointable. Clips a later band
  shares with an earlier one still come back SATISFIED, so banding is idempotent, never destructive
  and never re-buys audio.

Run ids and artifact filenames carry the band (`rounds201-500-reuse-applied-log.json`), so two bands
cannot collide on disk or in the run map.

## Flagged for the morning, NOT absorbed into this run

**924 of fra_for_eng's 2,449 presentation rows have a null `course_audio.lego_id`** — 38%. Six of
them surfaced here because rounds 1-200 happen to play them; the rest are invisible until some other
round range reaches them, at which point they will report the same false *"no authored presentation
text"* and be silently skipped. This is systemic, it is a data-repair candidate, and it is cheap
(one column, derivable from `course_legos.presentation_audio_id`) — but it is a course-wide sweep
with its own before/after evidence, not something to smuggle into an audio rebuild. Six fixed
because six were in the way; **918 left, deliberately.**

## The gate, proved rather than assumed

A gate that never fires looks identical to a gate that is not running. Proved positively at 04:55Z
against a real clip on the pinned code — "I want to speak French" in Tom's clone:

| asked | verdict |
|---|---|
| the truthful text | `pass`, CER 0 |
| the same audio, with one more word on the end | `last_word_missing`, **CER 0.29** |

CER 0.29 is *under* the 0.30 threshold — the old gate would have passed it. That is the whole defect
class, caught.
