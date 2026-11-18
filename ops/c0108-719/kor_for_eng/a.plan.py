"""C0108 hope -> expect, kor_for_eng (cs #772 asia shard for parent #758). PLAN ONLY: nothing applied.
Live seed said WANT, not hope ("we didn't want to wake up" = 일어나고 싶지 않았어요); it now has to say expect.
Verb: 일어날 줄 몰랐어요. -(으)ㄹ 줄 모르다 is the everyday Korean for "didn't expect / had no idea that…" (NIKL 한국어기초사전, 줄: "-ㄹ 줄 모르다");
the bookish alternative 예상하지 못했어요 is the course's "wasn't expecting it" at S0112L02 and is left to that seed.
The M LEGO S0108L01 is re-cut whole (didn't expect to wake up) with components 일어날 / 줄 몰랐어요; every row in it and the
seed-echo rows in L02 move. Rows keep their pro-drop duplicates as live. None of the changed rows carries romanisation live.
Tuples are (known, target[, roman]); None = keep live."""
C = 'kor_for_eng'
PLAN = {
 'SEED': ("we didn't expect to wake up in the middle of the night", '한밤중에 일어날 줄 몰랐어요', 'han-bam-jung-e i-reo-nal jul mol-la-sseo-yo'),
 'S0108L01': {'lego': ("didn't expect to wake up", '일어날 줄 몰랐어요'), 'components': [{'known': 'to wake up', 'target': '일어날'}, {'known': "didn't expect", 'target': '줄 몰랐어요'}]},
 'S0108L01B01': ("didn't expect to wake up", '일어날 줄 몰랐어요'),
 'S0108L01B03': ("we didn't expect to wake up", '일어날 줄 몰랐어요'),
 'S0108L01B04': ("but we didn't expect to wake up", '하지만 일어날 줄 몰랐어요'),
 'S0108L01C01': ('to wake up', '일어날'),
 'S0108L01C02': ("didn't expect", '줄 몰랐어요'),
 'S0108L01U01': ("we didn't expect to wake up", '일어날 줄 몰랐어요'),
 'S0108L01U02': ("I didn't expect to wake up", '일어날 줄 몰랐어요'),
 'S0108L01U05': ("but we didn't expect to wake up", '하지만 일어날 줄 몰랐어요'),
 'S0108L01U08': ("so we didn't expect to wake up", '그래서 일어날 줄 몰랐어요'),
 'S0108L02B03': ("didn't expect to wake up in the middle of the night", '한밤중에 일어날 줄 몰랐어요'),
 'S0108L02U01': ("we didn't expect to wake up in the middle of the night", '한밤중에 일어날 줄 몰랐어요'),
 'S0108L02U02': ("I didn't expect to wake up in the middle of the night", '한밤중에 일어날 줄 몰랐어요'),
 'S0108L02U06': ("but we didn't expect to wake up in the middle of the night", '하지만 한밤중에 일어날 줄 몰랐어요'),
 'S0108L02U08': ("so we didn't expect to wake up in the middle of the night", '그래서 한밤중에 일어날 줄 몰랐어요'),
}
