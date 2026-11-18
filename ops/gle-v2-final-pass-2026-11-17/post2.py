# Posts every batch-<n>.ops.json to Popty's course-edit door as a DRY RUN (a rolled-back transaction). Never applies:
# an apply is a separate, deliberate step on Kai's yes (add "apply": true by hand, one batch at a time, keeping the answer's undo).
import json,sys,urllib.request,time,glob,re
for f in (sys.argv[1:] or sorted(glob.glob('batch-*.ops.json'))+['move-166.ops.json']):
    body=json.load(open(f)); req={'ops':body['ops']}
    r=urllib.request.Request('http://localhost:3470/api/production/gle_v2_for_eng/edit-batch',data=json.dumps(req).encode(),
        headers={'Content-Type':'application/json','x-agent-id':'worker-gle-v2-final-pass-410','x-agent-role':'content-dry-run'})
    t=time.time()
    try: res=json.load(urllib.request.urlopen(r,timeout=1200))
    except urllib.error.HTTPError as e: res={'http':e.code,'body':e.read().decode()[:6000]}
    res['_seconds']=round(time.time()-t,1); res['_ops']=len(body['ops'])
    out='dry-'+f.replace('batch-','').replace('.ops.json','.json'); json.dump(res,open(out,'w'),ensure_ascii=False,indent=0)
    print(f,'ok' if res.get('ok') else 'REFUSED',{k:res.get(k) for k in ('dryRun','applied','count','error','code','index','http','_seconds','_ops')},(res.get('body') or '')[:1500])
