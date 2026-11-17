# French slice — cleanup scan findings (#447, worker #455)

Courses: **fra_for_eng** (main) and **fra_ca_for_eng** (Québec variant). Read live through Popty on 17 Nov 2026 (dump 13:45Z). **Nothing applied, rendered or linked.**
Row-level list: `ops/paid-cleanup-scan-447/reports/fra.json` (330 REAL rows). French patterns: `fra.patterns.json`.

**One thing to know first.** fra_ca is not a copy of fra_for_eng. It shares 650 of 664 English seeds but almost none of the French: 46 seed targets and 985 of ~12,000 practice rows match. So "a fix made in main and still live in the variant" means the same *rule* broken again in fra_ca's own French. It does not mean the same row. Québec forms (`chu`, `j'pense pas que c'est`, `qu'est-ce qui` in an indirect question, `là` as a filler, dropped `ne`) are right in fra_ca and are not listed.

Audio characters below = new known text × 1 + new target text × 2 voices. A delete or a relink costs 0. LEGO re-glosses add about 24 characters for the intro. All counts are estimates (±10%).

---

## PRIORITY — fixes made in fra_for_eng that are still live in fra_ca_for_eng

| # | rule fixed in main | where main fixed it | fra_ca now | REAL in fra_ca |
|---|---|---|---|---|
| 1 | Formal LEGOs carry sir/madam (K32) | #329/#355, seeds 639–655 | 15 formal LEGOs say "you all" or have no honorific | 15 LEGOs, 96 rows |
| 2 | "to meet" with an unmarked reflexive (Kai 14 Oct, seed 18) | #449 | "to meet \| se voir", and "he wants to meet \| y veut se voir" | 1 LEGO + 9 rows |
| 3 | Verb LEGO English carries "to" (K41/K54) | #355/#329 | 8 bare verbs ("tell me \| me dire") | 8 |
| 4 | Verb LEGOs carry their subject pronoun (Kai 14 Oct) | #414·Q | "they speak \| parlent" | 1 |
| 5 | Same pair taught as new twice → not-new | #508 (31 flipped) | "I was \| j'étais" at 26 and 115 | 1 |
| 6 | "until after \| avant qu'" judged by its seed (Tom 15 Oct) | canon | "before we finish \| avant qu'on finisse" | 1 |
| 7 | "have need" English (held item 170) | #424 held | "I have need for help" | 1 LEGO + 6 rows |
| 8 | Wrong-word LEGO gloss (#424 family 1) | held | 35 literal glosses ("obliged to", "your female friend") | 35 |
| 9 | Every seed sentence played (P26) | #419, #508 | 33 seeds not played; most have a near copy with drifted English | 33 |
| 10 | Female voice says the male form | #142/#243 re-record | Sylvie (female) is a target voice; 376 rows carry a 1st-person masculine form | AT RISK only, not heard |
| 11 | "que on" → "qu'on" (8 Aug) | contractions fix | 0 left | 0 (fixed) |

---

## fra_ca_for_eng

### 1. Formal "sir/madam" seeds taught as "you all" — 15 LEGOs, 96 rows (REAL)
Seeds 639–655 are formal and singular ("do you want sir?"). Their LEGOs say "you all", so the learner hears the plural prompt. Seeds 657–668 then teach "you all" as `vous-autres`. One English prompt now has two answers, and the honorific never reaches most phrases.
- S0643L01 `do you all want | voulez-vous` → `do you want sir | voulez-vous monsieur`
- S0646L01 `you all are doing | vous faites`, row B04 `you're doing trouble | vous faites du trouble` (nonsense)
- S0639L02U02 `yes sir again | oui monsieur encore`, U03 `thank you sir right now` (nonsense)
- S0650L01, S0652L01, S0654L01 have no honorific at all.

**Fix:** use fra_for_eng's live shape. The LEGO carries sir/madam on both sides (K32). Every phrase ends in sir/madam on both sides. Delete the nonsense rows. **Canon:** K32, K2, L26. **Chars:** about 1,100 for LEGOs + intros, about 9,950 for the 96 phrases (rows that are deleted cost 0). **Confidence:** sure.

### 2. Plural seeds: LEGOs say "you guys", seeds say "you all" — 12 LEGOs (REAL)
S0657L01 `you guys feel` (seed "how do you all feel?"), S0665L01 `do you want to go, you guys`, S0668L03 `of it, to go there`.
**Fix:** once item 1 frees "you all", re-gloss each LEGO to the seed's English. Known side only. **Canon:** L26. **Chars:** ~560. **Confidence:** likely.

### 3. "to meet | se voir" — 1 LEGO + 9 rows (REAL, Kai's seed-18 ruling)
The `se` means "each other", and the English does not show it. With one subject it means "see himself": S0018L02B02 `he wants to meet | y veut se voir`, S0018L02U02 `she wants to meet with everyone else | a veut se voir avec tout le monde`, S0039L03U03, S0040L02U04.
**Fix:** grow S0018L02 to `we want to meet | on veut se voir`, as #449 did in main. Rewrite the singular rows with `on`, or delete them. **Source:** Kai 14 Oct (d/3cd81832). **Chars:** ~65 for the LEGO; rewrites ≈ 9 × 60 if kept rather than deleted. **Confidence:** sure.

### 4. Verb LEGOs without "to" — 8 (REAL)
S0222L02 `tell me | me dire`, S0235L03 `tell you`, S0334L02 `let you`, S0351L01 `leave me`, S0530L03 `count`, S0108L02 `waking up`, S0505L02 `get myself`, S0518L01 `myself imagine` (also not English).
**Fix:** add "to" (`to tell me`, `to imagine myself`…). **Canon:** K54, K41. **Chars:** ~290.

### 5. Gapped LEGOs and the two ZUT clashes they cause — 4 (REAL)
S0079L02 `when...? | quand est-ce que` clashes with `when | quand`. S0631L01 `what...? | qu'est-ce que` clashes with `what | ce que`. The French is not gapped; the "..." is a label.
**Fix:** S0079L02 → `when did you | quand est-ce que t'as`. S0631L01 → the whole seed `what would you like? | qu'est-ce que tu voudrais ?`, taught after `you would like`. S0505L01 → `so that I don't | pour pas`. S0490L02 → `I'll never again | m'as pus jamais` (best guess; the full frame is over 8 syllables). **Canon:** L32, K11, L34. **Chars:** ~150.

### 6. Literal-gloss LEGO English — 35 read as REAL
The English translates the French word for word instead of using the seed's words, and the phrases copy it. S0139L02 `obliged to` (seed "need to"), S0139L03 `just as bright and early`, S0358L01 `your female friend`, S0106L03 `to labour`, S0136L02 `gal-friend`, S0527L03 `recounted to me`, S0600L03 `to what extent`, S0470L01 `up to what height`.
**Fix:** re-gloss to the seed's English and carry it into the phrases. **Canon:** L26, K9. **Chars:** ~1,500 for LEGOs + intros. Phrase English adds more where rows repeat the gloss.
Also read: 141 hits were only an inflection or a small word ("started", "that", "the"). The same shape is live in main, so not listed. The rest of the 103 are the "you guys" LEGOs (item 2) or natural English synonyms ("properly", "this job", "it doesn't bother me"). The synonyms break L26, but nothing is wrong for the learner, so they are not counted.

### 7. Smaller items (REAL)
- S0283L02 `they speak | parlent` → `y parlent` (Kai 14 Oct pronoun ruling). ~45 chars.
- S0115L02 `I was | j'étais` → flip to not-new (taught at S0026L03). 0.
- S0251L02 `before we finish` → `until after we finish` (Tom 15 Oct). ~45.
- S0605L02 `need for help` → `need help`, and its 6 rows `I have need for help…` → `I need help…`. ~200.
- S0493L01 `what is it that's happening | qu'est-ce qui arrive` is not in seed 493 ("s'en vient après"). Re-cut to the seed; its 8 rows say "we should know what is it that's happening". ~110 + row English.
- S0488L01 `de l'autre bord de ça` (seed: `de cette ligne`) → `de l'autre bord de`. S0220L02 `to watch | écouter` (seed: `écouté`) → retire.
- Question marks: S0643L01U01 and seed 643 `voulez-vous monsieur` need "?"; S0659L02U01 needs "?"; S0650L01U03 `do you want to go right now again` → delete. ~120.
- Duplicate rows S0231L01U06, S0647L01U01 → delete. 0.
- Over 8 syllables: S0613L01 `on aurait probablement acheté` → `probably | probablement` + `we would have bought | on aurait acheté`. My count found 3 more at 9 (S0293L02, S0354L01, S0461L01). Those are within the counter's ±1, so they are not listed.

### 8. Seed sentence not in a played basket — 33 seeds (REAL, 0 chars)
24 have a near copy whose English drifted to the literal gloss: S0527L04U01 `guess who recounted to me that funny story`, S0622L02U01 `I was aware that…`, S0559L03U01 `did you found the path through the wood?` (also bad English). 9 have no copy (80, 150, 152, 215, 239, 244, 315, 337, 421).
**Fix:** set each copy's English to the seed's and relink the seed's known clip. Add the 9 missing copies reusing the seed's clips. **Canon:** P26.

### 9. AT RISK, not counted — female voice reading masculine forms
376 played rows carry a 1st-person masculine form (`chu prêt`, `j'étais content`). Sylvie (fr-CA, female) is one of the two target voices. Main found 233 such clips and re-recorded them (#142/#243). Nothing here was heard (A22). Whether fra_ca has gender expansions could not be read.

**fra_ca total (REAL): 137 rows/LEGOs in fra.json + the 96 formal-block phrases ≈ 14,300 characters**, most of it the formal block.

---

## fra_for_eng

Everything already on the held lists (d/b6a2a5d7, d/562e6297, d/281de4ee, d/1d0c7e9f) is marked KNOWN in fra.json. It is not counted here: seeds 82, 116, 170, 174, 238, 240, 248, 275, 278, 280, 319, 326, 480, 543, 600, the ZUTs move/happy/how much, 358/210/217 dropped objects, 642/651, 501, 167, capitals.

### 1. `je ne pense pas que c'est …` — 5 rows (REAL)
S0318L01U02–U06, e.g. `I don't think it's true | je ne pense pas que c'est vrai`. Seed 330 teaches the subjunctive for exactly this English (`je ne pense pas que ce soit vrai`), so the same prompt has two answers. At seed 318, `ce soit` is not taught yet.
**Fix:** delete, or reword with the seed's own `qu'elle pourrait` ("I don't think she could come"). **Source:** Lawless French, *penser que*; course seed 330. **Canon:** K14, P16. **Chars:** ~550 if reworded. **Confidence:** sure.
Not a defect: S0387L02 and S0139L04U03 (`je ne pensais pas qu'elle avait raison`). Seed 387 itself uses the past indicative.

### 2. Grammar caught by the fix-record patterns — 6 rows (REAL)
- S0657L01U02/U03 `je veux savoir comment vous sentez-vous tous` → `comment vous vous sentez tous`. This is the plural twin of held S0642. ~180.
- S0666L01U04 `j'aimerais savoir qu'est-ce que vous pensez tous` → `ce que vous pensez tous`. #195 fixed only the English. ~90.
- S0469L01B02 `that doesn't mean anything | … grand chose` → `that doesn't mean much | grand-chose`. ~30. S0555L04B02 spelling only, 0.
- S0413L01B03 `no we could | non nous pourrions` contradicts itself → delete. 0.

### 3. Basket drills a smaller piece than its LEGO — 95 rows in 21 baskets (REAL)
The LEGO grew, but its rows still drill the old small piece:
- S0644L01 `could you say that sir?`: 8 rows drill `cela` (`I know that | je sais cela`; B03 `oui cela c'est ce que je veux` is not French).
- S0481L01 `le seul vrai espoir`: rows `only that | seul ça`.
- S0478L03 `un cœur si gentil`: rows `kind | gentil`.
- S0246L01 `voulais qu'elle t'aide`: rows say `veux` (K50: a different verb form).
**Fix:** delete the BUILD fragments; rewrite USE rows to carry the whole LEGO, or delete them while the basket keeps enough rows. **Canon:** P17, K50. **Chars:** 0 if deleted; ~60 per rewritten row.
Not a defect (read): about 200 hits are French elision (`qu'il`, `d'un`, `l'homme`), sir↔madam swaps (K32), or K31-type words inside the LEGO.

### 4. Seed copies parked in the wrong basket — 4 rows (REAL)
S0126L01U09, S0170L01U09, S0170L01U10, S0152L03U09 are sentences of seeds this course does not have ("no unfortunately I've got too much work"). None contains its LEGO. **Fix:** delete. 0.

### 5. LEGO not in its own seed — 4 (REAL), plus 1 gapped
- S0324L02 `books | livres` sits in "that student has both of her hands up" → retire.
- S0324L05 `to raise | lever` (the seed says `levées`, already in L06) → retire.
- S0554L02 `the towel | la serviette` (the seed says `cette serviette`) → retire.
- S0140L01 `I can't see | je ne peux pas voir` (the seed says `ne pas pouvoir voir`) → re-cut. ~90.
- S0644L02 `could you sir? | pourriez-vous monsieur ?` is gapped (L32) and unplayed → retire. 0.

### 6. Untaught target forms — 56 rows (REAL)
The tool's 450 hits were mostly elision. Recounted with elision split and words inside earlier chunks counted as taught: 67 left. Of those, 9 are not a defect (`savait` sounds like `savais`, taught at 375, and plural endings) and 2 are KNOWN. Biggest groups:
- `savait` before 375 (S0225, S0365, S0366, S0372): 9 rows.
- `pouvez-vous` before 174: 5 rows.
- `tu penses que` before 135: 3 rows.
- Subjunctives after `c'est intéressant que` / `bien que` (S0120, S0178): 6 rows.
- `poser une question` before 202: 4 rows.
- S0080L02U10/U11 `tu me demandes de quand…`: untaught, and `de quand` is wrong.
- S0094L02U11 `la façon que` (should be `dont`).
**Fix:** delete, or reword with forms taught by then. **Canon:** K8, K14, K15. **Chars:** 0 if deleted.

### 7. Seed sentence not played — 10 new (REAL, 0 chars)
Seeds 28, 49, 139, 140, 516, 582, 614, 646, 655, 661. Each has a near copy with different English ("as soon as possible" for "as soon as you can", "you are" for "you're"). **Fix:** add the exact seed row, reusing the seed's clips (P26). 14 more are KNOWN.

### 8. Over 8 syllables — 27 new LEGOs (REAL, hand-estimated ±1)
Most are whole-seed LEGOs: S0088L01 (19), S0057L01 (18), S0193L01 (15), S0167L01, S0230L01, S0255L01 (14), S0227L01, S0245L01, S0247L01, S0256L01 (11), S0077L02, S0087L01, S0222L01, S0253L01, S0287L01, S0562L04 (10), S0140L02, S0166L01, S0191L01, S0203L03, S0208L01, S0277L02, S0288L01, S0518L02, S0652L01, S0653L02, S0655L01 (9).
**Fix:** cut each to its new part. Example: 193 → `too busy | trop occupé` (`je suis désolé`, `mais`, `aujourd'hui` are taught). 652/653/655 are over only because K32 added the honorific, so they are Kai's call. **Canon:** L3 (Kai 17 Nov: shortest viable cut). **Chars:** a new intro + LEGO per cut, ~70 each. The 105 LEGOs at 7–8 are not listed one by one.

### 9. Verb LEGOs without "to" — 5 (REAL)
S0055L01 `waking up`, S0091L02 `think`, S0251L01 `find out`, S0287L02 `watching`, S0508L02 `worrying` → "to …". ~180.

### 10. Duplicate rows — 487 exact twins (mechanical count, REAL as a class)
Same English, same French and same clip twice in one basket: 268 BUILD=BUILD, 198 USE=BUILD, 21 USE=USE. Almost all are in seeds 1–299. In 34 more pairs the BUILD twin dropped the "?" of a question (`are you learning his name | apprends-tu son nom`). Each pair is identical by machine. I did not judge them one by one, but no judgement is needed to see a row played twice.
**Fix:** delete the later twin (0 chars). For the 34, keep the "?" twin. Spanish did the same (#189). Kai may prefer to rewrite USE twins longer (P20).

### Not a defect (read)
- ZUT `that` que/cette, `to leave` partir/quitter, `anywhere`, `to reach`, `I heard that`: the second LEGO is not-new and never played (P25), or sits in a LEGO that shows why (S0588L02 `to grow up and leave home`).
- `beautiful` beau/beaux: same sound, number agreement (K42).
- Main's phrase-level ZUTs ("do you like coffee": two question forms) are not blockers (Kai 21 Oct).
- 6 not-new LEGOs with no earlier twin (S0067L01, S0121L02, S0509L02, S0511L04, S0588L01, S0603L03) are bookkeeping only: never played, word taught in the same seed. Listed in fra.json, not counted.

**fra_for_eng total (REAL, new): 193 rows/LEGOs in fra.json + 487 duplicate twins ≈ 1,100 characters if reworded where shown, 0 if deletions are chosen.**

---

## COVERAGE

| family | fra_for_eng | fra_ca_for_eng |
|---|---|---|
| zut_lego / zut_use | 9 / 17 read | 2 / 2 read |
| gapped_lego, dup_debut, notnew_untaught | all read | all read |
| lego_not_in_seed target / known | 39 read / 108 split by rule (to, pronoun, inflection) and the rest read | 10 read / 244: 103 read, 141 small-word/inflection by rule |
| phrase_missing_lego | 300: grouped by LEGO, 81 groups read | 2 read |
| untaught_target | 450 → 67 after elision; 67 read | 63 → 0 after elision |
| syllables | recounted by rule for all new LEGOs; over-8 listed; 7–8 not read one by one | same |
| dup_rows | 526 checked by machine (text + clip) | 2 read |
| seed_not_played | 24 read | 33 read |
| qmark_mismatch | 5 read (KNOWN or in families) | 4 read |
| fra lexical patterns (15 + 4 known-side) | run, every hit read | run, every hit read |
| question without "?" (new pattern) | 187 candidates, sample read, NOT counted | 398 candidates, NOT counted |
| two-sided checks (K32, K54, pronoun) | run | run |
| here \| là rule | not re-run (#195 fixed) | EXCLUDED: `là` is a Québec filler |
| female voice | fixed by #243 | at-risk count only |
| intros, clip ≠ text, grammar at large | not scanned | not scanned |

## GAPS
- Patterns that could not be one regex (here/là, sir/monsieur, bare verb, pronoun-less verb) were run as a separate read of the dump, not through detect.cjs.
- The "question without ?" pattern (`question_without_qmark`) finds its known positive, but has too many hits to read today. It is a candidate list, not findings.
- Untaught words: I counted a word as taught if it appears anywhere earlier, even inside a chunk. That is looser than K29, which needs the word as a component on its own. Some real hits may be hidden.
- Syllable counts are by rule (±1), not by ear.
- course_gender_expansions for fra_ca and the edit-event history could not be read through any Popty GET route.
- French judgements come from the cited sources (Lawless, Académie française, Usito) and the course's own seeds, not from a native speaker.
