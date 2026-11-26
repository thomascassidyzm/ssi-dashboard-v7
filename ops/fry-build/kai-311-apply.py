# cs #311 (25 Nov 2026): apply kai-311-texts.json to fry_for_eng in ONE Popty edit-batch.
# A copy of auke-274-apply.py (which copies auke-108-apply.py) with this job's identity, a live pre-check of each
# row's LEGO and seed, and the presentation re-link the LEGO text edit needs (its English intro words are unchanged,
# but the trigger nulls presentation_audio_id on any LEGO text edit). No database access.
#   python3 ops/fry-build/kai-311-apply.py ops/fry-build/kai-311-texts.json [--apply]
import json, sys, os, re, urllib.request

BASE = 'http://localhost:3470/api/production/fry_for_eng'
HDR = {'Content-Type': 'application/json', 'x-agent-id': 'kai-311-fry-followups', 'x-agent-role': 'content-fix'}
HERE = os.path.dirname(os.path.abspath(__file__))
norm = lambda s: re.sub(r'[^\w\s\']', '', s.lower()).strip()


def live():
    d = json.load(urllib.request.urlopen(BASE + '/seeds'))
    rows = {}
    for s in d['seeds']:
        sk = f"SEED{s['seed_number']}"
        rows[sk] = dict(kind='seed', ref=s['seed_number'], k=s['known_text'], t=s['target_text'],
                        ta=s['target1_audio_id'], ka=s['known_audio_id'], pa=None, lego=None, seed=sk)
        for l in s['legos']:
            lk = 'LEGO:' + l['lego_id']
            rows[lk] = dict(kind='lego', ref=l['lego_id'], k=l['known_text'], t=l['target_text'],
                            ta=l['target1_audio_id'], ka=l['known_audio_id'], pa=l['presentation_audio_id'],
                            comps=l['components'], lego=lk, seed=sk)
            for p in l['basket_phrases']:
                rows[p['id'].split(':')[-1]] = dict(kind='phrase', ref=p['id'], k=p['known_text'], t=p['target_text'],
                                                    ta=p.get('target1_audio_id'), ka=p.get('known_audio_id'),
                                                    pa=p.get('presentation_audio_id'), lego=lk, seed=sk)
    return rows


def build(texts, L):
    ops, takes, relink = [], [], []
    new_t = {r['key']: r['new'][1] for r in texts['rows']}
    for r in texts['rows']:
        k, old, new = r['key'], r['old'], r['new']
        lv = L.get(k)
        if not lv: sys.exit(f'{k}: no live row')
        if [lv['k'], lv['t']] != old: sys.exit(f"HOLD {k}: live is {[lv['k'], lv['t']]!r}, texts expect {old!r}")
        # Live pre-check (Kai 19 Nov): the row's LEGO and seed as they will stand after this batch.
        lego_t = new_t.get(lv['lego'], L[lv['lego']]['t']) if lv['lego'] else None
        seed_t = new_t.get(lv['seed'], L[lv['seed']]['t'])
        if lv['kind'] == 'phrase' and not k[-3] == 'C' and norm(lego_t) not in norm(new[1]):
            if k != 'S0114L03U06':  # the seed sentence as a USE row: its LEGO is "as juster", checked below
                sys.exit(f'HOLD {k}: new text does not contain its LEGO {lego_t!r}')
        if k == 'S0114L03U06' and norm(lego_t) not in norm(new[1]): sys.exit(f'HOLD {k}: lacks {lego_t!r}')
        if k in ('SEED56', 'S0056L02U04') and 'sadat ik it ûnthâlde kin' not in new[1].lower(): sys.exit(f'HOLD {k}')
        print(f'  pre-check {k}: LEGO {lv["lego"]} = {lego_t!r} | seed = {seed_t!r}')
        if lv['kind'] == 'seed': op = {'op': 'seed.update', 'seed_number': lv['ref']}
        elif lv['kind'] == 'lego': op = {'op': 'lego.update', 'lego_id': lv['ref']}
        else: op = {'op': 'phrase.update', 'phrase_id': lv['ref']}
        op['expect'] = {'known_text': old[0], 'target_text': old[1]}
        op['set'] = {}
        if new[0] != old[0]: op['set']['known_text'] = new[0]
        if new[1] != old[1]: op['set']['target_text'] = new[1]
        if 'components' in r: op['set']['components'] = r['components']
        if lv['ta'] and new[1] != old[1]: takes.append(k)
        ops.append(op)
        if lv['kind'] == 'lego' and lv['pa'] and new[0] == old[0]:
            relink.append({'op': 'audio.link', 'target': 'lego', 'lego_id': lv['ref'], 'slot': 'presentation',
                           'audio_id': lv['pa']})
    return ops + relink, takes


def post(ops, apply):
    body = {'ops': ops}
    if apply: body['apply'] = True
    req = urllib.request.Request(BASE + '/edit-batch', data=json.dumps(body).encode(), headers=HDR, method='POST')
    try:
        return json.load(urllib.request.urlopen(req, timeout=900))
    except urllib.error.HTTPError as e:
        sys.exit(f'REFUSED {e.code}: {e.read().decode()[:3000]}')


if __name__ == '__main__':
    texts = json.load(open(sys.argv[1])); apply = '--apply' in sys.argv
    L = live()
    ops, takes = build(texts, L)
    out = post(ops, apply)
    res = out.get('results', [])
    print(f"{len(ops)} ops, applied={out.get('applied')}, event={out.get('event_id')}, "
          f"changed={sum(1 for r in res if r.get('changed'))}, takes unlinked by the Frisian change={len(takes)}: {' '.join(takes)}")
    if not apply:
        json.dump(out, open(os.environ.get('CS_SCRATCH', '/tmp') + '/kai-311-dryrun.json', 'w'), ensure_ascii=False, indent=1)
        sys.exit(0)
    json.dump({'event_id': out.get('event_id'), 'undo_file_on_popty': out.get('undo_file'),
               'how_to_undo': 'POST /api/production/fry_for_eng/edit-batch {"ops": <undo_ops>, "apply": true}',
               'takes_unlinked': takes,
               'before_audio': {r['key']: {x: L[r['key']].get(x) for x in ('ka', 'ta', 'pa')} for r in texts['rows']},
               'undo_ops': out.get('undo_ops')},
              open(f'{HERE}/kai-311-undo.json', 'w'), ensure_ascii=False, indent=1)
    L2 = live(); bad = []
    for r in texts['rows']:
        lv = L2.get(r['key'])
        if not lv or [lv['k'], lv['t']] != r['new']: bad.append(r['key'])
    known_emptied = [r['key'] for r in texts['rows'] if L[r['key']]['ka'] and L2[r['key']]['ka'] != L[r['key']]['ka']]
    pres = [(r['key'], L[r['key']]['pa'], L2[r['key']]['pa']) for r in texts['rows'] if L[r['key']].get('pa')]
    still = [k for k in takes if L2[k]['ta']]
    rb = {r['key']: {'known': L2[r['key']]['k'], 'target': L2[r['key']]['t'], 'known_audio_id': L2[r['key']]['ka'],
                     'target1_audio_id': L2[r['key']]['ta'], 'presentation_audio_id': L2[r['key']]['pa']} for r in texts['rows']}
    json.dump(rb, open(f'{HERE}/kai-311-readback.json', 'w'), ensure_ascii=False, indent=1)
    print(f'verify: {len(texts["rows"]) - len(bad)} of {len(texts["rows"])} rows read back with the new text; mismatches: {bad}')
    print(f'known slots changed: {known_emptied}; presentation before/after: {pres}; takes still linked: {still}')
