# Trinity Compliance Audit — AudioPipeline.vue and children

> **Date**: 2026-07-17
> **Scope**: `src/views/production/AudioPipeline.vue` + `src/views/production/components/{PipelineProgress,MissingAudio,SharedAudio}.vue` + `src/components/VoiceConfiguration.vue`
> **Trinity**: App→User (output) | User→App (input) | App→App (processing)
> **Method**: Trinity Compliance Campaign brief (`~/command-surface/trinity-campaign-brief.md`), APML Phase 7 checks. Every row below is validated against the actual code cited — nothing here is asserted without a file:line.

---

## Screen: Audio Pipeline (`AudioPipeline.vue`)

Route: `/production/:courseCode/pipeline` (`src/router/index.js:535-540`, name `AudioPipelineProduction`). **No `meta.requiresAuth`** — see Finding B1.

### Load / Error

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→User | Display error banner when `error` is set (AudioPipeline.vue:6-16) |
| 2 | App→App | `onMounted`: `productionStore.loadCourse(courseCode)`, `startProgressPolling()`, `fetchGenderPrepStatus()` (786-799) |
| 3 | App→App | Catch load failure → `error.value = 'Failed to load pipeline data...'` (810-813) |

### Gender Prep banner

| # | Direction | Message |
|---|-----------|---------|
| 4 | App→User | Show banner only if `genderPrepStatus.isGendered` (22) |
| 5 | App→User | "Gender Prep" (processed) vs "Gender Prep not run" (amber) label + expansion/flag counts (37-47) |
| 6 | User→App | Click "Run Gender Prep" (52-58, only shown when `!processed && !genderPrepRunning`) |
| 7 | App→App | `POST /gender-prep/start` → spawns Haiku agents (730-757) |
| 8 | App→User | Success: "Spawned N Haiku agents..." (743-746); Failure: `data.error || 'Failed to spawn'` (750) |
| 9 | App→App | `startGenderPrepPolling()` — 5s poll, stability-detects completion (759-783) |
| 10 | App→User | Final "Done — N gender expansions..." message once stable (776-781) |

### Other-course-job / live-progress banners

| # | Direction | Message |
|---|-----------|---------|
| 11 | App→User | "Audio job running on another course" banner when a *different* course's job is active (64-83) |
| 12 | App→User | Live circular progress + stats (Processed/Total/Success/Failed) when active for *this* course (86-148) |
| 13 | App→App | `pollAudioProgress()` — `GET /api/audio/status` every 10s (624-660) |
| 14 | App→App | Detect completion (was active → now inactive) → `refreshAudioStats()` + patch `regenerateResult` to `completed` (634-648) |
| 15 | App→App | After 3 consecutive poll errors, silently `stopProgressPolling()` (654-658) — see Finding A1 |

### Voice Configuration section

| # | Direction | Message |
|---|-----------|---------|
| 16 | App→User | "● Configured" / "● Setup Required" badge (155-160) |
| 17 | User→App | Click header to toggle `showVoiceConfig` (164-188) |
| 18 | App→User | Render `<VoiceConfiguration>` inline when expanded (189-195) |
| 19 | App→App | `onVoiceConfigLoaded`/`onVoiceConfigSaved` recompute `voicesConfigured` from the 3 required voice IDs (918-943) |
| 20 | App→App | Auto-expand panel if not configured (927-930) |
| 21 | App→App | Bump `missingAudioKey` on save → forces `MissingAudio` refetch (941-942) |

### Audio Generation — Regenerate by Role

| # | Direction | Message |
|---|-----------|---------|
| 22 | App→User | Role `<select>` (228-238) |
| 23 | User→App | Choose role (229) |
| 24 | User→App | Click "Preview" — disabled unless role chosen, not `regenerating`, not `otherCourseJobActive` (242-248) |
| 25 | App→App | `POST /api/audio/regenerate-role/:course` `{dryRun:true}` (946-982) |
| 26 | App→User | Preview result: count/voiceId/error (259-282, 966-976) |
| 27 | User→App | Click "Regenerate" — same disabled guard (249-255) |
| 28 | User→App | Native `confirm()` — "This will regenerate N ... Continue?" (988-993) |
| 29 | App→App | Cancel confirm → **no-op, no message** (993 `if (!confirmed) return`) — acceptable (explicit cancel, not a failure) |
| 30 | App→App | `POST /api/audio/regenerate-role/:course` `{dryRun:false}` (984-1043) |
| 31 | App→User | 202/accepted → "Running..." status, live progress banner takes over (1014-1024) |
| 32 | App→User | Sync (200) → "Complete", success/failed counts (1025-1037) |
| 33 | App→User | Error → red "Error" state + message (1012-1013, 259-275) |

### Audio Generation — Introductions (informational card)

| # | Direction | Message |
|---|-----------|---------|
| 34 | App→User | Static copy: intros authored automatically during Generate (286-323) |
| 35 | App→User | "`N` introduction(s) will be authored on the next Generate run" when `progressStats.toAuthor > 0` (315-318) |
| 36 | App→User | Note that the agent flags suspected content errors (319-322) |

### Pipeline Status section

| # | Direction | Message |
|---|-----------|---------|
| 37 | App→User | "Linking unlinked audio..." spinner text while `productionStore.isLinkingAudio` (333-339) |
| 38 | User→App | Click "Refresh" (340-350) |
| 39 | App→App | `refreshAudioStats()` → `GET /audio-stats?fresh=1`, updates store; failure path is a **bare comment "Silently fail"**, no user feedback (663-683) — Finding A2 |
| 40 | App→User | `<PipelineProgress>` dashboard (354-366) |
| 41 | User→App | Drag/type Concurrency slider or number input, 1-20 (376-393) |
| 42 | App→App | `updateConcurrency()` clamps `Math.max(1,Math.min(20,value))`, persists to `localStorage` (855-858) — validated |
| 43 | User→App | Click "Generate Missing Audio" / "Link N audios" — disabled unless `canStartGeneration && !isGenerating && !startingGeneration` (399-413) |
| 44 | App→App | `canStartGeneration` computed: requires `pending>0 \|\| linkable>0` AND `readyForGenerate !== false` (835-841) — validated |
| 45 | App→App | `productionStore.startGeneration()` → `POST /audio-pipeline/start {approved:true, options}` (861-885) |
| 46 | App→User | Populate `generateSummary` (authored/flags/samples) and `linkResult` banners on success (867-878) |
| 47 | App→User | Failure → `error.value = err.message \|\| 'Failed to start generation'` (880-882) |
| 48 | User→App | Click "Cancel" — shown only while `isGenerating` (414-423) |
| 49 | App→App | `cancelGeneration()` → `await productionStore.cancelGeneration(courseCode)`, **no try/catch, no success/failure message** (887-889) — Finding A3 (MISSING TWIN) |
| 50 | User→App | Click "Retry Failed" — shown only when `hasFailed && !isGenerating` (424-433) |
| 51 | App→App | `retryFailed()` → `await productionStore.retryFailed(courseCode)`, **no try/catch, return value discarded, no user feedback either way** (891-893) — Finding A4 (MISSING TWIN) |
| 52 | App→User | "Linked N audio IDs..." banner, auto-clears after 10s (436-442, 874-877) |
| 53 | App→User | Authoring summary card: authored count + flags + per-flag sample rows (444-464) |
| 54 | App→User | Generation Plan panel (`showPlan`/`planResult`) — total/existing/missing/cost, "Generate Missing Audio (N files)" CTA (466-532) — **Note**: `showPlan()` (895-915) is defined but **never bound to any template element** in this file — Finding A5 (UNREACHABLE, class 5) |

### Missing Audio / Shared Audio sections

| # | Direction | Message |
|---|-----------|---------|
| 55 | App→User | Section header "Missing Audio" (537-540) |
| 56 | App→App | `<MissingAudio :course-code :refresh-trigger="missingAudioKey">` (542) |
| 57 | App→User | Section header "Shared Audio" (547-550) |
| 58 | App→App | `<SharedAudio :course-code>` (552) |

---

## Component: `PipelineProgress.vue`

Pure presentational — all props, no fetches of its own.

| # | Direction | Message |
|---|-----------|---------|
| 59 | App→User | Ledger grid (6 cards: In scope/Linked/Link ready/Intros to author/TTS jobs/Skipped) when `ledger` prop present (15-71) |
| 60 | App→User | Legacy 4-card grid (Total/Generated/Pending/Failed) when `ledger` is falsy (74-106) — dual-schema fallback, see Finding A6 |
| 61 | App→User | Progress bar %, computed from `ledger` if present else `total/generated` (108-123, 245-252) |
| 62 | App→User | "One button — Generate runs three stages" explainer, shown only `!loading && hasWork` (126-159) |
| 63 | App→User | "Every slot linked" complete banner when `isComplete` (162-170) |
| 64 | App→User | Cost/Time estimate cards, else "Run plan to estimate" placeholder (172-202) — placeholder text references a "plan" action that Finding A5 shows is unreachable from this screen |
| 65 | App→App | `progressPercent`, `hasWork`, `isComplete`, `actualCost` computed from props (245-268) — `actualCost` is **hardcoded `'$0.00'`**, comment admits "would come from the store in a real implementation" (264-268) — Finding B2 (UNSPECIFIED CONTENT, class 4) |

---

## Component: `MissingAudio.vue`

| # | Direction | Message |
|---|-----------|---------|
| 66 | App→User | Collapsed header: title + "N missing" / "All Complete" badge (4-19) |
| 67 | User→App | Click header to toggle `expanded` (4-9) |
| 68 | App→App | `watch(expanded)` → on first expand, fires `fetchMissingAudio()` + `fetchOrphanLegos()` + `fetchUngeneratable()` (625-631) |
| 69 | App→User | Loading spinner while `loading` (34-37) |
| 70 | App→User | Error text on fetch failure — `error.value = 'Failed to load: ' + err.message` (40-42, 502-504) |
| 71 | App→User | Per-process missing counts: Azure Phrases/Seeds/LEGOs (49-85) |
| 72 | App→User | Total Missing counter (87-93) |
| 73 | App→User | Orphan-LEGO warning banner + count, shown only if `orphanLegos.length > 0` (96-110) |
| 74 | User→App | Click "Fix N orphans" (103-109) |
| 75 | App→App | `POST /audio-pipeline/fix-orphan-legos {dryRun:false}` (584-622) |
| 76 | App→User | Success path clears `orphanLegos` and refetches — **but only inside `if (result.success && result.addedCount > 0)`; if `success:true` with `addedCount:0`, spinner just stops with zero feedback** (609-615) — Finding A7 |
| 77 | App→User | Failure → `error.value = 'Failed to fix orphan LEGOs: ...'` (617-618) |
| 78 | App→User | Ungeneratable-items warning (collapsible table: From/Role/ID/Text), shown only if `ungeneratableItems.length > 0` (112-158) |
| 79 | User→App | Click to expand/collapse ungeneratable table (117-137) |
| 80 | App→User | Category tabs: Azure (Phrases/Seeds/LEGOs) + ElevenLabs (Encouragements/Instructions/Welcome), each with a live missing-count badge (161-256) |
| 81 | User→App | Click a category/role tab → `selectCategory()` (168-254, 475-478) |
| 82 | App→User | Sample-audio player + "Play Sample"/"Pause" for `phrase` category (259-285) |
| 83 | User→App | Click Play/Pause (267, 510-528) |
| 84 | App→App | `playSample()` toggles playback, pauses all other role `<audio>` refs first (510-528) |
| 85 | App→User | Shared-audio info blurb per selected ElevenLabs category (welcome/encouragements/instructions) with required/existing/missing counts (287-323) |
| 86 | App→User | Missing-items table (Location/Text), empty-state text varies by category (325-355) |
| 87 | App→App | `watch(refreshTrigger)` — clears data and refetches all three endpoints when `AudioPipeline.vue` bumps `missingAudioKey` (634-642) |
| 88 | App→App | `fetchOrphanLegos()` / `fetchUngeneratable()` failures → `console.warn` only, **no user-facing error at all** (572-582, 545-554) — Finding A8 |

---

## Component: `SharedAudio.vue`

| # | Direction | Message |
|---|-----------|---------|
| 89 | App→User | Section header + subtitle explaining scope (welcome/encouragements/instructions, "generated by separate scripts, not by Generate Missing Audio") (2-11) |
| 90 | App→App | `onMounted(load)` + `watch(courseCode, load)` (150-151) |
| 91 | App→User | Loading text (13) |
| 92 | App→User | Error text — `error.value = e.message` (14, 122-124) |
| 93 | App→User | Welcome row: status pip (populated/missing), "▶ Listen" button gated on `status.welcome.populated && s3_key` (17-41) |
| 94 | User→App | Click "▶ Listen" (30-35) |
| 95 | App→App | `playWelcome()` — resolves signed URL via `/audio/:uuid/url`, plays (129-148) |
| 96 | App→User | Failure paths — regex match fails (134-135 `if (!m) return`), fetch not-ok (137-138 `if (!r.ok) return`), or play() rejection (143 `.catch(() => { playingWelcome.value = false })`) — **all three silently no-op; button just never starts playing, zero user feedback** (129-148) — Finding A9 |
| 97 | App→User | Instructions / Encouragements rows via `SharedBucketRow` — populated/total + status pip + sub-text (44-59) |
| 98 | App→User | Paywall row: "Not required for this course" (non-applicable target lang) vs live populated count / "REQUIRED..." warning when applicable but empty (61-85) |

---

## Component: `VoiceConfiguration.vue`

**Usage confirmed**: imported and rendered by `AudioPipeline.vue:569,190-194` as `<VoiceConfiguration :course-code @config-saved @config-loaded>`, inside the collapsible "Voice Configuration" section. **Not orphaned** — this closes the class-5 question posed in the task brief.

| # | Direction | Message |
|---|-----------|---------|
| 99 | App→User | Header + subtitle "Changes save automatically" (4-7) |
| 100 | App→App | `onMounted`/`watch(courseCode)` → `loadConfig()` + `loadSeedPhrases()` (996-1010) |
| 101 | App→User | Loading spinner (10-13) |
| 102 | App→User | Error state + "Retry" button (16-20) |
| 103 | App→App | `loadConfig()`: try Supabase direct read first, fall back to `GET /api/courses/:code/voice-config` (775-802) |
| 104 | App→User | 4 swim lanes (Voice 1/2, Known, Presentation), each showing current selection or "Select Voice" empty state (23-93) |
| 105 | User→App | Click "Select Voice" / "Change Voice" → `expandRole()` (83-90, 764-773) |
| 106 | App→App | `expandRole()` resets filters, auto-triggers `discoverVoices()` if provider is azure (764-773) |
| 107 | App→User | Speed notches (0.7-1.5x), highlights active value (48-64) |
| 108 | User→App | Click a speed notch → `setSpeed()` (53-58, 753-762) |
| 109 | App→App | `setSpeed()` mutates config, calls `saveConfig()` — **no guard if `config.value.voices[roleId]` is undefined beyond an early `return`** (754 `if (!config.value.voices[roleId]) return`) — silent no-op, acceptable since notches only render when a voice is already selected |
| 110 | App→User | Preview phrase text + cycle (↻) button (67-71) |
| 111 | User→App | Click cycle → `cyclePhrase()` (70, 721-725) |
| 112 | User→App | Click "▶ Test Voice" — disabled while `testingRole === role.id` (72-79) |
| 113 | App→App | `testVoice()` → `POST /api/voices/preview`, plays result, cycles phrase after (890-933) |
| 114 | App→User | **Failure path is `console.error` only — no visible error, button simply stops spinning with no audio and no explanation** (928-932) — Finding A10 |
| 115 | App→User | Provider toggle (Azure/ElevenLabs/xAI) (103-122) |
| 116 | User→App | Click provider button → `discoverVoices()` for azure/xai (104-121) |
| 117 | App→App | `discoverVoices()` → `GET /api/voices/discover/:lang?provider=` (834-854) |
| 118 | App→User | Discovering spinner / voice list / "Load Available Voices" fallback button (144-221) |
| 119 | App→App | `discoverVoices()` failure → `console.error` only, `discoveredVoices` stays `[]`, UI silently falls back to the "Load Available Voices" retry button — **acceptable**, since the button IS the retry affordance (unlike A10/A9 which have no retry) |
| 120 | User→App | Type search / select locale / select gender filter (150-184) |
| 121 | App→App | `filteredVoices` computed — chained filter by gender/locale/search (663-686) |
| 122 | User→App | Click a voice row → `selectVoiceForRole()` (188-206, 935-949) |
| 123 | User→App | Click "Preview" on a voice row → `previewVoice()` (199-205, 856-888) |
| 124 | App→User | **Same silent-failure pattern as Test Voice** — catch resets `previewingVoiceId` only, `console.error`, no user message (884-887) — Finding A10 (same class, second site) |
| 125 | App→App | `filteredVoices.slice(0,20)` cap on Azure list + "+N more voices" note (189, 209-211) — **not paginated further; the other 20+ voices are unreachable** for locales with >20 matches — Finding A11 (UNREACHABLE, class 5, minor — mitigated by locale/gender/search filters that can narrow below 20) |
| 126 | App→User | xAI voice list — no 20-cap, has explanatory note about multilingual voices (224-279) |
| 127 | App→User | ElevenLabs manual entry: Voice ID + Display Name inputs (282-302) |
| 128 | User→App | Type Voice ID / Display Name, click "Use This Voice" — disabled unless `manualVoiceId` set (283-301) |
| 129 | App→App | `selectManualVoiceForRole()` — **zero format validation on `manualVoiceId`** (any string accepted as a real ElevenLabs voice ID) (951-969) — Finding A12 (UNVALIDATED, class 2, low severity — bad ID just fails at TTS-call time server-side) |
| 130 | App→App | `saveConfig()` → `PUT /api/courses/:code/voice-config` (804-832) |
| 131 | App→User | Save status pill: "Saving..." / "Saved!" (auto-clears 2s) / error message (352-354, 805,826-830) — this path IS fully twinned (contrast with A9/A10) |
| 132 | App→User | Learner Playback section (shown once `config` loaded): Belt Ramp toggle + Global Speed notches (308-349) |
| 133 | User→App | Click Belt Ramp row → `toggleBeltRamp()` (314-324, 972-977) |
| 134 | User→App | Click a global-speed notch → `setGlobalSpeed()` (334-345, 984-989) |
| 135 | App→App | Both call `saveConfig()` — inherits the same save-status twin as #131 |

---

## Auth-blindness check

None of the 5 audited files import or reference `useAuth` (grep across all five: zero hits). All network calls in `AudioPipeline.vue`, `MissingAudio.vue`, `SharedAudio.vue`, and `VoiceConfiguration.vue` build headers via either a local `getApiHeaders()`/inline `{'ngrok-skip-browser-warning':'true'}` object or `production.js`'s module-level `getApiHeaders()` (`src/stores/production.js:48-53`) — **none of these attach an `Authorization` header or session token**.

Server-side: the corresponding endpoints (`services/production-api.cjs:5522` `/audio-pipeline/start`, `:5603` `/cancel`, `:5619` `/retry`, `:9034` `/gender-prep/start`, `:1448/:1460` `/voice-config` GET/PUT) show **no auth middleware** in front of them (grepped `requireAuth|authenticate|verifyToken|checkAuth` in `production-api.cjs` — the only hit in the whole file is an unrelated comment at line 4415 about attributing a recording to a logged-in user, not a gate). The route itself (`src/router/index.js:535-540`, `pipeline`) carries **no `meta.requiresAuth`**, unlike sibling routes in the same file (`/record`, `/users` both set `requiresAuth: true` at lines 347, 353).

**This means: anyone who can reach `/production/:courseCode/pipeline` — and anyone who can hit the API host directly — can trigger real-money TTS generation (`startGeneration`, `executeRegenerate`) with no authentication check anywhere in the client or the server route.** See Finding B1.

---

## Findings (classed 1-5, most severe first)

| # | Class | File:Line | Finding |
|---|-------|-----------|---------|
| **B1** | **2 — UNVALIDATED** | `services/production-api.cjs:5522,5603,5619,9034`; `src/router/index.js:535-540` | Cost-incurring audio generation (`/audio-pipeline/start`, `/gender-prep/start`) and its cancel/retry siblings have **no auth middleware server-side** and the `pipeline` route carries no `meta.requiresAuth`, unlike sibling routes (`:347,:353`) in the same router file. Any unauthenticated client that reaches these URLs can spend real TTS money — directly contradicts the CLAUDE.md approval-gate on TTS spend. Highest-severity finding in this set. |
| **A3** | 3 — MISSING TWIN | `AudioPipeline.vue:887-889` | `cancelGeneration()` calls `await productionStore.cancelGeneration(...)` with no `try/catch`. The store function throws on `!response.ok` (`production.js:843`) — an unhandled promise rejection with zero user-visible message; the Cancel button just does nothing observable. |
| **A4** | 3 — MISSING TWIN | `AudioPipeline.vue:891-893` | Same pattern for `retryFailed()` — no try/catch, and even on success the return value is discarded, so there is no success message either. Full silent failure both ways. |
| **A9** | 3 — MISSING TWIN | `SharedAudio.vue:129-148` | `playWelcome()` has three independent silent-failure exits (`if (!m) return`, `if (!r.ok) return`, `.catch(() => ...)`) — none show any error. Clicking "▶ Listen" and having it do nothing is indistinguishable from a slow network vs. a real failure. |
| **A10** | 3 — MISSING TWIN | `VoiceConfiguration.vue:884-887, 928-932` | `previewVoice()` and `testVoice()` both catch to `console.error` only. A learner-facing production tool (choosing course voices) gives zero on-screen feedback when TTS preview fails — the tester can't tell "bad voice ID" from "API down" from "just slow." |
| **A8** | 3 — MISSING TWIN | `MissingAudio.vue:558-582 (fetchOrphanLegos)`, `530-555 (fetchUngeneratable)` | Both fetches degrade to `console.warn` on failure with no user-facing state — the orphan-LEGO banner and ungeneratable-items warning simply never appear, silently under-reporting real content problems rather than surfacing a fetch error. |
| **A2** | 3 — MISSING TWIN | `AudioPipeline.vue:663-683` | `refreshAudioStats()` catch block is a bare `// Silently fail` comment. The "Refresh" button (#38) can fail with zero feedback beyond the spinner stopping. |
| **A5** | 5 — UNREACHABLE/ORPHAN | `AudioPipeline.vue:895-915` (`showPlan`), template `467-532` | `showPlan()` computes and would display the Generation Plan panel (cost/time/missing breakdown, "Generate Missing Audio (N files)" CTA) but **is never called from any template element in this file** — no button anywhere invokes it. The entire Plan Results Display block (lines 466-532, ~65 lines) and its underlying `productionStore.generatePlan()` call are dead code from this screen's perspective. `PipelineProgress.vue`'s own placeholder text ("Run plan to estimate", #64) references an action the user has no way to trigger here. |
| **A1** | 4 — UNSPECIFIED CONTENT | `AudioPipeline.vue:654-658` | After 3 consecutive poll errors, `stopProgressPolling()` fires with only a `console.warn` — the live-progress UI just stops updating with no on-screen indication that polling died vs. the job genuinely finished. |
| **A7** | 3 — MISSING TWIN | `MissingAudio.vue:609-615` | `fixOrphanLegos()` success branch is gated on `result.success && result.addedCount > 0` — a `success:true, addedCount:0` response (a legitimate "nothing to fix" outcome) produces no message at all; the button just stops spinning. |
| **B2** | 4 — UNSPECIFIED CONTENT | `PipelineProgress.vue:264-268` | `actualCost` is hardcoded to `'$0.00'` with a comment admitting it "would come from the store in a real implementation." The Cost Estimate card always shows a real-looking but fake actual-cost figure once `isComplete` is false is not the issue — the issue is `CostEstimate.vue` (grandchild, out of this audit's direct scope) receives this stub as if genuine. |
| **A11** | 5 — UNREACHABLE (minor) | `VoiceConfiguration.vue:189,209-211` | Azure voice list caps at `.slice(0, 20)` with a "+N more voices" note but no "show more"/pagination affordance — the remainder is only reachable by narrowing locale/gender/search filters below 20 results, not directly. |
| **A12** | 2 — UNVALIDATED (minor) | `VoiceConfiguration.vue:951-969` | `selectManualVoiceForRole()` accepts any non-empty string as an ElevenLabs Voice ID with no format check — fails silently later at TTS-call time instead of at entry. |
| — | not a defect | `PipelineProgress.vue:74-106` vs `15-71` | Dual ledger/legacy card grids are an intentional migration shim per the code comment ("until the backend redeploy delivers the ledger") — noted for completeness, not counted as a finding. |

---

## Summary

- **Files covered**: 5/5 — `AudioPipeline.vue`, `PipelineProgress.vue`, `MissingAudio.vue`, `SharedAudio.vue`, `VoiceConfiguration.vue`.
- **VoiceConfiguration.vue orphan check**: **not orphaned** — actively rendered from `AudioPipeline.vue`'s Voice Configuration section.
- **Trinity messages catalogued**: 135.
- **Findings by class**: Class 2 (UNVALIDATED) — 2 (B1, A12). Class 3 (MISSING TWIN) — 7 (A2, A3, A4, A7, A8, A9, A10). Class 4 (UNSPECIFIED CONTENT) — 2 (A1, B2). Class 5 (UNREACHABLE/ORPHAN) — 2 (A5, A11). Class 1 (UNTYPED) — 0 found.
- **Worst 3**: B1 (unauthenticated cost-incurring TTS endpoints), A5 (dead Generation Plan feature — ~65 lines of unreachable UI + a store call), A3/A4 tied (Cancel/Retry buttons fail completely silently on a screen whose whole job is showing pipeline state accurately).
