"""cs #271·AL: listening-page spec for clip-page.cjs — ~10 of the newly rendered hun_for_eng clips (target1 Kinga, target2 Bence),
downloaded through Popty's GET /api/production/:course/audio/:uuid/url. usage: python3 -I listen_spec.py <out_dir> <spec.json>"""
import json, os, sys, urllib.request
H = os.path.dirname(os.path.abspath(__file__)); out_dir, spec = sys.argv[1], sys.argv[2]; os.makedirs(out_dir, exist_ok=True)
R = [json.loads(l) for l in open(f'{H}/results/apply.jsonl')]
R = [r for r in R if (r.get('link') or {}).get('ok') and r['render'].get('source') == 'rendered']
pick = [r for r in R if r['role'] == 'target1'][::4][:6] + [r for r in R if r['role'] == 'target2'][::3][:5]
clips = []
for r in pick:
    a = r['render']['audioId']
    req = urllib.request.Request(f"http://localhost:3470/api/production/hun_for_eng/audio/{a}/url", headers={'x-agent-id': 'kai-271'})
    url = json.load(urllib.request.urlopen(req, timeout=60)).get('url'); dest = os.path.join(out_dir, f"{a}.mp3")
    urllib.request.urlretrieve(url, dest)
    v = 'Kinga' if r['role'] == 'target1' else 'Bence'
    clips.append({'label': f"{r['row']} · {r['role']} {v} · {r['text']} · {a[:8]}", 'file': os.path.abspath(dest)})
json.dump({'title': 'Hungarian last 44 silent slots filled (#271·AL, 24 Nov): 11-clip sample, UNHEARD',
           'intro': 'hun_for_eng target slots that played silent, now rendered in the cast voices (target1 Kinga, target2 Bence) on Kai\'s Y. UNHEARD: Kai\'s ear is the check.',
           'review': True, 'clips': clips}, open(spec, 'w'), ensure_ascii=False, indent=1)
print(len(clips), 'clips')
