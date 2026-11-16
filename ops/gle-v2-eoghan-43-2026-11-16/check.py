# Static checks on an Ed after-state, for the seeds a batch touches: coverage (no gaps), 8-syllable cap,
# every phrase contains its LEGO, no untaught word in a changed/new phrase, one-English-two-Irish among new LEGOs.
import collections
from lib import *
def check(ed,seeds):
    legos,ph=ed.after(); out=[]
    touched={lid for lid,l in legos.items() if l['seed'] in seeds}
    # vocabulary in teaching order
    order=sorted(legos,key=lambda x:(legos[x]['seed'],legos[x]['idx']))
    def vocab_upto(n,idx):
        v=set()
        for x in order:
            l=legos[x]
            if (l['seed'],l['idx'])<=(n,idx): v|=set(dm(tok(l['target'])))
        return v
    vc={}
    for n in seeds:
        tgt=ed.seedtext.get(n,(None,ed.S[n]['target_text']))[1]; st=tok(tgt); cov=[False]*len(st)
        mine=[x for x in order if legos[x]['seed']==n]
        for x in mine:
            lt=tok(legos[x]['target']); f=find(st,lt) or find(dm(st),dm(lt))
            if not f and n<=300: out.append(('NOT IN SEED',n,x,legos[x]['target']))
            for a in f:
                for j in range(a,a+len(lt)): cov[j]=True
        if mine and not all(cov): out.append(('GAP',n,' '.join(w for w,c in zip(st,cov) if not c)))
        for x in mine:
            if legos[x]['is_new'] and syl(legos[x]['target'])>8: out.append(('LONG',x,legos[x]['target'],syl(legos[x]['target'])))
    for k,p in ph.items():
        l=legos.get(p['lego'])
        if l is None: out.append(('ORPHAN',k)); continue
        if p['lego'] in touched or p['changed']:
            if not contains(p['target'],l['target']): out.append(('NO LEGO',k,l['target'],p['target']))
        if p['changed']:
            key=(l['seed'],l['idx'])
            if key not in vc: vc[key]=vocab_upto(*key)
            old=set(dm(tok(ed.P[k]['target_text']))) if k in ed.P and ed.P[k]['lego']==p['lego'] else set()
            miss=[w for w in dm(tok(p['target'])) if w not in vc[key] and w not in old]
            if miss: out.append(('UNTAUGHT',k,' '.join(miss),p['target']))
    seen=collections.defaultdict(list)
    for k,p in ph.items():
        if p['lego'] in touched or p['changed']: seen[(p['lego'],' '.join(tok(p['target'])))].append(k)
    for (lg,t),ks in seen.items():
        if len(ks)>1 and any(ph[k]['changed'] for k in ks): out.append(('DUP',lg,ks,t))
    cl=collections.defaultdict(set); who=collections.defaultdict(set)
    for x,l in legos.items():
        if l['is_new']:
            kk=l['known'].lower().strip('?. '); cl[kk].add(l['target'].lower().strip('?. ')); who[kk].add(x)
    for kk,v in cl.items():
        if len(v)>1 and who[kk]&touched: out.append(('CLASH',kk,sorted(v),sorted(who[kk])))
    return out
