"""run-calls.py <course> dry|apply [only_batch]: posts each call in <course>.calls.json to its course's edit-batch (timeout 300s), clips before rows.
Stops at the first failure. Saves results and undo bodies as <course>.c<N>.<mode>.json / .undo.json."""
import json,sys,urllib.request
course,mode=sys.argv[1],sys.argv[2]
only=int(sys.argv[3]) if len(sys.argv)>3 else None
calls=json.load(open(f'{course}.calls.json'))
for n,c in enumerate(calls):
    if only is not None and c['batch']!=only: continue
    body={'ops':c['ops']}
    if mode=='apply': body['apply']=True
    rq=urllib.request.Request(f"http://localhost:3470/api/production/{c['course']}/edit-batch",data=json.dumps(body).encode(),headers={'Content-Type':'application/json','x-agent-id':'aran-watson-928'})
    try: r=json.load(urllib.request.urlopen(rq,timeout=300))
    except urllib.error.HTTPError as e: r={'http_error':e.code,'body':e.read().decode()[:1500]}
    json.dump(r,open(f'{course}.c{n}.{mode}.json','w'),ensure_ascii=False)
    if mode=='apply' and r.get('undo'): json.dump({'course':c['course'],'undo':r['undo']},open(f'{course}.c{n}.undo.json','w'),ensure_ascii=False)
    ch=sum(1 for x in r.get('results',[]) if x.get('changed'))
    print(course,n,c['kind'],c['course'],'ops',len(c['ops']),'ok' if r.get('ok') else 'FAIL '+str(r)[:300],'changed',ch)
    if not r.get('ok'): sys.exit(1)
