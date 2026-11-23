# item 2 — eng_for_jpn known prompts D2, seeds 74-300 (cs #790, child C of #785·AK)

Planning source: nightly QA copy ssi_copy_20261123t033000z (read-only snapshot via tools/paid-cleanup-717/snapshot.cjs).
Flags: ops/paid-cleanup-item3/d2/flags.jsonl — 1,262 flagged rows in seeds 74-300 (50 of them no longer exist in the copy).
Known side here is JAPANESE (eng_for_jpn = English for Japanese speakers): the prompt is rewritten to say exactly what the English answer says.
Chars = sum of new Japanese prompt lengths for changed rows (Cartesia render estimate for the known clips; library-first may make it lower).
Pre-checked locally on every file: phrase exists, whole-course ZUT (normalised known → one target, all earlier plan files folded in), no Latin in a prompt.
Rows whose English target uses a word the copy's vocab replay says is untaught are planned anyway; Popty's gate decides and refuses them (HELD, never forced).

| file | changed | deleted | kept (false flag / LEGO-level) | unsure | chars |
|---|---|---|---|---|---|
| p01-s074-083.tsv | 31 | 3 | 7 | 0 | 609 |
| p02-s084-093.tsv | 41 | 8 | 9 | 0 | 911 |
| p03-s094-103.tsv | 63 | 26 | 10 | 0 | 1181 |
| p04-s104-113.tsv | 86 | 32 | 6 | 0 | 2101 |
| p05-s114-123.tsv | 33 | 9 | 4 | 0 | 1009 |
| **total** | **254** | **78** | **36** | **0** | **5811** |

## Notes for Kai (seed-level, outside a row pass)

- **Seed 98 needs a rebuild, not row fixes** — its LEGOs gloss 考えた (past) as "consider" and すること as "playing"; prompts here are made consistent with those glosses, but 考える is also this course's "think about" (S0098L02B05, S0158L02B06), so "consider" vs "think about" is not distinguishable from the Japanese. Recommendation: rebuild seed 98 the way seeds 226-230 were rebuilt.
- **Bare LEGO rows are KEPT** where the flag is really about the LEGO's own gloss (S0076L02B01 学んだことに = "how much I've learnt", S0097L04B01, S0098L01B01): fixing them is a LEGO re-gloss with its presentation clip (O2/O13).
- **DELETEs** are USE/BUILD rows whose ENGLISH is garbled, incoherent or unnatural (the b1 precedent); no prompt can fix those. Thin baskets over bad phrases (Kai 19 Nov). Popty's gate re-runs the seed sweep on every delete and refuses one that breaks a BUILD/USE floor.
