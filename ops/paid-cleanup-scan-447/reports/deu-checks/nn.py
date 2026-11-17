import json,os,sys,re
from lib import *
c=sys.argv[1]; d,h=load(c)
legos=[(s['n'],l) for s in d['seeds'] for l in s['legos']]
tok=lambda s:re.findall(r"[\wäöüßÄÖÜ']+",(s or '').lower())
for x in h['hits'].get('notnew_untaught',[]):
    n=int(x['id'][1:5]); T=tok(x['target']); K=tok(x['known'])
    src=[]
    for sn,l in legos:
        if sn>n or l['id']==x['id'] : continue
        if sn==n and not l.get('is_new'): continue
        lt=tok(l['target'])
        if all(w in lt for w in T): src.append(f"{l['id']}:{l['known']}|{l['target']}"); 
    print(x['id'],x['known'],'|',x['target'],' <=',src[:2] if src else 'NEVER TAUGHT')
