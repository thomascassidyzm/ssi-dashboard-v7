# cs #696·AI — after-state of a dry run/apply: every edited row's known slot holds the clip we set, every edited LEGO has an intro.
import json, sys
C, F = sys.argv[1], sys.argv[2]
ops = json.load(open(f'{C}.apply.ops.json')); res = json.load(open(F))['results']
bad = []
for o, r in zip(ops, res):
    a = r.get('after') or {}
    if o['op'] == 'audio.link':
        if a.get('presentation_audio_id') != o['audio_id']: bad.append((o['lego_id'], 'intro', a.get('presentation_audio_id')))
    elif a.get('known_audio_id') != o['set']['known_audio_id'] or '中文' in (a.get('known_text') or ''):
        bad.append((o.get('phrase_id') or o.get('lego_id') or o.get('seed_number'), a.get('known_audio_id'), a.get('known_text')))
print(C, F, 'ops', len(ops), 'bad', len(bad), bad[:5])
