# x_for_jpn / x_for_zho — cleanup scan findings (#447 wave 2, #481)

Courses: **spa_for_jpn, spa_for_zho, fra_for_jpn, fra_for_zho, deu_for_jpn, deu_for_zho, ita_for_jpn, ita_for_zho** (seeds 1–300).
All read live through Popty's script view on 17 Nov 2026. **Nothing was changed, rendered or sent.**
Every row is in `x-for-jpn-zho.json` next to this file (course, family, row id, known, target, verdict, fix, confidence, source, canon, chars). New patterns are in `x-for-jpn-zho.patterns.json`.
Audio cost = new target text × 2 voices + new known text × 1, only for the sides that change. Deletes, flag flips and relinks cost 0. Figures are estimates from the current text length.

## Headline

1. **All four Chinese-known courses tell the learner to speak Chinese.** The Chinese prompt says 中文 ("Chinese") where it means French, German, Italian or Spanish: "我现在想和你说中文 | Je veux parler français avec toi maintenant". The same course already says 法语 / 德语 / 意大利语 / 西班牙语 in hundreds of other rows. fra_for_zho has 295 such rows, deu_for_zho 237, ita_for_zho 202 and spa_for_zho 32. The fix is on the known side only, about 7,300 chars. **sure.**
2. **spa_for_zho: 311 practice rows end with a stray "aquí"** that the Chinese prompt never says, for example "我需要一个答案 | necesito una respuesta aquí". Another 17 rows end with a stray "así" or "antes". These are mostly in seeds 175–300, and about 17,000 chars.
3. **Italian for Japanese/Chinese uses "andare a + infinitive" as a "going to" future** ("Non vado a riuscire a ricordare", "Lui va a chiederti domani"). In Italian this only means physically going somewhere. 117 rows in ita_for_jpn and 36 in ita_for_zho, about 10,400 chars. **sure.**
4. **The Spanish variants still have the spa_for_eng fixes from Deborah's and Kai's passes undone**: practicar + infinitive, *definitivamente*, *pensar que* for "think", *sentirse más fácil*, *me vio sintiéndome*, *tomar tiempo para*, *disfrutar* + infinitive, *seguro si*. These are about 620 rows across the two courses.
5. **German for Japanese drops the reflexive in "erinnern"** ("ein Wort erinnern"). 55 rows, about 3,800 chars. deu_for_eng fixed these at seeds 6, 10, 24 and 56.
6. **The Chinese-known courses teach bare Chinese words that stand for several target forms**: 知道 = savoir / savait / savons, 必须 = muss / müssen / musstest. That is 33–35 LEGO clashes per course. Each course also has 28–60 LEGOs marked "not new" that were never taught.
7. **Every variant has many seed sentences that are never practised as a played row.** The counts are 28–105 per course, against 6 of 300 in spa_for_eng (P26).

| course | REAL rows (new) | new audio chars (≈) | not a defect / known / candidate (not counted) |
|---|---|---|---|
| spa_for_jpn | 423 (+57 that follow from one root item) | 30,400 | 76 |
| spa_for_zho | 650 | 31,000 | 142 |
| fra_for_jpn | 158 | 2,900 | 87 |
| fra_for_zho | 462 | 3,900 | 117 |
| deu_for_jpn | 260 | 8,600 | 79 |
| deu_for_zho | 511 | 3,700 | 67 |
| ita_for_jpn | 289 | 12,600 | 148 |
| ita_for_zho | 442 | 6,400 | 91 |
| **total** | **3,195** | **≈ 99,700** | |

Seeds-never-practised rows (523 in total) are counted as REAL at 0 chars, because the seed's own clips can be relinked.

A suggested order:
- First, the *known says Chinese* family (known side only and mechanical).
- Then *stray aquí* and *andare a*.
- Then the Spanish fixes copied from spa_for_eng.
- Then *erinnern*.
- Then the LEGO-level items: clashes, not-new LEGOs and LEGOs left behind.

---

## spa_for_jpn

**Fixed in spa_for_eng, still live here (read every hit):**

| family | REAL | example (live) | fix (as spa_for_eng) | conf | chars |
|---|---|---|---|---|---|
| *practicar* + infinitive | 81 | S0005L01B02 話す練習をしたい \| quiero practicar hablar; seeds 5, 206, 228 | spa_for_eng's seed-5 form (*practicar hablando*). That form is still open in #443, so whatever is ruled there applies here. Or practicar + noun | likely | 7,380 |
| *definitivamente* | 63 | S0117L01 確実に \| definitivamente | *sin duda* (Deborah item 57). Spain Spanish, so this follows the main course; it is not the Mexican case | likely | 5,212 |
| *seguro si* | 45 | S0010L04U01 … \| no estoy seguro si…; seeds 10, 62, 165 | *seguro de si* (queísmo; spa_for_eng S0010/S0165) | likely | 3,746 |
| *pensar que* for think | 27 | S0135L01 思う \| piensas; S0210L01 piensan; seeds 135, 210 | *crees / creen* (creer switch d/6321f2cd) | sure | 2,064 |
| *me vio sintiéndome* | 26 | S0147L02 私を見た \| me vio sintiéndome (the LEGO says more than the prompt) | LEGO → *me vio*; rows → *me vio nervioso* (item 76) | sure | 2,154 |
| *disfrutar* + infinitive | 26 | S0051L06B04 \| disfruto hablar con otras personas; seed 55 | gerund (*disfruto hablando*); seed 55 → *no me gusta despertarme* | likely | 2,316 |
| *tomar tiempo para* | 20 | S0027L04U01 \| no me gusta tomar demasiado tiempo para responder; seeds 27, 65 | *tardar demasiado en responder* (Path B); seed 65 as spa_for_eng | likely | 1,980 |
| *cuando* + present in a past or future frame | 14 of 45 | S0147L01B02 学んでいるとき彼女は私を見た \| ella me vio cuando estoy aprendiendo; S0152L01U01 lo habría hecho … cuando puedo | *cuando estaba…*, *cuando pueda*. The other 31 are habitual presents (*cuando estoy cansado*), which are fine | sure | 1,186 |
| *que lo que* in comparisons | 8 | S0132L02U03 más emocionante que lo que esperaba | *de lo que* | likely | 732 |
| *sentirse más fácil* | 7 | S0122L01B03 \| empezando a sentirse más fácil | *ser más fácil* (item 61) | sure | 682 |
| *no me siento como si estuviera listo* | 5 | S0115L02U01; seed 115 | *no me siento listo* (S0114 *me siento como si…* is fine) | sure | 566 |
| *la mayoría … les gusta* (no *a*) | 4 | S0288L01U01; seed 288 | *a la mayoría …* | sure | 448 |
| *siento que* for "sorry" | 4 | S0139L01U01 すみません \| siento que necesito irme tan temprano; seeds 139, 140 | *lo siento, pero…* (item 71) | sure | 380 |
| *no conozco a personas que hablan* | 2 | S0297L02U01; seed 297 | *que hablen* | likely | 190 |

Seed-only items, with no rows: S0292 *Espero que puedes venir* → *puedas* (**sure**). S0270 *me preocupo que voy a llegar tarde* → *me preocupa llegar tarde* (**likely**).

**This course's own build problems:**
- **Seed 1 has no LEGO for *quiero*.** Its LEGO ids start at L02. So 57 rows in seeds 1–7 use *quiero*, which is first taught at S8. Fix: add 〜したい | quiero as S0001L01, as spa_for_eng and spa_for_zho have. **sure.** 16 chars. Those 57 rows are not counted separately.
- **Known prompt with an English word**, 6 rows: S0283/S0286/S0297 "Spanishを話す…" → スペイン語を話す…, 100 chars.
- **One Japanese prompt, two answers** (LEGOs): だから = *porque* (S0022L01) and *así que* (S0149L01). 考える = *pensar* and *considerar*. それ = *ello* and *eso*. Seeds 189 and 272 share one prompt (はいそれはいい考えですね). Seed 272's *suena como una gran idea* is also a calque: use *me parece una gran idea*. **likely.**
- **16 LEGOs taught as new a second time** (e.g. S0256L01 *creo* after S0047L01): flip to not-new, 0 chars. 2 not-new LEGOs were never taught (S0207L01 *necesitabas*, S0257L01 *cosa*).
- Questions recorded without ¿?: S0095L01U03, S0095L03B07, S0095L03U01. The bare build row S0281L01B03 *¿Te importa si?* should be deleted. 4 Japanese prompts carry an afterthought tail ("…見ましたか？今日。"); they are noted, not counted.
- **28 empty audio slots** under new LEGOs, 862 chars. One duplicate row (S0203L01U05 = B07). S0065L02 *ponerte a hablar* is not in seed 65.
- **28 seeds never practised** as a played row.

KNOWN, not counted: bare *intentar* (S0007L02B01/B04) is spa held item 16 (d/85773ddc). Not defects: *tener una conversación* (5), *sería genial si puedes* (spa_for_eng keeps the same in seed 90), *dijo que quiere* (present allowed when still true).

## spa_for_zho

- **Stray *aquí*: 311 rows (REAL, sure), ≈16,450 chars.** The Chinese prompt has no 这里, and the learner cannot know to add it. Examples:
  - S0224L02U05 我需要一个答案 | necesito una respuesta aquí
  - S0228L02U04 那个女人在那里工作 | esa mujer trabaja aquí (the prompt even says "there")
  - S0246L01U03 你觉得挺好的吗 | ¿pensé que era bastante bueno antes aquí? (also the wrong person)

  30 were read by eye. All 311 match the rule "target ends in aquí, the prompt has no 这里/这儿/在这, and neither the seed nor the LEGO says aquí". Fix: drop the word. Also 17 rows end in a stray *así* or *antes* (e.g. S0161L01B01 你觉得呢? | ¿piensas así?), 604 chars.
- **Known says 中文**, 32 rows: seeds 1, 4, 9, 13, 14, 15, 22, 33, 64, 159, plus LEGOs S0004L02 and S0022L03 and their rows. Fix → 西班牙语. 358 chars, **sure.** 562 rows already say 西班牙语.
- **The same spa_for_eng fixes as spa_for_jpn**, all read:
  - practicar + inf 40
  - seguro si 32
  - tomar tiempo para 11
  - pensar que 11
  - sentirse más fácil 11 (LEGO S0121L02)
  - definitivamente 8
  - que lo que 7
  - me vio sintiéndome 4 (LEGO S0146L02 她看到我感觉到了 | me vio sintiéndome)
  - siento que 4
  - disfrutar + inf 4
  - ir aquí 3
  - mayoría sin *a* 1 (seed)
  - no conozco … hablan 2
  - bare intentar 1 (S0097L01U04)

  Seeds 5, 10, 27, 55, 62, 65, 121, 131, 134, 138, 139, 146, 164, 205, 209, 227, 270, 288, 292, 297 carry the old text. Note that spa_for_zho seed numbers sit one lower than spa_for_jpn from about seed 60 onwards.
- **Wrong or ambiguous Chinese prompts on LEGOs** (13 REAL):
  - S0051L03 西班牙语 | amigo
  - S0122L02 主意 | buena
  - S0285L01 说 | habla español
  - S0077L02 你说 | dijiste (needs 你说过)
  - S0166L01 需要 | necesitas (needs 你需要)
  - S0040L02 现在 | en este momento (clashes with S0001L05 ahora)
  - S0264L01 老 | hombre viejo
  - …and the others in the json.

  Fix the known side only, **likely**. 那个 eso/esa (gender) and 答案 la/— are not counted.
- **33 rows use a word before it is taught**: *yo* ×6 and *tú* ×2 (never taught), *ayudar* at S51/86 (taught S141), *ti* ×3, and others. Reword or delete, **likely**, ≈1,840 chars.
- 5 rows use another form of their LEGO (S0150L02B03 *pasará* under *pasara*, S0216L01U04 *tomaste* under *tomé*, …). There are 10 not-new LEGOs that were never taught, 3 LEGOs not in their seed (S0132L02 *una persona*), 2 duplicate rows, and **84 seeds never practised**.
- Not defects: 92 of 93 question-mark hits. The Chinese prompt ends in 吗 or a question word without ？, which is punctuation only.

## fra_for_jpn

- **Seed 1 was cut down to "Je veux parler maintenant." (今話したいです)** while its LEGOs still teach *parler français* and *avec toi*. Restore seed 1 to *Je veux parler français avec toi maintenant* (as fra_for_eng) with the matching Japanese. **sure.** S0134L03 *travailler sur* and S0295L02 *fini* also do not match their seeds.
- **18 rows do not contain their LEGO**:
  - S0010L03 *je peux me souvenir* → rows *je peux parler / dire / expliquer* (8)
  - S0011L02 *pouvoir parler* → *pouvoir expliquer* (5)
  - S0064L02 *n'est pas facile mais* (4)
  - S0082L02U01 *pourquoi pas*

  Shortest-cut fix: cut the LEGOs to *je peux / pouvoir / mais*, or reword the rows. **sure**, ≈1,100 chars.
- Fixed in fra_for_eng, still live here:
  - *m'a vu me sentir nerveux* → *m'a vu nerveux*: 3, seed 147, **sure**
  - *se souvenir comment* → *se souvenir de comment*: 6, seeds 56/57, **likely**
  - *je ne veux pas lui donner* → *le lui donner*: 2, seed 241, **sure**
  - S0213L01U03 *ce que ils* → *ce qu'ils*: **sure**
- Known with an English word, 4 seeds: S0283/S0285/S0286/S0297 "French話せる…" → フランス語.
- Question mark missing: *c'est quoi / il a dit quoi / tu veux quoi* (S0258L01B01–B03). S0182L02U04 *tu veux que je t'aide à le chercher mes clés ?* is ungrammatical, and the prompt asks something else.
- 16 empty audio slots (433 chars). 3 not-new LEGOs never taught (S0207L01, S0228L02, S0257L01). One duplicate debut (*lire*). **95 seeds never practised.**
- Not counted:
  - *je ne suis pas sûr si*, 20 rows. fra_for_eng changed seeds 10 and 62 but kept S0165, so this is a preference.
  - *j'ai bu avec mes amis*: KNOWN (#195 held, d/281de4ee).
  - Japanese-known ZUT pairs that are only article or gender (*ami / un ami*, *mon ami / mon amie*).
  - Japanese imperative prompts (教えて) for *tu peux me dire…?*: K6 latitude.

## fra_for_zho

- **Known says 中文, 295 rows, sure, 2,783 chars.** Seeds 1–16, 22, 33–45, 54, 64, 92, 97, … and LEGOs S0001L03 中文 | français, S0004L02 用中文 | en français. 273 rows already say 法语.
- **One bare Chinese word, several French forms: 33 LEGO clashes** (gender pairs 你的 ton/ta, 好的, 忙, 留下了 are not counted). Examples:
  - 知道 → savoir (S0045L02) / savait (S0105L01) / savons (S0213L01)
  - 工作 → travailler / travaille / travaillait / trop de travail
  - 问题 → problème / question(s)
  - 想 → réfléchir / dises

  Fix: give each LEGO's Chinese its person or tense (他以前知道, 我们知道) or a fuller chunk. Known side only, **likely**.
- **38 LEGOs marked not-new that were never taught on both sides** (S0105L01 *savait*, S0151L01 *j'espérais*, S0170L01 *dises*, …). The learner meets them only inside seeds. Make each one new, or point it at the real earlier LEGO. 0 chars to flip; debut audio not estimated.
- **4 gapped LEGOs** (S0088L02 跟...说话 | parler à, S0093L02, S0181L04, S0262L01). **5 LEGOs left behind** when their seed was edited (S0034L04, S0076L05 *autant*, S0086L01, S0089L02 *en un peu de temps*, S0090L03 *si tu pouvais*). 6 duplicate debuts. 1 duplicate row.
- 6 rows use a word before it is taught: *quoi* ×3, *facile*, *s'est passé*, *question*. 17 untaught hits are detector faults: elided forms (*c'était, d'apprendre, j'ai*) or the word is in the row's own seed.
- Same main-course fixes as fra_for_jpn: *m'a vu me sentir* 4, *se souvenir comment* 3, *lui montrer / lui donner* without its object 2. **64 seeds never practised.**

## deu_for_jpn

- ***erinnern* without *sich*: 55 REAL, sure, ≈3,830 chars.** Examples:
  - LEGOs S0006L02 and S0113L01 思い出す | erinnern
  - S0006L02U02 ich versuche ein Wort zu erinnern
  - S0010L03U01 ob ich den ganzen Satz erinnern kann
  - seeds 6, 10, 24, 56

  Fix → *mich (an …) erinnern*. Duden marks plain transitive *erinnern* as regional or colloquial. deu_for_eng fixed the same seeds.
- Fixed in deu_for_eng, still live here:
  - *dass du (so) gut machst* → *dass du es gut machst*: 6, seeds 72/129
  - *das klingt wie eine Idee* → *klingt nach*: 5, seed 272 (deu #435)
  - *Das war, wo mein Freund…* → *Hier wollte mein Freund…*: 2
  - *Ich hatte ein oder zwei Gläser Wasser* → *…getrunken*: 2
  - *dort* is taught here (S0157L01), so the main course's "dort never taught" item does not apply. But 3 rows need *dorthin* (S0157L01U03 *dort zu gehen*, S0203L01U05, S0271L01U04).
- **17 full questions recorded without "?"** (S0121L03U06 *wo ist dein Auto*, S0135L01U03–U06 *was denkst du…*). S0167L02B03 *was musst du morgen?* lacks its verb, and S0133L05U02 *mag man es wenn man zusammen arbeitet* does not match the prompt. ≈820 chars.
- **8 rows miss their LEGO**: S0107L02 *hofften zu sehen* → rows say *hofften zu finden / lernen*; S0224L01 *gerade angefangen* → *gerade gesagt*. Cut the LEGOs to *hofften zu* / *gerade*.
- **17 rows use another person of a taught verb that was never taught** (*suche, treffe, sehe, übe, fragst, redet…*) or a word before its seed (*anfangen* S43 < S81, *denken*, *brauche*, *kennst*). **likely**, ≈770 chars.
- **34 LEGOs taught as new a second time** (S0076L01 *schon*, S0113L01 *erinnern*, S0255L01 *denkst* …), flip only. 4 not-new LEGOs never taught. S0166L01 *name* and S0181L03 *mutter* are also lower-case nouns.
- Seed 272 shares seed 189's Japanese. Two LEGO prompts are wrong: S0132L02 面白い | aufregend, S0126L01 私の | meines Gehirns. Known with an English word: 4 seeds.
- **66 empty audio slots** (1,400 chars). **33 seeds never practised.**

## deu_for_zho

- **Known says 中文, 237 rows, sure, 2,047 chars.** Seeds 1–30 (almost every one), 33, … and LEGOs S0001L03 中文 | Deutsch, S0004L02 用中文 | auf Deutsch.
- **35 LEGO clashes from bare Chinese words** (必须 muss / müssen / musstest / musste; 做 machen / macht / tun / tue; 会 würde / hätte / wäre / wird; 有 gibt / hatte / getan …). Case and gender forms (dein/deine, kein/keine, dieses/dieser …) are not counted. **60 not-new LEGOs never taught.** Fix as in fra_for_zho.
- **23 LEGOs left behind when their seed was edited**:
  - S0080L01 *fertig* (seed says *bereit*)
  - S0090L01 *schön* (seed *großartig*)
  - S0092L02 *möchte* (seed *würde gern*)
  - S0113L01 *merken*, S0120L01 *Auto* (seed is about the bus)
  - S0158L01 *lass uns* (seed *Reden wir*)
  - S0289L03 *dort* (seed *da*)
  - …and the rest in the json.

  **sure.** Each LEGO must match its seed (L26).
- **6 gapped LEGOs.** S0131L04 …的人 | herumgehen is nonsense. 6 rows under S0165L02 *ob* do not contain *ob* ("Ist es sehr gut?"). 5 duplicate rows. 7 duplicate debuts.
- *erinnern* without *sich*: 8. The S0289L03 *dort* family, 9 rows: the seed says *da*, and *dort gehen* should be *dorthin gehen*. 7 rows use untaught words (S0281L02U06 *bitte warte während ich austrinke*: 3 untaught words). **105 seeds never practised.**

## ita_for_jpn

- ***andare a* + infinitive as a future: 117 REAL, sure, ≈8,060 chars.** Every hit was read. Examples:
  - S0024 *Non vado a riuscire a ricordare facilmente*
  - S0179L01 何をするつもり | vai a fare
  - S0082L02 *non vado ad aspettarti*
  - S0223L01U05 *penso che lui va a chiederti qualcosa domani*
  - seeds 5, 8, 23, 24, 25, 82, 179, 223, 227, 243

  Fix: for plans (つもり), *ho intenzione di …*; for predictions, the future (*non riuscirò*, *ti chiederà*). The S0025L01/L02 rows (話しに行って | vai a parlare) are grammatical imperatives, but they hang on seed 25's wrong *Vai ad aiutarmi…?*, so they are fixed with it. Side note: ita_for_eng's own *sto per* means "about to", not "going to".
- *nella mia testa* → *in testa*: 17, **sure**, P28 seed-131 ruling.
- *Penso che le hai lasciate* → *tu le abbia lasciate*: 6, **likely**.
- **4 LEGOs are a bare subjunctive** (S0047L02 〜である | sia, S0072L02 stia, S0204L01 aiutasse, S0225L02 potesse). K40 says to teach them inside their trigger (*penso che sia*).
- **14 rows miss their LEGO**: S0002L02 *sto cercando di imparare* → *…di parlare*; S0040L01 *come ti senti* → *ti senti stanco*; S0116L02 *potrei fare* → *potrei parlare*; S0260L01 *non ho* → *non ha*. Cut the LEGOs to *sto cercando di* / *potrei*.
- **13 duplicate rows** (S0108–S0126 B01/B02 pairs). **38 empty audio slots** (1,296 chars). 8 rows use untaught words (*abbia* ×3, *avrei* ×2, *senta*, *voglia* at S47; *era* at S86). Seed 272 = seed 189 prompt. Known with an English word: S0283, S0286. **64 seeds never practised.**
- Not defects:
  - *non riuscivo a* (K36 settles an English-known clash; there is no clash under the Japanese prompt here)
  - *c'era* (taught here as S0279L01)
  - 86 question-mark hits (Japanese 〜ですか is a question without ？)

## ita_for_zho

- **Known says 中文, 202 rows, sure, 2,082 chars.** LEGO **S0160L01 is literally *cinese* while seed 160 says *in italiano*.**
- *andare a* future: 36 (seeds 5, 8, 23, 243 and rows), ≈2,340 chars.
- **32 LEGO clashes or wrong prompts**: 一点 | minima, 回来 | indietro, 去 | ristorante, 好像 | sistemarlo, 谁 | intendi, 朋友 | con i miei amici, 我想 mi piacerebbe / vorrei, 高兴 contento / felice … **28 not-new LEGOs never taught.** **5 gapped LEGOs.**
- **9 LEGOs left behind when their seed was edited**: S0025L04 *aiutare*, S0147L03 *ero*, S0174L01 *riesci*, S0180L01 *vorrei*, S0182L01 *le mie cose*, S0183L01 *temo*, S0183L02 *averle viste*, S0201L01 *succederà*, S0160L01 *cinese*.
- **Bare-subjunctive LEGOs**, 15 rows: S0025L03 *debba andare*, S0072L03 *stia andando*, S0119L02 *vada*, S0163L01 *sia interessante*, S0204L01 *aiutasse*. Rows S0204L01U01/U04 are nonsense (*aiutasse e questo è molto bene*).
- 23 rows use untaught words: *lui* ×13 before S290, *dare*, *trovato*, *dov'è* … The 13 *io* hits are in seed 25 itself (detector fault). S0196L02U04 *hai sentito l'ultima e sono molto felice?* is nonsense. **85 seeds never practised.**
- Seed 147 *mi ha visto sentirmi nervoso*: same calque as spa item 76, but ita_for_eng has it too and ita_for_jpn already says *mi ha visto nervoso*. Listed for Kai, **likely**.

---

## Coverage

| family | spa_jpn | spa_zho | fra_jpn | fra_zho | deu_jpn | deu_zho | ita_jpn | ita_zho |
|---|---|---|---|---|---|---|---|---|
| main-course lexical patterns (patterns.json + 4 main slices) | all read | all read | all read | all read | all read | all read | all read | all read |
| 17 new patterns from seed diffs vs the mains (seeds 1–300) | run, read | run, read | run, read | run, read | run, read | run, read | run, read | run, read |
| zut_lego / zut_seed / notnew / dup_debut / gapped | read | read | read | read | read | read | read | read |
| lego_not_in_seed / phrase_missing_lego / dup_rows | read | read | read | read | read | read | read | read |
| untaught_target | read; 57 → 1 root | read | read | read; 17 detector faults | read | read | read | read; 13 faults |
| question-mark mismatch | read | read | read | read | read | read | read | read |
| empty audio (count only) | 28 | 0 | 16 | 0 | 66 | 0 | 38 | 0 |
| seed never practised (new check: target sentence absent from played rows) | 28 | 84 | 95 | 64 | 33 | 105 | 64 | 85 |
| known says 中文 / English word in a Japanese prompt (new mechanical checks) | 6 | 32 | 4 | 295 | 4 | 237 | 2 | 202 |
| stray aquí/ici/hier/qui (new check) | 2, not defects | 311 + 17 | 3, not read | 0 | 3, not read | 1, not read | 1, not read | 0 |
| zut_use (phrase-level) | examples read, not counted (Kai 21 Oct) | ← | ← | ← | ← | ← | ← | ← |
| LEGO 7+ syllables | listed as candidates in the json, not recounted by hand | ← | ← | ← | ← | ← | ← | ← |

## Gaps (stated, not papered over)

- **Known side, Japanese and Chinese: structure and mechanical checks only.** I read the known side only where a detector pointed (ZUT keys, 中文, Latin letters, gapped "..."). Its grammar and naturalness were not scanned. Spaceless scripts were not tokenised, so a known-side untaught-word check or a LEGO-not-in-seed check on the known side was not run.
- **Intro wording, female-voice male forms, and clip ≠ text were not scanned.** No detector exists for them, and audio is judged by ear only (A22).
- **The seed-diff mining covers seeds 1–300 only.** Main-course fixes above seed 300 (deu S0614, ita S0629 …) cannot apply to these 300-seed courses.
- **The *stray aquí* family: 30 of 311 read by eye**; all 311 match the stated rule. LEGO 7+ candidates were not recounted by hand. *zut_use* was read by example, not row by row.
- **Audio chars are estimates from current text length.** Debut audio for not-new LEGOs that become new is not estimated. Seeds-never-practised are costed at 0 on the assumption that the seed's own clips are relinked.
- **Side notes on the main courses, not part of this slice:**
  - fra_for_eng S0183–S0185 *les ai vus / laissés* (clés is feminine, so *vues / laissées*); the variants have it right.
  - fra_for_eng S0246 *elle était trop occupé*.
  - fra_for_eng S0206 *pratiquer parler*.
  - fra_for_eng S0178 *bien que je voulais*.
  - spa_for_eng S0288L03U09 *la mayoría … que conozco que les gusta*.
  - ita_for_eng uses *sto per* (= "about to") for "going to".
