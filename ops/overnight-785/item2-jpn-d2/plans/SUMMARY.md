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
| p06-s124-133.tsv | 80 | 72 | 17 | 0 | 1860 |
| p07-s134-143.tsv | 29 | 13 | 7 | 0 | 625 |
| p08-s144-153.tsv | 32 | 10 | 5 | 0 | 878 |
| p09-s154-163.tsv | 82 | 32 | 14 | 0 | 1457 |
| p10-s164-173.tsv | 135 | 52 | 7 | 0 | 3740 |
| p11-s174-183.tsv | 14 | 0 | 4 | 0 | 272 |
| p12-s184-193.tsv | 26 | 8 | 1 | 0 | 652 |
| p13-s194-203.tsv | 18 | 0 | 0 | 0 | 421 |
| p14-s204-213.tsv | 40 | 12 | 6 | 0 | 834 |
| p15-s214-223.tsv | 24 | 0 | 5 | 0 | 549 |
| p16-s224-243.tsv | 20 | 3 | 11 | 0 | 418 |
| p17-s244-263.tsv | 15 | 12 | 10 | 0 | 375 |
| p18-s264-300.tsv | 22 | 5 | 5 | 0 | 584 |
| **total** | **791** | **297** | **128** | **0** | **18476** |

## Notes for Kai (seed-level, outside a row pass)

- **Seed 98 needs a rebuild, not row fixes** — its LEGOs gloss 考えた (past) as "consider" and すること as "playing"; prompts here are made consistent with those glosses, but 考える is also this course's "think about" (S0098L02B05, S0158L02B06), so "consider" vs "think about" is not distinguishable from the Japanese. Recommendation: rebuild seed 98 the way seeds 226-230 were rebuilt.
- **Bare LEGO rows are KEPT** where the flag is really about the LEGO's own gloss (S0076L02B01 学んだことに = "how much I've learnt", S0097L04B01, S0098L01B01): fixing them is a LEGO re-gloss with its presentation clip (O2/O13).
- **DELETEs** are USE/BUILD rows whose ENGLISH is garbled, incoherent or unnatural (the b1 precedent); no prompt can fix those. Thin baskets over bad phrases (Kai 19 Nov). Popty's gate re-runs the seed sweep on every delete and refuses one that breaks a BUILD/USE floor.
- **Seed 131 needs a rebuild** — BUILD/USE rows use "ideas / going around / head" before those LEGOs are taught in the seed (P2 forward reference; the vocab gate refuses any edit of them), and the seed's own Japanese (たくさんの考え) says "many thoughts" while the English says "too many ideas". Those rows are KEPT, labelled "seed-131 rebuild".
- **Seeds 129-131 carry many "chain" rows** — English that glues two earlier seed sentences with a comma or "and" ("I'm so happy that you're doing so well, I'm very happy with how much I've learnt already"). No prompt can make those natural; they are DELETEd. If the gate refuses a delete because a BUILD/USE floor would break, that row stays HELD for the rebuild.
- **P28 clash, course-wide: 〜いただけますか** is "could you" in seed 61 and "can you" in seed 150 (LEGO S0150L03). Prompts are kept apart where a whole sentence would collide (S0150L03B05 uses もらえますか). A one-word ruling would settle it: which English does いただけますか carry?
- **Seed 204 LEGO gloss** — 準備を手伝う is glossed "to deal with the arrangements" (手伝う is "help" everywhere else). Bare LEGO rows KEPT; others aligned to the LEGO as glossed. Re-gloss is Kai's call.
- **Seed 248 LEGO gloss** — その映画は全くひどかったので is glossed "I thought the film was complete rubbish"; USE rows now say 思った, bare LEGO rows KEPT (LEGO-level).
- **Coverage**: 1,262 flags in seeds 74-300; 46 rows no longer exist in the copy (deleted since the flags were taken); all 1,216 present rows are in a plan file, as a change, a DELETE, or a "# KEEP" line.
- **For the night writer**: plans were built on QA copy ssi_copy_20261123t033000z (taken 03:30Z 23 Nov). Kai's live pre-check holds: a row whose live known text no longer equals the "was:" text in its comment is HELD, never forced. Rows marked "vocab" risk in the worklist (English with a word the replay says is untaught at that LEGO) will be refused by Popty's gate and stay HELD.
