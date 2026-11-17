# spa_for_eng: Deborah small-items pass APPLIED (cs #442·AI, 17 Nov)

Kai said Y at about 13:10Z to the #430·AI small-items list (d/85773ddc). Every row was re-read live before its op was written. **29 rows edited and 6 deleted.** Each edit carries an `expect` on the old text and links its new clips in the same op (make-before-break): no slot was ever silent and no old clip was deleted.

**Events** (applied in 6 chunks, because spa_for_eng edit-batch was hitting Postgres's 60 s statement timeout; see Gap): `e803b5ad`, `36c692ea`, `d410ca4c`, `302c07da`, `f22bb830`, `a9536496`. The undo ops for each chunk are in `undo.json`.

**Audio:** 56 render asks (51 rendered, 5 linked from the library), **2,373 chars**, no refusals. The read-back in `readback.json` shows 29/29 rows with the new text and the new clip ids, and 6/6 deleted rows gone. Listening page: https://watson-1.tail4968cb.ts.net:10000/d/05d197be (UNHEARD).

## Departures from the list (my calls, on Kai's floor rule and learner-POV gate)
- **S0206L02U09** 'Disfruto tener esta oportunidad…' was the 4th disfrutar+infinitive row (not on #430's list), and it got the same fix.
- **Rewritten instead of deleted, to hold basket floors** (3 BUILD / 5 USE from seed 4): S0567L03B04, S0515L01U04/U05, S0535L02B03 and S0535L01U04. Every word in them is taught earlier: desafío S0484, mes S0037, ver S0107, me encanta S0491, diferente S0060.
- **S0619L01U06**: the English became 'any more', because 'any longer' is taught as *por más tiempo* (S0563L03) and 'not any more' as *ya no* (S0145L01).
- **S0231L02**: 'elderly' → 'old' on all 9 rows, including B02 and U10 (the 'un hombre mayor' rows), not only the 7 'ese' rows.
- **S0427L01**: only the C01 component row was re-glossed. The LEGO row itself still says 'you thought | pensaras' (not touched).

## Floors after the pass (B/U)
- Already thin before the pass and not made worse: S0515L01 2/4, S0535L01 1/3 (B02 was an exact duplicate), S0550L01 3/4, S0537L01 4/4.
- S0535L02 still holds the duplicate B01/B02 pair.

## Rows
- **S0206L02U03** (item 1)  
  before: I enjoy having the opportunity to talk with you because we learn a lot | Disfruto tener la oportunidad de hablar contigo porque aprendemos mucho  
  after: I enjoy having the opportunity to talk with you because we learn a lot | Disfruto teniendo la oportunidad de hablar contigo porque aprendemos mucho  
  clips: t1:4b00576d t2:33b46864
- **S0206L02U09** (item 1)  
  before: I enjoy having this opportunity to practise even when it is difficult sometimes | Disfruto tener esta oportunidad de practicar aunque es difícil de vez en cuando  
  after: I enjoy having this opportunity to practise even when it is difficult sometimes | Disfruto teniendo esta oportunidad de practicar aunque es difícil de vez en cuando  
  clips: t1:35d89097 t2:2889ee67  
  note: 4th disfrutar+inf row found in the same basket (not on #430's list); same fix
- **S0214L02U06** (item 1)  
  before: I enjoy talking with you at the weekend | Disfruto hablar contigo el fin de semana  
  after: I enjoy talking with you at the weekend | Disfruto hablando contigo el fin de semana  
  clips: t1:cb1a2203 t2:38344ffd
- **S0110L03U11** (item 1)  
  before: I know I need to relax but I find it hard to stop when I am enjoying learning a lot | Sé que necesito relajarme pero me es difícil parar cuando estoy disfrutando aprender mucho  
  after: I know I need to relax but I find it hard to stop when I am enjoying learning a lot | Sé que necesito relajarme pero me es difícil parar cuando estoy disfrutando aprendiendo mucho  
  clips: t1:5078774c t2:c5a50737  
  note: one-word change
- **S0567L03B03** (item 2)  
  before: I love watching the children play | me encanta viendo a los niños jugar  
  after: I love watching the children play | me encanta ver a los niños jugar  
  clips: t1:181ecd37 t2:36baf49f  
  note: ver taught S0107L02; me encanta S0491L01
- **S0567L03B04** (item 2)  
  before: in my opinion watching the children play | en mi opinión viendo a los niños jugar  
  after: I'm watching the children play | estoy viendo a los niños jugar  
  clips: k:690d7a9e t1:5c3f52e6 t2:f59e9ee9  
  note: fragment rewritten, not deleted: deleting both fragments would leave L03 at 2 BUILD (floor 3)
- **S0567L03U03** (item 2)  
  before: it's been lovely watching the children play | ha sido estupendo viendo a los niños jugar  
  after: it's been lovely watching the children play | ha sido estupendo ver a los niños jugar  
  clips: t1:80adb2e2 t2:0ebac670
- **S0515L01U04** (item 3)  
  before: the first day of the journey was good | el primer día del camino fue bueno  
  after: the first day of the challenge was good | el primer día del desafío fue bueno  
  clips: k:c56ac56c t1:5d50aeb9 t2:e0418a08  
  note: rewritten not deleted: L01 has 4 USE, floor 5; desafío taught S0484L01
- **S0515L01U05** (item 3)  
  before: on the first day of the journey | el primer día del camino  
  after: on the first day of the month | el primer día del mes  
  clips: k:9ea3c6c9 t1:c42c7e7b t2:515ae402  
  note: rewritten not deleted (floor); mes taught S0037L04
- **S0535L02B03** (item 3)  
  before: she wouldn't choose the way | no elegiría el camino  
  after: he wouldn't choose that | no elegiría eso  
  clips: k:b498e2b2 t1:340b530b t2:97f43808  
  note: rewritten not deleted: L02 BUILD would fall to 2 (one a duplicate)
- **S0535L01U04** (item 4)  
  before: she made a promise that it was yesterday | hizo la promesa de que fue ayer  
  after: she made a promise that it would be different | hizo la promesa de que sería diferente  
  clips: k:a27cf6ed t1:1d3b96d5 t2:280ffb10  
  note: rewritten not deleted: L01 has 3 USE (floor 5); own choice
- **S0480L01U01** (item 5)  
  before: whatever he says, she knows better | diga lo que diga, ella sabe mejor  
  after: whatever he says, she knows better | diga lo que diga, ella sabe más  
  clips: t1:31b8e8ac t2:a0a01d11  
  note: English 'she knows better' kept
- **S0537L01U04** (item 5)  
  before: but I was wrong about everything | pero estaba equivocado sobre todo  
  after: but I was wrong about everything | pero estaba equivocado en todo  
  clips: t1:1207631f t2:2d6e02a1
- **S0619L01U06** (item 5)  
  before: we don't see each other any longer | no nos vemos por más tiempo  
  after: we don't see each other any more | ya no nos vemos  
  clips: k:f4959df8 t1:4f01fce9 t2:d81b50d8  
  note: English moved to 'any more': 'any longer' is taught as por más tiempo (S0563L03), 'not any more' as ya no (S0145L01)
- **S0144L01U06** (item 6)  
  before: I woke up this morning with the idea that I want to practise Spanish more | Me desperté esta mañana con la idea de que quiero practicar español más  
  after: I woke up this morning with the idea that I want to practise more | Me desperté esta mañana con la idea de que quiero practicar más  
  clips: k:4aba7199 t1:be4744b5 t2:8d5d5126
- **S0213L01U09** (item 6)  
  before: He told me not to explain anything about it | Me dijo que no debería explicar nada sobre eso  
  after: He told me I shouldn't explain anything about it | Me dijo que no debería explicar nada sobre eso  
  clips: k:421bc30d  
  note: English only
- **S0647L01U05** (item 6)  
  before: I can hear you speak it | puedo escuchar que lo habla  
  after: I know that you speak it | sé que lo habla  
  clips: k:ae9cff6b t1:f27da34a t2:6c228613
- **S0662L01U03** (item 6)  
  before: I can hear you all speak it | puedo escuchar que lo habláis  
  after: I know that you all speak it | sé que lo habláis  
  clips: k:42c9cef2 t1:30964d55 t2:46bfc409
- **S0427L01C01** (item 7)  
  before: you thought | pensaras  
  after: you to think | pensaras  
  clips: k:1d538c67  
  note: English only; the LEGO row itself still says 'you thought' (not touched)
- **S0133L01U05** (item 9)  
  before: When you get to know someone new it can be less exciting than what you thought | Cuando llegas a conocer a alguien nuevo puede ser menos emocionante de lo que pensaste  
  after: When you get to know someone new it can be less exciting than what you thought | Cuando llegas a conocer a alguien nuevo puede ser menos emocionante de lo que pensabas  
  clips: t1:0c152a9c t2:e84a621e
- **S0231L02B02** (item 8)  
  before: An elderly man | Un hombre mayor  
  after: An old man | Un hombre mayor  
  clips: k:e7944687  
  note: English only; not one of the 7 'ese' rows but same basket, same word
- **S0231L02B05** (item 8)  
  before: That elderly man works in the same place as my friend and is very helpful | Ese hombre mayor trabaja en el mismo sitio que mi amigo y es muy útil  
  after: That old man works in the same place as my friend and is very helpful | Ese hombre mayor trabaja en el mismo sitio que mi amigo y es muy útil  
  clips: k:2ea45551  
  note: English only
- **S0231L02U04** (item 8)  
  before: He said he did not want to talk to that elderly man about what he was doing | Dijo que no quería hablar con ese hombre mayor sobre lo que estaba haciendo  
  after: He said he did not want to talk to that old man about what he was doing | Dijo que no quería hablar con ese hombre mayor sobre lo que estaba haciendo  
  clips: k:ad92f292  
  note: English only
- **S0231L02U06** (item 8)  
  before: That elderly man seems to know a lot about this language and wants to talk about it | Ese hombre mayor parece saber mucho sobre este idioma y quiere hablar sobre eso  
  after: That old man seems to know a lot about this language and wants to talk about it | Ese hombre mayor parece saber mucho sobre este idioma y quiere hablar sobre eso  
  clips: k:d12df758  
  note: English only
- **S0231L02U07** (item 8)  
  before: I think that elderly man wanted to talk to you about something interesting | Creo que ese hombre mayor quería hablar contigo sobre algo interesante  
  after: I think that old man wanted to talk to you about something interesting | Creo que ese hombre mayor quería hablar contigo sobre algo interesante  
  clips: k:ddf58581  
  note: English only
- **S0231L02U09** (item 8)  
  before: I will ask that elderly man if he wants to talk about what we need | Le preguntaré a ese hombre mayor si quiere hablar sobre lo que necesitamos  
  after: I will ask that old man if he wants to talk about what we need | Le preguntaré a ese hombre mayor si quiere hablar sobre lo que necesitamos  
  clips: k:68c2452f  
  note: English only
- **S0231L02U10** (item 8)  
  before: I know an elderly man who knew the answer to what we were trying to find out | Conozco a un hombre mayor que sabía la respuesta a lo que estábamos intentando descubrir  
  after: I know an old man who knew the answer to what we were trying to find out | Conozco a un hombre mayor que sabía la respuesta a lo que estábamos intentando descubrir  
  clips: k:4277bb02  
  note: English only; not one of the 7 'ese' rows but same basket, same word
- **S0231L02U11** (item 8)  
  before: That elderly man wanted to tell me something new but I did not have time to listen | Ese hombre mayor quería decirme algo nuevo pero no tuve tiempo de escuchar  
  after: That old man wanted to tell me something new but I did not have time to listen | Ese hombre mayor quería decirme algo nuevo pero no tuve tiempo de escuchar  
  clips: k:962691f8  
  note: English only
- **S0231L02U15** (item 8)  
  before: That elderly man was working in the same office as my friend a while ago | Ese hombre mayor trabajaba en la misma oficina que mi amigo hace un rato  
  after: That old man was working in the same office as my friend a while ago | Ese hombre mayor trabajaba en la misma oficina que mi amigo hace un rato  
  clips: k:e9eba822  
  note: English only
- **S0567L03B02** (item 2)  
  before: I'm sure that watching the children play | estoy seguro de que viendo a los niños jugar  
  after: DELETED (fragment 'estoy seguro de que viendo…')
- **S0550L01B03** (item 3)  
  before: I'm sure that the end of the village is the way | estoy seguro de que el final del pueblo es el camino  
  after: DELETED (camino before S0559; B stays at 3)
- **S0535L01B02** (item 4)  
  before: he made a promise that | hizo la promesa de que  
  after: DELETED (exact duplicate of B01 (same clips))
- **S0197L03U10** (item 4)  
  before: My friend works in the language and he says it is very interesting | Mi amigo trabaja en el idioma y dice que es muy interesante  
  after: DELETED ('trabaja en el idioma')
- **S0150L03U02** (item 6)  
  before: I know what you are called but I am trying to remember now | Sé cómo te llamas pero estoy intentando recordar ahora  
  after: DELETED ('recordar ahora')
- **S0623L01U07** (item 6)  
  before: we had tea | teníamos té  
  after: DELETED ('teníamos té')

## Not touched
practicar hablando (Kai is deciding separately), the S0264L01 duplicate LEGO, the mood leftovers, busco las llaves and the #255 list. No row touched seeds 26/27/65/71/78/84 (#441·AI).

## Gap
- spa_for_eng edit-batch is slow: a 35-op dry run took 41 s. Between 13:28Z and roughly 15:40Z every call, dry runs of 4 ops included, died on the 60 s statement timeout. #443·AI hit the same. The cause was not diagnosed: I have no DB access by rule.
- All the new audio is unheard.

## Files
decisions.json · ops.json · text-dry-run.json · dry-run.json (full, with clips) · audio-plan-dry.json · audio-results.json · audio-map.json · apply-result.json · apply-attempt1/2-timeout.json · undo.json · readback.json · live-before/ (baskets as read) · tools/ (build/ops/audio composers) · listening-page-spec.json
