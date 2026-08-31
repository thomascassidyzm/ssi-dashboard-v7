# On-brand token bypass census — 2026-08-31

Scope: `src/` (303 vue/css/js/ts files), `public/*.html`, `labs/`. Excludes `src/components/production/autocue/**`,
`src/views/admin/BasketLab.vue`, `labs/basket-lab/server.cjs` from fixing (sibling-owned right now) — findings in
those are listed, tagged "owned by sibling, not fixed here", not fixed.

No fan-out was available for this run (this worker was already at the fan-out depth cap), so the whole census —
grep, classification, sampling, and fixes — was done in-turn by one session rather than parallel workers.

## Method
Hex/rgb/hsl literals were extracted estate-wide with grep, then classified by a small script against the ten
dark-mode token values in `src/style.css` (`--canvas #0f172a`, `--surface #1e293b`, `--surface-2/--line #334155`,
`--surface-3 #475569`, `--ink #f1f5f9`, `--muted #94a3b8`, `--faint #64748b`, `--accent #ffa630`,
`--accent-2/--success #34d399`, `--danger #f87171`), tracking comment-stripping and `:root[data-theme="light"]`
selector scope so genuine light-mode AA overrides (which correctly use *different*, darkened values) aren't
mis-flagged as bypasses. A sample of the unmatched bucket was hand-read for false positives.

## A. Hard-coded colours

**Raw grep volume**: 1,617 hex-literal lines + 614 rgb/rgba/hsl lines = 2,231 across 134 files (before any filtering).

**After stripping comments and light-theme-scoped overrides**: 1,457 real hex hits across 119 files, of which:
- **71 were exact, unscoped matches of a dark-mode token value** — the clean "cheap fix" bucket (A-i).
- **8 were `var(--nonexistent-token, #hex)` dangerous fallbacks** (A-ii).
- **8 were light-scoped literals** that already have (or duplicate) a working `[data-theme="light"]` override — not violations, false positive.
- **1,370 had no exact token match** — real code, real hex, but off the *ten* semantic tokens (an extended ad-hoc
  palette: blue #1d4ed8/#60a5fa/#2563eb, purple/violet #7c3aed/#6d28d9/#a855f7, extra reds #b91c1c/#ef4444/#e63946,
  extra ambers #b45309/#fbbf24/#d97706, plus one-off greys). These are real A(i) findings but not mechanically
  "cheap" — no token exists for blue/purple, and several reds/ambers are deliberate AA-safe light-mode darkenings
  of the same hue family already correctly scoped. Judgment call, not a script.
- Of the 614 rgb/rgba/hsl lines, 526 are box-shadow/filter/drop-shadow or low-alpha (≤0.35) tints — legitimately
  glow/shadow use, not flagged. 88 are solid-ish rgba fills/borders (`solid_rgb` bucket below) — same off-palette
  story as the hex bucket (blue/purple/extra-red families), not exact-token matches.

**A(ii) dangerous fallbacks — `var(--nonexistent, #hex)`** (all 8, file:line):
- `src/views/RecordistRoom.vue:1027` `var(--surface-1, #f8fafc)` — **fixed** → `var(--surface)`
- `src/components/EnvironmentSwitcher.vue:522` `var(--fg, #f9fafb)` — **fixed** → `var(--ink)` (this is Tom's own example case)
- `src/views/admin/BasketLab.vue:125` `var(--text, #e5e7eb)` — **owned by sibling, not fixed here** (the exact `var(--text, #e5e7eb)` pattern named in the brief)
- `src/components/production/autocue/AutocueStudio.vue:1302` `var(--color-amber, #d9a441)` — owned by sibling
- `src/components/production/autocue/AutocueStudio.vue:1580,1581` `var(--color-crimson, #ff5c5c)` ×2 — owned by sibling
- `src/components/production/autocue/tutorial/VadStrip.vue:113,114` `var(--color-crimson, #ff5c5c)` ×2 — owned by sibling

**A(i) cheap fixes applied (65 edits, 23 files)** — exact unscoped dark-token-value literal → `var(--token)`,
dark mode pixel-identical, light mode now flips correctly:
- `src/assets/ui-tokens.css:183,185`
- `src/components/AudioPreviewPlayer.vue:644`, `src/components/IntroductionsViewer.vue:369`
- `src/views/CourseCompilation.vue:684,685,689,693,695`
- `src/views/ListeningConfig.vue:916,964,1121(×2),1303,1304`
- `src/views/PodDetailView.vue:840,841,859`
- `src/views/PodScriptsView.vue:768,772,799,812,814,817,818`
- `src/views/PodThinkingDoc.vue:113`, `src/views/PodThinkingIndex.vue:197`
- `src/views/PodsView.vue:429,445`, `src/views/UserManagement.vue:249`
- `src/views/admin/PodLab.vue:3574,3734,3878`
- `src/views/admin/SpeakingConfig.vue:733,772,1000(×2),1002`
- `src/views/admin/VadLab.vue:1339,1388,1394,1446`
- `src/views/admin/voicelab/EstatePanels.vue:491,492`
- `src/views/admin/voicelab/PlayPanel.vue:759,760,767,768,778`
- `src/views/admin/voicelab/lab.css:87,88,125(×2),126(×2)`
- `src/views/production/PhraseQA.vue:350,502,522,551(×2)`
- `src/views/production/ProductionOverview.vue:617,742,757,952`
- `src/views/production/SeedEditor.vue:656`
- `src/views/production/components/SharedAudio.vue:188,190`

**Deliberately left un-fixed** (real findings, listed not fixed):
- All 1,370 off-palette (no-exact-token) hits — no mechanical mapping exists; the biggest sub-pattern is a
  second, unofficial "status" palette (blue=info, purple/violet=special, plus extra red/amber shades) used for
  pills and badges across ~40 files, most consistently in `src/views/PodDetailView.vue`, `src/views/CourseManager.vue`,
  `src/views/CourseBrowser.vue`, `src/components/VoiceConfiguration.vue`, `src/assets/ui-tokens.css` (`.ui-hue-warn`/`.ui-hue-info`
  are literally named as a 5-hue system — good/warn/bad/info/quiet — but only 2 of those 5 hues, good & bad, live
  in the house token set). This is a genuine design decision (does "info" get a token? does the house palette grow
  a blue?), not a fix a script should make. **[NEEDS TOM: does the token set grow a 5th/6th semantic colour for
  info/special, or does everything off-palette get remapped onto amber/green/danger?]**
- `src/utils/ColorMapper.js:9-95` (8-colour `LEGO_COLORS` cycling palette) — legitimate categorical/data-viz use
  (need N visually distinct hues to tell LEGO pairs apart), not a token bypass. False positive, left alone.
- `src/utils/podRecordingPlan.js:246-253` (`SPEAKER_PALETTE`, 6 hex incl. `#ffa630` which happens to equal
  `--accent`) — same category, decorative multi-hue palette for distinguishing speakers, not brand chrome. Left alone.
- `src/components/VoiceConfiguration.vue:1910-1920` — provider/gender colour-coding (azure=blue, elevenlabs=violet,
  male/female) is a deliberate categorical system, arguably legitimate like the above, arguably off-brand. Judgment call, listed not fixed.
- `src/views/PodScriptsView.vue:764,801,809` — `rgb(var(--line, 63 63 70) / 1)`. `--line` is a real token but is
  defined in `style.css` as a **hex string** (`#334155`), not a space-separated RGB triplet, so `rgb(var(--line) / 1)`
  is invalid CSS and this almost certainly always renders the literal fallback `63 63 70` (≈ `#3f3f46`), never the
  real token, in both themes. This is a real bug, but fixing it means picking a new value or rewriting `--line`'s
  format estate-wide — out of "cheap fix" scope, flagged for a real look.
- The 8 light-scoped literals (e.g. `src/views/RecordistRoom.vue` area, `ui-tokens.css:193`) — already correct,
  intentionally different values under `[data-theme="light"]`, not touched.

**False-positive rate**: of a random 50-line sample of the 1,370 unmatched hits, 0 were comments or SVG-path
noise (already stripped upstream), ~2 were legitimate categorical palettes (ColorMapper.js-style), the rest
(~96%) were real off-token hex in real CSS/style blocks — mostly deliberate AA-safe light-mode darkenings of an
extended, undocumented palette. So: **the raw grep count overstates true noise (a lot of it is comments/duplicated
mentions), but the *filtered* 1,370 figure is overwhelmingly real** — this estate's colour drift is broad, not a
measurement artifact.

## B. Local font stacks

`--font-display 'Crimson Pro'`, `--font-ui 'Josefin Sans'`, `--font-mono 'IBM Plex Mono'` are defined once in
`src/style.css`. Raw literal (non-`var()`) uses of those three family names elsewhere: **25 files**, all `font-family: 'Josefin Sans', sans-serif` / `'IBM Plex Mono', monospace` / `'Crimson Pro', serif` hard-typed instead
of `var(--font-ui, …)` etc. Non-sibling-owned (fix candidates for a follow-up pass, left un-fixed here — font
swaps are a visible typography change, out of "cheap and safe" scope):
- `src/components/production/qa/StatusBadge.vue:51`
- `src/components/production/audio/PipelineItem.vue:144,173,182,214,228,268,288`
- `src/views/AdminRecording.vue:156,174,175,194,196`
- `src/views/production/CalibrationReview.vue:367`
- `src/views/RecordRoom.vue:460,469,491,520,547,604,627`
- `src/views/RecordistRoom.vue:841,842,857,876,883,900` (+ more — 22 hits, this file is one of the worst B offenders)

19 files under `src/components/production/autocue/**` also hard-type these families — owned by sibling, not fixed,
listed here as `src/components/production/autocue/{AutocueStudio,ModeSelector,PodLongTakeStudio,RawVsProcessed,
TutorialStudio,RoleSelector,StoredTakeButton,recording/{ChunkProgress,RecordingControls,RecordingStatus,
SlowReadRetry},review/{SegmentCard,SessionReview},teleprompter/PhraseCard,tutorial/{BeatWindowDiagram,
TutorialCoach,TutorialHint,TutorialProgress,VadStrip}}.vue`.

**Monospace-on-body-copy**: not found as a distinct violation — every monospace use sampled (IDs, codes, `.lang-code`,
counters) is genuinely code/ID-shaped content, not prose. `src/views/HtwCopyEditor.vue:189` and
`src/views/CopyEditor.vue:414` use a local `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` stack —
real local stack (B), but on what looks like a monospaced text-diff editor, i.e. legitimately code-like content,
not body prose. Listed, not flagged as clunky.

**`src/views/hub.css:21`**: `font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif` — this is the
*house* card view's own CSS re-declaring the base font stack locally instead of inheriting the root `Inter,
system-ui, Avenir, Helvetica, Arial, sans-serif` from `style.css`. Same font, different fallback chain — cosmetic
drift in the reference file itself, worth a one-line fix but left for the styling owner to confirm intent.

**`src/App.vue:30`, `src/views/PodThinkingDoc.vue:119,166`**: bare `font-family: monospace;` (no `--font-mono`
token, no OS stack) — smallest possible violation, 3 hits.

## C. One-off spacing and shape (capped, worst 40 not exceeded — 24 listed)

House `border-radius` scale, read off `hub.css`/`ui-tokens.css`/`ConfigsIndex.vue`: **8px/10px/16px** for cards,
**999px/9999px/50%/100px** for pills, **0.5rem/0.375rem** in the shared `ui-tokens.css` utility classes.
Estate-wide distribution is much wider: 6px×123, 4px×85, 3px×40, 5px×18, 12px×32, 2px×11, 1px×7, 14px×13, 9px×4,
20px×2, plus scattered oddly-specific fractional rems. The worst (a designer's eye would flag these — off-scale,
often the *only* instance of that exact radius in the whole estate):
- `src/views/production/components/LearningJourneyView.vue:1591,1712` — `0.1875rem` (3px, no other rem-radius in the estate is this granular)
- `src/components/ReleaseNotesTrigger.vue:104` — `0.4rem`
- `src/views/CourseBrowser.vue:796,808` — `0.55rem` (×2, own one-off value)
- `src/views/Insights.vue:104,111` / `src/components/ReleaseNotesTrigger.vue:98` — `0.6rem`
- `src/views/CourseBrowser.vue:781` — `0.6rem` too — 4 different files independently invented `0.6rem`
- `src/views/CourseBrowser.vue:760` — `0.85rem`
- `src/views/production/GermanSpeedCheck.vue:216,233`, `src/components/AppNavbar.vue:536`,
  `src/components/production/autocue/recording/SlowReadRetry.vue:184` (sibling-owned) — `9px`
- `src/views/admin/PodLab.vue:3799` — `7px`
- `src/components/VoiceConfiguration.vue:1867` — `11px`
- `src/views/RecordistRoom.vue:966,974`, `src/components/production/autocue/PodLongTakeStudio.vue:883,891` (sibling-owned),
  `src/components/production/autocue/recording/ChunkProgress.vue:110` (sibling-owned) — `14px`
- `src/components/production/autocue/teleprompter/TeleprompterDisplay.vue:90` (sibling-owned),
  `src/components/LearningCyclePlayer.vue:722` — `20px`
- `src/views/admin/VadLab.vue:1386,1399`, `src/components/production/autocue/OnAirMeter.vue:142` (sibling-owned),
  `src/components/generation/SeedProgressGrid.vue:388,394,505,583` — `1px` (tick marks — plausibly intentional, listed not judged wrong)

Not fixed — a radius/spacing swap is a visible layout change per the brief's own "cheap = provably safe" bar,
and there's no single obvious "correct" replacement value the way there was for the ten colour tokens.

## D. Bespoke navigation

House breadcrumb pattern (`ConfigsIndex.vue:11-17`) uses `.admin-crumbs`/`.crumb-link`/`.crumb-here` classes
(not a component named "Breadcrumb" — the census had to search for "crumb", not "breadcrumb").

Of **72 routed views** in `src/views/`, only **11 files** reference crumb markup at all: `ConfigsIndex.vue`,
`SpeakingConfig.vue`, `VadLab.vue`, `PodsView.vue`, `PodScriptsView.vue`, `PodDetailView.vue`,
`CanonicalPodView.vue`, `ListeningConfig.vue`, `ScriptLabView.vue`, `ScriptLabScriptView.vue`, `MetagraphView.vue`,
and `BasketLab.vue` (sibling-owned). **61 top-level, routed views have no breadcrumb trail at all** — this is
the norm, not the exception. Full list is in the census script output; worst-trafficked examples: `Home.vue`,
`Admin.vue`, `Maintenance.vue`, `CourseBrowser.vue`, `CourseManager.vue`, `JobsMonitor.vue`, all of
`src/views/production/*.vue` except none.

**22 views use a bespoke "back" link/button instead of a breadcrumb trail** (file:line is the file, exact line
varies by match — grep flagged the file, not one line, since several have multiple back-link spots):
`UserManagement.vue`, `JobsMonitor.vue`, `CourseCompilation.vue`, `CourseBrowser.vue`, `CourseProgress.vue`,
`HtwCopyEditor.vue`, `CourseValidator.vue`, `production/SeedEditor.vue`, `RecursiveUpregulation.vue`,
`RecordistRoom.vue`, `RecordRoom.vue`, `production/AudioPreview.vue`, `production/ScriptViewer.vue`,
`CopyEditor.vue`, `CourseEditor.vue`, `ScriptLabView.vue` (has both a back-link AND crumb markup — mixed),
`production/SynthesisStudio.vue`, `admin/CaptureAB.vue`, `production/ProductionOverview.vue`,
`production/UserFeedback.vue`, `production/components/LearningJourneyView.vue`, `production/TextGeneration.vue`.

**Machine-name titles**: not exhaustively audited (would need per-page eyeballing of rendered `<h1>`/title text,
not greppable) — spot-checked `VadLab`, `PodLab`, `BasketLab`, `HtwCopyEditor`, `CaptureAB` as route/component
names; several (`VadLab`, `CaptureAB`) read as internal tool names in the sidebar nav too, worth a look, but this
needs eyes on the running app, which the brief scoped this census away from (no build). **[flagged, not verified]**

## Top-15 worst offenders (colour hits only, hex+rgb combined, post-comment-strip)

| # | File | Hits |
|---|------|------|
| 1 | `src/views/ListeningConfig.vue` | 88 |
| 2 | `src/components/CoursePipelineBoard.vue` | 87 |
| 3 | `src/views/Maintenance.vue` | 84 |
| 4 | `src/views/PodDetailView.vue` | 76 |
| 5 | `src/views/admin/SpeakingConfig.vue` | 71 |
| 6 | `src/views/production/ProductionOverview.vue` | 53 |
| 7 | `src/views/admin/VadLab.vue` | 52 |
| 8 | `src/views/PodScriptsView.vue` | 46 |
| 9 | `src/views/PodsView.vue` | 45 |
| 10 | `src/views/CourseBrowser.vue` | 44 |
| 11 | `src/views/CourseCompilation.vue` | 42 |
| 12 | `src/views/production/GermanSpeedCheck.vue` | 41 |
| 13 | `src/views/admin/PodLab.vue` | 39 |
| 14 | `src/views/production/PhraseQA.vue` | 36 |
| 15 | `src/views/Pedagogy.vue` | 36 |

(`src/components/production/autocue/PodLongTakeStudio.vue` at 82 hits and `src/views/admin/BasketLab.vue` are
excluded from this table as sibling-owned/already being fixed — they would otherwise rank #2 and lower.)

## What fraction of raw hits were real (not false positives)

Raw grep: 2,231 hex+rgb lines. After stripping comments and legitimate light-theme-scoped overrides: 1,457 hex
+ 88 solid-rgb = **1,545 real code-level hits, ≈69% of the raw count**. Of *those*, a 50-line random sample of
the largest bucket (off-palette, no exact token) found ~96% genuinely real (off-brand-but-real colour code);
the ~4% false positives were legitimate multi-hue categorical palettes (`ColorMapper.js`, `podRecordingPlan.js`).
So: **roughly two-thirds of the raw grep noise was real duplication/comment noise worth discounting, but the
surviving ~1,500 hits are themselves ~96% real findings, not measurement artifacts.**

## What was fixed vs left

- **Fixed**: 65 hard-coded-colour → token edits across 23 files (category A-i, all exact unscoped dark-token
  matches), plus 2 dangerous `var(--fake-token, #hex)` fallbacks repaired to real tokens
  (`RecordistRoom.vue`, `EnvironmentSwitcher.vue`). 0 category B/C/D fixes — none of those met the "provably
  safe, doesn't change what a page looks like" bar; all are listed for a deliberate follow-up pass.
- **Left, with reason**: ~1,370 off-palette colour hits (no single correct token — needs Tom's ruling on whether
  the token set grows); 6 dangerous fallbacks in sibling-owned files (not touched, listed); 25 files' worth of
  hard-typed font families (visible typography change, not "cheap"); the whole of category C (radius/spacing —
  no single correct replacement value); the whole of category D (breadcrumb rollout is a real feature, not a
  token swap).

## Honest read

This is **not** "mostly on-token with two outliers." The two outliers (autocue, BasketLab) are real and probably
the worst *single-file* offenders, but they sit on top of broad, estate-wide drift: 61 of 72 routed views have no
breadcrumb at all, 25 files hard-type the three named font families instead of the tokens defined for exactly that
purpose, and — the biggest number — well over a thousand real hex/rgba literals implement a *second, unofficial
status palette* (blue for info, purple/violet for "special", several extra reds and ambers) that the ten-token
house system was never extended to cover. The cheap, safe, mechanical fixes (65 edits) only touched literals that
happened to exactly duplicate an existing token's dark value — a small, clean slice of the problem. The larger
finding is that fixing this properly needs a design decision, not a script: does the token set grow (an `--info`
blue, at minimum — it's used constantly for the same meaning across dozens of files), or does the whole
info/special palette get retired onto amber/green/danger? Until that's answered, most of this estate's colour
code will keep being individually-authored per file rather than drawing from one system, in both dark and light
mode.

## Branch

Pushed to `feat/on-brand-census-2026-08-31`. Nothing merged — not merged to `main`, not deployed anywhere. This
is a worktree branch with 23 files' worth of colour-token fixes plus this document, waiting for review.
