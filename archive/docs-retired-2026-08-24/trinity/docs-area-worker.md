# Docs Area + Pod Thinking — Trinity Compliance Audit

> **Date**: 2026-07-17
> **Scope**: `/docs/*` route tree (`src/router/index.js` lines ~108-181) — `DocsLayout.vue`, `DocsIndex.vue`, `APMLSpec.vue`, `Pedagogy.vue`, `TerminologyGlossary.vue`, `CanonicalSeeds.vue`, `CanonicalContent.vue`, `PodsDoc.vue`, `PodThinkingIndex.vue`, `PodThinkingDoc.vue`, `ProcessOverview.vue`, `PhaseIntelligence.vue`
> **Trinity**: App→User (output) | User→App (input) | App→App (processing)
> **Protocol**: `trinity-campaign-brief.md` — Session 1 (system→user), Session 2 (user→system), Session 3 (system→system), finding classes 1-5

---

## Screen 0: Docs Shell (DocsLayout.vue)

| # | Direction | Message |
|---|-----------|---------|
| 1 | App→User | Render `<router-view>` for the active `/docs/*` child route — no header, breadcrumb, or nav chrome of its own (`DocsLayout.vue:2-6`) |

**Finding (class 5 — UNREACHABLE/ORPHAN, dead-end flow)**: `DocsLayout.vue` supplies **zero shared navigation** — no "back to Documentation Hub" link, no sidebar, no breadcrumb. Every child page must supply its own way back. Six of the nine doc pages don't (see Screens 3, 5-6, 9-10 below): a user who lands on `/docs/apml`, `/docs/terminology`, `/docs/seeds`, `/docs/canonical`, `/docs/pipeline`, or `/docs/intelligence` — including via a bookmark or a shared link — has no in-app path back to `/docs`. Only browser-back or manually editing the URL works. `DocsLayout.vue:1-20` (whole file, no nav markup).

---

## Screen 1: Documentation Hub (DocsIndex.vue)

| # | Direction | Message |
|---|-----------|---------|
| 2 | App→User | Display page title "Documentation Hub" + subtitle (`DocsIndex.vue:21-22`) |
| 3 | App→User | Display "REFERENCE DOCUMENTS" section: 3 cards — APML Specification (badge "v14.1 spec"), Pedagogical Model, Terminology Glossary (`:38-123`) |
| 4 | App→User | Display "COURSE CONTENT" section: 6 cards — Canonical Seeds (badge "668 seeds"), Canonical Content, Listening Pods, Pod Thinking, Process Overview, Phase Intelligence (`:136-305`) |
| 5 | App→User | Display stats bar: "8 Documents" / "v14.1 APML Version" / "Architecture Documented" checkmark (`:311-330`) |
| 6 | User→App | Click any doc card | 
| 7 | App→App | `router-link` navigates to the card's target route (`:38,68,97,136,166,194,222,251,279`) |
| 8 | App→App | `console.log('Documentation Hub Loaded')` fires on mount — dev-only side effect, no user-facing twin (`:337`) |

**Findings**
- **Class 4 — UNSPECIFIED/WRONG CONTENT**: the stats bar hardcodes `8` documents (`DocsIndex.vue:313`), but the page renders **9** doc cards (apml, pedagogy, terminology, seeds, canonical, pods, pod-thinking, pipeline, intelligence — `:38,68,97,136,166,194,222,251,279`). The count was not updated when the Pod Thinking card was added. Not validated against the actual card list — no code computes it.
- **Class 4 — UNSPECIFIED/WRONG CONTENT**: the Canonical Seeds card badge hardcodes `668` seeds (`DocsIndex.vue:148`). `CanonicalSeeds.vue:175` computes its own `totalSeeds` live from Supabase specifically to avoid this drift (`CanonicalSeeds.vue:124-126` comment on the sibling `CanonicalContent.vue` makes the same point explicitly: "so the count tracks the live canonical_seeds table instead of a hardcoded number that silently drifts"). The hub card was never updated to match that pattern — it can silently go stale exactly the way the codebase already flagged as a problem elsewhere.
- **Class 1 — UNTYPED**: `console.log('Documentation Hub Loaded')` (`:337`) is a bare side effect with no App→User or App→App consequence — dead instrumentation.

---

## Screen 2: APML Specification (APMLSpec.vue) — static reference

| # | Direction | Message |
|---|-----------|---------|
| 9 | App→User | Display "APML v14 Specification" title, subtitle, build meta "v14.1 \| Jun 2026" (`APMLSpec.vue:5-8`) |
| 10 | App→User | Display "Breaking Change Banner" + "The 12 Directions" grid (D01-D12) — fully static content, no data fetch (`:15-469`, confirmed no `<script>` logic beyond bare `<script setup>`) |

No interactivity, no loading/error states, no user input. Trinity-complete by virtue of being purely App→User.

**Finding (class 5, same family as Screen 0)**: no link back to `/docs` anywhere in the file.

---

## Screen 3: Pedagogical Model (Pedagogy.vue)

| # | Direction | Message |
|---|-----------|---------|
| 11 | App→User | Show loading spinner + "Loading documentation..." while `loading` is true (`Pedagogy.vue:4-6`, `:638`) |
| 12 | App→App | `onMounted` calls `api.getDocumentation('pedagogy')` (`:666-680`) |
| 13 | App→User | On success: render `title`/`subtitle`/`versionInfo` from the fetched `document`, show `dataSource === 'database'` indicator (`:12`, `:650-652,671`) |
| 14 | App→User | On failure (any error, including a 404 or network error): silently fall back to hardcoded `defaults` content, `dataSource` stays `'fallback'` — no error banner, no visible failure state (`:674-676`) |
| 15 | User→App | Click inline link to Terminology Glossary or APML Specification within the fallback/body content (`:624,626`) |
| 16 | App→App | Navigate via `router-link` |

**Findings**
- **Class 3 — MISSING TWIN**: the `catch` block at `Pedagogy.vue:674-676` only `console.warn`s; there is no App→User failure message distinguishing "the live doc failed to load, you're seeing static fallback text" from "this is fresh content." The `dataSource === 'database'` badge (`:12`) is a positive-only indicator — it shows when things worked but shows *nothing* (not even a small "showing fallback" note) when they didn't, which is exactly the silent-failure shape this audit class exists to catch.
- **Class 5**: no link back to `/docs` — only two unrelated cross-links deep in the body content.

---

## Screen 4: Terminology Glossary (TerminologyGlossary.vue) — static reference

| # | Direction | Message |
|---|-----------|---------|
| 17 | App→User | Display title, subtitle, "Date: 2026-06-02 \| APML v14.1 \| Status: Current" meta line, "Quick Reference" panel (seed/LEGO/table-location summary) (`TerminologyGlossary.vue:2-40`) |

Confirmed no `<script>` logic beyond bare `<script setup>` — fully static, no loading/error states to validate.

**Finding (class 5)**: no link back to `/docs`.

**Finding (class 4)**: the page asserts its own currency ("Status: Current — matches the Course Builder (port 3471) as it runs today", `:6`) as static prose with no mechanism verifying that claim — it is App→User content that can silently go stale with no App→App check behind it. Lower severity than the Pedagogy silent-fallback but the same underlying shape: an implicit freshness claim nothing validates.

---

## Screen 5: Canonical Seeds (CanonicalSeeds.vue)

| # | Direction | Message |
|---|-----------|---------|
| 18 | App→User | Show "Loading canonical seeds..." while `loading` (`CanonicalSeeds.vue:35-37`) |
| 19 | App→App | `onMounted` → `loadSeeds()` → `getCanonicalSeeds()` reads Supabase directly (`:202-218,257-259`) |
| 20 | App→User | On success: render seed list, `{{ totalSeeds }}` in subtitle live-computed from loaded data (`:9,175`) |
| 21 | App→User | On failure: show red error banner with `error.value` message (`:40-42,212-217`) |
| 22 | App→User | Display "Edit Seeds" button (`:14-18`) |
| 23 | User→App | Click "Edit Seeds" |
| 24 | App→App | Set `editing = true` — every seed's `source` field becomes an editable `<textarea>` (`:15,74-78`) |
| 25 | User→App | Type in the search box (`:48-52`) |
| 26 | App→App | `filteredSeeds` computed filters by `seed_id` or `source` substring, case-insensitive (`:177-185`) |
| 27 | App→User | Update visible count "`{{ filteredSeeds.length }}` of `{{ totalSeeds }}` seeds" and paginated list live (`:53-55,189-193`) |
| 28 | User→App | Edit a seed's text in a textarea (only while `editing`) (`:76`) |
| 29 | User→App | Click "Save Changes" (`:20-22`) |
| 30 | App→App | `saveSeeds()` — diffs `seeds` vs `originalSeeds`, PATCHes only changed rows to `/api/admin/canonical-seeds/:id` one at a time (`:221-250`) |
| 31 | App→User | Button shows "Saving…" while `saving` (`:21`) |
| 32 | App→User | On success: exit edit mode, `console.log` success — **no visible success banner/toast**, only the button reverting to "Edit Seeds" (`:243`, `:225,242`) |
| 33 | App→User | On failure (any PATCH fails, including a 403 for a non-admin who clicked Edit): show red error banner, but **already-saved earlier PATCHes in the same batch are not rolled back or reported individually** (`:235-246`) |
| 34 | User→App | Click "Cancel" while editing (`:23-25`) |
| 35 | App→App | `cancelEdit()` — deep-restores `seeds` from `originalSeeds`, exits edit mode (`:252-255`) |
| 36 | User→App | Click Previous/Next pagination buttons (`:93-107`) |
| 37 | App→App | `currentPage` increment/decrement, disabled at bounds (`:94-105`) |
| 38 | App→User | Update visible page + "Showing X-Y of Z" label (`:89-90`) |
| 39 | User→App | Click "About Canonical Seeds" header |
| 40 | App→App | Toggle `showAbout` (`:114,171`) |
| 41 | App→User | Expand/collapse the About panel, arrow glyph flips ▶/▼ (`:117,120`) |

**Findings**
- **Class 3 — MISSING TWIN**: `saveSeeds()` success path (`:241-243`) has no App→User confirmation beyond the button reverting — a save that silently succeeds looks identical, from the user's perspective mid-click, to one that's still in flight for a moment. No "Saved!" toast, unlike the equivalent pattern documented as compliant in the schools audit (`schools-trinity-audit.md` Screen 10, row 197: "Button shows 'Saved!' on success").
- **Class 2 — UNVALIDATED**: the "Edit Seeds" button is shown unconditionally regardless of role (`:14-18`) — the comment at `:220` says persistence is "admin-gated" but that gate is enforced only server-side on PATCH (`:231-238`); a non-admin can open edit mode, type changes, click Save, and only then discover (via a generic error banner) that they can't. No `v-if` on the button checks admin status, no pre-flight capability check.
- **Class 3 — MISSING TWIN** (partial-failure): `saveSeeds()` iterates changed seeds sequentially and throws on the first failure (`:230-239`), but does not report *which* seeds already saved successfully before the failing one (`ok` count is tracked but never shown to the user, `:229,239,243`). A user editing 5 seeds where the 3rd fails sees one generic error with no indication 2 of 5 already persisted.

---

## Screen 6: Canonical Content (CanonicalContent.vue)

| # | Direction | Message |
|---|-----------|---------|
| 42 | App→User | Display "3-Parameter Input Model" static explainer (`CanonicalContent.vue:15-31`) |
| 43 | App→App | `onMounted` → three independent try/catch fetches: `getCanonicalSeeds()` (Supabase), `/vfs/canonical/eng_encouragements.json`, `/vfs/canonical/welcomes.json` (`:128-141`) |
| 44 | App→User | Render live `totalSeeds` count + first-10 seeds as raw JSON dump, or "Loading..." if `canonicalSeeds` still empty (`:38,45,50-52`) |
| 45 | App→User | Render encouragement counts + first-5 pooled encouragements as raw JSON, or "Loading..." (`:68-69,74-76`) |
| 46 | App→User | Render welcomes JSON dump — **no loading/empty guard at all** on this block (`:96-99`, compare `:51,75` which do have `v-if`) |
| 47 | App→User | Display static "Future Enhancement" note about in-browser editing not yet existing (`:102-109`) |

**Findings**
- **Class 3 — MISSING TWIN**: all three `onMounted` fetches (`:132-140`) only `console.error` on failure — there is no App→User error state anywhere on this page. If `/vfs/canonical/eng_encouragements.json` 404s, the "Encouragements" panel is permanently stuck on "Loading..." (`:76`) with no indication anything went wrong; this is the exact "silent failure = the paywall-tap / metrics-write bug class" the campaign brief calls out by name.
- **Class 4 — UNSPECIFIED CONTENT**: the Welcomes panel (`:96-99`) has no `v-if`/loading guard at all — on first render before the fetch resolves it dumps `JSON.stringify(undefined-ish {}, null, 2)` → renders the literal string `"{}"`, which is indistinguishable from "the welcomes file is genuinely empty." A real empty-vs-loading distinction exists for the other two panels but not this one.
- **Class 5**: no link back to `/docs`.

---

## Screen 7: Listening Pods (PodsDoc.vue) — full detail

Purely static reference page; confirmed via `<script setup>` comment (`PodsDoc.vue:138-140`) — "Static reference page. Data shapes mirror the canonical_pod_scenarios and listening_pods / listening_pod_sentences tables (Supabase)." No fetch, no loading/error state, no form input.

| # | Direction | Message |
|---|-----------|---------|
| 48 | App→User | Display title "Listening Pods", subtitle with inline link to Pod Thinking (`:5-9`) |
| 49 | User→App | Click the inline "Pod Thinking" link |
| 50 | App→App | `router-link` to `/docs/pod-thinking` (`:8`) |
| 51 | App→User | Display "What is a Pod?" explainer — pod/scene/sentence model, `pod-0` vs choice pods, "fully DB-backed, not hardcoded test data" claim (`:14-32`) |
| 52 | App→User | Display "One Canonical Master, Many Generated Pods" — two-column canonical-vs-per-course model, table names as static labels (`:34-69`) |
| 53 | App→User | Display "Canonical Pod Sentences" field-reference table (7 fields: `pod_slug`, `scene_number`/`scene_title`/`scene_subtitle`, `sentence_number`, `global_order`, `speaker`, `english_text`, `author_notes`) (`:71-100`) |
| 54 | App→User | Display "Generation Workflow" 4-step ordered list (author → generate → assign voices → generate audio) (`:102-111`) |
| 55 | App→User | Display "Where to edit" card with static path `/production/<course>/canonical/<pod-slug>` (`:114-122`) |
| 56 | App→User | Display "Key endpoints" card listing 4 static endpoint strings (GET/PATCH/POST/GET) (`:123-131`) |

**Findings**
- **Class 4 — UNSPECIFIED/UNVALIDATED CONTENT**: every claim on this page — schema fields, endpoint paths, the generation workflow steps, "fully DB-backed... not hardcoded test data" (`:29`) — is asserted as static prose with zero code binding back to the actual `canonical_pod_scenarios` / `listening_pods` schema or the live route table. Nothing on this page would break or visibly go stale if `/api/admin/pods/generate` were renamed or a field were dropped from the schema; it's pure documentation with no App→App validation of its own accuracy. (Flagged for awareness, not necessarily actionable — same category as Screen 4's "Status: Current" claim.)
- **Class 5** (same DocsLayout gap): no link back to `/docs` hub itself — the only navigation off this page goes forward to Pod Thinking, never back.

---

## Screen 8: Pod Thinking Index (PodThinkingIndex.vue) — full detail

| # | Direction | Message |
|---|-----------|---------|
| 57 | App→User | Display title "Pod Thinking", subtitle with inline link back to `/docs/pods` (`PodThinkingIndex.vue:5-8`) |
| 58 | User→App | Click the inline "Listening Pods" link |
| 59 | App→App | `router-link` to `/docs/pods` (`:8`) |
| 60 | App→App | `computed liveDocs` / `discussionDocs` split `podThinkingDocs` by `badge === 'IN DISCUSSION'` (`:61-62`) |
| 61 | App→User | Render the main doc-list: one entry per non-discussion doc — badge, title, description, status, date (`:12-29`) |
| 62 | App→User | Conditionally render "In Discussion" section header + subtitle only `v-if discussionDocs.length` (`:31-33`) |
| 63 | App→User | Render the discussion doc-list with the same entry shape (`:34-51`) |
| 64 | User→App | Click any doc entry (either list) |
| 65 | App→App | `router-link :to="/docs/pod-thinking/${doc.slug}"` navigates to `PodThinkingDoc` (`:16,38`) |
| 66 | App→App | `badgeClass()` maps `LIVE`→green, `SUPERSEDED`→grey, anything else (including the default `'IN DISCUSSION'`)→amber (`:64-68`) |

**Findings — this is the highest-value screen in scope; the underlying data source (`pod-thinking-docs.js` + `pod-thinking-meta.js`) is auto-generated from the filesystem, so every gap here is a live, currently-reachable defect, not a hypothetical.**

- **Class 4 — UNSPECIFIED CONTENT, at scale, confirmed live right now**: `pod-thinking-docs.js:8` globs **every** `.md`/`.txt` file in `docs/pods/` and auto-lists it; any file without a matching key in `pod-thinking-meta.js` gets `description: 'No description yet — add one to pod-thinking-meta.js.'` and `status: 'Undocumented — needs a pod-thinking-meta.js entry'` (`pod-thinking-docs.js:27,29`). Diffing `docs/pods/*.md` against `pod-thinking-meta.js` keys, **14 of 28 markdown files currently ship with this placeholder content** on a live, founder-facing page:
  `chunk-audio-coverage-2026-07-17.md`, `chunked-take-recipe.md`, `e2e-recording-proof-2026-07-17.md`, `explainer-stage0-ladder-audio-contract.md`, `hrv-pod0-gloss-fidelity-audit-2026-07-14.md`, `inventory-triage-gle.md`, `inventory-triage-hrv.md`, `offsets-without-azure-recommendation.md`, `pod1-content-stress-test.md`, `pod1-scene-review.md`, `pod1-scene-say-that-again.md`, `real-vs-authored-texture-analysis.md`, `stage0-explainers-STATE.md`, `welsh-seeds-gap-list.md`.
  This is exactly the class-4 pattern the audit brief defines ("error/loading/empty states that exist structurally but have no defined content") — except here it's not an edge case, it's exactly half the corpus.
- **Class 4 — UNSPECIFIED CONTENT (silent default)**: `pod-thinking-docs.js:30` defaults `badge` to `'IN DISCUSSION'` for any undocumented file — so all 14 files above are silently sorted into the "In Discussion" bucket (`:31-33` in the index) with no author having actually made that editorial call; the badge asserts a review state nobody set.
- **Class 5 — silent scope gap**: the glob is `'../../docs/pods/*.{md,txt}'` (`pod-thinking-docs.js:8`) — non-`.md`/`.txt` files in the same directory are invisibly excluded. `docs/pods/` also contains 4 `.json` files (`chunk-audio-coverage-2026-07-17.json`, `chunk-audio-cut-candidates-2026-07-17.json`, `inventory-triage-resolutions.json`, `stage0-default-config.json`) that never appear here and have no other listed access point in the scoped routes — not necessarily wrong (they may be machine-only artifacts) but nothing in the UI tells an author that JSON files are excluded, so an author following the "drop a file in `docs/pods/` and it appears automatically" promise (`pod-thinking-docs.js:1-5` comment) would be surprised a `.json` file silently doesn't.
- **Class 5** (DocsLayout gap): the only way back to `/docs` from here is the inline subtitle link to `/docs/pods` — there's no path back to the Documentation Hub itself.

---

## Screen 9: Pod Thinking Doc (PodThinkingDoc.vue) — full detail

| # | Direction | Message |
|---|-----------|---------|
| 67 | App→User | Display "← Pod Thinking" back link (`PodThinkingDoc.vue:4`) |
| 68 | User→App | Click back link |
| 69 | App→App | `router-link` to `/docs/pod-thinking` (`:4`) |
| 70 | App→App | `slug = route.params.slug`, `doc = podThinkingDocs.find(d => d.slug === slug)` computed **once at setup**, not reactively (`:29-30`) |
| 71 | App→User | If `doc` found: display badge, title, "`status` · `date`" meta line (`:5-9`) |
| 72 | App→User | If `doc` not found: display "No pod-thinking doc found for '`{{ slug }}`'." (`:14`) |
| 73 | App→App | `watchEffect` awaits `doc.loader()` (the Vite raw-import glob loader) to fetch file contents (`:40-48`) |
| 74 | App→User | If `doc.isText` (`.txt` source, e.g. `pod05-aran-raw-2026-07-16.txt`): render raw text in a `<pre>` block, preserving whitespace, no markdown processing (`:16,43-44`) |
| 75 | App→User | Else (`.md` source): render `renderMarkdown(raw)` output via `v-html` (`:17,45-46`) |
| 76 | User→App | Click a link inside rendered markdown body content |
| 77 | App→App | Plain `<a href target="_blank" rel="noopener">` (`markdown.js:19`) — **always** opens in a new tab/full navigation, even for another `/docs/pod-thinking/:slug` link, never an in-SPA `router-link` |

**Findings**
- **Class 2 — UNVALIDATED (latent route-reactivity bug)**: `slug` and `doc` are read from `route.params` once, synchronously, outside any `computed`/`watchEffect` (`:29-30`). If a future in-app `router-link` ever pointed from one `PodThinkingDoc` page directly to another `/docs/pod-thinking/:slug` (same route component, Vue Router reuses the instance), the URL would change but `slug`/`doc`/the rendered body would **not** update — a stale-content bug with no error, no twin. Currently unreachable in practice only because the sole in-app links to this route come from `PodThinkingIndex.vue` (a different route component, so it always remounts) and because every markdown-rendered link force-opens in a new tab (`markdown.js:19`) rather than routing in-SPA — i.e. the bug is masked by two unrelated implementation details, not fixed. Confirmed via `grep -rn "pod-thinking/" src` — only `PodThinkingIndex.vue:16,38` and the router definition itself reference the route.
- **Class 4 — UNSPECIFIED CONTENT (inherited)**: for any of the 14 undocumented files from Screen 8, this page renders `status: 'Undocumented — needs a pod-thinking-meta.js entry'` directly into the page's user-facing meta line (`:8`) — the placeholder text is not just an index-page label, it's the actual page header a reader sees after clicking through.
- **Class 3 — MISSING TWIN (thin)**: the "not found" state (`:13-14`) is present and correctly typed, but the `watchEffect` (`:40-48`) has no error handling around `doc.loader()` — if the raw-import glob loader ever rejects (e.g. a corrupted/binary file matched by the glob), there is no catch; the page would show a stale/blank body with no failure message.

---

## Screen 10: Process Overview (ProcessOverview.vue) — static reference

| # | Direction | Message |
|---|-----------|---------|
| 78 | App→User | Display "Complete Process Overview" title/subtitle, "End-to-End Pipeline" prose, build/version meta, "Deployment Architecture" (hybrid cloud+local model), "Works Without Local Connection" list (`ProcessOverview.vue:2-178`) |
| 79 | User→App | Click any of three `router-link to="/intelligence"` cards (`:80-109`) |
| 80 | App→App | Navigate to `/intelligence`, which is a **legacy redirect** (`router/index.js:362`) to `/docs/intelligence` — works, but the page links to the old pre-redirect path rather than the canonical `/docs/intelligence` path directly |

Confirmed no other script logic beyond bare `<script setup>` — fully static besides the three redirect-routed links.

**Findings**
- **Class 4 (minor)**: all three navigation cards route through the deprecated `/intelligence` path (`:80,90,100`) instead of `/docs/intelligence` directly — functions correctly via the redirect today, but it's an internal link pointing at a path the router file itself labels `// Legacy redirects for /reference/* routes → /docs/*` (`router/index.js:355-362`); a future cleanup of legacy redirects would silently break this page's only three interactive elements.
- **Class 5**: no link back to `/docs`.

---

## Screen 11: Phase Intelligence (PhaseIntelligence.vue)

| # | Direction | Message |
|---|-----------|---------|
| 81 | App→User | Display title, subtitle, "APML v14.0 / Course Builder Consolidation" badges (`PhaseIntelligence.vue:2-13`) |
| 82 | App→User | Display "v14 Architecture Change" static amber notice (`:19-31`) |
| 83 | App→User | Display phase-selector grid: 6 buttons (CB, 1, 2, 3, 8, 9), each showing id/name/status badge/version (`:37-70`) |
| 84 | User→App | Click a phase button (`:40`) |
| 85 | App→App | `selectPhase(phase)` sets `selectedPhase` and looks up `phaseContent[phase]`, falling back to `` `# Phase ${phase}\n\nIntelligence file not yet created.` `` if missing (`:247-249`) |
| 86 | App→User | Highlight the selected button (emerald fill), render phase name/status/version, deprecation notice if `status === 'deprecated'`, and the raw content in a `<pre>` block (`:41-48,76-120`) |
| 87 | App→User | If no phase selected: "Select a phase to view its intelligence" placeholder — **structurally unreachable**, since `selectPhase('CB')` runs unconditionally at module init (`:253`), so `currentPhase` is never null in practice (`:76-77`) |
| 88 | App→User | Display static "v14 Content Creation Workflow" 5-step list (`:124-136`) |

**Findings**
- **Class 5 — UNREACHABLE**: the `v-if="!currentPhase"` empty-state branch (`:76-77`, "Select a phase to view its intelligence") can never render — `selectedPhase` is initialized to `'CB'` (`:240`) and `currentPhase` always resolves against the fixed 6-entry `phases` array (`:231-238,243-245`), so `currentPhase` is always truthy. Dead code / an orphaned UI state.
- **Class 4 (minor)**: all 6 phases' "intelligence" content is hardcoded inline in the component (`:147-220`) rather than loaded from `.claude/commands/` as the page's own workflow text claims agents should do (`:127`, `:161-163`) — the comment at `:146` acknowledges this directly ("Phase 8/9 PROMPT.md files may not exist on Vercel - using inline content"). Not a Trinity violation per se (nothing is silently broken), but the displayed content is a hand-maintained copy of a source of truth that lives elsewhere and can drift without any check.
- **Class 5**: no link back to `/docs`.

---

## Findings Summary (ranked)

| Class | Count | Screens |
|-------|-------|---------|
| 1 — UNTYPED | 1 | DocsIndex |
| 2 — UNVALIDATED | 2 | CanonicalSeeds (edit-button role gate), PodThinkingDoc (route-reactivity) |
| 3 — MISSING TWIN | 5 | Pedagogy (silent fallback), CanonicalSeeds (save success, partial-failure), CanonicalContent (silent fetch failures ×1 page), PodThinkingDoc (loader error handling) |
| 4 — UNSPECIFIED/WRONG CONTENT | 9 | DocsIndex (×2: doc count, seed count), TerminologyGlossary, CanonicalContent (welcomes no-guard), PodsDoc, PodThinkingIndex (×2: 14 undocumented files, silent badge default), PodThinkingDoc (inherited), ProcessOverview, PhaseIntelligence |
| 5 — UNREACHABLE/ORPHAN | 8 | DocsLayout (root cause), APMLSpec, TerminologyGlossary, CanonicalContent, PodsDoc, PodThinkingIndex, ProcessOverview, PhaseIntelligence, PhaseIntelligence (dead empty-state branch) |

**Total findings: 25** across 12 screens/components, ~88 numbered Trinity messages.

### Worst 3

1. **PodThinkingIndex/PodThinkingDoc — class 4, live and at scale**: 14 of 28 files in `docs/pods/` (half the Pod Thinking corpus) currently render `"No description yet — add one to pod-thinking-meta.js."` / `"Undocumented — needs a pod-thinking-meta.js entry"` as their user-facing description and status on a founder-facing methodology index — and are silently defaulted into the "IN DISCUSSION" badge bucket with no editorial decision behind it (`pod-thinking-docs.js:27,29-30`).
2. **DocsLayout — class 5, root cause of 7 downstream findings**: the shared docs layout provides no navigation chrome at all, so 6 of 9 doc pages (APMLSpec, TerminologyGlossary, CanonicalContent, PodsDoc, ProcessOverview, PhaseIntelligence — plus PodThinkingIndex, whose only "back" link goes to PodsDoc, not the hub) are dead ends with no in-app path back to `/docs`.
3. **CanonicalContent — class 3, silent-failure shape named explicitly in the campaign brief**: all three `onMounted` data fetches (seeds, encouragements, welcomes) only `console.error` on failure with zero App→User error state — a 404 on `eng_encouragements.json` leaves the panel stuck on "Loading..." forever, and the Welcomes panel has no loading/empty guard at all so it can render a bare `"{}"` indistinguishable from a genuinely empty file.
