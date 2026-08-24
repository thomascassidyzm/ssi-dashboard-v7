# Audit 04 — Synthesis CLI + Demo Gap

**Scope:** the human-voice synthesis loop — turning ~150 uploaded recordings into ~1350 `course_audio` rows for a community course (persona: Richard, leading Macedonian-for-French, with helper contributors and ≥2 human voices).

**Verdict up front:** every stage of the loop exists somewhere in the repo, but the stages are not connected. The recording script generator and the autocue recorder are wired into the app; the alignment/segmentation/splice tools are standalone CLIs nobody calls; the on-screen "LEGO Audio Synthesis" panel is a hard-coded Welsh theatre piece playing three pre-baked S3 clips; and the upload seam that should join recording → synthesis is broken in four distinct ways. Nothing in-app assembles phrases from human recordings.

---

## 1. The CLI tools (`tools/recording-optimizer/`)

Four files. Only one (`generate-recording-script.cjs`) is required by any service. The other three are reachable only by a human running `node` on the host machine.

### 1.1 `generate-recording-script.cjs` — WIRED ✅

The only tool integrated into the app (`services/production-api.cjs:6711` requires it; served at `GET /api/production/:courseCode/recording-optimizer` and `GET /api/production/:courseCode/recording-script`).

| | |
|---|---|
| **Input** | Supabase: `course_legos` (where `is_new=true`), `course_practice_phrases`, `course_seeds` for a course code. Own `.env` Supabase client (`SUPABASE_URL` + `SUPABASE_SERVICE_KEY`). |
| **Output** | JSON: `statistics`, `recordingScript.phrases[]` (each with `target`, `known`, `recordingChunks`, `chunksString` — pipe-joined chunk text ready for `align-audio.cjs --chunks`), `directRecord.items[]`. |
| **Algorithm** | `greedySetCover()` over LEGO universe; `chunkPhraseByLegos()` (maximum-munch) + `mergeGlueIntoLegos()` (absorbs splice-hostile glue words into adjacent LEGO chunks, left-attach). |
| **External deps** | None beyond Supabase + Node. |
| **Hard-coded assumptions** | Whitespace tokenisation (`tokenize()` splits on `\s+`) — fine for Macedonian/French, breaks for unspaced scripts (zho/jpn/tha). Accent-stripping normalisation. `MIN_PHRASE_WORDS: 2`. No voice or cadence concept — the script is voice-agnostic; one script, one implied voice. |

Language-generic and DB-driven: works for any course. This is the one genuinely production-shaped piece.

Note: the optimizer's per-chunk `chunksString` (`"je veux|parler|macédonien"`) is **exactly** the input format `align-audio.cjs --chunks` consumes — the two tools were designed as a pair, but nothing persists `chunksString` alongside an uploaded recording (see §4.3), so the handshake is dropped on the floor.

### 1.2 `align-audio.cjs` — UNWIRED ❌ (the keeper)

Forced alignment of **known text** against recorded audio ("we already know what the speaker said — it's an alignment problem, not a transcription problem"). Aligns at LEGO-chunk boundaries, the right grain for splicing. Self-described drop-in replacement for `segment-audio.cjs`.

| | |
|---|---|
| **Input** | One audio file + `--chunks "a|b|c"` (pipe-delimited LEGO chunks, multi-word OK) or legacy `--phrase`. `--language` ISO 639-3 (default `eng`), `--mode slow-gap\|natural\|auto`. |
| **Output** | JSON `{ inputFile, durationMs, language, method, chunks:[{text,startMs,endMs,durationMs,confidence}], words:[…same, legacy key], extractedFiles? }`; optional per-chunk MP3s to `--output-dir` (`001_<safeFilename>.mp3`, libmp3lame q2, 20ms pad). |
| **Mode 1: slow-gap** | ffmpeg `silencedetect` (−35 dB, ≥150 ms) → voiced regions → 1:1 map to expected chunks. **Zero ML deps.** Fails cleanly on chunk-count mismatch (returns expected vs detected counts). |
| **Mode 2: natural** | aeneas forced alignment (`python3 -m aeneas.tools.execute_task`, DTW on MFCCs), one chunk per text line. |
| **External deps** | ffmpeg + ffprobe (both installed on this host). aeneas for natural mode — **NOT installed on this host** (`import aeneas` fails). |
| **Hard-coded assumptions** | `safeFilename()` whitelist is Latin-alphabet + a handful of European diacritics — **Cyrillic (Macedonian) chunk text becomes all-underscores filenames**, so a chunk directory for mkd is `001_______.mp3`, `002_______.mp3`… filename-as-key collapses. CONFIG thresholds (−35 dB / 150 ms) are untuned per language/mic. No voice/cadence/speaker concept. Default language `eng`. |

This is the tool the build should keep: slow-gap mode matches the autocue's slow pass (speaker pauses *between LEGO chunks*, which `recordingChunks` renders as pause boundaries in Pass 2 — `src/components/production/autocue/AutocueStudio.vue` / `PhraseCard`). The chunk-count-mismatch failure is a natural QA gate.

### 1.3 `segment-audio.cjs` — UNWIRED ❌ (superseded)

Whisper-transcription-based word segmentation. Predecessor of `align-audio.cjs`.

| | |
|---|---|
| **Input** | Audio file + optional `--phrase`, `--language` (whisper hint, default `auto`). |
| **Output** | JSON with word-level timestamps + confidence, optional per-word MP3 extraction. |
| **External deps** | `whisper-cli` at hard-coded path `/opt/homebrew/opt/whisper-cpp/bin/whisper-cli` (installed on this host); ggml model at hard-coded `/tmp/whisper-models/ggml-base.bin` (**absent** — `/tmp` is wiped on reboot, so this path is structurally fragile); ffmpeg (16 kHz mono WAV conversion). |
| **Hard-coded assumptions** | macOS-Homebrew binary path; base whisper model (poor for minority languages — `apml/core/human-recording-v1.apml` notes Welsh needs `techiaith/whisper-base-ft-commonvoice-cy-cpp`; Macedonian support in `ggml-base` is weak); accent-stripping normalisation; lowercase + punctuation-strip on detected words. |

Transcribe-then-match is the wrong architecture when the text is already known (autocue guarantees it). Keep only as a *verification* idea (whisper-verify that the speaker said what the autocue showed — the quality gate `human-recording-v1.apml §community.quality_gate` calls for), not as the aligner.

### 1.4 `splice-legos.cjs` — UNWIRED ❌ (engine core, wrong key model)

Concatenates extracted LEGO clips into new phrase audio.

| | |
|---|---|
| **Input** | `--legos <dir>` of MP3s named `NNN_word.mp3` + `--phrase "text"` or `--phrases file.json`. |
| **Output** | One MP3 per phrase: per-LEGO −16 LUFS normalisation (via shared `services/audio-processor.cjs#normalizeAudio` — its only tie into the app codebase) → chained ffmpeg `acrossfade` (20 ms tri/tri) → 192k MP3; falls back to plain concat on filter failure. Reports `{success, missing[]}` per phrase. |
| **External deps** | ffmpeg; `services/audio-processor.cjs`. |
| **Hard-coded assumptions** | **Library key = filename.** `loadLegoLibrary()` regexes `^\d+_(.+)\.mp3$` and underscores→spaces — so the library inherits align-audio's Latin-only `safeFilename()` flaw (Cyrillic = collisions). **Phrase lookup is per-WORD** (`phrase.trim().split(/\s+/)`), not per-LEGO-chunk — it ignores M-type chunking and needs every single word as a clip, contradicting the chunk-level alignment upstream. **No voice, cadence, or course dimension** — one flat directory = one implicit voice. Encodes MP3 via ffmpeg's muxer, which `phase8-audio-v13.cjs#spliceAudio` documents as breaking iOS/AVPlayer (every production encode site pipes ffmpeg→lame instead — see `audio-processor.cjs#ffmpegFilterToLameMp3`). |

The crossfade/normalise logic is sound; the keying model (filenames, words, single voice) and the MP3 muxer must be replaced before production use.

---

## 2. Wiring status — verified

`grep` over `src/`, `services/`, `api/` finds **zero** references to `align-audio`, `segment-audio`, `splice-legos`, `alignAudio`, or `splicePhrase`. The only `tools/recording-optimizer/*` import anywhere in the running system is `generate-recording-script.cjs` in `production-api.cjs:6711`. The three audio tools are host-machine CLIs with no API surface, no job wrapper, and no caller.

---

## 3. The "LEGO Audio Synthesis" demo — exactly what it fakes

UI: `src/views/RecordingOptimizer.vue` (route `/production/:courseCode/recording-optimizer`, default course `cym_n_for_eng` at line 409). API: `GET /api/production/:courseCode/frankenstein-demo` (`services/production-api.cjs:6875`).

What it fakes, item by item:

1. **The "synthesized" audio is pre-baked, not synthesized.** The endpoint hard-codes three S3 keys — `demo-splices/demo1.mp3`, `demo2.mp3`, `demo3.mp3` (production-api.cjs:6879-6886, comment: "pre-generated spliced audio stored in S3 … V2: Generated with deterministic silence detection, 44.1kHz/128k CBR"). They were made offline (no generating script exists in the repo — `demo-splices` appears nowhere else) and are served via signed URL no matter what course you're looking at.
2. **The language is hard-coded Welsh twice over.** The six demo phrases are Welsh-North literals in the endpoint (`'dw i isio siarad Cymraeg'`, seeds 1/6/11 + fake "seeds" 60/61/62); the database lookup for the three real phrases is `findCourseAudio(courseCode, phrase.text, 'cym', phrase.role)` — language pinned to `'cym'` regardless of `:courseCode`. Open this view on `mkd_for_fra` and the three "recorded" rows 404 while the three "spliced" rows still play Welsh.
3. **The build visualization is hard-coded in the frontend.** `synthesizedExample` + `sourcePhrases` (RecordingOptimizer.vue:460-518) are static Welsh word-by-word maps ("dw←S1, ddim←S6, rŵan←S11") with fixed colour classes. No course data drives them.
4. **The coverage ring is theatre.** `recordedCount = ref(0) // TODO: fetch from audio inventory`, `splicedCount = ref(0)`, `flaggedPhrases = ref([])` (lines 436-450). "Recorded / Spliced / Pending" and "Flagged Splices need re-recording" render entirely from zeros.
5. **`stats.totalPhrases` is an estimate, not a count.** The endpoint returns `totalLegos * 10 // Approx phrases generatable` (production-api.cjs:6747) — the "record 254 → synthesize 11,818" headline number is a multiplication, not a query.
6. **Export PDF is a stub** (`alert("Export PDF isn't available yet.")`).

What is real on this screen: the GuaranteedCoverage statistics, the recording-script preview, and the link into the Recording Studio. The honest half is the *planning* half.

---

## 4. What happens to a recording uploaded today — the broken seam

The autocue flow (the one working uploader) ends at `POST /api/production/:courseCode/recording/upload` (`production-api.cjs:4025`). Trace verified end-to-end; four breaks:

### 4.1 Script-mode recordings have synthetic IDs and a collision-prone S3 key
`useAutocueState.js#loadOptimizedScript` assigns `id: 'script-${idx}'` to each optimizer item (line ~582). `AutocueStudio.vue:277` uploads with `uuid: phrase.id`. `s3-production-service.cjs#uploadRecording` writes `Key: ssiborg-assets/mastered/${uuid}.mp3` — i.e. **`ssiborg-assets/mastered/script-0.mp3`**. Two consequences: (a) every script session for every course writes the *same keys* — Richard's Macedonian Pass-2 overwrites the previous course's (or his own earlier session's, or his second voice's) recordings; (b) the key encodes neither course, session, voice, nor cadence. `scriptSessionId` exists only inside S3 object metadata and a websocket event.

### 4.2 No `course_audio` row is ever created — and `origin` never becomes `'human'`
The upload endpoint does S3 put → sample flag → provenance → websocket. It never touches `course_audio`. For *re-record* mode (real audio UUID), the DB row keeps `origin='tts'` and `s3_key='mastered/{uuid}.mp3'` while the human take lands at `ssiborg-assets/mastered/{uuid}.mp3` — a different key in the same bucket — so playback (signed from the DB `s3_key`) **keeps serving TTS**, and the precious-audio protection (`origin='human'` = never regenerate) never engages. The human take is stranded, invisible, and unprotected.

### 4.3 The chunk map is not persisted with the recording
Upload metadata is `{role, cadence, text, type, phraseIndex, coversLegos, scriptSessionId}` (AutocueStudio.vue:278-287) — **`chunksString`/`recordingChunks` are omitted**, even though the autocue had them on screen. The aligner's required input must later be re-derived by re-running the optimizer and praying the DB hasn't changed (a content edit reorders the greedy cover and silently mis-pairs recordings with chunk maps).

### 4.4 Two latent endpoint bugs neuter flag + provenance
- `production-api.cjs:4080` calls `supabaseClient.updateSampleFlag(uuid, courseCode, 'needs_review', notes, by)` **positionally**, but the function signature is `updateSampleFlag(audioUuid, { courseCode, status, notes, flaggedBy })` (`supabase-client.cjs:735`) — the string is destructured as an object, so status/courseCode arrive `undefined`.
- The endpoint gates provenance on `provenance.recordedBy` (camelCase); AutocueStudio sends `recorded_by` (snake_case) — so `insertRecordingProvenance` (`supabase-client.cjs:1601`, table `recording_provenance`, which *does* exist — see `database/schema/course-structure-schema.sql:14`) **is never called** for autocue uploads. Speaker identity — the voice dimension the whole multi-voice model needs — is silently dropped.

Also: the *other two* upload clients are incompatible with the endpoint. `src/stores/production.js#uploadRecording` (used by `views/production/RecordingStudio.vue`) and `useAudioUpload.ts#uploadAudio` both send `{audio, mimeType, metadata}` with `uuid` nested in metadata; the endpoint requires top-level `{uuid, audioData}` and 400s. Only `useUploadQueue.doUpload` sends the right shape.

---

## 5. Pieces that already exist (reuse, don't rebuild)

| Piece | Where | State |
|---|---|---|
| Minimal-set planner + chunked script | `tools/recording-optimizer/generate-recording-script.cjs` + 2 production-api endpoints | Working, wired |
| Continuous chunk-aware recorder (VAD, auto-advance, retry-queue upload) | `autocue/AutocueStudio.vue`, `useAutocueState.js`, `useContinuousRecorder.ts`, `useUploadQueue` | Working, wired (to a broken seam) |
| Recording mastering (webm→mp3 via lame, silence-trim, highpass, loudnorm −16, limiter) | `services/audio-processor.cjs#processRecordingBuffer`, `#ffmpegFilterToLameMp3` | Working, used by upload endpoint |
| Chunk-level aligner (slow-gap, zero-ML) | `tools/recording-optimizer/align-audio.cjs` | Working CLI, unwired |
| Crossfade concat + per-LEGO normalise | `tools/recording-optimizer/splice-legos.cjs` | Working CLI, unwired, wrong key model |
| **The orchestration skeleton: a full in-app splice job already ships** | `services/phases/phase8-audio-v13.cjs` `POST /splice-components/:courseCode` (line 4403): plan → dry-run → download parent from S3 → `findComponentBoundaries()` against stored `word_boundaries` → `spliceAudio()` (ffmpeg→lame, iOS-safe) → upload `mastered/{uuid}.mp3` → upsert `course_audio` → link FK; `startWork()` job state, cancellation, skip-accounting | Working — but only for **TTS** parents (requires `word_boundaries NOT NULL`; Azure-only — xAI and human rows have none), and only **extracts components**, never assembles phrases |
| Audio registration | phase8 `POST /insert` (line 2131): upserts `course_audio` from `{courseCode,text,language,role,voiceId,origin,s3Key,durationMs}` on conflict key `course_code,text_normalized,language,role,voice_id` | Working, generic — accepts `origin:'human'` today |
| FK linking sweep | phase8 `linkAudioIdsBatch` / `POST /link-audio-ids/:courseCode` (line 3044): fills `known/target1/target2_audio_id` across `course_seeds`/`course_legos`/`course_practice_phrases` by normalised text | Working |
| Job + agent infra | `build_jobs` table (+ progress, activity-log migrations), `services/shared/spawn-agent-terminal.cjs`, `course-builder/lib/agent-spawner.cjs#spawnInTerminal` — the proven host-machine compute model (leaders ngrok in; CLI work runs on the host) | Working |
| Provenance table | `recording_provenance` (migrated; insert helper exists) | Exists, currently unreachable (§4.4) |
| Design docs | `docs/AUDIO_SPLICING_SPEC.md` (2024-12, full pipeline + Supabase schema draft) and `apml/core/human-recording-v1.apml` (2026-01, "CANONICAL": `course_lego_library`, `recording_sessions`, `phrase_recordings`, `origin='splice'`, splice params, community quality gates, Welsh worked example: 254 recordings → 11,818 phrases, 97.8% reduction) | **Specs only — none of their tables are migrated** (no migration in `database/migrations/` creates any of them), and `course_audio.origin` CHECK still allows only `('tts','human')` — `'splice'` would be rejected today |

(Vocabulary note for the build: `AUDIO_SPLICING_SPEC.md` labels the known-language role with the banned word; the optimizer output also uses a `source` field for seed/practice provenance. Rename on touch.)

---

## 6. GAP SPEC — "uploaded recordings for course X, voice V" → full `course_audio` rows

### 6.1 Missing pieces, concretely

1. **A real recording-session object.** Adopt `recording_sessions` + `phrase_recordings` from `human-recording-v1.apml` (migration needed). Upload must write: S3 key `recordings/{courseCode}/{sessionId}/{NNNN}_{cadence}.mp3` (never `mastered/`, never `script-N`), one `phrase_recordings` row per take carrying `phrase_text`, `cadence`, **`chunks_string` captured at upload time** (fixes §4.1, §4.3), `voice_slot` (target1/target2), `recorded_by`. Fix the four §4 bugs in the same pass (`production-api.cjs:4080` call signature; provenance key casing; retire/repair the two incompatible upload clients).
2. **An alignment service.** New `services/voice-engine/align-service.cjs` wrapping `align-audio.cjs#alignAudio` (it already exports cleanly): for each `phrase_recordings` row with `cadence='slow'`, run slow-gap against its stored `chunks_string`; persist chunk timestamps (millisecond offsets into the take — phase8's `word_boundaries` column is the natural home, making human rows immediately compatible with `findComponentBoundaries`). Chunk-count mismatch → flag the take for re-record in the review UI, don't guess. aeneas/natural mode is a later enhancement, not a launch dependency (not installed; slow-gap matches the autocue design).
3. **A human LEGO library.** Migrate `course_lego_library` (per `human-recording-v1.apml §schema`) keyed `(course_code, lego_id, voice_id, cadence)` — **add `voice_id` to the spec's unique key**, it only has `(course_code, lego_id, cadence)`. Extraction = `extractSegment` logic from align-audio, stored at `lego-library/{courseCode}/{voiceId}/{legoId}_{cadence}.mp3`. DB-keyed, killing the Latin-only-filename problem (§1.2/§1.4) outright — essential for Cyrillic Macedonian.
4. **An assembly engine.** New `services/voice-engine/splice-service.cjs`: take `splice-legos.cjs`'s normalise-then-crossfade core but (a) look up clips by `(course_code, lego/chunk text_normalized, voice_id, cadence)` from `course_lego_library`, (b) tile each target phrase by **LEGO chunks** (reuse `chunkPhraseByLegos` from the optimizer — same maximum-munch), not by words, (c) encode via `audioProcessor.ffmpegFilterToLameMp3` (iOS-safe), (d) on missing chunks emit a *gap report* feeding back into the recording script ("record these 7 more phrases").
5. **Registration + linking.** Per spliced phrase: upload `mastered/{uuid}.mp3`, register via the existing phase8 `/insert` path (or direct upsert as `/splice-components` does) with `voice_id = 'human_{speaker}'`, then run `linkAudioIdsBatch`. **Prereq migration: widen `course_audio.origin` CHECK to `('tts','human','splice')`** so splices are distinguishable from precious whole-phrase human takes (`human-recording-v1.apml` already specifies this; today's constraint would reject it). Whole-phrase recordings from the same session (the natural-cadence pass of optimizer phrases, and direct-record items) register as `origin='human'` and win over splices for the same text — the progressive-quality model falls out for free.
6. **Job orchestration + where it runs.** No new infrastructure needed: this is the host machine, which is *the working design* (Popty's compute model — leaders tunnel in via ngrok, heavy work runs on the host; ffmpeg/whisper already live there). Model the pipeline as a phase8-style job (`startWork` pattern) or a `build_jobs` row: `POST /synthesize/:courseCode {voiceId}` → align → extract → splice → register → link, with dry-run/plan first (mirroring `/splice-components`' `dryRun` and the TTS plan→approve convention). Deterministic ffmpeg work needs no Claude agent; `spawnInTerminal` (the `build.cjs` pattern) remains available if an agent-judged QA pass over splice quality is wanted later.
7. **Review surface.** Replace the fake panels in `RecordingOptimizer.vue` with real queries: recorded/aligned/spliced/pending counts from `phrase_recordings` + `course_lego_library` + `course_audio` (the §3.4 ring), flagged splices from `sample_flags`, and a per-take re-record list from alignment failures. The demo section should synthesize *one real phrase for the current course on demand* — the moment the loop exists, the theatre can become a live demo.

### 6.2 What multi-voice (≥2 voices, more for listening) demands

- **Voice is a hard partition of the splice space.** Both specs agree mixing speakers within one spliced phrase is off the table (`AUDIO_SPLICING_SPEC.md §Open Questions 5`). Therefore: LEGO libraries, coverage accounting, and gap reports are all **per `(voice_id, cadence)`**, and *each voice records the full ~150-phrase script* (~30-40 min per voice per the optimizer's estimate). "Course coverage" becomes a matrix: chunks × voices.
- **Session must bind to a voice slot up front.** The autocue currently hard-codes `role: 'target1'` (AutocueStudio.vue:279). Needed: a session-start picker — which helper is recording, mapping `recorded_by` → `voice_id` (`human_marija`) → role slot (`target1`/`target2`), written into `recording_sessions` and threaded into every `course_audio` row. This is also what makes `recording_provenance` load-bearing instead of decorative.
- **Schema already supports exactly this much:** `course_audio.role` allows `target1`/`target2` (two target voices), `courses.voice_config` JSONB maps roles → voice ids (`"target1": "human_marija"`), and `course_audio.voice_id` is free-text — so **n>2 voices are representable at the audio layer** even though the phrase-linking layer (`target1_audio_id`/`target2_audio_id` FK columns) caps *linked practice audio* at two voices per phrase. No migration needed for the 2-voice core flow.
- **Listening exercises (pods) are the n>2 case.** `pod-dialogue-generator.cjs` assigns speakers from per-language voice pools and explicitly defers when none exists ("no voice pool — voices deferred; assign before audio generation"). For a community course, pod dialogue lines are *whole-utterance* recordings by named speakers — they should go through the session recorder as `origin='human'` whole takes (a pod recording script per speaker), **never** through the splicer: dialogue prosody is exactly what concatenation destroys. The voice-engine work item here is just a human voice-pool entry format the pod generator can consume.

### 6.3 Suggested build order (seeds the plan)

1. Migrations: `recording_sessions`, `phrase_recordings`, `course_lego_library` (+`voice_id`), `origin` CHECK + `'splice'`.
2. Fix the upload seam (§4's four bugs + session/voice binding + chunk persistence). *Smallest PR, unblocks everything.*
3. `align-service` + alignment-failure review list.
4. `splice-service` + `/synthesize/:courseCode` job with dry-run plan.
5. Registration/link pass (reuse phase8 `/insert` + `linkAudioIdsBatch`).
6. De-fake `RecordingOptimizer.vue`; live one-phrase demo.
7. Pod/human voice-pool entry; n-voice listening recordings.

---

## Appendix: claim-by-claim verification

| Claim | Status | Evidence |
|---|---|---|
| align/segment/splice are CLI-only and unwired | **VERIFIED** | zero imports/refs in `src/`, `services/`, `api/`; only `generate-recording-script.cjs` is required (production-api.cjs:6711) |
| Demo is hard-coded Welsh serving pre-baked S3 clips | **VERIFIED** | production-api.cjs:6879-6907 (literal Welsh phrases, `demo-splices/demo{1,2,3}.mp3`, language pinned `'cym'`); RecordingOptimizer.vue:460-518 (static Welsh build map) |
| Nothing in-app assembles ~1350 phrases from ~150 recordings | **VERIFIED** | no caller of any splice/align code path for human audio; the one in-app splicer (`/splice-components`) only *extracts* components from **TTS** parents with Azure `word_boundaries`, never assembles phrases, and excludes human rows (`word_boundaries IS NULL`) |
| Human uploads endanger/strand audio with origin never set `'human'` | **VERIFIED (refined)** | upload writes `ssiborg-assets/mastered/{uuid}.mp3` while the DB row keeps `s3_key='mastered/{uuid}.mp3'`, `origin='tts'` → human take invisible to playback, unprotected; no `course_audio` write at all (production-api.cjs:4024-4140) |
