# spa_for_eng — fix proposals, seeds 250–300

Live DB (Supabase, `course_practice_phrases`), read 2026-08-24. **Proposal only — nothing written.**
All 971 `use` phrases in seeds 250–300 read line by line by four independent readers (#260 250–262, #261 263–275, #262 276–288, #263 289–300), then every claim re-checked verbatim against the DB by me. One reader claim (S0281L04U01) was a misquote and is dropped.

**Audio column:** every single row below is `status=released` with both `target1_audio_id` and `target2_audio_id` populated (Elvira, es-ES). So the answer is the same for all of them: **YES — the defect is in shipped audio and any text fix needs a re-render.** I have not repeated it per row; treat "audio = regen required" as universal here.

**Consistency column:** `✓` = every word/form in my proposed Spanish already appears in the course before this seed. `⚠ sN` = the fix needs a form the course does not use until seed N (or never) — i.e. it is new material at this point and needs Deborah's call on wording, not just yes/no.

---

## LIST A — UNAMBIGUOUS DEFECTS (dropped clause / wrong word / wrong person / broken Spanish)

| seed | id | ENGLISH as it stands | SPANISH as it stands | what is wrong | PROPOSED SPANISH | consistency |
|---|---|---|---|---|---|---|
| **267** | L01U11 | I know you've had news from your friend **so I won't worry** | Sé que has tenido noticias de tu amigo **así que no** | sentence stops mid-clause | Sé que has tenido noticias de tu amigo así que no me voy a preocupar | ✓ (`me preocupo` s46) |
| **285** | L01U11 | She speaks with my friends when they come here to practise | **No estoy listo para hablar con personas que no conozco todavía pero ella habla con ellos** | completely different sentence | Ella habla con mis amigos cuando están aquí para practicar | ✓ |
| **285** | L01U14 | …and she speaks **too fast** | …y ella habla **bien** | says the opposite | …y ella habla demasiado rápido | ✓ (`rápido` s50, `demasiado` s27) |
| **282** | L02U01 | That is not a problem when you are working on something difficult | No es un problema cuando trabajas en algo difícil **con ellos** | adds "with them" (copied from s230) | No es un problema cuando trabajas en algo difícil | ✓ (deletion) |
| **295** | L01U11 | I said I wanted to see you **before you left for the weekend** | Dije que quería verte **antes del fin de semana** | drops "you left"; identical Spanish to s295 L01U04 ("before the weekend") → one Spanish, two Englishes | *needs Deborah* — `te fueras` / `te vayas` never used in past sense here | ⚠ never |
| **291** | L02U06 | It is not easy… but possible **if you practise often** | …pero **es posible practicar a menudo** | conditional clause dropped, meaning inverted | …pero es posible si practicas a menudo | ⚠ `practicas` never |
| **291** | L02U10 | **I** hope to finish soon | Así que espero que **termines** pronto | wrong person — says "you finish" | Así que espero terminar pronto | ⚠ `terminar pronto` never (words known) |
| **291** | L02U02 | …to talk with **anyone I meet** | …para hablar con **personas que conozco** | opposite sense — "people I already know" | *needs Deborah* (`cualquier` s531, `conozca` never) | ⚠ s531 |
| **291** | L02U11 | …is something that **can take time and practise** | …es algo **que quiero y** que puede llevar tiempo | adds "that I want", drops "and practise" | Sé que poder hablar mejor pronto es algo que puede llevar tiempo | ✓ (drops "and practise" — flag) |
| **254** | L01U11 | **I told him** I have been ready since this morning… | **Él dijo que** estoy listo desde esta mañana… | subject swapped | Le dije que estoy listo desde esta mañana y estoy empezando a sentirme cansado | ✓ |
| **263** | L01U14 | …but **he** used to work in an office | …pero **mi amigo** trabajaba en una oficina | wrong person — contradicts "I don't know who you mean" | No sé a quién te refieres pero él trabajaba en una oficina | ✓ (`él` s16) |
| **263** | L01U10 | …the man you were talking to yesterday **was trying** to help me | …ayer **está intentando** ayudarme | past → present | …ayer estaba intentando ayudarme | ✓ (s102) |
| **262** | L03U09 | …because **he was trying** to help me | …porque **el hombre está intentando** ayudarme | wrong noun + past → present | …porque estaba intentando ayudarme | ✓ |
| **262** | L03U02, U03, U06, U09, U11, U13 (6 rows) | I can't remember / I know / I knew **who you were talking to** | …**con el que** estabas hablando | ungrammatical in an indirect question | …**con quién** estabas hablando | ✓ (`con quién` already correct in s262 L03U01) |
| **275** | L01U02 | She told me she **needs** longer | Ella me dijo que **quiere** más tiempo | wants ≠ needs | Ella me dijo que necesita más tiempo para aprender cómo decir todo | ✓ (`necesita` s109) |
| **275** | L01U05 | …what he **thinks** about everything | …lo que **quiere** sobre todo esto | wants ≠ thinks (and duplicates "quiere") | *needs Deborah* — `piensa` (3rd person) not used until s651 | ⚠ s651 |
| **285** | L01U06 | **I know** she speaks very well | **Creo que** ella habla muy bien | I think ≠ I know | Sé que ella habla muy bien pero todavía puede cometer errores | ✓ (`sé que` s72) |
| **285** | L01U10 | …and **she knows that** | …y **ella lo hace** | she does it ≠ she knows that | …y ella lo sabe | ⚠ s290 (5 seeds later) |
| **272** | L03U12 | …because that is **always** the best way | …porque **pienso que** eso es lo mejor | drops "always", adds "I think" | …porque eso siempre es lo mejor | ✓ (`siempre` s181) |
| **277** | L01U03 | …and **everyone was happy** with it | …y que **estaba contento** con eso | plural → singular, wrong subject | …y que todos estaban contentos con eso | ⚠ `estaban` s449 |
| **277** | L01U10 | **She asked if we could** talk after the meeting because she **wants** to | **Ella dijo que quería** hablar… porque **quería** | asked→said, "if we could" dropped, tense | Ella preguntó si podíamos hablar después de la reunión porque quiere decirme algo importante | ⚠ `podíamos` s412 |
| **274** | L03U10 | …and **we** can speak again then | …y hablar **contigo** de nuevo | wrong person | …y podemos hablar de nuevo | ⚠ `podemos` s277 (3 seeds later) |
| **281** | L01U07 | Does it matter to you that **it takes** too long to answer? | ¿Te importa si **llevas** demasiado tiempo para contestar? | impersonal → "you take" | ¿Te importa si lleva demasiado tiempo contestar? | ✓ |
| **281** | L01U10 | Does it matter to you if **I do it** differently? | ¿Te importa si **quiero hacerlo** de manera diferente? | adds "want to" | ¿Te importa si lo hago de manera diferente? | ✓ (`lo hago` s190, `manera` s94) |
| **281** | L03U13 | …when I have time to relax **for a while** | …cuando tengo tiempo para relajarme **bien** | wrong word ("well" for "a while") | …cuando tengo tiempo para relajarme un rato | ✓ (`un rato` s92) |
| **281** | L04U11 | …before you start **to think** about… | …antes de que empieces **pensar** en… | missing `a` — ungrammatical | …antes de que empieces a pensar en lo que quieres decir | ✓ |
| **282** | L02U15 | …but I think **we can find a way** to fix it | …pero pienso que **puedo ayudar** a arreglarlo | different content | …pero pienso que podemos encontrar una manera de arreglarlo | ⚠ `podemos` s277 (5 seeds earlier — OK) ✓ |
| **283** | L03U05 | People who speak Spanish often are **very interesting to talk to** | …son muy **interesante hablar** | broken Spanish (agreement + missing preposition) | …son muy interesantes para hablar con ellas | ⚠ `con ellas` never |
| **283** | L01U06 | …which ones are **best** | …cuáles son **los mejor** | not a Spanish form | …cuáles son los mejores | ⚠ `mejores` never |
| **286** | L01U04 | She knows people who like to learn **and tries to help them** | …y **intentar ayudar** | broken (bare infinitive), "them" dropped | *needs Deborah* — `ayudarles`/`ayudarlas` never used | ⚠ never |
| **288** | L03U04, U08, U14 (3 rows) | …knows/know people **who like** watching television | …conoce/conozco **personas que les gusta**… | missing personal `a` + relative article | …**a personas a las que les gusta**… | ✓ (correct form used at s287 L02U07) |
| **289** | L02U12 | I wonder if **the meeting** is going to be ready | …si **la reunión** va a estar **listo** | gender agreement | …va a estar lista… | ⚠ `lista` s345 |
| **253** | L01U02 | **She** said she should be ready in a few minutes | Ella dijo que debería estar **listo** | gender agreement | …debería estar lista… | ⚠ `lista` s345 |
| **257** | L02U04 | I like that blue thing, although **it's a little unusual** | …aunque es un poco **raro** | agreement with `cosa` (fem) | …aunque es un poco rara | ⚠ `rara` never |
| **290** | L02U14 | **He knows** the people here | **Él sabe** las personas aquí | `saber` used for knowing people | Él conoce a las personas aquí a las que les gusta practicar a menudo | ✓ (`conoce` s233) |
| **295** | L03U03 | …so there is **nothing to worry about** | …así que **no hay nada que preocuparte** | ungrammatical | …así que no me preocupo | ✓ (s46) |
| **297** | L03U13 | Do you know **anyone** who speaks Spanish? | ¿Conoces a alguien que **hablen** español…? | singular/plural agreement | …que hable español… | ⚠ `hable` s532 |
| **297** | L04U12 | …but those I know are very **useful** | …son muy **útil** | plural agreement | …son muy útiles | ✓ (`útiles` s283) |
| **298** | L02U02, U09, U12, U20 (4 rows) | I have nothing left **to say to you** (…this morning / today / this afternoon) | …nada que **decir contigo**… | "say WITH you" — ungrammatical | …nada que **decirte**… | ✓ (`decirte` s235) |
| **299** | L01U04 | She wants to pay but **I want to pay too** | Ella quiere pagar pero **quiero pagar** | "too" dropped — the contrast is lost | Ella quiere pagar pero yo también quiero pagar | ✓ (`también` s262) |
| **299** | L03U07 | …so that **the others** do not have to pay everything | …para que **no tenga** que pagar todo | plural subject dropped, verb singular | …para que los demás no tengan que pagar todo | ⚠ `tengan` s532 |
| **300** | L03U14 | …the people **who work** with her | …las personas **que trabaja** con ella | agreement | …que trabajan con ella | ⚠ `trabajan` never |
| **259** | L01U16 | A better idea would be to think **more** carefully | Una idea mejor sería pensar **en eso** con cuidado | adds "about that", drops "more" | Una idea mejor sería pensar con más cuidado | ✓ |
| **252** | L02U08 | I really need you **to say** when you will be ready | …necesito que me **quieras decir** cuándo… | adds "want to" | De verdad necesito que me digas cuándo estarás listo para empezar | ✓ (`digas` s249) |

**Row count:** 44 defective phrases (several rows are families sharing one defect).
**Seeds that would be unapproved by applying all of List A: 26** — 252, 253, 254, 257, 259, 262, 263, 267, 272, 274, 275, 277, 281, 282, 283, 285, 286, 288, 289, 290, 291, 295, 297, 298, 299, 300.
**Audio:** all 44 rows have released shipped audio → 44 clips (×2 target takes) to re-render after any text change.

### Reverse-ZUT check (one Spanish serving two Englishes — the defective direction)
Only **one** collision inside 250–300 that is a real defect: `Dije que quería verte antes del fin de semana` serves both s295 L01U04 ("before the weekend") and s295 L01U11 ("before you left for the weekend"). The other 250–300 collisions are contraction variants ("don't"/"do not", "she's"/"she is") and are harmless. Course-wide there are 31 such collisions; I have not adjudicated the ones outside 250–300.
The opposite direction (same English → different Spanish) is present and, as you say, acceptable technique.

---

## LIST B — ARGUABLE. **No fixes proposed. Questions for Deborah.**

| seed | id | ENGLISH | SPANISH | the question |
|---|---|---|---|---|
| 252 / 279 / 295 | L01U07 / L02U08 / L01U10 | "before **the end of the week**" / "before **the week was over**" | antes del **fin de semana** | Is "fin de semana" acceptable for "end of the week", or is it strictly "weekend"? Affects at least 3 phrases. |
| 279 | L02U03 | There was still a little time left before I **had to** leave | …antes de que **tenga** que irme | sequence of tenses — should a past main clause force `tuviera`? |
| 295 | L02U10 | Nobody said we **needed** to finish in a day | Nadie dijo que **tenemos** que terminar | reported speech: is keeping the present acceptable in speech? |
| 281 | L03U04, L04U04 | Do you mind waiting **until I finish**…? | …hasta que **termino**… | indicative vs subjunctive after `hasta que` for a future event |
| 291 | L01U09, L01U12 | I hope … | Espero que **va a estar** / **quieren** … | indicative after `espero que` — house style or defect? |
| 297 | L03U03, L03U09 | who speak Spanish **and want** to practise | que **hablen** … y **quieren** … | mixed subjunctive/indicative inside one clause |
| 298 | L02U07 | **There is** nothing left to say | **No me queda** nada que decir | impersonal turned personal — real, or fine? |
| 284 | L02U08 | That woman is a good friend **of mine** | …es una buena amiga | drops "of mine"; the fix (`amiga mía`) needs `mía`, unused until s503 |
| 274 | L01U08, L02U10 | this **evening** / **dinner** | esta **tarde** / **comer** | dialect-dependent |
| 252 | L02U07, L02U11 | so I can **also** get ready / when you **would** be ready | para estar listo / **estarás** listo | "también" is not introduced until s262, so it cannot be used at s252 |
| 267 | L01U08 | **When did you have** news from your friend? | ¿Cuándo **has tenido** noticias…? | perfect vs preterite — normal in Spain? |
| 270 | L02U09 | it worries me **to be late** | …**estar tarde** | `estar tarde` vs the `llegar tarde` used elsewhere |
| 275 | L01U06 | before we try to speak **to others** | antes de intentar hablar | is dropping "to others" acceptable compression? |
| 285 | L01U12 | she speaks very well **already** | …ella habla muy bien | dropped "ya" |
| 288 | L01U09, L01U13 | Most of the people … | La mayoría de las personas **trabaja** … | singular agreement with `la mayoría` — traditional, or wrong? |
| 290 | L02U03 | …will show us **when he is here** | …cuando **está** aquí | `cuando` + future reference normally takes `esté` |

---

## Confidence

**One sentence:** I am confident List A contains no false positives for the ~30 rows that turn on broken Spanish, a dropped clause, a swapped person, or a word that says the opposite (`decir contigo`, `con el que`, `así que no`, `ella habla bien`, `los mejor`, `interesante hablar`, `Él dijo` for "I told him", the s285 L01U11 wrong sentence) — these need no native judgement; I am **less** confident about the four smallest omissions/additions (259 `en eso`, 291 L02U11 "and practise", 272 `siempre`, 299 "too"), where a generous reader could call them compression rather than defect, and Deborah should have the final word on the eight rows marked ⚠ where the *correct* Spanish uses a form the course has not yet taught.

## Gaps (honest)
- I swept **seeds 250–300 only**. Seeds 101–249 and 301–500 are **unaudited** and, on the same evidence, likely carry the same ~3.5–4% rate in `use` phrases. Seeds 1–100 are short and probably cleaner but are not verified.
- The 31 course-wide reverse-ZUT collisions outside 250–300 are **not** adjudicated.
- I did **not** listen to the audio. The claim "it is in the shipped audio" rests on `course_audio.text` matching the defective `target_text` exactly for every row I checked — which it does.
