'use strict';
// ITEM 6 of Kai's overnight run #785·AK (Kai's Y 23 Nov 11:02Z on the #779·AK menu): jpn_for_eng held items in seeds ≤300
// (the app caps jpn_for_eng at 300), from #421·AI's re-check (d/71221f73, table d/7c5d1b3f). The menu and the brief call
// this course "eng_for_jpn"; #421·AI's plan is jpn_for_eng (Japanese for English speakers), which is what this edits.
// Built by cs #789·AK from the nightly QA copy ssi_copy_20261123t033000z; the live pre-check holds any seed that moved since.
//
// The 13 items ≤300 and where each stands on the 23 Nov copy:
//   F3 73 / 96 / 173 / 248  seed 。→、 (one sentence); the seed is ALREADY played (L03U09, L02U09, L02U11, L02U08) — the
//                           played copy takes the same comma. Punctuation only (canon A7): the rows keep their clips.
//   F3 193                  seed → ごめん、今日は忙しすぎる (English order "I'm sorry but…"); copy S0193L01U11 the same. New target.
//   F4 70                   L01 "she didn't want to | 彼女はしたくなかった" is not in the seed → "she | 彼女" not-new (= S0017L03); L02 "tell me where
//                           it was | 場所を言う" is not in the seed → "didn't want to tell me where it was | 場所を言いたくなかった"
//                           (LEGOs follow the seed; 11 morae, kept whole: 言いたくなかった cannot be cut from 場所を without
//                           leaving "where it was | 場所を" glossing a bare object — listed per the ≥7-syllable rule).
//                           L02's basket rewritten to the new LEGO from material taught by seed 70; L01's junk basket deleted.
//   F4 240                  seed English "doesn't like to stop" → "doesn't stop talking" (no "like" in 止めない); L02 →
//                           "doesn't stop talking | 話すのを止めない"; basket to the negative.
//   F4 251                  L02 "find out | 知る" → "don't want to find out | 知りたくない" (the seed's own form; 〜たくない S0012L01).
//   F4 268                  L03 "emails came | メールが来た" → "two emails came | メールが二通来た" (通 = the counter for letters
//                           and emails; jpdb 通). Every L03 phrase gains 二通 and "two emails".
//   F5 54 / 82              ALREADY FIXED on the copy: S0054L01U10 and S0082L02U09 play the seeds. Nothing to do.
//   F6 130                  seed 驚いた。でも、友だちだ。 says "but"; the English says "because" → 驚いた、友だちだから (から S0022L02),
//                           English "I was surprised, because he's a friend"; played as a new USE under S0130L02.
//   F8                      delete S0173L02B03 "manage. I can" and S0176L02B03 "ask if. I'll" (stray full stops, duplicates).
// Knock-on noted, not changed: S0256L01U07 "一時間で知ることができる" still uses plain 知る (S0256L01's own basket).

const D = { course: 'jpn_for_eng', job: 'cs #789·AK item 6', seeds: {}, legos: {}, legoInsert: [], legoDelete: [], rep: {}, repEn: {}, phrases: {}, phraseInsert: [], items: [] };
D.intro = (known) => `The Japanese for: '${known}', is: <break time="300ms"/> <break time="10ms"/>`;
D.approval = 'kai:2026-11-23:jpn_for_eng held fixes seeds <=300 (item 6 of the overnight run, Kai Y 23 Nov 11:02Z)';
D.purpose = 'jpn_for_eng held fixes in seeds <=300 (#421·AI plan), Kai overnight run #785·AK item 6, cs #789·AK';
const item = (n, label) => D.items.push({ n, label });
const ph = (o) => Object.assign(D.phrases, o);
const ins = (lego, role, known, target) => D.phraseInsert.push({ lego, role, known, target });

// F3 — 。→、 (punctuation only, clips kept)
item(73, 'seed + played copy: 。→、');
D.seeds[73] = { target_text: 'ありがとう、でも、まだ学ぶことがある' };
ph({ S0073L03U09: ['thank you very much, but I\'ve got more to learn', 'ありがとう、でも、まだ学ぶことがある'] });
item(96, 'seed + played copy: 。→、');
D.seeds[96] = { target_text: 'まだ準備できてない、もう少し時間がいる' };
ph({ S0096L02U09: ['no I\'m not ready yet, I need a little more time', 'まだ準備できてない、もう少し時間がいる'] });
item(173, 'seed + played copy: 。→、');
D.seeds[173] = { target_text: '大丈夫、自分でできる' };
ph({ S0173L02U11: ['no thank you I can manage on my own', '大丈夫、自分でできる'] });
item(248, 'seed + played copy: 。→、');
D.seeds[248] = { target_text: 'あの映画、ひどかった、お金返してほしい' };
ph({ S0248L02U08: ['I thought the film was complete rubbish and I want my money back', 'あの映画、ひどかった、お金返してほしい'] });
item(193, 'seed + played copy → ごめん、今日は忙しすぎる');
D.seeds[193] = { target_text: 'ごめん、今日は忙しすぎる' };
ph({ S0193L01U11: ['I\'m sorry but I\'m too busy today', 'ごめん、今日は忙しすぎる'] });

// F4 70 — LEGOs follow the seed
item(70, 'L01 → she | 彼女 (not new, = S0017L03), basket deleted; L02 → didn\'t want to tell me where it was | 場所を言いたくなかった; both baskets rewritten');
// "she" is taught at S0017L03 as 彼女 (and "she | 彼女は" would ask one English for two answers): S0070L01 becomes that same
// LEGO, not new (Kai 29 Oct: a duplicate LEGO flips to not-new), so its June-generator basket ("she didn't want to | 彼女は
// したくなかった", which teaches nothing in the seed) goes with it; the seed is played under L02.
D.legos.S0070L01 = { known_text: 'she', target_text: '彼女', type: 'A', is_new: false, comps: [] };
ph({ S0070L01B01: null, S0070L01B02: null, S0070L01B03: null, S0070L01B04: null, S0070L01U01: null, S0070L01U02: null, S0070L01U06: null, S0070L01U08: null });
D.legos.S0070L02 = { known_text: 'didn\'t want to tell me where it was', target_text: '場所を言いたくなかった', comps: [['where it was', '場所を'], ['didn\'t want to tell', '言いたくなかった']] };
ph({
  S0070L02B01: ['didn\'t want to tell me where it was', '場所を言いたくなかった'],
  S0070L02B02: ['I didn\'t want to tell you where it was', '場所を言いたくなかった'],
  S0070L02B03: null,
  S0070L02B04: ['he didn\'t want to tell me where it was', '彼は場所を言いたくなかった'],
  S0070L02U01: ['she didn\'t want to tell me where it was', '彼女は場所を言いたくなかった'],
  S0070L02U02: ['I think she didn\'t want to tell me where it was', '彼女は場所を言いたくなかったと思う'],
  S0070L02U03: ['why didn\'t she want to tell me where it was?', 'なんで彼女は場所を言いたくなかった？'],
  S0070L02U05: null,
  S0070L02U06: ['why didn\'t you want to tell me where it was?', 'なんで場所を言いたくなかった？'],
  S0070L02U08: null,
});

// F4 240 — the seed is negative
item(240, 'seed English → doesn\'t stop talking; L02 → doesn\'t stop talking | 話すのを止めない; basket to the negative');
D.seeds[240] = { known_text: 'my father doesn\'t stop talking' };
D.legos.S0240L02 = { known_text: 'doesn\'t stop talking', target_text: '話すのを止めない', comps: [['talking', '話すのを'], ['doesn\'t stop', '止めない']] };
ph({
  S0240L02B01: ['doesn\'t stop talking', '話すのを止めない'],
  S0240L02B02: ['he doesn\'t stop talking', '彼は話すのを止めない'],
  S0240L02B03: ['she doesn\'t stop talking', '彼女は話すのを止めない'],
  S0240L02B04: null,
  S0240L02U01: ['my father doesn\'t stop talking', '父は話すのを止めない'],
  S0240L02U02: ['why doesn\'t he stop talking?', 'なんで彼は話すのを止めない？'],
  S0240L02U03: null,
  S0240L02U04: ['my mother doesn\'t stop talking', '母は話すのを止めない'],
  S0240L02U07: ['I think he doesn\'t stop talking', '彼は話すのを止めないと思う'],
});

// F4 251 — the seed's own form
item(251, 'L02 → don\'t want to find out | 知りたくない; basket rewritten');
D.legos.S0251L02 = { known_text: 'don\'t want to find out', target_text: '知りたくない', type: 'A', comps: [] };
ph({
  S0251L02B01: ['I don\'t want to find out now', '今知りたくない'],
  S0251L02B02: ['why don\'t you want to find out?', 'なんで知りたくない？'],
  S0251L02B03: ['she doesn\'t want to find out', '彼女は知りたくない'],
  S0251L02U01: ['he doesn\'t want to find out', '彼は知りたくない'],
  S0251L02U03: ['I don\'t want to find out if it\'s true', '本当かどうか知りたくない'],
  S0251L02U04: ['I don\'t want to find out the answer', '答えを知りたくない'],
  S0251L02U06: ['I don\'t want to find out until after we finish', '終わるまで知りたくない'],
});

// F4 268 — 二通 (the counter is part of the LEGO)
item(268, 'L03 → two emails came | メールが二通来た; every L03 phrase gains 二通 / "two emails"');
D.legos.S0268L03 = { known_text: 'two emails came', target_text: 'メールが二通来た', comps: [['emails', 'メールが'], ['two', '二通'], ['came', '来た']] };
ph({
  S0268L03B01: ['two emails came', 'メールが二通来た'],
  S0268L03B02: ['two emails came yesterday', '昨日メールが二通来た'],
  S0268L03B03: ['did two emails come?', 'メールが二通来た？'],
  S0268L03B04: ['two emails came from my teacher', '先生からメールが二通来た'],
  S0268L03U01: ['two emails came from my old friend yesterday', '昨日、古い友だちからメールが二通来た'],
  S0268L03U02: ['I want to know if two emails came from my friend', '友だちからメールが二通来たか知りたい'],
  S0268L03U03: ['did two emails come from your friend about the plan?', '友だちから予定についてメールが二通来た？'],
  S0268L03U04: ['I heard that two emails came from the old man', '年配の男性からメールが二通来たと聞いた'],
  S0268L03U05: ['two emails came from my teacher about work yesterday', '昨日、先生から仕事についてメールが二通来た'],
  S0268L03U06: ['my mother said two emails came about something important', '母が大事なことについてメールが二通来たと言った'],
  S0268L03U07: ['I think two emails came from that old man last week', '先週、あの年配の男性からメールが二通来たと思う'],
  S0268L03U08: ['my father told me two emails came from you yesterday', '父が昨日、あなたからメールが二通来たと教えてくれた'],
  S0268L03U09: ['I think two emails came from that woman I was talking to at the restaurant', 'レストランで話してたあの女性からメールが二通来たと思う'],
});

// F6 130 — "because"
item(130, 'seed → 驚いた、友だちだから / "I was surprised, because he\'s a friend"; played under S0130L02');
D.seeds[130] = { known_text: 'I was surprised, because he\'s a friend', target_text: '驚いた、友だちだから' };
ins('S0130L02', 'use', 'I was surprised, because he\'s a friend', '驚いた、友だちだから');

// F8 — stray full stops (duplicates of the rows beside them)
item('F8', 'delete S0173L02B03 and S0176L02B03');
ph({ S0173L02B03: null, S0176L02B03: null });

// rows set to their seed's own sentence play the seed's own clips (no render)
D.seedClips = [70, 240, 251];

module.exports = D;
