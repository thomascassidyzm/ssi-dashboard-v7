#!/usr/bin/env python3
"""cs #375: apply the Welsh "na ddylen i / na ddylwn i" timing fix to the two v2 sandboxes.

Talks ONLY to Popty's edit door (POST :3470/api/production/<course>/edit-batch). Never the DB.
  python3 apply.py <course> precheck   live pre-check of every source row and LEGO (dry runs only)
  python3 apply.py <course> dry        dry run of the whole batch
  python3 apply.py <course> apply      pre-check, then apply; response (with undo) saved in undo/

A move = phrase.delete of the old row + phrase.insert of the same row (same texts, same three
clip ids, same role) under the new basket, in ONE transaction. Expectations come from the
25 Nov 03:30Z QA copy; any live difference holds that row (it is left out, never forced).
"""
import json, sys, os, urllib.request, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
HDR = {'Content-Type': 'application/json', 'x-agent-id': 'kai-375'}
REASON = 'cs #375 Welsh na ddylen/na ddylwn timing fix (Kai YES 25 Nov 14:24Z, v2 only)'

NV = 'cym_nv2_for_eng'
SV = 'cym_sv2_for_eng'
PLAN = {
    NV: {
        'delete': 'S0115L02B01 S0115L02B02 S0116L02B01 S0116L02B02 S0116L02B03 S0117L01B01 S0117L01B04 '
                  'S0117L03B01 S0117L04B01 S0118L01B01 S0120L01B06 S0120L01B07 S0126L01B05 '
                  'S0137L01U02 S0137L01U03 S0137L01U05'.split(),
        # old id -> (seed, lego_index, new id, position)
        'move': {'S0115L02U02': (1349, 1, 'S1349L01U08', 15), 'S0137L01U01': (1349, 1, 'S1349L01U09', 16)},
        'new_lego_checks': ['S1349L01'],
    },
    SV: {
        'delete': [],
        'move': {
            'S0114L01B01': (117, 3, 'S0117L03B01', 1), 'S0114L01B02': (117, 3, 'S0117L03B02', 2),
            'S0115L01B03': (117, 3, 'S0117L03B03', 3), 'S0115L01B04': (117, 3, 'S0117L03B04', 4),
            'S0115L01B05': (117, 3, 'S0117L03B05', 5), 'S0116L01B01': (117, 3, 'S0117L03B06', 6),
            'S0116L01B04': (117, 3, 'S0117L03B07', 7), 'S0117L01B02': (117, 3, 'S0117L03B08', 8),
            'S0114L01U03': (117, 3, 'S0117L03U01', 9),
        },
        'new_lego_checks': ['S0117L01', 'S0117L02'],
        'lego_insert': {'seed_number': 117, 'lego_index': 3, 'type': 'M', 'is_new': True,
                        'known_text': 'that I shouldn’t', 'target_text': 'na ddylen i',
                        'components': [{'known': 'that … not', 'target': 'na'}, {'known': 'I should', 'target': 'ddylen i'}]},
    },
}


def post(course, body):
    req = urllib.request.Request(f'http://localhost:3470/api/production/{course}/edit-batch',
                                 data=json.dumps(body).encode(), headers=HDR, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {'ok': False, 'http': e.code, 'body': e.read().decode()[:2000]}


def expected(course):
    qa = json.load(open(os.path.join(os.environ['CS_SCRATCH'], f'{course}.json')))
    return {p['id'].split(':')[1]: p for p in qa['phrases']}


def precheck(course):
    plan, exp = PLAN[course], expected(course)
    ids = plan['delete'] + list(plan['move'])
    ops = [{'op': 'phrase.delete', 'phrase_id': f'{course}:{i}'} for i in ids]
    # is_new probe: a dry-run set of is_new:true reports changed:false when the LEGO already is new
    lego_ids = sorted({i[:8] for i in ids} | set(plan['new_lego_checks']))
    ops += [{'op': 'lego.update', 'lego_id': l, 'set': {'is_new': True}} for l in lego_ids]
    r = post(course, {'ops': ops, 'reason': REASON + ' (pre-check)'})
    if not r.get('ok'):
        sys.exit(f'precheck refused: {json.dumps(r)[:1500]}')
    held, rows = [], {}
    undo_rows = {u['row']['id'].split(':')[1]: u['row'] for u in r['undo_ops'] if u['op'] == 'phrase.insert'}
    for res in r['results']:
        if res['op'] == 'phrase.delete':
            i = res['key']['id'].split(':')[1]
            b, e = res['before'], exp.get(i)
            diffs = [k for k in ('seed_number', 'lego_index', 'known_text', 'target_text', 'known_audio_id',
                                 'target1_audio_id', 'target2_audio_id') if not e or b.get(k) != e.get(k)]
            if diffs:
                held.append((i, diffs))
            else:
                rows[i] = undo_rows[i]
        else:
            l = res['key'].get('lego_id')
            if res['changed']:
                held.append((l, ['LEGO not is_new']))
    return held, rows


def build(course, rows):
    plan = PLAN[course]
    ops = []
    if plan.get('lego_insert'):
        ops.append({'op': 'lego.insert', 'row': plan['lego_insert']})
    for i in plan['delete']:
        if i in rows:
            ops.append({'op': 'phrase.delete', 'phrase_id': f'{course}:{i}'})
    for i, (seed, idx, new_id, pos) in plan['move'].items():
        if i not in rows:
            continue
        row = dict(rows[i])
        row.update({'id': f'{course}:{new_id}', 'seed_number': seed, 'lego_index': idx,
                    'lego_id': new_id[:8], 'position': pos})
        md = dict(row.get('metadata') or {})
        md['moved_from'] = {'id': f'{course}:{i}', 'by': 'cs #375', 'at': datetime.date.today().isoformat()}
        row['metadata'] = md
        for k in ('created_at', 'hand_order', 'hand_edited_by', 'hand_edited_at'):
            row.pop(k, None)
        ops.append({'op': 'phrase.delete', 'phrase_id': f'{course}:{i}'})
        ops.append({'op': 'phrase.insert', 'row': row})
    return ops


def main():
    course, mode = sys.argv[1], sys.argv[2]
    held, rows = precheck(course)
    print('HELD:', held)
    if mode == 'precheck':
        print('rows ok:', len(rows)); return
    ops = build(course, rows)
    body = {'ops': ops, 'reason': REASON}
    if mode == 'apply':
        body['apply'] = True
    r = post(course, body)
    stamp = datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    out = os.path.join(HERE, 'undo', f'{course}-{mode}-{stamp}.json')
    json.dump({'request': body, 'response': r, 'held': held}, open(out, 'w'), ensure_ascii=False, indent=1)
    print(mode, 'ok' if r.get('ok') else 'REFUSED', 'applied' if r.get('applied') else 'not applied',
          'ops', len(ops), 'event', r.get('event_id'), 'undo_file', r.get('undo_file'), '->', out)
    if not r.get('ok'):
        print(json.dumps(r)[:3000])


if __name__ == '__main__':
    main()
