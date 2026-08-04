# Kai local-work handoff — 2026-08-04

Packaging everything durable from Kai's **local** Claude Code setup
(`~/Documents/GitHub/ssi-dashboard-v7`, machine `kaisaraceno`) so it survives the
move to the always-on assistant on **watson-1** (Command Surface), which can only
see the three SSi repos — not this machine, not the local chat history.

> **Repo note:** watson-1 clones this repo as `ssi-dashboard-v7-clean`; locally it is
> `ssi-dashboard-v7`. Same GitHub origin: `git@github.com:thomascassidyzm/ssi-dashboard-v7.git`.
> Everything referenced here is on that origin once the branches below are pushed.

## How to read this bundle

1. **`projects/`** — one file per in-flight thread. Each has: current state · what's
   done · exact next step · files/branches/PRs · gotchas. The receiving assistant has
   repo access but none of the conversational context, so these are file-level and concrete.
2. **`branches-and-uncommitted.md`** — every local branch / worktree / stash with unpushed
   or uncommitted work, what was pushed, what's deliberately abandoned.
3. **`preferences-and-conventions.md`** — how Kai likes handoffs, quality gates, rollback
   discipline, the approval gates a new assistant must inherit.
4. **`local-tooling-and-logs.md`** — scripts and probe/audit outputs that lived only on this
   machine. Durable scripts are copied into `local-tooling/`; large raw outputs are summarised
   with their key numbers + pointers.
5. **`open-questions.md`** — everything waiting on Kai or on Tom.

## Priority open threads (the four Kai named)

| # | Thread | State | File |
|---|--------|-------|------|
| 18 | eve audio-gate over-rejection | Fix committed on kai-stage (`e476b242`); **ownership decision pending Tom** | `projects/01-eve-audio-gate-issue-18.md` |
| 17 | xAI de-hiss (PR #17) | Reprocess of live audio **done** (142,973 files); pipeline PR **open, awaiting Tom's mastering-approach call** | `projects/02-xai-dehiss-pr-17.md` |
| 19 | player target-clip playback speed | Root-caused from minified bundles; **needs confirming in ssi-learning-app source** | `projects/03-playback-speed-issue-19.md` |
| — | deu/fra generation state | Audits run (clean); **eve-straggler conversion in progress**, blocked on #18; TTS = Kai's click | `projects/04-deu-fra-generation-state.md` |

## Other in-flight projects

- `projects/05-deepening-campaign.md` — fleet deepening (647 new phrases, complete, TTS pending)
- `projects/06-kor-redecomposition.md` — lego re-cut pilot, **paused** (4 blockers)
- `projects/07-completed-programs-pointers.md` — Indian-course program, 4-course build, variants (mostly done; pointers so nothing gets re-litigated)

## Landing line

See the end of this bundle's delivery message (and `open-questions.md`) for which branch
this landed on and its push/merge state.
