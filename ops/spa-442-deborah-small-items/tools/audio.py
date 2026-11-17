import json,sys,urllib.request
dec=json.load(open(sys.argv[1])); dry=sys.argv[2]=='dry'; out=[]
asks={}
for e in dec['edits']:
    if e['known_changed']: asks.setdefault(('known',e['new_known']),[]).append(e['id'])
    if e['target_changed']:
        for r in ('target1','target2'): asks.setdefault((r,e['new_target']),[]).append(e['id'])
for (role,text),ids in asks.items():
    body={"courseCode":"spa_for_eng","role":role,"text":text,"purpose":"cs #442 spa_for_eng Deborah small-items pass (Kai Y 17 Nov)","dryRun":dry}
    req=urllib.request.Request("http://localhost:3470/api/audio/render",data=json.dumps(body).encode(),headers={'Content-Type':'application/json','x-agent-id':'cs-442-spa-small-items'})
    try:
        r=urllib.request.urlopen(req,timeout=180); st=r.status; res=json.load(r)
    except urllib.error.HTTPError as h:
        st=h.code; res=json.loads(h.read() or b'{}')
    out.append({"role":role,"text":text,"rows":ids,("dry" if dry else "real"):{"status":st,**{k:res.get(k) for k in ('ok','source','audioId','charsSpent','wouldSpendChars','code','error','message') if k in res}}})
    print(st,role,res.get('source'),res.get('wouldSpendChars',res.get('charsSpent')),res.get('code'),text[:50],flush=True)
json.dump(out,open(sys.argv[3],'w'),ensure_ascii=False,indent=1)
