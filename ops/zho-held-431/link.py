# cs #431·AI — audio-real.json -> link.ops.json: one audio.link per changed slot (presentation slots are bound by the
# render route itself when it names the LEGO). audio.link refuses a clip whose words differ from the row's, so a wrong
# link cannot land. Old clips are not deleted.
import json
out = json.load(open('audio-real.json')); ops = []; missing = []
for o in out:
    if o['role'] == 'presentation': continue
    if not o['audioId']: missing.append(o); continue
    k = o['kind']; op = {'op': 'audio.link', 'target': k, 'slot': o['role'], 'audio_id': o['audioId']}
    if k == 'seed': op['seed_number'] = o['key']
    elif k == 'lego': op['lego_id'] = o['key']
    else: op['phrase_id'] = 'zho_for_eng:' + o['key']
    ops.append(op)
json.dump({'ops': ops}, open('link.ops.json', 'w'), ensure_ascii=False, indent=1)
print(len(ops), 'links;', len(missing), 'slots with no clip:', [(m['key'], m['role'], m['error']) for m in missing][:20])
