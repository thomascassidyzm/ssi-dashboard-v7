# lit_for_eng C0108 hope->expect (cs #758·AI): ENGLISH SIDE ONLY, plus four touched L01 rows whose live target was broken (stray 'ir', 'ji nori', 'pamatyti tau'): tikėtis takes the genitive, which negation also forces (Lietuvių kalbos žodynas, tikėtis) - the target verb already means expect (see ../categories.json). Drafted by e_plans.py, reviewed by hand.
C = 'lit_for_eng'
PLAN = {
 'SEED': ("We didn't expect to wake up in the middle of the night.", None),
 'S0108L01': {'lego': ("we didn't expect", None)},
 'S0108L01B01': ("we didn't expect", None),
 'S0108L01B02': ("we didn't expect, we hoped", None),
 'S0108L01B03': ("we didn't expect to speak", None),
 'S0108L01B04': ("we didn't expect, she did", None),
 'S0108L01U01': ("we didn't expect to speak Lithuanian", None),
 'S0108L01U02': ("we didn't expect to understand", None),
 'S0108L01U03': ("we didn't expect to see you", None),
 'S0108L01U05': ("we didn't expect to find the answer", None),
 'S0108L02B02': ("we didn't expect to wake up", None),
 'S0108L02U04': ("we didn't expect to wake up", None),
 'S0108L03B04': ('in the middle of the night, to wake up', None),
 'S0108L03U01': ("we didn't expect to wake up in the middle of the night", None),
 'S0108L03U02': ("she doesn't want to wake up in the middle of the night", None),
 'S0108L01': {'lego': ("we didn't expect", None), 'components': [{'known': '"not"', 'target': '"ne"'}, {'known': '"we expected"', 'target': '"sitikėjome"'}]},
 'S0108L01B02': ("we didn't expect it", 'nesitikėjome to'),
 'S0108L01B03': ("we didn't expect to speak", 'nesitikėjome kalbėti'),
 'S0108L01B04': ("we didn't expect to see it", 'nesitikėjome to pamatyti'),
 'S0108L01U03': ("we didn't expect to see you", 'nesitikėjome tavęs pamatyti'),
}
