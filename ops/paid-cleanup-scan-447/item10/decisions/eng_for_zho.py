#!/usr/bin/env python3
"""eng_for_zho item-10 decisions (cs #808·AI, child of #714·AI). Known side CHINESE, target ENGLISH. Most rows here are a LEGO whose
two sides were saved out of step (known of one piece, target of another: 说 | Can't remember); the fix puts each side back to the
seed's own words. Writes eng_for_zho.json for tools/plan.py. Verdicts as in decisions/zho_for_eng.py."""
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


D('S0011L01', 'regloss', known='能',
  why='The two sides are out of step: known 我想 ("I want") over target "To be able". Every row pairs 能 with "to be able" (能说 | To be able to speak), and the seed says 能说话. Known → 能.')
D('S0012L02', 'regloss', target="wouldn't like",
  why='"Doesn\'t want" is not in the English seed ("I wouldn\'t like to guess…"); every row already says "wouldn\'t like". Target → the seed\'s words (L26).')
D('S0026L03', 'seed', seed_known='我喜欢那种好像快要准备好出发的感觉',
  why='The Chinese seed 我喜欢那种快要准备好出发的感觉 has no 好像, while the English says "as if": no Chinese word glosses the target\'s "as if" (S15). KAI: known seed edit to 我喜欢那种好像快要准备好出发的感觉 (好像 inside the same 那种…的感觉 frame).')
D('S0026L03', 'regloss', target='as if', why='"Seems" is not in the English seed; it says "as if", which every row already says. With the seed edit the Chinese says 好像.')
D('S0033L01', 'delete',
  why='"长时间 | A long time": neither side is in the seed (多长时间了 / "how long have you been"), and L02 "多长时间了 | How long have you been" already tiles it. The LEGO and its "taking a long time" rows go.')
D('S0034L02', 'regloss', target='when',
  why='Out of step: 的时候 over "To be quiet" (L01\'s target). 的时候 is the seed\'s "when"; every row says "when".')
D('S0055L03', 'regloss', target="don't enjoy",
  why='"Doesn\'t like" is not in the English seed ("I don\'t enjoy waking up…"). Target → "don\'t enjoy"; the bare row goes, B02 follows the seed\'s word.',
  b={'B01': 'd', 'B02': ('不喜欢醒来', "Don't enjoy waking up")})
D('S0057L01', 'regloss', known='记不住',
  why='Out of step: 说 over "Can\'t remember". The seed\'s 记不住 is "can\'t remember"; every row says 记不住.')
D('S0059L02', 'regloss', known='下个星期',
  why='Out of step: 做 (L01\'s known) over "Next week". The seed\'s 下个星期 is "next week"; every row says it.')
D('S0103L02', 'regloss',
  why='The pair 更多 | More is right and in the seed (the scanner split 更多的词). But five rows drill 很多 "many", a different word this LEGO does not teach: they go, and the basket is back-filled with 更多.',
  b={'B01': 'd', 'B03': 'd', 'U02': 'd', 'U04': 'd', 'U05': 'd'},
  add=[('b', '更多的词', 'more words'), ('b', '听更多的词', 'hear more words'), ('b', '学更多的词', 'learn more words'),
       ('u', '我想听更多的词', 'I want to hear more words'), ('u', '我们需要学更多的词', 'we need to learn more words'),
       ('u', '我今天想学更多的词', 'I want to learn more words today')])
D('S0218L01', 'grow', known='没做什么', target="didn't do much", type='M', comps=[['没', "didn't"], ['做', 'do'], ['什么', 'much']],
  why='"多少 | How much": neither side is in the seed (星期天我没做什么 / "I didn\'t do much on Sunday"). The seed\'s chunk is 没做什么 = "didn\'t do much" (L25: re-chunked to what the seed says).',
  b={'U01': ('我周末没做什么', "I didn't do much at the weekend"), 'U02': 'd', 'U03': 'd', 'U04': 'd', 'U05': 'd'},
  add=[('b', '我昨天没做什么', "I didn't do much yesterday"), ('b', '他没做什么', "he didn't do much"), ('b', '我们没做什么', "we didn't do much"),
       ('u', '星期天我没做什么', "I didn't do much on Sunday"), ('u', '我今天没做什么', "I didn't do much today"),
       ('u', '她上个星期没做什么', "she didn't do much last week"), ('u', '我今天早上没做什么', "I didn't do much this morning")])

json.dump({'course': 'eng_for_zho', 'legos': OUT}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'eng_for_zho.json'), 'w'), ensure_ascii=False, indent=1)
print(len(OUT), 'decisions')
