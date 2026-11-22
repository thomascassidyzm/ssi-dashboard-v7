# ukr_for_eng C0108 hope -> expect (cs #771 shard east)
# TARGET VERB KEPT: Ukrainian сподіватися already means "expect" as well as "hope", and in the negative past ("не сподівалися + inf") it is the
# ordinary way to say "didn't expect". Source: Словник української мови (СУМ-11, sum.in.ua) СПОДІВАТИСЯ 2. "вважати щось можливим, імовірним; очікувати";
# Wiktionary сподіватися "to hope; to expect". So only the English changes (didn't hope -> didn't expect) and nothing is left uncovered
# (seed 108 has no hope LEGO of its own; очікували would have been an untaught word).
# Positive rows "we hoped to wake" stay "hoped" (сподівалися in the positive reads as hoped): English wake -> wake up only.
C = "ukr_for_eng"
PLAN = {
 "SEED": ("We didn't expect to wake up in the middle of the night.", None),
 "S0108L01": {"lego": ("to wake up", None)},
 "S0108L01B01": ("we didn't expect to wake up", None),
 "S0108L01B02": ("I want to wake up now", None),
 "S0108L01B03": ("I need to wake up", None),
 "S0108L01U01": ("I need to wake up now", None),
 "S0108L01U02": ("I want to wake up and speak Ukrainian", None),
 "S0108L01U03": ("I'm going to try to wake up", None),
 "S0108L01U04": ("we hoped to wake up", None),
 "S0108L01U05": ("I didn't want to wake up today", None),
 "S0108L02B02": ("wake up in the middle of the night", None),
 "S0108L02B03": ("I want to wake up in the middle of the night", None),
 "S0108L02B04": ("we hoped to wake up in the middle of the night", None),
 "S0108L02U01": ("we didn't expect to wake up in the middle of the night", None),
 "S0108L02U02": ("I didn't want to wake up in the middle of the night", None),
 "S0108L02U03": ("I need to wake up in the middle of the night", None),
 "S0108L02U04": ("I'm going to try to wake up in the middle of the night", None),
 "S0108L02U05": ("I enjoy waking up in the middle of the night", None),
}
