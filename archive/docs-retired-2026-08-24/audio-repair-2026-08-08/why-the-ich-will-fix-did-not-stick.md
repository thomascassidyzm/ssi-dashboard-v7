# Why the German "ich will" fix did not stick

**2026-08-08, traced live from the database, the S3 bytes and the pipeline's own run log.**

---

## The verdict, in one line

Your fix was correct and it landed. **A pipeline run at 05:19Z this morning moved the pointer back** — and it did so *because* of how the fix was made: the January take you approved carries a tombstone in its text (`ich will ::superseded-regen`), and the reuse planner looks up candidate clips **by text**. A tombstoned row is invisible to it. So the planner saw round 1 pointing at a clip it could not account for, found the only row whose text reads exactly `ich will` — the bad 6-August xAI take — and relinked round 1 onto it.

**The fix was self-defeating by construction.** Any hand-fix that points a slot at a `::superseded-regen` row is guaranteed to be undone by the next reuse pass. Not "at risk of". Guaranteed.

You are not wrong about the cache, and this is not a cache story. The pointer really did move, at 05:19:47Z, and the pipeline logged itself doing it.

---

## Hear it

**What was being served to you this morning** — the 6-August xAI take, the one that says *ich ver*:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/823CF48A-43BF-40C9-A5D2-56C2BE1788C7.mp3

**The January take you approved, now back in the slot:**

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/1CD434B3-3935-4DCC-B5E6-12BC5874EAAD.mp3

Second voice, same pair — now (Leo, January):

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/0BEF3EF1-612A-4A4B-9603-EE276421057A.mp3

---

## The mechanism, with the receipts

**The run.** `reuse-deu_for_eng-r100-1786166350406`, started 2026-08-08T05:19:47.661Z, finished 05:22:37.112Z. Its own applied-log records, verbatim:

```
clipKey:  target1|deu|xai_ara|ich will
action:   REUSED_OWN
audioId:  823cf48a-43bf-40c9-a5d2-56c2be1788c7      <- the bad 6-Aug take
previousAudioIds: [ 0f37d106-cb1a-4906-be37-042263330342 ]   <- your fix
viaVoiceAlias: true
holdersUpdated: course_legos / 83cc017d… / target1_audio_id / S0001L01 / applied: true
```

and the same again for `target2`. Out of **1398 NONE, 1164 RENDERED, 5 REUSED_CROSS and 4 REUSED_OWN** in that whole 100-round run, **two of the four REUSED_OWN moves were your fix being undone**.

**Why the planner could not see the right clip.** `services/audio-reuse-planner.cjs:675` looks candidates up with

```js
.select('id, course_code, text, text_normalized, …')
.in('text_normalized', texts.slice(i, i + batchSize))
```

The January row's `text_normalized` is the literal string `ich will ::superseded-regen`. It is therefore **never returned as a candidate for `ich will`**. The only candidate is the 6-August row. The planner compares the slot's current value to its chosen winner, sees a mismatch, and relinks — the same code path that logs `action: NONE, reason: already linked to …` when they agree.

**The bitter irony.** The planner's preference order at `audio-reuse-planner.cjs:802-821` is: own course → preferred source → **exact voice over aliased** → human > newest > id. The January row is voice `xai_ara`, an **exact** match for the clipKey. The bad row is voice `ara`, matched only **via alias** (`viaVoiceAlias: true` in the log). *If the January row had been a candidate at all, the planner's own rules would have chosen it.* The tombstone is the only thing that lost this.

**Why half the fix survived.** Round 1 has no BUILD phrases (the S1L1 0/0 validator ramp), so `deu_for_eng:S0001L01B01` was not in the run's play shape and was never re-evaluated. Its two slots still held the January rows this morning. That split — lego slots moved, phrase slots untouched — is itself the proof that a *play-shape-scoped reuse pass*, not some global sweep, did this.

---

## Where the fix was written vs where the pipeline reads

| | Table / column | Written by |
|---|---|---|
| The hand-fix | `course_legos.target1_audio_id` / `target2_audio_id`, and the same on `course_practice_phrases` | `tools/seed1-relink-revert.cjs` — a raw guarded pointer `UPDATE` |
| The pipeline | **the same columns** | `audio-reuse-planner.cjs` `relinkHolders()` |

They write to the identical place. There is no divergence to reconcile — the pipeline simply **overwrites the human's pointer with no memory that a human set it**. The tombstone is what decides which way the overwrite goes.

**Does a protection marker already exist?** Partly, and it is the wrong shape. `services/shared/audio-link-preference.cjs:16` implements

```js
const aHuman = a.origin === 'human'
if (aHuman !== bHuman) return aHuman ? a : b
```

So `course_audio.origin === 'human'` **is** honoured — but it marks *the provenance of the bytes* (a recorded human take), not *the fact that a human approved this pointer*. Both rows here are `origin: 'tts'`, so it could never have fired. **There is no per-slot pin, no approved/locked/protected flag, and no exclusion list that the reuse planner consults.** That is the missing thing.

---

## Text, render, or reference?

**Both — and the distinction is the whole story.**

- **The underlying defect is RENDER.** Yesterday's finding holds up: `text` is exactly `ich will`, `text_normalized` matches, nothing is malformed. The 6-August xAI take (`823cf48a…`, voice `ara`, 744 ms, `audio_revision: 2`) simply says it badly. `word_boundaries` is `null` on both rows, so there is no per-token evidence either way — I did not run whisper and would not trust it on a 744 ms clip if I had.
- **This morning's regression is REFERENCE.** Nothing was re-rendered for this clip today. A pointer moved. The bad bytes were already sitting there from 6 August; the slot was simply re-aimed at them.

Fixing the render (a better take) and fixing the reference (making a hand-fix survive) are two different jobs. Only the second one stops this recurring.

---

## Blast radius

**Exactly one hand-fix has been undone by this mechanism, and it is yours.** That is a measured number, not an estimate.

| Question | Answer | Method |
|---|---|---|
| Rows carrying the `::superseded-regen` tombstone | **164** — 107 `deu_for_eng`, 57 `fra_for_eng`, nothing anywhere else | `count(*) … where text like '%::superseded-regen'` |
| Slots repointed off a **previously non-null** row by this morning's runs (deu + fra, rounds 1-200, 6 applied logs) | **69** | parsed every `holdersUpdated` with `applied:true` and `currentAudioId ≠ to` |
| …of those, repointed **off a tombstoned row** — i.e. undoing a hand-fix | **2**, both `deu_for_eng` `S0001L01` | resolved all 68 distinct previous ids against `course_audio.text` |
| Slots **still** pointing at a tombstoned row — i.e. armed to be undone next run | **2**, and they are the surviving half of the same fix (`deu_for_eng:S0001L01B01`) | `.in()` on all 7 holder columns across both tables against the 164 tombstone ids |

The other 67 repoints this morning moved off ordinary live rows (62 of them created in July) — that is normal reuse churn, not hand-fix destruction.

**Honest bound on this.** The four numbers above are exact for the *tombstone* mechanism. A separate reconciliation of every historic hand-fix applied-log against the live column values — which would catch hand-fixes undone by routes *other* than the tombstone — is running in a parallel worker and is not in this number. I will bring you that figure when it lands. Two measurement traps were honoured: `duration_ms` was never used as a freshness signal (there is no `updated_at` on `course_audio`), and every count was taken through unordered `.in()` lookups rather than an ordered scan, because ordered `course_audio` reads on deu/fra time out at 8 s and come back empty — which looks exactly like a clean pass.

---

## What I did

Re-ran the existing, proven revert — the pointer move you already ruled for on 7 August. **Make-before-break first:** both January objects HEAD'd alive on S3 (9504 and 8640 bytes, distinct ETags from the 6-August pair) *before* any write. Dry run, then apply, guarded per row on the before-state.

```
OK    S0001L01 target1: back to 0f37d106
OK    S0001L01 target2: back to 695a757c
DRIFT deu_for_eng:S0001L01B01 target1 — left alone (already correct)
DRIFT deu_for_eng:S0001L01B01 target2 — left alone (already correct)
```

Verified after: all four slots now hold the January rows. `courses.deu_for_eng.content_stamp` bumped to 10:31:55Z, so the change invalidates cached scripts. Nothing was deleted; every row and object on both sides is still in place.

**This is first aid with an expiry date.** The tombstone is still on those rows, so the next reuse or rebuild pass over deu round 1 will undo it again, exactly as this morning's did.

---

## The durable fix — recommendation, not built

Three options, cheapest first. My read is **do 1 now and 2 this week**; 3 only if you want the general guarantee.

**1. Un-tombstone the two January rows.** Strip ` ::superseded-regen` from `course_audio.text` / `text_normalized` on `0f37d106…` and `695a757c…`. They become candidates again, and by the planner's *existing* preference rules the exact-voice `xai_ara` row beats the aliased `ara` row — so the planner starts choosing your take on its own, every run, with no code change. Cost: two column updates. Risk: two rows then share a clipKey, and the loser is simply never linked. **This makes the fix stick without touching the pipeline.**

**2. Make the reuse planner refuse to move a slot it cannot improve.** Today, when the planner's chosen winner differs from what a slot already holds, it relinks unconditionally. Add: if the slot's current row is alive on S3 and its *stripped* text matches, log `NONE — slot holds a deliberate override` and leave it. Cost: roughly a dozen lines in `decideClip`/`relinkHolders` plus a test. This is the guard that would have caught this one silently and for free.

**3. A real per-slot pin.** A `pinned_audio_id` (or a `pinned` boolean on the holder row) that every relink path checks first, written by the dashboard whenever a human corrects a clip, and surfaced so a pin can be seen and lifted. Cost: one migration, one write path, and an audit of every relink call site — `audio-reuse-planner.cjs`, `phase8-audio-v13.cjs`, `audio-repair-core.cjs`, `revoice-clips.cjs`, `regen-seed-clips-from-scratch.cjs`. This is the only option that makes the guarantee general rather than per-incident, and it is the one worth building if the answer to "can a hand-fix survive a pipeline run on this estate?" needs to be an unqualified yes.

---

## Where this contradicts yesterday's documents

Nowhere on the diagnosis — `deu-ich-will-and-voice-speed-2026-08-07.md` called the defect a render problem and that still holds. But `deu-ich-will-revert-2026-08-07.md` recorded the revert as done, and it was: it just did not record that pointing a slot at a tombstoned row arms it to be undone. That is the gap this document fills. The dated documents have been left exactly as they were.

## Explicit gaps

- **Telemetry.** I have not yet located a session-level record of what URL was served to you at 10:00-10:15Z; a worker is on it. The verdict above does not depend on it — it rests on the pipeline's own applied log and the live DB values, both of which are stronger evidence than a client-side event would be.
- **DEV vs PROD slot resolution** — being traced in the same worker; not yet reported either way.
- **The historic hand-fix reconciliation** beyond the tombstone mechanism — in flight, figure to follow.
