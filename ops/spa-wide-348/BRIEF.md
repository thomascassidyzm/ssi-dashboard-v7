# spa_for_eng: independent re-check of the 682 CLEAR fixes (shard brief)

READ-ONLY. Edit no course data, render no audio, apply nothing, touch no database.
Scratch files go in $CS_SCRATCH (never bare /tmp).

## Why
Sweep #255 marked 682 practice rows "CLEAR" (apply-ready fixes). Kai wants to apply them in STAGES, by
FAMILY of issue, choosing one direction per family after seeing examples. He suspects some are not real
defects, just "slightly different, so flagged". You are an independent second reader. Do not trust the
original reason; read each row afresh.

## Kai's rulings that decide what is a defect (apply these strictly)
- The LEGOs decide. A row is wrong only if (a) the Spanish is wrong Spanish (ungrammatical / not what a
  native would say), or (b) the English and Spanish say different things in a way that MISLEADS the
  learner given what the LEGOs teach, or (c) the English is not English a native speaker would say.
- Two different Englishes for one Spanish is NOT a defect. English synonyms are soft.
- Rare-but-natural is NOT a defect. "Unlikely to come up" is not a defect; stilted/unnatural is.
- Clashes between component tiles are never a concern; a phrase clashing with another phrase is not a blocker.
- Dialect/register choices allowed by the LEGO are not defects.
- A fix must stay within forms the learner has been taught by that point (taught-legos.tsv: LEGOs with
  seed number <= the row's seed), and must keep the row's own LEGO in it. Never delete a LEGO;
  deleting a practice phrase is allowed.
- Canon: course-methodology-canon.md at the repo root of your checkout. grep it for the rule codes cited
  (e.g. `grep -n "K16" course-methodology-canon.md`); do not read the whole file.

## Input (on branch cs/348-spa255-families of this repo; `git fetch origin` then `git show origin/cs/348-spa255-families:<path>`)
- ops/spa-wide-348/input/shard-<X>.jsonl: one object per row: id, type (sweep's label), before/after
  [English, Spanish] (after Spanish "DELETE" = delete the phrase), the sweep's reason and rule, knock_on
  links, LIVE text re-read today from Popty (`live`, `drifted` — no row has drifted), its LEGO, seed, the
  seed's LEGOs, and the whole basket for that LEGO (id | English | Spanish).
- ops/spa-wide-348/input/taught-legos.tsv: every LEGO in the course (seed, lego_id, is_new, known, target).
  grep it to check whether a form is taught before the row's seed.

## Task: read EVERY row in your shard in full (no sampling, no regex verdicts)
For each row decide:
1. verdict: REAL | NOT-A-DEFECT | UNSURE, with a one-line plain-English reason.
2. family (REAL rows only), one code from below; if none fits, invent a short NEW-xxx code and describe it in your report.
   - ES-BACKSHIFT: past frame ("sabía que", "dije que", "estaba seguro de que") followed by a present / wrong-tense verb
   - ES-SUBJ-FUTURE: cuando / antes de que / hasta que / en cuanto etc. with an indicative about the future
   - ES-MOOD-OTHER: any other indicative/subjunctive error (negated "conozco a gente que...", "quiero que" + indicative, etc.)
   - ES-AGREEMENT: gender/number agreement, including neuter lo/eso/esto vs ese/esa
   - ES-MISSING-WORD: missing que / personal a / lo / de / article / reflexive
   - ES-CALQUE: calqued or wrong preposition/collocation/idiom ("decir de", "interesante para", "en el otro lado")
   - ES-OTHER: other Spanish grammar or naturalness errors
   - MEANING: English and Spanish say different things in a way that misleads (dropped/added word, tense, person)
   - REGISTER: tú/usted or vosotros/ustedes mixing inside a row
   - EN-POLISH: Spanish fine and matching; the English is not natural English
   - NONSENSE: generator padding — row means nothing / contradicts itself on both sides
   - LEGO-LEVEL: the defect really sits in the LEGO or seed, not the row
3. fix_verdict, judging the PROPOSED "after": GOOD | NOT-BETTER | WORSE | UNTAUGHT (uses a form not taught
   by then) | DROPS-LEGO (row no longer contains its LEGO) | DELETE-OK | DELETE-UNNEEDED, plus a one-line
   fix_note when not GOOD; if you see a clearly better fix, give it in better_fix ["English","Spanish"].

## Output
Write ops/spa-wide-348/out/<X>.jsonl in YOUR worktree, one line per input row, same order:
{"id","verdict","family","reason","fix_verdict","fix_note","better_fix"}  (null where not applicable).
Check the line count equals the input. Commit it and `git push -u origin HEAD` on your own branch.
Report back (short): counts by verdict and family, any NEW-xxx families with a one-sentence description,
3 strongest NOT-A-DEFECT examples, any rows where the fix is WORSE/UNTAUGHT, and your branch name.
Do not publish anything; the parent publishes. End with your landing line.
