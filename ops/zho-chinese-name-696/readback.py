# cs #696·AI — live readback (GET /api/production/<course>/seeds): every planned row now has the new known text AND
# serves the clip we linked; every edited LEGO serves its new intro; counts the 中文 rows left and why.
import json, sys, os
out = {}
for c in ['spa', 'fra', 'deu', 'ita']:
    C = f'{c}_for_zho'; S = json.load(open(os.path.join(sys.argv[1], f'{c}3.json')))['seeds']
    rows = {}
    for s in S:
        rows[str(s['seed_number'])] = s
        for l in s['legos']:
            rows[l['lego_id']] = l
            for p in l['basket_phrases']: rows[p['id']] = p
    ops = json.load(open(f'{C}.apply.ops.json')); ok = bad = 0; badl = []
    for o in ops:
        key = str(o.get('seed_number') or o.get('lego_id') or o.get('phrase_id')); r = rows[key]
        if o['op'] == 'audio.link': good = r.get('presentation_audio_id') == o['audio_id']
        else: good = r['known_text'] == o['set']['known_text'] and r['known_audio_id'] == o['set']['known_audio_id']
        ok += good; bad += not good
        if not good: badl.append(key)
    left = [k for k, r in rows.items() if '中文' in (r.get('known_text') or '')]
    out[C] = {'ops_ok': ok, 'ops_bad': bad, 'bad': badl, 'zhongwen_rows_left': left}
    print(C, 'ok', ok, 'bad', bad, badl[:5], '| 中文 rows left', len(left), left)
json.dump(out, open('readback.json', 'w'), ensure_ascii=False, indent=1)
