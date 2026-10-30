#!/usr/bin/env python3
"""judge.py <units.jsonl> <model> <out.jsonl> [--ctx full|filtered] [--par N] [--limit N]
Runs the judging prompt over each basket unit through the Claude CLI (claude --print), never the SDK."""
import json, sys, subprocess, os, re, concurrent.futures as cf, time
args=sys.argv[1:]; src,model,out=args[:3]
ctx = args[args.index('--ctx')+1] if '--ctx' in args else 'filtered'
par = int(args[args.index('--par')+1]) if '--par' in args else 3
limit = int(args[args.index('--limit')+1]) if '--limit' in args else None
PROMPT=open(os.path.join(os.path.dirname(__file__),'prompt.txt')).read()
units=[json.loads(l) for l in open(src)]
if limit: units=units[:limit]
done=set()
if os.path.exists(out):
    for l in open(out): done.add(json.loads(l)['basket'])
def render(u):
    t = u['taught_full'] if ctx=='full' else u['taught_filtered']
    lines=[f"COURSE: {u['course']} (known language = the left side, target language = the right side)",
           f"SEED {u['seed']}: {u['seed_pair']['known']} | {u['seed_pair']['target']}",
           f"THIS LEGO {u['basket']}: {u['lego_pair']['known']} | {u['lego_pair']['target']}",
           "", f"TAUGHT PAIRS (known | target), {len(t)} shown:"]
    lines += [f"{x['id']}: {x['known']} | {x['target']}" for x in t]
    lines += ["", "PHRASES TO JUDGE:"]
    lines += [f"{p['id']} [{p['role']}]: {p['known']} | {p['target']}" for p in u['phrases']]
    return PROMPT+"\n\n"+"\n".join(lines)
def run(u):
    txt=render(u); t0=time.time()
    env={k:v for k,v in os.environ.items() if k!='CLAUDECODE'}
    env['PATH']=os.path.expanduser('~/.local/bin')+':'+env.get('PATH','')
    for attempt in range(2):
        r=subprocess.run(['claude','--print','--model',model,'--output-format','text'],input=txt,capture_output=True,text=True,env=env,timeout=600)
        m=re.search(r'\[.*\]', r.stdout, re.S)
        try: verdicts=json.loads(m.group(0)) if m else None
        except Exception: verdicts=None
        if verdicts is not None: break
    return {'basket':u['basket'],'course':u['course'],'seed':u['seed'],'model':model,'ctx':ctx,'secs':round(time.time()-t0,1),
            'prompt_chars':len(txt),'verdicts':verdicts,'raw':None if verdicts is not None else r.stdout[-800:]+r.stderr[-400:]}
todo=[u for u in units if u['basket'] not in done]
print(f'{len(todo)} baskets to judge with {model} ({ctx})', file=sys.stderr)
with open(out,'a') as f, cf.ThreadPoolExecutor(par) as ex:
    for res in ex.map(run,todo):
        f.write(json.dumps(res,ensure_ascii=False)+'\n'); f.flush()
        n=len(res['verdicts'] or []); d=sum(1 for v in (res['verdicts'] or []) if v.get('verdict')=='DEFECT')
        print(f"{res['basket']} {res['secs']}s {res['prompt_chars']}ch verdicts={n} defects={d}", file=sys.stderr)
