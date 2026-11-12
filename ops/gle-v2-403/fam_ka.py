# K group A (Kai, 12 Nov, the keep-ours style list): K1 enough / a lot / many split (dóthain / a lán / mórán), K2 yet / still split
# (go fóill / fós), K3 instead of = seachas. Applied in every seed; the English word in the row is the cue.
from lib import *
K1='K1 enough / a lot / many'; K2='K2 yet / still'; K3='K3 instead of'
def comps(k,pairs):
    out=[]
    for cc in LA[k]['components'] or []:
        t=cc.get('target') or ''
        for a,b in pairs: t=re.sub(a,b,t)
        out.append({'known':cc.get('known'),'target':t})
    return out
# ---------- K1
ADV=re.compile(r"go (tapa|dian|maith|mall|luath) go leor")      # adverb + enough stays go leor (Eoghan keeps it at 91)
def k1(kn,t):
    if 'go leor' not in re.sub(r'ceart go leor','',t,flags=re.I): return t,None
    if ADV.search(t) and len(re.findall('go leor',t))==1: return t,'adverb + enough'
    l=kn.lower()
    if 'enough' in l and not ADV.search(t): w='dóthain'
    elif re.search(r'\bmany\b',l) and not re.search(r'a lot|lots',l): w='mórán'
    else: w='a lán'
    hold=[]
    def r(m):
        return m.group(0) if m.group(0).lower().startswith('ceart') or hold else w
    t2=re.sub(r"ceart go leor|(?<!tapa )(?<!dian )(?<!maith )go leor",lambda m: m.group(0) if m.group(0).lower().startswith('ceart') else w,t,flags=re.I)
    return t2,w
for n in ('58','60','89','103','109','244','294','363','378','475'):
    t2,w=k1(S[n]['known'],S[n]['target'])
    if t2!=S[n]['target']: seed(int(n),None,t2,K1,f"K1: {w}")
lego('S0058L03',K1,'K1',target_text='dóthain focal',components=comps('S0058L03',[('go leor','dóthain')]))
lego('S0060L03',K1,'K1',target_text='dóthain focal éagsúil',components=comps('S0060L03',[('go leor','dóthain')]))
lego('S0089L06',K1,'K1',target_text='a lán')
lego('S0103L03',K1,'K1',target_text='mórán')
lego('S0244L01',K1,'K1',target_text='Tá a lán foghlamtha agam',components=comps('S0244L01',[('go leor','a lán')]))
lego('S0294L02',K1,'K1',target_text='dóthain ama',components=comps('S0294L02',[('go leor','dóthain')]))
K1KEEP={}
for k,r in sorted(R.items()):
    if r['phrase_role']=='component' and r['lego'] not in LEGO: continue
    t2,w=k1(r['known_text'],r['target_text'])
    if w=='adverb + enough': K1KEEP[k]=w; continue
    if t2==r['target_text']: continue
    n=int(k[1:5]); kn=r['known_text']
    if (w=='a lán' and n<89) or (w=='mórán' and n<103):
        # written when go leor was 'enough' (58, 60); a lán / mórán are not taught this early, so the row goes back to 'enough | dóthain'
        t2=t2.replace(w,'dóthain'); kn=re.sub(r"\b(all the|a lot of|lots of|so many|many|more and more)\b","enough",kn); w='dóthain (row is before a lán / mórán is taught; English set to enough)'
    PH[k]=('upd',kn,t2,K1,f"K1: {w}")
# ---------- K2
def k2(kn,t):
    n=len(re.findall(r'\bfós\b',t)); l=kn.lower()
    cues=[m.group(0) for m in re.finditer(r'\byet\b|\bstill\b',l)]
    if not n or 'yet' not in cues: return t
    if n==1: return re.sub(r'\bfós\b','go fóill',t)
    if n==len(cues):
        it=iter(cues); return re.sub(r'\bfós\b',lambda m:'go fóill' if next(it)=='yet' else 'fós',t)
    return None
for n in sorted(S,key=int):
    t2=k2(S[n]['known'],SEED[int(n)][1] if int(n) in SEED else S[n]['target'])
    if t2 and t2!=(SEED[int(n)][1] if int(n) in SEED else S[n]['target']): seed(int(n),None,t2,(K1+' + '+K2) if int(n) in SEED else K2,'K2: yet = go fóill')
for k in ('S0060L06','S0088L05','S0115L05'): lego(k,K2,'K2',target_text='go fóill')
lego('S0096L02',K2,'K2',target_text='níl mé réidh go fóill',components=comps('S0096L02',[(r'\bfós\b','go fóill')]))
K2ODD=[]
for k,r in sorted(R.items()):
    cur=PH[k][2] if k in PH else r['target_text']
    if r['phrase_role']=='component':
        if r['lego'] in('S0096L02','S0088L05') and re.fullmatch(r'fós',cur.strip()): PH[k]=('upd',r['known_text'],'go fóill',K2,'K2: word tile')
        continue
    t2=k2(r['known_text'],cur)
    if t2 is None: K2ODD.append(k); continue
    if t2!=cur: PH[k]=('upd',r['known_text'],t2,(PH[k][3]+' + '+K2) if k in PH else K2,'K2: yet = go fóill')
# ---------- K3 (two sentence-only seeds; 'than' 137 and 'despite' 593 left, question for Eoghan)
seed(502,None,S['502']['target'].replace('in áit ar dheis','seachas ar dheis'),K3,"K3: Eoghan's seachas")
seed(523,None,"seachas leithscéal a thabhairt",K3,"K3: Eoghan's seachas")
STALE=[]
if __name__=='__main__':
    import collections
    print(collections.Counter(v[3] for v in PH.values()), len(SEED), len(LEGO))
    for n,v in sorted(SEED.items()): print('SEED',n,v[2],'|',S[str(n)]['target'],'→',v[1])
    print('K1 keep (adverb+enough):',len(K1KEEP)); print('K2 odd:',K2ODD)
    import random; random.seed(1)
    for k in random.sample(sorted(PH),30): print(k,PH[k][3],'|',R[k]['known_text'][:70],'|',PH[k][2][:110])
