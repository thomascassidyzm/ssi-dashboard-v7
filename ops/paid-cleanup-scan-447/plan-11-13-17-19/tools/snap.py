"""Shared read-only helpers over the QA-copy snapshots ($CS_SCRATCH/snap/<course>.json, made by
tools/paid-cleanup-717/snapshot.cjs) and the live per-seed cache (data/live). No network, no database."""
import json, os, functools
HERE = os.path.dirname(os.path.abspath(__file__))
SNAP = os.path.join(os.environ.get('CS_SCRATCH', '/tmp'), 'snap')

@functools.lru_cache(None)
def snap(course):
    return json.load(open(os.path.join(SNAP, f'{course}.json')))

@functools.lru_cache(None)
def legos(course):
    return snap(course)['legos']

def seed(course, n):
    return next((s for s in snap(course)['seeds'] if s['seed_number'] == n), None)

def seed_legos(course, n):
    return [l for l in legos(course) if l['seed_number'] == n]

def find(course, known=None, target=None, sub=False):
    out = []
    for l in legos(course):
        k, t = (l['known_text'] or ''), (l['target_text'] or '')
        okk = known is None or (known.lower() in k.lower() if sub else k.lower().strip(' ?.!') == known.lower().strip(' ?.!'))
        okt = target is None or (target.lower() in t.lower() if sub else t.lower().strip(' ?.!。？') == target.lower().strip(' ?.!。？'))
        if okk and okt:
            out.append(l)
    return out

def phrases(course, lego_id):
    # snapshot phrase rows carry seed_number + lego_index (their lego_id column is not the S0001L02 label)
    n, i = int(lego_id[1:5]), int(lego_id[6:8])
    return [p for p in snap(course)['phrases'] if p['seed_number'] == n and p['lego_index'] == i]

def live(course):
    f = os.path.join(HERE, '..', 'data', 'live', f'{course}.json')
    return json.load(open(f)) if os.path.exists(f) else {}

def fmt(l):
    return f"{l['lego_id']} {'NEW' if l['is_new'] else 'old'} {l['type']} | {l['known_text']} | {l['target_text']}"
