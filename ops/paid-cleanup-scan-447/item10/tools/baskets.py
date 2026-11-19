#!/usr/bin/env python3
"""READ-ONLY (cs #714·AI): full phrase rows (incl. target_text_roman) for the LEGOs a plan touches, via Popty's
GET /api/production/<course>/lego/<id>/basket. Writes $CS_SCRATCH/baskets-<course>.json {lego_id: [rows]} for plan.py
(romanisation of changed rows) and lexicon_zho.py. usage: python3 -I baskets.py <course> <dump.json> [--all]"""
# cs #968·AI: live gate. Every urlopen to a Popty port (:347x) is refused (exit 77) unless --live-ok '<why>' is given
# (put it last) AND it is 22:00-07:00 Europe/London. ops/paid_cleanup_livegate.py.
import os as _lg_os, sys as _lg_sys
_lg_d = _lg_os.path.dirname(_lg_os.path.realpath(__file__))
while not _lg_os.path.exists(_lg_os.path.join(_lg_d, 'paid_cleanup_livegate.py')) and _lg_d != '/':
    _lg_d = _lg_os.path.dirname(_lg_d)
_lg_sys.path.insert(0, _lg_d)
import paid_cleanup_livegate as livegate
livegate.install()
import json, os, sys, urllib.request, concurrent.futures as cf
course, dumpf = sys.argv[1], sys.argv[2]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dump = json.load(open(dumpf))
out_f = os.path.join(os.environ['CS_SCRATCH'], f'baskets-{course}.json')
B = json.load(open(out_f)) if os.path.exists(out_f) else {}
if '--all' in sys.argv:
    upto = int(sys.argv[sys.argv.index('--upto') + 1]) if '--upto' in sys.argv else 10 ** 6  # cs #808: lexicon from served seeds only
    seeds = {s['n'] for s in dump['seeds'] if s['n'] <= upto}
else:
    dec = json.load(open(os.path.join(ROOT, 'decisions', f'{course}.json')))
    seeds = {int(d['id'][1:5]) for d in dec['legos']}
ids = [l['id'] for s in dump['seeds'] if s['n'] in seeds for l in s['legos'] if l['id'] not in B]
def get(i):
    u = f'http://localhost:3470/api/production/{course}/lego/{i}/basket'
    for attempt in range(5):  # cs #808: retry under load
        try:
            return i, json.load(urllib.request.urlopen(u, timeout=120)).get('phrases')
        except Exception:
            if attempt == 4:
                raise
            import time as _t
            _t.sleep(10 * (attempt + 1))
with cf.ThreadPoolExecutor(4) as ex:
    for i, ph in ex.map(get, ids):
        B[i] = ph
json.dump(B, open(out_f, 'w'), ensure_ascii=False)
print(course, 'baskets', len(B), 'fetched', len(ids))
