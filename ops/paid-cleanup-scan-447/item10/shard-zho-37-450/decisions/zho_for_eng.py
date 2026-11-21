#!/usr/bin/env python3
"""zho_for_eng item-10 decisions, SHARD seeds 37-450 (cs #741·AI), hand-authored per LEGO. Writes zho_for_eng.json beside
this file for tools/plan.py. Seeds 3-36 are #714·AI's (../../decisions/zho_for_eng.py) and are NOT redone here.

Why this lives in shard-zho-37-450/: the item-10 tools name every file by course code, and this shard shares its course
with #714·AI's. `tools` and `lexicon` here are symlinks to ../tools and ../lexicon, so the committed tools run UNCHANGED
with this directory as their root (plan.py through plan_k54.py, which says why):
  cd shard-zho-37-450 && python3 -I plan_k54.py zho_for_eng <dump>; tools/dbslot.sh python3 -I tools/validate.py … ; tools/dryrun.py … ; tools/price.py

Verdicts: regloss (known side only) · grow (LEGO re-cut to the seed span; the old word stays as a literal component, K29) ·
seed (L25 rung 3, KAI'S CALL: the seed's English is edited so the existing LEGO is the seed's own words) ·
delete (the LEGO's seed part is covered by another LEGO of the seed) · keep (not a defect, reason given) · kai (held: ZUT).
Basket: 'k' keep, 'd' delete, (known, target) rebuild. add: ('b'|'u', known, target) back-fill.
SUB()/ALL() read the dump only to spell out mechanical word swaps; every row they produce was read by hand (R0.13).
"L13:" in a knock marks a grown chunk that now takes in a word its seed teaches in a LATER LEGO (same wart #714 accepted
at S0008L02 / S0027L02); a lego.reorder would mend the order but relabels ids and is refused while learners hold state."""
import json, os, re, sys
OUT = []
HERE = os.path.dirname(os.path.abspath(__file__))
DUMP = json.load(open(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.environ['CS_SCRATCH'], 'dumps', 'zho_for_eng.json')))
L = {l['id']: l for s in DUMP['seeds'] for l in s['legos']}
SEED = {s['n']: s for s in DUMP['seeds']}


def rows(lid):
    for p in L[lid]['phrases']:
        if p['type'] in ('lego_debut', 'component') or not p['id'].startswith('zho_for_eng:'):
            continue
        yield p['id'][len('zho_for_eng:') + 8:], p


def SUB(lid, old, new, **over):
    """every B/U row whose known says `old` (whole words) is rebuilt with `new`; `over` wins"""
    b = {}
    for sid, p in rows(lid):
        nk = re.sub(r'(?i)\b' + re.escape(old) + r'\b', new, p['known'])
        if nk != p['known']:
            b[sid] = (nk, p['target'])
    b.update(over)
    return b


def ALL(lid, act='d', **over):
    b = {sid: act for sid, _ in rows(lid)}
    b.update(over)
    return b


def D(id, verdict, **kw):
    kw['id'] = id
    kw['verdict'] = verdict
    b = kw.pop('b', None)
    if b:
        kw['basket'] = {k: ('keep' if v == 'k' else 'del' if v == 'd' else list(v)) for k, v in b.items()}
    if 'comps' in kw:
        kw['components'] = kw.pop('comps')
    OUT.append(kw)


def seed_op(n, new_known):
    s = SEED[n]
    return {'op': 'seed.update', 'seed_number': n, 'set': {'known_text': new_known}, 'expect': {'known_text': s['known'], 'target_text': s['target']}}


# ---- 39 "but I'm a little tired this morning | 但是我今天早上有点累"
D('S0039L02', 'grow', known='a little tired', target='有点累', type='M', comps=[['a bit', '有点'], ['tired', '累']],
  why='"a bit" is not in the seed; re-glossing 有点 to "a little" clashes with S0009L02 "a little | 一点" (ZUT), so it grows to the seed\'s "a little tired" (3 syllables).',
  b={'B01': ('a little tired now', '现在有点累'), 'B02': ('a little tired today', '今天有点累'), 'B03': ("I'm a little tired", '我有点累'),
     'U01': ("he's a little tired this afternoon", '他今天下午有点累'), 'U02': ("she's a little tired this morning", '她今天早上有点累'),
     'U03': ("but I'm a little tired", '但是我有点累'), 'U04': ("I'm a little tired this morning", '我今天早上有点累'),
     'U05': ("we're a little tired today", '我们今天有点累'), 'U06': ("but I'm a little tired this morning", '但是我今天早上有点累')},
  knock='L13: L03 "tired | 累" is taught after this chunk. 有点 = "a bit" stays a component (K29); rows elsewhere that say "a bit … | 有点…" lean on it.')

# ---- 40 "how do you feel at the moment? | 你现在感觉怎么样？"
D('S0040L01', 'regloss', known='how',
  why='"is it" is not in the seed; 怎么样 is the seed\'s "how". No clash: S0003L01 is "how to | 怎么".',
  b={'B01': ('how do you feel?', '你感觉怎么样？')},
  knock='S0642L03 "how | 怎么样" (new) becomes an exact repeat of this LEGO and should go not-new (outside this shard).')

# ---- 41 "I feel okay, but I'm starting to feel tired | 我感觉还行，但是我开始觉得累了"
D('S0041L02', 'grow', known='to feel tired', target='觉得累', type='M', comps=[['to think', '觉得'], ['tired', '累']],
  why='"to think" is not in the seed; re-glossing 觉得 to "to feel" clashes with S0343L02 "to feel | 感到" (ZUT), so it grows to the seed\'s "to feel tired" (K54 "to").',
  b={'B01': ('feel tired', '觉得累'), 'B02': ('I feel tired', '我觉得累'), 'B03': ('he feels tired', '他觉得累'),
     'U01': ('I feel tired today', '我今天觉得累'), 'U02': ('do you feel tired?', '你觉得累吗？'), 'U03': ('she feels tired now', '她现在觉得累'),
     'U05': ("I'm starting to feel tired", '我开始觉得累了'), 'U06': ('do you feel tired this morning?', '你今天早上觉得累吗？'),
     'U07': 'd', 'U08': ('he feels tired this afternoon', '他今天下午觉得累'), 'U09': 'd', 'U10': ("I don't feel tired", '我不觉得累'), 'U11': 'd', 'U12': 'k'},
  knock='觉得 = "to think" loses its own basket and stays a component (K29). Seed 47 (我觉得…, "I think that") has no LEGO for 觉得: an L27 add of "I think | 我觉得" there would give it a home (S0636L01 teaches that pair late). Not-new S0303L01 / S0553L01 "to think | 觉得" lose their pair (L31, re-judged at their seeds).')

# ---- 43 "I wasn't thinking about how to answer | 我当时没在想怎么回答"
D('S0043L02', 'seed', seed_known="I wasn't thinking about how to answer at that time",
  why='当时 "at that time" is in the Chinese and nowhere in the English; the row S0043L02U08 already carries this exact sentence. Editing the English keeps "at that time | 当时" and its 11 rows. KAI: seed edit.')
D('S0043L01', 'grow', known="wasn't thinking", target='没在想', type='M', comps=[["didn't", '没'], ['in the middle of', '在'], ['to think', '想']],
  why='"didn\'t" is not in the seed; 没在想 is its "wasn\'t thinking" (3 syllables), and 想 = "think" had no LEGO in this seed (S3).',
  b={'B01': ("wasn't thinking", '没在想'), 'B02': ("I wasn't thinking", '我没在想'), 'B03': ("he wasn't thinking", '他没在想'),
     'U01': ("I wasn't thinking about anything", '我没在想什么'), 'U02': ("he wasn't thinking yesterday", '他昨天没在想'),
     'U03': ("she wasn't thinking about how to answer", '她没在想怎么回答'), 'U05': 'd',
     'U06': ("he wasn't thinking about how to help me", '他没在想怎么帮我'), 'U07': ("she wasn't thinking about the whole sentence", '她没在想整个句子'),
     'U08': ("I wasn't thinking about how to ask him", '我没在想怎么问他'), 'U09': 'd', 'U10': 'd'},
  knock='没 = "didn\'t" loses its own basket and stays a component (K29); the many later "didn\'t … | 没…" rows lean on it. If Kai would rather keep "didn\'t | 没" as a taught word, the alternative is an English seed "I didn\'t think about how to answer at that time" (less exact for 没在想).')

# ---- 47: contraction
D('S0047L01', 'keep', why='"is" IS in the seed ("it\'s a good thing"); the detector tokenised the contraction as one word. Not a defect (same as S0012L03).')

# ---- 49 "it's like this, if you know what I mean | 就是这样，如果你懂我的意思"
D('S0049L02', 'grow', known='know what I mean', target='懂我的意思', type='M', comps=[['to understand', '懂'], ['my', '我的'], ['meaning', '意思']],
  why='"understand" is not in the seed; re-glossing 懂 to "to know" clashes with "to know | 知道" (ZUT), so it grows to the seed\'s "know what I mean" (5 syllables).',
  b={'B01': ('know what I mean', '懂我的意思'), 'B02': ('you know what I mean', '你懂我的意思'), 'B03': ('if you know what I mean', '如果你懂我的意思'),
     'U01': ('he knows what I mean', '他懂我的意思'), 'U03': ('she knows what I mean', '她懂我的意思'),
     'U04': ('if you know what I mean, help me', '如果你懂我的意思，帮我'), 'U05': ('I hope you know what I mean', '我希望你懂我的意思'),
     'U06': ('do you know what I mean?', '你懂我的意思吗？'), 'U07': 'd', 'U08': 'd', 'U09': 'd', 'U10': 'd'},
  knock='懂 = "to understand" stays a component (K29); "to understand" is taught at S0058L01 (听懂) in this plan.')
D('S0049L03', 'grow', known="it's like this", target='就是这样', type='M', comps=[['just', '就'], ['is', '是'], ['like this', '这样']],
  why='"just is" is not English and not in the seed; 就是这样 is the seed\'s "it\'s like this" (4 syllables). A bare "it\'s | 就是" would teach 就是 for every "it\'s".',
  b={'B01': ("it's like this", '就是这样'), 'B02': ("it's like this now", '现在就是这样'), 'B03': ("because it's like this", '因为就是这样'),
     'B04': ("but it's like this", '但是就是这样'), 'U01': ("I think it's like this", '我觉得就是这样'), 'U03': ("he says it's like this", '他说就是这样'),
     'U04': ("it's like this, if you know what I mean", '就是这样，如果你懂我的意思'), 'U05': ("I know it's like this", '我知道就是这样'),
     'U06': ("she thinks it's like this", '她觉得就是这样'), 'U07': 'd', 'U08': 'd'},
  knock='L13: L04 "like this | 这样" is taught after this chunk.')

# ---- 51: inflection
D('S0051L01', 'keep', why='K6: the seed says "doing"; "to do" is the same word (K54 "to"). Not a defect.')

# ---- 53 "she wanted to put his letter in her bag | 她想把他的信放进她的包里"
D('S0053L03', 'regloss', known='to put in',
  why='"into" is not in the seed ("put … in her bag"). Rows that said "put it into" are dropped rather than re-worded, because "I put it in the bag" is S0053L04\'s prompt for 我把它放进包里 (phrase-level ZUT).',
  b={'B01': ('put in the bag', '放进包里'), 'B02': 'd', 'B03': 'd', 'B04': ('put in her bag', '放进她的包里'), 'B05': 'd', 'B06': ('put in my bag', '放进我的包里'),
     'B07': 'd', 'U01': 'd', 'U04': ("I'm not putting this in the bag", '这个我不放进包里'), 'U05': ('I want to put the letter in her bag', '我想把信放进她的包里'),
     'U06': ('she wants to put the letter in the bag', '她想把信放进包里'), 'U07': 'k'})

# ---- 54 "we wanted to give you a little more time | 我们想再给你一点时间"
D('S0054L01', 'grow', known='to give you more', target='再给你', type='M', comps=[['again', '再'], ['to give', '给'], ['you', '你']],
  why='"again" is not in the seed; re-glossing 再 to "more" clashes with S0023L03 "more | 多" (ZUT). Shortest cut that says the seed\'s words: 再给你 "give you … more" (3 syllables; K54 "to").',
  b={'B01': ('give you more', '再给你'), 'B02': ('give you more time', '再给你时间'), 'B03': ('I want to give you more', '我想再给你'),
     'U01': ('I want to give you more time', '我想再给你时间'), 'U03': ('he wants to give you more time', '他想再给你时间'),
     'U05': ("I don't want to give you more time", '我不想再给你时间'), 'U06': ('I wanted to give you more time last week', '我上周想再给你时间'),
     'U08': ('we want to give you a little more', '我们想再给你一点'), 'U09': ('we want to give you a little more time', '我们想再给你一点时间'), 'U10': 'k'},
  knock='再 = "again" stays a component (K29); S0061L01 "can again | 能再" still teaches it. Not-new S0644L01 "again | 再" loses its pair (L31, outside this shard).')

# ---- 55 "I don't enjoy waking up when I didn't sleep very well | 我不喜欢睡得不好却还要醒来"
D('S0055L01', 'grow', known="didn't sleep very well", target='睡得不好', type='M', comps=[['to sleep', '睡得'], ['not good', '不好']],
  why='TARGET side: 却睡 is not a span of the seed (睡得不好却还要醒来), and "but" is not in the English. The seed\'s "didn\'t sleep very well" is 睡得不好 (4 syllables).',
  b={'B01': ("didn't sleep very well", '睡得不好'), 'U01': ("I didn't sleep very well", '我睡得不好'), 'U02': ("he didn't sleep very well yesterday", '他昨天睡得不好'),
     'U03': ("she didn't sleep very well", '她睡得不好'), 'U04': ("I'm tired because I didn't sleep very well", '我很累，因为我睡得不好')},
  add=[('b', "because I didn't sleep very well", '因为我睡得不好'), ('u', "we didn't sleep very well yesterday", '我们昨天睡得不好'),
       ('u', "I'm a little tired because I didn't sleep very well", '我有点累，因为我睡得不好')],
  knock='却还要 ("yet still have to") has no English counterpart in the seed and no LEGO (S3 gap that was already there for 还要; L27, outside item 10).')

# ---- 57 "I can't remember how to say what I wanted to say | 我想不起来怎么说我想说的话"
D('S0057L01', 'grow', known='what I wanted to say', target='我想说的话', type='M', comps=[['I want to say', '我想说'], ['of', '的'], ['words', '话']],
  why='"speech" is not in the seed; 我想说的话 is its "what I wanted to say" (5 syllables). No clash: S0159L01 is "what I\'m trying to say | 我想说的".',
  b={'B01': ('what I wanted to say', '我想说的话'), 'B02': ('remember what I wanted to say', '记住我想说的话'),
     'U02': ("he doesn't understand what I wanted to say", '他不懂我想说的话'), 'U03': ('do you understand what I wanted to say?', '你懂我想说的话吗？'),
     'U06': ('I want to explain what I wanted to say', '我想解释我想说的话'), 'U07': ('did you remember what I wanted to say?', '你记住我想说的话了吗？'),
     'U08': ("I can't remember what I wanted to say", '我想不起来我想说的话'), 'U09': 'k'},
  knock='话 = "words" stays a component (K29); 说话 "to speak" rows elsewhere lean on S0355L01 "to talk | 说话" / the component.')

# ---- 58 "it's interesting when you understand enough words | 当你能听懂足够的词时，这很有意思"
D('S0058L01', 'grow', known='to understand', target='听懂', type='M', comps=[['to listen', '听'], ['to understand', '懂']],
  why='"listen" is not in the seed; 听懂 is its "understand" (K54 "to"). No clash once S0049L02 (懂), S0074L01 (理解) and S0078L01 (明白) are re-cut in this same plan.',
  b={'B01': ('to understand', '听懂'), 'B02': ('I want to understand', '我想听懂'), 'B03': ('understand this', '听懂这个'),
     'U01': ('I want to understand this', '我想听懂这个'), 'U03': ('I can understand Chinese', '我能听懂中文'), 'U05': ('I can understand a little', '我能听懂一点'),
     'U06': ('can you understand?', '你能听懂吗？'), 'U07': ("I didn't understand this", '我没听懂这个'), 'U08': ("but she didn't understand", '但是她没听懂')},
  knock='听 = "to listen" stays a component (K29). Not-new S0533L01 "to listen | 听" loses its pair (L31, outside this shard). S0174L01 becomes the not-new repeat of this LEGO (below).')

# ---- 61 "could you say that again a little more slowly? | 你能慢一点再说一遍吗？"
D('S0061L02', 'grow', known='say that again', target='再说一遍', type='M', comps=[['again', '再'], ['to say', '说'], ['once', '一遍']],
  why='"once" is not in the seed; 再说一遍 is its "say that again" (4 syllables). Overlaps L01 "can again | 能再" (S4).',
  b={'B01': ('say that again', '再说一遍'), 'B02': ('can say that again', '能再说一遍'), 'B03': ('want to say that again', '想再说一遍'), 'B04': 'd',
     'U01': ('I want to say that again', '我想再说一遍'), 'U02': ('can you say that again?', '你能再说一遍吗？'), 'U04': ('she wants to say that again', '她想再说一遍'),
     'U05': ('I need to say that again', '我需要再说一遍'), 'U07': ('can he say that again?', '他能再说一遍吗？')},
  add=[('u', 'can you say that again tomorrow?', '你明天能再说一遍吗？')])

# ---- 66 "it's not difficult to find the answer | 找到答案并不难"
D('S0066L03', 'grow', known='not difficult', target='并不难', type='M', comps=[['actually', '并'], ['not', '不'], ['difficult', '难']],
  why='"actually" is not in the seed; 并不难 is its "not difficult" (3 syllables; L02 "difficult | 难" is taught first, L13 holds).',
  b={'B01': ('this is not difficult', '这个并不难'), 'B02': ('not difficult', '并不难'), 'B03': 'd', 'U01': ("it's not difficult", '并不难'), 'U04': 'd',
     'U06': 'k', 'U07': ('learning Chinese is not difficult', '学中文并不难'), 'U08': 'd'},
  add=[('u', 'speaking Chinese is not difficult', '说中文并不难'), ('u', 'remembering the whole sentence is not difficult', '记住整个句子并不难'),
       ('u', "I think it's not difficult", '我觉得并不难'), ('u', 'answering is not difficult', '回答并不难')])

# ---- 69 "he didn't want to look after the young dog all afternoon | 他不想整个下午照看那只小狗"
D('S0069L01', 'seed', seed_known="he didn't want to look after that small dog all afternoon",
  why='那只小狗 is "that small dog"; the English says "the young dog", so both "that | 那" and "small | 小" fail L26. Growing to 那只小狗 would cost the course its only teaching of 那 (13 rows) and 小 (9 rows). KAI: seed edit.')
D('S0069L02', 'keep', why='With the seed edit above ("that small dog") "small | 小" is the seed\'s own word. Without it: same defect, same fix.')

# ---- 74 "thank you very much for helping me to understand | 非常感谢你帮我理解"
D('S0074L01', 'grow', known='helping me to understand', target='帮我理解', type='M', comps=[['to help', '帮'], ['me', '我'], ['to understand', '理解']],
  why='"really" is not in the seed (costume 4: a narrower gloss to dodge the clash); bare "to understand | 理解" clashes with 听懂 (ZUT), so it grows to the seed\'s "helping me to understand" (4 syllables).',
  b={'B01': ('helping me to understand', '帮我理解'), 'B02': 'd', 'B03': ('can you help me understand?', '你能帮我理解吗？'), 'B04': ('help me understand', '帮我理解'),
     'U01': ('can you help me understand this?', '你能帮我理解这个吗？'), 'U03': ("he didn't help me understand", '他没帮我理解'),
     'U04': ('I think you can help me understand', '我觉得你能帮我理解'), 'U07': ('I need you to help me understand this', '我需要你帮我理解这个'), 'U08': 'k',
     'U09': 'd', 'U10': ('she wants to help me understand', '她想帮我理解'), 'U11': ('I hope you can help me understand', '我希望你能帮我理解')},
  knock='Not-new S0425L02 "to really understand | 理解" loses its pair (L31): re-judged below, it becomes new as "they understand | 他们理解了".')

# ---- 76 "I'm very happy with how much I've learnt already | 我对自己已经学会的这么多很满意"
D('S0076L01', 'kai', why='HELD (ZUT): 对 here is the seed\'s "with" (对…很满意), and "with | 对" would clash with S0088L02 "with | 跟". The frame 对…很满意 is gapped (L32) and the whole (对自己已经学会的这么多很满意) is 13 syllables, so no re-cut says it. "towards" stays until the seed itself is looked at (自己, 学会的, 这么多 have no LEGO either).')
D('S0076L03', 'seed', seed_known="I'm very satisfied with how much I've learnt already",
  why='满意 is "satisfied"; "very happy | 很满意" would put "I\'m very happy" on both 我很满意 and 我很开心 (S0106). KAI: seed edit.')

# ---- 78 "I don't understand what you said | 我不明白你说的是什么"
D('S0078L01', 'grow', known="don't understand", target='不明白', type='M', comps=[['not', '不'], ['to understand', '明白']],
  why='"clearly" is not in the seed (costume 4); bare "to understand | 明白" clashes with 听懂 (ZUT), so it grows to the seed\'s "don\'t understand" (3 syllables).',
  b={'B01': ("don't understand", '不明白'), 'B02': ("I don't understand", '我不明白'), 'B03': ("you don't understand", '你不明白'),
     'B04': ("don't you understand?", '你不明白吗？'), 'U02': ("they don't understand", '他们不明白'), 'U03': ("we don't understand", '我们不明白'),
     'U05': ("I don't understand this", '我不明白这个'), 'U08': ("I don't understand why", '我不明白为什么'), 'U09': 'k'})

# ---- 80 "I'm not sure when I'll be ready | 我不确定我什么时候才会准备好"
D('S0080L01', 'delete', why='"prepare" is not in the seed: 准备 only occurs inside 准备好 "ready", which L02 teaches (and carries 准备 as a component). "ready | 准备" would clash with 准备好.',
  knock='Not-new S0611L01 "to prepare | 准备" loses its pair and becomes NEW at seed 611 (L31, outside this shard). 10 rows go with the LEGO.')
D('S0080L03', 'delete', why='"only then it will" is not in the seed, and no seed words gloss 才会准备好 without colliding with L02\'s "will be ready | 会准备好". L04 already covers this span (and carries 才 "only then" as a component).',
  knock='10 rows go with the LEGO.')
D('S0080L04', 'keep', why='"I will" IS in the seed as the contraction "I\'ll" (K6). Not a defect.')

# ---- 83 "I agree with what you said about your friend | 我同意你关于你朋友说的"
D('S0083L02', 'keep', why='Stand-in frame (Kai 17 Nov): 你…说的 is split by 关于你朋友 in the seed, so no contiguous cut says "what you said"; "what was said" holds the place and every row swaps the stand-in ("what you said", "what I said"). "said | 说的" alone would lose the "what".')
D('S0083L03', 'grow', known='about your friend', target='关于你朋友', type='M', comps=[['regarding', '关于'], ['your friend', '你朋友']],
  why='"regarding" is not in the seed; re-glossing 关于 to "about" clashes with S0038L02 "about | 大概" (ZUT), so it grows to the seed\'s "about your friend" (5 syllables; S0310L03 "about that man | 关于那个男人" is the same cut).',
  b={'B01': ('about your friend', '关于你朋友'), 'B02': ('what you said about your friend', '你关于你朋友说的'), 'B03': ('what I said about your friend', '我关于你朋友说的'),
     'U01': ('I agree with what you said about your friend', '我同意你关于你朋友说的'), 'U02': ('I like what you said about your friend', '我喜欢你关于你朋友说的'),
     'U03': ("I don't understand what he said about your friend", '我不明白他关于你朋友说的'), 'U04': ('I agree with what he said about your friend', '我同意他关于你朋友说的'),
     'U05': ('do you agree with what I said about your friend?', '你同意我关于你朋友说的吗')},
  knock='L13: L04 "your friend | 你朋友" is taught after this chunk. Not-new S0597L03 "regarding | 关于" loses its pair (L31, outside this shard).')

# ---- 88 "I'm not ready to talk to people I don't know yet | 我还没准备好跟我不认识的人说话"
D('S0088L02', 'seed', seed_known="I'm not ready to talk with people I don't know yet",
  why='跟 is "with" (跟…说话 "talk with"); the English says "talk to". Every row already says "talk with". The re-cut (跟我不认识的人, 7 syllables) would cost the bare word. KAI: seed edit.')

# ---- 97 "yes I'm ready to go as soon as you want | 好的，只要你想，我马上就准备好走"
D('S0097L01', 'seed', seed_known="yes, as long as you want, I'm ready to go immediately",
  why='只要你想 is "as long as you want" and 马上 is "immediately"; the English "as soon as you want" folds the two together, so neither LEGO is the seed\'s words. "as soon as | 只要" would teach the wrong meaning. KAI: seed edit (both LEGOs then stand).')
D('S0097L02', 'keep', why='With the seed edit above "immediately | 马上" is the seed\'s own word.')

# ---- 101 "I'm enjoying finding out more about this language | 我很享受更多了解这门语言"
D('S0101L03', 'grow', known='this language', target='这门语言', type='M', comps=[['this', '这门'], ['language', '语言']],
  why='"course" is not in the seed; 门 is the measure word bound to 语言 (L22: grows to the noun in its own seed). "this | 这门" alone would clash with S0036L01 "this | 这个".',
  b={'B01': ('this language', '这门语言'), 'B02': 'd', 'B03': 'd', 'U01': ("I'm learning this language right now", '我现在在学这门语言'),
     'U02': ('do you want to learn this language?', '你想学这门语言吗？'), 'U03': ('this language seems easier than I thought', '这门语言似乎比我想的容易'),
     'U04': ("we're finding out more about this language", '我们在更多了解这门语言'), 'U05': ('I hope to be able to speak this language soon', '我希望很快能说这门语言'),
     'U06': ('she told me that this language is interesting', '她告诉我这门语言有趣'), 'U08': ('we need to practice this language more', '我们需要更多练这门语言')},
  knock='L13: L04 "language | 语言" is taught after this chunk (its rows already say 这门语言).')

# ---- 102 "we're trying to say that it's not like that | 我们想说事情不是那样的"
D('S0102L01', 'seed', seed_known="we're trying to say that things are not like that",
  why='事情 is "things"; the English says "it\'s". The re-cut (事情不是那样的, 7 syllables) would cost "thing | 事情" and its 11 rows, which S0356L02 points back to. KAI: seed edit (K6: thing/things).')

# ---- 104 "we need to change what we're doing | 我们需要改变我们正在做的事"
D('S0104L02', 'grow', known="we're doing", target='我们正在做', type='M', comps=[['we', '我们'], ['in the process of', '正在'], ['to do', '做']],
  why='"in the process of" is not in the seed; 我们正在做 is its "we\'re doing" (5 syllables).',
  b={'B01': ("we're doing", '我们正在做'), 'B02': 'd', 'B03': 'd', 'U02': ("what we're doing", '我们正在做的事'), 'U03': ("we're doing this", '我们正在做这个'),
     'U04': ("we're doing this thing", '我们正在做这个事情'), 'U07': ("I like what we're doing", '我喜欢我们正在做的事'),
     'U08': ("we need to change what we're doing", '我们需要改变我们正在做的事')},
  add=[('u', "she wants to know what we're doing", '她想知道我们正在做的事'), ('u', "he doesn't understand what we're doing", '他不懂我们正在做的事'),
       ('u', "I think we're doing this", '我觉得我们正在做这个')])

# ---- 105 "that is why he didn't know the answer | 这就是他不知道答案的原因"
D('S0105L01', 'seed', seed_known="that is the reason he didn't know the answer",
  why='原因 is "the reason"; "why | 原因" would clash with "why | 为什么" (ZUT) and the frame 这就是…的原因 is gapped. All 17 rows say "reason". KAI: seed edit.')

# ---- 107 "we hoped to see what you were doing | 我们本来希望看看你在做什么"
D('S0107L01', 'grow', known='hoped', target='本来希望', type='M', comps=[['originally', '本来'], ['to hope', '希望']],
  why='"originally" is not in the seed; 本来希望 is its "hoped" (4 syllables). No clash with "to hope | 希望".',
  b={'B01': ('I hoped', '我本来希望'), 'B02': ('hoped', '本来希望'), 'B03': ('we hoped', '我们本来希望'), 'B04': ('he hoped', '他本来希望'),
     'U01': ('I hoped to meet you today', '我本来希望今天和你见面'), 'U02': ('we hoped to change this', '我们本来希望改变这个'),
     'U05': ('I hoped to know the reason', '我本来希望知道原因'), 'U07': ('she hoped to come back', '她本来希望回来'),
     'U08': ('I hoped to feel happy about this', '我本来希望对这个觉得开心'), 'U09': 'k'})

# ---- 108 "we didn't hope to wake in the middle of the night | 我们没希望半夜醒来"
D('S0108L01', 'regloss', known='in the middle of the night',
  why='"midnight" is not in the seed; 半夜 is its "in the middle of the night". No clash.',
  b={'B01': 'd', 'B02': 'd', 'B03': 'k', 'B04': ('wake in the middle of the night', '半夜醒'), 'U01': ('I woke up in the middle of the night', '我半夜醒了'),
     'U03': ('she was working in the middle of the night', '她半夜在工作'), 'U04': ('I hoped to sleep, not wake in the middle of the night', '我本来希望睡，不是半夜醒'),
     'U05': ('why are you working in the middle of the night?', '你为什么正在半夜工作？'), 'U06': 'k',
     'U07': ("I don't feel happy when I wake in the middle of the night", '我半夜醒时不觉得开心'),
     'U08': ('we need to change this thing about waking in the middle of the night', '我们需要改变这个半夜醒的事情'), 'U09': 'k'})

# ---- 111 "when we learn something new it changes our brain | 当我们学到新东西时，它会改变我们的大脑"
D('S0111L01', 'grow', known='learn something new', target='学到新东西', type='M', comps=[['to learn', '学到'], ['new', '新'], ['thing', '东西']],
  why='"thing" is not in the seed; "something new | 新东西" would clash with S0227L01 "something new | 新事" (ZUT), so it grows to the seed\'s "learn something new" (5 syllables). 学到 had no LEGO in this seed (S3).',
  b={'B01': ('learn something new', '学到新东西'), 'B03': ('we learn something new', '我们学到新东西'), 'B04': ('when we learn something new', '当我们学到新东西时'),
     'U01': ('I want to learn something new', '我想学到新东西'), 'U02': 'd', 'U04': ('I like to learn something new', '我喜欢学到新东西'),
     'U05': ('do you like to learn something new?', '你喜欢学到新东西吗？'), 'U06': ('I need to learn something new', '我需要学到新东西'), 'U07': 'd',
     'U08': ('I want to learn something new quickly', '我想尽快学到新东西')},
  knock='新东西 "new thing" rows elsewhere lean on the components (K29).')

# ---- 116 "this isn't the best choice I could make | 这不是我能做出的最好选择"
D('S0116L02', 'grow', known='the best', target='最好', type='M', comps=[['most', '最'], ['good', '好']],
  why='"most" is not in the seed; 最好 is its "the best" (2 syllables).',
  b={'B01': ('the best', '最好'), 'B03': 'd', 'U02': 'k', 'U03': 'k', 'U05': 'k', 'U06': 'd', 'U07': 'd', 'U08': 'k'},
  add=[('b', 'the best answer', '最好的答案'), ('u', 'this is the best', '这是最好的'), ('u', 'I think this is the best', '我觉得这是最好的')],
  knock='最 = "most" stays a component (K29); S0280L01 / S0492L02 carry their own 最… chunks.')

# ---- 117 "I'm definitely doing better than I was last time we talked to each other | 我肯定比上次我们聊天时做得更好"
D('S0117L03', 'grow', known='we talked to each other', target='我们聊天', type='M', comps=[['we', '我们'], ['to chat', '聊天']],
  why='"chat" is not in the seed; "to talk | 聊天" would clash with S0355L01 "to talk | 说话" (ZUT), so it grows to the seed\'s "we talked to each other" (4 syllables).',
  b={'B01': ('we talked to each other', '我们聊天'), 'B03': ('when we talked to each other', '我们聊天时'), 'B04': ('last time we talked to each other', '上次我们聊天时'),
     'U01': 'd', 'U02': ('we talked to each other last time', '上次我们聊天了'), 'U03': 'd', 'U04': 'd', 'U05': 'd', 'U06': 'd', 'U07': 'd', 'U08': 'd', 'U09': 'k'},
  add=[('b', 'yesterday we talked to each other', '昨天我们聊天了'), ('u', 'I was tired last time we talked to each other', '上次我们聊天时我很累'),
       ('u', 'I was very happy last time we talked to each other', '上次我们聊天时我很开心')],
  knock='聊天 = "to chat" stays a component (K29); S0601L01 "to chat | 聊" is its own LEGO.')

# ---- 122 "it's starting to feel easier and I'm excited about how it's going | 开始觉得更容易了，我对进展很兴奋"
D('S0122L02', 'regloss', known="how it's going",
  why='"progress" is not in the seed; 进展 is its "how it\'s going". No clash.',
  b={'B01': ("how it's going", '进展'), 'B02': 'd', 'B03': ("excited about how it's going", '对进展很兴奋'), 'U01': 'd',
     'U02': ("I'm excited about how it's going", '我对进展很兴奋'), 'U03': 'd', 'U04': 'd', 'U05': ("I'm not sure about how it's going", '我对进展不确定'),
     'U06': ("she's happy about how it's going", '她对进展很开心'), 'U07': ("I want to know how it's going", '我想知道进展'),
     'U08': ("I was excited about how it's going when I started", '我开始的时候对进展很兴奋'), 'U09': 'k'})

# ---- 125 "I believe that your idea was very good | 我相信你的主意非常好"
D('S0125L01', 'seed', seed_known='I believe that your idea was extremely good',
  why='非常 is "extremely"; "very | 非常" clashes with S0013L02 "very | 很" (ZUT), and the re-cut "very good | 非常好" would put "that\'s very good" on both 那很好 and 那非常好. All 13 rows say "extremely". KAI: seed edit.')

# ---- 128 "you're like someone I used to know | 你像我以前认识的一个人"
D('S0128L01', 'grow', known='used to know', target='以前认识', type='M', comps=[['in the past', '以前'], ['to know', '认识']],
  why='"in the past" is not in the seed; 以前认识 is its "used to know" (4 syllables). No clash: S0506L03 is "used to | 曾".',
  b={'B01': ('I used to know him', '我以前认识他'), 'B02': ('I used to know', '我以前认识'), 'B03': 'k', 'U02': ('she used to know him', '她以前认识他'),
     'U04': ('he used to know me', '他以前认识我'), 'U06': ('you used to know him', '你以前认识他'), 'U08': ('I used to know your friend', '我以前认识你朋友')},
  add=[('u', 'we used to know those people', '我们以前认识那些人')],
  knock='以前 = "in the past" stays a component (K29); S0309L01 / S0536L01 carry their own 以前… chunks.')

# ---- 138 "this was where my friend wanted to meet us | 这里就是我朋友想和我们见面的地方"
D('S0138L01', 'seed', seed_known='this was the place where my friend wanted to meet us',
  why='地方 is "the place"; "where | 地方" would clash with S0070L02 "where | 哪里" (ZUT) and the frame …的地方 is gapped. All 9 rows say "place". KAI: seed edit.')

# ---- 142 "that's very kind of you and I'm grateful to you for helping | 你真好，我很感激你帮忙"
D('S0142L01', 'seed', seed_known="you're really kind and I'm grateful to you for helping",
  why='你真好 is "you\'re really kind" (row U02 says exactly that); the English "that\'s very kind of you" has no "really". The re-cut would be the fixed phrase 你真好 and would cost 真 "really" its 12 rows. KAI: seed edit.')
D('S0142L03', 'grow', known='grateful to you for helping', target='感激你帮忙', type='M', comps=[['grateful', '感激'], ['you', '你'], ['to help out', '帮忙']],
  why='"out" is not in the seed; "to help | 帮忙" would clash with S0025L04 "to help | 帮" (ZUT), so it grows to the seed\'s "grateful to you for helping" (5 syllables; L02 "grateful | 感激" is taught first).',
  b={'B01': ('grateful to you for helping', '感激你帮忙'), 'B03': 'd', 'B04': 'd', 'U01': 'd', 'U05': 'd', 'U06': 'd',
     'U07': ("I'm grateful to you for helping", '我很感激你帮忙'), 'U08': 'k', 'U09': ("I'm extremely grateful to you for helping", '我非常感激你帮忙')},
  add=[('b', 'very grateful to you for helping', '很感激你帮忙'), ('u', "she's grateful to you for helping", '她很感激你帮忙'),
       ('u', "we're grateful to you for helping", '我们很感激你帮忙'), ('u', "I'm really grateful to you for helping", '我真感激你帮忙'),
       ('u', 'my friend is grateful to you for helping', '我朋友很感激你帮忙')],
  knock='帮忙 = "to help out" stays a component (K29); S0168L02 "to come and help | 来帮忙" and S0491L02 carry their own chunks.')

# ---- 144 "I woke earlier than I wanted to this morning | 我今天早上比我想要的更早醒了"
D('S0144L02', 'grow', known='earlier than I wanted to', target='比我想要的更早', type='M', comps=[['than', '比'], ['I', '我'], ['to want', '想要'], ['of', '的'], ['earlier', '更早']],
  why='TARGET side: 比我更早 is not a span of the seed (比我想要的更早), and "me" is not in the English. The seed\'s "earlier than I wanted to" is 比我想要的更早 (7 syllables).',
  b={'B02': ('earlier than I wanted to', '比我想要的更早'), 'B03': ('woke earlier than I wanted to', '比我想要的更早醒'), 'B04': ('arrived earlier than I wanted to', '比我想要的更早到'),
     'U01': ('I arrived earlier than I wanted to', '我比我想要的更早到'), 'U02': ('I woke earlier than I wanted to today', '我今天比我想要的更早醒'), 'U03': 'd', 'U04': 'd',
     'U05': ('I think I left earlier than I wanted to', '我觉得我比我想要的更早走了'), 'U06': 'd', 'U07': 'd', 'U08': 'd', 'U09': 'k'})

# ---- 148: contractions
D('S0148L01', 'keep', why='"not" IS in the seed as the contraction "wasn\'t" (K6). Not a defect.')
D('S0148L03', 'keep', why='K6: the seed says "couldn\'t answer"; "can\'t answer" is the same word in another tense, and the rows use both. Not a defect.')

# ---- 150 "can you tell me what your name is? | 你能告诉我你叫什么名字吗？"
D('S0150L01', 'grow', known='what your name is', target='你叫什么名字', type='M', comps=[['you', '你'], ['to be called', '叫'], ['what', '什么'], ['name', '名字']],
  why='"be called" is not in the seed; 你叫什么名字 is its "what your name is" (6 syllables).',
  b={'B01': 'd', 'B02': 'd', 'B03': ('what your name is', '你叫什么名字'), 'U01': ('what is your name?', '你叫什么名字？'), 'U02': 'd', 'U03': 'd', 'U04': 'd',
     'U05': 'd', 'U06': 'd', 'U07': 'd', 'U08': 'k'},
  add=[('u', 'I want to know what your name is', '我想知道你叫什么名字'), ('u', "I don't know what your name is", '我不知道你叫什么名字'),
       ('u', 'he asked what your name is', '他问你叫什么名字'), ('u', "I can't remember what your name is", '我想不起来你叫什么名字'),
       ('u', 'she wants to know what your name is', '她想知道你叫什么名字')],
  knock='叫 = "to be called" stays a component (K29).')

# ---- 152 "I would have done it differently if I had known what you wanted | 如果我早知道你想要什么，我会做得不一样"
D('S0152L01', 'regloss', known='differently',
  why='"not the same" is not in the seed; 不一样 is its "differently". No clash.',
  b={'B01': ('do it differently', '做得不一样'), 'B03': 'd', 'B04': 'd', 'U02': 'd', 'U03': 'k', 'U04': 'd', 'U05': 'd', 'U06': 'k', 'U07': 'd', 'U08': 'd'},
  add=[('b', 'say it differently', '说得不一样'), ('u', 'I want to do it differently', '我想做得不一样'), ('u', 'he would do it differently', '他会做得不一样'),
       ('u', 'can you say it differently?', '你能说得不一样吗？'), ('u', 'she wants to do it differently now', '她现在想做得不一样')],
  knock='Not-new S0607L01 "not the same | 不一样" loses its pair (L31, outside this shard). Components "not | 不", "the same | 一样" stay.')

# ---- 163 "I think that it's interesting | 我觉得这很有意思"
D('S0163L01', 'grow', known="it's interesting", target='这很有意思', type='M', comps=[['this', '这'], ['very', '很'], ['interesting', '有意思']],
  why='"very" is not in the seed; "interesting | 很有意思" would clash with S0051L03 "interesting | 有趣" (ZUT), so it grows to the seed\'s "it\'s interesting" (5 syllables; seed 58 says the same chunk).',
  b={'B01': ("it's interesting", '这很有意思'), 'B03': 'd', 'B04': 'd', 'B05': 'd', 'U02': ("I think it's interesting", '我觉得这很有意思'), 'U03': 'd', 'U07': 'd'},
  add=[('b', "but it's interesting", '但是这很有意思'), ('b', "because it's interesting", '因为这很有意思'), ('u', "she says it's interesting", '她说这很有意思'),
       ('u', "do you think it's interesting?", '你觉得这很有意思吗？'), ('u', "I know it's interesting", '我知道这很有意思'),
       ('u', "he doesn't think it's interesting", '他不觉得这很有意思')])

# ---- 165 "but I'm not sure if it's true | 但是我不确定这是不是真的"
D('S0165L02', 'regloss', known="if it's",
  why='"whether" is not in the seed; 是不是 is its "if it\'s". No clash: S0049L01 is "if | 如果".',
  b={'B01': ("if it's", '是不是'), 'B03': 'd', 'B04': ("if it's true", '是不是真的'), 'U02': ("I want to know if it's true", '我想知道这是不是真的'),
     'U05': ("I don't know if it's true", '我不知道这是不是真的'), 'U07': ("I'm not sure if it's interesting or not", '我不确定这是不是有意思')})

# ---- 170 "I'd like you to tell me what you need | 我想让你告诉我你需要什么"
D('S0170L01', 'regloss', known="I'd like you to",
  why='"I want" is not in the seed ("I\'d like you to"). The re-gloss also CLOSES a standing ZUT: "I want you to" was both S0015L02 我希望你 and this 我想让你.',
  b=SUB('S0170L01', 'I want you to', "I'd like you to"))

# ---- 171 "do you want me to help you look for it? | 你想让我帮你找吗？"
D('S0171L01', 'grow', known='want me to', target='想让我', type='M', is_new=False, comps=[['want', '想'], ['let', '让'], ['me', '我']],
  why='"let" is not in the seed; its 想让我 "want me to" is S0169L01, taught two seeds earlier, so this not-new LEGO takes that pair (every seed part is a LEGO).',
  b=ALL('S0171L01', 'd'))

# ---- 174 "can you understand what I'm saying? | 你能听懂我在说什么吗？"
D('S0174L01', 'regloss', known='to understand', is_new=False,
  why='"follow … someone\'s" is not in the seed; 听懂 is its "understand", which S0058L01 teaches in this plan, so this becomes the not-new repeat (L27 clause 2: introduced once). Its 13 "follow" rows go (a not-new basket is never played, P25).',
  b=ALL('S0174L01', 'd'),
  knock='Depends on S0058L01 in this same plan.')

# ---- 182: inflection
D('S0182L01', 'keep', why='K6: the seed says "have you seen"; "to see" is the same word. Not a defect.')

# ---- 191 "no I don't mind at all | 不，我一点也不介意"
D('S0191L01', 'grow', known='not at all', target='一点也不', type='M', comps=[['a little', '一点'], ['also', '也'], ['not', '不']],
  why='"point" is not in the seed; 一点也不 is its "not … at all" ("not" is in the seed as the contraction "don\'t", K6). 4 syllables, and 8 of the rows already drill exactly this chunk.',
  b={'B01': 'd', 'B02': ('not at all', '一点也不'), 'B03': 'k', 'U01': 'k', 'U02': 'k', 'U03': 'k', 'U04': 'k', 'U05': 'k', 'U06': 'k', 'U07': 'k', 'U08': 'k'})

# ---- 198 "my daughter works for the council | 我女儿在市政府工作"
D('S0198L03', 'delete', why='"government" is not in the seed: 政府 only occurs inside 市政府 "the council", which L01 teaches. "council | 政府" would clash with it.',
  knock='14 rows go with the LEGO. If Kai wants 政府 kept as a word, it belongs to L01 as a component (K29), not as a LEGO of this seed.')

# ---- 200 "… that we finish everything in time | …我们按时完成一切"
D('S0200L02', 'regloss', known='in time',
  why='"on" is not in the seed ("in time"). No clash: S0091L02 is the chunk "to answer in time | 及时回答".',
  b=SUB('S0200L02', 'on time', 'in time'))

# ---- 204 "I wanted her to help you to deal with the arrangements | 我想让她帮你处理这些安排"
D('S0204L02', 'seed', seed_known='I wanted her to help you to deal with these arrangements',
  why='这些安排 is "these arrangements"; the English says "the". "these | 这些" is the course\'s only teaching of 这些 (S0606L02 points back to it). Same case as S0036L01. KAI: seed edit.')

# ---- 205: inflection
D('S0205L01', 'keep', why='K6: the seed says "I\'ve forgotten"; "to forget" is the same word. Not a defect.')

# ---- 217 "I had a glass or two of water | 我喝了一两杯水"
D('S0217L01', 'seed', seed_known='I drank a glass or two of water',
  why='喝 is "to drink"; the English says "had". "I had | 我喝了" would teach 喝 for every "had". KAI: seed edit (K6: drink/drank).')

# ---- 219 "it was nice to relax for a while | 放松一会儿很舒服"
D('S0219L01', 'regloss', known='nice',
  why='"comfortable" is not in the seed; 舒服 is its "nice". No clash ("nice" has no other LEGO).',
  b={'B01': ('nice', '舒服'), 'B02': ('very nice', '很舒服'), 'B03': ('was nice', '很舒服'), 'B04': ('nice here', '这里很舒服'), 'U01': ('this is very nice', '这个很舒服'),
     'U02': 'd', 'U03': ('it was nice here', '这里很舒服'), 'U04': ('this place is nice', '这个地方很舒服'), 'U06': 'd', 'U07': ('this was very nice', '这个很舒服'), 'U08': 'd', 'U09': 'k'},
  knock='Rows elsewhere that prompt "comfortable" for 舒服 (e.g. S0393L01U06) now lean on a word glossed "nice" — K-side re-read owed when this is applied.')

# ---- 221 "I watched the football and then I watched a film | 我看了足球，然后看了一部电影"
D('S0221L03', 'grow', known='a film', target='一部电影', type='M', comps=[['a', '一部'], ['film', '电影']],
  why='"part" is not in the seed; 部 is the measure word bound to 电影 (L22), so it grows to the seed\'s "a film" (4 syllables).',
  b={'B01': ('a film', '一部电影'), 'B02': 'd', 'B03': 'd', 'U01': ('I watched a film', '我看了一部电影'), 'U02': ('do you want to watch a film?', '你想看一部电影吗'), 'U03': 'd', 'U04': 'd'},
  add=[('b', 'watched a film', '看了一部电影'), ('u', 'and then I watched a film', '然后我看了一部电影'), ('u', 'I want to watch a film', '我想看一部电影'),
       ('u', 'she watched a film yesterday', '她昨天看了一部电影'), ('u', 'he wants to watch a film today', '他今天想看一部电影')],
  knock='L13: L04 "film | 电影" is taught after this chunk.')

# ---- 234 "… who works with your brother | …他和你哥哥一起工作"
D('S0234L01', 'regloss', known='brother',
  why='"older" is not in the seed. No clash ("brother" has no other LEGO).',
  b=SUB('S0234L01', 'older brother', 'brother'))

# ---- 245 "I'm happy with how much I've done in a short time | 我对自己短时间里做了这么多很满意"
D('S0245L01', 'regloss', known="how much I've done in a short time",
  why='"did so" is not in the seed; the span is its "how much I\'ve done in a short time". The target is 9 syllables as it stands (over the cap, already so before this plan; not re-cut here). Rows with other subjects go: they cannot say "I\'ve".',
  b={'B01': ("how much I've done in a short time", '短时间里做了这么多'), 'B03': 'd', 'B04': 'd', 'U01': 'd',
     'U02': ("she knows how much I've done in a short time", '她知道我短时间里做了这么多'), 'U03': 'd', 'U04': 'd',
     'U05': ("he told us how much I've done in a short time", '他告诉我们我短时间里做了这么多'),
     'U06': ("you know how much I've done in a short time", '你知道我短时间里做了这么多'), 'U07': 'k'},
  add=[('u', "they don't know how much I've done in a short time", '他们不知道我短时间里做了这么多')])

# ---- 246 "I wanted her to help you but she was too busy | 我想让她帮你，但是她太忙了"
D('S0246L01', 'grow', known='wanted her to', target='想让她', type='M', comps=[['want', '想'], ['let', '让'], ['her', '她']],
  why='"let" is not in the seed; its "wanted her to" is 想让她 (3 syllables), the same cut as S0237L01 "wanted me to | 想让我" and S0238L01 "wanted you to | 想让你".',
  b={'B01': ('wanted her to help you', '想让她帮你'), 'B03': 'd', 'B04': ('I wanted her to help', '我想让她帮'), 'U01': 'd', 'U02': 'd', 'U03': 'd', 'U04': 'd', 'U05': 'd', 'U06': 'd', 'U07': 'k'},
  add=[('b', 'he wanted her to help you', '他想让她帮你'), ('u', 'I wanted her to come tomorrow', '我想让她明天来'), ('u', 'we wanted her to tell me', '我们想让她告诉我'),
       ('u', 'I wanted her to help me this afternoon', '我想让她今天下午帮我'), ('u', 'you wanted her to speak Chinese', '你想让她说中文')])

# ---- 248 "I thought the film was complete rubbish and I want my money back | 我觉得那部电影太糟了，我想退钱"
D('S0248L01', 'grow', known='complete rubbish', target='太糟了', type='M', comps=[['too', '太'], ['bad', '糟'], ['(done)', '了']],
  why='"bad" is not in the seed; 太糟了 is its "complete rubbish" (3 syllables).',
  b={'B01': ('complete rubbish', '太糟了'), 'B02': 'd', 'B03': 'd', 'U01': ('this thing is complete rubbish', '这个东西太糟了'), 'U02': ('today was complete rubbish', '今天太糟了'),
     'U03': ('I think that film is complete rubbish', '我觉得那部电影太糟了'), 'U04': ('this answer is complete rubbish', '这个回答太糟了'), 'U05': 'd',
     'U06': ('this is complete rubbish, we need help', '这太糟了我们需要帮助'), 'U07': ("do you think it's complete rubbish?", '你觉得太糟了吗')})
D('S0248L02', 'grow', known='my money back', target='退钱', type='M', comps=[['to return', '退'], ['money', '钱']],
  why='"return" is not in the seed; 退钱 is its "my money back" (2 syllables; "money | 钱" is S0195L01).',
  b={'B01': ('my money back', '退钱'), 'B02': ('want my money back', '想退钱'), 'B03': 'd', 'U01': ('I want my money back', '我想退钱'),
     'U05': ('can I get my money back?', '我可以退钱吗'), 'U06': ('I need my money back', '我需要退钱'), 'U07': 'd', 'U08': 'd',
     'U09': ('I think I need my money back', '我觉得我需要退钱'), 'U10': 'd', 'U11': 'k'},
  add=[('u', 'I want my money back now', '我现在想退钱'), ('u', "I don't want my money back", '我不想退钱')])

# ---- 251 "I don't want to find out until after we finish | 我不想知道，等我们结束以后再说"
D('S0251L01', 'keep', why='Not-new pointer to the taught pair "to know | 知道"; the seed\'s "find out" is that word here, and a LEGO "to find out | 知道" would clash with S0101L02 "finding out | 了解" (ZUT). One target word, several English (Kai 12 Nov): fine.')
D('S0251L02', 'grow', known='until after we finish', target='等我们结束以后', type='M', comps=[['to wait', '等'], ['we', '我们'], ['to finish', '结束'], ['after', '以后']],
  why='TARGET side: 等结束 is not a span of the seed (等我们结束以后), and "wait" is not in the English. The seed\'s "until after we finish" is 等我们结束以后 (7 syllables).',
  b=ALL('S0251L02', 'd', B01=('until after we finish', '等我们结束以后')),
  add=[('b', 'not until after we finish', '等我们结束以后再说'), ('u', "I don't want to find out until after we finish", '我不想知道，等我们结束以后再说'),
       ('u', "I don't want to go until after we finish", '我不想走，等我们结束以后再说'),
       ('u', "she doesn't want to know until after we finish", '她不想知道，等我们结束以后再说'),
       ('u', "we can't help you until after we finish", '我们不能帮你，等我们结束以后再说')])
D('S0251L03', 'delete', why='"we\'ll deal with it later" is not in the seed at all. 以后 is now inside L02; 再说 ("then we\'ll talk") has no English counterpart in this seed.',
  knock='13 rows go with the LEGO. 再说 (2 syllables) is left without a LEGO: taking it into L02 would make 9 syllables. Alternative for Kai: English seed "I don\'t want to know; we\'ll deal with it later, after we finish", which would let this LEGO stand.')

# ---- 262 "who was that man you were talking to yesterday? | 你昨天在跟哪个男人说话？"
D('S0262L01', 'seed', seed_known='which man were you talking to yesterday?',
  why='哪个男人 is "which man"; "that man | 哪个男人" would clash with S0310L02 "that man | 那个男人" (ZUT). Row B04 already says "which man were you talking to". KAI: seed edit.')

# ---- 267 "have you heard from your friend? | 你有你朋友的消息吗？"
D('S0267L01', 'grow', known='heard from your friend', target='有你朋友的消息', type='M', comps=[['to have', '有'], ['your friend', '你朋友'], ['of', '的'], ['news', '消息']],
  why='"news" is not in the seed, and 的消息 starts with a bound 的; the seed\'s "heard from your friend" is 有你朋友的消息 (7 syllables).',
  b=ALL('S0267L01', 'd', B01=('heard from your friend', '有你朋友的消息'), U01='k', U02=("I've heard from your friend", '我有你朋友的消息'),
        U03=('has she heard from your friend?', '她有你朋友的消息吗'), U04=("I haven't heard from your friend", '我没有你朋友的消息'),
        U05=('have you heard from your friend today?', '你今天有你朋友的消息吗'), U06=('he has heard from your friend', '他有你朋友的消息')),
  knock='消息 = "news" stays a component (K29); S0511L01 "news | 消息" is its own LEGO.')

# ---- 271 "would you like to come with us next month? | 你愿意下个月和我们一起去吗？"
D('S0271L01', 'grow', known='would you like to', target='你愿意', type='M', comps=[['you', '你'], ['willing', '愿意']],
  why='"willing" is not in the seed; 你愿意 is its "would you like to" (3 syllables).',
  b={'B01': ('would you like to', '你愿意'), 'B02': ('would you like to go', '你愿意去'), 'B03': ('would you like to come', '你愿意来'), 'U01': 'd',
     'U02': ('would you like to try?', '你愿意试试吗'), 'U03': 'd', 'U04': 'd', 'U05': 'd', 'U06': ('would you like to work together?', '你愿意一起工作吗'),
     'U07': 'd', 'U08': 'd', 'U09': 'k'},
  add=[('u', 'would you like to help me?', '你愿意帮我吗'), ('u', 'would you like to come next week?', '你愿意下周来吗'),
       ('u', 'would you like to listen to my idea?', '你愿意听我的想法吗')],
  knock='愿意 = "willing" stays a component (K29). Not-new S0569L02 "willing | 愿意" loses its pair (L31, outside this shard).')

# ---- 272 "yes that sounds like a great idea | 好啊，听起来很棒"
D('S0272L01', 'kai', why='HELD (ZUT, both ways out): "yeah!" is not in the seed, but the seed\'s own word "yes | 好啊" clashes with S0350L01 "yes | 是的", and the word every row already uses, "sure | 好啊", clashes with S0010L02 "sure | 确定". The only re-cut is the whole seed (好啊，听起来很棒). Needs a known word for 好啊 that the course has not spent.')

# ---- 276 "no I can stay here for a little longer | 不，我还能在这里待一会儿"
D('S0276L01', 'regloss', known='for a little longer',
  why='"while" is not in the seed; 一会儿 is its "for a little longer". Same target as S0092L03 "for a while | 一会儿" under a second English wording (one target, several English: fine).',
  b={'B01': ('for a little longer', '一会儿'), 'B03': ('wait for a little longer', '等一会儿'), 'B04': ('stay for a little longer', '待一会儿'),
     'U01': ('I can wait for a little longer', '我能等一会儿'), 'U02': ('can you stay here for a little longer?', '你能在这里待一会儿吗'),
     'U03': ("I'm willing to wait for a little longer", '我愿意再等一会儿'), 'U05': 'd',
     'U06': ('unfortunately I can only stay for a little longer', '很遗憾我只能待一会儿'), 'U08': ('no I can still stay here for a little longer', '不我还能在这里待一会儿')})

# ---- 301 "he wants to show you something | 他想给你看点东西"
D('S0301L01', 'delete', why='"give" is not in the seed: 给 only occurs inside 给你看 "to show you", which L03 teaches. (#714·AI grows its origin S0032L01 to "show me | 给我看", so this not-new pointer loses its pair anyway: L31.)',
  knock='9 dark rows go with the LEGO.')
D('S0301L02', 'delete', why='TARGET side: 想看 is not a span of the seed (想给你看), and "look at" is not in the English. 想 is "I want" (seed 1) and 看 is inside L03 "to show you | 给你看".',
  knock='11 rows go with the LEGO.')

# ---- 306 "I know the young woman who is talking to your friend | 我认识那个正在和你朋友说话的年轻女人"
D('S0306L01', 'seed', seed_known='I know the young woman who is currently talking to your friend',
  why='正在 is "currently"; the English has no word for it, and 正在…说话 is gapped (the whole is 9 syllables). S0646L01 points back to this LEGO. KAI: seed edit.')

# ---- 313 "he said he can't finish watching those five games | 他说他不能看完那五场比赛"
D('S0313L02', 'grow', known='five games', target='五场比赛', type='M', comps=[['five', '五场'], ['game', '比赛']],
  why='"event" is not in the seed; 场 is the measure word bound to 比赛 (L22), so it grows to the seed\'s "five games" (4 syllables; L01 "five | 五" is taught first).',
  b={'B01': 'd', 'B02': 'd', 'B03': ('five games', '五场比赛'), 'U01': ('I want to watch five games', '我想看五场比赛'), 'U03': ('do you want to see five games?', '你想看五场比赛吗？'),
     'U04': ("he doesn't dare to watch those five games", '他不敢看那五场比赛'), 'U08': ('I think those five games are very important', '我觉得那五场比赛很重要')},
  add=[('b', 'those five games', '那五场比赛'), ('u', 'he said he wants to watch five games', '他说他想看五场比赛'),
       ('u', "I can't watch five games today", '我今天不能看五场比赛')],
  knock='L13: L04 "game | 比赛" is taught after this chunk.')

# ---- 315 "I think he can't afford the car he wants | 我觉得他买不起他想要的那辆车"
D('S0315L01', 'grow', known='the car', target='那辆车', type='M', comps=[['that', '那辆'], ['car', '车']],
  why='"vehicle" is not in the seed; 辆 is the measure word bound to 车 (L22), so it grows to the seed\'s "the car" (3 syllables). 车 had no LEGO in this seed (S3).',
  b={'B01': 'd', 'B02': ('the car', '那辆车'), 'B03': 'd', 'U01': ('I want the car', '我想要那辆车'), 'U02': 'd', 'U03': ('do you want the car?', '你想要那辆车吗？'), 'U04': 'd',
     'U06': ('I think she has the car', '我觉得她有那辆车'), 'U07': ('she said she wants the car', '她说她想要那辆车'),
     'U08': ('do you believe he has the car?', '你相信他有那辆车吗？'), 'U09': ("I don't like the car", '我不喜欢那辆车'), 'U10': ('I think the car is good', '我觉得那辆车很好')})

# ---- 320 "he doesn't need to buy another TV this year | 他今年不需要再买一台电视"
D('S0320L01', 'grow', known='to buy another TV', target='再买一台电视', type='M', comps=[['again', '再'], ['to buy', '买'], ['one', '一台'], ['TV', '电视']],
  why='"unit" is not in the seed; 台 is the measure word bound to 电视 (L22), and "another" here is 再…一台 around the verb, so the shortest span that says the seed\'s words is 再买一台电视 "to buy another TV" (6 syllables). 买 and 电视 had no LEGO in this seed (S3).',
  b={'B01': ('buy another TV', '再买一台电视'), 'B02': 'd', 'B03': 'd', 'U01': ('I want to buy another TV', '我想再买一台电视'),
     'U03': ('do you need to buy another TV?', '你需要再买一台电视吗？'), 'U06': ('I think she wants to buy another TV', '我觉得她想再买一台电视'),
     'U07': ('she said she needs to buy another TV', '她说她需要再买一台电视'), 'U08': ("I can't buy another TV today", '我今天不能再买一台电视')},
  add=[('u', "he doesn't need to buy another TV", '他不需要再买一台电视'), ('u', 'they want to buy another TV', '他们想再买一台电视')])

# ---- 327 "do you think she needs to provide another method? | 你觉得她需要提供另一种办法吗？"
D('S0327L01', 'grow', known='another method', target='另一种办法', type='M', comps=[['another', '另'], ['a kind of', '一种'], ['way', '办法']],
  why='"type" is not in the seed; 种 is the measure word bound to 办法 (L22), so it grows to the seed\'s "another method" (5 syllables). 办法 had no LEGO in this seed (S3).',
  b={'B01': 'd', 'B02': ('another method', '另一种办法'), 'B03': 'd', 'U01': 'd', 'U02': ('I want another method', '我想要另一种办法'), 'U04': ('she needs another method', '她需要另一种办法'),
     'U06': 'd', 'U08': ('can you find another method?', '你能找到另一种办法吗？')},
  add=[('b', 'need another method', '需要另一种办法'), ('u', 'I think we need another method', '我觉得我们需要另一种办法'),
       ('u', 'do you have another method?', '你有另一种办法吗？'), ('u', 'he wants to try another method', '他想试试另一种办法')])

# ---- 330: contraction
D('S0330L01', 'keep', why='"not" IS in the seed as the contraction "don\'t" ("I don\'t think this is very important" = 这不太重要). K6; not a defect.')

# ---- 332 "he can build a new life for his sister | 他可以为他妹妹建立新的生活"
D('S0332L01', 'regloss', known='to build',
  why='"establish" is not in the seed; 建立 is its "build" (K54 "to"). No clash.',
  b=SUB('S0332L01', 'establish', 'build'))

# ---- 335 "I think he can add some valuable ideas | 我觉得他可以增加一些有价值的想法"
D('S0335L02', 'grow', known='valuable', target='有价值', type='M', comps=[['to have', '有'], ['value', '价值']],
  why='"value" is not in the seed; 有价值 is its "valuable" (3 syllables).',
  b={'B01': ('valuable', '有价值'), 'B02': 'k', 'B03': 'd', 'B04': 'd', 'U01': 'k', 'U03': 'k', 'U04': ('she wants something valuable', '她想要有价值的东西'), 'U05': 'k', 'U06': 'k',
     'U07': 'd', 'U08': 'k', 'U09': 'd', 'U10': 'd', 'U11': 'd', 'U12': 'd', 'U13': 'd', 'U14': 'k'})

# ---- 339 / 341
D('S0339L03', 'keep', why='K6: the seed says "seriously"; "serious" is the same word with an ending. Not a defect.')
D('S0341L01', 'regloss', known='a few days ago',
  why='"several" is not in the seed ("a few days ago"). No clash: S0274L01 is "in a few days | 几天后".',
  b=SUB('S0341L01', 'several days ago', 'a few days ago', B03='d', B04='d'),
  knock='B03 "I several days ago" and B04 "one person several days ago" are not English on the known side; dropped rather than re-worded.')
D('S0341L02', 'keep', why='K6: the seed says "I saw"; "have seen" is the same verb, and this is a not-new pointer to S0182L02. Not a defect.')

# ---- 348 "she doesn't want to know what's going to happen | 她不想知道将要发生什么"
D('S0348L01', 'regloss', known='going to',
  why='"will" is not in the seed; 将要 is its "going to". No LEGO clash (S0005L01 is the chunk "I\'m going to | 我要"); rows with "I\'m / he\'s going to" are dropped so that prompt keeps one answer.',
  b={'B01': ('going to', '将要'), 'B02': ('going to happen', '将要发生'), 'B03': 'd', 'U01': 'd', 'U02': ("what's going to happen?", '将要发生什么？'), 'U03': 'd', 'U04': 'd', 'U05': 'd',
     'U06': ("I don't know what's going to happen", '我不知道将要发生什么'), 'U07': 'd', 'U08': ("he wants to know what's going to happen", '他想知道将要发生什么'), 'U09': 'k'},
  add=[('b', "what's going to happen", '将要发生什么'), ('u', "do you know what's going to happen?", '你知道将要发生什么吗？'),
       ('u', "we want to know what's going to happen", '我们想知道将要发生什么')])

# ---- 351 "no he didn't want to leave me on my own. | 不，他不想让我一个人待着"
D('S0351L01', 'grow', known='to leave me on my own', target='让我一个人待着', type='M', comps=[['to let', '让'], ['me', '我'], ['one person', '一个人'], ['to stay', '待着']],
  why='"stay" is not in the seed; 让我一个人待着 is its "leave me on my own" (7 syllables; K54 "to").',
  b={'B01': 'd', 'B02': 'd', 'B03': 'd', 'B04': ('leave me on my own', '让我一个人待着'), 'U01': 'k', 'U02': 'd', 'U03': 'd', 'U04': 'd',
     'U05': ('he wants to leave me on my own', '他想让我一个人待着'), 'U06': 'd', 'U07': 'k'},
  add=[('b', "didn't want to leave me on my own", '不想让我一个人待着'), ('u', "she didn't want to leave me on my own", '她不想让我一个人待着'),
       ('u', 'why do you want to leave me on my own?', '你为什么想让我一个人待着？'), ('u', "they don't want to leave me on my own", '他们不想让我一个人待着')],
  knock='待着 = "to stay" stays a component (K29).')

# ---- 356 / 358
D('S0356L01', 'keep', why='K6: the seed says "they had"; "to have" is the same word. Not a defect.')
D('S0356L02', 'keep', why='Not-new pointer to "thing | 事情"; the seed\'s "something important" is 重要的事情, and "thing" is heard inside "something" (K6: the learner connects them without thinking). Not a defect.')
D('S0358L02', 'keep', why='K6: the seed says "couldn\'t reach"; "can\'t reach" is the same word in another tense. Not a defect.')

# ---- 363 "yes he felt like talking a lot. | 是的，他很想多说话"
D('S0363L01', 'grow', known='talking a lot', target='多说话', type='M', is_new=True, comps=[['more', '多'], ['to speak', '说话']],
  why='"more" is not in the seed; "a lot | 多" would clash with S0089L02 "a lot | 很多" (ZUT), so this not-new pointer becomes a NEW chunk, the seed\'s "talking a lot | 多说话" (3 syllables). Needs an intro.',
  b={'B01': 'k', 'B02': 'd', 'B03': 'd', 'U01': 'k', 'U03': 'd', 'U05': 'd', 'U06': 'd'},
  add=[('b', 'he likes talking a lot', '他喜欢多说话'), ('u', 'she felt like talking a lot', '她很想多说话'), ('u', "I don't feel like talking a lot today", '我今天不想多说话'),
       ('u', 'they want to talk a lot', '他们想多说话'), ('u', 'we should talk a lot in Chinese', '我们应该用中文多说话')])

# ---- 365 "I didn't hear what she said to him. | 我没听清她对他说了什么"
D('S0365L01', 'regloss', known='to hear',
  why='"clearly" is not in the seed; 听清 is its "hear" (K54 "to"). No clash: S0364L01 is "heard that | 听说".',
  b={'B01': ('to hear', '听清'), 'B02': ("didn't hear", '没听清'), 'U02': ("I couldn't hear what he was saying", '我没听清他在说什么'), 'U04': ("I didn't hear", '我没听清'),
     'U06': ('I need you to say it again so I can hear', '我需要你再说一遍，这样我才能听清')})

# ---- 370 "I didn't see anyone that I knew. | 我没看到任何我认识的人"
D('S0370L01', 'grow', known='anyone that I knew', target='任何我认识的人', type='M', comps=[['any', '任何'], ['I', '我'], ['to know', '认识'], ['of', '的'], ['person', '人']],
  why='"any" is not in the seed; "anyone | 任何…人" is split by 我认识的, so it grows to the seed\'s "anyone that I knew" (7 syllables; row B01 already is this chunk).',
  b={'B01': ('anyone that I knew', '任何我认识的人'), 'B02': 'd', 'B03': 'd', 'U01': 'k', 'U02': 'd', 'U03': 'd', 'U04': 'd', 'U05': 'd',
     'U06': ("there wasn't anyone that I knew here", '这里没有任何我认识的人')},
  add=[('b', "didn't see anyone that I knew", '没看到任何我认识的人'), ('u', "she didn't see anyone that I knew", '她没看到任何我认识的人'),
       ('u', "he didn't tell anyone that I knew", '他没有告诉任何我认识的人'), ('u', "I didn't see anyone that I knew yesterday", '我昨天没看到任何我认识的人'),
       ('u', "they didn't meet anyone that I knew", '他们没见到任何我认识的人')],
  knock='任何 = "any" stays a component (K29); S0071L02 "anyone | 任何人" is its own LEGO.')

# ---- 374 "yes I thought it was very beautiful. | 是的，我觉得非常漂亮"
D('S0374L01', 'seed', seed_known='yes I thought it was extremely beautiful.',
  why='Not-new pointer to "extremely | 非常" (S0125L01); the English says "very". Same case and same fix as seed 125. KAI: seed edit.')

# ---- 375 "no I didn't know what she was doing. | 不，我不知道她在做什么"
D('S0375L01', 'regloss', known='was doing',
  why='"in the process of" is not in the seed; 在做 is its "was doing". No clash.',
  b={'B01': ('was doing', '在做'), 'B04': 'd', 'U02': 'd'})

# ---- 378 "no I didn't have enough money for holidays. | 不，我没钱去度假"
D('S0378L01', 'grow', known='for holidays', target='去度假', type='M', comps=[['to go', '去'], ['to go on holiday', '度假']],
  why='"go on" is not in the seed; 去度假 is its "for holidays" (3 syllables).',
  b={'B01': ('for holidays', '去度假'), 'B02': 'k', 'B03': 'k', 'U01': 'k', 'U02': 'd', 'U03': 'd', 'U04': ('do you have enough money for holidays?', '你有足够的钱去度假吗？'),
     'U05': 'd', 'U06': 'd', 'U07': 'k'},
  add=[('u', "she doesn't have money for holidays", '她没钱去度假'), ('u', 'we need money for holidays', '我们需要钱去度假'),
       ('u', "he said he didn't have money for holidays", '他说他没钱去度假')])

# ---- 382 "did you ask where he wanted to put it? | 你问过他想把它放在哪里吗？"
D('S0382L01', 'regloss', known='to put it',
  why='"something somewhere" is not in the seed; 把它放在 is its "to put it". No clash: S0053L04 is "to put it in | 把它放进".',
  b={'B01': ('to put it', '把它放在')})

# ---- 385 "did you agree with her? | 你同意她的说法吗？"
D('S0385L01', 'grow', known='agree with her', target='同意她的说法', type='M', comps=[['to agree', '同意'], ['her', '她的'], ['way of speaking', '说法']],
  why='"way of speaking" is not in the seed; 她的说法 is its "her", which only works next to the verb, so it grows to "agree with her" (6 syllables).',
  b={'B01': 'd', 'B02': ('agree with her', '同意她的说法'), 'B03': 'd', 'U01': 'k', 'U02': 'd', 'U03': 'd', 'U04': 'd', 'U05': 'k', 'U06': 'd'},
  add=[('u', 'I agree with her', '我同意她的说法'), ('u', "I don't agree with her", '我不同意她的说法'), ('u', 'why do you agree with her?', '你为什么同意她的说法？'),
       ('u', 'we all agree with her', '我们都同意她的说法'), ('u', "he said he didn't agree with her", '他说他不同意她的说法')],
  knock='说法 = "way of speaking" stays a component (K29).')

# ---- 388 "that person you work with. | 和你一起工作的人"
D('S0388L01', 'grow', known='you work with', target='和你一起工作', type='M', is_new=True, comps=[['with you', '和你'], ['together', '一起'], ['to work', '工作']],
  why='"together" is not in the seed, and its origin S0016L03 is grown by #714·AI to "with everyone else | 和别人一起", so this not-new pointer loses its pair (L31). Its seed says "you work with" = 和你一起工作 (6 syllables): NEW, needs an intro.',
  b={'B01': ('you work with', '和你一起工作'), 'U01': 'k', 'U03': 'd', 'U04': 'd', 'U05': 'd', 'U06': 'd'},
  add=[('b', 'the person you work with', '和你一起工作的人'), ('u', 'I know the person you work with', '我认识和你一起工作的人'),
       ('u', 'who is the person you work with?', '和你一起工作的人是谁？'), ('u', 'I saw the person you work with', '我见过和你一起工作的人'),
       ('u', 'the person you work with is very kind', '和你一起工作的人很友善')])

# ---- 393 "that boy with the green shirt. | 穿绿色衬衫的那个男孩"
D('S0393L01', 'seed', seed_known='that boy wearing the green shirt.',
  why='穿 is "wearing"; the English says "with". The re-cut (穿绿色衬衫的, 6 syllables) would swallow L02 and L03, which are taught after it. KAI: seed edit (K6: wear/wearing).')

# ---- 395 "we need to turn left at the next corner. | 我们需要在下一个路口向左转"
D('S0395L01', 'regloss', known='corner',
  why='"intersection" is not in the seed; every row already says "corner". No clash.')

# ---- 396 "we don't need to wait until everybody else is ready. | 我们不需要等所有人都准备好"
D('S0396L01', 'regloss', known='everybody else',
  why='"everyone" is not in the seed; 所有人 is its "everybody else" (bare "everybody" is S0424L01 大家: ZUT).',
  b=SUB('S0396L01', 'everyone', 'everybody else', B02='d'))

# ---- 397 "do we need to get ready soon? | 我们需要马上准备好吗？"
D('S0397L01', 'seed', seed_known='do we need to get ready right away?',
  why='马上 is "right away"; "soon | 马上" would clash with S0023L01 "soon | 很快" (ZUT). Every row says "right away". KAI: seed edit.')

# ---- 398 "we want to become more patient with our children. | 我们想对孩子更有耐心"
D('S0398L01', 'grow', known='more patient', target='更有耐心', type='M', comps=[['more', '更'], ['patient', '有耐心']],
  why='"be" is not in the seed, and "patient | 有耐心" is already S0148L02; the seed\'s new piece is "more patient | 更有耐心" (4 syllables).',
  b={'B01': ('more patient', '更有耐心'), 'B02': 'd', 'B03': ('more patient with children', '对孩子更有耐心'), 'U01': 'k', 'U02': 'k', 'U03': 'd', 'U05': 'd', 'U06': 'k'},
  add=[('u', 'she wants to be more patient', '她想更有耐心'), ('u', 'he should be more patient with his children', '他应该对他的孩子更有耐心'),
       ('u', 'can you be more patient?', '你能更有耐心吗？')])

# ---- 403 "we should remain quiet for as long as possible. | 我们应该尽可能长时间保持安静"
D('S0403L02', 'grow', known='for as long as possible', target='尽可能长时间', type='M', comps=[['as much as possible', '尽可能'], ['long', '长'], ['time', '时间']],
  why='"a … time" is not in the seed; 尽可能长时间 is its "for as long as possible" (6 syllables; row B02 already is this chunk).',
  b={'B01': ('for as long as possible', '尽可能长时间'), 'B02': 'd', 'B03': ('remain quiet for as long as possible', '尽可能长时间保持安静'), 'U01': 'k',
     'U02': ('I can remain quiet for as long as possible', '我能尽可能长时间保持安静'), 'U03': 'd', 'U04': 'd', 'U05': 'd', 'U06': 'd'},
  add=[('u', 'I want to stay here for as long as possible', '我想尽可能长时间待在这里'), ('u', 'he wants to practise for as long as possible', '他想尽可能长时间练习'),
       ('u', 'she wants to work for as long as possible', '她想尽可能长时间工作'), ('u', 'we should practise for as long as possible', '我们应该尽可能长时间练习')])

# ---- 404 "we shouldn't expect to finish before Thursday. | 我们不应该指望在周四之前完成"
D('S0404L03', 'regloss', known='to finish', is_new=False,
  why='"complete" is not in the seed; 完成 is its "finish", and "to finish | 完成" is S0149L03, so this becomes the not-new repeat of that pair.',
  b={'B03': ('finish the work', '完成工作')})

# ---- 408 "yes that's the best way to make a happy family. | 是的，这是建立幸福家庭的最好方式"
D('S0408L01', 'grow', known='a happy family', target='幸福家庭', type='M', comps=[['happiness', '幸福'], ['family', '家庭']],
  why='"happiness" is not in the seed; "happy | 幸福" would clash with S0106L01 "happy | 开心" (ZUT), so it grows to the seed\'s "a happy family" (4 syllables).',
  b={'B01': ('a happy family', '幸福家庭'), 'B02': 'd', 'B03': ('to make a happy family', '建立幸福家庭'), 'B04': 'd', 'U01': ('a happy family is very important', '幸福家庭很重要'),
     'U02': 'd', 'U03': ('I want to make a happy family', '我想建立幸福家庭'), 'U04': ('the most important thing is a happy family', '最重要的是幸福家庭'),
     'U05': ('we all want to make a happy family', '我们都想建立幸福家庭'), 'U06': ('she wants to make a happy family', '她想建立幸福家庭')},
  add=[('u', "that's the best way to make a happy family", '这是建立幸福家庭的最好方式')],
  knock='L13: L02 "family | 家庭" is taught after this chunk. 幸福 = "happiness" stays a component (K29).')

# ---- 411 "we would like to reserve a table for four tonight. | 我们今晚想预订一张四人的桌子"
D('S0411L01', 'grow', known='for four', target='四人的', type='M', comps=[['four', '四'], ['people', '人'], ['of', '的']],
  why='"people" is not in the seed; 四人的 is its "for four" (3 syllables).',
  b={'B01': ('for four', '四人的'), 'B02': 'd', 'U01': 'k', 'U02': 'd', 'U03': 'k', 'U04': 'd', 'U05': 'd'},
  add=[('b', 'a table for four', '四人的桌子'), ('u', 'do you have a table for four?', '你有四人的桌子吗？'), ('u', 'I want a table for four', '我想要四人的桌子'),
       ('u', 'we need a table for four tonight', '我们今晚需要四人的桌子')])

# ---- 413 "we could fall if we go too close. | 如果我们靠得太近，可能会摔倒"
D('S0413L03', 'regloss', known='to fall',
  why='"over" is not in the seed. No clash.',
  b={'B01': ('to fall', '摔倒'), 'U03': 'k', 'U05': 'k'})

# ---- 419 "if they want people to like them. | 如果他们想让人们喜欢他们"
D('S0419L01', 'grow', known='want people to', target='想让人们', type='M', comps=[['want', '想'], ['let', '让'], ['people', '人们']],
  why='"let" is not in the seed; its "want people to" is 想让人们 (4 syllables), the same cut as S0169L01 "want me to | 想让我".',
  b={'B01': ('want people to', '想让人们'), 'B02': 'd', 'B03': ('want people to like', '想让人们喜欢'), 'U01': 'k', 'U02': 'k', 'U03': 'k', 'U04': 'd', 'U05': 'd', 'U06': 'd'},
  add=[('u', 'I want people to like me', '我想让人们喜欢我'), ('u', 'we want people to know', '我们想让人们知道'),
       ('u', 'do you want people to help you?', '你想让人们帮你吗？'), ('u', "he doesn't want people to know", '他不想让人们知道')])

# ---- 421 "because they already know he's getting weak. | 因为他们已经知道他身体在变弱"
D('S0421L01', 'seed', seed_known='because they already know his body is getting weak.',
  why='身体 is "body"; the English has no word for it. The re-cut (他身体在变弱, 6 syllables) would swallow L02 whole. KAI: seed edit.')
D('S0421L02', 'regloss', known='to get weak',
  why='"become" is not in the seed; 变弱 is its "getting weak" (K54 "to", K6 get/getting). No clash.',
  b={'B02': ('getting weak', '变弱了'), 'U02': ('his health is getting weak', '他身体在变弱'), 'U06': ("he's been getting weak recently", '他身体最近在变弱')})

# ---- 424: possessive
D('S0424L01', 'keep', why='K6: the seed says "everybody\'s time"; "everybody" is the same word. Not a defect.')

# ---- 425 "yes they need to make sure they understand. | 是的，他们需要确保他们理解了"
D('S0425L02', 'grow', known='they understand', target='他们理解了', type='M', is_new=True, comps=[['they', '他们'], ['to understand', '理解'], ['(done)', '了']],
  why='"really" is not in the seed, and its origin S0074L01 grows in this plan, so this not-new pointer loses its pair (L31). Bare "to understand | 理解" would clash with 听懂 (ZUT); the seed\'s "they understand" is 他们理解了 (5 syllables): NEW, needs an intro.',
  b={'B01': ('they understand', '他们理解了'), 'B03': 'k', 'U01': 'k', 'U03': 'd', 'U04': 'd', 'U05': 'd'},
  add=[('u', 'I think they understand', '我觉得他们理解了'), ('u', 'she said they understand', '她说他们理解了'),
       ('u', 'do you think they understand?', '你觉得他们理解了吗？'), ('u', 'I hope they understand', '我希望他们理解了')])

# ---- 430 "no that wouldn't be possible. | 不，那是不可能的"
D('S0430L01', 'regloss', known="wouldn't be possible",
  why='"impossible" is not in the seed; 不可能 is its "wouldn\'t be possible". No clash: S0086L02 is "possible | 可能".',
  b={'B01': ("wouldn't be possible", '不可能'), 'B02': 'd', 'B03': 'k', 'U01': 'k', 'U02': ("I think that wouldn't be possible", '我觉得那不可能'),
     'U03': ("she said it wouldn't be possible", '她说那是不可能的'), 'U04': 'd', 'U05': ("why wouldn't that be possible?", '那为什么不可能？'), 'U06': 'd'},
  add=[('u', "he said that wouldn't be possible", '他说那是不可能的'), ('u', "I know that wouldn't be possible", '我知道那是不可能的')])

# ---- 431 "they're not ready yet but they'll be ready soon. | 他们还没准备好，但是很快就会准备好"
D('S0431L01', 'kai', why='HELD (ZUT): not-new pointer to S0149L02 "very soon | 很快就". Both seeds say only "soon", but "soon | 很快就" would clash with S0023L01 "soon | 很快". The defect is at the origin (seed 149, not in the item-10 list); the two must move together.')

# ---- 432 "they could mean that they want you to ask. | 他们可能是想让你去问"
D('S0432L01', 'grow', known='could mean', target='可能是想', type='M', comps=[['possible', '可能'], ['is', '是'], ['to want', '想']],
  why='"it … be" is not in the seed; 可能是想 is its "could mean" (4 syllables).',
  b={'B01': ('could mean', '可能是想'), 'B02': ('they could mean', '他们可能是想'), 'B03': 'd', 'U01': 'k', 'U02': 'd', 'U03': ('she could mean something else', '她可能是想说别的'),
     'U04': 'd', 'U05': 'd', 'U06': 'd'},
  add=[('u', 'he could mean that he wants to go', '他可能是想去'), ('u', 'they could mean that they want to help', '他们可能是想帮忙'),
       ('u', 'she could mean that she wants you to ask', '她可能是想让你去问'), ('u', 'I think they could mean that they want to wait', '我觉得他们可能是想等')])

# ---- 434 "could they cut the number of students they take? | 他们能减少招收的学生人数吗？"
D('S0434L01', 'regloss', known='to cut',
  why='"reduce" is not in the seed; 减少 is its "cut" (K54 "to"). No clash.',
  b=SUB('S0434L01', 'reduce', 'cut'))
D('S0434L02', 'grow', known='students they take', target='招收的学生', type='M', comps=[['to recruit', '招收'], ['of', '的'], ['student', '学生']],
  why='"recruit" is not in the seed; "to take | 招收" would clash with S0580L01 "to take | 带" (ZUT), so it grows to the seed\'s "students they take" (5 syllables).',
  b=ALL('S0434L02', 'd', B01=('students they take', '招收的学生'), U01=('could they cut the students they take?', '他们能减少招收的学生吗？')),
  add=[('b', 'the number of students they take', '招收的学生人数'), ('u', 'could they cut the number of students they take?', '他们能减少招收的学生人数吗？'),
       ('u', 'the students they take are very good', '招收的学生很好'), ('u', 'she asked about the students they take', '她问了招收的学生'),
       ('u', 'the number of students they take is too high', '招收的学生人数太多了')],
  knock='L13: L03 "student | 学生" is taught after this chunk.')
D('S0434L04', 'grow', known='the number of students', target='学生人数', type='M', comps=[['student', '学生'], ['number of people', '人数']],
  why='"people" is not in the seed; bare "number | 人数" would clash with S0463L01 "number | 号码" (ZUT), so it grows to the seed\'s "the number of students" (4 syllables; L03 "student" is taught first).',
  b={'B01': ('the number of students', '学生人数'), 'B02': 'd', 'B03': 'd', 'U01': 'k', 'U02': 'k', 'U03': 'd', 'U04': 'k', 'U05': 'k', 'U06': 'k'},
  add=[('b', 'cut the number of students', '减少学生人数'), ('u', 'the number of students is not important', '学生人数不重要')])

# ---- 436 "no there's a minimum number they need. | 不，他们有最低人数要求"
D('S0436L02', 'grow', known='a minimum number they need', target='最低人数要求', type='M', comps=[['minimum', '最低'], ['number of people', '人数'], ['requirement', '要求']],
  why='"requirement" is not in the seed; 要求 is its "they need", which only reads that way with the noun before it, so it grows to "a minimum number they need" (6 syllables; L01 "minimum | 最低" is taught first).',
  b=ALL('S0436L02', 'd', B01=('a minimum number they need', '最低人数要求'), U01='k'),
  add=[('b', "there's a minimum number they need", '他们有最低人数要求'), ('u', "I know there's a minimum number they need", '我知道他们有最低人数要求'),
       ('u', "she said there's a minimum number they need", '她说他们有最低人数要求'), ('u', "is there a minimum number they need?", '他们有最低人数要求吗？'),
       ('u', "I think there's a minimum number they need", '我觉得他们有最低人数要求')])

# ---- 441 "an approach. | 一种方法"
D('S0441L02', 'grow', known='an approach', target='一种方法', type='M', comps=[['a kind of', '一种'], ['approach', '方法']],
  why='"a kind of" is not in the seed; 一种方法 is its "an approach" (4 syllables; L01 "approach | 方法" is taught first).',
  b={'B01': ("that's an approach", '那是一种方法'), 'B02': 'd', 'U01': 'k', 'U02': 'd', 'U03': ('I want to find an approach', '我想找一种方法'), 'U04': 'd', 'U05': 'd',
     'U06': ('she proposed an approach', '她提出了一种方法')},
  add=[('u', 'we need an approach', '我们需要一种方法'), ('u', 'this is an approach', '这是一种方法'), ('u', 'do you have an approach?', '你有一种方法吗？')])

# ---- 447 "will they be able to drive us home after the meal? | 吃完饭后他们能开车送我们回家吗？"
D('S0447L02', 'regloss', known='to drive',
  why='"a car" is not in the seed. No clash. Row U01 said "drive us home" over 开车回家 ("drive home"): corrected.',
  b={'U01': ('can they drive home?', '他们能开车回家吗？')},
  knock='Not-new S0540L01 "to drive a car | 开车" loses its exact pair; it takes the same re-gloss (outside this shard).')
D('S0447L03', 'grow', known='to drive us home', target='开车送我们回家', type='M', comps=[['to drive', '开车'], ['to take', '送'], ['us', '我们'], ['home', '回家']],
  why='"see off" is not in the seed; 送 only reads as the seed\'s words inside 开车送我们回家 "drive us home" (7 syllables; L02 "to drive | 开车" is taught first).',
  b={'B01': 'd', 'B02': 'd', 'B03': 'k', 'U01': 'k', 'U02': 'd', 'U03': 'd', 'U04': 'd', 'U05': 'd', 'U06': 'd'},
  add=[('u', 'can they drive us home?', '他们能开车送我们回家吗？'), ('u', 'she said she would drive us home', '她说她会开车送我们回家'),
       ('u', 'he wants to drive us home', '他想开车送我们回家'), ('u', 'can you drive us home tonight?', '你今晚能开车送我们回家吗？'),
       ('u', 'nobody wanted to drive us home', '没有人想开车送我们回家')],
  knock='送 = "to take (someone)" stays a component (K29).')

# ---- 450 "no they have to catch the train themselves. | 不，他们得自己赶火车"
D('S0450L02', 'regloss', known='to catch',
  why='"rush" is not in the seed; 赶 is its "catch" (K54 "to"). No clash.',
  b={'B01': ('to catch the train', '赶火车'), 'B03': ('have to catch', '得赶'), 'U04': ("let's hurry or we won't catch the train", '我们快点，不然赶不上火车')})

# ---- romanisation, hand-read (R0.13): tools/roman.py spells new text from the course's own readings; these are the
# readings it gets wrong in this shard's text, corrected for every row that carries them (plan.py takes ROMAN as overrides).
sys.path.insert(0, os.path.join(HERE, '..', 'tools'))
from roman import roman as _roman
FIX = [('zhǎng shíjiān', 'cháng shíjiān'),      # 长时间: cháng "long", not zhǎng "to grow"
       ('dài zài', 'dāi zài'),                  # 待在: dāi "to stay", not dài
       ('dāizhe', 'dāi zhe'),                   # as the course's other 待着 rows space it
       ('shuō dehuà', 'shuō de huà'),           # 我想说的话: 的 + 话 "words", not 的话 "if"
       ('zàishuō yībiàn', 'zài shuō yī biàn'),  # 再说一遍: 再 + 说, not 再说 "talk about it later"; 一遍 spaced as in the basket
       ('bùtóng yì', 'bù tóngyì')]              # 不同意: 不 + 同意, not 不同 "different"
ROMAN = {}
for d in OUT:
    texts = [d.get('target')] + [v[1] for v in d.get('basket', {}).values() if isinstance(v, list)] + [a[2] for a in d.get('add', [])]
    for t in filter(None, texts):
        r, _ = _roman('zho_for_eng', t)
        r2 = r
        for a, b in FIX:
            r2 = r2.replace(a, b)
        if r2 != r:
            ROMAN[t] = r2

# ---- every candidate of the shard has a decision
REC = json.load(open(os.path.join(HERE, '..', '..', 'recount.json')))['rows']
want = {r['row'] for r in REC if r['course'] == 'zho_for_eng' and 37 <= int(r['row'][1:5]) <= 450}
have = {d['id'] for d in OUT}
assert want <= have, sorted(want - have)
json.dump({'course': 'zho_for_eng', 'shard': 'seeds 37-450 (cs #741·AI)', 'roman': ROMAN, 'legos': OUT}, open(os.path.join(HERE, 'zho_for_eng.json'), 'w'), ensure_ascii=False, indent=1)
print(len(ROMAN), 'roman overrides;', len(OUT), 'decisions;', len(want), 'candidates;', 'extra (non-candidate) decisions:', sorted(have - want))
