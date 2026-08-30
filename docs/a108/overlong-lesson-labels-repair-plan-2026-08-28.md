# The 70 over-long lesson labels: a repair plan, one decision per case

Read against live database rows on 28 August 2026. Nothing has been changed — no writes, no phrases generated, no audio. This is for approval.

## The short version

**66 cases are Option B, 4 are Option A, and none had to be ruled out for thin vocabulary.** The total spend is **4 new practice phrases and 12 new audio clips** — not the several-hundred-clip job the problem statement implies.

That is because of one thing found by reading all 70 seeds whole, and it is the thing to know before approving:

> **Option B is already built.** In 69 of the 70 seeds the smaller chunk is *already* taught before the longer one, in the right order, with a complete practice ladder for each. The rebuild that was expected to make the swap legal has already been done. What is wrong is a single field: the earlier lesson's label was written as the finished phrase instead of the chunk that lesson actually drills.

And the reason Option A is mostly the wrong answer:

> **Deleting the smaller lesson would un-teach a word in 57 of the 70 cases.** For each case I checked whether the chunk the mislabelled lesson drills appears anywhere earlier in that course. In 57 it does not — that lesson is the only place the learner ever meets the word. Dropping it to keep only the longer chunk would remove the word's sole introduction, silently.

So Option A is recommended only in the 4 cases where the smaller chunk is genuinely already known, and Option B everywhere else — delivered as a label correction rather than a rebuild.

### What it costs

| | Phrases | Clips |
|---|---|---|
| The 66 Option B cases | 2 | 6 |
| The 4 Option A cases | 2 | 6 |
| Bringing 14 silent lessons back onto the learner path | 0 | 0 |
| **Grand total** | **4** | **12** |

Only three cases need any new text at all: Arabic 144 (two sentences use a word that lesson has not introduced), Brazilian Portuguese 161 (one missing build rung), and the Welsh anthem (one rung drills the wrong form).

**One cost still to confirm at execution.** Correcting a lesson's label changes its text, which normally invalidates that lesson's own three recordings — 70 labels would be 210 clips. But in all 70 cases the corrected label is *already* that lesson's own first build rung, and every one of those rungs already has complete audio. So the lesson word should be relinkable to a recording that already exists rather than re-rendered. Whether the pipeline supports that relink is the one thing I could not settle from the data. If it does, the repair costs 12 clips. If it does not, it costs 222.

### Two groups flagged separately

**The 14 silent lessons.** In each, the lesson that correctly builds the phrase is marked not-new and never reaches the learner. All 14 are fully written and **fully recorded** — 146 phrases, every one with all three clips present. Switching them on costs nothing and is the best-value item here. It does not change any A-or-B recommendation, but it does change what the repair achieves: in these 14, fixing the label alone would leave the phrase still undelivered. Two corrections to the earlier case log: Korean 636's chunk *had* been introduced earlier, from seed 114; and German 634's apparent earlier introduction was a false match inside another word, so it genuinely had none.

**The 4 duplicated labels.** French 395 and 408, Arabic 419 and English-for-Korean 61 carry the same label on two lessons in one seed. This does change the recommendation: in each, the *later* lesson already holds the long label correctly with its own ladder, so there is nothing to merge or reorder and Option A would damage a seed that is otherwise right. All four are label corrections on the earlier lesson. English-for-Korean 61 is the odd one out and is not a chunk-length problem at all — lesson 2 is labelled "again" but drills "could you".

### Cases worth a second look before this runs

- **Korean 450.** The chunk `직접` appears nowhere earlier in the course — no lesson, no practice sentence — and the lesson that would absorb it has no scaffolding. This is the one case where the cheap fix is the risky fix.
- **German 524.** The label `rufe dich` never appears as a standalone chunk anywhere; the course only ever builds `rufe dich zurück`. Either the label is simply wrong, or a rung is missing. I could not choose between those readings honestly.
- **Spanish (Mexico) 211.** Not a length problem: the label says `nos dijeron` (they told us) while every sentence says `nos dijo` (he told us). A wrong-person label.
- **Spanish (Spain) 230 and 378.** The long label's meaning is well drilled but never appears cleanly — 230's is always extended with a relative clause, 378's is always negated. Accept the embedded evidence, or add one clean sentence each.
- **Korean 647, lesson 2.** Has no practice phrases at all — never built. Outside this repair, but real.

## Option A — teach the bigger chunk only (4 cases)

The smaller chunk is already known, so the separate lesson for it is redundant and the seed collapses to one lesson carrying the longer chunk.


### German

| Seed | Position | Label now | Should be | Why | Phrases | Clips |
|---|---|---|---|---|---|---|
| 475 | 475 of 668 (71%) | lesson 1: `viele Gruende` | `viele` | viele was already taught as its own lesson at seed 109, so this lesson re-teaches a known word | 0 | 0 |

### Italian

| Seed | Position | Label now | Should be | Why | Phrases | Clips |
|---|---|---|---|---|---|---|
| 308 | 308 of 668 (46%) | lesson 1: `un'amica di mia madre` **·silent** | `un'amica` | un'amica was taught at seed 136 and mia madre at seed 181, so the smaller chunk is already known | 0 | 0 |

### Portuguese

| Seed | Position | Label now | Should be | Why | Phrases | Clips |
|---|---|---|---|---|---|---|
| 408 | 408 of 668 (61%) | lesson 2: `essa e a melhor maneira` | `essa` | melhor (seed 29) and maneira (seed 94) are both long established, so no scaffolding step is needed | 0 | 0 |

### Welsh anthem (for Japanese)

| Seed | Position | Label now | Should be | Why | Phrases | Clips |
|---|---|---|---|---|---|---|
| 1 | 1 of 7 (14%) | lesson 2: `beirdd` | `bardd` | a 7-seed anthem course with no companion lesson to reorder — the fix is in place; its single build rung drills the singular bardd under a plural beirdd label — that rung must be rewritten | 1 | 3 |

## Option B — smaller chunk first, then bigger (66 cases)

The seed already runs in this order with both ladders built. The repair is to correct the earlier lesson's label to the chunk it actually drills; both lessons stay, and no phrases are rebuilt except where noted.


### Arabic

| Seed | Position | Label now | Should be | Why | Phrases | Clips |
|---|---|---|---|---|---|---|
| 144 | 144 of 668 (22%) | lesson 2: `أَبْكَرَ مِمّا` | `اسْتَيْقَظْتُ أَبْكَرَ` | this lesson is the only place اسْتَيْقَظْتُ أَبْكَرَ is ever introduced, so deleting it would un-teach the word; two of its practice sentences use مِمّا, a word this lesson has not introduced — they need replacing | 2 | 6 |
| 152 | 152 of 668 (23%) | lesson 3: `لَوْ عَرَفْتُ` | `لَوْ كانَ ذٰلِك جَيِّداً` | this lesson is the only place لَوْ كانَ ذٰلِك جَيِّداً is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 403 | 403 of 668 (60%) | lesson 1: `نَبْقى هادِئينَ` | `هادِئينَ` | this lesson is the only place هادِئينَ is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 407 | 407 of 668 (61%) | lesson 2: `أَنْ نَكونَ قُدْوَةً حَسَنَةً` **·silent** | `نَكونُ` | this lesson is the only place نَكونُ is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 419 | 419 of 668 (63%) | lesson 1: `إِذا أَرادوا` **·duplicate** | `أَرادوا أَنْ` | this lesson is the only place أَرادوا أَنْ is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 451 | 451 of 668 (68%) | lesson 1: `ما أَرادوا` | `ما` | the seed already runs short chunk then long chunk in the right order; only the label is wrong | 0 | 0 |
| 630 | 630 of 668 (94%) | lesson 1: `يُمْكِنُني الحُصولُ` | `يُمْكِنُني` | the seed already runs short chunk then long chunk in the right order; only the label is wrong | 0 | 0 |

### Arabic (Lebanese)

| Seed | Position | Label now | Should be | Why | Phrases | Clips |
|---|---|---|---|---|---|---|
| 123 | 123 of 668 (18%) | lesson 1: `هيدي فكرة` **·silent** | `هيدي` | this lesson is the only place هيدي is ever introduced, so deleting it would un-teach the word | 0 | 0 |

### Chinese

| Seed | Position | Label now | Should be | Why | Phrases | Clips |
|---|---|---|---|---|---|---|
| 10 | 10 of 668 (1%) | lesson 4: `记住整个句子` | `记住怎么说` | this lesson is the only place 记住怎么说 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 198 | 198 of 668 (30%) | lesson 1: `市政府` **·silent** | `市` | this lesson is the only place 市 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 407 | 407 of 668 (61%) | lesson 1: `试着树立` | `试着` | this lesson is the only place 试着 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 426 | 426 of 668 (64%) | lesson 1: `彼此相爱` | `彼此` | this lesson is the only place 彼此 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 502 | 502 of 668 (75%) | lesson 1: `差点迷路` | `差点` | this lesson is the only place 差点 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 551 | 551 of 668 (82%) | lesson 1: `那座教堂` **·silent** | `那座` | this lesson is the only place 那座 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 556 | 556 of 668 (83%) | lesson 2: `放音乐` | `放` | the seed already runs short chunk then long chunk in the right order; only the label is wrong | 0 | 0 |

### English (for Korean)

| Seed | Position | Label now | Should be | Why | Phrases | Clips |
|---|---|---|---|---|---|---|
| 61 | 61 of 300 (20%) | lesson 2: `again` **·duplicate** | `could you` | this lesson is the only place could you is ever introduced, so deleting it would un-teach the word | 0 | 0 |

### French

| Seed | Position | Label now | Should be | Why | Phrases | Clips |
|---|---|---|---|---|---|---|
| 395 | 395 of 668 (59%) | lesson 4: `au prochain coin` **·duplicate** | `prochain` | the seed already runs short chunk then long chunk in the right order; only the label is wrong | 0 | 0 |
| 408 | 408 of 668 (61%) | lesson 4: `une famille heureuse` **·duplicate** | `heureuse` | this lesson is the only place heureuse is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 486 | 486 of 668 (73%) | lesson 1: `sont beaux` | `beaux` | this lesson is the only place beaux is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 513 | 513 of 668 (77%) | lesson 1: `je bouge ma tete` | `bouger` | this lesson is the only place bouger is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 600 | 600 of 668 (90%) | lesson 3: `a quel point tu etais fatigue` **·silent** | `à quel point` | this lesson is the only place à quel point is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 637 | 637 of 668 (95%) | lesson 1: `son sac` | `son` | the seed already runs short chunk then long chunk in the right order; only the label is wrong | 0 | 0 |

### German

| Seed | Position | Label now | Should be | Why | Phrases | Clips |
|---|---|---|---|---|---|---|
| 377 | 377 of 668 (56%) | lesson 2: `irgendwohin auf der Welt` | `irgendwohin` | this lesson is the only place irgendwohin is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 407 | 407 of 668 (61%) | lesson 2: `ein gutes Beispiel` | `gutes` | this lesson is the only place gutes is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 423 | 423 of 668 (63%) | lesson 1: `so eine offensichtliche Frage` | `so eine` | this lesson is the only place so eine is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 433 | 433 of 668 (65%) | lesson 2: `wann der Film anfing` | `wann` | this lesson is the only place wann is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 445 | 445 of 668 (67%) | lesson 1: `diesen Koffer` | `diesen` | the seed already runs short chunk then long chunk in the right order; only the label is wrong | 0 | 0 |
| 457 | 457 of 668 (68%) | lesson 4: `der verschiedenen Bereiche` | `verschiedenen` | this lesson is the only place verschiedenen is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 463 | 463 of 668 (69%) | lesson 1: `meine Zimmernummer` | `meine` | this lesson is the only place meine is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 478 | 478 of 668 (72%) | lesson 2: `so ein gutes Herz` | `so ein` | this lesson is the only place so ein is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 514 | 514 of 668 (77%) | lesson 1: `das perfekte Haus` | `perfekte` | this lesson is the only place perfekte is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 524 | 524 of 668 (78%) | lesson 1: `rufe dich` | `dich` | the seed already runs short chunk then long chunk in the right order; only the label is wrong | 0 | 0 |
| 537 | 537 of 668 (80%) | lesson 1: `ich hatte unrecht` **·silent** | `ich hatte` | this lesson is the only place ich hatte is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 564 | 564 of 668 (84%) | lesson 1: `deine Hilfe` | `deine` | the seed already runs short chunk then long chunk in the right order; only the label is wrong | 0 | 0 |
| 566 | 566 of 668 (85%) | lesson 2: `meine Wahl` | `meine` | the seed already runs short chunk then long chunk in the right order; only the label is wrong | 0 | 0 |
| 634 | 634 of 668 (95%) | lesson 2: `eines von denen` **·silent** | `eines` | this lesson is the only place eines is ever introduced, so deleting it would un-teach the word | 0 | 0 |

### Italian

| Seed | Position | Label now | Should be | Why | Phrases | Clips |
|---|---|---|---|---|---|---|
| 98 | 98 of 668 (15%) | lesson 3: `suonare qualcos'altro` | `suonare` | this lesson is the only place suonare is ever introduced, so deleting it would un-teach the word | 0 | 0 |

### Korean

| Seed | Position | Label now | Should be | Why | Phrases | Clips |
|---|---|---|---|---|---|---|
| 345 | 345 of 668 (52%) | lesson 1: `떠날 준비` | `떠날` | this lesson is the only place 떠날 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 378 | 378 of 668 (57%) | lesson 1: `휴가 갈` | `갈` | this lesson is the only place 갈 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 450 | 450 of 668 (67%) | lesson 1: `기차를 직접 타야` | `직접` | this lesson is the only place 직접 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 454 | 454 of 668 (68%) | lesson 1: `놀러 왔어요` **·silent** | `놀러` | this lesson is the only place 놀러 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 486 | 486 of 668 (73%) | lesson 1: `눈이 아름다운` | `눈이` | this lesson is the only place 눈이 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 521 | 521 of 668 (78%) | lesson 1: `잊어버릴까 봐` | `봐` | this lesson is the only place 봐 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 526 | 526 of 668 (79%) | lesson 1: `못 맞추겠다는` | `못` | this lesson is the only place 못 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 577 | 577 of 668 (86%) | lesson 2: `소식을 기다리고` | `소식을` | this lesson is the only place 소식을 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 596 | 596 of 668 (89%) | lesson 2: `눈을 감아야` **·silent** | `눈을` | this lesson is the only place 눈을 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 609 | 609 of 668 (91%) | lesson 1: `물어보는 거였을 거예요` | `물어보는` | this lesson is the only place 물어보는 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 615 | 615 of 668 (92%) | lesson 3: `아주 용감하다고 생각했어요` | `아주 용감하다고` | this lesson is the only place 아주 용감하다고 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 630 | 630 of 668 (94%) | lesson 1: `마실 걸` | `마실` | this lesson is the only place 마실 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 636 | 636 of 668 (95%) | lesson 2: `제인의 가방인 것 같아요` **·silent** | `제인의 가방인` | this lesson is the only place 제인의 가방인 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 641 | 641 of 668 (96%) | lesson 1: `저 의자` | `저` | the seed already runs short chunk then long chunk in the right order; only the label is wrong | 0 | 0 |
| 643 | 643 of 668 (96%) | lesson 1: `선생님 원하세요` **·silent** | `선생님` | this lesson is the only place 선생님 is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 647 | 647 of 668 (97%) | lesson 1: `여사님 그거 말하세요` **·silent** | `여사님` | the seed already runs short chunk then long chunk in the right order; only the label is wrong | 0 | 0 |

### Portuguese

| Seed | Position | Label now | Should be | Why | Phrases | Clips |
|---|---|---|---|---|---|---|
| 79 | 79 of 668 (12%) | lesson 1: `quando e que comecaste` | `quando é que` | this lesson is the only place quando é que is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 182 | 182 of 668 (27%) | lesson 2: `as minhas chaves` | `as minhas` | this lesson is the only place as minhas is ever introduced, so deleting it would un-teach the word | 0 | 0 |

### Portuguese (Brazil)

| Seed | Position | Label now | Should be | Why | Phrases | Clips |
|---|---|---|---|---|---|---|
| 161 | 161 of 668 (24%) | lesson 1: `me dar esse livro` | `esse livro` | this lesson is the only place esse livro is ever introduced, so deleting it would un-teach the word; no rung anywhere builds "me dar esse livro" unwrapped — one new build phrase closes it | 1 | 3 |

### Spanish (Mexico)

| Seed | Position | Label now | Should be | Why | Phrases | Clips |
|---|---|---|---|---|---|---|
| 101 | 101 of 668 (15%) | lesson 3: `este idioma` | `este es diferente` | this lesson is the only place este es diferente is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 106 | 106 of 668 (16%) | lesson 1: `sentirnos contentos` **·silent** | `sentirnos bien` | this lesson is the only place sentirnos bien is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 128 | 128 of 668 (19%) | lesson 1: `eres como` | `eres` | this lesson is the only place eres is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 133 | 133 of 668 (20%) | lesson 2: `conocer a alguien` | `conocer` | the seed already runs short chunk then long chunk in the right order; only the label is wrong | 0 | 0 |
| 149 | 149 of 668 (22%) | lesson 1: `asi que espero` | `así que` | this lesson is the only place así que is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 161 | 161 of 668 (24%) | lesson 1: `ese libro` | `no ese` | this lesson is the only place no ese is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 211 | 211 of 668 (32%) | lesson 1: `nos dijeron` | `nos dijo` | this lesson is the only place nos dijo is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 217 | 217 of 668 (32%) | lesson 1: `tome un vaso` | `lo tomé` | this lesson is the only place lo tomé is ever introduced, so deleting it would un-teach the word | 0 | 0 |

### Spanish (Spain)

| Seed | Position | Label now | Should be | Why | Phrases | Clips |
|---|---|---|---|---|---|---|
| 230 | 230 of 668 (34%) | lesson 1: `conozco a un hombre` | `conozco` | this lesson is the only place conozco is ever introduced, so deleting it would un-teach the word | 0 | 0 |
| 378 | 378 of 668 (57%) | lesson 1: `suficiente dinero` | `suficiente` | this lesson is the only place suficiente is ever introduced, so deleting it would un-teach the word | 0 | 0 |

## How this was established

The case list came from the earlier log; every row was then re-read against live `course_legos` and `course_practice_phrases`. Three checks were run over all 70 cases rather than sampled: whether the long label already exists in a sibling lesson's ladder (it does in every one — exactly in 52, embedded in a longer rung in 18); whether the correct lesson sits before or after the mislabelled one (after, in 69 of 70); and whether the chunk the mislabelled lesson drills was introduced earlier in the course (not in 57 of 70). Per-language judgement on each case was done by eight parallel readers, one per language, and their vocabulary and ladder claims were spot-checked against rows here.

Two things I am not passing on as verified. The Korean reader's suggested replacement sentences were not usable Korean, so Korean's Option B viability rests on the ladders that already exist rather than on new sketches — which is sufficient, since no Korean case needs new text. And no reader measured Option A's true cost by building one; the A columns reflect what the live rows show, not a trial.