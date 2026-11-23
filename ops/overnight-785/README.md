# Overnight run 23→24 Nov 2026 for Kai (cs #785·AK)

Shared work products for the night: op lists, dry runs, undo files, changesets, spend tallies. Children write under
`ops/overnight-785/<item>/` and commit + push as they go. `RULES.md` is pasted into every sub-brief.

| Path | What | Regenerates? |
|---|---|---|
| `RULES.md` | canon digest + Kai/Tom hard rules + budget split, as briefed | no (hand-written) |
| `budget.json` | night tally: per item planned cap, Cartesia/Azure spent, source file | updated by the orchestrator |
| `item2-jpn-d2/` … `item6-jpn-small/` | Child A: plans, gate/dry/apply answers, undo, spend | no (evidence of live applies) |
| `item7-backfill/`, `item8-census/`, `item9-plans/` | Child B: changesets (`--check` clean, NOT applied), census output, plans | item 8 re-runs from its committed tool on a newer QA copy |

Item 1 (eng_for_tel A2C) lives with its siblings: `ops/voice-casting/azure-to-cartesia/day8-batch.jsonl`, results in
`~/ssi-evidence/ssi-dashboard-v7/ops/voice-casting/azure-to-cartesia/day8-results.jsonl`.
