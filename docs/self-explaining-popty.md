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

## 6. Superseded docs (report, not delete)

Where a published docs page duplicates what the compiler derives, the compiled pack supersedes
it. The v1 build reports which of `/docs` pages (`ProcessOverview`, `PhaseIntelligence`,
`TerminologyGlossary`, …) are now derivable. Hand-written docs stay.

## 7. Cut lines (v1)

- No board/checker runtime personas (no such roles — see §1).
- No pack-refresh button; the CLI is the regenerate path.
- No LLM stage in the compiler; the drift gate + an agent re-authoring rulings on failure IS the
  compile-time token spend.
- Learner level: nothing, ever (founder ruling; learners never see Popty anyway).

*Last updated: 2026-07-27*
