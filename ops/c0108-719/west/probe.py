"""west: which target strings does the validator count as vocab violations in a given LEGO? Simulated only (validator override), no writes.
usage: probe.py <course> <legoId> <opsfile> 'target 1' 'target 2' ...  -> for each candidate, the LEGO's vocab-violation issue when ONE row carries it."""
import json, sys, os, copy
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools")); import popty
c, lid, f = sys.argv[1:4]
base = popty.apply_ops(c, json.load(open(f))["ops"])[108]
def issues(d): return [i for i in popty.validate_one(c, 108, popty.override_for(d)) if i.startswith(f"L{int(lid[-2:])}:")]
print("as planned:", issues(base))
for cand in sys.argv[4:]:
    d = copy.deepcopy(base); L = d["legos"][lid]; safe = L["lego"]["target_text"]
    rows = [p for p in L["phrases"] if p["phrase_role"] != "component"]
    for p in rows: p["target_text"] = safe
    rows[-1]["target_text"] = cand
    print(repr(cand), "->", [i for i in issues(d) if "vocab" in i])
