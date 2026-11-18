"""C0108 hope -> expect, yue_for_eng (cs #772 asia shard for parent #758). PLAN ONLY: nothing applied.
Verb: 唔希望 -> 估唔到會. The course's own seed 112 says 我估唔到 for "I wasn't expecting it"; words.hk 粵典: 估唔到 = 冇預料到 (didn't expect).
會 marks the unexpected outcome. No hope LEGO in seed 108 (希望 is S0107L01). The wake LEGO S0108L02 瞓醒 is re-glossed "to wake up"
(components unchanged) and its rows follow; U03 ("we hope not to wake up", 希望唔會) is a real hope row and keeps its verb.
Tuples are (known, target[, roman]); None = keep live."""
C = 'yue_for_eng'
PLAN = {
 'SEED': ("We didn't expect to wake up in the middle of the night.", '我哋估唔到會半夜瞓醒。'),
 'S0108L02': {'lego': ('to wake up', None)},
 'S0108L02B01': ('to wake up', '瞓醒'),
 'S0108L02B02': ('I woke up', None),
 'S0108L02B03': ("don't want to wake up", '唔想瞓醒'),
 'S0108L02U01': ("we didn't expect to wake up in the middle of the night", '我哋估唔到會半夜瞓醒'),
 'S0108L02U02': ("therefore, I don't want to wake up", '所以我唔想瞓醒'),
 'S0108L02U03': ('we hope not to wake up', '我哋希望唔會瞓醒'),
 'S0108L02U04': ("he's not ready to wake up yet", '佢仲未準備好瞓醒'),
 'S0108L02U05': ('everyone else woke up too', None),
}
