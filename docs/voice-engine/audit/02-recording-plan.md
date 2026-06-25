# Audit 02 — Recording Plan Pipeline (minimal-recording planner)

Audited: 2026-06-10, worktree `/Users/tomcassidy/SSi/wt-voice-engine` (feature/human-voice-engine, synced to origin/main).
Persona lens: a community course leader ("Richard", Macedonian for French speakers) with helper contributors, needing >= 2 distinct human voices.

Files audited:
- `tools/recording-optimizer/generate-recording-script.cjs` (the planner)
- `services/production-api.cjs` lines 6706-6871 (`GET /api/production/:courseCode/recording-optimizer`, `GET .../recording-script`) and lines 4024-4115 (`POST .../recording/upload`)
- `src/views/RecordingOptimizer.vue`
- `src/composables/useAutocueState.js` (script-mode consumer + uploader)
- `src/views/production/RecordingStudio.vue` (queue-mode consumer + uploader)
- `api/production/[courseCode]/audio-pipeline/plan.js` (the conflicting "plan" handler — see Schema Drift)
- `services/supabase-client.cjs`, `api/lib/supabase.js` (DB connections)
- Live DB: one-row read-only selects against `course_practice_phrases`, `course_legos`, `course_seeds` (creds from the main repo `.env` via `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`; service-role client)

---

## 1. Claim verification

### (a) `totalPhrases` is fabricated as `totalLegos * 10` — VERIFIED
`services/production-api.cjs:6746`:
```js
totalPhrases: result.statistics.totalLegos * 10 // Approx phrases generatable
```
The planner itself never computes a "phrases generatable" number; the API invents one. This fabricated figure is the headline of the Vue page's two flagship sentences — "Recording Efficiency: N recordings → X phrases" (RecordingOptimizer.vue line 83) and "The Magic … synthesize audio for all X phrases" (line 216) — and the "Day 1" line in Quality Progression (line 348). The real candidate-phrase count is known to the planner (it loads every row of `course_practice_phrases`) but is not used. Richard is shown a marketing-shaped guess, not a measurement.

### (b) `recordedCount` / `splicedCount` in RecordingOptimizer.vue are TODO stubs — VERIFIED
`src/views/RecordingOptimizer.vue:434-438`:
```js
// Coverage stats (will be computed from actual recordings later)
const recordedCount = ref(0) // TODO: fetch from audio inventory
const splicedCount = ref(0)
```
Both are hard-coded `ref(0)` and never updated by any fetch. Consequences:
- The header "Phrases 0 / N" always shows 0 recorded.
- The Coverage ring's emerald (recorded) and violet (spliced) arcs are always zero-length; "Pending" always equals the full total.
- `flaggedPhrases = ref([])` (line 450) is likewise never populated — the "Flagged Splices" panel is permanently empty ("No flagged splices yet"), despite real flag tables (`audio_flags`, `sample_flags`) existing in `services/supabase-client.cjs`.
The page has no notion of progress: Richard's team can record for a week and this screen will still say 0.

### (c) Export-PDF is disabled — VERIFIED
`src/views/RecordingOptimizer.vue:236-243`: the button carries a hard-coded `disabled` attribute and `title="Not implemented yet"`. The `exportPDF()` handler (line 623) is `alert("Export PDF isn't available yet.")` — unreachable anyway because the button is disabled. There is no other export path (no CSV, no print view). The only way to get the full script out is the JSON endpoints or the CLI `--output` flag — useless to a non-technical voice contributor.

### (d) SCHEMA DRIFT — VERIFIED (with corrected file location), and the LIVE truth sides with the optimizer
The conflicting `plan.js` is **not** in `tools/recording-optimizer/` — it is the Vercel serverless handler `api/production/[courseCode]/audio-pipeline/plan.js` (audio-pipeline plan, i.e. the other "plan" surface a leader would hit from a Vercel deploy).

| | optimizer (`generate-recording-script.cjs`) | `api/.../audio-pipeline/plan.js` | LIVE database (queried 2026-06-10) |
|---|---|---|---|
| phrase text columns | `known_text`, `target_text` (lines 306, 317, 327) | `known`, `target` (line 50: `.select('known, target')`) | `known_text`, `target_text` — **no `known`/`target` columns exist** |
| phrase role filter | none (takes all roles) | none | `phrase_role` values in live data: `build`, `component`, `use` — **no `practice`** |

Live columns recorded from a one-row select of `course_practice_phrases`:
`id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, difficulty, register, metadata, status, release_batch, version, updated_at, created_at, target_syllable_count, phrase_role, connected_lego_ids, lego_position, known_audio_id, target1_audio_id, target2_audio_id, qa_checked, target1_duration_ms, target2_duration_ms, lego_id, target_text_roman, target_phrase_id, presentation_audio_id, introduce, decomposition, decomposition_course_version, display_tiling, display_tiling_version`

`course_legos` live columns include `known_text, target_text, type, is_new, seed_number, lego_index, lego_id, components, …` — everything the optimizer selects exists. **The optimizer matches the live schema; `plan.js` does not.** Its `.select('known, target')` returns PostgREST error 42703 (column does not exist), so `plan.js` 500s ("Failed to generate audio plan") for every course on every call. It connects via `api/lib/supabase.js` (`SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_KEY`, service role).

`practice` vs `build`: per CLAUDE.md the role `practice` was renamed `build` (Feb 2026), confirmed live. Neither the optimizer nor plan.js filters on `phrase_role`, so nothing breaks at query level, but legacy `'practice'` labels survive as display/provenance strings: the optimizer's own `source: 'practice'` provenance label (line 403), `api/courses/[courseCode]/script.js` (`type: 'practice'`, also queries a non-existent audio role `'source'`), and `api/production/[courseCode]/script-view.js` (`phraseType = 'practice'`). Note the optimizer's field name `source` is itself banned SSi vocabulary (should be `origin` or `provenance`; the value distinguishes seed-vs-practice-phrase candidates).

---

## 2. Data-flow map

### Where the plan reads from
`generate-recording-script.cjs` builds its own Supabase service-role client at module load (`dotenv` + `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`, lines 25-33). Three reads, all by `course_code`:
1. `course_legos` → `target_text, known_text, type, is_new, seed_number, lego_index`, filtered `is_new = true`. Deduped by accent/punctuation-stripped `target_text` into the **universe**; each entry gets a synthetic `legoId` `S{seed}L{idx}`.
2. `course_seeds` → `target_text, known_text, seed_number` (preferred candidates).
3. `course_practice_phrases` → `target_text, known_text, seed_number, lego_index, position` — **all phrase roles** (component/build/use; no `phrase_role` filter), deduped, phrases under `MIN_PHRASE_WORDS = 2` words dropped.

Note: neither query paginates. A silent PostgREST `max-rows` cap on large courses would shrink the candidate pool and inflate `directRecord` (same failure class as the INF PLAY `.limit(10000)` incident).

### The algorithm
- Coverage per candidate = all 1-8-word contiguous subsequences of the normalized phrase that hit the universe (`getAllSubsequences`).
- **Seed auto-cover** (lines 445-451): a seed phrase additionally covers *every* LEGO extracted from that seed, even when the LEGO's text is not a contiguous substring of the seed (mutations, reorderings).
- `greedySetCover` (line 244): classic greedy — repeatedly pick the candidate covering the most still-uncovered LEGOs; stops when no candidate makes progress. Remaining LEGOs become `directRecord` items ("Not contained in any practice phrase").

### What each script item contains
For each selected phrase (lines 530-552): `index, target` (original casing/diacritics), `known`, `source` ('seed'|'practice'), `seedNumber, wordCount, coversLegos`, `legoChunks` (true LEGO boundaries from `chunkPhraseByLegos` max-munch), `legoChunkCount, glueTokensAbsorbed`, `recordingChunks` (glue words merged into adjacent LEGO chunks via `mergeGlueIntoLegos`, left-attach, LEGO identity preserved, absorbed glue tracked in `mergedGlue`), `chunksString` (pipe-delimited recording chunks — the speaker's pause map and the `--chunks` input for `align-audio.cjs`), `chunkCount`. Direct items: `target, known, type, legoId, reason`.

### API layer (`services/production-api.cjs`)
- `GET /recording-optimizer` → wraps stats (adding the fabricated `totalPhrases`), previews first 50 phrases / 20 direct items, plus `fullScript`. Hijacks global `console.log` around the call (concurrency hazard: overlapping requests on the shared process swallow each other's logs).
- `GET /recording-script` → interleaves each phrase as natural+slow pairs (every phrase twice), appends direct items as natural+slow pairs, passes chunk fields through, estimates 6s/item. This is what the autocue consumes (`useAutocueState.loadOptimizedScript`, line 561).

### Where recordings actually go (the broken return path)
- **Autocue script mode**: items get synthetic ids `script-${idx}` (`useAutocueState` line ~642); upload (line 460-482) POSTs `uuid: phrase.id` — i.e. **`script-0`, `script-1`…, not audio UUIDs**. The upload endpoint stores to S3 under that fake uuid and writes a `sample_flags` row keyed to it; nothing ever links back to `course_audio` / `course_legos.target1_audio_id`. The optimizer plan therefore produces recordings that the course cannot reference.
- Provenance casing mismatch: autocue sends `recorded_by` (snake_case); the endpoint gates on `provenance.recordedBy` (camelCase, line 4088) — **provenance is silently never inserted** for autocue uploads.
- Bonus bug: `production-api.cjs:4079` calls `updateSampleFlag(uuid, courseCode, 'needs_review', notes, by)` with 5 positional args, but the signature is `updateSampleFlag(audioUuid, { courseCode, status, notes, flaggedBy })` (`supabase-client.cjs:735`) — the options object is a bare string, so `status`/`courseCode` destructure to `undefined`.
- **RecordingStudio queue mode** records against the `sample_flags` recording queue (real UUIDs), not the optimizer script — two parallel recording flows that never meet.

### Multi-voice: the plan knows nothing about voices
- `generate-recording-script.cjs` contains **zero** voice references — it never reads `courses.voice_config` (which holds the `known/target1/target2/presentation` role-to-voice mapping) and emits no voice field on any item.
- `/recording-script` items carry no voice; the autocue hard-codes `role: 'target1'` for every item (`useAutocueState` line ~595) and sends no `voiceId` at all on upload.
- RecordingStudio stamps every upload `voiceId: 'human_' + courseCode` (line 225) — **one synthetic voice identity per course**. Its queue filter has a `voice: null` placeholder that nothing populates.
- Net: Richard's requirement of >= 2 distinct human voices (target1 + target2 at minimum) cannot be expressed anywhere in this pipeline. There is no way to split the script between two speakers, no per-speaker identity on recordings, and recordings by different people collapse into the same `human_{courseCode}` voice id. The whole plan is single-voice, target-language-only (known-language and presentation audio are entirely out of scope of the optimizer).

---

## 3. Additional findings (persona-relevant)

1. **Coverage accounting overstates extractability.** Seed auto-cover marks a LEGO "covered" even when its text never appears contiguously in the recorded seed phrase. `chunkPhraseByLegos` (max-munch over contiguous tokens) will then produce no chunk for that LEGO, so alignment/segmentation can never yield its audio — yet `coveragePercent` counts it covered and it is excluded from `directRecord`. Silent audio gaps for mutated LEGOs.
2. **No incremental awareness.** The planner never queries `course_audio`; re-running after partial recording regenerates the full script with no "already recorded" subtraction. Combined with finding (b), there is no progress model at all.
3. **Greedy ordering is also session order.** Phrases are ordered by marginal coverage, so a recording session front-loads long, dense sentences — defensible, but nothing lets a leader re-order or split into sessions/speakers.
4. **Hard-coded Welsh demo.** The "LEGO Audio Synthesis" panel on RecordingOptimizer.vue is hard-coded Welsh (`cym_n_for_eng` seeds 1/6/11, `frankenstein-demo` endpoint with pre-spliced S3 demo files). For Richard's Macedonian course the demo either 404s or plays Welsh — confirming the known "demo hard-coded Welsh" gap.
5. **Vocabulary leak.** The script items expose a `source` field (banned SSi term) to every consumer (API JSON, autocue state).
6. **`reductionPercent` mislabels the efficiency bar.** The bar width is `reduction%` but the legend reads "Recording Efficiency: N recordings → totalLegos*10 phrases" — two different (one fabricated) measures presented as one.

## 4. Verdict for the persona
The planning math (greedy set cover + glue-merged chunking + pipe-delimited pause map) is genuinely good and matches the live schema. But for Richard it is a dead end past the autocue: the dashboard page shows fabricated totals and permanent zero progress, the export is disabled, recordings uploaded from the script get fake UUIDs that never reach the course audio tables, provenance is dropped, and there is no concept of voices — let alone the two-plus human voices his course requires. The conflicting `audio-pipeline/plan.js` surface is outright broken against the live schema (selects non-existent `known`/`target` columns).
