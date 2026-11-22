"""C0108 hope -> expect, eng_for_kor (cs #772 asia shard for parent #758). PLAN ONLY: nothing applied.
Known verb: 깨기를 바라지 않았어요 ("did not wish to wake") -> 깰 줄 몰랐어요. -(으)ㄹ 줄 모르다 is the everyday Korean for "didn't expect / had no
idea that…" (NIKL 한국어기초사전, 줄: "-ㄹ 줄 모르다"); 예상하지 못했어요 is this course's prompt for "I wasn't expecting it" (S0112L02) and is left to
that seed, so the two prompts stay distinct. LEGO S0108L02 re-cut with components 깰 = to wake up / 줄 몰랐어요 = we didn't expect; rows follow.
U05 (live: 그냥 over "just now", a mismatch; "we just didn't expect…" would split the LEGO) is rewritten with "tonight", already in this basket.
Tuples are (known, target[, roman]); None = keep live."""
C = 'eng_for_kor'
PLAN = {
 'SEED': ('우리는 밤 중간에 깰 줄 몰랐어요', "We didn't expect to wake up in the middle of the night"),
 'S0108L02': {'lego': ('깰 줄 몰랐어요', "we didn't expect to wake up"), 'components': [{'known': '깰', 'target': 'to wake up'}, {'known': '줄 몰랐어요', 'target': "we didn't expect"}]},
 'S0108L02B01': ('깰 줄 몰랐어요', "we didn't expect to wake up"),
 'S0108L02B02': ('밤 중간에 깰 줄 몰랐어요', "we didn't expect to wake up in the middle of the night"),
 'S0108L02B03': ('지금 깰 줄 몰랐어요', "we didn't expect to wake up now"),
 'S0108L02C01': ('깰', 'to wake up'),
 'S0108L02C02': ('줄 몰랐어요', "we didn't expect"),
 'S0108L02U01': ('우리는 밤 중간에 깰 줄 몰랐어요', "we didn't expect to wake up in the middle of the night"),
 'S0108L02U02': ('우리는 오늘 밤 중간에 깰 줄 몰랐어요', "we didn't expect to wake up in the middle of the night tonight"),
 'S0108L02U03': ('우리는 깰 줄 몰랐어요', "we didn't expect to wake up"),
 'S0108L02U04': ('그것이 우리가 깰 줄 몰랐던 이유예요', "that is why we didn't expect to wake up"),
 'S0108L02U05': ('우리는 오늘 밤 깰 줄 몰랐어요', "we didn't expect to wake up tonight"),
}
