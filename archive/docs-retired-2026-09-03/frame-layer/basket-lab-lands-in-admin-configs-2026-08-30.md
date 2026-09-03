# The Basket Lab is home — a card in admin > configs, and it is on main

2026-08-30.

## The one-sentence answer to "this replaces SEED LAB doesn't it?"

**Yes — Basket Lab *is* Seed Lab, renamed and continued: every Seed Lab commit is
already inside the Basket Lab branch, no capability was dropped in the rename, and
Seed Lab was never in admin > configs either, so nothing you can currently see goes
away.**

The evidence, verified rather than assumed:

- `git merge-base --is-ancestor origin/lab/seed-lab lab/basket-lab` → yes.
  `git cherry lab/basket-lab origin/lab/seed-lab` → empty. Every Seed Lab commit is
  in Basket Lab.
- Diffing `labs/seed-lab/server.cjs` against `labs/basket-lab/server.cjs`: **366 lines
  added, 33 removed, and every one of those 33 is a rename or a refactor of something
  still present** — the header, the `loadSeed` wrapper folded into `analyse()`, the old
  `criteriaTable` replaced by one that also reports splits. Nothing was cut.
- Basket Lab adds, on top of Seed Lab: the language × seed grid, taste-versus-instrument
  columns, on-demand generation with a job queue, per-course tallies, and the split
  matchers no longer lent to pairs they are not facts about.
- The rename is your own call, recorded in the file: *"it's more of a BASKET_LAB"* —
  the seed is how you navigate to a basket; the basket is what you judge.

**Recommendation: retire the `lab/seed-lab` branch.** Nothing has been deleted in this
job — not the branch, not the directory, not the process on 8461. Retirement is your
word to say.

## Two things Watson told you that turned out to be false

1. **It was never uncommitted work sitting on one machine.** `lab/basket-lab` was
   committed and pushed to `origin` before this job started, working tree clean. The
   only real risk was that it was *unmerged and unreachable*.
2. **It was never in `zenjin-2026-v1`.** The Basket Lab lives in the SSi dashboard
   (Popty) repo. A worker looking for a basket branch in zenjin correctly found none
   and drew the wrong conclusion from it.

## What landed

**On `main`, pushed:** 23 commits — the lab, its frame-layer tooling, and the new home.

- **`/admin/configs/basket`** — a Basket Lab card in the row beside Listening, Speaking,
  Pod, Voice and VAD, and a route and view under it.
- **The lab now mounts into the production API** at `/api/basket-lab`. It is the *same
  code* that serves port 8461 — `server.cjs` grew a base-path prefix and a `mount()`
  export. There is one lab with two roots, not a Vue re-implementation of the scoring
  surface that would drift from the instrument you have been judging against.
- Mounted **before** the JSON body parser, because the lab reads its own POST bodies off
  the request stream.

### The one thing the hosted copy will not do: generate

A generation pass shells out to the Claude CLI, is real money and can run fifteen
minutes. On a page reachable through a tunnel from a phone, a button that quietly bills
a click is not a feature. So the mounted copy is **read and judge only**: it shows the
live basket beside whatever candidates are on disk, takes verdicts, and prints the exact
command instead of offering a button. The standalone process on 8461 keeps its generate
buttons, unchanged. **Overrule this in one sentence if you want the button hosted.**

### And a verdict can no longer be lost silently

If the verdict file cannot be written, the lab now shows you the failure *and your text,
to copy*, instead of redirecting to an empty list. A verdict you typed and lost is the
worst failure this lab has.

## What was verified, and how

Not with a test suite — this is admin-and-lab code and a suite would have tested code
nobody touched. It was verified by running it:

- A real production API booted on a throwaway port: `/api/basket-lab/lab?course=spa_for_eng&seed=599`
  returned **200 with four baskets rendered**, every link and form correctly prefixed;
  the grid returned 200; a verdict POST wrote through the mount and redirected; the
  generate endpoint returned **403**, as designed. The probe verdict was removed afterwards.
- The standalone lab, restarted on a spare port, still serves at `/lab` with its
  generate buttons and unprefixed links.
- `node --check` on every `.cjs` touched; a clean `vite build` producing `BasketLab-*.js`.
- Your lab on port 8461 was left running and untouched throughout.

## The one step left, and it needs no decision from you

**The production API on this box has to be restarted before the card works.** It is
running a process started before this landed, so `/api/basket-lab` 404s on it today —
the same standing gap as every other new endpoint. Until then the view says so plainly,
in those words, and names the standalone lab as the fallback rather than showing a blank
frame. This is the known "popty deploys but the API does not" restart; I did not do it
unilaterally with several other jobs live on this box.

## Two honest gaps

- **The "shared by both labs" store ruling: I could not find its text.** Not in the
  dashboard docs, not in the zenjin docs, not anywhere an estate-wide search reaches.
  I have not guessed at which store it names. Landing this branch does close the thing
  that made it aspirational — the Basket Lab code is now on `main` — but I cannot claim
  it satisfies a ruling I have not read.
- **Verdicts are stored on whichever machine runs the API**, in
  `labs/basket-lab/verdicts.ndjson`. Judge from two machines and you get two files. Say
  the word and they can go somewhere shared.

## Blast radius, checked before merging

Nothing in `tools/frame-layer/` is required by any service, API route or app code — only
by the lab and by its own tests. The commit that stopped lending the Spanish split
matchers to every course is a change to lab tooling, not to a content pipeline. The lab
is read-only against production content and writes nothing to Supabase. No migrations.
