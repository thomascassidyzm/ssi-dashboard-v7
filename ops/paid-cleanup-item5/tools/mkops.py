"""Turn a plan file (python dict) into edit-batch ops with before-state expects, from the fetched live rows.
plan module defines C (course) and PLAN = {row_id: (known, target) | 'DELETE' | {'lego': (known, target), 'components': [...]}}
known None = keep live known. Rows not found live are reported and skipped (re-judge)."""
import json, sys, os, importlib.util
sys.path.insert(0, os.path.dirname(__file__)); import popty
spec = importlib.util.spec_from_file_location("plan", sys.argv[1]); plan = importlib.util.module_from_spec(spec); spec.loader.exec_module(plan)
C = plan.C; ops = []; missing = []; rows = {}
for s in sorted({int(k[1:5]) for k in plan.PLAN}):
    d = popty.load(C, s)
    for lid, L in d["legos"].items():
        rows[lid] = ("lego", L["lego"])
        for p in L["phrases"]: rows[p["id"].split(":")[1]] = ("phrase", p)
for rid, v in plan.PLAN.items():
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
        if "components" in v:
            if v["components"] is None: st["type"] = "A"; st["components"] = None
            else: st["components"] = v["components"]
        if st: ops.append({"op": "lego.update", "lego_id": rid, "set": st, "expect": {"known_text": r["known_text"], "target_text": r["target_text"]}})
for ins in getattr(plan, "INSERT", []):
    ops.append({"op": "phrase.insert", "row": ins})
out = os.path.join(os.path.dirname(sys.argv[1]), os.path.basename(sys.argv[1]).replace(".plan.py", ".ops.json"))
json.dump({"ops": ops}, open(out, "w"), ensure_ascii=False, indent=1)
print(len(ops), "ops ->", out, "| missing live:", missing)
