import sys, os
sys.path.insert(0, os.path.dirname(__file__)); from common import *
C = 'jpn_for_eng'
d, idx = index(C)
sc = {r['rid']: r['n'] for r in scope(C)}
E = []
def ed(rid, defect, known=None, target=None, source='', conf='sure', note=''):
    cur = row_text(idx, rid)
    E.append(entry(idx, C, rid, defect, 'edit', {'known': known if known is not None else cur['known'], 'target': target if target is not None else cur['target']}, source, conf, sc.get(rid), note))
def de(rid, defect, source='', conf='sure', note=''):
    E.append(entry(idx, C, rid, defect, 'delete', None, source, conf, sc.get(rid), note))
SW = 'not in the scan list; same defect in the same basket (R0.4 step 3)'
DBJG = 'Makino & Tsutsui, A Dictionary of Basic Japanese Grammar, "-tai" (Note 3: -tai expresses the speaker\'s own wish, or the listener\'s in a question; a third person\'s wish needs -tagaru, or an evidential such as らしい/そうだ) and "-garu"'
PREC = ('English follows the Japanese, as Kai accepted for 37 jpn seeds on 29 Oct (held group B, edit event ce05e9f6) and as #421 recommended for 428 ("たい is only you or I"). '
        'The seed English moves to "we" (a plural first person, the nearest to the canonical "they" that bare たい can carry).')
# ---- F3: bare たい/たかった under he/she/they English → English first person ----
ed('SEED212', 'canonical English "they wanted…" over subjectless 助けを求めたかった, which means "I/we wanted…"', known='we wanted to ask for help', source=DBJG + '. ' + PREC)
ed('S0212L01U10', 'seed copy follows the seed', known='we wanted to ask for help', source='P26 seed copy')
de('S0212L01B04', '"we wanted to ask for help" would now be an exact copy of the seed row U10', source='duplicate', note='BUILD floor 3 → 2 (warn-only, P23)')
ed('S0212L01B03', '"she wanted…" over bare たかった (= I/we)', known='they say they wanted to ask for help', target='助けを求めたかったらしい', source=DBJG + ' — a third person\'s past wish with the hearsay らしい (taught S0200, the seed before) is correct Japanese and keeps a "they" row', conf='sure')
ed('S0212L01U01', '"he wanted…" over bare たかった', known='I wanted to ask for help yesterday', source=DBJG)
ed('S0212L01U02', '"she wanted … from her mother" over bare たかった (母 = my mother)', known='I wanted to ask my mother for help', source=DBJG + '; 母 is the speaker\'s own mother')
ed('S0212L01U04', '"he wanted…" over bare たかった', known='I wanted to ask for help then', source=DBJG)
ed('S0212L01U05', '"they wanted … when they were busy" over bare たかった', known='they say they wanted to ask for help when they were busy', target='忙しい時助けを求めたかったらしい', source=DBJG + '; らしい S0200', conf='sure')
ed('S0212L01U08', '"they wanted…" over bare たかった', known='I wanted to ask for help but didn\'t', source=DBJG, note=SW)
ed('SEED299', 'canonical "he wants to pay half" over subjectless 半分払いたい (= I/we want)', known='we want to pay half', source=DBJG + '. ' + PREC)
ed('S0299L02B03', 'seed copy follows the seed', known='we want to pay half', source='P26')
ed('SEED300', 'canonical "she doesn\'t want to seem unfriendly" over subjectless 冷たく見られたくない (= I/we)', known='we don\'t want to seem unfriendly', source=DBJG + '. ' + PREC)
ed('S0300L02', 'LEGO English "doesn\'t want…" must carry the seed\'s words (L26) once the seed says "we don\'t"', known='don\'t want to seem unfriendly', source='L26; presentation follows (O13)')
ed('S0300L02B01', 'bare LEGO copy follows its LEGO', known='don\'t want to seem unfriendly', source='O12')
ed('S0300L02B03', 'seed copy follows the seed', known='we don\'t want to seem unfriendly', source='P26')
for rid, k in [('S0052L01U04', 'I wanted to come back'), ('S0052L01U08', 'I wanted to speak Japanese'),
               ('S0200L02B03', 'I want to make sure that we finish in time'), ('S0211L02B04', 'I don\'t want to explain right now'),
               ('S0211L02U02', 'I don\'t want to explain the method'), ('S0211L02U03', 'I don\'t want to explain the reason'),
               ('S0211L02U05', 'I don\'t want to explain more'), ('S0211L02U07', 'I don\'t want to explain again'),
               ('S0214L01U07', 'I wanted to rest at the weekend'), ('S0215L01U07', 'I wanted to work on Saturday'),
               ('S0215L02U07', 'I wanted to go out on Saturday night'), ('S0216L01U07', 'we wanted to meet a few friends')]:
    ed(rid, 'he/she/they English over bare たい/たかった, which says "I/we"', known=k, source=DBJG + '; English follows the Japanese (precedent ce05e9f6)')
# ---- F3b: 彼は/彼女は stated + present たい ----
TG = DBJG + '. The fix stays inside what the course teaches: -たがってる is taught only as the whole chunk 知りたがってる (seed 17), so 戻りたがってる/会いたがってる/やめたがらない do not tile (K21, P2); each row moves to the first person (keeping its LEGO, P17) or, in a 彼は/彼女は basket, to the plain verb (戻る is S0016L01\'s component, usable alone — K29)'
HOLD16 = ('The seed sentence itself has the defect (stated 彼は/彼女は + -tai). The grammatical fix (-たがる) would replace the seed\'s LEGO, and that LEGO is the ONLY place the course teaches '
          '戻りたい (16) / 静かにしたくない (34) / 読みたくない (35): 52 rows depend on them (incl. 10 in seeds 313–407), which would become untaught (P1). The other correct forms '
          '(…たいって, …たいらしい, …たいみたい) are untaught at seeds 16–35 and need a new LEGO on a released course (structural; Tom\'s or Kai\'s go). A seed rebuild with whole-course blast radius (S11/O1), not a row fix: left as is and listed. '
          'Bare たい after 彼は is common in casual speech; textbooks mark it (DBJG), so the scan rated this "likely", not "sure".')
for r in ['SEED16', 'SEED34', 'SEED35']:
    E.append(entry(idx, C, r, 'stated third person + present -tai in the seed sentence', 'hold', None, HOLD16, 'n/a', sc.get(r)))
for rid, k, t in [('S0016L03B01', 'he\'ll go back later', '彼はあとで戻る'), ('S0016L03U01', 'he\'ll go back with everyone', '彼はみんなと戻る'),
                  ('S0016L03U04', 'he\'ll go back together', '彼は一緒に戻る'), ('S0017L03U05', 'she\'ll go back later', '彼女はあとで戻る'),
                  ('S0018L03U03', 'he\'ll go back this evening', '彼は今夜戻る'), ('S0020L02U03', 'he\'ll go back quickly', '彼は早く戻る')]:
    ed(rid, '彼は/彼女は + 戻りたい (a stated third person with -tai)', known=k, target=t, source=TG, conf='sure')
for rid, k, t in [('S0018L01U03', 'I want to meet everyone', 'みんなと会いたい'), ('S0018L01U04', 'I really want to meet', 'すごく会いたい'),
                  ('S0019L01U03', 'I don\'t want to stop tomorrow either', '明日もやめたくない'),
                  ('S0022L01U03', 'I want to meet people tomorrow', '明日人に会いたい'), ('S0022L01U05', 'I want to meet people quickly', '早く人に会いたい'),
                  ('S0034L01B02', 'don\'t want to be quiet today', '今日は静かにしたくない'), ('S0034L01B03', 'don\'t want to be quiet later', 'あとで静かにしたくない'),
                  ('S0034L01U01', 'I don\'t want to be quiet tonight', '今夜静かにしたくない'), ('S0034L01U02', 'I don\'t want to be quiet tomorrow either', '明日も静かにしたくない'),
                  ('S0035L01U02', 'I don\'t want to read today', '今日は読みたくない'), ('S0035L01U03', 'I don\'t want to read the sentence now', '今、文を読みたくない'),
                  ('S0035L02U03', 'I don\'t want to read anything today', '今日は何も読みたくない'), ('S0035L03U02', 'I don\'t want to read this afternoon', '今日の午後読みたくない'),
                  ('S0036L01U04', 'I don\'t want to interrupt today', '今日は邪魔したくない'),
                  ('S0265L01U05', 'I want to help my friend with something important', '大事なことで友だちを助けたい')]:
    ed(rid, 'stated third person (彼は/彼女は/友だちは) + -tai', known=k, target=t, source=TG, conf='sure')
ed('S0269L02U01', '母は … 待ちたくない: stated third person with -tai', known='I don\'t want to wait for two days', target='二日間待ちたくない', source=DBJG + '; the LEGO is 待ちたくない, so -たがらない would break containment (P17): the row moves to the first person instead', conf='sure')
de('S0019L01U04', '彼女はやめたくない (stated third person + -tai)', source=TG + '; no distinct first-person rewrite left in this basket (U01/U02/U05 cover it)')
# ---- F4 ----
UUN = 'うん is "yes"; casual "no" is ううん (大辞林 "ううん": 否定・不承知の返事; DBJG appendix on responses). Kept the canonical English and fixed the Japanese instead of the scan\'s "yes" + not-new + 12 deletes: the course has no other "no" before 309 ("nope | いや"), and ううん + positive answer to a negative question ("ううん、好き") is natural'
ed('SEED282', '"no" over うん (yes)', target='ううん、問題ない', source=UUN)
ed('S0282L01', 'LEGO "no | うん": うん means yes', target='ううん', source=UUN + '; presentation English unchanged, target clip re-voiced')
for rid in ['S0282L01B01', 'S0282L01B02', 'S0282L01B03', 'S0282L01U01', 'S0282L01U02', 'S0282L01U03', 'S0282L01U04', 'S0282L01U05', 'S0282L01U06', 'S0282L01U07', 'S0282L01U09', 'S0282L01U10']:
    cur = row_text(idx, rid)
    ed(rid, '"no, …" over うん、…', target=cur['target'].replace('うん', 'ううん', 1), source=UUN)
de('S0282L01U08', '"no, do you mind if I wait here?" is not a sensible answer in either language', source='meaning')
EXP = 'とは思ってなかった = "didn\'t think/expect that" (DBJG "to omou"; とは adds surprise). The canonical "didn\'t hope to wake" is also broken English (item 5 raises the same seed for eng_for_*); in jpn the Japanese decides it: "didn\'t expect to wake up"'
ed('SEED108', '"we didn\'t hope to wake…" over とは思ってなかった (didn\'t expect)', known='we didn\'t expect to wake up in the middle of the night', source=EXP)
ed('S0108L03', 'LEGO "didn\'t hope to" over とは思ってなかった', known='didn\'t expect to', source=EXP + '; presentation follows (O13)')
for rid, k in [('S0108L03B01', 'didn\'t expect to'), ('S0108L03B02', 'I didn\'t expect to do it'), ('S0108L03B03', 'I didn\'t expect to see it'),
               ('S0108L03B04', 'I didn\'t expect to know it'), ('S0108L03U03', 'I didn\'t expect to change my way of doing it'),
               ('S0108L03U05', 'I didn\'t expect to see what you were doing'), ('S0108L03U06', 'I didn\'t expect to find the answer'),
               ('S0108L03U07', 'that is why I didn\'t expect to feel happy'), ('S0108L03U08', 'we didn\'t expect to wake up in the middle of the night')]:
    ed(rid, 'row English follows the re-glossed LEGO (O12)', known=k, source=EXP)
ed('S0110L03', 'LEGO "to relax | 休みたい" drops the want', known='I\'d like to relax', source='L26 (the seed says "I\'d like to relax"); 休みたい = want to rest; presentation follows')
ed('S0110L03B01', 'bare LEGO copy follows its LEGO', known='I\'d like to relax', source='O12')
ed('S0092L02', 'LEGO "keep on doing | 続けたい" drops the want', known='want to keep on doing', source='L26 (seed "I want to keep on doing a little more"); presentation follows')
ed('S0200L02', 'LEGO "make sure that | ようにしたい" drops the want', known='want to make sure', source='L26 (seed "…want to make sure that…"); presentation follows')
de('S0200L02U08', 'ようにしたい必要があるらしい is not Japanese (-tai form before 必要がある)', source='DBJG "-tai" (a -tai adjective cannot head 必要がある)')
ed('S0005L02', 'LEGO "with other people | 他の人とも": も is "too"', known='with other people too', source='L26 (seed "…with other people too"); DBJG "mo"; presentation follows')
ed('S0040L01', '"what kind of feeling" is not English', known='how do you feel', source='L26 (seed "how do you feel at the moment?"); presentation follows')
ed('S0040L01B01', '"what kind of feeling now" is not English (and "how do you feel now" would copy U01)', known='how does he feel now?', target='彼は今、どんな気分？', source='彼は S0016L03', conf='sure')
ed('S0040L01B02', 'as B01', known='how does he feel today?', target='彼は今日はどんな気分？', source='彼は S0016L03', conf='sure')
ed('S0040L01B03', 'as B01', known='how does he feel this morning?', target='彼は今朝はどんな気分？', source='今朝は from U05', conf='sure')
DONT = 'S0113L03 "I can\'t remember | 覚えてない" and S0057L01 "can\'t remember | 思い出せない": one English, two answers (P16/K22). 覚えてない = "don\'t remember" (stative -te iru of 覚える, DBJG "oboeru"); English follows the Japanese (precedent ce05e9f6), seed included so the LEGO still uses only the seed\'s words (L26)'
ed('SEED113', 'seed English "can\'t remember" over 覚えてない', known='why don\'t I remember what you said?', source=DONT)
ed('S0113L03', 'LEGO clashes with S0057L01', known='I don\'t remember', source=DONT + '; presentation follows')
for p in idx['S0113L03'][2]['phrases']:
    pid = p['id'].split(':')[-1] if ':' in p['id'] else None
    if pid and p['type'] in ('build', 'use') and "can't remember" in p['known']:
        ed(pid, 'row English follows the re-glossed LEGO (O12)', known=p['known'].replace("can't remember", "don't remember"), source=DONT)
ed('S0225L01', 'LEGO "if I could" in a seed about "he"', known='if he could', source='L26 (seed "he would give you an answer if he could"); できたら has no subject; presentation follows')
ed('S0225L01B01', 'bare LEGO copy follows its LEGO', known='if he could', source='O12')
HOSHII = DBJG + ' "-te hoshii": X-te hoshii = "I want (someone) to X"'
for rid in ['S0151L02U02', 'S0151L02U07', 'S0154L01U03', 'S0156L01U03']:
    de(rid, '"I was hoping to see you / we could…" over ～てほしかった, which means "I wanted you to…"', source=HOSHII)
for rid in ['S0107L02B03', 'S0107L02U02', 'S0107L02U07', 'S0107L02U08']:
    de(rid, '"hoped to see you | あなたを見たかった": 見る said of a person means "look at"; meeting someone is 会う', source='DBJG "miru"; Jisho/大辞林 見る vs 会う')
de('S0061L01U08', '"I want you to say that again" over a plain request もう一度言って', source='meaning (-te request, DBJG "-te kudasai"); the scan\'s English "say that again" would copy U02 exactly, so the row goes')
de('S0067L01B04', '"why do you want | なんで": the English says more than なんで', source='meaning')
de('S0121L01B03', '"I want the car | 車を": 車を is only "the car" (object)', source='meaning')
ed('S0258L01U04', 'English drops "what\'s" in a copy of the seed', known='what\'s that blue thing over there?', source='seed copy (P26): seed English; link the seed\'s own known clip, 0 chars')
# ---- F7 ----
ed('SEED41', 'two sentences in one seed row (。) where the English is one', target='大丈夫、でも、疲れてきてる', source='P20; same fix #421 proposed for 73/96/173/193')
ed('S0041L02U04', 'seed copy follows the seed', target='大丈夫、でも、疲れてきてる', source='P26', note='scan: "its copy S0041L02U04 takes the new clips"')
for rid in ['S0041L01B02', 'S0127L02U06', 'S0163L01U06', 'S0249L01U06', 'S0249L01U07', 'S0249L01U08']:
    de(rid, 'two sentences in one row (P20)', source='P20; as #434 deleted S0166L01U07')
write(C, E)
print('scope rows not covered:', [r for r in sc if r not in {e['row'] for e in E}])
