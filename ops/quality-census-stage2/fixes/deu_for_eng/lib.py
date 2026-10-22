import json,re,os
S=os.environ['CS_SCRATCH']
b=json.load(open(S+'/seeds.json'))
seeds={s['seed_number']:s for s in b['seeds']}
legos={};phrases={};byLego={}
for s in b['seeds']:
  for l in s['legos']:
    legos[l['lego_id']]=l
    for p in l.get('basket_phrases') or []:
      p=dict(p);p['_lego']=l['lego_id'];p['_new']=l.get('is_new') is not False
      phrases[p['id']]=p;byLego.setdefault(l['lego_id'],[]).append(p)
def norm(t):return re.sub(r'\s+',' ',re.sub(r'[.,!?;:"«»„“]+',' ',(t or '').lower().replace('’',"'"))).strip()
