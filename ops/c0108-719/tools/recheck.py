"""cs #374·AI: re-check every C0108 plan (a.ops.json + b.ops.json, written from 18 Nov live reads) against the
NIGHTLY COPY snapshot (ops/paid-cleanup-scan-447/copy-read.cjs snap <course> <file>; no DB access here, files only).

Per op: ok (copy == the plan's expect) | already (copy == the plan's set) | drift (anything else) | gone (row absent)
| insert-ok / insert-exists. Per course it also lists seed-108 rows that still say hope/wake (not 'wake up') and that
no op covers ("uncovered": a row inserted or re-worded since 18 Nov, or a natural positive the plan kept on purpose).

  python3 recheck.py <snapDir> [course ...]      -> <course>/recheck.json + one line per course
"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNAP = sys.argv[1]
HOPE = re.compile(r"\bhop(e|ed|es|ing)\b", re.I)
WAKE = re.compile(r"\bwak(e|ing)\b(?!\s+up)|\bwoke\b(?!\s+up)", re.I)


def seed108(course):
    d = json.load(open(os.path.join(SNAP, f"{course}.json")))
    seed = next((s for s in d["seeds"] if s["seed_number"] == 108), None)
    legos = {l["lego_id"] or f"S0108L{l['lego_index']:02d}": l for l in d["legos"] if l["seed_number"] == 108}
    phrases = {p["id"]: p for p in d["phrases"] if p["seed_number"] == 108}
    return d, seed, legos, phrases


def cmp(row, op):
    if row is None: return "gone"
    exp, st = op.get("expect") or {}, op.get("set") or {}
    if all(row.get(k) == v for k, v in exp.items()): return "ok"
    if st and all(row.get(k) == v for k, v in st.items() if k in ("known_text", "target_text")): return "already"
    return "drift"


def check(course):
    d, seed, legos, phrases = seed108(course)
    ops = []
    for part in ("a", "b"):
        f = os.path.join(ROOT, course, f"{part}.ops.json")
        if os.path.exists(f): ops += [(part, i, o) for i, o in enumerate(json.load(open(f))["ops"])]
    res, covered = [], set()
    for part, i, o in ops:
        k = o["op"]
        if k == "seed.update": st = cmp(seed, o); covered.add("SEED")
        elif k == "lego.update": st = cmp(legos.get(o["lego_id"]), o); covered.add(o["lego_id"])
        elif k in ("phrase.update", "phrase.delete"):
            st = cmp(phrases.get(o["phrase_id"]), o); covered.add(o["phrase_id"])
            if k == "phrase.delete" and st == "gone": st = "already"
        elif k == "phrase.insert": st = "insert-exists" if o["row"]["id"] in phrases else "insert-ok"; covered.add(o["row"]["id"])
        elif k == "lego.insert":
            idx = o["row"]["lego_index"]
            st = "insert-exists" if any(l["lego_index"] == idx for l in legos.values()) else "insert-ok"
        else: st = "unknown-op"
        res.append({"part": part, "i": i, "op": k, "key": o.get("phrase_id") or o.get("lego_id") or o.get("seed_number") or (o.get("row") or {}).get("id") or f"L{(o.get('row') or {}).get('lego_index')}", "status": st})
    unc = []
    def flag(key, r):
        if key in covered or r is None: return
        if HOPE.search(r.get("known_text") or "") or WAKE.search(r.get("known_text") or ""): unc.append({"key": key, "known": r["known_text"], "target": r["target_text"]})
    flag("SEED", seed)
    for k, l in legos.items(): flag(k, l)
    for k, p in phrases.items(): flag(k, p)
    out = {"course": course, "copy_db": d.get("db"), "copy_built": d.get("copy_built"), "ops": res, "uncovered": unc,
           "counts": {s: sum(1 for r in res if r["status"] == s) for s in sorted({r["status"] for r in res})}}
    os.makedirs(os.path.join(ROOT, course), exist_ok=True)
    json.dump(out, open(os.path.join(ROOT, course, "recheck.json"), "w"), ensure_ascii=False, indent=1)
    return out


courses = sys.argv[2:] or sorted(f[:-5] for f in os.listdir(SNAP) if f.endswith(".json"))
for c in courses:
    o = check(c)
    print(c, o["counts"] or "NO PLAN", "uncovered", len(o["uncovered"]))
