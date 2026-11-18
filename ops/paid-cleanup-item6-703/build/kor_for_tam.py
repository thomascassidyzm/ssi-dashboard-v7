import re, sys, os
sys.path.insert(0, os.path.dirname(__file__)); from common import *
C = 'kor_for_tam'
d, idx = index(C)
sc = {r['rid']: r['n'] for r in scope(C)}
SRC_REG = ('National Institute of Korean Language, 표준 언어 예절 (2011), ch. "자신을 가리키는 말": 저/제 is the speaker\'s '
           'humble self-reference to a listener addressed in 해요체/하십시오체; 나/내 is for 해체/해라체. Course-internal: '
           'kor_for_tam already teaches நானே|제가 (S0025L01), என் நண்பரைப் பற்றி|제 친구에 대해 (S0084L01), '
           'என்னுடைய நண்பர்|제 친구가 (S0138L02), என் நண்பர்|제 친구는 (S0199L01), என்னைத் தனியாக விட்டு|저를 혼자 두고 (S0351L01), '
           'என்னிடத்தில்|저에게 (S0238L01) — the 나/내 rows give the same Tamil a second Korean answer (P16/K10).')
MAP = [('내가', '제가'), ('나를', '저를'), ('나에게', '저에게'), ('내', '제')]
PAT = re.compile(r'(?<![가-힣])(내가|나를|나에게|내)(?=[\s,.?!]|$)')
def polite(t):
    return PAT.sub(lambda m: dict(MAP)[m.group(1)], t)
E = []
for s in d['seeds']:
    rows = [(f"SEED{s['n']}", s)] + [(l['id'], l) for l in s['legos']] + \
           [(p['id'].split(':')[-1], p) for l in s['legos'] for p in l['phrases'] if ':' in p['id']]
    for rid, o in rows:
        t = o['target'] or ''
        if PAT.search(t):
            E.append(entry(idx, C, rid, 'plain 나/내 self-reference in a 해요체 sentence of a 저/제 course; the same Tamil already maps to 저/제 elsewhere (ZUT, register K10/S12)',
                           'edit', {'known': o['known'], 'target': polite(t)}, SRC_REG, 'sure', sc.get(rid),
                           note='' if rid in sc else 'not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)'))
# judgement rows
E.append(entry(idx, C, 'S0642L01', 'scan: மேடம் glossed 선생님 (sir/teacher)', 'keep',
    None, '선생님 is the standard gender-neutral honorific address for an adult one is being polite to (NIKL 표준 언어 예절, 호칭: 선생님 used for any respected adult; Korean Wiktionary 선생님 sense 3). One Korean form for both "sir" and "madam" is not a clash (Kai 12 Nov: one target, many known is fine); seeds 643/650/651 use it the same way.',
    'likely', sc.get('S0642L01'), note='only U04 is changed (below)'))
E.append(entry(idx, C, 'S0642L01U04', 'USE row drops 선생님, so it does not contain its LEGO 어때요 선생님 (P17)', 'delete', None, 'canon P17', 'sure', None, note='part of scan row S0642L01'))
E.append(entry(idx, C, 'S0666L01', 'LEGO known says எப்படி ("how"), which the seed does not say; the seed says என்ன (L26)', 'edit',
    {'known': 'நீங்கள் அனைவரும் என்ன', 'target': '여러분 어떻게'}, 'canon L26 (LEGO only carries words its own seed says); 어떻게 생각하세요 = "what do you think" (NIKL 표준국어대사전 어떻게; the idiom answers என்ன நினைக்கிறீர்கள், as S0162L01 already teaches)', 'sure', sc.get('S0666L01')))
lego = idx['S0666L01'][2]
for p in lego['phrases']:
    pid = p['id'].split(':')[-1] if ':' in p['id'] else None
    if pid and p['type'] == 'build' and 'அனைவரும் எப்படி' in p['known']:
        E.append(entry(idx, C, pid, 'BUILD row repeats the LEGO\'s wrong known gloss', 'edit', {'known': p['known'].replace('அனைவரும் எப்படி', 'நீங்கள் அனைவரும் என்ன'), 'target': p['target']}, 'follows S0666L01 (O12)', 'sure', None))
E.append(entry(idx, C, 'S0666L01U03', 'USE row drops 어떻게, so it does not contain its LEGO (P17)', 'delete', None, 'canon P17', 'sure', None))
E.append(entry(idx, C, 'S0354L01U01', 'Korean drops "angry" and the subject the Tamil says (அவர் கோபமாக): wrong meaning', 'delete', None, 'meaning check; 화난 것처럼 is taught by S0354L02 after this basket, so it cannot be added here (P1)', 'sure', sc.get('S0354L01U01')))
E.append(entry(idx, C, 'S0038L01U02', 'USE row: சுமார் ஆறு மணிக்கு | 약 6시에, while LEGO S0454L02 teaches the same Tamil as 6시쯤 (one known, two targets, P16)', 'delete', None, 'canon P16', 'sure', sc.get('S0038L01U02'), note='basket USE floor drops to 4 (warn-only, P23): nothing taught by seed 38 can follow 약 except the six-o\'clock that clashes, and the other four USE rows of this basket are generator filler outside item 6')) 
E.append(entry(idx, C, 'S0651L01U03', 'USE row நீங்கள் என்ன நினைக்கிறீர்கள் | 어떻게 생각하세요 vs LEGO S0162L01 same Tamil | 어떻게 생각해요 (P16)', 'edit',
    {'known': 'அதைப் பற்றி நீங்கள் என்ன நினைக்கிறீர்கள் மேடம்', 'target': '그것에 대해 어떻게 생각하세요, 선생님'},
    'canon P16; rewritten rather than deleted to hold the USE floor (5). Words: அதைப் பற்றி|그것에 대해 S0037L02, 선생님 S0642L01, 어떻게 생각하세요 this seed. Address keeps it apart from S0162L01.', 'sure', sc.get('S0651L01U03')))
E.append(entry(idx, C, 'S0077L03U01', 'USE row is a fragment ("quickly know") and not a sentence (P7: fragments only as BUILD)', 'edit',
    {'known': 'எவ்வளவு விரைவாக என்று தெரியவில்லை', 'target': '얼마나 빠른지 모르겠어요'},
    'canon P7; rewritten rather than deleted to hold the USE floor. 얼마나 빠른지 모르겠어요 = "I don\'t know how fast (it is)" (얼마나 + -(으)ㄴ지 indirect question, NIKL 표준국어대사전 -ㄴ지). Words: எவ்வளவு|얼마나 S0033L01, தெரியவில்லை|모르겠어요 S0010L04.', 'likely', sc.get('S0077L03U01')))
write(C, E)
missing = [r for r in sc if r not in {e['row'] for e in E}]
print('scope rows not covered:', missing)
