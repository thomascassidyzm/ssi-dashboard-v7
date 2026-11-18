# gla_for_eng C0108 hope -> expect. an dòchas -> dùil (Am Faclair Beag: dùil = expectation; "tha dùil agam" = I expect;
# LearnGaelic: "cha robh dùil agam ri sin" = I didn't expect that). L01 re-cut to 'we didn't expect' = 'cha robh dùil againn'.
# The two bare builds 'we didn't hope today / at all' cannot stand with expect (it needs a complement) so they take a verb (B02, B03;
# B03's live target said a-nis 'now' under the known 'at all'). L03B03's target already ended in a-nis: the known now says 'now'.
# L02 known 'to wake' -> 'to wake up'; other rows wake -> wake up, English only.
C = "gla_for_eng"
PLAN = {
 "SEED": ("We didn't expect to wake up in the middle of the night.", 'Cha robh dùil againn dùsgadh am meadhan na h-oidhche.'),
 "S0108L01": {'lego': ("we didn't expect", 'cha robh dùil againn'), 'components': [{'known': 'there was no expectation', 'target': 'cha robh dùil'}, {'known': 'at us', 'target': 'againn'}]},
 "S0108L01C01": ('there was no expectation', 'cha robh dùil'),
 "S0108L01C02": ('at us', 'againn'),
 "S0108L01B01": ("we didn't expect", 'cha robh dùil againn'),
 "S0108L01B02": ("we didn't expect to start today", 'cha robh dùil againn tòiseachadh an-diugh'),
 "S0108L01B03": ("we didn't expect to learn now", 'cha robh dùil againn ionnsachadh a-nis'),
 "S0108L01U01": ("we didn't expect to start", 'cha robh dùil againn tòiseachadh'),
 "S0108L01U02": ("we didn't expect to learn", 'cha robh dùil againn ionnsachadh'),
 "S0108L01U03": ("we didn't expect to see", 'cha robh dùil againn faicinn'),
 "S0108L01U04": ("we didn't expect to keep on", 'cha robh dùil againn leantainn orra'),
 "S0108L01U05": ("we didn't expect to find out", 'cha robh dùil againn lorg a-mach'),
 "S0108L01U06": ("we didn't expect to do hard work", 'cha robh dùil againn obair chruaidh a dhèanamh'),
 "S0108L02": {"lego": ('to wake up', None)},
 "S0108L02B01": ('to wake up', None),
 "S0108L02B02": ("we didn't expect to wake up now", 'cha robh dùil againn dùsgadh a-nis'),
 "S0108L02B03": ("it's difficult to wake up", None),
 "S0108L02U01": ("we didn't expect to wake up today", 'cha robh dùil againn dùsgadh an-diugh'),
 "S0108L02U02": ("I didn't expect to wake up", 'cha robh dùil agam dùsgadh'),
 "S0108L02U03": ("you didn't expect to wake up", 'cha robh dùil agad dùsgadh'),
 "S0108L02U04": ("I'd like to wake up", None),
 "S0108L02U05": ('I need to wake up', None),
 "S0108L02U06": ('it is important to wake up', None),
 "S0108L03B02": ('wake up in the middle of the night', None),
 "S0108L03B03": ("we didn't expect to wake up in the middle of the night now", 'cha robh dùil againn dùsgadh am meadhan na h-oidhche a-nis'),
 "S0108L03U01": ("we didn't expect to wake up in the middle of the night", 'cha robh dùil againn dùsgadh am meadhan na h-oidhche'),
 "S0108L03U02": ("I didn't expect to wake up in the middle of the night", 'cha robh dùil agam dùsgadh am meadhan na h-oidhche'),
 "S0108L03U03": ("it wasn't possible to wake up in the middle of the night", None),
 "S0108L03U04": ('I need to wake up in the middle of the night', None),
 "S0108L03U06": ('I think we need to wake up in the middle of the night', None),
}
