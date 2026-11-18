"""Job #922 follow-up: decomposition JSON on phrases still carried 'cwpl o ddyddiau' (a stored copy of the target text)."""
import json,urllib.request
C='cym_sv2_for_eng';base='http://localhost:3470/api/production/'+C
def fix(o):
    if isinstance(o,dict): return {k:fix(v) for k,v in o.items()}
    if isinstance(o,list): return [fix(v) for v in o]
    if isinstance(o,str): return o.replace('cwpl o ddyddiau','cwpl o ddiwrnodiau')
    return o
ops=[];seen=[]
for l in ['S1274L03','S1294L02','S1326L03']:
    for p in json.load(urllib.request.urlopen(f'{base}/lego/{l}/basket',timeout=60))['phrases']:
        for f in ('decomposition',):
            v=p.get(f)
            if v and 'cwpl o ddyddiau' in json.dumps(v,ensure_ascii=False):
                ops.append({'op':'phrase.update','phrase_id':p['id'],'set':{f:fix(v)},'expect':{f:v}})
print(len(ops));json.dump({'ops':ops},open('decomp-ops.json','w'),ensure_ascii=False,indent=1)
