# Who writes `course_audio.language` and `course_audio.voice_id`

**2026-08-06. Write-path audit. Read-only — no code changed, no database touched, no TTS generated.**

> The identity being canonicalised is `(language, text_normalized, voice_id)`
> (`docs/architecture/AUDIO_PIPELINE_CONTENT_ADDRESSED_DESIGN-2026-08-06.md`).
> Two of those three fields are written by 30-odd call sites and normalised by **one**.

---

## The five findings that matter

**1. The canonical language normaliser has exactly one caller in the entire repo.**
`toIso3()` (`services/language-code-service.cjs:526`) is documented as *"the canonical format for
`course_audio.language`"*. Grepping every `.cjs`/`.js`/`.mjs`/`.ts` in `services/`, `tools/`, `api/`,
`database/` and `src/` for `toIso3|bcp47ToIso3` returns its own definition, its own export, its own
alias, one `require` — and **one** call: `services/phases/phase8-audio-v13.cjs:2953`, inside the
`POST /insert` endpoint. Every other writer puts whatever it is holding straight into the column.

**2. No voice-id normaliser exists at all.** There is no function anywhere in this repo that takes a
messy `voice_id` and returns a canonical one. There are four *ad hoc* transformations, all local and
all pointing in different directions: two that **add** a provider prefix, two that **strip** one.
Nothing arbitrates between them.

**3. A canonical voice registry does exist and nothing checks against it.** The `voices` table
(`voice_id` PK, `tts_engine`, `tts_voice_name`, `tts_locale`, `languages`) is written by
`tools/sync/sync-voices-to-supabase.cjs:77` and auto-registered from
`services/voice-config-service.cjs:202-290`. It is *read* in exactly one place that matters —
`services/shared/clone-copy-index.cjs:40`,
`supabase.from('voices').select('tts_engine').eq('voice_id', voiceId)` — and that read is an exact
string match. A course carrying the bare spelling therefore misses its own registry row, comes back
`engine=unknown`, and `clone-copy-pass` refuses every copy with `SKIP_UNTRUSTED_VOICE`. **The drift
already has a live, silent cost.** No `course_audio` write path consults the table at all.

**4. `'auto'` is an xAI TTS *request* parameter that leaks into the persisted identity column.**
Proven, not inferred — the object is traceable end to end (§3 below). `generatePodAudio()`
(`phase8-audio-v13.cjs:5834`) takes `language` as a parameter and writes it verbatim at line 5921.
Two callers hand it the literal `'auto'`.

**5. S3 keys are clean.** Every clip key in the estate is `mastered/<UUID>.mp3` or
`pending/<UUID>.mp3`. **No S3 key or filename embeds a language code or a voice id anywhere.** This
is the one part of the identity story that does not need fixing, and it means the drift is confined
to two database columns.

---

## 1 · The call-site table

`op` — I=insert, U=upsert, Up=update. `norm?` — does the site normalise before writing.
Rows are ordered by how much of the live estate they plausibly account for.

### 1a · `services/phases/` — the production pipeline

| file:line | field | op | exact expression | value shape, traced to origin | norm? | live? |
|---|---|---|---|---|---|---|
| `phase8-audio-v13.cjs:2244` | language | U | `language: item.language` | `item.language` ← `toGenerate.push({… language: item.lang …})` (`:672`, `:690`) ← `slot.lang` ← `course.known_lang` / `course.target_lang` from the `courses` table (`:504-512`). **ISO-639-3.** | pass-through, correct by luck of source | **yes — main generate path** |
| `phase8-audio-v13.cjs:2246` | voice_id | U | `voice_id: item.voiceId` | `item.voiceId` ← `:1939` `item.role === 'presentation' ? presentationVoiceId : getVoiceForRole(item.role)`. `getVoiceForRole` (`:1813-1818`) returns **`` `${v.provider}_${v.voiceId}` ``** when `voice_config.voices[role]` has *both* `provider` and `voiceId` — but **`return v.voiceId \|\| null`** when `provider` is absent. **Prefixed or bare, decided by whether the course's `voice_config` happens to carry a `provider` key.** | no | **yes — main generate path** |
| `phase8-audio-v13.cjs:5921` (`generatePodAudio`) | language | U | `language,` (shorthand) | The caller's parameter, **verbatim, never inspected**. Callers supply: `'auto'` (production-api, §3), BCP-47 `'fr'`/`'pt-PT'`/`'es-MX'` (run-pod-explainer-batch, §3), and ISO-3 `course.target_lang` (rescue tools). | **no — this one function is the single biggest drift inlet** | yes |
| `phase8-audio-v13.cjs:5923` | voice_id | U | `voice_id: voice.voice_id` | The caller's `voice.voice_id`, **raw provider voice name, never prefixed**: `'gfzdpspr5fdp'`, `'eve'`, `'leo'`, or an Azure name. Note `:5910` reassigns `voice = activeVoice` after an xAI→Azure fallback, so a fallback writes the **bare Azure name** (`'en-GB-SoniaNeural'`). | no | yes |
| `phase8-audio-v13.cjs:5975-5978` (`getCourseContext`) | (feeds voice_id) | — | `voice_id: knownVoiceRaw.voiceId \|\| knownVoiceRaw.voice_id \|\| 'en-GB-SoniaNeural'` | Hard-coded **bare** Azure default. Flows into `generatePodAudio`. | no | yes |
| `phase8-audio-v13.cjs:5004` | language | U | `language: item.language` | components path; same ISO-3 origin as `:2244` | pass-through | yes |
| `phase8-audio-v13.cjs:5006` | voice_id | U | `voice_id: item.voiceId` | same `getVoiceForRole` split as `:2246` | no | yes |
| `phase8-audio-v13.cjs:473,475` (`executeCopyBucket`) | both | U | `language: item.language \|\| knownLang`, `voice_id: item.voiceId` | `voiceId` ← `:421` `course.voice_config?.voices?.[role]?.voiceId` — **raw `voiceId`, provider prefix never added.** A **bare**-spelling producer on a path that inserts in bulk. | no | yes |
| `phase8-audio-v13.cjs:2974,2976` (`POST /insert`) | both | U | `language: normalizedLanguage`, `voice_id: voiceId` | `:2953` `const normalizedLanguage = toIso3(language)` | **language: YES — `toIso3`.** voice_id: no. | yes |
| `phase8-audio-v13.cjs:3084` | both | U | `language: knownLang, … voice_id: presentationVoiceId` | `knownLang` = `course.known_lang` (ISO-3). `presentationVoiceId` ← `presentationAuthor.resolvePresentationVoiceId(course)` | no | yes |
| `phase8-audio-v13.cjs:3579,3581` / `3765,3767` | both | U | `language: knownLang … voice_id: presentationVoiceId` | as above; these write `s3_key: 'pending/…'` placeholder rows | no | yes |
| `phase8-audio-v13.cjs:2743` | voice_id | Up | `voice_id: voiceId` | `:2471` `voiceSettings.voiceId \|\| voiceConfig[role]` — **raw `voiceId`, no prefix added.** Bare producer, regenerate-by-role path. | no | yes |
| `phase8-audio-v13.cjs:4109` | voice_id | Up | `voice_id: voiceId` | `:4020` `voiceSettings.voiceId \|\| voiceConfig[role]` — same bare shape, regenerate-single-clip path. | no | yes |
| `phase8-audio-v13.cjs:4322-4323` / `4339-4341` | both | Up / I | `language: knownLang, voice_id: voiceId` | `:4200` `voiceSettings.voiceId \|\| voiceConfig.presentation` — bare; language ISO-3. | no | yes |
| `phase8-audio-v13.cjs:859` | voice_id | (read→requeue) | `voice_id: pres.voice_id \|\| null` | Re-reads whatever is already on a pending row and carries it forward — **a drift amplifier: a bare row stays bare through regeneration.** | no | yes |
| `presentation-author.cjs:267-281` | (feeds voice_id) | — | `` return `xai_${pres.voiceId}` `` / `` `${pres.provider}_${pres.voiceId}` `` / `return pres.voiceId` / `return known?.voiceId \|\| 'azure_en-GB-SoniaNeural'` | **Four return paths, two prefixed, two bare, one hard-coded prefixed default.** The single clearest illustration of the problem. | no | yes |
| `phase2-conflict-resolution/detect.cjs:101,103` | both | U | `language: course.known_lang`, `voice_id: voiceId` where `:55 voiceId = course.voice_config?.presentation \|\| 'azure_en-GB-SoniaNeural'` | language ISO-3; voice = the flat legacy `voice_config.presentation` string (shape unconstrained) or a hard-coded **prefixed** default. Also writes `text_normalized: presText.toLowerCase().trim()` — a *third* normalisation rule, not `normalizeForAudio`. | no | yes |

### 1b · `services/` — everything else

| file:line | field | op | exact expression | value shape, traced to origin | norm? | live? |
|---|---|---|---|---|---|---|
| `production-api.cjs:4166,4169` | both | (via `generatePodAudio`) | `language: EXPLAINER_LANGUAGE` (`:4109 = 'auto'`), `voice: { voice_id: EXPLAINER_VOICE_ID }` (`:4108 = 'gfzdpspr5fdp'`) | **Literal `'auto'` and a bare xAI clone id, both persisted.** See §3. | no | yes |
| `run-pod-explainer-batch.cjs:404-431` | both | (via `generatePodAudio`) | `language: explainerLanguage` where `:387 = resolveExplainerLanguage(target)`; `voice_id: EXPLAINER_VOICE_ID` (`:40`, `process.env.VOICE_ID \|\| 'gfzdpspr5fdp'`) | `resolveExplainerLanguage` (`tools/pod-voice-coverage.cjs`) returns a **BCP-47 cue** — `'fr'`, `'pt-PT'`, `'es-MX'` — falling back to `'auto'` for languages xAI cannot speak. Its own comment at `:45` states the consequence: *"This also changes the `course_audio.language` dedup key."* **The drift is deliberate here, and documented.** | no | yes |
| `pod-explainer-composite.cjs:316,318` | both | U | `language: target`, `voice_id: voiceTag` where `:271` `` voiceTag = `comp:${chunkVoice.voice_id}+${knownVoice.voice_id}` `` | `target` ← `parseCourseCode(courseCode).target` (`pod-explainer-generator.cjs:64-70`) — the course-code prefix, so **ISO-3 but including dialect suffixes like `fra_ca`**, never validated. `voiceTag` is **not a voice id at all** — it is a composite recipe label. This is where `comp:` comes from. | no | yes |
| `supabase-client.cjs:371-378` (`insertCourseAudio`) | both | I | `language,` `voice_id: voiceId` | **Pure pass-through.** Both values are caller-supplied and untouched. A shared helper that could have been the choke point and is not. | no | yes (library) |
| `supabase-client.cjs:418-420` (`upsertCourseAudio`) | voice_id | Up | `voice_id: voiceId` | pass-through; note the pre-check `findCourseAudio(courseCode, text, language, role)` **omits voice**, so this can overwrite a row's voice rather than create a sibling | no | yes (library) |
| `voice-engine/db.cjs:148-156` (`upsertHumanCourseAudio`) | both | U | `language,` `voice_id: voiceId` | Pass-through from the human recording engine; voice ids there are `human_<email>_<lang>` shaped (`production-api.cjs:644`). Consistent with itself, unrelated to TTS drift. | no | yes |
| `voice-engine/pods-registration.cjs:257,259` | both | I/U | `language: context.language`, `voice_id: context.voiceId` | Pass-through from the pod recording context. | no | yes |
| `audio-veracity.cjs:452` | — | — | `language: iso1 \|\| 'auto'` | **NOT a `course_audio` write.** This is a field on the verdict object returned by the whisper check; `iso1` ← `WHISPER_ISO1[raw]`. It never reaches the DB column. Listed because it is a plausible false lead. | n/a | n/a |
| `production-api.cjs:1725` | — | — | `language: language \|\| 'auto'` | **NOT a `course_audio` write.** Voice-*preview* endpoint; the buffer is returned as a base64 data URI (`:1734`) and never stored. Another false lead. | n/a | n/a |
| `voice-config-service.cjs:469` | — | — | `language: voiceConfig.language \|\| 'auto'` | **NOT a `course_audio` write.** A field on the xAI TTS *request* config from `buildTTSConfig`. This is the origin of `'auto'` as a concept — the provider hint meaning "detect". | n/a | n/a |
| `gender-prep-coordinator.cjs:452` | — | I | `language: course.target_lang` | Writes the **gender-expansion** table, not `course_audio`. Out of scope, listed to close the grep. | n/a | n/a |
| `course-qa-gate.cjs`, `s3-deploy-service.cjs`, `manifest-generator.cjs`, `orchestration/orchestrator.cjs`, `course-builder/routes/course-data.cjs`, `voice-engine/pods-router.cjs`, `phases/phase9-manifest-compiler.cjs` | — | — | — | Reference `course_audio` but write **neither** `language` nor `voice_id` (reads, link updates, `s3_key`/`presentation_audio_id` writes only). Triaged and cleared. | n/a | — |

### 1c · `tools/`

| file:line | field | op | exact expression | value shape, traced to origin | norm? | live? |
|---|---|---|---|---|---|---|
| `tools/rescue-child-voice-clips.cjs:105` | voice_id | (via `generatePodAudio`) | `voice_id: (kv.voiceId \|\| kv.voice_id \|\| 'en-GB-SoniaNeural').replace(/^azure_/, '')` | **An explicit, deliberate strip-then-persist.** Takes a correctly-prefixed config value and writes the bare spelling. Plus a bare hard-coded default. **The clearest single bare-row producer in the repo.** | no — actively de-normalises | one-off sweep (logs in `docs/audio-sweeps/child-voice-rescue-*.json`, 2026-07-24) |
| `tools/build-shared-known-store.cjs:314,332,344` | both | U | `language: SHARED_LANG, … voice_id: VOICE_ID` where `:72 SHARED_LANG = 'en'`, `:74 VOICE_ID = 'comp:leo'` | **ISO-639-1 `'en'` hard-coded** (not `'eng'`), and a `comp:` composite tag. `:74`'s own comment — *"matches existing means-X rows"* — shows the drift being deliberately propagated for consistency with prior drift. | no | one-off / periodic |
| `tools/persist-stage0-pod0.cjs:146,148` | both | U | `language: LANGUAGE` (`:56` ← `META.language`), `voice_id: VOICE_ID` (`:57 = 'comp:leo'`) | `:49-50` `spa_for_eng: { language: 'es' }`, `hrv_for_eng: { language: 'hr' }` — **ISO-639-1 hard-coded per course**; the `:52` fallback `COURSE_CODE.split('_')[0]` yields ISO-3. **The same tool emits both shapes depending on whether the course is in its lookup table.** | no | one-off |
| `tools/course-optimization/clone-copy-pass.cjs:126,129` | both | U | `language,` `voice_id: voiceId` via `ownedRow()` | `:218` hard-codes `language: 'eng'` (**correct ISO-3**); `voiceId` is a CLI/config argument, unvalidated — and the same string is used at `:196` for the `voices` registry lookup that decides `trusted`. **A bare spelling here silently downgrades the whole run to `SKIP_UNTRUSTED_VOICE`.** | language: yes (literal) | yes |
| `tools/revoice-clips.cjs:488` | voice_id | I | `voice_id: job._targetVoiceId` | `:404` `storedVoiceId(r._target.voiceId)` — a local helper deciding the *stored* spelling. The whole tool exists to rewrite voice ids; `:110`'s comment notes it keys on provider prefix shape. | local convention only | yes |
| `tools/repair-presentation-clips.cjs:242,244` | both | I | `language: row.language`, `voice_id: row.voice_id` | **Copies the old row's values verbatim.** A repair that faithfully preserves whatever drift it found. | no | yes |
| `tools/breakdown-flat.cjs:84,96` | both | (via `generatePodAudio`) | `language: ATOM_LANG` / `MEANS_LANG`, `voice: ATOM_VOICE` / `MEANS_VOICE` | `:111-118` build `{ voice_id: t1.voiceId, provider, locale }` from `voice_config` — **bare `voiceId`**, or literals `'eve'` / `TOM_CLONE`. `locale` derives from `base(t1.language)`, i.e. ISO-639-1. | no | one-off |
| `tools/render-residue-atoms.cjs:60-62,98` | both | (via `generatePodAudio`) | `language: lang`, `voice: VOICE` | same bare `{ voice_id: t1.voiceId }` / `'eve'` shape | no | one-off |
| `tools/render-take-g.cjs:313,325` | both | (via `generatePodAudio`) | `language: targetLang, … voice` | `targetLang` ISO-3 from the course; voice from `voice_config`, bare | no | one-off |
| `tools/rescue-wrong-language-clips.cjs:212,264` | both | (via `generatePodAudio`) + I | `language: targetLang`, `voice` / `insert(restoreRow)` | ISO-3 target; `restoreRow` is a verbatim rollback of a previously-read row | no | one-off |
| `tools/pod-recolour.cjs`, `tools/pod-sync.cjs`, `tools/slice-take-g.cjs`, `tools/pods/align-welsh-pod0-to-canonical.cjs`, `tools/explainer/compile.mjs`, `tools/prosody-lab/extend-lab-breadth.mjs`, `tools/audio-envelope-batch.cjs` | — | — | — | Write `course_audio` but **not** these two columns (link ids, `s3_key`, `text`, or a different table — `audio-envelope-batch` writes `course_audio_envelope` keyed on `audio_id`). Triaged and cleared. | n/a | — |
| `tools/audio-gender-lint.cjs:53`, `tools/prosody-lab/sample-pairs.cjs:43`, `tools/prosody-lab/remaster-vad-lab-clean.cjs:69` | — | read | `` when voice_id like 'azure_%' or voice_id ~ '^[a-z]{2,3}-[A-Z]{2}-.*Neural' `` | **Read-side workarounds that already encode the drift as a permanent fact of the estate.** Every consumer has independently reinvented the same regex. | n/a | yes |

### 1d · `api/` and `database/` — the legacy importers

| file:line | field | op | exact expression | value shape, traced to origin | norm? | live? |
|---|---|---|---|---|---|---|
| `database/import-course-v13.cjs:202,204` | both | U | `language: language`, `voice_id: 'legacy_import'` | `:196` `audio.role === 'source' ? knownLang : targetLang` — ISO-3 from the manifest. **`'legacy_import'` is a hard-coded literal with the comment `// Unknown from legacy manifest`. This is the origin of the non-voice sentinel.** | no | legacy importer |
| `database/lib/import-legacy-course-core.cjs:182,184` | both | U | `language: language`, `voice_id: 'legacy_import'` | Same shape, same sentinel — the shared-library twin of the above. Between them these two files are **the only producers of `'legacy_import'`**. | no | legacy importer |
| `database/import-course-v13.cjs:219,221` / `import-legacy-course-core.cjs:199,201`, `:289-291`, `:307-309` | both | U | `language: knownLang`, `voice_id: 'human_recording'` | A **second** non-voice sentinel, for course intros and human clips. | no | legacy importer |
| `api/import-course.js:135,138` / `:198,203` / `:219,224` | both | U | `language: language`, `voice_id: sample.voice_id \|\| 'legacy'` | `language` ← `:128` `(role === 'known' \|\| role === 'instruction') ? knownLang : targetLang`. **A *third* sentinel, `'legacy'`** — distinct from `'legacy_import'`. `sample.voice_id` is whatever the legacy manifest carried, unvalidated. | no | legacy importer |
| `api/import-course.js:255,258` | both | U | `language: s.language`, `voice_id: s.voice_id` | Verbatim from `shared_audio` rows | no | legacy |
| `database/copy-shared-to-course.cjs:126,128` | both | I | `language: shared.language`, `voice_id: shared.voice_id` | **Verbatim copy from `shared_audio` into `course_audio` — drift propagates across tables unchanged.** | no | legacy |
| `database/import-welcomes.cjs:125,127` | both | I | `language: 'eng'`, `voice_id: welcome.voice` | Language **correct** (hard-coded ISO-3, with the comment *"Welcomes are in English"*). Voice is whatever the welcome JSON holds. | language: yes (literal) | legacy |
| `api/lib/supabase.js` | — | — | — | Generic client factory; no `language`/`voice_id` write. Cleared. | n/a | — |

### 1e · Database-side

**There is no database-level normalisation of either column. None.** Searching every `.sql` in the
repo for triggers, functions, defaults, checks or generated columns touching `course_audio.language`
or `course_audio.voice_id` returns nothing. The only DB-side text machinery is `normalize_text()`,
which feeds `text_normalized` — the *third* column of the identity, and the only one that is
canonicalised at all. `database/migrations/20260806_audio_link_integrity.sql:36` is explicit that it
deliberately does not redefine it.

Both columns are free-text dumping grounds enforced only by convention, and the convention has three
competing versions.

| file:line | what | note |
|---|---|---|
| `database/migrations/20260806_audio_link_integrity.sql:22,36,54-96,122` | `normalize_text()` used in link triggers | operates on **text only**; language and voice are matched by raw equality |
| `ops/sql/20260805-audio-repair.sql:27` | comment naming `unique_course_audio_per_voice (course_code, text_normalized, language, role, voice_id)` | The five-column key. **Because `language` and `voice_id` are raw, two spellings of the same clip do not collide — they become two rows.** This is the mechanism by which drift becomes duplication. |
| `apml/core/audio-registry-v12.sql:86-98` | a `course_audio` table definition | **Not the live table** — it is the v12 shape (`audio_id` FK to `audio_files`, no `language`/`voice_id` columns at all). `audio_files` is a deprecated table per `CLAUDE.md`. Historical only. |
| `database/migrations/20260714_course_audio_envelope.sql`, `20260805_course_audio_veracity_verdict*.sql`, `20260705_purge_pending_presentation_rows.sql` | other `course_audio` migrations | none touch `language` or `voice_id` |

**No canonical language table exists in the schema.** The language reference is a CSV file —
`tools/sync/reference/language_codes.csv`, loaded at require-time by `language-code-service.cjs:20`.
The voice registry *is* a table (`voices`), described in finding 3.

---

## 2 · The normalisation helpers that exist, and who calls them

| helper | file:line | converts | callers | called by any `course_audio` write path? |
|---|---|---|---|---|
| `toIso3` / `bcp47ToIso3` | `language-code-service.cjs:526` | ISO-3 \| BCP-47 \| ISO-1 → **ISO-639-3** | `phase8-audio-v13.cjs:53` (require), `:2953` (call) | **Once.** `POST /insert` only. |
| `toBcp47` | `voice-discovery-service.cjs:242` | any → **BCP-47 for xAI**; `!code → 'auto'` | `phase8` ×6, `revoice-clips.cjs:235`, `repair-presentation-clips.cjs:125`, `audio-repair.cjs:51`, `render-take-g.cjs:267` | Only for TTS **request** configs — verified at every call site. But it is the function that mints `'auto'` from a falsy input. |
| `getAzureLocale` | `language-code-service.cjs:268` | ISO-3 → `'es-ES'` | required by `phase8:53` | no |
| `databaseToManifest` / `standardToLegacy` | `:374` / `:390` | ISO-3 ↔ ISO-1 | manifest paths | no |
| `parseCourseCode` | `language-code-service.cjs:409` **and** `pod-explainer-generator.cjs:64` | `'fra_for_eng'` → `{known, target}` | **two independent implementations** | `pod-explainer-composite.cjs:316` writes `target` from the second one |
| `normalizeForAudio` / `normalizeText` | `services/shared/text-normalize.cjs` | text → `text_normalized` | ~all writers | yes — **the one identity field that is consistently normalised** |
| `computeAudioKey` | `services/shared/clone-copy-match.cjs:46` | `` `${normalizeForAudio(text)}\|${language}\|${voiceId}` `` | `decideCopy` | **This is the logical dedup key, not an S3 key** — and it interpolates `language` and `voiceId` **raw**. It is the design's identity tuple, already implemented, already vulnerable to both drifts. |
| `getVoiceForRole` | `phase8-audio-v13.cjs:1813` | config → `provider_voiceId` **or** bare | local to `/generate` | yes — and it is a *producer* of both spellings |
| `resolvePresentationVoiceId` | `presentation-author.cjs:267` | course → voice id | `phase8:1937` | yes — four return paths, two spellings |
| `storedVoiceId` | `tools/revoice-clips.cjs:404` | target voice → stored spelling | local | yes, one tool |
| *(none)* | — | **messy voice_id → canonical voice_id** | — | **No such function exists.** |

---

## 3 · Where `'auto'` comes from — proven

`'auto'` is a legitimate xAI TTS request parameter meaning *detect the language*. It is introduced by
`voice-config-service.cjs:469` and `toBcp47`'s falsy branch. The leak into the persisted column
happens because **`generatePodAudio` uses one parameter for both purposes** — it hands `language` to
the TTS config *and* writes it into the row:

```
production-api.cjs:4109   const EXPLAINER_LANGUAGE = 'auto'
production-api.cjs:4166   generatePodAudio({ … language: EXPLAINER_LANGUAGE … })
phase8-audio-v13.cjs:5834 async function generatePodAudio({ courseCode, text, language, role, voice … })
phase8-audio-v13.cjs:5860 const ttsConfig = buildPodTTSConfig(activeVoice, language, courseCode)   ← request
phase8-audio-v13.cjs:5921   language,                                                             ← row
```

No inspection, no conversion, no default between line 5834 and line 5921. The hypothesis is
**confirmed**.

**Two writers emit it:**

1. `production-api.cjs:4109` — `POST /api/admin/pods/:courseCode/generate-explainer-audio`. Constant
   `'auto'`, role `'pod_explainer'`, voice `'gfzdpspr5fdp'`.
2. `run-pod-explainer-batch.cjs:387` — `resolveExplainerLanguage(target)`, which returns `'auto'`
   only *"for languages xAI can't speak (Azure tail)"* (`:44`). For languages xAI **can** speak it
   returns a BCP-47 cue instead — so this one writer emits `'auto'` **and** `'fr'`/`'pt-PT'`/`'es-MX'`
   into the same column depending on the course.

The `'auto'` rows should therefore be overwhelmingly `role='pod_explainer'`, and the choice was
deliberate and Tom-validated (`:41-46`): an explicit target cue pronounces ambiguous tokens better
than `'auto'`. The comment at `:45-46` shows the author knew this changed the dedup key. So the
7,847 rows are not a bug in the sense of a mistake — they are a **TTS tuning parameter that was
never given a column of its own**, and the identity column absorbed it.

> **GAP.** I did not query the database to confirm the role and course distribution of the 7,847
> `language='auto'` rows. The claim above is derived from code alone. A read-only
> `select role, course_code, count(*) … where language = 'auto' group by 1,2` would settle it, and I
> would expect near-100% `pod_explainer`. If a material share turns out to be `known`/`target1`/
> `target2`, there is a writer I have not found.

---

## 4 · Bare vs prefixed Azure voice — which paths made the 104,728

**Deliberate strip-then-persist (unambiguous producers):**

- `tools/rescue-child-voice-clips.cjs:105` — `.replace(/^azure_/, '')` applied to the value that is
  then written. One-off sweeps, 2026-07-24; log files in `docs/audio-sweeps/` bound its volume.

**Never-prefixed-in-the-first-place (the structural producers, and where I expect the bulk):**

- `phase8-audio-v13.cjs:1817` — `getVoiceForRole` returns `v.voiceId` bare whenever the course's
  `voice_config.voices[role]` lacks a `provider` key. This is the **main `/generate` path**.
- `phase8-audio-v13.cjs:421` — copy bucket reads `voice_config?.voices?.[role]?.voiceId` raw.
- `phase8-audio-v13.cjs:2471`, `:4020`, `:4200` — all three regenerate endpoints read
  `voiceSettings.voiceId` raw and `UPDATE`/`INSERT` it directly.
- `phase8-audio-v13.cjs:5923` (`generatePodAudio`) + `:5977` default `'en-GB-SoniaNeural'` — every
  pod clip, plus every xAI→Azure fallback, writes the bare Azure name.
- `presentation-author.cjs:279` — `if (pres?.voiceId) return pres.voiceId`, bare.

**Strip-for-the-API-call only (harmless — verified they do not persist the stripped value):**

- `services/tts-service.cjs:203` — `String(config?.voiceName || config?.voiceId || '').replace(/^azure_/, '')`.
  Consumed inside the Azure SSML request. Confirmed not persisted.
- `services/phases/phase8-audio-from-baskets.cjs:351-352` — `const azureVoiceName = spec.voiceId.replace(/^azure_/, '')`,
  a local for the provider call.
- `phase8-audio-v13.cjs:4973` — `const [provider, voiceName] = item.voiceId.split('_', 2)`; `voiceName`
  goes to the provider, `item.voiceId` (unsplit) goes to the row. Correct.

**Ranking, and what is inference.** *Proven from code:* every path above writes what it writes.
*Inference:* that the structural producers — `getVoiceForRole` and the three regenerate endpoints —
account for the great majority of the 104,728, because they sit on the highest-volume paths and fire
on every course whose `voice_config` omits `provider`, whereas the explicit strip in
`rescue-child-voice-clips` ran as bounded one-off sweeps. **I have not measured this split.** The
decisive query is `select voice_id, origin, min(created_at), max(created_at), count(*) from
course_audio where voice_id !~ '^(azure|xai|elevenlabs|human|comp|legacy)' group by 1,2` — the
created_at clustering would separate one-off sweeps from continuous production writes, the same
batch-window technique that worked in the ZUT fix sweep. I did not run it.

**The other spellings:**

| spelling | producer | evidence |
|---|---|---|
| `xai_leo`, `xai_eve`, `xai_gfzdpspr5fdp` | `getVoiceForRole` (`phase8:1816`) and `resolvePresentationVoiceId` (`presentation-author.cjs:272`) when `provider` is present | ``  `${v.provider}_${v.voiceId}` `` / `` `xai_${pres.voiceId}` `` |
| bare `leo`, `eve`, `gfzdpspr5fdp` | `generatePodAudio` (`phase8:5923`) — pod/explainer paths pass `{voice_id}` with `provider` in a *sibling* field, so the prefix is never joined | `production-api.cjs:4108`, `run-pod-explainer-batch.cjs:40`, `breakdown-flat.cjs:111-118` |
| `comp:leo`, `comp:<a>+<b>` | `pod-explainer-composite.cjs:271` `` `comp:${chunkVoice.voice_id}+${knownVoice.voice_id}` ``; hard-coded as `'comp:leo'` in `build-shared-known-store.cjs:74` and `persist-stage0-pod0.cjs:57` | **Not a voice — a composite-recipe label.** It identifies a two-voice spliced assembly, which genuinely has no single voice id. It needs a *decision*, not a normalisation: either a role/kind column, or a canonical composite grammar. |
| `legacy_import` | `database/import-course-v13.cjs:204`, `database/lib/import-legacy-course-core.cjs:184` | hard-coded, `// Unknown from legacy manifest` — **confirmed** |
| `legacy` | `api/import-course.js:138,203,223` | `sample.voice_id \|\| 'legacy'` — a **distinct third sentinel** |
| `human_recording` | `import-course-v13.cjs:221`, `import-legacy-course-core.cjs:201,291,309` | a **fourth** sentinel |
| `human_<email>_<lang>` | `production-api.cjs:644` | the real human-voice scheme; internally consistent |

So the sentinel problem is larger than stated in the brief: **four** non-voice sentinels, not one.

---

## 5 · S3 keys and filenames

Every audio object key in the estate is a bare UUID under a fixed prefix:

- `` `mastered/${audioId}.mp3` `` — `phase8:2224, 2728, 5029, 5547, 5898`, `pod-explainer-composite.cjs:307`,
  `revoice-clips.cjs:480`, `repair-presentation-clips.cjs:208`, `orchestrator.cjs:8767, 9432`,
  `presentation-service.cjs:243`, `voice-engine/synthesis-job.cjs:428`, `s3-deploy-service.cjs:37, 63, 497, 603`,
  `production-api.cjs:4495, 9480`
- `` `pending/${uuidv4().toUpperCase()}.mp3` `` — `phase8:3085, 3583, 3769`, `phase2/detect.cjs:105`
- `` `${CANDIDATE_PREFIX}/${candidateId.toUpperCase()}.mp3` `` — `audio-repair-core.cjs:342`
- `segments/<course>/<voice-slot>/<uuid>.mp3` — human recordings, `voice-engine/`; the middle segment
  is a **voice slot** (`human_marija_mkd`), not a TTS voice id, and does not participate in the drift.

**No key builder embeds a language code. No key builder embeds a TTS voice id.** There is no shared
key-builder helper — the `mastered/${uuid}.mp3` template is duplicated across ~15 files — but because
the only variable is a UUID, the duplication carries no drift risk. The one place a voice appears in
a path is `preflight-check-service.cjs:693`, `` `samples_database/voices/${voiceId}/samples.json` `` —
a voice sample catalogue, not a clip.

This is genuinely good news for the migration: **the content-addressed rename touches two database
columns and no object keys.**

---

## 6 · Explicit gaps

1. **No `supabase/schema.sql` in this checkout.** `CLAUDE.md` names it the schema source of truth; it
   does not exist here, nor does the `supabase/` directory. My DB-side findings come from
   `database/migrations/*.sql` and `ops/sql/*.sql` only. **The live definition of
   `unique_course_audio_per_voice`, and any trigger added outside the migrations pile, is unverified.**
   I am confident there is no normalising trigger because nothing in the repo creates one, but I
   cannot prove the live database matches the repo.
2. **No database queries run.** Every claim here is from code. The role/course distribution of
   `language='auto'`, and the split of the 104,728 bare rows across producers, are unmeasured — see
   the two queries named in §3 and §4.
3. **Volume attribution is inference.** I can name every producer; I cannot rank them by row count
   without the `created_at` clustering query.
4. **`tools/pod-voice-coverage.cjs:resolveExplainerLanguage` read only at its call site.** I did not
   read its full mapping table, so I cannot enumerate exactly which BCP-47 cues reach the column —
   only that they are BCP-47 and that `'auto'` is the fallback.
5. **`src/` not audited for writes.** 20 files reference `course_audio`; spot-checking found reads
   and dashboard display only, and no `.insert`/`.upsert`/`.update` on `course_audio` appeared in the
   write-op scan. If a Vue/TS surface writes these columns, I have missed it.
6. **`e2e/` triaged as tests, not audited line by line.** One file references `course_audio`.
7. **The `voices` table's own contents are unverified.** I established that it exists, who writes it
   (`sync-voices-to-supabase.cjs`, `voice-config-service.cjs`) and who reads it
   (`clone-copy-index.cjs:40`). Which spelling its `voice_id` column actually holds — and therefore
   which spelling "canonical" should mean — is a read-only query I did not run, and it is the single
   most useful next question.
8. **`voices.json` not found.** `sync-voices-to-supabase.cjs` reads a voices config; no `voices.json`
   exists in this checkout. Its input source is unverified.

---

## 7 · What this implies for the canonicalisation

Stated as findings, not as a plan — the design call is Tom's and Kai's.

- **There is one obvious choke point and it is already built.** `computeAudioKey` in
  `services/shared/clone-copy-match.cjs:46` is literally the design's identity tuple. It interpolates
  both fields raw. Normalising *inside it* fixes the dedup path; normalising the two DB columns needs
  a separate gate.
- **`toIso3` is ready and unused.** It already accepts ISO-3, BCP-47 and ISO-1 and returns ISO-3.
  Adding it to the write path is a smaller job than writing anything new. Its one weakness: it
  returns the input lowercased when it recognises nothing, so `'auto'` survives it unchanged.
- **The voice side has nothing to reuse.** A canonical voice function does not exist and would be new
  code — but the `voices` table can be its authority rather than a new hard-coded map.
- **`comp:` and the four sentinels are not spelling drift.** They are values in the voice column that
  are not voices. Normalisation cannot resolve them; they need a decision about what the column means.
- **`'auto'` is a TTS parameter with no home.** The explainer path deliberately varies the language
  cue per course for pronunciation reasons, and `course_audio.language` is the only field it has to
  put it in. Canonicalising the column without giving that cue somewhere else to live would undo a
  Tom-validated 2026-06-07 improvement.

---

*Audit performed 2026-08-06 against `main` at `119c4719`. Read-only: no code changed, no database
touched, no TTS generated.*
