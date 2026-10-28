import json,sys,urllib.request,urllib.parse,re
c=sys.argv[1];b='http://localhost:3470/api/production/'+c
ids=set()
for q in ['funud','munud','moment ago','minute ago','a moment','ago']:
    d=json.load(urllib.request.urlopen(b+'/learning-journey/search?q='+urllib.parse.quote(q)))
    ids|={r['legoId'] for r in d['rounds']}
rows=[];legos={}
for l in sorted(ids):
    d=json.load(urllib.request.urlopen(f'{b}/lego/{l}/basket'))
    legos[l]={k:v for k,v in d.items() if k!='phrases'}
    for p in d['phrases']: p['_lego']=l; rows.append(p)
json.dump({'legos':legos,'rows':rows},open(c+'.read.json','w'),ensure_ascii=False)
pat=re.compile(r'[fm]unud',re.I)
for p in rows:
    if pat.search(p['target_text'] or '') or re.search('moment|minute',p['known_text'] or '',re.I):
        print(p['_lego'],p['id'].split(':')[1],p['phrase_role'],'|',p['known_text'],'|',p['target_text'])
