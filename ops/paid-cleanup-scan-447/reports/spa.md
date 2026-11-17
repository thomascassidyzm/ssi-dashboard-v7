# spa — cleanup scan findings (#447, slice `spa`)

Courses: **spa_for_eng** (main) and **spa_mx_for_eng** (Mexican variant). Read live through Popty's script view on 17 Nov 2026, 13:45Z. **Nothing was changed, rendered or sent.**
Every row is in `spa.json` next to this file (course, family, row id, known, target, verdict, fix, confidence, source, canon ref, chars).
Audio cost = new target text × 2 voices + new known text × 1, counting only the sides that change. A deletion or a structural move costs 0.

## Headline

- **spa_mx_for_eng still has almost every fix that went into spa_for_eng since October.** Its seeds and rows still have the Spanish that Deborah and Kai's passes removed from spa_for_eng. The biggest is "I think" said with *pienso que*, while the same course also teaches *creo que*. That is a live LEGO clash, across 24 seeds and about 280 rows.
- spa_mx_for_eng also has build problems of its own: 159 seed sentences that the learner never says, 275 rows that do not contain their LEGO, and 10 LEGOs that say words their seed does not.
- spa_for_eng is mostly clean apart from what is already known. The new items are 127 duplicate rows, about 127 rows that use a word before it is taught (mostly *tomar el autobús* at seed 95), 13 LEGOs left behind when their seed was edited, and a handful of rows in the disfrutar, tener and practicar families.

| course | REAL rows (new) | of which need audio | new audio chars | KNOWN / not a defect (not counted) |
|---|---|---|---|---|
| spa_mx_for_eng | 895 | 445 | ≈ 35,600 | 113 |
| spa_for_eng | 322 | 173 | ≈ 22,600 | 165 |

A suggested order for the mx course: families A–K first (they copy rulings already made on spa_for_eng), then X/Y/Z (LEGO fixes), then AD/AE (the build repairs that follow from them).

---

## spa_mx_for_eng

### Fixed in spa_for_eng, still live here (the priority)

**A. "I think (that)" said with *pensar* instead of *creer*.** The course teaches S0047L01 "I think that | creo que" and also S0123L01 "I think | pienso", S0163L01 "I think that it's | pienso que es", S0318L01 "I don't think that | no pienso que", S0135L01 "you think | piensas" and S0210L01 "they think | piensan". So one English prompt has two answers. 365 played rows say *creo* and 144 say *pienso*.
- S0123L01B02 I think that | pienso que → creo que
- S0326L01U01 I don't think that she needs to buy a car | no pienso que necesite comprar un carro → no creo que necesite…
- S0165L01U06 do you really think it is interesting? | ¿de verdad piensas que es interesante? → ¿…crees que…?
- seeds 123, 135, 163, 185, 210, 255, 256, 261, 303, 304, 314–318, 325–339, 486, 492, 553
- **REAL: 284 rows.** These are 24 seeds, the 5 LEGOs above, and played rows. All 284 were matched by the rule below; 25 were read by eye.
- Fix: unify to *creer* (L34 step 1). This is the spa_for_eng creer switch (d/6321f2cd), plus Deborah's "I think = creo que throughout" (d/85773ddc). "What do you think", "think about" and past tenses stay on *pensar*, as they do in spa_for_eng. *Creo que* is just as standard in Mexico. Confidence: **sure**. Canon: K2, K22, L34.
- Audio: target only, **≈ 20,200 chars**.

**B. *disfrutar* + infinitive.** Seed 55 is "I don't enjoy waking up… | no disfruto despertarme…". spa_for_eng changed this seed to "no me gusta despertarme" (Deborah, item 9).
- S0055L01B03 I don't enjoy waking up | no disfruto despertarme
- S0073L01U02 … I enjoy speaking Spanish | disfruto hablar español
- S0101L01U04 I am enjoying speaking with you | estoy disfrutando hablar contigo
- S0206L01U04 "I enjoy practising with you every week | disfruto practicar hablando contigo". The English and Spanish also say different things here.
- **REAL: 24 (the seed + 23 rows), all read.** Fix: seed 55 and its rows become "no me gusta despertarme". The others become disfrutar + gerund (*disfruto hablando*). **likely.** Audio ≈ 2,100.

**C. *tomar … tiempo para*.** S0027 "I don't like taking too much time to answer | no me gusta tomar demasiado tiempo para contestar" is exactly the text that spa_for_eng replaced today with *tardar demasiado en contestar* (Path B, d/19f41c76). S0065 "It's important to take time to test yourself | tomar tiempo para…": spa_for_eng's seed 65 does not have it. S0094L03U05 "va a tomar tiempo para aprender".
- **REAL: 13 (2 seeds + 11 rows), all read.** Fix as in spa_for_eng. S0094L03U05 → "va a llevar tiempo aprender bien". **likely.** Audio ≈ 2,000.

**D–K. Deborah's seed corrections, one family each (all read, all REAL, all sure or likely):**

| family | rows | example (live) | fix (as spa_for_eng) | chars |
|---|---|---|---|---|
| D ordering with *tener* | 5 | S0414L05U02 could we have a table please? \| ¿podríamos tener una mesa…? | *podríamos pedir* (#472) | 617 |
| E *liderar el camino* | 9 | S0416 they want to lead the way next year | *liderar el proyecto* (#472) | 807 |
| F *para caridad* | 7 | S0437L03U01 queremos recaudar algo para caridad | *para una causa benéfica* | 516 |
| G *ha sido encantador* | 8 | S0567L02B02 it's been lovely \| ha sido encantador | *ha sido estupendo* (*muy bonito* is the more Mexican option) | 608 |
| H *sentirse más fácil* | 8 | S0122L01 to feel easier \| sentirse más fácil | "to get easier \| ser más fácil" (item 61) | 1,119 |
| I *me vio sintiéndome* | 11 | S0147L03U04 she saw me feeling nervous \| me vio sintiéndome nervioso | *me vio nervioso* (item 76) | 856 |
| J *no siento como si* | 4 | S0115 I don't feel as if I'm ready… \| no siento como si estuviera listo… | *no me siento listo…* | 516 |
| K *lo siento que* + indicative | 2 | S0139 I'm sorry that I need to leave so early \| lo siento que necesito irme… | "I'm sorry, but… \| lo siento, pero…" (item 71) | 279 |

Note on K: seeds 139 and 140 have no played rows with this phrase, so only the seeds change.

**L–T. Smaller row families (all read):**
- **L. bare *intentar*.** 5 REAL: S0079L01U05, S0086L02U08, S0088L01U05, S0134L01U09, S0147L03U08 "…voy a intentar" → *intentarlo* (Deborah item 16). **sure.** S0007L01B02/B03 are the same as spa_for_eng's held item 16, so they are **KNOWN**. 464 chars.
- **M. *practicar* + infinitive.** 2: S0058L04U02 "para practicar hablar español" → "para practicar español". S0060L02U04 → "practicar cómo decir…". 248 chars.
- **N. *sería … si* + present.** 2: S0090L03U05 "sería bueno si puedes ayudarme" and S0090L04U02. These need *pudieras*, which is untaught. Reword with an infinitive, or delete. 225 chars.
- **O.** S0281L01U04 "cuando termino quiero irme" → "si termino, quiero irme" (spa #658). 81 chars.
- **P. *sabía que* + present.** 16, all under seeds 109–146. Example: S0121L02U04 "he knew it's important to use what we learn | él sabía que es importante usar…". Fix: put the frame in the present on both sides ("él sabe que…"), as the 682-fix family did. The English "he knew it's…" is also not natural (K9). **likely.** 2,337 chars.
- **Q. *decir de*.** 3: S0277L01B03 "me dijo de la reunión" → "me dijo algo de la reunión". 212 chars.
- **R.** S0668L02U04 "espero que puedan ir aquí" → "ir allí". **S.** S0402L01U04 "no queremos parar en algún sitio" → "queremos parar en algún lado ahora". This row has a negative with *algún*, and *sitio* is the Spain word, while mx teaches *algún lado*.
- **T. Seed English says something else.** S0138 "this **was** where my friend wanted to meet us | aquí **es** donde…" → "this is where". S0419 "if they want people to **like** them | …les aprecie" → "appreciate" (as spa_for_eng). English only, 74 chars.

**Not counted (stated so Kai is not handed them twice):**
- **U. *practicar hablando*, 93 rows: KNOWN.** This is the same open question as spa_for_eng's #443 draft (d/34783671; Kai parked it as 44b). Whatever is ruled there applies here too, including the 20 rows that have a partner ("…con otra persona").
- *definitivamente* (50 rows): Deborah changed it to *sin duda* in spa_for_eng. In Mexico *definitivamente* = "definitely" is everyday usage (Fundéu calls it an anglicism). So this is a **preference, not a defect** (R0.18). Align only if Kai wants to.
- *dejarnos quedarnos* (S0604, 10 rows) is grammatical; spa_for_eng's *acogernos* was a style choice. *que lo que* in S0132 is grammatical with a slightly different meaning from *de lo que*. **Not defects.**

### spa_mx_for_eng's own build problems

- **V. One English, two Spanish (played LEGOs).** REAL 2 pairs:
  - "to know": S0045L01 *saber* vs S0133L02 *conocer*. Fix: S0133L03 "you get to know | llegas a conocer" already teaches it, so S0133L02 should grow or go.
  - "you are": S0128L01 *eres* vs S0194L01 *estás*. Fix: grow S0194L01 to "what are you | qué estás", as spa_for_eng does.
  - **likely**, 70 chars.
  - 12 more are gender or number pairs (bueno/buena, contento/contentos, tu/tus, amigo/amiga…). These are **KNOWN-class (K18 / clash C6)**: they wait for Kai's scoped mechanism.
- **W. A LEGO against a USE row.** 5 REAL:
  - S0095L01U04 "ready to go | listo para ir" (LEGO S0026L04 says *irme*)
  - S0176L04U01/U07 "next year | el próximo año" (LEGO S0176L05 says *año que viene*)
  - S0233L01U04 "he knows the answer | conoce la respuesta" (LEGO S0290L02 says *sabe*)
  - S0643L01 "do you want, sir | quiere usted": the LEGO has "sir" but no *señor*
- **X. A LEGO says words its seed does not (L26).** 10 REAL, all 13 hits read; 3 are clitic or contraction forms and are fine (L28):
  - S0101L03 "this one is different | este es diferente" (not in the seed at all)
  - S0101L02 "**discovering out** | descubriendo": not English → "finding out"
  - S0106L01 "to feel good | sentirnos bien" (the seed says *contentos*)
  - S0161L01 "not that one | no ese"
  - S0209L03 *en grupo* (the seed says *como grupo*)
  - S0217L01 "I took it | lo tomé" (the seed says "I had | tomé")
  - S0277L02 "early next week | a principios de la **próxima** semana": the seed says *semana que viene*, and the LEGO is 13 syllables, over the L3 cap
  - S0424L02 "to waste time | hacer perder el tiempo" (the seed says *haciendo*)
  - S0511L01 "a piece of news | noticia" (the seed says *la noticia*)
  - S0241L02 *darle* (the seed says *dárselo*; best guess)
- **Y. Not-new LEGO never taught earlier.** 8 REAL (L31): S0041L03 *sentirme*, S0106L03 *solo*, S0111L02 *nuevo*, S0123L03 *buena*, S0138L04 *reunirse*, S0207L01 *hiciste*, S0246L01 *ocupada*, S0257L01 *azul*. Their baskets never play. Fix: make them NEW. 6 more are **not a defect**: stray component LEGOs next to a NEW LEGO of the same seed that contains them, for example S0137L01 "often | menudo" beside S0137L02 "often | a menudo". They are never played.
- **Z. Same LEGO taught as NEW twice.** 5: S0079L01 *cuándo*, S0096L02 *todavía*, S0134L02 *trabajas*, S0173L03 *solo*, S0209L01 *más*. Fix: make the later one not-new and move its rows (P25). 0 chars.
- **AC. A word used before it is taught.** 15 REAL: *buscar* ×8 before seed 610 (use *encontrar*, taught at 195, or delete), stressed *tú* ×6 (never taught), and *mandar* ×1. 1,441 chars. The detector's other 6 hits are words that are in an earlier seed sentence (K29).
- **AD. A row does not contain its LEGO (P17).** 275 rows under 46 LEGOs. Typical case: the S0101L03 basket "este es importante / este es muy divertido…" under "este es diferente". Most of these are knock-ons of X: the rows practise what the seed says and the LEGO does not. **Read at LEGO-group level: 46 groups, about 3 rows each by eye (≈140 read, ≈135 not read).** Fix: fix the LEGO first, then make each row hold the whole LEGO or delete it.
- **AE. Seed sentence not in any played basket (P26).** 159 seeds (list in JSON). Fix: add the seed as a USE row under its last new LEGO, reusing the seed's own clips. 0 chars.
- **AA.** 2 duplicate rows (S0033L01U01, S0385L01B02). **AB.** 4 rows with a question mark on one side only (S0405L01U06, S0410L01U08, S0423L02B03, S0569L02B01).
- **Female voice saying the male form (not measured, text count only).** spa_mx_for_eng's target voices are Carlota (f) and Luciano (m). By text, 31 seeds, 9 LEGOs and about 414 played rows carry a first-person masculine form (*estoy listo / contento / seguro / cansado…*). That is **≈ 454 slots at risk, ≈ 16,800 chars for one female re-record**. The same text count on spa_for_eng gives 689 slots against the 734 that #131 measured, so it runs about 6% low. This is at risk, not confirmed: no clip was heard, and no ledger was read.

---

## spa_for_eng (new findings only)

- **B. *disfrutar* + infinitive.** 7 new: S0055L01B03/B05/U01/U03 (the basket still says *disfruto despertarme* although seed 55 is now *no me gusta*), S0108L02U09, S0216L04U14, S0243L03U08. Fix: disfrutar + gerund. **likely**, 636 chars. 4 more are **KNOWN** (d/85773ddc: S0206L02 ×2, S0214L02U06, S0110L03U11).
- **D. *could I have* = *tener*.** 3: S0586L01U01 and S0586L02U02 "¿podría tener unos huevos cocidos?" → *pedir*, following the S0414 ruling; S0156L02U02 "¿Puedo tener un momento…?". 384 chars.
- **C.** S0189L01U03 "tomar algo de tiempo para pensar" → *tomarse*. **M.** S0060L01U11 "practicar decir" → "practicar cómo decir". This is the sibling of item 10.
- **V. "I know": *sé* (S0059L01) vs *conozco* (S0085L01, S0230L01).** Fix: grow *conozco* (for example "I know people | conozco a personas"). **likely.** amigo/amiga is KNOWN-class (K18).
- **W.** S0653L01 "does it matter to you **sir** | le importa", S0662L01 "you all speak it | lo habláis", S0663L01 "what you all said | lo que dijisteis". The LEGO's English says more than its Spanish. Fix: grow these to the seed (*todos lo habláis*, *lo que dijisteis todos*) or drop "sir". 130 chars.
- **X. LEGO left behind when its seed was edited (L26).** 13 REAL out of 19 read; the other 6 are clitic or contraction forms. Examples:
  - S0038L01 *llevo todo el día aprendiendo* (the seed says *una semana*)
  - S0509L01 *escuché* (the seed says *oí*)
  - S0528L02 *se supone que debo guardar* (the seed says *debería guardar*)
  - S0563L02/L03 *seguir adelante*, *por más tiempo* (the seed says *seguir más tiempo*)
  - S0578L01 *algún lugar más cálido* (the seed says *un sitio*)
  - S0580L01 *hemos querido a menudo* (the seed says *muchas veces*)
  - Fix: re-cut each to the seed's words. 696 chars.
- **AC. A word used before it is taught.** ≈127 rows REAL. All 218 hits were read once words already met in an earlier seed sentence were counted as taught; plural/gender endings and fused clitics were then set aside.
  - The biggest group is the S0095L02 basket, 19 rows of "tomar el próximo autobús". *tomar* is taught at 630; seed 95 says "ir … en el próximo autobús", so → "ir en el próximo autobús".
  - Then *tú* ×12 (never taught), *con nosotros* ×11 before 138, *pienso en* ×10, *siempre* ×9, and untaught subjunctive or past forms (*vaya*, *esté*, *conozca*, *pasó*…).
  - Fix: reword with taught forms or delete (K14/K15). **best guess** per row, ≈ 19,500 chars if all are reworded rather than deleted.
  - The 4 *camino* rows are KNOWN (d/85773ddc).
- **AA. 127 duplicate rows in their own basket**, for example S0040L01U01 = B03 "¿Cómo te sientes hoy?". Delete one of each pair after checking the basket floor. 0 chars. These are exact-equality matches; 8 were read by eye.
- **AE. 22 seeds not in a played basket** (71, 138, 144, 238, 241, 277, 279, 285, 349, 374, 420, 450, 493, 509, 510, 528, 532, 534, 563, 578, 581, 656). Fix as above, 0 chars.
- **AB. 12 rows with a question mark on one side only.** Mostly the S0569/S0572 builds "have you decided | ¿has decidido?". S0177L01B03 "To where she wants" is also garbled English. 351 chars.
- **AD.** 4 real P17 breaks: S0251L01B03, S0249L01U08, S0419L02U02 and S0162L01U12. The other 53 hits are KNOWN (S0277L01 *la reunión* ×8 and S0231L02 ×6, d/85773ddc) or are clitic, contraction or article forms that still contain the LEGO.

**KNOWN and not counted:** notnew_untaught 20 and dup_debut 12 (#509 inverted duplicates, d/19206424, d/85773ddc), practicar hablando 146 (#443), "elderly" S0231L02, S0567L03 "watching", S0480/S0537/S0619 wrong-word rows, S0277L01 article drift, camino ×4.

**Not a defect (mechanism):**
- *siento como si* + imperfect subjunctive (12): grammatical.
- *dijo que quiere* (42): reported speech with a present that is still true is grammatical on both sides.
- *cuando* + present (25): habitual, not future.
- *le gusta cuando* (6): colloquial, fine.
- *de la misma manera* (3): a decir_de false positive.
- *que lo que* comparing two clauses: correct.
- *algo que quiero intentar*: the relative *que* is the object.
- *por más tiempo* "any longer" in S0563: acceptable outside the KNOWN S0619 row.

---

## Coverage

| family | spa_for_eng | spa_mx_for_eng |
|---|---|---|
| lexical, orchestrator's 11 patterns | scanned, all hits read | scanned, all hits read |
| lexical, 33 patterns added here (spa.patterns.json, every one passes calibration on its pre-fix positive) | scanned, all hits read except pensar 0 hits | scanned; all read except A (25 of 284 by eye) and definitivamente (not counted) |
| spa pre-fix text matched against mx rows (548 before-texts from ops/spa-* undo files and 18 docs) | — | scanned: 45 matches, all read, folded into A/D–K |
| seed sentences (lexical detector skips seeds) | scanned separately | scanned separately |
| zut_lego / zut_use | all read | all read |
| notnew / dup_debut | KNOWN | all read |
| lego_not_in_seed **target** | 19 of 19 read | 13 of 13 read |
| lego_not_in_seed **known** | **25 of 166 read, rest not read (GAP)** | **25 of 269 read, rest not read (GAP)** |
| lego_syll 7–8 / over 8 | **listed only (101 / 30), not hand-recounted, no shorter cuts proposed (GAP)** | **41 / 1 listed; only S0277L02 judged** |
| phrase_missing_lego | 57 read | 275: group level, ≈140 read |
| dup_rows | 127 exact matches, 8 by eye | 2 read |
| seed_not_played | 22 | 159 |
| untaught_target | 218 read after the seed-sentence recount | 21 read |
| qmark / article_drift | all read | all read |
| female male-form | measured by #131/#142 (KNOWN) | text count only (at risk) |
| intros, clip-vs-text, grammar beyond the detectors | not scanned | not scanned |

## Gaps

- Known-side LEGO-not-in-seed was not hand-read: 141 rows in spa_for_eng and 244 in spa_mx_for_eng. Most hits are contractions or inflections ("I'm" / "I am"), but real ones are mixed in (S0101L02 "discovering out" was one).
- No shorter LEGO cuts were proposed for the 7–8 and over-8 lists. Kai asked for these on 17 Nov.
- In spa_mx_for_eng, family AD was read by group, not row by row.
- The female-voice figure for mx is a text count, not a measurement: the TTS ledger is outside this workspace and no clip was heard.
- spa_for_eng's #443 practicar draft and S0027 Path B were applied or ruled today. This scan reads S0027 as applied in spa_for_eng (the detector found 1 tomar-tiempo row, down from 13 this morning).
- Popty's audit-event history is admin-only and was not read. The fix history came from `ops/spa-*` and the 18 published docs.
