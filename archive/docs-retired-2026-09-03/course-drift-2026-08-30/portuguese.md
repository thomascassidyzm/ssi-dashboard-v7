# Portuguese pronoun drift — proposal only, nothing applied

*Portugal `por_for_eng` + Brazilian `por_br_for_eng`. Written 2026-08-30. Read-only pass: no DB writes, no audio, no commits.*

## Headline

**I propose changing 136 drill lines: 54 in European Portuguese and 82 in Brazilian.** I am refusing
17 (5 pt, 12 br) — all of them because the flagged mismatch is not really about the taught lesson: the
drill already contains the taught chunk exactly as taught, and the pronoun the checker saw sits on a
*different* verb in the sentence. A further 84 lines (48 pt, 36 br) are second and third person and are
out of scope by design.

The two courses need **opposite** fixes, and that is the finding:

- **European Portuguese teaches the pronoun dropped and drills it explicit** — so the fix is to
  **delete** `eu` / `nós` from 54 drills.
- **Brazilian teaches the pronoun explicit ("eu não entendo") and drills it dropped** — so under Tom's
  ruling the fix is to **add** `eu` to 78 drills (plus 4 removals where Brazilian drifts the other way).

**That is the opposite of what the 2026-08-28 survey recommended for Brazilian** ("standardise on the
dropped form"). The survey was reading the majority form across the whole course; Tom's ruling reads
the taught lesson. My position: **follow the ruling, add the pronouns.** In Brazilian Portuguese the
explicit `eu` is genuinely the everyday register — an SSi learner who says "eu não entendo" sounds like
a Brazilian, one who says "não entendo" sounds like they learnt in Lisbon — so bending the drills to
the lesson here also happens to be the better Portuguese, and it makes the course say the same thing
twice instead of contradicting itself in the same round. The only thing lost is a smaller diff. If Tom
prefers the survey's direction instead, the honest fix is not to re-touch the drills but to **change the
17 Brazilian lesson labels** and then re-derive — that is a different, bigger job and it should be his
call, not mine.

## Date clustering — checked, not repeated

The "one bad authoring day" story holds for Brazilian and is **only two-thirds true** for European.

| course | in-scope lines | by drill creation date |
|---|---|---|
| `por_for_eng` | 59 | **2026-02-11: 40** · 2026-06-09: 7 · 2026-06-22: 9 · 2026-07-03: 2 · 2026-06-08: 1 |
| `por_br_for_eng` | 94 | **2026-03-12: 71 · 2026-03-13: 11** · 2026-07-15: 12 |

Two corrections to the survey:

1. **European is not one batch.** 2026-02-11 accounts for 40 of 59 (68%); the remaining 19 are spread
   over four later days in June and July. Re-touching only the February batch would leave a third of
   the drift in place.
2. **Brazilian's cluster is 12–13 March, not 15 July.** The 2026-07-15 rows the survey named are almost
   entirely noise: 11 of those 12 are among my refusals (they are the "tenho certeza de que eu…" family,
   where the drill carries the taught chunk intact and the checker was looking at the matrix verb). The
   real Brazilian batch is **2026-03-12/13 — 81 of my 82 proposed edits**. One genuine authoring day.

## A bonus: 10 of these edits close live ZUT violations

Ten of the drills I propose to change have a sibling drill in the same course with the **same English
prompt and the other target form** — a live one-known-two-targets break that exists today. Every one of
my rewrites converges on the sibling, so the fix is a ZUT fix as well as a consistency fix.

| course | drill I'm changing | its sibling (unchanged) | shared English prompt |
|---|---|---|---|
| pt | `S0519L02U01` | `S0519L02B02` | I haven't seen their new baby yet |
| pt | `S0514L04U01` | `S0514L04B03` | I found the perfect house on the first day |
| pt | `S0636L01U01` | `S0636L01B04` | I think that that is Jane's bag |
| pt | `S0473L01U01` | `S0473L01B01` | I don't want it |
| pt | `S0540L01U01` | `S0540L01B03` | I don't mind if you want to leave without the car |
| pt | `S0597L01B03` | `S0597L01B01` | I suspect that |
| pt | `S0472L01U04` | `S0472L01B02` | we don't know that |
| pt | `S0464L01U01` | `S0464L01B03` | I told her the truth |
| br | `S0083L01U06` | `S0083L01B02` | I agree with what you said |
| br | `S0089L01U06` | `S0089L01B02` | I think that I've done a lot today |

No proposed rewrite creates a new ZUT break. I checked every in-scope English prompt against every
non-component phrase in its course; the only rewrite that *would* have created one is Brazilian
`S0163L01U05`, and I refused it (see refusals).

## Out of scope, listed with counts

Second and third person are legitimately explicit in Portuguese — the verb ending alone does not say
*who*, so `ele`/`ela`/`eles`/`você` are carrying information, not style. Not rewritten:

| course | 3rd singular | 3rd plural | 2nd person | total out of scope |
|---|---|---|---|---|
| `por_for_eng` | 39 | 7 | 2 | **48** |
| `por_br_for_eng` | 21 | 7 | 8 | **36** |

---
# European Portuguese `por_for_eng` — 54 proposed edits

All 54 are **removals** of a sentence-initial `eu` / `nós` that the lesson does not teach. 49 USE, 5 BUILD, across 18 lessons.

| phrase id | role | taught lego | lego known → target | drill known | BEFORE | AFTER |
|---|---|---|---|---|---|---|
| `S0118L01U05` | use | S0118L01 | I feel better than → **sinto-me melhor do que** | I definitely feel better than before | eu definitivamente sinto-me melhor do que antes | **definitivamente sinto-me melhor do que antes** |
| `S0128L03B02` | build | S0128L03 | I used to know → **conhecia** | I used to know that | eu conhecia isso | **conhecia isso** |
| `S0128L03B03` | build | S0128L03 | I used to know → **conhecia** | I used to know this | eu conhecia este | **conhecia este** |
| `S0128L03U01` | use | S0128L03 | I used to know → **conhecia** | I used to know that | eu conhecia isso | **conhecia isso** |
| `S0128L03U02` | use | S0128L03 | I used to know → **conhecia** | I used to know the shape | eu conhecia a forma | **conhecia a forma** |
| `S0128L03U03` | use | S0128L03 | I used to know → **conhecia** | I used to know your idea | eu conhecia a tua ideia | **conhecia a tua ideia** |
| `S0128L03U04` | use | S0128L03 | I used to know → **conhecia** | I used to know this work | eu conhecia este trabalho | **conhecia este trabalho** |
| `S0128L03U05` | use | S0128L03 | I used to know → **conhecia** | I thought I used to know that | achei que eu conhecia isso | **achei que eu conhecia isso** |
| `S0128L03U06` | use | S0128L03 | I used to know → **conhecia** | I believe I used to know this | acredito que eu conhecia este | **acredito que eu conhecia este** |
| `S0139L01U01` | use | S0139L01 | I'm sorry → **lamento** | I'm really sorry about this | eu lamento muito isto | **lamento muito isto** |
| `S0139L01U05` | use | S0139L01 | I'm sorry → **lamento** | I really am sorry | eu lamento muito | **lamento muito** |
| `S0170L01U01` | use | S0170L01 | I'd like you to tell me → **gostaria que me dissesses** | I'd like you to tell me what you think | eu gostaria que me dissesses o que achas | **gostaria que me dissesses o que achas** |
| `S0170L01U02` | use | S0170L01 | I'd like you to tell me → **gostaria que me dissesses** | I'd like you to tell me what you want | eu gostaria que me dissesses o que queres | **gostaria que me dissesses o que queres** |
| `S0170L01U08` | use | S0170L01 | I'd like you to tell me → **gostaria que me dissesses** | I'd like you to tell me what you need to do | eu gostaria que me dissesses o que precisas de fazer | **gostaria que me dissesses o que precisas de fazer** |
| `S0170L01U09` | use | S0170L01 | I'd like you to tell me → **gostaria que me dissesses** | I'd like you to tell me before Sunday morning | eu gostaria que me dissesses antes do domingo de manhã | **gostaria que me dissesses antes do domingo de manhã** |
| `S0295L01U01` | use | S0295L01 | I didn't say → **não disse** | I didn't say that I wanted to go | eu não disse que queria ir | **não disse que queria ir** |
| `S0295L01U02` | use | S0295L01 | I didn't say → **não disse** | I didn't say anything about it | eu não disse nada sobre isso | **não disse nada sobre isso** |
| `S0295L01U03` | use | S0295L01 | I didn't say → **não disse** | I didn't say that it was easy | eu não disse que era fácil | **não disse que era fácil** |
| `S0295L01U04` | use | S0295L01 | I didn't say → **não disse** | I didn't say that it was difficult | eu não disse que era difícil | **não disse que era difícil** |
| `S0295L01U05` | use | S0295L01 | I didn't say → **não disse** | I didn't say that I wanted to help | eu não disse que queria ajudar | **não disse que queria ajudar** |
| `S0295L01U06` | use | S0295L01 | I didn't say → **não disse** | I didn't say that I was ready | eu não disse que estava pronto | **não disse que estava pronto** |
| `S0295L01U07` | use | S0295L01 | I didn't say → **não disse** | I didn't say that I wanted to stop | eu não disse que queria parar | **não disse que queria parar** |
| `S0295L01U08` | use | S0295L01 | I didn't say → **não disse** | I didn't say that I was going | eu não disse que ia | **não disse que ia** |
| `S0296L01U01` | use | S0296L01 | I said → **disse** | I said that I wanted to help | eu disse que queria ajudar | **disse que queria ajudar** |
| `S0296L01U02` | use | S0296L01 | I said → **disse** | I said that it was interesting | eu disse que era interessante | **disse que era interessante** |
| `S0296L01U03` | use | S0296L01 | I said → **disse** | I said that I was going to come | eu disse que ia ir | **disse que ia ir** |
| `S0296L01U04` | use | S0296L01 | I said → **disse** | I said that I didn't know | eu disse que não sabia | **disse que não sabia** |
| `S0296L01U05` | use | S0296L01 | I said → **disse** | I said that I wanted to learn more | eu disse que queria aprender mais | **disse que queria aprender mais** |
| `S0296L01U06` | use | S0296L01 | I said → **disse** | I said that I was ready | eu disse que estava pronto | **disse que estava pronto** |
| `S0296L01U07` | use | S0296L01 | I said → **disse** | I said that I wanted to speak with you | eu disse que queria falar contigo | **disse que queria falar contigo** |
| `S0296L01U08` | use | S0296L01 | I said → **disse** | I said that I was going to try | eu disse que ia tentar | **disse que ia tentar** |
| `S0296L02U01` | use | S0296L02 | I needed → **precisava de** | I needed to speak with you | eu precisava de falar contigo | **precisava de falar contigo** |
| `S0296L02U02` | use | S0296L02 | I needed → **precisava de** | I needed more time to finish | eu precisava de mais tempo para acabar | **precisava de mais tempo para acabar** |
| `S0296L02U03` | use | S0296L02 | I needed → **precisava de** | I needed to find out the truth | eu precisava de descobrir a verdade | **precisava de descobrir a verdade** |
| `S0296L02U04` | use | S0296L02 | I needed → **precisava de** | I needed to think about it | eu precisava de pensar nisso | **precisava de pensar nisso** |
| `S0296L02U05` | use | S0296L02 | I needed → **precisava de** | I said that I needed to go | eu disse que precisava de ir | **disse que precisava de ir** |
| `S0296L02U06` | use | S0296L02 | I needed → **precisava de** | I needed to understand what was happening | eu precisava de perceber o que estava a acontecer | **precisava de perceber o que estava a acontecer** |
| `S0296L02U07` | use | S0296L02 | I needed → **precisava de** | I needed your help but you were busy | eu precisava de ajuda mas estavas ocupado | **precisava de ajuda mas estavas ocupado** |
| `S0412L03U01` | use | S0412L03 | we couldn't → **não podíamos** | we couldn't allow them to win everything | nós não podíamos deixá-los ganhar tudo | **não podíamos deixá-los ganhar tudo** |
| `S0464L01B01` | build | S0464L01 | I told her → **disse-lhe** | I told her | eu disse-lhe | **disse-lhe** |
| `S0464L01U01` | use | S0464L01 | I told her → **disse-lhe** | I told her the truth | eu disse-lhe a verdade | **disse-lhe a verdade** |
| `S0464L01U02` | use | S0464L01 | I told her → **disse-lhe** | I told her everything | eu disse-lhe tudo | **disse-lhe tudo** |
| `S0464L01U04` | use | S0464L01 | I told her → **disse-lhe** | I told her that yesterday | eu disse-lhe isso ontem | **disse-lhe isso ontem** |
| `S0472L01U04` | use | S0472L01 | we don't know → **não sabemos** | we don't know that | nós não sabemos isso | **não sabemos isso** |
| `S0473L01U01` | use | S0473L01 | I don't want it → **não o quero** | I don't want it | eu não o quero | **não o quero** |
| `S0514L01B02` | build | S0514L01 | I found → **encontrei** | I found it | eu encontrei | **encontrei** |
| `S0514L04U01` | use | S0514L04 | I found the perfect house → **encontrei a casa perfeita** | I found the perfect house on the first day | eu encontrei a casa perfeita no primeiro dia | **encontrei a casa perfeita no primeiro dia** |
| `S0518L02U01` | use | S0518L02 | I couldn't imagine myself → **não conseguia imaginar-me** | I couldn't imagine myself having exactly the same problem | eu não conseguia imaginar-me a ter exatamente o mesmo problema | **não conseguia imaginar-me a ter exatamente o mesmo problema** |
| `S0519L02U01` | use | S0519L02 | I haven't seen yet → **ainda não vi** | I haven't seen their new baby yet | eu ainda não vi o bebé novo deles | **ainda não vi o bebé novo deles** |
| `S0540L01U01` | use | S0540L01 | I don't mind if you want → **não me importo se quiseres** | I don't mind if you want to leave without the car | eu não me importo se quiseres ir embora sem o carro | **não me importo se quiseres ir embora sem o carro** |
| `S0597L01B03` | build | S0597L01 | I suspect that → **suspeito que** | I suspect that | eu suspeito que | **suspeito que** |
| `S0597L01U01` | use | S0597L01 | I suspect that → **suspeito que** | I suspect that he knows | eu suspeito que ele sabe | **suspeito que ele sabe** |
| `S0597L01U04` | use | S0597L01 | I suspect that → **suspeito que** | I suspect that it's true | eu suspeito que isso é verdade | **suspeito que isso é verdade** |
| `S0636L01U01` | use | S0636L01 | I think that that bag → **acho que aquele saco** | I think that that is Jane's bag | eu acho que aquele saco é da Jane | **acho que aquele saco é da Jane** |

# Brazilian Portuguese `por_br_for_eng` — 82 proposed edits

Mostly **insertions** of the `eu` the lesson teaches: 78 insertions, 4 removals (`S0183L01B01/B02/B03`, `S0571L01U04` — where Brazilian drifts the European way). 79 USE, 3 BUILD, across 17 lessons.

| phrase id | role | taught lego | lego known → target | drill known | BEFORE | AFTER |
|---|---|---|---|---|---|---|
| `S0078L01U01` | use | S0078L01 | I don't understand → **eu não entendo** | I don't understand what you're doing | não entendo o que você está fazendo | **eu não entendo o que você está fazendo** |
| `S0078L01U02` | use | S0078L01 | I don't understand → **eu não entendo** | I don't understand why he wants to leave | não entendo por que ele quer ir | **eu não entendo por que ele quer ir** |
| `S0078L01U03` | use | S0078L01 | I don't understand → **eu não entendo** | I don't understand what I need to do | não entendo o que preciso fazer | **eu não entendo o que preciso fazer** |
| `S0078L01U04` | use | S0078L01 | I don't understand → **eu não entendo** | I don't understand why she wants to stop | não entendo por que ela quer parar | **eu não entendo por que ela quer parar** |
| `S0078L01U05` | use | S0078L01 | I don't understand → **eu não entendo** | I don't understand what you want to say | não entendo o que você quer dizer | **eu não entendo o que você quer dizer** |
| `S0078L01U06` | use | S0078L01 | I don't understand → **eu não entendo** | I don't understand why it's like this | não entendo por que é assim | **eu não entendo por que é assim** |
| `S0078L01U07` | use | S0078L01 | I don't understand → **eu não entendo** | I don't understand what you're trying to say | não entendo o que você está tentando dizer | **eu não entendo o que você está tentando dizer** |
| `S0078L01U08` | use | S0078L01 | I don't understand → **eu não entendo** | I don't understand but I want to learn | não entendo mas quero aprender | **eu não entendo mas quero aprender** |
| `S0083L01U01` | use | S0083L01 | I agree with → **eu concordo com** | I agree with what you're doing | concordo com o que você está fazendo | **eu concordo com o que você está fazendo** |
| `S0083L01U02` | use | S0083L01 | I agree with → **eu concordo com** | I don't agree with that | não concordo com isso | **eu não concordo com isso** |
| `S0083L01U03` | use | S0083L01 | I agree with → **eu concordo com** | I agree with what she said | concordo com o que ela disse | **eu concordo com o que ela disse** |
| `S0083L01U04` | use | S0083L01 | I agree with → **eu concordo com** | I agree with the truth | concordo com a verdade | **eu concordo com a verdade** |
| `S0083L01U05` | use | S0083L01 | I agree with → **eu concordo com** | I agree with what you want to do | concordo com o que você quer fazer | **eu concordo com o que você quer fazer** |
| `S0083L01U06` | use | S0083L01 | I agree with → **eu concordo com** | I agree with what you said | concordo com o que você disse | **eu concordo com o que você disse** |
| `S0083L01U07` | use | S0083L01 | I agree with → **eu concordo com** | I agree with you but it's difficult | concordo com você mas é difícil | **eu concordo com você mas é difícil** |
| `S0083L01U08` | use | S0083L01 | I agree with → **eu concordo com** | I agree with that | concordo com isso | **eu concordo com isso** |
| `S0084L01U01` | use | S0084L01 | I don't agree with → **eu não concordo com** | I don't agree with what you said about that | não concordo com o que você disse sobre isso | **eu não concordo com o que você disse sobre isso** |
| `S0084L01U02` | use | S0084L01 | I don't agree with → **eu não concordo com** | I don't agree with what she said | não concordo com o que ela disse | **eu não concordo com o que ela disse** |
| `S0084L01U03` | use | S0084L01 | I don't agree with → **eu não concordo com** | I don't agree with what you're doing | não concordo com o que você está fazendo | **eu não concordo com o que você está fazendo** |
| `S0084L01U04` | use | S0084L01 | I don't agree with → **eu não concordo com** | I don't agree with what he said about the young dog | não concordo com o que ele disse sobre o cachorro jovem | **eu não concordo com o que ele disse sobre o cachorro jovem** |
| `S0084L01U05` | use | S0084L01 | I don't agree with → **eu não concordo com** | I don't agree with what you want to do | não concordo com o que você quer fazer | **eu não concordo com o que você quer fazer** |
| `S0084L01U06` | use | S0084L01 | I don't agree with → **eu não concordo com** | I don't agree with what you said yesterday | não concordo com o que você disse ontem | **eu não concordo com o que você disse ontem** |
| `S0084L01U07` | use | S0084L01 | I don't agree with → **eu não concordo com** | I don't agree with that but I understand | não concordo com isso mas entendo | **eu não concordo com isso mas entendo** |
| `S0089L01U01` | use | S0089L01 | I think that I've done a lot → **eu acho que fiz muito** | I think that I've done a lot to learn | acho que fiz muito para aprender | **eu acho que fiz muito para aprender** |
| `S0089L01U02` | use | S0089L01 | I think that I've done a lot → **eu acho que fiz muito** | I think that I've already done a lot | acho que já fiz muito | **eu acho que já fiz muito** |
| `S0089L01U03` | use | S0089L01 | I think that I've done a lot → **eu acho que fiz muito** | I think that I've done a lot but I'm not ready yet | acho que fiz muito mas ainda não estou pronto | **eu acho que fiz muito mas ainda não estou pronto** |
| `S0089L01U04` | use | S0089L01 | I think that I've done a lot → **eu acho que fiz muito** | I think that I've done a lot this morning | acho que fiz muito esta manhã | **eu acho que fiz muito esta manhã** |
| `S0089L01U05` | use | S0089L01 | I think that I've done a lot → **eu acho que fiz muito** | I don't think that I've done a lot | não acho que fiz muito | **eu não acho que fiz muito** |
| `S0089L01U06` | use | S0089L01 | I think that I've done a lot → **eu acho que fiz muito** | I think that I've done a lot today | acho que fiz muito hoje | **eu acho que fiz muito hoje** |
| `S0089L01U07` | use | S0089L01 | I think that I've done a lot → **eu acho que fiz muito** | I think that I've done a lot but I want to do more | acho que fiz muito mas quero fazer mais | **eu acho que fiz muito mas quero fazer mais** |
| `S0089L01U08` | use | S0089L01 | I think that I've done a lot → **eu acho que fiz muito** | I think that I've done a lot this week | acho que fiz muito esta semana | **eu acho que fiz muito esta semana** |
| `S0110L01U05` | use | S0110L01 | we're friends → **somos amigos** | we're friends and we must work hard | somos amigos e nós temos de trabalhar muito | **somos amigos e temos de trabalhar muito** |
| `S0116L03U03` | use | S0116L03 | I could make → **que eu podia fazer** | I think this is the only choice I could make | acho que esta é a única escolha que podia fazer | **acho que esta é a única escolha que eu podia fazer** |
| `S0116L03U05` | use | S0116L03 | I could make → **que eu podia fazer** | I don't know if this is the best I could make | não sei se esta é a melhor que podia fazer | **não sei se esta é a melhor que eu podia fazer** |
| `S0117L01U01` | use | S0117L01 | I'm definitely → **eu estou definitivamente** | I think I'm definitely ready now | acho que estou definitivamente pronto agora | **acho que eu estou definitivamente pronto agora** |
| `S0117L01U03` | use | S0117L01 | I'm definitely → **eu estou definitivamente** | I'm definitely trying to do this | estou definitivamente tentando fazer isso | **eu estou definitivamente tentando fazer isso** |
| `S0117L01U04` | use | S0117L01 | I'm definitely → **eu estou definitivamente** | I'm definitely trying to do better | estou definitivamente tentando fazer melhor | **eu estou definitivamente tentando fazer melhor** |
| `S0117L01U05` | use | S0117L01 | I'm definitely → **eu estou definitivamente** | I'm definitely ready to have a conversation | estou definitivamente pronto para ter uma conversa | **eu estou definitivamente pronto para ter uma conversa** |
| `S0117L01U06` | use | S0117L01 | I'm definitely → **eu estou definitivamente** | I'm definitely happy about that | estou definitivamente contente com isso | **eu estou definitivamente contente com isso** |
| `S0144L01U01` | use | S0144L01 | I woke → **eu acordei** | I think I woke without any problem | acho que acordei sem problema | **acho que eu acordei sem problema** |
| `S0144L01U02` | use | S0144L01 | I woke → **eu acordei** | I woke and I was thinking about you | acordei e estava pensando em você | **eu acordei e estava pensando em você** |
| `S0144L01U03` | use | S0144L01 | I woke → **eu acordei** | I woke earlier | acordei mais cedo | **eu acordei mais cedo** |
| `S0144L01U04` | use | S0144L01 | I woke → **eu acordei** | I woke earlier than I wanted to | acordei mais cedo do que queria | **eu acordei mais cedo do que queria** |
| `S0144L01U05` | use | S0144L01 | I woke → **eu acordei** | I think I woke earlier than you | acho que acordei mais cedo do que você | **acho que eu acordei mais cedo do que você** |
| `S0148L01U01` | use | S0148L01 | I couldn't → **eu não consegui** | I couldn't answer when she saw me | não consegui responder quando ela me viu | **eu não consegui responder quando ela me viu** |
| `S0148L01U02` | use | S0148L01 | I couldn't → **eu não consegui** | I couldn't wake earlier this morning | não consegui acordar mais cedo esta manhã | **eu não consegui acordar mais cedo esta manhã** |
| `S0148L01U03` | use | S0148L01 | I couldn't → **eu não consegui** | I couldn't help you since we tried | não consegui ajudar você desde que tentamos | **eu não consegui ajudar você desde que tentamos** |
| `S0148L01U04` | use | S0148L01 | I couldn't → **eu não consegui** | I think I couldn't answer because I was nervous | acho que não consegui responder porque estava nervoso | **acho que eu não consegui responder porque estava nervoso** |
| `S0148L01U05` | use | S0148L01 | I couldn't → **eu não consegui** | I couldn't fix the same thing again | não consegui consertar a mesma coisa de novo | **eu não consegui consertar a mesma coisa de novo** |
| `S0163L01U01` | use | S0163L01 | I think that it's → **eu acho que é** | I think that it's interesting to learn | acho que é interessante aprender | **eu acho que é interessante aprender** |
| `S0163L01U02` | use | S0163L01 | I think that it's → **eu acho que é** | I think that it's difficult | acho que é difícil | **eu acho que é difícil** |
| `S0163L01U03` | use | S0163L01 | I think that it's → **eu acho que é** | I think that it's a good idea | acho que é uma boa ideia | **eu acho que é uma boa ideia** |
| `S0163L01U04` | use | S0163L01 | I think that it's → **eu acho que é** | I think that it's better now | acho que é melhor agora | **eu acho que é melhor agora** |
| `S0170L01U01` | use | S0170L01 | I'd like → **eu gostaria** | I'd like to learn more about this | gostaria de aprender mais sobre isso | **eu gostaria de aprender mais sobre isso** |
| `S0170L01U02` | use | S0170L01 | I'd like → **eu gostaria** | I'd like to talk about something different | gostaria de falar sobre outra coisa | **eu gostaria de falar sobre outra coisa** |
| `S0170L01U03` | use | S0170L01 | I'd like → **eu gostaria** | I'd like to wait a little more | gostaria de esperar um pouco mais | **eu gostaria de esperar um pouco mais** |
| `S0170L01U04` | use | S0170L01 | I'd like → **eu gostaria** | I'd like to see you tomorrow afternoon | gostaria de te ver amanhã à tarde | **eu gostaria de te ver amanhã à tarde** |
| `S0170L01U05` | use | S0170L01 | I'd like → **eu gostaria** | I'd like to practise speaking with you | gostaria de praticar falando com você | **eu gostaria de praticar falando com você** |
| `S0176L02U01` | use | S0176L02 | I'll ask him if → **eu vou perguntar para ele se** | I'll ask him if it's interesting | vou perguntar para ele se é interessante | **eu vou perguntar para ele se é interessante** |
| `S0176L02U02` | use | S0176L02 | I'll ask him if → **eu vou perguntar para ele se** | I'll ask him if he's ready | vou perguntar para ele se está pronto | **eu vou perguntar para ele se está pronto** |
| `S0176L02U03` | use | S0176L02 | I'll ask him if → **eu vou perguntar para ele se** | I'll ask him if he can help me | vou perguntar para ele se vai conseguir me ajudar | **eu vou perguntar para ele se vai conseguir me ajudar** |
| `S0176L02U04` | use | S0176L02 | I'll ask him if → **eu vou perguntar para ele se** | I'll ask him if he's going tomorrow | vou perguntar para ele se vai amanhã | **eu vou perguntar para ele se vai amanhã** |
| `S0176L02U05` | use | S0176L02 | I'll ask him if → **eu vou perguntar para ele se** | I'll ask him if I can help | vou perguntar para ele se posso ajudar | **eu vou perguntar para ele se posso ajudar** |
| `S0178L01U01` | use | S0178L01 | I didn't have time → **eu não tive tempo** | I didn't have time to talk about it | não tive tempo de falar sobre isso | **eu não tive tempo de falar sobre isso** |
| `S0178L01U02` | use | S0178L01 | I didn't have time → **eu não tive tempo** | I didn't have time to learn more | não tive tempo de aprender mais | **eu não tive tempo de aprender mais** |
| `S0178L01U03` | use | S0178L01 | I didn't have time → **eu não tive tempo** | I didn't have enough time yesterday | não tive tempo suficiente ontem | **eu não tive tempo suficiente ontem** |
| `S0178L01U04` | use | S0178L01 | I didn't have time → **eu não tive tempo** | I didn't have time to look for it | não tive tempo de procurar | **eu não tive tempo de procurar** |
| `S0178L01U05` | use | S0178L01 | I didn't have time → **eu não tive tempo** | I didn't have time on Sunday morning | não tive tempo no domingo de manhã | **eu não tive tempo no domingo de manhã** |
| `S0180L02U01` | use | S0180L02 | I'd like to read → **eu gostaria de ler** | I'd like to read my book for a while | gostaria de ler o meu livro durante algum tempo | **eu gostaria de ler o meu livro durante algum tempo** |
| `S0180L02U02` | use | S0180L02 | I'd like to read → **eu gostaria de ler** | I'd like to read something different | gostaria de ler outra coisa | **eu gostaria de ler outra coisa** |
| `S0180L02U03` | use | S0180L02 | I'd like to read → **eu gostaria de ler** | I'd like to read an interesting book | gostaria de ler um livro interessante | **eu gostaria de ler um livro interessante** |
| `S0180L02U04` | use | S0180L02 | I'd like to read → **eu gostaria de ler** | I'd like to read it later | gostaria de ler mais tarde | **eu gostaria de ler mais tarde** |
| `S0180L02U05` | use | S0180L02 | I'd like to read → **eu gostaria de ler** | I'd like to read it tomorrow morning | gostaria de ler amanhã de manhã | **eu gostaria de ler amanhã de manhã** |
| `S0183L01B01` | build | S0183L01 | I saw → **vi** | I saw it | eu vi | **vi** |
| `S0183L01B02` | build | S0183L01 | I saw → **vi** | I saw her | eu vi ela | **vi ela** |
| `S0183L01B03` | build | S0183L01 | I saw → **vi** | I saw it yesterday | eu vi ontem | **vi ontem** |
| `S0249L01U01` | use | S0249L01 | I want you to help me → **eu quero que você me ajude** | I want you to help me before you go | quero que você me ajude antes de ir | **eu quero que você me ajude antes de ir** |
| `S0249L01U02` | use | S0249L01 | I want you to help me → **eu quero que você me ajude** | I want you to help me today | quero que você me ajude hoje | **eu quero que você me ajude hoje** |
| `S0249L01U03` | use | S0249L01 | I want you to help me → **eu quero que você me ajude** | I want you to help me tomorrow | quero que você me ajude amanhã | **eu quero que você me ajude amanhã** |
| `S0249L01U04` | use | S0249L01 | I want you to help me → **eu quero que você me ajude** | I want you to help me before the weekend | quero que você me ajude antes do fim de semana | **eu quero que você me ajude antes do fim de semana** |
| `S0249L01U05` | use | S0249L01 | I want you to help me → **eu quero que você me ajude** | I want you to help me now | quero que você me ajude agora | **eu quero que você me ajude agora** |
| `S0571L01U04` | use | S0571L01 | I'm not convinced → **não estou convencido** | I'm still not convinced | eu ainda não estou convencido | **ainda não estou convencido** |

---

# Not proposing to change — 17 lines, one reason each

**European Portuguese (5)**

| line | why not |
|---|---|
| `S0116L03U02` | Drill already contains the taught chunk `que eu podia fazer` verbatim; the checker saw the *matrix* verb ("não sei") dropping its pronoun, which is correct. Not drift. |
| `S0116L03U04` | Same — `estava a pensar sobre a escolha que eu podia fazer` teaches exactly what the lesson teaches. |
| `S0116L03U06` | Same. |
| `S0116L03U08` | Same. |
| `S0593L01B03` | `eu discutisse então` — the real defect is the lesson itself: `S0593L01` glosses "I argued" as `discutisse`, an imperfect subjunctive that cannot stand alone. Deleting `eu` would leave a broken line looking fixed. Lesson label needs Tom, not a drill edit. |

**Brazilian Portuguese (12)**

| line | why not |
|---|---|
| `S0479L02U05` | `tenho certeza, é o mínimo que eu podia fazer` — taught chunk present and correct; the checker read "tenho certeza". |
| `S0536L01U01` | `tenho certeza de que eu costumava achar` — same family, taught chunk intact. |
| `S0538L01U04` | Same family. |
| `S0540L01U04` | Same family. |
| `S0561L01U02` | Same family. |
| `S0562L01U02` | Same family. |
| `S0563L01U02` | Same family. |
| `S0346L02U01` | `eu queria que ela soubesse que gostei do livro dela` — the lesson's own verb `gostei` is already dropped as taught; the `eu` belongs to "queria". |
| `S0371L01U03` | `eu acho que fui ver um filme` — `fui` is dropped as taught; the `eu` is on "acho", which agrees with the lessons that do teach `eu acho que`. |
| `S0380L01U05` | `eu acho que perguntei` — same. |
| `S0619L04U04` | 1st person plural, and the `nos` here is the reciprocal clitic in `nos vimos`, not a subject pronoun. Nothing to add or remove. |
| `S0163L01U05` | Adding `eu` **would create a new ZUT break**: `S0058L01B03` teaches "I think that it's interesting" → `acho que é interessante` today, and the two would diverge. Fixing this properly means also re-touching `S0058L01B03` and `S0058L01B08`, which sit under a different lesson and are outside this pass. Flagged for Tom. |

# Two judgement calls I want flagging, not hiding

- **`S0110L01U05` (br, 1st person plural).** I propose `somos amigos e nós temos de trabalhar muito` →
  `somos amigos e temos de trabalhar muito`. Brazilian 1st-person-plural sits at roughly 53/47 across the
  course — a genuine coin-flip with no majority to defer to, which the survey left open for Tom. I edited
  this one only because the two clauses share a subject and repeating `nós` in the second is redundant in
  any register. **If Tom wants Brazilian `nós` decided as a policy, this row should follow the policy, not
  my ear.**
- **`S0296L02U07` (pt).** `eu precisava de ajuda mas estavas ocupado` → `precisava de ajuda mas estavas
  ocupado`. There is a mild I-versus-you contrast here, which is the one thing that normally licenses an
  explicit pronoun. I judged it not emphatic — the contrast is carried by `estavas` — but it is the closest
  call in the European list, and it is one line to reverse if Tom disagrees.

Two smaller notes, no action asked: `S0514L01B02` (pt) prompts "I found it" but the target `encontrei`
has no object at all — removing `eu` fixes the drift and leaves that separate gap untouched. And
`S0118L01U05` (pt) becomes `definitivamente sinto-me melhor do que antes`; a fronted adverb can pull the
clitic forward in European Portuguese, so if a native reader prefers `definitivamente me sinto`, that is a
one-line change on top.

# What this pass is really doing

Each lesson in these courses teaches one short chunk of Portuguese, and then a handful of practice lines
drill it. In 153 first-person lines across the two courses, the drill quietly says it differently from the
lesson — the lesson teaches "não entendo" and the drill says "eu não entendo", or the other way round. The
learner hears one thing taught and the other thing practised in the same round, which is exactly the
uncertainty the method exists to remove. Tom's ruling is that the teaching wins, so this pass bends 136
drill lines back to whatever their own lesson says: strip `eu` in the Portugal course, add it in the
Brazilian one. Nothing else in any line changes — same words, same order, one pronoun in or out. Ten of
the changes also happen to close cases where the same English prompt currently has two different
Portuguese answers in the course.

Nothing here has been applied. No database was written to, no audio touched.
