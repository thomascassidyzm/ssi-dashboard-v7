# Recomputes word-tile decompositions for every seed (<=300) this job's families touched, through Popty's admin
# route POST /api/admin/recompute-decompositions, signed by the committed tools/agent-admin/call.cjs (Kai's agent door),
# 15 seeds a call. Usage: python3 recompute.py apply   -> recompute-result.json
import json,sys,os,subprocess
CALL=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','tools','agent-admin','call.cjs')
F=json.load(open('families.json')); seeds=sorted({n for v in F.values() for n in v if n<=300})
apply=len(sys.argv)>1 and sys.argv[1]=='apply'; out=[]
for i in range(0,len(seeds),15):
    body={'courseCode':'gle_v2_for_eng','seeds':seeds[i:i+15],'apply':apply}
    tmp=os.path.join(os.environ.get('CS_SCRATCH','.'),'recompute-reply.json')
    with open(tmp,'w') as fh: p=subprocess.run(['node',CALL,'--key','kai','--agent','kai-watson-job-253','POST','/api/admin/recompute-decompositions',json.dumps(body)],stdout=fh,stderr=subprocess.PIPE,text=True,timeout=300)
    t=open(tmp).read()
    try: r=json.JSONDecoder(strict=False).raw_decode(t[t.index('{'):])[0]
    except Exception: r={'http':p.returncode or -1,'error':(t[:300]+p.stderr[:300])}
    slim={'seeds':seeds[i:i+15],'ok':r.get('ok'),'applied':r.get('applied'),'event_id':r.get('event_id'),'undo_file':r.get('undo_file'),'summary':r.get('summary'),'error':r.get('error')}
    out.append(slim); print(slim['seeds'][0],'-',slim['seeds'][-1],slim['ok'],slim['applied'],slim['event_id'],json.dumps(slim['summary'])[:160],(slim['error'] or '')[:200])
    if not slim['ok']: break
json.dump(out,open('recompute-result.json' if apply else 'recompute-dry.json','w'),indent=1)
print(len(seeds),'seeds')
