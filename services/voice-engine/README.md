# Voice Engine — Team Roster Router

Course-scoped team management for the human voice engine: roster, voice-slot
assignment (target1 / target2), member removal, recorder invite codes.
Design: `docs/voice-engine/design/multi-voice-model.md` (the keystone doc).

## Mounting (one line in production-api.cjs)

Insert **after** `requireDashboardUser` is defined (immediately after its
closing brace, around line 294), so the router reuses the exact same auth
helpers:

```js
app.use('/api/production/:courseCode/team', require('./voice-engine/team-router.cjs')({ requireDashboardUser, userCanAccessCourse, getDb: () => supabaseClient.getClient(), logger, bumpCourseVersion: require('./shared/course-version.cjs').bumpCourseVersion }))
```

(`bumpCourseVersion` is optional — pass it so learner apps re-fetch after a
voice_config change, mirroring what `voice-config-service.cjs` does.)

## Endpoints (all require a dashboard user who holds the course)

| Method | Path | Body | Does |
|---|---|---|---|
| GET | `/api/production/:courseCode/team` | — | members (email, name, role, voice_id, slot, recorded_count placeholder) + the two target slots |
| POST | `.../team/assign-slot` | `{ email, slot }` | mints `human_{localpart}_{target lang}` (collision-suffixed), writes `dashboard_users.voice_id` AND `courses.voice_config.voices[slot]` (surgical single-slot merge; displaced TTS voice stashed under `previousVoice` for restore). `slot: "unassigned"` (or null) vacates. |
| DELETE | `.../team/member` | `{ email }` | removes THIS course from their `courses[]` (never deletes the row); vacates their slot |
| POST | `.../team/invite` | `{ role?, label?, expires_days?, max_uses? }` | recorder (default) or editor invite code via `dashboard_invite_codes` — redeemable at the existing `POST /api/auth/invite-codes/redeem` |

## Files

- `team-router.cjs` — express Router factory (dependency-injected; **not mounted here**)
- `voice-slots.cjs` — pure logic: voice-id minting, surgical voice_config merge/vacate
- `voice-slots.test.cjs` — vitest unit tests (run: `npx vitest run services/voice-engine`)

## Safety notes

- `courses.voice_config` drives **live TTS serving**. All writes go through
  `assignVoiceToSlot` / `vacateSlot`, which deep-clone and touch ONLY the one
  slot key — every other key (providers, cadenceProfiles, known, presentation,
  per-slot settings) is preserved exactly. Covered by tests against a
  live-shaped fixture.
- Vocabulary: known / target / seed.
