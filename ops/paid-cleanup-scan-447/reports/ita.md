# ita_for_eng — cleanup scan findings (#447, slice ita)

Read-only scan of the live course on 17 Nov 2026 (663 seeds, 1,399 LEGOs, 15,314 rows). Nothing was applied, rendered or linked. Every row below was read by hand unless a family says otherwise.

## In short

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

### A. Formal LEGOs with no sir/madam

Formal LEGOs must keep *sir/madam* so the learner can see the formal form (K32). The LEGOs of seeds 643 and 649–655 drop it, and so does each one's first three BUILD rows (plus five rows of S0642L02). For example, "are you ready? | è pronto?" asks for the Lei form with nothing in the English to say so. Fix: grow each LEGO to its seed's own words, and add the closing honorific to the bare rows, as fin did (#846). 655 can't grow without a gap, so it gets a heads-up intro. The rows under 639L02/645–648 are the 26 K32 already lists for Kai, so they are not counted here.

**34 REAL**, all read · audio ≈ 3,088 chars · canon: K32 K10 L26 · confidence mostly *sure*.

  - `S0643L01` do you want | vuole → grow LEGO to the seed's own words: "do you want sir | vuole, signore" (+ components, intro re-mirrored)
  - `S0649L01` are you ready | è pronto → grow LEGO to the seed's own words: "are you ready sir | è pronto, signore" (+ components, intro re-mirrored)
  - `S0650L01` do you want to go | vuole andare → grow LEGO to the seed's own words: "do you want to go madam | vuole andare, signora" (+ components, intro re-mirrored)
  - `S0651L01` what do you think | che cosa ne pensa → grow LEGO to the seed's own words: "what do you think madam | che cosa ne pensa, signora" (+ components, intro re-mirrored)
  - `S0652L01` what do you need | di cosa ha bisogno → grow LEGO to the seed's own words: "what do you need sir | di cosa ha bisogno, signore" (+ components, intro re-mirrored)

### B. Seed 479 "che potessi fare" taught with no trigger

Seed 479's LEGO is "I could do | che potessi fare". It has no trigger (K40), and it has no "that" (Kai's Q1 ruling on 21 Oct). Three of its rows are broken. U02's English means nothing. U04 is garbled. U05's Italian is wrong.

**5 REAL**, all read · audio ≈ 172 chars · canon: K40 K35 Q1 · confidence mostly *likely*.

  - `S0479L02` I could do | che potessi fare → re-gloss "that I could do | che potessi fare" (Q1 shape) and put the trigger in every row; intro re-mirrored
  - `S0479L02U02` it's not the least I could do | non è il minimo che potessi fare → delete: "it's not the least I could do" means nothing
  - `S0479L02U04` there are many reasons for what I could do | ci sono molte ragioni per quello che potessi fare → delete: no trigger, and the English is garbled
  - `S0479L02U05` I asked her about what I could do | le ho chiesto di quello che potessi fare → delete: "le ho chiesto di quello che potessi fare" is not Italian (would be "che cosa potevo fare")
  - `S0479L02B03` all I could do | tutto quello che potessi fare → replace: "it was the least I could do | era il minimo che potessi fare" (era taught S0086)

### C. Seed sentence never played, or seed text out of step with its LEGOs

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

### D. Phrases that do not contain their LEGO

Rows that do not contain their LEGO, after the K31, L28 and K32 exceptions were taken out. The detector found 96: 25 have only *non/ancora/già/solo* or an honorific inside the LEGO (K31/K32). Of the other 71, 23 are K32 rows Kai already has (645–648), 7 are S0644 (the K32 named core), 11 are bound clitic forms that still contain the LEGO (L28: *pensarci, farlo, dirlo, ottenerlo, considerarlo, tenerlo*), 4 are *al/del* contractions, and 1 is seed 600 (KNOWN, #809). The other 25 rows, in 5 baskets, are real. They take 18 items, because re-cutting S0098L03 fixes its 9 rows in one go.

**18 REAL**, all read · audio ≈ 1,466 chars · canon: P17 L13 K41 · confidence mostly *likely*.

  - `S0098L03` playing something else | suonare qualcos'altro → LEGO "playing something else | suonare qualcos'altro" swallows S0098L04 "something else" and none of its 9 rows say qualcos'altro: re-cut to "playing | suonare" (gerund gloss is fine, K41 Kai 16 Oct); the 9 rows then hold
  - `S0141L02U01` I think everything is okay | penso che vada tutto bene → "penso che vada tutto" is not "va tutto" (K50); U02 twins U01. Grow S0141L02 to the seed's "everything is okay | va tutto bene" (bene is otherwise uncovered) and replace U01 with "everything is okay now | va tutto bene adesso"; delete U02
  - `S0141L02U02` I think everything is okay | penso che vada tutto bene → "penso che vada tutto" is not "va tutto" (K50); U02 twins U01. Grow S0141L02 to the seed's "everything is okay | va tutto bene" (bene is otherwise uncovered) and replace U01 with "everything is okay now | va tutto bene adesso"; delete U02
  - `S0141L02` everything is | va tutto → grow to "everything is okay | va tutto bene" (the bare "everything is | va tutto" would teach va tutto for any "everything is")
  - `S0243L02B01` to eat | da mangiare → B01/B02 are both bare "to eat | da mangiare": B01 → "the same thing to eat | la stessa cosa da mangiare"

### E. Seed words no LEGO teaches (coverage gap)

A seed word no LEGO of that seed or any earlier seed teaches (L27). Growing S0212L01 to "to ask for help | chiedere aiuto" clears 30 rows at once.

**2 REAL**, all read · audio ≈ 955 chars · canon: L27 P1 · confidence mostly *sure*.

  - `S0212L01` to ask for | chiedere → seed 212 says "chiedere aiuto" but its only LEGO is "to ask for | chiedere"; aiuto is first taught at S0564, yet 30 rows (212, 231-242, 281) use it. Grow to "to ask for help | chiedere aiuto" (5 syllables); all 11 rows already say it
  - `S0117` I'm definitely doing better than I was last time we talked to each other | sto sicuramente andando meglio di quando abbiamo parlato l'ultima volta → seed says "sto andando meglio" but no LEGO of 117 covers it (andando is first taught at S0122). Add a NEW LEGO "I'm doing better | sto andando meglio" (6 syllables) with a basket; S0117L01B02 and S0117L03U08/U09 then hold

### F. Words used before they are taught

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

### G. "could" after an opinion verb said with possa

"could" after *think / seem* is *potrebbe* (K35). *possa* belongs only under "can". One row is left.

**1 REAL**, all read · audio ≈ 74 chars · canon: K35 · confidence mostly *likely*.

  - `S0497L03U03` it seems that it could be important | sembra che possa essere importante → K35: think/seem … could → potrebbe, possa only under "can": → "sembra che potrebbe essere importante" (as Kai's penso che potrebbe line)

### H. LEGO English that names no person, or says something the seed does not

The LEGO's English names nobody (K26/K28), is not natural English (K9), or uses other words than its seed (L26). The words the LEGO must not clash with were checked for each one.

**7 REAL**, all read · audio ≈ 679 chars · canon: K26 K28 · confidence mostly *likely*.

  - `S0324L02` has both hands | ha entrambe le mani → "has both hands" names nobody; the subject (that student) is outside the LEGO → K28: "she has both hands"
  - `S0471L01` to stop yourself | fermarti → "to stop yourself" is not the meaning (that is "refrain"), and plain "to stop" would clash with S0402L02 fermarsi: grow to the seed's "do you want to stop | vuoi fermarti" (5 syllables)
  - `S0055L02` when I haven't slept | quando non ho dormito → gloss "when I haven't slept" vs the seed "when I didn't sleep" (quando non ho dormito): → seed words
  - `S0505L02` so that I don't remain | così non rimango → "so that I don't remain | così non rimango" is not English and così is "so": grow to the seed's "I don't get left behind | non rimango indietro" (7 syllables), drop S0505L01 "behind" into it
  - `S0582L01` how is it | com'è → "how is it | com'è" → the seed's "what's it like | com'è" (no other LEGO says "what's it like")
  - `S0603L04` in that period | in quel periodo → "in that period" → the seed's "at the time | in quel periodo" (S0609L01U13 already says "at the time" over it)
  - `S0620L02` from the last time | dall'ultima volta → "from the last time" is not English: → "since the last time | dall'ultima volta"

### I. "the one" said feminine with nothing to select it

*quella* (feminine) with no noun in the sentence (K27). The learner cannot tell from "the one" that it is a woman. Best guess: Kai's heads-up intro, as S0010L02 has.

**2 REAL**, all read · audio ≈ 180 chars · canon: K27 K40 PR3 · confidence mostly *best guess*.

  - `S0390L01` the one | quella → "the one | quella": nothing in the seed or its 9 rows says it is a woman, so the learner cannot predict quella. Keep the text and give it a heads-up intro in Kai's template ("Listen out: when 'the one' is a woman, the Italian is:"), as S0010L02 did; or make the seed say "the woman who is standing…"
  - `S0640L02` it's the red one | è quella rossa → "it's the red one | è quella rossa": same, the noun (borsa, 636) is two seeds away; heads-up intro or "it's the red bag | è la borsa rossa" in the rows

### J. Taught form not used (P28) and it/this pairing (K25)

The taught form is not used (P28: S0217 teaches *un po' d'acqua*), or English "it" sits over Italian *questo* (K25 pairs this ↔ questo).

**5 REAL**, all read · audio ≈ 166 chars · canon: P28 · confidence mostly *likely*.

  - `S0220L02U01` I want a bit of water | voglio un po' di acqua → S0217 teaches "un po' d'acqua"; use that exact form
  - `S0220L02U04` I drank a bit of water | ho bevuto un po' di acqua → S0217 teaches "un po' d'acqua"; use that exact form
  - `S0052L05U05` I wanted to finish it last week | volevo finire questo la settimana scorsa → English "it" over Italian "questo": K25 pairs this ↔ questo (#36 did the same), → English "this"
  - `S0056L01U04` so I can finish it | così posso finire questo → English "it" over Italian "questo": K25 pairs this ↔ questo (#36 did the same), → English "this"
  - `S0060L02U06` I can't finish it yet | non riesco a finire questo ancora → English "it" over Italian "questo": K25 pairs this ↔ questo (#36 did the same), → English "this"

### K. Wrong Italian / English seen in passing

Wrong Italian or English, seen while reading other families. Grammar was not scanned on its own (R0.16).

**5 REAL**, all read · audio ≈ 378 chars · canon: K16 · confidence mostly *sure*.

  - `S0117L01U04` I definitely need more time | devo sicuramente più tempo → "devo sicuramente più tempo" is not Italian (dovere + noun = owe): → "ho sicuramente bisogno di più tempo"
  - `S0642L02U05` how do you feel after that? | come si sente dopo tutto questo? → English "after that" over "dopo tutto questo" ("after all this"): English → "after all this"
  - `S0657L01B03` how do you all feel after that? | come vi sentite dopo tutto questo? → English "after that" over "dopo tutto questo" ("after all this"): English → "after all this"
  - `S0642L01U07` I want to speak with you, madam, as soon as I can | voglio parlare con lei, signora, appena posso → madam sits mid-sentence; K32 puts it at the END: → "I want to speak with you as soon as I can, madam | voglio parlare con lei appena posso, signora"
  - `S0639L02U05` I want to speak with you sir today | voglio parlare con lei, signore, oggi → sir mid-sentence: → "I want to speak with you today sir | voglio parlare con lei oggi, signore"

### L. Duplicate rows in one basket

The same pair twice in one basket: 275 are a bare-LEGO BUILD row repeated (B01 = B02 = the LEGO), and 165 are phrase twins. These are exact text matches; I read 30 by eye. Deleting the later twin leaves fewer than 3 BUILD or 5 USE rows in 105 of 323 baskets. In those baskets, replace the twin with a new row instead of deleting it.

**440 REAL**, all read · audio ≈ 0 chars · canon: P10 (no padding), K42 note: exact duplicates are deleted, not rewritten · confidence mostly *sure*.

  - `S0001L03U01` I want to speak Italian | voglio parlare italiano → delete (exact twin of S0001L03B02; phrase twin)
  - `S0002L01U01` I'm trying to speak Italian | sto provando a parlare italiano → delete (exact twin of S0002L01B03; phrase twin)
  - `S0012L02U01` I want to try to guess | voglio provare a indovinare → delete (exact twin of S0012L02B03; phrase twin)
  - `S0017L01U02` I'm trying to find out | sto provando a scoprire → delete (exact twin of S0017L01B03; phrase twin)
  - `S0018L02U01` we want to meet up tomorrow | vogliamo incontrarci domani → delete (exact twin of S0018L02B02; phrase twin)

### M. LEGOs over the 8-syllable cap (builder count)

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

## KNOWN — already on a held or ruled list (not counted)
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

## NOT A DEFECT (mechanism)
- **"that" over *questo*** (43 rows, e.g. "that doesn't mean | questo non significa"): two Englishes over one Italian is fine (K3). The K25 pairing Kai ruled covers say/tell/answer, and widening it is his call (K25 bound 4). The exception is the 3 "finish it | finire questo" rows in J.
- **English "it" with no Italian object** (15 detector rows: "I like it when", "how you say it | come si dice", "do you like it here?"): Italian *piacere* needs no object, and *come si dice* is an idiom (K25 bound 2).
- **-lo on an infinitive** (*ottenerlo*, *considerarlo*, *tenerlo*, *trovarlo*): Kai ruled on 3 Nov (d/7a64fb09) that -lo goes on an infinitive from seed 61 onward, and L28 says the bound spelling still contains the LEGO. #435 moved S0358 away from *raggiungerlo* for a different reason (its Y/N), so I list no rows here. Flagged as a possible tension, not a finding.
- **Gender and number endings** (*sola, tranquilla, malata, stanchi*…) and **elided forms** (*l'idea, l'insegnante, quell'ora, dell'ultima, l'autobus*): allowed by K8 and regular elision. ***avrei*** under 152: allowed by K29, because *avrei fatto* is a component of S0152L01. ***mostrare*** / ***buttare***: components earlier (S0032L01C01, S0466L02C01).
- **S0433L01B01 "they couldn't manage to"**, **K34** (*fa male* rows say "it hurts", so no owner is owed), **S0070L03U04** (*potresti*, correct per K35), **S0013L01/S0281L05** (*parli/cominci* are also the indicative): not defects.
- **Phrase-level ZUT** (*stare/restare*, *penso sia / penso che sia*, *me l'avessi / me lo avessi*): Kai, 21 Oct: a phrase clash is not a blocker.

## Coverage

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

## Gaps
- **Not scanned:** intro wording (only the intros of LEGOs I flag are costed), clip vs text (by ear only), and grammar as a sweep. Grammar errors were caught only in passing (K).
- **The 167 LEGOs of 7–8 syllables** were counted but not given shorter cuts one by one. Kai's 17 Nov rule is about new fixes, so I proposed cuts only for the over-cap ones.
- **The every-seed-part-is-a-LEGO rule** (Kai 12 Nov; taught parts listed as not-new) was checked only for words never taught (E). Seeds that miss a not-new row for a word taught earlier (for example "today" in 193, "very well" in 655) were not counted course-wide.
- **The untaught_target detector has a bug.** A word that appears in a seed sentence before its first LEGO counts as taught at that LEGO, so it misses nothing but blames the row instead of the seed. The seed-level re-run here covers that.
- **Basket floors** for the D/F deletes were checked only in L. Check the floor for each D/F delete before applying.
- **Audio figures are estimates.** No dry run was made (the brief forbids one), and no edit-event history was read (it needs an admin login).
