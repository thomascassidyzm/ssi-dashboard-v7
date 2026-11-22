# bul_for_eng C0108 hope -> expect (cs #771 shard east)
# Verb: надявам се (hope) -> очаквам (expect): "Не очаквахме да..." — Wiktionary очаквам "to expect, to await"; Речник на българския език (ibl.bas.bg) очаквам "предполагам, че нещо ще стане".
# NO LEGO in seed 108 carried the hope verb (L01 = събудим, L02 = посред нощ; надявахме was covered from an earlier seed),
# so очаквахме is NOT covered by any LEGO after this plan: validator NEW issue, needs a new LEGO (lego.insert, structural => tom_go) — parent's call.
C = "bul_for_eng"
PLAN = {
 "SEED": ("We didn't expect to wake up in the middle of the night.", "Не очаквахме да се събудим посред нощ.", "Ne ochakvahme da se sabudim posred nosht."),
 "S0108L01B03": ("we didn't expect to wake up", "не очаквахме да се събудим", "ne ochakvahme da se sabudim"),
 "S0108L01U02": ("we expected to wake up", "Очаквахме да се събудим", "ochakvahme da se sabudim"),
 # live L02B03 was a broken row (known 'wake up at midnight' vs target 'не се надявахме посред нощ'): target said hope, both sides rewritten
 "S0108L02B03": ("to wake up in the middle of the night", "да се събудим посред нощ", "da se sabudim posred nosht"),
 "S0108L02U01": ("we didn't expect to wake up in the middle of the night", "Не очаквахме да се събудим посред нощ", "ne ochakvahme da se sabudim posred nosht"),
 "S0108L02U02": ("we expected to wake up in the middle of the night", "Очаквахме да се събудим посред нощ", "ochakvahme da se sabudim posred nosht"),
}
