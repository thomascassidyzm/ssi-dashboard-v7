# find.py live.json <fragment> [...]: which live sentences hold each fragment (fadas folded) — for checking 'it comes back at N'.
import json,sys,os
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','gle-v2-eoghan-sheet-2026-11-17'))
from helpers import nrm,fada
live=json.load(open(sys.argv[1]))['seeds']; f=lambda s:fada(nrm(s))
for q in sys.argv[2:]:
    hit=[s['seed_number'] for s in live if f(q) in f(s['target_text'])]
    en=[s['seed_number'] for s in live if f(q) in f(s['known_text'])]
    print(f"‘{q}’ ga {len(hit)}: {hit[:40]}"+(f" | en {len(en)}: {en[:25]}" if en else ''))
