# ces_for_eng C0108 hope -> expect (cs #771 shard east)
# Verb: doufat (hope) -> čekat in its "expect" sense: "Nečekali jsme, že..." — the everyday Czech form (očekávat is the formal one).
# Source: Slovník spisovného jazyka českého (ssjc.ujc.cas.cz) čekati 2. "očekávat, předpokládat, nadít se (nečekal, že přijde)"; Wiktionary čekat "to expect".
C = "ces_for_eng"
PLAN = {
 "SEED": ("We didn't expect to wake up in the middle of the night.", "Nečekali jsme, že se probudíme uprostřed noci."),
 "S0108L01": {"lego": ("we didn't expect", "nečekali jsme"), "components": [{"known": "not expected", "target": "nečekali"}, {"known": "we were", "target": "jsme"}]},
 "S0108L01C01": ("not expected", "nečekali"),
 "S0108L01B01": ("we didn't expect", "nečekali jsme"),
 # live B02-B04 were word-salad ("nedoufali jsme mluvit česky teď se mnou"); rewritten as natural short builds
 "S0108L01B02": ("we didn't expect it", "nečekali jsme to"),
 "S0108L01B03": ("we didn't expect it today", "nečekali jsme to dnes"),
 "S0108L01B04": ("we didn't expect we would see it", "nečekali jsme, že to uvidíme"),
 "S0108L01U01": ("we didn't expect we would learn Czech", "nečekali jsme, že se naučíme česky"),
 "S0108L01U02": ("we didn't expect it would be possible", "nečekali jsme, že to bude možné"),
 "S0108L01U03": ("we didn't expect we would speak so well", "nečekali jsme, že budeme mluvit tak dobře"),
 "S0108L01U04": ("we didn't expect we would see so much", "nečekali jsme, že uvidíme tolik"),
 # L02: English wake -> wake up only (target untouched), plus the two hope rows
 "S0108L02": {"lego": ("to wake up in the middle of the night", None)},
 "S0108L02B01": ("to wake up in the middle of the night", None),
 "S0108L02B03": ("wake up in the middle of the night today with me", None),
 "S0108L02B04": ("wake up in the middle of the night with everyone", None),
 "S0108L02U01": ("we didn't expect to wake up in the middle of the night", "nečekali jsme, že se probudíme uprostřed noci"),
 "S0108L02U02": ("we expected we would wake up in the middle of the night", "čekali jsme, že se probudíme uprostřed noci"),
}
