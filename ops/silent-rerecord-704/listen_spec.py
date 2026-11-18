"""cs #704·AI: listening-page spec for clip-page.cjs: one clip per course (two for the big ones, up to 15), spread across
courses and roles, downloaded through Popty's GET /api/production/:course/audio/:uuid/url. usage: listen_spec.py <out_dir> <spec.json>"""
import json, os, sys, urllib.request, collections
H = os.path.dirname(os.path.abspath(__file__)); out_dir, spec = sys.argv[1], sys.argv[2]; os.makedirs(out_dir, exist_ok=True)
R = [r for r in json.load(open(f'{H}/readback.json')) if r['readback'] == 'serving-new']
by = collections.defaultdict(list); seen = set()
for r in R:
    if r['audioId'] in seen: continue
    seen.add(r['audioId']); by[r['course']].append(r)
pick = []
for c, rs in by.items(): pick += rs[:2] if len(rs) > 10 else rs[:1]
pick = pick[:15]; clips = []
for r in pick:
    req = urllib.request.Request(f"http://localhost:3470/api/production/{r['course']}/audio/{r['audioId']}/url", headers={'x-agent-id': 'cs-704-silent-rerecord'})
    url = json.load(urllib.request.urlopen(req, timeout=60)).get('url'); dest = os.path.join(out_dir, f"{r['course']}-{r['audioId']}.mp3")
    urllib.request.urlretrieve(url, dest)
    clips.append({'label': f"{r['course']} · {r['row']} · {r['role']} · {r['text'][:90]} · {r['audioId'][:8]}", 'file': os.path.abspath(dest)})
json.dump({'title': 'Silent rows follow-up (#704·AI, 18 Nov): re-recorded clips, UNHEARD',
           'intro': 'A sample of the 84 slots #694·AI left silent, now re-recorded in each course\'s cast voice and live. UNHEARD — Kai\'s ear is the check.',
           'clips': clips}, open(spec, 'w'), ensure_ascii=False, indent=1)
print(len(clips), 'clips')
