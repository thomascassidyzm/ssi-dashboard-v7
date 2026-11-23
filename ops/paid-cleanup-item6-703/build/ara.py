import sys, os
sys.path.insert(0, os.path.dirname(__file__)); from common import *
RY = 'Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005)'
for C in ['ara_for_eng', 'ara_eg_for_eng']:
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
    SW = 'not in the scan list; same defect in the same basket (R0.4 step 3)'
    if C == 'ara_for_eng':
        INNA = RY + ' §"inna and her sisters": the subject (ism) of أَنَّ/إِنَّ is accusative'
        K21 = ' The scan\'s أَصْدِقاءَنا جاءوا is a surface form no LEGO teaches (K21/R0.2; جاءوا was already untaught here), so the row is rebuilt from taught pieces: أَنَّهُ S0135L02, إِنَّهُ S0143L01, جاءَ S0454L01'
        ed('S0454L03U05', 'أَنَّ + nominative أَصْدِقاؤُنا', known='she knows he came to us', target='تَعْرِفُ أَنَّهُ جاءَ إِلَيْنا', source=INNA + '.' + K21)
        ed('S0454L04U02', 'أَنَّ + nominative أَصْدِقاؤُنا; and تَظُنَّ (subjunctive) with no particle to govern it', known='she thinks he came at about six', target='تَظُنُّ أَنَّهُ جاءَ حَوالَيِ السّاعَةِ السّادِسَةِ', source=INNA + '; ' + RY + ' §moods: the imperfect is indicative unless governed (أَنْ, لَنْ, لَمْ…).' + K21)
        ed('S0454L04U05', 'إِنَّ + nominative أَصْدِقاؤُنا', known='she says he came at about six o\'clock', target='تَقولُ إِنَّهُ جاءَ حَوالَيِ السّاعَةِ السّادِسَةِ', source=INNA + '.' + K21, note=SW)
        LAYSA = RY + ' §"kana and her sisters": the predicate of لَيْسَ/كانَ is accusative'
        ed('S0627L01B03', 'predicate of لَيْسَتْ in the nominative', target='قالَتْ إِنَّها لَيْسَتْ جاهِزَةً', source=LAYSA)
        ed('S0627L01U02', 'predicate of لَيْسَتْ in the nominative', target='قالَ إِنَّها لَيْسَتْ جاهِزَةً', source=LAYSA)
        ed('S0627L01U04', 'predicate of كانَتْ in the nominative', target='هَلْ تَعْرِفُ إِنْ كانَتْ جاهِزَةً؟', source=LAYSA)
        # S0396L02 rebuild (P24): الجَميعُ مُسْتَعِدّينَ only inside a كان/يكون frame
        P24 = ('P24: the LEGO الجَميعُ مُسْتَعِدّينَ is correct only inside a كان/يكون frame (مُسْتَعِدّينَ is the accusative predicate of يَكونَ in the seed); '
               'every phrase must supply the frame. ' + LAYSA + '; nominal sentence predicate is nominative (مُسْتَعِدّونَ) — ' + RY + ' §equational sentences')
        ed('S0396L02B01', 'هُمْ مُسْتَعِدّينَ: nominal-sentence predicate in the accusative; row does not contain its LEGO (P17)', known='everybody will be ready', target='سَيَكونُ الجَميعُ مُسْتَعِدّينَ', source=P24 + '; سَيَكونُ S0090L03')
        ed('S0396L02B02', 'الجَميعُ مُسْتَعِدّينَ with no كان-frame: accusative predicate in a nominal sentence', known='everybody was ready', target='كانَ الجَميعُ مُسْتَعِدّينَ', source=P24, note=SW)
        ed('S0396L02B03', 'هَلْ هُمْ مُسْتَعِدّينَ: same case error; does not contain its LEGO', known='was everybody ready?', target='هَلْ كانَ الجَميعُ مُسْتَعِدّينَ؟', source=P24)
        ed('S0396L02B04', 'أَنَّهُمْ مُسْتَعِدّينَ: khabar of أَنَّ must be nominative; does not contain its LEGO', known='when everybody is ready', target='عِنْدَما يَكونُ الجَميعُ مُسْتَعِدّينَ', source=P24 + '; عِنْدَما S0034L03')
        ed('S0396L02U01', 'هَلِ الجَميعُ مُسْتَعِدّينَ: no كان-frame', known='will everybody be ready on Friday night?', target='هَلْ سَيَكونُ الجَميعُ مُسْتَعِدّينَ لَيْلَةَ الجُمُعَةِ؟', source=P24 + '; لَيْلَةَ الجُمُعَةِ already in this basket (U05)', note=SW)
        ed('S0396L02U02', 'أَنَّ الجَميعَ مُسْتَعِدّينَ: khabar of أَنَّ must be nominative (and the LEGO\'s الجَميعُ is lost)', known='I think everybody will be ready', target='أَظُنُّ أَنَّهُ سَيَكونُ الجَميعُ مُسْتَعِدّينَ', source=P24 + '; أَنَّهُ + verbal sentence (ḍamīr al-shaʾn), ' + RY + ' §"anna + pronoun of the fact"', conf='likely', note=SW)
        ed('S0396L02U04', 'أَنَّ الناسَ … مُسْتَعِدّينَ: khabar of أَنَّ must be nominative; row does not contain its LEGO', known='was everybody ready at the entrance?', target='هَلْ كانَ الجَميعُ مُسْتَعِدّينَ عِنْدَ المَدْخَلِ؟', source=P24 + '; عِنْدَ المَدْخَلِ from this row')
        ed('S0396L02U05', 'أَنَّهُمْ مُسْتَعِدّينَ: khabar of أَنَّ must be nominative; row does not contain its LEGO', known='everybody will be ready for Friday night', target='سَيَكونُ الجَميعُ مُسْتَعِدّينَ لَيْلَةَ الجُمُعَةِ', source=P24)
        ed('S0134L01U01', 'ذٰلِكَ (masculine) with لَيْسَتْ (feminine)', known='it\'s not a problem because he\'s here', target='لَيْسَتْ مُشْكِلَةً لِأَنَّهُ هُنا', source=RY + ' §laysa agrees with its subject. The scan\'s ذٰلِكَ لَيْسَ would no longer contain the LEGO لَيْسَتْ مُشْكِلَةً (P17/K50), and أَنَّها is untaught at 134, so the row is rebuilt from taught pieces: لِأَنَّهُ S0130L02, هُنا (B04)', conf='likely')
        ed('S0134L01B03', 'ذٰلِكَ (masculine) with لَيْسَتْ (feminine)', known='that\'s why it\'s not a problem', target='لِذٰلِكَ لَيْسَتْ مُشْكِلَةً', source='as U01; لِذٰلِكَ S0105L01 (no later sibling, P2)', conf='sure', note=SW)
        de('S0134L01U03', 'ذٰلِكَ (masculine) with لَيْسَتْ (feminine); and "at all" is not in the Arabic', source='as U01; no taught "that it" form exists at 134 to rebuild it', note=SW + '; USE floor 5 → 4 (warn-only)')
        de('S0665L01U05', 'أَنْ يُمْكِنُكُمْ تَذْهَبوا: indicative after أَنْ, and two verbs with no أَنْ between them', source=RY + ' §subjunctive after أَنْ. Not rewritten: the correct Arabic for this English is seed 668\'s own sentence (أَرْجو أَنْ تَسْتَطيعوا الذَّهابَ, S0668L01U01), untaught at 665, and any other form gives "I hope you all can go" two answers (P16). Basket keeps 5 USE.')
        SUBJ = RY + ' §moods: تَسْتَطيعوا (subjunctive/jussive, nūn dropped) only after أَنْ/لَنْ/لَمْ; the LEGO is أَنْ تَسْتَطيعوا, so per P24 each row keeps the أَنْ frame'
        ed('S0668L01B01', 'bare تَسْتَطيعوا: subjunctive with nothing to govern it; not its LEGO (أَنْ تَسْتَطيعوا)', known='she wants you all to be able to', target='هِيَ تُريدُ أَنْ تَسْتَطيعوا', source=SUBJ + '; هِيَ تُريدُ from U03')
        ed('S0668L01B03', 'أَنَّهُ تَسْتَطيعوا: wrong pronoun and mood', known='you all want to be able to', target='تُريدونَ أَنْ تَسْتَطيعوا', source=SUBJ + '; تُريدونَ S0658L01', conf='likely')
        ed('S0668L01U02', 'هَلْ تَسْتَطيعوا: subjunctive after هَلْ; not its LEGO', known='I hope you all can say that', target='أَرْجو أَنْ تَسْتَطيعوا أَنْ تَقولوا ذلِكَ', source=SUBJ + '; أَنْ تَقولوا ذلِكَ S0659L01 (تَفْعَلوا is untaught)')
        de('S0668L01U04', 'هَلْ تَسْتَطيعوا: subjunctive after هَلْ; not its LEGO', source=SUBJ + '; no taught rewrite that is not a near-copy of U02/U03; basket keeps 6 USE')
        ed('S0668L01U05', 'تَسْتَطيعوا with no governor and أَنْ تَفْعَلونَ (indicative after أَنْ)', known='do you all want to be able to say that?', target='هَلْ تُريدونَ أَنْ تَسْتَطيعوا أَنْ تَقولوا ذلِكَ؟', source=SUBJ + '; تَفْعَلوا untaught', note=SW)
        ed('S0438L01B01', '"they want | يُريدوا": jussive with no لَمْ; not its LEGO (لَمْ يُريدوا)', known='they didn\'t want that', target='لَمْ يُريدوا ذلِكَ', source=RY + ' §jussive after لَمْ; rewritten to keep BUILD floor')
        ed('S0438L01U04', 'هَلْ تَظُنَّ: subjunctive with no governor', target='هَلْ تَظُنُّ أَنَّهُمْ لَمْ يُريدوا أَنْ يَجْمَعوا؟', source=RY + ' §moods', note=SW)
        ed('S0427L02B01', 'bare تَظُنَّ: subjunctive with no governor; not its LEGO (أَنْ تَظُنَّ)', known='I don\'t want you to think', target='لا أُريدُ أَنْ تَظُنَّ', source=RY + ' §moods; لا أُريدُ S0019L04')
        ed('S0427L02U05', 'هَلْ تَظُنَّ: subjunctive with no governor; not its LEGO', known='I don\'t want you to think they understand each other', target='لا أُريدُ أَنْ تَظُنَّ أَنَّهُمْ يَفْهَمونَ بَعْضَهُمْ', source=RY + ' §moods')
        ed('S0427L02U03', 'هَلْ تَظُنَّ: subjunctive with no governor; not its LEGO', known='he doesn\'t want you to think they would like to lead', target='لا يُريدُ أَنْ تَظُنَّ أَنَّهُمْ يَوَدّونَ أَنْ يَقودوا', source=RY + ' §moods; لا يُريدُ S0034L01', note=SW)
        ed('S0154L01B02', 'نَلْتَقِيَ (subjunctive) in a direct question with no أَنْ', target='أَيْنَ نَلْتَقي لَيْلَةَ السَّبْت؟', source=RY + ' §moods')
        ed('S0154L01B03', 'نَلْتَقِيَ (subjunctive) with no أَنْ', target='نَلْتَقي لَيْلَةَ السَّبْت', source=RY + ' §moods', note=SW)
        ed('S0635L01U05', '"the bag" over indefinite إِنَّ حَقيبَةً; the scan\'s الحَقيبَةَ would no longer contain the LEGO حَقيبَةً (P17)', known='she said she wants a bag', target='قالَتْ إِنَّها تُريدُ حَقيبَةً', source='P17; قالَتْ إِنَّها and تُريدُ حَقيبَةً are this basket\'s own (U03, B03)', conf='sure')
        ed('S0630L01U05', '"understand" over أَتَعَلَّمَ ("learn")', target='هَلْ يُمْكِنُني أَنْ أَفْهَمَ ما تَقولُهُ؟', source='meaning; أَفْهَمُ S0078L01 (subjunctive after أَنْ)')
        ed('S0415L01U04', '"the problem" over indefinite مُشْكِلَةٍ; the scan\'s المُشْكِلَةِ would break the LEGO مُشْكِلَةً', known='I asked about a problem here', source='P17; English follows the Arabic', conf='sure')
        ed('S0136L02B04', 'ends on a dangling أَنْ', known='can you ask?', target='هَلْ يُمْكِنُكَ أَنْ تَسْأَلَ؟', source='L22 (a bound أَنْ grows to its verb); تَسْأَل is the seed\'s own (B02)')
    else:
        ed('S0441L01U02', '"this approach" but no demonstrative', known='this really is a hard approach', target='بجد ده أسلوب صعب', source='Egyptian demonstrative ده (Woidich, Das Kairenisch-Arabische §demonstratives; course S0329L01 ده مهم). Kept أسلوب indefinite so the row still contains its LEGO (the scan\'s الأسلوب ده would not)', conf='likely')
        ed('S0441L01U04', '"this approach" but no demonstrative', known='this is still a hard approach', target='ده لسه أسلوب صعب', source='as U02', conf='likely')
        de('S0047L02U03', 'حاجة كويس: حاجة is feminine (كويسة); the correct row "this is a good thing | دي حاجة كويسة" already exists as S0047L03U01, and this one clashes with it (same English, two answers)', source='Egyptian adjective agreement (Abdel-Massih, An Introduction to Egyptian Arabic §agreement); P16. Rewriting here would use كويسة before its own LEGO (S0047L03, later sibling — P2)', conf='sure', note='L02 USE floor drops; the two remaining L02 USE rows (U02, U05: إن دي مفيد) have the same agreement error and no feminine adjective is taught by seed 47 to fix them — listed, not changed')
        de('S0047L02U04', 'حاجة كويس (as U03); the correct row exists as S0047L03U02 and this one clashes with it', source='as U03', conf='sure')
        for r in ['SEED93', 'S0093L01U01', 'S0093L01U04']:
            hold(r, 'not Egyptian: الوقت إن نمشي / بقى وقت نمشي', 'The natural Egyptian (جه الوقت نمشي) uses جه, which no LEGO teaches, and seed 93 has one LEGO (نمشي) with the rest untiled (S3). A text edit puts an untaught word in two USE rows (P1); the real fix is a new LEGO "it\'s time | جه الوقت" with its own basket — a structural seed rebuild on a beta course (lego.insert needs Tom\'s or Kai\'s explicit go). Listed as a rebuild.')
    write(C, E)
    print('scope rows not covered:', [r for r in sc if r not in {e['row'] for e in E}])
