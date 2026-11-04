#!/usr/bin/env python3
"""adjudicate.py <units.jsonl> <run.jsonl> <out.jsonl> [--model sonnet] [--min 4] [--par N]
Second read of every first-pass DEFECT flag with confidence >= --min, one CLI call per flagged basket (never the SDK).
Resumable: skips baskets already adjudicated with a parsed answer."""
import json, sys, subprocess, os, re, time, concurrent.futures as cf
args=sys.argv[1:]; usrc,rsrc,out=args[:3]
model=args[args.index('--model')+1] if '--model' in args else 'sonnet'
mn=int(args[args.index('--min')+1]) if '--min' in args else 4
par=int(args[args.index('--par')+1]) if '--par' in args else 3
H=os.path.dirname(os.path.abspath(__file__))
PROMPT=open(os.path.join(H,'adjudicate-prompt.txt')).read()
units={}
for l in open(usrc):
    u=json.loads(l); units[u['basket']]=u
runs={}
for l in open(rsrc):
    r=json.loads(l)
    if r.get('verdicts') is not None: runs[r['basket']]=r
done=set()
if os.path.exists(out):
    for l in open(out):
        r=json.loads(l)
        if r.get('answers') is not None: done.add(r['basket'])
todo=[]
for b,r in runs.items():
    fl=[v for v in r['verdicts'] if isinstance(v,dict) and v.get('verdict')=='DEFECT' and (v.get('confidence') or 0)>=mn]
    if fl and b not in done and b in units: todo.append((units[b],fl))
def render(u,fl):
    byid={p['id']:p for p in u['phrases']}
    L=[f"COURSE: {u['course']}", f"SEED {u['seed']}: {u['seed_pair']['known']} | {u['seed_pair']['target']}",
       f"THIS LEGO {u['basket']}: {u['lego_pair']['known']} | {u['lego_pair']['target']}", "",
       f"TAUGHT PAIRS (known | target), {len(u['taught_filtered'])} shown (pairs sharing words with this basket; 'c' = component gloss):"]
    L+=[f"{x['id']}: {x['known']} | {x['target']}" for x in u['taught_filtered']]
    L+=["","FLAGGED PHRASES:"]
    for v in fl:
        p=byid.get(v['id'],{})
        L.append(f"{v['id']} [{p.get('role')}]: {p.get('known')} | {p.get('target')}\n   first reader: side={v.get('side')} chunk={v.get('chunk')} why={v.get('why')}")
    return PROMPT+"\n\n"+"\n".join(L)
def run(item):
    u,fl=item; txt=render(u,fl); t0=time.time()
    env={k:v for k,v in os.environ.items() if k!='CLAUDECODE'}
    env['PATH']=os.path.expanduser('~/.local/bin')+':'+env.get('PATH','')
    ans=None; r=None
    for attempt in range(2):
        try:
            r=subprocess.run(['claude','--print','--model',model,'--output-format','text'],input=txt,capture_output=True,text=True,env=env,timeout=600)
            m=re.search(r'\[.*\]', r.stdout, re.S); ans=json.loads(m.group(0)) if m else None
        except Exception: ans=None
        if ans is not None: break
    byid={p['id']:p for p in u['phrases']}
    return {'basket':u['basket'],'course':u['course'],'seed':u['seed'],'model':model,'secs':round(time.time()-t0,1),
            'lego':u['lego_pair'],'seed_pair':u['seed_pair'],
            'flags':[{**v,'known':byid.get(v['id'],{}).get('known'),'target':byid.get(v['id'],{}).get('target'),'role':byid.get(v['id'],{}).get('role')} for v in fl],
            'answers':ans,'raw':None if ans is not None else ((r.stdout[-600:]+r.stderr[-300:]) if r else 'exception')}
print(f'{len(todo)} flagged baskets to adjudicate with {model}', file=sys.stderr)
with open(out,'a') as f, cf.ThreadPoolExecutor(par) as ex:
    for res in ex.map(run,todo):
        f.write(json.dumps(res,ensure_ascii=False)+'\n'); f.flush()
        a=res['answers'] or []
        print(f"{res['basket']} {res['secs']}s flags={len(res['flags'])} confirmed={sum(1 for x in a if x.get('decision')=='CONFIRM')}", file=sys.stderr)
