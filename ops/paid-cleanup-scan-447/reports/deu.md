# German slice: cleanup scan findings (#447, worker #468)

Courses: **deu_for_eng** (main), **deu_at_for_eng** (Austrian) and **deu_ch_for_eng** (Swiss, an unreleased draft). Read live through Popty on 17 Nov 2026 (dumps from 14:06Z). **Nothing was applied, rendered or linked.**
Row-level list: `reports/deu.json` (1,228 rows). German patterns: `reports/deu.patterns.json`. Checks used: `reports/deu-checks/`.

**Read this first.** deu_at and deu_ch are **dialect courses**, not copies of the main course (`i woaß no ned`, `ich weiss no nöd`). They share most English seeds with main (639 and 624 of about 660), but only about a quarter of their practice rows share English with main, and almost none share German. So "a main fix still missing in a variant" here means **the same rule broken again in the dialect**, not the same row. Dialect forms are right in their own course and are not listed. For example, Austrian teaches `there | dort`, so `dort` is fine there. Swiss German has no simple past, so the könnte/konnte rule (K45) has nothing to check.

Audio characters = new known text × 1 + new target text × 2 voices, counted only on the side that changes. A delete, a flag flip, a question mark or a P26 seed copy costs 0. Estimates are ±15%.

---

## PRIORITY: rules fixed in deu_for_eng and still broken in the variants

| # | rule main fixed | where main fixed it | variant now | REAL |
|---|---|---|---|---|
| 1 | A formal LEGO carries sir/madam on both sides (K32) | seeds 639–654 | **AT**: 12 formal LEGOs drop it (`could you say that \| könnten Sie das sagen`). That creates a clash: `what do you need \| was brauchen Sie` vs `wos brauchst du` (S0170L02U02). **CH**: no target honorific anywhere, and 10 LEGOs are a bare verb (`feel madam \| fühled`, `do you want, sir \| wänd`) | AT 12 LEGOs, CH 10 LEGOs |
| 2 | want = will, I'd like = möchte | #435 (280 "mismatch" rows), Kai's standing deu rule | **AT**: seeds 643 and 650 `do you want … \| Möchten Sie …` (main now says `wollen Sie`); seed 383 `he wanted \| er mechat`; 5 rows `I would like \| i wü …` | AT 13 |
| 3 | A verb LEGO carries its pronoun (14 Oct precedent) | main S0096/S0094 shape | **CH** `they understand \| verstönd`, `they help \| hälfed`. The Swiss ending is also "we" and "you all", and the rows then say `si verstönd` | CH 2 |
| 4 | Verb-final LEGOs carry their subordinator (K48) | seed 118 | **CH** `they visited us \| si öis bsuecht händ` (seed: `wo si öis…`); `I don't care \| s mir egal wär` (seed: `as ob s mir egal wär`), which also clashes with S0048L01 `I don't care \| es isch mir egal` | CH 2 |
| 5 | Every seed sentence sits in a played basket (P26) | #418 | **AT** 118 seeds unplayed (56 have no near copy at all, mostly seeds 3–45). **CH** 58 | AT 118, CH 58 (0 chars) |
| 6 | Duplicate debut → not-new (L17) | #512 | **CH** S0317L02 `I think, \| ich dänke,` and S0317L03 `she could, \| si chönt,` re-debut earlier pairs | CH 2 |
| 7 | Seed 264 "an old man" (main: held) | #422 item 5 | **AT** S0264L01 `an elderly man \| a oida Mann` against seed `an old man` | AT 1 |
| 8 | Inverted seed "also hoffe ich" (main: held) | #422 item 8 | **CH** S0149L02 `I hope \| hoff` clashes with S0668L01 `I hope \| ich hoff` | CH 1 |
| 9 | yet: not yet = noch nicht (K46) | #494 | **CH** S0534L01B03 `let's not go yet \| gömmer nöd scho` (says "already") → `gömmer no nöd` | CH 1 |
| 10 | Question "when" = wänn (#719 fixed seed 255) | #719 | **CH** seed 252 row S0252L02U01 still `wenn bisch parat…` | CH 1 |
| 11 | könnte/konnte (K45), dort, fernsehen, klingt nach | #489, #435 | Not applicable: no hits in either dialect | 0 |

---

## deu_for_eng (main)

### 1. #435 fixes that never reached the live course: 8 rows (REAL)
The #435 fix record lists these rows as fixed, but the live text is still the old text. Thirteen of 498 fixes did not land. Five of those 13 are fine as they are now (`gehen`/`fahren`, `sagte`), so only 8 are listed.
- S0064L01U07 `I want learning German` → `I want to learn German`
- S0056L02U13 `I feel myself much better…` → `I feel much better…` (also B06 `I feel better myself`)
- S0033L02U01 `How long have you already been learning German…` → drop "already"
- S0141L02U05 `…if it is in order to wait here` → `…if it is okay to wait here`
- S0424L03U03/U06 `ich dachte, dass wir … nicht verschwenden müssen` → `…mussten` (past frame). #435 proposed `durften`, but "didn't have to" is `nicht müssen`.

**Fix:** as above. **Canon:** K9, K50. **Chars:** ~480.

### 2. Baskets that do not drill their LEGO: 39 new LEGOs, 302 rows (REAL), plus 21 KNOWN
In each of these baskets, half or more of the rows do not contain the LEGO. The rows climb up from bare pieces instead (`had \| hatten`, `we had that there`) or drill a different form. Most are LEGOs that were grown later (K48, K32), and the basket was never rebuilt. #435's held list (d/ca698dea) already names 21 of them (388, 524, 554, 616…). The 39 below are new.
- S0521L05 `why we needed to stay here \| warum wir hier bleiben mussten`: 9 of 10 rows miss it (B01 `had to \| mussten`)
- S0569L04 `willing to pay \| bereit bist zu zahlen`: 9 of 10 (B01 `to pay \| zahlen`)
- S0263L01 `who you mean \| wen du meinst`: 6 of 7 (B01 `Who did you see? \| Wen hast du gesehen`)
- The formal and plural block, S0643–S0666 (`are you ready sir?` → B03 `I also asked if they are here \| ob sie hier sind`). Rows drill `sie`/they under a `Sie`/sir LEGO, and never end with sir/madam (K32).
- Full list: 091L01, 103L01, 110L02, 171L02, 232L02, 263L01, 409L03, 440L02, 463L01, 465L02, 472L02, 501L05, 504L01, 510L02, 515L03, 521L05, 527L04, 528L02, 553L03, 562L01, 569L04, 573L03, 581L01, 582L01, 587L04, 599L02, 605L01, 630L01, 643L01, 644L01, 647L01, 649L01, 651L01, 658L01, 659L01, 660L01, 662L01, 664L01, 666L01.

**Excluded as not a defect:** 11 split separable verbs (ausmachen, kennenlernen, fernsehen, vorhaben, zurückrufen…). K49 allows the split. **Fix:** rebuild each failing row so it contains the whole LEGO, each in a different outer sentence (O12, as seed 118 was done). Formal LEGOs keep their cut form plus sir/madam at the end on both sides. **Canon:** P17, K32, O12, L31. **Read:** all 60 LEGOs at basket level, with 3 failing rows each; the 471 rows were counted, not each read. **Chars:** ~22,600 (rewrites at current row length).

### 3. `dort` is never taught: 74 rows (REAL), plus 11 KNOWN
The course teaches `there \| da` (S0157L02, S0456). `dort` is in no LEGO and no seed, yet 85 rows use it from seed 300 on. So "there" has two answers, and the learner was never given the second.
- S0614L03U07 `your family was also there \| deine Familie war auch dort`
- S0454L04B03 `they were there at about six \| sie waren gegen sechs dort`
- S0612L02U08 `we probably would have bought a house there \| …dort ein Haus gekauft`

**Fix:** `dort` → `da`. **Confidence:** sure. **Canon:** P1, K8, K14. **Chars:** ~4,400.

### 4. "want" over `möchte`: 33 rows (REAL), plus 6 KNOWN
These are siblings of #435's biggest family. #435 fixed about 280 rows; these remain.
- S0182L01B03 `I want to look anywhere \| Ich möchte irgendwo suchen`
- S0202L01U04 `Nobody wants to work in an office… \| Niemand möchte…`
- S0594L01U05 `she wants to see my toys \| sie möchte meine Spielzeuge sehen`

**Fix:** English → "would like" (as #435 did). **Canon:** K2, K22. **Chars:** ~1,660.

### 5. `fand, dass` for "thought" meaning believed: 6 rows (REAL, likely)
Siblings of #435's de-wrong-verb fixes (S0376–S0383). `finden` gives an opinion; a belief is `denken`.
- S0378L02U05 `she thought it was not enough money \| sie fand, dass…` → `sie dachte, dass…`
- Also S0379L01U04, S0380L01U05, S0381L02U05, S0383L02U06, S0384L01U04.

**Not a defect:** 7 rows of the form `fand es + adjective` (`Ich fand das Buch ziemlich gut`). Seed 374 is KNOWN. **Source:** Duden *finden* 6 vs *denken*. **Chars:** ~590.

### 6. Smaller main-course families (REAL)
- **`mögen wollten`** for "would like them": S0419L01U03/U04/U06 → `mögen würden`. Sure. ~270 chars.
- **`gnädige Frau` used as a description:** S0642L01 `gracious \| gnädige`, with rows like `she is a dear lady \| sie ist eine gnädige Frau`. `Gnädige Frau` is only a form of address (Duden *gnädig*). LEGO → `madam \| gnädige Frau`; the rows address someone (`…, gnädige Frau`). Likely. ~490 chars.
- **Not-new but never taught (L31):** S0068L01 `wonach`, S0089L01 `in kurzer Zeit`, S0106L02 `nur`, S0207L01 `musstest`, S0257L01 `blaue`. No earlier LEGO teaches them, and no earlier seed or row has them. Make each NEW with an intro and a basket. ~1,350 chars. S0098L03 and S0123L01 are KNOWN; the 14 others are fine, because the word is taught inside a chunk (K29).
- **Duplicate debut:** S0569L02 `much \| viel` re-debuts S0437L01. Flip it to not-new and move its rows (P25). 0 chars. The other 16 dup-debuts are KNOWN (d/76f2a86d).
- **ZUT (LEGO level):** `blue \| blaue` (S0257L01) vs `blauen` (S0459L02) → grow 459L02 to `in front of the blue sign \| vor dem blauen Schild`. `to have \| zu haben` (S0408L03, which is also not-new with no earlier pair) vs `haben` (S0414L04) → `to have a happy family \| eine glückliche Familie zu haben`, NEW. Both likely. ~90 chars.
- **ZUT (phrase level), only where a LEGO is one side:** S0639L01U01 `with you \| mit Ihnen` vs S0001L05 `with you \| mit dir` → `with you, sir`. Phrase-against-phrase clashes (dein/deine Freund, Zahl/Anzahl, es/das) are reported per Kai's 21 Oct rule: not blockers. 15 read; none listed.
- **LEGO not in its seed:** S0002L03 `to learn German \| Deutsch zu lernen` (the seed has no "German"). Cut to `to learn \| zu lernen`. Excluded: separable-verb LEGOs (K49 analogue), adjective endings (K8), and K54 infinitives. 151, 231, 270 and 522 are KNOWN.
- **Reflexive dropped:** S0513L03B01 `I move \| ich bewege` → `ich bewege mich`. Sure.
- **Seed not played (P26):** 14 seeds (222, 223, 254, 255, 316, 317, 330, 337, 348, 351, 375, 376, 461, 525). Each has a near copy whose English drifted (`he is` vs the seed's `he's`). Add the seed itself, reusing its clips. 0 chars. 278 is KNOWN.
- **Duplicate rows:** 66 (54 USE = BUILD, 19 BUILD = BUILD). Delete; 0 chars. 7 are KNOWN.
- **Question mark on one side only:** 269, almost all a German question without `?` (`Sprichst du`). A text-only fix; clips unchanged.
- **LEGOs over 8 syllables:** the tool flagged 87; a hand-rule recount gives **38**. Most are whole-sentence LEGOs in seeds 65–80 and 202–296 (S0069L01 `er wollte den ganzen Nachmittag nicht auf den jungen Hund aufpassen`, 18). The recommended cut is the seed's new piece only, since the rest is taught earlier. Not costed per LEGO.

### Read but not counted (GAP for the main course)
- `untaught_target` (249): `dort` (85) is family 3. `aus` (27) is a split-verb artefact, not a defect. `schauen` (22, never taught; S0313/S0388 KNOWN) is real by the same test as `dort`, but its fix (`sehen`) was not read row by row. The remaining ~115 were **not read**.
- `lego_not_in_seed_known` (208; 185 after the K54/K28/L33/article exceptions): an 8-row sample shows literal glosses (`to reside`, `to lay`, `public holidays`). This is #422's family 1. **Not read** beyond the sample.
- `phrase_missing_lego` (685, target side): read at basket level as family 2. Rows in baskets under 50% failing were **not read**.

---

## deu_at_for_eng (Austrian)

- **Formal LEGOs without sir/madam:** 12 LEGOs (S0643, 644, 646–653, 654L02, 655L01; table row 1). Seeds and main both carry `der Herr` / `gnädige Frau`, which is right in Vienna. LEGO → `…, der Herr` / `…, gnädige Frau` on both sides, with its phrases ending in it. Sure. ~615 chars.
- **want/möchte** (table row 2): seeds 643 and 650 `do you want… \| Möchten Sie…`. English → `would you like…, sir/madam` (English only). Seed 383 `he wanted \| er mechat` → `er wollt`. Five rows `I would like \| i wü (gern)` (S0414L02U06, S0418L01U03, S0448L01B02, S0471L01U05, S0504L02U05) → `i mechat`. Likely; the Austrian forms come from the course's own `i mechat` (S0011, "I'd like") and `wollt` (S0127, "wanted"). ~540 chars.
- **Seed 264:** `an elderly man` → `an old man`. Grow S0231L01 to `I know an old man \| i kenn an oiden Monn` so the case shows why the form differs (L34). Likely.
- **Seed ZUT:** `what are you looking for` = `wos suachst'n` (68) and `wos suachst denn` (194). Use one form.
- **Empty clip:** S0322L02U08 has no known clip (35 chars).
- **Seed not played:** 118 seeds (2 more differ only in punctuation and are fine). Fifty-six have no copy at all, mostly 3–45. Add each, 0 chars.
- **Question mark:** 270 (191 English without `?` where the German asks). Text only. **Duplicate rows:** 3. Delete.
- **Not a defect:** `a restaurant \| a Restaurant` and 4 similar (loanword plus the Austrian `a`); `dort` (taught at S0157L02); `I have no emails yet \| i hob no koa` (a negative); `versuch`/`versuach` spelling drift (S0004L03U04 vs S0638), which is low and unlisted.
- **GAP:** `lego_not_in_seed_known` (348; 309 after exceptions) is mostly literal glosses (`no longer`, `agreed`, `thought it over`). An 8-row sample was read; the rest were **not read**. `lego_syll_7_8` (41) was not read; nothing in this course is over 8 by the hand count.

## deu_ch_for_eng (Swiss, draft)

- **Formal block 639–655:** 10 LEGOs are a bare verb with sir/madam in English only (`feel madam \| fühled`, `you speak madam \| reded`, `could you sir \| chönted`). In Swiss German the `-ed` ending is also "we", "you all" and "they". LEGO → carry `Sie` (`do you want, sir? \| wänd Sie?`). Keep sir/madam in English as the formal cue: Swiss speech has no everyday equivalent of `mein Herr`. Best guess; Kai may prefer to drop the cue. S0653L01 (gapped) is KNOWN (d/740ccd8e).
- **Swiss on the English side:** 10 build rows (`han ere \| han ere`, `wie fühled Sie \| wie fühled Sie`). Write the English. Sure. ~130 chars.
- **Pronoun-less plural LEGOs:** S0425L01 → `si verstönd`, S0448L01 → `si hälfed`. Sure.
- **K48:** S0572L06 → `wo si öis bsuecht händ`; S0538L03 → `as though I don't care \| as ob s mir egal wär`.
- **ZUT:** S0501L01 `if \| wenn` vs S0010L03 `if \| öb`; #719 set this, not Kai. Grow to `if only I could \| wenn ich nu chönt`. S0149L02 `I hope \| hoff` → `so I hope \| also hoff ich`.
- **Small single fixes:** S0642L01U03 `ich cha Sie hälfe` → `Ihne` (dative). S0534L01B03 `gömmer nöd scho` → `gömmer no nöd`. S0252L02U01 `wenn` → `wänn`. S0567L03 `d Chind` → `de Chind`. S0620L02 re-cut to the seed's words. S0601L03 (10 syllables) → `how it started \| wie s aagfange hät`.
- **Duplicate debuts:** S0317L02 and L03 (with trailing commas). Flip to not-new.
- **Seed not played:** 58. Add each, 0 chars. **Question mark:** 101 (German `?`, English none). **Duplicate rows:** 1.
- **KNOWN or ruled, not listed:** `to go \| ane` (deliberate, #719); `when? \| wänn` vs `when \| wenn` (the question mark marks it, as #719 used); `no \| kei` vs `no, \| nei,` (an as-in intro, #719); S0194L01 and S0374L02 (d/740ccd8e).
- **GAP:** `lego_not_in_seed_known` (248; 228 after exceptions) was read on an 8-row sample only (`required`, `it itself`, `in order to`). `lego_syll_7_8` (74) was not read.

---

## Totals (REAL new findings; audio characters)

| course | REAL rows/items | chars | biggest |
|---|---|---|---|
| deu_for_eng | 567 (incl. 269 `?` and 66 deletes at 0 chars) | ~32,000 | basket rebuild ~22,600; `dort` ~4,400 |
| deu_at_for_eng | 419 (incl. 270 `?` and 118 P26 adds at 0 chars) | ~1,200 | formal LEGOs, want/möchte |
| deu_ch_for_eng | 194 (incl. 101 `?` and 58 P26 adds at 0 chars) | ~800 | formal block, English side in Swiss |

## Coverage

| family | deu_for_eng | deu_at | deu_ch |
|---|---|---|---|
| ZUT LEGO/seed/use | scanned, all read | scanned, all read | scanned, all read |
| not-new untaught / dup debut | all read | 0 hits | all read |
| basket drills its LEGO (P17) | all 60 LEGOs at basket level | 0 LEGOs ≥50% | 2 (formal; listed) |
| untaught target | ~135 of 249 read (by word) | 5 read, not defects | 0 hits |
| LEGO not in seed, target | all read | all read | all read |
| LEGO not in seed, known | sample 8 of 185 | sample 8 of 309 | sample 8 of 228 |
| syllables >8 | recounted by hand rule | recounted | recounted |
| syllables 7–8 | **not read** | **not read** | **not read** |
| seed not played, dup rows, `?`, same-both, empty audio | all, by mechanism | all | all |
| German two-sided rules (want/möchte, K45, K46, K32, K48) | run, all hits read | run in dialect forms | run in dialect forms |
| lexical patterns (deu.patterns.json) | run, calibrated (exit 0) | run | run |
| intros | **not scanned** | **not scanned** | **not scanned** |
| clip = text, female voice, by ear | **not scanned** (A22) | **not scanned** | **not scanned** |

## Gaps
- The held list d/ca698dea (239 items) was matched by row id and seed number only, not read in full. A finding phrased differently there may be counted here as new.
- Three #435 patterns (`Fernsehen ferngesehen`, `klingt wie`, `beide es`) find their pre-fix positive but have 0 live hits, which confirms those fixes landed.
- K45 könnte/konnte: all 19 live hits sit in seeds the canon already holds for Kai (312, 412, 479, 518, S0603L03), so they are KNOWN and not listed.
- Proposed German and dialect forms are best effort from the course's own taught forms and Duden. A cost of 0 for P26 adds assumes the seed's own clips exist.
