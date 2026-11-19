# Item 11, shard A — worker brief (parent: cs #805). PLAN ONLY, APPLY NOTHING.

Read `../BRIEF-CHILD.md` IN FULL first: it is the whole brief (purpose, price, data, pipeline, canon digest, Kai's
rulings, hand-back). This file adds only what the shard lead settled on deu_for_eng, so every course in the shard is
planned the same way. Worked example to copy the shape of: `decisions/deu_for_eng.py` (39 LEGOs, all patterns).

## Set-up
```
git fetch origin cs/805-plan-item-11-shard-a-romance-ger && git merge --no-edit origin/cs/805-plan-item-11-shard-a-romance-ger
cd ops/paid-cleanup-scan-447/plan-11-13-17-19
mkdir -p $CS_SCRATCH/snap
(set -a; . ~/ssi-restore/qa-copy-fresh.env; set +a; node ../../../tools/paid-cleanup-717/snapshot.cjs <course> $CS_SCRATCH/snap/<course>.json)
python3 -I tools/live_seeds.py <course> <every seed number named by your scan rows>     # serial, one course at a time
python3 -I tools/mkdump.py <course>
```
Scan rows: `data/scan-P17.json` filtered to your course. A `row` may name a LEGO (S0123L02), one phrase (S0123L02U06) or
several: group them by LEGO and judge the WHOLE basket of each LEGO, not only the named rows.

## Helpers (item11/shard-a-tools, read-only, no network)
- `python3 -I item11/shard-a-tools/view.py <course> S0123L02 S0200L01 …` — seed, all its LEGOs, the basket, and per row a
  mark: `T` = target lacks the LEGO, `k` = only the English lacks the LEGO's gloss. (`--full` shows every basket.)
- `python3 -I item11/shard-a-tools/rc.py <course> "S0123L02|new known|new target" …` — tests a re-cut: is it a span of
  the seed, same-known LEGOs elsewhere (`<<< ZUT?` = a clash), same-target LEGOs (duplicate), where each remaining seed
  word was first taught, and which rows would still miss.
- `python3 -I item11/shard-a-tools/vc.py l <course> k="…" t="…" [x=1 exact]` LEGO lookup; `… p <course> t="…" upto=N`
  phrase lookup; `… w <course> 0 word word` where a word is first taught.
- `item11/decisions/common.py` — `Course`, `D(...)`, `C.notnew(seed, known, target)`, `C.write()` (prints any rewritten or
  added row whose target uses a word not taught by that seed: fix every one).
- `item11/shard-a-tools/run.sh <course>` — decisions → plan.py → validate.py → control.py → dryrun.py → price.py.
  The dry run is slow (minutes per 50 ops): run it in the foreground once per course, never in parallel with another.

## What the builder validator actually enforces (learned on deu — design rows to pass first time)
- Containment is CONTIGUOUS: the row's target must contain the LEGO's target as one unbroken run (punctuation ignored).
  Write every rebuilt row that way. (K49 split rows are canon-legal, but the builder and plan.py both flag them.)
- A NEW LEGO needs BUILD ≥ 3 and USE ≥ 5, and a build row that is the bare LEGO alone does NOT count. Many live baskets
  have only 2 countable builds: add one with `add=[('b', known, target)]`.
- No two rows in a basket with the same target. If cleaning a basket surfaces a duplicate pair, delete one.
- Vocabulary is word-level: every word of a row's target, in that exact spelling, must appear in some LEGO or M-LEGO
  component target at or before the seed. `C.write()` checks this locally.
- `validate.py` compares with the LIVE baseline and over-reports. `item11/control.py` re-runs the flagged seeds with no
  change and stores what the plan really adds: `issues added by the plan in seeds []` is the pass condition.
- plan.py "problems" must reach 0, except rows you answer by hand in `why` (formal sir/madam rows, below).

## The decision rules (apply in this order, per LEGO)
1. **not-a-defect** (verdict `keep`): the LEGO is there but split or reordered (K49), a bound spelling (L28: dirlo for
   dire), the English only inflects the gloss (K6: don't/do not, he'd/he would, learn/learning, need/needed), or a
   stand-in "it" frame. Record it with the reason; change nothing.
2. **recut-small** (Kai's shortest cut): the piece the rows drill is a contiguous piece of the seed on BOTH sides and
   `rc.py` shows no clash (no other NEW LEGO with the same English and a different target) and no duplicate. The LEGO
   shrinks to it, nearly all rows stay. The words the old LEGO covered and the new one does not must be taught earlier
   (rc.py "remainder"); where one of them is an EXACT earlier NEW pair whose English fits the seed, append it as a
   not-new LEGO with `extra=[C.notnew(...)]` (Kai 12 Nov: every seed part is a LEGO) and say "Structural" in `why`.
3. **A would-be clash stays inside the bigger LEGO** (Kai 12 Nov, no labels): if the small piece clashes (German
   'while | solange' vs 'while | während'), keep the LEGO and `rebuild-rows`. If the small piece is an exact pair of an
   earlier NEW LEGO and the seed sentence has another played home, the LEGO may become not-new (`is_new=False`, rows
   deleted, 0 audio) — deu S0605L01 is the example.
4. **rebuild-rows**: every row that misses is rewritten to contain the whole LEGO, keeping as many of its own words as
   possible (cheapest audio, same teaching load), or deleted when the basket still has ≥3 build + ≥6 use good rows.
   Never demote use to build (P18). Prefer full sentences for use rows (P7).
5. **regloss-rebuild / grow-rebuild**: when the LEGO's English is not the seed's word (deu 'this funny story' under a
   seed that says 'that funny story') or its target has a word its English lacks, fix the LEGO to the seed's own words
   in the same decision (L26) and rebuild the rows.
6. A LEGO over 8 syllables is cut in the same decision (`closes=['19']`); list every LEGO you KEEP at 7+ syllables.
7. **Formal LEGOs (sir/madam; K32, HARD):** the LEGO keeps its honorific; in its rows the LEGO counts as CUT (LEGO
   minus the trailing honorific) and sir/madam is ALWAYS added back at the END of the row on both sides. plan.py and the
   builder will report those rows as "does not contain the LEGO": that is expected; say so in `why`.
8. **hold** (verdict `kai`, `why` starting "HOLD — KAI:"): only when nothing above works. Never edit a seed sentence.

Every `why` is plain English for Kai: what the rows drill, what changes, the rule in words (not only its code), the
precedent, and "Structural" if a LEGO is inserted. No job numbers.

## Hand back, per course (commit + push after EACH course; the watcher stops a worker with no commit in 20 minutes)
- `item11/decisions/<course>.py` + `.json`, `item11/plans/<course>.json` (with validator, control, dryRun),
  `data/live/<course>.json`.
- `item11/notes/<course>.md`: one table row (scan rows · LEGOs judged · dropped as already fixed · not-a-defect ·
  recut-small · rebuild-rows · other · holds · rows rewritten / deleted / added · est. chars from price.py), then 3–5
  real examples (seed sentence, LEGO before → after with not-new flags, what happens to the rows, why), the holds, the
  LEGOs kept at 7+ syllables, and gaps (seeds not re-read, dry run timed out, rows you could not judge). Plain English.
- Commit ONLY under `item11/` and `data/live/<your course>.json`, on YOUR branch, pushed. Do not merge anywhere.
- Report: one paragraph + landing line.
