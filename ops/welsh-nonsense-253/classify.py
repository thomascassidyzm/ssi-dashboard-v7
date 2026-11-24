#!/usr/bin/env python3
"""classify.py (cs #253·AL) — senseless practice-row classifier for Welsh courses.

Reads course dumps made by ops/paid-cleanup-scan-447/copy-read.cjs (dump) — NEVER the database.
Unique (known, target) practice pairs across all dumps are classified ONCE by `claude --print`
(Popty rule: no Anthropic SDK; CLAUDECODE unset), batches grouped by seed, <=10 calls in parallel.

  classify.py units  <dumpdir> <units.json>                 unique pairs + every (course,row) they occur in
  classify.py run    <units.json> <outdir> [--model haiku] [--batch 50] [--par 10] [--only ids.txt]
       writes <outdir>/batch-NNNN.jsonl (resumable: done batches are skipped) and <outdir>/verdicts.jsonl
"""
import json, os, sys, glob, subprocess, concurrent.futures as cf, re, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
PROMPT = open(os.path.join(HERE, 'prompt.md')).read()
CLAUDE = os.path.expanduser('~/.local/bin/claude')
PRACTICE = ('build', 'use')

def units(dumpdir, out):
    U = {}
    for f in sorted(glob.glob(os.path.join(dumpdir, '*.json'))):
        d = json.load(open(f)); course = d['course']
        for s in d['seeds']:
            for l in s.get('legos', []):
                for p in l.get('phrases', []):
                    if p['type'] not in PRACTICE: continue
                    k = (p['known'], p['target'])
                    uid = hashlib.sha1(('\x1f'.join(k)).encode()).hexdigest()[:12]
                    u = U.get(uid)
                    if not u:
                        u = U[uid] = {'uid': uid, 'known': k[0], 'target': k[1], 'role': p['type'],
                                      'seed': s['n'], 'seed_known': s['known'], 'seed_target': s['target'],
                                      'lego_id': l['id'], 'lego_known': l['known'], 'lego_target': l['target'],
                                      'course': course, 'rows': []}
                    u['rows'].append({'course': course, 'id': p['id'], 'seed': s['n'], 'lego': l['id'], 'role': p['type']})
    L = sorted(U.values(), key=lambda u: (u['course'], u['seed'], u['lego_id']))
    json.dump(L, open(out, 'w'), ensure_ascii=False)
    print(len(L), 'unique practice pairs')

def render(batch):
    out, cur = [], None
    for u in batch:
        key = (u['course'], u['seed'])
        if key != cur:
            cur = key
            out.append(f"\n## SEED {u['seed']}: \"{u['seed_known']}\" = \"{u['seed_target']}\"")
        out.append(f"- id={u['uid']} | LEGO \"{u['lego_known']}\"=\"{u['lego_target']}\" | {u['role']} | KNOWN: {u['known']} | WELSH: {u['target']}")
    return PROMPT + '\n\n# ROWS\n' + '\n'.join(out) + '\n'

def call(prompt, model):
    # Credentials the way the surface hands them to workers (same pattern as zenjin walk-qa/judge.mjs cliEnv):
    # the job's own account dir + its .cs-oauth-token, through the child's ENV only (never argv).
    env = dict(os.environ)
    for k in ('CLAUDECODE', 'CLAUDE_CODE_CHILD_SESSION', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_CODE_MESSAGING_SOCKET',
              'CLAUDE_CODE_MESSAGING_TOKEN', 'CLAUDE_CODE_ENTRYPOINT'): env.pop(k, None)
    if not env.get('CLAUDE_CODE_OAUTH_TOKEN') and env.get('CLAUDE_CONFIG_DIR'):
        try: env['CLAUDE_CODE_OAUTH_TOKEN'] = open(os.path.join(env['CLAUDE_CONFIG_DIR'], '.cs-oauth-token')).read().strip()
        except OSError: pass
    r = subprocess.run([CLAUDE, '--print', '--model', model], input=prompt, capture_output=True, text=True, env=env, timeout=600)
    if r.returncode != 0: raise RuntimeError(r.stderr[-500:] or r.stdout[-500:])
    return r.stdout

def parse(text, ids):
    res = []
    for line in text.splitlines():
        line = line.strip()
        m = re.search(r'\{.*\}', line)
        if not m: continue
        try: o = json.loads(m.group(0))
        except Exception: continue
        if o.get('id') in ids and o.get('v') in ('CLEAR_NONSENSE', 'BORDERLINE'): res.append(o)
    ok = bool(res) or 'NONE' in text
    return res, ok

def run(units_file, outdir, model='haiku', bs=50, par=10, only=None):
    L = json.load(open(units_file))
    if only: keep = set(open(only).read().split()); L = [u for u in L if u['uid'] in keep]
    os.makedirs(outdir, exist_ok=True)
    batches, cur = [], []
    for u in L:
        if len(cur) >= bs and (u['course'], u['seed']) != (cur[-1]['course'], cur[-1]['seed']) or len(cur) >= bs * 1.6:
            batches.append(cur); cur = []
        cur.append(u)
    if cur: batches.append(cur)
    print(len(L), 'units', len(batches), 'batches', 'model', model, flush=True)
    def work(i):
        fn = os.path.join(outdir, f'batch-{i:04d}.jsonl')
        if os.path.exists(fn): return i, 'skip'
        b = batches[i]; ids = {u['uid'] for u in b}
        for attempt in range(3):
            try:
                txt = call(render(b), model)
                res, ok = parse(txt, ids)
                if ok:
                    with open(fn + '.tmp', 'w') as f:
                        f.write(json.dumps({'_batch': i, 'uids': sorted(ids)}) + '\n')
                        for o in res: f.write(json.dumps(o, ensure_ascii=False) + '\n')
                    os.rename(fn + '.tmp', fn); return i, len(res)
            except Exception as e:
                err = str(e)
        print('FAIL', i, err[:200] if 'err' in dir() else '', flush=True)
        return i, 'FAIL'
    done = 0
    with cf.ThreadPoolExecutor(par) as ex:
        for i, r in ex.map(work, range(len(batches))):
            done += 1
            if done % 20 == 0 or r == 'FAIL': print(done, '/', len(batches), 'batch', i, r, flush=True)
    by = {u['uid']: u for u in L}; n = 0
    with open(os.path.join(outdir, 'verdicts.jsonl'), 'w') as f:
        for fn in sorted(glob.glob(os.path.join(outdir, 'batch-*.jsonl'))):
            for line in open(fn):
                o = json.loads(line)
                if '_batch' in o or o['id'] not in by: continue
                f.write(json.dumps({**o, 'unit': by[o['id']]}, ensure_ascii=False) + '\n'); n += 1
    print('verdicts', n, 'missing batches', len(batches) - len(glob.glob(os.path.join(outdir, 'batch-*.jsonl'))))

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == 'units': units(a[1], a[2])
    elif a[0] == 'run':
        kw = {}; rest = a[3:]
        for j in range(0, len(rest), 2):
            k = rest[j].lstrip('-'); kw[{'batch': 'bs'}.get(k, k)] = rest[j + 1] if k in ('model', 'only') else int(rest[j + 1])
        run(a[1], a[2], **kw)
