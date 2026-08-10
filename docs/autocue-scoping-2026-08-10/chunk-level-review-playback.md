# Scoping — Autocue chunk-level review playback

Request from Kai: let a recorder review individual chunks / LEGO pieces after recording, before submitting.

Scoped 2026-08-10. Read-only investigation; every claim below is cited to a file and line in this checkout. Anything I could not verify is marked **GAP**.

---

## 1. Current behaviour

### 1.1 What the review screen actually is

Review is one of six phases held in a singleton reactive state object, `src/composables/useAutocueState.js:19`. The review phase renders `review/SessionReview.vue`, which grids one `review/SegmentCard.vue` per entry of `state.recordedSegments` — `src/components/production/autocue/AutocueStudio.vue:222-233`, `review/SessionReview.vue:43-51`.

**The reviewable granularity is exactly one script item — one whole take.** `state.recordedSegments` is appended to once per VAD-captured segment, in `useAutocueState.js:335-350`, and each row is keyed `seg_${phrase.id}` against a single phrase in `state.phrases`. There is no representation of a sub-phrase unit anywhere in the client. The LEGO chunk data is loaded — `recordingChunks`, `legoChunks`, `chunksString`, `chunkCount` at `useAutocueState.js:731-734` — but it is consumed only by the teleprompter's gap markers and by the recorder's silence tolerance. It never reaches a segment row.

### 1.2 Review is reachable in script mode, contrary to a first read

`stopRecording()` routes script mode to `summary`, not `review` — `useAutocueState.js:296-304`. But the summary card carries a "Review Recordings" button, `AutocueStudio.vue:215`, whose handler is a single line, `goToReview()` at `AutocueStudio.vue:427-429`, flipping the phase to `review`. So script-mode recorders **do** get the review screen; they reach it by one extra click.

### 1.3 The confidence and quality numbers are a blob-size heuristic, not a measurement

`useAutocueState.js:344-346`:

```js
confidence: segment.blob.size > 1000 ? 90 : 70,
confidenceLevel: segment.blob.size > 1000 ? 'high' : 'medium',
quality: segment.blob.size > 1000 ? 'Excellent' : 'Good',
```

A take is "90% High Confidence, Excellent" if its compressed bytes exceed 1 kB. Nothing else is examined. The legacy non-script path is worse: `generateRecordedSegments()` at `useAutocueState.js:392-400` adds `Math.random()` to the number, and reports `duration` as `blob.size / 10000` — `useAutocueState.js:409` — a byte count wearing a seconds label. The waveform on every card is decorative: eight bars whose heights come from `segment.id.charCodeAt(4)`, `SegmentCard.vue:69-74`.

The one honest number on the card is `duration` in the script-mode path, `useAutocueState.js:343`, taken from the recorder's wall-clock `durationMs`.

So the review screen's headline stats — "High Confidence / Medium / Needs Review" at `SessionReview.vue:9-22` — carry no information about the recording. They are a size threshold.

### 1.4 What approve and reject actually do

Both are in-memory Set operations and nothing more — `useAutocueState.js:514-522`. There is no server call, no DB write, no flag.

Their only consumer is `finalizeSession()`, `useAutocueState.js:536-616`, which filters `recordedSegments` to the approved ones and POSTs each to `/api/production/:courseCode/recording/upload`.

**In script mode this is a defect, not a feature.** Script-mode takes were already uploaded during the session by the background queue, `AutocueStudio.vue:352-378` → `src/composables/useAudioUpload.ts:134-138`. Then `finalizeSession` uploads them *again*, sending `uuid: phrase.id` — which is the local key `script-N` minted at `useAutocueState.js:717`. The server's `isScriptModeUpload` matches `/^script-\d+$/`, `services/recording-upload-helpers.cjs:19-23`, so the second POST is accepted as a fresh script-mode take: new UUID, new S3 object, new `recording_provenance` row. The duplicate is written by a code path whose metadata block, `useAutocueState.js:583-588`, carries no `chunksString`, no `seedNumber` and no `legoId` — so the duplicate is unalignable. Since the synthesis job resolves "latest take per (phrase, cadence) wins", `services/voice-engine/synthesis-job.cjs:191-205`, the finalize duplicate can supersede the good take.

The consequence for Kai's request: **rejecting a take in script mode does nothing at all.** The bytes are already in S3 with a provenance row. Approving it does something actively unhelpful.

In regeneration mode there is no background queue, so approve genuinely gates the upload and reject genuinely discards. That path behaves as the screen implies.

### 1.5 The client already detects chunk boundaries — and throws them away

This is the most useful finding in the whole scoping.

`src/composables/useVAD.ts:296-368` runs an RMS energy VAD. Inside the silence branch it distinguishes a **chunk pause** from an **end of take**:

- `chunkPauseDuration` (400 ms, `useContinuousRecorder.ts:40`) — a deliberate pause between LEGO chunks. On crossing it, `chunksSeen.value++` (`useVAD.ts:326-329`).
- while `chunksSeen < expectedChunks`, tolerate `interChunkSilenceDuration` (2500 ms) before cutting; after the last chunk, drop back to `silenceDuration` (800 ms) — `useVAD.ts:343-347`.

`expectedChunks` is fed per phrase from `legoChunkCount()` (`src/utils/phraseChunks.js`), imported at `AutocueStudio.vue:244` and pushed into the recorder at `useContinuousRecorder.ts:288-289`.

So the browser is already sitting on the chunk boundary events during a slow take. It counts them — `chunksSeen` — and discards the timestamps. It never records `silenceStartTime` at the moment the counter increments, and the captured segment object carries only `{ blob, durationMs }` — `useContinuousRecorder.ts:154-168`.

That is roughly a dozen lines from being the client-side chunk map.

---

## 2. Where chunk clips exist today, and when

### 2.1 The timeline, traced end to end

| Step | Where | Trigger |
|---|---|---|
| VAD emits a take on silence | `useVAD.ts:348` → `useContinuousRecorder.ts:154-168` | automatic, during the session |
| Take stored in memory as a blob URL | `useAutocueState.js:325-330` | synchronous |
| Take queued for upload | `AutocueStudio.vue:352-378` | synchronous, immediately after capture |
| Upload POSTed | `useAudioUpload.ts:140-188` — serial queue, 3 retries, backoff 1s/3s/8s, no retry on 4xx | automatic, seconds later |
| Server masters to MP3, refuses unprocessed or sub-100 ms audio, PUTs `mastered/{UUID}.mp3` | `services/production-api.cjs:4394-4520` | synchronous within the POST |
| `recording_provenance` row written, all context JSON-stuffed into `quality_notes` | `services/recording-upload-helpers.cjs` `buildProvenanceContext`, `services/voice-engine/provenance-adapter.cjs:42-68` | same request |
| **Alignment into chunk clips** | `services/voice-engine/synthesis-job.cjs:209-300` calling `align.cjs` `alignTakePair` + `cutSegments` | **manual, much later** |

**The alignment trigger is explicitly manual.** The only entry point is `POST /api/production/:courseCode/voice-engine/synthesize`, `services/voice-engine/router.cjs:59`, mounted at `services/production-api.cjs:389`. Its only caller in the app is the Synthesis Studio screen — `src/views/production/SynthesisStudio.vue:241` and `:260` — a separate step in the leader journey, listed as stage 5 after "record" in `src/views/production/LeaderJourney.vue:320-359`. Nothing in the upload handler, in the upload queue, or in Autocue Studio references `synthesize`. There is no job runner, no queue worker, no cron.

So: **at the moment a recorder is looking at the review screen, no chunk clip exists anywhere — not on the client, not on the server, not in S3.** The gap is not milliseconds of latency; it is a human clicking a different screen in a different phase of the course build, typically after the whole voice slot has been recorded.

There is a second, harder reason it cannot exist yet. Alignment needs **both** takes of a phrase: it detects boundaries on the SLOW take and transfers them onto the NATURAL take — `align.cjs:212-263`, and `synthesis-job.cjs:241-246` fails the phrase outright with "no slow take uploaded — cannot align without pause boundaries". The recording script interleaves natural-then-slow per phrase (`tools/recording-optimizer/generate-recording-script.cjs`), so a phrase is only alignable once its second take is in. Mid-session per-take chunk review is therefore impossible for the natural take by construction of the current aligner.

### 2.2 What "flags the phrase for re-record" actually does today

Not much, and nothing that reaches the recordist.

A chunk-count mismatch returns `{ ok: false }` from `mapVoicedToChunks`, `align.cjs:125-134`. The job pushes it onto an in-memory array and calls `segmentStore.recordAlignmentFailure`, `synthesis-job.cjs:259-264`, which appends `{ phraseText, reason, expectedCount, detectedCount, at }` to `manifest.alignmentFailures` inside the JSON manifest at `segments/{courseCode}/{voiceId}/manifest.json` — `segment-store.cjs:58-61, 168-176`.

From there it surfaces as **a count only**. `coverage.cjs:93-132` exposes `alignmentFailures: manifest.alignmentFailures.length`; `SynthesisStudio.vue:37-41` renders "N recordings couldn't be lined up automatically". The per-phrase reasons are held in the job report at `synthesis-job.cjs:390` (`alignFailures.slice(0, 50)`) but I found no UI reading that array. **No row is written to any flags table, no work item is created, and the recordist is never told which phrase to re-record.** That is a live hole independent of this feature request.

### 2.3 Do chunk clips get their own S3 objects and their own `course_audio` rows?

Half yes.

- **S3 objects: yes.** `cutSegments` writes `seg-NNN.mp3` to a temp dir, `align.cjs:280-308`; the job then PUTs each to `segments/{courseCode}/{voiceId}/{segmentId}.mp3`, `synthesis-job.cjs:270-292` via `segment-store.cjs:51-56`. Segment IDs are opaque and minted, deliberately — chunk text may be Cyrillic, so identity travels in the manifest, never in a key.
- **`course_audio` rows: no.** A chunk segment's only record is its manifest entry — `segment-store.cjs:20-30`, carrying `s3Key`, `textKey`, `cadence`, `durationMs`, `startMs`, `endMs`, `method`, and `take: { provenanceId, s3Key }`. `course_audio` rows are minted only for two things: whole-phrase natural takes registered in the `register-takes` phase, `synthesis-job.cjs:336-346`, and **spliced** outputs at `mastered/{uuid}.mp3`, `synthesis-job.cjs:426-430`.

### 2.4 Can the existing endpoints serve a chunk clip back?

No. Both candidates resolve through `course_audio`, which chunk segments do not have:

- `GET /api/production/audio/:uuid/stream`, `production-api.cjs:4238-4258` — selects `s3_key` from `course_audio` by id, 404s if absent, 302s to a signed URL.
- `GET /api/production/:courseCode/audio/by-text`, `production-api.cjs:4306+` — queries `course_audio` by `text_normalized` and `role`.

And **no endpoint reads the segment manifest at all** except the coverage counter. Grep for `loadManifest` / `segmentStore` outside the engine returns only `coverage.cjs:103`. Serving a chunk clip today needs a new route; the S3 bytes are there, the address book is not.

---

## 3. Identity — what would hold "this take's chunk clips"

### 3.1 The coordinator's finding is correct. Verified.

`recording_provenance` (verified live against the DB with `.env.psql` + `~/.local/pg17/bin/psql`):

```
audio_uuid text NOT NULL   -- PRIMARY KEY
recorded_by, recorded_at, speaker_*, recording_*, speaker_consent,
consent_form_ref, usage_rights, quality_notes text, retake_count, created_at, updated_at
```

That is the whole table. **No `course_code`, no `s3_key`, no `role`, no `voice_id`, no `chunks_string`, no `id` column** — the PK is `audio_uuid`. Every scrap of context therefore rides as JSON inside `quality_notes`, which `provenance-adapter.cjs:22-33` parses defensively per row, and `fetchProvenanceRows` at `:70-81` has to select wholesale and filter client-side because none of it is indexable. The adapter's `id` field is `row.audio_uuid`, `provenance-adapter.cjs:46`.

And confirmed: a script-mode upload writes **only** that row. No `course_audio`, no `sample_flags` — `production-api.cjs:4405-4423`.

### 3.2 Addressing a chunk clip

The natural key for a chunk clip is `(take audio_uuid, chunk index)`, or equivalently the manifest's existing `take.provenanceId` plus `segmentId`. The manifest already stores both — `segment-store.cjs:102-115`. **No new table is required to address chunk clips server-side**; what is missing is a route that reads the manifest and signs a segment key.

### 3.3 Can the flags system key a script-mode take?

Yes — verified live:

```
audio_flags: id serial PK, audio_uuid text NOT NULL, course_code text NOT NULL,
             status, reason, flagged_by, created_at, resolved_at, regen_count
UNIQUE (audio_uuid, course_code)
```

`audio_uuid` is **text with no foreign key to `course_audio`**. So a script-mode take's minted UUID can be flagged today, as-is, through the existing endpoints (`/audio-flags` GET+POST, `/audio-flags/:audioUuid/resolve`, `/audio-flags/:audioUuid` DELETE in `production-api.cjs`). Sibling tables exist — `audio_clip_flags`, `sample_flags`, `course_qa_flags`.

**GAP:** I verified the shape of `audio_flags` and `recording_provenance` only. I did not verify `audio_clip_flags` or which of the four tables each flags endpoint writes to; that needs a pass over the handlers before anyone builds on it.

---

## 4. The three options

### Option A — client-side chunk splitting at capture

Retain the VAD's chunk boundary timestamps, then slice the take for playback in the browser.

Evidence it is close: the boundary detection already runs and already knows the expected count — `useVAD.ts:326-329`, `:343-347`, fed by `legoChunkCount` at `AutocueStudio.vue:244`. What is missing is recording `silenceStartTime` when the counter increments and returning the array on the segment object at `useContinuousRecorder.ts:158-163`.

Playback needs no re-encode: `AudioContext.decodeAudioData` on the captured blob, then play `[startMs, endMs]` of the resulting `AudioBuffer`. No upload, no round trip, no server change.

Honest limits, and they matter:
- The client VAD is an RMS energy detector on a raw mic stream. The server aligner runs `ffmpeg silencedetect` at −35 dB with a 150 ms floor and a 60 ms voiced-region filter, `align.cjs:31-36`, on **mastered, normalised, trimmed** audio. The two will not agree exactly. Client boundaries are a *preview*, not the boundaries that ship.
- Boundaries only exist on the slow take. On a natural take `chunksSeen` will usually stay at 0 and the review would offer one chunk. That is arguably correct — the natural take has no deliberate pauses — but it means chunk review is a slow-pass feature.
- It gives the recordist an early, honest chunk-count check: "you read 4 chunks, the script expects 5". That is precisely the condition that later fails alignment at `align.cjs:126-133` and today surfaces to nobody.

### Option B — upload, align, fetch back

Alignment needs the slow take, `align.cjs:213` and `synthesis-job.cjs:241-246`, so this cannot run per take; the earliest it can run is after the phrase's second take. It would need: a new per-phrase align endpoint (the current one is a whole-course job with load, register, plan and splice phases — `synthesis-job.cjs:150-450`), a new route to sign segment keys out of the manifest, and client polling. On a course-length script the manifest is loaded and saved wholesale, `segment-store.cjs:76-86`, so per-phrase invocation would need re-shaping to avoid rewriting the manifest hundreds of times.

Cost is high, latency is server round trip plus several ffmpeg passes per phrase, and the benefit over Option A is only fidelity of the boundary preview.

### Option C — move review to a post-upload screen

Accept that chunk review belongs after synthesis, and build it into Synthesis Studio rather than Autocue. Its coverage panel already surfaces the alignment failure count, `SynthesisStudio.vue:37-41`; the missing half is a per-failure list and a listen-to-the-chunks view, which still needs the new manifest-serving route from Option B.

This is honest about where the data lives, but it does not answer Kai's request. Kai asked to check his work *before submitting*; in script mode the take is already submitted the moment the VAD cuts it.

---

## 5. Size and complexity

**Full chunk-level review, as literally requested: LARGE.** Not because any single piece is hard, but because "before submitting" and "chunk clips" are, in the current architecture, on opposite sides of a manual, whole-course, two-take-dependent batch job. Delivering it properly means a per-phrase align path, a manifest-serving route, client polling, and a decision about what "submit" even means when uploads are already automatic and unrevokable.

**Option A, the boundary-preview version: SMALL.** Concretely:

| File | Change |
|---|---|
| `src/composables/useVAD.ts` | capture `silenceStartTime` and the resume time when `chunksSeen` increments; expose the boundary list; reset it alongside `chunksSeen` at `:301` and `:365` |
| `src/composables/useContinuousRecorder.ts` | add `chunkBoundaries` and `expectedChunks` to `RecordedSegment` at `:158-163` |
| `src/composables/useAutocueState.js` | carry them onto the segment row at `:335-350`; add a `playChunk(segment, i)` alongside `playSegment` at `:473` |
| `src/components/production/autocue/review/SegmentCard.vue` | render one chunk pip per boundary; a real count badge in place of the fake `confidence` |
| `AutocueStudio.vue` | wire the new emit, next to `@play` at `:225` |

No server change, no DB change, no new endpoint, no S3.

**Risks, named:**

1. **Boundary divergence.** Client RMS boundaries will not equal server `silencedetect` boundaries. Label the feature as a self-check, never as "this is how it will be cut", or it becomes a source of false confidence.
2. **Blob decoding cost.** `decodeAudioData` on a webm/opus blob is fine for one take, but a "play all chunks" over a long session decodes repeatedly. Decode lazily, on demand, per card.
3. **The finalize double-upload (§1.4).** Any work on the review screen walks straight past it. It should be fixed in the same pass — script mode must not call the upload loop at all — otherwise a recordist who now engages *more* with the review screen generates more duplicate, unalignable takes.
4. **Reject is a lie in script mode.** Adding a chunk-level "this one's wrong" control on top of a reject that does nothing makes the lie bigger. Either wire reject to the existing `audio_flags` table — which §3.3 confirms can key a script-mode take with no schema change — or relabel the control.
5. **Natural takes will show one chunk.** Expected, but it will read as a bug unless the card says so.
6. **The singleton state.** `useAutocueState`'s `state` is module-level, `useAutocueState.js:17`; blob URLs are revoked only in `resetSession`, `:653-657`. Any chunk-level URL or AudioBuffer must be released in the same place or the session leaks memory proportional to chunk count.

---

## 6. Recommendation

**Build Option A, and fix the two lies alongside it.**

The smallest version that actually helps Kai is not chunk *playback* at all — it is the **chunk count check**. The recorder is being shown gap markers on the slow pass and is being asked to pause at them. The client already counts whether he did. Today that count is used only to decide when to cut, then discarded; the mismatch it implies surfaces days later as an anonymous "N recordings couldn't be lined up" on a screen Kai may never open, with no way back to which phrase.

So, in ascending order of cost, and each one useful on its own:

1. **During the take** — show "4 of 5 chunks heard" live, and mark the card amber on mismatch. Reads one existing counter, `chunksSeen`. This is hours of work and catches the exact failure the aligner will hit.
2. **In review** — one pip per detected chunk, click a pip to hear that slice via WebAudio. This is Option A in full, still no server involvement.
3. **Only if 1 and 2 prove insufficient** — the manifest-serving route and a post-synthesis chunk view in Synthesis Studio, which is also what the orphaned per-phrase alignment failures need.

On better × simpler × cheaper: better, because it catches the mismatch at the microphone where a retake costs thirty seconds, rather than after synthesis where it costs a return to the studio. Simpler, because it adds no endpoint, no table, no job and no round trip — it stops throwing away a measurement the code already makes. Cheaper, because it removes ffmpeg passes from the loop rather than adding them, and because the alternative buys fidelity nobody needs for a self-check.

Two fixes should ride along, because both are cheap and both are actively harmful while a recorder is being invited to spend more time on this screen:

- **Script mode must not run `finalizeSession`'s upload loop** (§1.4). It duplicates every approved take under a fresh UUID with no `chunksString`, and the duplicate can supersede the good one.
- **Replace the blob-size confidence number** (§1.3) with the chunk count and the real duration. "90% High Confidence" computed from `blob.size > 1000` is worse than no number: it tells a recordist his take is excellent when the only thing verified is that it is not empty.

---

## 7. Gaps

- I did not verify the column shapes of `audio_clip_flags`, `sample_flags` or `course_qa_flags`, nor which table each `/flags` and `/audio-flags` endpoint writes to. §3.3's conclusion is verified for `audio_flags` only.
- There is no `supabase/schema.sql` in this checkout, as the brief noted. `recording_provenance` and `audio_flags` above were read live from the database, not from a schema file.
- I did not run the Autocue studio or the synthesis job. All timeline claims are from static reading of the trigger paths; I found no automatic caller of `/voice-engine/synthesize` anywhere in `src/` or `services/`, but absence of a caller in this repo does not rule out an external cron or an ops script outside it.
- `align.cjs`'s per-phrase cost was not measured, so "several ffmpeg passes per phrase" in §4 Option B is a read of the code path — `getAudioDurationMs`, `detectSilenceSpans` on each take, then one encode per chunk — not a timing.
