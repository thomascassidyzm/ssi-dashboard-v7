# The frame layer, persisted

Four artefacts, each a human read plus a machine-readable companion in the same directory, and a lab that uses them on one seed.

| artefact | what it is | machine companion |
|---|---|---|
| [english-pattern-inventory.md](english-pattern-inventory.md) | 31 canonical English frames mined from the 668-seed known side, ranked by attestation, every attesting seed number listed | `english-pattern-inventory.json` |
| [pair-mapping-classes.md](pair-mapping-classes.md) | every frame against what the target does with it — DETERMINISTIC / SPLIT / INVERSION / ERASURE — spa in full, deu/zho/jpn partial with named gaps | `pair-mapping-classes.json` |
| [spanish-structural-splits.md](spanish-structural-splits.md) | the 12 splits, each with its trigger and its live-pulled attesting minimal pair | `spanish-structural-splits.json` |
| [frame-zut.md](frame-zut.md) | frame-ZUT as a rule a machine can apply, and the pattern-diversity metric that supersedes edges-per-syllable | `../../tools/frame-layer/pattern-diversity.cjs` |
| [reverse-mapping-classes.md](reverse-mapping-classes.md) | the table read backwards — the eng_for_X curriculum: reverse classes worked on eng_for_spa + eng_for_zho, the new MINT class, the cut-cost statement, reverse frame-ZUT | `reverse-mapping-classes.json` |
| [unified-frame-map-2026-08-31.md](unified-frame-map-2026-08-31.md) | DESIGN (not yet built): one frame map over seeds + pods — dialogue-frame inventory (D/X namespaces), the owned-material instantiability gate, and the plug-in points | — (design; companion JSON arrives with the build) |

## Two rules that decide how everything here is scored

**The unit is the LEGO basket, not the seed** (Tom, 2026-08-29): *"a SEED is invisible to a learner, so they have no idea how much work is being done by a SEED, the unit of learning for the learner is the LEGO, and the unit of practice is the PHRASE."* One LEGO, one basket, one full set of floors; a seed passes only if every basket under it passes. The seed-level composite is context and never decides — averaging baskets is how three healthy ones hide a thin fourth.

**A seed's teaching job is derived, never looked up.** `derive-seed-job.cjs` diffs a seed against every seed before it — new LEGOs, new frames, and new *sides* of splits already present — and returns one of four honest verdicts: **NEW FRAME · NEW SIDE · LEXICAL ONLY · NOTHING STRUCTURAL**. The fourth is an answer, not a failure of the derivation, and so is the third: seeds 599 and 600 both come out LEXICAL ONLY, because both sides of the double-'d were already admitted at seed 152. `split-matchers.cjs` holds only the target-side regexes, keyed by split — the one part that cannot be derived, because it is a fact about Spanish morphology and not about the corpus. An outcome with no reliable matcher is reported as *not machine-checkable*, never scored as absent.

Format choice: **JSON**, because every artefact has nested structure (a pattern has many seeds; a split has many outcomes, each with its own text) that TSV would have to flatten and a builder would have to un-flatten.

## Tools

```
node tools/frame-layer/extract-patterns.cjs spa_for_eng            # re-mine the inventory
node tools/frame-layer/extract-patterns.cjs --compare spa_for_eng deu_for_eng
node tools/frame-layer/build-splits.cjs                            # rebuild the splits, live text
node tools/frame-layer/render-mapping.cjs                          # md from the mapping JSON
node tools/frame-layer/derive-seed-job.cjs spa_for_eng 599          # what does this seed admit?
node tools/frame-layer/pattern-diversity.cjs spa_for_eng 599        # score every LEGO basket
node tools/frame-layer/extract-patterns.test.cjs                    # self-test, no DB, no network
node tools/frame-layer/derive-and-baskets.test.cjs                  # self-test, no DB, no network
node tools/frame-layer/generate-candidates.cjs spa_for_eng 599 --passes 3
node tools/frame-layer/reverse-zut-scan.cjs eng_for_spa               # reverse-direction fork list
```

Everything here is **read-only against production content**. No tool in this directory writes to `course_seeds`, `course_legos`, `course_practice_phrases` or `course_audio`. The generator writes candidate JSON under `labs/basket-lab/candidates/` and nowhere else, and calls the Claude CLI, never the Anthropic SDK.

**Seeds are immutable.** "Seed replacement" throughout means replacing the LEGOs and phrases *under* a seed, never the seed's own known or target text.
