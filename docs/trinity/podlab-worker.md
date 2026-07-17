# Pod Lab — Trinity Compliance Audit

> **Scope**: `src/views/admin/PodLab.vue` (2008 lines) at route `/admin/configs/pods` (`src/router/index.js:461-463`).
> Covers both current modes on the same screen: **The ladder** (`mode==='shapes'`, the current default — unified S-LEGO fusion climb + speed cascade, per founder ruling 2026-07-17) and **Stage arc** (`mode==='arc'`, live-engine comparison via `composeSentenceArc`). Numbering is local to this section (starts at 1); merge into the house doc's running numbering when assembled.
> Read in full per the campaign brief's evidence standard — every message below cites the line(s) that implement it.

---

## Screen: Pod Lab (`/admin/configs/pods`)

### Header, safety notice, course picker

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→User | Display breadcrumb "Configs / Pod Lab" (`PodLab.vue:1129-1133`) |
| 2 | App→User | Display page title "Pod Lab" + explanatory subtitle describing the ladder vs stage-arc modes (`:1136-1142`) |
| 3 | App→User | Display safety notice: "Preview & export only — this Lab never writes `algorithm_config`…" (`:1143-1146`) |
| 4 | App→User | Display `CoursePicker` component for course search/select (`:1150-1154`) |
| 5 | User→App | Type/select a course in `CoursePicker` (delegated to that component — not audited here) |
| 6 | App→App | `onCoursePick(code)` fires on `update:modelValue`; sets `selectedCourseCode`, calls `loadCourse(code)` if code truthy (`:183-186`) |
| 7 | App→User | Show "loading…" chip while `loading` is true (`:1155`) |
| 8 | App→User | Show "{N} lines · pod-0" chip once sentences load (`:1156`) |
| 9 | App→User | Show error chip with `error.value` text when set (`:1157`) |
| 10 | App→App | `loadCourse()`: query `listening_pod_sentences` for `pod_id = {courseCode}:pod-0`, ordered by `global_order` (`:198-205`) |
| 11 | App→App | `loadCourse()`: load Stage-0 clip/gloss maps via `loadStage0ClipMaps(sb, courseCode)` — the same core function the learner engine uses (`:210-212`) |
| 12 | App→App | `loadCourse()`: query `course_audio` for `role='pod_fine_known'` rows → build `fineKnownMap` keyed by normalized text (`:216-221`) |
| 13 | App→User | On zero sentences: set `error.value = "No pod sentences found for {course}:pod-0."` (`:223`) — validated, reaches the error chip (msg 9) |
| 14 | App→User | On any Supabase/query exception: `error.value = e.message` (`:224-225`) — validated, reaches the error chip |
| 15 | App→App | `loadLiveConfig()` runs on mount (`:1124`): `fetch('/api/algorithm-config')`, populates `liveStage0`/`liveStagePlaylist` if the response shape matches |
| 16 | App→App | `loadLiveConfig()` always calls `applyPreset('live')` after the fetch attempt (success or failure) so the JSON editors are seeded either way (`:180`, comment `:178-179`) |

### Left panel — Lines list & selected-line card

| # | Direction | Message |
|---|-----------|---------|
| 17 | App→User | Display "Lines — seams & rung depth at a glance" label (`:1164`) |
| 18 | App→User | Display one row per sentence: `global_order` number, rung-depth badge (`sentenceRungDepth(s)`, only if non-null), target text with inline seam marks (`|`) at every canon `…` (`:1166-1180`, `seamPreviewParts` `:514-517`) |
| 19 | User→App | Click a line row → `selectedIdx = i` (`:1171`) |
| 20 | App→App | `watch([selectedIdx, sentences], initSeamEditor)` re-derives the seam editor state for the newly selected line (`:1097`) |
| 21 | App→App | `watch(selectedIdx, stop)` halts any in-progress playback when the selected line changes (`:1122`) |
| 22 | App→User | Display selected line's known (English) text (`:1185`) |
| 23 | App→User | Display atom count "{N} atom(s)" (`:1186-1187`, `atomCount` computed `:156-159`) |
| 24 | App→User | Display " · no explainer clip" note if `explainer_audio_id` falsy (`:1188`) |
| 25 | App→User | Display " · glues on" note if `glue_to_next` truthy (`:1189`) |

### Left panel — Seam editor (mode = "shapes", the default/current ladder view)

| # | Direction | Message |
|---|-----------|---------|
| 26 | App→User | Display "Review seams — `\|` canon, click to remove or relocate" label (`:1197`) |
| 27 | App→User | Display "Save review" button, disabled unless `seamDirty && !seamSaving`; label flips to "Saving…" while in flight (`:1198-1200`) |
| 28 | App→App | `initSeamEditor()` tokenizes `target_text`, computes the canon seam set from `…` marks, and — if a saved `atom_map_fine` exists — reconciles it against current tokens via `seamsFromUnits` (`:956-982`) |
| 29 | App→User | If the saved override no longer tiles against current text, show `seamMsg = "saved seam review no longer matches this text — showing canon seams"` and fall back to pure canon (`:977-979`) |
| 30 | App→User | Render each token, and between tokens a seam-state glyph: `‖` locked (punctuation), `\|` on/moved, `·` open (`:1202-1214`, `seamGlyph` `:1045-1050`) |
| 31 | App→User | Hover title per seam explains its state and the click action ("canon S-LEGO seam — click to remove", etc.) (`seamTitle` `:1051-1058`) |
| 32 | User→App | Click a non-locked seam glyph → `toggleSeam(i)` (`:1205-1213`) |
| 33 | App→App | `toggleSeam`: on a canon gap, toggles it into/out of `removedCanon`; on a non-canon gap, moves a removed seam there IF `addedOverride.size < removedCanon.size`, else refuses (`:1015-1038`) |
| 34 | App→User | If the move budget is exhausted, show `seamMsg = "move budget used — remove a canon seam first to relocate it here"` and do NOT apply the click (`:1029-1031`) |
| 35 | App→App | After every toggle, `deriveUnits(prevUnits)` recomputes the unit list from `effectiveOn()` per gap, carrying forward glosses on unchanged ranges and joining glosses on merges (`:990-1008`) |
| 36 | App→App | Toggling sets `seamDirty = true`, enabling the Save button (`:1037`) |
| 37 | App→User | Display one row per derived unit: surface text + editable gloss `<input>` (`:1216-1225`) |
| 38 | User→App | Type in a unit's gloss input → `v-model="u.gloss"`, sets `seamDirty = true` on `@input` (`:1219-1224`) |
| 39 | App→User | Display `seamMsg` as a chip, styled as an error (red) specifically when it starts with "Save failed" (`:1227`) |
| 40 | User→App | Click "Save review" → `saveFineMap()` (`:1198`) |
| 41 | App→App | `saveFineMap`: require an active Supabase session, else throw "no session — sign in" (`:1067-1068`) |
| 42 | App→App | `saveFineMap`: build the `atom_map_fine` payload (kind/gloss/lego_key/target_surface per unit) and `PATCH /api/pod-fine-map` with a bearer token (`:1069-1084`) |
| 43 | App→User | On success: `seamMsg = "Saved ✓ {N} units ({R} removed, {M} moved)"`, `seamDirty = false` (`:1087-1089`) |
| 44 | App→User | On failure (non-OK response or thrown error): `seamMsg = "Save failed: {message}"` (`:1090-1091`) — reaches msg 39's error styling |
| 45 | App→User | `seamSaving` flips back to false in `finally`, re-enabling the button / restoring its label (`:1092-1094`) |

### Left panel — Ladder config (mode = "arc", live-engine comparison)

| # | Direction | Message |
|---|-----------|---------|
| 46 | App→User | Display "Ladder config" label + preset buttons "Live" / "Proposed (07-01)"; a "custom" chip appears once the JSON is hand-edited (`:1231-1239`) |
| 47 | User→App | Click "Live" preset → `applyPreset('live')`: copies `liveStage0`/`liveStagePlaylist` into the lab config (`:1234-1236`) |
| 48 | User→App | Click "Proposed (07-01)" preset → `applyPreset('proposed')`: clones live Stage-0 but forces every tier's `visits=2`, and swaps in the hardcoded `PROPOSED_STAGE_PLAYLIST` (`:237-245`) |
| 49 | App→App | Either preset click calls `syncJsonFromConfig()`, re-serializing both JSON editors and clearing `jsonError` (`:246`, `:249-254`) |
| 50 | App→User | Display "Stages 1–N · stagePlaylist" JSON `<textarea>`, editable (`:1244-1250`) |
| 51 | User→App | Edit the stagePlaylist JSON textarea → `onPlaylistJsonInput()` on every keystroke (`:1249`) |
| 52 | App→App | `onPlaylistJsonInput`: `JSON.parse` the textarea; on success, replaces `labStagePlaylist` and sets `activePreset='custom'`; on parse failure, sets `jsonError.playlist = e.message` and leaves the last valid config in place (`:256-265`) |
| 53 | App→User | Show `jsonError.playlist` as an error chip under the textarea when parsing fails (`:1251`) |
| 54 | App→User | Display collapsible "Stage 0 config (advanced)" `<details>` with explanatory note about `visits`/`durations`/`gaps` (`:1254-1260`) |
| 55 | User→App | Edit the Stage-0 JSON textarea → `onStage0JsonInput()` (`:1266`, `:1261-1267`) |
| 56 | App→App | Same parse/error pattern as msg 52, targeting `labStage0` / `jsonError.stage0` (`:266-275`) |
| 57 | App→User | Show `jsonError.stage0` as an error chip (`:1268`) |
| 58 | User→App | Click "Copy tuned config JSON" → `exportJson()` (`:1271-1273`) |
| 59 | App→App | `exportJson`: builds `{stage0, pods:{stagePlaylist}}` and writes it to the clipboard (`:277-286`) |
| 60 | App→User | On clipboard-write resolution: button label flips to "Copied ✓" for 1.6s (`:283-284`, `:1272`) |

### Right panel — Mode switch & shared transport

| # | Direction | Message |
|---|-----------|---------|
| 61 | App→User | Display mode-switch buttons "The ladder" / "Stage arc (live engine)", active one highlighted (`:1280-1281`) |
| 62 | User→App | Click a mode button → `mode = 'shapes'` or `mode = 'arc'` (`:1280-1281`) |
| 63 | App→User | Display "■ Stop" button, disabled unless `isPlaying` (`:1282`) |
| 64 | User→App | Click "■ Stop" → `stop()`: increments `stopToken` (invalidating any in-flight `playPlays`/`playShapeSteps` loop), pauses `currentAudio`, resets `isPlaying`/`playingIdx`/`playingStepKey` (`:342-351`) |

### Right panel — Stage arc (mode = "arc")

| # | Direction | Message |
|---|-----------|---------|
| 65 | App→App | `arc` computed: calls `composeSentenceArc(s, s.global_order, {...})` — the real learner-engine function — inside a try/catch; on throw, `console.warn`s and returns `[]` (`:115-134`) |
| 66 | App→User | Display "▶ Play whole arc" button, disabled when `arc.length === 0` (`:1288`) |
| 67 | App→User | Display role legend: T target / K known / Ex explainer chips (`:1289-1293`) |
| 68 | App→User | Display "No arc — the line has no target audio, or the config produced no plays." when `arc.length === 0` (`:1296-1298`) |
| 69 | User→App | Click "▶ Play whole arc" → `playWholeArc()` → `playPlays(arc.value)` (`:339`) |
| 70 | App→User | Display one `stage-row` per grouped stage (Stage 0 sub-grouped by tier, then Stage 1..N), each with a mini "▶" play-group button and a stage label (`:1300-1304`, grouping logic `groups` computed `:137-154`) |
| 71 | User→App | Click a stage's mini "▶" → `playGroup(g)` → `playPlays(g.plays)` (`:1302`, `:340`) |
| 72 | App→User | Display one `playchip` per play in the stage: role short-code (T/K/Ex) + speed (`{speed}×`), highlighted (`now`) while it's the currently-playing index (`:1306-1316`) |
| 73 | User→App | Click a playchip → `playOne(p)` → `playPlays([p])` (`:1312`, `:341`) |
| 74 | App→App | `playPlays`: sequentially awaits `playClip(audioId, speed)` then a gap (`p.gapAfterMs` or 350ms default) per play, tracking a `stopToken` so a `stop()`/mode-switch mid-sequence aborts cleanly (`:323-338`) |
| 75 | App→App | `playClip`: constructs an `Audio` element against the learning-app's audio proxy (`AUDIO_BASE`), plays it (or a ms-slice of it via `startMs`/`endMs` + rAF polling), resolves on `onended` **or `onerror`** (`:288-321`) |

### Right panel — The ladder (mode = "shapes", current default)

| # | Direction | Message |
|---|-----------|---------|
| 76 | App→User | Display explanatory note: "Rungs fuse canon S-LEGO seams up to the whole turn… then the speed cascade to pure t@2×…" (`:1323-1326`) |
| 77 | App→User | Display collapsible "Options" `<details>` (`:1328`) |
| 78 | App→User | Inside Options, if `hasFine` (any line in the pod has a draft `atom_map_fine`): show "Content units: draft fine (Aran) / live atoms" toggle (`:1331-1336`) |
| 79 | User→App | Click a content-units toggle → `unitsSource = 'fine' \| 'live'` (`:1333-1336`) |
| 80 | App→User | Always show "Fusion: pairwise (Aran) / chained overlap (Tom)" toggle (`:1338-1344`) |
| 81 | User→App | Click a fusion toggle → `fusionMode = 'pairwise' \| 'chained'` (`:1339-1344`) |
| 82 | App→App | `shapeAtoms` computed re-resolves atoms via `resolveAtoms(map, glossMap, targetClipMap)` whenever `unitsSource`/selected line change, zipping in Take-G ms spans positionally (`:391-404`) |
| 83 | App→App | `ladderRungs` computed (`:551-857`) is the core derivation: splits the turn into sentence groups at terminal punctuation (`atomBoundaries`/`atomGroups`, `:457-482`), splits each group into S-LEGO spans at canon `…` seams only (`sLegoSpansFromBounds`, `:489-499`), builds a fusion ladder per group (`spanLadder`/`fuseSpans`, `:410-434`), then appends the sentence-conjoin rungs and the fixed engine-Stage-2–8 speed cascade (`:836-848`). **No try/catch** anywhere in this ~300-line computed — contrast with `arc` (msg 65) which is explicitly guarded. |
| 84 | App→App | Per-chunk audio resolution (`resolveChunkClips`, `:627-639`) falls back gracefully: exact ms-slice of a Take-G render → butted per-atom clips → whole-sentence clip → `{clips:[], hasAudio:false}` — "never silently nothing," per the code comment at `:617-626` |
| 85 | App→User | Display "▶ Play the whole climb" button, disabled when `ladderRungs.length === 0` (`:1349-1351`) |
| 86 | App→User | Display "{N} rungs" chip once rungs exist (`:1352`) |
| 87 | App→User | Display "This line has no atom_map — pick a line with atoms to audition the ladder." when `ladderRungs.length === 0` (`:1355-1357`) |
| 88 | User→App | Click "▶ Play the whole climb" → `playWholeClimb()` → `playShapeSteps(ladderRungs.flatMap(r => r.steps))` (`:859`) |
| 89 | App→User | Display one `shape-row` per rung: mini "▶" button, rung label (e.g. "Stage 0 · S-LEGO seams", "Stage {n} · fusion", "Stage {n} · the whole turn"), and a descriptive note (`:1359-1364`, labels built at `:794-813`, `:827-829`, `:840-844`) |
| 90 | User→App | Click a rung's mini "▶" → `playShapeSteps(rung.steps)` (`:1361`) |
| 91 | App→User | Display one `playchip` per step (t·k·t·t pattern), showing the step text and a "2×" badge when `rate===2`; highlighted while playing (`:1366-1391`) |
| 92 | App→User | **Disable** a step's playchip when `!st.hasAudio`, with title "no audio yet at this granularity — {text}" (`:1378-1387`) — the graceful-fallback contract from msg 84 surfaced as a real UI state, not a silent no-op |
| 93 | App→User | Style a step's playchip as `approx` (visually distinct, per CSS) when `st.approx && st.hasAudio` — i.e. the audio played will be a coarser/concatenated fallback, not the exact requested slice; tooltip appends "(fallback: coarser/concatenated clips)" (`:1374-1386`) |
| 94 | User→App | Click a playable step's chip → `playShapeSteps([st])` (`:1388`) |
| 95 | App→App | `playShapeSteps`: for each step, plays every clip in `st.clips` back-to-back (intra-fuse gap 120ms), then a gap after the step (500ms after a gloss, 700ms otherwise); respects the `stopToken` abort pattern (`:1099-1119`) |

### Bottom-of-screen empty states

| # | Direction | Message |
|---|-----------|---------|
| 96 | App→User | "No pod-0 for this course yet." when a course is picked, not loading, but `sentences.length === 0` (`:1398-1400`) |
| 97 | App→User | "Pick a course to load its pod." when no course is selected yet (`:1401`) |

---

## Findings

### Class 3 — MISSING TWIN (App→App process with no App→User failure message)

1. **`loadLiveConfig()` silently swallows fetch failures.** `PodLab.vue:162-181` — if `GET /api/algorithm-config` fails or throws, the catch block only `console.warn`s; the user is never told the Lab is auditioning against hardcoded fallback constants (`DEFAULT_STAGE0`/`FALLBACK_STAGE_PLAYLIST`) instead of the real live config. Given the whole screen's stated purpose is "tune starting from the live config," this is a meaningful silent divergence — a tuning session could proceed on stale/wrong baseline data with zero indication. **Worst finding on this screen.**

2. **`exportJson()`'s clipboard write has no failure path.** `PodLab.vue:277-286` — `navigator.clipboard.writeText(...).then(...)` has no `.catch`; if the browser denies clipboard permission (common in non-HTTPS/embedded contexts) the button simply never shows "Copied ✓" and gives no explanation why the export silently did nothing.

3. **`playClip`'s `onerror` handler is functionally identical to `onended`.** `PodLab.vue:304`, `:320` — `a.onerror = finish` resolves the same promise `onended` would. A genuinely broken/404 audio clip during ladder or arc playback advances the sequence exactly as if it played successfully, with no visual distinction and no error surfaced to the user (contrast with the deliberate `hasAudio`/`approx` states at msgs 84/92/93, which only cover clips known-missing at compose time, not clips that fail to *load*).

### Class 4 — UNSPECIFIED CONTENT (state exists structurally, content/behavior underspecified)

4. **`ladderRungs` computed has no error boundary, unlike its sibling `arc`.** `PodLab.vue:551-857` vs. `:115-134`. The `arc` computed explicitly wraps `composeSentenceArc` in try/catch and degrades to an empty-arc message (msg 68). `ladderRungs` — the ~300-line derivation powering the *current default* mode — has no equivalent guard. Malformed `atom_map`/`atom_map_fine` data (e.g. from a bad seam save, or a partially-migrated course) would throw inside a Vue computed and could break the whole right-hand panel with no defined recovery message, rather than degrading to the "no atom_map" empty state (msg 87).

5. **The "no explainer clip" note is stale/irrelevant in ladder mode.** `PodLab.vue:1188`, shown unconditionally regardless of `mode`. Per the code's own doctrine comment (`:46-48`, `:366`), the current ladder ("Proposed 07-01") explicitly *removes* the separate explainer stage — it lives only inside Stage 0. Displaying "no explainer clip" while auditioning the ladder view implies a defect that, by the ladder's own design, doesn't apply there.

### Class 2 — UNVALIDATED (User→App input with no validation rule)

6. **Hand-edited config JSON is validated only as *parseable*, not as *shape-correct*.** `PodLab.vue:256-275` (`onPlaylistJsonInput`/`onStage0JsonInput`). `JSON.parse` succeeding is the only gate — a syntactically valid but structurally wrong object (e.g. `stage0` missing its `tiers` array, or a `stagePlaylist` with non-array values) passes silently into `labStage0`/`labStagePlaylist` and is only discovered downstream when `composeSentenceArc` throws (caught, degrades to empty arc — msg 68) or, worse, feeds `ladderRungs` which has no such guard (finding 4).

### Notes / not-defects (validated correctly, called out because they're easy to mis-flag)

- The seam editor's "move budget" rule (msg 33-34) is a real, user-facing validation with a defined message — correctly typed as User→App with feedback.
- `saveFineMap`'s auth check (msg 41) and save-success/failure messaging (msgs 43-44) are complete Trinity triads (attempt → success twin → failure twin).
- The graceful audio-fallback ladder (`resolveChunkClips`, msg 84) is genuinely well-specified: it has three tiers of degrade-gracefully behavior and a real UI encoding of each (disabled+tooltip for `!hasAudio`, visual `approx` style for coarser fallback) — this is a MISSING-TWIN class antidote worth pointing at as the pattern the other findings should follow.

---

## Summary

- **Screens covered**: 1 (Pod Lab, both modes: The ladder / Stage arc, plus the seam editor and ladder-config sub-panels)
- **Trinity messages tabled**: 97
- **Findings**: 6 total — 3× Class 3 (MISSING TWIN), 2× Class 4 (UNSPECIFIED CONTENT), 1× Class 2 (UNVALIDATED)
- **Worst 3**: (1) `loadLiveConfig()` silent fetch failure — tunes against wrong baseline with no indication; (2) `ladderRungs` has no error boundary while its sibling `arc` does, on the screen's current-default view; (3) hand-edited JSON validated only for parseability, not shape.
