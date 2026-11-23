import sys, os
sys.path.insert(0, os.path.dirname(__file__)); from common import *
C = 'kor_for_hin'
d, idx = index(C)
sc = {r['rid']: r['n'] for r in scope(C)}
E = []
def ed(rid, defect, known=None, target=None, source='', conf='sure', note=''):
    cur = row_text(idx, rid)
    E.append(entry(idx, C, rid, defect, 'edit', {'known': known if known is not None else cur['known'], 'target': target if target is not None else cur['target']}, source, conf, sc.get(rid), note))
def de(rid, defect, source='', conf='sure', note=''):
    E.append(entry(idx, C, rid, defect, 'delete', None, source, conf, sc.get(rid), note))
def hold(rid, defect, why):
    E.append(entry(idx, C, rid, defect, 'hold', None, why, 'n/a', sc.get(rid)))

SIP = ('-고 싶어 하다 reports another person\'s wish; the speaker\'s own (and "we") wish is -고 싶다 (NIKL 표준국어대사전 "싶다" 보조형용사 and "-어 하다"; '
       'Korean Grammar in Use Beginner, unit "-고 싶다/-고 싶어 하다"). Course-internal: kor_for_hin already teaches चाहता था | 싶었어요 (S0030L03), '
       'and each seed\'s own seed-copy row (U01) already says 싶었어요.')
# --- K: first-person 싶어했어요 (seeds 107, 201 in scan; 54 found by sweep) ---
ed('SEED54', 'seed says 우리는 … 주고 싶어했어요 ("we" with the third-person wish form); its own seed copy U01 already says 싶었어요', target='우리는 당신에게 시간을 조금 더 주고 싶었어요.', source=SIP, note='not in the scan list; same defect found by the course-wide sweep (R0.4)')
ed('SEED107', 'seed: 우리는 … 보고 싶어했어요 (third-person wish form for "we")', target='우리는 당신이 무엇을 하고 있는지 보고 싶었어요.', source=SIP, note='scan row S0107L03 (seed + LEGO)')
ed('S0107L03', 'LEGO देखना चाहते थे | 보고 싶어했어요: "we wanted" in this seed', target='보고 싶었어요', source=SIP)
ed('S0107L03B01', 'BUILD follows its LEGO (P17/O12)', target='보고 싶었어요', source='O12')
ed('S0107L03B02', 'BUILD follows its LEGO (P17/O12)', target='이것을 보고 싶었어요', source='O12')
ed('S0107L03B03', 'BUILD follows its LEGO (P17/O12)', target='당신을 보고 싶었어요', source='O12')
ed('S0107L03U02', 'third-person row would no longer contain the LEGO (P17); rewritten in the seed\'s own person', known='हम आपको देखना चाहते थे', target='우리는 당신을 보고 싶었어요', source='P17; words: हम|우리는, आपको|당신을 already in this basket', conf='sure')
ed('S0107L03U04', 'bracket label (स्त्री) in the Hindi (K11) and a third-person row that no longer contains the LEGO (P17)', known='हम कल आपको देखना चाहते थे', target='우리는 어제 당신을 보고 싶었어요', source='K11, P17; कल|어제 taught S0030L01 (its component tile is fixed below)', conf='sure')
ed('S0107L03U05', 'third-person row would no longer contain the LEGO (P17)', known='हम आज यह देखना चाहते थे', target='우리는 오늘 이것을 보고 싶었어요', source='P17; आज|오늘, यह|이것을 in this basket', conf='sure')
ed('SEED201', 'seed: 우리는 … 알고 싶어했어요 (third-person wish form for "we")', target='우리는 무슨 일이 일어날지 알고 싶었어요.', source=SIP, note='scan row S0201L01 (seed + LEGO)')
ed('S0201L01', 'LEGO जानना चाहते थे | 알고 싶어했어요: "we wanted" in this seed', target='알고 싶었어요', source=SIP)
ed('S0201L01C02', 'component follows the LEGO', target='싶었어요', source='O13 (components move with the LEGO)')
ed('S0201L01B01', 'BUILD follows its LEGO', target='알고 싶었어요', source='O12')
ed('S0201L01B02', 'BUILD follows its LEGO', target='그것을 알고 싶었어요', source='O12')
ed('S0201L01B03', 'BUILD follows its LEGO; and सच ("truth") over 무엇을 ("what") is a wrong gloss', known='क्या जानना चाहते थे', target='무엇을 알고 싶었어요', source='O12; meaning', conf='sure')
ed('S0201L01U03', 'third-person row would no longer contain the LEGO (P17)', known='हम कल जानना चाहते थे कि क्या होने वाला है', target='우리는 어제 무슨 일이 일어날지 알고 싶었어요', source='P17; कल|어제 S0030L01', conf='sure')
ed('S0201L01U05', 'third-person row would no longer contain the LEGO (P17)', known='हम उसका नाम जानना चाहते थे', target='우리는 그의 이름을 알고 싶었어요', source='P17; उसका नाम|그의 이름을 S0020L04', conf='sure')

# --- D: bracket labels (K11) ---
WHY21 = ('Dropping "(स्त्री)" here recreates the clash it was hiding (O4): Hindi उसका does not mark the owner\'s gender, and S0020L04 already teaches '
         'उसका नाम | 그의 이름을 ("his name"); B01–B03 are bare fragments with no context, so "उसका (नाम)" would have two answers (P8/K22). '
         'The canon remedy (K23: keep both, explain the sense in a hand-authored presentation, PR1/PR2) means authoring a Hindi presentation line for a Korean LEGO, '
         'which is a presentation-design call this pass should not make on its own. Left as is and listed.')
for r in ['S0021L02', 'S0021L02B01', 'S0021L02B02', 'S0021L02B03']:
    hold(r, 'gender label in brackets in the Hindi (K11)', WHY21)
ed('S0096L02U04', 'bracket label (K11); वह … तैयार नहीं है does not show gender, so without the label it would match U03 (→ 그는)', known='वह अभी तैयार नहीं हुई है', source='K11; Hindi perfective हुई agrees with a feminine subject (McGregor, Outline of Hindi Grammar §perfective participle); K6 lets the known side use a form of a taught verb', conf='likely')
ed('S0096L05U05', 'bracket label (K11); उसे … चाहिए cannot show gender in Hindi, and without it the row equals U03 (उसे … | 그는 …)', known='क्या आपको आज थोड़ा और समय चाहिए?', target='오늘 시간이 조금 더 필요해요?', source='K11; rewritten instead of deleted to hold the USE floor. Korean drops the "you" subject in a question (NIKL 표준국어문법론 주어 생략); words are this basket\'s own', conf='likely')
ed('S0102L02U05', 'bracket label (K11); कहती already shows "she"', known='वह कहती है कि यह ऐसा नहीं है', source='K11', conf='sure')
ed('S0110L01U04', 'bracket label (K11); मेरी दोस्त already shows "she"', known='वह मेरी दोस्त है', source='K11', conf='sure')
de('S0128L02U03', 'bracket label (K11); "वह अच्छे इंसान की तरह है" cannot show gender, and without it the row equals U02 (→ 그는)', source='K11/O4', note='USE floor 5 → 4 (warn-only, P23)')
de('S0128L04U05', 'bracket label (K11); वह … जानता था cannot show the subject\'s gender, and without it the row equals U04 (→ 그는)', source='K11/O4; a rewrite with 제 친구는 fails the vocabulary gate (친구는 untaught)', note='USE floor 5 → 4 (warn-only, P23)')
ed('S0017L03C01', 'component tile carries a bracket label (K11)', known='वह', source='K11 (components are tiles, never prompted — K22 — so no clash)', note='not in the scan list; same defect found by the course-wide sweep')
ed('S0030L01C01', 'component tile carries a bracket label "(बीता)" (K11)', known='कल', source='K11; the LEGO itself (कल आपसे | 어제 당신에게) is unlabelled', note='not in the scan list; found by sweep')

# --- H: wrong Korean ---
ed('S0152L01U01', 'Hindi says "want to learn", Korean 배우려고 해요 says "trying to learn"', known='आप क्या सीखने की कोशिश कर रहे हैं?', target='당신이 무엇을 배우려고 해요?', source='meaning; सीखने की कोशिश कर रहा हूँ | 배우려고 해요 is S0002L02; rewritten instead of deleted to hold the floor', conf='likely')
ed('S0156L02U02', '어디서 + 가다 is wrong: 어디서 marks where an action happens; a destination is 어디(에)', target='어디 가고 싶어요?', source='NIKL 표준국어대사전 "에서" (장소) vs "에" (도착점); 어디 met in S0070L02 어디 있는지 (P2: a word met inside a chunk may be used)', conf='sure')
ed('S0655L02U02', 'row in the formal sir/madam block (seed 655: 것 같습니다, 선생님) with no address in the Hindi: no visible register signal (K10)', known='मुझे लगता है कि आप सच में अच्छा कर रही हैं, श्रीमती', target='정말 잘하고 계신 것 같습니다, 선생님', source='K10 rule 1; the scan proposed 같아요, but the LEGO is 것 같습니다 and that would break containment (P17); श्रीमती|선생님 is the seed\'s own', conf='sure')
ed('S0196L03B01', '최신 들었어요 is not Korean (bare 최신 "latest" as object)', known='अभी सबसे नया विचार सुना है', target='지금 최신 아이디어를 들었어요', source='meaning; words are the seed\'s own (최신 아이디어를); rewritten to keep BUILD floor 3', conf='sure')
write(C, E)
print('scope rows not covered:', [r for r in sc if r not in {e['row'] for e in E}])
