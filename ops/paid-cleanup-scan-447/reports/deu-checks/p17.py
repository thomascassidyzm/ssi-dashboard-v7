import json,os,re
from lib import *
S=os.environ['CS_SCRATCH']
tok=lambda s:re.findall(r"[\wäöüßÄÖÜ']+",(s or '').replace('’',"'").lower())
HON={'mein','herr','gnädige','frau'}
SPLIT={'S0083L01','S0122L01','S0133L01','S0155L01','S0190L01','S0281L01','S0288L02','S0496L01','S0524L05','S0540L04','S0618L02'}
K422={12,322,339,453,264,50,130,149,158,165,197,211,239,270,276,301,391,134,151,195,231,288,307,524,540,56,634,522,377,537,564,514,499}
ids=known_ids(MAIN_DOCS)
d=json.load(open(f'{S}/deu_for_eng.json')); out=[]
for s in d['seeds']:
    for l in s['legos']:
        if not l.get('is_new') or l['id'] in SPLIT: continue
        LT=tok(l['target']); formal=bool(re.search(r'\b(sir|madam)\b',l['known']))
        if formal: LT=[w for w in LT if w not in HON]
        rows=[p for p in l.get('phrases',[]) if p['type'] not in ('component','lego_debut')]
        if not rows: continue
        bad=[p for p in rows if not all(w in tok(p['target']) for w in LT) or (formal and not re.search(r'\b(sir|madam)\b',p['known']))]
        if len(bad)/len(rows)>=.5:
            kn='K' if (s['n'] in K422 or l['id'] in ids or any(p['id'].split(':')[-1] in ids for p in bad)) else ''
            chars=sum(len(p['known'])+2*len(p['target']) for p in bad)
            out.append(dict(id=l['id'],seed=s['n'],known=l['known'],target=l['target'],rows=len(rows),bad=len(bad),chars=chars,known_flag=kn,eg=[(p['id'].split(':')[-1],p['known'],p['target']) for p in bad[:3]]))
json.dump(out,open(f'{S}/w/p17.json','w'),ensure_ascii=False)
print(len(out),'LEGOs',sum(x['bad'] for x in out),'rows',sum(x['chars'] for x in out),'chars; known',[x['id'] for x in out if x['known_flag']])
