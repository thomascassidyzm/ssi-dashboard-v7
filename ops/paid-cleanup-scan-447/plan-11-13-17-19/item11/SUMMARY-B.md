# Item 11, shard B: basket does not drill its own LEGO. PLAN ONLY, nothing applied.

**Read this first: the shard is NOT finished.** Four courses are planned whole (229 of the shard's 544 scan rows).
Twenty courses (315 rows) are not planned; they are listed at the end. Nothing here is a half-read course.

Decisions (one per scan-named LEGO, with the reason in plain words): `decisions/<course>.py`. Plans with the
builder's answer and Popty's dry-run answer: `plans/<course>.json`. The three Arabic courses are written up in full,
with examples, in `SUMMARY-B-B1.md`; this file adds eng_for_tam and the totals.

## The counts

| Course | Scan rows | LEGOs | Already fixed | Not a defect | Proposals | Holds | Est. characters |
|---|---|---|---|---|---|---|---|
| ara_for_eng (Standard Arabic) | 118 | 31 | 0 | 0 | 24 | 7 | about 13,100 |
| eng_for_tam (English for Tamil speakers) | 81 | 49 | 0 | 0 | 42 | 7 | about 7,100 |
| ara_lb_for_eng (Lebanese) | 20 | 9 | 1 | 0 | 6 | 2 | about 900 |
| ara_eg_for_eng (Egyptian) | 10 | 7 | 2 | 0 | 4 | 1 | about 500 |
| **Planned** | **229** | **96** | **3** | **0** | **76** | **17** | **about 21,600** |

Characters are an upper bound. Individual rows that are fine (a word sitting inside the LEGO, a stand-in frame) are
kept inside their LEGO's decision rather than counted as a separate "not a defect" LEGO.

## Fix patterns for the Arabic courses
See `SUMMARY-B-B1.md`: (A) the short cut is blocked, so the basket is rebuilt around the LEGO; (B) one or two rows use
another verb form; (C) re-cut to the piece the basket drills; (D) sir/madam on every row, **one ruling wanted**;
(E) a thin basket gets its missing row.

## eng_for_tam: English is what the learner says, Tamil is the prompt

All 42 proposals reword rows; no LEGO is re-cut. Every reworded row changes BOTH sides (the English to the LEGO's
exact words, the Tamil prompt to match), so each costs a Tamil clip and two English clips.

### F. One row changes the English form of the LEGO (24 LEGOs, 29 rows)
The row asks for *he likes…*, *did you try…?*, *didn't want…* under a LEGO that taught *like…*, *tried…*, *wanted…*.
In an English course the English must be the taught form exactly. The row moves to a subject that takes the LEGO's
own form, or becomes a statement:
- Seed 120 *like to go by bus*: *he likes to go by bus* becomes *they like to go by bus | அவர்கள் பேருந்தில் செல்ல விரும்புகிறார்கள்*.
- Seed 138 *my friend wanted to meet us*: *did my friend want to meet us?* becomes *I think my friend wanted to meet us*.
- Seed 185 *left them at work*: *did I leave them at work?* becomes *I left them at work*.
A row that keeps every word of the LEGO in order with one word inside it (*I'm **very** happy so far*, *what
**exactly** are you looking for?*) is allowed by your 19 Oct ruling and stays. The builder still counts those five
rows as failing; that is the builder being stricter than the rule.

### G. The LEGO is a direct question and the rows embed it (6 LEGOs, 16 rows)
*what do you need to do* was practised as *tell me what you need to do*, *I don't know what you need to do*: different
word order, no *do*. Each becomes the direct question plus one taught word:
*what do you need to do today? | நீங்கள் இன்று என்ன செய்ய வேண்டும்?* Seeds 160, 162, 167, 169, 175, 194.
**One ruling would help:** the embedded form (*tell me what you need*) is real English the learner needs. If you
would rather teach it, it needs its own LEGO; under this LEGO it is a break.

### H. Build rows that are halves of their LEGO (8 LEGOs, 18 rows)
Seeds 262-299: the LEGO is *meeting early next week* and two builds are *a meeting* and *next week*. A phrase may be
a fragment of a sentence, never of its LEGO. Each becomes a phrase holding all of it (*a meeting early next week*,
*an important meeting early next week*).

### I. Whole-sentence LEGOs whose rows drop the first word (2 LEGOs, 6 rows)
Seeds 188 *so I don't need to change* and 189 *yes that's a good idea*: three rows each drop *so* / *yes*. Your short
cut (shrink the LEGO to what the rows drill) would need two more LEGOs in a one-LEGO seed, each with a new basket;
rewording three rows is smaller, so the LEGO stays.

## Holds

| Course | Seed | Why |
|---|---|---|
| ara_for_eng | 91, 413, 644, 645, 646, 654, 659 | Also over 8 syllables: the item-19 plan re-cuts them and re-homes their rows. Notes for that cut are in each decision. |
| eng_for_tam | 112, 125 (LEGO 3), 166 | The same: also on the item-19 list. |
| eng_for_tam | 139, 140 | **Your call: the two sides of the SEED do not match.** 139: English *I'm sorry that I need to leave so early*, Tamil *I came early, sorry*. 140: English *I'm sorry that I can't see what you're trying to show me*, Tamil *I thought I would be very late*. |
| eng_for_tam | 126 | The LEGO *changes shape* is not the seed's words (*is changing the shape of my brain*) and six rows say a third thing. The LEGO must be put right first. |
| eng_for_tam | 143 | The LEGO is spelt *its the same thing as*. Spelling and the two broken rows should be fixed in one pass. |
| ara_lb_for_eng | 90, 94 | **Your call:** seed and LEGO disagree (*كان أحلى* / *بيكون أحلى*; *الطريق* / *الطريقة*). |
| ara_eg_for_eng | 143 | Exact copy of the LEGO at seed 62: the duplicate-LEGO plan decides. |

## LEGOs kept at 7 or more syllables
ara_for_eng seeds 630 (7), 664 (8), and the sir/madam LEGOs 642 and 651 (10 and 9 with *madam*, 6 and 5 without):
reasons in `SUMMARY-B-B1.md`. eng_for_tam: no LEGO is changed, so none is newly kept; the three over-8 ones are held
for item 19. Several whole-sentence English LEGOs of 7-8 syllables stay as they are (seeds 162, 169, 188, 203).

## Seen on the way in eng_for_tam (not this family, not fixed)
- Many LEGOs carry English that is not sound or not the seed's: *don't feel as if ready* (115), *don't use your car*
  (121, the seed says *don't like to use*), *believe that your idea very good* (125).
- The LEGOs' Tamil is stored word for word in English order (*என்ன நீங்கள் வேண்டும் செய்ய*); the rows use natural Tamil.
- *வேண்டும்* is *have to* at seed 25 and *should* at seed 98.
- Nearly every basket has one or two build rows that put the LEGO inside a phrase; the builder wants three. That was
  so before this plan and is not changed by it (the Arabic baskets were topped up; these 42 were not).

## Gaps
- **Not planned (20 courses, 315 scan rows):** eng_for_sin 37 (seeds 345-668 are a hold "behind D1" in any case),
  eng_for_jpn 35, zho_for_eng 35, eng_for_ita 29, eng_for_tel 28, kor_for_eng 20, jpn_for_eng 18, eng_for_spa 17,
  eng_for_ben 17, eng_for_deu 16, eng_for_mar 14, eng_for_por 12, eng_for_fra 9, eng_for_urd 8, eng_for_guj 5,
  eng_for_pan 5, kor_for_tam 5, eng_for_kor 2, eng_for_zho 1, eng_for_ara 1. zho_for_gle (1 row) is a 5-seed draft:
  noted, not to be planned.
- **Why:** the four helper workers this shard dispatched for those courses were accepted by the surface and never
  started, twice (18 Nov, and 19 Nov as jobs 951, 953, 954, 956, which hold empty checkouts to clean up). The parent
  job had no free slot to dispatch them either.
- **Ready for whoever plans them:** every scan-named seed of those courses was re-read live on 18 Nov (`data/live/`;
  re-read with `--force` before use, the courses have moved since), and `BRIEF-SUB-B.md` holds the set-up, the helper
  tools and what these four courses taught.
- eng_for_tam: the Tamil prompts were written by this planner from the basket's own patterns and have not been read
  by a Tamil speaker. No build rows were added to its thin baskets.
- Arabic romanisation for new text is assembled word by word from the course's own rows; not read as whole lines.
