# ops/bre-rebuild-374 — APPLY bre_for_fra rebuild seeds 1-300 (cs #374·AL; plan #345·AL in ../bre-rebuild-345)

Tool: tools/course-optimization/bre-rebuild-374.cjs (header says what and why). Night runner: night-apply.sh.

| file | what | regenerates? |
|---|---|---|
| `holds.json` | seeds held on Kai's unruled "à elle" / possessor call | NO: judgement |
| `author/*.txt` | LEGOs + baskets for seeds 31-300 (pilot line format) | NO: authored |
| `baseline-1-300.json` | the nightly-copy rows the changesets expect (copy of 25 Nov 03:30Z) | from the copy dump, `baseline` mode |
| `check.json` | checker result: held (incl. cascade), dropped phrases, below-floor baskets | `check` mode |
| `cs/S####.changeset.jsonl` | one changeset per seed, one transaction (≤100 ops) | `cs <from-to>` mode |
| `cs/*.applied.jsonl` | applier ledgers, with each batch's undo file | NO: the record of what landed |
| `drift.jsonl`, `verify-*.json`, `night-*.log` | night pre-check drift, readbacks | by the runner |
