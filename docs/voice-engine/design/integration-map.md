# Voice-engine integration map — 5 branches into `feature/human-voice-engine`

*2026-06-10. Read-only audit of: `feature/human-voice-engine` (safety, 12 commits since 5f4113a8),
`ve/synthesis-engine`, `ve/recorder-shell`, `ve/leader-flow`, `ve/team-roster` (all off 5f4113a8).
Worktrees: wt-voice-engine, wt-ve-engine, wt-ve-recorder, wt-ve-leader, wt-ve-roster.*

---

## 1. File-collision table (files touched by 2+ branches)

**4 collision files total.** Everything else is disjoint (engine's `services/voice-engine/*.cjs`
core files, recorder's `useAuth.js`/`AppNavbar.vue`/`RecordRoom.vue`, leader's 11 views,
roster's `team-router.cjs`/`voice-slots.cjs`/`TeamRoster.vue`, safety's server files).

| File | Branches | Severity | Resolution |
|---|---|---|---|
| `src/router/index.js` | safety + recorder + leader + roster (4-way) | **HIGH** | Safety and recorder collide in TWO hunks. (a) `/autocue` route block (~L268–285): safety converts `/autocue` to `redirect: '/'` and deprecates RecordingStudio V2; recorder inserts the `/record/:courseCode?` route immediately after that block. Keep BOTH: safety's deprecations + recorder's new route. (b) `beforeEach` (~L538–560): safety adds `canAccessCourse` destructure + course-scope redirect to CourseBrowser; recorder adds `isRecorder, learner, canAccessCourse` + recorder-confinement block. Union the destructure; **recorder confinement block MUST run BEFORE safety's course-scope block** (a recorder must bounce to `/record/...`, never to CourseBrowser; the recorder block returns early so the generic scope check then only governs editors/admins). Leader (`journey` child, after `overview` ~L395) and roster (`team` child, after `recording-optimizer` ~L467) are additive children in different regions — auto-merge. |
| `src/components/production/autocue/AutocueStudio.vue` | safety + recorder | **HIGH** | Same hunk: the `continuousRecorder.onSegmentCaptured` queueUpload metadata block (~L276–295). Safety adds `mode: 'script'`, `seedNumber`, `chunksString` (and the server-mints-uuid comment); recorder changes `role: 'target1'` → `role: state.selectedRole \|\| 'target1'` and adds `voiceId: state.voiceId \|\| null`. **Union all five fields.** Recorder's other hunks (props `recordSlot`/`voiceId`, `setRecordingIdentity` on mount) don't overlap safety — keep verbatim. |
| `src/composables/useAutocueState.js` | safety + recorder | **MEDIUM** | Same hunk ~L589–607 in the script-item mapping: safety adds `seedNumber: item.seedNumber ?? null` + the "`id` is a LOCAL key" comment; recorder changes `role: 'target1'` → `role: state.selectedRole \|\| 'target1'` two lines below. Adjacent-line conflict; union (keep safety's comment + seedNumber AND recorder's role line). Recorder's other hunks (recordingSlot/voiceId state, `setRecordingIdentity`, queueUpload `voiceId` at ~L487–491, exports) are recorder-only — keep. |
| `services/voice-engine/README.md` | engine + roster | **MEDIUM (add/add)** | Both branches CREATE this file (engine: synthesis-engine doc + mount line; roster: team-router doc + mount line). Concatenate into one README with two sections ("Synthesis engine" / "Team roster router"); update the engine mount line per §2-M3 below. |

No other 2+ overlaps: `ProductionOverview.vue` is leader-only, `useAuth.js`/`AppNavbar.vue`
recorder-only, `production-api.cjs`/`supabase-client.cjs`/`recording-upload-helpers.cjs`/
`phase8-audio-v13.cjs`/`s3-production-service.cjs`/`api.js`/`authFetch.js`/`main.js` safety-only.

---

## 2. Contract mismatches

### M1 — CRITICAL: engine provenance adapter vs what the safety build actually writes

The safety build's `recording_provenance` writer does **not** use dedicated columns for the
aligner context. The live table has only the speaker/consent columns; course, phrase identity,
chunks_string, s3_key, role, cadence all ride as **JSON serialised into `quality_notes`**:

- Writer: `wt-voice-engine/services/recording-upload-helpers.cjs:64-102`
  (`buildProvenanceContext` → keys `course_code, mode, role, cadence, text, seed_number,
  lego_id, phrase_index, covers_legos, chunks_string, script_session_id, course_audio_id,
  replaced_s3_key, s3_key, quality_notes`) — JSON.stringify'd at
  `services/production-api.cjs:4257-4290` into the `qualityNotes` arg of
  `services/supabase-client.cjs:1601-1627` (`insertRecordingProvenance` — column list there is
  the full live schema: `audio_uuid, recorded_by, speaker_*, recorded_at, recording_*,
  speaker_consent, consent_form_ref, usage_rights, quality_notes, retake_count`).

- Engine reader: `wt-ve-engine/services/voice-engine/provenance-adapter.cjs`
  - `fetchProvenanceRows` (L53-57) filters `.eq('course_code', …)` and `.eq('voice_id', …)` —
    **neither column exists** → PostgREST errors → engine reports `provenanceError` + 0 takes
    forever (honest by design, but synthesis can never start).
  - `fromProvenanceRow` (L28-44) reads `row.course_code / row.s3_key / row.phrase_text /
    row.chunks_string / row.voice_id / row.role / row.cadence / row.method / row.duration_ms` —
    all absent. Note the **name drift**: the writer calls the phrase text `text`, not
    `phrase_text`; there is no `method` field (use `mode` ≠ method; treat absence as `'take'`);
    take identity is `audio_uuid` (the fresh S3 uuid, = `mastered/{audio_uuid}.mp3`).
  - `recordSplicedProvenance` (L100-123) inserts `course_code, voice_id, role, phrase_text,
    s3_key, method` columns — will fail every time (tolerated, manifest ledger covers it, but
    fix it: write via the `insertRecordingProvenance` shape with a `quality_notes` JSON carrying
    `method: 'spliced'`).

**Fix (one file + one seam):** rewrite `fetchProvenanceRows` to `select('*')` then
`JSON.parse(row.quality_notes)` per row, filter client-side on parsed `course_code` (and
role/voice as below); remap in `fromProvenanceRow`: `phraseText ← ctx.text`,
`s3Key ← ctx.s3_key`, `chunksString ← ctx.chunks_string`, `role ← ctx.role`,
`cadence ← ctx.cadence`, `id ← row.audio_uuid`, `method ← ctx.method ?? 'take'`. Guard
`JSON.parse` (old rows may have plain-text quality_notes).

### M2 — CRITICAL: voice_id is never stamped server-side (keystone decision 4 not yet honoured)

Keystone (`docs/voice-engine/design/multi-voice-model.md` §Decisions 4): *"the server resolves
slot → voiceId from voice_config, stamping both into recording_provenance"*. The shipped upload
handler does NOT: `buildProvenanceContext` (`recording-upload-helpers.cjs:84-102`) captures
`metadata.role` but has **no voiceId field**, and the handler (`production-api.cjs:4110-4290`)
never reads `voice_config`. The recorder shell's advisory `metadata.voiceId`
(`wt-ve-recorder/src/components/production/autocue/AutocueStudio.vue:289`,
`src/composables/useAutocueState.js:491`) is silently dropped.

Consequence: the engine partitions the splice space per `(voice_id, cadence)` — with no
voice identity on takes, `fetchProvenanceRows({voiceId})` can never attribute a take to a slot,
even after M1 is fixed.

**Fix (server, at integration):** in the upload handler, resolve
`voice_config.voices[metadata.role]?.voiceId` for the course, treat client `metadata.voiceId`
as advisory-only (log on disagreement), and add `voice_id` to `buildProvenanceContext` (+ its
unit test). Then M1's adapter filters on parsed `voice_id` with a role→voiceId fallback
(resolve via voice_config at read time for rows written before this fix).

### M3 — HIGH: coverage route path + unguarded engine router (one fix solves both)

- Consumer: `wt-ve-leader/src/views/production/LeaderJourney.vue:131` →
  `GET {api}/api/production/:courseCode/voice-engine/coverage`.
- Producer: `wt-ve-engine/services/voice-engine/router.cjs:103` defines
  `GET /:courseCode/coverage`, and its README (L15) mounts at `app.use('/api/voice-engine', …)`
  → actual path `/api/voice-engine/:courseCode/coverage`. **404 for LeaderJourney.**
- Worse: with the README's mount, `:courseCode` lives inside the sub-router, so the safety
  build's `app.param('courseCode')` gate (`production-api.cjs:359-379`) **does not fire**
  (param callbacks are local to the router that declares them) → `POST …/synthesize` (a heavy
  S3/DB-writing job) would be unauthenticated.

**Fix:** make the engine router `express.Router({ mergeParams: true })`, strip the leading
`/:courseCode` from its four routes, and mount at
`app.use('/api/production/:courseCode/voice-engine', createVoiceEngineRouter())`. The param is
then declared at app level → the course-scope gate applies, the central client Authorization
wiring (`src/services/authFetch.js` + `api.js` interceptor) already covers the URL, and
LeaderJourney's URL is correct as written. Update both README mount lines.

### M4 — LOW (degrades gracefully): coverage payload shape

`coverage.cjs:118-135` ships `slots` as an **array** of `{ role, needed, covered,
recordedTakes, spliced, missing, … }`. `LeaderJourney.vue:188-196` reads `c.slots[slotKey]`
(object access — undefined on an array; its array branch only checks `c.voices`, which doesn't
exist). Its accepted field names DO match (`covered`/`needed` are in its fallback lists).
**One-line fix in LeaderJourney:** `Array.isArray(c.slots) ? c.slots.find(x => x.role === slotKey)
: c.slots[slotKey]`. `synthSummary` (L222-229) finds no top-level `percent/covered/total` and
falls back to "Stitching engine connected" — acceptable, or add per-slot rollup.

### M5 — MEDIUM: engine link pass bypasses the G2 human-preference fix

Engine `db.cjs:127-135` calls the raw `link_all_audio_ids` RPC. The safety build's G2 fix lands
human preference in `phase8-audio-v13.cjs` `linkAudioIds` (human-first JS pass at ~L800-816
BEFORE the RPC, using `services/shared/audio-link-preference.cjs#pickPreferredAudioRow`) — the
RPC itself is unchanged and still links arbitrarily on duplicate texts. **Fix:** the engine's
link step should call phase8's `linkAudioIds(courseCode)` (or replicate the human-first pass)
instead of the bare RPC, so freshly spliced/recorded human rows win duplicate-text links.

### M6 — MEDIUM (documented limitation): one voice_id column vs per-course mints

Roster mints `human_{localpart}_{targetLang}` per course (`wt-ve-roster/services/voice-engine/
voice-slots.cjs:42-49,70`) and overwrites the single `dashboard_users.voice_id` column on each
new mint. RecordRoom resolves "my voice part" by `voice_config.voices[slot].voiceId ===
dashboard_users.voice_id` (`wt-ve-recorder/src/views/RecordRoom.vue:121,135-141`). A recorder
assigned in two courses with different target languages shows "Not yet assigned" in the older
course. Per-course `voice_config` stays canonical (engine + coverage resolve via voice_config,
`coverage.cjs:63-66` — consistent), so synthesis is unaffected; only RecordRoom's display/slot
match degrades. Acceptable v1; note it in the README. (Recorder build also flagged: the match
doesn't require `provider === 'human'`.)

### M7 — RISK (verify at integration, not a code edit): recorder auth tokens

The server gate (`production-api.cjs:359-379`) and the client wiring
(`authFetch.js` — attaches `supabase.auth.getSession()` token) assume a Supabase session.
Invite-code recorders may be OTP-only dashboard_users with no Supabase session → every
`/api/production/:courseCode/*` call from RecordRoom 401s (loopback dev excepted). Roster
flagged the same for OTP-only editors (audit-05 token-attachment ripple). **Verify a redeemed
recorder login yields a token `resolveDashboardUser` accepts before calling this shippable.**

### Confirmed NON-mismatches (no action)

- Upload S3 prefix: handler passes explicit `s3Key: mastered/{uuid}.mp3`
  (`production-api.cjs:4136-4138`; `s3-production-service.cjs:170-173` honours `options.s3Key`)
  — recorder-shell's `ssiborg-assets/` worry is already fixed; engine's `mastered/{UUID}.mp3`
  and `segments/{course}/{voice}/{UUID}.mp3` keys are consistent.
- Roster ⇄ recorder ⇄ engine voice threading is consistent (single-course case): roster writes
  voice_config slot + dashboard_users.voice_id; RecordRoom reads both; engine resolves
  slot→voiceId from voice_config only.
- Recorder's upload `metadata.role` matches the writer's `buildProvenanceContext` `role` capture.
- Engine `course_audio` upsert (`db.cjs:104-122`, 5-col conflict, `origin='human'`) matches the
  safety build's origin guard (TTS never overwrites human) and live CHECK.
- Roster team-router mount path `app.use('/api/production/:courseCode/team', …)` declares the
  param at app level → safety's gate fires; the router's own gate is redundant-but-harmless.

---

## 3. Mount/wiring checklist (dependency order)

1. **Engine router refactor + mount** (M3): `mergeParams: true`, strip internal `/:courseCode`,
   then in `production-api.cjs` (anywhere after the `app.param` gate at L359):
   `app.use('/api/production/:courseCode/voice-engine', require('./voice-engine/router.cjs').createVoiceEngineRouter())`
2. **Team router mount** (roster README line, after `requireDashboardUser` ~L294 region):
   `app.use('/api/production/:courseCode/team', require('./voice-engine/team-router.cjs')({ requireDashboardUser, userCanAccessCourse, getDb: () => supabaseClient.getClient(), logger, bumpCourseVersion }))`
3. **Provenance reconciliation** (M1 + M2): adapter rewrite + upload-handler voice_id stamp.
4. **Frontend routes** (all in the merged `src/router/index.js`): `/record/:courseCode?`
   (recorder), `production/:courseCode/journey` (leader), `production/:courseCode/team`
   (roster); beforeEach order: recorder confinement → safety course-scope.
   LeaderJourney's `/record` router-resolve fallback flips automatically once the route exists.
5. **Nav**: AppNavbar (recorder branch) — navbar hidden for recorders; "Record Room" replaces
   the production "Recording" tab. Optionally add a "Team" link/card (roster shipped route only).
6. **README merge**: one `services/voice-engine/README.md`, both mount lines updated to §1/§2.
7. **LeaderJourney slot read** (M4) + **engine link pass → phase8 linkAudioIds** (M5).
8. **Smoke**: `npx vitest run services/voice-engine` (45 engine + 23 roster tests),
   `npx vite build`, then M7 auth verification with a real invite-code recorder.

## 4. Recommended merge order into `feature/human-voice-engine`

Safety is the trunk (it may still receive commits — re-run `git diff --name-only` per step).

1. **`ve/synthesis-engine`** — zero file conflicts with safety (all-new `services/voice-engine/`).
   Immediately after: apply M1, M2, M3 on the integration branch (the engine's seams were built
   for exactly this edit). *Conflicts: none.*
2. **`ve/recorder-shell`** — the hairy one; do it while context is fresh.
   *Conflicts: `AutocueStudio.vue` (union the queueUpload metadata block: mode/seedNumber/
   chunksString + role-from-state/voiceId), `useAutocueState.js` (union seedNumber+comment with
   role-from-state at ~L589-607), `router/index.js` (keep safety's /autocue deprecations + add
   /record route; union beforeEach destructure, recorder block first).*
3. **`ve/team-roster`** — mount the team router (checklist 2).
   *Conflicts: `services/voice-engine/README.md` add/add with engine (concatenate);
   `router/index.js` additive child (trivial).*
4. **`ve/leader-flow`** — pure frontend, lowest risk, and benefits from /record + /team +
   coverage routes already existing. Apply M4 here.
   *Conflicts: `router/index.js` additive child (trivial); none elsewhere (its 11 view files are
   single-branch).*

Gate before declaring done: full checklist §3 step 8 + a dry-run `POST …/synthesize { dryRun:true }`
against a course with real takes once M1/M2 have landed.
