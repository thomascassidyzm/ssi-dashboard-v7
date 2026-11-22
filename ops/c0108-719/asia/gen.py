"""Generate ops/c0108-719/<course>/a.plan.py from the live rows + a per-course spec (asia shard, cs #772)."""
import json, re, sys, os, pprint
ROOT = sys.argv[1]
NEW_EN = "We didn't expect to wake up in the middle of the night."
def wakefix(s):
    return re.sub(r"\b([Ww])ake\b(?!\s+(?:\w+\s+)?up\b)", r"\1ake up", s)
def hopefix(s):
    for a, b in [("hopes", "expects"), ("hoped", "expected"), ("hope", "expect"), ("Hope", "Expect")]:
        s = re.sub(r"\b%s\b" % a, b, s)
    return s
def en_seed(live):
    s = NEW_EN
    if live[0].islower(): s = s[0].lower() + s[1:]
    if not live.rstrip().endswith("."): s = s.rstrip(".")
    return s
def build(c, spec):
    d = json.load(open(f"{ROOT}/{c}/live/108.json")); sp = d["seed_pair"]
    eng_known = c.endswith("_for_eng"); E = "known" if eng_known else "target"; N = "target" if eng_known else "known"
    nsub = spec.get("nsub", [])           # native-side replacements (applied to rows listed in nrows, or all if nrows is None)
    hope_legos = spec.get("hope", [])     # LEGO ids whose rows get hope->expect on the English side ('*' = all)
    keep = set(spec.get("keep", []))      # row ids left wholly untouched
    ov = spec.get("rows", {})             # explicit overrides {rid: (known, target[, roman])}
    def N_(s):
        for a, b in nsub: s = s.replace(a, b)
        return s
    def E_(s, lid):
        if "*" in hope_legos or lid in hope_legos: s = hopefix(s)
        return wakefix(s)
    plan = {}
    newN = spec.get("seed_native", N_(sp[N])); newE = en_seed(sp[E])
    plan["SEED"] = (newE, newN) if eng_known else (newN, newE)
    if spec.get("seed_roman"): plan["SEED"] += (spec["seed_roman"],)   # mkops ignores a 3rd SEED element; asia/seedroman.py adds it to the seed op
    for lid, L in d["legos"].items():
        l = L["lego"]
        if lid in spec.get("legos", {}): plan[lid] = spec["legos"][lid]
        else:
            ne, nn = E_(l[E + "_text"], lid), N_(l[N + "_text"])
            comps = l.get("components")
            if ne != l[E + "_text"] or nn != l[N + "_text"]:
                v = {"lego": (ne, nn) if eng_known else (nn, ne)}
                if comps:
                    v["components"] = [dict(cm, **{E: E_(cm[E], lid), N: N_(cm[N])}) for cm in comps]
                plan[lid] = v
        for p in sorted(L["phrases"], key=lambda p: p["id"]):
            rid = p["id"].split(":")[1]
            if rid in keep: continue
            if rid in ov: plan[rid] = ov[rid]; continue
            ne, nn = E_(p[E + "_text"], lid), N_(p[N + "_text"])
            if ne != p[E + "_text"] or nn != p[N + "_text"]:
                if p.get("target_text_roman") and eng_known and nn != p["target_text"]:
                    raise SystemExit(f"{c} {rid}: target changes and row has roman -> needs explicit override")
                plan[rid] = (ne, nn) if eng_known else (nn, ne)
    for rid in ov:
        if rid not in plan: raise SystemExit(f"{c}: override {rid} not live")
    out = f"{ROOT}/{c}/a.plan.py"
    with open(out, "w") as f:
        f.write(f'"""C0108 hope -> expect, {c} (cs #772 asia shard for parent #758). PLAN ONLY: nothing applied.\n{spec["doc"].strip()}\nTuples are (known, target[, roman]); None = keep live."""\n')
        f.write(f"C = {c!r}\nPLAN = {{\n")
        for k, v in plan.items(): f.write(f" {k!r}: {v!r},\n")
        f.write("}\n")
    # review print
    print(f"=== {c}  SEED {sp['known']} | {sp['target']}\n      -> {plan['SEED']}")
    rows = {}
    for lid, L in d["legos"].items():
        rows[lid] = (L["lego"]["known_text"], L["lego"]["target_text"])
        for p in L["phrases"]: rows[p["id"].split(":")[1]] = (p["known_text"], p["target_text"])
    for k, v in plan.items():
        if k == "SEED": continue
        print(f"  {k}: {rows[k][0]} | {rows[k][1]}\n      -> {v}")
if __name__ == "__main__":
    import importlib.util
    spec = importlib.util.spec_from_file_location("specs", sys.argv[2]); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    for c in sys.argv[3:]: build(c, m.SPECS[c])
