# zho_for_eng held items: per-item gate (cs #431·AI, 17 Nov 2026)

Kai, 17 Nov 2026 12:42Z: apply "if you're reasonably confident it doesn't clash with mine or tom's rulings and it has a precedent". Each item had to pass both: no clash with a ruling, and a precedent.
Spec: #425·AI d/58d93baf + d/1fce4b85. Ops: `plan.py` → `batch.ops.json` (batch 1) and `batch2.ops.json` (batch 2: F5, which includes a structural reorder, kai_go = Kai's words). Static checks: `check.py`.

| # | Item | Verdict | Clash check | Precedent |
|---|------|---------|-------------|-----------|
| 1 | S0025L05 好吗 → 帮我吗 "help me?" (+ S0092L03U04 drops its ", okay?" tag, the only later prompt that used the 好吗 LEGO) | APPLY | L26 HARD is the defect. "help me?" vs S0025L04B01 "help me" is told apart only by the question mark, which is significant under A7. | Canon L25/L26 (Kai, 8–9 Sep); zho #214 plan re-cut LEGOs to their seed (C7, seed 131 L01 re-cut, commit 73519db21) |
| 2 | S0073L02 更多要学 → 还有很多要学, + seed 75 / S0075L01 unified on 很多 | APPLY | Seeds 73 and 75 gave the same English with 很多 and with 更多. Unified per L34 ("first unify"). | L34 (Kai, 16 Nov), applied the same way on gle_v2 (#410·AI ev a00f9b68) |
| 3 | S0091L01 说得更快 → 想得够快 | APPLY | none | L25/L26; zho #214 C7 |
| 4 | S0117L01 这次 → 上次 (+ S0117L03U03 → 上次; 319/320 re-tile to S0318L01) | APPLY | 这次 is still taught at S0318L01 before every later use | L25/L26; zho #214 C7 |
| 5 | S0147L01 非常紧张 → 紧张 (type A; component rows C01/C02 deleted) | APPLY | none; every phrase still contains 紧张 | L26; S0336L01 (an A LEGO with no component rows) in this course |
| 6 | S0293L02 见你 → 见我 | APPLY | 见 is still taught (S0182L01, plus this LEGO's component), so 316/320/349 still tile | L25/L26 |
| 7 | S0336L01 扇 → 那扇门 "that door" | APPLY | none | L34/K40 (the measure word travels with its noun); same pattern as F5 |
| 8 | S0129L01 这么高兴 → 我很高兴 | **HELD** | Re-cutting to 我很高兴 leaves 这么 (做得这么好) taught by no LEGO, which breaks Kai's 12 Nov "every seed part is a LEGO". The fix needs a lego.insert, a structural op that this approval did not name. | none for the insert |
| 9 | S0259L01 好想法 → 想法 (type A; C01/C02 deleted) | APPLY | none | L26 |
| 10 | S0337L01 喜欢玩 → 继续玩 (U07 = P26 seed copy) | APPLY | none | L25/L26; P26 |
| 11–19 | Capitals: 5 LEGOs, 3 phrases; S0120L01U05 lowercased | APPLY | none | K9; this course already writes "Monday" (S0316L01U06) |
| 20 | Seed 61: ZH becomes one question 你能慢一点再说一遍吗？, + P26 copy S0061L03U09 | APPLY | S15: the seed failed P20/P26 (two sentences, so it had no copy). S0061L01 能再 is kept: both of its words are in the seed (L26 holds). | #435 seed fixes 19/396/413 in this course (ev a45edf7a, fc878c38) |
| 21 | Seed 82: + USE S0082L01U08 "I'm not going to wait for you" | APPLY | none | P26 |
| 22 | Seed 141: EN comma; + P26 copy S0141L02U09 on the seed's clips | APPLY | none | A7; P26 |
| 23 | Seed 643 → "do you want it, sir?" (seed, LEGO, B01, U01); B02 deleted (same English, 您想要它吗) | **HELD — applied then REVERTED ev 76ac6e61** (Kai 12:45Z: hold anything touching a Tom decision; Tom's plate A-186, 20 Aug, settled 643/659's shared English across all courses) | K55: 想要 takes a thing | plate A-186 (643/659 English fixed across courses); K55 |
| 24 | Seed 659 → "could you all say that again?" (seed + U01) | **HELD — applied then REVERTED ev 76ac6e61** (Tom's plate A-186) | none | A-186 |
| 25 | F5: 教堂 taught first (reorder), 那座 → 那座教堂 "that church", 8 + 5 + 4 phrases, seed 551/634 English | APPLY (batch 2, kai_go) | L34 / K23(d) / K47. 0 learner-state rows (dry run). | L34 (Kai, 16 Nov); lego.reorder used on gle_v2 (#248·AI / #410·AI) |
| 26 | S0092L03 drop the {儿} component | APPLY | none | #425 (Wiktionary 一會兒) |
| x1 | Extra: seed 162, S0162L01B03 → "what do you think about this" 这个你觉得怎么样 | APPLY | It removed a ZUT clash with the seed | R0.3 (rewording a phrase is legitimate) |
| x2 | Extra: S0413L02 靠 glossed "close to", phrases say "lean" | **HELD** | No fix was settled. Choosing between re-glossing and re-cutting to 靠得太近 is a new design, and no precedent was cited. | none |

The pod-1 check: none of the 231 pod-1 sentences shares a text with any touched row. Pod lines are their own rows, so no pod migration is needed.

## Tom-ruling check (Kai's 12:45Z addition, run after the apply)
Kai's addition reached this job after batches 1 and 2 had been applied (13:06–13:08Z) and the audio linked (~13:30Z). So every applied fix was checked against Tom's zho decisions afterwards. Sources checked: command-surface ops/rulings.jsonl, the canon, docs/DECISIONS.md, the plate archive, and Kai's zho memories (#214, #219, #435, #545).
- **r-2026-11-04 (prefer reduplicated 试试-type forms):** no 试试 or reduplicated row was touched. 多想想 is kept in S0117L01U07.
- **r-2026-10-24 (Chinese clips are rendered whole):** every clip was rendered whole.
- **r-2026-10-12 (LEGO split belongs to the direction):** no conflict.
- **Plate A-186 (Tom, 20 Aug, the 643/659 shared English):** touched, so items 23 and 24 were reverted in full (ev 76ac6e61). This includes re-inserting S0643L01B02. Every 643/659 row read back identical to its state before this job.
- **Gap:** no Popty route reads edit-event authorship, and direct DB reads are banned. So a row Tom edited by hand with no recorded ruling could not be detected. Seed 61's Chinese is the one changed seed whose authorship is unknown.
