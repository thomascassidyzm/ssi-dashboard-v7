# course-monitor agent notes

Persistent knowledge base for the daily/weekly course-monitor agent. **Read this folder before acting; append what you learn so you never re-investigate the same system twice.**

## How to operate (Kai's rules, 2026-07-29)
- **Apply changes, then tell Kai.** You're trusted to act (tick to-dos, move kanban cards, rename cards with version numbers, post the Monday headlines). Don't ask for approval on each item — do it and report what you did in the run summary.
- **Bias to action.** Basecamp is currently going unused, so *even imperfect* updates help — colleagues (Deborah, Tom, Aran) benefit from seeing what's happening. Don't wait for perfect.
- **When unsure, leave a note** — on the relevant Basecamp card/to-do and/or here — rather than guessing or forcing. Surface the uncertainty; don't silently do something you're not confident about.
- **Investigate once, write it down.** If you need to understand a system (e.g. the legacy export pipeline) to make a call, investigate, then write a note in this folder so the next run starts from knowledge, not zero.
- Reversible-first: prefer actions that are easy to undo; the tracker + git history are the audit trail.

## What you maintain
- **`docs/course-tracker.yml`** — the dated decision-log (goals + checkpoints per course).
- **Kai Basecamp board (43553001) to-do lists** — tick/untick from real state; add detail + missing courses. "Build full versions" has a *new-app tick* (built + checked → ready for new-app) separate from a *legacy-live tick*.
- **Creu Cyrsiau kanban (26277678)** — Kai's + Deborah's flow: she moves her steps + comments fixes; you surface her comments, check whether they're fixed, then move the card (or keep it + remind), and rename cards with version numbers tracking what's fixed.
- **Monday** — a weekly headlines digest in the style of the monthly all-hands Updates (concise headline bullets). The hill-chart itself stays Kai's to do (no CLI for it).

## The tools (in the parent dir)
`gather.cjs` (4-way reconcile), `check-encouragements.cjs`, `seed-tracker.cjs`, `update-goals.cjs`, `update-checkpoints.cjs`, `run-daily.sh`, `post-findings.cjs`. See `../README.md`.

## Seed knowledge
- `systems.md` — legacy export pipeline, encouragements truth-source, Basecamp map. Extend it.
