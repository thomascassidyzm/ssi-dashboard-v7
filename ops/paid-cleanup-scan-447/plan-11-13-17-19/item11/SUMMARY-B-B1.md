# Item 11, shard B, part B1: the three Arabic courses. PLAN ONLY, nothing applied.

"Basket does not drill its own LEGO": the learner is given a LEGO, then practises something smaller or different.
Every seed below was re-read live before it was judged. Decisions: `decisions/<course>.py`; plans with the builder's
answer and the dry-run answer: `plans/<course>.json`.

## The counts

| Course | Scan rows | LEGOs | Already fixed | Not a defect | Proposals | Holds | Est. characters |
|---|---|---|---|---|---|---|---|
| ara_for_eng (Standard Arabic) | 118 | 31 | 0 | 0 | 24 | 7 | about 13,100 |
| ara_lb_for_eng (Lebanese) | 20 | 9 | 1 | 0 | 6 | 2 | about 900 |
| ara_eg_for_eng (Egyptian) | 10 | 7 | 2 | 0 | 4 | 1 | about 500 |
| **Total** | **148** | **47** | **3** | **0** | **34** | **10** | **about 14,500** |

The builder's check: on every seed the plan changes it removes failures and adds none, with one exception (Lebanese seed 98, below). Popty's dry run accepted every operation in all three courses (ara_for_eng 123, Lebanese 19, Egyptian 11); nothing was applied.

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

## The two dialect courses

**Changed under the plan.** Between my first live read (18 Nov 18:45Z) and the dry run, another cleanup job deleted
five of the scan's rows (they used untaught words). Both courses were re-read on 19 Nov 11:38Z. Three LEGOs are
therefore *already fixed*: Lebanese seed 77 *I began | صرت*; Egyptian seeds 65 *test | تختبر* and 110 *we relax | نرتاح*.
Their baskets are now short for the builder and are owed a back-fill by the job that deleted the rows.

**Lebanese, 6 proposals** (patterns B and E above, plus two of their own):
- *The seed changed and its copy in the basket did not.* Seed 78 now says *ما فهمت شو قلت*; the basket's copy still
  said *مش فاهم*. The copy takes the seed's live words.
- *Damaged English.* Seed 144's LEGO is glossed **"th"** (its builds read *th*, *earlier th*, *more th*). It was
  already like that in the night-before copy. The plan restores *than* on the LEGO and the three rows, and rewords the
  one row that said *من اللي* instead of *مما*.
- Seed 83 *about | عن*: the bad row said *surprised FROM what happened*, which is the natural Lebanese; it is replaced
  rather than forced to say *عن*. Seeds 126 and 145: one or two rows reworded to the taught form.
- Seed 98 *in it | بشي*: the two rows with no *بشي* are reworded. **The LEGO's English is wrong** (*بشي* is "of/about
  something", not "in it") and every row's English is built on it; that needs the "LEGO says what its seed does not"
  fix, which has no plan for this course. The basket stays one build short until then: the one seed where the
  builder still reports a shortfall.

**Egyptian, 4 proposals**: seed 105 and seed 124 are the same "seed changed, copy did not" pattern (the old
*علشان كده* and *افتكرت*); seeds 133 and 150 each lose one row that belonged to a different word (*get to know him*
under *with him*; *can you | تقدر* under *may | ممكن*).

**Dialect holds (3):**
- **Lebanese seed 90, your call.** The seed now ends *كان أحلى*; its LEGO is *nicer | بيكون أحلى* and the basket's copy
  of the seed still says *بيكون أحلى*. In Lebanese *بيكون* is the ordinary "it would be" after "if you can…", and *كان
  أحلى* reads as past, so the likely fix is the seed back to *بيكون أحلى*. That is a seed edit.
- **Lebanese seed 94, your call.** The LEGO was changed to *the way | الطريقة* but the seed and all 7 rows still say
  *الطريق*. Either the seed moves to *الطريقة الوحيدة اللي رح تشتغل* and 7 rows follow, or the LEGO goes back to *الطريق*
  and nothing else moves.
- **Egyptian seed 143** *same | نفس* is an exact copy of the earlier LEGO at seed 62; the duplicate-LEGO plan decides
  it, and the one bad row goes with that decision.

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
- The Egyptian and Lebanese baskets are thin and repetitive beyond this family (*may before | ممكن من قبل*, *same today*); not judged here.
- Romanisation for new Arabic text is assembled word by word from the course's own rows (`tools/mkroman.py`); every
  word was found, but a line assembled that way has not been read as a whole by a reader of the romanisation.
