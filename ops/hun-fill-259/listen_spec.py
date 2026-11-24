"""cs #259·AL: listening-page spec for clip-page.cjs — 20 newly filled hun_for_eng clips (10 target1 Kinga, 10 target2 Bence),
spread across seeds, labelled row id + English meaning, downloaded through Popty's GET /api/production/:course/audio/:uuid/url.
usage: python3 -I listen_spec.py <out_dir> <spec.json>"""
import json, os, sys, urllib.request
H = os.path.dirname(os.path.abspath(__file__)); out_dir, spec = sys.argv[1], sys.argv[2]; os.makedirs(out_dir, exist_ok=True)
known = {s['phraseId']: s['known'] for s in json.load(open(f'{H}/live/slots.json'))}
R = [json.loads(l) for l in open(f'{H}/results/hun_for_eng.jsonl')]
R = [r for r in R if r.get('link', {}).get('ok') and r['render'].get('source') == 'rendered']
pick = []
for role in ('target1', 'target2'):
    rs = [r for r in R if r['role'] == role]; step = max(1, len(rs) // 10); pick += rs[::step][:10]
clips = []
for r in pick:
    req = urllib.request.Request(f"http://localhost:3470/api/production/hun_for_eng/audio/{r['render']['audioId']}/url", headers={'x-agent-id': 'kai-259-hun-fill'})
    url = json.load(urllib.request.urlopen(req, timeout=60)).get('url'); dest = os.path.join(out_dir, f"{r['render']['audioId']}.mp3")
    urllib.request.urlretrieve(url, dest)
    v = 'Kinga (female)' if r['role'] == 'target1' else 'Bence (male)'
    clips.append({'label': f"{r['row']} · {r['role']} {v} · \"{known.get(r['phraseId'], '')}\" · {r['text']} · {r['render']['audioId'][:8]}", 'file': os.path.abspath(dest)})
json.dump({'title': 'Hungarian silent slots filled (#259·AL, 24 Nov): 20-clip sample, UNHEARD',
           'intro': 'hun_for_eng practice rows that played silent, now filled in the cast voices (target1 Kinga cartesia_42e4da1d, target2 Bence cartesia_4c5c7be8). UNHEARD: Kai\'s ear is the check.',
           'review': True, 'clips': clips}, open(spec, 'w'), ensure_ascii=False, indent=1)
print(len(clips), 'clips')
