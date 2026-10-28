import json,urllib.request,os,collections
S=os.environ.get('CS_SCRATCH') or os.path.dirname(os.path.abspath(__file__))
deck=json.load(open(S+'/deck.json'))['items']
cache={};out=[]
def call(t):
    r=urllib.request.Request('http://localhost:3470/api/audio/render',json.dumps({"courseCode":"ita_for_eng","role":"target1","text":t,"purpose":"job168 list rebuild dry run","dryRun":True}).encode(),{'Content-Type':'application/json','x-agent-id':'kai-job168-dryrun'})
    try: return json.load(urllib.request.urlopen(r))
    except urllib.error.HTTPError as e: return json.load(e)
import concurrent.futures as cf
texts=sorted({i['cy'] for i in deck})
with cf.ThreadPoolExecutor(4) as ex:
    for t,r in zip(texts,ex.map(call,texts)): cache[t]=r
for it in deck:
    t=it['cy']
    if t not in cache: cache[t]=call(t)
    r=cache[t]
    st='have' if r.get('source')=='library' else 'render' if r.get('source')=='would-render' else 'refused:'+str(r.get('code'))
    out.append({**{k:it.get(k) for k in('id','kind','cy','en','audio')},'status':st,'chars':r.get('wouldSpendChars',0)})
json.dump(out,open(S+'/dry.json','w'),ensure_ascii=False)
c=collections.Counter((o['status'],o['kind'],bool(o['audio'])) for o in out)
for k,v in sorted(c.items()):print(k,v)
print(collections.Counter(o['status'] for o in out), sum(o['chars'] for o in out if o['status']=='render'))
