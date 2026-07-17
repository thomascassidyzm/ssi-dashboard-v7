# Trinity Compliance Audit — Admin + Ops/Home screens

> **Scope**: `src/views/Home.vue`, `src/views/Admin.vue`, `src/views/admin/ConfigsIndex.vue`,
> `src/views/admin/SpeakingConfig.vue` (+ `algorithmConfigShared.js`), `src/views/Maintenance.vue`
> (+ `RecoveryPanel.vue`, `UptimePanel.vue`), `src/views/Insights.vue` (+ `ReleaseNotesTrigger.vue`),
> `src/views/BoardReports.vue`, `src/views/BoardReportDetail.vue`, `src/views/UserManagement.vue`.
> **Excluded**: `src/views/admin/PodLab.vue` (covered separately — not touched here).
> **Trinity**: App→User (output) | User→App (input) | App→App (processing). Format matches
> `ssi-learning-app/docs/schools-trinity-audit.md`.

Routes (from `src/router/index.js`): `/` → Home (54-56), `/admin` → Admin (75-78),
`/admin/configs` → ConfigsIndex (443-447), `/admin/configs/speaking` → SpeakingConfig (454-458),
`/maintenance` → Maintenance (96-99), `/insights` → Insights (101-105), `/admin/board` →
BoardReports (84-87), `/admin/board/:slug` → BoardReportDetail (90-93), `/users` → UserManagement
(349-354, only route in this set with `meta: { requiresAuth: true }`).

**Router-guard note (applies to every screen below except `/users`)**: the global `beforeEach`
guard (`src/router/index.js:655-724`) only checks `isAuthenticated` — none of `/admin`,
`/admin/configs`, `/admin/configs/speaking`, `/maintenance`, `/insights`, `/admin/board*` carry
`requiresAdmin`/role-gate meta, and none of the components themselves call `isAdmin` before
rendering (confirmed by `grep -n isAdmin` across all of them except SpeakingConfig — zero hits).
Any authenticated user (including a `recorder`, though recorders are bounced to `/record` first by
the guard at line 676) can navigate straight to these URLs. Enforcement is server-side only
(RLS / `requireAdmin` on the API routes, per `ConfigsIndex.vue:61-63` and
`useInsightDiscovery.js:6-10` comments) — this is a deliberate, documented pattern for
SpeakingConfig, but Maintenance/Insights/BoardReports carry no client-side "not admin" affordance
at all. See finding A1.

---

## Screen 1: Home (`src/views/Home.vue`) — route `/`

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→User | Display "Popty" title + subtitle (`Home.vue:13-14`) |
| 2 | App→User | Display Courses card with live course count badge (`:39`, `courseCount` computed from `useCourses()`) |
| 3 | App→User | Display Docs card (static "reference" badge) |
| 4 | App→User | Display Admin card (static "platform" badge) |
| 5 | User→App | Click Courses card |
| 6 | App→App | `router-link to="/courses"` — navigate |
| 7 | User→App | Click Docs card |
| 8 | App→App | `router-link to="/docs"` — navigate |
| 9 | User→App | Click Admin card |
| 10 | App→App | `router-link to="/admin"` — navigate |

**Notes**: purely static hub except the course-count badge. No loading/error state is shown while
`useCourses()` resolves or if it fails — the badge just renders `0` until (and unless) data
arrives (`Home.vue:122`). See finding A2.

---

## Screen 2: Admin hub (`src/views/Admin.vue`) — route `/admin`

| # | Direction | Message |
|---|-----------|---------|
| 11 | App→User | Display "Admin" title + subtitle (`Admin.vue:13-14`) |
| 12 | App→User | Display 6 platform cards: Configs, Insights, Activity, Maintenance, Users, Board Reports (`:64-125`) |
| 13 | User→App | Click a card |
| 14 | App→App | Navigate to card's `to` route (`/admin/configs`, `/insights`, `/jobs`, `/maintenance`, `/users`, `/admin/board`) |

**Notes**: fully static, data-driven from a literal array, no dynamic states at all. Comment at
`:61-63` documents the RLS-gated-writes design explicitly — this is the source of the "no client
gate" pattern audited above.

---

## Screen 3: Configs index (`src/views/admin/ConfigsIndex.vue`) — route `/admin/configs`

| # | Direction | Message |
|---|-----------|---------|
| 15 | App→User | Display breadcrumb Home / Admin / Configs (`:11-17`) |
| 16 | App→User | Display "Configs" title + subtitle (`:20-21`) |
| 17 | App→User | Display 3 cards: Listening, Speaking, Pod Lab (`:72-103`) |
| 18 | User→App | Click a card |
| 19 | App→App | Navigate to card's `to` route |
| 20 | User→App | Click a breadcrumb link |
| 21 | App→App | Navigate to `/` or `/admin` |

**Notes**: static, no findings beyond the cross-cutting A1.

---

## Screen 4: Speaking config (`src/views/admin/SpeakingConfig.vue`) — route `/admin/configs/speaking`

| # | Direction | Message |
|---|-----------|---------|
| 22 | App→User | Display breadcrumb Home / Configs / Speaking (`:4-10`) |
| 23 | App→User | Display title + subtitle explaining scope + propagation delay (`:13-19`) |
| 24 | App→User | Show "Signed in as X (not admin) — saves will fail" warning when `!isAdmin && currentUser` (`:22-24`) |
| 25 | App→User | Show "Loading…" while `loading` (`:27`) |
| 26 | App→User | Show "Failed to load: {loadError}" on load failure (`:28`) |
| 27 | App→User | Display Script shape row: spaced-rep offsets list + 4 numeric fields (`:32-56`) |
| 28 | User→App | Edit spaced-rep offsets (comma list) |
| 29 | App→App | Parse to number array, filter NaN (`algorithmConfigShared.js:149-151`) |
| 30 | User→App | Edit any NumField (max BUILD, USE consolidation, max spaced-rep, N-1 count) |
| 31 | App→App | Coerce to `Number`, fall back to raw string if NaN (`algorithmConfigShared.js:123-126`) — see finding A3 |
| 32 | User→App | Click row "Save" |
| 33 | App→App | PATCH `/api/algorithm-config` with `{key, config}` (`algorithmConfigShared.js:51-74`) |
| 34 | App→User | Button shows "Saving…" while in flight (`RowHeader`, `:186`) |
| 35 | App→User | On success: row replaced with server's `data.row`, "Last saved" meta updates (`:67-68`, `:189-192`) |
| 36 | App→User | On failure: "Save failed: {error}" shown under the row (`:194`) |
| 37 | User→App | Click row "Reset" (disabled unless dirty) |
| 38 | App→App | Restore draft from pristine server copy + re-run backfill (`:44-49`) |
| 39 | App→User | Display Turbo boost row: fib-offset toggle pills + BUILD/USE keep fields (`:59-89`) |
| 40 | User→App | Tap a fib-offset pill |
| 41 | App→App | `toggleFib(idx)` — add/remove from `fibKeep` set (`:273-280`) |
| 42 | App→User | Display Pause lab: mode switch (Normal/Turbo), "Load suggested" button, pause-reference selector, 8 knob sliders (`:92-137`) |
| 43 | User→App | Click Normal/Turbo mode switch |
| 44 | App→App | Swap `labMode`, re-point `labCfg` at that draft (`:288-290`) |
| 45 | User→App | Click "✨ Load suggested" |
| 46 | App→App | `Object.assign` a hardcoded `SUGGESTED` curve into the current mode's draft, unsaved (`:328-330`) |
| 47 | User→App | Click a pause-reference pill (avg / target1 / sum) |
| 48 | App→App | Set `labCfg.pause_reference` (`:118-120`) |
| 49 | User→App | Drag a knob slider |
| 50 | App→App | Set the corresponding numeric field on `labCfg` (`:130-135`) |
| 51 | App→User | Display live SVG curve (pause ms vs syllables) that redraws on every knob change (`:156-185`) |
| 52 | App→User | Display belt-pill selector (White/Yellow/Orange/Green) when not Turbo (`:143-148`) |
| 53 | User→App | Click a belt pill |
| 54 | App→App | Set `belt`, recompute `effectiveSpeed`/`beltTaper` (`:294-314`) |
| 55 | User→App | Edit "~ms/syllable" number input |
| 56 | App→App | Recompute the preview curve/bucket sentences off the new rate |
| 57 | App→User | Display "Hear it" section: CoursePicker + one sample per length bucket (`:189-219`) |
| 58 | User→App | Pick a course in CoursePicker |
| 59 | App→App | `onPreviewCourse` — query `course_seeds`/`course_audio` via Supabase directly (`:420-462`) |
| 60 | App→User | Show "Loading sentences…" while `sampleLoading` (`:198`) |
| 61 | App→User | Show `sampleError` message on failure (`:199`) |
| 62 | App→User | Show "No playable sentences found for this course" if query returns empty (`:217`) |
| 63 | App→User | Show "Pick a course to hear…" prompt before any course chosen (`:218`) |
| 64 | User→App | Click ▶ on a bucket row (disabled if no sentence in that bucket) |
| 65 | App→App | `playWithPause` — fetch signed audio URLs, play known → wait computed pause → target1 → target2 (`:533-555`) |
| 66 | App→User | Show phase pill (prompt / your-turn-speak / answer 1 / answer 2) while playing (`:193-195`) |
| 67 | User→App | Click "■ stop" |
| 68 | App→App | `stopPreview` — abort playback, clear phase (`:511-516`) |

**Notes**: this is the one screen in scope that fully implements the pattern the rest lack (finding
A1's "good" counter-example) — explicit non-admin warning banner (message 24) and a save-failure
twin (36) on every mutating action. The pause-preview subsystem (57-68) is a rich App→App
simulation but has no error twin for individual clip-fetch failures — `audioUrl()` swallows fetch
errors and returns `null` (`:494-508`), so a broken/expired signed URL just silently skips that
phase rather than surfacing "couldn't load audio". See finding A4.

---

## Screen 5: Maintenance (`src/views/Maintenance.vue`) — route `/maintenance`

### Backend recovery panel (`RecoveryPanel.vue`, rendered first)

| # | Direction | Message |
|---|-----------|---------|
| 69 | App→User | Display live health-check card: "Checking backend…" / "Backend is UP" / "Backend is DOWN" (`:16-19`) |
| 70 | App→User | Show target URL + "checked Xs/Xm ago" + error detail on down (`:21-24`) |
| 71 | App→App | Auto poll `/health` every 30s (`:147`) |
| 72 | User→App | Click "Re-check" |
| 73 | App→App | `checkHealth()` — fetch with 8s abort timeout (`:114-136`) |
| 74 | App→User | Numbered recovery steps (SSH, `pm2 restart all`, diagnose branch, physical-access fallback) with copy-to-clipboard command lines (`:33-64`) |
| 75 | User→App | Click "Copy" on a command line |
| 76 | App→App | `navigator.clipboard.writeText`, silently no-ops on failure (`:87-91`) |
| 77 | App→User | Show "Copied" label for 1.5s on success (`:95`) |
| 78 | App→User | Show notes list incl. Tailscale IP fallback, watchdog behaviour, link to off-machine Google Doc (`:66-73`) |

### Uptime & DB health panel (`UptimePanel.vue`)

| # | Direction | Message |
|---|-----------|---------|
| 79 | App→User | Show `uptimeError` banner on Better Stack fetch failure (`:13`) |
| 80 | App→User | Show "Loading uptime…" (`:15`) |
| 81 | App→User | Show "Better Stack not connected" setup CTA with exact env-var + monitor instructions when `!uptime.configured` (`:17-31`) |
| 82 | App→User | Display per-monitor status dot/name/status/last-checked/response-time rows (`:34-51`) |
| 83 | App→User | Show "No monitors found" empty state (`:48-50`) |
| 84 | App→User | Display 24h availability bars + incident counts per monitor (`:53-72`) |
| 85 | App→User | Display recent-incidents table, or "Nothing in the last 24 hours. Good." empty state (`:74-97`) |
| 86 | App→User | Show `dbError` banner on Supabase metrics fetch failure (`:108`) |
| 87 | App→User | Show "Loading DB metrics…" (`:110`) |
| 88 | App→User | Display 8 metric cards (cache hit rate, pool util, replication lag, deadlocks, conflicts, tx committed/rolled-back, DB size) with colour-classed thresholds (`:112-158`) |
| 89 | App→User | Show scrape metadata + "missing: {fields}" note if the Prometheus scrape was partial (`:159-164`) |
| 90 | App→App | Auto-refresh both panels every 60s (`:240`) |

### Content audit log

| # | Direction | Message |
|---|-----------|---------|
| 91 | App→User | Display section title + blurb explaining what the audit log is for (`Maintenance.vue:8-16`) |
| 92 | App→User | Show `loadError` banner (`:18`) |
| 93 | App→User | Display 3 stat cards: rows in log, oldest entry, days-since-oldest with "cleanup overdue" tag when `isStale` (>30d) (`:20-36`) |
| 94 | App→User | Show "Loading stats…" (`:38`) |
| 95 | User→App | Edit "Keep last N days" number input (min 1, max 365) — **HTML-attribute-only bound, not enforced in JS** (see finding A5) |
| 96 | User→App | Click "Delete entries older than N days" (disabled while cleaning or `stats.total_rows === 0`) |
| 97 | App→App | `confirmCleanup()` opens confirm modal (`:501-503`) |
| 98 | App→User | Modal: "Delete every audit row older than N days? This drops your rollback runway…" (`:368-381`) |
| 99 | User→App | Click "Yes, delete" in modal |
| 100 | App→App | POST `/api/admin/audit-cleanup` with `{days}` (`:505-523`) |
| 101 | App→User | "Deleted N rows older than X days" result line, with "More remaining — click again" note (`:61-65`) |
| 102 | App→User | On failure: `loadError` = "Cleanup failed: {msg}" (`:519`) |
| 103 | App→User | Static note explaining the nightly auto-prune / archive relationship (`:67-73`) |
| 104 | User→App | Edit "Hot window" / "Scan back" day inputs |
| 105 | User→App | Click "Preview (dry run)" |
| 106 | App→App | POST `/api/admin/audit-archive` with `execute:false, prune:false` (`:536-560`) |
| 107 | User→App | Click "Archive + Prune now" |
| 108 | App→App | `confirmArchivePrune()` → native `window.confirm(...)` with explicit "uploaded and verified BEFORE deletion" language (`:525-533`) |
| 109 | App→App | On confirm: POST same endpoint with `execute:true, prune:true` |
| 110 | App→User | Display raw archive-tool stdout in a `<pre>` block (`:100`), with a "hit the 110s cap… click again" note appended on timeout (`:553`) |
| 111 | App→User | On failure: `loadError` = "Archive failed: {msg}" (`:556`) |

### Recent changes feed

| # | Direction | Message |
|---|-----------|---------|
| 112 | App→User | Display table filter/search bar (table dropdown, op dropdown, time-window dropdown, free-text search) (`:109-157`) |
| 113 | User→App | Change any filter or press Enter/click "Search" |
| 114 | App→App | `resetAndLoad()` → reset offset, refetch `/api/admin/audit-events` with querystring (`:608-612`, `:584-606`) |
| 115 | App→User | Show `eventsError` banner (`:167`) |
| 116 | App→User | Show "Loading events…" (`:169`) |
| 117 | App→User | Show "No events match these filters." empty state (`:171`) |
| 118 | App→User | Display events table (time, table, op tag, primary key, actor, expand chevron) (`:173-245`) |
| 119 | User→App | Click a row |
| 120 | App→App | `toggleExpand(id)` — fetch `/api/admin/audit-row` for that PK if not cached (`:626-650`) |
| 121 | App→User | Show "Loading current row…" while fetching (`:215-217`) |
| 122 | App→User | Show "Couldn't fetch current row: {msg}" on failure (`:218-220`) |
| 123 | App→User | Show side-by-side diff (captured vs current), with a "deleted" tag when current row is null, changed fields highlighted (`:221-240`) |
| 124 | User→App | Click a row's checkbox |
| 125 | App→App | `toggleSelect(id)` — add/remove from `selectedIds` Set (`:700-704`) |
| 126 | User→App | Click header checkbox (select/deselect all on page, indeterminate state supported) |
| 127 | App→App | `toggleSelectAllOnPage()` (`:706-714`) |
| 128 | App→User | Show selection bar "{N} selected" with bulk-restore + clear buttons once `selectedIds.size > 0` (`:159-165`) |
| 129 | User→App | Click "Restore N rows" |
| 130 | App→App | Open restore-confirm modal (`showRestoreConfirm = true`) |
| 131 | App→User | Modal: "Restore N rows to their captured state… itself captured in the audit log" + de-dup note (`:383-395`) |
| 132 | User→App | Click "Yes, restore" |
| 133 | App→App | POST `/api/admin/audit-restore` with `{event_ids}` (`:716-737`) |
| 134 | App→User | Modal shows restored/skipped/failed breakdown with per-row failure reasons (`:396-411`) |
| 135 | App→User | On total network/exception failure: synthetic single failed-entry shown (`:733`) |
| 136 | User→App | Click "Close"/"Cancel" on restore modal |
| 137 | App→App | `closeRestoreModal()` — clears `restoreResult` (`:739-742`) |
| 138 | User→App | Click Prev/Next pagination buttons (disabled at bounds) |
| 139 | App→App | `prevPage`/`nextPage` — shift offset, refetch (`:614-624`) |
| 140 | App→User | Show "{start}–{end} of {total}" pagination label (`:253-256`) |

### Phrase decomposition

| # | Direction | Message |
|---|-----------|---------|
| 141 | App→User | Display section title + blurb explaining staleness + link to spec doc (`:264-274`) |
| 142 | App→User | Course `<select>` populated from `/api/courses` (`:276-284`, `:760-771`) |
| 143 | User→App | Select a course |
| 144 | App→App | `loadDecompAudit()` — GET `/api/admin/decomposition-audit/:code` (`:773-788`) |
| 145 | App→User | Show `decompAuditError` banner (`:295`) |
| 146 | App→User | Display 4 stat cards: total, never-computed, stale, clean (stale-styled when >0) (`:297-314`) |
| 147 | User→App | Click "Refresh audit" |
| 148 | App→App | Re-run `loadDecompAudit()` |
| 149 | User→App | Click "Dry-run (20 phrases)" |
| 150 | App→App | POST `/api/admin/decomposition-backfill` with `dryRun:true, limit:20` (`:790-815`) |
| 151 | App→User | Result line: "Dry-run: processed N, would update N, failed N. Sample of N shown below." (`:806-808`) |
| 152 | App→User | On failure: "Dry-run failed: {msg}" (`:810`) |
| 153 | App→User | Display block-by-block decomposition preview per sampled phrase, ghost blocks visually distinct (`:335-356`) |
| 154 | App→User | Display "First failures (N)" list with per-phrase reason (`:358-365`) |
| 155 | User→App | Click "Backfill" (disabled if nothing stale/null) |
| 156 | App→App | Loop POSTing `/api/admin/decomposition-backfill` with `dryRun:false, limit:500` until `more_remaining` is false, capped at 200 iterations (`:817-865`) |
| 157 | App→User | Button label shows live "Backfilling… X/Y" progress (`:329`) |
| 158 | App→User | On safety-cap hit: "Stopped after 200 batches — refresh audit and re-run if needed." (`:837`) |
| 159 | App→User | On completion: "Backfill done: processed N, updated N, failed N." + audit auto-refreshes (`:855-858`) |
| 160 | App→User | On failure: "Backfill failed: {msg} (processed N so far)" (`:860`) |

**Notes**: this is the most thorough screen in scope — every destructive action (cleanup, archive+prune,
restore) has both a confirm-gate and a result/error twin, matching the CLAUDE.md "approval gates"
spirit even without a client isAdmin check. See findings A1, A5, A6.

---

## Screen 6: Insights (`src/views/Insights.vue`) — route `/insights`

| # | Direction | Message |
|---|-----------|---------|
| 161 | App→User | Display title + subtitle explaining what the deep-run is, where it runs, and where else it surfaces (`:5-9`) |
| 162 | User→App | Click "Run discovery" |
| 163 | App→App | `trigger(false)` — POST `/api/insight-discovery/run` `{demo:false}` (`useInsightDiscovery.js:38-62`) |
| 164 | App→User | Button label flips to "Running deep-run…", disabled while `running` (`:13-15`) |
| 165 | User→App | Click "Demo run" (title-tipped "Synthetic populated run for presentations") |
| 166 | App→App | `trigger(true)` — same endpoint, `{demo:true}` |
| 167 | User→App | Click "Refresh" |
| 168 | App→App | `fetchLatest('real')` — GET `/api/insight-discovery/latest?source=real` |
| 169 | App→User | Status line: "Started (real/demo). Refreshing as it lands…" on trigger success (`:75`) |
| 170 | App→User | Status line: "Failed: {msg}" on trigger failure (`:79`) |
| 171 | App→App | Fire 4 delayed `fetchLatest` polls at 30/60/90/120s after trigger (`:77`) — no completion/failure signal after the last poll (see finding A7) |
| 172 | App→User | Meta line: "What Claude surfaced · {relTime} · N findings · {source} · {window}d window" once `latest` exists (`:32-35`) |
| 173 | App→User | Show "Loading…" while `loadingLatest && !latest` (`:38`) |
| 174 | App→User | Show "No discovery run yet — hit Run discovery (takes ~1–2 min)." empty state (`:39`) |
| 175 | App→User | Display each finding as a toned card: badge, title, story, optional annotate line, optional tiered actions, tag line (frame/metric/widget) (`:40-53`) |
| 176 | App→User | Display "App release notes" sub-panel with explanation of what it reads/writes (`:23-30`) |
| 177 | User→App | Click "Generate release notes" (`ReleaseNotesTrigger.vue:4-6`) |
| 178 | App→App | `generate()` (via `useReleaseNotesGen`) |
| 179 | App→User | Button label "Generating…" while in flight |
| 180 | App→User | Status: "Draft ready (N changes in main..staging). Review, edit, then Publish." (`:64`) |
| 181 | App→User | Status: "Failed: {msg}" (`:66`) |
| 182 | App→User | Display editable draft: version/commit-count meta, Headline input, Bullets textarea, pre-seeded from generated draft (`:24-33`, `:52-58`) |
| 183 | User→App | Edit headline/bullets |
| 184 | User→App | Click "Publish" (disabled until a draft exists or while generating/publishing) |
| 185 | App→App | `publish({id, headline, bullets})` — bullets split on newline, trimmed, empties filtered (`:73`) |
| 186 | App→User | Status: "Published — live for learners." (`:76`) |
| 187 | App→User | Status: "Failed: {msg}" (`:78`) |
| 188 | App→User | Show "Published — live for learners. View in the app →" permalink once `published` (`:35-38`) |

**Notes**: `trigger()` costs a real Claude-subscription run on the SSi Machine (per the composable's
own docstring, `useInsightDiscovery.js:6-10`) and there is no client-side confirm/warning before
either "Run discovery" or "Demo run" — compare to the CLAUDE.md approval-gate norm for anything
cost-incurring. Backend is `requireAdmin`-gated per the same docstring, so this is a UX gap, not a
security hole. See finding A7 for the dangling poll-completion gap.

---

## Screen 7: Board reports (`src/views/BoardReports.vue`) — route `/admin/board`

| # | Direction | Message |
|---|-----------|---------|
| 189 | App→User | Display "← Admin" back link (`:12`) |
| 190 | App→User | Display "Board reports" title + subtitle (`:13-14`) |
| 191 | App→User | Display one card per entry in the static `boardReports` list, title + period (`:26-48`) |
| 192 | User→App | Click a report card |
| 193 | App→App | Navigate to `/admin/board/:slug` |
| 194 | User→App | Click "← Admin" |
| 195 | App→App | Navigate to `/admin` |

**Notes**: fully static, data-driven from `content/board-reports.js`; if that list is ever empty
there is no empty-state message (finding A8, low severity — content-authored list, unlikely to be
empty in practice).

---

## Screen 8: Board report detail (`src/views/BoardReportDetail.vue`) — route `/admin/board/:slug`

| # | Direction | Message |
|---|-----------|---------|
| 196 | App→User | Display "← Board reports" back link (`:4`) |
| 197 | App→User | Show "No board report found for \"{slug}\"." if `slug` doesn't match any entry (`:8`) |
| 198 | App→App | `report.loader()` — dynamic-imports the report's HTML module (`:31-33`) |
| 199 | App→User | Render the report inside a sandboxed `<iframe srcdoc>` (`sandbox="allow-popups allow-top-navigation-by-user-activation"`) (`:9-15`) |
| 200 | User→App | Click "← Board reports" |
| 201 | App→App | Navigate to `/admin/board` |

**Notes**: the `watchEffect` at `:30-34` has no try/catch around `report.loader()` — if the dynamic
import rejects (missing/broken report module), `html` stays `''`, the iframe renders blank with
**no error message at all**. This is a genuine silent failure. See finding A9.

---

## Screen 9: User Management (`src/views/UserManagement.vue`) — route `/users`

*Renders one of two modes off `isAdmin`: full admin console, or a reduced "Add Editor" form for
non-admin editors.*

| # | Direction | Message |
|---|-----------|---------|
| 202 | App→User | Display "← Back to Dashboard" link (`:6-8`) |
| 203 | App→User | Display header: "User Management"/"Add Editor" title + matching subtitle, by `isAdmin` (`:9-10`) |
| 204 | App→User | Display Email/Name inputs (`:20-35`) |
| 205 | User→App | Type email |
| 206 | User→App | Type name |
| 207 | App→User | Admin only: Role `<select>` (Editor / Admin) (`:40-46`) |
| 208 | App→User | Non-admin: static "Adding as Editor" note (`:49`) |
| 209 | User→App | Select role (admin only) |
| 210 | App→User | When role=admin: "All courses" pill + "Admins have access to every course." note — no picker shown (`:53-59`) |
| 211 | App→User | When role=editor: course chips for each selected course + CourseSearchPicker (`:60-80`) |
| 212 | User→App | Type in course search |
| 213 | App→App | Filter `available` list by display name or code, case-insensitive (`:292-298`) |
| 214 | User→App | Click "Select All"/"Deselect All" in picker |
| 215 | App→App | `toggleAllCourses(newUser)` (`:427-434`) |
| 216 | User→App | Click a course in the dropdown |
| 217 | App→App | `toggle` emit → `toggleCourse(newUser.courses, code)` (`:418-425`) |
| 218 | User→App | Click × on a selected course chip |
| 219 | App→App | Same `toggleCourse` — removes it |
| 220 | User→App | Click "Add User"/"Add Editor" (disabled unless `canInvite`: email set AND (role=admin OR ≥1 course)) |
| 221 | App→App | POST `/api/auth/invite` with the new-user payload (`:436-477`) |
| 222 | App→User | Button label "Adding..." while `inviting` (`:88`) |
| 223 | App→User | On success: "Added {email} — they can now log in", form resets, user list reloads (`:459-470`) |
| 224 | App→User | On failure: red error text `{inviteError}` (`:91`, `:472-473`) |
| 225 | App→User | Admin only: "Existing Users" list header + "↻ Refresh" (`:97-107`) |
| 226 | User→App | Click "↻ Refresh" |
| 227 | App→App | `loadUsers()` — GET `/api/auth/users` (`:479-496`) |
| 228 | App→User | "No users found" empty state (`:109-111`) |
| 229 | App→User | Per-user row: name/email, role badge, course-access pills ("All courses" or per-course chips) (`:113-153`) |
| 230 | User→App | Click a user row (view mode) |
| 231 | App→App | `startEdit(user)` — seed `editForm` from the row, switch to edit mode (`:498-505`) |
| 232 | User→App | Click "Edit" button on a row |
| 233 | App→App | Same `startEdit(user)` |
| 234 | User→App | Click "Remove" on a row (only rendered if not the last remaining admin — `:163`) |
| 235 | App→App | `deleteUser(email)` — native `confirm()` then DELETE `/api/auth/users?email=...` (`:544-562`) |
| 236 | App→User | On success: list reloads (`:557`) |
| 237 | App→User | **On failure: nothing shown to the user** — only `console.error` (`:559-560`). See finding A10. |
| 238 | User→App | In edit mode: change Role select |
| 239 | App→User | Switching to admin collapses course picker to the "All courses" pill+note (`:205-211`), mirroring the create form |
| 240 | User→App | In edit mode: toggle/search/select-all courses (same CourseSearchPicker, `size="sm"`) |
| 241 | User→App | Click "Save" in edit mode |
| 242 | App→App | PUT `/api/auth/invite` with `{email, role, courses}` (`:512-542`) |
| 243 | App→User | Button "Saving..." while `saving` (`:183`) |
| 244 | App→User | On success: edit mode closes, list reloads (`:535-536`) |
| 245 | App→User | On failure: red error text `{editError}` under the form (`:235`, `:538`) |
| 246 | User→App | Click "Cancel" in edit mode |
| 247 | App→App | `cancelEdit()` — discard edit state (`:507-510`) |

**Notes**: `onMounted` calls `loadUsers()` unconditionally regardless of `isAdmin` (`:572-575`) —
for a non-admin the request presumably 403s and is swallowed by `console.error` (`:491-493`), which
is harmless only because the "Existing Users" section is `v-if="isAdmin"` and never renders
anyway; still an untyped side-effect worth trimming. Bigger issue is finding A10 below —
delete-user is the one destructive action on this screen with **no failure twin at all**, unlike
every other mutation on this same page (invite, edit-save) which both have visible error text.

---

## Findings — classed 1–5

**Class key**: 1 UNTYPED · 2 UNVALIDATED · 3 MISSING TWIN · 4 UNSPECIFIED CONTENT · 5 UNREACHABLE/ORPHAN

### A10 — MISSING TWIN — `UserManagement.vue` delete-user failure is silent (Class 3)
`deleteUser()` (`src/views/UserManagement.vue:544-562`) only reloads the list on `response.ok`; on
a non-ok response or thrown exception it falls to `console.error('Failed to delete user:', err)`
(`:559-560`) with **no UI element updated** — no error banner, no toast, nothing. Every other
mutation on the exact same screen (invite at `:472-474`, edit-save at `:537-539`) sets a visible
`inviteError`/`editError` ref on failure. An admin clicking "Remove" on a user, confirming the
native dialog, and having the DELETE silently 500 gets zero feedback — the row just doesn't
disappear, with no explanation why.

### A9 — MISSING TWIN — `BoardReportDetail.vue` blank iframe on load failure (Class 3)
`watchEffect` (`src/views/BoardReportDetail.vue:30-34`) awaits `report.loader()` with no
try/catch. If the dynamically-imported report module throws or 404s, `html.value` never gets set,
the `<iframe :srcdoc="html">` renders with an empty string, and the user sees a blank page with no
"failed to load" message — worse than the already-handled "No board report found" case for an
unknown slug (`:8`), which does have proper content.

### A7 — UNSPECIFIED CONTENT — Insights discovery run has no completion/failure signal after polling ends (Class 4)
`run()` (`src/views/Insights.vue:71-81`) sets a one-time status string ("Started… Refreshing as it
lands…") and schedules `fetchLatest` at 30/60/90/120s (`useInsightDiscovery.js` via `:77`). If the
~1-2 min deep-run is still running, fails server-side, or produces zero new findings after the
last (120s) poll, the user is left on the stale "Started…" status forever — there is no defined
content for "the run appears to have failed or is taking longer than expected." The only signal a
user gets is that the findings feed silently does or doesn't change.

### A5 — UNVALIDATED — `Maintenance.vue` "Keep last N days" input has no JS-side bound enforcement (Class 2)
The `<input type="number" min="1" max="365">` (`Maintenance.vue:43-49`) relies entirely on native
HTML min/max, which browsers do not enforce on programmatic/typed values consistently (e.g. typing
`0` or a negative number is accepted by most browsers into `v-model.number`, since HTML5 number
`min`/`max` only affect the spinner buttons and validity styling, not the bound value). `keepDays`
is sent straight to `POST /api/admin/audit-cleanup` (`:510-513`) with no client-side clamp — a
mistyped `-5` or `99999` reaches the server as-is. Same pattern for `archiveHotDays`/`archiveMaxDays`
(`:85-92`, `:544-548`). Not a security hole (server should validate), but it is a genuinely
unvalidated User→App input on a destructive, irreversible-adjacent action.

### A4 — MISSING TWIN — `SpeakingConfig.vue` pause-lab audio fetch fails silently (Class 3)
`audioUrl(id)` (`src/views/admin/SpeakingConfig.vue:494-508`) catches all fetch errors and returns
`null`; `playClip()` then just `resolve()`s immediately with no sound and no message
(`:517-528`). During `playWithPause()` (`:533-555`) a failed clip fetch (expired signed URL,
network blip) makes the preview silently skip a phase — the phase pill still advances
("▶ answer 1" etc.) as if it played, giving no indication that nothing was actually heard.

### A3 — UNSPECIFIED CONTENT — `NumField` silently accepts non-numeric input as a raw string (Class 4)
`algorithmConfigShared.js:123-126`: on non-numeric input, `NumField` emits the raw string
unchanged rather than rejecting it or showing an inline error. That string then flows straight
into `drafts[key]` and would be PATCHed to the server as-is if saved (no client-side type guard
before `save()` in `algorithmConfigShared.js:51-74`). No message tells the admin the value wasn't
understood as a number.

### A1 — Cross-cutting — no client-side admin gate on Maintenance / Insights / Board Reports / Configs (informational)
Documented above ("Router-guard note"). `SpeakingConfig.vue` is the one screen in scope that
implements the "not admin — saves will fail" pattern (`:22-24`); `Maintenance.vue`, `Insights.vue`,
`BoardReports.vue`/`BoardReportDetail.vue`, `Admin.vue`, `ConfigsIndex.vue` have zero `isAdmin`
references. This isn't classed as a hard defect (server-side `requireAdmin`/RLS is confirmed by
code comments to back every mutating call, and every destructive action on Maintenance does have a
failure twin — see A5/A10 for the two gaps that do exist), but it's an inconsistency worth a
founder ruling: should the SpeakingConfig warning-banner pattern be applied to the other
admin-only surfaces too?

### A2 — UNSPECIFIED CONTENT — `Home.vue` course-count badge has no loading/error state (Class 4, low severity)
`courseCount` (`Home.vue:122`) computes off `useCourses()`'s `courses` ref, which starts empty and
fills asynchronously. Before it resolves (or if the fetch fails) the badge just reads "0 courses"
indistinguishably from a genuinely empty course list — no loading skeleton, no error state.

### A8 — UNREACHABLE-adjacent — `BoardReports.vue` has no empty-state message (Class 5, informational)
If `content/board-reports.js`'s `boardReports` array is ever empty, the grid renders zero cards
with no "no reports yet" message — low severity since the list is hand-authored, not
runtime-driven, but noted for completeness per the audit brief.

---

## Summary

| Metric | Count |
|---|---|
| Screens covered | 9 (+ 3 shared components: RecoveryPanel, UptimePanel, ReleaseNotesTrigger, plus the `algorithmConfigShared.js` composable) |
| Trinity messages catalogued | 247 |
| Findings | 10 (A1–A10) |
| Class 1 UNTYPED | 0 (the UserManagement unconditional `loadUsers()` call is noted inline as a minor untyped side-effect but not raised to a numbered finding — harmless, gated by `v-if="isAdmin"` downstream) |
| Class 2 UNVALIDATED | 1 (A5) |
| Class 3 MISSING TWIN | 3 (A4, A9, A10) |
| Class 4 UNSPECIFIED CONTENT | 3 (A2, A3, A7) |
| Class 5 UNREACHABLE/ORPHAN | 1 (A8, informational) |
| Cross-cutting / informational | 1 (A1) |

**Worst 3 findings** (by real-world blast radius):
1. **A10** — Deleting a user can fail with zero feedback; an admin has no way to tell a delete
   didn't happen short of noticing the row is still there.
2. **A9** — A broken board report renders as a blank page with no error — for a monthly report an
   admin/board member is specifically going to read, that's a bad silent failure.
3. **A7** — The Insights "Run discovery" flow (which costs a real Claude-subscription run) has no
   defined end state — a user can't tell "still running" from "failed" from "found nothing new"
   once the 4 scheduled polls are exhausted.
