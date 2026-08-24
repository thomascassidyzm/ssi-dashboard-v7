# Popty self-explaining — v1 (compiled explainer)

**Status: DESIGN + v1 build, 2026-07-27. Second proof of the founder-ruled paradigm "apps always
ship with explanatory power". First proof: `ssi-learning-app` (same date) —
`tools/explainer/compile.mjs` + `docs/self-explaining-dashboard.md` there. This doc records only
what differs for Popty; the architecture rationale lives in the first proof's doc and is not
restated.**

> One act: documentation, training, onboarding, feature-discovery = the system explaining itself
> from live state, rendered per persona. Compiler, not cache (static docs rot), not concierge
> (runtime LLM burns tokens per user — ABSOLUTE constraint: zero runtime model calls, ever).

## 1. Personas vs the real role model (honest mapping)

Sign-in truth: `dashboard_users.role` (`src/composables/useAuth.js`, managed in
`src/views/UserManagement.vue`, recorder invites in `src/views/production/TeamRoster.vue`).
Roles that exist today: **`admin`**, **`editor`**, **`recorder`**.

| Founder-ladder persona | Real role today | v1 rendering |
|---|---|---|
| ssi-admin | `admin` | in-app, sign-in-derived |
| course leader / editor | `editor` | in-app, sign-in-derived |
| human voice recorder | `recorder` | in-app (Record Room), sign-in-derived |
| course checker | **no such role** — checking is done by editors/admins | GAP: authored inside `editor.md` as a checking section; becomes its own role when auth grows one |
| board | **not a sign-in role** — board reports are authored content (`src/content/board-reports/`) | GAP: no pack persona; the board-report genre already is the board's rendering |
| dev | not a sign-in role | file output: `docs/explainer-dev.md` |
| agent (course-builder workers) | not a sign-in role (API key/headers) | file output: `docs/explainer-agent.md` — generated API/pipeline truth replacing hand-maintained agent docs |

Persona at runtime is derived from what the app already knows at sign-in: `isAdmin` → `admin`,
`isRecorder` → `recorder`, otherwise (any `dashboard_users` row) → `editor`. No picker, no new
auth reads.

## 2. Decisions vs derivables

Hand-maintained (the ONLY hand-maintained artifacts):
- `tools/explainer/rulings/{admin,editor,recorder,dev,agent}.md` — persona voices: short, warm,
  mechanism-only ("what this place is for and how it thinks"), never restated state.
- `tools/explainer/rules.json` — noticing rules, pure data.
- This doc.

Derived by the compiler (`tools/explainer/compile.mjs`) from the surfaces' own source:
- **Nav surfaces + verbs** — the tab arrays in `src/components/AppNavbar.vue` (literal
  `{ label, to }` objects; admin gating from the surrounding computed).
- **Role model** — role option values in `UserManagement.vue` + the role computeds in
  `useAuth.js`; the drift gate fails if pack personas and real roles diverge.
- **Pipeline** — the "Active Workflow" phase line in `SYSTEM.md` (only that section; the rest of
  SYSTEM.md is dated and NOT trusted).
- **Gates** — from `services/course-builder/lib/`: `MAX_LEGO_SYLLABLES` value
  (`language-config.cjs`), known-vocab gate presence (`validation.cjs`, commit `b77c75f7`),
  phrase-ZUT check, recombination gate, pair-contract mechanism (`docs/pair-contracts/`).
- **Voice policy** — `services/shared/human-voice-courses.cjs`: the explicit human-voice set +
  the `cym_*` prefix rule; TTS-approval + audio-pass-queue policy from
  `services/shared/audio-pass-queue.cjs` header.
- **Noticing snapshot** — compile-time data: per-course known-vocab breach counts from
  `scripts/vocab-gate/audit-results.json`.

## 3. Pack shape

`src/explainer/pack.json` (bundled static data; regenerated only by the compiler):

```
{
  "version": "<content hash>", "generatedAt": "<date>",
  "truth": { "navTabs": [...], "roles": [...], "phases": [...],
             "gates": {...}, "voicePolicy": {...} },
  "explanations": { "admin": {"<section>": "..."}, "editor": {...}, "recorder": {...} },
  "rules": [ ... ],                      // §5
  "snapshot": { "vocabGate": { "<course>": {"knownBreaches": n, "targetBreaches": n} },
                "generatedAt": "<date>" }
}
```

Ruling sections are keyed by surface (`home`, `courses`, `production`, `docs`, `admin`,
`record-room`). Drift gate: every nav tab visible to a persona must be named in that persona's
ruling; a rule reading a payload field the source no longer emits fails the compile; personas
must map onto real roles; `--check` for CI.

## 4. Runtime surfaces (zero new endpoints, zero model calls)

- `src/components/explainer/HowThisWorks.vue` — one quiet "How this works" link; inline card
  with the persona-scoped section for where the user stands. Mounted on `Home.vue` (admin +
  editor) and `RecordRoom.vue` (recorder).
- `src/components/explainer/NoticingInvitations.vue` — dismissible one-line invitations with a
  deep link, evaluated by `src/explainer/evaluateRules.js` over (a) the pack's compile-time
  snapshot and (b) payloads the page has already fetched. Never modal, max 3, dismissal per
  rule×subject in localStorage (14 days).
- QA section: rules carry a `mount` hint; the QA mount point is a modest slot awaiting Kai's
  input — easily re-homed.

## 5. Noticing rules

Same shapes as the first proof (`node` / `perChild` / `countWhere`; ops
`eq gt lt gte lte truthy falsy daysSinceGt`), plus `source`: `"snapshot"` (compile-time data
baked into the pack) or `"payload"` (page-fetched data). v1 rules (data verified real):
- checker/editor/admin: courses with known-vocab gate flags — "course X has N known-side flags"
  → from the vocab-gate snapshot.
- recorder: pending human-recording queue for human-voice courses (cym_*, bre_for_fra).
- ssi-admin: stalled pending `audio_pass_requests`; courses missing voice config.

## 6. The Docs hub fold-in (v1.5, founder ruling 2026-07-27)

The dashboard's Docs tab is one coherent surface: **compiled renders + rulings**, drift-gated,
never stale. Decisions-vs-derivables applied to the old hand-written estate:

**Died as hand-written artifacts** (deleted 2026-07-27; prose lives on in git):
- `PhaseIntelligence.vue` — called itself "the single source of truth for agent instructions"
  while carrying a manually-added warning box about an architecture change it had to be told
  about. `/docs/intelligence` now redirects to the compiled Pipeline page.
- `ProcessOverview.vue` → `src/views/docs/DocsPipeline.vue`, rendering pack truth: active
  workflow, phase-port table, agent endpoints, gate list + limits, voice policy, the Supabase
  tables the code actually references (derived by scanning `services/` + `src/` for
  `.from('…')` calls), and — when the production machine is reachable — live state.
- `TerminologyGlossary.vue` → `src/views/docs/DocsGlossary.vue`. Definitions are rulings
  (`tools/explainer/rulings/docs/glossary.md`); every term's pointer lines (`lives in` /
  `enforced by` / `code`) are VERIFIED by the drift gate, so a term cannot outlive its referent.
- `APMLSpec.vue` → `src/views/docs/DocsApml.vue`. The why (directions, hold-out doctrine, audio
  ownership) is rulings prose (`rulings/docs/apml.md`); every current-state claim (endpoints,
  ports, versions, schema) is a compiled block.
- `DocsIndex.vue` rewritten to render `pack.docs.surface` — the compiled/rulings/data
  classification itself. A new docs tab nobody classifies **fails the compile** (`DOCS_SURFACE`
  gate in the compiler).

**Lives as rulings**: Pedagogy, Pod Thinking (founder-authored Vue prose pages, unchanged),
plus the new docs rulings sources under `tools/explainer/rulings/docs/`. Seeds / Content / Pods
are data browsers, classified as such.

## 7. The "Update docs" button (v1.5 — supersedes the v1 "no refresh button" cut line)

Founder-requested, same verb pattern as the learning app's "Refresh demo activity". Honest
deployment shape: the frontend is Vercel-built from main, but the Camberley machine runs the
repo + pm2 services — so the button lives on the existing production-api (3470):

- `POST /api/explainer/refresh` (admin-gated; explicit `role === 'admin'` check) runs
  `node tools/explainer/compile.mjs --live --out scripts/explainer/pack-live.json` — the same
  deterministic zero-LLM compiler, plus a live Supabase snapshot (course list, pending
  `audio_pass_requests`, content-table row counts). Output is gitignored workspace; a refresh
  never dirties the checkout.
- `GET /api/explainer/pack` serves the live pack if one exists, else the committed one.
- `src/explainer/usePack.js`: docs views render the bundled pack immediately and adopt the live
  pack when the API answers; unreachable machine = bundled fallback, never a blank page.
- **Honest scope, stated in the button's own UI copy**: the button refreshes live-state
  derivables; code-derived facts refresh when a commit deploys. (A live refresh does re-read
  the Camberley checkout's code, which may be ahead of the deployed bundle — the pack states
  its provenance either way.)

Drift gate stays authoritative in CI: `.github/workflows/explainer-check.yml` runs `--check`
on every push.

## 8. Cut lines

- No board/checker runtime personas (no such roles — see §1).
- No LLM stage in the compiler; the drift gate + an agent re-authoring rulings on failure IS the
  compile-time token spend.
- Learner level: nothing, ever (founder ruling; learners never see Popty anyway).

## 9. The Docs section dies — "Rulings + How-to" (v2, founder ruling 2026-07-28)

The founder's ruling: **the app-as-self-teaching philosophy replaces app-plus-docs-plus-manuals**,
and the nav restructures accordingly. His name for the new surface is **"Rulings + How-to"**;
the rendered label is **How & Why** (cleanest two-word rendering; his phrase stays here as the
concept's true name). Information-architecture change only — every piece of v1/v1.5 machinery
(compiler, drift gate, pack, live-refresh endpoint, Update-docs button) lives on underneath.

- **Primary nav: Courses / How & Why / Admin.** The Docs tab is gone.
- **`/how` — How & Why** is ONE surface: (a) the how-to layer — the persona-scoped pack
  explanations, rendered in full and organised around what the signed-in person actually does
  ("Finding your way around", "Working on a course", "Checking a course"…), not around system
  components; (b) the rulings layer — Pedagogy and Pod Thinking as sub-pages, the why-of-APML
  rulings prose rendered inline from the pack. Admins get a quiet footer link to the stock-take.
- **`/stocktake` — the compiled reference demotes, not dies.** Pipeline, Glossary, APML
  current-state and the Update-docs button become the admin-on-demand stock-take room, reached
  from the Admin section row (and by URL for dev/agents), absent from primary navigation.
  `DocsIndex` → `StocktakeIndex`, still rendering `pack.docs.surface`.
- **Seeds / Content / Pods are tools, not docs** — re-homed at `/canonical/*` on the Courses
  section row (Library · Seeds · Content · Pods). Not under `/courses/*` because
  `/courses/:courseCode` would swallow the paths as a course code.
- **Nothing 404s**: every `/docs/*` route redirects to its new home; `/reference/*` legacy
  redirects retargeted directly.
- **The `DOCS_SURFACE` gate adapts rather than dies**: it now governs the union of the
  stock-take, How & Why, and courses-section rows (Library exempt — it's the library itself).
  An unclassified new tab on any of those rows still fails the compile. `mustName` follows the
  new surfaces: admin must speak to the stock-take row, editor to the courses + How & Why rows.
  Persona ruling section `docs` renamed `how` (admin also gained `stocktake`).

*Last updated: 2026-07-28 (v2 — Rulings + How-to)*
