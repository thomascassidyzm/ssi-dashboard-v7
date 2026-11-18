# hun_for_eng C0108 hope -> expect (cs #771 shard east)
# Verb: remél (hope) -> számít valamire (expect), the everyday Hungarian form: "Nem számítottunk arra, hogy...".
# Source: A magyar nyelv értelmező szótára, számít 8. "(vmire) bizonyosra veszi, várja, hogy vmi bekövetkezik"; Wiktionary számít "to count on, to expect (-ra/-re)".
# NO LEGO in seed 108 carried the hope verb (L01 = az éjszaka közepén, L02 = felébredünk) and no phrase says hope, so only the seed changes;
# számítottunk / arra are NOT covered by a LEGO after this plan: validator NEW issue, needs a new LEGO (lego.insert, structural => tom_go) — parent's call.
# Also: L02's known side was the bare word 'we' for 'felébredünk' (its phrases all say 'we wake up'): corrected to 'we wake up' (English only).
C = "hun_for_eng"
PLAN = {
 "SEED": ("We didn't expect to wake up in the middle of the night.", "Nem számítottunk arra, hogy az éjszaka közepén felébredünk."),
 "S0108L02": {"lego": ("we wake up", None)},
}
