import json,re,sys
api=json.load(open('seeds.json'))
first_t={};first_k={}
def toks(s): return re.findall(r"[\wáéíóúñü']+",s.lower())
for s in sorted(api['seeds'],key=lambda s:s['seed_number']):
    n=s['seed_number']
    for l in s.get('legos') or []:
        for w in toks(l['target_text']): first_t.setdefault(w,n)
        for w in toks(l['known_text']): first_k.setdefault(w,n)
json.dump({'t':first_t,'k':first_k},open('first.json','w'),ensure_ascii=False)
