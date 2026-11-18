# Kai 20:52Z: APPLY NOTHING. Undoes batches A-E (events 399cead4 bb8739b0 638e44f9 b92e4690 0953535d) in ONE
# undoable event: E's undo first, A's last (each event's undo_ops are already in reverse order). Every update/delete
# carries expect {target_text, known_text} = the state our own batches left, so a row anyone else has edited since
# aborts the whole request (DRIFT) instead of being overwritten. Usage: python3 undo.py dry|apply -> undo-<mode>.json
import json,sys,urllib.request,time
final={}  # ('seed',n) | ('lego',uuid) | ('phrase',id) -> after row (None = deleted)
for b in 'ABCDE':
    for r in json.load(open(f'{b}-apply.json'))['results']:
        row=r.get('after'); t=r['op'].split('.')[0]; src=row or r.get('before') or {}
        k=('seed',src.get('seed_number')) if t=='seed' else (t,src.get('id'))
        final[k]=row
ops=[]; missing=0
for b in 'EDCBA':
    for o in json.load(open(f'{b}-apply.json'))['undo_ops']:
        o=dict(o); t,act=o['op'].split('.')
        if act in('update','delete'):
            k=('seed',o['seed_number']) if t=='seed' else ('phrase',o.get('phrase_id')) if t=='phrase' else ('lego',o.get('id'))
            row=final.get(k)
            if row: o['expect']={c:row[c] for c in('target_text','known_text') if c in row}
            else: missing+=1
        ops.append(o)
req={'ops':ops}
if sys.argv[1]=='apply': req['apply']=True
r=urllib.request.Request('http://localhost:3470/api/production/gle_v2_for_eng/edit-batch',data=json.dumps(req).encode(),
    headers={'Content-Type':'application/json','x-agent-id':'worker-gle-v2-eoghan-43','x-agent-role':'content-apply'})
t=time.time()
try: res=json.load(urllib.request.urlopen(r,timeout=1200))
except urllib.error.HTTPError as e: res={'http':e.code,'body':e.read().decode()[:4000]}
res['_seconds']=round(time.time()-t,1); res['_ops']=len(ops); res['_no_expect']=missing
json.dump(res,open(f'undo-{sys.argv[1]}.json','w'),ensure_ascii=False,indent=0)
print(sys.argv[1],'ok' if res.get('ok') else 'REFUSED',len(ops),'ops',missing,'without expect',{k:res.get(k) for k in('applied','event_id','error','code','index','http','_seconds')},(res.get('body') or '')[:800])
