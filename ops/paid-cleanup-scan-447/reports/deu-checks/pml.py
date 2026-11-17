import json,os,re,sys
from collections import Counter,defaultdict
S=os.environ['CS_SCRATCH']
tok=lambda s:re.findall(r"[\wäöüßÄÖÜ']+",(s or '').replace('’',"'").lower())
def contig(a,b):
    n=len(a); return any(b[i:i+n]==a for i in range(len(b)-n+1))
res={}
for c in sys.argv[1:]:
    d=json.load(open(f'{S}/{c}.json')); cat=Counter(); per=defaultdict(list)
    for s in d['seeds']:
        for l in s['legos']:
            if not l.get('is_new'): continue
            LK,LT=tok(l['known']),tok(l['target'])
            for p in l.get('phrases',[]):
                if p['type'] in ('component','lego_debut'): continue
                PK,PT=tok(p['known']),tok(p['target'])
                kok=contig(LK,PK); tok_=contig(LT,PT)
                if kok and tok_: continue
                tset=all(w in PT for w in LT); kset=all(w in PK for w in LK)
                if not tok_:
                    if tset: m='T split/reordered (K49 ok)'
                    else:
                        miss=[w for w in LT if w not in PT]
                        # inflection: same stem first 4 letters present
                        if all(any(x[:4]==w[:4] for x in PT) for w in miss): m='T other form (K50?)'
                        elif len(miss)<len(LT): m='T part missing'
                        else: m='T LEGO absent'
                    cat[m]+=1; per[m].append((p['id'].split(':')[-1],l['known'],l['target'],p['known'],p['target']))
                if not kok:
                    if kset: m='K split/reordered'
                    else:
                        miss=[w for w in LK if w not in PK]
                        if set(miss)<= {'a','an','the','to','it'}: m='K article/to/it only (K6/K54)'
                        elif all(any(x[:4]==w[:4] for x in PK) for w in miss): m='K other form (K6 ok)'
                        else: m='K words missing'
                    cat[m]+=1; per[m].append((p['id'].split(':')[-1],l['known'],l['target'],p['known'],p['target']))
    print(c,dict(cat)); res[c]=per
json.dump(res,open(f'{S}/w/pml.json','w'),ensure_ascii=False)
