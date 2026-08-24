# This tree was retired on 2026-08-24

Tom retired the documentation estate on 2026-08-24: *"let's properly archive the docs so the workers are not tempted to read them."* Nothing was deleted — every file moved, with its history, to **`archive/docs-retired-2026-08-24/`**. Go there only for archaeology, and never to answer a question about how the system behaves today.

**The code and the live DB are gospel.** Documentation here was out of date by design, and the cost of keeping it current was higher than its worth. Before acting on any claim you find in a document — an audit, a build report, a design memo, a README — verify it against the running code. If the code cannot answer the question, **ask Tom one plain question** rather than trusting a document.

## What is still in this directory, and why

These are not stragglers. Each one is read by running code, so it is code, not documentation:

- **`pair-contracts/*.contract.cjs`** — `require()`d by the course-builder validator on every seed submission (`services/course-builder/lib/validation.cjs`, `tools/known-side-gate.cjs`). Moving these would break course submission for every course.
- **`pods/*.md`** — bundled into the dashboard SPA by `import.meta.glob` in `src/content/pod-thinking-docs.js` and served at `/how/pod-thinking`. It is content. Live jobs were also writing here on 2026-08-24.
- **`explainer-pack.md`, `explainer-agent.md`, `explainer-dev.md`** — regenerated outputs written by `tools/explainer/compile.mjs`.
- **`a108/a136-*.json`** (three files) — read by `tools/a108/a136-ear-samples.cjs`.
- **`gle-cn/`, `gle-ul/`** — the in-flight Connemara/Ulster Irish build; `gle-cn/dialect-check.cjs` is executable and is required by build scripts.
- **Anything created or modified on 2026-08-24** — left where live jobs were writing it. A follow-up sweep can collect the dead part once those jobs land.
- **`sessions/` and `course-optimization/**/*.json`** — gitignored session scratch, left untracked in place.

At the repo root, `SYSTEM.md`, `ralph-methodology.md` and `synonym-choice-architecture.md` also stayed, because live services `readFileSync` them (`tools/explainer/compile.mjs`, `services/briefs/shared.cjs`).
