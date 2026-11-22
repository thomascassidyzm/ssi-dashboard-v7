"""After mkops: copy the SEED tuple's 3rd element (romanisation of the new seed target) onto the seed.update op.
mkops.py reads only (known, target) for SEED, and edit-batch refuses a seed target change that leaves the old roman (ROMAN_STALE).
Usage: python3 -I ops/c0108-719/asia/seedroman.py ops/c0108-719/<course>/a.plan.py"""
import json, sys, importlib.util
spec = importlib.util.spec_from_file_location("plan", sys.argv[1]); plan = importlib.util.module_from_spec(spec); spec.loader.exec_module(plan)
v = plan.PLAN.get("SEED")
if v and len(v) > 2:
    f = sys.argv[1].replace(".plan.py", ".ops.json"); d = json.load(open(f))
    for op in d["ops"]:
        if op["op"] == "seed.update" and "target_text" in op["set"]: op["set"]["target_text_roman"] = v[2]
    json.dump(d, open(f, "w"), ensure_ascii=False, indent=1); print("seed roman set ->", f)
