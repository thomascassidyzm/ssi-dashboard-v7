# fry_for_eng stage 2 (seeds 301–668): final record

Job #199, for Kai. Built on 4 Nov 2026, between 11:00Z and 15:10Z, under builder brief v3 (d/405cea45). Text only: no audio was rendered and no sample clips were made. Every seed in 301–668 is **draft**, ready for Auke.

## What exists now

- **Build coverage.** Seeds 301–668 are all decomposed: 368 seeds, 912 LEGOs (809 new, 103 not-new) and 9,630 phrase rows, components included. The course now has 1,645 LEGOs and 18,449 phrase rows.
- **How it was built.** The Popty build team built it: the orchestrator plus one Opus builder, the same team as stage 1. The probe covered 301–310. The main run started at 11:27Z and was restarted at 14:36Z (see below). It skipped 594–596 and then filled them itself.
- **Draft status.** The build route marks each seed `released`. Every seed was set back to `draft` through Popty edit-batch. The record files in `ops/fry-build/stage2-*.batch-and-undo.json` hold the before and after state.
- **Checks.** ZUT gives 0 collisions over the whole course. Across all of 301–668 there are:
  - no LEGO or component carrying "?";
  - no phrase whose two sides disagree on "?";
  - no lowercase "us" on the Frisian side;
  - no do/-sto;
  - no capitalised one-chunk phrases;
  - no lowercase English "i" or day names.
  - In 639–655 no basket mixes jo with dû. In 656–668 everything uses jim.
- **Audio queue.** The audio-pass request was touched in the queue. Nothing renders, because fry is human_only.
- **Probe sample.** d/bdfccdee.

## How it was reviewed

Every row was read, in blocks:

| Seeds | Reviewer | Changes made | Record |
|---|---|---|---|
| 301–310 | this job | none | d/bdfccdee |
| 311–360 | #213·AD | 30 fixes (24 restored English capitals) | d/cb12ed7a |
| 361–410 | #229·AD | 4 fixes | d/dd314c68 |
| 411–460 | #242·AD | 4 fixes | d/2d6c17fe |
| 461–668 | this job | see below | below |

From 461 on this job did the reviewing itself, because the surface caps a job at 3 child workers.

**Phrase edits in total: 43 rewords and 21 deletions.**
- **461–510:** 2 changes (event 71d5e20a).
- **Padding cleanup over 448–566:** 23 rows changed (event 13e38306): 20 deleted and 3 reworded. No basket dropped below 8 phrases.
- **561–610:** 1 fix (event 07d7d3c2): S0584 "spylje" became "spilen".

No LEGO and no seed text was edited, and no LEGO was deleted.

## Problems that recurred across many seeds, and what was done

1. **English written in lowercase** ("i", "monday", "friday"): 24 rows in 311–360. A rule now in the live grammar_rules says the English keeps its capitals. This defect is nearly gone after 360.
2. **Padding tails.** From about seed 448, the phrase door glued a recent seed's clause onto unrelated phrases. The worst were "after the meal" (46 rows), "because the children were tired" (35) and "before we stop" (27). A NO PADDING TAILS rule went live at 14:3xZ, and the build team was restarted so 567–668 were built under it. 567–668 are visibly cleaner. The 23 nonsense rows were removed from 448–566. The other 161 tail rows read as bland but sensible and were kept.
3. **LEGOs with a pronoun or shortening the seed doesn't have.** The rule went live, but it did not fully stop this; see the Kai list.

## For Kai (methodology: none of these were changed)

**LEGO re-cuts.** Each of these LEGOs uses words that aren't in its seed:
- S0519L02 "I haven't seen them yet | ik haw se noch net sjoen". The seed has *harren nije poppe*.
- S0535L04 "that he wouldn't choose it | dat er it net kieze soe". The seed has *it ferkearde wurk*.
- S0553L03 "I think it's very ugly | ik fyn it hiel ûnsjoch". The seed has *de lytse tsjerke*.
- S0573L03 "that makes it very special | dat it hiel bysûnder makket". The seed has *de fakânsje*. This one was built after the rule went live.
- S0590L02 "I saw the bus leaving | ik seach de bus fuortgean". The seed has *de lêste bus*.
- S0571L03 "that would be a good idea | dat dat in goed idee wêze soe". It drops *hiel* and overlaps L02.
- S0655L01 "that you're doing well madam | dat jo it goed dogge mefrou". It drops the seed's *hiel*.

**LEGO wording:**
- S0491L03 "that you try | wêrop'tstû besikest". The seed's English is "the way you try".
- S0569L02 "how much you are willing | hoefolle'tstû ree bist". This isn't meaningful English on its own, and its BUILD rows read "I heard how much you are willing".
- S0521L01 "I'm afraid that | ik bin benaud dat" overlaps L02 "datstû". The clitic belongs to its conjunction.
- S0545: no LEGO carries *om*. L03 "nei boppen te bringen" teaches the te-form without om, and B02/B03 use it as a bare "to X" phrase.

**From earlier blocks:**
- S0416: no LEGO teaches "next year | folgjende jier", and "next year" was already taught as *takommende jier* (S0176L01).
- S0427: there is no whole-chunk want-you-to presentation.
- S0412: the LEGO's English is not taken from the seed. Details are in d/2d6c17fe.

**"never again" (S0490L02):** because the LEGO keeps "never again" together, the English reads stiffly: "we could never again fall", "they wanted never again to fight with each other". Would a split English ("never … again") still count as containing the LEGO?

**Frisian phrases that split their LEGO.** In S0576 and S0577 some phrases split the LEGO on the Frisian side (*it wachtsjen op it nijs wie …*; *wy wachtsje al in pear oeren op it nijs*). The Frisian is natural, but the phrase no longer contains the LEGO in one piece.

**Correction to brief v3.** The brief says besykje appears only in seed 407. In fact Auke's seeds 372 (*besocht*), 491 (*besikest*) and 579 (*besocht*) have it too. Those baskets use besykje because their seeds do.

## Questions for Auke (native speaker)

Send these as one list. Nothing waits on the answers.

**Carried from brief v3, §6:**
1. Should the capital "Us" in seeds 239, 240, 454 and 462 be "Ús"?
2. "Should": *moatte* or *soe … moatte*? Stage 2 uses both, though never both in one basket:
   - *moatte (net)* in 328, 403–405, and in phrases in 504 ("wy moatte net oer it gers drave" = we shouldn't run across the grass) and in 411–460;
   - *soe … moatte* in 407, 438 and 499, and in phrases in 479 and 518 ("wat er dwaan moatte soe" = what he should do).
3. *Ik fyn X* or *ik tink dat X … is*? Seeds 303, 304, 314, 315, 317, 325, 328, 335, 339, 636, 641 and 655 say *ik tink dat*, and were built as written.
4. *Takommende*, *nije* or *folgjende* for "next"? Seed 416 says *folgjende jier*, 465 says *de folgjende kear*, and 1–300 has *takommende*.
5. *Ha* or *haw*?
6. *Tichtby* (614) or the lexicon's *tichteby*?
7. *Freon* or *freondinne* for a woman? 308 has *freondinne*. 358–360 and phrases in 305/306 have *freon*.
8. Should the jo seeds (639–655) stay strictly jo … binne? They do now.

**New from stage 2 (phrases shown in full):**

9. S0301L01U02: *hy sei juster dat se **besykje soe te helpen***. Is that word order natural, or should it be *besykje soe om te helpen*? The same line is in S0302L01U07.
10. S0307L02B03: *ik leau ik ken dy jonge man* (main-clause order after *leau*). Is that natural?
11. S0309L03U06: *ik wie noch nea earder sa senuweftich* for "I've never been so nervous before". Or *ik haw … west*?
12. S0479L01B01: *it is it minste **dat** se nedich hawwe*. Should it be *wat* or *dat* after a superlative?
13. S0503L02U05: *ik tink, dy is fan my* for "I think that one's mine". Is it natural, or should it be *ik tink dat dy fan my is*?
14. S0544L03B02/U01: *dy't by de yngong stiet hie hielendal gelyk* uses headless *dy't* for "the one who". Does that work? (In S0500L02B02 the English was adjusted instead.)
15. S0546L02B03: *de hûn is smoarch om't **er** wiet is* uses *er* for the dog. Is that natural?
16. S0562L01U01: *ik wol gewoan ús nei hûs ride*, or *ik wol ús gewoan nei hûs ride*?
17. S0638L02U02, S0648U01, S0663U01: *ik tink efkes nei oer wat se sei* puts the PP after the separable *nei*. Is that natural, or should it be *ik tink der efkes oer nei*?
18. Seed 354: *dat er net hoecht lilk te lykjen* (word order). Seed 341: *pratest*. Both are from #213, d/cb12ed7a.
19. Seeds 420/452: *net noch wat oars*. Seed 434: *oannimme* for a child. Both are from #242, d/2d6c17fe.
20. Seed text, not a defect: seeds 530, 535, 560 and 645 have no full stop. Is that intentional?

## Where it lives

- **Records:** every batch-and-undo file, every held list, the rule text and the review brief are in `ops/fry-build/` on branch `cs/199-fry-build-301-668` (Popty).
- **Course content:** all of it is live in the shared database through Popty.
- **Rules:** the live grammar_rules match `ops/fry-build/governing-brief-grammar-rules-2026-10-28.txt`.
