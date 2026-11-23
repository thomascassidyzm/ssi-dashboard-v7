# Child C — item 2 PLANNER: eng_for_jpn known prompts D2, seeds 74-300 (#785·AK). NO live writes.

Continue #726·AI/#699·AI (paid-cleanup item 3, D2: eng_for_jpn full known-side read). The committed kit is
`ops/paid-cleanup-item3/` — read `run.cjs` header, `d2/classify.py`, `d2/flags.jsonl` (the model-read flags), and the
already-applied plan files in `ops/paid-cleanup-item3/eng_for_jpn/` (b1…b6, s226-230, s227) for the exact TSV shape and the
judgement style that landed. Memory of what #726 did: 424 rows live seeds 1-73 & J2→300; D2 seeds 74-300 not done (budget);
~127 gate refusals left as precedent.

## Task
- For every flagged row in seeds 74-300 (~1,262 per #779·AK; count it yourself from flags.jsonl and say the real number), read
  the row against the QA copy (the copy is the planning source; `set -a; . ~/ssi-restore/qa-copy.env; set +a` then a
  committed read tool — or Popty routes ONLY 22:00-07:00 UK) and decide: new known text, DELETE, or KEEP (false flag). This is
  model-read judgement: the known side is English the learner hears as the prompt; it must say exactly what the Japanese
  target says (ZUT, K1/K9 controlled known language), never introduce untaught English, never collide with another prompt
  that maps to a different target anywhere in the course.
- Write plan TSVs into `ops/overnight-785/item2-jpn-d2/plans/` in batches of ~10 seeds, earliest first
  (`p01-s074-083.tsv`, …), each with `#` comment lines giving the reason per row. After each file, append its name to
  `ops/overnight-785/item2-jpn-d2/plans/READY.txt`, commit, and land on main — the night writer (Child A, a sibling) applies
  them from 22:00 UK in that order. Also keep `item2-jpn-d2/plans/SUMMARY.md` (rows: changed / deleted / kept / unsure) and
  a rough char estimate (sum of new known text lengths for changed rows).
- Hard stop for planning: 21:30Z. Whatever is in READY.txt by then is what gets applied; say what was not reached.
- You make NO Popty writes, NO renders, NO edit-batch calls, and no live reads before 22:00 UK. You are not a DB writer.
