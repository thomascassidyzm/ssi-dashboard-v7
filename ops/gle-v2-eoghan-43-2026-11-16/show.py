# python3 show.py <seeds.json> N [N...]: a seed with its LEGOs and every phrase under them
import sys; from lib import *
S=load(sys.argv[1])
for n in map(int,sys.argv[2:]):
    s=S[n]; print(f"\n=== {n} | {s['known_text']} | {s['target_text']}")
    for l in s['legos']:
        print(f"  {l['lego_id']} {'NEW' if l['is_new'] else 'old'} {l['type']} {syl(l['target_text'])}syl  {l['known_text']} | {l['target_text']}  comps={[(c.get('known'),c.get('target')) for c in l.get('components') or []]}")
        for p in l.get('basket_phrases') or []:
            if p['phrase_role']!='component': print(f"      {p['id'].split(':')[1]} {p['known_text']} | {p['target_text']}")
