# Easy/Fast cap as known-language word count

Read-only live-DB check, seeds 1-250, `course_practice_phrases` (BUILD+USE only, components excluded — they never play as standalone rounds). Word count = `known_text` split on whitespace.

One course per known-language: **fra_for_eng** (eng-known, 6,133 phrases), **eng_for_spa** (spa-known, 4,394 phrases), **eng_for_ita** (ita-known, 4,381 phrases).

## % of phrases excluded at each cap

| Course | known-lang | cap 10 | cap 12 | cap 15 |
|---|---|---|---|---|
| fra_for_eng | eng | 6.0% | 1.5% | 0.1% |
| eng_for_spa | spa | 1.8% | 0.2% | 0.0% |
| eng_for_ita | ita | 10.3% | 2.7% | 0.3% |

ita-known runs hottest at every cap; spa-known is the coolest by a wide margin.

## Boundary examples

### fra_for_eng (eng-known)
**9-11 words**
- I believe this work is changing how I think (9)
- I'm definitely doing something new when we learn together (9)
- if I asked you to help me, what would you do? (11)
- I'd like to be able to speak a little French today (11)

**11-13 words**
- your father can tell me something else about my brother tomorrow (11)
- she said that she watched the football yesterday with her friend (11)

**14-16 words**
- she wanted me to speak with someone who said that he can help you (14)
- I know a young man who wants to work with you if you have time (15)
- I met someone last night who said that he wanted to learn French with me (15)

### eng_for_spa (spa-known)
**9-11 words**
- me gustaría explicar lo que quiero decir después de hablar (10)
- quiero aprender inglés más sin esfuerzo antes de que me vaya (11)
- estoy tratando de aprender cómo hacer lo que tengo que hacer (11)

**11-13 words**
- ¿quieres que te ayude a buscarlo o puedes hacerlo tú mismo? (11)
- conocí a alguien que dijo que iba a intentar hablar con ellos (12)
- ¿vas a empezar a hablar inglés más pronto antes de que me vaya? (13)

**14-16 words**
- lo estoy haciendo mejor que la última vez que hablamos el uno al otro (14)
- voy a empezar a hablar más pronto porque quiero conocer a gente que habla inglés (15)
- él quiere hablar inglés todo el día porque quiere conocer a gente que habla inglés (15)

### eng_for_ita (ita-known)
**9-11 words**
- il mio nome non è molto difficile da ricordare (9)
- mi sono divertito a incontrare qualche amico nel fine settimana (10)
- questa non è la scelta migliore se vuoi avere una conversazione (11)

**11-13 words**
- suo padre ha incontrato qualcuno che poteva aiutare con il problema (11)
- non volevamo lasciare che nessuno sentisse la verità prima di domani (11)
- ecco perché non mi sento come se stessi andando bene oggi (11)

**14-16 words**
- ho guardato un po' di televisione e poi sono uscito a incontrare qualche amico (14)
- lei ha guardato per un po' e poi è uscita a incontrare qualche amico (14)
- ecco perché mi sento come se stessi andando meglio di quando abbiamo parlato l'ultima volta (15)

No further analysis performed — data only, as requested.
