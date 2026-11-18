"""Build the ONE listening-page spec (clip-page.cjs) from every course's audio-real*.json (cs #695·AI).
Takes each new target1 clip (one per new target text) and every presentation clip; downloads through Popty's
GET /api/production/:course/audio/:uuid/url. usage: listen_spec.py <out_dir> <spec.json>"""
import json, glob, os, sys, urllib.request

out_dir, spec_path = sys.argv[1], sys.argv[2]
os.makedirs(out_dir, exist_ok=True)
clips = []
for f in sorted(glob.glob(os.path.join(os.path.dirname(__file__), "..", "*", "audio-real*.json"))):
    course = os.path.basename(os.path.dirname(f))
    for a in json.load(open(f)):
        if a.get("role") not in ("target1", "presentation") or not a.get("audioId"):
            continue
        aid = a["audioId"]
        req = urllib.request.Request(f"http://localhost:3470/api/production/{course}/audio/{aid}/url",
                                     headers={"x-agent-id": "cs-sister-propagation"})
        try:
            url = json.load(urllib.request.urlopen(req, timeout=60)).get("url")
            dest = os.path.join(out_dir, f"{course}-{aid}.mp3")
            urllib.request.urlretrieve(url, dest)
        except Exception as e:
            print("skip", course, aid, e); continue
        rows = ", ".join(r.replace("phrase:", "") for r in a.get("rows", [])[:3])
        clips.append({"label": f"{course} · {a['role']} · {a['text'][:90]} · {rows} · {a.get('source')} · {aid[:8]}",
                      "file": os.path.abspath(dest)})
json.dump({"title": "Sister-course propagation (#695·AI): new clips, UNHEARD",
           "intro": "Every new target clip (target1, one per new text) and new LEGO intro from the 18 Nov sister-course pass. UNHEARD — Kai's ear is the check.",
           "clips": clips}, open(spec_path, "w"), ensure_ascii=False, indent=1)
print(len(clips), "clips")
