# fin_for_eng C0108 hope -> expect (cs #771 shard east)
# Verb: toivoa (hope) -> odottaa in its "expect" sense, in the course's spoken register (me ei toivottu -> me ei odotettu).
# Source: Kielitoimiston sanakirja (kielitoimistonsanakirja.fi) odottaa 2. "pitää jtak todennäköisenä, otaksua jtak tapahtuvaksi"; Wiktionary odottaa "to wait; to expect".
# Seed casing/no full stop kept as live.
C = "fin_for_eng"
PLAN = {
 "SEED": ("we didn't expect to wake up in the middle of the night", "Me ei odotettu, että herätään keskellä yötä"),
 "S0108L01": {"lego": ("we didn't expect", "me ei odotettu, että"), "components": [{"known": "we", "target": "me"}, {"known": "didn't expect", "target": "ei odotettu"}, {"known": "that", "target": "että"}]},
 "S0108L01C02": ("didn't expect", "ei odotettu"),
 "S0108L01B01": ("we didn't expect", "me ei odotettu, että"),
 "S0108L01B02": ("we didn't expect that you speak", "me ei odotettu, että sä puhut"),
 "S0108L01B03": ("we didn't expect that you understand", "me ei odotettu, että sä ymmärrät"),
 "S0108L01U01": ("we didn't expect that you speak Finnish", "me ei odotettu, että sä puhut suomea"),
 "S0108L01U02": ("we didn't expect that it works", "me ei odotettu, että se toimii"),
 "S0108L01U03": ("we didn't expect that you want to come back", "me ei odotettu, että sä haluut tulla takaisin"),
 "S0108L01U04": ("we didn't expect that we see it", "me ei odotettu, että me nähdään se"),
 "S0108L01U05": ("we didn't expect that you did it", "me ei odotettu, että sä teit sen"),
 "S0108L02B01": ("we didn't expect that we wake up", "me ei odotettu, että herätään"),
 "S0108L02B02": ("we wake up now", None),
 "S0108L02B03": ("we wake up this morning", None),
 "S0108L02U01": ("we didn't expect that we wake up this morning", "me ei odotettu, että herätään tänä aamuna"),
 "S0108L02U02": ("I don't want us to wake up now", None),
 "S0108L02U03": ("it's not good that we wake up now", None),
 "S0108L02U04": ("I'm not sure when we wake up", None),
 "S0108L02U05": ("we wake up this evening", None),
 "S0108L03B02": ("to wake up in the middle of the night", None),
 "S0108L03U01": ("we didn't expect to wake up in the middle of the night", "me ei odotettu, että herätään keskellä yötä"),
 "S0108L03U02": ("I don't want to wake up in the middle of the night", None),
 "S0108L03U04": ("I don't want us to wake up in the middle of the night", None),
 "S0108L03U05": ("I'm not sure why we wake up in the middle of the night", None),
}
