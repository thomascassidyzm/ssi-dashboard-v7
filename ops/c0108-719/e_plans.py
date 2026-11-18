#!/usr/bin/env python3
"""cs #758·AI: draft a.plan.py for the E courses (target verb already means expect): English side only.
didn't/did not hope -> expect; weren't hoping -> expecting; 'hoping to' LEGO -> 'expecting to'; wake (no 'up') -> wake up.
Writes <course>/a.plan.py and prints every change for review. Run per course list."""
import json, re, sys
R = [(re.compile(r"\b(didn't|did not|didn’t)\s+hope\b", re.I), r"\1 expect"),
     (re.compile(r"\b(weren't|were not|was not|wasn't)\s+hoping\b", re.I), r"\1 expecting"),
     (re.compile(r"\bwake\b(?!\s+up)", re.I), lambda m: m.group(0) + " up")]
def fix(t):
    if not t: return t
    for a, b in R: t = a.sub(b, t)
    return t
for c in sys.argv[1:]:
    d = json.load(open(f"{c}/live/108.json")); eng = c.startswith("eng_for_"); k = "target_text" if eng else "known_text"
    sp = d["seed_pair"]; plan = {}; sk = "target" if eng else "known"
    ns = fix(sp[sk])
    if ns != sp[sk]: plan["SEED"] = (None, ns) if eng else (ns, None)
    for lid, L in d["legos"].items():
        l = L["lego"]; n = fix(l[k])
        comps = l.get("components") or []
        ck = "target" if eng else "known"; nc = [{**x, ck: fix(x[ck])} for x in comps]
        if n != l[k] or nc != comps:
            v = {"lego": (None, n) if eng else (n, None)}
            if nc != comps: v["components"] = nc
            plan[lid] = v
        for p in L["phrases"]:
            n = fix(p[k])
            if n != p[k]: plan[p["id"].split(":")[1]] = (None, n) if eng else (n, None)
    with open(f"{c}/a.plan.py", "w") as f:
        f.write(f"# {c} C0108 hope->expect (cs #758·AI): ENGLISH SIDE ONLY - the target verb already means expect (see ../categories.json). Drafted by e_plans.py, reviewed by hand.\n")
        f.write(f"C = {c!r}\nPLAN = {{\n" + "".join(f" {r!r}: {v!r},\n" for r, v in plan.items()) + "}\n")
    print(f"== {c}: {len(plan)} rows")
    rows = {p["id"].split(":")[1]: p for L in d["legos"].values() for p in L["phrases"]}
    for r, v in plan.items():
        old = sp[sk] if r == "SEED" else (d["legos"][r]["lego"][k] if r in d["legos"] else rows[r][k])
        print(f"  {r}: {old!r} -> {(v['lego'] if isinstance(v, dict) else v)[1 if eng else 0]!r}")
