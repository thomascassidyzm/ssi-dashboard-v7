from lib import *
from plan import P,E_,J
cs={E_:C(E_),J:C(J)}
rows={}
for c in cs:
    for r in stale(c): rows[(c,r['id'].split(':')[1])]=r
miss=[k for k in rows if k not in P and cs[k[0]].ph[k[0]+':'+k[1]][2]['type']!='component']
print('unplanned real rows:',miss); print('planned not in list:',[k for k in P if k not in rows])
tot=collections.Counter()
for (c,pid),(act,nk,nt,fam,why) in sorted(P.items()):
    co=cs[c]; sd,l,p=co.ph[c+':'+pid]
    if act!='RE-WORD': continue
    issues=[]
    if not contains(nt,l['target']): issues.append('NO-LEGO')
    vt=co.vocab(l['id'],'target'); un=[w for w in norm(nt) if w not in vt]
    if un: issues.append('untaught-target:'+','.join(un))
    if c==E_:
        vk=co.vocab(l['id'],'known'); unk=[w for w in norm(nk) if w not in vk]
        if unk: issues.append('untaught-known:'+','.join(unk))
    # ZUT: same known elsewhere with a different target; dup in same basket
    for sd2,l2,p2 in co.all():
        if p2['id']==p['id']: continue
        if norm(p2['known'])==norm(nk) and norm(p2['target'])!=norm(nt): issues.append(f"ZUT {p2['id'][-11:]}:{p2['target']}")
        if norm(p2['target'])==norm(nt) and l2['id']==l['id']: issues.append('dup-in-basket '+p2['id'][-3:])
        if norm(p2['target'])==norm(nt) and norm(p2['known'])!=norm(nk): issues.append(f"same-target-other-known {p2['id'][-11:]}:{p2['known']}")
    for (c2,pid2),v in P.items():
        if c2==c and pid2!=pid and v[0]=='RE-WORD' and norm(v[1])==norm(nk) and norm(v[2])!=norm(nt): issues.append('ZUT-in-plan '+pid2)
        if c2==c and pid2!=pid and v[0]=='RE-WORD' and norm(v[2])==norm(nt): issues.append('dup-in-plan '+pid2)
    if issues: print(c[-3:],pid,'|',nk,'|',nt,'=>',issues)
