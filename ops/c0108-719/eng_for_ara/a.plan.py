# eng_for_ara C0108 hope -> expect (cs #771 shard east). English taught to Arabic speakers: known = Arabic (MSA, unvocalised as live), target = English.
# Known verb: نأمل في (hope for) -> نتوقع (expect), direct object: "لم نكن نتوقع الاستيقاظ". Source: Hans Wehr توقّع "to expect, anticipate"; almaany.com توقع = expect.
# Target: hope to wake -> expect to wake up (the folded-in wake -> wake up fix).
C = "eng_for_ara"
PLAN = {
 "SEED": ("لم نكن نتوقع الاستيقاظ في منتصف الليل.", "We didn't expect to wake up in the middle of the night."),
 "S0108L01": {"lego": ("لم نكن نتوقع الاستيقاظ", "we didn't expect to wake up"), "components": [{"known": "لم نكن", "target": "we didn't"}, {"known": "نتوقع الاستيقاظ", "target": "expect to wake up"}]},
 "S0108L01C02": ("نتوقع الاستيقاظ", "expect to wake up"),
 "S0108L01B01": ("لم نكن نتوقع الاستيقاظ", "we didn't expect to wake up"),
 "S0108L01B02": ("لم نكن نتوقع الاستيقاظ بهذه السرعة", "we didn't expect to wake up so quickly"),
 "S0108L01B03": ("لم نكن نتوقع الاستيقاظ الآن", "we didn't expect to wake up now"),
 "S0108L01U01": ("لم نكن نتوقع الاستيقاظ هذا الصباح", "we didn't expect to wake up this morning"),
 # live U02 duplicates B02 word for word; kept as the same pair so no new ZUT clash is created
 "S0108L01U02": ("لم نكن نتوقع الاستيقاظ بهذه السرعة", "we didn't expect to wake up so quickly"),
 "S0108L01U03": ("لم نكن نتوقع الاستيقاظ قبل الساعة السادسة", "we didn't expect to wake up before six o'clock"),
 "S0108L01U04": ("أعتقد أننا لم نكن نتوقع الاستيقاظ بعد", "I think that we didn't expect to wake up yet"),
 "S0108L01U05": ("لم نكن نتوقع الاستيقاظ في وقت مبكر", "we didn't expect to wake up soon"),
 # live L02B02: Arabic has no hope ("الاستيقاظ في منتصف الليل") but the English said 'hope to wake': English corrected
 "S0108L02B02": (None, "to wake up in the middle of the night"),
 "S0108L02B03": ("لم نكن نتوقع الاستيقاظ في منتصف الليل", "we didn't expect to wake up in the middle of the night"),
}
