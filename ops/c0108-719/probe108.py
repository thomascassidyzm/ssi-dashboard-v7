#!/usr/bin/env python3
"""cs #758·AI (resuming #719·AI) READ-ONLY: GET /api/production/<c>/seed/108/baskets for each course in a list,
sequential, one request at a time. Writes {course: seed_pair|error} so we can see which courses carry C0108 at seed 108.
Usage: python3 -I probe108.py <courses.txt> <out.json>"""
import json, sys, time, urllib.request
out = {}
for c in open(sys.argv[1]).read().split():
    try:
        d = json.load(urllib.request.urlopen(f"http://localhost:3470/api/production/{c}/seed/108/baskets", timeout=60))
        out[c] = {"seed_pair": d.get("seed_pair"), "legos": {k: {"known": v["lego"].get("known_text"), "target": v["lego"].get("target_text"), "is_new": v.get("is_new"), "n": len(v.get("practice_phrases") or [])} for k, v in (d.get("baskets") or {}).items()}}
    except Exception as e:
        out[c] = {"error": str(e)}
    print(c, out[c].get("seed_pair") or out[c].get("error"), flush=True); time.sleep(0.4)
json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
