# Item 7 back-fill authoring brief (overnight #785·AK, child #791·AK)

You AUTHOR rows into JSON files. You never write to any database, never call edit-batch (not even a dry run), link-clip or
/api/audio/render, never apply a changeset, never arm a timer. Tests are off estate-wide: run none. Scratch in `$CS_SCRATCH`.

## Why
Paid-cleanup item 9 deleted rows that used untaught target words. In 17 courses no replacement rows were authored, so
(Kai 19 Nov 12:25Z, "thin baskets over bad phrases") the deletes ran alone and left debut LEGOs below the phrase floor
(seed 1-3: 1 BUILD + 1 USE; seed 4 on: 3 BUILD + 5 USE; the bare LEGO never counts). You author the missing rows. Kai
approves the apply separately; your rows become one night changeset per course.

## Setup (every command from `ops/overnight-785/item7-backfill/` in your worktree, after `git fetch origin main && git merge --ff-only origin/main`)
```
export ITEM9_LIVE_DIR=~/ssi-evidence/ssi-dashboard-v7/ops/overnight-785/item7-backfill/copy   # course snapshots from QA copy ssi_copy_20261123t033000z
export ITEM9_ITEM_DIR=$PWD
K=../../paid-cleanup-item9/tools
```
- `<course>/worklist.json`: each LEGO with `state: "short"` and how many BUILD (`need_build`) / USE (`need_use`) it lacks.
- `node $K/dump.cjs <course> <seed>` prints that seed's baskets AND records `<course>/seen/S####.json` (the build refuses a
  seed you never dumped).
- `node $K/vocab.cjs <course> <seed> [regex]` lists every LEGO taught up to that seed: the ONLY target material you may use
  (this seed's own LEGOs only up to and including the LEGO you author under, never a later sibling).

## What to write: `<course>/authored/S####.json` (one per seed; INSERTS ONLY)
```
{ "seed": 412,
  "legos": { "L02": { "insert": [["build","<known>","<target>"], ["use","<known>","<target>"]],
                      "accept_gap": "optional: why fewer than needed (counted, never hidden)" } },
  "notes": "brief why" }
```
Known = the learner's language (for `eng_for_X` the known side is X and the target is English; for `X_for_eng` known is
English). Match how the course already glosses the LEGO and the register/gender/person the basket already uses.

## The check loop
`node tools/to-changeset.cjs --dry <course>` prints every error (writes nothing). Fix what it names, re-run, until **0
errors**. It enforces: taught words only (the builder's own vocab check), whole LEGO contained (P17), not the bare LEGO,
no duplicate in the basket, **no known+target pair that already exists anywhere in the course** (item 12 lesson), and ZUT
course-wide (a known prompt that already maps to a different target anywhere is refused). When clean, run it once without
`--dry` to write `<course>/changesets/backfill.changeset.jsonl` + `.guards.json` + `summary.json`, then from the repo
root `node tools/changeset/apply-changeset.cjs ops/overnight-785/item7-backfill/<course>/changesets/backfill.changeset.jsonl --check`
(offline parse, no DB). Then READ every row yourself against the canon below and the grammar of both languages.

## Canon (full: `course-methodology-canon.md` §3 l.572, §4 l.719)
- **P1/P2/K14-K16** target uses only material taught by that point, tiled from whole taught chunks; no untaught
  inflection/conjugation/contraction; correct natural language a native would say. Fix downward, never add a LEGO.
- **K1/K9** the known side is a controlled language too: no word or structure the learner has not been given; natural.
- **ZUT/K2** one known prompt → exactly one target form.
- **P17** every row contains the WHOLE LEGO (both sides as glossed). **P3** a BUILD shows the LEGO plugging into known
  material (not bare LEGO + filler). **P7** USE rows are full sentences, sayable alone. **P6** a USE replays cold: unambiguous.
- **P28** once a form is taught for a meaning, every phrase with that meaning uses exactly that form.
- **Thin baskets over bad phrases** (Kai 19 Nov): never pad. Fewer good rows + `accept_gap` beats a weak row. Count it.
- **Stand-in "it" frames are OK** (Kai 17 Nov). Vocabulary is known / target / seed, never "source".
- Best effort, not questions (Kai 16 Nov): no native-speaker holds, no question lists; label confidence in `notes`.

## Deliver
Commit ONLY `ops/overnight-785/item7-backfill/<your courses>/` (authored/, seen/, changesets/), merge origin/main, and land
on main: `git fetch origin main && git merge origin/main && git push origin HEAD:main` (fast-forward only, never force, no
`[hotfix]`). Report ONE paragraph: per course LEGOs short / filled to floor / still thin (and why), rows (B/U), dropped,
`--check` result, gross audio chars from summary.json; landing line. Nothing applied, nothing rendered.
