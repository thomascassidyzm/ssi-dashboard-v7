# Paid-cleanup limbo finish (cs #868, for Kai, 23-25 Nov 2026)

Kai's five approved-but-stranded families from audit #854·AK (d/1f59d251, rows L1-L5), in his order. All planning reads the
NIGHTLY COPY (`ops/paid-cleanup-scan-447/copy-read.cjs dump`); all writes go through Popty; bulk (>100 ops) only by night
changeset through `tools/changeset/apply-changeset.cjs` with a guards sidecar checked by
`ops/paid-cleanup-item9/tools/precheck-guards.cjs` (Kai's 19 Nov row + LEGO + seed pre-check).

## Tools (`tools/`)
- `item5-count.cjs <dumpDir> <out>`: empty audio slots on rows item 5 edited (`ops/paid-cleanup-item5/*/a.ops.json`).
- `fill.cjs <slots.json> --cap N`: render route then link-clip FILL-ONLY per slot; load gate (/health) before each; stops on
  a spend refusal; ledger `<slots>.ledger.jsonl` (resumable; evidence = audioId per slot).
- `mk-changeset.cjs <ops.json> <dump> <out.changeset.jsonl> --id ...`: night changeset + `.guards.json`.
- `item4-deletes.cjs <course> <dump> <outDir>`: item-4 scan rows -> phrase.delete ops (stale rows skipped, P30 debut floor held).

## State (copy ssi_copy_20261123t033000z, 23 Nov)
| item | count on copy | plan | chars (max, before library hits) |
|---|---|---|---|
| L1 item 5 audio | 250 empty slots: eng_for_tam 136, eng_for_jpn 61, eng_for_sin 46, eng_for_ben 4, eng_for_kan 3; the other 11 courses full | `item5/slots.json` -> fill.cjs by day | 9,344 |

Item 5 FILLED 24 Nov 08:1xZ: 250/250 slots linked (library 32, rendered 218), 8,484 chars, 0 refused; ledgers `item5/*.ledger.jsonl`; listen https://watson-1.tail4968cb.ts.net:10000/d/157e1019 (UNHEARD). Read-back from the 25 Nov copy still owed (`tools/item5-count.cjs` on it should report 0).
| L2 item 6 kor_for_tam / kor_for_hin | #703's plan still matches the copy: 0 stale; +1 row of the same defect (S0227L03U06) | tam 121 text ops (night changeset with audio.link ops after day renders); hin 28 ops (by day, apply.py) | tam 3,578, hin 890 |
| L3 item 4 filler | eng_for_sin 201 scan rows: 198 delete, 3 stale (S0111 basket already changed); por_for_eng 205: 203 delete, 2 stale (S0108 changed by C0108); 0 held by P30 | `item4/<course>/r868.changeset.jsonl` (sin built; por rebuilt from the 24 Nov copy, after #785's night) | 0 (deletes) |
| L4 pan/guj silent | eng_for_pan 616 known + 5 target, eng_for_guj 199 known + 1 target = 821 | `item1-pan-guj/slots.json` -> fill.cjs | 28,694 |
| L5 item 8 | planning by #877·AK (brief `item8/BRIEF.md`) | `item8/slots.json` | tbd |

`ops/paid-cleanup-item6-703/apply.py` gained `ITEM6_FROM_COPY=1` (prepare from a copy dump instead of a live read).

guj S0559L02U08 (08:30Z outage refusal): one-shot re-ask 24 Nov per Kai's Watson: dryRun accepted, rendered once 34 chars, audio ba25cb4e linked fill-only ev f37cc078 (`item1-pan-guj/slots-eng_for_guj.reask.jsonl`). Day units now run as cs-long-keep-868-day (pan/guj fill then item 8 chain); the non-keep units were stopped by the surface at turn end.
