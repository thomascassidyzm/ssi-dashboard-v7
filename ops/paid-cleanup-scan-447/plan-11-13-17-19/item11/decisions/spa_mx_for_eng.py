#!/usr/bin/env python3
"""spa_mx_for_eng item-11 decisions (cs #805), hand-authored per LEGO. PLAN ONLY. Writes spa_mx_for_eng.json for
tools/plan.py. 280 scan rows in 47 baskets; every basket was read whole (the scan had read about half).
Sister-course precedent = spa_for_eng (same seeds), read from last night's copy."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import Course
C = Course('spa_mx_for_eng')
D = C.D
P17 = "P17 (every practice phrase under a LEGO contains the whole LEGO)"
CLASH = "Kai 12 Nov (no labels: a would-be clash stays inside the bigger LEGO)"
SHORT = "Kai 17 Nov (shortest LEGO cut: re-cut to the piece the basket drills, rows stay)"
L26 = "L26 (a LEGO holds only words its own seed says, on both sides)"
K32 = ("K32 (a formal LEGO keeps sir/madam on both sides; in its phrases sir/madam is always added back at the end)")

D('S0074L01', 'grow-rebuild', known='for helping me', target='por ayudarme', type='M', comps=[['for', 'por'], ['helping me', 'ayudarme']],
  why=f"The seed says 'por ayudarme'; the LEGO says 'por ayudar', which is not a word of the seed, and no row holds it as "
      f"written. Six rows drill 'por' + anything (por todo, por intentar). 'for | por' alone would be a bare preposition. The "
      f"LEGO takes the seed's own spelling, 'for helping me | por ayudarme' (4 syllables; {L26}); five rows already hold it, "
      f"six are rewritten around it. {P17}.",
  b={'B01': ('for helping me now', 'por ayudarme ahora'),
     'B02': ('thank you very much for helping me with everything', 'muchas gracias por ayudarme con todo'),
     'U01': ('thank you very much for helping me to try', 'muchas gracias por ayudarme a intentar'),
     'U02': ('thank you very much for helping me to speak slowly', 'muchas gracias por ayudarme a hablar despacio'),
     'U04': ('thank you very much for helping me to say it again', 'muchas gracias por ayudarme a decir eso otra vez'),
     'U06': ('thank you very much for helping me to speak Spanish', 'muchas gracias por ayudarme a hablar español')})

D('S0085L02', 'rebuild-rows',
  why=f"Eleven rows drill 'conozco a' + other people. A re-cut to 'I know | conozco' (the sister course's cut) would clash "
      f"here with 'I know | sé' (seed 59): {CLASH}. LEGO kept (8 syllables: co-noz-co-a-e-sas-per-so-nas is 9 written, 8 "
      f"spoken with 'a esas' run together — listed as a long LEGO); nine rows rewritten around it, two deleted. {P17}.",
  b={'B02': ('I know those people a little', 'conozco a esas personas un poco'),
     'B03': ("I don't know those people here", 'no conozco a esas personas aquí'),
     'B06': ('I know those people well', 'conozco a esas personas bien'),
     'B07': 'd', 'B08': 'd',
     'U02': ("I don't know those people, but it's fun", 'no conozco a esas personas, pero es divertido'),
     'U03': ("I know those people, it's very interesting", 'conozco a esas personas, es muy interesante'),
     'U05': ('I know those people here', 'conozco a esas personas aquí'),
     'U06': ("I don't know those people yet, but I want to", 'no conozco a esas personas todavía, pero quiero'),
     'U07': ('I like it when I know those people', 'me gusta cuando conozco a esas personas'),
     'U08': ('I know those people very well now', 'conozco a esas personas muy bien ahora')})

D('S0087L01', 'rebuild-rows',
  why=f"Three of 16 rows say 'son mis amigos / son muy interesantes' without 'personas'; deleted (7 build + 6 use stay). {P17}.",
  b={'B03': 'd', 'B06': 'd', 'U05': 'd'})

D('S0088L02', 'rebuild-rows', ack=['known'],
  why=f"Two rows start 'para aprender' without 'listo'; rewritten. The three rows that say 'ready to' for 'listo para' are "
      f"not a defect: 'para' is 'to' before a verb and 'for' before a noun, and the seed itself says 'ready to talk'. {P17}.",
  b={'B01': 'k', 'U02': 'k', 'U05': 'k',
     'B03': ('ready to learn a lot', 'listo para aprender mucho'),
     'U03': ("I'm ready for that, there's a lot to do", 'estoy listo para eso, hay mucho que hacer')})

D('S0091L01', 'rebuild-rows',
  why=f"Seven rows drill 'suficientemente' + other words (fácil, bien, importante). 'enough | suficientemente' would clash "
      f"with 'enough | suficiente' (seed 294): {CLASH}. LEGO kept at 8 syllables (su-fi-cien-te-men-te-rá-pi-do is 9 written; "
      f"the sister course keeps the same span); five rows rewritten with 'rápido', two deleted. {P17}.",
  b={'B02': ("it's not quickly enough", 'no es suficientemente rápido'), 'B06': 'd', 'B07': 'd',
     'U03': ("it's not quickly enough, but I'm trying", 'no es suficientemente rápido, pero lo estoy intentando'),
     'U05': ("it's difficult to do something quickly enough", 'es difícil hacer algo suficientemente rápido'),
     'U06': ("I think I'm doing it quickly enough", 'creo que lo estoy haciendo suficientemente rápido'),
     'U08': ("it's important to learn quickly enough", 'es importante aprender suficientemente rápido')})

D('S0094L04', 'rebuild-rows',
  why=f"Twelve rows hold the Spanish but say 'it's going to work' where the LEGO and the seed say 'it will work' (a "
      f"different word, K6): their English moves to 'it will work', Spanish unchanged. Four rows say 'manera de funcionar' "
      f"with no 'va a'; deleted (the basket keeps 7 build + 5 use). {P17}.",
  b={'B02': ('it will work', 'va a funcionar'), 'B03': ('I think it will work', 'creo que va a funcionar'),
     'B04': ('it will not work', 'no va a funcionar'), 'B05': ('it will work very well', 'va a funcionar muy bien'),
     'B06': ('I think it will work well', 'creo que va a funcionar bien'), 'B07': 'd',
     'B08': ('it will work this way', 'va a funcionar de esta manera'),
     'U01': ('I think it will work very well now', 'creo que va a funcionar muy bien ahora'),
     'U02': ('it will not work yet, unfortunately', 'no va a funcionar todavía, desafortunadamente'),
     'U03': 'd', 'U04': 'd', 'U06': 'd',
     'U05': ('it will work, I think I understand now', 'va a funcionar, creo que ya entiendo'),
     'U07': ('it will work much better this way', 'va a funcionar mucho mejor de esta manera'),
     'U08': ('it will not work this afternoon', 'no va a funcionar esta tarde')})

D('S0095L01', 'rebuild-rows',
  why=f"Every row holds the LEGO 'go | ir', so this is not a basket miss. Three rows prompt 'ready to go' and answer 'listo "
      f"para ir', while seed 26 teaches 'ready to go | listo para irme': one prompt, two answers (ZUT). They take the seed's "
      f"own 'home | a casa' so the prompt is different.",
  b={'U04': ('ready to go home', 'listo para ir a casa'),
     'U13': ('are you ready to go home?', '¿estás listo para ir a casa?'),
     'U15': ("I'm not ready to go home yet", 'no estoy listo para ir a casa todavía')})

D('S0097L02', 'rebuild-rows',
  why=f"The seed and the LEGO say 'as soon as you want'; ten rows hold 'cuando quieras' but prompt 'whenever you want' (a "
      f"different word, K6): their English moves to the LEGO's. Six rows drill 'lo que quieras' (whatever you want), another "
      f"expression: one rewritten, five deleted (3 build + 8 use stay). {P17}.",
  b={'B01': ('as soon as you want', 'cuando quieras'), 'B02': ('ready as soon as you want', 'listo cuando quieras'),
     'B03': ('yes, as soon as you want', 'sí, cuando quieras'),
     'U01': 'd', 'U03': 'd', 'U07': 'd', 'U08': 'd', 'U12': 'd',
     'U02': ('I want to go as soon as you want', 'quiero ir cuando quieras'),
     'U04': ('you can go as soon as you want', 'puedes ir cuando quieras'),
     'U05': ('as soon as you want, I am here', 'cuando quieras, aquí estoy'),
     'U06': ('I am ready as soon as you want', 'estoy listo cuando quieras'),
     'U09': ('I need to leave as soon as you want', 'necesito irme cuando quieras'),
     'U10': ('I can do it as soon as you want', 'lo puedo hacer cuando quieras'),
     'U11': ('I am going to do it as soon as you want', 'lo voy a hacer cuando quieras'),
     'U13': ('I think I can do it as soon as you want', 'creo que lo puedo hacer cuando quieras')})

D('S0101L03', 'recut-seed', known='this language', target='este idioma', type='M', comps=[['this', 'este'], ['language', 'idioma']],
  why=f"The LEGO 'this one is different | este es diferente' is not in its seed at all ('…más sobre este idioma'); the rows "
      f"drill 'este es'. {L26}. 'this | este' alone would clash with 'this | esto' (seed 92): {CLASH}. The LEGO becomes "
      f"'this language | este idioma' — exactly the sister course's LEGO for this seed. Ten rows are kept with 'idioma' put "
      f"in, six deleted (3 build + 7 use stay).",
  b={'B01': ('this language is different', 'este idioma es diferente'),
     'B02': ('this language is important', 'este idioma es importante'),
     'B03': ('this language is very fun', 'este idioma es muy divertido'),
     'U01': ('this language is what I want', 'este idioma es lo que quiero'),
     'U02': ('I think this language is great', 'creo que este idioma es genial'),
     'U03': ('this language is what I need', 'este idioma es lo que necesito'),
     'U04': ('I think this language is much better', 'creo que este idioma es mucho mejor'),
     'U06': ('this language is much more interesting', 'este idioma es mucho más interesante'),
     'U08': ('this language is very important for learning', 'este idioma es muy importante para aprender'),
     'U13': ('I am enjoying discovering more about this language', 'estoy disfrutando descubriendo más sobre este idioma'),
     'U05': 'd', 'U07': 'd', 'U09': 'd', 'U10': 'd', 'U11': 'd', 'U12': 'd'})

D('S0102L01', 'rebuild-rows', ack=['known'],
  why=f"Three of 16 rows say 'estamos disfrutando' (we are enjoying), a different verb; deleted (3 build + 10 use stay). {P17}.",
  b={'U03': 'd', 'U09': 'd', 'U13': 'd'})

D('S0106L01', 'recut-seed', known='to feel happy', target='sentirnos contentos', type='M',
  comps=[['to feel', 'sentirnos'], ['happy', 'contentos']],
  why=f"The seed says 'to feel happy | sentirnos contentos'; the LEGO says 'to feel good | sentirnos bien'. {L26}. 'to feel | "
      f"sentirnos' alone would clash with 'to feel | sentirme' (seed 41): {CLASH}. The LEGO becomes the seed's own 'to feel "
      f"happy | sentirnos contentos' (6 syllables) — exactly the sister course's LEGO. Ten rows move from 'good | bien' to "
      f"'happy | contentos', six that say 'feel like that / feel better' are deleted (3 build + 7 use stay).",
  b={'B01': ('to feel happy', 'sentirnos contentos'),
     'B02': ('we need to feel happy', 'necesitamos sentirnos contentos'),
     'B03': ('we do not need to feel happy', 'no necesitamos sentirnos contentos'),
     'U01': 'd', 'U04': 'd', 'U05': 'd', 'U07': 'd', 'U12': 'd', 'U13': 'd',
     'U02': ('it is important to feel happy', 'es importante sentirnos contentos'),
     'U03': ('that is why we want to feel happy', 'por eso queremos sentirnos contentos'),
     'U06': ('we need to feel happy to speak', 'necesitamos sentirnos contentos para hablar'),
     'U08': ('it is important to feel happy to speak well', 'es importante sentirnos contentos para hablar bien'),
     'U09': ('it is difficult to feel happy when speaking', 'es difícil sentirnos contentos cuando estamos hablando'),
     'U10': ('we need to feel happy to keep trying', 'necesitamos sentirnos contentos para seguir intentando'),
     'U11': ('we need to feel happy to keep learning', 'necesitamos sentirnos contentos para seguir aprendiendo')})

D('S0110L01', 'rebuild-rows', ack=['known'], why=f"One stray row: B01 'we are not | no somos' drops 'amigos'; rewritten. {P17}.",
  b={'B01': ('we are friends now', 'somos amigos ahora')})

D('S0122L01', 'rebuild-rows', why=f"One stray row: B01 'easier | más fácil' drops 'ser'; rewritten. {P17}.",
  b={'B01': ('going to get easier', 'va a ser más fácil')})

D('S0129L01', 'rebuild-rows',
  why=f"Eight rows drill 'tan' + other words (tan bien, tan difícil, tan interesante). 'so | tan' alone would clash with "
      f"'so | así que' (seed 149): {CLASH}. LEGO kept; six rows rewritten with 'contento', two long unrelated rows deleted "
      f"(3 build + 6 use stay). {P17}.",
  b={'B01': ('so happy now', 'tan contento ahora'), 'B02': ('so happy here', 'tan contento aquí'),
     'B03': ('not so happy', 'no tan contento'),
     'U02': ("I'm so happy today", 'estoy tan contento hoy'),
     'U04': ("that is why I'm so happy with how it's going", 'por eso estoy tan contento con cómo va'),
     'U06': ("I'm so happy that you like going by coach", 'estoy tan contento de que te guste ir en autobús'),
     'U07': 'd', 'U08': 'd'})

D('S0129L02', 'regloss-rebuild', known='happy that',
  why=f"The seed says 'happy that | contento de que'; the LEGO says 'happy about', and five of its seven rows already say "
      f"'happy that'. The English is brought back to the seed's word ({L26}); the two rows without 'contento' are rewritten. {P17}.",
  b={'B01': ('happy that you like it', 'contento de que te guste'), 'B02': 'k',
     'B03': ("I'm not happy that", 'no estoy contento de que'),
     'U01': 'k', 'U02': 'k', 'U03': 'k', 'U04': 'k'})

D('S0129L03', 'rebuild-rows', ack=['known'],
  why=f"Four rows say 'estés' + another verb (cambiando, aprendiendo, intentando) or 'estés' alone; rewritten with 'estés "
      f"haciendo'. The rows that say 'you're doing' for 'you are doing' keep (K6). {P17}.",
  b={'B01': ('that you are doing it well', 'de que lo estés haciendo bien'), 'B02': 'k', 'B03': 'k', 'U01': 'k', 'U05': 'k',
     'U02': ("I'm so excited that you are doing it", 'estoy tan emocionado de que lo estés haciendo'),
     'U03': ("I'm excited that you are doing it this way", 'estoy emocionado de que lo estés haciendo así'),
     'U04': ("I'm happy that you are doing it another time", 'estoy contento de que lo estés haciendo otra vez')})

D('S0138L02', 'recut-small', known='is where', target='es donde', type='M', comps=[['is', 'es'], ['where', 'donde']],
  why=f"No row holds 'donde mi amigo'; they drill 'donde' and 'aquí es donde'. 'where | donde' alone would clash with "
      f"'where | dónde' (seed 70): {CLASH}. {SHORT}: the piece half the rows already hold is 'is where | es donde' — exactly "
      f"the sister course's LEGO for this seed. 'mi' is taught and 'friend | amigo' is already this seed's own LEGO. Five "
      f"rows stay, five are rewritten to hold 'es donde'.",
  b={'B01': ('is where I want to be', 'es donde quiero estar'),
     'B03': ("here is where it's better", 'aquí es donde es mejor'),
     'U01': ('this is where my friend wanted to meet us', 'aquí es donde mi amigo quería reunirse con nosotros'),
     'U02': ('he knew this is where I was', 'él sabía que aquí es donde estaba'),
     'U03': ('this is where we were talking', 'aquí es donde estábamos hablando')})

D('S0152L03', 'rebuild-rows',
  why=f"Six rows say 'si él hubiera hecho', 'si ella hubiera sabido' (another verb, or a pronoun in the middle); rewritten "
      f"to hold 'si hubiera sabido'. U05 'if she had known | si hubiera sabido' keeps: 'hubiera' is both I and she. {P17}.",
  b={'B02': ('if I had known before', 'si hubiera sabido antes'), 'B03': ('if I had known that', 'si hubiera sabido eso'),
     'U01': ('yes, if I had known before', 'sí, si hubiera sabido antes'),
     'U04': ('if I had known it was important', 'si hubiera sabido que era importante'),
     'U05': 'k',
     'U06': ('I would have done it differently if I had known', 'habría hecho eso de manera diferente si hubiera sabido'),
     'U07': ('I would have done it before if I had known', 'habría hecho eso antes si hubiera sabido')})

D('S0159L01', 'recut-small', known='trying to', target='tratando de', type='M', comps=[['trying', 'tratando'], ['to', 'de']],
  why=f"Eight rows drill 'tratando de' + other verbs. {SHORT}: 'trying to | tratando de' is a seed span, no other LEGO has "
      f"'trying to'. 'to say | decir' (seed 4) is added back as a not-new LEGO. All ten rows stay. Structural: one not-new "
      f"LEGO appended.",
  extra=[C.notnew(159, 'to say', 'decir')])

D('S0161L01', 'recut-seed', known='that book', target='ese libro', type='M', comps=[['that', 'ese'], ['book', 'libro']],
  why=f"The LEGO 'not that one | no ese' is not in its seed ('¿Puedes darme ese libro…?'); rows drill 'ese' + other nouns. "
      f"{L26}. 'that | ese' alone would clash with 'that | eso' (seed 61): {CLASH}. The LEGO becomes 'that book | ese libro' "
      f"— exactly the sister course's LEGO. All eight rows rebuilt around it.",
  b={'B01': ('not that book', 'no ese libro'), 'B02': ('I want that book', 'quiero ese libro'),
     'B03': ('to give me that book', 'darme ese libro'),
     'U01': ('that book is very good', 'ese libro es muy bueno'),
     'U03': ('that book was very difficult', 'ese libro fue muy difícil'),
     'U04': ('that book was not there', 'ese libro no estaba ahí'),
     'U05': ('can you give me that book?', '¿puedes darme ese libro?'),
     'U06': ('that book is exactly the one I wanted', 'ese libro es exactamente el que quería')})

D('S0171L01', 'recut-seed', known='me to help you', target='que te ayude', type='M',
  comps=[['that', 'que'], ['you', 'te'], ['I help', 'ayude']],
  why=f"The LEGO 'help you look for it | ayude a buscarlo' says 'you' in English with no 'te' in Spanish, and 'look for it | "
      f"buscarlo' is already the seed's other LEGO; no row holds it. Rows drill '(que) te ayude'. 'help | ayude' alone would "
      f"clash with 'help | ayuda' (seed 212): {CLASH}. The LEGO becomes the seed span 'me to help you | que te ayude' (5 "
      f"syllables; {L26}). Five rows stay, five are rewritten.",
  b={'B01': ('me to help you now', 'que te ayude ahora'),
     'B02': ('do you want me to help you?', '¿quieres que te ayude?'),
     'U01': ('you want me to help you with something', 'quieres que te ayude con algo'),
     'U04': ('do you want me to help you on Sunday?', '¿quieres que te ayude el domingo?'),
     'U06': ('do you want me to help you look for it?', '¿quieres que te ayude a buscarlo?')})

D('S0176L04', 'rebuild-rows',
  why=f"Every row holds the LEGO 'year | año'; not a basket miss. Three rows say 'next year | el próximo año' while this "
      f"seed's own next LEGO teaches 'next year | año que viene': one prompt, two answers (ZUT). They take the seed's form.",
  b={'U01': ('next year', 'el año que viene'),
     'U02': ('next year I will be able to do it', 'el año que viene podré hacerlo'),
     'U07': ('I will ask him if he will be able to help next year', 'le preguntaré si podrá ayudar el año que viene')})

D('S0183L02', 'rebuild-rows', ack=['known'],
  why=f"Six rows say 'lo he hecho / lo he dicho' (done, said), not 'he visto'. 'I have | he' alone would clash with "
      f"'I have | tengo': {CLASH}. LEGO kept; rows rewritten with 'visto'. {P17}.",
  b={'B01': ('I have seen that', 'he visto eso'), 'B02': ('I have seen it today', 'lo he visto hoy'),
     'U01': ('I have seen it already', 'ya lo he visto'), 'U02': ('I have not seen it', 'no lo he visto'),
     'U03': ('I have seen it well', 'lo he visto bien'), 'U04': ('I have seen it before', 'lo he visto antes')})

D('S0183L03', 'rebuild-rows', ack=['known'],
  why=f"Three rows ask 'las has visto' (you) and one has no 'visto' at all; rewritten with 'las he visto'. The rows that "
      f"say 'I have' for 'I've' keep (K6). {P17}; K26 (the person matches on both sides).",
  b={'B01': 'k', 'B02': 'k', 'U01': 'k', 'U02': 'k',
     'B03': ("I think I've seen them", 'creo que las he visto'),
     'U03': ("I've seen them before", 'las he visto antes'),
     'U04': ("I think I've seen them here", 'creo que las he visto aquí'),
     'U05': ("I've seen them somewhere", 'las he visto en algún lado')})

D('S0202L01', 'rebuild-rows',
  why=f"All eight rows drill 'estaba' without 'nadie … seguro'. 'was | estaba' alone would clash with 'was | era' (seed "
      f"124): {CLASH}. LEGO kept at 7 syllables (na-die-es-ta-ba-se-gu-ro is 8 written); rows rebuilt, keeping their endings. {P17}.",
  b={'B01': ('nobody was sure here', 'nadie estaba seguro aquí'),
     'B02': ('nobody was sure yesterday', 'nadie estaba seguro ayer'),
     'B03': ('nobody was sure of that', 'nadie estaba seguro de eso'),
     'U01': ('nobody was sure there yesterday', 'nadie estaba seguro ahí ayer'),
     'U02': ('nobody was sure where the money was', 'nadie estaba seguro de dónde estaba el dinero'),
     'U03': ('nobody was sure in the office a while ago', 'nadie estaba seguro en la oficina hace un rato'),
     'U04': ('nobody was sure how to help', 'nadie estaba seguro de cómo ayudar'),
     'U05': ('nobody was sure what was going to happen', 'nadie estaba seguro de lo que iba a pasar')})

D('S0205L03', 'recut-small', known='I was trying', target='estaba intentando', type='M',
  comps=[['I was', 'estaba'], ['trying', 'intentando']], closes=['19'],
  why=f"The LEGO is 9 syllables (es-ta-ba-in-ten-tan-do-de-cir), over the cap of 8 (L3, hard), and seven rows drill 'estaba "
      f"intentando' + other verbs. {SHORT}: the LEGO becomes 'I was trying | estaba intentando' (7 syllables), a seed span; "
      f"no other LEGO has 'I was trying'. 'to say | decir' (seed 4) is added back as a not-new LEGO. Four rows stay; two "
      f"build rows gain 'estaba'; two rows that say 'she was trying' for 'estaba' take the LEGO's 'I'. Also closes this LEGO "
      f"for item 19. Structural: one not-new LEGO appended.",
  b={'B01': ('I was trying to say', 'estaba intentando decir'),
     'B03': ('I was trying to do it', 'estaba intentando hacerlo'),
     'U02': ('I was trying to do it in time', 'estaba intentando hacerlo a tiempo'),
     'U04': ('I was trying to help with the arrangements', 'estaba intentando ayudar con los preparativos')},
  extra=[C.notnew(205, 'to say', 'decir')])

D('S0209L03', 'grow-rebuild', target='reuniéndose como grupo',
  why=f"The LEGO's Spanish says 'reuniéndose EN grupo'; the seed says 'reuniéndose COMO grupo', and no row holds the LEGO as "
      f"written. {L26}; K8 (target side: exactly the taught form). 'meeting | reuniéndose' alone would clash with 'meeting | "
      f"reunión' (seed 277, this plan): {CLASH}. The LEGO takes the seed's own words; three rows already hold them, five "
      f"are rewritten.",
  b={'B02': ('meeting as a group to talk', 'reuniéndose como grupo para hablar'),
     'B03': ('meeting as a group in the office', 'reuniéndose como grupo en la oficina'),
     'U01': ('meeting as a group would be more useful', 'reuniéndose como grupo sería más útil'),
     'U02': ('meeting as a group in the office is what they want', 'reuniéndose como grupo en la oficina es lo que quieren'),
     'U03': ('meeting as a group to talk about the arrangements', 'reuniéndose como grupo para hablar de los preparativos')})

D('S0211L01', 'rebuild-rows',
  why=f"Ten of twelve rows say 'nos dijo' (he/she told us), not the LEGO's 'nos dijeron' (they told us). The LEGO is the "
      f"seed's. The ten rows move to 'they'. {P17}; K26 (the person matches on both sides).",
  b={'B01': ('they told us', 'nos dijeron'), 'B02': ('they told us something', 'nos dijeron algo'),
     'B03': ('they told us everything', 'nos dijeron todo'),
     'U01': ('they told us yesterday', 'nos dijeron ayer'),
     'U02': ('they told us the truth', 'nos dijeron la verdad'),
     'U03': ('they told us that it was easy', 'nos dijeron que era fácil'),
     'U04': ('they told us that it was better', 'nos dijeron que era mejor'),
     'U05': ('they told us that it was difficult', 'nos dijeron que era difícil'),
     'U06': ('they told us that it was done', 'nos dijeron que estaba hecho'),
     'U07': ('they told us it was the same thing', 'nos dijeron que era lo mismo')})

D('S0213L02', 'rebuild-rows', ack=['known'],
  why=f"Eight rows say 'están aquí / están ahí' (they are here) without 'intentando'. 'they are | están' alone is taught "
      f"later as its own LEGO (seed 424), so a re-cut would make that one a duplicate. LEGO kept; rows rewritten. {P17}.",
  b={'B01': ('they are trying to do it', 'están intentando hacerlo'),
     'B02': ('they are trying to help', 'están intentando ayudar'),
     'B03': ('they are not trying', 'no están intentando'),
     'U02': ('they are not trying yet', 'todavía no están intentando'),
     'U03': ("we don't know what they are trying to do", 'no sabemos lo que están intentando hacer'),
     'U04': ("we don't know if they are trying", 'no sabemos si están intentando'),
     'U05': ('they said they are trying already', 'dijeron que ya están intentando'),
     'U06': ('they told us they are trying', 'nos dijeron que están intentando')})

D('S0217L01', 'rebuild-rows', ack=['known', 'target'],
  why=f"One row (B02 'I took that | tomé eso') drops 'lo'; rewritten. The rows that say 'I had it' for 'lo tomé' keep (the "
      f"seed itself says 'I had' for 'tomé'). NOTE, not planned here: the LEGO 'I took it | lo tomé' is not a span of its "
      f"seed ('tomé un vaso…'); the sister course has 'I took | tomé'. That is the 'LEGO says what its seed does not' "
      f"family. {P17}.",
  b={'B02': ('yes I took it', 'sí lo tomé'), 'B03': 'k', 'U01': 'k', 'U03': 'k', 'U04': 'k'})

D('S0229L02', 'rebuild-rows',
  why=f"Nine rows drill 'esa' + other nouns (esa cosa, esa pregunta). 'that | esa' alone would clash with 'that | eso' "
      f"(seed 61): {CLASH}. LEGO kept; rows rewritten with 'esa mujer'. {P17}.",
  b={'B01': ('with that woman', 'con esa mujer'), 'B03': ('that woman there', 'esa mujer ahí'),
     'U01': ('I know that woman', 'conozco a esa mujer'),
     'U02': ('that woman is my friend', 'esa mujer es mi amiga'),
     'U03': ('that woman is difficult to find', 'esa mujer es difícil de encontrar'),
     'U04': ('that woman was useful for the group', 'esa mujer fue útil para el grupo'),
     'U05': ('that woman would help you', 'esa mujer te ayudaría'),
     'U06': ('that woman is exactly what we need', 'esa mujer es exactamente lo que necesitamos'),
     'U07': ('that woman I saw on Saturday was pleasant', 'esa mujer que vi el sábado fue agradable')})

D('S0233L01', 'recut-small', known='knows', target='conoce', type='A', comps=[],
  why=f"All ten rows drill 'conoce' + other objects; none says 'a tu hermana'. {SHORT}: 'knows | conoce' is a seed word and "
      f"no other LEGO has 'knows' on its own. 'sister | hermana' is already the seed's other LEGO; 'a' and 'tu' are taught. "
      f"Eight rows stay. Two say 'conoce la respuesta' for 'knows the answer', which seed 290 teaches as 'sabe la respuesta' "
      f"(and is wrong Spanish for a fact): they take a person as object.",
  b={'B01': ('she knows', 'conoce'), 'B02': 'k',
     'U04': ('he knows my sister', 'conoce a mi hermana'),
     'U07': ('she knows your sister', 'conoce a tu hermana')})

D('S0251L02', 'rebuild-rows',
  why=f"Eight rows drill 'después de que' + other clauses. 'after | después de que' would clash with 'after | después de' "
      f"(seed 110): {CLASH}. LEGO kept at 8 syllables (des-pués-de-que-ter-mi-ne-mos, at the cap); seven rows rewritten, one "
      f"deleted. {P17}.",
  b={'B01': ('until after we finish', 'hasta después de que terminemos'),
     'B02': ('yes, after we finish', 'sí, después de que terminemos'),
     'B03': ('not until after we finish', 'no hasta después de que terminemos'),
     'B04': 'd',
     'U01': ('I can help after we finish', 'puedo ayudar después de que terminemos'),
     'U03': ('after we finish I can help', 'después de que terminemos puedo ayudar'),
     'U05': ('I want to speak after we finish', 'quiero hablar después de que terminemos'),
     'U06': ('after we finish I want to find it out', 'después de que terminemos quiero descubrirlo')})

D('S0266L01', 'rebuild-rows',
  why=f"Seven rows drill 'viejo' alone (es muy viejo, hombre viejo). 'old | viejo' would clash with 'old | viejos' (seed "
      f"350): {CLASH}. LEGO kept; rows rewritten with 'viejo amigo'. {P17}.",
  b={'B01': ("he's an old friend", 'es un viejo amigo'), 'B03': ('my old friend', 'mi viejo amigo'),
     'U01': ('I want to see an old friend', 'quiero ver a un viejo amigo'),
     'U02': ("that's my old friend", 'ese es mi viejo amigo'),
     'U03': ('she knows an old friend there', 'conoce a un viejo amigo ahí'),
     'U04': ("I think he's an old friend", 'pienso que es un viejo amigo'),
     'U05': ('that old friend told me something', 'ese viejo amigo me dijo algo')})

D('S0267L01', 'rebuild-rows', ack=['known'],
  why=f"All eight rows drill 'has tenido / he tenido' + other objects (tiempo, un problema). 'have you had | has tenido' is "
      f"not the seed's English, and 'news | noticias' is the seed's other LEGO, so the LEGO stays as the seed's phrase and "
      f"the rows are rebuilt with 'noticias'. {P17}.",
  b={'B01': ('have you had news today?', '¿has tenido noticias hoy?'),
     'B02': ('have you had news yet?', '¿has tenido noticias ya?'),
     'B03': ('have you had news from him?', '¿has tenido noticias de él?'),
     'U01': ('have you had news from your father?', '¿has tenido noticias de tu padre?'),
     'U02': ('have you had news this week?', '¿has tenido noticias esta semana?'),
     'U03': ('have you had news about that?', '¿has tenido noticias de eso?'),
     'U04': ('have you had news from your sister?', '¿has tenido noticias de tu hermana?'),
     'U05': ('have you had news from your friend?', '¿has tenido noticias de tu amigo?')})

D('S0272L01', 'rebuild-rows',
  why=f"Four rows drill 'gran' + other nouns. 'great | gran' would clash with 'great | genial' (seed 90): {CLASH}. LEGO "
      f"kept; the four rows rewritten. {P17}.",
  b={'B02': ("it's a great idea", 'es una gran idea'), 'B03': ("that's a great idea", 'eso es una gran idea'),
     'U01': ('yes, a great idea', 'sí, una gran idea'),
     'U03': ('it was a great idea of my father', 'era una gran idea de mi padre')})

D('S0277L01', 'recut-small', known='meeting', target='reunión', type='A', comps=[],
  why=f"Seven rows drill 'reunión' without 'importante'. {SHORT}: 'meeting | reunión' is a seed word, no other LEGO has "
      f"'meeting' alone (seed 209 keeps its bigger LEGO in this plan). 'una' is taught and 'important | importante' (seed "
      f"65) is added back as a not-new LEGO. All eight rows stay. Structural: one not-new LEGO appended.",
  extra=[C.notnew(277, 'important', 'importante')])

D('S0277L02', 'kai',
  why="HOLD — KAI: the LEGO 'early next week | a principios de la próxima semana' is not its seed's Spanish (the seed says "
      "'a principios de la semana que viene') and is 13 syllables, so no rebuild of its rows can be right until it is re-cut. "
      "The two cuts both break a rule: 'early | a principios de' clashes with 'early | temprano' (seed 139), and the sister "
      "course's 'at the beginning of | a principios de' + 'next week | la semana que viene' uses English the seed does not "
      "say (and here 'la semana que viene' is taught as 'the coming week' at seed 186, 'next week' as 'la próxima semana' "
      "at seed 59). Recommended: the sister course's cut, with the nine rows then kept almost as they are (they already say "
      "'at the beginning of the month'). Belongs with the 'LEGO says what its seed does not' and over-8-syllables families.")

D('S0283L03', 'recut-small', known='speak', target='hablan', type='A', comps=[],
  why=f"Six rows drill 'hablan' without 'tus amigos'. {SHORT}: 'speak | hablan' is a seed word, no other LEGO has 'speak' "
      f"alone; 'your | tus' is already the seed's own LEGO and 'amigos' is taught. All nine rows stay.")

D('S0284L01', 'recut-seed', known='do you know', target='conoces a', type='M', comps=[['do you know', 'conoces'], ['', 'a']],
  why=f"The LEGO 'you know my sister | conoces a mi hermana' is not a span of its seed ('¿Conoces a la amiga de mi "
      f"hermana?'); rows drill 'conoces' + other people. {L26}. The LEGO becomes 'do you know | conoces a' — exactly the "
      f"sister course's LEGO for this seed; no LEGO here has 'do you know'. 'friend | amiga' (seed 136) and 'sister | "
      f"hermana' (seed 233) are added back as not-new LEGOs. Two rows stay, six become 'do you know …?' questions. "
      f"Structural: two not-new LEGOs appended.",
  b={'B01': ('do you know my sister?', '¿conoces a mi hermana?'),
     'B02': ('do you know my father?', '¿conoces a mi padre?'),
     'B03': ('do you know my friend?', '¿conoces a mi amigo?'),
     'U02': ('do you know that woman?', '¿conoces a esa mujer?'),
     'U05': ('do you know that old man?', '¿conoces a ese hombre viejo?'),
     'U06': ('do you know someone here?', '¿conoces a alguien aquí?')},
  extra=[C.notnew(284, 'friend', 'amiga'), C.notnew(284, 'sister', 'hermana')])

D('S0289L02', 'rebuild-rows',
  why=f"Eight rows drill 'allí' without 'esta tarde'. 'there | allí' alone would clash with 'there | ahí' (seed 157): "
      f"{CLASH}. LEGO kept (5 syllables); rows gain 'esta tarde'. {P17}.",
  b={'B01': ('to be there this afternoon', 'estar allí esta tarde'),
     'B02': ('is he there this afternoon?', '¿está allí esta tarde?'),
     'B03': ('she is there this afternoon', 'ella está allí esta tarde'),
     'U01': ("I don't want to go there this afternoon", 'no quiero ir allí esta tarde'),
     'U02': ('who is there this afternoon?', '¿quién está allí esta tarde?'),
     'U03': ('I would like to go there this afternoon', 'me gustaría ir allí esta tarde'),
     'U04': ('she told me she was there this afternoon', 'me dijo que estaba allí esta tarde'),
     'U05': ('the people who are there this afternoon speak Spanish', 'las personas que están allí esta tarde hablan español')})

D('S0290L02', 'rebuild-rows',
  why=f"Six of seven rows say 'él sabe', 'ella sabe', '¿quién sabe?' without 'la respuesta' or with another subject. "
      f"'knows | sabe' would clash with 'knows | conoce' (seed 233, this plan): {CLASH}. LEGO kept at 7 syllables "
      f"(él-sa-be-la-res-pues-ta); rows rebuilt. {P17}.",
  b={'B01': ('I think he knows the answer', 'pienso que él sabe la respuesta'),
     'B03': ('yes, he knows the answer', 'sí, él sabe la respuesta'),
     'U01': ('she said he knows the answer', 'dijo que él sabe la respuesta'),
     'U02': ('do you think he knows the answer?', '¿piensas que él sabe la respuesta?'),
     'U03': ('of course he knows the answer', 'claro que él sabe la respuesta'),
     'U04': ('he knows the answer now', 'él sabe la respuesta ahora')},
  add=[('b', 'but he knows the answer', 'pero él sabe la respuesta')])

D('S0292L01', 'rebuild-rows', ack=['known'],
  why=f"Two rows say 'cuando puedas' and 'necesito que puedas' without 'espero'; rewritten. The basket had only 2 build + 4 "
      f"use rows, so one build and one use row are added. {P17}.",
  b={'B01': ('yes I hope you can', 'sí espero que puedas'),
     'U01': ('I hope you can finish', 'espero que puedas terminar')},
  add=[('b', 'I hope you can do it', 'espero que puedas hacerlo'),
       ('u', 'I hope you can come to the party', 'espero que puedas venir a la fiesta')])

D('S0297L02', 'rebuild-rows',
  why=f"Three rows say 'que hablen español' without 'personas'; rewritten. {P17}.",
  b={'B01': ('many people who speak Spanish', 'muchas personas que hablen español'),
     'B02': ('I want people who speak Spanish', 'quiero personas que hablen español'),
     'U03': ('I want people who speak Spanish at the meeting', 'quiero personas que hablen español en la reunión')})

D('S0542L01', 'rebuild-rows', ack=['known'],
  why=f"One row (U04) says 'te sientes' (the plain form), not the LEGO's 'te sientas'; rewritten. The two rows that say "
      f"'you to feel' for 'you be feeling' keep (K6). {P17}; K8 (exactly the taught form).",
  b={'U02': 'k', 'U03': 'k', 'U04': ("it's good that you be feeling well", 'es bueno que te sientas bien')})

D('S0643L01', 'grow-rebuild', target='quiere usted, señor',
  why=f"The LEGO says 'sir' in English with no 'señor' in Spanish, and so do seven of its rows. {K32}. The seed is "
      f"'¿Quiere usted, señor?': the LEGO takes 'señor', and every row ends in 'señor' as its English already ends in "
      f"'sir'. (The sister course drops 'sir' instead; the canon rule is to keep it.) The checker's 'does not contain the "
      f"LEGO' on these rows is that rule at work.",
  b={'B01': ('do you want, sir', 'quiere usted, señor'),
     'B02': ('yes, do you want, sir', 'sí, quiere usted, señor'),
     'B03': ('do you want more, sir', 'quiere usted más, señor'),
     'U01': ('do you want that, sir?', '¿quiere usted eso, señor?'),
     'U02': ('I believe you want that, sir', 'creo que quiere usted eso, señor'),
     'U03': ('do you want help, sir?', '¿quiere usted ayuda, señor?'),
     'U04': ('do you want coffee, sir?', '¿quiere usted café, señor?')})

D('S0668L02', 'rebuild-rows', ack=['known'],
  why=f"One row (U03) says 'pueden' (the plain form), not the LEGO's 'puedan'; rewritten. U05 is the seed sentence and "
      f"keeps. {P17}; K8 (exactly the taught form).",
  b={'U03': ('I hope they can go now', 'espero que puedan ir ahora'), 'U05': 'k'})

C.write()
