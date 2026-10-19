# fin_for_eng: 441 proofread findings reworded with taught forms only (proposals)

**Nothing has been written to the course.** Each item below is a proposal for Kai to accept, reject or reword.

Kai's ruling of 19 October: the #164·T findings are right, but its fixes are wrong, because the correct form usually hasn't been taught yet. So every row is **reworded** using only word forms that are already available at its point in the course: the exact inflected form, not just the same word. No new variations are introduced.

## The review pages (accept / reject / own wording, per item)

Each item shows: *seed N | English | current Finnish | the problem*, then the proposed rewrite as *English | Finnish*, then a note. The note gives the row id, what changed and why, and any open question or overlap with another item.

| # | what | items | page |
|---|---|---|---|
| 1 | phrase rows, high confidence, seeds 106–180 | 37 | https://watson-1.tail4968cb.ts.net/d/9ad16688 |
| 2 | phrase rows, high, seeds 181–225 | 37 | https://watson-1.tail4968cb.ts.net/d/1ad2482c |
| 3 | phrase rows, high, seeds 225–319 | 37 | https://watson-1.tail4968cb.ts.net/d/a90d125d |
| 4 | phrase rows, high, seeds 320–351 | 37 | https://watson-1.tail4968cb.ts.net/d/3db43ebd |
| 5 | phrase rows, high, seeds 356–415 | 37 | https://watson-1.tail4968cb.ts.net/d/444fddb8 |
| 6 | phrase rows, high, seeds 417–485 | 37 | https://watson-1.tail4968cb.ts.net/d/c2cc72a9 |
| 7 | phrase rows, high, seeds 486–523 | 37 | https://watson-1.tail4968cb.ts.net/d/9eba25b2 |
| 8 | phrase rows, high, seeds 525–572 | 37 | https://watson-1.tail4968cb.ts.net/d/d1b856e2 |
| 9 | phrase rows, high, seeds 577–660 | 37 | https://watson-1.tail4968cb.ts.net/d/5fab02a0 |
| 10 | phrase rows, medium/low confidence | 42 | https://watson-1.tail4968cb.ts.net/d/24e62f85 |
| 11 | seed sentences + LEGOs, high confidence | 36 | https://watson-1.tail4968cb.ts.net/d/73b02bad |
| 12 | seed sentences + LEGOs, medium/low confidence | 30 | https://watson-1.tail4968cb.ts.net/d/798da075 |

## What the 441 came to

- **380 phrase rewordings**, plus **1 row moved under another LEGO** (F373: "it's a good thing that we're friends", under S0110L01).
- **34 seed-sentence changes and 21 LEGO changes.** Each lists every row that has to change with it, under "ALSO CHANGES" on the page. Three of those rows are deleted (S0300L02U06, S0379L02U06, S0379L03U05).
- **5 left unchanged**, because the row is fine as it stands or the form the proofread wanted is untaught: F378 (*kaverillensa*), F274 (*uuden lähestymistavan*), F369 (seed 124, *mun mielestä* + past), F421 (S0523L02), F436 (seed 622, colloquial singular *oli rikkonut*).
- If everything were accepted: **725 row edits**, touching 42 seed sentences and 28 LEGOs.

### Seeds and LEGOs that introduce a new form
Kai's rule is that a seed defines what is taught, so these introduce a form only because no available form reads naturally:
*syy* (seed 127), *muutaman minuutin* (S0155L02), *tapahtuisi* (seed 201), *syötävää* (S0243L02), *oven* (seed 336), *päin maailmaa* (seed 377), *pääsin* (seed 379), *seuraavasta kulmasta* (S0395L03), *nousta seisomaan* (seed 396), *pudota* (seed 413 / S0413L02), *eikä oikealle* (S0502L03).

### Seeds whose English meaning changes
F023 (seed 200), F188 (187), F191 (188), F207 (238, "yesterday" becomes "tomorrow"), F214 (277, drops "early"), F215 (278), F218 (295), F227 (326), F080 (379), F397 (396), F401 (404), F406 (436), F431 (608), F353 (609). Each is marked "THE SEED'S ENGLISH CHANGES" on its page.

## How each rewrite was checked

The check is a tool that indexes **which exact Finnish forms are taught at each point of the course**, built from live Popty data (GET /api/production/fin_for_eng/seeds). A form counts as available once a LEGO or seed sentence has taught it; for a row under LEGO k, that means LEGOs 1..k of its own seed and anything earlier. A form that only appeared in an earlier practice phrase, or only in a LEGO's components list, does not count.

**Calibration.** The tool gets the known cases right: *totuuden*, *innoissas* and *iltapäivän* come out untaught, and *puhutaan* only from seed 158. Of the 66,042 Finnish words in the course's existing rows, only 46 use a form not yet taught; they are real early uses such as *rakentaa uuden elämän* and *viettää*. So the index matches what the course actually teaches.

Every rewrite then had to pass four checks:
- every Finnish word is a form taught at that row;
- the row's own LEGO is still whole on both sides;
- no other row in the whole course has the same English or the same Finnish;
- no ZUT clash, i.e. its English doesn't already lead to a different Finnish.

The seven workers each read every row of their batch in full.

**The whole set was then checked together.** I applied every proposed edit to an in-memory copy of the course and re-judged each one there. This matters because a seed change and the rows that mirror it only pass together, and one change can stop teaching a form another row relies on. The combined check found:

- **Ten later rows another batch's change would have broken**, which I reworded at merge:
  - 5 *minuuttia* rows at seeds 586–598 become *sanaa* (words), because S0155L02 becomes *muutaman minuutin*.
  - 3 *oikean polun* rows at seed 559 become *uuden polun*, because S0502L03 drops *oikean sijaan*.
  - F033 becomes *se olisi täällä, jos se pystyisi*, because seed 201 drops *tulisi*.
  - 1 worker had filed a LEGO edit under a row's id (F176).
- **ZUT across the whole course goes from 240 English prompts with more than one Finnish answer to 237**, with two new clashes: "late" (see F322 below) and "to seem", the latter against a component row only.

## Open decisions (Kai, or Tom's go)
1. **F158, seed 127, *syy*.** No LEGO teaches *syy*, and the seed sentence can only carry it if one does. That needs a new LEGO, e.g. "that isn't the reason why | se ei oo se syy, miksi". Adding a LEGO is a structural edit and needs Tom's go on a released course.
2. **F260 + F352, *silti*.** F260 takes *silti* out of S0410L02, where "still" means "continuing", which is the wrong sense. That leaves seed 593, where *silti* is right, with nothing teaching it. Options: add a "still | silti" LEGO to seed 593 (structural, needs Tom's go), or refuse F260.
3. **F322, seed 558.** Re-glossing S0558L01 as "late | myöhä" clashes with S0556L03 "late | myöhään". It needs a different English, e.g. "it's late | on myöhä".
4. **Component rows to re-cut** when their LEGO changes: S0201L01 C01/C02, S0243L01 C02, S0502L03 C01/C02, S0526L02 C03.
5. **Overlaps.** 18 phrase items (F192, F240, F067–F070, F075, F269, F109, F131, F310, F323, F343, F349, F335–F338) are rows that a seed/LEGO change also rewrites. Each page says which version wins if that change is accepted. The item's own version is for when the change is refused, and was checked against the course as it is now.
6. Raised by workers, not resolved:
   - "lose" is taught as both *hävitä* and *menettää* (F299/F300).
   - The "such a | sellainen" LEGO gloss (F334–F338).
   - Same-pattern rows outside the 441 that nobody was asked to fix: S0106L02B05, S0117L01U07, S0196L01B03, S0481L01B03, S0537L02B02, S0523L01 U01/U02/U04, S0622L01U05 (*asuu* for "lived"), S0390L02 U03/U04, S0387L01 U03/U05.

## Gaps
- **No native speaker has read these.** Naturalness and whether the meanings match were judged by the workers and by me, not by a fluent Finnish speaker. The machine checks forms, LEGO, duplicates and ZUT, not whether a sentence reads naturally.
- **The English side was not run through the course's known-side gate**, which checks that the English uses only words the learner has been given. Rewrites prefer English the course already uses, but that is not verified.
- **Nothing is applied and no audio is queued.** Applying means a Popty edit-batch. A fresh course dump has to be re-checked with `world` first, because the course may have moved since 19 October. Seeds unapprove when edited, and every changed row needs new audio.
- **Some proposals change a seed's meaning** (listed above). That is Kai's call, item by item.
