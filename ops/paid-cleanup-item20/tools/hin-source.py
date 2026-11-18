#!/usr/bin/env python3
"""Item 20 resume (cs #740·AI): for every todo basket in <course>/worklist.json, list eng_for_hin's REAL builds for the
same LEGO id (same English LEGO target) whose English is not already in the sister basket. Reads local JSON only:
the #717 QA-copy snapshot of eng_for_hin and the 13:2xZ live script-view dump of the sister. No DB access.
usage: hin-source.py <course>  -> ../<course>/hin-source.json + summary"""
import json, os, re, sys, collections
c = sys.argv[1]; H = os.path.dirname(os.path.abspath(__file__)); cdir = os.path.join(H, '..', c)
EV = os.path.expanduser('~/ssi-evidence/ssi-dashboard-v7/ops')
hin = json.load(open(f'{EV}/paid-cleanup-717/snap/eng_for_hin.json'))
live = json.load(open(f'{EV}/paid-cleanup-item20/live/{c}.json'))
wl = json.load(open(os.path.join(cdir, 'worklist.json')))
norm = lambda s: re.sub(r'[\s\.\?\!,;:।؟۔"\']+', ' ', (s or '').lower()).strip()
hl = {l['lego_id']: l for l in hin['legos']}
hp = collections.defaultdict(list)
for p in hin['phrases']:
    if p['phrase_role'] in ('build', 'use') and p.get('lego_id') is None:
        m = re.search(r':(S\d{4}L\d{2})', p['id']); p['lego_id'] = m.group(1) if m else None
    hp[p.get('lego_id') or re.search(r':(S\d{4}L\d{2})', p['id']).group(1)].append(p)
sis = {l['lego_id']: l for s in live['seeds'] for l in s['legos']}
course_pairs_en = set()
for s in live['seeds']:
    for l in s['legos']:
        for p in l['basket_phrases']: course_pairs_en.add(norm(p['target_text']))
out = []; st = collections.Counter()
for e in wl['todo']:
    lid = e['lego']; h = hl.get(lid); sl = sis[lid]
    if not h: st['no hin lego'] += 1; out.append({**e, 'src': [], 'why': 'no hin LEGO'}); continue
    if norm(h['target_text']) != norm(sl['target_text']): st['lego english differs'] += 1; out.append({**e, 'src': [], 'why': f"hin LEGO is '{h['target_text']}'"}); continue
    have = {norm(p['target_text']) for p in sl['basket_phrases']}
    src = []
    for p in sorted(hp[lid], key=lambda p: p['position']):
        if p['phrase_role'] != 'build': continue
        t = norm(p['target_text'])
        if t == norm(h['target_text']) or t in have or t in {norm(x['en']) for x in src}: continue
        src.append({'hin_id': p['id'].split(':')[1], 'hi': p['known_text'], 'en': p['target_text'], 'elsewhere_in_course': t in course_pairs_en})
    k = 'covers need' if len(src) >= e['need'] else ('partial' if src else 'none')
    st[k] += 1; out.append({**e, 'src': src})
json.dump({'course': c, 'hin_snapshot': hin['at'], 'baskets': out}, open(os.path.join(cdir, 'hin-source.json'), 'w'), ensure_ascii=False, indent=0)
print(c, dict(st), 'rows available', sum(min(len(b['src']), b['need']) for b in out), 'of need', sum(b['need'] for b in out))
