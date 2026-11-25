"""cs #868 item 8: listening page spec for one course's gender re-records (ledger item8/ledger-<course>.jsonl), 15 clips
spread across the ledger, via Popty GET /api/production/:course/audio/:uuid/url. usage: listen8.py <course> <out_dir> <spec.json>"""
import json, os, sys, urllib.request
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); course, out_dir, spec = sys.argv[1:4]; os.makedirs(out_dir, exist_ok=True)
R = [json.loads(l) for l in open(f'{H}/item8/ledger-{course}.jsonl')]; R = [r for r in R if r.get('ok') and r.get('audioId')]
pick = R[::max(1, len(R) // 15)][:15]; clips = []
for r in pick:
    req = urllib.request.Request(f"http://localhost:3470/api/production/{course}/audio/{r['audioId']}/url", headers={'x-agent-id': 'kai-868'})
    url = json.load(urllib.request.urlopen(req, timeout=60)).get('url'); dest = os.path.join(out_dir, f"{course}-{r['audioId']}.mp3")
    urllib.request.urlretrieve(url, dest)
    clips.append({'label': f"{course} · {r['kind']} · was: {r['text'][:70]} → now: {r.get('spoken') or r['speak']} · {r['audioId'][:8]}", 'file': os.path.abspath(dest)})
chars = sum(r.get('charsSpent') or 0 for r in R)
B = any(r.get('kind') == '8B' for r in R)
INTRO = (f'{len(R)} new takes in the course\'s MALE cast voice, linked in place of female-voice clips that read a male form ({chars:,} chars). No ear sample was taken before applying. Language-free check: a male voice, no cut-offs, no glitches. UNHEARD.' if B else
         f'{len(R)} clips where a female voice read a male form, re-recorded with the female form ({chars:,} chars). No ear sample was taken before applying. Check: a female voice, saying the female form, no cut-offs. UNHEARD.')
json.dump({'title': f'Item 8 gender re-records, {course} (cs #868, 24 Nov): sample, UNHEARD', 'intro': INTRO,
           'clips': clips}, open(spec, 'w'), ensure_ascii=False, indent=1)
print(len(clips), 'clips')
