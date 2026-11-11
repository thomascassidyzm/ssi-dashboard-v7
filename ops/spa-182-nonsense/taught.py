import json,re
api=json.load(open('seeds.json'))
first_t={};first_k={}
def toks(s): return [t for t in re.findall(r"[\wáéíóúñü']+",s.lower())]
for s in sorted(api['seeds'],key=lambda s:s['seed_number']):
    n=s['seed_number']
    for l in s.get('legos') or []:
        texts=[(l['target_text'],l['known_text'])]
        for c in (l.get('components') or []):
            if isinstance(c,dict): texts.append((c.get('target') or c.get('target_text') or '',c.get('known') or c.get('known_text') or ''))
        for t,k in texts:
            for w in toks(t): first_t.setdefault(w,n)
            for w in toks(k): first_k.setdefault(w,n)
json.dump({'t':first_t,'k':first_k},open('first.json','w'))
def check(seed,known,target):
    ut=[(w,first_t.get(w)) for w in toks(target) if first_t.get(w,9999)>seed]
    uk=[(w,first_k.get(w)) for w in toks(known) if first_k.get(w,9999)>seed]
    return ut,uk
if __name__=='__main__':
    for o in json.load(open('nonsense.json')):
        if o['deleted'] or o['changed'] or not o['after255'] or o['after255']=='DELETE' or len(o['after255'])<2: continue
        seed=int(o['id'][1:5]); ut,uk=check(seed,*o['after255'])
        print(o['id'],'T:',ut,'K:',uk)
