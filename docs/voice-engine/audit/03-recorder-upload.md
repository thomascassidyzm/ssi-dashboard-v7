# Audit 03 — Recorder + Upload Path

**Scope:** the live human-recording path: `AutocueStudio.vue` (teleprompter/VAD/upload queue), `RecordingStudio.vue` ("V2"), and `POST /api/production/:courseCode/recording/upload` in `services/production-api.cjs`, plus the TTS generation path it collides with.

**Persona:** a community course leader (Richard, Macedonian for French speakers) with helper contributors — some editing content, some recording voices; the course needs ≥2 distinct human voices.

**Method:** static code trace on `feature/human-voice-engine` (synced to origin/main). No live DB/S3 checks were possible — the worktree contains only `.env.example`, no credentials. Live-schema caveats are marked where they matter.

---

## 0. Headline

The recording UI works (mic → VAD → trimmed/normalised MP3 in S3), but **nothing a helper records can ever reach a learner**. Human uploads:

1. go to an S3 prefix the playback and deploy paths never read for v13 rows (`ssiborg-assets/mastered/` inside the *stage* bucket — a prefix that mimics the prod bucket's name),
2. never touch `course_audio` at all — no row insert, no `s3_key` repoint, no `origin='human'`,
3. in the main "new course" flow are keyed by client-fabricated ids (`script-0`, `script-1`, …) that **collide across every course and every session** — a second voice overwrites the first voice's files,
4. trip a positional-vs-object argument bug in the flag update that either silently swallows the status transition or 500s the whole upload after the S3 write,
5. carry no usable voice/person attribution, so a ≥2-voice course cannot tell whose recording is whose.

RecordingStudio "V2" is worse: its upload sends the wrong body shape and **every upload 400s**. AutocueStudio is the only viable recorder.

---

## 1. Path map (what is wired to what)

### Routes (`src/router/index.js`)

| Route | Component | Notes |
|---|---|---|
| `/record` | redirect → `/autocue` (lines 265–268) | legacy |
| `/autocue` | `AutocueStudio.vue` (271–276) | standalone — **no `courseCode` param**, so `loadCourse()` never runs (`AutocueStudio.vue:376-379`); "new course" mode fetches `/api/production/null/recording-script` and fails |
| `/production/:courseCode/recording` | `AutocueStudio.vue` (427–432) | **the working entry point** — the Production Suite "Recording" tab |
| `/production/:courseCode/recording-studio` | `RecordingStudio.vue` V2 (450–455) | upload broken (see §4) |
| `/production/:courseCode/recording-optimizer` | `RecordingOptimizer.vue` | script planner, read-only |

A global router guard (`router/index.js:533-552`) requires an OTP session for every non-public route — **client-side only** (see §5).

### Server endpoints (`services/production-api.cjs`)

| Endpoint | Line | Auth |
|---|---|---|
| `GET /:courseCode/recording-script` | 6761 | **none** |
| `GET /:courseCode/recording/queue` | 4194 | **none** |
| `POST /:courseCode/recording/claim` / `release` | 4221 / 4275 | **none** |
| `POST /:courseCode/recording/upload` | 4025 | **none** |

None of the recorder endpoints call `requireAdmin`/`requireDashboardUser` (those helpers exist at lines 269/284 and gate ~40 *other* endpoints). `userCanAccessCourse` (line 260) is never applied here either.

### Upload handler flow (`production-api.cjs:4025-4143`)

1. body: `{ uuid, audioData(base64), metadata, provenance, mimeType }`; 400 if `uuid`/`audioData` missing (4036).
2. `audioProcessor.processRecordingBuffer` (4053) — **verified**: converts to MP3, trims silence (−40 dB), high-pass 80 Hz, `loudnorm I=-16:TP=-1.5:LRA=11`, limiter, 44.1 kHz mono 128 kbps (`audio-processor.cjs:546-642`). The "-16 LUFS trim/normalise" claim is real and good. On ffmpeg failure it silently uploads the **raw** buffer (`processed:false`).
3. `s3Service.uploadRecording(courseCode, uuid, buffer, …)` (4070) → S3 PUT (see §2).
4. `supabaseClient.updateSampleFlag(uuid, courseCode, 'needs_review', …)` — **positionally, against an object signature** (see §3).
5. `insertRecordingProvenance` only `if (provenance.recordedBy)` (4088) — camelCase; both frontends send `recorded_by` snake_case (`AutocueStudio.vue:288`, `useAutocueState.js:477`), so **provenance is never written** from the real recorders.
6. Socket emit `recording_completed`, respond 200.

---

## 2. Claim (a) — precious-audio danger

### Exact S3 key construction

**Human upload** — `services/s3-production-service.cjs:155-170`:

```js
const BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'        // line 5
Key: `ssiborg-assets/mastered/${uuid}.mp3`                        // line 158
```

i.e. `s3://ssi-audio-stage/ssiborg-assets/mastered/{uuid}.mp3`. The `uuid` is whatever the client sent:
- regeneration/queue mode: the `course_audio.id` from `sample_flags.audio_uuid` (`supabase-client.cjs:1501`, mapped to `phrase.id` at `useAutocueState.js:650`);
- **script ("new course") mode: `script-${idx}`** — fabricated client-side at `useAutocueState.js:582` because `GET /recording-script` returns items with no audio identity at all (`production-api.cjs:6797-6822`), then sent as `uuid: phrase.id` (`AutocueStudio.vue:277`).

**TTS generation** — `services/phases/phase8-audio-v13.cjs`:

```js
const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'      // line 102
const audioId = uuidv4().toUpperCase()                            // 1525 (generate) / 1940 (regen)
const s3Key = `mastered/${audioId}.mp3`                           // 1526 / 1941
```

i.e. `s3://ssi-audio-stage/mastered/{FRESH-UUID}.mp3` — a **new UUID every generation**; the old object is never PUT over.

### Exact DB writes

| Path | `course_audio` write |
|---|---|
| TTS generate (`phase8:1539-1557`) | `upsert({ …, origin:'tts', s3_key, duration_ms, word_boundaries }, { onConflict:'course_code,text_normalized,language,role,voice_id' })` — an existing row for the same text/role/voice gets its `s3_key` **re-pointed** to the fresh TTS file |
| TTS regenerate-role (`phase8:1952-1961`) | `update({ voice_id, origin:'tts', s3_key, … }).eq('id', item.id)` — row re-pointed by id |
| **Human upload (`production-api:4025-4143`)** | **NONE.** No insert, no update, no `origin='human'`, ever. Only `sample_flags` (broken, §3) and `recording_provenance` (never reached, §1.5) |

The only code in the repo that writes `origin:'human'` is the legacy bulk importer `api/import-course.js:204,225` (the Welsh human import) — not the recorder.

### Verdicts on the three sub-claims

- **"Human uploads share the SAME S3 key scheme as TTS"** — **REFUTED as stated.** The schemes differ: human = `ssiborg-assets/mastered/{uuid}.mp3`, TTS = `mastered/{freshUuid}.mp3`. A TTS regen therefore never physically overwrites a human S3 object. The human key matches only the *legacy* fallback path (`getAudioSignedUrl`'s `options.s3Key || 'ssiborg-assets/mastered/{uuid}.mp3'`, `s3-production-service.cjs:127`), used solely when a row has no `s3_key`.
- **"Never sets `origin='human'` in `course_audio`"** — **VERIFIED**, and stronger: the upload writes *nothing* to `course_audio`. The registry has no idea a human recording exists.
- **"A TTS regen can silently overwrite human recordings"** — **VERIFIED at the registry level.** Regen selection has **no origin guard**: `phase8:1764-1791` selects every `course_audio` row for the role (non-flagged mode regenerates the *entire role*), then stamps `origin:'tts'` + new `s3_key` over each row — including rows that *were* `origin='human'` (e.g. the imported Welsh audio). The human S3 object survives but nothing references it: to learners and the dashboard, the human voice is gone. The CLAUDE.md doctrine "`human` (precious)" is documentation only — zero enforcement in code.

### The actual catastrophe is upstream of regen

Three independent dead-ends, any one of which loses the work:

1. **Cross-course key collision (worst).** Script mode uploads to `ssiborg-assets/mastered/script-0.mp3`, `script-1.mp3`, … in one shared bucket. Richard's voice-1 records Macedonian Monday; voice-2 records Tuesday (or a *Welsh* leader records anything) — **every later session PUTs over the earlier session's objects at the same keys.** No course code, no session id, no voice id in the key. metadata on the PUT (`courseCode`, `recordedBy:'human'`) is S3 object metadata only — nothing queries it.
2. **Never served.** Playback signs URLs from `course_audio.s3_key` (`production-api.cjs:3900-3915`, `/audio/by-text` 3937+). Since the upload never sets `s3_key`, a row keeps pointing at the TTS file; rows don't exist at all for `script-N`. The legacy fallback only fires for rows with empty `s3_key`.
3. **Never deployed.** The stage→prod deploy (`s3-deploy-service.cjs`) copies `mastered/{uuid}.mp3` from `ssi-audio-stage` to the real prod bucket `ssiborg-assets` (lines 21-22, 36, 492-503). Human uploads sit under the look-alike *prefix* `ssiborg-assets/…` inside the stage bucket — outside the deploy path entirely. (The prefix appears to be a bucket-name/key conflation fossil.)

So "record ~150 → splice → 1500 phrases" currently ends in an orphaned, mutually-overwriting pile of MP3s that no learner, dashboard player, or deploy job will ever read.

---

## 3. Claim (b) — `updateSampleFlag` positional/object mismatch

**VERIFIED.** Call site `production-api.cjs:4079-4085`:

```js
await supabaseClient.updateSampleFlag(
  uuid,
  courseCode,                                   // ← positional arg 2
  'needs_review',                               // ← positional arg 3
  `Recorded by ${…} at ${…}`,
  metadata.recordedBy || provenance.recordedBy || 'human'
)
```

Signature `services/supabase-client.cjs:735`:

```js
async function updateSampleFlag(audioUuid, { courseCode, status, notes, flaggedBy }) {
```

Destructuring the string `courseCode` yields `courseCode/status/notes/flaggedBy = undefined` (no throw — string property access). What breaks, per branch:

- **Flag already exists** (the normal queue-mode case — queue items *come from* `sample_flags`): the `.update()` payload's `undefined` fields are dropped by JSON serialisation, so only `flagged_at` and a `history` entry containing just a timestamp are written (`supabase-client.cjs:757-774`). **Status silently never becomes `needs_review`**, `flagged_by`/notes are lost, the upload returns 200. The item stays `in_recording`/`flagged_human_needed` forever and never surfaces for QA review.
- **No flag exists** (every script-mode upload — `audio_uuid='script-N'` — and any unflagged uuid): the `.insert()` sends only `audio_uuid + flagged_at + history`; both schema definitions in the repo declare `course_code TEXT NOT NULL` and `status TEXT NOT NULL` (`new_vision/supabase-schema.sql:119+`, `docs/architecture/CRITICAL_ISSUE_4_RESOLUTION.md:271+`), so the insert throws → the handler's outer catch returns **500 — after the S3 PUT already succeeded**. The upload queue retries 3× (`useAudioUpload.ts:126-155`) — three more base64 round-trips and identical S3 PUTs — then marks the item **failed in the UI** while the bytes sit orphaned in S3. Provenance insert and the `recording_completed` socket event are also skipped. *(Live-schema caveat: could not query the real table — no creds in worktree; both in-repo definitions agree on NOT NULL.)*

Smoking gun: the positional shape exactly matches the **neighbouring function** `updateRecordingStatus(audioUuid, courseCode, status, notes, claimedBy)` (`supabase-client.cjs:1534`), which the claim/release endpoints use correctly (`production-api.cjs:4240, 4291`). The upload handler simply calls the wrong sibling.

---

## 4. Claim (c) — AutocueStudio vs RecordingStudio V2

| Feature | AutocueStudio | RecordingStudio V2 |
|---|---|---|
| Route | `/production/:courseCode/recording` (+ standalone `/autocue`, broken without courseCode) | `/production/:courseCode/recording-studio` |
| New-course bulk flow | ✅ optimizer script (`/recording-script`), natural+slow pass per phrase, LEGO-chunk pause rendering | ❌ queue only |
| Flagged-item re-record flow | ✅ "regeneration" mode from `/recording/queue` | ✅ same queue, with filters |
| Teleprompter | ✅ `TeleprompterDisplay` + `PhraseCard` | partial (`AutocueDisplay`, current+context) |
| VAD hands-free capture | ✅ `useContinuousRecorder` (RMS 0.02, 800 ms silence, 300 ms min speech), auto-advance | ✅ same composable ("Flow Mode") |
| Background upload queue | ✅ singleton queue, 3 retries, backoff, per-item status (`useAudioUpload.ts:114-228`) | ❌ blocking per-item upload |
| Review/approve before upload | ✅ (regeneration mode: `SessionReview`, confidence is *cosmetic* — derived from blob size + `Math.random()`, `useAutocueState.js:333-366`) | ❌ |
| Keyboard shortcuts | ✅ space/arrows/P | ❌ |
| **Upload actually works** | ✅ correct body `{uuid, audioData, mimeType, metadata, provenance}` (`useAudioUpload.ts:179-195`) | ❌ **always 400** — `store.uploadRecording` sends `{audio, mimeType, metadata}` (`stores/production.js:673-682`); server requires `uuid` + `audioData` (`production-api.cjs:4036`). Its follow-up flag update is unreachable. The other helper, `useAudioUpload.uploadAudio` (`useAudioUpload.ts:45-62`), is equally wrong-shaped legacy |
| Voice/person attribution | ❌ `provenance.recorded_by` snake_case → dropped; role hardcoded `target1` in script mode (`useAutocueState.js:127,593`) | ❌ `voiceId: human_${courseCode}` — course-level, not person-level; never lands anywhere anyway |

**Which should be THE recorder for a recording-only helper: AutocueStudio**, on `/production/:courseCode/recording`. It is the only one whose uploads reach the server successfully, and it has the full script/VAD/queue ergonomics a non-technical voice contributor needs. RecordingStudio V2 should be retired or rebuilt on the working upload shape — keeping both invites a helper to lose a session to the broken one.

---

## 5. What does a helper need to start? Could Richard just send a link?

**To open the recorder (via the SPA):**
1. An admin must create a `dashboard_users` row (email, role, `courses` = `'*'` or list, optional `voice_id`) and generate an OTP login code (`POST /api/auth/generate-code`, admin-gated, `production-api.cjs:314-328`). Codes live 30 days; sessions 7 days.
2. The helper logs in at `/login` with email+code — the router guard (`router/index.js:533-552`) is satisfied by *any* authenticated session; there is no role or course check on the recording routes client-side, and `useAuth` only computes `isAdmin` (`useAuth.js:23`) — the "recorder" role mentioned in the server comment (`production-api.cjs:283`) is aspirational.
3. Mic permission in the browser.
4. **Content prerequisites:** script mode needs the Course Builder to have produced LEGOs (`/recording-script` 404s "Run Course Builder first", `production-api.cjs:6777`); regeneration mode needs `sample_flags` rows in `flagged_human_needed`/`in_recording`/`needs_review` (`supabase-client.cjs:1461`) — i.e. someone with QA access must flag items first. An empty queue shows an empty recorder.

**So yes** — operationally, Richard can send `https://<tunnel>/production/mkd_for_fra/recording` plus a login code to a helper whose only job is reading phrases aloud, and they can record within minutes. The `dashboard_users.courses` scoping nominally limits which courses they *see*.

**But two big asterisks:**
- **Server-side, none of it is enforced.** Every `/recording/*` endpoint and `/recording-script` is unauthenticated; anyone holding the ngrok URL can pull the full course script and POST arbitrary audio into the bucket with `curl` — no login, no course scoping (`userCanAccessCourse` unused on these routes). Acceptable under "Popty is an admin tool" only while URLs stay private; a community-leader programme that hands links to strangers changes that calculus.
- **What they record goes nowhere** (§2) and the queue lies about success/failure (§3). The helper experience today: script mode shows every item "failed" after retries; queue mode shows success but the item never leaves the queue.

**≥2 voices requirement:** unsupported end-to-end. No recording carries who spoke it (provenance dropped, `voice_id` untouched, role pinned to `target1` in the bulk flow), so a target1/target2 two-voice cast can be neither captured nor routed. `dashboard_users.voice_id` exists and is even selected at login (`production-api.cjs:161`) but never flows into an upload.

---

## 6. Fix list (severity order)

1. **Make the upload write the registry.** Upsert/insert a `course_audio` row (or repoint the existing one) with `origin:'human'`, real `s3_key`, `duration_ms`, `voice_id` of the *person*; key S3 objects by a server-minted UUID — never a client string. Kills §2 dead-ends 1–2 and the `script-N` collision in one move.
2. **Origin guard in every regen/generate path:** `…neq('origin','human')` in the selections at `phase8:1764-1791` (and the upsert at 1539 must not stamp `origin:'tts'` over a human row) — make "human = precious" code, not doctrine.
3. **One-line bug:** call `updateRecordingStatus(uuid, courseCode, 'needs_review', …)` instead of `updateSampleFlag(…)` at `production-api.cjs:4079`.
4. **Authenticate + course-scope the `/recording/*` endpoints** with `requireDashboardUser` + `userCanAccessCourse`; derive `recordedBy`/`voice_id` from the session, not the request body — this is also what makes multi-voice attribution real.
5. **Fix or retire RecordingStudio V2** (body shape) and the legacy `useAudioUpload.uploadAudio`; align `provenance` casing (`recorded_by` → `recordedBy`) on whichever side you keep.
6. Align human uploads with the stage→prod deploy path (`mastered/` prefix) so deployed courses include human audio.
7. Vocabulary: the `/recording-script` payload exposes a field named `source` (`production-api.cjs:6806, 6819`) — banned SSi term; rename (it holds seed attribution).

---

*Audit complete — static analysis only; no DB/S3 reads (no creds in worktree), no files modified.*
