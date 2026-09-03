# spa_for_eng seeds 250–300 — re-classified against the LEGOs

Re-done from scratch under Kai's ruling of 2026-08-24. The test is no longer "does the Spanish match the English" but **would a learner, taught by the LEGOs they have met up to this seed, have produced this Spanish?** Live DB only. No writes, no TTS, proposal only.

I pulled all **742 LEGOs for seeds 1–300** and looked each candidate up against them. Every row below cites the LEGO that excuses it or fails to.

**AUDIO-VS-TEXT — now checked properly, two layers:**
1. *Sent text*: `course_audio.text` vs `course_practice_phrases.target_text` for all 965 phrases in 250–300 → **965 compared, 965 identical, 0 differ**. Calibrated (the comparator does return matches, so the zero is real).
2. *Rendered audio*: I transcribed 15 clips with whisper.cpp `ggml-medium`, Spanish. **Calibration passed 3/3 word-for-word** on clips I had no reason to doubt, then 12 candidates → **all 12 word-for-word. Zero audio-only omissions found.** The only diffs were `listo`→`lista` / `cansado`→`cansada` and punctuation, which the calibration clip proves are ASR artefacts on unstressed final vowels.
   → **The s267 truncation is confirmed in the shipped audio**: the clip really does say "…así que no" and stop.

---

## A — REAL DEFECTS. The LEGOs do not excuse them. (37 phrases, 19 seeds)

### A1. The phrase contradicts a LEGO the learner has already been taught (strongest class)

| seed | id | ENGLISH | SPANISH now | the LEGO that condemns it | PROPOSE |
|---|---|---|---|---|---|
| **267** | L01U11 | …so I won't worry | Sé que has tenido noticias de tu amigo **así que no** | nothing licenses stopping there; S0046L01 "I don't worry about"=`no me preocupo por` | …así que **no me preocupo** |
| **285** | L01U06 | **I know** she speaks very well | **Creo que** ella habla muy bien | S0059L01 "I know"=`sé` — learner would say `Sé que` | **Sé que** ella habla muy bien pero todavía puede cometer errores |
| **281** | L03U13 | …time to relax **for a while** | …para relajarme **bien** | S0219L04 / S0092L03 "a while"=`un rato` — learner would say `un rato` | …para relajarme **un rato** |
| **298** | L02U02, U09, U12, U20 | nothing left **to say to you** | nada que **decir contigo** | S0235L02 "to tell you"=`decirte`; S0298L02 stops at `decir` | nada que **decirte** |
| **295** | L01U11 | …**before you left** for the weekend | …**antes del fin de semana** | S0249L02 "before you go"=`antes de que te vayas` | …**antes de que te vayas** el fin de semana |
| **291** | L02U10 | **I** hope to finish soon | espero que **termines** pronto | S0281L02 "I finish"=`termino` — learner would not say `termines` | Así que espero **terminar** pronto |
| **252** | L02U08 | I really need you **to say** when… | necesito que me **quieras decir** cuándo… | S0249L01 "you to help me"=`que me ayudes`; S0250L01 `decirme` | …necesito que **me digas** cuándo estarás listo para empezar |
| **259** | L01U16 | to think **more** carefully | pensar **en eso** con cuidado | S0037L03 "carefully"=`con cuidado` — `en eso` is added, `más` dropped | pensar **con más cuidado** |
| **272** | L03U12 | because that is **always** the best way | porque **pienso que** eso es lo mejor | no LEGO adds "I think"; `siempre` taught s181 | porque eso **siempre** es lo mejor |
| **282** | L02U01 | …working on something difficult | …en algo difícil **con ellos** | no LEGO adds "with them" (S0016L03 is `con todos los demás`) | …en algo difícil *(delete)* |
| **299** | L01U04 | but I want to pay **too** | pero quiero pagar | `también` taught s262 | pero **yo también** quiero pagar |

### A2. Content the English states and the Spanish does not — no LEGO involved

| seed | id | ENGLISH | SPANISH now | wrong | PROPOSE |
|---|---|---|---|---|---|
| **285** | L01U11 | She speaks with my friends when they come here to practise | **No estoy listo para hablar con personas que no conozco todavía pero ella habla con ellos** | an entirely different sentence | Ella habla con mis amigos cuando están aquí para practicar |
| **285** | L01U14 | …and she speaks **too fast** | …y ella habla **bien** | says the opposite | …y ella habla **demasiado rápido** |
| **291** | L02U06 | …but possible **if you practise often** | …pero es posible practicar a menudo | conditional clause dropped | …pero es posible **si practicas** a menudo *(needs `practicas`, never taught)* |
| **291** | L02U11 | …something that can take time **and practise** | …algo **que quiero y** que puede llevar tiempo | adds "that I want", drops "and practise" | …es algo que puede llevar tiempo |
| **254** | L01U11 | **I told him** I have been ready… | **Él dijo que** estoy listo… | subject swapped | **Le dije que** estoy listo desde esta mañana… |
| **263** | L01U14 | …but **he** used to work in an office | …pero **mi amigo** trabajaba… | wrong person | …pero **él** trabajaba en una oficina |
| **263** | L01U10 | …**was trying** to help me | …**está intentando** ayudarme | past → present (`estaba intentando` taught s102) | …**estaba intentando** ayudarme |
| **262** | L03U09 | …because **he was trying** to help me | …porque **el hombre está intentando** ayudarme | wrong noun + tense | …porque **estaba intentando** ayudarme |
| **281** | L01U07 | …that **it takes** too long to answer | …si **llevas** demasiado tiempo… | impersonal → "you take" | ¿Te importa si **lleva** demasiado tiempo contestar? |
| **281** | L01U10 | …if **I do it** differently | …si **quiero hacerlo**… | adds "want to" | ¿Te importa si **lo hago** de manera diferente? |
| **282** | L02U15 | …**we can find a way** to fix it | …**puedo ayudar** a arreglarlo | different content (S0146L05 `arreglarlo` taught) | …podemos encontrar una manera de arreglarlo |

### A3. Broken Spanish, no LEGO to blame

| seed | id | SPANISH now | wrong | PROPOSE |
|---|---|---|---|---|
| **281** | L04U11 | antes de que empieces **pensar** | missing `a`; S0281L04 lego is sound and ends at `empieces` | …empieces **a** pensar… |
| **283** | L03U05 | son muy **interesante hablar** | ungrammatical; S0051L02 taught `cosas interesantes`, so the plural exists | son muy **interesantes** para hablar con ellas |
| **283** | L01U06 | cuáles son **los mejor** | not a Spanish form | cuáles son **los mejores** *(`mejores` never taught)* |
| **286** | L01U04 | …a las que les gusta aprender **y intentar ayudar** | bare infinitive, "them" dropped; the S0286L01 lego itself is sound | *needs Deborah — `ayudarles`/`ayudarlas` never taught* |

### A4. The ENGLISH is ahead of the LEGOs — the Spanish improvises because it must

These are real defects, but **the honest fix is probably the English prompt, not the Spanish.** The phrase asks the learner for a form the course has not taught yet, so no correct Spanish answer is reachable at that seed.

| seed | id | ENGLISH asks for | Spanish says | the form needed, first taught at |
|---|---|---|---|---|
| **275** | L01U02 | she **needs** longer | `quiere` (wants) | `necesita` — s319 |
| **275** | L01U05 | what he **thinks** | `quiere` (wants) | `piensa` — s651 |
| **277** | L01U03 | **everyone was** happy | `estaba contento` (singular) | `estaban` — s449 |
| **277** | L01U10 | She **asked if we could** talk | `dijo que quería` | `podíamos` — s412 |
| **274** | L03U10 | **we** can speak again | `hablar contigo` | `podemos` — s277 (2 seeds later) |
| **285** | L01U10 | and **she knows** that | `ella lo hace` (she does it) | `sabe` — s290 (5 seeds later) |
| **291** | L02U02 | **anyone I meet** | `personas que conozco` (people I know — opposite) | no LEGO at all |
| **299** | L03U07 | so that **the others** don't pay | `no tenga` (singular, subject dropped) | no LEGO at all |

**Seeds unapproved by A: 19** — 252, 254, 259, 262, 263, 267, 272, 274, 275, 277, 281, 282, 283, 285, 286, 291, 295, 298, 299.
**Audio: all 37 released with both target takes → 37 clips to re-render.**

---

## B — EXCUSED BY THE LEGOs, AND THE LEGO IS SOUND. Not our issue. No fix proposed. Listed for later.

| seed(s) | what looked wrong | the LEGO that excuses it |
|---|---|---|
| 253, 289 | `la reunión va a estar **listo**` / `ella … debería estar **listo**` — gender | S0088L01 "ready"=`listo`; `lista` is never taught before s345, so the learner would say `listo` |
| 257 | `esa cosa azul … un poco **raro**` | S0121L01 "unusual"=`raro` |
| 297 | `los que conozco son muy **útil**` | S0028L01 "it's useful"=`es útil`; `útiles` never taught |
| 300 | `las personas que **trabaja** con ella` | the course never teaches a plural "they work" |
| 252, 279, 295 | "end of the week" / "before the week was over" → `antes del fin de semana` | S0237L02 "before the weekend"=`antes del fin de semana` |
| 298 | "There is nothing left" → `No **me** queda nada` | S0298L02 "I've got nothing left to say"=`no me queda nada que decir` |
| 284 | drops "of mine" | no "of mine" LEGO exists |
| 281, 290, 291, 297, 298 | subjunctive vs indicative after `espero que`, `hasta que`, `cuando`, `como si` | no LEGO teaches the mood alternation either way — house style, not a taught contradiction |
| 274 | "this evening"→`esta tarde`, "dinner"→`comer` | dialect; see D for the s18 LEGO that causes it |

---

## C — EXCUSED BY A LEGO, BUT THE LEGO IS WRONG. **Fix the LEGO, not the phrase.**

| LEGO | ENGLISH | SPANISH taught | why the LEGO is wrong | PROPOSE for the LEGO | phrases it currently produces |
|---|---|---|---|---|---|
| **S0262L03** | who you were talking to | `con el que estabas hablando` | `con el que` is not usable as a free relative after *recordar/saber*; it needs an antecedent | `con quién estabas hablando` | 6 phrases at s262, plus the s263 family |
| **S0297L03** | who speak | `que hablen` | contradicts **S0022L02** ("people who speak"=`personas que hablan`) and **S0283L03** ("they speak"=`hablan`); also forces `alguien que **hablen**` (singular antecedent, plural verb) at s297 | pick one — and if `hablen`, teach the singular `hable` too | ~16 phrases at s297 |
| **S0288L03** | who like watching television | `que les gusta ver la televisión` | missing the `a las que` that **S0286L01** teaches two seeds earlier ("who like"=`a las que les gusta`); the two LEGOs disagree | `a las que les gusta ver la televisión` | 3 phrases at s288 |
| **S0290L02** | he knows | `sabe` | *saber* for knowing people; contradicts **S0233L02** ("she knows"=`conoce`) | `conoce` | 1 phrase at s290 |
| **S0100L01** | to worry | `preocuparte` | teaches a 2nd-person reflexive as the citation form for a bare infinitive; this is what produces `no hay nada que **preocuparte**` at s295 | `preocuparse` (or `preocuparme`) | 1 phrase at s295 |

Fixing these 5 LEGOs unapproves seeds **100, 262, 288, 290, 297** — 4 new seeds beyond the 19 above, so **23 seeds total**.

---

## D — BROKEN LEGOs, no phrase currently harmed (still defects)

| seed | lego_id | ENGLISH | SPANISH | what is wrong | PROPOSE | confidence |
|---|---|---|---|---|---|---|
| 150 | S0150L03 | you are called | `llamas` | missing the reflexive `te` — `llamas` is "you call [something]" | `te llamas` | high |
| 18 | S0018L04 | this evening | `de la tarde` | only works bolted to a clock time; **this is Deborah's "this morning" shape** — the specificity is gone. Contrast S0035L04 "this afternoon"=`esta tarde`, correctly self-contained | `esta tarde` / `esta noche` | medium |
| 154 | S0154L03 | to meet up with **you** | `reunirte` | "with you" is simply absent; `te` is the object clitic, not "with you" | `reunirte conmigo` | medium |
| 74 | S0074L02 | to understand | `a entender` | a bound fragment — only grammatical after `ayudar a`/`empezar a` | `entender` | medium |
| 267 | S0267L01 | heard from | `tenido noticias` | missing `de`; and **no phrase at s267 uses "heard from" on the known side** — they all say "had news from", so the LEGO and its own phrases disagree | `tenido noticias de` | medium |
| 270 | S0270L01 | I am worried | `me preocupa` | `me preocupa` is "it worries me", not "I am worried" | `estoy preocupado` | low-med |
| 103 | S0103L01 | to hear | `escuchar` | `escuchar` is "to listen"; the course itself uses `oír` correctly at S0071L02 | `oír` | low |
| 22 | S0022L03 | to meet people | `conocer a personas` | personal `a` before a bare generic plural | `conocer gente` | low |

---

## Confidence, and one thing I will not paper over

**List A:** I'd defend A1 without reservation — each row contradicts a LEGO the learner has *demonstrably already been given*, which is exactly the betrayal Kai described. A2/A3 are content and grammar deltas needing no native judgement. **A4 I am least sure how you want handled** — those eight are genuinely wrong, but the Spanish is arguably the best reachable answer and the real defect is the English prompt running ahead of the LEGOs; that is a call for you and Deborah, not me.

**A miss I have to report:** worker #270, which swept LEGOs 151–300, reported "no contradicting pairs found". That zero is **wrong** — four of my five C-class contradictions (S0262L03, S0288L03, S0290L02, S0297L03) sit inside its range. Its check only compared *exactly recurring* English strings, so "who like" vs "who like watching television" never met. Do not take that worker's zero as coverage; the C list above is mine, from reading all 742 LEGOs.

**Gaps:** seeds 101–249 and 301–500 phrases are still unswept. The D list covers LEGOs 1–300 only. The ASR check covered 15 clips, not all 965 — it is enough to say audio-only omission is not a *common* mode here, not enough to say it never happens.
