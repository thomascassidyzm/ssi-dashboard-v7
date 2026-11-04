#!/usr/bin/env python3
"""adjudicate.py <units.jsonl> <run.jsonl> <out.jsonl> [--model sonnet] [--par N] [--minconf 1]
Second read of every first-pass flag, one call per unit carrying its flags, via claude --print. Resumable."""
import json, sys, subprocess, os, re, concurrent.futures as cf, time
a = sys.argv[1:]; usrc, rsrc, out = a[:3]
model = a[a.index('--model')+1] if '--model' in a else 'sonnet'
par = int(a[a.index('--par')+1]) if '--par' in a else 4
mc = int(a[a.index('--minconf')+1]) if '--minconf' in a else 1
P = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'adjudicate-prompt.txt')).read()
units = {json.loads(l)['key']: json.loads(l) for l in open(usrc)}
def conf(f):
    try: return int(f.get('confidence') or 0)
    except Exception: return 0
jobs = []
for l in open(rsrc):
    r = json.loads(l)
    fl = [f for f in (r['flags'] or []) if isinstance(f, dict) and f.get('id') and conf(f) >= mc]
    if fl: jobs.append((r['key'], fl))
done = set()
if os.path.exists(out):
    for l in open(out):
        r = json.loads(l)
        if r.get('verdicts') is not None: done.add(r['key'])
def items(u):
    m = {}
    if u['kind'] == 'basket':
        for p in u['phrases']: m[p['id']] = (p['known'], p['target'], p['role'])
        m[u['key']] = (u['lego_pair']['known'], u['lego_pair']['target'], 'lego')
    else:
        for s in u['seeds']:
            m[s['id']] = (s['known'], s['target'], 'seed')
            for l in s['legos']: m[l['id']] = (l['known'], l['target'], 'lego')
    return m
def render(key, fl):
    u = units[key]; m = items(u); L = []
    if u['kind'] == 'basket':
        L += [f"SEED {u['seed']}: {u['seed_pair']['known']} | {u['seed_pair']['target']}",
              f"LEGO {u['key']}: {u['lego_pair']['known']} | {u['lego_pair']['target']}", "CONTEXT PAIRS (taught earlier):"]
        L += [f"  {x['id']}: {x['known']} | {x['target']}" for x in u['ctx'][-25:]]
        L += ["OTHER PHRASES IN THIS BASKET:"] + [f"  {p['id']}: {p['known']} | {p['target']}" for p in u['phrases']]
    L += ["", "FLAGS TO JUDGE:"]
    for f in fl:
        k, t, role = m.get(f['id'], ('?', '?', '?'))
        L.append(f"{f['id']} [{role}]: {k} | {t}\n   first pass said: {f.get('type')} — {f.get('problem')} — {f.get('why')}")
    return P + "\n\n" + "\n".join(L)
def run(job):
    key, fl = job; txt = render(key, fl); t0 = time.time(); v = None; r = None
    env = {k: x for k, x in os.environ.items() if k != 'CLAUDECODE'}
    env['PATH'] = os.path.expanduser('~/.local/bin') + ':' + env.get('PATH', '')
    for _ in range(3):
        try: r = subprocess.run(['claude', '--print', '--model', model, '--output-format', 'text'], input=txt, capture_output=True, text=True, env=env, timeout=900)
        except subprocess.TimeoutExpired: continue
        mm = re.search(r'\[.*\]', r.stdout, re.S)
        try: v = json.loads(mm.group(0)) if mm else None
        except Exception: v = None
        if v is not None: break
    return {'key': key, 'flags': fl, 'verdicts': v, 'secs': round(time.time()-t0, 1), 'raw': None if v is not None else (r.stdout[-500:] if r else 'timeout')}
todo = [j for j in jobs if j[0] not in done]
print(f'{len(todo)} units, {sum(len(j[1]) for j in todo)} flags to adjudicate with {model}', file=sys.stderr, flush=True)
with open(out, 'a') as f, cf.ThreadPoolExecutor(par) as ex:
    for res in ex.map(run, todo):
        f.write(json.dumps(res, ensure_ascii=False) + '\n'); f.flush()
        c = sum(1 for x in (res['verdicts'] or []) if x.get('verdict') == 'CONFIRM')
        print(f"{res['key']} {res['secs']}s flags={len(res['flags'])} confirm={c if res['verdicts'] is not None else 'FAIL'}", file=sys.stderr, flush=True)
