# Re-record wanted — a pod line can be queued without unlinking its audio

2026-08-14. Course `cym_n_for_eng`, pod-0. Branch `feat/pod-rerecord-wanted-2026-08-14`,
merged to `main` as `4fc6e4e9`, deployed on watson-1.

## The hole this fills

The pod recording engine had one lever for "record this line again": set
`{kind}_audio_id` to NULL. For a dead stub that costs nothing — the audio is
silence. For the 81 clipped takes in this pod it costs the learner: they are
real, playable Welsh, and nulling the FK takes them off the learner's path
before a replacement exists. That is make-before-break inverted.

## What was built

`listening_pod_sentences.rerecord_wanted jsonb`, nullable:

```json
{"target": "human_aran_cym_n", "known": "human_catrinlliar_cym_n"}
```

Either key optional. Meaning: **this track is wanted, freshly recorded, by that
voice** — with the existing audio still linked.

Three behaviours, all in `services/voice-engine/`:

1. **Routing** (`pods-plan.cjs`, `buildRecordingPlan`) — a wanted track is
   emitted for the named voice regardless of the cast. This is what lets an
   English (known) line reach Catrin at all: every known line otherwise routes
   to `__explainer__`, which for cym_n is Aran. A want does not make the voice a
   cast member of that character, and it does not drag the explainer queue along.
2. **Outstanding** (`pods-plan.cjs`, `finalizeRecordingPlan`) — a wanted track
   counts as NOT recorded whatever its audio says, so the line reads as work to
   do while its old take stays linked (`audioId` still points at it) and playable.
3. **Fulfilment** (`pods-registration.cjs`, `commitPodRegistration`) — the new
   take clears that key in the SAME statement that re-points the audio FK, so a
   line can never be left both freshly recorded and still queued. Only that
   kind's key goes; a want on the other track is a different job.

Migration: `database/migrations/20260814_pod_sentence_rerecord_wanted.sql` —
additive, nullable, partial index on the small "something is wanted" set.
Applied to live via `.env.psql`.

Tests: 11 new cases across `pods-plan.test.cjs`, `pods-plan-finalize.test.mjs`,
`pods-registration.test.mjs`. Full suite `npx vitest run services/` — **70 files,
1,262 tests, all passing.**

## The load: 107 lines from the T20 forensics lists

Source: commit `3fc360c3` on `docs/t20-clipped-recordings-forensics-2026-08-14`,
`rerecord-list-aran.csv` (92 rows) and `rerecord-list-catrin.csv` (15 rows).

The CSVs are **clip-level**; the recording queue is **line-track-level**. Two
Aran sentences carry two clipped takes each (`SC11-S001`, `SC12-S008` — one take
per text variant, only one of the two linked), so 92 clip rows are 90 distinct
(sentence, track) wants:

| recordist | target wants | known wants | total | clip rows in CSV |
|---|---|---|---|---|
| Aran `human_aran_cym_n` | 79 | 11 | 90 | 92 |
| Catrin `human_catrinlliar_cym_n` | 0 | 15 | 15 | 15 |

95 sentences touched, 105 keys written, one transaction with a
row-count assertion. No audio FK was changed and no `course_audio` row or S3
object was touched. The 11 Aran dead-stub lines whose `known_audio_id` a
previous worker had already NULLed were left null — they only gained the routing
key.

## Verification, through the engine's own plan builder

Not by reading the writes back: `buildRecordingPlan` + `finalizeRecordingPlan`
against the live tables, exactly as `GET /pods/recording-plan` calls them.

```
human_aran_cym_n
  plan totals            : {"items":318,"recorded":8,"remaining":310}
  wanted items in plan   : 90  (target 79, known 11)
  ... outstanding        : 90
  ... audio still linked : 79

human_catrinlliar_cym_n
  plan totals            : {"items":159,"recorded":0,"remaining":159}
  wanted items in plan   : 15  (target 0, known 15)
  ... outstanding        : 15
  ... audio still linked : 13

clipped takes: 81 checked | rows found 81 | s3_key drifted 0 | under 2KB 0 | no longer linked 2
```

Every wanted key reached its recordist's plan and every one reads as
outstanding. All 79 Aran target lines still carry their audio pointer; Catrin's
13 of 15 are the ones whose stub was still linked (the other 2 were already
null). The two clipped clips that are "no longer linked" are the superseded
alternate takes of `SC11-S001` and `SC12-S008` — they were never the linked
pointer, and their rows and S3 keys are untouched.

## Gap

The HTTP route `GET /api/production/cym_n_for_eng/pods/recording-plan` was not
exercised end-to-end: it 401s without a dashboard session. The deployed process
was restarted after the pull, and the router's own `SENTENCE_COLUMNS` list was
confirmed against the live table (returns all 95 wanted rows), so the served
code and its query are the verified ones — but the assertion above is at the
engine layer, not through the wire.
