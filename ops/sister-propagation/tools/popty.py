"""Thin client for Popty's HTTP routes (cs #695·AI). Reads via GET routes, writes via edit-batch,
audio via /api/audio/render. No database access of any kind.

usage:
  popty.py baskets <course> <out_dir> S0055 S0056 ...      # GET seed/:id/baskets + lego baskets (full rows)
  popty.py batch <course> <ops.json> <out.json> [apply]     # POST edit-batch (dry unless 'apply')
  popty.py render <course> <asks.json> <out.json> dry|real  # asks: [{role,text,rows}]
"""
import json, sys, os, urllib.request, urllib.error

BASE = "http://localhost:3470"
AGENT = "cs-sister-propagation"


def call(method, path, body=None, timeout=180):
    data = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method,
                                 headers={"Content-Type": "application/json", "x-agent-id": AGENT})
    try:
        r = urllib.request.urlopen(req, timeout=timeout)
        return r.status, json.load(r)
    except urllib.error.HTTPError as h:
        raw = h.read() or b"{}"
        try:
            return h.code, json.loads(raw)
        except Exception:
            return h.code, {"raw": raw.decode(errors="replace")[:500]}


def baskets(course, out_dir, seeds):
    os.makedirs(out_dir, exist_ok=True)
    for s in seeds:
        st, seed = call("GET", f"/api/production/{course}/seed/{s}/baskets")
        legos = {}
        for lid in sorted((seed.get("baskets") or {}).keys()):
            st2, b = call("GET", f"/api/production/{course}/lego/{lid}/basket")
            legos[lid] = b
        json.dump({"seed": seed, "legos": legos}, open(f"{out_dir}/{s}.json", "w"), ensure_ascii=False, indent=1)
        print(s, st, len(legos), flush=True)


def batch(course, ops_file, out_file, apply=False):
    body = json.load(open(ops_file))
    if apply:
        body["apply"] = True
    st, res = call("POST", f"/api/production/{course}/edit-batch", body, timeout=300)
    json.dump({"status": st, **res}, open(out_file, "w"), ensure_ascii=False, indent=1)
    print(st, {k: res.get(k) for k in ("ok", "applied", "eventId", "event_id", "error", "code") if k in res})


def render(course, asks_file, out_file, mode, purpose):
    asks = json.load(open(asks_file))
    out = []
    for a in asks:
        body = {"courseCode": course, "role": a["role"], "text": a["text"], "purpose": purpose,
                "dryRun": mode == "dry"}
        st, res = call("POST", "/api/audio/render", body)
        keep = {k: res.get(k) for k in ("ok", "source", "audioId", "charsSpent", "wouldSpendChars",
                                         "code", "error", "message", "voiceId") if k in res}
        out.append({**a, "status": st, **keep})
        print(st, a["role"], keep.get("source"), keep.get("charsSpent", keep.get("wouldSpendChars")),
              keep.get("code"), a["text"][:60], flush=True)
        if st == 409 and res.get("code") == "EXISTS_IN_LANGUAGE":
            # the route's own answer: the words are already recorded in this language — link that clip (free)
            import re as _re
            ids = _re.findall(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", res.get("error", ""))
            out[-1]["existing_clips"] = ids
            continue
        if mode == "real" and st >= 400:
            print("REFUSED — stopping (a refusal is the answer)", flush=True)
            break
    json.dump(out, open(out_file, "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "baskets":
        baskets(sys.argv[2], sys.argv[3], sys.argv[4:])
    elif cmd == "batch":
        batch(sys.argv[2], sys.argv[3], sys.argv[4], len(sys.argv) > 5 and sys.argv[5] == "apply")
    elif cmd == "render":
        render(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5],
               sys.argv[6] if len(sys.argv) > 6 else "cs #695·AI sister-course propagation (Kai Y 18 Nov)")
