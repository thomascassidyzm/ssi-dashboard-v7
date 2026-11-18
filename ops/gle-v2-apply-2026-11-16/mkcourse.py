# Builds live-snapshot.json (slim: seeds, LEGOs, phrase rows) from a saved Popty
# GET /api/production/gle_v2_for_eng/seeds answer. Usage: python3 mkcourse.py <seeds.json>
import json,sys
raw=json.load(open(sys.argv[1]))['seeds']
S={};LA={};R={}
for s in raw:
    S[str(s['seed_number'])]={'known':s['known_text'],'target':s['target_text'],'updated_at':s['updated_at'],'status':s['status']}
    for l in s.get('legos') or []:
        LA[l['lego_id']]={k:l.get(k) for k in('known_text','target_text','components','is_new','type','lego_index','seed_number','updated_at','presentation_audio_id')}
        for p in l.get('basket_phrases') or []:
            k=p['id'].split(':')[1]
            R[k]={'id':p['id'],'lego':l['lego_id'],'phrase_role':p['phrase_role'],'known_text':p['known_text'],'target_text':p['target_text'],'position':p.get('position')}
json.dump({'read_at':'2026-11-16','route':'GET :3470/api/production/gle_v2_for_eng/seeds','S':S,'LA':LA,'rows':R},open('live-snapshot.json','w'),ensure_ascii=False,indent=0)
print('seeds',len(S),'legos',len(LA),'rows',len(R))
print('last seed edit',max(s['updated_at'] for s in S.values()),'last lego edit',max(l['updated_at'] for l in LA.values()))
