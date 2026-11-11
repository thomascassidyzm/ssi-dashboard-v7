import json,re,sys
api=json.load(open('seeds.json'))
k,t,mx=sys.argv[1],sys.argv[2],int(sys.argv[3])
n=0
for s in api['seeds']:
    if s['seed_number']>mx: continue
    for l in s.get('legos') or []:
        if re.search(k,l['known_text'],re.I) and re.search(t,l['target_text'],re.I): print('LEGO',l['lego_id'],l['known_text'],'|',l['target_text'])
        for p in l.get('basket_phrases') or []:
            if re.search(k,p['known_text'],re.I) and re.search(t,p['target_text'],re.I):
                n+=1
                if n<=6: print(' ',p['id'].split(':')[1],p['known_text'],'|',p['target_text'])
print('total phrases',n)
