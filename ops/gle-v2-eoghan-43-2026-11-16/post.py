# Posts one batch to Popty's course-edit door. Usage: python3 post.py <batch> dry|apply  -> <batch>-<mode>.json
# A dry run is a rolled-back transaction; "apply" commits ONE undoable event (the undo is kept in the answer file).
import json,sys,urllib.request,time
b,mode=sys.argv[1],sys.argv[2]
body=json.load(open(f'batch-{b}.ops.json')); req={'ops':body['ops']}
if mode=='apply': req['apply']=True
r=urllib.request.Request('http://localhost:3470/api/production/gle_v2_for_eng/edit-batch',data=json.dumps(req).encode(),
    headers={'Content-Type':'application/json','x-agent-id':'worker-gle-v2-eoghan-43','x-agent-role':'content-apply'})
t=time.time()
try: res=json.load(urllib.request.urlopen(r,timeout=1200))
except urllib.error.HTTPError as e: res={'http':e.code,'body':e.read().decode()[:4000]}
res['_seconds']=round(time.time()-t,1); res['_seeds']=body['seeds']; res['_ops']=len(body['ops'])
json.dump(res,open(f'{b}-{mode}.json','w'),ensure_ascii=False,indent=0)
print(b,mode,'ok' if res.get('ok') else 'REFUSED',{k:res.get(k) for k in ('applied','event_id','undo_file','error','code','index','http','_seconds')},(res.get('body') or '')[:800])
