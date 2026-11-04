# spa_for_eng wide quality sweep: what learners hear (#255·AD, 4 Nov 2026)

Kai asked for this after a learner wrote that mistakes 'have become increasingly frequent, particularly from the Green Belt onwards and throughout the Blue Belt'. I checked every played practice phrase (14,946), all 668 seeds, every new LEGO and every LEGO intro. **Nothing has been changed in the course:** by Kai's ruling of 4 Nov, a separate canon-trained agent applies the CLEAR list.

## The one line for the learner

Real defects per 100 played phrases, before → after the CLEAR fixes: **1-39** 2.61 → 2.25; **Green 40-79** 1.23 → 0.72; **Blue 80-149** 3.74 → 0.2; **Purple 150-280** 7.38 → 0.39; **Purple+ 281-668** 7.06 → 2.13.

Two caveats. *Before* is a floor: the detector catches about 86% of known language errors (calibration below). *After* assumes the CLEAR list is applied and counts what is left, which is the NEEDS-KAI and NEEDS-NATIVE rows.

## How it was done

1. **Detect.** Sonnet read every played basket with its seed, LEGO and earlier taught pairs, and every seed, LEGO and intro, looking for Spanish grammar, unnatural Spanish, meaning mismatch, bad English, tú/usted mixing and nonsense. Haiku read seeds 40-280 a second time. On 142 known past fixes (#99, seeds 153-200) that the prompt was never tuned on, Sonnet caught 95 of 111 grammar, meaning and mood defects (86%); Haiku alone caught 75%. The detector does not see structural defects (containment, ZUT, untaught forms: 0-30%).
2. **Second read.** Sonnet re-read all 2,963 flags: 1,094 confirmed, 1,869 rejected.
3. **Hand triage (Opus).** Six readers, one per seed band (A-C: #316·AD, #317·AD, #318·AD; D-F: me), read every confirmation in full against its LEGO, seed, basket and the canon. Result: **682 CLEAR**, **204 NEEDS-KAI**, **64 NEEDS-NATIVE**, **146 FALSE**. Every CLEAR passed the course gates.

## Where the defects are (played phrases)

| belt | played phrases | defects found | per 100 | after CLEAR |
|---|---|---|---|---|
| 1-39 | 1109 | 29 | 2.61 | 2.25 |
| Green 40-79 | 973 | 12 | 1.23 | 0.72 |
| Blue 80-149 | 2484 | 93 | 3.74 | 0.2 |
| Purple 150-280 | 3564 | 263 | 7.38 | 0.39 |
| Purple+ 281-668 | 6816 | 481 | 7.06 | 2.13 |

By type (played phrases with a real defect):

- **1-39**: MEANING 22, ENGLISH 4, UNNATURAL_ES 3
- **Green 40-79**: GRAMMAR_ES 6, MEANING 4, ENGLISH 1, UNNATURAL_ES 1
- **Blue 80-149**: ENGLISH 33, GRAMMAR_ES 24, UNNATURAL_ES 15, MEANING 15, NONSENSE 6
- **Purple 150-280**: MEANING 101, GRAMMAR_ES 52, UNNATURAL_ES 50, ENGLISH 39, NONSENSE 21
- **Purple+ 281-668**: MEANING 204, GRAMMAR_ES 136, UNNATURAL_ES 73, NONSENSE 40, ENGLISH 23, ? 5

So the learner is right about the shape: the rate roughly doubles from Green (1.2) to Blue (3.7) and doubles again into Purple (7.4). Seeds 281-668 sit at the same level. The big families:

- **Seeds 80-149:** English and Spanish saying different things (a dropped 'it', 'right', 'too' or 'just', a wrong tense), plus missing 'lo' in 'lo estás haciendo bien'.
- **Seeds 150-280:** past-frame tense errors ('dije que quería verte antes de que te vayas'), missing personal 'a', 'decir de / preguntar de' calques, and agreement slips ('la reunión … listo').
- **Seeds 281-668:** a past frame with a present verb ('sabía que ya entienden', 'estaba seguro de que saben'), 'cuando termino' for the future, gender with neuter 'lo'/'eso'/'esto', and padding rows built by a generator ('guess here, good', 'whoever said before, no', 'in three or four minutes at the end'). There is also a cluster of LEGOs that teach a subjunctive with no trigger ('podáis', 'conociera', 'no estén hablando en serio', 'donde pueda').

## What the CLEAR list fixes (examples)

- **S0281L02U02**: When I finish I would like to read my book for a while | Cuando termino me gustaría leer mi libro por un rato → If I finish I would like to read my book for a while | Si termino me gustaría leer mi libro por un rato. 'cuando' about the future needs the subjunctive ('cuando termine'); 'termine' is untaught, and 'si termino' keeps the LEGO and is correct.
- **S0425L01U04**: I knew they already understood | sabía que ya entienden → I know they already understand | sé que ya entienden. After a past frame ('estaba seguro de que', 'sabía que') Spanish backshifts the verb; the present here clashes with the English past. The past form is untaught here, so the frame moves to the present on both sides.
- **S0464L02U04**: I told her about the hotel | le dije del hotel → I told her something about the hotel | le dije algo del hotel. 'decir del hotel' is a calque; 'decir algo de' is natural.
- **S0488L01U01**: she is on the other side | ella está en el otro lado → she is on the other side | ella está al otro lado. The seed says 'al otro lado'; 'en el otro lado' is a calque and gives one English two Spanish. ('al' = a + el, so the LEGO 'el otro lado' is still there.)
- **S0549L01U04**: because I have got to be here yesterday | porque tengo que estar aquí ayer → because I have got to be here tomorrow | porque tengo que estar aquí mañana. 'have got to be here yesterday' is a contradiction on both sides.
- **S0636L01U04**: I think that that is what she wanted | creo que ese es lo que quería → I think that that is the one she wanted | creo que ese es el que quería. 'ese es lo que' mixes masculine and neuter; keeping the LEGO 'ese es' means 'the one'.
- **S0554L01B03**: I told her this towel isn't dry | le dije esta toalla no está seca → I told her this towel isn't dry | le dije que esta toalla no está seca. Reported speech after 'le dije' needs 'que' in Spanish.
- **S0085L01U02**: I don't know people who speak Spanish | No conozco a personas que hablan español → I know people who don't speak Spanish | Conozco a personas que no hablan español. 'No conozco a personas que hablan' needs the subjunctive 'hablen' (untaught); re-worded to the positive 'I know people who don't speak Spanish', where the indicative is right.
- **S0106L03U04**: I want to work speaking as often as possible | Quiero trabajar hablando lo más a menudo posible → I want to work as often as possible | Quiero trabajar lo más a menudo posible. Same 'work speaking' garble; drop 'speaking'.
- **S0116L04U08**: I think that this isn't the best option I could choose and I want to do better | Creo que esta no es la mejor opción que podría elegir y quiero hacer lo mejor posible → I think that this isn't the best option I could choose and I want to do my best | Creo que esta no es la mejor opción que podría elegir y quiero hacer lo mejor posible. 'hacer lo mejor posible' is 'do my best' (as the course uses it at S0168, S0244), not 'do better'; fix the English.
- **S0122L05U13**: It goes well and I am very excited with everything I am learning | Va bien y estoy muy emocionado con todo lo que estoy aprendiendo → It goes well and I am very excited about everything I am learning | Va bien y estoy muy emocionado con todo lo que estoy aprendiendo. 'excited with' -> 'excited about'.
- **S0132L04B06**: What she was saying was very interesting to listen to | Lo que ella estaba diciendo fue muy interesante para escuchar → What she was saying was very interesting to listen to | Lo que ella estaba diciendo fue muy interesante de escuchar. 'interesante para escuchar' is wrong for 'interesting to listen to'; 'interesante de escuchar'.
- **S0140L01U03**: I know what you try to explain | Sé lo que intentas explicar → I know what you're trying to explain | Sé lo que intentas explicar. 'you try to explain' -> 'you're trying to explain'.

Full apply-ready list (682 rows, before → after, reason, canon rule, knock-ons): see the handoff document published with this report.

## NEEDS-KAI

Grouped by root: each root is followed by the rows that move with it. All seed, LEGO and intro edits are here.

- **Seed 7 · S0007**: I want to try as hard as I can today | quiero intentar todo lo que pueda hoy  
  'todo lo que pueda' means 'as much as / all I can', not 'as hard as I can'; the seed English promises effort the Spanish does not say.  
  **Proposal:** Seed 7 'I want to try as hard as I can today' = 'quiero intentar todo lo que pueda hoy'. 'todo lo que pueda' is 'as much as I can / all I can' (quantity), not effort. Recommend fixing the ENGLISH (K14): LEGO S0007L03 known 'as hard as I can' -> 'as much as I can'; seed known -> 'I want to try as much as I can today'; then in every basket row swap 'as hard as' -> 'as much as' (B01-B04, U01-U04; U05 re-word to 'I want to try to speak Spanish as much as I can'). Downstream rows carrying todo lo que pueda: S0026L01U07, S0029L02U04, S0041L02U04, S0046L01U06, S0047L01U05, S0125L01U08, S0188L02U05, S0191L01U06, S0200L05U03, S0200L05U07, S0245L03U08, S0295L03U13 - each to be read so its English says 'as much as / everything I can'; S0026L01U07 'I like trying everything I can today' and S0047L01U05 'I think that I can try everything I can today' are clumsy English and could simply be deleted.
- **Seed 7 · S0007L03**: as hard as I can | todo lo que pueda  
  LEGO 'as hard as I can' = 'todo lo que pueda' teaches a quantity phrase as an effort phrase; fix the English of the LEGO rather than the Spanish.  
  **Proposal:** Seed 7 'I want to try as hard as I can today' = 'quiero intentar todo lo que pueda hoy'. 'todo lo que pueda' is 'as much as I can / all I can' (quantity), not effort. Recommend fixing the ENGLISH (K14): LEGO S0007L03 known 'as hard as I can' -> 'as much as I can'; seed known -> 'I want to try as much as I can today'; then in every basket row swap 'as hard as' -> 'as much as' (B01-B04, U01-U04; U05 re-word to 'I want to try to speak Spanish as much as I can'). Downstream rows carrying todo lo que pueda: S0026L01U07, S0029L02U04, S0041L02U04, S0046L01U06, S0047L01U05, S0125L01U08, S0188L02U05, S0191L01U06, S0200L05U03, S0200L05U07, S0245L03U08, S0295L03U13 - each to be read so its English says 'as much as / everything I can'; S0026L01U07 'I like trying everything I can today' and S0047L01U05 'I think that I can try everything I can today' are clumsy English and could simply be deleted.  
  Moves with it: S0007L03B01, S0007L03B02, S0007L03B03, S0007L03B04, S0007L03U01, S0007L03U02, S0007L03U03, S0007L03U04, S0007L03U05, S0026L01U07, S0047L01U05
- **Seed 18 · S0018**: we want to meet at six o'clock this evening | queremos reunirnos a las seis de la tarde  
  'this evening' = 'de la tarde' loses 'this'; 'a las seis de la tarde' is 'at six in the evening'.  
  **Proposal:** Seed 18 LEGO S0018L04 'this evening' = 'de la tarde': 'de la tarde' is the clock-time tag (p.m., in the evening) and has no 'this'. Recommend fixing the ENGLISH (K14): LEGO known -> 'in the evening', seed known -> 'we want to meet at six o'clock in the evening'; then read the 16 rows with 'de la tarde' and use 'in the evening' / 'p.m.' in their English: S0018L04B01, S0018L04B02, S0018L04B03, S0018L04U01, S0018L04U02, S0018L04U03, S0018L04U04, S0018L04U05, S0018L04U06, S0019L01U06, S0019L03U06, S0020L03U04, S0071L01U02, S0095L01U10, S0102L01U12, S0293L03U14. (Rows that render 'this evening' as 'esta tarde' are fine and were marked FALSE.)
- **Seed 18 · S0018L04**: this evening | de la tarde  
  LEGO 'this evening' = 'de la tarde': 'de la tarde' is the p.m. tag after a clock time and has no 'this'.  
  **Proposal:** Seed 18 LEGO S0018L04 'this evening' = 'de la tarde': 'de la tarde' is the clock-time tag (p.m., in the evening) and has no 'this'. Recommend fixing the ENGLISH (K14): LEGO known -> 'in the evening', seed known -> 'we want to meet at six o'clock in the evening'; then read the 16 rows with 'de la tarde' and use 'in the evening' / 'p.m.' in their English: S0018L04B01, S0018L04B02, S0018L04B03, S0018L04U01, S0018L04U02, S0018L04U03, S0018L04U04, S0018L04U05, S0018L04U06, S0019L01U06, S0019L03U06, S0020L03U04, S0071L01U02, S0095L01U10, S0102L01U12, S0293L03U14. (Rows that render 'this evening' as 'esta tarde' are fine and were marked FALSE.)  
  Moves with it: S0018L04B01
- **Seed 23 · S0023L02U09**: I'm going to start talking more soon | voy a empezar a hablar más pronto  
  'hablar más pronto' is heard as 'talk sooner', not 'talk more, soon'; the same wording is seed 23 itself, so this is one pattern decision for 14 rows.  
  **Proposal:** Seed 23 'I'm going to start talking more soon' = 'voy a empezar a hablar más pronto'. Spanish 'hablar más pronto' is heard as 'talk sooner', and the English 'talking more soon' is itself odd. Recommend the word-order fix in Spanish, all taught words: seed -> 'voy a empezar pronto a hablar más', English 'I'm going to start talking more soon' kept (or 'Soon I'm going to start talking more'); apply the same move to every row: S0023L02B01, S0023L02B03, S0023L02U03, S0023L02U04, S0023L02U09, S0025L01B03, S0025L02U01, S0028L01B03, S0030L01U05, S0084L02B06, S0136L02U18, S0157L02U07, S0161L05U07, S0295L01U03 (e.g. S0025L01B03 '¿Vas a empezar pronto a hablar más?'). Alternative: keep the Spanish and change the English to 'sooner' everywhere. One decision for 14 rows.  
  Moves with it: S0023L02B01, S0023L02B03, S0023L02U03, S0023L02U04, S0025L01B03, S0025L02U01, S0028L01B03, S0030L01U05
- **Seed 28 · S0028L02U09**: It's useful to start talking as soon as you can | Es útil empezar a hablar lo antes posible  
  This row is seed 28 word for word: English 'as soon as you can' vs LEGO and Spanish 'lo antes posible' (as soon as possible); the LEGO's English is not in the seed English.  
  **Proposal:** Seed 28 known -> 'It's useful to start talking as soon as possible', and this row (S0028L02U09) the same. Two Englishes to one Spanish is legal (K3), so this is tidiness, low priority.
- **Seed 29 · S0029L02U09**: I'm looking forward to speaking better as soon as I can | tengo ganas de hablar mejor lo antes posible  
  This row is seed 29 word for word: 'as soon as I can' vs 'lo antes posible' (as soon as possible); the seed's English does not hold the LEGO's English.  
  **Proposal:** Seed 29 known -> 'I'm looking forward to speaking better as soon as possible', and this row the same. Low priority (K3 allows it).
- **Seed 38 · S0038L01**: I've been learning all day | llevo todo el día aprendiendo  
  LEGO 'I've been learning all day' = 'llevo todo el día aprendiendo' does not tile seed 38 ('llevo más o menos una semana aprendiendo'); it teaches 'todo el día', which the seed never says.  
  **Proposal:** Re-cut S0038L01 as the frame of the seed: 'I've been learning (for)' = 'llevo ... aprendiendo' (or 'llevo aprendiendo'), with its basket re-written around it; it is also the source of the 'for more or less all day' rows (fixed CLEAR in S0038L02).
- **Seed 71 · S0071L02B01**: Heard the truth | Oyera la verdad  
  Build of LEGO S0071L02 'heard the truth' = 'oyera la verdad': a bare imperfect subjunctive is not 'heard', and the seed English says 'hear', not 'heard'.  
  **Proposal:** Re-gloss LEGO S0071L02 known 'heard the truth' -> 'hear the truth' (as in 'let anyone hear the truth'), or merge it with S0071L04 'dejar que' into 'to let ... hear the truth = dejar que ... oyera la verdad'; B01 then reads 'Hear the truth' or is re-written as 'que oyera la verdad'.
- **Seed 97 · S0097**: yes I'm ready to go as soon as you want | sí, estoy listo para irme cuando quieras  
  Seed English 'as soon as you want' does not match 'cuando quieras' (whenever you want), which is what LEGO S0097L02 and its basket say.  
  **Proposal:** Seed 97 known -> 'yes I'm ready to go whenever you want'; S0097L02U09 (the seed as a phrase) the same.  
  Moves with it: S0097L02U09
- **Seed 108 · S0108**: we didn't hope to wake in the middle of the night | no esperábamos despertarnos en medio de la noche  
  Seed English 'we didn't hope to wake' is not natural English; the Spanish 'no esperábamos despertarnos' is 'we weren't hoping / expecting to wake up'.  
  **Proposal:** Seed 108 known -> 'we weren't hoping to wake up in the middle of the night' (matches the taught 'we were hoping = esperábamos', S0107L01); also check the seed-108 LEGO glosses that carry 'didn't hope'. S0108L02U12 the same.  
  Moves with it: S0108L02U12
- **Seed 117 · S0117**: I'm definitely doing better than I was last time we talked to each other | sin duda lo estoy haciendo mejor que la última vez que hablamos  
  Seed English 'than I was last time we talked to each other' is clumsy ('the' missing, 'to each other' and 'than I was' have no Spanish).  
  **Proposal:** Seed 117 known and whole-seed LEGO S0117L04 known -> 'I'm definitely doing better than the last time we talked'; check S0117L04 B01/B02/U01 which carry 'talked to each other'.  
  Moves with it: S0117L04
- **Seed 128 · S0128**: you're like someone I used to know | eres como alguien que conocía antes  
  'eres como alguien que conocía antes': 'antes' has no word in 'someone I used to know', so LEGO S0128L05 'before = antes' tiles an English word the seed does not contain.  
  **Proposal:** Never delete the LEGO: merge S0128L04+S0128L05 into 'I used to know = conocía antes' (or keep L05 and add 'before' to the seed English: 'you're like someone I used to know before'). The Spanish is natural either way.  
  Moves with it: S0128L05
- **Seed 150 · S0150L03B01**: You are called | Llamas  
  The LEGO teaches bare 'llamas' for 'you are called', but that needs 'te llamas'; every other row in the basket already says 'cómo te llamas'.  
  **Proposal:** Seed 150 (Can you tell me what your name is? | ¿Puedes decirme cómo te llamas?): grow S0150L03 to 'you are called | te llamas' (or 'what you are called | cómo te llamas'); update its intro in the same pass (O12); S0150L03B01 becomes 'You are called | Te llamas'. All other S0150L03 phrases already carry 'te llamas' and need no change.
- **Seed 154 · S0154L03**: to meet up with you | reunirte  
  'reunirte' is 'to meet up' with 'te' agreeing with 'you want'; it does not carry 'with you', so the gloss 'to meet up with you' is wrong.  
  **Proposal:** Seed 154 (where do you want to meet on Saturday night? | ¿Dónde quieres reunirte...?): re-gloss S0154L03 to 'to meet up | reunirte' (te = the 'you' of 'quieres'), update its intro (O12), and sweep the basket for phrases whose English says 'meet up with you' over bare 'reunirte' (they need 'reunirte conmigo' or 'reunirnos'). Knock-on: S0167L03B06 'To meet tomorrow afternoon | Reunirte mañana por la tarde' (te has no 'you' in the English; propose 'You want to meet tomorrow afternoon | Quieres reunirte mañana por la tarde').  
  Moves with it: S0167L03B06
- **Seed 190 · S0190L01**: I make | hago  
  Seed 190 uses 'hago' in 'te hago unas preguntas' = 'I ask you', but the LEGO is glossed 'I make' and its basket mostly practises 'I do'.  
  **Proposal:** Seed 190 (Do you mind if I ask you some questions? | ¿Te importa si te hago unas preguntas?): never delete the LEGO; either re-gloss S0190L01 to 'I do | hago' (matching B03/B05-B07 and U01-U13) and grow S0190L02 to 'I ask you some questions | te hago unas preguntas' (not-new for 'hago'), or grow S0190L01 to 'if I ask you | si te hago'. Update intros in the same pass (O12). Downstream: S0190L01B02 'I make | Hago' follows the re-gloss.
- **Seed 217 · S0217L01**: I took | tomé  
  The LEGO says 'I took | tomé' but the seed English is 'I had a glass or two of water', so the LEGO's English does not tile the seed.  
  **Proposal:** Seed 217 ('I had a glass or two of water | tomé un vaso o dos de agua'): re-gloss LEGO S0217L01 to 'I had | tomé' (drink sense, as the seed and S0217L03U16-U18 'I had a glass' already use). Downstream: B01 'I took' -> 'I had'; S0217L03B03 'I took a glass' -> 'I had a glass'. The basket's 'I took some time | Tomé tiempo' rows (B04, B06, U02, U03, U05, U07, U09, U11, U13) are a calque too: natural Spanish is 'me tomé tiempo'; I recommend re-pointing them at drink phrases ('I had a glass of water | Tomé un vaso de agua') rather than keeping 'took some time'.
- **Seed 238 · S0238L01**: you told | dijeras  
  The LEGO glosses subjunctive 'dijeras' as past 'you told', but every basket phrase uses it as 'you to tell'.  
  **Proposal:** Seed 238 ('he wanted you to tell me yesterday | Él quería que me dijeras ayer'): re-gloss LEGO S0238L01 'you told' -> 'you to tell', parallel to S0237L01 'me to tell you | que te dijera'. Downstream: B01 'You told' -> 'You to tell'; B02 'That you told | Que dijeras' -> delete (it would duplicate B01) or 'You to tell'.  
  Moves with it: S0238L01B01, S0238L01B02
- **Seed 243 · S0243**: I'm going to ask for the same thing to eat | voy a pedir lo mismo para comer  
  'ask for the same thing to eat' is awkward English for ordering food; the seed's own LEGO basket already says 'order' (S0243L03B04).  
  **Proposal:** Seed 243: English 'I'm going to ask for the same thing to eat' -> 'I'm going to order the same thing to eat' (Spanish unchanged). Downstream: S0243L03U16 (seed echo) to match; S0243L03B04 already says 'order'.
- **Seed 244 · S0244L02B06**: I've learnt a lot already | He aprendido mucho ya  
  'He aprendido mucho ya' copies the seed text; 'Ya he aprendido mucho' is the natural order, but the seed is Kai's.  
  **Proposal:** Seed 244 'he aprendido mucho ya' -> 'ya he aprendido mucho' (English unchanged). Downstream: S0244L02B06, S0244L01B03 and the seed-echo U row, all to 'Ya he aprendido mucho'.
- **Seed 250 · S0250L02U11**: It is important for me to understand what you are asking before I answer | Es importante entender lo que me preguntas antes de que conteste  
  'antes de que conteste' is used where the subject is the same person ('I need to think before I answer'), where Spanish needs the infinitive 'antes de contestar'; that drops the LEGO, so the basket needs re-thinking.  
  **Proposal:** Seed 250 LEGO S0250L02 'I answer | conteste': keep it only in phrases where someone else is the subject of the main verb (as in the seed, 'Can you tell me ... before I answer?'). Re-write the same-subject rows B04, U02, U03, U04, U09, U13 and U11 so another person acts first, e.g. U11 'Can you tell me what you are asking before I answer? | ¿Puedes decirme lo que me preguntas antes de que conteste?'. If you keep U11, its English should at least be 'It is important to understand what you are asking me before I answer'.
- **Seed 262 · S0262L03**: who you were talking to | con el que estabas hablando  
  The LEGO glosses 'con el que estabas hablando' as 'who you were talking to', but half the basket renders that same English as 'con quién estabas hablando', so one English gets two Spanish and those rows lack the LEGO.  
  **Proposal:** Seed 262 ('who was that man you were talking to yesterday?'): re-gloss LEGO S0262L03 to 'that you were talking to | con el que estabas hablando' (it always follows a noun). Then B01 -> 'That you were talking to'. Rows U02, U03, U06, U07, U09, U11, U13 use 'con quién' and do not contain the LEGO: re-write each to 'the man / the woman you were talking to | el hombre / la mujer con el/la que estabas hablando', or move them to a 'con quién' LEGO if one is taught later.  
  Moves with it: S0262L03B01
- **Seed 267 · S0267L01B01**: Heard news from | Tenido noticias  
  'Heard news from' is a garbled echo of the LEGO 'heard from', and 'from' has no Spanish in it; the fix belongs with the LEGO.  
  **Proposal:** See the LEGO line S0267L01: grow it to 'heard from | tenido noticias de' and make B01 match.
- **Seed 270 · S0270**: because I'm worried that I'm going to be late | porque me preocupa que voy a llegar tarde  
  The seed's 'me preocupa que voy a llegar tarde' uses the indicative after a worry verb; standard Spanish needs 'que vaya a llegar' (not taught) or an infinitive.  
  **Proposal:** Seed 270: Spanish -> 'porque me preocupa llegar tarde' (taught words, same subject), English -> 'because I'm worried about being late'. Downstream: S0270L02U01 (seed echo) to match. Alternative if Kai wants the English kept: 'porque me preocupa que vaya a llegar tarde', which teaches 'vaya'.  
  Moves with it: S0270L02U01
- **Seed 279 · S0279L02**: there was left | quedaba  
  The LEGO gloss 'there was left' is not English on its own; the English pattern is 'there was ... left'.  
  **Proposal:** Seed 279: re-gloss LEGO S0279L02 'there was left' -> 'there was ... left' (Spanish 'quedaba' unchanged), or grow it to 'there was some left | quedaba algo' if Kai prefers a whole chunk.
- **Seed 281 · S0281L03U04**: Do you mind waiting until I finish my coffee? | ¿Te importa esperar hasta que termino mi café?  
  'hasta que termino' (not yet happened) needs the subjunctive 'termine', untaught here.  
  **Proposal:** Allow 'termine' (seed 281 is about this very act) or reword to a frame without 'hasta que'; same for S0281L04U04.  
  Moves with it: S0281L04U04
- **Seed 284 · S0284L01B01**: Do you know? | ¿Conoces a?  
  LEGO S0284L01 'do you know | conoces a' ends on the personal 'a'; as a build it is a dangling '¿Conoces a?'.  
  **Proposal:** Rewrite B01 to supply an object from taught words ('Do you know my friend? | ¿Conoces a mi amigo?').
- **Seed 288 · S0288L01B06**: Most of the time | La mayoría del tiempo  
  LEGO 'most | la mayoría' gives 'la mayoría del tiempo', a calque ('la mayor parte del tiempo').  
  **Proposal:** Delete B06 (or Deborah to confirm 'la mayoría del tiempo' is unacceptable).
- **Seed 291 · S0291L01U09**: I hope most people want to practise often | Espero que la mayoría de personas quieren practicar a menudo  
  After 'espero que' Spanish needs the subjunctive ('quieran', 'vaya a estar', 'esté'), none of which is taught by seed 291; the rows teach an indicative after 'espero que'.  
  **Proposal:** Either accept the subjunctive forms here (seed 291 is the 'I hope' seed) or reword U09, U12 and S0289L02U15 to 'I hope to …' (espero + infinitive), which needs no subjunctive.  
  Moves with it: S0289L02U15, S0291L01U12
- **Seed 295 · S0295L01U11**: I said that I wanted to see you before you left for the weekend | Dije que quería verte antes de que te vayas el fin de semana  
  'dije que quería verte antes de que te vayas' needs the past subjunctive 'te fueras', untaught.  
  **Proposal:** Allow 'te fueras' or rewrite without the past frame ('I want to see you before you leave for the weekend | quiero verte antes de que te vayas el fin de semana') — but that drops the LEGO 'dije'; else delete if the floor allows.
- **Seed 370 · S0370L01**: I knew | conociera  
  LEGO 'I knew | conociera' is the past subjunctive (after 'nadie que'), glossed as plain 'I knew'.  
  **Proposal:** Grow S0370L01 to its trigger ('anyone I knew | nadie que conociera' per the seed) and fix U06 ('anyone you knew' needs 'conocieras').  
  Moves with it: S0370L01U06
- **Seed 392 · S0392L02U06**: she walked opposite the post office | fue enfrente de la oficina de correos  
  'she walked opposite the post office | fue enfrente de' loses 'walked'; the basket is at its USE floor.  
  **Proposal:** Write a replacement USE row for S0392L02 and delete this one.
- **Seed 396 · S0396**: we don't need to stand until everybody else is ready | no necesitamos levantarnos hasta que todos los demás estén listos  
  Seed 396 English 'stand' vs 'levantarnos' (stand up); its LEGO says 'to stand up'.  
  **Proposal:** Seed 396 English → 'we don't need to stand up until everybody else is ready' (English only).
- **Seed 403 · S0403L03**: to remain quiet | quedarnos callados  
  LEGO 'to remain quiet | quedarnos callados' is first-person plural with no 'us' in English; U06 'I wanted us to stay quiet | quería quedarnos callados' is wrong (needs 'que nos quedáramos').  
  **Proposal:** Re-gloss S0403L03 to 'for us to remain quiet' or grow it with the seed's 'deberíamos'; fix U06 and S0563L01B03.  
  Moves with it: S0403L03U06
- **Seed 408 · S0408**: yes that's the best way to make a happy family | sí, esa es la mejor manera de tener una familia feliz  
  Seed 408 'make a happy family' vs 'tener una familia feliz' (have).  
  **Proposal:** Seed 408 English → 'that's the best way to have a happy family' and its seed row S0408L01U01.  
  Moves with it: S0408L01U01
- **Seed 419 · S0419L02U05**: I thought she wanted people to appreciate her | pensé que quería que la gente la aprecie  
  'pensé que quería que la gente la aprecie' needs the past subjunctive 'apreciara', untaught; U06 the same.  
  **Proposal:** Reword to a present frame ('I think she wants people to appreciate her | creo que quiere que la gente la aprecie') if 'la aprecie' is acceptable, else delete.  
  Moves with it: S0419L02U06
- **Seed 420 · S0420L02**: how many years | cuántos años  
  LEGO 'how many years | cuántos años' in seed 420 means 'how old (he is)'.  
  **Proposal:** Re-gloss S0420L02 English to 'how old' if the basket supports it.
- **Seed 424 · S0424**: no they're wasting everybody's time | no, están haciendo perder el tiempo a todos  
  Seed 424 'they're wasting everybody's time | están haciendo perder el tiempo a todos' is causative; LEGO S0424L01 'causing to waste | haciendo perder' is not English, and its phrases drop 'a todos' so they mean 'making (someone) waste time' while the English says they waste their own.  
  **Proposal:** Re-gloss S0424L01 to 'making … waste | haciendo perder' or grow it to 'wasting everybody's time | haciendo perder el tiempo a todos' (matches the seed and every phrase); then U02-U04 add 'a todos' / 'everybody's'. English of the seed can stay.  
  Moves with it: S0424L01, S0424L01U02, S0424L01U03, S0424L01U04
- **Seed 434 · S0434L02B04**: could they say how many students they take? | ¿podrían decir cuántos estudiantes que aceptan?  
  LEGO S0434L02 'students they take | los estudiantes que aceptan' is only right as a noun phrase; inside 'cuántos…' it leaves a stray 'que'. Fixing the row drops the LEGO.  
  **Proposal:** P24: rewrite B04/U04 so the LEGO stands as a noun phrase (e.g. 'could they tell us about the students they take? | ¿podrían hablarnos de los estudiantes que aceptan?' if taught), or delete both if the basket floor allows.  
  Moves with it: S0434L02U04
- **Seed 440 · S0440L02U01**: I want to do it while still | quiero hacerlo mientras todavía  
  LEGO S0440L02 'while still | mientras todavía' is a fragment; its USE rows stop dead after it ('I want to do it while still'), which P7 forbids, and the completing chunk ('they're still young') is the NEXT LEGO.  
  **Proposal:** Grow S0440L02 to 'while I'm still young | mientras todavía soy joven' (or merge it with L03), and rewrite U01-U06 as the second read suggested ('I want to do it while I'm still young | quiero hacerlo mientras todavía soy joven', etc.), checking 'soy/eres/son' are taught. B04 and U05 of L03 then add 'they're' in English.  
  Moves with it: S0440L02U02, S0440L02U03, S0440L02U04, S0440L02U05, S0440L02U06
- **Seed 447 · S0447**: will they be able to drive us home after the meal? | ¿Podrán llevarnos a casa después de la comida?  
  Seed 447 says 'drive us home'; its LEGO S0447L03 and the Spanish 'llevarnos a casa' say 'take us home'.  
  **Proposal:** Seed 447 English → 'will they be able to take us home after the meal?' and its seed-sentence row S0447L03U01 the same (English only).  
  Moves with it: S0447L03U01
- **Seed 450 · S0450**: no they have to catch the train themselves | no, ellos tienen que coger el tren  
  Seed 450 English 'themselves' has no Spanish counterpart.  
  **Proposal:** Seed 450 English → 'no, they have to catch the train' (English only).
- **Seed 461 · S0461L03B04**: knowing where I can buy | saber donde pueda comprar  
  LEGO S0461L03 'where I can | donde pueda' is a subjunctive taught as a plain 'where I can'; 'saber donde pueda comprar' is wrong (needs 'dónde puedo').  
  **Proposal:** Grow S0461L03 to carry its trigger from the seed (K40), e.g. 'somewhere I can | algún sitio donde pueda', and check its basket.
- **Seed 469 · S0469L02**: we can | podamos  
  LEGO 'we can | podamos' teaches a subjunctive as plain 'we can'.  
  **Proposal:** Grow S0469L02 to take its trigger from the seed ('doesn't mean that we can | no significa que podamos', or 'that we can | que podamos') and check the basket.
- **Seed 480 · S0480**: whatever he says it's not far ahead now | diga lo que diga, ya no queda mucho  
  Seed/LEGO gloss: 'it's not far ahead now' is spatial and not what 'ya no queda mucho' means.  
  **Proposal:** Re-gloss S0480L02 (and seed 480) English from 'it's not far ahead now' to 'it's not long now' ('ya no queda mucho' = not much left / not long to go); English-only change across B01, U02, U03, U05, U06 and the intro.  
  Moves with it: S0480L02, S0480L02B01, S0480L02U02, S0480L02U03, S0480L02U05, S0480L02U06
- **Seed 482 · S0482L01B01**: they're not serious | no estén hablando en serio  
  LEGO S0482L01 'they're not serious | no estén hablando en serio' is a subjunctive with no trigger; B01-B03 use it as a plain statement, which is ungrammatical.  
  **Proposal:** Grow S0482L01 to carry the seed's trigger (K40), e.g. 'I hope they're not serious | espero que no estén hablando en serio', and rebuild B01-B03.  
  Moves with it: S0482L01B02, S0482L01B03
- **Seed 483 · S0483**: life isn't easy but it's not meant to be easy | la vida no es fácil pero no tiene que ser fácil  
  'not meant to be' ≠ 'no tiene que ser' (doesn't have to be).  
  **Proposal:** Re-gloss seed 483 / LEGO S0483L03 'not meant to be' → 'doesn't have to be' (= 'no tiene que ser'), and seed 484 / S0484L02 'it's meant to be' → 'it has to be' (= 'tiene que ser'); English-only across all rows below and both intros. ('se supone que' would be the other route, but it is untaught.)  
  Moves with it: S0483L03, S0483L03B01, S0483L03B02, S0483L03B03, S0483L03U01, S0483L03U02, S0483L03U03, S0483L03U04, S0483L03U05, S0484, S0484L02
- **Seed 493 · S0493**: what's going to come next? | ¿Qué viene después?  
  Seed 493 English 'what's going to come next?' but Spanish '¿Qué viene después?' (present); the seed's own LEGO S0493L02 is 'va a venir'.  
  **Proposal:** Seed 493 Spanish → '¿Qué va a venir después?' (tiles its LEGO) or English → 'what comes next?'.
- **Seed 501 · S0501**: if only I could trust you to play together without arguing | si tan solo pudiera confiar en que jugarais juntos sin discutir  
  Seed 501 / LEGO S0501L02 'you played | jugarais' is vosotros (you all) with no plural in the English.  
  **Proposal:** English → 'you all' in seed 501 and S0501L02 ('if only I could trust you all to play together without arguing'; 'you all played | jugarais').  
  Moves with it: S0501L02
- **Seed 505 · S0505L02**: I don't stay | no me quede  
  LEGO S0505L02 English 'I don't stay' vs its intro 'I don't get'; U03 'es bueno para que no me quede' is unnatural.  
  **Proposal:** Settle the gloss against seed 505, make the intro quote it, and rebuild U03.  
  Moves with it: S0505L02U03
- **Seed 509 · S0509L01**: I heard | escuché  
  Seed 509 Spanish 'oí que vas a pagar una cama nueva' but LEGO S0509L01 is 'escuché' and S0509L03 'por una cama nueva': neither tiles the seed.  
  **Proposal:** Make seed and LEGOs agree: either seed → 'escuché que vas a pagar por una cama nueva' or LEGOs → 'oí' / 'una cama nueva'. B01, U01 follow.  
  Moves with it: S0509L03, S0509L03B01, S0509L03U01
- **Seed 510 · S0510L01**: she's gone to | se ha ido a  
  Seed 510 'ha ido a buscar un sitio seguro' vs LEGOs 'se ha ido a' and 'buscar un lugar seguro': they do not tile the seed.  
  **Proposal:** Make seed 510 and S0510L01/L02 agree (seed → 'se ha ido a buscar un lugar seguro' is the smallest change).  
  Moves with it: S0510L02
- **Seed 512 · S0512L01B02**: can you hold that? | ¿puedes mantener eso?  
  LEGO 'can you hold | ¿puedes mantener' is right in the seed ('mantener la puerta abierta' = hold the door open) but its phrases use it for holding an object, which is 'sujetar'.  
  **Proposal:** P24: keep the LEGO, make every phrase supply the 'keep X open/closed/ready' frame (e.g. '¿puedes mantener la ventana abierta?'), or re-gloss the LEGO 'can you keep'. B02-B04, U01-U05 follow.  
  Moves with it: S0512L01B03, S0512L01B04, S0512L01U01, S0512L01U02, S0512L01U03, S0512L01U04, S0512L01U05
- **Seed 515 · S0515L02**: the new year | año nuevo  
  LEGO 'the new year | año nuevo' — the article sits in L01's 'del'.  
  **Proposal:** Re-gloss S0515L02 English to 'new year' and check B01.  
  Moves with it: S0515L02B01
- **Seed 520 · S0520L01**: None | None  
  LEGO 'it might have happened | podría haberle pasado' carries 'le' (to him/her), which only makes sense with the seed's 'a toda la familia'.  
  **Proposal:** Grow S0520L01 to take 'to the whole family' or cut 'le' from it ('podría haber pasado' needs 'haber' taught); B01-B04, U01-U05 and S0521L01U06 follow.  
  Moves with it: S0520L01B01, S0520L01B02, S0520L01B03, S0520L01B04, S0520L01U01, S0520L01U02, S0520L01U03, S0520L01U04, S0520L01U05, S0521L01U06
- **Seed 521 · S0521L02U04**: you'll forget why it was before | olvidarás por qué fue antes  
  'you'll forget why it was before' means nothing, but the basket S0521L02 is at its USE floor.  
  **Proposal:** Write two new USE rows for S0521L02 from taught words ('you'll forget why you came here | olvidarás por qué viniste aquí' if taught), then delete U04 and U05.  
  Moves with it: S0521L02U05
- **Seed 524 · S0524**: I'll call you back in three or four minutes | te llamaré en tres o cuatro minutos  
  Seed 524 'I'll call you back' vs 'te llamaré' (no 'back'); the intro of S0524L01 also says 'call you back'.  
  **Proposal:** Seed 524 English → 'I'll call you in three or four minutes'; S0524L02U06 the same; re-voice the S0524L01 intro.  
  Moves with it: S0524L01, S0524L02U06
- **Seed 526 · S0526L01U01**: I'm finding it hard to believe it was here | me está costando creer que fue aquí  
  'me está costando creer que fue…' needs the subjunctive 'fuera' (disbelief), which is untaught at seed 526.  
  **Proposal:** Either allow 'fuera' here (seed 526 itself uses the subjunctive 'puedas') or rewrite U01-U04 with 'puedas'-type frames, or delete down to the floor.  
  Moves with it: S0526L01U02, S0526L01U03, S0526L01U04
- **Seed 528 · S0528**: I'm probably supposed to keep those things in another room | probablemente debería guardar esas cosas en otra habitación  
  Seed 528 'I'm probably supposed to' vs 'probablemente debería' (should).  
  **Proposal:** Seed 528 English → 'I should probably keep those things in another room' (English only).
- **Seed 534 · S0534**: let's not go outside in this dreadful weather | no salgamos con este tiempo tan horrible  
  Seed 534 Spanish drops 'fuera', which its own LEGO 'no salgamos fuera' has.  
  **Proposal:** Seed 534 Spanish → 'no salgamos fuera con este tiempo tan horrible'.
- **Seed 538 · S0538L01U04**: I don't want to seem to everyone | no quiero parecer para todos  
  'I don't want to seem to everyone' is incomplete, and S0538L01 is at its USE floor.  
  **Proposal:** Complete it from taught words (e.g. 'I don't want to seem rude to everyone' if an adjective is taught) or write a replacement USE row and delete it.
- **Seed 544 · S0544L02U03**: it would be difficult beforehand | que sería difícil antes  
  LEGO S0544L02 'it would be difficult | que sería difícil' carries a 'que' with no English counterpart, so its rows start with a stray 'que'.  
  **Proposal:** Re-gloss to 'that it would be difficult | que sería difícil' and check the basket.
- **Seed 557 · S0557L02**: they wouldn't play | no pusieran música  
  LEGO split: 'they wouldn't play | no pusieran música' carries 'música' with no English counterpart, while L03 'such loud music | tan alta' has 'music' in English only.  
  **Proposal:** Re-gloss S0557L02 to 'they wouldn't play music | no pusieran música' and S0557L03 to 'such loud | tan alta' (or move música to L03: 'they wouldn't play | no pusieran' + 'such loud music | música tan alta', which matches the seed's word order better). Either way fix the L02 basket English (B01-B04, U01 add 'music') or the L03 build rows (B01, B04 add música), and re-voice both intros.  
  Moves with it: S0557L02B01, S0557L02B02, S0557L02B03, S0557L02B04, S0557L02U01, S0557L03, S0557L03B01, S0557L03B04
- **Seed 567 · S0567L03B02**: I'm sure that watching the children play | estoy seguro de que viendo a los niños jugar  
  'viendo a los niños jugar' is only right in the seed's frame (after 'pasar tiempo'); this row has no predicate and the gerund cannot be its subject.  
  **Proposal:** P24: keep the LEGO and give every phrase under it the frame: e.g. B02 'we spend a lot of time watching the children play | pasamos mucho tiempo viendo a los niños jugar', B03 'I love spending time watching the children play | me encanta pasar tiempo viendo a los niños jugar', B04 delete, U03 'it's been lovely spending time watching the children play | ha sido encantador pasar tiempo viendo a los niños jugar'. Needs a taught-forms check on pasamos.  
  Moves with it: S0567L03B03, S0567L03B04, S0567L03U03
- **Seed 571 · S0571**: I'm not convinced that would be a very good idea | no estoy convencido de que eso sería una muy buena idea  
  Seed: 'no estoy convencido de que eso sería…' — a negated belief takes the subjunctive ('fuera').  
  **Proposal:** Seed 571 Spanish → 'no estoy convencido de que eso fuera una muy buena idea' (and its seed-sentence USE row S0571L01U06); 'fuera' is a new form, which a seed may introduce (Kai 19 Oct).  
  Moves with it: S0571L01U06
- **Seed 573 · S0573L02**: that makes | que hace que  
  LEGO 'that makes | que hace que' does not tile the seed 'que hace las vacaciones muy especiales' and the extra 'que' would demand a subjunctive clause.  
  **Proposal:** Re-cut S0573L02 to 'that makes | que hace' and check its 8 phrases.
- **Seed 575 · S0575**: It's been upsetting | ha sido frustrante  
  'upsetting' (distressing) is not 'frustrante' (frustrating); seed 576 shows the sense is frustration with waiting.  
  **Proposal:** Re-gloss seed 575 and LEGO S0575L01 to 'it's been frustrating | ha sido frustrante', seed 576 to 'it has been very frustrating waiting', and the 8 rows under S0575L01 (B01-B03, U01-U05) the same way; re-voice the intro. English-only change: no new Spanish audio.  
  Moves with it: S0575L01, S0575L01B01, S0575L01B02, S0575L01B03, S0575L01U01, S0575L01U02, S0575L01U03, S0575L01U04, S0575L01U05, S0576
- **Seed 585 · S0585L02**: the bedroom window | la ventana de mi dormitorio  
  LEGO 'the bedroom window | la ventana de mi dormitorio' adds 'mi' with no English counterpart.  
  **Proposal:** Re-gloss S0585L02 English to 'my bedroom window' (English-only), fix its phrases (U03, U05 and any other) and S0596L01U07; re-voice the intro.  
  Moves with it: S0585L02U03, S0585L02U05, S0596L01U07
- **Seed 592 · S0592L02U04**: she was along the main road | estaba a lo largo de la carretera principal  
  'she was along the main road' is not English and 'estaba a lo largo de' is odd Spanish; the fix needs a motion verb ('caminó') that is untaught, and the basket is at its USE floor so it cannot simply go.  
  **Proposal:** Accept 'caminó' as a one-row exception ('she walked along the main road | caminó a lo largo de la carretera principal') or write a new USE row for S0592L02 from taught words and then delete this one.
- **Seed 599 · S0599L04**: you'd told | hubieras  
  LEGO 'you'd told | hubieras' is only the auxiliary; 'dicho' and 'me lo' sit outside it, so the build rows end mid-verb.  
  **Proposal:** Re-cut S0599L04 to 'if you'd told me | si me lo hubieras dicho' and rebuild B02/B03 around it; re-voice the intro.  
  Moves with it: S0599L04B02, S0599L04B03
- **Seed 604 · S0604L01**: she offered | ofreció  
  LEGO 'she offered | ofreció' drops the 'se' the seed needs ('se ofreció a' = volunteered).  
  **Proposal:** Re-cut S0604L01 to 'she offered | se ofreció' (or 'she offered to | se ofreció a') and check its phrases.
- **Seed 620 · S0620L01**: a very long time | muchísimo  
  LEGO 'a very long time | muchísimo' has no 'tiempo'; the phrases use 'muchísimo tiempo'.  
  **Proposal:** Grow S0620L01 to 'a very long time | muchísimo tiempo' (it tiles the seed 'hace muchísimo tiempo'), re-voice its intro.
- **Seed 642 · S0642L02**: you feel madam | se siente  
  LEGO 'you feel madam | se siente' carries 'madam' in English only (madam is its own LEGO, S0642L01).  
  **Proposal:** Re-gloss S0642L02 English to 'you feel', fix B01, re-voice the intro. Same pattern: S0646L01 'you're doing sir', S0651L01 'you think sir', S0653L01 'does it matter to you sir'.  
  Moves with it: S0642L02B01, S0646L01, S0651L01, S0653L01
- **Seed 658 · S0658**: Do you all want? | ¿Queréis todos?  
  Seed 658 'Do you all want? | ¿Queréis todos?' has no object on either side.  
  **Proposal:** Seed 658 → 'Do you all want it? | ¿Lo queréis todos?' and its seed-sentence row S0658L01U01; 'lo' is taught.  
  Moves with it: S0658L01U01
- **Seed 668 · S0668L01**: None | None  
  LEGO 'you all can | podáis' teaches a subjunctive without its trigger; alone it should be 'podéis'.  
  **Proposal:** Grow S0668L01 to 'I hope you'll all be able to | espero que podáis' (K40), fix B01 and the basket, re-voice the intro.  
  Moves with it: S0668L01B01

**LEGO intros that do not quote their LEGO**, from reading all 1,314 intro lines through Popty: S0069L01 says 'young' for 'the dog'; S0505L02 says 'I don't get' for 'I don't stay'; S0531L01 says 'whoever' for 'anyone'; S0524L01 says 'call you back' for 'I'll call you'; S0432L01's 'as in' line ('we want you to ask') does not contain 'you ask'; S0529L01 adds a '?'. Each needs its intro re-voiced.

## NEEDS-NATIVE: questions for Deborah

1. Is 'aprender cómo hablar' natural Spanish for 'learn how to speak' (e.g. 'Quiero aprender cómo hablar español', '¿Cuánto tiempo llevas aprendiendo cómo hablar?'), or should it always be 'aprender a hablar'?  
   *(rows: S0003L03U06, S0033L02U02, S0033L02U05)*
2. Is 'disfrutar' + infinitive natural, e.g. 'No disfruto despertarme cuando estoy cansado', 'No disfruto parar en medio de algo', 'estoy disfrutando aprender mucho', or must it be 'disfruto despertándome' / 'disfruto de despertarme'?  
   *(rows: S0055L01B03, S0055L01B05, S0055L01U01, S0055L01U03, S0108L02U09, S0110L03U11)*
3. Is 'Es importante tomar tiempo para ponerte a prueba' natural, or must it be 'tomarte el tiempo para...' (and 'no quería tomar demasiado tiempo para contestar' vs 'tardar demasiado en contestar')?  
   *(rows: S0065, S0078L01U11, S0084L01U09)*
4. Is 'te agradezco por ayudarme' natural Spanish, or should it be 'te agradezco que me ayudes' / 'gracias por ayudarme'?  
   *(rows: S0142)*
5. Is 'disfrutar' + bare infinitive natural ('Disfruto hablar contigo', 'No disfruto comer cuando me siento cansado'), or should these be 'disfruto hablando' / 'disfruto de hablar'?  
   *(rows: S0216L04U14, S0243L03U08)*
6. The course says 'practicar hablando' for 'practise speaking' in about 143 phrases (seed 228: 'ese hombre acaba de empezar a practicar hablando'). Is that natural, or should it be 'practicar a hablar' / 'practicar la conversación' / something else?  
   *(rows: S0228, S0228L01U16)*
7. In 'Quería dárselo a mi padre antes de irse' (I wanted to give it to my father before HE left), is 'antes de irse' acceptable, or must it be 'antes de que se fuera'?  
   *(rows: S0241L01U04)*
8. Is 'Es lo mismo de lo que estábamos hablando antes' (it's the same thing we were talking about) natural, or should it be 'Es lo mismo que estábamos diciendo antes' / 'Es de lo que estábamos hablando antes'?  
   *(rows: S0243L02B04)*
9. LEGO S0283L01 teaches 'which = cuáles' and its builds say 'Cuáles cosas', 'Cuáles ideas', 'Cuáles palabras' (and 'quiero descubrir cuáles ideas son más importantes'). Is 'cuáles + noun' acceptable, or must it be 'qué cosas / qué ideas'?  
   *(rows: S0283L01B02, S0283L01B06, S0283L01B07, S0283L01U07)*
10. LEGO S0288L03 'who like watching television | que les gusta ver la televisión' gives 'personas que les gusta…'. Standard is 'personas a las que les gusta'. Is 'que les gusta' acceptable spoken Spanish for a course, or should the LEGO become 'a las que les gusta ver la televisión'?  
   *(rows: S0288L03B01, S0288L03B03, S0288L03B04, S0288L03U04, S0288L03U08, S0288L03U09, S0288L03U12, S0288L03U14)*
11. 'this evening': the course has 'esta tarde' in many rows (LEGO S0018L04 'this evening | de la tarde') and 'esta noche' in others (#261). Which should 'this evening' be in a sentence like 'quiero salir esta tarde/noche' — and is 'esta tarde' for 'this evening' natural in Spain?  
   *(rows: S0298L02B06, S0298L02U17, S0299L01U01, S0349L01U05)*
12. Ordering in a restaurant: '¿podríamos tener una botella de vino tinto?' / '¿puedo tener…?' — acceptable, or must it be '¿nos trae…?' / '¿me pone…?'  
   *(rows: S0414L02U01, S0414L02U04)*
13. Seed 416 'quieren liderar el camino el año que viene' — natural, or 'abrir/marcar el camino'?  
   *(rows: S0416)*
14. Seed 419 'si quieren que la gente les aprecie' uses 'les' for a direct object (leísmo). Keep 'les', or change to 'los aprecie' everywhere?  
   *(rows: S0419L02B02, S0419L02B03, S0419L02U01, S0419L02U04)*
15. Seed 437 and 17 phrases say 'para caridad' / 'a caridad' with no article ('quiero hacer algo para caridad', 'dar lo máximo posible a caridad'). Would you say 'para la caridad', 'para caridad', or 'con fines benéficos'? And is 'una buena caridad' (a good charity) possible, or only 'una buena causa'?  
   *(rows: S0437, S0437L01B02, S0437L01B03, S0437L01B04, S0437L01U01, S0437L01U02, S0437L01U03, S0437L01U04, S0437L01U05, S0437L01U06, S0437L02B03, S0437L02U02, S0437L02U04, S0437L02U05, S0437L02U06, S0437L03B03, S0437L03U01, S0437L03U04)*
16. LEGO 'how high | hasta qué altura': is '¿hasta qué altura es?' natural for 'how high is it?', or should the LEGO be 'qué altura' ('¿qué altura tiene?')?  
   *(rows: S0470L01B02, S0470L01U03, S0470L01U04)*
17. Seed 604: 'Ella se ofreció a dejarnos quedarnos con ella' or 'dejarnos quedar con ella' — which would you say?  
   *(rows: S0604)*

## Gaps (honest)

- **Structural defects were not hunted.** The detector is calibrated for language and meaning (86% recall). Containment, ZUT and untaught-form problems surfaced only where they came with a language error.
- **The rate is a floor.** About 14% of language defects slip past the detector, and FALSE judgements are ours. Spanish is not Kai's language: 64 rows wait for Deborah.
- **Intro mirror check:** the committed `tools/check-intro-mirror.cjs` fails on spa_for_eng with a database error (`uuid ~* unknown`), so intros were checked by reading each line through Popty's presentation route instead.
- **17 second-read confirmations had garbled ids.** The 8 that were intros are covered above; the 9 seed-level ones are covered by their seed's own entries.
- **Nothing is applied.** No audio has been made, and the numbers in the 'after' column describe the course once the CLEAR list is applied.
- Machine outputs (snapshots, raw model reads) are in `~/ssi-evidence/ssi-dashboard-v7/ops/spa-wide-255/` on watson-1. The harness and triage decisions are on branch `cs/255-spa-wide-grammar-sweep`.