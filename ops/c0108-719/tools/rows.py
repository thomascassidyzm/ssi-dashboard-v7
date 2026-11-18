import json,sys,os
sys.path.insert(0,os.path.dirname(__file__)); import popty
C=sys.argv[1]; full=len(sys.argv)>2
rows=[r for r in json.load(open(os.path.join(popty.ROOT,'item5-rows-from-scan.json'))) if r['course']==C]
ids={(r.get('row_id') or r.get('row')) for r in rows}
for lid in sorted({i[:8] for i in ids}):
    d=popty.load(C,int(lid[1:5])); L=d['legos'][lid]; l=L['lego']
    print(f"{lid} new={L['is_new']} {l['type']} '{l['known_text']}'='{l['target_text']}' seed={d['seed_pair']}")
    for p in sorted(L['phrases'],key=lambda p:p['position']):
        pid=p['id'].split(':')[1]
        if full or pid in ids or p['phrase_role']=='build': print(('  *' if pid in ids else '   '),pid,p['phrase_role'][0],p['known_text'],'|',p['target_text'])
