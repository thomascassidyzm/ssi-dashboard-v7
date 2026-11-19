# Item 11, shard B, part B1: the three Arabic courses. PLAN ONLY, nothing applied.

"Basket does not drill its own LEGO": the learner is given a LEGO, then practises something smaller or different.
Every seed below was re-read live before it was judged. Decisions: `decisions/<course>.py`; plans with the builder's
answer and the dry-run answer: `plans/<course>.json`.

## The counts

| Course | Scan rows | LEGOs | Already fixed | Not a defect | Proposals | Holds | Est. characters |
|---|---|---|---|---|---|---|---|
| ara_for_eng (Standard Arabic) | 118 | 31 | 0 | 0 | 24 | 7 | about 13,100 |
| ara_lb_for_eng (Lebanese) | 20 | 9 | see below | 0 | see below | 2 | see below |
| ara_eg_for_eng (Egyptian) | 10 | 7 | see below | 0 | see below | 1 | see below |

Characters are an upper bound (a clip that already exists costs nothing).

## The fix patterns (one ruling each)

### A. The short cut is blocked, so the basket is rebuilt around the LEGO as it stands (ara_for_eng: 9 LEGOs)
Your shortest-cut ruling was tried first on every LEGO. In Standard Arabic it is usually blocked, for one of three
reasons, and then the LEGO stays and the rows are reworded to hold it:

1. **The short piece would give one English prompt two answers.**
   - Seed 627 *your coffee is ready | قَهْوَتُكَ جاهِزَةٌ*. Eight of nine rows drill *it's ready* without *your coffee*. The
     short cut *ready | جاهِزَةٌ* would keep five rows, but *ready* is already *مُسْتَعِدٌّ* (seed 26). The LEGO stays; the
     eight rows become *is your coffee ready?*, *your coffee is ready now*, *she asked if your coffee is ready* …
   - Seed 630 *can I have | يُمْكِنُني الحُصولُ*. All 8 rows drill *can I | يُمْكِنُني أَنْ* + a verb, which is the LEGO of
     seed 119. Shrinking would make *can I* answer two ways. The 8 rows become *can I have something? / red wine? / a
     table for four please?*, modelled on seed 414's *could we have* basket.
   - Seed 424 *everybody's time | وَقْتَ الجَميعِ*. Seven rows drill *everybody | الجَميعَ*. *everybody | الجَميعُ* is
     already taught (seed 396) with another ending. Rebuilt on *they want / they need everybody's time*.
2. **The short piece would be a lone particle.** Seed 144 *earlier than | أَبْكَرَ مِمّا* (six rows stop at *earlier*; they
   gain *than I should / than I expected*), seed 451 *what they wanted | ما أَرادوا* (all 8 rows drilled *what* with
   other verbs), seed 102 *to say that | نَقولَ إِنَّ*.
3. **The whole basket drilled a different sentence.** Seed 152 *if I had known | لَوْ عَرَفْتُ*: all 8 rows said *if I
   were ready*. Seed 202 *nobody was | لَمْ يَكُنْ أَحَدٌ*: 9 unvowelled rows drilling *anyone*; rebuilt, vowelled, from
   words taught by seed 202.

**Arabic limit worth knowing:** after *she said that / I think that* a noun changes its ending (قَهْوَتُكَ → قَهْوَتَكَ),
which is no longer the taught form. So whole-LEGO rows for noun LEGOs are questions and plain statements.

### B. One or two rows use another person's verb form or another case (ara_for_eng: 9 LEGOs, 15 rows)
A different verb form is a break (your 19 Oct ruling). The row is reworded to the LEGO's own form; nothing else moves.
- Seed 470 *to climb | تَتَسَلَّقَ*: U02 said *يَتَسَلَّقَ* (he). Now *she asked how high you want to climb*.
- Seed 662 *you all speak it | تَتَكَلَّمونَهُ*: four rows said *أَنْ تَتَكَلَّموه* (the form after "to"), and a fifth was not
  sound Arabic. Now *do you all speak it?*, *you all speak it very well* …
- Seed 570 *willing to pay for it | مُسْتَعِدٌّ أَنْ تَدْفَعَ*: four rows said *he*; now *you*.
Also seeds 109, 462, 465, 499, 595, 619, 657, 661, 664.

### C. Re-cut to the piece the basket drills (ara_for_eng: 1 LEGO)
- Seed 410 *they still fight with each other*. The LEGO is glossed *with each other* but its Arabic is only *بَعْضِهِمْ*;
  six of eight rows already say *مَعَ بَعْضِهِمْ*. The LEGO becomes *with each other | مَعَ بَعْضِهِمْ* (5 syllables). Two
  rows that said *بَعْضِنا* (we) are reworded to *they*.

### D. Sir / madam LEGOs: every row ends in the honorific (ara_for_eng: seeds 642, 648, 651; 22 rows)
Your 28 Sep rule: the LEGO keeps *madam*, its rows drill the LEGO without it, and *madam* goes back on the END of every
row, both sides. The Arabic rows never got their *madam*, and the builder fails every one of them. The plan rewords
each row so the core and *سَيِّدَتي* close it: *I know how you feel madam | أَعْرِفُ كَيْفَ تَشْعُرينَ سَيِّدَتي*.
**One ruling wanted:** is "madam on every row" right for Arabic, as it was for Italian? It is 22 of this course's
rows. If not, only the 6 rows that miss the core need fixing.

### E. A thin basket gets its missing row (11 LEGOs, 12 rows added)
With the broken rows fixed, the builder still found some baskets short of 3 builds that put the LEGO inside a phrase,
or 5 uses (the broken rows had been hiding it). One row is added from taught words, so every changed basket passes.

## Holds

**Seven ara_for_eng LEGOs are also on the over-8-syllables list (item 19).** That plan re-cuts them and re-homes
every row, so they are not planned twice here: seeds 91, 413, 644, 645, 646, 654, 659. Notes for that cut are in each
decision. Two to carry over: seed 91's obvious short piece *to think | أَنْ تُفَكِّرَ* clashes with *to think | أُفَكِّرَ*
(seed 638); seed 659's *can you all* clashes with seed 529.

Dialect holds are listed under each dialect below.

## LEGOs kept at 7 or more syllables
- ara_for_eng seed 642 *how do you feel madam? | كَيْفَ تَشْعُرينَ سَيِّدَتي؟*: 10 with *madam*, 6 without. Kept: a
  sir/madam LEGO is counted without its honorific. Not on the item-19 list.
- ara_for_eng seed 630 *can I have | يُمْكِنُني الحُصولُ*: 7. Kept: the shorter piece clashes with seed 119.
- ara_for_eng seed 664 *are you all ready? | هَلْ أَنْتُمْ مُسْتَعِدّونَ؟*: 8. Kept: five rows already drill it whole.
- ara_for_eng seed 651 *what do you think madam?*: 9 with *madam*, 5 without. Seed 648: 6 with *madam*.

## Things seen on the way (not this family; not fixed)
- ara_for_eng seed 570: the LEGO's English changed since the scan, to *willing to pay for it*; there is no "it" in the
  Arabic or the seed.
- ara_for_eng seeds 91 and 102 have seed words no LEGO covers (*enough to answer in time*; *the matter is not*).
- Many reworded rows lean on words the learner has only met inside earlier practice rows, never as a LEGO (سَأَلَتْ
  *she asked*, قالَتْ *she said*, الأَمْرَ *the matter*). The rows they replace did the same. The builder accepts them.

## Gaps
- Romanisation for new Arabic text is assembled word by word from the course's own rows (`tools/mkroman.py`); every
  word was found, but a line assembled that way has not been read as a whole by a reader of the romanisation.
