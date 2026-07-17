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
