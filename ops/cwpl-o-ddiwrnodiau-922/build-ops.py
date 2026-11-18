"""Aran ruling 2026-10-28 (job #922): sv2 'cwpl o ddyddiau' -> 'cwpl o ddiwrnodiau' (+ component 'ddyddiau' in S1274L03). Fresh read via Popty, `expect` guards."""
import json,re,urllib.request
C='cym_sv2_for_eng';PAT=r'\bcwpl o ddyddiau\b';NEW='cwpl o ddiwrnodiau'
base='http://localhost:3470/api/production/'+C
g=lambda u:json.load(urllib.request.urlopen(u,timeout=60))
ops=[]
for l in ['S1274L03','S1294L02','S1326L03']:
    for p in g(f'{base}/lego/{l}/basket')['phrases']:
        t=p['target_text'] or ''
        if re.search(PAT,t): ops.append({'op':'phrase.update','phrase_id':p['id'],'set':{'target_text':re.sub(PAT,NEW,t)},'expect':{'target_text':t}})
        elif l=='S1274L03' and p['phrase_role']=='component' and t=='ddyddiau': ops.append({'op':'phrase.update','phrase_id':p['id'],'set':{'target_text':'ddiwrnodiau'},'expect':{'target_text':t}})
S=g(f'{base}/seeds');S=S.get('seeds',S)
for s in S:
    if re.search(PAT,s['target_text'] or ''): ops.append({'op':'seed.update','seed_number':s['seed_number'],'set':{'target_text':re.sub(PAT,NEW,s['target_text'])},'expect':{'target_text':s['target_text']}})
ops.append({'op':'lego.update','lego_id':'S1274L03','set':{'target_text':'mewn cwpl o ddiwrnodiau'},'expect':{'target_text':'mewn cwpl o ddyddiau'}})
json.dump({'ops':ops},open('ops.json','w'),ensure_ascii=False,indent=1);print(len(ops))
