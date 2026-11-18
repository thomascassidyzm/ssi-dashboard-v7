import sys, os
sys.path.insert(0, os.path.dirname(__file__)); from common import *
C = 'por_for_eng'
d, idx = index(C)
sc = {r['rid']: r['n'] for r in scope(C)}
E = []
def ed(rid, defect, known=None, target=None, source='', conf='sure', note=''):
    cur = row_text(idx, rid)
    E.append(entry(idx, C, rid, defect, 'edit', {'known': known if known is not None else cur['known'], 'target': target if target is not None else cur['target']}, source, conf, sc.get(rid), note))
def de(rid, defect, source='', conf='sure', note=''):
    E.append(entry(idx, C, rid, defect, 'delete', None, source, conf, sc.get(rid), note))
def keep(rid, defect, why, conf='likely'):
    E.append(entry(idx, C, rid, defect, 'keep', None, why, conf, sc.get(rid)))
SW = 'not in the scan list; same defect in the same basket (R0.4 step 3)'
REP = ('Reported speech keeps the reported clause\'s own person when the reporter repeats what someone said about "us/you": '
       'the Portuguese says nós/tua, so the English says we/your (Cunha & Cintra, Nova Gramática do Português Contemporâneo, discurso indireto). '
       'The Portuguese is correct and is the seed\'s own; only the English changes (known-side clip only).')
TAIL = 'the "…today/yesterday" tail is moved next to "said", where it means something (it was filler at the end); the rest is the seed\'s own words'
P = {  # P1 English person fixes
 'S0580L01U02': 'she said we\'ve often wanted to take the children somewhere a little warmer',
 'S0580L01U03': 'he said we\'ve often wanted to take the children somewhere a little warmer',
 'S0580L01U04': 'they said we\'ve often wanted to take the children somewhere a little warmer',
 'S0601L02U02': 'she said we were talking about how it started',
 'S0601L02U03': 'he said we were talking about how it all started',
 'S0601L02U04': 'they said we were talking about it',
 'S0603L03U02': 'she said we didn\'t have anywhere to live at the time',
 'S0603L03U03': 'he said we didn\'t have anywhere to live at the time',
 'S0612L01U01': 'she said we would have bought something',
 'S0612L01U02': 'he said we would have bought something',
 'S0612L01U03': 'they said we would have bought something',
 'S0620L02U02': 'she said it\'s a very long time since we last saw each other',
 'S0620L02U03': 'he said it\'s a very long time since we last saw each other',
 'S0620L02U04': 'they said it\'s a very long time since we last saw each other',
 'S0614L03U02': 'she said it\'s near where your family live',
 'S0614L03U03': 'he said it\'s near where your family live',
 'S0614L03U04': 'they said it\'s near where your family live',
}
for rid, k in P.items():
    ed(rid, 'English keeps "they/her/his" while the Portuguese says nós/tua (reported speech must follow the target)', known=k, source=REP)
ed('S0580L01U05', 'English person (they) vs nós; and a filler "today" tail', known='she said today we\'ve often wanted to take the children somewhere a little warmer', target='ela disse hoje que nós muitas vezes quisemos levar as crianças a um sítio um pouco mais quente', source=REP + '; ' + TAIL, conf='likely')
ed('S0601L02U05', 'English person; filler "today" tail', known='she said today we were talking about how it started', target='ela disse hoje que estávamos a falar sobre como começou', source=REP + '; ' + TAIL, conf='likely')
ed('S0603L03U04', 'English person; and the Portuguese stops at "não tínhamos" (nothing had)', known='they said we didn\'t have anywhere to live', target='disseram que nós não tínhamos onde viver', source=REP + '; onde viver is the seed\'s own (S0603L01 viver)', conf='sure')
ed('S0603L03U05', 'English person; filler "yesterday" tail', known='she said yesterday we didn\'t have anywhere to live at the time', target='ela disse ontem que nós não tínhamos onde viver na altura', source=REP + '; ' + TAIL, conf='likely')
for rid, who, pt in [('S0605L02U02', 'she', 'ela'), ('S0605L02U03', 'he', 'ele'), ('S0605L02U04', 'they', '')]:
    ed(rid, 'English person (they) vs nós; and "said because" has no object in either language', known=f'{who} said that because we needed help', target=(f'{pt} disse isso' if pt else 'disseram isso') + ' porque nós precisávamos de ajuda',
       source=REP + '; "disse isso porque" = "said that because" (isso, the object, is taught throughout)', conf='likely')
ed('S0605L02U05', 'as U02, plus a filler "yesterday" tail', known='she said that yesterday because we needed help', target='ela disse isso ontem porque nós precisávamos de ajuda', source=REP + '; ' + TAIL, conf='likely')
ed('S0612L01U04', 'English person; filler "yesterday" tail', known='she said yesterday we would have bought something', target='ela disse ontem que nós teríamos comprado algo', source=REP + '; ' + TAIL, conf='likely')
ed('S0620L02U05', 'English person; filler "today" tail', known='she said today it\'s a very long time since we last saw each other', target='ela disse hoje que já passou muito tempo desde a última vez que nos vimos', source=REP + '; ' + TAIL, conf='likely')
ed('S0614L03U05', 'English person; filler "today" tail', known='she said today it\'s near where your family live', target='ela disse hoje que é perto de onde a tua família vive', source=REP + '; ' + TAIL, conf='likely')
# 570
for rid, who in [('S0570L03U02', 'she'), ('S0570L03U03', 'he'), ('S0570L03U04', 'they')]:
    ed(rid, 'English says he/she/her while the Portuguese says estás/teu (you/your)', known=f'{who} asked how much you\'re willing to pay for your ticket', source=REP, note=SW)
ed('S0570L03U05', 'target broken: "ela … está disposto … teu" mixes she, masculine and your', known='she said you\'re willing to pay for your ticket', target='ela disse que estás disposto a pagar pelo teu bilhete', source=REP + '; words are the seed\'s own (estás disposto a pagar pelo teu bilhete)', conf='sure')
# 572
ed('S0572L03U02', 'target broken: "disse se esqueceste-te" (said + whether, and enclisis after se); English person', known='she wants to know if you\'ve forgotten what happened the last time they visited us', target='ela quer saber se te esqueceste do que aconteceu da última vez que eles nos visitaram', source='Cunha & Cintra, colocação dos pronomes átonos: after the conjunction se the clitic goes before the verb (próclise); ela quer saber se (S0453L02U03) replaces the untaught perguntou. ' + REP, conf='likely')
ed('S0572L03U03', 'as U02', known='he wants to know if you\'ve forgotten what happened the last time they visited us', target='ele quer saber se te esqueceste do que aconteceu da última vez que eles nos visitaram', source='as U02', conf='likely')
de('S0572L03U04', 'target broken: "disseram do que aconteceu" (said of what happened)', source='meaning', note=SW)
de('S0572L03U05', 'target broken: "disse que esqueceste-te" (enclisis after que) and person mismatch', source='as U02; basket keeps 5 USE')
# 501
ed('S0501L04U04', 'target broken: plural "they said … they could" over singular pudesse … em ti', known='I can\'t trust you to play together without arguing', target='não consigo confiar em ti para brincarem juntos sem discutir', source='rewritten from taught pieces (não consigo S0057L01; confiar em ti para brincarem juntos sem discutir is the seed\'s own) to hold the USE floor', conf='likely')
ed('S0501L04U05', 'target broken: "trust them" over em ti, plus a filler hoje', known='can I trust you to play together without arguing?', target='posso confiar em ti para brincarem juntos sem discutir?', source='as U04; posso S0119L01', conf='likely')
# 508
keep('S0508L01U04', 'scan: "she said there\'s no point worrying | … preocupar-te" — wrong person', 'Not a defect: the seed itself renders generic "there\'s no point worrying" as não vale a pena preocupar-te (the generic "you"), so the reported row follows the seed exactly.')
de('S0508L01U05', '"worrying about the way" is not English and "com a maneira" is cut off', source='meaning', note='USE floor 5 → 4 (warn-only)')
de('S0175L01U01', 'fragment: "want to do on Sunday morning" (no subject); the full question is U08', source='P7 (no fragment as USE)')
# 482 (P24: subjunctive LEGO needs its trigger)
P24 = 'P24: the LEGO não estejam a falar a sério is subjunctive and correct only after a trigger (a esperança é que, espero que); every row supplies it. Celso Cunha, conjuntivo after verbs of hope. espero que S0292L02, desta vez S0318L01'
ed('S0482L03B02', 'subjunctive with no trigger', known='I hope they aren\'t talking seriously', target='espero que eles não estejam a falar a sério', source=P24)
ed('S0482L03U02', 'subjunctive after "disse que" (report takes the indicative); double report', known='I hope they aren\'t talking seriously this time', target='espero que eles não estejam a falar a sério desta vez', source=P24, conf='sure')
ed('S0482L03U04', 'subjunctive after "disse que"', known='I hope they aren\'t talking seriously now', target='espero que eles não estejam a falar a sério agora', source=P24 + '; agora taught early', conf='sure')
ed('S0482L03U05', 'subjunctive after "disse que"', known='the only hope is that they aren\'t talking seriously this time', target='a única esperança é que eles não estejam a falar a sério desta vez', source=P24, conf='sure')
# 511
ed('S0511L01U04', '"são várias horas a chegar" is not Portuguese for "it took several hours"', known='I need several hours', target='preciso de várias horas', source='rewritten from taught pieces to hold the floor (preciso de S0044L02)', conf='sure')
ed('S0511L01U05', 'as U04', known='we have to wait several hours', target='temos de esperar várias horas', source='as U04; temos de S0405L01, esperar S0269L01', conf='sure')
de('S0123L01U07', '"I thought" over acho (present); achei is taught only at seed 124', source='meaning; P1')
de('S0453L02U05', '"já" not in the English, odd order', source='meaning')
ed('S0452L01B04', '"at all" over nunca (never)', known='still didn\'t say what they wanted', target='ainda não disseram o que queriam', source='ainda from U04 of this basket; rewritten to hold the BUILD floor', conf='sure')
for rid in ['S0094L01U04', 'S0094L01U07', 'S0094L03U03', 'S0094L03U04', 'S0094L03U06']:
    de(rid, 'calque on "a maneira": "I need the way", "help you with the way", "the way to work" (= route to the office) are not what the Portuguese says', source='meaning; each basket keeps ≥5 USE')
de('S0122L02U04', '"entusiasmado para" (EP takes por/com) and the same English "I\'m excited to see you" is S0127L02U07 (two answers once both exist)', source='Priberam: entusiasmado com/por; P16 — kept one row, at 127 where ver-te is taught')
ed('S0127L02U07', '"entusiasmado para ver-te": EP takes por', target='estou entusiasmado por ver-te', source='Priberam Dicionário, "entusiasmado"; Ciberdúvidas da Língua Portuguesa on entusiasmado por/com', conf='likely')
de('S0311L03U06', 'English says "all the facts", the Portuguese "factos"; todos os is untaught until seed 313', source='P1 (the scan\'s todos os factos is untaught at 311)')
de('S0450L01U05', '"tomar o comboio" leans Brazilian, and U02 already has the same English with a different answer (P16)', source='Priberam: apanhar o comboio (EP); P16')
ed('S0434L05B01', 'question English, statement text', target='podiam reduzir?', source='punctuation only; clip unchanged', conf='sure')
ed('S0453L02B01', 'question English, statement text', target='disseram quem viram?', source='punctuation only; clip unchanged', conf='sure')
write(C, E)
print('scope rows not covered:', [r for r in sc if r not in {e['row'] for e in E}])
