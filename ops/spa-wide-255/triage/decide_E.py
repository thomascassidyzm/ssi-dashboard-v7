#!/usr/bin/env python3
"""Band E (seeds 421-545) triage decisions, read by hand by the #255 lead (Opus), 4 Nov 2026. Format as decide_F.py."""
C, K, N, F = 'CLEAR', 'NEEDS-KAI', 'NEEDS-NATIVE', 'FALSE'
SEQ = "After a past frame ('estaba seguro de que', 'sabía que') Spanish backshifts the verb; the present here clashes with the English past. The past form is untaught here, so the frame moves to the present on both sides."
CARIDAD = {'question': "Seed 437 and 17 phrases say 'para caridad' / 'a caridad' with no article ('quiero hacer algo para caridad', 'dar lo máximo posible a caridad'). Would you say 'para la caridad', 'para caridad', or 'con fines benéficos'? And is 'una buena caridad' (a good charity) possible, or only 'una buena causa'?"}
D = {
 'S0421L03U04': (C, "I'm sure they know", 'estoy seguro de que saben', SEQ, 'K16,K14', {'pattern_target': 'estaba seguro de que'}),
 'S0421L04U05': (C, "I'm worried she's getting weak", 'estoy preocupada de que se está debilitando', SEQ + " ('preocupada de que' + indicative is still marked; Deborah may prefer 'me preocupa que se esté debilitando'.)", 'K16,K14', {}),
 'S0423L01U02': (C, 'in my opinion, it\'s such an obvious question', 'en mi opinión, es una pregunta tan obvia', "'tan obvia' is feminine with no feminine noun; supplying the seed's 'pregunta' keeps the LEGO.", 'K27,P24', {}),
 'S0423L01U03': (C, 'I knew it was such an obvious question', 'sabía que era una pregunta tan obvia', 'As U02.', 'K27,P24', {}),
 'S0423L01U06': (C, 'I told her it was such an obvious question', None, "The LEGO teaches 'such an obvious = tan obvia'; the English said 'very obvious'.", 'P28', {}),
 'S0424': (K, None, None, "Seed 424 'they're wasting everybody's time | están haciendo perder el tiempo a todos' is causative; LEGO S0424L01 'causing to waste | haciendo perder' is not English, and its phrases drop 'a todos' so they mean 'making (someone) waste time' while the English says they waste their own.", 'L both sides,K9', {'proposal': "Re-gloss S0424L01 to 'making … waste | haciendo perder' or grow it to 'wasting everybody's time | haciendo perder el tiempo a todos' (matches the seed and every phrase); then U02-U04 add 'a todos' / 'everybody's'. English of the seed can stay."}),
 'S0424L01': (K, None, None, 'Follows seed 424.', 'K9', {'knock_on_of': 'S0424'}),
 'S0424L01U02': (K, None, None, 'Follows seed 424.', '', {'knock_on_of': 'S0424'}),
 'S0424L01U03': (K, None, None, 'Follows seed 424.', '', {'knock_on_of': 'S0424'}),
 'S0424L01U04': (K, None, None, 'Follows seed 424.', '', {'knock_on_of': 'S0424'}),
 'S0425L01U04': (C, 'I know they already understand', 'sé que ya entienden', SEQ, 'K16,K14', {'pattern_target': 'sabía que'}),
 'S0425L01U06': (C, "I'm sure they already understand", 'estoy seguro de que ya entienden', SEQ, 'K16,K14', {}),
 'S0426L03B02': (C, 'to love each other', None, "The Spanish is the infinitive 'quererse entre ellos'; the English was finite.", 'K9', {}),
 'S0426L03U06': (C, 'because they still want to love each other', None, "'quieren quererse' is 'want to love each other'; the English dropped 'want'.", 'K9', {}),
 'S0427L01': (F, None, None, 'ALREADY-HELD (#864, d/6321f2cd): the S0427L01 "you thought | pensaras" gloss awaits Kai.', '', {}),
 'S0427L02U04': (C, 'I know they are bored', 'sé que están aburridos', SEQ, 'K16,K14', {}),
 'S0428L01U05': (C, None, 'porque es martes', "With ser, a weekday as predicate takes no article: 'es martes'.", 'K16', {'pattern_target': 'es el martes'}),
 'S0429L01U05': (C, "it's already perfect for them", None, "The Spanish has 'es'; the English had no verb.", 'K9', {}),
 'S0429L01U06': (C, None, 'DELETE', "'no es tan obvia que sería…' has a feminine with no noun and a broken tan…que clause; no taught rewrite.", 'K16,K27', {}),
 'S0431L01U04': (C, "I'm sure they'll be ready soon", 'estoy seguro de que estarán listos pronto', SEQ, 'K16,K14', {}),
 'S0432L01U02': (C, 'I know they want you to ask', 'sé que quieren que preguntes', SEQ, 'K16,K14', {}),
 'S0433L01U04': (C, 'I told her she should see the film', None, "'le dije que debería ver' is 'I told her she should see'; moving the English avoids the untaught 'viera'.", 'K14', {}),
 'S0433L03U04': (C, "I'm sure they couldn't do it", 'estoy seguro de que no pudieron hacerlo', "With 'estaba seguro' the preterite reads oddly; with 'estoy seguro' it is a plain statement about a past event.", 'K16', {}),
 'S0434L02B04': (C, None, '¿podrían decir cuántos estudiantes aceptan?', "'cuántos estudiantes que aceptan' has a stray 'que'.", 'K16', {'pattern_target': 'cuántos estudiantes que'}),
 'S0434L02U03': (C, None, 'DELETE', "'decirme de' is a calque of 'tell me about'; 'hablarme de' is untaught.", 'K16,P1', {}),
 'S0434L02U04': (C, None, '¿sabes cuántos estudiantes aceptan aquí?', "Stray 'que' in the indirect question.", 'K16', {}),
 'S0434L03B04': (F, None, None, "'reducir los estudiantes que aceptan' is loose but understood on both sides alike.", 'P14', {}),
 'S0436L01U02': (C, None, '¿cuál es el número mínimo?', "Asking for a value takes 'cuál', not 'qué'.", 'K16', {}),
 'S0437': (N, None, None, "Bare 'para caridad' throughout seed 437 and its phrases.", 'K16', CARIDAD),
 'S0447': (K, None, None, "Seed 447 says 'drive us home'; its LEGO S0447L03 and the Spanish 'llevarnos a casa' say 'take us home'.", 'S15', {'proposal': "Seed 447 English → 'will they be able to take us home after the meal?' and its seed-sentence row S0447L03U01 the same (English only)."}),
 'S0447L03U01': (K, None, None, 'Seed-sentence row; follows seed 447.', '', {'knock_on_of': 'S0447'}),
 'S0447L01U03': (C, 'do you want to eat?', '¿quieres comer?', "'tener una comida' is a calque of 'have a meal'.", 'K16', {'pattern_target': 'tener una comida'}),
 'S0447L01U06': (C, 'I want to eat with them', 'quiero comer con ellos', "'tener una comida con ellos' is a calque.", 'K16', {}),
 'S0450': (K, None, None, "Seed 450 English 'themselves' has no Spanish counterpart.", 'S15', {'proposal': "Seed 450 English → 'no, they have to catch the train' (English only)."}),
 'S0450L02B03': (C, 'that they have to', None, "'the fact that' had no Spanish counterpart.", 'K9', {}),
 'S0455L01B03': (F, None, None, "'tengo niños' for 'I have children' is common in Latin America and understood everywhere; the LEGO is 'children | niños'.", 'P28', {}),
 'S0455L01U02': (F, None, None, "As B03: '¿tienes niños?' is in use and follows the LEGO.", 'P28', {}),
 'S0455L03U02': (C, 'I know we had to leave', 'sé que tuvimos que irnos', SEQ, 'K16,K14', {}),
 'S0456L01U05': (C, 'I think it is not very probable', None, "'this' had no Spanish counterpart.", 'K9', {}),
 'S0456L01U06': (C, 'is this probable?', None, "'this thing' had no counterpart for 'thing'.", 'K9', {}),
 'S0456L02U04': (C, None, 'DELETE', "'¿sabes si puede que esté allí?' embeds a subjunctive trigger under 'si', which natives avoid; 'podría estar' would break the LEGO.", 'K16,P17', {}),
 'S0460L02B04': (C, 'I want to be at the hotel', None, "'estar en el hotel' is 'be at', not 'stay at' (lodge).", 'K9', {}),
 'S0461L03B04': (K, None, None, "LEGO S0461L03 'where I can | donde pueda' is a subjunctive taught as a plain 'where I can'; 'saber donde pueda comprar' is wrong (needs 'dónde puedo').", 'K40', {'proposal': "Grow S0461L03 to carry its trigger from the seed (K40), e.g. 'somewhere I can | algún sitio donde pueda', and check its basket."}),
 'S0462L01U03': (C, None, 'DELETE', "'decirte de mi abuelo' is a calque of 'tell you about'; 'hablarte de' is untaught.", 'K16,P1', {'pattern_target': 'decirte de'}),
 'S0462L03U01': (C, 'it was difficult during the war', None, "The English was negated ('not easy'), the Spanish affirmative ('difícil').", 'K9', {}),
 'S0462L03U03': (C, None, 'DELETE', "'sabes de durante la guerra' is ungrammatical on both sides; 'lo que pasó' is untaught here.", 'K16', {}),
 'S0464L02B02': (C, 'I told her that', 'le dije eso', "'decir de eso' is a calque of 'tell about'.", 'K16', {'pattern_target': 'dije de'}),
 'S0464L02U04': (C, 'I told her something about the hotel', 'le dije algo del hotel', "'decir del hotel' is a calque; 'decir algo de' is natural.", 'K16', {}),
 'S0464L02U05': (C, 'I told her something about my grandfather', 'le dije algo de mi abuelo', 'As U04.', 'K16', {}),
 'S0464L02U06': (C, 'I told her something about the war', 'le dije algo de la guerra', 'As U04.', 'K16', {}),
 'S0465L01B02': (C, 'waiting for next time', None, "'esperar la próxima vez' is 'wait for'; 'looking forward to' is something else.", 'K9', {}),
 'S0465L02B03': (C, None, 'le preguntaré sobre', "'preguntar de' is the wrong preposition; 'preguntar sobre'.", 'K16', {'pattern_target': 'preguntaré de'}),
 'S0465L02B04': (C, None, 'le preguntaré sobre la habitación', 'As B03.', 'K16', {}),
 'S0465L02U02': (C, None, 'le preguntaré sobre mi habitación', 'As B03.', 'K16', {}),
 'S0465L02U05': (C, None, 'le preguntaré sobre mi abuelo', 'As B03.', 'K16', {}),
 'S0465L02U06': (C, None, 'le preguntaré sobre la guerra', 'As B03.', 'K16', {}),
 'S0466L01U05': (C, 'let me think about this', None, "'esto' is 'this' in this course; 'pensarlo' would need an untaught enclitic.", 'K14', {}),
 'S0467L01U01': (C, 'she is next to this', None, "'right' and 'it' had no counterpart; 'esto' = this.", 'K9', {}),
 'S0467L01U02': (C, 'he was next to her', None, "'right' had no Spanish counterpart.", 'K9', {}),
 'S0467L01U03': (C, 'I want to be next to this', None, "'esto' = this.", 'K9', {}),
 'S0469L02': (K, None, None, "LEGO 'we can | podamos' teaches a subjunctive as plain 'we can'.", 'K40', {'proposal': "Grow S0469L02 to take its trigger from the seed ('doesn't mean that we can | no significa que podamos', or 'that we can | que podamos') and check the basket."}),
 'S0470L01B02': (N, None, None, "'hasta qué altura' (up to what height) used for 'how high is it'.", 'K16', {'question': "LEGO 'how high | hasta qué altura': is '¿hasta qué altura es?' natural for 'how high is it?', or should the LEGO be 'qué altura' ('¿qué altura tiene?')?"}),
 'S0470L01U03': (N, None, None, 'Follows S0470L01B02.', '', {'knock_on_of': 'S0470L01B02'}),
 'S0470L01U04': (N, None, None, 'Follows S0470L01B02.', '', {'knock_on_of': 'S0470L01B02'}),
 'S0470L03U01': (C, 'she leaves before we stop', 'ella se va antes de que paremos', "'se fue antes de que paremos' mixes past and present subjunctive; the present frame keeps the LEGO.", 'K16,P17', {}),
}
for i in ['S0437L01B02','S0437L01B03','S0437L01B04','S0437L01U01','S0437L01U02','S0437L01U03','S0437L01U04','S0437L01U05','S0437L01U06','S0437L02B03','S0437L02U02','S0437L02U04','S0437L02U05','S0437L02U06','S0437L03B03','S0437L03U01','S0437L03U04']:
    D[i] = (N, None, None, "Bare 'caridad' (seed 437 family).", 'K16', {'knock_on_of': 'S0437'})
LEGO_FRAG = "LEGO S0440L02 'while still | mientras todavía' is a fragment; its USE rows stop dead after it ('I want to do it while still'), which P7 forbids, and the completing chunk ('they're still young') is the NEXT LEGO."
D['S0440L02U01'] = (K, None, None, LEGO_FRAG, 'P7,P17', {'proposal': "Grow S0440L02 to 'while I'm still young | mientras todavía soy joven' (or merge it with L03), and rewrite U01-U06 as the second read suggested ('I want to do it while I'm still young | quiero hacerlo mientras todavía soy joven', etc.), checking 'soy/eres/son' are taught. B04 and U05 of L03 then add 'they're' in English."})
for i in ['S0440L02U02','S0440L02U03','S0440L02U04','S0440L02U05','S0440L02U06']:
    D[i] = (K, None, None, LEGO_FRAG, 'P7', {'knock_on_of': 'S0440L02U01'})
D['S0440L03B04'] = (C, "to do something while they're still young", None, "The Spanish has 'son' (they are); the English had no subject.", 'K26', {})
D['S0440L03U05'] = (C, "I knew they wanted to travel while they're still young", None, "The Spanish keeps 'son'; the English dropped 'they're'.", 'K26', {})

def add(i, b, ak=None, at=None, reason='', rule='', **x): D[i] = (b, ak, at, reason, rule, x)
JUNK = "A padding build/use row: a LEGO plus a stray tag ('here, good', 'before, no', 'at the end') that is not a sentence in either language."
add('S0472L02U04', F, reason="Odd but grammatical, and the only fix drops the LEGO 'no sabemos'.", rule='P17')
add('S0474L01U02', C, None, 'a él ni siquiera le importa', "'importar' takes an indirect object; 'él … le importa' needs 'a él'.", 'K16')
add('S0477L01U05', C, 'he is so sick', 'está tan enfermo', "'eso es tan enfermo' is not natural Spanish and 'that is so sick' is slang.", 'K9,K16')
add('S0477L02U04', C, 'he has been a long time', None, "'ha estado mucho tiempo' is personal ('he has been … a long time'); the English was the impersonal 'it has been a long time'.", 'K9')
add('S0477L03U01', C, 'she had known since the second day', None, "'since' needs a perfect in English; 'sabía desde' is the Spanish for 'had known since'.", 'K9')
add('S0477L03U03', C, 'since the second day it has been hard', None, "'since' needs the perfect, and the Spanish is 'ha estado'.", 'K9')
add('S0478L03U03', C, None, 'DELETE', "'qué corazón muy bondadoso' is ungrammatical (exclamative qué + noun cannot take 'muy'); 'tan' would break the LEGO.", 'K16,P17')
add('S0479L02U02', C, 'it would be the least I could do', 'sería lo menos que podría hacer', "Past 'fue' with the conditional LEGO 'podría' clashes; a conditional frame fits the LEGO.", 'K16,P24')
REGLOSS480 = "Re-gloss S0480L02 (and seed 480) English from 'it's not far ahead now' to 'it's not long now' ('ya no queda mucho' = not much left / not long to go); English-only change across B01, U02, U03, U05, U06 and the intro."
add('S0480', K, reason="Seed/LEGO gloss: 'it's not far ahead now' is spatial and not what 'ya no queda mucho' means.", rule='K9,O12', proposal=REGLOSS480)
for i in ['S0480L02', 'S0480L02B01', 'S0480L02U02', 'S0480L02U03', 'S0480L02U05', 'S0480L02U06']: add(i, K, reason='Follows seed 480.', rule='O12', knock_on_of='S0480')
add('S0480L01U01', C, None, 'diga lo que diga, ella lo sabe mejor', "'ella sabe mejor' reads as 'she tastes better'; 'lo sabe mejor' is 'knows better'.", 'K16')
add('S0480L01U02', C, "whatever he says, it's important", None, "The English read as 'what he says is important'; the Spanish is 'whatever he says, it's important'.", 'K9')
add('S0481L02U05', C, None, 'esa es la única esperanza', "Neuter 'eso' cannot be 'la única esperanza'; 'esa' agrees.", 'K27')
add('S0481L03U04', C, 'it is the only real hope', 'es la única esperanza real', "'of all, it is…' / 'de todo, es…' is a broken fragment.", 'K9,K16')
add('S0482L01B01', K, reason="LEGO S0482L01 'they're not serious | no estén hablando en serio' is a subjunctive with no trigger; B01-B03 use it as a plain statement, which is ungrammatical.", rule='K40', proposal="Grow S0482L01 to carry the seed's trigger (K40), e.g. 'I hope they're not serious | espero que no estén hablando en serio', and rebuild B01-B03.")
for i in ['S0482L01B02', 'S0482L01B03']: add(i, K, reason='Follows S0482L01B01.', rule='K40', knock_on_of='S0482L01B01')
REG483 = "Re-gloss seed 483 / LEGO S0483L03 'not meant to be' → 'doesn't have to be' (= 'no tiene que ser'), and seed 484 / S0484L02 'it's meant to be' → 'it has to be' (= 'tiene que ser'); English-only across all rows below and both intros. ('se supone que' would be the other route, but it is untaught.)"
add('S0483', K, reason="'not meant to be' ≠ 'no tiene que ser' (doesn't have to be).", rule='K9,O12', proposal=REG483)
for i in ['S0483L03', 'S0483L03B01', 'S0483L03B02', 'S0483L03B03', 'S0483L03U01', 'S0483L03U02', 'S0483L03U03', 'S0483L03U04', 'S0483L03U05', 'S0484', 'S0484L02']: add(i, K, reason='Follows seed 483.', rule='O12', knock_on_of='S0483')
add('S0486L01U04', C, None, 'de verdad son hermosos', "The extra 'muy' had no English counterpart.", 'K9')
for i, t in [('S0488L01B02', 'al otro lado'), ('S0488L01B03', 'allí al otro lado'), ('S0488L01U01', 'ella está al otro lado'), ('S0488L01U03', 'quiero estar al otro lado'), ('S0488L02U04', 'está al otro lado de esa línea amarilla')]:
    add(i, C, None, t, "The seed says 'al otro lado'; 'en el otro lado' is a calque and gives one English two Spanish.", 'P28,K16', pattern_target='en el otro lado')
add('S0488L02U05', C, 'why is that yellow line here?', '¿por qué está aquí esa línea amarilla?', "'hay' cannot take a demonstrative ('hay esa línea').", 'K16')
add('S0489L01U05', C, 'that coffee is very strong', 'ese café es muy fuerte', "A problem is not 'strong' in either language.", 'K9,K16')
add('S0489L02U04', C, 'that is a strong coffee', None, "The Spanish has 'un café'; the English had no article.", 'K9')
add('S0489L04B02', C, None, 'si no me haces un café', "'a coffee' is 'un café' (as the seed and U02); the row said 'el café'.", 'K16')
add('S0489L04U03', C, None, 'si no me haces un café ahora', 'As B02.', 'K16')
add('S0490L03U03', C, 'and then I will never trust anyone again', 'y entonces nunca volveré a confiar en nadie', "U03 and U06 had the same Spanish for two Englishes; this basket teaches 'and then = y entonces'.", 'K2')
add('S0490L03U05', C, None, '¿entonces qué piensas?', "The Spanish added 'y' (and) that the English lacked.", 'K9')
add('S0492L01U02', F, reason="'¿cuál es este?' is in normal use.", rule='')
add('S0492L01U03', F, reason="'¿cuál es ese?' is in normal use.", rule='')
add('S0492L01U04', C, 'which one is the good one?', '¿cuál es el bueno?', "'¿cuál es bueno?' with a bare adjective is odd.", 'K16')
add('S0492L01U05', C, None, '¿cuál es el mejor?', "Neuter 'lo mejor' cannot pick one item from a set; 'el mejor'.", 'K16,K27')
add('S0492L02B02', C, None, 'el mejor de esos lugares', "'de esos lugares el mejor' reverses the Spanish order.", 'K16')
add('S0492L02U02', C, None, '¿a cuál de esos lugares quieres ir?', "'ir' needs 'a' before the interrogative.", 'K16')
add('S0492L02U04', C, None, '¿cuál de esos lugares es el mejor?', "'lo mejor' does not agree with 'lugares'.", 'K27')
add('S0492L03U05', F, reason="'¿crees que está bien?' is a natural rendering of 'do you think that is right?'.", rule='')
add('S0492L04U05', C, None, 'creo que este es el más interesante', "Neuter 'esto' cannot take 'el más interesante'.", 'K27')
add('S0493', K, reason="Seed 493 English 'what's going to come next?' but Spanish '¿Qué viene después?' (present); the seed's own LEGO S0493L02 is 'va a venir'.", rule='S15', proposal="Seed 493 Spanish → '¿Qué va a venir después?' (tiles its LEGO) or English → 'what comes next?'.")
add('S0494L03U03', C, None, 'el espectáculo es el mejor', "Neuter 'lo mejor' does not agree with 'espectáculo'.", 'K27')
add('S0495L01U06', C, None, 'es mejor hacerlo cuando estés listo', "'cuando' about a future time takes the subjunctive.", 'K16')
add('S0495L02U05', C, None, 'importa mucho', "'de verdad' had no English counterpart.", 'K9')
add('S0497L02U05', C, None, 'no me dijiste que necesitabas dormir', 'Reported content after decir takes the indicative.', 'K16')
add('S0498L01B03', C, None, 'DELETE', "'standing very good' / 'está de pie muy bien' is not a sentence either side.", 'K9,K16')
add('S0498L04B03', C, "he's standing inside the entrance", None, "'está de pie' is finite; the English was a bare participle.", 'K9')
add('S0498L04U05', C, 'he is standing over there inside the entrance', None, "The Spanish has 'allí'; the English had 'right' instead.", 'K9')
add('S0499L03B03', C, 'maybe we should open the door', 'quizás deberíamos abrir la puerta', "'quizás' cannot take a bare infinitive.", 'K16')
add('S0501', K, reason="Seed 501 / LEGO S0501L02 'you played | jugarais' is vosotros (you all) with no plural in the English.", rule='K10,K26', proposal="English → 'you all' in seed 501 and S0501L02 ('if only I could trust you all to play together without arguing'; 'you all played | jugarais').")
add('S0501L02', K, reason='Follows seed 501.', rule='K26', knock_on_of='S0501')
add('S0503L03U03', C, "I don't want to cause problems but that one's mine", None, "The Spanish has 'causar problemas' and the LEGO is 'that one's mine'; the English had neither.", 'K9,P17')
add('S0504L03U05', C, None, 'DELETE', "'across the grass is nice' is a fragment and 'está bien' is 'fine', not 'nice'.", 'K9,P7')
add('S0505L02', K, reason="LEGO S0505L02 English 'I don't stay' vs its intro 'I don't get'; U03 'es bueno para que no me quede' is unnatural.", rule='O13', proposal="Settle the gloss against seed 505, make the intro quote it, and rebuild U03.")
add('S0505L02U03', K, reason='Follows S0505L02.', rule='', knock_on_of='S0505L02')
add('S0506L01U04', C, None, 'vivía en un buen lugar', "'un lugar bueno' is stiff; 'un buen lugar'.", 'K16')
add('S0506L02B02', C, None, 'vivía por aquí hace mucho', "'mucho antes' needs a reference point; 'long ago' is 'hace mucho'.", 'K16')
add('S0506L03B03', C, None, 'DELETE', "'truly years ago' is not English.", 'K9')
add('S0506L04B03', C, None, 'mucho antes de que nos mudáramos', "'bien antes de que' is a calque of 'well before'.", 'K16')
add('S0506L04U02', F, reason="'mudarnos de aquí' = 'move away from here'; fine.", rule='')
add('S0508L01U05', C, "that doesn't make much sense now", None, "'no tiene mucho sentido' is 'not much sense'.", 'K9')
add('S0509L01', K, reason="Seed 509 Spanish 'oí que vas a pagar una cama nueva' but LEGO S0509L01 is 'escuché' and S0509L03 'por una cama nueva': neither tiles the seed.", rule='L tiling', proposal="Make seed and LEGOs agree: either seed → 'escuché que vas a pagar por una cama nueva' or LEGOs → 'oí' / 'una cama nueva'. B01, U01 follow.")
for i in ['S0509L03', 'S0509L03B01', 'S0509L03U01']: add(i, K, reason='Follows S0509L01.', rule='L tiling', knock_on_of='S0509L01')
add('S0510L01', K, reason="Seed 510 'ha ido a buscar un sitio seguro' vs LEGOs 'se ha ido a' and 'buscar un lugar seguro': they do not tile the seed.", rule='L tiling', proposal="Make seed 510 and S0510L01/L02 agree (seed → 'se ha ido a buscar un lugar seguro' is the smallest change).")
add('S0510L02', K, reason='Follows S0510L01.', rule='L tiling', knock_on_of='S0510L01')
add('S0510L02B02', C, "she's gone to look for somewhere safe here", None, "The Spanish is 'se ha ido' (she's gone); the English said 'she went'.", 'K9')
add('S0510L02B03', C, "she's gone to look for a safe place for this", None, 'As B02.', 'K9')
add('S0510L03B03', C, "she's gone somewhere to park the car", None, 'As B02.', 'K9')
add('S0511L01U04', C, 'the news is the best thing', None, "'lo mejor' is 'the best thing'.", 'K9')
add('S0512L01B02', K, reason="LEGO 'can you hold | ¿puedes mantener' is right in the seed ('mantener la puerta abierta' = hold the door open) but its phrases use it for holding an object, which is 'sujetar'.", rule='P24,K23', proposal="P24: keep the LEGO, make every phrase supply the 'keep X open/closed/ready' frame (e.g. '¿puedes mantener la ventana abierta?'), or re-gloss the LEGO 'can you keep'. B02-B04, U01-U05 follow.")
for i in ['S0512L01B03', 'S0512L01B04', 'S0512L01U01', 'S0512L01U02', 'S0512L01U03', 'S0512L01U04', 'S0512L01U05']: add(i, K, reason='Follows S0512L01B02.', rule='P24', knock_on_of='S0512L01B02')
add('S0512L02B02', C, None, 'DELETE', "'so that the door open' has no verb on either side.", 'K9,K16')
add('S0512L02U03', F, reason="'quiero la puerta abierta' is grammatical and natural.", rule='')
add('S0512L03B03', C, 'while I fetch the keys for a moment', None, "'fetch the keys a moment' needs 'for'.", 'K9')
add('S0513L04U01', C, None, 'todo lo importante está allí arriba', "'up there' needs 'allí' (taught S0498).", 'K9')
add('S0513L04U03', C, None, '¿qué hay allí arriba?', 'As U01.', 'K9')
add('S0513L05U03', C, None, '¿qué hay allí abajo?', 'As U01.', 'K9')
add('S0514L01B03', C, None, 'lo encontré allí', "'it' is 'lo' (B01 says 'lo encontré'); 'eso' is 'that'.", 'Kai 30 Oct object rule')
add('S0514L01U05', C, 'I found it in the end', None, "'al final' = 'in the end'; 'at last' is 'por fin'.", 'K9')
add('S0514L02U05', C, None, 'DELETE', "A fragment as a USE row, and 'al final' is not 'at last'.", 'P7')
add('S0515L01B04', C, None, 'DELETE', JUNK, 'K9,K16')
add('S0515L02', K, reason="LEGO 'the new year | año nuevo' — the article sits in L01's 'del'.", rule='L both sides', proposal="Re-gloss S0515L02 English to 'new year' and check B01.")
add('S0515L02B01', K, reason='Follows S0515L02.', rule='', knock_on_of='S0515L02')
add('S0515L02B02', C, None, 'un buen ejemplo del año nuevo', "'the new year' needs 'del año nuevo'.", 'K16')
add('S0515L02B03', C, None, 'un buen año nuevo', "'un año nuevo bueno' is stiff.", 'K16')
add('S0516L02U04', C, 'they came on their own in the end', None, "'al final' = 'in the end'.", 'K9')
add('S0518', F, reason="'imaginarme teniendo' is in use; not wrong.", rule='')
add('S0518L01U05', C, None, 'DELETE', "'imagine myself a long time ago' is garbled.", 'K9')
add('S0518L02U01', C, "I couldn't imagine myself having exactly this", None, "The Spanish 'imaginarme' carries 'myself'.", 'K9')
add('S0519L02U05', C, None, 'DELETE', "'I haven't seen anything in the end' is not a natural sentence.", 'K9')
add('S0520L01', K, reason="LEGO 'it might have happened | podría haberle pasado' carries 'le' (to him/her), which only makes sense with the seed's 'a toda la familia'.", rule='L both sides,K40', proposal="Grow S0520L01 to take 'to the whole family' or cut 'le' from it ('podría haber pasado' needs 'haber' taught); B01-B04, U01-U05 and S0521L01U06 follow.")
for i in ['S0520L01B01', 'S0520L01B02', 'S0520L01B03', 'S0520L01B04', 'S0520L01U01', 'S0520L01U02', 'S0520L01U03', 'S0520L01U04', 'S0520L01U05', 'S0521L01U06']: add(i, K, reason='Follows S0520L01.', rule='', knock_on_of='S0520L01')
add('S0520L02B04', C, None, 'DELETE', JUNK, 'K9')
add('S0521L02B03', C, None, 'DELETE', JUNK, 'K9')
add('S0521L02U04', C, None, 'DELETE', "'you'll forget why it was before' has no meaning.", 'K9')
add('S0521L02U05', C, None, 'DELETE', "'you'll forget why it was yesterday' has no meaning.", 'K9')
add('S0522L02U05', C, 'it was stupid in the end', None, "'al final' = 'in the end'.", 'K9')
add('S0522L03B03', C, None, 'decir la verdad aunque duela', "'even if it hurts' takes the subjunctive.", 'K16')
add('S0524', K, reason="Seed 524 'I'll call you back' vs 'te llamaré' (no 'back'); the intro of S0524L01 also says 'call you back'.", rule='S15,O13', proposal="Seed 524 English → 'I'll call you in three or four minutes'; S0524L02U06 the same; re-voice the S0524L01 intro.")
add('S0524L01', K, reason='Follows seed 524.', rule='O13', knock_on_of='S0524')
add('S0524L02U06', K, reason='Follows seed 524.', rule='', knock_on_of='S0524')
add('S0524L02U03', C, None, 'DELETE', JUNK, 'K9')
add('S0525L01U01', C, None, 'para comprobar si estuvo aquí', "Location takes estar; 'fue aquí' is 'it took place here'.", 'K16')
add('S0525L01U03', C, 'to check if it happened before', None, "'fue antes' = 'happened before'.", 'K9')
add('S0525L02B03', C, "she told him that you've been able to finish before Thursday", 'ella le dijo que has podido terminar antes del jueves', "Reported speech with no 'que'.", 'K16')
add('S0525L02B04', C, "I'm sure that you've been able to finish directly", None, "The English had 'it'; the Spanish no object.", 'Kai 30 Oct object rule')
for i, w in [('S0526L01U01', 'aquí'), ('S0526L01U02', 'bueno'), ('S0526L01U03', 'antes'), ('S0526L01U04', 'ayer')]:
    add(i, C, None, f'me está costando creer que fuera {w}', "Disbelief after 'costar creer que' takes the subjunctive, as the seed does.", 'K16', pattern_target='costando creer que fue')
add('S0526L02U02', F, reason="'me temo que' + subjunctive is grammatical (fearing).", rule='')
add('S0527L01B02', C, None, 'DELETE', JUNK, 'K9')
add('S0527L03B04', C, None, 'DELETE', JUNK, 'K9')
add('S0528', K, reason="Seed 528 'I'm probably supposed to' vs 'probablemente debería' (should).", rule='S15', proposal="Seed 528 English → 'I should probably keep those things in another room' (English only).")
add('S0529L01', F, reason="'can you all | podéis' is right.", rule='')
add('S0531L01U03', C, "it isn't true that anyone can do it", None, "'just' had no Spanish counterpart.", 'K9')
add('S0531L02U01', C, "it isn't true that anyone can win the game", None, "'just' had no counterpart, and U06 already has this Spanish for 'anyone'.", 'K2,K9')
add('S0532L02B03', C, 'they thought that they were lucky', None, "'they thought that they're lucky' is not English; 'pensaban que tenían' is past.", 'K9')
add('S0534', K, reason="Seed 534 Spanish drops 'fuera', which its own LEGO 'no salgamos fuera' has.", rule='L tiling', proposal="Seed 534 Spanish → 'no salgamos fuera con este tiempo tan horrible'.")
add('S0534L01U04', C, "let's not go outside for anything", 'no salgamos fuera por nada', "'for everything / para todo' means nothing here.", 'K9,K16')
for i, k, t in [('S0535L01U01', 'he made a promise that it would be here', 'hizo la promesa de que estaría aquí'), ('S0535L01U02', 'he made a promise that it would be good', 'hizo la promesa de que sería bueno'), ('S0535L01U03', 'she made a promise that it would be before', 'hizo la promesa de que sería antes'), ('S0535L01U04', 'she made a promise that it would be tomorrow', 'hizo la promesa de que sería mañana'), ('S0535L01U05', 'he made a promise that everything would go well', 'hizo la promesa de que todo iría bien')]:
    add(i, C, k, t, 'A promise points forward; a promise that something already was is nonsense in both languages.', 'K9,K16', pattern_target='promesa de que fue')
add('S0535L02B04', C, None, 'DELETE', JUNK, 'K9')
add('S0535L03B02', C, None, 'DELETE', "'got lost near the wrong job' is nonsense.", 'K9')
add('S0536L01U03', C, None, 'antes pensaba que era un problema', "A state after 'pensaba que' takes 'era'.", 'K16')
add('S0537L01U04', C, None, 'pero estaba equivocado en todo', "'sobre todo' means 'above all'.", 'K16')
add('S0538L01U04', C, None, 'DELETE', "'seem to everyone' is incomplete.", 'K9')
add('S0539L01B04', C, None, 'DELETE', "'it's getting late until they are ready' is incoherent.", 'K9')
add('S0540L01B04', C, None, 'DELETE', "'if before you go' is a fragment on both sides.", 'K9')
add('S0542L01U01', C, 'whenever you feel this way', None, "'te sientas así' = 'feel this way', not 'feel like it'.", 'K9')
add('S0544L01B03', C, None, 'DELETE', JUNK, 'K9')
add('S0544L01B04', C, None, 'DELETE', JUNK, 'K9')
add('S0544L02U03', K, reason="LEGO S0544L02 'it would be difficult | que sería difícil' carries a 'que' with no English counterpart, so its rows start with a stray 'que'.", rule='L both sides', proposal="Re-gloss to 'that it would be difficult | que sería difícil' and check the basket.")

# --- gate follow-ups ---
add('S0434L02B04', K, reason="LEGO S0434L02 'students they take | los estudiantes que aceptan' is only right as a noun phrase; inside 'cuántos…' it leaves a stray 'que'. Fixing the row drops the LEGO.", rule='P24,P17', proposal="P24: rewrite B04/U04 so the LEGO stands as a noun phrase (e.g. 'could they tell us about the students they take? | ¿podrían hablarnos de los estudiantes que aceptan?' if taught), or delete both if the basket floor allows.")
add('S0434L02U04', K, reason='Follows S0434L02B04.', rule='P24', knock_on_of='S0434L02B04')
add('S0447L01U03', C, None, 'DELETE', "'¿quieres tener una comida?' is a calque of 'have a meal'; the natural 'comer' drops the LEGO 'comida'.", 'K16,P17')
add('S0447L01U06', C, None, 'DELETE', "'tener una comida con ellos' is a calque; 'comer con ellos' drops the LEGO.", 'K16,P17')
add('S0497L02U05', C, None, 'DELETE', "The row never held its LEGO 'como si necesitaras' (P17), and 'no me dijiste que necesitaras' is wrong; the indicative fix still lacks the LEGO.", 'P17,K16')
add('S0532L02B03', C, None, 'DELETE', "The row never held its LEGO 'tengan suerte', and its English was ungrammatical.", 'P17,K9')
add('S0521L02U04', K, reason="'you'll forget why it was before' means nothing, but the basket S0521L02 is at its USE floor.", rule='P23', proposal="Write two new USE rows for S0521L02 from taught words ('you'll forget why you came here | olvidarás por qué viniste aquí' if taught), then delete U04 and U05.")
add('S0521L02U05', K, reason='As U04.', rule='P23', knock_on_of='S0521L02U04')
add('S0538L01U04', K, reason="'I don't want to seem to everyone' is incomplete, and S0538L01 is at its USE floor.", rule='P23', proposal="Complete it from taught words (e.g. 'I don't want to seem rude to everyone' if an adjective is taught) or write a replacement USE row and delete it.")
add('S0522L03B03', C, 'to tell the truth even though it hurts', None, "'aunque duele' is 'even though it hurts' (fact); 'even if' would need the untaught 'duela'.", 'K14')
add('S0525L01U01', C, 'to check if it happened here', None, "'fue aquí' = 'it happened here'; the location reading needs untaught 'estuvo'.", 'K14')
add('S0526L01U01', K, reason="'me está costando creer que fue…' needs the subjunctive 'fuera' (disbelief), which is untaught at seed 526.", rule='K16,K14', proposal="Either allow 'fuera' here (seed 526 itself uses the subjunctive 'puedas') or rewrite U01-U04 with 'puedas'-type frames, or delete down to the floor.")
for i in ['S0526L01U02', 'S0526L01U03', 'S0526L01U04']: add(i, K, reason='As U01.', rule='K16', knock_on_of='S0526L01U01')
add('S0535L01U01', C, None, 'DELETE', "A promise about the past; 'estaría' is untaught and 'sería aquí' would be wrong for a location.", 'K9,K16')
add('S0535L01U05', C, 'he made a promise that everything would be good', 'hizo la promesa de que todo sería bueno', "A promise points forward; 'iría' is untaught so 'sería bueno' carries it.", 'K9,K16')
# 'al otro lado' contains the LEGO 'el otro lado' through the contraction a + el = al; the gate's word test cannot see that.
for i in ['S0488L01B02', 'S0488L01B03', 'S0488L01U01', 'S0488L01U03']:
    b, ak, at, r, ru, x = D[i]; D[i] = (b, ak, at, r + " ('al' = a + el, so the LEGO 'el otro lado' is still there.)", ru, dict(x, gate_override='contains_lego via al = a + el'))
# knock-ons of the 'past frame + present' pattern, found by reading every 'sabía que / estaba seguro de que / pensaba que' row
add('S0456L02U05', C, 'I know he might be there', 'sé que puede que esté allí', SEQ, 'K16,K14', knock_on_of='S0425L01U04')
add('S0536L01U04', C, None, 'antes pensaba que todo iba bien', "A state after 'pensaba que' takes the imperfect.", 'K16', knock_on_of='S0536L01U03')
add('S0536L01U05', C, None, 'DELETE', "'I used to think that it was yesterday' means nothing.", 'K9', knock_on_of='S0536L01U03')
