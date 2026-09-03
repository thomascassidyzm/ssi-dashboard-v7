# Croatian pod-0 — proofread waived, audio verified, ready to go live

2026-08-22

## The ruling (Tom, 2026-08-22, verbatim)

> "Can we not just make this already??!! We've been waiting for proofreading the Croatian. We don't speak Croatian. There's no way we can do that for 100 languages
>
> We have to trust that the LLMs generated the appropriate text. The TTS is all fine.
>
> Let's get this done. Then make sure we have a plan for how we will replace the old one to make sure all the progress data in the previous listening sentences is mostly covered. So it's a sensible transition. We know it won't be perfect but these listening exercises are much much better.
>
> So let's make all the audio
>
> Then let's look at the mapping plan and then let's get these old listening exercises replaced"

The human-proofread gate on machine-drafted Croatian target text is waived — for this pod, and as stated policy direction for all 100 languages. This document does not re-open that decision.

**Scope boundary, equally settled:** this job makes `hrv_for_eng:pod-0-unrecorded` go-live-ready. It does **not** go live. `tools/pods/pod-switchover.cjs` was not run. No row was written to `hrv_for_eng:pod-0` or `hrv_for_eng:pod-1`.

## What was cleared

118 rows on `hrv_for_eng:pod-0-unrecorded` carried `target_text_draft = true` (the awaiting-proofread marker). Per Tom's ruling, the flag was cleared — text, audio, and every other column were untouched.

- Script: `tools/pods/waive-proofread-draft-flag.cjs` (DRY_RUN by default; gated by `WHERE pod_id = 'hrv_for_eng:pod-0-unrecorded' AND target_text_draft = true`; per-row before-state assertion; aborts the whole run on drift).
- Dry-run log: `docs/pods/hrv-pod0-proofread-waiver-dryrun-log.json` (118 rows)
- Applied log: `docs/pods/hrv-pod0-proofread-waiver-applied-log.json` (118 rows cleared)
- Product effect: `GET /api/.../drafts` (the course-wide proofreading queue in `services/voice-engine/pods-router.cjs`) and the recording-room DRAFT badge (driven by `services/voice-engine/pods-plan.cjs`) no longer flag these 118 lines. That is the intended effect of the ruling, not a side-effect.

**Untouched, on purpose:** the three `sarah_to_friend_pending_signoff` blocks written by commit `6c7066ef6` on `SC01-S001`, `SC04-S002`, `SC05-S001` remain `"status":"PROPOSED — not canon until Aran signs off this specific line"`. That is a separate, still-open ask about the *canonical English* (propagates to every language pair), not the Croatian proofread this ruling waives. It stays open at `docs/pods/hrv-pod0-friend-signoff-ask-2026-08-22.md`. Nothing was marked Aran-approved.

Before/after counts, confirming the waiver landed exactly where intended and nowhere else:

| pod_id | rows | draft (before → after) | no target audio | no known audio | no text |
|---|---|---|---|---|---|
| `hrv_for_eng:pod-0` (LIVE — not touched) | 142 | 0 → 0 | 0 | 0 | 0 |
| `hrv_for_eng:pod-0-unrecorded` (this pod) | 231 | 118 → **0** | 0 | 0 | 0 |
| `hrv_for_eng:pod-1` (not touched) | 180 | 0 → 0 | 0 | 0 | 0 |

## Audio verification — what was actually checked

**This was a full check of all 231 rows, not a sample.** For every row: `target_audio_id` and `known_audio_id` were resolved through `course_audio` to their S3 object, the object was confirmed present via HTTP HEAD (200, non-trivial size), then downloaded and run through `ffprobe` to confirm it is decodable audio of a plausible duration for its text.

Tool: `tools/pods/verify-pod-audio.cjs --pod=hrv_for_eng:pod-0-unrecorded --probe-all` (read-only; run in ~95 seconds). Full per-row detail: `docs/pods/hrv-pod0-audio-verify-hrv_for_eng_pod-0-unrecorded.json`.

| Check | Target (Croatian) clips | Known (English) clips |
|---|---|---|
| Rows | 231 | 231 |
| Resolved to a `course_audio` row | 231/231 | 231/231 |
| HEAD 200, non-trivial size | 231/231 | 231/231 |
| ffprobe: decodable, plausible duration | 231/231 (**full check, all 231**) | 231/231 (**full check, all 231**) |

Zero dead or unplayable clips found. Per the spend rule below, **nothing was re-rendered** — nothing needed to be.

**Shared-clip check:** confirmed reachable-from-both-pods sharing exists and is expected (the pod-0 build reused 113 pre-existing clips). 19 `target_audio_id`s and 63 `known_audio_id`s are used by both `hrv_for_eng:pod-0` (live) and `hrv_for_eng:pod-0-unrecorded`. Nothing was unlinked, deleted, or otherwise touched — this is read-only confirmation that the live pod's audio is unaffected by anything done here.

## Spend

Standing rule: never generate TTS without a plan and approval; a content pass ends by queueing an audio pass, never by running TTS directly. Tom's "let's make all the audio" was approval for this pod's audio specifically — and every clip was already alive and playable, so **zero clips were rendered, zero dollars spent.**

## Go-live readiness gate (the exact query `pod-switchover.cjs` uses to decide readiness — run directly, the tool itself was NOT invoked)

```sql
select count(*) n,
       count(*) filter (where coalesce(btrim(target_text),'') = '') no_text,
       count(*) filter (where target_text_draft) draft,
       count(*) filter (where target_audio_id is null) no_target_audio,
       count(*) filter (where known_audio_id is null) no_known_audio
  from listening_pod_sentences where pod_id = 'hrv_for_eng:pod-0-unrecorded';
```

| n | no_text | draft | no_target_audio | no_known_audio |
|---|---|---|---|---|
| 231 | 0 | 0 | 0 | 0 |

Every blocker the switchover gate checks reads zero. `hrv_for_eng:pod-0-unrecorded` is go-live ready.

## What is still open

1. **Aran's Friend-rename sign-off** — the canonical English change (Sarah → the Friend, female, named; protagonist stays male-voiced, unnamed) is still `PROPOSED`, not canon, on the three rows listed above. Ask is at `docs/pods/hrv-pod0-friend-signoff-ask-2026-08-22.md`. Aran has no direct account on this surface — this reaches him only via Tom or the recording-room DRAFT badge.
2. **The progress-mapping plan.** Tom's sequence is: get this pod ready (done, this doc) → look at the mapping plan → replace the old listening exercises. The mapping plan itself — how `learner_pod_state` on the live 142-row `pod-0` maps onto this 231-row canon so progress "is mostly covered" — has not been scoped in this job and is the next step, not this one.
3. **The switchover itself.** Not run. `hrv_for_eng:pod-0` (142 rows, live) and `hrv_for_eng:pod-1` (180 rows) are untouched, byte-identical to their pre-existing state, per the before/after table above.

## Where to listen

`https://popty.app/production/hrv_for_eng/pods/pod-0-unrecorded`

(This is the staged, not-yet-live pod. The live learner-facing pod is unchanged.)
