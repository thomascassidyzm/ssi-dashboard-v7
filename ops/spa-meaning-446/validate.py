import json,re
exec(open('idx.py').read()); exec(open('decisions_src.py').read())
rows=json.load(open('rows.json'))
norm=lambda s: re.sub(r'[^\wáéíóúñü ]','',(s or '').lower()).split()
def contains(text,lego):
    a=' '.join(norm(text)); b=' '.join(norm(lego)); return (' '+b+' ') in (' '+a+' ')
probs=[]
# floors
from collections import defaultdict
cnt=defaultdict(lambda:[0,0])
for k in rows:
    if k[8] in 'BU' and not (k in D and D[k][0]=='del'): cnt[k[:8]][0 if k[8]=='B' else 1]+=1
for k,(a,kn,tg,kind,note) in D.items():
    p=rows[k]; L=legos[k[:8]]
    if a=='del':
        b,u=cnt[k[:8]]
        if b<1 or u<2: probs.append(f"{k} FLOOR after delete B{b}/U{u}")
        continue
    nk=kn if kn is not None else p['known_text']; nt=tg if tg is not None else p['target_text']
    if nk==p['known_text'] and nt==p['target_text']: probs.append(f"{k} NO CHANGE")
    newtoks=set(untaught(nt,L['seed'],L['idx']))-set(untaught(p['target_text'],L['seed'],L['idx']))
    if newtoks: probs.append(f"{k} UNTAUGHT {newtoks}")
    if not contains(nt,L['target']): probs.append(f"{k} TARGET lacks LEGO '{L['target']}'")
    if not contains(nk,L['known']): probs.append(f"{k} known lacks LEGO '{L['known']}'  [{nk}]")
    kk=nk.strip().lower().rstrip('?.!'); others=k2t.get(kk,set())-{p['target_text'].strip().lower().rstrip('?.!')}
    if others and nt.strip().lower().rstrip('?.!') not in others: probs.append(f"{k} ZUT known '{nk}' elsewhere -> {others}")
    if nt.strip().lower().rstrip('?.!') in {x['target'].strip().lower().rstrip('?.!') for x in phrases[k[:8]] if x['known']!=p['known_text']}: probs.append(f"{k} DUP target in basket")
print('\n'.join(probs)); print(len(D),'decisions')
