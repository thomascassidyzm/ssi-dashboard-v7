# Read-path audit: who filters `course_audio` by `language` / `voice_id`, and which rows they miss

**2026-08-06. Audit only — no code changed, no database touched, no audio generated.**

Companion to `docs/architecture/AUDIO_PIPELINE_CONTENT_ADDRESSED_DESIGN-2026-08-06.md`, which
canonicalises a clip's identity to `(language, text_normalized, voice_id)`. Both of those key
columns are spelled inconsistently in live data today:

- `course_audio.language` holds ISO-639-3 (`eng`), ISO-639-1 (`en`), BCP-47 (`en-GB`, `pt-BR`,
  `fr-CA`) and the literal `auto`.
- `course_audio.voice_id` holds the same voice under 2–3 spellings — `azure_en-GB-SoniaNeural` vs
  `en-GB-SoniaNeural` (414k rows), `xai_eve` vs `eve`, `xai_leo` vs `comp:leo` vs `leo` — plus the
  sentinel `legacy_import`. ~100 voice bases have more than one spelling.

Every read that filters on one spelling silently misses the rows written under the other. This
document is the inventory.

---

## Headline findings

1. **The learner-facing repo never filters `course_audio` by `language` or `voice_id` at all.**
   Every learner read keys on `course_code` + `role` + `id`/`lego_id`/`text_normalized`. So the
   spelling drift in those two columns cannot, by itself, silence a learner. That is the single
   most important result of this audit, and it is luck rather than design — the two learner reads
   that *do* filter by language hit `shared_audio`, not `course_audio` (F4).

2. **The drift bites hardest as a multiplicity problem, not a mismatch problem.** Two spellings of
   the same voice produce two rows on the same `(course_code, text_normalized, role)`. Two
   learner-path lookups use `.maybeSingle()` on exactly that triple (F1) and two dedup checks use
   `.single()` (F7, F9). `.single()`/`.maybeSingle()` fail on *more than one* row, and the callers
   treat that failure as "no audio". Drift therefore converts into silence and into repeat spend.

3. **There is no `voice_id` canonicaliser anywhere in either repo.** Not one. The only handling is
   four ad-hoc `.replace(/^azure_/, '')` calls on the *write*/dispatch side
   (`services/tts-service.cjs:203`, `services/phases/phase8-audio-from-baskets.cjs:352`,
   `tools/rescue-child-voice-clips.cjs:110`) and one substring-match gender table
   (`tools/audio-gender-lint.cjs:53`, which explicitly names the prefix inconsistency). Every
   `.eq('voice_id', …)` in the estate is a single-spelling read.

4. **The one language canonicaliser fails open and manufactures new spellings.**
   `toIso3()` (`services/language-code-service.cjs:526`) maps a BCP-47 locale to ISO-639-3 only via
   `azureToDatabase`, which is built from a CSV holding *one* locale per language (`en-GB`,
   `fr-FR`, `pt-PT`). Anything else falls through line 542 and is returned **lowercased as-is**:
   `en-US → en-us`, `pt-BR → pt-br`, `fr-CA → fr-ca`, and `auto → auto`. So the function that is
   supposed to remove drift is a source of it — and it lowercases, so a read passing the literal
   `'pt-BR'` misses rows written `'pt-br'` and vice versa. `'auto'` originates at
   `services/tts-service.cjs:411` (`language = 'auto'` default) and passes through untouched.

5. **The fallback resolver that would absorb all of this has zero production call sites.**
   `services/shared/audio-fallback-resolver.cjs` implements Tom's "always play what it has"
   doctrine, and `resolveAudio`/`resolveAudioBatch` are imported by **nothing but their own test
   file**. Nothing on any serve path currently benefits from it. (And when it is wired, note that
   `sameSlot()` at line 113 does a strict `row.language !== language` — it will need a canonical
   comparison, not `!==`, or it becomes finding F1's cousin.)

6. **The SQL relink RPC is drift-immune but voice-blind.** `audio_id_for_text()`
   (`database/migrations/20260806_audio_link_integrity.sql:112-124`) filters on
   `course_code + role + normalize_text(text)` with **no** language or voice predicate. It cannot
   miss a row through spelling — but it will happily link a clip in whatever voice the winning row
   carries, which is exactly the mechanism the new identity key is meant to make explicit.

---

## Ranked findings

Rank key: **SERVE** = learner hears silence or the wrong voice · **GUARD** = a precious-audio /
human-recording check that can miss rows · **DEDUP** = an existence check that causes repeat TTS
spend or false "missing" · **TOOL** = one-off / operator surface.

| # | Rank | File:line | Filter | Spelling assumed | Rows missed today |
|---|------|-----------|--------|------------------|-------------------|
| F1 | SERVE | `ssi-learning-app` `packages/player-vue/src/composables/useScriptCache.ts:654-659` | `.eq('course_code',…).eq('text_normalized', text.toLowerCase().trim()).eq('role',…).maybeSingle()` | none for language/voice — but **assumes at most one row per (course, text, role)** | Any slot where two voice spellings produced two rows → `maybeSingle()` errors → treated as no audio → **silence**. Also misses every row whose stored `text_normalized` was punctuation-stripped by `normalize_text()` (the caller strips nothing). |
| F2 | SERVE | `ssi-learning-app` `packages/player-vue/src/components/CourseExplorer.vue:601-606` | identical to F1 | as F1 | as F1, on the explorer surface. |
| F3 | SERVE | `services/shared/audio-fallback-resolver.cjs:113` (`sameSlot`) | `row.language !== language` → candidate dropped | caller's spelling, exact | Every candidate row whose `language` is spelled differently is discarded before matching — i.e. the "play what we have" tier would refuse the very rows it exists to rescue. **Currently unreachable: no production caller (see headline 5).** |
| F4 | SERVE | `ssi-learning-app` `packages/player-vue/src/providers/CourseDataProvider.ts:655` and `:692` | `.from('shared_audio').eq('audio_type','instruction'\|'encouragement').eq('language', knownLang)` | **ISO-639-3**, derived as `courseId.split('_for_')[1]` (`fra_for_eng` → `eng`) | Any `shared_audio` row stored `en`/`en-GB` is invisible → that learner gets **no instructions and no encouragements at all**, silently (`if (error \|\| !data) return []`). Spelling census of `shared_audio.language` not run — see Gaps. |
| F5 | SERVE-adjacent | `api/pod-content.js:103` and `:125-127` | `.eq('voice_id','comp:leo')`, and `.eq('course_code','pod_known_en').eq('language','en')` | hardcoded bare `comp:leo` + **ISO-639-1 `en`** | Self-consistent with the writer (`tools/build-shared-known-store.cjs:74` writes `comp:leo`/`en`), so it works *today*. It is the only `language='en'` read in the estate: the moment that store is rewritten through `toIso3()` it becomes `eng` and every pod explainer goes silent. Fragile by construction. |
| F6 | GUARD | `services/phases/phase8-audio-v13.cjs:262-263` (`humanRowAtAudioKey`) | `.in('text_normalized', keys).eq('language', language).eq('role',…).eq('voice_id', voiceId).eq('origin','human')` | caller's spelling, exact, for **both** key columns | The guard was widened on 2026-08-06 to match either *text* convention but still matches exactly one language spelling and one voice spelling. A human recording registered under `en-GB-SoniaNeural` is invisible to a render dispatched as `azure_en-GB-SoniaNeural`. Mitigating: the upsert conflict key uses the same five columns, so a spelling difference yields a **twin row rather than an overwrite** — the damage is a duplicate paid render plus an unlogged, unnoticed second copy of a precious take, not a clobber. Call sites: `:2066`, `:2960`, `:4551`, `:4915`, `:5522`. |
| F7 | DEDUP (money) | `services/phases/phase8-audio-v13.cjs:2084-2091` | cross-course reuse: `.neq('course_code',…).eq('text_normalized',…).eq('language', item.language).eq('voice_id', item.voiceId)….single()` | `item.language` = `course.known_lang`/`targetLang` verbatim; `item.voiceId` = course voice config verbatim | This is the query that saves money by reusing a sibling course's S3 file. It misses every sibling clip stored under another spelling, **and** `.single()` errors when drift has produced two — the error is discarded (`const { data: siblingAudio }`) and the code falls straight through to paid TTS. Directly undermines the 236,908-render dedup win the design doc is built on. |
| F8 | DEDUP | `services/phases/phase8-audio-v13.cjs:5806-5808` (`findExistingAudio`) | `.eq('course_code',…).eq('text_normalized',…).eq('language',…).eq('role',…).eq('voice_id',…)` | caller's spelling, exact | This is the literal shape of the new identity key, one course-code narrower. Single-spelling on both key columns → "clip does not exist" → re-render. |
| F9 | DEDUP | `services/supabase-client.cjs:279-300` (`courseAudioExists`), `:329-350` (`findCourseAudio`); mirrored in `api/lib/supabase.js:137`, `:199` | `.eq('language', language)…single()`, `if (error && error.code !== 'PGRST116') throw` | caller's spelling | Two failure modes stack: wrong spelling → no row; *and* PostgREST returns `PGRST116` for "zero **or more than one** row", which this code unconditionally reads as "does not exist". Drift-created twins therefore report **absent**. |
| F10 | DEDUP | `services/shared/clone-copy-index.cjs:123` and `:134` | `.eq('voice_id', voiceId).eq('language', language)` | fed from `services/phases/phase8-audio-v13.cjs:425` with **hardcoded `language: 'eng'`** | The clone-copy source index cannot see any English clip stored as `en`, `en-GB` or `auto`. Every such clip is re-rendered instead of copied. |
| F11 | DEDUP | `services/voice-engine/db.cjs:110-112` (`fetchExistingAudioTexts`) | `.eq('course_code',…).eq('role',…)` + optional `.eq('voice_id', voiceId)` | caller's spelling when supplied | Drives "which texts still need recording". A voice-spelling miss tells the recordist a text is unrecorded when a take already exists — wasted human recording sessions, and a second human row on the same text. |
| F12 | GUARD / reversibility | `services/voice-engine/pods-registration.cjs:244-249` | prior-row lookup `.eq('language', context.language).eq('voice_id', context.voiceId)` before the human upsert | `context.*` verbatim from the recorder | A prior take stored under another spelling is not found, so `recording_provenance` never records the replaced `s3_key`. That is the reversibility leg of make-before-break going quietly missing (CLAUDE.md §approval gates). |
| F13 | PIPELINE | `services/production-api.cjs:6755-6756`, `:6775-6776`, `:6795-6796` | `audio_registry`: `.eq('language', course.known_lang \| course.target_lang).eq('voice_id', course.known_voice \| target1_voice \| target2_voice)` | whatever the `courses` row holds — provenance is course config, unverified against `audio_registry` spellings | Durations/audio ids resolve to nothing when the course row's voice spelling differs from the registry's; the map is simply short, no error raised. |
| F14 | PIPELINE (import) | `api/import-course.js:178`, `:246`; `database/copy-shared-to-course.cjs:73`; `database/lib/import-legacy-course-core.cjs:262`, `:355`; `database/import-shared-audio.cjs:184`, `:190` | `.from('shared_audio').eq('language', knownLang \| course.known_lang)` | ISO-639-3 from the manifest / `courses.known_lang` | A spelling mismatch makes a new course import **zero** instructions/encouragements and report success. `api/import-course.js:178` additionally uses the count as a skip-guard, so a mismatch can also cause a *duplicate* import. |
| F15 | PIPELINE (legacy) | `services/phases/phase9-manifest-compiler.cjs:274`, `:302`, `:434`, `:450` | `db.courseAudioExists(uuid)` — **one argument against a four-argument signature** `(courseCode, text, language, role)` | none: `language`/`role` arrive `undefined`, so the query is `language=eq.undefined` | Not a spelling bug — a wiring bug. This existence check can never return true, so the legacy manifest compiler believes every clip is missing, always. Legacy path (CLAUDE.md: manifest-generator is not on the learner path), but worth killing rather than fixing. |
| F16 | PIPELINE (legacy) | `services/manifest-generator.cjs:365`; `services/phases/generate-legacy-manifest.cjs:270`, `:279`, `:292`; `services/production-api.cjs:3718-3720`, `:3828-3835`, `:6016-6022` | `.from('shared_audio').eq('language', knownLang3 \| knownLang)` | ISO-639-3 | Same class as F14, on legacy/manifest surfaces that are not on the learner path. |
| F17 | TOOL | `tools/build-shared-known-store.cjs:206`, `:217` (`VOICE_ID = 'comp:leo'`); `tools/persist-stage0-pod0.cjs:119-121`, `:172-174`; `tools/rescue-child-voice-clips.cjs:149`, `:309` (`.in('voice_id', CHILD_VOICE_IDS)`, bare names, `.replace(/^azure_/,'')` on write); `tools/prosody-lab/sample-pairs.cjs:161` (prefixed `azure_*` only), `:142` (`language = 'eng'`) | hardcoded constants | Each is single-spelling. **`rescue-child-voice-clips.cjs` writes** — its `.in()` selection is bare-name-only, so a prefixed twin is neither rescued nor seen, and it re-writes `voice_id` stripped, actively creating a new spelling of an existing voice. Operator-run, so blast radius is a human decision, but it is the one tool in this list that manufactures drift. |
| F18 | TOOL | `services/voice-config-service.cjs:204`, `:255`; `services/voice-engine/team-router.cjs:142`; `src/services/supabase.js:331` | `.eq('voice_id', voiceId)` against the `voices` table | whatever the caller holds | Not `course_audio`, but the same key: a voice looked up under the spelling stored in `course_audio` will miss its own registry row when the registry stores the other spelling. This is where a canonicaliser would have to be anchored. |

### Verified safe (checked and clean)

- **All learner-facing `course_audio` reads in `ssi-learning-app`** key on `id`, `course_code`,
  `role`, `lego_id` or `text_normalized` only — no `language`, no `voice_id`:
  `packages/player-vue/src/providers/CourseDataProvider.ts:358`, `:562`, `:605`;
  `providers/generateLearningScript.ts:410`, `:832`; `providers/revisedAudioRefs.ts:71`;
  `composables/useScriptCache.ts:735`, `:775`; `composables/useLayer1Scheduler.ts:422`;
  `composables/usePodLapScheduler.ts:421`; `composables/listeningMetaCache.ts:237`, `:262`, `:273`;
  `composables/useListeningPods.ts:184`; `composables/usePodStage0.ts:106`;
  `components/ListeningOverlay.vue:351`; `api/audio/[audioId].ts` (by id);
  `api/courses/[code]/bundle.ts:397` (by role). Caveat: F1/F2 above are `text_normalized` reads that
  are safe on *spelling* and unsafe on *multiplicity*.
- **`@ssi/core`** (`packages/core/src/**`) contains no Supabase audio query at all — `voice_id`
  appears only as a type in `data/database-types.ts:64`.
- **`audio_id_for_text()`** (`database/migrations/20260806_audio_link_integrity.sql:112-124`) — no
  language or voice predicate, so drift-immune (voice-blind by design; see headline 6).
- **`pickPreferredAudioRow()`** (`services/shared/audio-link-preference.cjs`) — pure, keys on
  `origin`/`created_at`/`id`; no language or voice comparison. Correct as-is under any spelling.
- **`services/phases/phase8-audio-v13.cjs:2953-2977`** (`POST /insert`) — normalises language with
  `toIso3()` for *both* the guard call and the upsert, so guard and write agree within that path.
  (It does not normalise `voice_id`; nothing does.)

---

## Detail on the top five

### F1/F2 — the learner's lazy audio lookup turns drift into silence

```ts
// packages/player-vue/src/composables/useScriptCache.ts:654
.from('course_audio')
.select('id, s3_key')
.eq('course_code', courseCode)
.eq('text_normalized', text.toLowerCase().trim())
.eq('role', role)
.maybeSingle()
```

Two independent defects, both silent:

1. **Multiplicity.** `.maybeSingle()` tolerates zero rows and fails on more than one. Two spellings
   of the same voice put two rows on `(course_code, text_normalized, role)` — precisely the
   pre-condition this query cannot survive. The caller has no error branch, so the slot resolves to
   no audio.
2. **Normalisation.** `text.toLowerCase().trim()` strips no punctuation, while the DB trigger writes
   `text_normalized` via `normalize_text(t) = rtrim(lower(trim(t)), '.?!¿¡。？！')`. Any slot whose
   text ends in a stop or a question mark can never match. This is the same class of bug documented
   in `services/shared/text-normalize.cjs`, on the learner side, where nothing has been fixed. Note
   `packages/core/src/pods/fusionDrill.ts:126` carries a *third* normaliser (a mirror of the JS
   `normalizeForAudio`), so the learner repo now holds two disagreeing rules and the DB a third.

### F4 — instructions and encouragements are the one learner read keyed on language

```ts
// packages/player-vue/src/providers/CourseDataProvider.ts:645-656
const knownLang = this.courseId.split('_for_')[1] || ''   // 'fra_for_eng' -> 'eng'
…
.from('shared_audio').eq('audio_type', 'instruction').eq('language', knownLang)
```

The spelling is forced to ISO-639-3 by the course code, so it is at least *deterministic* — but it
is only correct if `shared_audio.language` is uniformly ISO-639-3. If any known language's rows were
written `en`/`en-GB`, every learner on every course with that known language silently gets an empty
instruction and encouragement set. The failure is invisible: both methods `return []` on error.

### F6 — the precious-audio guard sees one spelling of one voice

The guard is the right shape and was hardened on 2026-08-06 to match either *text* convention. It
was not hardened against key-column drift: `.eq('language', language).eq('voice_id', voiceId)`.
Because the upsert conflict key is the same five columns, a spelling difference produces a duplicate
row rather than an overwrite — so this is not a repeat of the 2026-08-06 clobber. It is a quieter
harm: a second paid render of a text a human already recorded, a second precious-ish row nobody
knows about, and a guard log line that never fires. When the identity key narrows to
`(language, text_normalized, voice_id)` **the protection changes character**: the course code leaves
the key, so twins across courses collapse onto one identity and a spelling-blind guard starts
deciding which of two rows is "the" clip. This is the finding most worth fixing before the migration,
not after.

### F7 — the cross-course reuse query is where drift costs money

```js
// services/phases/phase8-audio-v13.cjs:2084
const { data: siblingAudio } = await supabase.from('course_audio')
  .select('s3_key, duration_ms, word_boundaries')
  .neq('course_code', courseCode)
  .eq('text_normalized', normalizeForAudio(item.text))
  .eq('language', item.language)
  .eq('voice_id', item.voiceId)
  .not('s3_key', 'like', 'pending/%')
  .limit(1).single()
```

`.limit(1).single()` still errors when the underlying set has more than one row before the limit is
applied in some PostgREST versions, and the error object is not captured at all — every failure mode
here reads as "no sibling clip", and the code proceeds to pay for TTS. Combined with `item.language`
being the raw course-config spelling and `item.voiceId` the raw voice-config spelling, this is the
single highest-cost read in the estate: it is the mechanism behind the design doc's 236,908
redundant renders.

### F10 — clone-copy is pinned to `language: 'eng'`

`services/phases/phase8-audio-v13.cjs:425` calls
`buildSourceIndex(supabase, { voiceId, language: 'eng', texts })`. The index query
(`services/shared/clone-copy-index.cjs:123`) then filters `.eq('language', 'eng')`. Every English
clip written as `en`, `en-GB` or `auto` is outside the index, so clone-copy will not find it and the
clip is rendered again. Given `azure_en-GB-SoniaNeural`/`en-GB-SoniaNeural` alone accounts for 414k
rows, English is exactly the population where this matters most.

---

## What this implies for the identity migration

Stated as observations, not as a plan — the design doc owns the plan.

1. The migration narrows the key from five columns to three. Two of the three are the drifting ones.
   Every read in the table above that today misses rows will, after the migration, be *choosing
   between* rows on a key it cannot spell consistently.
2. A canonicaliser for `voice_id` does not exist and would have to be written from scratch; the one
   for `language` (`toIso3`) fails open and must be made total (or made to throw) before it can be
   trusted on a read path — today it is a drift *source*.
3. The natural anchor for both is the `voices` table (F18) plus
   `services/language-code-service.cjs`, since those are already the two registries the estate
   consults.
4. `resolveAudio` should be wired before the key narrows, not after: it is the only component that
   already implements "never end a round on a missing clip", and it is currently dead code.

---

## Explicit gaps

- **No database was queried.** Per the audit brief, this is a code-read audit only. Every claim
  about *which* spellings exist in a column is taken from the brief (for `course_audio`) and is
  **unverified for `shared_audio.language`, `courses.known_lang`/`target_lang`,
  `courses.known_voice`/`target1_voice`/`target2_voice`, `audio_registry.language`/`voice_id`, and
  `voices.voice_id`**. F4, F13 and F14 hinge on those censuses. The settling query is
  `SELECT language, count(*) FROM shared_audio GROUP BY 1` and the same shape per column above.
- **`.single()` / `.maybeSingle()` multi-row behaviour** (F1, F7, F9) is asserted from PostgREST
  semantics and the surrounding error handling, not from a live probe. It is the load-bearing
  assumption behind ranking F1 first; a five-minute probe against a known duplicated key would
  confirm or kill it.
- **Runtime provenance of `item.voiceId`** in phase8 was traced to course voice config
  (`voiceConfig.voices.*.voiceId`, defaults such as `'azure_en-GB-SoniaNeural'` at `:3034`, `:3461`
  and `services/phases/presentation-author.cjs:280`, and `'xai_gfzdpspr5fdp'` at
  `presentation-author.cjs:28`) but **not to the stored `voices` rows** — so which spelling a given
  live course actually dispatches is not established here.
- **Vue dashboard views** (`src/views/**`) were scanned for `course_audio` reads; only
  `src/services/supabase.js:331` filters on `voice_id` (F18). Views that read via the production API
  inherit F13/F16 rather than adding their own filters — not individually enumerated.
- **Generated/compiled artefacts** (`apml/compiler/**` output, `tools/registry-compiler/test-output`)
  were excluded as non-executing.
