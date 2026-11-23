"""List LEGOs (and components) taught before or at seed N: python3 taught.py <course> <N> [grep]"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__)); from common import *
c, n = sys.argv[1], int(sys.argv[2]); g = sys.argv[3] if len(sys.argv) > 3 else None
d = dump(c)
for s in d['seeds']:
    if s['n'] > n: break
    for l in s['legos']:
        line = f"{l['id']} {'N' if l['is_new'] else '-'} {l['known']} | {l['target']}"
        cs = [f"{p['known']}|{p['target']}" for p in l['phrases'] if p['type'] == 'component']
        if cs: line += '   [' + '; '.join(cs) + ']'
        if not g or re.search(g, line): print(line)
