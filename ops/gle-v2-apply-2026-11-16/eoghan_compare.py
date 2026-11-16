# Compares each seed's PLANNED text (plan.json for 1-300, gt300-seeds.json, else live) with Eoghan's Bileog1 line
# (F = his Irish, C = the text he was shown). Writes eoghan-compare.json. Read-only.
import json,re,sys,os
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..','gle-v2-eoghan-excel-2026-11-16'))
S=json.load(open('live-snapshot.json'))['S']; P=json.load(open('plan.json'))['plan']; G=json.load(open('gt300-seeds.json'))
his=json.load(open('../gle-v2-eoghan-excel-2026-11-16/his-bileog1.json'))[1:]
nrm=lambda s:' '.join(re.sub(r"[^\w ]",'',(s or '').lower().replace('’',"'")).split())
out=[]
for r in his:
    n=r['A']; live=S[n]['target']
    plan=P[n]['target'] if n in P else (G[n][1] if n in G else live)
    F=r.get('F',''); C=r.get('C','')
    out.append({'n':int(n),'plan':plan,'live':live,'his':F,'shown':C,'his_en':r.get('E'),'our_en':(P[n]['known'] if n in P else (G[n][0] if n in G else S[n]['known'])),
      'plan_eq_his':nrm(plan)==nrm(F),'he_changed':nrm(F)!=nrm(C),'extra':{k:v for k,v in r.items() if k not in 'ABCDEFr' and v}})
json.dump(out,open('eoghan-compare.json','w'),ensure_ascii=False,indent=0)
import collections
c=collections.Counter((x['plan_eq_his'],x['he_changed']) for x in out); print(c)
