"""cs #374·AI: turn the re-checked C0108 plans into ONE ssi-changeset/1 file per course for the governed night applier
(tools/changeset/apply-changeset.cjs). Files only; the one database read is copy-read.cjs validate, which refuses any
URL that is not the local nightly copy.

Per course:
  1. ops = a.ops.json + b.ops.json (b = the add-on expect LEGO: it goes WITH a, in the same changeset, or the course
     is not built), re-cut by recut-374.json (rows that moved since 18 Nov), minus ops whose row is gone or already
     holds the target;
  2. every set is diffed against the COPY row and every expect is the COPY's text (so the door's before-state check
     is a live re-check of what the copy saw);
  3. the change is overlaid on the copy and run through the course-builder validator (copy-read.cjs validate, same
     checks as /v2/validate) before and after: any NEW issue on any seed from 108 on stops the course (nothing written);
  4. order: lego.insert, phrase.insert, lego.update, phrase.update, phrase.delete, seed.update LAST (a resumed night
     never meets a half-changed seed under ops still to send);
  5. guards (<id>.guards.json) give tools/precheck.cjs the copy's seed + LEGO text (and the text this file sets) for
     Kai's 19 Nov live pre-check right before the applier.
  python3 build_cs.py <snapDir> <course> [...]   -> <course>/changesets/c0108-374.{changeset.jsonl,guards.json,summary.json}
NEVER rebuild a file that has a ledger (<file>.applied.jsonl): the applier records ops by line index.
"""
import copy, json, os, subprocess, sys, re
sys.path.insert(0, os.path.dirname(__file__)); import popty
ROOT = popty.ROOT
REPO = os.path.dirname(os.path.dirname(ROOT))
SNAP = sys.argv[1]
RECUT = json.load(open(os.path.join(ROOT, "recut-374.json")))
NAME = "c0108-374"
ORDER = ["lego.insert", "phrase.insert", "lego.update", "phrase.update", "phrase.delete", "seed.update"]
TXT = ("known_text", "target_text", "target_text_roman", "components", "type")


def lid_of(pid): return pid.split(":")[1][:8]


_SNAPS = {}
def copy_state(course, sn=108):
    if course not in _SNAPS: _SNAPS[course] = json.load(open(os.path.join(SNAP, f"{course}.json")))
    d = _SNAPS[course]
    seed = next(s for s in d["seeds"] if s["seed_number"] == sn)
    legos = {}
    for l in d["legos"]:
        if l["seed_number"] != sn: continue
        lid = l["lego_id"] or f"S{sn:04d}L{l['lego_index']:02d}"
        legos[lid] = {"lego": {k: l.get(k) for k in ("lego_index", "type", "known_text", "target_text", "components")} | {"lego_id": lid},
                      "is_new": l.get("is_new"), "phrases": []}
    for p in d["phrases"]:
        if p["seed_number"] == sn:
            legos.setdefault(lid_of(p["id"]), {"lego": None, "is_new": None, "phrases": []})["phrases"].append(dict(p))
    return d, seed, legos


def simulate(seed, legos, ops):
    s = {"seed": seed["seed_number"], "seed_pair": {"known": seed["known_text"], "target": seed["target_text"]}, "legos": copy.deepcopy(legos)}
    for o in ops:
        k = o["op"]
        if k == "lego.insert":
            r = o["row"]; lid = f"S0108L{r['lego_index']:02d}"
            s["legos"][lid] = {"lego": {"lego_index": r["lego_index"], "type": r["type"], "known_text": r["known_text"], "target_text": r["target_text"],
                                        "components": r.get("components"), "lego_id": lid}, "is_new": r.get("is_new", True), "phrases": []}
        elif k == "phrase.insert": s["legos"][f"S0108L{o['row']['lego_index']:02d}"]["phrases"].append(dict(o["row"]))
        elif k == "lego.update": s["legos"][o["lego_id"]]["lego"].update({x: v for x, v in o["set"].items() if x in TXT})
        elif k in ("phrase.update", "phrase.delete"):
            L = s["legos"][lid_of(o["phrase_id"])]
            for p in list(L["phrases"]):
                if p["id"] == o["phrase_id"]:
                    if k == "phrase.delete": L["phrases"].remove(p)
                    else: p.update(o["set"])
        elif k == "seed.update": s["seed_override"] = dict(o["set"])
    return s


def seed_of(o):
    if o["op"] == "seed.update": return int(o["seed_number"])
    if "row" in o: return int(o["row"]["seed_number"])
    return int((o.get("lego_id") or o["phrase_id"].split(":")[1])[1:5])


def lid_for(o):
    if o["op"] in ("lego.insert", "phrase.insert"): return f"S{int(o['row']['seed_number']):04d}L{int(o['row']['lego_index']):02d}"
    if o["op"] == "seed.update": return None
    return o.get("lego_id") or lid_of(o["phrase_id"])


def validate(course, odir, pairs):
    """pairs: [(before_override, after_override)] -> [(before failures {seed: issues}, after failures)] on the copy."""
    req = os.path.join(odir, f".{NAME}.validate-req.json"); vout = os.path.join(odir, f".{NAME}.validate-out.json")
    json.dump([{"fromSeed": 108, "override": o} for p in pairs for o in p], open(req, "w"), ensure_ascii=False)
    subprocess.run(["node", os.path.join(REPO, "ops/paid-cleanup-scan-447/copy-read.cjs"), "validate", course, req, vout], check=True, capture_output=True)
    ans = json.load(open(vout)); os.remove(req); os.remove(vout)
    fx = lambda a: {x["seed"]: x["issues"] for x in a["failures"]}
    return [(fx(ans[2 * i]), fx(ans[2 * i + 1])) for i in range(len(pairs))]


def build(course):
    odir = os.path.join(ROOT, course, "changesets"); f = os.path.join(odir, f"{NAME}.changeset.jsonl")
    if os.path.exists(f + ".applied.jsonl"): print(course, "has a ledger; never rebuilt"); return
    os.makedirs(odir, exist_ok=True)
    plan = []
    for part in ("a", "b"):
        pf = os.path.join(ROOT, course, f"{part}.ops.json")
        if os.path.exists(pf): plan += json.load(open(pf))["ops"]
    rc = copy.deepcopy(RECUT.get(course, {}))
    own = os.path.join(ROOT, course, "recut-374.json")  # a course's own re-cut file (one per course, so parallel authors never collide)
    if os.path.exists(own):
        o2 = json.load(open(own))
        rc.setdefault("replace", {}).update(o2.get("replace", {})); rc["drop"] = rc.get("drop", []) + o2.get("drop", []); rc["add"] = rc.get("add", []) + o2.get("add", [])
    plan = [o for o in plan if o.get("phrase_id") not in set(rc.get("drop", []))]
    for o in plan:
        if o.get("phrase_id") in rc.get("replace", {}): o["set"] = rc["replace"][o["phrase_id"]]
    plan += copy.deepcopy(rc.get("add", []))
    states = {sn: copy_state(course, sn) for sn in sorted({seed_of(o) for o in plan} | {108})}
    d = _SNAPS[course]
    ops, notes = [], []
    for o in plan:
        k = o["op"]; _, seed, legos = states[seed_of(o)]
        P = {p["id"]: p for L in legos.values() for p in L["phrases"]}
        if k in ("lego.insert", "phrase.insert"):
            if k == "phrase.insert" and o["row"]["id"] in P: notes.append(f"insert {o['row']['id']} exists in the copy: dropped"); continue
            if k == "lego.insert" and any(L["lego"] and L["lego"]["lego_index"] == o["row"]["lego_index"] for L in legos.values()):
                raise SystemExit(f"{course}: lego.insert index {o['row']['lego_index']} is taken in the copy")
            ops.append(o); continue
        if k == "seed.update": row = seed
        elif k == "lego.update": row = (legos.get(o["lego_id"]) or {}).get("lego")
        else: row = P.get(o["phrase_id"])
        if row is None:
            if k == "phrase.delete": notes.append(f"delete {o['phrase_id']}: already gone"); continue
            raise SystemExit(f"{course}: {o} has no row in the copy (add it to recut-374.json drop/replace)")
        if k == "phrase.delete": ops.append({"op": k, "phrase_id": o["phrase_id"], "expect": {"target_text": row["target_text"]}}); continue
        st = {x: v for x, v in o["set"].items() if row.get(x) != v}
        if not st: notes.append(f"{k} {o.get('phrase_id') or o.get('lego_id') or o.get('seed_number')}: copy already holds the target"); continue
        n = {kk: v for kk, v in o.items() if kk not in ("set", "expect")}
        ops.append({**n, "set": st, "expect": {"known_text": row["known_text"], "target_text": row["target_text"]}})
    ops.sort(key=lambda o: (ORDER.index(o["op"]), seed_of(o)))
    if not ops: print(course, "nothing to apply", notes); return {"course": course, "ops": 0, "notes": notes}
    # validator on the copy: seed 108 with its ops overlaid (checks run on every seed from 108 on), and each other seed
    # this file touches with ITS ops overlaid (the validator takes one overridden seed per request).
    seeds = sorted(states); after = {}
    pairs = []
    for sn in seeds:
        _, seed, legos = states[sn]
        after[sn] = simulate(seed, legos, [o for o in ops if seed_of(o) == sn])
        b0 = popty.override_for(simulate(seed, legos, []))
        b0["target_text"] = seed["target_text"]  # the tiling check only runs on an overridden target: give the baseline the same check
        a0 = popty.override_for(after[sn]); a0.setdefault("target_text", seed["target_text"])
        pairs.append((b0, a0))
    res = dict(zip(seeds, validate(course, odir, pairs)))
    others = [sn for sn in seeds if sn != 108]
    new, explained = {}, {}
    for sn, (bf, af) in res.items():
        for s2 in af:
            r = popty.regressions(bf.get(s2, []), af[s2])
            if not r: continue
            # a seed this file also fixes: the 108 pair's issue there is answered by that seed's own pair (which must be clean)
            if sn == 108 and s2 in others: explained[s2] = r
            else: new[f"{sn}->{s2}"] = r
    if new: print(course, "NOT BUILT: validator NEW issues", json.dumps(new, ensure_ascii=False)[:600]); return {"course": course, "ops": len(ops), "new_issues": new, "notes": notes}
    # guards: seed text (copy + target), LEGO text (copy + target, or inserted by this file)
    guards = []
    for o in ops:
        sn = seed_of(o); _, seed, legos = states[sn]; so = after[sn].get("seed_override", {})
        sg = [{"known_text": seed["known_text"], "target_text": seed["target_text"]},
              {"known_text": so.get("known_text", seed["known_text"]), "target_text": so.get("target_text", seed["target_text"])}]
        lid = lid_for(o)
        g = {"seed_number": sn, "seed": sg, "lego_id": lid}
        if lid:
            c, n = (legos.get(lid) or {}).get("lego"), (after[sn]["legos"].get(lid) or {}).get("lego")
            g["lego"] = [{"known_text": x["known_text"], "target_text": x["target_text"]} for x in (c, n) if x]
            if c is None: g["inserted"] = True
        guards.append(g)
    tmp = os.path.join(odir, f".{NAME}.ops.json")
    json.dump({"ops": ops}, open(tmp, "w"), ensure_ascii=False)
    subprocess.run(["node", os.path.join(ROOT, "tools/write-cs.cjs"), tmp, f, course, d.get("db") or "", d.get("copy_built") or ""], check=True, capture_output=True)
    os.remove(tmp)
    json.dump({"changeset": f"c0108-{course}-r374", "copy_db": d.get("db"), "guards": guards}, open(os.path.join(odir, f"{NAME}.guards.json"), "w"), ensure_ascii=False)
    cnt = {k: sum(1 for o in ops if o["op"] == k) for k in ORDER if any(o["op"] == k for o in ops)}
    b108, a108 = res[108]
    summ = {"course": course, "copy_db": d.get("db"), "ops": len(ops), "by_op": cnt, "seeds": seeds, "has_b": os.path.exists(os.path.join(ROOT, course, "b.ops.json")),
            "validator_issues_before": sum(len(v) for v in b108.values()), "validator_issues_after": sum(len(v) for v in a108.values()),
            "new_issues": 0, "answered_by_own_seed_fix": explained, "notes": notes}
    json.dump(summ, open(os.path.join(odir, f"{NAME}.summary.json"), "w"), ensure_ascii=False, indent=1)
    print(course, len(ops), cnt, ("answered:" + json.dumps(explained, ensure_ascii=False)) if explained else "", "notes:", notes)
    return summ


for c in sys.argv[2:]: build(c)
