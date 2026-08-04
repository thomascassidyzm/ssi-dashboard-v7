# Re-render mechanism scout — fra_for_eng silent-stub clips (2026-08-04)

Read-only scout. No code written, no TTS rendered, no DB row mutated. Every claim carries a
`file:line` citation or a live query result. Commit base: `de2fd3dc`.

---

## 0. Headline

- **The non-pod equivalent of `generatePodAudio` is not one function — it is three inlined
  closures**, one per endpoint: `generateItem` (`/generate`), `regenerateItem`
  (`/regenerate-role`), and the inline body of `/regenerate-single`. None is exported; none
  returns a course_audio id to a caller outside its own request.
- **The right vehicle for this job is `POST /regenerate-role/:courseCode` with
  `{role, flaggedOnly:true}`** — it is the only path that re-renders EXISTING rows in bulk with
  a concurrency pool and retry rounds. Targeting the specific 542 broken ids goes through the
  `audio_flags` table.
- **Two live-fire hazards in that path**, both cited below: (1) `voiceProvider` defaults to
  `'azure'` if voice_config lacks a provider — an implicit Azure fallback that must be verified
  off, and (2) the path writes `voice_id: 'leo'` (bare) where `/generate` wrote `'xai_leo'`,
  silently re-keying every row it touches.
- **The missing duration guard has already been written — but it is UNCOMMITTED working-tree
  work in this checkout, not on `main` and not deployed.** See §4.

---

## 1. Live measurement of the damage (read-only queries, 2026-08-04)

`course_audio` for `fra_for_eng`: 48,843 rows. Rows with `duration_ms < 400`:

| role | voice_id | language | total rows | stub rows |
|------|----------|----------|-----------:|----------:|
| target2 | `xai_leo` | `fra` | 13,641 | **468** |
| known | `xai_eve` | `eng` | 13,060 | **72** |
| pod_explainer | `comp:leo` | `fr` | 813 | 2 |

Total `<400 ms`: **542**. Duration histogram: 144 ms ×380, 168 ms ×95, 192 ms ×54 (= 529 in the
stub band), plus 216/264/288/312/360/384 ms ×13 which are likely legitimate short words.
`created_at` day: 540 on 2026-08-03, 2 on 2026-06-15.

Stub rate climbs through the run, matching the degradation story:

| hour (UTC, 2026-08-03) | target2+known rows | stubs | rate |
|---|---:|---:|---:|
| 14 | 5,004 | 21 | 0.42% |
| 15 | 10,850 | 141 | 1.30% |
| 16 | 10,854 | 352 | 3.24% |

**Two corrections to the brief, from the live data:**
1. The broken `role=known` rows are **`xai_eve`, not leo** — `voices.known.voiceId = 'eve'` in
   voice_config. Only `target2` is leo. A re-render must reproduce each role's own voice.
2. Live counts are **468 target2 / 72 known**, not 567/~75. No rows created 2026-08-04, so
   nothing has been re-rendered since; the difference is a threshold/count-method difference in
   the original figure, not work already done. Flagging as a discrepancy rather than resolving it.

`file_size_bytes` is **NULL on all 542 stub rows** — the column exists on `course_audio` but the
render paths never populate it, so byte size cannot be used as a DB-side detector; `duration_ms`
is the only usable signal in the DB.

---

## 2. The three non-pod render paths (part 1)

`services/phases/phase8-audio-v13.cjs`, 5,929 lines. The pod path
(`generatePodAudio`, `phase8-audio-v13.cjs:5557-5661`, exported at `:5915`) is the only
render function exported and callable from a tool — which is exactly why
`tools/rescue-wrong-language-clips.cjs:43` can `require` it
(`const p8 = require('../services/phases/phase8-audio-v13.cjs')`) and call
`p8.generatePodAudio` (`rescue-wrong-language-clips.cjs:23-27` documents the method). **There is
no exported non-pod equivalent.** The three non-pod renderers:

### 2a. `generateItem` — `/generate/:courseCode` (fresh renders)
- Endpoint: `phase8-audio-v13.cjs:1644`. Closure: `const generateItem = async (item) => {…}` at
  **`:1933-2110`**. Signature: `(item) => Promise<{success, item, shared?, skippedHuman?}>`.
- Takes `item = {text, language, role, lego_id, phrase_id, voiceId, speed}` — `voiceId` is built
  at `:1710` as **`${provider}_${voiceId}`** → `"xai_leo"`, assigned per item at `:1818`.
- Does its own S3 upload (`:2065-2070`) and its own `masterAudio` (`:2056`), which is where
  `durationMs` comes from. Upserts and `.select('id')` (`:2074-2098`) — the id is used only
  internally for presentation binding (`:1895` `bindPresentationAudio`); the closure returns
  `{success, item}`, **not the id**.
- Guards it does have: precious-human guard (`:1936-1951`), cross-course S3 sharing
  (`:1955-1998`).

### 2b. `regenerateItem` — `/regenerate-role/:courseCode` (**the re-render mechanism**)
- Endpoint: `phase8-audio-v13.cjs:2243`. Closure: `const regenerateItem = async (item) => {…}` at
  **`:2457-2534`**. Signature: `(item) => Promise<{success:true, item, audioId}>` where `audioId`
  is the new **S3 UUID**, not the course_audio id.
- `item` is a row already read from `course_audio`
  (`id, text, text_normalized, language, role, voice_id, s3_key, origin` — `:2312`/`:2331`).
- It **UPDATEs in place** (`:2518-2528`) — same `course_audio.id`, new `s3_key`/`duration_ms`/
  `voice_id`/`word_boundaries`. It does NOT upsert and cannot hit the unique constraint.
- Uploads to S3 itself (`:2508-2513`); computes `durationMs` via `masterAudio` (`:2503`).

### 2c. `/regenerate-single/:courseCode/:audioUuid` (one clip, no closure)
- `phase8-audio-v13.cjs:3740-3915`. Same recipe inline: lookup row (`:3746`), human guard
  (`:3763`), voice resolve (`:3783-3786`), TTS (`:3831-3853`), master (`:3856`), S3
  (`:3860-3868`), in-place UPDATE (`:3871-3881`), then creates/bumps an `audio_flags` row
  (`:3884-3906`). Returns `{success, audioUuid, newS3Key, durationMs, regenCount}`.
- No concurrency — one HTTP call per clip. 542 clips = 542 calls, but each is independently
  restartable.

---

## 3. Full call chain for one clip (part 2), on `/regenerate-role`

```
POST /regenerate-role/fra_for_eng  {role:'target2', flaggedOnly:true}      :2243
 ├ human-voice-course hard skip                                            :2246-2249
 ├ read courses row → voice_config                                         :2265-2278
 ├ select course_audio rows (flagged ids, batched 100) OR whole role       :2311-2343
 ├ EXCLUDE pod-linked ids (listening_pod_sentences)                        :2358-2377
 ├ EXCLUDE origin='human'                                                  :2381-2392
 ├ language = known_lang for known/presentation/…, else target_lang        :2395-2397
 ├ gender map load (fra IS in GENDERED_LANGUAGES → Haiku expansions)       :2400-2405
 └ worker pool, CONCURRENCY workers, RETRY_ROUNDS=2                        :2543-2597
     └ regenerateItem(item)                                                :2457
         ├ gender expansion of item.text → textForTTS                      :2461-2476
         ├ ttsService.generateWithRetry(textForTTS,'xai',{                 :2494-2499
         │     apiKey: process.env.XAI_API_KEY,
         │     voiceId,                       // 'leo'  ← bare, see 3c
         │     language: toBcp47(language)})  // 'fra' → BCP-47
         ├ masterAudio(raw, textForTTS) → {buffer, durationMs}             :2503  (fn at :924)
         ├ audioId = uuidv4().toUpperCase(); s3Key = `mastered/${id}.mp3`  :2505-2506
         ├ s3.send(PutObjectCommand{Bucket:S3_BUCKET, Key:s3Key})          :2508-2513
         └ supabase.from('course_audio').update({voice_id, origin:'tts',
              s3_key, duration_ms, word_boundaries}).eq('id', item.id)     :2518-2528
 └ on success>0: bumpCourseVersion(patch) + bumpCourseRevalidation         :2678-2683
```

**S3 key convention**: `mastered/${uuidv4().toUpperCase()}.mp3` — identical at
`:2059` (`/generate`), `:2506` (`/regenerate-role`), `:3857` (`/regenerate-single`),
`:5622` (pods). Bucket: `S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'`
(`:108`); `.env` sets `S3_BUCKET=ssi-audio-stage`, `AWS_REGION=eu-west-1`. S3 client with
bounded keep-alive pool (16 sockets) and `maxAttempts:6` at `:82-90`.

**Upsert / onConflict** — only the *insert* paths use it. Both use exactly the
`unique_course_audio_per_voice` tuple:

```js
.upsert({ course_code, text, text_normalized: normalizeForAudio(item.text), language, role,
          voice_id, origin:'tts', s3_key, duration_ms, lego_id, word_boundaries },
        { onConflict: 'course_code,text_normalized,language,role,voice_id' }).select('id').single()
```
`/generate` `:2074-2098`; sibling-reuse variant `:1970-1993`; pods `:5641-5659`.
`/regenerate-role` and `/regenerate-single` use **`.update().eq('id',…)`**, not upsert — so
the unique key is never re-negotiated, and the row id is preserved.

### 3c. HAZARD — bare vs prefixed `voice_id`
`/generate` writes `voice_id = "xai_leo"` (composed at `:1710`). `/regenerate-role` resolves
`const voiceId = voiceSettings.voiceId || voiceConfig[role]` (`:2277`) → **`"leo"`**, and writes
that bare value back into the row (`:2520`). Same at `/regenerate-single` `:3785` → `:3874`, and
`/regenerate-presentation` `:3964`.

Consequence: re-rendering the 468 target2 stubs via `/regenerate-role` flips those rows from
`xai_leo` to `leo`, which (a) breaks the cross-course sharing lookup in `/generate`
(`:1963` matches on `voice_id` exactly), (b) breaks the precious-human key check
(`humanRowAtAudioKey`, `:211-249`), and (c) splits the course's target2 inventory across two
voice_id spellings — the live table already shows this scar tissue (`known|leo|eng` 50 rows and
`known|eve|en-GB` 67 rows sitting alongside the 13,060 `known|xai_eve` rows). It will not throw;
it will just quietly re-key whatever it touches. **This needs a decision before the run**, not
after.

### 3d. HAZARD — id-stable update vs device cache
`/regenerate-role` keeps the `course_audio.id` and only swaps `s3_key`. The rescue tool's own
header argues the opposite discipline for pods: delete the row first so a NEW id is minted,
"because devices have the bad bytes cached BY ID (IndexedDB + SW CacheFirst, 1-year headers), so
refreshing bytes under the old id would never heal them"
(`tools/rescue-wrong-language-clips.cjs:15-24`). Whether that reasoning applies to non-pod
course clips depends on the player's cache key (audio id vs S3 URL) — **I did not verify the
player side; explicit GAP.** `/regenerate-role` does bump both course version and the
revalidation key on success (`:2678-2683`), which is the metadata half of the fix.

---

## 4. Config (part 3) — actual live values

`courses` row `fra_for_eng`: `known_lang = eng`, `target_lang = fra`.
`voice_config.voices` (live, `updatedAt: 2026-08-03T13:46:36.920Z`):

| role | name | voiceId | provider | language | speed |
|------|------|---------|----------|----------|-------|
| known | Eve | **`eve`** | **`xai`** | `en` | 1 |
| target1 | Eve | `eve` | `xai` | `fr` | 1 |
| target2 | **Leo** | **`leo`** | **`xai`** | `fr` | 1 |
| presentation | Eve | `eve` | `xai` | `en` | 1 |

Also present: `voice_config.providers` still declares only `azure` and `elevenlabs` as
"enabled" — that block is decorative, no code reads it (grep: no reader of
`voice_config.providers` in `services/`). `voice_config.target_speed = {global_speed:0.95,
belt_ramp:true}` is a player-side cadence setting, not a TTS parameter (xAI has no speed param —
`tts-service.cjs:434-436`, `phase8-audio-v13.cjs:2055-2058`).

**Voice resolution code**: there is no separate voice_config table — it is a JSONB column on
`courses`. Resolution is inlined per endpoint, not centralised:
`voiceConfig.voices?.[role]` at `:2276` (regenerate-role), `:3784` (regenerate-single),
`:4282` (generate-components), `:382` (copy bucket); `/generate` uses the nested-or-flat helper
`getVoiceForRole` at `:1705-1712`. `services/voice-config-service.cjs` exists but is a
dashboard-side CRUD/discovery helper — the render paths above do not require it.

**Language passed to xAI**: `toBcp47(language)` from `services/voice-discovery-service.cjs`
(imported `:38`), applied at `:2050`, `:2498`, `:3850`. For target2 the `language` variable is
`course.target_lang = 'fra'` (`:2395-2397`); for known it is `'eng'`. The DB `language` column on
the broken rows matches: `fra` for target2, `eng` for known.

**xAI invocation**: `services/tts-service.cjs:407-487` `generateXai(text, config)`.
POST `https://api.x.ai/v1/tts` (`:449`), body `{text, voice_id, language, output_format:{codec:'mp3',
sample_rate:24000, bit_rate:128000}}` (`:436-445`), `Authorization: Bearer ${apiKey}` from
`process.env.XAI_API_KEY` (set in `.env`). Returns `{audioBuffer, wordBoundaries: null}` —
**xAI never provides word boundaries** (`:405`), so a re-render nulls out any word_boundaries the
row had. 15,000-char request cap (`:421`). Explicit `language` is mandatory in practice: `'auto'`
only warns (`:427-432`), and the ita 2026-07-10 pilot showed auto → English phonology.

### Azure fallback — complete list
1. **`generatePodAudio` `phase8-audio-v13.cjs:5580-5607`** — the ONLY real provider fallback.
   `catch (primaryErr)` → if provider was xai, `pickAzureFallbackVoice(ctx, kind, language)`
   (`:5421-5450`, default map at `:5385-5400`, `fr-FR → fr-FR-DeniseNeural`) and re-renders on
   Azure. **Pod path only** — enabled by passing `ctx` (`:5847`). Not reachable from
   `/regenerate-role`, `/regenerate-single` or `/generate`.
2. **Implicit provider default `|| 'azure'`** — `:2278` (regenerate-role), `:3786`
   (regenerate-single), `:3965` (regenerate-presentation), `:4284` (generate-components),
   `:4478`, `:5580`, `:5698`. These are not error-path fallbacks: they fire when voice_config
   omits `provider`. **fra_for_eng sets `provider:'xai'` on all four roles, so none fires today** —
   but any voice_config edit that drops the field silently routes leo through Azure, where
   `voiceName:'leo'` is not a valid Azure voice and every clip fails. Cheap belt-and-braces:
   assert `voiceProvider === 'xai'` before the run.
3. `tools/render-take-g.cjs:14` documents that its own path has no fallback (no ctx passed).
4. No other provider-switching catch blocks in `services/` or `tools/` (grep for `fallback` +
   `azure|provider`).

**So: nothing on the non-pod re-render path can fall back to Azure.** No code needs disabling;
only the implicit `|| 'azure'` default needs guarding.

---

## 5. Concurrency, retry, and the missing guard (part 4)

**Concurrency.** `CONCURRENCY = parseInt(process.env.AUDIO_CONCURRENCY,10) || 20`
(`phase8-audio-v13.cjs:160`) — not set in `.env`, so **20**. `/regenerate-role` spawns
`min(CONCURRENCY, queue.length)` workers off a shared cursor (`:2549-2571`). Underneath, xAI is
separately capped: `XAI_MAX_CONCURRENT = process.env.XAI_TTS_CONCURRENCY || 4`
(`tts-service.cjs:52`), a semaphore held across the fetch (`:445`/`:485`). So the effective xAI
in-flight limit is **4**, with 20 phase8 workers queueing behind it.

**Retry.** Two layers:
- `generateWithRetry(text, provider, config, maxRetries = 3)` — `tts-service.cjs:650-693`.
  Exponential backoff with full jitter, `[0,1s]/[0,2s]/[0,4s]` (`:684-687`).
  `isRetriableTtsError` (`:527-552`): 4xx → fail fast, 5xx → retry, socket errors → retry,
  unknown shape → retry.
- `/regenerate-role` adds `RETRY_ROUNDS = 2` end-of-run passes over failed items with a
  `5000*round` ms breather (`:2586`), `phase8-audio-v13.cjs:2543-2603`.
- S3 upload retry: 3 attempts on the pod path (`:5626-5638`); **`/regenerate-role` has no S3
  retry loop** (`:2508-2513`) beyond the SDK's `maxAttempts:6`.

**Timeout**: `TTS_FETCH_TIMEOUT_MS = 90_000` via `AbortSignal.timeout` (`tts-service.cjs:51`,
applied `:451`).

**Where the guard was missing.** On `main` (`HEAD = de2fd3dc`), `generateXai`'s only check is
`if (!response.ok)` — an HTTP 200 with a 2,016-byte body is accepted, handed to `masterAudio`
(`phase8-audio-v13.cjs:924-968`), which normalises to −16 LUFS, runs the tail-defect repair, then
computes `duration_ms` **from the mastered file** (`:958-960`). That is the laundering step: the
DB row and the S3 object agree perfectly at 144 ms, so no consistency check anywhere can catch
it. `masterAudio` has **no minimum-duration assertion** — it only throws on a zero-length/corrupt
buffer, and only via ffmpeg failing. Nothing between the provider response and the DB write asks
whether the clip contains speech. Confirmed by grep: no `durationMs <`, `MIN_DURATION`, or
duration floor anywhere in `phase8-audio-v13.cjs`, `services/audio-processor.cjs`, or
`services/tts-service.cjs` at HEAD.

**The fix already exists — uncommitted.** `git diff services/tts-service.cjs` shows +145 lines
in this working tree, authored today, not on `main`, not stashed, not on any branch:
- `assertAudibleResponse(buffer, {provider, bytesPerSecond, text, voiceId})` — working tree
  `tts-service.cjs:105-118`; floor `TTS_MIN_AUDIO_MS = 250` (`:94`), justified from measured
  real xAI/leo French renders (456–576 ms) vs the 144–192 ms stub band. Throws with a `(503)`
  marker so `isRetriableTtsError` re-rolls it inside the existing budget.
- Wired at all three providers: xAI `:463-475`, ElevenLabs `:278-285`, Azure `:365-380`.
- Plus adaptive pacing: `recordXaiOutcome` / rolling 50-response window / 4% stub-rate trip →
  60 s cooldown held *inside* the slot (`:130-192`), explicitly "NEVER to route around xAI".

**GAP / decision:** that guard is only in this checkout's working tree. It is not committed, not
pushed, and therefore **not running on whatever host executes phase8**. Re-rendering the 542
clips before that lands would run through the exact code that produced them. I have not
committed it — it is another session's in-flight work and not mine to land.

**Phonology gate is OFF on this box.** `PHONO_GATE_ON` requires whisper-cli + model
(`tts-service.cjs:565`); `.env:33` sets `WHISPER_MODEL=/Users/tomcassidy/SSi/whisper-models/
ggml-small.bin` — a macOS path that does not exist on this Linux host, and no `whisper-cli` on
PATH. So non-English xAI renders here are unchecked for language drift (it logs one warning,
`:657-660`). Whichever host runs the re-render should be checked for the same.

---

## 6. Practical shape of the re-render (not executed — TTS spend needs Tom's approval)

1. Land the empty-response gate first (§5), and confirm it is live on the render host.
2. Identify the 542 ids by `duration_ms < 250` (or `<= 192` for the strict stub band) per role.
3. Two dispatch options:
   - **Bulk**: insert `audio_flags` rows (`audio_uuid, course_code, status:'flagged'`) for those
     ids — note 353 flag rows already exist for fra_for_eng — then
     `POST /regenerate-role/fra_for_eng {role:'target2', flaggedOnly:true}`, then the same for
     `known`. Pod-linked and human rows are excluded automatically (`:2358-2392`). Requires a DB
     write, so it is a mutation, not a scout action.
   - **Per-clip**: loop `POST /regenerate-single/fra_for_eng/:id` — no flag pre-write needed (it
     creates flags itself), fully restartable, no concurrency.
4. Decide §3c (bare `leo` vs `xai_leo`) BEFORE either — both paths write the bare value.
5. Decide §3d (id-stable update vs delete-and-remint) against the player's cache key.
6. Verify after: re-run the `duration_ms < 250` query; residue must be zero, and the count of
   rows touched must equal the count re-rendered.

---

## 7. Explicit gaps

- **Player-side cache key** (audio id vs S3 URL) not verified — §3d unresolved.
- **Which host runs phase8** for a real run: not on `localhost:3465` in this environment; the
  deployment state of the uncommitted gate on that host is unverified.
- **567/75 vs measured 468/72**: discrepancy reported, not reconciled.
- **S3 object bytes** not fetched (would confirm the 2,016-byte signature per row);
  `file_size_bytes` is NULL for all 542 rows so the DB cannot answer it.

---

## 8. Addendum — two independent worker traces (2026-08-04)

Two read-only workers verified §4/§5 independently. Both agree with this memo. Deltas:

**Line-number basis.** The provider-path worker read `services/tts-service.cjs` at **HEAD**
(`generateWithRetry:499`, `generateXai:265`, `isRetriableTtsError:376`, xAI semaphore `:51`),
whereas §5 above cites the **working tree** (+145 uncommitted lines, so everything below the gate
shifts by ~124: `generateWithRetry:650`, `generateXai:407`). Both are correct for their base.
The `+124` offset is itself the evidence that the guard is unlanded.

**Confirmations.**
- Six non-pod xAI dispatch sites in `phase8-audio-v13.cjs` — `:2047, :2495, :3846, :4054, :4355,
  :4752` — each inside an `if/else if/else throw` provider dispatch with **no surrounding
  try/catch that re-dispatches**. An xAI failure propagates up; it cannot become an Azure render.
- `generatePodAudio:5586-5607` is the sole runtime provider fallback, and it is reachable from
  exactly three callers, all pod-shaped: `phase8-audio-v13.cjs:5841`,
  `services/run-pod-explainer-batch.cjs:417`, and
  `services/production-api.cjs:3969-3985` (whose own comment advertises the inherited fallback).
  Disabling the one catch block removes it everywhere.
- `tools/breakdown-flat.cjs:41,115-117` assigns Azure **at build time** for languages xAI doesn't
  officially cover. Not failure-triggered, not on this path — a policy site, not a fallback.
- xAI sends **no `model` field** (`generateXai` body); auth is `XAI_API_KEY` only; the response is
  consumed as raw bytes with no inspection at HEAD.

**New facts.**
- `services/voice-config-service.cjs:435` `buildTTSConfig` passes the **bare** `voiceId`
  (`'leo'`, `'eve'`) to the provider — confirming §3c's diagnosis from the other end: nothing in
  the config layer ever produces the `xai_` prefix. Only `/generate`'s local helper
  (`phase8-audio-v13.cjs:1710`) composes it, which is why the two paths disagree.
  `ensureVoiceRegistered:189-245` likewise registers the bare id.
- `courses.fra_for_eng`: `version = 2310`, `content_version = 0.754.13`,
  `content_stamp = 2026-08-04T10:19:19Z`, `updated_at = 2026-08-04T10:19:27Z`, `status = released`,
  `new_app_status = beta`, `seed_count = 668`.
- `role=known` carries **six** distinct voice_ids historically — `xai_eve` (13,060), `eve` (117),
  `leo` (115: 65 `en-GB` + 50 `eng`), `bedd6226` (17), `gfzdpspr5fdp` (5), `f15c6a6a` (1).
  The 115 `leo` known-role rows are unexplained legacy; none of them is a stub, so they are out
  of scope for this re-render, but they are why the "known was rendered by leo" premise arose.
- `known` language column splits `eng` (13,183) / `en-GB` (132). **All 72 stubs are `eng`.**

**Tested prediction — the bare-voice_id rewrite fails silently, not loudly.** Simulated the
`/regenerate-role` UPDATE against the live table: rewriting each of the 514 target2+known stub
rows' `voice_id` to the bare config value produces **zero** `unique_course_audio_per_voice`
collisions. So the run would not error. It would simply leave target2 split
13,173 `xai_leo` / 468 `leo`, and known split 13,060 → 12,988 `xai_eve` / 72 `eve` — silent
identity drift that only shows up later, in the sharing lookup (`:1963`) and the human-key guard
(`:211`). This is the argument for fixing the voice_id composition **before** the run, not after.
