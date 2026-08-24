# Popty Flow Walkthrough — Audit 01: Every `/production/:courseCode/*` Route

**Persona:** "Richard" — community leader building *Macedonian for French speakers* with a small team
(some edit content, some record voices; the course needs ≥2 distinct human voices). Not an SSi insider,
has never read CLAUDE.md, does not know the words ZUT, LEGO, tiling, seed-grid, pod, or "Frankenstein".

**Method:** code-read of `src/router/index.js` (route table + guard), every routed view under
`src/views/production/`, the entry-point views, the autocue component tree, and the composables they call.
Labels were ignored; behaviour was read from the code.

---

## 0. How Richard lands here at all

| Step | Route | Component | What actually happens |
|---|---|---|---|
| Login | `/login` → `/auth/verify` | `Login.vue` / `AuthVerify.vue` | Email OTP. Router guard (`router/index.js:533-552`) checks **only** `isAuthenticated` — "OTP is the gate. If you have a session, you're in." |
| Home | `/` | `views/MissionControl.vue` → `CoursePipelineBoard` | A pipeline board of **every course in the system** (all 56+ courses), plus an "Import Course" button. Each card links to `/production/<code>`. |
| Course Library | `/courses` | `CourseBrowser.vue` | Card grid with seed/LEGO/phrase counts, status + pricing pills, "+ New Course" → `/production/new/text`. Cards link to `/production/<code>`. |
| New course | `/production/new/text` | `TextGeneration.vue` (create mode) | Pick known + target language → POST `/api/courses/create` → redirected to `/production/<code>/text`. |

**Access-scoping note:** `useAuth.canAccessCourse()` exists (admin → all; others → `courses` array or `'*'`),
but the **router guard never calls it** — any authenticated user can type `/production/<anyCourse>/...` and get in.
Course filtering is display-side only (CourseBrowser). For a multi-team community world this is the
cross-course-scoping gap, confirmed at the route layer.

**Dead entry points (code exists, unreachable):**
- `src/views/Dashboard.vue` — the old "Popty v14" landing page with workflow cards. **Not in the route table at all**; nothing imports it. Its links (`/course`, `/record`, `/production/courses`) are all redirects now. Pure noise.
- `src/views/production/MissionControl.vue` (1,225 lines) — imported in the router (`index.js:37`) but **never bound to any route**. It's the only thing that links to `feedback`. Dead code.
- `src/components/production/ProductionLayout.vue` + `ProductionNav.vue` — the 7-tab production nav (Overview/Seeds/Text/Phrase QA/Audio/Audio QA/Recording). **The router mounts `src/views/production/ProductionLayout.vue` instead, which renders no nav at all.** The nav Richard actually sees is the global `AppNavbar.vue` (5 tabs: Overview · Text · Audio · Recording · QA). `ProductionNav.vue` is dead code.

**Consequence:** of the 16 child routes under `/production/:courseCode`, only **5 have a nav tab**.
Everything else is reachable only via cards on the Overview page, a tiny "secondary tools" footer link,
links from *other* pages, or by typing the URL. Several routes have **no inbound link anywhere in the live UI**
(noted per-flow below).

---

## 1. `/production/:courseCode` — "Overview" (`ProductionOverview.vue`)

- **Nav label:** "Overview" (AppNavbar tab). Route name `ProductionDashboard`.
- **What it does:** status pills (Testing/Beta/Live) and pricing pills (Free/Premium/Community) that PATCH the course directly — one accidental click on "Live" by a helper changes course status, no confirm. Header stats (seeds/LEGOs/phrases/ratio/audio). Collapsible "Language-Pair Learnings". Blocker cards with a "Fix" button that deep-links into RecordingStudio/AudioPipeline/ScriptViewer. Workflow card grid: Seed Editor, Text Generation, Script View, Audio Generation, Human Recording, Listening Pods, Listening Config (global admin page!), Open Learning App. Secondary tools: Recording Optimizer, "Run QA Audit" (spawns an agent audit of 100 samples, fire-and-forget, no visible result surface on this page), "Export Legacy".
- **Jargon hit cold:** "LEGOs", "ratio" (phrases/LEGO — green ≥10, no explanation), "seeds", "Language-Pair Learnings", "Listening Pods / Layer 2", "Layer 1 / Layer 2 settings", "Export Legacy".
- **Dead-ends/stubs:** "Run QA Audit" gives no feedback beyond the button label flickering; results land in PhraseQA/QAReview which have no nav entry. "Listening Config" card jumps to a **global** `/admin/listening` page that affects every course — startling inside a per-course suite.
- **Verdict:** **Needed** — it is the de-facto nav. But pricing/status pills and Listening Config are admin concerns that should not face a community leader, and "ratio" is meaningless without explanation.

## 2. `/production/:courseCode/seeds` — "Seed Editor" (`SeedEditor.vue`)

- **Nav label:** none (Overview card "Seed Editor — Review and approve translations"). No AppNavbar tab.
- **What it does:** paginated table of seeds: `#`, **"Canonical English"**, Known, Target. Click-to-edit cells POST to `/translate`. Filter (all / needs review / complete), search, "Approve Seeds" button.
- **Jargon:** "seed", "canonical" — Richard sees three languages in one row (canonical English, French known, Macedonian target) with no explanation of why English is there.
- **Dead-ends/stubs:** **`Approve Seeds` is hard-disabled until `complete >= 300`** (`SeedEditor.vue:27`). A community course of 150 seeds can literally never press the button. Success path is a bare `alert('Seeds approved!…')`.
- **Verdict:** **Needed** (this is the translate/verify surface for content helpers) — but the 300-seed gate is a hard blocker for small community courses, and "Canonical English" needs a label a non-insider understands.

## 3. `/production/:courseCode/text` — "Text" (`TextGeneration.vue`)

- **Nav label:** "Text" (AppNavbar tab).
- **What it does:** the agent build pipeline. Stage cards: **1 Translate** (spawns translate agent; progress hard-labelled "668 seed translations" and `x/668` regardless of course size), **2 Build Team** ("Creator/checker — Opus orchestrator"), **3 Final Pass** (wizard: Backfill → Redo flagged → Review → Approve all), **4 Verify Components** ("M-LEGO component completeness"), **Z Zero Uncertainty (ZUT)** ("one English prompt → one answer"), **5 Gender Prep** (only for `spa/ita/por/fra/ara/bre` — hard-coded list; Macedonian is gendered but not on the list, so the stage simply never appears). Target-size selector ("MVP" 300 / "Full" 668 / free number). Agent Chat panel (talk to the decompose agent; "redo seed N" is parsed out of chat text). Seed Grid heat-map (Empty/Building/Decomposed/Flagged/Drafted/Complete) with click-to-inspect phrase viewer + Approve/Redo per seed. "Reset" on Translate wipes all translations behind a single `window.confirm`.
- **Jargon (the worst page for the persona):** LEGOs, M-LEGO, components, ZUT, collisions, "decomposed", "drafted", "under-threshold", "Final Pass", "Gender Prep", "Opus orchestrator", "MVP", ratio, quality score, "spawning".
- **Dead-ends/stubs:** Translate stage progress is `/668` even for a 150-seed course (`668` literal in template). Gendered-language list is a 6-entry hard-code (`TextGeneration.vue:824`) — wrong for most of the world's languages. The chat "redo" regex is an undiscoverable easter egg. Stage completion for `gender` is `genderExpansions > 0` — can never complete for non-listed languages, which is why the card is hidden rather than fixed.
- **Verdict:** **Needed** — this *is* translate→decompose. But it speaks pure SSi-internal dialect and assumes the 668-seed canon. The remote-spawn design (button → host machine spawns Claude agents) is the working architecture, not a gap.

## 4. `/production/:courseCode/phrase-qa` — "Phrase QA" (`PhraseQA.vue`)

- **Nav label:** **none anywhere in the live UI.** Only the dead `ProductionNav.vue` linked it. URL-only.
- **What it does:** text-quality flag table (ERR/WARN/INFO per phrase) from agent checks. Buttons spawn agents: "Run Check" (monitor), "Fix Issues" (fixer), "Polish" (Opus polisher, styled with a special purple gradient). Per-flag: Dismiss (false positive) / Delete phrase.
- **Jargon:** check_type tags (grammar/naturalness/variety/build_quality/meaning_mismatch), "Polish" with zero explanation of what or how much it costs.
- **Dead-ends/stubs:** spawn buttons just `setTimeout`-refresh after 2–10 s — no job status, no failure surface. Orphaned route: a leader will never find it.
- **Verdict:** **Needed function, orphaned surface** — this is the "verify" step for text, but it duplicates QAReview (below) and is invisible.

## 5. `/production/:courseCode/pipeline` — "Audio" (`AudioPipeline.vue`)

- **Nav label:** "Audio" (AppNavbar tab).
- **What it does:** the TTS engine room. Gender-prep banner; "one audio job at a time" cross-course banner; live progress ring; **Voice Configuration** (collapsible `VoiceConfiguration` — pick TTS voices per role); Regenerate by Role (known/target1/target2/presentation, with "Regen queue only" checkbox + Preview/Execute + review panel with per-item ✓ Done); Presentation Text generator ("The Spanish for — 'I want' — …" scripts); Regenerate All Flagged; Pipeline Status (counts, est. cost/time, concurrency slider 1–20); Missing Audio; Shared Audio (encouragements/instructions).
- **Jargon:** roles `target1/target2/known/presentation`, "regen queue", "Gender Prep", "presentations", "shared audio", "linking unlinked audio", cadence. **Vocabulary violation:** the role dropdown literally says **"Known (Source language)"** (`AudioPipeline.vue:235`) — the banned word "source", facing users.
- **Dead-ends/stubs:** everything here is TTS-shaped. There is **no human-voice path on this page at all** — no "use the uploaded human recordings" option, no origin column, nothing that lets Richard's recorded voices flow into the course audio. Regenerating a role would overwrite whatever exists for that role with TTS (precious-audio danger is invisible from this UI).
- **Verdict:** **Needed for synthesize-by-TTS**, but for the human-voice journey it is actively dangerous: the one button a leader sees for "make audio" is the one that papers over human recordings with TTS.

## 6. `/production/:courseCode/recording` — "Recording" (`AutocueStudio.vue`, route `AutocueStudioCourse`)

- **Nav label:** "Recording" (AppNavbar tab); Overview card "Human Recording".
- **What it does:** cinematic teleprompter. Mode select: **Mode 1 New Course** (loads the GuaranteedCoverage "recording script" from `/recording-script`, VAD continuous recording — speak, auto-segment, auto-upload, auto-advance; natural pass then slow pass) and **Mode 2 Regeneration** (role select known/target1/target2, then loads `/recording/queue`, per-phrase record/review/approve/upload).
- **Jargon:** "VAD", "Pass 1/Pass 2", "LEGO extraction", "Direct Items", "coversLegos", roles.
- **Dead-ends/stubs (critical for the ≥2-voices requirement):**
  - Mode 1 hard-codes `role: 'target1'` (`useAutocueState.js:127`, upload metadata in `AutocueStudio.vue:280`). A second voice (target2) **cannot** be recorded via the headline flow; only Mode 2's role picker can, and nothing explains that.
  - **No voice identity is captured anywhere.** Mode 1 uploads carry no `voiceId` at all (the metadata object has role/cadence/text only — `useAudioUpload.ts` would send `voiceId: undefined`); Mode 2's upload path sends no voiceId either. Two different humans recording target1 are indistinguishable in the data.
  - Mode 2's RoleSelector defaults are stale props ("Welsh for English Speakers", 287 phrases).
  - Standalone `/autocue` (same component, `requiresAuth`): with no `:courseCode` param `loadCourse` never runs, `state.courseCode` stays `null`, and Mode 1 fetches `/api/production/null/recording-script`. Broken entry point kept alive by the legacy `/record` redirect.
  - After recording: "Review Recordings" → SessionReview (approve by confidence) → `finalizeSession` uploads — and that's the end. No path from "uploaded human takes" to "course plays my voice" (align/segment/splice is CLI-only; nothing here calls it).
- **Verdict:** **Needed — this is the heart of the human-voice engine — and it is the most unfinished flow.** Record works; everything after upload is a cliff.

## 7. `/production/:courseCode/qa` — redirect

- Legacy `SamplesBrowser` name. Redirects to `ScriptViewer` with `?filter=flagged`. Fine; invisible.

## 8. `/production/:courseCode/script` — "Script Viewer" / nav "QA" (`ScriptViewer.vue`, 2,765 lines)

- **Nav label:** AppNavbar tab **"QA"** links here with `?filter=flagged`; Overview card **"Script View"** links here with `?view=journey`. Same component, two identities — confusing for a newcomer.
- **What it does (three modes):**
  - **Course Preview (`journey`, default):** rounds-based learner-order view with a 4-phase player (prompt/pause/voice1/voice2), search, export-to-markdown, per-item edit. Editing a phrase PATCHes text then **auto-regenerates only the changed roles' TTS** (`regenerate-phrase`, fresh UUID, audition inline) — the polished edit→regen→preview loop.
  - **Script mode (`?view=seed`):** seed/LEGO/phrase tree (default window S0001–S0050), per-phrase play/flag/edit/delete, batch phrase selection + delete.
  - **Listening Projection:** Layer-2 projection view.
  - **Regen queue (`?filter=flagged`):** flat list of audio flagged for regeneration, orphan-flag cleanup, "Regenerate Queue" → `pipeline?mode=flagged`.
- **Jargon:** rounds, debut/build/review/consolidate badges, BLD/USE/CMP, target1/target2, "Listening Projection", "regen queue", "orphaned" flags.
- **Dead-ends/stubs:** flagging audio here feeds the TTS regen queue — for human audio the "fix" path (re-record this item) exists in Autocue Mode 2 but nothing links flag → re-record. Edit modal explicitly blocks LEGO text editing (by design).
- **Verdict:** **Needed** (this is QA + preview + the only place the team *hears* the course), but the journey/QA dual identity and TTS-only regen plumbing need re-framing for human-voice courses.

## 9. `/production/:courseCode/recording-studio` — "Recording Studio" (`RecordingStudio.vue`)

- **Nav label:** none. Linked only from Recording Optimizer's "Open Recording Studio" CTA and Overview blocker deep-links.
- **What it does:** a second, older teleprompter: queue panel + per-phrase record/play/upload, plus its own "Flow Mode" VAD. Uploads with `voiceId: human_${courseCode}` — one shared pseudo-voice for the whole course, so again **two human voices cannot be distinguished**.
- **Dead-ends/stubs:** depends on `store.loadRecordingQueue`; duplicates AutocueStudio almost feature-for-feature with a different UI. Two parallel recording studios for the same job is pure confusion for a team of helpers.
- **Verdict:** **Redundant** — consolidate into Autocue or delete. Keeping both guarantees helpers record into whichever one they found first.

## 10. `/production/:courseCode/feedback` — "User Feedback" (`UserFeedback.vue`)

- **Nav label:** none in live UI (only the dead production MissionControl linked it). URL-only.
- **What it does:** learner-reported issues grouped by audio item + type (translation/audio quality/pronunciation/too fast/confusing), threshold filter, play audio, resolve with note.
- **Verdict:** **Optional but valuable post-launch**; today an orphan. Fine to surface later for the leader only.

## 11. `/production/:courseCode/recording-optimizer` — "Recording Optimizer" (`RecordingOptimizer.vue`)

- **Nav label:** footer "secondary tools" text link on Overview.
- **What it does:** runs the **GuaranteedCoverage** algorithm (`/recording-optimizer` endpoint): N recordings → all phrases via splicing; stats (Total LEGOs, Phrases, Direct, Est. time, Reduction %); CTA into Recording Studio; "LEGO Audio Synthesis" demo; recording script preview; coverage ring; "Quality Progression" roadmap; "Flagged Splices" queue.
- **Jargon:** GuaranteedCoverage, Direct, Reduction %, "spliced", LEGOs.
- **Dead-ends/stubs (many, all verified in code):**
  - The synthesis demo is **hard-coded Welsh** (`dw i ddim isio siarad Cymraeg rŵan`, seeds 1/6/11, `frankenstein-demo` endpoint) — a Macedonian leader watches a Welsh magic trick.
  - `recordedCount = ref(0) // TODO: fetch from audio inventory`; `splicedCount = 0`; coverage ring is therefore always 0% recorded/0% spliced.
  - `flaggedPhrases = ref([])` with comment "to be fetged from flags system" — never fetched; "Flagged Splices" is permanently empty.
  - "Export PDF" button is `disabled` with `title="Not implemented yet"`.
  - Script preview renders `{{ phrase.source }}` but the mapper never sets `.source` → always blank (and uses the banned word as a field name).
  - The CTA routes to the *old* Recording Studio, not Autocue — the two recording flows disagree about who owns this script.
- **Verdict:** **The promise is the product** ("record ~150 → cover 1,500 phrases") **but the page is half demo, half TODO.** This confirms the planned-not-executable status of the synthesis loop end-to-end: the optimizer computes the script, Autocue records it, and then nothing splices.

## 12. `/production/:courseCode/calibration-review` (`CalibrationReview.vue`)

- **Nav label:** none in production suite; linked from `CourseManager.vue` (the separate `/course/:courseCode` page, itself barely reachable).
- **What it does:** human review of the first ~10 "golden seeds" the calibration agent submits (`/api/golden/review-queue`). Approve (A) / Redo (R) with notes, keyboard nav, 15 s polling.
- **Verdict:** **Needed early in a build** (it's how the leader steers the agent's style before 300 seeds get built wrong) — but it is orphaned exactly when a newcomer needs it. "Calibration", "golden seeds", "attempt 2" all unexplained.

## 13. `/production/:courseCode/qa-review` (`QAReview.vue`)

- **Nav label:** none; linked only from CourseManager's pipeline stage button.
- **What it does:** open QA flags by check_type, dismiss-as-false-positive, then one button: **"Approve & Continue Pipeline"** (deletes non-dismissed flagged phrases and unblocks the pipeline).
- **Verdict:** overlaps heavily with PhraseQA (same flags, different verbs). One of the two is **noise**; the approve-gate behaviour belongs in whichever survives.

## 14–16. `pods`, `pods/:slug`, `canonical/:slug` (`PodsView`, `PodDetailView`, `CanonicalPodView`)

- **Nav label:** Overview card "Listening Pods — Layer 2 podcast content"; canonical scenarios linked from within.
- **What they do:** generate/flex Layer-2 listening pods from canonical scenarios, regenerate pod audio and explainer audio (admin endpoints), edit pod sentences, view canonical pod lines.
- **Jargon:** pods, Layer 2, "flex from canonical", explainers, pod-0.
- **Verdict:** **Optional/later** for a community course (listening content is a layer on top of a working course); the "wipe all sentences + audio and re-flex" button is another precious-audio hazard sitting one click deep.

---

## Cross-cutting findings

1. **The live nav covers 5 of 16 flows.** The dead `ProductionNav.vue` actually had a better map (it included Seeds and Phrase QA). The router-mounted `ProductionLayout` has no nav of its own; AppNavbar's hard-coded 5 tabs are the real information architecture.
2. **Four flows are URL-only orphans** in the live UI: `phrase-qa`, `feedback`, and (production-suite-side) `calibration-review`, `qa-review`.
3. **Two parallel recording studios** (Autocue vs RecordingStudio) and **two parallel text-QA pages** (PhraseQA vs QAReview) — for a team of non-expert helpers this is the single biggest "which door?" problem.
4. **The ≥2-human-voices requirement cannot be met as built:** Mode 1 is target1-only; no upload path captures who is speaking; RecordingStudio collapses everyone to `human_<courseCode>`.
5. **Record→synthesize is a cliff:** optimizer computes the script, autocue records and uploads it, and no UI step aligns/splices/links the human audio into the course (matches the known CLI-only gap). Meanwhile AudioPipeline happily TTS-regenerates the same roles.
6. **Hard-coded SSi-canon assumptions:** 668/300 seed counts, 6-language gender list, S0001–S0050 default windows, Welsh demo data, "Canonical English".
7. **Banned-word leaks:** "Known (Source language)" in AudioPipeline's role dropdown; `phrase.source` field in RecordingOptimizer.
8. **Auth is flat and unscoped at the router** — `canAccessCourse` exists but is not enforced on `/production/*` navigation.

---

## Proposed minimal "leader's journey" (existing flows only)

1. **Create** — `/production/new/text`: pick known (fra) + target (mkd), Create Course.
2. **Translate** — `/production/mkd_for_fra/text`: Stage 1 Translate (agent), watch progress.
3. **Steer** — `/production/mkd_for_fra/calibration-review`: approve/redo the first golden seeds *(needs a link from Text/Overview)*.
4. **Decompose/build** — `text`: Stage 2 Build Team → Stage 3 Final Pass wizard (backfill/redo/review/approve) → Verify Components → ZUT check/resolve.
5. **Verify text** — `qa-review` (or `phrase-qa` — pick ONE): dismiss false positives, approve & continue.
6. **Hear it early** — `script?view=journey`: play rounds, inline-edit phrases (auto-regen), flag bad audio.
7. **Plan recording** — `recording-optimizer`: run GuaranteedCoverage, see the ~N-phrase script.
8. **Record voice 1** — `recording` (Autocue Mode 1 → target1), team helper(s) record.
9. **Record voice 2** — `recording` (Autocue Mode 2 → role target2) *(today the only way to a second voice; needs first-class support)*.
10. **Fill gaps with TTS** — `pipeline`: configure voices, generate missing known/presentation audio *(never regenerate roles holding human audio)*.
11. **QA audio** — nav "QA" (`script?filter=flagged`) → fix via re-record (human) or regen queue (TTS).
12. **Publish** — Overview: status pill Testing → Beta → Live; "Open Learning App" to confirm.
13. **Post-launch** — `feedback`: triage learner reports *(needs a link)*.

Missing rung (not a flow today): **synthesize** — align/segment/splice human recordings into phrase audio between steps 9 and 10.

## Flows a recording-only helper should never see

- `text` (agent pipeline, chat, reset-translations), `seeds` (edit/approve translations)
- `phrase-qa`, `qa-review`, `calibration-review` (content QA and pipeline gates)
- `pipeline` (TTS generation/regeneration, cost controls — one click here can overwrite their own recordings)
- `pods`, `pods/:slug`, `canonical/:slug` (incl. the wipe-and-reflex button)
- `feedback`, `recording-optimizer` stats/planning (leader concern), Overview's status/pricing pills, "Export Legacy", "Run QA Audit", Listening Config
- Everything outside the course: `/` pipeline board of all courses, `/courses`, `/users`, `/admin/listening`, `/maintenance`, `/insights`, `/jobs`, `/monitor`

A recording helper needs exactly: `recording` (Autocue, with their voice + role pre-assigned) and a read-only `script` player to hear what they recorded. Nothing else.
