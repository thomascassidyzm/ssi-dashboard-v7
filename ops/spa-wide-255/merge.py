#!/usr/bin/env python3
"""merge.py <W> — final first-pass flags against the POST snapshot units (W/post/units.jsonl):
unchanged units take full/sonnet + full40/haiku results, changed units take post/sonnet + post/haiku.
Flags on the same item id are merged (both readings kept). Writes W/post/merged.jsonl in judge.py's shape."""
import json, sys, os
W = sys.argv[1]
def runs(fn):
    m = {}
    if os.path.exists(fn):
        for l in open(fn):
            r = json.loads(l)
            if r['flags'] is not None: m[r['key']] = r['flags']
    return m
units = [json.loads(l) for l in open(f'{W}/post/units.jsonl')]
changed = {json.loads(l)['key'] for l in open(f'{W}/post/changed.jsonl')}
fs, fh, ps, ph = (runs(f'{W}/{x}') for x in ('full/sonnet.jsonl', 'full40/haiku.jsonl', 'post/sonnet.jsonl', 'post/haiku.jsonl'))
missing = []; out = []
for u in units:
    k = u['key']; S, H = (ps, ph) if k in changed else (fs, fh)
    if k not in S: missing.append(k)
    by = {}
    for src, fl in (('sonnet', S.get(k) or []), ('haiku', H.get(k) or [])):
        for f in fl:
            if not isinstance(f, dict) or not f.get('id'): continue
            g = by.setdefault(f['id'], {'id': f['id'], 'type': f.get('type'), 'problem': '', 'why': '', 'sources': [], 'confidence': 0})
            g['sources'].append(src)
            g['problem'] += (' / ' if g['problem'] else '') + f"[{src}] {f.get('problem')}"
            g['why'] += (' / ' if g['why'] else '') + f"[{src}] {f.get('type')}: {f.get('why')}"
            try: g['confidence'] = max(g['confidence'], int(f.get('confidence') or 0))
            except Exception: pass
    out.append({'key': k, 'kind': u['kind'], 'seed': u['seed'], 'flags': list(by.values())})
with open(f'{W}/post/merged.jsonl', 'w') as f:
    for r in out: f.write(json.dumps(r, ensure_ascii=False) + '\n')
print('units', len(out), 'flagged items', sum(len(r['flags']) for r in out), 'units missing a sonnet read', len(missing), missing[:10])
