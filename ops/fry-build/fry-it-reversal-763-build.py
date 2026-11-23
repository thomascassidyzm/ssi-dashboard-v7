import json,re
from frames import FR
FRd={x[0]:x for x in FR}
d=json.load(open('../seeds.json'))
R={}
for s in d['seeds']:
  R['SEED%d'%s['seed_number']]=(s['known_text'],s['target_text'])
  for l in s['legos']:
    R['LEGO:'+l['lego_id']]=(l['known_text'],l['target_text'])
    for p in l['basket_phrases']: R[p['id'].split(':')[-1]]=(p['known_text'],p['target_text'])
auto={a['key']:a['new'][0] for a in json.load(open('auto.json'))}
def rep(k,old,new,occ=1):
  kn=R[k][0]; i=kn.find(old)
  assert i>=0,(k,old,kn)
  return kn[:i]+new+kn[i+len(old):]
man={}
# S0607 set: "if I'd known" -> "if I'd known it"
for k in ["LEGO:S0607L01","S0607L02U02","S0607L01B03","S0607L01B01","S0607L01B02","S0607L01U05","S0607L01U02","S0607L01U03","S0607L01U04","S0607L01U01","S0639L02U01"]:
  man[k]=rep(k,"if I'd known","if I'd known it")
man["SEED607"]=rep("SEED607","If I'd known","If I'd known it")
man["SEED425"]=rep("SEED425","they understand","they understand it")
man["S0183L01B01"]=rep("S0183L01B01","I can't remember","I can't remember it")
for k in ["S0008L04B03","S0008L04B01","S0008L04B02","S0008L04U05","S0008L04U01","S0008L04U02","S0008L04U04","S0011L03B04"]:
  man[k]=rep(k,"I'm going to try","I'm going to try it")
man["S0105L01B02"]=rep("S0105L01B02","we're not trying","we're not trying it")
man["S0176L02U06"]=rep("S0176L02U06","I don't understand","I don't understand it")
man["S0270L01B03"]=rep("S0270L01B03","I can't remember","I can't remember it")
man["SEED77"]=rep("SEED77","starting to understand","starting to understand it")
# ik besykje it (bare) = "I'm trying it"
for k in ["S0017L02B03","S0042L03U01","S0049L03B02","S0055L03B03","S0060L01U05","S0077L03U01","S0078L01B02","S0080L01U01","S0085L02B02","S0088L01B02","S0089L02U06","S0091L05U05","S0091L03U01","S0091L01B03","S0091L01U02","S0137L03U04","S0146L01U01"]:
  man[k]=rep(k,"I'm trying","I'm trying it")
# S0060L01B03 gets both: auto gives "know it yet"; add trying it
new=dict(auto); 
for k,v in man.items():
  assert k not in new,k
  new[k]=v
new["S0060L01B03"]=new["S0060L01B03"].replace("I'm trying","I'm trying it",1)
rows=[]
for k,v in new.items():
  kn,tg=R[k]
  if v==kn: continue
  fam='s0008l04' if (k=='LEGO:S0008L04' or k.startswith('S0008L04') or 'sil it besykje' in tg.lower()) else 'rest'
  rows.append(dict(key=k,family=fam,old=[kn,tg],new=[v,tg]))
print(len(rows),{f:sum(1 for r in rows if r['family']==f) for f in ('s0008l04','rest')})
json.dump(rows,open('rows.json','w'),ensure_ascii=False,indent=1)
# ZUT: known->set(targets), before vs after
from collections import defaultdict
def zmap(over):
  m=defaultdict(set)
  for k,(kn,tg) in R.items():
    kn=over.get(k,kn)
    m[re.sub(r'[^\w\' ]','',kn.lower()).strip()].add(re.sub(r'[^\wâêôûúéèëïöü\' ]','',tg.lower()).strip())
  return m
b=zmap({}); a=zmap({r['key']:r['new'][0] for r in rows})
newclash=[(k,v) for k,v in a.items() if len(v)>1 and (k not in b or len(b[k])<len(v))]
gone=[(k,v) for k,v in b.items() if len(v)>1 and (k not in a or len(a[k])<len(v))]
print('NEW clashes',newclash); print('resolved/reduced',gone)
# LEGO-level: new LEGO knowns vs any row with same known
for r in rows:
  if r['key'].startswith('LEGO:'):
    kk=re.sub(r'[^\w\' ]','',r['new'][0].lower()).strip(); print(r['key'],r['new'][0],'->',a[kk])
