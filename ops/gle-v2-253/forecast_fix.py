# Follow-up after the clash forecast #251 (d/ddc31b55), same day: where Eoghan's row for one of the 24 used his own
# MINORITY form, the seed takes his majority form; 433/434 go back to pending; the keep-ours style choices that this
# job had touched (an fáth / an chúis, Dé + day, a bhaint amach / a shroicheadh) go back to ours until Kai rules.
import json,os,re
c=json.load(open(os.path.join(os.environ['CS_SCRATCH'],'course.json')));S=c['S'];LA=c['LA'];R=c['rows']
SEEDS={
105:("sin é an fáth nach raibh an freagra ar eolas aige","'an fáth / an chúis' is one of the keep-ours style choices Kai rules on 12 Nov; back to ours"),
127:("Ní hé sin an fáth ar mhian liom tú a fheiceáil","'an fáth' restored (style choice, unruled); 'ar mhian liom' stays (want = mian; theastaigh was nobody's)"),
146:("Tá an chuma air nach bhfuil rud ar bith ag obair ó rinne muid iarracht é a dheisiú","Eoghan's own majority form for a thing 'working' is ag obair (99); ag feidhmiú is his single stray row"),
371:("chuaigh mé chun scannán a fheiceáil Dé Céadaoin","his 'chun scannán a fheiceáil'; 'Dé' + day kept (style choice, unruled)"),
433:("Ní fhéadfadh siad fáil amach cathain a thosaigh an scannán","NOT applied: níorbh fhéidir leo gives 'couldn't' two forms (311 ní fhéadfadh sé) and breaks the answer at 435; pending Kai"),
434:("an bhféadfadh siad líon na mac léinn a ghlacann siad a laghdú?","NOT applied: arbh fhéidir leo gives 'could' two forms and breaks the answer at 435 (d'fhéadfadh); pending Kai"),
562:("Níl ann ach gur mian liom mo cheann scríbe a bhaint amach slán sábháilte","his second option, which keeps 'a bhaint amach' (reach: a shroicheadh is an unruled style choice); doubled 'ach' dropped"),
659:("an bhféadfadh sibh ar fad é sin a rá?","back to féad-: his majority form for 'could' (311-314, 358, 412-414, 435, 644); arbh fhéidir is his minority"),
}
LEGOS={
'S0105L01':{"target_text":"sin é an fáth","components":[{"known":"that","target":"Sin"},{"known":"it","target":"é"},{"known":"the reason","target":"an fáth"}]},
'S0127L02':{"target_text":"an fáth ar mhian liom","components":[{"known":"the reason","target":"an fáth"},{"known":"that I wanted","target":"ar mhian liom"}]},
'S0146L01':{"target_text":"nach bhfuil rud ar bith ag obair","components":[{"known":"that is not","target":"nach bhfuil"},{"known":"anything","target":"rud ar bith"},{"known":"working","target":"ag obair"}]},
}
ops=[];rec={"seeds":{},"legos":{},"phrases":{}}
for n,(t,w) in SEEDS.items():
    s=S[str(n)]; assert s['target']!=t,n
    ops.append({"op":"seed.update","seed_number":n,"set":{"target_text":t},"expect":{"known_text":s['known'],"target_text":s['target']}}); rec['seeds'][n]={"before":s['target'],"after":t,"why":w}
for k,sd in LEGOS.items():
    ops.append({"op":"lego.update","lego_id":k,"set":sd,"expect":{"target_text":LA[k]['target_text']}}); rec['legos'][k]={"before":LA[k]['target_text'],"after":sd['target_text']}
for k,r in sorted(R.items()):
    t=r['target_text'].replace('an chúis','an fáth').replace('ag feidhmiú','ag obair')
    if t!=r['target_text']:
        ops.append({"op":"phrase.update","phrase_id":r['id'],"set":{"target_text":t},"expect":{"known_text":r['known_text'],"target_text":r['target_text']}}); rec['phrases'][k]={"known":r['known_text'],"before":r['target_text'],"after":t}
json.dump({"why":"job #253 follow-up on clash forecast #251","ops":ops,"record":rec},open('forecast-fix.json','w'),ensure_ascii=False,indent=1)
print(len(ops),'ops;',len(rec['phrases']),'phrases')
# same English, two Irish answers, or two rows the same in one basket?
norm=lambda s:' '.join(''.join(ch for ch in s.lower() if ch.isalnum() or ch==' ').split())
new={k:v['after'] for k,v in rec['phrases'].items()}
for k,t in new.items():
    r=R[k]
    for q,o in R.items():
        if q!=k and o['phrase_role']!='component' and norm(o['known_text'])==norm(r['known_text']) and norm(new.get(q,o['target_text']))!=norm(t): print('ZUT',k,q,r['known_text'])
        if q!=k and o['lego']==r['lego'] and o['phrase_role']==r['phrase_role'] and norm(new.get(q,o['target_text']))==norm(t): print('DUP',k,q)
