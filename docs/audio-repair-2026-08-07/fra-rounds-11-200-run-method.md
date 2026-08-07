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

## The gap this run does NOT close — phase 2

The pass gates what it **renders**. A clip it leaves alone is byte-checked (alive, non-trivial size)
and reused as-is; it is never listened to. Across rounds 1-200 that is roughly 4,300 clips, mostly
the French side — and Tom named *"known layer and target-v2 are worst."* Every clip in the estate
predates the last-word rule, so no incumbent has ever been asked the question.

`tools/fra-incumbent-veracity-sweep.cjs` asks it: read-only, renders nothing, writes nothing,
deletes nothing, and emits a per-clip verdict list. It runs **after** the render pass — its whisper
fleet and the render gate's would otherwise fight for the same 8 cores. Re-rendering whatever it
finds is a separate, explicit step against that list.

Smoke-tested on 20 rounds-1-11 incumbents at 04:49Z: 20 listened, 0 damaged.
