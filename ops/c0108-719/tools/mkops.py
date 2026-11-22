"""Turn a plan file (python dict) into edit-batch ops with before-state expects, from the fetched live rows.
plan module defines C (course) and PLAN = {row_id: (known, target) | 'DELETE' | {'lego': (known, target), 'components': [...]}}
known None = keep live known. Rows not found live are reported and skipped (re-judge)."""
import json, sys, os, importlib.util
sys.path.insert(0, os.path.dirname(__file__)); import popty
spec = importlib.util.spec_from_file_location("plan", sys.argv[1]); plan = importlib.util.module_from_spec(spec); spec.loader.exec_module(plan)
C = plan.C; ops = []; missing = []; rows = {}
for s in sorted({int(k[1:5]) if not k.startswith("SEED") else int(k[4:] or 108) for k in plan.PLAN}):
    d = popty.load(C, s)
    for lid, L in d["legos"].items():
        rows[lid] = ("lego", L["lego"])
        for p in L["phrases"]: rows[p["id"].split(":")[1]] = ("phrase", p)
for rid, v in plan.PLAN.items():
    if rid.startswith("SEED"):  # "SEED" or "SEED0108": (known|None, target|None) on the seed pair
        s = int(rid[4:] or 108); sp = popty.load(C, s)["seed_pair"]; st = {}; ex = {}
        if v[0] is not None and v[0] != sp["known"]: st["known_text"] = v[0]; ex["known_text"] = sp["known"]
        if v[1] is not None and v[1] != sp["target"]: st["target_text"] = v[1]; ex["target_text"] = sp["target"]
        if len(v) > 2 and "target_text" in st: st["target_text_roman"] = v[2]  # cs #771: seed rows carrying a romanisation refuse a target change without it (ROMAN_STALE)
        if st: ops.append({"op": "seed.update", "seed_number": s, "set": st, "expect": ex})
        continue
    if rid not in rows: missing.append(rid); continue
    kind, r = rows[rid]
    if kind == "phrase":
        if v == "DELETE": ops.append({"op": "phrase.delete", "phrase_id": r["id"], "expect": {"target_text": r["target_text"]}}); continue
        k, t = v[0], v[1]; st = {}
        if t is not None and t != r["target_text"]: st["target_text"] = t
        if len(v) > 2: st["target_text_roman"] = v[2]
        if k is not None and k != r["known_text"]: st["known_text"] = k
        if st: ops.append({"op": "phrase.update", "phrase_id": r["id"], "set": st, "expect": {"known_text": r["known_text"], "target_text": r["target_text"]}})
    else:
        st = {}
        k, t = v["lego"]
        if t is not None and t != r["target_text"]: st["target_text"] = t
        if k is not None and k != r["known_text"]: st["known_text"] = k
        if "roman" in v: st["target_text_roman"] = v["roman"]  # cs #771: optional LEGO romanisation
        if "type" in v: st["type"] = v["type"]  # cs #771: optional A<->M change with a re-cut
        if "components" in v:
            if v["components"] is None: st["type"] = "A"; st["components"] = None
            else: st["components"] = v["components"]
        if st: ops.append({"op": "lego.update", "lego_id": rid, "set": st, "expect": {"known_text": r["known_text"], "target_text": r["target_text"]}})
for ins in getattr(plan, "INSERT", []):
    ops.append({"op": "phrase.insert", "row": ins})
out = os.path.join(os.path.dirname(sys.argv[1]), os.path.basename(sys.argv[1]).replace(".plan.py", ".ops.json"))
json.dump({"ops": ops}, open(out, "w"), ensure_ascii=False, indent=1)
print(len(ops), "ops ->", out, "| missing live:", missing)
