import json,re
exec(open('dec.py').read())
api=json.load(open('seeds.json')); f=json.load(open('first.json'))
P={};L={};S={}
for s in api['seeds']:
    S[s['seed_number']]=s
    for l in s.get('legos') or []:
        L[l['lego_id']]=l
        for p in l.get('basket_phrases') or []: P[p['id'].split(':')[1]]=dict(p,_l=l['lego_id'])
toks=lambda s:re.findall(r"[\wáéíóúñü']+",s.lower())
norm=lambda s:re.sub(r"[^\w' ]","",s.lower()).strip()
byk={}
for pid,p in P.items():
    if p['phrase_role'] in('build','use'): byk.setdefault(norm(p['known_text']),[]).append((pid,norm(p['target_text'])))
cq={r['id']:r for r in json.load(open('calque.json'))}
alld={i for g in G.values() for i,v in g[1].items() if v==D}
rows=[]
for gk,(gn,d) in G.items():
    for i,v in d.items():
        p=P[i]; seed=int(i[1:5]); lg=L[i[:8]]; fl=[]
        if v!=D:
            ut=[(w,f['t'].get(w)) for w in toks(v[1]) if f['t'].get(w,9999)>seed]
            uk=[(w,f['k'].get(w)) for w in toks(v[0]) if f['k'].get(w,9999)>seed]
            if ut: fl.append('target words not in a LEGO by this seed: %s'%ut)
            if uk: fl.append('known words not in a LEGO by this seed: %s'%uk)
            if norm(lg['target_text']) not in norm(v[1]): fl.append('LEGO target not contained')
            for pid,t in byk.get(norm(v[0]),[]):
                if pid!=i: fl.append(('DUP of ' if t==norm(v[1]) else 'ZUT: same English, other Spanish in ')+pid)
            for pid,(k2) in [(q,P[q]) for q in P]:
                pass
        left=[q for q in P.values() if q['_l']==i[:8] and q['phrase_role'] in('build','use') and q['id'].split(':')[1] not in alld]
        ba={'build':sum(q['phrase_role']=='build' for q in left),'use':sum(q['phrase_role']=='use' for q in left)}
        if norm(p['known_text'])==norm(S[seed]['known_text']): fl.append('ROW IS THE SEED SENTENCE')
        r=cq[i]
        rows.append(dict(id=i,group=gk,group_name=gn,role=p['phrase_role'],lego=r['lego'],live_known=p['known_text'],live_target=p['target_text'],
          action='delete' if v==D else ('rewrite-spanish-only' if v[0]==p['known_text'] else ('rewrite-english-only' if v[1]==p['target_text'] else 'rewrite-both')),
          new_known=None if v==D else v[0],new_target=None if v==D else v[1],why_348=r['reason348'],proposal_255=r['after255'],fix_348=r['fix_verdict'],better_fix_348=r['better_fix'],
          basket_after=ba,checks=fl))
json.dump(rows,open('rows.json','w'),ensure_ascii=False,indent=1)
for r in rows:
    if r['checks'] or r['basket_after']['use']<3 or r['basket_after']['build']<1: print(r['id'],r['action'],r['basket_after'],r['checks'])
import collections; print(collections.Counter((r['group'],r['action']) for r in rows))
