# hrv_for_eng C0108 hope -> expect (cs #771 shard east)
# Verb: nadati se (hope) -> očekivati (expect). Source: Hrvatski jezični portal (hjp.znanje.hr) očekivati "predviđati, misliti da će se što dogoditi".
# Infinitive complement kept as live (nismo se nadali probuditi se -> nismo očekivali probuditi se) so L02 'probuditi se' still tiles.
# 'se' drops out of the LEGO (očekivati is not reflexive): components 3 -> 2, so component row C03 is deleted (C02 becomes 'expected').
# Not touched (pre-existing, outside this change): the English 'to awaken' / 'mid-night' of L02/L03.
C = "hrv_for_eng"
PLAN = {
 "SEED": ("We didn't expect to wake up in the middle of the night.", "Nismo očekivali probuditi se usred noći."),
 "S0108L01": {"lego": ("we didn't expect", "nismo očekivali"), "components": [{"known": "we didn't", "target": "nismo"}, {"known": "expected", "target": "očekivali"}]},
 "S0108L01C02": ("expected", "očekivali"),
 "S0108L01C03": "DELETE",
 "S0108L01B01": ("we didn't expect", "nismo očekivali"),
 "S0108L01B02": ("we didn't expect to hear that", "nismo očekivali čuti to"),
 "S0108L01B03": ("I think we didn't expect that", "mislim da nismo očekivali to"),
 "S0108L01U01": ("we didn't expect to see that", "nismo očekivali vidjeti to"),
 "S0108L01U02": ("we didn't expect to change what we're doing", "nismo očekivali promijeniti što radimo"),
 "S0108L01U03": ("I'm surprised that we didn't expect more", "iznenađen sam da nismo očekivali više"),
 "S0108L01U04": ("that's why we didn't expect to continue", "zato nismo očekivali nastaviti"),
 "S0108L01U05": ("unfortunately we didn't expect that", "nažalost nismo očekivali to"),
 "S0108L02B02": ("we didn't expect to awaken", "nismo očekivali probuditi se"),
 "S0108L03B03": ("we didn't expect to awaken mid-night", "nismo očekivali probuditi se usred noći"),
}
