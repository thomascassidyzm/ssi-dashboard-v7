# cs #410·AI: recomputes word tiles for every seed (<=300) batch-1 + move-166 touched, through Popty's admin route
# POST /api/admin/recompute-decompositions (signed by the committed tools/agent-admin/call.cjs), 15 seeds a call.
# Usage: python3 recompute.py dry|apply -> recompute-<mode>.json   (same shape as #253·AI's recompute.py)
import json,sys,os,subprocess
CALL=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','tools','agent-admin','call.cjs')
seeds=set()
for b in ['batch-1','move-166']:
    for o in json.load(open(f'{b}.ops.json'))['ops']:
        n=o.get('seed_number') or (o.get('row') or {}).get('seed_number')
        if not n: k=(o.get('phrase_id') or o.get('lego_id') or '').split(':')[-1]; n=int(k[1:5]) if k.startswith('S') else None
        if n and n<=300: seeds.add(n)
seeds=sorted(seeds); apply=sys.argv[1]=='apply'; out=[]
for i in range(0,len(seeds),15):
    body={'courseCode':'gle_v2_for_eng','seeds':seeds[i:i+15],'apply':apply}
    tmp=os.path.join(os.environ.get('CS_SCRATCH','.'),'recompute-reply.json')
    with open(tmp,'w') as fh: p=subprocess.run(['node',CALL,'--key','kai','--agent','kai-watson-job-410','POST','/api/admin/recompute-decompositions',json.dumps(body)],stdout=fh,stderr=subprocess.PIPE,text=True,timeout=300)
    t=open(tmp).read()
    try: r=json.JSONDecoder(strict=False).raw_decode(t[t.index('{'):])[0]
    except Exception: r={'error':(t[:300]+p.stderr[:300])}
    slim={'seeds':seeds[i:i+15],'ok':r.get('ok'),'applied':r.get('applied'),'event_id':r.get('event_id'),'summary':r.get('summary'),'error':r.get('error')}
    out.append(slim); print(slim['seeds'][0],'-',slim['seeds'][-1],slim['ok'],slim['applied'],slim['event_id'],json.dumps(slim['summary'])[:200],(slim['error'] or '')[:200])
    if not slim['ok']: break
json.dump(out,open(f'recompute-{sys.argv[1]}.json','w'),indent=1); print(len(seeds),'seeds')
