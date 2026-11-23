# Cleanup item 14: a question mark on one side only (fix plan, nothing applied)

Overnight #785·AK, cs #791·AK. Counts are from the QA copy `ssi_copy_20261123t033000z` (23 Nov), made with the committed recount (`ops/paid-cleanup-717/tools/recount.cjs`; a played row whose known ends in `?`/`？`/`؟` and whose target does not, or the reverse).

## The defect
A question asked on one side and stated on the other. Canon **A7/A9 (Kai 17 Aug): "Question marks can make it sound different so they're significant enough to regenerate if needed"**, and the mark must be present before audio is generated. A missing `?` can mean the clip is read as a statement. There is a trap (A5, `tools/check-question-marks.cjs` header): adding `?` does **not** unlink the clip, because the normaliser strips it. The statement-intoned clip stays attached with no error. So every real fix also needs a queued audio pass for that side (O8).

**2,881 rows** (19 Nov: 2,883). By side: **target has `?`, known not: 2,049**; **known has `?`, target not: 832**. Roles: USE 1,930, BUILD 951.
Biggest: eng_for_jpn 671 (668 target-only), eng_for_zho 290, deu_at_for_eng 270, deu_for_eng 269 (266 known-only), jpn_for_eng 171, eng_for_sin 157, deu_ch_for_eng 101, zho_for_eng 96, ara_lb_for_eng 93, spa_for_zho 93.

## Real examples (copy, 23 Nov)
| course | row | known | target | reading |
|---|---|---|---|---|
| eng_for_kor | S0119L02B01 | 물어봐도 돼요 | can I ask? | Korean known is a question with no `?` → add `?` to the known, re-record the known |
| eng_for_jpn | S0233L05U05 | それが本当かどうか知っている人を知っていますか | do you know someone who knows if it's true? | Japanese `…か` with no `?` is normal writing. Whether the clip sounds like a question is an ear question |
| deu_for_eng | S0255L01U07 | When do you think you will be ready to leave, I need to know that now? | Wann denkst du, wirst du bereit sein zu gehen, ich muss das jetzt wissen | the English is a run-on, a question then a statement; the `?` sits on the wrong clause. Rewrite, not punctuation |
| fra_for_eng | S0407L06U01 | shouldn't we try to set a good example? | ne devrions-nous pas essayer de montrer le bon exemple | French target lacks `?` → add it and re-record target1 + target2 |
| eng_for_hin | S0461L03U02 | क्या हमें ऐसी दुकान मिल सकती है जहाँ मैं कुछ पोस्टकार्ड ख़रीद सकूँ? | could we have such a shop where I can buy some postcards | English target lacks `?`. Also "have such a shop" is unnatural (K16): reword as "could we find a shop where…?" |

## Why the count is not a work order (R0.9)
The #447 scan, read by hand, judged **1,263** of these real in 25 courses. The recount's 2,881 also counts every Japanese/Chinese known side written without `?` (`か`, `吗` end a question in normal writing). Those are not text defects. They only matter if the **known clip** was rendered flat, and that is an ear question, not a punctuation one. The German 640 (deu/deu_at/deu_ch) are **text-only** per #447: the clips already sound right, so they cost 0 chars.

## The fix rule, per case
1. **Space-delimited languages, side clearly a question, other side clearly a question too** (fra/spa/ita/por/deu/eng/ara/Indic): add the missing `?` (Arabic `؟`) to that side. Then queue a re-record of **that side's** clip(s) through `/api/audio/render`, library-first, make-before-break (O11), unless the clip is known to be question-intoned already (German 640: text-only).
2. **Japanese/Chinese side with a question particle and no `?` (≈1,000 in eng_for_jpn/eng_for_zho/jpn_for_eng/zho_*):** text stays as is. Put a sample of the known clips on a listening page for **Kai's ear**. Only if they sound flat does this become rule 1.
3. **Rows where the mismatch is a symptom** (run-ons, a statement on one side, unnatural wording): rewrite under P7/K16 through edit-batch, not punctuation. Expect a few per cent. They are found by the reading pass in step 0.
4. **Step 0, before anything:** run the committed reader `node tools/check-question-marks.cjs <course> --reading-list` (Kai's two-pass method, 2026-09-10: the net's candidates are read in full, plus an independent span read). This tool reads the DB, so it runs on the QA copy at night.

## Size and audio
- Text: up to 2,881 one-character edits. After step 0, the #447 estimate is about 1,263 real.
- Audio (#447 estimate): **≈21,200 Cartesia chars** for the non-German real rows (re-record the side that gained `?`). Rule-2 rows add nothing unless Kai's ear says flat.
- Apply route: per course `POST /api/production/:course/edit-batch` (dry run, then apply), with each row's `expect`. Then queue the audio pass (`node tools/course-optimization/queue-audio-pass.cjs <course> --reason "item 14 question marks"`). Re-records go through Popty's render route under a `kai:<date>:item14` token.

## Kai's call
- **Step 0 reading pass on the QA copy** (read-only, Claude-heavy, produces per-course real/convention/rewrite lists) → **Y / N** (recommended **Y**).
- **Rule 1 as a scripted fix after step 0 (PROPOSAL, needs your specific Y; 18 Nov rule)**: add `?` + re-record that side, ≈21k chars → **Y / N** (recommended **Y**, after step 0).
- **Rule 2 (Japanese/Chinese known clips)**: a listening page of about 30 samples for your ear first → **Y / N** (recommended **Y**).
