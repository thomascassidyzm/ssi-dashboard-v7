# Voice Engine — the human synthesis loop

Turns a course's uploaded human recordings (~150 optimized phrases per voice) into the full
phrase audio set (`course_audio` rows, `origin='human'`) — course-agnostic, per voice slot.
No TTS, ever: the cost being minimised is the recorder's time.

Design authority: `docs/voice-engine/design/multi-voice-model.md` (the keystone) +
audit reports `docs/voice-engine/audit/02|04|05|06-*.md` + `design/integration-map.md`.

Two routers live here, both MOUNTED in `services/production-api.cjs` under
`/api/production/:courseCode/...` so the app-level `app.param('courseCode')`
course-scope auth gate fires for every route:

```js
// synthesis + coverage (router uses mergeParams — must NOT declare :courseCode internally)
app.use('/api/production/:courseCode/voice-engine',
  require('./voice-engine/router.cjs').createVoiceEngineRouter())

// team roster + voice-slot assignment + recorder invites
app.use('/api/production/:courseCode/team',
  require('./voice-engine/team-router.cjs')({ requireDashboardUser, userCanAccessCourse,
    getDb: () => supabaseClient.getClient(), logger }))
```

## Synthesis routes

| Route | What |
|---|---|
| `POST /api/production/:courseCode/voice-engine/synthesize` `{ voiceId? \| role?, dryRun? }` | Start a per-course-per-voice synthesis job (align → segment → register takes → splice → register → link). `dryRun: true` returns the plan + gap report without writing. |
| `GET .../voice-engine/synthesize/status?voiceId=` | Job progress/status (phase, counters, errors, final report). |
| `POST .../voice-engine/synthesize/cancel` `{ voiceId }` | Cancel between items. |
| `GET .../voice-engine/coverage` | HONEST per-slot counts: real phrase totals, recorded-take / spliced / missing per voice slot, plus the seed-auto-cover gap (LEGOs alignment can never extract). Replaces RecordingOptimizer's fabricated `totalLegos × 10` and TODO-stub zeros. |

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
6. **Link** — phase8's `linkAudioIds` pass (human-preference pre-pass + RPC), so freshly
   recorded/spliced human rows win duplicate-text links.

Resume = idempotency: re-POST after a crash skips manifest-present segments and
already-registered texts. Job state itself is in-memory (phase8 `startWork` idiom), keyed
per `(courseCode, voiceId)`.

## Input contract (reconciled 2026-06-10)

The engine consumes `recording_provenance` rows written by the upload seam
(`recording-upload-helpers.cjs#buildProvenanceContext`): the live table has no dedicated
columns for course/phrase/voice context, so it rides as JSON in `quality_notes`, keyed by
`audio_uuid` (= the take's `mastered/{audio_uuid}.mp3`). `provenance-adapter.cjs` parses and
filters client-side; rows written before the server stamped `voice_id` fall back to
slot-role matching. The upload handler resolves `voice_id` SERVER-side from
`voice_config.voices[role].voiceId` (client value advisory).

## Team roster routes (all require a dashboard user who holds the course)

| Method | Path | Body | Does |
|---|---|---|---|
| GET | `/api/production/:courseCode/team` | — | members (email, name, role, voice_id, slot, recorded_count placeholder) + the two target slots |
| POST | `.../team/assign-slot` | `{ email, slot }` | mints `human_{localpart}_{target lang}` (collision-suffixed), writes `dashboard_users.voice_id` AND `courses.voice_config.voices[slot]` (surgical single-slot merge; displaced TTS voice stashed under `previousVoice` for restore). `slot: "unassigned"` (or null) vacates. |
| DELETE | `.../team/member` | `{ email }` | removes THIS course from their `courses[]` (never deletes the row); vacates their slot |
| POST | `.../team/invite` | `{ role?, label?, expires_days?, max_uses? }` | recorder (default) or editor invite code via `dashboard_invite_codes` — redeemable at the existing `POST /api/auth/invite-codes/redeem` |

## Files

```
services/voice-engine/
  chunking.cjs           planner-parity chunkers + chunksString parsing (pure)
  align.cjs              slow-gap alignment + boundary math + segment cutting
  segment-store.cjs      S3 segment keys (UUID), JSON manifest, splice ledger
  splicer.cjs            splice plan (pure) + crossfade assembly (ffmpeg→lame)
  storage.cjs            S3 / local-filesystem adapter (tests never touch S3)
  provenance-adapter.cjs input contract (quality_notes JSON ← upload seam)
  db.cjs                 paginated reads, human course_audio upsert, link pass
  synthesis-job.cjs      per-(course,voice) job orchestrator (progress/cancel/resume)
  coverage.cjs           honest per-slot coverage + seed-auto-cover gap
  router.cjs             synthesis express.Router (mergeParams; mount line above)
  team-router.cjs        roster express Router factory (dependency-injected)
  voice-slots.cjs        pure logic: voice-id minting, surgical voice_config merge/vacate
  voice-slots.test.cjs   roster unit tests
  __tests__/             engine unit tests + local ffmpeg round-trip smoke test
```

Run tests: `npx vitest run services/voice-engine` (no env, no network — local tone fixtures).

## Hard rules honoured / safety notes

- No DDL, no migrations; writes are `course_audio` upserts + S3 puts at runtime only.
- Vocabulary: known / target / seed.
- Voice is a hard partition of the splice space: one plan per `(voice_id, cadence)`;
  two larynxes are never spliced into one phrase. >2 spliced voices is out of scope
  (whole-utterance pod recordings are a later workstream, never spliced).
- `courses.voice_config` drives **live TTS serving**. All roster writes go through
  `assignVoiceToSlot` / `vacateSlot`, which deep-clone and touch ONLY the one slot key —
  every other key is preserved exactly. Covered by tests against a live-shaped fixture.
- Known limitation (documented): `dashboard_users.voice_id` is a single column — a recorder
  assigned in two courses with different target languages shows "Not yet assigned" in the
  older course's Record Room. Per-course `voice_config` stays canonical; synthesis unaffected.
