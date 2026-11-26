# cs #868 queue: what is left after 24 Nov (for Kai's Wednesday list; Thu-Sun runs)

Every run below writes through Popty only, from the durable checkout ~/.cs-long/868/popty (ff-only origin/main), with an OnFailure wake.

| When | What | Unit | Proof |
|---|---|---|---|
| 25 Nov 22:45Z | DONE: item 6 kor_for_tam 346 ops + item 4 sin 198 / por 203 deletes, 0 held | (timer disabled) | `*.applied.jsonl` |
| 25 Nov 08:00Z | item 8B eng_for_guj DONE 08:44Z: 757 takes / 785 slots, 25,394 chars (with 24 Nov: 33,949), 0 refused; listen https://watson-1.tail4968cb.ts.net:10000/d/97f8e373 UNHEARD | done | `item8/ledger-eng_for_guj.jsonl` |
| 26 Nov, morning copy | read-back DONE: item 6 + item 4 0 drift; item 8 5,598 serving, 7 explained (README) | done | `readback/*-20261126.json` |
| next Kai day | re-ask 2 pan 8B links that timed out (S0155L04U04, S0343L01U01: male take exists, link never landed) + held S0029L01U03 (no male known voice) | by hand, Kai grant | readback |
| 25 Nov, morning copy | read-back DONE for item 5 (248+2 LEGO) and L4 (821/821); item 8 read-back owed from the 26 Nov copy (8B guj ran 25 Nov) | by hand, committed tools | 0 empty slots in item5-count.cjs |
| Kai's ear | item 8A unknown-evidence pools: fra_ca 547, spa_mx 57 slots (not re-recorded) | none | Kai's sample |
| Surface retry fix | outage slots: `item1-pan-guj/handed-to-surface-retry.json` (38), `item8/handed-to-surface-retry.json` (5 + 1 HELD VOICE_MISMATCH pan S0029L01U03) | Tom's retry job | its own record |
