#!/usr/bin/env python3
"""cs #719·AI — READ-ONLY sizing census for C0108 over dump-course.py dumps (no DB access).
Usage: python3 -I census.py <dumpdir> <estate.json> <out.json>
Per course: the seed carrying C0108, its LEGOs, and every row whose ENGLISH side says the old chunk
('didn't hope to', or 'wake' without 'up' next to 'middle of the night'), with its audio slots."""
import json, sys, glob, re, os
dd, est, out = sys.argv[1:4]
E = {c['course_code']: c for c in json.load(open(est))['courses']}
OLD = re.compile(r"\b(didn'?t|did not)\s+hope\b|\bwake\b(?!\s+up)(?=.*\bmiddle of the night\b)|\bhope to wake\b|\bwake in the middle\b", re.I)
res = {}
for f in sorted(glob.glob(os.path.join(dd, '*.json'))):
    d = json.load(open(f)); c = d['course']
    kl, tl = c.split('_for_')[1], c.split('_for_')[0]
    eng_side = 'known' if kl == 'eng' else ('target' if tl == 'eng' else None)
    seeds = {s['n']: s for s in d['seeds']}
    cs = None
    for s in d['seeds']:
        txt = f"{s['known']} {s['target']}"
        if re.search(r"hope to wake|despertarnos en medio|夜中に起きる|半夜醒|hofften nicht, mitten|n'espérions pas nous réveiller|speravamo di svegliarci|no esperábamos desp", txt or '', re.I): cs = s['n']; break
    if cs is None and 108 in seeds: cs = 108
    rows = []
    if eng_side:
        for s in d['seeds']:
            if OLD.search(s[eng_side] or ''): rows.append({'kind': 'seed', 'id': s['n'], 'en': s[eng_side]})
            for l in s['legos']:
                if OLD.search(l[eng_side] or '') or (s['n'] == cs and re.search(r'\bwake\b(?!\s+up)|\bhope\b', l[eng_side] or '', re.I)):
                    rows.append({'kind': 'lego', 'id': l['id'], 'en': l[eng_side]})
                for p in l['phrases']:
                    if OLD.search(p[eng_side] or '') or (s['n'] == cs and re.search(r'\bwake\b(?!\s+up)|\bhope\b', p[eng_side] or '', re.I)):
                        rows.append({'kind': 'phrase', 'id': p['id'], 'en': p[eng_side], 'ka': p['ka'], 't1': p['t1'], 't2': p['t2']})
    s = seeds.get(cs) or {}
    res[c] = {'c0108_seed': cs, 'eng_side': eng_side, 'seed_known': s.get('known'), 'seed_target': s.get('target'),
              'legos': [{'id': l['id'], 'type': l['type'], 'new': l['is_new'], 'known': l['known'], 'target': l['target'], 'n_phr': len(l['phrases']),
                         'n_phr_audio': sum(1 for p in l['phrases'] if p['t1'] or p['ka'])} for l in s.get('legos', [])],
              'eng_rows': rows, 'status': E.get(c, {}).get('build_status'), 'released': E.get(c, {}).get('released'),
              'voice_mode': E.get(c, {}).get('audio', {}).get('voice_mode'), 'clips': E.get(c, {}).get('audio', {}).get('clips'),
              'voices': [v['voice_id'] for v in E.get(c, {}).get('voices_of_record', [])[:4]]}
json.dump(res, open(out, 'w'), ensure_ascii=False, indent=1)
for c, r in res.items():
    print(c, r['c0108_seed'], r['eng_side'], 'eng_rows', len(r['eng_rows']), 'legos', len(r['legos']), 'phr', sum(l['n_phr'] for l in r['legos']))
