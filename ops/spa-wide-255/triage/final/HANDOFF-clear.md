# spa_for_eng — CLEAR fixes, apply-ready handoff (#255·AD, 4 Nov 2026)

**682 rows**, every one a practice phrase (BUILD or USE) under a played LEGO. No seed, LEGO or intro text changes here: those are all in the NEEDS-KAI list of the report. 87 rows are deletes; the rest are rewords.

**Checked on 4 Nov against a fresh read of the live course (after #259·AD):** every row's *before* text matches the live row (0 drift); every reword passes the gates in `ops/spa-wide-255/gates.py`: no untaught target word (P1/P2), the phrase still holds its LEGO (P17/K49), and no new same-English→two-Spanish clash for USE rows (K2/P16). Every delete leaves its basket at ≥4 USE and ≥1 BUILD with all deletes counted together. Exceptions are named on the row (`override`): 5 agreement fixes whose feminine/plural form the surface-form gate counts as new (K27 over K21), 4 'al otro lado' rows (al = a + el), and 8 rows whose LEGO was already present only as an article/clitic variant before the fix.

**How to apply (for the canon-trained applier):** the machine-readable list is `ops/spa-wide-255/triage/final/clear.jsonl` on branch `cs/255-spa-wide-grammar-sweep` of the Popty repo (fields: id, before [known, target], after [known, target or "DELETE"], reason, rule, knock_on, knock_on_of). Re-read the live row first and skip any whose text has moved. Then Popty `POST /api/production/spa_for_eng/edit-batch` (dry run, then `"apply": true`). Unapprove each touched seed (O5). Fill only the empty slots through `POST /api/audio/render`, library first and dry run first. Most English-only rewords need a new known clip only. The `knock_on` field lists rows elsewhere carrying the same defect; those rows are already in this list as their own entries.

Rules cited: K9 English grammatical/natural · K14 move the English when the Spanish fix needs an untaught form · K16 Spanish correct/natural · K26 person matches · K27 agreement follows the noun present · P7 no fragment as USE · P17 holds its LEGO · P28 use the taught form · 'Kai 30 Oct object rule' a dropped object counts.

## Seed 24
- **S0024L02U01** I can not explain what I want to say easily | No puedo explicar lo que quiero decir fácilmente  
  → **I can't explain what I want to say easily | No puedo explicar lo que quiero decir fácilmente**  
  'can not' as two words is wrong English; 'can't'. *(K9)*

## Seed 38
- **S0038L02U01** I've been learning for more or less all day | Llevo más o menos todo el día aprendiendo  
  → **I've been learning more or less all day | Llevo más o menos todo el día aprendiendo**  
  'for more or less all day' is not English; drop 'for'. *(K9)*
- **S0038L02U02** I've been learning Spanish for more or less all day | Llevo más o menos todo el día aprendiendo español  
  → **I've been learning Spanish more or less all day | Llevo más o menos todo el día aprendiendo español**  
  'for ... all day' is not English; drop 'for'. *(K9)*
- **S0038L02U03** I've been learning with you for more or less all day | Llevo más o menos todo el día aprendiendo contigo  
  → **I've been learning with you more or less all day | Llevo más o menos todo el día aprendiendo contigo**  
  'for ... all day' is not English; drop 'for'. *(K9)*

## Seed 45
- **S0045L01U07** DELETE — was: I don't need to know everything or improve right now | No necesito saber todo o mejorar ahora  
  After 'no necesito' Spanish joins the second item with 'ni', which is untaught; delete (basket keeps 6 USE, 3 BUILD). *(K16, P1)*
- **S0045L01U10** DELETE — was: She doesn't want to know or answer right now | Ella no quiere saber o contestar ahora  
  'no quiere saber o contestar' needs 'ni', which is untaught; delete (basket keeps 6 USE, 3 BUILD). *(K16, P1)*

## Seed 52
- **S0052L01U09** I feel like I want to write more in Spanish | Tengo ganas de escribir más en español  
  → **I feel like writing more in Spanish | Tengo ganas de escribir más en español**  
  'I feel like I want to write' doubles the wanting; 'tengo ganas de escribir' is 'I feel like writing'. *(K9, K6)*

## Seed 69
- **S0069L03U14** I'd like to look after the dog for a while today | Me gustaría cuidar al perro un poco hoy  
  → **I'd like to look after the dog for a bit today | Me gustaría cuidar al perro un poco hoy**  
  'un poco' is 'a bit', not 'for a while' ('un rato' untaught at 69); fix the English. *(K14)*
- **S0069L03U16** I'd like to look after the young dog for a while | Me gustaría cuidar al perro joven un poco  
  → **I'd like to look after the young dog for a bit | Me gustaría cuidar al perro joven un poco**  
  'un poco' is 'a bit', not 'for a while'; fix the English. *(K14)*

## Seed 83
- **S0083L03U11** DELETE — was: I was thinking about your friend when I was talking to everyone else | Estaba pensando sobre tu amigo cuando estaba hablando con todos los demás  
  Thinking about a person is 'pensar en', but the LEGO is 'sobre tu amigo'; no taught fix keeps the LEGO, so delete (basket keeps 14 USE, 5 BUILD). *(K16, P17)*

## Seed 85
- **S0085L01U02** I don't know people who speak Spanish | No conozco a personas que hablan español  
  → **I know people who don't speak Spanish | Conozco a personas que no hablan español**  
  'No conozco a personas que hablan' needs the subjunctive 'hablen' (untaught); re-worded to the positive 'I know people who don't speak Spanish', where the indicative is right. *(K16, P1)*

## Seed 87
- **S0087L01U04** They are not people who I know | No son personas que conozco  
  → **They are people who I don't know | Son personas que no conozco**  
  After the negated 'no son personas que' Spanish wants the subjunctive (untaught); re-worded to the seed's own 'son personas que no conozco'. *(K16, P1)*
- **S0087L01U08** Unfortunately they are not people who I know very well | Desafortunadamente no son personas que conozco muy bien  
  → **Unfortunately they are people who I don't know very well | Desafortunadamente son personas que no conozco muy bien**  
  Same negated-antecedent problem; re-worded to 'son personas que no conozco muy bien'. *(K16, P1)*

## Seed 95
- **S0095L01U15** I would like to go home soon after this | Me gustaría ir a casa pronto después de esto  
  → **I would like to go home soon after this | Me gustaría ir a casa poco después de esto**  
  'pronto después de esto' is a calque; 'soon after this' is 'poco después de esto'. *(K16)*

## Seed 99
- **S0099L02U10** She does not want to say that it is not working well | Ella no quiere decir que no está funcionando bien  
  → **She does not want to tell me that it is not working well | Ella no quiere decirme que no está funcionando bien**  
  'no quiere decir que' is heard as 'doesn't mean that'; 'no quiere decirme que' (She doesn't want to tell me) removes the trap. *(K16)*

## Seed 102
- **S0102L01B04** We are doing well | Estamos bien  
  → **We are doing well | Lo estamos haciendo bien**  
  'doing well' is 'lo estamos haciendo bien' by the standing ruling (lo taught S0072); 'Estamos bien' is 'we're fine'. *(ruling S0072, K16)*
- **S0102L01U07** We are doing well and we want to keep learning | Estamos bien y queremos seguir aprendiendo  
  → **We are doing well and we want to keep learning | Lo estamos haciendo bien y queremos seguir aprendiendo**  
  Same: 'We are doing well' = 'Lo estamos haciendo bien' by the standing ruling. *(ruling S0072, K16)*

## Seed 103
- **S0103L01U11** It is important to hear good Spanish every day | Es importante escuchar español bien todos los días  
  → **It is important to hear Spanish every day | Es importante escuchar español todos los días**  
  'español bien' is 'Spanish well', not 'good Spanish'; 'buen' is untaught, so drop 'good' on both sides. *(K16, P1)*

## Seed 106
- **S0106L01U10** I think we need to feel happy with how to say something in Spanish | Creo que necesitamos sentirnos contentos con cómo decir algo en español  
  → **I think we need to feel happy with what we want to say in Spanish | Creo que necesitamos sentirnos contentos con lo que queremos decir en español**  
  'contentos con cómo decir algo' is a calque on both sides; re-worded to 'con lo que queremos decir'. *(K16, K9)*
- **S0106L01U12** We want to feel happy with what we are trying | Queremos sentirnos contentos con lo que estamos intentando  
  → **We want to feel happy with what we are trying to say | Queremos sentirnos contentos con lo que estamos intentando decir**  
  'what we are trying' has no complement in either language; add 'to say' / 'decir'. *(K9, K16)*
- **S0106L01U15** I think it is interesting to feel happy with what I want to say | Creo que es interesante sentirnos contentos con lo que quiero decir  
  → **I think it is interesting to feel happy with what we want to say | Creo que es interesante sentirnos contentos con lo que queremos decir**  
  'sentirnos' (we) then 'quiero' (I) mixes persons; make both 'we'. *(K26)*
- **S0106L03U02** I think we need to work speaking with another person | Creo que necesitamos trabajar hablando con otra persona  
  → **I think we need to work with another person | Creo que necesitamos trabajar con otra persona**  
  Same 'work speaking with another person' / 'trabajar hablando' garble; drop 'speaking'. *(K9, K16 · knock-on of S0107L01U14)*
- **S0106L03U04** I want to work speaking as often as possible | Quiero trabajar hablando lo más a menudo posible  
  → **I want to work as often as possible | Quiero trabajar lo más a menudo posible**  
  Same 'work speaking' garble; drop 'speaking'. *(K9, K16 · knock-on of S0107L01U14)*
- **S0106L03U07** I think it is useful to work speaking with another person | Creo que es útil trabajar hablando con otra persona  
  → **I think it is useful to work with another person | Creo que es útil trabajar con otra persona**  
  Same 'work speaking' garble; drop 'speaking'. *(K9, K16 · knock-on of S0107L01U14)*
- **S0106L03U15** I like to work speaking with another person | Me gusta trabajar hablando con otra persona  
  → **I like to work with another person | Me gusta trabajar con otra persona**  
  Same 'work speaking' garble; drop 'speaking'. *(K9, K16 · knock-on of S0107L01U14)*

## Seed 107
- **S0107L01U14** We were hoping to work speaking with another person | Esperábamos trabajar hablando con otra persona  
  → **We were hoping to speak with another person | Esperábamos hablar con otra persona**  
  'work speaking with another person' / 'trabajar hablando' is garbled; drop 'work'. *(K9, K16 · same defect also in S0106L03U02, S0106L03U04, S0106L03U07, S0106L03U15)*
- **S0107L02U03** I think it is useful to see what we are trying | Creo que es útil ver lo que estamos intentando  
  → **I think it is useful to see what we are doing | Creo que es útil ver lo que estamos haciendo**  
  'what we are trying' dangles in both languages; use 'doing' / 'haciendo' as the seed does. *(K9)*
- **S0107L02U09** We want to see what you are doing speaking with another person | Queremos ver lo que estás haciendo hablando con otra persona  
  → **We want to see what you are doing with another person | Queremos ver lo que estás haciendo con otra persona**  
  'what you are doing speaking with' is garbled; drop 'speaking' / 'hablando'. *(K9, K16)*
- **S0107L03U01** I think you were doing very well learning | Creo que lo estabas haciendo muy bien aprendiendo  
  → **I think you were doing very well | Creo que lo estabas haciendo muy bien**  
  'doing very well learning' is garbled; drop the tail. *(K9, K16)*

## Seed 110
- **S0110L03U13** I want to relax a little now but I would also like to keep trying to speak Spanish later today | Quiero relajarme un poco ahora pero me gustaría seguir intentando hablar español después hoy  
  → **I want to relax a little now but I would also like to keep trying to speak Spanish later today | Quiero relajarme un poco ahora pero me gustaría seguir intentando hablar español hoy más tarde**  
  'después hoy' is not Spanish for 'later today'; 'hoy más tarde' (taught words). *(K16 · same defect also in S0184L02U06)*

## Seed 111
- **S0111L04U05** It's important when we learn to try to say things as much as possible | Es importante cuando aprendemos intentar decir cosas lo más posible  
  → **It's important to try to say things as much as possible when we learn | Es importante intentar decir cosas lo más posible cuando aprendemos**  
  'Es importante cuando aprendemos intentar...' does not parse; move the 'cuando' clause to the end on both sides. *(K16, K49)*

## Seed 112
- **S0112L05U05** DELETE — was: I wasn't expecting it to feel like this when I started learning a new language | No lo esperaba sentirme así cuando empecé a aprender un nuevo idioma  
  'No lo esperaba sentirme así' is ungrammatical (lo + infinitive clause) and the LEGO keeps 'lo'; delete (basket keeps 9 USE, 4 BUILD). *(K16, P17)*
- **S0112L05U10** I agree with you that was very interesting and I wasn't expecting it | Estoy de acuerdo contigo que eso fue muy interesante y no lo esperaba  
  → **I agree with you that that was very interesting and I wasn't expecting it | Estoy de acuerdo contigo en que eso fue muy interesante y no lo esperaba**  
  'estar de acuerdo contigo que' needs 'en que'; English needs its second 'that'. *(K16, K9)*

## Seed 114
- **S0114L01U02** I'm doing worse today | Estoy haciendo peor hoy  
  → **I'm doing worse today | Lo estoy haciendo peor hoy**  
  'doing worse' = 'lo estoy haciendo peor', as the seed and the S0072 ruling have it. *(ruling S0072)*

## Seed 116
- **S0116L01U10** I need a different option for how to practise | Necesito una opción diferente para practicar  
  → **I need a different option for practising | Necesito una opción diferente para practicar**  
  'for how to practise' has no 'how' in 'para practicar'; 'for practising'. *(K9)*
- **S0116L04U08** I think that this isn't the best option I could choose and I want to do better | Creo que esta no es la mejor opción que podría elegir y quiero hacer lo mejor posible  
  → **I think that this isn't the best option I could choose and I want to do my best | Creo que esta no es la mejor opción que podría elegir y quiero hacer lo mejor posible**  
  'hacer lo mejor posible' is 'do my best' (as the course uses it at S0168, S0244), not 'do better'; fix the English. *(K14, K3)*

## Seed 117
- **S0117L01U04** I think this is definitely the best choice I could make right now | Creo que sin duda esta es la mejor opción que podría hacer en este momento  
  → **I think this is definitely the best choice I could make right now | Creo que sin duda esta es la mejor opción que podría elegir en este momento**  
  'opción que podría hacer' is a calque; the course taught 'opción que podría elegir' (S0116L04). *(K16)*
- **S0117L03U04** I want to talk to you more than we talked last night | Quiero hablar contigo más que la última vez que hablamos anoche  
  → **I want to talk to you more than the last time we talked | Quiero hablar contigo más que la última vez que hablamos**  
  'más que la última vez que hablamos anoche' is muddled; drop 'anoche' and say 'the last time we talked'. *(K16, K9)*
- **S0117L03U14** I want to do much better than the last time we spoke Spanish together | Quiero hacer mucho mejor que la última vez que hablamos español contigo  
  → **I want to do much better than the last time we spoke Spanish | Lo quiero hacer mucho mejor que la última vez que hablamos español**  
  'hacer mucho mejor' needs 'lo'; proclitic 'Lo quiero hacer' (taught S0072, as S0072L01U05) and 'together'/'contigo' removed. *(ruling S0072, P27)*
- **S0117L03U18** DELETE — was: I'd like to try to do better than the last time we spoke this afternoon | Me gustaría intentar hacer mejor que la última vez que hablamos esta tarde  
  'intentar hacer mejor' needs 'hacerlo' (enclitic -lo untaught before 146); delete (basket keeps 19 USE, 7 BUILD). *(P27, K16)*
- **S0117L04U05** I am definitely doing better than the last time we talked right now | Sin duda lo estoy haciendo mejor que la última vez que hablamos ahora  
  → **I am definitely doing better right now than the last time we talked | Sin duda lo estoy haciendo mejor ahora que la última vez que hablamos**  
  'right now' sat on the past clause in both languages; move it to 'doing better ... now'. *(K16, K49)*

## Seed 122
- **S0122L04U02** I am very excited with what I am learning here now | Estoy muy emocionado con lo que estoy aprendiendo aquí ahora  
  → **I am very excited about what I am learning here now | Estoy muy emocionado con lo que estoy aprendiendo aquí ahora**  
  'excited with' is not English; 'excited about' (the seed's own word). *(K9 · same defect also in S0122L04U04, S0122L04U06, S0122L04U08, S0122L04U09, S0122L05U05, S0122L05U07, S0122L05U13)*
- **S0122L04U04** My friend is very excited with what he is doing | Mi amigo está muy emocionado con lo que está haciendo  
  → **My friend is very excited about what he is doing | Mi amigo está muy emocionado con lo que está haciendo**  
  Same 'excited with' -> 'excited about'. *(K9 · knock-on of S0122L04U02)*
- **S0122L04U06** I am very excited with everything I am learning at this moment | Estoy muy emocionado con todo lo que estoy aprendiendo en este momento  
  → **I am very excited about everything I am learning at this moment | Estoy muy emocionado con todo lo que estoy aprendiendo en este momento**  
  'excited with' -> 'excited about'. *(K9)*
- **S0122L04U08** It is starting to get easier and I am excited with how it is going | Está empezando a ser más fácil y estoy emocionado con cómo va  
  → **It is starting to get easier and I am excited about how it is going | Está empezando a ser más fácil y estoy emocionado con cómo va**  
  'excited with' -> 'excited about'. *(K9)*
- **S0122L04U09** I am excited with how it is going and I want to keep learning | Estoy emocionado con cómo va y quiero seguir aprendiendo  
  → **I am excited about how it is going and I want to keep learning | Estoy emocionado con cómo va y quiero seguir aprendiendo**  
  'excited with' -> 'excited about'. *(K9)*
- **S0122L05U05** I am excited with how it goes and I want to keep learning more | Estoy emocionado con cómo va y quiero seguir aprendiendo más  
  → **I am excited about how it goes and I want to keep learning more | Estoy emocionado con cómo va y quiero seguir aprendiendo más**  
  'excited with' -> 'excited about'. *(K9)*
- **S0122L05U07** It is starting to get easier and I am excited with how it goes | Está empezando a ser más fácil y estoy emocionado con cómo va  
  → **It is starting to get easier and I am excited about how it goes | Está empezando a ser más fácil y estoy emocionado con cómo va**  
  'excited with' -> 'excited about'. *(K9)*
- **S0122L05U13** It goes well and I am very excited with everything I am learning | Va bien y estoy muy emocionado con todo lo que estoy aprendiendo  
  → **It goes well and I am very excited about everything I am learning | Va bien y estoy muy emocionado con todo lo que estoy aprendiendo**  
  'excited with' -> 'excited about'. *(K9)*

## Seed 126
- **S0126L01U12** I'm enjoying this work a lot and I want to keep going with it | Estoy disfrutando este trabajo mucho y quiero seguir haciendo esto  
  → **I'm enjoying this work a lot and I want to keep doing this | Estoy disfrutando mucho este trabajo y quiero seguir haciendo esto**  
  'disfrutando este trabajo mucho' has 'mucho' misplaced, and 'keep going with it' is not 'seguir haciendo esto'. *(K16, K49)*
- **S0126L05U16** I like that learning is changing the shape of my brain | Me gusta que aprender está cambiando la forma de mi cerebro  
  → **Learning is changing the shape of my brain and I like that | Aprender está cambiando la forma de mi cerebro y me gusta**  
  'Me gusta que' needs the subjunctive ('esté', untaught); re-ordered to 'Aprender está cambiando ... y me gusta'. *(K16, P1)*
- **S0126L05U22** I like that practicing is changing the shape of my brain | Me gusta que practicar está cambiando la forma de mi cerebro  
  → **Practising is changing the shape of my brain and I like that | Practicar está cambiando la forma de mi cerebro y me gusta**  
  Same: re-ordered to 'Practicar está cambiando ... y me gusta'. *(K16, P1)*

## Seed 127
- **S0127L01U04** DELETE — was: I know this is very good for my brain so I want to keep doing it | Sé que esto es muy bueno por mi cerebro así quiero seguir haciendo esto  
  'bueno por mi cerebro' must be 'para' and 'así' must be 'así que', but the LEGO is 'for = por'; delete (basket keeps 7 USE, 5 BUILD). *(K16, P17 · same defect also in S0127L01U06)*
- **S0127L01U06** What he is doing for us today is very important | Lo que está haciendo para nosotros hoy es muy importante  
  → **What he is doing for us today is very important | Lo que está haciendo por nosotros hoy es muy importante**  
  In the 'for = por' basket this row says 'para nosotros' and so lacks its LEGO; 'por nosotros' (for our sake) is right here. *(P17, K16 · knock-on of S0127L01U04)*

## Seed 128
- **S0128L03U06** I want to find someone who wants to practise Spanish with me | Quiero encontrar a alguien que quiere practicar español conmigo  
  → **I want to find someone to practise Spanish with | Quiero encontrar a alguien para practicar español**  
  A person still being looked for takes the subjunctive ('quiera', untaught); re-worded to 'alguien para practicar español'. *(K16, P1 · same defect also in S0128L03U10, S0128L03U11, S0132L02U11)*
- **S0128L03U10** DELETE — was: He wants to find someone who is very good at Spanish | Él quiere encontrar a alguien que es muy bueno en español  
  Needs subjunctive 'sea' (untaught) for a person still being looked for; delete (basket keeps 5 USE, 4 BUILD). *(K16, P1)*
- **S0128L03U11** DELETE — was: I want to practise with someone who wants to learn Spanish | Quiero practicar con alguien que quiere aprender español  
  Needs subjunctive 'quiera' (untaught) for a non-specific person; delete (basket keeps 5 USE, 4 BUILD). *(K16, P1)*
- **S0128L05U06** She wants to explain something to me before I have to start | Ella quiere explicar algo antes de que tenga que empezar  
  → **She wants to explain something before I have to start | Ella quiere explicar algo antes de que tenga que empezar**  
  'explain something to me' has 'me' in English only (dropped object, Kai 30 Oct); fix the English. *(K14)*
- **S0128L05U08** I know you are someone who wants to understand this before it gets too difficult | Sé que eres alguien que quiere entender esto antes de que es demasiado difícil  
  → **I know you are someone who wants to understand this before you leave | Sé que eres alguien que quiere entender esto antes de que te vayas**  
  'antes de que es' needs the subjunctive ('sea', untaught); re-worded with the taught 'antes de que te vayas'. *(K16, P1)*

## Seed 129
- **S0129L01U05** This was so difficult before, but now you understand it better | Esto era tan difícil antes, pero ahora entiendes mejor  
  → **This was so difficult before, but now you understand better | Esto era tan difícil antes, pero ahora entiendes mejor**  
  'understand it' has 'it' in English only (dropped object); drop 'it'. *(K14)*
- **S0129L04B04** That you are here | De que estés aquí  
  → **That you are here | Que estés aquí**  
  The 'de' belongs to 'contento de que', not to this fragment; 'That you are here' = 'Que estés aquí' (as sibling B02). *(P17)*
- **S0129L04B05** That you are doing it | De que lo estés haciendo  
  → **That you are doing it | Que lo estés haciendo**  
  Same: 'That you are doing it' = 'Que lo estés haciendo'. *(P17)*

## Seed 130
- **S0130L01U03** DELETE — was: That was a surprise to me | Eso me fue una sorpresa  
  'Eso me fue una sorpresa' is not Spanish; 'para mí' is untaught; delete (basket keeps 6 USE, 5 BUILD). *(K16, P1)*

## Seed 131
- **S0131L01U07** It is too many words to remember all at once | Son demasiadas palabras para recordar de una vez  
  → **That's too many words to remember all at once | Son demasiadas palabras para recordar de una vez**  
  'It is too many words' -> 'That's too many words'. *(K9)*

## Seed 132
- **S0132L02U11** DELETE — was: It is less exciting when you are not talking with someone who wants to say something interesting | Es menos emocionante cuando no estás hablando con alguien que quiere decir algo interesante  
  Same indicative after a non-specific 'alguien que quiere' (needs untaught 'quiera'); delete (basket keeps 4 USE, 2 BUILD). *(K16, P1 · knock-on of S0128L03U06)*
- **S0132L04B06** What she was saying was very interesting to listen to | Lo que ella estaba diciendo fue muy interesante para escuchar  
  → **What she was saying was very interesting to listen to | Lo que ella estaba diciendo fue muy interesante de escuchar**  
  'interesante para escuchar' is wrong for 'interesting to listen to'; 'interesante de escuchar'. *(K16)*
- **S0132L04U13** She was saying that making mistakes when you speak is how you learn to get better | Ella estaba diciendo que cometer errores cuando hablas es cómo aprender a mejorar  
  → **She was saying that making mistakes when we speak is how we learn to get better | Ella estaba diciendo que cometer errores cuando hablamos es como aprendemos a mejorar**  
  'es cómo aprender a mejorar' is wrong (accent, infinitive); 'es como aprendemos a mejorar', with 'we' on both sides ('aprendes' untaught). *(K16, K26)*
- **S0132L04U16** This conversation is less exciting than what she was saying before we started | Esta conversación es menos emocionante de lo que ella estaba diciendo antes de hablar  
  → **This conversation is less exciting than what she was saying before we started | Esta conversación es menos emocionante de lo que ella estaba diciendo antes de empezar**  
  'antes de hablar' is 'before speaking', not 'before we started'; 'antes de empezar'. *(K16)*

## Seed 133
- **S0133L01U14** She said it is exciting when you get to know someone new and start working together | Ella dijo que es emocionante cuando llegas a conocer a alguien nuevo y empezar a trabajar juntos  
  → **She said it is exciting when you get to know someone new | Ella dijo que es emocionante cuando llegas a conocer a alguien nuevo**  
  'llegas ... y empezar' mixes a finite verb and an infinitive ('empiezas' untaught); drop the second clause on both sides. *(K16, P1)*
- **S0133L02U10** DELETE — was: I think it was more exciting than what she was saying when you work together very well | Creo que fue más emocionante de lo que ella estaba diciendo trabajando juntos muy bien  
  Garbled in both languages (past 'was' against present 'when you work'); delete (basket keeps 15 USE, 3 BUILD). *(K9, K16)*
- **S0133L02U16** She was saying that you get to know someone better when you work together more time | Ella estaba diciendo que llegas a conocer a alguien mejor trabajando juntos más tiempo  
  → **She was saying that you get to know someone better when you work together for longer | Ella estaba diciendo que llegas a conocer a alguien mejor trabajando juntos más tiempo**  
  'work together more time' is not English; 'for longer'. *(K9)*

## Seed 134
- **S0134L01U12** It is not a problem if you get to know someone slowly working together | No es un problema si llegas a conocer a alguien despacio trabajando juntos  
  → **It is not a problem if you get to know someone slowly by working together | No es un problema si llegas a conocer a alguien despacio trabajando juntos**  
  'slowly working together' needs 'by'. *(K9)*
- **S0134L02U05** It was less exciting than I expected working together at something difficult | Fue menos emocionante de lo que esperaba trabajando juntos en algo difícil  
  → **It was less exciting than I expected, working together at something difficult | Fue menos emocionante de lo que esperaba trabajando juntos en algo difícil**  
  The dangling participle needs a comma: 'than I expected, working together...'. *(K9)*
- **S0134L02U06** When you work at something difficult with someone you get to know someone in a new way | Cuando trabajas en algo difícil con alguien llegas a conocer a alguien de manera diferente  
  → **When you work at something difficult with someone you get to know someone in a different way | Cuando trabajas en algo difícil con alguien llegas a conocer a alguien de manera diferente**  
  'de manera diferente' is 'in a different way', not 'in a new way'; fix the English. *(K14)*
- **S0134L02U13** DELETE — was: It was more interesting than what she was saying when you work at something difficult | Fue más interesante de lo que ella estaba diciendo cuando trabajas en algo difícil juntos  
  Garbled tense mix, and 'juntos' is in the Spanish only; delete (basket keeps 7 USE, 4 BUILD). *(K9, K16)*

## Seed 135
- **S0135L01B05** She said that I don't know what to say with them | Ella dijo que no sé qué decir con ellos  
  → **She said that I don't know what to say | Ella dijo que no sé qué decir**  
  'what to say with them' / 'qué decir con ellos' is wrong in both; drop 'with them'. *(K9, K16)*

## Seed 137
- **S0137L03U13** It's more important to talk with other people than to be perfect when you're alone | Es más importante hablar con otras personas que ser perfecto cuando estás solo  
  → **It's more important to talk with other people than to be perfect when you're learning | Es más importante hablar con otras personas que ser perfecto cuando estás aprendiendo**  
  'talk with other people ... when you're alone' contradicts itself; 'when you're learning' / 'cuando estás aprendiendo'. *(K9, K16)*

## Seed 140
- **S0140L01U01** I'm sorry, but I can't see what you try to show me | Lo siento, pero no puedo ver lo que intentas mostrarme  
  → **I'm sorry, but I can't see what you're trying to show me | Lo siento, pero no puedo ver lo que intentas mostrarme**  
  'what you try to show me' -> 'what you're trying to show me', as the seed and U07-U09 in this basket already say. *(K9, K6)*
- **S0140L01U02** I know what you try to say | Sé lo que intentas decir  
  → **I know what you're trying to say | Sé lo que intentas decir**  
  'what you try to say' -> 'what you're trying to say' (basket U08 already says it). *(K9, K6 · same defect also in S0140L01U01, S0140L01U03, S0140L01U04, S0140L01U05, S0140L01U06)*
- **S0140L01U03** I know what you try to explain | Sé lo que intentas explicar  
  → **I know what you're trying to explain | Sé lo que intentas explicar**  
  'you try to explain' -> 'you're trying to explain'. *(K9, K6)*
- **S0140L01U04** I can see what you try to do | Puedo ver lo que intentas hacer  
  → **I can see what you're trying to do | Puedo ver lo que intentas hacer**  
  'you try to do' -> 'you're trying to do'. *(K9, K6)*
- **S0140L01U05** I want to know what you try to do | Quiero saber lo que intentas hacer  
  → **I want to know what you're trying to do | Quiero saber lo que intentas hacer**  
  'you try to do' -> 'you're trying to do'. *(K9, K6)*
- **S0140L01U06** I enjoy what you try to show me | Disfruto lo que intentas mostrarme  
  → **I enjoy what you're trying to show me | Disfruto lo que intentas mostrarme**  
  'you try to show me' -> 'you're trying to show me'. *(K9, K6)*

## Seed 141
- **S0141L02U06** Everything is okay and I am starting to feel better about my Spanish | Todo está bien y estoy empezando a sentirme mejor sobre mi español  
  → **Everything is okay and I am starting to feel better about my Spanish | Todo está bien y estoy empezando a sentirme mejor con mi español**  
  'sentirme mejor sobre mi español' is a calque; 'con mi español'. *(K16)*

## Seed 144
- **S0144L01U06** I woke up this morning with the idea that I want to practise Spanish more | Me desperté esta mañana con la idea de que quiero practicar español más  
  → **I woke up this morning with the idea that I want to practise Spanish more | Me desperté esta mañana con la idea de que quiero practicar más español**  
  'practicar español más' -> 'practicar más español'. *(K16, K49)*

## Seed 145
- **S0145L01B01** Any more | ya  
  → **Already | ya**  
  Bare 'ya' is 'Already' (the LEGO), not 'Any more'. *(P17)*
- **S0145L01U05** I can already speak a little Spanish and that is very good | Ya puedo hablar español un poco y eso es muy bueno  
  → **I can already speak a little Spanish and that is very good | Ya puedo hablar un poco de español y eso es muy bueno**  
  'hablar español un poco' -> 'hablar un poco de español'. *(K16)*
- **S0145L01U09** I already have the idea of what I want to do today | Ya tengo la idea de lo que quiero hacer hoy  
  → **I already have an idea of what I want to do today | Ya tengo una idea de lo que quiero hacer hoy**  
  'la idea de lo que' is a calque; 'una idea' / 'an idea' on both sides. *(K16, K9)*

## Seed 146
- **S0146L01U11** I think it seems very important to learn that | Creo que parece muy importante aprender eso  
  → **It seems very important to learn that | Parece muy importante aprender eso**  
  'Creo que parece' stacks two hedges on both sides; drop 'I think / creo que' and keep the LEGO 'parece'. *(K16, P17)*
- **S0146L03B04** Since I am here | Desde que estoy aquí  
  → **Since I have been here | Desde que estoy aquí**  
  Temporal 'desde que estoy aquí' is 'Since I have been here'; 'Since I am here' reads as 'because'. *(K9)*
- **S0146L03U02** Since I started I am learning a lot in a little time | Desde que empecé estoy aprendiendo mucho en poco tiempo  
  → **Since I started I have been learning a lot in a short time | Desde que empecé estoy aprendiendo mucho en poco tiempo**  
  'Since I started I am learning ... in a little time' -> present perfect and 'a short time'. *(K9)*
- **S0146L03U05** Since we are here I am starting to understand more | Desde que estamos aquí estoy empezando a entender más  
  → **Since we have been here I am starting to understand more | Desde que estamos aquí estoy empezando a entender más**  
  'Since we are here' reads as 'because'; 'Since we have been here'. *(K9)*
- **S0146L03U07** DELETE — was: I don't know how long I have been learning since I started | No sé cuánto tiempo llevo aprendiendo desde que empecé  
  'how long I have been learning since I started' says the same thing twice; the perfect needed for a re-word is untaught; delete (basket keeps 13 USE, 4 BUILD). *(K9, K16)*
- **S0146L03U12** DELETE — was: How long have you been learning Spanish since you started? | ¿Cuánto tiempo llevas aprendiendo español desde que empezaste?  
  'How long ... since you started?' is circular; delete (basket keeps 13 USE, 4 BUILD). *(K9, K16)*
- **S0146L03U15** Since I am here with you I am starting to feel much better speaking | Desde que estoy aquí contigo estoy empezando a sentirme mucho mejor hablando  
  → **Since I have been here with you I am starting to feel much better speaking | Desde que estoy aquí contigo estoy empezando a sentirme mucho mejor hablando**  
  'Since I am here with you' reads as 'because'; 'Since I have been here with you'. *(K9)*
- **S0146L04U07** I am not sure why it is not working when we tried it | No estoy seguro de por qué no está funcionando cuando lo intentamos  
  → **I am not sure why it is not working since we tried it | No estoy seguro de por qué no está funcionando desde que lo intentamos**  
  Present 'is not working' with past 'when we tried it' clashes in both; 'since we tried it' / 'desde que lo intentamos', as the seed says. *(K9, K16)*

## Seed 147
- **S0147L03U15** When she saw me she was very happy | Cuando me vio estaba muy contento  
  → **When she saw me I was very happy | Cuando me vio estaba muy contento**  
  'estaba muy contento' with 'she' needs 'contenta' (untaught); make the English 'I was very happy', which the masculine fits. *(K27, K14)*

## Seed 150
- **S0150L03U02** I know what you are called but I am trying to remember now | Sé cómo te llamas pero estoy intentando recordar ahora  
  → **I think I know what you are called but I am trying to remember now | Creo que sé cómo te llamas pero estoy intentando recordar ahora**  
  'I know your name but I am trying to remember it' contradicts itself; 'I think I know' makes it sensible. *(K9, K16)*
- **S0150L03U14** I want to know what you are called because you get to know someone very well working together | Quiero saber cómo te llamas porque llegas a conocer a alguien muy bien trabajando juntos  
  → **I want to know what you are called because we are working together | Quiero saber cómo te llamas porque estamos trabajando juntos**  
  The reason given ('you get to know someone very well working together') does not follow; a simple reason keeps the taught words. *(K9, K16)*

## Seed 151
- **S0151L03U01** That was not what I was hoping would happen today here | Eso no era lo que esperaba que pasara hoy aquí  
  → **That was not what I was hoping would happen here today | Eso no era lo que esperaba que pasara hoy aquí**  
  'today here' is unnatural English word order; the Spanish 'hoy aquí' is fine. *(K9)*

## Seed 153
- **S0153L01U09** I think I have said it well but I am not completely sure | Creo que lo he dicho bien pero no estoy seguro de nada  
  → **I think I have said it well but I am not sure | Creo que lo he dicho bien pero no estoy seguro**  
  'no estoy seguro de nada' means 'not sure of anything', not 'not completely sure'; 'completamente' is untaught, so both sides drop the qualifier. *(K16, K14)*
- **S0153L01U14** I have said everything I wanted to say very carefully | Lo he dicho todo lo que quería con mucho cuidado  
  → **I have said everything I wanted to say very carefully | He dicho todo lo que quería decir con mucho cuidado**  
  'Lo he dicho todo lo que quería' doubles the object and drops 'to say'. *(K16)*
- **S0153L02U13** That is exactly what I thought would happen when I started learning | Eso es exactamente lo que esperaba que pasara cuando empecé a aprender  
  → **That is exactly what I was hoping would happen when I started learning | Eso es exactamente lo que esperaba que pasara cuando empecé a aprender**  
  'esperaba que pasara' is taught as 'I was hoping would happen', not 'I thought would happen'. *(K3, Kai 2026-08-24)*
- **S0153L02U14** I am not sure exactly what you wanted to tell me | No estoy seguro de exactamente lo que querías decirme  
  → **I am not sure exactly what you wanted to tell me | No estoy seguro de lo que querías decirme exactamente**  
  'de exactamente lo que' is stilted; 'exactamente' sits naturally at the end of the clause. *(K16, K49)*
- **S0153L03U02** I would like to learn in the same way as we are doing now | Me gustaría aprender de la misma manera que estamos haciendo ahora  
  → **I would like to learn in the same way as we are doing now | Me gustaría aprender de la misma manera que lo estamos haciendo ahora**  
  'de la misma manera que estamos haciendo' needs the object 'lo' (taught S0072, 'lo estoy haciendo'). *(K16, P27 · same defect also in S0153L03U08)*
- **S0153L03U08** I am trying to learn in the same way as you are doing | Estoy intentando aprender de la misma manera que estás haciendo  
  → **I am trying to learn in the same way as you are doing | Estoy intentando aprender de la misma manera que lo estás haciendo**  
  Same as U02: 'que estás haciendo' needs 'lo'. *(K16, P27 · knock-on of S0153L03U02)*
- **S0153L03U09** What you said is exactly the same way as I think about it | Lo que dijiste es exactamente de la misma manera que pienso  
  → **I think about it in exactly the same way as before | Pienso en eso exactamente de la misma manera que antes**  
  'What you said is exactly the same way as I think about it' is garbled in both languages; 'tú' is untaught here, so the comparison is with 'before'. *(K9, K16)*

## Seed 155
- **S0155L02U15** I'm not sure if a few minutes is enough time to explain this | No estoy seguro de si unos minutos es suficientes para explicar esto  
  → **I'm not sure if a few minutes is enough time to explain this | No estoy seguro de si unos minutos son suficientes para explicar esto**  
  'unos minutos es suficientes' mixes singular verb with plural adjective. *(K16, K27)*
- **S0155L03U02** I want to go and meet with you in the morning before it gets late | Quiero ir a reunirse contigo por la mañana antes de tarde  
  → **I want to go and see you in the morning | Quiero ir a verte por la mañana**  
  'ir a reunirse contigo' is the wrong person, 'reunirme' is untaught, and 'antes de tarde' is not Spanish; 'ir a verte' (taught, see U14) says the same thing. *(K16, K26, P27 · same defect also in S0155L03U05, S0155L03U12)*
- **S0155L03U05** I was thinking it would be better to talk in the morning before it gets late | Estaba pensando que sería mejor hablar por la mañana antes de tarde  
  → **I was thinking it would be better to talk in the morning | Estaba pensando que sería mejor hablar por la mañana**  
  'antes de tarde' is not Spanish and 'antes de que sea tarde' needs untaught 'sea'; dropping the clause leaves a natural sentence. *(K16, K14 · knock-on of S0155L03U02)*
- **S0155L03U12** I'm going to meet up here in the morning if you want | Voy a reunirme aquí por la mañana si quieres  
  → **I'm going to see you here in the morning if you want | Voy a verte aquí por la mañana si quieres**  
  'reunirme' (enclitic -me on reunir) is untaught at 155 and 'meet up here' had no partner; 'verte' is taught in this basket. *(P27, P2 · knock-on of S0155L03U02)*

## Seed 156
- **S0156L01U08** I'd like to go when I feel more ready to talk to people | Me gustaría ir cuando me siento más listo para hablar con personas  
  → **I'd like to go but I don't feel ready to talk to people yet | Me gustaría ir pero todavía no me siento listo para hablar con personas**  
  'cuando me siento' about a future moment needs the subjunctive 'sienta', untaught until seed 542; reworded with taught 'no me siento listo'. *(K16, K14)*
- **S0156L01U12** I'm going to go here whenever you want because I want to talk with you | Voy a ir aquí cuando quieras porque quiero hablar contigo  
  → **I'm going to go whenever you want because I want to talk with you | Voy a ir cuando quieras porque quiero hablar contigo**  
  'go here' contradicts itself; 'aquí' dropped on both sides. *(K9, K16 · same defect also in S0156L01U13)*
- **S0156L01U13** I want to go here this afternoon to talk with my friends | Quiero ir aquí esta tarde para hablar con mis amigos  
  → **I want to go this afternoon to talk with my friends | Quiero ir esta tarde para hablar con mis amigos**  
  Same as U12: 'go here' is odd; 'aquí' dropped on both sides. *(K9, K16 · knock-on of S0156L01U12)*
- **S0156L01U14** She wanted to go but wasn't sure when | Ella quería ir pero no estaba seguro de cuándo  
  → **He wanted to go but wasn't sure when | Él quería ir pero no estaba seguro de cuándo**  
  'Ella ... seguro' breaks agreement and 'segura' is untaught here, so the subject becomes 'he'. *(K27, K14)*
- **S0156L02U05** DELETE — was: It surprises me that a friend wanted to help me with this | Me sorprende que un amigo quería ayudarme con esto  
  'Me sorprende que' needs the subjunctive ('quisiera'/'quiera'), neither taught by seed 156; no taught rewording keeps the sense. Basket keeps 5 BUILD and 6 USE. *(K16, K14)*

## Seed 157
- **S0157L01U11** I need to be there before the morning if possible | Necesito estar allí antes de la mañana si es posible  
  → **I need to be there before tomorrow if possible | Necesito estar allí antes de mañana si es posible**  
  'antes de la mañana' is a calque and 'before the morning' is odd English; 'antes de mañana' is taught. *(K9, K16)*
- **S0157L02U11** So I hope that next month I'm going to be able to speak better | Así que espero que el mes que viene voy a poder hablar mejor  
  → **So I hope that next month I'm going to be able to speak better | Así que espero que el mes que viene pueda hablar mejor**  
  'espero que' needs the subjunctive; 'pueda' is taught (seed 7, 'todo lo que pueda'). *(K16)*
- **S0157L02U14** So I'm going to practise talking with another person next month as much as possible | Así que el mes que viene voy a practicar hablando con otra persona lo más a menudo posible  
  → **So I'm going to practise talking with another person next month as often as possible | Así que el mes que viene voy a practicar hablando con otra persona lo más a menudo posible**  
  'lo más a menudo posible' is 'as often as possible'; 'as much as possible' is taught as 'lo más posible'. *(K3, ZUT · same defect also in S0188L02U11)*

## Seed 161
- **S0161L02U06** I wouldn't like to guess, I want you to be able to give me the answer | No me gustaría adivinar quiero que puedes darme la respuesta  
  → **I wouldn't like to guess, can you give me the answer? | No me gustaría adivinar, ¿puedes darme la respuesta?**  
  'quiero que puedes' needs the subjunctive 'puedas', untaught until seed 292; reworded with taught 'puedes darme'. *(K16, K14)*

## Seed 162
- **S0162L01B03** I want to know what do you think about that | Quiero saber qué piensas de eso  
  → **I want to know what you think about that | Quiero saber qué piensas de eso**  
  An embedded question takes statement order in English ('know what you think'); the Spanish is fine. Dropping 'do' is a known-side surface form of the LEGO (gate: known-check). *(K9, K6, K49 · same defect also in S0162L01B04, S0162L01B05, S0162L01B06, S0162L01U05, S0162L01U07)*
- **S0162L01B04** Can you tell me what do you think about that? | ¿Puedes decirme qué piensas de eso?  
  → **Can you tell me what you think about that? | ¿Puedes decirme qué piensas de eso?**  
  An embedded question takes statement order in English ('know what you think'); the Spanish is fine. Dropping 'do' is a known-side surface form of the LEGO (gate: known-check). *(K9, K6, K49 · knock-on of S0162L01B03)*
- **S0162L01B05** I don't know what do you think about that | No sé qué piensas de eso  
  → **I don't know what you think about that | No sé qué piensas de eso**  
  An embedded question takes statement order in English ('know what you think'); the Spanish is fine. Dropping 'do' is a known-side surface form of the LEGO (gate: known-check). *(K9, K6, K49 · knock-on of S0162L01B03)*
- **S0162L01B06** I'd like to know what do you think about that | Me gustaría saber qué piensas de eso  
  → **I'd like to know what you think about that | Me gustaría saber qué piensas de eso**  
  An embedded question takes statement order in English ('know what you think'); the Spanish is fine. Dropping 'do' is a known-side surface form of the LEGO (gate: known-check). *(K9, K6, K49 · knock-on of S0162L01B03)*
- **S0162L01U05** She wanted to know what do you think about that before doing anything | Ella quería saber qué piensas de eso antes de hacer nada  
  → **She wanted to know what you think about that before doing anything | Ella quería saber qué piensas de eso antes de hacer nada**  
  An embedded question takes statement order in English ('know what you think'); the Spanish is fine. Dropping 'do' is a known-side surface form of the LEGO (gate: known-check). *(K9, K6, K49 · knock-on of S0162L01B03)*
- **S0162L01U07** I think it's very important to know what do you think about that | Creo que es muy importante saber qué piensas de eso  
  → **I think it's very important to know what you think about that | Creo que es muy importante saber qué piensas de eso**  
  An embedded question takes statement order in English ('know what you think'); the Spanish is fine. Dropping 'do' is a known-side surface form of the LEGO (gate: known-check). *(K9, K6, K49 · knock-on of S0162L01B03)*
- **S0162L01U15** What do you think about that that's going to happen next month? | ¿Qué piensas de eso que va a pasar el mes que viene?  
  → **What do you think about that thing that's going to happen next month? | ¿Qué piensas de eso que va a pasar el mes que viene?**  
  'about that that's going to happen' is hard to parse; 'that thing' fixes the English and still matches 'eso que va a pasar'. *(K9)*

## Seed 163
- **S0163L02U10** What we were talking about was very interesting | Lo que estábamos hablando fue muy interesante  
  → **What we were talking about was very interesting | Eso de lo que estábamos hablando fue muy interesante**  
  'Lo que estábamos hablando' drops the 'de' that 'hablar de' needs; the course teaches 'de lo que estábamos hablando' (S0143), and 'eso' gives the clause its subject. *(K16)*

## Seed 168
- **S0168L03U08** I think that I will be able to help more when I understand better | Creo que podré ayudar más cuando entiendo mejor  
  → **I think that I will be able to help more tomorrow | Creo que podré ayudar más mañana**  
  'cuando entiendo' about the future needs the subjunctive 'entienda', which the course never teaches; reworded with taught words. *(K16, K14)*
- **S0168L04U01** I think I'll be able to come and help you later this afternoon | Creo que podré venir a ayudarte más tarde por la tarde  
  → **I think I'll be able to come and help you this afternoon | Creo que podré venir a ayudarte esta tarde**  
  'más tarde por la tarde' is repetitive and loses 'this'; 'esta tarde' says it plainly. (gate contains_lego=false only because 'ayudarte' is the bound form of the LEGO's 'ayudar', unchanged from before.) *(K16, L28 · override: LEGO containment unchanged by the fix: the row already carried the LEGO as an article/clitic/bound variant (la reunión, nos dijera, ayudarte), K49)*

## Seed 169
- **S0169L01U13** I don't think this is what she wants me to do | No estoy seguro de que esto es lo que quiere que haga  
  → **I don't know if this is what she wants me to do | No sé si esto es lo que quiere que haga**  
  'I don't think' ≠ 'no estoy seguro de que', and doubt needs the subjunctive 'sea' (untaught until 330); 'no sé si + indicative' is correct and taught. *(K16, K14)*
- **S0169L02U13** I hope this is what you want me to do because I've already started | Espero que esto es lo que quieres que haga porque ya empecé  
  → **I think this is what you want me to do and I've already started | Creo que esto es lo que quieres que haga y ya empecé**  
  'Espero que esto es' needs the subjunctive 'sea', untaught until seed 330; reworded with 'creo que'. *(K16, K14)*

## Seed 170
- **S0170L02U09** I'd like you to tell me what you need because I'm here | Me gustaría que me dijeras lo que necesitas porque estoy aquí  
  → **I'd like you to tell me what you need because I want to help you | Me gustaría que me dijeras lo que necesitas porque quiero ayudarte**  
  'because I'm here' is a non sequitur reason; 'because I want to help you' uses taught 'ayudarte'. *(K9, K16)*

## Seed 171
- **S0171L01B03** I help you | Te ayude  
  → **You want me to help you | Quieres que te ayude**  
  'I help you | Te ayude' is a bare subjunctive with indicative English and drops the LEGO's 'que'; now holds the whole LEGO. *(K16, P17)*
- **S0171L01U05** Do you want me to help you find out? | ¿Quieres que te ayude a descubrir?  
  → **Do you want me to help you find out what the answer is? | ¿Quieres que te ayude a descubrir cuál es la respuesta?**  
  Bare 'descubrir' with no object is odd; seed 18 teaches 'descubrir cuál es la respuesta'. *(K16)*
- **S0171L02B02** Help you look for it | Te ayude a buscarlo  
  → **I want to help you look for it | Quiero ayudarte a buscarlo**  
  'Help you look for it | Te ayude a buscarlo' is a bare subjunctive with no trigger and mismatched English. *(K16)*

## Seed 173
- **S0173L01U01** Thank you very much for helping me understand this today | Muchas gracias por ayudarme a entender esto hoy  
  → **Thank you very much for helping me understand this today | Muchas gracias por ayudarme a entender esto hoy**  
  'Muchas gracias' is 'thank you very much'; the English lacked 'very much'. *(K9)*
- **S0173L03U07** I want to be able to speak on my own as soon as possible | Quiero poder hablar solo lo antes posible  
  → **I want to be able to do it on my own as soon as possible | Quiero poder hacerlo solo lo antes posible**  
  'hablar solo' means 'talk to yourself'; 'hacerlo solo' is the seed's own use. *(K16)*
- **S0173L03U08** I think it is good to try things on my own | Creo que es bueno intentar las cosas solo  
  → **I think it is good to try to do things on my own | Creo que es bueno intentar hacer las cosas solo**  
  'intentar las cosas' is a calque; 'intentar hacer las cosas' is natural and taught. *(K16)*

## Seed 174
- **S0174L03U03** What are you saying because I do not understand? | ¿Qué estás diciendo porque no entiendo?  
  → **What are you saying? I do not understand | ¿Qué estás diciendo? No entiendo**  
  A 'because' clause hanging off a question is garbled in both languages; split into two sentences. *(K9, K16)*
- **S0174L03U10** That is exactly what she was saying to me | Eso es exactamente lo que ella estaba diciendo  
  → **That is exactly what she was saying to me | Eso es exactamente lo que ella me estaba diciendo**  
  English 'to me' had no 'me' in the Spanish (dropped object on one side). *(Kai 2026-10-30 dropped object)*

## Seed 181
- **S0181L01U03** Can you take my friend to the work tomorrow morning? | ¿Puedes llevar a mi amigo al trabajo mañana por la mañana?  
  → **Can you take my friend to work tomorrow morning? | ¿Puedes llevar a mi amigo al trabajo mañana por la mañana?**  
  'to the work' is not English; 'al trabajo' is right. *(K9 · same defect also in S0181L01U06, S0181L02U01, S0181L03U13)*
- **S0181L01U06** I think I should take my friend to the work because it is important | Creo que debería llevar a mi amiga al trabajo porque es importante  
  → **I think I should take my friend to work because it is important | Creo que debería llevar a mi amiga al trabajo porque es importante**  
  'to the work' is not English. *(K9 · knock-on of S0181L01U03)*
- **S0181L01U10** I need to take my friend somewhere but I do not know where | Necesito llevar a mi amigo allí pero no sé dónde  
  → **I need to take my friend but I do not know where to | Necesito llevar a mi amigo pero no sé adónde**  
  'somewhere' was rendered 'allí' (there), contradicting 'I don't know where'; 'algún sitio' is untaught at 181, so 'somewhere' goes and 'adónde' (taught 177) follows the motion verb. *(K16, K14)*
- **S0181L01U14** I am going to take my things to my friend before I leave | Voy a llevar mis cosas a mi amigo antes de ir  
  → **I am going to take my things to my friend before I leave | Voy a llevar mis cosas a mi amigo antes de irme**  
  'before I leave' is 'antes de irme' (taught), not 'antes de ir'. *(K16 · same defect also in S0182L01U01, S0182L01U08, S0182L04U07)*
- **S0181L02U01** I need to take my mother to the work tomorrow morning | Necesito llevar a mi madre al trabajo mañana por la mañana  
  → **I need to take my mother to work tomorrow morning | Necesito llevar a mi madre al trabajo mañana por la mañana**  
  'to the work' is not English. *(K9 · knock-on of S0181L01U03)*
- **S0181L03U13** I need to take my mother to the doctor before going to the work | Necesito llevar a mi madre al médico antes de ir al trabajo  
  → **I need to take my mother to the doctor before going to work | Necesito llevar a mi madre al médico antes de ir al trabajo**  
  'going to the work' is not English. *(K9 · knock-on of S0181L01U03)*

## Seed 182
- **S0182L01U01** I want to take my things to my friend before I go | Quiero llevar mis cosas a mi amigo antes de ir  
  → **I want to take my keys to my friend before I go | Quiero llevar mis llaves a mi amigo antes de irme**  
  'antes de ir' with no destination should be 'antes de irme'; the phrase also lacked its LEGO 'mis llaves' (P17). *(K16, P17 · knock-on of S0181L01U14)*
- **S0182L01U08** I need to take my things from the house before leaving | Necesito llevar mis cosas de la casa antes de ir  
  → **I need to take my keys before leaving | Necesito llevar mis llaves antes de irme**  
  'antes de ir' does not mean 'before leaving' and 'llevar mis cosas de la casa' is awkward; the phrase also lacked its LEGO 'mis llaves' (P17), now restored. *(K16, P17 · knock-on of S0181L01U14)*
- **S0182L01U09** I wanted to tell my ideas to my friends but it was difficult | Quería decir mis ideas a mis amigos pero era difícil  
  → **I wanted to find my keys but it was difficult | Quería encontrar mis llaves pero era difícil**  
  'decir mis ideas a mis amigos' is a calque, and the phrase lacked its LEGO 'mis llaves' (P17); reworded to hold the LEGO. *(K16, P17)*
- **S0182L01U12** I was trying to find my things but I did not know where they were | Estaba intentando encontrar mis cosas pero no sabía dónde  
  → **I was trying to find my keys but I did not know where | Estaba intentando encontrar mis llaves pero no sabía dónde**  
  'where they were' had no Spanish ('estaban' untaught), and the phrase lacked its LEGO 'mis llaves'; both fixed. *(K14, P17)*
- **S0182L03U08** I do not know if you have seen what she was saying before today | No sé si has visto lo que estaba diciendo antes hoy  
  → **I do not know if you have seen what she was saying before | No sé si has visto lo que estaba diciendo antes**  
  'antes hoy' is not Spanish and 'before today' is odd English; 'antes' alone carries it. *(K9, K16 · same defect also in S0183L02U03, S0233L04U05)*
- **S0182L03U14** Have you seen my friend today or did she go home already? | ¿Has visto a mi amiga hoy o ya fue a casa?  
  → **Have you seen my friend today or is she at home already? | ¿Has visto a mi amiga hoy o ya está en casa?**  
  'ya fue a casa' is not how Spanish says 'she's gone home already' ('se fue' untaught until 470); 'ya está en casa' is natural and taught. *(K16, K14 · same defect also in S0184L03U15, S0185L02U03)*
- **S0182L04U02** We need to find somewhere to meet before we start practicing together | Necesitamos encontrar en algún sitio para reunirnos antes de empezar a practicar juntos  
  → **We need to meet somewhere before we start practising together | Necesitamos reunirnos en algún sitio antes de empezar a practicar juntos**  
  'encontrar en algún sitio para reunirnos' gives 'encontrar' no object; dropping 'en' would break the LEGO, so the verb changes. *(K16, P17 · same defect also in S0182L04U04)*
- **S0182L04U04** She said she wanted to find somewhere to read her book this afternoon | Dijo que quería encontrar en algún sitio para leer su libro esta tarde  
  → **She said she wanted to read her book somewhere this afternoon | Dijo que quería leer su libro en algún sitio esta tarde**  
  Same as U02: 'encontrar en algún sitio para leer' has no object. *(K16, P17 · knock-on of S0182L04U02)*
- **S0182L04U07** I need to put my keys somewhere safe before I go | Necesito poner mis llaves en algún sitio seguro antes de ir  
  → **I need to put my keys somewhere safe before I go | Necesito poner mis llaves en algún sitio seguro antes de irme**  
  'before I go' with no destination is 'antes de irme'. *(K16 · knock-on of S0181L01U14)*

## Seed 183
- **S0183L02U02** Have you seen them today because I haven't seen them anywhere this morning? | ¿Las has visto hoy porque no las he visto en algún sitio esta mañana?  
  → **Have you seen them today? I haven't seen them this morning | ¿Las has visto hoy? No las he visto esta mañana**  
  'no ... en algún sitio' needs 'ningún' (untaught until 376), and the 'because' link is illogical; dropped and split. *(K16, K14 · same defect also in S0183L02U05, S0184L03U08, S0184L03U15, S0185L01U01, S0185L01U07)*
- **S0183L02U03** I haven't seen them but my friend said she saw them at work earlier today | No las he visto pero mi amiga dijo que las vio en el trabajo antes hoy  
  → **I haven't seen them but my friend said she saw them at work earlier | No las he visto pero mi amiga dijo que las vio antes en el trabajo**  
  'antes hoy' is not Spanish; 'antes' alone is 'earlier'. *(K16 · knock-on of S0182L03U08)*
- **S0183L02U05** Have you seen them anywhere today because I haven't seen them since this morning? | ¿Las has visto en algún sitio hoy porque no las he visto desde esta mañana?  
  → **Have you seen them anywhere today? I haven't seen them since this morning | ¿Las has visto en algún sitio hoy? No las he visto desde esta mañana**  
  The 'because' joining a question to a statement reads as garbled in both languages; split into two sentences. *(K9, K16 · knock-on of S0183L02U02)*

## Seed 184
- **S0184L02U06** I saw my friend at work this morning and she said she wanted to meet later today | Vi a mi amiga en el trabajo esta mañana y dijo que quería reunirse después hoy  
  → **I saw my friend at work this morning and she said she wanted to meet later | Vi a mi amiga en el trabajo esta mañana y dijo que quería reunirse más tarde**  
  'después hoy' is not Spanish; 'más tarde' (taught 168) is 'later'. *(K16 · same defect also in S0110L03U13)*
- **S0184L02U12** I saw that you are doing very well with your Spanish and I think you should be very proud | Vi que lo estás haciendo muy bien con tu español y creo que deberías estar muy contento  
  → **I saw that you are doing very well with your Spanish and I think you should be very happy | Vi que lo estás haciendo muy bien con tu español y creo que deberías estar muy contento**  
  'contento' is 'happy', not 'proud'; 'orgulloso' is untaught, so the English changes. *(K14, K3)*
- **S0184L02U14** I saw what she said to him yesterday and I think she was trying to help him speak Spanish better | Vi lo que dijo a él ayer y creo que estaba intentando ayudar a él a hablar español mejor  
  → **I saw what she said to him yesterday and I think she was trying to help him speak Spanish better | Vi lo que le dijo ayer y creo que le estaba intentando ayudar a hablar español mejor**  
  'dijo a él' and 'ayudar a él' without the clitic are calques; proclitic 'le' (taught 177) before a finite verb is fine, whereas enclitic 'ayudarle' is untaught. *(K16, P27)*
- **S0184L03U06** I saw your friend in the office this morning and she told me she was looking for you | Vi a tu amigo en la oficina esta mañana y me dijo que te estaba buscando  
  → **I saw your friend in the office this morning and she told me she was looking for you | Vi a tu amiga en la oficina esta mañana y me dijo que te estaba buscando**  
  English 'she' but Spanish masculine 'tu amigo'. *(K27)*
- **S0184L03U08** I'm afraid I have not seen your bag anywhere in the office since this morning | Me temo que no he visto tu bolso en algún sitio en la oficina desde esta mañana  
  → **I'm afraid I have not seen your bag in the office since this morning | Me temo que no he visto tu bolso en la oficina desde esta mañana**  
  'no he visto ... en algún sitio' needs 'ningún' (untaught); 'anywhere' dropped on both sides. *(K16, K14 · knock-on of S0183L02U02)*
- **S0184L03U15** I have not seen her anywhere in the office since this morning and I'm afraid she may have gone home already | No la he visto en algún sitio en la oficina desde esta mañana y me temo que ya fue a casa  
  → **I have not seen her in the office since this morning and I'm afraid she is at home already | No la he visto en la oficina desde esta mañana y me temo que ya está en casa**  
  'no ... en algún sitio' needs untaught 'ningún', and 'ya fue a casa' is unnatural; both replaced with taught forms. *(K16, K14 · knock-on of S0183L02U02)*

## Seed 185
- **S0185L01U01** I think you left your book somewhere in the office but I'm afraid I haven't seen it anywhere today | Creo que dejaste tu libro en algún sitio en la oficina pero me temo que no lo he visto en algún sitio hoy  
  → **I think you left your book somewhere in the office but I'm afraid I haven't seen it today | Creo que dejaste tu libro en algún sitio en la oficina pero me temo que no lo he visto hoy**  
  The negated 'no lo he visto en algún sitio' needs untaught 'ningún'; the second 'anywhere' dropped. *(K16, K14 · knock-on of S0183L02U02)*
- **S0185L01U07** Where do you think you left your letter because I cannot find it anywhere? | ¿Dónde crees que dejaste tu carta porque no la puedo encontrar en algún sitio?  
  → **Where do you think you left your letter? I cannot find it | ¿Dónde crees que dejaste tu carta? No la puedo encontrar**  
  Negated 'no la puedo encontrar en algún sitio' needs untaught 'ningún'; split into two sentences without 'anywhere'. *(K16, K14 · knock-on of S0183L02U02)*
- **S0185L02U03** I have not seen my friend at work today and I'm afraid she may have gone home already | No he visto a mi amiga en el trabajo hoy y me temo que ya fue a casa  
  → **I have not seen my friend at work today and I'm afraid she is at home already | No he visto a mi amiga en el trabajo hoy y me temo que ya está en casa**  
  'ya fue a casa' is unnatural and states a fact where the English hedged; 'ya está en casa' is natural and taught. *(K16 · knock-on of S0182L03U14)*

## Seed 187
- **S0187L02U05** So far I do not think we need to change anything | Hasta ahora no creo que necesitamos cambiar nada  
  → **So far I think we do not need to change anything | Hasta ahora creo que no necesitamos cambiar nada**  
  'no creo que' needs the subjunctive 'necesitemos' (never taught); 'creo que no + indicative' is correct. *(K16, K14 · same defect also in S0188L02U02)*
- **S0187L02U09** Everything we tried so far was very useful to improve my Spanish a lot | Todo lo que intentamos hasta ahora fue muy útil para mejorar mi español mucho  
  → **Everything we tried so far was very useful to improve my Spanish a lot | Todo lo que intentamos hasta ahora fue muy útil para mejorar mucho mi español**  
  'mejorar mi español mucho' is awkward word order. *(K16)*
- **S0187L02U10** So far no one has said anything about changing the way you work together | Hasta ahora nadie dijo nada sobre cambiar la manera de trabajar juntos  
  → **So far no one said anything about changing the way we work together | Hasta ahora nadie dijo nada sobre cambiar la manera de trabajar juntos**  
  The Spanish is impersonal 'la manera de trabajar juntos' and preterite 'dijo'; the English now says 'we' and 'said' to match ('ha dicho' is untaught). *(K26, K14)*

## Seed 188
- **S0188L02U02** I am very happy so far so I do not think I need to change anything right now | Estoy muy contento hasta ahora así que no creo que necesito cambiar nada ahora mismo  
  → **I am very happy so far so I think I do not need to change anything right now | Estoy muy contento hasta ahora así que creo que no necesito cambiar nada ahora mismo**  
  'no creo que necesito' needs the subjunctive 'necesite' (untaught until 326); 'creo que no + indicative' is correct. *(K16, K14 · knock-on of S0187L02U05)*
- **S0188L02U05** So I am going to try to speak as much as I can when I am with you today | Así que voy a intentar hablar todo lo que pueda cuando estoy contigo hoy  
  → **So I am going to try to speak as much as I can with you today | Así que voy a intentar hablar todo lo que pueda contigo hoy**  
  'cuando estoy contigo hoy' refers to the future and needs untaught 'esté'; the 'when' clause goes. *(K16, K14)*
- **S0188L02U08** So I think the best idea is to keep doing what we are already doing so well | Así que creo que la mejor idea es seguir haciendo lo que ya estamos haciendo bien  
  → **So I think the best idea is to keep doing what we are already doing well | Así que creo que la mejor idea es seguir haciendo lo que ya estamos haciendo bien**  
  English 'so well' had no Spanish counterpart. *(K9)*
- **S0188L02U10** So what do you think I should do about the problem we were talking about? | ¿Así que qué crees que debería hacer sobre el problema de lo que estábamos hablando?  
  → **So what do you think I should do about the problem? | ¿Así que qué crees que debería hacer con el problema?**  
  'el problema de lo que estábamos hablando' is garbled ('del que' untaught: 'del' not yet met) and 'hacer sobre' is a calque. *(K16, K14)*
- **S0188L02U11** I want to improve a lot so I am going to try to speak as much as possible | Quiero mejorar mucho así que voy a intentar hablar lo más a menudo posible  
  → **I want to improve a lot so I am going to try to speak as often as possible | Quiero mejorar mucho así que voy a intentar hablar lo más a menudo posible**  
  'lo más a menudo posible' is 'as often as possible'; 'as much as possible' is taught as 'lo más posible' (one English to two Spanish). *(K3, ZUT · knock-on of S0157L02U14)*

## Seed 189
- **S0189L01U07** I am not very sure that is a good idea when we still have so much to do today | No estoy muy seguro de que eso es una buena idea cuando todavía tenemos que hacer mucho hoy  
  → **I don't know if that is a good idea when we still have so much to do today | No sé si eso es una buena idea cuando todavía tenemos que hacer mucho hoy**  
  'No estoy seguro de que' needs the subjunctive 'sea' (untaught until 330); 'no sé si + indicative' is correct. *(K16, K14)*

## Seed 190
- **S0190L01U13** What I do so far is try to listen very carefully before I say anything | Lo que hago hasta ahora es intentar escuchar con mucho cuidado antes de decir algo  
  → **What I do is try to listen very carefully before I say anything | Lo que hago es intentar escuchar con mucho cuidado antes de decir algo**  
  'What I do so far' is awkward in both languages; 'hasta ahora' dropped on both sides. *(K9, K16)*
- **S0190L02U02** I'd like to ask you some questions before I have to leave | Me gustaría hacer unas preguntas antes de que tenga que irme  
  → **I'd like to ask some questions before I have to leave | Me gustaría hacer unas preguntas antes de que tenga que irme**  
  English 'ask you' had no 'te' in the Spanish; 'hacerte' is untaught (enclitic -te on hacer), so 'you' leaves the English. *(K14, Kai 2026-10-30 dropped object)*
- **S0190L02U03** I wanted to ask you some questions about learning Spanish | Quería preguntarte unas preguntas sobre aprender español  
  → **I wanted to ask some questions about learning Spanish | Quería hacer unas preguntas sobre aprender español**  
  'preguntarte unas preguntas' repeats verb and noun; the seed uses 'hacer unas preguntas' ('hacerte' untaught). *(K16, K14)*

## Seed 192
- **S0192L01U12** Are you busy on Saturday night or do you want to meet up? | ¿Estás ocupado el sábado por la noche o quieres reunirnos?  
  → **Are you busy on Saturday night or do you want to meet up with me? | ¿Estás ocupado el sábado por la noche o quieres reunirte conmigo?**  
  'quieres reunirnos' puts a 'we' reflexive on a 'you' verb; 'quieres reunirte' is seed 154's own form. *(K16, K26)*

## Seed 195
- **S0195L02U09** I want to talk to you about the money before you leave | Quiero hablar contigo de eso, el dinero, antes de que te vayas  
  → **I want to talk to you about the money before you leave | Quiero hablar contigo sobre el dinero antes de que te vayas**  
  'de eso, el dinero' is a dislocation the English lacks; 'del' is untaught so 'sobre el dinero'. *(K16, K14)*
- **S0195L03U01** Do you want me to help you look for what I left on the table? | ¿Quieres que te ayude a buscarlo, lo que dejé en la mesa?  
  → **Do you want me to help you find what I left on the table? | ¿Quieres que te ayude a encontrar lo que dejé en la mesa?**  
  'buscarlo, lo que dejé' doubles the object; bare 'buscar' is untaught, so 'encontrar'. *(K16, K14)*
- **S0195L03U02** DELETE — was: I think you left it at work, what I left on the table | Creo que lo dejaste en el trabajo, lo que dejé en la mesa  
  'I think you left it at work, what I left on the table' contradicts itself in both languages and no rewording within taught material is natural. Basket keeps 6 BUILD and 7 USE. *(K9, K16)*
- **S0195L03U04** I wanted to ask you about the thing I left on the table yesterday | Quería preguntarte algo ayer sobre lo que dejé en la mesa  
  → **I wanted to ask you about what I left on the table yesterday | Quería preguntarte sobre lo que dejé en la mesa ayer**  
  'ayer' attached to the asking, not the leaving, and 'algo ... sobre lo que' was clumsy. *(K16)*
- **S0195L03U06** Yes I saw what I left on the table at the office a while ago | Sí lo vi en la oficina hace un rato, lo que dejé en la mesa  
  → **Yes I saw what I left on the table a while ago | Sí, vi lo que dejé en la mesa hace un rato**  
  'lo vi ... , lo que dejé' doubles the object and the office/table places clashed. *(K16)*

## Seed 196
- **S0196L01U03** Have you heard that about your friend? | ¿Has oído de eso sobre tu amigo?  
  → **Have you heard that about your friend? | ¿Has oído eso sobre tu amigo?**  
  'de eso sobre tu amigo' stacks two prepositional phrases. *(K16)*
- **S0196L02U08** What was the latest thing you heard from your friend? | ¿Cuál fue la última cosa que has oído de tu amigo?  
  → **What is the latest thing you have heard from your friend? | ¿Cuál es la última cosa que has oído de tu amigo?**  
  Preterite 'fue' clashes with perfect 'has oído'; 'oíste' is untaught until 366, so the main verb moves to the present. *(K16, K14)*

## Seed 197
- **S0197L02U03** I think my son is doing well at work | Creo que a mi hijo le va muy bien en el trabajo  
  → **I think my son is doing very well at work | Creo que a mi hijo le va muy bien en el trabajo**  
  Spanish 'muy bien' had no 'very' in the English. *(K9)*
- **S0197L03U09** He works here and I wanted to ask you about that yesterday | Él trabaja aquí y quería preguntarte algo sobre eso ayer  
  → **He works here and I wanted to ask you something about that yesterday | Él trabaja aquí y quería preguntarte algo sobre eso ayer**  
  Spanish 'algo' (something) had no counterpart in the English. *(Kai 2026-10-30 dropped object)*
- **S0197L03U10** My friend works in the language and he says it is very interesting | Mi amigo trabaja en el idioma y dice que es muy interesante  
  → **My friend works in Spanish and he says it is very interesting | Mi amigo trabaja en español y dice que es muy interesante**  
  'works in the language' is vague and unnatural in both languages. *(K9, K16)*

## Seed 200
- **S0200L02U08** They want to know what you need to make this work | Quieren saber lo que necesitas para que va a funcionar  
  → **They want to know what you need to do this | Quieren saber lo que necesitas para hacer esto**  
  'para que va a funcionar' is ungrammatical and 'funcione' is untaught. *(K16, K14)*
- **S0200L04B01** We finish everything | Terminemos todo  
  → **That we finish everything | Que terminemos todo**  
  Bare 'Terminemos todo' means 'let's finish everything', not 'we finish everything'; the 'que' frame (as in B03/B05) gives the subjunctive its trigger. *(K16, K40)*
- **S0200L04U10** DELETE — was: We need all of us to finish this as soon as possible | Necesitamos que terminemos todo lo antes posible  
  'Necesitamos que terminemos' uses que+subjunctive with the same subject and the English is garbled; without the LEGO 'terminemos' it cannot be reworded as 'necesitamos terminar'. Basket keeps 3 BUILD and 5 USE. *(K16)*

## Seed 201
- **S0201L02B01** What was going to happen? | ¿Lo que iba a pasar?  
  → **what was going to happen | lo que iba a pasar**  
  '¿Lo que iba a pasar?' is not a question; the build now mirrors the LEGO as a fragment. *(K16)*

## Seed 202
- **S0202L01U09** no nobody told me | no, nadie me dijo  
  → **no, nobody told me | no, nadie me dijo**  
  Missing comma made 'no nobody' read as a run-on. *(K9)*

## Seed 203
- **S0203L02B03** If I asked you something | Si te pidiera algo  
  → **If I asked you for something | Si te pidiera algo**  
  'pedir algo' is 'ask for something'; 'ask you something' means a question (preguntar). *(K16, K3 · same defect also in S0203L02U04, S0203L02U10)*
- **S0203L02U04** I think I know what you would do if I asked you something like that | Creo que sé qué harías si te pidiera algo así  
  → **I think I know what you would do if I asked you for something like that | Creo que sé qué harías si te pidiera algo así**  
  'pidiera algo' is 'asked you for something'. *(K16 · knock-on of S0203L02B03)*
- **S0203L02U10** If I asked you something, what would you do? | Si te pidiera algo, ¿qué harías?  
  → **If I asked you for something, what would you do? | Si te pidiera algo, ¿qué harías?**  
  'pidiera algo' is 'asked you for something'. *(K16 · knock-on of S0203L02B03)*
- **S0203L03B05** If I asked you that you would help me | Si te pidiera que me ayudaras  
  → **If I asked you to help me | Si te pidiera que me ayudaras**  
  'If I asked you that you would help me' is ungrammatical; the basket's USE rows already render 'te pidiera que me ayudaras' as 'asked you to help me' (known-side surface form). *(K9, K6)*

## Seed 204
- **S0204L02U05** We talked about the arrangements and I think everything is going well | Hablamos sobre los preparativos y creo que todo está bien  
  → **We talked about the arrangements and I think everything is fine | Hablamos sobre los preparativos y creo que todo está bien**  
  'todo está bien' is 'everything is fine'; 'going well' is 'va bien'. *(K3 · same defect also in S0204L02U11)*
- **S0204L02U11** We talked about the arrangements today and I think everything is going well | Hablamos sobre los preparativos hoy y creo que todo está bien  
  → **We talked about the arrangements today and I think everything is fine | Hablamos sobre los preparativos hoy y creo que todo está bien**  
  Same as U05. *(K3 · knock-on of S0204L02U05)*
- **S0204L02U14** We talked about the arrangements and we agreed on the best way to do it | Hablamos sobre los preparativos y estamos de acuerdo en la mejor manera de hacerlo  
  → **We talked about the arrangements and we agree on the best way to do it | Hablamos sobre los preparativos y estamos de acuerdo en la mejor manera de hacerlo**  
  Spanish 'estamos de acuerdo' is present; 'acordamos' is untaught, so the English moves to 'we agree'. *(K14)*

## Seed 206
- **S0206L01U01** I enjoy doing something interesting with them because it is good for us | Disfruto hacer algo interesante con ellos porque es bueno para nosotros  
  → **I enjoy doing something interesting with them because it is good for us | Disfruto haciendo algo interesante con ellos porque es bueno para nosotros**  
  'disfruto hacer' is non-standard; the basket's pattern is the gerund ('disfruto haciendo'). *(K16 · same defect also in S0206L01U05)*
- **S0206L01U02** I enjoy doing this and I am very happy that we are doing this together | Disfruto haciendo esto y estoy muy contento de que estamos haciendo esto juntos  
  → **I enjoy doing this and I am very happy because we are doing this together | Disfruto haciendo esto y estoy muy contento porque estamos haciendo esto juntos**  
  'contento de que' needs the subjunctive 'estemos' (untaught as 'be'); 'porque + indicative' is correct. *(K16, K14)*
- **S0206L01U05** I enjoy doing something new when I am trying to improve my Spanish | Disfruto hacer algo nuevo cuando estoy intentando mejorar mi español  
  → **I enjoy doing something new when I am trying to improve my Spanish | Disfruto haciendo algo nuevo cuando estoy intentando mejorar mi español**  
  Same as U01: gerund after 'disfruto'. *(K16 · knock-on of S0206L01U01)*
- **S0206L02U02** This is a good opportunity to practise speaking Spanish before we start | Esta es una buena oportunidad de practicar hablar español antes de empezar  
  → **This is a good opportunity to practise speaking Spanish before we start | Esta es una buena oportunidad de practicar hablando español antes de empezar**  
  'practicar hablar' stacks infinitives; the course pattern is 'practicar hablando'. *(K16 · same defect also in S0212L01U05, S0502L03U02)*
- **S0206L02U12** She told me this is a good opportunity to practise before tomorrow morning | Ella me dijo que esta es una buena oportunidad de practicar antes de mañana  
  → **She told me this is a good opportunity to practise before tomorrow | Ella me dijo que esta es una buena oportunidad de practicar antes de mañana**  
  'antes de mañana' is 'before tomorrow', not 'before tomorrow morning'. *(K9)*

## Seed 207
- **S0207L01U07** I did not know what you needed so I was trying to do my best | No sabía lo que necesitabas así que estaba intentando hacer lo mejor  
  → **I did not know what you needed so I was trying to do my best | No sabía lo que necesitabas así que estaba intentando hacer lo mejor posible**  
  Bare 'hacer lo mejor' is incomplete; the course renders 'do my best' as 'hacer lo mejor posible' (S0168L04U11, S0244L02U06). *(K16)*

## Seed 208
- **S0208L01U15** I did not want to ask how to say it so I was trying to do it alone | No quería preguntarte cómo decirlo así que estaba intentando hacerlo solo  
  → **I did not want to ask you how to say it so I was trying to do it alone | No quería preguntarte cómo decirlo así que estaba intentando hacerlo solo**  
  Spanish 'preguntarte' had no 'you' in the English. *(Kai 2026-10-30 dropped object)*

## Seed 209
- **S0209L01U03** They want to start meeting up | Quieren empezar reuniéndose  
  → **They want to keep meeting up | Quieren seguir reuniéndose**  
  'empezar reuniéndose' means 'begin by meeting', and 'empezar a reunirse' would break the LEGO 'reuniéndose'; 'seguir + gerund' is taught. *(K16, K50)*

## Seed 211
- **S0211L02U06** They told us that she was very happy to finish everything together with us | Nos dijeron que estaba muy contento de terminar todo con nosotros  
  → **They told us that he was very happy to finish everything with us | Nos dijeron que estaba muy contento de terminar todo con nosotros**  
  English 'she' clashed with masculine 'contento' ('contenta' untaught), and 'together' had no Spanish. *(K27, K14)*
- **S0211L03U13** They did not want to say anything about the arrangements even though we needed to know | No querían decir nada sobre los preparativos aunque necesitamos saber  
  → **They did not want to say anything about the arrangements even though we need to know | No querían decir nada sobre los preparativos aunque necesitamos saber**  
  English past 'needed' clashed with Spanish present 'necesitamos' ('necesitábamos' untaught until 521); English moves to present. *(K14)*

## Seed 212
- **S0212L01U05** They wanted to practise speaking as soon as possible | Querían practicar hablar lo antes posible  
  → **They wanted to practise speaking as soon as possible | Querían practicar hablando lo antes posible**  
  'practicar hablar' stacks infinitives; course pattern is 'practicar hablando'. *(K16 · knock-on of S0206L02U02)*
- **S0212L01U08** They didn't want to wait any longer than was important | No querían esperar más de lo que era importante  
  → **They didn't want to wait any longer | No querían esperar más**  
  'any longer than was important' is garbled in both languages and 'necesario' is untaught. *(K9, K16)*
- **S0212L02U15** He could ask for something different if he wanted to | Podría pedir algo diferente si quería  
  → **He could ask for something different | Podría pedir algo diferente**  
  Counterfactual 'si quería' needs 'si quisiera' (untaught until 317); the if-clause goes. *(K16, K14)*

## Seed 213
- **S0213L01U04** I haven't been able to explain this well yet | Todavía no puedo explicar esto bien  
  → **I can't explain this well yet | Todavía no puedo explicar esto bien**  
  'Todavía no puedo' is 'I can't yet', not 'I haven't been able to'. *(K9)*
- **S0213L01U09** He told me not to explain anything about it | Me dijo que no debería explicar nada sobre eso  
  → **He told me that I shouldn't explain anything about it | Me dijo que no debería explicar nada sobre eso**  
  'me dijo que no debería' is 'told me I shouldn't', not a command. *(K9)*
- **S0213L03U05** It's not clear what is happening here for anyone | No parece claro para nadie lo que está pasando aquí  
  → **It doesn't seem clear to anyone what is happening here | No parece claro para nadie lo que está pasando aquí**  
  Spanish 'No parece claro' is 'doesn't seem clear'. *(K9)*
- **S0213L04U14** They're trying to help us even though it's very difficult | Están intentando ayudar aunque es muy difícil  
  → **They're trying to help us even though it's very difficult | Nos están intentando ayudar aunque es muy difícil**  
  English 'help us' had no 'nos'; proclitic 'nos' is taught, enclitic 'ayudarnos' is not yet. *(Kai 2026-10-30 dropped object, P27)*
- **S0213L05U12** They asked for help to achieve what they wanted to do | Querían pedir ayuda para conseguir lo que querían hacer  
  → **They wanted to ask for help to achieve what they wanted to do | Querían pedir ayuda para conseguir lo que querían hacer**  
  Spanish 'Querían pedir' is 'they wanted to ask', not 'they asked'. *(K9)*

## Seed 214
- **S0214L02U08** I started to feel better at the weekend than last night | Empecé a sentirme mejor el fin de semana que anoche  
  → **I started to feel better at the weekend | Empecé a sentirme mejor el fin de semana**  
  Comparing 'the weekend' with 'last night' is garbled in both languages. *(K9, K16)*

## Seed 216
- **S0216L03U05** I can wait for you for some minutes before I have to leave | Puedo esperarte unos minutos antes de que tenga que irme  
  → **I can wait for you for a few minutes before I have to leave | Puedo esperarte unos minutos antes de que tenga que irme**  
  'for some minutes' is stiff English; 'a few minutes' is what people say, and unos already pairs with 'a few' in this basket (U16). *(K9, K3)*
- **S0216L04U07** I saw some friends last night and we talked for a very long time | Vi a unos amigos anoche y hablamos mucho tiempo  
  → **I saw some friends last night and we talked for a long time | Vi a unos amigos anoche y hablamos mucho tiempo**  
  The English says 'a very long time' but the Spanish has no 'very'; drop 'very' so both say 'mucho tiempo'. *(K9)*
- **S0216L04U08** I was with my friends at the weekend and it was very good | Estaba con mis amigos el fin de semana y fue muy bueno  
  → **I saw my friends at the weekend and it was very good | Vi a mis amigos el fin de semana y fue muy bueno**  
  'Estaba con mis amigos el fin de semana' needs the preterite 'estuve', which is not taught until seed 386; 'vi a mis amigos' says the same thing with taught words. *(K16, P1)*

## Seed 217
- **S0217L03U20** I had a very quick glass in the morning | tomé un vaso muy rápido por la mañana  
  → **I had a glass very quickly in the morning | tomé un vaso muy rápido por la mañana**  
  'a very quick glass' is odd English; 'muy rápido' here reads as the adverb, so the English should say 'very quickly'. *(K9)*
- **S0217L05U13** He said he wants two things from what you have | Él dijo que quiere dos cosas de lo que tienes  
  → **He said he wants two things that you have | Él dijo que quiere dos cosas que tienes**  
  'two things from what you have / dos cosas de lo que tienes' is stilted on both sides; 'two things that you have' is plain and uses taught words. *(K9, K16)*
- **S0217L06U13** I am happy about that and I want to tell you about it | Estoy contento de eso y quiero hablar contigo de eso  
  → **I am happy about that and I want to talk to you about it | Estoy contento de eso y quiero hablar contigo de eso**  
  The Spanish says 'hablar contigo de eso' (talk with you about it), not 'tell you about it'; change the English to match. *(K9)*

## Seed 218
- **S0218L04U12** What would you like to do on Sunday afternoon? | ¿Qué quieres hacer el domingo por la tarde?  
  → **What do you want to do on Sunday afternoon? | ¿Qué quieres hacer el domingo por la tarde?**  
  'Would you like' should be 'te gustaría', which is not taught until seed 271; the Spanish 'quieres' is 'do you want', as in B06/U02/U04. *(K3, K14)*

## Seed 220
- **S0220L02U04** I know I should practise but I watched a bit of television instead | Sé que debería practicar pero vi un poco de televisión en vez  
  → **I know I should practise but I watched a bit of television instead | Sé que debería practicar pero vi un poco de televisión en vez de eso**  
  A bare 'en vez' at the end of a sentence is not Spanish; 'instead' on its own is 'en vez de eso', all taught words. *(K16)*

## Seed 225
- **S0225L02U07** Do you know what the answer is because I am trying to find out? | ¿Sabes cuál es la respuesta porque estoy intentando descubrir?  
  → **Do you know what the answer is because I am trying to find out? | ¿Sabes cuál es la respuesta porque lo estoy intentando descubrir?**  
  'descubrir' needs an object in Spanish; a proclitic 'lo' (taught, as in 'lo estoy haciendo bien') supplies it, while English 'find out' can stand alone. *(K16, P27)*
- **S0225L02U14** I will ask if they will be able to help next year because I need the answer | Le preguntaré si podrá ayudar el año que viene porque necesito la respuesta  
  → **I will ask him if he will be able to help next year because I need the answer | Le preguntaré si podrá ayudar el año que viene porque necesito la respuesta**  
  English 'they' is plural but 'Le ... podrá' is singular; make the English 'him/he', as S0225L03U03 already does. *(K26)*
- **S0225L03U06** DELETE — was: I would have done it differently if I could have done it well this time | Lo habría hecho de manera diferente si pudiera hacerlo bien esta vez  
  'I would have done it differently if I could have done it well' makes no sense in either language and has no small fix; the basket keeps 10 use and 4 build rows. *(P14, K9)*
- **S0225L03U10** DELETE — was: What would you do if I asked you to help me if I could do something different? | ¿Qué harías si te pidiera que me ayudaras si pudiera hacer algo diferente?  
  Two stacked 'if' clauses make the sentence meaningless; removing one drops the LEGO 'si pudiera', so it goes. *(K9, P17)*
- **S0225L03U11** DELETE — was: You will help me before I have to leave if I could give you more time | Vas a ayudarme antes de que tenga que irme si pudiera darte más tiempo  
  'You will help me ... if I could give you more time' mixes a plain future with a hypothetical in both languages; no fix within the LEGO reads naturally. *(K9, K16)*
- **S0225L03U12** I am not sure if I can remember the whole phrase if I could it would be better | No estoy seguro de si puedo recordar toda la frase si pudiera sería mejor  
  → **I am not sure if I can remember the whole phrase but if I could it would be better | No estoy seguro de si puedo recordar toda la frase pero si pudiera sería mejor**  
  Two clauses run together with no link; adding 'but / pero' makes both sentences grammatical. *(K9, K16)*
- **S0225L03U13** DELETE — was: If I could keep doing this I would like to keep doing this for a while | Si pudiera seguir haciendo esto me gustaría seguir haciendo esto por un rato  
  'If I could keep doing this I would like to keep doing this' is circular in both languages, and U14 already carries the sensible version. *(K9)*

## Seed 229
- **S0229L01B05** That woman was trying to explain what she wanted | Esa mujer era la que estaba intentando explicar lo que quería  
  → **That woman was the one who was trying to explain what she wanted | Esa mujer era la que estaba intentando explicar lo que quería**  
  The Spanish is a cleft ('era la que...'), so the English needs 'the one who', as U04 and S0228L01B05 have. *(K9)*
- **S0229L01U06** That woman is one of the people I do not know yet but she seems kind | Esa mujer es de las personas que no conozco todavía pero parece amable  
  → **That woman is one of the people I do not know yet but she seems kind | Esa mujer es una de las personas que no conozco todavía pero parece amable**  
  English says 'one of the people'; the Spanish leaves out 'una', which the learner will say. Add it. *(K16)*

## Seed 230
- **S0230L04U04** That man who was talking to you before seems to know what he was doing | Ese hombre que estaba hablando contigo antes parece saber lo que estaba haciendo  
  → **That man who was talking to you before seems to know what he is doing | Ese hombre que estaba hablando contigo antes parece saber lo que está haciendo**  
  'seems to know what he was doing' is an odd tense mix; the idiom is 'knows what he is doing', in both languages. *(K9)*
- **S0230L04U14** Those are people I do not know but I think they want to learn | Son personas que no conozco pero creo que son personas que quieren aprender  
  → **Those are people I do not know but I think they want to learn | Son personas que no conozco pero creo que quieren aprender**  
  The Spanish repeats 'son personas que', which the English does not have; drop it. *(K16)*

## Seed 231
- **S0231L02U03** That elderly man works in the same office as my friend and is very helpful | Ese hombre mayor trabaja en el mismo sitio que mi amigo y es muy útil  
  → **That elderly man works in the same office as my friend and is very helpful | Ese hombre mayor trabaja en la misma oficina que mi amigo y es muy útil**  
  English says 'office' but the Spanish says 'sitio' (place); 'oficina' is taught and used in this basket. *(K9 · override: LEGO containment unchanged by the fix: the row already carried the LEGO as an article/clitic/bound variant (la reunión, nos dijera, ayudarte), K49)*
- **S0231L02U15** That elderly man was working in the same office as my friend a while ago | Ese hombre mayor trabajaba en la misma oficina que mi amigo hace un rato  
  → **That elderly man was working in the same office as my friend a while ago | Ese hombre mayor estaba trabajando en la misma oficina que mi amigo hace un rato**  
  'trabajaba ... hace un rato' reads as 'used to work' against 'a short while ago'; 'estaba trabajando' matches 'was working'. *(K16)*

## Seed 232
- **S0232L01U15** I was talking with a woman who knew someone here | Estaba hablando con una mujer que conocía a alguien de aquí  
  → **I was talking with a woman who knew someone here | Estaba hablando con una mujer que conocía a alguien aquí**  
  'alguien de aquí' is 'someone from here'; the English and the course ('alguien aquí', S0233L02B04) mean 'someone here'. *(K3)*

## Seed 233
- **S0233L02U11** She knows the best way to explain this and it is easy to understand | Conoce la mejor manera de explicar esto y es muy fácil de entender  
  → **She knows the best way to explain this and it is easy to understand | Conoce la mejor manera de explicar esto y es fácil de entender**  
  The Spanish adds 'muy' (very), which the English does not have. *(K9)*
- **S0233L04U05** I think your sister knows the woman we were talking about before today | Creo que tu hermana conoce a la mujer de la que estábamos hablando antes hoy  
  → **I think your sister knows the woman we were talking about before | Creo que tu hermana conoce a la mujer de la que estábamos hablando antes**  
  'antes hoy' is not Spanish and 'before today' is odd English; plain 'before / antes' is what both mean. *(K16, K9)*

## Seed 234
- **S0234L01U04** I met someone at the group who said they wanted to ask for help | Conocí a alguien en el grupo que dijo que quería pedir ayuda  
  → **I met someone in the group who said they wanted to ask for help | Conocí a alguien en el grupo que dijo que quería pedir ayuda**  
  'at the group' is not natural English; 'in the group' matches 'en el grupo'. *(K9)*
- **S0234L01U06** When I met your sister she told me she wanted to talk with you soon | Cuando conocí a tu hermana me dijo que esperaba hablar contigo pronto  
  → **When I met your sister she told me she wanted to talk with you soon | Cuando conocí a tu hermana me dijo que quería hablar contigo pronto**  
  'esperaba hablar' means 'hoped to talk'; the English 'wanted' is 'quería', as everywhere else in this basket. *(K3)*

## Seed 237
- **S0237L01B02** DELETE — was: That he told | Que dijera  
  'That he told' is the wrong English for subjunctive 'que dijera', and the right gloss would just repeat B01; 4 builds and 14 uses remain. *(K3, K9)*
- **S0237L01U03** I wanted him to tell us what he was thinking | Quería que dijera lo que estaba pensando  
  → **I wanted him to tell us what he was thinking | Quería que nos dijera lo que estaba pensando**  
  English 'tell us' needs 'nos', which is taught (seed 211). *(K9 · override: LEGO containment unchanged by the fix: the row already carried the LEGO as an article/clitic/bound variant (la reunión, nos dijera, ayudarte), K49)*
- **S0237L01U06** I wanted him to tell us what he was trying to say | Quería que dijera lo que estaba intentando decir  
  → **I wanted him to tell us what he was trying to say | Quería que nos dijera lo que estaba intentando decir**  
  English 'tell us' needs 'nos', which is taught (seed 211). *(K9 · override: LEGO containment unchanged by the fix: the row already carried the LEGO as an article/clitic/bound variant (la reunión, nos dijera, ayudarte), K49)*
- **S0237L01U08** He wanted him to tell us what he was thinking about the problem | Él quería que dijera lo que estaba pensando sobre el problema  
  → **He wanted her to tell us what she was thinking about the problem | Él quería que nos dijera lo que estaba pensando sobre el problema**  
  'He wanted him to tell us' is confusing English and the Spanish lacks 'nos'; 'her' and 'nos' fix both. *(K9 · override: LEGO containment unchanged by the fix: the row already carried the LEGO as an article/clitic/bound variant (la reunión, nos dijera, ayudarte), K49)*
- **S0237L01U13** I wanted him to tell me when he was going to come back and talk to me | Quería que me dijera cuándo iba a volver a hablar conmigo  
  → **I wanted him to tell me when he was going to come back and talk to me | Quería que me dijera cuándo iba a volver y hablar conmigo**  
  'volver a hablar' means 'talk again', not 'come back and talk'; 'volver y hablar' says what the English says. *(K9 · override: LEGO containment unchanged by the fix: the row already carried the LEGO as an article/clitic/bound variant (la reunión, nos dijera, ayudarte), K49)*
- **S0237L02U08** I was going to tell you what I had learned before the weekend | Iba a decirte lo que he aprendido antes del fin de semana  
  → **I was going to tell you what I've learnt before the weekend | Iba a decirte lo que he aprendido antes del fin de semana**  
  'had learned' needs 'había aprendido', which is not taught; the English can follow the Spanish 'he aprendido'. *(K14)*

## Seed 239
- **S0239L02U06** My friend likes it when we talk about interesting things together | A mi amiga le gusta cuando hablamos de cosas interesantes juntos  
  → **My friend likes it when we talk about interesting things together | A mi amigo le gusta cuando hablamos de cosas interesantes juntos**  
  'My friend likes' is 'A mi amigo le gusta' in U05/U12; 'amiga' here gives one English two Spanish. *(K3)*

## Seed 243
- **S0243L03U12** I want to find somewhere nice to eat this weekend | Quiero encontrar un sitio agradable para comer el fin de semana  
  → **I want to find somewhere nice to eat this weekend | Quiero encontrar un sitio agradable para comer este fin de semana**  
  English 'this weekend' is 'este fin de semana' (taught); 'el fin de semana' is just 'at the weekend'. *(K9)*

## Seed 244
- **S0244L01U14** I've learnt so many new words that it's hard to remember everything | He aprendido muchas palabras nuevas y es difícil recordar todo  
  → **I've learnt a lot of new words and it's hard to remember everything | He aprendido muchas palabras nuevas y es difícil recordar todo**  
  'so many ... that' needs 'tantas ... que', which is not taught; make the English match 'muchas ... y'. *(K14)*
- **S0244L02U11** I think there's a lot to be said for practising as often as possible | Creo que hay mucho que decir sobre practicar lo más a menudo posible  
  → **I think there's a lot to say about practising as often as possible | Creo que hay mucho que decir sobre practicar lo más a menudo posible**  
  'a lot to be said for' means 'much in favour of'; the Spanish 'hay mucho que decir sobre' means 'a lot to say about'. *(K9)*

## Seed 245
- **S0245L02U09** I know how much you've put into this | Sé lo mucho que has hecho en esto  
  → **I know how much you've done on this | Sé lo mucho que has hecho en esto**  
  The Spanish says 'how much you've done on this', not 'put into this' ('poner' is not taught); change the English. *(K14)*
- **S0245L02U10** I can see how much effort she's putting into learning the language | Puedo ver lo mucho que está intentando aprender el idioma  
  → **I can see how much she is trying to learn the language | Puedo ver lo mucho que está intentando aprender el idioma**  
  The Spanish has no 'effort' or 'putting into'; the English should say what the Spanish says. *(K9)*
- **S0245L03U01** I've learnt so many new words in a short time | He aprendido muchas palabras nuevas en poco tiempo  
  → **I've learnt a lot of new words in a short time | He aprendido muchas palabras nuevas en poco tiempo**  
  'so many' has no Spanish counterpart; 'a lot of new words' matches 'muchas palabras nuevas' as in S0244L01U02. *(K9)*
- **S0245L03U06** I think you can learn so much in a short time if you speak as often as possible | Creo que puedes aprender mucho en poco tiempo si hablas lo más a menudo posible  
  → **I think you can learn a lot in a short time if you speak as often as possible | Creo que puedes aprender mucho en poco tiempo si hablas lo más a menudo posible**  
  'so much' has no counterpart in plain 'mucho'; 'tanto' is not taught. *(K14)*

## Seed 247
- **S0247L01U02** I'm fairly sure that's what she was trying to say | Estoy bastante seguro de lo que ella estaba intentando decir  
  → **I'm fairly sure that's what she was trying to say | Estoy bastante seguro de que eso es lo que ella estaba intentando decir**  
  The Spanish says 'sure of what she was trying to say'; the English means 'sure that that is what she meant'. *(K9, K16)*

## Seed 248
- **S0248L02U03** That book was complete rubbish and I agree with you | Ese libro era una basura total y estoy de acuerdo con lo que dijiste  
  → **That book was complete rubbish and I agree with what you said | Ese libro era una basura total y estoy de acuerdo con lo que dijiste**  
  The Spanish says 'I agree with what you said'. *(K9)*
- **S0248L02U06** He told me the idea was complete rubbish and I agreed with him | Me dijo que la idea era una basura total y estoy de acuerdo con él  
  → **He told me the idea was complete rubbish and I agree with him | Me dijo que la idea era una basura total y estoy de acuerdo con él**  
  Spanish 'estoy de acuerdo' is present; the English said 'agreed'. *(K9)*
- **S0248L03B03** I want them to give it back to me | Quiero que me devuelvan  
  → **I want them to give it back to me | Quiero que me lo devuelvan**  
  English has 'it'; the Spanish leaves the object out. 'me lo' is taught. *(K9, P27)*
- **S0248L03U05** It was not what I asked for so I want them to give me my money back | No era lo que quería así que quiero que me devuelvan mi dinero  
  → **It was not what I wanted so I want them to give me my money back | No era lo que quería así que quiero que me devuelvan mi dinero**  
  The Spanish says 'what I wanted', not 'what I asked for'. *(K9)*
- **S0248L03U10** I thought the idea was complete rubbish and I want them to give my money back | Pensé que la idea era una basura total y quiero que me devuelvan mi dinero  
  → **I thought the idea was complete rubbish and I want them to give me my money back | Pensé que la idea era una basura total y quiero que me devuelvan mi dinero**  
  'give my money back' is missing 'me', which the Spanish has. *(K9)*

## Seed 249
- **S0249L02U04** I would like you to help me before you go if possible | Me gustaría que me ayudes antes de que te vayas si es posible  
  → **I would like you to help me before you go if possible | Me gustaría que me ayudaras antes de que te vayas si es posible**  
  After 'me gustaría que' the verb must be 'ayudaras', which is taught (seed 203); 'antes de que te vayas' can stay for a real future leaving. *(K16)*
- **S0249L02U06** She wants to see you for a minute before you go | Ella quiere verte unos minutos antes de que te vayas  
  → **She wants to see you for a few minutes before you go | Ella quiere verte unos minutos antes de que te vayas**  
  'unos minutos' is 'a few minutes', not 'a minute'. *(K9)*
- **S0249L02U11** I am going to try to help you before you go so there is no need to worry about it | Voy a intentar ayudarte antes de que te vayas así que no deberías preocuparte por eso  
  → **I am going to try to help you before you go so you should not worry about it | Voy a intentar ayudarte antes de que te vayas así que no deberías preocuparte por eso**  
  'no deberías preocuparte' is 'you shouldn't worry'; 'no need to' is 'no hay que' elsewhere (S0254L01U05). *(K3)*

## Seed 251
- **S0251L01U02** I told them I don't want to find out until after we are finished all the work | Les dije que no quiero descubrirlo hasta después de que terminemos todo el trabajo  
  → **I told them I don't want to find out until after we finish all the work | Les dije que no quiero descubrirlo hasta después de que terminemos todo el trabajo**  
  'after we are finished all the work' is not English. *(K9)*
- **S0251L01U03** I think I don't want to find out until after we finish so let us wait a little more | Creo que no quiero descubrirlo hasta después de que terminemos así que hay que esperar un poco más  
  → **I think I don't want to find out until after we finish so we have to wait a little more | Creo que no quiero descubrirlo hasta después de que terminemos así que hay que esperar un poco más**  
  'hay que esperar' means 'we have to wait'; 'let's' is 'hablemos'-type subjunctive elsewhere in the course. *(K3)*
- **S0251L01U04** I just don't want to find out until we have finished everything | Solo no quiero descubrirlo hasta después de que terminemos todo  
  → **I just don't want to find out until after we finish everything | Solo no quiero descubrirlo hasta después de que terminemos todo**  
  The English drops 'after', which is part of the LEGO 'hasta después de que'. *(P17)*
- **S0251L01U09** I really don't want to find out until we finish everything together | De verdad no quiero descubrirlo hasta después de que terminemos todo juntos  
  → **I really don't want to find out until after we finish everything together | De verdad no quiero descubrirlo hasta después de que terminemos todo juntos**  
  The English drops 'after', which is part of the LEGO. *(P17)*

## Seed 252
- **S0252L01U04** I am not sure you will be ready in time but let us try it | No estoy seguro de que estarás listo a tiempo pero hay que intentarlo  
  → **I am not sure if you will be ready in time but we have to try it | No estoy seguro de si estarás listo a tiempo pero hay que intentarlo**  
  'No estoy seguro de que' + future is wrong; 'de si' (as in U07) is right. 'hay que' means 'we have to', not 'let us'. *(K16, K3)*
- **S0252L02U11** He told me he was trying to find out when you would be ready to start | Me dijo que estaba intentando descubrir cuándo estarás listo para empezar  
  → **He told me he was trying to find out when you will be ready to start | Me dijo que estaba intentando descubrir cuándo estarás listo para empezar**  
  English 'would be' needs 'estarías', which is not taught; the Spanish future still works because the start is still to come. *(K14)*

## Seed 253
- **S0253L01B05** Don't worry I should be ready in a few minutes | No deberías preocuparte debería estar listo en unos minutos  
  → **You shouldn't worry, I should be ready in a few minutes | No deberías preocuparte debería estar listo en unos minutos**  
  'No deberías preocuparte' is 'you shouldn't worry'; 'don't worry' would be 'no te preocupes', which is not taught. *(K14)*
- **S0253L01U02** She said she should be ready in a few minutes so let us be patient a moment | Ella dijo que debería estar listo en unos minutos así que hay que ser paciente un momento  
  → **He said he should be ready in a few minutes so we have to be patient for a moment | Él dijo que debería estar listo en unos minutos así que hay que ser paciente un momento**  
  With 'she', 'listo' must be 'lista', which is not taught; making it 'he' keeps the taught form. 'hay que' is 'we have to', not 'let us'. *(K27, K14)*

## Seed 254
- **S0254L01U09** I have been ready since this morning but still feel very well | Estoy listo desde esta mañana pero todavía me siento muy bien  
  → **I have been ready since this morning but I still feel very well | Estoy listo desde esta mañana pero todavía me siento muy bien**  
  The English is missing the subject 'I' after 'but'. *(K9)*
- **S0254L01U11** I told him I have been ready since this morning and am getting a little tired | Le he dicho que estoy listo desde esta mañana y estoy empezando a sentirme un poco cansado  
  → **I have told him I have been ready since this morning and I am starting to feel a little tired | Le he dicho que estoy listo desde esta mañana y estoy empezando a sentirme un poco cansado**  
  Spanish 'Le he dicho' is 'I have told him', and 'estoy empezando a sentirme' is 'I am starting to feel'. *(K9)*

## Seed 255
- **S0255L02B04** I want to know when do you think you'll be ready to leave | Quiero saber cuándo crees que estarás listo para irte  
  → **I want to know when you think you'll be ready to leave | Quiero saber cuándo crees que estarás listo para irte**  
  Question word order after 'I want to know' is not English. Inside 'I want to know / can you tell me', English uses statement order ('when you think'), as U10, U11, U13 and U16 already do. The gate cannot see the LEGO's 'do' because grammar removes it. *(K9 · same defect also in S0255L02U02, S0255L02U06, S0255L02U09)*
- **S0255L02B06** When do you think you'll be ready to leave soon? | ¿Cuándo crees que estarás listo para irte pronto?  
  → **When do you think you'll be ready to leave on Saturday? | ¿Cuándo crees que estarás listo para irte el sábado?**  
  'When ... soon?' asks for a time and gives one; 'on Saturday' makes a real question with taught words. *(K9)*
- **S0255L02B07** Can you tell me when do you think you'll be ready to leave? | ¿Puedes decirme cuándo crees que estarás listo para irte?  
  → **Can you tell me when you think you'll be ready to leave? | ¿Puedes decirme cuándo crees que estarás listo para irte?**  
  Question word order after 'tell me' is not English. Inside 'I want to know / can you tell me', English uses statement order ('when you think'), as U10, U11, U13 and U16 already do. The gate cannot see the LEGO's 'do' because grammar removes it. *(K9 · same defect also in S0255L02U05)*
- **S0255L02U02** I want to know when do you think you'll be ready to leave | Quiero saber cuándo crees que estarás listo para irte  
  → **I want to know when you think you'll be ready to leave | Quiero saber cuándo crees que estarás listo para irte**  
  Question word order after 'I want to know' is not English. Inside 'I want to know / can you tell me', English uses statement order ('when you think'), as U10, U11, U13 and U16 already do. The gate cannot see the LEGO's 'do' because grammar removes it. *(K9 · knock-on of S0255L02B04)*
- **S0255L02U05** Can you tell me when do you think you'll be ready to leave? | ¿Puedes decirme cuándo crees que estarás listo para irte?  
  → **Can you tell me when you think you'll be ready to leave? | ¿Puedes decirme cuándo crees que estarás listo para irte?**  
  Question word order after 'tell me' is not English. Inside 'I want to know / can you tell me', English uses statement order ('when you think'), as U10, U11, U13 and U16 already do. The gate cannot see the LEGO's 'do' because grammar removes it. *(K9 · knock-on of S0255L02B07)*
- **S0255L02U06** I'd like to know when do you think you'll be ready to leave | Me gustaría saber cuándo crees que estarás listo para irte  
  → **I'd like to know when you think you'll be ready to leave | Me gustaría saber cuándo crees que estarás listo para irte**  
  Question word order after 'I'd like to know' is not English. Inside 'I want to know / can you tell me', English uses statement order ('when you think'), as U10, U11, U13 and U16 already do. The gate cannot see the LEGO's 'do' because grammar removes it. *(K9 · knock-on of S0255L02B04)*
- **S0255L02U08** When do you think you'll be ready to leave soon? | ¿Cuándo crees que estarás listo para irte pronto?  
  → **When do you think you'll be ready to leave on Sunday? | ¿Cuándo crees que estarás listo para irte el domingo?**  
  'When ... soon?' asks for a time and gives one; 'on Sunday' makes a real question. *(K9)*
- **S0255L02U09** I need to know when do you think you'll be ready to leave | Necesito saber cuándo crees que estarás listo para irte  
  → **I need to know when you think you'll be ready to leave | Necesito saber cuándo crees que estarás listo para irte**  
  Question word order after 'I need to know' is not English. Inside 'I want to know / can you tell me', English uses statement order ('when you think'), as U10, U11, U13 and U16 already do. The gate cannot see the LEGO's 'do' because grammar removes it. *(K9 · knock-on of S0255L02B04)*
- **S0255L02U12** When do you think you'll be ready to leave in a few minutes? | ¿Cuándo crees que estarás listo para irte en unos minutos?  
  → **When do you think you'll be ready to leave next week? | ¿Cuándo crees que estarás listo para irte la semana que viene?**  
  'When ... in a few minutes?' asks for a time and gives one; 'next week' makes a real question. *(K9)*
- **S0255L02U14** When do you think you'll be ready to leave as soon as possible? | ¿Cuándo crees que estarás listo para irte lo antes posible?  
  → **When do you think you'll be ready to leave tonight? | ¿Cuándo crees que estarás listo para irte esta noche?**  
  'When ... as soon as possible?' makes no sense; 'tonight' makes a real question. *(K9)*
- **S0255L02U17** Can you say when you think you'll be ready to leave earlier? | ¿Puedes decirme cuándo crees que estarás listo para irte antes?  
  → **Can you tell me when you think you'll be ready to leave this morning? | ¿Puedes decirme cuándo crees que estarás listo para irte esta mañana?**  
  The Spanish has 'me' that the English lacks, and 'when ... earlier' is muddled; 'tell me ... this morning' fixes both. *(K9)*

## Seed 256
- **S0256L01B06** I think I'll be ready in less than an hour already | Creo que estaré listo en menos de una hora ya  
  → **I think I'll be ready in less than an hour today | Creo que estaré listo en menos de una hora hoy**  
  A trailing 'already / ya' after the time phrase is unnatural in both languages; 'today / hoy' keeps a natural build. *(K9, K16)*
- **S0256L01U09** DELETE — was: I think I'll be ready in less than an hour, already | Creo que estaré listo en menos de una hora ya  
  Same stranded 'already / ya' as B06, and once fixed it would duplicate B06; the basket keeps 13 use and 6 build rows. *(K9, K16)*
- **S0256L01U11** I think I'll be ready in less than an hour this weekend | Creo que estaré listo en menos de una hora este fin de semana  
  → **I think I'll be ready in less than an hour if everything goes well | Creo que estaré listo en menos de una hora si todo va bien**  
  'in less than an hour this weekend' gives two clashing time frames; 'si todo va bien' uses taught words (S0274L03U06). *(K9)*
- **S0256L01U12** I think I'll be ready in less than an hour next week | Creo que estaré listo en menos de una hora la semana que viene  
  → **I think I'll be ready in less than an hour if I work hard | Creo que estaré listo en menos de una hora si trabajo duro**  
  'in less than an hour next week' gives two clashing time frames; 'si trabajo duro' uses taught words. *(K9)*

## Seed 258
- **S0258L01B04** I want to know what's that blue thing over there | Quiero saber qué es esa cosa azul de allí  
  → **I want to know what that blue thing over there is | Quiero saber qué es esa cosa azul de allí**  
  Question word order after 'know' is not English. U03-U06 already have the corrected English with the same Spanish. *(K9 · same defect also in S0258L01B06, S0258L01B07)*
- **S0258L01B05** Can you tell me what's that blue thing over there? | ¿Puedes decirme qué es esa cosa azul de allí?  
  → **Can you tell me what that blue thing over there is? | ¿Puedes decirme qué es esa cosa azul de allí?**  
  Question word order after 'tell me' is not English. U03-U06 already have the corrected English with the same Spanish. *(K9)*
- **S0258L01B06** Do you know what's that blue thing over there? | ¿Sabes qué es esa cosa azul de allí?  
  → **Do you know what that blue thing over there is? | ¿Sabes qué es esa cosa azul de allí?**  
  Question word order after 'know' is not English. U03-U06 already have the corrected English with the same Spanish. *(K9 · knock-on of S0258L01B04)*
- **S0258L01B07** I'd like to know what's that blue thing over there | Me gustaría saber qué es esa cosa azul de allí  
  → **I'd like to know what that blue thing over there is | Me gustaría saber qué es esa cosa azul de allí**  
  Question word order after 'know' is not English. U03-U06 already have the corrected English with the same Spanish. *(K9 · knock-on of S0258L01B04)*

## Seed 262
- **S0262L01B01** Who was? | ¿Quién era?  
  → **Who was it? | ¿Quién era?**  
  'Who was?' is not an English sentence; '¿Quién era?' is 'Who was it?'. *(K9)*
- **S0262L01U06** He told me who that man was | Dijo quién era ese hombre  
  → **He told me who that man was | Me dijo quién era ese hombre**  
  English 'told me' needs 'Me dijo'. *(K9)*
- **S0262L01U10** I don't know who that was yesterday | No sé quién era ese ayer  
  → **I don't know who that was here yesterday | No sé quién era ese que estaba aquí ayer**  
  'quién era ese ayer' leaves 'ese' hanging; 'ese que estaba aquí ayer' matches U09. *(K16)*
- **S0262L01U15** Do you know who that was here just now? | ¿Sabes quién era ese que estaba aquí hace un rato?  
  → **Do you know who that was here a while ago? | ¿Sabes quién era ese que estaba aquí hace un rato?**  
  'hace un rato' is 'a while ago' everywhere else in the course; 'just now' would be a different Spanish. *(K3)*
- **S0262L01U17** He told her who that man was | Él dijo quién era ese hombre  
  → **He told her who that man was | Él le dijo quién era ese hombre**  
  English 'told her' needs 'le'. *(K9)*
- **S0262L03U12** The man who you were talking to yesterday was an older man who wanted help | Ese hombre con el que estabas hablando ayer era un hombre mayor que quería pedir ayuda  
  → **The man who you were talking to yesterday was an older man who wanted to ask for help | Ese hombre con el que estabas hablando ayer era un hombre mayor que quería pedir ayuda**  
  The Spanish says 'quería pedir ayuda' (wanted to ask for help). *(K9 · same defect also in S0264L01B03, S0264L01B04)*

## Seed 263
- **S0263L01U01** I don't know who you mean when you said that | No sé a quién te refieres cuando dijiste eso  
  → **I don't know who you mean by what you said | No sé a quién te refieres con lo que dijiste**  
  'who you mean when you said' clashes tenses in both languages; 'by what you said / con lo que dijiste' uses taught words ('dices' is not taught). *(K9, K16)*
- **S0263L01U04** I'm not sure who exactly you mean because I can't remember what you said | No sé a quién te refieres exactamente porque no puedo recordar lo que dijiste  
  → **I don't know who exactly you mean because I can't remember what you said | No sé a quién te refieres exactamente porque no puedo recordar lo que dijiste**  
  'I'm not sure' is 'No estoy seguro' in the course; the Spanish here says 'No sé'. *(K3)*
- **S0263L01U06** I don't think I understand what you said so I don't know who you mean | No entiendo lo que dijiste así que no sé a quién te refieres  
  → **I don't understand what you said so I don't know who you mean | No entiendo lo que dijiste así que no sé a quién te refieres**  
  The English hedge 'I don't think' is not in the Spanish ('No creo que entienda' is not taught). *(K14)*
- **S0263L01U13** Who do you mean because I agree with what you said about your friend? | ¿A quién te refieres porque estoy de acuerdo con lo que dijiste sobre tu amigo?  
  → **I know who you mean and I agree with what you said about your friend | Sé a quién te refieres y estoy de acuerdo con lo que dijiste sobre tu amigo**  
  Asking 'who do you mean' because you agree makes no sense; 'I know who you mean and I agree' does. *(K9)*

## Seed 264
- **S0264L01B03** There's an old man who wanted help | Hay un hombre mayor que quería pedir ayuda  
  → **There's an old man who wanted to ask for help | Hay un hombre mayor que quería pedir ayuda**  
  The Spanish says 'quería pedir ayuda' (wanted to ask for help). *(K9 · knock-on of S0262L03U12)*
- **S0264L01B04** I know an old man who wanted help | Conozco a un hombre mayor que quería pedir ayuda  
  → **I know an old man who wanted to ask for help | Conozco a un hombre mayor que quería pedir ayuda**  
  The Spanish says 'quería pedir ayuda' (wanted to ask for help), as the seed-231 sentence does. *(K9 · knock-on of S0262L03U12)*
- **S0264L01U01** I met an old man who wanted help from someone yesterday | Conocí a un hombre mayor que quería pedir ayuda a alguien ayer  
  → **I met an old man who wanted to ask someone for help yesterday | Conocí a un hombre mayor que quería pedir ayuda a alguien ayer**  
  The Spanish says 'pedir ayuda a alguien' (ask someone for help). *(K9)*
- **S0264L01U07** I saw an old man who wanted to write a letter to his friend | Vi un hombre mayor que quería escribir una carta a su amigo  
  → **I saw an old man who wanted to write a letter to his friend | Vi a un hombre mayor que quería escribir una carta a su amigo**  
  A specific person as object needs the personal 'a': 'Vi a un hombre'. *(K16)*

## Seed 267
- **S0267L01U05** I don't know if you've had news from your friend last week | No sé si has tenido noticias de tu amigo la semana pasada  
  → **I don't know if you've had news from your friend this week | No sé si has tenido noticias de tu amigo esta semana**  
  The present perfect cannot take 'last week' in English, and Spain avoids it too; 'this week' works in both. *(K9, K16)*
- **S0267L01U06** I think you've already had news from your friend | Creo que has tenido noticias de tu amigo ya  
  → **I think you've already had news from your friend | Creo que ya has tenido noticias de tu amigo**  
  A final 'ya' after the whole object is unnatural; 'ya has tenido' matches 'you've already had'. *(K16)*
- **S0267L01U08** When did you have news from your friend? | ¿Cuándo has tenido noticias de tu amigo?  
  → **Have you had news from your friend today? | ¿Has tenido noticias de tu amigo hoy?**  
  'When did you have' needs the preterite 'tuviste', which is not taught until seed 278, and '¿Cuándo has tenido?' is odd; a 'today' question keeps the taught tense. *(K14, K16)*
- **S0267L01U12** You haven't had news from him last week | No has tenido noticias de él la semana pasada  
  → **You haven't had news from him this week | No has tenido noticias de él esta semana**  
  The present perfect cannot take 'last week'; 'this week' works in both languages. *(K9, K16)*

## Seed 268
- **S0268L02U12** She sent me emails since last week | Ella me mandó correos desde la semana pasada  
  → **She sent me emails last week | Ella me mandó correos la semana pasada**  
  'sent ... since last week' is not English, and 'mandó ... desde' is not Spanish; 'last week' fixes both. *(K9, K16)*

## Seed 269
- **S0269L01U15** Although I have to wait for your father I'm going to practise | Aunque tengo que esperar a tu padre ya voy a practicar  
  → **Although I have to wait for your father I'm going to practise | Aunque tengo que esperar a tu padre voy a practicar**  
  The Spanish adds 'ya' (already), which the English does not have. *(K9)*

## Seed 270
- **S0270L02U09** I should arrive soon because it worries me to be late | Debería llegar pronto porque me preocupa estar tarde  
  → **I should arrive soon because it worries me to be late | Debería llegar pronto porque me preocupa llegar tarde**  
  'estar tarde' is not Spanish for 'to be late'; this basket's own 'llegar tarde' is. *(K16)*

## Seed 272
- **S0272L02U09** That sounds like it could be the best option right now | Eso suena como que podría ser la mejor opción ahora  
  → **That sounds like the best option right now | Eso suena como la mejor opción ahora**  
  'suena como que podría ser' is a calque; 'suena como la mejor opción' is clean and still holds the LEGO. *(K16)*
- **S0272L03B05** That sounds like a great idea | Esa suena como una gran idea  
  → **That sounds like a great idea | Eso suena como una gran idea**  
  'that' here means the proposal, so it is neuter 'eso', as the seed has; 'esa' points at nothing. *(K16, K27 · same defect also in S0272L03B06)*
- **S0272L03B06** I think that sounds like a great idea | Creo que esa suena como una gran idea  
  → **I think that sounds like a great idea | Creo que eso suena como una gran idea**  
  Neuter 'eso', as in the seed; 'esa' has no feminine noun to point to. *(K16, K27 · knock-on of S0272L03B05)*
- **S0272L03U01** I think that is a great idea and I want to try it | Creo que es una gran idea y quiero intentar hacerla  
  → **I think that is a great idea and I want to do it | Creo que es una gran idea y quiero hacerlo**  
  'intentar hacerla' uses the untaught enclitic '-la' and treats the idea as a thing to make; 'quiero hacerlo' is natural and taught. *(K16, P27)*
- **S0272L03U02** That sounds like a great idea to me | Esa me suena como una gran idea  
  → **That sounds like a great idea to me | Eso me suena como una gran idea**  
  Neuter 'eso', as in the seed; 'esa' has no feminine noun to point to. *(K16, K27 · same defect also in S0272L03U05)*
- **S0272L03U03** I think it is a great idea but I need to think about it more | Creo que es una gran idea pero necesito pensar en eso más  
  → **I think it is a great idea but I need to think about it more | Creo que es una gran idea pero necesito pensar más en eso**  
  Spanish puts 'más' before the object: 'pensar más en eso'. *(K16 · same defect also in S0272L03U09)*
- **S0272L03U05** I have to say that sounds like a great idea to me | Tengo que decir que esa me suena como una gran idea  
  → **I have to say that sounds like a great idea to me | Tengo que decir que eso me suena como una gran idea**  
  Neuter 'eso', as in the seed. *(K16, K27 · knock-on of S0272L03U02)*
- **S0272L03U09** I think you have a great idea but you need to think about it more | Creo que tienes una gran idea pero necesitas pensar en eso más  
  → **I think you have a great idea but you need to think about it more | Creo que tienes una gran idea pero necesitas pensar más en eso**  
  Spanish puts 'más' before the object. *(K16 · knock-on of S0272L03U03)*
- **S0272L03U11** He said it is a great idea but he wants to talk about it more before we start | Él dijo que es una gran idea pero quiere hablar de eso más antes de empezar  
  → **He said it is a great idea but he wants to talk about it more before we start | Él dijo que es una gran idea pero quiere hablar más de eso antes de empezar**  
  Spanish puts 'más' before the object: 'hablar más de eso'. *(K16 · same defect also in S0274L03U11)*

## Seed 274
- **S0274L03U11** He told me in a few days he will be able to talk more about that | Él me dijo que en unos días podrá hablar de eso más  
  → **He told me in a few days he will be able to talk more about that | Él me dijo que en unos días podrá hablar más de eso**  
  Spanish puts 'más' before the object, and the English already says 'talk more about that'. *(K16 · knock-on of S0272L03U11)*
- **S0274L03U12** She asked if you could come back in a few days because we need more time | Ella dijo que quiere saber si puedes volver en unos días porque necesitamos más tiempo  
  → **She said she wants to know if you can come back in a few days because we need more time | Ella dijo que quiere saber si puedes volver en unos días porque necesitamos más tiempo**  
  The Spanish says 'she said she wants to know if you can', not 'she asked if you could'. *(K9)*

## Seed 275
- **S0275L01U02** She told me she needs longer to learn how to say everything | Ella me dijo que quiere más tiempo para aprender cómo decir todo  
  → **She told me she wants longer to learn how to say everything | Ella me dijo que quiere más tiempo para aprender cómo decir todo**  
  The Spanish says 'quiere' (wants), not 'needs'. *(K9)*
- **S0275L01U04** I think I need longer to understand everything she said to me | Creo que necesito más tiempo para entender todo lo que ella dijo  
  → **I think I need longer to understand everything she said to me | Creo que necesito más tiempo para entender todo lo que ella me dijo**  
  English 'said to me' needs 'me dijo'. *(K9)*
- **S0275L01U05** He wants longer before he has to say what he thinks about everything | Él quiere más tiempo antes de tener que decir lo que piensa sobre todo esto  
  → **He wants longer before he has to say what he thinks about all this | Él quiere más tiempo antes de tener que decir lo que piensa sobre todo esto**  
  The Spanish says 'sobre todo esto' (about all this). *(K9)*
- **S0275L01U10** Do you think it is possible for me to have longer to learn this properly? | ¿Crees que es posible tener más tiempo para aprender esto bien?  
  → **Do you think it is possible to have longer to learn this properly? | ¿Crees que es posible tener más tiempo para aprender esto bien?**  
  'for me' is not in the Spanish. *(K9)*
- **S0275L01U12** I want to ask you for longer so I can be sure I am doing this right | Quiero pedir más tiempo para poder estar seguro de que lo estoy haciendo bien  
  → **I want to ask for longer so I can be sure I am doing this right | Quiero pedir más tiempo para poder estar seguro de que lo estoy haciendo bien**  
  English 'ask you' needs 'pedirte', which the gate shows as not taught; drop 'you' from the English instead. *(K14)*

## Seed 277
- **S0277L01B07** She does not want to be late for the meeting | Ella no quiere ir tarde a la reunión  
  → **She does not want to be late for the meeting | Ella no quiere llegar tarde a la reunión**  
  'be late for' is 'llegar tarde a' (taught at seed 270); 'ir tarde' is not. *(K16 · override: LEGO containment unchanged by the fix: the row already carried the LEGO as an article/clitic/bound variant (la reunión, nos dijera, ayudarte), K49)*
- **S0277L01U06** I need to talk to you before the meeting so that we are ready | Necesito hablar contigo antes de la reunión para estar listo  
  → **I need to talk to you before the meeting so that I am ready | Necesito hablar contigo antes de la reunión para estar listo**  
  'para estar listo' means I will be ready (singular), not 'we'. *(K26 · override: LEGO containment unchanged by the fix: the row already carried the LEGO as an article/clitic/bound variant (la reunión, nos dijera, ayudarte), K49)*

## Seed 278
- **S0278L01U10** Did you have to come back to help me again? | ¿Tuviste que volver a ayudarme otra vez?  
  → **Did you have to come back to help me again? | ¿Tuviste que volver para ayudarme otra vez?**  
  'volver a ayudarme' reads as 'help me again', doubling 'otra vez'; 'volver para ayudarme' says 'come back to help me'. *(K16)*

## Seed 279
- **S0279L02B03** There was a little left | Quedaba poco  
  → **There was a little left | Quedaba un poco**  
  'a little left' (some left) is 'un poco'; 'quedaba poco' means hardly any. S0298L01 already teaches 'a little time left = un poco de tiempo'. *(K3, K9 · knock-on of S0279L02U10)*
- **S0279L02U03** There was still a little time left before I had to leave | Todavía quedaba poco tiempo antes de que tenga que irme  
  → **There was still a little time left before I had to leave | Todavía quedaba un poco de tiempo antes de tener que irme**  
  'antes de que tenga' cannot follow a past frame and 'tuviera' is not taught yet; 'antes de tener que irme' works, and 'a little time' (some left) is 'un poco de tiempo', not 'poco tiempo' (hardly any). *(K16, P1)*
- **S0279L02U06** There was nothing left in the place I was looking | No quedaba nada en el sitio que estaba buscando  
  → **There was nothing left in the place where I was looking | No quedaba nada en el sitio donde estaba buscando**  
  'the place I was looking' is incomplete English, and Spanish 'que estaba buscando' means 'looking for'; 'where' fixes both. *(K9, K16)*
- **S0279L02U07** There was a little time left so I started to read | Quedaba poco tiempo así que empecé a leer  
  → **There was a little time left so I started to read | Quedaba un poco de tiempo así que empecé a leer**  
  'a little time left' is 'un poco de tiempo', as S0298L01 teaches; 'poco tiempo' means hardly any. *(K3, K9 · knock-on of S0279L02U10)*
- **S0279L02U10** There was still a little water left | Todavía quedaba poca agua  
  → **There was still a little water left | Todavía quedaba un poco de agua**  
  'a little water' (some left) is 'un poco de agua'; 'poca agua' means hardly any. 'un poco de' is taught (seed 9). *(K9, K16 · same defect also in S0279L02B03, S0279L02U07, S0279L02U11)*
- **S0279L02U11** There was a little work left but I was ready to stop | Quedaba poco trabajo pero estaba listo para parar  
  → **There was a little work left but I was ready to stop | Quedaba un poco de trabajo pero estaba listo para parar**  
  'a little work left' is 'un poco de trabajo'; 'poco trabajo' means hardly any. *(K3, K9 · knock-on of S0279L02U10)*

## Seed 281
- **S0281L01U07** DELETE — was: Does it matter to you that it takes too long to answer? | ¿Te importa si llevas demasiado tiempo para contestar?  
  '¿Te importa si llevas demasiado tiempo…?' does not say what the English says, and the natural 'tardo' is untaught. *(K9,K16)*
- **S0281L02B06** Do you mind when I finish? | ¿Te importa cuando termino?  
  → **Do you mind if I finish? | ¿Te importa si termino?**  
  'Do you mind when I finish' / 'importa cuando' is unnatural; the seed says 'si'. *(K9,K16)*
- **S0281L02U01** Do you mind when I finish before you? | ¿Te importa cuando termino antes que tú?  
  → **Do you mind if I finish before you? | ¿Te importa si termino antes que tú?**  
  As B06. *(K9,K16)*
- **S0281L02U02** When I finish I would like to read my book for a while | Cuando termino me gustaría leer mi libro por un rato  
  → **If I finish I would like to read my book for a while | Si termino me gustaría leer mi libro por un rato**  
  'cuando' about the future needs the subjunctive ('cuando termine'); 'termine' is untaught, and 'si termino' keeps the LEGO and is correct. *(K16,K14)*
- **S0281L02U03** I would like to be able to speak when I finish | Me gustaría poder hablar cuando termino  
  → **I would like to be able to speak if I finish | Me gustaría poder hablar si termino**  
  'cuando' about the future needs the subjunctive ('cuando termine'); 'termine' is untaught, and 'si termino' keeps the LEGO and is correct. *(K16,K14)*
- **S0281L02U04** When I finish today I am going to try to relax for a while | Cuando termino hoy voy a intentar relajarme un rato  
  → **If I finish today I am going to try to relax for a while | Si termino hoy voy a intentar relajarme un rato**  
  'cuando' about the future needs the subjunctive ('cuando termine'); 'termine' is untaught, and 'si termino' keeps the LEGO and is correct. *(K16,K14)*
- **S0281L02U05** When I finish here I would like to go home and relax for a while | Cuando termino aquí me gustaría ir a casa a relajarme un rato  
  → **If I finish here I would like to go home and relax for a while | Si termino aquí me gustaría ir a casa a relajarme un rato**  
  'cuando' about the future needs the subjunctive ('cuando termine'); 'termine' is untaught, and 'si termino' keeps the LEGO and is correct. *(K16,K14)*
- **S0281L02U06** When I finish I would like to speak a little more with you | Cuando termino me gustaría hablar un poco más contigo  
  → **If I finish I would like to speak a little more with you | Si termino me gustaría hablar un poco más contigo**  
  'cuando' about the future needs the subjunctive ('cuando termine'); 'termine' is untaught, and 'si termino' keeps the LEGO and is correct. *(K16,K14)*
- **S0281L02U07** When I finish this I want to practise speaking Spanish | Cuando termino esto quiero practicar hablando español  
  → **If I finish this I want to practise speaking Spanish | Si termino esto quiero practicar hablando español**  
  'cuando' about the future needs the subjunctive ('cuando termine'); 'termine' is untaught, and 'si termino' keeps the LEGO and is correct. *(K16,K14)*
- **S0281L02U09** DELETE — was: When I finish today I am going to try to relax for a while | Cuando termino hoy voy a intentar relajarme un rato  
  Duplicate of U04/U05 (same English, same Spanish) and carries the same 'cuando termino' error. *(K16)*
- **S0281L02U13** DELETE — was: When I finish here I would like to go home and relax for a while | Cuando termino aquí me gustaría ir a casa a relajarme un rato  
  Duplicate of U04/U05 (same English, same Spanish) and carries the same 'cuando termino' error. *(K16)*

## Seed 282
- **S0282L02U05** DELETE — was: I finish before the meeting and so there is no problem | Termino antes de la reunión así que no hay un problema  
  'no hay un problema' is a calque, and the natural 'no hay problema' drops the LEGO 'un problema'. *(K16,P17)*
- **S0282L02U06** I think there could be a problem with this but I am not sure | Creo que podría ser un problema con esto pero no estoy seguro  
  → **I think it could be a problem with this but I am not sure | Creo que podría ser un problema con esto pero no estoy seguro**  
  'podría ser un problema' = 'it could be a problem'. *(K9)*
- **S0282L02U13** There could be a problem if we don't talk about this before we start | Podría ser un problema si no hablamos de esto antes de empezar  
  → **It could be a problem if we don't talk about this before we start | Podría ser un problema si no hablamos de esto antes de empezar**  
  As U06. *(K9)*

## Seed 283
- **S0283L01B04** Which ones are there? | ¿Cuáles son?  
  → **Which ones are they? | ¿Cuáles son?**  
  '¿Cuáles son?' = 'which ones are they'. *(K9)*
- **S0283L01U06** I am trying to find out which ones are best for speaking Spanish | Estoy intentando saber cuáles son los mejor para hablar español  
  → **I am trying to find out which ones are best for speaking Spanish | Estoy intentando saber cuáles son los mejores para hablar español**  
  'los mejor' lacks agreement. *(K27,K27 · override: agreement form required by K27; the gate counts the inflected form as new (K21), so the applier must accept it as an agreement fix)*
- **S0283L03U05** People who speak Spanish often are very interesting to talk to | Personas que hablan español a menudo son muy interesante hablar  
  → **People who speak Spanish often are very interesting | Personas que hablan español a menudo son muy interesantes**  
  'muy interesante hablar' fails agreement and has a dangling infinitive. *(K27,K16)*

## Seed 285
- **S0285L01U12** I want to speak better soon and she speaks very well already | Tengo ganas de hablar mejor lo antes posible y ella ya habla muy bien  
  → **I want to speak better soon and she speaks very well already | Quiero hablar mejor lo antes posible y ella ya habla muy bien**  
  'tengo ganas de' = 'I feel like', not 'I want'. *(K9,K16)*

## Seed 286
- **S0286L01U03** My friend knows people who like to practise often | Mi amigo conoce personas a las que les gusta practicar a menudo  
  → **My friend knows people who like to practise often | Mi amigo conoce a personas a las que les gusta practicar a menudo**  
  Personal 'a' is required after 'conocer'. *(K16)*
- **S0286L01U04** DELETE — was: She knows people who like to learn and tries to help them | Ella conoce personas a las que les gusta aprender y intentar ayudar  
  Missing personal 'a' and a subjectless 'intentar'; the fix needs untaught 'intenta'. *(K16,P1)*
- **S0286L01U07** She is always looking for people who like to read and talk about it | Ella está buscando personas a las que les gusta leer y hablar de eso  
  → **She is looking for people who like to read and talk about it | Ella está buscando personas a las que les gusta leer y hablar de eso**  
  'always' had no Spanish counterpart. *(K9)*
- **S0286L01U08** DELETE — was: It is hard to find people who like to practise with someone they do not know | Es difícil encontrar personas a las que les gusta practicar con alguien que no conoce  
  'alguien que no conoce' makes the someone the subject; the fix needs untaught 'conocen'/'quien'. *(K16,P1)*
- **S0286L01U09** He knows people who like to learn and are very good at it | Él conoce a personas a las que les gusta aprender y son muy buenas  
  → **He knows people who like to learn and are very good | Él conoce a personas a las que les gusta aprender y son muy buenas**  
  'at it' had no counterpart. *(K9)*

## Seed 287
- **S0287L02U04** Do you know people who like reading? | ¿Conoces personas a las que les gusta leer?  
  → **Do you know people who like reading? | ¿Conoces a personas a las que les gusta leer?**  
  Personal 'a'. *(K16)*

## Seed 288
- **S0288L01U11** DELETE — was: How many people do you know who make up most of your friends? | ¿Cuántas personas conoces que son la mayoría de tus amigos?  
  'people you know who make up most of your friends' is circular nonsense. *(K9)*
- **S0288L03U07** She knows most of the people here who like watching television | Ella conoce la mayoría de personas a las que les gusta ver la televisión aquí  
  → **She knows most of the people here who like watching television | Ella conoce a la mayoría de las personas a las que les gusta ver la televisión aquí**  
  Missing personal 'a' and 'las'. *(K16)*
- **S0288L03U15** Many people who like watching television want to learn | Hay muchas personas a las que les gusta ver la televisión y quieren aprender  
  → **Many people who like watching television want to learn | Muchas personas a las que les gusta ver la televisión quieren aprender**  
  'Hay' had no English counterpart. *(K9)*

## Seed 289
- **S0289L01U04** I wonder how long it is going to take before the weekend | Me pregunto cuánto tiempo va a pasar antes del fin de semana  
  → **I wonder how long it is going to be before the weekend | Me pregunto cuánto tiempo va a pasar antes del fin de semana**  
  'va a pasar' is 'pass', not 'take'. *(K9)*
- **S0289L01U07** I wonder how long he's going to take to learn to speak well | Me pregunto cuánto tiempo va a llevar aprender a hablar bien  
  → **I wonder how long it is going to take to learn to speak well | Me pregunto cuánto tiempo va a llevar aprender a hablar bien**  
  No 'he' in the Spanish (impersonal 'va a llevar'). *(K9,K26)*
- **S0289L01U14** I wonder where the best place to practise is here | Me pregunto dónde es el mejor sitio para practicar aquí  
  → **I wonder where the best place to practise is here | Me pregunto dónde está el mejor sitio para practicar aquí**  
  Location takes estar. *(K16)*
- **S0289L02U12** I wonder if the meeting is going to be ready to start in time | Me pregunto si la reunión va a estar listo para empezar a tiempo  
  → **I wonder if the meeting is going to be ready to start in time | Me pregunto si la reunión va a estar lista para empezar a tiempo**  
  'reunión' is feminine. *(K27,K27 · override: agreement form required by K27; the gate counts the inflected form as new (K21), so the applier must accept it as an agreement fix)*

## Seed 290
- **S0290L02U13** Nobody knows how long it will take but we keep trying | Nadie sabe cuánto tiempo va a llevar pero intentamos seguir  
  → **Nobody knows how long it will take but we try to keep going | Nadie sabe cuánto tiempo va a llevar pero intentamos seguir**  
  'intentamos seguir' = 'we try to keep going'. *(K9)*
- **S0290L02U14** DELETE — was: He knows the people here who like to practise often | Él sabe las personas aquí a las que les gusta practicar a menudo  
  'saber' with people is wrong ('conocer a'), and the fix drops the LEGO 'sabe'. *(K16,P17)*

## Seed 291
- **S0291L01U05** It is not very difficult so I hope you finish soon | Esto no es muy difícil así que espero que termines pronto  
  → **This is not very difficult so I hope you finish soon | Esto no es muy difícil así que espero que termines pronto**  
  The Spanish has 'Esto'. *(K9)*
- **S0291L01U08** I hope to be able to speak well enough to talk with people | Espero poder hablar bien suficientemente para hablar con personas  
  → **I hope to be able to speak well enough to talk with people | Espero poder hablar lo suficientemente bien para hablar con personas**  
  'bien suficientemente' is a calque. *(K16)*
- **S0291L02U10** I hope to finish soon so I can be able to speak better soon | Así que espero terminar pronto para poder hablar mejor pronto  
  → **So I hope to finish soon to be able to speak better soon | Así que espero terminar pronto para poder hablar mejor pronto**  
  'so I can be able to' is not English, and 'Así que' had no English counterpart. *(K9)*

## Seed 293
- **S0293L03U11** I have to find out where he's going to meet me at the café because it's this morning | Tengo que descubrir dónde va a reunirse conmigo en el café porque es esta mañana  
  → **I have to find out where he's going to meet me at the café this morning | Tengo que descubrir dónde va a reunirse conmigo en el café esta mañana**  
  'because it's this morning' gives no reason. *(K9)*
- **S0293L03U12** I have to find out where he's going to meet me and I will find out now | Tengo que descubrir dónde va a reunirse conmigo y lo voy a descubrir ahora  
  → **I have to find out where he's going to meet me and I'm going to find out now | Tengo que descubrir dónde va a reunirse conmigo y lo voy a descubrir ahora**  
  'voy a' = 'I'm going to'. *(K9)*

## Seed 295
- **S0295L01U10** I said that I wanted to finish reading that book before the week was over | Dije que quería terminar de leer ese libro antes del fin de semana  
  → **I said that I wanted to finish reading that book before the weekend | Dije que quería terminar de leer ese libro antes del fin de semana**  
  'fin de semana' = weekend. *(K9)*
- **S0295L02U06** It's not easy to learn so much in a day | No es fácil aprender todo esto en un día  
  → **It's not easy to learn all this in a day | No es fácil aprender todo esto en un día**  
  'todo esto' = 'all this'. *(K9)*
- **S0295L02U10** Nobody said we needed to finish in a day | Nadie dijo que tenemos que terminar en un día  
  → **Nobody said we have to finish in a day | Nadie dijo que tenemos que terminar en un día**  
  Past 'needed' vs present 'tenemos'; the past Spanish 'teníamos' is untaught, so the English moves. *(K14)*
- **S0295L03B05** I didn't say that I wanted to finish in a day so you needn't worry | No dije que quería terminar en un día así que no hay que preocuparte  
  → **I didn't say that I wanted to finish in a day so you don't have to worry | No dije que quería terminar en un día así que no tienes que preocuparte**  
  'no hay que preocuparte' mixes impersonal and personal. *(K16)*
- **S0295L03U10** DELETE — was: I didn't say that I wanted to finish in a day but I do want to try hard | No dije que quería terminar en un día pero sí quiero intentar mucho  
  'intentar mucho' is a calque of 'try hard' and 'intentarlo' is untaught at this LEGO. *(K16,P1)*

## Seed 297
- **S0297L04U01** I don't know many people who speak Spanish yet but I'm looking for some | No conozco a muchas personas que hablen español todavía pero estoy buscando  
  → **I don't know many people who speak Spanish yet but I'm looking for more | No conozco a muchas personas que hablen español todavía pero estoy buscando más**  
  'estoy buscando' had no object; U05 uses 'más'. *(K16)*
- **S0297L04U05** I don't know many people who speak Spanish here but I'm looking for some | No conozco a muchas personas que hablen español aquí pero estoy buscando más  
  → **I don't know many people who speak Spanish here but I'm looking for more | No conozco a muchas personas que hablen español aquí pero estoy buscando más**  
  'más' = 'more'. *(K9)*
- **S0297L04U12** I don't know many people who speak Spanish but those I know are very useful | No conozco a muchas personas que hablen español pero los que conozco son muy útil  
  → **I don't know many people who speak Spanish but those I know are very useful | No conozco a muchas personas que hablen español pero los que conozco son muy útiles**  
  'útil' must agree with 'los que'. *(K27,K27 · override: agreement form required by K27; the gate counts the inflected form as new (K21), so the applier must accept it as an agreement fix)*

## Seed 298
- **S0298L02U05** I feel like I have nothing left to say about this | Siento como si no me queda nada que decir sobre esto  
  → **I feel like I have nothing left to say about this | Siento que no me queda nada que decir sobre esto**  
  'como si' needs the past subjunctive; 'siento que' takes the indicative. *(K16)*

## Seed 299
- **S0299L01U03** I am going to pay because I said I would | Voy a pagar porque lo dije  
  → **I am going to pay because I said so | Voy a pagar porque lo dije**  
  'porque lo dije' = 'because I said so'. *(K9)*
- **S0299L01U05** I need to pay for everything before I leave | Necesito pagar todo antes de que tenga que irme  
  → **I need to pay for everything before I have to leave | Necesito pagar todo antes de que tenga que irme**  
  The Spanish has 'tenga que irme'. *(K9)*
- **S0299L02U04** She wants to pay more than half which is very kind | Ella quiere pagar más de la mitad lo que es muy amable  
  → **She wants to pay more than half which is very kind | Ella quiere pagar más de la mitad, lo que es muy amable**  
  A non-restrictive 'lo que' needs the pause. *(K16)*
- **S0299L03U14** He wants to pay half because he said he would | Él quiere pagar la mitad porque lo dijo  
  → **He wants to pay half because he said so | Él quiere pagar la mitad porque lo dijo**  
  As S0299L01U03. *(K9)*

## Seed 300
- **S0300L02U04** She told me she does not want to seem unfriendly when she speaks with everyone | Ella me dijo que no quiere parecer antipática cuando habla con todos los demás  
  → **She told me she does not want to seem unfriendly when she speaks with everyone else | Ella me dijo que no quiere parecer antipática cuando habla con todos los demás**  
  'todos los demás' = 'everyone else'. *(K9)*
- **S0300L03U02** She does not want to seem unfriendly so she is trying to speak with everyone | Ella no quiere parecer antipática así que está intentando hablar con todos los demás  
  → **She does not want to seem unfriendly so she is trying to speak with everyone else | Ella no quiere parecer antipática así que está intentando hablar con todos los demás**  
  As S0300L02U04. *(K9)*
- **S0300L03U14** She does not want to seem unfriendly with the people who work with her | Ella no quiere parecer antipática con las personas que trabaja con ella  
  → **She does not want to seem unfriendly with the people who work with her | Ella no quiere parecer antipática con las personas que trabajan con ella**  
  'que trabaja' must agree with 'personas'. *(K27,K27 · override: agreement form required by K27; the gate counts the inflected form as new (K21), so the applier must accept it as an agreement fix)*

## Seed 313
- **S0313L01B03** he couldn't see five | él no podía ver los cinco  
  → **he couldn't see five | él no podía ver cinco**  
  'los cinco' = 'the five'. *(K9)*
- **S0313L01U04** he wanted to see five here | él quería ver los cinco aquí  
  → **he wanted to see five here | él quería ver cinco aquí**  
  As B03. *(K9)*

## Seed 314
- **S0314L01U02** I think she could put it on the table | creo que podría ponerlo en la mesa  
  → **I think she could put it on the table | creo que ella podría ponerlo en la mesa**  
  The English says 'she'; 'podría' alone is ambiguous. *(K26)*

## Seed 318
- **S0318L01U04** I don't think she could if she wanted to | no creo que pueda si quisiera  
  → **I don't think she could if she wanted to | no creo que pueda aunque quisiera**  
  'pueda si quisiera' mixes moods; 'aunque quisiera' is natural. *(K16)*

## Seed 324
- **S0324L02U05** that male student has something | ese estudiante tiene algo  
  → **that student has something | ese estudiante tiene algo**  
  'that male student' is stilted English. *(K9)*

## Seed 325
- **S0325L02U04** DELETE — was: I want to do possible things | quiero hacer cosas posibles  
  'I want to do possible things' is empty on both sides. *(K9)*

## Seed 330
- **S0330L02B02** Spanish is very difficult | español es muy difícil  
  → **Spanish is very difficult | el español es muy difícil**  
  A language as subject needs the article. *(K16)*
- **S0330L02B04** Be ready very soon | estar listo muy pronto  
  → **To be ready very soon | estar listo muy pronto**  
  'estar listo' is an infinitive. *(K9,K54)*

## Seed 339
- **S0339L02U02** do you know if there's much harm? | ¿sabes si hay bastante daño?  
  → **do you know if there's quite a lot of harm? | ¿sabes si hay bastante daño?**  
  'bastante' = 'quite a lot' (taught S0339L01). *(K9)*
- **S0339L02U04** there's quite a lot of damage here | hay bastante daño aquí  
  → **there's quite a lot of harm here | hay bastante daño aquí**  
  The LEGO is 'harm | daño'. *(P28,K17)*
- **S0339L02U05** it seems like there's quite a lot of damage | parece que hay bastante daño  
  → **it seems like there's quite a lot of harm | parece que hay bastante daño**  
  As U04. *(P28,K17)*

## Seed 346
- **S0346L01U03** I really liked her idea | me gustó bastante su idea  
  → **I liked her idea quite a lot | me gustó bastante su idea**  
  'bastante' = 'quite a lot'. *(K9)*

## Seed 350
- **S0350L01U05** he told me about some old friends | él me dijo sobre unos viejos amigos  
  → **he told me something about some old friends | él me dijo algo sobre unos viejos amigos**  
  'decir sobre' is a calque; 'decir algo sobre' is natural. *(K16)*

## Seed 358
- **S0358L01U04** I did not think she could reach the top | no pensé que podía llegar a la cima  
  → **I thought she couldn't reach the top | pensé que no podía llegar a la cima**  
  Negated 'no pensé que' needs the untaught 'pudiera'; moving the negation keeps the indicative right. *(K16,K14)*

## Seed 359
- **S0359L01U04** I did not know she had to go to the left | no sabía que necesitaba ir a la izquierda  
  → **I did not know she needed to go to the left | no sabía que necesitaba ir a la izquierda**  
  'necesitaba' = 'needed'. *(K9)*
- **S0359L01U05** I thought she had to go to the left | pensé que necesitaba ir a la izquierda  
  → **I thought she needed to go to the left | pensé que necesitaba ir a la izquierda**  
  As U04. *(K9)*

## Seed 363
- **S0363L01B03** DELETE — was: she had that urge to | tenía esas ganas de  
  'she had that urge to / esas ganas de' is an odd fragment with an unreferenced 'that'. *(K9)*

## Seed 366
- **S0366L01U06** she had wanted to grow for a long time | quería cultivar desde hace mucho  
  → **she had wanted to grow it for a long time | quería cultivar desde hace mucho**  
  The Spanish 'quería… desde hace mucho' reads with an implied object; the English left 'grow' hanging. *(K9)*

## Seed 371
- **S0371L03U05** DELETE — was: I went to find the road | fui a encontrar la carretera  
  'fui a encontrar la carretera' is a calque ('ir a buscar'), and 'buscar' is untaught here. *(K16,P1)*

## Seed 374
- **S0374L01U01** I thought it was very beautiful | pensé que era muy bonito  
  → **I thought it was very pretty | pensé que era muy bonito**  
  The LEGO is 'pretty | bonito'. *(P28)*

## Seed 377
- **S0377L01B03** to know of somewhere | saber de algún sitio  
  → **to know of somewhere | conocer algún sitio**  
  'saber de algún sitio' = have news of; 'conocer' is 'know (a place)'. *(K16)*
- **S0377L04U05** DELETE — was: you went to find the road | fuiste a encontrar la carretera  
  As S0371L03U05. *(K16,P1)*

## Seed 378
- **S0378L01B02** DELETE — was: quite enough | bastante suficiente  
  'bastante suficiente' is redundant. *(K16)*
- **S0378L01U04** I didn't think it was enough | no pensé que era suficiente  
  → **I thought it wasn't enough | pensé que no era suficiente**  
  As S0358L01U04. *(K16,K14)*
- **S0378L02B02** not enough money | no suficiente dinero  
  → **I didn't have enough money | no tenía suficiente dinero**  
  'no suficiente dinero' is a calque fragment. *(K16)*
- **S0378L02B03** no money | no tenía dinero  
  → **I had no money | no tenía dinero**  
  The Spanish has 'tenía'. *(K9)*

## Seed 381
- **S0381L01B02** DELETE — was: to keep following | seguir más  
  'to keep following | seguir más' do not match. *(K9)*

## Seed 384
- **S0384L01U01** she said it a moment ago | dijo hace un momento  
  → **she said it a moment ago | lo dijo hace un momento**  
  'it' needs 'lo'. *(Kai 30 Oct object rule)*
- **S0384L01U05** I asked what she said a moment ago | pregunté lo que dijo hace un momento  
  → **I asked what she said a moment ago | pregunté qué dijo hace un momento**  
  An indirect question takes 'qué'. *(K16)*

## Seed 388
- **S0388L02U03** I heard about that person you work with | oí algo de esa persona con la que trabajas  
  → **I heard something about that person you work with | oí algo de esa persona con la que trabajas**  
  'oí algo de' = 'I heard something about'; the English lacked 'something'. *(K9)*

## Seed 389
- **S0389L01B01** DELETE — was: over there | de allí  
  'over there | de allí' is a broken piece of the LEGO ('de allí' = from there). *(K9)*
- **S0389L01U03** I saw that person over there | vi esa persona de allí  
  → **I saw that person over there | vi a esa persona de allí**  
  Personal 'a'. *(K16)*
- **S0389L01U04** did you see that person over there? | ¿viste esa persona de allí?  
  → **did you see that person over there? | ¿viste a esa persona de allí?**  
  Personal 'a'. *(K16)*
- **S0389L01U06** I heard about that person over there | oí algo de esa persona de allí  
  → **I heard something about that person over there | oí algo de esa persona de allí**  
  'oí algo de' = 'I heard something about'; the English lacked 'something'. *(K9)*

## Seed 393
- **S0393L01U06** I heard about the person with the green shirt | oí algo de la persona con la camisa verde  
  → **I heard something about the person with the green shirt | oí algo de la persona con la camisa verde**  
  'oí algo de' = 'I heard something about'; the English lacked 'something'. *(K9)*
- **S0393L02U06** I heard about that boy | oí algo de ese chico  
  → **I heard something about that boy | oí algo de ese chico**  
  'oí algo de' = 'I heard something about'; the English lacked 'something'. *(K9)*

## Seed 396
- **S0396L01U05** it is important to stand up | es importante levantarnos  
  → **it is important for us to stand up | es importante levantarnos**  
  'levantarnos' fixes the subject as 'us'. *(K26)*

## Seed 398
- **S0398L01U01** I think we should be more patient | creo que necesitamos ser más pacientes  
  → **I think we need to be more patient | creo que necesitamos ser más pacientes**  
  'necesitamos' = 'need'. *(K9)*

## Seed 399
- **S0399L01B02** don't lose | no perder  
  → **not to lose | no perder**  
  'no perder' is an infinitive. *(K9)*
- **S0399L02U04** DELETE — was: we need to keep hope | necesitamos no perder la esperanza  
  'keep hope' vs 'no perder la esperanza' do not match, and the literal English is unnatural. *(K9)*

## Seed 404
- **S0404L01U04** I told her it should be done before Thursday | le dije que debería hacerlo antes del jueves  
  → **I told her she should do it before Thursday | le dije que debería hacerlo antes del jueves**  
  'debería hacerlo' = 'she should do it'. *(K9)*

## Seed 405
- **S0405L01U05** can I book it? | ¿puedo reservar?  
  → **can I book? | ¿puedo reservar?**  
  The Spanish has no object; 'reservarlo' is untaught. *(K14)*

## Seed 406
- **S0406L02B02** I'm sure it's fine | estoy seguro de que estará bien  
  → **I'm sure it'll be fine | estoy seguro de que estará bien**  
  'estará' is future. *(K9)*
- **S0406L02U03** I'm not sure it will work | no estoy seguro de que va a funcionar  
  → **I'm sure it's going to work | estoy seguro de que va a funcionar**  
  Negated 'no estoy seguro de que' needs the untaught subjunctive 'funcione'; the affirmative is right as is. *(K16,K14)*
- **S0406L02U05** I'm sure she'll be ready soon | estoy seguro de que estará listo pronto  
  → **I'm sure she'll be ready soon | estoy seguro de que estará lista pronto**  
  'she' needs 'lista'. *(K27,K27 · override: agreement form required by K27; the gate counts the inflected form as new (K21), so the applier must accept it as an agreement fix)*

## Seed 409
- **S0409L01B03** it doesn't matter anymore | no importa más  
  → **it doesn't matter anymore | ya no importa**  
  'anymore' is 'ya no'. *(K16)*
- **S0409L01U03** I knew it didn't matter | sabía que no importa  
  → **I know it doesn't matter | sé que no importa**  
  Past 'sabía que' + present clashes with 'didn't matter'. *(K16,K14 · knock-on of S0425L01U04)*
- **S0409L01U06** it doesn't really matter anymore | no importa nada más  
  → **it doesn't matter anymore | ya no importa**  
  'nada más' = 'nothing else'. *(K16)*
- **S0409L02B03** DELETE — was: we do it here | hagamos aquí  
  'we do it here | hagamos aquí' do not match and the row lacks its LEGO 'lo que hagamos'. *(K9,P17)*

## Seed 410
- **S0410L01U06** I knew she needed to sort things out between them | sabía que necesitaba arreglarlo entre ellos  
  → **I knew she needed to sort it out between them | sabía que necesitaba arreglarlo entre ellos**  
  'arreglarlo' = 'sort it out'. *(K9)*
- **S0410L02U06** I knew they still fight | sabía que todavía se pelean  
  → **I know they still fight | sé que todavía se pelean**  
  'I knew they still fight' is not English; past frame + present. *(K9,K14 · knock-on of S0425L01U04)*

## Seed 412
- **S0412L01B03** DELETE — was: not lose but win | no perder pero ganar  
  'not X but Y' needs 'sino', untaught here. *(K16,P1)*
- **S0412L02U04** she told me to allow them to win | me dijo que debería permitirles ganar  
  → **she told me I should allow them to win | me dijo que debería permitirles ganar**  
  'me dijo que debería' = 'told me I should'. *(K9)*
- **S0412L02U06** I told her not to allow them to do it | le dije que no debería permitirles hacerlo  
  → **I told her she shouldn't allow them to do it | le dije que no debería permitirles hacerlo**  
  As U04. *(K9)*
- **S0412L04U05** I didn't think we could stay | no pensé que podíamos quedarnos  
  → **I thought we couldn't stay | pensé que no podíamos quedarnos**  
  As S0358L01U04; keeps the LEGO "no podíamos". *(K16,K14)*

## Seed 413
- **S0413L02U04** it is easy to fall there | es fácil caernos allí  
  → **it is easy for us to fall there | es fácil caernos allí**  
  'caernos' fixes 'us'. *(K26)*

## Seed 415
- **S0415L01B02** not in my opinion | no, en mi opinión  
  → **not in my opinion | no en mi opinión**  
  The comma made the voice say 'No. In my opinion'. *(K16)*

## Seed 416
- **S0416L02U05** I told her to lead the way | le dije que debería liderar el camino  
  → **I told her she should lead the way | le dije que debería liderar el camino**  
  As S0412L02U04. *(K9)*

## Seed 419
- **S0419L02U03** DELETE — was: it's important that people appreciate | es importante que la gente aprecie  
  'it's important that people appreciate' has no object either side. *(K9)*

## Seed 420
- **S0420L01U02** I knew he has everything | sabía que tiene todo  
  → **I know he has everything | sé que tiene todo**  
  Past frame + present. *(K9,K14 · knock-on of S0425L01U04)*
- **S0420L01U03** I knew he has more | sabía que tiene más  
  → **I know he has more | sé que tiene más**  
  As U02. *(K9,K14 · knock-on of S0425L01U04)*

## Seed 421
- **S0421L03U04** I was sure they knew | estaba seguro de que saben  
  → **I'm sure they know | estoy seguro de que saben**  
  After a past frame ('estaba seguro de que', 'sabía que') Spanish backshifts the verb; the present here clashes with the English past. The past form is untaught here, so the frame moves to the present on both sides. *(K16,K14)*
- **S0421L04U05** I was worried she was getting weak | estaba preocupada de que se está debilitando  
  → **I'm worried she's getting weak | estoy preocupada de que se está debilitando**  
  After a past frame ('estaba seguro de que', 'sabía que') Spanish backshifts the verb; the present here clashes with the English past. The past form is untaught here, so the frame moves to the present on both sides. ('preocupada de que' + indicative is still marked; Deborah may prefer 'me preocupa que se esté debilitando'.) *(K16,K14)*

## Seed 423
- **S0423L01U02** in my opinion, it's so obvious | en mi opinión, es tan obvia  
  → **in my opinion, it's such an obvious question | en mi opinión, es una pregunta tan obvia**  
  'tan obvia' is feminine with no feminine noun; supplying the seed's 'pregunta' keeps the LEGO. *(K27,P24)*
- **S0423L01U03** I knew it was so obvious | sabía que era tan obvia  
  → **I knew it was such an obvious question | sabía que era una pregunta tan obvia**  
  As U02. *(K27,P24)*
- **S0423L01U06** I told her it was a very obvious question | le dije que era una pregunta tan obvia  
  → **I told her it was such an obvious question | le dije que era una pregunta tan obvia**  
  The LEGO teaches 'such an obvious = tan obvia'; the English said 'very obvious'. *(P28)*

## Seed 425
- **S0425L01U04** I knew they already understood | sabía que ya entienden  
  → **I know they already understand | sé que ya entienden**  
  After a past frame ('estaba seguro de que', 'sabía que') Spanish backshifts the verb; the present here clashes with the English past. The past form is untaught here, so the frame moves to the present on both sides. *(K16,K14 · same defect also in S0409L01U03, S0410L02U06, S0420L01U02, S0420L01U03, S0456L02U05)*
- **S0425L01U06** I was sure they already understood | estaba seguro de que ya entienden  
  → **I'm sure they already understand | estoy seguro de que ya entienden**  
  After a past frame ('estaba seguro de que', 'sabía que') Spanish backshifts the verb; the present here clashes with the English past. The past form is untaught here, so the frame moves to the present on both sides. *(K16,K14)*

## Seed 426
- **S0426L03B02** they love each other | quererse entre ellos  
  → **to love each other | quererse entre ellos**  
  The Spanish is the infinitive 'quererse entre ellos'; the English was finite. *(K9)*
- **S0426L03U06** because they still love each other | porque todavía quieren quererse  
  → **because they still want to love each other | porque todavía quieren quererse**  
  'quieren quererse' is 'want to love each other'; the English dropped 'want'. *(K9)*

## Seed 427
- **S0427L02U04** I knew they were bored | sabía que están aburridos  
  → **I know they are bored | sé que están aburridos**  
  After a past frame ('estaba seguro de que', 'sabía que') Spanish backshifts the verb; the present here clashes with the English past. The past form is untaught here, so the frame moves to the present on both sides. *(K16,K14)*

## Seed 428
- **S0428L01U05** because it's Tuesday | porque es el martes  
  → **because it's Tuesday | porque es martes**  
  With ser, a weekday as predicate takes no article: 'es martes'. *(K16)*

## Seed 429
- **S0429L01U05** already perfect for them | ya es perfecto para ellos  
  → **it's already perfect for them | ya es perfecto para ellos**  
  The Spanish has 'es'; the English had no verb. *(K9)*
- **S0429L01U06** DELETE — was: it's not so obvious it would be perfect for them | no es tan obvia que sería perfecto para ellos  
  'no es tan obvia que sería…' has a feminine with no noun and a broken tan…que clause; no taught rewrite. *(K16,K27)*

## Seed 431
- **S0431L01U04** I was sure they'd be ready soon | estaba seguro de que estarán listos pronto  
  → **I'm sure they'll be ready soon | estoy seguro de que estarán listos pronto**  
  After a past frame ('estaba seguro de que', 'sabía que') Spanish backshifts the verb; the present here clashes with the English past. The past form is untaught here, so the frame moves to the present on both sides. *(K16,K14)*

## Seed 432
- **S0432L01U02** I knew they wanted you to ask | sabía que quieren que preguntes  
  → **I know they want you to ask | sé que quieren que preguntes**  
  After a past frame ('estaba seguro de que', 'sabía que') Spanish backshifts the verb; the present here clashes with the English past. The past form is untaught here, so the frame moves to the present on both sides. *(K16,K14)*

## Seed 433
- **S0433L01U04** I told her to see the film | le dije que debería ver la película  
  → **I told her she should see the film | le dije que debería ver la película**  
  'le dije que debería ver' is 'I told her she should see'; moving the English avoids the untaught 'viera'. *(K14)*
- **S0433L03U04** I was sure they couldn't do it | estaba seguro de que no pudieron hacerlo  
  → **I'm sure they couldn't do it | estoy seguro de que no pudieron hacerlo**  
  With 'estaba seguro' the preterite reads oddly; with 'estoy seguro' it is a plain statement about a past event. *(K16)*

## Seed 434
- **S0434L02U03** DELETE — was: can you tell me about the students they take? | ¿puedes decirme de los estudiantes que aceptan?  
  'decirme de' is a calque of 'tell me about'; 'hablarme de' is untaught. *(K16,P1)*

## Seed 436
- **S0436L01U02** what is the minimum number? | ¿qué es el número mínimo?  
  → **what is the minimum number? | ¿cuál es el número mínimo?**  
  Asking for a value takes 'cuál', not 'qué'. *(K16)*

## Seed 440
- **S0440L03B04** to do something while still young | hacer algo mientras todavía son jóvenes  
  → **to do something while they're still young | hacer algo mientras todavía son jóvenes**  
  The Spanish has 'son' (they are); the English had no subject. *(K26)*
- **S0440L03U05** I knew they wanted to travel while still young | sabía que querían viajar mientras todavía son jóvenes  
  → **I knew they wanted to travel while they're still young | sabía que querían viajar mientras todavía son jóvenes**  
  The Spanish keeps 'son'; the English dropped 'they're'. *(K26)*

## Seed 447
- **S0447L01U03** DELETE — was: do you want to have a meal? | ¿quieres tener una comida?  
  '¿quieres tener una comida?' is a calque of 'have a meal'; the natural 'comer' drops the LEGO 'comida'. *(K16,P17)*
- **S0447L01U06** DELETE — was: I want to have a meal with them | quiero tener una comida con ellos  
  'tener una comida con ellos' is a calque; 'comer con ellos' drops the LEGO. *(K16,P17)*

## Seed 450
- **S0450L02B03** the fact that they have to | que ellos tienen que  
  → **that they have to | que ellos tienen que**  
  'the fact that' had no Spanish counterpart. *(K9)*

## Seed 455
- **S0455L03U02** I knew we had to leave | sabía que tuvimos que irnos  
  → **I know we had to leave | sé que tuvimos que irnos**  
  After a past frame ('estaba seguro de que', 'sabía que') Spanish backshifts the verb; the present here clashes with the English past. The past form is untaught here, so the frame moves to the present on both sides. *(K16,K14)*

## Seed 456
- **S0456L01U05** I think this is not very probable | creo que no es muy probable  
  → **I think it is not very probable | creo que no es muy probable**  
  'this' had no Spanish counterpart. *(K9)*
- **S0456L01U06** is this thing probable? | ¿es probable esto?  
  → **is this probable? | ¿es probable esto?**  
  'this thing' had no counterpart for 'thing'. *(K9)*
- **S0456L02U04** DELETE — was: do you know if he might be there? | ¿sabes si puede que esté allí?  
  '¿sabes si puede que esté allí?' embeds a subjunctive trigger under 'si', which natives avoid; 'podría estar' would break the LEGO. *(K16,P17)*
- **S0456L02U05** I knew he might be there | sabía que puede que esté allí  
  → **I know he might be there | sé que puede que esté allí**  
  After a past frame ('estaba seguro de que', 'sabía que') Spanish backshifts the verb; the present here clashes with the English past. The past form is untaught here, so the frame moves to the present on both sides. *(K16,K14 · knock-on of S0425L01U04)*

## Seed 460
- **S0460L02B04** I want to stay at the hotel | quiero estar en el hotel  
  → **I want to be at the hotel | quiero estar en el hotel**  
  'estar en el hotel' is 'be at', not 'stay at' (lodge). *(K9)*

## Seed 462
- **S0462L01U03** DELETE — was: I want to tell you about my grandfather | quiero decirte de mi abuelo  
  'decirte de mi abuelo' is a calque of 'tell you about'; 'hablarte de' is untaught. *(K16,P1)*
- **S0462L03U01** during the war it was not easy | era difícil durante la guerra  
  → **it was difficult during the war | era difícil durante la guerra**  
  The English was negated ('not easy'), the Spanish affirmative ('difícil'). *(K9)*
- **S0462L03U03** DELETE — was: do you know about during the war? | ¿sabes de durante la guerra?  
  'sabes de durante la guerra' is ungrammatical on both sides; 'lo que pasó' is untaught here. *(K16)*

## Seed 464
- **S0464L02B02** I told her about it | le dije de eso  
  → **I told her that | le dije eso**  
  'decir de eso' is a calque of 'tell about'. *(K16)*
- **S0464L02U04** I told her about the hotel | le dije del hotel  
  → **I told her something about the hotel | le dije algo del hotel**  
  'decir del hotel' is a calque; 'decir algo de' is natural. *(K16)*
- **S0464L02U05** I told her about my grandfather | le dije de mi abuelo  
  → **I told her something about my grandfather | le dije algo de mi abuelo**  
  As U04. *(K16)*
- **S0464L02U06** I told her about the war | le dije de la guerra  
  → **I told her something about the war | le dije algo de la guerra**  
  As U04. *(K16)*

## Seed 465
- **S0465L01B02** looking forward to next time | esperar la próxima vez  
  → **waiting for next time | esperar la próxima vez**  
  'esperar la próxima vez' is 'wait for'; 'looking forward to' is something else. *(K9)*
- **S0465L02B03** I will ask her about | le preguntaré de  
  → **I will ask her about | le preguntaré sobre**  
  'preguntar de' is the wrong preposition; 'preguntar sobre'. *(K16)*
- **S0465L02B04** I will ask her about the room | le preguntaré de la habitación  
  → **I will ask her about the room | le preguntaré sobre la habitación**  
  As B03. *(K16)*
- **S0465L02U02** I will ask her about my room | le preguntaré de mi habitación  
  → **I will ask her about my room | le preguntaré sobre mi habitación**  
  As B03. *(K16)*
- **S0465L02U05** I will ask her about my grandfather | le preguntaré de mi abuelo  
  → **I will ask her about my grandfather | le preguntaré sobre mi abuelo**  
  As B03. *(K16)*
- **S0465L02U06** I will ask her about the war | le preguntaré de la guerra  
  → **I will ask her about the war | le preguntaré sobre la guerra**  
  As B03. *(K16)*

## Seed 466
- **S0466L01U05** let me think about it | déjame pensar en esto  
  → **let me think about this | déjame pensar en esto**  
  'esto' is 'this' in this course; 'pensarlo' would need an untaught enclitic. *(K14)*

## Seed 467
- **S0467L01U01** she is right next to it | ella está al lado de esto  
  → **she is next to this | ella está al lado de esto**  
  'right' and 'it' had no counterpart; 'esto' = this. *(K9)*
- **S0467L01U02** he was right next to her | él estaba al lado de ella  
  → **he was next to her | él estaba al lado de ella**  
  'right' had no Spanish counterpart. *(K9)*
- **S0467L01U03** I want to be next to it | quiero estar al lado de esto  
  → **I want to be next to this | quiero estar al lado de esto**  
  'esto' = this. *(K9)*

## Seed 470
- **S0470L03U01** she left before we stop | ella se fue antes de que paremos  
  → **she leaves before we stop | ella se va antes de que paremos**  
  'se fue antes de que paremos' mixes past and present subjunctive; the present frame keeps the LEGO. *(K16,P17)*

## Seed 474
- **S0474L01U02** he doesn't even care | él ni siquiera le importa  
  → **he doesn't even care | a él ni siquiera le importa**  
  'importar' takes an indirect object; 'él … le importa' needs 'a él'. *(K16)*

## Seed 477
- **S0477L01U05** that is so sick | eso es tan enfermo  
  → **he is so sick | está tan enfermo**  
  'eso es tan enfermo' is not natural Spanish and 'that is so sick' is slang. *(K9,K16)*
- **S0477L02U04** it has been a long time | ha estado mucho tiempo  
  → **he has been a long time | ha estado mucho tiempo**  
  'ha estado mucho tiempo' is personal ('he has been … a long time'); the English was the impersonal 'it has been a long time'. *(K9)*
- **S0477L03U01** she knew since the second day | sabía desde el segundo día  
  → **she had known since the second day | sabía desde el segundo día**  
  'since' needs a perfect in English; 'sabía desde' is the Spanish for 'had known since'. *(K9)*
- **S0477L03U03** since the second day it was hard | desde el segundo día ha estado difícil  
  → **since the second day it has been hard | desde el segundo día ha estado difícil**  
  'since' needs the perfect, and the Spanish is 'ha estado'. *(K9)*

## Seed 478
- **S0478L03U03** DELETE — was: what a very kind heart | qué corazón muy bondadoso  
  'qué corazón muy bondadoso' is ungrammatical (exclamative qué + noun cannot take 'muy'); 'tan' would break the LEGO. *(K16,P17)*

## Seed 479
- **S0479L02U02** that was the least I could do | fue lo menos que podría hacer  
  → **it would be the least I could do | sería lo menos que podría hacer**  
  Past 'fue' with the conditional LEGO 'podría' clashes; a conditional frame fits the LEGO. *(K16,P24)*

## Seed 480
- **S0480L01U01** whatever he says, she knows better | diga lo que diga, ella sabe mejor  
  → **whatever he says, she knows better | diga lo que diga, ella lo sabe mejor**  
  'ella sabe mejor' reads as 'she tastes better'; 'lo sabe mejor' is 'knows better'. *(K16)*
- **S0480L01U02** whatever he says is important | diga lo que diga, es importante  
  → **whatever he says, it's important | diga lo que diga, es importante**  
  The English read as 'what he says is important'; the Spanish is 'whatever he says, it's important'. *(K9)*

## Seed 481
- **S0481L02U05** that is the only hope | eso es la única esperanza  
  → **that is the only hope | esa es la única esperanza**  
  Neuter 'eso' cannot be 'la única esperanza'; 'esa' agrees. *(K27)*
- **S0481L03U04** of all, it is the only real hope | de todo, es la única esperanza real  
  → **it is the only real hope | es la única esperanza real**  
  'of all, it is…' / 'de todo, es…' is a broken fragment. *(K9,K16)*

## Seed 486
- **S0486L01U04** they are really gorgeous | de verdad son muy hermosos  
  → **they are really gorgeous | de verdad son hermosos**  
  The extra 'muy' had no English counterpart. *(K9)*

## Seed 488
- **S0488L01B02** on the other side | en el otro lado  
  → **on the other side | al otro lado**  
  The seed says 'al otro lado'; 'en el otro lado' is a calque and gives one English two Spanish. ('al' = a + el, so the LEGO 'el otro lado' is still there.) *(P28,K16 · override: contains_lego via al = a + el)*
- **S0488L01B03** over on the other side | allí en el otro lado  
  → **over on the other side | allí al otro lado**  
  The seed says 'al otro lado'; 'en el otro lado' is a calque and gives one English two Spanish. ('al' = a + el, so the LEGO 'el otro lado' is still there.) *(P28,K16 · override: contains_lego via al = a + el)*
- **S0488L01U01** she is on the other side | ella está en el otro lado  
  → **she is on the other side | ella está al otro lado**  
  The seed says 'al otro lado'; 'en el otro lado' is a calque and gives one English two Spanish. ('al' = a + el, so the LEGO 'el otro lado' is still there.) *(P28,K16 · override: contains_lego via al = a + el)*
- **S0488L01U03** I want to be on the other side | quiero estar en el otro lado  
  → **I want to be on the other side | quiero estar al otro lado**  
  The seed says 'al otro lado'; 'en el otro lado' is a calque and gives one English two Spanish. ('al' = a + el, so the LEGO 'el otro lado' is still there.) *(P28,K16 · override: contains_lego via al = a + el)*
- **S0488L02U04** it is on the other side of that yellow line | está en el otro lado de esa línea amarilla  
  → **it is on the other side of that yellow line | está al otro lado de esa línea amarilla**  
  The seed says 'al otro lado'; 'en el otro lado' is a calque and gives one English two Spanish. *(P28,K16)*
- **S0488L02U05** why is there that yellow line? | ¿por qué hay esa línea amarilla?  
  → **why is that yellow line here? | ¿por qué está aquí esa línea amarilla?**  
  'hay' cannot take a demonstrative ('hay esa línea'). *(K16)*

## Seed 489
- **S0489L01U05** that problem is very strong | ese problema es muy fuerte  
  → **that coffee is very strong | ese café es muy fuerte**  
  A problem is not 'strong' in either language. *(K9,K16)*
- **S0489L02U04** that is strong coffee | ese es un café fuerte  
  → **that is a strong coffee | ese es un café fuerte**  
  The Spanish has 'un café'; the English had no article. *(K9)*
- **S0489L04B02** if you don't make me a coffee | si no me haces el café  
  → **if you don't make me a coffee | si no me haces un café**  
  'a coffee' is 'un café' (as the seed and U02); the row said 'el café'. *(K16)*
- **S0489L04U03** if you don't make me a coffee now | si no me haces el café ahora  
  → **if you don't make me a coffee now | si no me haces un café ahora**  
  As B02. *(K16)*

## Seed 490
- **S0490L03U03** then I will never trust anyone again | entonces nunca volveré a confiar en nadie  
  → **and then I will never trust anyone again | y entonces nunca volveré a confiar en nadie**  
  U03 and U06 had the same Spanish for two Englishes; this basket teaches 'and then = y entonces'. *(K2)*
- **S0490L03U05** then what do you think? | ¿y entonces qué piensas?  
  → **then what do you think? | ¿entonces qué piensas?**  
  The Spanish added 'y' (and) that the English lacked. *(K9)*

## Seed 492
- **S0492L01U04** which one is good? | ¿cuál es bueno?  
  → **which one is the good one? | ¿cuál es el bueno?**  
  '¿cuál es bueno?' with a bare adjective is odd. *(K16)*
- **S0492L01U05** which is the best? | ¿cuál es lo mejor?  
  → **which is the best? | ¿cuál es el mejor?**  
  Neuter 'lo mejor' cannot pick one item from a set; 'el mejor'. *(K16,K27)*
- **S0492L02B02** the best of those places | de esos lugares el mejor  
  → **the best of those places | el mejor de esos lugares**  
  'de esos lugares el mejor' reverses the Spanish order. *(K16)*
- **S0492L02U02** which of those places do you want to go to? | ¿cuál de esos lugares quieres ir?  
  → **which of those places do you want to go to? | ¿a cuál de esos lugares quieres ir?**  
  'ir' needs 'a' before the interrogative. *(K16)*
- **S0492L02U04** which of those places is the best? | ¿cuál de esos lugares es lo mejor?  
  → **which of those places is the best? | ¿cuál de esos lugares es el mejor?**  
  'lo mejor' does not agree with 'lugares'. *(K27)*
- **S0492L04U05** I think this is the most interesting | creo que esto es el más interesante  
  → **I think this is the most interesting | creo que este es el más interesante**  
  Neuter 'esto' cannot take 'el más interesante'. *(K27)*

## Seed 494
- **S0494L03U03** the show is the best | el espectáculo es lo mejor  
  → **the show is the best | el espectáculo es el mejor**  
  Neuter 'lo mejor' does not agree with 'espectáculo'. *(K27)*

## Seed 495
- **S0495L01U06** it is better to do it when you are ready | es mejor hacerlo cuando estás listo  
  → **it is better to do it when you are ready | es mejor hacerlo cuando estés listo**  
  'cuando' about a future time takes the subjunctive. *(K16)*
- **S0495L02U05** it matters very much | importa mucho de verdad  
  → **it matters very much | importa mucho**  
  'de verdad' had no English counterpart. *(K9)*

## Seed 497
- **S0497L02U05** DELETE — was: you didn't tell me you needed to sleep | no me dijiste que necesitaras dormir  
  The row never held its LEGO 'como si necesitaras' (P17), and 'no me dijiste que necesitaras' is wrong; the indicative fix still lacks the LEGO. *(P17,K16)*

## Seed 498
- **S0498L01B03** DELETE — was: standing very good | está de pie muy bien  
  'standing very good' / 'está de pie muy bien' is not a sentence either side. *(K9,K16)*
- **S0498L04B03** standing inside the entrance | está de pie dentro de la entrada  
  → **he's standing inside the entrance | está de pie dentro de la entrada**  
  'está de pie' is finite; the English was a bare participle. *(K9)*
- **S0498L04U05** he is standing right inside the entrance | está de pie allí dentro de la entrada  
  → **he is standing over there inside the entrance | está de pie allí dentro de la entrada**  
  The Spanish has 'allí'; the English had 'right' instead. *(K9)*

## Seed 499
- **S0499L03B03** maybe open the door | quizás abrir la puerta  
  → **maybe we should open the door | quizás deberíamos abrir la puerta**  
  'quizás' cannot take a bare infinitive. *(K16)*

## Seed 502
- **S0502L03U02** I want to practise speaking instead of writing | quiero practicar hablar en vez de escribir  
  → **I want to practise speaking instead of writing | quiero practicar hablando en vez de escribir**  
  'practicar hablar' stacks infinitives; course pattern is 'practicar hablando'. *(K16 · knock-on of S0206L02U02)*

## Seed 503
- **S0503L03U03** I don't want trouble but that is mine | no quiero causar problemas pero ese es mío  
  → **I don't want to cause problems but that one's mine | no quiero causar problemas pero ese es mío**  
  The Spanish has 'causar problemas' and the LEGO is 'that one's mine'; the English had neither. *(K9,P17)*

## Seed 504
- **S0504L03U05** DELETE — was: across the grass is nice | por la hierba está bien  
  'across the grass is nice' is a fragment and 'está bien' is 'fine', not 'nice'. *(K9,P7)*

## Seed 506
- **S0506L01U04** I lived in a good place | vivía en un lugar bueno  
  → **I lived in a good place | vivía en un buen lugar**  
  'un lugar bueno' is stiff; 'un buen lugar'. *(K16)*
- **S0506L02B02** I lived around here long ago | vivía por aquí mucho antes  
  → **I lived around here long ago | vivía por aquí hace mucho**  
  'mucho antes' needs a reference point; 'long ago' is 'hace mucho'. *(K16)*
- **S0506L03B03** DELETE — was: truly years ago | hace años de verdad  
  'truly years ago' is not English. *(K9)*
- **S0506L04B03** well before we moved | bien antes de que nos mudáramos  
  → **well before we moved | mucho antes de que nos mudáramos**  
  'bien antes de que' is a calque of 'well before'. *(K16)*

## Seed 508
- **S0508L01U05** that doesn't make any sense now | eso no tiene mucho sentido ahora  
  → **that doesn't make much sense now | eso no tiene mucho sentido ahora**  
  'no tiene mucho sentido' is 'not much sense'. *(K9)*

## Seed 510
- **S0510L02B02** she went to look for somewhere safe here | se ha ido a buscar un lugar seguro aquí  
  → **she's gone to look for somewhere safe here | se ha ido a buscar un lugar seguro aquí**  
  The Spanish is 'se ha ido' (she's gone); the English said 'she went'. *(K9)*
- **S0510L02B03** she went to look for a safe place for this | se ha ido a buscar un lugar seguro para esto  
  → **she's gone to look for a safe place for this | se ha ido a buscar un lugar seguro para esto**  
  As B02. *(K9)*
- **S0510L03B03** she went somewhere to park the car | se ha ido a un lugar para aparcar el coche  
  → **she's gone somewhere to park the car | se ha ido a un lugar para aparcar el coche**  
  As B02. *(K9)*

## Seed 511
- **S0511L01U04** the news is the best | la noticia es lo mejor  
  → **the news is the best thing | la noticia es lo mejor**  
  'lo mejor' is 'the best thing'. *(K9)*

## Seed 512
- **S0512L02B02** DELETE — was: so that the door open | para que la puerta abierta  
  'so that the door open' has no verb on either side. *(K9,K16)*
- **S0512L03B03** while I fetch the keys a moment | mientras busco las llaves un momento  
  → **while I fetch the keys for a moment | mientras busco las llaves un momento**  
  'fetch the keys a moment' needs 'for'. *(K9)*

## Seed 513
- **S0513L04U01** everything important is up there | todo lo importante está arriba  
  → **everything important is up there | todo lo importante está allí arriba**  
  'up there' needs 'allí' (taught S0498). *(K9)*
- **S0513L04U03** what's up there? | ¿qué hay arriba?  
  → **what's up there? | ¿qué hay allí arriba?**  
  As U01. *(K9)*
- **S0513L05U03** what's down there? | ¿qué hay abajo?  
  → **what's down there? | ¿qué hay allí abajo?**  
  As U01. *(K9)*

## Seed 514
- **S0514L01B03** I found it there | encontré eso allí  
  → **I found it there | lo encontré allí**  
  'it' is 'lo' (B01 says 'lo encontré'); 'eso' is 'that'. *(Kai 30 Oct object rule)*
- **S0514L01U05** I found it at last | lo encontré al final  
  → **I found it in the end | lo encontré al final**  
  'al final' = 'in the end'; 'at last' is 'por fin'. *(K9)*
- **S0514L02U05** DELETE — was: the perfect house at last | la casa perfecta al final  
  A fragment as a USE row, and 'al final' is not 'at last'. *(P7)*

## Seed 515
- **S0515L01B04** DELETE — was: on the first day of all, good | el primer día del todo, bien  
  A padding build/use row: a LEGO plus a stray tag ('here, good', 'before, no', 'at the end') that is not a sentence in either language. *(K9,K16)*
- **S0515L02B02** a good example of the new year | un buen ejemplo de año nuevo  
  → **a good example of the new year | un buen ejemplo del año nuevo**  
  'the new year' needs 'del año nuevo'. *(K16)*
- **S0515L02B03** a good new year | un año nuevo bueno  
  → **a good new year | un buen año nuevo**  
  'un año nuevo bueno' is stiff. *(K16)*

## Seed 516
- **S0516L02U04** they came on their own at last | vinieron solos al final  
  → **they came on their own in the end | vinieron solos al final**  
  'al final' = 'in the end'. *(K9)*

## Seed 518
- **S0518L01U05** DELETE — was: I couldn't imagine myself a long time ago | no podía imaginarme hace mucho tiempo  
  'imagine myself a long time ago' is garbled. *(K9)*
- **S0518L02U01** I couldn't imagine having exactly this | no podía imaginarme teniendo exactamente esto  
  → **I couldn't imagine myself having exactly this | no podía imaginarme teniendo exactamente esto**  
  The Spanish 'imaginarme' carries 'myself'. *(K9)*

## Seed 519
- **S0519L02U05** DELETE — was: I haven't seen anything in the end | no he visto nada al final  
  'I haven't seen anything in the end' is not a natural sentence. *(K9)*

## Seed 520
- **S0520L02B04** DELETE — was: to the whole family before, no | a toda la familia antes, no  
  A padding build/use row: a LEGO plus a stray tag ('here, good', 'before, no', 'at the end') that is not a sentence in either language. *(K9)*

## Seed 521
- **S0521L02B03** DELETE — was: you'll forget why here, yes | olvidarás por qué aquí, sí  
  A padding build/use row: a LEGO plus a stray tag ('here, good', 'before, no', 'at the end') that is not a sentence in either language. *(K9)*

## Seed 522
- **S0522L02U05** it was stupid at the end | fue estúpido al final  
  → **it was stupid in the end | fue estúpido al final**  
  'al final' = 'in the end'. *(K9)*
- **S0522L03B03** to tell the truth even if it hurts | decir la verdad aunque duele  
  → **to tell the truth even though it hurts | decir la verdad aunque duele**  
  'aunque duele' is 'even though it hurts' (fact); 'even if' would need the untaught 'duela'. *(K14)*

## Seed 524
- **S0524L02U03** DELETE — was: in three or four minutes at the end | en tres o cuatro minutos al final  
  A padding build/use row: a LEGO plus a stray tag ('here, good', 'before, no', 'at the end') that is not a sentence in either language. *(K9)*

## Seed 525
- **S0525L01U01** to check if it was here | para comprobar si fue aquí  
  → **to check if it happened here | para comprobar si fue aquí**  
  'fue aquí' = 'it happened here'; the location reading needs untaught 'estuvo'. *(K14)*
- **S0525L01U03** to check if it was before | para comprobar si fue antes  
  → **to check if it happened before | para comprobar si fue antes**  
  'fue antes' = 'happened before'. *(K9)*
- **S0525L02B03** she said to him you've been able to finish before Thursday | ella le dijo a él has podido terminar antes del jueves  
  → **she told him that you've been able to finish before Thursday | ella le dijo que has podido terminar antes del jueves**  
  Reported speech with no 'que'. *(K16)*
- **S0525L02B04** I'm sure that you've been able to finish it directly | estoy seguro de que has podido terminar directamente  
  → **I'm sure that you've been able to finish directly | estoy seguro de que has podido terminar directamente**  
  The English had 'it'; the Spanish no object. *(Kai 30 Oct object rule)*

## Seed 527
- **S0527L01B02** DELETE — was: guess here, good | adivina aquí, bien  
  A padding build/use row: a LEGO plus a stray tag ('here, good', 'before, no', 'at the end') that is not a sentence in either language. *(K9)*
- **S0527L03B04** DELETE — was: that funny story before, no | esa historia graciosa antes, no  
  A padding build/use row: a LEGO plus a stray tag ('here, good', 'before, no', 'at the end') that is not a sentence in either language. *(K9)*

## Seed 531
- **S0531L01U03** it isn't true that just anyone can do it | no es verdad que cualquiera pueda hacerlo  
  → **it isn't true that anyone can do it | no es verdad que cualquiera pueda hacerlo**  
  'just' had no Spanish counterpart. *(K9)*
- **S0531L02U01** it isn't true that just anyone can win the game | no es verdad que cualquiera pueda ganar el juego  
  → **it isn't true that anyone can win the game | no es verdad que cualquiera pueda ganar el juego**  
  'just' had no counterpart, and U06 already has this Spanish for 'anyone'. *(K2,K9)*

## Seed 532
- **S0532L02B03** DELETE — was: they thought that they're lucky | pensaban que tenían suerte  
  The row never held its LEGO 'tengan suerte', and its English was ungrammatical. *(P17,K9)*

## Seed 534
- **S0534L01U04** let's not go outside for everything | no salgamos fuera para todo  
  → **let's not go outside for anything | no salgamos fuera por nada**  
  'for everything / para todo' means nothing here. *(K9,K16)*

## Seed 535
- **S0535L01U01** DELETE — was: he made a promise that it was here | hizo la promesa de que fue aquí  
  A promise about the past; 'estaría' is untaught and 'sería aquí' would be wrong for a location. *(K9,K16)*
- **S0535L01U02** he made a promise that it was good | hizo la promesa de que fue bueno  
  → **he made a promise that it would be good | hizo la promesa de que sería bueno**  
  A promise points forward; a promise that something already was is nonsense in both languages. *(K9,K16)*
- **S0535L01U03** she made a promise that it was before | hizo la promesa de que fue antes  
  → **she made a promise that it would be before | hizo la promesa de que sería antes**  
  A promise points forward; a promise that something already was is nonsense in both languages. *(K9,K16)*
- **S0535L01U04** she made a promise that it was yesterday | hizo la promesa de que fue ayer  
  → **she made a promise that it would be tomorrow | hizo la promesa de que sería mañana**  
  A promise points forward; a promise that something already was is nonsense in both languages. *(K9,K16)*
- **S0535L01U05** he made a promise that everything went well | hizo la promesa de que todo fue bien  
  → **he made a promise that everything would be good | hizo la promesa de que todo sería bueno**  
  A promise points forward; 'iría' is untaught so 'sería bueno' carries it. *(K9,K16)*
- **S0535L02B04** DELETE — was: he wouldn't choose before, would he? | no elegiría antes, ¿no?  
  A padding build/use row: a LEGO plus a stray tag ('here, good', 'before, no', 'at the end') that is not a sentence in either language. *(K9)*
- **S0535L03B02** DELETE — was: she got lost near the wrong job | se perdió cerca del trabajo equivocado  
  'got lost near the wrong job' is nonsense. *(K9)*

## Seed 536
- **S0536L01U03** I used to think that it was a problem | antes pensaba que fue un problema  
  → **I used to think that it was a problem | antes pensaba que era un problema**  
  A state after 'pensaba que' takes 'era'. *(K16 · same defect also in S0536L01U04, S0536L01U05)*
- **S0536L01U04** I used to think that everything went well | antes pensaba que todo fue bien  
  → **I used to think that everything went well | antes pensaba que todo iba bien**  
  A state after 'pensaba que' takes the imperfect. *(K16 · knock-on of S0536L01U03)*
- **S0536L01U05** DELETE — was: I used to think that it was yesterday | antes pensaba que fue ayer  
  'I used to think that it was yesterday' means nothing. *(K9 · knock-on of S0536L01U03)*

## Seed 537
- **S0537L01U04** but I was wrong about everything | pero estaba equivocado sobre todo  
  → **but I was wrong about everything | pero estaba equivocado en todo**  
  'sobre todo' means 'above all'. *(K16)*

## Seed 539
- **S0539L01B04** DELETE — was: but it's getting late until they are ready | pero se está haciendo tarde hasta que estén listos  
  'it's getting late until they are ready' is incoherent. *(K9)*

## Seed 540
- **S0540L01B04** DELETE — was: I don't mind if before you go | no me importa si antes de que te vayas  
  'if before you go' is a fragment on both sides. *(K9)*

## Seed 542
- **S0542L01U01** whenever you feel like it | siempre que te sientas así  
  → **whenever you feel this way | siempre que te sientas así**  
  'te sientas así' = 'feel this way', not 'feel like it'. *(K9)*

## Seed 544
- **S0544L01B03** DELETE — was: whoever said here, good | quien dijo aquí, bien  
  A padding build/use row: a LEGO plus a stray tag ('here, good', 'before, no', 'at the end') that is not a sentence in either language. *(K9)*
- **S0544L01B04** DELETE — was: whoever said before, no | quien dijo antes, no  
  A padding build/use row: a LEGO plus a stray tag ('here, good', 'before, no', 'at the end') that is not a sentence in either language. *(K9)*

## Seed 547
- **S0547L02B03** DELETE — was: to fall in the mud | caernos en el barro  
  The Spanish 'caernos' carries 'us' with no English counterpart, and no taught frame ('podemos', 'vamos') can supply it here. *(K26,P1)*

## Seed 548
- **S0548L01B04** since the second day I am feeling sad | desde el segundo día me siento triste  
  → **since the second day I have been feeling sad | desde el segundo día me siento triste**  
  'since … I am feeling' is not English; it needs 'I have been feeling'. The Spanish present is right. *(K9)*

## Seed 549
- **S0549L01U04** because I have got to be here yesterday | porque tengo que estar aquí ayer  
  → **because I have got to be here tomorrow | porque tengo que estar aquí mañana**  
  'have got to be here yesterday' is a contradiction on both sides. *(K9,K16)*

## Seed 552
- **S0552L01U01** I lived at the other end of the village years ago | vivía en el otro extremo del pueblo hace años  
  → **I lived at the other end of the village years ago | vivía al otro extremo del pueblo hace años**  
  The LEGO is 'al otro extremo'; this row says 'en el otro extremo', so it does not hold its LEGO and teaches two Spanish for one English. *(P17,P28)*
- **S0552L01U03** she's gone to look for somewhere safe to park the car at the other end of the village | se ha ido a buscar un lugar seguro para aparcar el coche en el otro extremo del pueblo  
  → **she's gone to look for somewhere safe to park the car at the other end of the village | se ha ido a buscar un lugar seguro para aparcar el coche al otro extremo del pueblo**  
  As U01: the LEGO form is al otro extremo. *(P17,P28)*
- **S0552L01U04** I found the perfect house at the other end of the village | encontré la casa perfecta en el otro extremo del pueblo  
  → **I found the perfect house at the other end of the village | encontré la casa perfecta al otro extremo del pueblo**  
  As U01: the LEGO form is al otro extremo. *(P17,P28)*

## Seed 554
- **S0554L01B02** we need this towel isn't dry | necesitamos esta toalla no está seca  
  → **I know this towel isn't dry | sé que esta toalla no está seca**  
  'we need this towel isn't dry' is two sentences jammed together, ungrammatical on both sides. *(K9,K16,P20)*
- **S0554L01B03** I told her this towel isn't dry | le dije esta toalla no está seca  
  → **I told her this towel isn't dry | le dije que esta toalla no está seca**  
  Reported speech after 'le dije' needs 'que' in Spanish. *(K16)*
- **S0554L01B04** she said this towel isn't dry near the entrance | dijo esta toalla no está seca cerca de la entrada  
  → **she said that this towel isn't dry | dijo que esta toalla no está seca**  
  Reported speech needs 'que'; 'near the entrance' hung off the wrong clause. *(K16)*

## Seed 556
- **S0556L01B03** they play music while walking towards the post office | ponen música mientras caminando hacia la oficina de correos  
  → **they play music walking towards the post office | ponen música caminando hacia la oficina de correos**  
  'mientras caminando' is not Spanish; dropping mientras leaves a correct adverbial gerund ('caminan' is untaught). *(K16)*

## Seed 557
- **S0557L01B03** I wish they were ready soon | ojalá estén listos pronto  
  → **I wish I could be ready soon | ojalá pudiera estar listo pronto**  
  'I wish they were ready' needs the past subjunctive 'estuvieran', untaught; 'pudiera' is the form this basket already drills. *(K16,K14)*
- **S0557L03B02** she was right that they wouldn't play such loud music | ella tenía razón que no pusieran música tan alta  
  → **she was right that they wouldn't play such loud music | ella tenía razón en que no pusieran música tan alta**  
  'tener razón' takes 'en que' before a clause. *(K16)*
- **S0557L03B03** DELETE — was: I love that they wouldn't play such loud music | me encanta que no pusieran música tan alta  
  'me encanta que no pusieran' mixes present and past subjunctive; the past fix 'me encantó' is untaught. *(K16,P1)*

## Seed 558
- **S0558L01B02** it's so late at night and they wouldn't play such loud music | es tan tarde por la noche y no pusieran música tan alta  
  → **I wish they wouldn't play such loud music, it's so late at night | ojalá no pusieran música tan alta, es tan tarde por la noche**  
  'y no pusieran' with no trigger is ungrammatical; the subjunctive needs ojalá, taught at S0557. *(K16)*
- **S0558L01B03** I wish it's so late at night before we stop | ojalá es tan tarde por la noche antes de que paremos  
  → **it's so late at night and we have to stop | es tan tarde por la noche y tenemos que parar**  
  'ojalá es…' is ungrammatical (ojalá needs the subjunctive) and the English 'I wish it's so late… before we stop' is nonsense. *(K9,K16)*

## Seed 559
- **S0559L01U05** have you found it yesterday? | ¿has encontrado eso ayer?  
  → **have you found that today? | ¿has encontrado eso hoy?**  
  Present perfect with 'yesterday' is wrong in both languages; 'eso' is 'that' in this course. *(K9,K16)*
- **S0559L02U04** have you found the path through the wood yesterday? | ¿has encontrado el camino por el bosque ayer?  
  → **have you found the path through the wood today? | ¿has encontrado el camino por el bosque hoy?**  
  Present perfect with 'yesterday' is wrong in both languages. *(K9,K16)*

## Seed 561
- **S0561L02B04** we'd like it's a fast car | nos gustaría es un coche rápido  
  → **I think it's a fast car | creo que es un coche rápido**  
  'we'd like it's a fast car' is two clauses jammed together on both sides. *(K9,K16)*

## Seed 562
- **S0562L02U04** I want to get there yesterday | quiero llegar allí ayer  
  → **I want to get there tomorrow | quiero llegar allí mañana**  
  'want to get there yesterday' is nonsense taken literally ('ayer'). *(K9,K16)*

## Seed 563
- **S0563L01B03** I wouldn't have been able to remain quiet | no habría podido quedarnos callados  
  → **I wouldn't have been able to remain quiet | no habría podido quedarme callado**  
  English says 'I' but the Spanish says 'quedarnos callados' (we). *(K26)*
- **S0563L01U07** I wouldn't have been able to in this dreadful weather | no habría podido con este tiempo horrible  
  → **I wouldn't have been able to go out in this dreadful weather | no habría podido salir con este tiempo horrible**  
  'poder con' means 'cope with'; the English has no verb. Supplying 'go out' gives one clear meaning. *(K9,K16)*

## Seed 565
- **S0565L01U02** if it made sense I'd have thought about it | si hubiera tenido sentido lo habría pensado  
  → **if it had made sense I'd have thought about it | si hubiera tenido sentido lo habría pensado**  
  The Spanish is past-unreal ('si hubiera tenido sentido'); the English said 'if it made sense'. *(K9)*
- **S0565L02B03** to try and breathe slowly, more carefully | intentar respirar despacio, con más cuidado  
  → **to try and breathe more carefully | intentar respirar con más cuidado**  
  'slowly, more carefully' is two stitched fragments. *(K9)*

## Seed 566
- **S0566L01B03** I'd have thought more because he has been playing in the mud | habría pensado más porque ha estado jugando en el barro  
  → **I'd have thought more because it's very important | habría pensado más porque es muy importante**  
  'because he has been playing in the mud' gives no reason for thinking more; a nonsense splice. *(K9)*
- **S0566L02U05** if it had been my choice for everyone | si hubiera sido mi decisión para todos  
  → **if it had been my choice I'd have thought more | si hubiera sido mi decisión habría pensado más**  
  A dangling if-clause is a fragment, never allowed as a USE phrase; the main clause comes from the seed. *(P7)*

## Seed 567
- **S0567L01U05** it's been lovely with everything | ha sido encantador con todo  
  → **it's been lovely to see you | ha sido encantador verte**  
  'lovely with everything' means nothing in either language. *(K9,K16)*
- **S0567L02B02** we'd like spending time outdoors as much as possible | nos gustaría pasar tiempo al aire libre lo máximo posible  
  → **we like spending time outdoors as much as possible | nos gusta pasar tiempo al aire libre lo máximo posible**  
  'we'd like spending' is not English; 'we like spending' keeps the LEGO's English. *(K9,P17)*

## Seed 568
- **S0568L04B02** I'm sure that we meet before Thursday | estoy seguro de que nos veamos antes del jueves  
  → **it's important that we meet before Thursday | es importante que nos veamos antes del jueves**  
  'estoy seguro de que' takes the indicative, but the LEGO is the subjunctive 'que nos veamos', so the row must supply a subjunctive trigger. *(P24,K16)*

## Seed 573
- **S0573L01U04** it's the kind of thing that you need to think about | es el tipo de cosa que necesitas pensar  
  → **it's the kind of thing that you need to know | es el tipo de cosa que necesitas saber**  
  'necesitas pensar' drops the 'en' that 'think about' needs; 'saber' keeps it simple and taught. *(K16)*
- **S0573L01U07** the kind of thing that you can't guess | el tipo de cosa que no puedas adivinar  
  → **the kind of thing that you can't guess | el tipo de cosa que no puedes adivinar**  
  A real, general statement takes the indicative here; the subjunctive reads as hypothetical. *(K16)*

## Seed 579
- **S0579L01U03** do you think we've tried enough? | ¿crees que lo hemos intentado suficiente?  
  → **do you think we've tried enough? | ¿crees que lo hemos intentado lo suficiente?**  
  'suficiente' cannot be an adverb after the verb; 'lo suficiente' is needed. *(K16)*
- **S0579L02U06** DELETE — was: we've often tried | lo hemos intentado muchas veces  
  'we've often tried' drops the 'it' the Spanish carries, and the Spanish is identical to B03's, so one Spanish answers two prompts; B03 already drills it. *(K2,Kai 30 Oct object rule)*

## Seed 584
- **S0584L01B01** to wake up oneself | despertarse  
  → **to wake up early | despertarse temprano**  
  'to wake up oneself' is not English. *(K9,P3)*
- **S0584L02U05** it was lovely waking up every morning during the holidays | ha sido encantador despertarse cada mañana durante las vacaciones  
  → **it's been lovely waking up every morning during the holidays | ha sido encantador despertarse cada mañana durante las vacaciones**  
  LEGO S0567L01 teaches 'it's been lovely | ha sido encantador'; the English said 'it was lovely'. *(P28)*
- **S0584L03U03** it was lovely to wake up and see the mountains | ha sido encantador despertarse y ver las montañas  
  → **it's been lovely to wake up and see the mountains | ha sido encantador despertarse y ver las montañas**  
  As S0584L02U05. *(P28)*

## Seed 587
- **S0587L01U06** DELETE — was: she used to insist as though I don't care | ella insistía como si no me importara  
  'insist as though I don't care' is a nonsense splice; the only sensible rewrite needs 'en que comiéramos', not taught until the next LEGO. *(K9,P1)*
- **S0587L02U03** she used to insist that we had it together | ella insistía en que comiéramos juntos  
  → **she used to insist that we had it together | ella insistía en que lo comiéramos juntos**  
  The English has 'it' ('had it together'); the Spanish had no object. The proclitic 'lo' is taught. *(Kai 30 Oct object rule)*

## Seed 589
- **S0589L01U02** she told me she'd seen it | me dijo que lo vio  
  → **she told me she saw it | me dijo que lo vio**  
  'she'd seen it' is pluperfect; the Spanish 'lo vio' is preterite. Moving the English avoids an untaught 'había visto'. *(K14)*
- **S0589L01U06** she told me she won't listen | me dijo que ella no va a escuchar  
  → **she told me she isn't going to listen | me dijo que ella no va a escuchar**  
  'won't listen' is a refusal; 'no va a escuchar' is 'isn't going to listen'. *(K9)*

## Seed 591
- **S0591L01U05** DELETE — was: she was still doing it | siguió haciendo eso  
  The LEGO is 'she followed | siguió', but this row uses siguió as 'carried on', a different sense the English 'she was still doing it' does not match either. *(K23)*

## Seed 597
- **S0597L01U06** I suspect they left with each other | sospecho que se fueron juntos  
  → **I suspect they left together | sospecho que se fueron juntos**  
  'left with each other' is not natural English; 'juntos' = together. *(K9)*
- **S0597L01U08** I suspect it might have happened | sospecho que podría haberle pasado  
  → **I suspect it might have happened to him | sospecho que podría haberle pasado**  
  The Spanish 'haberle' carries 'to him/her'; the English lacked it (a Spanish fix would need untaught 'haber'). *(K14)*
- **S0597L03U04** I had to listen to all those hundred stories | tenía que escuchar todas esas cien historias  
  → **I had to listen to those hundred stories | tenía que escuchar esas cien historias**  
  'all those hundred stories' / 'todas esas cien' is clumsy on both sides. *(K9,K16)*

## Seed 602
- **S0602L01U04** DELETE — was: she told me about the first place | me dijo del primer lugar  
  'me dijo del primer lugar' is not Spanish for 'told me about'; 'habló' is untaught. *(K16,P1)*

## Seed 603
- **S0603L01U03** DELETE — was: we didn't have anywhere | no teníamos sitio  
  'we didn't have anywhere' is incomplete and 'no teníamos sitio' means 'we had no room'; the seed's 'ningún sitio donde' comes in the next LEGO. *(K9,P1)*
- **S0603L02B03** DELETE — was: no place at all | ningún sitio  
  'no place at all' adds 'at all' to the same Spanish as B01, so one Spanish answers two prompts. *(K2)*

## Seed 608
- **S0608L01U05** DELETE — was: it would have been the right thing | habría sido lo bueno  
  'the right thing' is not 'lo bueno', and the right words ('lo correcto', 'lo sensato') are untaught at this LEGO. *(K16,P1)*

## Seed 610
- **S0610L01U05** I had to look for it | tenía que buscar eso  
  → **I had to look for that | tenía que buscar eso**  
  'eso' is 'that' in this course; 'it' would be the clitic. *(Kai 30 Oct object rule)*

## Seed 614
- **S0614L02U05** do you know near where she lives? | ¿sabes cerca de dónde vive?  
  → **do you know where she lives? | ¿sabes dónde vive?**  
  'do you know near where she lives' is a calque on both sides. *(K9,K16)*

## Seed 616
- **S0616L01U04** it's very brave to say what you think | es muy valiente al decir lo que piensas  
  → **you're very brave to say what you think | eres muy valiente al decir lo que piensas**  
  'es valiente al decir' needs a person as subject; with 'piensas' that person is 'you' (tú). *(K16,K26)*

## Seed 619
- **S0619L01U05** I think we see each other too little | creo que nos vemos muy poco  
  → **I think we see each other very little | creo que nos vemos muy poco**  
  'muy poco' is 'very little', not 'too little'. *(K9)*
- **S0619L01U06** we don't see each other any longer | no nos vemos por más tiempo  
  → **we don't see each other any longer | ya no nos vemos**  
  'por más tiempo' means 'for a longer time'; 'not any longer' is 'ya no'. *(K16)*

## Seed 621
- **S0621L02U05** she told me she didn't want to tell her | me dijo que no quería decirle nada  
  → **she told me she didn't want to tell her anything | me dijo que no quería decirle nada**  
  The Spanish 'nada' (anything) had no English counterpart. *(K9)*

## Seed 623
- **S0623L01U07** DELETE — was: we had tea | teníamos té  
  'we had tea | teníamos té' reads as owning tea; the meal sense is 'tomamos té'. No taught fix. *(K16)*

## Seed 624
- **S0624L01U05** I knew that eso sería genial for her | sabía que eso sería genial para ella  
  → **I knew that would be great for her | sabía que eso sería genial para ella**  
  The English contained untranslated Spanish. *(K9)*

## Seed 628
- **S0628L01U06** she asked me if you like tea | me dijo que quería saber si te gusta el té  
  → **she told me she wanted to know if you like tea | me dijo que quería saber si te gusta el té**  
  The Spanish says 'me dijo que quería saber'; the English said 'she asked me'. *(K9)*

## Seed 630
- **S0630L01U05** I want to take some coffee with me | quiero tomar café para llevar  
  → **I want to have coffee to take away | quiero tomar café para llevar**  
  'tomar café para llevar' is a takeaway coffee; the English said 'take some coffee with me'. *(K9)*

## Seed 636
- **S0636L01U03** I think that that is the sensible one | creo que ese es lo sensato  
  → **I think that that is the sensible one | creo que ese es el sensato**  
  'ese' (that one, masculine) cannot be 'lo sensato' (the neuter 'sensible thing'); the English says 'the sensible one'. *(K16,K27)*
- **S0636L01U04** I think that that is what she wanted | creo que ese es lo que quería  
  → **I think that that is the one she wanted | creo que ese es el que quería**  
  'ese es lo que' mixes masculine and neuter; keeping the LEGO 'ese es' means 'the one'. *(K16,P17)*
- **S0636L01U05** I think that that is the best thing | creo que ese es lo mejor  
  → **I think that that is the best one | creo que ese es el mejor**  
  As U04. *(K16,P17)*
- **S0636L01U07** DELETE — was: I think that that is what she said | creo que ese es lo que dijo  
  'ese es lo que dijo' mixes genders; the only fix keeping the LEGO duplicates U04. *(K16,P17)*

## Seed 638
- **S0638L01U04** I know I should be trying to think | sé que estoy intentando pensar más  
  → **I know I'm trying to think more | sé que estoy intentando pensar más**  
  The English said 'should be trying' with no 'more'; the Spanish is 'estoy intentando pensar más'. *(K9)*

## Seed 639
- **S0639L02U02** I think you're doing very well | creo que lo está haciendo muy bien, usted  
  → **I think you're doing very well | creo que usted lo está haciendo muy bien**  
  A stranded ', usted' at the end; placed as subject it reads naturally and still holds the LEGO. *(K16)*
- **S0639L02U05** DELETE — was: I can help you | puedo ayudar a usted  
  'puedo ayudar a usted' is ungrammatical without the clitic, and 'ayudarle' is not taught until S0645. *(K16,P1)*

## Seed 642
- **S0642L01U03** DELETE — was: can I help you madam? | ¿puedo ayudar a usted, señora?  
  '¿puedo ayudar a usted?' is ungrammatical without the clitic, untaught until S0645. *(K16,P1)*

## Seed 643
- **S0643L01U01** do you want sir? | ¿quiere usted, señor?  
  → **do you want, sir? | ¿quiere usted, señor?**  
  Without the comma the voice reads 'sir' as the object of 'want'. *(K9)*
- **S0643L01U02** do you want madam? | ¿quiere usted, señora?  
  → **do you want, madam? | ¿quiere usted, señora?**  
  As U01. *(K9)*

## Seed 644
- **S0644L01U06** whoever could say that | cualquiera podría decir eso  
  → **anyone could say that | cualquiera podría decir eso**  
  'cualquiera podría' is 'anyone could'; 'whoever could say that' is not a sentence. *(K9)*

## Seed 645
- **S0645L01B03** something I can help with | algo con lo que puedo ayudarle  
  → **something I can help you with | algo con lo que puedo ayudarle**  
  'ayudarle' carries 'you'; the English lacked it. *(Kai 30 Oct object rule)*
- **S0645L01U05** whoever could help you madam | cualquiera podría ayudarle, señora  
  → **anyone could help you, madam | cualquiera podría ayudarle, señora**  
  'cualquiera podría' is 'anyone could'. *(K9)*

## Seed 646
- **S0646L01U05** I think you're doing well madam | creo que está haciendo bien, señora  
  → **I think you're doing well madam | creo que lo está haciendo bien, señora**  
  'doing well' needs 'lo' (course rule, taught S0072). *(P28 · knock-on of S0661L01U02)*

## Seed 647
- **S0647L01U05** I can hear you speak it | puedo escuchar que lo habla  
  → **I can hear that you speak it | puedo escuchar que lo habla**  
  'escuchar que lo habla' is 'hear that you speak it'. *(K9)*

## Seed 661
- **S0661L01U02** I can see you're all doing well | puedo ver que estáis haciendo bien  
  → **I can see you're all doing well | puedo ver que lo estáis haciendo bien**  
  'doing well' needs 'lo' (course rule; B03 already has it). *(P28 · same defect also in S0646L01U05)*

## Seed 662
- **S0662L01U03** I can hear you all speak it | puedo escuchar que lo habláis  
  → **I can hear that you all speak it | puedo escuchar que lo habláis**  
  'escuchar que lo habláis' is 'hear that you speak it'. *(K9)*

## Seed 663
- **S0663L01U05** can you repeat what you all said? | ¿podéis decirme lo que dijisteis?  
  → **can you tell me what you all said? | ¿podéis decirme lo que dijisteis?**  
  'decirme' is 'tell me', not 'repeat'. *(K9)*

## Seed 664
- **S0664L01U04** you're already all ready to start | ya estáis listos para empezar  
  → **you're all ready to start already | ya estáis listos para empezar**  
  'already all ready' is a clumsy stack. *(K9)*

## Seed 667
- **S0667L01B03** does it really matter to you all | os importa mucho  
  → **does it matter a lot to you all | os importa mucho**  
  'mucho' is 'a lot'; U05 renders 'really' as 'de verdad', so one English had two Spanish. *(K2,K9)*
