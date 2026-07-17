# Trinity Compliance Audit — TextGeneration.vue

> **Date**: 2026-07-17
> **Scope**: `src/views/production/TextGeneration.vue` (1987 lines) — the live orchestrator chat/pipeline screen, Production Suite
> **Trinity**: App→User (output) | User→App (input) | App→App (processing)
> **Protocol**: `~/command-surface/trinity-campaign-brief.md` (Phase 7 checks, 5 finding classes)

---

## Auth-blindness check

`grep -n "useAuth"` and `grep -n "role\|permission\|admin"` over the whole file return **zero** hits for any authentication/authorization guard. The file does not import `useAuth`, checks no role, and gates no action on auth state. Every mutating action below (course creation, translation start/reset, build-team spawn, mass-approve, ZUT resolve, component backfill, gender prep, agent kill, redo/approve seed, chat send) is reachable by anyone who can load the route — the screen relies entirely on router-level or upstream gating (not visible in this file) for access control. Flagged as a standing finding (see F-1).

---

## Screen: Text Generation Orchestrator (TextGeneration.vue)

### Create Mode (`isCreateMode` — `props.courseCode === 'new'`)

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→User | Display "New Course" panel with Known/Target language selects (L5-33) |
| 2 | App→User | Select placeholder reads "Loading..." while `languagesLoading`, else "Select known/target language" (L15, L27) |
| 3 | App→User | Populate language `<option>`s from `languages` (name + code) (L16-18, L28-30) |
| 4 | User→App | Select known language (`v-model="knownLanguage"`) (L12) |
| 5 | User→App | Select target language (`v-model="targetLanguage"`) (L24) |
| 6 | App→App | `computedCourseCode` derives `{target}_for_{known}` once both are set (L629-632) |
| 7 | App→User | Show computed course-code panel + "Create Course" button once both languages chosen (L35-47) |
| 8 | User→App | Click "Create Course" (L41) |
| 9 | App→App | `createCourse()` → `POST /api/courses/create` with `{courseCode, knownLanguage, targetLanguage, seedStart:1, seedEnd:seedCount, seedCount}` (L1168-1200) |
| 10 | App→User | Button shows "Creating..." while `creatingCourse` (L42-45) |
| 11 | App→User | On success: navigate to `/production/{courseCode}/text` (L1193) — **no success message shown, just a silent route change** |
| 12 | App→User | On failure: `alert(...)` browser-native dialog with error message (L1196) |
| 13 | App→App | `loadLanguages()` fetches `/api/languages?tts=true&format=legacy` on mount in create mode (L1795-1818, L1831-1833) |
| 14 | App→App | On language-fetch failure: silently falls back to a hard-coded 6-language list, no user-visible error (L1805-1814) |

### Target Seeds Control (non-create mode, L51-75)

| # | Direction | Message |
|---|-----------|---------|
| 15 | App→User | Display seed-count preset buttons (MVP=300, Full=668) + free-entry number input (L55-72) |
| 16 | User→App | Click a preset button → `seedCount = size.seeds` (L58) |
| 17 | User→App | Type a custom value into the number input, `min=1 max=1000` (L66-72) |
| 18 | App→App | **No validation runs on the typed value** — `min`/`max` are HTML attributes only; nothing clamps or rejects out-of-range/non-numeric input before it drives `seedCount` used in build-team/translate totals (see F-2) |

### Course Stats Summary Bar (L78-108)

| # | Direction | Message |
|---|-----------|---------|
| 19 | App→User | Show Seeds/LEGOs/Phrases/Ratio/Quality stat tiles, gated on `progress.currentSeed > 0 \|\| progress.legosInserted > 0` (L78-101) |
| 20 | App→User | Show "N agent(s)" indicator with pulsing dot when `agents.running_count > 0` (L103-106) |
| 21 | App→App | `ratio`/`ratioClass`/`qualityScoreClass` computeds derive color-coded thresholds from `progress` (L1072-1091) |

### Chat Panel

| # | Direction | Message |
|---|-----------|---------|
| 22 | App→User | "Chat" toggle button; pulses amber when `orchestratorHasPending` (L121-132) |
| 23 | App→User | Unread badge (count, "99+" cap) when `unreadChatCount > 0` and panel closed (L131) |
| 24 | User→App | Click "Chat" toggle → `chatExpanded = !chatExpanded` (L122) |
| 25 | App→App | `watch(chatExpanded)` → `buildMonitor.setFastPolling(open)` (L668) |
| 26 | App→User | Header dot: green if `agents.running_count > 0` else grey; label "Agent Chat" (L143-146) |
| 27 | App→User | Message count "N messages" (L147) |
| 28 | User→App | Click "Clear" → `clearChat()` (L149, L1702-1706) |
| 29 | App→App | `clearChat()` stamps `chatClearedAt` to now + persists to `localStorage['chat_cleared_at']` (L1703-1705) — **client-only, per-browser; clears nothing server-side** |
| 30 | App→User | Empty state "Messages with the decompose agent will appear here" when no visible messages (L154-156) |
| 31 | App→User | Render each message bubble (human right-aligned violet; agent left-aligned, dimmed if `status==='responded'`) + timestamp (L157-173) |
| 32 | User→App | Type in message textarea (L179-185) |
| 33 | User→App | ⌘+Enter → `sendChat()` (L184) |
| 34 | User→App | Click "Send" → `sendChat()` (L187) |
| 35 | App→User | Send button shows "..." and pulses while `chatSending` (L188-192) |
| 36 | App→App | `sendChat()` optimistically appends a local message, clears input, scrolls (L1708-1726) |
| 37 | App→App | Regex-detects `"redo seed(s) N[, M...]"` and routes to `POST /api/build/redo/{courseCode}` instead of chat (L1729-1747) |
| 38 | App→App | Otherwise `POST /api/orchestrator/chat/{courseCode}` with `{role:'human', message}` (L1749-1753) |
| 39 | App→App | `buildMonitor.refresh()` to pick up server-assigned ID + any agent reply (L1755) |
| 40 | App→User | **On `sendChat()` failure: `console.error` only — no error surfaced in the UI; the optimistic message stays shown as if sent** (L1756-1759; see F-3) |

### Process Activity Banner (L197-204)

| # | Direction | Message |
|---|-----------|---------|
| 41 | App→User | Cyan pulsing banner with latest system progress message + "Xs/m/h ago" while `processActive` (L198-204) |
| 42 | App→App | `processActive`/`latestProcessMessage` derived from `orchestratorMessages` where `direction==='agent_to_human' && metadata.source==='system'`, active window = 5 min (L852, L868-878) |

### Stage 1 — Translate (L206-256)

| # | Direction | Message |
|---|-----------|---------|
| 43 | App→User | Stage card: number badge, title, subtitle "{N} seed translations", progress fraction, progress bar (L207-256) |
| 44 | App→User | "Done" badge when `stageComplete('translate')` (L218, L1017) |
| 45 | User→App | Click "Reset" (only visible when complete) (L221) |
| 46 | App→App | `confirmResetTranslations()` → `window.confirm(...)` native dialog (L1230-1233) |
| 47 | App→App | On confirm: `POST /api/course/{courseCode}/reset-translations` (L1238-1241) |
| 48 | App→User | Button label "Resetting..." while in flight (L225) |
| 49 | App→User | On success: `console.log` only (no UI toast) — user sees the stage revert to non-complete via next poll (L1243) |
| 50 | App→User | On failure: `showActionError(...)` → red dismissable banner (L1246, L710-714, L113-116) |
| 51 | App→User | "Translating — last seed {Xs/m/h ago}" while `translateActive` (L227-229) |
| 52 | App→User | "Spawned — waiting for first seed..." pulsing while `translateSpawned` (L230) |
| 53 | App→User | Stale state: "No new seeds for {time}" + "Check" + "Restart" buttons when `translateStale` (5 min no activity) (L231-242) |
| 54 | User→App | Click "Check" → `buildMonitor.refresh()` (L234) |
| 55 | User→App | Click "Restart"/"Start Translate"/"Continue Translate" → `startTranslation()` (L238, L245) |
| 56 | App→App | `startTranslation()` → `POST /api/build/translate/{courseCode}` (L1202-1224) |
| 57 | App→User | On success: sets `translateSpawned=true`, refreshes monitor — **no distinct "started" message, relies on spawned-state UI** (L1214-1215) |
| 58 | App→User | On failure: `showActionError` banner (L1217) |

### Stage 2 — Build Team (L258-301)

| # | Direction | Message |
|---|-----------|---------|
| 59 | App→User | Stage card: number, title, subtitle (`buildTeamSubtitle`), fraction, "Done"/"Locked" badges, progress bar (L259-301) |
| 60 | App→User | Locked-state badge + subtitle "Waiting for translations" while `stageLocked('build-team')` (L271, L922, L1028) |
| 61 | App→User | "Building — last seed {time}" while `buildActive` (L272-274) |
| 62 | App→User | "Spawned — waiting..." pulsing (L275) |
| 63 | App→User | Stale: "No new seeds for {time}" + Check/Restart (L276-287) |
| 64 | User→App | Click "Check"/"Restart"/Start/Continue button → `buildMonitor.refresh()` or `startBuildTeam()` (L279, L283, L290) |
| 65 | App→App | `startBuildTeam()` → `POST /api/build/team-start/{courseCode}` (L1255-1277) |
| 66 | App→User | On failure: `showActionError` (L1270) |
| 67 | App→User | On success: sets `buildTeamSpawned=true` — no distinct confirmation message (L1267) |

### Stage 3 — Final Pass (wizard, L303-341)

| # | Direction | Message |
|---|-----------|---------|
| 68 | App→User | Stage card: "Locked"/"Done" badges, subtitle (`finalPassSubtitle`), progress summary line (`finalPassSummary`) (L304-341) |
| 69 | App→User | Two dynamic action buttons: `finalPassApproveAction` (approve, shown only when no blockers) + `finalPassNextAction` (priority-ordered: backfill → redo-flagged → review-drafted → approve-all) (L316-334, L931-983) |
| 70 | User→App | Click "Backfill N seeds" → `startBackfillPhrases()` (L939, L1447-1469) |
| 71 | App→App | `POST /api/build/backfill-phrases/{courseCode}` (L1454-1457) |
| 72 | User→App | Click "Redo N flagged seeds" → `redoAllFlagged()` (L947, L1676-1699) |
| 73 | App→App | `POST /api/build/redo/{courseCode}` with all flagged seed numbers + fixed note "Redo all flagged seeds" (L1684-1688) |
| 74 | App→App | Optimistically flips flagged cells to `building` before server confirms (L1690-1692) |
| 75 | User→App | Click "Review N seeds" → `startFinalPass('drafted')` (L955, L1279-1313) |
| 76 | App→App | `POST /api/build/final-pass/{courseCode}?seeds=...` (drafted seed numbers only) (L1289-1301) |
| 77 | User→App | Click "Approve N" / "Approve all seeds" → `massApproveSeeds()` (L963, 978, L1315-1340) |
| 78 | App→App | `POST /api/build/mass-approve/{courseCode}` — **no confirmation dialog**, unlike translation reset (L1322-1325; see F-4) |
| 79 | App→User | All four actions: failure → `showActionError` (L1270, L1306, L1333, L1387 style); **success → no distinct message, only state/badge changes** (see F-5) |

### Stage 4 — Verify Components (L343-392)

| # | Direction | Message |
|---|-----------|---------|
| 80 | App→User | Subtitle: "M-LEGO component completeness" (unchecked) / "All N M-LEGOs have components" / "N of M need components" (L350-354) |
| 81 | App→User | Gap breakdown badges: missing/empty/partial counts, colour-coded (L358-364) |
| 82 | User→App | Click "Check" → `checkComponentGaps()` (L368, L1353-1369) |
| 83 | App→App | `GET /api/build/component-gaps/{courseCode}` (L1360-1362) |
| 84 | App→User | On fetch failure: `console.error` only — `componentGaps` stays `null`, UI silently reverts to "Check" button, **no error banner** (L1364-1366; see F-6) |
| 85 | User→App | Click "Fix N M-LEGOs" → `startComponentBackfill()` (L376, L1371-1394) |
| 86 | App→App | `POST /api/build/component-backfill/{courseCode}` (L1378-1381) |
| 87 | App→User | Button label "Agent working..." while `componentBackfillSpawned` (L380) |
| 88 | App→App | Spawned flag auto-resets once a new orchestrator message arrives beyond the spawn confirmation (L787-789) |
| 89 | User→App | Click "Recheck" → `checkComponentGaps()` again (L384) |

### Stage Z — Zero Uncertainty (ZUT) (L394-437)

| # | Direction | Message |
|---|-----------|---------|
| 90 | App→User | Subtitle: unchecked / "No collisions" / "N prompts map to multiple answers" (L402-405) |
| 91 | App→User | "N collisions" badge (rose) when incomplete (L409) |
| 92 | User→App | Click "Check" → `checkZutCollisions()` (L413, L1396-1411) |
| 93 | App→App | `GET /api/build/zut-collisions/{courseCode}` (L1402-1404) |
| 94 | App→User | On failure: `console.error` only, no banner (L1406-1408; same class as F-6) |
| 95 | User→App | Click "Resolve N" → `startZutResolve()` (L421, L1413-1435) |
| 96 | App→App | `POST /api/build/zut-resolve/{courseCode}` (L1419-1422) |
| 97 | App→User | "Agent working..." while `zutResolveSpawned` (L425) |
| 98 | User→App | Click "Recheck" (L428) |

### Stage 5 — Gender Prep (L439-471)

| # | Direction | Message |
|---|-----------|---------|
| 99 | App→User | "Optional" pill shown when `!genderPrepRecommended` (L449) |
| 100 | App→User | Subtitle varies by recommendation: explains gendered-language rationale, or invites the operator to judge for themselves (L451-455) |
| 101 | App→User | "Done"/"Locked" badges; locked until `stageComplete('final-pass')` (L459-460, L1030) |
| 102 | User→App | Click "Start Gender Prep" → `startGenderPrep()` (L463, L1471-1494) |
| 103 | App→App | `POST /api/production/{courseCode}/gender-prep/start` (L1478-1481) |
| 104 | App→User | "Agent working..." while `genderSpawned` (L467) |
| 105 | App→User | On failure: `showActionError` (L1487) |

### Seed Grid (L475-531)

| # | Direction | Message |
|---|-----------|---------|
| 106 | App→User | Collapsible header: finalized/total count + drafted/under-threshold/flagged/collision sub-counts, each colour-coded (L476-497) |
| 107 | User→App | Click header → toggle `seedGridExpanded` (L478) |
| 108 | App→User | Render one cell per seed, coloured by `seedCellClass(cell.status)` (6 states: empty/building/decomposed/flagged/drafted/complete) (L510-518, L1049-1069) |
| 109 | App→User | Selected cell gets a white ring (L515) |
| 110 | App→User | Hover tooltip shows seed number via CSS `::after` + `data-seed` (L1934-1955) |
| 111 | App→User | Legend mapping colour → status name (L521-529) |
| 112 | User→App | Click a cell → `selectSeed(cell.seed)` (L517, L1550-1617) |
| 113 | App→App | **`cell.status`'s `collision`/`rework` values render identically (both map to the rose "collision" swatch, L1055-1057) but the legend only labels one as "Collision" — `rework` has no distinct legend entry** (see F-7) |

### Phrase Viewer (L533-595)

| # | Direction | Message |
|---|-----------|---------|
| 114 | App→User | Panel header "Seed N" + close (✕) button (L536-538) |
| 115 | User→App | Click ✕ → clear `selectedSeed`/`seedViewPhrases`/`seedViewSeedText` (L538) |
| 116 | App→User | Show seed known/target sentence pair, falling back to "…" placeholders if unset (L541-548) |
| 117 | App→User | "Loading..." pulsing text while `seedViewLoading` (L549) |
| 118 | App→User | "No phrases found for this seed." empty state (L550) |
| 119 | App→User | Render each LEGO block: index, type badge (M/A), known→target; then its phrases (role tag BLD/USE/CMP, known→target) (L551-573) |
| 120 | App→App | `selectSeed()` branches on `isSupabaseConfigured()`: direct Supabase read (`getSeedDetail`) vs. 3 parallel HTTP fetches (legos/phrases/seeds) (L1550-1617) |
| 121 | App→App | On fetch/parse failure in either branch: `console.error` only, `seedViewLoading` still clears — **the panel is left showing no seed text and no phrases with no visible error**, indistinguishable from "this seed genuinely has no data" (L1612-1616; see F-8) |
| 122 | User→App | Type in "Notes for redo" textarea → `seedReviewNotes` (L577-582) |
| 123 | User→App | Click "Redo" → `redoSeed()` (L584, L1647-1674) |
| 124 | App→App | `POST /api/build/redo/{courseCode}` with `{seeds:[seedNum], notes}` (L1655-1659) |
| 125 | App→User | Button label "Sending..." while `seedRedoing` (L587) |
| 126 | App→App | Optimistically marks the cell `building`, refreshes monitor + grid, auto-selects next drafted seed (L1664-1668) |
| 127 | App→User | On failure: `showActionError` (L1671) |
| 128 | User→App | Click "Approve" → `approveSeed()` (L589, L1620-1645) |
| 129 | App→App | `POST /api/orchestrator/chat/{courseCode}` with `{role:'human', message:'Approved seed N', action:'approve', metadata:{seed_number}}` (L1627-1631) |
| 130 | App→User | Button label "Approving..." while `seedApproving` (L592) |
| 131 | App→App | Clears notes, closes panel, refreshes, auto-selects next drafted seed (L1632-1639) |
| 132 | App→User | On failure: `showActionError` (L1641) |

### Global error banner (L112-116)

| # | Direction | Message |
|---|-----------|---------|
| 133 | App→User | Red dismissable banner shows `actionError.message` (L113-115) |
| 134 | User→App | Click "Dismiss" → `actionError = null` (L115) |
| 135 | App→App | `showActionError()` auto-clears after 8s via `setTimeout` (L710-714) — **if a second error fires within 8s, the first's timer is cleared and replaced (L712), so the banner never disappears prematurely, but rapid successive failures are compressed into whichever message landed last, silently dropping earlier ones** |

### Dead / unreferenced code (found while tracing every method)

| # | Direction | Message |
|---|-----------|---------|
| 136 | App→App | `stopBuilder()` (L1497-1508) and `forceResetBuilder()` (L1510-1532) are defined but **never called from the template** — no button wires to either. `forceResetBuilder` also calls `stopPolling()`/`startPolling()`, both defined, but the function itself is orphaned |
| 137 | App→App | `killAgent(pid)` (L1534-1547) is defined but **the template never renders any per-agent kill control** — `agents.running` array (L659) is tracked but never iterated in the template beyond the aggregate count (L103-106) |

---

## Phase 7 checks

### Session 1 — System-to-User flow validation
- **Is every piece of information shown to users explicitly defined?** Mostly yes for steady-state (stage subtitles, badges, counts are all computed from named state). Fails at the *failure-path* edges: rows 40, 49, 57, 67, 84, 94, 121 show **no content at all** on failure/edge — the UI silently reverts rather than telling the user what happened.
- **Are all loading states and progress indicators specified?** Yes for the pipeline stages (spawned/active/stale three-state model is thorough) and the phrase viewer (`seedViewLoading`). The seed-count number input (row 17-18) and the create-mode course-creation success path (row 11) have no loading/transition affordance beyond a route change.
- **Do we have complete error message content for all scenarios?** No — see F-3, F-6, F-8: three separate call sites (`sendChat`, `checkComponentGaps`/`checkZutCollisions`, `selectSeed`) catch and `console.error` only, with zero user-facing error content, while every other mutating action in the same file correctly calls `showActionError`. This is an inconsistency, not a deliberate design.

### Session 2 — User-to-System flow validation
- **Is every button click and form submission handled?** All wired buttons have handlers. Two exceptions found: `stopBuilder`/`forceResetBuilder`/`killAgent` are handlers with **no corresponding button** (rows 136-137) — orphaned code, not an unhandled click.
- **Are all validation rules and error cases covered?** No — the seed-count number input (row 17) has cosmetic `min`/`max` HTML attributes but no JS-side validation; a pasted negative number, 0, or a value >1000 flows straight into `seedCount` and from there into `buildTeamRemaining`, `buildPercent`, and the `/api/courses/create` `seedEnd`/`seedCount` payload unchecked (F-2).
- **Do we handle all authentication and permission scenarios?** No — zero auth/permission checks anywhere in the file (see Auth-blindness check above, F-1). Every destructive/costly action (translate, mass-approve, redo, reset-translations, gender-prep spawn) is reachable with no gate visible in this file.

### Session 3 — System-to-System flow validation
- **Is every business rule and calculation explicitly specified?** Stage-completion/locked logic (`stageComplete`, `stageLocked`, L1014-1033) is explicit and data-driven, a good pattern. `finalPassNextAction`'s priority ladder (backfill > flagged > drafted > approve, L931-969) is explicit.
- **Are all database operations and queries defined?** Every fetch goes through named endpoints; the dual-path pattern (`isSupabaseConfigured()` branching to direct Supabase reads vs. HTTP API, rows 120 and throughout `fetchProgress`/`fetchSeedGrid`) is consistent but doubles the surface that must independently handle failure (see F-8 — the Supabase branch and HTTP branch of `selectSeed` share one catch, but neither reports partial failure distinctly).
- **Do we handle all external system integration scenarios?** No explicit retry/backoff on any POST; all rely on the one-shot fetch + `showActionError` (or the silent-catch defect class above) pattern. `buildMonitor` (imported, not audited here — out of scope per single-file mandate) is trusted to keep polling if a state-changing POST's HTTP response never arrives.

---

## Findings, classed 1–5

Classes: 1 UNTYPED · 2 UNVALIDATED · 3 MISSING TWIN · 4 UNSPECIFIED CONTENT · 5 UNREACHABLE/ORPHAN

| ID | Class | Finding | Citation |
|----|-------|---------|----------|
| F-1 | 2 UNVALIDATED | No auth/role/permission check anywhere in the file. Every mutating action (course create, translate start/reset, build-team start, mass-approve, ZUT resolve, component backfill, gender prep, redo/approve seed, chat send) is an unguarded `User→App` input with no visible authorization gate. | Whole file — confirmed via `grep -n "useAuth\|role\|permission\|admin"` returning zero hits |
| F-2 | 2 UNVALIDATED | The seed-count number input has `min="1" max="1000"` as HTML-only hints; no JS validates the bound `seedCount` before it drives `buildTeamRemaining`, `buildPercent`, and the course-create payload's `seedEnd`/`seedCount`. A 0, negative, or non-numeric value is not rejected client-side. | `TextGeneration.vue:66-72`, `:640`, `:905-909`, `:1181-1187` |
| F-3 | 3 MISSING TWIN | `sendChat()` has an App→App process (`POST /api/orchestrator/chat/{courseCode}`) with no App→User failure twin — the catch block only `console.error`s. The optimistically-appended human message remains visibly "sent" even if the POST failed, silently diverging client state from server state. | `TextGeneration.vue:1708-1761` (catch at `:1756-1758`) |
| F-4 | 2 UNVALIDATED | `massApproveSeeds()` (bulk-approve all drafted seeds) has no confirmation dialog, unlike the sibling destructive action `confirmResetTranslations()` which uses `window.confirm(...)`. Inconsistent gating of two comparably irreversible bulk actions. | `TextGeneration.vue:1226-1233` (has confirm) vs. `:1315-1340` (no confirm) |
| F-5 | 3 MISSING TWIN | None of the four Final-Pass wizard actions (`startBackfillPhrases`, `redoAllFlagged`, `startFinalPass`, `massApproveSeeds`) show an explicit App→User success message — only `showActionError` exists for failure; success is inferred by the operator from state/badge changes on the next poll. | `TextGeneration.vue:1447-1469`, `:1676-1699`, `:1279-1313`, `:1315-1340` |
| F-6 | 3 MISSING TWIN | `checkComponentGaps()` and `checkZutCollisions()` both catch fetch failures with `console.error` only — no `showActionError` call, unlike every other API method in the file. On failure, `componentGaps`/`zutCollisions` silently stay `null` and the UI reverts to the un-checked "Check" button with zero indication anything went wrong. | `TextGeneration.vue:1353-1369`, `:1396-1411` |
| F-7 | 4 UNSPECIFIED CONTENT | `seedCellClass()` renders both `'collision'` and `'rework'` statuses identically (same rose swatch), but the grid legend (L521-529) only defines a "Collision" label — `rework` has no distinct specified content, so the legend under-documents a real, distinctly-named state. | `TextGeneration.vue:1055-1057` (class logic) vs. `:521-529` (legend) |
| F-8 | 3 MISSING TWIN | `selectSeed()`'s catch block (covering both the Supabase-direct and HTTP-fallback branches) is `console.error`-only; `seedViewLoading` is still cleared in `finally`, leaving the phrase-viewer panel showing "No phrases found for this seed" — visually identical to the legitimate empty-data case — with no way for the operator to distinguish "this seed has no phrases" from "the fetch failed." | `TextGeneration.vue:1550-1617` (catch at `:1612-1614`) |
| F-9 | 5 UNREACHABLE/ORPHAN | `stopBuilder()`, `forceResetBuilder()`, and `killAgent(pid)` are fully implemented App→App handlers with no template wiring — no button, per-agent list item, or other control invokes any of them. `agents.running` (array of active agent processes) is fetched into state but never iterated/rendered beyond the aggregate `running_count`. | `TextGeneration.vue:1497-1508`, `:1510-1532`, `:1534-1547`, `:658-662`, `:103-106` |
| F-10 | 4 UNSPECIFIED CONTENT | On `createCourse()` success, the screen navigates directly to `/production/{courseCode}/text` with no interstitial success message (contrast: every failure path here does show an `alert(...)`) — an asymmetric App→User twin (failure specified, success unspecified). | `TextGeneration.vue:1193` vs. `:1196` |

---

## Summary

- **Screens covered**: 1 (TextGeneration.vue only, per mandate) — 137 numbered Trinity rows across Create Mode, Seed-Count control, Stats Bar, Chat Panel, Process Banner, 5 numbered pipeline stages + ZUT stage, Seed Grid, Phrase Viewer, global error banner, and 2 orphaned-handler rows.
- **Findings by class**: Class 2 (Unvalidated) — 2 · Class 3 (Missing Twin) — 5 · Class 4 (Unspecified Content) — 2 · Class 5 (Unreachable/Orphan) — 1. Zero Class 1 (Untyped) findings — every message in this file resolves cleanly into App→User / User→App / App→App.
- **Worst 3 findings**:
  1. **F-1 (auth-blindness)** — no permission check anywhere on a screen that can create courses, wipe translations, mass-approve content, and kill/spawn agents.
  2. **F-4 (inconsistent destructive-action gating)** — `massApproveSeeds()` bulk-approves with zero confirmation while its sibling `confirmResetTranslations()` requires one; the asymmetry looks accidental, not designed.
  3. **F-6 / F-3 / F-8 (silent-failure trio)** — three separate call sites (`checkComponentGaps`/`checkZutCollisions`, `sendChat`, `selectSeed`) swallow fetch errors with `console.error` only, each leaving the UI in a state visually indistinguishable from a legitimate empty/idle state — the exact "silent failure" class the brief calls out by name.
