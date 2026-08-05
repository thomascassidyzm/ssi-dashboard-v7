# Scout: the self-teaching-app paradigm — learning-app → Popty gap

**Date:** 2026-08-04 · **Scope:** `ssi-learning-app` (reference) vs `ssi-dashboard-v7-clean` / Popty (target)
**Method:** live code read in both repos, both compilers run in `--check` mode, Popty's explainer test suite run, learning-app walkthrough screenshots read. Docs were read for vocabulary and intent only; where a doc and the code disagree, that is called out as a finding.

**Branch read:** Popty at `docs/forced-alignment-experiment-2026-08-04`, working tree dirty (14 untracked docs, 2 modified service files — all unrelated to this scout, untouched). `git cherry origin/main HEAD` returns **zero** commits: this branch carries no unlanded content, so everything reported below about Popty is on `main`. Learning app read at `chore/schema-snapshot-db-perf-2026-08-04`.

---

## The headline

The commissioning hypothesis was: *Popty has the explainer half, lacks the walkthrough half, and its self-updating loop may be manual where the learning app's is automatic.*

**Half confirmed, half refuted.**

- **Confirmed:** Popty has **no walkthrough engine at all**. Zero `data-walk` anchors across 123 `.vue` files, no overlay, no walks, no compiler. The "how this works clips" — the thing Tom actually pointed at — are the part that is missing.
- **Refuted, and worth reading twice:** Popty's self-updating loop is **stronger than the learning app's**, not weaker. Popty runs its explainer drift gate in a dedicated CI workflow on every push and PR. **The learning app does not run its explainer drift gate anywhere** — not in CI, not in a test. The "Update docs" button is not a manual substitute for automation; it covers live database state that the learning app's compiler cannot reach at all.

So the port is not "catch Popty up." It is: **graft the walkthrough engine onto an explainer layer that has already overtaken the original.**

---

## 1. What the learning app actually does

Two engines and two compilers, sharing one pack idiom and cross-checking each other.

### 1.1 The "how this works clips" — what the artefact is

A clip is **not video**. It is a hand-authored JSON walk, compiled to a static pack, replayed as an overlay **on the real page over real data**.

`docs/walkthrough-engine/w1-step0-verb.png` settles it: the live school dashboard, a red pulse ring around the real "Invite a person" button, and a small card reading *"People join through here — tap **Invite a person**. Nothing is created until you submit the form."* with progress dots and a skip cross. The page underneath stays live.

**Where they live:** `tools/walkthrough/walks/*.json` — five walks (`invite-first-teacher`, `invites-desk`, `reading-insights`, `run-class-session`, `ways-in`), 19 steps total. Source files in the repo, hand-authored.

One clip's authored source, verbatim (`tools/walkthrough/walks/invite-first-teacher.json`):

```json
{
  "id": "invite-first-teacher",
  "title": "Bring your first teacher in",
  "personas": ["admin", "leader", "school_admin"],
  "place": { "route": "node-home", "kinds": ["school"] },
  "steps": [
    {
      "anchor": "verb-invite-person",
      "say": "People join through here — tap **Invite a person**. Nothing is created until you submit the form.",
      "advance": { "on": "click" }
    },
    {
      "anchor": "invite-form-role",
      "say": "Pick **Teacher** — the link carries the role with it, so whoever clicks it arrives as a teacher of this school.",
      "advance": { "on": "next" }
    },
    {
      "anchor": "invite-form-submit",
      "say": "With their name filled in, this mints their own sign-in link — the account exists the moment you tap, and the link IS their login. Send it any way you like.",
      "advance": { "on": "next" }
    },
    {
      "anchor": "ways-in-ledger",
      "say": "Every link you mint lands here in **Ways in** — you can revoke it or re-mint it any time. Re-minting kills the old link on the spot.",
      "advance": { "on": "next" },
      "terminal": "That's the whole flow — the link is their login. This tour minted nothing; only your own taps do."
    }
  ]
}
```

That is the whole authored surface of a clip. Four fields per step: what to point at, what to say, how it advances, and optionally a closing line.

**How they compile:** `tools/walkthrough/compile.mjs` (CLI shell) + `tools/walkthrough/lib.mjs` (pure gates, 217 lines) → `packages/player-vue/src/walkthrough/pack.json`, plus a human-readable render at `docs/walkthrough-pack.md`. The pack is a Vite `import` in `useWalkthrough.ts` — bundled at build time, zero runtime fetches, zero model calls. Verified: `node tools/walkthrough/compile.mjs --check` → `check OK — pack version would be a785aa0b7033 (5 walks · 19 steps)`, matching the committed pack's version exactly.

**How the UI surfaces them:** `packages/player-vue/src/components/admin/WalkOverlay.vue`, mounted once in `App.vue`. Anchors resolve by live `querySelector` on `data-walk="<id>"` attributes (21 of them across the real admin components) with a 5s bounded wait — an anchor that never appears degrades to an unanchored card with Next, so a walk can never hang. Ring is `position:fixed` off `getBoundingClientRect`; the overlay is `pointer-events:none` except the card, so it is **never a modal trap**. `advance.on: "click"` steps listen for the user's own click on the real element; the overlay never synthesises one.

Two entry points, both tap-only:
- **`HowThisWorks.vue`** — a quiet "How this works" text link that opens an inline card with the compiled persona×kind prose, the current noticing invitations, and a "Show me — {walk title}" button per offerable walk.
- **A noticing invitation CTA** whose target is `walk:<id>` (e.g. rule `school-needs-first-teacher`: *"No teachers here yet — want a 30-second tour of bringing the first one in?"*).

Discoverability without nagging: `howThisWorksThrob.ts` makes the link carry a small pulsing dot on first visit, re-arming when the noticing rules surface an invitation key the viewer hasn't seen. Opening the panel disarms it. localStorage, pruned at 180 days.

### 1.2 The explainer engine (prose + noticing)

`tools/explainer/compile.mjs` (201 lines) **derives live truth by parsing the surfaces' own source**, not from prose:

- verbs ← regex over `<button class="verb...">` in `NodeActionBar.vue`, with `v-if="!member"` marking admin-only
- stat words ← `word: '...'` literals in `NodeHomeView.vue`
- insight measures and windows ← the option literals in `api/groups/[id]/rate-compare.ts`
- schema presence ← needles in `supabase/schema.sql`

Against that it validates the **hand-written** persona rulings (`tools/explainer/rulings/{admin,leader,school_admin,teacher}.md`) and the noticing rules (`rules.json`). Output: `packages/player-vue/src/explainer/pack.json` + `docs/explainer-pack.md`.

### 1.3 Self-updating: what is actually automatic, and where the human sits

This is the load-bearing question, so here is the honest answer.

**Automatic — the drift gate.** The compilers fail the build when code and clips fall out of lockstep. Eight walkthrough gates in `lib.mjs`:

| Gate | Fails when |
|---|---|
| schema | malformed walk (bad persona, advance kind, terminal on a non-final step) |
| unique ids | two walks share an id |
| **anchors** | a step's `data-walk="<id>"` exists in no `.vue` source |
| **persona** | a member-offered walk anchors to an element only present behind `v-if="!member"` |
| **places** | `place.route` isn't in the runtime's `KNOWN_PLACES` — lockstep with `useWalkthrough.ts` |
| **offers** | a `walk:` CTA in `rules.json` names no walk; or `evaluateRules.ts` drops `'walk:'` handling |
| **safety** | a click-advance step anchors a destructive/minting verb (`/delete/`, `/submit/`, `/revoke/`, `/remint/`, `/play/`, …) — show-and-point only |
| **no-autoplay** | `startWalk()` is called anywhere outside an `@click` attribute (structurally forbids a mounted-hook autostart) |
| **denylist mirror** | `useWalkthrough.ts`'s runtime copy of the denylist has drifted from the compiler's |

The explainer compiler adds its own: **every verb visible to a persona must be named in that persona's ruling.** Rename a button, and the compile fails naming the ruling that now lies. That is the mechanism that replaces "remember to update the docs."

**Where the CI teeth actually are — and where they are not.** `compileGate.test.ts` spawns the real `compile.mjs --check` inside vitest, so `pnpm --filter player-vue test` fails on drift, and `.github/workflows/verify.yml` runs that on every push. The walkthrough gate is genuinely CI-enforced.

**The explainer gate is not.** I grepped every `.ts`/`.yml`/`.json`/`.cjs`/`.mjs` in the repo: nothing spawns `tools/explainer/compile.mjs`. `verify.yml` has no explainer step. So a stale persona ruling only fails when someone runs the CLI by hand.

> **Doc-vs-code contradiction #1.** `docs/self-explaining-dashboard.md` documents `--check` as "validate only (CI-friendly), no writes" and says "The gate turns 'keep the docs fresh' from a vigilance problem into a build failure." In the learning app that is **only true of the walkthrough compiler**. The explainer compiler's gate is a manual CLI. Popty is the repo where that sentence is literally true.

**Where the human sits.** The prose is hand-written and stays hand-written — that is deliberate, and the compilers say so ("the DECISIONS side"). What is derived is the *truth manifest* (verbs, stat words, measures, windows) and the *validation* of prose against it. Nothing generates prose. The loop is: process changes → code changes → **compile fails** → a human or agent rewrites the affected ruling → recompile → commit. The gate does not write; it refuses to let a lie ship. The compiler's own header calls an LLM authoring stage explicitly not-built.

---

## 2. What Popty actually has

**Everything on `origin/main`. All of it reachable and exercised — not dead code.**

### 2.1 The explainer port, and how far past the original it has gone

`tools/explainer/compile.mjs` is **567 lines to the learning app's 201**. It is not a stale fork; it is the same idea taken considerably further. Verified run:

```
node tools/explainer/compile.mjs --check
  ⚠ scripts/vocab-gate/audit-results.json absent on this machine — snapshot carried over from the previous pack (98 courses)
[explainer] check OK — pack version would be f222c9ee9159 (3 personas · 14 gates · 4 rules · 12 glossary terms · 47 tables · 98 snapshot courses)
```

`f222c9ee9159` matches the committed `src/explainer/pack.json` exactly — the checkout is in lockstep.

What it derives that the learning app's does not:

| Derivation | Source parsed |
|---|---|
| nav tabs, per IA section | `src/components/AppNavbar.vue` (`primaryTabs`/`sectionTabs` computeds, sliced so a moved tab re-classifies itself) |
| role model | `src/views/UserManagement.vue` `<option>`s + `src/composables/useAuth.js` |
| recorder surface | `Record Room` route in `src/router/index.js` |
| phase pipeline | the *Active Workflow* line and port table of `SYSTEM.md` — explicitly "the rest of that file is dated prose" |
| build gates | `services/course-builder/lib/validation.cjs` exports, `MAX_LEGO_SYLLABLES` from `language-config.cjs`, `isKnownVocabBreach` presence, pair contracts on disk |
| voice policy | `HUMAN_VOICE_COURSES` set + `cym_*` prefix rule from `human-voice-courses.cjs`, `queueAudioPass` presence |
| agent API | `router.get/post` literals in `services/course-builder/routes/seed-complete.cjs` |
| live table usage | recursive `.from('table')` scan of `services/` + `src/` — 47 tables, deprecated ones flagged |

Two governance gates the learning app has no analogue for:

- **Glossary pointer verification.** Each term in `rulings/docs/glossary.md` carries `> lives in: \`table\``, `> enforced by: \`symbol\``, `> code: \`path\`` lines, and the compile **fails** if the table is referenced nowhere, the symbol has left the course-builder source, or the path doesn't exist. A term cannot outlive the thing it names.
- **`DOCS_SURFACE` classification.** Every tab on the stock-take / How & Why / courses rows must be declared `compiled` | `rulings` | `data`, or the compile fails: *"rule on it before it ships."* This is a structural block on the docs estate silently regrowing.

Plus two modes the learning app's compiler has no concept of: `--live` (Supabase course list, pending audio-pass count, content row counts, **plus a live `information_schema` schema dump** over the direct `pg` connection — the founder's 2026-07-29 "current schema is truth, migrations lie" ruling made executable) and `--out <path>` (write the pack somewhere gitignored so an on-demand refresh never dirties the checkout).

**CI:** `.github/workflows/explainer-check.yml` — *"The explainer drift gate, authoritative in CI (founder ruling 2026-07-27)"* — runs `node tools/explainer/compile.mjs --check` on push to `main` and `claude/**`, and on every PR. Dependency-free node, no install step. **This is the gate the learning app is missing.**

### 2.2 The runtime surfaces, and whether they're live

| File | What it does | Mounted at |
|---|---|---|
| `src/explainer/usePack.js` | bundled pack + best-effort `GET {api_base}/api/explainer/pack` for the live one; bundle stands if the machine is unreachable | all docs views + `HowAndWhy.vue` |
| `src/explainer/evaluateRules.js` | rule engine; shapes `node`/`perChild`/`countWhere`, ops `eq/gt/lt/gte/lte/truthy/falsy/daysSinceGt` | `NoticingInvitations.vue` |
| `src/explainer/mdlite.js` | 14-line markdown-lite renderer | docs views |
| `src/components/explainer/HowThisWorks.vue` | quiet link → inline card, persona-scoped, keyed on a `section` prop | `Home.vue`, `RecordRoom.vue`, `QAReview.vue` |
| `src/components/explainer/NoticingInvitations.vue` | invitation cards from the rules | `Home.vue`, `RecordRoom.vue`, `QAReview.vue` |
| `src/components/explainer/UpdateDocsButton.vue` | admin "Update docs" verb + pack provenance stamp | `StocktakeIndex`, `DocsPipeline`, `DocsGlossary`, `DocsApml` |
| `src/views/HowAndWhy.vue` | the `/how` surface — how-to layer (pack explanations, ordered by what you *do*) + rulings layer (schema ruling, APML lineage, links to Pedagogy / Pod Thinking) | route `/how`, primary nav tab "How & Why" |

`src/explainer/evaluateRules.test.js` — 8 tests, all green (`npx vitest run`, 330ms).

**IA:** `/how` is a primary nav tab. `/docs`, `/docs/pedagogy`, `/docs/pod-thinking`, `/reference/pedagogy` all **redirect** to `/how/*` — the commit `af039027 feat(ia): Docs dies as a destination` did what it says. Nothing here is dead code.

### 2.3 What "Update docs" actually is

`UpdateDocsButton` → `usePack().refresh(token)` → `POST /api/explainer/refresh` on `services/production-api.cjs:1319`, admin-gated, single-flight. That handler `execFile`s `node tools/explainer/compile.mjs --live --out scripts/explainer/pack-live.json` on the production machine (60s timeout) and returns the new version. A drift-gate failure comes back as a 500 with the compiler's own message — *"A drift-gate failure here is signal, not noise."*

**It is manual, and correctly so.** The button's own copy is scope-honest: it refreshes **live-state derivables only** (course list, audio-pass queue, DB counts, schema dump). Code-derived facts refresh when a commit deploys — *"the button cannot outrun git."* This is not a weaker version of the learning app's automation; it is a second layer covering a class of truth (the live database) that the learning app's compiler cannot reach at all.

### 2.4 What is missing

**The entire walkthrough engine.** Confirmed by grep across `src/` and `tools/`: zero matches for `useWalkthrough`, `WalkOverlay`, `WalkOffer`, `overlayPlacement`, `data-walk=`. No `tools/walkthrough/`, no `walks/`. And downstream of that:

- `HowThisWorks.vue` has **no throb** (no `howThisWorksThrob` equivalent), **no walks list**, and **does not surface invitations in its panel** — it is the learning app's pre-2026-07-29 shape.
- `evaluateRules.js` has **zero** occurrences of `walk` — no `walk:` CTA target.
- `compile.mjs`'s CTA validation accepts `'self'` or a real router path and **fails everything else** — a `walk:` target would fail the gate today.

**Naming collision worth knowing:** `services/pod-explainer-*.cjs`, `docs/pods/*explainer*` are **unrelated** — pod explainer *audio* generation. Don't let a grep for "explainer" conflate them.

### 2.5 Where Popty's user-facing knowledge still lives

The estate the paradigm exists to dissolve: **190 markdown files under `docs/`** (63 top-level, 28 subdirectories), plus `SYSTEM.md` (537 lines), `CLAUDE.md`, `README.md` (197 lines), `WORKLIST.md`, `ralph-methodology.md`, `synonym-choice-architecture.md`.

Three of those are already partially load-bearing *inputs* rather than prose: the compiler parses `SYSTEM.md`'s workflow line and port table, and `CLAUDE.md` supplies the deprecated-table set. The rest is unmanaged.

> **Doc-vs-code contradiction #2.** The compiler encodes distrust of its own repo's docs in a code comment: *"ONLY the 'Active Workflow' headline and the port table of SYSTEM.md are trusted; the rest of that file is dated prose."* That is the paradigm's own diagnosis of the 190-file estate, written into the gate.

---

## 3. The gap: what a port would touch

### 3.1 Piece-by-piece

| Learning-app piece | Popty status |
|---|---|
| explainer compiler + drift gate | **has, and further** — 567 vs 201 lines, wider derivation, glossary + surface-classification gates |
| explainer CI enforcement | **has, and the learning app doesn't** — `explainer-check.yml` |
| live-state refresh (`--live`, `--out`, refresh endpoint, admin button) | **has; learning app lacks entirely** |
| persona rulings + noticing rules + evaluator + pack | **has** (5 app/file personas, 4 rules, 12 glossary terms) |
| `HowThisWorks` panel | **has, older shape** — no throb, no walks, no invitations in panel |
| `NoticingInvitations` cards | **has** |
| walk JSON sources (`tools/walkthrough/walks/`) | **lacks** |
| walkthrough compiler (`compile.mjs` + `lib.mjs`, 8 gates) | **lacks** |
| runtime state machine (`useWalkthrough`) | **lacks** |
| overlay + placement (`WalkOverlay`, `overlayPlacement`) | **lacks** |
| `data-walk` anchors on real elements | **lacks** — 0 across 123 `.vue` files |
| `walk:` CTA in evaluator + compiler | **lacks** — and the compiler would actively reject one today |
| throb / re-arm state | **lacks** |
| CI teeth for the walkthrough gate | **lacks, and cannot be inherited** (see 3.3) |

### 3.2 Files a port creates or changes

**New (6):**
- `src/walkthrough/useWalkthrough.js` — port of the 153-line `.ts`; `KNOWN_PLACES` re-chosen for Popty's routes; the `DESTRUCTIVE_ANCHOR_PATTERNS` runtime mirror re-derived for Popty's verbs (its destructive surface is different — builds, TTS spend, audio passes, course deletion)
- `src/walkthrough/overlayPlacement.js` — 76 lines, pure, near-verbatim
- `src/walkthrough/pack.json` — generated
- `src/components/explainer/WalkOverlay.vue` — ~250 lines; restyle from `--schools-red`/`--schools-fg-*` to Popty's `--accent`/`--surface`/`--line`/`--ink`
- `tools/walkthrough/lib.mjs` + `tools/walkthrough/compile.mjs` — gates + CLI; `vueFilesUnder` scans `src/` not `packages/player-vue/src/`
- `tools/walkthrough/walks/*.json` — authored content, Popty-specific

**Changed (4):**
- `src/explainer/evaluateRules.js` — add `walk:` prefix handling alongside `'self'` and router paths, and carry a `walk` field on the invitation
- `tools/explainer/compile.mjs` — CTA validation currently *rejects* anything that isn't `'self'` or a router path; add the `walk:<id>` branch and the walk-id lockstep (mirrors the learning app's `readdirSync` over `walks/`)
- `src/components/explainer/HowThisWorks.vue` — walks list ("Show me — …"), invitations in the panel, throb; plus `src/explainer/howThisWorksThrob.js` (63 lines, localStorage, straight port)
- `.github/workflows/explainer-check.yml` — one added step

**Anchors:** `data-walk="…"` on every element a walk points at, across the relevant slice of 123 `.vue` files. The learning app needed 21 anchors for 5 walks. This is the bulk of the hand-labour and it is unavoidable — anchoring by reference rather than by heuristic is exactly what makes the gate honest.

### 3.3 Structural differences and what they cost

**Verified as briefed:** the learning app is a pnpm workspace monorepo (`packages/player-vue`, TypeScript with `vue-tsc`, Vercel `api/*.ts` serverless); Popty is a flat Vite/Vue 3 SPA, **plain JavaScript with no `tsconfig.json` at all**, with an Express backend in `services/production-api.cjs` and `.cjs` tooling.

- **TS → JS: cheap.** Five files, delete the type annotations. `evaluateRules.js` already proves the pattern — it is the learning app's `.ts` with the types stripped, and it works.
- **Monorepo → flat: cheap.** Path constants only; `ROOT` resolves one level differently and the vue scan root changes.
- **Vercel `api/` → Express: free.** Walks need no server. Popty's Express layer is an *advantage* here, not a cost — the refresh endpoint already exists.
- **CI teeth: cheap, and simpler than the original.** The learning app smuggles its gate into vitest (`compileGate.test.ts` spawns the CLI) because `verify.yml` runs tests. **Popty's CI runs no test suite at all** — `auto-merge-claude.yml` only merges and pushes; `explainer-check.yml` only runs the drift gate. So the vitest trick does not transfer. But the fix is *one line* — add `node tools/walkthrough/compile.mjs --check` to `explainer-check.yml`, which is dependency-free node and needs no install. Strictly simpler than the learning app's arrangement.
- **Persona-visibility gate: genuinely not portable as written.** Gate 2 fails a member-offered walk whose anchor exists only behind `v-if="!member"`. Popty has no such marker: visibility comes from `useAuth`'s `isAdmin` / `isRecorder` / `hasDashboardAccess`, expressed variously in templates and in router guards. A straight port of this gate would be a **no-op that looks like a gate** — the worst possible outcome. It must be re-authored against Popty's own guard idiom, or dropped with the loss stated out loud.
- **Place model needs a decision.** Learning-app walks key on `persona × place.route × node kind`, with four semantic `KNOWN_PLACES`. Popty's `HowThisWorks` keys on a `section` prop (`home`, `courses`, `checking`, `admin`, `record-room`, `how`). **My recommendation: reuse `section` as the place key.** It already exists, already matches the persona-scoped ruling sections, and already appears in `HowAndWhy.vue`'s `SECTION_ORDER` — one concept instead of two.

**Not portable, and I would not try:** the learning app's `docs/walkthrough-engine/` Playwright e2e harness asserts on the `data-walk-active` DOM breadcrumb against a real staging session. Popty's Playwright config covers only pod-recording, and Popty's admin surfaces need a signed-in dashboard user against the production machine. Port the breadcrumb (it is three lines in `useWalkthrough`), leave the harness; verify by hand for v1 and say so.

### 3.4 Size and the biggest risk

**Size.** Engine ~600 lines of near-mechanical port across 5 files; compiler ~300 lines across 2 files, of which exactly one gate needs re-authoring; 4 existing files edited; 1 CI line. That is a day or two of code. **The real work is the anchors and the walk authoring** — deciding which four or five journeys through Popty actually deserve a clip, then anchoring them. That is taste work, not engineering, and it is where the schedule goes.

**The biggest single risk — and it is not the port.** The anchor gate proves only that `data-walk="<id>"` exists *somewhere* in `.vue` source. It does not prove the anchor is on the route the walk claims, nor that the persona being offered the walk can see it. In the learning app the persona half is covered by the `!member` heuristic; **in Popty there is no equivalent, so a ported gate is strictly weaker than the original while looking identical.** A walk could point a recorder at an admin-only button and compile green. The paradigm's whole value is that a green build means the app is not lying about itself — a gate that cannot see Popty's guards spends that credibility without earning it.

**My recommendation:** before writing a single walk, spend the first slice on Popty's persona-visibility gate — pick a machine-checkable convention for guarded elements (a `data-persona="admin"` attribute alongside `data-walk`, checked against the walk's personas, is the cheapest thing that actually works) and make it fail the build. Everything else in the port is mechanical and safe. This is the one piece where a fast port produces a gate that lies.

---

## 4. Explicit gaps and what needs Tom

### Could not verify

- **Nothing was verified in a running app.** I ran no dev server and touched no database, per the read-only brief. "Reachable, not dead code" for Popty's explainer rests on mount sites, router entries, a passing test suite and a green CI gate — **not** on a live click-through. Same for the learning app: the walkthrough rendering is established from the code and from the 2026-07-28 screenshots in `docs/walkthrough-engine/`, not from a live session today.
- **`scripts/vocab-gate/audit-results.json` is absent on this machine** (gitignored workspace), so Popty's compile carries a 98-course snapshot forward from the previous pack rather than deriving it fresh. The compiler warns about this honestly. I could not check the snapshot against live data.
- **`--live` was not run** — it needs `.env`/`.env.psql` and would hit Supabase. The live path is read from code, not exercised.

### Findings that should not be lost

1. **The learning app's explainer drift gate has no CI teeth.** `docs/self-explaining-dashboard.md` implies it does. One step in `verify.yml`, or one `spawnSync` in a vitest file mirroring `compileGate.test.ts`, closes it. This is a fix *to the learning app*, found while scouting Popty, and it is a five-minute change.
2. **Popty's explainer is now the reference implementation**, not the copy. If a third app gets the paradigm, port from Popty.

### Needs Tom

1. **Which journeys deserve clips?** The learning app chose five. Popty's candidates are visible from its own IA — building a course, checking a course (QA), the Record Room read-through, running an audio pass, the stock-take surface. This is a taste call about what a new editor or recorder most needs shown, and it is the input the whole port hangs on.
2. **Does "self-updating" extend to the 190-file `docs/` estate?** The paradigm says "no docs, no training manuals," and `DOCS_SURFACE` already blocks new ungoverned pages. Nothing yet dissolves the existing 190. That is a separate, larger pass — worth naming now so it isn't mistaken for part of the walkthrough port.
