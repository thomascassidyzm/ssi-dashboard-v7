# Portuguese (por_for_eng + por_br_for_eng): cleanup scan findings (#447, slice por, job #454)

17 Nov 2026. I only read. Nothing was applied, rendered, linked or sent. I re-read both courses live through Popty's script-view at 13:45Z. Row ids are live. Every row is in `por.json` beside this file.

**Totals, new findings only.** Items already on a held or ruled list are marked KNOWN and are not counted.

- **por_for_eng: 1,074 rows**, ≈ **14,200 characters** if every fix is made. Most of them are deletes, which cost nothing.
- **por_br_for_eng: 1,719 rows**, ≈ **21,100 characters**. 1,317 of those rows are machine filler to delete, at 0 characters.

How I counted characters: target text × 2 voices, plus known text × 1, and only for the sides that change. A delete costs 0. An intro is about 45 characters. Every figure is an estimate from text length. None comes from a render dry run.

## The headline, in four lines
1. **Most of por_br's practice from seed ~400 to 668 is filler.** 1,167 rows are just "yes, / no, / that's true, / I'm sure" in front of the bare LEGO ("no, of the holidays | não, das férias"). Another 174 are "LEGO + now/today/here". Deleting them all still leaves 1,343 of the 1,412 new LEGOs with at least 5 real rows each.
2. **por_for_eng's late seeds (490–667) have their own template fault.** Rows read "she/he/they said/asked …", but the Portuguese keeps the seed's person: "she said they would have bought | ela disse que **nós** teríamos comprado". Many also use *perguntou/perguntaram*, which are never taught.
3. **Fixes made in one course and not the other.** Both ways are listed under "Cross-course" below.
4. **22 seeds in the two courses have no LEGOs at all**, so they are never played. #426 had noticed only seed 43.

---

## por_for_eng (European)

**P1. "she/he/they said …" rows where the Portuguese keeps the seed's person.** 37 real, 40 read.
- S0612L01U01: she said they would have bought something | ela disse que **nós** teríamos comprado algo
- S0620L02U02: she said it's a very long time since **they** last saw each other | … desde a última vez que **nos** vimos
- S0614L03U03: he said it's near where **his** family live | … onde a **tua** família vive
- S0572L03U02: she asked if he had forgotten … | ela **disse se esqueceste-te** … (wrong person, wrong verb, wrong clitic order)

Fix: for 28 rows, the English moves to the Portuguese person ("she said **we** would have bought…"). That keeps the clips and costs about 1,440 characters of English. Delete 9 rows whose Portuguese is broken too (570U05, 572U02/U03/U05, 501L04U04/U05, 508L01U04/U05, 175L01U01).
Canon: K26, K9. Confidence: sure. The 3 not counted were false hits ("triste" matched as a past-tense verb).

**P2. "she/he/they asked …" rows built on *perguntou / perguntaram*, which the course never teaches.** 110 real, all read.
- S0628L02U01: she asked do you like tea? | ela perguntou se gostas de chá?
- S0643L01U01: she asked do you want sir? | ela perguntou se o senhor quer?
- S0492L01U04: she asked which of those is important | ela perguntou qual desses é importante

45 of these rows also have broken English ("she asked do you…"). Fix: delete them, 0 characters. The target form is untaught (K8, K14), so rewording the English alone would not be enough. Canon: K8, K14, K9. Confidence: likely.

**P3. Other untaught target words.** 38 real, all read. 31 rows use *mim* ("por mim", "para mim"), which is never taught, e.g. S0074L01B01 for me | por mim. Then one row each for aprendes, pensas, falei, sabes, lembro ×2, nomes and ajudaria.
Fix: delete, or reword with taught forms. 0 characters. Canon: K8, K14. Confidence: likely.

**P4. LEGO English the seed never says (made-up glosses).** 49 real out of 86 read. The other 37 were "to", inflections, contractions, splits or L28 fused forms, so not defects.
- S0217L01 drank | bebi (seed: "I had a glass or two of water")
- S0323L01 on foot | a pé (seed: "doesn't need to walk")
- S0463L01 bedroom | quarto (seed: "my room number")
- S0525L01 you managed | conseguiste (seed: "if you've been able to")
- S0618L01 it seems | parece (seed: "it doesn't feel like")

**Cross-course:** 122, 127, 137, 620 and 49 are the same items #423 holds for por_br (d/4a804f2e), but **nobody listed them for por**.
Fix: re-gloss to the seed's own words and re-voice the intro. Where that cannot be done, re-chunk (L25). Each item's proposal is in `por.json`. ≈ 8,700 characters, which includes the row Englishes that carry the old word. Canon: L26, L25, K54. Confidence: likely; re-chunks are a best guess.

**P5. Practice rows that drop or change their LEGO.** 43 real out of 114 read. The other 71 are fine: L28 fused forms (no, do, da, pelo), clitic forms (perguntar-te), and the proclisis Portuguese grammar requires after *que*, *se* or *não* (me seguiu, o falam, se importa).
- S0182L02U01: my things | as minhas coisas, under the LEGO "as minhas chaves" (my keys)
- S0140L01B03: if I can | se consiga, under "que não consiga ver". It is ungrammatical; it should be *se conseguir*.
- S0570L02U01: she said your | ela disse teu
- S0332L01U01: she needs to sell a new company, under "uma vida nova"

Fix: delete 30 rows. Rewrite the 7 rows under 182L02 to "keys" and the 6 under 332L01 to "a new life". ≈ 1,200 characters. Canon: P17, K50. Confidence: likely.

**P6. Single rows: wrong mood, nonsense, calque, wrong tense.** 20 real, all read.
- S0482L03U02/U04/U05: *disse que eles não estejam…*. After *disse que* the Portuguese needs the indicative: *não estão a falar a sério*. Delete these, and B02.
- S0511L01U04/U05: *são várias horas a chegar* is not Portuguese for "it took several hours". Delete.
- S0123L01U07: "I thought" over *acho*. Delete; S0124L01U09 already says *achei*.
- S0122L02U04 / S0127L02U07: *entusiasmado para te ver* → *entusiasmado por te ver*. Priberam gives *entusiasmado com/por*.
- S0094L01U04/U07, S0094L03U03/U04/U06: "I need the way", "I know the way to work" (*a maneira de funcionar*). This is not English, and "way to work" reads as the route to the office. Delete.
- Also: S0311L03U06 gets *todos os factos*; S0450L01U05 *tomar o comboio* → *apanhar o comboio* (the seed's own word); two target "?" added; S0452L01B04 and S0453L02U05 deleted.

≈ 260 characters. Confidence: sure for the deletes, likely for the rewrites.

**P7. LEGO level.** 7 real.
- **S0085L01 "I know | conheço"** has the same intro as S0059L01 "I know | sei", with no sense line. Its B01/B02/B03 prompt a bare "I know" (K23 b/d).
  - Fix: intro "The Portuguese for 'I know', when you're talking about people or places, is:" (~75 characters). Delete the 3 bare rows.
- **S0207L01 fizeste** and **S0257L01 daquela coisa azul** are marked not-new but were never taught, so their baskets are dark. Seed 258 then assumes the second one. Make both NEW, with an intro each (L31).
- **S0212L01 queriam** is a second debut of S0211L02. Make it not-new (L17).
- **S0448L01 "all | todo"** and **S0530L01 "can | poder"** are not-new, untaught extras whose seeds are fully covered by a bigger LEGO. Delete both.
- **S0653L01 "do you mind | importa-se"** clashes with S0190L01 *importas-te*. Its sister L02 "do you mind madam?" already carries the context. Delete L01; its rows include nonsense ("she said do you mind madam before?").

≈ 165 characters.

**P8. New LEGOs over 8 syllables.** 23 read and recounted by hand. Below are 12 with an obvious shorter cut; the other 11 are 9-syllable chunks with no clean single-sense split.
- S0113L01 *porque é que não consigo | lembrar-me do que disseste* (15)
- S0186L01 *queres falar sobre | algo diferente | na próxima semana* (15, the whole seed)
- S0109L03 *temos de trabalhar muito | para aprender*
- S0088L02 *para falar com | pessoas que não conheço*

The other 8 are in `por.json`. ≈ 90 intro characters per cut, plus new baskets (not costed). Canon: L3, Kai 17 Nov shortest cut. Confidence: best guess.

**T2. Filler BUILDs: the bare LEGO + now/today/here.** 204 rows read.
- 28 are nonsense. Delete them, sure: S0636L01B02 I think that that bag today; S0626L02B02 no, I'm not thirsty, thank you today; S0587L03B02 she used to insist today; S0614L03B02 it's near where today.
- The other 176 make sense but add nothing (P3, the anti-filler rule). Delete them where the basket keeps 2 or more real BUILDs. Likely.

0 characters.

**D1. Exact duplicate rows in one basket.** 495, machine-checked as identical text. This compares with 46 in por_br, so por never had por_br's dedupe. Of the 495: 286 BUILDs repeat the bare LEGO, 170 USE rows repeat a BUILD, and 11 USE rows repeat a USE row. Delete the later copy, 0 characters.

**E1. Empty audio slots on played rows.** 46: 33 rows lack the English clip, 13 lack all three. S0062L01 and S0074L02 are the worst. Link a library clip first; a render is needed only for a miss. ≤ 1,350 characters if every slot had to be rendered.

**S2. Seeds with no LEGOs at all.** 12 real: 43, 67, 165, 166, 194, 219, 314, 329, 389, 400, 564, 596 (`/seed/Sxxxx/baskets` → basketCount 0). List each seed's taught parts as not-new LEGOs (S3) and give the sentence a played home (P26). 0 characters unless the text changes.

**KNOWN for por, not counted:** the 69 seeds that are never played (55 pro-drop, plus 327/341/352/378/477 and the held 141, 315, 358, 379, 384, 390, 403, 406, 450). Also 10 of the 12 "LEGO target not in its seed" hits (the other 2 are L28 *no / pelo*, not defects), the "when" clash, the 7 *tive sorte suficiente* rows, the 141/82 two-sentence seeds, and the lowercase Thursday/Tuesday/Jane. Sources: d/0e7d884d and d/f1e11f9f. S0509L02 *eu ouvi dizer que* against S0364L01 *ouvi dizer que* is the same open pro-drop question (K19).

## por_br_for_eng (Brazilian)

**T1. "yes, / no, / that's true, / I'm sure" + the bare LEGO.** These are template USE and BUILD rows, almost all from seed 400 onwards.
- **740 are a fragment or a contradiction:** "no, of the holidays | não, das férias"; "no, cut | não, reduzir"; "yes, they didn't | sim, eles não"; "no, he is | não, ele tem". Delete, sure.
- **427 put a whole clause behind the tag:** "no, they want to lead | não, eles querem liderar". Delete unless the row is the seed's own answer. Likely.

I read all 330 "no, …" rows by hand and spot-read the rest. The structure itself is the evidence: each row's English is exactly a tag plus the LEGO's own English. *Tenho certeza, …* ("I'm sure, …" with a comma) is not a Portuguese way to say it either. After the delete, 15 LEGOs have 3 real rows or fewer and need a top-up from taught words; the list is in `por.json`. 0 characters. Canon: P3, K9.

**T2. Filler BUILDs (LEGO + now/today/here).** 174 read.
- 41 nonsense: "the news took now", "it's under now", "I used to live now", "can I have now | posso agora", "we probably now".
- 133 sensible filler.

Same fix as por. 0 characters.

**T3. Artefact block, seeds 250–292.** 56 real. A mangled BUILD set:
- *só* glued to the front with an unrelated English: S0276L02B03 to stay here | só ficar; S0288L01B03 most people here | só a maioria das pessoas; S0272L02B03 that great idea | só uma ótima ideia.
- *já* glued to nouns: already a friend | já um amigo.
- English that says more than the Portuguese: she sent more | mandou; many people | mais pessoas; a little soon | um pouco em breve.

Delete. 0 characters. Confidence: sure.

**B1. European forms in the Brazilian course, beyond the held list.** 86 rows, all read.
- *tinha / tenho a certeza* (S0202L03, S0340L01; 42 rows). BR says *tenho certeza*, and the course's own S0010L01 already teaches *não tenho certeza*.
- *se magoou* (S0339L01; 18). In BR *magoar* is to hurt someone's feelings; a physical hurt is *se machucou*.
- *perguntaste* (S0382L01; 10) and *concordaste* (S0385L01; 10). These are *tu* past forms; BR uses *você perguntou / concordou*, and K26 means the LEGO gets *você*.
- *falando a sério* (S0482L04; 9) → *falando sério*.

≈ 6,000 characters. Confidence: likely; source is BR usage per Priberam BR entries. **KNOWN and not counted:** factos 32, ouviste 20, trabalhas 13, conheces 11, camisola 11, demasiado 8, à espera 5, entusiasmante 1 (d/86cf198f).

**B2. LEGO English the seed never says, beyond the 11 #423 held.** 68 real out of 140 read. The other 72 are KNOWN (#423) or not defects.
- **Meaning errors:**
  - S0370L01 "I would recognize" | seed "I didn't see anyone that I knew"
  - S0330L01 "it may be very important" | seed "I don't think it's very important"
  - S0617L02 "it used to be a mistake" | seed "you thought it was a mistake"
  - S0038L02 "for a long time | há muito tempo", in neither side of "I've been learning for about a week"
- **Invented words:** S0198L05 "city hall" (seed: council); S0288L02 "I am familiar with | conheço"; S0590L01 "I myself saw"; S0614L04 "resides"; S0599L02 "truly happy"; S0508L03 "the manner that".

Fix: re-gloss to the seed's words. For the 5 meaning rows, re-cut to the seed. ≈ 14,200 characters, an upper estimate that includes intros and every row English carrying the old word. Canon: L26, L25. Confidence: likely; re-cuts are a best guess.

**B3. LEGO level.** 11 real.
- **Not-new but never taught:** S0161L02 me dar, S0207L01 fez, S0246L01 ajudasse, S0257L01 daquela. Make them NEW, with intros. **The same S0207L01 and S0257L01 defect is in por.**
- S0253L03 *minutos*: delete.
- S0251L02 *descobrir* is a second debut: make it not-new.
- S0073L02 "thank you | obrigada" is not in its seed (a gender-prep leftover): delete.
- **One English, two answers:**
  - "to answer": *para responder* (S0027L02) against *responder* (S0250L03). Re-cut S0027L02 to "to answer | responder"; that also gives S0250L03 its earlier exact pair.
  - "I should": *devia* (S0098L01) against *devo* (S0253L01). Grow S0253L01 to "I should be | devo estar".
- **Mis-cut:** S0420L03 "he is | ele tem" → "how old he is | quantos anos ele tem". S0438L01 "they didn't | eles não" is a fragment; its rows "eles não servir / reservar / liderar" are not Portuguese.

≈ 400 characters.

**B4. Single rows.** 27, all read: off-LEGO rows (S0155L02 ×7, S0229L02 ×4, S0134L04 ×4), missing *que* (S0617L01U05 "sabemos você achava que", 618U05, 659U05), and S0162L01U04 "I was hoping we could talk about that | esperava falar disso com você". Delete. 0 characters.

**B5. *pensar em* where the course teaches *considerar*.** 7 rows. #432 fixed only seed 98's copy (d/ab7cd466); the rows under S0098L02/L03 and S0100L02 still say *pensar em*. Fix: *considerar …*. ≈ 540 characters. Confidence: likely.

**B6. Untaught target words.** 24: *mim* ×17 (para mim, sem mim), *aquilo* ×3, plus cometi, tentei, podemos and lembro. Delete or reword. 0 characters.

**B7. Question mark on one side only.** 24. 22 late-seed English prompts (seeds 623–666, "do you want it | você quer isso?") need a "?" added to the text only; S0643L01B01 needs a target "?". S0017L03B01 "what the answer is | Qual é a resposta?" → English "what's the answer?" (18 characters).

**S1. Seed copies that differ from their seed only because the English is spelled out.** 19 seeds: 73, 222–224, 243, 245, 251, 254–256, 258, 260, 263, 269, 270, 273, 277, 279, 289. Example: "why do you not want to wait for your father?" for the seed's "why don't you…". These seeds count as never played. Fix: set each copy to the seed text and link the seed's own clips, 0 characters (P26). There are 22 more "do not / does not" rows elsewhere; they are stiff but grammatical, so not counted.

**S2. Seeds with no LEGOs at all.** 10: 113, 228, 241, 259, 278, 282, 321, 646, 649, 655. Seed 113's own Portuguese *do que disse* should be *do que você disse*, because the English says "you said".

**D1. Exact duplicate rows.** 46. Delete the later copy, 0 characters.

**At-risk count, not defects.** por_br has a female target voice (BrendaNeural, about 13.6k clips). 310 played rows (73 seeds) carry a first-person masculine form (*pronto, cansado, obrigado…*). Those are the slots at risk of the #131/#142 defect if the female voice reads them. No check can hear a clip (A22). por_br was never measured the way por was. Re-recording every at-risk slot would cost ≤ 11,600 characters in one voice, but only after gender-prep text exists.

**KNOWN for por_br, not counted:** the 47 #432/#423 held items (d/ab7cd466, d/86cf198f, d/4a804f2e): seeds 7, 41, 49, 58, 65, 69, 70, 72, 79, 112, 122, 127, 128, 132, 137, 141, 145, 194/68, 232, 284, 295, 314, 331, 419, 433, 435, 450, 486, 507, 517, 615, 616, 620, 636, "that book", S0195L01 (masculine), saturday. Also 69 pro-drop seed copies (the same K19 question as por #416). *praticar falando* is 47 rows; it is the Portuguese twin of spa *practicar hablando*, which is with you as spa #443, so whatever you rule there carries over.

## Cross-course (the priority)
- **Fixed in por, checked in por_br:** #416's seed-copy repairs (319, 326, 332, 335, 346, 359, 382, 465, 469). All already read correctly in por_br. Nothing to carry.
- **Fixed in por_br, checked in por:** #432's copy repairs (14, 98, 115, 130, 205, 227, 311). por never had these defects. The *pensar em* rows #432 did not carry to its own baskets are B5.
- **Found in por_br, missing from por's lists:** the made-up-gloss items 122, 127, 137, 620 and 49 (P4).
- **Same defect in both, listed in neither:** S0207L01 and S0257L01 not-new but never taught; "com eles" baskets (S0134L03 in por, S0134L04 in por_br) practising *para eles / sobre eles*; no-LEGO seeds.
- **Only in por:** the "she said / asked" person and *perguntou* template (P1, P2); 495 duplicate rows; 46 empty slots.
- **Only in por_br:** the yes/no/that's-true template (T1), the seed 250–292 artefact block (T3), and the European forms (B1).
- **Variety check:** the European course is clean of Brazilian forms. The only hit is *tomar o comboio* in S0450L01U05 (P6).

## Coverage

| Family | por_for_eng | por_br_for_eng |
|---|---|---|
| zut_lego / zut_seed / zut_use | 5 / – / 41 read | 8 / 1 / 6 read |
| notnew_untaught, dup_debut | 5, 1 read | 12, 1 read |
| lego_syll_over8 | 23 read | 0 |
| lego_syll_7_8 | **143 not read** | **88 not read** |
| lego_not_in_seed_known / target | 101 / 12 read (15 "to"/pronoun-only excluded by rule K54/K28) | 160 / 15: 140 / 15 read, 20 pronoun/"to"-only excluded |
| phrase_missing_lego | 114 read | 171 read |
| untaught_target | 161 read | 107 read (minha/diferentes/novo = agreement, K27; not defects) |
| article_drift | 2 read: fine (enough exact rows) | 2: both are T3 artefacts |
| dup_rows | 495 machine-checked | 46 machine-checked |
| empty_audio | 46 | 0 |
| seed_not_played | 69: all KNOWN | 130: 69 pro-drop, 19 S1, 42 KNOWN/held |
| qmark | 2 | 24 |
| echo yes/no | 2: fine | 12: fed T1 |
| filler BUILD + template rows (new structural checks) | 204 / 14 read | 174 / 1,167 (330 read in full, rest by exact structure) |
| reported-speech person (new) | 40 read | 6 read (1 real) |
| lexical, `por.patterns.json` (11 patterns, all calibrated, exit 0) | br_forms_in_ep 1, subjunctive_after_said 3, sorte_suficiente 7 (KNOWN), entusiasmado_para 2, asked_do_you 45 | ep_forms_in_br 169, pensar_em 7, nao_plus_infinitive 4, tenho_certeza_comma 479 (→T1), invented_emphasis 44, praticar_gerund 47 |
| intro wording | only S0085L01 / S0059L01 / S0653L01 / S0448L01 / S0331L01 read | none read |

## Gaps (honest)
- **The 7–8 syllable band was not read** (143 + 88). It is the "shortest cut" list Kai asked for, so it remains open.
- **Intros were not scanned** beyond the five LEGOs above. The committed intro-mirror tools were not run.
- **Audio by ear: nothing.** The empty-slot and at-risk counts come from clip ids and text only (A22).
- **T1b's 427 rows were classified by structure and read only in part.** A few may be a seed's own yes/no answer, which is why they are marked "likely", not "sure".
- **Character figures are text-length estimates.** B2's figure is an upper bound. Library hits will lower all of them.
- The orchestrator's count of 69 not-played seeds for por includes nothing new. The 22 no-LEGO seeds in S2 are new; the dump route omits them, so the scan found them by their missing seed numbers.
- **Online sources** are dictionary-level only (Priberam, plus general BR usage). No corpus counts were made.
