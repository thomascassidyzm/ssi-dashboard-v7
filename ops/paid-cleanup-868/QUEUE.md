# cs #868 queue: what is left after 24 Nov (for Kai's Wednesday list; Thu-Sun runs)

Every run below writes through Popty only, from the durable checkout ~/.cs-long/868/popty (ff-only origin/main), with an OnFailure wake.

| When | What | Unit | Proof |
|---|---|---|---|
| 24 Nov 22:10Z | item 6 kor_for_tam changeset (121 ops) then item 4 eng_for_sin + por_for_eng deletes, live seed+LEGO pre-check, 25 ops/txn | cs-long-keep-868-night.timer | `<changeset>.applied.jsonl` in the durable checkout |
| 25 Nov 08:00Z | item 8B eng_for_guj: ~557 slots left of 785 (228 takes done 24 Nov, stopped at 21:30Z) | cs-long-keep-868-guj.timer | `item8/ledger-eng_for_guj.jsonl` |
| 25 Nov 22:10Z | whatever the 24 Nov night left (window closed / writers busy) | same night timer | same |
| 25 Nov, morning copy | read-back: item 5 (250 slots), L4 pan/guj (783), item 8 (886 8A clips + 8B links) | by hand, committed tools | 0 empty slots in item5-count.cjs |
| Kai's ear | item 8A unknown-evidence pools: fra_ca 547, spa_mx 57 slots (not re-recorded) | none | Kai's sample |
| Surface retry fix | outage slots: `item1-pan-guj/handed-to-surface-retry.json` (38), `item8/handed-to-surface-retry.json` (5 + 1 HELD VOICE_MISMATCH pan S0029L01U03) | Tom's retry job | its own record |
