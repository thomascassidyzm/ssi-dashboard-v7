"""west: print the validator's full per-seed failure record for a course's a.ops.json (after-state), to see WHICH phrases violate."""
import json, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools")); import popty
c = sys.argv[1]; f = sys.argv[2] if len(sys.argv) > 2 else f"{popty.ROOT}/{c}/a.ops.json"
sim = popty.apply_ops(c, json.load(open(f))["ops"])
for s, d in sim.items():
    st, r = popty.call("POST", f"{popty.CB}/api/v2/validate/{c}", {"fromSeed": s, "override": popty.override_for(d)})
    for fl in r.get("failures") or []:
        if fl["seed"] == s: print(json.dumps(fl, ensure_ascii=False, indent=1)[:6000])
    print({k: v for k, v in r.items() if k != "failures"})
