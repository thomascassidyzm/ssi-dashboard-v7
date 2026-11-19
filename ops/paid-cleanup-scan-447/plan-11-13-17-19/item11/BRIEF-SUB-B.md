# Sub-shard brief — item 11 shard B (basket does not drill its own LEGO). PLAN ONLY, APPLY NOTHING.

Your own message names your courses and your part letter. Read `../BRIEF-CHILD.md` IN FULL first (purpose, price, canon
digest, Kai's standing rulings, item-11 guidance, what to hand back) and the hard rules in the repo's CLAUDE.md. This
file only adds what the shard lead already learned by running the pipeline once. No database write, no render, no
tests, no builds. Family = `item11`. P = `ops/paid-cleanup-scan-447/plan-11-13-17-19`.

## Set-up (your checkout is off origin/main)
```
git fetch origin cs/806-plan-item-11-shard-b-arabic-asia && git merge --no-edit origin/cs/806-plan-item-11-shard-b-arabic-asia
cd ops/paid-cleanup-scan-447/plan-11-13-17-19 ; mkdir -p $CS_SCRATCH/snap
(set -a; . ~/ssi-restore/qa-copy-fresh.env; set +a; node ../../../tools/paid-cleanup-717/snapshot.cjs <course> $CS_SCRATCH/snap/<course>.json)   # ~1 s each
python3 -I tools/mkdump.py <course>                       # snapshot + today's live seeds -> $CS_SCRATCH/dumps/<course>.json
python3 -I item11/tools/review.py <course> [seed ...]     # THE READING VIEW: per scan-named LEGO its seed, the seed's LEGOs, the whole basket
```
Every seed the scan names for your courses was ALREADY re-read live (18 Nov ~18:45Z) and is committed in
`data/live/<course>.json`; you only run `tools/live_seeds.py` for any EXTRA seed you decide to change (then re-run
mkdump). In review.py's basket lines `*` = a row the scan named, `T` = the target contains the LEGO, `K` = the known
side contains the LEGO's gloss; `--` rows are the candidates. Read the whole basket, not just the starred rows.
Helpers (no network): `python3 -I item11/tools/q.py find <course> <text> [--known]` (LEGOs containing a text, course
order: use it for duplicate and one-prompt-two-answers checks before any re-cut), `q.py rows …` (phrase rows), and
`q.py vocab <course> <seed> <lego_idx> "<target phrase>" …` (P1: words not taught, in that exact form, by that point).

## The pipeline, per course (serial; never a loop on a failure)
1. `item11/decisions/<course>.py` — copy the header and `D()` helper from `item11/decisions/ara_for_eng.py`. Verdict
   names: `recut-small`, `rebuild-rows`, `keep` (not a defect, OR already fixed live: start `why` with `NOT-A-DEFECT:` or
   `ALREADY-FIXED:`), `kai` (a hold: start `why` with `HOLD:`). `keep` and `kai` skip the basket logic; every other
   verdict name runs it. EVERY scan-named LEGO of the course gets a decision, so the counts add up.
2. Courses whose rows carry a romanisation (ara*, zho_for_eng, jpn_for_eng, kor_for_eng — NOT eng_for_*, NOT kor_for_tam):
   `python3 -I item11/tools/mkroman.py <course>` after the decisions .py and before plan.py. It reads each new target
   text from the course's own word readings; give any `??` word by hand (ROMAN dict in the .py, dumped as "roman").
   Without it the dry run answers 409 ROMAN_STALE.
3. `python3 -I tools/plan.py item11 <course> $CS_SCRATCH/dumps/<course>.json` → fix every problem it prints.
4. `python3 -I tools/validate.py item11 <course> $CS_SCRATCH/dumps/<course>.json` → a seed with NEW issues is fixed or held.
5. `python3 -I tools/dryrun.py item11 <course> --chunk 50` (never `"apply"`), then `python3 -I tools/price.py item11 <course>`.
6. Commit `item11/decisions/<course>.*`, `item11/plans/<course>.json`, `data/live/<course>.json` and push. THEN the next course.

## What the first run taught
- The builder validator wants **3+ BUILD rows that are the LEGO inside a phrase; a bare-LEGO row does not count**, and
  5+ USE rows. When you delete or reword builds, count again. `P18`: never turn a use row into a build.
- A re-cut that leaves a seed word uncovered needs a LEGO for it: `q.py find` first — if the exact pair was taught
  earlier, a `lego.insert` with `is_new:false` and no basket (in `extra`, appended at the END of the seed, next free
  `lego_index`; row = seed_number, lego_index, known_text, target_text, type A|M (M needs components), is_new). If it
  was not taught, the new LEGO needs its own 3 build + 5 use rows — compare that cost honestly against `rebuild-rows`
  and take the cheaper sound fix. Say "structural" in `why`.
- A shrunk LEGO must not equal an earlier NEW LEGO (plan.py prints it) and its gloss must not already map to another
  target (`q.py find … --known`). In eng_for_* courses ENGLISH is the target: the same check runs on the other side.
- The same Arabic word with a different final vowel/case ending, or an indicative vs subjunctive verb, is NOT "the
  taught form" (K8): a row with تُفَكِّرُ does not contain أَنْ تُفَكِّرَ. Same strictness for particles in jpn/kor/tam.
- Target-side containment is literal; known-side is by words (inflection allowed, K6). plan.py marks a row UNDECIDED
  when it cannot tell — decide it explicitly in `b={…}`.
- Write for Kai: each `why` says in plain English what the learner hears now, what changes, and the rule in words.

## Learned on the three Arabic courses (19 Nov) — read before the next course
- **The courses move under you.** Another cleanup job deleted 5 scan rows in ara_lb/ara_eg between the live read and
  the dry run (the dry run answers 404 "no row"). Before a course's dry run, or on any 404, re-read its seeds with
  `python3 -I tools/live_seeds.py <course> <seeds…> --force`, re-run mkdump.py, and re-judge: a LEGO whose bad rows are
  gone is `keep` + `ALREADY-FIXED:` (count it; say if the basket is now thin).
- **tools/validate.py over-reports NEW issues** (its baseline is worded differently). After it, run
  `python3 -I item11/tools/vdiff.py <course>`: it validates the same seeds unchanged through the same door and prints
  only what the plan really adds. Fix until it prints no ADDED line, or say in `why` why one stays.
- **`python3 -I item11/tools/p1.py <course>`** after the decisions .py: every new target text, word by word, against
  what is taught by that LEGO; "never in an earlier row" words must be replaced.
- `python3 -I item11/tools/review.py <course> --compact` prints only starred rows and rows missing the LEGO.
- Typical leftovers once broken rows are fixed: fewer than 3 builds with the LEGO inside a phrase, fewer than 5 uses
  (the bare LEGO or the seed-as-LEGO row does not count), a bare-LEGO row repeated. Add one row from taught words.
- A stale copy of the SEED sentence in a basket (seed text was changed, the copy was not) takes the seed's live words.
- sir/madam LEGOs: the builder wants the honorific contiguous with the core at the END of the row (K32: add it back at
  the end of every row, both sides).
- LEGOs also on the item-19 list (`data/scan-LONG.json`, same lego id) are `kai` + "HOLD: also over 8 syllables, the
  item-19 plan re-cuts it and re-homes the rows", with notes for that cut. A LEGO that exactly duplicates an earlier one
  (plan.py says so) is a hold for the duplicate-LEGO plan.
- Dry runs are slow when Popty is busy (ara_for_eng: 123 ops took 10 minutes). Run them with a long timeout, once;
  one retry on a dropped connection.
- Sub-dispatches from this job do not start (accepted, checkout made, no worker; twice). Do the courses yourself.

## Hand back
`item11/SUMMARY-B-<your part>.md` in the shape BRIEF-CHILD asks for (table per course: scan rows, dropped as already
fixed, not-a-defect, proposals, holds, est. chars; FIX PATTERNS with 2–3 real examples each; HOLDS; LEGOs kept at 7+
syllables; gaps). The shard lead folds the parts into SUMMARY-B.md. Milestones: declare steps_total = your number of
courses on /api/job-progress and post each as it lands. If you cannot finish every course, finish WHOLE courses in the
order given and list the unplanned ones as an explicit gap. Report: ONE paragraph + the landing line (your branch,
pushed, not merged).
