"""west shard (cs #770): writes explicit ops/c0108-719/<course>/a.plan.py files from the compact specs in west/specs.py.
The emitted plan files are plain literals (reviewable); this generator only saves typing and applies two mechanical rules
to every seed-108 row of a course: English "wake"/"waking" without "up" -> "wake up"/"waking up" (#701 fold-in, English side only),
and the spec's literal hope->expect substitutions (negative-hope frames only; natural positive "hoped to" rows keep their verb)."""
import json, re, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from specs import SPECS
WAKE = re.compile(r"\b(wake|waking|Waking|Wake)\b(?! up)")
def sub(s, subs):
    for a, b in subs: s = s.replace(a, b)
    return s
def gen(c, sp):
    d = json.load(open(f"{ROOT}/{c}/live/108.json")); eng_known = c.endswith("_for_eng")
    ks, ts = list(sp.get("ksubs", [])), list(sp.get("tsubs", []))
    def new(k, t):
        if eng_known: nk = WAKE.sub(r"\1 up", sub(k, ks)); nt = sub(t, ts)
        else: nk = sub(k, ks); nt = WAKE.sub(r"\1 up", sub(t, ts))
        return nk, nt
    over = sp.get("over", {}); skip = set(sp.get("skip", [])); out = []
    out.append(f' "SEED": {sp["seed"]!r},')
    for lid, L in d["legos"].items():
        l = L["lego"]
        if lid in over: out.append(f' "{lid}": {over[lid]!r},')
        elif lid not in skip:
            nk, nt = new(l["known_text"], l["target_text"])
            if (nk, nt) != (l["known_text"], l["target_text"]):
                out.append(f' "{lid}": {{"lego": {(nk if nk != l["known_text"] else None, nt if nt != l["target_text"] else None)!r}}},')
        for p in sorted(L["phrases"], key=lambda p: (p["phrase_role"] != "component", p["position"])):
            rid = p["id"].split(":")[1]
            if rid in skip: continue
            if rid in over: out.append(f' "{rid}": {over[rid]!r},'); continue
            nk, nt = new(p["known_text"], p["target_text"])
            if (nk, nt) != (p["known_text"], p["target_text"]):
                out.append(f' "{rid}": {(nk if nk != p["known_text"] else None, nt if nt != p["target_text"] else None)!r},')
    unknown = [k for k in over if k not in d["legos"] and not any(p["id"].endswith(":" + k) for L in d["legos"].values() for p in L["phrases"])]
    assert not unknown, (c, unknown)
    hdr = "\n".join("# " + x for x in sp["note"].strip().split("\n"))
    open(f"{ROOT}/{c}/a.plan.py", "w").write(f'{hdr}\nC = "{c}"\nPLAN = {{\n' + "\n".join(out) + "\n}\n")
    # leftover check: any seed-108 English still saying hope after the plan
    return len(out)
if __name__ == "__main__":
    for c in sys.argv[1:] or SPECS: print(c, gen(c, SPECS[c]))
