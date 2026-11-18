"""cs #758·AI audio fill, Popty only, ONE request at a time. For every slot in <course>/slots.json (tools/slots2.py):
  - an intro whose words did not change -> relink its old clip (POST link-clip, fill-only);
  - else POST /api/audio/render (library-first, spend guard, one render, no retry) then POST link-clip
    (a presentation render that names its LEGO binds itself); 409 EXISTS_IN_LANGUAGE -> try the named clips through the
    same voice-checked link; anything else refused is recorded and left silent.
Stops on a spend refusal (402 / DAILY_TOTAL_CAP / REPEAT / NOT_IN_CHAIN / ...) or when the job total passes the cap.
usage: fill2.py <cap_total> <course>...   ledger: ops/c0108-719/audio-ledger.json"""
import json, sys, os, re, time
sys.path.insert(0, os.path.dirname(__file__)); import popty
ROOT = popty.ROOT; LEDGER = f"{ROOT}/audio-ledger.json"
PURPOSE = "C0108 hope->expect seed fix (Kai approved 18 Nov, Aran happy) cs #758·AI resuming #719·AI"
STOP = {"DAILY_TOTAL_CAP", "REPEAT", "NOT_IN_CHAIN", "PROVIDER_CAP", "TTS_STOPPED", "SPEND_CAP", "BUDGET"}
UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
cap = int(sys.argv[1]); led = json.load(open(LEDGER)) if os.path.exists(LEDGER) else {"spent": 0, "rows": []}
def save(): json.dump(led, open(LEDGER, "w"), ensure_ascii=False, indent=1)
def link(c, x, aid):
    l = {"role": x["slot"], "audioId": aid}
    l[{"seed": "seedNumber", "lego": "legoId", "phrase": "phraseId"}[x["target"]]] = x["id"]
    st, r = popty.call("POST", f"{popty.BASE}/api/production/{c}/link-clip", {"links": [l]})
    res = (r.get("results") or [{}])[0] if isinstance(r, dict) else {}
    ok = st == 200 and r.get("ok", False) and not res.get("error")
    return ok, res.get("code") or r.get("code"), (res.get("error") or r.get("error") or "")
for c in sys.argv[2:]:
    sl = [x for x in json.load(open(f"{ROOT}/{c}/slots.json")) if not x.get("held") and x.get("text")]
    done = {(r["course"], str(r["id"]), r["slot"]) for r in led["rows"] if r.get("linked")}
    cache = {}
    for x in sl:
        if (c, str(x["id"]), x["slot"]) in done: continue
        if led["spent"] >= cap: print("STOP: cap reached", led["spent"]); save(); sys.exit(0)
        row = {"course": c, "id": x["id"], "slot": x["slot"], "text": x["text"]}
        if x["slot"] == "presentation" and x["text"] == x.get("old_intro") and x.get("old_audio_id"):
            ok, lc, le = link(c, x, x["old_audio_id"]); row.update(source="relink-old-intro", audioId=x["old_audio_id"], linked=ok, link_code=lc, link_error=str(le)[:200])
            led["rows"].append(row); save(); print(c, x["id"], x["slot"], "relink", "linked" if ok else (lc, le)); time.sleep(1); continue
        k = (x["slot"], x["text"])
        if k not in cache:
            body = {"courseCode": c, "role": x["slot"], "text": x["text"], "purpose": PURPOSE, "job": "#758·AI"}
            if x["slot"] == "presentation": body["legoId"] = x["id"]
            st, r = popty.call("POST", f"{popty.BASE}/api/audio/render", body)
            cache[k] = (st, r); led["spent"] += r.get("charsSpent") or 0
        st, r = cache[k]; code = r.get("code")
        row.update(render_status=st, source=r.get("source"), audioId=r.get("audioId"), charsSpent=r.get("charsSpent"), code=code)
        if st == 200 and r.get("audioId"):
            ok, lc, le = link(c, x, r["audioId"]); row.update(linked=ok, link_code=lc, link_error=str(le)[:200])
            if not ok and x["slot"] == "presentation" and r.get("bound"): row["linked"] = True
        elif st == 409 and code == "EXISTS_IN_LANGUAGE":
            row["linked"] = False
            for cand in dict.fromkeys(UUID.findall(json.dumps(r))):
                ok, lc, le = link(c, x, cand)
                if ok: row.update(linked=True, audioId=cand, link_code="EXISTING_CLIP"); break
                row["link_code"] = lc; row.setdefault("tried", []).append([cand[:8], lc])
        else:
            row.update(linked=False, error=str(r.get("error") or r)[:300])
        led["rows"].append(row); save()
        print(c, x["id"], x["slot"], st, r.get("source") or code, r.get("charsSpent") or 0, "linked" if row.get("linked") else (row.get("link_code"), row.get("link_error", "")[:120]), "| total", led["spent"], flush=True)
        if code in STOP or st == 402: print("STOP: spend refusal — the refusal is the answer", code); save(); sys.exit(0)
        time.sleep(1)
    save()
print("TOTAL spent", led["spent"])
