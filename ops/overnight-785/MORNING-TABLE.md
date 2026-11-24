# Overnight run 23→24 Nov: morning table for Kai (cs #785·AK)

Kai approved the run at 11:02Z on 23 Nov. The night's Cartesia cap was 1,000,000 characters, including item 4. No more than 3 DB writers ran at once, and every batch waited while Popty's load gate read amber. Every apply did a live pre-check of the row, its LEGO and its seed first, and a mismatch was held, never forced.

| # | Item | Outcome | Rows / slots changed (live) | Chars |
|---|---|---|---|---|
| 1 | eng_for_tel Azure→Cartesia | **Partly done**: stopped by the time limit at 06:55Z after 9,696 of 13,181 clips (74%), with 0 refusals and 0 gaps | 10,227 slots repointed to Cartesia (9,342 rendered, 354 library) | **420,449 Cartesia** |
| 2 | eng_for_jpn known prompts D2, seeds 74-300 | **Mostly done** | 968 of 1,048 planned changes; 699 clips | 16,330 |
| 3 | por_br held fixes + "fala isso" S0647L02/S0662L01 + S0385 | **Done** | all 47 seeds, plus 13 English known clips that were silent | 12,635 |
| 4 | kor held fixes + S0082L01 duplicates | **Done** | 5 duplicate rows deleted | 0 |
| 5 | por held fixes, incl. S0379 *tive sorte* | **Done** | all 72 seeds, incl. seed 26 | 1,525 |
| 6 | jpn held small batches, seeds ≤300 | **Done** | 11 seeds + 4 intros | 2,430 |
| 7 | item-9 back-fill, 17 courses | **Written, NOT applied** | 546 rows in 17 changesets that each pass `--check`; 164 of 303 LEGOs reach the floor, and 139 stay thin rather than take a weak phrase | 0 (≈44.5k if rendered later) |
| 8 | item-12 duplicate census | **Done** (read-only, QA copy of 23 Nov) | 4,129 of 4,330 inserts are on the copy: 0 exact duplicates, 1,259 share a target with an older row under another prompt, 4 duplicate a row in another basket, 2,868 are clean | 0 |
| 9 | plans for cleanup items 18 / 16 / 14 | **Published, nothing applied** | 18: https://watson-1.tail4968cb.ts.net:10000/d/d58f19f3 · 16: https://watson-1.tail4968cb.ts.net:10000/d/ed89648a · 14: https://watson-1.tail4968cb.ts.net:10000/d/6e9f4b92 | 0 |
| — | item 4 timer (por_br + eng_for_mar filler rows, cs #358) | Ran 22:05Z to 07:00Z | 4,793 audio slots linked (4,220 rendered, 573 library); no new row applies logged tonight | 121,472 Cartesia |

**Night total: 574,841 characters.** That is 420,449 for tel, plus 32,920 for items 2-6, plus 121,472 for item 4, against a 1,000,000 cap.
- **Azure: 0** that we can see. The tel and item 4 clips are Cartesia by voice.
- Items 2-6 were rendered through the same route, but its answers don't name the provider, so those 32,920 characters are booked as "other".

## Settled overnight by Kai's Watson (outcomes, not questions)
- **Item 2: 26 seeds held (225 and 232-299).** Renders stopped twice on APPROVAL_UNVERIFIED while the Command Surface restarted.
  - They re-run on a later night, by the same route with the live pre-check: `rerun-plan.md` item 3, cap 40k.
  - The 89 rows the night gate refused stay held by rule.
- **Item 5, seed 26: "pronta" in the female voice is correct.** The line is the speaker about themself ("estou quase pronto para ir"), so the speaker-gender rule applies. Clip 3cfbbdee reads back ok.
- **Item 6, 3 rows on "another clip" (S0073L03U09, S0096L02U09, S0248L02U08): a false alarm.** The edits only changed punctuation (。→、), so the words are the same. The undo records show the rows kept the clips they already had.
- **Item 3:** S0145L01B03 "não estou mais contente" got a "no different form" gender entry (event a20febf9), which cleared the remaining held seeds.

## Gaps (explicit)
- **Item 1, tel:** 3,485 of 13,181 clips are still on Azure.
  - The run stopped only because it reached its 06:55Z time limit, not on a refusal or the cap.
  - The remainder is about 80k characters if it costs what tonight's clips did. A later night picks it up with `run-day.cjs --day 8`, which carries on from what is already logged.
- **Item 4:** the window closed at 07:00Z with 6,994 slots unanswered. 249 renders were refused APPROVAL_UNVERIFIED during the surface restart, 20 links found their slot already filled and 14 hit WRITE_FAILED. The timer re-asks them next night; its cumulative spend is 251,386 of its 550k cap.
- **Indic Cartesia casts are unheard.** The tel sample below is the only evidence besides the served clip ids. Nothing was transcribed.

## Listening pages (all UNHEARD)
- Item 1, tel, 20 sample clips: https://watson-1.tail4968cb.ts.net:10000/d/f5a7a552
- Item 2, eng_for_jpn: https://watson-1.tail4968cb.ts.net:10000/d/76d8c66a
- Item 3, por_br: https://watson-1.tail4968cb.ts.net:10000/d/7467e413
- Item 5, por: https://watson-1.tail4968cb.ts.net:10000/d/c5362814
- Item 6, jpn: https://watson-1.tail4968cb.ts.net:10000/d/8621c86e

## For Kai to say yes or no to this week (not urgent tonight)
- Applying item 7's back-fill (546 rows, about 44.5k characters to render).
- Applying the plans for items 18, 16 and 14. Each scripted fix in them is a proposal, per his 18 Nov rule.
