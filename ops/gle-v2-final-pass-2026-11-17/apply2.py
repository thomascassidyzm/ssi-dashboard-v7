# cs #410·AI — APPLIES one ops file through Popty's edit-batch as ONE undoable event, on Kai's yes of 17 Nov 12:19Z.
# Usage: python3 apply2.py batch-1.ops.json  -> apply-<name>.json (the full answer, incl. per-op before/after = the undo)
import json,sys,urllib.request,time
f=sys.argv[1]; body=json.load(open(f)); req={'ops':body['ops'],'apply':True}
r=urllib.request.Request('http://localhost:3470/api/production/gle_v2_for_eng/edit-batch',data=json.dumps(req).encode(),
    headers={'Content-Type':'application/json','x-agent-id':'worker-gle-v2-final-pass-410','x-agent-role':'content-apply'})
t=time.time()
try: res=json.load(urllib.request.urlopen(r,timeout=1500))
except urllib.error.HTTPError as e: res={'http':e.code,'body':e.read().decode()[:6000]}
res['_seconds']=round(time.time()-t,1); res['_ops']=len(body['ops'])
out='apply-'+f.replace('.ops.json','.json'); json.dump(res,open(out,'w'),ensure_ascii=False,indent=0)
print(f,'APPLIED' if res.get('applied') else 'REFUSED',{k:res.get(k) for k in ('applied','event_id','undo_file','error','code','index','http','_seconds','_ops')},(res.get('body') or '')[:1500])
