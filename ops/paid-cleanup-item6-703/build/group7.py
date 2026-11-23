import sys, os
sys.path.insert(0, os.path.dirname(__file__)); from common import *
ALL = {}
def course(C):
    d, idx = index(C)
    sc = {}
    for r in scope(C):
        rid = r['rid']
        if rid.startswith('seed:'): rid = 'SEED' + rid.split(':')[1]
        if ' + seed' in rid: rid = rid.split(' ')[0]
        sc[rid] = r['n']
    E = []
    def ed(rid, defect, known=None, target=None, source='', conf='sure', note='', extra=None):
        cur = row_text(idx, rid)
        e = entry(idx, C, rid, defect, 'edit', {'known': known if known is not None else cur['known'], 'target': target if target is not None else cur['target']}, source, conf, sc.get(rid), note)
        if extra: e['new'].update(extra)
        E.append(e)
    def de(rid, defect, source='', conf='sure', note=''):
        E.append(entry(idx, C, rid, defect, 'delete', None, source, conf, sc.get(rid), note))
    def hold(rid, defect, why, action='hold'):
        E.append(entry(idx, C, rid, defect, action, None, why, 'n/a', sc.get(rid)))
    return d, idx, sc, E, ed, de, hold
# ---------------- ita ----------------
C = 'ita_for_eng'; d, idx, sc, E, ed, de, hold = course(C)
SUBJ = ('Serianni, Grammatica italiana XIV §§ on the subjunctive in relative clauses after a superlative / il minimo / l\'unico (il minimo che potessi fare). '
        'P24: the LEGO che potessi fare is right only after such a trigger, so every row supplies one')
hold('S0479L02', 'scan: re-gloss "that I could do" and a heads-up intro', 'Not re-glossed: the seed English has no "that" (L26). The phrase half of P24 is done below; a PR3 heads-up intro is optional (SOFT) and is presentation authoring — not done here.', action='keep')
ed('S0479L02B03', '"tutto quello che potessi fare": no superlative trigger', known='it was the least I could do', target='era il minimo che potessi fare', source=SUBJ + '; era S0086')
ed('S0479L02U02', '"it\'s not the least I could do" means nothing', known='it was the least I could do for you', target='era il minimo che potessi fare per te', source=SUBJ + ' (davvero is untaught)', conf='likely')
ed('S0479L02U04', 'no trigger, garbled English', known='it\'s the least I could do for her', target='è il minimo che potessi fare per lei', source=SUBJ + ' (unica is untaught)', conf='likely')
ed('S0479L02U05', '"le ho chiesto di quello che potessi fare" is not Italian', known='I think it\'s the least I could do', target='penso che sia il minimo che potessi fare', source=SUBJ + '; penso che + congiuntivo (sia)', conf='likely')
ed('S0497L03U03', '"sembra che … possa" for "could" (possibility)', target='sembra che potrebbe essere importante', source='K35 (Kai 2026-09-29): think/seem … could → potrebbe, not possa', conf='likely')
for r in ['S0390L01', 'S0640L02']:
    hold(r, '"the one | quella": nothing in the English says a woman, so the learner cannot predict quella over quello',
         'Italian must choose a gender the English does not show. A heads-up intro (PR3) does not make the prompt deterministic; the real choice is a presentation design plus context in every row (K23) — not settled by a source, scan confidence "best guess". Left as is and listed.')
ed('S0117L01U04', '"devo sicuramente più tempo" is not Italian (dovere + noun = owe)', target='ho sicuramente bisogno di più tempo', source='Treccani "dovere" (transitive = to owe); avere bisogno di', conf='sure')
ed('S0642L02U05', 'English "after that" over "dopo tutto questo" (after all this)', known='how do you feel after all this?', source='meaning')
ed('S0657L01B03', 'English "after that" over "dopo tutto questo"', known='how do you all feel after all this?', source='meaning')
ed('S0642L01U07', 'madam mid-sentence; K32 puts the address at the end', known='I want to speak with you as soon as I can, madam', target='voglio parlare con lei appena posso, signora', source='K32')
ed('S0639L02U05', 'sir mid-sentence (K32); and "con lei oggi, signore" would split the LEGO con lei, signore (P17)', known='today I want to speak with you sir', target='oggi voglio parlare con lei, signore', source='K32 + P17 (oggi moved to the front)')
ALL[C] = E
# ---------------- spa ----------------
C = 'spa_for_eng'; d, idx, sc, E, ed, de, hold = course(C)
DIS = ('disfrutar takes de + noun or a gerund ("disfruto leyendo"); "disfrutar + infinitivo" is a calque (Fundéu, "disfrutar de / disfrutar + gerundio"; precedent #442·AI applied the same fix). '
       'The gerund despertándome is untaught and would break the LEGO despertarme (P17), so these rows take the seed\'s own "me gusta" and the English "like" (one Spanish verb per English verb, P16)')
ed('S0055L01B03', 'disfrutar + infinitive', known='I don\'t like waking up', target='No me gusta despertarme', source=DIS)
ed('S0055L01B05', 'disfrutar + infinitive', known='I like waking up', target='Me gusta despertarme', source=DIS)
ed('S0055L01U01', 'disfrutar + infinitive (and the "like" version would copy B06)', known='I don\'t like waking up when I\'m very tired', target='No me gusta despertarme cuando estoy muy cansado', source=DIS, conf='likely')
ed('S0055L01U03', 'disfrutar + infinitive', known='I don\'t like waking up when I\'m starting to feel tired', target='No me gusta despertarme cuando estoy empezando a sentirme cansado', source=DIS)
ed('S0108L02U09', 'disfrutar + infinitive', known='I don\'t like stopping in the middle of something I\'m just beginning to understand', target='No me gusta parar en medio de algo que estoy empezando a entender', source=DIS)
ed('S0216L04U14', 'disfrutar + infinitive', known='I really like being able to talk with my friends at the weekend', target='Me gusta mucho poder hablar con mis amigos el fin de semana', source=DIS)
ed('S0243L03U08', 'disfrutar + infinitive', known='I don\'t like eating when I\'m feeling tired', target='No me gusta comer cuando me siento cansado', source=DIS)
TEN = '"¿podría tener…?" is a calque of "could I have"; ordering is pedir / "¿me da(s)…?" (Fundéu on calques of "can I have"; RAE DPD "tener")'
ed('S0586L01U01', 'tener calque for ordering', target='¿podría pedir unos huevos cocidos, por favor?', source=TEN, conf='likely')
ed('S0586L02U02', 'tener calque for ordering', target='¿podría pedir veinte huevos cocidos?', source=TEN, conf='likely')
ed('S0156L02U02', 'tener calque ("¿Puedo tener un momento…?")', known='I need a moment to think before I answer', target='Necesito un momento para pensar antes de contestar', source=TEN + '; me das is untaught, so the row takes the basket\'s own necesito un momento para (U09)', conf='sure')
de('S0189L01U03', '"tomar algo de tiempo para" — with time the verb is pronominal (tomarse)', source='RAE DPD "tomar(se)"; tomarse and tomar are both untaught at 189, so no fix inside taught words; the basket keeps 11 USE')
ed('S0060L01U11', '"practicar decir": practicar + infinitive', target='Necesito practicar cómo decir palabras diferentes cuando hablo español', source='Deborah\'s item 10 shape (practicar cómo decir); cómo decir is seed 60\'s own', conf='likely', note='the wider "practicar hablando" question (#443) is a separate open item and is not touched')
ALL[C] = E
# ---------------- fra ----------------
C = 'fra_for_eng'; d, idx, sc, E, ed, de, hold = course(C)
SUB = ('Grevisse, Le bon usage §1123: ne pas penser que + subjonctif (ce soit), not indicative c\'est. ce soit is untaught until S0330 (P1), so each row is rebuilt on the seed\'s own taught frame '
       '"je ne pense pas qu\'elle pourrait …" (the seed sentence uses it)')
for rid, k, t in [('S0318L01U02', 'I don\'t think she could come', 'je ne pense pas qu\'elle pourrait venir'),
                  ('S0318L01U03', 'I don\'t think she could stay', 'je ne pense pas qu\'elle pourrait rester'),
                  ('S0318L01U04', 'I don\'t think she could help', 'je ne pense pas qu\'elle pourrait aider'),
                  ('S0318L01U05', 'I don\'t think she could do it', 'je ne pense pas qu\'elle pourrait le faire'),
                  ('S0318L01U06', 'I don\'t think she could wait', 'je ne pense pas qu\'elle pourrait attendre')]:
    ed(rid, 'je ne pense pas que + indicative (c\'est)', known=k, target=t, source=SUB, conf='sure')
ed('S0469L01B02', '"grand chose" is spelled grand-chose, and "doesn\'t mean anything" over it is wrong (grand-chose = much); plain "doesn\'t mean much" is B03\'s English', known='that doesn\'t really mean much', target='ça ne veut pas dire grand-chose', source='Larousse "grand-chose" (with hyphen; pas grand-chose = not much)', conf='sure', note='target is a spelling change only: same words spoken, keep the clips')
ed('S0555L04B02', 'spelling "grand chose"', target='et je suis trop fatigué pour faire grand-chose', source='Larousse "grand-chose"', conf='sure', note='spelling only: keep the clips')
de('S0413L01B03', '"no we could | non nous pourrions" contradicts itself', source='meaning', note='BUILD floor drops (warn-only)')
ALL[C] = E
# ---------------- zho_for_jpn ----------------
C = 'zho_for_jpn'; d, idx, sc, E, ed, de, hold = course(C)
ed('SEED20', 'Japanese says 覚えたい ("want to memorise"); Chinese says 学 (learn)', target='你想快点记住他的名字。', source='seed contradicts its own known (S15 sense 2); 记住 taught at S0006L01; main course zho seed 20 says 记住', conf='sure')
ed('S0020L03U01', 'seed copy: Japanese 覚えたい over 学', target='你想快点记住他的名字', source='as seed 20', conf='sure')
hold('S0020L03B03', 'scan: 学 → 记住', 'Not a defect: this row\'s Japanese is 学びたい ("want to learn"), so 学 is right; the scan applied the seed fix to a row whose known differs.', action='keep')
ed('SEED92', '继续做这个一会儿: a duration phrase does not follow a non-personal object', target='我想继续做一会儿这个。', source='Chinese Grammar Wiki, "Expressing duration": V + duration + object unless the object is a personal pronoun (等我一会儿 is right because 我 is personal)', conf='likely')
ed('S0092L03B03', 'as seed 92', target='做一会儿这个。', source='as seed 92', conf='likely')
ed('SEED283', 'the English word "Chinese" inside both the Japanese and the Chinese', known='中国語を話す友だち、誰がいる？', target='你哪些朋友会说中文？', source='中文 taught S0001L03; 中国語 is the Japanese', conf='sure')
ed('S0283L02', 'LEGO target "chinese" is an English word; once it says 中文 it repeats S0001L03, so it is not new', target='中文', source='as seed 283; is_new false (a second debut of a taught word)', conf='sure', extra={'is_new': False})
for p in idx['S0283L02'][2]['phrases']:
    pid = p['id'].split(':')[-1] if ':' in p['id'] else None
    if pid and 'chinese' in (p['target'] or '').lower():
        ed(pid, 'English word "chinese" in the Chinese', target=p['target'].replace('chinese', '中文').replace('Chinese', '中文'), source='as seed 283', conf='sure', note='not in the scan list; same defect in the same basket')
ALL[C] = E
# ---------------- deu / deu_ch / eng_for_hin ----------------
C = 'deu_for_eng'; d, idx, sc, E, ed, de, hold = course(C)
hold('S0513L03B01', 'scan: ich bewege → ich bewege mich', 'Already fixed live: the row reads "ich bewege mich" (re-read 18 Nov).', action='already-fixed')
ALL[C] = E
C = 'deu_ch_for_eng'; d, idx, sc, E, ed, de, hold = course(C)
ed('S0642L01U03', '"ich cha Sie hälfe": hälfe (helfen) takes the dative (Ihne); and the dative form would no longer contain the LEGO Sie (P17)', known='can you help me, madam?', target='chönd Sie mir hälfe?', source='Duden "helfen" (+ Dativ); Swiss German polite chönd Sie (Idiotikon / Schweizer Standard), mir = dative "me"; "madam" in the English keeps it apart from the du-form chasch mir hälfe (S0512) — K10 rule 1', conf='likely')
ALL[C] = E
C = 'eng_for_hin'; d, idx, sc, E, ed, de, hold = course(C)
ed('S0001L01C02', 'component चाहता हूँ (male) under the LEGO मैं चाहती हूँ (female, Kriti)', known='चाहती हूँ', source='the LEGO\'s own form; Hindi verb agreement with a female speaker', conf='sure', note='component tile: text only, never spoken (no audio)')
ALL[C] = E
for c, E in ALL.items():
    write(c, E)
