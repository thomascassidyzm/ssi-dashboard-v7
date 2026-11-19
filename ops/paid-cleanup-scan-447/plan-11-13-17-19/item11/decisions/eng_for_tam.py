#!/usr/bin/env python3
"""eng_for_tam item-11 decisions (basket does not drill its own LEGO), hand-authored per LEGO. PLAN ONLY.
Writes eng_for_tam.json for tools/plan.py. Verdicts: recut-small (LEGO shrinks to the piece its basket drills) ·
rebuild-rows (LEGO right; rows rewritten/deleted/back-filled) · keep (NOT-A-DEFECT or ALREADY-FIXED, said in why) ·
kai (HOLD, reason in why). Basket: 'k' keep, 'd' delete, (known, target) rebuild. add: ('b'|'u', known, target)."""
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


# In this course ENGLISH is the target (what the learner says) and Tamil is the known prompt.
# Basket entries are (Tamil prompt, English answer).
P17 = 'Rule: every practice phrase under a LEGO contains the whole LEGO, in exactly the taught form.'
FORM = P17 + ' One row changes the English form of the LEGO (another person, a question, a negative or another tense), so the learner is asked for words this LEGO did not teach. The row is reworded so its English says the LEGO exactly, and the Tamil prompt is changed to match. Nothing else in the basket moves.'
QUES = P17 + ' The LEGO is a direct question; these rows embed it ("tell me what you…", "I don\'t know how to…"), which changes the English word order and drops "do", so they no longer hold the LEGO. Each becomes the direct question with one extra taught word (today, now, tomorrow), Tamil to match.'
FRAG = P17 + ' Two build rows are fragments of the LEGO (each holds only half of it). A phrase may be a fragment of a sentence but never of its LEGO; both are reworded to hold all of it.'
O19 = 'HOLD: this LEGO is also on the over-8-syllables list (item 19), whose plan re-cuts it and re-homes every row. Planning the rows here as well would plan the same basket twice. '
TAM = ' (The plan tool lists reworded rows as "not containing the LEGO" on the Tamil side: the LEGO\'s Tamil is stored word-for-word in English order, and a natural Tamil prompt inflects and re-orders those words. Known-side inflection is allowed; read by hand.)'


def R(id, why, **b):
    D(id, 'rebuild-rows', ack=['known'], why=why + TAM, b=b)


R('S0025L04', FORM + ' (B02 said "I need to go now" under "have to go".)', B02=('இப்போது போக வேண்டும்', 'have to go now'))
R('S0098L01', FORM + ' (U01 said "I have to go now" under "should". Note for the walk: வேண்டும் is "have to" at seed 25 and "should" here; the new prompt is kept different from seed 25\'s rows so no single prompt has two answers.)',
  U01=('நான் இன்று போக வேண்டும்', 'I should go today'))
D('S0112L03', 'kai', why=O19 + 'For that cut: the LEGO "wasn\'t expecting it to be very interesting" is not what the seed says ("That was very interesting, and I wasn\'t expecting it"), and five rows say other things.')
R('S0115L03', FORM + ' (U05 "he doesn\'t feel…".) Not fixed here: the LEGO\'s own English, "don\'t feel as if ready", is not sound English; the seed says "don\'t feel as if I\'m ready".',
  U05=('அவர்கள் இன்று தயாராக என்று உணரவில்லை', "they don't feel as if ready today"))
R('S0120L02', FORM + ' (U06 "he likes…".)', U06=('அவர்கள் பேருந்தில் செல்ல விரும்புகிறார்கள்', 'they like to go by bus'))
R('S0121L03', FORM + ' (U05 "he doesn\'t…".) Not fixed here: the LEGO\'s English "don\'t use your car" has lost the seed\'s "like to".',
  U05=('அவர்கள் காரை பயன்படுத்த விரும்பவில்லை', "they don't use your car"))
R('S0123L02', FORM + ' (U06 "he thinks…".)', U06=('அது நல்ல யோசனை என்று அவர்கள் நினைக்கிறார்கள்', "they think that's a good idea"))
R('S0125L02', FORM + ' (U06 "he believes…".)', U06=('அவர்கள் இன்று நம்புகிறார்கள்', 'they believe today'))
D('S0125L03', 'kai', why=O19 + 'For that cut: the LEGO\'s English "believe that your idea very good" has lost the seed\'s "was"; U05 says "he believes".')
D('S0126L03', 'kai', why='HOLD: the LEGO "changes shape" is not the seed\'s words. The seed says "is changing the shape of my brain"; six of nine rows say "changes the shape of my brain" (neither the LEGO nor the seed). This needs the LEGO itself re-cut to the seed\'s words first ("is changing the shape of | வடிவத்தை மாற்றுகிறது" is the likely piece), which is the "LEGO says what its seed does not" family; the rows then take "is changing the shape of". Not planned twice here.')
R('S0129L02', FORM + ' (B03 and U01 both said "you\'re doing very well" under "doing so well"; they were also the same row twice.)',
  B03=('நீங்கள் இவ்வளவு நன்றாக செய்கிறீர்கள்', "you're doing so well"), U01=('நீங்கள் இன்று இவ்வளவு நன்றாக செய்கிறீர்கள்', "you're doing so well today"))
R('S0133L02', FORM + ' (U05 "he gets to know…".)', U05=('அவர்கள் யாரையாவது நன்றாக அறிவார்கள்', 'they get to know someone well'))
R('S0138L03', FORM + ' (U01 was a question "did my friend want…", U02 a negative "didn\'t want…".)',
  U01=('என் நண்பன் நம்மை சந்திக்க விரும்பினான் என்று நினைக்கிறேன்', 'I think my friend wanted to meet us'),
  U02=('என் நண்பன் நேற்று நம்மை சந்திக்க விரும்பினான்', 'my friend wanted to meet us yesterday'))
SEEDBAD = 'HOLD: KAI: the two sides of this SEED do not say the same thing, so no row under it can be judged. '
D('S0139L03', 'kai', why=SEEDBAD + 'Seed 139 English: "I\'m sorry that I need to leave so early". Tamil: "நான் சீக்கிரம் வந்துவிட்டேன், மன்னிக்கவும்" = "I came early, sorry". The LEGO "sorry I\'m early" follows the Tamil. A seed edit is your call.')
D('S0140L03', 'kai', why=SEEDBAD + 'Seed 140 English: "I\'m sorry that I can\'t see what you\'re trying to show me". Tamil: "நான் மிகவும் தாமதமாக வருவேன் என்று நினைத்தேன்" = "I thought I would be very late". The LEGO "thought going to be very late" follows the Tamil. A seed edit is your call.')
D('S0143L05', 'kai', why='HOLD (small): the LEGO\'s English is spelt "its the same thing as" (no apostrophe; the seed says "It\'s"). Two rows change its form (U03 a question, U04 "it\'s not"). The spelling should be put right on the LEGO and on every row in one pass, then U03 and U04 reworded to "it\'s the same thing as…"; fixing two rows to a mis-spelt LEGO would spread the typo.')
R('S0144L04', FORM + ' (U04 "she woke earlier than she wanted to…".)', U04=('ஆம், நான் இன்று காலை விரும்பியதை விட முன்பே எழுந்திரித்தேன்', 'yes, I woke earlier than I wanted to this morning'))
R('S0146L03', FORM + ' (U04 "did you try to fix it?".)', U04=('நீங்கள் அதை சரிசெய்ய முயன்றீர்கள்', 'you tried to fix it'))
R('S0147L04', FORM + ' (U05 "did she see me…?".)', U05=('அவள் நான் பதட்டமாக உணர்வதைக் கண்டாள் என்று நினைக்கிறேன்', 'I think she saw me feeling nervous'))
R('S0148L05', FORM + ' (U05 "was he patient when…?".)', U05=('நேற்று என்னால் பதில் சொல்ல முடியாத போது அவன் மிகவும் பொறுமையாக இல்லை', "he wasn't very patient when I couldn't answer yesterday"))
R('S0160L01', QUES, U01=('இந்த வார்த்தையை இப்போது எப்படி சொல்வீர்கள்?', 'how do you say this word now?'),
  U02=('இந்த வார்த்தையை நன்றாக எப்படி சொல்வீர்கள்?', 'how do you say this word well?'),
  U03=('இந்த வார்த்தையை இங்கே எப்படி சொல்வீர்கள்?', 'how do you say this word here?'),
  U04=('இந்த வார்த்தையை இன்று எப்படி சொல்வீர்கள்?', 'how do you say this word today?'))
R('S0162L01', QUES, U02=('அது பற்றி நீங்கள் இப்போது என்ன நினைக்கிறீர்கள்?', 'what do you think about that now?'),
  U03=('அது பற்றி நீங்கள் இன்று என்ன நினைக்கிறீர்கள்?', 'what do you think about that today?'))
R('S0163L01', FORM + ' (U02 "do you think…?", U04 "she thinks…". U01 "…it\'s very interesting" and U03 "I don\'t think…" keep every word of the LEGO in order with one word inside it, which is allowed, and stay.)',
  U02=('அது சுவாரஸ்யமானது என்று நான் இப்போது நினைக்கிறேன்', "I think that it's interesting now"),
  U04=('ஆம், அது சுவாரஸ்யமானது என்று நான் நினைக்கிறேன்', "yes, I think that it's interesting"), U01='k', U03='k')
D('S0166L01', 'kai', why=O19 + 'For that cut: three rows say his / her / your name under "my name is not very unusual".')
R('S0167L01', QUES, U01=('நீங்கள் இன்று என்ன செய்ய வேண்டும்?', 'what do you need to do today?'),
  U02=('நீங்கள் இப்போது என்ன செய்ய வேண்டும்?', 'what do you need to do now?'),
  U03=('நீங்கள் நாளை என்ன செய்ய வேண்டும்?', 'what do you need to do tomorrow?'))
R('S0169L01', QUES, U01=('நீங்கள் என்னை இன்று என்ன செய்ய விரும்புகிறீர்கள்?', 'what do you want me to do today?'),
  U02=('நீங்கள் என்னை இப்போது என்ன செய்ய விரும்புகிறீர்கள்?', 'what do you want me to do now?'))
R('S0170L01', FORM + ' (U02 "I want to know what you need" has no "tell me". U04 "tell me now what you need" keeps the LEGO with one word inside it and stays.)',
  U02=('உங்களுக்கு என்ன வேண்டும் என்று இன்று சொல்லுங்கள்', 'tell me what you need today'), U04='k')
R('S0175L01', QUES, U01=('நீங்கள் இன்று என்ன செய்ய விரும்புகிறீர்கள்?', 'what do you want to do today?'),
  U03=('நீங்கள் நாளை என்ன செய்ய விரும்புகிறீர்கள்?', 'what do you want to do tomorrow?'))
R('S0182L02', FORM + ' (U01 "where have you seen my keys?" drops "anywhere".)', U01=('நீங்கள் இன்று என் சாவிகளை எங்காவது பார்த்தீர்களா?', 'have you seen my keys anywhere today?'))
R('S0185L01', FORM + ' (U04 "where did you leave them?" under "left".)', U04=('நீங்கள் அவற்றை இங்கே விட்டீர்கள்', 'you left them here'))
R('S0185L02', FORM + ' (U03 "did I leave them at work?".)', U03=('நான் அவற்றை வேலையில் விட்டேன்', 'I left them at work'))
R('S0187L01', FORM + ' (U01 "are you happy so far?". U03 "I\'m very happy so far" keeps the LEGO with one word inside it and stays.)',
  U01=('ஆம், நான் இதுவரை மகிழ்ச்சியாக இருக்கிறேன்', "yes, I'm happy so far"), U03='k')
WHOLE = P17 + ' The LEGO is the whole seed sentence and three rows drop its first word. The short cut (shrink the LEGO to the piece the rows drill) would need two more LEGOs in a one-LEGO seed, each with its own new basket, to cover the words left over; rewording three rows is the smaller sound fix, so the LEGO stays.'
R('S0188L01', WHOLE + ' (Rows dropped "so".)', U01=('அதனால் நான் இன்று மாற வேண்டியதில்லை', "so I don't need to change today"),
  U02=('அதனால் நான் இப்போது மாற வேண்டியதில்லை', "so I don't need to change now"),
  U03=('ஆம், அதனால் நான் மாற வேண்டியதில்லை', "yes, so I don't need to change"))
R('S0189L01', WHOLE + ' (Rows dropped "yes".)', U01=('ஆம் அது இன்று ஒரு நல்ல யோசனை', "yes that's a good idea today"),
  U02=('ஆம் அது ஒரு நல்ல யோசனை என்று நினைக்கிறேன்', "yes that's a good idea, I think"),
  U03=('ஆம் அது இப்போது ஒரு நல்ல யோசனை', "yes that's a good idea now"))
R('S0191L01', FORM + ' (U04 "we don\'t mind at all". U01 "I don\'t mind it at all" keeps the LEGO with one word inside it and stays.)',
  U04=('இன்று எனக்கு எந்தப் பிரச்சனையும் இல்லை', "I don't mind at all today"), U01='k')
R('S0192L02', FORM + ' (U03 "are you busy…?", U04 "he is busy…".)', U03=('ஆம், நான் நாளை இரவு பிஸியாக இருக்கிறேன்', "yes, I'm busy tomorrow night"),
  U04=('நான் நாளை இரவு பிஸியாக இருக்கிறேன் என்று நினைக்கிறேன்', "I think I'm busy tomorrow night"))
R('S0194L01', QUES + ' (U01 "what exactly are you looking for?" keeps the LEGO with one word inside it and stays.)',
  U02=('நீங்கள் இன்று எதைத் தேடுகிறீர்கள்?', 'what are you looking for today?'),
  U04=('நீங்கள் இப்போது எதைத் தேடுகிறீர்கள்?', 'what are you looking for now?'),
  U05=('நீங்கள் இங்கே எதைத் தேடுகிறீர்கள்?', 'what are you looking for here?'), U01='k')
R('S0197L03', FORM + ' (U01 "your son works…".)', U01=('என் மகன் இங்கே ஆசிரியராக வேலை செய்கிறான்', 'my son works as a teacher here'))
R('S0201L01', FORM + ' (U05 said "what\'s", a different written word from the LEGO\'s "what".)', U05=('என்ன நடக்கும் என்று நாங்கள் தெரிந்துகொள்ள விரும்பினோம்', 'we wanted to know what is going to happen'))
R('S0203L01', P17 + ' One build row stops at "what would you do?" and drops "if I asked"; it is reworded to hold the whole LEGO.', B02=('நான் இன்று கேட்டால் என்ன செய்வீர்கள்?', 'what would you do if I asked today?'))
R('S0262L01', FRAG, B02=('நீங்கள் பேசிக்கொண்டிருந்த அந்த ஆண் யார்?', 'who was that man you were talking to?'),
  B03=('நீங்கள் இன்று பேசிக்கொண்டிருந்த அந்த ஆண்', 'that man you were talking to today'))
R('S0266L01', FRAG, B02=('என் அப்பாவின் ஒரு பழைய நண்பர்', 'an old friend of my father'), B03=('அவர் என் அப்பாவின் பழைய நண்பர்', 'he is an old friend of my father'))
R('S0276L01', FORM + ' (U05 "staying here…" under "stay here…".)', U05=('உங்களுடன் இன்னும் சிறிது நேரம் இங்கே இருக்க விரும்புகிறேன்', 'I want to stay here for a little longer with you'))
R('S0277L02', FRAG, B02=('அடுத்த வாரம் தொடக்கத்தில் ஒரு கூட்டம்', 'a meeting early next week'), B03=('அடுத்த வாரம் தொடக்கத்தில் ஒரு முக்கியமான கூட்டம்', 'an important meeting early next week'))
R('S0281L03', FRAG, B02=('நான் என் காபியை முடித்தால் பரவாயில்லையா?', 'do you mind if I finish my coffee?'), B03=('நான் இப்போது என் காபியை முடித்தால் பரவாயில்லையா?', 'do you mind if I finish my coffee now?'))
R('S0290L01', FRAG + ' A third row (U03) said "she knows" and is reworded too.', B02=('அவனுக்கு இப்போது பதில் தெரியுமா என்று ஆர்வம்', 'wonder if he knows the answer now'),
  B03=('அவனுக்கு இன்று பதில் தெரியுமா என்று ஆர்வம்', 'wonder if he knows the answer today'),
  U03=('அவனுக்கு இன்று பதில் தெரியுமா என்று எனக்கு ஆர்வம்', 'I wonder if he knows the answer today'))
R('S0293L01', FRAG, B02=('அவன் எங்கே சந்திக்கப் போகிறான் என்று கண்டுபிடிக்க வேண்டும்', "have to find out where he's going to meet"),
  B03=('அவன் எங்கே சந்திக்கப் போகிறான் என்று கண்டுபிடிக்க விரும்புகிறேன்', "I want to find out where he's going to meet"))
R('S0294L01', FRAG, B02=('அழைக்க போதுமான நேரம் இல்லை', 'not enough time to call'), B03=('இன்று அழைக்க போதுமான நேரம்', 'enough time to call today'))
R('S0299L02', FRAG + ' A third row (U05) was the question "can he pay half?" and is reworded too.', B02=('அவன் இன்று பாதி செலுத்த விரும்புகிறான்', 'he wants to pay half today'),
  B03=('அவன் பாதி செலுத்த விரும்புகிறான் என்று நினைக்கிறேன்', 'I think he wants to pay half'),
  U05=('அவன் இப்போது பாதி செலுத்த விரும்புகிறான்', 'he wants to pay half now'))

# Rows not named above are kept when their ENGLISH holds the LEGO's English word for word (checked here against today's
# live read, data/live/eng_for_tam.json). The plan tool cannot see that for itself in this course: it also wants the
# LEGO's Tamil, which is stored word-for-word in English order, inside each natural Tamil prompt.
import re
_live = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data', 'live', 'eng_for_tam.json')))
_n = lambda t: ' ' + re.sub(r'\s+', ' ', re.sub(r'[.,!?;:"]+', ' ', (t or '').lower().replace('’', "'"))).strip() + ' '
for d in OUT:
    if d['verdict'] == 'kai':
        continue
    lg = next(l for l in _live[str(int(d['id'][1:5]))]['legos'] if l['id'] == d['id'])
    for p in lg['phrases']:
        sid = p['id'].split(':')[-1][8:]
        if p['id'].startswith('eng_for_tam:') and sid not in d['basket'] and p['type'] in ('build', 'use') and _n(lg['target']) in _n(p['target']):
            d['basket'][sid] = 'keep'

json.dump({'course': 'eng_for_tam', 'legos': OUT}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'eng_for_tam.json'), 'w'), ensure_ascii=False, indent=1)
print(len(OUT), 'decisions')
