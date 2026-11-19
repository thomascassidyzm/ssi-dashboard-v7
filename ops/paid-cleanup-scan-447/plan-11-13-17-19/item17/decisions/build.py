#!/usr/bin/env python3
"""Item 17 (gapped LEGOs) — hand-authored decisions, cs #784·AI. Writes decisions/<course>.json (schema: tools/plan.py).
Patterns: A = dots written in the prompt, remove them (the prompt is complete without); B = the gap cannot close, grow both
sides to the seed's own verb/noun (L22, L2 'the other side grows too'); C = the taught side itself skips seed words, re-cut to
contiguous seed pieces; D = Korean subject…verb LEGO that wraps the middle of its seed, split into contiguous pieces.
PLAN ONLY. usage: python3 -I build.py"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
D = {}
def add(course, **d): D.setdefault(course, []).append(d)
A = "PATTERN A. The prompt was written with dots in it; a prompt with a hole cannot be read out (L32 'absolutely no gapped LEGOs'; L22 'a label containing a gap … is a no-go'). Without the dots it is a complete phrase, and the rows already say it that way. Text only: the LEGO and its bare build row. POV pass: "
B = "PATTERN B. The gap cannot simply close: this prompt is not sayable without a verb. L22: 'a bound element that cannot stand alone grows to the verb IN ITS OWN SEED'; L2: 'when one side can't be broken down, the other side follows and grows as well'. Both sides grow to the seed's own word. POV pass: "
C = "PATTERN C. The taught side itself skips words of the seed, so the LEGO is not a piece of its seed (L32; L26 'a LEGO may contain only words its own seed says'). Re-cut to contiguous pieces of the seed. POV pass: "
Dp = "PATTERN D. The LEGO is two pieces of the seed with other seed words between them. Split into contiguous pieces (Kai 17 Nov shortest cut; Kai 12 Nov 'every seed part is a LEGO … parts taught earlier still appear, marked not-new'). POV pass: "

# ---------------- eng_for_ben (English is the target; Bengali is the prompt)
c = 'eng_for_ben'
for lid, k, t in (('S0534L02', 'চলো বাইরে না যাই', "let's not go outside"), ('S0547L02', 'কারণ সে খেলছিল', 'because he has been playing'),
                  ('S0549L02', 'আমাকে থাকতে হবে', 'I have got to be'), ('S0557L02', 'চাই তারা না বাজাক', "wish they wouldn't play"),
                  ('S0589L02', 'আমাকে বলল সে এইমাত্র দেখেছে', "told me she'd just seen"), ('S0616L01', 'তুমি মনে করেছিলে', 'you thought')):
    add(c, id=lid, verdict='regloss', pattern='A', known=k, basket={'B01': [k, t]}, ack=['thin'],
        why=A + "precedent eng_for_hin, same seed, gap-free (e.g. S0534L01 'चलो बाहर न जाएँ | let's not go outside'). The basket's filler rows ('… now', '… today') are the thin-basket family (item 20), not touched here.")
add(c, id='S0626L02', verdict='regloss', pattern='A', ack=['target'], known='না ধন্যবাদ', is_new=False, basket={'B01': ['না ধন্যবাদ', 'no thank you'], 'U01': 'del'},
    why=A + "BUT without the dots this is exactly S0173L01 'না ধন্যবাদ | no thank you' (taught NEW at seed 173). L27: 'a LEGO that grows into one that already exists is a duplicate and is introduced once' → not-new. P25: a not-new LEGO's basket is never played, so the seed sentence row moves under S0626L01 'not thirsty' (P26: every seed sentence sits in a played basket). Its other 4 rows go dark (2 are filler). Belongs with the duplicate-LEGO family too.",
    closes=['dup'])
add(c, id='S0626L01', verdict='regloss', why="neighbour of S0626L02: receives the seed sentence row (P26), reusing the seed's clips.",
    add=[['u', 'না, আমার তৃষ্ণা নেই, ধন্যবাদ।', "no I'm not thirsty thank you"]])
add(c, id='S0599L02', verdict='grow', pattern='B', known='খুশিমনে গাড়ি চালাতাম', target="I'd have been happy to drive", type='M',
    components=[['খুশিমনে', 'happy'], ['গাড়ি চালাতাম', 'to drive']],
    basket={'B01': ['খুশিমনে গাড়ি চালাতাম', "I'd have been happy to drive"], 'B02': ['আজ খুশিমনে গাড়ি চালাতাম', "I'd have been happy to drive today"],
            'B03': ['গতকাল খুশিমনে গাড়ি চালাতাম', "I'd have been happy to drive yesterday"], 'U01': 'keep',
            'U02': ['আমরা জানি আমি খুশিমনে গাড়ি চালাতাম।', "we know I'd have been happy to drive"], 'U03': ['সে বলেছিল আমি খুশিমনে গাড়ি চালাতাম।', "she said I'd have been happy to drive"],
            'U04': ['আমার বাবা জানেন আমি খুশিমনে গাড়ি চালাতাম।', "my father knows I'd have been happy to drive"], 'U05': ['আমি জানি আমি খুশিমনে গাড়ি চালাতাম।', "I know I'd have been happy to drive"]},
    why=B + "the Bengali says 'happily … would-drive' with the verb inside, so 'I'd have been happy to' has no Bengali of its own. Precedent: the canon's own worked case for this seed in Italian (L27: 'I think we can just grow it to happy to drive, right?' — Kai) . 7 syllables, kept at 7 because the Bengali cannot be split between 'happy' and 'drive'. S0599L01 'to drive' is taught first (L13). 7 of 8 rows said '…happy to' with no verb and are rebuilt to carry 'drive'.")
add(c, id='S0608L03', verdict='recut', pattern='C', known='এটাই হত', target='it would have been', type='M', components=[['এটাই', 'it'], ['হত', 'would have been']],
    basket={'B01': ['এটাই হত', 'it would have been'], 'B02': ['এটাই বুদ্ধিমানের কাজ হত', 'it would have been the sensible thing'],
            'B03': ['এটাই করার বুদ্ধিমানের কাজ হত', 'it would have been the sensible thing to do'], 'U01': 'keep',
            'U04': ['আমার বাবা জানেন এটাই বুদ্ধিমানের কাজ হত।', 'my father knows it would have been the sensible thing'],
            'U05': ['আমি জানি এটাই বুদ্ধিমানের কাজ হত।', 'I know it would have been the sensible thing']},
    add=[['u', 'সে বলেছিল এটাই বুদ্ধিমানের কাজ হত।', 'she said it would have been the sensible thing'], ['u', 'আমরা জানি এটাই করার বুদ্ধিমানের কাজ হত।', 'we know it would have been the sensible thing to do']],
    why=C + "'would have been the thing' skips 'sensible' and leaves 'It' untaught. New cut 'it would have been | এটাই হত' (5 syllables) is a contiguous piece of the seed and covers 'It'; 'the sensible thing' stays with S0608L02, taught before it. Precedent eng_for_hin S0608 (one gap-free LEGO). Rows like 'my father knows would have been the thing' are rebuilt.")
add(c, id='S0615L02', verdict='recut', pattern='C', known='তুমি খুব সাহসী ছিলে', target='you were very brave', type='M', components=[['তুমি', 'you'], ['খুব সাহসী', 'very brave'], ['ছিলে', 'were']],
    basket={'B01': ['তুমি খুব সাহসী ছিলে', 'you were very brave'], 'B03': ['আজ তুমি খুব সাহসী ছিলে', 'you were very brave today'], 'U01': 'keep',
            'U02': ['আমরা জানি তুমি খুব সাহসী ছিলে।', 'we know you were very brave'], 'U03': ['সে বলেছিল তুমি খুব সাহসী ছিলে।', 'she said you were very brave'],
            'U04': ['আমার বাবা জানেন তুমি খুব সাহসী ছিলে।', 'my father knows you were very brave'], 'U05': ['আমি মনে করতাম তুমি খুব সাহসী ছিলে।', 'I thought you were very brave']},
    add=[['b', 'গতকাল তুমি খুব সাহসী ছিলে', 'you were very brave yesterday'], ['b', 'আমি জানি তুমি খুব সাহসী ছিলে', 'I know you were very brave']],
    extra=[{'op': 'lego.insert', 'row': {'seed_number': 615, 'lego_index': 3, 'known_text': 'এটা বলতে', 'target_text': 'to say that', 'type': 'M', 'is_new': True,
                                        'components': [{'known': 'এটা', 'target': 'that'}, {'known': 'বলতে', 'target': 'to say'}]}},
           {'op': 'lego.insert', 'row': {'seed_number': 615, 'lego_index': 4, 'known_text': 'মনে করতাম', 'target_text': 'I thought', 'type': 'M', 'is_new': False,
                                        'components': [{'known': 'মনে করতাম', 'target': 'I thought'}]}}] +
          [{'op': 'phrase.insert', 'row': {'id': f'eng_for_ben:S0615L03{r}{i:02d}', 'course_code': 'eng_for_ben', 'seed_number': 615, 'lego_index': 3, 'known_text': k, 'target_text': t,
                                          'phrase_role': 'build' if r == 'B' else 'use', 'position': p, 'word_count': len(t.split()), 'lego_count': 1}}
           for p, (r, i, k, t) in enumerate([('B', 1, 'এটা বলতে', 'to say that'), ('B', 2, 'এটা বলতে সাহসী', 'brave to say that'), ('B', 3, 'এটা বলতে খুব সাহসী', 'very brave to say that'), ('B', 4, 'তুমি এটা বলতে সাহসী ছিলে', 'you were brave to say that'),
                                            ('U', 1, 'তুমি এটা বলতে খুব সাহসী ছিলে।', 'you were very brave to say that'), ('U', 2, 'আমি মনে করতাম তুমি এটা বলতে খুব সাহসী ছিলে।', 'I thought you were very brave to say that'),
                                            ('U', 3, 'আমি এটা বলতে চাই।', 'I want to say that'), ('U', 4, 'আমি এটা বলতে চাইনি।', "I didn't want to say that"), ('U', 5, 'আমি এটা বলতে চেষ্টা করছি।', "I'm trying to say that")], 1)],
    why=C + "'I thought you were to say that' skips 'very brave' on the English side and is not something anyone says. Re-cut exactly as eng_for_hin cut the same seed (S0615L01 'you were very brave', S0615L02 'to say that'): this LEGO becomes 'you were very brave | তুমি খুব সাহসী ছিলে'; a NEW LEGO 'to say that | এটা বলতে' is added with its own basket; 'I thought | মনে করতাম' is added NOT-NEW (it is S0247L01). STRUCTURAL: two LEGO inserts, so the apply needs Kai's go. Rows such as 'we know I thought you were to say that' are rebuilt.")
add(c, id='S0630L01', verdict='recut', pattern='C', known='আমি কি পারি', target='can I', type='M', components=[['আমি', 'I'], ['কি পারি', 'can']],
    basket={'B01': ['আমি কি পারি?', 'can I?'], 'B02': ['আমি কি জিজ্ঞেস করতে পারি?', 'can I ask?'], 'B03': ['আমি কি এখন জিজ্ঞেস করতে পারি?', 'can I ask now?']},
    add=[['u', 'আমি কি তোমাকে কিছু জিজ্ঞেস করতে পারি?', 'can I ask you something?'], ['u', 'আমি কি এখন যেতে পারি?', 'can I go now?'],
         ['u', 'আমি কি তোমার সাথে কথা বলতে পারি?', 'can I speak with you?'], ['u', 'আমি কি তোমাকে সাহায্য করতে পারি?', 'can I help you?'], ['u', 'আমি কি আজ চেষ্টা করতে পারি?', 'can I try today?']],
    why=C + "two faults in one LEGO: the prompt has dots, and the English says 'could I have' where the seed says 'Can I have' (L26). The Bengali seed has no word for 'have' (it says 'can I please drink something'), so 'have' cannot sit with 'can I'. Shortest cut: 'can I | আমি কি পারি' (complete Bengali, both sides the seed's words), and S0630L02 takes 'have'. Precedent: eng_for_ben S0119L02 'can I ask'. The 3 rows ('could I have now?') are rebuilt and 5 use rows back-filled.",
    closes=['10'])
add(c, id='S0630L02', verdict='regloss', pattern='C', ack=['thin'], target='have something to drink please',
    basket={'B01': ['দয়া করে কিছু পান করতে', 'have something to drink please'], 'B02': ['এখন দয়া করে কিছু পান করতে', 'have something to drink please now'],
            'B03': ['আজ দয়া করে কিছু পান করতে', 'have something to drink please today'], 'U01': ['আমি কি দয়া করে কিছু পান করতে পারি?', 'can I have something to drink please?']},
    why="neighbour of S0630L01: takes the seed's 'have' so every English word of the seed is covered (S3 'every part of the seed is covered by a LEGO'); its seed-sentence row is corrected from 'could I have…' to the seed's 'can I have…'. 7 syllables, kept at 7: 'have' has no Bengali of its own to stand on.")

# ---------------- eng_for_urd
c = 'eng_for_urd'
add(c, id='S0080L01', verdict='regloss', pattern='A', known='میں ہوں گا', basket={'B01': ['میں ہوں گا', "I'll be"]}, why=A + "'میں ہوں گا' is complete Urdu. Precedent: the rows of this basket.")
add(c, id='S0119L02', verdict='grow', pattern='B', known='کیا میں پوچھ سکتا ہوں', target='can I ask', type='M', components=[['میں', 'I'], ['پوچھ', 'ask'], ['سکتا ہوں', 'can']],
    basket={'B01': ['کیا میں پوچھ سکتا ہوں', 'can I ask'], 'B02': ['کیا میں ابھی پوچھ سکتا ہوں؟', 'can I ask now?'], 'B03': ['کیا میں آپ سے پوچھ سکتا ہوں؟', 'can I ask you?'],
            'B04': ['کیا میں آج پوچھ سکتا ہوں؟', 'can I ask today?'], 'U01': 'keep', 'U02': ['کیا میں آپ سے کچھ پوچھ سکتا ہوں؟', 'can I ask you something?'], 'U03': 'keep', 'U04': 'keep', 'U05': 'keep'},
    why=B + "Urdu 'کیا میں … سکتا ہوں' cannot be said without its verb. Precedent: eng_for_hin S0119L01 'can I ask' and eng_for_ben S0119L02 'can I ask', same seed. 'to ask' was taught at seed 30. Two rows said 'can I leave' and one row was a twin of another; those three are rewritten around 'can I ask'.")

# ---------------- eng_for_mar
c = 'eng_for_mar'
add(c, id='S0014L02', verdict='grow', pattern='B', known='तुम्ही बोलता का', target='do you speak', type='M', components=[['तुम्ही', 'you'], ['बोलता', 'speak'], ['का', 'do']],
    basket={'B01': ['तुम्ही बोलता का', 'do you speak']},
    why=B + "Marathi 'तुम्ही … का' without a verb reads 'why you?'. Precedent: eng_for_hin S0014L02 'क्या आप बोलते हैं | do you speak', eng_for_deu S0014L01 'sprichst du | do you speak'. Every other row of the basket already says 'do you speak …', so all rows stay.")
add(c, id='S0485L03', verdict='recut', pattern='C', ack=['known'], known='जास्त आनंदी', target='happier', type='A', components=[],
    basket={'B01': ['जास्त आनंदी', 'happier'], 'B02': 'keep', 'B03': 'keep', 'B04': 'keep', 'U01': 'keep', 'U02': 'keep', 'U03': 'keep', 'U04': 'keep', 'U05': 'keep'},
    why=C + "Marathi 'than' is an ending on the word before it (-पेक्षा), so 'happier than' can only be written with a hole. Shortest cut: 'happier | जास्त आनंदी'. 'than' was taught at seed 117 (S0117L02) and 'to get away' is S0485L01, so 'happier than to get away' is built from taught pieces and needs no LEGO of its own (L30) — the basket already drills it. All 10 other rows stay.")

# ---------------- eng_for_tel
add('eng_for_tel', id='S0614L02', verdict='grow', pattern='C', known='నీ కుటుంబం నివసించే చోటికి', target='where your family live', type='M',
    components=[['నీ కుటుంబం', 'your family'], ['నివసించే', 'live'], ['చోటికి', 'where']],
    basket={'B01': ['నీ కుటుంబం నివసించే చోటికి', 'where your family live'], 'B02': ['ఇప్పుడు నీ కుటుంబం నివసించే చోటికి', 'where your family live now'],
            'B03': ['అక్కడ నీ కుటుంబం నివసించే చోటికి', 'over there where your family live'], 'U01': 'keep', 'U02': 'keep', 'U03': 'keep', 'U05': 'keep'},
    why=C + "here the ENGLISH has the hole ('where … live'). L32: 'teach the middle pieces first, then … the whole thing (frame + middle) as one LEGO'. The middle 'your family' is S0614L01, taught just before, so this becomes 'where your family live' (5 syllables). All four use rows already say exactly that.")

# ---------------- eng_for_spa / eng_for_deu / eng_for_zho  (pattern A)
add('eng_for_spa', id='S0014L02', verdict='regloss', pattern='A', known='¿hablas?', target='do you speak?', ack=['known'],
    why=A + "dots on both sides. Precedent eng_for_deu S0014L01 'sprichst du | do you speak', eng_for_ita S0014L02 'parli? | do you speak?'. Rows unchanged.")
add('eng_for_spa', id='S0032L01', verdict='regloss', pattern='A', known='¿querías?', target='did you want?', ack=['known'], basket={'B01': ['¿querías?', 'did you want?']},
    why=A + "dots on both sides. Precedent eng_for_deu S0032L01 'wolltest du | did you want'. Rows unchanged.")
add('eng_for_deu', id='S0010L02', verdict='regloss', pattern='A', known='ob ich kann', basket={'B01': ['ob ich kann', 'if I can']},
    why=A + "'ob ich kann' is complete German. Precedent eng_for_spa S0010L02 'si puedo | if I can'. The scan suggested growing to 'if I can remember' — not needed, and the shortest cut is preferred.")
add('eng_for_deu', id='S0042L03', verdict='regloss', pattern='A', target='than', why=A + "the dots are on the English ('than…'). Rows unchanged.")
add('eng_for_zho', id='S0032L02', verdict='regloss', pattern='A', ack=['known'], known='你想吗', basket={'B01': ['你想吗', 'Did you want?'], 'B02': 'keep', 'B03': 'keep', 'B04': 'keep', 'U01': 'keep', 'U02': 'keep', 'U03': 'keep', 'U04': 'keep', 'U05': 'keep'}, why=A + "'你想吗' is complete Chinese; every row already has it split round its verb (K49: words may sit inside a LEGO).")
add('eng_for_zho', id='S0042L03', verdict='regloss', pattern='A', known='我开始觉得', basket={'B01': ['我开始觉得', 'I was starting to feel'], 'U04': 'keep'},
    why=A + "the seed's final 了 belongs to 好了, not to this piece; '我开始觉得' is contiguous and complete.")
add('eng_for_zho', id='S0077L02', verdict='regloss', pattern='A', known='对速度感到惊讶', ack=['known'],
    basket={'B01': ['对速度感到惊讶', 'Surprised at how quickly'], 'B02': 'keep', 'B03': 'keep', 'B04': 'keep', 'U01': 'keep', 'U02': 'keep', 'U03': 'keep', 'U04': 'keep', 'U05': 'keep'},
    why=A + "'对速度感到惊讶' ('surprised at the speed') is complete Chinese. NOTE, not fixed here: the rows' Chinese prompts use a different wording (惊讶于…这么快) from the LEGO's own; that is the eng_for_zho known-side read (decision D2 on the combined list).")
add('eng_for_zho', id='S0138L01', verdict='kai',
    why="HOLD. '这就是...的地方 | This was where' — Chinese puts the whole clause in the hole, and neither '这就是的地方' nor '这就是地方' is Chinese. The whole clause is 10 English syllables, over the cap. Options: (1) prompt '这就是' alone for 'This was where' (complete Chinese, but it reads as 'this is', and the rows still carry …的地方); (2) leave until the eng_for_zho known-side read (D2). Recommended (1). Kai's call because either way the prompt and the answer do not say quite the same thing.")

# ---------------- zho_for_hin (Chinese is the target; Hindi is the prompt)  pattern B
c = 'zho_for_hin'
Bz = B + "the Chinese piece is fine on its own; the HINDI prompt cannot be said without the word in the hole. "
add(c, id='S0182L01', verdict='grow', pattern='B', ack=['known'], ack_rows=['U02', 'U03', 'U05'], known='क्या आपने देखा है', target='你有没有看到', type='M', components=[['आपने', '你'], ['है या नहीं', '有没有'], ['देखा', '看到']],
    basket={'B01': ['क्या आपने देखा है', '你有没有看到'], 'B02': ['क्या आपने उसे देखा है', '你有没有看到他'], 'B03': ['क्या आपने मुझे देखा है', '你有没有看到我'],
            'B04': ['क्या आपने यह देखा है', '你有没有看到这个'], 'U01': ['क्या आपने आज उसे देखा है?', '今天你有没有看到他？'], 'U02': ['क्या आपने मेरी चीनी किताब देखी है?', '你有没有看到我的中文书？'],
            'U03': ['क्या आपने मेरी किताब देखी है?', '你有没有看到我的书？'], 'U04': ['क्या आपने मेरे दोस्त को देखा है?', '你有没有看到我的朋友？'],
            'U05': ['क्या आपने वह किताब देखी है?', '你有没有看到那本书？'], 'U06': 'del'},
    why=Bz + "Grown to the seed's verb: 'क्या आपने देखा है | 你有没有看到' (contiguous in the seed, 5 syllables). The scan proposed the same. 看到 has been in use since seed 107. 6 rows about 有没有时间/书 are rewritten to 有没有看到; 3 already had it. NOTE for Kai: S0372L01 teaches 'क्या आपने देखा | 你看到' later — the two Hindi prompts differ only by 'है' (have you seen / did you see).")
add(c, id='S0395L01', verdict='grow', pattern='B', known='हमें बाएँ मुड़ना है', target='我们要向左转', type='M', ack=['target'], components=[['हमें', '我们'], ['ना है', '要'], ['बाएँ मुड़ना', '向左转']],
    basket={'B01': ['हमें बाएँ मुड़ना है', '我们要向左转'], 'B02': ['आज हमें बाएँ मुड़ना है', '今天我们要向左转'], 'B03': ['अब हमें बाएँ मुड़ना है', '现在我们要向左转'],
            'U01': ['मुझे लगता है कि हमें बाएँ मुड़ना है', '我觉得我们要向左转'], 'U02': ['उसने कहा कि हमें बाएँ मुड़ना है', '他说我们要向左转'],
            'U03': ['वह जानता है कि हमें बाएँ मुड़ना है', '他知道我们要向左转'], 'U04': ['क्या हमें बाएँ मुड़ना है?', '我们要向左转吗？'], 'U05': ['मुझे नहीं लगता कि हमें बाएँ मुड़ना है', '我不觉得我们要向左转']},
    why=Bz + "Grown to the seed's verb: 'हमें बाएँ मुड़ना है | 我们要向左转'. In the seed the place phrase 在下一个路口 sits inside it; the LEGO stands on its own as complete Chinese, which is what L32 asks of a frame ('a LEGO only if it stands on its own as complete target language'), and 向左转 was taught at seed 359. COST: the basket's 7 varied rows (我们要练习, 我们要学习中文…) are rebuilt around 向左转. ALTERNATIVE for Kai, not planned: keep 我们要 and its varied basket, and give the Hindi label a stand-in verb, 'हमें करना है', as this course already does at S0005L02 ('मैं करने वाला हूँ | 我要'). Cheaper (one prompt clip), but Kai's stand-in ruling covers 'it' only, and 'हमें करना है' invites the answer 我们要做.")
add(c, id='S0418L01', verdict='grow', pattern='B', known='उन्हें समुदाय की सेवा करनी है', target='他们需要服务社区', type='M', components=[['उन्हें', '他们'], ['ना है', '需要'], ['समुदाय की सेवा कर', '服务社区']],
    basket={'B01': ['उन्हें समुदाय की सेवा करनी है', '他们需要服务社区'], 'B02': ['आज उन्हें समुदाय की सेवा करनी है', '今天他们需要服务社区'], 'B03': ['अब उन्हें समुदाय की सेवा करनी है', '现在他们需要服务社区'],
            'U01': ['मुझे लगता है कि उन्हें समुदाय की सेवा करनी है', '我觉得他们需要服务社区'], 'U02': ['उसने कहा कि उन्हें समुदाय की सेवा करनी है', '他说他们需要服务社区'],
            'U03': ['वह जानता है कि उन्हें समुदाय की सेवा करनी है', '他知道他们需要服务社区'], 'U04': ['क्या उन्हें समुदाय की सेवा करनी है?', '他们需要服务社区吗？'],
            'U05': ['मुझे नहीं लगता कि उन्हें समुदाय की सेवा करनी है', '我不觉得他们需要服务社区']},
    extra=[{'op': 'lego.reorder', 'seed_number': 418, 'order': ['S0418L02', 'S0418L01'], 'phrases_default': 'keep'}],
    why=Bz + "Grown to the whole seed 'उन्हें समुदाय की सेवा करनी है | 他们需要服务社区' (7 syllables) — NOT to 他们需要服务, which on its own reads 'they need service'. L32: 'the whole thing (frame + middle) is taught as one LEGO after the middle pieces', so the order is swapped to teach 服务社区 first. STRUCTURAL (reorder): needs Kai's go, and Popty refuses a reorder while any learner's progress names these LEGOs; if refused, the fix still stands without the swap. 7 syllables kept: any shorter Chinese piece changes meaning. Basket rebuilt (same alternative as S0395L01).")
add(c, id='S0530L02', verdict='grow', pattern='B', known='ताकि मैं गिन सकूँ', target='这样我就能数', type='M', components=[['ताकि', '这样'], ['मैं', '我'], ['सकूँ', '就能'], ['गिन', '数']],
    basket={'B01': ['ताकि मैं गिन सकूँ', '这样我就能数'], 'B02': ['मुझे बताइए ताकि मैं गिन सकूँ', '告诉我，这样我就能数'], 'B03': ['इसे यहाँ रखिए ताकि मैं गिन सकूँ', '放在这里，这样我就能数'],
            'B04': ['मुझे थोड़ा समय दीजिए ताकि मैं गिन सकूँ', '给我一点时间，这样我就能数'], 'U01': 'keep', 'U02': ['मुझे बताइए ताकि मैं उन्हें गिन सकूँ', '告诉我，这样我就能数了'],
            'U03': ['इसे यहाँ रखिए ताकि मैं उन्हें गिन सकूँ', '放在这里，这样我就能数了'], 'U04': ['मुझे थोड़ा समय दीजिए ताकि मैं उन्हें गिन सकूँ', '给我一点时间，这样我就能数了'],
            'U05': ['मेरी मदद कीजिए ताकि मैं गिन सकूँ', '帮我，这样我就能数']},
    why=Bz + "Grown to the seed's verb: 'ताकि मैं गिन सकूँ | 这样我就能数' (contiguous, 6 syllables; 数 is S0530L01, taught first). The scan proposed the same. Rows with other verbs (去, 看, 理解, 做完, 帮你) are rebuilt around 数, keeping their lead-in clauses.")
add(c, id='S0570L02', verdict='grow', pattern='B', ack_rows=['U02', 'U04'], known='अपनी टिकट के लिए', target='为你的票', type='M', components=[['के लिए', '为'], ['अपनी', '你的'], ['टिकट', '票']],
    basket={'B01': ['अपनी टिकट के लिए', '为你的票'], 'B02': ['अपनी टिकट के लिए भुगतान', '为你的票付钱'], 'B03': ['अपनी टिकट के लिए कितना', '为你的票付多少钱'], 'B04': ['अपनी टिकट के लिए काम', '为你的票工作'],
            'U01': 'keep', 'U02': ['मैं आपकी टिकट के लिए भुगतान करूँगा', '我为你的票付钱'], 'U03': 'keep', 'U04': ['मैं आपकी टिकट के लिए काम करता हूँ', '我为你的票工作'], 'U05': 'keep'},
    why=Bz + "Grown to the seed's noun: 'अपनी टिकट के लिए | 为你的票' (contiguous, 4 syllables; 票 is S0570L01, taught first). The scan proposed the same. 5 rows already say 为你的票; 4 about 工作/家 are rewritten.")

# ---------------- kor_for_eng  pattern D
c = 'kor_for_eng'
def notnew(seed, idx, k, t): return {'op': 'lego.insert', 'row': {'seed_number': seed, 'lego_index': idx, 'known_text': k, 'target_text': t, 'type': 'A', 'is_new': False}}
def prow(course, lid, r, i, pos, k, t): return {'op': 'phrase.insert', 'row': {'id': f'{course}:{lid}{r}{i:02d}', 'course_code': course, 'seed_number': int(lid[1:5]), 'lego_index': int(lid[6:8]), 'known_text': k, 'target_text': t, 'phrase_role': 'build' if r == 'B' else 'use', 'position': pos, 'word_count': len(t.split()), 'lego_count': 1}}
add(c, id='S0126L01', verdict='recut', pattern='D', known='this work', target='이 일이', type='M', components=[['this', '이'], ['work', '일이']],
    basket={'B01': ['this work', '이 일이'], 'B02': ['but this work', '하지만 이 일이'], 'U01': 'keep', 'U04': 'keep', 'U07': 'keep', 'U08': 'keep'},
    add=[['b', 'so this work', '그래서 이 일이'], ['b', 'definitely this work', '확실히 이 일이'], ['u', 'this work is changing things now', '이 일이 지금 바꾸고 있어요']], ack_rows=[],
    extra=[{'op': 'lego.insert', 'row': {'seed_number': 126, 'lego_index': 3, 'known_text': 'is changing', 'target_text': '바꾸고 있어요', 'type': 'M', 'is_new': True,
                                        'components': [{'known': 'changing', 'target': '바꾸고'}, {'known': 'is', 'target': '있어요'}]}}] +
          [prow(c, 'S0126L03', r, i, p, k, t) for p, (r, i, k, t) in enumerate([('B', 1, 'is changing', '바꾸고 있어요'), ('B', 2, 'this work is changing', '이 일이 바꾸고 있어요'),
              ('B', 3, 'is changing the shape of my brain', '뇌의 모양을 바꾸고 있어요'), ('B', 4, 'but this work is changing', '하지만 이 일이 바꾸고 있어요'), ('U', 1, 'this work is changing the shape of my brain', '이 일이 뇌의 모양을 바꾸고 있어요'),
              ('U', 2, 'but this work is changing the shape of my brain', '하지만 이 일이 뇌의 모양을 바꾸고 있어요'), ('U', 3, 'so this work is changing the shape of my brain', '그래서 이 일이 뇌의 모양을 바꾸고 있어요'),
              ('U', 4, 'definitely this work is changing the shape of my brain', '확실히 이 일이 뇌의 모양을 바꾸고 있어요'), ('U', 5, 'so this work is changing', '그래서 이 일이 바꾸고 있어요')], 1)],
    why=Dp + "seed 이 일이 [뇌의 모양을] 바꾸고 있어요. This LEGO becomes 'this work | 이 일이'; a NEW LEGO 'is changing | 바꾸고 있어요' is added AFTER 'the shape of my brain', so the seed is taught in its own order. All 6 rows stay (each contains 이 일이). STRUCTURAL: one LEGO insert with an 8-row basket, needs Kai's go. Note: the present LEGO is 8 syllables, at the cap.")
add(c, id='S0132L01', verdict='recut', pattern='D', known='less exciting', target='덜 신나요', type='M', components=[['less', '덜'], ['exciting', '신나요']],
    basket={'B01': ['less exciting', '덜 신나요'], 'U01': ["that's less exciting now", '그건 지금 덜 신나요'], 'U02': ["that's less exciting today", '그건 오늘 덜 신나요'], 'U03': 'del'}, ack_rows=['U01', 'U02'],
    extra=[notnew(132, 3, 'that', '그건')],
    why=Dp + "seed 그건 [그녀가 말했던 것보다] 덜 신나요. This LEGO becomes 'less exciting | 덜 신나요'; 'that | 그건' is added NOT-NEW (taught at S0127L01). The basket held the same row two and three times (B01=B02=U01, B03=U02, B04=U03): one twin becomes the bare LEGO, two are reworded, one is deleted; 7 rows stay as they are. STRUCTURAL (one not-new insert, no basket).")
add(c, id='S0145L01', verdict='recut', pattern='D', known='are you not happy', target='행복하지 않아요', type='M', components=[['happy', '행복하지'], ['are you not', '않아요']],
    basket={'B01': ['are you not happy', '행복하지 않아요'], 'B04': ['are you not happy now', '지금 행복하지 않아요'], 'U01': ['why are you not happy now', '왜 지금 행복하지 않아요'], 'U02': ['why are you not happy today', '왜 오늘 행복하지 않아요']}, ack_rows=['U01', 'U02'], extra=[notnew(145, 3, 'why', '왜')],
    why=Dp + "seed 왜 [더 이상] 행복하지 않아요? This LEGO becomes 'are you not happy | 행복하지 않아요' (K26: the English keeps 'you'); 'why | 왜' is added NOT-NEW (S0021L01). 5 rows stay; B04 '…왜 행복하지 않은지 모르겠어요' never contained the LEGO's form (않은지, not 않아요) and is reworded; three twin rows (B01=B02=U01, B03=U02) become the bare LEGO and two new sentences. STRUCTURAL (one not-new insert).")
add(c, id='S0147L01', verdict='recut', pattern='D', known='was very kind', target='아주 친절했어요', type='M', components=[['very', '아주'], ['was kind', '친절했어요']],
    basket={'B01': ['was very kind', '아주 친절했어요'], 'U01': ['she was very kind today', '그녀는 오늘 아주 친절했어요'], 'U02': ['she was very kind yesterday', '그녀는 어제 아주 친절했어요'], 'U03': 'del'}, ack_rows=['U01', 'U02'],
    extra=[notnew(147, 3, 'she', '그녀는')],
    why=Dp + "seed 그녀는 [제가 긴장하는 걸 봤을 때] 아주 친절했어요. The present LEGO is 10 syllables, over the 8 cap (L3), so it must be cut anyway. It becomes 'was very kind | 아주 친절했어요' (7 syllables, kept at 7: 'was kind' alone is not a contiguous piece of the English seed); 'she | 그녀는' is added NOT-NEW (S0017L01). 8 rows stay; the basket held four rows twice (B01=B02=U01, B03=U02, B04=U03): one becomes the bare LEGO, two are reworded, one is deleted. STRUCTURAL (one not-new insert).", closes=['19'])
add(c, id='S0148L01', verdict='kai',
    why="HOLD. 'he wasn't very patient | 그는 참을성이 별로 없었어요' is 12 syllables. Split off 'he | 그는' (not-new, S0016L01) and it is still 10 ('참을성이 별로 없었어요'), over the cap of 8. Cutting further gives 'wasn't very | 별로 없었어요', which would be one English prompt with two Korean answers against every '-지 않았어요' LEGO — Kai's rule is that a would-be clash stays inside the bigger LEGO. So this needs a ruling: accept a 10-syllable LEGO, or reword the seed. It is on the Korean over-8 list too: decide it there once.", closes=['19'])

# ---------------- kor_for_hin
c = 'kor_for_hin'
add(c, id='S0111L02', verdict='recut', pattern='C', known='जब सीखते हैं', target='배울 때', type='M', components=[['सीखते हैं', '배울'], ['जब', '때']],
    basket={'B01': ['जब सीखते हैं', '배울 때'], 'B02': 'keep', 'B03': ['जब हम कुछ नया सीखते हैं', '우리가 새로운 것을 배울 때'], 'B04': ['जब हम बहुत सारे नए शब्द सीखते हैं', '우리가 많은 새 단어를 배울 때'],
            'U01': 'keep', 'U02': 'keep', 'U03': 'keep', 'U04': 'keep', 'U05': 'keep'},
    why=C + "'हम सीखते हैं | 우리가 배울' joins the subject to 배울 across the object, and 배울 is a form that needs the word after it; the seed's 때 ('when') was in NO LEGO (a coverage gap, S3). Shortest contiguous cut: 'जब सीखते हैं | 배울 때' (3 syllables), which closes that gap. Precedent S0034L02 'जब यहाँ हों | 여기 있을 때'. 우리가 was taught at seed 104 and is carried by the rows. Every use row already says 배울 때; 2 build rows that stopped at 배울 gain 때.")
add(c, id='S0132L03', verdict='recut', pattern='C', ack_rows=['B02', 'B03', 'B04', 'U01', 'U02', 'U03', 'U05'], known='उससे जो कह रही थी', target='말하던 것보다', type='M', components=[['कह रही थी', '말하던'], ['उससे', '것보다']],
    basket={'B01': ['उससे जो कह रही थी', '말하던 것보다'], 'B02': ['उससे जो मैं कह रहा था', '제가 말하던 것보다'], 'B03': ['उससे कम जो मैं कह रहा था', '제가 말하던 것보다 덜'], 'B04': ['उससे बहुत कम जो मैं कह रहा था', '제가 말하던 것보다 정말 덜'],
            'U01': ['वह उससे कम रोमांचक है जो मैं कह रहा था', '그것은 제가 말하던 것보다 덜 흥미로워요'], 'U02': ['यह उससे कम रोमांचक है जो मैं कह रहा था', '제가 말하던 것보다 덜 흥미로워요'],
            'U03': ['वह उससे बहुत कम रोमांचक है जो मैं कह रहा था', '그것은 제가 말하던 것보다 정말 덜 흥미로워요'], 'U04': ['वह उससे कम रोमांचक है जो कह रही थी', '그것은 말하던 것보다 덜 흥미로워요'],
            'U05': ['यह उससे बहुत कम रोमांचक है जो मैं कह रहा था', '제가 말하던 것보다 정말 덜 흥미로워요']},
    why=C + "'वह उससे | 그것은 것보다' joins the first word of the seed to an ending from its middle; every row in the basket is broken Korean ('그것은 것보다 덜'). 것보다 ('than what…') cannot stand without its verb, so it grows to the verb in its own seed (L22): 'उससे जो कह रही थी | 말하던 것보다' (6 syllables). Growing S0132L04 instead would be 9 syllables. 그것은 keeps no LEGO of its own here because its only honest Hindi prompt, 'वह', already means 그는 ('he', S0016L01) — it is carried by the rows and by S0086L02. Whole basket rebuilt (9 rows).")
add(c, id='S0135L04', verdict='keep', pattern='not-gapped', basket={},
    extra=[{'op': 'phrase.update', 'phrase_id': 'kor_for_hin:S0135L04B03', 'set': {'known_text': 'यह अच्छा क्यों लगता है', 'target_text': '그것이 좋다고 왜 생각하는지'}, 'expect': {'known_text': 'यह क्यों लगता है', 'target_text': '그것이 왜 생각하는지'}}],
    why="NOT GAPPED (keep). '왜 생각하는지' ('why … think') is a well-formed clause on its own and its middles (그것이, 그렇게 좋다고) are S0135L01–L02, taught before it — exactly the frame L32 allows; rows fill the slot (K49). Splitting it would give 'लगता है | 생각하는지', a second answer for a prompt that already means 생각해요 (S0072L01). One build row, '그것이 왜 생각하는지' ('why it thinks'), had lost its 좋다고 and is corrected.")
add(c, id='S0137L04', verdict='grow', pattern='C', known='अक्सर बात करना', target='자주 말하는 것이', type='M', components=[['अक्सर', '자주'], ['बात करना', '말하는 것이']],
    basket={'B01': ['अक्सर बात करना', '자주 말하는 것이'], 'B02': ['अभी अक्सर बात करना', '지금 자주 말하는 것이'], 'B03': ['ज़्यादा अक्सर बात करना', '더 자주 말하는 것이'], 'B04': ['साथ में अक्सर बात करना', '같이 자주 말하는 것이']},
    why="neighbour of S0137L03. The stray ending 것이 belongs to the verb before it (L22). This LEGO grows by it: 'अक्सर बात करना | 자주 말하는 것이' (6 syllables). Precedent S0028L03 'शुरू करना | 시작하는 것이'. All 6 use rows already say it; the 4 build rows gain 것이.")
add(c, id='S0137L03', verdict='recut', pattern='C', known='ज़रूरी है', target='중요해요', type='A', components=[], is_new=False,
    why=C + "'करना ज़रूरी है | 것이 중요해요' starts with an ending torn off the word before it. 것이 moves to S0137L04 (above), leaving 'ज़रूरी है | 중요해요', which is exactly S0065L04 → NOT-NEW (L27: a duplicate is introduced once). Its 9 rows go dark (P25); the ones worth hearing ('자주 말하는 것이 중요해요') are already in S0137L04's basket.", closes=['dup'])
add(c, id='S0138L01', verdict='kai',
    why="HOLD. 'यहीं | 여기가 곳이에요': the Korean wraps the whole clause (여기가 … 곳이에요) and the Hindi seed has no word at all for 곳이에요 ('is the place'). The whole clause is 16 syllables. Nothing in the seed can prompt 곳이에요, so no re-cut is honest; L25: 'if the chunk needs to get too big to work … consider changing the seed … bring to me'. Proposed for Kai: reword the Hindi seed to 'यही वह जगह है जहाँ मेरा दोस्त हमसे मिलना चाहता था', then cut 'यही | 여기가' and 'वह जगह है | 곳이에요'. The basket (8 rows of broken Korean such as '조금 여기가 곳이에요') is rebuilt either way.")
add(c, id='S0148L04', verdict='kai',
    why="HOLD (same seed as kor_for_eng S0148). 'बहुत नहीं था | 그리 없었어요' wraps 참을성이. Whole, '그리 참을성이 없었어요' is 10 syllables, over the cap. Cut to '참을성이 없었어요' (8) leaves 그리 needing a LEGO whose Hindi prompt 'बहुत' already means 정말/아주 — one prompt, two answers. Needs a ruling: a 10-syllable LEGO, or a seed change.", closes=['19'])
add(c, id='S0151L02', verdict='recut', pattern='D', known='मैं', target='제가', type='A', components=[], is_new=False, basket={'U01': 'keep', 'U03': 'keep'},
    extra=[notnew(151, 4, 'यह', '그것은')],
    why=Dp + "'मैं वह | 제가 그것은' is two unconnected words of the seed (그것은 제가 …). Both are already taught: this LEGO becomes 'मैं | 제가' NOT-NEW (S0011L03) and 'यह | 그것은' is added NOT-NEW (S0086L02). No clash: both are exact earlier pairs. The basket (8 rows of broken Korean, '제가 그것은 좋다고 생각해요') goes dark, as it should. STRUCTURAL (one not-new insert). 0 characters.", closes=['dup'])
add(c, id='S0242L01', verdict='kai',
    why="HOLD. 'उसको देना | 그녀에게 주고' wraps '시간을 더', and 주고 cannot end a phrase. Whole, '그녀에게 주고 싶어요' is 9 syllables. The natural split is 'उसको | 그녀에게' + 'देना | 주고' (not-new, S0054L01) — but 'उसको' already means 그에게 ('to him', S0176L02): Hindi does not mark him/her, so that is one prompt, two answers. Proposed for Kai: 'उसको समय | 그녀에게 시간을' + NEW 'ज़्यादा देना चाहता हूँ | 더 주고 싶어요' — both contiguous — and the him/her sense goes in the presentation (K23: 'keep the clash, explain the sense in the presentation'). Belongs with item 13.", closes=['13'])
add(c, id='S0624L01', verdict='keep', pattern='not-gapped', why="NOT GAPPED (keep). 'तो बढ़िया होगा | 그러면 좋겠어요' is complete Korean on its own; the seed only puts 정말 inside it, which was taught at seed 63. L32 allows exactly this; K49: 'words of any size may sit inside a LEGO in a phrase'. (Its Hindi says बढ़िया where the seed says अच्छा — item 10's family, not this one.)", closes=['10'])

# ---------------- kor_for_tam
c = 'kor_for_tam'
add(c, id='S0325L03', verdict='recut', pattern='C', known='கருத்தில் கொள்ள வேண்டும் என்று', target='고려해야 한다고', type='M', components=[['கருத்தில் கொள்ள வேண்டும்', '고려해야'], ['என்று', '한다고']],
    basket={'B01': ['கருத்தில் கொள்ள வேண்டும் என்று', '고려해야 한다고'], 'B02': ['அவர் பிரச்சினையைக் கருத்தில் கொள்ள வேண்டும் என்று', '그가 그 문제를 고려해야 한다고'],
            'B03': ['அவர் வேறு விஷயத்தைக் கருத்தில் கொள்ள வேண்டும் என்று', '그가 다른 것을 고려해야 한다고'], 'B04': 'keep', 'U01': 'keep', 'U02': 'keep', 'U03': 'keep', 'U05': 'keep'},
    why=C + "'அவர் கருத்தில் கொள்ள வேண்டும் | 그가 고려해야' joins the subject to a verb form that cannot end a phrase, across the object. Re-cut to the contiguous '고려해야 한다고' (6 syllables), which also covers the seed's 한다고, in no LEGO until now. Precedent: S0322L01 'படிக்க வேண்டும் என்று | 읽어야 한다고', S0327L02. 그가 was taught at seed 225 and is carried by the rows. All 4 use rows already say it; 2 build rows gain 한다고.")
add(c, id='S0326L01', verdict='recut', pattern='C', pov='hold', ack=['known'], known='விற்க வேண்டிய அவசியமில்லை என்று', target='팔 필요가 없다고', type='M', components=[['விற்க', '팔'], ['வேண்டிய அவசியமில்லை என்று', '필요가 없다고']],
    basket={'B01': ['விற்க வேண்டிய அவசியமில்லை என்று', '팔 필요가 없다고'], 'B02': ['அவள் அந்தப் புத்தகத்தை விற்க வேண்டிய அவசியமில்லை என்று', '그녀가 그 책을 팔 필요가 없다고'],
            'B03': ['அவள் விற்க வேண்டிய அவசியமில்லை என்று', '그녀가 팔 필요가 없다고'], 'B04': ['அவள் இப்போது விற்க வேண்டிய அவசியமில்லை என்று', '그녀가 지금 팔 필요가 없다고'],
            'U01': 'keep', 'U02': 'keep', 'U03': 'keep', 'U04': 'keep', 'U05': ['அவள் விற்க வேண்டிய அவசியமில்லை என்று நினைக்கிறேன்', '그녀가 팔 필요가 없다고 생각해요']},
    why="HOLD (needs Kai's yes). The Tamil prompt of this cut is not the seed's own wording: seed 326's Tamil says 'I don't think she should sell', its Korean says 'I think she has no need to sell', so no Tamil piece of the seed matches 팔 필요가 없다고 (L26). The cut below uses the wording the course already taught at S0323L03 and that all 9 rows of this basket already use. " + C + "'அவள் விற்க | 그녀가 팔' joins the subject to 팔, a form that needs the word after it, across the object. Re-cut to the contiguous '팔 필요가 없다고' (7 syllables), which also covers the seed's 필요가 없다고, in no LEGO of this seed. Kept at 7: 팔 cannot stand alone, and '필요가 없다고' alone is S0323L03. 그녀가 was taught at seed 132. 4 use rows already say it; 5 rows are completed.")
add(c, id='S0558L01', verdict='keep', pattern='not-gapped', why="NOT GAPPED (keep). 'இரவில் தாமதமாகிவிட்டது | 밤이 늦었어요' is complete Korean on its own (5 syllables); the seed only puts 너무 inside it, taught at seed 27. L32 allows this; K49.")

# ---------------- fra_for_eng
add('fra_for_eng', id='S0644L02', verdict='kai', pattern='not-gapped',
    why="HOLD — decide together with S0644L01. 'could you sir? | pourriez-vous monsieur ?' is NOT gapped in Kai's sense: it is complete French on its own (a frame, L32). Its real fault is that it is marked not-new although no earlier LEGO teaches the pair, so its 8 good rows ('could you help me sir?') are never played (P25), while S0644L01 — the whole seed as one 10-syllable LEGO — is the NEW one and its rows drill only 'cela'. The scan said 'retire it'; that throws away the good basket. Better: make THIS the taught LEGO (L31: a not-new LEGO with no earlier pair 'becomes NEW') and re-cut S0644L01 to the middle. Not planned here because (a) S0644L01 belongs to items 11 and 19, and (b) Popty's validator counts a split LEGO as 'not contained' (7 of these 8 rows put the verb inside pourriez-vous … monsieur), although K49 says 'a split LEGO still counts as contained'.", closes=['16', '11', '19'])

os.makedirs(HERE, exist_ok=True)
for course, legos in D.items():
    json.dump({'course': course, 'legos': legos}, open(os.path.join(HERE, f'{course}.json'), 'w'), ensure_ascii=False, indent=1)
print({k: len(v) for k, v in D.items()}, sum(len(v) for v in D.values()))
