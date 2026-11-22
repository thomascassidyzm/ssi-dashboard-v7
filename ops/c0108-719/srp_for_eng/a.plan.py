# srp_for_eng C0108 hope -> expect (cs #771 shard east)
# Verb: nadati se (hope) -> očekivati (expect): "nismo očekivali da..." Source: Rečnik srpskoga jezika (Matica srpska) očekivati "smatrati da će se nešto dogoditi"; Wiktionary očekivati "to expect".
# 'se' drops out of the LEGO (očekivati is not reflexive): components 4 -> 3, so component row C02 ('se') is deleted and C03 becomes 'expected'.
# Component strings keep the course's live convention (literal double quotes inside the text).
C = "srp_for_eng"
PLAN = {
 "SEED": ("We didn't expect to wake up in the middle of the night.", "Nismo očekivali da ćemo se probuditi usred noći."),
 "S0108L01": {"lego": ("we didn't expect to", "nismo očekivali da"), "components": [{"known": "\"we aren't\"", "target": "\"nismo\""}, {"known": "\"expected\"", "target": "\"očekivali\""}, {"known": "\"to\"", "target": "\"da\""}]},
 "S0108L01C02": "DELETE",
 "S0108L01C03": ("\"expected\"", "\"očekivali\""),
 "S0108L01B01": ("we didn't expect to", "nismo očekivali da"),
 "S0108L01B02": ("we didn't expect to see", "nismo očekivali da vidimo"),
 "S0108L01B03": ("we didn't expect to hear", "nismo očekivali da čujemo"),
 "S0108L01U01": ("we didn't expect to see that", "nismo očekivali da vidimo to"),
 "S0108L01U02": ("we didn't expect to hear Serbian", "nismo očekivali da čujemo srpski"),
 "S0108L01U06": ("we did not expect to understand everything", "nismo očekivali da razumemo sve"),
 "S0108L02U01": ("we didn't expect to wake up", "nismo očekivali da ćemo se probuditi"),
 "S0108L03U01": ("we didn't expect to wake up in the middle of the night", "nismo očekivali da ćemo se probuditi usred noći"),
}
