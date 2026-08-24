# Audio URL / S3-key construction census — Popty

**Repo:** `/home/tomcassidy/SSi/ssi-dashboard-v7-clean` (Popty, the production dashboard)
**Branch at census time:** `fix/audio-link-integrity` @ `c25eae0e`
**Date:** 2026-08-06
**Status:** read-only census. Nothing in this pass changed code, and this file is deliberately uncommitted.

Purpose: enumerate every place in this repo that **constructs** a clip URL or S3 key by convention, ahead of the move to per-clip versioned URLs held authoritatively in the database.

---

## 0. Headline — the convention is already broken, and something live is already wrong

Three measured facts from the production database (`.env.psql`, `course_audio`, 2026-08-06):

| Fact | Number |
|---|---|
| `course_audio` rows | 2,544,787 |
| rows with a non-null `s3_key` | 2,544,787 (100%) |
| rows whose `s3_key` is an http URL | **0** — the DB stores a *key*, never a URL |
| rows where `s3_key = 'mastered/' \|\| upper(id) \|\| '.mp3'` | **161,531 (6.3%)** |
| `s3_key` prefixes in use | `mastered/` 2,544,617 · `repair-candidates/` 94 · `pending/` 50 · `mastered-v2/` 26 |
| rows with `audio_revision > 1` | 95 (`course_audio_revisions`: 96 rows) |

**The key has already been decoupled from the row id for 93.7% of clips.** Every write path since the repair/revoice work mints a *fresh* UUID for the object and leaves `course_audio.id` alone — which is exactly right, and exactly why `mastered/{course_audio.id}.mp3` is now a wrong answer for nine clips in ten.

That makes the following a **live defect, not a migration concern**:

- `services/production-api.cjs:6866` and `:6935` — `buildS3Key = (uuid) => \`mastered/${uuid.toUpperCase()}.mp3\`` fed with `cycle.known_audio_id` / `target1_audio_id` / `target2_audio_id`, i.e. `course_audio.id`.
  Sampled 3,000 `course_legos.target1_audio_id` links: **3,000/3,000 resolve to a real `course_audio` row; only 246 (8.2%) have `s3_key = mastered/{id}.mp3`.** The other 91.8% get a key pointing at an object that does not exist.
- Same shape in `src/services/api.js:1793` (`getAudioStreamUrl(uuid)`) and `src/composables/useScriptPlayer.js:69` (fallback branch) — both build `mastered/{id}.mp3` from an id.

So the versioned-URL migration is not only the right direction; part of it is already overdue as a bug fix.

---

## 1. The three answers asked for

### (a) What is the current S3 key convention, and what mints it?

Canonical example, newest row in `course_audio`:

```
id      = 363890b2-7add-4b0b-b0a5-0b5f3178e7e2   (course_audio.id, lowercase uuid)
s3_key  = mastered/4EC44261-3F44-4618-89B0-1D05ABDAAF81.mp3   (UPPERCASE uuid, unrelated to id)
bucket  = ssi-audio-stage (eu-west-1)
url     = https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/4EC44261-….mp3
```

The convention is `mastered/{UUID-UPPERCASE}.mp3` in bucket `ssi-audio-stage`. The canonical minting code is the TTS publish path:

```js
// services/phases/phase8-audio-v13.cjs:2209-2219
const audioId = uuidv4().toUpperCase()
const s3Key = `mastered/${audioId}.mp3`
await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: s3Key, Body: masteredBuffer, ContentType: 'audio/mpeg' }))
// …then upsert course_audio with s3_key: s3Key
```

and the human-recording path, which is already explicitly key-versioned:

```js
// services/production-api.cjs:4382-4387
// Every take gets a FRESH object key — an existing S3 object is never PUT over.
// Regeneration mode: the course_audio row keeps its id; its s3_key moves to the
// fresh key after upload (the old object stays at the old key for reversibility).
const s3KeyUuid = isScriptMode ? audioId : crypto.randomUUID().toUpperCase()
const s3Key = `mastered/${s3KeyUuid}.mp3`
```

Four other prefixes exist alongside it: `pending/{UUID}.mp3` (placeholder rows awaiting TTS), `repair-candidates/{UUID}.mp3` (`services/audio-repair-core.cjs:66,398`), `segments/{courseCode}/{voiceId}/{segmentId}.mp3` (`services/voice-engine/segment-store.cjs:55`), `staging/{courseCode}/preview/{previewId}.mp3` (`services/preview-generation-service.cjs:45`). One legacy prefix, `ssiborg-assets/mastered/{uuid}.mp3`, survives as a *fallback* in three places (`services/s3-production-service.cjs:127,142,179`; `api/production/[courseCode]/audio/[uuid]/url.js:49`) and matches **zero** rows in the DB today.

### (b) One chokepoint, or copy-paste?

**Copy-paste. There is no chokepoint.**

- `mastered/${…}.mp3` appears as an **independent literal in 52 places** across 26 files (excluding tests, `scripts/`, and comments) — full list in §2.
- Of those, `services/s3-service.cjs` accounts for 6 (its own internal repetition across upload/exists/download/delete/copy/url), and `services/phases/phase8-audio-v13.cjs` for 8.
- The bucket-base URL is a **second, separately copy-pasted convention**: 19 `amazonaws.com` literals, in at least five distinct spellings (`https://${bucket}.s3.amazonaws.com/`, `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/`, hard-coded `https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/`, a `…/courses` variant, and a `…/mastered` variant).
- `services/s3-service.cjs` is the closest thing to a shared helper — 10 modules require it — but it takes a **uuid**, not a key, so it cannot serve a DB-held key without a signature change.
- `services/s3-audio-service.cjs` is a complete second copy of the same service using a *different* convention (`courses/{code}/audio/{uuid}.mp3`) and has **zero requirers** — dead code (verified by grep for `require(.*s3-audio-service)` across the repo).

### (c) Anything caching or memoising derived URLs?

| Where | What | Persistence |
|---|---|---|
| `src/composables/useScriptPlayer.js:35,59-62` | `resolvedUrlCache` — `Map` of uuid → resolved URL | in-memory, per page load |
| `api/pod-content.js:155-159` | `urlByKey` — memoises signed URLs per s3Key within one request | in-memory, per request |
| `services/voice-engine/segment-store.cjs:23,109` | segment manifest JSON written to S3, containing `s3Key` per segment **and** `take.s3Key` | **persisted in S3** |
| `services/manifest-generator.cjs:379,409`, `services/phases/generate-legacy-manifest.cjs:109,975,1456` | legacy manifests reverse `mastered/X.mp3` → `X` and emit the bare uuid | file/manifest output |
| `tools/generators/transform-to-v2-manifest.cjs:84` | `buildS3Url()` writes absolute S3 URLs into a v2 manifest | file output |
| `src/views/admin/VadLab.vue:87-97` | `public/vad-lab-clean/manifest.json` + `{id}.mp3` under the app's own `BASE_URL` | committed static assets |

I searched `public/`, `vfs/`, `dist/` and `exports/` for JSON containing `amazonaws.com` and found **none** — no stale absolute-URL manifest is currently checked in. Signed URLs are never persisted anywhere (TTL 3600s in all three signing sites).

---

## 2. The census table

Legend — **Path class:** `LEARN` learner-facing hot path · `DASH` Popty/dashboard · `TOOL` one-off tool/script. **W/R:** W = writes/mints a key into S3 or `s3_key`; R = read-only URL/key construction. **Cost:** T trivial · M moderate · D needs design.

Popty is the production dashboard; the learner app is a separate repo (`ssi-learning-app`). Nothing here is on the *learner's* hot path. `LEARN` below means "the Popty surface that plays the learner experience back" — the script/cycle players staff use to audition a course. Sites that feed a *learner-app-shaped* payload (`round-map`-style responses) are called out explicitly.

### 2.1 Writers — where a versioned key must be minted (26 sites)

| file:line | expression | derived from | DB authoritative? | path class | W/R | cost |
|---|---|---|---|---|---|---|
| services/phases/phase8-audio-v13.cjs:2211 | `` const s3Key = `mastered/${audioId}.mp3` `` | fresh `uuidv4().toUpperCase()` | yes — written to `course_audio.s3_key` immediately after | DASH (TTS publish) | W | T |
| services/phases/phase8-audio-v13.cjs:2705 | same | fresh uuid | yes | DASH | W | T |
| services/phases/phase8-audio-v13.cjs:4062 | `` const newS3Key = `mastered/${newAudioId}.mp3` `` | fresh uuid (regen) | yes | DASH | W | T |
| services/phases/phase8-audio-v13.cjs:4270 | same | fresh uuid (regen) | yes | DASH | W | T |
| services/phases/phase8-audio-v13.cjs:4571 | same | fresh uuid (regen) | yes | DASH | W | T |
| services/phases/phase8-audio-v13.cjs:4985 | `` const s3Key = `mastered/${audioId}.mp3` `` | fresh uuid | yes | DASH | W | T |
| services/phases/phase8-audio-v13.cjs:5498 | same | fresh uuid | yes | DASH | W | T |
| services/phases/phase8-audio-v13.cjs:5848 | same | fresh uuid | yes | DASH | W | T |
| services/phases/phase8-audio-v13.cjs:3052 | `` s3_key: `pending/${uuidv4().toUpperCase()}.mp3` `` | fresh uuid, placeholder | yes (row exists, object does not) | DASH | W | T |
| services/phases/phase8-audio-v13.cjs:3550 | same | fresh uuid | yes | DASH | W | T |
| services/phases/phase8-audio-v13.cjs:3736 | same | fresh uuid | yes | DASH | W | T |
| services/phases/phase2-conflict-resolution/detect.cjs:105 | `` s3_key: `pending/${uuidv4().toUpperCase()}.mp3` `` | fresh uuid | yes | DASH | W | T |
| services/production-api.cjs:4387 | `` const s3Key = `mastered/${s3KeyUuid}.mp3` `` | fresh `crypto.randomUUID()`, **already fresh-per-take** | yes | DASH (recording upload) | W | T |
| services/production-api.cjs:6332 | `` s3_key: `${sample.uuid}.mp3` `` | sample uuid, **no prefix at all** | writes a key with no `mastered/` — almost certainly a bug | DASH (sync/register) | W | M |
| services/voice-engine/synthesis-job.cjs:428 | `` const s3Key = `mastered/${audioId}.mp3` // live serving + deploy prefix `` | fresh `crypto.randomUUID()` | yes | DASH (voice engine) | W | T |
| services/voice-engine/segment-store.cjs:55 | `` return `segments/${courseCode}/${voiceId}/${segmentId}.mp3` `` | courseCode + voiceId + segmentId | **no** — segments live only in an S3 manifest, not in `course_audio` | DASH | W | D |
| services/pod-explainer-composite.cjs:306,318 | `` Key: `mastered/${newId}.mp3` `` / `` s3_key: `mastered/${newId}.mp3` `` | fresh id | yes | DASH (pods) | W | T |
| services/audio-repair-core.cjs:398 | `` const s3Key = `${CANDIDATE_PREFIX}/${candidateId.toUpperCase()}.mp3` `` | candidate id | yes — `audio_repair_candidates.s3_key` | DASH (repair) | W | T |
| services/s3-service.cjs:41 | `` const key = `mastered/${uuid}.mp3` `` (uploadAudio) | caller-supplied uuid | partial — caller decides whether to persist | DASH (shared helper, 10 requirers) | W | M |
| services/s3-audio-service.cjs:28 | `` const key = `courses/${courseCode}/audio/${uuid}.mp3` `` | courseCode + uuid | **no rows use this prefix** | DEAD (0 requirers) | W | T (delete) |
| services/s3-production-service.cjs:179 | `` const key = options.s3Key \|\| `ssiborg-assets/mastered/${uuid}.mp3` `` | fallback when caller passes no key | yes, when caller passes `s3Key` | DASH | W | T |
| services/preview-generation-service.cjs:45 | `` return `staging/${courseCode}/preview/${previewId}.mp3` `` | courseCode + generated previewId | **no** — previews are ephemeral, not in `course_audio` | DASH | W | T (out of scope) |
| tools/build-shared-known-store.cjs:181 | `` const key = `mastered/${id}.mp3` `` | fresh id | yes — `shared_audio.s3_key` | TOOL | W | T |
| tools/persist-stage0-pod0.cjs:127 | `` const s3Key = `mastered/${newId}.mp3` `` | fresh id | yes | TOOL | W | T |
| tools/repair-presentation-clips.cjs:226 | `` const s3Key = `mastered/${newId.toUpperCase()}.mp3` `` | fresh id | yes | TOOL | W | T |
| tools/revoice-clips.cjs:479 | `` const s3Key = `mastered/${newId}.mp3` `` | fresh id | yes | TOOL | W | T |
| tools/generators/phase8-generate-audio.cjs:236 | `` const s3Key = `courses/${courseCode}/audio/${id}.mp3` `` | courseCode + id | **no rows use this prefix** | TOOL (legacy) | W | T (retire) |
| database/import-shared-audio.cjs:102,123 | `` s3_key: `mastered/${audio.id}.mp3` `` | legacy import id | yes (it is the import) | TOOL | W | T |
| database/import-welcomes.cjs:79 | `` const s3Key = `mastered/${welcome.id}.mp3` `` | welcome id | yes | TOOL | W | T |
| database/import-course-v13.cjs:206,223 | `` s3_key: `mastered/${audio.id}.mp3` `` | legacy id | yes | TOOL | W | T |
| database/lib/import-legacy-course-core.cjs:186,203,295,313 | `` audio.id.includes('/') ? audio.id : `mastered/${audio.id}.mp3` `` | legacy id, with a pass-through for pre-keyed ids | yes | TOOL | W | T |

*(Row count above is 31 lines covering 26 distinct call sites; multi-line entries are collapsed where the same expression repeats in one function.)*

### 2.2 Readers — key derived for head / get / delete / copy (21 sites)

| file:line | expression | derived from | DB authoritative? | path class | W/R | cost |
|---|---|---|---|---|---|---|
| services/s3-service.cjs:79 | `` const key = `mastered/${uuid}.mp3` `` (audioExists) | uuid | yes, ignored | DASH | R | M |
| services/s3-service.cjs:123 | same (downloadAudio) | uuid | yes, ignored | DASH | R | M |
| services/s3-service.cjs:220 | same (deleteAudio) | uuid | yes, ignored | DASH | R | M |
| services/s3-service.cjs:238 | same (copyAudio) | uuid | yes, ignored | DASH | R | M |
| services/s3-deploy-service.cjs:37 | `` Key: `mastered/${uuid}.mp3` `` (checkFileInStage) | uuid | yes, ignored | DASH (deploy) | R | M |
| services/s3-deploy-service.cjs:63 | same (checkFileInProd) | uuid | yes, ignored | DASH | R | M |
| services/s3-deploy-service.cjs:495,497 | `` CopySource: `${STAGE_BUCKET}/mastered/${uuid}.mp3` `` + `` Key: `mastered/${uuid}.mp3` `` | uuid | yes, ignored | DASH | R | M |
| services/s3-deploy-service.cjs:603 | same (getAudioMetadata) | uuid | yes, ignored | DASH | R | M |
| services/s3-production-service.cjs:127 | `` const key = options.s3Key \|\| `ssiborg-assets/mastered/${uuid}.mp3` `` | fallback | yes — callers in production-api already pass `s3Key` | DASH | R | T |
| services/s3-production-service.cjs:142 | `` Key: `ssiborg-assets/mastered/${uuid}.mp3` `` (audioFileExists) | uuid | yes, ignored; prefix matches **0 rows** | DASH | R | T |
| services/s3-production-service.cjs:208 | `` Key: `mastered/${uuid}.mp3` `` (batchCheckAudio) | uuid | yes, ignored | DASH | R | M |
| services/orchestration/orchestrator.cjs:8767 | `` const s3Key = `mastered/${uuid}.mp3` `` — `GET /api/audio/stream/:uuid` | route param | yes, ignored | DASH (streaming proxy) | R | M |
| services/orchestration/orchestrator.cjs:9432 | identical duplicate handler, same route registered twice | route param | yes, ignored | DASH | R | M |
| services/production-api.cjs:9321 | `` Key: `mastered/${uuid}.mp3` `` — download endpoint | route param | yes, ignored | DASH | R | M |
| services/presentation-service.cjs:243 | `` const s3Key = `mastered/${uuid}.mp3` `` | uuid | yes, ignored (and the variable is then unused — download goes via s3Service) | DASH | R | T |
| api/production/[courseCode]/audio/[uuid]/url.js:49 | `` s3Key = `ssiborg-assets/mastered/${uuid}.mp3` `` — fallback when DB lookup misses | route param | **yes, and it already tries the DB first** (`:42-43`) | DASH (signing endpoint) | R | T |
| services/s3-audio-service.cjs:53,148,167 | `` `courses/${courseCode}/audio/${uuid}.mp3` `` | courseCode + uuid | dead | DEAD | R | T (delete) |
| services/learning-script-generator.cjs:518 | `` s3_key: `mastered/${intro.audio_uuid.toUpperCase()}.mp3` `` | `intro.audio_uuid` | **no — synthesises a key into the response payload** | DASH → learner-shaped script payload | R | M |
| services/production-api.cjs:6866 | `` buildS3Key = (uuid) => `mastered/${uuid.toUpperCase()}.mp3` `` fed `known/target1/target2_audio_id` | **course_audio.id** | **yes, and this is wrong for 91.8% of links** | DASH → learner-shaped cycle payload | R | M |
| services/production-api.cjs:6935 | identical helper redefined inside the lego-debut branch | course_audio.id | same defect | DASH | R | M |
| services/preview-generation-service.cjs:106,325 | `Key: key` from `getPreviewKey` | courseCode + previewId | n/a (ephemeral previews) | DASH | R | T |

### 2.3 Full-URL constructors — bucket base pasted onto a key or uuid (16 sites)

| file:line | expression | derived from | DB authoritative? | path class | W/R | cost |
|---|---|---|---|---|---|---|
| src/services/api.js:1793 | `` return `https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/${uuid.toUpperCase()}.mp3` `` | **course_audio.id** (6 call sites in `CourseEditor.vue`, `LearningCyclePlayer.vue`, `AudioPreviewPlayer.vue`) | yes — and wrong for ~92% | DASH/LEARN (audition players) | R | M |
| src/composables/useScriptPlayer.js:69 | same literal, as the fallback when no `audioUrlResolver` is injected | uuid | yes — resolver branch already reads the DB via the signing endpoint | DASH/LEARN | R | T |
| src/views/production/UserFeedback.vue:313,387 | `` const S3_AUDIO_BASE = 'https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered'; … src = `${S3_AUDIO_BASE}/${audioId.toUpperCase()}.mp3` `` | audio id | yes, ignored | DASH | R | T |
| services/s3-service.cjs:54 | `` url: `https://${bucket}.s3.amazonaws.com/${key}` `` | bucket + minted key | n/a (returned from upload) | DASH | R | T |
| services/s3-service.cjs:171 | `` return `https://${bucket}.s3.amazonaws.com/mastered/${uuid}.mp3` `` (getAudioUrl) | uuid | yes, ignored | DASH | R | M |
| services/s3-service.cjs:277 | `` url: `https://${LFS_BUCKET}.s3.amazonaws.com/${key}` `` | LFS upload key | n/a | DASH | R | T |
| services/quality-control-service.cjs:197 | `` s3_url: `https://${s3Bucket}.s3.amazonaws.com/mastered/${s.uuid}.mp3` `` — written into a QC report JSON | uuid | yes, ignored | DASH (report) | R | T |
| services/preview-generation-service.cjs:57-58 | `` return `https://${LFS_BUCKET}.s3.eu-west-1.amazonaws.com/${key}` `` | preview key | n/a | DASH | R | T |
| services/s3-audio-service.cjs:39,168 | `` `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}` `` | courses/ key | dead | DEAD | R | T (delete) |
| tools/audio-batch-gate.cjs:139,264 | `` const S3_BASE = `https://${S3_BUCKET}.s3.eu-west-1.amazonaws.com/` `` → `download(S3_BASE + r.s3_key, mp3)` | **reads `r.s3_key` from the DB**, prepends base only | yes, and honoured | TOOL | R | T |
| tools/audio-veracity-repair.cjs:103,184 | same shape, `S3_BASE + row.s3_key` | DB s3_key | yes, honoured | TOOL | R | T |
| tools/physical-tail-probe.cjs:57,70 | `` row.s3_key.startsWith('http') ? row.s3_key : S3_BASE + row.s3_key `` | DB s3_key, with an http pass-through already | yes, honoured — **the best-behaved site in the repo** | TOOL | R | T |
| tools/rescue-child-voice-clips.cjs:71,229 | `` S3_BASE + rowNow.s3_key `` | DB s3_key | yes, honoured | TOOL | R | T |
| tools/rescue-wrong-language-clips.cjs:71,219 | `` S3_BASE + rowNow.s3_key `` | DB s3_key | yes, honoured | TOOL | R | T |
| tools/sweep-wrong-language-crosscourse.cjs:60,259 | `` S3_BASE + j.s3_key `` | DB s3_key | yes, honoured | TOOL | R | T |
| tools/generators/transform-to-v2-manifest.cjs:51,84 | `` const S3_BASE_URL = '…amazonaws.com/courses'; buildS3Url = (courseCode, uuid) => `${S3_BASE_URL}/${courseCode}/audio/${uuid}.mp3` `` | courseCode + uuid | **no rows use `courses/` audio keys** | TOOL (legacy v2 manifest) | R | T (retire) |
| apml/compiler/src/generator/vue-generator.ts:952 | `` lines.push(\`…return \\\`https://s3.amazonaws.com/bucket/\\${uuid}.mp3\\\`;\`) `` | **generates code that hard-codes the convention into emitted Vue** | no | TOOL (codegen) | R | M |

### 2.4 Inverse derivation — key parsed back into a uuid (7 sites)

These break the moment a key stops being `mastered/{uuid}.mp3`, and they are the quiet ones.

| file:line | expression | risk under versioning |
|---|---|---|
| services/phases/generate-legacy-manifest.cjs:109 | `` s3Key.replace('mastered/', '').replace('.mp3', '') `` | silently yields a wrong "uuid" for any other prefix |
| services/phases/generate-legacy-manifest.cjs:975 | same | same |
| services/phases/generate-legacy-manifest.cjs:1456 | same, on `presRecord.s3_key` | same |
| services/manifest-generator.cjs:379 | `` row.s3_key?.match(/mastered\/(.+)\.mp3/) `` | returns null for `mastered-v2/`, `repair-candidates/` — clip silently dropped |
| services/manifest-generator.cjs:409 | same, welcome row | same |
| services/s3-service.cjs:386 | `` obj.Key.replace('mastered/','').replace('.mp3','').toUpperCase() `` (buildMasteredIndex) | index misses every non-`mastered/` object |
| src/services/supabase.js:769 | `` intro.s3_key?.replace('.mp3','') `` — comment says *"s3_key is `{uuid}.mp3`"* | the comment describes a prefix-less key that matches 0 rows |

### 2.5 Already correct — the pattern to copy

Worth naming, because the migration is mostly "make everything look like these":

- `services/shared/audio-fallback-resolver.cjs` — resolves a clip by reading `row.s3_key`, never constructs.
- `api/pod-content.js:100-159` — selects `id, text, s3_key`, builds a `s3KeyById` map, signs the DB-held key. No convention anywhere.
- `api/production/[courseCode]/audio/[uuid]/url.js:37-49` — DB first, convention only as a fallback (delete the fallback and this site is done).
- `services/production-api.cjs:4317-4346` — passes `{ s3Key: row.s3_key }` into the signer explicitly.
- `services/audio-repair-core.cjs` — the whole revision ledger (`previous_s3_key` / `new_s3_key` / `revision`) is already a per-clip versioned-URL model. **The migration should extend this table's model, not invent a new one.**
- `tools/physical-tail-probe.cjs:70` — already tolerates an `s3_key` that is a full http URL.
- `services/phases/phase8-audio-v13.cjs:118-120` — `HeadObject` on the DB-held `s3Key`, with a `pending/` guard.

---

## 3. Totals

**Total clip-URL/key construction sites: 64** (excluding tests, excluding the gitignored `scripts/` workspace, excluding local tempfile paths).

| Split | Count |
|---|---|
| **Writers** (mint a key into S3 and/or `s3_key`) | **26** |
| **Readers** (build a URL/key only to fetch, probe, sign or display) | **38** |

| Path class | Count |
|---|---|
| Learner-shaped payload / audition player in Popty | 6 |
| Internal Popty / dashboard services and API | 40 |
| One-off tools & generators | 18 |

| Sub-split of readers | Count |
|---|---|
| Key derived for head/get/delete/copy (§2.2) | 21 |
| Full-URL constructors (§2.3) | 16 |
| Inverse key→uuid parsers (§2.4) | 7 |
| *(overlap: `s3-audio-service` and `preview-generation-service` appear in two sub-groups)* | −6 |

| Migration cost | Count |
|---|---|
| Trivial (delete the fallback, or pass `s3_key` through) | 41 |
| Moderate (signature change: helper takes a key not a uuid; ripple to callers) | 21 |
| Needs design (segment store; codegen) | 2 |

Dead code that can simply be deleted: **`services/s3-audio-service.cjs` entire file (9 sites, 0 requirers)**, plus `tools/generators/transform-to-v2-manifest.cjs` and `tools/generators/phase8-generate-audio.cjs`, which both use a `courses/{code}/audio/` prefix matching zero rows.

---

## 4. Is this a day or a fortnight?

**Roughly four to six working days for the code, plus a separate data pass. Not a fortnight, and not a day.** The numbers, honestly:

- **41 of 64 sites are trivial** — they already have the DB key in hand and throw it away, or they read `s3_key` correctly and only prepend a bucket base. A single exported `clipUrl(s3Key)` helper plus a mechanical sweep clears these. Call it **1.5 days** including review.
- **21 sites are moderate**, and they are moderate for one reason: `services/s3-service.cjs` and `services/s3-deploy-service.cjs` expose a **uuid-shaped API** (`uploadAudio(uuid, …)`, `audioExists(uuid)`, `downloadAudio(uuid)`, `copyAudio(uuid, …)`, `checkFileInStage(uuid)`). Changing them to key-shaped ripples into 10 requiring modules. That is the real work: **2–3 days**, mostly reading call sites.
- **2 sites need design**: `voice-engine/segment-store.cjs` keeps its keys in an S3-side manifest with no DB table (keystone decision 7 explicitly declined the DDL), and `apml/compiler/.../vue-generator.ts:952` *emits* the convention into generated code. Both are decisions, not edits: **half a day of thinking each.**
- **The data pass is separate and larger than the code.** 2.54M rows already carry a correct `s3_key`, so no backfill is needed for the key itself — but 50 `pending/` rows, 26 `mastered-v2/` rows and 94 `repair-candidates/` rows are outside the convention, and `production-api.cjs:6332` has been writing prefix-less keys. Auditing and correcting those is a **half-day**, and it is read-only-then-gated per the sweep protocol.

What would push it to a fortnight: deciding the versioned-URL *scheme* (does `s3_key` become a full URL? does `audio_revision` enter the key? does `course_audio_revisions` become the ledger of record?) before writing any code. That decision is upstream of this census and is not costed here.

The cheap sequencing, if it helps: (1) fix `production-api.cjs:6866/6935` and `src/services/api.js:1793` now as bugs — they are already wrong for 92% of clips; (2) delete `s3-audio-service.cjs` and the two `courses/`-prefix generators; (3) introduce `clipUrl(s3Key)` and sweep the 41 trivial sites; (4) re-shape `s3-service.cjs` to key-in/key-out; (5) take the two design calls.

---

## 5. Explicit gaps

Reported as gaps rather than guessed:

1. **`supabase/schema.sql` does not exist.** `CLAUDE.md` names it as the schema source of truth; there is no `supabase/` directory in this checkout at `c25eae0e`. All schema facts in this census were read **directly from the production database** via `.env.psql` and `node_modules/pg`, not from a snapshot. `psql` is not installed on this machine.
2. **`ssi-learning-app` was not censused.** The task scoped this to Popty. The learner app reads Supabase directly (per `CLAUDE.md`) and is where the *actual* learner hot path lives — including, almost certainly, its own copy of the `mastered/{UUID}.mp3` convention. **The migration cannot be planned from this document alone.** A matching census of `ssi-learning-app` is required before anyone sizes the whole job.
3. **`scripts/` (gitignored) was surveyed but not enumerated.** It contains ~40 further files touching `.mp3` paths and at least four that construct S3 keys and public URLs directly (`scripts/audio-qa-2026-08-05/naked.cjs:24,83`, `ab-upload.cjs:6,12-13`, `publish-candidates.cjs:14,22`, `restore-deleted-intro-texts-2026-08-05.cjs:111`). They are throwaway probe scripts, not shipped code, and are excluded from the totals. If any is promoted to `tools/`, it must be re-censused.
4. **Two S3 buckets are referenced (`STAGE_BUCKET` / `PROD_BUCKET` in `s3-deploy-service.cjs`) and I did not verify against AWS which are live**, nor did I list S3 to confirm object counts per prefix. All prefix statistics above come from the database, not from S3. No AWS credentials were exercised in this pass — it was read-only by instruction.
5. **`production-api.cjs:6332` writing `s3_key: \`${sample.uuid}.mp3\`` with no prefix** — I found no rows in `course_audio` with a prefix-less key, so either this path has not run recently or its rows were corrected. I did not trace its callers to determine which. Flagged as unresolved.
6. **Route duplication in `orchestration/orchestrator.cjs`** — `GET /api/audio/stream/:uuid` is registered twice (`:8761` and `:9426`) with near-identical bodies. Express will only ever use the first. I have not determined whether the second is dead or the file is a merge artefact; either way both construct keys by convention.

---

*Census only. No code was changed, no branch created, no commit made. This file is untracked by design.*
