"""Compose render asks and edit-batch ops from a decisions.py (cs #695·AI). HTTP-free; reads the live
baskets fetched by popty.py (for `expect`) and, for ops, the audio map from render results.

usage:
  compose.py asks <course> <decisions.py> <live_dir> <out_asks.json> [FAMILIES]
  compose.py ops  <course> <decisions.py> <live_dir> <audio_results.json> <out_prefix> [FAMILIES] [chunk]
"""
import json, sys, glob, importlib.util


def load(dec_path):
    spec = importlib.util.spec_from_file_location("dec", dec_path)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m


def live(live_dir):
    rows, seeds, legos = {}, {}, {}
    for f in glob.glob(f"{live_dir}/*.json"):
        d = json.load(open(f))
        sid = d["seed"]["seedId"]; seeds[int(sid[1:])] = d["seed"]["seed_pair"]
        for lid, b in (d["seed"].get("baskets") or {}).items():
            legos[lid] = b["lego"]
        for b in d["legos"].values():
            for p in b["phrases"]:
                rows[p["id"].split(":", 1)[1]] = p
    return rows, seeds, legos


def items(dec, fams):
    out = []
    for fam, lst in dec.ROWS.items():
        if fams and fam not in fams: continue
        for rid, k, t in lst: out.append(("phrase", rid, k, t, None, fam))
    for sn, (k, t) in dec.SEEDS.items(): out.append(("seed", sn, k, t, None, None))
    for lid, (k, t, pres) in dec.LEGOS.items(): out.append(("lego", lid, k, t, pres, None))
    return out


def main():
    mode, course, decp, live_dir = sys.argv[1:5]
    dec = load(decp); rows, seeds, legos = live(live_dir)
    if mode == "asks":
        fams = sys.argv[6] if len(sys.argv) > 6 else ""
        asks = {}
        for kind, key, k, t, pres, fam in items(dec, fams):
            if kind == "seed" and fams and not any(True for _ in [0]): pass
            if k: asks.setdefault(("known", k), []).append(f"{kind}:{key}")
            if t:
                for r in ("target1", "target2"): asks.setdefault((r, t), []).append(f"{kind}:{key}")
            if pres: asks.setdefault(("presentation", pres), []).append(f"{kind}:{key}")
        out = [{"role": r, "text": tx, "rows": ids} for (r, tx), ids in asks.items()]
        json.dump(out, open(sys.argv[5], "w"), ensure_ascii=False, indent=1)
        est = sum(len(a["text"]) for a in out if a["role"] != "presentation") + sum(
            len(a["text"].split(" <break")[0]) for a in out if a["role"] == "presentation")
        print(len(out), "asks; upper-bound chars (no library hits):", est)
        return
    textonly = sys.argv[5] == "-"  # text-only DRY RUN probe: no audio ids composed
    audio = {} if textonly else {(a["role"], a["text"]): a.get("audioId") for a in json.load(open(sys.argv[5])) if a.get("audioId")}
    prefix = sys.argv[6]; fams = sys.argv[7] if len(sys.argv) > 7 else ""; chunk = int(sys.argv[8]) if len(sys.argv) > 8 else 10
    ops, missing = [], []
    def aud(role, text, ref):
        a = audio.get((role, text))
        if textonly: return "__TEXTONLY__"
        if not a: missing.append((ref, role, text))
        return a
    for kind, key, k, t, pres, fam in items(dec, fams):
        s, exp = {}, {}
        if kind == "phrase":
            p = rows[key]; exp = {"known_text": p["known_text"], "target_text": p["target_text"]}
        elif kind == "seed":
            sp = seeds[key]; exp = {"known_text": sp["known"], "target_text": sp["target"]}
        else:
            lg = legos[key]; exp = {"known_text": lg["known"], "target_text": lg["target"]}
        if k and k != exp["known_text"]:
            s["known_text"] = k; s["known_audio_id"] = aud("known", k, key)
        if t and t != exp["target_text"]:
            s["target_text"] = t; s["target1_audio_id"] = aud("target1", t, key); s["target2_audio_id"] = aud("target2", t, key)
        if pres: s["presentation_audio_id"] = aud("presentation", pres, key)
        s = {c: v for c, v in s.items() if v != "__TEXTONLY__"}
        if not s: continue
        if kind == "phrase": ops.append({"op": "phrase.update", "phrase_id": f"{course}:{key}", "expect": exp, "set": s})
        elif kind == "seed": ops.append({"op": "seed.update", "seed_number": key, "expect": exp, "set": s})
        else: ops.append({"op": "lego.update", "lego_id": key, "expect": exp, "set": s})
    if missing:
        print("MISSING AUDIO — not composing:", json.dumps(missing, ensure_ascii=False)[:2000]); sys.exit(1)
    n = 0
    for i in range(0, len(ops), chunk):
        n += 1; json.dump({"ops": ops[i:i + chunk]}, open(f"{prefix}-{n:02d}.json", "w"), ensure_ascii=False, indent=1)
    print(len(ops), "ops in", n, "chunks")


if __name__ == "__main__":
    main()
