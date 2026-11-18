"""Job #924 scan (Aran ruling 2026-10-28): list every phrase/seed/LEGO whose Welsh has reit / (d)distaw / (t)awel / dawel or whose English has rather/quiet. Read-only, via Popty. Usage: scan.py <course> <out.json>"""
import json,re,sys,urllib.request
course,out=sys.argv[1],sys.argv[2]
base='http://localhost:3470/api/production/'+course
def get(u): return json.load(urllib.request.urlopen(u,timeout=120))
W=re.compile(r'reit|distaw|dawel|tawel',re.I); E=re.compile(r'rather|quiet',re.I)
legos=set()
for q in ['reit','distaw','dawel','tawel','quiet','rather']:
    for r in get(f'{base}/learning-journey/search?q={q}')['rounds']: legos.add(r['legoId'])
hits=[]
for l in sorted(legos):
    for p in get(f'{base}/lego/{l}/basket')['phrases']:
        t,k=p['target_text'] or '',p['known_text'] or ''
        if W.search(t) or E.search(k): hits.append({'lego':l,'id':p['id'],'role':p['phrase_role'],'target':t,'known':k,'kaid':p.get('known_audio_id')})
S=get(f'{base}/seeds'); S=S.get('seeds',S)
for s in S:
    t,k=s['target_text'] or '',s.get('known_text') or ''
    if W.search(t) or E.search(k): hits.append({'lego':'SEED','id':s['seed_number'],'role':'seed','target':t,'known':k})
json.dump(hits,open(out,'w'),ensure_ascii=False,indent=1); print(course,len(legos),'legos',len(hits),'hits')
