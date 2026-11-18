"""C0108 hope -> expect, eng_for_hin (cs #772 asia shard for parent #758). PLAN ONLY: nothing applied.
Known side KEPT. उम्मीद is the course's own prompt for "wasn't expecting it" (मुझे इसकी उम्मीद नहीं थी, S0112L02); Oxford Hindi-English
(McGregor): उम्मीद = hope, expectation. "हमने … जागने की उम्मीद नहीं की थी" already reads "we hadn't expected to wake up". Only the English
target changes: LEGO S0108L01 -> "we didn't expect" (its known string differs from S0107L01 हमने उम्मीद की थी and S0112L02, so no prompt clash),
wake LEGO S0108L02 -> "to wake up", rows follow.
Tuples are (known, target[, roman]); None = keep live."""
C = 'eng_for_hin'
PLAN = {
 'SEED': ('हमने बीच रात में जागने की उम्मीद नहीं की थी।', "We didn't expect to wake up in the middle of the night."),
 'S0108L01': {'lego': ('हमने उम्मीद नहीं की थी', "we didn't expect")},
 'S0108L01B01': ('हमने जागने की उम्मीद नहीं की थी', "we didn't expect to wake up"),
 'S0108L01B02': ('हमने आपको देखने की उम्मीद नहीं की थी', "we didn't expect to see you"),
 'S0108L01B03': ('हमने कहानी सुनने की उम्मीद नहीं की थी', "we didn't expect to hear the story"),
 'S0108L01U01': ('हमने आज मिलने की उम्मीद नहीं की थी।', "we didn't expect to meet today"),
 'S0108L01U02': ('हमने घर जाने की उम्मीद नहीं की थी।', "we didn't expect to go home"),
 'S0108L01U03': ('हमने जवाब जानने की उम्मीद नहीं की थी।', "we didn't expect to find out the answer"),
 'S0108L01U04': ('हमने आपको सुनने की उम्मीद नहीं की थी।', "we didn't expect to hear you"),
 'S0108L01U05': ('हमने आज शाम आपको देखने की उम्मीद नहीं की थी।', "we didn't expect to see you this evening"),
 'S0108L02': {'lego': ('जागना', 'to wake up')},
 'S0108L02B01': ('छह बजे जागना', "to wake up at six o'clock"),
 'S0108L02B02': ('आज सुबह जागना', 'to wake up this morning'),
 'S0108L02B03': ('रात के बीच में जागना', 'to wake up in the middle of the night'),
 'S0108L02U01': ('मैं छह बजे जागना चाहता हूँ।', "I want to wake up at six o'clock"),
 'S0108L02U02': ('हमने जागने की उम्मीद नहीं की थी।', "we didn't expect to wake up"),
 'S0108L02U03': ('वह आज सुबह जागना चाहती थी।', 'she wanted to wake up this morning'),
 'S0108L02U04': ('मैं आज सुबह जागना नहीं चाहता।', "I don't want to wake up this morning"),
 'S0108L02U05': ('हम छह बजे जागना चाहते हैं।', "we want to wake up at six o'clock"),
 'S0108L03B02': ('रात के बीच में जागना', 'to wake up in the middle of the night'),
 'S0108L03U01': ('मैं रात के बीच में जागना नहीं चाहती।', "I don't want to wake up in the middle of the night"),
 'S0108L03U02': ('वह रात के बीच में जागना नहीं चाहती।', "she doesn't want to wake up in the middle of the night"),
 'S0108L03U05': ('मुझे यक़ीन नहीं है कि मैं रात के बीच में जागना चाहती हूँ।', "I'm not sure if I want to wake up in the middle of the night"),
}
