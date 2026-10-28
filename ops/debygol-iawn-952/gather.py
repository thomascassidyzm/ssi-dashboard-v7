import json,sys,urllib.request,re
c=sys.argv[1];b='http://localhost:3470/api/production/'+c
d=json.load(urllib.request.urlopen(b+'/learning-journey/search?q=debygol'))
ids=sorted({r['legoId'] for r in d['rounds']})
d2=json.load(urllib.request.urlopen(b+'/learning-journey/search?q=very%20likely'))
ids=sorted(set(ids)|{r['legoId'] for r in d2['rounds']})
rows=[]
for l in ids:
    for p in json.load(urllib.request.urlopen(f'{b}/lego/{l}/basket'))['phrases']:
        p['_lego']=l; rows.append(p)
json.dump(rows,open(c+'.read.json','w'),ensure_ascii=False)
for p in rows:
    if re.search('debygol|very likely',(p['target_text'] or '')+(p['known_text'] or ''),re.I):
        print(p['_lego'],p['id'].split(':')[1],p['phrase_role'],'|',p['known_text'],'|',p['target_text'])
