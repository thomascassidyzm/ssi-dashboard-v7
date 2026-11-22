# fra_for_eng C0108 hope -> expect. espérions -> nous attendions à (Larousse / Le Robert: s'attendre à = "prévoir, compter sur").
# L01 re-cut to 'we didn't expect to' = 'nous ne nous attendions pas à' (the à belongs to the verb, so it sits inside the LEGO);
# every L01 row keeps its frame with the new verb. L02 known 'to wake' -> 'to wake up' and its rows likewise (English only);
# L02U05 'we hoped to wake up before tomorrow' is a natural positive hope and keeps its verb. L03U05 / L03U08 rewritten.
C = "fra_for_eng"
PLAN = {
 "SEED": ("we didn't expect to wake up in the middle of the night", 'nous ne nous attendions pas à nous réveiller au milieu de la nuit'),
 "S0108L01": {'lego': ("we didn't expect to", 'nous ne nous attendions pas à'), 'components': [{'known': "didn't expect to", 'target': 'ne nous attendions pas à'}, {'known': "we didn't expect to", 'target': 'nous ne nous attendions pas à'}]},
 "S0108L01C01": ("didn't expect to", 'ne nous attendions pas à'),
 "S0108L01B01": ("we didn't expect to", 'nous ne nous attendions pas à'),
 "S0108L01B02": ("we didn't expect to", 'nous ne nous attendions pas à'),
 "S0108L01B03": ("we didn't expect to see", 'nous ne nous attendions pas à voir'),
 "S0108L01B04": ("we didn't expect to hear", 'nous ne nous attendions pas à entendre'),
 "S0108L01U01": ("we didn't expect to understand everything", 'nous ne nous attendions pas à comprendre tout'),
 "S0108L01U02": ("we didn't expect to change the answer", 'nous ne nous attendions pas à changer la réponse'),
 "S0108L01U03": ("we didn't expect to finish that quickly", 'nous ne nous attendions pas à finir ça rapidement'),
 "S0108L01U04": ("we didn't expect to work hard on this", 'nous ne nous attendions pas à travailler dur à ça'),
 "S0108L01U05": ("we didn't expect to see what you were doing", 'nous ne nous attendions pas à voir ce que tu faisais'),
 "S0108L01U06": ("we didn't expect to hear that it's not like that", "nous ne nous attendions pas à entendre que ce n'est pas comme ça"),
 "S0108L01U07": ("that is why we didn't expect to feel happy", "c'est pour cela que nous ne nous attendions pas à nous sentir heureux"),
 "S0108L01U08": ("we didn't expect to know that he didn't know the answer", "nous ne nous attendions pas à savoir qu'il ne connaissait pas la réponse"),
 "S0108L02": {"lego": ('to wake up', None)},
 "S0108L02B01": ('to wake up', None),
 "S0108L02B02": ('need to wake up', None),
 "S0108L02B03": ("didn't want to wake up", None),
 "S0108L02U01": ("I don't want to wake up", None),
 "S0108L02U02": ('do you need to wake up?', None),
 "S0108L02U03": ('I need to wake up now', None),
 "S0108L02U05": ('we hoped to wake up before tomorrow', None),
 "S0108L02U06": ("she said she didn't want to wake up", None),
 "S0108L02U08": ("that is why I don't want to wake up now", None),
 "S0108L03B04": ('wake up in the middle of the night', None),
 "S0108L03U02": ("I don't want to wake up in the middle of the night", None),
 "S0108L03U05": ("we didn't expect to work hard in the middle of the night", 'nous ne nous attendions pas à travailler dur au milieu de la nuit'),
 "S0108L03U08": ("we didn't expect to wake up in the middle of the night", 'nous ne nous attendions pas à nous réveiller au milieu de la nuit'),
}
