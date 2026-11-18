#!/usr/bin/env python3
"""spa_for_eng #195 wave-1 mismatch rows (job #259, spa leg of #237·AD; Kai approved 4 Nov 12:59Z) — every row read in full
against a LIVE pull. Input: the 188 CONFIRM rows (cause != dropped-object) of
~/ssi-evidence/ssi-dashboard-v7/ops/mismatch-195/findings.jsonl, plus argv[1] = GET /api/production/spa_for_eng/seeds
(4 Nov). 181 rows still read as in the 30-31 Oct snapshot; 7 changed since (#425/#225/#261/#864) — 5 of those already
fixed, 2 (S0189L01U10, S0255L02U16) changed only piensas→crees and still carry the flagged mismatch.
'now' in the generated rows is the LIVE text, so the engine's drift guard is against today, not the snapshot.
Output: tools/course-optimization/spa-mismatch-195-2026-11-04.data.cjs, run by the ita #36 engine with DATA=<that file>.
Rules: English first; taught forms only, checked against the live LEGO/seed list (first taught): cuando aprendemos S0111L04,
estábamos S0118L03, aprendiendo S0021L02, reunirnos S0018L02, buscarlo S0171L02, decirte S0235L02 (so not at 197),
descubrir S0017L02, dinero S0195L02, un rato S0219L04, gran S0272L03 (grande 468), duro S0106L04, tuviera only 387,
tengan only 532, necesitaban/quieran/nuestra/primero/quedarte never, compartir only 593, otro only 488.
Naturalness calls, untaught forms and LEGO re-cuts are HELD.

DROPPED-OBJECT (35 rows, all skipped and HELD): Spanish, like Italian and French, needs the object clitic for a definite
object the English says ('lo dijo', 'lo entiendes', 'hacerlo'), so most rows are real defects — 'dijo hace un momento',
'hagamos aquí', 'podría conseguir como oferta gratis' are broken Spanish. But the fix is the Italian #650 shape: the
course teaches -lo attached from S0146 (arreglarlo) and -la never (#225), proclitic lo/la/les and the indirect me/te/nos/le
each at their own seed, so a clitic fix before its seed is an untaught form and needs the questo/quello-style rewrite.
The class is also MIXED: several rows are natural Spanish with nothing dropped (explicar algo / me siento bien / hacer unas
preguntas leave the indirect object unsaid, as Spanish may). Not sure enough to fix as a class: whole class HELD for Kai."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
FIND = os.path.expanduser('~/ssi-evidence/ssi-dashboard-v7/ops/mismatch-195/findings.jsonl')
E, D, H, K, A = 'edit', 'delete', 'hold', 'keep', 'already'
ALL = "English first: 'para nosotros' is 'for us'"
# id: (action, known | None, target | None, why)
DEC = {
 'S0012L01B01': (A, None, None, "already fixed (#425/#219 intentarlo plan): now 'try something | intentar algo'"),
 'S0017L01B05': (A, None, None, "already fixed: now 'try something | intentar algo'"),
 'S0066L02U07': (K, None, None, "'another person to practise with | para practicar' — Spanish cannot strand 'con'; both sides natural"),
 'S0104L01B04': (A, None, None, "already fixed: now 'try something | intentar algo'"),
 'S0106L01U05': (E, 'I think it is useful to feel happy trying to learn', None, "English first: the gerund 'intentando aprender' has no 'when'"),
 'S0107L02U09': (E, None, 'Queremos ver lo que estás haciendo hablando con otra persona', "'ver lo estás haciendo' is broken Spanish; 'what' is 'lo que' (S0008L02)"),
 'S0110L01B06': (E, 'We are friends who are trying to speak Spanish', 'Somos amigos que estamos intentando hablar español', "neither side matched ('here' | 'personas que') and the build did not hold its LEGO 'we're friends | somos amigos'; estamos intentando from seed 102"),
 'S0115L03U05': (E, "I'm not sure when I'll be ready to have a conversation with other people", None, "English first: 'estaré listo' is 'I'll be ready'"),
 'S0117L02U13': (E, 'I want to practise more to speak better than the last time', 'Quiero practicar más para hablar mejor que la última vez', "'next time' had no Spanish and 'para hacer mejor' lacks its object (hacerlo is untaught at 117); hablar mejor is seed 29's"),
 'S0128L03U03': (K, None, None, "'someone like you to practise with | para practicar' — Spanish cannot strand 'con'; both sides natural"),
 'S0132L04U09': (E, 'She was saying that knowing someone better is very important for learning', None, "English first: 'para aprender' is 'for learning'"),
 'S0132L04U10': (E, 'She was saying that it is important to work hard when something is very difficult', None, "English first: no 'even', and 'es' is 'is'"),
 'S0133L02U09': (E, 'When you work together with someone new you get to know someone in a different way', None, "English first: no 'muy' in 'de manera diferente'"),
 'S0134L01U02': (E, 'I think it is not a problem to make mistakes because that is how we learn', 'Creo que no es un problema cometer errores porque así aprendemos', "cometes/aprendes are untaught; 'así es cómo aprender' is not Spanish; aprendemos is taught (S0111L04)"),
 'S0142L02U09': (E, "that's very kind of you and I'm grateful to you for helping me", None, "English first: 'ayudarme' is 'helping me'; this row is seed 142's own sentence (P26), so the seed's English moves with it (SEED_FIXES)"),
 'S0151L03U14': (E, 'I was hoping something interesting would happen today when we were learning', 'Esperaba que pasara algo interesante hoy cuando estábamos aprendiendo', "'started' had no Spanish and 'cuando aprendemos' clashed in tense with esperaba; estábamos (S0118L03) + aprendiendo (S0021L02)"),
 'S0152L02U14': (E, 'We were trying to do things differently when we were talking', None, "English first: no 'juntos' in the Spanish"),
 'S0152L03U14': (E, 'If I had known that earlier I would have done something different', None, "English first: 'habría hecho' is 'would have done'"),
 'S0153L01U02': (E, 'I think I have said a lot in a short time', None, "English first: 'en poco tiempo' is 'in a short time' (S0245L03)"),
 'S0153L01U04': (E, "I haven't said it well", None, "English first: no 'creo' and no 'muy' in 'No lo he dicho bien'"),
 'S0153L02U08': (E, 'It is exactly the same as what we were talking about', None, "English first: no 'antes' in the Spanish"),
 'S0155L02B02': (E, 'I want to wait a few minutes', None, "English first: 'Quiero esperar' is 'I want to wait'"),
 'S0155L03B05': (E, 'We want to meet in the morning', 'Queremos reunirnos por la mañana', "'Me gustaría ir a reunirse' is broken Spanish (ir a + wrong person); reunirnos is taught (S0018L02), reunirme is not"),
 'S0156L03U12': (E, 'I was thinking it would be good to find a restaurant later on', 'Estaba pensando que sería bueno encontrar un restaurante más tarde', "'antes de tarde' is not Spanish ('antes de que sea tarde' needs untaught sea); más tarde is seed 16's 'later on'"),
 'S0157L01U13': (E, "I want to go there to find my friend's restaurant", 'Quiero ir allí para encontrar el restaurante de mi amigo', "'el restaurante que mi amigo me dijo' is not Spanish for 'told me about' (needs 'del que me habló'); rewritten from taught words"),
 'S0158L02U13': (E, 'There is something else I want to talk to you about before we continue', None, "English first: 'hablar contigo' is 'talk to you', 'seguir' is 'continue' (S0092L01); no 'the rest'"),
 'S0161L03U15': (E, 'That book is what I want to read next month', None, "English first: no 'antes de'"),
 'S0166L03U06': (E, 'I think that my name is not very unusual but it is different here', None, "English first: no 'un poco'"),
 'S0170L02U14': (E, "I think about it a lot and I'd like you to tell me what you need", None, "English first: 'Pienso mucho en eso' is 'I think about it a lot' (think about stays pensar, #864)"),
 'S0173L03U08': (E, 'I think it is good to try things on my own', None, "English first: no 'primero' (primero is untaught)"),
 'S0179L01U03': (E, 'I want to practise Spanish on Sunday afternoon', None, "English first: no 'mi'"),
 'S0179L01U06': (E, 'We want to meet on Sunday afternoon to talk about it', None, "English first: 'Queremos' is 'we want'"),
 'S0179L01U10': (E, 'I want to start on Sunday afternoon because it is better', None, "English first: no 'para mí'"),
 'S0181L02B05': (E, 'My mother is very important', None, "English first: no 'para mí'"),
 'S0182L01B06': (E, 'I need my keys', 'Necesito mis llaves', "'important | muy interesantes' did not match and the build did not hold its LEGO 'my keys | mis llaves'; necesito S0044L02"),
 'S0189L01U02': (E, 'I thought it was a good idea but now I am not very sure about it', None, "English first: no 'at first' in the Spanish"),
 'S0189L01U08': (E, 'She said it was a good idea but I think that I am not so sure about it', 'Ella dijo que era una buena idea pero creo que no estoy tan seguro de eso', "'I thought at the time that it was not so sure' did not match; 'I think + clause' is creo que (Deborah #425, S0047L01)"),
 'S0189L01U10': (E, 'Do you think it is a good idea to keep going like this or should I try to change something?', None, "English first: 'intentar cambiar algo' is 'try to change something' (row now on crees, #864)"),
 'S0190L01U06': (E, 'I think I do it better now than when you started working on this', None, "English first: no 'first'"),
 'S0192L01U14': (E, "I'm too busy to speak right now but I'll be able to speak later", None, "English first: no 'hoy'"),
 'S0195L02U01': (E, 'Do you want me to help you look for it, the money?', None, "English first: buscarlo is taught as 'to look for it' (S0171L02)"),
 'S0197L02U06': (E, 'I wanted to ask you something about my son before you leave', None, "English first: 'preguntarte' is 'ask you' (decirte is only taught at 235)"),
 'S0200L02B04': (A, None, None, "already fixed: now 'They want to try it | Quieren intentarlo' (seed 200 is after -lo at 146)"),
 'S0204L01U08': (E, None, '¿Qué harías si le pidiera que ella te ayudara con esto?', "'te pidiera' asked YOU; 'her' is le (taught S0176L01), pidiera S0203L02"),
 'S0204L02U03': (E, 'We need to finish the arrangements before next week', None, "English first: 'la semana que viene' is 'next week'"),
 'S0204L02U10': (E, 'The arrangements for next week are something very important for us', None, ALL),
 'S0204L02U13': (E, 'We need to finish the arrangements and that is very important for us', None, ALL),
 'S0206L01U03': (E, 'I enjoy learning in this way because it is interesting for us', None, ALL),
 'S0206L01U07': (E, 'I enjoy talking with you about that because it is very important for us', None, ALL),
 'S0206L02U03': (E, 'I enjoy having the opportunity to talk with you because we learn a lot', None, "English first: no 'juntos'"),
 'S0211L03U05': (E, 'They did not want to say anything about that because it was difficult', None, "English first: no 'muy'"),
 'S0211L03U07': (E, 'I knew that they did not want to explain but I wanted to understand more about it', None, "English first: no 'still'"),
 'S0211L03U10': (E, 'They did not want to talk about it even though it was very important for us', None, ALL),
 'S0211L03U15': (E, 'She told us that they did not want to explain anything about it before tomorrow', None, "English first: no 'por la mañana'"),
 'S0212L01U10': (E, 'They wanted to talk about what you said about that', None, "English first: 'sobre eso' is 'about that'; no 'to them'"),
 'S0212L01U11': (A, None, None, "already fixed: now 'before practising | antes de practicar'"),
 'S0213L02U08': (E, 'I think we know what the answer to this question is', None, "English first: no 'mejor'"),
 'S0213L03U10': (E, None, '¿Puedes decirme lo que estabas intentando decir cuando dijiste eso?', "'trying to' had no Spanish; estabas (S0107L03) + intentando (S0002L02); the English 'what you were saying when you said that' would be circular"),
 'S0213L05U15': (E, "I'm trying to achieve something that will help many people", None, "English first: 'muchas personas' is 'many people'"),
 'S0216L04U03': (E, 'I saw some friends yesterday and we talked with them for a long time', None, "English first: 'hablamos' is 'we talked'"),
 'S0216L04U06': (E, 'I enjoy talking with my friends at the weekend', 'Disfruto hablando con mis amigos el fin de semana', "'spending time' had no Spanish; disfrutar takes the gerund as the course teaches it (seed 51 'disfruto haciendo')"),
 'S0216L04U15': (E, 'I saw some friends on Saturday night and we talked with them', 'Vi a unos amigos el sábado por la noche y hablamos con ellos', "'hablamos' is 'we talked'; the doubled 'por la noche' / 'in the evening' dropped from both sides"),
 'S0219L04U02': (E, 'It was good to relax for a while after working all day', None, "English first: no 'duro'"),
 'S0219L04U10': (E, 'I would like to do this for a while longer if that is alright', None, "English first: 'hacer esto' is 'do this'"),
 'S0219L04U15': (E, 'I would like to relax for a while and then I can start', None, "English first: 'puedo' is 'I can'"),
 'S0223L01U04': (E, 'He is going to start talking soon', None, "English first: no 'muy'"),
 'S0225L02U11': (E, 'I cannot remember how to say what I wanted to say but I know the answer', None, "English first: 'cómo decir' is 'how to say'"),
 'S0225L03U03': (E, 'I will ask him if he will be able to help next year because if he could it would be great', None, "English first: 'Le preguntaré si podrá' is 'ask him if he will be able to'; 'si pudiera' now reads as the LEGO's 'if he could'"),
 'S0225L03U07': (D, None, None, "the fix ('the whole phrase') is word for word S0225L03B05, which the basket already has — the row was a mistranslated copy of it"),
 'S0228L01B03': (E, 'That man is trying to tell me what he wants', None, "English first: 'quiere' is 'wants'"),
 'S0233L02U02': (E, 'Do you know if she knows the woman who was here talking with us before?', None, "English first: 'aquí' is 'here'"),
 'S0233L04U12': (E, 'She works with your sister and said she wanted to talk about a very interesting idea', None, "English first: 'quería hablar de' is 'wanted to talk about'"),
 'S0234L03U14': (E, 'She works with people who want to learn to explain this in a different way', None, "English first: 'esto' is 'this'"),
 'S0234L04B03': (D, None, None, "the fix ('I met someone last night who works with your brother') is word for word S0234L04U16; four builds remain"),
 'S0235L02U11': (E, 'She wants to tell you something about the idea before you leave', None, "English first: 'algo' is 'something'"),
 'S0243L02U13': (E, "I'm trying to say the same thing in a different way", None, "English first: no 'pero'"),
 'S0244L01U08': (E, "I've learnt a lot about how to speak Spanish in a different way", None, "English first: 'de manera diferente' is 'in a different way'"),
 'S0244L02U14': (E, "I feel a bit tired because there's a lot to do at work", None, "English first: 'mucho que hacer' is 'a lot to do'"),
 'S0244L02U15': (E, 'I need to practise a lot more before I feel ready to speak well', None, "English first: 'hablar bien' is 'speak well'"),
 'S0245L02U03': (E, "I think it's important to remember how much you've already done", None, "English first: 'recordar' is 'remember'"),
 'S0245L02U12': (E, "It's interesting how much you can learn when you want to", None, "English first: 'interesante' is 'interesting'; no 'really'"),
 'S0245L03U02': (D, None, None, "the fix ('I think I've done a lot in a short time') is word for word S0245L03B04"),
 'S0245L03U04': (E, "I've done a lot in a short time and I feel good about it", None, "English first: 'He hecho mucho' is 'I've done a lot'"),
 'S0245L03U07': (E, "In a short time you're going to be able to have a conversation in Spanish", None, "English first: no 'full'"),
 'S0247L01B06': (E, "It's fairly easy now", 'Es bastante fácil ahora', "'Lo estoy haciendo bastante fácil' is not Spanish for 'I find it fairly easy' (encontrar 'to find it easy' is untaught); fácil S0064L01"),
 'S0248L03U10': (E, 'I thought the idea was complete rubbish and I want them to give my money back', None, "English first: 'la idea' is 'the idea'"),
 'S0248L03U12': (E, 'He said he wants them to give him back his money', None, "English first: no 'also'"),
 'S0248L03U14': (E, 'What I need right now is for them to give me back my money', None, "English first: 'Lo que necesito' is 'What I need'"),
 'S0249L02U09': (E, 'She wants to tell you something important before you go', None, "English first: 'quiere' is 'wants'"),
 'S0250L02U13': (E, 'I need more time to think before I answer', None, "English first: 'Necesito más tiempo' (no 'you to give me')"),
 'S0252L02U07': (E, 'I want to know when you will be ready to start so I can be ready', None, "English first: no 'también'; 'para estar listo' is 'so I can be ready'"),
 'S0254L01U14': (E, 'I have been ready since this morning and feel that I can do it', None, "English first: 'siento que puedo hacerlo' has no 'confident' and says 'do it'"),
 'S0255L02U16': (E, "I want to know when you think you'll be ready to leave at the weekend", None, "English first: 'el fin de semana' is 'at the weekend' (as S0216L04U06); row now on crees (#864)"),
 'S0260L01U12': (E, "I don't have the faintest idea what's going to happen at the weekend", None, "English first: 'el fin de semana' is 'at the weekend'"),
 'S0263L01U04': (E, "I'm not sure who exactly you mean because I can't remember what you said", None, "English first: 'exactamente' is 'exactly'"),
 'S0263L01U11': (E, "I'm trying to understand who you mean but I can't remember", None, "English first: no 'just'"),
 'S0264L01U04': (E, 'I met an old man who wanted to know how to say something in Spanish', None, "English first: 'saber' is 'know'"),
 'S0275L01U11': (E, 'I think I should give her longer to think about what she wants', None, "English first: 'debería' is 'I should'; no 'really'"),
 'S0275L01U13': (E, 'She said she would like longer to think about this before she has to say something', None, "English first: no 'really'"),
 'S0275L01U14': (E, 'I think it would be better to give her longer to understand what we are trying to say', None, "English first: no 'un poco'"),
 'S0277L01U09': (E, 'She told me the meeting is very important and she wants to be there', None, "English first: no 'really'"),
 'S0277L01U11': (E, 'I think it would be a good idea to have a meeting before we start working', None, "English first: no 'short'"),
 'S0279L02U03': (H, None, None, "'Todavía quedaba poco tiempo antes de que tenga que irme' mixes past quedaba with present tenga; the past form tuviera is only taught at 387 and 'antes de irme' nowhere. Proposed 'There was still a little time left | Todavía quedaba un poco de tiempo' (drops 'before I had to leave'), or allow tuviera early — Kai's/native call"),
 'S0281L03U09': (E, 'I like my coffee when I have time to relax for a while', None, "English first: no 'sit down and'; 'un rato' is 'for a while'"),
 'S0282L02U04': (E, 'Do you mind if I finish my coffee before we talk about a problem?', None, "English first: the LEGO is 'a problem | un problema'"),
 'S0285L01U10': (E, 'It is more important to speak often than to be perfect and she does that', None, "English first: 'ella lo hace' is 'she does that'"),
 'S0285L01U11': (E, 'She speaks with my friends when they are here to practise', None, "English first: 'están aquí' is 'are here'"),
 'S0288L01U03': (E, 'Most of my friends want to practise often', None, "English first: no 'hablando' ('practicar hablando' rows are parked, Kai item 44b)"),
 'S0289L02U13': (E, "My friend told me it's going to be ready next month", None, "English first: no 'el lugar'"),
 'S0291L01U09': (E, 'I hope most people want to practise often', None, "English first: no 'hablando'. NOTE: 'Espero que … quieren' wants the subjunctive quieran, which is untaught — pre-existing mood row, not touched"),
 'S0291L01U12': (E, 'I hope it is going to be ready in time for us to start together', None, "English first: no 'really'. NOTE: 'Espero que va a estar' is the same pre-existing mood question, not touched"),
 'S0291L02U01': (D, None, None, "the fix ('I hope to be able to speak better soon') is word for word S0291L02B04"),
 'S0291L02U06': (E, 'It is not easy to be able to speak better soon but it is possible to practise often', None, "English first: 'es posible practicar' is 'it is possible to practise' (practicas is untaught)"),
 'S0291L02U11': (E, 'I know that being able to speak better soon is something that can take time', None, "English first: no 'y practicar'"),
 'S0295L03U14': (E, "I didn't say that I wanted to finish in a day but they said that I did say it", None, "English first: 'ellos dijeron que sí lo dije'"),
 'S0298L02B04': (E, None, 'No me queda nada que decirte', "'decir contigo' is not Spanish for 'say to you'; decirte is taught (S0235L02)"),
 'S0299L03U07': (E, "He wants to pay half so that I don't have to pay everything", 'Él quiere pagar la mitad para que no tenga que pagar todo', "'the others' had no Spanish and 'de eso' no English; tengan is untaught (532), tenga is seed 25's"),
 'S0303L02U05': (E, 'I think that he wants to live somewhere', None, "English first: 'en algún sitio' is 'somewhere' (otro only from 488)"),
 'S0329L01U05': (E, 'working hard is important', None, "English first: no 'muy'"),
 'S0341L01U03': (E, 'I met someone quite a while ago', None, "English first: 'alguien' is 'someone'"),
 'S0356L01U04': (E, 'they had some valuable ideas', 'tenían algunas ideas valiosas', "'to share | que dar' did not match and compartir is only taught at 593; the clause dropped from both sides"),
 'S0370L01U05': (E, "I didn't see anyone I knew", None, "English first: 'vi' is 'saw'"),
 'S0379L03B03': (E, None, 'tuve la suerte de descubrir', "'find out' is descubrir (S0017L02), not saber"),
 'S0381L01B03': (D, None, None, "'to follow closely | seguir bien' has no valid reword ('to follow well' is not natural English); B01/B02 keep the LEGO's builds"),
 'S0389L01U05': (E, 'she was looking for someone over there', None, "English first: 'buscando' is 'looking for'"),
 'S0392L01U02': (E, 'I saw someone at the post office', None, "English first: 'a alguien' is 'someone' (la vi needs an untaught clitic)"),
 'S0392L02U02': (E, 'I saw someone opposite the post office', None, "English first: 'a alguien' is 'someone'"),
 'S0392L03U02': (E, 'that person with black hair near the entrance', None, "English first: 'esa persona' is 'that person'"),
 'S0393L01U05': (E, 'that child with the green shirt near the entrance', None, "English first: 'ese niño' is 'that child'"),
 'S0394L02U06': (E, 'I heard something about that girl', None, "English first: 'algo' is 'something'"),
 'S0404L01B01': (D, None, None, "'del | del jueves' is a tile, not a phrase; B02 already says 'before Thursday | antes del jueves'"),
 'S0406L02U04': (E, "I'm sure she'll be here before Thursday", None, "English first: 'aquí' is 'here'"),
 'S0407L01U06': (E, 'I wanted to give a good example', None, "English first: no 'siempre'"),
 'S0408L01U04': (E, 'I told her she needs to have a happy family', None, "English first: 'tener' is 'have'"),
 'S0418L03U06': (E, "I'm sure they need to come back", 'estoy seguro de que necesitan volver', "past 'needed' over present 'necesitan'; necesitaban is untaught, so both sides present (estoy seguro de que S0406L02)"),
 'S0419L01B02': (E, 'the people here', None, "English first: 'la gente aquí' is 'the people here'"),
 'S0421L04U04': (E, 'I think she is getting weak', 'creo que se está debilitando', "'pensé que se está debilitando' mixes tenses and the past 'se estaba' is untaught; both sides present"),
 'S0421L04U05': (H, None, None, "'estaba preocupada de que se está debilitando' needs the subjunctive ('se esté debilitando'), which is untaught, and the judge's 'estoy preocupada de que se está' is still indicative. Proposed delete, or a native rewording — Kai's/Deborah's call"),
 'S0422L01B03': (E, None, 'una pregunta muy importante', "'very' is muy (S0013L01); the English keeps the LEGO's 'a question'"),
 'S0422L01U04': (E, 'I wanted to ask a question', None, "English first: no 'siempre'"),
 'S0423L01U02': (E, "in my opinion, it's so obvious", None, "English first: 'tan obvia' is 'so obvious'"),
 'S0433L03U04': (E, "I was sure they couldn't do it", None, "English first: 'no pudieron hacerlo' is 'couldn't do it'"),
 'S0437L03B03': (E, None, 'querían recaudar dinero para caridad', "'money' is dinero (S0195L02), not algo"),
 'S0443L02B04': (E, 'they want to do it the same way', 'quieren hacerlo de la misma manera', "'quieren hacerlo … así' doubled 'así' after 'de la misma manera'; English now says 'do it'"),
 'S0444L02B03': (E, None, 'pensaban que se podría hacer', "'it could be done' has no 'eso'; the impersonal 'se podría hacer' carries the 'it'"),
 'S0449L01U03': (E, 'we are almost ready', None, "English first: 'listos' is 'ready'"),
 'S0450L03U06': (D, None, None, "the fix ('no they have to catch the train') is word for word S0450L03U01"),
 'S0453L02U06': (E, 'I want to know who they saw here', None, "English first: 'aquí' is 'here'"),
 'S0458L03B02': (E, 'it was all much easier before', None, "English first: the LEGO is 'it was all much easier | todo era mucho más fácil'"),
 'S0460L03B03': (E, 'near the problem', None, "English first: no 'area'"),
 'S0475L02U02': (E, 'she has reasons', None, "English first: no 'sus'"),
 'S0478L01U05': (E, 'she has a good heart', 'ella tiene un buen corazón', "'warm' had no Spanish; 'un corazón' alone is flat. buen corazón is the basket's own (B03/U01); bondadoso belongs to L02"),
 'S0478L02U04': (E, 'she really has a kind heart', None, "English first: 'tiene … de verdad' is 'really has'"),
 'S0480L02U01': (D, None, None, "'de esto' had no English; without it the row is word for word S0480L02B01 'it's not far ahead now | ya no queda mucho'"),
 'S0481L02U05': (E, 'that is the only hope', None, "English first: 'la única esperanza' (nuestra is untaught)"),
 'S0484L01B02': (E, 'a very big challenge', None, "English first: 'muy grande' is 'very big'"),
 'S0484L01U01': (E, 'it is a very big challenge', None, "English first: 'muy grande'"),
 'S0484L01U05': (E, 'this is a very big challenge', None, "English first: 'muy grande'"),
 'S0498L01B02': (E, 'standing today', None, "English first: no 'aquí'"),
 'S0498L04U02': (E, None, 'está dentro de la entrada', "'allí' had no English"),
 'S0500L01U03': (E, "why don't you want to be here?", None, "English first: 'estar' is 'be' (quedarte is untaught)"),
 'S0506L04B03': (E, 'well before we moved', None, "English first: 'bien antes' is 'well before'"),
 'S0512L01B02': (E, 'can you hold that?', None, "English first: 'mantener eso' is 'hold that', not 'hold on'"),
 'S0512L01U01': (E, 'can you hold this a moment?', None, "English first: 'mantener esto'"),
 'S0512L01U03': (E, 'can you hold that for a bit?', None, "English first: 'mantener eso'"),
 'S0512L01U05': (E, 'can you hold this here a moment?', None, "English first: 'esto aquí un momento'"),
 'S0512L02B03': (E, 'the door open a moment', None, "English first: no 'mantener' in the build"),
 'S0512L02B04': (E, 'the door open here', None, "English first: no 'just'"),
 'S0514L02B03': (E, 'the perfect house here', None, "English first: the LEGO is 'the perfect house | la casa perfecta'"),
 'S0550L01B03': (E, "I'm sure that the end of the village is the way", None, "English first: no 'right'"),
 'S0555L01B03': (E, "they said that I'm too tired", None, "English first: 'dijeron' is 'they said'"),
 'S0591L01U04': (E, 'she followed very slowly', None, "English first: 'muy despacio'"),
 'S0593L03U03': (E, "however much I argued I couldn't", None, "English first: no 'still'"),
 'S0597L01B03': (E, 'I suspect she was there', None, "English first: no 'ya'"),
 'S0599L03B02': (E, 'wanted to drive', None, "English first: 'quería' is 'wanted'"),
 'S0599L04B02': (H, None, None, "the LEGO S0599L04 'you'd told | hubieras' is cut too small (hubieras is 'you had'; 'told' is dicho, 'me lo' is unglossed), so its builds 'si me lo hubieras' stop mid-verb. A LEGO re-cut to 'if you'd told me | si me lo hubieras dicho' (the seed's own words) is Kai's call"),
 'S0599L04B03': (H, None, None, "same S0599L04 LEGO re-cut: 'habría hecho eso si me lo hubieras' stops mid-verb; with the LEGO grown it becomes U04 'I would have done it if you'd told me'"),
 'S0604L02U05': (D, None, None, "'nos ofreció dejarnos quedarnos' is the clumsy twin of S0604L02U04 'se ofreció a dejarnos quedarnos | she offered to let us stay'; any English fix duplicates U04 (ZUT)"),
 'S0606L01U02': (E, None, 'habría esperado un poco más', "'a bit' is 'un poco' (S0009L02)"),
 'S0606L01U05': (E, None, 'habría esperado un rato', "'a while' is taught as 'un rato' (S0219L04), P28"),
 'S0618L01B03': (E, "but it doesn't feel like a long time", None, "English first: 'mucho tiempo' is 'a long time'"),
 'S0621L01B03': (E, None, 'no me habría atrevido a hacer eso', "'do' had no Spanish; hacer is taught"),
 'S0621L03U04': (E, None, 'me dijo que estaba roto', "'muy' had no English"),
 'S0632L01U05': (E, 'I like to have a glass of water in the morning', None, "English first: 'me gusta tomar' has no 'siempre'"),
 'S0636L01B03': (K, None, None, "'el bueno' is how Spanish says 'the right one' (ese es el bueno); natural"),
 'S0637L01B03': (E, 'where is her bag now', None, "'her bag location' is not English; 'ahora' is 'now'"),
 'S0637L01U05': (E, 'she told me she knew where her bag is', None, "English first: 'está' is 'is' (estaba would break the LEGO 'dónde está su bolso', K50)"),
 'S0652L01B02': (E, 'let me tell you what she needs', None, "English first: 'necesita' with tú 'déjame decirte' can only be 'she needs' (as B03)"),
}

def main():
    live = {}
    for s in json.load(open(sys.argv[1]))['seeds']:
        for l in s['legos']:
            for p in l.get('basket_phrases') or []: live[p['id'].split(':')[-1]] = p
    rows = [json.loads(l) for l in open(FIND)]
    sp = {r['id']: r for r in rows if r['course'] == 'spa_for_eng' and r['decision'] == 'CONFIRM' and r['cause'] != 'dropped-object'}
    dropped = [r for r in rows if r['course'] == 'spa_for_eng' and r['decision'] == 'CONFIRM' and r['cause'] == 'dropped-object']
    lego_level = [r for r in rows if r['course'] == 'spa_for_eng' and r['decision'] == 'LEGO_LEVEL']
    assert set(sp) == set(DEC), (set(sp) ^ set(DEC))
    fixes, held, kept, already = [], [], [], []
    for i, (a, k, t, why) in sorted(DEC.items()):
        r = sp[i]; p = live.get(i)
        now = [p['known_text'], p['target_text']] if p else None
        tag = f"#195 {r['severity']}/{r['cause']}: {why}"
        if a == A: already.append({'id': i, 'seed': r['seed'], 'snapshot': [r['known'], r['target']], 'now': now, 'reason': why}); continue
        assert now, i
        if a == E: fixes.append([i, r['cause'], now, [k, t], tag])
        elif a == D: fixes.append([i, r['cause'], now, None, tag])
        elif a == H: held.append({'id': i, 'seed': r['seed'], 'now': now, 'proposal': [k, t], 'reason': why})
        else: kept.append({'id': i, 'seed': r['seed'], 'now': now, 'reason': why})
    for r in lego_level:
        held.append({'id': r['id'], 'seed': r['seed'], 'now': [r['known'], r['target']], 'proposal': [None, None],
                     'reason': "LEGO_LEVEL (held by brief): the LEGO S0651L01 'you think sir | piensa' itself pairs the vocative with no Spanish word; the basket repeats it with 'madam'. Proposed: grow the phrase to '¿puede decirme qué piensa, señora?' (K32 sir/madam closing, as S0652L01U02) — a LEGO-level call for Kai"})
    for r in dropped:
        held.append({'id': r['id'], 'seed': r['seed'], 'now': [r['known'], r['target']], 'proposal': [r['fixed_known'], r['fixed_target']],
                     'reason': 'dropped-object class held whole: Spanish needs the object clitic, but fixes mostly need clitics untaught at that seed (-lo attached from 146, -la never) and the class mixes in natural Spanish; judge suggestion shown'})
    seeds = {x['seed_number']: x for x in json.load(open(sys.argv[1]))['seeds']}
    s142 = seeds[142]
    seed_fixes = [[142, 'missing-chunk', [s142['known_text'], s142['target_text']], ["that's very kind of you and I'm grateful to you for helping me", None],
                   "#195 via S0142L02U09 (its P26 copy): 'te agradezco por ayudarme' is 'grateful to you for helping ME'"]]
    out = os.path.join(ROOT, 'tools/course-optimization/spa-mismatch-195-2026-11-04.data.cjs')
    with open(out, 'w') as f:
        f.write("'use strict';\n// GENERATED by ops/spa-mismatch-195/decisions.py — edit there, not here (job #259, Kai approved 4 Nov 2026).\n")
        f.write("// Rows: [id, class, [known now (LIVE 4 Nov), target now], [known fix | null, target fix | null] | null (= delete), why].\n")
        f.write("// Run with the ita #36 engine: DATA=tools/course-optimization/spa-mismatch-195-2026-11-04.data.cjs node tools/course-optimization/ita-mismatch-36-2026-11-02.cjs …\n")
        for n, v in (('FIXES', fixes), ('SEED_FIXES', seed_fixes), ('HELD', held), ('KEPT', kept), ('ALREADY', already)):
            f.write(f"const {n} = {json.dumps(v, ensure_ascii=False, indent=1)};\n")
        f.write("module.exports = { COURSE: 'spa_for_eng', LANGUAGE: 'Spanish', LOG_PREFIX: 'spa-195', JOB: '#259',\n"
                "  AGENT: 'spa-mismatch-195 (job #259)', PURPOSE: 'job #259 spa_for_eng #195 phrase-mismatch fixes (Kai approved 4 Nov) — refill of the slots these edits emptied',\n"
                "  // decirte holds the LEGO 'decir' (Kai 29 Sept, pensarci): -te attached is taught from S0235L02 'to tell you | decirte'.\n"
                "  STEM_CLITIC: { decirte: { infinitive: 'decir', taughtAt: 'S0235L02' } },\n"
                "  FIXES, SEED_FIXES, LEGO_FIXES: [], HELD, KEPT, ALREADY };\n")
    print(f"fixes {len([x for x in fixes if x[3]])} edits + {len([x for x in fixes if not x[3]])} deletes, held {len(held)} (incl {len(dropped)} dropped-object, {len(lego_level)} LEGO_LEVEL), kept {len(kept)}, already fixed {len(already)}")
main()
