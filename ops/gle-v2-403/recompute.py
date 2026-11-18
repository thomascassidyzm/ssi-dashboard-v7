# Recomputes word-tile decompositions for every seed this job touched (Popty POST /api/admin/recompute-decompositions, signed through tools/agent-admin/call.cjs), 15 seeds a call.
# Usage: python3 recompute.py [apply]
import json,sys,os,subprocess
CALL=os.environ.get('AGENT_ADMIN_CALL') or os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','tools','agent-admin','call.cjs')
seeds=set()
for f in (sys.argv[2:] or ['decisions-small.json','decisions-q11.json','decisions-q14.json']):
    d=json.load(open(f))
    seeds|={int(k[1:5]) for k in d['phrases']}|{int(k[1:5]) for k in d['legos']}|{r['seed_number'] for r in d['phrase_inserts']}|{r['seed_number'] for r in d['lego_inserts']}|{int(n) for n in d['seeds'] if int(n)<=300}
seeds=sorted(seeds); out=[]
for i in range(0,len(seeds),15):
    body={'courseCode':'gle_v2_for_eng','seeds':seeds[i:i+15],'apply':len(sys.argv)>1 and sys.argv[1]=='apply'}   # usage: recompute.py [apply|dry] [decisions files...]
    # the admin door: Popty's committed signer, Kai-only key (tools/agent-admin/call.cjs --key kai --agent kai-<id>); no key ever reaches this script
    tmp=os.path.join(os.environ.get('CS_SCRATCH','.'),'recompute-reply.json')   # reply goes to a file: a large reply through a pipe is cut short when node exits
    with open(tmp,'w') as fh: p=subprocess.run(['node',CALL,'--key','kai','--agent','kai-watson-job-403','POST','/api/admin/recompute-decompositions',json.dumps(body)],stdout=fh,stderr=subprocess.PIPE,text=True,timeout=240)
    out_txt=open(tmp).read()
    try: r=json.JSONDecoder(strict=False).raw_decode(out_txt[out_txt.index('{'):])[0]
    except Exception: r={'http':p.returncode or -1,'error':(out_txt[:300]+p.stderr[:300])}
    if r.get('error') and not r.get('ok'): r.setdefault('http',r.get('status') or 400)
    slim={'seeds':seeds[i:i+15],'ok':r.get('ok'),'applied':r.get('applied'),'event_id':r.get('event_id'),'undo_file':r.get('undo_file'),'summary':r.get('summary'),'http':r.get('http'),'error':r.get('error')}
    out.append(slim); print(slim["seeds"][0],"-",slim["seeds"][-1],"ok",slim["ok"],"applied",slim["applied"],slim["summary"],slim["http"],(slim["error"] or "")[:160])
    if slim['http']: break
if len(sys.argv)>1 and sys.argv[1]=='apply': json.dump(out,open('recompute-result-k.json' if len(sys.argv)>2 else 'recompute-result.json','w'),indent=1)
print(len(seeds),'seeds')
