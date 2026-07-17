# Trinity Campaign — Cross-App Defect Ledger

> **Date**: 2026-07-17, morning triage artefact.
> **Sources**: 10 audit docs from tonight's campaign — 6 in this repo (`docs/trinity/*.md` @ main: admin-ops-home, podlab, pods-runtime, docs-area, courses-a, courses-b) and 4 in ssi-learning-app (`docs/trinity/*.md` @ dev: account-settings, admin, offline-pwa, schools-tutor).
> **Totals**: ~247 findings across ~50 screens/states in two apps. By class (approx, summing each doc's own count): MISSING TWIN ~80 · UNSPECIFIED CONTENT ~64 · UNREACHABLE/ORPHAN ~45 · UNVALIDATED ~40 · UNTYPED ~18.
> **Verified vs Reported**: ~30 items below are VERIFIED; the rest are REPORTED (see §2 for what those words mean here).

---

## 1. The systemic patterns (fix the class, not the instance)

Six patterns account for the overwhelming majority of the 247. Each has a known fix template. Sweeping a pattern with one shared helper is cheaper than 80 point-fixes.

### 1.1 SILENT FAILURE — App→App error degrades to `console.error`, no App→User twin (~80 instances, both apps)

The dominant defect class, confirmed independently by all ten audits. A fetch/POST fails; the button reverts to idle; the user cannot distinguish "failed" from "empty" from "slow".

**Fix template**: `TeamRoster.vue`'s `api()` helper (this repo, `src/views/production/TeamRoster.vue:170-183`) — attaches auth, checks `resp.ok`, throws the server's message, surfaced via one rendered `error` ref. The learning-app equivalents are `SchoolsView.vue:242-245` (read side) and the offline-lease overlay (State 8 of the offline audit) — every transition twinned.

Worst concentrations (file:line in the source audits):
- **Whole screens with zero error UI**: `UserFeedback.vue` (all of loadIssues/loadStats/confirmResolve), `CanonicalContent.vue` (all three fetches — a 404 leaves "Loading..." forever), `NetworkBuilder.vue` (addLego/reset).
- **Dashboard production suite**: SynthesisStudio `checkFirst`/`stitch`/`cancel` (`:247-273`), PhraseQA spawn-monitor/fixer/polisher (`:201-246`), ProductionOverview `runAudit`/status pills, SeedEditor `loadSeeds`/`approveSeeds`, TextGeneration `sendChat`/`checkComponentGaps`/`checkZutCollisions`/`selectSeed` (F-3/6/8), AudioPipeline `cancelGeneration`/`retryFailed`/`refreshAudioStats` (A2/A3/A4), MissingAudio orphan/ungeneratable fetches (A8), SharedAudio `playWelcome` (A9), VoiceConfiguration preview/test voice (A10), CourseManager `startPipeline` (`:961-969`), UserManagement `deleteUser` (`:559-560`), BoardReportDetail blank iframe (`:30-34`), PodDetailView `playAudio` (`:376-387`), PodLab `loadLiveConfig` (`:162-181` — tunes against a wrong baseline silently).
- **Learning app**: AdminUserDetail grant-entitlement (`:372-392`), AdminOnboarding active-toggle (`:149-167`), BoardReportView snapshot-revoke, `useSchoolContext` discarding `.single()` errors (`:340-396` — invalid ids render plausible empty orgs), read-fetch errors invisible on 4 of 6 core schools screens (Dashboard/Students/Teachers/Classes — the composables set `error`, only SchoolsView renders it), SettingsView profile-save + CSV export, kill-switch flow (below).

### 1.2 FALSE SUCCESS — the UI actively lies about the outcome (a worse sub-species, ~10 instances)

Not just missing feedback: local state is mutated as if the operation succeeded.
- `PhraseQA.dismissFlag`/`deletePhrase` (`PhraseQA.vue:248-274`) — row vanishes even when the server DELETE failed. Destructive on course content.
- `SeedEditor.saveEdit` (`SeedEditor.vue:317-351`) — optimistic edit applied before the call, no revert on `!resp.ok`; displayed seed text diverges from stored.
- `CourseManager.stopJob`/`forceKill` (`CourseManager.vue:1776,1784,1800`) — `jobStatus='idle'` set in the catch path; "stopped" shown while the job still runs.
- `TextGeneration.sendChat` (`:1708-1761`) — optimistic chat message stays "sent" after a failed POST.
- `AdminUsers`/`AdminAttention` (learning-app) — error banner and success-shaped content render simultaneously ("All 0 subscribers are active and healthy" on a fetch failure).
- `CourseCompilation` step 4 — four hardcoded ✓ checklist rows asserted, never re-verified.

**Fix template**: same `api()` helper plus the rule *mutate local state only after `resp.ok`* (or revert on failure). The take-drop fix landed tonight (`7bf83f05`) is the worked example.

### 1.3 NO-REACTIVE-AUTH-GATE — routes/endpoints outside the resolved-session gate

**Learning app**: largely CLOSED tonight by `c7e26b18` (`useAdminGate` — shared deny-not-defer + mid-session revalidation, applied to AdminSchoolsContainer, AdminGroupContainer, AdminClassDetail, AdminUserProgress; role-cache authoritative sync in `0cc28774`). Still open there: write-controls inside read-only admin views (§4 items 5–6 — a gate problem at the *control* level, not the route level), Release Notes writing direct-to-Supabase RLS-only (`AdminReleaseNotes.vue:70-161`), `EmpiricalBaselineView`'s population query with no server-side admin check (`usePopulationHours.ts:83-96`).

**Dashboard (this repo)**: the router guard checks only `isAuthenticated` — there is no `requiresAdmin`/role meta anywhere, and no course-scoping on `/validate`, `/edit/introductions`, `/network-builder`. Server-side was the real line of defence and two holes there were closed tonight (network-builder `9ecb0226`, TTS-spend `b7595925`). What remains is: `/validate` lets any authenticated user run phase reruns / basket regeneration on ANY course (courses-a); `/edit/introductions` lets any authenticated user rewrite introductions via an orchestrator PUT that validates neither the file path's payload shape nor course membership (`orchestrator.cjs:5445-5473`); `TextGeneration.vue` has zero component-level auth on a screen that creates courses, wipes translations, and mass-approves (F-1). Whether the dashboard adopts a client-side admin gate at all is a founder call (§5).

**Fix template**: learning-app — `useAdminGate` (now exists, `packages/player-vue/src/composables/useAdminGate.ts`). Dashboard — `requireAdmin`/`dashboard-auth.cjs` (`services/shared/dashboard-auth.cjs`, created tonight) on server routes; SpeakingConfig's "not admin — saves will fail" banner as the client pattern.

### 1.4 DEAD CONTROLS / ORPHANS — wired to nothing, or unreachable (~45 instances)

The two flavours: controls that exist but do nothing, and built features nothing can reach.
- **Dead controls**: Settings "Cancel" button, no `@click` at all (`SettingsView.vue:314`, open since the 07-13 audit); Quality Review's 8+ action buttons disabled and wired to `alert()` placeholders — but the keyboard shortcuts bypass `disabled` and fire them anyway; DocsIndex hardcoded stats.
- **Orphaned features**: `useOfflinePlay`'s entire 4-level degradation-message system — grep-verified zero call sites (the single worst finding in the offline area, see §4 item 9); `useActAs().actAs()` zero callers — God Mode/act-as does not exist in the live app; `handleExit`/`clearClassContext` on `/schools/play` unreachable (root cause of the identity-leak, §4 item 8); CourseEditor's whole Validation & Fix panel (`showValidationPanel` never set true) *and* its 5 handlers calling an unimported `getApiUrl` → guaranteed `ReferenceError` if ever wired; AudioPipeline `showPlan()` + ~65 lines of Generation Plan UI never invoked; TextGeneration `stopBuilder`/`forceResetBuilder`/`killAgent` unbound; `LearnedRulesView` calls a backend route that does not exist anywhere in `services/` (grep-verified); CourseManager's whole legacy Phases 1-3 mode; `POST /connect` in network-builder-api; CourseBrowser `highlightedCourses` never populated; all 5 `/quality/*` routes have no nav entry anywhere in the app.

**Fix template**: none needed — each is either "delete it" or "wire it"; that's a per-item founder/owner call on which. The audit docs list every instance.

### 1.5 UNSPECIFIED / FAKE CONTENT — states render, content is placeholder, stale, or fabricated (~64 instances)

- **Founder-facing placeholder text at scale**: 14 of 28 files in `docs/pods/` render "No description yet — add one to pod-thinking-meta.js" as their live description AND get silently badged "IN DISCUSSION" with no editorial decision behind it (docs-area audit — file list is in there).
- **Fabricated data presented as real**: all four non-live Quality Review screens (668 `Math.random()` seeds, hardcoded health scores, a trend chart that re-randomises per visit); `PipelineProgress.actualCost` hardcoded `'$0.00'`; Settings "Type" field the same literal string for every school; billing summary hardcodes £15/mo even for annual subscribers.
- **Hardcoded counts that drift**: DocsIndex "8 Documents" (renders 9), "668 seeds" badge (the sibling page computes it live precisely to avoid this).
- **Raw internals as user copy**: `alert(err.message)` throughout CourseCompilation/CourseValidator/IntroductionsViewer; Job IDs rendered "for debugging"; JSON.stringify dumps.

### 1.6 REVENUE-PATH GAPS — the money funnels have missing twins of their own (~8 instances, learning app)

Called out as a named pattern because they cluster and they're the highest £-severity items in §4: tutor-login 404 bounce, school past_due double-subscribe, checkout dead-page on validation failure, no post-payment confirmation, class oversell, delete-account not deleting the auth identity. The consumer/learner lane already handles most of these correctly — the fix template is *mirror the learner lane* (it polls for webhook activation lag; the tutor lane checks `past_due`).

---

## 2. VERIFIED vs REPORTED — read this before acting on anything

Tonight several audit claims **flipped false on contact with real code**: the CourseValidator "regenerate-baskets ships empty legoIds" finding was a non-bug (the server returns `baskets_missing` both as a top-level array and a nested count — both read paths are correct; re-verified against `orchestrator.cjs:2411-2415` during this synthesis); the TTS endpoints were partly already gated behind loopback checks before tonight's explicit fix; the VoiceConfiguration "orphan" suspicion was wrong (it's actively rendered by AudioPipeline).

So: **VERIFIED** below means at least one of — (a) confirmed by two independent audits, (b) an exhaustive mechanical check is recorded in the audit (e.g. grep-zero-call-sites), (c) matches a real reproduced incident, or (d) re-verified against HEAD during this synthesis. **REPORTED** means a single worker's code-reading claim with file:line citation — plausible, but nobody has independently re-checked it. **Do not treat REPORTED items as fact; spot-check before fixing, and expect a few more to flip.** The calibration from tonight's own sweeps: expect ~10-20% of REPORTED items to be non-bugs or already-mitigated.

---

## 3. ALREADY FIXED TONIGHT — do not re-surface these as open

| Fix | Commit | Closes |
|---|---|---|
| Network-builder API requires dashboard auth (+ new shared `dashboard-auth.cjs`) | `9ecb0226` (main) | courses-a worst-#1 (unauthenticated read/write/reset on all networks) |
| Explicit auth on TTS-spend endpoints, loopback-bypass closed | `b7595925` (main) | courses-b **B1** (unauthenticated real-money TTS: `/audio-pipeline/start`, `/gender-prep/start`, cancel/retry) |
| Silent take-drops surfaced immediately during recording | `7bf83f05` / merge `1e295079` (main) | pods-runtime worst-#2 (PodLongTakeStudio `blob<1200` silent drop) |
| `runLUTCheck` missing `response.ok` check | `155528ef` (main) | courses-a CourseValidator missing-twin; the sibling regenerate-baskets claim was verified a **non-bug** |
| Admin reactive auth gate: `useAdminGate` deny-not-defer + mid-session revalidation, applied to AdminSchoolsContainer / AdminGroupContainer / AdminClassDetail / AdminUserProgress; role-cache authoritative sync | merge `c7e26b18` (dev), incl. `76a215c3`, `7310eb94`, `0cc28774` | admin-audit critical items 1–4 (the resolved-session bug class: standalone-route cross-tenant leak, stale-cache window, mid-session downgrade never re-checked) |
| Zenjin campaign fixes | (per campaign brief) | noted closed by the founder's brief; not re-verified here |
| Take-drop / regenerate-baskets / TTS-gating / VoiceConfiguration-orphan audit claims re-tested | — | three flipped false or partial — the origin of §2's rule |

---

## 4. THE OPEN LEDGER — ranked by severity × confidence

Security / money / data-loss first, then correctness, then dead-code/cosmetic. Class per the campaign brief (1 UNTYPED · 2 UNVALIDATED · 3 MISSING TWIN · 4 UNSPECIFIED · 5 ORPHAN). App: **LA** = ssi-learning-app (dev), **DB** = this repo (main).

### Tier 1 — money, security, data loss

| # | App | Finding | Class | Status | File:line | Fix sketch |
|---|---|---|---|---|---|---|
| 1 | LA | **Tutor money-funnel entry broken**: first-time tutor signing in via `/teach` is silently bounced to `/tutors` on a 404 from `/api/teacher/me` — zero message, revenue funnel dead-ends | 3/4 | REPORTED | `TeachContainer.vue:163-166` | On 404, route into onboarding with an explanatory message instead of bouncing |
| 2 | LA | **School double-subscribe on past_due**: school lane's `isSubscribed` ignores `school_past_due` — declined card shows "Subscribe your school" again → second concurrent Paddle subscription. Tutor lane was hardened after a real double-bill incident; school lane wasn't | 3 | REPORTED (incident precedent on sibling lane) | `UpgradeView.vue:130-132` vs `api/school/subscription.ts:161-168` | Treat `past_due` as subscribed → route to portal, mirroring tutor lane |
| 3 | LA | **Class oversell**: capacity checked once at page load on `/with/:code`; Paddle webhook join branch has no server-side capacity re-check — concurrent joiners can exceed the 20-seat cap | 2 | REPORTED | `WithTeacher.vue:501-503`, `api/teacher/paddle-webhook.ts` | Capacity re-check inside the webhook join branch |
| 4 | LA | **Paid-but-looks-unpaid**: no success confirmation or webhook-lag handling after school/tutor checkout — an admin who just paid sees an unchanged "Subscribe" CTA and reasonably concludes payment failed. Plus: school-lane sets `checkoutOpen=true` *before* validation, so a validation failure leaves the page permanently dead without reload | 3/4 | REPORTED | `useSchoolCheckout.ts:108`, `UpgradeView.vue:181-187,344` | Mirror the learner lane's post-checkout polling; validate before flipping `checkoutOpen` |
| 5 | LA | **Cross-tenant write from read-only admin view**: ClassDetail's rename-class control is NOT gated by `isAdminView` (adjacent Remove-student is) — ssi_admin in a cross-tenant read view can rename another school's class. Same shape as 07-13 audit critical-#1, reintroduced | 4 | **VERIFIED** (two independent audits + re-checked at dev HEAD tonight, post-`c7e26b18`: still ungated) | `ClassDetail.vue:311-319` | `v-if="!isAdminView"` on the rename button, same as Remove |
| 6 | LA | **Cross-tenant create from read-only view**: govt-group read-view's "Create school" + two first-run save-name controls not gated by `isAdminView` — live `POST /api/govt/create-school` from a supposedly read-only view | 2 | **VERIFIED** (re-checked at dev HEAD: "+ Add school" still ungated) | `SchoolsView.vue:235`, `DashboardView.vue:562,587,611` | Same `isAdminView` gating as every other write control in those views |
| 7 | DB | **`/validate` unscoped**: bare route is not course-scoped and does no client filtering — any authenticated non-recorder can view AND act on any course: phase reruns, basket regeneration (destructive/expensive), gated only by `window.confirm` | 2 | REPORTED | `CourseValidator.vue:625-631,633-666,736-793`; `router/index.js` | Founder call on scoping model (§5) + server-side auth on the rerun/regenerate endpoints via `dashboard-auth.cjs` |
| 8 | LA | **`/schools/play` identity leak**: "Learn" pill mid-class-session doesn't remount the player — class identity/session/cursor keeps running under a personal-practice URL. Root cause: the one cleanup function (`handleExit`/`clearClassContext`) is dead code, unbound to any control | 1+5 | **VERIFIED** (dead-code half grep-confirmed) | `SchoolsTopBar.vue:166-176`, `PlayerContainer.vue:392-433`, `LearningPlayer.vue:10304-10318` | Wire the exit handler; force remount on session-kind change |
| 9 | LA | **Offline is invisible + the built messaging is dead code**: no app-wide offline indicator anywhere; `useOfflinePlay`'s full 4-level degradation hierarchy with learner-facing messages has **zero call sites** (grep-verified) — a learner losing connectivity mid-round gets nothing, while the designed message set sits disconnected | 3+5 | **VERIFIED** | `LearningPlayer.vue:3578,9236-9264`, `useOfflinePlay.ts:7-19,290-303` | Architectural — founder decision on whether to wire or delete the hierarchy (§5); minimum viable fix is a plain offline badge |
| 10 | LA | **Kill switch is silent, and `forceUpdate` can kill mid-audio**: remote kill switch unregisters SWs, wipes caches, reloads — zero learner-facing message (`config.message` fetched, logged, never rendered — grep-verified no UI consumer). `forceUpdate` SKIP_WAITINGs past the never-interrupt-audio rule | 3+1 | **VERIFIED** | `useServiceWorkerSafety.ts:92-94`, `PwaUpdatePrompt.vue` | Render `config.message` as an overlay before acting; gate `forceUpdate` on `!isPlaying` |
| 11 | LA | **Delete Account doesn't delete the auth identity**: learner row + progress deleted, but the Supabase Auth user survives — same person can sign straight back in and get a fresh learner row; confirm copy says "permanently delete" | 3 | REPORTED | `SettingsScreen.vue:872-923` | Server-side admin-API deletion of the auth user, or honest copy |
| 12 | DB | **`/edit/introductions` unscoped + unvalidated write path**: any authenticated user can rewrite introductions for the two hardcoded courses; the orchestrator PUT accepts any JSON blob for any `courseCode`/`file` with no schema check — malformed saves silently degrade to an empty list on next load | 2 | REPORTED | `IntroductionsViewer.vue:178`, `orchestrator.cjs:5445-5473` | Auth + shape-validate on the PUT; or retire the screen (manifest path is legacy anyway) |
| 13 | DB | **Destructive ops under-gated**: CourseManager Rebuild/Wipe (irreversible deletion of LEGOs/phrases/course content) gated by a single inline confirm click; Rebuild range inputs unvalidated (`from>to`, negatives go straight to the API). TextGeneration `massApproveSeeds` has NO confirm while its sibling reset-translations does | 2 | REPORTED | `CourseManager.vue:644-737,1040-1070`, `TextGeneration.vue:1315-1340` | Typed-confirmation for wipe/rebuild; add the missing confirm; clamp ranges client-side |

### Tier 2 — correctness / operator-lying UI

| # | App | Finding | Class | Status | File:line | Fix sketch |
|---|---|---|---|---|---|---|
| 14 | DB | SeedEditor optimistic save keeps rejected edits (state corruption, learner-facing course text) | 2/3 | REPORTED | `SeedEditor.vue:317-351` | Mutate after `resp.ok`; revert + error on failure |
| 15 | DB | PhraseQA dismiss/delete false-success on failed DELETE/PATCH of course content | 2 | REPORTED | `PhraseQA.vue:248-274` | Check `resp.ok` before filtering local list |
| 16 | DB | CourseManager stop/force-kill report false "stopped" (jobStatus reset in catch) | 1 | REPORTED | `CourseManager.vue:1776,1784,1800` | Only set idle on confirmed stop; error state otherwise |
| 17 | DB | Play-as-class silently refuses to launch on Dashboard/Classes/ClassDetail (phantom course-code incident 2026-07-16 is the known trigger) | 3 | **VERIFIED** (incident-matched) | `usePlayAsClass.ts:70-101` + 3 call sites | Surface the refusal reason at the click site |
| 18 | DB | PodDetailView sentence-edit: no validation, empty `target_text` saveable, and every save unconditionally nulls both audio ids | 2 | REPORTED | `PodDetailView.vue:175-186,453-477` | Non-empty guard; only null audio when text actually changed |
| 19 | DB | CourseEditor: `getApiUrl` never imported — 5 handlers throw `ReferenceError` if reached; whole Validation & Fix panel dead behind `showValidationPanel=false` | 4+5 | **VERIFIED** (grep-confirmed no import, no setter) | `CourseEditor.vue:1104,1545,1852,1882,1906,1947` | Decide wire-or-delete (§5-adjacent); if wiring, fix the import first |
| 20 | LA | Read-fetch failures invisible on 4 of 6 core schools screens (error refs set, never rendered) — one shared fix, four call sites | 3 | REPORTED (pattern cross-confirmed) | `DashboardView.vue:24-45`, `StudentsView.vue:17`, `TeachersView.vue:12`, `TeacherDashboard.vue:24` | Render the existing error refs, SchoolsView-style |
| 21 | LA | Analytics: silent no-op on missing auth token — teacher with real classes sees "No classes yet"; deep-link preview note misdescribes real data | 3+4 | REPORTED | `TeacherInsightsView.vue:334-336,229` | Re-auth prompt on token failure; gate the note to demo mode |
| 22 | DB | Insights "Run discovery" (costs a real Claude run) has no end state after the 4 polls — can't tell running/failed/empty; also no client confirm before spend | 4 | REPORTED | `Insights.vue:71-81`, `useInsightDiscovery.js` | Terminal poll → "still running? check later / failed" message |
| 23 | DB | Deploy-to-production feedback is one transient `alert()`; reload restarts wizard at step 1 with no memory a deploy happened | 3 | REPORTED | `CourseCompilation.vue:639-662` | Persist + display last-deploy status server-side |
| 24 | LA | AdminUsers/AdminAttention render error + success-shaped content simultaneously ("All 0 subscribers healthy" on fetch failure) | 4 | REPORTED | `AdminAttention.vue:49-79` | Fix `v-else` scoping |
| 25 | LA | Settings: profile save sends only `school_name` (city/region/email/about silently dropped); 4 privacy toggles pure decoration; weekStart/showFlags never persisted; "Cancel" button inert; hardcoded "Type" string; £15 shown to annual subscribers | 2/3/4 | REPORTED (several confirmed still-open vs 07-13 audit) | `SettingsView.vue:174-213,255-258,287-289,314,402` | One screen-wide pass; wire or remove each control |
| 26 | LA | UNVERIFIED tutor class caps: `MAX_CLASSES`/`MAX_STUDENTS_PER_CLASS` UI-only, server enforcement unconfirmed | 2 | REPORTED | `TeachDashboard.vue:486-519` | Verify `api/teacher/classes.ts` enforces; add if not |
| 27 | DB | Pod Lab: `ladderRungs` (~300-line computed powering the default view) has no error boundary (sibling `arc` does); hand-edited JSON validated for parseability only; audio `onerror` treated as `onended` | 3/4/2 | REPORTED | `PodLab.vue:551-857,256-275,304` | try/catch + degrade message; shape-check configs |
| 28 | DB | Docs area: Pedagogy silently falls back to hardcoded content on fetch failure (positive-only "database" badge); CanonicalSeeds partial batch-save unreported | 3 | REPORTED | `Pedagogy.vue:674-676`, `CanonicalSeeds.vue:229-246` | "Showing fallback" note; report per-row save results |
| 29 | LA | Boot: `restoreActAs`/`checkKillSwitch`/offline-lease init/access-claim all console-warn-only on failure | 3 | REPORTED | `App.vue:519-587` | Single boot-degradation toast pattern |
| 30 | LA | Firefox-Android install dead-end (already-installed users told to use "the menu in Chrome"); desktop Safari/Firefox "Preparing install" forever | 4/5 | **VERIFIED** (pre-documented, reproduced — Jonathan; Stage-3 fix confirmed not shipped) | `InstallGuide.vue:144-147`, `docs/pwa-lifecycle-design.md` §2.2 | Ship the designed `installState.ts` guidance matrix |

### Tier 3 — dead code / cosmetic / hygiene (batch-sweep material)

| # | App | Finding | Class | Status |
|---|---|---|---|---|
| 31 | DB | Quality Review area: 4 screens of fabricated data + `alert()` placeholder actions; `LearnedRulesView` calls a nonexistent backend route (grep-verified); zero nav entry to any of the 5 routes | 3/4/5 | **VERIFIED** (route-absence grep) — founder call: build, hide, or delete (§5) |
| 32 | LA | God Mode/act-as fully orphaned — `actAs()` has zero callers; documented capability doesn't exist | 5 | **VERIFIED** (grep) |
| 33 | DB | Orphaned handlers/UI: TextGeneration stopBuilder/forceReset/killAgent; AudioPipeline showPlan + Plan panel; CourseManager legacy phases mode; CourseBrowser highlightedCourses; network-builder `POST /connect`; CourseEditor translations-search + audio-QA subsystems | 5 | REPORTED (several grep-confirmed in-doc) |
| 34 | DB | Pod Thinking: 14/28 files with placeholder description/status on a founder-facing index, silently badged "IN DISCUSSION" | 4 | **VERIFIED** (diff of glob vs meta keys, file list in docs-area audit) — content task, §5 |
| 35 | DB | DocsLayout has no nav chrome — 6 of 9 doc pages are dead ends with no path back to `/docs`; hardcoded doc/seed counts drifting | 5/4 | REPORTED | 
| 36 | LA | Admin misc: role-update failure reason-less "Failed" pill; entitlement course-codes unvalidated; activity capped at 100 rows silently; release-notes publish no success twin; analytics tabs unbookmarkable; direct-access codes unbounded max_uses | 2/3/4 | REPORTED |
| 37 | DB | NetworkBuilder data is in-memory only — server restart silently discards all work (auth now fixed; persistence not) | 3 | REPORTED — likely "delete the screen" candidate (§5) |
| 38 | Both | `alert()`/raw `err.message` as the error surface across CourseCompilation, CourseValidator, IntroductionsViewer, saveIntro; number inputs relying on HTML min/max only (Maintenance keepDays, TextGeneration seedCount, CourseManager rebuild range) | 4/2 | REPORTED — style-sweep once the `api()`-helper pattern lands |

---

## 5. FOUNDER DECISIONS — policy/taste calls, not code fixes

One line each; every one is blocking a class of items above.

1. **Dashboard client-side admin gating** — the dashboard deliberately relies on server-side RLS/requireAdmin with no client `isAdmin` affordance (documented in `Admin.vue:61-63`). Keep that stance, or roll SpeakingConfig's warning-banner pattern across Maintenance/Insights/Board/Configs? (admin-ops A1)
2. **`/validate` + `/edit/introductions` scoping** — should these be course-scoped/admin-only, or retired? `/edit/introductions` edits a legacy manifest path; cheapest fix may be deletion. (§4 items 7, 12)
3. **TTS spend-approval granularity** — server auth now exists (b7595925), but authenticated non-admin editors can still trigger spend from SeedEditor cascade (generateAudio defaults ON), AudioPipeline, ScriptViewer regen. Is "any authenticated dashboard user" the right spend boundary, or admin-only / queue-gated per the audio-pass-queue doctrine?
4. **Phase8 firewall** — same family: where does the "content passes queue audio, never run TTS" rule get enforced in the UI, given multiple buttons that run TTS directly today?
5. **Quality Review area** (4 mock screens + missing backend): build it for real, hide it behind a flag, or delete ~5 screens of scaffolding? Currently reachable only by typed URL, so cost of deferring is low.
6. **Offline architecture** — wire the built-but-dead `useOfflinePlay` degradation hierarchy into the real playback path, or delete it and design fresh? Minimum viable regardless: an offline indicator. (§4 item 9)
7. **PodThinking placeholder docs** — 14 files need one-line descriptions + a deliberate badge each in `pod-thinking-meta.js`; that's editorial voice, not code.
8. **CourseEditor Validation & Fix panel + orphan subsystems** — wire or delete? (Same question for the ~8 orphan clusters in §4 item 33.)
9. **Delete-account semantics** — should account deletion delete the Supabase Auth identity (needs a server-side admin call), or should the copy stop saying "permanently"? (§4 item 11)
10. **`?reset=1` remains confirmation-free** by design (support-only alias) — still wanted un-gated now that `/reset` ships as a route alias?
11. **Two parallel subscription surfaces** (in-player learner premium vs school/tutor seats) never reference each other; two different "language" settings under two localStorage keys. Unify, cross-link, or accept? (account-settings §divergence)
12. **Dead-control keyboard bypasses** — Quality screens' shortcuts fire actions whose buttons are disabled; harmless today (alerts), but pick the rule: disabled means disabled, everywhere.

---

*Compiled by Fable from the 10 source audits; every item cites its source doc's file:line. When an item here disagrees with a source doc, this ledger reflects the post-verification state (§2, §3) — three source-doc claims are already known-false and are marked as such.*
