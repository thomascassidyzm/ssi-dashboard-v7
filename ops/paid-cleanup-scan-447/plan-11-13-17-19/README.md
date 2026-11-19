# plan-11-13-17-19 — PLAN ONLY (cs #784·AI, 18 Nov 2026). Nothing here has been applied, rendered or linked.
Paid-course cleanup items 11, 13, 17, 19 and the duplicate-LEGO pairs (source: ../COMBINED-FIX-LIST.md).
- `PLAN.md` — the walk document (regenerate by hand; it is authored).
- `<family>/decisions/<course>.json` — hand-authored proposals (do not regenerate). `<family>/plans/<course>.json` — built by
  `tools/plan.py` from the decisions (regenerates), carrying the validator and dry-run answers.
- `data/scan-*.json` — the 17 Nov scan rows per family (`tools/extract_scan_rows.py`, regenerates).
- `data/live/<course>.json` — today's LIVE read of every seed a proposal touches (`tools/live_seeds.py`; a re-run refreshes it).
- `tools/` — read-only. `plan.py`, `validate.py`, `dryrun.py`, `price.py`, `roman.py` are item 10's tools with a family
  directory argument; `mkdump.py` overlays the live seeds on the nightly QA-copy snapshot; `snap.py` are shared helpers.
  `dryrun.py` never sends `"apply": true`.

## STATE (kept current by the planning job; a successor starts here)
- **Clock note:** this job started 18 Nov ~16:10Z and stalled overnight; item 17's live reads are 18 Nov, everything after is 19 Nov.
  QA-copy snapshots in `$CS_SCRATCH/snap` are the 19 Nov 03:30Z copy (re-make them with `tools/paid-cleanup-717/snapshot.cjs`).
- **Popty is slow under load** (10 s+ per read, minutes per dry run). Long serial network loops go in a systemd user unit
  (`tools/run_item13_fetch_and_item17_dryruns.sh` is the model), never a foreground loop.
- **Item 17 (gapped):** DONE to validator — `item17/decisions/build.py` is the source (50 decisions, 12 courses);
  validator 0 new issues; dry runs: see each plan's `dryRun` (kor_for_eng needs `tools/roman_fill.py item17 kor_for_eng`
  then a dry run; eng_for_ben must be sent as ONE chunk, `--chunk 100`, because its new LEGO and that LEGO's rows must share a
  transaction). Summary for PLAN.md still to write from the plans (`pattern`, `pov`, `why` fields).
- **Item 13 (one prompt, two answers):** seeds listed in `data/item13-seeds.txt`, live reads in `data/live/`. Decisions go in
  `item13/decisions/build.py` (same shape as item 17's). Patterns found so far: (a) person not carried in the English
  (K26) — re-gloss; (b) gender/number form of one word — grow to its noun; (c) two real words — unify if the seed allows, else
  grow one into its seed's larger piece (L34); (d) row-level clashes — reword/delete the row; (e) holds.
- **Duplicate-LEGO pairs:** no suspect list exists anywhere (searched branches, main log, estate-search) — RECONSTRUCT from
  `data/scan-FLAGS.json` (taught-NEW-twice rows) + one pass over the snapshots (same known+target NEW twice; same target,
  different known). Not started.
- **Items 11 and 19:** three Fable shards — item 11 A (Romance+German) branch `cs/805-plan-item-11-shard-a-romance-ger`,
  item 11 B (Arabic/Asian/eng_for_*) `cs/806-plan-item-11-shard-b-arabic-asia`, item 19 `cs/807-plan-item-19-legos-over-8-syllab`.
  Their brief is `BRIEF-CHILD.md`. Merge their branches into this one when they report; fold `item11/SUMMARY-*.md` and
  `item19/SUMMARY.md` into PLAN.md.
- **Then:** ONE adversarial reviewer (`"model":"sol"`; if refused, report the refusal verbatim and use `"opus"`), fold findings,
  write PLAN.md (table first, one section per family for the chat walk, plain English), publish with `/api/publish-doc`
  (`conv_id` 05bf206c-eaf6-430d-a459-b33dbee2236e), report in one paragraph + landing line.
