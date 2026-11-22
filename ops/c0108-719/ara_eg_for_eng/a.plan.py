# ara_eg_for_eng C0108 hope -> expect (cs #771 shard east). Egyptian Arabic.
# Verb: نتمنى (we hope) -> متوقعين (participle "expecting", plural): "إحنا ماكناش متوقعين..." is the everyday Egyptian way to say "we didn't expect"
# (cf. the fixed phrase "مكنتش متوقع"). Source: Badawi & Hinds, A Dictionary of Egyptian Arabic, و ق ع: اتوقّع "to expect", متوقّع "expecting/expected"; Wiktionary توقع "to expect".
# L01 keeps its live shape (M, 'we' + citation form, strings carrying the course's literal double quotes): hope/أتمنى -> expecting/متوقع.
C = "ara_eg_for_eng"
PLAN = {
 "SEED": ("We didn't expect to wake up in the middle of the night.", "إحنا ماكناش متوقعين نصحى في نص الليل.", "ihna makunnaash mitwaqqa'iin nisha fi nuss il-leel."),
 "S0108L01": {"lego": ("we expect", "متوقعين"), "components": [{"known": "\"we\"", "target": "\"إحنا\""}, {"known": "\"expecting\"", "target": "\"متوقع\""}], "roman": "mitwaqqa'iin"},
 "S0108L01C02": ("\"expecting\"", "\"متوقع\"", "mitwaqqa'"),
 "S0108L01B02": ("we didn't expect", "ماكناش متوقعين", "makunnaash mitwaqqa'iin"),
 "S0108L01B03": ("we expect to meet", "متوقعين نتقابل", "mitwaqqa'iin nit'aabil"),
 "S0108L01U01": ("we didn't expect that", "إحنا ماكناش متوقعين ده", "ihna makunnaash mitwaqqa'iin da"),
 "S0108L01U02": ("we expect to meet tomorrow", "إحنا متوقعين نتقابل بكرة", "ihna mitwaqqa'iin nit'aabil bukra"),
 "S0108L01U03": ("we expect to meet soon", "إحنا متوقعين نتقابل قريب", "ihna mitwaqqa'iin nit'aabil 'urayyib"),
 "S0108L01U04": ("we didn't expect to go now", "إحنا ماكناش متوقعين نمشي دلوقتي", "ihna makunnaash mitwaqqa'iin nimshi dilwa'ti"),
 "S0108L01U05": ("we expect to say something good", "إحنا متوقعين نقول حاجة كويسة", "ihna mitwaqqa'iin ni'uul haaga kuwayyisa"),
 "S0108L02B02": ("expect to wake up", "متوقعين نصحى", "mitwaqqa'iin nisha"),
 "S0108L02B03": ("didn't expect to wake up", "ماكناش متوقعين نصحى", "makunnaash mitwaqqa'iin nisha"),
 "S0108L02U02": ("we expect to wake up on time", "إحنا متوقعين نصحى في الوقت", "ihna mitwaqqa'iin nisha fi il-wa't"),
 "S0108L02U03": ("we didn't expect to wake up now", "إحنا ماكناش متوقعين نصحى دلوقتي", "ihna makunnaash mitwaqqa'iin nisha dilwa'ti"),
 "S0108L02U06": ("we expect to wake up before tomorrow night", "إحنا متوقعين نصحى قبل ما يبقى الليلة", "ihna mitwaqqa'iin nisha 'abl ma yib'a il-leela"),
 "S0108L03B03": ("didn't expect to wake up in the middle of the night", "ماكناش متوقعين نصحى في نص الليل", "makunnaash mitwaqqa'iin nisha fi nuss il-leel"),
 "S0108L03U01": ("we didn't expect to wake up in the middle of the night", "إحنا ماكناش متوقعين نصحى في نص الليل", "ihna makunnaash mitwaqqa'iin nisha fi nuss il-leel"),
 "S0108L03U02": ("we didn't expect to go in the middle of the night", "إحنا ماكناش متوقعين نمشي في نص الليل", "ihna makunnaash mitwaqqa'iin nimshi fi nuss il-leel"),
 "S0108L03U05": ("we expect to go home in the middle of the night", "إحنا متوقعين نمشي البيت في نص الليل", "ihna mitwaqqa'iin nimshi il-beet fi nuss il-leel"),
}
