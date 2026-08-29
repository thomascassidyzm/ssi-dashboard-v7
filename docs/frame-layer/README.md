# The frame layer, persisted

Four artefacts, each a human read plus a machine-readable companion in the same directory, and a lab that uses them on one seed.

| artefact | what it is | machine companion |
|---|---|---|
| [english-pattern-inventory.md](english-pattern-inventory.md) | 31 canonical English frames mined from the 668-seed known side, ranked by attestation, every attesting seed number listed | `english-pattern-inventory.json` |
| [pair-mapping-classes.md](pair-mapping-classes.md) | every frame against what the target does with it — DETERMINISTIC / SPLIT / INVERSION / ERASURE — spa in full, deu/zho/jpn partial with named gaps | `pair-mapping-classes.json` |
| [spanish-structural-splits.md](spanish-structural-splits.md) | the 12 splits, each with its trigger and its live-pulled attesting minimal pair | `spanish-structural-splits.json` |
| [frame-zut.md](frame-zut.md) | frame-ZUT as a rule a machine can apply, and the pattern-diversity metric that supersedes edges-per-syllable | `../../tools/frame-layer/pattern-diversity.cjs` |

Format choice: **JSON**, because every artefact has nested structure (a pattern has many seeds; a split has many outcomes, each with its own text) that TSV would have to flatten and a builder would have to un-flatten.

## Tools

```
node tools/frame-layer/extract-patterns.cjs spa_for_eng            # re-mine the inventory
node tools/frame-layer/extract-patterns.cjs --compare spa_for_eng deu_for_eng
node tools/frame-layer/build-splits.cjs                            # rebuild the splits, live text
node tools/frame-layer/render-mapping.cjs                          # md from the mapping JSON
node tools/frame-layer/pattern-diversity.cjs spa_for_eng 600       # score a live phrase basket
node tools/frame-layer/extract-patterns.test.cjs                   # self-test, no DB, no network
node tools/frame-layer/generate-candidates.cjs spa_for_eng 600 --passes 3
```

Everything here is **read-only against production content**. No tool in this directory writes to `course_seeds`, `course_legos`, `course_practice_phrases` or `course_audio`. The generator writes candidate JSON under `labs/seed-lab/candidates/` and nowhere else, and calls the Claude CLI, never the Anthropic SDK.

**Seeds are immutable.** "Seed replacement" throughout means replacing the LEGOs and phrases *under* a seed, never the seed's own known or target text.
