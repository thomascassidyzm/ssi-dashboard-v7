# Autocue: whole-phrase record option — scoping

Kai's request, scoped against the code on 2026-08-10. **Scoping only — nothing implemented, no behaviour changed.**

Headline: **a whole-phrase take already exists and is already the primary product of a session.** Every phrase in the script is read twice, and the *first* read is exactly the whole-phrase read Kai is asking for — no gap markers, no chunking instruction. So the request is not a new capture mechanic. It is a request to stop asking for the *second* read. That reframes the whole job from "build a mode" to "emit half the script", and it also relocates the real cost: not in the recording booth, in the splicer.

---

## 1. Current behaviour

### 1.1 The script generator produces no cadences at all

`tools/recording-optimizer/generate-recording-script.cjs` does **not** emit natural/slow items. It emits one entry per selected phrase. The interleave is added later, by the API.

Flow, end to end:

1. **Universe** — `getAllLegos()` at `generate-recording-script.cjs:315` pulls `course_legos` where `is_new = true`, capped to seeds `1..maxSeed` by `applySeedCap()` at `:311`. Each becomes a universe entry keyed on normalised target text, carrying a synthetic `legoId` of the form `S0042L03` (`:415`).
2. **Candidates** — seeds first, then practice phrases (`:432`, `:445`); seeds win on collision because `PREFER_SEED_PHRASES` is the intent, expressed as insertion order. Phrases shorter than `MIN_PHRASE_WORDS = 2` are dropped (`:480`).
3. **Coverage sets** — every contiguous token run up to 8 words (`getAllSubsequences`, `:85`) is intersected with the universe (`:487`). A **seed** phrase additionally auto-covers every LEGO attributed to its seed number, contiguous or not (`:495`). That auto-cover rule is the source of the honest gap reported by `services/voice-engine/coverage.cjs:computeSeedAutoCoverGap` — LEGOs marked covered that alignment can never actually cut.
4. **Pruning** — with `excludeRecorded` on (the API default), `getExistingHumanAudioTexts()` at `:361` reads `course_audio` for `(course_code, role, origin='human')` and subtracts every LEGO reachable as a subsequence of an already-recorded text (`:520-533`). Set cover then runs over the residual only.
5. **Set cover** — plain greedy at `:244`.
6. **Chunking** — per selected phrase, `chunkPhraseByLegos()` (`:186`) does maximum-munch left-to-right against the universe, emitting `isLego` chunks and singleton glue chunks. `mergeGlueIntoLegos()` (`:124`) then absorbs glue left into the preceding LEGO chunk, so the recordist is never asked to pause around a bare article or clitic.
7. **Output fields**, all computed at `:605-627`:
   - `legoChunks` — the raw, un-merged chunking, including glue chunks. Reference only.
   - `legoChunkCount` — count of `isLego` chunks in the raw list.
   - `recordingChunks` — the merged list. **This is what the autocue draws and what the aligner consumes.**
   - `chunksString` — `recordingChunks.map(c => c.text).join('|')`. The pipe-delimited pause map.
   - `chunkCount` — `recordingChunks.length`.
8. **Direct items** — `directRecord` at `:546` is the LEGOs set cover could not reach: `reason: 'Not contained in any practice phrase'`. A direct item is a single LEGO recorded on its own.

### 1.2 The interleave is built in the endpoint

`services/production-api.cjs:7484`, `GET /api/production/:courseCode/recording-script`.

Parameters it accepts today, and only these:

| Param | Line | Effect |
|---|---|---|
| `full=true` | 7492 | Turns *off* already-recorded pruning |
| `maxSeed=N` | 7497-7498 | Caps the universe to seeds 1..N |
| `role` | 7503 | `target1`/`target2`; scopes the pruning pool to that voice slot |

The loop at `:7529-7566` pushes **two** items per phrase, `cadence: 'natural'` then `cadence: 'slow'`, both carrying the identical `chunkFields` block (`:7534-7539`). Direct items get the same treatment at `:7570-7596`, with a synthetic single-chunk map (`chunkCount: 1`).

So: `totalItems = 2 × (phrases + direct)`. The estimate at `:7599` is a flat 6 seconds per item.

### 1.3 What the recordist is actually asked to do differently on a slow item

Three things, all client-side, all keyed off `cadence === 'slow'`:

- **A label.** `PhraseCard.vue:12` renders a `SLOW` badge.
- **Gap markers.** `TeleprompterDisplay.vue:21` passes `:show-gaps="scriptMode ? phrase.cadence === 'slow' : currentPass === 2"`. `PhraseCard.vue:15/22` then renders either the plain phrase or the chunked layout, chunks resolved by `resolvePhraseChunks()` (`PhraseCard.vue:55`).
- **Colour.** `.slow-cadence` styling at `PhraseCard.vue:222`.

The generator's own written instruction to the recordist is at `generate-recording-script.cjs:594-604`: pause ~200 ms between chunks, never within a chunk. That string is not surfaced in the autocue UI — the gap markers are the whole instruction the recordist sees.

Capture itself is cadence-blind. `useContinuousRecorder` is constructed once with fixed options at `AutocueStudio.vue:302-308`; `onSegmentCaptured` (`:340-378`) stores one take per script item, queues the upload with `cadence: phrase.cadence` and `chunksString: phrase.chunksString` in the metadata (`:360`, `:369`), then `advanceToNext()`. **There is no per-chunk audio client-side, ever** — a slow take is one continuous file that happens to have pauses in it.

### 1.4 Upload writes no `course_audio` row

`services/production-api.cjs:4394`. `isScriptModeUpload()` (`recording-upload-helpers.cjs:19`) is true when `metadata.mode === 'script'`. In that branch the server mints its own UUID (`:4423`), stores `mastered/{UUID}.mp3`, refuses unprocessed audio (`:4497`) and takes under 100 ms after trim (`:4522`, HTTP 422), and writes **only** `recording_provenance`.

Verified against the live DB: `recording_provenance` has no course, phrase, voice, cadence or chunks column — the columns are `audio_uuid, recorded_by, speaker_*, recorded_at, recording_*, speaker_consent, consent_form_ref, usage_rights, quality_notes, retake_count, created_at, updated_at`. All the identity is JSON-stringified into `quality_notes` by `buildProvenanceContext()` (`recording-upload-helpers.cjs:94-120`) and parsed back out by `provenance-adapter.cjs:parseContext`.

### 1.5 What the slow take is for

`services/voice-engine/align.cjs`. The slow take is the **only** source of chunk boundaries.

- `alignSlowGapTake()` (`:193`) runs ffmpeg `silencedetect` at −35 dB / 150 ms (`DEFAULTS`, `:31-36`), inverts silence into voiced regions, and maps them **1:1** onto the expected chunks.
- `mapVoicedToChunks()` (`:125`) returns `{ ok: false }` on any count mismatch. The comment at `:124` is explicit: *"Count mismatch → the natural QA gate. Never guess."*
- `alignTakePair()` (`:212`) **requires** `slowPath` and throws without it (`:213`). It then tries direct silence detection on the natural take (`:232`) and falls back to `transferBoundaries()` (`:159`), which maps each chunk's share of slow-take *voiced* time proportionally onto the natural take's voiced span, at `confidence: 0.5`.

**What "flags the phrase for re-record" actually does today:** nothing operational. `synthesis-job.cjs:262` pushes the failure into an in-memory array and calls `segmentStore.recordAlignmentFailure()`, which (`segment-store.cjs:168-172`) appends `{phraseText, reason, expectedCount, detectedCount, at}` to the manifest JSON in S3. It surfaces as a count in the job report (`synthesis-job.cjs:386`) and in `coverage.cjs` (`alignmentFailures`). **It does not write to `audio_flags`, does not enter the regeneration queue, and does not reach the recordist.** The word "flagged" in the align.cjs header comment overstates what exists.

### 1.6 Which clips come from splitting versus from whole takes

This is the crux, and it is worth being precise.

**From the whole natural take** — `synthesis-job.cjs:302-350`, the `register-takes` phase. `neededTexts` is built from practice phrases, seeds **and** new LEGOs (`:306-308`). Any phrase group with a `natural` take whose normalised text is in `neededTexts` gets `db.upsertHumanCourseAudio()` — one `course_audio` row, `origin='human'`, `s3_key` pointing at the take itself. The comment at `:303` is the rule: *"A recorded whole-phrase natural take ALWAYS beats splicing it."*

So a whole natural take yields **exactly one `course_audio` row: its own text.** A direct-record item's take yields the LEGO's own row, since LEGOs are in `neededTexts`.

**From chunk splitting** — everything else. `cutSegments()` (`align.cjs:280`) writes per-chunk MP3s into the segment-store manifest; `buildSplicePlan()` (`splicer.cjs:47`) then walks *every* phrase and seed in the course (`synthesis-job.cjs:354-357`) and, for each one not already covered by a whole take, resolves its chunks against the segment index and splices. Each successful splice is a fresh `mastered/{uuid}.mp3` and a fresh `course_audio` row (`:427-441`).

The multiplier is the entire point of the optimiser. Measured on the live DB for `cym_n_for_eng`: **4,997 practice phrases and 633 new LEGOs, against 19,853 human `course_audio` rows.** A recording script for that course is a few hundred phrases. Everything beyond those few hundred exists because chunks were cut out of slow-aligned takes and re-spliced.

Two further notes:

- **LEGO-level clips are not planned.** `planCandidates` at `synthesis-job.cjs:354-357` contains phrases and seeds only — never LEGOs. A LEGO gets a `course_audio` row only if (a) it was a direct-record item recorded whole, or (b) its text coincides with a phrase or seed text. Chunk segments live in the manifest and are splice inputs; they are not registered as course audio in their own right.
- **`presentation` is a valid slot** in `synthesis-job.cjs:94` and in the live `course_audio.role` check constraint, but `coverage.cjs:17` only reports `known/target1/target2`. **Explicit gap:** I found no code path in the voice engine that mints presentation clips from recorded takes; if presentation audio exists it is coming from somewhere outside this pipeline, and I did not trace it.

### 1.7 The pruning, and why whole-phrase mode confuses it

`getExistingHumanAudioTexts()` (`generate-recording-script.cjs:361`) reads *text* from `course_audio` and marks a LEGO covered if it appears as a subsequence of any recorded text (`:524-528`).

That inference — **"this text is recorded, therefore its LEGOs are extractable"** — holds only if the phrase's slow take exists and aligned. In a natural-only world it is false. The natural take registers a `course_audio` row (§1.6), the next script generation sees that row, and prunes every LEGO inside it from the universe — even though no segment was ever cut and nothing downstream can splice those LEGOs into any other phrase.

Net effect: **the second script would be silently shortened, and the course would be permanently short of audio with no error anywhere.** This is the single most dangerous interaction in the request. Note it is latent today too — the pruning is equally wrong for any phrase whose slow take failed alignment — but today that's a rare failure, not the mode's normal operation.

Timing detail: pruning keys off `course_audio`, which script-mode upload does not write (§1.4). So pruning only reflects a session **after** a synthesis job has run. Within a session, and between a session and its synthesis run, nothing is pruned.

---

## 2. What would need to change

Scoped for the recommended shape (§3): a `cadence` query parameter, not a fourth mode.

### 2.1 Server

| File | Location | Change |
|---|---|---|
| `services/production-api.cjs` | `:7484-7615` | Parse `?cadence=` (`both` default, `natural`). Guard the `cadence:'slow'` push at `:7546` and `:7586`. `estimatedMinutes` at `:7599` follows from `items.length` and needs no change. |
| `services/production-api.cjs` | `:7601-7608` | Echo the resolved `cadence` in the response so the client does not have to infer it. |

No change to `generate-recording-script.cjs` — it never emitted cadences.

### 2.2 Client

| File | Location | Change |
|---|---|---|
| `src/composables/useAutocueState.js` | `:686-691` | Add `cadence` to the `URLSearchParams`; carry the chosen value on `state`. |
| `src/composables/useAutocueState.js` | `:705-711` | Store the echoed `cadence` in `state.scriptInfo`. |
| `src/components/production/autocue/AutocueStudio.vue` | `:82-86` | The confirmation copy — *"Each phrase appears twice…"* — is factually wrong in natural-only mode and must branch. |
| `src/components/production/autocue/AutocueStudio.vue` | `:115-119` | The `Slow Pass`/`Natural Speed` header is already driven by `currentPhrase?.cadence`; correct as-is. |
| `src/components/production/autocue/ModeSelector.vue` | `:14-20` | Mode 1's feature list advertises "Pass 2: Slow with gaps". Needs a second entry point or reworded copy — see §3 for which. |
| `src/views/RecordRoom.vue` | `:375-381` | The preview fetch builds its own param set; must pass the same `cadence` or the recordist is quoted double the session length they will actually read. |

**No change required** to `TeleprompterDisplay.vue`, `PhraseCard.vue` or `phraseChunks.js`. `show-gaps` is already `phrase.cadence === 'slow'` (`TeleprompterDisplay.vue:21`), so natural-only items simply never draw gaps. This is the part of the request that is genuinely free.

### 2.3 The recorder's silence tolerance — an explicit gap

`useContinuousRecorder.setExpectedChunks()` (`useContinuousRecorder.ts:286-290`) and the chunk-aware VAD tolerance (`useVAD.ts:320-352`, `interChunkSilenceDuration: 2500` vs `silenceDuration: 800`) exist **in the working tree only** and are **not yet committed** — `git show HEAD` has neither. More to the point, `legoChunkCount` is imported at `AutocueStudio.vue:244` and **never called**, and `setExpectedChunks` is exported but has **no caller anywhere in `src/`**.

So as the tree stands, `expectedChunks` never leaves its default of 1 and the chunk-aware tolerance is dead code. **I am reporting this as a finding, not fixing it** — it is in flight and belongs to whoever is holding that branch.

Consequence for this scoping: natural-only mode wants a flat 800 ms tolerance and the LEGO-count wiring is irrelevant to it. If the whole-phrase option ships before that wiring lands, it ships correct by accident. If it ships after, whoever wires `setExpectedChunks` must pass 1 for natural items — which `legoChunkCount()` already does *not* do (it returns the real chunk count for any phrase carrying a chunk map, regardless of cadence). That's a live trap worth naming now.

### 2.4 Voice engine

No code change is *required* — the engine already handles a missing slow take, at `synthesis-job.cjs:241-246`: it logs `'no slow take uploaded — cannot align without pause boundaries'` and increments `progress.failed`. In natural-only mode that fires for **every phrase**, and a job report reading "0 segments, N alignment failures" is technically honest but reads like a catastrophe rather than a design choice.

Changes worth making if the mode ships:

| File | Change |
|---|---|
| `services/voice-engine/synthesis-job.cjs:215` | `groupsToAlign` already filters on `chunksString && (slow \|\| natural)`; a natural-only group should be classified as *intentionally unalignable*, not failed. |
| `services/voice-engine/coverage.cjs:135-150` | Add a "recorded whole, not spliceable" count so the gap is visible rather than hidden inside `alignmentFailures`. |
| `tools/recording-optimizer/generate-recording-script.cjs:361,520-533` | **The pruning fix (§1.7) is the one non-optional engine change.** Pruning must only credit a text whose chunks are actually in the segment manifest, not merely present in `course_audio`. |

### 2.5 DB

**No schema change needed.** Verified against the live database:

- `recording_provenance` already carries cadence inside `quality_notes` JSON; a natural-only session just never writes a `cadence: 'slow'` row. No DDL.
- `course_audio`'s unique key is `(course_code, text_normalized, language, role, voice_id)`. One whole take, one row. No DDL.
- `audio_flags` is `(id, audio_uuid, course_code, status, reason, flagged_by, created_at, resolved_at, regen_count)` with a unique constraint on `(audio_uuid, course_code)` and **no foreign key to `course_audio`**. So it *can* key a script-mode take by the server-minted UUID — nothing structural stops alignment failures or whole-take QA from being flagged there today. Nothing currently does.

---

## 3. Size, complexity, recommendation

### Size: **small to build, large to get right.**

The build is genuinely small — roughly one server conditional, one client param, two copy strings, one preview fetch. Call it half a day including tests. The teleprompter needs nothing.

The complexity is not in the diff. It is that **the slow pass is not a chore attached to the recording, it is the mechanism by which a few hundred recordings become a few thousand.** Removing it does not make the session cheaper per phrase; it changes what a session *produces*, from "N phrases plus the chunk inventory to build thousands more" to "N phrases". For `cym_n_for_eng` that is the difference between 19,853 clips and a few hundred.

### Risks, specific

1. **Pruning corruption (§1.7) — the serious one.** Natural-only takes register `course_audio` rows; the next script generation credits their LEGOs as spliceable and prunes them; the recordist is handed a shortened script; the LEGOs are never recorded by anyone. Silent, cumulative, and it worsens with each session. **This must be fixed before the mode is offered, not after.**
2. **Alignment failure floods the manifest.** Every phrase logs `'no slow take'` into the S3 manifest and the coverage report. Cosmetic, but it destroys the signal value of `alignmentFailures` for courses that *are* doing chunked recording.
3. **Mixed-mode courses.** Nothing prevents phrase A being recorded chunked and phrase B whole. That is fine mechanically — `alignTakePair` is per-group — but coverage reporting has no vocabulary for "this course is 40% spliceable", and a recordist swapping modes mid-campaign will produce a course nobody can reason about.
4. **The recordist cannot tell what they cost.** The confirmation screen shows item counts and minutes. It shows nothing about downstream coverage. Someone choosing natural-only to save an hour has no way to know they just removed several thousand clips from the course.
5. **Irreversibility asymmetry.** Re-recording later is possible — supersede logic at `synthesis-job.cjs:195-205` handles it — but it means getting the speaker back. For a minority-language course with one available native speaker, that is the expensive kind of mistake.

### Cheaper framing — recommendation

**Ship `?cadence=natural` on `/recording-script`. Do not build a fourth mode.**

- **Better** — it is the same recording experience the recordist already knows, with the second read removed. No new screen to learn, no new state machine, no new review path. The gap-marker logic keys off `cadence` and needs no touching, so the studio behaves correctly with zero UI work.
- **Simpler** — one query parameter threaded through three call sites, versus a mode card, a mode branch in `selectMode`, and a fourth path through `useAutocueState`. `maxSeed`, `role` and `full` are already precedent for exactly this shape; `cadence` sits alongside them.
- **Cheaper** — no DDL, no migration, no new endpoint, no new component. The parameter is also composable with `maxSeed` and `role` for free, which a mode is not.

Two conditions on that recommendation, and I would not ship without them:

1. **Fix the pruning inference first** (§1.7). Without it the feature quietly corrupts every subsequent script for the same course. This is the only part of the work that is not small.
2. **Put the cost on the confirmation screen.** One line, honest: whole-phrase-only records these N phrases and nothing else; the chunked pass is what produces the other thousands. That turns an invisible trade into a visible one, which is all it needs to be.

A **per-phrase override** is the option I would not take. It multiplies the state without removing the tedium — the recordist's complaint is systemic, not about particular phrases — and it makes coverage reporting genuinely unanswerable.

**Worth putting to Kai before anyone builds:** is the ask "I don't want to read everything twice", or is it "the slow read feels unnatural and I think it's hurting the takes"? Those have different answers. The first is the query parameter above. The second is a tuning problem in `align.cjs` — `SILENCE_MIN_MS` is 150 ms and the instruction asks for ~200 ms pauses, which is a tight margin — and would be solved by making the slow pass *less* slow rather than by deleting it.

---

## Explicit gaps

- **Presentation clips.** I found no path in the voice engine that mints `role='presentation'` audio from recorded takes. `presentation` is a valid slot in `synthesis-job.cjs:94` and in the live `course_audio` role constraint, but `coverage.cjs` does not report it and no planner targets it. I did not trace where presentation audio actually comes from — outside this pipeline, and outside this scoping.
- **The uncommitted VAD work** (§2.3) is in the working tree of branch `fix/fra-known-repoint-2026-08-09` and belongs to another session. I read it but have not verified its intended final wiring, so my note that `setExpectedChunks` has no caller describes the tree as it stands right now, not necessarily as it is meant to land.
- **No live drive.** This is a static read of the code plus direct DB introspection of table shapes and counts. I did not run a recording session, a synthesis job, or the aligner.
