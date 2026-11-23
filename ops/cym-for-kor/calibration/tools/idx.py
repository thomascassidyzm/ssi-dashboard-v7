import json,re
d=json.load(open('nv2.json'));S={a['seed_number']:a for a in d['seeds']}
L={};P=[]
for a in d['seeds']:
  for l in a['legos']:
    L[l['lego_id']]=l
    for p in l['basket_phrases']: P.append(p)
def norm(t): return re.sub(r'[^\w’\' ]','',t.replace("'", "’")).lower().strip()
byT={}
for p in P: byT.setdefault(norm(p['target_text']),[]).append(p)
