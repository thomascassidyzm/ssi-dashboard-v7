import json,os,re
from lib import *
S=os.environ['CS_SCRATCH']; OUT='/home/tomcassidy/.cs-worktrees/ssi-dashboard-v7-clean/468-cleanup-scan-deu/ops/paid-cleanup-scan-447/reports/deu.json'
D={c:json.load(open(f'{S}/{c}.json')) for c in ['deu_for_eng','deu_at_for_eng','deu_ch_for_eng']}
IDX={}
for c,d in D.items():
    for s in d['seeds']:
        IDX[(c,'seed:%d'%s['n'])]=(s['known'],s['target'])
        for l in s['legos']:
            IDX[(c,l['id'])]=(l['known'],l['target'])
            for p in l.get('phrases',[]): IDX[(c,p['id'].split(':')[-1])]=(p['known'],p['target'])
rows=[]; ids=known_ids(MAIN_DOCS); h435=set(json.load(open(f'{S}/w/holds435.json')))
def R(c,fam,rid,verdict,fix,conf,src,canon,side,newk=None,newt=None):
    k,t=IDX.get((c,rid),('',''))
    ch=0
    if 'K' in side: ch+=len(newk or k)
    if 'T' in side: ch+=2*len(newt or t)
    rows.append(dict(course=c,family=fam,row=rid,known=k,target=t,verdict=verdict,fix=fix,confidence=conf,source=src,canon=canon,chars=ch))
M='deu_for_eng'
# M1 not landed
for rid,fx,side,nk,nt in [('S0033L02U01',"English → How long have you been learning German, and is it useful?",'K','How long have you been learning German, and is it useful?',None),
 ('S0141L02U05',"English → I wanted to know if it is okay to wait here for you",'K',"I wanted to know if it is okay to wait here for you",None),
 ('S0182L01B03',"English → I'd like to look somewhere",'K',"I'd like to look somewhere",None),
 ('S0056L02B06',"English → I feel better",'K','I feel better',None),
 ('S0056L02U13',"English → I feel much better since I started to learn more",'K',"I feel much better since I started to learn more",None),
 ('S0064L01U07',"English → I want to learn German",'K','I want to learn German',None),
 ('S0424L03U03',"German → …nicht verschwenden mussten (past frame; #435 proposed durften)",'T',None,'ich dachte, dass wir die Zeit von allen nicht verschwenden mussten'),
 ('S0424L03U06',"German → …nicht verschwenden mussten",'T',None,'ich wusste, dass wir die Zeit von allen nicht verschwenden mussten')]:
    R(M,'435-fix-not-live',rid,'REAL',fx,'sure' if side=='K' else 'likely','ops/deu-435 FIXES record vs live 17 Nov','K9 / K50',side,nk,nt)
# M2 basket does not drill its LEGO
for x in json.load(open(f'{S}/w/p17.json')):
    rows.append(dict(course=M,family='basket-not-drilling-lego',row=x['id'],known=x['known'],target=x['target'],verdict='KNOWN (d/ca698dea, d/29f966c2)' if x['known_flag'] else 'REAL',
      fix=f"rebuild {x['bad']} of {x['rows']} rows so each contains the whole LEGO (formal LEGOs: cut honorific, sir/madam at the end on both sides, K32); e.g. "+'; '.join(f'{a} {b} | {c}' for a,b,c in x['eg'][:2]),
      confidence='sure',source='own containment check (reports/deu-checks/p17.py)',canon='P17, K32, O12, L31',chars=x['chars']))
# M3 dort
h2=json.load(open(f'{S}/deu_for_eng.hits2.json'))['hits']
for x in h2['lex:dort_untaught']:
    rid=x['id']; kn=isknown(rid,ids) or rid in h435
    R(M,'dort-never-taught',rid,'KNOWN (d/ca698dea)' if kn else 'REAL',"dort → da (there = da, taught S0157L02/S0456)",'sure','dort is in no LEGO and no seed','P1, K8, K14','T',None,x['target'].replace('dort','da'))
# M4 want/möchte
o=json.load(open(f'{S}/w/rules.json'))[M]
for x in o['want_mochte']:
    rid=x[2].split(':')[-1]; kn=isknown(rid,ids) or rid in h435
    nk=re.sub(r"\bwants\b","would like",re.sub(r"\bwant\b","would like",x[3]))
    R(M,'want-moechte',rid,'KNOWN (d/ca698dea)' if kn else 'REAL',f"English → {nk}  (want = will, I'd like = möchte)",'sure','#435 mismatch family; Kai rule want=will','K2, K22','K',nk)
for rid,nt in [('S0378L02U05','sie dachte, dass es nicht genug Geld war'),('S0379L01U04','ich dachte, dass es Glück war, dass sie dort war'),('S0380L01U05','ich dachte, dass sie nicht genug gefragt hatte'),('S0381L02U05','sie dachte, dass es wichtig war zu folgen'),('S0383L02U06','sie dachte, dass es wichtig war, es in den Garten zu stellen'),('S0384L01U04','ich dachte, was sie vor einem Moment gesagt hatte, war wichtig')]:
    R(M,'fand-for-believed',rid,'REAL',f"German → {nt}",'likely','#435 de-wrong-verb siblings; Duden finden (opinion) vs denken (belief)','K9','T',None,nt)
for rid in ['S0419L01U03','S0419L01U04','S0419L01U06']:
    k,t=IDX[(M,rid)]; nt=t.replace('mögen wollten','mögen würden')
    R(M,'moegen-wollten',rid,'REAL',f"German → {nt}",'sure','would like them = mögen würden (Konjunktiv II)','K9','T',None,nt)
R(M,'reflexive-dropped','S0513L03B01','REAL','German → ich bewege mich','sure','#435 de-grammar S0513L03B03 sibling','K9','T',None,'ich bewege mich')
for rid in ['S0642L01','S0642L01B02','S0642L01B03','S0642L01U03','S0642L01U05','S0642L01U06']:
    R(M,'gnaedige-frau-as-description',rid,'REAL',"LEGO → madam | gnädige Frau; rows use it as an address (…, gnädige Frau), not 'a dear lady'",'likely','Duden gnädig: gnädige Frau is a form of address','K9, K32','KT')
for rid,fx in [('S0068L01','make NEW (wonach never taught) with intro + basket'),('S0089L01','make NEW (in kurzer Zeit never taught)'),('S0106L02','make NEW (nur first met here)'),('S0207L01','make NEW (musstest never taught)'),('S0257L01','make NEW (blaue never taught); see ZUT blue')]:
    R(M,'notnew-never-taught',rid,'REAL',fx,'sure','own earliest-LEGO check','L31, P25','')
    rows[-1]['chars']=6*45
R(M,'dup-debut','S0569L02','REAL','flip to not-new (much | viel is S0437L01); move its rows under a new LEGO (P25)','sure','detector dup_debut','L17, P25','')
R(M,'zut-lego','S0459L02','REAL','grow to in front of the blue sign | vor dem blauen Schild (noun picks the ending)','likely','zut_lego blue: blaue (S0257L01) / blauen','K42, L34','KT')
R(M,'zut-lego','S0408L03','REAL','to have | zu haben clashes with S0414L04 to have | haben and is not-new with no earlier pair: grow to to have a happy family | eine glückliche Familie zu haben, NEW','likely','zut_lego to have','L34, L31','KT',None,'eine glückliche Familie zu haben')
R(M,'zut-use','S0639L01U01','REAL','English → with you, sir (K32: honorific at the end); else it clashes with S0001L05 with you | mit dir','sure','zut_use','K32, K2','K',"with you, sir")
R(M,'lego-not-in-seed','S0002L03','REAL','seed is "I\'m trying to learn | Ich versuche zu lernen": LEGO to learn German | Deutsch zu lernen says more than its seed; cut to to learn | zu lernen','likely','lego_not_in_seed_target','L26','KT',None,'zu lernen')
h=json.load(open(f'{S}/deu_for_eng.hits.json'))['hits']
for x in h['seed_not_played']:
    rid='seed:%d'%x['seed']; R(M,'seed-not-played',rid,'KNOWN' if x['seed'] in (278,) else 'REAL','add the seed sentence as a USE row under its last new LEGO, reusing the seed clips','sure','detector seed_not_played (near copy has drifted English)','P26','')
for x in h['dup_rows']:
    R(M,'dup-rows',x['id'],'KNOWN' if isknown(x['id'],ids) else 'REAL',f"delete (same pair as {x['twin']})",'sure','detector dup_rows','—','')
for x in h['qmark_mismatch']:
    R(M,'qmark',x['id'],'REAL','text only: add ? to the side that lacks it (clips unchanged)','sure','detector qmark_mismatch','A7, A9','')
for x in json.load(open(f'{S}/w/syl-deu_for_eng.json')):
    R(M,'lego-over-8',x[0],'REAL',f'{x[1]} syllables (hand rule count); cut to the new piece only, the rest is taught earlier','likely','own vowel-group count','L3','')
# AT
A='deu_at_for_eng'
for lid in ['S0643L01','S0644L01','S0646L01','S0647L01','S0648L01','S0649L01','S0650L01','S0651L01','S0652L01','S0653L01','S0654L02','S0655L01']:
    if (A,lid) in IDX: R(A,'formal-lego-no-honorific',lid,'REAL',"LEGO carries the seed's sir/madam on both sides (…, der Herr / …, gnädige Frau), as main does; its phrases end with it (K32)",'sure','main S0639-S0654 shape; ZUT: what do you need | was brauchen Sie vs wos brauchst du (S0170L02U02)','K32, K2','KT')
for rid in ['seed:643','S0643L01U01','seed:650','S0650L01','S0650L01B01','S0650L01U01']:
    R(A,'want-moechte',rid,'REAL',"English → would you like (…), sir/madam — möchten is 'would like' (main fixed these seeds the other way: wollen Sie)",'likely','Kai rule want=will / I\'d like=möchte','K2, K22','K')
for rid in ['seed:383','S0383L01U01']:
    R(A,'want-moechte',rid,'REAL',"German → er hot gsogt, er wollt des in Gortn tan (wanted = wollt, S0127; mechat = would like, S0011)",'likely','Kai rule want=will','K2','T')
for rid in ['S0414L02U06','S0418L01U03','S0448L01B02','S0471L01U05','S0504L02U05']:
    R(A,'like-wue',rid,'REAL',"German i wü … → i mechat … (I would like = möchte, not will)",'likely','Kai rule','K2','T')
R(A,'old-man-elderly','S0264L01','REAL',"seed says an old man: LEGO English → an old man; grow S0231L01 to I know an old man | i kenn an oiden Monn so the case shows why (L34)",'likely','sibling of main KNOWN #422 item 5','L26, L34','K','an old man')
R(A,'zut-seed','seed:194','REAL',"what are you looking for: wos suachst'n (68) / wos suachst denn (194) — use one form",'likely','zut_seed','K2','T')
R(A,'empty-audio','S0322L02U08','REAL','known clip empty: link or render the English (35 chars)','sure','detector empty_audio','A16','K')
h=json.load(open(f'{S}/deu_at_for_eng.hits.json'))['hits']
for x in h['seed_not_played']:
    norm=x['seed'] in (275,338)
    R(A,'seed-not-played','seed:%d'%x['seed'],'NOT A DEFECT (copy differs only by punctuation/case)' if norm else 'REAL','add the seed sentence as a USE row under its last new LEGO, reusing the seed clips','sure','detector seed_not_played','P26','')
for x in h['dup_rows']: R(A,'dup-rows',x['id'],'REAL',f"delete (same pair as {x['twin']})",'sure','detector','—','')
for x in h['qmark_mismatch']: R(A,'qmark',x['id'],'REAL','text only: add ? to the side that lacks it','sure','detector','A7, A9','')
# CH
C='deu_ch_for_eng'
for lid,new in [('S0639L01','with you, sir | mit Ihne'),('S0642L01','how do you feel, madam? | wie fühled Sie sich?'),('S0642L02','(merge into L01)'),('S0643L01','do you want, sir? | wänd Sie?'),('S0644L01','could you say that, sir? | chönted Sie das säge?'),('S0646L01',"you're doing something, sir | Sie mached öppis"),('S0647L01','you speak it, madam | Sie reded s'),('S0649L01','are you ready, sir? | sind Sie parat?'),('S0651L01','what do you think, madam? | was dänked Sie?'),('S0652L01','what do you need, sir? | was bruuched Sie?')]:
    if (C,lid) in IDX: R(C,'formal-lego-no-pronoun',lid,'REAL',f"LEGO → {new}: the verb alone (fühled, wänd, reded…) is also we/you-all/they in Swiss German; carry Sie, keep sir/madam in English as the formal cue",'likely','main shape S0639-S0654; Swiss plural/formal verb ending -ed','K32, K28, 14 Oct pronoun precedent','KT')
for x in json.load(open(f'{S}/deu_ch_for_eng.hits.json'))['hits']['same_both']:
    R(C,'english-side-in-swiss',x['id'],'REAL','write the English on the known side (e.g. "I have her", "we stop", "they mean")','sure','detector same_both','A (wrong language)','K')
for lid,new in [('S0425L01','they understand | si verstönd'),('S0448L01','they help | si hälfed')]:
    R(C,'verb-lego-no-pronoun',lid,'REAL',f'LEGO → {new}','sure','zut_use (verstönd / si verstönd); 14 Oct deu pronoun precedent','K28, K2','T')
R(C,'k48-subordinator','S0572L06','REAL','LEGO → when they visited us | wo si öis bsuecht händ (the seed\'s own trigger)','likely','zut_use: si öis bsuecht händ / si händ öis bsuecht','K48','KT')
R(C,'k48-subordinator','S0538L03','REAL',"LEGO → as though I don't care | as ob s mir egal wär (known 'I don't care' clashes with S0048L01 es isch mir egal)",'sure','zut_lego I don\'t care','K48, K2','KT')
R(C,'zut-lego','S0501L01','REAL',"if | wenn clashes with S0010L03 if | öb (set by #719, not Kai): grow to if only I could | wenn ich nu chönt",'likely','zut_lego if','K22, L34, R0.6','KT')
R(C,'zut-lego','S0149L02','REAL',"I hope | hoff (seed inverts: also hoff ich) clashes with S0668L01 I hope | ich hoff: LEGO → so I hope | also hoff ich",'likely','main KNOWN #422 item 8 sibling','L26, K2','KT')
for lid in ['S0317L02','S0317L03']: R(C,'dup-debut',lid,'REAL','flip to not-new (earlier S0047L01 / S0310L01, trailing comma only); move rows under a new LEGO','sure','detector dup_debut','L17, P25','')
R(C,'lego-not-in-seed','S0567L03','REAL','LEGO → de Chind (the seed\'s dative form)','likely','lego_not_in_seed_target','L26','T')
R(C,'lego-not-in-seed','S0620L02','REAL','LEGO has wo, the seed says sit mir öis s letscht Mal gseh händ: re-cut to the seed\'s words','likely','lego_not_in_seed_target','L26','KT')
R(C,'lego-over-8','S0601L03','REAL','cut to how it started | wie s aagfange hät (6)','likely','own count','L3','KT')
R(C,'k46-yet','S0534L01B03','REAL',"let's not go yet | gömmer nöd scho → gömmer no nöd",'sure','K46 sibling (no nöd = not yet)','K46','T',None,'gömmer no nöd')
R(C,'wrong-case','S0642L01U03','REAL','ich cha Sie hälfe → ich cha Ihne hälfe (hälfe takes the dative)','sure','zut_use I can help you','K9','T',None,'ich cha Ihne hälfe')
R(C,'wann-question','S0252L02U01','REAL','wenn bisch parat → wänn bisch parat (question; #719 fixed seed 255 only)','sure','#719 d/740ccd8e','K22','T',None,'wänn bisch parat zum Aafange?')
h=json.load(open(f'{S}/deu_ch_for_eng.hits.json'))['hits']
for x in h['seed_not_played']: R(C,'seed-not-played','seed:%d'%x['seed'],'REAL','add the seed sentence as a USE row under its last new LEGO, reusing the seed clips','sure','detector','P26','')
for x in h['dup_rows']: R(C,'dup-rows',x['id'],'REAL',f"delete (same pair as {x['twin']})",'sure','detector','—','')
for x in h['qmark_mismatch']: R(C,'qmark',x['id'],'REAL','text only: add ? to the side that lacks it','sure','detector','A7, A9','')
json.dump(rows,open(OUT,'w'),ensure_ascii=False,indent=0)
from collections import defaultdict
agg=defaultdict(lambda:[0,0,0])
for r in rows:
    a=agg[(r['course'],r['family'])]; 
    if r['verdict']=='REAL': a[0]+=1; a[2]+=r['chars']
    elif r['verdict'].startswith('KNOWN'): a[1]+=1
for k,v in sorted(agg.items()): print(k,'REAL',v[0],'KNOWN',v[1],'chars',v[2])
for c in D: print(c,'REAL',sum(1 for r in rows if r['course']==c and r['verdict']=='REAL'),'chars',sum(r['chars'] for r in rows if r['course']==c and r['verdict']=='REAL'))
