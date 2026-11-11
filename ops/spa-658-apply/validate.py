# Checks run before applying: taught tokens, LEGO containment (grown LEGO for S0423L01), ZUT, in-basket dupes, floors.
# Run from the job scratch (needs seeds/*.json from GET /api/production/spa_for_eng/seed/:n/baskets and rows.json from /lego/:id/basket).
import json,re,sys,os
here=os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(here,'idx.py')).read()); exec(open(os.path.join(here,'decisions_src.py')).read())
rows=json.load(open('rows.json'))
for lid,l in LEGO.items(): legos[lid]['known']=l['known_text']; legos[lid]['target']=l['target_text']
norm=lambda s: re.sub(r'[^\wáéíóúñü ]','',(s or '').lower()).split()
def contains(text,lego):
    a=' '.join(norm(text)); b=' '.join(norm(lego)); return (' '+b+' ') in (' '+a+' ')
probs=[]
from collections import defaultdict
cnt=defaultdict(lambda:[0,0])
for k,p in rows.items():
    if p['phrase_role'] in ('build','use') and not (k in D and D[k][0]=='del'): cnt[k[:8]][0 if p['phrase_role']=='build' else 1]+=1
for k,(a,kn,tg,fam,why) in D.items():
    p=rows[k]; L=legos[k[:8]]
    if a=='keep': continue
    if a=='del':
        b,u=cnt[k[:8]]
        if b<1 or u<5: probs.append(f"{k} FLOOR after delete B{b}/U{u}")
        continue
    nk=kn if kn is not None else p['known_text']; nt=tg if tg is not None else p['target_text']
    if nk==p['known_text'] and nt==p['target_text']: probs.append(f"{k} NO CHANGE")
    newtoks=set(untaught(nt,L['seed'],L['idx']))-set(untaught(p['target_text'],L['seed'],L['idx']))
    if newtoks: probs.append(f"{k} UNTAUGHT {newtoks}")
    if not contains(nt,L['target']): probs.append(f"{k} TARGET lacks LEGO '{L['target']}'")
    if not contains(nk,L['known']): probs.append(f"{k} known lacks LEGO '{L['known']}'  [{nk}]")
    kk=nk.strip().lower().rstrip('?.!'); others=k2t.get(kk,set())-{p['target_text'].strip().lower().rstrip('?.!')}
    if others and nt.strip().lower().rstrip('?.!') not in others: probs.append(f"{k} ZUT known '{nk}' elsewhere -> {others}")
    tt=nt.strip().lower().rstrip('?.!')
    for q in rows.values():
        if q['id']!=p['id'] and q['id'].split(':')[1][:8]==k[:8] and q['id'].split(':')[1] not in [x for x in D if D[x][0]=='del']:
            qt=(D.get(q['id'].split(':')[1],(0,0,None))[2] or q['target_text']).strip().lower().rstrip('?.!')
            if qt==tt: probs.append(f"{k} DUP target in basket with {q['id']}")
print('\n'.join(probs) or 'no problems'); print({k[:8]:cnt[k[:8]] for k in D if D[k][0]=='del'})
