#!/usr/bin/env python3
"""Pull the 17 Nov scan's REAL rows for families 11 (P17), 13 (ZUT), 17 (GAPPED), 19 (LONG)
and the taught-NEW-twice part of 16 (FLAGS) out of reports/*.json, using the SAME family
mapping as combined/fam.py. Reads slice JSON only. Output: data/scan-<FAM>.json"""
import json,glob,re,collections,os,sys
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.join(HERE,'..','..')
src=open(os.path.join(ROOT,'combined','fam.py')).read()
ns={}
exec(src[src.index('RULES=['):src.index('rows=collections')],{'re':re},ns)
RULES=ns['RULES']
out=collections.defaultdict(list)
for f in sorted(glob.glob(os.path.join(ROOT,'reports','*.json'))):
    if f.endswith('patterns.json'): continue
    sl=os.path.basename(f)[:-5]
    for r in json.load(open(f)):
        if not isinstance(r,dict) or not str(r.get('verdict','')).upper().startswith('REAL'): continue
        fam=str(r.get('family'));key=f'{sl}|{r.get("course")}|{fam}'
        if fam.startswith('B LEGO drifted'): key='L26 '+key
        k='L26' if key.startswith('L26 ') else next((k for k,re_ in RULES if re.search(re_,key,re.I)),'OTHER')
        if k in('P17','ZUT','GAPPED','LONG','FLAGS'):
            out[k].append({'slice':sl,'course':r.get('course'),'family':fam,'row':r.get('row') or r.get('row_id'),
              'known':r.get('known'),'target':r.get('target'),'fix':r.get('recommended_fix') or r.get('fix'),
              'confidence':r.get('confidence'),'canon':r.get('canon_ref') or r.get('canon'),'chars':r.get('chars'),'source':r.get('source')})
for k,v in out.items():
    json.dump(v,open(os.path.join(HERE,'..','data',f'scan-{k}.json'),'w'),ensure_ascii=False,indent=0)
    c=collections.Counter(x['course'] for x in v)
    print(k,len(v),dict(c.most_common()))
