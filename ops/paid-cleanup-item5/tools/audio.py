"""cs #701·AI item-5 audio, through Popty only.
  audio.py slots <course> <ops.json>...      re-fetch touched seeds live; list empty slots on edited rows -> <course>/slots.json
  audio.py render <course> dry|real [cap]    POST /api/audio/render per unique (role,text); -> <course>/render-<mode>.json
  audio.py link <course> [apply]             audio.link ops from render-real.json -> <course>/link.ops.json (+ edit-batch)
Rows held for overlap: list ids in <course>/hold.txt (one per line) and they are skipped."""
import json, sys, os, re
sys.path.insert(0, os.path.dirname(__file__)); import popty
ROOT = popty.ROOT
PURPOSE = "item 5 broken English fix (paid-course cleanup, Kai approved 18 Nov) cs #701·AI"
SLOTS = [("known", "known_text"), ("target1", "target_text"), ("target2", "target_text")]

def slots(c, opsfiles):
    ids = set(); seeds = set()
    for f in opsfiles:
        for op in json.load(open(f))["ops"]:
            if op["op"] == "phrase.update": ids.add(op["phrase_id"]); seeds.add(int(op["phrase_id"].split(":")[1][1:5]))
            if op["op"] == "phrase.insert": ids.add(op["row"]["id"]); seeds.add(int(op["row"]["seed_number"]))
            if op["op"] == "lego.update": ids.add("LEGO:" + op["lego_id"]); seeds.add(int(op["lego_id"][1:5]))
    lego_after = {}
    for f in opsfiles:
        af = f.replace(".ops.json", ".apply.json")
        if os.path.exists(af):
            for r in json.load(open(af)).get("results") or []:
                if r.get("op") == "lego.update" and r.get("after"): lego_after[r["key"].get("lego_id") or r["after"].get("lego_id")] = r["after"]
    hold = set(open(f"{ROOT}/{c}/hold.txt").read().split()) if os.path.exists(f"{ROOT}/{c}/hold.txt") else set()
    popty.fetch(c, sorted(seeds)); out = []
    for s in sorted(seeds):
        d = popty.load(c, s)
        for lid, L in d["legos"].items():
            if "LEGO:" + lid in ids:
                aft = lego_after.get(lid, {})  # the apply's own after-image: which LEGO slots the text edit emptied
                for role, col in SLOTS:
                    if not aft.get(f"{role}_audio_id"):
                        out.append({"target": "lego", "id": lid, "slot": role, "text": L["lego"][col], "is_new": L["is_new"], "held": lid in hold})
            for p in L["phrases"]:
                if p["id"] not in ids: continue
                for role, col in SLOTS:
                    if not p.get(f"{role}_audio_id"):
                        out.append({"target": "phrase", "id": p["id"], "slot": role, "text": p[col], "is_new": L["is_new"],
                                    "held": p["id"].split(":")[1] in hold})
    json.dump(out, open(f"{ROOT}/{c}/slots.json", "w"), ensure_ascii=False, indent=1)
    print(c, len(out), "empty slots;", sum(1 for x in out if x.get("held")), "held;", sum(1 for x in out if x["is_new"] is False), "under not-new LEGOs")

def render(c, mode, cap=40000):
    sl = [x for x in json.load(open(f"{ROOT}/{c}/slots.json")) if not x.get("held") and x["is_new"] is not False]
    f = f"{ROOT}/{c}/render-{mode}.json"
    done = json.load(open(f)) if os.path.exists(f) else {}
    spent = 0
    for x in sl:
        k = f"{x['slot']}|{x['text']}"
        if k in done and (mode == "dry" or done[k].get("ok")): continue
        st, r = popty.call("POST", f"{popty.BASE}/api/audio/render", {"courseCode": c, "role": x["slot"], "text": x["text"], "purpose": PURPOSE,
                                                                    "dryRun": mode == "dry", "job": "#701·AI"})
        keep = {kk: r.get(kk) for kk in ("ok", "source", "audioId", "charsSpent", "wouldSpendChars", "code", "error", "voiceId") if kk in r}
        keep["status"] = st
        if st == 409 and r.get("code") == "EXISTS_IN_LANGUAGE":
            keep["existing"] = re.findall(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", json.dumps(r))
        done[k] = keep; json.dump(done, open(f, "w"), ensure_ascii=False, indent=1)
        spent += r.get("charsSpent") or 0
        print(st, x["slot"], keep.get("source"), keep.get("charsSpent", keep.get("wouldSpendChars")), keep.get("code") or "", x["text"][:60], flush=True)
        if mode == "real" and st >= 400 and st != 409: print("REFUSED: stopping (a refusal is the answer)"); break
        if mode == "real" and spent > cap: print("STOP: cap"); break
    tot = sum((v.get("charsSpent") if mode == "real" else v.get("wouldSpendChars")) or 0 for v in done.values())
    print(c, mode, "total chars", tot)

def link(c, apply=False):
    sl = json.load(open(f"{ROOT}/{c}/slots.json")); rr = json.load(open(f"{ROOT}/{c}/render-real.json")); ops = []
    for x in sl:
        r = rr.get(f"{x['slot']}|{x['text']}")
        if not r: continue
        aid = r.get("audioId") or (r.get("existing") or [None])[0]
        if not aid: continue
        op = {"op": "audio.link", "target": x["target"], "slot": x["slot"], "audio_id": aid}
        if x["target"] == "phrase": op["phrase_id"] = x["id"]
        else: op["lego_id"] = x["id"]
        ops.append(op)
    json.dump({"ops": ops}, open(f"{ROOT}/{c}/link.ops.json", "w"), ensure_ascii=False, indent=1)
    print(len(ops), "link ops"); popty.batch(c, f"{ROOT}/{c}/link.ops.json", apply)

if __name__ == "__main__":
    a = sys.argv
    if a[1] == "slots": slots(a[2], a[3:])
    elif a[1] == "render": render(a[2], a[3], int(a[4]) if len(a) > 4 else 40000)
    elif a[1] == "link": link(a[2], len(a) > 3 and a[3] == "apply")
