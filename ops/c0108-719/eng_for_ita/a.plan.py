# eng_for_ita C0108 hope -> expect (English is the TARGET here). Known side: speravamo -> ci aspettavamo (Treccani: aspettarsi).
# L01 re-cut to 'non ci aspettavamo di' = 'we didn't expect to'; every L01 row keeps its frame. L02 English 'wake' -> 'wake up'
# (LEGO, component and every row), which is the #701 fold-in on the target side.
C = "eng_for_ita"
PLAN = {
 "SEED": ('Non ci aspettavamo di svegliarci nel mezzo della notte.', "We didn't expect to wake up in the middle of the night."),
 "S0108L01": {'lego': ('non ci aspettavamo di', "we didn't expect to"), 'components': [{'known': 'ci aspettavamo', 'target': 'expected'}, {'known': 'non ci aspettavamo di', 'target': "we didn't expect to"}]},
 "S0108L01C01": ('ci aspettavamo', 'expected'),
 "S0108L01B01": ('non ci aspettavamo di', "we didn't expect to"),
 "S0108L01B02": ('non ci aspettavamo di fare questo', "we didn't expect to do this"),
 "S0108L01B03": ('non ci aspettavamo di sentirci felici', "we didn't expect to feel happy"),
 "S0108L01U01": ('non ci aspettavamo di fare tutto allo stesso tempo', "we didn't expect to do everything at the same time"),
 "S0108L01U02": ('non ci aspettavamo di fare qualcosa di simile', "we didn't expect to do something similar"),
 "S0108L01U03": ('non ci aspettavamo di fare questo proprio adesso', "we didn't expect to do this just now"),
 "S0108L01U04": ('non ci aspettavamo di fare qualcosa di difficile', "we didn't expect to do something difficult"),
 "S0108L01U05": ('non ci aspettavamo di fare di più', "we didn't expect to do more"),
 "S0108L02": {'lego': (None, 'wake up in the middle of the night'), 'components': [{'known': 'svegliarci', 'target': 'wake up'}, {'known': 'nel mezzo della notte', 'target': 'in the middle of the night'}]},
 "S0108L02C01": (None, 'wake up'),
 "S0108L02B01": (None, 'wake up in the middle of the night'),
 "S0108L02B02": (None, "I didn't want to wake up in the middle of the night"),
 "S0108L02B03": (None, "it isn't easy to wake up in the middle of the night"),
 "S0108L02U01": ('non ci aspettavamo di svegliarci nel mezzo della notte', "we didn't expect to wake up in the middle of the night"),
 "S0108L02U02": (None, "she didn't want to wake up in the middle of the night"),
 "S0108L02U03": (None, "it isn't easy to work hard if you wake up in the middle of the night"),
 "S0108L02U04": (None, "that is why I didn't wake up in the middle of the night"),
 "S0108L02U05": ('non ci aspettavamo di svegliarci nel mezzo della notte di nuovo', "we didn't expect to wake up in the middle of the night again"),
}
