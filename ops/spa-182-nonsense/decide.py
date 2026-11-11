import json,re
from taught import check,toks
D='DELETE'
G={
 'A':('Padding-tag BUILD fragments ("here, good", "before, no")',{
  'S0506L03B03':D,'S0515L01B04':D,'S0520L02B04':D,'S0521L02B03':D,'S0527L01B02':D,'S0527L03B04':D,'S0535L02B04':D,'S0544L01B03':D,'S0544L01B04':D}),
 'B':('Broken fragment or empty sentence (no verb, no object, LEGO missing)',{
  'S0363L01B03':D,'S0409L02B03':D,'S0498L01B03':D,'S0512L02B02':D,'S0540L01B04':D,'S0539L01B04':D,'S0535L03B02':D,
  'S0504L03U05':D,'S0419L02U03':D,'S0462L03U03':D,'S0325L02U04':D,'S0366L01U06':D,'S0515L02B02':D,'S0518L01U05':D}),
 'C':('Long USE sentence that is circular or self-contradicting',{
  'S0133L02U10':D,'S0134L02U13':D,'S0146L03U07':D,'S0146L03U12':D,'S0195L03U02':D,'S0225L03U06':D,'S0225L03U10':D,
  'S0225L03U11':D,'S0225L03U13':D,'S0288L01U11':D,'S0587L01U06':D,'S0536L01U05':D}),
 'D':('Time word that contradicts the tense or the question',{
  'S0255L02B06':["When do you think you'll be ready to leave on Saturday?","¿Cuándo crees que estarás listo para irte el sábado?"],
  'S0255L02U08':["When do you think you'll be ready to leave on Sunday?","¿Cuándo crees que estarás listo para irte el domingo?"],
  'S0255L02U12':["When do you think you'll be ready to leave next week?","¿Cuándo crees que estarás listo para irte la semana que viene?"],
  'S0255L02U14':["When do you think you'll be ready to leave tonight?","¿Cuándo crees que estarás listo para irte esta noche?"],
  'S0256L01U11':["I think I'll be ready in less than an hour today","Creo que estaré listo en menos de una hora hoy"],
  'S0256L01U12':D,
  'S0214L02U08':["I started to feel better at the weekend","Empecé a sentirme mejor el fin de semana"],
  'S0549L01U04':["I can't go because I have got to be here tomorrow","no puedo ir porque tengo que estar aquí mañana"],
  'S0559L01U05':["have you found that today?","¿has encontrado eso hoy?"],
  'S0559L02U04':["have you found the path through the wood today?","¿has encontrado el camino por el bosque hoy?"],
  'S0562L02U04':["I want to get there tomorrow","quiero llegar allí mañana"],
  'S0535L01U01':D,
  'S0535L01U02':["he made a promise that it would be good","hizo la promesa de que sería bueno"],
  'S0535L01U03':["she made a promise that it would be easy","hizo la promesa de que sería fácil"],
  'S0535L01U04':["she made a promise that it would be tomorrow","hizo la promesa de que sería mañana"],
  'S0535L01U05':D}),
 'E':('Garbled sentence with a plain version from taught words',{
  'S0137L03U13':["It's more important to talk with other people than to be perfect when you're learning","Es más importante hablar con otras personas que ser perfecto cuando estás aprendiendo"],
  'S0150L03U14':["I want to know what you are called because we are working together","Quiero saber cómo te llamas porque estamos trabajando juntos"],
  'S0153L03U09':["I want to do that in exactly the same way","Quiero hacer eso exactamente de la misma manera"],
  'S0197L03U10':["My friend works in Spanish and he says it is very interesting","Mi amigo trabaja en español y dice que es muy interesante"],
  'S0212L01U08':["They didn't want to wait any more","No querían esperar más"],
  'S0263L01U13':["I know who you mean","Sé a quién te refieres"],
  'S0293L03U11':["I have to find out where he's going to meet me this morning","Tengo que descubrir dónde va a reunirse conmigo esta mañana"],
  'S0477L01U05':["he is so sick","está tan enfermo"],
  'S0481L03U04':D,
  'S0489L01U05':["that coffee is very strong","ese café es muy fuerte"],
  'S0534L01U04':["let's not go outside today","no salgamos fuera hoy"],
  'S0554L01B02':["I know this towel isn't dry","sé que esta toalla no está seca"],
  'S0561L02B04':["I think it's a fast car","creo que es un coche rápido"],
  'S0565L02B03':["to try and breathe more carefully","intentar respirar con más cuidado"],
  'S0566L01B03':["I'd have thought more because it's very important","habría pensado más porque es muy importante"],
  'S0566L02U05':["if it had been my choice I'd have thought more","si hubiera sido mi decisión habría pensado más"],
  'S0567L01U05':["it's been lovely to see you","ha sido encantador verte"]}),
}
api=json.load(open('seeds.json'))
P={};L={};seedtext={}
for s in api['seeds']:
    seedtext[s['seed_number']]=s
    for l in s.get('legos') or []:
        L[l['lego_id']]=l
        for p in l.get('basket_phrases') or []: P[p['id'].split(':')[1]]=dict(p,_l=l['lego_id'])
norm=lambda s:re.sub(r"[^\w' ]","",s.lower()).strip()
byknown={}
for pid,p in P.items():
    if p['phrase_role'] in('build','use'): byknown.setdefault(norm(p['known_text']),[]).append((pid,norm(p['target_text'])))
ns={o['id']:o for o in json.load(open('nonsense.json'))}
alld=set(i for g in G.values() for i,v in g[1].items() if v==D)
rows=[]
for gk,(gname,d) in G.items():
    for i,v in d.items():
        o=ns[i];p=P[i];seed=int(i[1:5]);lg=L[i[:8]]
        r=dict(id=i,group=gk,group_name=gname,role=p['phrase_role'],lego=[lg['lego_id'],lg['known_text'],lg['target_text'],lg['is_new']],
               live_known=p['known_text'],live_target=p['target_text'],action='delete' if v==D else 'rewrite',
               new_known=None if v==D else v[0],new_target=None if v==D else v[1],why_348=o['reason348'],
               proposal_255=o['after255'],fix_348=o['fix_verdict'])
        flags=[]
        if v!=D:
            ut,uk=check(seed,v[0],v[1]); 
            if ut: flags.append('target words first taught later: %s'%ut)
            if uk: flags.append('known words first in a LEGO later: %s'%uk)
            if lg['target_text'].lower().strip('¿?') not in v[1].lower(): flags.append('does not contain LEGO target')
            for pid,t in byknown.get(norm(v[0]),[]):
                if pid!=i and t!=norm(v[1]): flags.append('ZUT: %s same English, different Spanish'%pid)
                if pid!=i and t==norm(v[1]): flags.append('DUP: exact twin of %s'%pid)
        basket=[q for q in P.values() if q['_l']==i[:8] and q['phrase_role'] in('build','use')]
        left=[q for q in basket if q['id'].split(':')[1] not in alld]
        r['basket_after']={'build':sum(q['phrase_role']=='build' for q in left),'use':sum(q['phrase_role']=='use' for q in left)}
        s=seedtext[seed]
        if norm(p['known_text'])==norm(s['known_text']): flags.append('THIS ROW IS THE SEED SENTENCE')
        r['checks']=flags; rows.append(r)
json.dump(rows,open('rows.json','w'),ensure_ascii=False,indent=1)
for r in rows:
    if r['checks'] or r['basket_after']['use']<2 or r['basket_after']['build']<1: print(r['id'],r['action'],r['basket_after'],r['checks'])
print(len(rows))
