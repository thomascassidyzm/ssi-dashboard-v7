#!/usr/bin/env python3
"""zho_for_jpn item-10 decisions (cs #808·AI, child of #714·AI), hand-authored per LEGO. Writes zho_for_jpn.json for tools/plan.py.
The known side is JAPANESE. The scan's family here is the dictionary-style gloss: a 〜 gap marker (L32: no gapped LEGOs) or
alternatives joined by ・ (K11/L11/L26: one form, the seed's own). Rules applied, in order:
 1. the seed's own Japanese chunk for the LEGO, one form, dictionary form (regloss; rows that said the other alternative are
    rebuilt or deleted);
 2. a bound element (〜たい, 〜時に, より, か …) grows to the verb/chunk IN ITS OWN SEED (L22/L25), shortest cut, ≤8 syllables;
    a Chinese particle LEGO (吗 了 把 给 里 …, L7) folds into the chunk it belongs to and stays a COMPONENT (K29) so later
    rows that use it bare stay taught;
 3. "stand-in する frame": where the seed literally carries the auxiliary chain (話したい ⊃ したい, 練習をするつもり ⊃ するつもり,
    話してほしい ⊃ してほしい), the LEGO is glossed with it and phrases swap する for the real verb — the Japanese analogue of
    Kai's stand-in "it" frames (17 Nov). kmatch names the known key every row must carry.
Verdicts: regloss · grow · seed (KAI'S CALL) · kai (target-side seed change, not drafted) · keep.
Basket: 'k' keep, 'd' delete, (known, target) rebuild. add: ('b'|'u', known, target) back-fill from words taught by the seed."""
import json, os
OUT = []


def D(id, verdict, **kw):
    kw['id'] = id
    kw['verdict'] = verdict
    b = kw.pop('b', None)
    if b:
        kw['basket'] = {k: ('keep' if v == 'k' else 'del' if v == 'd' else list(v)) for k, v in b.items()}
    if 'comps' in kw:
        kw['components'] = kw.pop('comps')
    OUT.append(kw)


def dels(*ids):
    return {i: 'd' for i in ids}


# ---- seed 1 "今あなたと中国語を話したいです。| 我现在想和你说中文。"
D('S0001L01', 'regloss', known='したい', kmatch='たい', comps=[['私', '我'], ['したい', '想']],
  why='"〜したい" carries a gap marker (L32). The seed says 話したい: glossed as the stand-in する frame したい (rule 3), phrases swap する for the real verb. A grown cut (想和你说) would drop 我, whose only teaching is this LEGO\'s component (S3), and 我现在想和你说 is 7 syllables for a seed-1 opener. The Japanese drops 私; Chinese needs 我 (K6 known-side latitude).',
  b={'C02': ('したい', '想'), 'B01': ('話したい', '我想说')},
  add=[('b', 'あなたと話したい', '我想和你说'), ('b', '中国語を話したい', '我想说中文'),
       ('u', '私は今中国語を話したいです', '现在我想说中文'), ('u', '私は今あなたと話したいです', '现在我想和你说'),
       ('u', '私はあなたと中国語を話したいです', '我想和你说中文')],
  remaining='plan.py "target 我想 not contiguous in seed" is PRE-EXISTING and stays: the seed is 我现在想和你说中文, and the only contiguous cut that keeps 我 taught is 我现在想和你说 (7 syllables, the whole seed bar 中文) for the course\'s first LEGO. Kai may prefer that cut or the target seed 我想现在和你说中文; flagged, not forced.')

# ---- seed 2 "学ぼうとしています。| 我在试着学。"
D('S0002L01', 'grow', known='学ぼうとしている', target='在试着学', type='M',
  comps=[['している', '在'], ['しようとする', '试着'], ['学ぶ', '学']],
  why='"〜しようとしている" is gapped and しようとしている is not in the seed; the seed\'s chunk is 学ぼうとしている = 在试着学 (grows to the verb in its own seed, L22). L13 note: L02 "学ぶ | 学" is taught after this chunk and overlaps it (S4).',
  b={'C01': ('している', '在'), 'C02': ('しようとする', '试着'), 'B01': 'd', 'B02': ('中国語を学ぼうとしている', '在试着学中文'),
     'U01': ('中国語を学ぼうとしています', '我在试着学中文'), 'U02': 'd', 'U03': ('今学ぼうとしています', '我现在在试着学')},
  add=[('b', '今学ぼうとしている', '现在在试着学'), ('b', '私は学ぼうとしている', '我在试着学'),
       ('u', '今中国語を学ぼうとしています', '我现在在试着学中文')])

# ---- seed 5 "他の人と話す練習をするつもりです。| 我要和别人练习说话。"
D('S0005L01', 'regloss', known='するつもり', kmatch='つもり',
  why='"〜するつもり" is gapped; the seed says 練習をするつもり, so the stand-in する frame するつもり is the seed\'s own words (rule 3). Every row already says つもり.')

# ---- seed 10 "文全体を覚えられるかどうかわかりません。| 我不确定我能不能记住整个句子。"
D('S0010L02', 'grow', known='覚えられるかどうか', target='能不能记住', type='M',
  comps=[['できる', '能'], ['できない', '不能'], ['覚える', '记住']],
  why='できる is not in the seed (it says 覚えられる); the seed\'s chunk is 覚えられるかどうか = 能不能记住 (grows to its verb, L22). 记住 is taught at seed 6.',
  b={'C01': ('できる', '能'), 'C02': ('ない', '不'), **dels('B01', 'B02', 'B03', 'B04', 'U01', 'U03', 'U04', 'U05')},
  add=[('b', '文全体を覚えられるかどうか', '能不能记住整个句子'), ('b', '私が覚えられるかどうか', '我能不能记住'),
       ('b', '一つの言葉を覚えられるかどうか', '能不能记住一个词'), ('b', '私の言いたいことを覚えられるかどうか', '能不能记住我的意思'),
       ('u', '今日文全体を覚えられるかどうかわかりません', '我不确定我今天能不能记住整个句子'),
       ('u', 'あなたが文全体を覚えられるかどうかわかりません', '我不确定你能不能记住整个句子'),
       ('u', '他の人が覚えられるかどうかわかりません', '我不确定别人能不能记住'),
       ('u', 'あなたが私の言いたいことを覚えられるかどうかわかりません', '我不确定你能不能记住我的意思')])

# ---- seed 11 "あなたが終わったら話せるようになりたいです。| 我想在你说完以后能说。"
D('S0011L02', 'grow', known='終わったら', target='说完以后', type='M', comps=[['言い終える', '说完'], ['後', '以后']],
  why='"〜の後に" is gapped and 後 is not in the seed; the seed\'s chunk is 終わったら = 说完以后 (shortest cut, 4). L01 "言い終える | 说完" is taught first (L13 holds).',
  b={'B01': ('あなたが終わったら', '你说完以后'), 'B02': 'd', 'B03': 'd',
     'U01': ('あなたが終わったら話したいです', '我想在你说完以后说话'), 'U02': ('あなたが終わったら練習するつもりです', '我要在你说完以后练习'),
     'U03': ('あなたが終わったら中国語で何か言いたいです', '我想在你说完以后用中文说一些东西'),
     'U04': ('あなたが終わったら中国語を話せるようになりたいです', '我想在你说完以后能说中文'), 'U05': 'd'},
  add=[('b', '私が終わったら', '我说完以后'), ('b', '他の人が終わったら', '别人说完以后'),
       ('u', 'あなたが終わったら練習したいです', '我想在你说完以后练习')])

# ---- seed 14 "一日中中国語を話しますか？| 你整天说中文吗？"
D('S0014L02', 'grow', known='中国語を話しますか', target='说中文吗', type='M', comps=[['話す', '说'], ['中国語', '中文'], ['か', '吗']],
  why='吗 is a particle taught alone (L7) under the gapped gloss "〜か". Folded into the chunk it closes, the seed\'s 中国語を話しますか = 说中文吗 (shortest cut, 4); 吗 stays a component so later questions keep it (K29).',
  b={'B02': ('中国語を話そうとしていますか', '你在试着说中文吗'), 'U01': 'd', 'U03': ('今日中国語を話したいですか', '你今天想说中文吗'),
     'U04': ('明日私と中国語を話せますか', '你明天能和我说中文吗'), 'U05': 'd'},
  add=[('u', '一日中中国語を話したいですか', '你想整天说中文吗'), ('u', '今中国語を話していますか', '你现在在说中文吗')])

# ---- seed 15 "そして明日私と中国語を話してほしいです。| 而且我想让你明天和我说中文。"
D('S0015L02', 'regloss', known='してほしい', kmatch='ほしい', comps=[['させる', '让'], ['あなた', '你']],
  why='"〜してほしい" is gapped; the seed says 話してほしい, so the stand-in する frame してほしい is its own words (rule 3); 让你…说 is not contiguous in the seed (让你明天和我说中文, 9).',
  b={'C01': ('させる', '让'), 'B01': ('話してほしい', '让你说')})

# ---- seed 22 "中国語を話す人に会いたいからです。| 因为我想见说中文的人。"
D('S0022L01', 'regloss', known='からです', kmatch='から',
  why='"〜だから" is gapped, and だから is not in the seed (it is "so", the other direction). The seed says 会いたいからです: からです "it\'s because" is its own words; every row already ends in から. S0270L01 (same seed words, same 因为) goes not-new on this LEGO (planned at 270).',
  b={'B01': ('したいから', '因为我想')})

# ---- seed 23 "もうすぐもっと話し始めるつもりです。| 我很快要开始多说话了。"
D('S0023L03', 'grow', known='もっと話し始める', target='开始多说话了', type='M',
  comps=[['始める', '开始'], ['もっと', '多'], ['話をする', '说话'], ['た', '了']],
  why='了 is a particle taught alone (L7) under "〜になった", which the seed never says. Folded into the predicate it closes: the seed\'s もっと話し始める = 开始多说话了 (6). 了 stays a component (K29) for later rows. L02 "始める | 开始" is taught first.',
  b=dels('B01', 'B02', 'B03', 'U02', 'U03', 'U04', 'U05'),
  add=[('b', 'もっと話し始めるつもり', '要开始多说话了'), ('b', '今もっと話し始める', '我现在开始多说话了'), ('b', '彼はもっと話し始める', '他开始多说话了'),
       ('u', '今日もっと話し始めるつもりです', '我今天要开始多说话了'), ('u', '彼はもうすぐもっと話し始めるつもりです', '他很快要开始多说话了'),
       ('u', '私たちは今もっと話し始めたいです', '我们现在想开始多说话了'), ('u', '明日もっと話し始めるつもりです', '我明天要开始多说话了')])

# ---- seed 25 "私が行かなければならない前に手伝ってくれますか？| 你会在我要走之前帮我吗?"
D('S0025L02', 'regloss', known='前に',
  why='"〜の前に" is gapped; the seed says 前に. Every row already says 前に.',
  add=[('u', '行く前に中国語を練習したいです', '我想在走之前练习中文')])

# ---- seed 26 "もうすぐ行ける準備ができているように感じるのが好きです。| 我喜欢感觉好像我快要走了。"
D('S0026L03', 'grow', known='ように感じる', target='感觉好像', type='M', comps=[['感じる', '感觉'], ['ように', '好像']],
  why='"まるで〜のように" is gapped and まるで is not in the seed. ように is bound; it grows to its verb in the seed: ように感じる = 感觉好像 (4). L02 "感じる | 感觉" is taught first.',
  b={'B01': 'd', 'B02': 'd', 'B03': 'd', 'U01': ('もうすぐ行くように感じます', '我感觉好像很快要走了'), 'U02': 'd', 'U03': 'd',
     'U04': ('中国語が話せるように感じるのが好きです', '我喜欢感觉好像能说中文'), 'U05': 'd'},
  add=[('b', '話せるように感じる', '感觉好像能说'), ('b', '学べるように感じる', '感觉好像能学'), ('b', '覚えられるように感じる', '感觉好像能记住'),
       ('u', '中国語が話せるように感じます', '我感觉好像能说中文'), ('u', '文全体を覚えられるように感じます', '我感觉好像能记住整个句子'),
       ('u', 'もうすぐ中国語が話せるように感じるのが好きです', '我喜欢感觉好像我很快能说中文')])
D('S0026L04', 'grow', known='もうすぐ行く', target='快要走了', type='M', comps=[['もうすぐ', '快'], ['つもり', '要'], ['行く', '走'], ['た', '了']],
  why='"もうすぐ〜しようとしている" is gapped. 快要…了 is one wrap frame (L32: frame and middle as one LEGO); the seed\'s もうすぐ行ける = 快要走了 (4).',
  b={'B01': 'd', 'B02': 'd', 'B03': 'd', 'B04': ('もうすぐ行くようだ', '好像快要走了'), 'U01': ('もうすぐ行きます', '我快要走了'),
     'U03': 'd', 'U06': 'd'},
  add=[('b', '彼はもうすぐ行く', '他快要走了'), ('b', '彼女はもうすぐ行く', '她快要走了'),
       ('u', '私たちはもうすぐ行きます', '我们快要走了'), ('u', 'あなたはもうすぐ行きますか', '你快要走了吗')])

# ---- seed 27 "答えるのに時間がかかりすぎるのは好きじゃありません。| 我不喜欢花太多时间来回答。"
D('S0027L03', 'grow', known='時間がかかりすぎる', target='花太多时间', type='M', kmatch='すぎ',
  comps=[['費やす', '花'], ['すぎる', '太'], ['多い', '多'], ['時間', '时间']],
  why='"〜すぎる" is gapped (bound suffix). It grows to its verb and object in the seed: 時間がかかりすぎる = 花太多时间 (5). L01 時间 and L02 花 are taught first. (L02 "費やす | 花" says かかる\'s neighbour, not the seed\'s word; not a scan row, left.)',
  b={'B01': 'd', 'B02': 'd', 'B03': 'd', 'B04': 'd', 'U01': ('時間がかかりすぎるのは好きじゃありません', '我不喜欢花太多时间'),
     'U02': ('時間がかかりすぎましたね', '你花太多时间了'), 'U04': 'd', 'U05': ('彼は中国語を学ぶのに時間をかけすぎたくない', '他不想花太多时间学中文')},
  add=[('b', '学ぶのに時間がかかりすぎる', '花太多时间学'), ('b', '練習に時間をかけすぎる', '花太多时间练习'), ('b', '説明に時間がかかりすぎる', '花太多时间解释'),
       ('u', '彼女は時間をかけすぎたくありません', '她不想花太多时间'), ('u', '今日は時間がかかりすぎました', '我今天花太多时间了')])

# ---- seed 32 "何か見せたかったですか？| 你想给我看一些东西吗?"
D('S0032L01', 'grow', known='見せる', target='给我看', type='M', comps=[['あげる', '给'], ['私', '我'], ['見る', '看']],
  why='"〜にあげる" is gapped and あげる is not in the seed; 给 here is the seed\'s 見せる = 给我看 (3). L13 note: L02 "見る | 看" follows and overlaps (S4).',
  b=dels('B01', 'B02', 'B03', 'U01', 'U02', 'U03', 'U04', 'U05', 'U06'),
  add=[('b', '私に何か見せる', '给我看一些东西'), ('b', '今見せて', '现在给我看'), ('b', '明日見せる', '明天给我看'),
       ('u', '彼は私に答えを見せたいです', '他想给我看答案'), ('u', '明日何か見せてくれますか', '你明天能给我看一些东西吗'),
       ('u', '今日私に見せたいですか', '你今天想给我看吗'), ('u', '彼女はもうすぐ私に見せるつもりです', '她很快要给我看'),
       ('u', '何か見せたかったですか', '你想给我看一些东西吗')])

# ---- seed 34 "彼は他の人がいる時に静かにしたくありません。| 他不想在别人在场的时候保持安静。"
D('S0034L01', 'grow', known='いる時に', target='在场的时候', type='M', comps=[['いる', '在场'], ['時', '的时候']],
  why='"〜の時に" is gapped; 時に is bound and grows to its verb in the seed: いる時に = 在场的时候 (5). L02 "いる | 在场" is taught first.',
  b=dels('B01', 'B02', 'B03', 'B04', 'U02', 'U03', 'U04', 'U05'),
  add=[('b', '他の人がいる時に', '别人在场的时候'), ('b', '彼がいる時に', '他在场的时候'), ('b', '彼女がいる時に', '她在场的时候'),
       ('u', '他の人がいる時に話したくありません', '别人在场的时候我不想说话'), ('u', '彼がいる時に中国語を話したいです', '他在场的时候我想说中文'),
       ('u', '彼女がいる時に練習するつもりです', '她在场的时候我要练习'), ('u', 'あなたがいる時に中国語を練習したいです', '你在场的时候我想练习中文'),
       ('u', '私たちは他の人がいる時に静かにしたくありません', '我们不想在别人在场的时候保持安静')])

# ---- seed 38 "約一週間学んでいます。| 我学了大概一个星期。"
D('S0038L01', 'regloss', known='約',
  why='"約・たぶん" lists two senses; the seed says 約 ("about"). Every row drilled たぶん ("probably"), which this seed never says: the basket is rebuilt in the seed\'s sense.',
  b=dels('B01', 'B02', 'B03', 'U01', 'U02', 'U03', 'U04', 'U05'),
  add=[('b', '約一週間', '大概一个星期'), ('b', '約六時', '大概六点'), ('b', '今晩約六時', '今天晚上大概六点'),
       ('u', '彼は約六時に戻ります', '他大概六点回来'), ('u', '約一週間あなたと練習したいです', '我想和你练习大概一个星期'),
       ('u', '私たちは約六時に会いたいです', '我们想大概六点见面'), ('u', '今晩約六時に戻りたいです', '我想今天晚上大概六点回来'),
       ('u', '彼女は約一週間中国語を学んでいます', '她学中文学了大概一个星期')])

# ---- seed 40 "今どんな気分ですか？| 你现在感觉怎么样?"
D('S0040L01', 'grow', known='どんな気分', target='感觉怎么样', type='M', comps=[['感じる', '感觉'], ['どう', '怎么样']],
  why='"どんな感じ・どう" is a two-form label; the seed says どんな気分 = 感觉怎么样 (5). 感觉 is taught at seed 26.',
  b={'B01': 'd', 'B02': 'd', 'B03': 'd', 'B04': 'd', 'U03': 'd', 'U04': 'd', 'U05': 'd'},
  add=[('b', '今どんな気分', '现在感觉怎么样'), ('b', '今日どんな気分', '今天感觉怎么样'), ('b', '彼はどんな気分', '他感觉怎么样'),
       ('u', '彼女は今日どんな気分ですか', '她今天感觉怎么样'), ('u', '昨日はどんな気分でしたか', '你昨天感觉怎么样'),
       ('u', '今晩どんな気分ですか', '你今天晚上感觉怎么样')])

# ---- seed 42 "昨夜より良く感じ始めていました。| 我开始感觉比昨天晚上好了。"
D('S0042L01', 'grow', known='昨夜より良く', target='比昨天晚上好', type='M', comps=[['より', '比'], ['昨日', '昨天'], ['晩', '晚上'], ['良い', '好']],
  why='比 is a particle taught alone (L7) under "〜より". 比…好 is a wrap frame (L32): taught whole with its middle, the seed\'s 昨夜より良く = 比昨天晚上好 (6). 昨天/晚上 are taught earlier; L13 note: L02 "良い | 好" follows.',
  b=dels('B01', 'B02', 'B03', 'U01', 'U02', 'U03', 'U04', 'U05'),
  add=[('b', '昨夜より良く感じる', '感觉比昨天晚上好'), ('b', '今日は昨夜より良い', '今天比昨天晚上好'), ('b', '今は昨夜より良い', '现在比昨天晚上好'),
       ('u', '今朝は昨夜より良く感じます', '我今天早上感觉比昨天晚上好'), ('u', '彼は昨夜より良く感じています', '他感觉比昨天晚上好'),
       ('u', '彼女は昨夜より良く話せます', '她说得比昨天晚上好'), ('u', 'あなたは昨夜より良く感じていますか', '你感觉比昨天晚上好吗'),
       ('u', '私たちは昨夜より良く感じています', '我们感觉比昨天晚上好')])
D('S0042L02', 'regloss', known='良い',
  why='"良い・上手" lists two senses; the seed says 良く (良い). Rows in the 上手 sense go.',
  b={'B02': 'd', 'U02': 'd'},
  add=[('b', '今良く感じる', '现在感觉好'), ('u', '今日は昨日より気分が良いです', '我今天感觉比昨天好')])

# ---- seed 43 "答え方について考えていませんでした。| 我没想怎么回答。"
D('S0043L01', 'grow', known='考えていなかった', target='没想', type='M', comps=[['しなかった', '没'], ['考える', '想']],
  why='"〜しなかった" is gapped; 没 grows to its verb in the seed: 考えていなかった (the seed\'s 考えていませんでした, plain form) = 没想 (2).',
  b=dels('B02', 'B03', 'U02', 'U03', 'U04', 'U05', 'U06'),
  add=[('b', '答え方を考えていなかった', '没想怎么回答'), ('b', '彼は考えていなかった', '他没想'), ('b', '私は考えていなかった', '我没想'),
       ('u', '彼女は答え方について考えていませんでした', '她没想怎么回答'), ('u', '昨日は答え方について考えていませんでした', '我昨天没想怎么回答'),
       ('u', '私たちは説明の仕方を考えていませんでした', '我们没想怎么解释'), ('u', '彼は言い方を考えていませんでした', '他没想怎么说'),
       ('u', '今日はそれについて考えていませんでした', '我今天没想它')])

# ---- seed 44 "または改善する必要があるかどうか。| 或者如果我需要改进。"
D('S0044L02', 'kai',
  why='The Japanese seed is right ("or whether I need to improve", continuing seed 43); the CHINESE seed is the wrong side: 如果 is conditional "if", not "whether". No Japanese chunk of the seed says 如果. Recommend the TARGET seed 或者我需不需要改进 (or 或者我是不是需要改进), which retires 如果 here (first taught again later where a real "if" occurs). Target-side seed change: not drafted until Kai rules (L25 rung 2).')

# ---- seed 45 "すべてを知る必要はありません。| 我不需要知道一切。"
D('S0045L02', 'regloss', known='すべて', why='"すべて・一切" is a two-form label; the seed says すべて. Every row already says すべて.',
  knock='S0278L03 "すべて・一切 | 一切" becomes an exact repeat of this LEGO: set not-new (planned at 278).')

# ---- seed 47 "間違えることは良いことだと思うからです。| 因为我觉得犯错是好事。"
D('S0047L01', 'regloss', known='思う',
  why='"〜と思う" is gapped; the seed says 思う. Every row says 思う. Two rows were not Chinese (我觉得想说中文): rebuilt with the subject.',
  b={'B03': ('私は中国語を話したいと思う', '我觉得我想说中文'), 'U03': ('私は時間をかけすぎていると思う', '我觉得我花太多时间了'),
     'U05': ('私はできるだけ早く試したいと思う', '我觉得我想尽快试')})

# ---- seed 49 "こんな感じです、私が言いたいことがわかれば。| 就是这样,如果你知道我的意思。"
D('S0049L01', 'grow', known='こんな感じです', target='就是这样', type='M', comps=[['つまり', '就是'], ['そう', '这样']],
  why='"〜ということです" is gapped and the seed never says it; 就是 here is the seed\'s こんな感じです = 就是这样 (4). Every row drilled the "つまり" sense, which this seed does not say: rebuilt. L13 note: L02 "そう | 这样" follows.',
  b=dels('B01', 'B02', 'B03', 'U01', 'U02', 'U03', 'U04', 'U05'),
  add=[('b', 'こんな感じだと思う', '我觉得就是这样'), ('b', '今はこんな感じです', '现在就是这样'), ('b', '中国語はこんな感じです', '中文就是这样'),
       ('u', '学ぶのはこんな感じです', '学就是这样'), ('u', '私の言いたいことはこんな感じです', '我的意思就是这样'),
       ('u', '彼の中国語はこんな感じです', '他的中文就是这样'), ('u', '間違えることはこんな感じです', '犯错就是这样'),
       ('u', '練習するのはこんな感じです', '练习就是这样')])

# ---- seed 51 "友達と面白いことをするのを楽しんでいます。| 我喜欢和朋友做有趣的事。"
D('S0051L02', 'regloss', known='する', kmatch='し',
  why='"する・やる" is a two-form label; the seed says する. Rows in やる are rebuilt to する (target unchanged).',
  b={'B03': ('友達とします', '和朋友做'), 'U01': ('私は友達と一緒にしたい', '我想和朋友一起做'), 'U03': ('もししたいなら、手伝う', '如果你想做我帮你'),
     'U05': ('彼は今日しなければならない', '他今天需要做')})
D('S0051L03', 'regloss', known='面白いこと', kmatch='面白いこと',
  why='Found by hand beside L02 (not a scan row): "面白いことをやる" says やる, which the seed does not; 有趣的事 is the seed\'s 面白いこと (做 = する is L02).',
  b={'B01': ('面白いことをする', '做有趣的事'), 'B02': ('友達と面白いことをする', '和朋友做有趣的事')})

# ---- seed 52 "彼は先週友達に手紙を書きたかったです。| 他上星期想给他的朋友写信。"
D('S0052L01', 'grow', known='友達に手紙を書く', target='给他的朋友写信', type='M',
  comps=[['あげる', '给'], ['彼の', '他的'], ['友達', '朋友'], ['手紙を書く', '写信']],
  why='给 is a coverb taught alone (L7) under "〜に". It opens 给…写信 (L22/L32: grows to its verb, frame whole with its middle): the seed\'s 友達に手紙を書く = 给他的朋友写信. KEPT AT 7 SYLLABLES: 给他的朋友 alone leaves に bound and 他的 with no Japanese; no shorter contiguous cut has the seed\'s words on both sides. Old rows (four of them English) go. L13 note: L03 "手紙を書く | 写信" follows.',
  b=dels('B01', 'B02', 'B03', 'U01', 'U02', 'U03', 'U04'),
  add=[('b', '友達に手紙を書きたい', '想给他的朋友写信'), ('b', '先週友達に手紙を書く', '上星期给他的朋友写信'), ('b', '彼は友達に手紙を書く', '他给他的朋友写信'),
       ('u', '彼は先週友達に手紙を書きたかったです', '他上星期想给他的朋友写信'), ('u', '彼は今日友達に手紙を書くつもりです', '他今天要给他的朋友写信'),
       ('u', '彼は明日友達に手紙を書きたいです', '他明天想给他的朋友写信'), ('u', '彼は中国語で友達に手紙を書こうとしています', '他在试着用中文给他的朋友写信'),
       ('u', '彼は友達に手紙を書く必要があります', '他需要给他的朋友写信')])
D('S0052L02', 'regloss', known='先週',
  why='Found by hand (the scan missed it): the LEGO and its whole basket are in ENGLISH ("last week") in a Japanese-known course. The seed says 先週. Rows rebuilt in Japanese.',
  b={'B01': ('先週学んだ', '上星期我学了'), 'B02': 'd', 'B03': ('先週彼は練習した', '上星期他练习了'),
     'U01': ('先週は終わらせませんでした', '我上星期没完成'), 'U02': ('先週どのくらい学びましたか', '上星期你学了多久'),
     'U03': ('先週彼女はもっと練習したかったです', '上星期她想多练习'), 'U04': ('先週彼は今より気分が良かったです', '上星期他感觉比现在好')},
  add=[('b', '先週始めた', '上星期开始了'), ('u', '先週友達と話しました', '我上星期和朋友说话了')])

# ---- seed 53 "彼女は彼の手紙を自分のかばんに入れたかったです。| 她想把他的信放在她的包里。"
D('S0053L01', 'regloss', known='かばん',
  why='Found by hand: the LEGO and its basket are in ENGLISH ("bag"). The seed says かばん. Rows rebuilt in Japanese (targets unchanged).',
  b={'B01': ('彼のかばん', '他的包'), 'B02': ('彼女のかばん', '她的包'), 'B03': ('私のかばん', '我的包'),
     'U01': ('彼女は彼のかばんが好きです', '她喜欢他的包'), 'U02': ('あなたのかばんはどうですか', '你的包怎么样'),
     'U03': ('彼のかばんが必要ですか', '你需要他的包吗'), 'U05': ('彼女のかばんは彼のより良いです', '她的包比他的好')},
  add=[('u', '彼女はかばんが必要です', '她需要一个包')])
D('S0053L02', 'grow', known='かばんに', target='包里', type='M', comps=[['かばん', '包'], ['中', '里']],
  why='里 is a postposition taught alone (L7) under "〜の中", which the seed never says. Folded into its noun: the seed\'s かばんに = 包里 (2). L01 "かばん | 包" is taught first. Rows were English: rebuilt.',
  b={'B01': 'd', 'B02': 'd', 'B03': 'd', 'U01': ('手紙はかばんに入っています', '信在包里'), 'U02': ('彼女の手紙はかばんに入っています', '她的信在包里'),
     'U03': ('手紙は彼女のかばんに入っています', '信在她的包里'), 'U05': 'd'},
  add=[('b', '自分のかばんに', '她的包里'), ('b', '私のかばんに', '我的包里'), ('b', 'あなたのかばんに', '你的包里'),
       ('u', '答えはかばんに入っています', '答案在包里'), ('u', '彼の手紙は私のかばんに入っています', '他的信在我的包里')])
D('S0053L04', 'grow', known='彼の手紙を', target='把他的信', type='M', comps=[['を', '把'], ['彼の', '他的'], ['手紙', '信']],
  why='把 is a particle taught alone (L7) under "〜を". Folded into the object it marks: the seed\'s 彼の手紙を = 把他的信 (4). Rows were English: rebuilt; the seed copy stays.',
  b={'B01': 'd', 'B02': 'd', 'B03': 'd', 'U01': 'd', 'U02': 'd', 'U03': 'd', 'U04': 'd',
     'U05': ('彼女は彼の手紙を自分のかばんに入れたかったです', '她想把他的信放在她的包里')},
  add=[('b', '彼の手紙をかばんに入れる', '把他的信放在包里'), ('b', '彼の手紙を見せる', '把他的信给我看'), ('b', '彼の手紙を彼女にあげる', '把他的信给她'),
       ('u', '彼の手紙をかばんに入れたいです', '我想把他的信放在包里'), ('u', '彼の手紙を見せてくれますか', '你能把他的信给我看吗'),
       ('u', '彼女は彼の手紙を私に見せたかったです', '她想把他的信给我看'), ('u', '彼の手紙を自分のかばんに入れるつもりです', '我要把他的信放在我的包里')])

# ---- seed 55 "よく眠れなかった時に起きるのは楽しくありません。| 我睡不好的时候不喜欢醒来。"
D('S0055L01', 'regloss', known='眠る', why='"眠る・寝る" is a two-form label; the seed says 眠る. Rows in 寝る rebuilt to 眠る (targets unchanged).',
  b={'B01': ('私は眠らない', '我不睡'), 'B02': ('彼女は眠った', '她睡了'), 'B03': ('あなたは何時間眠りましたか', '你睡了多久'),
     'U02': ('昨夜私は眠った', '我昨天晚上睡了'), 'U04': ('彼は何時間眠ったか', '他睡了多久了')},
  add=[('u', '昨夜はよく眠れませんでした', '我昨天晚上睡不好')])
D('S0055L02', 'regloss', known='起きる', why='"起きる・目が覚める" is a two-form label; the seed says 起きる. One row carried Chinese 下午 in the Japanese: fixed.',
  b={'U03': ('午後に起きるのが好きじゃない', '我不喜欢下午醒来')}, add=[('u', '彼女は六時に起きます', '她六点醒来')])

# ---- seed 56 "だからいくつかの言葉の言い方を覚えられます。| 所以我能记住怎么说几个词。"
D('S0056L01', 'regloss', known='だから', why='"だから・そのため" is a two-form label; the seed says だから. Every row says だから.',
  add=[('b', 'だから練習する', '所以我练习'), ('u', 'だから彼の名前を覚えられます', '所以我能记住他的名字')])
D('S0056L02', 'grow', known='覚えられる', target='能记住', type='M', comps=[['できる', '能'], ['覚える', '记住']],
  why='"〜できる" is gapped and できる is not in the seed; 能 grows to its verb: the seed\'s 覚えられる = 能记住 (2).',
  b=dels('B01', 'B02', 'B03', 'U02', 'U03', 'U04', 'U05'),
  add=[('b', 'いくつかの言葉を覚えられる', '能记住几个词'), ('b', '私は覚えられる', '我能记住'), ('b', '名前を覚えられる', '能记住名字'),
       ('u', 'あなたは彼の名前を覚えられますか', '你能记住他的名字吗'), ('u', 'だから文全体を覚えられます', '所以我能记住整个句子'),
       ('u', '彼女はいくつかの言葉を覚えられます', '她能记住几个词'), ('u', '今日は言い方を覚えられます', '我今天能记住怎么说')])

# ---- seed 58 "十分な言葉がわかると面白いです。| 你懂够多词的时候很有趣。"
D('S0058L01', 'regloss', known='わかる', kmatch='わか', why='Found by hand: the gloss is the truncated "わか". The seed says わかる.')
D('S0058L02', 'regloss', known='十分な', why='"十分に多い・十分な" is a two-form label; the seed says 十分な. Every row says 十分.', add=[('u', '彼女は十分な言葉を知っています', '她知道够多词')])

# ---- seed 60 "まだ十分な違う言葉の言い方を知りません。| 我还不知道怎么说够多不同的词。"
D('S0060L01', 'regloss', known='まだ', why='"まだ・まだ〜ない" is a two-form label with a gap; the seed says まだ. Every row says まだ.')
D('S0060L02', 'regloss', known='違う', why='"違う・異なる" is a two-form label; the seed says 違う. Every row says 違う.', add=[('u', '私たちは違う言葉を学びたいです', '我们想学不同的词')])

# ---- seed 63 "手伝っても構いませんか？| 你确定你不介意帮我吗？"
D('S0063L01', 'regloss', known='構う', why='"気にする・構う" is a two-form label (and 気にする is S0048L01 "| 在乎"); the seed says 構いません. Rows in 気にする rebuilt (targets unchanged).',
  b={'B01': ('構わない', '我不介意'), 'B02': ('構いますか', '你介意吗'), 'B03': ('手伝うのは構わない', '他不介意帮'),
     'U02': ('間違えても構わない', '我不介意犯错'), 'U03': ('あなたは中国語を話しても構いませんか', '你确定你不介意说中文吗'),
     'U04': ('もし構わなければ手伝いたい', '如果你不介意我想帮你'), 'U05': ('彼女は時間をかけても構わない', '她不介意花时间')})

# ---- seed 64 "中国語を学ぶのは簡単ではありませんが楽しいです。| 学中文不容易但是很有趣。"
D('S0064L01', 'regloss', known='簡単ではない', why='"難しい・簡単ではない" is a two-form label; the seed says 簡単ではありません. Two rows carried Chinese (別人, 同時) in the Japanese.',
  b={'B03': ('他の人を助けるのは簡単ではない', '帮别人不容易'), 'U02': ('簡単ではないから練習する必要がある', '不容易所以要练习'),
     'U04': ('簡単ではないけれど、まだ試したい', '不容易我还想试'), 'U05': 'd'},
  add=[('u', '中国語を話すのは簡単ではないが面白いです', '说中文不容易但是很有趣')])

# ---- seed 67 "なぜ止まりたいのですか？| 你为什么想停止？"
D('S0067L01', 'regloss', known='止まる', why='"止まる・止める" is a two-form label; the seed says 止まり. U04 (止める, transitive) goes; U03 was not Chinese (她觉得想停止).',
  b={'U03': ('彼女は止まりたいと思っている', '她觉得她想停止'), 'U04': 'd'},
  add=[('u', '彼は今止まりたくありません', '他现在不想停止'), ('u', '私たちは今日止まりたくありません', '我们今天不想停止')])

# ---- seed 69 "彼は午後ずっと若い犬の世話をしたくありませんでした。| 他不想整个下午照顾小狗。"
D('S0069L02', 'regloss', known='若い犬', why='"子犬・小さい犬" is a two-form label and neither is the seed\'s word: it says 若い犬. Rows rebuilt to 若い犬; rows with untaught 找/重要 go.',
  b={'B01': ('若い犬の世話をする', '照顾小狗'), 'B02': ('彼の若い犬', '他的小狗'), 'B03': 'd',
     'U01': ('彼は午後ずっと若い犬の世話をしたくなかった', '他不想整个下午照顾小狗'), 'U02': ('私は若い犬の世話が好きじゃない', '我不喜欢照顾小狗'),
     'U03': ('若い犬の世話は簡単ではない', '照顾小狗不容易'), 'U04': 'd', 'U05': 'd'},
  add=[('b', '若い犬が好き', '喜欢小狗'), ('u', '彼女は若い犬の世話をしたいです', '她想照顾小狗'), ('u', '明日若い犬の世話をするつもりです', '我明天要照顾小狗'),
       ('u', '私たちは若い犬が好きです', '我们喜欢小狗')])

# ---- seed 70 "彼女はそれがどこにあるか教えたくありませんでした。| 她不想告诉我它在哪里。"
D('S0070L01', 'regloss', known='教える', why='"教える・伝える" is a two-form label; the seed says 教えたく. Every row says 教え.')

# ---- seed 71 "誰にも本当のことを聞かせたくありませんでした。| 我们不想让任何人听到真相。"
D('S0071L01', 'regloss', known='誰にも', why='"誰でも・誰にも" is a two-form label; the seed says 誰にも. Rows in 誰でも, or with untaught 来, go; U01 paired 知道 with 教える: matched.',
  b={'B01': ('誰にも教えない', '不告诉任何人'), 'B02': 'd', 'B03': ('誰にも知らせたくないですか', '你不想让任何人知道吗'),
     'U01': ('誰にも知られたくない', '不想让任何人知道'), 'U03': 'd', 'U05': 'd'},
  add=[('b', '誰にも見せない', '不给任何人看'), ('u', '私たちは誰にも知られたくありません', '我们不想让任何人知道'),
       ('u', '彼女は誰にも手紙を見せたくありません', '她不想给任何人看信')])
D('S0071L02', 'grow', known='本当のことを聞く', target='听到真相', type='M', comps=[['聞く', '听到'], ['本当のこと', '真相']],
  why='"聴く・聞こえる" is a two-form label and neither is the seed\'s word (聞かせ). The bare regloss 聞く clashes with S0030L02 "聞く | 问" (ZUT), so it grows by the seed\'s next word: 本当のことを聞く = 听到真相 (4). L13 note: L03 "本当のこと | 真相" follows.',
  b=dels('B01', 'B02', 'B03', 'U01', 'U02', 'U03', 'U04', 'U05'),
  add=[('b', '本当のことを聞きたい', '想听到真相'), ('b', '彼女は本当のことを聞いた', '她听到真相了'), ('b', '今日本当のことを聞いた', '我今天听到真相了'),
       ('u', '私たちは本当のことを聞きたいです', '我们想听到真相'), ('u', '彼は本当のことを聞きたくありません', '他不想听到真相'),
       ('u', 'あなたは本当のことを聞きましたか', '你听到真相了吗'), ('u', '彼女は昨日本当のことを聞きました', '她昨天听到真相了'),
       ('u', '誰にも本当のことを聞かせたくありません', '我不想让任何人听到真相')])
D('S0071L03', 'regloss', known='本当のこと', why='"本当のこと・真相" is a two-form label (真相 is not Japanese for this seed); the seed says 本当のこと. Every row says it.', add=[('u', '私は本当のことを知りたいです', '我想知道真相')])

# ---- seed 76 "もう学んだことにとても満足しています。| 我很高兴我已经学了这么多。"
D('S0076L01', 'seed', seed_known='もうこんなにたくさん学べて、とても嬉しいです。',
  why='The Japanese seed says 満足しています ("satisfied", 满意) and has no word for 这么多; the Chinese says "I\'m very happy I\'ve already learnt this much". No chunk of the Japanese seed glosses 很高兴 or 这么多, so the known seed is the wrong side (S15 sense: mistranslation). KAI: seed edit to もうこんなにたくさん学べて、とても嬉しいです。 (こんなにたくさん, not こんなに, which S0077L03 takes for 这么).')
D('S0076L01', 'regloss', known='とても嬉しい', kmatch='嬉し',
  why='"嬉しい・満足している" is a two-form label; with the seed edit the seed says とても嬉しい = 很高兴. Every row says 嬉し.')
D('S0076L02', 'regloss', known='もう', why='"すでに・もう〜した" is a two-form label with a gap; the seed says もう. Rows in すでに rebuilt; U02 (untaught 来) goes.',
  b={'B01': ('もう学んだ', '已经学了'), 'B02': ('もう完成した', '已经完成了'), 'B03': ('彼はもう手伝った', '他已经帮了'), 'U01': ('もう終わらせました', '我已经完成了'),
     'U02': 'd', 'U03': ('彼はもう手伝ってくれた', '他已经帮你了'), 'U04': ('私はもう嬉しい', '我已经很高兴了'), 'U05': ('もうどれくらい学びましたか', '你已经学了多久了')},
  add=[('u', '彼女はもう中国語を学び始めました', '她已经开始学中文了')])
D('S0076L03', 'regloss', known='こんなにたくさん', why='"こんなに多く・これだけ" is a two-form label; with the seed edit the seed says こんなにたくさん (こんなに alone is S0077L03 | 这么). Rows rebuilt; U03 (untaught 感谢) goes.',
  b={'B01': ('こんなにたくさん学んだ', '学了这么多'), 'B02': ('もうこんなにたくさん学んだ', '已经学了这么多'), 'B03': ('こんなにたくさん話した', '说了这么多'),
     'U01': ('もうこんなにたくさん学べて、とても嬉しいです', '我很高兴我已经学了这么多'), 'U02': ('もうこんなにたくさん中国語を話した', '我已经说了这么多中文'),
     'U03': 'd', 'U04': ('もうこんなにたくさんした', '已经做了这么多'), 'U05': ('こんなにたくさん学んでとても面白い', '学了这么多很有趣')},
  add=[('u', '彼女はこんなにたくさん話しました', '她说了这么多')])

# ---- seed 80 "いつ準備ができるかわかりません。| 我不确定我什么时候准备好。"
D('S0080L01', 'regloss', known='準備ができる', why='"準備できる・準備が整う" is a two-form label; the seed says 準備ができる. Every row says 準備.')

# ---- seed 83 "あなたの友達について言ったことに同意します。| 我同意你说的关于你朋友的事。"
D('S0083L03', 'regloss', known='こと', why='"こと・もの・事" is a three-form label; the seed says こと. Rows with untaught 有 / a wrong measure (几个事) go; basket back-filled to the floor.',
  b={'B03': 'd', 'U03': 'd'},
  add=[('b', '友達のこと', '朋友的事'), ('b', '彼のこと', '他的事'), ('b', '中国語についてのこと', '关于中文的事'),
       ('u', '彼女について言ったことに同意します', '我同意你说的关于她的事'), ('u', '彼のことを知りたいです', '我想知道他的事'),
       ('u', 'あなたの友達のことを知っています', '我知道你朋友的事'), ('u', '私は彼女のことを心配しています', '我担心她的事')])

# ---- seed 90 "もっとゆっくり話していただければ嬉しいです。| 如果你可以说慢一点就太好了。"  (found by hand: the ZUT partner of S0076L02 "もう")
D('S0090L01', 'delete',
  why='Found by hand: "もう | 就" — the seed has no もう, and もう → 已经 is S0076L02. 就 here is the "then" of 就太好了 (bound, L22); its seed part is taken by L02 grown below (就 stays a component, K29), so this LEGO and its basket go. Its rows drilled 就 = "すぐ/then" with nine other verbs.')
D('S0090L02', 'grow', known='嬉しいです', target='就太好了', type='M', comps=[['それなら', '就'], ['すごい', '太好了']],
  why='"すごい" is not in the seed (scan ZUT: すごい → 太好了/棒). The seed\'s 嬉しいです closes the if-clause: 嬉しいです = 就太好了 (4), carrying L01\'s 就. Near-twin note: とても嬉しい → 很高兴 (S0076L01) is a different prompt.',
  b={'B01': 'd', 'B02': 'd', 'B03': 'd', 'U01': 'd', 'U02': ('彼女が戻ってきたら嬉しいです', '如果她回来了就太好了'), 'U03': 'd',
     'U05': ('もし彼女が手伝ってくれたら嬉しいです', '如果她能帮我就太好了')},
  add=[('b', '手伝ってくれたら嬉しいです', '你能帮我就太好了'), ('b', '来てくれたら嬉しいです', '你能来就太好了'), ('b', '今日できたら嬉しいです', '今天能做就太好了'),
       ('u', 'もし彼が戻ってきたら嬉しいです', '如果他回来了就太好了'), ('u', 'もし明日来られたら嬉しいです', '如果你明天能来就太好了'),
       ('u', 'もし中国語を話せたら嬉しいです', '如果我能说中文就太好了'), ('u', 'もし彼が準備ができていたら嬉しいです', '如果他准备好了就太好了')])

# ---- seed 91 "間に合うように答えるほど早く考えるのは難しいです。| 很难想得够快来及时回答。"
D('S0091L01', 'grow', known='間に合うように答える', target='来及时回答', type='M', comps=[['ために', '来'], ['間に合うように', '及时'], ['答える', '回答']],
  why='"来る／〜するために" is a two-form label. In this seed 来 is the purpose link ("so as to"), not "come"; every row drilled "come", which the seed never says. 来 is bound here and grows to its verb phrase: 間に合うように答える = 来及时回答 (5). L13 note: L02 "間に合うように | 及时" follows.',
  b=dels('B01', 'B02', 'B03', 'U01', 'U02', 'U03', 'U04', 'U05'),
  add=[('b', '早く考えて間に合うように答える', '快点想来及时回答'), ('b', '早く話して間に合うように答える', '快点说来及时回答'),
       ('b', 'よく考えて間に合うように答える', '仔细想来及时回答'),
       ('u', '間に合うように答えるほど早く考えたいです', '我想快点想来及时回答'), ('u', '彼はよく考えて間に合うように答えます', '他仔细想来及时回答'),
       ('u', '彼女は早く考えて間に合うように答えようとしています', '她在试着快点想来及时回答'),
       ('u', '私たちは早く考えて間に合うように答えたいです', '我们想快点想来及时回答'),
       ('u', 'あなたは早く考えて間に合うように答えられますか', '你能快点想来及时回答吗')])

# ---- seed 93 "もう行く時間です。| 现在该走了。"
D('S0093L01', 'grow', known='行く時間です', target='该走了', type='M', comps=[['時間です', '该'], ['行く', '走'], ['た', '了']],
  why='"〜すべき／〜する時間" is a gapped two-form label. 该 is bound and grows to its verb in the seed: 行く時間です = 该走了 (3).',
  b={'B01': 'd', 'B02': 'd', 'U02': 'd', 'U03': 'd', 'U04': 'd', 'U05': 'd'},
  add=[('b', '彼はもう行く時間です', '他该走了'), ('b', '私たちは行く時間です', '我们该走了'),
       ('u', 'あなたはもう行く時間ですか', '你该走了吗'), ('u', '六時です、もう行く時間です', '六点了，该走了'),
       ('u', '私はもう行く時間だと思います', '我觉得我该走了'), ('u', '彼女はもう行く時間ですか', '她该走了吗')])

# ---- seed 95 "次のバスで家に帰る準備はできていますか？| 你准备好坐下一班车回家了吗？"
D('S0095L01', 'grow', known='次のバスで', target='坐下一班车', type='M', comps=[['乗る', '坐'], ['次の', '下一'], ['バス', '班车']],
  why='"座る／乗る" is a two-form label and neither is in the seed. 坐 here is the seed\'s バスで: 次のバスで = 坐下一班车 (5). L13 note: L02 次の and L03 バス follow.',
  b=dels('B01', 'B02', 'B03', 'U02', 'U03', 'U04', 'U05'),
  add=[('b', '次のバスで行く', '坐下一班车走'), ('b', '次のバスで戻る', '坐下一班车回来'), ('b', '次のバスで来る', '坐下一班车来'),
       ('u', '次のバスで行きたいです', '我想坐下一班车走'), ('u', '彼は次のバスで戻ってきます', '他坐下一班车回来'),
       ('u', '次のバスで行く準備はできていますか', '你准备好坐下一班车走了吗'), ('u', '彼女は次のバスで来るつもりです', '她要坐下一班车来'),
       ('u', '私たちは次のバスで戻りたいです', '我们想坐下一班车回来')])

# ---- seed 99 "なぜうまくいかないのか自分に聞いた方がいいです。| 你该问自己为什么不行。"
D('S0099L02', 'regloss', known='うまくいく', why='"大丈夫／うまくいく" is a two-form label; the seed says うまくいかない. Rows in 大丈夫 rebuilt or go.',
  b={'B01': 'd', 'B02': ('うまくいかない', '不行'), 'B03': ('彼はうまくいかないと言いました', '他说不行'), 'U03': ('うまくいくと思いますか', '你觉得行吗')}, add=[('b', 'うまくいくと思う', '觉得行')])

# ---- seed 102 "そうではないと言おうとしています。| 我们试着说不是那样的。"
D('S0102L01', 'grow', known='そうではない', target='不是那样的', type='M', comps=[['ではない', '不是'], ['そう', '那样'], ['の', '的']],
  why='"そのように・そう" is a two-form label; the seed\'s そう alone clashes with S0049L02 "そう | 这样" (ZUT), so it grows to the seed\'s そうではない = 不是那样的 (4).',
  b=dels('B01', 'B02', 'B03', 'U01', 'U02', 'U03', 'U04', 'U05', 'U06'),
  add=[('b', 'そうではないと言う', '说不是那样的'), ('b', '彼はそうではないと思う', '他觉得不是那样的'), ('b', 'それはそうではない', '它不是那样的'),
       ('u', 'そうではないと言おうとしています', '我们试着说不是那样的'), ('u', '私はそうではないと思います', '我觉得不是那样的'),
       ('u', '彼女はそうではないと言いました', '她说不是那样的'), ('u', 'なぜそうではないのですか', '为什么不是那样的'),
       ('u', '本当のことはそうではない', '真相不是那样的')])

# ---- seed 107 "あなたがやっていることを見たいと思いました。| 我们希望看你在做什么。"
D('S0107L01', 'grow', known='見たいと思う', target='希望看', type='M', comps=[['望む', '希望'], ['見る', '看']],
  why='"望む／願う" is a two-form label and neither is in the seed; 希望 here is the seed\'s 見たいと思いました: 見たいと思う = 希望看 (3).',
  b=dels('B01', 'B02', 'B03', 'U01', 'U02', 'U03', 'U05'),
  add=[('b', 'あなたを見たいと思う', '希望看你'), ('b', '彼女は見たいと思う', '她希望看'), ('b', 'あなたがやっていることを見たいと思う', '希望看你在做什么'),
       ('u', '私たちはあなたがやっていることを見たいと思いました', '我们希望看你在做什么'), ('u', '彼女はあなたの手紙を見たいと思っています', '她希望看你的信'),
       ('u', '彼は答えを見たいと思っています', '他希望看答案'), ('u', '私はあなたのかばんを見たいと思います', '我希望看你的包'),
       ('u', '私たちは若い犬を見たいと思っています', '我们希望看小狗')])

# ---- seed 109 "たくさんの新しい言葉を学ぶために一生懸命働かなければなりません。| 我们必须努力学很多新词。"
D('S0109L01', 'grow', known='一生懸命働かなければならない', target='必须努力', type='M', comps=[['なければならない', '必须'], ['頑張る', '努力']],
  why='"〜しなければならない" is gapped and しなければ is not in the seed. 必须 is bound and grows to its verb in the seed: 一生懸命働かなければならない = 必须努力 (4).',
  b=dels('B01', 'B02', 'B03', 'U01', 'U02', 'U04', 'U05'),
  add=[('b', '私たちは一生懸命働かなければならない', '我们必须努力'), ('b', '彼は一生懸命働かなければならない', '他必须努力'), ('b', '今日は一生懸命働かなければならない', '今天必须努力'),
       ('u', '中国語を学ぶために一生懸命働かなければなりません', '我必须努力学中文'), ('u', '彼女は一生懸命働かなければなりません', '她必须努力'),
       ('u', '明日は一生懸命働かなければなりません', '我明天必须努力'), ('u', '新しい言葉を覚えるために一生懸命働かなければなりません', '我必须努力记住新词'),
       ('u', 'あなたは一生懸命働かなければなりませんか', '你必须努力吗')])

# ---- seed 77 "こんなに早く理解し始めていることに驚いています。| 我很惊讶我开始懂得这么快。"
D('S0077L02', 'grow', known='理解し始める', target='开始懂得', type='M', comps=[['始める', '开始'], ['理解する', '懂得']],
  why='Found by hand: "わかる | 懂得" — the seed says 理解し, and わかる → 懂 is S0058L01 (one prompt, two answers). The bare regloss 理解する clashes with an existing "理解する | 理解" (ZUT), so it grows by the seed\'s next word: 理解し始める = 开始懂得 (4).',
  b={'B01': ('中国語を理解し始める', '开始懂得中文'), 'B02': ('やり方を理解し始める', '开始懂得怎么做'), 'U03': ('言い方を理解し始めましたか', '你开始懂得怎么说了吗'),
     'U04': 'd', 'U05': 'd'},
  add=[('b', '彼は理解し始める', '他开始懂得'), ('u', '彼女は中国語を理解し始めました', '她开始懂得中文了'), ('u', '私たちはもう理解し始めています', '我们已经开始懂得了'),
       ('u', 'あなたは中国語を理解し始めていますか', '你开始懂得中文了吗')])
D('S0077L03', 'regloss', known='こんなに', why='"こんなに・これほど" is a two-form label; the seed says こんなに. Rows in これほど rebuilt.',
  b={'B01': ('こんなに早い', '这么快'), 'B02': ('こんなに良い', '这么好'), 'B03': ('こんなにたくさん理解した', '懂得这么多'),
     'U04': ('こんなに早く学んでとても良い', '学得这么快很好'), 'U02': ('彼はもうこんなにたくさん学んだ', '他已经学了这么多')})

# ---- seed 134 "彼らと難しいことに取り組んでも問題ありません。| 跟他们一起做难的事情的时候没有问题。"  (found by hand: ZUT partner of S0083L03)
D('S0134L01', 'grow', known='難しいこと', target='难的事情', type='M', comps=[['難しい', '难'], ['の', '的'], ['こと', '事情']],
  why='"こと | 事情" clashes with S0083L03 "こと | 事" once 83 is mended (ZUT). The later LEGO grows by the seed\'s word before it: 難しいこと = 难的事情 (4). Rows in "this thing" (这个事情, untaught 这个/相信/奇怪) go.',
  b={'B01': 'd', 'U01': 'd', 'U03': 'd', 'U04': 'd', 'U05': 'd', 'U06': 'd'},
  add=[('b', '難しいことを学ぶ', '学难的事情'), ('u', '私は難しいことをするのが好きです', '我喜欢做难的事情'), ('u', '彼女は難しいことを学びたいです', '她想学难的事情'),
       ('u', '私たちは一緒に難しいことをしたいです', '我们想一起做难的事情'), ('u', '難しいことをするのは良いことだと思います', '我觉得做难的事情是好事'),
       ('u', '彼は難しいことを心配しています', '他担心难的事情')])

json.dump({'course': 'zho_for_jpn', 'legos': OUT}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'zho_for_jpn.json'), 'w'), ensure_ascii=False, indent=1)
print(len(OUT), 'decisions')
