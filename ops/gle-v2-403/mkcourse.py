# Builds $CS_SCRATCH/course.json (the shape lib.py reads) from a saved Popty GET /api/production/gle_v2_for_eng/seeds answer.
# Usage: curl -s http://localhost:3470/api/production/gle_v2_for_eng/seeds > $CS_SCRATCH/seeds.json; python3 mkcourse.py
import json,os
SC=os.environ['CS_SCRATCH']; d=json.load(open(os.path.join(SC,'seeds.json')))['seeds']
S={};LA={};R={}
for s in d:
    S[str(s['seed_number'])]={'known':s['known_text'],'target':s['target_text']}
    for l in s.get('legos') or []:
        LA[l['lego_id']]={k:l.get(k) for k in('known_text','target_text','components','is_new','type','lego_index','seed_number','target_lego_id')}
        for p in l.get('basket_phrases') or []:
            k=p['id'].split(':')[1]
            R[k]={'id':p['id'],'lego':l['lego_id'],'phrase_role':p['phrase_role'],'known_text':p['known_text'],'target_text':p['target_text'],'position':p.get('position'),'metadata':p.get('metadata')}
json.dump({'S':S,'LA':LA,'rows':R},open(os.path.join(SC,'course.json'),'w'),ensure_ascii=False)
print('seeds',len(S),'legos',len(LA),'rows',len(R),'empty seeds (<=300, no rows):',[n for n in sorted(S,key=int) if not any(r['lego'].startswith('S%04d'%int(n)) for r in R.values())][:40])
