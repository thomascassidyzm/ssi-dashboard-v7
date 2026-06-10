# Voice Engine — the human synthesis loop

Turns a course's uploaded human recordings (~150 optimized phrases per voice) into the full
phrase audio set (`course_audio` rows, `origin='human'`) — course-agnostic, per voice slot.
No TTS, ever: the cost being minimised is the recorder's time.

Design authority: `docs/voice-engine/design/multi-voice-model.md` (the keystone) +
audit reports `docs/voice-engine/audit/02|04|06-*.md`.

## Mounting (integration's job — NOT done by this build)

One line in `services/production-api.cjs` (after the other `app.use` mounts):

```js
app.use('/api/voice-engine', require('./voice-engine/router.cjs').createVoiceEngineRouter())
```

## Routes

| Route | What |
|---|---|
| `POST /api/voice-engine/:courseCode/synthesize` `{ voiceId? \| role?, dryRun? }` | Start a per-course-per-voice synthesis job (align → segment → register takes → splice → register → link). `dryRun: true` returns the plan + gap report without writing. |
| `GET /api/voice-engine/:courseCode/synthesize/status?voiceId=` | Job progress/status (phase, counters, errors, final report). |
| `POST /api/voice-engine/:courseCode/synthesize/cancel` `{ voiceId }` | Cancel between items. |
| `GET /api/voice-engine/:courseCode/coverage` | HONEST per-slot counts: real phrase totals, recorded-take / spliced / missing per voice slot, plus the seed-auto-cover gap (LEGOs alignment can never extract). Replaces RecordingOptimizer's fabricated `totalLegos × 10` and TODO-stub zeros. |

## Pipeline (one job = one course + one voice slot)

1. **Load** — course + `voice_config` (slot ↔ voiceId resolution), new LEGOs (universe),
   phrases, seeds, `recording_provenance` takes (via the adapter, see Input contract).
2. **Align** (`align.cjs`) — zero-ML slow-gap (ffmpeg silencedetect, ported from
   `tools/recording-optimizer/align-audio.cjs`; aeneas/whisper are NOT dependencies).
   Alignment runs on the **slow** take (chunksString pause boundaries = the speaker's pause
   map). Chunk-count mismatch = QA gate → re-record flag, never a guess. Natural-take cut
   points come from direct detection when the speaker's natural micro-pauses match, else
   proportional transfer of the slow take's voiced-duration ratios.
3. **Segment store** (`segment-store.cjs`) — chunks cut (ffmpeg→lame, iOS-safe) and stored at
   `segments/{courseCode}/{voiceId}/{UUID}.mp3` + `manifest.json`. Identity is UUID/DB-keyed,
   **never filename-derived** (the old Latin-only `safeFilename` collapsed Cyrillic — Macedonian).
4. **Register takes** — whole-phrase natural takes are upserted to `course_audio` first.
   **A recorded whole-phrase natural take ALWAYS beats splicing that phrase.**
5. **Splice** (`splicer.cjs`) — un-recorded phrases tiled by the planner's own chunking
   (max-munch + glue-merge, ported for parity), segments looked up per `(voice_id, cadence)`,
   normalize −16 LUFS → 20 ms crossfade → **ffmpeg→lame** encode (never ffmpeg's mp3 muxer),
   uploaded to `mastered/{UUID}.mp3`, upserted with `origin='human'`, `role=slot`, `voice_id`
   (conflict = the live 5-column unique index). Missing chunks → gap report ("record these N
   more"), never a partial splice.
6. **Link** — the existing pass (`link_all_audio_ids` RPC). Note: today it has no
   human-preference ordering; that lands in the parallel safety build.

Resume = idempotency: re-POST after a crash skips manifest-present segments and
already-registered texts. Job state itself is in-memory (phase8 `startWork` idiom), keyed
per `(courseCode, voiceId)`.

## Input contract (⚠️ integration seam)

The engine consumes `recording_provenance` rows written by the parallel safety/upload-seam
build, carrying (keystone names): `course_code, s3_key, phrase_text, chunks_string, voice_id,
role, cadence, recorded_by`. **All field-name mapping is isolated in
`provenance-adapter.cjs#fromProvenanceRow`** — reconcile that one function (and the two
filter columns in `fetchProvenanceRows`) against what the safety build shipped; nothing else
changes. Until then, the engine reports `provenanceError` and zero takes honestly.

## Files

```
services/voice-engine/
  chunking.cjs           planner-parity chunkers + chunksString parsing (pure)
  align.cjs              slow-gap alignment + boundary math + segment cutting
  segment-store.cjs      S3 segment keys (UUID), JSON manifest, splice ledger
  splicer.cjs            splice plan (pure) + crossfade assembly (ffmpeg→lame)
  storage.cjs            S3 / local-filesystem adapter (tests never touch S3)
  provenance-adapter.cjs input contract — THE integration seam
  db.cjs                 paginated reads, human course_audio upsert, link pass
  synthesis-job.cjs      per-(course,voice) job orchestrator (progress/cancel/resume)
  coverage.cjs           honest per-slot coverage + seed-auto-cover gap
  router.cjs             express.Router (mount line above)
  __tests__/             vitest unit tests + local ffmpeg round-trip smoke test
```

Run tests: `npx vitest run services/voice-engine` (no env, no network — local tone fixtures).

## Hard rules honoured

- No DDL, no migrations; writes are `course_audio` upserts + S3 puts at runtime only.
- Vocabulary: known / target / seed.
- Voice is a hard partition of the splice space: one plan per `(voice_id, cadence)`;
  two larynxes are never spliced into one phrase. >2 spliced voices is out of scope
  (whole-utterance pod recordings are a later workstream, never spliced).
