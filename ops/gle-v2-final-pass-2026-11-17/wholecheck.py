# cs #410·AI — whole-course static checks on a saved Popty GET /api/production/gle_v2_for_eng/seeds answer (read-only).
# GAP (seed piece not covered by any LEGO, canon S3) · LONG (debut LEGO > 8 syllables, L3) · NOTINSEED (LEGO not in its seed)
# NOLEGO (phrase does not contain its LEGO) · UNTAUGHT (phrase word not in any LEGO taught at or before it)
# ZUT-LEGO (one English → two Irish among debut LEGOs) · ZUT-PHRASE (same English → different Irish across phrases/LEGOs)
# Usage: python3 wholecheck.py live-after.json > wholecheck.txt
import sys,collections,re
sys.path.insert(0,'../gle-v2-eoghan-43-2026-11-16'); from lib import *
S=load(sys.argv[1]); out=collections.defaultdict(list)
legos=[(n,l) for n in sorted(S) for l in S[n]['legos']]
for n in sorted(S):
    s=S[n]; L=s['legos']
    if not L: continue
    st=tok(s['target_text']); cov=[False]*len(st)
    for l in L:
        lt=tok(l['target_text']); f=find(st,lt) or find(dm(st),dm(lt))
        if not f: out['NOTINSEED'].append((n,l['lego_id'],l['target_text'],s['target_text']))
        for a in f:
            for j in range(a,a+len(lt)): cov[j]=True
        if l['is_new'] and syl(l['target_text'])>8: out['LONG'].append((n,l['lego_id'],l['target_text'],syl(l['target_text'])))
    if not all(cov): out['GAP'].append((n,' '.join(w for w,c in zip(st,cov) if not c),s['target_text']))
vocab=set(); 
for n,l in legos:
    vocab|=set(dm(tok(l['target_text'])))
    for c in l.get('components') or []: pass   # components are parts of the LEGO: their words are already in its target
    for p in l.get('basket_phrases') or []:
        if p['phrase_role']=='component': continue
        if not contains(p['target_text'],l['target_text']): out['NOLEGO'].append((p['id'].split(':')[1],l['target_text'],p['known_text'],p['target_text']))
        miss=[w for w in dm(tok(p['target_text'])) if w not in vocab]
        if miss: out['UNTAUGHT'].append((p['id'].split(':')[1],' '.join(miss),p['known_text'],p['target_text']))
def k(x): return re.sub(r'\s+',' ',x.lower().strip(' ?.!,'))
cl=collections.defaultdict(set); who=collections.defaultdict(list)
for n,l in legos:
    if l['is_new']: cl[k(l['known_text'])].add(k(l['target_text'])); who[k(l['known_text'])].append(l['lego_id'])
for kk,v in cl.items():
    if len(v)>1: out['ZUT-LEGO'].append((kk,sorted(v),who[kk]))
pc=collections.defaultdict(lambda:collections.defaultdict(list))
for n,l in legos:
    pc[k(l['known_text'])][k(l['target_text'])].append(l['lego_id'])
    for p in l.get('basket_phrases') or []:
        if p['phrase_role']!='component': pc[k(p['known_text'])][k(p['target_text'])].append(p['id'].split(':')[1])
for kk,v in pc.items():
    if len(v)>1: out['ZUT-PHRASE'].append((kk,{t:ids[:4] for t,ids in v.items()}))
print('seeds with LEGOs:',sum(1 for s in S.values() if s['legos']),'of',len(S),'| LEGOs',len(legos),'| phrases',sum(1 for n,l in legos for p in l.get('basket_phrases') or [] if p['phrase_role']!='component'))
for c in ['GAP','LONG','NOTINSEED','NOLEGO','UNTAUGHT','ZUT-LEGO','ZUT-PHRASE']:
    print(f'\n## {c}: {len(out[c])}')
    for x in out[c]: print('  ',*x)
