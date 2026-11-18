"""cs #758·AI: keep only slots that HELD a clip before the text edit (re-record where spoken words changed; never fill
a slot that was already silent — that is not this job). Reads <c>/live/108.pre.json, rewrites <c>/slots.json, keeps the dropped in slots.dropped.json."""
import json, sys
for c in sys.argv[1:]:
    pre = json.load(open(f"{c}/live/108.pre.json")); had = set()
    for lid, L in pre["legos"].items():
        for r in ("known", "target1", "target2"):
            if L["lego"].get(f"{r}_audio_id"): had.add(("lego", lid, r))
        for p in L["phrases"]:
            for r in ("known", "target1", "target2"):
                if p.get(f"{r}_audio_id"): had.add(("phrase", p["id"], r))
    sl = json.load(open(f"{c}/slots.json")); keep = [x for x in sl if (x["target"], x["id"], x["slot"]) in had]
    json.dump(keep, open(f"{c}/slots.json", "w"), ensure_ascii=False, indent=1)
    json.dump([x for x in sl if x not in keep], open(f"{c}/slots.dropped.json", "w"), ensure_ascii=False, indent=1)
    print(c, "slots to re-record", len(keep), "| were silent before (left)", len(sl) - len(keep), "| chars", sum(len(x["text"] or "") for x in keep if not x.get("held") and x["is_new"] is not False))
