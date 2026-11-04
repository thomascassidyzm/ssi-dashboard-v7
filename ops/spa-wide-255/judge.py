#!/usr/bin/env python3
"""judge.py <units.jsonl> <model> <out.jsonl> [--par N] [--limit N]
Runs prompt.txt over each unit through the Claude CLI (claude --print), never the SDK. Resumable."""
import json, sys, subprocess, os, re, concurrent.futures as cf, time
a = sys.argv[1:]; src, model, out = a[:3]
par = int(a[a.index('--par')+1]) if '--par' in a else 4
limit = int(a[a.index('--limit')+1]) if '--limit' in a else None
PROMPT = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'prompt.txt')).read()
units = [json.loads(l) for l in open(src)][:limit]
done = set()
if os.path.exists(out):
    for l in open(out):
        r = json.loads(l)
        if r.get('flags') is not None: done.add(r['key'])
def render(u):
    if u['kind'] == 'seedset':
        L = ["COURSE: Spanish for English speakers (left = English, right = Spanish)", "", "SEEDS TO JUDGE (each seed, then its LEGOS TO JUDGE):"]
        for s in u['seeds']:
            L.append(f"{s['id']}: {s['known']} | {s['target']}")
            for l in s['legos']:
                L.append(f"  {l['id']}: {l['known']} | {l['target']}")
                if l.get('intro'): L.append(f"  {l['id']}-INTRO (English narration that introduces this LEGO; judge only its English): {l['intro']}")
        L += ["", "There are no PHRASES TO JUDGE in this unit; judge the seeds and LEGOs above."]
        return PROMPT + "\n\n" + "\n".join(L)
    L = ["COURSE: Spanish for English speakers (left = English, right = Spanish)",
         f"SEED {u['seed']}: {u['seed_pair']['known']} | {u['seed_pair']['target']}",
         f"THIS LEGO {u['key']}: {u['lego_pair']['known']} | {u['lego_pair']['target']}",
         "", f"EARLIER TAUGHT PAIRS (context only, do not judge), {len(u['ctx'])} shown:"]
    L += [f"{x['id']}: {x['known']} | {x['target']}" for x in u['ctx']]
    L += ["", "PHRASES TO JUDGE:"] + [f"{p['id']} [{p['role']}]: {p['known']} | {p['target']}" for p in u['phrases']]
    return PROMPT + "\n\n" + "\n".join(L)
def run(u):
    txt = render(u); t0 = time.time(); flags = None; r = None
    env = {k: v for k, v in os.environ.items() if k != 'CLAUDECODE'}
    env['PATH'] = os.path.expanduser('~/.local/bin') + ':' + env.get('PATH', '')
    for _ in range(3):
        try:
            r = subprocess.run(['claude', '--print', '--model', model, '--output-format', 'text'], input=txt,
                               capture_output=True, text=True, env=env, timeout=600)
        except subprocess.TimeoutExpired:
            continue
        m = re.search(r'\[.*\]', r.stdout, re.S)
        try: flags = json.loads(m.group(0)) if m else ([] if r.stdout.strip() == '[]' else None)
        except Exception: flags = None
        if flags is not None: break
    return {'key': u['key'], 'kind': u['kind'], 'seed': u['seed'], 'model': model, 'secs': round(time.time()-t0, 1),
            'flags': flags, 'raw': None if flags is not None else ((r.stdout[-600:] + r.stderr[-300:]) if r else 'timeout')}
todo = [u for u in units if u['key'] not in done]
print(f'{len(todo)} units to judge with {model}', file=sys.stderr, flush=True)
with open(out, 'a') as f, cf.ThreadPoolExecutor(par) as ex:
    for res in ex.map(run, todo):
        f.write(json.dumps(res, ensure_ascii=False) + '\n'); f.flush()
        print(f"{res['key']} {res['secs']}s flags={len(res['flags']) if res['flags'] is not None else 'FAIL'}", file=sys.stderr, flush=True)
