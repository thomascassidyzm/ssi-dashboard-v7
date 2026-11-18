# python3 legos.py <seeds.json> N...: LEGOs only, with phrase counts
import sys; from lib import *
S=load(sys.argv[1])
for n in map(int,sys.argv[2:]):
    s=S[n]; print(f"=== {n} | {s['known_text']} | {s['target_text']}")
    for l in s['legos']:
        ph=[p for p in l.get('basket_phrases') or [] if p['phrase_role']!='component']
        print(f"  {l['lego_id'][5:]} {'N' if l['is_new'] else '-'}{l['type']} {syl(l['target_text'])}  {l['known_text']} | {l['target_text']}  [{len(ph)}]")
