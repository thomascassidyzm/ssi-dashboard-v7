# Item 9 back-fill authoring brief (cs #778, for its authoring workers)

You AUTHOR. You do not apply. You never call edit-batch (not even a dry run), link-clip, or /api/audio/render, and you never write to the database by any route. #778 is the only writer; it merges your files, re-reads live, dry-runs and applies them.

## Why
Kai approved paid-cleanup item 9 (words used before they are taught) on 18 Nov 15:41Z. Rows using a target word no seed has taught yet are being deleted (canon K14/K15). Where that would leave a NEW LEGO's basket below the floor (3 BUILD + 5 USE from seed 4; 1+1 for seeds 1-3) or below what it had, replacement rows must be authored FIRST from words already taught. Your job: author those rows, and (where listed for your courses) the seed re-cuts. Kai's standing rules: quality over count; good real phrases only; no thin baskets; where a seed's basket is badly hit, REBUILD it (rewrite weak rows too) rather than patch.

## Setup
1. `git fetch origin cs/778-apply-item-9-untaught-words && git merge --no-edit origin/cs/778-apply-item-9-untaught-words` (your worktree is off main; the tools and plans are on that branch).
2. Work in `ops/paid-cleanup-item9/`. Live snapshots are already in `~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item9/live/<course>.json` (refetched ~18:30Z). If you need full rows for seeds not in `<course>/plans/` (re-cut seeds), refetch ONLY your course with the union: `node tools/fetch.cjs <course> "<every plans/ seed number>,<your extra seeds>"` (it overwrites the snapshot; plan seeds must stay in the list).
3. Scratch in `$CS_SCRATCH`, never /tmp.

## What to author
For each LEGO in `<course>/backfill.json` `shortfall` with `author_build + author_use > 0`:
- `node tools/dump.cjs <course> <seed>` prints the seed's baskets (rows marked `*` are scan rows, i.e. planned deletes) and records `seen/S####.json`.
- `node tools/vocab.cjs <course> <seed> [regex]` lists every LEGO taught up to that seed (the ONLY words you may use on the target side; this seed's own LEGOs only up to and including the LEGO you author under — never a later sibling).
- Write `<course>/authored/S####.json`:
```
{ "seed": 412,
  "legos": { "L02": { "insert": [["build","<known>","<target>"], ["use","<known>","<target>"]],
                      "update": { "U03": ["<new known>","<new target>"] },   // rewrite a weak/planned-delete row in place instead
                      "keep": [] } },                                          // cancel a planned delete (only if the row is actually legal)
  "notes": "why, briefly" }
```
  An `update` on a planned-delete row replaces its delete (rewriting is often better than delete+insert: same slot, same id).
- Author at least `author_build` BUILD and `author_use` USE rows per LEGO. If you cannot make enough GOOD rows, author fewer and say so in `notes` and in your report: never pad with weak rows.

## Seed re-cuts (only the courses where your brief lists them)
The word is in the seed sentence but no LEGO of the seed carries it, so later rows using it are illegal. Grow (or re-cut) the seed's LEGO the shortest way so it carries the word (canon L26: it must stay a piece of its seed; L3 8-syllable cap; ZUT), using `lego_ops` in the same authored file:
```
"lego_ops": { "L02": { "set": { "known_text": "...", "target_text": "...", "type": "M", "components": [{"known":"...","target":"..."}] }, "why": "..." } }
```
then rewrite (`update`) every row of that LEGO's basket that no longer contains the whole new LEGO (canon P17/O12), keeping each basket at floor. Do NOT insert new LEGOs (`lego_ops.insert`): those are held for Kai's key. Worked example already live: eng_for_guj S0071L02 "anyone to" -> "let anyone" (see `eng_for_guj/batches/probe.ops.json`).

## Check your work (all read-only)
- `node tools/merge-authored.cjs <course> --only filled && ITEM9_PLANS=merged node tools/build.cjs <course> fill 1 9999` must end with **0 errors**. It enforces taught words (the builder's own vocab check), whole-LEGO containment, not-bare, no duplicates, ZUT course-wide, floor.
- Then `node tools/post.cjs validate <course> fill` (the Popty builder validator, :3471 `/v2/validate` with your rows as an override; nothing is written). It must pass. Run it once per course at the end, not in a loop: the shared DB is under load today.
- Then read every row yourself against the canon digest below and the grammar of both languages.

## Canon digest (full text: `course-methodology-canon.md` sections 3 and 4, lines ~572-1018, if you need detail)
- **P1/P2** target side uses only material taught by that point, tiled from whole taught chunks; a word met inside an earlier chunk may be used; no untaught conjugation/inflection/contraction ("we hoped" is not licensed by "to hope").
- **K14/K15** an untaught form is unavailable; fix downward in phrases, never by adding a LEGO.
- **K16** target must be correct, natural language a native would say. **K9** the known side too.
- **Known side is a controlled language too**: never use known-language words/structures the learner has not been given (for eng_for_X courses the known side is the learner's language; keep it natural and simple, and match how the course already glosses each LEGO).
- **ZUT/K2**: one known prompt -> exactly one target. Never reuse a known prompt that already maps to a different target anywhere in the course (build.cjs checks it).
- **P17** every row contains the WHOLE LEGO (both sides as the course glosses it). **P3** a BUILD shows the LEGO plugging into known material, not the bare LEGO plus filler. **P7** USE rows are full sentences, sayable on their own (fragments only as BUILD). **P6** a USE row replays cold, so it must be unambiguous out of context.
- **P28** once a form is taught for a meaning, every phrase with that meaning uses exactly that form.
- Gender/register: follow what the course already does in that basket (e.g. first-person forms, politeness level).
- Vocabulary is known / target / seed, never "source".

## Deliver
Commit `ops/paid-cleanup-item9/<course>/authored/` and `seen/` for your courses (only those paths; never touch other courses' folders or the tools), push your branch, and report in one paragraph: per course, LEGOs filled / rows authored (build, use, updates), re-cuts done, anything you could not fill well and why, and the build + validate result. Your landing line says: authored on your branch, not merged, not applied.
