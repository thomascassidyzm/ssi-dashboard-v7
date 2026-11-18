"""spa_mx_for_eng — Deborah's spa_for_eng seed corrections carried to Mexican Spanish (cs #695·AI).
Every old text below was re-read live on 18 Nov through Popty (seed/:id/baskets, lego/:id/basket)
and goes into the op's `expect`. Rule, not row: each item applies the spa_for_eng RULING to mx's own
text and decomposition (mx keeps its preterite 'no dormí', its own LEGO cuts, its own vocabulary).

Taught-before checks used the served script (learning-app release check, 18 Nov 03:29Z dump of the
29 Oct build): me gusta L:26, disfruto haciendo L:51 (gerund already taught in mx), pedir L:212,
me siento L:41, lo siento L:139, pero L:19, allí L:289, algo L:4, cómo L:3, sé L:59.
"""

PURPOSE = "cs #695·AI spa_mx_for_eng: Deborah's spa_for_eng corrections carried to Mexican Spanish (Kai Y 18 Nov)"

# family -> list of (row_id, new_known or None, new_target or None)
ROWS = {
 # B. disfrutar + infinitive -> me gusta (seed 55, as spa seed 55) / disfrutar + gerund (taught in mx at S0051L01
 # 'I enjoy doing | disfruto haciendo'). RAE DPD 'disfrutar': intransitive 'de' + noun; Fundéu: + infinitive is a calque,
 # gerund or 'de' + noun preferred. Gerund is also the course's own mx precedent ('estoy disfrutando aprendiendo').
 "B": [
  ("S0055L01B02", "I like waking up", "me gusta despertarme"),
  ("S0055L01B03", "I don't like waking up", "no me gusta despertarme"),
  ("S0055L01U02", "I don't like waking up this morning", "no me gusta despertarme esta mañana"),
  ("S0055L01U05", "I don't like waking up when I don't feel well", "no me gusta despertarme cuando no me siento bien"),
  ("S0055L01U06", "I don't like waking up when I'm a little tired", "no me gusta despertarme cuando estoy un poco cansado"),
  ("S0055L01U07", "I don't like waking up when there are other people here", "no me gusta despertarme cuando hay otras personas aquí"),
  ("S0055L01U08", "I like waking up and speaking Spanish as often as possible", "me gusta despertarme y hablar español lo más seguido posible"),
  ("S0055L02U03", "I don't like waking up when I didn't sleep very well", "no me gusta despertarme cuando no dormí muy bien"),
  ("S0056L01U04", None, "disfruto recordando unas pocas palabras con mis amigos"),
  ("S0058L01U05", None, "disfruto hablando cuando entiendes lo que quiero decir"),
  ("S0058L04U06", "I like waking up when there are enough words to learn", "me gusta despertarme cuando hay suficientes palabras para aprender"),
  ("S0059L02U06", None, "no disfruto haciendo lo que necesito hacer cuando no dormí bien"),
  ("S0061L03U04", None, "disfruto haciendo cosas diferentes otra vez esta mañana"),
  ("S0065L02U04", None, "disfruto poniéndote a prueba con palabras diferentes otra vez"),
  ("S0073L01U02", None, "muchas gracias, disfruto hablando español"),
  ("S0101L01U04", None, "estoy disfrutando hablando contigo"),
  ("S0101L01U08", None, "estoy disfrutando haciendo algo diferente"),
  ("S0101L01U09", None, "estoy disfrutando hablando español contigo"),
  ("S0103L01U08", None, "estoy disfrutando escuchando este idioma"),
  ("S0206L01U03", None, "disfruto pasando tiempo con mi hijo"),
  ("S0206L01U04", "I enjoy practising with you every week", "disfruto practicando contigo cada semana"),
  ("S0206L01U05", None, "disfruto mucho haciendo los preparativos"),
  ("S0209L02U02", None, "disfruto estando en un grupo"),
 ],
 # D. ordering with tener -> pedir (spa S0414, Deborah 12 Nov item 1). English 'ask for' = mx's taught gloss of
 # pedir (S0212L01 'to ask for'); 'order' is not on mx's known side outside pods, so the controlled known side wins.
 "D": [
  ("S0414L04U04", "could we ask for a bottle of red wine?", "¿podríamos pedir una botella de vino tinto?"),
  ("S0414L05U01", "could we ask for a bottle of red wine please?", "¿podríamos pedir una botella de vino tinto, por favor?"),
  ("S0414L05U02", "could we ask for a table please?", "¿podríamos pedir una mesa, por favor?"),
  ("S0414L05U03", "could we ask for water please?", "¿podríamos pedir agua, por favor?"),
  ("S0414L03U05", "it's important to ask for red wine", "es importante pedir vino tinto"),
 ],
 # E. liderar el camino -> liderar el proyecto (spa S0416, Deborah 12 Nov). Also clears a live ZUT: 'the way' was
 # both 'el camino' (S0416L02) and 'la manera en que' (S0491L02).
 "E": [
  ("S0416L02B01", "the project", "el proyecto"),
  ("S0416L02B02", "to lead the project", "liderar el proyecto"),
  ("S0416L02B03", "they want to lead the project", "quieren liderar el proyecto"),
  ("S0416L02U01", "she wants to lead the project", "ella quiere liderar el proyecto"),
  ("S0416L02U02", "it's important to lead the project", "es importante liderar el proyecto"),
  ("S0416L02U03", "they don't want to lead the project now", "no quieren liderar el proyecto ahora"),
  ("S0416L02U04", "it would be better to lead the project", "sería mejor liderar el proyecto"),
  ("S0416L02U05", "we could lead the project", "podríamos liderar el proyecto"),
  ("S0416L02U06", "they want to lead the project next year", "quieren liderar el proyecto el año que viene"),
  ("S0416L02U07", "we should ask about the project", "deberíamos preguntar por el proyecto"),
 ],
 # F. para caridad -> para una causa benéfica (spa S0437). 'caridad' without article for the cause is a calque of
 # 'for charity'; 'una causa benéfica' is pan-Hispanic (RAE 'benéfico, ca').
 "F": [
  ("S0437L03B01", None, "una causa benéfica"),
  ("S0437L03B02", None, "para una causa benéfica"),
  ("S0437L03B03", None, "querían recaudar lo máximo posible para una causa benéfica"),
  ("S0437L03U01", None, "queremos recaudar algo para una causa benéfica"),
  ("S0437L03U02", None, "es importante ayudar a una causa benéfica"),
  ("S0437L03U03", None, "necesitamos recaudar más para una causa benéfica"),
  ("S0437L03U04", None, "podrían recaudar lo máximo posible para una causa benéfica"),
  ("S0437L03U05", None, "querían recaudar más para una causa benéfica"),
 ],
 # G. encantador (of an experience) -> lindo. spa chose 'estupendo'; for Mexico the MEXICAN word is chosen, the rule
 # (not the row) carried: DEM (Diccionario del español de México, Colmex) 'lindo': agradable, bonito — the everyday
 # Mexican word for a lovely experience ('estuvo muy lindo'). 'lindo' is new at this LEGO; no other mx LEGO uses it.
 "G": [
  ("S0567L02B01", None, "lindo"),
  ("S0567L02B02", None, "ha sido lindo"),
  ("S0567L02B03", None, "era lindo"),
  ("S0567L02U01", None, "creo que ha sido lindo"),
  ("S0567L02U02", None, "sí, ha sido lindo"),
  ("S0567L02U03", None, "no ha sido lindo"),
  ("S0567L02U04", None, "sí, era lindo"),
  ("S0567L02U05", None, "es lindo"),
  ("S0567L03B03", None, "ha sido lindo pasar tiempo"),
  ("S0567L04B03", None, "ha sido lindo pasar tiempo al aire libre"),
  ("S0567L05B03", None, "ha sido lindo pasar tiempo al aire libre viendo a los niños jugar"),
 ],
 # J. 'no siento como si estuviera listo' -> 'no me siento listo' (spa seed 115). me siento taught S0041L01.
 "J": [
  ("S0115L02U06", "I don't feel ready for a conversation yet", "no me siento listo para una conversación todavía"),
  ("S0115L03U03", "I don't feel ready to have a conversation", "no me siento listo para tener una conversación"),
  ("S0115L03U04", "that is why I don't feel ready to have a conversation today", "por eso no me siento listo para tener una conversación hoy"),
 ],
 # L. bare intentar -> intentarlo (Deborah: always intentarlo; 38 spa rows applied). S0007 BUILD rows left: KNOWN/held in spa.
 "L": [
  ("S0079L01U05", None, "no sé cuándo, pero quiero intentarlo"),
  ("S0086L02U08", None, "no fue posible, desafortunadamente, pero voy a intentarlo"),
  ("S0088L01U05", None, "no estoy listo, desafortunadamente, pero voy a intentarlo"),
  ("S0134L01U09", None, "creo que no hay problema si quieres intentarlo"),
  ("S0147L03U08", None, "estoy nervioso pero claro que voy a intentarlo"),
 ],
 # M. practicar + infinitive (Deborah item 10).
 "M": [
  ("S0058L04U02", "I need enough words to practise Spanish", "necesito suficientes palabras para practicar español"),
  ("S0060L02U04", None, "necesito practicar cómo decir palabras diferentes cuando hablo español"),
 ],
 # N. 'sería … si + present' needs pudieras (untaught) -> infinitive, keeping each row's LEGO (sería / genial).
 "N": [
  ("S0090L03U05", "it would be good to practise more", "sería bueno practicar más"),
  ("S0090L04U02", "it would be great to speak more slowly", "sería genial hablar más despacio"),
 ],
 # O. cuando + present about the future (spa #658 seed 281).
 "O": [("S0281L01U04", "if I finish, I want to leave", "si termino, quiero irme")],
 # Q. decir de -> decir algo de (spa S0464L02U06). S0277L01B03 also gains its own LEGO (it lacked it).
 "Q": [
  ("S0277L01B03", "he told me something about the important meeting", "me dijo algo de la reunión importante"),
  ("S0286L02U01", "she told them something about the meeting", "les dijo algo de la reunión"),
  ("S0292L02U01", "she told me something about the party", "me dijo algo de la fiesta"),
 ],
 # R. 'go here' -> 'go there' (allí taught S0289L02).
 "R": [("S0668L02U04", "I hope they can go there", "espero que puedan ir allí")],
 # S. negative with algún -> positive, KEEPING the row's LEGO 'parar en algún sitio' (S0402L01). The scan's
 # 'algún lado' would drop the LEGO; mx's own 'sitio' LEGO is left for the dry-run list.
 "S": [("S0402L01U04", "we want to stop somewhere now", "queremos parar en algún sitio ahora")],
}

# seed_number -> (new_known or None, new_target or None)
SEEDS = {
 55: ("I don't like waking up when I didn't sleep very well", "no me gusta despertarme cuando no dormí muy bien"),  # B
 414: ("could we ask for a bottle of red wine please?", "¿Podríamos pedir una botella de vino tinto, por favor?"),  # D
 416: ("they want to lead the project next year", "quieren liderar el proyecto el año que viene"),  # E
 437: (None, "querían recaudar lo máximo posible para una causa benéfica"),  # F
 567: (None, "ha sido lindo pasar tiempo al aire libre viendo a los niños jugar"),  # G
 115: ("I don't feel ready to have a conversation", "no me siento listo para tener una conversación"),  # J
 139: ("I'm sorry, but I need to leave so early", "lo siento, pero necesito irme tan temprano"),  # K
 140: ("I'm sorry, but I can't see what you're trying to show me", "lo siento, pero no puedo ver lo que intentas mostrarme"),  # K
 138: ("this is where my friend wanted to meet us", None),  # T (Spanish says 'aquí es')
 419: ("if they want people to appreciate them", None),  # T (apreciar != like), as spa seed 419
}

# lego_id -> (new_known or None, new_target or None, presentation text to render or None)
LEGOS = {
 "S0416L02": ("the project", "el proyecto",
              "The Spanish for: 'the project', as in — 'they want to lead the project next year', is: <break time=\"300ms\"/> <break time=\"10ms\"/>"),
 "S0437L03": (None, "una causa benéfica", None),
 "S0567L02": (None, "lindo", None),
}
