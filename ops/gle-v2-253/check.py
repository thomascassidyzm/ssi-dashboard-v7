# Pre-apply checks over the decisions: taught words, LEGO containment, one-prompt-one-answer (ZUT), duplicate
# targets in a basket, floors after deletes, no-change rows. Prints problems; a human reads them.
import sys;sys.path.insert(0,'.')
import fam_seeds,fam_199,fam_reason,fam_186,fam_132,fam_146,fam_104,fam_261
from lib import *
TOK=re.compile(r"[a-záéíóúA-ZÁÉÍÓÚ'’-]+")
def toks(s): return [t.lower().strip("'’-") for t in TOK.findall(s or '') if t.strip("'’-")]
# post-change LEGO table
L2={k:dict(v) for k,v in LA.items()}
for k,(sd,f,w) in LEGO.items(): L2[k].update(sd)
for k in DEL_LEGO: L2.pop(k)
for r in INS_LEGO: L2['S%04dL%02d'%(r['seed_number'],r['lego_index'])]=dict(known_text=r['known_text'],target_text=r['target_text'],components=None,is_new=True,type=r['type'])
def order(k): return (int(k[1:5]),int(k[6:8]))
def first_table(L):
    first={}
    for k in sorted(L,key=order):
        l=L[k]
        for t in toks(l['target_text'])+[x for cc in (l.get('components') or []) for x in toks(cc.get('target'))]:
            first.setdefault(t,order(k))
    return first
F1=first_table(LA); F2=first_table(L2)
def untaught(text,pos,first): return {t for t in toks(text) if t not in first or first[t]>pos}
norm=lambda s: ' '.join(re.sub(r"[^\w'’ -]",' ',(s or '').lower()).split())
def contains(text,lego): return (' '+norm(lego)+' ') in (' '+norm(text)+' ')
# post-change phrase table
P2={}
for k,r in R.items():
    if r['lego'] in DEL_LEGO: continue
    if k in PH:
        if PH[k][0]=='del': continue
        P2[k]=dict(r,known_text=PH[k][1],target_text=PH[k][2])
    else: P2[k]=r
for r in INS_PH: P2[r['id'].split(':')[1]]=dict(r,lego='S%04dL%02d'%(r['seed_number'],r['lego_index']))
probs=[]
k2t={}
for k,p in P2.items():
    if p['phrase_role']=='component': continue
    k2t.setdefault(norm(p['known_text']),{}).setdefault(norm(p['target_text']),[]).append(k)
changed=[k for k in PH if PH[k][0]=='upd']+[r['id'].split(':')[1] for r in INS_PH]
for k in changed:
    p=P2[k]; lid=p['lego']; L=L2[lid]; pos=order(lid); old=R.get(k)
    if old and old['known_text']==p['known_text'] and old['target_text']==p['target_text']: probs.append(f'{k} NO CHANGE'); continue
    new=untaught(p['target_text'],pos,F2)-(untaught(old['target_text'],pos,F1) if old else set())
    if new: probs.append(f"{k} UNTAUGHT {sorted(new)} :: {p['target_text']}")
    if p['phrase_role']!='component':
        if not contains(p['target_text'],L['target_text']) and (not old or contains(old['target_text'],LA[lid]['target_text']) or lid in LEGO): probs.append(f"{k} target lacks LEGO [{L['target_text']}] :: {p['target_text']}")
        if not contains(p['known_text'],L['known_text']) and (not old or contains(old['known_text'],LA[lid]['known_text']) or lid in LEGO): probs.append(f"{k} known lacks LEGO [{L['known_text']}] :: {p['known_text']}")
        ts=k2t[norm(p['known_text'])]
        if len(ts)>1: probs.append(f"{k} ZUT '{p['known_text']}' -> "+' || '.join(f"{t} ({','.join(v[:3])})" for t,v in ts.items()))
        dup=[q for q,pp in P2.items() if q!=k and pp['lego']==lid and pp['phrase_role']==p['phrase_role'] and norm(pp['target_text'])==norm(p['target_text'])]
        if dup: probs.append(f"{k} DUP target in basket with {dup}")
# rows under a changed LEGO that were not touched
for lid in LEGO:
    L=L2[lid]
    for k,p in P2.items():
        if p['lego']==lid and p['phrase_role']!='component' and not (contains(p['target_text'],L['target_text']) and contains(p['known_text'],L['known_text'])):
            if k not in changed or True: probs.append(f"{k} UNDER CHANGED LEGO lacks it [{L['known_text']} | {L['target_text']}] :: {p['known_text']} | {p['target_text']}")
# floors
from collections import Counter
cnt=Counter((p['lego'],p['phrase_role']) for p in P2.values())
for lid,l in L2.items():
    if l['is_new'] and (cnt[(lid,'build')]+cnt[(lid,'use')]==0): probs.append(f'{lid} EMPTY new LEGO')
for lid in sorted(({R[k]['lego'] for k in PH if PH[k][0]=='del'}|set(LEGO))-set(DEL_LEGO)): print('floor',lid,'build',cnt[(lid,'build')],'use',cnt[(lid,'use')])
# stale forms left anywhere after the change
STALE=[r'theastaigh',r'fadó',r"d'oibrigh",r'corraitheach',r'(?<![Cc]én )\ban fáth\b',r'rud éigin difriúil',r'bhféadfadh sé a bheith',r'cosúil go',r'níos lú (?!ná)',r'muid a dhéanamh']
for k,p in P2.items():
    for s in STALE:
        if re.search(s,p['target_text']): probs.append(f"{k} STALE {s} :: {p['known_text']} | {p['target_text']}")
for lid,l in L2.items():
    for s in STALE:
        if re.search(s,l['target_text']): probs.append(f"{lid} LEGO STALE {s} :: {l['target_text']}")
# every word of a changed/new row must be taught by its position (full check for rows this job authored)
for k in changed:
    p=P2[k]
    if p['phrase_role']=='component': continue
    u=untaught(p['target_text'],order(p['lego']),F2)
    if u: probs.append(f"{k} WORD NOT TAUGHT BY ITS SEED {sorted(u)} :: {p['target_text']}")
# seed sentence in a played basket (P26) for the re-cut seeds
for n in SEED:
    kn,tg=SEED[n][0],SEED[n][1]
    if n<=300 and not any(norm(p['target_text'])==norm(tg) and norm(p['known_text'])==norm(kn) and L2[p['lego']]['is_new'] for p in P2.values() if int(p['lego'][1:5])>=n): probs.append(f'SEED {n} sentence is in no played basket')
print('\n'.join(sorted(set(probs))) or 'no problems')
print('seeds',len(SEED),'legos',len(LEGO),'+',len(INS_LEGO),'phrase upd',sum(1 for v in PH.values() if v[0]=='upd'),'del',sum(1 for v in PH.values() if v[0]=='del'),'ins',len(INS_PH),'lego del',len(DEL_LEGO))
