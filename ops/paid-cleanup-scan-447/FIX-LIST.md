# Paid courses cleanup scan: fix list (#447·AI, 17 Nov 2026)

**Status: PARTIAL. 6 of 50 paid courses have a hand-read fix list (Spanish, Mexican Spanish, Portuguese, Brazilian Portuguese, French, Canadian French). The other 44 have machine candidate counts only.** The surface allowed this job three workers and refused the rest ("Three children already dispatched: Watson must approve more"). Nothing was applied, rendered, linked or sent to anyone.

## The short version

| course | new real rows | audio if all fixed | biggest items |
|---|---|---|---|
| spa_mx_for_eng | 895 | ≈35,600 chars | "I think" taught as both *creo que* (S0047L01) and *pienso* (S0123L01); Deborah's seed corrections (27, 55, 65, 115, 122, 139, 140, 147, 414, 416, 437, 567) never made here; 159 seed sentences never said; 275 rows without their LEGO |
| spa_for_eng | 322 | ≈22,600 chars | 127 duplicate rows; ~127 rows using a word before it is taught; 13 LEGOs left behind by seed edits |
| por_br_for_eng | 1,719 | ≈21,100 chars | ~1,170 filler rows from seed 400 on ("no, of the holidays"), all deletes; 86 rows with European forms |
| por_for_eng | 1,074 | ≈14,200 chars | 495 duplicate rows; 110 rows on untaught *perguntou/perguntaram*; 37 rows where the person does not match |
| fra_ca_for_eng | 137 + a 96-row formal block | ≈14,300 chars | formal "sir/madam" seeds 639–655 glossed "you all"; "to meet \| se voir"; 33 seed sentences never said |
| fra_for_eng | 193 | small | 21 baskets drilling less than their LEGO; 56 untaught forms; 27 LEGOs over 8 syllables; 487 duplicate rows |

Items already on Kai's held or ruled lists are marked KNOWN in each section and are not in these numbers.

## Checked by the orchestrator against live rows (17 Nov)

- **spa_mx "I think":** confirmed. S0047L01 is "I think that | creo que", S0123L01 is "I think | pienso", S0163L01 "I think that it's | pienso que es". Of 502 played rows starting "I think", 136 say *pienso que* and 363 *creo que*. The worker's ~284 also counts rows where "I think" is not first; I did not recount those.
- **por_br filler:** confirmed as a pattern. 1,061 played rows are "yes / no / that's true / I'm sure" plus the bare LEGO, and 1,047 of them sit in seeds 400–699. **Caution:** a few of these are good sentences ("no, thank you | não, obrigado", "yes, that's a good idea"). The worker read only part of this family, so walk it by sample before any bulk delete.
- **"22 seeds with no LEGOs" (por 12, por_br 10):** consistent with the live read: those seeds are missing from Popty's script view, which lists a seed only when it has a LEGO. **This affects every course:** the seed counts below 668 in the candidate table are the same thing. Kai ruled on 4 Nov that a seed with no NEW LEGO is fine; a seed with no LEGO at all is a different case (12 Nov: every part of a seed is a LEGO, taught parts listed not-new), so it is listed for his call, not as a defect.
- **fra_ca formal block:** confirmed. S0639L01 is "you all | vous", and S0642–S0646 follow ("could you all | pourriez-vous").

## Coverage: which patterns were scanned where

All 17 mechanical families in `patterns.md` were RUN on all 50 courses (candidate counts, not findings: `candidate-counts-2026-11-17.txt`). They were READ BY HAND only in the six courses above. Lexical patterns from the fix history: 33 Spanish, 11 Portuguese, 19 French, each calibrated on a pre-fix example. No lexical patterns exist yet for Italian, German, Arabic, Japanese, Korean, Chinese or the English-target courses.

**Not hand-read at all (44 courses):** ita_for_eng; deu_for_eng, deu_at, deu_ch; ara_for_eng, ara_eg, ara_lb, ara_sy; jpn_for_eng; kor_for_eng, kor_for_hin, kor_for_tam; zho_for_eng, zho_for_hin, zho_for_tam, zho_for_jpn, zho_for_gle; eng_for_ spa, fra, deu, ita, por, jpn, kor, zho, ara, hin, ben, guj, mar, pan, urd, kan, tam, tel, sin; spa/fra/deu/ita `_for_jpn` and `_for_zho`.

Candidate counts worth a look before anything else (unread, may be artefacts): played rows with an empty audio slot: eng_for_pan ~615, eng_for_mar ~454, eng_for_tel ~428, ara_eg ~345, ara_lb ~333, eng_for_guj ~200. The ara_eg/ara_lb figure disagrees with the 12 Nov fill record ("0 empty t1/t2") and has not been reconciled.

## Gaps

- **44 courses unread** (above). The slice briefs are ready in `ops/paid-cleanup-scan-447/dispatch-slices.py`.
- **Inside the six courses,** not read row by row: 7–8 syllable LEGOs (no shorter cuts proposed anywhere); English-side "LEGO says words its seed doesn't" (spa 141, spa_mx 244); "question without ?" (fra 187, fra_ca 398); about half of spa_mx's 275 missing-LEGO rows; most of por_br's 427 "whole clause behind yes/no" rows; intros (five LEGOs in Portuguese only).
- **Female voice saying the male form:** no measurement possible here. Text-only at-risk counts: spa_mx ≈454 slots, fra_ca 376 rows, por_br 310 rows.
- **Audio characters are estimates** from text length (target × 2 voices, known × 1), not render dry runs.
- **Fix history:** Popty's edit-event history needs an admin login and was not read; history came from `ops/` records and published docs. Kai's chat archive stops at 19 Aug. Recommendations cite dictionaries and grammars, not a native speaker.
- **ara_sy_for_eng** returned no seeds through the script view.
- **Paid list:** released courses with a Big-10 target (48) plus drafts deu_ch and ara_sy. Empty draft shells and Welsh were left out. Side note for Tom's room, not scanned: `isPremiumCourse()` in the learning app tests the text before `_for_`, so a code like `spa_mx` or `por_br` is not in its Big-10 list.

## Jobs and accounts

| job | slice | account | model |
|---|---|---|---|
| #447·AI | orchestrator | kai-gmail | fable |
| #453·AI | spa_for_eng, spa_mx_for_eng | kai-gmail | opus |
| #454·AI | por_for_eng, por_br_for_eng | kai-gmail | opus |
| #455·AI | fra_for_eng, fra_ca_for_eng | kai-gmail | opus |

All four on kai-gmail. Eleven further dispatches were refused and never ran (numbers #456–#459 and #464 are void).

---

## spa — cleanup scan findings (#447, slice `spa`)

Courses: **spa_for_eng** (main) and **spa_mx_for_eng** (Mexican variant). Read live through Popty's script view on 17 Nov 2026, 13:45Z. **Nothing was changed, rendered or sent.**
Every row is in `spa.json` next to this file (course, family, row id, known, target, verdict, fix, confidence, source, canon ref, chars).
Audio cost = new target text × 2 voices + new known text × 1, counting only the sides that change. A deletion or a structural move costs 0.

### Headline

- **spa_mx_for_eng still has almost every fix that went into spa_for_eng since October.** Its seeds and rows still have the Spanish that Deborah and Kai's passes removed from spa_for_eng. The biggest is "I think" said with *pienso que*, while the same course also teaches *creo que*. That is a live LEGO clash, across 24 seeds and about 280 rows.
- spa_mx_for_eng also has build problems of its own: 159 seed sentences that the learner never says, 275 rows that do not contain their LEGO, and 10 LEGOs that say words their seed does not.
- spa_for_eng is mostly clean apart from what is already known. The new items are 127 duplicate rows, about 127 rows that use a word before it is taught (mostly *tomar el autobús* at seed 95), 13 LEGOs left behind when their seed was edited, and a handful of rows in the disfrutar, tener and practicar families.

| course | REAL rows (new) | of which need audio | new audio chars | KNOWN / not a defect (not counted) |
|---|---|---|---|---|
| spa_mx_for_eng | 895 | 445 | ≈ 35,600 | 113 |
| spa_for_eng | 322 | 173 | ≈ 22,600 | 165 |

A suggested order for the mx course: families A–K first (they copy rulings already made on spa_for_eng), then X/Y/Z (LEGO fixes), then AD/AE (the build repairs that follow from them).

---

### spa_mx_for_eng

#### Fixed in spa_for_eng, still live here (the priority)

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

#### spa_mx_for_eng's own build problems

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

### spa_for_eng (new findings only)

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

### Coverage

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

### Gaps

- Known-side LEGO-not-in-seed was not hand-read: 141 rows in spa_for_eng and 244 in spa_mx_for_eng. Most hits are contractions or inflections ("I'm" / "I am"), but real ones are mixed in (S0101L02 "discovering out" was one).
- No shorter LEGO cuts were proposed for the 7–8 and over-8 lists. Kai asked for these on 17 Nov.
- In spa_mx_for_eng, family AD was read by group, not row by row.
- The female-voice figure for mx is a text count, not a measurement: the TTS ledger is outside this workspace and no clip was heard.
- spa_for_eng's #443 practicar draft and S0027 Path B were applied or ruled today. This scan reads S0027 as applied in spa_for_eng (the detector found 1 tomar-tiempo row, down from 13 this morning).
- Popty's audit-event history is admin-only and was not read. The fix history came from `ops/spa-*` and the 18 published docs.

---

## Portuguese (por_for_eng + por_br_for_eng): cleanup scan findings (#447, slice por, job #454)

17 Nov 2026. I only read. Nothing was applied, rendered, linked or sent. I re-read both courses live through Popty's script-view at 13:45Z. Row ids are live. Every row is in `por.json` beside this file.

**Totals, new findings only.** Items already on a held or ruled list are marked KNOWN and are not counted.

- **por_for_eng: 1,074 rows**, ≈ **14,200 characters** if every fix is made. Most of them are deletes, which cost nothing.
- **por_br_for_eng: 1,719 rows**, ≈ **21,100 characters**. 1,317 of those rows are machine filler to delete, at 0 characters.

How I counted characters: target text × 2 voices, plus known text × 1, and only for the sides that change. A delete costs 0. An intro is about 45 characters. Every figure is an estimate from text length. None comes from a render dry run.

### The headline, in four lines
1. **Most of por_br's practice from seed ~400 to 668 is filler.** 1,167 rows are just "yes, / no, / that's true, / I'm sure" in front of the bare LEGO ("no, of the holidays | não, das férias"). Another 174 are "LEGO + now/today/here". Deleting them all still leaves 1,343 of the 1,412 new LEGOs with at least 5 real rows each.
2. **por_for_eng's late seeds (490–667) have their own template fault.** Rows read "she/he/they said/asked …", but the Portuguese keeps the seed's person: "she said they would have bought | ela disse que **nós** teríamos comprado". Many also use *perguntou/perguntaram*, which are never taught.
3. **Fixes made in one course and not the other.** Both ways are listed under "Cross-course" below.
4. **22 seeds in the two courses have no LEGOs at all**, so they are never played. #426 had noticed only seed 43.

---

### por_for_eng (European)

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

### por_br_for_eng (Brazilian)

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

### Cross-course (the priority)
- **Fixed in por, checked in por_br:** #416's seed-copy repairs (319, 326, 332, 335, 346, 359, 382, 465, 469). All already read correctly in por_br. Nothing to carry.
- **Fixed in por_br, checked in por:** #432's copy repairs (14, 98, 115, 130, 205, 227, 311). por never had these defects. The *pensar em* rows #432 did not carry to its own baskets are B5.
- **Found in por_br, missing from por's lists:** the made-up-gloss items 122, 127, 137, 620 and 49 (P4).
- **Same defect in both, listed in neither:** S0207L01 and S0257L01 not-new but never taught; "com eles" baskets (S0134L03 in por, S0134L04 in por_br) practising *para eles / sobre eles*; no-LEGO seeds.
- **Only in por:** the "she said / asked" person and *perguntou* template (P1, P2); 495 duplicate rows; 46 empty slots.
- **Only in por_br:** the yes/no/that's-true template (T1), the seed 250–292 artefact block (T3), and the European forms (B1).
- **Variety check:** the European course is clean of Brazilian forms. The only hit is *tomar o comboio* in S0450L01U05 (P6).

### Coverage

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

### Gaps (honest)
- **The 7–8 syllable band was not read** (143 + 88). It is the "shortest cut" list Kai asked for, so it remains open.
- **Intros were not scanned** beyond the five LEGOs above. The committed intro-mirror tools were not run.
- **Audio by ear: nothing.** The empty-slot and at-risk counts come from clip ids and text only (A22).
- **T1b's 427 rows were classified by structure and read only in part.** A few may be a seed's own yes/no answer, which is why they are marked "likely", not "sure".
- **Character figures are text-length estimates.** B2's figure is an upper bound. Library hits will lower all of them.
- The orchestrator's count of 69 not-played seeds for por includes nothing new. The 22 no-LEGO seeds in S2 are new; the dump route omits them, so the scan found them by their missing seed numbers.
- **Online sources** are dictionary-level only (Priberam, plus general BR usage). No corpus counts were made.

---

## French slice — cleanup scan findings (#447, worker #455)

Courses: **fra_for_eng** (main) and **fra_ca_for_eng** (Québec variant). Read live through Popty on 17 Nov 2026 (dump 13:45Z). **Nothing applied, rendered or linked.**
Row-level list: `ops/paid-cleanup-scan-447/reports/fra.json` (330 REAL rows). French patterns: `fra.patterns.json`.

**One thing to know first.** fra_ca is not a copy of fra_for_eng. It shares 650 of 664 English seeds but almost none of the French: 46 seed targets and 985 of ~12,000 practice rows match. So "a fix made in main and still live in the variant" means the same *rule* broken again in fra_ca's own French. It does not mean the same row. Québec forms (`chu`, `j'pense pas que c'est`, `qu'est-ce qui` in an indirect question, `là` as a filler, dropped `ne`) are right in fra_ca and are not listed.

Audio characters below = new known text × 1 + new target text × 2 voices. A delete or a relink costs 0. LEGO re-glosses add about 24 characters for the intro. All counts are estimates (±10%).

---

### PRIORITY — fixes made in fra_for_eng that are still live in fra_ca_for_eng

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

### fra_ca_for_eng

#### 1. Formal "sir/madam" seeds taught as "you all" — 15 LEGOs, 96 rows (REAL)
Seeds 639–655 are formal and singular ("do you want sir?"). Their LEGOs say "you all", so the learner hears the plural prompt. Seeds 657–668 then teach "you all" as `vous-autres`. One English prompt now has two answers, and the honorific never reaches most phrases.
- S0643L01 `do you all want | voulez-vous` → `do you want sir | voulez-vous monsieur`
- S0646L01 `you all are doing | vous faites`, row B04 `you're doing trouble | vous faites du trouble` (nonsense)
- S0639L02U02 `yes sir again | oui monsieur encore`, U03 `thank you sir right now` (nonsense)
- S0650L01, S0652L01, S0654L01 have no honorific at all.

**Fix:** use fra_for_eng's live shape. The LEGO carries sir/madam on both sides (K32). Every phrase ends in sir/madam on both sides. Delete the nonsense rows. **Canon:** K32, K2, L26. **Chars:** about 1,100 for LEGOs + intros, about 9,950 for the 96 phrases (rows that are deleted cost 0). **Confidence:** sure.

#### 2. Plural seeds: LEGOs say "you guys", seeds say "you all" — 12 LEGOs (REAL)
S0657L01 `you guys feel` (seed "how do you all feel?"), S0665L01 `do you want to go, you guys`, S0668L03 `of it, to go there`.
**Fix:** once item 1 frees "you all", re-gloss each LEGO to the seed's English. Known side only. **Canon:** L26. **Chars:** ~560. **Confidence:** likely.

#### 3. "to meet | se voir" — 1 LEGO + 9 rows (REAL, Kai's seed-18 ruling)
The `se` means "each other", and the English does not show it. With one subject it means "see himself": S0018L02B02 `he wants to meet | y veut se voir`, S0018L02U02 `she wants to meet with everyone else | a veut se voir avec tout le monde`, S0039L03U03, S0040L02U04.
**Fix:** grow S0018L02 to `we want to meet | on veut se voir`, as #449 did in main. Rewrite the singular rows with `on`, or delete them. **Source:** Kai 14 Oct (d/3cd81832). **Chars:** ~65 for the LEGO; rewrites ≈ 9 × 60 if kept rather than deleted. **Confidence:** sure.

#### 4. Verb LEGOs without "to" — 8 (REAL)
S0222L02 `tell me | me dire`, S0235L03 `tell you`, S0334L02 `let you`, S0351L01 `leave me`, S0530L03 `count`, S0108L02 `waking up`, S0505L02 `get myself`, S0518L01 `myself imagine` (also not English).
**Fix:** add "to" (`to tell me`, `to imagine myself`…). **Canon:** K54, K41. **Chars:** ~290.

#### 5. Gapped LEGOs and the two ZUT clashes they cause — 4 (REAL)
S0079L02 `when...? | quand est-ce que` clashes with `when | quand`. S0631L01 `what...? | qu'est-ce que` clashes with `what | ce que`. The French is not gapped; the "..." is a label.
**Fix:** S0079L02 → `when did you | quand est-ce que t'as`. S0631L01 → the whole seed `what would you like? | qu'est-ce que tu voudrais ?`, taught after `you would like`. S0505L01 → `so that I don't | pour pas`. S0490L02 → `I'll never again | m'as pus jamais` (best guess; the full frame is over 8 syllables). **Canon:** L32, K11, L34. **Chars:** ~150.

#### 6. Literal-gloss LEGO English — 35 read as REAL
The English translates the French word for word instead of using the seed's words, and the phrases copy it. S0139L02 `obliged to` (seed "need to"), S0139L03 `just as bright and early`, S0358L01 `your female friend`, S0106L03 `to labour`, S0136L02 `gal-friend`, S0527L03 `recounted to me`, S0600L03 `to what extent`, S0470L01 `up to what height`.
**Fix:** re-gloss to the seed's English and carry it into the phrases. **Canon:** L26, K9. **Chars:** ~1,500 for LEGOs + intros. Phrase English adds more where rows repeat the gloss.
Also read: 141 hits were only an inflection or a small word ("started", "that", "the"). The same shape is live in main, so not listed. The rest of the 103 are the "you guys" LEGOs (item 2) or natural English synonyms ("properly", "this job", "it doesn't bother me"). The synonyms break L26, but nothing is wrong for the learner, so they are not counted.

#### 7. Smaller items (REAL)
- S0283L02 `they speak | parlent` → `y parlent` (Kai 14 Oct pronoun ruling). ~45 chars.
- S0115L02 `I was | j'étais` → flip to not-new (taught at S0026L03). 0.
- S0251L02 `before we finish` → `until after we finish` (Tom 15 Oct). ~45.
- S0605L02 `need for help` → `need help`, and its 6 rows `I have need for help…` → `I need help…`. ~200.
- S0493L01 `what is it that's happening | qu'est-ce qui arrive` is not in seed 493 ("s'en vient après"). Re-cut to the seed; its 8 rows say "we should know what is it that's happening". ~110 + row English.
- S0488L01 `de l'autre bord de ça` (seed: `de cette ligne`) → `de l'autre bord de`. S0220L02 `to watch | écouter` (seed: `écouté`) → retire.
- Question marks: S0643L01U01 and seed 643 `voulez-vous monsieur` need "?"; S0659L02U01 needs "?"; S0650L01U03 `do you want to go right now again` → delete. ~120.
- Duplicate rows S0231L01U06, S0647L01U01 → delete. 0.
- Over 8 syllables: S0613L01 `on aurait probablement acheté` → `probably | probablement` + `we would have bought | on aurait acheté`. My count found 3 more at 9 (S0293L02, S0354L01, S0461L01). Those are within the counter's ±1, so they are not listed.

#### 8. Seed sentence not in a played basket — 33 seeds (REAL, 0 chars)
24 have a near copy whose English drifted to the literal gloss: S0527L04U01 `guess who recounted to me that funny story`, S0622L02U01 `I was aware that…`, S0559L03U01 `did you found the path through the wood?` (also bad English). 9 have no copy (80, 150, 152, 215, 239, 244, 315, 337, 421).
**Fix:** set each copy's English to the seed's and relink the seed's known clip. Add the 9 missing copies reusing the seed's clips. **Canon:** P26.

#### 9. AT RISK, not counted — female voice reading masculine forms
376 played rows carry a 1st-person masculine form (`chu prêt`, `j'étais content`). Sylvie (fr-CA, female) is one of the two target voices. Main found 233 such clips and re-recorded them (#142/#243). Nothing here was heard (A22). Whether fra_ca has gender expansions could not be read.

**fra_ca total (REAL): 137 rows/LEGOs in fra.json + the 96 formal-block phrases ≈ 14,300 characters**, most of it the formal block.

---

### fra_for_eng

Everything already on the held lists (d/b6a2a5d7, d/562e6297, d/281de4ee, d/1d0c7e9f) is marked KNOWN in fra.json. It is not counted here: seeds 82, 116, 170, 174, 238, 240, 248, 275, 278, 280, 319, 326, 480, 543, 600, the ZUTs move/happy/how much, 358/210/217 dropped objects, 642/651, 501, 167, capitals.

#### 1. `je ne pense pas que c'est …` — 5 rows (REAL)
S0318L01U02–U06, e.g. `I don't think it's true | je ne pense pas que c'est vrai`. Seed 330 teaches the subjunctive for exactly this English (`je ne pense pas que ce soit vrai`), so the same prompt has two answers. At seed 318, `ce soit` is not taught yet.
**Fix:** delete, or reword with the seed's own `qu'elle pourrait` ("I don't think she could come"). **Source:** Lawless French, *penser que*; course seed 330. **Canon:** K14, P16. **Chars:** ~550 if reworded. **Confidence:** sure.
Not a defect: S0387L02 and S0139L04U03 (`je ne pensais pas qu'elle avait raison`). Seed 387 itself uses the past indicative.

#### 2. Grammar caught by the fix-record patterns — 6 rows (REAL)
- S0657L01U02/U03 `je veux savoir comment vous sentez-vous tous` → `comment vous vous sentez tous`. This is the plural twin of held S0642. ~180.
- S0666L01U04 `j'aimerais savoir qu'est-ce que vous pensez tous` → `ce que vous pensez tous`. #195 fixed only the English. ~90.
- S0469L01B02 `that doesn't mean anything | … grand chose` → `that doesn't mean much | grand-chose`. ~30. S0555L04B02 spelling only, 0.
- S0413L01B03 `no we could | non nous pourrions` contradicts itself → delete. 0.

#### 3. Basket drills a smaller piece than its LEGO — 95 rows in 21 baskets (REAL)
The LEGO grew, but its rows still drill the old small piece:
- S0644L01 `could you say that sir?`: 8 rows drill `cela` (`I know that | je sais cela`; B03 `oui cela c'est ce que je veux` is not French).
- S0481L01 `le seul vrai espoir`: rows `only that | seul ça`.
- S0478L03 `un cœur si gentil`: rows `kind | gentil`.
- S0246L01 `voulais qu'elle t'aide`: rows say `veux` (K50: a different verb form).
**Fix:** delete the BUILD fragments; rewrite USE rows to carry the whole LEGO, or delete them while the basket keeps enough rows. **Canon:** P17, K50. **Chars:** 0 if deleted; ~60 per rewritten row.
Not a defect (read): about 200 hits are French elision (`qu'il`, `d'un`, `l'homme`), sir↔madam swaps (K32), or K31-type words inside the LEGO.

#### 4. Seed copies parked in the wrong basket — 4 rows (REAL)
S0126L01U09, S0170L01U09, S0170L01U10, S0152L03U09 are sentences of seeds this course does not have ("no unfortunately I've got too much work"). None contains its LEGO. **Fix:** delete. 0.

#### 5. LEGO not in its own seed — 4 (REAL), plus 1 gapped
- S0324L02 `books | livres` sits in "that student has both of her hands up" → retire.
- S0324L05 `to raise | lever` (the seed says `levées`, already in L06) → retire.
- S0554L02 `the towel | la serviette` (the seed says `cette serviette`) → retire.
- S0140L01 `I can't see | je ne peux pas voir` (the seed says `ne pas pouvoir voir`) → re-cut. ~90.
- S0644L02 `could you sir? | pourriez-vous monsieur ?` is gapped (L32) and unplayed → retire. 0.

#### 6. Untaught target forms — 56 rows (REAL)
The tool's 450 hits were mostly elision. Recounted with elision split and words inside earlier chunks counted as taught: 67 left. Of those, 9 are not a defect (`savait` sounds like `savais`, taught at 375, and plural endings) and 2 are KNOWN. Biggest groups:
- `savait` before 375 (S0225, S0365, S0366, S0372): 9 rows.
- `pouvez-vous` before 174: 5 rows.
- `tu penses que` before 135: 3 rows.
- Subjunctives after `c'est intéressant que` / `bien que` (S0120, S0178): 6 rows.
- `poser une question` before 202: 4 rows.
- S0080L02U10/U11 `tu me demandes de quand…`: untaught, and `de quand` is wrong.
- S0094L02U11 `la façon que` (should be `dont`).
**Fix:** delete, or reword with forms taught by then. **Canon:** K8, K14, K15. **Chars:** 0 if deleted.

#### 7. Seed sentence not played — 10 new (REAL, 0 chars)
Seeds 28, 49, 139, 140, 516, 582, 614, 646, 655, 661. Each has a near copy with different English ("as soon as possible" for "as soon as you can", "you are" for "you're"). **Fix:** add the exact seed row, reusing the seed's clips (P26). 14 more are KNOWN.

#### 8. Over 8 syllables — 27 new LEGOs (REAL, hand-estimated ±1)
Most are whole-seed LEGOs: S0088L01 (19), S0057L01 (18), S0193L01 (15), S0167L01, S0230L01, S0255L01 (14), S0227L01, S0245L01, S0247L01, S0256L01 (11), S0077L02, S0087L01, S0222L01, S0253L01, S0287L01, S0562L04 (10), S0140L02, S0166L01, S0191L01, S0203L03, S0208L01, S0277L02, S0288L01, S0518L02, S0652L01, S0653L02, S0655L01 (9).
**Fix:** cut each to its new part. Example: 193 → `too busy | trop occupé` (`je suis désolé`, `mais`, `aujourd'hui` are taught). 652/653/655 are over only because K32 added the honorific, so they are Kai's call. **Canon:** L3 (Kai 17 Nov: shortest viable cut). **Chars:** a new intro + LEGO per cut, ~70 each. The 105 LEGOs at 7–8 are not listed one by one.

#### 9. Verb LEGOs without "to" — 5 (REAL)
S0055L01 `waking up`, S0091L02 `think`, S0251L01 `find out`, S0287L02 `watching`, S0508L02 `worrying` → "to …". ~180.

#### 10. Duplicate rows — 487 exact twins (mechanical count, REAL as a class)
Same English, same French and same clip twice in one basket: 268 BUILD=BUILD, 198 USE=BUILD, 21 USE=USE. Almost all are in seeds 1–299. In 34 more pairs the BUILD twin dropped the "?" of a question (`are you learning his name | apprends-tu son nom`). Each pair is identical by machine. I did not judge them one by one, but no judgement is needed to see a row played twice.
**Fix:** delete the later twin (0 chars). For the 34, keep the "?" twin. Spanish did the same (#189). Kai may prefer to rewrite USE twins longer (P20).

#### Not a defect (read)
- ZUT `that` que/cette, `to leave` partir/quitter, `anywhere`, `to reach`, `I heard that`: the second LEGO is not-new and never played (P25), or sits in a LEGO that shows why (S0588L02 `to grow up and leave home`).
- `beautiful` beau/beaux: same sound, number agreement (K42).
- Main's phrase-level ZUTs ("do you like coffee": two question forms) are not blockers (Kai 21 Oct).
- 6 not-new LEGOs with no earlier twin (S0067L01, S0121L02, S0509L02, S0511L04, S0588L01, S0603L03) are bookkeeping only: never played, word taught in the same seed. Listed in fra.json, not counted.

**fra_for_eng total (REAL, new): 193 rows/LEGOs in fra.json + 487 duplicate twins ≈ 1,100 characters if reworded where shown, 0 if deletions are chosen.**

---

### COVERAGE

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

### GAPS
- Patterns that could not be one regex (here/là, sir/monsieur, bare verb, pronoun-less verb) were run as a separate read of the dump, not through detect.cjs.
- The "question without ?" pattern (`question_without_qmark`) finds its known positive, but has too many hits to read today. It is a candidate list, not findings.
- Untaught words: I counted a word as taught if it appears anywhere earlier, even inside a chunk. That is looser than K29, which needs the word as a component on its own. Some real hits may be hidden.
- Syllable counts are by rule (±1), not by ear.
- course_gender_expansions for fra_ca and the edit-event history could not be read through any Popty GET route.
- French judgements come from the cited sources (Lawless, Académie française, Usito) and the course's own seeds, not from a native speaker.

---

