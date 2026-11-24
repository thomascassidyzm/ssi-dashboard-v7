#!/usr/bin/env python3
"""cs #271·AL — read back: every applied slot now carries its new clip id in a fresh script-view dump; count silent slots
before/after by role. Usage: python3 -I readback.py <pre dump> <post dump> <results/apply.jsonl> <out.json>"""
import json, sys
pre, post, app, out = sys.argv[1:5]
def load(f):
    d = json.load(open(f)); rows = {}
    for s in d['seeds']:
        for l in s['legos']:
            for p in l['phrases']: rows[p['id']] = p
    return rows
def silent(rows): return {k: sum(1 for p in rows.values() if not p[c]) for k, c in (('known', 'ka'), ('target1', 't1'), ('target2', 't2'))}
A, B = load(pre), load(post)
recs = [json.loads(l) for l in open(app) if l.strip()]
chk = []
for r in recs:
    pid = r['key'].split('|')[0]; p = B.get(pid) or {}
    live = p.get('t1' if r['role'] == 'target1' else 't2')
    chk.append({'row': r['row'], 'role': r['role'], 'want': r['render'].get('audioId'), 'live': live, 'ok': live == r['render'].get('audioId')})
res = {'silent_before': silent(A), 'silent_after': silent(B), 'linked_ok': sum(c['ok'] for c in chk), 'of': len(chk), 'mismatch': [c for c in chk if not c['ok']]}
json.dump(res, open(out, 'w'), indent=1); print(json.dumps(res))
