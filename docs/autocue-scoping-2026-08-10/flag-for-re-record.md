# Autocue scoping — FLAG FOR RE-RECORD

Scoping only, 2026-08-10. Read-only trace against the code at `fix/fra-known-repoint-2026-08-09`.
Every claim below carries a file:line. Where I could not verify something I say so under EXPLICIT GAPS.

**The headline.** There are three flagging systems in this repo and none of them connect a recorder's
"that take was bad" to a queue that asks for the take again. But the hardest half of the loop —
a new take superseding an old one — is already built and working in the voice engine. That inverts
the usual answer: this is a SMALL feature, because the receiving end exists in a place nobody has
pointed the flag at yet.

---

## 1. CURRENT BEHAVIOUR

### 1.1 Three tables, three unrelated lives

| Table | Written by | Read by | What it actually means |
|---|---|---|---|
| `sample_flags` | `updateSampleFlag` `services/supabase-client.cjs:735`, `updateRecordingStatus` `:1534` | `getRecordingQueue` `services/supabase-client.cjs:1453` | The HUMAN recording queue |
| `audio_flags` | `upsertAudioFlag` `services/supabase-client.cjs:1284`, phase8 `services/phases/phase8-audio-v13.cjs:4324` and `:4332` | phase8 `flaggedOnly` regen `services/phases/phase8-audio-v13.cjs:2669` | The TTS RE-GENERATION queue |
| `recording_provenance` | upload handler `services/production-api.cjs` ~`:4614` onwards, via `buildProvenanceContext` `services/recording-upload-helpers.cjs:94` | `fetchProvenanceRows` `services/voice-engine/provenance-adapter.cjs:70` | The take ledger the voice engine splices from |

Real column shapes, read from the live DB with `psql` against `.env.psql`:

- `audio_flags` — `id, audio_uuid text NOT NULL, course_code text NOT NULL, status text default 'flagged', reason, flagged_by default 'qa', created_at, resolved_at, regen_count int default 0`. Unique on `(audio_uuid, course_code)`.
- `sample_flags` — `id, audio_uuid text NOT NULL, course_code text NOT NULL, status text default 'pending', notes, flagged_by, flagged_at, context jsonb, history jsonb default '[]', created_at, updated_at`. Unique on `(audio_uuid, course_code)`. A CHECK constraint pins `status` to thirteen values including `flagged_human_needed`, `in_recording`, `needs_review`, `recorded`, `approved`, `rejected`.
- `recording_provenance` — keyed on `audio_uuid` PK, with `recorded_by, recorded_at, quality_notes text, retake_count int default 0` and speaker/device columns. **No course column, no phrase column, no cadence column.** All of that rides as JSON inside `quality_notes` — that is stated as the design in `services/voice-engine/provenance-adapter.cjs:5`.

The `status` CHECK on `sample_flags` matters for this feature: `flagged_human_needed` is already a legal, named state meaning "a human must record this". Nothing in the Autocue UI ever writes it.

### 1.2 Every flag surface in `services/production-api.cjs`, and who consumes it

| Endpoint | Line | Table | Front-end caller |
|---|---|---|---|
| `GET /:courseCode/flags` | 2637 | `sample_flags` read | `src/stores/production.js:398` into `sampleFlags`, marked "Legacy - deprecated" at `:76`. **No component reads `sampleFlags`.** |
| `POST /:courseCode/flags/update` | 2672 | `sample_flags` upsert | **No caller anywhere in `src/`.** |
| `POST /:courseCode/flags/delete` | 3169 | `sample_flags` delete | **No caller.** Sits under the banner comment "LEGACY FLAGS (old sample_flags table - keep for backwards compat)" at `services/production-api.cjs:3165`. |
| `POST /:courseCode/flags/bulk-update` | 3200 | `sample_flags` | `src/stores/production.js:570` in `bulkUpdateFlags` — **and no component calls `bulkUpdateFlags`.** |
| `GET /:courseCode/audio-flags` | 2728 | `audio_flags` | `src/stores/production.js:405` and the direct-Supabase twin `getAudioFlags` in `src/services/supabase.js:347`, called at `src/stores/production.js:363`. Lands in `audioFlags`, which **no component reads**. |
| `POST /:courseCode/audio-flags` | 2867 | `audio_flags` upsert | `src/stores/production.js:537` inside a function confusingly named `updateSampleFlag` — it writes `audio_flags`, not `sample_flags`. **No component calls it.** |
| `POST /:courseCode/audio-flags/:audioUuid/resolve` | 2903 | `audio_flags` | **No front-end caller.** |
| `DELETE /:courseCode/audio-flags/:audioUuid` | 2929 | `audio_flags` | **No front-end caller.** |
| `POST /:courseCode/audio-flags/bulk-delete` | 2954 | `audio_flags` | **No front-end caller.** |
| `POST /:courseCode/audio-flags/delete-orphaned` | 2990 | `audio_flags`, cross-checked against `course_audio` | **No front-end caller.** |
| `GET /:courseCode/flagged-items` | 2748 | `audio_flags` joined to `course_audio` | **No front-end caller.** |

So: of eleven flag endpoints, **exactly zero have a live UI affordance that raises a flag**. Three are
fetched into store refs that no component then reads. The socket events `audio_flagged`,
`audio_flag_resolved`, `audio_flag_deleted` emitted at `services/production-api.cjs:2889`, `:2915`,
`:2941` have **no listener in `src/`**.

`audio_flags` is nevertheless a live, working queue — but it is fed from the SERVER side, not by a
person clicking a flag. `services/phases/phase8-audio-v13.cjs:4324` bumps `regen_count` on inline
regeneration, and gender-prep writes rows at `services/gender-prep-coordinator.cjs:490`. The read side
is real and has a real UI: `src/views/production/AudioPipeline.vue:68` "Regenerate {{n}} flagged",
driving `flaggedOnly` at `:1001` into the phase8 branch at `services/phases/phase8-audio-v13.cjs:2667`.
**That is a TTS re-voice loop, not a human re-record loop.**

`src/views/RecordingOptimizer.vue:255` renders "{{ flaggedPhrases.length }} need re-recording" over
`const flaggedPhrases = ref([])` at `:354`, with the comment "to be fetged from flags system". It is a
hard-coded empty placeholder. It always says zero.

`src/views/production/components/MissingAudio.vue` consumes no flag surface at all — its three fetches
are `/audio-pipeline/missing` `:523`, `/audio-pipeline/ungeneratable` `:571` and
`/audio-pipeline/orphan-legos` `:598`. It is a coverage view, not a flag view. The word "flag" appears
once, in a comment at `:379`.

### 1.3 `sample_flags` and `updateRecordingStatus` — and the script-mode skip

`updateRecordingStatus(audioUuid, courseCode, status, notes, claimedBy)` at
`services/supabase-client.cjs:1534` updates the `sample_flags` row for that uuid, appending to
`history`, and **inserts a fresh row if none exists** (`:1553` update branch, `:1573` insert branch).
That insert branch is important — it means the queue table does not require a pre-existing row.

The upload handler at `services/production-api.cjs:4597` calls it with `'needs_review'` — but only
when `!isScriptMode && !isPodMode`. The comment at `:4593` gives the reason verbatim: script-mode takes
have no `sample_flags` row because their identity is server-minted, and the insert "used to 500 the
upload AFTER the S3 PUT succeeded".

**Verified, and the coordinator's brief is right.** The consequence is sharper than "no status row":

1. Script-mode identity is minted at `services/production-api.cjs` where `audioId = crypto.randomUUID().toUpperCase()` for `isScriptMode`, and **no `course_audio` row is ever written** — the `course_audio` writes in that handler are all gated on `!isScriptMode` (the repoint at ~`:4520`) or on pod mode.
2. `getRecordingQueue` `services/supabase-client.cjs:1453` selects `sample_flags` rows in
   `['flagged_human_needed','in_recording','needs_review']`, then joins `course_audio` by
   `id IN (audio_uuids)` at `:1487` to fetch `text, language, role, duration_ms, voice_id`.
3. So even if you wrote a `sample_flags` row for a script-mode take today, the queue would return it
   with **`text: ''`, `role: ''`, `voiceId: ''`** — the `audio?.text || ''` fallbacks at `:1500`.
   The item would appear in Autocue's regeneration list as a blank card.

That join is the single real blocker for reusing the existing queue, and it is about eight lines of code.

### 1.4 Does the regeneration queue feed off flags? YES — this is the crux

`GET /api/production/:courseCode/recording/queue` `services/production-api.cjs:4783` →
`getRecordingQueue` `services/supabase-client.cjs:1453` → `sample_flags` filtered to
`flagged_human_needed | in_recording | needs_review`.

And Autocue already drinks from it: `src/composables/useAutocueState.js:774` fetches
`/api/production/${courseCode}/recording/queue` inside `loadCourse()` and maps `queueData.items` into
`state.phrases` at `:781`, which is exactly the shape the teleprompter renders.

`POST /recording/claim` `services/production-api.cjs:4810` moves the row to `in_recording`;
`POST /recording/release` `:4864` moves it back to `flagged_human_needed`. Both go through
`updateRecordingStatus`.

**So a flag raised in Autocue absolutely WOULD land in a re-record queue that Autocue already reads —
provided it is written to `sample_flags` with status `flagged_human_needed`.** The pipe is laid; nobody
has connected a tap to it. That is why my size verdict below is small rather than large.

### 1.5 What `align.cjs` means by "flagged for re-record"

The phrase appears exactly once, in the module header comment at `services/voice-engine/align.cjs:19`:
"If neither take aligns, the phrase is flagged for re-record — we never guess a chunk map (chunk-count
mismatch is the QA gate)."

**It writes nothing.** `alignTakePair` at `:212` returns `{ ok: false, failure: { stage: 'slow-align', ... } }`
at `:220`. No DB write, no socket emit, not even a logger line inside `align.cjs`.

The one caller is `services/voice-engine/synthesis-job.cjs:35`. At `:259` it handles `!aligned.ok` by
pushing onto an in-memory `alignFailures` array and calling
`segmentStore.recordAlignmentFailure(manifest, {...})` at `:262`. That function
(`services/voice-engine/segment-store.cjs:168`) does one thing: `manifest.alignmentFailures.push({...})`.
The manifest is an S3 JSON blob saved by `saveManifest`. **Nothing reaches Postgres.**

There is exactly one place a human ever sees it. `services/voice-engine/coverage.cjs:105` reads
`manifest.alignmentFailures.length` and returns it as a **count** at `:132`, and
`src/views/production/SynthesisStudio.vue:40` renders:

> "{{n}} recordings couldn't be lined up automatically — re-record in the Record Room."

That link at `:42` goes to `/record/${courseCode}` with **no phrase identity attached**. The machine
knows exactly which phrases failed — the manifest holds `phraseText`, `expectedCount`, `detectedCount`
— and it throws all of that away at the UI boundary, handing the recorder a number and a door.

This is the most valuable single finding in the scope: **a re-record flag raised by the aligner already
exists, is already correct, and is already surfaced — it just isn't actionable.**

### 1.6 The review phase today

`state.currentPhase === 'review'` renders `SessionReview.vue` from
`src/components/production/autocue/AutocueStudio.vue:222`, wired `@approve="approveSegment"` and
`@reject="rejectSegment"` at `:228`–`:229`. `SegmentCard.vue:56` emits `['play','redo','approve']`, and
`SessionReview.vue:49` maps `@redo` onto `reject`. So the button already reads REDO to the user.

Where does reject go? `finalizeSession()` `src/composables/useAutocueState.js:536` logs the rejected set
at `:538`, filters to `state.approvedSegments` at `:541`, uploads those, and then calls `resetSession()`
at `:613`. **Rejected takes are dropped on the floor, in memory, with no record anywhere.** And note
`:559` — `finalizeSession` posts `uuid: phrase.id`, which is the regeneration-mode path; script-mode
takes are uploaded eagerly by the background uploader, not here.

### 1.7 Supersession already works

This is the part that changes the size verdict. `services/voice-engine/synthesis-job.cjs:21` states the
contract: "RE-RECORDS SUPERSEDE (provenance contract: latest take per (phrase, cadence))".
`groupTakesByPhrase` `services/voice-engine/provenance-adapter.cjs:102` keys by
`normalizeForAudio(phraseText)` and keeps the latest per cadence. `synthesis-job.cjs:200`–`:204` builds
`supersededTakeIds`, and `pruneSupersededSegments` at `:230` deletes the old chunk segments so they get
re-cut.

**So "new take supersedes the old" needs no work at all for script mode.** Record the phrase again, the
engine takes the newer take and prunes the older one's segments. The whole third leg of the loop is done.

Likewise the script generator can already avoid re-asking for recorded phrases:
`tools/recording-optimizer/generate-recording-script.cjs:515` prunes LEGOs already coverable by existing
human recordings, and `services/production-api.cjs:7489` makes that the DEFAULT
(`excludeRecorded = req.query.full !== 'true'`). The mechanism for "serve me the gap, not the whole
course" is live.

---

## 2. WHAT WOULD NEED TO CHANGE

Scoped as the smallest end-to-end loop, then the increments.

### 2.1 DB

No new table. No new columns, on one condition — that the flag for a script-mode take is keyed on
something `sample_flags` will accept.

`sample_flags.audio_uuid` is plain `text`, not a UUID type and not FK-constrained (verified in the
`\d sample_flags` output above — no foreign keys listed). So the S3-minted take uuid from
`services/production-api.cjs` and the `recording_provenance.audio_uuid` are **the same value** and both
satisfy the column. Identity is not a blocker.

`sample_flags.context jsonb` is the right home for phrase identity on script-mode rows — it is unused by
`getRecordingQueue` today and needs no migration.

For a CHUNK rather than a whole take there is **no identity at all** and this is the real gap. Chunks
exist only as manifest segment entries minted server-side by `segment-store.cjs#mintSegmentId` after
alignment; the client has never seen them, and `AutocueStudio.onSegmentCaptured` stores one blob per
script item. A chunk-level flag would have to be expressed as `(take uuid, chunk index)` or
`(phrase text, chunk text)` and stored in `context`. **My recommendation is to not build chunk-level
flagging in v1** — see §4.

### 2.2 Server

| File | Change |
|---|---|
| `services/supabase-client.cjs:1487` | `getRecordingQueue`: when the `course_audio` join misses, fall back to `flag.context` for `text` / `role` / `cadence` / `seed` so script-mode flags render. ~10 lines. This is the one genuine blocker. |
| `services/production-api.cjs` new route | `POST /api/production/:courseCode/recording/flag` — body `{ uuid, reason, flaggedBy, context }`, calls `updateRecordingStatus(uuid, courseCode, 'flagged_human_needed', reason, flaggedBy)` plus a `context` write. Could equally be a thin wrapper reusing `/flags/update` `:2672`, which already writes `sample_flags` and already has no callers — repurposing the dead endpoint is cheaper than adding a twelfth one. |
| `services/production-api.cjs:4597` | Optional: let script mode write its `sample_flags` row too, so a take has a lifecycle from the start. **Not required for v1** and it reintroduces the failure the comment at `:4593` was written to prevent. Leave it alone. |
| `services/voice-engine/synthesis-job.cjs:262` | Where `recordAlignmentFailure` is called, ALSO write a `sample_flags` row: status `flagged_human_needed`, reason "chunk count mismatch: expected N, detected M", context carrying `phraseText` and `chunksString`. ~8 lines, and it converts §1.5's dead-end into the machine half of the feature. |
| `services/voice-engine/coverage.cjs:132` | Return the alignment failure LIST alongside the count so the UI can name the phrases. |

### 2.3 Front-end

| File | Change |
|---|---|
| `src/components/production/autocue/review/SegmentCard.vue:41` | The REDO button exists. Give it a second behaviour in script mode: instead of only mutating the in-memory rejected set, POST the flag. |
| `src/composables/useAutocueState.js:536` | `finalizeSession`: for each id in `state.rejectedSegments`, POST the flag before `resetSession()` at `:613`. Today those ids are logged at `:538` and discarded. |
| `src/composables/useAudioUpload.ts:153` | **Required.** `doUpload` returns `response.json()` at `:220`, but `processQueue` discards it — `await doUpload(item)` at `:153` keeps no result, and `onUploadedCallback(item.itemIndex)` at `:177` passes back only the index. So the client never learns the server-minted uuid of a script-mode take. Capture the response and pass the uuid through the callback. ~4 lines. |
| `src/components/production/autocue/teleprompter/` | Mid-session flag: a "flag this take" control on the phrase card so the recorder does not have to wait for review. Depends on the `useAudioUpload.ts` change above. |
| `src/views/production/SynthesisStudio.vue:42` | Change the bare Record Room link into a link that carries the failed phrases, once `coverage.cjs` returns the list. |
| `src/views/RecordingOptimizer.vue:354` | Either wire `flaggedPhrases` to `/recording/queue` or delete the panel. It currently lies by always showing zero. |
| `src/stores/production.js:533` | Rename `updateSampleFlag` — it writes `audio_flags`. The name has already cost one reader an hour. |

### 2.4 The two users — one feature or two?

**One feature, two entry points, and they should share the write.**

- The RECORDER, mid-session or at review, flags their own take. They know the take's identity because they just made it. Entry points: the teleprompter card and `SegmentCard`'s existing REDO button.
- The REVIEWER, later, from the production console. They are looking at a `course_audio` row or a spliced clip and want the human to do it again. Entry point: whatever audio review surface exists — and note **the reviewer has no flag button anywhere today** (§1.2), so this half is genuinely new UI.

Both should write `sample_flags` with `flagged_human_needed`. That is the whole point of the design:
one queue, and Autocue already reads it.

The divergence is only in identity resolution. The recorder holds a script-mode take uuid with no
`course_audio` row; the reviewer holds a `course_audio` id. `getRecordingQueue`'s join handles the
second already and needs the §2.2 fallback for the first. One function, two paths through it.

**Do not route the reviewer at `audio_flags`.** That table means "re-voice this with TTS" and feeds
phase8 at `services/phases/phase8-audio-v13.cjs:2667`. A reviewer flagging a human clip into `audio_flags`
would get it silently re-synthesised by a machine — the opposite of the request.

---

## 3. SIZE AND COMPLEXITY

### SMALL — for the recorder-flags-own-take loop. MEDIUM for the full feature including the reviewer.

The reasoning, plainly: three of the four things this feature needs already exist and work.

1. A queue table with a `flagged_human_needed` state — exists, `sample_flags`.
2. A queue endpoint that reads it — exists, `services/production-api.cjs:4783`.
3. Autocue reading that queue and rendering it as a session — exists,
   `src/composables/useAutocueState.js:774`.
4. New take supersedes old — exists, `services/voice-engine/synthesis-job.cjs:200`.

What is missing is a WRITE. The feature is one endpoint, one button binding, and the join fallback in
`getRecordingQueue`. On the evidence above I would put the recorder loop at **under a day**, and the
aligner auto-flag at `synthesis-job.cjs:262` at **an hour**, because the failure data is already
assembled at that line and thrown away.

The reviewer half is medium because it is net-new UI with no existing surface to extend — every flag
endpoint in §1.2 has zero callers, so there is no console to hang a button on. That is a UI build, not
a plumbing build.

### Specific risks

**R1 — Two tables named almost identically, one already wired to spend money.** `audio_flags` is the
TTS regeneration queue and `AudioPipeline.vue:68` will re-voice everything in it. If a re-record flag
lands there by mistake, a human take gets replaced by synthesis. The store function that writes
`audio_flags` is literally called `updateSampleFlag` (`src/stores/production.js:533`). This is the
highest-probability way to get this feature wrong, and it collides with the make-before-break rule in
`CLAUDE.md`. Mitigation: rename the store function before writing any new code, and never let a
re-record path touch `audio_flags`.

**R2 — The blank-card failure.** Flag a script-mode take today and it appears in the Autocue queue with
empty text (§1.3). Silent, not an error — the recorder gets an unreadable card. The `getRecordingQueue`
fallback must land in the same change as the first flag write, not after it.

**R3 — Identity for a chunk does not exist client-side.** `AutocueStudio.onSegmentCaptured` holds one
blob per script item; LEGO chunks are minted server-side post-alignment. Any promise of chunk-level
flagging is a promise to invent an identity scheme. Keep it out of v1.

**R4 — The `sample_flags` status CHECK constraint.** Thirteen allowed values, enforced in the DB. A
plausible-looking new status like `needs_rerecord` will fail the insert at runtime, not at review.
Reuse `flagged_human_needed`.

**R5 — Re-serving the phrase depends on text matching, not ids.** Supersession keys on
`normalizeForAudio(phraseText)` (`provenance-adapter.cjs:102`) and the script generator's
already-recorded pruning is text-based too (`generate-recording-script.cjs:515`). If a re-record session
delivers a take whose text differs by so much as normalisation, it will not supersede — it will sit
beside the old one and the aligner will keep the newer of two unrelated groups. Any re-record flow must
carry the phrase text through verbatim.

**R6 — Nobody notices the flag.** Since no UI reads any flag surface today, a flag written now is
invisible except in Autocue's regeneration mode. Without also fixing `RecordingOptimizer.vue:354` or
`SynthesisStudio.vue:42`, flags accumulate unseen. That is the same shape of failure as the audio-pass
queue rule in `CLAUDE.md` — a text edit that silently becomes backlog.

**R7 — Reviewer flags on spliced clips.** A spliced clip is assembled from chunks of several takes
(`synthesis-job.cjs:443` writes spliced provenance with `method: 'spliced'`). Flagging one for re-record
does not identify which SOURCE take was bad. The honest v1 behaviour is to flag the underlying phrase
take, not the splice.

---

## 4. RECOMMENDATION

**Better × simpler × cheaper: write the flag into `sample_flags` with status `flagged_human_needed`,
and change nothing else about the plumbing.**

Better, because it makes the aligner's existing QA gate actionable for the first time — the machine
already knows which phrases failed to align and currently discards that knowledge at the UI boundary.
Simpler, because it introduces no new table, no new state machine and no new queue; it points a tap at
a pipe that is already laid and already read by Autocue. Cheaper, because supersession, gap-only script
generation and the queue reader are all built — the marginal cost is one endpoint and one button
binding, and the maintenance cost is negative, since it retires a placeholder that currently lies to
the user.

### The smallest version that closes the loop end to end

Four changes. In dependency order:

1. **`getRecordingQueue` fallback** — `services/supabase-client.cjs:1487`. When the `course_audio` join
   misses, read `text`/`role`/`cadence` from `sample_flags.context`. Without this, everything else
   produces blank cards.
2. **One flag endpoint** — reuse `POST /:courseCode/flags/update` at
   `services/production-api.cjs:2672`, which already writes `sample_flags` and has zero callers, adding
   a `context` passthrough. No new surface area.
3. **Two writers.**
   - Human: bind the existing REDO button, `SegmentCard.vue:41`, and drain
     `state.rejectedSegments` in `finalizeSession` `useAutocueState.js:536` before reset.
   - Machine: at `synthesis-job.cjs:262`, alongside `recordAlignmentFailure`, write the same flag with
     reason "chunk count mismatch: expected N, detected M".
4. **Nothing for supersession.** Verified at `synthesis-job.cjs:200`. The re-recorded take wins and the
   old chunks are pruned automatically.

The loop then reads: flag raised in Autocue review or by the aligner → `sample_flags` row
`flagged_human_needed` → appears in Autocue regeneration mode via the queue Autocue already fetches →
recorder re-records → upload writes a fresh `recording_provenance` row → voice engine takes the later
take and prunes the older take's segments. End to end, using one new endpoint.

### What I would deliberately leave out of v1

- **Chunk-level flagging** (R3). No client-side identity exists. If a chunk is bad, the honest unit of
  repair is the phrase take, and re-recording one phrase is cheap.
- **The reviewer console** (§2.4). Real, wanted, but net-new UI with no host surface, and it is
  independently shippable after the recorder loop proves the queue.
- **Writing `sample_flags` at script-mode upload time** (§2.2). The comment at
  `services/production-api.cjs:4593` records a real production incident where this 500'd uploads after
  the S3 PUT. Leave it.

### One taste call for Tom

When a recorder hits REDO mid-session, should the phrase be re-served **immediately in the same
session**, or should it go to the queue for a later session? Immediate is what a recorder in flow
probably wants; queued is what the code makes nearly free. My read: **queue it, and additionally push
the item back onto `state.phrases` in the current session** — both, since the second is a local array
push and costs nothing.

---

## EXPLICIT GAPS — what I could not verify

1. ~~Does the client learn the server-minted uuid of a script-mode take?~~ **Closed — it does not.**
   `doUpload` returns the parsed response at `src/composables/useAudioUpload.ts:220`, but
   `processQueue` throws it away at `:153` and the callback at `:177` carries only `item.itemIndex`.
   Fix is four lines and is now listed in §2.3 rather than here.
2. **`sample_flags` FK constraints** — `\d sample_flags` listed no foreign keys, so I read
   `audio_uuid` as unconstrained text. I did not test an insert of a non-`course_audio` uuid against
   the live DB, since this was a read-only scope.
3. **Whether any flag endpoint has a caller outside `src/`** — another repo, a script, or a curl in
   someone's notes. I grepped this repo's `src/` only. `ssi-learning-app` was not searched.
4. **`services/voice-engine/router.cjs`** is mounted at `services/production-api.cjs:389`, so the
   engine is live, but I did not confirm any synthesis job has actually RUN against a real course —
   so I cannot say whether any `alignmentFailures` exist in production today, only that the code path
   is wired.
5. **No `supabase/schema.sql` in this checkout**, as the brief warned. All table shapes above come
   from live `psql` introspection via `.env.psql`, not from a committed schema.
