# Posts one family's batch to Popty's course-edit door (edit-batch). Usage: python3 post.py <family> dry|apply
# A dry run is a rolled-back transaction; "apply" commits ONE undoable event. Results saved as <family>-<mode>.json.
import json,sys,urllib.request,time
f,mode=sys.argv[1],sys.argv[2]
body=json.load(open(f'fam-{f}.ops.json'))
req={'ops':body['ops']}
if mode=='apply': req['apply']=True
def post(b):
    r=urllib.request.Request('http://localhost:3470/api/production/gle_v2_for_eng/edit-batch',data=json.dumps(b).encode(),
        headers={'Content-Type':'application/json','x-agent-id':'cs-253-gle-v2-apply','x-agent-role':'content-apply'})
    try: return json.load(urllib.request.urlopen(r,timeout=1200))
    except urllib.error.HTTPError as e: return {'http':e.code,'body':e.read().decode()[:4000]}
t=time.time(); r=post(req); r['_seconds']=round(time.time()-t,1); r['_family']=f; r['_seeds']=body['seeds']; r['_ops']=len(body['ops'])
out=f'{f}-{mode}.json'
if mode=='dry': r.pop('undo_ops',None)
json.dump(r,open(out,'w'),ensure_ascii=False,indent=0)
print(f, mode, 'ok' if r.get('ok') else 'REFUSED', {k:r.get(k) for k in ('applied','event_id','undo_file','error','code','index','http','_seconds')}, (r.get('body') or '')[:500])
