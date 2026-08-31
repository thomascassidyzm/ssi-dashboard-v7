# The frame layer, persisted

Seven artefacts, each a human read plus a machine-readable companion in the same directory, and a lab that uses them on one seed.

| artefact | what it is | machine companion |
|---|---|---|
| [english-pattern-inventory.md](english-pattern-inventory.md) | 31 canonical English frames mined from the 668-seed known side, ranked by attestation, every attesting seed number listed | `english-pattern-inventory.json` |
| [pair-mapping-classes.md](pair-mapping-classes.md) | every frame against what the target does with it — DETERMINISTIC / SPLIT / INVERSION / ERASURE — spa in full, deu/zho/jpn partial with named gaps | `pair-mapping-classes.json` |
| [spanish-structural-splits.md](spanish-structural-splits.md) | the 12 splits, each with its trigger and its live-pulled attesting minimal pair | `spanish-structural-splits.json` |
| [frame-zut.md](frame-zut.md) | frame-ZUT as a rule a machine can apply, and the pattern-diversity metric that supersedes edges-per-syllable | `../../tools/frame-layer/pattern-diversity.cjs` |
| [dialogue-frame-inventory.md](dialogue-frame-inventory.md) | the POD corpus's frame delta over the seeds — 12 sentence frames (`D*`) and 6 exchange frames (`X*`): greetings, bare polar responses, ellipted orders, deictic handovers, thanks, read-backs. Mined read-only from `canonical_pod_scenarios` plus the sector sources | `dialogue-frame-inventory.json` |
| [could-occupy-eng.md](could-occupy-eng.md) | the seed corpus as the metagraph's **material supply**, indexed by shape position — 2,174 distinct English known texts tagged with the positions they COULD occupy. A could-occupy, never an attestation: a seed has no turn around it, so it cannot attest a shape | `could-occupy-eng.json` |
| [unified-frame-map-2026-08-31.md](unified-frame-map-2026-08-31.md) | the design the dialogue inventory and the instantiability gate were built from: what the map is, how it is mined, and the twelve judgement calls already decided | — |
| [reverse-mapping-classes.md](reverse-mapping-classes.md) | the table read backwards — the eng_for_X curriculum: reverse classes worked on eng_for_spa + eng_for_zho, the new MINT class, the cut-cost statement, reverse frame-ZUT | `reverse-mapping-classes.json` |

## Three rules that decide how everything here is scored

**The unit is the LEGO basket, not the seed** (Tom, 2026-08-29): *"a SEED is invisible to a learner, so they have no idea how much work is being done by a SEED, the unit of learning for the learner is the LEGO, and the unit of practice is the PHRASE."* One LEGO, one basket, one full set of floors; a seed passes only if every basket under it passes. The seed-level composite is context and never decides — averaging baskets is how three healthy ones hide a thin fourth.

**A seed's teaching job is derived, never looked up.** `derive-seed-job.cjs` diffs a seed against every seed before it — new LEGOs, new frames, and new *sides* of splits already present — and returns one of four honest verdicts: **NEW FRAME · NEW SIDE · LEXICAL ONLY · NOTHING STRUCTURAL**. The fourth is an answer, not a failure of the derivation, and so is the third: seeds 599 and 600 both come out LEXICAL ONLY, because both sides of the double-'d were already admitted at seed 152. `split-matchers.cjs` holds only the target-side regexes, keyed by split — the one part that cannot be derived, because it is a fact about Spanish morphology and not about the corpus. An outcome with no reliable matcher is reported as *not machine-checkable*, never scored as absent.

**Pods contribute frame ATTESTATION and ZERO VOCABULARY** (design ruling, 2026-08-31). The pod corpus says which conversational shapes happen; it never says what a learner may produce. Production material comes wholly from cuts, always. So a pod frame enters the generator's pool only when its own fixed material already resolves whole-chunk against what the walk has cut — and a frame that fails is **absent from the pool and absent from the FRAME denominator**, never "scored low", because scoring it would punish a basket for not doing the impossible. `instantiableFrameSet()` in `availability.cjs` is that gate; `instantiability.test.cjs` is its acceptance test, and the case it runs is the design's: *"And you?"* is attested four times in pod-0 and is refused for `spa_for_eng` at every position — the course owns "and" and owns "you", and still cannot say it — and enters the pool the day one cut mints "and you", with no config change. `generate-candidates.cjs` closes the other half by rejecting any candidate whose target will not tile whole-chunk from the vocabulary available to its own basket.

Format choice: **JSON**, because every artefact has nested structure (a pattern has many seeds; a split has many outcomes, each with its own text) that TSV would have to flatten and a builder would have to un-flatten.

## Tools

```
node tools/frame-layer/extract-patterns.cjs spa_for_eng            # re-mine the inventory
node tools/frame-layer/extract-patterns.cjs --compare spa_for_eng deu_for_eng
node tools/frame-layer/build-splits.cjs                            # rebuild the splits, live text
node tools/frame-layer/render-mapping.cjs                          # md from the mapping JSON
node tools/frame-layer/derive-seed-job.cjs spa_for_eng 599          # what does this seed admit?
node tools/frame-layer/pattern-diversity.cjs spa_for_eng 599        # score every LEGO basket
node tools/frame-layer/extract-dialogue-patterns.cjs                 # re-mine the dialogue inventory
node tools/frame-layer/extract-patterns.test.cjs                    # self-test, no DB, no network
node tools/frame-layer/instantiability.test.cjs                     # the gate's self-test, ditto
node tools/frame-layer/could-occupy.cjs [--sample]                  # re-tag the seed corpus by shape position
node tools/frame-layer/could-occupy.test.cjs                        # the tagger's self-test
node tools/frame-layer/derive-and-baskets.test.cjs                  # self-test, no DB, no network
node tools/frame-layer/generate-candidates.cjs spa_for_eng 599 --passes 3
node tools/frame-layer/reverse-zut-scan.cjs eng_for_spa               # reverse-direction fork list
```

Everything here is **read-only against production content**. No tool in this directory writes to `course_seeds`, `course_legos`, `course_practice_phrases` or `course_audio`. The generator writes candidate JSON under `labs/basket-lab/candidates/` and nowhere else, and calls the Claude CLI, never the Anthropic SDK.

**Seeds are immutable.** "Seed replacement" throughout means replacing the LEGOs and phrases *under* a seed, never the seed's own known or target text.
