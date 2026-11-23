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
| **total** | **31** | **3** | **7** | **0** | **609** |

