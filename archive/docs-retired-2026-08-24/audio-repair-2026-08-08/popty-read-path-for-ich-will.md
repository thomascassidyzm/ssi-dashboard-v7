# What Popty actually resolves for deu_for_eng S0001L01 — the read path, hop by hop

**2026-08-08, ~10:45Z. Read-only: no writes, no re-point, no re-render, no restart.**
Every id below was read live from the production DB and the live Production API on watson-1 (port 3470, running from `ssi-dashboard-v7-clean-prod` @ `676f28f2`, branch `main`).

---

## The verdict, in one line

**Popty and the learner app resolve the SAME row from the SAME table today.** Both read
`course_legos.target1_audio_id / target2_audio_id` for `lego_id = 'S0001L01'`, and both get
`0f37d106…` / `695a757c…` — the January take. There is no ordering rule, no text lookup and no
`lego_id` lookup in the path Popty plays a LEGO from.

So the divergence Tom heard is **not row selection. It is bytes.** The two products turn the same
id into bytes by different mechanisms, and only one of them can be served stale:

- **Popty** mints a *freshly presigned S3 URL on every single play* — unique query string, so no
  browser cache can ever answer it. Popty always hears the current object.
- **The learner app** requests a *stable* URL, `/api/audio/<id>`, which the proxy answers with
  `Cache-Control: public, max-age=31536000, immutable`, and the player also stores the blob in
  IndexedDB `ssi-audio-cache-v2` keyed by the bare id. Once a device has bytes for that id, it
  keeps them for a year unless the id string itself changes.

The id string only changes when `course_audio.audio_revision > 1` (the `.v<N>` suffix).
**`0f37d106…` is `audio_revision = 1`.** So its URL has been the same bare string throughout,
while the object under it moved. That is a permanent stale-audio path, and the codebase already
says so in as many words (see `revisedAudioRefs.ts` below).

There is also a second, separate divergence in one Popty surface, where Popty **invents** an S3
key instead of reading it — that one 404s. Detail in §4.

---

## 1. The Popty read path, hop by hop

### 1a. The Learning Journey player (the 4-phase LEGO player — the surface that plays a LEGO)

| # | Hop | File:line |
|---|-----|-----------|
| 1 | View builds player items from `props.allItems`, taking `target1_audio_uuid` / `target2_audio_uuid` straight off the item | `src/views/production/components/LearningJourneyView.vue:499-510` |
| 2 | Resolver calls `GET /api/production/:courseCode/audio/:uuid/url` | `src/views/production/components/LearningJourneyView.vue:485-496` |
| 3 | `allItems` comes from `GET /api/production/:courseCode/learning-journey` | `src/views/production/ScriptViewer.vue:1457-1470` |
| 4 | Handler delegates to `learningScriptGenerator.generateLearningScript` | `services/production-api.cjs:7164`, call at `:7184` |
| 5 | **The query.** `course_legos`, all columns, `eq('course_code', …)`, `ORDER BY seed_number ASC, lego_index ASC` | `services/learning-script-generator.cjs:321-326` |
| 6 | **The mapping.** `target1_audio_uuid := record.target1_audio_id`, `target2_audio_uuid := record.target2_audio_id` | `services/learning-script-generator.cjs:359-360` |
| 7 | Presentation clip comes from `course_legos.presentation_audio_id` (fallback `lego_introductions`) | `services/learning-script-generator.cjs:496-537` |
| 8 | id → bytes: `course_audio` lookup **by primary key `id`**, take `s3_key`, presign | `services/production-api.cjs:4261-4290` |
| 9 | Presign: key = `options.s3Key` (the DB value) else legacy `ssiborg-assets/mastered/<uuid>.mp3` | `services/s3-production-service.cjs:125-134` |

**Table + columns + ORDER BY, stated plainly:**
`course_legos`, columns `target1_audio_id` / `target2_audio_id`, filtered `course_code = 'deu_for_eng'`,
ordered `seed_number ASC, lego_index ASC`. The ORDER BY is a *display* order over LEGOs — it does not
choose between clips. **There is no candidate set and therefore no tie-break: the pointer column is the answer.**
`course_audio` is then read **by `id`**, never by text and never by `lego_id`, in this path.

### 1b. The Script Viewer row player (`PhraseRow`)

| # | Hop | File:line |
|---|-----|-----------|
| 1 | Uses pre-loaded `target1_audio_uuid` **and a pre-loaded `target1_s3_key`** from script-view | `src/views/production/components/PhraseRow.vue:413-441` |
| 2 | Falls back to a **text lookup** only when no uuid was supplied at all | `src/views/production/components/PhraseRow.vue:421-431`, helper at `:350` |
| 3 | `GET /api/production/:courseCode/script-view` | `services/production-api.cjs:6810` |
| 4 | Phrase rows: `course_practice_phrases`, `ORDER BY seed_number, lego_index, position` | `services/production-api.cjs:6858-6866` |
| 5 | LEGO debut row: `course_legos` `target1_audio_id` / `target2_audio_id`, unshifted at position 0 | `services/production-api.cjs:6907-6911`, `:7086-7106` |
| 6 | **⚠ The s3 key is synthesised, not read**: `buildS3Key = uuid => 'mastered/' + uuid.toUpperCase() + '.mp3'` | `services/production-api.cjs:7014`, `:7088` |

### 1c. The by-text resolver (CyclePlayer, and PhraseRow's fallback only)

`GET /api/production/:courseCode/audio/by-text` — `services/production-api.cjs:4310-4390`.
`course_audio` filtered on `course_code` + `text_normalized` + `role`, `.single()`, **no ORDER BY**,
with punctuation-stripped and role-less fallbacks. Callers: `src/views/production/components/CyclePlayer.vue:233`
and the `PhraseRow` fallback above. This is the only Popty path that could pick a *different* row —
and for `ich will` it would pick the **6-August xAI take** (`823cf48a…` / `ca2c4e01…`), because the
January rows carry the ` ::superseded-regen` tombstone inside `text_normalized` and so cannot match.

---

## 2. The ids Popty returns for deu_for_eng S0001L01 *today*

Read live at 10:42Z from the running Production API (`/api/production/deu_for_eng/learning-journey?maxLegos=1`):

```
roundNumber 1 · legoId S0001L01 · "I want" / "ich will"
  presentation_audio  c7a95a8e-f7db-453b-8bd9-0be33aa60316
  known_audio_uuid    38cf05e8-7d64-443e-b9d3-9e0a15f1ad0a
  target1_audio_uuid  0f37d106-cb1a-4906-be37-042263330342
  target2_audio_uuid  695a757c-dce1-4f42-a32e-6e90d1567439
```

Same values direct from the DB (`course_legos`, `course_code='deu_for_eng'`, `lego_id='S0001L01'`),
and **`course_practice_phrases:deu_for_eng:S0001L01B01` holds the identical pair** — so options (1)
and (2) in the brief agree with each other right now.

Options (3) and (4) **disagree**, and this is where the four-way split in the brief is real:

| Resolution rule | target1 | target2 | what it is |
|---|---|---|---|
| `course_legos` pointer (Popty player **and** the app) | `0f37d106…` | `695a757c…` | January rows, `audio_revision 1`, text `ich will ::superseded-regen`, `lego_id` says **S0241L01** |
| `course_practice_phrases` pointer | `0f37d106…` | `695a757c…` | identical |
| **by-text** (`text_normalized = 'ich will'`) | `823cf48a…` | `ca2c4e01…` | 6-August xAI regen, `audio_revision 2`, `lego_id` **S0241L01** |
| by `lego_id = 'S0001L01'` | — | — | returns only the **presentation** clip `c7a95a8e…`; no target row in the whole course carries `lego_id = 'S0001L01'` |

Note the trap in the last row: every one of these four clips carries `lego_id = 'S0241L01'`, not
`S0001L01`. Any tool that resolves a LEGO's audio *by `lego_id`* gets a different answer again —
which is exactly why the by-`lego_id` census earlier read as "no audio".

---

## 3. How Popty turns that id into bytes — and why it can differ from the app

**Popty** (`services/production-api.cjs:4261-4290` → `services/s3-production-service.cjs:125-134`):
reads `course_audio.s3_key` **by id**, then `getSignedUrl(...)`. Verified live:

```
GET /api/production/deu_for_eng/audio/0f37d106-…/url
→ https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/1CD434B3-3935-4DCC-B5E6-12BC5874EAAD.mp3
  ?X-Amz-Date=20260808T104257Z&X-Amz-Expires=3600&X-Amz-Signature=f948d4ba…
```

The signature and date are in the URL. **Every play is a new URL, so no HTTP cache can ever serve
it, and Popty has no IndexedDB blob store.** Popty is structurally incapable of playing a stale clip.

**The learner app** (`ssi-learning-app/api/audio/[audioId].ts`): looks the same row up by id, takes
`sample.s3_key`, streams the same object — **but the URL the client asked for is stable**, and the
proxy stamps it `Cache-Control: public, max-age=31536000, immutable`
(`api/audio/[audioId].ts`, headers block). The client also keeps the blob in IndexedDB keyed by the
bare id (`packages/player-vue/src/cache/AudioCache.ts:105`).

The codebase already names this failure mode, in the module written to defend against it —
`ssi-learning-app/packages/player-vue/src/providers/revisedAudioRefs.ts:15-23`:

> An unstamped (bare-uuid) ref for a REVISED clip is a permanent stale-audio bug, because both
> downstream caches key on the ref string: IndexedDB `ssi-audio-cache-v2` keys by audio id, so the
> pre-repair blob is returned for the bare uuid forever; the browser HTTP cache keys by URL, and
> `/api/audio/:id` sets `Cache-Control: public, max-age=31536000, immutable`.

The defence is the `.v<N>` suffix, built only when `audio_revision > 1`
(`revisedAudioRefs.ts:66`). **`0f37d106…` and `695a757c…` are `audio_revision = 1`.** Their refs are
bare. Meanwhile the S3 objects behind them show a single surviving version, both stamped
**2026-08-03** (`1CD434B3…` 19:19:05Z, 9,504 bytes; `0BEF3EF1…` 21:28:20Z, 8,640 bytes) — the object
moved on 3 August without the revision moving with it.

**Stated explicitly, as asked: yes. Popty and the app can resolve the same id to different bytes.**
Popty always gets what is in S3 now. A device that cached that bare id before the object changed
keeps the old bytes for a year. Nothing in the current DB state will dislodge them, because the
thing that busts those caches — the revision suffix — is driven by a column that was never bumped.

---

## 4. Second, separate divergence: Script Viewer invents an S3 key

`services/production-api.cjs:7014` and `:7088` build `mastered/<UUID-UPPERCASE>.mp3` from the
audio id, and `PhraseRow` passes that straight to `/audio/:uuid/url`
(`src/views/production/components/PhraseRow.vue:308`, `:441`), where a supplied `s3Key` **skips the
DB lookup entirely** (`services/production-api.cjs:4265-4283`). For this clip the invented key is
`mastered/0F37D106-CB1A-4906-BE37-042263330342.mp3`, but the real `s3_key` is
`mastered/1CD434B3-3935-4DCC-B5E6-12BC5874EAAD.mp3`. HEAD, read-only:

```
MISS mastered/0F37D106-CB1A-4906-BE37-042263330342.mp3   404 NotFound
MISS mastered/695A757C-DCE1-4F42-A32E-6E90D1567439.mp3   404 NotFound
OK   mastered/1CD434B3-3935-4DCC-B5E6-12BC5874EAAD.mp3   9504 bytes
OK   mastered/0BEF3EF1-612A-4A4B-9603-EE276421057A.mp3   8640 bytes
```

So the Script Viewer's play button for this clip yields a signed URL to a non-existent object: a
silent no-play, not a wrong clip. It is a genuine same-id-different-bytes hazard everywhere the
convention `s3_key == mastered/<UUID>.mp3` does not hold — which for v12-era rows it frequently
does not.

---

## 5. Timing, which matters for interpreting the live test

- **05:19:47Z** the reuse pass moved `course_legos` S0001L01 onto the 6-August xAI rows
  (`823cf48a…` / `ca2c4e01…`, `audio_revision 2`, so the app served them as `…​.v2`).
- **10:31:55Z** the revert put the January rows back and bumped `courses.content_stamp` to
  `2026-08-08T10:31:55.328Z` (`audio_stamp` still `05:27:53Z`).
- **10:42Z** — my reads above.

If Tom's app test happened before 10:31:55Z, the app was legitimately serving the xAI take from a
current, correct read. If after, then the app is serving a cached script or cached bytes, which is
the mechanism in §3. **I cannot tell from here which side of 10:31:55Z his test fell on — that is a
GAP, and it is the one question worth answering before anyone touches anything.** It is settled by
one observation on his device: open DevTools → Network, play round 1, and read the request path.
`…/api/audio/823cf48a-….v2` = the app is on the xAI take. `…/api/audio/0f37d106-…` served `(disk cache)`
= it is the immutable-cache path in §3. `…/api/audio/0f37d106-…` served `200` from the network and
still wrong = my byte analysis is wrong and I want to know.

---

## 6. Explicit gaps

1. **Which side of 10:31:55Z Tom's app test fell on.** Not knowable from this box. See §5.
2. **Whether `1CD434B3…` is audibly the good take.** Whisper-small forced to German transcribes all
   four candidate objects as "Ich will" — including both the January and the 6-August pairs. That
   matches the estate's known finding that whisper is unreliable on sub-second clips, so I am
   **not** claiming from it which take is bad. The prior investigation
   (`58f1ea67`, `docs/audio-repair-2026-08-08/why-the-ich-will-fix-did-not-stick.md`) holds that
   January is the approved take; I have neither confirmed nor contradicted that by ear.
3. **The pre-3-August bytes are unrecoverable from S3.** Both keys show exactly one version, dated
   3 August. Whatever a learner cached before that date cannot be compared against from here.
4. **I did not enumerate every play button in the dashboard.** The four resolution mechanisms above
   (`course_legos` pointer, `course_practice_phrases` pointer, `by-text`, synthesised s3 key) are
   the complete set reachable from `src/views/production/` and `src/components/production/`;
   surfaces outside production (Pod Lab, Vad Lab, Autocue) were not traced, as they do not play
   course LEGOs.

---

## 7. The two structural findings, separated from this one clip

**(a) The revision column is the app's only cache key, and repairs do not always move it.** Any
in-place object change under an `audio_revision = 1` row is invisible to every device that already
holds it. Popty can never see this class of bug, by construction — which is precisely why Popty
sounding right is not evidence that learners hear right. That asymmetry is worth knowing
independently of this clip.

**(b) Four resolution rules, one clip.** Pointer columns, `text_normalized`, `lego_id` and a
synthesised S3 key all answer "what is the audio for S0001L01" and they do not agree. The tombstone
(` ::superseded-regen`) is what splits rule 1 from rule 2, and the stale `lego_id` (`S0241L01`) is
what splits rule 3 from both. Until those agree, every tool's census of this course is measuring a
different course.
