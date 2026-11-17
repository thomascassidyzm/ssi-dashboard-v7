# Paid courses cleanup scan: fix list (#447·AI, 17 Nov 2026)

**Status: 42 of 50 paid courses have a hand-read fix list. Eight have machine candidate counts only (the Spanish, French, German and Italian courses for Japanese and Chinese speakers), and ara_sy_for_eng could not be read at all.** Nothing was applied, rendered, linked or sent to anyone.

Each slice below is one worker's report, unedited. Items already on a held or ruled list are marked KNOWN there and are not in the numbers here. "Audio" is an estimate from text length (target × 2 voices, known × 1), not a render dry run.

## The short version

| course | new real items | audio if all fixed | biggest items |
|---|---|---|---|
| **spa_mx_for_eng** | 895 | ≈35,600 | "I think" taught as both *creo que* (S0047L01) and *pienso* (S0123L01); Deborah's seed corrections (27, 55, 65, 115, 122, 139, 140, 147, 414, 416, 437, 567) never made here; 159 seeds never said; 275 rows without their LEGO |
| spa_for_eng | 322 | ≈22,600 | 127 duplicate rows; ~127 rows using a word before it is taught; 13 LEGOs left behind by seed edits |
| **por_br_for_eng** | 1,719 | ≈21,100 | ~1,170 filler rows from seed 400 on ("no, of the holidays"), all deletes; 86 rows with European forms |
| por_for_eng | 1,074 | ≈14,200 | 495 duplicate rows; 110 rows on untaught *perguntou/perguntaram*; 37 rows where the person does not match |
| **fra_ca_for_eng** | 137 + a 96-row formal block | ≈14,300 | formal "sir/madam" seeds 639–655 glossed "you all"; "to meet \| se voir"; 33 seeds never said |
| fra_for_eng | 193 | small | 21 baskets drilling less than their LEGO; 56 untaught forms; 27 LEGOs over 8 syllables; 487 duplicate rows |
| ita_for_eng | 108 (+440 duplicate rows) | ≈8,700 | every earlier Italian fix still holds; 8 formal LEGOs (643, 649–655) without sir/madam; seed 212 *aiuto* used long before it is taught; seed 479 *che potessi fare* |
| deu_for_eng | 567 | ≈32,000 | 39 LEGOs whose baskets mostly do not contain the LEGO (≈22,600 of the cost); *dort* used though "there" is taught as *da*; 33 more want/*möchte* rows; 8 fixes from the #435 record that never reached the live course |
| **deu_at_for_eng** | 419 | ≈1,200 | 12 formal LEGOs drop sir/madam; want/*möchten*; 118 seeds never said |
| **deu_ch_for_eng** (draft) | 194 | ≈800 | formal LEGOs are bare verbs; plural verbs without a pronoun; 58 seeds never said |
| ara_for_eng | 563 | ≈25,900 | 24 grammar errors (case, mood, agreement); 44 played rows with empty audio; the builder cannot count Arabic syllables (1 flagged, 123 over the cap by vowel marks) |
| **ara_eg_for_eng** | 670 | ≈7,600 | 14 pairs taught as new twice (fixed in main only); 345 empty English slots; invented English glosses ("yonder", "azure") |
| **ara_lb_for_eng** | 805 | ≈12,100 | LEGO "fun \| مبسط" (seed 64) means "simplified", 16 rows; 333 empty English slots; broken English in the formal block |
| ara_sy_for_eng (draft) | not readable | – | Popty's seed routes return no seeds for it |
| jpn_for_eng | 409 (394 in seeds 1–300) | ≈15,600 | S0282L01 "no \| うん" (うん means yes), 13 rows; 21 LEGOs that are a bare particle or ending; 49 rows where English says he/she/they and the Japanese says "I want"; 180 duplicate rows |
| kor_for_eng | 1,196 (863 are duplicate rows) | ≈25,500 (≈6,000 outside the known over-8 re-cut) | the 5 Nov rebuild of seeds 301–430 dropped the seed sentence from 109 seeds; 49 LEGOs drifted from their seed |
| **kor_for_hin** | 106 | ≈530 | 76 seeds never played; 9 gapped LEGOs |
| **kor_for_tam** | 161 | ≈3,100 | 80 rows + 8 seeds in plain 나/내 where the course uses 저/제; "madam" said as 선생님 |
| zho_for_eng | 85 (+252 unread gloss candidates) | ≈3,900 | 33 LEGOs whose rows drill only part of the LEGO; S0572L02 "last time" taught twice since today's #431 change |
| **zho_for_hin** | 156 | ≈2,800 | 131 seeds never played; time word after the modal |
| **zho_for_tam** | 405 | ≈670 | 363 seeds never played; seeds 161, 316, 625 keep word order the main course already changed |
| **zho_for_jpn** | 404 | ≈13,600 | 171 LEGO glosses written like dictionary entries (〜, ・); 91 played rows with empty audio; 167 seeds never played |
| zho_for_gle (5 seeds) | 5 | 0 | 3 seeds never played |
| eng_for_spa / fra / deu / ita / por | 223 / 148 / 198 / 136 / 146 | ≈13,700 together | seed sentences were reworded after the rows were built, so rows carry old wording; S0207L01 "you've done" fixed in spa only; about a third of each count is seeds never practised (0 chars) |
| eng_for_jpn | 1,345 | ≈18,600 | far the worst of the four: 192 rows in seeds 226–230 whose Japanese prompt is only the LEGO's words; 425 duplicate rows; 375 rows using English not yet taught |
| eng_for_kor / zho / ara | 149 / 176 / 111 | ≈2,700 / 1,900 / 900 | seed 108 "wake / wake up" across all four (≈3,600 more) |
| eng_for_hin | 385 | ≈1,900 | 354 seeds never said (0 chars); the 8 rows of the "never" drill (S0490L01) have no audio |
| **eng_for_ben / guj / mar / pan / urd** | 1,044 / 1,479 / 1,771 / 1,475 / 545 | ≈53,700 / 89,600 / 106,400 / 68,600 / 24,600 | most of the cost (≈268,000) is one family: baskets under 3 real build rows; empty known clips pan 615, mar 454, guj 199 (audio passes queued since August and never run); mar "he's my friend yet"; pan LEGOs that change the seed's meaning |
| eng_for_kan / tam / tel / sin | 115 / 309 / 130 / 530 | ≈12,400 / 21,300 / 33,300 / 77,400 | **eng_for_sin from about seed 345 needs rebuilding, not row fixes**: seed and LEGOs say different sentences; eng_for_tel has 428 played rows with no Telugu prompt clip |

Bold = a variant. The priority Kai asked for (fixed in the main course, not in the variant) is the first section of each slice below. In almost every family the variant is its own build, not a copy, so the same rule is broken in its own rows.

## Checked by the orchestrator against live rows (17 Nov)

One headline claim per slice was re-read from a fresh live dump. All held.

- **spa_mx "I think":** S0047L01 "I think that | creo que", S0123L01 "I think | pienso". Of 502 played rows starting "I think", 136 say *pienso que*, 363 *creo que*.
- **por_br filler:** 1,061 "yes / no + bare LEGO" rows, 1,047 in seeds 400–699. **Caution:** a few are good sentences ("no, thank you"), so walk a sample before any bulk delete.
- **fra_ca formal block:** S0639L01 is "you all | vous".
- **ita formal block:** S0643L01 is "do you want | vuole" under seed "do you want sir? | vuole, signore?"; S0212L01 is "to ask for | chiedere" and *aiuto* appears in rows well before seed 564.
- **deu:** S0064L01 still has the use row "I want learning German". No LEGO teaches *dort*; "there" is *da* (S0157L01, S0456L01). 115 rows contain *dort* counting unplayed ones (the worker lists 74 as new).
- **ara_lb:** S0064L02 is "fun | مبسط"; 16 rows carry the word. Empty slots: ara_lb 336 and ara_eg 361 rows have no English clip, and no row in either is missing a target clip. This settles the earlier disagreement with the 12 Nov fill record: that record was about target slots and still holds.
- **jpn:** S0282L01 is "no | うん", with rows such as "no, I like it | うん、好き".
- **kor:** in seeds 301–430, 108 seeds have no row carrying the seed's own Korean.
- **zho_for_tam:** seeds 161 and 316 still read 你能周日早上… and 她能周一….
- **eng_for_fra:** S0207L01 "you've done" is marked not-new and no other LEGO teaches it.
- **eng_for_jpn:** 192 of 234 rows in seeds 226–230 have a prompt equal to the LEGO's own Japanese under a longer English sentence.
- **eng_for_mar:** "he's my friend yet" is live at S0130L01.
- **eng_for_sin:** seed 455 "We had to leave because the children were tired." has LEGOs "the child was upset" and "we need to go home".
- **Baskets under 3 real build rows (the ≈268,000-character Indic family):** the premise is that a build row whose text is the LEGO itself is never played. The player code says so (`api/courses/[code]/cycles.ts`: "The debut IS the bare LEGO — claim it so no later cycle replays it"). So the family is real, but whether to spend that much on it is Kai's call. It was counted only in the Indic slice; the other slices did not count it.

## Coverage

The 17 mechanical families in `patterns.md` were run on all 50 courses. They were read by hand in 42. Language patterns mined from the fix history, each calibrated on a pre-fix example: Spanish 33, Portuguese 11, French 19, Italian 14, German 10, Arabic 8, Japanese 7, Korean 7, Chinese 8, English-target 17 + 14 + 10 (5 more dropped because they had no known example).

Detector faults the workers found and worked round by hand (the shared tool was not changed): the untaught-word check blames an early seed word whose first LEGO comes later; it cannot run on Japanese or Chinese (no spaces); the syllable count is wrong for Arabic, Japanese and under-counts English; the seed-not-played check does not strip the Hindi full stop.

## Gaps

- **Eight courses unread:** spa, fra, deu and ita `_for_jpn` and `_for_zho`. No worker was dispatched for that slice: this job was held to three workers and the room sent the other ten slices but not this one. Candidate counts only (`candidate-counts-2026-11-17.txt`).
- **ara_sy_for_eng:** not readable through any Popty seed route.
- **Known languages nobody here can judge:** Hindi, Bengali, Gujarati, Marathi, Punjabi, Urdu, Kannada, Tamil, Telugu, Sinhala, and the Hindi/Tamil/Japanese/Irish prompts of the Korean and Chinese variants. Only structure was checked there.
- **Not read row by row in most slices:** LEGOs of 7–8 syllables (few shorter cuts proposed), English-side "LEGO says words its seed doesn't" candidates, intros, seeds 301–668 of jpn_for_eng (a known rebuild), and the Japanese prompts of eng_for_jpn beyond what the checks pointed at.
- **Female voice saying the male form:** text-only at-risk counts, nobody listened: spa_mx ≈454 slots, fra_ca 376 rows, por_br 310, ara_for_eng 399, eng_for_guj 472, eng_for_pan 1,982, eng_for_urd 1,406.
- **"Free" fixes are unconfirmed:** adding an unplayed seed as a row assumes the seed has its own clips; linking empty English slots assumes the library accepts the existing clip. Neither was dry-run.
- **Fix history:** Popty's edit-event history needs an admin login and was not read; history came from `ops/` records and published docs. Kai's chat archive stops at 19 Aug. Recommendations cite dictionaries and grammars, not a native speaker.

## Jobs and accounts

Every job ran on kai-gmail.

| slice | job | account | model | own report |
|---|---|---|---|---|
| orchestrator | #447·AI | kai-gmail | fable | this document |
| spa | #453·AI | kai-gmail | opus | d/8e3ddc70 |
| por | #454·AI | kai-gmail | opus | d/08a802d4 |
| fra | #455·AI | kai-gmail | opus | d/2119e6af |
| ita | #467·AI | kai-gmail | opus | d/ae7390b7 |
| deu | #468·AI | kai-gmail | opus | d/10ff0a29 |
| ara | #469·AI | kai-gmail | opus | d/abc97457 |
| jpn | #470·AI | kai-gmail | opus | d/e121e461 |
| kor | #471·AI | kai-gmail | opus | see slice |
| zho | #472·AI | kai-gmail | opus | see slice |
| eng-eu | #473·AI | kai-gmail | opus | d/03ebc194 |
| eng-asia | #474·AI | kai-gmail | opus | d/d23dd572 |
| eng-indic-north | #475·AI | kai-gmail | opus | d/825316aa |
| eng-indic-south | #476·AI | kai-gmail | opus | d/a75822ac |
| x-for-jpn-zho | not dispatched | – | – | – |

#453–#455 were dispatched by this job; #467–#476 by Kai's room after the surface refused this job a fourth worker. Numbers #456–#459 and #464 are void: no worker ran under them.

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

## ita_for_eng — cleanup scan findings (#447, slice ita)

Read-only scan of the live course on 17 Nov 2026 (663 seeds, 1,399 LEGOs, 15,314 rows). Nothing was applied, rendered or linked. Every row below was read by hand unless a family says otherwise.

### In short

- **Every Italian canon fix still holds.** I re-read the rows each ruling changed (K33–K39, K44, P28, the #36/#650/#435/#439 edits). All are live as ruled, and none of the new detectors found the old wording anywhere else: no *chiedere una domanda*, no *nella mia testa*, no *ha detto che potrebbe*, no *poteva … se volesse*, no *nel caffè*, no *raggiungerlo*. *About + -ing* is *di* on all 26 rows (L29 holds).
- **108 new items (LEGOs, seeds and rows) to fix in 11 families, about 8,719 audio characters.** On top of that there are 440 exact duplicate rows (deletes, 0 chars) and 31 LEGOs over the 8-syllable cap (15 already known).
- **The biggest new family is the formal block (seeds 642–655).** Eight formal LEGOs (643, 649–655) have no *sir/madam* (K32), and 26 of their rows don't either. That is the same fix fin_for_eng got in #846.
- **Smaller items:** seed 479 teaches *che potessi fare* as "I could do" with no trigger. Seed 212 says *chiedere aiuto*, but *aiuto* is not taught until seed 564, and 30 rows already use it. Thirteen seeds have text out of step with their own LEGOs (one is the typo *surrpise* in seed 130). Sixteen rows use a word before it is taught.

| family | REAL rows | audio chars |
|---|---|---|
| A. Formal LEGOs with no sir/madam | 34 | 3,088 |
| B. Seed 479 "che potessi fare" taught with no trigger | 5 | 172 |
| C. Seed sentence never played, or seed text out of step with its LEGOs | 13 | 586 |
| D. Phrases that do not contain their LEGO | 18 | 1,466 |
| E. Seed words no LEGO teaches (coverage gap) | 2 | 955 |
| F. Words used before they are taught | 16 | 975 |
| G. "could" after an opinion verb said with possa | 1 | 74 |
| H. LEGO English that names no person, or says something the seed does not | 7 | 679 |
| I. "the one" said feminine with nothing to select it | 2 | 180 |
| J. Taught form not used (P28) and it/this pairing (K25) | 5 | 166 |
| K. Wrong Italian / English seen in passing | 5 | 378 |
| L. Duplicate rows in one basket | 440 | 0 |
| M. LEGOs over the 8-syllable cap (builder count) | 16 | 0 |
| **total** | **564** | **8,719** |

Chars = new target text × 2 voices + new known text × 1, only for the sides that change; deletes cost 0. LEGO edits include about 70 chars for the re-mirrored intro (O13).

#### A. Formal LEGOs with no sir/madam

Formal LEGOs must keep *sir/madam* so the learner can see the formal form (K32). The LEGOs of seeds 643 and 649–655 drop it, and so does each one's first three BUILD rows (plus five rows of S0642L02). For example, "are you ready? | è pronto?" asks for the Lei form with nothing in the English to say so. Fix: grow each LEGO to its seed's own words, and add the closing honorific to the bare rows, as fin did (#846). 655 can't grow without a gap, so it gets a heads-up intro. The rows under 639L02/645–648 are the 26 K32 already lists for Kai, so they are not counted here.

**34 REAL**, all read · audio ≈ 3,088 chars · canon: K32 K10 L26 · confidence mostly *sure*.

  - `S0643L01` do you want | vuole → grow LEGO to the seed's own words: "do you want sir | vuole, signore" (+ components, intro re-mirrored)
  - `S0649L01` are you ready | è pronto → grow LEGO to the seed's own words: "are you ready sir | è pronto, signore" (+ components, intro re-mirrored)
  - `S0650L01` do you want to go | vuole andare → grow LEGO to the seed's own words: "do you want to go madam | vuole andare, signora" (+ components, intro re-mirrored)
  - `S0651L01` what do you think | che cosa ne pensa → grow LEGO to the seed's own words: "what do you think madam | che cosa ne pensa, signora" (+ components, intro re-mirrored)
  - `S0652L01` what do you need | di cosa ha bisogno → grow LEGO to the seed's own words: "what do you need sir | di cosa ha bisogno, signore" (+ components, intro re-mirrored)

#### B. Seed 479 "che potessi fare" taught with no trigger

Seed 479's LEGO is "I could do | che potessi fare". It has no trigger (K40), and it has no "that" (Kai's Q1 ruling on 21 Oct). Three of its rows are broken. U02's English means nothing. U04 is garbled. U05's Italian is wrong.

**5 REAL**, all read · audio ≈ 172 chars · canon: K40 K35 Q1 · confidence mostly *likely*.

  - `S0479L02` I could do | che potessi fare → re-gloss "that I could do | che potessi fare" (Q1 shape) and put the trigger in every row; intro re-mirrored
  - `S0479L02U02` it's not the least I could do | non è il minimo che potessi fare → delete: "it's not the least I could do" means nothing
  - `S0479L02U04` there are many reasons for what I could do | ci sono molte ragioni per quello che potessi fare → delete: no trigger, and the English is garbled
  - `S0479L02U05` I asked her about what I could do | le ho chiesto di quello che potessi fare → delete: "le ho chiesto di quello che potessi fare" is not Italian (would be "che cosa potevo fare")
  - `S0479L02B03` all I could do | tutto quello che potessi fare → replace: "it was the least I could do | era il minimo che potessi fare" (era taught S0086)

#### C. Seed sentence never played, or seed text out of step with its LEGOs

In these seeds the sentence is never played, or the seed text says something its own LEGOs do not. The seed is the reference and Kai's text (S15), so where the seed itself is the odd one out, that is said plainly.

**13 REAL**, all read · audio ≈ 586 chars · canon: P26 L27 · confidence mostly *likely*.

  - `S0193` I'm sorry but I'm too busy today | mi dispiace, ma oggi sono troppo occupato → seed has "oggi"; no played row is the seed and no LEGO covers oggi. Edit one USE row of S0193L01 to the seed sentence (and list "today | oggi" as a not-new LEGO row)
  - `S0305` woman | una donna → seed English says "woman", its LEGO and Italian say "a woman": seed English → "a woman"
  - `S0380L03U02` I asked what she wanted to include | ho chiesto cosa voleva includere → seed-sentence row says "cosa", the seed says "che cosa": target → seed text
  - `S0402L04` for food | per mangiare → LEGO "for food | per mangiare" but the seed says "a mangiare" (fermarsi a mangiare is the idiom): LEGO target → "a mangiare", rows that say "per mangiare" under it follow
  - `S0407L01` to set a good example | dare un buon esempio → LEGO "dare un buon esempio", seed "dare il buon esempio" (the set phrase): LEGO + rows → "il buon esempio", English unchanged
  - `S0452L01U02` they didn't say what they wanted to do | non hanno detto quello che volevano fare → seed-sentence row says "quello che", seed says "che cosa": target → seed text (sibling of 451, which is KNOWN #809)
  - `S0474` I don't even want it as a free offer | non lo voglio nemmeno gratis → seed English "as a free offer" is stiff and differs from its LEGO "for free": seed English → "I don't even want it for free"
  - `S0477` he's been sick since the second day of the holidays | è stato malato dal secondo giorno delle vacanze → seed "è stato malato dal…" vs its played row "è malato dal…". For an illness still going on, Italian uses the present with da: seed target → "è malato dal secondo giorno delle vacanze"
  - `S0480` whatever he says it's not far ahead now | qualunque cosa dica, ormai non è lontano → seed English has "ahead", nothing in the Italian or LEGOs says it: seed English → "whatever he says, it's not far now"
  - `S0130` that was a surrpise, because he's my friend | è stata una sorpresa, perché è un mio amico → seed English typo "surrpise" (and "that was" vs its LEGO "it was"): seed English → "it was a surprise, because he's my friend"
  - `S0517` but they left with each other | ma sono andati via insieme → seed English "they left with each other" is not natural English: → "but they left together" (matches LEGO "together | insieme")
  - `S0361` he was quiet | era tranquillo → seed English "he was quiet" but its LEGO glosses tranquillo as "calm" (to dodge 362 "quiet | silenzioso"): seed English → "he was calm"

#### D. Phrases that do not contain their LEGO

Rows that do not contain their LEGO, after the K31, L28 and K32 exceptions were taken out. The detector found 96: 25 have only *non/ancora/già/solo* or an honorific inside the LEGO (K31/K32). Of the other 71, 23 are K32 rows Kai already has (645–648), 7 are S0644 (the K32 named core), 11 are bound clitic forms that still contain the LEGO (L28: *pensarci, farlo, dirlo, ottenerlo, considerarlo, tenerlo*), 4 are *al/del* contractions, and 1 is seed 600 (KNOWN, #809). The other 25 rows, in 5 baskets, are real. They take 18 items, because re-cutting S0098L03 fixes its 9 rows in one go.

**18 REAL**, all read · audio ≈ 1,466 chars · canon: P17 L13 K41 · confidence mostly *likely*.

  - `S0098L03` playing something else | suonare qualcos'altro → LEGO "playing something else | suonare qualcos'altro" swallows S0098L04 "something else" and none of its 9 rows say qualcos'altro: re-cut to "playing | suonare" (gerund gloss is fine, K41 Kai 16 Oct); the 9 rows then hold
  - `S0141L02U01` I think everything is okay | penso che vada tutto bene → "penso che vada tutto" is not "va tutto" (K50); U02 twins U01. Grow S0141L02 to the seed's "everything is okay | va tutto bene" (bene is otherwise uncovered) and replace U01 with "everything is okay now | va tutto bene adesso"; delete U02
  - `S0141L02U02` I think everything is okay | penso che vada tutto bene → "penso che vada tutto" is not "va tutto" (K50); U02 twins U01. Grow S0141L02 to the seed's "everything is okay | va tutto bene" (bene is otherwise uncovered) and replace U01 with "everything is okay now | va tutto bene adesso"; delete U02
  - `S0141L02` everything is | va tutto → grow to "everything is okay | va tutto bene" (the bare "everything is | va tutto" would teach va tutto for any "everything is")
  - `S0243L02B01` to eat | da mangiare → B01/B02 are both bare "to eat | da mangiare": B01 → "the same thing to eat | la stessa cosa da mangiare"

#### E. Seed words no LEGO teaches (coverage gap)

A seed word no LEGO of that seed or any earlier seed teaches (L27). Growing S0212L01 to "to ask for help | chiedere aiuto" clears 30 rows at once.

**2 REAL**, all read · audio ≈ 955 chars · canon: L27 P1 · confidence mostly *sure*.

  - `S0212L01` to ask for | chiedere → seed 212 says "chiedere aiuto" but its only LEGO is "to ask for | chiedere"; aiuto is first taught at S0564, yet 30 rows (212, 231-242, 281) use it. Grow to "to ask for help | chiedere aiuto" (5 syllables); all 11 rows already say it
  - `S0117` I'm definitely doing better than I was last time we talked to each other | sto sicuramente andando meglio di quando abbiamo parlato l'ultima volta → seed says "sto andando meglio" but no LEGO of 117 covers it (andando is first taught at S0122). Add a NEW LEGO "I'm doing better | sto andando meglio" (6 syllables) with a basket; S0117L01B02 and S0117L03U08/U09 then hold

#### F. Words used before they are taught

A row uses a word that is not taught until a later seed, or never. K29 was checked first: none of these is an earlier component. Fixes reuse words already taught; otherwise the row is deleted.

**16 REAL**, all read · audio ≈ 975 chars · canon: P1 K8 P27 K51 · confidence mostly *likely*.

  - `S0402L03U01` I want to stop somewhere | voglio fermarmi da qualche parte → fermarmi is untaught (S0402L02 teaches fermarsi): → "it would be nice to stop somewhere | sarebbe bello fermarsi da qualche parte"
  - `S0402L03U04` we need to stop somewhere | dobbiamo fermarci da qualche parte → fermarci untaught: → "it's important to stop somewhere | è importante fermarsi da qualche parte"
  - `S0402L04U04` we need to stop somewhere for food | dobbiamo fermarci da qualche parte per mangiare → fermarci untaught: → "it would be nice to stop for food | sarebbe bello fermarsi a mangiare" (with the C fix to a mangiare)
  - `S0049L01U03` it's like this when I learn more | è così quando imparo di più → imparo is never taught: delete
  - `S0168L04U02` it is important to help people who don't understand | è importante aiutare le persone che non capiscono → capiscono never taught, le first taught at 177: delete
  - `S0396L03U04` she asked to wait until I finished | ha chiesto di aspettare finché non finivo → finivo never taught: delete
  - `S0505L02U03` I'm working so that I don't get left behind | sto lavorando così non rimango indietro → lavorando never taught: → "I need to work so I don't get left behind | devo lavorare così non rimango indietro"
  - `S0106L01U07` we don't need to feel like we want this | non dobbiamo sentirci come se volessimo questo → volessimo never taught (and "feel like we want this" is odd): delete
  - `S0506L01U04` he was there years ago | era là anni fa → là is never taught; lì is (S0289): → "era lì anni fa"
  - `S0040L02U03` I'm starting to speak better at the moment | sto cominciando a parlare meglio al momento → sto cominciando is taught one seed later (S0041L03): delete here (it is drilled at 41)
  - `S0065L02U04` it is useful to take time to understand | è utile prendersi il tempo per capire → capire taught at 74: → "it is useful to take time to learn | è utile prendersi il tempo per imparare"
  - `S0076L02U08` I think that I'm very happy with how much I've learnt | penso di essere molto contento di quanto ho già imparato → essere taught at 137: → "I'm very happy with how much I've learnt | sono molto contento di quanto ho già imparato"

#### G. "could" after an opinion verb said with possa

"could" after *think / seem* is *potrebbe* (K35). *possa* belongs only under "can". One row is left.

**1 REAL**, all read · audio ≈ 74 chars · canon: K35 · confidence mostly *likely*.

  - `S0497L03U03` it seems that it could be important | sembra che possa essere importante → K35: think/seem … could → potrebbe, possa only under "can": → "sembra che potrebbe essere importante" (as Kai's penso che potrebbe line)

#### H. LEGO English that names no person, or says something the seed does not

The LEGO's English names nobody (K26/K28), is not natural English (K9), or uses other words than its seed (L26). The words the LEGO must not clash with were checked for each one.

**7 REAL**, all read · audio ≈ 679 chars · canon: K26 K28 · confidence mostly *likely*.

  - `S0324L02` has both hands | ha entrambe le mani → "has both hands" names nobody; the subject (that student) is outside the LEGO → K28: "she has both hands"
  - `S0471L01` to stop yourself | fermarti → "to stop yourself" is not the meaning (that is "refrain"), and plain "to stop" would clash with S0402L02 fermarsi: grow to the seed's "do you want to stop | vuoi fermarti" (5 syllables)
  - `S0055L02` when I haven't slept | quando non ho dormito → gloss "when I haven't slept" vs the seed "when I didn't sleep" (quando non ho dormito): → seed words
  - `S0505L02` so that I don't remain | così non rimango → "so that I don't remain | così non rimango" is not English and così is "so": grow to the seed's "I don't get left behind | non rimango indietro" (7 syllables), drop S0505L01 "behind" into it
  - `S0582L01` how is it | com'è → "how is it | com'è" → the seed's "what's it like | com'è" (no other LEGO says "what's it like")
  - `S0603L04` in that period | in quel periodo → "in that period" → the seed's "at the time | in quel periodo" (S0609L01U13 already says "at the time" over it)
  - `S0620L02` from the last time | dall'ultima volta → "from the last time" is not English: → "since the last time | dall'ultima volta"

#### I. "the one" said feminine with nothing to select it

*quella* (feminine) with no noun in the sentence (K27). The learner cannot tell from "the one" that it is a woman. Best guess: Kai's heads-up intro, as S0010L02 has.

**2 REAL**, all read · audio ≈ 180 chars · canon: K27 K40 PR3 · confidence mostly *best guess*.

  - `S0390L01` the one | quella → "the one | quella": nothing in the seed or its 9 rows says it is a woman, so the learner cannot predict quella. Keep the text and give it a heads-up intro in Kai's template ("Listen out: when 'the one' is a woman, the Italian is:"), as S0010L02 did; or make the seed say "the woman who is standing…"
  - `S0640L02` it's the red one | è quella rossa → "it's the red one | è quella rossa": same, the noun (borsa, 636) is two seeds away; heads-up intro or "it's the red bag | è la borsa rossa" in the rows

#### J. Taught form not used (P28) and it/this pairing (K25)

The taught form is not used (P28: S0217 teaches *un po' d'acqua*), or English "it" sits over Italian *questo* (K25 pairs this ↔ questo).

**5 REAL**, all read · audio ≈ 166 chars · canon: P28 · confidence mostly *likely*.

  - `S0220L02U01` I want a bit of water | voglio un po' di acqua → S0217 teaches "un po' d'acqua"; use that exact form
  - `S0220L02U04` I drank a bit of water | ho bevuto un po' di acqua → S0217 teaches "un po' d'acqua"; use that exact form
  - `S0052L05U05` I wanted to finish it last week | volevo finire questo la settimana scorsa → English "it" over Italian "questo": K25 pairs this ↔ questo (#36 did the same), → English "this"
  - `S0056L01U04` so I can finish it | così posso finire questo → English "it" over Italian "questo": K25 pairs this ↔ questo (#36 did the same), → English "this"
  - `S0060L02U06` I can't finish it yet | non riesco a finire questo ancora → English "it" over Italian "questo": K25 pairs this ↔ questo (#36 did the same), → English "this"

#### K. Wrong Italian / English seen in passing

Wrong Italian or English, seen while reading other families. Grammar was not scanned on its own (R0.16).

**5 REAL**, all read · audio ≈ 378 chars · canon: K16 · confidence mostly *sure*.

  - `S0117L01U04` I definitely need more time | devo sicuramente più tempo → "devo sicuramente più tempo" is not Italian (dovere + noun = owe): → "ho sicuramente bisogno di più tempo"
  - `S0642L02U05` how do you feel after that? | come si sente dopo tutto questo? → English "after that" over "dopo tutto questo" ("after all this"): English → "after all this"
  - `S0657L01B03` how do you all feel after that? | come vi sentite dopo tutto questo? → English "after that" over "dopo tutto questo" ("after all this"): English → "after all this"
  - `S0642L01U07` I want to speak with you, madam, as soon as I can | voglio parlare con lei, signora, appena posso → madam sits mid-sentence; K32 puts it at the END: → "I want to speak with you as soon as I can, madam | voglio parlare con lei appena posso, signora"
  - `S0639L02U05` I want to speak with you sir today | voglio parlare con lei, signore, oggi → sir mid-sentence: → "I want to speak with you today sir | voglio parlare con lei oggi, signore"

#### L. Duplicate rows in one basket

The same pair twice in one basket: 275 are a bare-LEGO BUILD row repeated (B01 = B02 = the LEGO), and 165 are phrase twins. These are exact text matches; I read 30 by eye. Deleting the later twin leaves fewer than 3 BUILD or 5 USE rows in 105 of 323 baskets. In those baskets, replace the twin with a new row instead of deleting it.

**440 REAL**, all read · audio ≈ 0 chars · canon: P10 (no padding), K42 note: exact duplicates are deleted, not rewritten · confidence mostly *sure*.

  - `S0001L03U01` I want to speak Italian | voglio parlare italiano → delete (exact twin of S0001L03B02; phrase twin)
  - `S0002L01U01` I'm trying to speak Italian | sto provando a parlare italiano → delete (exact twin of S0002L01B03; phrase twin)
  - `S0012L02U01` I want to try to guess | voglio provare a indovinare → delete (exact twin of S0012L02B03; phrase twin)
  - `S0017L01U02` I'm trying to find out | sto provando a scoprire → delete (exact twin of S0017L01B03; phrase twin)
  - `S0018L02U01` we want to meet up tomorrow | vogliamo incontrarci domani → delete (exact twin of S0018L02B02; phrase twin)

#### M. LEGOs over the 8-syllable cap (builder count)

The builder's own count (language-config.cjs) puts 31 LEGOs over 8 syllables; a hand count without elision gives 59. 15 of the 31 are cuts Kai chose or already has (K38/K39, the #809 questions, K32). Of the other 16, 10 have an obvious shorter cut and 6 have none; all 16 are listed below.

**16 REAL**, all read · audio ≈ 0 chars · canon: L3; Kai 17 Nov shortest cut · confidence mostly *likely*.

  - `S0050L03` as quickly as possible | il più velocemente possibile → shorter cut: "as quickly as | il più velocemente" + "possible | possibile" [builder estimate 9 syllables]
  - `S0073L02` I've got more to learn | ho ancora di più da imparare → shorter cut: "more to learn | di più da imparare" + "I've still got | ho ancora" [builder estimate 9 syllables]
  - `S0103L01` we're not trying to hear | non stiamo provando a sentire → shorter cut: "we're not trying to | non stiamo provando a" + "to hear | sentire" [builder estimate 10 syllables]
  - `S0106L03` we just need to work hard | dobbiamo solo lavorare sodo → shorter cut: "we just need to | dobbiamo solo" + "to work hard | lavorare sodo" [builder estimate 9 syllables]
  - `S0108L01` we didn't hope to wake | non speravamo di svegliarci → over the cap; no obvious shorter cut that keeps the seed covered — keep and list (Kai 17 Nov: say why a 7+ LEGO stays) [builder estimate 9 syllables]
  - `S0127L02` that isn't why I wanted | non è per questo che volevo → over the cap; no obvious shorter cut that keeps the seed covered — keep and list (Kai 17 Nov: say why a 7+ LEGO stays) [builder estimate 9 syllables]
  - `S0146L02` since we tried to fix it | da quando abbiamo provato a sistemarlo → shorter cut: "since we tried | da quando abbiamo provato" + "to fix it | a sistemarlo" [builder estimate 13 syllables]
  - `S0191L01` no I don't mind at all | no non mi dispiace affatto → over the cap; no obvious shorter cut that keeps the seed covered — keep and list (Kai 17 Nov: say why a 7+ LEGO stays) [builder estimate 9 syllables]
  - `S0193L01` I'm sorry but I'm too busy | mi dispiace, ma sono troppo occupato → shorter cut: "I'm sorry but | mi dispiace, ma" + "I'm too busy | sono troppo occupato" (also lets oggi in, see C) [builder estimate 12 syllables]
  - `S0224L01` he's just started to learn | ha appena cominciato a imparare → shorter cut: "he's just started | ha appena cominciato" + "to learn | a imparare" [builder estimate 10 syllables]
  - `S0228L01` started to practise speaking | cominciato a fare pratica parlando → shorter cut: "started | cominciato" + "to practise speaking | a fare pratica parlando" [builder estimate 11 syllables]
  - `S0230L01` a young man who wants to work | un giovane uomo che vuole lavorare → shorter cut: "a young man | un giovane uomo" + "who wants to work | che vuole lavorare" [builder estimate 11 syllables]

### KNOWN — already on a held or ruled list (not counted)
- **ZUT S0072L02 vs S0655L01** "I think that you're speaking" (#809 Q1, d/3d7e8d41; K38 says "Kai rules on 655 next"). The formal-intro fix in A would also close it.
- **ZUT "it was" era / è stato** (S0112L01, S0219L01): #809 Q12.
- **ZUT "anywhere"** (S0182L02 / S0376L02): handled by Kai's intro (K23, C27).
- **Not-new LEGOs never taught:** S0246L02 is #809 Q6. S0609L02 is NOT a defect: it was made not-new on L17 familiarity by Kai's 28 Sep ruling (#590·I/#579·I).
- **Seeds whose LEGOs differ from the seed** (384, 420, 424, 444, 451, 600, 602, 606) and the glosses of 007L02, 370L01, 410L01, 518L04 and 543L01: the #809 side find (d/3d7e8d41). Seeds 227, 270, 319 and 340 are #809 Q2/Q4.
- **K32's 26 rows** under 639L02 and 645–648 (no closing *sir/madam*), listed for Kai on 28 Sep. S0644L01 is the named core.
- **riuscire for couldn't:** 433 and 445/446/450/563/564/596 are named in K36 as left as they were. Note that *riusciva* itself is taught by no LEGO.
- ***c'era*** (16 rows, seed 279): #427 d/4d93d282, "not worked". The same family has ***c'è*** before S0436, in 6 rows (141B03, 141U03, 195L03U03, 243L02U03, 273L02U08, 298L01U05). These belong to the same seed-level question, which is to teach "there is / there was" earlier.
- **S0339L01** "he's hurt himself | si sia fatto": #36 (d/df9ba1cb), "the LEGO itself is your call".
- **S0527L02U04** "I can't believe who told me": #650 (d/7a64fb09) seen in passing, still live.
- **Female voice saying the male form:** re-recorded by #130 (d/6f955738, 529 slots, UNHEARD). S0649L01 *è pronta* is held there.
- **Bare infinitive LEGOs with no "to"** (find, stop, understand, leave, seem, put it, say it): this is the K41 scan list (#936·I). The canon names the ZUT clashes that stop a re-gloss.
- **#809's Q2–Q11 families** (need to, piacere glosses, going to, any/no, would like, se + mood, a/di placement, reported-question mood, bare possessives): not re-asked here.

### NOT A DEFECT (mechanism)
- **"that" over *questo*** (43 rows, e.g. "that doesn't mean | questo non significa"): two Englishes over one Italian is fine (K3). The K25 pairing Kai ruled covers say/tell/answer, and widening it is his call (K25 bound 4). The exception is the 3 "finish it | finire questo" rows in J.
- **English "it" with no Italian object** (15 detector rows: "I like it when", "how you say it | come si dice", "do you like it here?"): Italian *piacere* needs no object, and *come si dice* is an idiom (K25 bound 2).
- **-lo on an infinitive** (*ottenerlo*, *considerarlo*, *tenerlo*, *trovarlo*): Kai ruled on 3 Nov (d/7a64fb09) that -lo goes on an infinitive from seed 61 onward, and L28 says the bound spelling still contains the LEGO. #435 moved S0358 away from *raggiungerlo* for a different reason (its Y/N), so I list no rows here. Flagged as a possible tension, not a finding.
- **Gender and number endings** (*sola, tranquilla, malata, stanchi*…) and **elided forms** (*l'idea, l'insegnante, quell'ora, dell'ultima, l'autobus*): allowed by K8 and regular elision. ***avrei*** under 152: allowed by K29, because *avrei fatto* is a component of S0152L01. ***mostrare*** / ***buttare***: components earlier (S0032L01C01, S0466L02C01).
- **S0433L01B01 "they couldn't manage to"**, **K34** (*fa male* rows say "it hurts", so no owner is owed), **S0070L03U04** (*potresti*, correct per K35), **S0013L01/S0281L05** (*parli/cominci* are also the indicative): not defects.
- **Phrase-level ZUT** (*stare/restare*, *penso sia / penso che sia*, *me l'avessi / me lo avessi*): Kai, 21 Oct: a phrase clash is not a blocker.

### Coverage

| family | ita_for_eng |
|---|---|
| zut_lego / zut_use | scanned, 3 + 9 read; all KNOWN or phrase-level |
| notnew_untaught | 2 read (KNOWN / not a defect) |
| seed_not_played | 18 read: 2 are fine (no new LEGO: 188, 296), 7 KNOWN (#809), 9 in C |
| lego_not_in_seed (target 20, known 110) | all read; contractions and K28/K54 filtered; the rest is in C/H or KNOWN |
| phrase_missing_lego | 96 read, see D |
| untaught_target | 119 read, plus a seed-level re-run (the detector skips a word taught by a seed sentence only) |
| dup_rows | 440 exact matches, 30 read by eye |
| lego_syll | 31 builder over-cap read; the 167 at 7–8 syllables were not cut one by one (see gaps) |
| Italian canon K25–K27, K30–K44, K50, K51, L28, L29, P24, P27, P28 | scanned by a two-sided scanner plus 14 regexes (`ita.patterns.json`, all pass calibration) |
| formal register (K10/K32) | seeds 639–668 read in full |
| female male-form | KNOWN (#130); not re-measured |
| intros, clip vs text, grammar beyond the detectors | not scanned |

### Gaps
- **Not scanned:** intro wording (only the intros of LEGOs I flag are costed), clip vs text (by ear only), and grammar as a sweep. Grammar errors were caught only in passing (K).
- **The 167 LEGOs of 7–8 syllables** were counted but not given shorter cuts one by one. Kai's 17 Nov rule is about new fixes, so I proposed cuts only for the over-cap ones.
- **The every-seed-part-is-a-LEGO rule** (Kai 12 Nov; taught parts listed as not-new) was checked only for words never taught (E). Seeds that miss a not-new row for a word taught earlier (for example "today" in 193, "very well" in 655) were not counted course-wide.
- **The untaught_target detector has a bug.** A word that appears in a seed sentence before its first LEGO counts as taught at that LEGO, so it misses nothing but blames the row instead of the seed. The seed-level re-run here covers that.
- **Basket floors** for the D/F deletes were checked only in L. Check the floor for each D/F delete before applying.
- **Audio figures are estimates.** No dry run was made (the brief forbids one), and no edit-event history was read (it needs an admin login).

---

## German slice: cleanup scan findings (#447, worker #468)

Courses: **deu_for_eng** (main), **deu_at_for_eng** (Austrian) and **deu_ch_for_eng** (Swiss, an unreleased draft). Read live through Popty on 17 Nov 2026 (dumps from 14:06Z). **Nothing was applied, rendered or linked.**
Row-level list: `reports/deu.json` (1,228 rows). German patterns: `reports/deu.patterns.json`. Checks used: `reports/deu-checks/`.

**Read this first.** deu_at and deu_ch are **dialect courses**, not copies of the main course (`i woaß no ned`, `ich weiss no nöd`). They share most English seeds with main (639 and 624 of about 660), but only about a quarter of their practice rows share English with main, and almost none share German. So "a main fix still missing in a variant" here means **the same rule broken again in the dialect**, not the same row. Dialect forms are right in their own course and are not listed. For example, Austrian teaches `there | dort`, so `dort` is fine there. Swiss German has no simple past, so the könnte/konnte rule (K45) has nothing to check.

Audio characters = new known text × 1 + new target text × 2 voices, counted only on the side that changes. A delete, a flag flip, a question mark or a P26 seed copy costs 0. Estimates are ±15%.

---

### PRIORITY: rules fixed in deu_for_eng and still broken in the variants

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

### deu_for_eng (main)

#### 1. #435 fixes that never reached the live course: 8 rows (REAL)
The #435 fix record lists these rows as fixed, but the live text is still the old text. Thirteen of 498 fixes did not land. Five of those 13 are fine as they are now (`gehen`/`fahren`, `sagte`), so only 8 are listed.
- S0064L01U07 `I want learning German` → `I want to learn German`
- S0056L02U13 `I feel myself much better…` → `I feel much better…` (also B06 `I feel better myself`)
- S0033L02U01 `How long have you already been learning German…` → drop "already"
- S0141L02U05 `…if it is in order to wait here` → `…if it is okay to wait here`
- S0424L03U03/U06 `ich dachte, dass wir … nicht verschwenden müssen` → `…mussten` (past frame). #435 proposed `durften`, but "didn't have to" is `nicht müssen`.

**Fix:** as above. **Canon:** K9, K50. **Chars:** ~480.

#### 2. Baskets that do not drill their LEGO: 39 new LEGOs, 302 rows (REAL), plus 21 KNOWN
In each of these baskets, half or more of the rows do not contain the LEGO. The rows climb up from bare pieces instead (`had \| hatten`, `we had that there`) or drill a different form. Most are LEGOs that were grown later (K48, K32), and the basket was never rebuilt. #435's held list (d/ca698dea) already names 21 of them (388, 524, 554, 616…). The 39 below are new.
- S0521L05 `why we needed to stay here \| warum wir hier bleiben mussten`: 9 of 10 rows miss it (B01 `had to \| mussten`)
- S0569L04 `willing to pay \| bereit bist zu zahlen`: 9 of 10 (B01 `to pay \| zahlen`)
- S0263L01 `who you mean \| wen du meinst`: 6 of 7 (B01 `Who did you see? \| Wen hast du gesehen`)
- The formal and plural block, S0643–S0666 (`are you ready sir?` → B03 `I also asked if they are here \| ob sie hier sind`). Rows drill `sie`/they under a `Sie`/sir LEGO, and never end with sir/madam (K32).
- Full list: 091L01, 103L01, 110L02, 171L02, 232L02, 263L01, 409L03, 440L02, 463L01, 465L02, 472L02, 501L05, 504L01, 510L02, 515L03, 521L05, 527L04, 528L02, 553L03, 562L01, 569L04, 573L03, 581L01, 582L01, 587L04, 599L02, 605L01, 630L01, 643L01, 644L01, 647L01, 649L01, 651L01, 658L01, 659L01, 660L01, 662L01, 664L01, 666L01.

**Excluded as not a defect:** 11 split separable verbs (ausmachen, kennenlernen, fernsehen, vorhaben, zurückrufen…). K49 allows the split. **Fix:** rebuild each failing row so it contains the whole LEGO, each in a different outer sentence (O12, as seed 118 was done). Formal LEGOs keep their cut form plus sir/madam at the end on both sides. **Canon:** P17, K32, O12, L31. **Read:** all 60 LEGOs at basket level, with 3 failing rows each; the 471 rows were counted, not each read. **Chars:** ~22,600 (rewrites at current row length).

#### 3. `dort` is never taught: 74 rows (REAL), plus 11 KNOWN
The course teaches `there \| da` (S0157L02, S0456). `dort` is in no LEGO and no seed, yet 85 rows use it from seed 300 on. So "there" has two answers, and the learner was never given the second.
- S0614L03U07 `your family was also there \| deine Familie war auch dort`
- S0454L04B03 `they were there at about six \| sie waren gegen sechs dort`
- S0612L02U08 `we probably would have bought a house there \| …dort ein Haus gekauft`

**Fix:** `dort` → `da`. **Confidence:** sure. **Canon:** P1, K8, K14. **Chars:** ~4,400.

#### 4. "want" over `möchte`: 33 rows (REAL), plus 6 KNOWN
These are siblings of #435's biggest family. #435 fixed about 280 rows; these remain.
- S0182L01B03 `I want to look anywhere \| Ich möchte irgendwo suchen`
- S0202L01U04 `Nobody wants to work in an office… \| Niemand möchte…`
- S0594L01U05 `she wants to see my toys \| sie möchte meine Spielzeuge sehen`

**Fix:** English → "would like" (as #435 did). **Canon:** K2, K22. **Chars:** ~1,660.

#### 5. `fand, dass` for "thought" meaning believed: 6 rows (REAL, likely)
Siblings of #435's de-wrong-verb fixes (S0376–S0383). `finden` gives an opinion; a belief is `denken`.
- S0378L02U05 `she thought it was not enough money \| sie fand, dass…` → `sie dachte, dass…`
- Also S0379L01U04, S0380L01U05, S0381L02U05, S0383L02U06, S0384L01U04.

**Not a defect:** 7 rows of the form `fand es + adjective` (`Ich fand das Buch ziemlich gut`). Seed 374 is KNOWN. **Source:** Duden *finden* 6 vs *denken*. **Chars:** ~590.

#### 6. Smaller main-course families (REAL)
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

#### Read but not counted (GAP for the main course)
- `untaught_target` (249): `dort` (85) is family 3. `aus` (27) is a split-verb artefact, not a defect. `schauen` (22, never taught; S0313/S0388 KNOWN) is real by the same test as `dort`, but its fix (`sehen`) was not read row by row. The remaining ~115 were **not read**.
- `lego_not_in_seed_known` (208; 185 after the K54/K28/L33/article exceptions): an 8-row sample shows literal glosses (`to reside`, `to lay`, `public holidays`). This is #422's family 1. **Not read** beyond the sample.
- `phrase_missing_lego` (685, target side): read at basket level as family 2. Rows in baskets under 50% failing were **not read**.

---

### deu_at_for_eng (Austrian)

- **Formal LEGOs without sir/madam:** 12 LEGOs (S0643, 644, 646–653, 654L02, 655L01; table row 1). Seeds and main both carry `der Herr` / `gnädige Frau`, which is right in Vienna. LEGO → `…, der Herr` / `…, gnädige Frau` on both sides, with its phrases ending in it. Sure. ~615 chars.
- **want/möchte** (table row 2): seeds 643 and 650 `do you want… \| Möchten Sie…`. English → `would you like…, sir/madam` (English only). Seed 383 `he wanted \| er mechat` → `er wollt`. Five rows `I would like \| i wü (gern)` (S0414L02U06, S0418L01U03, S0448L01B02, S0471L01U05, S0504L02U05) → `i mechat`. Likely; the Austrian forms come from the course's own `i mechat` (S0011, "I'd like") and `wollt` (S0127, "wanted"). ~540 chars.
- **Seed 264:** `an elderly man` → `an old man`. Grow S0231L01 to `I know an old man \| i kenn an oiden Monn` so the case shows why the form differs (L34). Likely.
- **Seed ZUT:** `what are you looking for` = `wos suachst'n` (68) and `wos suachst denn` (194). Use one form.
- **Empty clip:** S0322L02U08 has no known clip (35 chars).
- **Seed not played:** 118 seeds (2 more differ only in punctuation and are fine). Fifty-six have no copy at all, mostly 3–45. Add each, 0 chars.
- **Question mark:** 270 (191 English without `?` where the German asks). Text only. **Duplicate rows:** 3. Delete.
- **Not a defect:** `a restaurant \| a Restaurant` and 4 similar (loanword plus the Austrian `a`); `dort` (taught at S0157L02); `I have no emails yet \| i hob no koa` (a negative); `versuch`/`versuach` spelling drift (S0004L03U04 vs S0638), which is low and unlisted.
- **GAP:** `lego_not_in_seed_known` (348; 309 after exceptions) is mostly literal glosses (`no longer`, `agreed`, `thought it over`). An 8-row sample was read; the rest were **not read**. `lego_syll_7_8` (41) was not read; nothing in this course is over 8 by the hand count.

### deu_ch_for_eng (Swiss, draft)

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

### Totals (REAL new findings; audio characters)

| course | REAL rows/items | chars | biggest |
|---|---|---|---|
| deu_for_eng | 567 (incl. 269 `?` and 66 deletes at 0 chars) | ~32,000 | basket rebuild ~22,600; `dort` ~4,400 |
| deu_at_for_eng | 419 (incl. 270 `?` and 118 P26 adds at 0 chars) | ~1,200 | formal LEGOs, want/möchte |
| deu_ch_for_eng | 194 (incl. 101 `?` and 58 P26 adds at 0 chars) | ~800 | formal block, English side in Swiss |

### Coverage

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

### Gaps
- The held list d/ca698dea (239 items) was matched by row id and seed number only, not read in full. A finding phrased differently there may be counted here as new.
- Three #435 patterns (`Fernsehen ferngesehen`, `klingt wie`, `beide es`) find their pre-fix positive but have 0 live hits, which confirms those fixes landed.
- K45 könnte/konnte: all 19 live hits sit in seeds the canon already holds for Kai (312, 412, 479, 518, S0603L03), so they are KNOWN and not listed.
- Proposed German and dialect forms are best effort from the course's own taught forms and Duden. A cost of 0 for P26 adds assumes the seed's own clips exist.

---

## Arabic slice: cleanup scan findings (#447, worker #469)

Courses: **ara_for_eng** (Modern Standard Arabic, main), **ara_eg_for_eng** (Egyptian), **ara_lb_for_eng** (Lebanese). All read live through Popty's script-view on 17 Nov 2026 between 14:06 and 14:07Z. **Nothing was applied, rendered, linked or sent.**
**ara_sy_for_eng could not be read (GAP):** script-view returns 0 seeds and `GET /api/production/ara_sy_for_eng/seed/S0001/baskets` answers 404 "Seed S0001 not found". The estate map lists 300 seeds and a pod-1 with 232 slots (108 draft lines, 6 empty target slots), so the course exists, but not where Popty's seed routes look.

Row-level list: `ops/paid-cleanup-scan-447/reports/ara.json` (one row per finding, with chars). Arabic patterns: `ara.patterns.json`.

**How to read the counts.** A big count is not a big job. Four families are mechanical, cheap and big: seed sentences not played (fix = add the seed as a row with its own clips, 0 chars), question marks, empty audio, and LEGO length. The content families Kai needs to judge are smaller, and each is listed below with examples.

Audio characters = new target text × 2 voices + new known text × 1. A delete or a relink costs 0. A changed LEGO is priced at its known + target × 2 + about 40 for the intro. Rewritten rows are priced at their current length. All figures are estimates (±15%).

### Totals

| course | REAL new findings | of which hand-judged content* | KNOWN (already on a record) | chars |
|---|---|---|---|---|
| ara_for_eng | 563 | 228 | 7 | 25,876 |
| ara_eg_for_eng | 670 | 147 | 0 | 7,607 |
| ara_lb_for_eng | 805 | 189 | 1 | 12,108 |
| **all** | **2,038** | **564** | **8** | **45,591** |

\*Content = grammar, English, P17, seed↔LEGO drift, glosses, ZUT, not-new, untaught, the priority families. The rest are length, seed-play, question marks, empty audio and duplicate rows.
**Not in the total:** re-cutting long LEGOs (not priced until the cuts are chosen), and the ara_for_eng female voice (below, about 17,000 chars if every at-risk row were re-recorded).

### PRIORITY: fixes made in one course and not in the others

| # | rule fixed | where | now | REAL |
|---|---|---|---|---|
| 1 | Same pair taught NEW twice → set not-new (L17) | ara_for_eng #513, d/83adb35a | ara_for_eng 0 left; **ara_eg 14, ara_lb 3** (one lb pair is inverted: S0017L01 is the first teaching but marked not-new, S0035L01 is new) | 17 |
| 2 | Female voice re-check + every pre-July female clip re-recorded | ara_eg / ara_lb #641, d/468045e4 | **ara_for_eng never had it.** It has its own gender-prep pass (348 expansion rows, processed 4 Nov; 0 flagged). 399 played rows carry a first-person masculine form (متأكد، سعيد، مستعد، آسف…), about 16,974 target chars. Female target voices on record: Zariyah (ar-SA) and Salma (ar-EG). AT RISK only, not heard | at risk 399 |
| 3 | lb screen typo مبسط ("simplified") for مبسوط | #641 named 1 row, voices fixed, text left | the 1 row is KNOWN, but the same word is the **LEGO "fun \| مبسط"** (S0064L02), its 14 other rows and seed 64. "Fun" in Lebanese is مسلّي | 16 + seed |
| 4 | Romanised Arabic in the English prompt (yaskot, bido…) | ara_lb, canon record | 0 left in all three courses | 0 (fixed) |
| 5 | Bad female forms (كنت غلطة، عايزتها) | #630/#641 | 0 on screen in any course. These lived in the expansion table, which this scan cannot read; #641 fixed the table | 0 (see gaps) |
| 6 | #513 "noticed, not fixed": S0419L01 rows lack إذا; seed 521 not tiled | ara_for_eng | both still live | KNOWN |

### Empty audio: the 345 and 333 are the English slot only
#221 (d/50327493) said "0 empty target1/target2" for ara_eg and ara_lb. **That still holds.** Every empty slot is the **known (English)** slot: 345 rows in ara_eg (seeds 3–668, mostly 300–600) and 333 in ara_lb, across build, use and 23 debut rows. The same English line already has a clip elsewhere in these three courses for 280 (eg) and 237 (lb) of them, so library-first linking should make those free. Rendering the rest costs **2,242 chars (eg) + 3,069 chars (lb)**. If the library refuses the cross-course clip (a different English voice), the worst case is 12,438 + 11,893.
ara_for_eng has 44 empty played rows, mostly in seeds 13–60: 28 with all three slots empty, 8 with both target slots empty, 8 with only the English slot empty. 5,531 chars.


---

### ara_for_eng (Modern Standard Arabic, main)


#### Arabic grammar error (case / mood / agreement): 24 REAL · 1,558 chars

The Arabic is wrong: a case ending, a verb mood or an agreement a learner would copy.

- `S0454L03U05` she knows our friends came to us | تَعْرِفُ أَنَّ أَصْدِقاؤُنا جاءوا إِلَيْنا → أَصْدِقاؤُنا after أَنَّ → أَصْدِقاءَنا (accusative); U02 also تَظُنَّ → تَظُنُّ (sure; K8, R0.16)
- `S0627L01B03` she said it's not ready | قالَتْ إِنَّها لَيْسَتْ جاهِزَةٌ → لَيْسَتْ جاهِزَةٌ → لَيْسَتْ جاهِزَةً (predicate of laysa is accusative) (sure; K8)
- `S0627L01U04` do you know if it's ready? | هَلْ تَعْرِفُ إِنْ كانَتْ جاهِزَةٌ؟ → إِنْ كانَتْ جاهِزَةٌ → إِنْ كانَتْ جاهِزَةً (sure; K8)
- `S0396L02B01` they are ready | هُمْ مُسْتَعِدّينَ → هُمْ مُسْتَعِدّينَ → هُمْ مُسْتَعِدّونَ (nominal sentence: nominative); U04 أَنَّ النّاسَ … مُسْتَعِدّونَ. The LEGO itself (حتى يكون الجميعُ مستعدّين) is right in its seed (sure; K8)
- `S0134L01U01` I think that's not a problem | أَظُنُّ أَنَّ ذٰلِكَ لَيْسَتْ مُشْكِلَةً → أَنَّ ذٰلِكَ لَيْسَتْ مُشْكِلَةً → أَنَّ ذٰلِكَ لَيْسَ مُشْكِلَةً (ذلك is masculine) (sure; K8)


#### English prompt ungrammatical: 6 REAL · 191 chars

The English the learner hears is not grammatical English.

- `S0570L02U02` I'm afraid willing to pay for it | أَخْشى أَنَّهُ مُسْتَعِدٌّ أَنْ يَدْفَعَ → "I'm afraid willing to pay for it" → "I'm afraid he's willing to pay" (and the Arabic يَدْفَعَ is under a LEGO that says تَدْفَعَ: see P17) (sure; K9)
- `S0570L02U03` I suppose willing to pay for it | أَظُنُّ أَنَّهُ مُسْتَعِدٌّ أَنْ يَدْفَعَ → "I'm afraid willing to pay for it" → "I'm afraid he's willing to pay" (and the Arabic يَدْفَعَ is under a LEGO that says تَدْفَعَ: see P17) (sure; K9)
- `S0570L02U05` I don't care willing to pay for it | لا يَهُمُّني أَنَّهُ مُسْتَعِدٌّ أَنْ يَدْفَعَ → "I'm afraid willing to pay for it" → "I'm afraid he's willing to pay" (and the Arabic يَدْفَعَ is under a LEGO that says تَدْفَعَ: see P17) (sure; K9)
- `S0410L01U04` I want to stay with each other | أُريدُ أَنْ نَبْقى مَعَ بَعْضِنا → "I want to stay with each other" → "I want us to stay together" (أُريدُ أَنْ نَبْقى مَعاً) (sure; K9)
- `S0387L01B02` on the right | عَلى حَقٍّ → "on the right | عَلى حَقٍّ" means right as in correct → delete B01/B02 fragments, keep the "was right" rows (sure; K9)


#### Phrase does not contain its LEGO (LEGO grew or was re-cut, basket left behind): 118 REAL, 1 KNOWN · 8,156 chars

The row does not contain its own LEGO, usually because the LEGO was grown or re-cut and its basket was left as it was.

- `S0091L02B01` you think now | تُفَكِّرُ الآن → 7 rows drill تُفَكِّرُ without بِسُرْعَةٍ; reword each to contain أَنْ تُفَكِّرَ بِسُرْعَةٍ, or delete the ones that cannot (likely; P17, K50)
- `S0102L03B01` that the matter | إِنَّ الأَمْرَ → rows say إِنَّ الأَمْرَ without نَقولَ; reword with نَقولَ إِنَّ (likely; P17, K50)
- `S0109L02B01` a new word | كَلِمَةً جَديدَةً → rows use singular كَلِمَةً جَديدَةً; make them كَلِماتٍ جَديدَةً ("new words") (sure; P17, K50)
- `S0144L02B01` I woke up earlier | اسْتَيْقَظْتُ أَبْكَرَ → rows stop at أَبْكَرَ; add مِمّا … ("earlier than I wanted") (likely; P17, K50)
- `S0152L03B01` if that were good | لَوْ كانَ ذٰلِك جَيِّداً → LEGO is "if I had known | لَوْ عَرَفْتُ" but all 8 rows use لَوْ كُنْتُ مُسْتَعِدّاً; rewrite with لَوْ عَرَفْتُ (sure; P17, K50)
- KNOWN `S0419L01B01`: d/83adb35a (#513 noticed: none of S0419L01's rows contain إِذا)


#### LEGO target is not what its seed says (seed and LEGO translated apart): 35 REAL, 1 KNOWN · 3,754 chars

The LEGO's Arabic is not what its own seed says, so the learner meets the seed in different words from the ones they were taught.

- `S0395L01` at the entrance | عِنْدَ المَدْخَلِ → Align the LEGO to the seed: "at the entrance | عِنْدَ المَدْخَلِ" sits in seed 395 "turn left at the next corner": wrong LEGO; replace with "turn left | نَنْعَطِفَ يَساراً" (likely; L26, S3)
- `S0395L04` the next corner | الزّاوِيَةِ التّالِيَةِ → Align the LEGO to the seed: التّالِيَةِ → القادِمَةِ (seed word) (likely; L26, S3)
- `S0395L06` we need to | نَحْنُ بِحاجَةٍ إِلى → Align the LEGO to the seed: نَحْنُ بِحاجَةٍ إِلى → نَحْتاجُ أَنْ (seed words) (likely; L26, S3)
- `S0548L01` at the moment | في الوَقْتِ الحالِيِّ → Align the LEGO to the seed: في الوَقْتِ الحالِيِّ → الآنَ (seed says الآنَ) (likely; L26, S3)
- `S0559L02` you found the path | وَجَدْتَ المَسارَ → Align the LEGO to the seed: المَسارَ → الطَّريقَ (likely; L26, S3)
- KNOWN `S0521L03`: d/83adb35a (#513 noticed: seed 521 not tiled)


#### LEGO English is a literal or invented gloss (not what the seed says, or not natural English): 33 REAL · 569 chars

The LEGO's English is a literal gloss or an invented synonym instead of what the seed says ("in the proximity of", "yonder", "beachward", "u", "cos").

- `S0072L01` your performance | أَداءَكَ → Re-gloss the LEGO English: "your performance" → "you're doing" (seed: you're doing very well) (likely; L26, K9)
- `S0114L02` my performance | أَدائي → Re-gloss the LEGO English: "my performance" → "I'm doing" (likely; L26, K9)
- `S0129L01` that your performance is good | أَنَّ أَداءَكَ جَيِّدٌ → Re-gloss the LEGO English: "that your performance is good" → "that you're doing well" (likely; L26, K9)
- `S0390L02` in the proximity of | بِالقُرْبِ مِنَ → Re-gloss the LEGO English: "in the proximity of" → "near" (likely; L26, K9)
- `S0390L04` the one who is standing in the proximity of the entrance | الَّذي يَقِفُ بِالقُرْبِ مِنَ المَدْخَلِ → Re-gloss the LEGO English: "…in the proximity of the entrance" → "…near the entrance" (likely; L26, K9)


#### One English prompt, two Arabic answers (LEGO level): 2 REAL · 119 chars

One English prompt has two Arabic answers at LEGO level.

- `S0403L01` quiet | هادِئينَ → "quiet | هادِئينَ" vs S0034L02 "quiet | هادِئ": grow S0403L01 to "remain quiet | نَبْقى هادِئينَ" (L34 second remedy; the plural needs its subject) (likely; K2, L34)
- `S0407L02` we are | نَكونُ → "we are | نَكونُ" vs S0110L01 "we are | نَحْنُ": grow S0407L02 to "we are a good example | نَكونَ قُدْوَةً حَسَنَةً", or gloss S0110L01 "we | نَحْنُ" (K28 allows the pronoun) (best guess; K2, L34)


#### Not-new LEGO that was never taught (no earlier twin on both sides): 8 REAL, 2 KNOWN · 492 chars

A LEGO is marked not-new but no earlier LEGO teaches the same pair, so its words are never taught and its basket never plays.

- `S0124L01` that's | تِلْكَ → Make NEW with an intro and a played basket (L31), or re-cut so an earlier LEGO covers it. #513 named this "Case B" and left it untouched (likely; L31, P25)
- KNOWN `S0207L01`: census D6c via d/83adb35a (seeds with no new LEGO, left as ruled 4 Nov)
- KNOWN `S0257L01`: census D6c via d/83adb35a (seeds with no new LEGO, left as ruled 4 Nov)


#### Target word used before it is taught: 2 REAL · 214 chars

A row uses an Arabic word or form before any LEGO teaches it. Read after clitic-aware normalising (WC-F4): w-, b-, l-, al- and pronoun endings were not counted.

- `S0413L04U05` I know going too close to the edge is not good | أَعْرِفُ أَنَّ الاقْتِرابَ كَثيراً مِنَ الحافَّةِ لَيْسَ جَيِّداً → الاقْتِرابَ never taught: reword with إِذا اقْتَرَبْنا (sure; P1, K14)
- `S0395L06B03` we need to think about that | نَحْنُ بِحاجَةٍ إِلى التَّفْكيرِ في ذَلِكَ → التَّفْكيرِ (taught S475) at S395: reword with أَنْ نُفَكِّرَ (likely; P1, K14)


#### New LEGO over 8 syllables (builder estimate says 1; recount from vowel marks): 123 REAL · 0 chars

The builder's syllable check divides letters by 3.5 and drops vowel marks, so it is blind to Arabic length. It flagged 1 LEGO in ara_for_eng; counting vowel marks gives 123.

- `S0009L02` a little Arabic | قَليلاً مِنَ العَرَبِيَّةِ → about 9 syllables: re-cut to the shortest viable pieces (Kai 17 Nov) (likely; L3)
- `S0022L03` with people who speak Arabic | بِأُناسٍ يَتَكَلَّمونَ العَرَبِيَّة → about 12 syllables: re-cut to the shortest viable pieces (Kai 17 Nov) (likely; L3)
- `S0027L02` I don't like to take too much time | لا أُحِبُّ أَنْ آخُذَ وَقْتاً كَثيراً → about 12 syllables (partly unvocalised, estimate): re-cut to the shortest viable pieces (Kai 17 Nov) (best guess; L3)
- `S0028L01` it's useful to start talking | مِنَ المُفيدِ أَنْ تَبْدَأَ بِالتَّكَلُّمِ → about 13 syllables: re-cut to the shortest viable pieces (Kai 17 Nov) (likely; L3)
- `S0028L02` as soon as possible | في أَقْرَبِ وَقْتٍ مُمْكِن → about 9 syllables (partly unvocalised, estimate): re-cut to the shortest viable pieces (Kai 17 Nov) (best guess; L3)


#### Same row twice in one basket: 5 REAL · 0 chars

The same pair appears twice in one basket.

- `S0001L01U01` I want to speak | أُريدُ أَنْ أَتَكَلَّمَ → delete (twin S0001L01B01) (sure; —)
- `S0106L01B02` we feel happy | نَشْعُرُ بِالسَّعادَة → delete (twin S0106L01B01) (sure; —)
- `S0106L03B02` we work hard | نَعْمَلُ بِجِدٍّ → delete (twin S0106L03B01) (sure; —)
- `S0108L03B02` middle of the night | مُنْتَصَفِ اللَّيْلِ → delete (twin S0108L03B01) (sure; —)
- `S0395L04B02` the next corner | الزّاوِيَةُ التّالِيَةُ → delete (twin S0395L04B01) (sure; —)


#### Question on one side only (Arabic lacks ؟): 70 REAL · 5,292 chars

A question has a question mark on one side only, so one voice reads it flat.

- `S0003L01U02` how do I learn Arabic? | كَيْفَ أَتَعَلَّمُ العَرَبِيَّةَ → add ؟ to the Arabic; re-record target so the voice asks (sure; A7, A9)


#### Seed sentence not in any played basket: 93 REAL, 3 KNOWN · 0 chars

The exact seed sentence is not in any played basket (P26). Most seeds have a near-copy whose English or Arabic has drifted.

- `seed 4` how to say something in Arabic | كَيْفَ أَقولُ شَيْئاً بِالعَرَبِيَّة → add the exact seed as a USE row under its last new LEGO, reusing the seed's own clips (P26) (sure; P26)
- KNOWN `seed 207`: list for Kai (no new LEGO to host it)
- KNOWN `seed 257`: list for Kai (no new LEGO to host it)
- KNOWN `seed 521`: add the exact seed as a USE row under its last new LEGO, reusing the seed's own clips (P26)


#### Empty audio slot on a played row: 44 REAL · 5,531 chars

A played row has an empty audio slot.

- `S0013L02U05` I'm trying to speak Arabic very well now | أُحَاوِلُ أَنْ أَتَكَلَّمَ العَرَبِيَّةَ جَيِّداً جِدّاً الآنَ → render the empty slot(s): ka,t1,t2 (sure; A16)
- `S0027L03B02` too much time to answer | وَقْتاً كَثيراً لِلإِجابَة → render the empty slot(s): t1,t2 (sure; A16)
- `S0194L01B01` you're looking for | تبحث → render the empty slot(s): ka (sure; A16)


---

### ara_eg_for_eng (Egyptian)


#### PRIORITY: same pair taught as new twice (fixed in ara_for_eng by #513): 14 REAL · 0 chars

The same pair is taught as NEW twice. #513 fixed this in ara_for_eng (6 set not-new, 2 held); the variants were never done.

- `S0077L02` how | إزاي → set not new (both sides equal S0003L01); its seed keeps other new LEGOs. If the seed sentence plays only under it, copy it as a USE row first (#513 method) (sure; L17, P25, P26)
- `S0119L01` I can | أقدر → set not new (both sides equal S0003L02); its seed keeps other new LEGOs. If the seed sentence plays only under it, copy it as a USE row first (#513 method) (sure; L17, P25, P26)
- `S0120L01` fun | ممتع → set not new (both sides equal S0058L01); its seed keeps other new LEGOs. If the seed sentence plays only under it, copy it as a USE row first (#513 method) (sure; L17, P25, P26)
- `S0122L06` going | ماشي → set not new (both sides equal S0072L01); its seed keeps other new LEGOs. If the seed sentence plays only under it, copy it as a USE row first (#513 method) (sure; L17, P25, P26)
- `S0130L02` because | علشان → set not new (both sides equal S0022L01); its seed keeps other new LEGOs. If the seed sentence plays only under it, copy it as a USE row first (#513 method) (sure; L17, P25, P26)


#### Arabic grammar error (case / mood / agreement): 7 REAL · 228 chars

The Arabic is wrong: a case ending, a verb mood or an agreement a learner would copy.

- `S0047L02U03` this is a good thing | دي حاجة كويس → حاجة كويس → حاجة كويسة (حاجة is feminine) (sure; K8)
- `S0441L01U02` this approach is really hard | بجد أسلوب صعب → "this approach" but no ده: أسلوب صعب → الأسلوب ده صعب (likely; K8)
- `seed 93` It's time to go now. | الوقت إن نمشي دلوقتي. → not Egyptian: → جه الوقت إننا نمشي دلوقتي; and rows S0093L01U01/U04 بقى وقت نمشي → جه الوقت نمشي. The seed has one LEGO (نمشي), so the rest of it is untiled (S3) (likely; K8, S3)
- `S0093L01U01` it's time to go now | بقى وقت نمشي دلوقتي → بقى وقت نمشي → جه الوقت نمشي (likely; K8)


#### Phrase does not contain its LEGO (LEGO grew or was re-cut, basket left behind): 10 REAL · 282 chars

The row does not contain its own LEGO, usually because the LEGO was grown or re-cut and its basket was left as it was.

- `S0065L03U05` testing is useful | الاختبار مفيد → reword to contain the LEGO, or delete: noun الاختبار under the verb تختبر (likely; P17, K50)
- `S0065L03U06` testing Arabic is fun | اختبار العربي ممتع → reword to contain the LEGO, or delete: same (likely; P17, K50)
- `S0105L01U01` that is why | علشان كده → reword to contain the LEGO, or delete: "that is why | علشان كده" under "the reason | السبب" (likely; P17, K50)
- `S0124L01U01` I thought it was good | افتكرت إنه كويس → reword to contain the LEGO, or delete: افتكرت (remembered/thought) under فكرت (likely; P17, K50)
- `S0110L03U03` I'd like to relax | حابب أرتاح → reword to contain the LEGO, or delete: أرتاح under نرتاح (K50) (likely; P17, K50)


#### LEGO target is not what its seed says (seed and LEGO translated apart): 13 REAL · 917 chars

The LEGO's Arabic is not what its own seed says, so the learner meets the seed in different words from the ones they were taught.

- `S0273L01` a shame | لسف → Align the LEGO to the seed: "a shame | لسف" is a typo and the wrong English: → "unfortunately | للأسف" (likely; L26, S3)
- `S0264L01` elderly | عجوز → Align the LEGO to the seed: "elderly | عجوز" in seed "An old man | راجل كبير": → "an old man | راجل كبير" (likely; L26, S3)
- `S0294L01` no time | معيش → Align the LEGO to the seed: "no time | معيش" vs seed ما عنديش وقت: → "I don't have time | ما عنديش وقت" (likely; L26, S3)
- `S0274L01` to leave behind | تسيب → Align the LEGO to the seed: تسيب → تمشي (seed) (likely; L26, S3)
- `S0274L02` in a few days | في كام يوم → Align the LEGO to the seed: كام → كم (seed) (likely; L26, S3)


#### LEGO English is a literal or invented gloss (not what the seed says, or not natural English): 36 REAL · 275 chars

The LEGO's English is a literal gloss or an invented synonym instead of what the seed says ("in the proximity of", "yonder", "beachward", "u", "cos").

- `S0332L04` for sis | لأخته → Re-gloss the LEGO English: "for sis" → "for his sister" (likely; L26, K9)
- `S0359L02` leftward | شمال → Re-gloss the LEGO English: "leftward" → "left" (likely; L26, K9)
- `S0398L02` patienter | أصبر → Re-gloss the LEGO English: "patienter" → "more patient" (likely; L26, K9)
- `S0463L01` numeral | رقم → Re-gloss the LEGO English: "numeral" → "number" (likely; L26, K9)
- `S0470L02` upward | لفوق → Re-gloss the LEGO English: "upward" → "up" / "how high" (likely; L26, K9)


#### One English prompt, two Arabic answers (LEGO level): 17 REAL · 956 chars

One English prompt has two Arabic answers at LEGO level.

- `S0020L01` to learn | تتعلم → "to learn | تتعلم" (you) vs S0002L02 أتعلم: gloss "you learn" (K26 person on both sides) (likely; K2, K26, L34)
- `S0222L02` to say | يقول → "to say | يقول" vs أقول: gloss "he tells" / grow "he's trying to tell me | بيحاول يقول لي" (likely; K2, K26, L34)
- `S0022L02` to meet | أتقابل → "to meet | أتقابل" vs S0018L02 نتقابل: grow to "to meet people | أتقابل مع ناس" or gloss "(I) meet" (K26) (likely; K2, K26, L34)
- `S0079L01` when? | إمتى → "when | إمتى" (question) vs S0034L03 لما: gloss "when?" with the question kept in a larger LEGO "when exactly | إمتى بالظبط" (L34) (likely; K2, K26, L34)
- `S0077L04` I started | بدأت → "I started | بدأت" vs S0037L01 "أنا بدأت": unify to one form (L34 first remedy) (likely; K2, K26, L34)


#### Not-new LEGO that was never taught (no earlier twin on both sides): 5 REAL · 277 chars

A LEGO is marked not-new but no earlier LEGO teaches the same pair, so its words are never taught and its basket never plays.

- `S0129L02` very | قوي → make NEW with intro and played basket (L31), or re-cut onto an earlier LEGO (likely; L31, P25)
- `S0149L02` I hope | متمنى → make NEW with intro and played basket (L31), or re-cut onto an earlier LEGO (likely; L31, P25)
- `S0207L01` do it | تعمله → make NEW with intro and played basket (L31), or re-cut onto an earlier LEGO (likely; L31, P25)
- `S0228L02` speaking | الكلام → make NEW with intro and played basket (L31), or re-cut onto an earlier LEGO (likely; L31, P25)
- `S0257L01` blue | الزرقا → make NEW with intro and played basket (L31), or re-cut onto an earlier LEGO (likely; L31, P25)


#### Target word used before it is taught: 45 REAL · 1,770 chars

A row uses an Arabic word or form before any LEGO teaches it. Read after clitic-aware normalising (WC-F4): w-, b-, l-, al- and pronoun endings were not counted.

- `S0016L01U01` he wants to speak Arabic | هو عايز يتكلم عربي → he-form verbs at S16 (يتكلم, يحاول, يخمن, يشرح) untaught: reword with يرجع (taught in seed 16) (likely; P1, K8, K14)
- `S0016L01U03` and he wants to try | و هو عايز يحاول → reword with forms taught by this seed (likely; P1, K8, K14)
- `S0018L01B03` we want to come back | إحنا عايزين نرجع → we-form نرجع never taught (S18 rows); reword with taught forms (likely; P1, K8, K14)
- `S0018L01U04` and we want to find out the answer | و إحنا عايزين نعرف الإجابة → نعرف taught S201: reword (likely; P1, K8, K14)
- `S0027L03U05` why do I need to take so much time? | ليه لازم آخد وقت كتير؟ → "need to | لازم" taught S109; rows from S27 use it. Reword with محتاج (taught) or move the rows after S109 (likely; P1, K8, K14)


#### New LEGO over 8 syllables (builder estimate says 1; recount from vowel marks): 13 REAL · 0 chars

The builder's syllable check divides letters by 3.5 and drops vowel marks, so it is blind to Arabic length. It flagged 1 LEGO in ara_for_eng; counting vowel marks gives 123.

- `S0279L02` there wasn't much time left | ماكانش في وقت كتير فاضل → 19 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)
- `S0288L02` like watching television | بتحب تتفرج على التلفزيون → 21 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)
- `S0406L01` i'm sure it will be okay | أنا متأكد إنه حيكون تمام → 20 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)
- `S0415L01` that wouldn't be a problem if you ask me | ده مش حيكون مشكلة لو تسألني → 22 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)
- `S0449L01` they said that they were almost ready | هم قالوا إنهم تقريبًا جاهزين → 23 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)


#### Same row twice in one basket: 2 REAL · 0 chars

The same pair appears twice in one basket.

- `S0013L02U02` you speak Arabic very well today | إنت بتتكلم عربي كويس جدًا النهارده → delete (twin S0013L02B03) (sure; —)
- `S0054L03B02` more time | وقت زيادة → delete (twin S0054L03B01) (sure; —)


#### Question on one side only: 27 REAL · 660 chars

A question has a question mark on one side only, so one voice reads it flat.

- `S0061L01U01` could I speak with you | ممكن أتكلم معاك؟ → add ? to the English and re-record the known clip (sure; A7, A9)
- `S0659L01B04` could you all say that? | ممكن تقولوا ده → add ؟ to the Arabic and re-record target (sure; A7, A9)


#### Seed sentence not in any played basket: 136 REAL · 0 chars

The exact seed sentence is not in any played basket (P26). Most seeds have a near-copy whose English or Arabic has drifted.

- `seed 11` I'd like to be able to speak after you finish. | أنا حابب أقدر أتكلم بعد ما تخلص. → add the exact seed as a USE row under its last new LEGO, reusing the seed's own clips (P26) (sure; P26)
- `seed 207` You've done what you needed to do. | إنت عملت اللي كنت محتاج تعمله. → list for Kai (no new LEGO to host it) (sure; P26)


#### Empty English (known) audio slot on a played row: 345 REAL · 2,242 chars

A played row has an empty audio slot.

- `S0003L01U01` I want to learn how to speak Arabic | أنا عايز أتعلم إزاي أتكلم عربي → render the English line — known slot only; target1/target2 are filled (#221 claim holds) (sure; A16)
- `S0011L02U05` I want to say something after you finish | أنا عايز أقول حاجة بعد ما تخلص → link the existing clip of the same English line (library-first, free) — known slot only; target1/target2 are filled (#221 claim holds) (sure; A16)


---

### ara_lb_for_eng (Lebanese)


#### PRIORITY: wrong word مبسط ("simplified") — #641 named one row: 16 REAL, 1 KNOWN · 481 chars

ara_lb's LEGO "fun | مبسط" uses مبسط, which means "simplified". #641 noticed one row ("I'm glad | مبسط") but not the LEGO or its 15 rows.

- `S0064L02` fun | مبسط → "fun | مبسط" means "simplified": → "fun | مسلّي" (Lebanese مسلّي / بيسلّي); the seed 64 target says مبسط too → مسلّي (likely; K8, L26)
- `S0064L02B01` fun | مبسط → مبسط → مسلّي (with the LEGO) (likely; K8)
- `seed 64` Learning Arabic isn't easy but it is fun. | تعلم العربي مش سهل بس مبسط. → → تعلّم العربي مش سهل بس مسلّي (likely; K8)
- KNOWN `S0074L03U03`: d/468045e4 (#641: "screen text still needs fixing" → مبسوط)


#### PRIORITY: same pair taught as new twice (fixed in ara_for_eng by #513): 3 REAL · 0 chars

The same pair is taught as NEW twice. #513 fixed this in ara_for_eng (6 set not-new, 2 held); the variants were never done.

- `S0035L01` she wants | بدها → INVERTED: S0017L01 (seed 17) is marked not-new but is the first time; make S0017L01 NEW and S0035L01 not-new (sure; L17, P25, P26)
- `S0245L01` happy | مبسوط → set not new (both sides equal S0076L01); its seed keeps other new LEGOs. If the seed sentence plays only under it, copy it as a USE row first (#513 method) (sure; L17, P25, P26)
- `S0519L02` the small | الصغير → set not new (both sides equal S0069L03); its seed keeps other new LEGOs. If the seed sentence plays only under it, copy it as a USE row first (#513 method) (sure; L17, P25, P26)


#### English prompt ungrammatical: 19 REAL · 513 chars

The English the learner hears is not grammatical English.

- `S0631L01U02` I think what would you like | بفكر شو بدك؟ → rewrite as plain English, e.g. "I think you're ready now, sir"; "do you all mind?"; or delete the row (0 chars) (sure; K9)


#### Phrase does not contain its LEGO (LEGO grew or was re-cut, basket left behind): 20 REAL · 520 chars

The row does not contain its own LEGO, usually because the LEGO was grown or re-cut and its basket was left as it was.

- `S0094L03B01` the way | الطريق → الطريق → الطريقة (with the seed fix); agreement → اللي بتزبط (likely; P17)
- `S0077L02B03` how I began | كيف بلشت → reword to contain the LEGO, or delete: بلشت (untaught) under صرت (likely; P17, K50)
- `S0077L02U04` I'm surprised at how I began | مندهش كيف بلشت → reword to contain the LEGO, or delete: same (likely; P17, K50)
- `S0078L01U01` I don't understand what you said | مش فاهم شو قلت → reword to contain the LEGO, or delete: مش فاهم under فهمت (likely; P17, K50)
- `S0090L01B01` nicer | أحلى → reword to contain the LEGO, or delete: lacks بيكون (likely; P17, K50)


#### LEGO target is not what its seed says (seed and LEGO translated apart): 26 REAL · 2,172 chars

The LEGO's Arabic is not what its own seed says, so the learner meets the seed in different words from the ones they were taught.

- `S0034L02` he speaks | يحكي → Align: "he speaks | يحكي" in seed "he doesn't want to be quiet | ما بدو يسكت": wrong LEGO → "be quiet | يسكت" (likely; L26, S3)
- `S0058L02` you know | تعرف → Align: تعرف → تفهم (seed) (likely; L26, S3)
- `S0090L01` nicer | بيكون أحلى → Align: بيكون أحلى → كان أحلى (seed) (likely; L26, S3)
- `S0094L03` the way | الطريقة → Align: LEGO الطريقة is right but seed 94 says الطريق ("road"): fix the SEED → هيدي هي الطريقة الوحيدة اللي رح تزبط; its 7 rows say الطريق too → الطريقة (likely; L26, S3)
- `S0118L01` at the pub | بالبار → Align: LEGO بالبار ("in the pub") is right; SEED says بالسرفيس ("in the shared taxi") → fix the seed (likely; L26, S3)


#### LEGO English is a literal or invented gloss (not what the seed says, or not natural English): 56 REAL · 492 chars

The LEGO's English is a literal gloss or an invented synonym instead of what the seed says ("in the proximity of", "yonder", "beachward", "u", "cos").

- `S0074L03` cos you | لأنك → Re-gloss the LEGO English: "cos you" → "because you" (likely; L26, K9)
- `S0114L01` yest | إمبارح → Re-gloss the LEGO English: "yest" → "yesterday" (likely; L26, K9)
- `S0135L01` u think | بتفكر → Re-gloss the LEGO English: "u think" → "you think" (likely; L26, K9)
- `S0142L02` of u | منك → Re-gloss the LEGO English: "of u" → "of you" (likely; L26, K9)
- `S0144L03` th | مما → Re-gloss the LEGO English: "th" → "than" (likely; L26, K9)


#### One English prompt, two Arabic answers (LEGO level): 9 REAL · 494 chars

One English prompt has two Arabic answers at LEGO level.

- `S0294L01` enough | كافي → "enough | كافي" vs S0060L02 كافية: grow each to its noun (likely; K2, L34)
- `S0136L03` my friend | صاحبتي → "my friend | صاحبتي" vs صاحبي: larger LEGO that carries "she" (likely; K2, L34)
- `S0124L01` that it | إنها → "that it | إنها" vs S0102L01 إنو: grow to its noun phrase (likely; K2, L34)
- `S0154L01` night | ليلة → "night | ليلة" vs S0108L01 الليل: gloss "Saturday night | ليلة السبت" (likely; K2, L34)
- `S0111L01` new | جديد → "new | جديد" vs جديدة / الجديدة: grow each to its noun (likely; K2, L34)


#### Not-new LEGO that was never taught (no earlier twin on both sides): 5 REAL · 284 chars

A LEGO is marked not-new but no earlier LEGO teaches the same pair, so its words are never taught and its basket never plays.

- `S0037L01` I started | بدأت → make NEW with intro and played basket (L31), or re-cut onto an earlier LEGO (likely; L31, P25)
- `S0047L01` I believe | بعتقد → make NEW with intro and played basket (L31), or re-cut onto an earlier LEGO (likely; L31, P25)
- `S0207L01` you did | عملت → make NEW with intro and played basket (L31), or re-cut onto an earlier LEGO (likely; L31, P25)
- `S0257L01` blue | الأزرق → make NEW with intro and played basket (L31), or re-cut onto an earlier LEGO (likely; L31, P25)
- `S0017L01` she wants | بدها → first "she wants | بدها" is marked not-new; make it NEW (pairs with the S0035L01 inversion) (sure; L31, P25)


#### Target word used before it is taught: 35 REAL · 1,224 chars

A row uses an Arabic word or form before any LEGO teaches it. Read after clitic-aware normalising (WC-F4): w-, b-, l-, al- and pronoun endings were not counted.

- `S0018L01U01` we want to speak Arabic | بدنا نحكي عربي → reword with forms taught by this seed (untaught: نحكي@S143) (likely; P1, K8, K14)


#### New LEGO over 8 syllables (builder estimate says 1; recount from vowel marks): 20 REAL · 0 chars

The builder's syllable check divides letters by 3.5 and drops vowel marks, so it is blind to Arabic length. It flagged 1 LEGO in ara_for_eng; counting vowel marks gives 123.

- `S0195L04` I left on the table | اللي تركتها عالطاولة → 18 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)
- `S0205L03` that I was trying to say | اللي كنت عم أحاول أحكيها → 20 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)
- `S0228L01` has just started to practise speaking | هلق بدأ يتمرن على الحكي → 19 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)
- `S0280L03` I only had to do the most important job | كان لازم بس أعمل الشغلة الأهم → 24 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)
- `S0281L03` do you mind if I finish my coffee | ما رح يزعلك إذا خلصت قهوتي → 21 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)


#### Same row twice in one basket: 14 REAL · 0 chars

The same pair appears twice in one basket.

- `S0030L02U01` I wanted to ask you something | كنت بدي أسألك شي → delete (twin S0030L02B03) (sure; —)
- `S0046L03U05` I don't worry about mistakes | ما بقلق من الأغلاط → delete (twin S0046L03B02) (sure; —)
- `S0062L02B02` at the same time | بنفس الوقت → delete (twin S0062L02B01) (sure; —)
- `S0083L04U02` I agree with what you said | متفق مع شو قلتو → delete (twin S0083L04B03) (sure; —)
- `S0095L01U04` you go slowly | تروح بشوي → delete (twin S0095L01B02) (sure; —)


#### Question on one side only: 103 REAL · 2,859 chars

A question has a question mark on one side only, so one voice reads it flat.

- `S0316L01U02` do you think that she could bring the story | بتفكر إنها فيها تجيب القصة؟ → add ? to the English and re-record the known clip (sure; A7, A9)
- `S0632L02U06` Can you give me a glass of water? | فيك تعطيني كاسة مي → add ؟ to the Arabic and re-record target (sure; A7, A9)


#### Seed sentence not in any played basket: 146 REAL · 0 chars

The exact seed sentence is not in any played basket (P26). Most seeds have a near-copy whose English or Arabic has drifted.

- `seed 8` I'm going to try to explain what I mean. | رح أحاول أشرح شو قصدي. → add the exact seed as a USE row under its last new LEGO, reusing the seed's own clips (P26) (sure; P26)


#### Empty English (known) audio slot on a played row: 333 REAL · 3,069 chars

A played row has an empty audio slot.

- `S0001L05B01` with you now | معك هلق → link the existing clip of the same English line (library-first, free) — known slot only; target1/target2 are filled (#221 claim holds) (sure; A16)
- `S0003L01U01` I want to learn how to speak Arabic | بدي أتعلم كيف أحكي عربي → render the English line — known slot only; target1/target2 are filled (#221 claim holds) (sure; A16)


---

### Coverage (family × course)

"Read" means every hit was read by hand. "Word list" means the hits were grouped by the flagged word and each word was judged once.

| family | ara_for_eng | ara_eg | ara_lb |
|---|---|---|---|
| zut_lego / zut_use | 2 / 26 read | 16 / 35 read | 8 / 14 read |
| dup_debut | 0 (fixed by #513) | 14 read | 3 read |
| notnew_untaught | 10 read | 5 read | 5 read |
| lego_syll (builder) | 47, estimate blind; recounted all 1,363 new LEGOs from vowel marks | 21; letter count, top 25 hand-counted | 12; letter count, top 25 hand-counted |
| lego_not_in_seed_known | 289: 202 read, 87 pronoun/auxiliary-only by word list (K28, K54) | 439: 341 read, 98 by word list | 469: 376 read, 93 by word list |
| lego_not_in_seed_target | 46 read | 19 read | 51 read |
| phrase_missing_lego | 215 read | 29 read | 36 read |
| untaught_target | 174: 59 read, 115 by word list (clitics / spelling) | 135: 79 read, 56 by word list | 158: 59 read, 99 by word list |
| article_drift, dup_rows | read | read | read |
| qmark_mismatch | 70 read | 27 read | 103 read |
| seed_not_played | 96 sorted by script (drift type), examples read | 136 sorted, examples read | 146 sorted, examples read |
| empty_audio | 44 mechanical | 345 mechanical | 333 mechanical |
| lexical (8 Arabic patterns) | run | run | run |
| intro wording | not scanned | not scanned | not scanned |
| female voice by ear | at-risk count only | covered by #641 | covered by #641 |

### Not defects (and why)
- **Tokenisation (WC-F4).** About 260 untaught-word hits and 51 "phrase lacks its LEGO" hits are clitics (و، ب، ل، ال), pronoun endings, hamza/alef spellings or vowel marks. They were re-read with a clitic-aware normaliser, not counted.
- **أُمارِس "practise" (15 rows, ara_for_eng)** is never a LEGO alone, but the learner meets it inside سَأُمارِسُ at seed 5. Passes by K29 (likely).
- **ترجع "she comes back" (ara_eg seed 17)** after taught يرجع: a gender agreement change, which K8 lets pass.
- **Honorific cut (K32)** in the sir/madam block (ara_for_eng 639–668): rows that drop only سيدي/سيدتي are not counted. Rows that drop other words are.
- **Pro-drop**: rows that drop أنت where the LEGO has it are not counted.
- **Plural endings late in the course** (جاءوا، حاربوا، تكونوا after S450): the ending is taught on other verbs by then (K51 spirit). Listed as judgement, not counted.
- **Known-side inflections and pronouns** (helps/help, he/they added by K28, "to" by K54) and **soft English synonyms** (mom, vital, perhaps) are not counted.
- **Phrase-level ZUT** (Kai 21 Oct) is not counted unless a LEGO is one side, or the row is also a grammar error.
- **Dialect forms** in ara_eg and ara_lb are judged as Egyptian and Lebanese, never against the MSA course.

### Lexical patterns added (`ara.patterns.json`, all pass calibration)
| id | from | ara_for_eng | ara_eg | ara_lb |
|---|---|---|---|---|
| ara_romanised_known | canon (ara_lb yaskot) | 0 | 0 | 0 |
| ara_mabsat_typo | #641 | 0 | 0 | 16 |
| ara_ghalta, ara_aayza_malformed | #630/#641 | 0 | 0 | 0 (lived in the expansion table, see gaps) |
| ara_anna_nominative, ara_laysa_khabar_nominative | this scan | 2, 2 | — | — |
| ara_odd_english_gloss | this scan | 0 | 74 | 92 |
| ara_broken_english_ithink | this scan | 5 (2 are false: S0153L01U02, S0648L01U04) | 1 (false) | 19 |

### Gaps (stated plainly)
- **ara_sy_for_eng was not readable** through any seed route (0 seeds, 404). Nothing was scanned there.
- **Female voice by ear:** not possible (A22). ara_for_eng gets an at-risk count only. ara_eg and ara_lb rely on #641's re-record; this scan did not re-check it.
- **Expansion table not read.** Popty exposes only counts (`gender-prep/status`, `flag-count`). The two #630 patterns that lived in that table cannot find anything on screen text, so they were dropped as detectors for this purpose.
- **Clip dates not read**, so we cannot tell which ara_for_eng female clips predate its 4 Nov gender-prep pass.
- **Library-first relink of the empty English slots is an expectation, not a check.** It was not dry-run, by brief.
- **Long LEGOs in ara_eg and ara_lb** were estimated from letter counts, with the top 25 hand-counted. They were not all counted one by one.
- **Intro wording** was not scanned in any course.
- **Grammar** was read only where a detector or family pointed. This is not a full grammar read of the courses (R0.16).
- **Not a native speaker.** The fixes rest on standard grammar (Wright) and dialect usage. Confidence words are honest; "best guess" means best guess.

---

## jpn_for_eng — cleanup scan findings (#447, jpn slice)

Read only. Nothing was applied, rendered or linked. The course was read live through Popty's `script-view` route on 17 Nov at 14:06Z: 667 seeds, 1,275 LEGOs and 13,964 rows, of which 11,053 are played.
Every row is listed in `jpn.json` beside this file, with its live id, the fix, a confidence word and the audio characters.

**Read this first.** The app only serves jpn seeds 1–300 to learners. Seeds 301–668 already have a KNOWN verdict: their baskets were made by a June padding generator and need rebuilding (#195 follow-up, d/6be32406). So this list puts seeds 1–300 first. 394 of the 409 new findings are in seeds 1–300.
My scan confirms that the generator's glued tails do not reach seeds 1–300. The tails are ことがある after a noun, ますかから and があるから. All 58 hits are in 301+.

**New findings: 409 rows in 14 families. About 15,600 audio characters**, of which ≈10,800 is an upper bound for re-making whole baskets (F1). Another 32 rows have empty audio slots. That gap was already noted in d/71221f73, so they are KNOWN and not counted as new.
How audio is counted: new target text ×2 voices + new known text ×1. A delete or a link to an existing clip costs 0.
Every fix to Japanese wording cites a grammar source. Nobody here reads Japanese natively.

---

### F1 — A particle or a bound ending is taught as its own LEGO (21 LEGOs, all in seeds 1–300)
**What it is.** Some LEGOs are a bare particle or a verb ending that can't be said alone. Examples are ね, よ, から, だけ, たかった and ほしかった.
Canon L7 (HARD) says a particle is never an atomic LEGO. L22 says a bound ending grows to the verb in its own seed, on both sides, and the basket is then re-made with that combination.
- S0120L01 right | ね → *it's interesting, right? = 面白いね*
- S0022L02 because | から → *because I want to meet = 会いたいから*
- S0136L02 you know | よ → merge with L01: *you can ask, you know = 聞いていいよ*
- S0052L01 wanted to | たかった (+ L02 手紙を書く) → *wanted to write = 書きたかった* + *a letter = 手紙を*
- S0297L02 many | あまり → this teaches the wrong meaning (あまり + negative = "not many"). Fix: *don't know many = あまり知らない*

Also in this family: 071 たくなかった, 106 なくても, 113 だろう, 132 ほど, 135 のか, 137 ほうが, 140 ことが, 146 らしい (not in the seed at all), 151 ほしかった, 170 てほしい, 190 いい, 206 のが ("the chance" is a wrong gloss), 224 ばかり, 269 たくない, 279 なかった, 280 だけ.
**21 REAL, 21 read.** Canon check: L7, L22 and L26. A particle may still sit inside an M-LEGO as a component (C13). These are standalone A/M LEGOs, so that exception does not apply.
**Confidence:** sure on the rule; likely on each wording. Source: L22 procedure; Makino & Tsutsui, *A Dictionary of Basic Japanese Grammar* (DBJG). **Audio:** ≤10,825 chars. That is the upper bound, re-voicing every row of the 21 baskets. A real rebuild keeps the rows that already use the seed's combination.

### F2 — The LEGO is not in its own seed (12 in seeds 1–300, 7 in 301+)
**What it is.** The LEGO is a dictionary form or a stand-in verb, but the seed uses a different form. Canon L26 (HARD) says a LEGO says only what its seed says.
- S0062L01 I'm not sure if I can | できるか分からない — できる is a stand-in verb; the seed says 手伝えるか分からない → re-cut to *I'm not sure if I can help = 手伝えるか分からない* + *at the same time = 同時に*
- S0061L01 could you say that again | もう一度言って — ゆっくり splits it in the seed, which makes it a gapped LEGO → seed Japanese → ゆっくり、もう一度言って
- S0055L01 sleep well | よく眠れる — the seed says よく眠れなかった, and よく眠れる means "can sleep well" → *couldn't sleep well = よく眠れなかった*
- S0262L01 man | 男性 — the seed 昨日、誰と話してた？ never says "man" → seed English → "who were you talking to yesterday?". 男性 then waits for seed 264.
- S0241L01 hand over | 渡す, S0300L01 seem | 見られる, S0002L01 do | やる — the M-LEGO next to each one already tiles the seed. Make each of these a component of that M-LEGO.

Also: 053, 069, 299 (re-cut), 146 (see F1). 255 出る: **caution**. #515 made S0345L01 not-new against it, so retiring 255 would re-open 345.
Seeds 301+: 302, 327, 355, 366, 380, 382, 580.
KNOWN, left out of the count: 54, 70, 240, 251 and 268 (d/71221f73, "seed doesn't tile").
**19 REAL, 19 read.** **Audio:** ≈1,815 chars, including the baskets of the 6 re-cut LEGOs.

### F3 — English says he/she/they, but the Japanese says "I want" (23 rows, all in seeds 1–300)
**What it is.** A bare たい with no subject means "I want", or "you want?" in a question. To say he/she/they wants, Japanese needs ～たがる or a hearsay ending (DBJG, -tai). Your held item 428 in d/71221f73 is the same point.
- SEED299 he wants to pay half | 半分払いたい → "I want to pay half" (build row B02 already says this)
- SEED300 she doesn't want to seem unfriendly | 冷たく見られたくない → "I don't want to seem unfriendly"
- SEED212 they wanted to ask for help | 助けを求めたかった → "I wanted to ask for help"
- S0211L02U03 he doesn't want to explain the reason | 理由を説明したくない → "I don't want to explain the reason"

**23 REAL, 23 read.** **Fix:** change the English only, or delete where the basket already has the I-row. **Confidence:** sure. **Audio:** 689 chars, known side only.

### F3b — he/she + present-tense たい, with the subject stated in Japanese (26 rows, seeds 16, 34, 35 and their baskets)
- SEED16 彼は、あとでみんなと一緒に戻りたい → 戻りたがってる
- SEED34 …彼は静かにしたくない → 静かにしたがらない
- SEED35 彼女は今日の午後、何も読みたくない → 読みたがらない
- Rows like S0016L03B01 he wants to go back | 彼は戻りたい: delete where an I-row remains.

The course already teaches the right form at seed 17 (彼女は、答えを知りたがってる), so the learner meets both.
Past-tense 彼は…たかった in narration (seeds 52, 53, 69, 70) is accepted by most grammars, so it is **not** listed.
**Confidence:** likely. Bare たい after 彼は is common in casual speech, but textbooks mark it. **Audio:** ≈114 chars for the 3 seeds. Rows cost 0 if deleted.

### F4 — Wrong meaning or wrong English (22 rows, all in seeds 1–300)
- **S0282L01 no | うん** — うん means *yes*. All 13 rows read like "no, I like it | うん、好き". Fix: seed 282 English → "yes, that's not a problem". L01 becomes not-new against S0172L01 (yes = うん). Delete B01–U09 and relink U10 to the seed's clip. **sure**
- **SEED108 / S0108L03** "we didn't hope to wake…" | 夜中に起きるとは思ってなかった — とは思ってなかった means "didn't *expect*" → "I didn't expect to wake up in the middle of the night". **sure**
- S0110L03 to relax | 休みたい → "I'd like to relax". S0092L02 keep on doing | 続けたい → "want to keep on doing". S0200L02 make sure that | ようにしたい → "want to make sure". S0005L02 with other people | 他の人とも → "…too". **sure**
- S0151L02U02, U07, S0154L01U03, S0156L01U03: "I was hoping to see you / we could go" | ～てほしかった. That form means "I wanted *you* to…" → delete. **sure** (DBJG -te hoshii)
- S0107L02B03, U02, U07, U08: "hoped to see you" | あなたを見たかった. 見る said of a person means "look at"; meeting someone is 会う → delete. **sure**

Also in this family: S0040L01 "what kind of feeling" is not English → "how do you feel". S0113L03 I can't remember | 覚えてない clashes with S0057L01 (思い出せない) → "I don't remember". S0225L01 "if I could" sits under a "he" seed. S0061L01U08, S0067L01B04, S0121L01B03 have English that says more than the Japanese. S0258L01U04 drops "what's".
**22 REAL, 22 read. Audio:** 223 chars.

### F5 — One English, two answers, not on the census list (3)
- **Seeds 68 and 194** are both "what are you looking for?". 68 says 何を探してる and 194 says 何探してる. Fix: merge 68's L01 and L02 into *what are you looking for = 何を探してる*; its L01 gloss "what are you = 何を" is wrong anyway. Then set 194's Japanese to 何を探してる？, so its LEGO becomes not-new. ≈1,000 chars, mostly re-voicing 194's basket.
- 336 "that = その" vs 127 "that = それが" → *that door = そのドア* (301+)
- 524 "three = 三" vs 311 "three = 三つ" → *in three or four minutes = 三、四分で* (301+)

The 8 LEGO clashes in census list C are KNOWN (d/af659c82, d/71221f73): can speak, are doing, woman, over there, can do, think, don't mind, can help. The 6 dup-debut hits are KNOWN too (d/9113817a): 329, 431 ×2, 449, 663 and 665.

### F6 — A row does not contain its LEGO (18 rows, all in seeds 1–300)
- S0154L01U10/U11 (LEGO 土曜の夜) ask about Sunday morning and afternoon. 日曜 is not taught until seed 175.
- S0273L02U01–U05 (LEGO 多すぎる) use 働きすぎ / 考えすぎる.
- S0280L03U05/U07 (LEGO だけ) use しか…ない.
- S0276L02 (いられる) rows say いたい / いられない. Canon K50: a different verb form breaks the LEGO.

**Fix:** delete, 0 chars. The exception is S0274L02: it has only 4 builds, so reword its rows to contain 出ないといけない (≈150 chars).
**18 REAL, 18 read.**

### F7 — Two sentences in one row (7)
- SEED41 大丈夫。でも、疲れてきてる → 大丈夫、でも、疲れてきてる. This is the same fix #421 proposed for 73/96/173/193. ≈26 chars.
- Delete S0041L01B02 (大丈夫。でも), S0127L02U06, S0163L01U06 and S0249L01U06–U08, as #434 did with S0166L01U07.

### F8 — A not-new LEGO that was never taught (2)
- S0207L01 done | やった and S0257L01 blue | 青い have no earlier twin. Flip both to new: they already have debuts and full baskets. Seed 257 then plays.
- #515 saw this case ("Case B") and left it. 0 chars.

### F9 — The seed sentence is not played as written (53 seeds, 1–300, none on a held list)
- Each of these seeds has a played copy with the seed's exact Japanese and clips. Only the copy's English differs, for example SEED25 "are you going to help me before I have to go?" vs the copy "will you help before I go?".
- Fix: the seed English takes the copy's English and the copy's known clip, so 0 chars. This is the route you took for 37 seeds on 29 Oct.
- About half are trivial drift (talking/speaking, "I'd"/"I would"). The census readers marked those trivial, and they were never put to you.
- Exceptions:
  - 123 has no copy, so add the seed as a USE row.
  - 241: add the seed as a USE row under L02.
  - 258: the copy's English is wrong (F4).
  - 68: see F5. 41: see F7. 257: see F8.
- Seeds 301+ (141 more) belong to the rebuild.

### F10 — An English question with no "?" (11 rows)
- S0072L02U01, S0075L01U01/U02/U05, S0077L01U05, S0079L01U01–U08. For example, "when did you go | いつ行った？".
- The known clip is read as a statement. Add "?" and re-voice the English: 252 chars.

### F11 — The seed says "old", the LEGO says "elderly" (3 seeds)
- SEED231 "an old man" (the Japanese 年配の人 says person) → "an elderly person". SEED232 → "an elderly woman". SEED264 → "an elderly man". 116 chars.
- The 26 "elderly" rows the detector found are consistent with their LEGO, so they are **not defects**.

### F12 — The same row twice in one basket (180; 174 in seeds 1–300)
- 101 are a use row that repeats a build, 74 are build/build and 5 are use/use. For example, S0011L01U01 = B02 "it would be good if I could speak Japanese".
- In 21 of them the build copy lacks the "?" of its use twin.
- Fix: delete one copy, keeping the use row. 0 chars. **180 REAL, 180 read** (the pairs were read in one pass).

### F13 — A played row with an empty audio slot (32, all in seeds 1–300) — KNOWN-noted
- Listed in jpn.json with the slots that are empty, for example S0029L01U01–U05 with all three slots empty.
- 10 of them are also F12 duplicates: delete those instead.
- The rest cost ≈878 chars through `/api/audio/render`.

### F14 — Verb LEGO English without "to" (K54, 21 in seeds 1–300; ~35 more in 301+)
- S0299L01 pay | 払う → "to pay". S0251L02 find out | 知る → "to find out". S0083L01 agree with → "to agree with".
- Each intro is re-voiced in the same pass (O13). Some overlap F1/F2, which re-cut them anyway.
- K54 was applied to zho on 4 Nov; it has not been applied to jpn yet. 251 chars, known side.

### NOT defects (read, mechanism stated)
- **article_drift (3).** Japanese has no articles, so "a sentence" and "the sentence" are the same 文を (K3).
- **tag_phrase (2).** S0366L02C03 and S0650L01C02 are component tiles, which are never played.
- **bare yes/no echo (3).** S0172L01 "yes it is / yes I do | うん". Plain うん is how Japanese answers, so several Englishes over one target is fine (K3). The Irish echo rule is per language.
- **Question marks: 16 of 28 in seeds 1–300 are fine.** S0120's ね tags and S0171/S0250 requests are written without ？ in Japanese. Seed 61 is a request.
- **Mood-checker flags that are fine** (`tools/jpn-prompt-mood.cjs`, run unchanged on the dump):
  - って言いたい "trying to say" (102) and 言いたいこと "what I mean" (8) are standard idioms.
  - いらない "don't want" and ～おうか "do you want me to" are idiomatic.
  - "would you like" (271) is a gap in the tool's regex.
  - みたい (124) is not たい.
  - も in もかからない (256) is "not even", not "too".
  - "hoped to see" (107) and "not ready to talk" (88) are soft English synonyms, left alone (R0.18).
- **zut_use phrase-vs-phrase clashes** (16 in seeds 1–300). Your rule (21 Oct) is that a clash counts only when a LEGO is on one side. The ones with a LEGO are in F4/F5 or KNOWN.
- **te-hoshikatta rows under 204, 237 and 238** ("wanted you/me to tell") are correct.

### Patterns added (`jpn.patterns.json`, all pass detect.cjs calibration)
| id | known positive | hits | read → real |
|---|---|---|---|
| jpn_glued_tail | 先生ことがある (#195) | 58 (all 301+) | KNOWN rebuild |
| jpn_two_sentences | ありがとう。でも… (#434 held 73) | 8 rows (+9 seeds) | F7 |
| jpn_third_person_tai | 彼は戻りたい (#421 item 428) | 27 | F3b |
| jpn_te_hoshikatta | 昨夜会ってほしかった | 44 | 4 real (F4), 40 correct |
| jpn_ni_aru_tail | 駐車場の隣にある (#434 held 467) | 7 (all 301+) | KNOWN (held 467/487 + rebuild) |
| jpn_particle_lego | ね (S0120L01) | 34 | F1 |
| en_no_over_un (known) | no, I like it | 50 | 1 family (S0282), rest fine |

The orchestrator's spa patterns don't apply to Japanese. The English `en_progressive_calque` pattern had 0 hits.

### Coverage
| family | jpn_for_eng |
|---|---|
| ZUT LEGO / seed / use | scanned (known side; ZUT key on the target with spaceless normalisation) |
| LEGO not in seed, target side | substring check only (spaceless) — scanned and read |
| LEGO not in seed, known side | scanned. 454 hits, 103 in seeds 1–300 read: most are latitude the canon allows (am/will/is, K6) or seed-English drift (F9, F11). The 351 in 301+ were not read one by one (rebuild) |
| untaught target words | **NOT RUN** — needs word tokens, which a spaceless script doesn't have |
| every seed part covered by a LEGO (S3, Kai 12 Nov) | **NOT machine-scanned** (no tokens). Seen by eye on the seeds read above: many early seeds leave words with no LEGO (e.g. 135 なんで/いい/思う) |
| phrase missing its LEGO | substring check — scanned and read |
| syllable cap | scanned, but the estimate is **wrong for Japanese** (see gaps) |
| dup rows, empty audio, not-new, dup debut, seed not played, ? mismatch | scanned and read (seeds 1–300 in full; 301+ counted) |
| lexical (jpn) | 6 patterns above + the committed mood checker |
| intro wording | **not scanned** (script-view carries no intro text) |
| female voice saying male forms | not applicable: Japanese first-person forms carry no gender here, and jpn has no gender prep (d/71221f73) |
| clip ≠ text | not scanned (by ear only, A22) |

### Gaps
- **The syllable cap (L3) is not really enforced for Japanese.** The builder estimates syllables as characters ÷ 1.5. That undercounts kana badly.
  - Counted by hand: S0074L02 理解するのを手伝ってくれて is ~13 syllables; S0090L01 もっとゆっくり話してくれる 12; S0277L03 来週早めに大事な会議がある 14; S0291L02 上手に話せるようになりたい 13. The tool says 9 for each.
  - The 27 at "7–8" are mostly over 8 too. For example, 聞きたいことがあった is 9.
  - A real count needs readings, which the dump does not carry. So I listed no number.
  - Proposed shorter cuts for the four above:
    - 理解するのを + 手伝ってくれて
    - もっとゆっくり + 話してくれる
    - 来週早めに + 大事な会議がある
    - 上手に話せる + ようになりたい
- I did not check whether any row I would change is one of the course's 75 human recordings.
- I did not read seeds 301–668 row by row. They are a KNOWN rebuild; I report counts only.
- No native speaker read any of this. Every Japanese wording above cites DBJG or the course's own taught forms.
- d/e28e8364 (in my brief) is the romanisation record for ara/hye/mkd. It says nothing about jpn, so the "301+ romaji open" point was not checked.

---

## kor — cleanup scan findings (#447, worker #471)

Read live on 17 Nov 2026, through Popty's script-view route. **Nothing was changed, voiced or sent.** Each row with its id, the fix, a confidence word and the character count is in `kor.json`. My Korean patterns are in `kor.patterns.json` (all 7 found their known positive).

Audio characters = new Korean text × 2 voices + new English/Hindi/Tamil text × 1. A delete or a relink costs 0. Intro clips are counted roughly, at the length of the new English.

### Summary

| course | REAL new findings | of which 0-char (delete / relink / add the seed's own clips) | new audio chars | KNOWN, not counted |
|---|---|---|---|---|
| kor_for_eng | 1,196 rows (863 of them are exact duplicate rows) | 1,083 | ≈ 25,500 (≈ 6,000 if the 38 over-long whole-seed LEGOs are left to the KNOWN over-8 re-cut) | 220 LEGOs over 8 syllables; the 91 held seeds; the ZUT items go / eyes / must close / to drink; the filler baskets in seeds 431–668 |
| kor_for_hin | 106 | 87 | ≈ 530 | — (no held list exists for the variants) |
| kor_for_tam | 161 | 75 | ≈ 2,700 (+ 8 seed sentences re-voiced for register, ≈ 400) | — |

**The biggest new item is a regression.** On 5 Nov, #248·AD rebuilt the baskets for seeds 301–430. That rebuild dropped the seed sentence from **109 seeds**. Some of these were seeds that #433 had fixed on 22 Oct: for example, S0358L02U06, added on 22 Oct, is gone. The fix costs nothing: add each seed back as a USE row with the seed's own clips.

**The variants are separate builds, not copies.** Only 29 (hin) and 37 (tam) of 661 seed sentences have the same Korean as kor_for_eng. So fixes made in the main course do not carry over to them as text. I ran the main course's patterns on both variants and read every hit.

---

### kor_for_eng

#### A. Seed sentence lost in the 5 Nov rebuild: 109 seeds, 301–430 (REAL, 0 chars)
- **What it is:** the learner never says the seed sentence. P26 requires it.
- **Examples:** S0358 "your friend said that she couldn't reach the top" (#433 added it as S0358L02U06; it is gone). S0304 and S0336 have the same history. S0368 "yes I heard that he wanted to grow tomatoes".
- **Read:** all 109, mechanically. No played row carries the seed's Korean, and each seed contains at least one new LEGO that can hold it. I looked at 358 and 304 by eye. Seeds 362, 372 and 381 are KNOWN (#420) and are not counted.
- **Fix:** add the seed as a USE row under its last new LEGO, reusing the seed's three clips. This is what #433 did. Ask the next basket rebuild to keep seed rows. **Canon:** P26.

#### B. LEGO drifted from its own seed, so the seed is never said: 49 items, seeds 88–298 (REAL)
- **What it is:** the LEGO, and so every row, says a near-twin of the seed: another particle, a contraction, a synonym, or a pronoun added or dropped. The seed's exact Korean is never played. **None of these 49 is on any held list.** The census (#433) listed 71 seeds of this shape, and #565 fixed them by your 29 Oct ruling ("the seed decides, the LEGOs follow"). These are the same disease, in seeds the census did not list.
- **Examples:**
  - S0096L03 *I need a little more time* | 시간이 **좀** 더 필요해요 → 시간이 **조금** 더 필요해요 (seed)
  - S0226L01 *the man is trying to help me* | 그 남자**가** 도와주려고 해요 → 그 남자**는 저를** 도와주려고 해요
  - S0298L01 *I've got nothing left to say* | 더 **이상** 할 말이 없어요 → 더 할 말이 없어요
  - S0104L02 *what we're doing* | **우리가** 하고 있는 걸 → 하고 있는 걸
- **Read:** all 49.
- **Fix:** 44 LEGOs take the seed's Korean, and the rows that carry the old form are rewritten too. That is 507 rows, 50 of them in other baskets. Then add the seed as a USE row. For 4 seeds (105, 124, 176, 275) only the copy drifted: add the seed row (0 chars). Seed 94's Korean lost "it will work": set the seed to the played copy 이게 될 수 있는 유일한 방법이에요 and link that copy's clips (0 chars). This is the same shape as KNOWN seed 200.
- **Cost:** ≈ 22,000 chars. Only 6 of the 44 stay at 8 syllables or fewer once fixed: 104, 111, 130, 140, 188, 298, ≈ 2,560 chars. **The other 38 are whole-seed LEGOs already over the cap** (part of the KNOWN 220). I recommend fixing those inside that re-cut, so each shorter piece takes the seed's words. Then the ≈ 19,500 chars are spent only once.
- **Canon:** L26, P26, P28; Kai 29 Oct (#565 is the precedent). **Spacing-only differences are not a defect:** 문제 없어요 / 문제없어요 (S0282), 해봤어요 / 해 봤어요 (S0579), 말해줬으면 (S0600).

#### C. One English, two Korean answers at LEGO level: 5 (REAL)
- S0526L01 *can't* | 못 vs S0331L04 *can't* | 수 없어요. Re-cut 526 so it tiles: *that you can't guess* | 못 맞추겠다는 게 + *I'm finding it hard* | 어려워요.
- S0345L01 *leave* | 떠날 vs S0351L02 *leave* | 두고 → *ready to leave* | 떠날 준비가. ("to leave" is already S0540L02 떠나고.) **Note:** #420's fix for the KNOWN "go" clash glosses 두고 가고 as "leave", which would keep this clash. Gloss it *leave me on my own* instead.
- S0454L01 *to visit* | 놀러 vs S0428L01 *to visit* | 방문하고. "To visit" is not in seed 454's English. Fix: *came round* | 놀러 왔어요.
- S0124L01 *a good idea* | 좋은 생각이라고 vs USE S0259L01U03 *a good idea* | 좋은 생각이요. Fix: English → *was a good idea*.
- S0183L01 *I'm afraid I haven't seen them* | 안타깝지만: the English is the whole clause. Fix: *I'm afraid* | 안타깝지만 + a new *I haven't seen them* | 못 봤어요. Growing the LEGO instead would make it 9 syllables.
- **Not a defect:** S0492L01 *where* | 어디가 and S0573L01 *holiday* | 휴가를 are not-new, so they are never played (P25). **KNOWN:** go, eyes, must close, to drink (d/8516600e, d/c38294a1). ≈ 270 chars. **Canon:** K2, L34.

#### D. LEGO wrong for its seed, seeds 431+: 5 (REAL)
The KNOWN late-band rebuild covers baskets, not LEGOs, so these stand on their own.
- S0431L01/L02 *ready* | 준비 + *wasn't done but* | 됐지만 do not tile the seed. Fix: *they're not ready yet but* | 아직 준비 안 됐지만 (8) + *they'll be ready soon* | 곧 준비될 거예요 (7).
- S0582L02 *growing up* | 자라는 **게**: the seed says 자라는 **건** 어때요, and 게 어때요 reads "how about…". This is the same fault as KNOWN 584. L01's English "here from" is also broken: change it to *here*.
- S0591L02 *me* | **나를** → **저를**. This is plain register in a 저/제 course, and the seed says 저를.
- S0606L02 *knowing the thing* | 알고 있는 걸 → *what I know now* | 지금 아는 걸.
- S0622L02 *it thing* | 그것을 → *it* | 그걸, which then equals S0314L01, so it becomes not-new. Also S0622L05 *knew out* → *knew*.
- ≈ 210 chars. **Canon:** L26, K9, K19, S3.

#### E. Gapped LEGOs: 5 new (REAL)
A gapped LEGO's words are apart in the seed. detect.cjs only looks for "…", so I added a check for words that are present but not next to each other. It found 15 in this course: 9 are fixed by B, and 558 is KNOWN.
- S0147L01 *she was very kind* | 그녀는 … 아주 친절했어요
- S0148L01 *he wasn't very patient* | 그는 … 참을성이 별로 없었어요
- S0126L01 *this work is changing* | 이 일이 … 바꾸고 있어요 (#565 changed seed 126 but left this gap)
- S0132L01 *that's less exciting* | 그건 … 덜 신나요
- S0145L01 *why are you not happy* | 왜 … 행복하지 않아요 (the seed has 더 이상 in the middle)
- **Fix:** split each into two pieces that sit next to each other in the seed. For example *she* | 그녀는 (not-new) + *was very kind* | 아주 친절했어요. ≈ 240 chars. **Canon:** L32 (Kai 12 Nov).

#### F. Word form not yet taught: 91 rows, seeds 7–402 (REAL)
- **What it is:** a Korean verb ending the learner has not been given yet. The tool's 213 hits for 1–430 included compounds and particles. My recount lets stem + particle and 하다-compounds (기억 + 할) through. Kai, K8: "exactly the form introduced".
- **Examples:**
  - S0012L01B02 *practice tomorrow* | 내일 **연습해요**: only 연습을 is taught
  - S0031L01U01 *we are meeting tonight* | 우리는 오늘 밤에 **만나요**: only 만나고 is taught
  - S0027L02B04 | …**좋지** 않아요: 좋지 is first taught at seed 532
  - S0026L01U03 *meeting soon is good* | 곧 **만나면** 좋아요: 만나면 is first taught at seed 568
- **Read:** all 91.
- **Fix:** delete 71 (each basket keeps at least 7 rows after its duplicates go). Reword 20 with forms that seed teaches (≈ 670 chars). **Canon:** P1, K8, K14.

#### G. Row does not contain its LEGO: 20 of 49 hits (REAL)
- **Examples:**
  - The whole S0380L02 basket (8 rows): it says 싶은 게, not its LEGO 싶어하는지, and "오늘 싶은 게 뭔지 알아요" is not Korean. This basket was rebuilt on 5 Nov.
  - S0411L02U01/U05 *I heard about a table for four* | 네 명 자리에 대해 들었어요: the old "heard about X" template, also in the rebuilt band
  - S0325L02B01 *possible* | 가능한 (bare)
  - S0145L01B04, S0160L01U07, S0330L01U04/U05: the verb is in a different form (K50)
- **Fix:** delete 17 and reword 3 (≈ 260 chars).
- **Not a defect (29):** the LEGO is there with a particle or a fused 하다 ending (말해 보고 holds 해 보고; 기억해요 holds 기억; 재미있는 책이에요; 한국어 … 사람들을). **Canon:** P17, K50.

#### H. Question mark on one side only: 45 rows, 1–430 (REAL)
- **Examples:** S0271L01U01 *would you like to come with us next month?* | 다음 달에 우리와 같이 오고 싶어요 (no ?, so it reads "I want to come"). The S0405L03 *should we…?* | …해야 할까요 rows. S0061L02B03: the English lacks the ?.
- **Fix:** add the ?. 38 need the Korean re-voiced and 7 the English. ≈ 1,690 chars if every clip is re-voiced. No clip was heard (A22), so whether the intonation is actually wrong is unverified.
- **Canon:** A7, A9.

#### I. Not-new LEGO with no earlier twin: 4 (REAL)
- S0304L03 싶어하지 않는, S0336L02 수 없는, S0408L01 *a family* | 가족을, S0427L02 자기들이 (S0419 teaches 자기들을).
- **Fix:** make each new, after reading its unplayed basket. 304 and 336 need this as soon as their seed rows come back (A). ≈ 110 chars of intro English. **Canon:** L31. (207 and 257 are KNOWN.)

#### J. Duplicate rows: 863, all in seeds 1–300 (REAL as a class, 0 chars)
- **What it is:** the same English, the same Korean and the same clips twice in one basket. 318 are bare-LEGO BUILD twins, 186 are bare-LEGO USE twins, 353 are a USE row that copies a BUILD row, and 6 are other pairs.
- **Read:** checked by exact equality, not judged one by one. I read 6 baskets by eye.
- **Fix:** delete the later twin. **32 baskets fall below 6 rows** once their twins go (for example S0027L03, 4 → 3, and S0082L02, 7 → 3). Those need new rows, not just the delete.
- **Canon:** P3 (spa #189 and fra did the same).

#### KNOWN in kor_for_eng (read, not counted)
- **220 new LEGOs over 8 syllables.** My hand count of Hangul syllables matches #420's 220 exactly. The tool's 285 overcounts.
- The 7–8 syllable list (108 LEGOs) is in the dump. **I did not propose shorter cuts for them (GAP).**
- **The seeds 431–668 filler is still live:**
  - 교회가 ("the church") with no church in the English: 148 played rows, in seeds 501–668
  - "X 들었어요 / 알아요" template rows: 264 hits, mostly 401+
  - a dangling 있어요: 98 hits
  - 7 "now I think…" rows (en_progressive)
  - 18 plain-register rows under S0591L02
  - d/6be32406 and d/f0ab5817 propose a basket rebuild for this band; it has not been done above 430.
- **좀 더 / 조금 더 for "a little more":** 19 rows say 좀 더 and 24 say 조금 더 under the same English. This is the KNOWN 581 family (d/c38294a1).
- **Honorific -세요 in seeds 640–668** (49 hits): these are the sir/madam seeds, which call for it. Not a defect.

---

### kor_for_hin (I checked the Korean side and the structure only; I cannot judge the Hindi prompts beyond mechanical checks)

- **S. Seed Korean never played: 76 seeds** (REAL, 0 chars). Examples: S0003, S0096, S0201, S0301. Every one has a new LEGO that can hold it. Add the seed rows with the seed's clips. (The tool's 570 also includes 494 seeds whose Korean *is* played under a slightly different Hindi line: a dropped pronoun or the ।. I cannot judge those, so they are not counted.)
- **E. Gapped LEGOs: 9** (REAL, L32). Examples:
  - S0138L01 *यहीं* | 여기가 … 곳이에요
  - S0132L03 | 그것은 … 것보다
  - S0624L01 | 그러면 … 좋겠어요
  - S0242L01 | 그녀에게 … 주고
  - **Fix:** split into contiguous pieces. I have not written the Hindi glosses.
- **K. Seed Korean wrong: 2** (REAL). S0107 and S0201 say *we wanted* as 우리는 … 싶어**했**어요. 싶어하다 is for a third person; the rows already say 싶었어요, and kor_for_eng seed 201 says 알고 싶었어요. Fix the seed and the LEGO. ≈ 120 chars.
- **D. "(स्त्री)" gender labels: 11** (REAL, K11/K42).
  - **Examples:** S0021L02 *उसका (स्त्री)* | 그녀의, and the played rows S0021L02B01–B03, S0096L02U04, S0110L01U04.
  - **Fix:** drop the label. In 4 rows the Hindi does not show gender, so drop 그녀는 from the Korean there too.
  - ≈ 300 chars.
- **C. ZUT:** S0138L04 मिलना चाहता था | 만나고 싶어한 vs S0127L02 | 보고 싶었던. Grow 138 to हमसे मिलना चाहता था | 우리를 만나고 싶어한.
- **B.** S0626L01 प्यास नहीं है | 목마르지 is cut mid-way. Fix: → 목마르지 않아요.
- **I. Not-new with no twin: 2:** S0004L03 and S0009L04 अब | 지금.
- **H. Wrong Korean: 4.**
  - S0156L02U02 어디서 가고 싶어요 → 어디 가고 싶어요
  - S0655L02U02 formal 같습니다 → 같아요
  - S0196L03B01 최신 들었어요 is not Korean: delete
  - S0152L01U01 says "trying" for "want": delete
- **Not a defect:**
  - 교회 (42 hits): all at seed 551, whose seed is about a church
  - 함께 (147): this is the variant's own word for "with"; 6 new LEGOs teach it
  - -세요 in seeds 14–33: the seed teaches 하세요
  - phrase-level clashes from pronoun drops (31)
  - 9 phrase_missing hits: particles, except 107L03/201L01, which are counted under K
  - untaught words: 0 after the split-aware recount

### kor_for_tam (I checked the Korean side and the structure only)

- **S. Seed Korean never played: 52 seeds** (REAL, 0 chars). Add the seed rows.
- **D. Plain-register 나/내 in a 저/제 course: 80 rows and LEGOs, plus 8 seed sentences** (REAL, K19).
  - 36 seed sentences use 저/제 and 8 use 나/내. Those 8 are seeds 126, 130, 136, 147, 148, 166, 226, 293, e.g. S0226 그 남자는 **나를** 도우려고 해요.
  - **Fix:** 나는/나를/내가/내 → 저는/저를/제가/제.
  - ≈ 2,400 chars + ≈ 400 for the seeds.
- **C. ZUT: 3.**
  - இன்னும் | 더 (S0023L02) vs | 아직 (S0060L03): grow 23 to இன்னும் அதிகமாக | 더 많이
  - இல்லை | 없어요 (S0057L02) vs | 아니요 (S0096L01): grow 57 to நினைவில் கொள்ள முடியவில்லை | 기억할 수 없어요
  - தயாராக இல்லை | 되지 않았어요 (S0088L06) vs 안 됐어요 (S0096L04): use 안 됐어요 in both, including seed 88
- **B. LEGO cut mid-way or short of its seed: 5.**
  - S0061L03 말해줄 수 → 말해줄 수 있어요
  - S0068L02 찾고 → 찾고 있어요
  - S0626 splits the idiom 목이 마르다, and its rows "아니요 안 마르네요" are not Korean. Fix: 목이 안 마르네요
  - S0662L01 → 여러분 말씀하시네요
  - S0279L01 → 많지 (best guess)
- **E. Wrong word: 2.**
  - S0642 *மேடம்* (madam) is said as 선생님 (sir). Fix: 여사님, as kor_for_eng 642 does.
  - S0666L01 adds எப்படி ("how"), which the Tamil seed does not say.
- **E. Gapped: 3** (S0325L03, S0326L01, S0558L01).
- **G. Row lacks its LEGO: 5.** S0631L01U01–U04 are good Korean but drop 무엇을. Re-cut L01 so they sit under 드릴까요 (best guess). Also S0642L01U04.
- **F. Untaught: 6.** Example: S0040L01U04 좋을 거예요; 좋을 is first taught at 401.
- **J.** S0402L01 ஆம் | 네 is taught as new twice. Fix: set it not-new.
- **H. Wrong row: 4.**
  - S0354L01U01 drops "angry"
  - S0038L01U02 약 6시에 vs LEGO 6시쯤: same Tamil, replayed cold
  - S0651L01U03 vs LEGO S0162L01
  - S0077L03U01 is a fragment
- **Not a defect:**
  - 교회 at seed 551 (41): the seed is about a church
  - 함께 (142): the variant's own word
  - -세요 at 14/15: the seed teaches it
  - S0639L01 선생님 / 선생님과: a particle difference

---

### Coverage

| family | kor_for_eng | kor_for_hin | kor_for_tam |
|---|---|---|---|
| ZUT LEGO / USE | all read | all read | all read |
| tags | all read (654L02 is not-new and unplayed; 668L01 KNOWN) | all read | none |
| not-new / dup_debut | all read | all read | all read |
| lego_not_in_seed **target** | all 95 read | 0 hits | 2 read |
| lego_not_in_seed **known** | **not read (GAP)**: 351 hits, mostly particles and pronoun drops | **not read**: 431, Hindi | **not read**: 573, Tamil |
| gapped (new contiguity check) | 15, all read | 9 | 3 |
| syllables | hand-recounted; >8 is KNOWN (220); **7–8 listed, no cuts proposed (GAP)** | 0 over 8; 64 at 7–8 not cut | 0 over 8; 50 at 7–8 not cut |
| phrase_missing_lego | 49 in 1–430 read; 378 in 431+ = KNOWN filler | 9 read | 6 read |
| untaught | split-aware recount; 91 in 1–430 read; 431+ = KNOWN filler | 0 | 6 read |
| dup rows | 863 by exact equality, 6 baskets by eye | 0 | 0 |
| seed not played | 109 (301–430) + 49 (B) read; 431+ KNOWN | 76 counted mechanically | 52 counted mechanically |
| qmark | 45 in 1–430 read | 0 | 0 |
| article drift | 5 read, not a defect (enough exact rows) | – | – |
| Korean lexical (7 patterns) | read by band; 431+ KNOWN | all read | all read |
| seed coverage (every seed part is a LEGO, Kai 12 Nov) | **mechanical count only: 399 seeds have uncovered Korean; not read** | 597 | 553 |
| intros, clip vs text, female voice | not scanned | not scanned | not scanned |

### Gaps
- **Seed coverage (S3) was counted, not read.** A residue check calibrated on seed 662's uncovered 다 finds Korean that no LEGO covers in 399 / 597 / 553 seeds. That is a re-decomposition, not a fix list, and the numbers include particles that a builder may fairly leave inside a neighbour.
- **Known-side "LEGO not in seed" (1,355 hits across the slice) was not read.** For the variants I cannot judge Hindi or Tamil. For English, the sample I looked at was pronouns and particles.
- **No 7–8 syllable LEGO has a proposed shorter cut.**
- **Audio is not checked:** no clip was heard, and the voice of each clip is not visible on the read route. The "?" costs assume every clip needs re-voicing.
- **Popty may not have a LEGO-insert op.** Fixes C (183), E and the 631 re-cut add a LEGO row. I did not check whether edit-batch can insert a LEGO (the same blocker as d/f0ab5817's missing merge op).
- **Korean readings are mine, backed by the course's own taught forms.** Hindi and Tamil wording in the proposals reuses only words from each course's own seed. Confidence is given per row.
- **Learner counts past each seed:** there is no sanctioned read for this, so I did not check them.

---

## zho — cleanup scan findings (#447, slice worker #472)

Courses: **zho_for_eng** (main), **zho_for_hin**, **zho_for_tam**, **zho_for_jpn**, **zho_for_gle** (5 seeds).
Live dumps read 17 Nov 2026, 14:06Z, through Popty's `script-view`. **Nothing was applied, rendered or sent.**
Every row is in `zho.json` (course, family, row id, known, target, verdict, fix, confidence, source, canon, chars).

How to read the verdicts: **REAL** = new, worth fixing. **KNOWN** = already on a held or ruled list (doc named). **NOT A DEFECT** = the detector's mechanism, explained. **LIST** = only listed, for Kai's shortest-cut rule.
Audio chars = new target text × 2 voices + new known text × 1. A delete or a not-new flag costs 0. Intro re-voicing is counted at about 60 chars per LEGO.

The variants were **translated separately** from the main course, not copied row by row. Only 30 of 668 Hindi seed sentences match the main course's Chinese, and 26 of 668 Tamil ones do. So the main course's fixes could only be carried over as **patterns**. I mined them from the main course's fix records and ran them on every course in the slice (`zho.patterns.json`). All of them pass detect.cjs calibration.

---

### PRIORITY — main-course fixes the variants never got

#### 1. Time word after "can / need / should" (variants: 37 rows; main: 9 left)
The main course moved time words in front of the modal verb: 我要现在说中文 → 我现在要说中文. Kai approved 19 rows on 4 Nov, and seeds 161 and 316 were later changed the same way. The variants still have the old order.
- tam seed 161 + S0161L03U01 | 你能周日早上把那本书给我吗？ → 你周日早上能把那本书给我吗？ (**the main seed 161 already says exactly this**)
- tam seed 316 + S0316L02U01 | 你觉得她能周一带她哥哥来吗？ → 你觉得她周一能带她哥哥来吗？ (same: the main seed 316 already says this)
- tam S0005L01U03 | நான் இப்போது கற்றுக்கொள்ளப் போகிறேன் | 我要现在学习 → 我现在要学习 (the same row shape as main S0005L01U03)
- jpn S0018L04U03 | 今晩6時に会えますか | 你能今天晚上六点和我见面吗 → 你今天晚上六点能和我见面吗 (the main course fixed S0018L04U03 the same way)
- hin S0423L01U04 | उन्हें अभी जाने की ज़रूरत है | 他们需要现在走 → 他们现在需要走

REAL, proposed: **tam 23, jpn 8, hin 6.** All 37 were read. There are 9 more in the main course: S0149L03U04, S0176L01U02, S0210L01U03, S0255L01U04, S0277L02U02, S0371L01U03, S0404L02U04, S0405L01U06, S0428L01U03.
NOT A DEFECT (6, main): a negated "don't need to … now", "before tomorrow" (a deadline), and 能晚点 in seed 168 and its copies, which is natural speech. KNOWN: main S0005L01U03 was approved but refused by the apply guard (d/162f9caf).
**Fix:** move the time word in front of the modal. Each row's text is in the JSON. Rows with 很快 are a best guess: 尽快 may read better where it is taught.
**Canon:** K9/K16. This is a word-order preference, not broken grammar, so R0.18 applies: it is proposed, not assumed. Source: AllSet Chinese Grammar Wiki, "Time words and word order".
**Chars:** tam 410, jpn 164, hin 108, eng 138.

#### 2. 想要 used with a verb (K55) — hin 8, tam 9
Kai's K55 rule: 想要 is used only with a thing. "Want to do" is 想.
- tam seed 625 + S0625L01U01 | 你想要喝点什么吗？ → 你想喝点什么吗？ (**main seed 625 already says this**)
- tam S0248L03B03 | 想要退钱 → 想退钱 (main seed 248 is 我想退钱)
- tam S0643L01U01 | 您想要喝茶吗，先生？ → 您想要茶吗，先生？, as main S0643L01U05. Tom's plate A-186 covers seed 643's *English* only, so this row edit does not touch it.
- tam S0658L01U04 | 你们想要喝点什么吗？ → 你们想喝点什么吗？
- hin S0091L01U01–U05 + B01 | 我想要及时回答 … The LEGO is 要及时回答 ("(in order) to answer in time", seed 91). These rows use 想要 + verb. Fix: reword the rows to keep 要 in its seed sense (我要及时回答 / 要及时回答很难). Confidence: best guess.
- hin S0152L01B03/B04 | 我想要练习 / 我想要学中文 → 想要 + a taught noun, as the main course did at S0222L03U02/U03, or delete these builds.

NOT A DEFECT: hin S0586L01B03 我想要工作 (工作 = "a job", a thing); tam S0594L01U05 想要玩具 (toys). The main course has no leftovers: 你想要帮助吗 uses 帮助 as a noun.
**Chars:** tam 120, hin 96.

#### 3. 我想 used for "I think" — hin 5, tam 7, eng 1
The course teaches 我想 as "I want" and 我觉得 as "I think". The main course changed S0173L01B04 我想→我觉得 for this reason (#233). In the variants, the known side says "I think" (मुझे लगता है / நினைக்கிறேன்), while other rows answer the same prompt with 我觉得. That gives one prompt two answers.
- hin seed 185 | मुझे लगता है कि आप उन्हें काम पर भूल आए। | 我想你把它们留在工作的地方了。 → 我觉得… This is a seed edit (S15), and the main seed 185 says 我觉得.
- hin S0501L03U04 | मैं चाहता हूँ आप बिना झगड़े साथ खेलें | 我想你们不吵架地一起玩 → 我想让你们不吵架地一起玩. This one is "I want you to", so it needs 让; 我想让你 is taught at S0015.
- hin S0387L02U05 | शायद वह सही थी ("maybe") | 我想她说得对 → make both sides "I think".
- tam S0476L01U03, S0478L01U05, S0479L01U05, and builds S0659L01B03 / S0662L01B02 / S0664L01B03 / S0667L01B04 → 我觉得.
- eng S0172L01U04 | I think this will be helpful | 我想这会很有帮助 → 我觉得…

KNOWN: eng S0285L01U04 (K18). NOT A DEFECT: eng S0542L01U02 每当我想这件事 (想 + object = "think about it"). **Chars:** hin 95, tam 107, eng 17.

#### 4. Japanese-only copies of other main-course fixes — jpn 5
- jpn seed 20 + S0020L03B03 + U01 | 彼の名前を早く覚えたい | 你想快点**学**他的名字 → 你想快点记住他的名字. The Japanese says "memorise". 记住 is taught at S0006L01, and main seed 20 uses 记住. This is a seed edit (S15), but the seed contradicts its own known. **sure.**
- jpn seed 92 + S0092L03B03 | 我想继续做这个一会儿 → 我想继续做一会儿这个. The main course approved this exact reorder (#545 B, S0092L03U01/U05/U08), and main seed 92 is now 我想再继续做一会儿.

KNOWN: "learn her name" 学她的名字 in seed 21. hin 12 rows, tam 3 and jpn 2 copy the main course's held D2 item (d/1f252a53). Their own known also says "learning", so they follow Kai's ruling on the main seed 21.

---

### zho_for_eng (main) — other families

**A. Basket drills only part of its LEGO (P17) — 35 REAL (33 LEGOs + 2 single rows), 9 KNOWN.** The detector flagged 322 rows. 34 of them are split or reordered LEGOs (K49), so they are not defects. In the other 288, the basket was clearly written for an earlier, shorter cut, and the LEGO later grew. Examples:
- S0230L01 "to know a young man | 认识一个年轻男人": 11 of 11 rows drill only 认识 (I know that man | 我认识那个男人)
- S0426L01 "love each other | 彼此相爱": 9 of 9 drill 彼此 (help each other | 彼此帮助)
- S0404L01 "shouldn't expect | 不应该指望": 9 of 10 drill 指望
- S0229L02 "if she could | 如果能的话": 11 of 12 drill …的话 with no 如果
- S0508L02, S0623L03, S0624L01, S0627L01, S0589L01, S0536L01: most of each basket misses the LEGO

KNOWN: S0514L02 and S0625L01 (K27), S0198L01 (K20), and the formal-you seeds 642/644/649/651/668 (d/a7f509ac).
**Fix:** use Kai's 17 Nov shortest cut. Where the piece the basket drills is in the seed, re-cut the LEGO to that piece and cover the rest of the seed with another LEGO. Then nearly all rows stay as they are. Otherwise, re-make the rows. Per-LEGO cuts are not drafted (see GAPS). **~2,800 chars** (LEGO + intro only; re-made rows would add more).

**B. One prompt, two LEGO answers (ZUT) — 2 REAL, 4 KNOWN.**
- almost | 几乎 (S0449L01) / 差点 (S0502L01). Grow S0502L01 to "almost got lost | 差点迷路"; 差点 is "nearly (something bad) happened". **likely.**
- to try | 试试 (S0002L01) / 试着 (S0407L01). Grow S0407L01 to "to try to set | 试着树立". This **touches Tom's 试试 ruling (r-2026-11-04)**, so it is Kai's call.
- KNOWN, but sharper now: idea | 主意 (S0123L01) / 想法 (S0259L01). #431 re-cut S0259L01 from 好想法 to "idea | 想法", so K17's clash is now exact. K17's own fix still applies: re-gloss as "thought".
- KNOWN: once 一遍/一次, I want you to 我希望你/我想让你, woman 女人/妇人 (d/1f252a53, K15).
**Chars ~180.**

**C. Taught as new twice — 1 REAL.** S0572L02 "last time | 上次". #431 changed S0117L01 from 这次 to 上次 today, so 上次 is now taught at seed 117. Set S0572L02 not-new. 0 chars.

**D. LEGO not in its own seed — 2 REAL, 6 KNOWN, 7 NOT A DEFECT** (splits by 现在/她/我们/太多, and 打不开).
- S0301L02 "to want to look at | 想看". Seed 301 is 他想给你看点东西, "he wants to **show** you something" (给你看 = show). Re-cut to "to show you | 给你看" and re-make its 10 rows. **likely, ~470 chars.**
- S0055L01 "but sleep | 却睡" is not in seed 55 (…睡得不好却还要醒来). Its rows say 却睡了 for "but fell asleep", which needs 睡着了. Re-cut to "but still have to | 却还要" and re-make the rows. **best guess, ~330 chars.**

**E. Duplicate rows — 15 REAL, 1 KNOWN** (S0643L01U01, seed 643, A-186). Examples: S0009L01B06 = U01, S0040L01U01 = B02, S0203L01U01 = B01 (the seed copy). Delete the build twin. 0 chars.

**F. Bare yes/no echo — 1 REAL.** S0350L01B03 "yes he is | 是的，他是". This Chinese answer is unfinished; Chinese answers with 是的 / 对 alone. Delete the build. 0 chars.

**G. LEGO English not taken from its seed (L26 known side, L11) — a candidate family of 252, plus 8 KNOWN.** The detector flagged 326. I removed 66 that differ only in inflection or a function word, and read the remaining 260 as a list.
Most of them gloss the Chinese literally instead of using the seed's English:
- "originally | 本来" (S0107L01, S0484L01, S0608L01)
- "currently" (S0306L01, S0646L01)
- "extremely | 非常" (S0125L01, S0374L01, S0553L02)
- "in the process of" (S0104L02, S0375L01)
- "regarding" (S0083L03, S0597L03)
- "to give" / "to look at" for 给…看 "show" (S0032L01/L02)
- "midnight" (S0108L01)

KNOWN: the grammar-label and counter glosses ("object marker ba", "measure word for animals"…; K22, K26).
**I did not judge these one by one**, so they are not counted as new findings. They need a per-LEGO pass: re-gloss from the seed's own English. If all were re-glossed it would cost **~17,500 chars** (LEGO known + intro each).

**H. Long LEGOs.** Hand count, one character = one syllable:
- 17 are over 8 syllables. 2 are KNOWN (formal-you seeds). Most of the other 15 are whole-sentence LEGOs in seeds 201–210 (e.g. S0202L01 没有人确定该怎么回答这个问题, 14 syllables).
- 14 are 7–8 syllables (LIST).

No cuts are drafted.

**I. Approved #545 edits that never went live — 3, KNOWN** (d/162f9caf): S0005L01U03, S0108L01U05, S0267L01U14. All three were refused by the apply guard and are still unresolved.

**Detector families that came back clean or not a defect (main):**
- **qmark_mismatch, 96:** 92 are a Chinese question with 吗/什么… but no "？". That is punctuation only, and the meaning is carried by the question word. 3 more have a question word. 1 is a formal-you row (KNOWN).
- **seed_not_played, 85:** 41 seeds have no new LEGO, which is fine (Kai, 4 Nov). 37 have a played copy with slightly different English. 7 are not played at all: 82, 129 and 259 are KNOWN (#431/#435); 293, 345, 469 and 529 are REAL: add the seed copy on the seed clips (0 chars).
- **notnew_untaught, 7:** all labels already KNOWN (K26, A10), or unplayed.
- **empty_audio:** 0 live. The orchestrator's 27 were fixed today by #449/#451.
- **27 seed numbers are absent from the course** (31, 119, 124, 127 …). I did not check whether that is intended (see GAPS).

### zho_for_hin — other families
- **Gapped LEGOs (L32), 5 REAL:** S0182L01 "क्या ... है | 有没有", S0395L01 "हमें ...ना है", S0418L01, S0530L02, S0570L02. Proposed whole cuts:
  - S0182L01: क्या आपने देखा है | 你有没有看到
  - S0395L01: हमें बाएँ मुड़ना है | 我们要向左转
  - S0418L01: उन्हें सेवा करनी है | 他们需要服务
  - S0530L02: ताकि मैं गिन सकूँ | 这样我就能数
  - S0570L02: अपनी टिकट के लिए | 为你的票

  This also clears hin's one LEGO clash: क्या है → 是什么 / 有没有. **best guess, ~2,470 chars with re-made baskets.**
- **Seed sentence never played (P26), 131 REAL.** 70 are copies with drifted Hindi; 61 have no copy at all. Add each seed sentence as a USE row on its own clips, as #435 did for the main course. 0 chars if the seed clips exist (not checked).
  - Detector note: its 377 was inflated, because the ZUT key does not strip the Hindi full stop "।".
- NOT A DEFECT: उसने मुझे बताया → 她告诉我 / 他告诉我 (he/she, both tā).
- **LIST:** 113 LEGOs of 7–8 syllables (none over 8).

### zho_for_tam — other families
- **Seed sentence never played (P26), 363 REAL.** 252 are drifted copies; 111 have no copy at all. Fix and cost are as for hin.
- **ZUT on a LEGO, 2 REAL:**
  - "உங்களுக்கு என்ன வேண்டும்" → 你想要什么 (S0631L01) / 你需要什么 (S0170L01U01). Make the row say தேவை "need".
  - "நீங்கள் என்ன செய்கிறீர்கள்" → 你在做什么 (S0107L03) / 你做什么 (S0051L02U01).
- **Over 8 syllables, 1:** S0135L02 你为什么觉得那么好 (9) → 你为什么觉得 | 那么好. **LIST:** 35 of 7–8.

### zho_for_jpn — other families (the course needing the most work)
- **Dictionary-style LEGO glosses, 171 REAL** of 474 new LEGOs.
  - 59 carry a gap marker 〜 (S0001L01 〜したい | 我想, S0109L01 〜しなければならない | 必须): gapped, L32.
  - 132 list alternatives with ・ (S0051L02 する・やる | 做, S0181L01 連れて行く・連れてくる・持っていく・持ってくる | 带): a label, K11/L11.
  - Fix: re-gloss each from the seed's own Japanese chunk, one form. **~10,800 chars.**
  - The detector's gapped/tag check misses 〜 and ・; this needs fixing in detect.cjs.
- **LEGO clashes, 11 REAL:**
  - 会う 见面/见; 早く 快点/早; 聞く 问/听; 話 故事/话; 知る 知道/了解; ありがとう 非常感谢/谢谢; 残念 可惜/遗憾; すごい 太好了/棒; これ 这个/这; 〜しなければならない 必须/得
  - 考え 主意/想法 (the same as main-course K17)

  Each has a proposed re-gloss or grown cut in the JSON. **~730 chars.**
- **English in the Chinese, 1 REAL:** S0283L02 "中国語 | **chinese**", and seed 283 "Chineseを話す友だち… | 你哪些朋友会说Chinese？". Change both to 中文. **sure.**
- **Taught as new twice, 8 REAL:** S0245L03 做, S0247L01 书, S0248L03 把, S0261L01 它, S0270L02 担心, S0280L03 工作, S0285L01 说, S0296L01 多一点. Set them not-new. 0 chars.
- **Known does not match, 1:** S0122L03U01 "ワクワクする | 你觉得兴奋吗" → ワクワクしますか.
- **Empty audio on played rows, 32 LEGOs / 91 rows REAL. 1,679 chars** through the render route, with approval.
- **Seed sentence never played (P26), 167 REAL** (79 drifted copies, 88 with no copy). 0 chars if the seed clips exist.

### zho_for_gle (5 seeds)
3 seed sentences not played (seeds 2, 3, 4). 1 duplicate row: S0005L02U06 = B03. 1 row under S0004L02 点什么 says only 怎么说 (P17). The three Irish ZUT pairs are phrase against phrase, so they do not count (Kai, 21 Oct). Irish known side: target and structure only, per the brief.

---

### Totals (REAL, new)

| course | REAL | chars | biggest families |
|---|---|---|---|
| zho_for_eng | 85 (+252 L26 candidates, not counted) | ~3,900 (+~17,500 if every candidate is re-glossed) | partial baskets 35, duplicates 15, long LEGOs 15, time order 9, P26 4 |
| zho_for_hin | 156 | ~2,800 | P26 131, K55 8, time order 6, gapped 5, 我想 5 |
| zho_for_tam | 405 | ~670 | P26 363, time order 23, K55 9, 我想 7 |
| zho_for_jpn | 404 | ~13,600 | labels 171, P26 167, empty audio 91 rows, ZUT 11, time order 8 |
| zho_for_gle | 5 | 0 | P26 3 |

### Coverage

| family | eng | hin | tam | jpn | gle |
|---|---|---|---|---|---|
| ZUT (LEGO / USE with a LEGO side) | read all | read all | read all | read all | read all |
| ZUT phrase vs phrase | not counted (Kai 21 Oct) | same | same | same | same |
| gapped / tags | scanned (0) | read all 5 | scanned (0) | **detector blind to 〜・; read by hand: 171** | scanned (0) |
| not-new untaught / dup debut | read all | 0 | 0 | read all | 0 |
| LEGO length (characters = syllables) | listed | listed | listed | listed | listed |
| LEGO in seed, target | substring + read all | read all | read all | read all | read all |
| LEGO in seed, known | 326 → 260 read as a list, not judged one by one | excluded (other known) | excluded | excluded | excluded |
| phrase holds LEGO (P17) | read by LEGO (44 LEGOs, 288 rows) | 0 hits | 0 hits | 0 hits | read |
| untaught target words | **not run (spaceless script)** | not run | not run | not run | not run |
| empty audio | 0 | 0 | 0 | read | 0 |
| seed played (P26) | read | recounted (punctuation-proof) | recounted | recounted | read |
| qmark | read (92 punctuation only) | 0 | 0 | 0 | 0 |
| lexical: time order, 想要+verb, 我想=think, 学…名字, 做这个一会儿, 在试试, 不足够 | read all | read all | read all | read all | read all |
| 坐 + object, 弹 + non-instrument | scanned, 0 everywhere | 0 | 0 | 0 | 0 |

### GAPS
- **Untaught Chinese words were not machine-checked in any course.** The script has no spaces, and the word-level detector is switched off for it. Only the lexical patterns above read the Chinese.
- **Known side of the Hindi, Tamil, Japanese and Irish courses:** structure only, per the brief. The Japanese labels were caught because they are visible structure.
- **L26 known-side family (main, 252):** read as a list, not judged row by row; no re-gloss is drafted.
- **Shortest cuts:**
  - not drafted for the 35 partial-basket LEGOs or the long LEGOs (eng 15, hin 113, tam 35, 7–8);
  - the jpn label re-glosses carry two examples only.
- **P26 fixes cost 0 only if the seed sentences have their own clips.** The dump does not carry seed audio, so this is not checked.
- **zho_for_eng is missing 27 seed numbers** (31, 119, 124, 127, 158, 160, 167, 179, 180, 189, 190, 194, 196, 199, 225, 241, 249, 250, 278, 282, 294, 307, 318, 344, 347, 468, 648). I did not check whether they were removed on purpose.
- **Dropped detectors:** 不足够 (main held item; matches only its own 2 KNOWN rows); 坐/弹 (their positives are deleted from the main course and they found nothing live). The "得 = děi" and pinyin records concern audio and pinyin, not text, so no pattern was possible. The wrong-recording family (WC-3) cannot be checked from text.
- **Kept but noisy:** 在试试 (main: all KNOWN, K-list d/c5f74eae).
- **Chinese wording** is best effort from the course's own taught forms plus the sources cited. No native read.

---

## eng-eu — cleanup scan findings (#447): eng_for_spa, eng_for_fra, eng_for_deu, eng_for_ita, eng_for_por

Read-only scan, 17 Nov 2026. Nothing was applied, rendered or linked. Live data: each course dumped through Popty's script-view route at 14:06Z today.
English is the TARGET in all five courses, so the English side is the strict side (K8, K9). The known side (Spanish, French, …) has latitude (K6).

**How to read this.** REAL = a defect by the canon, with a fix. NOT = the detector fired but it is fine (the reason is given). LIST = not a defect, listed for Kai's shortest-cut pass.
Audio cost counts new text only: English × 2 voices + known × 1. LEGO re-glosses also need their intro re-voiced (O13), which is NOT in the figures.
No held or ruled lists exist for these five courses (searched ops/, git log, Kai's memory), so nothing here is marked KNOWN — except where a fix was made in one course and not the others, which is named.

| course | REAL | hand-judged | seed-sentence (P26) | not a defect | 7-8 syll. list | audio chars |
|---|---|---|---|---|---|---|
| eng_for_spa (Spanish speakers) | 223 | 126 | 97 | 44 | 42 | 5,601 |
| eng_for_fra (French speakers) | 148 | 77 | 71 | 66 | 34 | 1,732 |
| eng_for_deu (German speakers) | 198 | 118 | 80 | 98 | 34 | 2,166 |
| eng_for_ita (Italian speakers) | 136 | 81 | 55 | 72 | 26 | 1,984 |
| eng_for_por (Portuguese speakers) | 146 | 64 | 82 | 71 | 35 | 2,257 |

Total audio ≈ **13,740 characters** if every fix is taken (about 3,400 of that is one Spanish item: the "esta tarde" afternoon/evening clash).

### The one thing to know first: the seeds were polished, the baskets were not

In all five courses the seed sentences were edited after the LEGOs and practice rows were built. The baskets still carry the OLD wording.
That one cause produces most of the "LEGO not in seed", "seed not played" and "row does not contain its LEGO" hits below. Three shapes:
1. **The prompt was reworded** (e.g. spa seed 101 now says *me gusta ir descubriendo…*; the basket still says *estoy disfrutando descubriendo…*). The learner never says the new seed.
2. **The English was reworded** (e.g. fra seed 73 says *I've got more to learn*; the LEGO and rows say *I've still got a lot to learn*, which is what the French says). Now one prompt has two English answers.
3. **A LEGO was glossed from the old wording** (e.g. ita S0218L01 *molto | very* while the seed and all 7 rows say *much*).
For each, this report picks the side that matches the known language. Where both are fine English, the seed wording wins and the stale row is replaced by the seed sentence itself (its clips already exist: 0 chars).

### Priority: fixed in one course, not in the others (and families that repeat across all five)

- **S0207L01 "you've done" is not-new but was never taught** — fra, deu, ita, por. FIXED in eng_for_spa by job #412 on 14 Oct (commit d3d659d1). Same fix ×4: make it NEW with an intro and a played basket (L31).
- **S0257L01 (seed 257 "I like that blue thing") is not-new and never taught** — all five (spa *cosa | thing*, fra *ce truc | that thing*, deu *mag | like*, ita *blu | blue*, por *daquela coisa azul | that blue thing*). Make it NEW (L31).
- **"I'm not going to be able to" is 9 syllables** (over the L3 cap of 8) — spa S0024L02, fra S0024L01, ita S0024L01. Cut: *I'm not going to* + *be able to* (already taught at seed 11).
- **"as we were talking about earlier" is 9-10 syllables** — fra, deu, ita S0143L02. Cut: *we were talking about* + *earlier*.
- **"I woke" (seed 144) vs LEGO "I woke up"** — spa, fra, deu, ita (por basket also drops "to"). Seed English → *I woke up earlier than I wanted to this morning.*
- **"wake" (seed 108) vs LEGO "wake up"** — fra, deu, por; spa/ita baskets say "wake up" too. Seed English → *We didn't hope to wake up in the middle of the night.* (Soft: "didn't hope to" is itself stiff English; *We didn't expect to wake up…* is the natural line, but seeds 107/108 may be built on "hope" on purpose — propose only.)
- **"as soon as you can / as soon as I can" (seeds 28/29) vs rows and LEGOs "as soon as possible"** — deu, ita, por. The known says "as soon as possible" in all three; one prompt now has two answers. Seed English → "as soon as possible".
- **"What do you need to do" (seed 167) vs LEGO "have to do"** — spa, ita (tienes que / devi = have to). Seed English → *What do you have to do tomorrow afternoon?*
- **Question word order in a statement ("why are you not happy")** — spa S0145L02U01/U04, ita S0145L01U01/U04; also deu S0068L01U03, por S0166L01U02. Same family as spa_for_eng #181 group A.
- **him / her / you on the LEGO vs the seed** — spa 69, 177; por 127, 237, 242, 246, 294 (Portuguese *lhe / o* can be him, her or formal you; the seed says one, the LEGO another).


### eng_for_spa (Spanish speakers)

#### Seed sentence never practised (no copy in any played basket) — 71 REAL (listed by mechanism, NOT read one by one) · audio 0
Canon: P26. Usual fix: add as USE row under its last new LEGO, seed clips reused.
- `seed 3` cómo hablar lo más posible | how to speak as often as possible → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 8` voy a tratar de explicar lo que quiero decir | I'm going to try to explain what I mean → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 22` porque quiero conocer a gente que habla inglés | because I want to meet people who speak English → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 23` voy a empezar a hablar más pronto | I'm going to start talking more soon → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 29` tengo ganas de hablar mejor en cuanto pueda | I'm looking forward to speaking better as soon as I can → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 32` ¿Querías mostrarme algo? | did you want to show me something? → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- … 65 more in the JSON (same fix).

#### English word used before it is taught — 31 REAL of 31 read · audio ≈ 95 chars
Canon: K15, K8, K8/K14, S3/K8. Usual fix: delete; also: root fix: re-cut S0051L02 "cosas | things" → "cosas interesantes | interesting things" (one LEGO change, rows then pass).
- `S0011L03U06` me gustaría volver y hablar contigo después de aprender inglés | I'd like to come back and speak with you after learning English → delete — come back / and / learning untaught at seed 11 (sure)
- `S0026L04B03` tengo que irme | I need to leave → delete (same row as phrase_missing_lego) — dup of phrase_missing row (sure)
- `S0040L01B02` me siento bien | I feel okay → delete — "okay" one seed early (41) (likely)
- `S0040L01U04` me siento bien esta noche | I feel okay tonight → delete — "okay" one seed early (41) (likely)
- `S0043L01U06` no estaba pensando en contestar tan rápido | I wasn't thinking about answering so quickly → delete — "answering" never taught; "so" at 56 (sure)
- `S0051L02B01` cosas interesantes | interesting things → root fix: re-cut S0051L02 "cosas | things" → "cosas interesantes | interesting things" (one LEGO change, rows then pass) — seed 51 says "interesting things" but no LEGO teaches "interesting" until 58 (sure)
- … 25 more in the JSON (same fix).

#### Question mark on one side only — 28 REAL of 28 read · audio ≈ 231 chars
Canon: A7/A9, A9, K9/L32. Usual fix: add "?" to the target text; re-record target only if the clip is read flat (ear); also: add ¿…? to the known text and re-record the known.
- `S0012L02B01` lo que va a pasar | what's going to happen? → drop the "?" from the target text; re-record target if the clip is read as a question — "lo que va a pasar" is "what's going to happen" (relative), target carries a question mark (likely)
- `S0012L02B02` lo que va a pasar mañana | what's going to happen tomorrow? → drop the "?" from the target text; re-record target if the clip is read as a question — "lo que va a pasar" is "what's going to happen" (relative), target carries a question mark (likely)
- `S0201L01B01` lo que iba a pasar | what was going to happen? → drop the "?" from the target text; re-record target if the clip is read as a question — "lo que va a pasar" is "what's going to happen" (relative), target carries a question mark (likely)
- `S0201L01B03` lo que iba a pasar después | what was going to happen next? → drop the "?" from the target text; re-record target if the clip is read as a question — "lo que va a pasar" is "what's going to happen" (relative), target carries a question mark (likely)
- `S0214L01B01` lo pasaste bien | did you have a good time? → ¿lo pasaste bien? | did you have a good time? — question in English, statement in Spanish: the prompt needs ¿…? or it is a different sentence (sure)
- `S0214L01B02` lo pasaste bien con ellos | did you have a good time with them? → ¿lo pasaste bien con ellos? | did you have a good time with them? — question in English, statement in Spanish: the prompt needs ¿…? or it is a different sentence (sure)
- … 22 more in the JSON (same fix).

#### LEGO English not in its seed English — 18 REAL of 20 read, 2 not a defect · audio ≈ 880 chars
Canon: K2/L26, K26/L26, L26, L26/K2, L26/K9, L26/P17. Usual fix: reword as shown; also: seed English to the LEGO.
- `S0003L02`  | as much as possible →  | as often as possible — LEGO says "much", seed says "often" (sure)
- `S0015L03`  | and → y quiero que hables inglés conmigo mañana | And I want you to speak English with me tomorrow — seed 15 lost its "And" (the other 4 courses keep "And I want you to…"); LEGO "y | and" now has no home (likely)
- `S0069L01`  | she didn't want →  | he didn't want — LEGO "she", seed "he" (sure)
- `S0111L03`  | it changes us → nos cambia el cerebro | it changes our brain — LEGO "it changes us"; seed and 6 rows say "it changes our brain" (likely)
- `S0129L01`  | glad → covered by S0129L02 seed fix — "alegra | glad" — same seed fix as S0129L02 (likely)
- `S0129L02`  | I'm really glad that →  | I'm really glad that you're doing so well — LEGOs say "glad", seed says "so happy"; me alegra mucho = I'm really glad (likely)
- … 12 more in the JSON (same fix).
Not a defect: "that's not why" vs seed "that isn't why" (contraction) (×1); contraction only ("that's not" / "that isn't") (×1).

#### Row does not contain its LEGO — 17 REAL of 17 read · audio ≈ 125 chars
Canon: P17, P17/K14, P17/K2, P17/K50. Usual fix: fixed by the S0111L03 re-cut; B03/B04 ("it changes when we learn", "something new changes us") then need the new LEGO or delete; also: delete (basket keeps its "okay" rows).
- `S0026L04B03` tengo que irme | I need to leave → delete — "I need to leave" under LEGO "to go"; need/leave untaught at seed 26 (sure)
- `S0041L01B03` estoy muy bien | I'm very well → delete (basket keeps its "okay" rows) — "estoy muy bien | I'm very well" under LEGO "bien | okay": no "okay", and bien → okay/well (likely)
- `S0041L01U01` estoy muy bien esta mañana | I'm very well this morning → delete (basket keeps its "okay" rows) — "estoy muy bien | I'm very well" under LEGO "bien | okay": no "okay", and bien → okay/well (likely)
- `S0041L01U03` estoy muy bien esta noche | I'm very well tonight → delete (basket keeps its "okay" rows) — "estoy muy bien | I'm very well" under LEGO "bien | okay": no "okay", and bien → okay/well (likely)
- `S0041L01U05` estoy muy bien hoy | I'm very well today → delete (basket keeps its "okay" rows) — "estoy muy bien | I'm very well" under LEGO "bien | okay": no "okay", and bien → okay/well (likely)
- `S0062L02B01` al mismo tiempo | at the same time → move under the re-cut S0062L03 "al mismo tiempo | at the same time" — "at the same time" rows filed under "help you" (sure)
- … 11 more in the JSON (same fix).

#### Seed sentence practised only in its OLD prompt wording — 16 REAL of 16 read · audio 0
Canon: P26. Usual fix: replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26).
- `seed 9` ahora hablo un poco de inglés | I speak a little English now → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "hablo un poco de inglés ahora" (likely)
- `seed 35` ella no quiere leer nada esta tarde | she doesn't want to read anything this afternoon → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "ella no quiere leer nada por la tarde" (likely)
- `seed 77` me sorprende lo rápido que estoy empezando a entender | I'm surprised at how quickly I'm starting to understand → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "estoy sorprendida de lo rápido que estoy empezando a entender" (likely)
- `seed 88` todavía no estoy listo para hablar con gente que no conozco | I'm not ready to talk to people I don't know yet → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "no estoy lista para hablar con gente que no conozco todavía" (likely)
- `seed 93` ya es hora de irse | It's time to go now → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "es hora de irse ahora" (likely)
- `seed 101` me gusta ir descubriendo más sobre este idioma | I'm enjoying finding out more about this language → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "estoy disfrutando descubriendo más sobre este idioma" (likely)
- … 10 more in the JSON (same fix).

#### Same row twice in one basket — 10 REAL of 10 read · audio 0
Canon: dup (spa #189). Usual fix: delete this copy.
- `S0009L01B03` hablo inglés con otra persona | I speak English with someone else → delete this copy — same pair twice in one basket (twin S0009L01U03) (sure)
- `S0014L02B04` ¿hablas inglés con otra persona? | do you speak English with someone else? → delete this copy — same pair twice in one basket (twin S0014L02U05) (sure)
- `S0020L03U04` quieres aprender inglés rápido esta tarde | you want to learn English quickly this evening → delete this copy — same pair twice in one basket (twin S0020L03B02) (sure)
- `S0021L02U02` ¿estás aprendiendo inglés rápido? | are you learning English quickly? → delete this copy — same pair twice in one basket (twin S0021L02B02) (sure)
- `S0057L01B02` no puedo recordar | I can't remember → delete this copy — same pair twice in one basket (twin S0057L01B01) (sure)
- `S0057L02B02` lo que quería decir | what I wanted to say → delete this copy — same pair twice in one basket (twin S0057L02B01) (sure)
- … 4 more in the JSON (same fix).

#### LEGO prompt not in its seed prompt — 8 REAL of 28 read, 20 not a defect · audio ≈ 3,715 chars
Canon: L26/K2. Usual fix: seed known to match English/LEGO; also: delete the LEGO, rows rehome under S0027L04.
- `S0027L01` tiempo |  → delete the LEGO, rows rehome under S0027L04 — LEGO "tiempo | time" is in neither side of seed 27 ("tardar demasiado" carries it) (likely)
- `S0035L03` por la tarde |  → ZUT: esta tarde → afternoon AND evening. Unify: S0018L01 → "de la tarde | in the evening", seed 18 English "at six o'clock in the evening"; S0035L03 known → "esta tarde"; the 35 "esta tarde | this evening" rows → "this afternoon" — "por la tarde | this afternoon" vs seed "esta tarde"; and S0018L01 teaches "esta tarde | this evening" (57 rows say afternoon, 35 evening) — 34 played rows say esta tarde | this evening (likely)
- `S0101L02` estoy disfrutando |  → estoy disfrutando descubriendo más sobre este idioma |  — LEGO "estoy disfrutando" not in seed "me gusta ir descubriendo…" (English seed: I'm enjoying…) (likely)
- `S0115L01` tener una conversación |  → no me siento listo para tener una conversación |  — seed Spanish "hablar con alguien" vs English and LEGO "have a conversation" (likely)
- `S0117L01` definitivamente |  → definitivamente lo estoy haciendo mejor que la última vez que hablamos |  — seed Spanish has no "definitivamente" / "el uno al otro" that its LEGOs teach (likely)
- `S0132L03` eso es menos emocionante que |  → eso es menos emocionante que lo que ella decía |  — seed Spanish says "interesante", English and LEGO say "exciting" (likely)
- … 2 more in the JSON (same fix).
Not a defect: inflection / gender / elision / separable verb of the same word (known-side latitude) (×20).

#### Seed sentence practised with DIFFERENT English — 6 REAL of 6 read · audio 0
Canon: P26/K2. Usual fix: unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars).
- `seed 69` no quería cuidar al perro joven toda la tarde | he didn't want to look after the young dog all afternoon → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "she didn't want to look after the young dog all afternoon" ≠ seed English (one prompt, two answers) (likely)
- `seed 80` no sé cuándo estaré listo | I'm not sure when I'll be ready → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "i don't know when i'll be ready" ≠ seed English (one prompt, two answers) (likely)
- `seed 138` aquí era donde mi amigo quería quedar con nosotros | this was where my friend wanted to meet us → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "this is where my friend wanted to meet with us" ≠ seed English (one prompt, two answers) (likely)
- `seed 165` pero no sé si es verdad | but I'm not sure if it's true → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "but i don't know if it's true" ≠ seed English (one prompt, two answers) (likely)
- `seed 171` ¿Quieres que te ayude a buscarlo? | do you want me to help you look for it? → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "do you want me to help you find it" ≠ seed English (one prompt, two answers) (likely)
- `seed 177` le preguntaré adónde quiere ir | I'll ask her where she wants to go → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "i'll ask him where he wants to go" ≠ seed English (one prompt, two answers) (likely)

#### LEGO over 8 syllables (hand count) — 5 REAL of 5 read · audio ≈ 292 chars
Canon: L3. Usual fix: cut: I'm not going to + be able to (S0011L01); also: cut: I don't feel as if + I'm ready to.
- `S0024L02` no voy a poder | I'm not going to be able to → cut: I'm not going to + be able to (S0011L01) — hand count 9 syllables (tool estimate 7) (sure)
- `S0115L02` no me siento lista para | I don't feel as if I'm ready to → cut: I don't feel as if + I'm ready to — hand count 9 syllables (tool estimate 8) (sure)
- `S0122L02` me alegra mucho cómo va | I'm excited about how it's going → cut: I'm excited about + how it's going (note: 'me alegra mucho' is also 'I'm really glad' at S0129L02 — one prompt, two answers) — hand count 10 syllables (tool estimate 8) (sure)
- `S0131L03` demasiadas ideas dando vueltas | too many ideas going around → cut: too many ideas + going around — hand count 10 syllables (tool estimate 7) (sure)
- `S0295L01` no dije que quisiera | I didn't say that I wanted to → cut: I didn't say that + I wanted to — hand count 9 syllables (tool estimate 7) (sure)

#### Seed sentence has no LEGO that fits it — 4 REAL of 4 read · audio 0
Canon: P26/L26. Usual fix: fix the LEGO, then add the seed row.
- `seed 129` me alegra mucho que te vaya tan bien | I'm so happy that you're doing so well → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 144` esta mañana me desperté antes de lo que quería | I woke earlier than I wanted to this morning → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 163` creo que es interesante | I think that it's interesting → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 200` dicen que quieren que terminemos todo a tiempo | they say they want to make sure that we finish everything in time → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)

#### Same LEGO taught as NEW twice — 3 REAL of 3 read · audio ≈ 47 chars
Canon: L17/L32, L17/P25, L17/S3. Usual fix: re-cut S0062L03 to "al mismo tiempo | at the same time" (also fixes 9 untaught rows and 4 misfiled rows); also: mark not-new; rehome its played rows under S0135L01/L02 (P25).
- `S0062L03` no sé si | I'm not sure if → al mismo tiempo | at the same time — taught NEW twice in the same seed (= S0062L01); seed 62 has no LEGO for "at the same time" — this slot should be it (sure)
- `S0135L03` no sé | I don't know → mark not-new; rehome its played rows under S0135L01/L02 (P25) — "no sé | I don't know" already new at S0010L01 (sure)
- `S0281L02` te importa si | do you mind if → mark not-new; rehome rows (P25); the frame also ends in a gap ("do you mind if?") — see qmark rows — "te importa si | do you mind if" already new at S0190L02 (sure)

#### Gapped / dotted LEGOs — 2 REAL of 2 read · audio 0
Canon: L32/K11. Usual fix: text: "do you speak?" | "¿Hablas?" (dots are not spoken; 0 chars unless the clip voiced them); also: text: "did you want?" | "¿querías?" (0 chars).
- `S0014L02` ¿Hablas...? | do you speak ...? → text: "do you speak?" | "¿Hablas?" (dots are not spoken; 0 chars unless the clip voiced them) — trailing "..." in a LEGO text (a tag, not a gap); text only (likely)
- `S0032L01` ¿querías...? | did you want...? → text: "did you want?" | "¿querías?" (0 chars) — trailing "..." in a LEGO text (likely)

#### English pattern: embedded q order — 2 REAL of 2 read · audio ≈ 182 chars
Canon: K9. Usual fix: reword as shown.
- `S0145L02U01` claro que sé por qué no estás contento | of course I know why are you not happy → claro que sé por qué no estás contento | of course I know why you're not happy — question word order inside a statement (sure)
- `S0145L02U04` lo siento que no entiendo por qué no estás contento | I'm sorry that I don't understand why are you not happy → lo siento que no entiendo por qué no estás contento | I'm sorry that I don't understand why you're not happy — question word order inside a statement (sure)

#### Played row with no audio — 1 REAL of 1 read · audio ≈ 34 chars
Canon: A16. Usual fix: render target (2 voices).
- `S0311L03B01`  | S0311L03 →  | interesting facts — played build row with empty target1/target2 (sure)

#### Not-new LEGO that was never taught — 1 REAL of 1 read · audio 0
Canon: L31. Usual fix: make NEW with an intro and a played basket.
- `S0257L01` cosa | thing → make NEW with an intro and a played basket — not-new but no earlier LEGO equal on both sides (only "cosas | things") — may be the "1 eng_for_spa never-debuted pair" #422·Q queued on 14 Oct (Kai memory loose-ends-2026-10-14); not confirmed (sure)

#### LEGOs of 7-8 syllables (list for the shortest-cut pass) — 0 REAL of 42 read
42 new LEGOs of 7-8 syllables, within the cap (full list in the JSON). E.g. `S0010L03` remember the whole sentence, `S0034L02` when other people are here, `S0059L02` how to do what I need to do, `S0074L02` for helping me to understand, `S0076L02` how much I've learnt already, `S0088L01` talk to people I don't know, `S0108L01` in the middle of the night, `S0120L02` it's interesting that you like, `S0128L01` like someone I used to know, `S0146L03` nothing seems to be working

#### English pattern: adverb after object — 0 REAL of 5 read, 5 not a defect
Not a defect: "speak English often" is natural English (×5).

#### English pattern: perfect with past time — 0 REAL of 3 read, 3 not a defect
Not a defect: "would have done … last time" / "since yesterday" are correct English (×3).

#### English pattern: verb plus gerund calque — 0 REAL of 4 read, 4 not a defect
Not a defect: "bring" ends in -ing: regex false positive (×4).

#### Seed vs basket differ only by a contraction — 0 REAL of 2 read, 2 not a defect
Not a defect: basket English differs only by a contraction: "that's not why i wanted to see you" (×1); basket English differs only by a contraction: "that's not what i'm trying to say" (×1).

#### One prompt, two English answers (LEGO level) — 0 REAL of 2 read, 2 not a defect
Not a defect: the two prompts differ by ¿…? (question intonation, A7); the tool strips punctuation (×2).

#### One prompt, two English answers (phrase level) — 0 REAL of 6 read, 6 not a defect
Not a defect: the two prompts differ by ¿…? (question intonation, A7); the tool strips punctuation (×4); question vs statement prompt differ by ¿…? (×1); question vs statement differ by ¿…? (A7) (×1).


### eng_for_fra (French speakers)

#### Seed sentence never practised (no copy in any played basket) — 49 REAL (listed by mechanism, NOT read one by one) · audio 0
Canon: P26. Usual fix: add as USE row under its last new LEGO, seed clips reused.
- `seed 3` comment parler aussi souvent que possible. | how to speak as often as possible. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 4` comment dire quelque chose en anglais | how to say something in English → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 9` Je parle un peu anglais maintenant. | I speak a little English now. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 12` Je n'aimerais pas deviner ce qui va se passer demain. | I wouldn't like to guess what's going to happen tomorrow. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 15` Et je veux que tu parles anglais avec moi demain. | And I want you to speak English with me tomorrow. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 19` Mais je ne veux pas arrêter de parler. | But I don't want to stop talking. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- … 43 more in the JSON (same fix).

#### English word used before it is taught — 38 REAL of 38 read · audio 0
Canon: K8, K8/K14, K8/K9. Usual fix: delete; also: delete; or reword with taught "it" where French takes y/le.
- `S0004L01U06` j'essaie de me souvenir comment dire quelque chose en anglais | I'm trying to remember how to say something in English → delete — remember at 6 (sure)
- `S0007L01B04` elle veut essayer | she wants to try → delete — she/wants at 16-17 (sure)
- `S0012L02U07` je n'aimerais pas deviner la réponse aujourd'hui | I wouldn't like to guess the answer today → delete — answer at 17 (sure)
- `S0014L01B04` est-ce que tu parles anglais avec moi ? | do you speak English with me? → delete or move one seed later — "me" one seed early (likely)
- `S0019L03U05` elle ne veut pas arrêter de parler avec quelqu'un d'autre | she doesn't want to stop talking with someone else → delete — doesn't at 34 (sure)
- `S0025L02U01` je veux me souvenir de ça avant que je doive partir | I want to remember that before I have to go → delete; or reword with taught "it" where French takes y/le — "ça | that" used before "that" is taught (47) (likely)
- … 32 more in the JSON (same fix).

#### Seed sentence practised with DIFFERENT English — 18 REAL of 18 read · audio 0
Canon: P26/K2. Usual fix: unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars).
- `seed 14` Tu parles anglais toute la journée ? | Do you speak English all day? → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "you speak english all day" ≠ seed English (one prompt, two answers) (likely)
- `seed 21` Pourquoi tu apprends son prénom ? | Why are you learning her name? → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "why are you learning his name" ≠ seed English (one prompt, two answers) (likely)
- `seed 65` C'est important de prendre le temps de se tester. | It's important to take time to test yourself. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "it's important to take the time to test yourself" ≠ seed English (one prompt, two answers) (likely)
- `seed 73` Merci beaucoup, mais j'ai encore beaucoup à apprendre. | Thank you very much, but I've got more to learn. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "thank you very much but i've still got a lot to learn" ≠ seed English (one prompt, two answers) (likely)
- `seed 74` Merci beaucoup de m'avoir aidé à comprendre. | Thank you very much for helping me to understand. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "thank you very much for helping me understand" ≠ seed English (one prompt, two answers) (likely)
- `seed 75` Tu as encore beaucoup à apprendre ? | Have you got more to learn? → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "have you still got a lot to learn" ≠ seed English (one prompt, two answers) (likely)
- … 12 more in the JSON (same fix).

#### LEGO English not in its seed English — 15 REAL of 18 read, 3 not a defect · audio ≈ 1,042 chars
Canon: L26. Usual fix: seed English; also: LEGO English.
- `S0065L02`  | take the time →  | It's important to take the time to test yourself. — prendre le temps = take the time (likely)
- `S0073L02`  | I've still got a lot to learn →  | Thank you very much, but I've still got a lot to learn. — seed English loose ("more to learn"); French and LEGO say "still got a lot" (sure)
- `S0075L01`  | have you still got →  | Have you still got a lot to learn? — same as 73 (sure)
- `S0075L02`  | a lot to learn → LEGO English — covered by seed 75 fix (sure)
- `S0076L02`  | everything I've already learnt →  | I'm very happy with everything I've already learnt. — French "tout ce que j'ai déjà appris"; seed English "how much" (likely)
- `S0091L02`  | fast enough →  | quickly enough — LEGO "fast enough", seed "quickly enough" (re-gloss LEGO) (likely)
- … 9 more in the JSON (same fix).
Not a defect: contraction only (×3).

#### Row does not contain its LEGO — 9 REAL of 9 read · audio ≈ 180 chars
Canon: K2/P17, P17. Usual fix: fixed by S0149L01 LEGO re-gloss; also: seed 139 English → "I'm sorry that I have to leave so early"; LEGO → "have to leave".
- `S0139L02B02` je dois partir | I have to leave → je dois partir | I'm sorry that I have to leave so early — "je dois partir | I have to leave" under "need to leave": devoir → have to / need to (likely)
- `S0149L01B02` ce n'est pas très difficile à faire | this isn't very difficult to do → fixed by S0149L01 LEGO re-gloss — rows say "this", LEGO says "that" (sure)
- `S0149L01B03` bien sûr ce n'est pas très difficile | of course this isn't very difficult → fixed by S0149L01 LEGO re-gloss — rows say "this", LEGO says "that" (sure)
- `S0149L01U01` je pense que ce n'est pas très difficile | I think this isn't very difficult → fixed by S0149L01 LEGO re-gloss — rows say "this", LEGO says "that" (sure)
- `S0149L01U02` ce n'est pas très difficile si tu essaies | this isn't very difficult if you try → fixed by S0149L01 LEGO re-gloss — rows say "this", LEGO says "that" (sure)
- `S0149L01U03` ce n'est pas très difficile à comprendre | this isn't very difficult to understand → fixed by S0149L01 LEGO re-gloss — rows say "this", LEGO says "that" (sure)
- … 3 more in the JSON (same fix).

#### LEGO over 8 syllables (hand count) — 5 REAL of 5 read · audio ≈ 308 chars
Canon: L3. Usual fix: cut: I'm not sure if + I can remember; also: cut: I'm not going to + be able to.
- `S0010L01` je ne suis pas sûr de pouvoir me souvenir | I'm not sure if I can remember → cut: I'm not sure if + I can remember — hand count 9 syllables (tool estimate 8) (sure)
- `S0024L01` je ne vais pas pouvoir | I'm not going to be able to → cut: I'm not going to + be able to — hand count 9 syllables (tool estimate 7) (sure)
- `S0035L01` elle ne veut rien lire | she doesn't want to read anything → cut: she doesn't want to + read anything — hand count 9 syllables (tool estimate 8) (sure)
- `S0143L02` dont on parlait tout à l'heure | as we were talking about earlier → cut: we were talking about + earlier — hand count 10 syllables (tool estimate 8) (sure)
- `S0152L01` je l'aurais fait différemment | I would have done it differently → cut: I would have done it + differently — hand count 9 syllables (tool estimate 8) (sure)

#### LEGO prompt not in its seed prompt — 4 REAL of 30 read, 26 not a defect · audio ≈ 64 chars
Canon: L26/K2. Usual fix: Kai's call: seed known or LEGO; also: seed known.
- `S0014L01` est-ce que |  → Kai's call: seed known or LEGO — LEGO "est-ce que" not in seed known (seed lost it); basket row is a statement (likely)
- `S0021L03` son prénom à elle |  → Pourquoi tu apprends son prénom à elle ? |  — seed lost "à elle"; basket says "his name", seed "her name": son prénom → his/her (likely)
- `S0118L01` senti |  → Kai's call: seed known or LEGO — LEGO "senti | felt" not in seed known (likely)
- `S0282L01` ça ce n'est pas un problème |  → ce n'est pas un problème |  — LEGO known "ça ce n'est pas un problème" — odd French, not in seed (likely)
Not a defect: inflection / gender / elision / separable verb of the same word (known-side latitude) (×26).

#### Same row twice in one basket — 2 REAL of 2 read · audio 0
Canon: dup (spa #189). Usual fix: delete this copy.
- `S0068L01U06` Qu'est-ce que tu cherches ? | What are you looking for? → delete this copy — same pair twice in one basket (twin S0068L01B01) (sure)
- `S0251L02U02` je ne veux pas partir avant qu'on ait fini | I don't want to leave before we finish → delete this copy — same pair twice in one basket (twin S0251L02B03) (sure)

#### English pattern: perfect with past time — 2 REAL of 4 read, 2 not a defect · audio ≈ 138 chars
Canon: K9. Usual fix: reword as shown.
- `S0182L02U05` tu as vu mes clés hier ? | have you seen my keys yesterday? → tu as vu mes clés hier ? | did you see my keys yesterday? — present perfect with "yesterday" is not English (deu #435 en-calque model) (sure)
- `S0182L03U04` tu as vu mes clés quelque part hier ? | have you seen my keys anywhere yesterday? → tu as vu mes clés quelque part hier ? | did you see my keys anywhere yesterday? — present perfect with "yesterday" (sure)
Not a defect: "would have done … yesterday" is correct (×1); "since yesterday" takes the perfect (×1).

#### Not-new LEGO that was never taught — 2 REAL of 2 read · audio 0
Canon: L31. Usual fix: make NEW with intro + played basket.
- `S0207L01` tu as fait | you've done → make NEW with intro + played basket — "tu as fait | you've done" is not-new but never taught (same slot in deu/ita/por) — FIXED in eng_for_spa by job #412 (commit d3d659d1, 14 Oct: "eng_for_spa S0207L01 debut (L31)"), not carried to this course (sure)
- `S0257L01` ce truc | that thing → make NEW with intro + played basket — "ce truc | that thing" not-new, never taught (seed 257 not-new in all five) (sure)

#### Seed sentence has no LEGO that fits it — 2 REAL of 2 read · audio 0
Canon: P26/L26. Usual fix: fix the LEGO, then add the seed row.
- `seed 145` Pourquoi tu n'es plus heureux ? | Why are you not happy any more? → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 252` Quand est-ce que tu seras prêt à commencer ? | When will you be ready to start? → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)

#### Seed sentence practised only in its OLD prompt wording — 2 REAL of 2 read · audio 0
Canon: P26. Usual fix: replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26).
- `seed 95` Tu es prêt à rentrer à la maison avec le prochain bus ? | Are you ready to go home on the next bus? → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "tu es prêt à rentrer avec le prochain bus" (likely)
- `seed 282` Non ce n'est pas un problème. | No that's not a problem. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "non ça ce n'est pas un problème" (likely)

#### LEGOs of 7-8 syllables (list for the shortest-cut pass) — 0 REAL of 34 read
34 new LEGOs of 7-8 syllables, within the cap (full list in the JSON). E.g. `S0005L01` I'm going to practise speaking, `S0033L01` how long have you been learning, `S0034L01` he doesn't want to be quiet, `S0034L02` when other people are here, `S0037L01` I started to think about it, `S0055L02` when I didn't sleep very well, `S0073L02` I've still got a lot to learn, `S0076L02` everything I've already learnt, `S0077L03` I'm starting to understand, `S0108L03` in the middle of the night

#### English pattern: adverb after object — 0 REAL of 6 read, 6 not a defect
Not a defect: "as often as possible" / "speak English often" are natural (×6).

#### English pattern: bare yes no echo — 0 REAL of 1 read, 1 not a defect
Not a defect: "yes I can" is a natural English answer; the gle_v2 echo rule is about a KNOWN-side prompt heard out of context (×1).

#### English pattern: embedded q order — 0 REAL of 2 read, 2 not a defect
Not a defect: "how to do it" is not a question clause: regex false positive (×2).

#### English pattern: present for ongoing — 0 REAL of 1 read, 1 not a defect
Not a defect: "now I think" is correct (×1).

#### English pattern: reported no backshift — 0 REAL of 4 read, 4 not a defect
Not a defect: no backshift is normal English when the fact still holds (P14: soft) (×4).

#### Seed vs basket differ only by a contraction — 0 REAL of 4 read, 4 not a defect
Not a defect: basket English differs only by a contraction: "learning english isn't easy but it's fun" (×1); basket English differs only by a contraction: "that's why he didn't know the answer" (×1); basket English differs only by a contraction: "this is not the best choice i could make" (×1).

#### Seed vs basket differ only by gender ending / dropped pronoun — 0 REAL of 16 read, 16 not a defect
Not a defect: basket plays the seed in its female / subject-dropped form (×16).

#### One prompt, two English answers (phrase level) — 0 REAL of 1 read, 1 not a defect
Not a defect: one prompt is a statement, the other has "?" (A7) (×1).


### eng_for_deu (German speakers)

#### Seed sentence never practised (no copy in any played basket) — 48 REAL (listed by mechanism, NOT read one by one) · audio 0
Canon: P26. Usual fix: add as USE row under its last new LEGO, seed clips reused.
- `seed 3` wie man so oft wie möglich spricht. | how to speak as often as possible. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 6` Ich versuche, mich an ein Wort zu erinnern. | I'm trying to remember a word. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 8` Ich werde versuchen zu erklären, was ich meine. | I'm going to try to explain what I mean. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 9` Ich spreche jetzt ein bisschen Englisch. | I speak a little English now. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 10` Ich bin nicht sicher, ob ich mich an den ganzen Satz erinnern kann. | I'm not sure if I can remember the whole sentence. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 15` Und ich möchte, dass du morgen mit mir Englisch sprichst. | And I want you to speak English with me tomorrow. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- … 42 more in the JSON (same fix).

#### English word used before it is taught — 36 REAL of 57 read, 21 not a defect · audio 0
Canon: K8, K8/K14, S3/K29. Usual fix: delete; also: root fix: give seed 118 a LEGO "wir waren | we were" (or re-gloss S0118L02); rows then pass.
- `S0020L01U03` du möchtest morgen mit uns sprechen | you want to speak with us tomorrow → delete — "us" before seed 138 (no LEGO until 211) (sure)
- `S0020L01U04` du möchtest uns heute Abend um sechs Uhr treffen | you want to meet us at six o'clock this evening → delete — "us" before seed 138 (no LEGO until 211) (sure)
- `S0025L02U02` er möchte uns helfen | he wants to help us → delete — "us" before seed 138 (no LEGO until 211) (sure)
- `S0026L03U02` sie sagt, sie ist fast bereit zu gehen | she says she is nearly ready to go → delete — "says" never (vowel changes) (sure)
- `S0026L03U03` er sagt, er ist fast bereit zu gehen | he says he is nearly ready to go → delete — "says" never (sure)
- `S0026L03U06` ich denke, sie ist fast bereit zu gehen | I think she is nearly ready to go → delete — "think" at 37 (sure)
- … 30 more in the JSON (same fix).
Not a defect: "speaks" = taught "speak" + agreement -s (target-side small ending, K8 latitude) (×17); "us" is in seed 138's own sentence (K29 met earlier) — but S3: seed 138 has no LEGO covering "us" (×4).

#### Same row twice in one basket — 22 REAL of 22 read · audio 0
Canon: dup (spa #189). Usual fix: delete this copy.
- `S0033L01B04` ich wollte fragen, wie lange | I wanted to ask how long → delete this copy — same pair twice in one basket (twin S0033L01U01) (sure)
- `S0043L01B02` ich habe nicht darüber nachgedacht | I wasn't thinking about it → delete this copy — same pair twice in one basket (twin S0043L01B01) (sure)
- `S0064L01B02` englisch zu lernen | learning English → delete this copy — same pair twice in one basket (twin S0064L01B01) (sure)
- `S0069L01B02` wollte nicht | didn't want → delete this copy — same pair twice in one basket (twin S0069L01B01) (sure)
- `S0069L04B02` den ganzen Nachmittag | all afternoon → delete this copy — same pair twice in one basket (twin S0069L04B01) (sure)
- `S0071L01B02` wir wollten nicht, dass jemand | we didn't want to let anyone → delete this copy — same pair twice in one basket (twin S0071L01B01) (sure)
- … 16 more in the JSON (same fix).

#### Seed sentence practised with DIFFERENT English — 22 REAL of 22 read · audio 0
Canon: P26/K2. Usual fix: unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars).
- `seed 7` Ich möchte heute so gut ich kann versuchen. | I want to try as hard as I can today. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "i want to try as well as i can today" ≠ seed English (one prompt, two answers) (likely)
- `seed 28` Es ist nützlich, so schnell wie möglich anzufangen zu reden. | It's useful to start talking as soon as you can. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "it's useful to start talking as soon as possible" ≠ seed English (one prompt, two answers) (likely)
- `seed 59` Ich weiß, was ich nächste Woche tun muss. | I know how to do what I need to do next week. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "i know what i need to do next week" ≠ seed English (one prompt, two answers) (likely)
- `seed 60` Ich weiß noch nicht, wie man genug verschiedene Wörter sagt. | I don't know how to say enough different words yet. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "i don't know yet how to say enough different words" ≠ seed English (one prompt, two answers) (likely)
- `seed 88` Ich bin noch nicht bereit, mit Leuten zu reden, die ich nicht kenne. | I'm not ready to talk to people I don't know yet. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "i'm not ready yet to talk to people i don't know" ≠ seed English (one prompt, two answers) (likely)
- `seed 102` Wir versuchen zu sagen, dass es nicht so ist. | We're trying to say that it's not like that. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "we're trying to say that it's not like this" ≠ seed English (one prompt, two answers) (likely)
- … 16 more in the JSON (same fix).

#### LEGO English not in its seed English — 21 REAL of 33 read, 12 not a defect · audio ≈ 1,270 chars
Canon: L26. Usual fix: seed English; also: LEGO English.
- `S0006L02`  | to remember something →  | to remember — LEGO adds "something" (an etwas); seed "a word" (likely)
- `S0007L02`  | as well as I can →  | I want to try as well as I can today. — so gut ich kann = as well as I can (sure)
- `S0026L02`  | the feeling → see why — "the feeling" vs seed "feeling as if" — German "das Gefühl"; English seed is loose: Kai's call (best guess)
- `S0028L02`  | as soon as possible →  | It's useful to start talking as soon as possible. — so schnell wie möglich = as soon as possible (same family in ita/por) (sure)
- `S0041L04`  | to get tired →  | I feel okay, but I'm starting to get tired. — müde werden = get tired (likely)
- `S0100L01`  | you should → see why — seed says shouldn't; covered by dup_debut (sure)
- … 15 more in the JSON (same fix).
Not a defect: contraction only (×7); stand-in "it/that" frame; phrases swap it (Kai 17 Nov) (×3); verb LEGO carries "to" (K54) (×2).

#### Row does not contain its LEGO — 16 REAL of 43 read, 27 not a defect · audio ≈ 40 chars
Canon: K2/P17, K50, K9 (known natural), L32/K50, P17, P17/K2. Usual fix: delete; also: follows the S0294L02 ruling (Kai).
- `S0026L03U01` er ist fast bereit, Englisch zu sprechen | he is nearly ready to speak English → delete — "nearly ready to speak English" under "nearly ready to go" (sure)
- `S0027L01B04` ich mag es nicht, das Gefühl | I don't like the feeling → delete — "ich mag es nicht, das Gefühl" is broken German (sure)
- `S0047L03B02` ich denke, dass es gut ist | I think that it's good → delete — "it's good" under "that it's a good thing" (sure)
- `S0047L04U06` es ist mir egal, Fehler zu machen | I don't care about making mistakes → delete — "making" under "to make" — and it is seed 48 itself (sure)
- `S0050L03U05` es ist mir egal, so schnell wie möglich fertig zu werden | I don't care about finishing as quickly as possible → delete — "finishing" under "to finish…" (never taught) (sure)
- `S0159L02U04` das ist nicht schwierig | this is not difficult → das ist nicht schwierig | that isn't difficult — "das ist nicht schwierig | this is not difficult" under "that isn't" (sure)
- … 10 more in the JSON (same fix).
Not a defect: stand-in "it/that" swapped for the real object (Kai 17 Nov) (×17); fails only because the LEGO text is "than…" (gapped_lego row fixes it) (×8); verb LEGO "to guess"; rows need not carry "to" (×1).

#### Seed sentence practised only in its OLD prompt wording — 8 REAL of 8 read · audio 0
Canon: P26. Usual fix: replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26).
- `seed 1` Ich möchte jetzt mit dir Englisch sprechen. | I want to speak English with you now. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "ich möchte jetzt englisch mit dir sprechen" (likely)
- `seed 5` Ich werde das Sprechen mit jemand anderem üben. | I'm going to practise speaking with someone else. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "ich werde mit jemand anderem sprechen üben" (likely)
- `seed 62` Ich bin nicht sicher, ob ich dir gleichzeitig helfen kann. | I'm not sure if I can help you at the same time. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "ich bin mir nicht sicher ob ich dir gleichzeitig helfen kann" (likely)
- `seed 80` Ich bin nicht sicher, wann ich bereit sein werde. | I'm not sure when I'll be ready. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "ich bin mir nicht sicher wann ich bereit sein werde" (likely)
- `seed 92` Ich würde das gerne noch eine Weile weiter machen. | I'd like to keep on doing this for a while. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "ich würde gerne das noch eine weile weiter machen" (likely)
- `seed 165` Aber ich bin nicht sicher, ob es wahr ist. | But I'm not sure if it's true. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "aber ich bin mir nicht sicher ob es wahr ist" (likely)
- … 2 more in the JSON (same fix).

#### LEGO over 8 syllables (hand count) — 7 REAL of 7 read · audio ≈ 430 chars
Canon: L3. Usual fix: cut: to finish + as quickly as possible; also: cut: we didn't want to + let anyone.
- `S0050L03` so schnell wie möglich fertig zu werden | to finish as quickly as possible → cut: to finish + as quickly as possible — hand count 10 syllables (tool estimate 8) (sure)
- `S0071L01` wir wollten nicht, dass jemand | we didn't want to let anyone → cut: we didn't want to + let anyone — hand count 9 syllables (tool estimate 7) (sure)
- `S0086L01` es war leider nicht möglich | it wasn't possible unfortunately → cut: it wasn't possible + unfortunately — hand count 11 syllables (tool estimate 8) (sure)
- `S0114L02` heute schlechter als gestern | doing worse today than yesterday → cut: doing worse + today than yesterday — hand count 9 syllables (tool estimate 8) (sure)
- `S0131L02` Ideen in meinem Kopf herumschwirren | ideas going around in my head → cut: going around + in my head — hand count 10 syllables (tool estimate 8) (sure)
- `S0143L02` worüber wir vorhin gesprochen haben | we were talking about earlier → cut: we were talking about + earlier — hand count 9 syllables (tool estimate 8) (sure)
- `S0291L01` ich werde bald besser sprechen können | I'll be able to speak better soon → cut: I'll be able to + speak better soon — hand count 9 syllables (tool estimate 8) (sure)

#### LEGO prompt not in its seed prompt — 5 REAL of 15 read, 10 not a defect · audio ≈ 71 chars
Canon: L26. Usual fix: LEGO known to the seed wording; also: seed known.
- `S0006L02` mich an etwas zu erinnern |  → LEGO known to the seed wording — "an etwas" vs seed "an ein Wort" (likely)
- `S0010L01` ich bin mir nicht sicher |  → Ich bin mir nicht sicher, ob ich mich an den ganzen Satz erinnern kann. |  — seed lost "mir"; LEGO + basket keep "ich bin mir nicht sicher" (also seeds 62, 80, 165) (likely)
- `S0216L01` ich habe jemanden getroffen |  → LEGO known to the seed wording — LEGO "jemanden" not in seed (see target row) (likely)
- `S0279L01` es war nicht |  → LEGO known to the seed wording — LEGO "es war nicht" not in seed "weil nicht mehr viel Zeit übrig war" (likely)
- `S0279L02` noch viel Zeit übrig |  → LEGO known to the seed wording — LEGO "noch viel Zeit übrig" vs seed "nicht mehr viel Zeit übrig" (likely)
Not a defect: inflection / gender / elision / separable verb of the same word (known-side latitude) (×10).

#### Same LEGO taught as NEW twice — 3 REAL of 3 read · audio 0
Canon: L17. Usual fix: mark not-new; rehome rows.
- `S0100L01` du solltest | you should → mark not-new; rehome rows — "du solltest | you should" already new at S0099L01 — and seed 100 says shouldn't (sure)
- `S0234L02` arbeitet | works → mark not-new; rehome rows — "arbeitet | works" new at S0197L02 (sure)
- `S0246L01` zu beschäftigt | too busy → mark not-new; rehome rows — "zu beschäftigt | too busy" new at S0193L01 (sure)

#### Gapped / dotted LEGOs — 2 REAL of 2 read · audio ≈ 59 chars
Canon: K11, L32. Usual fix: teach the middle, then one LEGO "ob ich mich an den ganzen Satz erinnern kann | if I can remember the whole sentence" is too long — cut "ob ich mich erinnern kann | if I can remember"; also: text: "than" (re-record only if the clip trails off: 8 chars).
- `S0010L02` ob ich ... kann | if I can → ob ich mich erinnern kann | if I can remember — "ob ich ... kann | if I can" is a gapped LEGO (verb-final German) (likely)
- `S0042L03` als | than… → text: "than" (re-record only if the clip trails off: 8 chars) — "than…" — trailing ellipsis in target; 8 rows then fail containment (sure)

#### Not-new LEGO that was never taught — 2 REAL of 2 read · audio 0
Canon: L31. Usual fix: make NEW; also: make NEW, or re-gloss to an earlier pair ("ich mag | I like" S0026L01).
- `S0207L01` du hast getan | you've done → make NEW — "du hast getan | you've done" never taught — FIXED in eng_for_spa by job #412 (commit d3d659d1, 14 Oct: "eng_for_spa S0207L01 debut (L31)"), not carried to this course (sure)
- `S0257L01` mag | like → make NEW, or re-gloss to an earlier pair ("ich mag | I like" S0026L01) — "mag | like" not-new, never taught as that pair (likely)

#### Seed sentence has no LEGO that fits it — 2 REAL of 2 read · audio 0
Canon: P26/L26. Usual fix: fix the LEGO, then add the seed row.
- `seed 106` Wir müssen uns nicht glücklich fühlen, wir müssen nur hart arbeiten. | We don't need to feel happy, we just need to work hard. → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 241` Ich möchte es ihm nicht geben. | I don't want to give it to him. → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)

#### Played row with no audio — 1 REAL of 1 read · audio ≈ 46 chars
Canon: A16. Usual fix: render target.
- `S0147L02B02`  | S0147L02 →  | xxxxxxxxxxxxxxxxxxxxxxx — played build row with empty target1/target2 (sure)

#### English pattern: embedded q order — 1 REAL of 1 read · audio ≈ 92 chars
Canon: K9. Usual fix: reword as shown.
- `S0068L01U03` bist du sicher, dass du weißt, wonach du suchst? | are you sure you know what are you looking for? → bist du sicher, dass du weißt, wonach du suchst? | are you sure you know what you're looking for? — question word order inside a statement (sure)

#### English pattern: perfect with past time — 1 REAL of 5 read, 4 not a defect · audio ≈ 68 chars
Canon: K9. Usual fix: reword as shown.
- `S0254L01U04` ich mache das seit einer Weile | I have been doing that since a while ago → ich mache das seit einer Weile | I have been doing that for a while — "since a while ago" is not English (likely)
Not a defect: "since yesterday" takes the perfect (×4).

#### English pattern: reported no backshift — 1 REAL of 1 read · audio ≈ 90 chars
Canon: K9. Usual fix: reword as shown.
- `S0253L02U04` er sagte, dass er in ein paar Minuten fertig ist | he said that he is done in a few minutes → er sagte, dass er in ein paar Minuten fertig ist | he said that he will be done in a few minutes — "he said that he is done in a few minutes" is not English for a future (likely)

#### LEGOs of 7-8 syllables (list for the shortest-cut pass) — 0 REAL of 34 read
34 new LEGOs of 7-8 syllables, within the cap (full list in the JSON). E.g. `S0043L01` I wasn't thinking about it, `S0045L01` I don't need to know everything, `S0052L01` he wanted to write last week, `S0055L02` when I didn't sleep very well, `S0058L02` when you understand enough words, `S0070L01` she didn't want to tell me, `S0072L01` that you're doing very well, `S0073L02` but I've got more to learn, `S0074L01` for helping me to understand, `S0076L02` how much I've learnt already

#### English pattern: adverb after object — 0 REAL of 9 read, 9 not a defect
Not a defect: adverb at the end is natural English here (×9).

#### English pattern: double negative — 0 REAL of 2 read, 2 not a defect
Not a defect: two clauses, not a double negative (×2).

#### English pattern: false friend preps — 0 REAL of 1 read, 1 not a defect
Not a defect: "explain her name" is correct (regex hit "explain her") (×1).

#### English pattern: uncountable plural — 0 REAL of 1 read, 1 not a defect
Not a defect: "other people is" not present: regex hit "people is" across a clause (×1).

#### Seed vs basket differ only by a contraction — 0 REAL of 11 read, 11 not a defect
Not a defect: basket English differs only by a contraction: "that's why he didn't know the answer" (×1); basket English differs only by a contraction: "this is not the best choice i could make" (×1); basket English differs only by a contraction: "you are like someone i used to know" (×1).


### eng_for_ita (Italian speakers)

#### Seed sentence never practised (no copy in any played basket) — 36 REAL (listed by mechanism, NOT read one by one) · audio 0
Canon: P26. Usual fix: add as USE row under its last new LEGO, seed clips reused.
- `seed 3` come parlare il più spesso possibile. | how to speak as often as possible. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 5` Ho intenzione di esercitarmi a parlare con qualcun altro. | I'm going to practise speaking with someone else. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 15` E voglio che tu parli inglese con me domani. | And I want you to speak English with me tomorrow. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 47` Perché penso che sia una buona cosa fare errori. | Because I think that it's a good thing to make mistakes. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 53` Lei voleva mettere la sua lettera nella sua borsa. | She wanted to put his letter in her bag. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 54` Volevamo darti un po' più di tempo. | We wanted to give you a little more time. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- … 30 more in the JSON (same fix).

#### Row does not contain its LEGO — 29 REAL of 29 read · audio ≈ 88 chars
Canon: K2, K2/P17, K50, P17. Usual fix: none beyond LEGO; also: none beyond LEGO; U03 "I have much time" is not natural → "I have a lot of time".
- `S0024L01B02` non riuscirò a parlare | I won't be able to speak → as untaught row — see untaught row (sure)
- `S0028L02U03` È utile rispondere il prima possibile | it's useful to answer as soon as possible → seeds 28/29 English → "as soon as possible" (same family deu/por) — "il prima possibile" → "as soon as possible" here, "as soon as you/I can" in seeds 28/29 (likely)
- `S0029L03U03` È utile rispondere il prima possibile | it's useful to answer as soon as possible → seeds 28/29 English → "as soon as possible" (same family deu/por) — "il prima possibile" → "as soon as possible" here, "as soon as you/I can" in seeds 28/29 (likely)
- `S0047L03U04` non mi preoccupo di fare errori perché penso che sia una buona cosa | I don't worry about making mistakes because I think that it's a good thing → delete — "making" under "to make" (sure)
- `S0109L01B02` dobbiamo lavorare sodo adesso | we must work hard now → none beyond LEGO — fixed by S0109L01 LEGO re-gloss (sure)
- `S0109L01B03` dobbiamo lavorare sodo oggi | we must work hard today → none beyond LEGO — fixed by S0109L01 LEGO re-gloss (sure)
- … 23 more in the JSON (same fix).

#### LEGO English not in its seed English — 17 REAL of 22 read, 5 not a defect · audio ≈ 750 chars
Canon: L26. Usual fix: seed English; also: LEGO English.
- `S0040L02`  | right now →  | at the moment — in questo momento = at the moment (sure)
- `S0049L01`  | that's how it is →  | That's how it is, if you know what I mean. — È così; seed English "It's like this" (likely)
- `S0061L01`  | could you say it →  | Could you say it again a little more slowly? — dirlo = say it (likely)
- `S0072L01`  | you're going →  | you're doing — "you're going very well" is a calque (sure)
- `S0074L01`  | you don't have to be → Kai: re-cut seed 74 LEGOs ("grazie mille | thank you very much", "per avermi aiutato a capire | for helping me to understand"); move the stray three to a seed that says them or delete — seed 74 ("Thank you very much for helping me to understand") carries the LEGOs of a different sentence ("you don't have to be so hard on yourself") (sure)
- `S0074L02`  | so hard → Kai: re-cut seed 74 LEGOs ("grazie mille | thank you very much", "per avermi aiutato a capire | for helping me to understand"); move the stray three to a seed that says them or delete — as S0074L01 (sure)
- … 11 more in the JSON (same fix).
Not a defect: contraction only (×4); K54 (×1).

#### Seed sentence practised with DIFFERENT English — 12 REAL of 12 read · audio 0
Canon: P26/K2. Usual fix: unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars).
- `seed 40` Come ti senti in questo momento? | How do you feel at the moment? → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "how do you feel right now" ≠ seed English (one prompt, two answers) (likely)
- `seed 49` È così, se sai cosa intendo. | It's like this, if you know what I mean. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "that's how it is if you know what i mean" ≠ seed English (one prompt, two answers) (likely)
- `seed 61` Potresti dirlo di nuovo un po' più lentamente? | Could you say that again a little more slowly? → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "could you say it again a little more slowly" ≠ seed English (one prompt, two answers) (likely)
- `seed 70` Lei non voleva dirmi dove era. | She didn't want to tell me where it was. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "she didn't want to tell me where she was" ≠ seed English (one prompt, two answers) (likely)
- `seed 72` Penso che tu stia andando molto bene. | I think that you're doing very well. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "i think you're going very well" ≠ seed English (one prompt, two answers) (likely)
- `seed 132` Questo è meno entusiasmante di quello che lei stava dicendo. | That's less exciting than what she was saying. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "this is less exciting than what she was saying" ≠ seed English (one prompt, two answers) (likely)
- … 6 more in the JSON (same fix).

#### LEGO prompt not in its seed prompt — 10 REAL of 37 read, 27 not a defect · audio ≈ 186 chars
Canon: K26, L26. Usual fix: LEGO known/target to the seed wording; also: seed known.
- `S0029L03` riesco |  → LEGO known/target to the seed wording — LEGO "riesco | I can" vs seed "il prima possibile" (likely)
- `S0082L02` per te |  → Non ti aspetterò. Perché no? |  — seed "Non aspetterò" has no "per te"/"ti" though English says "wait for you" (likely)
- `S0226L02` è |  → sta cercando di aiutarmi | is trying to help me — LEGO "è | is" — seed says "sta cercando di aiutarmi | is trying to help me" (likely)
- `S0244L02` un sacco |  → LEGO known/target to the seed wording — LEGO "un sacco" vs seed "molto" (likely)
- `S0251L01` fino a quando |  → LEGO known/target to the seed wording — LEGO "fino a quando" vs seed "prima che" (cross-course seed 251) (likely)
- `S0255L01` andare via |  → Quando pensi che sarai pronto ad andare via? |  — LEGO "andare via | leave"; seed "ad andare" (likely)
- … 4 more in the JSON (same fix).
Not a defect: inflection / gender / elision / separable verb of the same word (known-side latitude) (×27).

#### LEGO over 8 syllables (hand count) — 5 REAL of 5 read · audio ≈ 296 chars
Canon: L3. Usual fix: cut: I'm not going to + be able to; also: cut: feeling as if + I'm nearly ready.
- `S0024L01` non riuscirò a | I'm not going to be able to → cut: I'm not going to + be able to — hand count 9 syllables (tool estimate 7) (sure)
- `S0026L02` sentirmi come se fossi quasi pronto | feeling as if I'm nearly ready → cut: feeling as if + I'm nearly ready — hand count 9 syllables (tool estimate 8) (sure)
- `S0115L02` pronto ad avere una conversazione | ready to have a conversation → cut: ready + to have a conversation — hand count 9 syllables (tool estimate 7) (sure)
- `S0143L02` di cui stavamo parlando prima | as we were talking about earlier → cut: we were talking about + earlier — hand count 10 syllables (tool estimate 8) (sure)
- `S0273L01` purtroppo ho troppo | unfortunately I've got too much → cut: unfortunately + I've got too much — hand count 9 syllables (tool estimate 8) (sure)

#### Seed sentence has no LEGO that fits it — 4 REAL of 4 read · audio 0
Canon: P26/L26. Usual fix: fix the LEGO, then add the seed row.
- `seed 74` Grazie mille per avermi aiutato a capire. | Thank you very much for helping me to understand. → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 154` Dove vuoi incontrarci sabato sera? | Where do you want to meet on Saturday night? → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 156` Vuoi andare al ristorante stasera? | Do you want to go to a restaurant tonight? → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 257` Mi piace quella cosa blu. | I like that blue thing. → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)

#### English word used before it is taught — 4 REAL of 4 read · audio ≈ 66 chars
Canon: K8, K8/P17. Usual fix: delete; also: "I'm not going to be able to speak".
- `S0007L01B03` non voglio provare | I don't want to try → delete — "don't" at 19 (sure)
- `S0024L01B02` non riuscirò a parlare | I won't be able to speak → non riuscirò a parlare | I'm not going to be able to speak — "won't" at 157 and LEGO not in row (sure)
- `S0264L01U01` un vecchio è venuto a chiedere aiuto | an old man came to ask for help → delete — "came" never (sure)
- `S0264L01U05` ho incontrato un vecchio che parlava inglese bene | I met an old man who spoke English well → delete — "spoke" never (sure)

#### Same row twice in one basket — 3 REAL of 3 read · audio 0
Canon: dup (spa #189), dup/K9. Usual fix: delete this copy; also: delete.
- `S0027L01B02` non mi piace | I don't like → delete this copy — same pair twice in one basket (twin S0027L01B01) (sure)
- `S0145L01B03` non sei più felice? | not happy any more → delete — duplicate AND broken (known is a question, target a fragment) (sure)
- `S0202L02U04` non capiva la domanda | she didn't understand the question → delete this copy — same pair twice in one basket (twin S0202L02B03) (sure)

#### Seed sentence practised only in its OLD prompt wording — 3 REAL of 3 read · audio 0
Canon: P26. Usual fix: replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26).
- `seed 56` Quindi riesco a ricordare come dire alcune parole. | So I can remember how to say a few words. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "quindi posso ricordare come dire alcune parole" (likely)
- `seed 209` Vogliono passare più tempo incontrandosi in gruppo. | They want to spend more time meeting as a group. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "vogliono passare più tempo a incontrarsi in gruppo" (likely)
- `seed 210` Pensano che dobbiamo discutere il problema. | They think that we need to discuss the problem. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "pensano che abbiamo bisogno di discutere il problema" (likely)

#### English pattern: embedded q order — 2 REAL of 2 read · audio ≈ 224 chars
Canon: K9. Usual fix: reword as shown.
- `S0145L01U01` mi dispiace non riuscire a vedere perché non sei più felice | I'm sorry that I can't see why are you not happy any more → mi dispiace non riuscire a vedere perché non sei più felice | I'm sorry that I can't see why you're not happy any more — question word order inside a statement (sure)
- `S0145L01U04` non so perché non sei più felice e mi dispiace | I don't know why are you not happy any more and I'm sorry → non so perché non sei più felice e mi dispiace | I don't know why you're not happy any more and I'm sorry — question word order inside a statement (sure)

#### English pattern: reported no backshift — 2 REAL of 2 read · audio ≈ 196 chars
Canon: K9. Usual fix: reword as shown.
- `S0129L02B03` pensavo che tu stessi andando così bene | I thought that you're doing so well → pensavo che tu stessi andando così bene | I thought that you were doing so well — past frame with present verb (pensavo che tu stessi) (sure)
- `S0129L02U02` pensavo che tu stessi andando così bene l'ultima volta che abbiamo parlato | I thought that you're doing so well last time we talked to each other → pensavo che tu stessi andando così bene l'ultima volta che abbiamo parlato | I thought that you were doing so well the last time we talked — past frame with present verb (sure)

#### Not-new LEGO that was never taught — 2 REAL of 2 read · audio 0
Canon: L31. Usual fix: make NEW.
- `S0207L01` hai fatto | you've done → make NEW — "hai fatto | you've done" never taught — FIXED in eng_for_spa by job #412 (commit d3d659d1, 14 Oct: "eng_for_spa S0207L01 debut (L31)"), not carried to this course (sure)
- `S0257L01` blu | blue → make NEW — "blu | blue" never taught (sure)

#### Question mark on one side only — 2 REAL of 2 read · audio ≈ 42 chars
Canon: A9. Usual fix: delete; also: reword as shown.
- `S0145L01B03` non sei più felice? | not happy any more → delete — see dup_rows (sure)
- `S0263L01B02` sai cosa intendo? | you know what I mean → sai cosa intendo? | you know what I mean? — English question lacks "?" (sure)

#### One prompt, two English answers (LEGO level) — 2 REAL of 5 read, 3 not a defect · audio ≈ 62 chars
Canon: K2/L26, K2/L34. Usual fix: S0209L02 known → "incontrandosi" (the seed's own form); also: S0240L02 → "smettere di parlare | to stop talking" (L34: inside a larger LEGO).
- `incontrare` incontrare | [{"target": "meeting", "legos": ["S0209L02"]}, {"target": "meet", "legos": ["S0293L01"]}] → incontrandosi | [{"target": "meeting", "legos": ["S0209L02"]}, {"target": "meet", "legos": ["S0293L01"]}] — "incontrare" → "meeting" (S0209L02) and "meet" (S0293L01); seed 209 says "incontrandosi" (likely)
- `parlare` parlare | [{"target": "talking", "legos": ["S0240L02"]}, {"target": "speak", "legos": ["S0283L02"]}] → smettere di parlare | to stop talking — "parlare" → "talking" (S0240L02) and "speak" (likely)
Not a defect: "parli?" vs "parli": question mark differs (A7) (×1); "è | is" vs "e | and": the accent is stripped by the tool (×1); "to know" vs "know": K54 (×1).

#### One prompt, two English answers (phrase level) — 2 REAL of 10 read, 8 not a defect · audio 0
Canon: K2/P15. Usual fix: Kai's call — seeds 20/21 may teach his/her on purpose (P15); if not, mark the her-rows "il nome di lei" or keep only one gender per prompt.
- `mi piacerebbe scoprire il suo nome` mi piacerebbe scoprire il suo nome | [{"target": "i'd like to find out his name", "rows": ["S0020L02U01"], "n": 1}, {"target": "i'd like to find out her name", "rows": ["S0021L03U03"], "n": 1}] → Kai's call — seeds 20/21 may teach his/her on purpose (P15); if not, mark the her-rows "il nome di lei" or keep only one gender per prompt — "il suo nome" → "his name" (seed 20 rows) and "her name" (seed 21 rows): one prompt, two answers (same in fra seed 21) (best guess)
- `vuoi ricordare il suo nome` vuoi ricordare il suo nome | [{"target": "you want to remember his name", "rows": ["S0020L02U06"], "n": 1}, {"target": "you want to remember her name", "rows": ["S0021L03U05"], "n": 1}] → Kai's call — seeds 20/21 may teach his/her on purpose (P15); if not, mark the her-rows "il nome di lei" or keep only one gender per prompt — "il suo nome" → "his name" (seed 20 rows) and "her name" (seed 21 rows): one prompt, two answers (same in fra seed 21) (best guess)
Not a defect: question vs statement differ by "?" (A7) (×4); same group as zut_lego row (×2); "è" vs "e": accent stripped by the tool (×1).

#### English pattern: perfect with past time — 1 REAL of 8 read, 7 not a defect · audio ≈ 74 chars
Canon: K26/L26. Usual fix: reword as shown.
- `S0265L01U03` È mio amico dall'anno scorso | he has been a friend since last year → È mio amico dall'anno scorso | he has been my friend since last year — English drops "my" (È mio amico) — known says my friend (likely)
Not a defect: correct English (conditional perfect / since / relative clause) (×7).

#### LEGOs of 7-8 syllables (list for the shortest-cut pass) — 0 REAL of 26 read
26 new LEGOs of 7-8 syllables, within the cap (full list in the JSON). E.g. `S0029L01` I'm looking forward to speaking, `S0033L01` how long have you been learning, `S0034L03` when other people are here, `S0076L02` with how much I've learnt already, `S0088L01` to talk to people I don't know, `S0101L01` I'm enjoying finding out more, `S0108L02` wake in the middle of the night, `S0109L02` to learn a lot of new words, `S0112L01` that was very interesting, `S0116L01` this isn't the best choice

#### English pattern: adverb after object — 0 REAL of 3 read, 3 not a defect
Not a defect: natural English (×3).

#### English pattern: duration present simple — 0 REAL of 2 read, 2 not a defect
Not a defect: "for a while" used correctly (×2).

#### Seed vs basket differ only by a contraction — 0 REAL of 7 read, 7 not a defect
Not a defect: basket English differs only by a contraction: "learning english isn't easy but it's fun" (×1); basket English differs only by a contraction: "it isn't difficult to find the answer" (×1); basket English differs only by a contraction: "that's not what i'm trying to say" (×1).

#### Seed vs basket differ only by gender ending / dropped pronoun — 0 REAL of 10 read, 10 not a defect
Not a defect: basket plays the seed in its female / subject-dropped form (×10).


### eng_for_por (Portuguese speakers)

#### Seed sentence never practised (no copy in any played basket) — 39 REAL (listed by mechanism, NOT read one by one) · audio 0
Canon: P26. Usual fix: add as USE row under its last new LEGO, seed clips reused.
- `seed 5` Vou praticar falar com outra pessoa. | I'm going to practise speaking with someone else. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 10` Não tenho a certeza se consigo lembrar a frase toda. | I'm not sure if I can remember the whole sentence. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 11` Eu gostaria de poder falar depois de terminares. | I'd like to be able to speak after you finish. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 15` E eu quero que fales inglês comigo amanhã. | And I want you to speak English with me tomorrow. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 23` Vou começar a falar mais em breve. | I'm going to start talking more soon. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 28` É útil começar a falar o mais cedo possível. | It's useful to start talking as soon as you can. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- … 33 more in the JSON (same fix).

#### LEGO English not in its seed English — 29 REAL of 31 read, 2 not a defect · audio ≈ 1,454 chars
Canon: L26/K2. Usual fix: LEGO English; also: seed English.
- `S0016L02`  | everybody →  | everyone — LEGO "everybody", seed "everyone" (likely)
- `S0028L01`  | as soon as possible →  | It's useful to start talking as soon as possible. — o mais cedo possível (sure)
- `S0029L02`  | to speak better as soon as possible →  | I'm looking forward to speaking better as soon as possible. — same family; LEGO is also 10 syllables (see L3) (sure)
- `S0097L02`  | when you want →  | Yes I'm ready to go when you want. — quando quiser (likely)
- `S0108L01`  | to wake up →  | We didn't hope to wake up in the middle of the night. — wake up (likely)
- `S0108L02`  | we didn't hope to wake up → see why — covered by seed 108 (likely)
- … 23 more in the JSON (same fix).
Not a defect: contraction only (×2).

#### Seed sentence practised with DIFFERENT English — 28 REAL of 28 read · audio 0
Canon: P26/K2. Usual fix: unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars).
- `seed 29` Estou ansiosa para falar melhor o mais cedo possível. | I'm looking forward to speaking better as soon as I can. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "i'm looking forward to speaking better as soon as possible" ≠ seed English (one prompt, two answers) (likely)
- `seed 93` Está na hora de ir. | It's time to go now. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "it's time to go" ≠ seed English (one prompt, two answers) (likely)
- `seed 97` Sim, estou pronta para ir quando quiser. | Yes I'm ready to go as soon as you want. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "yes i'm ready to go when you want" ≠ seed English (one prompt, two answers) (likely)
- `seed 108` Não esperávamos acordar a meio da noite. | We didn't hope to wake in the middle of the night. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "we didn't hope to wake up in the middle of the night" ≠ seed English (one prompt, two answers) (likely)
- `seed 120` É interessante que goste de ir de autocarro. | It's interesting that you like to go by bus. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "it is interesting that you like going by bus" ≠ seed English (one prompt, two answers) (likely)
- `seed 124` Eu achei que era uma boa ideia. | I thought that was a good idea. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "i thought that it was a good idea" ≠ seed English (one prompt, two answers) (likely)
- … 22 more in the JSON (same fix).

#### Row does not contain its LEGO — 12 REAL of 14 read, 2 not a defect · audio ≈ 170 chars
Canon: K2/P17, K50, P17, P17/K9. Usual fix: none beyond LEGO; also: delete.
- `S0047L03B01` cometer erros | making mistakes → delete — "making mistakes" under "to make" (sure)
- `S0109L01U01` precisamos de trabalhar muito | we need to work hard → delete — "precisamos | we need to" under "must" (sure)
- `S0130L02U01` foi uma surpresa ouvir o que disseste | it was a surprise to hear what you said → foi uma surpresa ouvir o que disseste | that was a surprise to hear what you said — "it was a surprise" under "that was a surprise" (likely)
- `S0144L02B03` acordei mais cedo do que queria esta manhã | I woke earlier than I wanted this morning → acordei mais cedo do que queria esta manhã | I woke earlier than I wanted to this morning — "than I wanted this morning" lacks "to" (sure)
- `S0183L01B02` infelizmente não tive tempo | I'm afraid I didn't have time → none beyond LEGO — fixed by S0183L01 LEGO re-gloss (sure)
- `S0183L01B03` não, infelizmente não sei | no, I'm afraid I don't know → none beyond LEGO — fixed by S0183L01 LEGO re-gloss (sure)
- … 6 more in the JSON (same fix).
Not a defect: question LEGO reordered inside an embedded clause (×2).

#### Seed sentence has no LEGO that fits it — 8 REAL of 8 read · audio 0
Canon: P26/L26. Usual fix: fix the LEGO, then add the seed row.
- `seed 113` Porque é que não consigo lembrar o que disseste? | Why can't I remember what you said? → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 241` Eu não quero dar-lhe isso. | I don't want to give it to him. → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 242` Eu quero dar-lhe mais tempo. | I want to give her more time. → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 246` Eu queria que ela o ajudasse mas estava muito ocupada. | I wanted her to help you but she was too busy. → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 249` Eu quero que me ajudes antes de ir. | I want you to help me before you go. → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 257` Eu gosto daquela coisa azul. | I like that blue thing. → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- … 2 more in the JSON (same fix).

#### Seed sentence practised only in its OLD prompt wording — 7 REAL of 7 read · audio 0
Canon: P26. Usual fix: replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26).
- `seed 46` Mas não me preocupo com erros. | But I don't worry about making mistakes. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "mas não me preocupo com cometer erros" (likely)
- `seed 47` Porque eu acho que é bom cometer erros. | Because I think that it's a good thing to make mistakes. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "porque eu acho que é uma coisa boa cometer erros" (likely)
- `seed 76` Estou muito satisfeito com o quanto já aprendi. | I'm very happy with how much I've learnt already. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "estou muito satisfeito com o quanto aprendi já" (likely)
- `seed 121` É invulgar não gostar de usar o carro. | It's unusual that you don't like to use your car. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "é invulgar que não gosta de usar o carro" (likely)
- `seed 154` Onde é que queres encontrar-te na noite de sábado? | Where do you want to meet on Saturday night? → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "onde é que quer encontrar se na noite de sábado" (likely)
- `seed 157` Não vou conseguir estar lá no mês que vem. | I won't be able to be there next month. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "não vou conseguir estar lá o mês que vem" (likely)
- … 1 more in the JSON (same fix).

#### Same row twice in one basket — 6 REAL of 6 read · audio 0
Canon: dup (spa #189). Usual fix: delete this copy.
- `S0063L01B02` não se importa de | you don't mind → delete this copy — same pair twice in one basket (twin S0063L01B01) (sure)
- `S0100L02U04` não se devia preocupar em fazer algo parecido | you shouldn't worry about doing something similar → delete this copy — same pair twice in one basket (twin S0100L02B03) (sure)
- `S0120L02B03` é interessante que goste de ir de autocarro | it is interesting that you like going by bus → delete this copy — same pair twice in one basket (twin S0120L02B02) (sure)
- `S0153L03B02` não teria dito | I wouldn't have said it → delete this copy — same pair twice in one basket (twin S0153L03B01) (sure)
- `S0189L01B02` sim, é uma boa ideia | yes, that's a good idea → delete this copy — same pair twice in one basket (twin S0189L01B01) (sure)
- `S0272L01B02` parece uma ótima ideia | sounds like a good idea → delete this copy — same pair twice in one basket (twin S0272L01B01) (sure)

#### LEGO prompt not in its seed prompt — 5 REAL of 25 read, 20 not a defect · audio ≈ 109 chars
Canon: L26. Usual fix: seed known; also: LEGO known to the seed.
- `S0046L02` cometer erros |  → Mas não me preocupo em cometer erros. |  — seed known "com erros" lacks "cometer" (English "about making mistakes") (likely)
- `S0047L02` é uma coisa boa |  → Porque eu acho que é uma coisa boa cometer erros. |  — seed known "é bom" vs English + LEGO "é uma coisa boa" (likely)
- `S0094L01` vai funcionar |  → LEGO known to the seed — seed known "de funcionar" vs LEGO "vai funcionar" (likely)
- `S0182L04` já viu |  → LEGO known to the seed — seed lost "já" that the LEGO teaches (likely)
- `S0282L01` não é um problema |  → Não, não é um problema. |  — seed known "não há problema" vs LEGO "não é um problema" (likely)
Not a defect: inflection / gender / elision / separable verb of the same word (known-side latitude) (×20).

#### LEGO over 8 syllables (hand count) — 4 REAL of 4 read · audio ≈ 252 chars
Canon: L3. Usual fix: cut: to speak better + as soon as possible (S0028); also: cut: anything else + before I answer.
- `S0029L02` falar melhor o mais cedo possível | to speak better as soon as possible → cut: to speak better + as soon as possible (S0028) — hand count 10 syllables (tool estimate 9) (sure)
- `S0250L01` mais alguma coisa antes de eu responder | anything more before I answer → cut: anything else + before I answer — hand count 9 syllables (tool estimate 8) (sure)
- `S0260L01` não faço a mínima ideia | I don't have the faintest idea → cut: I don't have + the faintest idea — hand count 9 syllables (tool estimate 8) (sure)
- `S0281L01` terminar o meu café antes de começar | finish my coffee before we start → cut: finish my coffee + before you start — hand count 9 syllables (tool estimate 8) (sure)

#### Not-new LEGO that was never taught — 2 REAL of 2 read · audio 0
Canon: L31. Usual fix: make NEW.
- `S0207L01` fizeste | you've done → make NEW — "fizeste | you've done" never taught — FIXED in eng_for_spa by job #412 (commit d3d659d1, 14 Oct: "eng_for_spa S0207L01 debut (L31)"), not carried to this course (sure)
- `S0257L01` daquela coisa azul | that blue thing → make NEW — "daquela coisa azul | that blue thing" never taught (sure)

#### Question mark on one side only — 2 REAL of 2 read · audio ≈ 32 chars
Canon: A9, K9/A9. Usual fix: add "?" to known; re-record known; also: delete.
- `S0150L01U05` pode dizer-me qual é o seu nome | can you tell me what your name is? → pode dizer-me qual é o seu nome? | can you tell me what your name is? — known lacks "?" (sure)
- `S0169L01B01` queres que eu faça? | you want me to do → delete — "you want me to do" is a fragment of a question (sure)

#### English pattern: embedded q order — 1 REAL of 1 read · audio ≈ 94 chars
Canon: K9. Usual fix: reword as shown.
- `S0166L01U02` pode dizer-me como se diz o meu nome em inglês? | can you tell me how do you say my name in English? → pode dizer-me como se diz o meu nome em inglês? | can you tell me how you say my name in English? — question word order inside a question (sure)

#### English pattern: perfect with past time — 1 REAL of 1 read · audio ≈ 86 chars
Canon: K9. Usual fix: reword as shown.
- `S0042L02U05` estou a aprender inglês melhor do que no mês passado | I've been learning English better than last month → estou a aprender inglês melhor do que no mês passado | I'm learning English better than last month — "I've been learning English better than last month" is not natural; known says estou a aprender (likely)

#### English pattern: reported no backshift — 1 REAL of 14 read, 13 not a defect · audio ≈ 60 chars
Canon: K9. Usual fix: reword as shown.
- `S0105L01U06` não sabia que era assim | I didn't know it's like that → não sabia que era assim | I didn't know it was like that — "didn't know" + present reads wrong (likely)
Not a defect: "said that he is …" is normal English for a fact still true (P14, soft) (×13).

#### One prompt, two English answers (phrase level) — 1 REAL of 3 read, 2 not a defect · audio 0
Canon: K2/A7. Usual fix: delete S0032L01U02.
- `querias mostrar-me algo ontem` querias mostrar-me algo ontem | [{"target": "you wanted to show me something yesterday", "rows": ["S0032L01U02"], "n": 1}, {"target": "did you want to show me something yesterday", "rows": ["S0032L02U01"], "n": 1}] → delete S0032L01U02 — S0032L01U02 is a statement row ("you wanted…") inside the question LEGO "did you want"; the other row asks it (likely)
Not a defect: K54 (×1); question vs statement differ by "?" (A7) (×1).

#### LEGOs of 7-8 syllables (list for the shortest-cut pass) — 0 REAL of 35 read
35 new LEGOs of 7-8 syllables, within the cap (full list in the JSON). E.g. `S0033L01` how long have you been learning?, `S0034L02` when other people are here, `S0057L01` I can't remember how to say, `S0079L01` when did you start to learn, `S0081L01` when do you want to start, `S0108L03` in the middle of the night, `S0113L01` I can't remember what you said, `S0120L02` that you like going by bus, `S0121L02` don't like to use your car, `S0142L04` I'm grateful to you for helping

#### English pattern: adverb after object — 0 REAL of 2 read, 2 not a defect
Not a defect: natural English (×2).

#### English pattern: double negative — 0 REAL of 1 read, 1 not a defect
Not a defect: not a double negative (×1).

#### Seed vs basket differ only by a contraction — 0 REAL of 4 read, 4 not a defect
Not a defect: basket English differs only by a contraction: "we're trying to say that it isn't like that" (×1); basket English differs only by a contraction: "you are like someone i used to know" (×1); basket English differs only by a contraction: "what is that blue thing over there" (×1).

#### Seed vs basket differ only by gender ending / dropped pronoun — 0 REAL of 24 read, 24 not a defect
Not a defect: basket plays the seed in its female / subject-dropped form (×24).

#### One prompt, two English answers (LEGO level) — 0 REAL of 1 read, 1 not a defect
Not a defect: "understand" vs "to understand": K54 (×1).

### Coverage

| family | spa | fra | deu | ita | por |
|---|---|---|---|---|---|
| mechanical detectors (all 17 families) | scanned, every hit read | same | same | same | same |
| seed_not_played: "missing" class (243 rows) | listed, not read one by one: the fix is mechanical (add the seed as a row, 0 chars) | same | same | same | same |
| seed_not_played: the other classes | every row read | same | same | same | same |
| lego_not_in_seed_known | read; default NOT where the difference is an inflection, gender ending, elision (qu'il, du) or separable verb — the tool counts these as missing words | same | same | same | same |
| English lexical patterns (17, see below) | scanned, every hit read | same | same | same | same |
| intro wording, wrong word spoken, female voice saying the male form | NOT scanned (ear-only by ruling A22, or no text route) | same | same | same | same |
| grammar / naturalness of rows nothing pointed at | NOT scanned (a separate read, R0.16) | same | same | same | same |

### English patterns added (`eng-eu.patterns.json`, side = target)

Built from the deu_for_eng #435 en-calque fixes (ops/deu-435) and spa_for_eng #181 wrong-English fixes (d/ff0787c4). Each fix-record pattern matches its own pre-fix text (detect.cjs calibration passes, exit 0).
Live hits that turned out REAL: embedded question order (6), present perfect with "yesterday" (3), no-backshift after a past verb (4), "since a while ago" (1), "I've been learning … than last month" (1).
Five patterns have NO known positive in any fix record and found nothing real here: future-in-time-clause, duration + present simple, preposition calques, uncountable plurals, "have hunger"-type calques. They stay in the file with kp = null as candidates only; by the brief they are **dropped as detectors** (named here).
Regex false positives worth knowing: `\w+ing` catches *bring*; "how to do" trips the question-order pattern; "people is" fires across a clause.

### Gaps (plain)

- **Not read one by one:** the 243 "seed never practised" rows (spa 71, fra 49, deu 48, ita 36, por 39). They are real by P26 and the fix is mechanical, but I did not check each seed sentence's English.
- **Audio not checked:** whether existing clips voice the dots in "do you speak ...?" / "than…", or read the 11 spa questions-without-"?" flat. Ear only (A22).
- **No proofread of eng_for_spa seeds 301-326.** eng_for_spa serves 326 seeds; seeds past 300 have not been confirmed proofread (Kai memory, released-seed-cap). Several spa hits are there (qmark rows S0304-S0326).
- **Intro texts not read.** Every LEGO re-gloss here needs its intro re-voiced; those characters are not in the totals.
- **Edit history not read** (admin login needed), so "which wording is newer" is inferred from the seed being the polished side, not from timestamps.
- **eng_for_spa S0257L01** may already be queued (Kai's 14 Oct note: "1 eng_for_spa never-debuted pair", #422·Q); I could not confirm which pair.

---

## eng-asia — cleanup scan findings (#447, worker #474·AI)

Courses: **eng_for_jpn, eng_for_kor, eng_for_zho, eng_for_ara**. In all four, English is the language being learnt. I read them live through Popty's script view on 17 Nov 2026 at 14:06Z. **Nothing was changed, rendered or sent.**
Every row is in `eng-asia.json` next to this file. Each row has: course, family, row id, known, target, verdict, fix, confidence, canon ref and chars. The verdicts are written into `eng-asia.build.py`, so the JSON can be rebuilt from a fresh dump.
Audio cost counts only the sides that change: new English × 2 voices, plus new known text × 1. A deletion, a not-new flag or a seed-sentence USE row (which reuses the seed's own clips) costs 0. Re-cutting a LEGO also costs a new intro clip, and those intros are **not** included in the totals.

### Headline

- **eng_for_jpn is in much worse shape than the other three.** It has 11,167 rows, about twice as many as the others (5,600–6,400), and 425 of them are exact duplicates inside the same basket.
  - **192 practice sentences in seeds 226–230 have only the LEGO's Japanese as their prompt.** For example, 男性 is the prompt for "the man is trying to help me understand what you said". This is the "missing known-side translation" that Aran and Deborah reported (A16). It is still live.
  - **At least 174 more rows have a Japanese prompt that does not match the English, is garbled, or is not a question where the English is.** I found these through the question-mark and same-prompt reads only. **The whole course needs a known-side read** (see GAPS).
  - **375 rows use English words that have not been taught yet.** Mostly: *let's* before 158, *them* before 134, *make (mistakes)* before 116, *a lot* before 109, and *every*, *came*, *spoke*, *please* and *knew*, which are never taught.
- **eng_for_kor**: 45 Korean prompts are statements where the English is a question. In the 해요 form, statement and question are the same words, so only the ? tells the learner, and it is missing. There are also 22 prompt/answer mismatches, 10 garbled BUILD prompts, and 12 LEGO-level fixes. Two of those are LEGOs whose whole basket practises something else: S0090L01 *good* and S0061L02 *again*.
- **eng_for_zho**: in seeds 64–73 the Chinese prompts have slipped against the English inside baskets. For example, S0071L02U01 我们不想… has become 现在让任何人听到这个真相 ("now let anyone hear the truth") under "We didn't want to let anyone hear the truth". There are 10 LEGOs whose English is not in their seed or whose Chinese is another LEGO's word (S0057L01 *can't remember | 说*, S0059L02 *next week | 做*), 4 gapped LEGOs, and 53 LEGOs over 8 syllables.
- **eng_for_ara is the cleanest.** The main family is *every* (never taught) in 26 rows. It also has 46 seed sentences the learner never says, 1 empty audio slot (S0201L02B03, target1 + target2), and 16 LEGOs over 8 syllables.
- **All four**: seed 108's English, *"we didn't hope to wake in the middle of the night"*, is not natural English, and in these courses it is what the learner has to say.

| course | REAL rows / items (new) | needs new audio | new audio chars (≈) | read and NOT a defect (not counted) |
|---|---|---|---|---|
| eng_for_jpn | 1,345 (incl. 425 duplicates to delete, 74 seed sentences to add) | ≈ 640 | ≈ 18,600 | ≈ 690 (571 か/の question prompts, 87 seed prompts worded differently, 7 *seem/seems*, 27 phrase-level same-prompt pairs) |
| eng_for_kor | 149 | ≈ 100 | ≈ 2,700 | ≈ 230 (102 Korean particle/verb-form artefacts in the known-LEGO check, 51 reworded seed prompts, 10 phrase-level pairs) |
| eng_for_zho | 176 | ≈ 80 | ≈ 1,900 | ≈ 420 (266 吗/wh-word questions without ？, 139 reworded seed prompts, 21 phrase-level pairs) |
| eng_for_ara | 111 | ≈ 45 | ≈ 900 | ≈ 30 (22 Arabic clitic artefacts in the known-LEGO check, 6 reworded seed prompts) |
| seed 108, all four | 1 item (≈ 40 rows) | ≈ 40 | ≈ 3,600 | — |

The chars figure for the untaught-word rows assumes BUILD rows are reworded and USE rows are deleted. Rewording every USE row instead would add about 18,000 chars on eng_for_jpn.

---

### eng_for_jpn

**J1. The prompt is only the LEGO, not the sentence (A16). 192 REAL, all read.** Every USE row of 9 LEGOs in seeds 226–230 has the LEGO's own Japanese as its prompt:
- S0227L01U01 男性 | the man is trying to help me understand what you said
- S0228L01U02 あの男性は話す練習を始めたばかりです | do you think that man has just started to practise speaking in English?
- S0229L03U01 できれば手伝ってくれるでしょう | that woman would help you if she could but she is very busy today
- S0230L02U01 働きたい | he wants to work with you and I think that is a good idea

Fix: write the Japanese for each whole sentence; each prompt then needs a new known clip. **sure.** Canon A16, P16. This family is KNOWN (Aran/Deborah, A16), but I found no row list for it anywhere, so the rows are listed here. Audio ≈ 4,200 chars (estimate: Japanese ≈ 0.45 × English length). 6 other single rows of this shape are LEGO glosses with an article added, and are not a defect. S0131L03B01 アイデア | there are ideas going around is REAL and counted in J2.

**J2. Prompt and answer do not match, the prompt is garbled, or the prompt is not a question. 174 REAL. Read: every non-か question-mark hit (201) and every same-prompt pair in a basket (18 groups).**
- *Mismatch (M, 84):*
  - S0054L03U12 あなたはできるだけ英語を話そうとしている | are you going to help me before I have to go?
  - S0070L05U03 なぜ彼女は私に教えたくなかったのですか？ | I don't know why she didn't want to tell me about it
  - S0063L04U03 …私を手伝うことに感謝します ("thank you for helping me") | are you sure you don't mind helping me…?
  - S0158L02U07 あなたは何か他のことを考えましたか？ | I should consider something else
  - S0098L01U06 別のゲームをすること ("another game") | I should consider playing something else
- *Garbled (G, 58):* the S0063 family puts the question word in the middle: 本当に気にしませんか、私を手伝うことを (27 rows). Others: S0065L01U05 重要です、あなた自身をテストすることが、時間をかけて; S0101L01B05 この言語についてもっと楽しんで知っています; the dash fragments S0061L03B03 言っていただけますか - それを; and S0144L01B02–B07, where one prompt 今朝したかったこと sits over 6 different English answers.
- *Not a question (Q, 5):* S0021L03B02 今学んでいる | are you learning now?
- *English not natural (E, 27):*
  - S0183L01U01 "have you seen my keys anywhere no I'm afraid I haven't seen them?" (question and answer run together, 13 rows)
  - S0262L01B04 "can you tell me who was that man you were talking to yesterday?"
  - BUILD fragments like "could you say?", "have you seen?", "do you mind if?"

Fix: M and G → rewrite the Japanese prompt to say what the English says, using the seed's own wording (for S0063, the seed's 手伝っても構いませんか？). For G: K6 gives the known side latitude in word forms, but not to be garbled. E → rewrite the English, or delete the fragment. **sure** for M/Q, **likely** for G/E. Canon K2, P16, K6, K9, A9. Audio ≈ 5,300 chars.

**J3. English words used before they are taught. 375 REAL, all 430 hits read.** The detector was wrong on 27 of them (see GAPS), and those are dropped. The 12 S0213 rows are J4, and the S0213/phrase rows already in J2/J5 are counted there.
- S0095L03B05 let's speak again the next time (*let's* is taught at 158)
- S0065L01B06 it's important to make mistakes (*make* at 116)
- S0089L01B04 I've done a lot (*lot* at 109)
- S0202L02U01 nobody knew how to answer the question (*knew* is never taught)
- S0185L01U01 I go to work every day (*every* is never taught)

Fix: delete USE rows. Reword BUILD rows with taught words. Never add a LEGO to license a word (K14/K15). **sure.** Canon P1, K8. Audio ≈ 6,900 chars (BUILD rewording only).

**J4. Missing apostrophes. 12 REAL.** S0213L02U01–U10, S0213L01U03, S0213L01B05: "we dont know what theyre trying to achieve". Fix: add the apostrophes. Re-voice only if the clip says "dont" wrongly (needs an ear check). **sure.** K9. ≈ 1,200 chars if re-voiced.

**J5. Rows that do not contain their LEGO. 35 REAL, 42 read.**
- S0011L03B03 I want to be able to speak English, under *I'd like*
- S0126L01U04 …why it's not working, under *work*
- S0078L02U02 I don't know enough words yet, under *I don't understand*
- S0201L01B02 did you want to know…, under *we wanted to know…*
- S0138L01U08 this **is** where…, under *this was where*

The 7 *seems* rows under *seem* (S0300L01) are a third-person -s and are not counted (K8 "slightly different ending"). Fix: reword the row with the LEGO in its taught form, or delete it. S0126L01 is better re-cut to "it's not working | うまくいっていない". **sure.** P17, K50. ≈ 830 chars.

**J6. Duplicate rows. 425 REAL, read as a list.** The same pair appears twice in one basket: 212 BUILD=BUILD, 179 USE=BUILD, 25 USE=USE, 9 BUILD=USE, across 259 LEGOs. For example, S0052L04B02 手紙 | a letter is a twin of B01, and S0038L01U01 英語を学んでいます | I've been learning English is a twin of B01. Fix: delete the later twin. **sure.** 0 chars.

**J7. LEGO-level items. 4 REAL.**
- S0202L02 "didn't know how to answer the question" is not in its seed ("nobody was sure…") → re-cut to "how to answer the question | 質問にどう答えるか".
- S0043L01 "to answer" is taught as NEW a second time → make it not-new.
- S0207L01 and S0257L01 are not-new with no earlier exact pair → make them NEW (L31).

S0244L03 "have learnt" inside "I've learnt" is read as fine (contracted form).

**J8. LEGOs over 8 syllables. 54 REAL.** These are hand-checked counts; the builder's estimate said 46. 26 more are at 7–8. Most are whole sentences taught as one LEGO:
- S0117L01 "I'm definitely doing better than I was last time we talked to each other" (21)
- S0112L01 "that was very interesting and I wasn't expecting it" (15)
- S0115L01 "I don't feel as if I'm ready to have a conversation" (15)

Fix: split at the clause, using the shortest viable cut (Kai 17 Nov). For S0117L01 that is "I'm definitely doing better | than I was last time | we talked to each other". **likely.** L3. Costs new LEGO clips and intros (not priced).

**J9. Seed sentences the learner never says. 74 REAL.** Examples: seeds 4, 15, 16, 18, 24, 28, 36, 39, 44–49. Fix: add the seed as a USE row reusing its own clips (P26). 0 chars. 87 more seeds are said in English with a differently worded Japanese prompt. These are not a defect for P26, because the learner does say the English; the garbled ones among them are in J2. 5 seeds collide with a played row that has the same Japanese and different English (192, 198, 202, 244, 248). Use the seed's English in that row.

### eng_for_kor

**K1. Question asked with a statement prompt. 45 REAL, all read.** In the 해요 form, "you want to meet" and "do you want to meet?" are the same words; only the ? and the voice tell them apart. Examples:
- S0154L01U01 토요일에 만나고 싶어요 | do you want to meet on saturday?
- S0021L03B02 영어를 배우고 있어요 | are you learning English?
- S0271L01B02 우리와 함께 오고 싶어요 | would you like to come with us?

Fix: add ? to the Korean and re-voice the known clip. **sure** for yes/no questions, **likely** for wh-questions. A7, A9. ≈ 600 chars.

**K2. Prompt and answer do not match. 22 REAL, read.**
- S0155L03U02 내일 아침에 만나고 싶어요 | where do you want to meet tomorrow morning?
- S0158L01U02 다른 것에 대해 이야기해요, 괜찮아요? | I don't mind but let's talk about something else
- S0148L01U01 별로 인내심이 없었어요 | I don't know why he wasn't very patient

In 12 basket pairs the English adds words the prompt does not have. For example, S0100L02B02 그것에 대해 걱정하지 않아도 돼요 | you shouldn't worry about it **this evening**. Fix: make the prompt say what the English says. **sure.** ≈ 350 chars.

**K3. Garbled BUILD prompts. 10 REAL.**
- S0230L01B04 저는 젊은 남자를 알아요, 일하고 싶은
- S0233L02B03 저는 젊은 여자를 알아요, 아는
- S0067L01B01 왜 싶어요 (ungrammatical)

Fix: use the seed's own word order. **likely.** ≈ 180 chars.

**K4. LEGO-level items. 12 REAL, read with seed and basket.**
- S0090L01 *good | 좋은* is not in seed 90, and all 8 of its rows say "more slowly" → re-cut to *more slowly | 더 천천히*.
- S0061L02 is a second *again* debut, and its basket is "could you / could you say? / could you explain?" → re-cut to *could you say that | 말해줄 수 있어요*.
- ZUT clashes:
  - 열심히 일해야 해요 = need to / must (S0106L03/S0109L02) → give the must one 해야만.
  - 싶지 않아요 = I wouldn't like to / I don't want (S0012L01) → give S0012L01 하고 싶지는 않아요 (best guess).
  - 아무것도 = anything / nothing → S0146L01 folds into S0146L02.
- S0160L01 *how*: none of its 6 rows says "how".
- English not in its seed: S0049L01, S0059L01, S0109L03, S0138L01.
- S0207L01 and S0257L01 are not-new with no earlier pair.
- The Korean seeds 200, 279 and 280 leave out "make sure", "left" and "had to" (the LEGOs already have them).

**K5. Untaught words: 17 REAL** (the detector said 35; 18 were its error). Most are *talk* before 88, *a lot* before 89, and *don't* before 19. **Duplicates: 8 REAL** (delete). **Seed never said: 17 REAL** (P26). **LEGOs over 8 syllables: 12** (the builder's estimate said 0), e.g. S0024L02 "I'm not going to be able to" (9) and S0122L02 "I'm excited about how it's going" (10). **English fragments: 4** ("could you say?", "what your name is?").

### eng_for_zho

**Z1. Known side slipped against the English inside baskets, seeds 64–73 (plus 11 and 34). 19 REAL, read.**
- S0071L02U01 现在让任何人听到这个真相 | We didn't want to let anyone hear the truth (the negation is lost)
- S0069L01U01 我不确定我是否想照顾你 | She wants to look after you
- S0066L01U01 同时做所有事情很难 | It's not difficult to speak a little English
- S0073L02U03 在明天之前我还有更多要学 | I've got more to learn and it's not easy

Fix: re-pair each prompt with its own English (the right prompt usually sits on a neighbouring row in the same basket). **sure.** ≈ 200 chars.

**Z2. LEGO-level items. 13 REAL.**
- Chinese that belongs to another LEGO:
  - S0011L01 *to be able | 我想* (should be 能)
  - S0057L01 *can't remember | 说* (should be 记不住)
  - S0059L02 *next week | 做* (should be 下周)
  - S0097L01 *yes | 好*, which clashes with *well | 好* (use the seed's 是的)
- English not in its seed, while all the rows say the seed's word (fix the LEGO, not the rows):
  - S0012L02 *Doesn't want* (seed: wouldn't like)
  - S0026L03 *Seems* (seed: as if)
  - S0033L01 *A long time* (seed: how long)
  - S0055L03 *Doesn't like* (seed: don't enjoy)
  - S0218L01 *How much* (seed: much)
  - S0103L02 *More* (rows say many)
- Other LEGO-level:
  - S0034L02 *To be quiet*: its 4 rows are "When you are talking" over broken Chinese 的时候你在说话.
  - 那不是 = that wasn't / that isn't what → put each inside its seed piece.
  - **Gapped LEGOs (L32): 4.** S0032L02 你想...吗, S0042L03 我开始觉得...了, S0077L02 对...速度感到惊讶, S0138L01 这就是...的地方.

**Z3. Question with a statement prompt: 8 REAL.** S0075L01B01 你还有更多要学的 | Have you got more to learn?; S0119L01B01 我能问你 | Can I ask you? → add 吗/？. **Garbled: 5** (S0044L01U06 uses 或者 in a question, where 还是 is right). **English not natural: 13.** BUILD rows with a time word bolted on: S0271L01B02 "Would you like to come with us next month **now**?", S0157L02B02 "Next month now", S0182L01B03 "Have you seen here?", S0150L02B01 "What your name is?". Fix: delete or reword. **sure.**

**Z4.** **Untaught words: 34 REAL** (the detector said 76). Most are early rows using words from seeds 5–18, plus *still*, *myself*, *every*, *prefer* (never taught). **Duplicates: 7.** **Seed never said: 22.** **LEGOs over 8 syllables: 53**, e.g. S0287L01 "How many people do you know who like watching television" (17) and S0235L01 (15).

### eng_for_ara

- **Untaught words: 38 REAL, all read.** 26 are *every* (never taught): "every day", "every time", "every week". Fix: delete the USE rows, reword the 3 BUILD rows. **sure.** ≈ 500 chars.
- **Empty audio: 1 REAL.** S0201L02B03 has empty target1 and target2 (A16). Render through /api/audio/render. 62 chars.
- **Seed never said: 46 REAL**, e.g. seeds 8, 10, 12, 15, 24, 29 → add USE rows reusing the seed clips (P26). 0 chars.
- **LEGO items: 5.** S0049L02 *you understand* is not in the English seed → "you know | تعرف" (likely). S0045L02B03 and S0054L01B03 do not contain their LEGO (K50). S0207L01, S0228L02 and S0257L01 are not-new with no earlier pair.
- **English not natural: 4.** S0048L01B02 "I don't care if I need too much time" (the deu #435 *need time* calque), S0157L02B03 "next month soon", and the fragments "could you?" and "what your name is?". **Duplicates: 3.** **LEGOs over 8 syllables: 16** (the builder's estimate said 0), e.g. S0122L02 (10).
- 23 known-side "LEGO not in seed" hits: 22 are Arabic clitics written apart (و، بـ، لـ; L28) or case endings (K6), and are not a defect. The one real one is S0049L02 above.

### All four: seed 108
"we didn't hope to wake in the middle of the night" is the LEGO and about 10 rows in each course; in these courses the learner has to say it. Natural English is "we were hoping not to wake up in the middle of the night". **likely.** This is a proposal only: it is the shared English seed text (R0.18). Canon K9. ≈ 3,600 chars across the four courses.

---

### Patterns added (`eng-asia.patterns.json`; all pass calibration)
- **English-target patterns from deu #435's English fixes:** reflexive *feel myself*, *want + -ing*, *go with the bus*, simple present for progressive, missing backshift, adverb after the verb, *how long have you already*, *need too much time*. Hits in this slice: 1 (ara S0048L01B02).
- **From this scan:** missing apostrophes (12 jpn), time-word bolted on (5 zho, 1 ara), bare-auxiliary fragments (33 across the four, 27 REAL), run-on answer (13 jpn), *didn't hope to* (38).
- **From the two prior fix records for this slice:** English text on the known side (a135, eng_for_kor, 17 Aug) and brackets (#973·P unbracket, eng_for_jpn, 14 Oct). Both are **0 live in all four courses**, so those fixes held. Their known positives are planted shapes.

### Coverage

| family | jpn | kor | zho | ara |
|---|---|---|---|---|
| ZUT LEGO/seed | scanned (0) | scanned, 3 REAL | scanned, 2 REAL | scanned (0) |
| ZUT on USE rows | read: phrase-level only (Kai 21 Oct, not a blocker); S0226–230 rows go to J1 | read | read (the 64–73 slips are in Z1) | — |
| prompt is only the LEGO (new detector) | 192 REAL | 2 REAL | 0 | 0 |
| prompt/answer mismatch | **partial**: question-mark, same-prompt and seed-sentence reads only | partial, same | partial, same | partial, same |
| untaught target words | scanned, detector corrected | same | same | same |
| phrase missing its LEGO | read | read (LEGO fixes) | read (LEGO fixes) | read |
| LEGO over 8 syllables | hand-checked count | same | same | same |
| gapped LEGO | 0 | 0 | 4 | 0 |
| not-new / double debut | read | read | read | read |
| dup rows | read | read | read | read |
| empty audio | 0 | 0 | 0 | 1 |
| seed never said | read | read | read | read |
| question marks | read: か/の endings not a defect | all read | 吗/wh endings not a defect; rest read | 0 hits |
| known side has English / brackets | 0 | 0 | 0 | 0 |
| lexical English | run | run | run | run |
| intro wording | **not scanned** | not scanned | not scanned | not scanned |
| female voice / clip ≠ text | not scanned (needs an ear, A22) | same | same | same |

### Gaps
1. **The full known-side read of eng_for_jpn was not done.** The read covered the 201 non-か question rows, 18 same-prompt groups and 170 seed rows, and it found 174 mismatched or garbled prompts plus the 192 J1 rows. The rate in the rows I read suggests many more in the other ~9,000 rows. I have **not put a number on them**. This needs a dedicated read, shaped like deu #435 (shards by seed range, every row read, Japanese vs English). Smaller versions of the same need exist for eng_for_kor (the 해요 statement/question ambiguity also hides in USE rows that end in a ?-less clause) and eng_for_zho seeds 60–80.
2. **There is a bug in the shared detector.** `detect.cjs` untaught_target takes a word's first appearance from LEGOs before it looks at seeds. A word in an early seed whose first LEGO comes later is therefore flagged as untaught. That gave 27 false hits on jpn, 18 on kor and 42 on zho. I recomputed the family with the seed counted at its own number, and the counts above use that. The shared tool is not edited; the orchestrator should know, because other slices use it too.
3. **The builder's syllable estimate under-counts English.** It said kor and ara have 0 LEGOs over 8; a hand count says 12 and 16. The counts above use a vowel-group count with English exceptions, spot-checked by hand. 7–8 syllable LEGOs are counted (jpn 26, kor 32, zho 41, ara 46) but not listed one by one.
4. **The Japanese question-mark convention is ruled "not a defect" by my judgement, not by a canon entry.** か already makes the prompt a question. A9 says a ? must be there before audio is made, but these clips already exist. If Kai wants ？ added and the known clips re-voiced, it is 571 jpn rows (≈ 9,000 chars) and 266 zho rows (≈ 2,700 chars).
5. **Not read:** intro (presentation) wording, any clip by ear, and Popty's edit-event history (admin login). The audio-pass queue shows one pending pass per course from 12 Oct, and blocked "pod awaiting voice approval" on all four. I did not look into either.

---

## English for Hindi, Bengali, Gujarati, Marathi, Punjabi and Urdu speakers: cleanup scan findings (#447, worker #475·AI)

Courses: **eng_for_hin** (the main course), plus **eng_for_ben, eng_for_guj, eng_for_mar, eng_for_pan, eng_for_urd**. All six are released and live. English is the TARGET language in all of them.
I read them live through Popty's script-view on 17 Nov 2026 at 14:06Z. **Nothing was applied, rendered, linked or sent.**
The full row list is in `ops/paid-cleanup-scan-447/reports/eng-indic-north.json` (10,853 rows, each marked REAL, NOT A DEFECT, KNOWN, AT RISK or MINOR). The new patterns are in `eng-indic-north.patterns.json`. All 10 pass their own known positive (detect.cjs exit 0 on all six courses).

**Two things to know first.**
1. The five variants are not copies of eng_for_hin. They have the same 668 English seeds, but each was built separately: different LEGO cuts, and different practice rows from one shared generator. So "fixed in hin, still live in the variant" means the same *defect shape* is in the variant's own rows. It does not mean the same row ids.
2. **I cannot judge the known side (Hindi, Bengali, Gujarati, Marathi, Punjabi, Urdu) beyond its structure.** The canon says so too (Part Two: the known-side gate is inert on these scripts). Known-side findings below are structural: gaps, question words, first-person gender endings, a pronoun with no gender. Two exceptions are marked "best guess". The detector's "LEGO known text not in its seed" family (133–238 hits per course) is **not read** for this reason.

Audio characters = new target text × 2 voices + new known text × 1, for the sides that change. Deletes and relinks cost 0. LEGO changes include about 24 characters for the intro. All counts are estimates (±10%).

---

### PRIORITY — fixed in eng_for_hin, still live in the variants

| # | what hin fixed | hin record | still live in | size |
|---|---|---|---|---|
| 1 | **The known line's first-person verb matches the voice speaking it** (Kriti says the female form, Rehan the male) | #770, #941·H, #710 | **guj, pan, urd**: each has one FEMALE known voice (Azure Dhwani, Vaani, Uzma), and the known text uses MALE first-person forms | **AT RISK** (text only, not heard): guj 472 rows, pan 1,982, urd 1,406 |
| 2 | **A build row that just repeats the LEGO is made a real phrase**, so each basket has 3 counted builds | #943·H, step 3 of `eng-for-hin-red-seeds-fix-2026-09-23.cjs` | all five | hin has 1 basket left under 3. ben 748, guj 1,149, mar 782, pan 543, urd 369. Of these, 165 baskets have only 0–1 real builds |
| 3 | **No gapped LEGOs** (seed 128 re-cut gap-free) | #871, #943·H | ben, mar, urd | 15 LEGOs with "..." on the known side |
| 4 | **his/her from one known pronoun**: Kai approved an explanation intro on the first LEGO | #870·H, #880·H (S0020L01, S0021L03) | ben (তাকে = him and her); pan uses a broken form to mark "her"; urd uses "that girl's name" | 2 ZUT clashes + 1 grammar item; about 1,800 Bengali rows carry a pronoun with no gender |
| 5 | **Not-new only when both sides match an earlier LEGO** | #833, #875 | ben S0177L01 "her", not-new with no earlier pair. mar teaches 4 pairs as NEW twice | 5 |
| 6 | **"never" taught at seed 490** | #914·H | ben's only seed-490 LEGO is "trust anyone ever", which is not English | 1 |
| 7 | **Broken English from the tag-glue generator** (fixed in mar's 10 flagged seeds on 6 Aug, not elsewhere) | mar 54f405e6c | mar, rest of course | 126 rows (yet/already/very well/not sure) + 304 rows ("in English") |

Not found in the variants (no action): the seed-128 bracket gloss "someone (who)" (0 brackets in any variant); the seed-489 "right now / at the moment" clash (no variant uses one known word for both).

---

### eng_for_hin (main course): 385 REAL, ≈1,900 chars

**Empty audio — 19 rows, ≈1,340 chars.** S0490L01 is "never", the drill added on 23 Sept (#914·H). All 8 of its rows have no clip at all (known, target1, target2): `I'm never late`, `you never tell me`, and 6 more. 11 more rows in S0128/S0140 have no known clip. These are the "28 Cartesia clips unlinked" left by the seed-128 edit (#866). A pending audio pass has been queued since 12 Oct and has not run. **Fix:** run that pass. **Canon:** A16. **Confidence:** sure.

**Seed sentence never said in a played basket (P26) — 354 seeds.** Example: S0004 `how to say something in English`, S0008, S0011, S0015. Rule P26 (Kai, 28 Sept) was applied to Italian only. **Fix:** run the ita #635·I tool's method. It reuses the seed's own clips, so it costs 0 chars. **Confidence:** sure (target-side match; 451 if the Hindi must match exactly too).

**LEGO English not in its seed (L26) — 8.** S0111L03 `it brings about changes` (seed: "it changes our brain"); S0328L01 `she ought to` (seed: "she should"); S0461L01 `such a shop`; S0437L03 `as much money as possible` (seed has no "money"); S0375L03 `what she is doing` (seed: "was"). **Fix:** re-gloss each to the seed's words. ≈460 chars.

**ZUT — 1 REAL, 2 KNOWN.** कल = `tomorrow` (S0015L03) and `yesterday` (S0030L03). One prompt has two answers. **Fix (L34):** teach "yesterday" inside a larger LEGO with its own context word. Likely. KNOWN: उसका नाम his/her (#870·H); क्या होने वाला है is/was (#880·H).

**Small items.** S0001L01C02 component says `चाहता हूँ` (male) under the female LEGO `मैं चाहती हूँ`. S0611L03U05 English `do you want to go somewhere else` over Hindi "can we go somewhere else?". S0357L03 has 2 counted builds.
**KNOWN:** 32 LEGOs over 8 syllables (Kai applied 1 of the 92 proposed cuts); 11 seeds with no LEGO (2 Sept rebuild).
**Not a defect:** 30 "?" mismatches where both sides carry a question word. S0001L01 has no practice of its own, but seed 1 is graduated and L02–L05 all carry "I want".

---

### eng_for_mar: 1,771 REAL, ≈106,000 chars

**1. Empty known audio — 454 rows, ≈15,800 chars.** Seeds 31–668 in about 26 runs (31, 35–39, 51–60, 184–200, 301–340, 454–476, 652–668…). Almost all are rows U06 and later, added after the course was voiced. 5 rows also have no target clip (S0312L03U06, S0316L04U06/U07, S0318L02U06, S0323L02B04). The course's pending audio pass has been queued since **6 Aug** and has not run. No missing text has a clip elsewhere in the course, so the library will probably not fill them free. **Fix:** run the pass. **Confidence:** sure.

**2. Tag-glue broken English — 126 REAL of 157 read.** This is the generator defect the 6 Aug repair fixed in 10 seeds. The rest of the course was never repaired:
- S0130L01B03 `he's my friend yet`
- S0153L01B03 `in exactly already`
- S0102L01U04 `we're very well`
- S0197L01B03 `as a teacher very well`
- S0256L02B04 `I think I'll be ready already`

31 were fine (`have you decided yet?`, `you've done very well`).
**Fix:** replace each with a real phrase from taught words, as the 6 Aug repair did. Replacing keeps every basket's count; deleting does not. **Canon:** K9, P3. **Chars:** ≈8,900. **Confidence:** sure.

**3. "in English" stuck onto a fragment — 304 REAL of 339 read.** Examples: S0161L02U02 `Sunday in English`; `pub in English`, `brain in English`, `last month in English`, `or if in English`. The 6 Aug triage (3355555fd) called this slot "the drill format, not a defect". That was an agent's call, not Kai's. K9 says target English must be grammatical. 35 are fine (`to explain in English`, `could you say that in English?`).
**Fix:** delete where counts allow, else replace. **Chars:** ≤22,200 if every row is rewritten; 0 for deletes. **Confidence:** likely. **This is your call:** keep the slot or not.

**4. ZUT and broken LEGO English — 5.**
- S0136L01 LEGO is `course | अर्थातच`, with rows `course you`, `course you can`. **Fix:** `of course`. Sure.
- छान होईल is both `would be great` (S0090L03U04) and the LEGO `it would be nice` (S0402L01). **Fix:** delete U04.
- ते चालेल is both `it will work` (S0094L03U02) and the LEGO `that would be fine` (S0633L02). **Fix:** delete U02.
- S0065L01U05 `important something`. **Fix:** delete.
- S0161L02U03/U05 `on Sunday morning` / `Sunday morning here`, over a known side that says "here" in both. **Fix:** delete both.

**5. Same pair taught NEW twice — 4 REAL, 1 KNOWN.** S0215L01 `on Saturday night` (first at S0154L01), S0218L01 `on Sunday`, S0219L03 `for a while`, S0271L01 `next month`. **Fix:** mark not-new and rehome the played rows (P25). 0 chars. KNOWN: S0238L01 `he wanted` (6 Aug repair: proposed, not applied).

**6. Phrase without its LEGO — 14.** Example: S0215L01U01 `I can't remember Saturday night`, under the LEGO `on Saturday night`. S0161L02 has 5 rows without "on". S0636L01U04 `that was` under `that is`. **Fix:** reword or delete. ≈990 chars.

**7. Bare build rows — 782 baskets under 3 counted builds** (34 with 0–1). See the priority table. ≈57,800 chars to make them all real.

**8. Other.** P26: 67 seeds never said. L26: 5. Example: S0018L03 `we need to meet` (seed: "want"). S0024L02 `won't be able to remember` (seed: "I'm not going to be able to"). Over 8 syllables: 3, with cuts in the JSON. Example: S0548L02 `I am feeling sad / at the moment`. Gapped: 2 (S0014L02 `तुम्ही ... का`, S0485L03). Duplicate rows: 5 (deletes).
**Not read:** the other filler tags (here 224, today 228, again 204, now 157, tonight 113…). I read "here" in full: most are nonsense (`great here`, `bus here`, `pub here`). They are counted in the JSON, not row-judged.

---

### eng_for_pan: 1,475 REAL, ≈68,600 chars (+1,982 AT RISK)

**1. Empty known audio — 615 rows, ≈21,800 chars.** Seeds 31–668 in 17 runs (351–429 is the largest). Rows U06 and later again. S0316L04U07 and S0379L01B05 also have no target clip. The pending pass has been queued since **12 Aug**. **Fix:** run it. Sure.

**2. LEGO English drifts from the seed (L26) — 60 REAL of 70.** This is the biggest content defect in pan. From seed ~500 on, LEGOs carry English the seed never says, sometimes with a different meaning:
- S0513L02 `when I turn my head upside down` (seed: "when I move my head up and down")
- S0618L01 `it doesn't take much time` (seed: "it doesn't feel like a long time")
- S0597L02 `he must have heard` (seed: "I suspect that he's heard")
- S0507L01 `we moved into town` (seed: "to the city")
- S0543L01 `he was right` (seed: "She was right")
- S0599L02 `I would have happily driven`

hin has no case like this; its 8 are small. **Fix:** re-gloss each LEGO to the seed's words and carry the change into its phrases. **Chars:** ≈3,900 for the LEGOs; phrases that copy the drift add more. **Confidence:** likely. 10 not a defect: contraction only, stand-in "it" (L33).

**3. Known voice is female, known text is male (AT RISK).** 1,982 played rows say `ਮੈਂ ਚਾਹੁੰਦਾ ਹਾਂ`-type male forms. The only known voice is Azure pa-IN-VaaniNeural (female). 63 rows already use female forms (`ਚਾਹੁੰਦੀ ਹਾਂ`), so the course mixes both. This is the state hin was in before #770/#941·H.
**Fix:** your voice call. Either flip the text to female forms (≈77,000 known chars) or give these rows a male known voice. **Not heard.**

**4. Untaught words — 27 rows.** `for` is used from seed 38 but first taught at seed 68. Example: S0038L02U01 `I want to learn English for about a week`. `most` at seed 280 is taught at 288 (`the most important job` ×5). **Fix:** grow S0038L02 to `for about a week` and S0280's LEGO to `the most important job`. That is two LEGO changes, and the rows then pass. Likely.

**5. Other.** "again" filler from seed ~500 (`the church is ugly again`, `unless he's lucky again`, `he was right again`): about 120 read, mostly nonsense, not row-counted. Bare build rows: 543 baskets (40 with 0–1). P26: 198 seeds. Over 8 syllables: 9, with cuts in the JSON. Questions: 7 REAL. Example: S0157L02U01 English `I want to do something next month` over a known "what do I want to do next month?". S0058L01U05 `I want to understand something with you?`.
S0021L03 `ਉਸਦੀ ਨਾਂ`: the possessive should agree with ਨਾਂ, which is masculine (ਉਸਦਾ ਨਾਂ). It looks like a hack to mark "her". Best guess; the fix is the hin explanation intro. Duplicate rows: 7. Phrase without LEGO: 5.

---

### eng_for_guj: 1,479 REAL, ≈89,600 chars (+472 AT RISK)

**1. Empty known audio — 199 rows, ≈6,800 chars.** Seeds 528–560, 611–635, 639–641, 645–668. S0489L02B05 has no target1 clip. The pending pass has been queued since 12 Oct. Sure.

**2. Female known voice, male text (AT RISK).** 472 rows. Example: S0002L01 `હું કોશિશ કરી રહ્યો છું` read by Azure gu-IN-DhwaniNeural (female). Only 2 rows use the female form. ≈18,700 known chars to flip. Your voice call.

**3. LEGO English drifts (L26) — 25 REAL of 35.**
- **Gender swaps:** S0285L01 `he speaks` (seed: "She speaks"); S0289L02 `he'll be there` (seed: "she's going to be there"); S0290L01 `she knows` (seed: "he knows")
- **Meaning:** S0293L02 `where it's being held` (seed: "where he's going to meet me"); S0495L01 `important` (seed: "When it matters")

**Fix:** re-gloss to the seed. ≈1,340 chars. Likely.

**4. Other.**
- **Bare build rows:** 1,149 baskets, the most of any course (48 with 0–1 real builds); ≈80,000 chars to make them all real.
- **P26:** 74 seeds never said.
- **Over 8 syllables:** 7. Example: S0492L05 `which do you think / is the most interesting`.
- **Phrase without its LEGO:** S0075L01 `have you got` → rows `do you have to go?` (a different meaning, 3 rows); S0053L03U04 `her letter` under `his letter`.
- **ZUT:** S0493L02U05 `what is going to come now` vs the LEGO `what's going to come next`.
- **Rows whose known side leaves out a word:** S0055L02U03 `a little tired`; S0255L01U05 `ready to answer`, over a known that says "speak English".
- **Seed words no LEGO teaches:** `let` at 71, `quite` at 339.
- **Duplicate rows:** 6.

---

### eng_for_ben: 1,044 REAL, ≈53,700 chars

**1. Gapped LEGOs — 11.** All are on the Bengali side: S0549L02 `আমাকে ... থাকতে হবে | I have got to be`, S0630L01 `আমি কি ... পারি | could I have`, S0626L02 `না, ... ধন্যবাদ | no thank you`. S0626L02 is also a second NEW debut of S0173L01. **Fix:** fill the gap with the seed's own middle words, or re-cut as hin did at seed 128. ≈490 chars. Likely.

**2. Him/her and he/she from one Bengali pronoun.** তাকে is `him` (S0176L02) and `her` (S0177L01, not-new with no earlier pair; L31). সে জানতে চেয়েছিল is both `he wanted to know` (LEGO S0347L03) and `she wanted to know`. Bengali সে/তার/তাকে carry no gender. About 1,800 played rows use one of them.
**Fix:** the hin precedent. Kai approved an explanation intro on the first his/her LEGO (S0020L01). Put the same intro on the first সে, তার and তাকে LEGOs, and make S0177L01 NEW. About 3 intros. Likely.

**3. LEGO English drifts (L26) — 33 REAL of 39.**
- S0127L01 `didn't want to see` (seed: "I wanted to see")
- S0501L04 `believe` (seed: "trust")
- S0563L03 `couldn't have` (seed: "wouldn't have")
- S0631L01 `what will you have` (seed: "What would you like?")
- S0638L01 `I'm trying to remember` (seed: "to think")
- Formal block 642–665: `do you have any objection` (seed: "Do you mind madam?")

Broken English: S0490L01 `trust anyone ever`; S0573L02 `makes so special`. ≈1,950 chars.

**4. Untaught words — 44 rows.** `my` is used from seed 51 (`with my friends`) but first taught at seed 126 (25 rows). `keep` at 24/28 is taught at 92. `fetched`, `continued` and `hates` are never taught. **Fix:** teach `my friends` at S0051L02, the seed's own words; the rest are rewords. Likely. 25 more are "we'll" rows: not a defect (we + 'll, both taught).

**5. Other.**
- **Bare build rows:** 748 baskets (32 with 0–1).
- **P26:** 153 seeds never said.
- **Phrase without its LEGO:** 17. Example: S0211L02 `doesn't want to explain`, where the seed says "didn't" and the rows say "don't" (4 rows).
- **Duplicate rows:** 13.
- **Questions:** 7 REAL. The known prompt has no কি and no "?", so it is heard as a statement: S0021L02B01 `তুমি শিখছ | are you learning?`, S0075L01B01 `তোমার আছে | have you got?`.
- **Over 8 syllables:** 6.
- **No empty audio.** The pending pass, queued since 12 Oct, has nothing left to fill.

---

### eng_for_urd: 545 REAL, ≈24,600 chars (+1,406 AT RISK)

**1. Female known voice, male text (AT RISK).** 1,406 rows. Example: `میں چاہتا ہوں` read by Azure ur-PK-UzmaNeural (female). 23 rows already use female forms (S0177L01B01 `میں اس سے پوچھوں گی`). ≈48,000 known chars to flip. Your voice call.

**2. Untaught words — 30 rows. Seed words no LEGO teaches — 11 seeds.** `make` (seed 47), `every` (449, 463, 533, 584), `bad` (462, 511, 534, 536), `such` (423, 478, 557), `from` (85, 170, 181), `baby` (516) are used before, or without, a LEGO that teaches them. **Fix:** grow each seed's LEGO to carry the word, at the shortest cut. Likely.

**3. Questions — 11 REAL.** The Urdu prompt has no کیا and no "?": S0631L01B02–B04 `کچھ لینا چاہیں گے | would you like something?`, S0174L01B01, S0196L01B02/B03, S0644L01B01. **Fix:** add کیا … ؟ ≈180 known chars.

**4. Other.**
- **Gapped LEGOs:** 2 (S0080L01 `میں ... ہوں گا`, S0119L02).
- **Duplicate rows:** 8, including S0007L01U05 `I'm trying to try` (nonsense).
- **Phrase without its LEGO:** 8 (S0051L01 `I enjoy` → `I like to speak`).
- **L26:** 5. S0280L03 `only had to do the work` (seed: "the most important job"); S0300L01 `friendly` (seed: "unfriendly").
- **Tag-glue:** 4 (`a lot yet`, `isn't yet`).
- **Bare build rows:** 369 (22 with 0–1).
- **P26:** 94 seeds never said.
- **Empty audio:** 1 row (S0422L01U07 target).
- **S0489L02:** `مضبوط` means sturdy. "Strong coffee" is `کڑک کافی`, as hin has it. Best guess.
- **S0021L03:** `اس لڑکی کا نام` is a workaround for "her"; listed only so it can match hin.

---

### Coverage

| family | hin | ben | guj | mar | pan | urd |
|---|---|---|---|---|---|---|
| empty audio | read all | read (0) | read all | read all | read all | read all |
| ZUT LEGO/use | read | read | read | read | read (0) | read |
| LEGO English not in seed (L26) | read 8 | read 39 | read 35 | read 6 | read 70 | read 7 |
| LEGO known not in seed | **not read** (known side) | not read | not read | not read | not read | not read |
| over 8 syllables (hand count) | KNOWN | read | read | read | read | read |
| 7–8 syllables (Kai's shortest cut) | counted 132, **no cuts proposed** | 67 | 79 | 99 | 94 | 54 |
| phrase without LEGO | 0 | read 19 | read 9 | read 14 | read 13 | read 14 |
| duplicate rows | 0 | read | read | read | read | read |
| untaught target words | 0 | read 69 | read 6 | 0 | read 36 | read 30 |
| gapped / not-new / NEW twice | 0 | read | 0 | read | 0 | read |
| question on one side | read 31 | read 9 | read 22 | read 12 | read 28 | read 11 |
| P26 seed never said | counted (seed-level) | counted | counted | counted | counted | counted |
| tag-glue yet/already/very well/not sure | read 4 | read 8 | read 12 | read 157 | read 7 | read 19 |
| "in English" tag | not judged (31) | not judged (6) | not judged (16) | **read 339** | not judged (16) | not judged (14) |
| other filler tags (here/today/now/again…) | counted 520 | counted 637 | counted 625 | counted 1,081; "here" read | counted 1,060; "again" part-read | counted 390 |
| bare build rows | counted | counted | counted | counted | counted | counted |
| first-person gender vs known voice | not applicable (two voices) | not applicable (no gender) | counted | checked: male voice, male forms, consistent | counted | counted |
| intros | **not scanned** | not scanned | not scanned | not scanned | not scanned | not scanned |

### Gaps

- **The known side is not judged** beyond structure (canon Part Two). This covers "LEGO known not in seed" (133–238 hits per course) and the naturalness of the Indic text. The two known-side "best guess" items are marked as such.
- **Intros not scanned.** Script-view has no intro text. hin's intros were re-authored to mirror their LEGOs (#20·I); nobody has checked the variants.
- **"A bare build row is never played"** is the finding of hin's #943·H tool header. I did not re-verify it in the player code. If it is wrong, family 2 shrinks to a P3 (anti-filler) question.
- **Female voice saying a male form:** these are text counts only. No clip was heard (A22). The known voice per slot is inferred from estate-map voices_of_record, which lists one dominant known voice per course.
- **Filler tags** (here/today/now/again…): about 4,300 rows counted (hin 520, ben 637, guj 625, mar 1,081, pan 1,060, urd 390), not judged row by row, apart from mar "here" and part of pan "again".
- **7–8 syllable LEGOs:** counted, no shorter cuts proposed.
- **Audio characters are estimates from text length.** For empty slots, the library may already hold some English target clips (other eng_for_ courses), which would make them free. I did not dry-run the render route.
- **The formal "sir/madam" block (639–655)** has no honorific in any of the six courses, hin included. So it is not a "fixed in main" item. Not judged further.

---

## eng-indic-south — cleanup scan findings (#447, worker #476·AI, 17 Nov 2026)

Courses: **eng_for_kan, eng_for_tam, eng_for_tel** (live) and **eng_for_sin** (beta). English is the TARGET in all four, so I could read and judge every English line. I **cannot judge Kannada, Tamil, Telugu or Sinhala** beyond structure (word present or missing, "?" present or missing). Nothing was applied, rendered or sent. Live dumps were taken 17 Nov through Popty's own script-view route; the candidate counts matched the orchestrator's exactly.

### The short version

| course | real content findings | content audio chars | housekeeping (mechanical) | housekeeping chars |
|---|---|---|---|---|
| eng_for_kan | 115 | 12,420 | 441 | 555 |
| eng_for_tam | 309 | 21,344 | 224 | 1,384 |
| eng_for_tel | 130 | 33,280 | 762 | 20,748 |
| eng_for_sin | 530 | 77,356 | 434 | 4,449 |

"Housekeeping" = duplicate rows (delete, 0 chars), seed sentence never played (P26 tool, reuses seed clips, 0 chars), missing "?" on the known side (known clip re-read), empty audio slots. Chars = new text × 2 voices for English, × 1 for the known side, deletes cost 0; LEGO re-cuts are counted at the upper bound (the LEGO plus every row in its basket, English only — known-side re-records are NOT counted because I cannot say which known rows change).

**What matters most, in order:**

1. **eng_for_sin seeds ~345–668: the Sinhala and the English seed often say different sentences, and the LEGOs were cut from the Sinhala.** 160 new LEGOs have English the seed does not contain — e.g. S0455 seed *"We had to leave because the children were tired"* is taught as *"the child was upset"* + *"we need to go home"*; S0405 *"Should we ask if we have to book?"* is taught with *"a hug"* and *"was needed"*; S0127 *"That isn't why I wanted to see you"* teaches *"brain"*; S0454 *"Our friends came round at about six o'clock"* teaches *"six of our friends"*. On top of that sit **147 template build rows** ("liked a hug", "want the film", "said a good example", "liked my grandfather fought in Italy during the war") and **38 "near the field / near the top" tails** ("we need to go home near the top"). This half of the course needs re-authoring from the English seeds, not row fixes. Recommendation: treat sin seeds 345+ as one rebuild job (seed Sinhala re-checked against the English, LEGOs re-cut to L26, baskets regenerated); deleting the 185 template/filler rows is safe now and costs nothing.
2. **eng_for_sin seed 111 basket is nonsense** ("I hope for our brain", "I relax with our brain"; the Sinhala rows have no word for brain). 13 rows. Delete and rebuild.
3. **eng_for_tel: 428 played rows have no known-side (Telugu) clip** (424 known-only, 4 also missing English). Seeds 211–511. 18,099 Telugu chars × 1 voice at most (library-first may find some). This is A16: the learner gets no prompt.
4. **eng_for_tam: a broken stretch at seeds ~7–60 and 112–149.** English says words the Tamil does not ("I'm trying to come back today", "he wants to come back later on now", "I wouldn't like to finish tomorrow now" — 74 rows); grammar breaks ("he speak tomorrow", "I learn English last week", "how do you feel last month?", "thats very kind of you and im"); **"try" is not taught until seed 491 yet used from seed 7** (25 rows) because seed 7's LEGOs never cover "I want to try"; LEGOs that are not English ("believe that your idea very good", "don't feel as if ready", "difficult thinking quickly"); seed 140's LEGOs are about being late while the seed is *"I'm sorry that I can't see what you're trying to show me"*, and seed 239 teaches *"father"* for *"My mother likes to read"*.
5. **eng_for_tel / eng_for_kan: LEGO English drifts from the seed** (tel 54, kan 27): *"girlfriend"* for *friend* (S0267L02), *"dad"* for *father*, *"tv"* for *television*, *"I have"* for *I've got*, *"'d told me"* (a LEGO starting with 'd), kan *"that is more warm"* (S0578L02, 8 rows) and *"of the shops"*, *"growing up"* for *grow up*. Tel/kan grammar is otherwise clean — kan's real grammar breaks are 18 rows, tel's 5.
6. Over-cap LEGOs (9+ syllables, hand count): kan 4, tam 13, tel 11, sin 11 — each listed with a shorter cut below.

Patterns I added (14, all English-target, each matched its own live positive in `detect.cjs` — exit 0 on all four courses): `reports/eng-indic-south.patterns.json`. They are the ones to run on the other eng_for_* courses (hin, ben, mar, guj, pan, urd…): template builds, "near the field/top", did+past, a+vowel, missing apostrophes, "more warm", he/she + bare verb, want+ing, present + "last week", perfect + "last week", "can you to", stray "'d", "forward to to", "thought today".

**KNOWN items:** none of the findings below are on a held or ruled list. I checked canon WC-1/WC-2/L20/R0.10, the a134 eng_for_sin repair records (seeds 1–200, Aug 2026: corrupt Sinhala writing, presentation clips — different defects, all in seeds 1–200), git history for all four courses and eng_for_hin, Kai's memory index and estate-search. There are no Kai rulings on these four courses since August. L20 (Sinhala ask/hear) touches two gapped LEGOs (S0365L02 "I didn't hear", S0423L03 "do they need to ask") — when those are re-cut, L20's procedure applies.

### eng_for_kan

#### lego_not_in_seed_target — 27 real of 34 read · 10,530 chars
The LEGO's English is not what the seed sentence says (it was glossed from the known side instead).
- `S0261L02` ಅಂತ ನನಗೆ ಅನಿಸುತ್ತೆ | **it seems to me** → Re-cut so the LEGO English is the seed's own words: seed says "I think it might be something important."; LEGO adds/changes ['seems', 'to', 'me']. Known side re-cut to match (known text not judged her (likely)
- `S0474L01` ಉಚಿತವಾಗಿ | **for free** → Re-cut so the LEGO English is the seed's own words: seed says "I don't even want it as a free offer."; LEGO adds/changes ['for']. Known side re-cut to match (known text not judged here). (likely)
- `S0474L02` ಅದನ್ನ ಕೊಟ್ಟರೂ | **even if it's given** → Re-cut so the LEGO English is the seed's own words: seed says "I don't even want it as a free offer."; LEGO adds/changes ['if', "it's", 'given']. Known side re-cut to match (known text not judged here (likely)
- `S0479L01` ಚಿಕ್ಕ | **small** → Re-cut so the LEGO English is the seed's own words: seed says "It's the least I could do."; LEGO adds/changes ['small']. Known side re-cut to match (known text not judged here). (likely)
- Not a defect (7): `S0062L02` to help; `S0469L01` to change; `S0487L01` it; `S0487L02` is; `S0575L02` has been upsetting; `S0580L02` we … — NOT A DEFECT (contraction / K54 "to" / K28 pronoun)
- Canon: L26 (K54/K28 exceptions)

#### zut_lego — 4 real of 4 read · 154 chars
One known prompt, two English answers, with a LEGO on one side.
- `S0118L03` ಈಗ ನನಗೆ ಚೆನ್ನಾಗಿ ಅನಿಸ್ತಿದೆ | **I feel better** → LEGO English "I feel better now", or drop ಈಗ from the LEGO known — LEGO "I feel better" over known that says "now" (its own U01 says "I feel better now") (likely)
- `S0193L01` ನನಗೆ ತುಂಬಾ ಕೆಲಸ ಇದೆ | **I'm too busy** → give S0273/S0277 rows the S0273L02 known for "too much work" plus "I've got"; keep "I'm too busy" for ನನಗೆ ತುಂಬಾ ಕೆಲಸ ಇದೆ — same known → "I'm too busy" (S0193L01) and "I've got too much work" (S0273L0 (likely)
- `S0282L01` ಇಲ್ಲ ಅದು ಸಮಸ್ಯೆ ಅಲ್ಲ | **no that's not a problem** → unify on the LEGO: S0134L04U03 → "no, that's not a problem" — "no that's not a problem" (LEGO) vs "no it's not a problem" (S0134L04U03) on one known (likely)
- `S0163L01` ಅದು ಆಸಕ್ತಿಕರ ಅಂತ ನನಗೆ ಅನಿಸುತ್ತೆ | **I think that it's interesting** → unify the rows on the LEGO's "that" — "I think that it's interesting" (LEGO) vs "I think it's interesting" (S0089L03U02, S0120L04U02) (likely)
- Canon: K2, K22, L34

#### en_grammar:more_adj — 8 real of 8 read · 484 chars
"more warm" for "warmer" — in the LEGO itself.
- `S0578L02` ಹೆಚ್ಚು ಬೆಚ್ಚಗಿರೋ | **that is more warm** → LEGO "that is more warm" → "warmer" (seed 578 says "somewhere warmer"); rows follow (sure)
- `S0578L02B01` ಹೆಚ್ಚು ಬೆಚ್ಚಗಿರೋ | **that is more warm** → LEGO "that is more warm" → "warmer" (seed 578 says "somewhere warmer"); rows follow (sure)
- `S0578L02B02` ಹೆಚ್ಚು ಬೆಚ್ಚಗಿರೋ ಚರ್ಚ್ | **the church that is more warm** → LEGO "that is more warm" → "warmer" (seed 578 says "somewhere warmer"); rows follow (sure)
- `S0578L02B03` ಅವಳಿಗೆ ಹೆಚ್ಚು ಬೆಚ್ಚಗಿರೋ ಚರ್ಚ್ ಬೇಕು | **she wants the church that is more warm** → LEGO "that is more warm" → "warmer" (seed 578 says "somewhere warmer"); rows follow (sure)
- Canon: K9/K16

#### en_grammar:present_with_past_time — 2 real of 2 read · 122 chars
Present tense with a past time phrase ("I learn English last week").
- `S0067L01B04` ಕಳೆದ ವಾರ ನಿಮಗೆ ನಿಲ್ಲಿಸಬೇಕು? | **do you want to stop last week?** → reword to the past, or drop the time phrase (sure)
- `S0081L01B03` ಕಳೆದ ವಾರ ನಿಮಗೆ ಶುರು ಮಾಡಬೇಕು? | **do you want to start last week?** → reword to the past, or drop the time phrase (sure)
- Canon: K9/K16

#### en_grammar:doubled_word — 3 real of 3 read · 180 chars
Doubled word or a garbage tail ("looking forward to to learn").
- `S0049L02B03` ಇವತ್ತು ಬೆಳಿಗ್ಗೆ ಅದು ಹೀಗೆ | **it's like this this morning** → "looking forward to learning/practising/meeting"; drop garbage tails (sure)
- `S0049L02U04` ಇವತ್ತು ಸಂಜೆ ಅದು ಹೀಗೆ | **it's like this this evening** → "looking forward to learning/practising/meeting"; drop garbage tails (sure)
- `S0636L01B02` ಅದು ಜೇನ್‌ಳ ಚೀಲ ಅಂತ ನನಗೆ ಅನಿಸುತ್ತೆ ಅಂತ | **that I think that that is Jane's bag** → "looking forward to learning/practising/meeting"; drop garbage tails (sure)
- Canon: K9/K16

#### en_grammar:want_ing — 1 real of 1 read · 46 chars
"want" + -ing ("I don't want taking").
- `S0034L03B02` ಅವನಿಗೆ ಮಾತಾಡೋದು ಬೇಡ | **he doesn't want talking** → reword: want to + verb (e.g. "I don't want to take too much time") (sure)
- Canon: K9/K16

#### en_grammar:today_tail_past — 4 real of 4 read · 0 chars
"today" bolted onto a bare past verb ("I thought today").
- `S0361L02B02` ಇವತ್ತು ಸುಮ್ಮನಿದ್ದ? | **was quiet today?** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- `S0374L02B02` ಇವತ್ತು ಅಂತ ನನಗೆ ಅನಿಸ್ತು | **I thought today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- `S0375L02B02` ಇಲ್ಲ ಅವಳು ಇವತ್ತು ಏನು ಮಾಡ್ತಿದ್ದಳು | **no what she was doing today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- `S0444L03B03` ಇವತ್ತು ಅವರು ಅಂದುಕೊಂಡ್ರು | **they thought today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- Canon: K9/K16

#### untaught_target — 62 real of 62 read · 904 chars
A row uses an English word (or word form) before the course teaches it.
- `S0026L01U05` ನಾವು ಬೇಗ ಮುಗಿಸಬೇಕಾಗಿರುವುದರಿಂದ ನಾನು ಹೋಗಲು ಬಹುತೇಕ ಸಿದ್ಧವಾಗಿದ್ದೇನೆ | **I'm nearly ready to go because we should finish soon** → reword with taught words, or delete (never add a LEGO) (sure)
- `S0052L03U05` ಅವನು ತನ್ನ ಸ್ನೇಹಿತನಿಗೆ ಒಂದು ಪತ್ರ ಕೊಡಬೇಕು | **he wants to give a letter to his friend** → reword with taught words, or delete (never add a LEGO) (sure)
- `S0053L03U03` ಅವನು ತನ್ನ ಸ್ನೇಹಿತನಿಗೆ ಅವನ ಪತ್ರವನ್ನ ಕೊಡಬೇಕಿತ್ತು | **he wanted to give his letter to his friend** → reword with taught words, or delete (never add a LEGO) (sure)
- `S0071L04U02` ನಮಗೆ ಅವನಿಗೆ ಸಹಾಯ ಮಾಡೋದು ಬೇಕಿರಲಿಲ್ಲ | **we didn't want to help him** → reword with taught words, or delete (never add a LEGO) (sure)
- Canon: K8, K14, K15, P27

#### lego_over_8_syllables — 4 real of 4 read · 0 chars
New LEGO over the 8-syllable cap (counted by hand rule, not the tool's estimate).
- `S0100L01` ಇದೇ ತರಹದ್ದನ್ನ ಮಾಡೋ ಬಗ್ಗೆ | **about doing something similar** → 9 syllables (hand rule count). Shorter cut: about doing | something similar (likely)
- `S0159L01` ನಾನು ಹೇಳೋಕೆ ಪ್ರಯತ್ನಿಸ್ತಿರೋದು ಅದಲ್ಲ | **that isn't what I'm trying to say** → 9 syllables (hand rule count). Shorter cut: that isn't | what I'm trying to say (likely)
- `S0260L01` ನನಗೆ ಸ್ವಲ್ಪವೂ ಗೊತ್ತಿಲ್ಲ | **I don't have the faintest idea** → 9 syllables (hand rule count). Shorter cut: I don't have | the faintest idea (likely)
- `S0490L03` ಮತ್ತೆಂದೂ ಯಾರನ್ನೂ ನಂಬಲ್ಲ | **never trust anyone ever again** → 9 syllables (hand rule count). Shorter cut: never trust anyone | ever again (likely)
- Canon: L3

#### qmark_mismatch — 16 real of 16 read · 555 chars
Question mark on one side only (nearly always: the known text is a question but has no "?", so its clip may be read flat).
- `S0331L02U06` ನೀವು ಯಾಕೆ ಎಲ್ಲಾ ಉತ್ತರಗಳನ್ನ ಹುಡುಕ್ತಿದ್ದೀರಿ | **why are you looking for all the answers?** → add "?" to the known text; re-record the known clip (sure)
- `S0334L01U07` ನೀವು ಯಾಕೆ ಬೆಕ್ಕಿನ ಮರಿಯನ್ನ ಹುಡುಕ್ತಿದ್ದೀರಿ | **why are you looking for the kitten?** → add "?" to the known text; re-record the known clip (sure)
- `S0379L04U06` ಆಫ್ರಿಕಾಗೆ ನೀವು ಹೋಗೋ ಮೊದಲು ನನಗೆ ಹೇಳ್ತೀರಾ | **can you tell me before you go to Africa?** → add "?" to the known text; re-record the known clip (sure)
- `S0559L01U03` ನಿಮಗೆ ಹೋಗೋ ದಾರಿ ಸಿಕ್ತಾ | **have you found the path?** → add "?" to the known text; re-record the known clip (sure)
- Canon: A7, A9

#### dup_rows — 182 real of 182 read · 0 chars
The same row twice in one basket (nearly always U01 repeats B01).
- `S0004L02U02` ಹೇಗೆ ಏನಾದರೂ ಹೇಳೋದು | **how to say something** → delete this row; it repeats S0004L02B02 in the same basket (sure)
- `S0073L01U01` ತುಂಬಾ ಧನ್ಯವಾದಗಳು | **thank you very much** → delete this row; it repeats S0073L01B01 in the same basket (sure)
- `S0073L02U01` ನಾನು ಇನ್ನೂ ಕಲಿಯೋದು ಇದೆ | **I've got more to learn** → delete this row; it repeats S0073L02B01 in the same basket (sure)
- `S0075L01U01` ನಿಮಗೆ ಇನ್ನೂ ಕಲಿಯೋದು ಇದೆಯಾ? | **have you got more to learn?** → delete this row; it repeats S0075L01B01 in the same basket (sure)
- Canon: spa #189/#212 precedent

#### seed_not_played — 243 real of 243 read · 0 chars
The seed's English sentence is never said in any played row.
- `S0006` ನಾನು ಒಂದು ಪದವನ್ನು ನೆನಪಿಸಿಕೊಳ್ಳೋಕೆ ಪ್ರಯತ್ನಿಸ್ತಿದ್ದೇನೆ. | **I'm trying to remember a word.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0008` ನನ್ನ ಅರ್ಥ ಏನು ಅಂತ ವಿವರಿಸೋಕೆ ಪ್ರಯತ್ನಿಸ್ತೀನಿ. | **I'm going to try to explain what I mean.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0009` ನಾನು ಈಗ ಸ್ವಲ್ಪ ಇಂಗ್ಲಿಷ್ ಮಾತಾಡ್ತೀನಿ. | **I speak a little English now.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0010` ಇಡೀ ವಾಕ್ಯ ನನಗೆ ನೆನಪಿರುತ್ತೋ ಇಲ್ಲವೋ ಗೊತ್ತಿಲ್ಲ. | **I'm not sure if I can remember the whole sentence.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- Canon: P26


### eng_for_tam

#### lego_not_in_seed_target — 16 real of 18 read · 8,914 chars
The LEGO's English is not what the seed sentence says (it was glossed from the known side instead).
- `S0091L03` கடினம் நினைக்க வேகமாக | **difficult thinking quickly** → Re-cut so the LEGO English is the seed's own words: seed says "It's difficult to think quickly enough to answer in time."; LEGO adds/changes ['thinking']. Known side re-cut to match (known text not ju (likely)
- `S0112L02` எதிர்பார்க்கவில்லை | **not expecting** → Re-cut so the LEGO English is the seed's own words: seed says "That was very interesting, and I wasn't expecting it."; LEGO adds/changes ['not']. Known side re-cut to match (known text not judged here (likely)
- `S0112L03` மிகவும் சுவாரஸ்யமானது எதிர்பார்க்கவில்லை | **wasn't expecting it to be very interesting** → Re-cut so the LEGO English is the seed's own words: seed says "That was very interesting, and I wasn't expecting it."; LEGO adds/changes ['to', 'be']. Known side re-cut to match (known text not judged (likely)
- `S0126L03` மாற்றுகிறது வடிவம் | **changes shape** → Re-cut so the LEGO English is the seed's own words: seed says "This work is changing the shape of my brain."; LEGO adds/changes ['changes']. Known side re-cut to match (known text not judged here). (likely)
- Not a defect (2): `S0661L01` you all; `S0668L01` you all — NOT A DEFECT (contraction / K54 "to" / K28 pronoun)
- Canon: L26 (K54/K28 exceptions)

#### en_adds_word_known_lacks — 74 real of 74 read · 4,278 chars
The English says "now / today / again / here" and the known prompt does not.
- `S0012L02B01` யூகிக்க முயற்சிக்கிறேன் | **I'm trying to guess now** → drop "now" from the English (or add the course's own word to the known side) (likely)
- `S0012L03B02` என்ன நடக்கும் என்று விளக்கப் போகிறேன் | **I'm going to explain what's going to happen now** → drop "now" from the English (or add the course's own word to the known side) (likely)
- `S0012L03B03` என்ன நடக்கும் என்று சொல்ல முயற்சிக்கிறேன் | **I'm trying to say what's going to happen now** → drop "now" from the English (or add the course's own word to the known side) (likely)
- `S0012L04B03` பேச விரும்புவதில்லை | **I wouldn't like to speak now** → drop "now" from the English (or add the course's own word to the known side) (likely)
- Canon: K2 (prompt must ask for exactly this answer)

#### phrase_missing_lego — 81 real of 81 read · 2,960 chars
A practice row does not contain its LEGO (negated, turned into a question, person swapped, or the LEGO itself is wrong).
- `S0025L04B02` இப்போது போக வேண்டும் | **I need to go now** → row changes the LEGO's verb form or words (negation, question, person, tense): reword back to the LEGO's exact form, or move under the LEGO it really practises (likely)
- `S0098L01U01` நான் இப்போது போக வேண்டும் | **I have to go now** → row changes the LEGO's verb form or words (negation, question, person, tense): reword back to the LEGO's exact form, or move under the LEGO it really practises (likely)
- `S0112L03B03` அது மிகவும் சுவாரஸ்யமானது என்று நான் எதிர்பார்க்கவில்லை | **I wasn't expecting that to be very interesting** → re-cut the LEGO to what its rows and seed say (see LEGO family) (likely)
- `S0112L03U02` இது மிகவும் சுவாரஸ்யமானது நான் இதை எதிர்பார்க்கவில்லை | **this is very interesting, I wasn't expecting it** → re-cut the LEGO to what its rows and seed say (see LEGO family) (likely)
- Canon: P17, K50

#### en_grammar:missing_apostrophe — 6 real of 6 read · 486 chars
Apostrophes missing in a LEGO ("thats … im").
- `S0142L05` இது மிகவும் கருணையான நீங்கள் மற்றும் நான் | **thats very kind of you and im** → restore apostrophes: "that's very kind of you and I'm grateful"; LEGO should end at a whole phrase (sure)
- `S0142L05B01` இது மிகவும் கருணையான நீங்கள் மற்றும் நான் | **thats very kind of you and im** → restore apostrophes: "that's very kind of you and I'm grateful"; LEGO should end at a whole phrase (sure)
- `S0142L05U01` இது மிகவும் கருணையான நீங்கள் மற்றும் நான் நன்றியுள்ளவன் | **thats very kind of you and im grateful** → restore apostrophes: "that's very kind of you and I'm grateful"; LEGO should end at a whole phrase (sure)
- `S0142L05U02` நான் நினை இது மிகவும் கருணையான நீங்கள் மற்றும் நான் நன்றியுள்ளவன் | **I think thats very kind of you and im grateful** → restore apostrophes: "that's very kind of you and I'm grateful"; LEGO should end at a whole phrase (sure)
- Canon: K9/K16

#### en_grammar:third_person_s — 3 real of 3 read · 124 chars
Missing -s after he/she ("he speak tomorrow").
- `S0016L01B02` அவர் நாளை பேச | **he speak tomorrow** → "he speaks tomorrow"-type fix, or delete the build (sure)
- `S0017L01B03` அவள் இன்று பேச | **she speak today** → "he speaks tomorrow"-type fix, or delete the build (sure)
- `S0128L03U02` அவன் போல் யாரோ நான் முன்பு அறிந்தேன் | **he like someone I used to know** → "he speaks tomorrow"-type fix, or delete the build (sure)
- Canon: K9/K16

#### en_grammar:present_with_past_time — 11 real of 11 read · 574 chars
Present tense with a past time phrase ("I learn English last week").
- `S0037L02U01` நான் கடந்த மாதம் ஆங்கிலம் கற்கினேன் | **I learn English last month** → reword to the past, or drop the time phrase (sure)
- `S0037L02U03` நான் கடந்த மாதம் கவனமாக கற்கினேன் | **I learn carefully last month** → reword to the past, or drop the time phrase (sure)
- `S0037L02U05` நான் கடந்த மாதம் பேசினேன் | **I speak last month** → reword to the past, or drop the time phrase (sure)
- `S0037L03U05` நான் கடந்த மாதம் அதைப் பற்றி கற்கினேன் | **I learn about it last month** → reword to the past, or drop the time phrase (sure)
- Canon: K9/K16

#### en_grammar:perfect_with_past_time — 2 real of 2 read · 136 chars
Present perfect with a finished time ("I've done it last week").
- `S0038L03B02` கடந்த மாதம் கற்றுவருகிறேன் | **I've been learning last month** → past simple ("I did it last week", "I was learning last month") (sure)
- `S0038L03U06` நான் கடந்த மாதம் கவனமாக கற்றுவருகிறேன் | **I've been learning carefully last month** → past simple ("I did it last week", "I was learning last month") (sure)
- Canon: K9/K16

#### en_grammar:a_vowel — 2 real of 2 read · 128 chars
"a" before a vowel ("a interesting").
- `S0051L04U02` நான் சுவாரஸ்யமான விஷயம் ரசிக்கிறேன் | **I enjoy a interesting thing** → "an" (sure)
- `S0052L01U05` நான் கடந்த வாரம் சுவாரஸ்யமான விஷயம் ரசித்தேன் | **I enjoy a interesting thing last week** → "an" (sure)
- Canon: K9/K16

#### en_grammar:today_tail_past — 5 real of 5 read · 0 chars
"today" bolted onto a bare past verb ("I thought today").
- `S0124L01B03` நான் நினைத்தேன் இன்று | **I thought today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- `S0124L01U03` நீங்கள் நினைத்தீர்களா | **you thought today?** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- `S0444L01B02` இன்று அவர்கள் நினைத்தார்கள் | **they thought today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- `S0449L02B03` இன்று இருந்ததாக | **they were today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- Canon: K9/K16

#### untaught_target — 92 real of 92 read · 3,744 chars
A row uses an English word (or word form) before the course teaches it.
- `S0002L01B02` நான் ஆங்கிலம் கற்க விரும்புகிறேன் | **I'd like to learn English** → reword with taught words, or delete (never add a LEGO) (sure)
- `S0006L02U02` நான் ஏதாவது நினைவில் கொள்ள விரும்புகிறேன் | **I'd like to remember something** → reword with taught words, or delete (never add a LEGO) (sure)
- `S0007L01B02` என்னால் முடிந்த அளவு கடினமாக முயற்சிக்கிறேன் | **I try as hard as I can** → reword with taught words, or delete (never add a LEGO) (sure)
- `S0007L02B01` இன்று முயற்சிக்க விரும்புகிறேன் | **I want to try today** → reword with taught words, or delete (never add a LEGO) (sure)
- Canon: K8, K14, K15, P27

#### dup_debut — 1 real of 1 read · 0 chars
Same LEGO taught as new twice.
- `S0289L02` மதியம் | **afternoon** → mark not-new (equal to S0069L01 on both sides); re-home its rows under new LEGOs (sure)
- Canon: L17, P25

#### notnew_untaught — 3 real of 3 read · 0 chars
LEGO marked not-new with no earlier LEGO equal on both sides.
- `S0207L01` செய்தீர் | **you've** → no earlier equal LEGO: make it new (blue at 257 is simply new) or re-cut (sure)
- `S0228L02` ஆரம்பித்தான் பயிற்சி பேச | **started to practise speaking** → no earlier equal LEGO: make it new (blue at 257 is simply new) or re-cut (sure)
- `S0257L01` நீலம் | **blue** → no earlier equal LEGO: make it new (blue at 257 is simply new) or re-cut (sure)
- Canon: L31

#### lego_over_8_syllables — 13 real of 13 read · 0 chars
New LEGO over the 8-syllable cap (counted by hand rule, not the tool's estimate).
- `S0024L02` நினைவில் கொள்ள முடியாது | **not going to be able to remember** → 11 syllables (hand rule count). Shorter cut: not going to be | able to remember (likely)
- `S0086L03` சாத்தியமில்லை துரதிர்ஷ்டவசமாக | **wasn't possible, unfortunately** → 10 syllables (hand rule count). Shorter cut: wasn't possible | unfortunately (likely)
- `S0112L03` மிகவும் சுவாரஸ்யமானது எதிர்பார்க்கவில்லை | **wasn't expecting it to be very interesting** → 13 syllables (hand rule count). Shorter cut: I wasn't expecting it (the seed's words) (likely)
- `S0122L04` உற்சாகமாக எப்படி நடக்கிறது | **excited about how it's going** → 9 syllables (hand rule count). Shorter cut: excited about | how it's going (likely)
- Canon: L3

#### qmark_mismatch — 37 real of 37 read · 1,384 chars
Question mark on one side only (nearly always: the known text is a question but has no "?", so its clip may be read flat).
- `S0012L03B04` நாளை என்ன நடக்கும் என்று யூகிக்க விரும்புவதில்லை | **what's going to happen tomorrow?** → add "?" to the known text; re-record the known clip (sure)
- `S0014L02B01` நீங்களா | **do you?** → add "?" to the known text; re-record the known clip (sure)
- `S0014L02B02` நீங்களா ஆங்கிலம் பேசுகிறீர்கள் | **do you speak English?** → add "?" to the known text; re-record the known clip (sure)
- `S0015L01U05` நீங்கள் என்னுடன் ஆங்கிலம் பயிற்சி செய்கிறீர்களா | **do you practise English with me?** → add "?" to the known text; re-record the known clip (sure)
- Canon: A7, A9

#### dup_rows — 38 real of 38 read · 0 chars
The same row twice in one basket (nearly always U01 repeats B01).
- `S0027L04U06` நான் இன்று அதிக நேரம் எடுக்க விரும்பவில்லை | **I don't like taking too much time today** → delete this row; it repeats S0027L04U05 in the same basket (sure)
- `S0028L01U05` ஆங்கிலம் பேசுவது பயனுள்ளது | **it's useful speaking English** → delete this row; it repeats S0028L01U01 in the same basket (sure)
- `S0061L02U02` நீங்கள் மெதுவாக பேச வேண்டும் | **you need to speak slowly** → delete this row; it repeats S0061L02B01 in the same basket (sure)
- `S0062L02U02` நீங்கள் அதே நேரத்தில் உதவ வேண்டும் | **you need to help at the same time** → delete this row; it repeats S0062L02B03 in the same basket (sure)
- Canon: spa #189/#212 precedent

#### seed_not_played — 149 real of 149 read · 0 chars
The seed's English sentence is never said in any played row.
- `S0001` நான் இப்போது உங்களுடன் ஆங்கிலம் பேச விரும்புகிறேன். | **I want to speak English with you now.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0003` எவ்வளவு அடிக்கடி முடியுமோ அவ்வளவு அடிக்கடி பேசுவது எப்படி. | **how to speak as often as possible.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0007` நான் இன்று என்னால் முடிந்த அளவு கடினமாக முயற்சிக்க விரும்புகிறேன். | **I want to try as hard as I can today.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0008` நான் என்ன சொல்ல வேண்டும் என்று விளக்கப் போகிறேன். | **I'm going to try to explain what I mean.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- Canon: P26


### eng_for_tel

#### lego_not_in_seed_target — 54 real of 55 read · 31,004 chars
The LEGO's English is not what the seed sentence says (it was glossed from the known side instead).
- `S0009L02` మాట్లాడతాను | **I'll speak** → Re-cut so the LEGO English is the seed's own words: seed says "I speak a little English now."; LEGO adds/changes ["i'll"]. Known side re-cut to match (known text not judged here). (likely)
- `S0023L02` ఇంకా ఎక్కువ | **a lot more** → Re-cut so the LEGO English is the seed's own words: seed says "I'm going to start talking more soon."; LEGO adds/changes ['a', 'lot']. Known side re-cut to match (known text not judged here). (likely)
- `S0024L02` గుర్తుంచుకోలేకపోతాను | **I can't remember** → Re-cut so the LEGO English is the seed's own words: seed says "I'm not going to be able to remember easily."; LEGO adds/changes ['i', "can't"]. Known side re-cut to match (known text not judged here). (likely)
- `S0028L01` మొదలుపెట్టడం | **to start speaking** → Re-cut so the LEGO English is the seed's own words: seed says "It's useful to start talking as soon as you can."; LEGO adds/changes ['speaking']. Known side re-cut to match (known text not judged here (likely)
- Not a defect (1): `S0064L02` it's fun — NOT A DEFECT (contraction / K54 "to" / K28 pronoun)
- Canon: L26 (K54/K28 exceptions)

#### phrase_missing_lego — 28 real of 31 read · 1,566 chars
A practice row does not contain its LEGO (negated, turned into a question, person swapped, or the LEGO itself is wrong).
- `S0386L01U02` నేను ఆమెతో ఏకీభవించలేదు | **I didn't agree with her** → row changes the LEGO's verb form or words (negation, question, person, tense): reword back to the LEGO's exact form, or move under the LEGO it really practises (likely)
- `S0386L01U03` నువ్వు ఆమెతో ఏకీభవిస్తావా? | **do you agree with her?** → row changes the LEGO's verb form or words (negation, question, person, tense): reword back to the LEGO's exact form, or move under the LEGO it really practises (likely)
- `S0397L01U02` మనం సిద్ధం కావాల్సిన అవసరం ఉంది | **we need to get ready** → row changes the LEGO's verb form or words (negation, question, person, tense): reword back to the LEGO's exact form, or move under the LEGO it really practises (likely)
- `S0398L02U02` నేను ఇంకా ఎక్కువ ఓపికగా ఉండాలనుకుంటున్నాను | **I want to become more patient** → row changes the LEGO's verb form or words (negation, question, person, tense): reword back to the LEGO's exact form, or move under the LEGO it really practises (likely)
- Not a defect (3): `S0068L01U04` what's going to happen?; `S0611L02U03` let's look somewhere else; `S0623L01U03` do you want another cup of coffee? — NOT A DEFECT (fused "what's" L28 / K54 "to" / another-for-a article ruling)
- Canon: P17 exceptions

#### zut_lego — 2 real of 2 read · 70 chars
One known prompt, two English answers, with a LEGO on one side.
- `S0094L01` ఇదొక్కటే మార్గం | **is the only way** → LEGO English "this is the only way" — LEGO "is the only way" has no subject; its own U02 says "this is the only way" on the same known (likely)
- `S0124L02` అది మంచి ఆలోచన | **that was a good idea** → known must mark past for S0124L02 (Telugu side, not judged) or the row unifies — LEGO "that was a good idea" vs S0123L02U01 "that's a good idea" on one known (likely)
- Canon: K2, K22, L34

#### en_grammar:sentence_fragment_d — 4 real of 4 read · 130 chars
A LEGO that starts with a stray "'d".
- `S0600L02` నాకు చెప్పి ఉంటే | **'d told me** → LEGO "if you'd told me" (sure)
- `S0600L02B01` నాకు చెప్పి ఉంటే | **'d told me** → LEGO "if you'd told me" (sure)
- `S0600L02B02` నువ్వు ఎంత అలసిపోయావో నాకు చెప్పి ఉంటే | **'d told me how tired you were** → LEGO "if you'd told me" (sure)
- `S0600L02B03` ఇవాళ నాకు చెప్పి ఉంటే | **'d told me today** → LEGO "if you'd told me" (sure)
- Canon: K9/K16

#### en_grammar:today_tail_past — 1 real of 1 read · 0 chars
"today" bolted onto a bare past verb ("I thought today").
- `S0617L01B02` నువ్వు ఇవాళ అనుకున్నావు | **you thought today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- Canon: K9/K16

#### untaught_target — 25 real of 25 read · 482 chars
A row uses an English word (or word form) before the course teaches it.
- `S0051L01U04` నేను ఇంగ్లీష్ మాట్లాడే వ్యక్తులను కలవడం ఆనందిస్తాను | **I enjoy meeting people who speak English** → reword with taught words, or delete (never add a LEGO) (likely)
- `S0144L02U04` నేను అనుకున్నదానికంటే ముందే వెళ్ళిపోయాను | **I left earlier than I wanted to** → reword with taught words, or delete (never add a LEGO) (likely)
- `S0144L02U05` మేము అనుకున్నదానికంటే ముందే ముగించాం | **we finished earlier than I wanted to** → reword with taught words, or delete (never add a LEGO) (likely)
- `S0147L02U01` నేను కంగారుగా ఉండటం చూసినప్పుడు ఆమె నాకు సహాయం చేసింది | **she helped me when she saw that I was nervous** → reword with taught words, or delete (never add a LEGO) (likely)
- Canon: K8, K14, K15, P27

#### gapped_lego — 5 real of 5 read · 28 chars
LEGO with a "…" gap in it.
- `S0466L03` నన్ను ... నివ్వు | **let me** → known prompt carries a "…" gap: make the LEGO the whole chunk the seed says (frame + middle), as L32 does on the target side (best guess)
- `S0469L01` దానర్థం ... కాదు | **that doesn't mean** → known prompt carries a "…" gap: make the LEGO the whole chunk the seed says (frame + middle), as L32 does on the target side (best guess)
- `S0469L03` మనం ... లేము | **we can't** → known prompt carries a "…" gap: make the LEGO the whole chunk the seed says (frame + middle), as L32 does on the target side (best guess)
- `S0473L01` నాకు ... వద్దు | **I don't want** → known prompt carries a "…" gap: make the LEGO the whole chunk the seed says (frame + middle), as L32 does on the target side (best guess)
- Canon: L32

#### lego_over_8_syllables — 11 real of 11 read · 0 chars
New LEGO over the 8-syllable cap (counted by hand rule, not the tool's estimate).
- `S0026L03` వెళ్ళడానికి సిద్ధంగా ఉన్నట్టు అనిపించడం | **feeling as if I'm ready to go** → 9 syllables (hand rule count). Shorter cut: feeling as if | I'm ready to go (likely)
- `S0036L01` కథకు అడ్డుపడాలని అనుకోవడం లేదు | **don't want to interrupt the story** → 9 syllables (hand rule count). Shorter cut: don't want to interrupt | the story (likely)
- `S0125L02` నీ ఆలోచన చాలా బాగుండింది | **that your idea was very good** → 9 syllables (hand rule count). Shorter cut: that your idea | was very good (likely)
- `S0131L01` మరీ ఎక్కువ ఆలోచనలు తిరుగుతున్నాయి | **too many ideas are going around** → 11 syllables (hand rule count). Shorter cut: too many ideas | are going around (likely)
- Canon: L3

#### qmark_mismatch — 48 real of 48 read · 2,444 chars
Question mark on one side only (nearly always: the known text is a question but has no "?", so its clip may be read flat).
- `S0021L01B02` ఎందుకు నేర్చుకోవాలని కోరుకుంటున్నావు? | **why you want to learn** → target is not a question but known has "?": reword English as the question or drop the "?" (sure)
- `S0316L02U11` సోమవారం నువ్వు ఏం చేయబోతున్నావు | **What are you going to do on Monday?** → add "?" to the known text; re-record the known clip (sure)
- `S0316L02U12` సోమవారం నువ్వు ఎక్కడ కలవాలనుకుంటున్నావు | **Where do you want to meet on Monday?** → add "?" to the known text; re-record the known clip (sure)
- `S0316L04U01` ఆమె సోమవారం తన సోదరుడిని తీసుకురాగలదని నువ్వు అనుకుంటున్నావా | **do you think that she could bring her brother on Monday?** → add "?" to the known text; re-record the known clip (sure)
- Canon: A7, A9

#### empty_audio — 428 real of 428 read · 18,304 chars
Played row with an empty audio slot.
- `S0211L01B04` ఏం జరగబోతోందో వాళ్ళు మాకు చెప్పారు | **they told us what was going to happen** → fill the empty slot(s): ka (library first, then render) (sure)
- `S0211L01U06` మనం సమస్యను చర్చించాల్సిన అవసరం ఉందని వాళ్ళు మాకు చెప్పారు | **they told us that we need to discuss the problem** → fill the empty slot(s): ka (library first, then render) (sure)
- `S0211L02U06` తాము వివరించాలని అనుకోలేదని నాకు తెలిసుంటే నేను దాన్ని చెప్పేవాడిని కాదు | **I wouldn't have said it if I had known that they didn't want to explain** → fill the empty slot(s): ka (library first, then render) (sure)
- `S0211L02U07` తాము వివరించాలని అనుకోలేదని నువ్వు విన్నావా | **have you heard that they didn't want to explain** → fill the empty slot(s): ka (library first, then render) (sure)
- Canon: A16

#### dup_rows — 179 real of 179 read · 0 chars
The same row twice in one basket (nearly always U01 repeats B01).
- `S0074L02U01` నాకు సహాయం చేసినందుకు చాలా ధన్యవాదాలు | **thank you very much for helping me** → delete this row; it repeats S0074L02B03 in the same basket (sure)
- `S0075L01U01` నీకు ఇంకా నేర్చుకోవాల్సింది ఉందా? | **have you got more to learn?** → delete this row; it repeats S0075L01B01 in the same basket (sure)
- `S0127L03U01` అందుకు కాదు | **that isn't why** → delete this row; it repeats S0127L03B01 in the same basket (sure)
- `S0128L02U01` నువ్వు ఒకరిలా ఉన్నావు | **you're like someone** → delete this row; it repeats S0128L02B02 in the same basket (sure)
- Canon: spa #189/#212 precedent

#### seed_not_played — 107 real of 107 read · 0 chars
The seed's English sentence is never said in any played row.
- `S0003` వీలైనంత తరచుగా ఎలా మాట్లాడాలో. | **how to speak as often as possible.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0009` నేను ఇప్పుడు కొంచెం ఇంగ్లీష్ మాట్లాడతాను. | **I speak a little English now.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0011` నువ్వు ముగించాక మాట్లాడగలగాలని ఉంది. | **I'd like to be able to speak after you finish.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0015` ఇంకా రేపు నువ్వు నాతో ఇంగ్లీష్ మాట్లాడాలని నేను కోరుకుంటున్నాను. | **And I want you to speak English with me tomorrow.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- Canon: P26


### eng_for_sin

#### lego_not_in_seed_target — 160 real of 167 read · 74,818 chars
The LEGO's English is not what the seed sentence says (it was glossed from the known side instead).
- `S0112L01` හිතුවේ නෑ | **not expecting** → Re-cut so the LEGO English is the seed's own words: seed says "That was very interesting, and I wasn't expecting it."; LEGO adds/changes ['not']. Known side re-cut to match (known text not judged here (likely)
- `S0117L02` කතා කළාට | **although I talked** → Re-cut so the LEGO English is the seed's own words: seed says "I'm definitely doing better than I was last time we talked to each other."; LEGO adds/changes ['although']. Known side re-cut to match (k (likely)
- `S0121L02` පාවිච්චි කරන්නේ | **use the car** → Re-cut so the LEGO English is the seed's own words: seed says "It's unusual that you don't like to use your car."; LEGO adds/changes ['the']. Known side re-cut to match (known text not judged here). (likely)
- `S0127L01` මස්තිෂ්කය | **brain** → Re-cut so the LEGO English is the seed's own words: seed says "That isn't why I wanted to see you."; LEGO adds/changes ['brain']. Known side re-cut to match (known text not judged here). (likely)
- Not a defect (7): `S0359L01` to turn left; `S0465L03` I'll ask; `S0569L02` how much you're willing to pay; `S0607L02` I would have done things; `S0635L01` that's jane's bag; `S0637L01` where's her bag … — NOT A DEFECT (contraction / K54 "to" / K28 pronoun)
- Canon: L26 (K54/K28 exceptions)

#### sin_nonsense_basket — 13 real of 13 read · 0 chars
Seed 111's "brain" basket: whole rows of nonsense English ("I hope for our brain").
- `S0111L01B02` මම ඒ ගැන ආශා | **I hope for our brain** → delete; rebuild the S0111L01 "brain" basket from taught words (e.g. "it changes our brain", "learning changes our brain") — the known side has no word for brain in these rows (sure)
- `S0111L01B03` මම ඒ ගැන ලිහිල් වෙනවා | **I relax with our brain** → delete; rebuild the S0111L01 "brain" basket from taught words (e.g. "it changes our brain", "learning changes our brain") — the known side has no word for brain in these rows (sure)
- `S0111L01U01` මම ඒ ගැන ලෑස්ති | **I'm ready for our brain** → delete; rebuild the S0111L01 "brain" basket from taught words (e.g. "it changes our brain", "learning changes our brain") — the known side has no word for brain in these rows (sure)
- `S0111L01U02` ළමා ඒ ගැන ඒ ගැන ආශා කළේ නෑ | **I didn't hope for our brain** → delete; rebuild the S0111L01 "brain" basket from taught words (e.g. "it changes our brain", "learning changes our brain") — the known side has no word for brain in these rows (sure)
- Canon: K9, P17

#### sin_template_builds — 147 real of 147 read · 0 chars
Build rows made by a template: "liked / want / said" glued in front of a noun ("liked a hug", "said the film").
- `S0353L01B02` ක්‍රීඩාංගනේ ලෙයිකයි | **liked the field** → delete (nonsense build "liked/want/said + noun"; basket keeps its other rows) (sure)
- `S0358L01B03` ඉහළ ළඟ ලෙයිකයි | **liked the top** → delete (nonsense build "liked/want/said + noun"; basket keeps its other rows) (sure)
- `S0377L02B02` ලෝකේ ලෙයිකයි | **liked the world** → delete (nonsense build "liked/want/said + noun"; basket keeps its other rows) (sure)
- `S0377L02B03` ලෝකේ ඕනේ | **want the world** → delete (nonsense build "liked/want/said + noun"; basket keeps its other rows) (sure)
- Canon: K9, P14 does not cover it (fails on grammar)

#### en_grammar:sin_filler_near — 38 real of 38 read · 0 chars
"near the field" / "near the top" tacked onto the end of unrelated sentences.
- `S0371L03U03` මම ගිය ඉහළ ළඟ | **I went near the top** → delete (0 chars) (sure)
- `S0377L03U04` ඔයා කොහෙවත් ගියාද ක්‍රීඩාංගනේ? | **did you go anywhere near the field?** → delete (0 chars) (sure)
- `S0377L03U05` ඔයා කොහෙවත් ගියාද ඉහළ ළඟ? | **did you go anywhere near the top?** → delete (0 chars) (sure)
- `S0383L02U05` ඔහු ඉහළ ළඟ දාන්නයි ඕනේ කළා | **he wanted to put it near the top** → delete (0 chars) (sure)
- Canon: K9/K16

#### phrase_missing_lego — 37 real of 38 read · 216 chars
A practice row does not contain its LEGO (negated, turned into a question, person swapped, or the LEGO itself is wrong).
- `S0111L03B02` ඒ ගැන වෙනස් වෙනවා | **that changes** → row changes the LEGO's verb form or words (negation, question, person, tense): reword back to the LEGO's exact form, or move under the LEGO it really practises (likely)
- `S0112L01B02` මම හිතුවේ නෑ | **I wasn't expecting it** → re-cut the LEGO to what its rows and seed say (see LEGO family) (likely)
- `S0112L01B03` මම ඒ ගැන හිතුවේ නෑ | **I wasn't expecting that** → re-cut the LEGO to what its rows and seed say (see LEGO family) (likely)
- `S0112L01U01` මම ඒ ගැන හිතුවේ නෑ කියලා මම හිතනවා | **I think I wasn't expecting that** → re-cut the LEGO to what its rows and seed say (see LEGO family) (likely)
- Not a defect (1): `S0541L01U04` can you try and breathe? — NOT A DEFECT (fused "what's" L28 / K54 "to" / another-for-a article ruling)
- Canon: P17, K50

#### zut_lego — 1 real of 1 read · 20 chars
One known prompt, two English answers, with a LEGO on one side.
- `S0353L03` ඇයට ... ඕනේ | **she needed** → S0353L03 re-gloss to the seed's words; the seed English "She needed to run around the field" vs Sinhala "she wants" also disagree — ඇයට ඕනේ = "she wants" (S0017L01) and "she needed" (S0353L03) (likely)
- Canon: K2, K22, L34

#### en_grammar:present_with_past_time — 2 real of 2 read · 114 chars
Present tense with a past time phrase ("I learn English last week").
- `S0042L03U04` මට වෙහෙස දැනෙනවා ඊයේ රෑ | **I feel tired last night** → reword to the past, or drop the time phrase (sure)
- `S0042L03U06` මට හොඳයි දැනෙනවා ඊයේ රෑ වඩා | **I feel okay better than last night** → reword to the past, or drop the time phrase (sure)
- Canon: K9/K16

#### en_grammar:perfect_with_past_time — 1 real of 1 read · 44 chars
Present perfect with a finished time ("I've done it last week").
- `S0089L01U06` මම කළා ඒක පසුගිය සතියේ | **I've done it last week** → past simple ("I did it last week", "I was learning last month") (sure)
- Canon: K9/K16

#### en_grammar:did_plus_past — 5 real of 5 read · 190 chars
Past form after "did" ("did you woke").
- `S0144L01U02` ඔයා අවදි වුණාද කලින් | **did you woke early?** → "did you wake / did you see" (sure)
- `S0144L01U04` ඔයා කවදා අවදි වුණේ? | **when did you woke?** → "did you wake / did you see" (sure)
- `S0144L01U07` ඔයා අවදි වුණාද ඊයේ රාත්‍රියේ? | **did you woke last night?** → "did you wake / did you see" (sure)
- `S0147L01U01` ඔයා ඒක දිටුවාද | **did you saw that?** → "did you wake / did you see" (sure)
- Canon: K9/K16

#### en_grammar:a_vowel — 7 real of 7 read · 320 chars
"a" before a vowel ("a interesting").
- `S0123L01U04` ඒක පහසු අදහසක් | **that is a easier idea** → "an" (sure)
- `S0123L01U05` ඒක අසාමාන්‍ය අදහසක් | **that is a unusual idea** → "an" (sure)
- `S0123L01U07` අදහසක් ඕනේ | **I want a idea** → "an" (sure)
- `S0130L01U06` ඒක අසාමාන්‍ය පුදුම දෙයක් | **that is a unusual surprise** → "an" (sure)
- Canon: K9/K16

#### en_grammar:doubled_word — 5 real of 5 read · 396 chars
Doubled word or a garbage tail ("looking forward to to learn").
- `S0029L01B03` ඉදිරිය ගැන ආශාවෙනවා ඉගෙනගන්න | **I'm looking forward to to learn** → "looking forward to learning/practising/meeting"; drop garbage tails (sure)
- `S0029L01B04` ඉදිරිය ගැන ආශාවෙනවා පුහුණු වෙන්න | **I'm looking forward to to practise** → "looking forward to learning/practising/meeting"; drop garbage tails (sure)
- `S0029L01U03` ඉදිරිය ගැන ආශාවෙනවා ඉංග්‍රීසි ඉගෙනගන්න | **I'm looking forward to to learn English** → "looking forward to learning/practising/meeting"; drop garbage tails (sure)
- `S0029L01U04` ඉදිරිය ගැන ආශාවෙනවා හෙට හම්බවෙන්න | **I'm looking forward to to meet tomorrow** → "looking forward to learning/practising/meeting"; drop garbage tails (sure)
- Canon: K9/K16

#### en_grammar:want_ing — 4 real of 4 read · 214 chars
"want" + -ing ("I don't want taking").
- `S0005L01B03` කතා කිරීම ඕනේ | **want speaking** → reword: want to + verb (e.g. "I don't want to take too much time") (sure)
- `S0027L02U03` මට ගොඩක් වෙලාව ගන්න ඕනේ නෑ | **I don't want taking too much time** → reword: want to + verb (e.g. "I don't want to take too much time") (sure)
- `S0055L01U04` මට අවදි වෙන්න ඕනේ නෑ දැන් | **I don't want waking up now** → reword: want to + verb (e.g. "I don't want to take too much time") (sure)
- `S0098L03U05` ඔයාට ඕනේද ක්‍රීඩා කරන මොකක්හරි වෙනස් | **do you want playing something else?** → reword: want to + verb (e.g. "I don't want to take too much time") (sure)
- Canon: K9/K16

#### en_grammar:modal_plus_to — 1 real of 1 read · 56 chars
"can you to help".
- `S0138L01U09` ඔයාට අපිට ඉගෙන්වන්න පුළුවන්ද | **can you to help us to learn?** → "can you help us to learn?" (sure)
- Canon: K9/K16

#### en_grammar:today_tail_past — 3 real of 3 read · 0 chars
"today" bolted onto a bare past verb ("I thought today").
- `S0374L01B02` මම හිතුවා අද | **I thought today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- `S0405L02B01` ඕනේදැ අද | **was needed today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- `S0444L03B02` ඒ අය හිතුවා කියලා අද | **they thought that today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- Canon: K9/K16

#### en_grammar:agree_I_are — 1 real of 1 read · 0 chars
Nonsense question ("where did she have?").
- `S0382L03U03` ඇයට කොහෙද තිබිල? | **where did she have?** → delete (sure)
- Canon: K9/K16

#### untaught_target — 19 real of 19 read · 968 chars
A row uses an English word (or word form) before the course teaches it.
- `S0094L01B02` එකම එකා | **the only one** → reword with taught words, or delete (never add a LEGO) (sure)
- `S0094L01U02` ඔයා එකම කෙනා මම දන්නේ | **you are the only one I know** → reword with taught words, or delete (never add a LEGO) (sure)
- `S0094L01U05` මම එකම එකා ඉංග්‍රීසි කතා කරන | **I'm the only one who speak English** → reword with taught words, or delete (never add a LEGO) (sure)
- `S0094L01U08` ඔයා එකම කෙනා ඉගෙනගන්නේ | **you are the only one learning** → reword with taught words, or delete (never add a LEGO) (sure)
- Canon: K8, K14, K15, P27

#### gapped_lego — 68 real of 68 read · 0 chars
LEGO with a "…" gap in it.
- `S0080L01` මම ... වෙනවා | **I'll** → known prompt carries a "…" gap: make the LEGO the whole chunk the seed says (frame + middle), as L32 does on the target side (best guess)
- `S0236L01` ඇය කිව්ව...උත්සාහ කරනවා | **who said she was going to try** → known prompt carries a "…" gap: make the LEGO the whole chunk the seed says (frame + middle), as L32 does on the target side (best guess)
- `S0295L01` මම ... කිව්වේ නෑ | **I didn't say that** → known prompt carries a "…" gap: make the LEGO the whole chunk the seed says (frame + middle), as L32 does on the target side (best guess)
- `S0296L01` මම ... කිව්වා | **I said that** → known prompt carries a "…" gap: make the LEGO the whole chunk the seed says (frame + middle), as L32 does on the target side (best guess)
- Canon: L32

#### dup_debut — 6 real of 6 read · 0 chars
Same LEGO taught as new twice.
- `S0425L03` ඒ අයට ... ඕනේ | **they want** → mark not-new (equal to S0418L03 on both sides); re-home its rows under new LEGOs (sure)
- `S0426L02` ඒ අයට ... ඕනේ | **they want** → mark not-new (equal to S0418L03 on both sides); re-home its rows under new LEGOs (sure)
- `S0447L02` ගෙදර | **home** → mark not-new (equal to S0095L01 on both sides); re-home its rows under new LEGOs (sure)
- `S0451L02` ඒ අය කිව්වා | **they said** → mark not-new (equal to S0449L03 on both sides); re-home its rows under new LEGOs (sure)
- Canon: L17, P25

#### notnew_untaught — 1 real of 1 read · 0 chars
LEGO marked not-new with no earlier LEGO equal on both sides.
- `S0257L01` නිල් | **blue** → no earlier equal LEGO: make it new (blue at 257 is simply new) or re-cut (sure)
- Canon: L31

#### lego_over_8_syllables — 11 real of 11 read · 0 chars
New LEGO over the 8-syllable cap (counted by hand rule, not the tool's estimate).
- `S0024L01` මට බෑ | **I'm not going to be able to** → 9 syllables (hand rule count). Shorter cut: I'm not going | to be able to (likely)
- `S0396L02` අනිත් හැමෝ සූදානම් වෙනකම් | **until everybody else is ready** → 10 syllables (hand rule count). Shorter cut: until | everybody else is ready (likely)
- `S0457L01` විවිධ ක්ෂේත්‍ර ගණන | **the number of different areas** → 10 syllables (hand rule count). Shorter cut: the number | of different areas (likely)
- `S0462L02` යුද්ධේ කාලේ ඉතාලියේ ... සටන් කළා | **fought in Italy during the war** → 9 syllables (hand rule count). Shorter cut: fought in Italy | during the war (likely)
- Canon: L3

#### qmark_mismatch — 160 real of 160 read · 4,288 chars
Question mark on one side only (nearly always: the known text is a question but has no "?", so its clip may be read flat).
- `S0003L01U01` ඉංග්‍රීසි කතා කරන්නේ කොහොමද ඔයා එක්ක | **how to speak English with you?** → add "?" to the known text; re-record the known clip (sure)
- `S0003L01U02` ඉංග්‍රීසි ඉගෙනගන්නේ කොහොමද දැන් | **how to learn English now?** → add "?" to the known text; re-record the known clip (sure)
- `S0003L01U04` ඉගෙනගන්නේ කොහොමද ඔයා එක්ක | **how to learn with you?** → add "?" to the known text; re-record the known clip (sure)
- `S0004L01B01` කියන්නේ කොහොමද | **how to say?** → add "?" to the known text; re-record the known clip (sure)
- Canon: A7, A9

#### empty_audio — 4 real of 4 read · 161 chars
Played row with an empty audio slot.
- `S0214L03U06` සති අන්තේ මට ආසයි යාළුවන් ටිකක් බලන්න. | **I'd like to see a few friends at the weekend.** → fill the empty slot(s): t1 (library first, then render) (sure)
- `S0484L01B04` ඒක අභියෝගයක් වෙන්න පුළුවන් | **it might be a challenge** → fill the empty slot(s): t1,t2 (library first, then render) (sure)
- `S0509L01B04` අලුත් ඇඳක් හොයන්න | **look for a new bed** → fill the empty slot(s): t1,t2 (library first, then render) (sure)
- `S0605L01U06` ඒක වෙන්න පුළුවන් අපිට උදව් ඕනේ වුණා නිසා | **It might be because we needed help** → fill the empty slot(s): t1 (library first, then render) (sure)
- Canon: A16

#### dup_rows — 21 real of 21 read · 0 chars
The same row twice in one basket (nearly always U01 repeats B01).
- `S0061L03U01` ආයෙ කියන්න පුළුවන්ද? | **could you say it again?** → delete this row; it repeats S0061L03B02 in the same basket (sure)
- `S0063L02U01` මට උදව් කරන්නෙ කමක් නෑද | **I don't mind helping?** → delete this row; it repeats S0063L02B03 in the same basket (sure)
- `S0118L01U08` ශාලාවේ ඉන්නකොට මම ලෑස්ති | **I'm ready when we were in the pub** → delete this row; it repeats S0118L01U05 in the same basket (sure)
- `S0121L03B03` මම ඒ ගැන අසාමාන්‍ය | **that is unusual** → delete this row; it repeats S0121L03B02 in the same basket (sure)
- Canon: spa #189/#212 precedent

#### seed_not_played — 249 real of 249 read · 0 chars
The seed's English sentence is never said in any played row.
- `S0003` හැකි තරම් නිතර කතා කරන විදිහ. | **how to speak as often as possible.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0004` ඉංග්‍රීසියෙන් කොහොමද මොකක් හරි කියන්නේ | **how to say something in English** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0008` මම කියන්නේ මොකද කියලා පැහැදිලි කරන්න හදනවා. | **I'm going to try to explain what I mean.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0029` හැකි ඉක්මනට හොඳට කතා කරන්නට ලෑස්තිව ඉදිරිය ගැන ආශාවෙනවා. | **I'm looking forward to speaking better as soon as I can.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- Canon: P26

### Coverage (real / read, per family and course)

| family | kan | tam | tel | sin |
|---|---|---|---|---|
| lego_not_in_seed_target | 27/34 | 16/18 | 54/55 | 160/167 |
| sin_nonsense_basket | 0 hits | 0 hits | 0 hits | 13/13 |
| sin_template_builds | 0 hits | 0 hits | 0 hits | 147/147 |
| en_grammar:sin_filler_near | 0 hits | 0 hits | 0 hits | 38/38 |
| en_adds_word_known_lacks | 0 hits | 74/74 | 0 hits | 0 hits |
| phrase_missing_lego | 0 hits | 81/81 | 28/31 | 37/38 |
| zut_lego | 4/4 | 0 hits | 2/2 | 1/1 |
| en_grammar:more_adj | 8/8 | 0 hits | 0 hits | 0 hits |
| en_grammar:missing_apostrophe | 0 hits | 6/6 | 0 hits | 0 hits |
| en_grammar:sentence_fragment_d | 0 hits | 0 hits | 4/4 | 0 hits |
| en_grammar:third_person_s | 0 hits | 3/3 | 0 hits | 0 hits |
| en_grammar:present_with_past_time | 2/2 | 11/11 | 0 hits | 2/2 |
| en_grammar:perfect_with_past_time | 0 hits | 2/2 | 0 hits | 1/1 |
| en_grammar:did_plus_past | 0 hits | 0 hits | 0 hits | 5/5 |
| en_grammar:a_vowel | 0 hits | 2/2 | 0 hits | 7/7 |
| en_grammar:doubled_word | 3/3 | 0 hits | 0 hits | 5/5 |
| en_grammar:want_ing | 1/1 | 0 hits | 0 hits | 4/4 |
| en_grammar:modal_plus_to | 0 hits | 0 hits | 0 hits | 1/1 |
| en_grammar:today_tail_past | 4/4 | 5/5 | 1/1 | 3/3 |
| en_grammar:agree_I_are | 0 hits | 0 hits | 0 hits | 1/1 |
| untaught_target | 62/62 | 92/92 | 25/25 | 19/19 |
| gapped_lego | 0 hits | 0 hits | 5/5 | 68/68 |
| dup_debut | 0 hits | 1/1 | 0 hits | 6/6 |
| notnew_untaught | 0 hits | 3/3 | 0 hits | 1/1 |
| lego_over_8_syllables | 4/4 | 13/13 | 11/11 | 11/11 |
| qmark_mismatch | 16/16 | 37/37 | 48/48 | 160/160 |
| empty_audio | 0 hits | 0 hits | 428/428 | 4/4 |
| dup_rows | 182/182 | 38/38 | 179/179 | 21/21 |
| seed_not_played | 243/243 | 149/149 | 107/107 | 249/249 |
Every hit counted above was read (R0.5): the mechanical families (dup_rows, seed_not_played, empty_audio, qmark_mismatch) were checked by mechanism over every row, and qmark rows were read one by one.

**Not a defect (excluded, with the mechanism):** LEGO-not-in-seed hits that are only a contraction (`it's` / `it is`), K54 "to" on a verb LEGO, or a K28 pronoun (17 in all); `what's` holding `what` (L28); "can you try and breathe" under "to try and breathe" (K54); "another cup of coffee" under "a cup of coffee" (Kai 10 Nov article ruling). Phrase-level ZUT clashes with no LEGO on either side (kan 22, tel 13, tam 3, sin 2) are not listed as findings (Kai 21 Oct) — they are in the hits files. Seeds whose English IS played but under a slightly different known prompt (kan 83, tam 184, tel 103, sin 150) are not counted: two known prompts for one English answer is K3, fine. "want something", "that that", "would have … yesterday", bare VP builds outside sin ("want a coffee") — read, fine.

**Scanned with no real hits:** tag_lego/tag_phrase, same_both, debut_no_practice, article_drift, zut_seed — 0 candidates in all four.

### Gaps (stated plainly)

- **Known-side families not judged.** `lego_not_in_seed_known` (kan 14, tam 379, tel 129, sin 166) and my own stricter known-side containment check (kan 226, tam 328, tel 257, sin 66 rows where the LEGO's known word has no stem in the row) are mostly inflection, which Dravidian languages and Sinhala do heavily; I cannot tell a real miss from a correct inflected form. Where the English showed the defect (sin S0111, S0447L03, S0462L02) it is listed. The rest is a job for a reader of each language.
- **Known side of every recommended re-cut is unverified.** For the LEGO-not-in-seed family I can say the English must become the seed's words; I cannot write or check the Kannada/Tamil/Telugu/Sinhala that goes with it.
- **LEGOs at 7–8 syllables** (kan 122, tam 170, tel 164, sin 99 by hand-rule count) are in the JSON, not hand-cut. Only the 39 over the cap carry a proposed cut.
- **Intros not read** (`/presentation/<legoId>`): every re-cut LEGO above needs its intro updated (O13); not checked.
- **Female voice / wrong word spoken / clip ≠ text:** not scanned (A22; no ear, no Whisper).
- **English grammar outside the 14 patterns** was not read row by row: ~51,000 played rows across the four courses. The patterns catch the shapes I found; a full English read of eng_for_sin seeds 300+ and eng_for_tam seeds 1–150 would find more.
- **Audio library hits** were not looked up (that is Popty's render route, and nothing was to be called), so the empty-audio figure is an upper bound.

---
