"""Print a fetched seed (popty.py baskets output) compactly: seed pair, LEGOs, every phrase with role
and audio presence. usage: show.py <dir> S0055 [S0056 ...] [--grep word]"""
import json, sys

args = sys.argv[2:]
grep = None
if "--grep" in args:
    i = args.index("--grep"); grep = args[i + 1].lower(); args = args[:i] + args[i + 2:]
for s in args:
    d = json.load(open(f"{sys.argv[1]}/{s}.json"))
    sp = d["seed"].get("seed_pair") or {}
    print(f"=== {s} SEED: {sp.get('known')} | {sp.get('target')}")
    for lid, b in (d["seed"].get("baskets") or {}).items():
        print(f"  {lid} LEGO [{b.get('type')} new={b.get('is_new')}] {b['lego']['known']} | {b['lego']['target']}")
        for p in d["legos"].get(lid, {}).get("phrases", []):
            line = f"{p['known_text']} | {p['target_text']}"
            if grep and grep not in line.lower():
                continue
            a = "".join("k" if p["known_audio_id"] else "-") + ("1" if p["target1_audio_id"] else "-") + ("2" if p["target2_audio_id"] else "-")
            print(f"    {p['id'].split(':')[1]} {p['phrase_role'][:5]} {p['status'][:4]} {a} {line}")
