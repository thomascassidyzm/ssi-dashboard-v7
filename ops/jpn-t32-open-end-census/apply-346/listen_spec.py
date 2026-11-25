"""cs #346·AL: listening-page spec for clip-page.cjs: every English (known) clip this job rendered for jpn_for_eng seeds 1-450,
downloaded through Popty's GET /api/production/jpn_for_eng/audio/:uuid/url. usage: python3 -I listen_spec.py <out_dir> <spec.json>"""
import json, os, sys, urllib.request
H = os.path.dirname(os.path.abspath(__file__)); out_dir, spec = sys.argv[1], sys.argv[2]; os.makedirs(out_dir, exist_ok=True)
R = [json.loads(l) for l in open(f'{H}/audio.jsonl')]
R = sorted([r for r in R if (r.get('link') or {}).get('ok')], key=lambda r: r['id'])
clips = []
for r in R:
    a = r['audioId']
    req = urllib.request.Request(f"http://localhost:3470/api/production/jpn_for_eng/audio/{a}/url", headers={'x-agent-id': 'kai-346-jpn-open-end'})
    url = json.load(urllib.request.urlopen(req, timeout=60)).get('url'); dest = os.path.join(out_dir, f"{a}.mp3")
    urllib.request.urlretrieve(url, dest)
    clips.append({'label': f"{r['id'].split(':')[1]} · {r['japanese']} · \"{r['text']}\" · {a[:8]}", 'file': os.path.abspath(dest)})
json.dump({'title': 'jpn_for_eng open-end fix, seeds 1-450: new English cues (#346·AL, 25 Nov), UNHEARD',
           'intro': 'Every English (known-side) clip re-voiced after the census fix: rows reworded to say what the Japanese says, or given the open "because…" end of から. S0434L03U05 is the と話してた row, now "he was saying…". English only; the Japanese is unchanged. UNHEARD: Kai\'s ear is the check.',
           'review': True, 'clips': clips}, open(spec, 'w'), ensure_ascii=False, indent=1)
print(len(clips), 'clips')
