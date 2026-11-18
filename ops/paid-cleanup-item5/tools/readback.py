"""cs #727·AI: read back an applied a.ops.json against live (Popty GET routes only). For each op: update -> every set field
equals live; delete -> row gone; lego.update -> LEGO text live. usage: readback.py <course>...  (re-fetches touched seeds)"""
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__)); import popty
for c in sys.argv[1:]:
    ops = json.load(open(f"{popty.ROOT}/{c}/a.ops.json"))["ops"]
    seeds = sorted({int((o.get("phrase_id") or o.get("lego_id") or "x:S0000").split(":")[-1][1:5]) for o in ops})
    popty.fetch(c, seeds); rows = {}; legos = {}
    for s in seeds:
        for lid, L in popty.load(c, s)["legos"].items():
            legos[lid] = L["lego"]
            for p in L["phrases"]: rows[p["id"]] = p
    ok = bad = 0
    for o in ops:
        if o["op"] == "phrase.delete": good = o["phrase_id"] not in rows
        elif o["op"] == "phrase.update":
            r = rows.get(o["phrase_id"]); good = bool(r) and all(r.get(k) == v for k, v in o["set"].items() if k != "target_text_roman")
        elif o["op"] == "lego.update":
            l = legos.get(o["lego_id"]); good = bool(l) and all(l.get(k) == v for k, v in o["set"].items() if k in ("known_text", "target_text"))
        else: good = True
        ok += good; bad += not good
        if not good: print("  MISMATCH", json.dumps(o, ensure_ascii=False)[:200])
    print(f"READBACK {c}: {ok}/{len(ops)} live", flush=True)
