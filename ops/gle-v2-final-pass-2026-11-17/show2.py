import sys; sys.path.insert(0,'../gle-v2-eoghan-43-2026-11-16')
from lib import *
S=load('live.json')
for a in sys.argv[1:]:
    n=int(a.split(':')[0]); only=a.split(':')[1].split(',') if ':' in a else None
    s=S[n]; print(f"=== {n} | {s['known_text']} | {s['target_text']}")
    for l in s['legos']:
        if only and l['lego_id'][5:] not in only: continue
        print(f" {l['lego_id'][5:]} {'N' if l['is_new'] else '-'}{l['type']} {syl(l['target_text'])} {l['known_text']} | {l['target_text']}")
        for p in l.get('basket_phrases') or []:
            if p['phrase_role']!='component': print(f"    {p['id'].split(':')[1][5:]} {p['known_text']} | {p['target_text']}")
