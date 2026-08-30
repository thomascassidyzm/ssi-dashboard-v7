# spa_for_eng full phrase-pair read-through — findings, and why Stage 2 is held

**Status: STAGE 2 HELD. Both re-tests failed. Nothing wide has been dispatched.**

**This job produces THE LIST ONLY.** No fixes have been applied and none are authorised.
Fixing is a separate job requiring Kai's explicit say-so. Every row quoted below was read
back from the live DB on 2026-08-25 and is quoted character-for-character.

---

## 1. The verdicts

| re-test | range | rows read | known-bad rows | found | verdict |
|---|---|---|---|---|---|
| #600 | seeds 150–187 | 1,359 / 1,359 | S0151L03U14 | 0 of 1 | **FAIL** |
| #599 | seeds 230–279 | 1,327 / 1,327 | S0249L02U09, S0277L01U11 | 0 of 2 | **FAIL** |

**0 of 3.** All three known-bad rows were re-read from the live DB and confirmed still
defective and still unfixed before either verdict was recorded. The original calibration
scored 2 of 5; the tightened brief moved nothing on precisely the rows it was tightened for.

Per Kai's standing rule of 2026-08-25, Stage 2 does not go wide.

---

## 2. The root cause — and it is the brief, not the readers

The three rows share one structure that my defect taxonomy had no class for:

| row | seed | English asks for | Spanish says | form actually needed | first taught |
|---|---|---|---|---|---|
| S0249L02U09 | 249 | She **needs** to tell you | `quiere` (wants) | `necesita` | **seed 319** |
| S0277L01U11 | 277 | a **short** meeting | `una reunión` | a standalone adjective "short" | **never** — only ever inside the chunk "in a short time" → `en poco tiempo` (seeds 89, 245) |
| S0151L03U14 | 151 | when **we started** learning | `aprendemos` | 1st-person-plural past of *empezar* | **never** — only `empecé a` (s37, 1sg) and `empezaste` (s79, 2sg) |

**The English prompt demands vocabulary the course has not taught yet, and the Spanish
quietly degrades to what it is able to say.** The Spanish is not careless — at that seed it
is very nearly the best reachable rendering. The defect is on the **known side**.

My brief sent nine defect classes at the *target* side and instructed readers to use the
taught-vocabulary check as a *defence* for Spanish they were suspicious of. Under that
brief a competent reader walks the content words, asks "is this the best Spanish available
from the taught set?", finds that it is, and moves on. **The readers were checking the
wrong side because I told them to.** #599 flagged the row immediately adjacent to one target
(S0277L01U10) and not the target itself — it was looking straight at it.

### This class is already documented in-repo, and I did not look

`docs/spa-for-eng-lego-reclassified-250-300-2026-08-24.md`, written 2026-08-24 under Kai's
own ruling, has this exact class as **section A4 — "The ENGLISH is ahead of the LEGOs — the
Spanish improvises because it must"**, with the note that *the honest fix is probably the
English prompt, not the Spanish*. Its A4 table contains:

> **275** L01U02 — she **needs** longer → `quiere` (wants) — `necesita`, s319

That is the same defect, the same verb, the same substitution and the same diagnosis as
S0249L02U09, recorded the day before I wrote the brief. That doc also frames the test
correctly: *"would a learner, taught by the LEGOs they have met up to this seed, have
produced this Spanish?"* — which is Kai's LEGO rule, stated as the primary question rather
than as a fallback. I should have found it before briefing anyone.

---

## 3. Three errors of mine, recorded

1. **My scoring key was wrong.** All three "proposed corrections" I scored against
   (`necesita`, `una reunión corta`, `empezamos`) themselves violate the taught-vocabulary
   rule at their seeds. I had the diagnosis right — the pairs don't match — and the class
   and the fix wrong.
2. **I leaked a row id into the brief.** The helper's usage example was
   `q.cjs row 'spa_for_eng:S0277L01U11'` — one of the rows #599 had to find. It made no
   difference (#599 missed it anyway) but the run was not cleanly blind. Fixed.
3. **I built the brief without searching the repo for prior art on this course.**

---

## 4. What the two readers did produce — 41 defective pairs

Both read their full ranges sequentially and reported nothing skimmed. Both hit the
fan-out depth ceiling when they tried to split their range, and completed solo. Their
quotes verify: every row I sampled matched the live DB character-for-character.

**Caveat on the fixes:** the proposed Spanish corrections below have **not** all been
checked against taught vocabulary. Spot-checking found `Sé` (s59) and `Pienso que` (s47)
legal, but `podríamos` is not taught until **s413** and `quería` (3sg) does not appear
before seed 234 — so at least two proposed fixes are themselves untaught. **Treat the
"what is wrong" column as the finding and the "proposed" column as a draft.**

### 4a. Seeds 150–187 (job #600) — 12 rows

| phrase_id | seed | English | Spanish | class | what is wrong | proposed | conf |
|---|---|---|---|---|---|---|---|
| S0153L01U04 | 153 | I don't think I have said it very well | No lo he dicho bien | 1 | The "I don't think" hedge and the adverb "very" both vanish; Spanish asserts it as fact. | No pienso que lo he dicho muy bien | high |
| S0182L02U08 | 182 | I want to put my keys here so that I can always find them | Quiero poner mis llaves aquí para poder encontrar mis llaves | 1 | "always" has no counterpart; *siempre* is taught by s181. | …para poder encontrar siempre mis llaves | high |
| S0169L01U13 | 169 | I don't think this is what she wants me to do | No estoy seguro de que esto es lo que quiere que haga | 2 | "don't think" → "no estoy seguro" (not sure); course gloss is *no creo que*. | No creo que esto es lo que quiere que haga | high |
| S0170L02U14 | 170 | I've been thinking about it and I'd like you to tell me what you need | Pienso mucho en eso y me gustaría que me dijeras lo que necesitas | 4 | Present-perfect-continuous flattened to simple present; *mucho* added. | He pensado mucho en eso… | possible |
| S0152L02U15 | 152 | I always think about doing things differently because I want to learn better | A menudo pienso en hacer de manera diferente porque quiero aprender mejor | 1 | "always" → *a menudo* (often). *siempre* not taught until s181 — likely an **A4** sequencing defect. | needs a ruling | possible |
| S0157L02U14 | 157 | …next month as much as possible | …lo más frecuentemente posible | 1 | "as much as possible" (quantity) collapsed onto the gloss for "as often as possible" (frequency). | …todo lo posible | possible |
| S0172L03U03 | 172 | It would be better to start this again | Sería mejor empezar otra vez con eso | 3 | *con eso* has no English counterpart. | Sería mejor empezar otra vez | high |
| S0155L03B05 | 155 | I'd like to meet in the morning | Me gustaría ir a reunirse por la mañana | 5 | Reflexive disagrees with "I"; S0155L03U12 confirms *reunirme*. | Me gustaría reunirme por la mañana | high |
| S0155L03U02 | 155 | I want to go and meet with you in the morning before it gets late | Quiero ir a reunirse contigo por la mañana antes de tarde | 5 | Same reflexive disagreement. | Quiero ir a reunirme contigo… | high |
| S0153L03U13 | 153 | It is the same thing we were talking about and it is important to know | Es lo mismo de lo que estábamos hablando de la misma manera | 6 | Second clause dropped; *de la misma manera* added. | …y es importante saberlo | high |
| S0184L03U15 | 184 | …I'm afraid she may have gone home already | …me temo que ya fue a casa | 9 | "may have gone" flattened to settled fact. | …quizás ya fue a casa | possible |
| S0161L02U06 | 161 | …I want you to be able to give me the answer | …quiero que puedes darme la respuesta | 9 | Indicative *puedes* after *quiero que*. | …quiero que puedas darme la respuesta | high |

### 4b. Seeds 230–279 (job #599) — 29 rows

| phrase_id | seed | English | Spanish | class | what is wrong | proposed | conf |
|---|---|---|---|---|---|---|---|
| S0235L01U06 | 235 | …a better way to explain this to everyone | …una mejor manera de explicar esto | 1 | "to everyone" has no counterpart. | …explicar esto a todos | possible |
| S0244L01U08 | 244 | …how to speak Spanish more naturally | …hablar español de manera diferente | 1 | "more naturally" replaced by "in a different way". | …de manera más natural | possible |
| S0234L01U06 | 234 | …she told me she wanted to talk with you soon | …me dijo que esperaba hablar contigo pronto | 2 | "wanted" → *esperaba* (hoped). **Fix uses *quería*, not confirmed taught by s234.** | …me dijo que quería hablar contigo pronto | high |
| S0245L02U03 | 245 | …to appreciate how much you've already done | …recordar lo mucho que ya has hecho | 2 | "appreciate" → *recordar* (remember); ZUT-clashes with S0245L02U08. | …apreciar… | possible |
| S0263L01U12 | 263 | I know what you mean… | Entiendo a qué te refieres… | 2 | "know" → *entiendo*; *Sé* is taught at s59. | Sé a qué te refieres… | high |
| S0237L02U08 | 237 | …what I had learned before the weekend | …lo que he aprendido… | 4 | Past perfect → present perfect. | …lo que había aprendido… | possible |
| S0252L02U11 | 252 | …when you would be ready to start | …cuándo estarás listo… | 4 | Conditional → future indicative. | …cuándo estarías listo… | high |
| S0250L02U15 | 250 | …and I will do much better | …y lo puedo hacer mucho mejor | 4 | Future → present ability. | …y lo haré mucho mejor | high |
| S0267L01U08 | 267 | When did you have news from your friend? | ¿Cuándo has tenido noticias…? | 4 | Simple past → present perfect. | ¿Cuándo tuviste noticias…? | high |
| S0267L01U11 | 267 | …so I won't worry | …así que no me preocupo | 4 | Future → present. Also logged 2026-08-24 as a **clip truncation**. | …no me preocuparé | high |
| S0279L02U03 | 279 | There was still a little time left before I had to leave | Todavía quedaba poco tiempo antes de que tenga que irme | 4 | Past rendered with present subjunctive. | …antes de que tuviera que irme | possible |
| S0234L03U14 | 234 | …explain things in a different way | …explicar esto de manera diferente | 5 | Plural "things" collapsed to *esto*. | …explicar las cosas… | high |
| S0241L01U04 | 241 | I wanted to give it to my father before he left | Quería dárselo a mi padre antes de irse | 5 | *antes de irse* reads as same-subject. | …antes de que se fuera | high |
| S0233L04U12 | 233 | …said she had a very interesting idea to discuss | …dijo que quería hablar de una idea muy interesante | 6 | "had an idea to discuss" → "wanted to talk about an idea". | …dijo que tenía una idea muy interesante | possible |
| S0247L01B06 | 247 | I find it fairly easy now | Lo estoy haciendo bastante fácil ahora | 6 | Perception rewritten as manner of performing. | Lo encuentro bastante fácil ahora | possible |
| S0245L03U02 | 245 | I think I've made a lot of progress in a short time | Pienso que he hecho mucho en poco tiempo y estoy contento | 6 | Extra clause *y estoy contento* added. | …en poco tiempo | high |
| S0274L03U12 | 274 | She asked if you could come back in a few days… | Ella dijo que quiere saber si puedes volver… | 6 | "asked if…could" → "said she wants to know if you can". | …preguntó si podrías volver… | possible |
| S0277L01U10 | 277 | She asked if we could talk after the meeting… | Ella dijo que quería hablar… | 6 | Same shape. **Already logged 2026-08-24 as A4: needs `podíamos`, s412 — so the proposed fix is itself untaught.** | needs a ruling | possible |
| S0234L04B03 | 234 | I met someone who works with your brother | Conocí a alguien anoche que trabaja con tu hermano | 3 | *anoche* added. | Conocí a alguien que trabaja… | high |
| S0235L02U11 | 235 | She wants to tell you about the idea before you leave | Quiere decirte algo sobre la idea… | 3 | *algo* added. | Quiere hablarte de la idea… | possible |
| S0269L01U15 | 269 | Although I have to wait for your father I'm going to practise | …ya voy a practicar | 3 | *ya* added. | …voy a practicar | high |
| S0233L02U02 | 233 | …the woman who was talking with us before? | …que estaba aquí hablando con nosotros antes? | 3 | *aquí* added. | …que estaba hablando con nosotros antes? | high |
| S0235L02U10 | 235 | …because it is hard to understand | …porque es muy difícil de entender | 3 | *muy* added. | …es difícil de entender | possible |
| S0279L02U09 | 279 | There was nothing left to say at that point | No quedaba nada más que decir en ese momento | 3 | *más* added. | No quedaba nada que decir… | possible |
| S0231L02U03 | 231 | …works in the same office as my friend… | …en el mismo sitio… | 8 | "office" → *sitio*; S0231L02U13 uses *oficina*. | …en la misma oficina… | high |
| S0248L02U12 | 248 | I think that idea was complete rubbish | Creo que esa idea era una basura total | 8 | *Creo que* where course standard is *Pienso que* (s47). | Pienso que esa idea era… | high |
| S0275L01U07 | 275 | I do not think I need longer because I think I am already ready | No pienso que necesito más tiempo porque creo que ya estoy listo | 8 | Two "I think" in one sentence rendered two different ways. | …porque pienso que ya estoy listo | high |
| S0263L01U04 | 263 | I'm not sure who you mean… | No sé a quién te refieres exactamente… | 3+8 | *exactamente* added; "not sure" → *no sé*. | No estoy seguro de a quién te refieres… | high |
| S0274L02U13 | 274 | I am not sure if you want to leave… | No sé si quieres irte… | 8 | "not sure" → *no sé*; cf. S0252L01U04. | No estoy seguro de si quieres irte… | high |

---

## 5. A mechanical pre-filter — prototyped, and honestly measured

Known-side overreach is machine-detectable in a way that attention is not. I built a
prototype (`$CS_SCRATCH/knownside-filter.cjs`): build a lexicon of every English token
appearing in any taught LEGO gloss with the earliest seed teaching it, then flag any phrase
whose English uses a token first taught *later*, or never.

Over all 16,328 phrases: **2,031 flagged (12.4%)**, from 814 distinct taught English tokens.

**It caught 1 of the 3 rows** — S0249L02U09 (`needs@319`). It missed the other two, and the
reason is precise and fixable: **token-level matching over-credits.** "short" is scored as
taught at seed 89 because it occurs inside the chunk *"in a short time" → "en poco tiempo"*,
which gives the learner no standalone adjective. "started" is scored as taught at seed 37
because of *"I started to" → "empecé a"*, which is first-person singular, not the
first-person plural the phrase needs.

The right unit is the **gloss chunk with its person and number**, not the bare token — which
is exactly what the 2026-08-24 job tracked by hand (`necesita` s319, `podíamos` s412). That
is a buildable filter. **I have not built it, and I am not claiming a recall figure for it.**

---

## 6. Partition (unchanged, still exhaustive)

16,328 phrases, 663 seeds numbered 1–668 (305, 367, 400, 463, 609 do not exist).
Seeds 150–279 = exactly 4,040 rows, the band the earlier sweeps covered; 16,328 − 4,040 = 12,288.

| shard | seeds | rows | state |
|---|---|---|---|
| #599 | 230–279 | 1,327 | done — 29 findings |
| #600 | 150–187 | 1,359 | done — 12 findings |
| W1–W9 | 1–149 and 280–668 | 12,288 | **not dispatched** |
| W10 reserve | 188–229 | 1,354 | **not dispatched** |
| | **total** | **16,328** | ✓ |
