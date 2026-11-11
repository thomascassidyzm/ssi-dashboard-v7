# Mechanical checks before the sweep is applied: drift vs live, untaught target tokens, LEGO containment (target), ZUT against
# the whole course, duplicate targets in the basket, BUILD>=3/USE>=5 floors (only flagged where a delete makes it worse), intro quote.
import json,sys,os
here=os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(here,'idx.py')).read()); exec(open(os.path.join(here,'sweep_src.py')).read())
api,L,P,first,k2t=load(sys.argv[1])
probs=[]
dels={r[1] for r in ROWS if r[0]=='del'}
newt={r[1]:r[3] for r in ROWS if r[0]=='upd'}
for a,pid,kn,tg,why in ROWS:
    p=P.get(pid)
    if not p: probs.append(f'{pid} GONE'); continue
    l=L[p['_lego']]
    if a=='del':
        b=sum(1 for x in l['phrases'] if P[x]['phrase_role']=='build' and x not in dels); u=sum(1 for x in l['phrases'] if P[x]['phrase_role']=='use' and x not in dels)
        print(f'  DEL {pid}: {p["known_text"]} | {p["target_text"]}   -> basket B{b}/U{u}'); continue
    ut=[t for t in untaught(tg,l['seed'],l['idx'],first)]
    if ut: probs.append(f'{pid} UNTAUGHT {ut} {[first.get(t) for t in ut]}')
    if not contains(tg,l['target_text']): probs.append(f"{pid} TARGET lacks LEGO '{l['target_text']}'")
    kk=kn.strip().lower().rstrip('?.!'); tt=tg.strip().lower().rstrip('?.!')
    o=k2t.get(kk,set())-{tt,p['target_text'].strip().lower().rstrip('?.!')}
    if o: probs.append(f'{pid} ZUT "{kn}" elsewhere -> {o}')
    for x in l['phrases']:
        if x==pid or x in dels or P[x]['phrase_role']=='component': continue
        if (newt.get(x) or P[x]['target_text']).strip().lower().rstrip('?.!')==tt: probs.append(f'{pid} DUP in basket with {x}')
    print(f'  UPD {pid}: {p["known_text"]} | {p["target_text"]}  ->  {kn} | {tg}')
for lid,s in INTROS:
    l=L[lid]
    if (' '+norm(l['known_text'])+' ') not in (' '+norm(s)+' '): probs.append(f"{lid} INTRO as-in lacks '{l['known_text']}'")
print('\n'.join(probs) or 'no problems')
