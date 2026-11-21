#!/usr/bin/env python3
"""zho_for_jpn item-10 decisions, seeds 151-300 (cs #743·AI, shard b), hand-authored per LEGO. Writes zho_for_jpn-b.json for
tools/plan.py --tag -b --base plans/zho_for_jpn.json (planned AGAINST the 1-150 plan's after state: its glosses are what
ZUT and duplicates are judged on). 111 candidates (all L26 dictionary-style glosses) + 4 neighbours:
S0255L01 and S0278L03 (knock-ons of the 1-150 plan: exact duplicates → not-new), S0253L02 (duplicate of S0155L02 once that
is "分 | 分钟") and S0090L01 ("もう | 就", a 1-150 LEGO whose gloss is not in its seed and blocks もう | 已经 at seed 244).

Conventions are those of decisions/zho_for_jpn.py: SEED SPAN · K6 (plain form of the seed's inflected word, ack) ·
STAND-IN (する for a fused ending, ack) · GROW (particle / bound piece / no Japanese counterpart → its own seed's span) ·
SEED EDIT (L25 rung 3, KAI'S CALL). Two things are specific to this half of the course:
 * NOT-NEW — seeds 234-300 re-teach many pairs the course already has. Once the gloss is the seed's one word, the LEGO is
   an exact duplicate of an earlier LEGO on both sides and is marked is_new false (duplicate rule); its basket goes dark,
   rows are left as they are except rows that carried a gap marker or a two-form gloss.
 * SEED EDITS are frequent here (20 seeds): the Japanese seed was translated loosely from the English while every basket
   row was written from the Chinese, so the rows and the Chinese agree with each other and the Japanese seed is the odd
   one out. Each is one seed line against 5-10 re-worded rows, and each is marked KAI."""
import json, os
OUT = []
HERE = os.path.dirname(os.path.abspath(__file__))
DUMP = os.path.join(os.environ.get('CS_SCRATCH', '/tmp'), 'dumps', 'zho_for_jpn.json')
L = {}
if os.path.exists(DUMP):
    for s in json.load(open(DUMP))['seeds']:
        for l in s['legos']:
            L[l['id']] = l


def D(id, verdict, **kw):
    kw['id'] = id
    kw['verdict'] = verdict
    b = kw.pop('b', None) or {}
    if verdict in ('regloss', 'grow'):
        bk = {k: ('keep' if v == 'k' else 'del' if v == 'd' else list(v)) for k, v in b.items()}
        nt = kw.get('target', L[id]['target'] if id in L else None)
        for p in (L.get(id) or {}).get('phrases', []):
            if p['type'] in ('lego_debut', 'component') or ':' not in p['id']:
                continue
            sid = p['id'].split(':')[1][8:]
            if sid not in bk:
                bk[sid] = 'keep'
            if bk[sid] == 'keep' and kw.get('is_new', True):
                assert nt.replace(' ', '') in p['target'].replace(' ', ''), (id, sid, 'kept row lacks the new LEGO', p['target'])
        kw['basket'] = bk
    if 'comps' in kw:
        kw['components'] = kw.pop('comps')
    OUT.append(kw)


def NN(id, dup, **kw):
    """the gloss becomes the seed's one word and the LEGO is then an exact duplicate of `dup` → not-new"""
    why = kw.pop('why', '')
    D(id, 'regloss', is_new=False, why=f'NOT-NEW: {why} Exact duplicate of {dup} on both sides → is_new false (duplicate rule); basket goes dark.', **kw)


K = ['known']

# ================= neighbour in seeds 1-150 =================
# ---- seed 90 もっとゆっくり話していただければ嬉しいです。 | 如果你可以说慢一点就太好了。
D('S0090L01', 'grow', known='嬉しいです', target='就太好了', type='M', comps=[['もう', '就'], ['すごい', '太好了']],
  why='NEIGHBOUR of S0244L01 / S0254L03: seed 90 has no もう at all, and "もう | 就" would make もう one known → two targets once S0244L01 is the seed-true "もう | 已经". 就 is a particle (L7); it grows to what it introduces in its own seed, 就太好了 = 嬉しいです (4 syllables). Rows used 就 with other words → rebuilt on the taught combination (with 能, since 可以 is the seed\'s own word but no LEGO of the course covers it; only the seed sentence itself keeps 可以). L13 note: L02 "すごい | 太好了" follows and overlaps (S4).',
  b={k: 'd' for k in ['B01', 'B02', 'B03', 'U01', 'U02', 'U03', 'U04', 'U05']},
  add=[('b', '嬉しいです。', '就太好了。'), ('b', '手伝っていただければ嬉しいです。', '如果你能帮我就太好了。'),
       ('b', '来ていただければ嬉しいです。', '如果你能来就太好了。'), ('b', '待っていただければ嬉しいです。', '如果你能等就太好了。'),
       ('u', 'もっとゆっくり話していただければ嬉しいです。', '如果你可以说慢一点就太好了。'), ('u', '説明していただければ嬉しいです。', '如果你能解释就太好了。'),
       ('u', '明日来ていただければ嬉しいです。', '如果你能明天来就太好了。'),
       ('u', '一緒に練習していただければ嬉しいです。', '如果你能和我一起练习就太好了。'), ('u', 'もう一度言っていただければ嬉しいです。', '如果你能再说就太好了。')])

# ---- seed 153 全く同じ言い方はしなかったでしょう。 | 我不会用完全一样的方式说。
D('S0153L01', 'regloss', known='完全に', seed_known='完全に同じ言い方はしなかったでしょう。',
  why='SEED EDIT + SEED SPAN. KAI: the seed says 全く; the rows say 完全に, and 全くわかりません ("not at all") would not mean 不完全理解 ("not completely"). 全く → 完全に in the seed keeps 7 rows. The one 全然 row is re-worded.',
  b={'B04': ('完全に同じ', '完全一样')})

# ---- seed 155 明日の朝数分待っても構いません。 | 我不介意明天早上等几分钟。
D('S0155L02', 'regloss', known='分', why='SEED SPAN: 分 is in the seed (数分); 間 is not. All rows say 数分.',
  knock='S0253L02 "分 | 分钟" becomes an exact duplicate → planned not-new below.')

# ---- seed 161 日曜日の朝その本をくれますか？ | 你星期天早上能给我那本书吗？
D('S0161L03', 'grow', known='その本', target='那本书', type='M', comps=[['その', '那'], ['冊', '本'], ['本', '书']],
  why='GROW: the measure word 本 has no Japanese word in the seed (no 冊) and is never a unit of meaning alone (L7); it grows to its own seed\'s 那本书 = その本 (3 syllables; L02 书 taught first). The two 这本书 rows are edited to the taught combination.',
  b={'B02': ('その本は私のです', '那本书是我的。'), 'U02': ('その本が必要です', '我需要那本书。')},
  add=[('b', 'その本', '那本书'), ('u', '日曜日の朝その本をくれますか？', '你星期天早上能给我那本书吗？')])

# ---- seed 172 はい、それはとても助かります。 | 是的，那会很有帮助。
D('S0172L01', 'regloss', known='助かる', ack=K,
  why='K6: the seed says 助かります (助かる). 役に立つ is not in it and is S0028L02\'s gloss for 有用的; the three 役に立つ rows are re-worded. 助ける / 助け rows are the same word family (K6).',
  b={'B02': ('これはとても助かります', '这会很有帮助。'), 'U02': ('それは助かりますか？', '那会有帮助吗？'), 'U05': ('あの本は助かります', '那本书会有帮助。')})

# ---- seed 178 あなたに会いたかったけど、時間がありませんでした。 | 我没有时间，虽然我想见你。
D('S0178L01', 'regloss', known='けど',
  why='SEED SPAN: the seed says けど. Gap markers and the second form go. Rows say けれど / けれども (same word, K6). Thin basket (5 rows live) back-filled.',
  add=[('b', '会いたかったけど', '虽然我想见你'), ('b', '時間がないけど', '虽然没有时间'),
       ('u', 'あなたに会いたかったけど、時間がありませんでした。', '我没有时间，虽然我想见你。')])

# ---- seed 181 でも母を医者に連れて行かなければなりません。 | 但是我必须带我妈妈去看医生。
D('S0181L01', 'regloss', known='連れて行く', ack=K,
  why='K6: the seed says 連れて行か…; the other three forms are not in it. The two 持って… rows (a different verb) go.',
  b={'U03': 'd', 'U04': 'd'},
  add=[('b', '母を連れて行く', '带我妈妈去'), ('u', '母を連れて行きたい', '我想带我妈妈去'), ('u', '彼は友達を連れて行きました', '他带朋友去了')])
D('S0181L02', 'regloss', known='母', why='SEED SPAN: one form, the seed\'s own 母. Rows already say 母.')
D('S0181L03', 'regloss', known='医者', why='SEED SPAN: one form, the seed\'s own 医者.')

# ---- seed 182 どこかで私の鍵を見ましたか？ | 你有没有看到我的钥匙？
D('S0182L01', 'regloss', known='見ました',
  why='SEED SPAN: 見ました is in the seed as it stands; 見かける / 目にする are not. The past form is kept on purpose: plain 見る is S0032L02\'s gloss for 看, and the completed form is what 看到 answers (K23, sense from the form). Rows say 見た (K6).')

# ---- seed 197 息子は教師として働いています。 | 我儿子当老师。
D('S0197L01', 'regloss', known='として働く', ack=K, seed_known='息子は先生として働いています。',
  why='K6 (+ the seed edit below, carried here): the seed says として働いて; なる is not in it. なる rows are re-worded or dropped.',
  b={'B03': ('何として働きたいですか', '想当什么'), 'U01': ('あなたは何として働きたいですか？', '你想当什么？'), 'U04': 'd',
     'U05': ('私はこれとして働きたくありません。', '我不想当这个。')},
  add=[('u', '彼女は先生として働きたいです。', '她想当老师。'), ('u', '息子は先生として働いています。', '我儿子当老师。')])
D('S0197L03', 'regloss', known='先生',
  why='SEED EDIT + SEED SPAN. KAI: the seed says 教師, 7 of the 8 rows say 先生 (and so do later baskets). 教師 → 先生 in the seed keeps them all.')

# ---- seed 203 手伝ってと頼んだら何をしますか？ | 如果我请你帮我，你会怎么做？
D('S0203L01', 'regloss', known='頼む', ack=K,
  why='K6: the seed says 頼んだら (頼む); お願いする is not in it. The four お願い rows are re-worded.',
  b={'U02': ('ゆっくり話してと頼みたいです。', '我想请你说慢一点。'), 'U03': ('来てと頼みたいです。', '我想请你来。'),
     'U04': ('もう一度説明してと頼みたいです。', '我想请你再解释一次。'), 'U05': ('彼女に明日会いに来てと頼みたいです。', '我想请她明天来见面。')})

# ---- seed 204 彼女にあなたが準備を手伝うのを手伝ってほしかったです。 | 我想让她帮你处理安排。
D('S0204L01', 'regloss', known='準備', seed_known='あなたが準備を処理するのを彼女に手伝ってほしかったです。',
  why='SEED SPAN: one form, the seed\'s own 準備 (the seed edit for L02 is carried here).')
D('S0204L02', 'regloss', known='処理する',
  why='SEED EDIT + SEED SPAN. KAI: the Japanese seed says 手伝う twice and has no word for 处理; all rows say 処理する. Editing the seed to あなたが準備を処理するのを彼女に手伝ってほしかったです makes it the seed\'s own word. Without it the only seed-true cut is 准备を手伝う | 处理安排, against S0204L01\'s own row 準備を手伝います | 帮你做安排.')

# ---- seed 206 あなたと話す練習をする機会を楽しんでいます。 | 我喜欢有机会和你练习说。
D('S0206L01', 'regloss', known='機会', why='SEED SPAN: one form, the seed\'s own 機会.')

# ---- seed 209 彼らはグループとして集まってもっと時間を過ごしたいです。 | 他们想花更多时间一起开会。
D('S0209L01', 'regloss', known='会議を開く', ack=K, seed_known='彼らは一緒に会議を開いてもっと時間を過ごしたいです。',
  why='SEED EDIT + K6. KAI: the seed says グループとして集まって ("get together as a group") where the Chinese says 一起开会; all rows say 会議. Editing the seed to 一緒に会議を開いて makes 会議を開く its own words. The two-form row B01 is re-worded.',
  b={'B01': ('会議を開く', '开会')})

# ---- seed 210 彼らは私たちが問題について話し合う必要があると思っています。 | 他们觉得我们需要讨论这个问题。
D('S0210L01', 'regloss', known='話し合う',
  why='SEED SPAN: the seed says 話し合う; 議論する is a second word it never says (and later baskets already say 話し合う for 讨论). The seven 議論 rows are re-worded.',
  b={'B01': ('問題について話し合います', '讨论这个问题'), 'B02': ('一緒に話し合いたいです', '想讨论一下'), 'B03': ('話し合う必要があります', '需要讨论'),
     'U02': ('一緒に話し合いましょう。', '我们需要讨论一下。'), 'U03': ('これについて話し合いたいです。', '我想讨论这个。'),
     'U04': ('その問題を話し合うには時間が必要です。', '讨论这个问题需要时间。'), 'U05': ('彼女はそれについて話し合いたくありません。', '她不想讨论那个。')})

# ---- seed 214 週末は楽しかったですか？ | 你周末过得开心吗？
D('S0214L01', 'regloss', known='楽しい', ack=K, why='K6: the seed says 楽しかった (楽しい); 嬉しい is not in it. Rows already say 楽しい.')

# ---- seed 225 できれば答えをくれるでしょう。 | 如果他能的话，他会给你一个答案。
D('S0225L01', 'grow', known='できれば', target='能的话', type='M', comps=[['できる', '能'], ['なら', '的话']],
  why='GROW (L7, L22): 的话 is a particle and the Japanese conditional is fused into できれば; the chunk of its own seed is 能的话 = できれば (3 syllables). Rows with other verbs (能做的话, 需要的话…) are edited to the taught combination.',
  b={'B01': ('できれば、やってください。', '能的话，请做。'), 'B02': ('できれば、来てください。', '能的话，请来。'),
     'U02': ('できれば、私に言ってください。', '如果能的话，告诉我。'), 'U03': ('できれば、私に聞いてください。', '如果能的话，问我。'),
     'U04': ('できれば、話しましょう。', '如果能的话，我们说吧。'), 'U05': ('彼ができれば、話し合います。', '如果他能的话，我们讨论。'),
     'U06': ('できれば、私たちに教えてください。', '如果能的话，告诉我们。')})

# ---- seed 229 あの女性はできれば手伝ってくれるでしょう。 | 如果她能的话，那个女人会帮你。
D('S0229L01', 'regloss', known='女性', why='SEED SPAN: one form, the seed\'s own 女性.')

# ---- seed 234 昨夜あなたの兄と一緒に働いている人に会いました。 | 我昨天晚上见了一个和你哥哥工作的人。
D('S0234L01', 'regloss', known='昨夜', why='SEED SPAN: one form, the seed\'s own 昨夜.')
D('S0234L02', 'regloss', known='兄', why='SEED SPAN: the seed says 兄. Rows say お兄さん, the same word with its honorific (K6).')
NN('S0234L03', 'S0127L01 "会う | 见"', known='会う', ack=K, why='K6: the seed says 会いました (会う); 見る is not in it.')

# ---- seed 235 あなたに何か伝えたいと言った人に会いました。 | 我见了一个人说他想告诉你一些。
D('S0235L01', 'regloss', known='伝える', ack=K, why='K6: the seed says 伝えたい (伝える); 教える is not in it (it is S0070L01\'s gloss for 告诉 — one target, two known words, which is fine). Rows already say 伝える.')
D('S0235L02', 'grow', known='あなたに何か伝える', target='告诉你一些', type='M', comps=[['伝える', '告诉'], ['あなた', '你'], ['何か', '一些']], ack=K,
  why='GROW: the seed says 何か, but 何か alone is S0004L02\'s gloss for 一些东西 (one known → two targets), and いくつかの is S0056L03\'s for 几个. The seed\'s own chunk is あなたに何か伝え… = 告诉你一些 (5 syllables; L01 告诉 taught first). Rows about 一些 + other nouns go.',
  b={'B01': 'd', 'B02': 'd', 'B03': ('あなたに何か伝える', '告诉你一些'), 'U01': ('あなたに何か伝えたいです。', '我想告诉你一些。'), 'U02': 'd', 'U03': 'd',
     'U04': 'd', 'U05': ('彼女はあなたに何か伝えたいです。', '她想告诉你一些。'), 'U06': 'd'},
  add=[('b', 'あなたに何か伝えたい', '想告诉你一些'), ('b', 'あなたに何か伝える必要がある', '需要告诉你一些'), ('b', '今あなたに何か伝える', '现在告诉你一些'),
       ('u', '彼はあなたに何か伝えたいと言いました。', '他说他想告诉你一些。'), ('u', '母はあなたに何か伝えたいです。', '我妈妈想告诉你一些。'),
       ('u', '私はあなたに何か伝える必要があります。', '我需要告诉你一些。')])

# ---- seed 236 助けようとするつもりだと言った人を知っています。 | 我认识一个人说她会试着帮忙。
D('S0236L01', 'regloss', known='助ける', ack=K,
  why='K6: the seed says 助けよう (助ける). 手伝う is not in it and is S0025L03\'s gloss for 帮; all 8 rows said 手伝う → re-worded.',
  b={'B01': ('助ける', '帮忙'), 'B02': ('助けようとする', '试着帮忙'), 'B03': ('助けるつもりだ', '会帮忙'), 'U01': ('彼女は助けようとするでしょう。', '她会试着帮忙。'),
     'U02': ('私は助けたい。', '我想帮忙。'), 'U03': ('助けが必要ですか？', '你需要帮忙吗？'), 'U04': ('彼は助けたくない。', '他不想帮忙。'),
     'U05': ('私は助けようとするつもりです。', '我会试着帮忙。')})

# ---- seed 237 彼は週末の前にあなたに伝えてほしかったです。 | 他想让我周末以前告诉你。
D('S0237L01', 'grow', known='してほしかった', target='想让我', type='M', comps=[['したい', '想'], ['させる', '让'], ['私', '我']], ack=K,
  why='GROW + STAND-IN, as S0015L02: てほしかった is "wanted (me) to" = 想让我, contiguous in the seed (他想让我…); 让 alone drops the wanting. する stands in for 伝えて. Gapped rows and rows with 让你 / 让他 are edited or dropped.',
  b={'B01': ('してほしかった', '想让我'), 'B02': ('手伝ってほしかった', '想让我帮忙'), 'B03': ('行ってほしかった', '想让我去'),
     'U01': ('彼は手伝ってほしかった。', '他想让我帮忙。'), 'U02': ('彼女は手伝ってほしかった。', '她想让我帮忙。'),
     'U03': ('彼女は私に行ってほしくなかった。', '她不想让我去。'), 'U04': 'd', 'U05': 'd', 'U06': ('母は手伝ってほしかった。', '我妈妈想让我帮忙。')},
  add=[('b', '働いてほしかった', '想让我工作'), ('u', '彼は週末の前にあなたに伝えてほしかったです。', '他想让我周末以前告诉你。'),
       ('u', '彼女は私に待ってほしかった。', '她想让我等。')])
D('S0237L02', 'grow', known='週末の前に', target='周末以前', type='M', comps=[['週末', '周末'], ['の前に', '以前']],
  why='GROW: 前に alone is S0025L02\'s gloss for 之前 (one known → two targets) and 以前 "formerly" is S0128L01. The seed\'s own chunk is 週末の前に = 周末以前 (4 syllables). The two "formerly" rows go.',
  b={'B01': 'd', 'U04': 'd', 'U05': 'd'},
  add=[('b', '週末の前に会う', '周末以前见面'), ('b', '週末の前に終わらせたい', '想周末以前完成'), ('u', '彼女は週末の前に戻ります。', '她周末以前回来。'),
       ('u', '週末の前に手伝ってくれますか？', '你周末以前能帮我吗？'), ('u', '母は週末の前に医者に行きたいです。', '我妈妈想周末以前去看医生。')])

# ---- seed 239 母は読書が好きです。 | 我妈妈喜欢看书。
NN('S0239L01', 'S0026L01 "好き | 喜欢"', known='好き', why='SEED SPAN: one form, the seed\'s own 好き.')
D('S0239L02', 'regloss', known='読書', why='SEED SPAN: the seed says 読書 (が好き); 本を読む is not in it. Rows say 読書….')

# ---- seed 240 父は話すのをやめたがりません。 | 我爸爸不喜欢停止说话。
D('S0240L01', 'regloss', known='父', why='SEED SPAN: the seed says 父. Rows mix 父 and お父さん, the same word (K6).')
NN('S0240L02', 'S0019L02 "やめる | 停止"', known='やめる', ack=K, why='K6: the seed says やめたがり… (やめる); 止まる is not in it.')
D('S0240L03', 'grow', known='話すのをやめる', target='停止说话', type='M', comps=[['やめる', '停止'], ['話をする', '说话']], ack=K,
  why='GROW: 話す alone is S0001L02\'s gloss for 说 (one known → two targets) and しゃべる is not in the seed. The seed\'s own chunk is 話すのをやめ… = 停止说话 (4 syllables). Rows without 停止 are edited to it or dropped.',
  b={'B01': ('話すのをやめる', '停止说话'), 'B02': ('話すのをやめたい', '想停止说话'), 'B03': ('話すのをやめない', '不停止说话'),
     'U02': ('あなたは話すのをやめたいですか？', '你想停止说话吗？'), 'U04': 'd',
     'U06': ('あなたのお父さんは話すのをやめたがりませんか？', '你爸爸不喜欢停止说话吗？')},
  add=[('b', '父は話すのをやめる', '我爸爸停止说话')])

# ---- seed 243 同じ食べ物を頼むつもりです。 | 我会要同样的东西吃。
D('S0243L01', 'grow', known='同じ食べ物', target='同样的东西吃', type='M', comps=[['同じ', '同样的'], ['もの', '东西'], ['食べる', '吃']],
  why='GROW: 同じ alone is S0143L02\'s gloss for 一样 (one known → two targets); 同様の is not in the seed. The seed\'s own chunk is 同じ食べ物 = 同样的东西吃 (6 syllables). No row said the whole chunk → rebuilt. L13 note: L02 东西 and L03 吃 follow and overlap (S4).',
  b={k: 'd' for k in ['B01', 'B02', 'B03', 'U01', 'U02', 'U03', 'U04', 'U06']},
  add=[('b', '同じ食べ物', '同样的东西吃'), ('b', '同じ食べ物を頼む', '要同样的东西吃'), ('b', '同じ食べ物が欲しい', '想要同样的东西吃'),
       ('b', '父は同じ食べ物を頼む', '我爸爸要同样的东西吃'), ('u', '同じ食べ物を頼むつもりです。', '我会要同样的东西吃。'),
       ('u', '彼は同じ食べ物を頼むつもりです。', '他会要同样的东西吃。'), ('u', '同じ食べ物が欲しいですか？', '你想要同样的东西吃吗？'),
       ('u', '彼女は同じ食べ物を頼みたくありません。', '她不想要同样的东西吃。'), ('u', '母は同じ食べ物を頼むつもりです。', '我妈妈会要同样的东西吃。')])
NN('S0243L02', 'S0098L04 "もの | 东西"', known='もの', ack=K, why='The seed carries もの only inside 食べ物; one form, in the kana the course already teaches it in.')

# ---- seed 244 もうたくさん学びました。 | 我已经学了很多了。
D('S0244L01', 'regloss', known='もう',
  why='SEED SPAN: the seed says もう; すでに is S0076L02\'s word (1-150 plan) — one target, two known words, fine. Clear of clash only because S0090L01 and S0254L03, the two "もう | 就" glosses whose seeds have no もう, are re-cut in this plan.')
D('S0244L02', 'regloss', known='たくさん', why='SEED SPAN: one form, the seed\'s own たくさん.')

# ---- seed 245 短い時間でたくさんできたことが嬉しいです。 | 我很高兴我在短时间内做了这么多。
D('S0245L01', 'regloss', known='嬉しい', target='很高兴', is_new=False, seed_known='短い時間でこんなに多くできたことが嬉しいです。',
  why='NOT-NEW: 嬉しい is the seed\'s word, but "嬉しい | 高兴" beside S0076L01 "嬉しい | 很高兴" (1-150 plan) is one known → two targets. The seed says 我很高兴, so the LEGO takes the 很 and becomes an exact duplicate of S0076L01 → is_new false; basket goes dark. (The seed edit for L04 is carried here.)')
NN('S0245L03', 'S0051L02 "する | 做" (1-150 plan)', known='する', ack=K, why='やる is not in the seed; する is the plain form of its できた (K6).')
D('S0245L04', 'regloss', known='こんなに多く', is_new=False,
  why='SEED EDIT + NOT-NEW. KAI: the seed says たくさん, which is S0244L02\'s gloss for 很多 (one known → two targets); all rows say こんなに多く. たくさん → こんなに多く in the seed, and the LEGO is then an exact duplicate of S0076L03 (1-150 plan) → is_new false.')

# ---- seed 246 彼女にあなたを手伝ってほしかったけど、彼女は忙しすぎました。 | 我想让她帮你，但是她太忙了。
D('S0246L01', 'regloss', known='でも', is_new=False, seed_known='彼女にあなたを手伝ってほしかったです、でも彼女は忙しすぎました。',
  why='SEED EDIT + NOT-NEW. KAI: the seed says けど, which is S0178L01\'s gloss for 虽然 (one known → two targets); all rows say でも. With けど → でも in the seed the LEGO is an exact duplicate of S0019L01 "でも | 但是" → is_new false.')
D('S0246L02', 'grow', known='忙しすぎました', target='太忙了', type='M', comps=[['すぎ', '太'], ['忙しい', '忙'], ['になった', '了']],
  why='GROW: neither あまりにも nor 過度に is in the seed; 太 is the すぎ fused into 忙しすぎました, and bare すぎる is S0027L03\'s gloss for 太多. The seed\'s own chunk is 太忙了 = 忙しすぎました (3 syllables). No row said it → rebuilt. L13 note: L03 忙 follows and overlaps (S4).',
  b={k: 'd' for k in ['B01', 'B02', 'B03', 'U01', 'U02', 'U03', 'U04', 'U05', 'U06']},
  add=[('b', '忙しすぎました', '太忙了'), ('b', '彼女は忙しすぎました', '她太忙了'), ('b', '私は忙しすぎました', '我太忙了'), ('b', '父は忙しすぎました', '我爸爸太忙了'),
       ('u', '彼は忙しすぎましたか？', '他太忙了吗？'), ('u', '母は今日忙しすぎました。', '我妈妈今天太忙了。'),
       ('u', '手伝いたかったです、でも忙しすぎました。', '我想帮忙，但是我太忙了。'),
       ('u', '彼女にあなたを手伝ってほしかったです、でも彼女は忙しすぎました。', '我想让她帮你，但是她太忙了。'),
       ('u', 'あなたのお父さんは昨夜忙しすぎました。', '你爸爸昨天晚上太忙了。')])

# ---- seed 247 その本はまあまあ良かったと思いました。 | 我觉得那本书挺好的。
D('S0247L02', 'regloss', known='なかなか', seed_known='その本はなかなか良かったと思いました。',
  why='SEED EDIT + SEED SPAN. KAI: the seed says まあまあ ("so-so"); 挺好的 is "quite good" and all 9 rows say なかなか. まあまあ → なかなか in the seed.')

# ---- seed 248 その映画は全くひどいと思ったので、お金を返してほしいです。 | 我觉得那部电影很差，我想把钱要回来。
D('S0248L02', 'regloss', known='ひどい', why='SEED SPAN: one form, the seed\'s own ひどい.')
D('S0248L03', 'grow', known='お金を', target='把钱', type='M', comps=[['を', '把'], ['お金', '钱']],
  why='GROW (L7, L22), as S0053L04: 把 grows to its object in its own seed, 把钱 = お金を (2 syllables). Rows with other objects are edited to 把钱.',
  b={'B02': ('お金を返してほしい', '把钱要回来'), 'B03': ('お金を彼にあげる', '把钱给他'), 'U02': ('彼はお金を私にくれた。', '他把钱给了我。'),
     'U03': ('父はお金を彼にあげた。', '我爸爸把钱给了他。'), 'U05': ('彼女はお金を母にあげた。', '她把钱给了我妈妈。'),
     'U06': ('私はお金をあなたのお父さんにあげたい。', '我想把钱给你爸爸。')},
  add=[('b', 'お金をあなたにあげる', '把钱给你')])

# ---- seed 249 行く前に私を手伝ってほしいです。 | 我想让你走以前帮我。
NN('S0249L01', 'S0025L01 "行く | 走"', known='行く', why='SEED SPAN: one form, the seed\'s own 行く. The two-form row B01 is re-worded.',
   b={'B01': ('行く', '走')})

# ---- seed 250 答える前に何か他のことを教えてくれますか？ | 我回答以前你能告诉我别的吗？
NN('S0250L01', 'S0027L04 "答える | 回答"', known='答える', seed_known='答える前に何か別のことを教えてくれますか？',
   why='SEED SPAN: one form, the seed\'s own 答える (the seed edit for L02 is carried here).')
D('S0250L02', 'regloss', known='別の',
  why='SEED EDIT + SEED SPAN. KAI: the seed says 他の, which is S0098L03\'s gloss for 别 (one known → two targets); all rows say 別の. 他の → 別の in the seed.')

# ---- seed 251 終わるまで知りたくありません。 | 我不想我们完成以前知道。
D('S0251L01', 'regloss', known='終わる', why='SEED SPAN: one form, the seed\'s own 終わる. Rows already say 終わ….')

# ---- seed 252 いつ始める準備ができますか？ | 你什么时候准备好开始？
D('S0252L01', 'regloss', known='いつ', target='什么时候', is_new=False,
  why='NOT-NEW: the seed has no 時 at all — its いつ is 什么时候, and 时候 alone has no Japanese word here. Re-cut to the seed\'s chunk it is an exact duplicate of S0079L01 "いつ | 什么时候" → is_new false. The gapped row B03 goes.',
  b={'B03': 'd'})
NN('S0252L02', 'S0023L02 "始める | 开始"', known='始める', why='SEED SPAN: one form, the seed\'s own 始める.')

# ---- seed 253 数分で準備ができるはずです。 | 我几分钟以后应该准备好。
D('S0253L01', 'grow', known='数分', target='几分钟', type='M', comps=[['数', '几'], ['分', '分钟']],
  why='GROW: 数 is a prefix nobody can be prompted with alone and いくつか is not in the seed; the seed\'s own chunk is 数分 = 几分钟 (3 syllables). Rows about 几个 / 几本 go.',
  b={'B01': 'd', 'B02': 'd', 'U01': 'd', 'U04': 'd', 'U05': 'd', 'U06': 'd'},
  add=[('b', '数分待つ', '等几分钟'), ('b', '数分必要', '需要几分钟'), ('b', '数分待てる', '能等几分钟'), ('u', '数分待ってくれますか？', '你能等几分钟吗？'),
       ('u', '彼は数分待てます。', '他能等几分钟。'), ('u', '彼女は数分必要です。', '她需要几分钟。'), ('u', '母は数分必要です。', '我妈妈需要几分钟。')])
NN('S0253L02', 'S0155L02 "分 | 分钟" (as re-glossed above)', why='NEIGHBOUR, not a scan candidate: text unchanged.')
D('S0253L03', 'grow', known='数分で', target='几分钟以后', type='M', comps=[['数分', '几分钟'], ['後で', '以后']],
  why='GROW: the seed has no 後; its 数分で is 几分钟以后 as one chunk (5 syllables; L01 几分钟 taught first). 以后 after other things is taught at S0011L02 (说完以后, 1-150 plan). Rows with 完成以后 go.',
  b={'B01': 'd', 'B02': ('数分で', '几分钟以后'), 'B03': 'd', 'U01': ('私は数分で戻ります。', '我几分钟以后回来。'), 'U02': 'd', 'U05': 'd', 'U06': 'd'},
  add=[('b', '数分で戻る', '几分钟以后回来'), ('b', '数分で始める', '几分钟以后开始'), ('b', '数分で準備ができる', '几分钟以后准备好'),
       ('u', '数分で準備ができるはずです。', '我几分钟以后应该准备好。'), ('u', '彼は数分で始めます。', '他几分钟以后开始。'),
       ('u', '数分で終わります。', '我几分钟以后完成。'), ('u', '数分で手伝えます。', '我几分钟以后能帮忙。')])
D('S0253L04', 'regloss', known='はずです',
  why='SEED SPAN: the seed says はずです; すべき ("ought to") is a second word it never says. The gapped rows and the べき rows go; back-filled on はず.',
  b={'B01': ('はずです', '应该'), 'B03': 'd', 'U02': 'd', 'U04': 'd', 'U05': 'd', 'U06': 'd'},
  add=[('b', '戻るはずです', '应该回来'), ('b', '知っているはずです', '应该知道'), ('u', '彼は数分で戻るはずです。', '他几分钟以后应该回来。'),
       ('u', '彼女は知っているはずです。', '她应该知道。'), ('u', '母はもう行ったはずです。', '我妈妈应该已经走了。')])

# ---- seed 254 今朝からずっと準備ができています。 | 我从今天早上就准备好了。
D('S0254L01', 'regloss', known='から',
  why='SEED SPAN: から is in the seed as it stands (今朝から); より is not. Clear of S0022L01 "からです | 因为" (1-150 plan) by form.',
  b={'B01': ('から', '从')})
NN('S0254L02', 'S0039L01 "朝 | 早上"', known='朝', why='SEED SPAN: the seed carries 朝 inside 今朝; 午前 is not in it.')
D('S0254L03', 'grow', known='ずっと準備ができています', target='就准备好了', type='M', comps=[['ずっと', '就'], ['準備ができる', '准备好'], ['になった', '了']],
  why='GROW (L7, L22): the seed has no もう or ちょうど; 就 is a particle and grows to what it introduces in its own seed, 就准备好了 = ずっと準備ができています (5 syllables; 准备好 S0080L01). Rows with 就 + other verbs are edited to it.',
  b={'B01': 'd', 'B02': ('ずっと準備ができています', '就准备好了'), 'B03': ('朝からずっと準備ができています', '从早上就准备好了'),
     'U01': ('私は今朝からずっと準備ができています。', '我从今天早上就准备好了。'), 'U02': ('彼は以前からずっと準備ができています。', '他从以前就准备好了。'),
     'U03': ('母は朝からずっと準備ができています。', '我妈妈从早上就准备好了。'), 'U05': ('父は今朝からずっと準備ができています。', '我爸爸从今天早上就准备好了。'),
     'U06': ('あなたはいつからずっと準備ができていますか？', '你从什么时候就准备好了？')},
  add=[('b', '今日からずっと準備ができている', '从今天就准备好了'), ('b', '彼は朝からずっと準備ができている', '他从早上就准备好了')])

# ---- seed 255 (knock-on of the 1-150 plan)
NN('S0255L01', 'S0080L01 "準備ができる | 准备好" (1-150 plan)', why='KNOCK-ON, not a scan candidate: text unchanged.')

# ---- seed 256 一時間以内に準備ができると思います。 | 我觉得我不到一个小时就准备好。
D('S0256L01', 'regloss', known='以内に',
  why='SEED SPAN: 以内に is in the seed as it stands. Gapped rows re-worded; the five もかからずに rows say the same thing in other words → 以内に.',
  b={'B01': ('以内に', '不到'), 'B02': ('一時間以内に', '不到一个小时'), 'U02': ('数分以内にできましたか？', '你不到几分钟就做完了吗？'),
     'U03': ('彼は数分以内に戻ってきた。', '他不到几分钟就回来了。'), 'U04': ('私は数分以内に準備ができた。', '我不到几分钟就准备好了。'),
     'U05': ('彼女は数分以内に始めた。', '她不到几分钟就开始了。'), 'U06': ('父は数分以内に本を読み終わった。', '我爸爸不到几分钟就看完了书。')})

# ---- seed 258 / 259
D('S0258L01', 'regloss', known='あそこ', why='SEED SPAN: one form, the seed\'s own あそこ.')
D('S0259L01', 'regloss', known='アイデア', why='SEED SPAN: one form, the seed\'s own アイデア (考え is S0123L01\'s word for 主意 — one target, two known words, fine).')

# ---- seed 260 全然わかりません。 | 我一点都不知道。
D('S0260L01', 'grow', known='全然', target='一点都不', type='M', comps=[['少し', '一点'], ['全部', '都'], ['ない', '不']],
  why='GROW: the seed has no 少し; its 全然 is the whole frame 一点都不 (4 syllables), which is how every row of L02 already uses it. The 一点 = "a little" rows go (S0009L01 teaches that); the frame rows move here from L02.',
  b={k: 'd' for k in ['B01', 'B02', 'B03', 'U01', 'U03', 'U04', 'U06']},
  add=[('b', '全然', '一点都不'), ('b', '全然忙しくない', '一点都不忙'), ('b', '全然嬉しくない', '一点都不高兴'), ('b', '全然好きではない', '一点都不喜欢'),
       ('u', '彼は全然忙しくない。', '他一点都不忙。'), ('u', '私は全然行きたくない。', '我一点都不想走。'),
       ('u', '彼女はそのアイデアが全然好きではない。', '她一点都不喜欢那个主意。'), ('u', '父は全然嬉しくない。', '我爸爸一点都不高兴。'),
       ('u', 'あなたは手伝いが全然必要ないのですか？', '你一点都不需要帮忙吗？')])
D('S0260L02', 'grow', known='全然わかりません', target='一点都不知道', type='M', comps=[['全然', '一点都不'], ['知る', '知道']],
  why='GROW: 都 alone is not 全然 and 全部 is not in the seed; with L01 now the frame 全然 = 一点都不, this LEGO is the seed\'s whole 全然わかりません = 一点都不知道 (6 syllables). Its frame rows with other words are re-homed to L01.',
  b={'B01': 'd', 'B02': ('全然わかりません', '一点都不知道'), 'B03': ('彼は全然わかりません', '他一点都不知道'), 'U02': 'd', 'U03': 'd', 'U04': 'd', 'U05': 'd', 'U06': 'd'},
  add=[('b', '母は全然わかりません', '我妈妈一点都不知道'), ('b', '私たちは全然わかりません', '我们一点都不知道'), ('u', '彼女は全然わかりません。', '她一点都不知道。'),
       ('u', '父は全然わかりません。', '我爸爸一点都不知道。'), ('u', 'あなたは全然わかりませんか？', '你一点都不知道吗？'), ('u', '彼らは全然わかりません。', '他们一点都不知道。')])

# ---- seed 261 何か大事なことかもしれないと思います。 | 我觉得它可能是件重要的事。
D('S0261L03', 'grow', known='大事なこと', target='件重要的事', type='M', comps=[['件', '件'], ['大事', '重要'], ['の', '的'], ['こと', '事']],
  why='GROW (L7): the measure word 件 has no Japanese word in the seed; it grows to the noun phrase it counts in its own seed, 件重要的事 = 大事なこと (5 syllables). Rows with 件 + other nouns go. L13 note: L04 重要 follows and overlaps (S4).',
  b={k: 'd' for k in ['B01', 'B02', 'B03', 'U01', 'U02', 'U03', 'U04', 'U05', 'U06']},
  add=[('b', '大事なこと', '件重要的事'), ('b', '一つの大事なこと', '一件重要的事'), ('b', 'この大事なこと', '这件重要的事'), ('b', 'あの大事なこと', '那件重要的事'),
       ('u', 'それは大事なことです。', '那是件重要的事。'), ('u', 'あなたに伝えたい大事なことがあります。', '我有件重要的事想告诉你。'),
       ('u', '彼は私に大事なことを伝えた。', '他告诉我一件重要的事。'), ('u', '何か大事なことかもしれないと思います。', '我觉得它可能是件重要的事。'),
       ('u', '彼女は大事なことを知っているかもしれない。', '她可能知道一件重要的事。')])
D('S0261L04', 'regloss', known='大事', why='SEED SPAN: one form, the seed\'s own 大事. Rows already say 大事.')

# ---- seed 262 昨日話していたあの男の人は誰ですか？ | 你昨天在跟哪个男人说话？
NN('S0262L01', 'S0088L01 "と | 跟"', known='と', seed_known='あなたは昨日どの男の人と話していましたか？',
   why='SEED EDIT. KAI: the Japanese seed ("who is that man you were talking to?") has neither と nor どの; the Chinese asks 跟哪个男人说话. Editing it to あなたは昨日どの男の人と話していましたか (word for word what row S0262L02U01 already says) makes both LEGOs the seed\'s own words. The gapped row B01 is re-worded.',
   b={'B01': ('と', '跟')})
D('S0262L02', 'regloss', known='どの', why='SEED SPAN after the seed edit above (どの男の人). Rows say どの / どれ, the same word (K6).')

# ---- seed 265 / 266 / 267
NN('S0265L01', 'S0051L01 "友達 | 朋友"', known='友達', why='SEED SPAN: one form, the seed\'s own 友達.')
D('S0266L01', 'regloss', known='古い', why='SEED SPAN: one form, the seed\'s own 古い.')
D('S0267L01', 'regloss', known='連絡', seed_known='友達から連絡がありましたか？',
  why='SEED EDIT + SEED SPAN. KAI: the seed (友達から聞きましたか) has no noun for 消息 at all; row U01 already prompts 友達から連絡がありましたか for the seed\'s Chinese. With that as the seed, 連絡 is its own word. One form: the ニュース / 情報 rows are re-worded to 連絡.',
  b={'B01': ('連絡', '消息'), 'B03': ('良い連絡', '好消息'), 'U02': ('あなたに伝えたい良い連絡があります。', '我有一个好消息想告诉你。'),
     'U03': ('あなたの父から何か連絡がありますか？', '你父亲有什么消息吗？'), 'U04': ('彼は何か連絡を受けたかもしれない。', '他可能有一些消息。'),
     'U06': ('それは重要な連絡です。', '那是一个重要的消息。')})

# ---- seed 269 / 270
NN('S0269L01', 'S0021L01 "なぜ | 为什么"', known='なぜ', why='SEED SPAN: one form, the seed\'s own なぜ. The gapped row B02 goes.', b={'B02': 'd'})
NN('S0270L01', 'S0022L01 "からです | 因为" (1-150 plan)', known='からです', seed_known='遅刻するのが心配だからです。',
   why='SEED SPAN: the seed ends …だからです; gap markers and ので go (the seed edit for L03 is carried here).')
D('S0270L03', 'regloss', known='遅刻する',
  why='SEED EDIT + SEED SPAN. KAI: the seed says 遅れる; all 9 rows say 遅刻する, and row U01 is the seed sentence with 遅刻する. 遅れる → 遅刻する in the seed.')

# ---- seed 271 来月私たちと一緒に来ませんか？ | 你愿意下个月和我们一起去吗？
D('S0271L01', 'regloss', known='する気がある', ack=K, seed_known='来月私たちと一緒に行く気がありますか？',
  why='SEED EDIT + STAND-IN. KAI: the seed is an invitation (来ませんか, and "come" where the Chinese says 去); every row says …気がある and 行く. Editing it to 来月私たちと一緒に行く気がありますか makes 気がある (する standing in for 行く) and 行く its own words. Gapped rows re-worded.',
  b={'B01': ('する気がある', '愿意'), 'B02': ('する気がない', '不愿意')})
D('S0271L04', 'grow', known='一緒に行く', target='一起去', type='M', comps=[['一緒に', '一起'], ['行く', '去']],
  why='GROW: 行く alone is S0025L01\'s gloss for 走 (one known → two targets). The seed\'s own chunk (after the edit above) is 一緒に行く = 一起去 (3 syllables). Gapped rows and rows with 去 alone are edited to it.',
  b={'B01': 'd', 'B02': ('一緒に行きたい', '想一起去'), 'B03': ('一緒に行く', '一起去'), 'U01': ('来月私たちと一緒に行く気がありますか？', '你愿意下个月和我们一起去吗？'),
     'U02': ('あなたは誰と一緒に行きたいですか？', '你想和谁一起去？'), 'U03': ('彼は一緒に行きたくない。', '他不想一起去。'),
     'U05': ('私はあなたと一緒に行きたいです。', '我想和你一起去。'), 'U06': ('なぜ一緒に行きたくないのですか？', '你为什么不想一起去？')},
  add=[('b', '私たちと一緒に行く', '和我们一起去'), ('b', '来月一緒に行く', '下个月一起去')])

# ---- seed 272 はい、それはいい考えですね。 | 好啊，听起来很棒。
D('S0272L01', 'grow', known='いいね', target='好啊', type='M', comps=[['いい', '好'], ['ね', '啊']], seed_known='いいね、すごそうですね。',
  why='SEED EDIT + GROW. KAI: the seed says はい、それはいい考えですね ("yes, that\'s a good idea"); the Chinese says 好啊，听起来很棒, and はい is S0277L01\'s word for 是的 (one known → two targets). Editing it to いいね、すごそうですね — the rows\' own wording — gives both LEGOs a seed span. 啊 is a particle (L7) and grows to 好啊 = いいね (2 syllables); the three 对啊 rows are edited to it.',
  b={'B02': ('いいね、行きます', '好啊，我去'), 'U02': ('いいね、それは良いアイデアだ。', '好啊，那是一个好主意。'), 'U05': ('いいね、彼に伝えるべきだ。', '好啊，你应该告诉他。')},
  add=[('b', 'いいね、待つよ', '好啊，我等你')])
D('S0272L02', 'grow', known='すごそうです', target='听起来很棒', type='M', comps=[['聞く', '听'], ['し始める', '起来'], ['とても', '很'], ['すごい', '棒']],
  why='GROW (after the seed edit above): the seed never says 聞こえる; 听起来 is the そう fused into すごそうです. The seed\'s own chunk is 听起来很棒 = すごそうです (5 syllables). Gapped / two-form rows and rows with other adjectives are edited to it. L13 note: L03 棒 follows and overlaps (S4).',
  b={'B01': ('すごそうです', '听起来很棒'), 'B02': ('それはすごそうです', '那听起来很棒'), 'B03': ('そのニュースはすごそうです', '那个消息听起来很棒'),
     'U01': ('それはすごそうですね。', '它听起来很棒。'), 'U03': ('そのアイデアはすごそうですね。', '那个主意听起来很棒。'), 'U04': 'd',
     'U05': ('あの映画はすごそうですね。', '那部电影听起来很棒。')},
  add=[('b', 'すごそうだと思う', '觉得听起来很棒'), ('u', 'いいね、すごそうですね。', '好啊，听起来很棒。'), ('u', 'あの本はすごそうですね。', '那本书听起来很棒。'),
       ('u', '父はそれはすごそうだと思っています。', '我爸爸觉得那听起来很棒。')])

# ---- seed 274 数日後に出発しなければなりませんか？ | 你几天后就得走吗？
D('S0274L01', 'grow', known='数日後に', target='几天后', type='M', comps=[['数', '几'], ['日', '天'], ['後', '后']],
  why='GROW: 后 is a bound suffix; it grows to the time it follows in its own seed, 几天后 = 数日後に (3 syllables). Rows with 后 after other things go. L13 note: L02 "日 | 天" follows and overlaps (S4).',
  b={k: 'd' for k in ['B01', 'B02', 'B03', 'U01', 'U02', 'U04', 'U05']},
  add=[('b', '数日後に', '几天后'), ('b', '数日後に行く', '几天后走'), ('b', '数日後に戻る', '几天后回来'), ('b', '数日後に始める', '几天后开始'),
       ('u', '数日後に彼は戻ってきた。', '几天后他回来了。'), ('u', '数日後に手伝う気がありますか？', '几天后你愿意帮忙吗？'),
       ('u', '数日後に出発しなければなりませんか？', '你几天后就得走吗？'), ('u', '母は数日後に戻ります。', '我妈妈几天后回来。'),
       ('u', '彼女は数日後に始めます。', '她几天后开始。')])
D('S0274L03', 'grow', known='出発しなければなりません', target='得走', type='M', comps=[['しなければならない', '得'], ['行く', '走']],
  why='GROW: the stand-in しなければなりません is S0109L01\'s gloss for 必须 (1-150 plan; one known → two targets). The seed\'s own chunk is 出発しなければなりません = 得走 (2 syllables). Gapped rows and rows with other verbs are edited to it. (S0293L04 teaches 得 on its own, from しないと.)',
  b={'B01': ('出発しなければなりません', '得走'), 'B02': ('もう出発しなければなりません', '就得走'), 'B03': ('今出発しなければなりません', '现在得走'),
     'U01': ('数日後に出発しなければなりませんか？', '你几天后就得走吗？'), 'U02': ('私は数日後に出発しなければなりません。', '我几天后得走。'),
     'U03': ('彼は出発しなければなりません。', '他得走。'), 'U05': ('あなたは出発しなければなりませんか？', '你得走吗？'),
     'U06': ('母は今日出発しなければなりません。', '我妈妈今天得走。')},
  add=[('b', '明日出発しなければなりません', '明天得走')])

# ---- seed 276 いいえ、ここにもう少し長くいられます。 | 不，我还能在这里待一会儿。
NN('S0276L01', 'S0060L01 "まだ | 还" (1-150 plan)', known='まだ', seed_known='いいえ、まだここにしばらくいられます。',
   why='SEED EDIT. KAI: the seed says もう少し長く ("a little longer") and has neither まだ nor しばらく; the Chinese says 还…一会儿 and row S0276L04U01 already prompts いいえ、私はまだここにしばらくいられます. With that as the seed, まだ and しばらく are its own words.')
D('S0276L03', 'grow', known='ここにいる', target='在这里待', type='M', comps=[['ここで', '在这里'], ['いる', '待']], ack=K,
  why='GROW + K6: いる alone is S0034L02\'s gloss for 在场 (one known → two targets); とどまる is not in the seed. The seed\'s own chunk is ここに…いられます = 在这里待 (4 syllables; L02 这里 taught first). Rows saying 待在这里 are turned to the seed\'s order.',
  b={'B01': ('ここにいる', '在这里待'), 'B02': ('ここにいたくない', '不想在这里待'), 'U03': ('彼はここにいたくないです。', '他不想在这里待。'), 'U04': 'd',
     'U05': ('彼女はまだここにいたいです。', '她还愿意在这里待。')},
  add=[('b', 'まだここにいる', '还在这里待'), ('b', 'ここにしばらくいる', '在这里待一会儿'), ('u', '彼はここにしばらくいました。', '他在这里待了一会儿。'),
       ('u', '母はここにいたいです。', '我妈妈想在这里待。')])
NN('S0276L04', 'S0092L03 "しばらく | 一会儿"', known='しばらく', why='SEED SPAN after the seed edit above (しばらく); 少しの間 is not in it.')

# ---- seed 277 はい、来週の初めに大事な予定があります。 | 是的，我下周初有个重要会议。
D('S0277L01', 'regloss', known='はい', seed_known='はい、来週の初めに大事な会議があります。',
  why='SEED SPAN: one form, the seed\'s own はい (clear of clash once seed 272 no longer answers 好啊 with はい). Rows without はい re-worded or dropped; back-filled. (The seed edit for L04 is carried here.)',
  b={'B02': ('はい', '是的'), 'B03': 'd'},
  add=[('b', 'はい、彼は', '是的，他'), ('b', 'はい、彼女は', '是的，她'), ('u', 'はい、時間があります。', '是的，我有时间。')])
D('S0277L03', 'grow', known='来週の初めに', target='下周初', type='M', comps=[['来週', '下周'], ['初め', '初']],
  why='GROW: 初 is a bound suffix; it grows to its own seed\'s 下周初 = 来週の初めに (3 syllables). Rows said 次の週の初め — not the seed\'s 来週 — and are re-worded; 下个月初 rows are edited to 下周初.',
  b={'B01': ('来週の初めに', '下周初'), 'B02': ('来週の初めに戻る', '下周初回来'), 'B03': ('来週の初めに行く', '下周初走'),
     'U01': ('来週の初めに用事があります。', '我下周初有事。'), 'U02': ('彼は来週の初めに戻ります。', '他下周初回来。'),
     'U03': ('来週の初めに時間がありますか？', '下周初你有时间吗？'), 'U04': ('来週の初めにこの件を終わらせなければなりません。', '我下周初得完成这件事。'),
     'U05': ('彼女は来週の初めに行きます。', '她下周初走。'), 'U06': ('来週の初めに一緒に行きましょう。', '下周初我们一起去。')},
  add=[('b', '来週の初めに会う', '下周初见')])
D('S0277L04', 'regloss', known='会議',
  why='SEED EDIT + SEED SPAN. KAI: the seed says 予定 ("plans"); the Chinese says 会议 and all rows say 会議. 予定 → 会議 in the seed.')

# ---- seed 278 昨夜全部終わらせなければなりませんでしたか？ | 你昨晚必须把一切都完成吗？
D('S0278L02', 'regloss', known='しなければなりませんでした', ack=K,
  why='STAND-IN: 必须 is the ending fused into 終わらせなければなりませんでした; する stands in, in the seed\'s own (past) inflection — which also keeps it apart from S0109L01 "しなければなりません | 必须" as a string. 必ず is not in the seed.',
  b={'B01': ('しなければなりませんでした', '必须')})
NN('S0278L03', 'S0045L02 "すべて | 一切" (1-150 plan)', ack=K, why='KNOCK-ON, not a scan candidate: text unchanged (its seed says 全部, not すべて — not this item\'s candidate; as a duplicate it goes dark either way).')

# ---- seed 279 / 280
D('S0279L01', 'regloss', known='残る', ack=K, why='K6: the seed says 残っていなかった (残る); one form. Rows say 残り… (same word).')
D('S0280L01', 'regloss', known='だけ', why='SEED SPAN: だけ is in the seed as it stands; the gapped second form goes.')
D('S0280L02', 'regloss', known='一番',
  why='SEED SPAN: the seed says 一番; 最も is a second word it never says. The six 最も rows are re-worded.',
  b={'B01': ('一番大事な', '最重要'), 'B03': ('一番', '最'), 'U01': ('それは一番大事なことです。', '那是最重要的事。'), 'U04': ('あの会議が一番大事です。', '那个会议最重要。'),
     'U05': ('私は一番大事なことだけやります。', '我只做最重要的事。'), 'U06': ('これが一番大事な連絡です。', '这是最重要的消息。')})

# ---- seed 281 コーヒー飲み終わるまで待っていい？ | 你介意我喝完咖啡你再开始吗？
NN('S0281L01', 'S0063L01 "構う | 介意" (1-150 plan)', known='構う', ack=K, seed_known='私がコーヒーを飲み終わってから始めてもらっても構わない？',
   why='SEED EDIT. KAI: the seed ("is it OK to wait until the coffee is finished?") has no word for 介意 and none for 再开始; the Chinese says 你介意我喝完咖啡你再开始吗. Editing it to 私がコーヒーを飲み終わってから始めてもらっても構わない？ gives 介意, 喝完 and 再开始 a seed span each. As at seed 63, 気にする is S0048L01\'s gloss for 在乎 → rows re-worded to 構う.',
   b={'B01': ('構う', '介意'), 'B02': ('構わない', '不介意'), 'B03': ('構いますか', '你介意吗'), 'U02': ('私は構いません。', '我不介意。'),
      'U03': ('彼は構いますか？', '他介意吗？'), 'U05': ('彼女は待っても構いません。', '她不介意等。'), 'U06': ('あなたのお父さんは構いますか？', '你父亲介意吗？')})
D('S0281L02', 'grow', known='飲み終わる', target='喝完', type='M', comps=[['飲む', '喝'], ['終わる', '完']], ack=K,
  why='GROW (L22) + K6: 完 is a bound complement; it grows to the verb of its own seed, 喝完 = 飲み終わ… (2 syllables). Rows with 做完 / 吃完 are edited to 喝完.',
  b={'B02': ('コーヒーを飲み終わる', '喝完咖啡'), 'B03': ('水を飲み終わる', '喝完水'), 'U01': ('彼は飲み終わりましたか？', '他喝完了吗？'),
     'U03': ('あなたはコーヒーを飲み終わりましたか？', '你喝完咖啡了吗？'), 'U04': ('私は飲み終わってから行きます。', '我喝完就走。'),
     'U05': ('あなたはその水を飲み終わりましたか？', '你喝完那杯水了吗？')},
  add=[('b', '飲み終わってから', '喝完再')])
D('S0281L04', 'grow', known='から始める', target='再开始', type='M', comps=[['それから', '再'], ['始める', '开始']], ack=K,
  why='GROW (after the seed edit above) + K6: the seed has no また; 再 here is the "and only then" of …てから始めて. The seed\'s own chunk is 再开始 = から始め… (3 syllables). The two-form row and rows with 再 + other verbs are edited to it or dropped.',
  b={'B01': 'd', 'B02': ('から始める', '再开始'), 'B03': ('飲み終わってから始める', '喝完再开始'), 'U02': 'd',
     'U03': ('彼は終わってから始めます。', '他完成后再开始。'), 'U04': ('私はコーヒーを飲み終わってから始めます。', '我喝完咖啡再开始。'), 'U05': 'd',
     'U06': ('私はやり終わってから始めます。', '我做完再开始。')},
  add=[('b', '明日になってから始める', '明天再开始'), ('b', 'しばらくしてから始める', '一会儿再开始'),
       ('u', '私がコーヒーを飲み終わってから始めてもらっても構わない？', '你介意我喝完咖啡你再开始吗？'), ('u', '母が来てから始めましょう。', '我妈妈来了我们再开始吧。')])

# ---- seed 282 / 283 / 284
NN('S0282L01', 'S0134L02 "問題 | 问题"', known='問題', why='SEED SPAN: one form, the seed\'s own 問題.')
D('S0283L01', 'grow', known='どの友だち', target='哪些朋友', type='M', comps=[['どの', '哪些'], ['友達', '朋友']], seed_known='Chineseを話すのはどの友だち？',
  why='SEED EDIT + GROW. KAI: the seed (友だち、誰がいる？) has no どの; all rows say どの友達. Edited to Chineseを話すのはどの友だち？ (the stray "Chinese" is the seed\'s own and is left alone). どの alone is S0262L02\'s gloss for 哪个, so the LEGO is the seed\'s chunk どの友だち = 哪些朋友 (4 syllables); rows with 哪些 + other nouns are edited to it.',
  b={'B03': ('私のどの友達', '我哪些朋友'), 'U02': ('どの友達が手伝いたいですか？', '哪些朋友想帮忙？'), 'U04': ('どの友達が一番大事ですか？', '哪些朋友是最重要的？'),
     'U06': ('どの友達が来週の初めに来ますか？', '哪些朋友下周初来？')},
  add=[('b', '彼のどの友達', '他哪些朋友')])
NN('S0284L01', 'S0085L01 "知っている | 认识"', known='知っている', ack=K, why='K6: the seed says 知ってる (知っている, casual); 面識がある is not in it.')

# ---- seed 287 テレビ見るのが好きな人、何人知ってる？ | 你认识多少喜欢看电视的人？
D('S0287L01', 'regloss', known='何人',
  why='SEED SPAN: the seed says 何人; どのくらい is S0033L01\'s gloss for 多久 and was being prompted here for 多少 (one known → two targets at row level). 多少 and its 人 are split in the seed (多少…的人), so 多少 stays the LEGO and 人 rides in the rows. The どのくらいの時間 rows go.',
  b={'B01': ('何人', '多少'), 'B03': 'd', 'U02': 'd', 'U04': 'd', 'U06': 'd'},
  add=[('b', '友達が何人', '多少朋友'), ('b', '何人知っている', '认识多少人'), ('u', 'あなたのお父さんは何人知っていますか？', '你父亲认识多少人？'),
       ('u', '何人来ますか？', '多少人来？'), ('u', 'テレビを見るのが好きな人を何人知っていますか？', '你认识多少喜欢看电视的人？')])

# ---- seed 288 知ってる人のほとんどがテレビ好き。 | 我认识的大多数人都喜欢看电视。
D('S0288L01', 'regloss', known='ほとんど', why='SEED SPAN: one form, the seed\'s own ほとんど.')

# ---- seed 289 今日の午後、来るか気になる。 | 我想知道她今天下午会不会在那里。
D('S0289L01', 'grow', known='気になる', target='想知道', type='M', comps=[['したい', '想'], ['知る', '知道']],
  why='GROW: the seed has no 知る; its 気になる is 想知道 as one chunk (3 syllables), and 知る | 知道 is already S0045L01. Rows are edited to 想知道.',
  b={'B01': ('気になる', '想知道'), 'B02': ('母は気になる', '我妈妈想知道'), 'B03': ('彼は気になる', '他想知道'), 'U01': ('私は気になります。', '我想知道。'),
     'U02': ('あなたは気になりますか？', '你想知道吗？'), 'U03': ('彼女は気になります。', '她想知道。'), 'U04': ('あの問題の答えが気になります。', '我想知道那个问题的回答。'),
     'U05': ('あなたのお父さんは気になりますか？', '你父亲想知道吗？'), 'U06': ('いつ始まるか気になります。', '我想知道什么时候开始。')},
  add=[('b', '父は気になる', '我爸爸想知道')])
NN('S0289L03', 'S0157L02 "そこ | 那里"', known='そこ', ack=K,
   why='One form (そこ; あそこ is S0258L01\'s word for 那边). The Japanese seed says 来るか ("whether she\'ll come") and has no word for 在那里 at all — a seed-level looseness left for the reader, since the LEGO is a duplicate either way.')

# ---- seed 290 答えを知ってるか気になる。 | 我想知道他知不知道答案。
D('S0290L01', 'grow', known='知ってるか', target='知不知道', type='M', comps=[['知る', '知道'], ['ない', '不']],
  why='GROW: 知 alone is half a word; the seed\'s 知ってるか is 知不知道 (4 syllables), which five rows already say. The other three are edited to it.',
  b={'B01': ('知ってるか', '知不知道'), 'B03': ('彼女が知ってるか', '她知不知道'), 'U05': ('彼が答えを知ってるか気になります。', '我想知道他知不知道答案。'),
     'U06': ('彼女は答えを知ってるか？', '她知不知道答案？')},
  add=[('b', 'あなたが知ってるか', '你知不知道')])
NN('S0290L02', 'S0017L03 "答え | 答案"', known='答え', why='SEED SPAN: one form, the seed\'s own 答え.')

# ---- seed 291 もっと上手に話せるようになりたい。 | 我希望我很快就能说得更好。
D('S0291L01', 'regloss', known='望む', ack=K, seed_known='すぐにもっと上手に話せるようになることを望んでいます。',
  why='SEED EDIT + K6. KAI: the seed (…なりたい) has no word for 希望 and none for 很快; row S0291L02U01 already prompts 私はすぐにもっと上手に話せるようになりたいです and every 希望 row says 望んでいます. Editing the seed to すぐにもっと上手に話せるようになることを望んでいます makes 望む and すぐに its own words. (Stand-in したい is taken: S0001L01.)')
D('S0291L02', 'regloss', known='すぐに',
  why='SEED SPAN after the seed edit above (すぐに); 早く is S0020L01\'s word. B02 prompted すぐに for 很快就 beside B01 すぐに → 很快 → re-worded.',
  b={'B02': ('すぐに戻る', '很快就回来')})

# ---- seed 292 パーティーに来られるといいな。 | 我希望你能来参加聚会。
D('S0292L03', 'regloss', known='パーティー', why='SEED SPAN: one form, the seed\'s own パーティー.')

# ---- seed 293 どこで会うか調べないと。 | 我得弄清楚他要在哪里见我。
NN('S0293L02', 'S0127L01 "会う | 见"', known='会う', seed_known='どこで会うかはっきりさせないと。',
   why='SEED SPAN: one form, the seed\'s own 会う (the seed edit for L03 is carried here).')
D('S0293L03', 'regloss', known='はっきりさせる', comps=[['する', '弄'], ['はっきり', '清楚']], ack=K,
  why='SEED EDIT + K6. KAI: the seed says 調べ ("look into"); all 10 rows say はっきりさせる. 調べないと → はっきりさせないと in the seed. One form; the two-form row and component are re-worded.',
  b={'B01': ('はっきりさせる', '弄清楚')})
D('S0293L04', 'regloss', known='しないと', ack=K,
  why='STAND-IN: 得 is the ending fused into …させないと; する stands in. Gap marker dropped. Rows say …なければならない, the same obligation in its full form (K6).')

# ---- seed 294 今夜は電話する時間がない。 | 我今晚没足够时间给你打电话。
D('S0294L01', 'regloss', known='今夜', seed_known='今夜は電話する十分な時間がない。',
  why='SEED SPAN: the seed says 今夜. 今晩 is a second word and is S0018L02\'s gloss for 晚上, so the nine 今晩 rows are re-worded. (The seed edit for L02 is carried here.)',
  b={'B01': ('今夜来る', '今晚来'), 'B02': ('今夜会う', '今晚见'), 'B03': ('今夜ある', '今晚有'), 'U01': ('私は今夜時間がありません。', '我今晚没时间。'),
     'U02': ('あなたは今夜来ますか？', '你今晚来吗？'), 'U03': ('彼は今夜来ません。', '他今晚不来了。'), 'U04': ('私は今夜あなたに会いたいです。', '我今晚想见你。'),
     'U05': ('今夜時間がありますか？', '今晚你有时间吗？'), 'U06': ('私は今夜この件をはっきりさせなければなりません。', '我今晚得弄清楚这件事。')})
D('S0294L02', 'grow', known='十分な時間', target='足够时间', type='M', comps=[['十分な', '足够'], ['時間', '时间']],
  why='SEED EDIT + GROW. KAI: the seed (時間がない) has no word for 足够; all rows say 十分な時間. Edited to 今夜は電話する十分な時間がない. 十分な alone is S0058L02\'s gloss for 够多 (1-150 plan; one known → two targets), so the LEGO is the chunk 十分な時間 = 足够时间 (4 syllables); rows without 时间 are edited to it.',
  b={'B02': ('十分な時間がない', '没足够时间'), 'B03': ('十分な時間がある', '有足够时间'), 'U03': ('これは十分な時間ですか？', '这是足够时间吗？'),
     'U04': ('あなたは来るのに十分な時間がありますか？', '你有足够时间来吗？'), 'U05': ('彼は今夜十分な時間がありません。', '他今晚没足够时间。'),
     'U06': ('母は十分な時間がありますか？', '我妈妈有足够时间吗？')},
  add=[('b', '今夜十分な時間がある', '今晚有足够时间')])

# ---- seed 295 一日で終わるって言ってない。 | 我没说我想一天就完成。
D('S0295L01', 'grow', known='一日で終わる', target='一天就完成', type='M', comps=[['一', '一'], ['日', '天'], ['だけで', '就'], ['終わる', '完成']],
  why='GROW (L7, L22): 就 is a particle and neither すぐに nor だけで is in the seed; it grows to its own seed\'s 一天就完成 = 一日で終わる (5 syllables). Rows with 就 + other verbs go; rebuilt on the taught combination.',
  b={k: 'd' for k in ['B01', 'B02', 'B03', 'U02', 'U03', 'U04', 'U05', 'U06']},
  add=[('b', '一日で終わる', '一天就完成'), ('b', '一日で終わりたい', '想一天就完成'), ('b', '一日で終わる必要がある', '需要一天就完成'),
       ('b', '一日で終わらなければならない', '得一天就完成'), ('u', '彼は一日で終わると言いました。', '他说他一天就完成。'),
       ('u', '一日で終わりますか？', '你一天就完成吗？'), ('u', '母は一日で終わりたいです。', '我妈妈想一天就完成。'),
       ('u', '私たちは一日で終わらなければなりません。', '我们得一天就完成。')])

# ---- seed 300 冷たく見られたくない。 | 她不想显得不友好。
D('S0300L01', 'grow', known='冷たい', target='不友好', type='M', comps=[['ない', '不'], ['友好的', '友好']], ack=K,
  why='GROW + K6: the seed has no 友好 or 親切 — its 冷たく ("cold") is 不友好 as one chunk (3 syllables). Rows about 友好 without 不 are edited to it or dropped.',
  b={'B01': ('母は冷たい', '我妈妈不友好'), 'B02': ('冷たい', '不友好'), 'B03': ('彼は冷たい', '他不友好'), 'U01': ('彼女は冷たいです。', '她不友好。'),
     'U02': ('あなたは冷たいです。', '你不友好。'), 'U03': ('彼は冷たいですか？', '他不友好吗？'), 'U04': ('彼女は冷たいですか？', '她不友好吗？'), 'U05': 'd', 'U06': 'd'},
  add=[('b', '父は冷たい', '我爸爸不友好'), ('u', '彼女は冷たく見られたくない。', '她不想显得不友好。'), ('u', '私は冷たく見られたくないです。', '我不想显得不友好。')])
D('S0300L02', 'regloss', known='見られる', ack=K,
  why='K6: the seed says 見られたくない (見られる); the gapped forms go. The gapped row B03 is re-worded on the seed\'s own words.',
  b={'B03': ('冷たく見られる', '显得不友好')})

json.dump({'course': 'zho_for_jpn', 'shard': 'seeds 151-300 (cs #743·AI), planned against plans/zho_for_jpn.json', 'legos': OUT},
          open(os.path.join(HERE, 'zho_for_jpn-b.json'), 'w'), ensure_ascii=False, indent=1)
print(len(OUT), 'decisions')
