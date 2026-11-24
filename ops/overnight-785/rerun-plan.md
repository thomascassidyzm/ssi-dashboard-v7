# Later-night re-run plan, settled (cs #785·AK; Kai's Watson rulings 23 Nov; neither is a Y/N for Kai)

1. Item 3 por_br, 26 held seeds incl. 647/662 "fala isso": first retry with `ops/overnight-785/kit/resume-item3.sh`. If
   GENDER_PREP_MISSING repeats on S0145L01B03 "não estou mais contente", live pre-check of row + LEGO + seed, then store
   ONE "no different form" gender entry for that exact text through Popty's edit route ("contente" is the same for a
   man or a woman), then resume. Any other refusal stops the run and is reported.
   Detail: `item3-holds-and-gender-prep.md`.
2. Item 5 por, seed 26 (S0026L02B02, S0026L02U01; "…estou quase pronto para ir"): render a correctly voiced clip
   through `POST /api/audio/render` only. Gender prep must give the male form ("pronto") for the male seat. Never link
   the library clip that says "pronta" to the male seat (Popty refused it with SPOKEN_WORDS_MISMATCH). Then live
   pre-check row + LEGO + seed, then apply the 2 held phrases (`kit/resume-apply.sh` with seed 26 no longer held).
Both are within Kai's approved budget; report them as settled.
3. Item 2 eng_for_jpn D2, 26 held seeds (225 and 232-299). They were held after a second APPROVAL_UNVERIFIED, caused
   by the Command Surface restart at about 00:00:51Z. Kai's Watson ruled on 24 Nov: re-run on a later night by the same
   route with the live pre-check. That is ONE pass:
   `STOP_AT=<night end> LABEL=ITEM2-RERUN kit/second-pass.sh <conv> item2-jpn-d2 eng_for_jpn 40000`
   - It runs a fresh live read and Kai's row + LEGO + seed pre-check against the 23 Nov copy, so seeds already applied
     are held and never sent twice.
   - The render route stops at the first refusal, and the run is never looped.
   - The item cap of 40,000 is the plan figure; 16,330 was spent on 23-24 Nov.
   - The 89 rows the gate refused stay HELD by rule and are not part of this pass.

## Settled 24 Nov by Kai's Watson: outcomes, facts not questions

- **Item 5, seed 26: correct, nothing to do.**
  - The phrase is S0026L02B02/U01 "eu gosto de sentir que estou quase pronto para ir", with the known side "I like to
    feel that I'm almost ready to go".
  - It is the speaker talking about themself ("estou quase pront-"), so under the speaker-gender rule the female seat
    correctly says "pronta".
  - Clip 3cfbbdee came back from `/api/audio/render` as the target1 answer for this text (0 chars). It was linked, and
    the verify reads it back ok.
  - Not for Kai. The evidence is the row and seed text in `item5-por/out/audio-real.json` and `plan-live-seed26.txt`;
    nothing was transcribed.
- **Item 6, 3 rows on "another clip": a false alarm. The clips are unchanged and correct.**
  - The rows are S0073L03U09, S0096L02U09 and S0248L02U08.
  - All three edits were punctuation-only on the target side (。→、), and the spoken words are identical. Examples:
    ありがとう。でも、まだ学ぶことがある → ありがとう、でも、…; まだ準備できてない。もう少し… → …ない、もう少し…;
    あの映画、ひどかった。お金… → …ひどかった、お金….
  - So no new audio was asked for, and each row kept the clip it already had.
  - The undo records in `item6-jpn-small/out/applied.json` name the pre-apply clips: 85e3924d/1a1daa91, 05a4255a/3b065743
    and 854ae158/67ff8493. These are exactly the clips the verify reported, and verify flagged them only because this
    job did not make them.
  - The same pattern was seen on S0058L03U06. Nothing to do.
