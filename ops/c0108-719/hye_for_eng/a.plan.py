# hye_for_eng C0108 hope -> expect (cs #771 shard east). Eastern Armenian.
# The live target never said hope: "Մենք չի ուզում եինք արկնանալ գիշերի մեջ" is an ungrammatical "we didn't want to wake in the night".
# Verb -> սպասել in its "expect" sense: "Մենք չէինք սպասում ..." Source: Wiktionary սպասել "to wait; to expect"; Nayiri.com (Աղայան, Արդի հայերենի բացատրական բառարան) սպասել "ակնկալել, հույս ունենալ, որ կլինի".
# KEPT AS LIVE ON PURPOSE (pre-existing, course-wide, flagged for a separate pass — not this change):
#  - 'արկնանալ' is a misspelling of արթնանալ "to wake up" (Wiktionary), but it is the spelling the course TEACHES (an earlier LEGO): writing the correct
#    արթնանալ here made the validator report it as untaught in 7 phrases, so the seed keeps the taught spelling until the LEGO itself is fixed.
#  - 'գիշերի մեջ' ("in the night") for "in the middle of the night": kept so L01 (գիշերի) and L02 (մեջ) still tile; standard is "գիշերվա կեսին".
# No LEGO in seed 108 carries the verb: չէինք / սպասում are NOT covered by a LEGO after this plan (validator NEW issue; needs a new LEGO, lego.insert => tom_go, parent's call).
# Phrase rows: English wake -> wake up only.
C = "hye_for_eng"
PLAN = {
 "SEED": ("We didn't expect to wake up in the middle of the night.", "Մենք չէինք սպասում արկնանալ գիշերի մեջ։", "menk cheink spasum arknanal gisheri mej."),
 "S0108L01B03": ("don't like waking up at night", None),
 "S0108L01U01": ("I don't want to wake up at night", None),
 "S0108L01U04": ("I don't like waking up at night", None),
 "S0108L02B03": ("wake up in the middle of the night", None),
 "S0108L02U02": ("I don't want to wake up in the middle of the night", None),
}
