# mlt_for_eng C0108 hope -> expect. ttamajna -> stennejna (Aquilina, Maltese-English Dictionary: stenna = to wait for, to expect;
# 'ma stennejniex li ...' = we didn't expect that ...). stenna takes li + clause, so the seed gains 'li' (already used in this basket:
# 'li kien possibbli'). L03 re-cut to 'we didn't expect' = 'ma stennejniex'; the two bare rows ('i know we didn't hope',
# 'unfortunately we didn't hope') take an object because expect needs one. L01: known 'we wake' -> 'we wake up' (English only), and
# B02, which already said 'we wake up' for 'nqumu issa', now says 'we wake up now' (was one known -> two targets once L01 changes).
C = "mlt_for_eng"
PLAN = {
 "SEED": ("We didn't expect to wake up in the middle of the night.", "Ma stennejniex li nqumu f'nofs il-lejl."),
 "S0108L01": {'lego': ('we wake up', None)},
 "S0108L01B01": ('we wake up', None),
 "S0108L01B02": ('we wake up now', None),
 "S0108L01U05": ('i know when we wake up', None),
 "S0108L01U06": ('we wake up and continue', None),
 "S0108L02B02": ('wake up in the middle of the night', None),
 "S0108L02U02": ('unfortunately we wake up in the middle of the night', None),
 "S0108L02U03": ("we don't want to wake up in the middle of the night", None),
 "S0108L03": {'lego': ("we didn't expect", 'ma stennejniex'), 'components': [{'known': 'not', 'target': 'ma'}, {'known': 'we expected', 'target': 'stennejniex'}]},
 "S0108L03C02": ('we expected', 'stennejniex'),
 "S0108L03B01": ("we didn't expect", 'ma stennejniex'),
 "S0108L03B02": ("we didn't expect to wake up", 'ma stennejniex li nqumu'),
 "S0108L03B03": ("we didn't expect it to be possible", 'ma stennejniex li kien possibbli'),
 "S0108L03U01": ("we didn't expect to wake up in the middle of the night", "ma stennejniex li nqumu f'nofs il-lejl"),
 "S0108L03U02": ("we didn't expect this", 'ma stennejniex dan'),
 "S0108L03U03": ("we didn't expect it to work", 'ma stennejniex li jaħdem'),
 "S0108L03U04": ("i know we didn't expect this", 'naf li ma stennejniex dan'),
 "S0108L03U05": ("unfortunately we didn't expect it to work", 'sfortunatament ma stennejniex li jaħdem'),
 "S0108L03U06": ("we didn't expect it to be easy", 'ma stennejniex li kien faċli'),
}
