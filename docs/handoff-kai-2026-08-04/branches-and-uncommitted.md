# Branches, worktrees & uncommitted work — 2026-08-04

Repo: `ssi-dashboard-v7` (origin `git@github.com:thomascassidyzm/ssi-dashboard-v7.git`).
Snapshot taken while packaging this handoff. **The other two SSi repos (ssi-learning-app,
SSi_Course_Production) are not checked out on this machine** — nothing local to lose there.

## The important one: `kai-stage`

- Was **66 commits ahead** of `origin/kai-stage` (0 behind → clean fast-forward). This handoff added
  **2 more** commits (see below), so **68 ahead** at packaging time.
- These 66 include: the vad-lab prosody tooling, the audio fixes ported onto main's gates, the
  eve tail-gate fix (`e476b242`, issue #18), the de-hiss merge (`d0d1910e`), founder-ruling docs,
  the deepening tracker, the Watson-VM env-switcher entry + migration runbook, and the kor pilot docs.
- **This is the single most important thing to get onto origin so watson-1 can see it.**

### Two commits this handoff added to kai-stage (preserving uncommitted local work)
1. `chore(in-flight): CJK vocab separator + SOV-known backfill playbook notes` — was the 4 modified
   files in the working tree: `services/course-builder/routes/{course-data,drafts,v2}.cjs` (join
   Chinese coordinator-vocab with `" | "` not `""`) + `docs/course-optimization/lego-spread-backfill-playbook.md`
   additions. The .cjs change is **unreviewed in-flight** — safe to revert if Kai didn't want it.
2. `docs: preserve local course-optimization notes before watson-1 migration` — 51 untracked docs
   under `docs/course-optimization/` (deu_at/deu/por/nan/yue final-passes & sweeps, fin calibration,
   gla/hye/eus native checks, minority-course briefs, zut plans), plus `docs/editorial-questions.md`,
   `docs/kai-stage-inventory-2026-07-17.md`, `docs/xai-hiss-chain-analysis-2026-07-29.md`, and
   `tools/course-monitor/notes/run-2026-07-30.md`. All content records — no code, no audio, no secrets.

> **Push status of kai-stage:** see the landing line at the bottom of this file / the delivery
> message. The automated push was blocked by the local permission classifier — it may need Kai to
> run `git push origin kai-stage` by hand.

## This handoff branch: `docs/kai-local-handoff`

Branched off `kai-stage` (so it carries the two preserve commits above as its base). Contains only
`docs/handoff-kai-2026-08-04/**`. **Not** a `claude/*` branch (those auto-merge wholesale to main).

## Open PRs (all on origin already)

| PR | Branch | What | Note |
|---|---|---|---|
| #17 | `fix/xai-hiss-denoise` | gated xAI denoise (future renders) | OPEN — awaiting Tom's mastering call (`projects/02`) |
| #15 | `feat/recording-script-seed-scope` | seed-range + sequential recording script | OPEN |
| #14 | `chore/audio-campaign-driver8-2026-07-15` | audio campaign driver8 backlog clear | OPEN — likely superseded by later campaigns; verify before merging |
| #11 | `feat/script-viewer-jump-to-round` | script-viewer jump-to-round | OPEN |
| #9  | `feature/course-editor-guardian` | safe content-editing library + Edit Guardian | OPEN |
| #4  | `feature/build-team-full-size-fix` | MVP/Full selection through to orchestrator | OPEN |
| #2  | `feature/unify-audio-needs` | export auto-advance + phrase-edit audio sync | OPEN |

## Worktrees

| Path | Checkout | State |
|---|---|---|
| `ssi-dashboard-v7` | `kai-stage` | primary working tree (this handoff authored here) |
| `ssi-dash-main-wt` | detached `6c807d0d` | **uncommitted:** `M services/audio-processor.cjs`, `M services/phases/phase8-audio-v13.cjs` — a local cherry-pick of the de-hiss (`df61179a`) onto a main checkout, so gated TTS from "main" isn't hissy. **Not unique durable work** — it's a subset of PR #17's intent; a convenience for firing gated+de-hissed TTS from a main base. Safe to discard once PR #17 (or Tom's mastering decision) lands. |
| `ssi-handoff-wt` | detached `c17b2ca3` | clean |

## Local-only branches (no upstream)

| Branch | Tip date | Unique commits vs kai-stage | Disposition |
|---|---|---|---|
| `feature/legacy-manifest-db-migration` | 2026-01-15 | **0** | fully contained in kai-stage → **safe to delete** |
| `fix/manifest-welcome-audio` | 2026-01-15 | **0** | fully contained in kai-stage → **safe to delete** |
| `feature/encouragements-table` | 2026-01-27 | 7 | old; likely superseded — Kai review before delete |
| `feature/known-gender-prep` | 2026-04-02 | 3 | old; gender-prep work long since landed elsewhere — Kai review |
| `fix/qa-orphans-and-gender-prep-timeout` | 2026-05-30 | 2 | old — Kai review; push to `fix/…` only if still wanted |
| `kai-stage-backup-2026-07-28` | 2026-07-28 | snapshot | safety snapshot before a kai-stage reset; drop once kai-stage is on origin |
| `kai-stage-uncommitted-2026-07-28` | 2026-07-28 | snapshot | ditto |

**None of these were auto-pushed** — they're old and possibly superseded, and pushing 5 stale
branches clutters origin. Kai: if any of the 3 with unique commits still matters, say so and it can
go to a `feat/…`/`fix/…` name. The two `kai-stage-*` snapshots become redundant once kai-stage lands.

## Stashes (13 — almost certainly abandoned)

All old, on `main` and old feature branches (Jan–Jul). Listed for completeness; **none look worth
resurrecting** — recommend Kai `git stash drop` them after a glance. Highlights:
`stash@{0}` WIP on feature/build-team-full-size-fix; `stash@{4}` WIP on fix/legacy-manifest-export;
`stash@{7..12}` various old "before pull" / Spanish-manifest WIP on main. Full list:
`git stash list`.

## Note on `main`

Local `main` is `e5ae7121`, **597 behind origin/main** — a stale local pointer, nothing to preserve.
`origin/main` is the real thing. Don't build on local `main`.
