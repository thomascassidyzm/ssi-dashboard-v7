"""C0108 hope -> expect, eng_for_zho (cs #772 asia shard for parent #758). PLAN ONLY: nothing applied.
Known verb: 不希望 / 没希望 -> 没想到会. 没想到 is the course's own prompt for "I wasn't expecting" (S0112L02); CC-CEDICT: 没想到 = didn't expect.
会 marks the unexpected outcome. The single M LEGO S0108L01 is re-cut (components 没想到会 = didn't expect to / 醒来 = wake up / 半夜 = in the middle
of the night) and every row follows; rows keep their live 在半夜 where they had it, and their live capitalisation.
Tuples are (known, target[, roman]); None = keep live."""
C = 'eng_for_zho'
PLAN = {
 'SEED': ('我们没想到会半夜醒来', "We didn't expect to wake up in the middle of the night"),
 'S0108L01': {'lego': ('没想到会半夜醒来', "Didn't expect to wake up in the middle of the night"), 'components': [{'known': '没想到会', 'target': "didn't expect to"}, {'known': '醒来', 'target': 'wake up'}, {'known': '半夜', 'target': 'in the middle of the night'}]},
 'S0108L01B01': ('没想到会半夜醒来', "Didn't expect to wake up in the middle of the night"),
 'S0108L01B02': ('今天没想到会在半夜醒来', "Didn't expect to wake up in the middle of the night today"),
 'S0108L01B03': ('没想到会再次在半夜醒来', "Didn't expect to wake up in the middle of the night again"),
 'S0108L01B04': ('现在没想到会在半夜醒来', "Didn't expect to wake up in the middle of the night now"),
 'S0108L01C01': ('没想到会', "Didn't expect to"),
 'S0108L01C02': (None, 'Wake up'),
 'S0108L01U01': ('我们没想到会在半夜醒来', "We didn't expect to wake up in the middle of the night"),
 'S0108L01U02': ('我没想到会在半夜醒来', "I didn't expect to wake up in the middle of the night"),
 'S0108L01U03': ('他们没想到会在半夜醒来', "They didn't expect to wake up in the middle of the night"),
 'S0108L01U04': ('你为什么觉得我们没想到会在半夜醒来？', "Why do you think that we didn't expect to wake up in the middle of the night?"),
 'S0108L01U05': ('他没想到会在半夜醒来', "He didn't expect to wake up in the middle of the night"),
}
