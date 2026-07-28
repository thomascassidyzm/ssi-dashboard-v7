# kai-stage → main port record (2026-07-28)

**Purpose.** kai-stage diverged from main (63 ahead / 63 behind at audit time; merge-base `b9cfae7e`, kai-stage HEAD `43d6d1b1`, origin/main `6c442472`). Plan: reset kai-stage to a clean `origin/main`, reapply only still-needed fixes, and hand this record to Tom so main can absorb the useful work properly. Full audit by 5 parallel readers.

## Preserved (nothing lost by the reset)
- `origin/kai-stage-backup-2026-07-28` — all committed history at HEAD `43d6d1b1`.
- `origin/kai-stage-uncommitted-2026-07-28` — snapshot including every uncommitted working-tree change (via `git stash create`; working tree untouched).
- `uncommitted-tracked.patch` + `untracked-files.txt` also saved aside.

## ⚠️ Merge-hazard files — DO NOT clobber (both sides changed since merge-base)
These carry main's 07-23/24 audio safety work AND kai-stage-unique fixes. A blind merge in either direction loses one side.

| File | main-UNIQUE (keep) | kai-stage-UNIQUE (add) | How to reconcile |
|---|---|---|---|
| `services/tts-service.cjs` | child-voice hard block, `ellipsisToSSMLBreaks`, zombie-fetch abort, xAI concurrency, phonology gate | inline-SSML passthrough (`<phoneme/sub/emphasis/say-as/break>` embedded raw, not escaped) — targeted pronunciation | **DIRECT CONFLICT at the `escapeXml`/`ellipsisToSSMLBreaks` line in `generateAzure`.** Combined path: detect inline SSML → pass raw (skip escape) but still run ellipsis→break; else escape+break as main. Preserve ALL main gates. |
| `services/phases/phase8-audio-v13.cjs` | tail-click/declick (`repairTailDefect`), human-voice-only skip (cym_*), strict voice-config 400s, audio-pass-queue fulfilment | **staleness guard** (`4ed5a38f`: drops pending presentation rows whose text ≠ current known_text, re-authors, purges) + **qmark-aware linking** (`54d99588`: `linkAudioIdsBatch` keys on `normalizeForAudio` not `text_normalized`, removes ?-stripping fallback) | Cherry-port kai-stage's two onto main; they sit in `getAudioNeeds`/`/generate` Step B and `linkAudioIdsBatch` — don't overlap main's edits. `linkAudioIdsBatch` applies clean. |
| `services/shared/claude-cli.cjs` | `CLAUDE_CONFIG_DIR` pin (`claude-config.cjs`) forcing claude@ account | `delete env.ANTHROPIC_API_KEY` (distinct safeguard) | Keep main's pin AND add kai-stage's key-delete. Not take-either. |
| `services/production-api.cjs` | diverged both ways (kai-stage +848/-148, main +78/-96) | hosts the stage-deploy routes + guardian wiring + wait-for-phase8/gender-refresh call sites | Surgical merges into main's file, per feature below. |

## Port catalog (by cluster)

### 1. `services/course-editor/` — ABSENT-ON-MAIN (whole module, 25 files) — HIGH VALUE
The only-sanctioned-writer library to the 4 course-content tables, born from the 2026-06-17 cross-course `lego_id` corruption (79 courses hit). Makes the unsafe write inexpressible: every write carries course_code + within-course unique key, asserted pre- and post-DB. Plus the **Edit Guardian** background reviewer (impact → `claude --print` judge → auto-cascade-fix → human ping).
- **Phase 1 (port now, safe):** `index/editor/scoping/operations/impact/text-ops/errors/cli` + `__tests__`. Self-contained (only `supabase-client.cjs`, already on main). ~85 vitest cases run against an in-memory fake — `npx vitest run services/course-editor/__tests__/` validates with no DB. Undo assumes `content_audit_log` triggers exist on main's DB (writes work without; you lose one-click restore).
- **Phase 2 (optional, gated):** `guardian*.cjs`, `guardian-runtime.cjs`, `parallel-courses.cjs` + migration `20260617_edit_guardian.sql` + playbook + `production-api.cjs` wiring (3 callsites) + `src/composables/useGuardian.js`. Ships dormant (`EDIT_GUARDIAN_ENABLED` off). Perf caveat: cross-course shared-audio probe scans `course_audio` by raw text (unindexed) → can statement-timeout; `4bd75f32` already made it non-fatal.
- **CI guard caveat:** `tools/ci/check-no-adhoc-db-writes.mjs` forbids ad-hoc `.update/.insert/.delete` on the 4 tables outside this dir — will FAIL CI where main still has ad-hoc writes (production-api, qa.cjs). Bring it only with a plan to migrate/baseline those sites.

### 2. briefs / build infra — PARTIAL on main (high-value)
- **`services/briefs/translate.cjs`** (biggest win): data-driven side-selection (counts empty known/target, translates larger-gap side — fixes zho_for_hin mis-pointing), native-reference injection (reads `reference-examples/<lang>.json`), WEAK_LLM_LANGS→auto Opus vs Sonnet, two-sided per-side done-counting, monitor limit fix. Uncommitted +7 (fra_ca/deu_at → WEAK_LLM_LANGS) reads FINISHED. Needs `shared.cjs` + the reference files.
- **`services/briefs/reference-examples/`** — ABSENT dir. Committed: deu_ch, fin, hak, nan, yor, yue. **UNTRACKED (commit first): `deu_at.json`, `fra_ca.json`** — the pair the uncommitted translate.cjs lines point at; port together or the Opus-forcing has no file.
- **`services/briefs/backfill-phrases.cjs`** — direction-explicit brief (hard-error identical sides), ralph-P7 VARIETY section, min_use+model params.
- **`services/course-builder/routes/build.cjs`** — `unset ANTHROPIC_API_KEY` on redo/translate/decompose/final-pass/category-llm/learner-sim spawns (billing/hang fix); build-team targetSeeds resolution + persist + `&target=` threading; dryRun; backfill min_use/seeds/model forwarding. Uncommitted +3 (whitelisted model override on translate route, default opus) FINISHED. **Flag: build-team route still hardcodes opus AND missed the ANTHROPIC_API_KEY unset the others got.**
- **`services/course-builder/lib/language-config.cjs`** — DIALECT_NAMES (ara_eg/sy/lb, yue/hak/nan, deu_ch), isChinese += yue − kor. Uncommitted +11 (fra_ca/deu_at, hak/nan → char-based, EXPORTS DIALECT_NAMES) FINISHED.
- **`services/briefs/shared.cjs`** — DIALECT_NAMES ara→MSA/ara_eg/ara_lb + load-bearing comment. **`build-team-orchestrator.cjs`** — targetSeeds 1-liner. **`services/language-code-service.cjs`** — 'ar'→"Modern Standard Arabic".
- All uncommitted here read FINISHED, not WIP.

### 3. spread tool + phase8 helpers
- **`tools/backfill-spread/analyze.cjs` + `validate.cjs` + `docs/course-optimization/lego-spread-backfill-playbook.md`** — ABSENT-USEFUL, clean drop-in (only dotenv+supabase-js). The LEGO-spread "deepening" tool (used for the spa_for_eng deepening pass). **Reapply to kai-stage — actively in use.**
- **`services/wait-for-phase8-job.cjs`** — ABSENT, WIRED (`production-api.cjs:4648/5169`, clears QA flags after regenerate-role). Port with call sites.
- **`services/gender-refresh-helper.cjs`** — ABSENT, WIRED (`production-api.cjs:11/7337`, syncs `course_gender_expansions` after phrase edit via Haiku CLI). Port with call site.
- **`services/phases/audio-job-queue.cjs`** — ABSENT but **DORMANT/not wired** (nothing imports `createJobQueue`). Port only if also wiring enqueue/202 + `/status.queue`; file alone changes nothing.

### 4. stage-deploy / legacy-export workflow — ABSENT/PARTIAL (one feature)
Step-3 stage tail of the export wizard: deploy course to apidev stage without manual SSH.
- `services/stage-deploy.py` (pexpect driver for `./check -e stage deploy`, auto-answers prompts, `__SD__:` events) + `services/stage-restart.py` (runs restart.sh, watches "Server started") — ABSENT.
- **`production-api.cjs`** 5 routes (`stage-deploy`, `/cancel`, `/status`, `stage-restart`, `/cancel`) + `stageDeployJobs` + `__SD__:` parser — kai-stage-only; **surgical merge into main's file (largest, most error-prone piece).**
- `StageDeployPanel.vue`, `useExportWorkflow.ts` (stage state + `onLegacyAudioCompleted`), `LegacyExportDialog.vue` wiring — additive.
- Independently shippable: `manifest-diff-service.cjs` `computeProgressPreservation()` + `Step3Publish.vue` (learner-progress survival % on the diff); combined-audio fixes in `generate-legacy-manifest.cjs` (`getCombinedVoiceSig` folds voice IDs into UUID → fixes dialect S3-key collision; exact ffprobe duration; `¿¡` regex). **Caveat: cherry-pick only those from generate-legacy-manifest.cjs — it also carries unrelated phase8 fixes (voice_id resolution, ffmpeg→lame, component-guard removal).**
- **Deps:** apidev needs `python3` + `pexpect`; dashboard needs passwordless `ssh ssi@apidev`; apidev paths `COURSES_DIR`/`COURSE_TOOL_DIR`/`STAGE_API_DIR` (env-overridable). `deleteProgress` defaults true (confirm intended). No new migration (`publish_apidev_filename` already on main).

### 5. dashboard UI + misc
- **GuardianStatus.vue + useGuardian.js + App.vue mount** — ABSENT-USEFUL unit (inline Edit-Guardian review toasts via socket.io `guardian:*` events). Depends on guardian-runtime (Phase 2 above).
- **AudioPipeline.vue** flagged-audio regen ("Regenerate N flagged" + Flagged-only, `flaggedOnly:true` regenerate-role per voice) — ABSENT-USEFUL; needs production-api `regenerate-role` honouring `flaggedOnly`.
- **VoiceConfiguration.vue** xAI-first default (reorder toggle, default provider azure→xai, `XAI_SUPPORTED_LANGS` + `defaultProviderForRole()`) — ABSENT-USEFUL, clean.
- **ScriptViewer.vue / LearningJourneyView.vue** jump-to-round — **SUPERSEDED** by main's better version (Round# input, `?round=N` deep-link, ring-highlight). Rescue ONLY the `savePhraseEdit()` **scroll-preservation fix** (removes the two `reloadLearningJourney()` calls on phrase save — `applyLocalText()` already updates in place; main lacks this).
- Trivial/opportunistic: `CourseManager.vue`, `PodDetailView.vue`, `useCourses.js` (committed: MSA relabel, ara_eg/lb flags), `TextGeneration.vue` (Rerun Gender Prep label, targetSeeds in build-team body).
- **`useCourses.js` UNCOMMITTED** — 10 minority-language fallback names (nap, scn, fur, lmo, vec, rgn, pdc, roh, sme, yid). Commit first to port.
- `WORKLIST.md` — branch-tracking noise; union, nothing to port.

## Commit-first list (uncommitted work that must be committed before it can be ported)
`services/tts-service.cjs` (+58, inline-SSML — but see merge-hazard), `services/briefs/translate.cjs` (+7), `services/course-builder/lib/language-config.cjs` (+11), `services/course-builder/routes/build.cjs` (+3), `src/composables/useCourses.js` (+3 minority langs), `services/pod-culture-notes.cjs` (+100), `services/pod-dialogue-generator.cjs` (+75), `tools/sync/reference/language_codes.csv` (+11), the playbook.md (+8); UNTRACKED `reference-examples/deu_at.json`, `reference-examples/fra_ca.json`. (pod-culture-notes / pod-dialogue-generator were not separately audited — review before porting.)

## Proposed "reapply to kai-stage now" shortlist (things we actively use)
1. `tools/backfill-spread/` + playbook (deepening tool — in active use).
2. briefs/build infra (translate.cjs + reference-examples + shared.cjs + language-config.cjs + build.cjs + backfill-phrases.cjs + build-team-orchestrator.cjs + language-code-service.cjs) — the variant-course build pipeline.
3. phase8 staleness guard + qmark-aware linking (onto main's gated phase8) — needed for current audio correctness.
4. course-editor library (Phase 1) — safe, and it's how content edits should be made.
Everything else → Tom's call for main.
