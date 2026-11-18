"""cs #701·AI seed 108, OPTION 1 (Kai 18 Nov): "wake" -> "wake up" in the course's seed, LEGO, component and practice rows,
nothing else changed; "hope" kept. The canonical seed C0108 is NOT touched (that question is with Aran via Kai).
English is the target in eng_for_*, the known (prompt) in ara_for_eng. Writes <course>/s108.ops.json from the live read."""
import json, re, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools")); import popty
W = re.compile(r"\b([Ww]ake)\b(?! up)")
fix = lambda t: W.sub(lambda m: m.group(1) + " up", t) if t else t
for c, side in [("eng_for_jpn", "target_text"), ("eng_for_kor", "target_text"), ("eng_for_zho", "target_text"), ("eng_for_ara", "target_text"), ("ara_for_eng", "known_text")]:
    d = popty.load(c, 108); ops = []
    sp = d["seed_pair"]; key = "target" if side == "target_text" else "known"
    if fix(sp[key]) != sp[key]:
        ops.append({"op": "seed.update", "seed_number": 108, "set": {side: fix(sp[key])}, "expect": {side: sp[key]}})
    for lid, L in d["legos"].items():
        l = L["lego"]; st = {}
        if fix(l[side]) != l[side]: st[side] = fix(l[side])
        ck = "target" if side == "target_text" else "known"
        comps = l.get("components") or []
        nc = [{**x, ck: fix(x[ck])} for x in comps]
        if nc != comps: st["components"] = nc
        if st: ops.append({"op": "lego.update", "lego_id": lid, "set": st, "expect": {side: l[side]}})
        for p in L["phrases"]:
            if fix(p[side]) != p[side]:
                ops.append({"op": "phrase.update", "phrase_id": p["id"], "set": {side: fix(p[side])}, "expect": {side: p[side]}})
    os.makedirs(f"{popty.ROOT}/{c}", exist_ok=True)
    json.dump({"ops": ops}, open(f"{popty.ROOT}/{c}/s108.ops.json", "w"), ensure_ascii=False, indent=1)
    print(c, len(ops), "ops")
