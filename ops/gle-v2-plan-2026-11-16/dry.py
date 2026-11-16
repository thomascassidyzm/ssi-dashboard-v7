# DRY RUN ONLY: posts ops.json to Popty edit-batch without "apply". This script has no apply mode on purpose.
import json,sys,urllib.request
ops=json.load(open('ops.json'))['ops']
def post(body):
    req=urllib.request.Request('http://localhost:3470/api/production/gle_v2_for_eng/edit-batch',data=json.dumps(body).encode(),headers={'Content-Type':'application/json','x-agent-id':'cs-107-gle-v2-plan-fable','x-agent-role':'content-plan-dry-run'})
    try: return json.load(urllib.request.urlopen(req,timeout=300))
    except urllib.error.HTTPError as e: return {'http':e.code,'body':e.read().decode()[:4000]}
mode=sys.argv[1] if len(sys.argv)>1 else 'all'
clean=[{k:v for k,v in o.items() if k!='_seed'} for o in ops]
if mode=='all':
    r=post({'ops':clean}); r.pop('undo',None)
    json.dump(r,open('dry-run-whole.json','w'),ensure_ascii=False,indent=1); print(json.dumps(r,ensure_ascii=False)[:1500])
else:   # per seed, to find every refusal rather than only the first
    out=[];seeds=sorted({o['_seed'] for o in ops})
    for n in seeds:
        chunk=[{k:v for k,v in o.items() if k!='_seed'} for o in ops if o['_seed']==n]
        r=post({'ops':chunk}); r.pop('undo',None)
        slim={'seed':n,'ops':len(chunk)}; slim.update({k:r.get(k) for k in ('ok','dryRun','applied','error','code','http','body','index','changed') if k in r})
        out.append(slim)
    json.dump(out,open('dry-run-per-seed.json','w'),ensure_ascii=False,indent=1)
    bad=[o for o in out if not o.get('ok')]
    print('seeds',len(out),'ok',len(out)-len(bad),'refused',len(bad))
    for b in bad: print(json.dumps(b,ensure_ascii=False)[:600])
