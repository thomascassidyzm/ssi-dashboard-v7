"""cs #758·AI: re-record list from the apply's own before/after images (<c>/a.apply.json): a slot is listed when it HELD a
clip before the edit and the edit emptied it (its spoken words changed). Seeds, LEGOs, phrases; LEGO intros (presentation)
get their old intro line with the old LEGO chunk swapped for the new one (GET /api/production/<c>/presentation/<lego>).
-> <c>/slots.json  [{target: seed|lego|phrase, id, slot, text}]"""
import json, sys, os, urllib.parse
sys.path.insert(0, os.path.dirname(__file__)); import popty
import re
_R = [(re.compile(r"\b(didn't|did not|didn’t)\s+hope\b", re.I), r"\1 expect"), (re.compile(r"\b(weren't|were not)\s+hoping\b", re.I), r"\1 expecting"),
      (re.compile(r"\bwake\b(?!\s+up)", re.I), lambda m: m.group(0) + " up")]
def fixq(t):  # the 'as in' quote of the seed inside an intro follows the seed
    for x, y in _R: t = x.sub(y, t)
    return t
COL = {"known": "known_text", "target1": "target_text", "target2": "target_text"}
for c in sys.argv[1:]:
    ap = json.load(open(f"{popty.ROOT}/{c}/a.apply.json")); out = []
    for r in ap.get("results") or []:
        b, a = r.get("before") or {}, r.get("after") or {}; kind = r["op"].split(".")[0]
        ident = a.get("seed_number") if kind == "seed" else (a.get("lego_id") if kind == "lego" else a.get("id"))
        for slot, col in COL.items():
            if b.get(f"{slot}_audio_id") and not a.get(f"{slot}_audio_id"):
                out.append({"target": kind, "id": ident, "slot": slot, "text": a[col]})
        if kind == "lego" and b.get("presentation_audio_id") and not a.get("presentation_audio_id"):
            st, p = popty.call("GET", f"{popty.BASE}/api/production/{c}/presentation/{ident}")
            old = p.get("text") or ""; ok_ = b["known_text"] in old
            new = fixq(old.replace(b["known_text"], a["known_text"])) if ok_ else None
            out.append({"target": "lego", "id": ident, "slot": "presentation", "text": new, "old_intro": old, "old_audio_id": b["presentation_audio_id"], "held": not ok_,
                        "held_reason": None if ok_ else "old intro does not quote the old LEGO known text; not guessed"})
    ov = f"{popty.ROOT}/{c}/intro-override.json"  # hand-written intro lines where the old one could not be carried over
    if os.path.exists(ov):
        for x in out:
            t = json.load(open(ov)).get(x["id"]) if x["slot"] == "presentation" else None
            if t: x.update(text=t, held=False, held_reason=None)
    json.dump(out, open(f"{popty.ROOT}/{c}/slots.json", "w"), ensure_ascii=False, indent=1)
    print(c, len(out), "slots", sum(len(x["text"] or "") for x in out if not x.get("held")), "chars", sum(1 for x in out if x.get("held")), "held")
