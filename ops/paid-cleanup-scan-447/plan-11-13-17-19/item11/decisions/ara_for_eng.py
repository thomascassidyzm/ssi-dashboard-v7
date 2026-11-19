#!/usr/bin/env python3
"""ara_for_eng item-11 decisions (basket does not drill its own LEGO), hand-authored per LEGO. PLAN ONLY.
Writes ara_for_eng.json for tools/plan.py. Verdicts: recut-small (LEGO shrinks to the piece its basket drills) ·
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


P17 = 'Rule: every practice phrase under a LEGO contains the whole LEGO, in exactly the taught form (a different verb form or case ending is a break).'
O19 = ('HOLD: this LEGO is also on the over-8-syllables list (item 19), whose plan re-cuts it and re-homes every row under the new pieces. '
       'Planning the rows here as well would plan the same basket twice. ')
ROMAN = {}

# ---- seed 91 "it's difficult to think quickly enough to answer in time"
D('S0091L02', 'kai', why=O19 + 'For that cut: 7 of 8 rows drill "think" without "quickly" (3 of them the indicative تُفَكِّرُ, a form the seed does not say). The obvious short cut "to think | أَنْ تُفَكِّرَ" + not-new "quickly | بِسُرْعَةٍ" (taught at seed 20) keeps U02-U05 as they are, BUT the gloss "to think" is already owed to S0638L01 "to think | أُفَكِّرَ" and "you to think" to S0427L02 أَنْ تَظُنَّ, so a short cut needs a gloss that does not clash; if none is found the LEGO stays whole and the 7 rows take بِسُرْعَةٍ.')

# ---- seed 102 "we're trying to say that it's not like that | نُحاوِلُ أَنْ نَقولَ إِنَّ الأَمْرَ لَيْسَ كَذٰلِك"
D('S0102L03', 'rebuild-rows',
  why=P17 + ' The LEGO "to say that | نَقولَ إِنَّ" is the seed\'s own words and cannot shrink: "we say | نَقولَ" is already the LEGO before it, and a bare "that | إِنَّ" would be a lone particle. Six rows drill إِنَّ الأَمْرَ without نَقولَ, or the indicative نَقولُ. Each is reworded with the smallest change so it says نَقولَ إِنَّ after "we want / we try / we need".',
  b={'B01': ('we want to say that', 'نُريدُ أَنْ نَقولَ إِنَّ'),
     'B02': ('we try to say that', 'نُحاوِلُ أَنْ نَقولَ إِنَّ'),
     'B03': ('we try to say that the matter', 'نُحاوِلُ أَنْ نَقولَ إِنَّ الأَمْرَ'),
     'U03': ('we want to say that the matter is not difficult', 'نُريدُ أَنْ نَقولَ إِنَّ الأَمْرَ لَيْسَ صَعْباً'),
     'U04': ('we need to say that the matter is not easy', 'نَحْتاجُ أَنْ نَقولَ إِنَّ الأَمْرَ لَيْسَ سَهْلاً'),
     'U05': ('we try to say that the language is fun', 'نُحاوِلُ أَنْ نَقولَ إِنَّ اللُّغَةَ مُمْتِعَة')})

# ---- seed 109 "we must work hard to learn a lot of new words"
D('S0109L02', 'rebuild-rows',
  why=P17 + ' The LEGO "new words | كَلِماتٍ جَديدَةً" is the seed\'s own words and 5 of 7 rows drill it; two rows use the singular كَلِمَةً جَديدَةً ("a new word"), a form the seed does not say. Those two are reworded to the plural, and one build row is added because the builder wants three builds that put the LEGO inside a phrase.',
  b={'B01': ('new words in Arabic', 'كَلِماتٍ جَديدَةً بِالعَرَبِيَّةِ'),
     'U03': ('I want to learn new words in Arabic', 'أُريدُ أَنْ أَتَعَلَّمَ كَلِماتٍ جَديدَةً بِالعَرَبِيَّةِ')},
  add=[('b', 'we need to learn new words', 'نَحْتاجُ أَنْ نَتَعَلَّمَ كَلِماتٍ جَديدَةً')])

# ---- seed 144 "I woke earlier than I wanted to this morning | اسْتَيْقَظْتُ أَبْكَرَ مِمّا أَرَدْتُ هٰذا الصَّباح"
D('S0144L02', 'rebuild-rows',
  why=P17 + ' Six of eight rows stop at أَبْكَرَ ("earlier") and never say مِمّا ("than"). Shrinking the LEGO to "earlier | أَبْكَرَ" would leave مِمّا as a lone particle LEGO, which is not allowed, so the LEGO stays and the six rows gain "than I should / than I expected", the two endings the basket already uses in U01 and U02.',
  b={'B01': ('earlier than I should', 'أَبْكَرَ مِمّا يَجِبُ'),
     'B02': ('I woke up earlier than I should', 'اسْتَيْقَظْتُ أَبْكَرَ مِمّا يَجِبُ'),
     'B03': ('I woke up earlier than I expected', 'اسْتَيْقَظْتُ أَبْكَرَ مِمّا أَتَوَقَّعُ'),
     'U03': ("I woke up earlier than I should and I'm sorry", 'اسْتَيْقَظْتُ أَبْكَرَ مِمّا يَجِبُ وَأَنا آسِفٌ'),
     'U04': ("I woke up earlier than I expected this morning and I'm tired", 'اسْتَيْقَظْتُ أَبْكَرَ مِمّا أَتَوَقَّعُ هٰذا الصَّباح وَأَنا مُتْعَبٌ'),
     'U05': ('of course I woke up earlier than I should today', 'طَبْعاً اسْتَيْقَظْتُ أَبْكَرَ مِمّا يَجِبُ اليَوْم')})

# ---- seed 152 "I would have done it differently if I had known what you wanted"
D('S0152L03', 'rebuild-rows',
  why=P17 + ' All 8 rows drill "if I were ready | لَوْ كُنْتُ مُستَعِدّاً" or "if that were"; none says the LEGO "if I had known | لَوْ عَرَفْتُ". The LEGO is the seed\'s own words, so the basket is rebuilt: the same frames, now ending in لَوْ عَرَفْتُ.',
  b={'B01': ('if I had known that', 'لَوْ عَرَفْتُ ذٰلِك'),
     'B02': ('differently if I had known', 'بِشَكْلٍ مُخْتَلِفٍ لَوْ عَرَفْتُ'),
     'B03': ('I would have done it differently if I had known', 'كُنْتُ سَأَفْعَلُهُ بِشَكْلٍ مُخْتَلِفٍ لَوْ عَرَفْتُ'),
     'U01': ('I would have done it if I had known that', 'كُنْتُ سَأَفْعَلُهُ لَوْ عَرَفْتُ ذٰلِك'),
     'U02': ('I think I would have done it differently if I had known', 'أَعتَقِدُ أَنَّني كُنْتُ سَأَفْعَلُهُ بِشَكْلٍ مُخْتَلِفٍ لَوْ عَرَفْتُ'),
     'U03': ("I think that wouldn't have happened if I had known", 'أَظُنُّ أَنَّ ذٰلِكَ لَمْ يَحْدُث لَوْ عَرَفْتُ'),
     'U04': ('I would have done it well if I had known', 'كُنْتُ سَأَفْعَلُهُ جَيِّداً لَوْ عَرَفْتُ'),
     'U05': ('I would have done it well if I had known that', 'كُنْتُ سَأَفْعَلُهُ جَيِّداً لَوْ عَرَفْتُ ذٰلِك')})

# ---- seed 202 "nobody was sure how to answer the question | لَمْ يَكُنْ أَحَدٌ مُتَأَكِّداً كَيْفَ يُجيبُ عَنِ السُّؤال"
D('S0202L01', 'rebuild-rows',
  why=P17 + ' The 9 rows are written without vowel marks and drill "anyone | أحد" in other frames (is anyone here?, nobody knows); only one says "nobody was", and it uses "the office", a word not taught until seed 511. The LEGO "nobody was | لَمْ يَكُنْ أَحَدٌ" is the seed\'s own words, so the basket is rebuilt, fully vowelled, from words taught by seed 202 (here, ready, sure, yesterday).',
  b={'B01': ('nobody was here', 'لَمْ يَكُنْ أَحَدٌ هُنا'),
     'B02': ('nobody was ready', 'لَمْ يَكُنْ أَحَدٌ مُسْتَعِدّاً'),
     'B03': ('nobody was here yesterday', 'لَمْ يَكُنْ أَحَدٌ هُنا أَمْس'),
     'U01': ('nobody was sure', 'لَمْ يَكُنْ أَحَدٌ مُتَأَكِّداً'),
     'U02': ('nobody was ready yesterday', 'لَمْ يَكُنْ أَحَدٌ مُسْتَعِدّاً أَمْس'),
     'U03': ('I think that nobody was here', 'أَظُنُّ أَنَّهُ لَمْ يَكُنْ أَحَدٌ هُنا'),
     'U04': ('I think that nobody was ready', 'أَظُنُّ أَنَّهُ لَمْ يَكُنْ أَحَدٌ مُسْتَعِدّاً'),
     'U05': ('nobody was sure yesterday', 'لَمْ يَكُنْ أَحَدٌ مُتَأَكِّداً أَمْس'),
     'U06': ('I think that nobody was sure', 'أَظُنُّ أَنَّهُ لَمْ يَكُنْ أَحَدٌ مُتَأَكِّداً')})

# ---- seed 410 "they still fight with each other | ما زالوا يَتَشاجَرونَ مَعَ بَعْضِهِمْ"
D('S0410L01', 'recut-small', known='with each other', target='مَعَ بَعْضِهِمْ', type='M',
  comps=[['with', 'مَعَ'], ['each other', 'بَعْضِهِمْ']],
  why='The LEGO is glossed "with each other" but its Arabic is only بَعْضِهِمْ; six of eight rows already drill مَعَ بَعْضِهِمْ, which is what the seed says. The LEGO is re-cut to the piece the basket drills, "with each other | مَعَ بَعْضِهِمْ" (5 syllables). Two rows say بَعْضِنا ("we … each other"), a different form, and are reworded to "they"; the bare "each other" build becomes a phrase.',
  b={'B01': ('that they are with each other', 'أَنَّهُمْ مَعَ بَعْضِهِمْ'),
     'U03': ('I think they are with each other', 'أَظُنُّ أَنَّهُمْ مَعَ بَعْضِهِمْ'),
     'U04': ('I know they are with each other', 'أَعْرِفُ أَنَّهُمْ مَعَ بَعْضِهِمْ')})

# ---- seed 413 "we could fall if we go too close to the edge"
D('S0413L04', 'kai', why=O19 + 'For that cut: one row (U05) swaps the LEGO\'s verb for the noun الاقْتِرابَ, which is never taught, and three rows (U02-U04) say "get too close" in English where the LEGO says "go too close"; all four should be brought to the LEGO\'s own wording when the rows are re-homed.')

# ---- seed 424 "no they're wasting everybody's time | لا، إِنَّهُمْ يُضَيِّعونَ وَقْتَ الجَميعِ"
D('S0424L01', 'rebuild-rows',
  why=P17 + ' Seven of eight rows drill "everybody | الجَميعَ" (object ending) and never say وَقْتَ الجَميعِ. Shrinking the LEGO to "everybody | الجَميعِ" is blocked: "everybody | الجَميعُ" is already taught at seed 396 with a different ending, so one English prompt would have two answers. The LEGO stays and the basket is rebuilt on the two verbs taught by this point that can take "time" (they want, they need); it is narrow in meaning for that reason.',
  b={'B01': ("they want everybody's time", 'يُريدونَ وَقْتَ الجَميعِ'),
     'B03': ("they need everybody's time", 'يَحْتاجونَ وَقْتَ الجَميعِ'),
     'U01': ("do they want everybody's time?", 'هَلْ يُريدونَ وَقْتَ الجَميعِ؟'),
     'U02': ("do they need everybody's time?", 'هَلْ يَحْتاجونَ وَقْتَ الجَميعِ؟'),
     'U03': ("they don't want everybody's time", 'لا يُريدونَ وَقْتَ الجَميعِ'),
     'U04': ("they say they want everybody's time", 'يَقولونَ إِنَّهُمْ يُريدونَ وَقْتَ الجَميعِ'),
     'U05': ("they say they need everybody's time", 'يَقولونَ إِنَّهُمْ يَحْتاجونَ وَقْتَ الجَميعِ')},
  add=[('b', "they don't need everybody's time", 'لا يَحْتاجونَ وَقْتَ الجَميعِ')])

# ---- seed 451 "they said what they wanted to do | قالوا ما أَرادوا أَنْ يَفْعَلوهُ"
D('S0451L01', 'rebuild-rows',
  why=P17 + ' No row says أَرادوا: all 8 drill "what | ما" with other verbs (what they said, what they know, what they want). Shrinking to "what | ما" would be a lone particle, and "they wanted | أَرادوا" is already its own LEGO in this seed, so "what they wanted | ما أَرادوا" stays and the basket is rebuilt around it with the same lead-ins (they said, she knows, she asked, why ask).',
  b={'B01': ('they said what they wanted', 'قالوا ما أَرادوا'),
     'B02': ('she knows what they wanted', 'تَعْرِفُ ما أَرادوا'),
     'B03': ('she asked what they wanted', 'سَأَلَتْ ما أَرادوا'),
     'U01': ('did they say what they wanted?', 'هَلْ قالوا ما أَرادوا؟'),
     'U02': ('she asked what they wanted yesterday', 'سَأَلَتْ ما أَرادوا أَمْس'),
     'U03': ('I know what they wanted', 'أَعْرِفُ ما أَرادوا'),
     'U04': ('why ask what they wanted?', 'لِماذا نَسْأَلُ ما أَرادوا؟'),
     'U05': ('I think that she knows what they wanted', 'أَظُنُّ أَنَّها تَعْرِفُ ما أَرادوا')})

# ---- one-row verb-form breaks: the row swaps the LEGO's verb for another person's form
ONE = P17 + ' One row uses another person\'s verb form, which the seed does not teach; it is reworded to the LEGO\'s own form. Nothing else in the basket moves.'
D('S0462L02', 'rebuild-rows', why=ONE + ' (U02 said حارَبوا "they fought" under "fought | حارَبَ".)',
  b={'U02': ('she said he fought in Italy', 'قالَتْ إِنَّهُ حارَبَ في إِيطاليا')})
D('S0465L01', 'rebuild-rows', why=P17 + ' One build row says عَنِ المَرَّةِ القادِمَةِ ("about next time"), dropping the LEGO\'s في; it is reworded to say the LEGO whole.',
  b={'B04': ('I told her next time', 'قُلْتُ لَها في المَرَّةِ القادِمَةِ')})
D('S0470L02', 'rebuild-rows', why=ONE + ' (U02 said يَتَسَلَّقَ "he climbs" under "to climb | تَتَسَلَّقَ"; يَتَسَلَّقَ is never taught.) U04 "you should climb" keeps the LEGO and is left as it is.',
  b={'U02': ('she asked how high you want to climb', 'سَأَلَتْ إِلى أَيِّ ارْتِفاعٍ تُريدُ أَنْ تَتَسَلَّقَ'), 'U04': 'k'})
D('S0499L02', 'rebuild-rows', why=ONE + ' (U05 said يَفْتَحَ "he opens" under "we open the door | نَفْتَحَ البابَ".)',
  b={'U05': ('we need to open the door inside', 'نَحْتاجُ أَنْ نَفْتَحَ البابَ في الدَّاخِلِ')})
D('S0595L01', 'rebuild-rows', why=ONE + ' (U04 said تَسْتَلْقِيَ "you lie down" under "lie down | أَسْتَلْقِيَ".)',
  b={'U04': ('do I need to lie down now?', 'هَلْ أَحْتاجُ أَنْ أَسْتَلْقِيَ الآنَ؟')})

# ---- seed 570 "how much are you willing to pay for your ticket?"
D('S0570L02', 'rebuild-rows', ack=['known'],
  why=P17 + ' Four use rows say يَدْفَعَ ("he pays") under the LEGO مُسْتَعِدٌّ أَنْ تَدْفَعَ ("you pay"); the "he" form is not what the seed teaches. They are reworded to "you" (أَنَّكَ, taught at seed 63), keeping each lead-in. Note for the walk: this LEGO\'s English was changed by another job since the 17 Nov scan (it was "you\'re willing to pay", it is now "willing to pay for it"); the rows here follow the live wording.',
  b={'U01': ('I know you are willing to pay for it', 'أَعْرِفُ أَنَّكَ مُسْتَعِدٌّ أَنْ تَدْفَعَ'),
     'U02': ("I'm afraid you're willing to pay for it", 'أَخْشى أَنَّكَ مُسْتَعِدٌّ أَنْ تَدْفَعَ'),
     'U03': ("I suppose you're willing to pay for it", 'أَظُنُّ أَنَّكَ مُسْتَعِدٌّ أَنْ تَدْفَعَ'),
     'U05': ("I don't care that you're willing to pay for it", 'لا يَهُمُّني أَنَّكَ مُسْتَعِدٌّ أَنْ تَدْفَعَ'),
     'B04': 'k'})

# ---- seed 619 "it's a long time since we saw each other"
D('S0619L04', 'rebuild-rows',
  why=P17 + ' One build row is the fragment "each other | بَعْضَنا" without "we saw"; it is reworded to a phrase that holds the whole LEGO.',
  b={'B01': ('we saw each other today', 'رَأَيْنا بَعْضَنا اليَوْم')})

# ---- seed 627 "your coffee is ready | قَهْوَتُكَ جاهِزَةٌ"
D('S0627L01', 'rebuild-rows',
  why=P17 + ' Eight of nine rows drill "it\'s ready" without "your coffee". The short cut "ready | جاهِزَةٌ" (with "your coffee" already the seed\'s other LEGO) would keep five rows, BUT "ready" is already taught as مُسْتَعِدٌّ at seed 26, so one English prompt would have two answers. The LEGO therefore stays whole and the basket is rebuilt. Arabic limits the frames: after "she said that / I think that" the noun changes its ending (قَهْوَتَكَ), which would no longer be the taught form, so the rows use questions and plain statements.',
  b={'B01': ('is your coffee ready?', 'هَلْ قَهْوَتُكَ جاهِزَةٌ؟'),
     'B02': ('your coffee is ready now', 'قَهْوَتُكَ جاهِزَةٌ الآن'),
     'B03': ('yes, your coffee is ready', 'نَعَمْ، قَهْوَتُكَ جاهِزَةٌ'),
     'U01': ('your coffee is ready today', 'قَهْوَتُكَ جاهِزَةٌ اليَوْم'),
     'U02': ('is your coffee ready now?', 'هَلْ قَهْوَتُكَ جاهِزَةٌ الآن؟'),
     'U03': ('your coffee is ready here', 'قَهْوَتُكَ جاهِزَةٌ هُنا'),
     'U04': ('she asked if your coffee is ready', 'سَأَلَتْ هَلْ قَهْوَتُكَ جاهِزَةٌ'),
     'U05': ('yes, your coffee is ready now', 'نَعَمْ، قَهْوَتُكَ جاهِزَةٌ الآن')})

# ---- seed 630 "can I have something to drink please? | هَلْ يُمْكِنُني الحُصولُ عَلى شَيْءٍ لِأَشْرَبَهُ مِنْ فَضْلِكَ؟"
D('S0630L01', 'rebuild-rows',
  why=P17 + ' No row says الحُصولُ: all 8 drill "can I | يُمْكِنُني أَنْ" + a verb, which is the earlier LEGO of seed 119. Shrinking to "can I | يُمْكِنُني" is blocked, because "can I" already answers يُمْكِنُني أَنْ at seed 119 (one prompt, two answers). The LEGO stays and the basket is rebuilt as "can I have …" with things taught by this point (something, red wine, a bottle, a table for four), modelled on seed 414\'s "could we have" basket.',
  b={'B01': ('can I have something?', 'هَلْ يُمْكِنُني الحُصولُ عَلى شَيْءٍ؟'),
     'B02': ('can I have red wine?', 'هَلْ يُمْكِنُني الحُصولُ عَلى نَبيذٍ أَحْمَرَ؟'),
     'B03': ('can I have a bottle of red wine?', 'هَلْ يُمْكِنُني الحُصولُ عَلى زُجاجَةِ نَبيذٍ أَحْمَرَ؟'),
     'U01': ('can I have something here?', 'هَلْ يُمْكِنُني الحُصولُ عَلى شَيْءٍ هُنا؟'),
     'U02': ('can I have red wine tonight?', 'هَلْ يُمْكِنُني الحُصولُ عَلى نَبيذٍ أَحْمَرَ اللَّيْلَةَ؟'),
     'U03': ('can I have a bottle of red wine please?', 'هَلْ يُمْكِنُني الحُصولُ عَلى زُجاجَةِ نَبيذٍ أَحْمَرَ مِنْ فَضْلِكَ؟'),
     'U04': ('can I have a table for four please?', 'هَلْ يُمْكِنُني الحُصولُ عَلى طاوِلَةٍ لِأَرْبَعَةٍ مِنْ فَضْلِكَ؟'),
     'U05': ('can I have wine tonight?', 'هَلْ يُمْكِنُني الحُصولُ عَلى نَبيذٍ اللَّيْلَةَ؟')})

# ---- sir / madam LEGOs (seeds 642-654): the LEGO is treated as cut before its closing sir/madam, which goes back on the end of the phrase
K32 = ('Rule for sir/madam LEGOs (Kai, 28 Sep): the LEGO keeps sir/madam, its phrases drill the LEGO minus the honorific, and sir/madam is added back at the END of every phrase on both sides. '
       'So a row that says the core is not a break. Only the rows that miss the core are reworded here, and each reworded row ends in the honorific. ')
D('S0642L01', 'rebuild-rows', ack=['known'],
  why=K32 + 'Core: "how do you feel | كَيْفَ تَشْعُرينَ". Two rows (B01, U04) say "you feel" without "how". The plan tool reports the two reworded rows as not containing the LEGO because the honorific is at the end rather than straight after the core: that is the rule above, answered by hand. Note: with madam the LEGO is 10 syllables, 6 without.',
  b={'B01': ('how do you feel today madam?', 'كَيْفَ تَشْعُرينَ اليَوْم سَيِّدَتي؟'),
     'U04': ('I think I know how you feel madam', 'أَظُنُّ أَنَّني أَعْرِفُ كَيْفَ تَشْعُرينَ سَيِّدَتي'),
     'B02': 'k', 'B03': 'k', 'U01': 'k', 'U02': 'k', 'U03': 'k', 'U05': 'k'})
D('S0644L01', 'kai', why=O19 + 'For that cut: the LEGO is the whole seed and every row but the seed drills only "can you | يُمْكِنُكَ" or "can you say". The Italian precedent for this same seed keeps a short core ("could you") with "say" as the seed\'s other LEGO and sir on the end of every phrase.')
D('S0645L01', 'kai', why=O19 + 'For that cut: five rows miss "I can | أَسْتَطيعُ" (they say I need / I want / can I / she can); the sir/madam rule lets rows drop only the closing madam.')
D('S0646L01', 'kai', why=O19 + 'For that cut: three rows miss "something | شَيْئاً" (they drill "you do" / "what you\'re doing").')
D('S0648L01', 'rebuild-rows', ack=['known'],
  why=K32 + 'Core: "what you said | ما قُلْتِ". B01 says "you said" without "what"; U03 says ماذا قُلْتِ ("what did you say"), a different word from the LEGO\'s ما.',
  b={'B01': ('I heard what you said madam', 'سَمِعْتُ ما قُلْتِ سَيِّدَتي'),
     'U03': ('I know what you said madam', 'أَعْرِفُ ما قُلْتِ سَيِّدَتي'),
     'B02': 'k', 'B03': 'k', 'U02': 'k', 'U04': 'k', 'U05': 'k'})
D('S0651L01', 'rebuild-rows', ack=['known'],
  why=K32 + 'Core: "what do you think | ماذا تَظُنّينَ". Two rows (B01, U04) say "you think" without "what". The plan tool reports the two reworded rows because their English is the statement order "what you think" where the LEGO says "what do you think": the same words in an embedded question, answered by hand.',
  b={'B01': ('I need to know what you think madam', 'أَحْتاجُ أَنْ أَعْرِفَ ماذا تَظُنّينَ سَيِّدَتي'),
     'U04': ('I think I know what you think madam', 'أَظُنُّ أَنَّني أَعْرِفُ ماذا تَظُنّينَ سَيِّدَتي'),
     'B02': 'k', 'B03': 'k', 'U02': 'k', 'U03': 'k', 'U05': 'k'})
D('S0654L02', 'kai', why=O19 + 'For that cut: the LEGO is the whole seed, about 20 syllables; 7 of 9 rows drill "I can help you | أَسْتَطيعُ مُساعَدَتَكَ" or less. "I\'m not sure | لَسْتُ مُتَأَكِّداً" is already taught at seed 10 and "whether | إِنْ" is the seed\'s other LEGO.')

# ---- you-all seeds 657-664
D('S0657L01', 'rebuild-rows',
  why=P17 + ' One build row says "you all feel | تَشْعُرونَ" without "how"; it is reworded. The other rows hold the LEGO (their English says "how you all feel", the same words re-ordered) and stay.',
  b={'B01': ('how do you all feel today?', 'كَيْفَ تَشْعُرونَ اليَوْم؟'),
     'B02': 'k', 'B03': 'k', 'U02': 'k', 'U03': 'k', 'U05': 'k'})
D('S0659L01', 'kai', why=O19 + 'For that cut: the LEGO is the whole question and 8 of 9 rows drill only "you all can | يُمْكِنُكُمْ". The scan\'s suggestion is "can you all | يُمْكِنُكُمْ" + "say that | أَنْ تَقولوا ذلِكَ"; note "can you all | هَلْ يُمْكِنُكُمْ جَميعاً" is already a LEGO at seed 529, so the short piece needs a gloss that does not clash with it.')
D('S0661L02', 'rebuild-rows', ack=['known'],
  why=P17 + ' Two rows say تَفْعَلوا (the form after "to") under "you all do | تَفْعَلونَ"; a different verb form is a break. They are reworded to the taught form.',
  b={'U03': ('you all do something for me', 'أَنْتُمْ تَفْعَلونَ شَيْئاً لي'),
     'U05': ('do you all do that?', 'هَلْ تَفْعَلونَ ذلِكَ؟'), 'U01': 'k'})
D('S0662L01', 'rebuild-rows',
  why=P17 + ' Four rows say أَنْ تَتَكَلَّموه (the form after "to") under "you all speak it | تَتَكَلَّمونَهُ", a different verb form; a fifth (U05) holds the LEGO but is not sound Arabic (أَرْجو أَنْ يُمْكِنُكُمْ تَتَكَلَّمونَهُ). All five are reworded to plain statements and questions with the taught form.',
  b={'B03': ('do you all speak it?', 'هَلْ تَتَكَلَّمونَهُ؟'),
     'U02': ('do you all speak it well?', 'هَلْ تَتَكَلَّمونَهُ جَيِّداً؟'),
     'U03': ('you all speak it very well', 'أَنْتُمْ تَتَكَلَّمونَهُ جَيِّداً جِدّاً'),
     'U04': ('she asked if you all speak it', 'سَأَلَتْ هَلْ تَتَكَلَّمونَهُ'),
     'U05': ('yes, you all speak it well', 'نَعَمْ، أَنْتُمْ تَتَكَلَّمونَهُ جَيِّداً')})
D('S0664L01', 'rebuild-rows',
  why=P17 + ' Five of nine rows already say the whole question هَلْ أَنْتُمْ مُسْتَعِدّونَ, so the LEGO stays. Four rows drop هَلْ and become statements (one of them a different form, تَكونوا مُسْتَعِدّينَ); they are reworded to hold the question.',
  b={'B01': ('are you all ready today?', 'هَلْ أَنْتُمْ مُسْتَعِدّونَ اليَوْم؟'),
     'B02': ('are you all ready here?', 'هَلْ أَنْتُمْ مُسْتَعِدّونَ هُنا؟'),
     'U02': ('I need to know if you all are ready', 'أَحْتاجُ أَنْ أَعْرِفَ هَلْ أَنْتُمْ مُسْتَعِدّونَ'),
     'U05': ('I want to know if you all are ready now', 'أُريدُ أَنْ أَعْرِفَ هَلْ أَنْتُمْ مُسْتَعِدّونَ الآن')})


# ---- second pass, after the builder validator: baskets left short of 3 builds / 5 uses once their broken rows are
# ---- fixed get the missing row(s); the three sir/madam baskets get the honorific on every row (see K32ALL).
def AMEND(id, b=None, add=None, why=''):
    d = next(x for x in OUT if x['id'] == id)
    for k, v in (b or {}).items():
        d.setdefault('basket', {})[k] = 'keep' if v == 'k' else 'del' if v == 'd' else list(v)
    d.setdefault('add', []).extend([list(a) for a in (add or [])])
    d['why'] += ' ' + why


THIN = 'The builder wants 3 build rows that put the LEGO inside a phrase and 5 use rows; with the broken rows fixed this basket was still one short, so one row is added from words already taught.'
AMEND('S0102L03', b={'U04': ('we want to say that the matter is not easy', 'نُريدُ أَنْ نَقولَ إِنَّ الأَمْرَ لَيْسَ سَهْلاً')})
AMEND('S0109L02', add=[('u', 'we hope to learn new words in Arabic', 'نَأْمَلُ أَنْ نَتَعَلَّمَ كَلِماتٍ جَديدَةً بِالعَرَبِيَّةِ')], why=THIN)
AMEND('S0410L01', b={'U02': ('she was right that they are with each other', 'كانَتْ عَلى حَقٍّ أَنَّهُمْ مَعَ بَعْضِهِمْ')},
      add=[('u', 'she told me she thinks they are with each other', 'قالَتْ لي إِنَّها تَظُنُّ أَنَّهُمْ مَعَ بَعْضِهِمْ')],
      why='U02 used يَكونوا, a form not taught by this seed, and is reworded; one use row is added to reach five.')
AMEND('S0499L02', add=[('b', 'we want to open the door', 'نُريدُ أَنْ نَفْتَحَ البابَ')], why=THIN)
AMEND('S0570L02', add=[('b', 'you are willing to pay for it', 'أَنْتَ مُسْتَعِدٌّ أَنْ تَدْفَعَ')], why=THIN)
AMEND('S0619L04', add=[('b', 'I think we saw each other', 'أَظُنُّ أَنَّنا رَأَيْنا بَعْضَنا')], why=THIN)
AMEND('S0657L01', add=[('u', 'how do you all feel this morning?', 'كَيْفَ تَشْعُرونَ هٰذا الصَّباح؟')], why=THIN)
AMEND('S0661L02', add=[('b', 'what you all do', 'ما تَفْعَلونَ')], why=THIN)
AMEND('S0662L01', add=[('b', 'you all speak it now', 'تَتَكَلَّمونَهُ الآن')], why=THIN)
AMEND('S0664L01', add=[('u', 'are you all ready this morning?', 'هَلْ أَنْتُمْ مُسْتَعِدّونَ هٰذا الصَّباح؟')], why=THIN)

K32ALL = ('SECOND PASS: the builder only accepts a row that holds the LEGO with its madam, and the sir/madam rule itself says the honorific goes back on the END of EVERY phrase. '
          'So every row of this basket now ends in madam on both sides (the Italian course did the same for these seeds), re-ordered where needed so the core and madam close the phrase. '
          'The plan tool still lists rows whose English is the statement order (how you feel / what you think) against the question gloss (how do you feel): the same words inside an embedded question, answered by hand; the builder passes them.')
AMEND('S0642L01', why=K32ALL, b={
    'B01': ('I know how you feel madam', 'أَعْرِفُ كَيْفَ تَشْعُرينَ سَيِّدَتي'),
    'B02': ('I want to know how you feel madam', 'أُريدُ أَنْ أَعْرِفَ كَيْفَ تَشْعُرينَ سَيِّدَتي'),
    'B03': ('I need to know how you feel madam', 'أَحْتاجُ أَنْ أَعْرِفَ كَيْفَ تَشْعُرينَ سَيِّدَتي'),
    'U01': ('now how do you feel madam?', 'الآن كَيْفَ تَشْعُرينَ سَيِّدَتي؟'),
    'U02': ('she asked how do you feel madam', 'سَأَلَتْ كَيْفَ تَشْعُرينَ سَيِّدَتي'),
    'U03': ('I think I know how you feel madam', 'أَظُنُّ أَنَّني أَعْرِفُ كَيْفَ تَشْعُرينَ سَيِّدَتي'),
    'U04': ('today how do you feel madam?', 'اليَوْم كَيْفَ تَشْعُرينَ سَيِّدَتي؟'),
    'U05': ('she said she wants to know how you feel madam', 'قالَتْ إِنَّها تُريدُ أَنْ تَعْرِفَ كَيْفَ تَشْعُرينَ سَيِّدَتي')})
AMEND('S0648L01', why=K32ALL, b={
    'B01': ('I heard what you said madam', 'سَمِعْتُ ما قُلْتِ سَيِّدَتي'),
    'B02': ('I know what you said madam', 'أَعْرِفُ ما قُلْتِ سَيِّدَتي'),
    'B03': ('I heard just now what you said madam', 'سَمِعْتُ الآن ما قُلْتِ سَيِّدَتي'),
    'U02': ('I think I heard what you said madam', 'أَظُنُّ أَنَّني سَمِعْتُ ما قُلْتِ سَيِّدَتي'),
    'U03': ('I think I know what you said madam', 'أَظُنُّ أَنَّني أَعْرِفُ ما قُلْتِ سَيِّدَتي'),
    'U04': ('I think I agree with what you said madam', 'أَظُنُّ أَنَّني أَتَّفِقُ مَعَ ما قُلْتِ سَيِّدَتي'),
    'U05': ('she said she heard what you said madam', 'قالَتْ إِنَّها سَمِعَتْ ما قُلْتِ سَيِّدَتي')})
AMEND('S0651L01', why=K32ALL, b={
    'B01': ('I need to know what you think madam', 'أَحْتاجُ أَنْ أَعْرِفَ ماذا تَظُنّينَ سَيِّدَتي'),
    'B02': ('I want to know what you think madam', 'أُريدُ أَنْ أَعْرِفَ ماذا تَظُنّينَ سَيِّدَتي'),
    'B03': ('now what do you think madam?', 'الآن ماذا تَظُنّينَ سَيِّدَتي؟'),
    'U02': ('she wants to know what you think madam', 'تُريدُ أَنْ تَعْرِفَ ماذا تَظُنّينَ سَيِّدَتي'),
    'U03': ('she asked what you think madam', 'سَأَلَتْ ماذا تَظُنّينَ سَيِّدَتي'),
    'U04': ('I think I know what you think madam', 'أَظُنُّ أَنَّني أَعْرِفُ ماذا تَظُنّينَ سَيِّدَتي'),
    'U05': ('can I know what you think madam?', 'هَلْ يُمْكِنُني أَنْ أَعْرِفَ ماذا تَظُنّينَ سَيِّدَتي؟')},
    add=[('u', 'I think she wants to know what you think madam', 'أَظُنُّ أَنَّها تُريدُ أَنْ تَعْرِفَ ماذا تَظُنّينَ سَيِّدَتي')])

json.dump({'course': 'ara_for_eng', 'legos': OUT, 'roman': ROMAN}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ara_for_eng.json'), 'w'), ensure_ascii=False, indent=1)
print(len(OUT), 'decisions')
