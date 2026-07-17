# Trinity Compliance Audit — Courses Part A

> Date: 2026-07-17
> Scope: CourseBrowser, CourseManager, CourseEditor, CourseCompilation, CourseProgress, CourseValidator, IntroductionsViewer, NetworkBuilder
> Trinity: App→User (output) | User→App (input) | App→App (processing)
> Method: `/Users/tomcassidy/command-surface/trinity-campaign-brief.md` — Phase 7 verbatim checks, findings classed 1-5 with file:line, a message counts as validated only if the validating code is cited.

## Overall summary

**Screens covered (8):** CourseBrowser (`/courses`), CourseManager (`/course/:courseCode`), CourseEditor (`/courses/:courseCode`), CourseCompilation (`/courses/:courseCode/compile`), CourseProgress (`/courses/:code/progress`), CourseValidator (`/validate` and `/validate/:courseCode`), IntroductionsViewer (`/edit/introductions`), NetworkBuilder (`/network-builder`).

**Findings by class (62 total):**
| Class | Name | Count |
|---|---|---|
| 1 | UNTYPED | 7 |
| 2 | UNVALIDATED | 12 |
| 3 | MISSING TWIN | 14 |
| 4 | UNSPECIFIED CONTENT | 17 |
| 5 | UNREACHABLE/ORPHAN | 12 |

**Worst 3 findings across all 8 screens:**
1. **NetworkBuilder's backend has no authentication whatsoever** — `services/network-builder-api.cjs` (whole file) has zero auth middleware on any route, and `NetworkBuilder.vue` calls it with raw `fetch()` (lines 250, 261, 288, 307), bypassing even the app's own Bearer-token interceptor. The router guard is the *only* access control, and it's client-side only — anyone who can reach the port has full read/write/reset access to all networks.
2. **CourseManager's stop/kill controls report false success** — `stopJob`/`forceKill` (`CourseManager.vue:1776/1784/1800`) reset job status to `'idle'` even when the stop/kill request itself failed, so the UI can claim a job has stopped while it's actually still running.
3. **CourseValidator's basket regeneration likely ships empty data** — `regenerateBaskets` (`CourseValidator.vue:739`) reads `gapAnalysisResult.value.baskets_missing`, but Gap Analysis actually returns it nested under `.analysis.baskets_missing` — the "Regenerate N Baskets" flow's core data dependency appears broken, likely always POSTing empty `legoIds`.

**Also notable:**
- CourseEditor's entire Validation & Fix Panel (LUT/Infinitive/Gap-Analysis/Regenerate) is permanently unreachable (`showValidationPanel` never flipped `true`) — AND every one of its handlers calls an unimported `getApiUrl`, so if it were ever reached it would throw a raw `ReferenceError` to the user (`CourseEditor.vue`, part2).
- IntroductionsViewer and NetworkBuilder are the two screens with no router-level or component-level course-scoping at all — any authenticated non-recorder can reach and mutate their content regardless of course membership.
- Rebuild/Wipe on CourseManager are irreversible destructive operations gated only by a single inline-text confirm click.

**Role gating note:** the router's global guard (`src/router/index.js:655-724`) has no per-screen role checks for any of these 8 routes beyond the generic auth/recorder-confinement/course-scoping rules — see each screen's "If guard assumptions break" line below for what renders if `isAuthenticated`, `isRecorder`, or `canAccessCourse` misbehave for that specific screen. Course-scoped routes (CourseManager, CourseEditor, CourseProgress, CourseValidatorDetail, CourseCompilation) fall back to redirecting to CourseBrowser on scope failure; the remaining screens (CourseBrowser, NetworkBuilder, bare CourseValidator, IntroductionsViewer) have no course param for the guard to check at all.

---


Screens covered:
- `CourseBrowser` (`src/views/CourseBrowser.vue`, route `/courses`)
- `CourseManager` (`src/views/CourseManager.vue`, route `/course/:courseCode`)

Router guard summary used throughout (`src/router/index.js:655-724`, verified, quoted not re-derived):
- `to.meta.public` routes skip auth entirely (661).
- Non-public routes require `isAuthenticated`, else redirect to Login (669-671).
- Recorders are hard-confined to `/record/:courseCode?` — any other route bounces them to their Record Room before course-scoping runs (676-699).
- Single-course non-admin editors land on `/production/:courseCode/journey` instead of Home (706-712) — irrelevant to these two routes directly.
- `CourseManager` (`/course/:courseCode`) IS course-scoped (714-721): `canAccessCourse(courseCode)` must pass or redirect to `CourseBrowser` with `console.warn`.
- `CourseBrowser` (`/courses`) is **NOT** course-scoped by the guard (no `:courseCode`/`:code` param in its path) — any authenticated non-recorder can reach it regardless of course membership. The component does its own scoping via `accessibleCourses` (`CourseBrowser.vue:305`, filters `courses.value` by `canAccessCourse(c.course_code)`), so the list itself is safe, but the route entry is never blocked pre-render.

---

## Screen: CourseBrowser (src/views/CourseBrowser.vue)

### State: Initial load (`loading = true`)

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→App | On mount, call `loadRecents()` reading `localStorage['popty:recentCourses']` (CourseBrowser.vue:545-546, 333-337) |
| 2 | App→App | On mount, call `loadCourses()` (CourseBrowser.vue:547, 550) |
| 3 | App→User | Display "Loading courses..." text block (CourseBrowser.vue:112-114, `v-if="loading"`) |
| 4 | App→App | Branch on `isSupabaseConfigured()` (CourseBrowser.vue:555) — if true, call `getAllCourses()` direct-to-Supabase (line 557); else `fetch('${baseUrl}/api/courses')` proxy (lines 592-596) |
| 5 | App→App | Map returned rows into local `courses` shape with zeroed stats placeholders (CourseBrowser.vue:558-566) |
| 6 | App→App | Set `loading = false` once the course list (without stats) resolves (line 567 / 599) — the screen transitions to populated/empty BEFORE stats load |

### State: Stats loading (`loadingStats = true`, overlaid on populated/empty state)

| # | Direction | Message |
|---|-----------|---------|
| 7 | App→User | Display "Loading course stats..." spinner banner above the table (CourseBrowser.vue:106-109, `v-if="loadingStats"`) |
| 8 | App→App | Supabase path: single RPC `getAllCourseStats(codes)` for all courses at once (line 573) |
| 9 | App→App | Proxy path: per-course `fetch('${baseUrl}/api/courses/${code}/stats')` with a 6-worker concurrency queue (CourseBrowser.vue:601-640) |
| 10 | App→App | Merge returned stats into `courses[i].stats/seed_pairs/lego_pairs/phrases` and reassign array for reactivity (lines 574-584, 616-623) |
| 11 | App→App | Set `loadingStats = false` when all stats resolve/fail (line 588, or when `pending<=0` at line 629) |

### State: Error (`error` set, `loading = false`)

| # | Direction | Message |
|---|-----------|---------|
| 12 | App→User | Display red error panel "Error Loading Courses" + `{{ error }}` text (CourseBrowser.vue:117-120, `v-else-if="error"`) |

### State: Empty (`filteredCourses.length === 0`)

| # | Direction | Message |
|---|-----------|---------|
| 13 | App→User | If `searchQuery` set: `No courses matching "{{ searchQuery }}"` (CourseBrowser.vue:124-126) |
| 14 | App→User | Else: `No courses found` (line 127) |
| 15 | App→User | If no search query: show "Create Your First Course" link → `/production/new/text` (CourseBrowser.vue:128-134) |

### State: Populated table

| # | Direction | Message |
|---|-----------|---------|
| 16 | App→User | Display search input, placeholder text (CourseBrowser.vue:26-31) |
| 17 | User→App | Type into search box, bound to `searchQuery` (line 27); filters client-side only, no validation, no debounce |
| 18 | App→User | Display "Recent" chip row from `recentCourses` (localStorage-derived) if non-empty (CourseBrowser.vue:35-45) |
| 19 | User→App | Click a recent-course chip → `openCourse(code)` (line 40) |
| 20 | App→App | `openCourse(code)` pushes to front of recents list, persists to `localStorage`, then `router.push('/production/${code}')` (CourseBrowser.vue:345-348) — **note: navigates to `/production/:code`, a different route entirely from this screen's own `/course/:courseCode`; no `canAccessCourse` check is performed before this navigation** |
| 21 | User→App | Click a Release filter chip (Testing/Beta/Live) → `cycleFilter('status', value)` tri-state toggle (CourseBrowser.vue:51-58, 284-290) |
| 22 | User→App | Click a Pricing filter chip (Free/Premium/Community) → `cycleFilter('pricing', value)` (lines 64-71) |
| 23 | User→App | Select Known-language dropdown → `knownFilter` (lines 77-80) |
| 24 | User→App | Select Target-language dropdown → `targetFilter` (lines 83-86) |
| 25 | User→App | Click "Reset filters" (shown only `v-if="hasActiveFilters"`) → `resetFilters()` clears all filter state + search (CourseBrowser.vue:88-94, 321-327) |
| 26 | User→App | Click "↻ Recently used" → `setSort('recent')` (lines 95-101, 501-509) |
| 27 | App→User | Display count `"{{ filteredCourses.length }} of {{ accessibleCount }} courses"` (line 102) |
| 28 | User→App | Click a column header (Code/Name/Known/Target/Pricing/Stage) → `setSort(key)`, toggling asc/desc if same key (CourseBrowser.vue:145-150, 501-509) |
| 29 | App→User | Render sort indicator arrow (▲/▼) on the active column (line 511-514) |
| 30 | User→App | Click "select all" checkbox in table header → `toggleSelectAll()` (CourseBrowser.vue:143, 363-368) |
| 31 | User→App | Click a row checkbox (`@click.stop` to not trigger row nav) → `toggleSelect(code)` (lines 161-166, 353-357) |
| 32 | User→App | Click anywhere else on a course row → `openCourse(course.course_code)` (CourseBrowser.vue:159) — same no-access-check note as #20 |
| 33 | App→User | Render each row: course code, `getFullCourseName(code)` (via `useCourses().getCourseName`), Known/Target langs (parsed from code), Pricing pill, Release/Stage pill (CourseBrowser.vue:168-184) |
| 34 | App→User | Show "• new" marker + left accent bar on rows in `highlightedCourses` (lines 170, 158) — **`highlightedCourses` is declared (`ref(new Set())`, line 260) but never populated anywhere in the file; this UI branch is permanently dead** |

### State: Bulk selection bar (`selected.size > 0`)

| # | Direction | Message |
|---|-----------|---------|
| 35 | App→User | Display floating bulk bar: "{{ selected.size }} selected", Clear button, Stage→ buttons, Pricing→ buttons (CourseBrowser.vue:192-206) |
| 36 | User→App | Click "Clear" → `clearSelection()` (line 194, 370-372) |
| 37 | User→App | Click a Stage→ button → `applyBulkStatus(value)` → `requestBulk('status', value)` (lines 197-199, 455, 391-402) |
| 38 | User→App | Click a Pricing→ button → `applyBulkPricing(value)` → `requestBulk('pricing', value)` (lines 202-204, 456, 391-402) |
| 39 | App→User | While `bulkBusy`, show "Applying… {{ bulkDone }}/{{ bulkTotal }}" (line 205) and disable all bulk buttons (`:disabled="bulkBusy"`, lines 197, 202) |

### State: Bulk confirm modal (`pendingBulk` set)

| # | Direction | Message |
|---|-----------|---------|
| 40 | App→User | Show modal: "Set {stage/pricing} → {label}", "This will change N course(s)" (CourseBrowser.vue:210-218) |
| 41 | App→User | If `learnerVisible` (status→beta or released), show amber warning "makes course(s) visible to learners in the app" (+ beta-specific caveat) (lines 220-225) |
| 42 | User→App | Click backdrop (`@click.self`) or "Cancel" → `cancelBulk()`, discards pending action (lines 209, 228, 404-406) |
| 43 | User→App | Click confirm button (label varies: "Yes, set N to X" if learner-visible, else "Set N to X") → `confirmBulk()` (lines 229-235, 408-453) |
| 44 | App→App | `confirmBulk()` iterates selected codes sequentially, POSTing to `/api/production/{code}/status` or `/api/production/{code}/pricing-tier` with bearer token from `getAccessToken()` (CourseBrowser.vue:426-433, 378-385) — **no request body validation of `value` against an allow-list before sending; relies entirely on server-side validation** |
| 45 | App→App | On each success, mutate local `courses[]` entry in place (optimistic update) (lines 434-438) |
| 46 | App→App | On each per-course failure, push to `failed[]` and `console.warn` (no user-visible per-item message) (lines 440-443) |
| 47 | App→User | After the loop: `toast.warning('Updated X/N — failed: codes...')` if any failed, else `toast.success('Updated N course(s) → label')` (lines 451-452) — twin for the App→App bulk-update process |
| 48 | App→App | `confirmBulk()` clears selection and reassigns `courses.value` for reactivity regardless of outcome (lines 447-449) |

### If guard assumptions break (CourseBrowser)
`/courses` carries no `courseCode`/`code` route param, so the global guard's course-scoping check (router/index.js:714-721) never runs here — access is gated only by `isAuthenticated` and the recorder confinement. If `isRecorder` is ever wrongly `false` for an actual recorder, they reach this screen and see the full course table (filtered only by `canAccessCourse` inside `accessibleCourses`, line 305) rather than being bounced to their Record Room. If `canAccessCourse` itself misbehaves (e.g. throws or always returns true because `learner.value` is undefined), `accessibleCourses` either throws (breaking the whole screen — no error boundary is shown in this file) or silently shows courses the user shouldn't see, since this screen is the ONLY gate for course visibility on this route.

### Findings — CourseBrowser

- **Class 3 (MISSING TWIN)** — `CourseBrowser.vue:642-646` — `loadCourses()`'s catch block sets `error.value` and logs, giving an App→User error panel, but the individual-course stats failure path (`CourseBrowser.vue:585-586` Supabase branch, and the per-course `catch {}` at `CourseBrowser.vue:625-626` in the proxy branch) has **no App→User message at all** — a course can sit forever showing `0`/blank stats with zero indication to the user that stats loading failed for it specifically (only a `console.warn`/silent swallow).
- **Class 2 (UNVALIDATED)** — `CourseBrowser.vue:428-432` — `confirmBulk()` builds the POST body directly from `pendingBulk.value` (`value`) without validating it's one of the known status/pricing enum values before sending; `requestBulk` (line 391) also never checks `value` against `statusFilters`/`pricingFilters` — a stray call path could pass an unexpected value straight to the API with only the label computed defensively (`kind === 'status' ? statusLabel(value) : ...`, line 397).
- **Class 5 (UNREACHABLE/ORPHAN)** — `CourseBrowser.vue:158, 170, 260` — `highlightedCourses` ref is created but nothing ever adds entries to it; the "• new" badge and `row-new` highlight styling are permanently unreachable dead code.
- **Class 4 (UNSPECIFIED CONTENT)** — `CourseBrowser.vue:117-120` — the error panel renders `{{ error }}` (i.e. `err.message`) directly from whatever `getAllCourses()`/`fetch` throws; there's no defined mapping of specific failure scenarios (network down vs. 500 vs. malformed JSON) to distinct user-facing copy — content is whatever the underlying client happens to produce.
- **Class 2 (UNVALIDATED)** — `CourseBrowser.vue:20, 345-348` — "New Course" link and `openCourse()` both navigate straight to `/production/:code` (a different route/component) with no client-side `canAccessCourse` pre-check; relies entirely on that route's own guard behaviour, which is out of scope for this file but worth flagging since this screen is where the navigation originates.

---

## Screen: CourseManager (src/views/CourseManager.vue)

`buildMode` defaults to `'builder'` and `showLegacyMode = false` (CourseManager.vue:1116-1117), so the "Phases 1-3" UI (Phase Progress cards, Preview/Execute buttons, Build Mode selector) is **hidden by default** in the current build — documented below for completeness since the template branches still exist and `showLegacyMode` can be flipped in source.

### State: New course (`isNewCourse = true`, no `courseCode`/`route.params.courseCode`)

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→App | On mount with no code: set `configExpanded = true` (CourseManager.vue:1978-1979); do NOT start polling or WebSocket |
| 2 | App→User | Display "Configuration" section auto-expanded, with two "Select known/target language" dropdowns populated from a hardcoded 10-language list (CourseManager.vue:76-94, 1080-1091) |
| 3 | User→App | Select known/target language dropdowns → `knownLang`/`targetLang` (lines 77-94) |
| 4 | App→App | If both codes set, render `<LanguageBriefEditor>` (CourseManager.vue:101-109) — **that component's own Trinity messages are out of scope for this file** |
| 5 | User→App | Click a Course Size button (Test/MVP/Full → 30/300/668 seeds) → `seedCount = size.seeds` (CourseManager.vue:118-129, 1093-1097) |
| 6 | User→App | Click an Agent Engine button (iTerm2/Terminal/Safari) → `agentEngine = engine.id` (lines 140-153, 1099-1103) |
| 7 | User→App | Click a Machine Profile button (Tom's MacBook/Kai's Machine/Default) → `selectedMachineProfile = profile.id`, persisted to `localStorage['ssi_machine_profile']` via watcher (CourseManager.vue:161-174, 2007-2009) |
| 8 | App→User | "Create Course" button enabled only when `canCreateCourse` (`knownLang && targetLang && knownLang !== targetLang`) (CourseManager.vue:200-207, 1184-1186) — **no validation feedback message when disabled; button is just greyed out with no explanation of why (e.g. "choose two different languages")** |
| 9 | User→App | Click "Create Course" → `createCourse()` (line 202, 1560-1590) |
| 10 | App→App | `createCourse()` POSTs `/api/courses/create` with `{courseCode, target, known, seedCount}` (CourseManager.vue:1567-1579) — no client-side re-check that `newCode` doesn't already collide with an existing course before the call |
| 11 | App→App | On success: `addEvent('Created course: ${newCode}')` then `router.push('/course/${newCode}')` (lines 1583-1584) |
| 12 | App→User | On failure: `console.error` + `addEvent('Error: ${error.message}')` into the (collapsed by default) Event Log — **no toast/inline banner; a failed course creation is only visible if the user expands "Event Log"** |

### State: Existing course, initial mount (`courseCode` present)

| # | Direction | Message |
|---|-----------|---------|
| 13 | App→App | On mount: `configExpanded = false`, `startPolling()`, `connectWebSocket()`, `fetchCalibrationReview()` (CourseManager.vue:1971-1976) |
| 14 | App→App | `startPolling()` calls `buildMonitor.start()` (Supabase Realtime + fallback poll) and logs "Started monitoring (Supabase Realtime)" to the event log (CourseManager.vue:1845-1849) |
| 15 | App→App | `connectWebSocket()` opens a socket.io connection to `apiBase` at path `/api/orchestrator/websocket`, subscribes to `courseCode` (CourseManager.vue:1857-1871) |
| 16 | App→App | `fetchCalibrationReview()` GETs `/api/golden/review-queue/${code}` from course-builder-api; **failures are silently swallowed** (`catch { /* optional */ }`, CourseManager.vue:1962-1964) |
| 17 | App→User | Header shows collapsed config summary: display name, seed count, engine, machine profile (+ build mode if `showLegacyMode`) (CourseManager.vue:54-56) |

### State: Job Control — builder mode idle, work available (`hasWorkToDo`, `jobStatus==='idle'`)

| # | Direction | Message |
|---|-----------|---------|
| 18 | App→User | Show "Ready to build {{ seedCount }} seeds with single agent" (CourseManager.vue:404-406) |
| 19 | User→App | Click "Start Course Builder" (`v-if="buildMode==='builder' && jobStatus==='idle' && canStartBuilder"`) → `startCourseBuilder()` (CourseManager.vue:438-444, 1682-1725) |
| 20 | App→App | POST `${builderApiUrl}/api/build/team-start/${code}` with `{terminal, targetSeeds, parallel:true}` (CourseManager.vue:1687-1699) |
| 21 | App→User | On success: set `builderProgress.status='running'`, `jobStatus='running'`, `parallelPhase='drafting'`, log `"Started Parallel Build for ${code} (${seedCount} seeds)"` (CourseManager.vue:1708-1719) |
| 22 | App→User | On failure: `console.error` + `addEvent('Error: ${error.message}')` (lines 1721-1724) — again event-log-only, no toast/banner |

### State: Job Control — builder mode running (`jobStatus==='running'`)

| # | Direction | Message |
|---|-----------|---------|
| 23 | App→User | Show elapsed time (`elapsedTime`, CourseManager.vue:397, 1294-1300), and if `buildMode==='builder'`, "Seed: N / total" (line 399); if `lastActivityAgo` present, "Last activity: Xs/m ago" (line 400) |
| 24 | App→User | Job Status badge shows "Building Course" with blue pulsing dot (CourseManager.vue:29-36, 1236-1264) |
| 25 | App→User | If `isStuck` (no progress for >5 min, CourseManager.vue:1266-1271), show amber "Stuck" pill next to "Job Control" heading (lines 389-393) |
| 26 | User→App | Click "Stop Job" → `stopJob()` (CourseManager.vue:470-477, 1727-1787) |
| 27 | App→App | `stopJob()` sets `jobStatus='stopping'`; in builder mode POSTs `/api/mission-control/jobs/${code}-build/stop` (CourseManager.vue:1740-1743) |
| 28 | App→User | On stop success: `addEvent('Course Builder job stopped')`; on non-ok response: `addEvent('Stop response: ${error}')` (lines 1746-1749) — both event-log only |
| 29 | App→App | Regardless of outcome, `jobStatus` is reset to `'idle'` at the end of `stopJob()`'s try AND catch blocks (lines 1776, 1784) — **stop always reports success by resetting to idle even when the underlying stop request failed (network error branch, lines 1780-1786), giving a false "stopped" state** |
| 30 | User→App | If `showForceKill` (stuck ≥5min OR stopping >30s, CourseManager.vue:1273-1280), click "Force Kill" → `forceKill()` (lines 480-486, 1789-1810) |
| 31 | App→App | `forceKill()` POSTs `/api/force-kill/${code}`, then unconditionally sets `jobStatus='idle'` in both success and catch paths (CourseManager.vue:1793-1809) — same false-success pattern as #29 |
| 32 | App→User | `addEvent('Force kill executed')` on success; on failure `addEvent('Error: ${message}')` (lines 1804, 1808) — both event-log only, and both fire regardless of whether `jobStatus` reset actually reflects backend truth |

### State: Legacy Phases 1-3 mode (`showLegacyMode===true && buildMode==='phases'`) — currently unreachable via UI (no toggle exposed) but present in code

| # | Direction | Message |
|---|-----------|---------|
| 33 | App→User | Display 3 phase cards (Translation/Conflicts/Baskets) with status dot, progress bar, `completed/total unit` counts (CourseManager.vue:222-261) |
| 34 | App→User | If `etaDisplay` computed (needs ≥2 history points + running phase), show "~{{time}} at {{rate}}" (lines 216-219, 1310-1332) |
| 35 | User→App | Click "Preview" (`v-if="...jobStatus==='idle' && hasIncompletePhases && !previewExpanded"`) → `fetchPreview()` (CourseManager.vue:415-426, 1592-1629) |
| 36 | App→App | GET `${apiBase}/api/preview/${code}/${targetPhase.number}?mode=${mode}` (CourseManager.vue:1607-1611) |
| 37 | App→User | On success: expand Dry Run Preview panel showing Work/Mode/Workers/Estimate + optional LEGO type breakdown (CourseManager.vue:490-560) |
| 38 | App→User | On failure: `previewError` set and rendered inline in the preview panel + `addEvent('Preview error: ...')` (CourseManager.vue:563-565, 1622-1626) — this path DOES have a visible in-panel error (unlike several other error paths in this file) |
| 39 | User→App | Click "Execute {{ nextPhaseAction }}" (`v-if="...previewExpanded"`) → `startPhase()` (CourseManager.vue:428-435, 1637-1680) |
| 40 | App→App | POST `${apiBase}/api/courses/generate` with `{courseCode, phaseSelection, spawnerMode, machineProfile, mode}` (CourseManager.vue:1652-1666) |
| 41 | App→User | On failure: `console.error` + `addEvent('Error: ...')` only (lines 1676-1679) |
| 42 | User→App | Click "Cancel" (closes preview) → `closePreview()` (CourseManager.vue:447-453, 1631-1635) |
| 43 | User→App | If `showClearStaleButton` (idle + incomplete phases + preview shows 0 work, CourseManager.vue:1282-1292), click "Clear Stale Job" → `clearStaleJob()` (lines 456-467, 1812-1842) |
| 44 | App→App | POST `${phase3Url}/abort/${code}` directly to the Phase 3 service (bypassing the orchestrator) (CourseManager.vue:1819-1824) |
| 45 | App→App | On success: `addEvent('Stale job cleared...')`, close preview, then `setTimeout(fetchPreview, 500)` re-fetches (lines 1826-1834) — a raw `setTimeout` with no cleanup/cancellation if the component unmounts in that 500ms window |

### State: Calibration Review Queue banner (`calibrationReview.pending > 0 || approved > 0`)

| # | Direction | Message |
|---|-----------|---------|
| 46 | App→User | Show "Calibration Review Queue" banner: "{{approved}}/{{total}} approved" + "{{pending}} awaiting review" if pending>0 (CourseManager.vue:340-353) |
| 47 | User→App | Click "Review Seeds" → navigate to `/production/${courseCode}/calibration-review` (CourseManager.vue:354-359) — a different route, not re-validated by this screen |

### State: Stats Bar (always rendered when data present)

| # | Direction | Message |
|---|-----------|---------|
| 48 | App→User | Render 4 stat tiles from `stats` array (Seeds/LEGOs/Phrases/Ratio in builder mode) (CourseManager.vue:364-377, 832-837) |

### State: Pipeline Stepper (`courseCode && pipelineStatus`)

| # | Direction | Message |
|---|-----------|---------|
| 49 | App→App | `buildMonitor.pipeline` watcher updates `pipelineStatus` when `p.stage` present (CourseManager.vue:908-912) |
| 50 | App→User | Show "Running" (pulsing) if `pipelineStatus.is_running`, else "Awaiting Review" if `human_gate` (CourseManager.vue:574-577) |
| 51 | User→App | Click "Build Course"/"Resume Pipeline" (`v-if="!is_running && stage!=='complete'"`) → `startPipeline()` (CourseManager.vue:578-585, 956-973) |
| 52 | App→App | POST `${builderApiUrl}/api/build/pipeline/${courseCode}` (CourseManager.vue:961-964); on failure only `console.error`, **no `addEvent`, no toast, no UI change at all** — a failed pipeline start is completely silent to the user |
| 53 | User→App | If `pipelineStatus.human_gate`, click "Open Review" → navigate to `/production/${courseCode}/calibration-review` or `/qa-review` depending on stage (CourseManager.vue:586-592) |
| 54 | App→User | Render stage stepper (Translate→Calibrate→Golden→Build MVP→QA Review→Gender Prep→Complete) with checkmark/current-pulse/pending styling (CourseManager.vue:596-609, 924-939) |

### State: Seed Grid (Rebuild Visualization) (`seedGrid.length > 0`)

| # | Direction | Message |
|---|-----------|---------|
| 55 | App→App | `buildMonitor.seedGrid` watcher assigns `seedGrid.value` (CourseManager.vue:887-891); also independently re-fetched by `fetchSeedGrid()` GET `/api/build/seed-grid/${code}` on every `fetchProgress()` poll tick in builder mode (CourseManager.vue:1462-1463, 1023-1038) |
| 56 | App→User | Header shows "{{finalized}}/{{total}} finalized", "{{drafted}} drafted" (amber), "{{collision}} collision" (red) counts + collapse toggle (CourseManager.vue:613-629) |
| 57 | User→App | Enter numeric "From"/"To" seed range → `rebuildFrom`/`rebuildTo` (`v-model.number`, CourseManager.vue:644-654) — **no validation that From ≤ To or that the range lies within `[1, seedCount]` beyond the HTML `min`/`max` attributes, which are not enforced against direct state mutation or paste** |
| 58 | User→App | Click "Rebuild" → `rebuildConfirming = true` (CourseManager.vue:656-663) |
| 59 | App→User | Show inline confirm: "Delete LEGOs + phrases for seeds {{from}}-{{to}}?" with Confirm/Cancel (CourseManager.vue:664-679) |
| 60 | User→App | Click "Confirm" → `executeRebuild()` (CourseManager.vue:667-672, 1040-1070) |
| 61 | App→App | POST `${builderApiUrl}/api/build/rebuild/${code}` with `{from_seed, to_seed, confirm:true}` (CourseManager.vue:1047-1053) — **irreversible deletion of LEGOs/phrases for a seed range; the only guard is the inline text confirm, no re-auth/typed-confirmation, and no re-validation on the client that `rebuildFrom<=rebuildTo`** |
| 62 | App→User | On success: `addEvent('Rebuild started: wiped N LEGOs + M phrases for seeds X-Y')`, close confirm, refresh grid (CourseManager.vue:1059-1061) |
| 63 | App→User | On failure: `addEvent('Rebuild failed: ${error}')` or `addEvent('Rebuild error: ${message}')` (lines 1063, 1066) — event-log only, no toast/banner for a failed destructive op |
| 64 | User→App | Click "Cancel" during confirm → `rebuildConfirming = false` (CourseManager.vue:673-678) |
| 65 | App→User | Render grid cells colour-coded by status (Empty/Drafted/Collision/Finalized) with `title` tooltip showing seed/status/legos/phrases (CourseManager.vue:684-691, 985-990) + static legend (lines 693-699) |

### State: Wipe Course (always rendered, not conditional on data presence)

| # | Direction | Message |
|---|-----------|---------|
| 66 | App→User | Show "Wipe Course" panel: "Delete all content, keep course shell" + "Keep audio" checkbox (default checked) (CourseManager.vue:704-714) |
| 67 | User→App | Toggle "Keep audio" checkbox → `wipeKeepAudio` (CourseManager.vue:712) |
| 68 | User→App | Click "Wipe" → `wipeConfirming = true` (CourseManager.vue:715-721) |
| 69 | App→User | Show inline confirm: "Delete all seeds, LEGOs, phrases{{', audio' unless keeping}}?" (CourseManager.vue:723-724) |
| 70 | User→App | Click "Confirm Wipe" → `executeWipe()` (CourseManager.vue:725-730, 992-1021) |
| 71 | App→App | POST `${builderApiUrl}/api/course/${code}/wipe?confirm=yes${keep_audio param}` — **irreversible full-course-content deletion gated only by the same inline-text confirm pattern as Rebuild, no typed course-code confirmation, no re-auth** (CourseManager.vue:998-1004) |
| 72 | App→User | On success: `addEvent('Wiped course: ... Re-created N empty seeds. Audio kept.')`, refresh seed grid + stats (CourseManager.vue:1007-1012) |
| 73 | App→User | On `data.ok===false`: `addEvent('Wipe failed: ${data.error}')` (line 1014); on thrown error: `addEvent('Wipe error: ${message}')` (line 1017) — event-log only for a destructive-op failure |
| 74 | User→App | Click "Cancel" during confirm → `wipeConfirming = false` (CourseManager.vue:732-737) |

### State: Event Log (collapsed by default, `logExpanded` toggle)

| # | Direction | Message |
|---|-----------|---------|
| 75 | User→App | Click "Event Log" header → `logExpanded = !logExpanded` (CourseManager.vue:745-752) |
| 76 | App→User | If `isPolling`, show green pulsing "Live" indicator (CourseManager.vue:754-760) |
| 77 | App→User | List events `{{time}} {{message}}`, newest first, capped at 100 (CourseManager.vue:775-786, 1384-1396) |
| 78 | App→User | If `events.length===0`, show "No events yet" (CourseManager.vue:783-785) |

### State: WebSocket live events (background, any time `courseCode` is set)

| # | Direction | Message |
|---|-----------|---------|
| 79 | App→App | `socket.on('seed:update', ...)` → `addEvent('Seed ... completed/failed')`, updates `activeWorkers` (CourseManager.vue:1874-1886) |
| 80 | App→App | `socket.on('progress', ...)` → updates `stats` array and merges `recentLogs` into `events` (dedup by message text) (CourseManager.vue:1888-1920) |
| 81 | App→App | `socket.on('batch:received'/'browser:complete', ...)` → `addEvent(...)` (CourseManager.vue:1922-1927) |
| 82 | App→App | `socket.on('connect_error', ...)` → `console.error` only — **no user-visible indication that live updates have stopped working**; `isPolling`/"Live" badge stays on regardless since it's driven by `buildMonitor`, not socket state (CourseManager.vue:1934-1936) |

### Lifecycle / cleanup

| # | Direction | Message |
|---|-----------|---------|
| 83 | App→App | `onUnmounted`: `stopPolling()` + `disconnectWebSocket()` (CourseManager.vue:1983-1986) |
| 84 | App→App | `watch(route.params.courseCode, ...)`: on course-code change, disconnect old WS, restart polling/WS for new code, or reset to creation mode if code cleared (CourseManager.vue:1989-2004) |

### If guard assumptions break (CourseManager)
`/course/:courseCode` IS course-scoped by the guard (router/index.js:714-721): if `canAccessCourse(courseCode)` returns false, the router redirects to `CourseBrowser` before this component ever mounts, so none of the above states render. If `canAccessCourse` throws or misbehaves (e.g. `learner.value` undefined mid-load), the practical effect is a redirect loop or a wrongful bounce to `CourseBrowser` — the user simply never reaches Course Manager, rather than reaching it with wrong data. If `isRecorder` is ever wrongly `false` for an actual recorder, they land on this full production-control surface (Start Builder, Rebuild, Wipe — all destructive/spend-triggering actions) instead of being confined to `/record`; this is the single highest-stakes guard-break scenario for this route given the Wipe/Rebuild capabilities documented above.

### Findings — CourseManager

- **Class 3 (MISSING TWIN)** — `CourseManager.vue:961-969` (`startPipeline`) — the POST to `/api/build/pipeline/${courseCode}` has a `catch` that only does `console.error('[CourseManager] pipeline start error:', e)`; there is no `addEvent`, toast, or any UI change on failure — a failed pipeline start is silent to the user, who sees the button re-enable with no explanation. Validating code: `CourseManager.vue:965-972` — success path only checks `resp.ok` and calls `fetchPipelineStatus()`; failure path is truly empty of user feedback.
- **Class 5 (UNREACHABLE/ORPHAN)** — `CourseManager.vue:1117, 179-197, 213-263, 414-467` — `showLegacyMode` is hardcoded `ref(false)` with no setter exposed anywhere in the template or script; the entire "Phases 1-3" Build Mode selector, Phase Progress cards, Preview/Execute/Clear-Stale-Job flow are dead UI that can never be reached through the running application (only reachable by editing source and reloading).
- **Class 1 (UNTYPED — silent side-effect)** — `CourseManager.vue:1776, 1784` (`stopJob`) and `1800` (`forceKill`) — both unconditionally reset `jobStatus.value = 'idle'` in their `catch` blocks (network/request failure) exactly as in their success paths, so a failed stop/kill request is indistinguishable from a successful one at the UI level; the badge and buttons reflect "stopped" even though the backend job may still be running. This is a watcher/state mutation with no distinguishing downstream App→User message for the failure case — validating code confirms both paths converge on the same `jobStatus = 'idle'` assignment (lines ~1753-1756 vs 1780-1786 for `stopJob`; success block vs the shared catch is absent for `forceKill`, i.e. it always sets idle at line 1800 regardless of `response.ok`, since the `fetch` isn't even checked for `.ok`).
- **Class 2 (UNVALIDATED)** — `CourseManager.vue:644-654, 1040-1053` — Rebuild's `From`/`To` seed-range inputs are bound with `v-model.number` and HTML `min`/`max` attributes only; `executeRebuild()` sends `rebuildFrom.value`/`rebuildTo.value` straight into the destructive `/api/build/rebuild/${code}` POST body with no client-side check that `from ≤ to`, that both are positive integers, or that they fall within `[1, seedCount]` — a user could set From > To or paste a negative/huge number and the client will still fire the delete request, relying entirely on server-side validation (not visible in this file).
- **Class 2 (UNVALIDATED) / irreversible-op confirmation gap** — `CourseManager.vue:656-679` (Rebuild) and `715-741` (Wipe) — both destructive, data-deleting actions are gated only by a single inline "Confirm" click with static warning text; there is no typed confirmation (e.g. re-type course code), no re-auth step, and no distinct scary-styling differentiation between a routine bulk-status change (which itself has a modal, see CourseBrowser #40-43) and permanent content deletion beyond button colour.
- **Class 4 (UNSPECIFIED CONTENT)** — `CourseManager.vue:1017, 1749, 1808` and similar `addEvent('Error: ${error.message}')` call sites throughout — nearly every async action in this file (`createCourse`, `startPhase`, `startCourseBuilder`, `stopJob`, `forceKill`, wipe/rebuild errors) funnels raw `error.message` into the Event Log with no defined mapping to specific failure scenarios (auth expired vs. network down vs. 500 vs. malformed response), and since the Event Log is collapsed by default (`logExpanded = ref(false)`, line 816), the user may not see these messages at all without manually expanding it.
- **Class 3 (MISSING TWIN)** — `CourseManager.vue:1950-1965` (`fetchCalibrationReview`) — failures are caught with an empty comment-only block (`catch (err) { /* Silently ignore */ }`); if the review-queue endpoint is down, the Calibration Review Queue banner simply never appears, with no distinction from "there is genuinely no pending review" — the two states are visually and behaviourally identical to the user.

---


Screens covered:
- **CourseEditor** (`src/views/CourseEditor.vue`, 2104 lines, route `/courses/:courseCode`)
- **CourseCompilation** (`src/views/CourseCompilation.vue`, 749 lines, route `/courses/:courseCode/compile`)

Doctrine: every screen is messages; every message is exactly one of App→User (shows) | User→App (does) | App→App (processes).

## Router guard summary (verified against `src/router/index.js:655-724`, quoted not re-derived)

Both routes have `courseCode` as a path param, so both are **course-scoped** (`src/router/index.js:714-721`): the guard requires `canAccessCourse(courseCode)` or redirects to `CourseBrowser` with `console.warn`. Both are also subject to the global `beforeEach`: non-public routes require `isAuthenticated` (669-671), and any authenticated `isRecorder` user is hard-bounced to `/record/:courseCode?` before the course-scoping check runs (676-699) — so a recorder can never legitimately reach either screen. If `isRecorder` is ever wrongly `false` for an actual recorder, they reach these screens fully unblocked (guard-break scenario, applies identically to both screens below). If `canAccessCourse` throws or misbehaves (e.g. undefined `learner.value`), effect is a redirect loop or wrongful bounce to `CourseBrowser` — neither screen has its own defence against a wrongly-passed guard (both trust `route.params.courseCode` completely, see Findings).

---

## Screen: CourseEditor (src/views/CourseEditor.vue)

### State: Loading

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→App | `onMounted` calls `loadCourse()` (line 1242-1244) |
| 2 | App→User | Display "Loading course..." text, no spinner/skeleton (line 56-58) |
| 3 | App→App | `loading.value = true; error.value = null` (line 1247-1248) |
| 4 | App→App | `api.course.get(courseCode)` (line 1251) |

**If guard assumptions break:** if `canAccessCourse` wrongly passes, `api.course.get(courseCode)` is called with a courseCode the user has no legitimate access to; the component has no additional server-independent access check, so success/failure depends entirely on the backend also enforcing scoping (not verified in this file).

### State: Error (initial load failed)

| # | Direction | Message |
|---|-----------|---------|
| 5 | App→User | Display "Error Loading Course" heading + `{{ error }}` raw message text (line 60-64) |
| 6 | App→App | `error.value = err.message \|\| 'Failed to load course'` (line 1503-1505) |

No retry button, no navigation back to CourseBrowser offered in this state — dead end unless the user manually navigates away.

### State: Empty course (`course.isEmpty`)

| # | Direction | Message |
|---|-----------|---------|
| 7 | App→User | Display "New Course Created" panel with course name (line 67-89) |
| 8 | App→User | Display "This will run Phase 1 → Phase 2 → Phase 3" explainer text (line 85-87) |
| 9 | User→App | Click "Start Course Generator" → navigate to `generatorLink` (`/generate?target=X&known=Y`, computed from `courseCode.split('_for_')`, line 1048-1057) |
| 10 | App→User | Display Course Details card: code, target_lang, known_lang, status (line 91-112) |
| 11 | App→App | `loadCourse()` skips all S3 fetches and just calls `loadFlags()` when `response.course?.isEmpty` (line 1291-1299) |

**Finding:** if `courseCode` doesn't contain `_for_` (malformed/legacy code), `generatorLink` silently degrades to the bare `/generate` path with no target/known query params and no user-visible warning that fields need to be filled in manually (line 1048-1057).

### State: Populated course — top-level panels

| # | Direction | Message |
|---|-----------|---------|
| 12 | App→User | Display header: course code, `{{ total_seeds }} seeds • Version {{ version }}` (line 20-30) |
| 13 | User→App | Click "Production Suite" → navigate `/production/${courseCode}` (line 33-41) |
| 14 | User→App | Click "Course Generator" → navigate `generatorLink` (line 42-50) |
| 15 | App→User | Display 4 stat cards: SEED_PAIRS, LEGO_PAIRS, LEGO_BASKETS, INTRODUCTIONS counts from DB (line 117-139) |
| 16 | App→App | `api.course.get(courseCode)` maps `response.translations/legos/baskets` into component state (line 1251-1289) |
| 17 | App→User | Display QC Flags panel header + unresolved count badge, only if `unresolvedFlags.length > 0` (line 142-149) |
| 18 | User→App | Click "Expand"/"Collapse" toggles `showFlagsExpanded` (line 150-155) |
| 19 | App→User | Display each flag: seedId, legoId, issueType, suggestedCorrection, notes, created date (line 158-186) |
| 20 | User→App | Click "✓ Resolve" on a flag (line 187-193) |
| 21 | App→App | `api.course.deleteFlag(courseCode, flagId)` then `loadFlags()` (line 1522-1526) |
| 22 | App→User | Toast "Flag resolved" (line 1527) |
| 23 | App→User | Toast error "Failed to resolve flag: {message}" on failure (line 1530) |
| 24 | App→App | `ProgressMonitor` mounted only if `showProgressMonitor` (line 204-208) — delegated component, out of scope |
| 25 | App→User | Display Validation & Fix panel (LUT Check / Infinitive Check / Basket Gap Analysis / Regenerate Baskets), gated on `showValidationPanel` — **note: no control in this file ever sets `showValidationPanel = true`** (line 211, ref declared line 1104 default `false`) |
| 26 | App→User | Display Manifest Status card: "Ready for Audio" / "Manifest Not Compiled" based on `isManifestComplete` (line 366-390) |
| 27 | User→App | Click "Generate Audio" (disabled unless `isManifestComplete`) → `startAudioGeneration()` navigates to `AudioPipelineView` (line 398-406, 1988-1993) |
| 28 | App→User | Display tab bar: LEGO_PAIRS / LEGO_BASKETS / INTRODUCTIONS (line 432-443) |
| 29 | User→App | Click a tab → `activeTab = tab.id` (line 435) |

**If guard assumptions break:** none of the panel's own actions (LUT check, gap analysis, regenerate, resolve flag) re-validate `courseCode` against the authenticated user's course list — they all trust the route param, consistent with every other course-scoped screen.

### Findings — top-level panels

- **Class 5 (UNREACHABLE/ORPHAN)** — CourseEditor.vue:211,1104 — the entire "Validation & Fix Panel" (LUT Check, Infinitive Check, Basket Gap Analysis, Regenerate Baskets — message 25 and its subtree) is gated on `showValidationPanel`, which is declared `ref(false)` and never assigned `true` anywhere in the file (no button, no watcher, no route-query trigger). The panel, and every message inside it including the "Regenerate Baskets" confirmation/success/error modals (see below), is permanently dead code in the current UI — reachable only via direct devtools console manipulation of the ref.
  - *Validating code checked:* `grep -n "showValidationPanel" src/views/CourseEditor.vue` → only the declaration (1104) and the `v-if` (211); no setter exists.

### State: LEGOs Tab (`activeTab === 'legos'`)

| # | Direction | Message |
|---|-----------|---------|
| 30 | App→User | Display header "SEED → LEGO Breakdown (Phase 3)" + counts (line 447-453) |
| 31 | App→User | Display search input, placeholder "Search by SEED ID..." (line 456-463), only if `legoBreakdowns.length > 0` |
| 32 | User→App | Type into search box → `legoSearchQuery` updates, filters client-side via `filteredLegoBreakdowns` (line 458, 1223-1240) |
| 33 | App→User | Display "No LEGO_PAIRS found. Run Phase 3-4 to generate them." if `legoBreakdowns.length === 0` (line 465-467) |
| 34 | App→User | Display "No breakdowns match your search." if search yields 0 results (line 469-471) |
| 35 | App→User | Display each seed breakdown: seed_id, LEGO/FEEDER counts, "⚡ Contains composites" badge, target/known reference sentences (line 483-515) |
| 36 | User→App | Click "🚩 Flag" on a breakdown header → `flagSeed(breakdown)` opens edit modal pre-filled with seed_id/source/target (line 496-502, 1656-1665) |
| 37 | App→User | Display LEGO chunk chips (target row, then known row) with new/seen styling, composite ⚡ marker, "↺ previously introduced" marker (line 522-573) |
| 38 | User→App | Click a LEGO chip (target or known row) → `openFlagModal(seedId, pair)` (line 526, 559, 1644-1652) |
| 39 | App→User | Display COMPONENTIZATION sections for COMPOSITE legos + associated feeder chips (line 576-602) |
| 40 | App→User | Display "No componentization details provided" fallback text (line 585) |
| 41 | App→User | Display "No LEGO_PAIRS extracted yet" if a given breakdown has no `lego_pairs` (line 606-608) |

### Findings — LEGOs tab

- **Class 2 (UNVALIDATED)** — CourseEditor.vue:1756-1778 (`submitFlag`, triggered from message 36) — the flag form (`editModal`) has an issue-type `<select>` and a free-text `notes` textarea (line 810-828), but `submitFlag()` posts `{seedId, issueType, notes}` with zero client-side validation: an empty `notes` field, or the default `issueType: 'translation'` left unchanged, is submitted as-is. `api.course.createFlag` (services/api.js:1378-1386) also performs no payload validation before the POST — it's a pure passthrough. A user can submit a completely empty, contentless flag.
- **Class 2 (UNVALIDATED)** — CourseEditor.vue:1678-1699 (`submitLegoFlag`, triggered from message 38) — same pattern: only `seedId`/`legoId` presence is checked (line 1679); `suggestedCorrection` and `notes` are both optional and there is no minimum-content rule, so a user can submit a flag with no correction and no notes, giving reviewers nothing to act on.
- **Class 4 (UNSPECIFIED CONTENT)** — CourseEditor.vue:1691,1695 / 1771,1774 — success/failure toast text is generic (`'Flag submitted for ${legoId}'` / `'Failed to submit flag: ' + err.message`); the failure toast surfaces the raw HTTP/axios error string to the end user with no defined mapping to user-facing language (e.g. a 403 from a stale `canAccessCourse` guard would show as an opaque axios error, not "you no longer have access to this course").

### State: LEGO_BASKETS Tab (`activeTab === 'baskets'`)

| # | Direction | Message |
|---|-----------|---------|
| 42 | App→App | Mount `<LegoBasketViewer :course-code="courseCode" />` (line 616-618) |

**Out of scope:** all internal states (loading/empty/error/populated) of `LegoBasketViewer.vue` are not audited here — this screen's only responsibility is passing `courseCode` through, which it does unconditionally with no loading/error state of its own for the handoff.

### State: INTRODUCTIONS Tab (`activeTab === 'introductions'`)

| # | Direction | Message |
|---|-----------|---------|
| 43 | App→User | Display header "LEGO Presentations (Phase 6)" (line 622) |
| 44 | App→User | Display "No presentations found. Phase 6 may not be complete yet." if `!introductionsData?.presentations` (line 624-626) |
| 45 | App→User | Display each presentation: legoId, text, "✏️ Custom edited" badge if `presentation.edited` (line 629-645) |
| 46 | User→App | Click "Edit" on a presentation → `startEditIntro(legoId, presentation)` (line 663-669, 1702-1705) |
| 47 | App→User | Display textarea pre-filled with current text + hint "Use `{target1}` for target language audio" (line 649-657) |
| 48 | User→App | Type edits into textarea → `editedIntroText` updates (line 650) |
| 49 | User→App | Click "Save" → `saveIntro(legoId)` (line 672-677, 1712-1754) |
| 50 | User→App | Click "Cancel" → `cancelEditIntro()` discards edits (line 679-684, 1707-1710) |
| 51 | App→App | `api.course.updateIntroduction(courseCode, legoId, {text, edited:true})` (line 1720-1723) |
| 52 | App→User | Toast "✅ Saved to GitHub! Commit: {sha}" on success with a `github.sha` in the response (line 1741-1743) |
| 53 | App→User | Toast "⚠️ Saved but GitHub commit unconfirmed" if response lacks `github.sha` (line 1744-1746) |
| 54 | App→User | Toast "❌ Save failed: {message}" on error (line 1748-1750) |
| 55 | App→User | `alert('Introduction text cannot be empty')` if save attempted with blank/whitespace-only text (line 1713-1716) |

### Findings — Introductions tab

- **Class 4 (UNSPECIFIED CONTENT)** — CourseEditor.vue:1741-1747 — the three-way success/partial/failure distinction here is well specified (rare, this is one of the better-specified flows in the file), but it relies on inspecting `response.github.sha`; if the backend's contract ever changes shape, the "warning: unconfirmed" branch silently becomes the default path with no alerting/telemetry, i.e. every future save could quietly show "unconfirmed" without anyone noticing — no test/assertion pins the shape.
- **Class 1 (UNTYPED)** — CourseEditor.vue:1713-1716 — `saveIntro` uses a blocking `alert()` for empty-text validation instead of an inline validation message consistent with the rest of the form (a raw browser dialog, not a defined App→User UI message in the design system used elsewhere on this screen — cf. toasts everywhere else).

### State: Modals (overlay on any tab)

| # | Direction | Message |
|---|-----------|---------|
| 56 | App→User | Display "Flag for Review" modal: read-only known/target text, issue-type select, notes textarea (line 774-848) |
| 57 | User→App | Click "×" or backdrop → `closeEditModal()` (line 786-791, 952 `@click.self`) |
| 58 | User→App | Click "Submit Flag" (disabled while `editModal.saving`) → `submitFlag()` (line 839-845) |
| 59 | App→User | Display Regeneration Progress overlay (bottom-right), states: queued / running / complete / failed (line 700-771, 717-747) |
| 60 | App→User | Display progress bar with `{{ Math.round(progress) }}%` for queued/running (line 750-760) |
| 61 | App→User | Display `regenerationState.error` text if present (line 763-765) |
| 62 | App→User | Display raw `Job ID: {{ jobId }}` for debugging, always visible to end users (line 768-770) |
| 63 | User→App | Click "×" to dismiss, only enabled once status is complete/failed → `dismissRegenerationProgress()` (line 706-714, 1837-1844) |
| 64 | App→User | Display "Regenerate Baskets?" confirmation modal: missing count, delete count, "Auto-merge when complete", estimated minutes (line 850-902) — **dead, see Class 5 finding above (only reachable via `showValidationPanel`)** |
| 65 | User→App | Click "Cancel" → `cancelRegeneration()` (line 886-890, 1983-1985) |
| 66 | User→App | Click "OK" → `confirmRegeneration()` (line 892-899, 1944-1981) |
| 67 | App→User | Display Regeneration Success/Error modal: browsers/baskets/estimated-time on success, raw error text on failure (line 904-946) |
| 68 | User→App | Click "Close" → `regenerationResult = null` (line 939-943) |
| 69 | App→User | Display "Flag {legoId}" modal: target phrase, known translation (read-only), suggested-correction input, notes textarea (line 948-1026) |
| 70 | User→App | Click "×"/backdrop/"Cancel" → `closeFlagModal()` (line 958-963, 1010-1015, 952 self-click) |
| 71 | User→App | Click "Submit Flag" (disabled while saving) → `submitLegoFlag()` (line 1016-1023) |

### Findings — Modals

- **Class 3 (MISSING TWIN)** — CourseEditor.vue:1792-1828 (`startRegenerationPolling`) — on a poll-request error the catch block only `console.error`s and explicitly continues polling ("Don't stop polling on error — might be temporary network issue", line 1823-1826) with **no App→User message at all** for an individual poll failure. If the backend becomes permanently unreachable (not transient), the progress overlay (message 59-62) silently freezes at its last known percentage forever with no distinguishing content between "still working" and "we've lost contact" — the user has no way to tell these two states apart. *Validating code:* the only place `regenerationState.error` is ever set is on `status === 'failed'` (line 1814-1815), never on a poll-request exception.
- **Class 5 (UNREACHABLE/ORPHAN)** — CourseEditor.vue:1936-1981 (messages 64-68) — the entire "Regenerate Baskets?" confirm flow and its Success/Error modal are unreachable in the shipped UI: `regenerateBaskets()` (the only setter of `regenerationResult.confirming = true`) is itself only invocable from the dead Validation & Fix panel (see top-level Class 5 finding) — this is not a separate bug, it's the same orphan panel, noted here because it means five additional distinct modal states (confirm / confirming-disabled / success / error / dismiss) are all currently unreachable together.
- **Class 4 (UNSPECIFIED CONTENT)** — CourseEditor.vue:768-770 — the "Job ID" shown in the regeneration overlay is explicitly commented as "for debugging" but is unconditionally rendered to end users with no styling/copy distinguishing it as internal — a leaked debug affordance, not a defined user-facing message.
- **Class 2 (UNVALIDATED)** — CourseEditor.vue:986-993 (flagModal "Suggested Correction" input, message 69) — free-text `<input>` with no length limit, no format validation, and (as above) fully optional; combined with the optional `notes` field, the modal allows a fully empty submission through `submitLegoFlag()`.

### Findings — cross-cutting / whole-screen bugs

- **Class 4 (UNSPECIFIED CONTENT) — highest severity on this screen** — CourseEditor.vue:1034-1040 vs. 1545,1852,1882,1906,1947 — `getApiUrl` is called in five handlers (`generateBaskets`, `runLUTCheck`, `runInfinitiveCheck`, `runBasketGapAnalysis`, `confirmRegeneration`) but is **never imported** (`import api from '../services/api'` only — contrast with CourseCompilation.vue:343 `import api, { getApiUrl } from '../services/api'`, which imports it correctly). Every one of these five actions throws `ReferenceError: getApiUrl is not defined` at runtime, which is caught by the surrounding `try/catch` and surfaced via `alert('...failed: getApiUrl is not defined')` — a raw JS internals leak, not a defined error message, and the actual intended action (LUT check, infinitive check, gap analysis, basket regeneration) never runs. *Validating code:* `grep -n "getApiUrl\|^import" src/views/CourseEditor.vue` confirms no import exists anywhere in the file. Four of these five are additionally moot today because they live inside the dead `showValidationPanel` panel (Class 5 finding above), but `generateBaskets` (line 1534-1574) is **not** gated by that flag — it is only unreferenced from this file's own template (no visible caller found via `grep -n "generateBaskets\b" src/views/CourseEditor.vue`, only the declaration), so this specific ReferenceError is currently unreachable from the UI but would break the moment any button is wired to `generateBaskets`, `runLUTCheck`, `runInfinitiveCheck`, `runBasketGapAnalysis`, or the (dead) `confirmRegeneration`.
- **Class 5 (UNREACHABLE/ORPHAN)** — CourseEditor.vue:1534-1574 (`generateBaskets`) — declared but not called from any template element in this file (`grep -n "generateBaskets\b"` finds only the `async function` declaration); dead function, separate from the `showValidationPanel` dead panel.
- **Class 5 (UNREACHABLE/ORPHAN)** — CourseEditor.vue:1213-1221 (`filteredTranslations`) and the `translations`/`searchQuery`/`selectedSeed`/`provenanceResult`/`traceProvenance()` state (line 1062, 1074, 1076, 1066, 1780-1790) — all declared and populated from the API response but never rendered anywhere in the current `<template>` (no `v-for` over `translations` or `filteredTranslations` exists; `traceProvenance()` is only reachable via `editTranslation()`, line 1620-1633, which is itself never called from the template — `grep -n "editTranslation\b"` finds only the declaration). A significant amount of "translation list with search" UI appears to have been removed from the template while its backing logic and API calls were left in place.
- **Class 1 (UNTYPED)** — CourseEditor.vue:1865-1868 (`runLUTCheck`) — on a failed LUT check with `reextractionNeeded`, the code auto-triggers `runBasketGapAnalysis()` via `setTimeout` with no App→User message announcing that a second action is about to run automatically ("Collisions detected, running gap analysis..." is `console.log` only, line 1866) — a silent watcher-style side effect. (Currently unreachable per the `getApiUrl` and dead-panel findings above, but the pattern itself is the defect being flagged.)
- **Class 4 (UNSPECIFIED CONTENT)** — CourseEditor.vue:2067-2071, 2074-2076 (`flagCurrentSample`, `handleCycleFlag`) — both handlers unconditionally show `toast.info("Flagging ... isn't available yet.")`; these are stub handlers for a feature that is advertised in the UI (audio role selector state, `audioRoles` array line 1085-1090, and `LearningCyclePlayer` import line 1040) but the audio-QA section that would use `selectedAudioRole`/`currentAudioSample`/`playCurrentSample`/`getRandomSample` (lines 1091-1096, 1999-2065) has **no corresponding block in the `<template>`** at all (`grep -n "selectedAudioRole\|currentAudioSample" src/views/CourseEditor.vue` shows only script-side references) — another orphaned subsystem, same shape as the translations-search finding above.

---

## Screen: CourseCompilation (src/views/CourseCompilation.vue)

Not tab-based; a single 4-step linear wizard (`compilationStep` 0-3) plus a floating generation-progress overlay.

### State: Loading

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→App | `onMounted` calls `loadCourseData()` (line 443-445) |
| 2 | App→User | Display "Loading course data..." text, no spinner (line 93-95) |
| 3 | App→App | `api.course.get(courseCode)` → populates `courseStats.{seeds,legos,baskets}` (line 452-458) |

Note: the 4-step progress header (message 4 below) renders **unconditionally above** the loading/error/step content (line 17-90 is outside every `v-if`/`v-else` chain), so during loading the user sees a fully-drawn 4-step tracker showing step 1 active while the body below still says "Loading course data..." — a minor inconsistency, not classed as a defect (the tracker's own step highlighting is static chrome, not dynamically wrong).

### State: Error

| # | Direction | Message |
|---|-----------|---------|
| 5 | App→User | Display "Error" heading + `{{ error }}` raw message (line 97-101) |
| 6 | App→App | `error.value = err.message \|\| 'Failed to load course data'` (line 460-462) |

Same dead-end pattern as CourseEditor: no retry button, no back-navigation offered beyond the always-present "← Back to Course Editor" link in the header (line 6-8, present in every state).

### State: Step 1 — Compile JSON (`compilationStep === 0`)

| # | Direction | Message |
|---|-----------|---------|
| 7 | App→User | Display step 1 explainer text (line 106-109) |
| 8 | App→User | Display SEED_PAIRS / LEGO_PAIRS / LEGO_BASKETS counts from `courseStats` (line 111-124) |
| 9 | User→App | Click "Compile Course JSON" (disabled while `compiling`) → `compileCourseJSON()` (line 126-132, 468-497) |
| 10 | App→App | `POST /api/courses/${courseCode}/compile` (line 473-479) |
| 11 | App→User | `alert('Failed to compile course: ' + err.message)` on failure (line 493) |
| 12 | App→App | On success, `compiledJSON.value = data.courseJSON; compilationStep.value = 1` (line 486-489) |

### State: Step 2 — Audio Status Check (`compilationStep === 1`)

| # | Direction | Message |
|---|-----------|---------|
| 13 | App→User | Display "Course JSON compiled successfully!" confirmation text (line 140-142) |
| 14 | App→User | Display Slices / Seeds / Unique Samples / Total Audio Files stat cards, computed from `compiledJSON` (line 144-162, computeds line 393-420) |
| 15 | User→App | Click "Check Audio Status in S3" (disabled while `checkingAudio`) → `checkAudioStatus()` (line 164-170, 499-541) |
| 16 | App→App | Collects all sample IDs from `compiledJSON.slices[].samples`, `POST /api/audio/check-s3` (line 503-523) |
| 17 | App→User | `alert('Failed to check audio status: ' + err.message)` on failure (line 537) |
| 18 | App→App | On success, `audioStatus.value = data; compilationStep.value = 2` (line 529-533) |

### State: Step 3 — Generate Missing Audio (`compilationStep === 2`)

| # | Direction | Message |
|---|-----------|---------|
| 19 | App→User | Display Available/Missing/Total S3 stat cards (line 180-193) |
| 20 | App→User | Display green "All audio files are available!" callout if `missing === 0` (line 195-202) |
| 21 | App→User | Display yellow "⚠️ Missing Audio Samples — N files need to be generated" callout if `missing > 0` (line 204-209) |
| 22 | User→App | Click "Generate Missing Audio (N)" (only rendered if `missing > 0`; disabled while `generatingAudio`) → `generateMissingAudio()` (line 212-219, 543-585) |
| 23 | User→App | Click "View Missing Audio Details" (always available) → `viewMissingAudioDetails()` toggles `showMissingDetails` (line 221-226, 625-627) |
| 24 | App→User | Display missing-file list: id, text, role, cadence, only if `showMissingDetails` (line 230-251) |
| 25 | App→App | `POST /api/audio/generate-missing` with `{courseCode, missingAudio}` (60-min client timeout via `fetchWithTimeout`, line 554-564, 346-359) |
| 26 | App→App | If response has `jobId`, poll via `pollGenerationProgress(jobId)` every 2s (line 572-573, 587-623) |
| 27 | App→App | If no `jobId`, treat as immediate completion → `compilationStep.value = 3` (line 574-577) |
| 28 | App→User | Display floating "Generating Audio" overlay with progress bar, `completed / total files` (line 311-335) |
| 29 | App→User | Display `generationProgress.error` text inside the overlay if set (line 332-334) |
| 30 | App→App | On poll `status === 'complete'`: stop polling, re-run `checkAudioStatus()`, advance to step 3 (line 605-613) |
| 31 | App→App | On poll `status === 'failed'`: stop polling, set `generationProgress.error` (line 614-617) |

### State: Step 4 — Ready for Deployment (`compilationStep === 3`)

| # | Direction | Message |
|---|-----------|---------|
| 32 | App→User | Display "🎉 Course Ready for Deployment!" panel with 4 fixed "✓" checklist items (JSON/Audio/S3/Status — all hardcoded ✓, not independently re-verified at render time, line 254-282) |
| 33 | User→App | Click "Download Course JSON" → `downloadCourseJSON()` builds a Blob and triggers a browser download (line 285-290, 629-637) |
| 34 | User→App | Click "Deploy to Production" → `deployToProduction()` (line 292-297, 639-662) |
| 35 | App→App | `POST /api/courses/${courseCode}/deploy` with `{courseJSON: compiledJSON.value}` (line 641-650) |
| 36 | App→User | `alert('Course deployed successfully!')` on success (line 656) |
| 37 | App→User | `alert('Failed to deploy: ' + err.message)` on failure (line 660) |
| 38 | User→App | Click "Back to Course Editor" → `router-link` to `/courses/${courseCode}` (line 299-304) |

### Findings — CourseCompilation

- **Class 4 (UNSPECIFIED CONTENT)** — CourseCompilation.vue:493,537,569(implicit),579-581,656,660 — every terminal outcome in this wizard (compile fail, audio-check fail, deploy success, deploy fail) is a blocking `alert()`/nothing but a raw `err.message`, with zero structured/defined error content — no distinction between e.g. a network error, a 4xx validation error, and a 5xx server error; the user always sees the same generic template. This is the same pattern across all four network calls in the file (`compileCourseJSON`, `checkAudioStatus`, `generateMissingAudio`, `deployToProduction`).
- **Class 3 (MISSING TWIN)** — CourseCompilation.vue:639-662 (`deployToProduction`) — this is the single most consequential action on the screen (ships the course to production) and its only feedback is a transient `alert()` — there is no persistent on-screen deployment-status indicator, no deployment history, and no way to tell after the fact (e.g. after navigating away and back) whether a deploy actually succeeded, partially succeeded, or was never attempted. Reloading this screen re-runs `loadCourseData()` (message 1-3) which does not re-derive `compilationStep`/`compiledJSON`/deployment state from the server — a fresh page load always restarts the wizard at Step 1 with no memory of a prior successful deployment.
- **Class 3 (MISSING TWIN)** — CourseCompilation.vue:587-622 (`pollGenerationProgress`) — identical shape to the CourseEditor regeneration-poll finding: a poll-request `catch` block only does `console.error('Failed to poll progress:', err)` (line 619-620) with **no App→User message and no `generationProgress.error` update** — a permanently-unreachable status endpoint looks identical, forever, to "still generating," and the polling `setInterval` (line 588) is never cleared in this failure path, so it polls indefinitely with no user-visible sign anything is wrong.
- **Class 5 (UNREACHABLE/ORPHAN) — partial** — CourseCompilation.vue:254-282 — Step 4's four "✓" checklist rows are static markup (`✓ Compiled`, `✓ Complete (N)`, `✓ Synced`, `✓ Ready`) that render unconditionally the instant `compilationStep === 3`, regardless of whether `pollGenerationProgress` actually reached `status === 'complete'` cleanly or whether `generateMissingAudio`'s no-`jobId` "immediate completion" branch (message 27) genuinely verified anything — there's no failure path that can prevent reaching Step 4's all-green display once `compilationStep.value = 3` is set, and (per the finding above) a stalled/failed poll never sets that value, so this state can only be *reached* when things go right, but nothing re-validates that on arrival — it's asserted, not checked.
- **Class 4 (UNSPECIFIED CONTENT)** — CourseCompilation.vue:214-218 vs 543-551 — the "Generate Missing Audio (N)" button label commits to a specific count (`audioStatus.missing`) at click time, but `generationProgress.total` is set from that same snapshot (line 549) while the actual list sent to the API is `missingAudioList.value` (a live computed off `compiledJSON`/`audioStatus.availableIds`, line 422-441) — if `audioStatus` changes between render and click (unlikely given no live updates in this screen, but no guard prevents it either) the displayed N and the submitted list could silently diverge with no reconciliation message.

### If guard assumptions break (CourseCompilation)

Same as CourseEditor: `courseCode` is taken verbatim from `route.params.courseCode` (line 362) with no independent access check inside this component. If `canAccessCourse` wrongly passes a user through, this screen will attempt to load, compile, and — critically — **deploy to production** (`deployToProduction`, message 34-35) for a course the user should not have access to, entirely trusting the router guard and whatever server-side authorization the `/api/courses/:courseCode/deploy` endpoint independently enforces (not visible in this file).

---

## Summary of findings by class

| Class | Count |
|---|---|
| 1 — UNTYPED | 3 |
| 2 — UNVALIDATED | 3 |
| 3 — MISSING TWIN | 4 |
| 4 — UNSPECIFIED CONTENT | 8 |
| 5 — UNREACHABLE/ORPHAN | 6 |
| **Total** | **24** |

**Worst 3 findings:**
1. **CourseEditor.vue — `getApiUrl` is never imported** (script section, vs. line 1545/1852/1882/1906/1947): five QC/regeneration handlers throw `ReferenceError` at runtime instead of doing anything, surfaced to users as a raw JS internals string via `alert()`.
2. **CourseCompilation.vue:639-662 — `deployToProduction` has no persistent status/history**: the highest-stakes action in either screen (ships to production) gives only a transient `alert()`, with no durable on-screen record of whether a deploy happened, and a page reload silently restarts the whole wizard from Step 1.
3. **CourseEditor.vue — the entire Validation & Fix panel (`showValidationPanel`) and its five actions plus the Regenerate-Baskets confirm/success/error modal chain are permanently dead** (`showValidationPanel` is declared `false` and never set `true` anywhere in the file) — a large, fully-built feature surface that no user can currently reach.

---


Screens: `CourseProgress` (`src/views/CourseProgress.vue`, route `/courses/:code/progress`) and `CourseValidator` (`src/views/CourseValidator.vue`, routes `/validate` and `/validate/:courseCode` as `CourseValidatorDetail` — same component, two route entries).

---

## Screen: CourseProgress (src/views/CourseProgress.vue)

### Trinity Compliance Table

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→App | On mount, read `route.params.code` into `courseCode` (line 166) |
| 2 | App→App | `fetchProgress()` calls `GET ${apiUrl}/api/courses/${courseCode}/progress` with `ngrok-skip-browser-warning` header (222-228) |
| 3 | App→User | Display loading state "⏳ Loading progress..." while `loading && !progress` (27-32) |
| 4 | App→App | On non-OK response with status 404, parse JSON body (fallback `{}`) for `error.value` (232-236) |
| 5 | App→User | Display "Error Loading Progress" panel with `error.value` message and literal API URL being polled (35-41) |
| 6 | User→App | Click "Retry" button → re-invoke `fetchProgress()` (39-41) |
| 7 | App→App | On non-OK response with status ≠404, throw `Error('HTTP ${status}: ${statusText}')` (238) — caught by the outer catch, becomes generic error display |
| 8 | App→App | On success, parse JSON, assign to `progress.value`, clear `error.value`, set `loading = false` (241-244) |
| 9 | App→App | On network/fetch exception, branch on message substring `'Failed to fetch'`/`'Load failed'` to produce a friendlier "Cannot connect to {apiUrl}" message, else use raw `err.message` (245-254) |
| 10 | App→User | Display page header "Course Progress: {courseCode}" and status text colored via `statusColor` (11-16, 174-183) — `statusBadgeClass` (185-194) is computed but **never bound to any element in the template** |
| 11 | App→User | Render `SeedProgressGrid` (swim-lane view) when `progress.seedProgress` truthy, passing `targetSeedCount` (defaults to 668 if absent) (48-54) — internal content/loading/error states are that component's own contract, not audited here |
| 12 | User→App | `SeedProgressGrid` emits `@refresh` → re-invoke `fetchProgress()` (53) |
| 13 | App→User | Render `PipelineProgress` friendly view only when `overallStatus === 'running'`, passing derived `currentPhaseNumber`, `seedsProcessed`, `totalSeeds`, `startTime` (56-64) — internal content is that component's own contract |
| 14 | App→User | Render "Course Ready!" completion card only when `overallStatus === 'complete'` (67-88) |
| 15 | User→App | Click "View Course" link → navigate to `/courses/${courseCode}/edit` (79-87) |
| 16 | App→User | Collapsible "Technical Details" `<details>` section, default **open** (91-149) |
| 17 | App→User | Render up to 4 `PhaseCard`s (Phase 1, Phase 3, Manifest, Audio) reading `progress.phases[N]` with legacy-key fallbacks (`[5]`→Phase 3, `[7]`→manifest, `[8]`→audio) (100-132) |
| 18 | App→App | `PhaseCard.statusIcon`/`statusText` computed from `data.status` — throws if `data` is truthy but `data.status` is `undefined` (line 317: `this.data.status.charAt(0)`) since only `!this.data` is guarded, not "status missing" |
| 19 | App→User | Render "Live Logs" panel: list of `progress.recentLogs` entries with formatted time + level-colored message, or "No logs yet..." empty state if array is absent/empty (135-148) |
| 20 | App→App | `pollInterval = setInterval(fetchProgress, 2000)` starts on mount (281-286); cleared on unmount (288-292) — polling continues indefinitely regardless of `overallStatus` (e.g. still polls every 2s after `'complete'` or `'error'`) |

### If guard assumptions break
This route IS course-scoped (`to.params.code` matches the guard's `courseCode || code` check per the router summary), so `canAccessCourse(courseCode)` is enforced before render. If `isAuthenticated` wrongly resolves true, an unauthenticated caller reaches this screen and its `fetchProgress()` call fires immediately with no additional auth check in the component itself — the API response entirely decides what's shown. If `isRecorder` is wrongly `false` for an actual recorder, they land here (this is exactly the guard-break scenario called out in the router summary) and see raw pipeline/course internals (phase data, live logs, API URL on error) that a Recorder is not meant to see. If `canAccessCourse` throws/misbehaves, the guard redirects to `CourseBrowser` before this component ever mounts — this screen has no independent scoping of its own, so a guard failure here is a full bypass, not a partial one.

### Findings

- **Class 4 (UNSPECIFIED CONTENT)** — src/views/CourseProgress.vue:15 — `progress.overallStatus` is rendered directly as raw text with no defined value set/vocabulary (only `statusColor`/`statusBadgeClass` map 4 known values: running/complete/error/idle); any other backend-supplied status string renders verbatim with no fallback copy, and the failure mode (uncolored raw string) is unspecified.
- **Class 1 (UNTYPED)** — src/views/CourseProgress.vue:185-194 — `statusBadgeClass` computed property is defined but never referenced anywhere in the template; dead computed with no downstream App→User effect (a silent side-effect-free mutation that produces no message).
- **Class 4 (UNSPECIFIED CONTENT)** — src/views/CourseProgress.vue:317 — `PhaseCard.statusText`/`statusIcon` assume `this.data.status` is always a defined string once `this.data` is truthy (`!this.data || this.data.status === 'pending'` only short-circuits on missing `data`, not missing `data.status`); a `phases[N]` object present but lacking a `status` field throws a runtime TypeError inside the card, with no defined error content for that state.
- **Class 3 (MISSING TWIN)** — src/views/CourseProgress.vue:39-41 vs 222-255 — `fetchProgress` failures are shown via a persistent error panel with a manual Retry button, but there is no automatic recovery/backoff — if the orchestrator drops mid-poll, the 2-second `setInterval` (285) keeps re-attempting silently in the background with no visible retry-count/backoff messaging distinct from the first failure; the user cannot tell "server has been down for 10 minutes" from "just failed once".
- **Class 5 (UNREACHABLE/ORPHAN)** — src/views/CourseProgress.vue:20 — polling continues unconditionally after `overallStatus === 'complete'` or `'error'` (no clear on those terminal states); wasted App→App polling and a live-log/`PhaseCard` UI that theoretically keeps refreshing even though the course is finished — not a defined "polling stopped" state.
- **Class 4 (UNSPECIFIED CONTENT)** — src/views/CourseProgress.vue:11-20 header — `progress` starts `null`, `loading` starts `true`; between `loading=false` and the first successful `progress` assignment there's a narrow but real window where none of loading/error/progress conditions in the v-if chain (27, 35, 45) match if `progress` is set to a falsy-but-defined value (e.g. `{}` is truthy so this is contained, but no explicit "empty response" content is defined for a `200` response with an unexpected/empty body shape).

---

## Screen: CourseValidator (src/views/CourseValidator.vue)

Covers both route states: bare `/validate` (`route.params.courseCode` undefined → `selectedCourse` stays `''` → "All Courses Overview" grid renders) and `/validate/:courseCode` as `CourseValidatorDetail` (`route.params.courseCode` set → `selectedCourse` pre-populated on mount → single-course detail renders once its report loads).

### Trinity Compliance Table

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→App | On mount, if `route.params.courseCode` present, set `selectedCourse.value = route.params.courseCode` (795-799) |
| 2 | App→App | `loadData()`: `GET ${apiBase}/api/courses/validate/all` (561-573) |
| 3 | App→User | Display "Loading course analysis..." spinner while `loading` (18-21) |
| 4 | App→User | Display error panel with `err.message` on any `loadData`/fetch failure (24-30) |
| 5 | User→App | Click "Retry" → re-invoke `loadData()` (27-29) |
| 6 | App→App | If `selectedCourse` is set when `loadData` resolves (deep-link case, `/validate/:courseCode`), chain into `loadCourseReport(selectedCourse.value)` (576-577) |
| 7 | App→User | Render "All Courses Overview" grid (one card per `allValidation.courses` entry) when `!selectedCourse && allValidation` (49-108) — bare `/validate` lands here |
| 8 | App→User | Per-course card: progress bar (`completedPhases.length/4`), phase checklist (`phase_1`/`phase_3`/`manifest`), "Action Required"/"Complete" badge, "Next: {label}" hint (56-106) |
| 9 | User→App | Click a course card → `selectCourse(courseCode)` → sets `selectedCourse` and calls `onCourseChange()` (50-54, 620-623) |
| 10 | User→App | Change the `<select>` dropdown → `onCourseChange()`: if a course is chosen, `loadCourseReport`; if reset to `''`, clear `courseReport` (36-45, 625-631) |
| 11 | App→App | `loadCourseReport(courseCode)`: `GET ${apiBase}/api/courses/${courseCode}/validate` (587-601) — on failure sets `error.value` but does NOT reset `loading`/does not show the top-level error panel state cleanly (see findings) |
| 12 | App→User | Render single-course Summary Card: completed/missing/progress%/total phases, "Action Required"/"All Phases Complete" badge (111-156) |
| 13 | User→App | Click "🔬 Deep Analysis" button → `loadDeepValidation(courseReport.courseCode)` (117-122) |
| 14 | App→App | `loadDeepValidation`: `GET ${apiBase}/api/courses/${courseCode}/validate/deep` (603-618) |
| 15 | App→User | On deep-validation failure, `alert('Error: ' + err.message)` — no inline panel, browser-native modal only (614-617) |
| 16 | App→User | Render Deep Validation summary (critical issues / warnings / valid-phase count) and per-phase issues/warnings/stats when `showDeepValidation && deepValidation` (327-429) |
| 17 | User→App | Click "Hide Analysis" → `showDeepValidation.value = false` (330-335) — note: does NOT clear `deepValidation.value`, so re-showing is stale until another Deep Analysis click |
| 18 | App→User | Render "Quality Control & Basket Management" panel: LUT Check button + Basket Gap Analysis button (158-238) |
| 19 | User→App | Click "Run LUT Check" → `runLUTCheck()`: guard `if (!selectedCourse.value) alert('Please select a course first')` (669-673) then `POST ${apiBase}/api/courses/${selectedCourse}/phase/3/validate` (682-685) |
| 20 | App→User | Display LUT result panel: pass ("No Collisions") vs fail ("{N} Collisions Found"), affected-seed count (179-197) |
| 21 | App→App | If LUT result `status === 'fail'`, auto-trigger `runBasketGapAnalysis()` after a 500ms `setTimeout` (691-694) — an App→App chain the user did not explicitly request |
| 22 | User→App | Click "Analyze Gaps" → `runBasketGapAnalysis()`: same guard, then `GET ${apiBase}/api/courses/${selectedCourse}/baskets/gaps` (703-734) |
| 23 | App→User | Display Gap Analysis results: keep/delete/missing counts, coverage % (216-236) |
| 24 | App→User | Conditionally show "Actions Required" block + "Regenerate N Baskets" button only when `baskets_to_delete > 0 || baskets_missing > 0` (241-254) |
| 25 | User→App | Click "Regenerate N Baskets" → `regenerateBaskets()`: guards on `missingBaskets.length === 0` → `alert('No baskets to regenerate')`; else shows a `confirm()` dialog summarising delete count, spawn count, ETA (736-756) |
| 26 | App→App | On confirm, `GET ${apiBase}/api/courses/${selectedCourse}` for `target_language`/`source_language` (with silent English/Spanish fallback defaults), then `POST .../phase/5/regenerate` with `{courseCode, legoIds: missingBaskets, target, known}` (763-779) |
| 27 | App→User | Display regeneration result: message, deleted-baskets count, browsers-spawned count, estimated time, branch-pattern hint (256-270) |
| 28 | App→User | Render "Recommendations" list from `courseReport.recommendations`, each with priority styling (high/info/other), missing-components sublist (274-323) |
| 29 | User→App | Click "Run {phase}" recommendation action (only shown when `rec.action?.startsWith('run_')`) → `triggerPhase(rec.phase)` (316-322) |
| 30 | User→App | `triggerPhase`: `confirm('Are you sure...')` dialog naming the phase and course (633-639) |
| 31 | App→App | On confirm, `POST ${apiBase}/api/courses/${courseCode}/rerun/${phase}` (643-646) |
| 32 | App→User | On success, `alert()` showing instructions + redirect URL from response; on failure, `alert('Error: ' + err.message)` (648-665) |
| 33 | App→App | After trigger success, reload via `loadData()` (661) |
| 34 | App→User | Render "Phase Details" section from `courseReport.validation.phases`: complete/incomplete/blocked-by badge, description, files list (✓/✗ + size), directories list (✓/✗ + item count) (431-494) |

### If guard assumptions break
Bare `/validate` is **not** course-scoped by the router (no `courseCode`/`code` param on that route entry per the router summary) — any authenticated non-recorder reaches the full "All Courses Overview" and can select ANY course from the dropdown/grid, which is populated straight from `GET /api/courses/validate/all` with no client-side filtering by `learner.courses`; this is a real scope gap, not just a router quirk (the component does no filtering of its own — see findings). `/validate/:courseCode` (`CourseValidatorDetail`) IS course-scoped (`courseCode` param present), so `canAccessCourse` gates that deep link. If `isRecorder` is wrongly `false` for a recorder, they can reach either route per the router's stated guard-break scenario, exposing full course validation internals, LUT-collision data, and destructive-action buttons (regenerate baskets, rerun phases) to a role that should never see them. If `canAccessCourse` throws/misbehaves on the `:courseCode` variant, the guard redirects to `CourseBrowser`; the bare `/validate` route is unaffected by that failure mode since it has no course param to check in the first place.

### Findings

- **Class 2 (UNVALIDATED)** — src/views/CourseValidator.vue:625-631, 587-601, 561-585 — Bare `/validate` route is not course-scoped by the router, and `loadData()`/the course dropdown perform no client-side filtering of `allValidation.courses` against the current user's permitted courses; any authenticated non-recorder can select and view (and act on) any course's validation/LUT/regeneration data. This is the "real gap to report" flagged explicitly in the router summary for non-course-scoped routes.
- **Class 2 (UNVALIDATED)** — src/views/CourseValidator.vue:633-666 (`triggerPhase`) and 736-793 (`regenerateBaskets`) — both destructive/expensive actions (rerun a pipeline phase; delete old baskets + spawn regeneration browsers) are gated only by a client-side `window.confirm()` dialog, with zero server-side role/permission check surfaced in the request (no auth header logic visible, just `fetch(...)`); combined with finding above (no course scoping on `/validate`), any non-recorder authenticated user reachable at bare `/validate` can trigger phase reruns or basket regeneration for a course they may have no legitimate access to.
- **Class 3 (MISSING TWIN)** — src/views/CourseValidator.vue:587-601 (`loadCourseReport`) — on fetch failure this sets `error.value = err.message` but there is no corresponding success/failure UI twin scoped to "loading a single course's report" — the top-level `v-else-if="error"` panel (24-30) only renders when `loading` is also false and covers the WHOLE screen (including hiding the still-valid "All Courses Overview" / dropdown), and `loading` is never set true/false around this specific call, so depending on when it fires, the error may silently sit in `error.value` with no panel shown at all (since the outer `v-if="loading"` / `v-else-if="error"` / `v-else` chain at 18/24/33 is driven by the OUTER `loading`/`error` refs set by `loadData`, not by this function) — effectively a silent failure for course-report loads triggered by dropdown/card selection after initial load.
- **Class 3 (MISSING TWIN)** — src/views/CourseValidator.vue:669-701 (`runLUTCheck`) — on `fetch` succeeding at the network level but returning a non-2xx or malformed JSON body, `const result = await response.json()` (687) has no `response.ok` check at all (unlike `runBasketGapAnalysis` which does check `response.ok` at 720); a server error response is rendered directly as if it were a valid `lutCheckResult`, likely showing "Collisions Found: undefined" or similar rather than a defined error state.
- **Class 4 (UNSPECIFIED CONTENT)** — src/views/CourseValidator.vue:411-413 — Deep-validation issue `examples` are rendered as `JSON.stringify(issue.examples).substring(0, 100) + '...'` — a raw truncated JSON dump with no defined human-readable content/format for this state, and no handling if `examples` is not JSON-serializable-safe (e.g. contains circular refs — would throw) or if the truncation cuts mid-token producing invalid-looking output.
- **Class 1 (UNTYPED)** — src/views/CourseValidator.vue:691-694 — `runLUTCheck` auto-invokes `runBasketGapAnalysis()` via `setTimeout` on a failing result, an App→App side effect the user did not initiate via any button/message and that is not documented anywhere in the UI (no "auto-running gap analysis because collisions were found" message) — a silent chained mutation.
- **Class 5 (UNREACHABLE/ORPHAN)** — src/views/CourseValidator.vue:739 — `regenerateBaskets` reads `gapAnalysisResult.value.baskets_missing` (top-level property), but the Gap Analysis response actually populates `gapAnalysisResult.analysis.baskets_missing` (a count, per line 229) and the button's own guard/label at line 245/252 reads `gapAnalysisResult.analysis.baskets_missing` (a number) — the `regenerateBaskets` function's `missingBaskets = gapAnalysisResult.value.baskets_missing || []` (739) reads a different/likely-undefined path, meaning `missingBaskets` is probably always `[]`, `missingBaskets.length === 0` is always true, and the actual POST body's `legoIds: missingBaskets` (774) may always ship empty — the "Regenerate N Baskets" flow (steps 25-27 in the table) looks reachable in the UI but its core data dependency appears broken/orphaned by a field-name mismatch between what Gap Analysis returns and what Regenerate consumes.
- **Class 4 (UNSPECIFIED CONTENT)** — src/views/CourseValidator.vue:372 — `v-for` on `deepValidation.phases` combined with `v-if="phaseData.exists"` on the SAME element (Vue anti-pattern: `v-for`+`v-if` on one node) means phases where `exists` is falsy render nothing and have no defined "phase doesn't exist yet" content/placeholder in the Deep Analysis view, silently omitting them from both the loop and any visible state.

---


Screens: **IntroductionsViewer** (`src/components/IntroductionsViewer.vue`, route `/edit/introductions`) and **NetworkBuilder** (`src/views/NetworkBuilder.vue`, route `/network-builder`).

---

## Screen: IntroductionsViewer (src/components/IntroductionsViewer.vue)

Route: `/edit/introductions`, name `IntroductionsEditor` (`src/router/index.js:297-301`). No `meta.public`, no `courseCode`/`code` param in the path → **not course-scoped by the guard**; any authenticated non-recorder user can reach it regardless of which courses they belong to (guard summary, "NOT course-scoped by the guard"). The component itself does no scoping either — `availableCourses` (line 178) is a hardcoded array `['spa_for_eng', 'cmn_for_eng']`, not filtered by `learner.courses` or any membership check.

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→User | Render header "Introductions Editor" + subtitle "Edit LEGO introduction presentations" (1-9) |
| 2 | App→User | Render "Recompile Manifest" button, disabled when no course selected or a recompile is in flight (11-17) |
| 3 | App→User | Render course `<select>` populated from hardcoded `availableCourses = ['spa_for_eng', 'cmn_for_eng']` (22-33, script:178) |
| 4 | User→App | Select a course from the dropdown |
| 5 | App→App | `@change="loadIntroductions"` fires; sets `loading=true`, `error=null` (191-195) |
| 6 | App→App | Call `api.course.getPhaseOutput(courseCode, '3', 'introductions.json')` → `GET /api/courses/:courseCode/phase-outputs/3/introductions.json` (198; `src/services/api.js:1518-1521`) |
| 7 | App→User | Show "Loading introductions..." while `loading===true` (37-39) |
| 8 | App→User | On success, render stats (Total / Filtered / Modified) and the introductions table (60-138) |
| 9 | App→User | On failure, render "Error Loading Introductions" panel with `error.message` (42-45, 213-215) |
| 10 | App→User | Render empty state "Select a course to view introductions" when `introductionsList.length === 0` and not loading/erroring (167-169) |
| 11 | User→App | Type into the Search input (`searchQuery`) (52-57) |
| 12 | App→App | `filteredIntroductions` computed — case-insensitive substring match on `id` or `text` (221-231) |
| 13 | App→User | Table re-renders to `filteredIntroductions`; "Filtered Results" stat updates (67-68) |
| 14 | User→App | Click "Edit" on a row | 
| 15 | App→App | `startEdit(id, text)` sets `editingId`, `editText` (126-132, 237-240) |
| 16 | App→User | Row switches to `<textarea>` + Save/Cancel buttons (98-120) |
| 17 | User→App | Edit text in the textarea, press ⌘/Ctrl+Enter, or click Save |
| 18 | App→App | `saveEdit(id)`: reject if `editText.trim()` is empty → `alert('Introduction text cannot be empty')`; otherwise mutate the in-memory row and recompute `modified` (247-260) |
| 19 | App→User | Alert "Introduction text cannot be empty" (blocking `window.alert`) on empty save (249) |
| 20 | User→App | Press Escape or click Cancel |
| 21 | App→App | `cancelEdit()` clears `editingId`/`editText` (242-245) |
| 22 | App→User | Row reverts to read-only text (121-123) |
| 23 | App→User | When `modifiedCount > 0`, show "Unsaved Changes" banner with Discard / Save All Changes buttons (141-163) |
| 24 | User→App | Click "Save All Changes" |
| 25 | App→App | `saveAllChanges()`: guard `!selectedCourseCode` → alert; guard `modifiedCount===0` → alert; `confirm()` prompt "Save N modified introduction(s) to <course>?" (262-275) |
| 26 | App→App | Rebuild `presentations` object, call `api.course.savePhaseOutput(courseCode, '3', 'introductions.json', updatedData)` → `PUT /api/courses/:courseCode/phase-outputs/3/introductions.json` (280-299; `api.js:1524-1529`) |
| 27 | App→User | On success: `alert('✅ Successfully saved N introduction changes!\n\nRecommendation: Click "Recompile Manifest"...')` (309) |
| 28 | App→User | On failure: `alert('❌ Failed to save introductions:\n\n' + err.message)` (312) |
| 29 | User→App | Click "Discard Changes" |
| 30 | App→App | `confirm()` prompt "Discard N unsaved change(s)?"; if confirmed, revert every row's `text` to `originalData[id]` (318-329) |
| 31 | App→User | Rows revert to original text, "Unsaved Changes" banner disappears | 
| 32 | User→App | Click "Recompile Manifest" |
| 33 | App→App | `recompileManifest()`: guard no course selected → alert; guard `modifiedCount>0` → alert "save first"; `confirm()` prompt (332-345) |
| 34 | App→App | Call `api.course.regenerateManifest(courseCode)` → `POST /api/courses/:courseCode/regenerate/manifest` (350; `api.js:1505-1510`) |
| 35 | App→User | On success: `alert('✅ Manifest recompilation started!\n\nJob ID: ' + (response.jobId || 'N/A') + ...)` (351) |
| 36 | App→User | On failure: `alert('❌ Failed to trigger Manifest recompilation:\n\n' + err.message)` (354) |

**If guard assumptions break:** `isAuthenticated` false → redirected to Login before this screen renders, no exposure. `isRecorder` wrongly false for an actual recorder → they land here and can freely browse/edit `spa_for_eng`/`cmn_for_eng` introductions and trigger a manifest recompile, since neither the router nor the component does any role/course check for this route. `canAccessCourse` is never invoked for this route at all (no `courseCode`/`code` param), so its misbehaviour has no effect here — the real exposure is the *absence* of any per-course check, not a broken one.

### Findings

- **Class 2 (UNVALIDATED)** — `src/router/index.js:297-301` + `src/components/IntroductionsViewer.vue:178` — `/edit/introductions` has no `meta.public`/course-param and does its own no scoping (`availableCourses` is a static list, not filtered by the signed-in user's course membership), so any authenticated non-recorder can edit introduction text for `spa_for_eng` and `cmn_for_eng` regardless of whether they're assigned to those courses. Validated-by check attempted: none exists — grep of the component for `learner`/`courses`/`canAccessCourse` returns nothing.
- **Class 2 (UNVALIDATED)** — `services/orchestration/orchestrator.cjs:5445-5473` (PUT phase-outputs) — the endpoint this screen's Save writes to takes `req.params.file` and `req.body` and does `path.join(VFS_ROOT, courseCode, file)` then `fs.writeJson(filePath, data)` with no schema check on `data` and no allowlist/sanitisation on `file` beyond Express's own route-param decoding. The message content shown as "saved" is never validated to even be a `presentations` map before being written and later read back by `loadIntroductions` (line 202, which falls back to `{}` if the shape is wrong) — a malformed save would silently degrade to an empty introductions list on next load rather than surfacing an error.
- **Class 4 (UNSPECIFIED CONTENT)** — `src/components/IntroductionsViewer.vue:42-45` — the error panel renders raw `err.message` from whatever the API returns (line 214); there is no defined content for specific failure scenarios (network down vs. 404 course-not-found vs. malformed JSON, the latter of which the backend explicitly detects at `orchestrator.cjs:5417-5426` as `'Invalid JSON file'`) — the UI has one generic bucket for all of them.
- **Class 5 (UNREACHABLE/ORPHAN)** — `src/components/IntroductionsViewer.vue:178` — `availableCourses` is hardcoded to exactly two courses; any other course's `introductions.json` (phase 3 output) is structurally unreachable through this screen even though the backend route (`orchestrator.cjs:5387`) is fully generic per `:courseCode`.
- **Class 3 (MISSING TWIN)** — `src/components/IntroductionsViewer.vue:350-351` — `recompileManifest()` reports success purely on the HTTP call returning (`jobId` may be `'N/A'`); there is no follow-up App→User message when the async recompile job itself later succeeds or fails server-side — the user is told "recompilation started" and then has no further signal, matching CLAUDE.md's note that `manifest-generator.cjs` is legacy/off the learner path, making this button's actual effect on live content unclear from the UI alone.

---

## Screen: NetworkBuilder (src/views/NetworkBuilder.vue)

Route: `/network-builder`, name `NetworkBuilder` (`src/router/index.js:250-254`). No `meta.public`, no `courseCode`/`code` param → **not course-scoped by the guard**, and the component has no notion of "course" at all — it operates on ad-hoc named "networks" held in server memory, unrelated to `course_seeds`/`course_legos`.

Backend: a **separate standalone Express server**, `services/network-builder-api.cjs`, listening on its own port (`NETWORK_BUILDER_PORT`, default 3480) — not part of the main orchestrator/auth stack. It stores all networks in an in-process `networks` object (line 16) with **zero persistence** and **zero auth middleware** (no auth check anywhere in the file).

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→User | Render header "Network Builder" + subtitle (3-5) |
| 2 | App→App | `onMounted`: call `fetchState()`, then `setInterval(fetchState, 2000)` (315-319) |
| 3 | App→App | `fetchState()`: `GET {API_BASE}/state?network=<currentNetwork>` (259-272; `services/network-builder-api.cjs:88-101`) |
| 4 | App→App | On success, also call `fetchNetworks()` → `GET {API_BASE}/networks` to refresh tab list (268; `network-builder-api.cjs:77-85`) |
| 5 | App→User | Render network tabs from `networkList`, each showing `net.id`, LEGO count, phrase count (8-20) |
| 6 | App→User | Render stats bar: current network name, LEGO count, phrase count, edge count (22-35) |
| 7 | App→User | Render SVG graph: nodes (LEGOs, circle layout) + edges (parent→child lines) (40-72) |
| 8 | App→User | Render "Add LEGO" form: Chinese input, English input, "Can Follow"/"Can Precede" multi-selects populated from current `legos` (77-107) |
| 9 | App→User | Render LEGOs list panel with per-LEGO parent/child counts (109-128) |
| 10 | App→User | Render Phrases list panel, colour-coded by `legoCount` (130-146) |
| 11 | User→App | Click a network tab |
| 12 | App→App | `switchNetwork(id)`: sets `currentNetwork`, calls `fetchState()` (274-277) |
| 13 | User→App | Click "+ New" |
| 14 | App→App | `createNetwork()`: `window.prompt('Network name...')`; if cancelled/empty, no-op; else sets `currentNetwork` and calls `fetchState()`, which lazily creates the network server-side on first GET (279-284; `getNetwork()` in `network-builder-api.cjs:18-29`) |
| 15 | User→App | Fill "Add LEGO" form (Chinese + English required by HTML `required`; optional parent/child multi-select) and submit |
| 16 | App→App | `addLego()`: `POST {API_BASE}/lego?network=<id>` with `{chinese, english, canFollow, canPrecede}` (286-302) |
| 17 | App→App | Server validates `chinese && english` present → `400 {error:'chinese and english are required'}` if not (`network-builder-api.cjs:114-116`); otherwise assigns `id`, resolves parent/child refs (silently skipping any ref that doesn't resolve, no error surfaced — lines 133-158), computes new phrases, returns the new LEGO |
| 18 | App→User | On success (`data.lego` present): LEGO list/graph re-render via `fetchState()`; form resets (295-297) |
| 19 | App→User | On failure: **none** — `catch` block only does `console.error('Failed to add LEGO:', e)` (299-301); no UI feedback at all, including for the explicit 400 the server returns |
| 20 | User→App | Click "Reset Network" |
| 21 | App→App | `resetNetwork()`: `confirm('Reset the "<network>" network?')`; if confirmed, `POST {API_BASE}/reset?network=<id>` (304-313) |
| 22 | App→App | Server replaces the network in-memory with a fresh empty one, unconditionally, no auth/ownership check (`network-builder-api.cjs:229-242`) |
| 23 | App→User | On success: `fetchState()` re-renders empty graph, `selectedLego=null` (308-309) |
| 24 | App→User | On failure: **none** — `catch` only `console.error` (310-311) |
| 25 | User→App | Click "Refresh" |
| 26 | App→App | `fetchState()` re-runs (34, calls line 259) |
| 27 | User→App | Click a LEGO (in graph or in list) |
| 28 | App→App | `selectLego(lego)`: toggles `selectedLego` (toggle-off if re-clicking the same one) (240-242) |
| 29 | App→User | Render/hide "Selected LEGO Details" panel: parents, children, and phrases containing this LEGO (`phrasesContaining`, 150-177, 244-246) |

**If guard assumptions break:** `isAuthenticated` false → redirected to Login, no exposure via the Vue app. `isRecorder` wrongly false for an actual recorder → they reach this screen and can freely add LEGOs / reset any named network. Because this route carries no `courseCode`, `canAccessCourse` is never invoked and its misbehaviour is irrelevant here — but note the deeper issue below: even a fully-correct router guard only protects the *Vue client*; the network-builder API itself has no server-side auth, so the guard is the *only* thing standing between an unauthenticated actor and full read/write/reset access to this data if they call the API directly.

### Findings

- **Class 2 (UNVALIDATED)** — `services/network-builder-api.cjs` (whole file, e.g. lines 77, 88, 109, 185, 229, 245) — no authentication/authorisation middleware anywhere in this Express app; every route (`/networks`, `/state`, `/lego`, `/connect`, `/reset`, `/phrases`) is reachable by anyone who can reach the port, independent of the SPA's router guard entirely. Compounding: `NetworkBuilder.vue` calls this API with raw `fetch()` (lines 250, 261, 288, 307) rather than the shared `api` axios instance — so even the one auth mechanism the app has (the Bearer-token request interceptor at `src/services/api.js:120-125`) is never applied to these calls. Validated-by check attempted: grep for `Authorization`/`auth`/`req.user` in `network-builder-api.cjs` returns nothing.
- **Class 3 (MISSING TWIN)** — `src/views/NetworkBuilder.vue:299-301` and `:310-311` — `addLego()` and `resetNetwork()` both have `catch` blocks that only `console.error`; there is no App→User failure message for either action. This directly contradicts the explicit server-side validation the backend performs (e.g. the 400 "chinese and english are required" at `network-builder-api.cjs:115` — the form already sets these `required` client-side, but a race/direct-API caller or a future relaxation of the HTML constraint would fail 100% silently in the UI).
- **Class 1 (UNTYPED)** — `services/network-builder-api.cjs:133-158` — inside `POST /lego`, parent/child refs (`canFollow`/`canPrecede`) that fail to resolve via `findLego` are silently dropped (`if (parent) {...}` / `if (child) {...}`, no `else`) — a side-effect (partial connection graph built from a partial ref list) with no corresponding App→User or even App→App signal that some requested connections were ignored.
- **Class 4 (UNSPECIFIED CONTENT)** — `src/views/NetworkBuilder.vue` (whole file) — there is no defined loading state at all for `fetchState()`/`addLego()`/`resetNetwork()` (no spinner, no disabled-button-while-pending); a slow network call and a completed one are visually indistinguishable, and the 2-second poll (`setInterval(fetchState, 2000)`, line 318) can overlap a user's in-flight `addLego()` submit with no coordination (no aborted/queued/disabled state defined).
- **Class 5 (UNREACHABLE/ORPHAN)** — `services/network-builder-api.cjs:184-226` (`POST /connect`) — this endpoint has no caller anywhere in `NetworkBuilder.vue`; the UI only ever creates connections implicitly via the `canFollow`/`canPrecede` fields on `addLego`. A fully-built, server-validated endpoint (with its own 400s for missing/invalid `legoIds`) is dead code from the UI's perspective.
- **Class 3 (MISSING TWIN)** — `services/network-builder-api.cjs` (entire in-memory `networks` object, line 16) — every network created via "+ New" or populated via "Add LEGO" lives only in server RAM; there is no persistence layer and no App→User warning anywhere in the screen that a server restart silently discards all work. `resetNetwork()` (line 21 in the component) has an explicit `confirm()` guard for user-initiated loss, but process-restart loss has no corresponding message at all.

---

## Summary

Screens covered: IntroductionsViewer (`/edit/introductions`), NetworkBuilder (`/network-builder`).

Findings by class: Class 1 (UNTYPED) — 1. Class 2 (UNVALIDATED) — 3. Class 3 (MISSING TWIN) — 3. Class 4 (UNSPECIFIED CONTENT) — 2. Class 5 (UNREACHABLE/ORPHAN) — 2. Total: 11.

Worst 3 findings:
1. **NetworkBuilder's backend API has no authentication at all**, and the Vue client bypasses even the app's own Bearer-token interceptor by using raw `fetch()` — the router guard is the *only* access control, and it's client-side only (`services/network-builder-api.cjs` whole file; `src/views/NetworkBuilder.vue:250,261,288,307`).
2. **IntroductionsViewer does no course-membership scoping** and neither does its save endpoint (`orchestrator.cjs` PUT phase-outputs accepts unvalidated JSON blobs to any `courseCode`/`file` path pair) — any authenticated non-recorder can rewrite `spa_for_eng`/`cmn_for_eng` introduction text (`src/components/IntroductionsViewer.vue:178`; `services/orchestration/orchestrator.cjs:5445-5473`).
3. **NetworkBuilder's `addLego`/`resetNetwork` failures are completely silent to the user** (`console.error` only) despite the server performing real validation the UI already contradicts via `required` form fields (`src/views/NetworkBuilder.vue:299-301,310-311`).
