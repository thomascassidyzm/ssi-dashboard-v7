"""cs #868: item 5 listening page spec: rendered English (target1/target2) clips from the fill ledgers, spread across
courses (up to 4 per course, 15 total), downloaded via Popty GET /api/production/:course/audio/:uuid/url.
usage: listen5.py <out_dir> <spec.json>"""
import json, os, sys, glob, urllib.request, collections
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); out_dir, spec = sys.argv[1], sys.argv[2]; os.makedirs(out_dir, exist_ok=True)
by = collections.defaultdict(list); seen = set()
for f in sorted(glob.glob(f'{H}/item5/*.ledger.jsonl')):
    for l in open(f):
        r = json.loads(l)
        if r.get('source') == 'rendered' and r.get('role') in ('target1', 'target2') and r['audioId'] not in seen:
            seen.add(r['audioId']); by[r['course']].append(r)
pick = []
for c, rs in by.items(): pick += rs[::max(1, len(rs) // 4)][:4]
clips = []
for r in pick[:15]:
    req = urllib.request.Request(f"http://localhost:3470/api/production/{r['course']}/audio/{r['audioId']}/url", headers={'x-agent-id': 'kai-868'})
    url = json.load(urllib.request.urlopen(req, timeout=60)).get('url'); dest = os.path.join(out_dir, f"{r['course']}-{r['audioId']}.mp3")
    urllib.request.urlretrieve(url, dest)
    clips.append({'label': f"{r['course']} · {r['id']} · {r['role']} · {r['text'][:90]} · {r['audioId'][:8]}", 'file': os.path.abspath(dest)})
json.dump({'title': 'Item 5 broken-English audio fill (cs #868, 24 Nov): sample, UNHEARD',
           'intro': '250 empty slots on rows item 5 fixed on 18 Nov are now filled (tam 136, jpn 61, sin 46, ben 4, kan 3; 8,484 chars). A sample of the newly rendered English clips. UNHEARD: Kai\'s ear is the check.',
           'clips': clips}, open(spec, 'w'), ensure_ascii=False, indent=1)
print(len(clips), 'clips')
