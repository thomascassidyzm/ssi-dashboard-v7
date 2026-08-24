# 00 — Audit Map: Popty Human Voice Engine

Synthesis of audits 01–06 (2026-06-10, worktree `wt-voice-engine`, `feature/human-voice-engine` = origin/main).
Persona: Richard leads Macedonian-for-French with helper contributors; the course needs ≥2 distinct human voices.
Where two reports disagreed, the code (and live DB, read-only) was re-checked; resolutions are recorded inline and in §6.

---

## 1. STATE OF THE WORLD

### 1.1 Flows (audit 01)

- 16 child routes under `/production/:courseCode`; the live nav (`AppNavbar.vue`, 5 hard-coded tabs: Overview · Text · Audio · Recording · QA) covers **5 of 16**. Four flows are URL-only orphans (`phrase-qa`, `feedback`, `calibration-review`, `qa-review`). Dead code: `views/Dashboard.vue` (unrouted), `views/production/MissionControl.vue` (imported `router/index.js:37`, never bound), `components/production/ProductionLayout.vue`+`ProductionNav.vue` (router mounts the *views/* ProductionLayout, which has no nav).
- Duplicated surfaces: two recorders (AutocueStudio vs RecordingStudio V2), two text-QA pages (PhraseQA vs QAReview). The single biggest "which door?" problem for a team of helpers.
- Hard-coded SSi-canon assumptions that break a 150-seed community course: SeedEditor "Approve Seeds" disabled until `complete >= 300` (`SeedEditor.vue:27`); Translate progress hard-labelled `x/668`; gendered-language list is a 6-entry hard-code (`TextGeneration.vue:824` — Macedonian is gendered but absent, so Gender Prep silently never appears); Welsh demo data; "Canonical English" unlabelled.
- Jargon walls everywhere (LEGO, M-LEGO, ZUT, tiling, GuaranteedCoverage, regen queue, pods/Layer 2); banned-word leaks: "Known (Source language)" in the role dropdown (`AudioPipeline.vue:235`), `phrase.source` field in RecordingOptimizer, `source` field in `/recording-script` payload (`production-api.cjs:6806,6819`).
- AudioPipeline (`/pipeline`) is entirely TTS-shaped: no human-voice path, no origin column; "Regenerate by Role" is the visible button that papers over human audio with TTS.
- A recording-only helper needs exactly two surfaces: `recording` (Autocue, voice+role pre-assigned) and a read-only `script` player. Everything else (status/pricing pills, Listening Config, pipeline cost controls, pods wipe-and-reflex) is leader/admin-only concern.
- Audit 01's minimal leader's journey (create → translate → steer via calibration-review → decompose → verify → hear early → plan → record voice 1 → record voice 2 → TTS-fill → QA → publish) is buildable from existing flows **except the synthesize rung**, which does not exist.

### 1.2 Recording plan (audit 02)

- The planner is real, wired, and schema-correct: `tools/recording-optimizer/generate-recording-script.cjs` — `greedySetCover` (:244), seed-auto-cover (:445-451), `chunkPhraseByLegos` max-munch + `mergeGlueIntoLegos` → pipe-delimited `chunksString` (the speaker's pause map and `align-audio.cjs --chunks` input). Served at `GET /api/production/:courseCode/recording-optimizer` and `/recording-script` (`production-api.cjs:6706-6871`).
- Live DB verified: `course_practice_phrases` has `known_text`/`target_text` (no `known`/`target`), `phrase_role ∈ {build, component, use}` (no `practice`). **The optimizer matches the live schema.** The conflicting `plan.js` is the Vercel handler `api/production/[courseCode]/audio-pipeline/plan.js` (NOT in `tools/`): its `.select('known, target')` hits PostgREST 42703 → **500s on every call for every course**.
- Planner caveats: seed-auto-cover counts mutated/reordered LEGOs as "covered" even when not contiguously present in the seed — alignment can never extract them, so coverage% overstates and silent audio gaps follow. No pagination (PostgREST max-rows trap on big courses). No `course_audio` awareness → no incremental/"already recorded" mode. Whitespace tokenisation (fine for mkd/fra, breaks zho/jpn/tha).
- The plan knows nothing about voices: zero references to `voice_config`, no voice field on any item. The fabricated stats and dead progress UI are in §1.3 ledger items.

### 1.3 Recorder + upload (audit 03)

- AutocueStudio (`/production/:courseCode/recording`) is **the only viable recorder**: teleprompter, VAD continuous capture (`useContinuousRecorder`: RMS 0.02, 800ms silence), background upload queue with retries (`useUploadQueue`), and the only client sending the correct upload body `{uuid, audioData, mimeType, metadata, provenance}` (`useAudioUpload.ts:179-195`).
- RecordingStudio V2's upload **always 400s** — `stores/production.js:673-682` sends `{audio, mimeType, metadata}`; the endpoint requires top-level `uuid`+`audioData` (`production-api.cjs:4036`). Legacy `useAudioUpload.uploadAudio` (:45-62) is equally wrong-shaped.
- Mastering is real and good: `audio-processor.cjs:546-642` — webm→MP3 via lame, silence trim (−40dB), high-pass 80Hz, `loudnorm I=-16:TP=-1.5`, limiter, 44.1kHz mono 128k. (On ffmpeg failure it silently uploads the raw buffer.)
- But the upload endpoint (`production-api.cjs:4025-4143`) is a broken seam, four ways:
  1. **Script mode ids are client-fabricated** `script-${idx}` (`useAutocueState.js:582`) → S3 key `ssiborg-assets/mastered/script-0.mp3` (`s3-production-service.cjs:158`) — **same keys for every course, session, and voice**; later sessions PUT over earlier ones.
  2. **No `course_audio` write at all** — no insert, no `s3_key` repoint, no `origin='human'`. The registry never learns a human recording exists.
  3. **`chunksString`/`recordingChunks` are not persisted** with the take (upload metadata = role/cadence/text/type/phraseIndex/coversLegos/scriptSessionId only, `AutocueStudio.vue:278-287`) — the aligner's required input is dropped on the floor.
  4. **Flag + provenance both dead**: `updateSampleFlag` called positionally (`production-api.cjs:4079-4085`) against object signature (`supabase-client.cjs:735`) — update-branch silently loses status; insert-branch (every `script-N` upload) throws on NOT NULL → **500 after the S3 PUT**, 3 retries, UI shows "failed", bytes orphaned. Provenance gated on `provenance.recordedBy` camelCase (:4088) while both clients send `recorded_by` snake_case → `recording_provenance` never written (live: **0 rows ever**). Live probe: zero `script-%` rows in `sample_flags` — consistent with the insert branch failing.
- Voice identity: Mode 1 hard-codes `role:'target1'` (`useAutocueState.js:127,593`; `AutocueStudio.vue:279`); no upload carries a `voiceId`; RecordingStudio stamps `voiceId: human_${courseCode}` (`RecordingStudio.vue:225,289`) — one pseudo-voice per course. **Two humans recording are indistinguishable in the data.**
- Helper onboarding: operationally Richard *can* send a tunnel link + OTP code and a helper records in minutes (`dashboard_users` row + `POST /api/auth/generate-code`, admin-gated; codes 30d, sessions 7d). But server-side none of the `/recording/*` endpoints are authenticated, and what they record goes nowhere.

### 1.4 Synthesis gap (audit 04)

- **Every stage exists somewhere; the stages are not connected.** `grep` over `src/`, `services/`, `api/`: zero references to `align-audio`, `segment-audio`, `splice-legos`. Only `generate-recording-script.cjs` is required by the app (`production-api.cjs:6711`).
- `align-audio.cjs` — the keeper: slow-gap mode (ffmpeg silencedetect −35dB/≥150ms → 1:1 chunk map, zero ML; chunk-count mismatch = natural QA gate) matches the autocue's slow pass exactly; `chunksString` is its designed input. aeneas (natural mode) NOT installed on this host. Fatal flaw for Macedonian: `safeFilename()` is Latin-only — **Cyrillic chunk text → all-underscore filenames, filename-as-key collapses**.
- `segment-audio.cjs` — superseded (Whisper transcribe-then-match; hard-coded Homebrew path; model at wipeable `/tmp`; weak for minority languages). Keep only as a later verify-what-was-said QA idea.
- `splice-legos.cjs` — sound crossfade core (per-LEGO −16 LUFS via shared `audio-processor.cjs#normalizeAudio` → 20ms acrossfade chain), wrong everything else: filename-keyed library (inherits the Latin-only flaw), per-WORD phrase lookup (ignores M-type chunking), no voice/cadence/course dimension, and encodes via ffmpeg's MP3 muxer which `phase8` documents as breaking iOS — production encodes pipe ffmpeg→lame (`audio-processor.cjs#ffmpegFilterToLameMp3`).
- The "LEGO Audio Synthesis" panel is theatre: `GET /:courseCode/frankenstein-demo` (`production-api.cjs:6875-6907`) serves three **pre-baked** S3 clips (`demo-splices/demo{1,2,3}.mp3`, no generating script in repo), Welsh literals, lookup language pinned `'cym'` regardless of course; the front-end build visualization is a static Welsh word map (`RecordingOptimizer.vue:460-518`).
- **The orchestration skeleton already ships**: phase8 `POST /splice-components/:courseCode` (:4403) is a full in-app splice job — plan → dry-run → S3 download → `findComponentBoundaries()` → `spliceAudio()` (iOS-safe) → upload → upsert `course_audio` → link FK, with `startWork()` job state and cancellation. It only works on **TTS** parents (`word_boundaries NOT NULL`, Azure-only) and only *extracts components*, never assembles phrases — but it is the architectural template.
- Design docs exist but **none of their tables are migrated**: `apml/core/human-recording-v1.apml` ("CANONICAL": `recording_sessions`, `phrase_recordings`, `course_lego_library`, `origin='splice'`, Welsh worked example 254 recordings → 11,818 phrases) and `docs/AUDIO_SPLICING_SPEC.md`. `course_audio.origin` CHECK allows only `('tts','human')` — `'splice'` would be rejected today.

### 1.5 Auth + scoping (audit 05)

- **Course-scoping is client-side cosmetics only.** `userCanAccessCourse` (`production-api.cjs:260`) has **zero call sites** (re-verified by grep). The router guard (`router/index.js:533-552`) checks only `isAuthenticated` — never `to.params.courseCode`. Any logged-in user URL-hops into any course; for most `:courseCode` routes **any anonymous caller** can read and mutate (phrase/seed deletion, status/pricing PATCH, recording upload, audio-pipeline start — all "none"; full table in audit 05 §2).
- Smallest coherent fix (audit 05 §4): one `app.param('courseCode', …)` middleware (requireDashboardUser + userCanAccessCourse, insert after `production-api.cjs:294`) + one client `beforeEach` clause using the already-exported `canAccessCourse`. One behavioural ripple: production-data composables must start attaching the Bearer token.
- Roles: schema CHECK is `('recorder','editor','admin')` (`20260304_dashboard_auth.sql:8`, also invite-codes migration); **'recorder' was retired from the UI 2026-04-21 but is still accepted for backcompat** (`production-api.cjs:435-438, 547-557`) — both audit statements true; resurrecting a record-only tier is a UI/policy change, not a migration.
- Team growth: a leader (editor) CAN grow a team via `POST /api/auth/invite-codes/generate` (the one `requireDashboardUser` route; non-admins limited to non-admin roles and courses they hold — this part is sound) but CANNOT see/edit/remove it (`/api/auth/users` admin-only). No owner/leader concept; every editor on a course is equal; every helper who can record can also edit/delete content.
- `voice_id` minting: `human_{emailLocalPart}_{firstCourseTargetLang}` (`production-api.cjs:468`) — local-part collisions, wrong language for multi-course helpers; live: **all 7 `dashboard_users` rows have `voice_id` NULL**, and nothing ever copies it into an upload or `course_audio`. `dashboard_users.courses` defaults to `'"*"'` — **fail-open**.

### 1.6 Data model (audit 06 + live re-probes)

- `course_audio` live columns: `id, course_code, text, text_normalized, language, role, voice_id, origin, s3_key, duration_ms, file_size_bytes, created_at, lego_id, text_stripped, word_boundaries, sequence`. No cadence, no recorded_by. Roles: `known|target1|target2|presentation|encouragement|instruction|welcome|bookend_listen_intro|bookend_listen_outro|pod_explainer`.
- **Uniqueness fork RESOLVED (live probe 2026-06-10):** zho_for_eng target1 has the same `text_normalized`+role under multiple voice_ids (e.g. 太好了 → 3 voice_ids) — the live unique index is the **5-column** one Phase 8 upserts against (`course_code,text_normalized,language,role,voice_id`). APML's 4-column doc is stale. **Per-voice rows are representable today; no migration needed for the 2-voice core.** Still missing: a take/version axis per voice.
- Serving contract is cycle-locked FKs: `known/target1/target2_audio_id` on `course_legos`/`course_practice_phrases` (+`presentation_audio_id`); learner app plays exactly the FK'd clip; `origin` is never consulted at serving time. `linkAudioIds` RPC fills FKs by `(course_code,text_normalized,role)` with bare `LIMIT 1` — **no origin preference**: human vs TTS linking is arbitrary.
- S3: bucket `ssi-audio-stage`; live convention `mastered/{UUID}.mp3` (100% of sampled rows). Human uploads go to `ssiborg-assets/mastered/{uuid}.mp3` — a v12-fossil **prefix inside the stage bucket**, outside both the serving path (rows keep old `s3_key`) and the stage→prod deploy (`s3-deploy-service.cjs:21-22,492-503` copies `mastered/` only).
- Voices: single source of truth = `courses.voice_config` JSONB (flat `known_voice` columns are dead v12 remnants). Roles are positional slots: exactly two target voices is mandatory (manifest compiler refuses without known+target1+target2, `phase9-manifest-compiler.cjs:226`) and **more than two is impossible without schema change** (role values + 3 FK columns + fixed voice_config keys). Voice-config UI has **no human-provider concept** (azure/elevenlabs/xai only).
- Live data: **cym_n_for_eng's 19,080 genuinely-human Welsh recordings are labelled `origin='tts'`** (`voice_id='legacy_import'`) — the canonical precious audio sits on the wrong side of any future origin guard. Only 641 relinked presentation intros + shared bits carry `origin='human'`. `recording_provenance`: 0 rows ever.

---

## 2. CLAIM LEDGER (brief: `docs/fable5-brief.md`)

| # | Claim | Verdict |
|---|---|---|
| 1 | Remote works by design — ngrok into host, osascript spawns Claude CLI there; no API mode needed | **VERIFIED** — `spawn-agent-terminal.cjs` / `agent-spawner.cjs#spawnInTerminal` working infra; audits treat host-compute as the design |
| 2 | Popty = admin tool; security = acceptable risk; the one item is cross-course access | **VERIFIED** — `userCanAccessCourse` (production-api.cjs:260) zero call sites; router guard never checks courseCode; NUANCE: most `:courseCode` routes have no auth at all (parked per brief, one-liner in audit 05) |
| 3 | Roles deliberately flat (editor+admin) | **NUANCED** — schema CHECK still includes `recorder` (20260304:8); retired from UI 2026-04-21, accepted for backcompat (production-api.cjs:547-557); a record-only tier is one UI decision away |
| 4 | Minimal-recording planner REAL and wired (greedySetCover ~:244, seed-auto-cover ~:445, chunksString) | **VERIFIED** — all line refs confirmed; endpoints + RecordingOptimizer.vue wired; NUANCE: seed-auto-cover overstates extractable coverage; no pagination; no voice concept |
| 5 | Live recorder built: AutocueStudio → upload (trim/normalise −16 LUFS, S3, provenance) | **NUANCED** — recorder + mastering VERIFIED (audio-processor.cjs:546-642); **provenance REFUTED in practice** — camelCase gate (:4088) vs snake_case clients → never written; `recording_provenance` live = 0 rows |
| 6 | Auth/scoping primitives exist: dashboard_users role+courses[], voice_id auto-gen, invite backend, canAccessCourse | **VERIFIED they exist / NUANCED they work** — voice_id format is `human_{emailLocal}_{firstCourseTargetLang}` (collision+wrong-lang risks); all 7 live rows NULL; canAccessCourse never enforced anywhere |
| 7 | Nothing assembles the other ~1350; align/segment/splice CLI-only, referenced by nothing | **VERIFIED** — zero imports/refs; only the script generator is required (production-api.cjs:6711) |
| 8 | On-screen "LEGO Audio Synthesis" = hard-coded Welsh frankenstein-demo, pre-baked S3 clips | **VERIFIED** — production-api.cjs:6879-6907 (Welsh literals, lang pinned 'cym', `demo-splices/demo{1,2,3}.mp3`); RecordingOptimizer.vue:460-518 static Welsh map |
| 9 | "Record 150 → 1500" scoped and designed but not executable end-to-end | **VERIFIED** — and worse: today's uploads are colliding, unregistered, undeployable orphans |
| 10 | Human recordings share the SAME S3 key as TTS | **REFUTED as stated** — human = `ssiborg-assets/mastered/{uuid}.mp3` (s3-production-service.cjs:158), TTS = `mastered/{freshUuid}.mp3` (phase8:1526); no physical overwrite. The danger is real but registry-level (see #12) |
| 11 | Origin never set 'human' | **VERIFIED and stronger** — the upload writes NO `course_audio` row at all (production-api.cjs:4025-4143 table in audit 06 §1.4) |
| 12 | A later TTS regen can silently overwrite irreplaceable human audio | **VERIFIED at registry level** — regen selection has no origin guard (phase8:1764-1791); stamps `origin:'tts'` + new s3_key over rows by id; human S3 object survives but nothing references it. Plus 19,080 cym_n human rows already mislabelled `origin='tts'` |
| 13 | Cross-course scoping = enforce per-course server-side + route guard | **VERIFIED needed** — two-insertion fix specified (audit 05 §4: `app.param` + `beforeEach`) |
| 14 | `updateSampleFlag` called positionally (~:4079) vs object signature (~:735) → post-record flag silently broken | **VERIFIED** — exact lines confirmed; NUANCE: call sites :2434/:2964 use the correct object form — bug is unique to the upload handler (shape matches sibling `updateRecordingStatus`); insert-branch 500s after the S3 PUT; live zero `script-N` flag rows |
| 15 | `totalPhrases = totalLegos × 10` fabricated | **VERIFIED** — production-api.cjs:6746, literal comment "Approx phrases generatable" |
| 16 | `recordedCount`/`splicedCount` TODO stubs; Export-PDF disabled | **VERIFIED** — RecordingOptimizer.vue:434-438 (`ref(0) // TODO`), :236-243 (`disabled`, "Not implemented yet"), handler is an alert (:623); `flaggedPhrases` likewise never fetched (:450) |
| 17 | Schema drift: optimizer vs `plan.js` on known_text/target_text vs known/target, practice→build | **VERIFIED with corrections** — `plan.js` is `api/production/[courseCode]/audio-pipeline/plan.js` (Vercel), not tools/; live DB sides with the optimizer; plan.js **500s on every call** (42703); `practice` survives only as display/provenance strings |
| 18 | Two recorders exist — pick one | **VERIFIED** — AutocueStudio is the only one whose uploads reach the server (RecordingStudio V2 always 400s, stores/production.js:673-682); retire V2 |
| 19 | A course needs ≥2 distinct voices (persona requirement) | **VERIFIED unsupported as built** — Mode 1 hard-codes target1 (useAutocueState.js:127,593; AutocueStudio.vue:279); no upload carries voiceId; RecordingStudio collapses to `human_${courseCode}` (:225,289); schema itself caps linked voices at exactly 2 target slots |

---

## 3. DANGER LIST (ranked — precious audio + live Camberley deploy)

1. **TTS regen clobbers human audio at the registry.** `phase8:1764-1791` regenerate-role selects ALL rows for a role with no origin guard, re-points `s3_key` and stamps `origin:'tts'` — and the "Audio" tab's Regenerate-by-Role is the most visible button a leader sees. Compounded by: `linkAudioIds` bare `LIMIT 1` (no human preference), and **19,080 cym_n human Welsh rows already labelled `origin='tts'`/`legacy_import`** — they sit on the wrong side of any future guard until backfilled. "human = precious" is doctrine, not code.
2. **Cross-course/cross-session S3 key collisions destroy recordings silently.** Script-mode uploads write `ssiborg-assets/mastered/script-0.mp3` … — same keys for every course, every session, every voice. Richard's voice-2 session physically overwrites voice-1's takes; any other course's leader overwrites both. The only copies of irreplaceable human audio, mutually PUT over.
3. **Uploads are unregistered and half of them 500 after the S3 PUT.** No `course_audio` write ever; script-mode flag insert violates NOT NULL → 500 → 3 retried identical PUTs → UI "failed" while bytes orphan; queue-mode silently loses the status transition so takes never surface for QA. A helper can record for a week and the system holds an unfindable, partially-overwritten pile.
4. **Human uploads sit outside the stage→prod deploy path.** `s3-deploy-service.cjs` copies `mastered/` only; the `ssiborg-assets/…` prefix inside the stage bucket never deploys. Even once registered, today's keys would never reach learners.
5. **Live-deploy breakables (Camberley, `main` = LIVE):** the ScriptViewer inline edit → `regenerate-phrase` → preview loop and the Autocue recorder are shipped and working — any upload-endpoint or autocue-state refactor must not regress them. `production-api.cjs` is one shared process (the optimizer endpoint even hijacks global `console.log` — concurrency hazard).
6. **One-click course-state mutations with no confirm:** Overview status/pricing pills PATCH live status (helper clicks "Live" by accident); pods "wipe all sentences + audio and re-flex" is one click deep; "Reset" on Translate wipes all translations behind a single `window.confirm`. All unauthenticated server-side.
7. **Fail-open access defaults:** `dashboard_users.courses` defaults `'"*"'` (any row created without explicit courses grants everything); all `/recording/*` + most `:courseCode` endpoints anonymous — acceptable-risk *only while URLs stay private*; a community programme handing links to strangers changes the calculus.

---

## 4. BUILD SURFACE

### Reusable inventory (exists, works)

| Piece | Where | State |
|---|---|---|
| Minimal-set planner + chunked script (`chunksString` = aligner input format) | `tools/recording-optimizer/generate-recording-script.cjs` + production-api :6706-6871 | wired, schema-correct |
| Recorder: teleprompter, VAD, retry upload queue (only correct upload body shape) | `autocue/AutocueStudio.vue`, `useAutocueState.js`, `useContinuousRecorder.ts`, `useUploadQueue`/`useAudioUpload.ts:179-195` | wired (to the broken seam) |
| Mastering: webm→lame MP3, trim, highpass, loudnorm −16, limiter | `audio-processor.cjs#processRecordingBuffer` (:546-642), `#ffmpegFilterToLameMp3` (iOS-safe encode) | used by upload endpoint |
| Chunk aligner, slow-gap zero-ML, chunk-count mismatch = QA gate | `tools/recording-optimizer/align-audio.cjs` (exports cleanly) | unwired; ffmpeg present, aeneas absent; **must go DB-keyed (Latin-only `safeFilename` breaks Cyrillic)** |
| Crossfade splice core (per-LEGO −16 LUFS → 20ms acrossfade) | `tools/recording-optimizer/splice-legos.cjs` | unwired; replace filename/word keying + MP3 muxer |
| **Orchestration template: full in-app splice job** (plan → dry-run → download → boundaries → splice → upload → upsert → link, job state + cancel) | phase8 `POST /splice-components/:courseCode` (:4403), `startWork()` | working (TTS-parents-only today) |
| Registration + FK linking | phase8 `POST /insert` (:2131, accepts `origin:'human'` today, conflict key = the live 5-col index) + `linkAudioIdsBatch`/`POST /link-audio-ids` (:3044) | working, generic |
| Job/agent infra (host-machine compute = the design) | `build_jobs` table, `spawn-agent-terminal.cjs`, `agent-spawner.cjs#spawnInTerminal` | working |
| Auth primitives | `requireDashboardUser`/`requireAdmin` (:269/:284), `userCanAccessCourse` (:260, uncalled), invite-codes generate/redeem (leader-safe), `useAuth.canAccessCourse` | exist, unenforced |
| Data model headroom | `course_audio` 5-col unique index (**live-verified**: per-voice rows representable now); `voice_config` JSONB; `recording_provenance` table + insert helper; `sample_flags` queue states | ready, unused |
| Canonical specs to implement | `apml/core/human-recording-v1.apml` (`recording_sessions`, `phrase_recordings`, `course_lego_library`, `origin='splice'`); `docs/AUDIO_SPLICING_SPEC.md` | specs only — zero migrations exist; origin CHECK rejects `'splice'` today |

### Gaps, in dependency order (per audit 04 §6.3, cross-confirmed)

1. **Migrations**: `recording_sessions`, `phrase_recordings` (carrying `chunks_string`, `voice_slot`, `recorded_by`), `course_lego_library` keyed `(course_code, lego_id, voice_id, cadence)` (**add voice_id — the APML spec omits it**), widen origin CHECK to `('tts','human','splice')`. Plus the backfill: relabel cym_n `legacy_import` → `origin='human'`.
2. **Upload seam fix** (smallest PR, unblocks everything): server-minted UUIDs, S3 key `recordings/{courseCode}/{sessionId}/…` (deployable prefix decision included), `course_audio` row w/ `origin='human'`+real s3_key+voice_id, persist `chunks_string`, fix `updateSampleFlag` call (use sibling `updateRecordingStatus`), fix provenance casing, retire RecordingStudio V2 + legacy uploadAudio. **Origin guard in the same pass**: `neq('origin','human')` in phase8 :1764-1791 selections + upsert; `linkAudioIds` `ORDER BY (origin='human') DESC`.
3. **Session/voice binding**: session-start picker (helper → `voice_id` → role slot), threaded into uploads; `voice_config` accepts `provider:'human'` so phase8 refuses to TTS that role.
4. **Align service**: wrap `align-audio.cjs#alignAudio` slow-gap against stored `chunks_string`; persist chunk timestamps (natural home: `word_boundaries` — makes human rows compatible with `findComponentBoundaries`); mismatch → re-record flag, never guess.
5. **Splice service + `/synthesize/:courseCode {voiceId}` job**: DB-keyed clip lookup, tile by LEGO chunks (reuse `chunkPhraseByLegos`), encode via `ffmpegFilterToLameMp3`, gap report feeding back into the recording script; phase8-style job with dry-run plan (matches plan→approve convention).
6. **Registration/link pass**: reuse `/insert` + `linkAudioIdsBatch`; whole-phrase human takes win over splices for the same text — progressive quality falls out free.
7. **De-fake `RecordingOptimizer.vue`** (real recorded/aligned/spliced/pending counts; live one-phrase demo for the current course) + scoping fix (audit 05 §4 two insertions) + leader/helper shells.
8. **Pods/listening**: human voice-pool entry the pod generator can consume; pod lines = whole-utterance per-speaker recordings, **never spliced** (prosody).

---

## 5. FORKS FOR TOM (sharpened by the code)

### Fork 1 — Team & roles
The code today: flat editor+admin; `recorder` still in the schema CHECK and accepted server-side (UI-retired 2026-04-21); leaders can *grow* a team via invite-codes (server correctly limits to their own courses, non-admin roles) but can't *see/edit/remove* it (roster admin-only); every recorder-helper can also delete seeds.
- **(a) Stay flat, scope by course only** — cheapest: scoping fix + a per-course roster view over existing invite-codes. But helpers keep full edit/delete power; one mis-click on status pills is live.
- **(b) Resurrect `recorder` as the record-only tier** — cheap: no migration (CHECK already allows it), backcompat already accepted; needs route/endpoint gating by role + the minimal recorder shell (Autocue + read-only script player — audit 01's exact list). Best fit for "send a helper a link".
- **(c) Real leader/owner concept** — expensive: no owner edge exists anywhere; new schema + management surface. Only worth it if community courses get self-serve team admin beyond one leader.
Code verdict: (b) + a leader roster panel is the 80/20.

### Fork 2 — Multi-voice economics (≥2 voices, more for listening)
The code today: voice = hard partition of the splice space (both specs agree: never mix speakers in one spliced phrase) → **each voice records the full ~150-phrase script** (~30-40 min/voice per the optimizer's estimate); the 5-col unique index already stores per-voice rows; exactly 2 target voices are linkable (3 fixed FK columns; manifest compiler requires both); voice-config has no human provider.
- **(a) Two voices, full script each, one helper owns one role slot** — cheap: zero schema change; needs only session→voice binding + per-(voice,cadence) coverage accounting. The burden story is honest: 2 × ~35 min.
- **(b) N>2 voices for core phrases** — expensive: role values, FK columns, and voice_config keys all hard-code 2; schema + learner-app change. The code says don't.
- **(c) N>2 for listening only** — moderate: pods are whole-utterance recordings by named speakers (no FK cap applies); needs only a human voice-pool entry format for `pod-dialogue-generator.cjs` + a per-speaker pod recording script through the same session recorder.
Code verdict: (a)+(c); reduce felt burden by splitting the script into resumable sessions per voice (greedy order is currently also session order — front-loaded dense sentences; a re-orderable/splittable script is cheap at the planner layer).

### Fork 3 — The leader's journey shell
The code today: 5-of-16 nav, four orphaned-but-needed flows (calibration-review exactly when a newcomer needs steering), two duplicate doors twice over, jargon throughout, and hard-coded canon (300-seed approve gate, /668 labels, 6-language gender list) that **blocks small courses regardless of which shell wins**.
- **(a) Re-skin the admin console** (nav + gating + jargon pass over existing routes) — cheap-ish but leaders still see TTS cost controls, global Listening Config, status pills; the canon hard-codes must still be fixed.
- **(b) New scoped leader shell** (guided sequence: translate → steer → decompose → verify → hear → plan → record×voices → **synthesize** → TTS-fill → QA → publish) wrapping existing endpoints, + the minimal recorder shell from Fork 1 — moderate cost; the endpoints all exist (audit 01's 13-step journey is buildable today except the synthesize rung, which is the build anyway); route-guard work is already required by the scoping fix.
- **(c) Defer the shell, build only the engine + recorder view** — cheapest now; but the leader lands in the jargon console at exactly the moment SSi wants community courses to feel self-serve.
Code verdict: (b)-lite — the synthesize rung plus a thin guided overview can reuse every existing surface; the unavoidable prerequisites either way are the canon hard-codes (300/668/gender list) and the scoping fix.

---

## 6. CONTRADICTIONS CROSS-CHECKED (resolutions)

1. **course_audio unique index 4-col (APML) vs 5-col (phase8 upsert)** — audit 06 flagged as "most dangerous fork". **Resolved live**: same text+role exists under multiple voice_ids in zho_for_eng → the live index includes `voice_id` (5-col). Per-voice human rows are safe to write today; APML doc is stale.
2. **Audit 03 "no creds, couldn't verify sample_flags NOT NULL" vs audits 02/06 (live access via main-repo `.env`)** — resolved live: no NULL `course_code`/`status` rows exist; zero `script-%` rows in `sample_flags`, consistent with audit 03's predicted insert-branch failure for script-mode uploads.
3. **Roles "recorder/editor/admin" (audit 05 §1.1) vs "flat editor+admin" (brief, audit 05 §5)** — both true: CHECK constraint keeps `recorder` (20260304:8); retired from UI 2026-04-21, backcompat-accepted (production-api.cjs:435-438,547-557).
4. **Brief's "same S3 key as TTS"** — corrected by audits 03/06 in agreement: different prefixes (`ssiborg-assets/mastered/` vs `mastered/`); the overwrite is registry-level (re-pointed rows + `origin` stamp), not a physical PUT-over — and the *practical* overwrite is human-on-human via `script-N` key collisions.
5. **Brief's `plan.js` location ("the optimizer and plan.js disagree")** — the conflicting file is `api/production/[courseCode]/audio-pipeline/plan.js` (Vercel serverless), not anything in `tools/`; live schema sides with the optimizer; plan.js 500s on every call.
6. **Line-ref drift between audits 01/02/03** (role hard-code, upload metadata) — re-verified: `useAutocueState.js:127` and `:593` both pin `target1`; `AutocueStudio.vue:279` role in upload metadata; `RecordingStudio.vue:225,289` `human_${courseCode}`. All audits correct within ±1 line.
7. **`updateSampleFlag` bug scope** — re-verified: only the upload handler (:4079) calls it positionally; :2434 and :2964 use the correct object form. The fix is the one call site (or swap to sibling `updateRecordingStatus`).
