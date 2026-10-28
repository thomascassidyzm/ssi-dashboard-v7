import json,urllib.request,urllib.parse,re
c='cym_nv2_for_eng';b='http://localhost:3470/api/production/'+c
ids=set()
for q in ['cyfri','matter']:
    d=json.load(urllib.request.urlopen(b+'/learning-journey/search?q='+q))
    ids|={r['legoId'] for r in d['rounds']}
rows=[]
for l in sorted(ids):
    for p in json.load(urllib.request.urlopen(f'{b}/lego/{l}/basket'))['phrases']:
        p['_lego']=l; rows.append(p)
json.dump(rows,open(c+'.read.json','w'),ensure_ascii=False)
for p in rows:
    t=(p['target_text'] or '');k=(p['known_text'] or '')
    if re.search('cyfri',t) and re.search('matter',k):
        print(p['_lego'],p['id'].split(':')[1],p['phrase_role'],'|',k,'|',t,'|',json.dumps(p.get('decomposition'),ensure_ascii=False) if 'matter' in json.dumps(p.get('decomposition')) else '')
