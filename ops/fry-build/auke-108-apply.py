# cs job #108 (16 Nov 2026): applies ONE family of Kai's 16 Nov rulings on Auke's held fry_for_eng fixes.
# Everything goes through Popty: live rows are read from GET /api/production/fry_for_eng/seeds, the write is
# POST /api/production/fry_for_eng/edit-batch (dry run first; --apply commits). No database access.
#
#   python3 ops/fry-build/auke-108-apply.py <texts.json> <family> [--apply]
#
# texts.json = {"family":..., "rows":[{"key","old":[known,target],"new":[known,target]|"DELETE", "components"?}]}
# Row keys: "SEED<n>", "LEGO:<lego_id>", else the phrase id suffix (S0078L01B02). Same shape as auke-held-97-*.
# The builder refuses a row whose live text is not "old"; every op also carries "expect" so the engine refuses drift.
# On --apply it writes ops/fry-build/auke-108-<family>-undo.json (event id + undo ops + takes unlinked) and re-reads
# live to prove every row now carries its new text.
import json, sys, os, urllib.request

BASE = 'http://localhost:3470/api/production/fry_for_eng'
HDR = {'Content-Type': 'application/json', 'x-agent-id': 'fable-108-kai-fry-auke', 'x-agent-role': 'content-fix'}
HERE = os.path.dirname(os.path.abspath(__file__))


def live():
    d = json.load(urllib.request.urlopen(BASE + '/seeds'))
    rows = {}
    for s in d['seeds']:
        rows[f"SEED{s['seed_number']}"] = dict(kind='seed', ref=s['seed_number'], k=s['known_text'], t=s['target_text'],
                                               ta=s['target1_audio_id'], ka=s['known_audio_id'], pa=None)
        for l in s['legos']:
            rows['LEGO:' + l['lego_id']] = dict(kind='lego', ref=l['lego_id'], k=l['known_text'], t=l['target_text'],
                                                ta=l['target1_audio_id'], ka=l['known_audio_id'],
                                                pa=l['presentation_audio_id'], comps=l['components'])
            for p in l['basket_phrases']:
                rows[p['id'].split(':')[-1]] = dict(kind='phrase', ref=p['id'], k=p['known_text'], t=p['target_text'],
                                                    ta=p.get('target1_audio_id'), ka=p.get('known_audio_id'),
                                                    pa=p.get('presentation_audio_id'), role=p.get('phrase_role'))
    return rows


def build(texts, L):
    ops, takes = [], []
    for r in texts['rows']:
        k, old, new = r['key'], r['old'], r['new']
        lv = L.get(k)
        if not lv: sys.exit(f'{k}: no live row')
        if [lv['k'], lv['t']] != old: sys.exit(f"{k}: live is {[lv['k'], lv['t']]!r}, texts expect {old!r}")
        if lv['kind'] == 'seed': op = {'op': 'seed.update', 'seed_number': lv['ref']}
        elif lv['kind'] == 'lego': op = {'op': 'lego.update', 'lego_id': lv['ref']}
        else: op = {'op': 'phrase.delete' if new == 'DELETE' else 'phrase.update', 'phrase_id': lv['ref']}
        if new == 'DELETE' and lv['kind'] != 'phrase': sys.exit(f'{k}: only phrases are deleted here')
        op['expect'] = {'known_text': old[0], 'target_text': old[1]}
        if new != 'DELETE':
            if new == old and 'components' not in r: sys.exit(f'{k}: no change')
            op['set'] = {}
            if new[0] != old[0]: op['set']['known_text'] = new[0]
            if new[1] != old[1]: op['set']['target_text'] = new[1]
            if 'components' in r: op['set']['components'] = r['components']
        if lv['ta'] and (new == 'DELETE' or new[1] != old[1]): takes.append(k)
        ops.append(op)
    return ops, takes


def post(ops, apply):
    body = {'ops': ops}
    if apply: body['apply'] = True
    req = urllib.request.Request(BASE + '/edit-batch', data=json.dumps(body).encode(), headers=HDR, method='POST')
    try:
        return json.load(urllib.request.urlopen(req, timeout=120))
    except urllib.error.HTTPError as e:
        sys.exit(f'REFUSED {e.code}: {e.read().decode()[:2000]}')


if __name__ == '__main__':
    texts = json.load(open(sys.argv[1])); fam = sys.argv[2]; apply = '--apply' in sys.argv
    L = live()
    ops, takes = build(texts, L)
    out = post(ops, apply)
    res = out.get('results', [])
    print(f"{fam}: {len(ops)} ops, applied={out.get('applied')}, event={out.get('event_id')}, changed={sum(1 for r in res if r.get('changed'))}, "
          f"deletes={sum(1 for o in ops if o['op'] == 'phrase.delete')}, takes with changed/deleted Frisian={len(takes)}: {' '.join(takes)}")
    if not apply: sys.exit(0)
    json.dump({'family': fam, 'event_id': out.get('event_id'), 'undo_file_on_popty': out.get('undo_file'),
               'how_to_undo': 'POST /api/production/fry_for_eng/edit-batch {"ops": <undo_ops>, "apply": true}',
               'takes_unlinked_or_dropped': takes, 'undo_ops': out.get('undo_ops')},
              open(f'{HERE}/auke-108-{fam}-undo.json', 'w'), ensure_ascii=False, indent=1)
    L2 = live(); bad = []
    for r in texts['rows']:
        lv = L2.get(r['key'])
        if r['new'] == 'DELETE':
            if lv: bad.append(r['key'] + ' still there')
        elif not lv or [lv['k'], lv['t']] != r['new']: bad.append(r['key'])
    known_emptied = [r['key'] for r in texts['rows'] if L[r['key']]['ka'] and not (L2.get(r['key']) or {}).get('ka')]
    pres = [(r['key'], L[r['key']]['pa'], (L2.get(r['key']) or {}).get('pa')) for r in texts['rows'] if L[r['key']].get('pa')]
    still = [k for k in takes if (L2.get(k) or {}).get('ta')]
    print(f'verify: {len(texts["rows"]) - len(bad)} of {len(texts["rows"])} rows read back with the new text; mismatches: {bad}')
    print(f'known slots emptied: {known_emptied}; presentation slots before/after: {pres}; takes still linked after a Frisian change: {still}')
