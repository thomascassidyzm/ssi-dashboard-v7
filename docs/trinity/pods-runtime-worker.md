# Pods Runtime — Trinity Compliance Audit

> **Date**: 2026-07-17
> **Scope**: `src/views/PodsView.vue`, `src/views/PodDetailView.vue`, `src/components/PodCastPanel.vue`, `src/components/production/autocue/PodLongTakeStudio.vue`, and routes `src/router/index.js:276-282` + `:607-623`. **Pod Lab is out of scope** (covered by another worker).
> **Trinity**: App→User (output) | User→App (input) | App→App (processing)
> **Evidence standard**: every row cites `file:line`; a message only counts as validated if the validating code is cited.

---

## Route layer (`src/router/index.js:276-282`, `:607-623`)

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→App | `/courses/:courseCode/pods` — legacy path redirects to `/production/${courseCode}/pods` (router/index.js:276-278) |
| 2 | App→App | `/courses/:courseCode/pods/:slug` — legacy path redirects to `/production/${courseCode}/pods/${slug}` (router/index.js:279-281) |
| 3 | App→App | `/production/:courseCode/pods` resolves to `PodsView.vue`, name `Pods` (router/index.js:607-613) |
| 4 | App→App | `/production/:courseCode/pods/:slug` resolves to `PodDetailView.vue`, name `PodDetail` (router/index.js:614-620) |
| 5 | App→App | Global `router.beforeEach` auth guard runs before either route resolves — unauthenticated → redirect to Login; course-scoped access enforced via `canAccessCourse` (router/index.js:655-671, 714-716 context) |

No screen or error content is defined for the redirect hop itself (rows 1-2) — there is no App→User "moved" message, but this matches standard SPA-redirect precedent elsewhere in the file (not a defect on its own).

---

## Screen: PodsView - course pod list (`/production/:courseCode/pods`)

### Header / breadcrumb

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→User | Breadcrumb: Home / `{{ formatCourseCode(courseCode) }}` / "Listening Pods" (PodsView.vue:6-14) |
| 2 | App→User | Title "Listening Pods" + subtitle "Layer 2 podcast content · {{ courseCode }}" (PodsView.vue:15-18) |

### Generate/manage Pod 0 panel

| # | Direction | Message |
|---|-----------|---------|
| 3 | App→User | If no `pod0`: "Generate Pod 0 from canonical scenarios" + explainer text (PodsView.vue:25-30) |
| 4 | App→User | If `pod0` exists: "Pod 0 — already generated", sentence count + audio coverage, regenerate warning (PodsView.vue:32-39) |
| 5 | App→User | `genStatus` progress line, colour flips to danger if `genError` set (PodsView.vue:40) |
| 6 | App→User | `genError` line (PodsView.vue:41) |
| 7 | App→User | "Edit canonical" link → `/production/:courseCode/canonical/pod-0` (PodsView.vue:44) |
| 8 | User→App | Click "Generate Pod 0" (visible only when `!pod0`) (PodsView.vue:46-53) |
| 9 | App→App | `generatePod(false)` — resumable poll loop, `POST /api/admin/pods/generate`, up to 30 passes until `!body.more_remaining` (PodsView.vue:169-196) |
| 10 | App→User | Button label toggles "Generate Pod 0" / "Generating…" while `generating` (PodsView.vue:52) |
| 11 | User→App | Click "Regenerate" (visible only when `pod0` exists) (PodsView.vue:54-63) |
| 12 | App→User | `window.confirm()` dialog — destructive-action copy, itemises sentence/audio loss (PodsView.vue:206-214) |
| 13 | User→App | Confirm/cancel the native dialog (PodsView.vue:214) |
| 14 | App→App | On confirm: `generatePod(true)` — force wipe + regenerate (PodsView.vue:215) |
| 15 | App→User | Cast panel embedded (`PodCastPanel`) (PodsView.vue:68) — see separate table below |

### Pod list body

| # | Direction | Message |
|---|-----------|---------|
| 16 | App→User | Loading state "Loading pods…" (PodsView.vue:71) |
| 17 | App→User | Error state — raw `error.value` message in a red box (PodsView.vue:74-76) |
| 18 | App→User | Empty state — "No pods for this course yet." + `node tools/pod-sync.cjs` instructions (PodsView.vue:79-82) |
| 19 | App→User | Pod card grid: title, `pod_type` badge, slug, sentence count, hosts/speaker count, target/known audio coverage (PodsView.vue:85-129) |
| 20 | User→App | Click a pod card (PodsView.vue:86-90) |
| 21 | App→App | Navigate to `/production/${courseCode}/pods/${pod.slug}` via `router-link` (PodsView.vue:89) |
| 22 | App→User | Footer stats "{{ pods.length }} pods · {{ totalSentences }} sentences total" (PodsView.vue:133-135) |
| 23 | App→App | `loadPods()` on mount — `GET /api/pods/:courseCode` (PodsView.vue:238-253, 255) |

### Findings — PodsView

None found that clear the evidence bar. The generate/regenerate/load flows all have both success and failure App→User twins (rows 5, 6, 10, 16-18).

---

## Screen: PodDetailView - pod detail (`/production/:courseCode/pods/:slug`)

### Breadcrumb / header / states

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→User | Breadcrumb: Home / courseCode / Pods / slug (PodDetailView.vue:5-13) |
| 2 | App→User | Loading state "Loading pod…" (PodDetailView.vue:15) |
| 3 | App→User | Error state — raw `error.value` message (PodDetailView.vue:17-19) |
| 4 | App→User | Pod header: title, `pod_type` badge, id, sentence count, optional `source_file` (PodDetailView.vue:21-33) |
| 5 | App→App | `loadPod()` — `GET /api/pods/:courseCode/:slug` (PodDetailView.vue:408-424, called PodDetailView.vue:642) |
| 6 | App→App | `loadRecordingStatus()` — `GET /api/production/:courseCode/pods/coverage`, called alongside `loadPod` (PodDetailView.vue:609-622, 642) |

### Metadata / speaker mapping

| # | Direction | Message |
|---|-----------|---------|
| 7 | App→User | Collapsible "Pod metadata" — hosts, register, status (only if `hasMetadata`) (PodDetailView.vue:36-57) |
| 8 | App→User | Collapsible "Speaker voice mapping" — per-speaker voice id + provider (PodDetailView.vue:60-70) |

### Stage-1 explainer text panel

| # | Direction | Message |
|---|-----------|---------|
| 9 | App→User | "Stage-1 explainer text" panel header + `{{ explainerCovered }}/{{ sentences.length }}` coverage, `{{ explainerAudioCovered }}` with audio (PodDetailView.vue:77-87) |
| 10 | User→App | Click "Generate" (disabled while busy or `allExplained`) (PodDetailView.vue:89-94) |
| 11 | User→App | Click "Regenerate all" (disabled only while busy) (PodDetailView.vue:95-100) |
| 12 | App→App | `generateExplainers(force)` — resumable poll loop, `POST /api/admin/pod-explainer-generate`, up to 50 passes (PodDetailView.vue:487-519) |
| 13 | App→User | `explainerStatus` progress text: "updated N, failed N … done." (PodDetailView.vue:109, 507-509, 517) |
| 14 | App→User | `explainerError` line (PodDetailView.vue:110, 514) |

### Explainer audio panel

| # | Direction | Message |
|---|-----------|---------|
| 15 | User→App | Click "Generate explainer audio (N)" (disabled while busy or `explainerAudioMissing === 0`) (PodDetailView.vue:101-106) |
| 16 | App→App | `generateExplainerAudio()` — `POST /api/admin/pods/:courseCode/generate-explainer-audio`, up to 5 passes (PodDetailView.vue:571-602) |
| 17 | App→User | `explainerAudioStatus` progress text (PodDetailView.vue:111, 580, 593-596) |
| 18 | App→User | `explainerAudioError` line (PodDetailView.vue:112, 598) |

### Pod audio (target/known) panel

| # | Direction | Message |
|---|-----------|---------|
| 19 | App→User | "Pod audio" panel — `{{ audioVoiced }}/{{ audioTotal }}` clips voiced, missing count or "fully voiced" (PodDetailView.vue:120-129) |
| 20 | User→App | Click "Regenerate audio (N)" (disabled while busy or `audioMissing === 0`) — no confirm, optimistic per code comment (PodDetailView.vue:130-136, 118-119) |
| 21 | App→App | `regenerateAudio()` — `POST /api/admin/pods/:courseCode/generate-audio`, up to 5 passes (PodDetailView.vue:529-560) |
| 22 | App→User | `audioStatus` progress text (PodDetailView.vue:137, 538, 551-554) |
| 23 | App→User | `audioError` line (PodDetailView.vue:138, 556) |

### Scenes / sentences / inline edit / playback

| # | Direction | Message |
|---|-----------|---------|
| 24 | App→User | Scene heading with sentence count (PodDetailView.vue:143-147) |
| 25 | App→User | Beat-label separator when `sent._showBeat` (PodDetailView.vue:153-155) |
| 26 | App→User | Sentence row (display mode): order, speaker, target text, known text, explainer note if present (PodDetailView.vue:158-172) |
| 27 | User→App | Click ✎ "Edit target / known text" (PodDetailView.vue:226-231) |
| 28 | App→App | `startEdit(sent)` — populate `editBuf` (PodDetailView.vue:446-450) |
| 29 | App→User | Edit-mode textareas for target/known + "editing clears this line's audio" notice (PodDetailView.vue:175-186) |
| 30 | User→App | Type into target/known textareas — **no client-side validation** (PodDetailView.vue:176-179) |
| 31 | User→App | Click "Save" (PodDetailView.vue:181) |
| 32 | App→App | `saveSentence(sent)` — `PATCH /api/production/:courseCode/pods/sentence/:id`; on success, locally nulls `target_audio_id`/`known_audio_id` (PodDetailView.vue:453-477) |
| 33 | App→User | `editError` inline text on failure (PodDetailView.vue:184, 473) |
| 34 | User→App | Click "Cancel" (PodDetailView.vue:182) |
| 35 | App→App | `cancelEdit()` — discard edit buffer (PodDetailView.vue:451) |
| 36 | App→User | Human-recording status chip (human N/M, tts, or "—") — hidden entirely when coverage data absent (PodDetailView.vue:190-194, 626-639) |
| 37 | App→User | Target/known/explainer play buttons; disabled-look (plain span) when no audio id (PodDetailView.vue:195-219) |
| 38 | User→App | Click a play button (PodDetailView.vue:196-197, 202-204, 209-211) |
| 39 | App→App | `playAudio(audioId)` — `GET /api/production/:courseCode/audio/:audioId/url` then plays via hidden `<audio>` element; **failure path only `console.error`s** (PodDetailView.vue:367-387) |
| 40 | User→App | Click "⇉ Play target then known" (only when both audio ids present) (PodDetailView.vue:220-225) |
| 41 | App→App | `playPair()` → `playNext()` → `onAudioEnded()` queue chain (PodDetailView.vue:389-406) |

### Findings — PodDetailView

| Class | Finding | Citation |
|---|---|---|
| **3 — MISSING TWIN** | `getSignedUrl`/`playAudio` failure path only logs to `console.error` and silently resets `playingId` — no App→User message at all when playback fails (dead signed URL, 404, network error). The user just sees the ▶ button revert with zero explanation. | PodDetailView.vue:376-387 (catch block: 383-386) |
| **3 — MISSING TWIN** | `loadRecordingStatus()` swallows all fetch errors in an empty `catch` block; the code comment ("coverage is additive — never block the page") documents the silence as intentional, but the resulting App→App failure has **no** App→User signal of any kind — chips simply never render, indistinguishable from "no data" | PodDetailView.vue:609-622 (catch: 621) |
| **2 — UNVALIDATED** | Sentence edit textareas (target/known) have no client-side validation (no empty-string check, no length check) before `saveSentence()` PATCHes the server — an editor can save an empty `target_text`, and doing so unconditionally nulls both audio ids regardless of whether the edit was meaningful | PodDetailView.vue:175-186 (inputs), 453-477 (`saveSentence`, no guard before the fetch at 460-463) |
| **4 — UNSPECIFIED CONTENT** | Aggregate progress lines ("updated N, failed N") for explainer text / explainer audio / pod audio never say *which* sentence failed — only a count. Not severe (matches schools-audit precedent for aggregate banners) but there is no way for the editor to find the specific broken row from the UI | PodDetailView.vue:507-509, 593-596, 551-554 |

---

## Screen: PodCastPanel — Cast, embedded in PodsView (`/production/:courseCode/pods`)

Two-state component per founder ruling 2026-07-17 (PodCastPanel.vue:219-234): `saved` (cast is live) or `editing` (choosing two people + live preview). `mode` is derived, not stored (PodCastPanel.vue:264).

### Shared / loading

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→User | Header "Cast — the two voices" + explainer copy (PodCastPanel.vue:5-11) |
| 2 | App→User | `status` line, colour flips red if `statusIsError` (PodCastPanel.vue:20) |
| 3 | App→User | Loading state "Loading cast…" (PodCastPanel.vue:22) |
| 4 | App→App | `loadCast()` — `GET /api/production/:courseCode/pods/cast` on mount (PodCastPanel.vue:362-379, 551) |
| 5 | App→User | On `loadCast` failure: `note(err.message, true)` → red status line (PodCastPanel.vue:374-376) |

### mode = 'saved'

| # | Direction | Message |
|---|-----------|---------|
| 6 | App→User | "Your cast" + "saved ✓ — record links are live" (PodCastPanel.vue:26-29) |
| 7 | App→User | Per-voice card: name, gender pill, bilingual-guide pill, characters played, line count, est. minutes, email (PodCastPanel.vue:30-67) |
| 8 | User→App | Click "Copy record link" (PodCastPanel.vue:44-49) |
| 9 | App→App | `copyRecordLink(voiceId)` — `navigator.clipboard.writeText` (PodCastPanel.vue:541-549) |
| 10 | App→User | Button label flips to "Copied ✓" for 2s (PodCastPanel.vue:48, 545) |
| 11 | App→User | On clipboard failure: "Could not copy — your browser blocked clipboard access." (PodCastPanel.vue:547) |
| 12 | User→App | Click "Open ↗" record link (new tab) (PodCastPanel.vue:50-54) |
| 13 | App→User | Provisioning notes list after a save (create / add-course / error per person) (PodCastPanel.vue:74-76, 466-471) |
| 14 | User→App | Click "Edit cast" (header button, visible only in `saved` mode) (PodCastPanel.vue:13-17) |
| 15 | App→App | `startEditing()` — `prefillPeople()` then `editing.value = true` (PodCastPanel.vue:303-307) |

### mode = 'editing'

| # | Direction | Message |
|---|-----------|---------|
| 16 | App→User | Two person rows: name input, gender `<select>`, email input, bilingual-guide radio, remove ✕ (PodCastPanel.vue:83-120) |
| 17 | User→App | Type name / email; select gender; toggle guide radio; click ✕ to remove (PodCastPanel.vue:88-119) |
| 18 | App→App | `canSolve` — requires exactly 2 people, each named or emailed, genders sorted to exactly `['f','m']` (PodCastPanel.vue:316-321) |
| 19 | User→App | Click "+ Add the first/second voice" (capped at 2 rows) (PodCastPanel.vue:123-127, 289-292) |
| 20 | App→User | Static hint "The bilingual guide reads the English lines…" (PodCastPanel.vue:128-131) |
| 21 | App→User | "This course came with a ready-made voice plan…" note when `generationColouring` (PodCastPanel.vue:136-139) |
| 22 | App→App | `watch(people, …)` — 500 ms debounce → `autoPropose()` only while `mode === 'editing'` (PodCastPanel.vue:415-419) |
| 23 | App→App | `autoPropose()` — `POST /api/production/:courseCode/pods/cast/propose`; guarded by `canSolve`; stale responses dropped via `proposeSeq` (PodCastPanel.vue:386-413) |
| 24 | App→User | Server warnings list (`visibleWarnings`, `need-more-people` filtered out by design) (PodCastPanel.vue:145-151, 325-326) |
| 25 | App→User | On `autoPropose` failure: red status line (PodCastPanel.vue:407-410) |
| 26 | App→User | Live preview cards: same fields as saved-mode cards, plus "Record link comes with saving" / "Saving gives … access automatically" (PodCastPanel.vue:155-206) |
| 27 | App→User | Empty state "No dialogue characters yet — generate or sync a pod first." (when `!speakerCount`) (PodCastPanel.vue:207-209) |
| 28 | App→User | Fallback hint "Name your two voices — one male, one female…" (when no allocation and speakers exist) (PodCastPanel.vue:210-212) |
| 29 | User→App | Click "Save cast — make the links live" (disabled unless `proposal && dirty`) (PodCastPanel.vue:192-198) |
| 30 | App→App | `saveCast()` — surgical diff vs `savedCast`, `PUT /api/production/:courseCode/pods/cast` (PodCastPanel.vue:437-480) |
| 31 | App→User | On success: "Cast saved ✓ — copy each person their record link." + provisioning notes; `editing.value = false` returns to `saved` mode (PodCastPanel.vue:465-474) |
| 32 | App→User | On failure: red status line (PodCastPanel.vue:475-477) |
| 33 | User→App | Click "Cancel" (visible only if `hasSavedCast`) (PodCastPanel.vue:199-203) |
| 34 | App→App | `cancelEditing()` — discard proposal, `editing.value = false` (PodCastPanel.vue:309-313) |
| 35 | App→User | "This matches the saved cast — nothing to save." (when `proposal && !dirty`) (PodCastPanel.vue:204) |

### Findings — PodCastPanel

| Class | Finding | Citation |
|---|---|---|
| **4 — UNSPECIFIED CONTENT** | When `proposal` is `null` and `speakerCount > 0`, the panel always shows the same generic hint "Name your two voices — one male, one female — and the parts work themselves out here" regardless of *why* the preview isn't appearing — two named people with matching genders (e.g. two males) hits this exact branch with no message telling the editor the specific problem is "you picked two of the same voice". `canSolve` distinguishes the cases internally but the template collapses them to one string. | PodCastPanel.vue:207-212 (template), 316-321 (`canSolve` — the gender-pair check that silently fails without surfacing which check failed) |
| **5 — UNREACHABLE (partial)** | `visibleWarnings` explicitly filters out the server's `need-more-people` warning type on the stated basis that it's "expected under the two-voice rule" — that warning class is generated server-side but can now never reach the user through this screen. Confirmed intentional by the code comment, not a bug, but the class-5 definition ("messages no flow can reach") technically applies. | PodCastPanel.vue:145, 325-326 |

---

## Screen: PodLongTakeStudio — long-take recorder, embedded in Record Room (`/record/:courseCode`)

Six phases: `loading → no-plan | error | ready → recording → done` (PodLongTakeStudio.vue:150).

### loading / no-plan / error

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→User | "Loading your lines…" + spinner (PodLongTakeStudio.vue:4-7) |
| 2 | App→User | "No lines to record yet" + explainer + "Check again" button (on `404`) (PodLongTakeStudio.vue:10-14, 358) |
| 3 | User→App | Click "Check again" (PodLongTakeStudio.vue:13) |
| 4 | App→User | "Couldn't load your lines" + `loadError` text + "Try again" button (PodLongTakeStudio.vue:17-21) |
| 5 | User→App | Click "Try again" (PodLongTakeStudio.vue:20) |
| 6 | App→App | `loadPlan()` — `GET /api/production/:courseCode/pods/recording-plan?voiceId=…`; 404 → `no-plan`, other non-OK → thrown into `error`, empty items → `no-plan` (PodLongTakeStudio.vue:352-370) |

### ready

| # | Direction | Message |
|---|-----------|---------|
| 7 | App→User | "Ready when you are" + "You're reading as **{{ planSpeakers }}**" (PodLongTakeStudio.vue:25-26) |
| 8 | App→User | Summary stats: Lines / Recorded / To read (PodLongTakeStudio.vue:28-32) |
| 9 | App→User | 4-step "how-to" list (PodLongTakeStudio.vue:34-39) |
| 10 | App→User | Mic picker `<select>`, shown only if `devices.length > 1` (PodLongTakeStudio.vue:42-47) |
| 11 | User→App | Select microphone (PodLongTakeStudio.vue:44-46) |
| 12 | App→User | "Re-read lines I've already recorded" toggle + subtext "New takes replace old ones; nothing is deleted." (PodLongTakeStudio.vue:49-53) |
| 13 | User→App | Toggle `includeRecorded` checkbox (PodLongTakeStudio.vue:50) |
| 14 | User→App | Click "Start" (disabled when `startIndex === -1`) (PodLongTakeStudio.vue:56) |
| 15 | App→User | "Every line is already recorded. Turn on 're-read' above to do another pass." when `startIndex === -1` (PodLongTakeStudio.vue:58) |
| 16 | App→User | `micError` text (PodLongTakeStudio.vue:59) |
| 17 | App→App | `beginSession()` — `recorder.start()`; on failure sets `micError` via `friendlyMicError()`, stays on `ready` (PodLongTakeStudio.vue:219-227, 237-243) |

### recording

| # | Direction | Message |
|---|-----------|---------|
| 18 | App→User | Level meter + "Too loud — back off the mic" / "Mic live" tag (PodLongTakeStudio.vue:66-71) |
| 19 | App→User | Progress counter `readThisSession / toRecordCount` (PodLongTakeStudio.vue:72) |
| 20 | App→User | Scrolling autocue: scene headers, speaker name (target lines only), line text, gloss, done-tick (PodLongTakeStudio.vue:76-94) |
| 21 | User→App | Click "Again" / press `R` (PodLongTakeStudio.vue:98, 342) |
| 22 | App→App | `onAgain()` — `recorder.discardLine()` then `recorder.beginLine()` (PodLongTakeStudio.vue:298-308) |
| 23 | User→App | Click "Next ▶"/"Done ✓" / press `Space` (PodLongTakeStudio.vue:99, 341) |
| 24 | App→App | `onNext()` — `recorder.endLine()` → `commitLine()` → advance or `finishAfterLine()` (PodLongTakeStudio.vue:278-296) |
| 25 | App→App | `commitLine()` — blobs `< 1200` bytes are silently dropped (`skippedEmpty++`), **no immediate App→User signal** (PodLongTakeStudio.vue:255-258) |
| 26 | App→App | `commitLine()` — otherwise `uploadQueue.queueUpload(...)`, adds to `sessionRecorded` (PodLongTakeStudio.vue:259-276) |
| 27 | User→App | Click "Finish & save" (PodLongTakeStudio.vue:101) |
| 28 | App→App | `onFinish()` — commits current line, `finishAfterLine()` → `recorder.stop()`, phase → `done` (PodLongTakeStudio.vue:310-325) |
| 29 | App→App | `beforeunload` guard blocks accidental tab close while `phase === 'recording'` (PodLongTakeStudio.vue:345-347, 379) |

### done

| # | Direction | Message |
|---|-----------|---------|
| 30 | App→User | "Saving your recording…" / "Saved ✓" header, keyed off `uploadQueue.pendingCount` (PodLongTakeStudio.vue:107) |
| 31 | App→User | Stats: Lines read / Saved / Saving… / Failed (last two conditional) (PodLongTakeStudio.vue:108-113) |
| 32 | App→User | "Keep this page open until everything has saved." while pending (PodLongTakeStudio.vue:114) |
| 33 | App→User | "{{ skippedEmpty }} empty/very-short take(s) were skipped (nothing captured)." — **first and only** point the user learns a take was dropped (PodLongTakeStudio.vue:115) |
| 34 | User→App | Click "Back to my lines" (PodLongTakeStudio.vue:117) |
| 35 | App→App | `reloadAfterSession()` — reset `sessionRecorded`, `loadPlan()` (PodLongTakeStudio.vue:372-375) |

### Findings — PodLongTakeStudio

| Class | Finding | Citation |
|---|---|---|
| **3 — MISSING TWIN (delayed)** | An empty/near-silent take (`blob.size < 1200`) is dropped with zero feedback at the moment of drop — the reader taps "Next" believing the line was captured, hears nothing, and only discovers it was skipped in the aggregate count on the `done` screen at the end of a full session. For a long session this could be dozens of lines in, with no way to know which line. | PodLongTakeStudio.vue:255-258 (drop, no UI signal), 115 (only later surfacing, aggregate count only) |
| **4 — UNSPECIFIED CONTENT** | The `done` screen shows a `Failed` stat count (`uploadQueue.failedIndices.size`) but the component provides no retry action and no per-line detail on *which* lines failed to upload — the reader has no way to know which take needs re-recording. | PodLongTakeStudio.vue:112 |
| **1 — UNTYPED (borderline)** | `beforeUnloadGuard` (PodLongTakeStudio.vue:345-347) intercepts tab-close during recording via the browser's native "leave site?" prompt — this is a genuine App→User message, but it's implicit (browser chrome, not app-authored copy) and has no app-level fallback if the browser suppresses it (some browsers ignore custom `returnValue` text entirely). Low severity, noted for completeness. | PodLongTakeStudio.vue:345-347 |

---

## Summary

| Screen | App→User | User→App | App→App | Findings |
|---|---|---|---|---|
| Route layer | 0 | 0 | 5 | 0 |
| PodsView | 15 | 4 | 4 | 0 |
| PodDetailView | 24 | 8 | 9 | 4 |
| PodCastPanel | 24 | 9 | 8 | 2 |
| PodLongTakeStudio | 20 | 9 | 10 | 3 |
| **Total** | **~83** | **~30** | **~36** | **9** |

### Findings by class

| Class | Count |
|---|---|
| 1 — UNTYPED | 1 (borderline) |
| 2 — UNVALIDATED | 1 |
| 3 — MISSING TWIN | 4 |
| 4 — UNSPECIFIED CONTENT | 3 |
| 5 — UNREACHABLE/ORPHAN | 1 (intentional-by-comment) |

### Worst 3 findings

1. **PodDetailView.vue:376-387** — audio playback failure is entirely silent to the user (`console.error` only); a dead signed URL or network blip on the ▶ button gives zero visible feedback.
2. **PodLongTakeStudio.vue:255-258** — a dropped near-silent take during active recording has no feedback at the moment it happens; the reader only learns of it in an aggregate count at the very end of the session, with no way to identify which line.
3. **PodDetailView.vue:175-186, 453-477** — sentence edit textareas have no client-side validation; an editor can save an empty `target_text`/`known_text`, and every save (valid or not) unconditionally nulls both audio ids.
