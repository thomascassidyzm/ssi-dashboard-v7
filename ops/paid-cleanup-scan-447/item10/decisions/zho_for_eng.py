#!/usr/bin/env python3
"""zho_for_eng item-10 decisions (cs #714·AI), hand-authored per LEGO. Writes zho_for_eng.json for tools/plan.py.
Verdicts: regloss (known side only) · grow (LEGO grows/re-cuts to the seed span, old word kept as a literal component) ·
seed (L25 rung 3, KAI'S CALL: the seed's English is edited so the existing LEGO is the seed's own words) ·
delete (the LEGO's seed part is already covered by another LEGO of the seed) · keep (not a defect, reason given).
Basket: 'k' keep, 'd' delete, (known, target) rebuild. add: ('b'|'u', known, target) back-fill, built from words taught by the seed."""
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


# ---- seed 3 "how to speak as often as possible | 怎么尽可能经常说"
D('S0003L03', 'grow', known='as often as possible', target='尽可能经常', type='M',
  comps=[['as much as possible', '尽可能'], ['often', '经常']],
  why='尽可能 alone was glossed "as much as possible"; the seed says "as often as possible" = 尽可能经常. Grows by the next word; L02 "often | 经常" is taught first (L13).',
  b={'B02': ('speak as often as possible', '尽可能经常说'), 'B03': ('learn as often as possible', '尽可能经常学习'),
     'U05': ('I want to learn Chinese as often as possible', '我想尽可能经常学习中文')})

# ---- seed 8 "I'm going to try to explain what I mean | 我要试试解释我的意思"
D('S0008L02', 'grow', known='what I mean', target='我的意思', type='M', comps=[['my', '我的'], ['meaning', '意思']],
  why='"my" is not in the seed; 我的意思 is the seed\'s "what I mean". "my | 我的" stays as a literal component, so later rows may use 我的 bare (K29). L13 note: L03 "meaning | 意思" is taught after this chunk and overlaps it (S4).',
  b={'B01': 'd', 'B02': 'd', 'U01': 'd', 'U02': 'd', 'U03': 'd', 'U04': 'd', 'U05': 'd'},
  add=[('b', 'explain what I mean', '解释我的意思'), ('b', 'try to explain what I mean', '试试解释我的意思'),
       ('b', 'say what I mean', '说我的意思'), ('u', "I'm going to explain what I mean", '我要解释我的意思'),
       ('u', 'I want to try to explain what I mean', '我想试试解释我的意思'), ('u', 'I want to explain what I mean in Chinese', '我想用中文解释我的意思'),
       ('u', "I'm going to try to explain what I mean", '我要试试解释我的意思')])

# ---- seed 9 "I speak a little Chinese now | 我现在会说一点中文"
D('S0009L01', 'seed', seed_known='I can speak a little Chinese now',
  why='会说 is "can speak"; the Chinese seed says "I can speak a little Chinese now". Editing the English seed keeps "can | 会" (whose 7 rows all say "can") instead of growing it over L02. KAI: seed edit (S15/L25 rung 3).')

# ---- seed 10 "I'm not sure if I can remember the whole sentence | 我不确定我能不能记住整个句子"
D('S0010L03', 'grow', known='if I can', target='我能不能', type='M', comps=[['I', '我'], ['can', '能'], ["can't", '不能']],
  why='"whether can" is a literal gloss; the seed says "if I can" = 我能不能 (contiguous). Every row already says 我能不能.',
  b={'B01': ('if I can', '我能不能'), 'B02': ('if I can speak', '我能不能说'), 'B03': ('if I can speak Chinese', '我能不能说中文'),
     'B04': ('if I can explain', '我能不能解释'), 'B05': ('if I can learn', '我能不能学习'),
     'U03': ("I'm not sure if I can practise", '我不确定我能不能练习')})

# ---- seed 11 "I'd like to be able to speak after you finish | 我希望你说完之后我也能说"
D('S0011L01', 'seed', seed_known='I hope I can speak too after you finish',
  why='The Chinese says 我希望…我也能说 "I hope … I can speak too". Both flagged LEGOs ("to hope", "I too can speak") are right for the Chinese; the English seed is the loose side. KAI: seed edit.')
D('S0011L03', 'regloss', known='I can speak too', comps=[['I', '我'], ['also', '也'], ['able to', '能'], ['speak', '说']],
  why='"I too can speak" is not English; with the seed edit the seed says "I can speak too".',
  b={'B01': ('I can speak too', '我也能说'), 'B02': ('I can speak Chinese too', '我也能说中文'), 'B03': ('I can speak a little too', '我也能说一点'),
     'U02': ('now I can speak too', '现在我也能说'), 'U03': ('I hope I can speak too', '我希望我也能说'),
     'U04': ('I can speak a little Chinese too', '我也能说一点中文'), 'U05': ('I hope I can speak too now', '我希望现在我也能说'),
     'U06': ('I hope I can speak Chinese too', '我希望我也能说中文')})

# ---- seed 12: "what" is in the seed ("what's") — the scanner split the contraction
D('S0012L03', 'keep', why='"what" IS in the seed ("what\'s going to happen"); detector tokenised "what\'s" as one word. Not a defect.')

# ---- seed 13 "you speak Chinese very well | 你的中文说得很好"
D('S0013L01', 'kai', why='你的中文说得很好 = "your Chinese is spoken very well"; no contiguous Chinese span of 8 syllables or fewer says "you … speak Chinese". L25 rung 2: recommend the TARGET seed 你中文说得很好 (drops 的; the usual compliment form, same meaning), then L01 "your | 你的" becomes "you | 你" not-new (S0020L01), and L03 regrows to "very well | 很好". Not drafted as ops until Kai rules (target-side seed change).')

# ---- seed 14 "do you speak Chinese all day? | 你一整天都说中文吗？"
D('S0014L02', 'grow', known='speak Chinese all day', target='一整天都说中文', type='M',
  comps=[['all day', '一整天'], ['throughout', '都'], ['speak', '说'], ['Chinese', '中文']],
  why='"all day long" is not in the seed; re-glossing to "all day" would clash with L01 "all day | 一整天". Grows to the verb the 都 belongs to (L22).',
  b={'B01': 'd', 'B02': ('speak Chinese all day', '一整天都说中文'), 'B03': 'd', 'B04': ('I speak Chinese all day', '我一整天都说中文'),
     'B05': ('you speak Chinese all day', '你一整天都说中文'), 'U01': ('I want to speak Chinese all day', '我想一整天都说中文'),
     'U02': 'd', 'U03': ('you want to speak Chinese all day', '你想一整天都说中文'), 'U04': 'd'},
  add=[('u', 'I hope to speak Chinese all day', '我希望一整天都说中文'), ('u', 'do you want to speak Chinese all day?', '你想一整天都说中文吗？')])

# ---- seed 16 "he wants to come back with everyone else later on | 他想晚点和别人一起回来"
D('S0016L03', 'grow', known='with everyone else', target='和别人一起', type='M', comps=[['with', '和'], ['others', '别人'], ['together', '一起']],
  why='"together" is not in the seed; 和别人一起 is "with everyone else", and 和别人 had no LEGO at all (S3). "together | 一起" stays a component.',
  b={'B01': ('study with everyone else', '和别人一起学习'), 'B02': ('practise with everyone else', '和别人一起练习'),
     'B03': ('speak Chinese with everyone else', '和别人一起说中文'), 'U01': ('I want to study with everyone else', '我想和别人一起学习'),
     'U02': ('he also wants to practise with everyone else', '他也想和别人一起练习'),
     'U03': ('can you speak Chinese with everyone else?', '你能和别人一起说中文吗？'),
     'U04': ('I hope I can study with everyone else tomorrow', '我希望我明天能和别人一起学习')},
  knock='S0388L01 and S0517L01 "together | 一起" are not-new on this LEGO; they lose their pair (L31) and are re-judged at their own seeds.')

# ---- seed 21 "why are you learning her name? | 你为什么学她的名字？"
D('S0021L02', 'grow', known='learning her name', target='学她的名字', type='M', comps=[['to learn', '学'], ['her', '她的'], ['name', '名字']],
  why='"to study" is not in the seed; re-glossing 学 to "to learn" clashes with S0002L02 "to learn | 学习" (ZUT), so it grows to the seed\'s object (L25). L03 "her | 她的" overlaps (S4).',
  b={'B01': ('learn her name', '学她的名字'), 'B02': ('want to learn her name', '想学她的名字'), 'B03': ('learn her name quickly', '尽快学她的名字'),
     'U01': ('I want to learn her name', '我想学她的名字'), 'U03': ('why does he want to learn her name?', '他为什么想学她的名字？'),
     'U04': ('we hope to learn her name', '我们希望学她的名字'), 'U05': ('you want to learn her name quickly', '你想尽快学她的名字'),
     'U06': ('but I also want to learn her name', '但是我也想学她的名字'), 'U07': ("I'm going to learn her name", '我要学她的名字'),
     'U08': ("why don't you want to learn her name?", '你为什么不想学她的名字？')})

# ---- seed 22 "because I want to meet people who speak Chinese | 因为我想认识会说中文的人"
D('S0022L02', 'seed', seed_known='because I want to get to know people who speak Chinese',
  why='认识 is "get to know"; "to meet" would clash with S0018L03 "to meet | 见面", and the Chinese chunk that says "meet people who speak Chinese" is 9 syllables. The English seed is the loose side. KAI: seed edit.')

# ---- seed 24 "I'm not going to be able to remember easily | 我可能不容易记住"
D('S0024L02', 'seed', seed_known="I might not remember easily",
  why='The Chinese says 我可能不容易记住 "I might not remember easily"; "might | 可能" is right for it. KAI: seed edit (L01 "I", L03 below stay in the seed).')
D('S0024L03', 'grow', known='remember easily', target='容易记住', type='M', comps=[['easy', '容易'], ['to remember', '记住']],
  why='"easy" is not in the seed; 容易记住 is "remember easily" in both the old and the edited seed.',
  b={'B01': ('not remember easily', '不容易记住'), 'B02': 'd', 'B03': ('remember easily', '容易记住'), 'U01': 'd',
     'U02': ("I can't remember easily", '我不容易记住'), 'U03': 'd', 'U04': ('I might not remember easily', '我可能不容易记住'),
     'U05': 'd', 'U06': 'd', 'U07': 'd', 'U08': 'd', 'U09': ("I might not remember easily", '我可能不容易记住')},
  add=[('b', "you can't remember easily", '你不容易记住'), ('u', "he can't remember the whole sentence easily", '他不容易记住整个句子'),
       ('u', 'I hope I can remember easily', '我希望我能容易记住'), ('u', "she can't remember Chinese easily", '她不容易记住中文')],
  knock='S0483L02 "easy | 容易" is not-new on this LEGO; it loses its pair (L31) and is re-judged at seed 483.')

# ---- seed 25 "are you going to help me before I have to go? | 你会在我走之前帮我吗？"
D('S0025L01', 'grow', known='before I go', target='在我走之前', type='M', comps=[['at', '在'], ['I', '我'], ['to go', '走'], ['before', '之前']],
  why='在 here opens the 在…之前 frame ("before"); "at" is not in the seed. Taught as the whole contiguous frame with its middle (L32): "before I go" (5 syllables). The old basket drilled 在 = "be here", which this seed never says.',
  b={k: 'd' for k in ['B01', 'B02', 'B03', 'U01', 'U02', 'U03', 'U04', 'U05', 'U06', 'U07', 'U08']},
  add=[('b', 'help me before I go', '在我走之前帮我'), ('b', 'ask before I go', '在我走之前问'), ('b', 'explain before I go', '在我走之前解释'),
       ('u', 'can you help me before I go?', '你能在我走之前帮我吗？'), ('u', 'I want to ask you before I go', '我想在我走之前问你'),
       ('u', 'he wants to come back before I go', '他想在我走之前回来'), ('u', 'I hope to practise before I go', '我希望在我走之前练习')],
  knock='在 = "be here/at" phrases elsewhere lean on this LEGO; "at | 在" stays a component (K29). Census below.')

# ---- seed 26 "I like feeling as if I'm nearly ready to go | 我喜欢快要走的感觉"
D('S0026L02', 'grow', known='nearly ready to go', target='快要走', type='M', comps=[['about to', '快要'], ['to go', '走']],
  why='"about to" is not in the seed; 快要走 is the seed\'s "nearly ready to go" (3 syllables).',
  b={'B01': ('nearly ready to go', '快要走'), 'B02': 'd', 'B03': 'd', 'U01': ("I'm nearly ready to go", '我快要走'), 'U02': 'd', 'U03': 'd',
     'U04': ("we're nearly ready to go", '我们快要走'), 'U05': 'd', 'U06': ("she's nearly ready to go", '她快要走'), 'U07': 'd', 'U08': 'd'},
  add=[('b', "he's nearly ready to go", '他快要走'), ('b', "you're nearly ready to go", '你快要走'),
       ('u', "I like feeling as if I'm nearly ready to go", '我喜欢快要走的感觉'), ('u', "I'm not sure if he's nearly ready to go", '我不确定他是不是快要走')])

# ---- seed 27 "I don't like taking too much time to answer | 我不喜欢花太多时间回答"
D('S0027L02', 'grow', known='taking too much time', target='花太多时间', type='M',
  comps=[['to spend', '花'], ['too', '太'], ['much', '多'], ['time', '时间']],
  why='"to spend" is not in the seed; 花太多时间 is its "taking too much time" (5 syllables). L03 "time | 时间" overlaps (S4).',
  b={'B01': ('take too much time', '花太多时间'), 'B02': 'd', 'B03': 'd', 'U01': ("I don't want to take too much time", '我不想花太多时间'),
     'U02': ("she doesn't like taking too much time", '她不喜欢花太多时间'), 'U03': ('he might take too much time', '他可能花太多时间'),
     'U04': ("I don't like taking too much time", '我不喜欢花太多时间'), 'U05': ("because I don't want to take too much time", '因为我不想花太多时间'),
     'U06': 'd', 'U07': ("but she doesn't want to take too much time", '但是她不想花太多时间'),
     'U08': ('why does he like taking too much time?', '他为什么喜欢花太多时间？')},
  add=[('b', "don't take too much time", '不花太多时间')])

# ---- seed 29 "I'm looking forward to speaking better as soon as I can | 我期待尽快说得更好"
D('S0029L02', 'grow', known='better', target='更好', type='M', comps=[['more', '更'], ['good', '好']],
  why='"even more" is not in the seed; "better" is, and 更好 is contiguous in 说得更好. L03 "to speak better" follows it (L13 order holds).',
  b={'B01': 'd', 'B02': 'd', 'B03': ('even better', '更好'), 'U01': 'd', 'U02': 'd', 'U03': ('his Chinese is better', '他的中文更好'),
     'U04': 'd', 'U06': 'd', 'U07': 'd', 'U08': 'd'},
  add=[('b', 'better now', '现在更好'), ('b', 'a little better', '更好一点'),
       ('u', 'my Chinese is better now', '我现在的中文更好'), ('u', 'I hope my Chinese can be better', '我希望我的中文能更好'),
       ('u', 'this way is better', '这样更好'), ('u', 'her Chinese is better than before', '她的中文比以前更好')],
  knock='S0291L01 "better | 更好" (new) becomes a duplicate of this LEGO and should go not-new (planned at 291 if flagged; otherwise listed as a knock-on).')

# ---- seed 30 "I wanted to ask you something yesterday | 我昨天想问你一件事"
D('S0030L03', 'grow', known='ask you something', target='问你一件事', type='M', comps=[['to ask', '问'], ['you', '你'], ['a thing', '一件事']],
  why='"a thing" is not in the seed; "something" alone would clash with S0004L02 "something | 点什么", so it grows to "ask you something" (L02 "to ask" taught first).',
  b={'B01': 'd', 'B02': 'd', 'B03': 'd', 'U01': ('I want to ask you something', '我想问你一件事'), 'U02': 'd', 'U03': 'd', 'U04': 'd',
     'U07': ('he wants to ask you something before he goes', '他想在走之前问你一件事'), 'U08': ('I want to ask you something today', '我今天想问你一件事'), 'U09': 'k'},
  add=[('b', 'want to ask you something', '想问你一件事'), ('b', 'I ask you something', '我问你一件事'), ('b', 'he asked you something', '他问你一件事'),
       ('u', 'she wanted to ask you something yesterday', '她昨天想问你一件事'), ('u', 'can I ask you something?', '我能问你一件事吗？')])

# ---- seed 32 "did you want to show me something? | 你想给我看点什么吗？"
D('S0032L01', 'grow', known='show me', target='给我看', type='M', comps=[['to give', '给'], ['me', '我'], ['to look at', '看']],
  why='给 alone ("to give") is not in the seed; 给我看 is its "show me". L02 below becomes the seed\'s other part.',
  b={'B01': 'd', 'B02': 'd', 'B03': 'd', 'U02': 'd', 'U04': 'd', 'U05': 'd', 'U06': 'd', 'U08': 'd'},
  add=[('b', 'want to show me', '想给我看'), ('b', 'show me now', '现在给我看'), ('b', 'show me this', '给我看这个'),
       ('u', 'did you want to show me something?', '你想给我看点什么吗？'), ('u', 'can you show me?', '你能给我看吗？'),
       ('u', "he doesn't want to show me", '他不想给我看'), ('u', 'I hope you can show me tomorrow', '我希望你明天能给我看')],
  knock='S0140L01 "show me | 给我看" (new) becomes a duplicate and should go not-new; S0301L01 "to give | 给" (not-new on this LEGO) loses its pair (L31, handled at 301). 给 = give and 看 = look stay as components (K29).')
D('S0032L02', 'grow', known='something', target='点什么', is_new=False, comps=[],
  why='"to look at" is not in the seed (看 is inside 给我看, now L01). The seed\'s remaining part 点什么 is S0004L02 "something | 点什么", so this LEGO takes that pair and goes not-new (every seed part is a LEGO).',
  b={k: 'd' for k in ['B02', 'B03', 'U01', 'U03', 'U04', 'U06', 'U08', 'U09', 'U10']})

# ---- seed 36 "we don't want to interrupt the story | 我们不想打断这个故事"
D('S0036L01', 'seed', seed_known="we don't want to interrupt this story",
  why='这个故事 is "this story"; "this | 这个" is the course\'s only teaching of 这个 (13 rows). Editing the English seed keeps it. KAI: seed edit.')

# ---- validator-floor + taught-words fixes (successor of #714·AI, 18 Nov evening). tools/plan.py now mirrors the
# course-builder validator (build 3+/use 5+ not counting a bare-LEGO row; every target chunk taught by this seed) and named
# these rows; each fix below uses only LEGOs/components taught by its seed.
def FIX(id, add=(), drop_add=(), b=None):
    d = next(x for x in OUT if x['id'] == id)
    d['add'] = [a for a in d.get('add', []) if a[2] not in drop_add] + list(add)
    for k, v in (b or {}).items():
        d.setdefault('basket', {})[k] = 'keep' if v == 'k' else 'del' if v == 'd' else list(v)


FIX('S0008L02', add=[('u', "I'm trying to explain what I mean", '我试试解释我的意思')])
FIX('S0010L03', add=[('u', "I'm not sure now if I can speak Chinese", '我现在不确定我能不能说中文')])
FIX('S0011L03', add=[('b', 'I can speak too today', '今天我也能说')])
FIX('S0014L02', add=[('b', 'I can speak Chinese all day', '我能一整天都说中文'), ('u', 'I hope you can speak Chinese all day', '我希望你能一整天都说中文')])
FIX('S0016L03', add=[('u', 'he wants to come back with everyone else', '他想和别人一起回来')])
FIX('S0021L02', add=[('b', 'why learn her name?', '为什么学她的名字？')])
# U04 and U09 would both read "I might not remember easily | 我可能不容易记住" (U09 is the seed copy): U04 goes.
FIX('S0024L03', b={'U04': 'd'}, drop_add=['我希望我能容易记住'],
    add=[('b', "she can't remember easily", '她不容易记住'), ('u', "you can't remember his name easily", '你不容易记住他的名字'),
         ('u', "we can't remember easily", '我们不容易记住')])
# 问 "to ask" is first taught at seed 30.
FIX('S0025L01', drop_add=['在我走之前问', '我想在我走之前问你'],
    add=[('b', 'practise before I go', '在我走之前练习'), ('u', 'I want to learn her name before I go', '我想在我走之前学她的名字'),
         ('u', 'can you explain before I go?', '你能在我走之前解释吗？')])
# 的 alone and 是不是 are never taught: the seed copy 我喜欢快要走的感觉 is not this LEGO's to drill (it is the seed).
FIX('S0026L02', drop_add=['我喜欢快要走的感觉', '我不确定他是不是快要走'],
    add=[('b', "I'm nearly ready to go now", '我现在快要走'), ('u', "but I'm nearly ready to go", '但是我快要走'),
         ('u', "today I'm nearly ready to go", '今天我快要走')])
FIX('S0027L02', add=[('b', 'want to take too much time', '想花太多时间'), ('b', 'might take too much time', '可能花太多时间')])
# 的 alone, 这样 and 比以前 are untaught at 29; B03 "even better" was a bare LEGO row under a second gloss: it goes.
FIX('S0029L02', b={'B03': 'd'}, drop_add=['我现在的中文更好', '这样更好', '她的中文比以前更好'],
    add=[('b', 'your Chinese is better', '你的中文更好'), ('u', 'her Chinese is better now', '她的中文现在更好'),
         ('u', 'I hope your Chinese can be better', '我希望你的中文能更好'), ('u', 'his Chinese is a little better now', '他的中文现在更好一点')])
# 这个 is untaught at 32.
FIX('S0032L01', drop_add=['给我看这个'], add=[('b', 'show me tomorrow', '明天给我看'), ('u', "why don't you want to show me?", '你为什么不想给我看？')])

json.dump({'course': 'zho_for_eng', 'legos': OUT}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'zho_for_eng.json'), 'w'), ensure_ascii=False, indent=1)
print(len(OUT), 'decisions')
