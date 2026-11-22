# eng_for_fra C0108 hope -> expect (English is the TARGET here). Known side: espérions -> nous attendions à (Larousse: s'attendre à).
# L01 re-cut to 'nous ne nous attendions pas à' = 'we didn't expect to'; every L01 row keeps its frame. L02 / L03 rows that said
# 'didn't hope' follow. English already said 'wake up' everywhere except the seed.
C = "eng_for_fra"
PLAN = {
 "SEED": ('Nous ne nous attendions pas à nous réveiller au milieu de la nuit.', "We didn't expect to wake up in the middle of the night."),
 "S0108L01": {'lego': ('nous ne nous attendions pas à', "we didn't expect to"), 'components': [{'known': 'nous nous attendions', 'target': 'we expected'}, {'known': 'pas', 'target': 'not'}]},
 "S0108L01C01": ('nous nous attendions', 'we expected'),
 "S0108L01B01": ('nous ne nous attendions pas à', "we didn't expect to"),
 "S0108L01B02": ('nous ne nous attendions pas à comprendre', "we didn't expect to understand"),
 "S0108L01B03": ('nous ne nous attendions pas à parler', "we didn't expect to speak"),
 "S0108L01U01": ('nous ne nous attendions pas à sentir ça', "we didn't expect to feel that"),
 "S0108L01U02": ('nous ne nous attendions pas à travailler dur', "we didn't expect to work hard"),
 "S0108L01U03": ('malheureusement nous ne nous attendions pas à comprendre', "unfortunately we didn't expect to understand"),
 "S0108L01U04": ('nous ne nous attendions pas à essayer quelque chose de différent', "we didn't expect to try something different"),
 "S0108L01U05": ('nous ne nous attendions pas à répondre à ça', "we didn't expect to answer that"),
 "S0108L02B02": ('nous ne nous attendions pas à nous réveiller', "we didn't expect to wake up"),
 "S0108L02U02": ('nous ne nous attendions pas à nous réveiller maintenant', "we didn't expect to wake up now"),
 "S0108L03B03": ('nous ne nous attendions pas à nous réveiller au milieu de la nuit', "we didn't expect to wake up in the middle of the night"),
 "S0108L03U02": ("c'est pour ça que nous ne nous attendions pas à nous réveiller au milieu de la nuit", "that's why we didn't expect to wake up in the middle of the night"),
 "S0108L03U05": ("nous ne nous attendions pas à nous réveiller au milieu de la nuit mais c'est comme ça", "we didn't expect to wake up in the middle of the night but it's like that"),
}
