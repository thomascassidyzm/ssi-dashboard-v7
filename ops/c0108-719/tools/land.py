"""cs #701·AI: per course — re-read live, rebuild ops (expect = live before-state), validate (count-aware, simulated),
and APPLY only if no seed regresses. Prints the event id; the undo file is copied next to the plan."""
import sys, os, json, subprocess, glob, shutil
sys.path.insert(0, os.path.dirname(__file__)); import popty
for c in sys.argv[1:]:
    plan = f"{popty.ROOT}/{c}/a.plan.py"
    seeds = [108]  # this job touches seed 108 only
    popty.fetch(c, seeds)
    subprocess.run([sys.executable, f"{popty.ROOT}/tools/mkops.py", plan], check=True)
    ops = f"{popty.ROOT}/{c}/a.ops.json"
    popty.validate(c, ops)
    v = json.load(open(ops.replace(".ops.json", ".validate.json")))
    bad = {s: popty.regressions(x["before"], x["after"]) for s, x in v.items()}
    bad = {s: r for s, r in bad.items() if r}
    if bad: print(c, "NOT APPLIED — validator regressions:", bad, flush=True); continue
    try: popty.batch(c, ops, True)
    except Exception as e: print(c, "apply call error (check live + undo dir):", e, flush=True)
    und = sorted(glob.glob(os.path.expanduser(f"~/ssi-evidence/ssi-dashboard-v7/ops/course-edit-undo/{c}/*.json")), key=os.path.getmtime)
    for f in reversed(und):
        d = json.load(open(f))
        if d.get("actor") == popty.AGENT:
            shutil.copy(f, f"{popty.ROOT}/{c}/a.undo.json"); print(c, "EVENT", d["event_id"], len(d.get("undo_ops") or []), "undo ops", flush=True); break
