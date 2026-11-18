#!/usr/bin/env python3
"""zho_for_eng dup-LEGO pass 2 (job #501, Kai 29 Oct 2026). Reads GET /api/production/zho_for_eng/seeds?status=all,
writes an edit-batch for Popty (ops only; never touches the DB).
RULES (Kai 29 Oct): a LEGO is a duplicate only if BOTH known and target text exactly match an EARLIER LEGO; it is flipped
NOT NEW even when its seed then has no new LEGO. Every basket phrase of a flipped LEGO that validly fits another basket
(whole target tiles into LEGOs already taught by that basket's LEGO; English words already met) moves there as a USE row
(insert with the same clips, then delete the old row); the rest stay. 'Inverted' twin pairs: swap flags so the EARLIER one is new.
usage: zho-dup-lego-notnew-pass2.py <seeds.json> <seeds-held.txt> <out-dir>"""
import json, re, sys, collections
seeds_file, held_file, out = sys.argv[1:4]
D = json.load(open(seeds_file))['seeds']
HELD = {int(x) for x in open(held_file).read().split()}
legos = []; phrases = {}
for s in D:
    for l in s['legos']:
        legos.append(l)
        for p in l['basket_phrases']: phrases[p['id']] = (p, l)
legos.sort(key=lambda l: (l['seed_number'], l['lego_index']))
pos = lambda l: (l['seed_number'], l['lego_index'])
PUNCT = re.compile(r"[\s，。？！、；：“”‘’（）,.?!;:\"()…—-]")
ntar = lambda t: PUNCT.sub('', t or '')
exact = lambda t: (t or '').strip()
seedby = {s['seed_number']: s for s in D}

# 1. duplicates among new LEGOs of HELD seeds + inverted pairs
flips, inverted, notdup = [], [], []
for i, l in enumerate(legos):
    if not l['is_new'] or l['seed_number'] not in HELD and l['lego_id'] not in ('S0346L01', 'S0613L02'): continue
    tw = [e for e in legos[:i] if exact(e['known_text']) == exact(l['known_text']) and exact(e['target_text']) == exact(l['target_text'])]
    if not tw: notdup.append(l); continue
    nt = [e for e in tw if e['is_new']]
    (flips if nt else inverted).append((l, nt[0] if nt else tw[0]))
print('flips', len(flips), 'inverted', len(inverted), 'not duplicates', [(l['lego_id'], l['known_text'], l['target_text']) for l in notdup])
for l, t in inverted: print('INVERTED', l['lego_id'], '<-', t['lego_id'], t['is_new'])
json.dump({'flips': [(l['lego_id'], t['lego_id']) for l, t in flips], 'inverted': [(l['lego_id'], t['lego_id']) for l, t in inverted]}, open(out + '/dups.json', 'w'))

# 2. post-flip state
flipset = {l['lego_id'] for l, t in flips} | {l['lego_id'] for l, t in inverted}
unflip = {t['lego_id'] for l, t in inverted}                     # inverted earlier twins become new
is_new = lambda l: (l['is_new'] and l['lego_id'] not in flipset) or l['lego_id'] in unflip
firstpos = {}                                                   # normalized target -> (pos, lego)
for l in legos:
    if is_new(l):
        k = ntar(l['target_text'])
        if k not in firstpos or pos(l) < firstpos[k][0]: firstpos[k] = (pos(l), l)
# sentence-final / structural particles are taught inside the LEGOs that contain them, not as LEGOs of their own: one counts as
# taught from the first NEW LEGO whose target contains it
for ch in '了吗的呢吧':
    cands = [l for l in legos if is_new(l) and ch in l['target_text']]
    if cands and ch not in firstpos: firstpos[ch] = (pos(cands[0]), cands[0])
WORD = re.compile(r"[a-z']+")
engword = lambda t: set(WORD.findall((t or '').lower().replace('’', "'")))
def english_ok(known, home_seed):
    seen = set()
    for s in D:
        if s['seed_number'] > home_seed: break
        seen |= engword(s['known_text'])
        for l in s['legos']:
            if pos(l) <= (home_seed, 99): seen |= engword(l['known_text'])
    return sorted(engword(known) - seen)

def home_for(target, home_cap=None):
    """min-max segmentation: the LEGO whose first-new position is the latest one the phrase needs. None if the Chinese does not tile."""
    t = ntar(target); n = len(t)
    best = [None] * (n + 1); best[0] = ((0, 0), None)
    for i in range(1, n + 1):
        for j in range(max(0, i - 8), i):
            if best[j] is None: continue
            seg = firstpos.get(t[j:i])
            if not seg: continue
            m = max(best[j][0], seg[0])
            if best[i] is None or m < best[i][0]: best[i] = (m, seg[1] if seg[0] >= best[j][0] else best[j][1])
    return best[n] if best[n] and best[n][1] else None

# 3. plan moves
rows_by_lego = collections.defaultdict(list)
for pid, (p, l) in phrases.items(): rows_by_lego[l['lego_id']].append(p)
def nextU(home):
    return 1 + max([int(re.search(r'U(\d+)$', p['id']).group(1)) for p in rows_by_lego[home] if re.search(r'U\d+$', p['id'])] + [0])
added = collections.defaultdict(int)
moves, stays = [], []
twin_of = {l['lego_id']: t for l, t in flips + inverted}
sources = [l for l in legos if l['lego_id'] in flipset] + [l for l in legos if l['lego_id'] in unflip and False]
for src in [l for l in legos if l['lego_id'] in flipset]:
    for p in sorted(src['basket_phrases'], key=lambda p: p['id']):
        if p['phrase_role'] == 'component': continue
        h = home_for(p['target_text'])
        if not h: stays.append((src['lego_id'], p, 'target does not tile into taught LEGOs')); continue
        home = h[1]
        # the LEGO's own twin is the natural home when the phrase is already valid at the twin's position
        tw = twin_of.get(src['lego_id'])
        if tw and ntar(tw['target_text']) in ntar(p['target_text']) and h[0] <= pos(tw): home = tw
        if pos(home) > pos(src): stays.append((src['lego_id'], p, 'needs ' + home['lego_id'] + ', taught after this seed')); continue
        if ntar(home['target_text']) not in ntar(p['target_text']): stays.append((src['lego_id'], p, 'latest-taught part is a particle, no LEGO to hang it on')); continue
        if ntar(p['target_text']) == ntar(home['target_text']): stays.append((src['lego_id'], p, 'would only repeat ' + home['lego_id'] + ' itself')); continue
        if home['lego_id'] == src['lego_id'] : stays.append((src['lego_id'], p, 'only home is itself')); continue
        bad = english_ok(p['known_text'], home['seed_number'])
        if bad: stays.append((src['lego_id'], p, 'English not yet met: ' + ','.join(bad))); continue
        if any(exact(q['known_text']).lower() == exact(p['known_text']).lower() and ntar(q['target_text']) == ntar(p['target_text']) for q in rows_by_lego[home['lego_id']]):
            stays.append((src['lego_id'], p, 'already in ' + home['lego_id'])); continue
        newid = 'zho_for_eng:%sU%02d' % (home['lego_id'], nextU(home['lego_id']))
        moves.append((src, p, home, newid))
        rows_by_lego[home['lego_id']].append({'id': newid, 'phrase_role': 'use', 'known_text': p['known_text'], 'target_text': p['target_text']})
print('moves', len(moves), 'stay', len(stays))
for r in collections.Counter(s[2].split(':')[0] for s in stays).most_common(): print(r)
json.dump({'moves': [(s['lego_id'], p['id'], h['lego_id']) for s, p, h, _ in moves], 'stays': [(a, p['id'], r) for a, p, r in stays]}, open(out + '/plan.json', 'w'), ensure_ascii=False)

# 3b. an earlier twin that BECOMES new must have a basket that is valid where it now plays
for t in sorted(unflip):
    l = next(x for x in legos if x['lego_id'] == t)
    for p in l['basket_phrases']:
        if p['phrase_role'] == 'component': continue
        h = home_for(p['target_text']); late = (not h) or h[0] > pos(l); bad = english_ok(p['known_text'], l['seed_number'])
        print('BASKET-CHECK', t, p['id'].split(':')[1], p['known_text'], '|', p['target_text'], '-> OK' if not late and not bad else '-> NOT VALID at %s (%s)' % (pos(l), 'target' if late else 'English ' + ','.join(bad)))

# 4. the edit-batch
ops = []
for l, t in flips: ops.append({'op': 'lego.update', 'lego_id': l['lego_id'], 'expect': {'is_new': True, 'known_text': l['known_text'], 'target_text': l['target_text']}, 'set': {'is_new': False}})
for l, t in inverted:
    ops.append({'op': 'lego.update', 'lego_id': t['lego_id'], 'expect': {'is_new': False, 'known_text': t['known_text'], 'target_text': t['target_text']}, 'set': {'is_new': True}})
    ops.append({'op': 'lego.update', 'lego_id': l['lego_id'], 'expect': {'is_new': True, 'known_text': l['known_text'], 'target_text': l['target_text']}, 'set': {'is_new': False}})
DROP = ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id', 'last_edit_event_id', 'created_at', 'updated_at', 'version', 'qa_checked', 'target1_duration_ms', 'target2_duration_ms', 'display_tiling', 'display_tiling_version']
touched = {l['seed_number'] for l, t in flips + inverted} | {t['seed_number'] for l, t in inverted}
for src, p, home, newid in moves:
    row = {k: v for k, v in p.items() if k not in DROP}
    hrows = rows_by_lego[home['lego_id']]
    row.update(id=newid, lego_id=home['lego_id'], lego_index=home['lego_index'], seed_number=home['seed_number'], phrase_role='use',
               position=max([q.get('position') or 0 for q in home['basket_phrases']] + [0]) + 1 + sum(1 for o in ops if o['op'] == 'phrase.insert' and o['row']['lego_id'] == home['lego_id']),
               metadata={**(p.get('metadata') or {}), 'moved_from': p['id'].split(':')[1], 'moved_by': 'job #501 (Kai 29 Oct: duplicate LEGO set not-new, phrase re-homed)'})
    ops.append({'op': 'phrase.insert', 'row': row})
    for slot in ('known', 'target1', 'target2'):
        if p.get(slot + '_audio_id'): ops.append({'op': 'audio.link', 'target': 'phrase', 'phrase_id': newid, 'slot': slot, 'audio_id': p[slot + '_audio_id'], 'allow_text_mismatch': True})
    ops.append({'op': 'phrase.delete', 'phrase_id': p['id'], 'expect': {'known_text': p['known_text'], 'target_text': p['target_text']}})
    touched.add(home['seed_number'])
for sn in sorted(touched):
    if seedby[sn]['approved_at']: ops.append({'op': 'seed.update', 'seed_number': sn, 'set': {'approved_at': None}})
json.dump({'ops': ops}, open(out + '/batchB.json', 'w'), ensure_ascii=False)
print('ops', len(ops), 'seeds touched', len(touched))
