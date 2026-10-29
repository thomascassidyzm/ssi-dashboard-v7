import json,os,sys,urllib.request
S=os.environ.get('CS_SCRATCH') or os.path.dirname(os.path.abspath(__file__))
d=json.load(open(S+'/dry.json')); r=[o for o in d if o['status']=='render' or o['status'].startswith('refused')]
done=json.load(open(S+'/rendered.json')) if os.path.exists(S+'/rendered.json') else {}
sel=sys.argv[1]
if sel=='sample':
    pick=[]
    for k,n in (('O',4),('P',2),('S',2),('L',2)):
        pick+= [o for o in r if o['kind']==k and o['id'] not in done and (k!='O' or not o['audio'])][:n]
else: pick=[o for o in r if o['id'] not in done]
for o in pick:
    req=urllib.request.Request('http://localhost:3470/api/audio/render',json.dumps({"courseCode":"ita_for_eng","role":"target1","text":o['cy'],"purpose":"job168 Kai-approved 28 Oct: Build deck item with no cast clip","legoId":None} | {}).encode(),{'Content-Type':'application/json','x-agent-id':'kai-job168'})
    try: res=json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e: res=json.load(e)
    done[o['id']]={**o,'res':res}
    json.dump(done,open(S+'/rendered.json','w'),ensure_ascii=False)
    print(o['id'],o['cy'],res.get('source'),res.get('charsSpent'),res.get('code'),flush=True)
