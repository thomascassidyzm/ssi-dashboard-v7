# Item 6 plan — independent review and dispute outcomes (cs #703·AI)

Reviewers: #720·AI (sol) was stopped by the watcher with no output; the review was re-dispatched as two sol shards.
- Shard A, #722·AI: jpn_for_eng, kor_for_tam, kor_for_hin — verdicts on branch `cs/722-item-6-plan-review-shard-a-adver` (`review-verdicts-A.json`, at b6b2b360f)
- Shard B, #723·AI: the other ten courses — verdicts on branch `cs/723-item-6-plan-review-shard-b-adver` (`ops/paid-cleanup-item6-703/review-verdicts-B.json`, at 6fed7c443)

Each outcome below is recorded on its plan.json entry (`review`, `plan_before_review`).

## Shard B: 136 AGREE, 14 DISPUTE

| course | row | dispute | outcome |
|---|---|---|---|
| ita_for_eng | S0642L02U05 | formal *si sente* has no register signal | ACCEPTED: "…after all this, madam?" / "…dopo tutto questo, signora?" (K10/K32; signora is taught at seed 642, S0642L01U07) |
| zho_for_jpn | S0283L02U04 | 中国語を話せますか → 会/能 clash with S0014L02B03 vs S0297L01U06 (P16) | ACCEPTED, the row is deleted instead of edited. The current row has the English word "chinese" inside the Chinese, so leaving it is worse; U01–U03 stay |
| por_for_eng | S0570L03U02/U03/U04 | perguntou/perguntaram are untaught (P1/K21) | ACCEPTED, the rows are deleted (K15: delete or edit the phrases). The basket keeps B01–B04, U01 and U05 |
| por_for_eng | S0501L04U04/U05 | em ti + brincarem person mismatch is still there | ACCEPTED, the rows are deleted. The basket keeps B01–B03 and U01–U03 |
| por_for_eng | S0453L02B01 | duplicate of B03 apart from the ? | ACCEPTED, B01 is deleted and B03 kept |
| ara_for_eng | S0438L01U04 | known side "collect" is untaught (K1) | ACCEPTED, the row is deleted. The basket keeps 7 rows |
| ara_for_eng | S0427L02U05 | single بَعْضَهُمْ is not the MSA reciprocal (Ryding ch. 9) | ACCEPTED, the row is deleted. The basket keeps 7 rows |
| ara_for_eng | S0154L01B02/B03 | السَّبْت lacks its genitive kasra | REJECTED: a sentence-final word takes the pausal (waqf) form, the norm at the end of an utterance (Ryding 2005, ch. 2 pause forms), and it matches the LEGO's own surface لَيْلَةَ السَّبْت. Adding the kasra here only would also break exact LEGO containment (P17) |
| spa_for_eng | S0216L04U14 | *mucho* is untaught until S0218L03 | ACCEPTED, the row is deleted (U14 sits in a 14+ row basket) |

The baskets were checked against live Popty dumps taken 18 Nov 14:18Z.

## Shard A: 240 AGREE, 38 DISPUTE

Applied by `build/review_a.py` (it reads a live jpn_for_eng dump taken 18 Nov 14:4xZ). The revised Japanese plan was re-run through `check.cjs`. Result: 0 errors, 0 new ZUT clashes, 36 issues fixed. The new duplicate S0017L03B01/U01 was already there before this plan; neither row is touched. Two "untaught" flags (S0017L03U05 戻る, S0022L01U03 明日) are taught under P2: 戻る is shown as a component at S0016L01 and 明日 is met inside 明日も (S0015L01). The remaining BUILD/USE floor counts are warnings (P23).

| course | row(s) | dispute | outcome |
|---|---|---|---|
| jpn_for_eng | SEED212, S0212L01 B03/B04/U01/U04/U05/U08/U10, S0052L01U04/U08, S0214L01U07, S0215L01U07, S0215L02U07, S0216L01U07 | past -たかった may report a third person (Makino & Tsutsui, *A Dictionary of Basic Japanese Grammar*, -tai Note 1 exception; course precedent SEED52 書きたかった) | ACCEPTED: the edits are withdrawn and the current rows kept. Untaught forms in some of them (戻りたかった, 休みたかった, 働きたかった, 出かけたかった) were already there and belong to item 9, not item 6. S0212L01U02 still changes, because 母 cannot be "her mother" |
| jpn_for_eng | SEED34, SEED35 (held) | a repair exists: first-person English, drop 彼は/彼女は (neither seed introduces them) | ACCEPTED: the seeds are repaired. LEGO glosses S0034L01/S0035L01 and their B rows change "doesn't" → "don't", and the seed copies S0034L02U04 / S0035L03U08 follow the seed |
| jpn_for_eng | SEED16 | stays held (it introduces 彼は) | agreed |
| jpn_for_eng | S0016L03U04 | "he'll go back together" has no recoverable companion | ACCEPTED: "he'll go back with everyone later / 彼はあとでみんなと戻る" |
| jpn_for_eng | S0282L01U07 | 飲みたい is untaught until 625 | ACCEPTED: "no, I want to go tomorrow / ううん、明日行きたい". ううん itself is agreed (Daijisen) |
| jpn_for_eng | S0040L01 | "how do you feel" clashes with S0657L02 いかがですか | ACCEPTED: the LEGO re-gloss is left out. B01–B03 (now 彼は…どんな気分？) still apply |
| jpn_for_eng | SEED113 | U09 seed copy missing | ACCEPTED: U09 known changes with the seed |
| jpn_for_eng | S0113L03B02 | duplicate of B01 | ACCEPTED: deleted |
| jpn_for_eng | S0113L03U01/U05/U06/U07/U08 | the re-glossed rows keep untaught 疲れた / しようとしてた / 言った / 話そうとすると / したかった | ACCEPTED, but the rows are deleted rather than left (K15). Leaving them would keep "can't remember" over 覚えてない beside a LEGO now glossed "don't remember". The basket keeps B01, B03, B04, U02, U03 and U09 |
| jpn_for_eng | S0211L02U02, S0265L01U05, S0269L02U01 | known "method" untaught / 助けたい untaught / 二日間 untaught | ACCEPTED: deleted (K15). Each basket keeps 7+ rows |
| jpn_for_eng | SEED299, S0299L02B03 | 払いたい has no teaching LEGO | REJECTED for item 6: the edit is English-only ("he" → "we") and adds nothing untaught. The 払いたい tiling gap (L26) predates this plan and is listed as residual. "we" avoids duplicating B02 "I want to pay half" |
| kor_for_tam | S0227L02U05, S0227L03U05 | the Korean still omits அவரும் ("he too") | REJECTED for item 6: the 저에게 register fix is right on its own. The missing 도 is an older prompt mismatch (item 3 family) and is listed as residual |
| kor_for_hin | S0021L02 + B01–B03 | the K23(e)(2) route exists | NOT APPLIED: the reviewer itself calls the presentation + course-wide 그녀의/그의 audit "prerequisites, not already verified fixes". The rows stay held and are listed as residual |
| kor_for_hin | S0655L02U02 | bare श्रीमती is a pre-name title (Hindwi) | ACCEPTED: left out |

Romanisation: all 43 changed jpn_for_eng targets carry romaji. Each was written by hand in the course's own style (Hepburn, doubled long vowels, 、→,) and is kept in `applied/jpn_for_eng/roman.json`. kor_for_tam and kor_for_hin rows carry none. The 28 changed ara_for_eng rows had a romanisation that was cleared on purpose, because no permitted route shows the existing transliteration scheme.
