# cs #868 queue: what is left after 24 Nov (for Kai's Wednesday list; Thu-Sun runs)

Every run below writes through Popty only, from the durable checkout ~/.cs-long/868/popty (ff-only origin/main), with an OnFailure wake.

| When | What | Unit | Proof |
|---|---|---|---|
| 25 Nov 22:10Z (24 Nov window lost to a writer-count bug, fixed 569c0c53a) | item 6 kor_for_tam changeset (121 ops) then item 4 eng_for_sin + por_for_eng deletes, live seed+LEGO pre-check, 25 ops/txn | cs-long-keep-868-night.timer | `<changeset>.applied.jsonl` in the durable checkout |
| 25 Nov 08:00Z | item 8B eng_for_guj DONE 08:44Z: 757 takes / 785 slots, 25,394 chars (with 24 Nov: 33,949), 0 refused; listen https://watson-1.tail4968cb.ts.net:10000/d/97f8e373 UNHEARD | done | `item8/ledger-eng_for_guj.jsonl` |
| 26-29 Nov 22:10Z | whatever the 25 Nov night left (window closed / writers busy) | same night timer | same |
| 25 Nov, morning copy | read-back DONE for item 5 (248+2 LEGO) and L4 (821/821); item 8 read-back owed from the 26 Nov copy (8B guj ran 25 Nov) | by hand, committed tools | 0 empty slots in item5-count.cjs |
| Kai's ear | item 8A unknown-evidence pools: fra_ca 547, spa_mx 57 slots (not re-recorded) | none | Kai's sample |
| Surface retry fix | outage slots: `item1-pan-guj/handed-to-surface-retry.json` (38), `item8/handed-to-surface-retry.json` (5 + 1 HELD VOICE_MISMATCH pan S0029L01U03) | Tom's retry job | its own record |
