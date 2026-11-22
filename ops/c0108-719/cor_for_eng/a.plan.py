# cor_for_eng C0108 hope -> expect. govenek (hope, noun frame 'nyns esa govenek dhyn dhe ...') -> gwaytya (Gerlyver Kernewek,
# cornishdictionary.org.uk: gwaytya = to expect), in the long form the course already uses for the past ('eses ta orth y wul'):
# 'nyns esen ni ow kwaytya' = we were not expecting (ow hardens gw- to kw-). gwaytya takes the bare verbal noun, so the 'dhe' + soft
# mutation of the hope frame goes: worfenna -> gorfenna, weles -> gweles, vos -> mos, glewes -> klewes, gewsel -> kewsel, gonvedhes -> konvedhes.
# L02 follows from that: 'to wake' = 'dhe dhifuna' (M: dhe + dhifuna) becomes 'to wake up' = 'difuna' (A), which is the form the new seed
# needs and the form L03B03/U01 already use; its two component rows (dhe, dhifuna) are deleted because an A LEGO has none.
# The validator matches LEGO text literally, so the five L02 rows and L03B02 that carried the mutated 'dhe dhifuna' (after parys / govenek)
# are rewritten onto frames that take the bare verbal noun and are already live in this seed's L03 rows (ny vynnav vy, nyns yw es,
# nyns yw da genev vy, prag y fyn'ta). The two 'see' rows and the two 'finish' rows in L01 take other verbs (hear, understand, speak): bare 'gweles' is not yet course
# vocabulary (only the mutated 'weles' is; validator-probed), and 'gorfenna' was avoided for the same reason.
# Course is parked for audio (Kai, 16 Nov): text only.
C = "cor_for_eng"
PLAN = {
 "SEED": ("We didn't expect to wake up in the middle of the night.", 'nyns esen ni ow kwaytya difuna yn kres an nos'),
 "S0108L01": {'lego': ("we didn't expect", 'nyns esen ni ow kwaytya'), 'components': [{'known': 'we were not', 'target': 'nyns esen ni'}, {'known': 'expecting', 'target': 'ow kwaytya'}, {'known': 'to expect', 'target': 'gwaytya'}]},
 "S0108L01C01": ('we were not', 'nyns esen ni'),
 "S0108L01C02": ('expecting', 'ow kwaytya'),
 "S0108L01C03": ('to expect', 'gwaytya'),
 "S0108L01B01": ("we didn't expect to speak", 'nyns esen ni ow kwaytya kewsel'),
 "S0108L01B02": ("we didn't expect to hear the young dog", 'nyns esen ni ow kwaytya klewes an ki yowynk'),
 "S0108L01B03": ("we didn't expect to go home", 'nyns esen ni ow kwaytya mos tre'),
 "S0108L01U01": ("we didn't expect to hear the truth", 'nyns esen ni ow kwaytya klewes an gwir'),
 "S0108L01U02": ("we didn't expect to speak with people I don't know", 'nyns esen ni ow kwaytya kewsel gans tus na aswonnav'),
 "S0108L01U03": ("we didn't expect to understand everything", 'nyns esen ni ow kwaytya konvedhes puptra'),
 "S0108L01U04": ("we didn't expect to understand what you were doing", 'nyns esen ni ow kwaytya konvedhes an pyth eses ta orth y wul'),
 "S0108L01U05": ("we didn't expect to understand in a short time", 'nyns esen ni ow kwaytya konvedhes yn berr spys'),
 "S0108L02": {'lego': ('to wake up', 'difuna'), 'components': None},
 "S0108L02C01": 'DELETE',
 "S0108L02C02": 'DELETE',
 "S0108L02B01": ("we didn't expect to wake up", 'nyns esen ni ow kwaytya difuna'),
 "S0108L02B02": ("I don't want to wake up", 'ny vynnav vy difuna'),
 "S0108L02B03": ("it isn't easy to wake up", 'nyns yw es difuna'),
 "S0108L02U01": ("I don't want to wake up this morning", 'ny vynnav vy difuna an myttin ma'),
 "S0108L02U02": ("we didn't expect to wake up at six o'clock", 'nyns esen ni ow kwaytya difuna dhe hwegh eur'),
 "S0108L02U03": ("I don't like to wake up at six o'clock", 'nyns yw da genev vy difuna dhe hwegh eur'),
 "S0108L02U04": ("we didn't expect to wake up tonight", 'nyns esen ni ow kwaytya difuna haneth'),
 "S0108L02U05": ('why do you want to wake up this morning', "prag y fyn'ta difuna an myttin ma?"),
 "S0108L03B01": ("we didn't expect to wake up in the middle of the night", 'nyns esen ni ow kwaytya difuna yn kres an nos'),
 "S0108L03B02": ('to wake up in the middle of the night', 'difuna yn kres an nos'),
 "S0108L03U02": ("we didn't expect to speak in the middle of the night", 'nyns esen ni ow kwaytya kewsel yn kres an nos'),
}
