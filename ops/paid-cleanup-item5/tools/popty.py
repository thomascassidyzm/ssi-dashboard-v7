"""cs #701·AI item-5 client for Popty's HTTP routes. Reads via GET routes, writes via edit-batch,
validates via the course-builder's own /v2/validate (override = simulated post-edit seed). No DB access.

  popty.py fetch <course> <seed>...           -> ops/paid-cleanup-item5/<course>/live/<seed>.json (seed baskets + lego baskets)
  popty.py show <course> <seed>...            compact print of the fetched seeds
  popty.py validate <course> <ops.json>       per touched seed: issues BEFORE (live) vs AFTER (ops simulated via override)
  popty.py batch <course> <ops.json> [apply]  edit-batch dry run (or apply); result -> <ops>.dry.json / .apply.json
"""
import json, sys, os, urllib.request, urllib.error, copy
BASE = "http://localhost:3470"; CB = "http://localhost:3471"
AGENT = "cs-item5-broken-english"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def call(method, url, body=None, timeout=300):
    data = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={"Content-Type": "application/json", "x-agent-id": AGENT})
    try:
        r = urllib.request.urlopen(req, timeout=timeout); return r.status, json.load(r)
    except urllib.error.HTTPError as h:
        raw = h.read() or b"{}"
        try: return h.code, json.loads(raw)
        except Exception: return h.code, {"raw": raw.decode(errors="replace")[:500]}

def live_dir(c):
    d = f"{ROOT}/{c}/live"; os.makedirs(d, exist_ok=True); return d

def fetch(c, seeds):
    for s in seeds:
        s = int(s)
        st, seed = call("GET", f"{BASE}/api/production/{c}/seed/{s}/baskets")
        st2, lg = call("GET", f"{CB}/api/legos/{c}?seed={s}")
        legos = {}
        for l in lg.get("legos", []):
            _, b = call("GET", f"{BASE}/api/production/{c}/lego/{l['lego_id']}/basket")
            legos[l["lego_id"]] = {"lego": l, "is_new": (seed.get("baskets", {}).get(l["lego_id"]) or {}).get("is_new"), "phrases": b.get("phrases", [])}
        json.dump({"seed": s, "seed_pair": seed.get("seed_pair"), "legos": legos}, open(f"{live_dir(c)}/{s}.json", "w"), ensure_ascii=False, indent=1)
        print(c, s, st, st2, len(legos), flush=True)

def load(c, s): return json.load(open(f"{live_dir(c)}/{int(s)}.json"))

def show(c, seeds):
    only = [x for x in seeds if x.startswith("S")]; seeds = sorted({int(x[1:5]) if x.startswith("S") else int(x) for x in seeds})
    for s in seeds:
        d = load(c, s); print(f"=== {c} seed {s}: {d.get('seed_pair')}")
        for lid, L in d["legos"].items():
            if only and not any(lid.startswith(o[:8]) for o in only):
                l = L["lego"]; print(f"  {lid} new={L['is_new']} '{l['known_text']}' = '{l['target_text']}' ({len(L['phrases'])})"); continue
            l = L["lego"]; print(f"  {lid} new={L['is_new']} {l['type']} '{l['known_text']}' = '{l['target_text']}'")
            for p in sorted(L["phrases"], key=lambda p: p["position"]):
                print(f"     {p['id'].split(':')[1]} {p['phrase_role'][:1]} {p['known_text']} | {p['target_text']}")

def apply_ops(c, ops):
    """simulate ops on the fetched live seeds; returns {seed: (legos, phrases-by-key)}"""
    seeds = {}
    def get(s):
        if s not in seeds: seeds[s] = copy.deepcopy(load(c, s))
        return seeds[s]
    for op in ops:
        o = op["op"]
        if o == "phrase.update" or o == "phrase.delete":
            pid = op["phrase_id"]; s = int(pid.split(":")[1][1:5]); d = get(s)
            for L in d["legos"].values():
                for p in list(L["phrases"]):
                    if p["id"] == pid:
                        if o == "phrase.delete": L["phrases"].remove(p)
                        else: p.update(op["set"])
                        if o == "phrase.update" and "lego_id" in op["set"]: pass
        elif o == "phrase.insert":
            r = op["row"]; d = get(int(r["seed_number"]))
            lid = f"S{int(r['seed_number']):04d}L{int(r['lego_index']):02d}"
            d["legos"][lid]["phrases"].append(dict(r))
        elif o == "lego.update":
            lid = op["lego_id"]; d = get(int(lid[1:5])); d["legos"][lid]["lego"].update({k: v for k, v in op["set"].items() if k in ("known_text", "target_text", "type", "components")})
            if "is_new" in op["set"]: d["legos"][lid]["is_new"] = op["set"]["is_new"]
        elif o == "seed.update":
            d = get(int(op["seed_number"])); d.setdefault("seed_override", {}).update(op["set"])
    return seeds

def override_for(d):
    legos = [{"lego_index": L["lego"]["lego_index"], "known_text": L["lego"]["known_text"], "target_text": L["lego"]["target_text"],
              "type": L["lego"]["type"], "components": L["lego"].get("components"), "is_new": L["is_new"] is not False} for L in d["legos"].values()]
    ph = {}
    for L in d["legos"].values():
        ph[f"{d['seed']}:{L['lego']['lego_index']}"] = [{"known_text": p["known_text"], "target_text": p["target_text"], "phrase_role": p["phrase_role"]} for p in L["phrases"]]
    ov = {"seed_number": d["seed"], "legos": legos, "phrases": ph}
    if d.get("seed_override", {}).get("target_text"): ov["target_text"] = d["seed_override"]["target_text"]
    return ov

def validate_one(c, s, override=None):
    body = {"fromSeed": s}
    if override: body["override"] = override
    st, r = call("POST", f"{CB}/api/v2/validate/{c}", body)
    for f in r.get("failures") or []:
        if f["seed"] == s: return f["issues"]
    return [] if st == 200 else [f"VALIDATOR ERROR {st} {r}"]

def validate(c, ops_file):
    ops = json.load(open(ops_file))["ops"]
    sim = apply_ops(c, ops); out = {}
    for s, d in sorted(sim.items()):
        before = validate_one(c, s); after = validate_one(c, s, override_for(d))
        new = [i for i in after if i not in before]
        out[s] = {"before": before, "after": after, "new_issues": new}
        print(f"seed {s}: before {len(before)} after {len(after)} NEW: {new}", flush=True)
    json.dump(out, open(ops_file.replace(".ops.json", "") + ".validate.json", "w"), ensure_ascii=False, indent=1)

def batch(c, ops_file, apply=False):
    body = json.load(open(ops_file)); body["apply"] = bool(apply)
    st, res = call("POST", f"{BASE}/api/production/{c}/edit-batch", body)
    out = ops_file.replace(".ops.json", "") + (".apply.json" if apply else ".dry.json")
    json.dump({"status": st, **res}, open(out, "w"), ensure_ascii=False, indent=1)
    print(st, {k: res.get(k) for k in ("ok", "applied", "event_id", "eventId", "error", "code") if k in res})
    for i, r in enumerate(res.get("results") or []):
        if r.get("error") or not r.get("changed", True): print("  ", i, json.dumps(r, ensure_ascii=False)[:300])

if __name__ == "__main__":
    a = sys.argv
    {"fetch": lambda: fetch(a[2], a[3:]), "show": lambda: show(a[2], a[3:]), "validate": lambda: validate(a[2], a[3]),
     "batch": lambda: batch(a[2], a[3], len(a) > 4 and a[4] == "apply")}[a[1]]()
