# hye_for_eng C0108 hope -> expect (cs #771 shard east). Eastern Armenian.
# The live target never said hope: "Մենք չի ուզում եինք արկնանալ գիշերի մեջ" is an ungrammatical "we didn't want to wake (misspelt) in the night".
# Verb -> սպասել in its "expect" sense: "Մենք չէինք սպասում արթնանալ..." Source: Wiktionary սպասել "to wait; to expect"; Nayiri.com (Աղայան, Արդի հայերենի բացատրական բառարան) սպասել 3. "ակնկալել, հույս ունենալ, որ կլինի".
# 'գիշերի մեջ' is kept exactly as live so L01 (գիշերի) and L02 (մեջ) still tile; the standard "գիշերվա կեսին" would need both LEGOs rebuilt — out of this change, flagged.
# No LEGO in seed 108 carries the verb, so չէինք / սպասում may be uncovered (see validator line). Rows touched: English wake -> wake up,
# and in those same rows the misspelt արկնանալ -> արթնանալ (Wiktionary արթնանալ "to wake up").
C = "hye_for_eng"
PLAN = {
 "SEED": ("We didn't expect to wake up in the middle of the night.", "Մենք չէինք սպասում արթնանալ գիշերի մեջ։", "menk cheink spasum artnanal gisheri mej."),
 "S0108L01B03": ("don't like waking up at night", "չի սիրում արթնանալ գիշերի", "chi sirum artnanal gisheri"),
 "S0108L01U01": ("I don't want to wake up at night", "ես չեմ ուզում արթնանալ գիշերի", "yes chem uzum artnanal gisheri"),
 "S0108L01U04": ("I don't like waking up at night", "ես չի սիրում արթնանալ գիշերի", "yes chi sirum artnanal gisheri"),
 "S0108L02B03": ("wake up in the middle of the night", "արթնանալ գիշերի մեջ", "artnanal gisheri mej"),
 "S0108L02U02": ("I don't want to wake up in the middle of the night", "ես չեմ ուզում արթնանալ գիշերի մեջ", "yes chem uzum artnanal gisheri mej"),
}
