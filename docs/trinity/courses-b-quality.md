# Quality Review Area — Trinity Compliance Audit

> **Date**: 2026-07-17
> **Scope**: 5 screens under `/quality/:courseCode/*` (dashboard component's own directory)
> **Trinity**: App→User (output) | User→App (input) | App→App (processing)
> **Method**: Per `trinity-campaign-brief.md` Phase 7 (Session 1/2/3 questions) + house table format from `ssi-learning-app/docs/schools-trinity-audit.md`.

## Routing & reachability (verified against `src/router/index.js`)

| Route | Component | router.js lines |
|---|---|---|
| `/quality/:courseCode` | `QualityDashboard.vue` | 371-378 |
| `/quality/:courseCode/seeds/:seedId` | `SeedQualityReview.vue` | 379-385 |
| `/quality/:courseCode/evolution` | `PromptEvolutionView.vue` | 386-392 |
| `/quality/:courseCode/health` | `CourseHealthReport.vue` | 393-399 |
| `/quality/:courseCode/learned-rules` | `LearnedRulesView.vue` (lazy import) | 400-405 |

**Nav-link check**: `grep -rn "quality" src --include vue/js` outside `src/components/quality/` returns no hits in `AppNavbar.vue`, `ProductionNav.vue`, or any other view/composable — confirmed by direct grep of both nav files for the string `quality` (zero matches). **None of the 5 screens has a nav entry point.** All 5 are URL-only routes, reachable only by typing/pasting the path or via router-link from *within* the quality subtree itself (`QualityDashboard` → `SeedQualityReview` → back-link; `PromptEvolutionView` → `LearnedRulesView` → back-link). There is no path into the subtree from the rest of the app at all — so even the "internally reachable" screens are only reachable if a user already knows the root URL.

This corrects/confirms the prior census claim of "2 URL-only routes with no nav link" — in fact **all 5** have no nav link; the difference is that 3 of the 5 (`QualityDashboard`, `SeedQualityReview`, `LearnedRulesView` via evolution) are reachable from each other once you're in the subtree, while `CourseHealthReport` (health) has no inbound `router-link` from any of the other 4 screens either (confirmed: no `/quality/${courseCode}/health` string found in the other four `.vue` files) — it is the only screen with **zero reachability by any means other than a typed URL**.

**Auth-blindness check**: none of the 5 components imports `useAuth` directly (`grep -n useAuth` on all 5 files: zero hits). However `router.beforeEach` (router/index.js:655-722) is a **global** guard — it runs for every route unless `meta.public`, and since all 5 routes carry a `:courseCode` param it also applies the course-scope check (`canAccessCourse`, line 715-718). So the screens are auth-blind at the *component* level (no in-component role/permission check, e.g. nothing stops a `learner`-role account that happens to have course access from opening what's meant to be an internal QA tool) but are NOT auth-blind at the *route* level — an unauthenticated user is bounced to Login, and a user without access to that course is bounced to CourseBrowser. None of the 5 routes carries `meta: { requiresAuth: true }` the way `/record` (line 347) and `/admin/users` (line 353) do, but that meta flag turns out to be decorative — the guard applies to every non-public route regardless, confirmed by reading the guard body (no early-return keyed off `requiresAuth`).

---

## Screen 1: Quality Dashboard (`QualityDashboard.vue`)

### Data source
`onMounted` (line 755-760) calls `generateMockSeeds()` (line 767-791) — 668 fake seeds with `Math.random()` quality scores, statuses, and canned assessment strings. Zero calls to `api`, `supabase`, or any backend. There is no real data path in this file at all.

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→App | `onMounted` → `seeds.value = generateMockSeeds()` (line 758) — fabricates 668 random seeds, no backend call |
| 2 | App→User | Display 5 stat cards (Average Quality, Flagged, Accepted, Avg Attempts, Ready for Review) computed from the fake data (lines 40-68, `stats` computed 470-497) |
| 3 | App→User | Display quality-score distribution bar chart (lines 71-97, `qualityDistribution` computed 499-520) |
| 4 | User→App | Click a distribution bar → `filterByQualityRange` (line 79, 652-654) sets the quality filter |
| 5 | User→App | Type in search box → `filters.search` (line 116, filtered in `filteredSeeds` 526-533) |
| 6 | User→App | Select Status / Quality Range / Concern dropdowns (lines 126-167) → filter `filteredSeeds` (536-549) |
| 7 | User→App | Click sort-by button (line 173-186) → `setSortBy` (643-650) |
| 8 | User→App | Click "Clear All Filters" (line 104) → `clearFilters` (656-666) |
| 9 | User→App | Click "Select All" checkbox (line 197) → `toggleSelectAll` (668-674) |
| 10 | User→App | Click "Export CSV" (line 13) — **`disabled`, `title="Not implemented yet"`; `@click="exportReport('csv')"` (706-708) is dead code, unreachable because the button is disabled** |
| 11 | User→App | Click "Export PDF" (line 21) — same: disabled, dead handler |
| 12 | User→App | Click "Refresh" (line 29) — disabled, dead handler → `alert("Refresh isn't available yet.")` (684-686) |
| 13 | User→App | Click "Accept" / "Re-run" quick actions per row (lines 311-326) — disabled, → `alert(...)` (694-700) |
| 14 | User→App | Click "Accept/Re-run/Remove Selected" bulk actions (lines 205-228) — disabled, → `alert(...)` (702-704) |
| 15 | User→App | Click a seed row → `viewSeedDetail` (246, 688-692) → `router.push('/quality/:courseCode/:seedId)` |
| 16 | User→App | Click "Review Details" link (line 327) → same navigation via `router-link` |
| 17 | App→User | Pagination controls (Previous/page-numbers/Next, lines 356-384) |
| 18 | User→App | Keyboard shortcuts `j/k/Enter/a/r/x/?` (handleKeyPress, 711-752) — `a`/`r` call the same disabled-in-UI `quickAccept`/`quickRerun` functions, so the keyboard path **actually fires the alert()** even though the on-screen button is disabled — inconsistent affordance |
| 19 | App→User | Keyboard-shortcuts help modal (`showShortcutsHelp`, lines 390-424) |

### Findings

| Class | Finding | Citation |
|---|---|---|
| 4 — UNSPECIFIED CONTENT | Entire screen is a mock-data stub. All 668 "seeds," every quality score, status, and "agent assessment" string is `Math.random()`-generated client-side; nothing here reflects real course-quality data. | `QualityDashboard.vue:758,767-791` |
| 3 — MISSING TWIN | Every mutating action (Export CSV/PDF, Refresh, Accept, Re-run, bulk Accept/Re-run/Remove) is wired to an `alert()` placeholder instead of a real App→App call with a success/failure twin. Buttons are also `disabled`, so the alerts are only reachable via keyboard shortcuts, not via click. | `QualityDashboard.vue:684-708,694-700,702-704` |
| 1 — UNTYPED (minor) | Keyboard shortcuts `a`/`r` invoke `quickAccept`/`quickRerun` even though the corresponding on-screen buttons are `disabled` — a discoverable-only-by-accident side effect that isn't reachable through the documented UI affordance. | `QualityDashboard.vue:727-736,694-700` |
| 5 — UNREACHABLE/ORPHAN | Screen itself has no nav entry point (see Routing section above). | `router/index.js:371-378`; nav grep above |

---

## Screen 2: Seed Quality Review (`SeedQualityReview.vue`)

### Data source
`loadSeedData` (line 520-526) calls `generateMockSeed()` (529-536) and `generateMockAttempts()` (538-623) — one hardcoded seed ("I would like to go to the beach tomorrow") with 3 hardcoded attempt objects (fixed quality scores 6.5/8.2/9.1, fixed LEGO breakdowns). Comment at line 521 literally reads `// TODO: Load real data from API`.

| # | Direction | Message |
|---|---|---|
| 1 | App→App | `onMounted` → `loadSeedData()` → `generateMockSeed()` + `generateMockAttempts()` (511-526) — no backend call, comment admits `TODO: Load real data from API` |
| 2 | App→User | Display seed id, attempt index, quality score, status badge (lines 15-35) |
| 3 | App→User | Attempt timeline / navigation (lines 39-89) |
| 4 | User→App | Click Previous/Next attempt (44,82) → `previousAttempt`/`nextAttempt` (459-469) |
| 5 | User→App | Click a timeline dot (57) → jump to that attempt index |
| 6 | App→User | Quality breakdown bars per criterion (91-116) |
| 7 | App→User | Agent's self-assessment text, concerns, suggestions (119-162) |
| 8 | User→App | Select "Compare with" attempt dropdown (171-183) → `compareWithIndex` |
| 9 | App→User | Side-by-side LEGO visualisation + diff stats (`diffStats` computed, 419-434) |
| 10 | App→User | LEGO details table (span, type, confidence, 259-303) |
| 11 | User→App | Click "View/Hide Full Prompt" (328-333) → `showPrompt` toggle |
| 12 | User→App | Click "Accept This Attempt" (344-351) — disabled → `alert(...)` (471-473) |
| 13 | User→App | Click "Reject" (352-359) — disabled → `alert(...)` (475-477) |
| 14 | User→App | Click "Trigger Re-run" (363-370) — disabled → `alert(...)` (479-481) |
| 15 | User→App | Click "Remove from Corpus" (371-378) — disabled → `alert(...)` (483-485) |
| 16 | User→App | Keyboard shortcuts `a/r/←/→/Escape` (488-508) — `a`/`r` again bypass the `disabled` buttons and directly fire `acceptAttempt`/`triggerRerun`, same inconsistency as Screen 1 |
| 17 | User→App | Click "← Back to Quality Dashboard" (6-11) → `router-link` to `/quality/:courseCode` |

### Findings

| Class | Finding | Citation |
|---|---|---|
| 4 — UNSPECIFIED CONTENT | Entire screen is a mock-data stub — one fixed seed, three fixed attempt records; `// TODO: Load real data from API` is left in the code. | `SeedQualityReview.vue:521,523-524,529-623` |
| 3 — MISSING TWIN | Accept/Reject/Trigger Re-run/Remove from Corpus — the four decision actions this screen exists to support — are all `disabled` and wired to `alert()` placeholders with no real App→App call, no success/failure state. | `SeedQualityReview.vue:344-378,471-485` |
| 1 — UNTYPED (minor) | Same keyboard-bypasses-disabled-button pattern as Screen 1: `a`/`r` keys fire the real (alert) handlers even though the buttons are inert. | `SeedQualityReview.vue:492-497,471-481` |
| 5 — UNREACHABLE/ORPHAN | No nav entry point; only reachable via Screen 1's row-click/`router-link`, which itself has no nav entry point. | Routing section above |

---

## Screen 3: Prompt Evolution (`PromptEvolutionView.vue`)

### Data source
`versions` (line 467) and `learnedRules` (line 497) are hardcoded literal arrays in the component (not even randomized) — static demo data. `onMounted` (665-668) does nothing but `console.log`.

| # | Direction | Message |
|---|---|---|
| 1 | App→App | `onMounted` → `console.log('Loading prompt evolution...')` only — no data is actually loaded; `versions`/`learnedRules` are static literals already present at module init | `PromptEvolutionView.vue:467,497,665-668` |
| 2 | App→User | Header stats: current version, learned-rule count, Success Rate, Avg Quality, Re-run Rate (lines 18-56) |
| 3 | User→App | Click "🧠 View Self-Learning Rules" (22-27) → real `router-link` to `/quality/:courseCode/learned-rules` (the one live screen) |
| 4 | App→User | Rules list with status/filter (lines ~240-360, ruleFilter computed 584-588) |
| 5 | User→App | Select rule-status filter dropdown (incl. "Disabled" option, line 456) |
| 6 | User→App | Click "Disable"/"Enable" rule (243-260) — disabled buttons → `alert()` (629,633) |
| 7 | User→App | Click "View" rule detail (line ~345) — disabled → `alert()` (637) |
| 8 | User→App | Click "Promote to production" / "Reject" experimental rule (353-362) — disabled → `alert()` (641,645) |
| 9 | User→App | Click "Extend A/B test" (line ~404) — disabled → `alert()` (649) |
| 10 | User→App | Click "Roll back to previous version" (line ~415) — disabled → `alert()` (653) |
| 11 | User→App | Click "Export prompt history" (line ~423) — disabled → `alert()` (657) |
| 12 | User→App | Click "Add manual rule" — disabled → `alert()` (661) |
| 13 | User→App | Click "← Back to Quality Dashboard" → `router-link` to `/quality/:courseCode` |

### Findings

| Class | Finding | Citation |
|---|---|---|
| 4 — UNSPECIFIED CONTENT | `versions` and `learnedRules` are static hardcoded arrays, not fetched from anywhere; `onMounted` is a no-op besides a `console.log`. | `PromptEvolutionView.vue:467,497,665-668` |
| 3 — MISSING TWIN | 8 distinct rule-management actions (disable/enable/view/promote/reject/extend-test/rollback/export/add-manual-rule) are all disabled buttons wired only to `alert()` placeholders — no real processing, no success/failure twin. | `PromptEvolutionView.vue:629-661` |
| 5 — UNREACHABLE/ORPHAN | No nav entry point into this screen itself (confirmed: no other screen outside the quality subtree links here); it does correctly link forward to `LearnedRulesView`, the one live screen — so it's the sole entry path into real functionality, and that entry path is itself unreachable from the rest of the app. | Routing section above |

---

## Screen 4: Course Health Report (`CourseHealthReport.vue`)

### Data source
Health category scores (lines ~430-452) are hardcoded literals; `qualityTrend` (455-461) is a 30-day series generated with `Math.random()` client-side. `onMounted` (676-678) is a no-op `console.log`, identical pattern to Screen 3.

| # | Direction | Message |
|---|---|---|
| 1 | App→App | `onMounted` → `console.log` only; `healthCategories`/`qualityTrend` are static/`Math.random()`-generated at module init, no backend call | `CourseHealthReport.vue:430-461,676-678` |
| 2 | App→User | Health category cards (Boundary Accuracy, Semantic Coherence, System Efficiency, etc.) | `CourseHealthReport.vue:~415-452` |
| 3 | App→User | 30-day quality-trend chart | `CourseHealthReport.vue:455-461` |
| 4 | User→App | Click "Export" (352-353) — disabled → `alert()` (664) |
| 5 | User→App | Click "Schedule reports" (367-368) — disabled → `alert()` (668) |
| 6 | User→App | Click "Apply recommendations" (376-377,385-386) — disabled → `alert()` (672) |

### Findings

| Class | Finding | Citation |
|---|---|---|
| 4 — UNSPECIFIED CONTENT | Health scores are fixed literals; the 30-day trend is fabricated with `Math.random()` client-side on every page load (so it re-randomizes each visit — not even a stable mock). | `CourseHealthReport.vue:458-459` |
| 3 — MISSING TWIN | Export / Schedule reports / Apply recommendations — disabled buttons, `alert()` only. | `CourseHealthReport.vue:664,668,672` |
| 5 — UNREACHABLE/ORPHAN | No nav entry point, and (unlike Screens 1-3, which at least link to each other) **no other screen in the subtree links to this one either** — confirmed by grepping the other four `.vue` files for the `/health` path with zero hits. This is the single most isolated screen in the audit: reachable only by typing the exact URL. | Routing section above |

---

## Screen 5: Self-Learning Rules (`LearnedRulesView.vue`) — the reportedly-live screen

**Verified live**: this is the only one of the 5 that makes a real network call. `loadLearnedRules` (195-213) calls `api.default.get('/api/courses/:courseCode/learned-rules')` (line 200) and populates `rules`/`manual_edits`/`summary` from the response, with a genuine `loading`/`error`/data three-state render (16-25, `loading`/`error` refs 168-169). No `useAuth` import (consistent with the other 4 — protected only by the router-level guard, not component-level).

However: **the backend endpoint this screen calls does not exist.** `grep -rn "learned-rules"` across every file under `services/` (the entire backend: `course-builder-api.cjs`, `production-api.cjs`, `network-builder-api.cjs`, all `services/phases/*/server.cjs`) returns **zero matches** for any `app.get`/`app.post`/route registration of `/api/courses/:courseCode/learned-rules`. The string `learned-rules` only appears in the frontend (`LearnedRulesView.vue`, `PromptEvolutionView.vue`), the frontend API client (`src/services/api.js:1546-1553`), and two doc files (`ssi-course-production.apml`, `INTEGRATION.md`) — never in an actual server route handler.

Notably, `src/services/api.js` already has a defensive wrapper for exactly this situation — `getLearnedRules()` (api.js:1544-1553) catches a 404 and returns `{ rules: [] }` silently. **`LearnedRulesView.vue` doesn't use that wrapper** — it calls `api.default.get(...)` directly (line 200), bypassing the 404 fallback, so a missing endpoint instead falls into the generic `catch` block and renders `error.value = "Failed to load learned rules: ..."` (207-209). This is a real, working App→User failure message (not a silent failure) — but the net effect is that this "live" screen's success path (rendering real rules/manual-edits data) is currently unreachable in any environment where the backend doesn't implement this route, which per the `services/` grep is every environment in this repo.

| # | Direction | Message |
|---|---|---|
| 1 | App→App | `onMounted` → `loadLearnedRules()` → `GET /api/courses/:courseCode/learned-rules` | `LearnedRulesView.vue:200,215-217` |
| 2 | App→User | Loading state: "Loading learned rules..." while `loading` is true | `LearnedRulesView.vue:16-18,168,197` |
| 3 | App→User | Error state: `{{ error }}` banner on fetch failure | `LearnedRulesView.vue:21-24,207-209` |
| 4 | App→User | Summary stat cards (Total/Experimental/Validated/Committed rules) from `summary` | `LearnedRulesView.vue:30-47,172-178,204` |
| 5 | App→User | Static "How Learning Works" explainer (always shown, not conditional on data) | `LearnedRulesView.vue:50-59` |
| 6 | App→User | Rules list, sorted by status priority then occurrence count (`sortedRules` computed) | `LearnedRulesView.vue:61-118,180-188` |
| 7 | App→User | Empty state: "No rules learned yet. Start editing LEGO breakdowns to teach the system!" | `LearnedRulesView.vue:67-69` |
| 8 | App→User | Recent manual edits list (last 10) | `LearnedRulesView.vue:122-154` |
| 9 | App→User | Empty state: "No manual edits recorded yet" | `LearnedRulesView.vue:127-129` |
| 10 | User→App | Click "← Back to Prompt Evolution" → `router-link` to `/quality/:courseCode/evolution` | `LearnedRulesView.vue:5-8` |

### Phase 7 checks (Session 1/2/3, applied)

- **Session 1 (System→User)**: Loading, error, and both empty states are explicitly specified with real content (not placeholders) — this screen passes where the other 4 fail. ✅
- **Session 2 (User→System)**: The only interaction is the back-link; there is no form/submission surface on this screen at all, so nothing to validate here. No auth/permission branching is done in-component (relies entirely on the router guard). ⚠️ (component-level auth-blind, same as the other 4, but the router guard does cover it)
- **Session 3 (System→System)**: The one App→App call targets a route with **no server-side implementation anywhere in this repo** — confirmed by exhaustive grep of `services/`. The error-message twin exists and is honest, but the success twin can never fire. ❌

### Findings

| Class | Finding | Citation |
|---|---|---|
| 3 — MISSING TWIN (backend-absent variant) | The screen's one real App→App call (`GET /api/courses/:courseCode/learned-rules`) targets an endpoint with zero server-side implementation anywhere under `services/` — confirmed by exhaustive grep across every `*-api.cjs` and `services/phases/*/server.cjs`. The App→User failure twin is correctly wired (a real, worded error banner), but the success twin (rendering actual rules) is currently unreachable in this codebase. This is the most severe finding in the audit: it's the one screen built to spec with real Trinity messages, undermined by a missing backend route. | `LearnedRulesView.vue:200`; zero hits for `learned-rules` across `services/**/*.cjs` |
| 2 — UNVALIDATED (minor) | `LearnedRulesView.vue` calls `api.default.get()` directly instead of the `api.getLearnedRules()` wrapper (`src/services/api.js:1544-1553`) that already exists specifically to convert a 404 into a graceful empty state. Bypassing it means a missing-endpoint 404 surfaces as a scary "Failed to load" error instead of the softer "no rules yet" empty state the wrapper was written to produce. | `LearnedRulesView.vue:200` vs `src/services/api.js:1544-1553` |
| 5 — UNREACHABLE/ORPHAN | No nav entry point from the rest of the app; only reachable via `PromptEvolutionView`'s "View Self-Learning Rules" link, which itself has no nav entry point. | Routing section above |

---

## Summary

| Screen | Live data? | Nav-reachable? | Findings (by class) |
|---|---|---|---|
| QualityDashboard | No — `Math.random()` mock, 668 fake seeds | No | 4, 3, 1, 5 |
| SeedQualityReview | No — hardcoded fixture, `TODO` comment left in | No (chained from #1) | 4, 3, 1, 5 |
| PromptEvolutionView | No — static literal arrays | No | 4, 3, 5 |
| CourseHealthReport | No — static + `Math.random()` trend | No, and not even linked from siblings | 4, 3, 5 |
| LearnedRulesView | **Yes** — real fetch, real loading/error/empty states | No (chained from #3) | 3 (backend missing), 2, 5 |

**Findings by class**: Class 1 (untyped): 2. Class 2 (unvalidated): 1. Class 3 (missing twin): 5. Class 4 (unspecified content): 4. Class 5 (unreachable/orphan): 5.

**Worst 3 findings**:
1. **LearnedRulesView's backend route doesn't exist anywhere in the repo** — the one screen built correctly to Trinity spec (real fetch, real loading/error/empty states) is silently defeated by a missing server route; every real visit to this screen shows an error, never data. (`LearnedRulesView.vue:200`; zero server-side hits for `learned-rules`)
2. **Four full screens (Dashboard, Seed Review, Prompt Evolution, Health Report) are 100% fabricated client-side data** with no backend integration at all — 8 disabled action buttons across them are wired to `alert()` placeholders standing in for real accept/reject/re-run/export/promote/rollback workflows that the Quality Review area exists to provide.
3. **All 5 screens are unreachable from any navigation UI in the app** — no `router-link` or menu entry anywhere outside the `/quality/*` subtree itself points at any of them; `CourseHealthReport` additionally has no inbound link even from its sibling quality screens, making it reachable only by typing the exact URL.
