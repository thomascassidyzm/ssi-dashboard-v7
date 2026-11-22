"""C0108 hope -> expect, zho_for_eng (cs #772 asia shard for parent #758). PLAN ONLY: nothing applied.
Verb: 没希望 -> 没想到会. The course's own seed 112 uses 没想到 for "wasn't expecting" (S0112L01); CC-CEDICT: 没想到 = didn't expect.
会 marks the unexpected outcome ("没想到会…"). Seed 108 has one LEGO (半夜), no hope LEGO; only the seed-echo row U09 moves, plus
wake -> wake up on the English of B04 / U04 / U07. U04 ("I originally hoped to sleep", 本来希望, as in seed 107) is a real hope row: kept.
Tuples are (known, target[, roman]); None = keep live."""
C = 'zho_for_eng'
PLAN = {
 'SEED': ("we didn't expect to wake up in the middle of the night", '我们没想到会半夜醒来', 'wǒmen méi xiǎngdào huì bànyè xǐng lái'),
 'S0108L01B04': ('wake up at midnight', '半夜醒'),
 'S0108L01U04': ('I originally hoped to sleep, not wake up at midnight', '我本来希望睡，不是半夜醒'),
 'S0108L01U07': ("I don't feel happy when I wake up at midnight", '我半夜醒时不觉得开心'),
 'S0108L01U09': ("we didn't expect to wake up in the middle of the night", '我们没想到会半夜醒来', 'wǒmen méi xiǎngdào huì bànyè xǐng lái.'),
}
