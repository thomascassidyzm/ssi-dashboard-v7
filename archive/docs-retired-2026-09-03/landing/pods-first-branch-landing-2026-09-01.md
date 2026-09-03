# Landing `docs/pods-first-recording-scope-2026-08-31` — what went to main, and what did not

**1 September 2026.** The brief said this branch was 21 commits diverged and should be merged to main.
It was not 21. Against the live `origin/main` it was **123 commits ahead and 1,199 commits behind**,
with a merge base back at `8646e3f93`. A wholesale merge was refused on evidence. Fifteen commits
were landed by cherry-pick instead, and the residue is named below.

## The headline

**Landed on `main`: 15 commits, `191580271` → `ded3350de`. Nothing else on the branch was merged.**
`ci-check` is **GREEN** before and after, both runs.

## Why not a wholesale merge

Three independent reasons, each measured, not assumed.

**1. A merge of the branch into current main produces 93 real conflicts.** `git merge-tree` against
`origin/main` reports 56 add/add, 34 content and 3 modify/delete conflicts, plus 96 file-location
conflicts from the `docs/` → `archive/docs-retired-2026-08-24/` move main made on 24 August. The
conflicts are not in docs. They are in live code: 18 files under `src/views`, 13 under `src/components`,
13 under `tools/pods`, 7 under `services/voice-engine`, plus `services/production-api.cjs`,
`services/audio-processor.cjs`, `src/router/index.js` and the rest. Resolving 93 conflicts by hand in
live service code is not "landing a docs branch"; it is a merge project, and every wrong resolution
silently reverts work main has done since 24 August.

**2. The merge would resurrect code main deliberately deleted.** Three files exist on the branch and
not on main:

- `services/pod-explainer-composite.cjs`
- `services/pod-explainer-generator.cjs`
- `services/run-pod-explainer-batch.cjs`

They are absent from main because of `e909a66f6` (24 August): *"feat(pods): cut the explainer producers
— generator, composite, batch, endpoints"*. A merge brings them back. That is the decisive fact.

**3. The branch is stale on files main has moved on.** 117 of the 150 differing non-docs files were
changed by this branch after the merge base, and main has changed many of them again since. Example:
the branch's `src/router/index.js` is missing 36 lines main has. There is no safe automatic answer to
"which side wins" across 117 live files.

## What landed

Eleven commits pushed as `191580271..d97cb119a`, then four as `d97cb119a..ded3350de`.

**Docs (19 new files, 26,641 lines, pure additions, zero deletions):**

- `docs(qa)` — the Spanish landing check: 4 derailments, not 2,869; plus all 199 verdicts as run.
- `docs(drift)` — the six-course drift evidence and the per-course proposals: Portuguese, English-for-German,
  Egyptian Arabic, Korean, and the combined six-course proposal (707 drill rewrites).
- `docs(course-optimization)` — the jpn_for_eng ZUT audit and its dated batch corruption.
- `docs/popty-codebase-deep-dive-2026-08-30.md` — the four-pass read-only Popty survey, landed whole.

**Tools (13 new files, purely additive, nothing on main touched):**

- `tools/course-optimization/landing-check.cjs`, `landing-judge.cjs`, `landing-check.selftest.cjs` —
  the landing check the Spanish doc reports. Docs without their instrument is half a deliverable, so
  both landed together.
- `tools/qa/known-target-mismatch/**` (9 files) — the portable known/target content-completeness detector.
- `tools/a108/cym-yor-dechrau-periphrastic.cjs`.

Nothing that landed modifies an existing file on main. Every one of these paths was absent from main.

## What was already on main and needed no landing

Cherry-pick reported these as empty or content-identical against main — the work had already arrived
by another route, so nothing was lost by not merging:

`69ac7fde1` fix(spa) 4 landing-check derailments · `1125bbf5b` feat(course-builder) known-side
BUILD-teaches-word check · `62129ac8d` feat(edge-map) un-noded material census · `2c2727b99` feat rescue
untracked source · `996dd7bec` docs rescue 328 untracked reports (all 49 colliding files byte-identical) ·
`8fca8ad1d` chore(gitignore) (main has the same 30-line block plus two more lines) · `ccda64dd5` docs(spa)
duplicates/thin edges · `b32689bad` + `5dd5e82d0` the pause-cue A/B · `81f24ebed` + `64acecad0` the Welsh
recording scope doc (main's blob and the branch tip's blob are the same object).

**Both feat/fix commits the brief asked me to watch for live-system impact were already on main** — the
known-side BUILD-teaches-word check and the spa landing-check derailment fix. Nothing I pushed touches
a live system: 19 docs files and 13 standalone tool files, none of them imported by any service.

## The gap — what remains unlanded, honestly

**76 commits of the branch are still not on main.** In file terms, exactly 19 paths exist on the branch
and nowhere on main:

| What | Count | Note |
|---|---|---|
| `services/pod-explainer-*.cjs`, `services/run-pod-explainer-batch.cjs` | 3 | **Deliberately cut on main** (`e909a66f6`). Do not land without Tom's ruling. |
| `tools/pods/*.cjs` and their tests | 12 | `variant-run`, `splice-known-sentence-clips`, `rerender-off-role-pod-turns`, `relink-off-cast-explainer-clips`, `migrate-split-progress-forward`, `pod1-two-voice-cast`, `revert-ita-pod1-partial-2026-08-24`. Not landed because their companion edits to `pod-cast-gate.cjs`, `pod-switchover.cjs` and `pod-script-view.cjs` are content conflicts against main — the tools may not work against main's versions of those libraries. |
| `docs/pods/*.json` dry-run logs | 4 | Inert artifacts; they sit inside commits that also change pods code, so they were not worth dragging. |

Beyond those, 150 non-docs files differ between the branch and main. Deciding which side wins on each
is a pods-code review, not a merge, and it needs whoever owns the 24 August pods work.

## Recommendation

Treat this branch as **landed in part and closed**. The docs and the two QA tool sets are on main and
safe. The residue is one coherent lump — the 24 August pods splice/cast work — and it should be
re-derived on top of current main by someone who can say whether main's explainer cut and main's
`pod-cast-gate` are the intended state. Merging the branch to get it is not safe and would undo the cut.

## Verification

- `ci-check` on the landed commits before push: **GREEN** (explainer-drift PASS, service-syntax PASS).
- `ci-check` on `origin/main` after push: **GREEN**, at `d97cb119a`; the docs-only follow-up also GREEN.
- Both pushes were fast-forwards. No force-push. No file on main was modified or deleted by either.
