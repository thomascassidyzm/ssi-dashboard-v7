"""cs #701·AI audio fill, Popty only. For every EMPTY slot on a row this job edited (audio.py slots -> <course>/slots.json):
  1. POST /api/audio/render (real; library-first, spend guard, one render) for (role, text);
  2. link the clip with POST /api/production/:c/link-clip (voice-checked against the cast, fill-only, text must match);
     on 409 EXISTS_IN_LANGUAGE try each named existing clip through the same voice-checked link (a clip in another voice is refused
     there, and the slot is left silent as a voice question).
Stops on any spend refusal (402 / DAILY_TOTAL_CAP / REPEAT / NOT_IN_CHAIN / ...) or when the job total passes the cap.
usage: fill.py <cap_total> <course>...     ledger: ops/paid-cleanup-item5/audio-ledger.json (job-wide chars spent)"""
import json, sys, os, re
sys.path.insert(0, os.path.dirname(__file__)); import popty
ROOT = popty.ROOT; LEDGER = f"{ROOT}/audio-ledger.json"
PURPOSE = "C0108 hope->expect seed fix across courses (Kai approved, Aran happy) cs #758·AI resuming #719·AI"
STOP = {"DAILY_TOTAL_CAP", "REPEAT", "NOT_IN_CHAIN", "PROVIDER_CAP", "TTS_STOPPED", "SPEND_CAP", "BUDGET"}
UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
cap = int(sys.argv[1]); led = json.load(open(LEDGER)) if os.path.exists(LEDGER) else {"spent": 0, "rows": []}
def save(): json.dump(led, open(LEDGER, "w"), ensure_ascii=False, indent=1)
def link(c, x, aid):
    l = {"role": x["slot"], "audioId": aid}
    if x["target"] == "phrase": l["phraseId"] = x["id"]
    else: l["legoId"] = x["id"]
    st, r = popty.call("POST", f"{popty.BASE}/api/production/{c}/link-clip", {"links": [l]})
    res = (r.get("results") or [{}])[0] if isinstance(r, dict) else {}
    return st == 200 and r.get("ok", False), res.get("code") or r.get("code"), res.get("error") or r.get("error")
for c in sys.argv[2:]:
    sl = [x for x in json.load(open(f"{ROOT}/{c}/slots.json")) if not x.get("held") and x.get("is_new") is not False]
    done = {(r["course"], r["id"], r["slot"]) for r in led["rows"] if r.get("linked")}
    cache = {}
    for x in sl:
        if (c, x["id"], x["slot"]) in done: continue
        if led["spent"] >= cap: print("STOP: cap reached", led["spent"]); save(); sys.exit(0)
        k = (x["slot"], x["text"])
        if k not in cache:
            st, r = popty.call("POST", f"{popty.BASE}/api/audio/render", {"courseCode": c, "role": x["slot"], "text": x["text"], "purpose": PURPOSE, "job": "#701·AI"})
            cache[k] = (st, r); led["spent"] += r.get("charsSpent") or 0
        st, r = cache[k]; code = r.get("code"); row = {"course": c, "id": x["id"], "slot": x["slot"], "text": x["text"], "render_status": st,
              "source": r.get("source"), "audioId": r.get("audioId"), "charsSpent": r.get("charsSpent"), "code": code}
        if st == 200 and r.get("audioId"):
            ok, lc, le = link(c, x, r["audioId"]); row.update(linked=ok, link_code=lc, link_error=(le or "")[:200])
        elif st == 409 and code == "EXISTS_IN_LANGUAGE":
            row["linked"] = False
            for cand in dict.fromkeys(UUID.findall(json.dumps(r))):
                ok, lc, le = link(c, x, cand)
                if ok: row.update(linked=True, audioId=cand, link_code="EXISTING_CAST_VOICE"); break
                row["link_code"] = lc
        else:
            row.update(linked=False, error=str(r.get("error") or r)[:200])
        led["rows"].append(row); save()
        print(c, x["id"].split(":")[-1], x["slot"], st, r.get("source") or code, r.get("charsSpent") or 0, "linked" if row.get("linked") else row.get("link_code") or "", "| total", led["spent"], flush=True)
        if code in STOP or st == 402: print("STOP: spend refusal — the refusal is the answer", code); save(); sys.exit(0)
    save()
print("TOTAL spent", led["spent"])
