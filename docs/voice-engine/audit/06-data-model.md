# Audit 06 — Audio Data Model + Voices

Scope: the data layer the human-voice synthesis engine must write into. Sources: `database/migrations/*`, `apml/core/audio-registry-v13.apml` (canonical spec), `services/supabase-client.cjs`, `services/production-api.cjs`, `services/phases/phase8-audio-v13.cjs`, `api/voices/list.js` + `preview.js`, `api/import-course.js`, S3 services, plus **live read-only queries** against the production Supabase (creds from the main repo `.env`).

Persona lens: Richard leads Macedonian-for-French (`mkd_for_fra`), with helpers who edit content and >=2 helpers who record voices.

---

## 1. `course_audio` schema

### 1.1 Live columns (verified by `select('*').limit(1)` against production)

```
id, course_code, text, text_normalized, language, role, voice_id, origin,
s3_key, duration_ms, file_size_bytes, created_at, lego_id, text_stripped,
word_boundaries, sequence
```

| Column | Meaning (from `apml/core/audio-registry-v13.apml` + code) |
|---|---|
| `id` | UUID PK (`gen_random_uuid()`); also doubles as the S3 filename stem for v13 audio |
| `course_code` | FK → `courses(course_code)`, ON DELETE CASCADE. A clip belongs to exactly one course — there is **no cross-course sharing** for content audio |
| `text` | spoken text, original case |
| `text_normalized` | lower/trim, populated by trigger; the matching key for relinking (`20260312_normalize_text_normalized.sql`) |
| `text_stripped` | punctuation-stripped variant (lookup fallback, see `/audio/by-text` in production-api) |
| `language` | ISO 639-3 — known language for `known`/`presentation`/`instruction`, target language for `target1`/`target2` |
| `role` | see check constraint below — this is **how a clip is bound to a voice slot**, not a free label |
| `voice_id` | free-text voice identifier (formats in §3.2) |
| `origin` | `'tts'` or `'human'` (check constraint per APML). Semantics: tts = regenerable, human = "precious, not regenerable" — but **nothing in code enforces the human side** (§5) |
| `s3_key` | the actual S3 object key, used as-is ("s3_key IS THE TRUTH" — APML) |
| `duration_ms` | extracted at mastering; propagated to dependents by trigger (`20260512_course_audio_duration_sync_triggers.sql`) |
| `lego_id` | only for `presentation` rows — which LEGO the intro introduces (e.g. `S0001L01`) |
| `word_boundaries` | JSONB word-timing from TTS (renamed from viseme_data, `20260313`); xAI = null |
| `sequence` | ordering column (used by pod explainers / multi-part audio) |

No `cadence` column exists live (the legacy `api/import-course.js` writes one and would fail today). No `created_by` / `recorded_by` column — speaker identity lives only in `voice_id`.

### 1.2 Role check constraint (live, via `20260519_course_audio_pod_explainer_role.sql`, latest)

```
known | target1 | target2 | presentation | encouragement | instruction
| welcome | bookend_listen_intro | bookend_listen_outro | pod_explainer
```

### 1.3 Uniqueness — IMPORTANT DISCREPANCY

- APML canon: `UNIQUE (course_code, text_normalized, language, role)` — one clip per course+text+language+role.
- Phase 8's working upsert uses `onConflict: 'course_code,text_normalized,language,role,voice_id'` (phase8-audio-v13.cjs ~line 1545). A PostgREST upsert errors unless its `on_conflict` matches a real unique index, and Phase 8 runs daily in production — so the **live unique index almost certainly includes `voice_id`** (5 columns), i.e. the same text+role CAN exist once per voice. The APML doc is stale on this point.
- Consequence for the human engine: per-voice rows for the same text+role are already representable. What is NOT representable is two clips by the *same* voice for the same text+role (no take/version axis).

### 1.4 Who writes `course_audio`

| Writer | Path | origin | voice_id written | s3_key written |
|---|---|---|---|---|
| **Phase 8 TTS generator** (the only live bulk writer) | `services/phases/phase8-audio-v13.cjs` `/generate`, `/regenerate-role`, `/regenerate-single`, `/regenerate-presentation(s)`, `/regenerate-phrase` — all 16 insert sites | hard-coded `'tts'` | resolved from `courses.voice_config` as `${provider}_${voiceId}` | `mastered/{UUID}.mp3` (new UUID every generation) |
| Phase 8 presentation-text pass | same file ~2267 | `'tts'` | presentation voice | `pending/{UUID}.mp3` placeholder rows (text staged before audio exists) |
| S3 sync endpoint | `services/production-api.cjs` ~5766 (registers S3 files found in a plan) | hard-coded `'tts'` | from plan voices map | `{UUID}.mp3` (flat legacy) |
| Legacy course import | `api/import-course.js` (Vercel) | `'tts'` for ALL course audio — **even human-recorded legacy Welsh** (line 139); `'human'` only for `shared_audio` encouragements/instructions (lines 204, 225) | `sample.voice_id \|\| 'legacy'` | via `s3_uuid` column that no longer exists → endpoint is dead today, but its rows survive live as `voice_id='legacy_import'` |
| Welsh North intro relink (one-off scripts, June 2026) | outside this repo | `'human'` | `'human'` | existing mastered keys |
| **Human recording upload** | `POST /api/production/:courseCode/recording/upload` (production-api.cjs 4025) | **writes NO course_audio row at all** — uploads bytes to S3, flips a `sample_flags` row, optionally inserts `recording_provenance` | — | `ssiborg-assets/mastered/{uuid}.mp3` (different prefix from the row it's meant to replace — see §2) |

`origin` values that exist anywhere in code: **only `'tts'` and `'human'`** (grep across services/, api/, src/, database/). Live data confirms: only those two values.

### 1.5 How content rows bind to audio (the serving contract)

`20260130_add_audio_ids_to_content.sql`: `course_legos` and `course_practice_phrases` each carry three FK columns →

```
known_audio_id | target1_audio_id | target2_audio_id   (each REFERENCES course_audio(id))
```

plus `presentation_audio_id` on `course_legos`. These are "cycle-locked": the learner app does **no text matching and no voice choosing at runtime** — it plays exactly the clip the FK points at. The learning cycle is: known prompt (`known_audio_id`) → pause → target voice 1 (`target1_audio_id`) → target voice 2 (`target2_audio_id`).

Cached `duration_ms` columns on the content tables are kept in sync by triggers in both directions (`20260512`). A text edit NULLs the relevant audio FKs via trigger (`20260206_null_audio_on_text_change.sql`) so Phase 8 regenerates — note this *unlinks* but does not delete the old clip.

---

## 2. S3 key conventions

Bucket: `ssi-audio-stage` (env `S3_BUCKET`), region `eu-west-1`. URL = `https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/{s3_key}`. S3 is a dumb blob store; all metadata is in Supabase; `s3_key` is used verbatim.

| Key pattern | Who | Status |
|---|---|---|
| `mastered/{UUID}.mp3` (UUID UPPERCASE) | Phase 8 v13 — all new TTS audio, mastered to −16 LUFS | **the live convention** — 100% of sampled rows in both queried courses |
| `{UUID}.mp3` (flat, bucket root) | early v13 + S3-sync endpoint | legacy, still referenced |
| `ssiborg-assets/mastered/{UUID}.mp3` | `s3-production-service.cjs` `uploadRecording()` (the human upload endpoint) and the **default** fallback in `getAudioSignedUrl()` when a row has no s3_key | v12-era prefix. **Mismatch trap**: a human re-record uploads here, but the course_audio row it replaces points at `mastered/{UUID}.mp3` — the rows' s3_key is never updated, so serving paths that read `s3_key` (manifest, learner app) keep playing the old TTS clip |
| `pending/{UUID}.mp3` | Phase 8 placeholder rows (presentation text staged before audio) | transient |
| `mastered-v2/{UUID}.mp3` | seen live on 1 zho pod-explainer group | minor variant |
| `courses/{courseCode}/audio/{uuid}.mp3` | `services/s3-audio-service.cjs` | **orphaned** — no consumers found in services/ or api/ |

Course-level JSON sidecars also live in S3: `courses/{code}/course_manifest.json`, `sample_flags.json`, `audio_metadata.json` (s3-production-service.cjs).

---

## 3. The voices model

### 3.1 How a course knows its voices

Single source of truth: **`courses.voice_config` JSONB** (per `audio-registry-v13.apml`; the flat columns `known_voice`/`target_voice_1`/`target_voice_2` referenced by `manifest-generator.cjs` and `batchLookupAudioUuids` **do not exist live** — those code paths are dead v12 remnants).

Live shape (zho_for_eng):

```json
{ "voices": {
    "known":        { "provider": "azure", "voiceId": "en-GB-SoniaNeural",  "language": "en-GB", "settings": { "speed": 0.95 } },
    "target1":      { "provider": "azure", "voiceId": "zh-CN-XiaoxiaoMultilingualNeural", "settings": { "speed": 0.8 } },
    "target2":      { "provider": "azure", "voiceId": "zh-CN-YunyiMultilingualNeural",    "settings": { "speed": 0.8 } },
    "presentation": { "provider": "azure", "voiceId": "en-GB-SoniaNeural",  "settings": { "speed": 0.95 } } },
  "providers": { "azure": {...}, "elevenlabs": {...} },
  "cadenceProfiles": { "fast": {...}, "slow": {...}, "natural": {...} } }
```

Managed via `GET/PUT /api/courses/:courseCode/voice-config` and `PATCH .../voice-config/:role` (valid roles hard-coded: `target1, target2, known, presentation`). Voice discovery: `GET /api/voices/discover/:language?provider=azure|xai` (ElevenLabs entered manually); preview: `POST /api/voices/preview` (azure/elevenlabs/xai only — **no human-voice concept anywhere in the voice-config UI surface**). The Vercel `api/voices/list.js`/`preview.js` are Azure-only equivalents.

Phase 8 resolves a role's voice as `getVoiceForRole(role)` → `"${provider}_${voiceId}"`, and explicitly **ignores any voice_id already on pending rows** ("the role determines the voice").

### 3.2 `voice_id` formats observed

| Format | Example | Where |
|---|---|---|
| `azure_{ShortName}` | `azure_zh-CN-XiaoxiaoMultilingualNeural` | Phase 8 composed; dominant live format |
| bare ShortName | `en-GB-SoniaNeural` | older rows written before the provider prefix rule |
| xAI short names | `eve`, `leo`, `ara`, `sal` | xAI provider rows |
| ElevenLabs ids | `gfzdpspr5fdp`, `9ab26871`, `f15c6a6a` | ElevenLabs rows (pod explainers etc.) |
| `legacy_import` | 19,080 cym_n rows | legacy Welsh import |
| `human`, `human_recording`, `Aran` | cym_n presentations / shared instructions / welcome | human-origin rows — **no consistent human voice-id scheme in data** |
| `human_{emailLocal}_{lang}` | `human_richard_mkd` | **code only**: minted on invite into `dashboard_users.voice_id` (production-api.cjs 468, api/auth/invite.js 88) for every non-admin. Live check: **all 7 dashboard_users rows have voice_id NULL** — the format has never reached real data, and nothing ever copies it into `course_audio.voice_id` |

Note the `human_{email}_{lang}` id keys on the user's **first** course's language (`courses[0].split('_')[0]`) — for Richard's helper invited to `mkd_for_fra` that's `human_{name}_mkd`, fine; but a helper invited first to another course gets the wrong language baked in, and one id cannot represent a person who records in both known and target languages.

### 3.3 Known-voice vs target-voice roles, and what ">=2 target voices" means

- Roles are **positional slots, not a voice registry**: `known` = one voice reading known-language prompts; `target1` + `target2` = exactly two target-language voices; `presentation` = narration voice. The learner hears every target phrase twice — once per target voice — because the cycle plays `target1_audio_id` then `target2_audio_id`.
- So **two target voices is mandatory and built-in** (manifest compiler refuses without `known`, `target1`, `target2` — phase9-manifest-compiler.cjs 226), and **more than two is impossible** without schema change: voice choice is encoded in (a) the `role` value on `course_audio`, (b) the three fixed FK columns on content tables, (c) the fixed keys of `voice_config`. There is no per-clip voice indirection the serving path could use to pick a 3rd voice.
- For Richard this means: his course needs exactly 2 recording helpers for the target language (one per slot), and each helper must own a *whole role* — you can't mix voices within target1 per-phrase ambiguity-free, though nothing actually validates that all `target1` rows share one `voice_id` (live zho target1 shows 8 different voice_ids from past experiments).

### 3.4 Serving-path recap (how a clip's voice is picked)

1. Build time: Phase 8 writes `course_audio` rows per role, then `linkAudioIds` RPC (20260325) fills `known/target1/target2_audio_id` on content rows by `(course_code, text_normalized, role)` with `LIMIT 1` — **no ORDER BY, no origin preference**: if a text has both a TTS and a human clip for the same role, which one gets linked is arbitrary.
2. Run time: learner app / dashboard players follow the FK (or `/audio/by-text` text lookup in dashboard previews) and play `s3_key` verbatim. Voice is whatever the linked row says. `origin` is never consulted at serving time.

---

## 4. Live data (read-only queries, 2026-06-10)

`course_audio` grouped by `origin | voice_id | role`:

**cym_n_for_eng** (the one human-recorded course):

```
6384  tts|legacy_import|target2        mastered/{UUID}.mp3
6384  tts|legacy_import|target1        mastered/{UUID}.mp3
6312  tts|legacy_import|known          mastered/{UUID}.mp3
 641  human|human|presentation         mastered/{UUID}.mp3
  48  human|human_recording|instruction
  26  human|human_recording|encouragement
   1  human|Aran|welcome
```

→ **19,080 genuinely human Welsh recordings are labelled `origin='tts'`** (`legacy_import`). The only `origin='human'` rows are the 641 relinked presentation intros + shared bits. Any future "regenerate role" against this course would treat the precious Welsh audio as regenerable.

**zho_for_eng** (full-TTS flagship): dominated by `azure_en-GB-SoniaNeural|known` (6,085), `azure_zh-CN-Xiaoxiao…|target1` (6,008), `azure_zh-CN-Yunyi…|target2` (5,993), `azure…Sonia|presentation` (558), plus a long tail of 20+ experimental voice_ids (bare Azure names, xAI `eve/leo/ara/sal`, ElevenLabs hashes) and 326 `pod_explainer` rows. Also present: 74 `human|human_recording|instruction/encouragement` rows and exactly one `bookend_listen_intro`/`outro` pair.

Other live facts: `recording_provenance` table exists with **0 rows ever**; `dashboard_users.voice_id` is NULL for all 7 users; `courses` has no per-voice columns outside `voice_config`.

---

## 5. What the human engine needs (concrete schema/code deltas)

1. **`origin='human'` exists and is enough as a value** — no new enum needed. The gap is that no live write path ever sets it: the recording upload endpoint must INSERT/UPDATE a `course_audio` row (`origin='human'`, real `voice_id`, the actual uploaded `s3_key`, `duration_ms` from the processor) instead of only flipping `sample_flags`. Today a human recording is invisible to the data model.
2. **Fix the S3 prefix split**: upload writes `ssiborg-assets/mastered/{uuid}.mp3` while rows/serving use `mastered/{uuid}.mp3`. Pick one (the v13 `mastered/`) and write the row's `s3_key` from the actual upload. Optionally adopt a human-scoped prefix (`human/{courseCode}/{UUID}.mp3`) so bucket-level lifecycle/backup rules can treat precious audio differently — the data model already supports it because `s3_key` is verbatim.
3. **Per-voice rows**: already supported if the live unique index is the 5-column one Phase 8 upserts against (verify with one `\d course_audio` before building). If it's the APML 4-column index, TTS regeneration **overwrites human rows in place** (same conflict key, `origin` flipped back to `'tts'`, s3_key replaced) — this is the single most dangerous fork in the audit; confirm before any human audio lands.
4. **Protect-from-regen flag**: nothing today stops Phase 8 from clobbering human audio. Minimum: every Phase 8 upsert/delete path and `regenerate-role` must exclude `origin='human'` rows (a `WHERE origin <> 'human'` guard, or a dedicated `protected boolean DEFAULT false` column so admins can also pin TTS clips). Also make `linkAudioIds` prefer human: `ORDER BY (origin='human') DESC` instead of bare `LIMIT 1`.
5. **Provenance**: `recording_provenance` (audio_uuid, recorded_by, speaker_*, consent, usage_rights, retake_count…) already exists and has an insert helper — wire it up and fix the call-signature bug: production-api.cjs 4079 calls `updateSampleFlag(uuid, courseCode, 'needs_review', …)` positionally but the helper signature is `(audioUuid, { courseCode, status, notes, flaggedBy })` (supabase-client.cjs 735), so status/notes are silently lost today.
6. **Voice registry for humans**: `voice_config.voices.{role}` should accept `provider: 'human'` with `voiceId: human_{person}_{lang}` so (a) Phase 8 refuses to TTS that role, (b) the recording queue knows which helper owns which slot, (c) `course_audio.voice_id` becomes consistent. Fix the invite-time `human_{email}_{first-course-lang}` minting to be per-(person, language), not per-first-course.
7. **Backfill/diagnostic**: relabel the 19,080 cym_n `legacy_import` rows to `origin='human'` (they are the canonical precious-audio case and currently sit on the wrong side of every future guard).
8. **Vocabulary**: `api/import-course.js` `ROLE_MAPPING` still accepts the banned legacy term as an input role key (mapping it to `known`) and `canonical_seeds` has the known leak — keep the banned word out of any new engine schema; the established names are `known` / `target1` / `target2` / `presentation`.

### Tables the engine touches, in one picture

```
courses.voice_config ──(role→voice)──► phase8 / recording queue
        │
course_audio (course_code, text_normalized, language, role, voice_id) ──s3_key──► ssi-audio-stage
        ▲ id                                                            mastered/{UUID}.mp3
        │
course_legos.known/target1/target2/presentation_audio_id      (cycle-locked FKs; triggers:
course_practice_phrases.known/target1/target2_audio_id         null-on-text-change, duration sync)
        +
sample_flags (QA / recording queue states: flagged_human_needed → in_recording → needs_review)
recording_provenance (built, never used — 0 rows)
dashboard_users.voice_id (human_{email}_{lang} — minted in code, NULL for all live users)
```
