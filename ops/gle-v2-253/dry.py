# Sends ops.json to Popty edit-batch. Dry run by default; `apply` applies in chunks of 60 (5 s statement cap).
import json,sys,urllib.request
ops=json.load(open(sys.argv[2] if len(sys.argv)>2 else 'ops.json'))['ops']
def post(body):
    req=urllib.request.Request('http://localhost:3470/api/production/gle_v2_for_eng/edit-batch',data=json.dumps(body).encode(),headers={'Content-Type':'application/json','x-agent-id':'kai-watson-job-253','x-agent-role':'content-fix'})
    try: return json.load(urllib.request.urlopen(req,timeout=180))
    except urllib.error.HTTPError as e: return {'http':e.code,'body':e.read().decode()[:3000]}
if len(sys.argv)>1 and sys.argv[1]=='apply':
    out=[]
    for i in range(0,len(ops),60):
        r=post({'ops':ops[i:i+60],'apply':True}); r.pop('undo',None)
        slim={k:r.get(k) for k in('ok','dryRun','applied','event_id','undo_file','changed','http','body','error')}; slim['range']=[i,min(i+60,len(ops))]
        out.append(slim); print(json.dumps(slim,ensure_ascii=False)[:400])
        if not r.get('applied'): print('STOPPED'); break
    json.dump(out,open(sys.argv[3] if len(sys.argv)>3 else 'apply-result.json','w'),indent=1)
else:
    r=post({'ops':ops}); u=r.pop('undo',None); print(json.dumps(r,ensure_ascii=False)[:1500])
