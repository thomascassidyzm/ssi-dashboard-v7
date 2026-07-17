# Trinity Compliance Audit — Courses B: Production Suite + Quality Review

> Date: 2026-07-17. Scope per campaign brief: Production Suite (9 screens: ProductionOverview,
> LeaderJourney, SynthesisStudio, SeedEditor, TextGeneration, PhraseQA, ScriptViewer,
> UserFeedback, TeamRoster), Quality Review (5 screens), and AudioPipeline + its 4 children
> (PipelineProgress, MissingAudio, SharedAudio, VoiceConfiguration), which the prior census had
> not crawled. Compiled from 4 sub-audits (this worker's own 8-screen pass, plus 3 dispatched
> workers covering TextGeneration.vue, the AudioPipeline area, and Quality Review) — each
> sub-audit's full detail is preserved verbatim below.

## Contents
1. [Production Suite — Overview, Journey, Synthesis, SeedEditor, PhraseQA, UserFeedback, TeamRoster, ScriptViewer (partial)](#part-1)
2. [Production Suite — TextGeneration.vue (priority screen)](#part-2)
3. [Audio Pipeline area — AudioPipeline.vue + 4 children](#part-3)
4. [Quality Review — 5 screens](#part-4)
5. [Consolidated summary](#consolidated-summary)

---

<a id="part-1"></a>

# Trinity Compliance Audit — Courses B: Production Suite (part 2)

> Scope: `ProductionOverview.vue`, `LeaderJourney.vue`, `SynthesisStudio.vue`, `SeedEditor.vue`,
> `PhraseQA.vue`, `UserFeedback.vue`, `TeamRoster.vue`, `ScriptViewer.vue` (8 of the 9 Production
> Suite screens — `TextGeneration.vue` covered separately in `courses-b-textgen.md`).
> Auth-blindness check: `grep -n useAuth` across these 8 files shows only `TeamRoster.vue:127` and
> `ScriptViewer.vue:742,1183` import `useAuth`. The other 6 (`ProductionOverview`, `LeaderJourney`,
> `SynthesisStudio`, `SeedEditor`, `PhraseQA`, `UserFeedback`) never touch `useAuth` — they make
> unauthenticated `fetch()` calls straight to the API, relying entirely on the router guard
> (`src/router/index.js:655-724`) for access control. Any endpoint that isn't itself
> re-authenticated server-side is reachable by anyone who can reach the API host directly.

---

## Screen: Production Overview (`src/views/production/ProductionOverview.vue`)
Route: `/production/:courseCode` (name `ProductionDashboard`)

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→User | Display status pills (Testing/Beta/Live), highlight active (`:88-95, :308-313`) |
| 2 | App→User | Display pricing-tier pills (Free/Premium/Community) (`:271-275, :315-317`) |
| 3 | App→User | Display header stats: seeds, LEGOs, phrases, phrases/LEGO ratio, audio (`:32-72`) |
| 4 | App→User | Show loading placeholders (`--`) while `isLoadingStats`/audio stats not yet loaded (`:34-70, :279-280`) |
| 5 | App→User | Display collapsible "Language-Pair Learnings" section if `learnings.length > 0` (`:76-90`) |
| 6 | User→App | Click a status pill → `setStatus(status)` (`:6-16, :370-378`) |
| 7 | App→App | `store.updateCourseStatus(status)` — no `.catch`; a failure throws uncaught, no App→User error message (`:373-377`) |
| 8 | User→App | Click a pricing pill → `setPricingTier(tier)` (`:20-29, :380-388`) |
| 9 | App→App | `store.updatePricingTier(tier)` — same missing-twin pattern as #7 (`:383-387`) |
| 10 | User→App | Click "Course Journey" / "Seed Editor" / "Text Generation" / "Listening Pods" workflow cards → navigate (`:101-146`) |
| 11 | User→App | Click "Script View" → navigate with `?view=journey` (`:188-198`) |
| 12 | User→App | Click "Open Learning App" → `launchLearningApp()`, opens new tab (`:200-207, :390-393`) |
| 13 | User→App | Click "Recording Optimizer" link → navigate (`:213-215`) |
| 14 | User→App | Click "Run QA Audit" → `runAudit()` (`:216-218, :395-409`) |
| 15 | App→App | POST `/api/qa/spawn-audit/:courseCode` — **no response-status check, no success/failure message; only `console.error` on network exception** (`:398-406`) |
| 16 | User→App | Click "Export Legacy" → open `LegacyExportDialog` (`:219-229`) |

### Findings
- **[Class 3 — MISSING TWIN]** `runAudit()` (`ProductionOverview.vue:395-409`): spawns a background audit job but never checks `res.ok` and never shows the user whether it started successfully or failed — the button just reverts to "Run QA Audit" either way. A learner-facing silent-failure pattern (per the campaign's own example class).
- **[Class 3 — MISSING TWIN]** `setStatus`/`setPricingTier` (`:370-388`): `store.updateCourseStatus`/`updatePricingTier` are awaited with no `.catch` — a rejected promise throws unhandled in the async function; the pill UI has no error state to show the user their status change didn't save.

---

## Screen: Course Journey (`src/views/production/LeaderJourney.vue`)
Route: `/production/:courseCode/journey`

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→User | Display 7 ordered steps (translate, decompose, verify, record, synthesize, qa, publish), each with title/blurb/status text (`:11-52, :258-360`) |
| 2 | App→User | Mark current step with `.current` styling; done steps get checkmark (`:16-20, :364-367`) |
| 3 | App→User | Record step shows 2 voice slots with assignment + coverage text (`:31-37, :203-215`) |
| 4 | App→User | Show `loadError` note ("Some progress numbers could not be loaded... refresh to retry") if any fetch failed (`:54-56, :100-107`) |
| 5 | App→App | `loadAll()` fires 5 parallel `Promise.allSettled` fetches (stats, QA summary, audio-stats, voice-config, synthesis coverage); each individually swallows its own failure except stats, which sets `loadError` (`:99-137`) |
| 6 | User→App | Click any step's router-links → navigate to text/seeds/phrase-qa/team/recording/synthesis/script/etc. (`:39-49`) |

### Findings
- **[Class 3 — partial MISSING TWIN]** Only the `stats` fetch failure sets `loadError` (`:107`); QA-summary, audio-stats, voice-config, and coverage failures are caught and silently ignored (`:118, :123, :127, :133`) — if those fail, the corresponding step just shows stale/zero data with no indication anything went wrong, while `loadError` stays `false`. A partial-failure state reads as full success.
- Read-only screen otherwise; no destructive actions, well-behaved.

---

## Screen: Build the Audio / Synthesis Studio (`src/views/production/SynthesisStudio.vue`)
Route: `/production/:courseCode/synthesis`

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→User | Show `loadError` banner if coverage fetch fails (`:14-16, :209-219`) |
| 2 | App→User | Show `seedAutoCoverGap` banner when gaps exist (`:18-21`) |
| 3 | App→User | Show "Loading…" while `loading` (`:23`) |
| 4 | App→User | Per-voice-slot card: readiness text, progress bar, buttons (`:25-137`) |
| 5 | App→User | "No voice assigned yet" + link to Team & voices if slot unassigned (`:29-31`) |
| 6 | User→App | Click "Check first" → `checkFirst(slot)` dry-run (`:54-56, :238-255`) |
| 7 | App→App | POST `/synthesize` `{dryRun:true}`; on non-409 error, **caught but produces no App→User message at all** — `jobs[voiceId].checking` just goes back to false with nothing shown (`:247-254`) |
| 8 | User→App | Click "Stitch" → `stitch(slot)` (`:57-59, :257-274`) |
| 9 | App→App | POST `/synthesize` (real run); on non-409 error, **same silent-failure pattern — no user-facing message** (`:267-273`) |
| 10 | User→App | Click "Cancel" (while running) → `cancel(slot)` (`:60, :276-284`) |
| 11 | App→App | POST `/synthesize/cancel`; **all errors silently swallowed** with just a comment ("status poll will reconcile") — if the poll also fails, the user is stuck on a stale "Stitching…" with no way to know cancel failed (`:283`) |
| 12 | App→App | `pollStatus(voiceId)` polls every 2s; on 404 shows "interrupted" note, but other errors (network blips) are silently ignored each tick (`:290-308`) |
| 13 | App→User | Show dry-run plan box: planned count, gap report (up to 10, "+N more" link to Record Room) (`:64-86`) |
| 14 | App→User | Show running progress bar + phase label (`:89-97`) |
| 15 | App→User | Show result box: recordings registered, phrases stitched/failed, gap report, sampler (`:103-135`) |
| 16 | User→App | Click "Listen to a few" → `loadSample(slot)` (`:118-120, :310-326`) |
| 17 | User→App | Click a sample's play button → `playSample(s)` (`:123-125, :328-334`) |

### Findings
- **[Class 3 — MISSING TWIN, most severe on this screen]** `checkFirst()` and `stitch()` (`SynthesisStudio.vue:247-254, 267-273`): both only handle `err.status === 409`; any other failure (validation error, 500, network drop) is caught and discarded with zero UI feedback — the "Check first"/"Stitch" button silently returns to its idle label as if nothing happened, and the operator has no way to know their click did nothing. This directly matches the campaign brief's class-3 example ("silent failure = the paywall-tap / metrics-write bug class").
- **[Class 3]** `cancel()` (`:276-284`): all errors swallowed; relies entirely on the next poll tick to reconcile state, with no user-visible fallback if the poll itself is failing.

---

## Screen: Seed Editor (`src/views/production/SeedEditor.vue`)
Route: `/production/:courseCode/seeds`

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→User | Display progress bar + "`complete`/`courseTotal` seeds complete" (`:7-10`) |
| 2 | App→User | Display filter dropdown (All/Needs review/Complete) + search box (`:13-24`) |
| 3 | App→User | Display seed table: #, canonical English, known, target, with green/yellow/red status dot (`:38-116, :254-258`) |
| 4 | App→User | Show "Loading seeds..." row while `loading && seeds.length===0` (`:48-50`) |
| 5 | User→App | Type in search → debounced `loadSeeds()` after 300ms (`:19-23, :260-267`) |
| 6 | User→App | Change filter → `loadSeeds()` via watcher (`:450-453`) |
| 7 | App→App | GET `/api/course/:code/seed-editor?...`; **on `!res.ok`, function does nothing — no error state, seeds/total/complete just stay at their previous values, loading spinner clears** (`:280-298`) |
| 8 | User→App | Click a known/target cell → `startEdit(seed, field)`, inline input appears (`:57-81, :301-310`) |
| 9 | User→App | Blur / Enter → `saveEdit(seed, field)`; Escape → `cancelEdit()` (`:67-69, :312-351`) |
| 10 | App→App | Optimistically updates `seed[field]` and `complete` count BEFORE the network call (`:324-331`) |
| 11 | App→App | POST `/api/course/:code/translate`; **on success shows a green tick (`savedKey`, 1.5s); on `!resp.ok` (e.g. server-side validation failure) — NOTHING happens: the optimistic edit is kept, no tick, no error, no revert** (`:333-351`). Only a thrown network exception reverts `seed[field]` (`:347-350`) |
| 12 | User→App | Click "↻ rebuild" on a target cell → `openCascade(seed)` opens re-translate/rebuild modal (`:101-106, :383-395`) |
| 13 | App→User | Cascade modal: known (readonly), target textarea, auto-decompose checkbox, advanced legos-JSON textarea, generate-audio checkbox (`:126-216`) |
| 14 | User→App | Click "Preview (dry run)" → `runCascade(true)` (`:207-210`) |
| 15 | User→App | Click "Re-translate & rebuild" → `runCascade(false)` — **this is a TTS-cost-triggering action** (generateAudio defaults `true`) (`:154-156, :211-213, :402-448`) |
| 16 | App→App | POST `/api/course/:code/edit-cascade`; result rendered per mode (auto-decompose / dry-run / cascade), including blast-radius failures list (`:158-203, :429-447`) |
| 17 | User→App | Click "Approve Seeds" → `approveSeeds()`, disabled until `complete >= courseTotal` (`:25-32, :353-368`) |
| 18 | App→App | POST `/api/course/:code/approve-seeds`; **on success, `alert('Seeds approved!...')`; on `!res.ok`, silently does nothing — no error shown** (`:356-367`) |
| 19 | User→App | Prev/Next pagination buttons (`:120-123`) |

### Findings
- **[Class 2/3 — UNVALIDATED + MISSING TWIN, most severe finding across my 8 screens]** `saveEdit()` (`SeedEditor.vue:317-351`): the optimistic UI update (`seed[field] = newValue`, `complete.value` bump) is applied unconditionally *before* the network call. If the server responds with a non-2xx status (validation rejection, auth failure, etc.), the code checks `if (resp.ok)` for the success path only — there is no `else` branch. The edited seed text and the complete-count both silently keep the (wrong, unsaved) optimistic value, with no tick shown and no revert. A learner-facing course seed can visibly diverge from what's actually stored, and the editor has zero indication their edit was rejected. This is worse than the SynthesisStudio silent-failures because it also **corrupts locally-displayed state**, not just fails to confirm.
- **[Class 3 — MISSING TWIN]** `loadSeeds()` (`:269-298`): no `else` branch on `!res.ok` — table silently keeps stale data with the loading spinner cleared, no error banner (contrast with `ScriptViewer.vue`'s explicit `error-state` pattern a few screens over in the same suite).
- **[Class 3 — MISSING TWIN]** `approveSeeds()` (`:353-368`): success path uses a blocking `alert()`; failure path (`!res.ok`) has no corresponding branch at all.
- **[Class 4 — UNSPECIFIED CONTENT, minor]** `cascade-warn` CSS class exists (`:873`) for audio-issue warnings inside the result box but is only reached via `cascade.result.audio?.errors` — no dedicated top-level error state if `runCascade` throws before getting a JSON body (falls to generic `c.error = err.message`, which is fine, just worth noting it's the one place on this screen that DOES surface errors correctly, unlike `saveEdit`/`approveSeeds`/`loadSeeds`).

---

## Screen: Phrase QA (`src/views/production/PhraseQA.vue`)
Route: `/production/:courseCode/phrase-qa`

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→User | Header: checked/total counts, error/warning/info flag-count badges or "All clear" (`:4-32`) |
| 2 | App→User | Progress strip: `progress_percent`% checked (`:56-59`) |
| 3 | App→User | Loading spinner + "Loading flags..." (`:64-67`) |
| 4 | App→User | Empty state: "No phrases checked yet" (if 0 checked) vs "No issues found" (`:70-78`) |
| 5 | App→User | Flags table: severity badge, seed #, known/target text, issue text, check_type (`:81-113`) |
| 6 | User→App | Select severity filter (All/Errors/Warnings) → `fetchFlags()` via watcher (`:35-39, :276-279`) |
| 7 | User→App | Click "Run Check" → `spawnMonitor()` (`:40-43, :201-214`) |
| 8 | App→App | POST `/api/qa/spawn-monitor/:code`; **no response check; on success or failure alike, only refreshes summary/flags after a fixed 2s delay — no success/failure message either way** (`:204-213`) |
| 9 | User→App | Click "Fix Issues" → `spawnFixer()`, disabled while `total===0` (`:44-47, :216-230`) |
| 10 | App→App | POST `/api/qa/spawn-fixer/:code`; **same pattern — no App→User confirmation of start success/failure**, refreshes after 5s regardless (`:219-229`) |
| 11 | User→App | Click "Polish" (Opus polisher) → `spawnPolisher()` (`:48-51, :232-246`) |
| 12 | App→App | POST `/api/qa/spawn-polisher/:code`; same no-confirmation pattern, refreshes after 10s (`:235-245`) |
| 13 | User→App | Click "Dismiss" on a flag → `dismissFlag(flag)` (`:108, :248-260`) |
| 14 | App→App | PATCH `/api/qa/flag/:id` `{status:'false_positive'}`; **response `.ok` is never checked** — the flag is removed from the local `flags` array unconditionally inside the `try`, so a server-side rejection (e.g. 500) still reports success to the user (`:250-258`) |
| 15 | User→App | Click "Delete" on a flag → `confirm()` then `deletePhrase(flag)` (`:109, :262-274`) |
| 16 | App→App | DELETE `/api/qa/phrase/:id`; **same unchecked-response bug — the phrase is removed from the visible list even if the delete failed server-side** (`:267-273`) |

### Findings
- **[Class 2 — UNVALIDATED, most severe finding on this screen]** `dismissFlag()` and `deletePhrase()` (`PhraseQA.vue:248-260, 262-274`): neither checks `response.ok` before optimistically filtering the flag out of the local `flags` array. A failed DELETE/PATCH (auth error, 500, phrase already gone) is reported to the user as a successful dismiss/delete — the row simply vanishes either way. This is a **false-success** bug, not just a missing message: the UI actively lies about the outcome. `deletePhrase` in particular is destructive (course content), making this the highest-severity finding in my whole batch.
- **[Class 3 — MISSING TWIN]** `spawnMonitor`/`spawnFixer`/`spawnPolisher` (`:201-246`): three background-job triggers with zero App→User acknowledgement of whether the spawn actually succeeded — button label flips back to idle after the `finally`, then a `setTimeout` blindly refreshes data regardless of whether the job started. If the spawn POST 500s, the user has no idea their "Fix Issues" click did nothing until they notice the flag count hasn't moved.

---

## Screen: User Feedback (`src/views/production/UserFeedback.vue`)
Route: `/production/:courseCode/feedback`

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→User | Header stats: Total / Unresolved / Resolved counts (`:22-36`) |
| 2 | App→User | Threshold selector (1+/2+/3+/5+/10+ flags), type filter (`:44-76`) |
| 3 | User→App | Change threshold or type filter → `loadIssues()` via `@change` (`:49, :65`) |
| 4 | User→App | Click "Refresh" → `loadIssues()` (`:79-89`) |
| 5 | App→User | Loading spinner (full-content and inline on Refresh button) (`:84-87, :96-101`) |
| 6 | App→User | Empty state: "No Issues Above Threshold" (`:104-112`) |
| 7 | App→User | Issue cards: flag-count badge, type badge, voice id, text/language, up to 3 comments (+N more), first/last-reported timestamps (`:120-181`) |
| 8 | App→App | `loadIssues()` fetches aggregated feedback; **on any failure (including thrown `!response.ok`), only `console.error` — no error banner or message anywhere in the template; the screen just silently stays on stale/empty data** (`:316-351`) |
| 9 | App→App | `loadStats()` — **same: total silence on failure**, header stats just stay at their previous (possibly stale/zero) values (`:354-373`) |
| 10 | User→App | Click play-icon on an issue → `playAudio(issue.audio_id)` (`:186-199, :376-394`) |
| 11 | App→App | Constructs a hardcoded S3 URL (`S3_AUDIO_BASE/{audioId}.mp3`) and plays it directly — **no existence check; a 404 audio file fails silently in the `<audio>` element with no App→User error state** (`:313, :387-388`) |
| 12 | User→App | Click resolve (checkmark) icon → `resolveIssue(issue)` opens modal (`:202-210, :397-401`) |
| 13 | App→User | Resolve modal: issue summary, optional resolution-note textarea, Cancel/Mark Resolved buttons (`:217-267`) |
| 14 | User→App | Click "Mark Resolved" → `confirmResolve()` (`:256-262, :409-442`) |
| 15 | App→App | POST `/feedback/resolve`; on `!response.ok` throws, caught by `catch`, **but the catch only `console.error`s — the modal stays open with `isResolving` reset to false and NO error message shown to the user; they have no idea why "Mark Resolved" appears to do nothing** (`:432, :437-439`) |

### Findings
- **[Class 3/4 — this entire screen has NO error UI at all]** Unlike `ScriptViewer.vue` (same suite) which has explicit `error-state` template blocks with Retry buttons, `UserFeedback.vue` has zero error-rendering paths anywhere in its template — every one of `loadIssues`, `loadStats`, and `confirmResolve` degrades to `console.error` only. A user resolving an issue that actually fails server-side sees the modal silently fail to close-on-success but also never learns why. This is the most consistent (not just occasional) instance of class-3 MISSING TWIN across my whole batch — worth flagging as a pattern, not a one-off.
- **[Class 5 — ORPHAN risk]** `playAudio()` builds its URL from a hardcoded `S3_AUDIO_BASE` constant (`:313`) rather than going through the courses's actual audio-serving path used elsewhere in the suite (e.g. `ScriptViewer`'s `/api/production/:c/audio/:id/url` signed-URL pattern, `SynthesisStudio.vue:316`). If the mastered-audio S3 layout or bucket ever changes, this screen breaks silently with no code path noticing.

---

## Screen: Team & voices (`src/views/production/TeamRoster.vue`)
Route: `/production/:courseCode/team`

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→User | Header: "Your team" + course code, "Invite a recorder" toggle button (`:3-13`) |
| 2 | App→User | Show `error` banner when set (`:15`) — **this screen is the exemplar: every mutating action sets/clears `error.value` explicitly** |
| 3 | User→App | Click "Invite a recorder" → toggle invite panel (`:10-12`) |
| 4 | User→App | Click "Create invite code" → `createInvite()` (`:24-26, :241-252`) |
| 5 | App→App | POST `/invite`; success populates `invite` (code, link, expiry); failure sets `error.value = err.message` — **correctly twinned** (`:246-248`) |
| 6 | App→User | Show invite code + record link + "Copy link + code" button + expiry note (`:28-43`) |
| 7 | User→App | Click "Copy link + code" → `copyInvite()`; falls back to `window.prompt` if clipboard API fails (`:37-39, :254-264`) |
| 8 | App→User | Display 2 voice slots: assigned person + unassign button, or "choose a team member" select + Assign button (`:54-80`) |
| 9 | User→App | Select team member + click "Assign" → `assign(email, slot)` (`:73-77, :199-211`) |
| 10 | App→App | POST `/assign-slot`; success reloads team; failure sets `error.value` — **correctly twinned** (`:203-207`) |
| 11 | User→App | Click "Unassign" → `unassign(email)` (`:60, :213-224`) — same correct twin pattern |
| 12 | App→User | Members table: name, email, role chip, voice-slot chip, recorded count, Remove button (`:90-120`) |
| 13 | User→App | Click "Remove" on a member → `confirm()` then `removeMember(m)` (`:112-116, :226-239`) — correct twin pattern, includes a clear confirm-dialog message about what removal does/doesn't do |
| 14 | App→App | `api()` helper (`:170-183`): attaches `Authorization: Bearer <token>` from `useAuth().getAccessToken()`, checks `resp.ok`, throws with server-provided error message on failure — **this is the one screen in my batch that authenticates its API calls and consistently propagates errors to the user** |

### Findings
- No findings — this screen is clean. Flagged here as the **positive baseline**: every mutating call goes through the same `api()` helper (`:170-183`) that checks `resp.ok` and surfaces `err.message` via the `error` ref, and it is the only one of my 8 screens (besides `ScriptViewer`) that authenticates via `useAuth`. Worth using as the reference pattern when any of the findings above get fixed.

---

## Screen: Script Viewer (`src/views/production/ScriptViewer.vue`) — 1964 lines
Route: `/production/:courseCode/script`

Not audited exhaustively (very large — `TextGeneration.vue` is the priority screen per the brief and is covered in `courses-b-textgen.md`; this repo's census had already crawled ScriptViewer). Spot-checked the header/search/pagination UI, the top-level loading/error states, and the phrase-edit + presentation-edit regeneration flows (the TTS-cost-triggering ones).

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→User | Search box (text/seed/LEGO), spinner while `journeySearching` (`:17-39, :837-851`) |
| 2 | App→User | Round/item counts in header, adapts to search-results mode (`:8-16`) |
| 3 | App→User | "Expand/collapse all", "As the learner hears it" / "Production view" toggle, "Missing audio only" filter (disabled in learner view, with title explaining why), "Export" button (`:44-103`) |
| 4 | App→User | Pagination controls + "Jump to round" input (`:105-159`) |
| 5 | App→User | Full-screen loading spinner (course data) with `loadingProgress` text (`:168-176`) |
| 6 | App→User | **Explicit error state** ("Error Loading Course") with Retry button calling `loadCourseData` (`:179-193`) — correct twin |
| 7 | App→User | Separate loading/error states for the learning-journey generation step, with its own Retry (`:198-223`) — correct twin |
| 8 | User→App | Click a phrase item → `onJourneyItemEdit(item)`; routes intro/component_intro items to presentation-edit instead, blocks edit entirely for `debut`-type (LEGO text) items (`:1641-1667`) |
| 9 | App→App | Save phrase edit → optimistic local text update, then **only if roles actually need regen** POST `/api/audio/regenerate-phrase/:course/:phraseId` (admin-only, TTS-cost endpoint per the code comment) (`:1560-1633`) |
| 10 | App→User | On regen failure, `setAuditionError(role, msg)` surfaces the error inline per-role in the edit modal — correct twin (`:1596-1601`) |
| 11 | User→App | Edit a presentation/intro clip → `onJourneyPresentationEdit` → `savePresentationAndRegen` (`:1683-1770`) |
| 12 | App→User | Presentation regen: `presentationError` ref shown on failure — correct twin (`:1765-1768`) |

### Findings
- No class 1-3 findings in the portions read — this screen consistently implements the error-state pattern (explicit `error`/`journeyError`/`presentationError`/audition-error refs, all rendered) that `SeedEditor`, `PhraseQA`, and `UserFeedback` are missing. Given its size (1964 lines), a full pass would need its own dedicated worker; flagging this as **NOT FULLY AUDITED** rather than claiming completeness.
- **[Class 5 — needs confirmation, not verified]** The comment at `:1582-1583` warns "a TEXT edit must use regenerate-PHRASE, never regenerate-single (which re-reads stale course_audio.text → audio/text desync)" — implies a sibling `regenerate-single` endpoint exists elsewhere in this file or a related component with a known desync footgun. Not traced further in this pass; worth a follow-up grep for any other call site still using `regenerate-single` for text edits.

---

## Summary (my 8 screens)

**Screens covered:** ProductionOverview, LeaderJourney, SynthesisStudio, SeedEditor, PhraseQA,
UserFeedback, TeamRoster (full audits); ScriptViewer (partial — header/loading/error states + the
two audio-regeneration flows only, given its size and that TextGeneration is the brief's priority
screen).

**Findings by class:**
- Class 2 (UNVALIDATED): 2 — `PhraseQA.dismissFlag`/`deletePhrase` (unchecked response, false-success on delete); `SeedEditor.saveEdit` (same pattern, corrupts local state too)
- Class 3 (MISSING TWIN): 11 — spread across ProductionOverview (2), LeaderJourney (1), SynthesisStudio (2), SeedEditor (2, distinct from the class-2 one), PhraseQA (1, the three spawn-* calls), UserFeedback (1, systemic across the whole screen), ScriptViewer (0 confirmed)
- Class 4 (UNSPECIFIED CONTENT): 0 new (screens with proper empty/loading states throughout)
- Class 5 (ORPHAN/unverified): 2 — UserFeedback's hardcoded S3 URL path; ScriptViewer's `regenerate-single` desync footgun (needs follow-up grep, not confirmed)

**Worst 3:**
1. **`PhraseQA.dismissFlag`/`deletePhrase`** (`PhraseQA.vue:248-274`) — DELETE/PATCH responses never checked; a failed delete of course content is displayed to the user as a successful delete. Destructive + silently wrong.
2. **`SeedEditor.saveEdit`** (`SeedEditor.vue:317-351`) — optimistic seed-text edit has no failure branch; a rejected save leaves the UI showing unsaved text as if it were saved, with no revert and no error.
3. **`SynthesisStudio.checkFirst`/`stitch`** (`SynthesisStudio.vue:247-254, 267-273`) — any non-409 failure on the TTS-cost stitch/dry-run actions is completely silent; the operator gets no feedback that their click did nothing.

**Positive baseline:** `TeamRoster.vue` and (for the paths spot-checked) `ScriptViewer.vue` both
consistently check `resp.ok`, surface `err.message` through a rendered error state, and (TeamRoster
only) authenticate via `useAuth`. Recommend using `TeamRoster.vue:170-183`'s `api()` helper as the
template when fixing the class-2/3 findings above.

---

<a id="part-2"></a>

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

---

<a id="part-3"></a>

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

---

<a id="part-4"></a>

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

---

<a id="consolidated-summary"></a>

## Consolidated summary — Courses B (all 4 sub-audits)

**Screens covered**: 9/9 Production Suite screens (8 full + ScriptViewer partial — 1964 lines,
header/loading/error states + the two audio-regen flows only), 5/5 Quality Review screens, 5/5
AudioPipeline-area files. TextGeneration.vue (1987 lines, the priority screen) fully audited.

**Findings by class (totals across all 4 sub-audits):**
- Class 1 (UNTYPED): 2
- Class 2 (UNVALIDATED): 7
- Class 3 (MISSING TWIN): 23
- Class 4 (UNSPECIFIED CONTENT): 8
- Class 5 (UNREACHABLE/ORPHAN): 10

**Cross-cutting pattern, confirmed independently by all 4 sub-audits**: silent failure. Fetch/POST
error handlers across nearly every screen in this area degrade to `console.error`/`console.warn`
only, leaving the UI indistinguishable from a legitimate empty or idle state. `TeamRoster.vue` and
`ScriptViewer.vue`'s audited paths are the only consistent counter-examples — both check
`response.ok` and surface `err.message` through a rendered error state. Recommend using
`TeamRoster.vue:170-183`'s `api()` helper as the template pattern when fixing.

**Auth-blindness, confirmed independently by 3 of 4 sub-audits**: `useAuth` is imported by only
`TeamRoster.vue` and `ScriptViewer.vue` across this entire area (9 Production Suite screens, 5
AudioPipeline-area files, 5 Quality Review screens, TextGeneration.vue — 20 files total). Most of
this is benign (the global router guard in `src/router/index.js:655-724` covers session/course-scope
for all non-public routes regardless of component-level checks — confirmed for the Quality Review
area specifically). But two instances are **not** benign:
- **TextGeneration.vue**: no component-level check on a screen that can create courses, wipe
  translations, mass-approve content, and kill/spawn agents.
- **AudioPipeline.vue's cost-incurring endpoints**: `/audio-pipeline/start`, `/gender-prep/start`
  and their cancel/retry siblings have **no server-side auth middleware at all** (confirmed by
  grepping `services/production-api.cjs` for `requireAuth|authenticate|verifyToken|checkAuth` — zero
  relevant hits), and the `pipeline` route itself carries no `meta.requiresAuth` unlike sibling
  routes (`/record`, `/users`) in the same router file. This is a direct hit against the CLAUDE.md
  approval-gate on TTS spend — anyone who can reach the API host directly can trigger real-money
  audio generation with no auth check anywhere in the chain.

### Worst 10 findings across the whole area, ranked

1. **[AudioPipeline B1]** Cost-incurring TTS endpoints (`/audio-pipeline/start`, `/gender-prep/start`,
   cancel/retry) have zero server-side auth — directly contradicts the CLAUDE.md TTS-spend approval
   gate. (`services/production-api.cjs:5522,5603,5619,9034`)
2. **[PhraseQA]** `dismissFlag()`/`deletePhrase()` never check the DELETE/PATCH response status —
   a failed delete of course content is displayed to the user as a successful delete. Destructive +
   silently wrong. (`PhraseQA.vue:248-274`)
3. **[LearnedRulesView]** The one Quality Review screen built correctly to spec (real fetch,
   loading/error/empty states) calls a backend route that doesn't exist anywhere in `services/` —
   confirmed by exhaustive grep. Its success path is unreachable in this codebase.
   (`LearnedRulesView.vue:200`)
4. **[TextGeneration]** No auth/permission check anywhere in the file, despite it creating courses,
   wiping translations, mass-approving content, and killing/spawning agents. (whole file)
5. **[SeedEditor]** `saveEdit()`'s optimistic seed-text edit has no failure branch — a rejected save
   leaves the UI showing unsaved text as if saved, with no revert and no error. (`SeedEditor.vue:317-351`)
6. **[SynthesisStudio]** `checkFirst()`/`stitch()` (the TTS-cost stitch actions) are completely silent
   on any non-409 failure — the operator gets zero feedback that their click did nothing.
   (`SynthesisStudio.vue:247-254,267-273`)
7. **[Quality Review, 4 screens]** Dashboard, Seed Review, Prompt Evolution, and Health Report are
   100% fabricated client-side mock data with 8+ disabled buttons wired only to `alert()`
   placeholders standing in for accept/reject/re-run/export/promote/rollback workflows.
8. **[AudioPipeline A5]** A fully-built "Generation Plan" feature (~65 lines + a store call) is never
   invoked from any template element — dead code, with `PipelineProgress.vue`'s own placeholder text
   pointing at an action the user has no way to trigger. (`AudioPipeline.vue:895-915,466-532`)
9. **[Quality Review]** All 5 screens have zero nav entry point anywhere in the app —
   `CourseHealthReport` additionally has no inbound link even from its sibling quality screens.
10. **[UserFeedback]** The entire screen has no error-rendering path at all — `loadIssues`,
    `loadStats`, and `confirmResolve` all degrade to `console.error` only; a user resolving an issue
    that fails server-side sees the modal silently do nothing. (`UserFeedback.vue`, whole file)

**Positive baseline for future fixes**: `TeamRoster.vue` (`api()` helper, `:170-183`) and the audited
portions of `ScriptViewer.vue` are the reference pattern — check `resp.ok`, throw with the server's
own error message, surface it through a rendered `error` ref.
