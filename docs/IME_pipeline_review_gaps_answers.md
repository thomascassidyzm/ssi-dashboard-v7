# IME pipeline review — gap-closing answers (Popty / ssi-dashboard-v7)

**Date:** 2026-07-09 · **Repo state:** `main` @ `362f5c3`
**Method:** every claim below was traced to code in this checkout and cited as `file:line`. Each finding is labelled **IMPLEMENTED** (code that runs), **PLANNED / DOC-ONLY** (specs without code), or **NOT VISIBLE IN THIS REPO**. Accuracy was preferred over completeness — "not found" means not found, not "doesn't exist".

## Premise corrections (read first)

Four premises in the question set don't survive contact with the code:

1. **56 kbps MP3 — refuted for this repo.** The mastering encoder is hard-defaulted to **96 kbps CBR, 48 kHz, mono** LAME (`services/audio-processor.cjs:57,67-70,84-90`). No 56 kbps setting exists anywhere in the tree. Whatever you measured at 56 kbps was produced by an earlier pipeline generation or outside this repo (see Q9).
2. **`flagged_by: 'learner'` — not visible here.** No code in this repo writes that value; the schema doc says `flagged_by` is a *user email* (`new_vision/supabase-schema.sql:148`), the server default is `'qa'` (`services/production-api.cjs:2817`), and `sample_flags` itself is marked legacy (see Q6).
3. **"Phases 4–7" are legacy numbering, not missing stages.** The repo went through two numbering schemes; the live pipeline is 0→1→2→3→8→9 and the old 4/5/5.5/6/7 logic was absorbed or superseded (see Q1).
4. **`supabase/schema.sql` is not in this checkout.** CLAUDE.md names it as the schema source of truth, but no `supabase/` directory exists (only `supabase/.temp/` in `.gitignore:165`); it's a per-machine local snapshot. Consequence: claims about live-table constraints/FKs below are inferred from application code, not committed DDL.

---

# A. Pipeline walkthrough

## Q1 — Phases as implemented

There are **two competing numbering schemes**. Legacy (~2025-11, `docs/workflows/PHASE_DEPENDENCIES_AUDIT.md`, `docs/AUDIT_DATA_FLOW.md:238`): 1 Translation → 3 LEGO extraction → 4 scaffold prep → 5 Baskets → 5.5 Grammar validation → 6 Introductions → 7 Manifest → 8 Audio. Current (`SYSTEM.md:159-215`): **0 → 1 → 2 → 3 → 8 → 9**, described as "Phase 1 → 3 → 8 → 9" (`SYSTEM.md:161`). Alongside the phase servers there is a newer **DB-first "course-builder" golden path** (`services/course-builder/`, `POST /api/seed/complete`) which CLAUDE.md designates as the current content-submission API.

| Phase | Status | Entry point | In → Out | Trigger |
|---|---|---|---|---|
| 0 Language brief | IMPLEMENTED | `services/phases/phase0-language-brief/server.cjs` (+`PROMPT.md`) | pair code → per-pair brief injected into Phase 1/3 prompts (`phase1-translation/PROMPT.md:19-27`) | automated LLM call (`opus`, `server.cjs:404`) |
| 1 Translation + LEGO | IMPLEMENTED | `services/phases/phase1-translation/server.cjs` (port 3457) | `public/vfs/canonical/canonical_seeds.json` (~668 seeds) → `draft_lego_pairs.json` (S3/Supabase) | `POST /start`; spawns Claude Code agents (`model:'sonnet'`, `server.cjs:947-948`) via `services/shared/spawn-agent-unified.cjs` |
| 2 Conflict resolution | IMPLEMENTED | `services/phases/phase2-conflict-resolution/server.cjs` (port 3458) | `draft_lego_pairs.json` → `lego_pairs.json` (SSoT) | `POST /start`, automated |
| 3 Baskets | IMPLEMENTED | `services/phases/phase3-basket-generation/server.cjs` (port 3459) | `lego_pairs.json` → `lego_baskets.json` | `POST /start` / `POST /scaffold`; sonnet agents, tiered opus/sonnet/haiku (`generate-all-scaffolds.cjs:118-120`) |
| 4 Scaffold prep | concept DOC-ONLY; code folded into Phase 3 | `phase3-basket-generation/prep-scaffolds.cjs`, `generate-scaffold-v9.cjs` | — | — |
| 5 Baskets (old number) | LEGACY alias of Phase 3 | leftover prompts `public/prompts/phase5_master.md` / `phase5_worker.md` | — | — |
| 5.5 Grammar validation | standalone server NOT VISIBLE; QA folded into course-builder | `services/course-builder/routes/qa.cjs` | — | — |
| 6 Introductions | absorbed | `services/phases/phase2-conflict-resolution/generate-introductions.cjs` | — | — |
| 7 Manifest (old) | LEGACY | `services/phases/manifest-compilation/server.cjs`, `services/phases/generate-legacy-manifest.cjs`; the `scripts/phase7-compile-manifest-v3.cjs` of `docs/PHASE7_V2_SUMMARY.md` is gitignored (doc-only here) | JSON files → `course_manifest.json` | manual |
| 8 Audio | IMPLEMENTED | `services/phases/phase8-audio-v13.cjs` (the live engine; server on port 3465) | Supabase `course_legos`/`course_practice_phrases` → TTS → S3 `mastered/{uuid}.mp3` + `course_audio` rows | `POST /plan` then `POST /start`; **approval-gated** (costs money, `CLAUDE.md:26`) |
| 9 Manifest (DB-first) | IMPLEMENTED (not on learner path) | `services/phases/phase9-manifest-compiler.cjs` (port 3466) | Supabase tables → `course_manifest.json`, validates 100% audio coverage *of the manifest* | manual/orchestrated |
| Course-builder golden path | IMPLEMENTED (current submission API) | `services/course-builder/routes/seed-complete.cjs:873` (`POST /api/seed/complete`) | agent-submitted seed+LEGOs+phrases → atomic validated inserts | agent-driven |

Orchestration: `services/orchestration/orchestrator.cjs` (port 3456) sequences phase servers with manual/gated/full checkpoint modes (`docs/PHASE_SERVER_ARCHITECTURE.md:111-127`, `SYSTEM.md:448-462`); startup via `start-automation.cjs` + `automation.config.json`. Caveat: `SYSTEM.md:361-363` names `phase8-audio-supabase.cjs`/`phase9-manifest-supabase.cjs` — stale; the committed files are `phase8-audio-v13.cjs` and `phase9-manifest-compiler.cjs`.

**Learner-path caveat:** the learning app reads Supabase directly and does **not** use the manifest (`CLAUDE.md:44`); Phase 9's output is a compatibility artifact (see Q17).

## Q2 — Models and APIs per step

**The "CLI only, never SDK" rule is verified true.** Central wrapper `services/shared/claude-cli.cjs:32-51` spawns `execFile('claude', ['--print','--model',model,…])` with `CLAUDECODE:''` and `MAX_THINKING_TOKENS:'0'`; its header says "NEVER use @anthropic-ai/sdk directly". Grep for `require('@anthropic-ai/sdk')` / `new Anthropic(` across all source = **zero matches** (the `@anthropic-ai/sdk@^0.67.0` in `package.json:22` is declared but unused by service code). **No OpenAI or other LLM API is called anywhere** — only prose/doc mentions.

| Step | Model | Evidence |
|---|---|---|
| Cheap/deterministic tasks (JSON-fix, presentation templates) | pinned `claude-haiku-4-5-20251001` (override `CLAUDE_HAIKU_MODEL`) | `services/shared/claude-cli.cjs:20` |
| Phase 0 brief | `opus` (output tagged `claude-opus-4-5`; fallback `claude-sonnet-4`) | `phase0-language-brief/server.cjs:404,430,465` |
| Phase 1 translation agents | `sonnet` | `phase1-translation/server.cjs:948` |
| Phase 3 basket agents | `sonnet`; tiered opus/sonnet/haiku by seed/vocab size | `phase3-basket-generation/server.cjs:810,1423`; `generate-all-scaffolds.cjs:118-120` |
| Course-builder decompose/phrases/QA | `sonnet` and `opus` via spawned CLI (`--dangerously-skip-permissions`, `unset CLAUDECODE`) | `services/course-builder/routes/build.cjs:242,473-909`; `routes/qa.cjs:409,634` |

Non-LLM AI APIs are TTS only: Azure Speech SDK (`services/tts-service.cjs:16`), ElevenLabs REST (`:60`), xAI TTS REST (`:226`), plus an optional Google TTS client (see Q8).

## Q3 — Prompts in the repo

Yes, extensively — IMPLEMENTED. Four homes: per-phase `PROMPT.md` files (`services/phases/phase{0,1,2,3}-*/PROMPT.md`, `phase8-audio-generation/PROMPT.md`, `phase9-manifest-compilation/PROMPT.md`), master/worker prompts (`public/prompts/phase3_*.md`, legacy `phase5_*.md`; `prompts/few-shot-builder.md`, `prompts/upchunk-agent.md`), template literals inside servers (e.g. `phase1-translation/server.cjs:172-492`), and ~20 slash-command skills under `.claude/commands/` (`calibrate.md`, `phrase-fixer.md`, `course-audit.md`, …).

Representative excerpt — `services/phases/phase1-translation/PROMPT.md:61-79`:

> **ZUT (Zero Uncertainty Test):** When learner hears X, do they ALWAYS know to produce Y with ZERO uncertainty?
> **Most single words FAIL ZUT** because their meaning depends on context:
> - "the" → la? il? lo? gli? (depends on noun gender/number)
> - "in" → in? a? nel? (depends on what follows)
> …
> **Context disambiguates.** Therefore: **M-type (Molecular) is the PRIMARY teaching unit** — context provides meaning; **A-type (Atomic) is the EXCEPTION** — only truly unambiguous words.

## Q4 — Validation gates, publishing, drift

### Gates (all IMPLEMENTED in `POST /api/seed/complete` — `services/course-builder/routes/seed-complete.cjs:873`; check functions in `services/course-builder/lib/validation.cjs`)

Errors accumulate; **any error → HTTP 400, nothing inserted** (`seed-complete.cjs:1555-1569`, verified: "Fix all errors and resubmit. Nothing was inserted."). Warnings never block.

| Gate | Where | Blocks? |
|---|---|---|
| LEGO-level ZUT (same known → different target across seeds) | `validation.cjs:476-520`; `seed-complete.cjs:1116-1145` | **BLOCKS** |
| Phrase-level ZUT | `validation.cjs:630-661`; `seed-complete.cjs:1287-1325` | WARN — offending phrase is *held out* (not inserted), seed proceeds (deliberate 2026-06-14 change, comment `:512-515`) |
| Vocab violations (phrase must tile from already-introduced chunks; DP word tiling, DP **character** tiling for Chinese) | `validation.cjs:250-320,326-352`; `seed-complete.cjs:1270-1278` | **BLOCKS** |
| Known-side controlled language (contract-gated, `docs/pair-contracts/*.contract.cjs`) | `validation.cjs:843-898`; `seed-complete.cjs:1358-1378` | WARN only |
| Min phrases per LEGO (graduated: 0/1/3/4/5 by seed number, then config) + no-phrase LEGO | `seed-complete.cjs:1453-1479` | **BLOCKS** |
| BUILD/USE structure | `seed-complete.cjs:1441-1452` | **BLOCKS** |
| Phrase complexity/length tiers | `validation.cjs:159-234`; `seed-complete.cjs:1483-1497` | WARN ("not blocking") |
| Syllable cap per LEGO (per-language) | `seed-complete.cjs:1147-1166` | **BLOCKS** — runs even with `SKIP_VALIDATION` |
| Seed tiling ("even golden seeds must tile") | `validation.cjs:101-151`; `seed-complete.cjs:1171-1187` | **BLOCKS** |
| LEGO containment in phrases | `seed-complete.cjs:1236-1265` | **BLOCKS** |
| Known/target length ratio >2.5× | `seed-complete.cjs:1380-1430` | **BLOCKS** (skipped for logographic) |
| LEGO balance (3-strike escalation, seed >20) | `validation.cjs:360-468`; `seed-complete.cjs:1499-1552` | WARN → **BLOCKS** on Nth strike |
| Frame coverage, metadata gloss | `validation.cjs:717-796`; `seed-complete.cjs:1330-1352` | WARN only |
| Draft-finalize ZUT collision | `services/course-builder/routes/drafts.cjs:126-285` | **BLOCKS** (409, whole finalize aborts) |

Escape hatches: ZUT skipped for drafts (`seed-complete.cjs:1113`); `SKIP_VALIDATION` allowed for seeds ≤3 (`:922`).

### Publishing / live / rollback

- **No `published`/`is_live` flag exists.** `course_seeds.status` is set `'released'` on insert (`seed-complete.cjs:1628`; `drafts.cjs:330`); legos/phrases insert as `'draft'`. Learner visibility = presence in the **`course_round_index` materialized view** (refreshed on lego mutations; `CLAUDE.md:44-45`) — its DDL/refresh trigger is **NOT VISIBLE IN THIS REPO**.
- **Staging exists as drafts**: `course_seed_drafts` + `?draft=true` (`seed-complete.cjs:924,1579-1614`); `POST /course/:code/finalize` promotes atomically (`drafts.cjs:62`).
- **Versioning is counters, not snapshots**: `courses.content_version` (semver, bumped per write) and `courses.version` (cache-bust int) via `services/shared/course-version.cjs:20-115`. Finalize is delete-then-rewrite (`drafts.cjs:288-310`) with no prior-version capture. **Rollback/snapshot capability: NOT VISIBLE.** The `_vN` course-code suffix (`seed-complete.cjs:274-278`) is a fork-style rebuild, not a rollback.
- **Manifest publish UI gate**: the only hard pre-publish check is audio **duration verification**, and it has an explicit override — "I understand the risks — publish without duration verification" (`src/components/production/export/Step3Publish.vue:61,459,535`).

### What prevents text↔audio drift: structurally, nothing

Audio links to text by **normalized-text matching, not foreign keys**: `linkAudioIdsBatch()`/`linkSlot()` (`services/phases/phase8-audio-v13.cjs:1020-1136`) keys `course_audio` by `text_normalized|language|role` and fills `known_audio_id`/`target1_audio_id`/`target2_audio_id` **only where currently NULL and a match exists** — no match, stays NULL. Any text edit that changes `text_normalized` silently orphans the link. No FK or NOT NULL constraint is visible (live DDL not committed), and **no gate stops a course going learner-visible with NULL audio ids** — `course_round_index` refreshes on lego mutations regardless of audio. That is exactly the zho_for_eng shape. What exists instead:
- **Coverage reporting** (diagnostic, not gating): `services/voice-engine/coverage.cjs:46-154` computes per-voice-slot needed/covered/missing.
- **Relink tooling**: `tools/course-optimization/clone-copy-pass.cjs` (dry-run by default, `--apply`) re-points NULL slots at identical rendered audio in other courses. No zho-specific relink migration is committed (only migration: `database/migrations/20260705_purge_pending_presentation_rows.sql`); the zho relink work is described as one-off scripts outside this repo (`docs/voice-engine/audit/06-data-model.md:59`).

---

# B. Human review

## Q5 — Review interfaces and sign-off

Review UIs exist and are real (all IMPLEMENTED, routed in `src/router/index.js`):
- **Translations/phrases**: `PhraseQA.vue` (`/production/:courseCode/phrase-qa`, router `:490-495`) — dismiss/delete flagged phrases, spawn checker/fixer/Opus-polisher agents; `QAReview.vue` (`/production/:courseCode/qa-review`, `:563-568`) — per-check-type flags with "Approve & Continue Pipeline"; `ScriptViewer.vue` (`/production/:courseCode/script`; `/qa` redirects here with `filter=flagged`); direct editing via `SeedEditor.vue`, `CourseEditor.vue`.
- **LEGO chunking**: `CalibrationReview.vue` (`/production/:courseCode/calibration-review`, router `:556-561`) — golden decompositions with approve/pending/redo; plus `/quality/:courseCode/*` dashboards.
- **Audio**: `SessionReview.vue` (audition of segmented human-recording takes, confidence buckets), `AudioPipeline.vue` (`/production/:courseCode/pipeline`) with preview and regen-by-role, `AudioPreviewPlayer.vue`.

**But no step requires sign-off.** Every content-review surface is advisory — QA "approve" just clears flags and does not gate `handlePublish()` (`Step3Publish.vue:699-707`); the only hard gate is the overridable duration check (Q4). **A course can go from LLM output to learner-visible untouched** — nothing structural prevents it.

## Q6 — `sample_flags` consumers

- Schema: `new_vision/supabase-schema.sql:119-168` (status CHECK includes `needs_review`, `:140`); `flagged_by` is documented as **user email** (`:148`).
- **`flagged_by:'learner'` writer: NOT VISIBLE IN THIS REPO** (the learner app is a separate, not-checked-out repo; server default source is `'qa'`, `services/production-api.cjs:2817`).
- Consumers (IMPLEMENTED but explicitly **legacy**): `services/supabase-client.cjs` — `getCourseFlags` (`:714`), `getFlaggedForRegeneration` (`:899-925`), `getCourseFlagQueuePaginated` filtering `['flagged_human_needed','in_recording','needs_review']` (`:1455-1473`); endpoints headed "LEGACY FLAGS (old sample_flags table — keep for backwards compat)" (`production-api.cjs:3099`); legacy S3 `sample_flags.json` (`s3-production-service.cjs:39-74`). The header at `supabase-client.cjs:1256` says the **newer `audio_flags` "Simple QA workflow" replaces complex sample_flags**.
- **Working review queue: YES, on the newer tables** — the live UI (`src/stores/production.js:404,536-537`, `QAReview.vue`, `PhraseQA.vue`) calls `/api/production/:courseCode/audio-flags`, `/api/qa/flags`, `/api/qa/flagged-phrases`.
- **Does resolving trigger regen?** Wired but **human-triggered, not automatic**: resolve endpoint `production-api.cjs:2837-2860`; regen queue/trigger `:4750,4793,4874`; flags cleared after successful regen (`:5110-5120`); bulk regen deliberately does *not* auto-resolve — "let user review and mark done manually" (`:4942`).

## Q7 — Reviewers, roles, native speakers

- **Roles**: flat `recorder` / `editor` / `admin` (migration `20260304_dashboard_auth.sql` cited by `docs/voice-engine/audit/00-audit-map.md:55` — the migration file itself is not in this checkout; runtime code: `src/composables/useAuth.js:23-26`, invites `api/auth/invite.js:48-60`). **No reviewer/content-QA role exists.** The repo's own audit flags enforcement as weak: `dashboard_users.courses` defaults to `'*'` (fail-open) and `canAccessCourse` is "never enforced anywhere" server-side (`00-audit-map.md:56-57,104`). `docs/AUTH_IMPLEMENTATION_SUMMARY.md` (S3 magic-link, `admin|viewer`) is stale/superseded.
- **Native-speaker review is real but manual, external, and partial**: one named reviewer (Deborah — Spanish/German/French/English) whose findings feed the scanners (`docs/deborahs-findings.md:7,57`); "ready for Deborah" is the handoff signal in `/scan-course` (`.claude/commands/scan-course.md:1248`). For Japanese, Chinese, Korean, Arabic etc., "our scanner is the primary quality gate" — i.e. **review is mechanical checks + LLM agents (Opus orchestrating Sonnet workers), not native speakers**. Skills encode the hybrid loop (`checkpoint-qa.md:13`, `phrase-monitor.md:152` — "The human reviewing your flags may not know the target language").

---

# C. Voice / TTS

## Q8 — Providers and voice configuration

**Azure is not the only provider. Three are implemented; Welsh audio is human-recorded.**
- Dispatcher `services/tts-service.cjs:264-282` switches `elevenlabs | azure | xai` (anything else throws). ElevenLabs `eleven_multilingual_v2` (`:43-89`); Azure via `microsoft-cognitiveservices-speech-sdk` + SSML prosody (`:102-178`); xAI REST `api.x.ai/v1/tts` (`:193-243`). A second pooled Azure client exists (`services/azure-tts-service.cjs`). A Google TTS client file exists (`services/google-tts-service.cjs`) but Google is **absent from the enabled-provider registry** (`services/voice-config-service.cjs:104-119`) — effectively dormant.
- **Per-course voice config lives in Supabase**, not a config file: `courses.voice_config` JSONB, roles `target1/target2/known/presentation` each `{voiceId, provider, name, language, settings}` (`voice-config-service.cjs:31-124,360-367`); voices also registered in a `voices` table (`:183-307`). REST: `GET/PUT /api/courses/:courseCode/voice-config` (`production-api.cjs:1442-1483`). Pod courses instead use a static coverage map: `tools/pod-voice-coverage.cjs` + `tools/pod-voices-{azure,xai}.json`.
- **Human-recorded audio is a first-class tier**: `provider:'human'` is Tier 0 in the pod coverage map (`pod-voice-coverage.cjs:14,146-150`); Welsh (`cym`, `cym_n`, `cym_s`) is `humanPreferred:true` (`:121-124`) — `cym_n_for_eng` has **19,080 genuinely-human Welsh recordings** (currently mislabelled `origin='tts'`, `docs/voice-engine/audit/00-audit-map.md:66`). Breton, Scottish Gaelic and Yoruba are human-only (no TTS exists). Upload provenance seam: `services/recording-upload-helpers.cjs`; browser-recording processing `services/audio-processor.cjs:558-673`. The full Recording Studio of `docs/PLAN-s3-auth-recording.md` is PLANNED/DOC-ONLY.
- **Spec vs code — `new_vision/VOICE_CONFIGURATION_SPEC.md` is aspirational and diverges**: spec says providers `azure|elevenlabs|google|human` (`:409`) — code has no google and adds xai; spec role `source` — code uses `known` (`voice-config-service.cjs:59-71`); spec stores config in S3 `voice_config.json` + `course_voice_configs` table (`:318-333`) — code uses `courses.voice_config` JSONB; spec's presets, pause hierarchy, `encouragement` role, and `/apply-preset`/`/validate` endpoints are **not implemented**. Convergent: voice-id format `azure_{locale}-{Name}` (`voice-config-service.cjs:263-268` — matches your `azure_zh-CN-XiaoxiaoMultilingualNeural` finding), the `voices` registry, −16 LUFS cadence targets.

## Q9 — Audio post-processing ("mastered/")

IMPLEMENTED, and the `mastered/{uuid}.mp3` keys correspond to a real mastering step:
- Entry: `masterAudio()` (`services/phases/phase8-audio-v13.cjs:786-812`) → `audioProcessor.normalizeAudio(raw, mastered, -16.0)`.
- Chain (`services/audio-processor.cjs:280-304`): measure integrated loudness → pre-compressor `acompressor=threshold=-24dB:ratio=8` → gain to **−16 LUFS** → true-peak limiter at **−1.5 dBTP** (4× oversampled `alimiter=limit=0.841`) → 8 ms anti-click fades.
- Encode: ffmpeg-filtered WAV piped through the **real LAME binary** (ffmpeg's MP3 muxer deliberately avoided — iOS playback bug), **CBR 96 kbps, 48 kHz, mono, `-q 2`** (`audio-processor.cjs:48-92`; defaults at `:57-60,67-70` — verified directly).
- Other contexts: browser recordings 128 kbps/44.1 kHz (`:633-661`); cadence processing 192 kbps (`:501-507`); pod splicer 96 kbps/48 kHz normalized to −16 LUFS (`services/voice-engine/splicer.cjs:156,175,204-234`). Raw TTS fetch formats (Azure `Audio16Khz32KBitRateMonoMp3` / `Audio24Khz96KBitRateMonoMp3`, xAI 128 kbps/24 kHz) are re-mastered downstream.
- **56 kbps: not set anywhere in this repo** (targeted search found no bitrate-56 anywhere). The measured 56 kbps files predate or bypass this mastering path — their origin is NOT VISIBLE IN THIS REPO.

## Q10 — Choosing voices for a new language

- IMPLEMENTED: `services/voice-discovery-service.cjs` discovers Azure voices per locale, scores them (Neural +100, +1/style; `:277-293`), picks 1 female + 1 male (`:311-345`), generates sample clips (`:405-438`), and registers with default cadences at −16 LUFS (`:447-477`). The code itself warns the score is a priority ranking, **not** a naturalness judgment — "Users should ALWAYS listen to sample clips" (`:264-272`).
- Weak/no-TTS languages: xAI has an official-language list; anything else is flagged `quality:'fallback'` (score 50 vs 200, `:186-233`). The pod coverage map (`tools/pod-voice-coverage.cjs:10-25,168-209`) is the tier system: Tier 1 xAI native → Tier 2 xAI multilingual+locale → Tier 3 Azure locale → **Tier 0 human-only (bre, gla, yor)**; thin Azure catalogues get ElevenLabs top-ups (e.g. Croatian, `:45-62`); unmapped targets **throw**, forcing an explicit per-language decision (`:171-173`).
- `docs/pods/offsets-without-azure-recommendation.md` documents the practical wall: **22 pod courses are 100 % Azure with no xAI clone available** (including Irish and Croatian), with a stated direction to avoid Azure dependencies. The master 58-language classification doc it references lives outside this repo (NOT VISIBLE).

---

# D. Language coverage & edge cases

## Q11 — RTL / non-Latin / weak-LLM special-casing

- **Arabic/RTL — punctuation-level handling only (IMPLEMENTED)**: commit `e14b062` added `؟` to `SENTENCE_PUNCT` and `؟ ، ؛` to `PAUSE_PUNCT_END` across 8 pod tools (e.g. `tools/breakdown-fine.cjs:52,67`, `tools/render-take-g.cjs:47,52`) — without it, two Arabic questions parsed as one sentence and desynced takes from drill groups. A hand-curated Egyptian-Arabic culture brief exists (`services/pod-culture-notes.cjs:33-43`: Masri not MSA, number orthography so TTS pronounces numbers Egyptian). **No `dir="rtl"`/CSS text-direction handling exists anywhere in the frontend or generators**, and Hebrew appears only in name maps — no Hebrew course or code.
- **CJK — real structural handling (IMPLEMENTED)**: DP character-level vocab tiling for no-space scripts (`services/course-builder/lib/validation.cjs:248-265,326-352`; `isChinese()` covers zho/cmn/jpn/kor/tha/mya/lao/khm, `lib/language-config.cjs:112-117`); syllable estimation via per-script chars-per-syllable proxies (`language-config.cjs:49-67`); CJK-aware sentence splitting for known-side text (commit `362f5c3`).
- **Weak-LLM languages — no coded blocklist (NOT VISIBLE)**. The repo's stance is the opposite of list-based: "No regex/signature/stemmer EVER for a language judgment" (`docs/course-optimization/HANDOFF-kai-eng-for-x.md:26-28`); per-pair **contracts** (`docs/pair-contracts/*.contract.cjs` — e.g. `eng_for_tam.contract.cjs:8` leaves `stem_strip` deliberately empty because Tamil is fusional/abugida) plus agent judgment plus mandated human review (Basque: "don't ship on Haiku output alone", `docs/eus_for_eng-rebuild-notes.md:151`). Language-specific prompt variants exist as calibration docs (`docs/calibration-rules-ara_for_eng.md` incl. a custom romanisation scheme) and Phase 0 briefs injected into prompts.

## Q12 — Courses built end-to-end; failures

**Built and in the DB** (evidence in docs/WORKLIST, since the DB itself isn't in the repo):
- **16 `eng_for_X` courses**, decomposed only to seed 300 of 668, **all `status=draft`, nothing released**, generated Mar–Jun 10 2026 *before* the phrase gates landed Jun 14 (`docs/course-optimization/HANDOFF-kai-eng-for-x.md:8-9`). Includes 7 India courses (hin, ben, guj, pan, urd, tam, sin) with pair-contracts and a completed known-side verification sweep (41,885 prompts / 84 agents, `eng-for-x-known-side-findings.md:1-18`).
- **`zho_for_eng`** — the controlled experiment: S1–350 refined MVP; **S351–668 is "Kai's old-course-builder extension", created ungated 06-08/09** — this is your "unbuilt seed-300→668 extension"; it's documented in `WORKLIST.md:77` and the 371-issue fix queue at `WORKLIST.md:42`, **not** in a SQL migration.
- **`spa_for_eng`** — furthest-along anchor (cue-library v1.0 closed-loop; reorder pilot voiced R1–700, `WORKLIST.md:83`).
- **`cym_n/cym_s_for_eng`** — human-recorded Welsh, 19,080 human clips.
- **`ita_for_eng`** — partial, QA'd in seed batches (`docs/qa-reports/QA_ITA_243_271_FINAL.md` etc.); **`hrv_for_eng`** — pod pilot; pod-ladder pilots: hrv/ita/spa/fra/zho (`WORKLIST.md:53-54`).
- **`eus_for_eng`** — effectively abandoned-to-rebuild: all 668 seeds flagged 2026-04-24 (`docs/eus_for_eng-rebuild-notes.md:3`).

**What failures reveal** (all documented):
- **Apostrophe bug** (`docs/APOSTROPHE_BUG_REBUILD_PLAN.md`): normalization stripped apostrophes from vocab sets, so the LLM *learned* apostrophes were optional across 668 seeds; ~66k phrases regenerated across 7 courses. Lesson: normalization feedback loops corrupt generation; mechanical gates pass grammatically wrong output.
- **Jan-2026 review grades** (`docs/ENG_FOR_X_REVIEW_2026-01-30.md:127-137`): zho A, jpn B+, por/fra/deu C+, **ara D (skipped LEGO), spa F (agent invented vocab, ignored ZUT — full rebuild)**.
- **Known-side gate inert** (`eng-for-x-known-side-findings.md:56-78`): deterministic gates only inspect the English target side; the ASCII-based known-side check no-ops on Devanagari/Tamil — the entire foreign known side of all 16 courses was ungated, with ~7 systematic bug families found across all 7 India courses. The pipeline's weak point is consistently the **morphologically rich known side** (Basque ergativity, Tamil fusion, Indic dative subjects, gender re-agreement).

## Q13 — What a new India course pair would involve

Steps as evidenced (per `HANDOFF-kai-eng-for-x.md`, `calibrate.md`, phase servers): pair-contract authoring (hardest part for morphologically rich known languages) → Phase 1 translation → calibration of ~10 golden seeds (**~1 min/seed** once in flow, `.claude/commands/calibrate.md:139`) → gated decomposition via `/api/seed/complete` → known-side agent verification → **native-speaker review** → baskets → audio → publish.

Cost/effort evidence in the repo:
- Decomposition compute: **~30 min per 668-seed course**; ~3.5 h for 7 in parallel (`APOSTROPHE_BUG_REBUILD_PLAN.md:154-161`).
- TTS: **~$5 per 250-seed anchor course; ~$2 for reuse variants** (`docs/SSI_2026_MARKETING_PLAN_AND_RELEASE_SCHEDULE.md:42,46`).
- Agent verification: 7-course known-side sweep ≈ **9–10 M tokens / 84 batch agents** (`eng-for-x-known-side-pilot.md:46-48`).
- Human review: mandatory for quality but uncosted; the binding constraint per `eus` and known-side findings. **No total "N days/weeks per course" figure is stated anywhere — NOT VISIBLE.**
- Specifics: **`eng_for_hin` already exists** with a proven v2 regen cold-start (seeds 1–50, `HANDOFF-kai-eng-for-x.md:74`) — English-for-Hindi is extend/fix, not greenfield. A new **`tam_for_eng`** would need Tamil TTS: Azure `ta-IN` exists (`tools/sync/reference/language_codes.csv:423`) but Tamil is **not** in `XAI_OFFICIAL_LANGUAGES` (`voice-discovery-service.cjs:194-199`), so Azure is the realistic voice source. Dominant costs are agent tokens + human linguistic review, not TTS or compute.

---

# E. Infrastructure & security

## Q14 — Third-party services and credentials

All IMPLEMENTED unless noted; env names only, no values (template: `.env.example`; `.env*` gitignored except the example, `.gitignore:47-49`):
- **LLM**: Claude CLI only (Q2). `ANTHROPIC_API_KEY` optional/commented (`.env.example:243-245`) — not used by service code.
- **TTS**: Azure (`AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION`, default `westeurope`, `azure-tts-service.cjs:14-15`); ElevenLabs (`ELEVENLABS_API_KEY`, `elevenlabs-service.cjs:12`); xAI (`XAI_API_KEY`, `production-api.cjs:1592`); Google optional (`google-tts-service.cjs:26`, not registered as a provider).
- **AWS S3**: `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_REGION` (eu-west-1) (`s3-service.cjs:19-21`).
- **Supabase**: service-role key server-side (`services/supabase-client.cjs:16-39`; `api/lib/supabase.js:13-14`), anon key in browser (`src/services/supabase.js:11-12`).
- **Vercel** hosting (`vercel.json`, serverless `api/`); **GitHub API** for dashboard-driven commits (`services/orchestration/orchestrator.cjs:7824`); **ngrok** tunnels to processing machines (`services/api/ngrok-proxy.cjs`); Better Stack uptime optional. **No Sentry/analytics found.**
- Provisioning: 9 shared secrets mirrored into **Supabase Vault** but services still read `.env` — Vault cutover pending (PLANNED, `docs/secrets-vault.md:3-13,79-85`). `DATABASE_URL` secret-zero lives only in gitignored `.env.psql`, provisioned per machine by scp (`secrets-vault.md:29-44`, `CLAUDE.md:47`).
- **Single Supabase project shared with the learning app** — every client reads one `SUPABASE_URL`; no staging/prod DB split is visible. The CLAUDE.md "env-switcher" (`src/components/EnvironmentSwitcher.vue:44-65`) switches **ngrok machine tunnels** (Tom's/Kai's/SSi Machine/localhost), not databases. "Staging" in the repo means the learning-app's deploy branch (`staging.saysomethingin.app`), not a Popty DB env.

## Q15 — S3 and CDN

- **One bucket: `ssi-audio-stage` (eu-west-1) — there is no production bucket.** `services/s3-service.cjs:6-30`: `STAGE_BUCKET`, `PROD_BUCKET`, `LFS_BUCKET` are all aliased to it, with the comment "We no longer use separate prod bucket" (`:29`). `popty-bach-lfs` is deprecated (`:10`). The 3-bucket description in `.gitignore:5-8` is stale. Auth sessions/magic-links live in the same bucket under `auth/` (`api/lib/auth.js:11-13`).
- **CDN: PLANNED/DOC-ONLY.** URLs are direct `https://{bucket}.s3.amazonaws.com/...` (`s3-service.cjs:54,171,277`); CloudFront appears only as future work in APML specs (`apml/services/external-services.apml:128`, `apml/core/s3-ssot.apml:30,340`).

## Q16 — Learner data and access

- **Mostly content-side, with two learner-adjacent reads (IMPLEMENTED)**: the `learners` table is read for identity/authorization only (`api/lib/auth.js:163-168`; `production-api.cjs:238-246`) and can be written when inviting dashboard users (`:502-538`); learner-submitted `content_feedback` (including `userId`) is read for aggregation (`src/services/supabase.js:525-588`). **No learner-progress reads found** (`user_progress`/`profiles`: no code hits).
- **Access control**: Supabase-JWT gated, not localhost-only. Authorization via `services/shared/popty-identity.cjs:27-71`: `dashboard_users` row → else `learners.platform_role='ssi_admin'`/`educational_role='god'` → else legacy `popty_user` → else no access. Enforced by `verifySupabaseJWT`/`requireAdmin` (`production-api.cjs:227-266`) and mirrored in Vercel routes (`api/lib/auth.js:155-190`). Caveats from the repo's own audit: per-course scoping fail-open and largely unenforced server-side; `/recording/*` anonymous; CORS default `*` (`.env.example:186-187`).

---

# F. Legacy manifest / Flutter

## Q17 — `course_manifest.json` and the native app

- **Yes, still generated — two live generators (IMPLEMENTED)**: `services/manifest-generator.cjs` (DB-first, "format matches legacy app expectations", `:1-21`) called from `services/production-api.cjs:61,2279-2315` and the frontend; and `services/phases/generate-legacy-manifest.cjs` (the `docs/LEGACY_MANIFEST_GENERATOR.md` one) called at `production-api.cjs:2344,7533` and via the "Export Legacy" UI (`src/components/production/LegacyExportDialog.vue:330`).
- **Deployment — three destinations**: (1) the **course-configs git repo + apidev server** via `services/publish-manifest-service.cjs` — writes `Courses/{id}.json`, git-pushes, and scp-uploads to `ssi@apidev:kai/` (`:419-447,518,625-639`); (2) **S3** `courses/{courseCode}/course_manifest.json` in `ssi-audio-stage` (`s3-production-service.cjs:5-24`); (3) served by Vercel with DB→S3→stub fallback (`api/production/[courseCode]/manifest.js:107-124`).
- **Flutter: NOT VISIBLE IN THIS REPO — literally zero matches for "flutter".** The consumer is only ever described as the "old learning app" (`docs/LEGACY_MANIFEST_GENERATOR.md:5,20`) / "SSi learner client (iOS/web), separate not-checked-out repo" (`docs/SEED_REVIEW_EXTENSION_PLAN.md:16-21,144-145`); marketing docs describe the client as a **PWA published to iOS + Android** (`docs/SSI_2026_MARKETING_PLAN_AND_RELEASE_SCHEDULE.md:465`). No `pubspec.yaml`/`Info.plist`/`build.gradle` exists, so **iOS deployment target and Android min/targetSdkVersion cannot be answered from this repo** — they live in the separate learner-client repo.

---

## Cross-cutting synthesis (the shape of the answer)

1. **Generation is heavily gated; publishing is barely gated.** The `seed/complete` path rejects atomically on ~10 blocking checks, but once rows exist, learner visibility is a materialized-view refresh with no audio-coverage, human-sign-off, or rollback gate in front of it.
2. **Text↔audio integrity is by convention (normalized-text matching into nullable columns), not by constraint** — the zho_for_eng drift is a structural property of the design, mitigated only by diagnostic coverage reports and manual relink tools.
3. **Human review exists as UI + one named native reviewer, not as a workflow requirement.** For most languages the effective reviewer is an LLM agent pipeline.
4. **The repo's own docs drift**: SYSTEM.md filenames, `.gitignore` bucket architecture, VOICE_CONFIGURATION_SPEC, and AUTH_IMPLEMENTATION_SUMMARY all describe superseded designs — the committed code was treated as truth throughout this document.
