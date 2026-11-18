# cs #696·AI — make-before-break apply batch: each text op carries its NEW known clip in the same UPDATE (the DB trigger
# respects a writer-set link, so the slot moves straight from the old clip to the new one, never via NULL), and each
# edited LEGO is followed by audio.link presentation -> its new intro (the trigger nulls an intro whose LEGO text moved).
# A row whose new clip did not come back (refused/failed) is NOT edited: it stays on its old text + clip and is listed.
# Usage: python3 build_apply.py <course>  -> <course>.apply.ops.json, <course>.noclip.json
import json, sys
C = sys.argv[1]
ops = json.load(open(f'{C}.ops.json'))
audio = json.load(open(f'{C}.audio-real.json')) + json.load(open(f'{C}.audio-real-intro.json'))
clip = {}; intro = {}
for a in audio:
    cid = a.get('audioId') or a.get('existing')
    if a['role'] == 'known' and cid: clip[str(a['key'])] = cid
    if a['role'] == 'presentation' and (a.get('audioId') or a['key'] not in intro): intro[a['key']] = a
out, noclip = [], []
for o in ops:
    key = str(o.get('seed_number') or o.get('lego_id') or o.get('phrase_id'))
    if key not in clip: noclip.append({'key': key, 'why': 'no new known clip'}); continue
    o = json.loads(json.dumps(o)); o['set']['known_audio_id'] = clip[key]; out.append(o)
    if o['op'] == 'lego.update':
        a = intro.get(key)
        if a and a.get('audioId'):
            out.append({'op': 'audio.link', 'target': 'lego', 'lego_id': key, 'slot': 'presentation', 'audio_id': a['audioId']})
        else:
            noclip.append({'key': key, 'why': f"intro not re-voiced ({(a or {}).get('error')}); LEGO edit applied, intro slot left as the trigger leaves it"})
json.dump(out, open(f'{C}.apply.ops.json', 'w'), ensure_ascii=False, indent=1)
json.dump(noclip, open(f'{C}.noclip.json', 'w'), ensure_ascii=False, indent=1)
print(C, 'apply ops', len(out), 'noclip', len(noclip), noclip[:5])
