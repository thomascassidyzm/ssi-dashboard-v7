"""run-batch.py <course> <batch#> dry|apply  -> posts batch to Popty edit-batch (timeout 300s); saves result + undo."""
import json,sys,urllib.request
course,i,mode=sys.argv[1],int(sys.argv[2]),sys.argv[3]
b=json.load(open(f'{course}.ops.json'))['batches'][i]
body={'ops':b['ops']}
if mode=='apply': body['apply']=True
rq=urllib.request.Request(f'http://localhost:3470/api/production/{course}/edit-batch',data=json.dumps(body).encode(),headers={'Content-Type':'application/json','x-agent-id':'aran-watson-928'})
try: r=json.load(urllib.request.urlopen(rq,timeout=300))
except urllib.error.HTTPError as e: r={'http_error':e.code,'body':e.read().decode()[:3000]}
json.dump(r,open(f'{course}.b{i}.{mode}.json','w'),ensure_ascii=False)
if mode=='apply' and r.get('undo'): json.dump(r['undo'],open(f'{course}.b{i}.undo.json','w'),ensure_ascii=False)
print(course,i,mode,{k:(v if not isinstance(v,(list,dict)) else '...') for k,v in r.items()}, 'changed',sum(1 for x in r.get('results',[]) if x.get('changed')), 'of',len(r.get('results',[])))
