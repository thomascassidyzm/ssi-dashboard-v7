# python3 grep.py <seeds.json> <irish regex> [english regex]: every seed, LEGO and phrase in the course matching
import sys,re; from lib import *
S=load(sys.argv[1]); rx=re.compile(sys.argv[2],re.I); ex=re.compile(sys.argv[3],re.I) if len(sys.argv)>3 else None
ok=lambda k,t: rx.search(t or '') and (not ex or ex.search(k or ''))
for n,s in sorted(S.items()):
    if ok(s['known_text'],s['target_text']): print(f"SEED {n} | {s['known_text']} | {s['target_text']}")
    for l in s['legos']:
        if ok(l['known_text'],l['target_text']): print(f"LEGO {l['lego_id']} {'N' if l['is_new'] else '-'} | {l['known_text']} | {l['target_text']}")
        for p in l.get('basket_phrases') or []:
            if p['phrase_role']!='component' and ok(p['known_text'],p['target_text']): print(f"  PH {p['id'].split(':')[1]} | {p['known_text']} | {p['target_text']}")
