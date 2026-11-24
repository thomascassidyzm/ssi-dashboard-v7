#!/usr/bin/env python3
"""cym_for_kor basket rebuild, OPTION D (cs #251·AL; Kai 24 Nov 17:55Z "go for it, carefully"). OFFLINE: reads the
two Popty snapshots (GET :3470/api/production/<course>/seeds?status=all) and match.cjs output; touches no database.

  python3 ops/cym-for-kor/rebuild-251/assign.py <match.json> <cym_for_kor.json> <cym_nv2_for_eng.json> <out.json>

Per new (played, P25) cym_for_kor LEGO it decides the basket:
  originals  every voiced (t1+t2) original placed by match.cjs, max-flow into floor slots (recost.py option D), the
             rest under its first valid home; then UNVOICED originals only where a floor slot is still short, the
             one-voice ones first. Roles stay the source's (P18, P7). A bare-LEGO original never counts (P3).
  topups     the basket's own door-generated rows (they already carry Korean and passed /seed/complete), only as
             many per role as the floor still lacks. Which ones is a JUDGEMENT made later (korean step) — here
             they are listed as candidates in basket order.
  protected  door rows that are never deleted: the #109/#813 override baskets (s096 L1, s173 L2, s408 L1, s429 L1,
             s448 L1, s533 L2 'ar bob gair', s599 L2), any row with a clip, any row hand-edited by a person, and the
             seed sentence itself when it is a door row (P26). A door row whose Welsh equals an original placed in
             the same basket is kept AS that original (its Korean stays; no insert).
Floor = phraseFloor (services/course-builder/lib/phrase-structure.cjs; canon P30). Pure over its inputs.
"""
import json, sys, re, os
from collections import Counter
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'reuse'))
from recost import maxflow_assign, phrase_floor, norm  # noqa: E402

OVERRIDES = {(96, 1), (173, 2), (408, 1), (429, 1), (448, 1), (533, 2), (599, 2)}


def lid(s, i):
    return f'S{s:04d}L{i:02d}'


def main():
    m = json.load(open(sys.argv[1]))
    kor = json.load(open(sys.argv[2]))['seeds']
    src = json.load(open(sys.argv[3]))['seeds']
    out_path = sys.argv[4]

    # source rows by normalised Welsh: prefer the played (is_new) S1001+ row with both clips
    srows = {}
    for s in src:
        for l in s['legos']:
            for p in l['basket_phrases']:
                if p['phrase_role'] not in ('build', 'use'):
                    continue
                k = norm(p['target_text'])
                rank = (bool(p['target1_audio_id'] and p['target2_audio_id']), bool(l['is_new']), s['seed_number'] >= 1001)
                cur = srows.get(k)
                if not cur or rank > cur[0]:
                    srows[k] = (rank, {'id': p['id'], 'known_en': p['known_text'], 'target': p['target_text'],
                                       'role': p['phrase_role'], 'src_seed': s['seed_number'], 'src_lego': l['lego_id'],
                                       'src_lego_text': l['target_text'], 'src_lego_new': bool(l['is_new']),
                                       't1': p['target1_audio_id'], 't2': p['target2_audio_id']})
    # every v2 row with this text that is PLAYED (under an is_new LEGO) — Kai's rule: those are on v2's route
    played_v2 = set()
    for s in src:
        for l in s['legos']:
            if l['is_new']:
                for p in l['basket_phrases']:
                    if p['phrase_role'] in ('build', 'use'):
                        played_v2.add(norm(p['target_text']))

    klego = {}
    kseed = {s['seed_number']: s for s in kor}
    for s in kor:
        for l in s['legos']:
            klego[(s['seed_number'], int(l['lego_index']))] = l

    new = [l for l in m['legos'] if l['is_new']]
    rows, first = {}, {}
    for i, l in enumerate(new):
        for r in l['reuse']:
            rows[r['k']] = r
            first[r['k']] = i
    homes = {}
    for i, l in enumerate(new):
        lk = norm(l['target'])
        for k in [r['k'] for r in l['reuse']] + list(l.get('alsoHome', [])):
            if k != lk:
                homes.setdefault(k, []).append(i)
    voiced = [k for k, r in rows.items() if r['t12'] and k in homes]
    unvoiced = [k for k, r in rows.items() if not r['t12'] and k in homes]
    floors = [phrase_floor(l['seed'], l['idx'], 'p30') for l in new]

    place = {}
    have = [Counter() for _ in new]
    for role in ('build', 'use'):
        ks = [k for k in voiced if rows[k]['role'] == role]
        a = maxflow_assign(ks, homes, [f[role] for f in floors])
        for k in ks:
            i = a.get(k, first[k] if first[k] in homes[k] else homes[k][0])
            place[k] = i
            have[i][role] += 1
    for tier in (True, False):  # one-voice unvoiced first: they cost one clip, not two
        for role in ('build', 'use'):
            ks = [k for k in unvoiced if rows[k]['role'] == role and bool(rows[k]['any']) == tier]
            a = maxflow_assign(ks, homes, [max(0, floors[i][role] - have[i][role]) for i in range(len(new))])
            for k, i in a.items():
                place[k] = i
                have[i][role] += 1

    legos = []
    for i, l in enumerate(new):
        s, idx = l['seed'], l['idx']
        kl = klego[(s, idx)]
        seed = kseed[s]
        door = [p for p in kl['basket_phrases'] if p['phrase_role'] in ('build', 'use')]
        mine = [k for k, j in place.items() if j == i]
        mine_set = set(mine)
        override = (s, idx) in OVERRIDES
        seed_k = norm(seed['target_text'])
        d_rows = []
        for p in door:
            k = norm(p['target_text'])
            why = []
            if override: why.append('override basket (#109/#813)')
            if p['known_audio_id'] or p['target1_audio_id'] or p['target2_audio_id']: why.append('has a clip')
            if p['hand_edited_at'] or p['hand_edit_held']: why.append('hand-edited')
            if k == seed_k: why.append('seed sentence (P26)')
            if k in mine_set: why.append('same Welsh as a placed original: kept as it')
            d_rows.append({'id': p['id'], 'known': p['known_text'], 'target': p['target_text'], 'role': p['phrase_role'],
                           'k': k, 'protected': why})
        origs = []
        door_k = {d['k'] for d in d_rows}
        for k in mine:
            r = rows[k]
            sr = srows.get(k, (None, {}))[1]
            origs.append({'k': k, 'target': sr.get('target', r['text']), 'role': r['role'], 'known_en': sr.get('known_en'),
                          'src_id': sr.get('id'), 'src_seed': r['srcSeed'], 'src_pool': r['pool'],
                          'src_lego': sr.get('src_lego'), 'src_lego_text': sr.get('src_lego_text'),
                          'voiced': bool(r['t12']), 'one_voice': bool(r['any']) and not r['t12'],
                          't1': sr.get('t1'), 't2': sr.get('t2'), 'on_v2_route': k in played_v2,
                          'moved': not (r['pool'] == 'hc' and r['srcSeed'] == s),
                          'already_door_row': k in door_k})
        fl = floors[i]
        cnt = Counter(o['role'] for o in origs)
        prot = Counter(d['role'] for d in d_rows if d['protected'] and d['k'] not in mine_set)
        short = {r: max(0, fl[r] - cnt[r] - prot[r]) for r in ('build', 'use')}
        legos.append({'lego': lid(s, idx), 'seed': s, 'idx': idx, 'known': kl['known_text'], 'target': kl['target_text'],
                      'seed_known': seed['known_text'], 'seed_target': seed['target_text'], 'floor': fl,
                      'originals': origs, 'door': d_rows, 'short': short})
    tot = Counter()
    for L in legos:
        tot['originals'] += len(L['originals'])
        tot['voiced'] += sum(o['voiced'] for o in L['originals'])
        tot['unvoiced'] += sum(not o['voiced'] for o in L['originals'])
        tot['moved'] += sum(o['moved'] for o in L['originals'])
        tot['not_on_v2_route'] += sum(not o['on_v2_route'] for o in L['originals'])
        tot['door'] += len(L['door'])
        tot['door_protected'] += sum(bool(d['protected']) for d in L['door'])
        tot['topup_slots'] += L['short']['build'] + L['short']['use']
        tot['baskets_short'] += bool(L['short']['build'] or L['short']['use'])
    json.dump({'about': __doc__.strip().split('\n')[0], 'totals': tot, 'legos': legos}, open(out_path, 'w'), ensure_ascii=False)
    print(json.dumps(tot))


if __name__ == '__main__':
    main()
